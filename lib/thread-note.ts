import * as z from "zod";

import {
  type DayPlanItemReference,
  dayPlanItemReferenceSchema,
} from "@/lib/day-plan-item-reference";

export const MAX_THREAD_NOTE_LENGTH = 5000;

export const threadNoteContentSchema = z
  .string()
  .trim()
  .min(1)
  .max(MAX_THREAD_NOTE_LENGTH);

const REFERENCE_NOTE_LABELS = {
  EMAIL: "Email",
  PHONE: "Phone",
  LINK: "URL",
} as const satisfies Record<DayPlanItemReference["type"], string>;

export function threadNoteContentFromReference(
  reference: DayPlanItemReference,
) {
  return `${REFERENCE_NOTE_LABELS[reference.type]}: ${reference.value}`;
}

export type ThreadNoteSegment =
  | { kind: "text"; text: string }
  | { kind: "reference"; reference: DayPlanItemReference };

// Groups: 1 link, 2 email, 3 phone. Phone numbers need a leading `+` or `0`
// so dates and plain numbers stay text.
const REFERENCE_PATTERN =
  /(https?:\/\/[^\s<>]+|www\.[^\s<>]+)|([\w.+-]+@[\w-]+(?:\.[\w-]+)+)|((?:\+|\b0)[\d ()/-]{5,}\d)/g;

const TRAILING_LINK_PUNCTUATION = /[.,;:!?)\]'"]+$/;

const MIN_PHONE_DIGITS = 7;

function referenceFromMatch(
  match: RegExpMatchArray,
): { reference: DayPlanItemReference; matchedText: string } | null {
  const [, link, email, phone] = match;

  if (link !== undefined) {
    const matchedText = link.replace(TRAILING_LINK_PUNCTUATION, "");
    const parsed = dayPlanItemReferenceSchema.safeParse({
      type: "LINK",
      value: matchedText,
    });
    return parsed.success ? { reference: parsed.data, matchedText } : null;
  }

  if (email !== undefined) {
    const parsed = dayPlanItemReferenceSchema.safeParse({
      type: "EMAIL",
      value: email,
    });
    return parsed.success
      ? { reference: parsed.data, matchedText: email }
      : null;
  }

  const matchedText = phone;
  if (
    matchedText === undefined ||
    (matchedText.match(/\d/g) ?? []).length < MIN_PHONE_DIGITS
  ) {
    return null;
  }
  const parsed = dayPlanItemReferenceSchema.safeParse({
    type: "PHONE",
    value: matchedText.replace(/\//g, " "),
  });
  return parsed.success ? { reference: parsed.data, matchedText } : null;
}

export function splitThreadNoteContent(content: string): ThreadNoteSegment[] {
  const segments: ThreadNoteSegment[] = [];
  let textStart = 0;

  for (const match of content.matchAll(REFERENCE_PATTERN)) {
    const found = referenceFromMatch(match);
    if (found === null || match.index === undefined) {
      continue;
    }

    if (match.index > textStart) {
      segments.push({
        kind: "text",
        text: content.slice(textStart, match.index),
      });
    }
    segments.push({ kind: "reference", reference: found.reference });
    textStart = match.index + found.matchedText.length;
  }

  if (textStart < content.length) {
    segments.push({ kind: "text", text: content.slice(textStart) });
  }

  return segments;
}
