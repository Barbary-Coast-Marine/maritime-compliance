import { pgTable, uuid, varchar, jsonb, text, date, boolean, pgEnum } from "drizzle-orm/pg-core";
import { regulationSections } from "./regulation-sections.js";

export const triggerTypeEnum = pgEnum("trigger_type", ["calendar", "threshold", "event"]);

export const complianceRules = pgTable("compliance_rules", {
  id: uuid("id").primaryKey().defaultRandom(),
  ruleCode: varchar("rule_code", { length: 50 }).unique().notNull(),
  regulationSectionId: uuid("regulation_section_id").references(() => regulationSections.id),
  triggerType: triggerTypeEnum("trigger_type").notNull(),
  triggerConfig: jsonb("trigger_config").notNull(), // interval_days, warning_days, etc.
  severityLevels: jsonb("severity_levels").notNull(), // maps conditions to verdicts
  requiredAction: text("required_action").notNull(),
  deadlineCalc: text("deadline_calc"),
  verifiedBy: varchar("verified_by", { length: 100 }),
  verifiedDate: date("verified_date"),
  isActive: boolean("is_active").default(true).notNull(),
});
