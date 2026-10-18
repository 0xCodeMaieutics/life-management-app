import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { MatterAttachment } from "@/components/matter-attachment";
import db from "@/lib/db";
import { matter } from "@/lib/schema";

async function MatterList() {
  await connection();
  const matters = await db
    .select({
      id: matter.id,
      title: matter.title,
      category: matter.category,
      key: matter.key,
    })
    .from(matter);

  if (matters.length === 0) {
    return <p className="text-sm text-muted-foreground">No matters yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-y-2">
      {matters.map(({ id, title, category, key }) => (
        <li key={id}>
          <Link
            href={`/matter/${id}`}
            className="flex items-start justify-between gap-x-2 rounded-md border p-2 transition-colors hover:bg-muted/50"
          >
            <div className="flex min-w-0 flex-col gap-y-2">
              <span className="font-semibold">
                {title === null || title === "" ? "Untitled" : title}
              </span>
              <MatterAttachment fileKey={key} />
            </div>
            <span className="text-xs text-muted-foreground">{category}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function MatterPage() {
  return (
    <div className="flex flex-1 flex-col gap-y-4 p-6">
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <MatterList />
      </Suspense>
    </div>
  );
}
