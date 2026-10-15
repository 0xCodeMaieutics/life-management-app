"use client";

import { useActionState, useEffect, useState } from "react";

import type { TodoTargetTime } from "@/lib/target-time";

import { updateTodo, type TodoActionState } from "@/app/(app)/todos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const initialState: TodoActionState = { errorMessage: null };

export type TodoRowData = {
  id: string;
  title: string;
  targetTime: TodoTargetTime;
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
  const [state, formAction, isPending] = useActionState(
    updateTodo,
    initialState,
  );
  const [title, setTitle] = useState(initialTodo.title);
  const [targetTime, setTargetTime] = useState(initialTodo.targetTime);

  useEffect(() => {
    setTitle(initialTodo.title);
    setTargetTime(initialTodo.targetTime);
  }, [initialTodo.title, initialTodo.targetTime]);

  return (
    <li
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4 transition-colors",
        selected && "border-primary/50",
      )}
    >
      <form action={formAction} className="flex flex-col gap-3">
        <input type="hidden" name="id" value={initialTodo.id} />
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
            <Label htmlFor={`todo-time-${initialTodo.id}`}>Target time</Label>
            <Input
              id={`todo-time-${initialTodo.id}`}
              name="targetTime"
              type="time"
              required
              value={targetTime}
              onChange={(event) => setTargetTime(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={isPending} className="sm:mb-0.5">
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
        {state.errorMessage !== null ? (
          <p className="text-sm text-destructive">{state.errorMessage}</p>
        ) : null}
      </form>
    </li>
  );
}
