import { pgTable, uuid, varchar, timestamp, date } from "drizzle-orm/pg-core";
import { vessels } from "./vessels";

export const documentVault = pgTable("document_vault", {
  id: uuid("id").primaryKey().defaultRandom(),
  vesselId: uuid("vessel_id").notNull().references(() => vessels.id, { onDelete: "cascade" }),
  docType: varchar("doc_type", { length: 50 }).notNull(), // COI, survey_report, class_cert, etc.
  filename: varchar("filename", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }).notNull(),
  filePath: varchar("file_path", { length: 500 }).notNull(),
  uploadedBy: uuid("uploaded_by"),
  uploadedAt: timestamp("uploaded_at", { withTimezone: true }).defaultNow().notNull(),
  expiryDate: date("expiry_date"),
});
