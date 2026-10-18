import { createTRPCRouter } from "@/trpc/init";
import { todoRouter } from "@/trpc/routers/todo";

export const appRouter = createTRPCRouter({
  todo: todoRouter,
});

export type AppRouter = typeof appRouter;
