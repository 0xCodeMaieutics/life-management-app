"use client";

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
import {
  FOLLOW_UP_DURATION_PRESETS,
  type FollowUp,
  MAX_FOLLOW_UP_MINUTES,
  formatFollowUpDuration,
} from "@/lib/follow-up";

export function FollowUpDialog({
  title,
  followUp,
  open,
  isPending,
  errorMessage,
  onOpenChange,
  onSave,
}: {
  title: string;
  followUp: FollowUp | null;
  open: boolean;
  isPending: boolean;
  errorMessage: string | null;
  onOpenChange: (open: boolean) => void;
  onSave: (followUp: FollowUp | null) => void;
}) {
  const [hours, setHours] = useState(() =>
    followUp === null ? "1" : String(Math.floor(followUp.minutes / 60)),
  );
  const [minutes, setMinutes] = useState(() =>
    followUp === null ? "0" : String(followUp.minutes % 60),
  );
  const [message, setMessage] = useState(followUp?.message ?? "");
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );

  function selectPreset(totalMinutes: number) {
    setHours(String(Math.floor(totalMinutes / 60)));
    setMinutes(String(totalMinutes % 60));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const totalMinutes = Number(hours) * 60 + Number(minutes);
    if (
      !Number.isInteger(totalMinutes) ||
      totalMinutes < 1 ||
      totalMinutes > MAX_FOLLOW_UP_MINUTES
    ) {
      setValidationMessage("Pick a duration from 1 minute to 7 days.");
      return;
    }
    if (message.trim() === "") {
      setValidationMessage("Write the follow-up message.");
      return;
    }
    setValidationMessage(null);
    onSave({ minutes: totalMinutes, message: message.trim() });
  }

  const shownError = validationMessage ?? errorMessage;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Follow-up</DialogTitle>
          </DialogHeader>
          <p className="text-sm font-medium">{title}</p>
          <div className="flex flex-col gap-2">
            <Label>After completion</Label>
            <div className="flex flex-wrap gap-1.5">
              {FOLLOW_UP_DURATION_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => selectPreset(preset)}
                >
                  {formatFollowUpDuration(preset)}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                id="follow-up-hours"
                type="number"
                min={0}
                max={MAX_FOLLOW_UP_MINUTES / 60}
                aria-label="Hours"
                className="w-20"
                value={hours}
                onChange={(event) => setHours(event.target.value)}
              />
              <span className="text-sm text-muted-foreground">h</span>
              <Input
                id="follow-up-minutes"
                type="number"
                min={0}
                max={59}
                aria-label="Minutes"
                className="w-20"
                value={minutes}
                onChange={(event) => setMinutes(event.target.value)}
              />
              <span className="text-sm text-muted-foreground">min</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="follow-up-message">Message</Label>
            <Input
              id="follow-up-message"
              required
              maxLength={500}
              placeholder="Liver is now ready to be cooked."
              value={message}
              onChange={(event) => setMessage(event.target.value)}
            />
          </div>
          {shownError !== null ? (
            <p className="text-sm text-destructive">{shownError}</p>
          ) : null}
          <DialogFooter>
            {followUp !== null ? (
              <Button
                type="button"
                variant="destructive"
                className="sm:mr-auto"
                disabled={isPending}
                onClick={() => onSave(null)}
              >
                Remove
              </Button>
            ) : null}
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
