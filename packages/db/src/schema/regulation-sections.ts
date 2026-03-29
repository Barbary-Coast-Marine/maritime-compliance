import { pgTable, uuid, varchar, integer, text, date, vector, index } from "drizzle-orm/pg-core";

export const regulationSections = pgTable(
  "regulation_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    source: varchar("source", { length: 50 }).notNull(), // e.g. "eCFR", "IMO"
    titleNum: integer("title_num").notNull(), // e.g. 46
    chapter: varchar("chapter", { length: 10 }), // e.g. "I"
    subchapter: varchar("subchapter", { length: 10 }), // e.g. "T"
    part: integer("part"), // e.g. 176
    sectionNum: varchar("section_num", { length: 20 }), // e.g. "176.600"
    citation: varchar("citation", { length: 100 }).notNull(), // e.g. "46 CFR 176.600"
    heading: text("heading").notNull(),
    fullText: text("full_text").notNull(),
    lastAmended: date("last_amended"),
    embedding: vector("embedding", { dimensions: 768 }), // nomic-embed-text = 768 dims
  },
  (table) => [
    index("idx_reg_citation").on(table.citation),
    index("idx_reg_subchapter").on(table.subchapter),
  ],
);
