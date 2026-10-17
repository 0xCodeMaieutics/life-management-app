"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { readReminderDayOffsetSchema } from "@/lib/read-reminder-schedule";
import {
  cancelReadReminderByReadId,
  getIdleReadForReminder,
  readReminderPlanDate,
  scheduleReadReminder as scheduleReminder,
} from "@/lib/read-reminders";
import { ianaTimeZoneSchema, parseRemindTimeInput } from "@/lib/remind-at";
import { isTelegramConfigured } from "@/lib/telegram/client";

export async function scheduleReadReminder(input: {
  readId: string;
  remindTime: string;
  timeZone: string;
  notToday: boolean;
  dayOffset: number;
}) {
  if (!isTelegramConfigured()) {
    return { ok: false as const, error: "telegram" as const };
  }

  const idResult = z.uuid().safeParse(input.readId);
  const timeResult = parseRemindTimeInput(input.remindTime);
  const timeZoneResult = ianaTimeZoneSchema.safeParse(input.timeZone);

  if (!idResult.success || !timeResult.success || !timeZoneResult.success) {
    return { ok: false as const, error: "invalid" as const };
  }

  const dayOffsetResult = input.notToday
    ? readReminderDayOffsetSchema.safeParse(input.dayOffset)
    : { success: true as const, data: 1 };

  if (!dayOffsetResult.success) {
    return { ok: false as const, error: "invalid" as const };
  }

  const row = await getIdleReadForReminder(idResult.data);
  if (row === undefined) {
    return { ok: false as const, error: "invalid" as const };
  }

  const planDate = readReminderPlanDate(input.notToday, dayOffsetResult.data);

  try {
    const result = await scheduleReminder({
      readId: row.id,
      planDate,
      remindTime: timeResult.data,
      timeZone: timeZoneResult.data,
      title: row.title,
      url: row.url,
    });

    if (!result.ok) {
      return result;
    }

    revalidatePath("/later-reads");
    return { ok: true as const };
  } catch (error) {
    console.error(error);
    return { ok: false as const, error: "failed" as const };
  }
}

export async function cancelReadReminder(readId: string) {
  const parsed = z.uuid().safeParse(readId);
  if (!parsed.success) {
    return { ok: false as const };
  }

  try {
    await cancelReadReminderByReadId(parsed.data);
    revalidatePath("/later-reads");
    return { ok: true as const };
  } catch (error) {
    console.error(error);
    return { ok: false as const };
  }
}
