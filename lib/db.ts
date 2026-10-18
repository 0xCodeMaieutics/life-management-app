import { createClient } from "@libsql/client";
import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import { env } from "@/env";

import * as schema from "./schema";

type Database = LibSQLDatabase<typeof schema>;

const globalForDb = global as unknown as {
  db?: Database;
};
const db =
  globalForDb.db ??
  drizzle({
    client: createClient({ url: env.DATABASE_URL }),
    schema,
  });

if (env.NODE_ENV !== "production") globalForDb.db = db;

export default db;
