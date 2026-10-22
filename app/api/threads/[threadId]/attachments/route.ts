import { PutObjectCommand } from "@aws-sdk/client-s3";
import { eq } from "drizzle-orm";
import { Data, Effect } from "effect";
import * as z from "zod";

import { env } from "@/env";
import db from "@/lib/db";
import s3 from "@/lib/s3";
import { thread, threadAttachment } from "@/lib/schema";
import { MAX_THREAD_ATTACHMENT_BYTES } from "@/lib/thread-attachment";
import { deleteThreadAttachmentFiles } from "@/lib/thread-attachment-storage";

const PDF_SIGNATURE = "%PDF-";

class InvalidRequestError extends Data.TaggedError("InvalidRequestError")<{
  readonly reason: string;
}> {}

class ThreadNotFoundError extends Data.TaggedError("ThreadNotFoundError") {}

class UploadError extends Data.TaggedError("UploadError")<{
  readonly cause: unknown;
}> {}

class DatabaseError extends Data.TaggedError("DatabaseError")<{
  readonly cause: unknown;
}> {}

async function isPdf(file: File) {
  const header = await file.slice(0, PDF_SIGNATURE.length).text();
  return header === PDF_SIGNATURE;
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/threads/[threadId]/attachments">,
) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const { threadId } = yield* Effect.promise(() => context.params);
      if (!z.uuid().safeParse(threadId).success) {
        return yield* new InvalidRequestError({ reason: "Invalid thread id" });
      }

      const formData = yield* Effect.tryPromise({
        try: () => request.formData(),
        catch: () => new InvalidRequestError({ reason: "Invalid form data" }),
      });
      const files = formData.getAll("files");
      if (files.length === 0) {
        return yield* new InvalidRequestError({ reason: "No files" });
      }

      const pdfFiles: File[] = [];
      for (const file of files) {
        if (
          !(file instanceof File) ||
          file.size === 0 ||
          file.size > MAX_THREAD_ATTACHMENT_BYTES
        ) {
          return yield* new InvalidRequestError({ reason: "Invalid file" });
        }
        const isPdfFile = yield* Effect.promise(() => isPdf(file));
        if (!isPdfFile) {
          return yield* new InvalidRequestError({ reason: "Not a PDF" });
        }
        pdfFiles.push(file);
      }

      const [found] = yield* Effect.tryPromise({
        try: () =>
          db
            .select({ id: thread.id })
            .from(thread)
            .where(eq(thread.id, threadId))
            .limit(1),
        catch: (cause) => new DatabaseError({ cause }),
      });
      if (found === undefined) {
        return yield* new ThreadNotFoundError();
      }

      const uploaded = yield* Effect.tryPromise({
        try: async () => {
          const results = await Promise.allSettled(
            pdfFiles.map(async (file) => {
              const key = `thread-attachment/${crypto.randomUUID()}.pdf`;
              await s3.send(
                new PutObjectCommand({
                  Bucket: env.S3_BUCKET,
                  Key: key,
                  Body: Buffer.from(await file.arrayBuffer()),
                  ContentType: "application/pdf",
                }),
              );
              return { key, fileName: file.name };
            }),
          );
          const succeeded = results.flatMap((result) =>
            result.status === "fulfilled" ? [result.value] : [],
          );
          const failed = results.find((result) => result.status === "rejected");
          if (failed !== undefined) {
            await deleteThreadAttachmentFiles(
              succeeded.map(({ key }) => key),
            ).catch(() => undefined);
            throw failed.reason;
          }
          return succeeded;
        },
        catch: (cause) => new UploadError({ cause }),
      });

      yield* Effect.tryPromise({
        try: () =>
          db
            .insert(threadAttachment)
            .values(uploaded.map((file) => ({ threadId, ...file }))),
        catch: (cause) => new DatabaseError({ cause }),
      }).pipe(
        Effect.tapError(() =>
          Effect.promise(() =>
            deleteThreadAttachmentFiles(uploaded.map(({ key }) => key)).catch(
              () => undefined,
            ),
          ),
        ),
      );

      return new Response(null, { status: 201 });
    }).pipe(
      Effect.catchTags({
        InvalidRequestError: ({ reason }) => {
          console.error(`InvalidRequestError: ${reason}`);
          return Effect.succeed(
            Response.json({ error: "Bad request" }, { status: 400 }),
          );
        },
        ThreadNotFoundError: () => {
          console.error("ThreadNotFoundError");
          return Effect.succeed(
            Response.json({ error: "Not found" }, { status: 404 }),
          );
        },
        UploadError: ({ cause }) => {
          const message =
            cause instanceof Error ? cause.message : "Upload failed";
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
