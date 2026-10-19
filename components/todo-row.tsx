"use client";

import { useMutation } from "@tanstack/react-query";
import { Timer } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import type { TodoTargetTime } from "@/lib/target-time";

import { FollowUpDialog } from "@/components/follow-up-dialog";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type FollowUp, formatFollowUpDuration } from "@/lib/follow-up";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

export type TodoRowData = {
  id: string;
  title: string;
  targetTime: TodoTargetTime;
  followUp: FollowUp | null;
};

export function TodoRow({
  todo: initialTodo,
  selected = false,
  onSelect,
}: {
  todo: TodoRowData;
  selected?: boolean;
  onSelect: () => void;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const updateTodo = useMutation(
    trpc.todo.update.mutationOptions({
      onSuccess: () => router.refresh(),
    }),
  );
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const setFollowUp = useMutation(
    trpc.todo.setFollowUp.mutationOptions({
      onSuccess: () => {
        router.refresh();
        setFollowUpOpen(false);
      },
    }),
  );
  const [title, setTitle] = useState(initialTodo.title);
  const [targetTime, setTargetTime] = useState(initialTodo.targetTime);

  useEffect(() => {
    setTitle(initialTodo.title);
    setTargetTime(initialTodo.targetTime);
  }, [initialTodo.title, initialTodo.targetTime]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateTodo.mutate({ id: initialTodo.id, title, targetTime });
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger
          render={
            <li
              id={`todo-row-${initialTodo.id}`}
              onClick={onSelect}
              className={cn(
                "flex flex-col gap-3 rounded-lg border p-4 transition-colors",
                selected && "border-primary/50",
              )}
            />
          }
        >
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-2">
                <Label htmlFor={`todo-title-${initialTodo.id}`}>Title</Label>
                <Input
                  id={`todo-title-${initialTodo.id}`}
                  name="title"
                  required
                  maxLength={200}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor={`todo-time-${initialTodo.id}`}>
                  Target time
                </Label>
                <Input
                  id={`todo-time-${initialTodo.id}`}
                  name="targetTime"
                  type="time"
                  required
                  value={targetTime}
                  onChange={(event) => setTargetTime(event.target.value)}
                />
              </div>
              <Button
                type="submit"
                disabled={updateTodo.isPending}
                className="sm:mb-0.5"
              >
                {updateTodo.isPending ? "Saving…" : "Save"}
              </Button>
            </div>
            {updateTodo.error !== null ? (
              <p className="text-sm text-destructive">
                {updateTodo.error.data?.code === "BAD_REQUEST"
                  ? "Invalid todo"
                  : "Could not update todo"}
              </p>
            ) : null}
          </form>
          {initialTodo.followUp !== null ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Timer className="size-3.5 shrink-0" aria-label="Follow-up" />
              {`${formatFollowUpDuration(initialTodo.followUp.minutes)} after completion: ${initialTodo.followUp.message}`}
            </p>
          ) : null}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setFollowUpOpen(true)}>
            <Timer />
            Follow-up
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {followUpOpen ? (
        <FollowUpDialog
          key={`${initialTodo.id}-follow-up`}
          title={initialTodo.title}
          followUp={initialTodo.followUp}
          open
          isPending={setFollowUp.isPending}
          errorMessage={
            setFollowUp.error !== null
              ? "Could not save the follow-up. Please try again."
              : null
          }
          onOpenChange={setFollowUpOpen}
          onSave={(followUp) => {
            setFollowUp.mutate({ id: initialTodo.id, followUp });
          }}
        />
      ) : null}
    </>
  );
}
