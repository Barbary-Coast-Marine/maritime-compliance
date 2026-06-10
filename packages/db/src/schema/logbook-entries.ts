import { pgTable, uuid, varchar, timestamp, text, jsonb, pgEnum } from "drizzle-orm/pg-core";
import { vessels } from "./vessels.js";

export const entryTypeEnum = pgEnum("entry_type", [
  "drill",
  "inspection",
  "fuel_dip",
  "maintenance",
  "general",
]);

export const logbookEntries = pgTable("logbook_entries", {
  id: uuid("id").primaryKey().defaultRandom(),
  vesselId: uuid("vessel_id").notNull().references(() => vessels.id, { onDelete: "cascade" }),
  entryType: entryTypeEnum("entry_type").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  author: varchar("author", { length: 100 }).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  body: text("body"),
  attachments: jsonb("attachments").$type<{ filename: string; path: string; mime: string }[]>(),
});
