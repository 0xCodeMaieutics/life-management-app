"use server";

import { revalidatePath } from "next/cache";
import * as z from "zod";

import { dayPlanItemReferenceFromColumns } from "@/lib/day-plan-item-reference";
import {
  cancelDayPlanItemReminderByItemId,
  getDayPlanItemWithPlanDate,
  scheduleDayPlanItemReminder as scheduleReminder,
} from "@/lib/day-plan-reminders";
import { isValidPlanDateString } from "@/lib/plan-date";
import { ianaTimeZoneSchema, parseRemindTimeInput } from "@/lib/remind-at";
import { isTelegramConfigured } from "@/lib/telegram/client";

const planDateSchema = z.string().refine(isValidPlanDateString);

export async function scheduleDayPlanItemReminder(input: {
  itemId: string;
  planDate: string;
  remindTime: string;
  timeZone: string;
}) {
  if (!isTelegramConfigured()) {
    return { ok: false as const, error: "telegram" as const };
  }

  const idResult = z.uuid().safeParse(input.itemId);
  const dateResult = planDateSchema.safeParse(input.planDate);
  const timeResult = parseRemindTimeInput(input.remindTime);
  const timeZoneResult = ianaTimeZoneSchema.safeParse(input.timeZone);

  if (
    !idResult.success ||
    !dateResult.success ||
    !timeResult.success ||
    !timeZoneResult.success
  ) {
    return { ok: false as const, error: "invalid" as const };
  }

  const item = await getDayPlanItemWithPlanDate(idResult.data);
  if (item === undefined || item.completed || item.cancelled) {
    return { ok: false as const, error: "invalid" as const };
  }

  if (item.planDate !== dateResult.data) {
    return { ok: false as const, error: "invalid" as const };
  }

  try {
    const result = await scheduleReminder({
      itemId: item.id,
      planDate: item.planDate,
      remindTime: timeResult.data,
      timeZone: timeZoneResult.data,
      title: item.title,
      reference: dayPlanItemReferenceFromColumns(
        item.referenceType,
        item.referenceValue,
      ),
    });

    if (!result.ok) {
      return result;
    }

    revalidatePath("/day-plan");
    return { ok: true as const };
  } catch (error) {
    console.error(error);
    return { ok: false as const, error: "failed" as const };
  }
}

export async function cancelDayPlanItemReminder(itemId: string) {
  const parsed = z.uuid().safeParse(itemId);
  if (!parsed.success) {
    return { ok: false as const };
  }

  try {
    await cancelDayPlanItemReminderByItemId(parsed.data);
    revalidatePath("/day-plan");
    return { ok: true as const };
  } catch (error) {
    console.error(error);
    return { ok: false as const };
  }
}
