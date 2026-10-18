"use client";

import { useMutation } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ReadEditDialog } from "@/components/read-edit-dialog";
import { ReadFinishConfirmDialog } from "@/components/read-finish-confirm-dialog";
import { ReadRemindDialog } from "@/components/read-remind-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  type ReadWithReminder,
  readCanScheduleReminder,
  readHasPendingReminder,
  readNeedsFinishConfirmation,
  readRemindDialogLabel,
} from "@/lib/read-reminder-ui";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

export type ReadRowData = ReadWithReminder;

export function ReadRow({ read }: { read: ReadRowData }) {
  const trpc = useTRPC();
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [remindOpen, setRemindOpen] = useState(false);
  const [finishConfirmOpen, setFinishConfirmOpen] = useState(false);
  const markReadFinished = useMutation(
    trpc.read.markFinished.mutationOptions({
      onSuccess: () => router.refresh(),
    }),
  );
  const cancelReadReminder = useMutation(
    trpc.read.cancelReminder.mutationOptions({
      onSuccess: () => router.refresh(),
    }),
  );
  const isPending = markReadFinished.isPending || cancelReadReminder.isPending;

  const hasTitle = read.title !== null && read.title !== "";
  const hasPendingReminder = readHasPendingReminder(read);
  const canScheduleReminder = readCanScheduleReminder();

  function markFinished() {
    markReadFinished.mutate({ id: read.id });
  }

  function requestMarkFinished() {
    if (readNeedsFinishConfirmation(read)) {
      setFinishConfirmOpen(true);
      return;
    }
    markFinished();
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger
          className={cn(
            "flex w-full flex-col gap-1 rounded-lg border px-4 py-3 text-left transition-colors",
          )}
        >
          <div className="flex items-center gap-1.5">
            {hasTitle ? (
              <span className="text-sm leading-tight font-medium">
                {read.title}
              </span>
            ) : null}
            {hasPendingReminder ? (
              <Bell
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-label="Reminder scheduled"
              />
            ) : null}
          </div>
          <a
            href={read.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {read.url}
          </a>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {canScheduleReminder ? (
            <ContextMenuItem onClick={() => setRemindOpen(true)}>
              Remind me
            </ContextMenuItem>
          ) : null}
          <ContextMenuItem
            disabled={isPending}
            onClick={() => setEditOpen(true)}
          >
            Edit
          </ContextMenuItem>
          <ContextMenuItem disabled={isPending} onClick={requestMarkFinished}>
            Mark finished
          </ContextMenuItem>
          {hasPendingReminder ? (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem
                variant="destructive"
                onClick={() => {
                  cancelReadReminder.mutate({ readId: read.id });
                }}
              >
                Cancel reminder
              </ContextMenuItem>
            </>
          ) : null}
        </ContextMenuContent>
      </ContextMenu>
      {editOpen ? (
        <ReadEditDialog
          key={read.id}
          read={read}
          open
          onOpenChange={setEditOpen}
        />
      ) : null}
      {remindOpen ? (
        <ReadRemindDialog
          key={read.id}
          read={read}
          open
          onOpenChange={setRemindOpen}
        />
      ) : null}
      {finishConfirmOpen ? (
        <ReadFinishConfirmDialog
          itemLabel={readRemindDialogLabel(read)}
          open
          onOpenChange={setFinishConfirmOpen}
          isPending={isPending}
          onConfirm={() => {
            markFinished();
            setFinishConfirmOpen(false);
          }}
        />
      ) : null}
    </>
  );
}
