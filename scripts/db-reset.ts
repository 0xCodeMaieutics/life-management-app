import { config } from "dotenv";
import { rmSync } from "node:fs";
import path from "node:path";

config({ path: ".env", override: true, quiet: true });

const databaseUrl = process.env["DATABASE_URL"];
if (databaseUrl?.startsWith("file:") !== true) {
  throw new Error(`Expected a file: DATABASE_URL, got "${databaseUrl}"`);
}
const databaseFile = path.resolve(databaseUrl.slice("file:".length));

// Only dev databases live in ./data; anything else (prod) must never be reset.
const devDataDirectory = path.resolve("data");
if (path.dirname(databaseFile) !== devDataDirectory) {
  throw new Error(
    `Refusing to reset ${databaseFile}: only databases in ${devDataDirectory} can be reset`,
  );
}

for (const suffix of ["", "-wal", "-shm"]) {
  rmSync(`${databaseFile}${suffix}`, { force: true });
}

console.log(`Deleted ${databaseFile}`);
