import { toast } from "sonner";

import type { DeletedDayPlanItem } from "@/lib/day-plan-deleted-item";

import { restoreDayPlanItem } from "@/app/(app)/day-plan/actions";

export const DAY_PLAN_ITEM_REMOVE_UNDO_MS = 5000;

type PendingRemoveUndo = {
  deleted: DeletedDayPlanItem;
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

async function runRestore(deleted: DeletedDayPlanItem): Promise<boolean> {
  if (restoreInFlight) {
    return false;
  }
  restoreInFlight = true;
  try {
    const result = await restoreDayPlanItem(deleted);
    if (result.ok) {
      clearPendingRemoveUndo(deleted.id);
      return true;
    }
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
  if (deleted === null) {
    return false;
  }
  return runRestore(deleted);
}

export function showDayPlanItemRemoveUndoToast(deleted: DeletedDayPlanItem) {
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
        void runRestore(deleted);
      },
    },
  });

  pendingRemoveUndo = {
    deleted,
    expiresAt: Date.now() + DAY_PLAN_ITEM_REMOVE_UNDO_MS,
    toastId,
  };
}
