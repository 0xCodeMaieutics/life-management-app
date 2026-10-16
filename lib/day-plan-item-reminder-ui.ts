import { type DayPlanItem } from "@/lib/day-segments";
import { isPlanDateBeforeToday } from "@/lib/plan-date";
import { computeRemindAt, isRemindAtInFuture } from "@/lib/remind-at";

export function dayPlanItemCanScheduleReminder(
  item: DayPlanItem,
  planDate: string,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
) {
  if (item.completed || item.cancelled || isPlanDateBeforeToday(planDate)) {
    return false;
  }

  if (item.targetTime === null) {
    return true;
  }

  const targetAt = computeRemindAt(planDate, item.targetTime, timeZone);
  return isRemindAtInFuture(targetAt);
}

export function dayPlanItemHasPendingReminder(item: DayPlanItem) {
  return item.pendingReminder !== null;
}

export function dayPlanItemNeedsCompleteConfirmation(item: DayPlanItem) {
  if (item.completed || item.cancelled || item.pendingReminder === null) {
    return false;
  }

  return new Date(item.pendingReminder.remindAt).getTime() > Date.now();
}
