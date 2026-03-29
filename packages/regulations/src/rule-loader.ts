import { z } from 'zod';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

// Zod schema matching RULE_SCHEMA.md
export const ComplianceRuleSchema = z.object({
  rule_id: z.string(),
  status: z.enum(['draft', 'verified', 'deprecated']),
  verified_by: z.string().nullable(),
  verified_date: z.string().nullable(),
  legal_review: z.boolean(),

  citation: z.string(),
  title: z.string(),
  subchapter: z.string(),
  category: z.enum(['drills', 'inspections', 'certificates', 'pre_departure', 'maintenance']),

  applies_to: z.object({
    vessel_types: z.array(z.string()),
    flag_states: z.array(z.string()),
    gross_tonnage_min: z.number().nullable().optional(),
    gross_tonnage_max: z.number().nullable().optional(),
  }),

  trigger: z.object({
    type: z.enum(['calendar', 'threshold', 'event']),
    interval_days: z.number().nullable().optional(),
    warning_days: z.number().nullable().optional(),
    critical_days: z.number().nullable().optional(),
    metric: z.string().nullable().optional(),
    operator: z.enum(['lt', 'gt', 'eq', 'lte', 'gte']).nullable().optional(),
    value: z.number().nullable().optional(),
    frequency_text: z.string(),
  }),

  required_action: z.string(),
  deadline_calc: z.string(),
  fine_range_usd: z.tuple([z.number(), z.number()]).nullable().optional(),
  uscg_reference_url: z.string(),
  notes: z.string().nullable().optional(),
});

export type ComplianceRule = z.infer<typeof ComplianceRuleSchema>;

export interface RuleFilter {
  vessel_type?: string;
  subchapter?: string;
  status?: 'draft' | 'verified' | 'deprecated';
  category?: string;
  gross_tonnage?: number;
}

/**
 * Recursively find all .yaml files in a directory
 */
function findYamlFiles(dir: string): string[] {
  const files: string[] = [];
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...findYamlFiles(fullPath));
    } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
      files.push(fullPath);
    }
  }
  return files;
}

/**
 * Load all YAML rule files from the rules directory.
 * Validates each against the zod schema.
 * Returns valid rules + any validation errors.
 */
export function loadRules(rulesDir: string): {
  rules: ComplianceRule[];
  errors: { file: string; error: string }[];
} {
  const yamlFiles = findYamlFiles(rulesDir);
  const rules: ComplianceRule[] = [];
  const errors: { file: string; error: string }[] = [];

  for (const file of yamlFiles) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const parsed = yaml.parse(content);
      const result = ComplianceRuleSchema.safeParse(parsed);

      if (result.success) {
        rules.push(result.data);
      } else {
        errors.push({
          file,
          error: result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
        });
      }
    } catch (err) {
      errors.push({
        file,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { rules, errors };
}

/**
 * Load rules and filter by vessel type, subchapter, status, etc.
 */
export function loadFilteredRules(rulesDir: string, filter: RuleFilter): ComplianceRule[] {
  const { rules } = loadRules(rulesDir);

  return rules.filter(rule => {
    if (filter.status && rule.status !== filter.status) return false;
    if (filter.subchapter && rule.subchapter !== filter.subchapter) return false;
    if (filter.category && rule.category !== filter.category) return false;
    if (filter.vessel_type && !rule.applies_to.vessel_types.includes(filter.vessel_type)) return false;
    if (filter.gross_tonnage != null) {
      const min = rule.applies_to.gross_tonnage_min;
      const max = rule.applies_to.gross_tonnage_max;
      if (min != null && filter.gross_tonnage < min) return false;
      if (max != null && filter.gross_tonnage > max) return false;
    }
    return true;
  });
}
