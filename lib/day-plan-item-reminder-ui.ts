import { type DayPlanItem } from "@/lib/day-segments";

export function dayPlanItemHasPendingReminder(item: DayPlanItem) {
  return item.pendingReminder !== null;
}

export function dayPlanItemNeedsCompleteConfirmation(item: DayPlanItem) {
  if (item.completed || item.pendingReminder === null) {
    return false;
  }

  return new Date(item.pendingReminder.remindAt).getTime() > Date.now();
}
