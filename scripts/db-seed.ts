import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { count, getTableName } from "drizzle-orm";
import { drizzle } from "drizzle-orm/libsql";
import path from "node:path";

import { getLocalDateString, shiftLocalDateString } from "@/lib/plan-date";
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

const DAY_IN_MS = 24 * 60 * 60 * 1000;

async function main() {
  config({ path: ".env", override: true, quiet: true });

  const databaseUrl = process.env["DATABASE_URL"];
  if (databaseUrl?.startsWith("file:") !== true) {
    throw new Error(`Expected a file: DATABASE_URL, got "${databaseUrl}"`);
  }
  const databaseFile = path.resolve(databaseUrl.slice("file:".length));

  // Only dev databases live in ./data; anything else (prod) must never be seeded.
  const devDataDirectory = path.resolve("data");
  if (path.dirname(databaseFile) !== devDataDirectory) {
    throw new Error(
      `Refusing to seed ${databaseFile}: only databases in ${devDataDirectory} can be seeded`,
    );
  }

  const client = createClient({ url: databaseUrl });
  const db = drizzle({ client });

  try {
    for (const table of tables) {
      const [{ rowCount }] = await db.select({ rowCount: count() }).from(table);
      if (rowCount > 0) {
        throw new Error(
          `${getTableName(table)} already has ${rowCount} rows; run pnpm db:reset first`,
        );
      }
    }

    const now = Date.now();
    const today = getLocalDateString();
    const yesterday = shiftLocalDateString(today, -1);
    const tomorrow = shiftLocalDateString(today, 1);

    await db.transaction(async (tx) => {
      const todos = await tx
        .insert(todo)
        .values([
          {
            title: "Morning walk",
            targetTime: "07:00",
            createdAt: new Date(now - 30 * DAY_IN_MS),
          },
          {
            title: "Deep work block",
            targetTime: "09:30",
            createdAt: new Date(now - 29 * DAY_IN_MS),
          },
          {
            title: "Lunch break",
            targetTime: "12:30",
            createdAt: new Date(now - 28 * DAY_IN_MS),
          },
          {
            title: "Inbox zero",
            targetTime: "15:00",
            createdAt: new Date(now - 27 * DAY_IN_MS),
          },
          {
            title: "Cook dinner",
            targetTime: "18:30",
            createdAt: new Date(now - 26 * DAY_IN_MS),
          },
          {
            title: "Read before bed",
            targetTime: "22:00",
            createdAt: new Date(now - 25 * DAY_IN_MS),
          },
        ])
        .returning();
      const [
        morningWalk,
        deepWork,
        lunchBreak,
        inboxZero,
        cookDinner,
        readBeforeBed,
      ] = todos;

      const [yesterdayPlan, todayPlan, tomorrowPlan] = await tx
        .insert(dayPlan)
        .values([{ date: yesterday }, { date: today }, { date: tomorrow }])
        .returning();

      const [yesterdaySteps] = await tx
        .insert(dayPlanItem)
        .values([
          { dayPlanId: yesterdayPlan.id, title: "Walked", completed: true },
          {
            dayPlanId: yesterdayPlan.id,
            todoId: morningWalk.id,
            title: morningWalk.title,
            targetTime: morningWalk.targetTime,
            completed: true,
          },
          {
            dayPlanId: yesterdayPlan.id,
            todoId: deepWork.id,
            title: deepWork.title,
            targetTime: deepWork.targetTime,
            completed: true,
          },
          {
            dayPlanId: yesterdayPlan.id,
            todoId: inboxZero.id,
            title: inboxZero.title,
            targetTime: inboxZero.targetTime,
            cancelled: true,
          },
          {
            dayPlanId: yesterdayPlan.id,
            todoId: readBeforeBed.id,
            title: readBeforeBed.title,
            targetTime: readBeforeBed.targetTime,
          },
        ])
        .returning();

      const [todaySteps] = await tx
        .insert(dayPlanItem)
        .values([
          { dayPlanId: todayPlan.id, title: "Walked", completed: true },
          {
            dayPlanId: todayPlan.id,
            todoId: morningWalk.id,
            title: morningWalk.title,
            targetTime: morningWalk.targetTime,
            completed: true,
          },
          {
            dayPlanId: todayPlan.id,
            todoId: deepWork.id,
            title: deepWork.title,
            targetTime: deepWork.targetTime,
          },
          {
            dayPlanId: todayPlan.id,
            todoId: lunchBreak.id,
            title: lunchBreak.title,
            targetTime: lunchBreak.targetTime,
          },
          {
            dayPlanId: todayPlan.id,
            title: "Call the dentist",
            targetTime: "14:15",
            referenceType: "PHONE",
            referenceValue: "+1 555 0100",
          },
          {
            dayPlanId: todayPlan.id,
            title: "Reply to landlord",
            targetTime: "16:00",
            referenceType: "EMAIL",
            referenceValue: "landlord@example.com",
          },
          {
            dayPlanId: todayPlan.id,
            todoId: inboxZero.id,
            title: inboxZero.title,
            targetTime: inboxZero.targetTime,
            cancelled: true,
          },
          {
            dayPlanId: todayPlan.id,
            todoId: cookDinner.id,
            title: cookDinner.title,
            targetTime: cookDinner.targetTime,
          },
          { dayPlanId: todayPlan.id, title: "Water the plants" },
          {
            dayPlanId: todayPlan.id,
            title: "Check concert tickets",
            referenceType: "LINK",
            referenceValue: "https://example.com/tickets",
          },
        ])
        .returning();

      await tx.insert(dayPlanItem).values([
        {
          dayPlanId: tomorrowPlan.id,
          todoId: morningWalk.id,
          title: morningWalk.title,
          targetTime: morningWalk.targetTime,
        },
        {
          dayPlanId: tomorrowPlan.id,
          todoId: deepWork.id,
          title: deepWork.title,
          targetTime: deepWork.targetTime,
        },
        {
          dayPlanId: tomorrowPlan.id,
          todoId: cookDinner.id,
          title: cookDinner.title,
          targetTime: cookDinner.targetTime,
        },
        { dayPlanId: tomorrowPlan.id, title: "Pick up dry cleaning" },
      ]);

      await tx.insert(dayPlanItemSteps).values([
        { dayPlanItemId: yesterdaySteps.id, steps: 8421 },
        { dayPlanItemId: todaySteps.id, steps: 3150 },
      ]);

      await tx.insert(read).values([
        {
          url: "https://react.dev/blog",
          title: "React blog",
          createdAt: new Date(now - 1 * DAY_IN_MS),
        },
        {
          url: "https://nextjs.org/blog",
          createdAt: new Date(now - 2 * DAY_IN_MS),
        },
        {
          url: "https://orm.drizzle.team/docs/overview",
          title: "Drizzle ORM overview",
          createdAt: new Date(now - 4 * DAY_IN_MS),
        },
        {
          url: "https://effect.website/docs",
          title: "Effect docs",
          createdAt: new Date(now - 7 * DAY_IN_MS),
        },
        {
          url: "https://sqlite.org/wal.html",
          title: "SQLite write-ahead logging",
          type: "MARK_AS_RESOLVED",
          createdAt: new Date(now - 10 * DAY_IN_MS),
          finishedAt: new Date(now - 3 * DAY_IN_MS),
        },
        {
          url: "https://developer.mozilla.org/en-US/docs/Web/API/Intl",
          title: "MDN: Intl",
          type: "MARK_AS_RESOLVED",
          createdAt: new Date(now - 14 * DAY_IN_MS),
          finishedAt: new Date(now - 6 * DAY_IN_MS),
        },
      ]);
    });
  } finally {
    client.close();
  }

  console.log(`Seeded ${databaseFile}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
