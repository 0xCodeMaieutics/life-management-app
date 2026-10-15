"use client";

import { Button } from "@/components/ui/button";
import {
  TIMED_DAY_SEGMENTS,
  getTimedDaySegmentFromTargetTime,
  type TimedDaySegmentId,
} from "@/lib/day-segments";
import { normalizeTargetTime, type TargetTime } from "@/lib/target-time";
import { cn } from "@/lib/utils";

export function TargetTimeDaySegmentPicker({
  targetTime,
  onTargetTimeChange,
}: {
  targetTime: string;
  onTargetTimeChange: (targetTime: TargetTime) => void;
}) {
  const normalizedTargetTime = normalizeTargetTime(targetTime);
  const selectedSegmentId =
    normalizedTargetTime === null
      ? null
      : getTimedDaySegmentFromTargetTime(normalizedTargetTime);

  function handleSegmentClick(segmentId: TimedDaySegmentId) {
    if (segmentId === selectedSegmentId) {
      return;
    }

    const segment = TIMED_DAY_SEGMENTS.find((item) => item.id === segmentId);
    if (segment?.targetTime === undefined) {
      return;
    }

    onTargetTimeChange(segment.targetTime);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {TIMED_DAY_SEGMENTS.map((segment) => {
        const isSelected = segment.id === selectedSegmentId;
        const Icon = segment.icon;

        return (
          <Button
            key={segment.id}
            type="button"
            variant="outline"
            size="sm"
            aria-label={segment.label}
            aria-pressed={isSelected}
            className={cn(isSelected && segment.nodeClassName)}
            onClick={() => handleSegmentClick(segment.id as TimedDaySegmentId)}
          >
            <Icon
              className={cn("size-4", !isSelected && segment.iconClassName)}
              aria-hidden
            />
            <span className="hidden sm:inline">{segment.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
