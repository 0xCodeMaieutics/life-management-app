import { asc } from "drizzle-orm";
import { Suspense } from "react";

import { TodoCreateForm } from "@/components/todo-create-form";
import { TodoList } from "@/components/todo-list";
import db from "@/lib/db";
import { todo } from "@/lib/schema";

async function TodoListSection() {
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
        No todos yet. Add a todo to use in day plans.
      </p>
    );
  }

  return <TodoList todos={todos} />;
}

export default function TodosPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 p-6">
      <TodoCreateForm />
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <TodoListSection />
      </Suspense>
    </main>
  );
}
