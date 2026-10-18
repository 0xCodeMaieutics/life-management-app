import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createTRPCContext } from "@/trpc/init";
import { appRouter } from "@/trpc/routers/_app";

function handler(request: Request) {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: createTRPCContext,
    onError({ path, error }) {
      console.error(`tRPC ${path ?? "<no-path>"}:`, error.cause ?? error);
    },
  });
}

export { handler as GET, handler as POST };
