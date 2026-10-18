import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { count, getTableColumns, getTableName } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import { Pool } from "pg";

import {
  dayPlan,
  dayPlanItem,
  dayPlanItemReminder,
  dayPlanItemSteps,
  matter,
  read,
  readReminder,
  todo,
} from "@/lib/schema";

// Parents before children so foreign keys resolve on insert.
const tables = [
  matter,
  read,
  readReminder,
  todo,
  dayPlan,
  dayPlanItem,
  dayPlanItemReminder,
  dayPlanItemSteps,
];

async function main() {
  const postgresUrl = process.env["POSTGRES_URL"];
  if (postgresUrl === undefined) {
    throw new Error("Set POSTGRES_URL to the Postgres database to copy from");
  }
  config({ path: ".env.production.local", override: true, quiet: true });
  const sqliteUrl = process.env["DATABASE_URL"]!;

  const pool = new Pool({ connectionString: postgresUrl });
  const client = createClient({ url: sqliteUrl });
  const sqlite = drizzle({ client });

  try {
    for (const table of tables) {
      const [{ rowCount }] = await sqlite
        .select({ rowCount: count() })
        .from(table);
      if (rowCount > 0) {
        throw new Error(
          `${getTableName(table)} already has ${rowCount} rows in ${sqliteUrl}; refusing to copy`,
        );
      }
    }

    const sourceCounts = new Map<string, number>();
    await sqlite.transaction(async (tx) => {
      for (const table of tables) {
        const tableName = getTableName(table);
        const { rows } = await pool.query(`select * from "${tableName}"`);
        sourceCounts.set(tableName, rows.length);
        if (rows.length === 0) continue;

        const columns = Object.entries(getTableColumns(table));
        const values = rows.map((row: Record<string, unknown>) =>
          Object.fromEntries(
            columns.map(([key, column]) => [key, row[column.name]]),
          ),
        );
        await tx.insert(table).values(values as never);
      }
    });

    for (const table of tables) {
      const tableName = getTableName(table);
      const [{ rowCount }] = await sqlite
        .select({ rowCount: count() })
        .from(table);
      const sourceCount = sourceCounts.get(tableName);
      console.log(`${tableName}: ${sourceCount} -> ${rowCount}`);
      if (rowCount !== sourceCount) {
        throw new Error(`Row count mismatch for ${tableName}`);
      }
    }
    console.log(`Copied into ${sqliteUrl}`);
  } finally {
    client.close();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
