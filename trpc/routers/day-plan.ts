import { TRPCError } from "@trpc/server";
import { asc, eq, inArray } from "drizzle-orm";
import * as z from "zod";

import { deletedDayPlanItemSchema } from "@/lib/day-plan-deleted-item";
import {
  cancelDayPlanItemFollowUp,
  hasDayPlanItemFollowUpStarted,
  isDayPlanItemFollowUpPending,
  startDayPlanItemFollowUp,
  stopPendingDayPlanItemFollowUp,
} from "@/lib/day-plan-follow-ups";
import {
  dayPlanItemReferenceFromColumns,
  dayPlanItemReferenceSchema,
} from "@/lib/day-plan-item-reference";
import {
  cancelDayPlanItemReminderByItemId,
  getDayPlanItemWithPlanDate,
  rescheduleDayPlanItemReminderForPlanDate,
  scheduleDayPlanItemReminder,
} from "@/lib/day-plan-reminders";
import db from "@/lib/db";
import { followUpFromColumns, followUpSchema } from "@/lib/follow-up";
import { isValidPlanDateString, shiftLocalDateString } from "@/lib/plan-date";
import { ianaTimeZoneSchema } from "@/lib/remind-at";
import {
  dayPlan,
  dayPlanItem,
  dayPlanItemFollowUp,
  dayPlanItemSteps,
  todo,
} from "@/lib/schema";
import {
  dayPlanItemTargetTimeSchema,
  targetTimeSchema,
} from "@/lib/target-time";
import { isTelegramConfigured } from "@/lib/telegram/client";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

const MAX_TITLE_LENGTH = 200;

const planDateSchema = z.string().refine(isValidPlanDateString);

const copyDayPlanItemDayOffsetSchema = z.number().int().min(1).max(120);

const stepsCountSchema = z.number().int().min(1).max(999_999);

const itemIdInputSchema = z.object({ itemId: z.uuid() });

const todoSelectionInputSchema = z.object({
  planDate: planDateSchema,
  todoIds: z.array(z.uuid()).min(1),
});

