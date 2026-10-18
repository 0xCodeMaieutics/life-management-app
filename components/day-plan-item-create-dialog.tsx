"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { DayPlanItemReferenceFields } from "@/components/day-plan-item-reference-fields";
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
import { dayPlanItemReferenceInputFromFormData } from "@/lib/day-plan-item-reference";
import { useTRPC } from "@/trpc/client";

export function DayPlanItemCreateDialog({ planDate }: { planDate: string }) {
  const trpc = useTRPC();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [targetTime, setTargetTime] = useState("");
  const createDayPlanItem = useMutation(
    trpc.dayPlan.createItem.mutationOptions({
      onSuccess: () => {
        router.refresh();
        setOpen(false);
      },
    }),
  );

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setFormKey((key) => key + 1);
      setTargetTime("");
      createDayPlanItem.reset();
    }
    setOpen(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const title = formData.get("title");
    createDayPlanItem.mutate({
      planDate,
      title: typeof title === "string" ? title : "",
      targetTime: targetTime === "" ? null : targetTime,
      reference: dayPlanItemReferenceInputFromFormData(formData),
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
        <Plus />
        Add item
      </Button>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <form
            key={formKey}
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
          >
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
            <DayPlanItemReferenceFields defaultReference={null} />
            {createDayPlanItem.error !== null ? (
              <p className="text-sm text-destructive">
                {createDayPlanItem.error.data?.code === "BAD_REQUEST"
                  ? "Invalid day plan item"
                  : "Could not create day plan item"}
              </p>
            ) : null}
            <Button type="submit" disabled={createDayPlanItem.isPending}>
              {createDayPlanItem.isPending ? "Adding…" : "Add item"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
