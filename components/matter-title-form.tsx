"use client";

import { useMutation } from "@tanstack/react-query";
import { PencilIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";

export function MatterTitleForm({
  matterId,
  title,
}: {
  matterId: string;
  title: string | null;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const updateMatterTitle = useMutation(
    trpc.matter.updateTitle.mutationOptions({
      onSuccess: () => {
        router.refresh();
        setIsEditing(false);
      },
    }),
  );
  const errorMessage =
    updateMatterTitle.error === null
      ? null
      : updateMatterTitle.error.data?.code === "BAD_REQUEST"
        ? "Bad request"
        : "Internal server error";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = new FormData(event.currentTarget).get("title");
    updateMatterTitle.mutate({
      matterId,
      title: typeof nextTitle === "string" ? nextTitle : "",
    });
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-x-1">
        <h1 className="text-lg font-semibold">
          {title === null || title === "" ? "Untitled" : title}
        </h1>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Edit title"
          onClick={() => {
            updateMatterTitle.reset();
            setIsEditing(true);
          }}
        >
          <PencilIcon />
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-y-1">
      <div className="flex items-center gap-x-2">
        <Input
          name="title"
          defaultValue={title ?? ""}
          aria-label="Title"
          aria-invalid={errorMessage !== null}
          maxLength={80}
          required
          autoFocus
        />
        <Button type="submit" size="sm" disabled={updateMatterTitle.isPending}>
          Save
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={updateMatterTitle.isPending}
          onClick={() => setIsEditing(false)}
        >
          Cancel
        </Button>
      </div>
      {errorMessage !== null && (
        <p className="text-xs text-destructive">{errorMessage}</p>
      )}
    </form>
  );
}
