import type { DeletedDayPlanItem } from "@/lib/day-plan-deleted-item";

import { showDayPlanItemRemoveUndoToast } from "@/lib/day-plan-item-remove-undo";

export function showDayPlanItemDeletedToast(
  deleted: DeletedDayPlanItem,
  onRestored: () => void,
) {
  showDayPlanItemRemoveUndoToast(deleted, onRestored);
}
