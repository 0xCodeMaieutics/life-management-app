"use client";

import { type FormEvent, useState, useTransition } from "react";

import { updateReadFields } from "@/app/(app)/later-reads/actions";
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

export function ReadEditDialog({
  read,
  open,
  onOpenChange,
}: {
  read: { id: string; url: string; title: string | null };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [url, setUrl] = useState(read.url);
  const [title, setTitle] = useState(read.title ?? "");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateReadFields(read.id, url, title);
      if (!result.ok) {
        setErrorMessage("Could not save link. Please try again.");
        return;
      }
      onOpenChange(false);
    });
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
          {errorMessage !== null ? (
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
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
