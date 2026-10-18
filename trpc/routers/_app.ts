import { createTRPCRouter } from "@/trpc/init";
import { matterRouter } from "@/trpc/routers/matter";
import { readRouter } from "@/trpc/routers/read";
import { todoRouter } from "@/trpc/routers/todo";

export const appRouter = createTRPCRouter({
  todo: todoRouter,
  read: readRouter,
  matter: matterRouter,
});

export type AppRouter = typeof appRouter;
