"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import { GraduationCap, Plus, Loader2, Trash2, RefreshCw, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

import { DataTable } from "@/components/ui/data-table";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUpDown, MoreHorizontal } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";


import { AsyncSearchPopover } from "@/components/shared/async-search-popover";

interface Category { id: number; name: string; slug: string; depth: number; }
interface Board { id: number; name: string; slug: string; }
interface Subject {
  id: number; category_id: number; board_id: number;
  name: string; slug: string; is_active: boolean; created_at: string;
}

function toSlug(text: string) {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function SubjectsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();


  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [pageCount, setPageCount] = useState(-1);

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedBoard, setSelectedBoard] = useState("");



  const [mappedBoards, setMappedBoards] = useState<Board[]>([]);
  const [loadingBoards, setLoadingBoards] = useState(false);

  const selectedBoardData = mappedBoards.find(
    (b) => String(b.id) === selectedBoard
  );

  const selectedBoardLabel = selectedBoardData?.name || "";

  const [categoryOptions, setCategoryOptions] =
    useState<Category[]>([]);

  const selectedCategoryData = categoryOptions.find(
    (c) => String(c.id) === selectedCategory
  );
  const selectedCategoryLabel = selectedCategoryData?.name || "";

  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<Subject[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const bulkResetSelectionRef = useRef<(() => void) | null>(null);


  // Form
  const [subjectName, setSubjectName] = useState("");
  const [subjectSlug, setSubjectSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const authHeader = { Authorization: `Bearer ${accessToken}` };

  // ── Bootstrap ─────────────────────────────────────────────────────────────




  // ── When category changes → load mapped boards ────────────────────────────
  useEffect(() => {
    if (!selectedCategory) {
      setMappedBoards([]);
      setLoadingBoards(false);
      return;
    }

    async function loadMappedBoards() {
      setLoadingBoards(true);
      try {
        const res = await fetch(
          `/api/admin/categories/${selectedCategory}/boards`,
          { headers: authHeader }
        );

        const json = await res.json();

        if (res.ok) {
          setMappedBoards(json.data || []);
        }
      } catch {
        toast.error("Failed to load boards");
      } finally {
        setLoadingBoards(false);
      }
    }

    loadMappedBoards();
  }, [selectedCategory, accessToken]);


  // ── When board changes → load subjects ───────────────────────────────────

  const fetchSubjects = useCallback(async () => {
    if (!selectedCategory || !selectedBoard) {
      setSubjects([]);
      setLoadingSubjects(false);
      return;
    }

    setLoadingSubjects(true);

    try {
      const res = await fetch(
        `/api/admin/subjects?categoryId=${selectedCategory}&boardId=${selectedBoard}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}&search=${encodeURIComponent(debouncedSearch)}`,
        { headers: authHeader }
      );

      const json = await res.json();

      if (res.ok) {
        setSubjects(json.data);
        setPageCount(json.pageCount);
      } else {
        toast.error(json.error ?? "Failed to load subjects");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoadingSubjects(false);
    }
  }, [
    selectedCategory,
    selectedBoard,
    pagination.pageIndex,
    pagination.pageSize,
    debouncedSearch,
    accessToken,
  ]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchTerm);

      setPagination((prev) => ({
        ...prev,
        pageIndex: 0,
      }));
    }, 300);

    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

  // ── Auto-slug ─────────────────────────────────────────────────────────────

  useEffect(() => { setSubjectSlug(toSlug(subjectName)); }, [subjectName]);

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCategory || !selectedBoard)
      return toast.error("Select a category and board first");
    if (!subjectName.trim() || !subjectSlug.trim())
      return toast.error("Subject name is required");

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          categoryId: Number(selectedCategory),
          boardId: Number(selectedBoard),
          name: subjectName.trim(),
          slug: subjectSlug.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create subject");
      toast.success(`Subject "${json.data.name}" added`);
      setDialogOpen(false);
      setSubjectName(""); setSubjectSlug("");
      fetchSubjects();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(subject: Subject) {
    try {
      const res = await fetch(`/api/admin/subjects/${subject.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(`"${subject.name}" deleted`);
      setDeleteTarget(null);
      fetchSubjects();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleBulkStatus(
    selectedRows: Subject[],
    isActive: boolean,
    resetSelection: () => void
  ) {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          ids: selectedRows.map((subject) => subject.id),
          isActive,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update selected subjects");
      }

      toast.success(
        `${selectedRows.length} subject${selectedRows.length === 1 ? "" : "s"} ${isActive ? "enabled" : "disabled"}`
      );
      resetSelection();
      fetchSubjects();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update subjects"
      );
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkDelete() {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          ids: bulkDeleteTargets.map((subject) => subject.id),
          softDelete: true,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete selected subjects");
      }

      toast.success(`${bulkDeleteTargets.length} subjects deleted`);
      setBulkDeleteTargets([]);
      bulkResetSelectionRef.current?.();
      fetchSubjects();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete subjects"
      );
    } finally {
      setBulkLoading(false);
    }
  }


  const canAddSubject = !!selectedCategory && !!selectedBoard;
  const columns: ColumnDef<Subject>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
        checked={
  table.getIsAllPageRowsSelected()
    ? true
    : table.getIsSomePageRowsSelected()
    ? "indeterminate"
    : false
}
          onCheckedChange={(value) =>
            table.toggleAllPageRowsSelected(!!value)
          }
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) =>
            row.toggleSelected(!!value)
          }
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },

    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === "asc")
          }
        >
          Subject
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.name}
        </span>
      ),
    },

    {
      accessorKey: "slug",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() =>
            column.toggleSorting(column.getIsSorted() === "asc")
          }
        >
          Slug
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.slug}
        </span>
      ),
    },

    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.is_active
              ? "default"
              : "secondary"
          }
        >
          {row.original.is_active
            ? "Active"
            : "Disabled"}
        </Badge>
      ),
    },

    {
      accessorKey: "created_at",
      header: "Added",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {new Date(
            row.original.created_at
          ).toLocaleDateString()}
        </span>
      ),
    },

    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive"
              onClick={() =>
                setDeleteTarget(row.original)
              }
            >
              Delete subject
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (!isReady) return null;


  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <GraduationCap className="size-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">Subjects</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Select a category and board to view and manage subjects.
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full gap-2 sm:w-auto" disabled={!canAddSubject}>
              <Plus className="size-4" /> Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="size-4" /> New Subject
              </DialogTitle>
              <DialogDescription className="sr-only">
                Create a new subject for the selected
                category and board.
              </DialogDescription>
            </DialogHeader>
            <div className="text-xs text-muted-foreground bg-muted/40 rounded-md px-3 py-2">
              Category:{" "}
              <strong>
                {selectedCategoryData?.name || "-"}
              </strong>

              {" · "}Board:{" "}
              <strong>
                {selectedBoardLabel || "-"}
              </strong>
            </div>
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="subject-name">Subject Name</Label>
                <Input id="subject-name" placeholder="e.g. Mathematics" value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="subject-slug">
                  Slug <span className="text-xs text-muted-foreground font-normal">(auto-generated)</span>
                </Label>
                <Input id="subject-slug" value={subjectSlug} disabled
                  className="font-mono text-sm bg-muted/40 cursor-not-allowed" />
              </div>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                Add Subject
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 p-4 rounded-lg border bg-muted/20">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Step 1 · Select Category
          </Label>

          <AsyncSearchPopover<Category>
            value={selectedCategory}
            onChange={(value) => {
              setSelectedCategory(value);

              // reset dependent board state
              setSelectedBoard("");


              // reset category label if cleared


              setMappedBoards([]);
              setSubjects([]);
            }}
            selectedLabel={selectedCategoryLabel}

            placeholder="Choose a category..."
            searchPlaceholder="Search categories..."
            emptyText="No category found"
            fetcher={async (search, page) => {
              const res = await fetch(
                `/api/admin/categories?page=${page}&limit=15&onlyClass=true&search=${encodeURIComponent(search)}`,
                { headers: authHeader }
              );

              const json = await res.json();

              setCategoryOptions(json.data || []);

              return {
                data: json.data || [],
                hasMore: page < json.pageCount,
              };
            }}
            getValue={(item) => String(item.id)}
            getLabel={(item) => item.name}
            renderItem={(c) => (
              <div
                className="truncate"
                style={{
                  paddingLeft: `${(c.depth - 1) * 14}px`,
                }}
              >
                {c.depth > 1 && "↳ "}
                {c.name}
              </div>
            )}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground uppercase tracking-wide">
            Step 2 · Select Board
          </Label>

          <AsyncSearchPopover<Board>
            key={selectedCategory}
            value={selectedBoard}
            onChange={(value) => {
              setSelectedBoard(value);
            }}
            selectedLabel={selectedBoardLabel}

            disabled={!selectedCategory}
            placeholder={
              loadingBoards
                ? "Loading boards..."
                : !selectedCategory
                ? "Pick category first"
                : "Choose a board..."
            }
            searchPlaceholder="Search boards..."
            emptyText="No board found"
            items={mappedBoards}
            localFilter
            loading={loadingBoards}
            getValue={(item) => String(item.id)}
            getLabel={(item) => item.name}
          />
        </div>
      </div>

      {/* Table */}
      {/* Table */}
      {canAddSubject && (
        loadingSubjects ? (
          <div className="rounded-lg border">
            <div className="border-b p-4">
              <div className="h-9 w-56 animate-pulse rounded-md bg-muted" />
            </div>

            <div className="divide-y">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-4 gap-4 p-4"
                >
                  <div className="h-4 animate-pulse rounded bg-muted" />
                  <div className="h-4 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={subjects}
            getRowId={(row) => String(row.id)}
            toolbarLeft={
              <div className="w-full sm:w-auto">
                <Input
                  placeholder="Search subjects..."
                  value={searchTerm}
                  onChange={(e) =>
                    setSearchTerm(e.target.value)
                  }
                  className="w-full sm:w-64"
                />
              </div>
            }
            toolbarRight={
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchSubjects}
                disabled={loadingSubjects}
                title="Refresh"
                className="shrink-0"
              >
                <RefreshCw className={`size-4 ${loadingSubjects ? "animate-spin" : ""}`} />
              </Button>
            }
            selectedActions={(selectedRows, resetSelection) => (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={bulkLoading}
                  onClick={() =>
                    handleBulkStatus(selectedRows, true, resetSelection)
                  }
                >
                  <Power className="size-4" />
                  Enable
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={bulkLoading}
                  onClick={() =>
                    handleBulkStatus(selectedRows, false, resetSelection)
                  }
                >
                  <PowerOff className="size-4" />
                  Disable
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={bulkLoading}
                  onClick={() => {
                    bulkResetSelectionRef.current = resetSelection;
                    setBulkDeleteTargets(selectedRows);
                  }}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </>
            )}
            manualPagination
            pageCount={pageCount}
            pagination={pagination}
            onPaginationChange={setPagination}
          />
        )
      )}


      {!canAddSubject && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center gap-2">
          <GraduationCap className="size-10 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            Select a category and board above to view subjects.
          </p>
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the subject. It can be restored from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkDeleteTargets.length > 0}
        onOpenChange={(open) => !bulkLoading && !open && setBulkDeleteTargets([])}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {bulkDeleteTargets.length} selected subjects?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the selected subjects. It can be restored from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={bulkLoading}
              onClick={(e) => {
                e.preventDefault();
                handleBulkDelete();
              }}
            >
              {bulkLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete Selected
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
