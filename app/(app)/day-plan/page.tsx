import { asc, eq } from "drizzle-orm";
import { Suspense } from "react";

import DayPlanPageClient from "@/app/(app)/day-plan/page.client";
import { DayPlanRedirectToToday } from "@/components/day-plan-redirect-to-today";
import db from "@/lib/db";
import { isValidPlanDateString } from "@/lib/plan-date";
import { dayPlan, dayPlanItem, todo } from "@/lib/schema";

async function DayPlanPageLoader({
  searchParams,
}: {
  searchParams: PageProps<"/day-plan">["searchParams"];
}) {
  const { date: dateParam } = await searchParams;
  const planDate = typeof dateParam === "string" ? dateParam : undefined;

  if (planDate === undefined || !isValidPlanDateString(planDate)) {
    return <DayPlanRedirectToToday />;
  }

  const [plan] = await db
    .select({ id: dayPlan.id })
    .from(dayPlan)
    .where(eq(dayPlan.date, planDate))
    .limit(1);

  const items =
    plan === undefined
      ? []
      : await db
          .select({
            id: dayPlanItem.id,
            title: dayPlanItem.title,
            targetTime: dayPlanItem.targetTime,
            completed: dayPlanItem.completed,
          })
          .from(dayPlanItem)
          .where(eq(dayPlanItem.dayPlanId, plan.id));

  const todos = await db
    .select({
      id: todo.id,
      title: todo.title,
      targetTime: todo.targetTime,
    })
    .from(todo)
    .orderBy(asc(todo.createdAt));

  return (
    <DayPlanPageClient
      date={planDate}
      items={items}
      todos={todos}
      hasDayPlan={plan !== undefined}
    />
  );
}

export default function DayPlanPage(props: PageProps<"/day-plan">) {
  return (
    <Suspense fallback={<p className="p-6 text-sm">Loading…</p>}>
      <DayPlanPageLoader searchParams={props.searchParams} />
    </Suspense>
  );
}
