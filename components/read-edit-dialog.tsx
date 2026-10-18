"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";

export function ReadEditDialog({
  read,
  open,
  onOpenChange,
}: {
  read: { id: string; url: string; title: string | null };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const [url, setUrl] = useState(read.url);
  const [title, setTitle] = useState(read.title ?? "");
  const updateRead = useMutation(
    trpc.read.update.mutationOptions({
      onSuccess: () => {
        router.refresh();
        onOpenChange(false);
      },
    }),
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    updateRead.mutate({ id: read.id, url, title });
  }

  const previewLabel =
    title.trim() !== "" ? title.trim() : url.trim() !== "" ? url : "Link";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Edit link</DialogTitle>
          </DialogHeader>
          <p className="text-sm font-medium">{previewLabel}</p>
          <div className="flex flex-col gap-2">
            <Label htmlFor="read-edit-url">URL</Label>
            <Input
              id="read-edit-url"
              type="url"
              required
              maxLength={2048}
              value={url}
              onChange={(event) => setUrl(event.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="read-edit-title">Title (optional)</Label>
            <Input
              id="read-edit-title"
              maxLength={200}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
            />
          </div>
          {updateRead.error !== null ? (
            <p className="text-sm text-destructive">
              Could not save link. Please try again.
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={updateRead.isPending}>
              {updateRead.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
