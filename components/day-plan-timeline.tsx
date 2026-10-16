"use client";

import {
  Bell,
  CalendarClock,
  CheckSquare,
  Footprints,
  Square,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState, useTransition } from "react";

import {
  copyDayPlanItemToNextDay,
  deleteDayPlanItem,
  duplicateDayPlanItem,
  setDayPlanItemCancelled,
  setDayPlanItemCompleted,
} from "@/app/(app)/day-plan/actions";
import { cancelDayPlanItemReminder } from "@/app/(app)/day-plan/reminder-actions";
import { DayPlanCompleteConfirmDialog } from "@/components/day-plan-complete-confirm-dialog";
import { showDayPlanItemDeletedToast } from "@/components/day-plan-deleted-toast";
import { DayPlanItemCopyNthDayDialog } from "@/components/day-plan-item-copy-nth-day-dialog";
import { DayPlanItemRemindDialog } from "@/components/day-plan-item-remind-dialog";
import { DayPlanItemScheduleDialog } from "@/components/day-plan-item-schedule-dialog";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  dayPlanItemCanScheduleReminder,
  dayPlanItemHasPendingReminder,
  dayPlanItemNeedsCompleteConfirmation,
} from "@/lib/day-plan-item-reminder-ui";
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

export function DayPlanTimeline({
  items,
  planDate,
}: {
  items: DayPlanItem[];
  planDate: string;
}) {
  const itemsByDaySegment = mapDayPlanItemsByDaySegment(items);
  const visibleSegments = DAY_SEGMENT_DISPLAY_ORDER.flatMap((segment) => {
    const segmentItems = itemsByDaySegment.get(segment.id);
    if (segmentItems === undefined || segmentItems.length === 0) {
      return [];
    }
    return [{ segment, items: segmentItems }];
  });
  const orderedItems = visibleSegments.flatMap(
    ({ items: segmentItems }) => segmentItems,
  );

  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isDeleting, startDelete] = useTransition();
  const [isToggling, startToggle] = useTransition();
  const [editingItem, setEditingItem] = useState<DayPlanItem | null>(null);
  const [completeConfirmItem, setCompleteConfirmItem] =
    useState<DayPlanItem | null>(null);

  const requestToggleComplete = useCallback(
    (item: DayPlanItem) => {
      if (item.isStepsLog || item.cancelled) {
        return;
      }

      if (item.completed) {
        startToggle(async () => {
          await setDayPlanItemCompleted(item.id, false);
        });
        return;
      }

      if (dayPlanItemNeedsCompleteConfirmation(item)) {
        setCompleteConfirmItem(item);
        return;
      }

      startToggle(async () => {
        await setDayPlanItemCompleted(item.id, true);
      });
    },
    [startToggle],
  );

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
      if (orderedItems.length === 0 || editingItem !== null) {
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
        requestToggleComplete(item);
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
            showDayPlanItemDeletedToast(result.deleted);
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
  }, [
    clampIndex,
    editingItem,
    isDeleting,
    isToggling,
    orderedItems,
    requestToggleComplete,
    selectedIndex,
  ]);

  if (visibleSegments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Nothing planned yet.</p>
    );
  }

  const selectedId =
    selectedIndex !== null ? orderedItems[selectedIndex]?.id : undefined;

  function selectItem(id: string) {
    const index = orderedItems.findIndex((item) => item.id === id);
    if (index !== -1) {
      setSelectedIndex(index);
    }
  }

  return (
    <div>
      {visibleSegments.map(({ segment, items: segmentItems }, index) => (
        <DayPlanSegmentSection
          key={segment.id}
          segment={segment}
          items={segmentItems}
          isLast={index === visibleSegments.length - 1}
          selectedId={selectedId}
          onSelectItem={selectItem}
          onEditItem={setEditingItem}
          planDate={planDate}
          onRequestToggleComplete={requestToggleComplete}
        />
      ))}
      {completeConfirmItem !== null ? (
        <DayPlanCompleteConfirmDialog
          itemTitle={completeConfirmItem.title}
          open
          isPending={isToggling}
          onOpenChange={(open) => {
            if (!open) {
              setCompleteConfirmItem(null);
            }
          }}
          onConfirm={() => {
            const item = completeConfirmItem;
            startToggle(async () => {
              const result = await setDayPlanItemCompleted(item.id, true);
              if (result.ok) {
                setCompleteConfirmItem(null);
              }
            });
          }}
        />
      ) : null}
      {editingItem !== null ? (
        <DayPlanItemScheduleDialog
          key={editingItem.id}
          item={editingItem}
          planDate={planDate}
          open
          onOpenChange={(open) => {
            if (!open) {
              setEditingItem(null);
            }
          }}
        />
      ) : null}
    </div>
  );
}

