import PgBoss from "pg-boss";
import { desc, eq } from "drizzle-orm";
import { createDb, vessels, logbookEntries, complianceEvents, complianceRules } from "@maritime/db";
import { sendViolationAlert } from "./agent/notifications.js";
import { loadRules } from "@maritime/regulations";
import {
  evaluateCompliance,
  getOverallStatus,
  buildLastCompleted,
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

      const recentEntries = await db
        .select()
        .from(logbookEntries)
        .orderBy(desc(logbookEntries.timestamp))
        .limit(100);

      const lastCompleted = buildLastCompleted(recentEntries);

      // 3. Apply DB overrides: filter inactive rules and apply threshold overrides
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

      // Send violation alert email via Composio if any violations found
      const violations = evaluations.filter((e) => e.verdict === "violation");
      if (violations.length > 0 && process.env.COMPOSIO_API_KEY && process.env.ALERT_EMAIL) {
        sendViolationAlert(vessel.id, vessel.name ?? "Vessel", violations).catch((err) => {
          console.error("Failed to send violation alert:", err);
        });
      }
    } catch (err) {
      console.error("compliance-check job failed:", err);
      throw err;
    }
  });

  // ─── telemetry-ingest handler ────────────────────────────
  // Placeholder — NMEA/Modbus sensor ingestion not yet implemented
  await boss.work("telemetry-ingest", async ([_job]) => {});

  // ─── report-generate handler ─────────────────────────────
  await boss.work("report-generate", async ([job]) => {
    const { vessel_id, start, end, type } = job.data as {
      vessel_id: string;
      start: string;
      end: string;
      type: string;
    };

    try {
      // On-demand report requests are fulfilled synchronously via GET /reports/audit.
      // This job slot is reserved for future async PDF generation and archiving.
      const [vessel] = await db.select().from(vessels).limit(1);
      if (!vessel) {
        console.warn("report-generate: No vessel configured, skipping");
        return;
      }
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
