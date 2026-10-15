"use client";

import { Effect } from "effect";
import { PencilIcon } from "lucide-react";
import { useActionState, useState } from "react";

import {
  updateMatterTitle,
  type UpdateTitleState,
} from "@/app/(app)/matter/[matterId]/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function MatterTitleForm({
  matterId,
  title,
}: {
  matterId: string;
  title: string | null;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [state, formAction, isPending] = useActionState(
    (previousState: UpdateTitleState, formData: FormData) =>
      Effect.runPromise(
        Effect.gen(function* () {
          const result = yield* Effect.tryPromise(() =>
            updateMatterTitle(previousState, formData),
          );
          if (result.errorMessage === null) {
            setIsEditing(false);
          }
          return result;
        }).pipe(
          Effect.orElseSucceed(() => ({ errorMessage: "Request failed" })),
        ),
      ),
    { errorMessage: null },
  );

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
          onClick={() => setIsEditing(true)}
        >
          <PencilIcon />
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-1 flex-col gap-y-1">
      <input type="hidden" name="matterId" value={matterId} />
      <div className="flex items-center gap-x-2">
        <Input
          name="title"
          defaultValue={title ?? ""}
          aria-label="Title"
          aria-invalid={state.errorMessage !== null}
          maxLength={80}
          required
          autoFocus
        />
        <Button type="submit" size="sm" disabled={isPending}>
          Save
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isPending}
          onClick={() => setIsEditing(false)}
        >
          Cancel
        </Button>
      </div>
      {state.errorMessage !== null && (
        <p className="text-xs text-destructive">{state.errorMessage}</p>
      )}
    </form>
  );
}
