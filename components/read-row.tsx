"use client";

import { useState, useTransition } from "react";

import { markReadFinished } from "@/app/(app)/later-reads/actions";
import { ReadEditDialog } from "@/components/read-edit-dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";

export type ReadRowData = {
  id: string;
  url: string;
  title: string | null;
};

export function ReadRow({ read }: { read: ReadRowData }) {
  const [editOpen, setEditOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const hasTitle = read.title !== null && read.title !== "";

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger
          className={cn(
            "flex w-full flex-col gap-1 rounded-lg border px-4 py-3 text-left transition-colors",
          )}
        >
          {hasTitle ? (
            <span className="text-sm leading-tight font-medium">
              {read.title}
            </span>
          ) : null}
          <a
            href={read.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {read.url}
          </a>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            disabled={isPending}
            onClick={() => setEditOpen(true)}
          >
            Edit
          </ContextMenuItem>
          <ContextMenuItem
            disabled={isPending}
            onClick={() => {
              startTransition(async () => {
                await markReadFinished(read.id);
              });
            }}
          >
            Mark finished
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      {editOpen ? (
        <ReadEditDialog
          key={read.id}
          read={read}
          open
          onOpenChange={setEditOpen}
        />
      ) : null}
    </>
  );
}
