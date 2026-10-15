"use client";

import { CheckSquare, Trash2 } from "lucide-react";
import { useTransition } from "react";

import {
  deleteDayPlanItem,
  setDayPlanItemCompleted,
} from "@/app/(app)/day-plan/actions";
import { Button } from "@/components/ui/button";
import {
  DAY_SEGMENT_DISPLAY_ORDER,
  groupDayPlanItemsBySegment,
  type DayPlanItemForGrouping,
  type DaySegmentConfig,
} from "@/lib/day-segments";
import { formatTargetTimeForDisplay } from "@/lib/target-time";
import { cn } from "@/lib/utils";

export function DayPlanTimeline({
  items,
}: {
  items: DayPlanItemForGrouping[];
}) {
  const grouped = groupDayPlanItemsBySegment(items);
  const visibleSegments = DAY_SEGMENT_DISPLAY_ORDER.flatMap((segment) => {
    const segmentItems = grouped.get(segment.id);
    if (segmentItems === undefined || segmentItems.length === 0) {
      return [];
    }
    return [{ segment, items: segmentItems }];
  });

  if (visibleSegments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nothing planned yet.</p>
    );
  }

  return (
    <div>
      {visibleSegments.map(({ segment, items: segmentItems }, index) => (
        <DayPlanSegmentSection
          key={segment.id}
          segment={segment}
          items={segmentItems}
          isLast={index === visibleSegments.length - 1}
        />
      ))}
    </div>
  );
}

function DayPlanSegmentSection({
  segment,
  items,
  isLast,
}: {
  segment: DaySegmentConfig;
  items: DayPlanItemForGrouping[];
  isLast: boolean;
}) {
  const Icon = segment.icon;

  return (
    <div className="relative flex gap-2 pb-6 last:pb-0">
      {!isLast ? (
        <div
          className="absolute top-8 bottom-0 left-4 w-px -translate-x-1/2 bg-border"
          aria-hidden
        />
      ) : null}
      <div
        className={cn(
          "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border",
          segment.nodeClassName,
        )}
      >
        <Icon className="size-4" />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
        <p className="text-sm font-semibold text-muted-foreground">
          {segment.label}
        </p>
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <DayPlanItemRow key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayPlanItemRow({ item }: { item: DayPlanItemForGrouping }) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center justify-between gap-1.5">
      <div className="flex flex-col">
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <button
            type="button"
            className="shrink-0 rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
            disabled={isPending}
            aria-label={
              item.completed
                ? `Mark ${item.title} incomplete`
                : `Mark ${item.title} complete`
            }
            onClick={() => {
              startTransition(async () => {
                await setDayPlanItemCompleted(item.id, !item.completed);
              });
            }}
          >
            <CheckSquare
              className={cn(
                "size-4 shrink-0",
                item.completed
                  ? "fill-primary stroke-primary"
                  : "stroke-muted-foreground",
              )}
            />
          </button>
          <p
            className={cn(
              "text-sm leading-tight font-medium",
              item.completed && "text-muted-foreground line-through",
            )}
          >
            {item.title}
          </p>
        </div>
        {item.targetTime !== null ? (
          <span className="ml-6 text-xs leading-tight text-muted-foreground">
            {formatTargetTimeForDisplay(item.targetTime)}
          </span>
        ) : null}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={`Delete ${item.title}`}
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            await deleteDayPlanItem(item.id);
          });
        }}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
