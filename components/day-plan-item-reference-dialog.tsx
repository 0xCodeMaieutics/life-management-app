"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent } from "react";

import { DayPlanItemReferenceFields } from "@/components/day-plan-item-reference-fields";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { dayPlanItemReferenceInputFromFormData } from "@/lib/day-plan-item-reference";
import { type DayPlanItem } from "@/lib/day-segments";
import { useTRPC } from "@/trpc/client";

export function DayPlanItemReferenceDialog({
  item,
  open,
  onOpenChange,
}: {
  item: DayPlanItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const updateReference = useMutation(
    trpc.dayPlan.updateItemReference.mutationOptions({
      onSuccess: () => {
        router.refresh();
        onOpenChange(false);
      },
    }),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateReference.mutate({
      itemId: item.id,
      reference: dayPlanItemReferenceInputFromFormData(
        new FormData(event.currentTarget),
      ),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Edit reference</DialogTitle>
          </DialogHeader>
          <p className="text-sm font-medium">{item.title}</p>
          <DayPlanItemReferenceFields defaultReference={item.reference} />
          {updateReference.error !== null ? (
            <p className="text-sm text-destructive">
              {updateReference.error.data?.code === "INTERNAL_SERVER_ERROR"
                ? "Could not update the reference"
                : "Invalid reference"}
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateReference.isPending}>
              {updateReference.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
