"use client";

import { useMutation } from "@tanstack/react-query";
import { Effect } from "effect";
import { FileText as FileIcon, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";

export default function Home() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const categorise = useMutation({
    mutationFn: (file: File) => {
      const body = new FormData();
      body.set("file", file);

      return Effect.runPromise(
        Effect.gen(function* () {
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

          let data: { text?: string; error?: string } = {};
          if (raw) {
            data = yield* Effect.try({
              try: () =>
                JSON.parse(raw) as { text?: string; error?: string },
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
        }),
      );
    },
  });

  return (
    <div className="flex size-full flex-col items-center justify-center p-2">
      {currentFile === null ? (
        <FileUpload
          className="w-full"
          accept=".pdf"
          value={currentFile}
          onChange={(files) => {
            if (files === null) return;
            setCurrentFile(
              Array.isArray(files)
                ? files.length > 0
                  ? files[0]
                  : null
                : files,
            );
          }}
        />
      ) : (
        <div className="flex w-full flex-col gap-y-2">
          <div className="relative flex items-center gap-x-2 rounded-md border p-2">
            <FileIcon />
            <div className="flex flex-col gap-y-0.5">
              <span className="font-semibold">{currentFile.name}</span>
              <span className="text-xs text-muted-foreground">
                {currentFile.size} bytes
              </span>
            </div>
            <Button
              variant={"ghost"}
              className={"absolute top-0 right-0"}
              onClick={() => {
                setCurrentFile(null);
                categorise.reset();
              }}
            >
              <X />
            </Button>
          </div>
          <Button
            disabled={categorise.isPending}
            onClick={() => categorise.mutate(currentFile)}
          >
            {categorise.isPending ? "Reading…" : "Categorise"}
          </Button>
          {categorise.error ? (
            <p className="text-sm text-destructive">
              {categorise.error.message}
            </p>
          ) : null}
          {categorise.data ? (
            <pre className="text-sm whitespace-pre-wrap">{categorise.data}</pre>
          ) : null}
        </div>
      )}
    </div>
  );
}
