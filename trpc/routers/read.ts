import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import * as z from "zod";

import db from "@/lib/db";
import { readReminderDayOffsetSchema } from "@/lib/read-reminder-schedule";
import {
  cancelReadReminderByReadId,
  getIdleReadForReminder,
  readReminderPlanDate,
  refreshReadReminderTelegramMessage,
  scheduleReadReminder,
} from "@/lib/read-reminders";
import { ianaTimeZoneSchema } from "@/lib/remind-at";
import { read } from "@/lib/schema";
import { targetTimeSchema } from "@/lib/target-time";
import { isTelegramConfigured } from "@/lib/telegram/client";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

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

export const readRouter = createTRPCRouter({
  create: baseProcedure.input(readFieldsSchema).mutation(async ({ input }) => {
    await db.insert(read).values(input);
  }),

  update: baseProcedure
    .input(readFieldsSchema.extend({ id: z.uuid() }))
    .mutation(async ({ input: { id, ...values } }) => {
      await db.update(read).set(values).where(eq(read.id, id));

      if (isTelegramConfigured()) {
        const refreshed = await refreshReadReminderTelegramMessage(id);
        if (!refreshed.ok) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
      }
    }),

  markFinished: baseProcedure
    .input(z.object({ id: z.uuid() }))
    .mutation(async ({ input }) => {
      await cancelReadReminderByReadId(input.id);
      await db
        .update(read)
        .set({ type: "MARK_AS_RESOLVED", finishedAt: new Date() })
        .where(and(eq(read.id, input.id), eq(read.type, "IDLE")));
    }),

  scheduleReminder: baseProcedure
    .input(
      z.object({
        readId: z.uuid(),
        remindTime: targetTimeSchema,
        timeZone: ianaTimeZoneSchema,
        notToday: z.boolean(),
        dayOffset: z.number(),
      }),
    )
    .mutation(async ({ input }) => {
      if (!isTelegramConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED" });
      }

      const dayOffsetResult = input.notToday
        ? readReminderDayOffsetSchema.safeParse(input.dayOffset)
        : { success: true as const, data: 1 };
      if (!dayOffsetResult.success) {
        throw new TRPCError({ code: "BAD_REQUEST" });
      }

      const row = await getIdleReadForReminder(input.readId);
      if (row === undefined) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const result = await scheduleReadReminder({
        readId: row.id,
        planDate: readReminderPlanDate(input.notToday, dayOffsetResult.data),
        remindTime: input.remindTime,
        timeZone: input.timeZone,
        title: row.title,
        url: row.url,
      });
      if (!result.ok) {
        throw new TRPCError({ code: "UNPROCESSABLE_CONTENT" });
      }
    }),

  cancelReminder: baseProcedure
    .input(z.object({ readId: z.uuid() }))
    .mutation(async ({ input }) => {
      await cancelReadReminderByReadId(input.readId);
    }),
});
