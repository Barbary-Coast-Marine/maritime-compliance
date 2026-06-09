import { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import { vessels, logbookEntries, complianceRules, users, type Database } from "@maritime/db";
import { loadRules } from "@maritime/regulations";
import {
  evaluateCompliance,
  getOverallStatus,
  getComplianceSummary,
  buildLastCompleted,
} from "../rule-engine.js";
import { authPreHandler } from "../middleware/auth.js";
import type { VesselComplianceState } from "../rule-engine.js";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_DIR = path.resolve(__dirname, "../../../../packages/regulations/rules");

// Cache rules at module load — YAML disk reads are expensive per-request
const { rules: CACHED_RULES, errors: RULE_LOAD_ERRORS } = loadRules(RULES_DIR);

/**
 * Build vessel compliance state from DB data
 */
async function buildVesselState(db: Database): Promise<{ vessel: any; state: VesselComplianceState } | null> {
  const [vessel] = await db.select().from(vessels).limit(1);
  if (!vessel) return null;

  const recentEntries = await db
    .select()
    .from(logbookEntries)
    .orderBy(desc(logbookEntries.timestamp))
    .limit(100);

  const last_completed = buildLastCompleted(recentEntries);

  return {
    vessel,
    state: {
      last_completed,
      vessel_type: vessel.vesselType,
      flag_state: vessel.flagState,
      gross_tonnage: Number(vessel.grossTonnage) || 0,
      coi_expiry: vessel.coiExpiry ? new Date(vessel.coiExpiry) : undefined,
    },
  };
}

export async function complianceRoutes(app: FastifyInstance) {
  const db = (app as any).db as Database;

  /**
   * GET /api/compliance/status
   * Returns overall compliance status + per-rule evaluations
   */
  app.get("/compliance/status", async (_request, reply) => {
    try {
      const rules = CACHED_RULES;
      if (RULE_LOAD_ERRORS.length > 0) {
        app.log.warn({ errors: RULE_LOAD_ERRORS }, "Rule loading errors");
      }

      // Build vessel state from DB
      const result = await buildVesselState(db);
      if (!result) {
        return reply.status(404).send({ error: "No vessel configured" });
      }

      const { vessel, state } = result;

      // Apply DB overrides: filter inactive rules and apply threshold overrides
      const dbRules = await db.select().from(complianceRules);
      const dbRuleMap = new Map(dbRules.map((r) => [r.ruleCode, r]));
      const activeRules = rules
        .filter((r) => {
          const dbRule = dbRuleMap.get(r.rule_id);
          return !(dbRule && !dbRule.isActive);
        })
        .map((r) => {
          const dbRule = dbRuleMap.get(r.rule_id);
          if (!dbRule?.severityLevels) return r;
          const levels = dbRule.severityLevels as { warning_days?: number; critical_days?: number };
          return {
            ...r,
            trigger: {
              ...r.trigger,
              ...(levels.warning_days != null && { warning_days: levels.warning_days }),
              ...(levels.critical_days != null && { critical_days: levels.critical_days }),
            },
          };
        });

      // Run the rule engine
      const evaluations = evaluateCompliance(activeRules, state);
      const overallStatus = getOverallStatus(evaluations);
      const summary = getComplianceSummary(evaluations);

      return {
        vessel_id: vessel.id,
        status: overallStatus,
        summary,
        evaluations,
        evaluated_at: new Date().toISOString(),
      };
    } catch (err) {
      app.log.error(err, "Failed to evaluate compliance");
      return reply.status(500).send({ error: "Failed to evaluate compliance" });
    }
  });

  /**
   * GET /api/compliance/rules
   * Returns all loaded rules for this vessel
   */
  app.get("/compliance/rules", async (_request, reply) => {
    try {
      return {
        rules: CACHED_RULES,
        errors: RULE_LOAD_ERRORS.length > 0 ? RULE_LOAD_ERRORS : undefined,
        count: CACHED_RULES.length,
      };
    } catch (err) {
      return reply.status(500).send({ error: "Failed to load rules" });
    }
  });

  /**
   * POST /api/compliance/log-completion
   * Log that a compliance item was completed (drill, inspection, etc.)
   */
  app.post<{
    Body: { rule_id: string; completed_by?: string; notes?: string };
  }>("/compliance/log-completion", { preHandler: authPreHandler }, async (request, reply) => {
    const { rule_id, notes } = request.body;

    try {
      // Resolve author from JWT
      const jwtUser = request.user!;
      let author = jwtUser.username;
      const [dbUser] = await db.select({ displayName: users.displayName })
        .from(users).where(eq(users.id, jwtUser.id)).limit(1);
      if (dbUser?.displayName) author = dbUser.displayName;

      // Get vessel
      const [vessel] = await db.select({ id: vessels.id }).from(vessels).limit(1);
      if (!vessel) {
        return reply.status(400).send({ error: "No vessel configured" });
      }

      // Find the rule to determine entry type
      const rules = CACHED_RULES;
      const rule = rules.find((r) => r.rule_id === rule_id);

      const entryType = rule?.category === "drills"
        ? "drill"
        : rule?.category === "maintenance"
          ? "maintenance"
          : "inspection";

      // Insert logbook entry
      const [entry] = await db
        .insert(logbookEntries)
        .values({
          vesselId: vessel.id,
          entryType: entryType as any,
          title: rule?.title ?? rule_id,
          body: notes ?? `Compliance item ${rule_id} completed.`,
          author,
        })
        .returning();

      return {
        success: true,
        rule_id,
        completed_by: author,
        entry_id: entry.id,
        completed_at: entry.timestamp.toISOString(),
      };
    } catch (err) {
      app.log.error(err, "Failed to log completion");
      return reply.status(500).send({ error: "Failed to log completion" });
    }
  });

  /**
   * GET /api/compliance/upcoming
   * Returns the next N items due, sorted by urgency
   */
  app.get<{
    Querystring: { limit?: number };
  }>("/compliance/upcoming", async (request, reply) => {
    const limit = request.query.limit ?? 10;

    try {
      const rules = CACHED_RULES;
      const result = await buildVesselState(db);
      if (!result) {
        return reply.status(404).send({ error: "No vessel configured" });
      }

      const evaluations = evaluateCompliance(rules, result.state);

      // Filter to items with a due date, sort by days_remaining
      const upcoming = evaluations
        .filter((e) => e.next_due != null)
        .sort((a, b) => (a.days_remaining ?? Infinity) - (b.days_remaining ?? Infinity))
        .slice(0, Number(limit));

      return { upcoming, count: upcoming.length };
    } catch (err) {
      return reply.status(500).send({ error: "Failed to get upcoming items" });
    }
  });
}
