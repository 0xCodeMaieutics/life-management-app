"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";

import { createTodo, type TodoActionState } from "@/app/(app)/todos/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: TodoActionState = { errorMessage: null };

export function TodoCreateForm() {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, isPending] = useActionState(
    async (previousState: TodoActionState, formData: FormData) => {
      const result = await createTodo(previousState, formData);
      if (result.errorMessage === null) {
        setOpen(false);
      }
      return result;
    },
    initialState,
  );

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setFormKey((key) => key + 1);
    }
    setOpen(nextOpen);
  }

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" onClick={() => handleOpenChange(true)}>
          <Plus />
          Add a Todo
        </Button>
      </div>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <form
            key={formKey}
            action={formAction}
            className="flex flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle>New todo</DialogTitle>
            </DialogHeader>
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
            {state.errorMessage !== null ? (
              <p className="text-sm text-destructive">{state.errorMessage}</p>
            ) : null}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding…" : "Add todo"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
