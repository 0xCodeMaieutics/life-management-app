"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createDayPlan } from "@/app/(app)/day-plan/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TodoRowData } from "@/components/todo-row";

export function CreateDayPlanDialog({
  planDate,
  todos,
  open,
  onOpenChange,
}: {
  planDate: string;
  todos: TodoRowData[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(todos.map((item) => item.id)),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleTodo(id: string) {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setSelectedIds(new Set(todos.map((item) => item.id)));
      setErrorMessage(null);
    }
    onOpenChange(nextOpen);
  }

  function handleCreate() {
    if (selectedIds.size === 0) {
      return;
    }

    startTransition(async () => {
      const result = await createDayPlan(planDate, [...selectedIds]);
      if (!result.ok) {
        setErrorMessage("Could not create day plan. Please try again.");
        return;
      }
      onOpenChange(false);
      router.refresh();
    });
  }

  const canConfirm = selectedIds.size > 0 && !isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create day plan</DialogTitle>
          <DialogDescription>
            Choose todos to include for {planDate}. Uncheck any you do not want
            today.
          </DialogDescription>
        </DialogHeader>
        <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
          {todos.map((item) => (
            <li key={item.id}>
              <label className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/50">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input"
                  checked={selectedIds.has(item.id)}
                  onChange={() => toggleTodo(item.id)}
                />
                <span className="flex flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.targetTime}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={!canConfirm} onClick={handleCreate}>
            {isPending ? "Creating…" : "Create day plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreateDayPlanTrigger({
  planDate,
  todos,
}: {
  planDate: string;
  todos: TodoRowData[];
}) {
  const [open, setOpen] = useState(false);

  if (todos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-sm text-muted-foreground">
          Add a todo before you can create a day plan.
        </p>
        <Button render={<Link href="/todos" />}>Go to todos</Button>
      </div>
    );
  }

  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>
        Create day plan
      </Button>
      <CreateDayPlanDialog
        planDate={planDate}
        todos={todos}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
