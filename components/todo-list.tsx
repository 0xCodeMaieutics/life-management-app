"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { deleteTodo } from "@/app/(app)/todos/actions";
import { TodoRow, type TodoRowData } from "@/components/todo-row";

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

export function TodoList({ todos }: { todos: TodoRowData[] }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isDeleting, startDelete] = useTransition();

  const clampIndex = useCallback(
    (index: number) => Math.max(0, Math.min(index, todos.length - 1)),
    [todos.length],
  );

  useEffect(() => {
    if (selectedIndex === null) {
      return;
    }
    if (todos.length === 0) {
      setSelectedIndex(null);
      return;
    }
    if (selectedIndex >= todos.length) {
      setSelectedIndex(todos.length - 1);
    }
  }, [selectedIndex, todos.length]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (todos.length === 0 || isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((current) => {
          if (current === null) {
            return 0;
          }
          return clampIndex(current + 1);
        });
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((current) => {
          if (current === null) {
            return todos.length - 1;
          }
          return clampIndex(current - 1);
        });
        return;
      }

      if (
        (event.key === "Backspace" || event.key === "Delete") &&
        selectedIndex !== null &&
        !isDeleting
      ) {
        event.preventDefault();
        const todo = todos[selectedIndex];
        if (todo === undefined) {
          return;
        }
        const indexToRemove = selectedIndex;
        startDelete(async () => {
          const result = await deleteTodo(todo.id);
          if (result.ok) {
            setSelectedIndex((current) => {
              if (current === null) {
                return null;
              }
              const nextLength = todos.length - 1;
              if (nextLength === 0) {
                return null;
              }
              if (indexToRemove >= nextLength) {
                return nextLength - 1;
              }
              return indexToRemove;
            });
          }
        });
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clampIndex, isDeleting, selectedIndex, todos]);

  return (
    <ul className="flex flex-col gap-4">
      {todos.map((row, index) => (
        <TodoRow key={row.id} todo={row} selected={selectedIndex === index} />
      ))}
    </ul>
  );
}
