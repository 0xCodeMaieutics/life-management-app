"use client";

import { FileText as FileIcon, X } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";

export default function Home() {
  const [currentFile, setCurrentFile] = useState<File | null>(
    new File([], "vodafone - aktivierungscode"),
  );
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
              }}
            >
              <X />
            </Button>
          </div>
          <Button>Categorise</Button>
        </div>
      )}
    </div>
  );
}
