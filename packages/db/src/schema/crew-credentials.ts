import { pgTable, uuid, varchar, date, timestamp, text } from "drizzle-orm/pg-core";
import { crewProfiles } from "./crew-profiles.js";
import { documentVault } from "./document-vault.js";

export const crewCredentials = pgTable("crew_credentials", {
  id: uuid("id").primaryKey().defaultRandom(),
  crewProfileId: uuid("crew_profile_id").notNull().references(() => crewProfiles.id, { onDelete: "cascade" }),

  credentialType: varchar("credential_type", { length: 50 }).notNull(),
  // Types: mmc, license, endorsement, twic, stcw, medical_cert,
  //        drug_test, bst, firefighting, first_aid, survival_craft,
  //        safety_orientation, custom

  title: varchar("title", { length: 200 }).notNull(),
  credentialNumber: varchar("credential_number", { length: 100 }),
  grade: varchar("grade", { length: 100 }),
  issuer: varchar("issuer", { length: 200 }),

  issueDate: date("issue_date"),
  expiryDate: date("expiry_date"),
  status: varchar("status", { length: 20 }).default("current").notNull(),

  // Linked document in vault
  documentId: uuid("document_id").references(() => documentVault.id),

  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
