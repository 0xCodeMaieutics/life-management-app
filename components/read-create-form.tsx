"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

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

export function ReadCreateForm() {
  const trpc = useTRPC();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const createRead = useMutation(
    trpc.read.create.mutationOptions({
      onSuccess: () => {
        router.refresh();
        setOpen(false);
      },
    }),
  );

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setFormKey((key) => key + 1);
      createRead.reset();
    }
    setOpen(nextOpen);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const url = formData.get("url");
    const title = formData.get("title");
    createRead.mutate({
      url: typeof url === "string" ? url : "",
      title: typeof title === "string" ? title : "",
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <Button type="button" onClick={() => handleOpenChange(true)}>
          <Plus />
          Add link
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
              <DialogTitle>New link</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor="read-url">URL</Label>
              <Input
                id="read-url"
                name="url"
                type="url"
                required
                maxLength={2048}
                placeholder="https://…"
                autoFocus
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="read-title">Title (optional)</Label>
              <Input
                id="read-title"
                name="title"
                maxLength={200}
                placeholder="Display name"
              />
            </div>
            {createRead.error !== null ? (
              <p className="text-sm text-destructive">
                {createRead.error.data?.code === "BAD_REQUEST"
                  ? "Invalid link"
                  : "Could not add link"}
              </p>
            ) : null}
            <Button type="submit" disabled={createRead.isPending}>
              {createRead.isPending ? "Adding…" : "Add link"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
