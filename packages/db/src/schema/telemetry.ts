import { pgTable, uuid, timestamp, varchar, numeric, pgEnum } from "drizzle-orm/pg-core";
import { vessels } from "./vessels";

export const qualityFlagEnum = pgEnum("quality_flag", ["good", "suspect", "bad", "missing"]);

/**
 * Time-series sensor data. Designed for TimescaleDB hypertable conversion.
 * After migration, run: SELECT create_hypertable('telemetry', 'timestamp');
 */
export const telemetry = pgTable("telemetry", {
  id: uuid("id").primaryKey().defaultRandom(),
  vesselId: uuid("vessel_id").notNull().references(() => vessels.id, { onDelete: "cascade" }),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
  sensorType: varchar("sensor_type", { length: 100 }).notNull(),
  metric: varchar("metric", { length: 100 }).notNull(),
  value: numeric("value", { precision: 18, scale: 6 }).notNull(),
  unit: varchar("unit", { length: 50 }).notNull(),
  qualityFlag: qualityFlagEnum("quality_flag").default("good").notNull(),
  source: varchar("source", { length: 100 }),
});
