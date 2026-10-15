import * as z from "zod";

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

export const targetTimeSchema = z.string().transform((value, ctx) => {
  const normalized = normalizeTargetTime(value);
  if (normalized === null) {
    ctx.addIssue({ code: "custom", message: "Use HH:mm format" });
    return z.NEVER;
  }
  return normalized;
});

export function parseTargetTimeToMinutes(targetTime: string) {
  const [hours, minutes] = targetTime.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatTargetTimeForDisplay(targetTime: string) {
  return targetTime;
}
