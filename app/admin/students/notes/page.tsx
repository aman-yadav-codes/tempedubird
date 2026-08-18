"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Eye, Loader2, StickyNote } from "lucide-react";
import { toast } from "sonner";

import { NoteBodyRenderer } from "@/components/notes/note-body-renderer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";

type NoteRow = {
  id: number;
  institution_name?: string | null;
  subject_name?: string | null;
  syllabus_title?: string | null;
  program_title?: string | null;
  section_name?: string | null;
  item_count: number;
  first_item_title?: string | null;
  updated_at: string;
};

type NoteItem = {
  id: number;
  note_id: number;
  node_title?: string | null;
  node_type?: string | null;
  title: string;
  body: string;
  is_active: boolean;
};

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server returned an invalid response" };
  }
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function noteTitle(row: NoteRow) {
  return row.syllabus_title || row.subject_name || row.program_title || "Class Notes";
}

function noteEntryTitle(row: NoteRow) {
  return row.first_item_title || noteTitle(row);
}

function noteListTitle(row: NoteRow) {
  const subject = row.subject_name || row.syllabus_title;
  return [subject, noteEntryTitle(row)].filter(Boolean).join(" - ");
}

function noteScope(row: NoteRow) {
  const subject = row.subject_name || row.syllabus_title;
  const classScope = [row.program_title, row.section_name || "All sections"].filter(Boolean).join(" - ");
  return [subject, classScope].filter(Boolean).join(" - ");
}

function noteClassScope(row: NoteRow) {
  return [row.program_title, row.section_name || "All sections"].filter(Boolean).join(" - ");
}

export default function StudentNotesPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pageCount, setPageCount] = useState(-1);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [viewing, setViewing] = useState<NoteRow | null>(null);
  const [items, setItems] = useState<NoteItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

  const loadRows = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search,
      });
      const res = await fetch(`/api/admin/students/notes?${params.toString()}`, { headers: authHeader });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load notes");
      setRows((json.data ?? []) as NoteRow[]);
      setPageCount(Number(json.pageCount ?? -1));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load notes");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeader, pagination.pageIndex, pagination.pageSize, search]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void loadRows(), 250);
    return () => window.clearTimeout(timeout);
  }, [isReady, loadRows]);

  const loadItems = useCallback(async (noteId: number) => {
    if (!accessToken) return;
    setItemsLoading(true);
    try {
      const params = new URLSearchParams({ action: "items", noteId: String(noteId) });
      const res = await fetch(`/api/admin/students/notes?${params.toString()}`, { headers: authHeader });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load notes");
      setItems((json.data ?? []) as NoteItem[]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load notes");
    } finally {
      setItemsLoading(false);
    }
  }, [accessToken, authHeader]);

  const columns = useMemo<ColumnDef<NoteRow>[]>(() => [
    {
      accessorKey: "syllabus_title",
      header: "Note",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{noteListTitle(row.original)}</p>
          <p className="truncate text-xs text-muted-foreground">
            {noteClassScope(row.original)}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "item_count",
      header: "Entries",
      cell: ({ row }) => row.original.item_count,
    },
    {
      accessorKey: "program_title",
      header: "Class",
      cell: ({ row }) => [row.original.program_title, row.original.section_name].filter(Boolean).join(" - ") || "-",
    },
    {
      accessorKey: "updated_at",
      header: "Updated",
      cell: ({ row }) => formatDate(row.original.updated_at),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setViewing(row.original);
            setItems([]);
            void loadItems(row.original.id);
          }}
        >
          <Eye className="size-4" />
          View
        </Button>
      ),
    },
  ], [loadItems]);

  if (!isReady) return null;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2">
          <StickyNote className="size-6 text-primary" />
          <h1 className="text-2xl font-bold">Notes</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">View notes shared for your class and syllabus.</p>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        manualPagination
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        emptyText="No notes found."
        toolbarLeft={
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPagination((current) => ({ ...current, pageIndex: 0 }));
            }}
            placeholder="Search notes..."
            className="w-full sm:w-80"
          />
        }
      />

      <Sheet open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-3xl">
          <SheetHeader className="space-y-2 border-b px-6 py-6 pr-14">
            <SheetTitle>{viewing ? items[0]?.title || noteEntryTitle(viewing) : "Note"}</SheetTitle>
            <SheetDescription>{viewing ? noteScope(viewing) : ""}</SheetDescription>
          </SheetHeader>
          <div className="space-y-5 px-6 py-5">
            <div className="flex flex-wrap gap-2">
              {viewing?.institution_name && <Badge variant="outline">{viewing.institution_name}</Badge>}
              {viewing?.subject_name && <Badge variant="outline">{viewing.subject_name}</Badge>}
            </div>
            {itemsLoading ? (
              <div className="flex h-32 items-center justify-center rounded-md border">
                <Loader2 className="size-5 animate-spin" />
              </div>
            ) : items.length ? (
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="rounded-md border bg-card p-5">
                    <div className="border-b pb-3">
                      <h3 className="text-lg font-semibold">{item.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{item.node_title || "Overall syllabus note"}</p>
                    </div>
                    <div className="mt-4">
                      <NoteBodyRenderer value={item.body} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                No note entries found.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
