"use client";

import {
  differenceInDays,
  differenceInHours,
  differenceInMinutes,
} from "date-fns";
import { BookMarked } from "lucide-react";

export type ReadFinishedRowData = {
  id: string;
  url: string;
  title: string | null;
  finishedAt: string;
};

function readFinishedLabel(read: ReadFinishedRowData) {
  if (read.title !== null && read.title !== "") {
    return read.title;
  }

  return read.url;
}

function formatShortRelativeTime(finishedAt: string) {
  const date = new Date(finishedAt);
  const now = new Date();
  const minutes = Math.max(0, differenceInMinutes(now, date));
  if (minutes < 60) {
    return `${minutes}m`;
  }

  const hours = differenceInHours(now, date);
  if (hours < 24) {
    return `${hours}h`;
  }

  const days = differenceInDays(now, date);
  return `${days}d`;
}

export function ReadFinishedRow({ read }: { read: ReadFinishedRowData }) {
  const label = readFinishedLabel(read);

  return (
    <a
      href={read.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <BookMarked className="size-3.5 shrink-0 opacity-70" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="shrink-0 text-xs tabular-nums opacity-70">
        {formatShortRelativeTime(read.finishedAt)}
      </span>
    </a>
  );
}
