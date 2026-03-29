import { pgTable, uuid, varchar, timestamp, jsonb, text } from "drizzle-orm/pg-core";
import { vessels } from "./vessels";

/**
 * Immutable, append-only audit log.
 * Each row includes a SHA-256 hash of (previous_hash + event_data + timestamp)
 * to form a tamper-evident chain.
 */
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  vesselId: uuid("vessel_id").notNull().references(() => vessels.id, { onDelete: "cascade" }),
  eventType: varchar("event_type", { length: 50 }).notNull(),
  eventData: jsonb("event_data").notNull(),
  userId: uuid("user_id"),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  hash: text("hash").notNull(),
});
