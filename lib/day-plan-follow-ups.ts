import { formatInTimeZone } from "date-fns-tz";
import { eq } from "drizzle-orm";

import db from "@/lib/db";
import { type FollowUp } from "@/lib/follow-up";
import { dayPlanItem, dayPlanItemFollowUp } from "@/lib/schema";
import {
  deleteScheduledSavedMessage,
  scheduleSavedMessage,
} from "@/lib/telegram/client";

async function deleteTelegramFollowUp(messageId: number) {
  try {
    await deleteScheduledSavedMessage(messageId);
  } catch (error) {
    console.error("Failed to delete Telegram scheduled message", error);
  }
}

async function getFollowUpRow(itemId: string) {
  const [row] = await db
    .select({
      id: dayPlanItemFollowUp.id,
      sendAt: dayPlanItemFollowUp.sendAt,
      telegramScheduledMessageId:
        dayPlanItemFollowUp.telegramScheduledMessageId,
    })
    .from(dayPlanItemFollowUp)
    .where(eq(dayPlanItemFollowUp.dayPlanItemId, itemId))
    .limit(1);

  return row;
}

export async function hasDayPlanItemFollowUpStarted(itemId: string) {
  return (await getFollowUpRow(itemId)) !== undefined;
}

export async function isDayPlanItemFollowUpPending(itemId: string) {
  const row = await getFollowUpRow(itemId);
  return row !== undefined && row.sendAt.getTime() > Date.now();
}

export async function startDayPlanItemFollowUp({
  itemId,
  title,
  followUp,
  timeZone,
}: {
  itemId: string;
  title: string;
  followUp: FollowUp;
  timeZone: string;
}) {
  const completedAt = new Date();
  const sendAt = new Date(completedAt.getTime() + followUp.minutes * 60_000);
  const completedTime = formatInTimeZone(completedAt, timeZone, "HH:mm");
  const message = `${followUp.message}\n${title} — completed at ${completedTime}`;

  const telegramScheduledMessageId = await scheduleSavedMessage(
    message,
    Math.floor(sendAt.getTime() / 1000),
  );

  await db.insert(dayPlanItemFollowUp).values({
    dayPlanItemId: itemId,
    sendAt,
    telegramScheduledMessageId,
  });

  return sendAt;
}

/** Returns the follow-up to **planned**; a **sent** follow-up stays sent. */
export async function stopPendingDayPlanItemFollowUp(itemId: string) {
  const row = await getFollowUpRow(itemId);
  if (row === undefined || row.sendAt.getTime() <= Date.now()) {
    return;
  }

  await deleteTelegramFollowUp(row.telegramScheduledMessageId);
  await db
    .delete(dayPlanItemFollowUp)
    .where(eq(dayPlanItemFollowUp.id, row.id));
}

export async function cancelDayPlanItemFollowUp(itemId: string) {
  await stopPendingDayPlanItemFollowUp(itemId);
  await db
    .update(dayPlanItem)
    .set({ followUpMinutes: null, followUpMessage: null })
    .where(eq(dayPlanItem.id, itemId));
}
