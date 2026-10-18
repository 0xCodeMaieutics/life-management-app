import * as z from "zod";

export const DAY_PLAN_ITEM_REFERENCE_TYPES = [
  "PHONE",
  "EMAIL",
  "LINK",
] as const;

export type DayPlanItemReferenceType =
  (typeof DAY_PLAN_ITEM_REFERENCE_TYPES)[number];

const MIN_PHONE_DIGITS = 5;

const phoneValueSchema = z
  .string()
  .trim()
  .max(50)
  .regex(/^[+\d\s()-]+$/)
  .refine((value) => (value.match(/\d/g) ?? []).length >= MIN_PHONE_DIGITS);

const emailValueSchema = z.string().trim().max(254).pipe(z.email());

const linkValueSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .transform((value, ctx) => {
    // A colon followed by a digit is a port (`localhost:3000`), not a scheme.
    const hasScheme = /^[a-z][a-z\d+.-]*:(?!\d)/i.test(value);
    let url: URL;
    try {
      url = new URL(hasScheme ? value : `https://${value}`);
    } catch {
      ctx.addIssue({ code: "custom", message: "Invalid URL" });
      return z.NEVER;
    }
    // Rendered as a clickable href, so `javascript:` and friends must never pass.
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      ctx.addIssue({ code: "custom", message: "Use an http or https URL" });
      return z.NEVER;
    }
    return url.toString();
  });

export const dayPlanItemReferenceSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PHONE"), value: phoneValueSchema }),
  z.object({ type: z.literal("EMAIL"), value: emailValueSchema }),
  z.object({ type: z.literal("LINK"), value: linkValueSchema }),
]);

export type DayPlanItemReference = z.infer<typeof dayPlanItemReferenceSchema>;

export function parseDayPlanItemReferenceFormData(formData: FormData) {
  if (formData.get("hasReference") !== "on") {
    return { success: true as const, data: null };
  }
  return dayPlanItemReferenceSchema.safeParse({
    type: formData.get("referenceType"),
    value: formData.get("referenceValue"),
  });
}

export function dayPlanItemReferenceFromColumns(
  type: DayPlanItemReferenceType | null,
  value: string | null,
): DayPlanItemReference | null {
  if (type === null || value === null) {
    return null;
  }
  return { type, value };
}

export function formatDayPlanItemReferenceForDisplay(
  reference: DayPlanItemReference,
) {
  if (reference.type !== "LINK") {
    return reference.value;
  }
  return reference.value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}
