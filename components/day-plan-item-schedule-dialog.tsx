"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

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
import { type DayPlanItem } from "@/lib/day-segments";
import { isValidPlanDateString } from "@/lib/plan-date";
import { useTRPC } from "@/trpc/client";

export function DayPlanItemScheduleDialog({
  item,
  planDate: initialPlanDate,
  open,
  onOpenChange,
}: {
  item: DayPlanItem;
  planDate: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const [planDate, setPlanDate] = useState(initialPlanDate);
  const [targetTime, setTargetTime] = useState(item.targetTime ?? "");
  const updateSchedule = useMutation(
    trpc.dayPlan.updateItemSchedule.mutationOptions({
      onSuccess: () => {
        router.refresh();
        onOpenChange(false);
      },
    }),
  );

  const isPlanDateValid = isValidPlanDateString(planDate);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isPlanDateValid) {
      return;
    }

    updateSchedule.mutate({
      itemId: item.id,
      planDate,
      targetTime: targetTime === "" ? null : targetTime,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Change date and time</DialogTitle>
          </DialogHeader>
          <p className="text-sm font-medium">{item.title}</p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="day-plan-item-date">Date</Label>
            <Input
              id="day-plan-item-date"
              type="date"
              required
              value={planDate}
              onChange={(event) => setPlanDate(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="day-plan-item-target-time">Target time</Label>
            <Input
              id="day-plan-item-target-time"
              type="time"
              value={targetTime}
              onChange={(event) => setTargetTime(event.target.value)}
            />
            <TargetTimeDaySegmentPicker
              targetTime={targetTime}
              onTargetTimeChange={setTargetTime}
            />
          </div>
          {updateSchedule.error !== null ? (
            <p className="text-sm text-destructive">
              Could not update the item. Please try again.
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
            <Button
              type="submit"
              disabled={updateSchedule.isPending || !isPlanDateValid}
            >
              {updateSchedule.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
