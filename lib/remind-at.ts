import { fromZonedTime } from "date-fns-tz";
import * as z from "zod";

import { type TargetTime } from "@/lib/target-time";

export const ianaTimeZoneSchema = z
  .string()
  .min(1)
  .refine((value) => {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: value });
      return true;
    } catch {
      return false;
    }
  });

export function computeRemindAt(
  planDate: string,
  remindTime: TargetTime,
  timeZone: string,
): Date {
  return fromZonedTime(`${planDate}T${remindTime}:00`, timeZone);
}

export function isRemindAtInFuture(remindAt: Date) {
  return remindAt.getTime() > Date.now();
}
