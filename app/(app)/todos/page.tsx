import { asc } from "drizzle-orm";
import { connection } from "next/server";
import { Suspense } from "react";
import * as z from "zod";

import { TodoCreateForm } from "@/components/todo-create-form";
import { TodoList } from "@/components/todo-list";
import db from "@/lib/db";
import { followUpFromColumns } from "@/lib/follow-up";
import { todo } from "@/lib/schema";

async function TodoListSection({
  highlightTodoId,
}: {
  highlightTodoId: string | undefined;
}) {
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

  if (todos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No todos yet. Add a todo to use in day plans.
      </p>
    );
  }

  const resolvedHighlight =
    highlightTodoId !== undefined &&
    todos.some((row) => row.id === highlightTodoId)
      ? highlightTodoId
      : undefined;

  return <TodoList todos={todos} highlightTodoId={resolvedHighlight} />;
}

async function TodosPageLoader({
  searchParams,
}: {
  searchParams: PageProps<"/todos">["searchParams"];
}) {
  await connection();
  const { todo: todoParam } = await searchParams;
  const highlightTodoId =
    typeof todoParam === "string" && z.uuid().safeParse(todoParam).success
      ? todoParam
      : undefined;

  return (
    <>
      <TodoCreateForm />
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <TodoListSection highlightTodoId={highlightTodoId} />
      </Suspense>
    </>
  );
}

export default function TodosPage(props: PageProps<"/todos">) {
  return (
    <main className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <TodosPageLoader searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
