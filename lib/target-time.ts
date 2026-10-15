import * as z from "zod";

/** Normalized `HH:mm` time-of-day (no calendar date). */
export type TargetTime = string;

/** Required on **Todo** — without it the entry is not part of the reusable library. */
export type TodoTargetTime = TargetTime;

/** **Day plan item** may omit a time (`null`) for one-off untimed entries. */
export type DayPlanItemTargetTime = TargetTime | null;

export function normalizeTargetTime(value: string) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (match === null) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (hours > 23 || minutes > 59) {
    return null;
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export const targetTimeSchema = z
  .string()
  .transform((value, ctx): TargetTime => {
    const normalized = normalizeTargetTime(value);
    if (normalized === null) {
      ctx.addIssue({ code: "custom", message: "Use HH:mm format" });
      return z.NEVER;
    }
    return normalized;
  });

export const dayPlanItemTargetTimeSchema = targetTimeSchema.nullable();

export function parseTargetTimeToMinutes(targetTime: TargetTime) {
  const [hours, minutes] = targetTime.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatTargetTimeForDisplay(targetTime: TargetTime) {
  const [hours, minutes] = targetTime.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours, minutes);

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
