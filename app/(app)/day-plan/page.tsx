import { asc, eq } from "drizzle-orm";
import { connection } from "next/server";
import { Suspense } from "react";

import DayPlanPageClient from "@/app/(app)/day-plan/page.client";
import { DayPlanRedirectToToday } from "@/components/day-plan-redirect-to-today";
import { dayPlanItemReferenceFromColumns } from "@/lib/day-plan-item-reference";
import { expirePastDayPlanReminders } from "@/lib/day-plan-reminders";
import { type DayPlanItem } from "@/lib/day-segments";
import db from "@/lib/db";
import { followUpFromColumns } from "@/lib/follow-up";
import { isValidPlanDateString } from "@/lib/plan-date";
import {
  dayPlan,
  dayPlanItem,
  dayPlanItemFollowUp,
  dayPlanItemReminder,
  dayPlanItemSteps,
  todo,
} from "@/lib/schema";
import { targetTimeSchema } from "@/lib/target-time";

function mapPendingReminder(
  remindAt: Date | null,
  remindTime: string | null,
): DayPlanItem["pendingReminder"] {
  if (remindAt === null || remindTime === null) {
    return null;
  }

  if (remindAt.getTime() <= Date.now()) {
    return null;
  }

  const parsedTime = targetTimeSchema.safeParse(remindTime);
  if (!parsedTime.success) {
    return null;
  }

  return {
    remindAt: remindAt.toISOString(),
    remindTime: parsedTime.data,
  };
}

function mapFollowUp(
  followUpMinutes: number | null,
  followUpMessage: string | null,
  followUpSendAt: Date | null,
): DayPlanItem["followUp"] {
  const followUp = followUpFromColumns(followUpMinutes, followUpMessage);
  if (followUp === null) {
    return null;
  }
  if (followUpSendAt === null) {
    return { ...followUp, sendAt: null };
  }
  if (followUpSendAt.getTime() <= Date.now()) {
    return null;
  }
  return { ...followUp, sendAt: followUpSendAt.toISOString() };
}

async function DayPlanPageLoader({
  searchParams,
}: {
  searchParams: PageProps<"/day-plan">["searchParams"];
}) {
  const { date: dateParam, item: itemParam } = await searchParams;
  const planDate = typeof dateParam === "string" ? dateParam : undefined;

  if (planDate === undefined || !isValidPlanDateString(planDate)) {
    return <DayPlanRedirectToToday />;
  }

  await connection();
  await expirePastDayPlanReminders();

  const [plan] = await db
    .select({ id: dayPlan.id })
    .from(dayPlan)
    .where(eq(dayPlan.date, planDate))
    .limit(1);

  const itemRows =
    plan === undefined
      ? []
      : await db
          .select({
            id: dayPlanItem.id,
            todoId: dayPlanItem.todoId,
            threadId: dayPlanItem.threadId,
            title: dayPlanItem.title,
            targetTime: dayPlanItem.targetTime,
            completed: dayPlanItem.completed,
            cancelled: dayPlanItem.cancelled,
            referenceType: dayPlanItem.referenceType,
            referenceValue: dayPlanItem.referenceValue,
            remindAt: dayPlanItemReminder.remindAt,
            remindTime: dayPlanItemReminder.remindTime,
            followUpMinutes: dayPlanItem.followUpMinutes,
            followUpMessage: dayPlanItem.followUpMessage,
            followUpSendAt: dayPlanItemFollowUp.sendAt,
            stepsId: dayPlanItemSteps.id,
          })
          .from(dayPlanItem)
          .leftJoin(
            dayPlanItemReminder,
            eq(dayPlanItemReminder.dayPlanItemId, dayPlanItem.id),
          )
          .leftJoin(
            dayPlanItemFollowUp,
            eq(dayPlanItemFollowUp.dayPlanItemId, dayPlanItem.id),
          )
          .leftJoin(
            dayPlanItemSteps,
            eq(dayPlanItemSteps.dayPlanItemId, dayPlanItem.id),
          )
          .where(eq(dayPlanItem.dayPlanId, plan.id));

  const items = itemRows.map((row) => ({
    id: row.id,
    todoId: row.todoId,
    threadId: row.threadId,
    title: row.title,
    targetTime: row.targetTime,
    completed: row.completed,
    cancelled: row.cancelled,
    isStepsLog: row.stepsId !== null,
    reference: dayPlanItemReferenceFromColumns(
      row.referenceType,
      row.referenceValue,
    ),
    pendingReminder: mapPendingReminder(row.remindAt, row.remindTime),
    followUp: mapFollowUp(
      row.followUpMinutes,
      row.followUpMessage,
      row.followUpSendAt,
    ),
  }));
  const highlightItemId =
    typeof itemParam === "string" && items.some((row) => row.id === itemParam)
      ? itemParam
      : undefined;

  const todoRows = await db
    .select({
      id: todo.id,
      title: todo.title,
      targetTime: todo.targetTime,
      followUpMinutes: todo.followUpMinutes,
      followUpMessage: todo.followUpMessage,
    })
    .from(todo)
    .orderBy(asc(todo.createdAt));
  const todos = todoRows.map((row) => ({
    id: row.id,
    title: row.title,
    targetTime: row.targetTime,
    followUp: followUpFromColumns(row.followUpMinutes, row.followUpMessage),
  }));

  return (
    <DayPlanPageClient
      date={planDate}
      items={items}
      highlightItemId={highlightItemId}
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
