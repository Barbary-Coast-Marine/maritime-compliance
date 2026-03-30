import { pgTable, uuid, varchar, date, timestamp, boolean, text } from "drizzle-orm/pg-core";
import { users } from "./users";
import { vessels } from "./vessels";

export const crewProfiles = pgTable("crew_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
  vesselId: uuid("vessel_id").references(() => vessels.id),

  // Personal
  firstName: varchar("first_name", { length: 100 }).notNull(),
  middleName: varchar("middle_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  preferredName: varchar("preferred_name", { length: 100 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 30 }),
  dateOfBirth: date("date_of_birth"),
  addressLine1: varchar("address_line1", { length: 255 }),
  addressLine2: varchar("address_line2", { length: 255 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zip: varchar("zip", { length: 20 }),

  // Emergency contact
  emergencyContactName: varchar("emergency_contact_name", { length: 200 }),
  emergencyContactRelationship: varchar("emergency_contact_relationship", { length: 50 }),
  emergencyContactPhone: varchar("emergency_contact_phone", { length: 30 }),
  nextOfKinName: varchar("next_of_kin_name", { length: 200 }),
  nextOfKinRelationship: varchar("next_of_kin_relationship", { length: 50 }),
  nextOfKinPhone: varchar("next_of_kin_phone", { length: 30 }),
  nextOfKinAddress: text("next_of_kin_address"),

  // Assignment
  department: varchar("department", { length: 50 }),
  watchAssignment: varchar("watch_assignment", { length: 50 }),
  startDate: date("start_date"),
  isVolunteer: boolean("is_volunteer").default(false).notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(),

  // Volunteer-specific
  tshirtSize: varchar("tshirt_size", { length: 10 }),
  badgeIssued: boolean("badge_issued").default(false),
  badgeIssuedDate: date("badge_issued_date"),
  safetyOrientationDate: date("safety_orientation_date"),

  // Medical basics
  fitForDuty: boolean("fit_for_duty").default(true),
  medicalNotes: text("medical_notes"),
  allergies: text("allergies"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
