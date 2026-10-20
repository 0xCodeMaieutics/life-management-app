"use client";

import { useMutation } from "@tanstack/react-query";
import {
  Ban,
  Bell,
  BellOff,
  CalendarClock,
  CalendarPlus,
  CalendarRange,
  CheckSquare,
  Copy,
  ExternalLink,
  Footprints,
  Link2,
  Link2Off,
  MessagesSquare,
  Pencil,
  RotateCcw,
  Square,
  Timer,
  TimerOff,
  Trash2,
  Type,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";

import { DayPlanCompleteConfirmDialog } from "@/components/day-plan-complete-confirm-dialog";
import { showDayPlanItemDeletedToast } from "@/components/day-plan-deleted-toast";
import { showDayPlanFollowUpScheduledToast } from "@/components/day-plan-follow-up-toast";
import { DayPlanItemCopyNthDayDialog } from "@/components/day-plan-item-copy-nth-day-dialog";
import { DayPlanItemLinkThreadDialog } from "@/components/day-plan-item-link-thread-dialog";
import { DayPlanItemReferenceDialog } from "@/components/day-plan-item-reference-dialog";
import { DayPlanItemReferenceLink } from "@/components/day-plan-item-reference-link";
import { DayPlanItemRemindDialog } from "@/components/day-plan-item-remind-dialog";
import { DayPlanItemRenameDialog } from "@/components/day-plan-item-rename-dialog";
import { DayPlanItemScheduleDialog } from "@/components/day-plan-item-schedule-dialog";
import { FollowUpDialog } from "@/components/follow-up-dialog";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { showDayPlanItemCopiedToNextDayToast } from "@/lib/day-plan-item-copy-undo";
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
import { formatFollowUpDuration, formatFollowUpSendAt } from "@/lib/follow-up";
import { formatTargetTimeForDisplay } from "@/lib/target-time";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

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
  highlightItemId,
}: {
  items: DayPlanItem[];
  planDate: string;
  highlightItemId?: string;
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

  const trpc = useTRPC();
  const router = useRouter();
  const [selectedIndex, setSelectedIndex] = useState<number | null>(() => {
    if (highlightItemId === undefined) {
      return null;
    }
    const index = orderedItems.findIndex((item) => item.id === highlightItemId);
    return index === -1 ? null : index;
  });
  const { mutate: deleteItem, isPending: isDeleting } = useMutation(
    trpc.dayPlan.deleteItem.mutationOptions({
      onSuccess: ({ deleted }) => {
        router.refresh();
        showDayPlanItemDeletedToast(deleted, () => router.refresh());
      },
    }),
  );
  const { mutate: setItemCompleted, isPending: isToggling } = useMutation(
    trpc.dayPlan.setItemCompleted.mutationOptions({
      onSuccess: ({ followUpSendAt, hasFollowUpFailed }, { itemId }) => {
        router.refresh();
        if (followUpSendAt !== null) {
          showDayPlanFollowUpScheduledToast(itemId, followUpSendAt, () =>
            router.refresh(),
          );
        }
        if (hasFollowUpFailed) {
          toast.error("Could not schedule the follow-up");
        }
      },
    }),
  );
  const [editingItem, setEditingItem] = useState<DayPlanItem | null>(null);
  const [completeConfirmItem, setCompleteConfirmItem] =
    useState<DayPlanItem | null>(null);

  const requestToggleComplete = useCallback(
    (item: DayPlanItem) => {
      if (item.isStepsLog || item.cancelled) {
        return;
      }

      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      if (item.completed) {
        setItemCompleted({ itemId: item.id, completed: false, timeZone });
        return;
      }

      if (dayPlanItemNeedsCompleteConfirmation(item)) {
        setCompleteConfirmItem(item);
        return;
      }

      setItemCompleted({ itemId: item.id, completed: true, timeZone });
    },
    [setItemCompleted],
  );

  const clampIndex = useCallback(
    (index: number) => Math.max(0, Math.min(index, orderedItems.length - 1)),
    [orderedItems.length],
  );

  const selectHighlightedItem = useEffectEvent((id: string) => {
    const index = orderedItems.findIndex((item) => item.id === id);
    if (index !== -1) {
      setSelectedIndex(index);
    }
  });

  useEffect(() => {
    if (highlightItemId === undefined) {
      return;
    }
    selectHighlightedItem(highlightItemId);
    document
      .getElementById(`day-plan-item-${highlightItemId}`)
      ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightItemId]);

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
        deleteItem(
          { itemId: item.id },
          {
            onSuccess: () => {
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
            },
          },
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    clampIndex,
    deleteItem,
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
            setItemCompleted(
              {
                itemId: completeConfirmItem.id,
                completed: true,
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
              { onSuccess: () => setCompleteConfirmItem(null) },
            );
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
  const trpc = useTRPC();
  const router = useRouter();
  const deleteItem = useMutation(
    trpc.dayPlan.deleteItem.mutationOptions({
      onSuccess: ({ deleted }) => {
        router.refresh();
        showDayPlanItemDeletedToast(deleted, () => router.refresh());
      },
    }),
  );
  const setItemCancelled = useMutation(
    trpc.dayPlan.setItemCancelled.mutationOptions({
      onSuccess: () => router.refresh(),
    }),
  );
  const duplicateItem = useMutation(
    trpc.dayPlan.duplicateItem.mutationOptions({
      onSuccess: () => router.refresh(),
    }),
  );
  const copyToNextDay = useMutation(
    trpc.dayPlan.copyItemToNthDay.mutationOptions({
      onSuccess: ({ copiedItemId }) => {
        router.refresh();
        showDayPlanItemCopiedToNextDayToast(copiedItemId, () =>
          router.refresh(),
        );
      },
      onError: () => toast.error("Could not copy to the next day"),
    }),
  );
  const cancelReminder = useMutation(
    trpc.dayPlan.cancelReminder.mutationOptions({
      onSuccess: () => router.refresh(),
    }),
  );
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const setItemFollowUp = useMutation(
    trpc.dayPlan.setItemFollowUp.mutationOptions({
      onSuccess: () => {
        router.refresh();
        setFollowUpOpen(false);
      },
    }),
  );
  const cancelFollowUp = useMutation(
    trpc.dayPlan.cancelFollowUp.mutationOptions({
      onSuccess: () => router.refresh(),
    }),
  );
  const convertToThread = useMutation(
    trpc.thread.convertDayPlanItem.mutationOptions({
      onSuccess: ({ threadId }) => {
        router.refresh();
        toast.success("Converted to thread", {
          action: {
            label: "Open",
            onClick: () => router.push(`/threads/${threadId}`),
          },
        });
      },
      onError: () => toast.error("Could not convert to thread"),
    }),
  );
  const isPending =
    deleteItem.isPending ||
    setItemCancelled.isPending ||
    duplicateItem.isPending ||
    copyToNextDay.isPending ||
    cancelReminder.isPending ||
    cancelFollowUp.isPending ||
    convertToThread.isPending;
  const [remindOpen, setRemindOpen] = useState(false);
  const [copyNthDayOpen, setCopyNthDayOpen] = useState(false);
  const [referenceOpen, setReferenceOpen] = useState(false);
  const [linkThreadOpen, setLinkThreadOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const hasPendingFollowUp =
    item.followUp !== null && item.followUp.sendAt !== null;
  const canEditFollowUp =
    !item.isStepsLog && !item.completed && !hasPendingFollowUp;
  const hasPendingReminder = dayPlanItemHasPendingReminder(item);
  const canScheduleReminder = dayPlanItemCanScheduleReminder(item, planDate);
  const isUnlinkedFromTodo = !item.isStepsLog && item.todoId === null;

  return (
    <>
      <ContextMenu disabled={item.isStepsLog}>
        <ContextMenuTrigger
          id={`day-plan-item-${item.id}`}
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
              {item.followUp !== null ? (
                <Tooltip>
                  <TooltipTrigger
                    className="inline-flex shrink-0 rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={
                      hasPendingFollowUp
                        ? "Follow-up scheduled"
                        : "Follow-up planned"
                    }
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Timer
                      className={cn(
                        "size-3.5",
                        hasPendingFollowUp
                          ? "text-primary"
                          : "text-muted-foreground/60",
                      )}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {item.followUp.sendAt !== null
                      ? `Follow-up at ${formatFollowUpSendAt(item.followUp.sendAt)}: ${item.followUp.message}`
                      : `Follow-up ${formatFollowUpDuration(item.followUp.minutes)} after completion: ${item.followUp.message}`}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {item.threadId !== null ? (
                <Tooltip>
                  <TooltipTrigger
                    render={<Link href={`/threads/${item.threadId}`} />}
                    className="inline-flex shrink-0 rounded-sm text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Go to thread"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MessagesSquare className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent side="top">Go to thread</TooltipContent>
                </Tooltip>
              ) : null}
            </div>
            {item.targetTime !== null ||
            item.reference !== null ||
            isUnlinkedFromTodo ? (
              <div
                className={cn(
                  "ml-6 flex min-w-0 items-center gap-1.5 text-xs leading-tight",
                  item.cancelled
                    ? "text-destructive/65"
                    : "text-muted-foreground",
                )}
              >
                {item.targetTime !== null ? (
                  <span>{formatTargetTimeForDisplay(item.targetTime)}</span>
                ) : null}
                {item.reference !== null ? (
                  <DayPlanItemReferenceLink reference={item.reference} />
                ) : null}
                {isUnlinkedFromTodo ? (
                  <Tooltip>
                    <TooltipTrigger
                      className="inline-flex shrink-0 rounded-sm focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Not linked to a todo in your library"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <Link2Off className="size-3.5" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Not linked to a todo in your library
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
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
                deleteItem.mutate({ itemId: item.id });
              }}
            >
              <Trash2 />
            </Button>
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem disabled={isPending} onClick={onEdit}>
            <Pencil />
            Change item
          </ContextMenuItem>
          {!item.isStepsLog ? (
            <ContextMenuItem
              disabled={isPending}
              onClick={() => setRenameOpen(true)}
            >
              <Type />
              Rename
            </ContextMenuItem>
          ) : null}
          {canScheduleReminder ? (
            <ContextMenuItem onClick={() => setRemindOpen(true)}>
              <Bell />
              Remind me
            </ContextMenuItem>
          ) : null}
          {canEditFollowUp ? (
            <ContextMenuItem onClick={() => setFollowUpOpen(true)}>
              <Timer />
              Follow-up
            </ContextMenuItem>
          ) : null}
          {!item.isStepsLog ? (
            item.todoId !== null ? (
              <ContextMenuItem
                onClick={() => {
                  router.push(`/todos?todo=${item.todoId}`);
                }}
              >
                <ExternalLink />
                Go to original todo
              </ContextMenuItem>
            ) : (
              <ContextMenuItem disabled className="items-start py-2">
                <ExternalLink className="mt-0.5" />
                <span className="flex flex-col gap-0.5">
                  <span>Go to original todo</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    Not linked to the todo library.
                  </span>
                </span>
              </ContextMenuItem>
            )
          ) : null}
          {!item.isStepsLog ? (
            item.threadId !== null ? (
              <ContextMenuItem
                onClick={() => {
                  router.push(`/threads/${item.threadId}`);
                }}
              >
                <MessagesSquare />
                Go to thread
              </ContextMenuItem>
            ) : (
              <ContextMenuItem
                disabled={isPending}
                onClick={() => {
                  convertToThread.mutate({ itemId: item.id });
                }}
              >
                <MessagesSquare />
                Convert to thread
              </ContextMenuItem>
            )
          ) : null}
          {!item.isStepsLog && item.threadId === null ? (
            <ContextMenuItem
              disabled={isPending}
              onClick={() => setLinkThreadOpen(true)}
            >
              <Link2 />
              Link to thread
            </ContextMenuItem>
          ) : null}
          {!item.isStepsLog ? (
            <ContextMenuItem onClick={() => setReferenceOpen(true)}>
              <Link2 />
              Edit reference
            </ContextMenuItem>
          ) : null}
          {item.cancelled ? (
            <ContextMenuItem
              disabled={isPending}
              onClick={() => {
                setItemCancelled.mutate({ itemId: item.id, cancelled: false });
              }}
            >
              <RotateCcw />
              Restore item
            </ContextMenuItem>
          ) : null}
          <ContextMenuItem
            disabled={isPending}
            onClick={() => {
              duplicateItem.mutate({ itemId: item.id });
            }}
          >
            <Copy />
            Duplicate item
          </ContextMenuItem>
          <ContextMenuItem
            disabled={isPending}
            onClick={() => {
              copyToNextDay.mutate({ itemId: item.id, dayOffset: 1 });
            }}
          >
            <CalendarPlus />
            Copy on the next day
          </ContextMenuItem>
          <ContextMenuItem
            disabled={isPending}
            onClick={() => setCopyNthDayOpen(true)}
          >
            <CalendarRange />
            Copy on the n-th day
          </ContextMenuItem>
          {hasPendingReminder ||
          hasPendingFollowUp ||
          (!item.cancelled && !item.completed) ? (
            <>
              <ContextMenuSeparator />
              {hasPendingReminder ? (
                <ContextMenuItem
                  variant="destructive"
                  onClick={() => {
                    cancelReminder.mutate({ itemId: item.id });
                  }}
                >
                  <BellOff />
                  Cancel reminder
                </ContextMenuItem>
              ) : null}
              {hasPendingFollowUp ? (
                <ContextMenuItem
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => {
                    cancelFollowUp.mutate({ itemId: item.id });
                  }}
                >
                  <TimerOff />
                  Cancel follow-up
                </ContextMenuItem>
              ) : null}
              {!item.cancelled && !item.completed ? (
                <ContextMenuItem
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => {
                    setItemCancelled.mutate({
                      itemId: item.id,
                      cancelled: true,
                    });
                  }}
                >
                  <Ban />
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
      {renameOpen ? (
        <DayPlanItemRenameDialog
          key={`${item.id}-rename`}
          item={item}
          open
          onOpenChange={setRenameOpen}
        />
      ) : null}
      {referenceOpen ? (
        <DayPlanItemReferenceDialog
          key={`${item.id}-reference`}
          item={item}
          open
          onOpenChange={setReferenceOpen}
        />
      ) : null}
      {linkThreadOpen ? (
        <DayPlanItemLinkThreadDialog
          key={`${item.id}-link-thread`}
          item={item}
          open
          onOpenChange={setLinkThreadOpen}
        />
      ) : null}
      {followUpOpen ? (
        <FollowUpDialog
          key={`${item.id}-follow-up`}
          title={item.title}
          followUp={item.followUp}
          open
          isPending={setItemFollowUp.isPending}
          errorMessage={
            setItemFollowUp.error !== null
              ? "Could not save the follow-up. Please try again."
              : null
          }
          onOpenChange={setFollowUpOpen}
          onSave={(followUp) => {
            setItemFollowUp.mutate({ itemId: item.id, followUp });
          }}
        />
      ) : null}
    </>
  );
}
