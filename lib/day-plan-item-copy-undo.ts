import { toast } from "sonner";

import { deleteDayPlanItem } from "@/app/(app)/day-plan/actions";

const DAY_PLAN_ITEM_COPY_UNDO_MS = 5000;

let undoInFlight = false;

async function runUndoCopy(copiedItemId: string, toastId: string | number) {
  if (undoInFlight) {
    return;
  }
  undoInFlight = true;
  try {
    const result = await deleteDayPlanItem(copiedItemId);
    if (result.ok) {
      toast.dismiss(toastId);
      return;
    }
    toast.error("Could not undo copy");
  } finally {
    undoInFlight = false;
  }
}

export function showDayPlanItemCopiedToNextDayToast(copiedItemId: string) {
  const toastId = toast.success("Copied to the next day", {
    duration: DAY_PLAN_ITEM_COPY_UNDO_MS,
    action: {
      label: "Undo",
      onClick: () => {
        void runUndoCopy(copiedItemId, toastId);
      },
    },
  });
}
