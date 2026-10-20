import { count, desc, eq } from "drizzle-orm";
import { CheckSquare } from "lucide-react";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { SettledSection } from "@/components/settled-section";
import db from "@/lib/db";
import { thread } from "@/lib/schema";

async function PendingThreadsSection() {
  await connection();

  const threads = await db
    .select({ id: thread.id, title: thread.title })
    .from(thread)
    .where(eq(thread.status, "PENDING"))
    .orderBy(desc(thread.createdAt));

  if (threads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No pending threads. Right-click an item on a day plan and choose Convert
        to thread to start one.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {threads.map((row) => (
        <li key={row.id}>
          <Link
            href={`/threads/${row.id}`}
            className="flex w-full rounded-lg border px-4 py-3 text-sm leading-tight font-medium transition-colors hover:bg-muted/30"
          >
            {row.title}
          </Link>
        </li>
      ))}
    </ul>
  );
}

const COMPLETED_THREADS_LIMIT = 10;

async function CompletedThreadsSection() {
  await connection();

  const [countRow] = await db
    .select({ value: count() })
    .from(thread)
    .where(eq(thread.status, "COMPLETED"));

  const totalCount = countRow?.value ?? 0;
  if (totalCount === 0) {
    return null;
  }

  const threads = await db
    .select({ id: thread.id, title: thread.title })
    .from(thread)
    .where(eq(thread.status, "COMPLETED"))
    .orderBy(desc(thread.completedAt))
    .limit(COMPLETED_THREADS_LIMIT);

  return (
    <SettledSection title="Completed" count={totalCount}>
      {threads.map((row) => (
        <Link
          key={row.id}
          href={`/threads/${row.id}`}
          className="flex items-center gap-2 px-1 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <CheckSquare
            className="size-3.5 shrink-0 opacity-70"
            aria-hidden="true"
          />
          <span className="min-w-0 flex-1 truncate">{row.title}</span>
        </Link>
      ))}
    </SettledSection>
  );
}

export default function ThreadsPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <PendingThreadsSection />
      </Suspense>
      <Suspense fallback={null}>
        <div className="mt-auto pt-2">
          <CompletedThreadsSection />
        </div>
      </Suspense>
    </main>
  );
}
