"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { TargetTimeDaySegmentPicker } from "@/components/target-time-day-segment-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";

export function TodoCreateForm() {
  const trpc = useTRPC();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [targetTime, setTargetTime] = useState("");
  const createTodo = useMutation(
    trpc.todo.create.mutationOptions({
      onSuccess: () => {
        router.refresh();
        setOpen(false);
      },
    }),
  );

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setFormKey((key) => key + 1);
      setTargetTime("");
      createTodo.reset();
    }
    setOpen(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = new FormData(event.currentTarget).get("title");
    createTodo.mutate({
      title: typeof title === "string" ? title : "",
      targetTime,
    });
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "n" || !(event.metaKey || event.ctrlKey)) {
        return;
      }
      event.preventDefault();
      handleOpenChange(!open);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

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
            onSubmit={handleSubmit}
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
                value={targetTime}
                onChange={(event) => setTargetTime(event.target.value)}
              />
              <TargetTimeDaySegmentPicker
                targetTime={targetTime}
                onTargetTimeChange={setTargetTime}
              />
            </div>
            {createTodo.error !== null ? (
              <p className="text-sm text-destructive">
                {createTodo.error.data?.code === "BAD_REQUEST"
                  ? "Invalid todo"
                  : "Could not create todo"}
              </p>
            ) : null}
            <Button type="submit" disabled={createTodo.isPending}>
              {createTodo.isPending ? "Adding…" : "Add todo"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
