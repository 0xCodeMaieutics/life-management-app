"use client";

import { Plus } from "lucide-react";
import { useActionState, useState } from "react";

import {
  createRead,
  type ReadActionState,
} from "@/app/(app)/later-reads/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ReadActionState = { errorMessage: null };

export function ReadCreateForm() {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [state, formAction, isPending] = useActionState(
    async (previousState: ReadActionState, formData: FormData) => {
      const result = await createRead(previousState, formData);
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
          Add link
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
            {state.errorMessage !== null ? (
              <p className="text-sm text-destructive">{state.errorMessage}</p>
            ) : null}
            <Button type="submit" disabled={isPending}>
              {isPending ? "Adding…" : "Add link"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