function DayPlanSegmentSection({
  segment,
  items,
  isLast,
  selectedId,
  onSelectItem,
  onEditItem,
  planDate,
  onRequestToggleComplete,
}: {
  segment: DaySegmentConfig;
  items: DayPlanItem[];
  isLast: boolean;
  selectedId?: string;
  onSelectItem: (id: string) => void;
  onEditItem: (item: DayPlanItem) => void;
  planDate: string;
  onRequestToggleComplete: (item: DayPlanItem) => void;
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
              planDate={planDate}
              onSelect={() => onSelectItem(item.id)}
              onEdit={() => onEditItem(item)}
              onRequestToggleComplete={onRequestToggleComplete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DayPlanItemRow({
  item,
  planDate,
  selected = false,
  onSelect,
  onEdit,
  onRequestToggleComplete,
}: {
  item: DayPlanItem;
  planDate: string;
  selected?: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onRequestToggleComplete: (item: DayPlanItem) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [remindOpen, setRemindOpen] = useState(false);
  const [copyNthDayOpen, setCopyNthDayOpen] = useState(false);
  const hasPendingReminder = dayPlanItemHasPendingReminder(item);
  const canScheduleReminder = dayPlanItemCanScheduleReminder(item, planDate);

  return (
    <>
      <ContextMenu disabled={item.isStepsLog}>
        <ContextMenuTrigger
          className={cn(
            "-mx-2 flex w-[calc(100%+1rem)] items-center justify-between gap-1.5 rounded-md border border-transparent px-2 py-1 transition-colors",
            selected && "border-primary/50 bg-muted/30",
          )}
          onClick={onSelect}
        >
          <div className="flex flex-col">
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              {item.isStepsLog ? (
                <Footprints
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-label="Steps log"
                />
              ) : (
                <button
                  type="button"
                  className="shrink-0 rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
                  disabled={isPending || item.cancelled}
                  aria-label={
                    item.cancelled
                      ? `${item.title} is cancelled`
                      : item.completed
                        ? `Mark ${item.title} incomplete`
                        : `Mark ${item.title} complete`
                  }
                  onClick={(event) => {
                    event.stopPropagation();
                    onRequestToggleComplete(item);
                  }}
                >
                  {item.completed ? (
                    <CheckSquare className="size-4 shrink-0 stroke-primary text-primary" />
                  ) : (
                    <Square
                      className={cn(
                        "size-4 shrink-0",
                        item.cancelled
                          ? "stroke-destructive/70 text-destructive/70"
                          : "stroke-muted-foreground",
                      )}
                    />
                  )}
                </button>
              )}
              <p
                className={cn(
                  "text-sm leading-tight font-medium",
                  item.completed &&
                    !item.isStepsLog &&
                    "text-muted-foreground line-through",
                  item.cancelled &&
                    !item.isStepsLog &&
                    "text-destructive/80 line-through",
                )}
              >
                {item.title}
              </p>
              {hasPendingReminder ? (
                <Bell
                  className="size-3.5 shrink-0 text-muted-foreground"
                  aria-label="Reminder scheduled"
                />
              ) : null}
            </div>
            {item.targetTime !== null ? (
              <span
                className={cn(
                  "ml-6 text-xs leading-tight",
                  item.cancelled
                    ? "text-destructive/65"
                    : "text-muted-foreground",
                )}
              >
                {formatTargetTimeForDisplay(item.targetTime)}
              </span>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Change date and time of ${item.title}`}
              disabled={isPending}
              onClick={(event) => {
                event.stopPropagation();
                onEdit();
              }}
            >
              <CalendarClock />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              aria-label={`Delete ${item.title}`}
              disabled={isPending}
              onClick={(event) => {
                event.stopPropagation();
                startTransition(async () => {
                  const result = await deleteDayPlanItem(item.id);
                  if (result.ok) {
                    showDayPlanItemDeletedToast(result.deleted);
                  }
                });
              }}
            >
              <Trash2 />
            </Button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {canScheduleReminder ? (
            <ContextMenuItem onClick={() => setRemindOpen(true)}>
              Remind me
            </ContextMenuItem>
          ) : null}
          {item.cancelled ? (
            <ContextMenuItem
              disabled={isPending}
              onClick={() => {
                startTransition(async () => {
                  await setDayPlanItemCancelled(item.id, false);
                });
              }}
            >
              Restore item
            </ContextMenuItem>
          ) : null}
          <ContextMenuItem
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await duplicateDayPlanItem(item.id);
              });
            }}
          >
            Duplicate item
          </ContextMenuItem>
          <ContextMenuItem
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await copyDayPlanItemToNextDay(item.id);
              });
            }}
          >
            Copy on the next day
          </ContextMenuItem>
          <ContextMenuItem
            disabled={isPending}
            onClick={() => setCopyNthDayOpen(true)}
          >
            Copy on the n-th day
          </ContextMenuItem>
          {hasPendingReminder || (!item.cancelled && !item.completed) ? (
            <>
              <ContextMenuSeparator />
              {hasPendingReminder ? (
                <ContextMenuItem
                  variant="destructive"
                  onClick={() => {
                    startTransition(async () => {
                      await cancelDayPlanItemReminder(item.id);
                    });
                  }}
                >
                  Cancel reminder
                </ContextMenuItem>
              ) : null}
              {!item.cancelled && !item.completed ? (
                <ContextMenuItem
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      await setDayPlanItemCancelled(item.id, true);
                    });
                  }}
                >
                  Cancel item
                </ContextMenuItem>
              ) : null}
            </>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>
      {remindOpen ? (
        <DayPlanItemRemindDialog
          key={item.id}
          item={item}
          planDate={planDate}
          open
          onOpenChange={setRemindOpen}
        />
      ) : null}
      {copyNthDayOpen ? (
        <DayPlanItemCopyNthDayDialog
          key={`${item.id}-copy-nth`}
          item={item}
          open
          onOpenChange={setCopyNthDayOpen}
        />
      ) : null}
    </>
  );
}
