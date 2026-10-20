import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import * as z from "zod";

import { dayPlanItemReferenceFromColumns } from "@/lib/day-plan-item-reference";
import db from "@/lib/db";
import {
  dayPlanItem,
  dayPlanItemSteps,
  thread,
  threadNote,
} from "@/lib/schema";
import {
  threadNoteContentFromReference,
  threadNoteContentSchema,
} from "@/lib/thread-note";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

const MAX_TITLE_LENGTH = 200;

const threadIdInputSchema = z.object({ threadId: z.uuid() });

const noteIdInputSchema = z.object({ noteId: z.uuid() });

export const threadRouter = createTRPCRouter({
  convertDayPlanItem: baseProcedure
    .input(z.object({ itemId: z.uuid() }))
    .mutation(async ({ input }) => {
      return db.transaction(async (tx) => {
        const [item] = await tx
          .select({
            title: dayPlanItem.title,
            threadId: dayPlanItem.threadId,
            referenceType: dayPlanItem.referenceType,
            referenceValue: dayPlanItem.referenceValue,
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
        if (item.stepsId !== null) {
          throw new TRPCError({ code: "BAD_REQUEST" });
        }
        if (item.threadId !== null) {
          throw new TRPCError({ code: "CONFLICT" });
        }

        const [createdThread] = await tx
          .insert(thread)
          .values({ title: item.title })
          .returning({ id: thread.id });

        const reference = dayPlanItemReferenceFromColumns(
          item.referenceType,
          item.referenceValue,
        );
        if (reference !== null) {
          await tx.insert(threadNote).values({
            threadId: createdThread.id,
            content: threadNoteContentFromReference(reference),
          });
        }

        await tx
          .update(dayPlanItem)
          .set({ threadId: createdThread.id })
          .where(eq(dayPlanItem.id, input.itemId));

        return { threadId: createdThread.id };
      });
    }),

  updateTitle: baseProcedure
    .input(
      threadIdInputSchema.extend({
        title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
      }),
    )
    .mutation(async ({ input }) => {
      await db
        .update(thread)
        .set({ title: input.title })
        .where(eq(thread.id, input.threadId));
    }),

  setCompleted: baseProcedure
    .input(threadIdInputSchema.extend({ completed: z.boolean() }))
    .mutation(async ({ input }) => {
      await db
        .update(thread)
        .set(
          input.completed
            ? { status: "COMPLETED", completedAt: new Date() }
            : { status: "PENDING", completedAt: null },
        )
        .where(eq(thread.id, input.threadId));
    }),

  delete: baseProcedure
    .input(threadIdInputSchema)
    .mutation(async ({ input }) => {
      await db.delete(thread).where(eq(thread.id, input.threadId));
    }),

  addNote: baseProcedure
    .input(threadIdInputSchema.extend({ content: threadNoteContentSchema }))
    .mutation(async ({ input }) => {
      const [found] = await db
        .select({ id: thread.id })
        .from(thread)
        .where(eq(thread.id, input.threadId))
        .limit(1);
      if (found === undefined) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await db
        .insert(threadNote)
        .values({ threadId: input.threadId, content: input.content });
    }),

  updateNote: baseProcedure
    .input(noteIdInputSchema.extend({ content: threadNoteContentSchema }))
    .mutation(async ({ input }) => {
      await db
        .update(threadNote)
        .set({ content: input.content })
        .where(eq(threadNote.id, input.noteId));
    }),

  deleteNote: baseProcedure
    .input(noteIdInputSchema)
    .mutation(async ({ input }) => {
      await db.delete(threadNote).where(eq(threadNote.id, input.noteId));
    }),
});
