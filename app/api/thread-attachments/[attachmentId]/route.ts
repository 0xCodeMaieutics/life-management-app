import { GetObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { Data, Effect } from "effect";
import * as z from "zod";

import { env } from "@/env";
import db from "@/lib/db";
import s3 from "@/lib/s3";
import { threadAttachment } from "@/lib/schema";

class AttachmentNotFoundError extends Data.TaggedError(
  "AttachmentNotFoundError",
) {}

class DownloadError extends Data.TaggedError("DownloadError")<{
  readonly cause: unknown;
}> {}

class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: unknown;
}> {}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/thread-attachments/[attachmentId]">,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const { attachmentId } = yield* Effect.promise(() => context.params);
      if (!z.uuid().safeParse(attachmentId).success) {
        return yield* new AttachmentNotFoundError();
      }

      const [found] = yield* Effect.tryPromise({
        try: () =>
          db
            .select({
              key: threadAttachment.key,
              fileName: threadAttachment.fileName,
            })
            .from(threadAttachment)
            .where(eq(threadAttachment.id, attachmentId))
            .limit(1),
        catch: (cause) => new DatabaseError({ cause }),
      });
      if (found === undefined) {
        return yield* new AttachmentNotFoundError();
      }

      const object = yield* Effect.tryPromise({
        try: () =>
          s3.send(
            new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: found.key }),
          ),
        catch: (cause) => new DownloadError({ cause }),
      });
      if (object.Body === undefined) {
        return yield* new DownloadError({ cause: new Error("Empty body") });
      }

      return new Response(object.Body.transformToWebStream(), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(found.fileName)}`,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, no-store",
        },
      });
    }).pipe(
      Effect.catchTags({
        AttachmentNotFoundError: () => {
          console.error("AttachmentNotFoundError");
          return Effect.succeed(
            Response.json({ error: "Not found" }, { status: 404 }),
          );
        },
        DownloadError: ({ cause }) => {
          const message =
            cause instanceof Error ? cause.message : "Download failed";
          console.error(message);
          return Effect.succeed(
            Response.json({ error: "Internal server error" }, { status: 502 }),
          );
        },
        DatabaseError: ({ cause }) => {
          const message =
            cause instanceof Error ? cause.message : "Database query failed";
          console.error(message);
          return Effect.succeed(
            Response.json({ error: "Internal server error" }, { status: 500 }),
          );
        },
      }),
    ),
  );
}
