"use server";

import { asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as z from "zod";

import db from "@/lib/db";
import { isValidPlanDateString } from "@/lib/plan-date";
import { dayPlan, dayPlanItem, todo } from "@/lib/schema";

const planDateSchema = z.string().refine(isValidPlanDateString);

export async function createDayPlan(planDate: string, todoIds: string[]) {
  const dateResult = planDateSchema.safeParse(planDate);
  const idsResult = z.array(z.uuid()).min(1).safeParse(todoIds);

  if (!dateResult.success || !idsResult.success) {
    return { ok: false as const, error: "invalid" as const };
  }

  const date = dateResult.data;
  const ids = idsResult.data;

  try {
    const existing = await db
      .select({ id: dayPlan.id })
      .from(dayPlan)
      .where(eq(dayPlan.date, date))
      .limit(1);

    if (existing.length > 0) {
      return { ok: false as const, error: "exists" as const };
    }

    const selectedTodos = await db
      .select({
        id: todo.id,
        title: todo.title,
        targetTime: todo.targetTime,
      })
      .from(todo)
      .where(inArray(todo.id, ids))
      .orderBy(asc(todo.createdAt));

    if (selectedTodos.length === 0) {
      return { ok: false as const, error: "invalid" as const };
    }

    await db.transaction(async (tx) => {
      const [createdPlan] = await tx
        .insert(dayPlan)
        .values({ date })
        .returning({ id: dayPlan.id });

      await tx.insert(dayPlanItem).values(
        selectedTodos.map((row) => ({
          dayPlanId: createdPlan.id,
          title: row.title,
          targetTime: row.targetTime,
          completed: false,
        })),
      );
    });

    revalidatePath("/day-plan");
    return { ok: true as const };
  } catch (error) {
    console.error(error);
    return { ok: false as const, error: "failed" as const };
  }
}

export async function setDayPlanItemCompleted(
  itemId: string,
  completed: boolean,
) {
  const parsed = z.uuid().safeParse(itemId);
  if (!parsed.success) {
    return { ok: false as const };
  }

  try {
    await db
      .update(dayPlanItem)
      .set({ completed })
      .where(eq(dayPlanItem.id, parsed.data));
    revalidatePath("/day-plan");
    return { ok: true as const };
  } catch (error) {
    console.error(error);
    return { ok: false as const };
  }
}

export async function deleteDayPlanItem(itemId: string) {
  const parsed = z.uuid().safeParse(itemId);
  if (!parsed.success) {
    return { ok: false as const };
  }

  try {
    await db.transaction(async (tx) => {
      const [item] = await tx
        .select({
          id: dayPlanItem.id,
          dayPlanId: dayPlanItem.dayPlanId,
        })
        .from(dayPlanItem)
        .where(eq(dayPlanItem.id, parsed.data))
        .limit(1);

      if (item === undefined) {
        return;
      }

      await tx.delete(dayPlanItem).where(eq(dayPlanItem.id, item.id));

      const remaining = await tx
        .select({ id: dayPlanItem.id })
        .from(dayPlanItem)
        .where(eq(dayPlanItem.dayPlanId, item.dayPlanId));

      if (remaining.length === 0) {
        await tx.delete(dayPlan).where(eq(dayPlan.id, item.dayPlanId));
      }
    });

    revalidatePath("/day-plan");
    return { ok: true as const };
  } catch (error) {
    console.error(error);
    return { ok: false as const };
  }
}
