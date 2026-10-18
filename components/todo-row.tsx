"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import type { TodoTargetTime } from "@/lib/target-time";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

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
  const trpc = useTRPC();
  const router = useRouter();
  const updateTodo = useMutation(
    trpc.todo.update.mutationOptions({
      onSuccess: () => router.refresh(),
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
    <li
      id={`todo-row-${initialTodo.id}`}
      onClick={onSelect}
      className={cn(
        "flex flex-col gap-3 rounded-lg border p-4 transition-colors",
        selected && "border-primary/50",
      )}
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
    </li>
  );
}
