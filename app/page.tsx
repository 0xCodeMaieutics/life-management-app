"use client";

import { useMutation } from "@tanstack/react-query";
import { FileText as FileIcon, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";

export default function Home() {
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const categorise = useMutation({
    mutationFn: async (file: File) => {
      const readFailedMessage = "Could not read this file. Please try again.";
      let failureMessage = readFailedMessage;

      try {
        const body = new FormData();
        body.set("file", file);

        const response = await fetch("/api/ocr", {
          method: "POST",
          body,
        });
        const data = JSON.parse(await response.text()) as {
          text?: string;
          error?: string;
        };

        if (!response.ok) {
          failureMessage = data.error ?? readFailedMessage;
        } else if (!data.text) {
          failureMessage = "OCR returned no text";
        } else {
          return data.text;
        }
      } catch {
        failureMessage = readFailedMessage;
      }

      throw new Error(failureMessage);
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
