import { pgTable, uuid, varchar, timestamp, numeric, integer, text, pgEnum } from "drizzle-orm/pg-core";
import { vessels } from "./vessels.js";

export const priorityEnum = pgEnum("priority", ["low", "medium", "high", "critical"]);

export const maintenancePredictions = pgTable("maintenance_predictions", {
  id: uuid("id").primaryKey().defaultRandom(),
  vesselId: uuid("vessel_id").notNull().references(() => vessels.id, { onDelete: "cascade" }),
  system: varchar("system", { length: 100 }).notNull(),
  predictedDate: timestamp("predicted_date", { withTimezone: true }).notNull(),
  confidence: numeric("confidence", { precision: 5, scale: 4 }).notNull(),
  daysUntil: integer("days_until").notNull(),
  action: text("action").notNull(),
  cost: numeric("cost", { precision: 12, scale: 2 }),
  priority: priorityEnum("priority").default("medium").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
