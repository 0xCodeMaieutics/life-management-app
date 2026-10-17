"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";

type SettledSectionProps = {
  title: string;
  count: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function SettledSection({
  title,
  count,
  defaultOpen = false,
  children,
}: SettledSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="flex flex-col gap-0.5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "flex w-full items-center gap-3 rounded-[10px] border px-3 py-2 text-sm transition-colors",
          open
            ? "border-primary/80 bg-background"
            : "border-primary/50 bg-background hover:border-primary/70",
        )}
      >
        <span className="shrink-0 font-medium text-muted-foreground">
          {title} ({count})
        </span>
        <span className="h-px min-w-0 flex-1 bg-border/60" aria-hidden="true" />
        {open ? (
          <ChevronUp className="size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open ? <div className="flex flex-col">{children}</div> : null}
    </div>
  );
}
