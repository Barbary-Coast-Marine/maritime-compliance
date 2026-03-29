import { pgTable, uuid, varchar, timestamp, text, numeric, pgEnum } from "drizzle-orm/pg-core";
import { vessels } from "./vessels";

export const verdictEnum = pgEnum("verdict", ["pass", "warning", "violation", "info"]);

export const complianceEvents = pgTable("compliance_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  vesselId: uuid("vessel_id").notNull().references(() => vessels.id, { onDelete: "cascade" }),
  ruleCode: varchar("rule_code", { length: 50 }).notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  verdict: verdictEnum("verdict").notNull(),
  description: text("description"),
  requiredAction: text("required_action"),
  deadline: timestamp("deadline", { withTimezone: true }),
  acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
  acknowledgedBy: uuid("acknowledged_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  costIfDelayed: numeric("cost_if_delayed", { precision: 12, scale: 2 }),
});