export const dayPlanRouter = createTRPCRouter({
  create: baseProcedure
    .input(todoSelectionInputSchema)
    .mutation(async ({ input }) => {
      const existing = await db
        .select({ id: dayPlan.id })
        .from(dayPlan)
        .where(eq(dayPlan.date, input.planDate))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({ code: "CONFLICT" });
      }

      const selectedTodos = await db
        .select({
          id: todo.id,
          title: todo.title,
          targetTime: todo.targetTime,
          followUpMinutes: todo.followUpMinutes,
          followUpMessage: todo.followUpMessage,
        })
        .from(todo)
        .where(inArray(todo.id, input.todoIds))
        .orderBy(asc(todo.createdAt));

      if (selectedTodos.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      await db.transaction(async (tx) => {
        const [createdPlan] = await tx
          .insert(dayPlan)
          .values({ date: input.planDate })
          .returning({ id: dayPlan.id });

        await tx.insert(dayPlanItem).values(
          selectedTodos.map((row) => ({
            dayPlanId: createdPlan.id,
            todoId: row.id,
            title: row.title,
            targetTime: row.targetTime,
            completed: false,
            followUpMinutes: row.followUpMinutes,
            followUpMessage: row.followUpMessage,
          })),
        );
      });
    }),

  addTodos: baseProcedure
    .input(todoSelectionInputSchema)
    .mutation(async ({ input }) => {
      const [plan] = await db
        .select({ id: dayPlan.id })
        .from(dayPlan)
        .where(eq(dayPlan.date, input.planDate))
        .limit(1);

      if (plan === undefined) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const selectedTodos = await db
        .select({
          id: todo.id,
          title: todo.title,
          targetTime: todo.targetTime,
          followUpMinutes: todo.followUpMinutes,
          followUpMessage: todo.followUpMessage,
        })
        .from(todo)
        .where(inArray(todo.id, input.todoIds))
        .orderBy(asc(todo.createdAt));

      if (selectedTodos.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      await db.insert(dayPlanItem).values(
        selectedTodos.map((row) => ({
          dayPlanId: plan.id,
          todoId: row.id,
          title: row.title,
          targetTime: row.targetTime,
          completed: false,
          followUpMinutes: row.followUpMinutes,
          followUpMessage: row.followUpMessage,
        })),
      );
    }),

  createItem: baseProcedure
    .input(
      z.object({
        planDate: planDateSchema,
        title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
        targetTime: dayPlanItemTargetTimeSchema,
        reference: dayPlanItemReferenceSchema.nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      await db.transaction(async (tx) => {
        const [planForDate] = await tx
          .select({ id: dayPlan.id })
          .from(dayPlan)
          .where(eq(dayPlan.date, input.planDate))
          .limit(1);

        let dayPlanId: string;
        if (planForDate !== undefined) {
          dayPlanId = planForDate.id;
        } else {
          const [createdPlan] = await tx
            .insert(dayPlan)
            .values({ date: input.planDate })
            .returning({ id: dayPlan.id });
          dayPlanId = createdPlan.id;
        }

        await tx.insert(dayPlanItem).values({
          dayPlanId,
          title: input.title,
          targetTime: input.targetTime,
          completed: false,
          referenceType: input.reference?.type ?? null,
          referenceValue: input.reference?.value ?? null,
        });
      });
    }),

  createStepsItem: baseProcedure
    .input(
      z.object({
        planDate: planDateSchema,
        steps: stepsCountSchema,
        targetTime: targetTimeSchema,
      }),
    )
    .mutation(async ({ input }) => {
      await db.transaction(async (tx) => {
        const [planForDate] = await tx
          .select({ id: dayPlan.id })
          .from(dayPlan)
          .where(eq(dayPlan.date, input.planDate))
          .limit(1);

        let dayPlanId: string;
        if (planForDate !== undefined) {
          dayPlanId = planForDate.id;
        } else {
          const [createdPlan] = await tx
            .insert(dayPlan)
            .values({ date: input.planDate })
            .returning({ id: dayPlan.id });
          dayPlanId = createdPlan.id;
        }

        const [createdItem] = await tx
          .insert(dayPlanItem)
          .values({
            dayPlanId,
            title: `Walk ${input.steps} steps`,
            targetTime: input.targetTime,
            completed: true,
          })
          .returning({ id: dayPlanItem.id });

        await tx.insert(dayPlanItemSteps).values({
          dayPlanItemId: createdItem.id,
          steps: input.steps,
        });
      });
    }),

  setItemCompleted: baseProcedure
    .input(
      itemIdInputSchema.extend({
        completed: z.boolean(),
        timeZone: ianaTimeZoneSchema,
      }),
    )
    .mutation(async ({ input }) => {
      const [stepsLog] = await db
        .select({ id: dayPlanItemSteps.id })
        .from(dayPlanItemSteps)
        .where(eq(dayPlanItemSteps.dayPlanItemId, input.itemId))
        .limit(1);
      if (stepsLog !== undefined) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      if (!input.completed) {
        await stopPendingDayPlanItemFollowUp(input.itemId);
        await db
          .update(dayPlanItem)
          .set({ completed: false })
          .where(eq(dayPlanItem.id, input.itemId));
        return { followUpSendAt: null, hasFollowUpFailed: false };
      }

      await cancelDayPlanItemReminderByItemId(input.itemId);

      const [item] = await db
        .update(dayPlanItem)
        .set({ completed: true, cancelled: false })
        .where(eq(dayPlanItem.id, input.itemId))
        .returning({
          title: dayPlanItem.title,
          followUpMinutes: dayPlanItem.followUpMinutes,
          followUpMessage: dayPlanItem.followUpMessage,
        });
      if (item === undefined) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const followUp = followUpFromColumns(
        item.followUpMinutes,
        item.followUpMessage,
      );
      if (
        followUp === null ||
        !isTelegramConfigured() ||
        (await hasDayPlanItemFollowUpStarted(input.itemId))
      ) {
        return { followUpSendAt: null, hasFollowUpFailed: false };
      }

      try {
        const sendAt = await startDayPlanItemFollowUp({
          itemId: input.itemId,
          title: item.title,
          followUp,
          timeZone: input.timeZone,
        });
        return {
          followUpSendAt: sendAt.toISOString(),
          hasFollowUpFailed: false,
        };
      } catch (error) {
        console.error("Failed to schedule follow-up", error);
        return { followUpSendAt: null, hasFollowUpFailed: true };
      }
    }),

  setItemCancelled: baseProcedure
    .input(itemIdInputSchema.extend({ cancelled: z.boolean() }))
    .mutation(async ({ input }) => {
      const [stepsLog] = await db
        .select({ id: dayPlanItemSteps.id })
        .from(dayPlanItemSteps)
        .where(eq(dayPlanItemSteps.dayPlanItemId, input.itemId))
        .limit(1);
      if (stepsLog !== undefined) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      if (input.cancelled) {
        await cancelDayPlanItemReminderByItemId(input.itemId);
        await db
          .update(dayPlanItem)
          .set({ cancelled: true, completed: false })
          .where(eq(dayPlanItem.id, input.itemId));
      } else {
        await db
          .update(dayPlanItem)
          .set({ cancelled: false })
          .where(eq(dayPlanItem.id, input.itemId));
      }
    }),

  updateItemSchedule: baseProcedure
    .input(
      itemIdInputSchema.extend({
        planDate: planDateSchema,
        targetTime: dayPlanItemTargetTimeSchema,
      }),
    )
    .mutation(async ({ input }) => {
      await db.transaction(async (tx) => {
        const [item] = await tx
          .select({ dayPlanId: dayPlanItem.dayPlanId })
          .from(dayPlanItem)
          .where(eq(dayPlanItem.id, input.itemId))
          .limit(1);

        if (item === undefined) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const [planForDate] = await tx
          .select({ id: dayPlan.id })
          .from(dayPlan)
          .where(eq(dayPlan.date, input.planDate))
          .limit(1);

        let dayPlanId: string;
        if (planForDate !== undefined) {
          dayPlanId = planForDate.id;
        } else {
          const [createdPlan] = await tx
            .insert(dayPlan)
            .values({ date: input.planDate })
            .returning({ id: dayPlan.id });
          dayPlanId = createdPlan.id;
        }

        await tx
          .update(dayPlanItem)
          .set({ dayPlanId, targetTime: input.targetTime })
          .where(eq(dayPlanItem.id, input.itemId));

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
      });

      await rescheduleDayPlanItemReminderForPlanDate(
        input.itemId,
        input.planDate,
      );
    }),

  updateItemReference: baseProcedure
    .input(
      itemIdInputSchema.extend({
        reference: dayPlanItemReferenceSchema.nullable(),
      }),
    )
    .mutation(async ({ input }) => {
      const [stepsLog] = await db
        .select({ id: dayPlanItemSteps.id })
        .from(dayPlanItemSteps)
        .where(eq(dayPlanItemSteps.dayPlanItemId, input.itemId))
        .limit(1);
      if (stepsLog !== undefined) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const [item] = await db
        .select({ planDate: dayPlan.date })
        .from(dayPlanItem)
        .innerJoin(dayPlan, eq(dayPlanItem.dayPlanId, dayPlan.id))
        .where(eq(dayPlanItem.id, input.itemId))
        .limit(1);
      if (item === undefined) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await db
        .update(dayPlanItem)
        .set({
          referenceType: input.reference?.type ?? null,
          referenceValue: input.reference?.value ?? null,
        })
        .where(eq(dayPlanItem.id, input.itemId));

      await rescheduleDayPlanItemReminderForPlanDate(
        input.itemId,
        item.planDate,
      );
    }),

  duplicateItem: baseProcedure
    .input(itemIdInputSchema)
    .mutation(async ({ input }) => {
      await db.transaction(async (tx) => {
        const [item] = await tx
          .select({
            dayPlanId: dayPlanItem.dayPlanId,
            todoId: dayPlanItem.todoId,
            title: dayPlanItem.title,
            targetTime: dayPlanItem.targetTime,
            referenceType: dayPlanItem.referenceType,
            referenceValue: dayPlanItem.referenceValue,
            followUpMinutes: dayPlanItem.followUpMinutes,
            followUpMessage: dayPlanItem.followUpMessage,
          })
          .from(dayPlanItem)
          .where(eq(dayPlanItem.id, input.itemId))
          .limit(1);

        if (item === undefined) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        await tx.insert(dayPlanItem).values({
          dayPlanId: item.dayPlanId,
          todoId: item.todoId,
          title: item.title,
          targetTime: item.targetTime,
          completed: false,
          referenceType: item.referenceType,
          referenceValue: item.referenceValue,
          followUpMinutes: item.followUpMinutes,
          followUpMessage: item.followUpMessage,
        });
      });
    }),

  copyItemToNthDay: baseProcedure
    .input(
      itemIdInputSchema.extend({ dayOffset: copyDayPlanItemDayOffsetSchema }),
    )
    .mutation(async ({ input }) => {
      return db.transaction(async (tx) => {
        const [item] = await tx
          .select({
            todoId: dayPlanItem.todoId,
            title: dayPlanItem.title,
            targetTime: dayPlanItem.targetTime,
            referenceType: dayPlanItem.referenceType,
            referenceValue: dayPlanItem.referenceValue,
            followUpMinutes: dayPlanItem.followUpMinutes,
            followUpMessage: dayPlanItem.followUpMessage,
            planDate: dayPlan.date,
          })
          .from(dayPlanItem)
          .innerJoin(dayPlan, eq(dayPlanItem.dayPlanId, dayPlan.id))
          .where(eq(dayPlanItem.id, input.itemId))
          .limit(1);

        if (item === undefined) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }

        const targetPlanDate = shiftLocalDateString(
          item.planDate,
          input.dayOffset,
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

        const [copiedItem] = await tx
          .insert(dayPlanItem)
          .values({
            dayPlanId,
            todoId: item.todoId,
            title: item.title,
            targetTime: item.targetTime,
            completed: false,
            referenceType: item.referenceType,
            referenceValue: item.referenceValue,
            followUpMinutes: item.followUpMinutes,
            followUpMessage: item.followUpMessage,
          })
          .returning({ id: dayPlanItem.id });

        return { copiedItemId: copiedItem.id };
      });
    }),

  deleteItem: baseProcedure
    .input(itemIdInputSchema)
    .mutation(async ({ input }) => {
      await cancelDayPlanItemReminderByItemId(input.itemId);
      const hasFollowUpStarted = await hasDayPlanItemFollowUpStarted(
        input.itemId,
      );
      await stopPendingDayPlanItemFollowUp(input.itemId);

      return db.transaction(async (tx) => {
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
            followUpMinutes: dayPlanItem.followUpMinutes,
            followUpMessage: dayPlanItem.followUpMessage,
          })
          .from(dayPlanItem)
          .innerJoin(dayPlan, eq(dayPlanItem.dayPlanId, dayPlan.id))
          .where(eq(dayPlanItem.id, input.itemId))
          .limit(1);

        if (item === undefined) {
          throw new TRPCError({ code: "NOT_FOUND" });
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
          followUp: hasFollowUpStarted
            ? null
            : followUpFromColumns(item.followUpMinutes, item.followUpMessage),
        });
        if (!snapshot.success) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            cause: snapshot.error,
          });
        }

        await tx.delete(dayPlanItem).where(eq(dayPlanItem.id, item.id));

        const remaining = await tx
          .select({ id: dayPlanItem.id })
          .from(dayPlanItem)
          .where(eq(dayPlanItem.dayPlanId, item.dayPlanId));

        if (remaining.length === 0) {
          await tx.delete(dayPlan).where(eq(dayPlan.id, item.dayPlanId));
        }

        return { deleted: snapshot.data };
      });
    }),

  restoreItem: baseProcedure
    .input(deletedDayPlanItemSchema)
    .mutation(async ({ input: snapshot }) => {
      await db.transaction(async (tx) => {
        const [existingItem] = await tx
          .select({ id: dayPlanItem.id })
          .from(dayPlanItem)
          .where(eq(dayPlanItem.id, snapshot.id))
          .limit(1);

        if (existingItem !== undefined) {
          throw new TRPCError({ code: "CONFLICT" });
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
          followUpMinutes: snapshot.followUp?.minutes ?? null,
          followUpMessage: snapshot.followUp?.message ?? null,
        });
      });
    }),

  setItemFollowUp: baseProcedure
    .input(itemIdInputSchema.extend({ followUp: followUpSchema.nullable() }))
    .mutation(async ({ input }) => {
      const [item] = await db
        .select({
          completed: dayPlanItem.completed,
          stepsId: dayPlanItemSteps.id,
        })
        .from(dayPlanItem)
        .leftJoin(
          dayPlanItemSteps,
          eq(dayPlanItemSteps.dayPlanItemId, dayPlanItem.id),
        )
        .where(eq(dayPlanItem.id, input.itemId))
        .limit(1);
      if (item === undefined) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (
        item.completed ||
        item.stepsId !== null ||
        (await isDayPlanItemFollowUpPending(input.itemId))
      ) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      await db.transaction(async (tx) => {
        await tx
          .delete(dayPlanItemFollowUp)
          .where(eq(dayPlanItemFollowUp.dayPlanItemId, input.itemId));
        await tx
          .update(dayPlanItem)
          .set({
            followUpMinutes: input.followUp?.minutes ?? null,
            followUpMessage: input.followUp?.message ?? null,
          })
          .where(eq(dayPlanItem.id, input.itemId));
      });
    }),

  cancelFollowUp: baseProcedure
    .input(itemIdInputSchema)
    .mutation(async ({ input }) => {
      await cancelDayPlanItemFollowUp(input.itemId);
    }),

  scheduleReminder: baseProcedure
    .input(
      itemIdInputSchema.extend({
        planDate: planDateSchema,
        remindTime: targetTimeSchema,
        timeZone: ianaTimeZoneSchema,
      }),
    )
    .mutation(async ({ input }) => {
      if (!isTelegramConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED" });
      }

      const item = await getDayPlanItemWithPlanDate(input.itemId);
      if (item === undefined) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      if (
        item.completed ||
        item.cancelled ||
        item.planDate !== input.planDate
      ) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const result = await scheduleDayPlanItemReminder({
        itemId: item.id,
        planDate: item.planDate,
        remindTime: input.remindTime,
        timeZone: input.timeZone,
        title: item.title,
        reference: dayPlanItemReferenceFromColumns(
          item.referenceType,
          item.referenceValue,
        ),
      });
      if (!result.ok) {
        throw new TRPCError({ code: "UNPROCESSABLE_CONTENT" });
      }
    }),

  cancelReminder: baseProcedure
    .input(itemIdInputSchema)
    .mutation(async ({ input }) => {
      await cancelDayPlanItemReminderByItemId(input.itemId);
    }),
});
