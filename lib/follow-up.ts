import { format, isToday } from "date-fns";
import * as z from "zod";

export const MAX_FOLLOW_UP_MINUTES = 7 * 24 * 60;

const MAX_FOLLOW_UP_MESSAGE_LENGTH = 500;

export const FOLLOW_UP_DURATION_PRESETS = [15, 30, 60, 120, 24 * 60];

export const followUpSchema = z.object({
  minutes: z.number().int().min(1).max(MAX_FOLLOW_UP_MINUTES),
  message: z.string().trim().min(1).max(MAX_FOLLOW_UP_MESSAGE_LENGTH),
});

export type FollowUp = z.infer<typeof followUpSchema>;

export function followUpFromColumns(
  minutes: number | null,
  message: string | null,
): FollowUp | null {
  if (minutes === null || message === null) {
    return null;
  }
  return { minutes, message };
}

export function formatFollowUpDuration(totalMinutes: number) {
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;
  const parts = [
    days > 0 ? `${days} d` : null,
    hours > 0 ? `${hours} h` : null,
    minutes > 0 ? `${minutes} min` : null,
  ];
  return parts.filter((part) => part !== null).join(" ");
}

export function formatFollowUpSendAt(sendAt: string) {
  const date = new Date(sendAt);
  return isToday(date)
    ? format(date, "HH:mm")
    : format(date, "EEE d MMM, HH:mm");
}
