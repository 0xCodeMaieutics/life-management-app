import {
  boolean,
  integer,
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

export const readType = pgEnum("read_type", ["IDLE", "MARK_AS_RESOLVED"]);

export const matter = pgTable("matter", {
  id: uuid().primaryKey().defaultRandom(),
  title: text(),
  key: text().notNull(),
  documentContent: text("document_content").notNull(),
  category: matterCategory(),
});

export const read = pgTable("read", {
  id: uuid().primaryKey().defaultRandom(),
  url: text().notNull(),
  title: text(),
  type: readType().notNull().default("IDLE"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
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
  cancelled: boolean().notNull().default(false),
});

export const dayPlanItemReminder = pgTable("day_plan_item_reminder", {
  id: uuid().primaryKey().defaultRandom(),
  dayPlanItemId: uuid("day_plan_item_id")
    .notNull()
    .unique()
    .references(() => dayPlanItem.id, { onDelete: "cascade" }),
  remindAt: timestamp("remind_at", { withTimezone: true }).notNull(),
  remindTime: text("remind_time").notNull().$type<TodoTargetTime>(),
  timeZone: text("time_zone").notNull(),
  telegramScheduledMessageId: integer(
    "telegram_scheduled_message_id",
  ).notNull(),
});

export const dayPlanItemSteps = pgTable("day_plan_item_steps", {
  id: uuid().primaryKey().defaultRandom(),
  dayPlanItemId: uuid("day_plan_item_id")
    .notNull()
    .references(() => dayPlanItem.id, { onDelete: "cascade" }),
  steps: integer().notNull(),
});
