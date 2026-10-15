"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as z from "zod";

import db from "@/lib/db";
import { todo } from "@/lib/schema";
import { targetTimeSchema } from "@/lib/target-time";

const MAX_TITLE_LENGTH = 200;

const todoFieldsSchema = z.object({
  title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
  targetTime: targetTimeSchema,
});

export type TodoActionState = { errorMessage: string | null };

export async function createTodo(
  _previousState: TodoActionState,
  formData: FormData,
): Promise<TodoActionState> {
  const parsed = todoFieldsSchema.safeParse({
    title: formData.get("title"),
    targetTime: formData.get("targetTime"),
  });

  if (!parsed.success) {
    return { errorMessage: "Invalid todo" };
  }

  try {
    await db.insert(todo).values(parsed.data);
    revalidatePath("/todos");
    revalidatePath("/day-plan");
    return { errorMessage: null };
  } catch (error) {
    console.error(error);
    return { errorMessage: "Could not create todo" };
  }
}

export async function updateTodo(
  _previousState: TodoActionState,
  formData: FormData,
): Promise<TodoActionState> {
  const parsed = todoFieldsSchema
    .extend({ id: z.uuid() })
    .safeParse({
      id: formData.get("id"),
      title: formData.get("title"),
      targetTime: formData.get("targetTime"),
    });

  if (!parsed.success) {
    return { errorMessage: "Invalid todo" };
  }

  const { id, ...values } = parsed.data;

  try {
    await db.update(todo).set(values).where(eq(todo.id, id));
    revalidatePath("/todos");
    revalidatePath("/day-plan");
    return { errorMessage: null };
  } catch (error) {
    console.error(error);
    return { errorMessage: "Could not update todo" };
  }
}

export async function deleteTodo(todoId: string) {
  const parsed = z.uuid().safeParse(todoId);
  if (!parsed.success) {
    return { ok: false as const };
  }

  try {
    await db.delete(todo).where(eq(todo.id, parsed.data));
    revalidatePath("/todos");
    revalidatePath("/day-plan");
    return { ok: true as const };
  } catch (error) {
    console.error(error);
    return { ok: false as const };
  }
}
