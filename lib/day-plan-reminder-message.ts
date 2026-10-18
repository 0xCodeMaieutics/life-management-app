import { type DayPlanItemReference } from "@/lib/day-plan-item-reference";
import { formatPlanDateForDisplay } from "@/lib/plan-date-display";
import { type TargetTime, formatTargetTimeForDisplay } from "@/lib/target-time";

export function formatDayPlanReminderMessage(
  title: string,
  planDate: string,
  remindTime: TargetTime,
  reference: DayPlanItemReference | null,
) {
  const dateLabel = formatPlanDateForDisplay(planDate);
  const timeLabel = formatTargetTimeForDisplay(remindTime);
  const message = `${title} — ${dateLabel} at ${timeLabel}`;
  return reference === null ? message : `${message}\n${reference.value}`;
}
