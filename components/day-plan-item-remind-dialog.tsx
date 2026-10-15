"use client";

import { type FormEvent, useState, useTransition } from "react";

import { scheduleDayPlanItemReminder } from "@/app/(app)/day-plan/reminder-actions";
import { showDayPlanReminderScheduledToast } from "@/components/day-plan-reminder-toast";
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

function defaultRemindTime(item: DayPlanItem) {
  if (item.pendingReminder !== null) {
    return item.pendingReminder.remindTime;
  }
  return item.targetTime ?? "";
}

export function DayPlanItemRemindDialog({
  item,
  planDate,
  open,
  onOpenChange,
}: {
  item: DayPlanItem;
  planDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [remindTime, setRemindTime] = useState(() => defaultRemindTime(item));
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (remindTime === "") {
      setErrorMessage("Pick a time for the reminder.");
      return;
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    startTransition(async () => {
      const result = await scheduleDayPlanItemReminder({
        itemId: item.id,
        planDate,
        remindTime,
        timeZone,
      });

      if (!result.ok) {
        if (result.error === "past") {
          setErrorMessage("Pick a time in the future.");
          return;
        }
        if (result.error === "telegram") {
          setErrorMessage("Telegram is not configured.");
          return;
        }
        setErrorMessage("Could not schedule the reminder. Please try again.");
        return;
      }

      showDayPlanReminderScheduledToast(item.id);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Remind me</DialogTitle>
          </DialogHeader>
          <p className="text-sm font-medium">{item.title}</p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="day-plan-item-remind-time">Time</Label>
            <Input
              id="day-plan-item-remind-time"
              type="time"
              required
              value={remindTime}
              onChange={(event) => setRemindTime(event.target.value)}
            />
          </div>
          {errorMessage !== null ? (
            <p className="text-sm text-destructive">{errorMessage}</p>
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
              {isPending ? "Scheduling…" : "Schedule"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
