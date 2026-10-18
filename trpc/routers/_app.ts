import { createTRPCRouter } from "@/trpc/init";
import { readRouter } from "@/trpc/routers/read";
import { todoRouter } from "@/trpc/routers/todo";

export const appRouter = createTRPCRouter({
  todo: todoRouter,
  read: readRouter,
});

export type AppRouter = typeof appRouter;
