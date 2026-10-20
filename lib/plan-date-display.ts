import { format } from "date-fns";

import { isValidPlanDateString } from "@/lib/plan-date";

export function formatPlanDateForDisplay(planDate: string) {
  if (!isValidPlanDateString(planDate)) {
    return planDate;
  }

  const [year, month, day] = planDate.split("-").map(Number);

  return format(new Date(year, month - 1, day), "d MMM yyyy");
}
