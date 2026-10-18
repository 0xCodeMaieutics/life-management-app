"use client";

import { Copy, Link as LinkIcon, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  type DayPlanItemReference,
  formatDayPlanItemReferenceForDisplay,
} from "@/lib/day-plan-item-reference";

const REFERENCE_LINK_CLASS_NAME =
  "inline-flex max-w-64 min-w-0 items-center gap-1 rounded-sm underline underline-offset-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring";

export function DayPlanItemReferenceLink({
  reference,
}: {
  reference: DayPlanItemReference;
}) {
  const label = formatDayPlanItemReferenceForDisplay(reference);

  if (reference.type === "LINK") {
    return (
      <a
        href={reference.value}
        target="_blank"
        rel="noopener noreferrer"
        title={reference.value}
        className={REFERENCE_LINK_CLASS_NAME}
        onClick={(event) => event.stopPropagation()}
      >
        <LinkIcon className="size-3 shrink-0" />
        <span className="truncate">{label}</span>
      </a>
    );
  }

  if (reference.type === "PHONE") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          title={reference.value}
          className={REFERENCE_LINK_CLASS_NAME}
          onClick={(event) => event.stopPropagation()}
        >
          <Phone className="size-3 shrink-0" />
          <span className="truncate">{label}</span>
        </DropdownMenuTrigger>
        {/* Portaled, but React events still bubble to the row's select handler. */}
        <DropdownMenuContent
          className="w-auto"
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.stopPropagation()}
        >
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(reference.value).then(
                () => toast.success("Phone number copied"),
                () => toast.error("Could not copy"),
              );
            }}
          >
            <Copy />
            Copy
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              window.location.href = `tel:${reference.value.replace(/[^\d+]/g, "")}`;
            }}
          >
            <Phone />
            Call
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <button
      type="button"
      title={`Copy ${reference.value}`}
      className={REFERENCE_LINK_CLASS_NAME}
      onClick={(event) => {
        event.stopPropagation();
        navigator.clipboard.writeText(reference.value).then(
          () => toast.success("Email copied"),
          () => toast.error("Could not copy"),
        );
      }}
    >
      <Mail className="size-3 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
