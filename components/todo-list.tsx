"use client";

import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { TodoRow, type TodoRowData } from "@/components/todo-row";
import { useTRPC } from "@/trpc/client";

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

export function TodoList({
  todos,
  highlightTodoId,
}: {
  todos: TodoRowData[];
  highlightTodoId?: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(() => {
    if (highlightTodoId === undefined) {
      return null;
    }
    const index = todos.findIndex((row) => row.id === highlightTodoId);
    return index === -1 ? null : index;
  });
  const trpc = useTRPC();
  const router = useRouter();
  const { mutate: deleteTodo, isPending: isDeleting } = useMutation(
    trpc.todo.delete.mutationOptions({
      onSuccess: () => router.refresh(),
    }),
  );

  const clampIndex = useCallback(
    (index: number) => Math.max(0, Math.min(index, todos.length - 1)),
    [todos.length],
  );

  useEffect(() => {
    if (highlightTodoId === undefined) {
      return;
    }
    const index = todos.findIndex((row) => row.id === highlightTodoId);
    if (index !== -1) {
      setSelectedIndex(index);
    }
  }, [highlightTodoId, todos]);

  useEffect(() => {
    if (selectedIndex === null) {
      return;
    }
    const todo = todos[selectedIndex];
    if (todo === undefined) {
      return;
    }
    if (highlightTodoId !== undefined && todo.id === highlightTodoId) {
      document
        .getElementById(`todo-row-${todo.id}`)
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [highlightTodoId, selectedIndex, todos]);

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
      if (todos.length === 0) {
        return;
      }

      if (event.key === "Escape") {
        let handled = false;
        const active = document.activeElement;
        if (active instanceof HTMLInputElement) {
          const isTodoInput = todos.some(
            (todo) =>
              active.id === `todo-title-${todo.id}` ||
              active.id === `todo-time-${todo.id}`,
          );
          if (isTodoInput) {
            active.blur();
            handled = true;
          }
        }
        if (selectedIndex !== null) {
          setSelectedIndex(null);
          handled = true;
        }
        if (handled) {
          event.preventDefault();
        }
        return;
      }

      if (isEditableTarget(event.target)) {
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

      if (event.key === "Enter" && selectedIndex !== null) {
        const todo = todos[selectedIndex];
        if (todo === undefined) {
          return;
        }
        const titleInput = document.getElementById(`todo-title-${todo.id}`);
        if (titleInput instanceof HTMLInputElement) {
          event.preventDefault();
          titleInput.focus();
          const end = titleInput.value.length;
          titleInput.setSelectionRange(end, end);
        }
        return;
      }

      if (
        (event.key === "t" || event.key === "T") &&
        selectedIndex !== null &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        const todo = todos[selectedIndex];
        if (todo === undefined) {
          return;
        }
        const timeInput = document.getElementById(`todo-time-${todo.id}`);
        if (timeInput instanceof HTMLInputElement) {
          event.preventDefault();
          timeInput.focus();
        }
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
        deleteTodo(
          { id: todo.id },
          {
            onSuccess: () => {
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
            },
          },
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clampIndex, deleteTodo, isDeleting, selectedIndex, todos]);

  return (
    <ul className="flex flex-col gap-4">
      {todos.map((row, index) => (
        <TodoRow
          key={row.id}
          todo={row}
          selected={selectedIndex === index}
          onSelect={() => setSelectedIndex(index)}
        />
      ))}
    </ul>
  );
}
