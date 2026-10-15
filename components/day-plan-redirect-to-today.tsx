"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { getLocalDateString } from "@/lib/plan-date";

export function DayPlanRedirectToToday() {
  const router = useRouter();

  useEffect(() => {
    router.replace(`/day-plan?date=${getLocalDateString()}`);
  }, [router]);

  return <p className="p-6 text-sm">Loading…</p>;
}
