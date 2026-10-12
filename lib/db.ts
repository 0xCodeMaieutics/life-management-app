import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { env } from "@/env";

import * as schema from "./schema";

type Database = NodePgDatabase<typeof schema>;

const globalForDb = global as unknown as {
  db?: Database;
};
const db =
  globalForDb.db ??
  drizzle({
    client: new Pool({ connectionString: env.DATABASE_URL }),
    schema,
  });

if (env.NODE_ENV !== "production") globalForDb.db = db;

export default db;
