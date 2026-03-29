/**
 * Rule Engine — Evaluates compliance rules against vessel state
 * 
 * Takes: loaded YAML rules + vessel's last-completed dates
 * Returns: compliance status per rule (pass/warning/violation)
 */

export type Verdict = 'pass' | 'warning' | 'violation' | 'info' | 'not_applicable';

export interface RuleEvaluation {
  rule_id: string;
  title: string;
  citation: string;
  category: string;
  verdict: Verdict;
  last_completed: Date | null;
  next_due: Date | null;
  days_remaining: number | null;
  required_action: string;
  frequency_text: string;
}

export interface VesselComplianceState {
  /** Map of metric name -> last completed date */
  last_completed: Record<string, Date>;
  /** Vessel profile */
  vessel_type: string;
  flag_state: string;
  gross_tonnage: number;
  /** COI expiry for certificate rules */
  coi_expiry?: Date;
}

export interface ComplianceRule {
  rule_id: string;
  status: string;
  citation: string;
  title: string;
  subchapter: string;
  category: string;
  applies_to: {
    vessel_types: string[];
    flag_states: string[];
    gross_tonnage_min?: number | null;
    gross_tonnage_max?: number | null;
  };
  trigger: {
    type: 'calendar' | 'threshold' | 'event';
    interval_days?: number | null;
    warning_days?: number | null;
    critical_days?: number | null;
    metric?: string | null;
    frequency_text: string;
  };
  required_action: string;
}

/**
 * Check if a rule applies to this vessel
 */
function ruleApplies(rule: ComplianceRule, state: VesselComplianceState): boolean {
  if (!rule.applies_to.vessel_types.includes(state.vessel_type)) return false;
  if (!rule.applies_to.flag_states.includes(state.flag_state)) return false;
  
  const min = rule.applies_to.gross_tonnage_min;
  const max = rule.applies_to.gross_tonnage_max;
  if (min != null && state.gross_tonnage < min) return false;
  if (max != null && state.gross_tonnage > max) return false;
  
  return true;
}

/**
 * Evaluate a calendar-based rule
 */
function evaluateCalendarRule(
  rule: ComplianceRule,
  state: VesselComplianceState,
  now: Date
): RuleEvaluation {
  const metric = rule.trigger.metric;
  const intervalDays = rule.trigger.interval_days;
  const warningDays = rule.trigger.warning_days ?? 7;
  const criticalDays = rule.trigger.critical_days ?? 0;

  // Special case: COI expiry uses coi_expiry date directly
  if (metric === 'days_until_coi_expiry' && state.coi_expiry) {
    const msRemaining = state.coi_expiry.getTime() - now.getTime();
    const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));

    let verdict: Verdict = 'pass';
    if (daysRemaining <= criticalDays) verdict = 'violation';
    else if (daysRemaining <= warningDays) verdict = 'warning';

    return {
      rule_id: rule.rule_id,
      title: rule.title,
      citation: rule.citation,
      category: rule.category,
      verdict,
      last_completed: null,
      next_due: state.coi_expiry,
      days_remaining: daysRemaining,
      required_action: rule.required_action,
      frequency_text: rule.trigger.frequency_text,
    };
  }

  const lastCompleted = metric ? state.last_completed[metric] : null;

  if (!lastCompleted || !intervalDays) {
    // Never completed — violation if it should have been done
    return {
      rule_id: rule.rule_id,
      title: rule.title,
      citation: rule.citation,
      category: rule.category,
      verdict: lastCompleted === undefined && intervalDays ? 'violation' : 'info',
      last_completed: lastCompleted || null,
      next_due: null,
      days_remaining: null,
      required_action: rule.required_action,
      frequency_text: rule.trigger.frequency_text,
    };
  }

  const nextDue = new Date(lastCompleted.getTime() + intervalDays * 24 * 60 * 60 * 1000);
  const msRemaining = nextDue.getTime() - now.getTime();
  const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));

  let verdict: Verdict = 'pass';
  if (daysRemaining < -criticalDays) verdict = 'violation'; // past due
  else if (daysRemaining <= criticalDays) verdict = 'violation';
  else if (daysRemaining <= warningDays) verdict = 'warning';

  return {
    rule_id: rule.rule_id,
    title: rule.title,
    citation: rule.citation,
    category: rule.category,
    verdict,
    last_completed: lastCompleted,
    next_due: nextDue,
    days_remaining: daysRemaining,
    required_action: rule.required_action,
    frequency_text: rule.trigger.frequency_text,
  };
}

/**
 * Evaluate an event-based rule (pre-departure checks)
 * These return 'info' status — they're checked interactively, not on a timer
 */
function evaluateEventRule(rule: ComplianceRule): RuleEvaluation {
  return {
    rule_id: rule.rule_id,
    title: rule.title,
    citation: rule.citation,
    category: rule.category,
    verdict: 'info',
    last_completed: null,
    next_due: null,
    days_remaining: null,
    required_action: rule.required_action,
    frequency_text: rule.trigger.frequency_text,
  };
}

/**
 * Evaluate all applicable rules for a vessel
 */
export function evaluateCompliance(
  rules: ComplianceRule[],
  state: VesselComplianceState,
  now: Date = new Date()
): RuleEvaluation[] {
  const results: RuleEvaluation[] = [];

  for (const rule of rules) {
    // Skip non-active rules
    if (rule.status !== 'verified' && rule.status !== 'draft') continue;

    // Check if rule applies to this vessel
    if (!ruleApplies(rule, state)) continue;

    switch (rule.trigger.type) {
      case 'calendar':
        results.push(evaluateCalendarRule(rule, state, now));
        break;
      case 'event':
        results.push(evaluateEventRule(rule));
        break;
      case 'threshold':
        // Phase 2 — sensor-based thresholds
        break;
    }
  }

  // Sort: violations first, then warnings, then pass
  const order: Record<Verdict, number> = { violation: 0, warning: 1, info: 2, pass: 3, not_applicable: 4 };
  results.sort((a, b) => order[a.verdict] - order[b.verdict]);

  return results;
}

/**
 * Get overall vessel compliance status from evaluations
 */
export function getOverallStatus(evaluations: RuleEvaluation[]): Verdict {
  if (evaluations.some(e => e.verdict === 'violation')) return 'violation';
  if (evaluations.some(e => e.verdict === 'warning')) return 'warning';
  return 'pass';
}

/**
 * Get summary counts
 */
export function getComplianceSummary(evaluations: RuleEvaluation[]) {
  return {
    total: evaluations.length,
    passing: evaluations.filter(e => e.verdict === 'pass').length,
    warnings: evaluations.filter(e => e.verdict === 'warning').length,
    violations: evaluations.filter(e => e.verdict === 'violation').length,
    info: evaluations.filter(e => e.verdict === 'info').length,
  };
}
