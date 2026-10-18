"use client";

import { Link as LinkIcon, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

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

  const isPhone = reference.type === "PHONE";
  const Icon = isPhone ? Phone : Mail;

  return (
    <button
      type="button"
      title={`Copy ${reference.value}`}
      className={REFERENCE_LINK_CLASS_NAME}
      onClick={(event) => {
        event.stopPropagation();
        navigator.clipboard.writeText(reference.value).then(
          () => toast.success(isPhone ? "Phone number copied" : "Email copied"),
          () => toast.error("Could not copy"),
        );
      }}
    >
      <Icon className="size-3 shrink-0" />
      <span className="truncate">{label}</span>
    </button>
  );
}
