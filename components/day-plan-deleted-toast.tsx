import { toast } from "sonner";

import type { DeletedDayPlanItem } from "@/lib/day-plan-deleted-item";

import { restoreDayPlanItem } from "@/app/(app)/day-plan/actions";

export function showDayPlanItemDeletedToast(deleted: DeletedDayPlanItem) {
  toast("Todo deleted", {
    action: {
      label: "Undo",
      onClick: () => {
        void restoreDayPlanItem(deleted).then((result) => {
          if (!result.ok) {
            toast.error("Could not restore todo");
          }
        });
      },
    },
  });
}
