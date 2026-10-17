"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function ReadFinishConfirmDialog({
  itemLabel,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: {
  itemLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mark finished?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {itemLabel} has a reminder scheduled that has not been sent yet.
          Marking it finished will cancel that reminder.
        </p>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            No
          </Button>
          <Button
            type="button"
            disabled={isPending === true}
            onClick={onConfirm}
          >
            {isPending === true ? "Saving…" : "Yes, mark finished"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
