import { asc } from "drizzle-orm";
import { Suspense } from "react";

import { TodoCreateForm } from "@/components/todo-create-form";
import { TodoRow } from "@/components/todo-row";
import db from "@/lib/db";
import { todo } from "@/lib/schema";

async function TodoList() {
  const todos = await db
    .select({
      id: todo.id,
      title: todo.title,
      targetTime: todo.targetTime,
    })
    .from(todo)
    .orderBy(asc(todo.createdAt));

  if (todos.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No todos yet. Add one above to use in day plans.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-4">
      {todos.map((row) => (
        <TodoRow key={row.id} todo={row} />
      ))}
    </ul>
  );
}

export default function TodosPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <h1 className="text-lg font-semibold">Todos</h1>
      <TodoCreateForm />
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <TodoList />
      </Suspense>
    </main>
  );
}
