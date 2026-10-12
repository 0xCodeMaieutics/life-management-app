import { Mistral } from "@mistralai/mistralai";
import { Data, Effect } from "effect";

import { env } from "@/env";

const MODEL = "mistral-ocr-2512";

class InvalidFileError extends Data.TaggedError("InvalidFileError") {}

class OcrError extends Data.TaggedError("OcrError")<{
  readonly cause: unknown;
}> {}

export async function POST(request: Request) {
  return Effect.runPromise(
    Effect.gen(function* () {
      const formData = yield* Effect.promise(() => request.formData());
      const file = formData.get("file");

      if (!(file instanceof File) || file.size === 0) {
        return yield* new InvalidFileError();
      }

      const ocrResponse = yield* Effect.tryPromise({
        try: async () => {
          const base64 = Buffer.from(await file.arrayBuffer()).toString(
            "base64",
          );
          const client = new Mistral({ apiKey: env.MISTRAL_API_KEY });

          return client.ocr.process({
            model: MODEL,
            document: {
              type: "document_url",
              documentUrl: `data:application/pdf;base64,${base64}`,
              documentName: file.name,
            },
            tableFormat: "html",
            includeImageBase64: false,
          });
        },
        catch: (cause) => new OcrError({ cause }),
      });
      for (const page of ocrResponse.pages) {
        console.log(page);
      }

      const text = ocrResponse.pages.map((page) => page.markdown).join("\n\n");
      return Response.json({ text });
    }).pipe(
      Effect.catchTags({
        InvalidFileError: () => {
          console.error("InvalidFileError");
          return Effect.succeed(
            Response.json({ error: "Bad request" }, { status: 400 }),
          );
        },
        OcrError: ({ cause }) => {
          const message = cause instanceof Error ? cause.message : "OCR failed";
          console.error(message);
          return Effect.succeed(
            Response.json({ error: "Internal server error" }, { status: 502 }),
          );
        },
      }),
    ),
  );
}
