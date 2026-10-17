import { desc, eq } from "drizzle-orm";
import { connection } from "next/server";
import { Suspense } from "react";

import { ReadCreateForm } from "@/components/read-create-form";
import { ReadList } from "@/components/read-list";
import db from "@/lib/db";
import {
  pendingReminderPlanDate,
  type ReadPendingReminder,
} from "@/lib/read-reminder-ui";
import { expirePastReadReminders } from "@/lib/read-reminders";
import { read, readReminder } from "@/lib/schema";
import { targetTimeSchema } from "@/lib/target-time";

function mapPendingReminder(
  remindAt: Date | null,
  remindTime: string | null,
  timeZone: string | null,
): ReadPendingReminder | null {
  if (remindAt === null || remindTime === null || timeZone === null) {
    return null;
  }

  if (remindAt.getTime() <= Date.now()) {
    return null;
  }

  const parsedTime = targetTimeSchema.safeParse(remindTime);
  if (!parsedTime.success) {
    return null;
  }

  return {
    remindAt: remindAt.toISOString(),
    remindTime: parsedTime.data,
    planDate: pendingReminderPlanDate(remindAt, timeZone),
  };
}

async function ReadListSection() {
  await connection();
  await expirePastReadReminders();

  const reads = await db
    .select({
      id: read.id,
      url: read.url,
      title: read.title,
      remindAt: readReminder.remindAt,
      remindTime: readReminder.remindTime,
      reminderTimeZone: readReminder.timeZone,
    })
    .from(read)
    .leftJoin(readReminder, eq(readReminder.readId, read.id))
    .where(eq(read.type, "IDLE"))
    .orderBy(desc(read.createdAt));

  if (reads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No links yet. Add something you want to read later.
      </p>
    );
  }

  const rows = reads.map((row) => ({
    id: row.id,
    url: row.url,
    title: row.title,
    pendingReminder: mapPendingReminder(
      row.remindAt,
      row.remindTime,
      row.reminderTimeZone,
    ),
  }));

  return <ReadList reads={rows} />;
}

export default function LaterReadsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <ReadCreateForm />
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <ReadListSection />
      </Suspense>
    </main>
  );
}
