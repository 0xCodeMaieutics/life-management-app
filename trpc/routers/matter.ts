import { eq } from "drizzle-orm";
import * as z from "zod";

import db from "@/lib/db";
import { matter } from "@/lib/schema";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

const MAX_TITLE_LENGTH = 80;

export const matterRouter = createTRPCRouter({
  updateTitle: baseProcedure
    .input(
      z.object({
        matterId: z.uuid(),
        title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
      }),
    )
    .mutation(async ({ input }) => {
      await db
        .update(matter)
        .set({ title: input.title })
        .where(eq(matter.id, input.matterId));
    }),
});
