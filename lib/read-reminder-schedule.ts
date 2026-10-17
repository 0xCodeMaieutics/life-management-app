import { formatInTimeZone } from "date-fns-tz";
import * as z from "zod";

import {
  getLocalDateString,
  isValidPlanDateString,
  shiftLocalDateString,
} from "@/lib/plan-date";

export const readReminderDayOffsetSchema = z.number().int().min(1);

export function computeReadReminderPlanDate(
  notToday: boolean,
  dayOffset: number,
) {
  const today = getLocalDateString();
  if (!notToday) {
    return today;
  }

  return shiftLocalDateString(today, dayOffset);
}

export function planDateFromRemindAt(remindAt: Date, timeZone: string) {
  return formatInTimeZone(remindAt, timeZone, "yyyy-MM-dd");
}

export function daysFromTodayToPlanDate(planDate: string) {
  if (!isValidPlanDateString(planDate)) {
    return 1;
  }

  const today = getLocalDateString();
  if (planDate <= today) {
    return 0;
  }

  let cursor = today;
  let days = 0;
  while (cursor < planDate) {
    cursor = shiftLocalDateString(cursor, 1);
    days += 1;
  }

  return days;
}
