import { FastifyInstance } from "fastify";
import { vessels, complianceRules, crewProfiles, crewCredentials, type Database } from "@maritime/db";
import { loadRules } from "@maritime/regulations";
import { evaluateCompliance } from "../rule-engine.js";
import type { VesselComplianceState } from "../rule-engine.js";
import { desc, eq } from "drizzle-orm";
import { logbookEntries } from "@maritime/db";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_DIR = path.resolve(__dirname, "../../../../packages/regulations/rules");

export async function alertRoutes(app: FastifyInstance) {
  const db = (app as any).db as Database;

  /**
   * GET /api/alerts
   * List active alerts (derived from compliance evaluations)
   */
  app.get<{
    Querystring: { status?: "active" | "resolved" | "all"; limit?: number };
  }>("/alerts", async (_request, reply) => {
    try {
      // Load rules and evaluate
      const { rules } = loadRules(RULES_DIR);

      const [vessel] = await db.select().from(vessels).limit(1);
      if (!vessel) {
        return { alerts: [], count: 0 };
      }

      // Build last_completed from logbook (same logic as compliance route)
      const recentEntries = await db
        .select()
        .from(logbookEntries)
        .orderBy(desc(logbookEntries.timestamp))
        .limit(100);

      const last_completed: Record<string, Date> = {};
      const mappings: [string, string[]][] = [
        ["days_since_fire_drill", ["fire drill"]],
        ["days_since_abandon_ship_drill", ["abandon ship"]],
        ["days_since_lifesaving_weekly_inspection", ["lifesaving", "weekly"]],
        ["days_since_lifesaving_monthly_inspection", ["lifesaving", "monthly"]],
        ["days_since_steering_gear_test", ["steering gear"]],
        ["days_since_boiler_inspection", ["boiler"]],
      ];

      for (const entry of recentEntries) {
        const titleLower = entry.title.toLowerCase();
        for (const [metric, keywords] of mappings) {
          if (keywords.every((kw) => titleLower.includes(kw))) {
            if (!last_completed[metric]) {
              last_completed[metric] = entry.timestamp;
            }
          }
        }
      }

      const state: VesselComplianceState = {
        last_completed,
        vessel_type: vessel.vesselType,
        flag_state: vessel.flagState,
        gross_tonnage: Number(vessel.grossTonnage) || 0,
        coi_expiry: vessel.coiExpiry ? new Date(vessel.coiExpiry) : undefined,
      };

      // Apply DB overrides: filter inactive rules and apply threshold overrides
      const dbRules = await db.select().from(complianceRules);
      const dbRuleMap = new Map(dbRules.map((r) => [r.ruleCode, r]));
      const activeRules = rules.filter((r) => {
        const dbRule = dbRuleMap.get(r.rule_id);
        if (dbRule && !dbRule.isActive) return false;
        if (dbRule?.severityLevels) {
          const levels = dbRule.severityLevels as { warning_days?: number; critical_days?: number };
          if (levels.warning_days != null) r.trigger.warning_days = levels.warning_days;
          if (levels.critical_days != null) r.trigger.critical_days = levels.critical_days;
        }
        return true;
      });

      const evaluations = evaluateCompliance(activeRules, state);

      // Alerts = warnings + violations
      const alerts: Array<{
        rule_id: string;
        title: string;
        citation: string;
        severity: string;
        days_remaining: number | null;
        next_due: Date | string | null;
        last_completed: Date | string | null;
        required_action: string;
      }> = evaluations
        .filter((e) => e.verdict === "warning" || e.verdict === "violation")
        .map((e) => ({
          rule_id: e.rule_id,
          title: e.title,
          citation: e.citation,
          severity: e.verdict,
          days_remaining: e.days_remaining,
          next_due: e.next_due,
          last_completed: e.last_completed,
          required_action: e.required_action,
        }));

      // Crew credential expiry alerts
      const now = new Date();
      const credentials = await db
        .select({
          credential: crewCredentials,
          firstName: crewProfiles.firstName,
          lastName: crewProfiles.lastName,
        })
        .from(crewCredentials)
        .innerJoin(crewProfiles, eq(crewCredentials.crewProfileId, crewProfiles.id));

      for (const row of credentials) {
        const cred = row.credential;
        if (!cred.expiryDate) continue;
        const expiry = new Date(cred.expiryDate);
        const msRemaining = expiry.getTime() - now.getTime();
        const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
        const crewName = `${row.firstName} ${row.lastName}`;

        if (daysRemaining < 0) {
          alerts.push({
            rule_id: `CREW-CRED-${cred.id}`,
            title: `Expired Credential: ${crewName} \u2014 ${cred.title}`,
            citation: "",
            severity: "violation",
            days_remaining: daysRemaining,
            next_due: cred.expiryDate,
            last_completed: null,
            required_action: `Renew ${cred.title} for ${crewName}`,
          });
        } else if (daysRemaining <= 30) {
          alerts.push({
            rule_id: `CREW-CRED-${cred.id}`,
            title: `Expiring Credential: ${crewName} \u2014 ${cred.title} (${daysRemaining} days)`,
            citation: "",
            severity: "violation",
            days_remaining: daysRemaining,
            next_due: cred.expiryDate,
            last_completed: null,
            required_action: `Renew ${cred.title} for ${crewName} within ${daysRemaining} days`,
          });
        } else if (daysRemaining <= 90) {
          alerts.push({
            rule_id: `CREW-CRED-${cred.id}`,
            title: `Expiring Credential: ${crewName} \u2014 ${cred.title} (${daysRemaining} days)`,
            citation: "",
            severity: "warning",
            days_remaining: daysRemaining,
            next_due: cred.expiryDate,
            last_completed: null,
            required_action: `Renew ${cred.title} for ${crewName} before expiry`,
          });
        }
      }

      return { alerts, count: alerts.length };
    } catch (err) {
      app.log.error(err, "Failed to get alerts");
      return reply.status(500).send({ error: "Failed to get alerts" });
    }
  });

  /**
   * POST /api/alerts/:id/acknowledge
   * Acknowledge an alert (placeholder)
   */
  app.post<{
    Params: { id: string };
    Body: { acknowledged_by: string };
  }>("/alerts/:id/acknowledge", async (request, _reply) => {
    const { id } = request.params;
    const { acknowledged_by } = request.body;
    return {
      success: true,
      alert_id: id,
      acknowledged_by,
      acknowledged_at: new Date().toISOString(),
    };
  });

  /**
   * POST /api/alerts/:id/resolve
   * Mark an alert as resolved (placeholder)
   */
  app.post<{
    Params: { id: string };
    Body: { resolved_by: string; action_taken: string };
  }>("/alerts/:id/resolve", async (request, _reply) => {
    const { id } = request.params;
    const { resolved_by } = request.body;
    return {
      success: true,
      alert_id: id,
      resolved_by,
      resolved_at: new Date().toISOString(),
    };
  });
}
