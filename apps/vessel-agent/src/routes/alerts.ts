import { FastifyInstance } from "fastify";
import { vessels, complianceRules, crewProfiles, crewCredentials, complianceEvents, type Database } from "@maritime/db";
import { authPreHandler } from "../middleware/auth.js";
import { loadRules } from "@maritime/regulations";
import { evaluateCompliance, buildLastCompleted } from "../rule-engine.js";
import type { VesselComplianceState } from "../rule-engine.js";
import { desc, eq, gt, and } from "drizzle-orm";
import { logbookEntries } from "@maritime/db";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_DIR = path.resolve(__dirname, "../../../../packages/regulations/rules");
const { rules: CACHED_RULES } = loadRules(RULES_DIR);

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
      const rules = CACHED_RULES;

      const [vessel] = await db.select().from(vessels).limit(1);
      if (!vessel) {
        return { alerts: [], count: 0 };
      }

      const recentEntries = await db
        .select()
        .from(logbookEntries)
        .orderBy(desc(logbookEntries.timestamp))
        .limit(100);

      const last_completed = buildLastCompleted(recentEntries);

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

      const evaluations = evaluateCompliance(activeRules, state);

      // Load acknowledged rule IDs (acknowledged within last 8 hours)
      const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000);
      const acknowledgedEvents = await db
        .select({ ruleCode: complianceEvents.ruleCode })
        .from(complianceEvents)
        .where(
          and(
            eq(complianceEvents.vesselId, vessel.id),
            gt(complianceEvents.acknowledgedAt, eightHoursAgo)
          )
        );
      const acknowledgedRules = new Set(acknowledgedEvents.map((e) => e.ruleCode));

      // Generate short plain-English description based on alert context
      function shortDescription(verdict: string, daysRemaining: number | null, nextDue: Date | string | null): string {
        if (verdict === "violation") {
          const overdueDays = daysRemaining != null ? Math.abs(daysRemaining) : 0;
          return `${overdueDays} days overdue. Schedule immediately.`;
        }
        if (verdict === "warning" && nextDue) {
          const dueDateStr = new Date(nextDue).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          const days = daysRemaining != null ? daysRemaining : 0;
          return `Due in ${days} days. Schedule before ${dueDateStr}.`;
        }
        return "Action required.";
      }

      // Alerts = warnings + violations (excluding recently acknowledged)
      const alerts: Array<{
        rule_id: string;
        title: string;
        citation: string;
        severity: string;
        days_remaining: number | null;
        next_due: Date | string | null;
        last_completed: Date | string | null;
        description: string;
        detail: string;
      }> = evaluations
        .filter((e) => (e.verdict === "warning" || e.verdict === "violation") && !acknowledgedRules.has(e.rule_id))
        .map((e) => ({
          rule_id: e.rule_id,
          title: e.title,
          citation: e.citation,
          severity: e.verdict,
          days_remaining: e.days_remaining,
          next_due: e.next_due,
          last_completed: e.last_completed,
          description: shortDescription(e.verdict, e.days_remaining, e.next_due),
          detail: e.required_action,
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
          const expiryStr = new Date(cred.expiryDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          alerts.push({
            rule_id: `CREW-CRED-${cred.id}`,
            title: `Expired Credential: ${crewName} \u2014 ${cred.title}`,
            citation: "",
            severity: "violation",
            days_remaining: daysRemaining,
            next_due: cred.expiryDate,
            last_completed: null,
            description: `Expired ${expiryStr}. Renew immediately.`,
            detail: `Renew ${cred.title} for ${crewName}`,
          });
        } else if (daysRemaining <= 30) {
          const expiryStr = new Date(cred.expiryDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          alerts.push({
            rule_id: `CREW-CRED-${cred.id}`,
            title: `Expiring Credential: ${crewName} \u2014 ${cred.title} (${daysRemaining} days)`,
            citation: "",
            severity: "warning",
            days_remaining: daysRemaining,
            next_due: cred.expiryDate,
            last_completed: null,
            description: `Expires ${expiryStr}. Renew soon.`,
            detail: `Renew ${cred.title} for ${crewName} within ${daysRemaining} days`,
          });
        } else if (daysRemaining <= 90) {
          const expiryStr = new Date(cred.expiryDate!).toLocaleDateString("en-US", { month: "short", day: "numeric" });
          alerts.push({
            rule_id: `CREW-CRED-${cred.id}`,
            title: `Expiring Credential: ${crewName} \u2014 ${cred.title} (${daysRemaining} days)`,
            citation: "",
            severity: "warning",
            days_remaining: daysRemaining,
            next_due: cred.expiryDate,
            last_completed: null,
            description: `Expires ${expiryStr}. Renew before expiry.`,
            detail: `Renew ${cred.title} for ${crewName} before expiry`,
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
   * Acknowledge an alert — suppresses it for 8 hours
   */
  app.post<{
    Params: { id: string };
    Body: { acknowledged_by: string };
  }>("/alerts/:id/acknowledge", { preHandler: authPreHandler }, async (request, reply) => {
    const { id } = request.params;
    const { acknowledged_by } = request.body;

    try {
      const [vessel] = await db.select({ id: vessels.id }).from(vessels).limit(1);
      if (!vessel) return reply.status(400).send({ error: "No vessel configured" });

      const now = new Date();
      await db.insert(complianceEvents).values({
        vesselId: vessel.id,
        ruleCode: id,
        verdict: "info",
        description: `Acknowledged by ${acknowledged_by}`,
        acknowledgedAt: now,
      });

      return { success: true, alert_id: id, acknowledged_by, acknowledged_at: now.toISOString() };
    } catch (err) {
      app.log.error(err, "Failed to acknowledge alert");
      return reply.status(500).send({ error: "Failed to acknowledge alert" });
    }
  });

  /**
   * POST /api/alerts/:id/resolve
   * Mark an alert as resolved — suppresses it for 8 hours
   */
  app.post<{
    Params: { id: string };
    Body: { resolved_by: string; action_taken: string };
  }>("/alerts/:id/resolve", { preHandler: authPreHandler }, async (request, reply) => {
    const { id } = request.params;
    const { resolved_by, action_taken } = request.body;

    try {
      const [vessel] = await db.select({ id: vessels.id }).from(vessels).limit(1);
      if (!vessel) return reply.status(400).send({ error: "No vessel configured" });

      const now = new Date();
      await db.insert(complianceEvents).values({
        vesselId: vessel.id,
        ruleCode: id,
        verdict: "info",
        description: `Resolved by ${resolved_by}: ${action_taken}`,
        acknowledgedAt: now,
        resolvedAt: now,
      });

      return { success: true, alert_id: id, resolved_by, resolved_at: now.toISOString() };
    } catch (err) {
      app.log.error(err, "Failed to resolve alert");
      return reply.status(500).send({ error: "Failed to resolve alert" });
    }
  });
}
