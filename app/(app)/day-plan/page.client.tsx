"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import {
  AddTodosToDayPlanTrigger,
  CreateDayPlanTrigger,
} from "@/components/create-day-plan-dialog";
import { DayPlanTimeline } from "@/components/day-plan-timeline";
import { type TodoRowData } from "@/components/todo-row";
import { Button } from "@/components/ui/button";
import { useLocalToday } from "@/hooks/use-local-today";
import { type DayPlanItem } from "@/lib/day-segments";
import { shiftLocalDateString } from "@/lib/plan-date";

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export default function DayPlanPageClient({
  date,
  items,
  todos,
  hasDayPlan,
}: {
  date: string;
  items: DayPlanItem[];
  todos: TodoRowData[];
  hasDayPlan: boolean;
}) {
  const router = useRouter();
  const today = useLocalToday();
  const isToday = today !== null && date === today;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        router.push(`/day-plan?date=${shiftLocalDateString(date, -1)}`);
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        router.push(`/day-plan?date=${shiftLocalDateString(date, 1)}`);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [date, router]);

  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            router.push(`/day-plan?date=${shiftLocalDateString(date, -1)}`)
          }
        >
          <ChevronLeft />
        </Button>
        <input
          type="date"
          className="rounded-md border px-2 py-1 text-sm"
          value={date}
          onChange={(event) =>
            router.push(`/day-plan?date=${event.target.value}`)
          }
        />
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            router.push(`/day-plan?date=${shiftLocalDateString(date, 1)}`)
          }
        >
          <ChevronRight />
        </Button>
        {isToday || today === null ? null : (
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push(`/day-plan?date=${today}`)}
          >
            Today
          </Button>
        )}
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Day plan</h2>
          {hasDayPlan ? (
            <AddTodosToDayPlanTrigger planDate={date} todos={todos} />
          ) : null}
        </div>
        {hasDayPlan ? (
          <DayPlanTimeline items={items} />
        ) : (
          <CreateDayPlanTrigger planDate={date} todos={todos} />
        )}
      </section>
    </main>
  );
}
