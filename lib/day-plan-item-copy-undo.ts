import { toast } from "sonner";

import { trpcClient } from "@/trpc/client";

const DAY_PLAN_ITEM_COPY_UNDO_MS = 5000;

let undoInFlight = false;

async function runUndoCopy(
  copiedItemId: string,
  toastId: string | number,
  onUndone: () => void,
) {
  if (undoInFlight) {
    return;
  }
  undoInFlight = true;
  try {
    await trpcClient.dayPlan.deleteItem.mutate({ itemId: copiedItemId });
    toast.dismiss(toastId);
    onUndone();
  } catch {
    toast.error("Could not undo copy");
  } finally {
    undoInFlight = false;
  }
}

export function showDayPlanItemCopiedToNextDayToast(
  copiedItemId: string,
  onUndone: () => void,
) {
  const toastId = toast.success("Copied to the next day", {
    duration: DAY_PLAN_ITEM_COPY_UNDO_MS,
    action: {
      label: "Undo",
      onClick: () => {
        void runUndoCopy(copiedItemId, toastId, onUndone);
      },
    },
  });
}
