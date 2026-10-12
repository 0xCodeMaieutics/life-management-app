import { Suspense } from "react";

import { MatterAttachment } from "@/components/matter-attachment";
import db from "@/lib/db";
import { matter } from "@/lib/schema";

async function MatterList() {
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
        <li
          key={id}
          className="flex items-start justify-between gap-x-2 rounded-md border p-2"
        >
          <div className="flex min-w-0 flex-col gap-y-2">
            <span className="font-semibold">
              {title === null || title === "" ? "Untitled" : title}
            </span>
            <MatterAttachment fileKey={key} />
          </div>
          <span className="text-xs text-muted-foreground">{category}</span>
        </li>
      ))}
    </ul>
  );
}

export default function MatterPage() {
  return (
    <div className="flex size-full flex-col gap-y-4 p-2">
      <h1 className="text-lg font-semibold">Matters</h1>
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <MatterList />
      </Suspense>
    </div>
  );
}
