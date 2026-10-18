import { initTRPC } from "@trpc/server";

export async function createTRPCContext() {
  return {};
}

const t = initTRPC.context<typeof createTRPCContext>().create({
  errorFormatter({ shape }) {
    return {
      ...shape,
      message:
        shape.data.code === "INTERNAL_SERVER_ERROR"
          ? "Internal server error"
          : "Bad request",
    };
  },
});

export const createTRPCRouter = t.router;
export const baseProcedure = t.procedure;
