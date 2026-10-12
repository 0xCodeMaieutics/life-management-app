"use client";

import { useMutation } from "@tanstack/react-query";
import { Effect } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import { FileText as FileIcon, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";

export default function Home() {
  const router = useRouter();
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const categorise = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.set("file", file);

      const request = HttpClientRequest.post("/api/ocr").pipe(
        HttpClientRequest.bodyFormData(body),
      );

      return Effect.runPromise(
        Effect.gen(function* () {
          const response = yield* HttpClient.execute(request);

          if (response.status < 200 || response.status >= 300) {
            return yield* Effect.fail(new Error());
          }
        }).pipe(
          Effect.provide(FetchHttpClient.layer),
          Effect.mapError(() => new Error("Request failed")),
        ),
      );
    },
    onSuccess: () => router.push("/matter"),
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
        </div>
      )}
    </div>
  );
}
