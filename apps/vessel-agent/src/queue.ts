import PgBoss from "pg-boss";
import { desc, eq } from "drizzle-orm";
import { createDb, vessels, logbookEntries, complianceEvents, complianceRules } from "@maritime/db";
import { loadRules } from "@maritime/regulations";
import {
  evaluateCompliance,
  getOverallStatus,
} from "./rule-engine.js";
import type { VesselComplianceState } from "./rule-engine.js";
import * as path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_DIR = path.resolve(__dirname, "../../../packages/regulations/rules");

let bossInstance: PgBoss | null = null;

export async function setupJobQueue(connectionString?: string): Promise<PgBoss> {
  const connStr = connectionString ?? process.env.DATABASE_URL ?? "postgresql://maritime:maritime@localhost:5432/maritime";
  const boss = new PgBoss(connStr);

  boss.on("error", (error) => {
    console.error("pg-boss error:", error);
  });

  await boss.start();
  bossInstance = boss;

  const db = createDb(connStr);

  // ─── compliance-check handler ────────────────────────────
  await boss.work("compliance-check", async ([job]) => {
    console.log("Running compliance check:", job.data);

    try {
      // 1. Load all YAML rules
      const { rules, errors } = loadRules(RULES_DIR);
      if (errors.length > 0) {
        console.warn("Rule loading errors:", errors);
      }

      // 2. Query vessel state from DB
      const [vessel] = await db.select().from(vessels).limit(1);
      if (!vessel) {
        console.warn("compliance-check: No vessel configured, skipping");
        return;
      }

      // Build last_completed map from logbook entries
      const recentEntries = await db
        .select()
        .from(logbookEntries)
        .orderBy(desc(logbookEntries.timestamp))
        .limit(100);

      const lastCompleted: Record<string, Date> = {};
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

      for (const entry of recentEntries) {
        const titleLower = entry.title.toLowerCase();
        for (const [metric, keywords] of mappings) {
          if (keywords.every((kw) => titleLower.includes(kw))) {
            if (!lastCompleted[metric]) {
              lastCompleted[metric] = entry.timestamp;
            }
          }
        }
      }

      // 3. Apply DB overrides: filter inactive rules and apply threshold overrides
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

      const vesselState: VesselComplianceState = {
        last_completed: lastCompleted,
        vessel_type: vessel.vesselType,
        flag_state: vessel.flagState,
        gross_tonnage: Number(vessel.grossTonnage) || 0,
        coi_expiry: vessel.coiExpiry ? new Date(vessel.coiExpiry) : undefined,
      };

      const evaluations = evaluateCompliance(activeRules, vesselState);
      const overallStatus = getOverallStatus(evaluations);

      // 4. Persist results to compliance_events (insert new events)
      for (const evaluation of evaluations) {
        if (evaluation.verdict === "not_applicable") continue;

        await db
          .insert(complianceEvents)
          .values({
            vesselId: vessel.id,
            ruleCode: evaluation.rule_id,
            verdict: evaluation.verdict as "pass" | "warning" | "violation" | "info",
            description: `${evaluation.title} — ${evaluation.frequency_text}`,
            requiredAction: evaluation.required_action,
            deadline: evaluation.next_due,
          });
      }

      // 5. Update vessel complianceStatus based on worst verdict
      const statusMap: Record<string, "compliant" | "warning" | "violation" | "unknown"> = {
        pass: "compliant",
        warning: "warning",
        violation: "violation",
      };
      const newStatus = statusMap[overallStatus] ?? "unknown";
      await db
        .update(vessels)
        .set({ complianceStatus: newStatus, updatedAt: new Date() })
        .where(eq(vessels.id, vessel.id));

      console.log(`Compliance check complete: ${overallStatus} (${evaluations.length} rules evaluated)`);
    } catch (err) {
      console.error("compliance-check job failed:", err);
      throw err;
    }
  });

  // ─── telemetry-ingest handler ────────────────────────────
  await boss.work("telemetry-ingest", async ([job]) => {
    // Phase 1: NMEA/Modbus sensor processing
    console.log("Telemetry ingest received:", JSON.stringify(job.data));
  });

  // ─── report-generate handler ─────────────────────────────
  await boss.work("report-generate", async ([job]) => {
    const { vessel_id, start, end, type } = job.data as {
      vessel_id: string;
      start: string;
      end: string;
      type: string;
    };

    console.log(`Generating ${type} report for vessel ${vessel_id}: ${start} to ${end}`);

    try {
      // TODO Phase 1: generate actual PDF and save to document_vault table
      const [vessel] = await db.select().from(vessels).limit(1);
      if (!vessel) {
        console.warn("report-generate: No vessel configured, skipping");
        return;
      }

      console.log(`Report generation acknowledged for ${type} (${start} — ${end})`);
    } catch (err) {
      console.error("report-generate job failed:", err);
      throw err;
    }
  });

  // ─── Schedule recurring compliance check every 4 hours ───
  await boss.schedule("compliance-check", "0 */4 * * *", {});

  console.log("pg-boss job queue started");
  return boss;
}

/**
 * Schedule an on-demand compliance check for a specific vessel
 */
export async function scheduleComplianceCheck(vesselId: string): Promise<string | null> {
  if (!bossInstance) {
    console.warn("pg-boss not initialized, cannot schedule compliance check");
    return null;
  }
  return bossInstance.send("compliance-check", { vessel_id: vesselId });
}
