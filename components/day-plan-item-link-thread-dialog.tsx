"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { type DayPlanItem } from "@/lib/day-segments";
import { useTRPC } from "@/trpc/client";

export function DayPlanItemLinkThreadDialog({
  item,
  open,
  onOpenChange,
}: {
  item: DayPlanItem;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const threads = useQuery(trpc.thread.listPending.queryOptions());
  const linkToThread = useMutation(
    trpc.thread.linkDayPlanItem.mutationOptions({
      onSuccess: ({ threadId }) => {
        router.refresh();
        onOpenChange(false);
        toast.success("Linked to thread", {
          action: {
            label: "Open",
            onClick: () => router.push(`/threads/${threadId}`),
          },
        });
      },
    }),
  );

  const normalizedSearch = search.trim().toLowerCase();
  const filteredThreads = (threads.data ?? []).filter((row) =>
    row.title.toLowerCase().includes(normalizedSearch),
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <div className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Link to thread</DialogTitle>
          </DialogHeader>
          <p className="text-sm font-medium">{item.title}</p>
          <Input
            aria-label="Search threads"
            placeholder="Search pending threads"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            autoFocus
          />
          {threads.isPending ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : threads.isError ? (
            <p className="text-sm text-destructive">Could not load threads</p>
          ) : filteredThreads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending threads found.
            </p>
          ) : (
            <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto">
              {filteredThreads.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    disabled={linkToThread.isPending}
                    onClick={() => {
                      linkToThread.mutate({
                        itemId: item.id,
                        threadId: row.id,
                      });
                    }}
                    className="flex w-full rounded-md px-3 py-2 text-left text-sm leading-tight transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-50"
                  >
                    {row.title}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {linkToThread.error !== null ? (
            <p className="text-sm text-destructive">
              Could not link to the thread
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
