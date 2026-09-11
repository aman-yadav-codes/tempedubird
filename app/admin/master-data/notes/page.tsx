"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  Ban,
  BookOpen,
  CheckCircle2,
  CreditCard,
  Eye,
  FileCheck2,
  FileText,
  HelpCircle,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { NoteQuestionEditor } from "@/components/notes/note-question-editor";
import { NoteTemplateEditor } from "@/components/notes/note-template-editor";
import type { NoteInstitutionOption } from "@/components/notes/note-template-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import type { NoteTemplateRow } from "@/lib/types/notes";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

type Stats = { total: number; active: number; blocked: number; questions: number };
type NotesView = "my" | "marketplace";

const emptyStats: Stats = { total: 0, active: 0, blocked: 0, questions: 0 };
const inheritedBadgeClass =
  "border-emerald-500/70 bg-transparent px-1.5 py-0 text-[10px] font-medium text-emerald-400";

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { error: "Server returned an invalid response" };
  }
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-card px-5 py-4 shadow-sm">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function getSyllabusSummary(syllabusData: unknown) {
  if (!Array.isArray(syllabusData) || syllabusData.length === 0) return null;
  const units: string[] = [];
  for (const unit of syllabusData) {
    if (!unit) continue;
    const uTitle = unit.title || unit.name || (unit.unit_number ? `Unit ${unit.unit_number}` : null);
    if (uTitle && !units.includes(uTitle)) {
      units.push(uTitle);
    }
  }
  return units.length > 0 ? units : null;
}

