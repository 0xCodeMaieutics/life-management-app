import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/libsql/migrator";
import { readFileSync } from "node:fs";
import path from "node:path";
import * as z from "zod";

import { env } from "@/env";
import db from "@/lib/db";

const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

const journalSchema = z.object({
  entries: z.array(z.object({ when: z.number() })),
});

async function hasPendingMigrations() {
  const journal = journalSchema.parse(
    JSON.parse(
      readFileSync(path.join(MIGRATIONS_FOLDER, "meta/_journal.json"), "utf8"),
    ),
  );
  const latestMigrationTime = Math.max(
    ...journal.entries.map((entry) => entry.when),
  );

  const migrationsTable = await db.all(
    sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name = '__drizzle_migrations'`,
  );
  if (migrationsTable.length === 0) return true;

  const [latestApplied] = await db.all<{ latest: number | null }>(
    sql`SELECT MAX(created_at) AS latest FROM __drizzle_migrations`,
  );
  return Number(latestApplied?.latest ?? 0) < latestMigrationTime;
}

export async function migrateDatabase() {
  if (!(await hasPendingMigrations())) return;

  if (!env.DATABASE_URL.startsWith("file:")) {
    throw new Error(`Expected a file: DATABASE_URL, got "${env.DATABASE_URL}"`);
  }
  const databaseFile = path.resolve(env.DATABASE_URL.slice("file:".length));
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupFile = `${databaseFile}.backup-${timestamp}`;

  // VACUUM INTO, unlike a file copy, includes writes still in the WAL file.
  await db.run(sql`VACUUM INTO ${backupFile}`);
  console.log(`Backed up database to ${backupFile}`);

  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  console.log("Applied pending database migrations");
}
