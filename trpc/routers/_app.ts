import { createTRPCRouter } from "@/trpc/init";
import { dayPlanRouter } from "@/trpc/routers/day-plan";
import { matterRouter } from "@/trpc/routers/matter";
import { readRouter } from "@/trpc/routers/read";
import { threadRouter } from "@/trpc/routers/thread";
import { todoRouter } from "@/trpc/routers/todo";

export const appRouter = createTRPCRouter({
  todo: todoRouter,
  dayPlan: dayPlanRouter,
  read: readRouter,
  matter: matterRouter,
  thread: threadRouter,
});

export type AppRouter = typeof appRouter;
