import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import type { DayPlanItemTargetTime, TodoTargetTime } from "@/lib/target-time";

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

export const todo = pgTable("todo", {
  id: uuid().primaryKey().defaultRandom(),
  title: text().notNull(),
  targetTime: text("target_time").notNull().$type<TodoTargetTime>(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const dayPlan = pgTable("day_plan", {
  id: uuid().primaryKey().defaultRandom(),
  date: text().notNull().unique(),
});

export const dayPlanItem = pgTable("day_plan_item", {
  id: uuid().primaryKey().defaultRandom(),
  dayPlanId: uuid("day_plan_id")
    .notNull()
    .references(() => dayPlan.id, { onDelete: "cascade" }),
  title: text().notNull(),
  targetTime: text("target_time").$type<DayPlanItemTargetTime>(),
  completed: boolean().notNull().default(false),
});
