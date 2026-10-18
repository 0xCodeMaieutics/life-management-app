import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/libsql";
import { migrate } from "drizzle-orm/libsql/migrator";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { stdin as input, stdout as output } from "node:process";
import * as readline from "node:readline/promises";

async function confirm(question: string) {
  const rl = readline.createInterface({ input, output });
  try {
    return (
      (await rl.question(`${question} Type "yes" to continue: `)) === "yes"
    );
  } finally {
    rl.close();
  }
}

async function main() {
  const isProduction = process.argv.includes("--prod");
  config({
    path: isProduction ? ".env.production.local" : ".env",
    override: true,
    quiet: true,
  });

  const databaseUrl = process.env["DATABASE_URL"];
  if (databaseUrl?.startsWith("file:") !== true) {
    throw new Error(`Expected a file: DATABASE_URL, got "${databaseUrl}"`);
  }
  const databaseFile = path.resolve(databaseUrl.slice("file:".length));

  if (
    isProduction &&
    !(await confirm(`Migrate the PRODUCTION database at ${databaseFile}?`))
  ) {
    console.log("Aborted.");
    return;
  }

  mkdirSync(path.dirname(databaseFile), { recursive: true });
  const client = createClient({ url: databaseUrl });
  try {
    await client.execute("PRAGMA journal_mode = WAL");
    await migrate(drizzle({ client }), { migrationsFolder: "drizzle" });
  } finally {
    client.close();
  }

  console.log(`Migrated ${databaseFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
