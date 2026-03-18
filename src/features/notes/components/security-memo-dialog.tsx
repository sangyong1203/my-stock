"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { DashboardSecurityNoteRow } from "@/features/dashboard/server/get-dashboard-data";
import {
  type SecurityNoteActionState,
  upsertSecurityNoteAction,
} from "@/features/notes/actions/security-note-actions";

type SecurityMemo = {
  id: string;
  securityId: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

type MemoDraft = {
  noteId: string;
  title: string;
  body: string;
  createdAt: string;
};

const initialState: SecurityNoteActionState = {
  success: false,
  message: "",
};

function toMemo(note: DashboardSecurityNoteRow): SecurityMemo {
  return {
    id: note.id,
    securityId: note.securityId,
    title: note.title ?? "",
    body: note.body,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  };
}

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(new Date(value));
}

function toDateInputValue(value: string) {
  return value.slice(0, 10);
}

function getTodayValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createEmptyDraft(): MemoDraft {
  return {
    noteId: "",
    title: "",
    body: "",
    createdAt: getTodayValue(),
  };
}

function createDraftFromMemo(note: SecurityMemo): MemoDraft {
  return {
    noteId: note.id,
    title: note.title,
    body: note.body,
    createdAt: toDateInputValue(note.createdAt),
  };
}

function SaveButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="w-full sm:w-auto">
      {pending ? "Saving..." : isEditing ? "Update Memo" : "Save Memo"}
    </Button>
  );
}

type Props = {
  symbol: string;
  securityId: string;
  notes: DashboardSecurityNoteRow[];
  triggerClassName?: string;
};

export function SecurityMemoDialog({
  symbol,
  securityId,
  notes,
  triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(upsertSecurityNoteAction, initialState);
  const noteItems = useMemo(() => notes.map(toMemo), [notes]);
  const [memoList, setMemoList] = useState<SecurityMemo[]>(noteItems);
  const [draft, setDraft] = useState<MemoDraft>(createEmptyDraft);

  useEffect(() => {
    setMemoList(noteItems);
  }, [noteItems]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(createEmptyDraft());
  }, [open, securityId]);

  useEffect(() => {
    if (!state.message) {
      return;
    }

    if (!state.success) {
      toast.error(state.message);
      return;
    }

    toast.success(state.message);

    const savedNote = state.savedNote;

    if (!savedNote) {
      return;
    }

    setMemoList((current) => {
      const next = current.filter((item) => item.id !== savedNote.id);
      next.unshift(savedNote);
      return next;
    });
    setDraft(createDraftFromMemo(savedNote));
  }, [state]);

  const isEditing = draft.noteId !== "";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className={triggerClassName}>
          Memo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{symbol} Memo</DialogTitle>
          <DialogDescription>
            Save analysis notes for this open position. The right pane always starts as a blank memo.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 gap-0 sm:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="flex min-h-0 flex-col border-b sm:border-r sm:border-b-0">
            <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
              <div>
                <p className="text-sm font-medium">Memo List</p>
                <p className="text-xs text-muted-foreground">
                  {memoList.length} saved
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => setDraft(createEmptyDraft())}
              >
                New
              </Button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {memoList.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-6 text-sm text-muted-foreground">
                  No memos yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {memoList.map((note) => {
                    const active = draft.noteId === note.id;

                    return (
                      <button
                        key={note.id}
                        type="button"
                        onClick={() => setDraft(createDraftFromMemo(note))}
                        className={`w-full rounded-xl border px-3 py-3 text-left transition ${
                          active
                            ? "border-input bg-transparent dark:bg-input/30"
                            : "border-input bg-transparent hover:bg-muted/40 dark:bg-input/30 dark:hover:bg-input/50"
                        }`}
                      >
                        <div className="truncate text-sm font-medium">{note.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {formatDisplayDate(note.createdAt)}
                        </div>
                        <div className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                          {note.body}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </aside>

          <div className="min-h-0 overflow-y-auto px-6 py-5">
            <form action={formAction} className="flex min-h-full flex-col">
              <input type="hidden" name="securityId" value={securityId} />
              <input type="hidden" name="noteId" value={draft.noteId} />

              <div className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                  <div className="space-y-2">
                    <Label htmlFor={`memo-title-${securityId}`}>Title</Label>
                    <Input
                      id={`memo-title-${securityId}`}
                      name="title"
                      placeholder="Valuation update, earnings review, risk note..."
                      value={draft.title}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`memo-created-at-${securityId}`}>Created Date</Label>
                    <Input
                      id={`memo-created-at-${securityId}`}
                      type="date"
                      value={draft.createdAt}
                      readOnly
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`memo-body-${securityId}`}>Analyzed Content</Label>
                  <textarea
                    id={`memo-body-${securityId}`}
                    name="body"
                    rows={16}
                    placeholder="Write your analysis, scenario notes, catalysts, risks, and review points..."
                    value={draft.body}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        body: event.target.value,
                      }))
                    }
                    className="border-input placeholder:text-muted-foreground dark:bg-input/30 min-h-[360px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2"
                    required
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end border-t pt-4">
                <SaveButton isEditing={isEditing} />
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
