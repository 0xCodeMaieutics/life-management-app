"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as z from "zod";

import db from "@/lib/db";
import {
  cancelReadReminderByReadId,
  refreshReadReminderTelegramMessage,
} from "@/lib/read-reminders";
import { read } from "@/lib/schema";
import { isTelegramConfigured } from "@/lib/telegram/client";

const MAX_TITLE_LENGTH = 200;
const MAX_URL_LENGTH = 2048;

const optionalTitleSchema = z
  .string()
  .trim()
  .max(MAX_TITLE_LENGTH)
  .transform((value) => (value === "" ? null : value));

const readFieldsSchema = z.object({
  url: z.string().trim().url().max(MAX_URL_LENGTH),
  title: optionalTitleSchema,
});

export type ReadActionState = { errorMessage: string | null };

export async function createRead(
  _previousState: ReadActionState,
  formData: FormData,
): Promise<ReadActionState> {
  const titleValue = formData.get("title");
  const parsed = readFieldsSchema.safeParse({
    url: formData.get("url"),
    title: titleValue === null ? "" : titleValue,
  });

  if (!parsed.success) {
    return { errorMessage: "Invalid link" };
  }

  try {
    await db.insert(read).values(parsed.data);
    revalidatePath("/later-reads");
    return { errorMessage: null };
  } catch (error) {
    console.error(error);
    return { errorMessage: "Could not add link" };
  }
}

function parseReadFields(
  id: string,
  url: string,
  title: string,
): (z.infer<typeof readFieldsSchema> & { id: string }) | null {
  const parsed = readFieldsSchema.extend({ id: z.uuid() }).safeParse({
    id,
    url,
    title,
  });
  return parsed.success ? parsed.data : null;
}

export async function updateReadFields(
  readId: string,
  url: string,
  title: string,
) {
  const parsed = parseReadFields(readId, url, title);
  if (parsed === null) {
    return { ok: false as const };
  }

  const { id, ...values } = parsed;

  try {
    await db.update(read).set(values).where(eq(read.id, id));

    if (isTelegramConfigured()) {
      const refreshed = await refreshReadReminderTelegramMessage(id);
      if (!refreshed.ok) {
        return { ok: false as const };
      }
    }

    revalidatePath("/later-reads");
    return { ok: true as const };
  } catch (error) {
    console.error(error);
    return { ok: false as const };
  }
}

export async function markReadFinished(readId: string) {
  const parsed = z.uuid().safeParse(readId);
  if (!parsed.success) {
    return { ok: false as const };
  }

  try {
    await cancelReadReminderByReadId(parsed.data);
    await db
      .update(read)
      .set({ type: "MARK_AS_RESOLVED", finishedAt: new Date() })
      .where(and(eq(read.id, parsed.data), eq(read.type, "IDLE")));
    revalidatePath("/later-reads");
    return { ok: true as const };
  } catch (error) {
    console.error(error);
    return { ok: false as const };
  }
}
