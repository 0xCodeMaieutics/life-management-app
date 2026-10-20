"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type DayPlanItem } from "@/lib/day-segments";
import { useTRPC } from "@/trpc/client";

export function DayPlanItemRenameDialog({
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
  const updateTitle = useMutation(
    trpc.dayPlan.updateItemTitle.mutationOptions({
      onSuccess: () => {
        router.refresh();
        onOpenChange(false);
      },
    }),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = new FormData(event.currentTarget).get("title");
    updateTitle.mutate({
      itemId: item.id,
      title: typeof title === "string" ? title : "",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Rename item</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="day-plan-item-rename-title">Title</Label>
            <Input
              id="day-plan-item-rename-title"
              name="title"
              required
              maxLength={200}
              defaultValue={item.title}
              autoFocus
              onFocus={(event) => event.currentTarget.select()}
            />
          </div>
          {updateTitle.error !== null ? (
            <p className="text-sm text-destructive">
              {updateTitle.error.data?.code === "INTERNAL_SERVER_ERROR"
                ? "Could not rename the item"
                : "Invalid title"}
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
            <Button type="submit" disabled={updateTitle.isPending}>
              {updateTitle.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
