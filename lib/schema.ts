import { pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const matterCategory = pgEnum("matter_category", [
  "personal",
  "work",
  "unknown",
]);

export const matter = pgTable("matter", {
  id: uuid().primaryKey().defaultRandom(),
  title: text(),
  key: text().notNull(),
  documentContent: text("document_content").notNull(),
  category: matterCategory(),
});
