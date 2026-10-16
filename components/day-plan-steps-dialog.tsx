"use client";

import { Footprints } from "lucide-react";
import { type FormEvent, useState, useTransition } from "react";

import { createCompletedStepsDayPlanItem } from "@/app/(app)/day-plan/actions";
import { TargetTimeDaySegmentPicker } from "@/components/target-time-day-segment-picker";
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

function currentLocalTargetTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

export function DayPlanStepsTrigger({ planDate }: { planDate: string }) {
  const [open, setOpen] = useState(false);
  const [steps, setSteps] = useState("");
  const [targetTime, setTargetTime] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setSteps("");
      setTargetTime(currentLocalTargetTime());
      setErrorMessage(null);
    }
    setOpen(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedSteps = Number(steps);
    if (!Number.isInteger(parsedSteps) || parsedSteps < 1) {
      setErrorMessage("Enter a valid step count.");
      return;
    }
    if (targetTime === "") {
      setErrorMessage("Choose a time.");
      return;
    }

    startTransition(async () => {
      const result = await createCompletedStepsDayPlanItem(
        planDate,
        parsedSteps,
        targetTime,
      );
      if (!result.ok) {
        setErrorMessage("Could not add steps. Please try again.");
        return;
      }
      setOpen(false);
    });
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleOpenChange(true)}
      >
        <Footprints />
        Steps
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Add completed steps</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="day-plan-steps-count">Steps</Label>
              <Input
                id="day-plan-steps-count"
                type="number"
                inputMode="numeric"
                min={1}
                required
                value={steps}
                onChange={(event) => setSteps(event.target.value)}
                placeholder="5000"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="day-plan-steps-time">Time</Label>
              <Input
                id="day-plan-steps-time"
                type="time"
                required
                value={targetTime}
                onChange={(event) => setTargetTime(event.target.value)}
              />
              <TargetTimeDaySegmentPicker
                targetTime={targetTime}
                onTargetTimeChange={setTargetTime}
              />
            </div>
            {errorMessage !== null ? (
              <p className="text-sm text-destructive">{errorMessage}</p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Adding…" : "Add steps"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
