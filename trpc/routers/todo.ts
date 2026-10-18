import { eq } from "drizzle-orm";
import * as z from "zod";

import db from "@/lib/db";
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

  delete: baseProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(todo).where(eq(todo.id, input.id));
    }),
});
