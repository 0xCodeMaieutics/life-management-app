import { eq } from "drizzle-orm";
import * as z from "zod";

import db from "@/lib/db";
import { followUpSchema } from "@/lib/follow-up";
import { todo } from "@/lib/schema";
import { targetTimeSchema } from "@/lib/target-time";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

const MAX_TITLE_LENGTH = 200;

const todoFieldsSchema = z.object({
  title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
  targetTime: targetTimeSchema,
});

export const todoRouter = createTRPCRouter({
  create: baseProcedure.input(todoFieldsSchema).mutation(async ({ input }) => {
    await db.insert(todo).values(input);
  }),

  update: baseProcedure
    .input(todoFieldsSchema.extend({ id: z.uuid() }))
    .mutation(async ({ input: { id, ...values } }) => {
      await db.update(todo).set(values).where(eq(todo.id, id));
    }),

  setFollowUp: baseProcedure
    .input(z.object({ id: z.uuid(), followUp: followUpSchema.nullable() }))
    .mutation(async ({ input }) => {
      await db
        .update(todo)
        .set({
          followUpMinutes: input.followUp?.minutes ?? null,
          followUpMessage: input.followUp?.message ?? null,
        })
        .where(eq(todo.id, input.id));
    }),

  delete: baseProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(todo).where(eq(todo.id, input.id));
    }),
});
