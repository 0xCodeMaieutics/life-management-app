import { toast } from "sonner";

import type { DeletedDayPlanItem } from "@/lib/day-plan-deleted-item";

import { trpcClient } from "@/trpc/client";

export const DAY_PLAN_ITEM_REMOVE_UNDO_MS = 5000;

type PendingRemoveUndo = {
  deleted: DeletedDayPlanItem;
  onRestored: () => void;
  expiresAt: number;
  toastId: string | number;
};

let pendingRemoveUndo: PendingRemoveUndo | null = null;
let restoreInFlight = false;

function undoShortcutLabel(): string {
  if (
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPod|iPad/.test(navigator.platform)
  ) {
    return "⌘Z";
  }
  return "Ctrl+Z";
}

function clearPendingRemoveUndo(deletedId: string) {
  if (pendingRemoveUndo?.deleted.id !== deletedId) {
    return;
  }
  toast.dismiss(pendingRemoveUndo.toastId);
  pendingRemoveUndo = null;
}

async function runRestore(
  deleted: DeletedDayPlanItem,
  onRestored: () => void,
): Promise<boolean> {
  if (restoreInFlight) {
    return false;
  }
  restoreInFlight = true;
  try {
    await trpcClient.dayPlan.restoreItem.mutate(deleted);
    clearPendingRemoveUndo(deleted.id);
    onRestored();
    return true;
  } catch {
    toast.error("Could not restore todo");
    return false;
  } finally {
    restoreInFlight = false;
  }
}

export function getPendingDayPlanItemRemoveUndo(): DeletedDayPlanItem | null {
  if (pendingRemoveUndo === null) {
    return null;
  }
  if (Date.now() > pendingRemoveUndo.expiresAt) {
    pendingRemoveUndo = null;
    return null;
  }
  return pendingRemoveUndo.deleted;
}

export async function undoPendingDayPlanItemRemove(): Promise<boolean> {
  const deleted = getPendingDayPlanItemRemoveUndo();
  if (deleted === null || pendingRemoveUndo === null) {
    return false;
  }
  return runRestore(deleted, pendingRemoveUndo.onRestored);
}

export function showDayPlanItemRemoveUndoToast(
  deleted: DeletedDayPlanItem,
  onRestored: () => void,
) {
  if (pendingRemoveUndo !== null) {
    toast.dismiss(pendingRemoveUndo.toastId);
  }

  const toastId = toast("Todo deleted", {
    duration: DAY_PLAN_ITEM_REMOVE_UNDO_MS,
    description: `Press ${undoShortcutLabel()} to undo`,
    classNames: {
      description: "!text-foreground/80",
    },
    action: {
      label: "Undo",
      onClick: () => {
        void runRestore(deleted, onRestored);
      },
    },
  });

  pendingRemoveUndo = {
    deleted,
    onRestored,
    expiresAt: Date.now() + DAY_PLAN_ITEM_REMOVE_UNDO_MS,
    toastId,
  };
}
