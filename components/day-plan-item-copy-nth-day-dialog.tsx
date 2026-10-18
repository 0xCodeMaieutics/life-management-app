"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

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

const MIN_DAY_OFFSET = 1;
const MAX_DAY_OFFSET = 120;

function parseDayOffset(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") {
    return { ok: false as const, error: "Enter a day number." };
  }

  const parsed = Number(trimmed);
  if (!Number.isInteger(parsed)) {
    return { ok: false as const, error: "Enter a whole number." };
  }

  if (parsed < MIN_DAY_OFFSET || parsed > MAX_DAY_OFFSET) {
    return {
      ok: false as const,
      error: `Enter a number from ${MIN_DAY_OFFSET} to ${MAX_DAY_OFFSET}.`,
    };
  }

  return { ok: true as const, dayOffset: parsed };
}

export function DayPlanItemCopyNthDayDialog({
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
  const [dayOffsetInput, setDayOffsetInput] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const copyToNthDay = useMutation(
    trpc.dayPlan.copyItemToNthDay.mutationOptions({
      onSuccess: () => {
        router.refresh();
        handleOpenChange(false);
      },
      onError: () =>
        setErrorMessage("Could not copy the item. Please try again."),
    }),
  );

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setDayOffsetInput("");
      setErrorMessage(null);
    }
    onOpenChange(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = parseDayOffset(dayOffsetInput);
    if (!parsed.ok) {
      setErrorMessage(parsed.error);
      return;
    }

    setErrorMessage(null);
    copyToNthDay.mutate({ itemId: item.id, dayOffset: parsed.dayOffset });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Copy on the n-th day</DialogTitle>
          </DialogHeader>
          <p className="text-sm font-medium">{item.title}</p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="day-plan-item-copy-nth-day">Day</Label>
            <Input
              id="day-plan-item-copy-nth-day"
              type="number"
              inputMode="numeric"
              min={MIN_DAY_OFFSET}
              max={MAX_DAY_OFFSET}
              required
              value={dayOffsetInput}
              onChange={(event) => setDayOffsetInput(event.target.value)}
              placeholder={`${MIN_DAY_OFFSET}–${MAX_DAY_OFFSET}`}
            />
            <p className="text-xs text-muted-foreground">
              Days after this item&apos;s plan date ({MIN_DAY_OFFSET}–
              {MAX_DAY_OFFSET}). The item stays on this day; a copy is added on
              that day.
            </p>
          </div>
          {errorMessage !== null ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={copyToNthDay.isPending}>
              {copyToNthDay.isPending ? "Copying…" : "Copy"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
