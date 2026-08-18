"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import { BookOpen, Plus, Loader2, Trash2, RefreshCw, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { MultiSelect } from "@/components/ui/multi-select";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Board {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
}

interface Category {
  id: number;
  name: string;
  slug: string;
  depth: number;
  is_mapped?: boolean;
  mapped_board_names?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// ─── Column factory ───────────────────────────────────────────────────────────

function buildColumns(
  setDeleteTarget: (b: Board) => void
): ColumnDef<Board>[] {
  return [
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
          aria-label="Select all boards"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) =>
            row.toggleSelected(!!value)
          }
          aria-label="Select board"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => {
        const name = row.getValue("name") as string;

        return (
          <div className="max-w-[320px]">
            <span
              className="font-medium truncate block"
              title={name}
            >
              {name}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "slug",
      header: "Slug",
      cell: ({ row }) => {
        const slug = row.getValue("slug") as string;

        return (
          <div className="max-w-[260px]">
            <span
              className="font-mono text-xs text-muted-foreground truncate block"
              title={slug}
            >
              {slug}
            </span>
          </div>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const board = row.original;
        return (
          <Badge
            variant={board.is_active ? "default" : "secondary"}
            className="text-xs"
          >
            {board.is_active ? "Active" : "Disabled"}
          </Badge>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.getValue("created_at")).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="text-right block">Actions</span>,
      enableHiding: false,
      cell: ({ row }) => {
        const board = row.original;
        return (
          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              title="Delete"
              onClick={() => setDeleteTarget(board)}
            >
              <Trash2 className="size-3.5 text-destructive" />
            </Button>
          </div>
        );
      },
    },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BoardsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();

  // Table state
  const [boards, setBoards] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(-1);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Add board dialog

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);


  // Map dialog — lazy-load categories on open
  const [mapDialogOpen, setMapDialogOpen] = useState(false);
  const [mapBoardIds, setMapBoardIds] = useState<string[]>([]);
  const [selectedBoards, setSelectedBoards] = useState<Board[]>([]);
  const [mapCategoryId, setMapCategoryId] = useState("");

  const [mapping, setMapping] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<Board | null>(null);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<Board[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const bulkResetSelectionRef = useRef<(() => void) | null>(null);

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

  // ── Single paginated fetch ─────────────────────────────────────────────────

  const fetchBoards = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/boards?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}&search=${encodeURIComponent(debouncedSearch)}`,
        { headers: authHeader }
      );
      const json = await res.json();
      if (res.ok) {
        setBoards(json.data);

        setPageCount(json.pageCount);
      } else {
        toast.error(json.error ?? "Failed to load boards");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, pagination.pageIndex, pagination.pageSize, debouncedSearch]);

  useEffect(() => {
    if (isReady) fetchBoards();
  }, [isReady, fetchBoards]);

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

  const fetchBoardOptions = useCallback(
    async (search: string, page: number) => {
      const res = await fetch(
        `/api/admin/boards?page=${page}&limit=15&search=${encodeURIComponent(search)}`,
        {
          headers: authHeader,
        }
      );

      const json = await res.json();

      return {
        data: (json.data || []).map(
          (b: Board) => ({
            label: b.name,
            value: String(b.id),
          })
        ),
        hasMore: page < json.pageCount,
      };
    },
    [authHeader]
  );

  const fetchClassCategoryOptions = useCallback(
    async (search: string, page: number) => {
      const res = await fetch(
        `/api/admin/categories?page=${page}&limit=15&onlyClass=true&search=${encodeURIComponent(search)}`,
        {
          headers: authHeader,
        }
      );

      const json = await res.json();

      return {
        data: json.data || [],
        hasMore: page < json.pageCount,
      };
    },
    [authHeader]
  );

  // ── Lazy-load categories when map dialog opens ────────────────────────────

  useEffect(() => {
    if (!mapCategoryId || !accessToken) {
      setMapBoardIds([]);
      return;
    }

    async function fetchMappedBoards() {
      try {
        const res = await fetch(
          `/api/admin/categories/${mapCategoryId}/boards`,
          {
            headers: authHeader,
          }
        );

        const json = await res.json();

        if (res.ok) {
          const boards = json.data || [];

          setSelectedBoards(boards);

          setMapBoardIds(
            boards.map((b: Board) => String(b.id))
          );
        }
      } catch {
        toast.error("Failed to load mapped boards");
      }
    }

    fetchMappedBoards();
  }, [mapCategoryId, accessToken]);


  // ── Auto-slug ─────────────────────────────────────────────────────────────

  useEffect(() => {
    setSlug(toSlug(name));
  }, [name]);

  // ── Create board ──────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return toast.error("Name and slug are required");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to create board");
      toast.success(`Board "${json.data.name}" created`);
      setDialogOpen(false);
      setName("");
      setSlug("");
      fetchBoards();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Map board to category ─────────────────────────────────────────────────

  async function handleMap(e: React.FormEvent) {
    e.preventDefault();
    if (mapBoardIds.length === 0 || !mapCategoryId) {
      return toast.error("Select board(s) and category");
    }


    setMapping(true);
    try {
      const res = await fetch(`/api/admin/categories/${mapCategoryId}/boards`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          boardIds: mapBoardIds.map(Number),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to map board");
      toast.success("Board mapped to category successfully");
      setMapDialogOpen(false);
      setMapBoardIds([]);
      setMapCategoryId("");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setMapping(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(board: Board) {
    try {
      const res = await fetch(`/api/admin/boards/${board.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(`"${board.name}" deleted`);
      setDeleteTarget(null);
      fetchBoards();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleBulkStatus(
    selectedRows: Board[],
    isActive: boolean,
    resetSelection: () => void
  ) {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/boards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          ids: selectedRows.map((board) => board.id),
          isActive,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update selected boards");
      }

      toast.success(
        `${selectedRows.length} board${selectedRows.length === 1 ? "" : "s"} ${isActive ? "enabled" : "disabled"}`
      );
      resetSelection();
      fetchBoards();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update boards"
      );
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkDelete() {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/boards", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          ids: bulkDeleteTargets.map((board) => board.id),
          softDelete: true,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete selected boards");
      }

      toast.success(`${bulkDeleteTargets.length} boards deleted`);
      setBulkDeleteTargets([]);
      bulkResetSelectionRef.current?.();
      fetchBoards();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete boards"
      );
    } finally {
      setBulkLoading(false);
    }
  }

  const columns = buildColumns(setDeleteTarget);

  if (!isReady) return null;

  if (loading && boards.length === 0) {
    return (
      <div className="space-y-6 w-full max-w-full">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-32 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-36 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
            <BookOpen className="size-5 text-blue-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">Boards</h1>
            <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Manage global education boards (CBSE, NIOS, etc.) and map them to categories.
            </p>
          </div>
        </div>

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {/* Map board to category */}
          <Dialog open={mapDialogOpen} onOpenChange={setMapDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2 sm:w-auto">
                Map Board → Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Map Board to Category</DialogTitle>
                <DialogDescription>
                  Link an existing board to a category (e.g. Class, Course).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleMap} className="flex flex-col gap-4 pt-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Category (Class / Course)</Label>
                  <AsyncSearchPopover<Category>
                    value={mapCategoryId}
                    onChange={setMapCategoryId}
                    placeholder="Select a category"
                    searchPlaceholder="Search categories..."
                    emptyText="No category found"
                    fetcher={fetchClassCategoryOptions}
                    getValue={(item) => String(item.id)}
                    getLabel={(item) => item.name}
                    renderItem={(c) => {
                      const boards =
                        c.mapped_board_names
                          ?.split(",")
                          .map((b) => b.trim()) || [];

                      const content = (
                        <div
                          className="flex items-center justify-between gap-2 w-full"
                          style={{
                            paddingLeft: `${(c.depth - 1) * 14}px`,
                          }}
                        >
                          <span className="truncate">
                            {c.depth > 1 && "↳ "}
                            {c.name}
                          </span>

                          {c.is_mapped && (
                            <Badge
                              variant="secondary"
                              className="text-[10px] shrink-0"
                            >
                              Mapped
                            </Badge>
                          )}
                        </div>
                      );

                      if (!c.is_mapped) {
                        return content;
                      }

                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>{content}</div>
                          </TooltipTrigger>

                          <TooltipContent
                            side="right"
                            className="max-w-[320px]"
                          >
                            <div className="space-y-1">
                              <div className="text-xs font-semibold">
                                Mapped Boards
                              </div>

                              {boards.map((board) => (
                                <div
                                  key={board}
                                  className="text-xs"
                                >
                                  • {board}
                                </div>
                              ))}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    }}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label>Board</Label>
                  <MultiSelect
                    options={[]}
                    async
                    value={mapBoardIds}
                    onValueChange={setMapBoardIds}
                    selectedOptions={selectedBoards.map((b) => ({
                      label: b.name,
                      value: String(b.id),
                    }))}
                    placeholder={
                      !mapCategoryId
                        ? "Select category first"
                        : "Select boards"
                    }
                    disabled={!mapCategoryId}
                    fetcher={fetchBoardOptions}
                  />
                </div>
                <Button type="submit" disabled={mapping}>
                  {mapping && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Map Board
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Add new board */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="w-full gap-2 sm:w-auto">
                <Plus className="size-4" /> Add Board
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="size-4" /> New Board
                </DialogTitle>
                <DialogDescription>
                  Create a new education board (e.g. CBSE, ICSE, NIOS).
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="flex flex-col gap-4 pt-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="board-name">Name</Label>
                  <Input
                    id="board-name"
                    placeholder="e.g. CBSE"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="board-slug">
                    Slug{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      (auto-generated)
                    </span>
                  </Label>
                  <Input
                    id="board-slug"
                    value={slug}
                    disabled
                    className="font-mono text-sm bg-muted/40 cursor-not-allowed"
                  />
                </div>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Create Board
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* DataTable with server-side pagination */}
      <DataTable
        columns={columns}
        data={boards}
        getRowId={(row) => String(row.id)}
        toolbarLeft={
          <div className="w-full sm:w-auto">
            <Input
              placeholder="Search boards..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full sm:w-64"
            />
          </div>
        }
        toolbarRight={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={fetchBoards}
            disabled={loading}
            title="Refresh"
            className="shrink-0"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
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
        manualPagination={true}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
      />

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the board. This action can be reversed from the database.
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
              Delete {bulkDeleteTargets.length} selected boards?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the selected boards. This action can be reversed from the database.
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
