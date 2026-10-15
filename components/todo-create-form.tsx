"use client";

import { useActionState } from "react";

import { createTodo, type TodoActionState } from "@/app/(app)/todos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: TodoActionState = { errorMessage: null };

export function TodoCreateForm() {
  const [state, formAction, isPending] = useActionState(
    createTodo,
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4 rounded-lg border p-4">
      <h2 className="text-sm font-semibold">New todo</h2>
      <div className="flex flex-col gap-2">
        <Label htmlFor="todo-title">Title</Label>
        <Input
          id="todo-title"
          name="title"
          required
          maxLength={200}
          placeholder="Morning stretch"
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="todo-target-time">Target time</Label>
        <Input
          id="todo-target-time"
          name="targetTime"
          type="time"
          required
        />
      </div>
      {state.errorMessage ? (
        <p className="text-sm text-destructive">{state.errorMessage}</p>
      ) : null}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Adding…" : "Add todo"}
      </Button>
    </form>
  );
}
