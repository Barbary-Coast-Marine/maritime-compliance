import { pgTable, uuid, varchar, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";
import { vessels } from "./vessels.js";

export const userRoleEnum = pgEnum("user_role", ["captain", "engineer", "crew", "fleet_manager", "volunteer", "admin"]);

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: varchar("username", { length: 50 }).unique().notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: userRoleEnum("role").notNull(),
  vesselId: uuid("vessel_id").references(() => vessels.id),
  displayName: varchar("display_name", { length: 200 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
