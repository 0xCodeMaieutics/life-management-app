"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { type TodoRowData } from "@/components/todo-row";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatTargetTimeForDisplay } from "@/lib/target-time";
import { useTRPC } from "@/trpc/client";

type DayPlanDialogMode = "create" | "add";

const DIALOG_COPY: Record<
  DayPlanDialogMode,
  {
    title: string;
    description: (planDate: string) => string;
    confirmLabel: string;
    pendingLabel: string;
    errorMessage: string;
  }
> = {
  create: {
    title: "Create day plan",
    description: (planDate) =>
      `Choose todos to include for ${planDate}. Uncheck any you do not want today.`,
    confirmLabel: "Create day plan",
    pendingLabel: "Creating…",
    errorMessage: "Could not create day plan. Please try again.",
  },
  add: {
    title: "Add todos",
    description: (planDate) => `Choose todos to add to ${planDate}.`,
    confirmLabel: "Add todos",
    pendingLabel: "Adding…",
    errorMessage: "Could not add todos. Please try again.",
  },
};

function initialSelection(mode: DayPlanDialogMode, todos: TodoRowData[]) {
  return new Set(mode === "create" ? todos.map((item) => item.id) : []);
}

export function CreateDayPlanDialog({
  planDate,
  todos,
  open,
  onOpenChange,
  mode = "create",
}: {
  planDate: string;
  todos: TodoRowData[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: DayPlanDialogMode;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const copy = DIALOG_COPY[mode];
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() =>
    initialSelection(mode, todos),
  );
  const mutationOptions = {
    onSuccess: () => {
      router.refresh();
      onOpenChange(false);
    },
  };
  const createDayPlan = useMutation(
    trpc.dayPlan.create.mutationOptions(mutationOptions),
  );
  const addTodosToDayPlan = useMutation(
    trpc.dayPlan.addTodos.mutationOptions(mutationOptions),
  );
  const submit = mode === "create" ? createDayPlan : addTodosToDayPlan;
  const isPending = submit.isPending;

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
      setSelectedIds(initialSelection(mode, todos));
      submit.reset();
    }
    onOpenChange(nextOpen);
  }

  function handleConfirm() {
    if (selectedIds.size === 0) {
      return;
    }

    submit.mutate({ planDate, todoIds: [...selectedIds] });
  }

  const canConfirm = selectedIds.size > 0 && !isPending;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.description(planDate)}</DialogDescription>
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
                    {formatTargetTimeForDisplay(item.targetTime)}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        {submit.error !== null ? (
          <p className="text-sm text-destructive">{copy.errorMessage}</p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={!canConfirm} onClick={handleConfirm}>
            {isPending ? copy.pendingLabel : copy.confirmLabel}
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
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Nothing planned yet.</p>
        <p className="text-sm text-muted-foreground">
          Add a todo before you can create a day plan.
        </p>
        <Button nativeButton={false} render={<Link href="/todos" />}>
          Go to todos
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">Nothing planned yet.</p>
        <Button type="button" onClick={() => setOpen(true)}>
          Create day plan
        </Button>
      </div>
      <CreateDayPlanDialog
        planDate={planDate}
        todos={todos}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}

export function AddTodosToDayPlanTrigger({
  planDate,
  todos,
}: {
  planDate: string;
  todos: TodoRowData[];
}) {
  const [open, setOpen] = useState(false);
  const [dialogKey, setDialogKey] = useState(0);

  if (todos.length === 0) {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => {
          setDialogKey((key) => key + 1);
          setOpen(true);
        }}
      >
        <Plus />
        Import todo
      </Button>
      <CreateDayPlanDialog
        key={dialogKey}
        mode="add"
        planDate={planDate}
        todos={todos}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
