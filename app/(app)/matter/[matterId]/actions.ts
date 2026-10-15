"use server";

import { eq } from "drizzle-orm";
import { Data, Effect } from "effect";
import { revalidatePath } from "next/cache";
import * as z from "zod";

import db from "@/lib/db";
import { matter } from "@/lib/schema";

const MAX_TITLE_LENGTH = 80;

const updateTitleSchema = z.object({
  matterId: z.uuid(),
  title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
});

export type UpdateTitleState = { errorMessage: string | null };

class InvalidTitleError extends Data.TaggedError("InvalidTitleError")<{
  readonly cause: unknown;
}> {}

class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: unknown;
}> {}

export async function updateMatterTitle(
  _previousState: UpdateTitleState,
  formData: FormData,
): Promise<UpdateTitleState> {
  return Effect.runPromise(
    Effect.gen(function* () {
      const parsed = updateTitleSchema.safeParse({
        matterId: formData.get("matterId"),
        title: formData.get("title"),
      });

      if (!parsed.success) {
        return yield* new InvalidTitleError({ cause: parsed.error });
      }

      const { matterId, title } = parsed.data;

      yield* Effect.tryPromise({
        try: () =>
          db.update(matter).set({ title }).where(eq(matter.id, matterId)),
        catch: (cause) => new DatabaseError({ cause }),
      });

      revalidatePath(`/matter/${matterId}`);
      revalidatePath("/matter");
      return { errorMessage: null };
    }).pipe(
      Effect.catchTags({
        InvalidTitleError: ({ cause }) => {
          console.error(cause);
          return Effect.succeed({ errorMessage: "Bad request" });
        },
        DatabaseError: ({ cause }) => {
          const message =
            cause instanceof Error ? cause.message : "Database update failed";
          console.error(message);
          return Effect.succeed({ errorMessage: "Internal server error" });
        },
      }),
    ),
  );
}
