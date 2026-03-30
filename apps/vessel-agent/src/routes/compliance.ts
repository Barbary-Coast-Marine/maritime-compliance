import { FastifyInstance } from "fastify";
import { desc, eq } from "drizzle-orm";
import { vessels, logbookEntries, complianceRules, users, type Database } from "@maritime/db";
import { loadRules } from "@maritime/regulations";
import {
  evaluateCompliance,
  getOverallStatus,
  getComplianceSummary,
} from "../rule-engine.js";
import { authPreHandler } from "../middleware/auth.js";
import type { VesselComplianceState } from "../rule-engine.js";
import * as path from "path";
import { fileURLToPath } from "url";

// Resolve the rules directory relative to the monorepo root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_DIR = path.resolve(__dirname, "../../../../packages/regulations/rules");

/**
 * Build vessel compliance state from DB data
 */
async function buildVesselState(db: Database): Promise<{ vessel: any; state: VesselComplianceState } | null> {
  const [vessel] = await db.select().from(vessels).limit(1);
  if (!vessel) return null;

  // Get the most recent logbook entry per type to determine last_completed dates
  // We map entry types to rule metrics
  const metricMap: Record<string, string[]> = {
    drill: ["days_since_fire_drill", "days_since_abandon_ship_drill"],
    inspection: [
      "days_since_lifesaving_weekly_inspection",
      "days_since_lifesaving_monthly_inspection",
      "days_since_fire_extinguisher_annual_inspection",
      "days_since_liferaft_annual_servicing",
      "days_since_boiler_inspection",
    ],
    maintenance: ["days_since_steering_gear_test", "days_since_emergency_lighting_test"],
  };

  const last_completed: Record<string, Date> = {};

  // Query recent entries and map to metrics based on title keywords
  const recentEntries = await db
    .select()
    .from(logbookEntries)
    .orderBy(desc(logbookEntries.timestamp))
    .limit(100);

  for (const entry of recentEntries) {
    const titleLower = entry.title.toLowerCase();

    // Map logbook entry titles to compliance metrics
    const mappings: [string, string[]][] = [
      ["days_since_fire_drill", ["fire drill"]],
      ["days_since_abandon_ship_drill", ["abandon ship"]],
      ["days_since_lifesaving_weekly_inspection", ["lifesaving", "weekly"]],
      ["days_since_lifesaving_monthly_inspection", ["lifesaving", "monthly"]],
      ["days_since_fire_extinguisher_annual_inspection", ["fire extinguisher"]],
      ["days_since_liferaft_annual_servicing", ["liferaft"]],
      ["days_since_steering_gear_test", ["steering gear"]],
      ["days_since_emergency_lighting_test", ["emergency lighting"]],
      ["days_since_boiler_inspection", ["boiler"]],
    ];

    for (const [metric, keywords] of mappings) {
      if (keywords.every((kw) => titleLower.includes(kw))) {
        // Only keep the most recent (first seen, since ordered desc)
        if (!last_completed[metric]) {
          last_completed[metric] = entry.timestamp;
        }
      }
    }
  }

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
      // Load rules from YAML
      const { rules, errors } = loadRules(RULES_DIR);
      if (errors.length > 0) {
        app.log.warn({ errors }, "Rule loading errors");
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
      const { rules, errors } = loadRules(RULES_DIR);
      return {
        rules,
        errors: errors.length > 0 ? errors : undefined,
        count: rules.length,
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
      const { rules } = loadRules(RULES_DIR);
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
      const { rules } = loadRules(RULES_DIR);
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
