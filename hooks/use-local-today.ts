"use client";

import { useEffect, useState } from "react";

import { getLocalDateString } from "@/lib/plan-date";

export function useLocalToday() {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    setToday(getLocalDateString());
  }, []);

  return today;
}
