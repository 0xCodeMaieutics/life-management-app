import { Effect } from "effect";

type OcrResponse = { text?: string; error?: string };

export const categoriseOcrFile = Effect.fn(function* (body: FormData) {
  const response = yield* Effect.tryPromise({
    try: () =>
      fetch("/api/ocr", {
        method: "POST",
        body,
      }),
    catch: () => new Error("Failed to send file for OCR"),
  });

  const raw = yield* Effect.tryPromise({
    try: () => response.text(),
    catch: () => new Error("Failed to read OCR response"),
  });

  let data: OcrResponse = {};
  if (raw) {
    data = yield* Effect.try({
      try: () => JSON.parse(raw) as OcrResponse,
      catch: () => new Error("OCR failed"),
    });
  }

  if (!response.ok) {
    return yield* Effect.fail(new Error(data.error ?? "OCR failed"));
  }
  if (!data.text) {
    return yield* Effect.fail(new Error("OCR returned no text"));
  }

  return data.text;
});