export default function NotesPage() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitutionId } = useActiveInstitution();
  const isPlatformAdmin = isPlatformAdminUser(user);

  const [rows, setRows] = useState<NoteTemplateRow[]>([]);
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(-1);
  const [totalRows, setTotalRows] = useState(0);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [notesView, setNotesView] = useState<NotesView>("my");

  // Editors and Modals
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<NoteTemplateRow | null>(null);
  const [questionEditorOpen, setQuestionEditorOpen] = useState(false);
  const [questionTarget, setQuestionTarget] = useState<NoteTemplateRow | null>(null);

  // View Sheet
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [viewingNote, setViewingNote] = useState<NoteTemplateRow | null>(null);
  const [viewLoading, setViewLoading] = useState(false);

  // Delete Dialog
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Inherit Marketplace Note Dialog
  const [inheritOpen, setInheritOpen] = useState(false);
  const [inheritTarget, setInheritTarget] = useState<NoteTemplateRow | null>(null);
  const [inheritInstitutionId, setInheritInstitutionId] = useState("");
  const [inheriting, setInheriting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const fetchInstitutions = useCallback(
    async (query: string, page: number) => {
      if (!accessToken) return { data: [], hasMore: false };
      const res = await fetch(
        `/api/admin/institutions?search=${encodeURIComponent(query)}&page=${page}&limit=20`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const json = await readJson(res);
      const data = ((json.data ?? []) as Array<{ id: number; name?: string; slug?: string }>).map((i) => ({
        id: i.id,
        name: i.name || i.slug || `Institution ${i.id}`,
      }));
      return { data, hasMore: (json.page ?? 1) < (json.pageCount ?? 1) };
    },
    [accessToken]
  );

  const fetchNotes = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search: debouncedSearch,
        view: notesView,
      });

      if (activeInstitutionId) {
        params.set("institutionId", String(activeInstitutionId));
      }

      const res = await fetch(`/api/admin/master-data/notes?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to fetch notes");

      setRows(json.data ?? []);
      setTotalRows(json.total ?? 0);
      setPageCount(json.pageCount ?? 1);
      if (json.stats) setStats(json.stats);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to fetch notes");
    } finally {
      setLoading(false);
    }
  }, [accessToken, pagination, debouncedSearch, notesView, activeInstitutionId]);

  useEffect(() => {
    if (!isReady) return;
    void fetchNotes();
  }, [isReady, fetchNotes]);

  const openViewSheet = async (note: NoteTemplateRow) => {
    setViewSheetOpen(true);
    setViewLoading(true);
    setViewingNote(note);
    try {
      const res = await fetch(`/api/admin/master-data/notes/${note.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJson(res);
      if (res.ok && json.data) {
        setViewingNote(json.data);
      }
    } catch {
      // fallback to preview row
    } finally {
      setViewLoading(false);
    }
  };

  const openQuestionEditor = async (note: NoteTemplateRow) => {
    try {
      const res = await fetch(`/api/admin/master-data/notes/${note.id}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await readJson(res);
      if (res.ok && json.data) {
        setQuestionTarget(json.data);
      } else {
        setQuestionTarget(note);
      }
    } catch {
      setQuestionTarget(note);
    }
    setQuestionEditorOpen(true);
  };

  const deleteSelected = async () => {
    if (!accessToken || !selectedIds.length) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/master-data/notes`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids: selectedIds }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to delete notes");
      toast.success("Notes deleted successfully");
      setSelectedIds([]);
      setDeleteConfirmOpen(false);
      void fetchNotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete notes");
    } finally {
      setIsDeleting(false);
    }
  };

  const isAlreadyInherited = useCallback(
    (row: NoteTemplateRow) => {
      return !isPlatformAdmin && notesView === "marketplace" && Boolean(row.inherited_by_institution_name);
    },
    [isPlatformAdmin, notesView]
  );

  const startInheritNote = (note: NoteTemplateRow) => {
    const effectiveInstId =
      activeInstitutionId ??
      (user?.memberships?.[0]?.institution_id ? Number(user.memberships[0].institution_id) : null) ??
      ((user as any)?.institution_id ? Number((user as any).institution_id) : null);

    if (!isPlatformAdmin && !effectiveInstId) {
      toast.error("Select an institution from the sidebar first");
      return;
    }

    setInheritTarget(note);
    if (!isPlatformAdmin && effectiveInstId) {
      setInheritInstitutionId(String(effectiveInstId));
    }
    setInheritOpen(true);
  };

  const directInheritFreeNote = async (note: NoteTemplateRow) => {
    const effectiveInstId =
      activeInstitutionId ??
      (user?.memberships?.[0]?.institution_id ? Number(user.memberships[0].institution_id) : null) ??
      ((user as any)?.institution_id ? Number((user as any).institution_id) : null);

    if (!effectiveInstId) {
      toast.error("Select an institution from the sidebar first");
      return;
    }

    setInheriting(true);
    try {
      const res = await fetch(`/api/admin/master-data/notes/${note.id}/inherit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ institution_id: effectiveInstId }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to inherit note");
      toast.success("Note inherited into My Notes successfully");
      setNotesView("my");
      setPagination((p) => ({ ...p, pageIndex: 0 }));
      void fetchNotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to inherit note");
    } finally {
      setInheriting(false);
    }
  };

  const executeInherit = async () => {
    if (!accessToken || !inheritTarget) return;
    const targetInst = isPlatformAdmin
      ? Number(inheritInstitutionId)
      : activeInstitutionId
      ? Number(activeInstitutionId)
      : Number(inheritInstitutionId);

    if (!targetInst) {
      toast.error("Please specify a valid institution");
      return;
    }
    setInheriting(true);
    try {
      const res = await fetch(`/api/admin/master-data/notes/${inheritTarget.id}/inherit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ institution_id: targetInst }),
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to inherit note");
      toast.success(
        inheritTarget.is_paid && inheritTarget.price > 0
          ? `Purchased and inherited "${inheritTarget.title}" (₹${inheritTarget.price})`
          : `Inherited "${inheritTarget.title}" into My Notes`
      );
      setInheritOpen(false);
      setInheritTarget(null);
      setNotesView("my");
      setPagination((p) => ({ ...p, pageIndex: 0 }));
      void fetchNotes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to inherit note");
    } finally {
      setInheriting(false);
    }
  };

  const columns = useMemo<ColumnDef<NoteTemplateRow>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={table.getIsAllPageRowsSelected()}
            onCheckedChange={(val) => table.toggleAllPageRowsSelected(Boolean(val))}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(val) => row.toggleSelected(Boolean(val))}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "title",
        header: "Note Title",
        cell: ({ row }) => {
          const item = row.original;
          return (
            <button
              type="button"
              className="min-w-[280px] cursor-pointer text-left py-1"
              onClick={() => void openViewSheet(item)}
            >
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-foreground hover:underline">{item.title}</span>
                {item.is_public && (
                  <Badge variant="outline" className="border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300 text-[10px]">
                    Marketplace
                  </Badge>
                )}
              </div>
              {item.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.description}</p>
              )}
            </button>
          );
        },
      },
      {
        accessorKey: "subject_name",
        header: "Subject",
        cell: ({ row }) => (
          <span className="text-xs font-medium">{row.original.subject_name || "General"}</span>
        ),
      },
      {
        accessorKey: "syllabus_data",
        header: "Syllabus",
        cell: ({ row }) => {
          const units = getSyllabusSummary(row.original.syllabus_data);
          if (!units || units.length === 0) {
            return <span className="text-xs text-muted-foreground">-</span>;
          }
          return (
            <div className="flex flex-wrap gap-1 max-w-[220px]">
              {units.slice(0, 2).map((u, i) => (
                <Badge key={i} variant="secondary" className="text-[10px] font-normal">
                  {u}
                </Badge>
              ))}
              {units.length > 2 && (
                <span className="text-[10px] text-muted-foreground font-medium">+{units.length - 2} more</span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "question_count",
        header: "Q&A Entries",
        cell: ({ row }) => {
          const count = row.original.question_count ?? row.original.item_count ?? 0;
          return (
            <Badge variant="outline" className="bg-muted/40 font-mono text-xs">
              {count} {count === 1 ? "entry" : "entries"}
            </Badge>
          );
        },
      },
      {
        id: "pricing",
        header: "Pricing",
        cell: ({ row }) => {
          const item = row.original;
          const isPaid = Boolean(item.is_paid || Number(item.price) > 0);
          const price = Number(item.price) || 0;
          return isPaid ? (
            <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-600 font-bold text-xs">
              ₹{price}
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-bold text-xs">
              Free
            </Badge>
          );
        },
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const item = row.original;
          const alreadyInherited = isAlreadyInherited(item);
          const isPaid = Boolean(item.is_paid || Number(item.price) > 0);

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => void openViewSheet(item)} className="gap-2">
                  <Eye className="size-4 text-muted-foreground" />
                  View Note
                </DropdownMenuItem>

                {notesView === "marketplace" && !isPlatformAdmin ? (
                  <>
                    <DropdownMenuSeparator />
                    {alreadyInherited ? (
                      <DropdownMenuItem disabled className="gap-2">
                        <Badge variant="outline" className={inheritedBadgeClass}>
                          Already inherited
                        </Badge>
                      </DropdownMenuItem>
                    ) : isPaid ? (
                      <DropdownMenuItem
                        onClick={() => startInheritNote(item)}
                        className="gap-2 text-rose-600 font-semibold"
                      >
                        <CreditCard className="size-4" />
                        Buy & Inherit (₹{item.price})
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem
                        onClick={() => void directInheritFreeNote(item)}
                        className="gap-2 text-emerald-600 font-semibold"
                      >
                        <BookOpen className="size-4" />
                        Inherit Free
                      </DropdownMenuItem>
                    )}
                  </>
                ) : (
                  <>
                    <DropdownMenuItem
                      onClick={() => void openQuestionEditor(item)}
                      className="gap-2"
                    >
                      <Plus className="size-4 text-primary" />
                      Manage Q&A Entries
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setEditing(item);
                        setEditorOpen(true);
                      }}
                      className="gap-2"
                    >
                      <Pencil className="size-4 text-muted-foreground" />
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedIds([item.id]);
                        setDeleteConfirmOpen(true);
                      }}
                      className="gap-2 text-destructive focus:text-destructive"
                    >
                      <Trash2 className="size-4" />
                      Delete Note
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [isAlreadyInherited, notesView, isPlatformAdmin]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Notes & Handouts</h1>
          <p className="text-sm text-muted-foreground">
            {isPlatformAdmin
              ? "Manage master notes library, review marketplace submissions, and create handouts."
              : "Create institution study notes or inherit pre-made notes from the marketplace."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              if (notesView !== "my") {
                setNotesView("my");
              }
              setEditing(null);
              setEditorOpen(true);
            }}
            className="gap-1.5"
          >
            <Plus className="size-4" />
            Add Note
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant={notesView === "my" ? "default" : "outline"}
          onClick={() => {
            setNotesView("my");
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          My Notes
        </Button>
        <Button
          type="button"
          variant={notesView === "marketplace" ? "default" : "outline"}
          onClick={() => {
            setNotesView("marketplace");
            setPagination((p) => ({ ...p, pageIndex: 0 }));
          }}
        >
          Marketplace
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Notes" value={stats.total} />
        <StatCard label="Active Notes" value={stats.active} />
        <StatCard label="Q&A Entries" value={stats.questions} />
        <StatCard label="Blocked" value={stats.blocked} />
      </div>

      {/* Main Table Card */}
      <DataTable
        columns={columns}
        data={rows}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        loading={loading}
        emptyText={notesView === "marketplace" ? "No notes found in marketplace." : "No notes found in your library."}
        onRowClick={(row) => void openViewSheet(row)}
        toolbarLeft={
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes, subjects, classes..."
            className="w-full sm:w-80"
          />
        }
        toolbarRight={
          <Button type="button" variant="ghost" size="icon" onClick={() => void fetchNotes()}>
            <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            <span className="sr-only">Refresh notes</span>
          </Button>
        }
        selectedActions={(selectedRows) => (
          <Button
            variant="destructive"
            size="sm"
            onClick={() => {
              setSelectedIds(selectedRows.map((r) => r.id));
              setDeleteConfirmOpen(true);
            }}
            className="gap-1.5"
          >
            <Trash2 className="size-3.5" />
            Delete selected ({selectedRows.length})
          </Button>
        )}
      />

      {/* Note Template Wizard Modal */}
      <NoteTemplateEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        accessToken={accessToken}
        template={editing}
        fetchInstitutions={fetchInstitutions}
        onSaved={(_noteId) => {
          void fetchNotes();
        }}
      />

      {/* Q&A Editor Modal */}
      {questionTarget && (
        <NoteQuestionEditor
          open={questionEditorOpen}
          onOpenChange={setQuestionEditorOpen}
          accessToken={accessToken}
          template={questionTarget}
          onSaved={async () => {
            await fetchNotes();
            if (viewingNote?.id === questionTarget.id) {
              await openViewSheet(questionTarget);
            }
          }}
        />
      )}

      {/* Note View Sheet */}
      <Sheet open={viewSheetOpen} onOpenChange={setViewSheetOpen}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0" defaultSize={720} resizable minSize={420} maxSize={1040}>
          <SheetHeader className="border-b px-6 py-5 pr-12 text-left">
            <div className="flex items-center justify-between gap-4">
              <SheetTitle className="text-xl">{viewingNote?.title ?? "Note Details"}</SheetTitle>
              <div className="flex items-center gap-2">
                {(isPlatformAdmin || notesView === "my") && viewingNote && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditing(viewingNote);
                      setEditorOpen(true);
                    }}
                    className="gap-1.5"
                  >
                    <Pencil className="size-3.5" />
                    Edit Note
                  </Button>
                )}
                {notesView === "marketplace" && viewingNote && !isPlatformAdmin && (
                  <div>
                    {isAlreadyInherited(viewingNote) ? (
                      <Badge variant="outline" className={inheritedBadgeClass}>
                        Already inherited
                      </Badge>
                    ) : viewingNote.is_paid && viewingNote.price > 0 ? (
                      <Button
                        size="sm"
                        onClick={() => startInheritNote(viewingNote)}
                        disabled={inheriting}
                        className="gap-1.5 bg-rose-600 hover:bg-rose-700 text-white"
                      >
                        <CreditCard className="size-4" />
                        Pay ₹{viewingNote.price} & Inherit
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => void directInheritFreeNote(viewingNote)}
                        disabled={inheriting}
                        className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <BookOpen className="size-4" />
                        Inherit Free
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
            <SheetDescription>
              {viewingNote?.subject_name ? `Subject: ${viewingNote.subject_name}` : "General Notes"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {viewLoading ? (
              <div className="flex h-48 items-center justify-center gap-2 text-muted-foreground text-sm">
                <Loader2 className="size-4 animate-spin" />
                Loading note details...
              </div>
            ) : !viewingNote ? (
              <p className="text-sm text-muted-foreground">No details found.</p>
            ) : (
              <div className="space-y-6">
                {/* Metric Summary */}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="mt-1 text-base font-semibold">{viewingNote.subject_name || "General"}</p>
                  </div>
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground">Q&A Entries</p>
                    <p className="mt-1 text-xl font-semibold">
                      {viewingNote.questions?.length ?? viewingNote.question_count ?? 0}
                    </p>
                  </div>
                </div>

                {viewingNote.description && (
                  <div>
                    <h2 className="font-semibold text-sm">Description</h2>
                    <p className="mt-1.5 text-sm text-muted-foreground whitespace-pre-line">{viewingNote.description}</p>
                  </div>
                )}

                {/* Syllabus Mapping */}
                <section className="space-y-3">
                  <div>
                    <h2 className="font-semibold">Syllabus Mapping</h2>
                    <p className="text-sm text-muted-foreground">
                      Curriculum topics and syllabus units linked to this note.
                    </p>
                  </div>
                  {viewingNote.subject_name && (
                    <div className="flex items-center gap-2 rounded-lg bg-primary/10 px-3.5 py-2 text-primary font-medium text-sm">
                      <span className="text-xs text-muted-foreground">Subject:</span>
                      <span className="font-bold">{viewingNote.subject_name}</span>
                    </div>
                  )}
                  {Array.isArray(viewingNote.syllabus_data) && viewingNote.syllabus_data.length > 0 ? (
                    <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
                      {viewingNote.syllabus_data.map((unit: any, uIdx: number) => (
                        <div key={unit.id ?? uIdx} className="rounded-md border bg-card p-3">
                          <p className="font-semibold text-sm flex items-center gap-2">
                            <span className="flex size-5 items-center justify-center rounded bg-primary/10 text-primary text-xs font-bold">
                              {unit.unit_number ?? uIdx + 1}
                            </span>
                            {unit.title}
                          </p>
                          {Array.isArray(unit.chapters) && unit.chapters.length > 0 && (
                            <div className="mt-2 ml-7 pl-3 border-l space-y-2">
                              {unit.chapters.map((chapter: any, cIdx: number) => (
                                <div key={chapter.id ?? cIdx} className="space-y-1">
                                  <p className="text-xs font-medium text-foreground">
                                    • {chapter.title}
                                  </p>
                                  {Array.isArray(chapter.lessons) && chapter.lessons.length > 0 && (
                                    <div className="ml-4 space-y-0.5">
                                      {chapter.lessons.map((lesson: any, lIdx: number) => (
                                        <p key={lesson.id ?? lIdx} className="text-[11px] text-muted-foreground">
                                          - {lesson.title}
                                        </p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-md border border-dashed px-4 py-6 text-center text-xs text-muted-foreground">
                      No specific syllabus units mapped to this note.
                    </div>
                  )}
                </section>

                {/* Questions / Q&A entries */}
                <section className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold">Q&A Entries</h2>
                      <p className="text-sm text-muted-foreground">
                        Questions and detailed explanations for this note.
                      </p>
                    </div>
                    {(isPlatformAdmin || notesView === "my") && (
                      <Button
                        type="button"
                        onClick={() => {
                          void openQuestionEditor(viewingNote);
                        }}
                        className="gap-1.5"
                      >
                        <Plus className="size-4" />
                        Manage Q&As
                      </Button>
                    )}
                  </div>

                  {!viewingNote.questions || viewingNote.questions.length === 0 ? (
                    <div className="rounded-md border border-dashed p-8 text-center text-muted-foreground text-sm">
                      <p>No Q&A entries added yet.</p>
                      {(isPlatformAdmin || notesView === "my") && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-3 gap-1.5"
                          onClick={() => void openQuestionEditor(viewingNote)}
                        >
                          <Plus className="size-4" />
                          Add Q&A Entries
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {viewingNote.questions.map((q, idx) => (
                        <div key={q.id ?? idx} className="rounded-lg border bg-card p-4 space-y-3 shadow-xs">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="flex size-6 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-xs font-semibold text-primary">
                                {idx + 1}
                              </span>
                              <Badge variant="outline" className="text-[10px] capitalize">
                                {q.question_type.replace("_", " ")}
                              </Badge>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-semibold text-foreground">{q.question_text}</p>
                          </div>

                          {/* Options if Objective / True-False */}
                          {q.options && q.options.length > 0 && (
                            <div className="space-y-1.5 pl-2 border-l-2 border-primary/30">
                              {q.options.map((opt, oIdx) => (
                                <div
                                  key={opt.id ?? oIdx}
                                  className={cn(
                                    "flex items-center gap-2 rounded px-2 py-1 text-xs",
                                    opt.is_correct
                                      ? "bg-emerald-500/10 text-emerald-700 font-semibold dark:text-emerald-300"
                                      : "text-muted-foreground"
                                  )}
                                >
                                  {opt.is_correct && <CheckCircle2 className="size-3.5 text-emerald-600" />}
                                  <span>{opt.text}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Answer / Solution Explanation */}
                          {q.answer_text && (
                            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 space-y-1">
                              <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                                <FileCheck2 className="size-3.5 text-emerald-600" />
                                Solution / Explanation:
                              </p>
                              <p className="text-xs text-foreground whitespace-pre-line">{q.answer_text}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.length} selected note(s)? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void deleteSelected()} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inherit / Purchase Marketplace Note Dialog */}
      <Dialog open={inheritOpen} onOpenChange={setInheritOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {inheritTarget?.is_paid && inheritTarget.price > 0
                ? "Purchase & Inherit Note"
                : "Inherit Marketplace Note"}
            </DialogTitle>
            <DialogDescription>
              Inherit <strong>{inheritTarget?.title}</strong> with all its Q&A entries and syllabus mappings into your institution&apos;s library.
            </DialogDescription>
          </DialogHeader>

          {inheritTarget && (
            <div className="rounded-lg border p-4 bg-muted/20 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subject:</span>
                <span className="font-semibold">{inheritTarget.subject_name || "General"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Q&A Entries:</span>
                <span className="font-semibold">{inheritTarget.question_count ?? inheritTarget.item_count ?? 0}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <span className="font-medium">Price:</span>
                {inheritTarget.is_paid && inheritTarget.price > 0 ? (
                  <Badge variant="outline" className="border-rose-500/50 bg-rose-500/10 text-rose-600 font-bold text-sm">
                    ₹{inheritTarget.price}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600 font-bold text-sm">
                    Free
                  </Badge>
                )}
              </div>
            </div>
          )}

          {isPlatformAdmin && (
            <div className="space-y-2 py-2">
              <Label>Target Institution ID</Label>
              <Input
                placeholder="Enter Target Institution ID"
                value={inheritInstitutionId}
                onChange={(e) => setInheritInstitutionId(e.target.value)}
              />
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInheritOpen(false)} disabled={inheriting}>
              Cancel
            </Button>
            <Button
              onClick={() => void executeInherit()}
              disabled={inheriting}
              className={inheritTarget?.is_paid && inheritTarget.price > 0 ? "bg-rose-600 hover:bg-rose-700" : ""}
            >
              {inheriting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : inheritTarget?.is_paid && inheritTarget.price > 0 ? (
                `Pay ₹${inheritTarget.price} & Inherit`
              ) : (
                "Inherit to My Notes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

