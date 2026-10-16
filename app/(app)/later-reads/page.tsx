import { desc, eq } from "drizzle-orm";
import { Suspense } from "react";

import { ReadCreateForm } from "@/components/read-create-form";
import { ReadList } from "@/components/read-list";
import db from "@/lib/db";
import { read } from "@/lib/schema";

async function ReadListSection() {
  const reads = await db
    .select({
      id: read.id,
      url: read.url,
      title: read.title,
    })
    .from(read)
    .where(eq(read.type, "IDLE"))
    .orderBy(desc(read.createdAt));

  if (reads.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No links yet. Add something you want to read later.
      </p>
    );
  }

  return <ReadList reads={reads} />;
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
