"use server";

import { asc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import * as z from "zod";

import {
  deletedDayPlanItemSchema,
  type DeletedDayPlanItem,
} from "@/lib/day-plan-deleted-item";
import {
  dayPlanItemReferenceFromColumns,
  parseDayPlanItemReferenceFormData,
} from "@/lib/day-plan-item-reference";
import {
  cancelDayPlanItemReminderByItemId,
  rescheduleDayPlanItemReminderForPlanDate,
} from "@/lib/day-plan-reminders";
import db from "@/lib/db";
import { isValidPlanDateString, shiftLocalDateString } from "@/lib/plan-date";
import { dayPlan, dayPlanItem, dayPlanItemSteps, todo } from "@/lib/schema";
import {
  dayPlanItemTargetTimeSchema,
  targetTimeSchema,
} from "@/lib/target-time";

const planDateSchema = z.string().refine(isValidPlanDateString);

const copyDayPlanItemDayOffsetSchema = z.number().int().min(1).max(120);

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
          todoId: row.id,
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

export type DayPlanItemActionState = { errorMessage: string | null };

const MAX_TITLE_LENGTH = 200;

export async function createDayPlanItem(
  _previousState: DayPlanItemActionState,
  formData: FormData,
): Promise<DayPlanItemActionState> {
  const targetTimeValue = formData.get("targetTime");
  const parsed = z
    .object({
      planDate: planDateSchema,
      title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
      targetTime: dayPlanItemTargetTimeSchema,
    })
    .safeParse({
      planDate: formData.get("planDate"),
      title: formData.get("title"),
      targetTime: targetTimeValue === "" ? null : targetTimeValue,
    });

  const referenceResult = parseDayPlanItemReferenceFormData(formData);

  if (!parsed.success || !referenceResult.success) {
    return { errorMessage: "Invalid day plan item" };
  }

  const { planDate, title, targetTime } = parsed.data;
  const reference = referenceResult.data;

  try {
    await db.transaction(async (tx) => {
      const [planForDate] = await tx
        .select({ id: dayPlan.id })
        .from(dayPlan)
        .where(eq(dayPlan.date, planDate))
        .limit(1);

      let dayPlanId: string;
      if (planForDate !== undefined) {
        dayPlanId = planForDate.id;
      } else {
        const [createdPlan] = await tx
          .insert(dayPlan)
          .values({ date: planDate })
          .returning({ id: dayPlan.id });
        dayPlanId = createdPlan.id;
      }

      await tx.insert(dayPlanItem).values({
        dayPlanId,
        title,
        targetTime,
        completed: false,
        referenceType: reference?.type ?? null,
        referenceValue: reference?.value ?? null,
      });
    });

    revalidatePath("/day-plan");
    return { errorMessage: null };
  } catch (error) {
    console.error(error);
    return { errorMessage: "Could not create day plan item" };
  }
}

const stepsCountSchema = z.number().int().min(1).max(999_999);

export async function createCompletedStepsDayPlanItem(
  planDate: string,
  steps: number,
  targetTime: string,
) {
  const dateResult = planDateSchema.safeParse(planDate);
  const stepsResult = stepsCountSchema.safeParse(steps);
  const timeResult = targetTimeSchema.safeParse(targetTime);

  if (!dateResult.success || !stepsResult.success || !timeResult.success) {
    return { ok: false as const, error: "invalid" as const };
  }

  const title = `Walk ${stepsResult.data} steps`;

  try {
    await db.transaction(async (tx) => {
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

      const [createdItem] = await tx
        .insert(dayPlanItem)
        .values({
          dayPlanId,
          title,
          targetTime: timeResult.data,
          completed: true,
        })
        .returning({ id: dayPlanItem.id });

      await tx.insert(dayPlanItemSteps).values({
        dayPlanItemId: createdItem.id,
        steps: stepsResult.data,
      });
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
        id: todo.id,
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
        todoId: row.id,
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
    const [stepsLog] = await db
      .select({ id: dayPlanItemSteps.id })
      .from(dayPlanItemSteps)
      .where(eq(dayPlanItemSteps.dayPlanItemId, parsed.data))
      .limit(1);
    if (stepsLog !== undefined) {
      return { ok: false as const };
    }

    if (completed) {
      await cancelDayPlanItemReminderByItemId(parsed.data);
    }

    await db
      .update(dayPlanItem)
      .set(completed ? { completed: true, cancelled: false } : { completed })
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

    try {
      await rescheduleDayPlanItemReminderForPlanDate(
        idResult.data,
        dateResult.data,
      );
    } catch (error) {
      console.error(error);
      return { ok: false as const };
    }

    revalidatePath("/day-plan");
    return { ok: true as const };
  } catch (error) {
    console.error(error);
    return { ok: false as const };
  }
}

export async function updateDayPlanItemReference(
  _previousState: DayPlanItemActionState,
  formData: FormData,
): Promise<DayPlanItemActionState> {
  const idResult = z.uuid().safeParse(formData.get("itemId"));
  const referenceResult = parseDayPlanItemReferenceFormData(formData);

  if (!idResult.success || !referenceResult.success) {
    return { errorMessage: "Invalid reference" };
  }

  const reference = referenceResult.data;

  try {
    const [stepsLog] = await db
      .select({ id: dayPlanItemSteps.id })
      .from(dayPlanItemSteps)
      .where(eq(dayPlanItemSteps.dayPlanItemId, idResult.data))
      .limit(1);
    if (stepsLog !== undefined) {
      return { errorMessage: "Invalid reference" };
    }

    const [item] = await db
      .select({ planDate: dayPlan.date })
      .from(dayPlanItem)
      .innerJoin(dayPlan, eq(dayPlanItem.dayPlanId, dayPlan.id))
      .where(eq(dayPlanItem.id, idResult.data))
      .limit(1);
    if (item === undefined) {
      return { errorMessage: "Invalid reference" };
    }

    await db
      .update(dayPlanItem)
      .set({
        referenceType: reference?.type ?? null,
        referenceValue: reference?.value ?? null,
      })
      .where(eq(dayPlanItem.id, idResult.data));

    await rescheduleDayPlanItemReminderForPlanDate(
      idResult.data,
      item.planDate,
    );

    revalidatePath("/day-plan");
    return { errorMessage: null };
  } catch (error) {
    console.error(error);
    return { errorMessage: "Could not update the reference" };
  }
}

export async function setDayPlanItemCancelled(
  itemId: string,
  cancelled: boolean,
) {
  const parsed = z.uuid().safeParse(itemId);
  if (!parsed.success) {
    return { ok: false as const };
  }

  try {
    const [stepsLog] = await db
      .select({ id: dayPlanItemSteps.id })
      .from(dayPlanItemSteps)
      .where(eq(dayPlanItemSteps.dayPlanItemId, parsed.data))
      .limit(1);
    if (stepsLog !== undefined) {
      return { ok: false as const };
    }

    if (cancelled) {
      await cancelDayPlanItemReminderByItemId(parsed.data);
      await db
        .update(dayPlanItem)
        .set({ cancelled: true, completed: false })
        .where(eq(dayPlanItem.id, parsed.data));
    } else {
      await db
        .update(dayPlanItem)
        .set({ cancelled: false })
        .where(eq(dayPlanItem.id, parsed.data));
    }

    revalidatePath("/day-plan");
    return { ok: true as const };
  } catch (error) {
    console.error(error);
    return { ok: false as const };
  }
}

export async function duplicateDayPlanItem(itemId: string) {
  const parsed = z.uuid().safeParse(itemId);
  if (!parsed.success) {
    return { ok: false as const };
  }

  try {
    let isDuplicated = false;

    await db.transaction(async (tx) => {
      const [item] = await tx
        .select({
          dayPlanId: dayPlanItem.dayPlanId,
          todoId: dayPlanItem.todoId,
          title: dayPlanItem.title,
          targetTime: dayPlanItem.targetTime,
          referenceType: dayPlanItem.referenceType,
          referenceValue: dayPlanItem.referenceValue,
        })
        .from(dayPlanItem)
        .where(eq(dayPlanItem.id, parsed.data))
        .limit(1);

      if (item === undefined) {
        return;
      }

      await tx.insert(dayPlanItem).values({
        dayPlanId: item.dayPlanId,
        todoId: item.todoId,
        title: item.title,
        targetTime: item.targetTime,
        completed: false,
        referenceType: item.referenceType,
        referenceValue: item.referenceValue,
      });

      isDuplicated = true;
    });

    if (!isDuplicated) {
      return { ok: false as const };
    }

    revalidatePath("/day-plan");
    return { ok: true as const };
  } catch (error) {
    console.error(error);
    return { ok: false as const };
  }
}

export async function copyDayPlanItemToNthDay(
  itemId: string,
  dayOffset: number,
) {
  const parsed = z.uuid().safeParse(itemId);
  const offsetResult = copyDayPlanItemDayOffsetSchema.safeParse(dayOffset);
  if (!parsed.success || !offsetResult.success) {
    return { ok: false as const };
  }

  try {
    let isCopied = false;

    await db.transaction(async (tx) => {
      const [item] = await tx
        .select({
          todoId: dayPlanItem.todoId,
          title: dayPlanItem.title,
          targetTime: dayPlanItem.targetTime,
          referenceType: dayPlanItem.referenceType,
          referenceValue: dayPlanItem.referenceValue,
          planDate: dayPlan.date,
        })
        .from(dayPlanItem)
        .innerJoin(dayPlan, eq(dayPlanItem.dayPlanId, dayPlan.id))
        .where(eq(dayPlanItem.id, parsed.data))
        .limit(1);

      if (item === undefined) {
        return;
      }

      const targetPlanDate = shiftLocalDateString(
        item.planDate,
        offsetResult.data,
      );

      const [planForDate] = await tx
        .select({ id: dayPlan.id })
        .from(dayPlan)
        .where(eq(dayPlan.date, targetPlanDate))
        .limit(1);

      let dayPlanId: string;
      if (planForDate !== undefined) {
        dayPlanId = planForDate.id;
      } else {
        const [createdPlan] = await tx
          .insert(dayPlan)
          .values({ date: targetPlanDate })
          .returning({ id: dayPlan.id });
        dayPlanId = createdPlan.id;
      }

      await tx.insert(dayPlanItem).values({
        dayPlanId,
        todoId: item.todoId,
        title: item.title,
        targetTime: item.targetTime,
        completed: false,
        referenceType: item.referenceType,
        referenceValue: item.referenceValue,
      });

      isCopied = true;
    });

    if (!isCopied) {
      return { ok: false as const };
    }

    revalidatePath("/day-plan");
    return { ok: true as const };
  } catch (error) {
    console.error(error);
    return { ok: false as const };
  }
}

export async function copyDayPlanItemToNextDay(itemId: string) {
  return copyDayPlanItemToNthDay(itemId, 1);
}

export async function deleteDayPlanItem(itemId: string) {
  const parsed = z.uuid().safeParse(itemId);
  if (!parsed.success) {
    return { ok: false as const };
  }

  try {
    let deleted: DeletedDayPlanItem | undefined;

    await cancelDayPlanItemReminderByItemId(parsed.data);

    await db.transaction(async (tx) => {
      const [item] = await tx
        .select({
          id: dayPlanItem.id,
          dayPlanId: dayPlanItem.dayPlanId,
          planDate: dayPlan.date,
          todoId: dayPlanItem.todoId,
          title: dayPlanItem.title,
          targetTime: dayPlanItem.targetTime,
          completed: dayPlanItem.completed,
          cancelled: dayPlanItem.cancelled,
          referenceType: dayPlanItem.referenceType,
          referenceValue: dayPlanItem.referenceValue,
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
        cancelled: item.cancelled,
        todoId: item.todoId,
        reference: dayPlanItemReferenceFromColumns(
          item.referenceType,
          item.referenceValue,
        ),
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
        todoId: snapshot.todoId,
        title: snapshot.title,
        targetTime: snapshot.targetTime,
        completed: snapshot.completed,
        cancelled: snapshot.cancelled,
        referenceType: snapshot.reference?.type ?? null,
        referenceValue: snapshot.reference?.value ?? null,
      });
    });

    revalidatePath("/day-plan");
    return { ok: true as const };
  } catch (error) {
    console.error(error);
    return { ok: false as const };
  }
}
