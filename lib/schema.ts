import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

import type { DayPlanItemTargetTime, TodoTargetTime } from "@/lib/target-time";

const id = () =>
  text()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const timestamp = (name: string) => integer(name, { mode: "timestamp_ms" });

export const matterCategories = ["personal", "work", "unknown"] as const;

export const matter = sqliteTable("matter", {
  id: id(),
  title: text(),
  key: text().notNull(),
  documentContent: text("document_content").notNull(),
  category: text({ enum: matterCategories }),
});

export const read = sqliteTable("read", {
  id: id(),
  url: text().notNull(),
  title: text(),
  type: text({ enum: ["IDLE", "MARK_AS_RESOLVED"] })
    .notNull()
    .default("IDLE"),
  finishedAt: timestamp("finished_at"),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const readReminder = sqliteTable("read_reminder", {
  id: id(),
  readId: text("read_id")
    .notNull()
    .unique()
    .references(() => read.id, { onDelete: "cascade" }),
  remindAt: timestamp("remind_at").notNull(),
  remindTime: text("remind_time").notNull().$type<TodoTargetTime>(),
  timeZone: text("time_zone").notNull(),
  telegramScheduledMessageId: integer(
    "telegram_scheduled_message_id",
  ).notNull(),
});

export const todo = sqliteTable("todo", {
  id: id(),
  title: text().notNull(),
  targetTime: text("target_time").notNull().$type<TodoTargetTime>(),
  createdAt: timestamp("created_at")
    .notNull()
    .$defaultFn(() => new Date()),
});

export const dayPlan = sqliteTable("day_plan", {
  id: id(),
  date: text().notNull().unique(),
});

export const dayPlanItem = sqliteTable("day_plan_item", {
  id: id(),
  dayPlanId: text("day_plan_id")
    .notNull()
    .references(() => dayPlan.id, { onDelete: "cascade" }),
  todoId: text("todo_id").references(() => todo.id, { onDelete: "set null" }),
  title: text().notNull(),
  targetTime: text("target_time").$type<DayPlanItemTargetTime>(),
  completed: integer({ mode: "boolean" }).notNull().default(false),
  cancelled: integer({ mode: "boolean" }).notNull().default(false),
});

export const dayPlanItemReminder = sqliteTable("day_plan_item_reminder", {
  id: id(),
  dayPlanItemId: text("day_plan_item_id")
    .notNull()
    .unique()
    .references(() => dayPlanItem.id, { onDelete: "cascade" }),
  remindAt: timestamp("remind_at").notNull(),
  remindTime: text("remind_time").notNull().$type<TodoTargetTime>(),
  timeZone: text("time_zone").notNull(),
  telegramScheduledMessageId: integer(
    "telegram_scheduled_message_id",
  ).notNull(),
});

export const dayPlanItemSteps = sqliteTable("day_plan_item_steps", {
  id: id(),
  dayPlanItemId: text("day_plan_item_id")
    .notNull()
    .references(() => dayPlanItem.id, { onDelete: "cascade" }),
  steps: integer().notNull(),
});
