"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";

import {
  deleteDayPlanItem,
  setDayPlanItemCompleted,
} from "@/app/(app)/day-plan/actions";
import { Button } from "@/components/ui/button";
import {
  DAY_SEGMENT_DISPLAY_ORDER,
  groupDayPlanItemsBySegment,
  type DayPlanItemForGrouping,
} from "@/lib/day-segments";
import { cn } from "@/lib/utils";

export function DayPlanTimeline({
  items,
}: {
  items: DayPlanItemForGrouping[];
}) {
  const grouped = groupDayPlanItemsBySegment(items);
  const visibleSegments = DAY_SEGMENT_DISPLAY_ORDER.flatMap((segment) => {
    const segmentItems = grouped.get(segment.id);
    return segmentItems?.length
      ? [{ segment, items: segmentItems }]
      : [];
  });

  if (visibleSegments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No items on this plan.</p>
    );
  }

  return (
    <div>
      {visibleSegments.map(({ segment, items: segmentItems }, index) => {
        const Icon = segment.icon;
        const isLast = index === visibleSegments.length - 1;

        return (
          <div key={segment.id} className="relative flex gap-2 pb-6 last:pb-0">
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
              <Icon className={cn("size-4", segment.iconClassName)} />
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
              <p className="text-sm font-semibold text-muted-foreground">
                {segment.label}
              </p>
              <ul className="flex flex-col gap-3">
                {segmentItems.map((item) => (
                  <DayPlanItemRow key={item.id} item={item} />
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DayPlanItemRow({ item }: { item: DayPlanItemForGrouping }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border p-2",
        item.completed && "opacity-70",
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <input
          type="checkbox"
          className="mt-1 size-4 rounded border-input"
          checked={item.completed}
          disabled={isPending}
          onChange={(event) => {
            startTransition(async () => {
              await setDayPlanItemCompleted(item.id, event.target.checked);
            });
          }}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <span
            className={cn(
              "text-sm font-medium",
              item.completed && "text-muted-foreground line-through",
            )}
          >
            {item.title}
          </span>
          {item.targetTime ? (
            <span className="text-xs text-muted-foreground">
              {item.targetTime}
            </span>
          ) : null}
        </div>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label={`Remove ${item.title}`}
        disabled={isPending}
        onClick={() => {
          startTransition(async () => {
            await deleteDayPlanItem(item.id);
          });
        }}
      >
        <Trash2 />
      </Button>
    </li>
  );
}
