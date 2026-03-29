import { pgTable, uuid, varchar, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { vessels } from "./vessels";

export const userRoleEnum = pgEnum("user_role", ["captain", "engineer", "crew", "fleet_manager"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull(),
  vesselId: uuid("vessel_id").references(() => vessels.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
