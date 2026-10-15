import { isValidPlanDateString } from "@/lib/plan-date";

export function formatPlanDateForDisplay(planDate: string) {
  if (!isValidPlanDateString(planDate)) {
    return planDate;
  }

  const [year, month, day] = planDate.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}
