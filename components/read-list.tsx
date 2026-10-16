"use client";

import { ReadRow, type ReadRowData } from "@/components/read-row";

export function ReadList({ reads }: { reads: ReadRowData[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {reads.map((row) => (
        <li key={row.id}>
          <ReadRow read={row} />
        </li>
      ))}
    </ul>
  );
}
