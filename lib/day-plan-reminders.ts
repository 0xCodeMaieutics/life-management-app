import { eq, lte } from "drizzle-orm";

import { formatDayPlanReminderMessage } from "@/lib/day-plan-reminder-message";
import db from "@/lib/db";
import {
  computeRemindAt,
  isRemindAtInFuture,
} from "@/lib/remind-at";
import { dayPlan, dayPlanItem, dayPlanItemReminder } from "@/lib/schema";
import { type TargetTime } from "@/lib/target-time";
import {
  deleteScheduledSavedMessage,
  scheduleSavedMessage,
} from "@/lib/telegram/client";

export async function expirePastDayPlanReminders() {
  await db
    .delete(dayPlanItemReminder)
    .where(lte(dayPlanItemReminder.remindAt, new Date()));
}

async function deleteTelegramReminder(messageId: number) {
  try {
    await deleteScheduledSavedMessage(messageId);
  } catch (error) {
    console.error("Failed to delete Telegram scheduled message", error);
  }
}

export async function cancelDayPlanItemReminderByItemId(itemId: string) {
  const [row] = await db
    .select({
      id: dayPlanItemReminder.id,
      telegramScheduledMessageId: dayPlanItemReminder.telegramScheduledMessageId,
    })
    .from(dayPlanItemReminder)
    .where(eq(dayPlanItemReminder.dayPlanItemId, itemId))
    .limit(1);

  if (row === undefined) {
    return;
  }

  await deleteTelegramReminder(row.telegramScheduledMessageId);
  await db
    .delete(dayPlanItemReminder)
    .where(eq(dayPlanItemReminder.id, row.id));
}

export async function scheduleDayPlanItemReminder({
  itemId,
  planDate,
  remindTime,
  timeZone,
  title,
}: {
  itemId: string;
  planDate: string;
  remindTime: TargetTime;
  timeZone: string;
  title: string;
}) {
  const remindAt = computeRemindAt(planDate, remindTime, timeZone);
  if (!isRemindAtInFuture(remindAt)) {
    return { ok: false as const, error: "past" as const };
  }

  const message = formatDayPlanReminderMessage(title, planDate, remindTime);
  const scheduleDateUnix = Math.floor(remindAt.getTime() / 1000);

  const [existing] = await db
    .select({
      id: dayPlanItemReminder.id,
      telegramScheduledMessageId: dayPlanItemReminder.telegramScheduledMessageId,
    })
    .from(dayPlanItemReminder)
    .where(eq(dayPlanItemReminder.dayPlanItemId, itemId))
    .limit(1);

  if (existing !== undefined) {
    await deleteTelegramReminder(existing.telegramScheduledMessageId);
    await db
      .delete(dayPlanItemReminder)
      .where(eq(dayPlanItemReminder.id, existing.id));
  }

  const telegramScheduledMessageId = await scheduleSavedMessage(
    message,
    scheduleDateUnix,
  );

  await db.insert(dayPlanItemReminder).values({
    dayPlanItemId: itemId,
    remindAt,
    remindTime,
    timeZone,
    telegramScheduledMessageId,
  });

  return { ok: true as const, remindAt };
}

export async function rescheduleDayPlanItemReminderForPlanDate(
  itemId: string,
  planDate: string,
) {
  const [row] = await db
    .select({
      id: dayPlanItemReminder.id,
      remindTime: dayPlanItemReminder.remindTime,
      timeZone: dayPlanItemReminder.timeZone,
      telegramScheduledMessageId: dayPlanItemReminder.telegramScheduledMessageId,
      title: dayPlanItem.title,
    })
    .from(dayPlanItemReminder)
    .innerJoin(
      dayPlanItem,
      eq(dayPlanItemReminder.dayPlanItemId, dayPlanItem.id),
    )
    .where(eq(dayPlanItemReminder.dayPlanItemId, itemId))
    .limit(1);

  if (row === undefined) {
    return;
  }

  const remindAt = computeRemindAt(planDate, row.remindTime, row.timeZone);
  if (!isRemindAtInFuture(remindAt)) {
    await deleteTelegramReminder(row.telegramScheduledMessageId);
    await db
      .delete(dayPlanItemReminder)
      .where(eq(dayPlanItemReminder.id, row.id));
    return;
  }

  await deleteTelegramReminder(row.telegramScheduledMessageId);

  const message = formatDayPlanReminderMessage(
    row.title,
    planDate,
    row.remindTime,
  );
  const scheduleDateUnix = Math.floor(remindAt.getTime() / 1000);
  const telegramScheduledMessageId = await scheduleSavedMessage(
    message,
    scheduleDateUnix,
  );

  await db
    .update(dayPlanItemReminder)
    .set({ remindAt, telegramScheduledMessageId })
    .where(eq(dayPlanItemReminder.id, row.id));
}

export async function getDayPlanItemWithPlanDate(itemId: string) {
  const [row] = await db
    .select({
      id: dayPlanItem.id,
      title: dayPlanItem.title,
      completed: dayPlanItem.completed,
      planDate: dayPlan.date,
      targetTime: dayPlanItem.targetTime,
    })
    .from(dayPlanItem)
    .innerJoin(dayPlan, eq(dayPlanItem.dayPlanId, dayPlan.id))
    .where(eq(dayPlanItem.id, itemId))
    .limit(1);

  return row;
}
