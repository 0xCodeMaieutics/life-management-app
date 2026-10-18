"use client";

import { useActionState } from "react";

import {
  type DayPlanItemActionState,
  updateDayPlanItemReference,
} from "@/app/(app)/day-plan/actions";
import { DayPlanItemReferenceFields } from "@/components/day-plan-item-reference-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { type DayPlanItem } from "@/lib/day-segments";

const initialState: DayPlanItemActionState = { errorMessage: null };

export function DayPlanItemReferenceDialog({
  item,
  open,
  onOpenChange,
}: {
  item: DayPlanItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [state, formAction, isPending] = useActionState(
    async (previousState: DayPlanItemActionState, formData: FormData) => {
      const result = await updateDayPlanItemReference(previousState, formData);
      if (result.errorMessage === null) {
        onOpenChange(false);
      }
      return result;
    },
    initialState,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="itemId" value={item.id} />
          <DialogHeader>
            <DialogTitle>Edit reference</DialogTitle>
          </DialogHeader>
          <p className="text-sm font-medium">{item.title}</p>
          <DayPlanItemReferenceFields defaultReference={item.reference} />
          {state.errorMessage !== null ? (
            <p className="text-sm text-destructive">{state.errorMessage}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
