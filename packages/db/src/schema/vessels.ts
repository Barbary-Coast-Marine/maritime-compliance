import { pgTable, uuid, varchar, integer, numeric, date, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const complianceStatusEnum = pgEnum("compliance_status", [
  "compliant",
  "warning",
  "violation",
  "unknown",
]);

export const vesselTypeEnum = pgEnum("vessel_type", [
  "small_passenger",
  "passenger",
  "cargo",
  "tanker",
  "towing",
  "offshore_supply",
  "fishing",
  "other",
]);

export const vessels = pgTable("vessels", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  imoNumber: varchar("imo_number", { length: 20 }).unique(),
  vesselType: vesselTypeEnum("vessel_type").notNull(),
  flagState: varchar("flag_state", { length: 10 }).notNull(),
  grossTonnage: numeric("gross_tonnage", { precision: 10, scale: 2 }),
  yearBuilt: integer("year_built"),
  coiDate: date("coi_date"),
  coiExpiry: date("coi_expiry"),
  lastDrydock: date("last_drydock"),
  complianceStatus: complianceStatusEnum("compliance_status").default("unknown").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
