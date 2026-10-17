"use client";

import { type FormEvent, useState, useTransition } from "react";

import { scheduleReadReminder } from "@/app/(app)/later-reads/reminder-actions";
import { showReadReminderScheduledToast } from "@/components/read-reminder-toast";
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
import { readReminderDayOffsetSchema } from "@/lib/read-reminder-schedule";
import {
  type ReadWithReminder,
  readRemindDialogDefaults,
  readRemindDialogLabel,
} from "@/lib/read-reminder-ui";

function parseDayOffsetInput(value: string) {
  const trimmed = value.trim();
  if (trimmed === "") {
    return { ok: false as const, error: "Enter a day number." };
  }

  const parsed = Number(trimmed);
  const result = readReminderDayOffsetSchema.safeParse(parsed);
  if (!result.success) {
    if (!Number.isInteger(parsed)) {
      return { ok: false as const, error: "Enter a whole number." };
    }
    return {
      ok: false as const,
      error: "Enter at least 1 day from today.",
    };
  }

  return { ok: true as const, dayOffset: result.data };
}

export function ReadRemindDialog({
  read,
  open,
  onOpenChange,
}: {
  read: ReadWithReminder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const defaults = readRemindDialogDefaults(read);
  const [remindTime, setRemindTime] = useState(() => defaults.remindTime);
  const [notToday, setNotToday] = useState(() => defaults.notToday);
  const [dayOffsetInput, setDayOffsetInput] = useState(
    () => defaults.dayOffset,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (remindTime === "") {
      setErrorMessage("Pick a time for the reminder.");
      return;
    }

    let dayOffset = 1;
    if (notToday) {
      const parsed = parseDayOffsetInput(dayOffsetInput);
      if (!parsed.ok) {
        setErrorMessage(parsed.error);
        return;
      }
      dayOffset = parsed.dayOffset;
    }

    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    startTransition(async () => {
      const result = await scheduleReadReminder({
        readId: read.id,
        remindTime,
        timeZone,
        notToday,
        dayOffset,
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

      showReadReminderScheduledToast(read.id);
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
          <p className="text-sm font-medium">{readRemindDialogLabel(read)}</p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="read-remind-time">Time</Label>
            <Input
              id="read-remind-time"
              type="time"
              required
              value={remindTime}
              onChange={(event) => setRemindTime(event.target.value)}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              className="size-4 rounded border-input"
              checked={notToday}
              onChange={(event) => setNotToday(event.target.checked)}
            />
            <span className="text-sm font-medium">Not today?</span>
          </label>
          {notToday ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="read-remind-day-offset">Days from today</Label>
              <Input
                id="read-remind-day-offset"
                type="number"
                inputMode="numeric"
                min={1}
                required
                value={dayOffsetInput}
                onChange={(event) => setDayOffsetInput(event.target.value)}
              />
            </div>
          ) : null}
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
