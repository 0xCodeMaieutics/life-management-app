import { eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import * as z from "zod";

import { MatterAttachment } from "@/components/matter-attachment";
import { MatterTitleForm } from "@/components/matter-title-form";
import db from "@/lib/db";
import { matter } from "@/lib/schema";

async function MatterDetail({
  params,
}: Pick<PageProps<"/matter/[matterId]">, "params">) {
  const { matterId } = await params;

  if (!z.uuid().safeParse(matterId).success) {
    notFound();
  }

  const [found] = await db
    .select()
    .from(matter)
    .where(eq(matter.id, matterId))
    .limit(1);

  if (found === undefined) {
    notFound();
  }

  const { title, category, key, documentContent } = found;

  return (
    <article className="flex flex-col gap-y-4">
      <header className="flex items-start justify-between gap-x-2">
        <MatterTitleForm matterId={matterId} title={title} />
        <span className="shrink-0 text-xs text-muted-foreground">
          {category}
        </span>
      </header>
      <MatterAttachment fileKey={key} />
      <pre className="text-sm wrap-break-word whitespace-pre-wrap">
        {documentContent}
      </pre>
    </article>
  );
}

export default function MatterDetailPage(
  props: PageProps<"/matter/[matterId]">,
) {
  return (
    <div className="flex flex-1 flex-col gap-y-4 p-4 md:p-6">
      <Link
        href="/matter"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Matters
      </Link>
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <MatterDetail params={props.params} />
      </Suspense>
    </div>
  );
}
