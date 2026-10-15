"use client";

import { useActionState, useTransition } from "react";
import { Trash2 } from "lucide-react";

import {
  deleteTodo,
  updateTodo,
  type TodoActionState,
} from "@/app/(app)/todos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: TodoActionState = { errorMessage: null };

export type TodoRowData = {
  id: string;
  title: string;
  targetTime: string;
};

export function TodoRow({ todo: initialTodo }: { todo: TodoRowData }) {
  const [state, formAction, isPending] = useActionState(
    updateTodo,
    initialState,
  );
  const [isDeleting, startDelete] = useTransition();

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4">
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
              defaultValue={initialTodo.title}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`todo-time-${initialTodo.id}`}>Target time</Label>
            <Input
              id={`todo-time-${initialTodo.id}`}
              name="targetTime"
              type="time"
              required
              defaultValue={initialTodo.targetTime}
            />
          </div>
          <Button type="submit" disabled={isPending} className="sm:mb-0.5">
            {isPending ? "Saving…" : "Save"}
          </Button>
        </div>
        {state.errorMessage ? (
          <p className="text-sm text-destructive">{state.errorMessage}</p>
        ) : null}
      </form>
      <div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={isDeleting}
          onClick={() => {
            startDelete(async () => {
              await deleteTodo(initialTodo.id);
            });
          }}
        >
          <Trash2 />
          Delete
        </Button>
      </div>
    </li>
  );
}
