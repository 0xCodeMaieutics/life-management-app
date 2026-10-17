import { eq, lte } from "drizzle-orm";

import db from "@/lib/db";
import { formatReadReminderMessage } from "@/lib/read-reminder-message";
import {
  computeReadReminderPlanDate,
  planDateFromRemindAt,
} from "@/lib/read-reminder-schedule";
import { computeRemindAt, isRemindAtInFuture } from "@/lib/remind-at";
import { read, readReminder } from "@/lib/schema";
import { type TargetTime } from "@/lib/target-time";
import {
  deleteScheduledSavedMessage,
  scheduleSavedMessage,
} from "@/lib/telegram/client";

export async function expirePastReadReminders() {
  await db.delete(readReminder).where(lte(readReminder.remindAt, new Date()));
}

async function deleteTelegramReminder(messageId: number) {
  try {
    await deleteScheduledSavedMessage(messageId);
  } catch (error) {
    console.error("Failed to delete Telegram scheduled message", error);
  }
}

export async function cancelReadReminderByReadId(readId: string) {
  const [row] = await db
    .select({
      id: readReminder.id,
      telegramScheduledMessageId: readReminder.telegramScheduledMessageId,
    })
    .from(readReminder)
    .where(eq(readReminder.readId, readId))
    .limit(1);

  if (row === undefined) {
    return;
  }

  await deleteTelegramReminder(row.telegramScheduledMessageId);
  await db.delete(readReminder).where(eq(readReminder.id, row.id));
}

function readDisplayLabel(title: string | null, url: string) {
  if (title !== null && title !== "") {
    return title;
  }
  return url;
}

export async function scheduleReadReminder({
  readId,
  planDate,
  remindTime,
  timeZone,
  title,
  url,
}: {
  readId: string;
  planDate: string;
  remindTime: TargetTime;
  timeZone: string;
  title: string | null;
  url: string;
}) {
  const remindAt = computeRemindAt(planDate, remindTime, timeZone);
  if (!isRemindAtInFuture(remindAt)) {
    return { ok: false as const, error: "past" as const };
  }

  const message = formatReadReminderMessage(
    readDisplayLabel(title, url),
    planDate,
    remindTime,
  );
  const scheduleDateUnix = Math.floor(remindAt.getTime() / 1000);

  const [existing] = await db
    .select({
      id: readReminder.id,
      telegramScheduledMessageId: readReminder.telegramScheduledMessageId,
    })
    .from(readReminder)
    .where(eq(readReminder.readId, readId))
    .limit(1);

  if (existing !== undefined) {
    await deleteTelegramReminder(existing.telegramScheduledMessageId);
    await db.delete(readReminder).where(eq(readReminder.id, existing.id));
  }

  const telegramScheduledMessageId = await scheduleSavedMessage(
    message,
    scheduleDateUnix,
  );

  await db.insert(readReminder).values({
    readId,
    remindAt,
    remindTime,
    timeZone,
    telegramScheduledMessageId,
  });

  return { ok: true as const, remindAt };
}

export async function getIdleReadForReminder(readId: string) {
  const [row] = await db
    .select({
      id: read.id,
      title: read.title,
      url: read.url,
      type: read.type,
    })
    .from(read)
    .where(eq(read.id, readId))
    .limit(1);

  if (row === undefined || row.type !== "IDLE") {
    return undefined;
  }

  return row;
}

export function readReminderPlanDate(notToday: boolean, dayOffset: number) {
  return computeReadReminderPlanDate(notToday, dayOffset);
}

export async function refreshReadReminderTelegramMessage(readId: string) {
  try {
    const [row] = await db
      .select({
        readId: readReminder.readId,
        remindAt: readReminder.remindAt,
        remindTime: readReminder.remindTime,
        timeZone: readReminder.timeZone,
        telegramScheduledMessageId: readReminder.telegramScheduledMessageId,
        title: read.title,
        url: read.url,
        type: read.type,
      })
      .from(readReminder)
      .innerJoin(read, eq(read.id, readReminder.readId))
      .where(eq(readReminder.readId, readId))
      .limit(1);

    if (row === undefined || row.type !== "IDLE") {
      return { ok: true as const };
    }

    if (!isRemindAtInFuture(row.remindAt)) {
      return { ok: true as const };
    }

    const planDate = planDateFromRemindAt(row.remindAt, row.timeZone);
    const message = formatReadReminderMessage(
      readDisplayLabel(row.title, row.url),
      planDate,
      row.remindTime,
    );
    const scheduleDateUnix = Math.floor(row.remindAt.getTime() / 1000);

    await deleteTelegramReminder(row.telegramScheduledMessageId);

    const telegramScheduledMessageId = await scheduleSavedMessage(
      message,
      scheduleDateUnix,
    );

    await db
      .update(readReminder)
      .set({ telegramScheduledMessageId })
      .where(eq(readReminder.readId, readId));

    return { ok: true as const };
  } catch (error) {
    console.error(error);
    return { ok: false as const };
  }
}
