"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

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

  const row = await getIdleReadForReminder(idResult.data);
  if (row === undefined) {
    return { ok: false as const, error: "invalid" as const };
  }

  const planDate = readReminderPlanDate();

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
