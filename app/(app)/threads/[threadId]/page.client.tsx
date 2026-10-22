"use client";

import { useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Effect } from "effect";
import { FetchHttpClient, HttpClient, HttpClientRequest } from "effect/http";
import {
  CheckSquare,
  FileText,
  Pencil,
  RotateCcw,
  Square,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type FormEvent,
  Fragment,
  type KeyboardEvent,
  useRef,
  useState,
} from "react";

import { DayPlanItemReferenceLink } from "@/components/day-plan-item-reference-link";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { formatPlanDateForDisplay } from "@/lib/plan-date-display";
import { type THREAD_STATUSES } from "@/lib/schema";
import { MAX_THREAD_ATTACHMENT_BYTES } from "@/lib/thread-attachment";
import {
  MAX_THREAD_NOTE_LENGTH,
  splitThreadNoteContent,
} from "@/lib/thread-note";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type ThreadNote = { id: string; content: string; createdAt: string };

type ThreadAttachment = { id: string; fileName: string; createdAt: string };

const TEXTAREA_CLASS_NAME =
  "min-h-20 w-full min-w-0 resize-y rounded-md border border-input bg-transparent px-2.5 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 md:text-sm dark:bg-input/30";

function submitOnModifierEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  }
}

export default function ThreadDetailPageClient({
  thread,
  notes,
  attachments,
  linkedItems,
}: {
  thread: {
    id: string;
    title: string;
    status: (typeof THREAD_STATUSES)[number];
  };
  notes: ThreadNote[];
  attachments: ThreadAttachment[];
  linkedItems: {
    id: string;
    title: string;
    completed: boolean;
    cancelled: boolean;
    planDate: string;
  }[];
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [noteFormKey, setNoteFormKey] = useState(0);
  const updateTitle = useMutation(
    trpc.thread.updateTitle.mutationOptions({
      onSuccess: () => {
        router.refresh();
        setIsEditingTitle(false);
      },
    }),
  );
  const setCompleted = useMutation(
    trpc.thread.setCompleted.mutationOptions({
      onSuccess: () => router.refresh(),
    }),
  );
  const deleteThread = useMutation(
    trpc.thread.delete.mutationOptions({
      onSuccess: () => {
        router.push("/threads");
        router.refresh();
      },
    }),
  );
  const addNote = useMutation(
    trpc.thread.addNote.mutationOptions({
      onSuccess: () => {
        router.refresh();
        setNoteFormKey((key) => key + 1);
      },
    }),
  );
  const isCompleted = thread.status === "COMPLETED";

  function handleTitleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTitle = new FormData(event.currentTarget).get("title");
    updateTitle.mutate({
      threadId: thread.id,
      title: typeof nextTitle === "string" ? nextTitle : "",
    });
  }

  function handleNoteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = new FormData(event.currentTarget).get("content");
    addNote.mutate({
      threadId: thread.id,
      content: typeof content === "string" ? content : "",
    });
  }

  return (
    <article className="flex flex-col gap-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        {isEditingTitle ? (
          <form
            onSubmit={handleTitleSubmit}
            className="flex flex-1 flex-col gap-y-1"
          >
            <div className="flex items-center gap-x-2">
              <Input
                name="title"
                defaultValue={thread.title}
                aria-label="Title"
                aria-invalid={updateTitle.error !== null}
                maxLength={200}
                required
                autoFocus
              />
              <Button type="submit" size="sm" disabled={updateTitle.isPending}>
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={updateTitle.isPending}
                onClick={() => setIsEditingTitle(false)}
              >
                Cancel
              </Button>
            </div>
            {updateTitle.error !== null ? (
              <p className="text-xs text-destructive">
                Could not rename the thread
              </p>
            ) : null}
          </form>
        ) : (
          <div className="flex min-w-0 items-center gap-x-2">
            <h1
              className={cn(
                "text-lg font-semibold",
                isCompleted && "text-muted-foreground line-through",
              )}
            >
              {thread.title}
            </h1>
            <span
              className={cn(
                "shrink-0 rounded-full border px-2 py-0.5 text-xs",
                isCompleted
                  ? "border-primary/50 text-primary"
                  : "text-muted-foreground",
              )}
            >
              {isCompleted ? "Completed" : "Pending"}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Rename thread"
              onClick={() => {
                updateTitle.reset();
                setIsEditingTitle(true);
              }}
            >
              <Pencil />
            </Button>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-x-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={setCompleted.isPending}
            onClick={() => {
              setCompleted.mutate({
                threadId: thread.id,
                completed: !isCompleted,
              });
            }}
          >
            {isCompleted ? <RotateCcw /> : <CheckSquare />}
            {isCompleted ? "Reopen" : "Mark completed"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Delete thread"
            onClick={() => {
              deleteThread.reset();
              setIsDeleteConfirmOpen(true);
            }}
          >
            <Trash2 />
          </Button>
        </div>
      </header>

      {linkedItems.length > 0 ? (
        <section className="flex flex-col gap-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">
            Day plan items
          </h2>
          <ul className="flex flex-col gap-y-1">
            {linkedItems.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/day-plan?date=${item.planDate}&item=${item.id}`}
                  className="flex items-center gap-x-2 text-sm hover:underline"
                >
                  {item.completed ? (
                    <CheckSquare
                      className="size-4 shrink-0 stroke-primary text-primary"
                      aria-label="Completed"
                    />
                  ) : (
                    <Square
                      className={cn(
                        "size-4 shrink-0",
                        item.cancelled
                          ? "stroke-destructive/70 text-destructive/70"
                          : "stroke-muted-foreground",
                      )}
                      aria-label={item.cancelled ? "Cancelled" : "Open"}
                    />
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {formatPlanDateForDisplay(item.planDate)}
                  </span>
                  <span
                    className={cn(
                      "min-w-0 truncate",
                      item.completed && "text-muted-foreground line-through",
                      item.cancelled && "text-destructive/80 line-through",
                    )}
                  >
                    {item.title}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ThreadAttachmentsSection
        threadId={thread.id}
        attachments={attachments}
      />

      <section className="flex flex-col gap-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">Notes</h2>
        <form
          key={noteFormKey}
          onSubmit={handleNoteSubmit}
          className="flex flex-col gap-y-2"
        >
          <textarea
            name="content"
            aria-label="New note"
            placeholder="What happened? (⌘ Enter to add)"
            required
            maxLength={MAX_THREAD_NOTE_LENGTH}
            className={TEXTAREA_CLASS_NAME}
            onKeyDown={submitOnModifierEnter}
          />
          <div className="flex items-center justify-end gap-x-2">
            {addNote.error !== null ? (
              <p className="text-xs text-destructive">Could not add the note</p>
            ) : null}
            <Button type="submit" size="sm" disabled={addNote.isPending}>
              {addNote.isPending ? "Adding…" : "Add note"}
            </Button>
          </div>
        </form>
        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="flex flex-col gap-y-2">
            {notes.map((note) => (
              <li key={note.id}>
                <ThreadNoteRow note={note} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete thread?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {thread.title} and its notes will be deleted
            {attachments.length > 0
              ? `, along with ${attachments.length} ${attachments.length === 1 ? "attachment" : "attachments"}`
              : ""}
            . Linked day plan items stay on their day plans.
          </p>
          {deleteThread.error !== null ? (
            <p className="text-sm text-destructive">
              Could not delete the thread
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteThread.isPending}
              onClick={() => deleteThread.mutate({ threadId: thread.id })}
            >
              {deleteThread.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function ThreadNoteRow({ note }: { note: ThreadNote }) {
  const trpc = useTRPC();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const updateNote = useMutation(
    trpc.thread.updateNote.mutationOptions({
      onSuccess: () => {
        router.refresh();
        setIsEditing(false);
      },
    }),
  );
  const deleteNote = useMutation(
    trpc.thread.deleteNote.mutationOptions({
      onSuccess: () => router.refresh(),
    }),
  );
  const addedAt = (
    <time
      dateTime={note.createdAt}
      className="text-xs text-muted-foreground tabular-nums"
      suppressHydrationWarning
    >
      {format(new Date(note.createdAt), "MMM d, HH:mm")}
    </time>
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const content = new FormData(event.currentTarget).get("content");
    updateNote.mutate({
      noteId: note.id,
      content: typeof content === "string" ? content : "",
    });
  }

  if (isEditing) {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-y-2 rounded-lg border px-4 py-3"
      >
        {addedAt}
        <textarea
          name="content"
          aria-label="Note"
          defaultValue={note.content}
          required
          maxLength={MAX_THREAD_NOTE_LENGTH}
          className={TEXTAREA_CLASS_NAME}
          autoFocus
          onKeyDown={submitOnModifierEnter}
        />
        <div className="flex items-center justify-end gap-x-2">
          {updateNote.error !== null ? (
            <p className="text-xs text-destructive">Could not save the note</p>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={updateNote.isPending}
            onClick={() => setIsEditing(false)}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={updateNote.isPending}>
            Save
          </Button>
        </div>
      </form>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger className="flex flex-col gap-y-1 rounded-lg border px-4 py-3">
        {addedAt}
        <p className="text-sm wrap-break-word whitespace-pre-wrap">
          {splitThreadNoteContent(note.content).map((segment, index) =>
            segment.kind === "text" ? (
              <Fragment key={index}>{segment.text}</Fragment>
            ) : (
              <DayPlanItemReferenceLink
                key={index}
                reference={segment.reference}
              />
            ),
          )}
        </p>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          onClick={() => {
            updateNote.reset();
            setIsEditing(true);
          }}
        >
          <Pencil />
          Edit note
        </ContextMenuItem>
        <ContextMenuItem
          variant="destructive"
          disabled={deleteNote.isPending}
          onClick={() => deleteNote.mutate({ noteId: note.id })}
        >
          <Trash2 />
          Delete note
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

function ThreadAttachmentsSection({
  threadId,
  attachments,
}: {
  threadId: string;
  attachments: ThreadAttachment[];
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [hasInvalidFiles, setHasInvalidFiles] = useState(false);
  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      const body = new FormData();
      for (const file of files) {
        body.append("files", file);
      }

      const request = HttpClientRequest.post(
        `/api/threads/${threadId}/attachments`,
      ).pipe(HttpClientRequest.bodyFormData(body));

      return Effect.runPromise(
        Effect.gen(function* () {
          const response = yield* HttpClient.execute(request);

          if (response.status < 200 || response.status >= 300) {
            return yield* Effect.fail(new Error());
          }
        }).pipe(
          Effect.provide(FetchHttpClient.layer),
          Effect.mapError(() => new Error("Request failed")),
        ),
      );
    },
    onSuccess: () => router.refresh(),
  });

  function uploadFiles(fileList: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) return;

    upload.reset();
    const hasOnlyValidFiles = files.every(
      (file) =>
        file.type === "application/pdf" &&
        file.size > 0 &&
        file.size <= MAX_THREAD_ATTACHMENT_BYTES,
    );
    setHasInvalidFiles(!hasOnlyValidFiles);
    if (hasOnlyValidFiles) {
      upload.mutate(files);
    }
  }

  return (
    <section
      className={cn(
        "-m-2 flex flex-col gap-y-3 rounded-lg border border-dashed border-transparent p-2",
        isDraggingOver && "border-primary/50 bg-muted/50",
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsDraggingOver(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDraggingOver(false);
        uploadFiles(event.dataTransfer.files);
      }}
    >
      <div className="flex items-center justify-between gap-x-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Attachments
        </h2>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={(event) => {
            uploadFiles(event.currentTarget.files);
            event.currentTarget.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={upload.isPending}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload />
          {upload.isPending ? "Uploading…" : "Upload PDF"}
        </Button>
      </div>
      {hasInvalidFiles ? (
        <p className="text-xs text-destructive">
          Only PDF files up to 20 MB can be uploaded
        </p>
      ) : null}
      {upload.error !== null ? (
        <p className="text-xs text-destructive">
          Could not upload the attachments
        </p>
      ) : null}
      {attachments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No attachments yet. Drop PDFs here or use Upload PDF.
        </p>
      ) : (
        <ul className="flex flex-col gap-y-2">
          {attachments.map((attachment) => (
            <li key={attachment.id}>
              <ThreadAttachmentRow attachment={attachment} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ThreadAttachmentRow({ attachment }: { attachment: ThreadAttachment }) {
  const trpc = useTRPC();
  const router = useRouter();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const deleteAttachment = useMutation(
    trpc.thread.deleteAttachment.mutationOptions({
      onSuccess: () => {
        setIsDeleteConfirmOpen(false);
        router.refresh();
      },
    }),
  );

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger
          render={
            <a
              href={`/api/thread-attachments/${attachment.id}`}
              target="_blank"
              rel="noopener noreferrer"
            />
          }
          className="flex items-center gap-x-3 rounded-lg border px-4 py-3 hover:bg-muted/50"
        >
          <FileText className="size-4 shrink-0 text-muted-foreground" />
          <span className="min-w-0 flex-1 truncate text-sm">
            {attachment.fileName}
          </span>
          <time
            dateTime={attachment.createdAt}
            className="shrink-0 text-xs text-muted-foreground tabular-nums"
            suppressHydrationWarning
          >
            {format(new Date(attachment.createdAt), "MMM d, HH:mm")}
          </time>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            variant="destructive"
            onClick={() => {
              deleteAttachment.reset();
              setIsDeleteConfirmOpen(true);
            }}
          >
            <Trash2 />
            Delete attachment
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete attachment?</DialogTitle>
          </DialogHeader>
          <p className="text-sm break-all text-muted-foreground">
            {attachment.fileName} will be deleted for good.
          </p>
          {deleteAttachment.error !== null ? (
            <p className="text-sm text-destructive">
              Could not delete the attachment
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteAttachment.isPending}
              onClick={() =>
                deleteAttachment.mutate({ attachmentId: attachment.id })
              }
            >
              {deleteAttachment.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
