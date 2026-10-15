"use client";

import { CheckSquare, Square, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import {
  deleteDayPlanItem,
  setDayPlanItemCompleted,
} from "@/app/(app)/day-plan/actions";
import { Button } from "@/components/ui/button";
import {
  DAY_SEGMENT_DISPLAY_ORDER,
  mapDayPlanItemsByDaySegment,
  type DayPlanItem,
  type DaySegmentConfig,
} from "@/lib/day-segments";
import { formatTargetTimeForDisplay } from "@/lib/target-time";
import { cn } from "@/lib/utils";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function DayPlanTimeline({ items }: { items: DayPlanItem[] }) {
  const itemsByDaySegment = mapDayPlanItemsByDaySegment(items);
  const visibleSegments = DAY_SEGMENT_DISPLAY_ORDER.flatMap((segment) => {
    const segmentItems = itemsByDaySegment.get(segment.id);
    if (segmentItems === undefined || segmentItems.length === 0) {
      return [];
    }
    return [{ segment, items: segmentItems }];
  });
  const orderedItems = visibleSegments.flatMap(({ items: segmentItems }) =>
    segmentItems,
  );

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [isToggling, startToggle] = useTransition();

  const clampIndex = useCallback(
    (index: number) => Math.max(0, Math.min(index, orderedItems.length - 1)),
    [orderedItems.length],
  );

  useEffect(() => {
    if (selectedIndex === null) {
      return;
    }
    if (orderedItems.length === 0) {
      setSelectedIndex(null);
      return;
    }
    if (selectedIndex >= orderedItems.length) {
      setSelectedIndex(orderedItems.length - 1);
    }
  }, [orderedItems.length, selectedIndex]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (orderedItems.length === 0) {
        return;
      }

      if (event.key === "Escape") {
        if (selectedIndex !== null) {
          event.preventDefault();
          setSelectedIndex(null);
        }
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) => {
          if (current === null) {
            return 0;
          }
          return clampIndex(current + 1);
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) => {
          if (current === null) {
            return orderedItems.length - 1;
          }
          return clampIndex(current - 1);
        });
        return;
      }

      if (
        event.key === "Enter" &&
        selectedIndex !== null &&
        !isToggling &&
        !isDeleting
      ) {
        event.preventDefault();
        const item = orderedItems[selectedIndex];
        if (item === undefined) {
          return;
        }
        startToggle(async () => {
          await setDayPlanItemCompleted(item.id, !item.completed);
        });
        return;
      }

      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        selectedIndex !== null &&
        !isDeleting
      ) {
        event.preventDefault();
        const item = orderedItems[selectedIndex];
        if (item === undefined) {
          return;
        }
        const indexToRemove = selectedIndex;
        startDelete(async () => {
          const result = await deleteDayPlanItem(item.id);
          if (result.ok) {
            setSelectedIndex((current) => {
              if (current === null) {
                return null;
              }
              const nextLength = orderedItems.length - 1;
              if (nextLength === 0) {
                return null;
              }
              if (indexToRemove >= nextLength) {
                return nextLength - 1;
              }
              return indexToRemove;
            });
          }
        });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clampIndex, isDeleting, isToggling, orderedItems, selectedIndex]);

  if (visibleSegments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nothing planned yet.</p>
    );
  }

  const selectedId =
    selectedIndex !== null ? orderedItems[selectedIndex]?.id : undefined;

  return (
    <div>
      {visibleSegments.map(({ segment, items: segmentItems }, index) => (
        <DayPlanSegmentSection
          key={segment.id}
          segment={segment}
          items={segmentItems}
          isLast={index === visibleSegments.length - 1}
          selectedId={selectedId}
        />
      ))}
    </div>
  );
}

function DayPlanSegmentSection({
  segment,
  items,
  isLast,
  selectedId,
}: {
  segment: DaySegmentConfig;
  items: DayPlanItem[];
  isLast: boolean;
  selectedId?: string;
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
            <DayPlanItemRow
              key={item.id}
              item={item}
              selected={item.id === selectedId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayPlanItemRow({
  item,
  selected = false,
}: {
  item: DayPlanItem;
  selected?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-1.5 rounded-md border border-transparent px-2 py-1 -mx-2 transition-colors",
        selected && "border-primary/50 bg-muted/30",
      )}
    >
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
            {item.completed ? (
              <CheckSquare className="size-4 shrink-0 stroke-primary text-primary" />
            ) : (
              <Square className="size-4 shrink-0 stroke-muted-foreground" />
            )}
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
