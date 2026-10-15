"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";

import {
  createDayPlanItem,
  type DayPlanItemActionState,
} from "@/app/(app)/day-plan/actions";
import { TargetTimeDaySegmentPicker } from "@/components/target-time-day-segment-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: DayPlanItemActionState = { errorMessage: null };

export function DayPlanItemCreateDialog({ planDate }: { planDate: string }) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [targetTime, setTargetTime] = useState("");
  const [state, formAction, isPending] = useActionState(
    async (previousState: DayPlanItemActionState, formData: FormData) => {
      const result = await createDayPlanItem(previousState, formData);
      if (result.errorMessage === null) {
        setOpen(false);
      }
      return result;
    },
    initialState,
  );

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setFormKey((key) => key + 1);
      setTargetTime("");
    }
    setOpen(nextOpen);
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => handleOpenChange(true)}
      >
        <Plus />
        Add item
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <form
            key={formKey}
            action={formAction}
            className="flex flex-col gap-4"
          >
            <input type="hidden" name="planDate" value={planDate} />
            <DialogHeader>
              <DialogTitle>New day plan item</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="day-plan-item-title">Title</Label>
              <Input
                id="day-plan-item-title"
                name="title"
                required
                maxLength={200}
                placeholder="Morning stretch"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="day-plan-item-target-time">
                Target time (optional)
              </Label>
              <Input
                id="day-plan-item-target-time"
                name="targetTime"
                type="time"
                value={targetTime}
                onChange={(event) => setTargetTime(event.target.value)}
              />
              <TargetTimeDaySegmentPicker
                targetTime={targetTime}
                onTargetTimeChange={setTargetTime}
              />
            </div>
            {state.errorMessage !== null ? (
              <p className="text-sm text-destructive">{state.errorMessage}</p>
            ) : null}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding…" : "Add item"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
