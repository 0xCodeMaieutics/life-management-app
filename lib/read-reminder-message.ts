import { formatPlanDateForDisplay } from "@/lib/plan-date-display";
import { type TargetTime, formatTargetTimeForDisplay } from "@/lib/target-time";

export function formatReadReminderMessage(
  label: string,
  planDate: string,
  remindTime: TargetTime,
) {
  const dateLabel = formatPlanDateForDisplay(planDate);
  const timeLabel = formatTargetTimeForDisplay(remindTime);
  return `${label} — ${dateLabel} at ${timeLabel}`;
}
