import { asc, desc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import * as z from "zod";

import ThreadDetailPageClient from "@/app/(app)/threads/[threadId]/page.client";
import db from "@/lib/db";
import { dayPlan, dayPlanItem, thread, threadNote } from "@/lib/schema";

async function ThreadDetail({
  params,
}: Pick<PageProps<"/threads/[threadId]">, "params">) {
  const { threadId } = await params;

  if (!z.uuid().safeParse(threadId).success) {
    notFound();
  }

  await connection();

  const [found] = await db
    .select({ id: thread.id, title: thread.title, status: thread.status })
    .from(thread)
    .where(eq(thread.id, threadId))
    .limit(1);

  if (found === undefined) {
    notFound();
  }

  const notes = await db
    .select({
      id: threadNote.id,
      content: threadNote.content,
      createdAt: threadNote.createdAt,
    })
    .from(threadNote)
    .where(eq(threadNote.threadId, threadId))
    .orderBy(desc(threadNote.createdAt));

  const linkedItems = await db
    .select({
      id: dayPlanItem.id,
      title: dayPlanItem.title,
      completed: dayPlanItem.completed,
      cancelled: dayPlanItem.cancelled,
      planDate: dayPlan.date,
    })
    .from(dayPlanItem)
    .innerJoin(dayPlan, eq(dayPlanItem.dayPlanId, dayPlan.id))
    .where(eq(dayPlanItem.threadId, threadId))
    .orderBy(asc(dayPlan.date));

  return (
    <ThreadDetailPageClient
      thread={found}
      notes={notes.map((note) => ({
        id: note.id,
        content: note.content,
        createdAt: note.createdAt.toISOString(),
      }))}
      linkedItems={linkedItems}
    />
  );
}

export default function ThreadDetailPage(
  props: PageProps<"/threads/[threadId]">,
) {
  return (
    <div className="flex flex-1 flex-col gap-y-4 p-6">
      <Link
        href="/threads"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Threads
      </Link>
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <ThreadDetail params={props.params} />
      </Suspense>
    </div>
  );
}
