"use client";

import {
  ReadFinishedRow,
  type ReadFinishedRowData,
} from "@/components/read-finished-row";
import { SettledSection } from "@/components/settled-section";

export function ReadFinishedList({
  totalCount,
  reads,
}: {
  totalCount: number;
  reads: ReadFinishedRowData[];
}) {
  return (
    <SettledSection title="Finished" count={totalCount}>
      {reads.map((row) => (
        <ReadFinishedRow key={row.id} read={row} />
      ))}
    </SettledSection>
  );
}
