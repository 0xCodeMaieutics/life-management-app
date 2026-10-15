"use server";

import { asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as z from "zod";

import {
  deletedDayPlanItemSchema,
  type DeletedDayPlanItem,
} from "@/lib/day-plan-deleted-item";
import db from "@/lib/db";
import { isValidPlanDateString } from "@/lib/plan-date";
import { dayPlan, dayPlanItem, todo } from "@/lib/schema";
import { dayPlanItemTargetTimeSchema } from "@/lib/target-time";

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

export async function addTodosToDayPlan(planDate: string, todoIds: string[]) {
  const dateResult = planDateSchema.safeParse(planDate);
  const idsResult = z.array(z.uuid()).min(1).safeParse(todoIds);

  if (!dateResult.success || !idsResult.success) {
    return { ok: false as const, error: "invalid" as const };
  }

  try {
    const [plan] = await db
      .select({ id: dayPlan.id })
      .from(dayPlan)
      .where(eq(dayPlan.date, dateResult.data))
      .limit(1);

    if (plan === undefined) {
      return { ok: false as const, error: "missing" as const };
    }

    const selectedTodos = await db
      .select({
        title: todo.title,
        targetTime: todo.targetTime,
      })
      .from(todo)
      .where(inArray(todo.id, idsResult.data))
      .orderBy(asc(todo.createdAt));

    if (selectedTodos.length === 0) {
      return { ok: false as const, error: "invalid" as const };
    }

    await db.insert(dayPlanItem).values(
      selectedTodos.map((row) => ({
        dayPlanId: plan.id,
        title: row.title,
        targetTime: row.targetTime,
        completed: false,
      })),
    );

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

export async function updateDayPlanItemSchedule(
  itemId: string,
  planDate: string,
  targetTime: string | null,
) {
  const idResult = z.uuid().safeParse(itemId);
  const dateResult = planDateSchema.safeParse(planDate);
  const timeResult = dayPlanItemTargetTimeSchema.safeParse(targetTime);

  if (!idResult.success || !dateResult.success || !timeResult.success) {
    return { ok: false as const };
  }

  try {
    let isUpdated = false;

    await db.transaction(async (tx) => {
      const [item] = await tx
        .select({ dayPlanId: dayPlanItem.dayPlanId })
        .from(dayPlanItem)
        .where(eq(dayPlanItem.id, idResult.data))
        .limit(1);

      if (item === undefined) {
        return;
      }

      const [planForDate] = await tx
        .select({ id: dayPlan.id })
        .from(dayPlan)
        .where(eq(dayPlan.date, dateResult.data))
        .limit(1);

      let dayPlanId: string;
      if (planForDate !== undefined) {
        dayPlanId = planForDate.id;
      } else {
        const [createdPlan] = await tx
          .insert(dayPlan)
          .values({ date: dateResult.data })
          .returning({ id: dayPlan.id });
        dayPlanId = createdPlan.id;
      }

      await tx
        .update(dayPlanItem)
        .set({ dayPlanId, targetTime: timeResult.data })
        .where(eq(dayPlanItem.id, idResult.data));

      if (dayPlanId !== item.dayPlanId) {
        const remaining = await tx
          .select({ id: dayPlanItem.id })
          .from(dayPlanItem)
          .where(eq(dayPlanItem.dayPlanId, item.dayPlanId))
          .limit(1);

        if (remaining.length === 0) {
          await tx.delete(dayPlan).where(eq(dayPlan.id, item.dayPlanId));
        }
      }

      isUpdated = true;
    });

    if (!isUpdated) {
      return { ok: false as const };
    }

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
    let deleted: DeletedDayPlanItem | undefined;

    await db.transaction(async (tx) => {
      const [item] = await tx
        .select({
          id: dayPlanItem.id,
          dayPlanId: dayPlanItem.dayPlanId,
          planDate: dayPlan.date,
          title: dayPlanItem.title,
          targetTime: dayPlanItem.targetTime,
          completed: dayPlanItem.completed,
        })
        .from(dayPlanItem)
        .innerJoin(dayPlan, eq(dayPlanItem.dayPlanId, dayPlan.id))
        .where(eq(dayPlanItem.id, parsed.data))
        .limit(1);

      if (item === undefined) {
        return;
      }

      const snapshot = deletedDayPlanItemSchema.safeParse({
        id: item.id,
        planDate: item.planDate,
        title: item.title,
        targetTime: item.targetTime,
        completed: item.completed,
      });
      if (!snapshot.success) {
        return;
      }
      deleted = snapshot.data;

      await tx.delete(dayPlanItem).where(eq(dayPlanItem.id, item.id));

      const remaining = await tx
        .select({ id: dayPlanItem.id })
        .from(dayPlanItem)
        .where(eq(dayPlanItem.dayPlanId, item.dayPlanId));

      if (remaining.length === 0) {
        await tx.delete(dayPlan).where(eq(dayPlan.id, item.dayPlanId));
      }
    });

    if (deleted === undefined) {
      return { ok: false as const };
    }

    revalidatePath("/day-plan");
    return { ok: true as const, deleted };
  } catch (error) {
    console.error(error);
    return { ok: false as const };
  }
}

export async function restoreDayPlanItem(deleted: DeletedDayPlanItem) {
  const parsed = deletedDayPlanItemSchema.safeParse(deleted);
  if (!parsed.success) {
    return { ok: false as const };
  }

  const snapshot = parsed.data;

  try {
    await db.transaction(async (tx) => {
      const [existingItem] = await tx
        .select({ id: dayPlanItem.id })
        .from(dayPlanItem)
        .where(eq(dayPlanItem.id, snapshot.id))
        .limit(1);

      if (existingItem !== undefined) {
        throw new Error("item already exists");
      }

      const [planForDate] = await tx
        .select({ id: dayPlan.id })
        .from(dayPlan)
        .where(eq(dayPlan.date, snapshot.planDate))
        .limit(1);

      let dayPlanId: string;
      if (planForDate !== undefined) {
        dayPlanId = planForDate.id;
      } else {
        const [createdPlan] = await tx
          .insert(dayPlan)
          .values({ date: snapshot.planDate })
          .returning({ id: dayPlan.id });
        dayPlanId = createdPlan.id;
      }

      await tx.insert(dayPlanItem).values({
        id: snapshot.id,
        dayPlanId,
        title: snapshot.title,
        targetTime: snapshot.targetTime,
        completed: snapshot.completed,
      });
    });

    revalidatePath("/day-plan");
    return { ok: true as const };
  } catch (error) {
    console.error(error);
    return { ok: false as const };
  }
}
