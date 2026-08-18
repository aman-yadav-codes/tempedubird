"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import {
  FolderTree, Plus, Loader2, Trash2, Power, PowerOff, ArrowUpDown, MoreHorizontal, RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";


import {
  AlertDialog, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  parent_name?: string | null;
  depth: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
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

const depthLabels: Record<number, string> = {
  1: "Root",
  2: "Level 2",
  3: "Level 3",
  4: "Level 4",
};

// ─── Column factory ───────────────────────────────────────────────────────────

function buildColumns(
  toggleActive: (cat: Category) => Promise<void>,
  setDeleteTarget: (cat: Category) => void,
  activeLoadingId: number | null,
  openDropdownId: number | null,
  setOpenDropdownId: (id: number | null) => void,
  setEditingCategory: (cat: Category) => void
): ColumnDef<Category>[] {
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
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
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
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 px-3"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const cat = row.original;
        return (
          <div className="flex items-center gap-2">
            <span
              className="font-medium"
              style={{ paddingLeft: `${(cat.depth - 1) * 12}px` }}
            >
              {cat.name}
            </span>
          </div>
        );
      },
    },
    {
      accessorKey: "slug",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-3 h-8 px-3"
        >
          Slug
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.getValue("slug")}
        </span>
      ),
    },
    {
      accessorKey: "depth",
      header: "Depth",
      cell: ({ row }) => {
        const d = row.getValue("depth") as number;
        return (
          <span className="text-muted-foreground capitalize">
            {depthLabels[d] ?? `Depth ${d}`}
          </span>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const cat = row.original;
        return (
          <Badge
            variant="default"
            className={
              cat.is_active
                ? "bg-green-100 text-green-700 hover:bg-green-100"
                : "bg-red-100 text-red-700 hover:bg-red-100"
            }
          >
            {cat.is_active ? "Active" : "Disabled"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const cat = row.original;
        return (
          <DropdownMenu
            open={openDropdownId === cat.id}
            onOpenChange={(isOpen) => setOpenDropdownId(isOpen ? cat.id : null)}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(cat.slug)}
              >
                Copy slug
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setOpenDropdownId(null);
                  setEditingCategory(cat);
                }}
              >
                Edit category
              </DropdownMenuItem>

              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={activeLoadingId === cat.id}
                onSelect={(e) => {
                  e.preventDefault();
                  toggleActive(cat);
                }}
              >
                {activeLoadingId === cat.id && <Loader2 className="mr-2 size-4 animate-spin" />}
                {cat.is_active ? "Disable category" : "Enable category"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteTarget(cat)}
              >
                Delete category
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CategoriesPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();

  // Table state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(-1);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [parentOptions, setParentOptions] = useState<Category[]>([]);
  const [parentSearch, setParentSearch] = useState<string>("");
  const [parentOptionsLoading, setParentOptionsLoading] = useState(false);
  const [parentOpen, setParentOpen] = useState(false);
  const [parentLoading, setParentLoading] = useState(false);
  const [parentLoadingMore, setParentLoadingMore] = useState(false);
  const [parentPage, setParentPage] = useState(1);
  const [parentHasMore, setParentHasMore] = useState(true);
  const loadingMoreRef = useRef(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<Category[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const bulkResetSelectionRef = useRef<(() => void) | null>(null);

  // Action loading state
  const [activeLoadingId, setActiveLoadingId] = useState<number | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [parentId, setParentId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  const authHeader = { Authorization: `Bearer ${accessToken}` };

  // ── Single paginated fetch ─────────────────────────────────────────────────

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const fetchCategories = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/categories?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}&search=${encodeURIComponent(debouncedSearch)}&showRootsFirst=true`,
        { headers: authHeader }
      );
      const json = await res.json();
      if (res.ok) {
        setCategories(json.data);
        setPageCount(json.pageCount);
      } else {
        toast.error(json.error ?? "Failed to load categories");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, pagination.pageIndex, pagination.pageSize, debouncedSearch]);

  useEffect(() => {
    if (isReady) fetchCategories();
  }, [isReady, fetchCategories]);

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

  // ── Lazy-load parent options only when dialog opens ───────────────────────

  useEffect(() => {
    if (!dialogOpen || !accessToken) return;

    const controller = new AbortController();

    const fetchParents = async () => {
      try {
        if (parentPage === 1) {
          setParentLoading(true);
        } else {
          setParentLoadingMore(true);
        }

        const url = new URL(
          "/api/admin/categories",
          window.location.origin
        );

        url.searchParams.set("page", String(parentPage));
        url.searchParams.set("limit", "15");

        if (parentSearch.trim()) {
          url.searchParams.set("search", parentSearch);
        } else {
          url.searchParams.set("onlyRoot", "true");
        }

        const res = await fetch(url.toString(), {
          headers: authHeader,
          signal: controller.signal,
        });

        const json = await res.json();

        if (res.ok) {
          const newData = json.data || [];

          setParentOptions((prev) =>
            parentPage === 1
              ? newData
              : [...prev, ...newData]
          );

          const hasMore = parentPage < json.pageCount;

          setParentHasMore(hasMore);

          if (!hasMore) {
            loadingMoreRef.current = true;
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          toast.error("Failed to load categories");
        }
      } finally {
        setParentLoading(false);
        setParentLoadingMore(false);

        requestAnimationFrame(() => {
          loadingMoreRef.current = false;
        });
      }
    };

    const timeout = setTimeout(fetchParents, 300);

    return () => {
      controller.abort();
      clearTimeout(timeout);
    };
  }, [dialogOpen, parentSearch, parentPage, accessToken]);

  // ── Auto-slug ─────────────────────────────────────────────────────────────

  useEffect(() => {
    setSlug(toSlug(name));
  }, [name]);

  useEffect(() => {
    setParentPage(1);
  }, [parentSearch]);

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name.trim() || !slug.trim()) {
      return toast.error("Name and slug are required");
    }

    setSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        parentId: parentId
          ? Number(parentId)
          : null,
      };

      const isEdit = !!editingCategory;

      const res = await fetch(
        isEdit
          ? `/api/admin/categories/${editingCategory.id}`
          : "/api/admin/categories",
        {
          method: isEdit ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeader,
          },
          body: JSON.stringify(payload),
        }
      );

      const json = await res.json();

      if (!res.ok) {
        throw new Error(
          json.error ||
          `Failed to ${isEdit ? "update" : "create"} category`
        );
      }

      toast.success(
        `Category "${json.data.name}" ${isEdit ? "updated" : "created"
        }`
      );

      setDialogOpen(false);

      resetForm();

      fetchCategories();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────

  async function toggleActive(cat: Category) {
    setActiveLoadingId(cat.id);
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({ isActive: !cat.is_active }),
      });
      if (!res.ok) throw new Error("Failed to update");
      toast.success(`Category ${cat.is_active ? "disabled" : "enabled"}`);
      fetchCategories();
      setOpenDropdownId(null);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActiveLoadingId(null);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(cat: Category) {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success(`"${cat.name}" deleted`);
      setDeleteTarget(null);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleBulkStatus(
    selectedRows: Category[],
    isActive: boolean,
    resetSelection: () => void
  ) {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          ids: selectedRows.map((cat) => cat.id),
          isActive,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to update selected categories");
      }

      toast.success(
        `${selectedRows.length} categor${selectedRows.length === 1 ? "y" : "ies"} ${isActive ? "enabled" : "disabled"}`
      );
      resetSelection();
      fetchCategories();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update categories"
      );
    } finally {
      setBulkLoading(false);
    }
  }

  useEffect(() => {
    if (!editingCategory) return;

    setName(editingCategory.name);
    setSlug(editingCategory.slug);

    setParentId(
      editingCategory.parent_id
        ? String(editingCategory.parent_id)
        : ""
    );

    setDialogOpen(true);
  }, [editingCategory]);

  function resetForm() {
    setEditingCategory(null);
    setName("");
    setSlug("");
    setParentId("");
  }

  async function handleBulkDelete() {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeader },
        body: JSON.stringify({
          ids: bulkDeleteTargets.map((cat) => cat.id),
          softDelete: true,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to delete selected categories");
      }

      toast.success(`${bulkDeleteTargets.length} categories deleted`);
      setBulkDeleteTargets([]);
      bulkResetSelectionRef.current?.();
      fetchCategories();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete categories"
      );
    } finally {
      setBulkLoading(false);
    }
  }
  const filteredCategories = categories.filter((c) => {
    if (!searchTerm.trim()) return true;

    const q = searchTerm.toLowerCase();

    return (
      c.name.toLowerCase().includes(q) ||
      c.slug.toLowerCase().includes(q) ||
      c.parent_name?.toLowerCase().includes(q)
    );
  });
  const columns = buildColumns(
    toggleActive,
    setDeleteTarget,
    activeLoadingId,
    openDropdownId,
    setOpenDropdownId,
    setEditingCategory
  );

  function openEditCategory(category: Category) {
    setOpenDropdownId(null);
    setEditingCategory(category);
  }

  if (!isReady) return null;

  if (loading && categories.length === 0) {
    return (
      <div className="space-y-6 w-full max-w-full">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-10 w-32 rounded-lg" />
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
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 border border-violet-500/20">
            <FolderTree className="size-5 text-violet-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">Manage Categories</h1>
            <p className="hidden max-w-2xl text-sm leading-relaxed text-muted-foreground sm:block">
              Manage the education hierarchy — root, classes, courses, and nested levels.
            </p>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          if (submitting) return;

          setDialogOpen(open);

          if (!open) {
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full gap-2 sm:w-auto">
              <Plus className="size-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent
            className="sm:max-w-md"
            onInteractOutside={(e) => submitting && e.preventDefault()}
            onEscapeKeyDown={(e) => submitting && e.preventDefault()}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FolderTree className="size-4" />
                {editingCategory ? "Edit Category" : "New Category"}
              </DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? "Update category details."
                  : "Create a new category in the education hierarchy."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4 pt-2">
              {/* Parent selector */}
              <div className="flex flex-col gap-2">
                <Label>Parent Category</Label>



                <AsyncSearchPopover<Category>
                  value={parentId}
                  onChange={setParentId}
                  placeholder="None — Root category"
                  defaultOptionLabel="None — Root category"
                  defaultOptionValue=""
                  showDefaultOption={true}
                  hideDefaultOptionOnSearch={true}
                  searchPlaceholder="Search categories..."
                  emptyText="No category found"
                  fetcher={async (search, page) => {
                    const url = new URL(
                      "/api/admin/categories",
                      window.location.origin
                    );

                    url.searchParams.set("page", String(page));
                    url.searchParams.set("limit", "15");

                    if (search.trim()) {
                      url.searchParams.set("search", search);
                    } else {
                      url.searchParams.set("onlyRoot", "true");
                    }

                    const res = await fetch(url.toString(), {
                      headers: authHeader,
                    });

                    const json = await res.json();

                    // Filter out CLASS categories and their children
                    const filtered = (json.data || []).filter(
                      (item: Category) => {
                        // Remove if name starts with CLASS (
                        if (item.name.match(/^CLASS\s*\(/i)) return false;
                        // Remove if parent is a CLASS category
                        if (item.parent_name?.match(/^CLASS\s*\(/i)) return false;
                        return true;
                      }
                    );

                    return {
                      data: filtered,
                      hasMore: page < json.pageCount,
                    };
                  }}
                  getValue={(item) => String(item.id)}
                  getLabel={(item) => item.name}
                  renderItem={(c) => (
                    <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                      <div
                        className="min-w-0 flex-1"
                        style={{
                          paddingLeft: `${(c.depth - 1) * 14}px`,
                        }}
                      >
                        <div className="truncate">
                          {c.name}
                        </div>

                        {c.parent_name && (
                          <div className="truncate text-xs text-muted-foreground">
                            Parent: {c.parent_name}
                          </div>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          Depth {c.depth}
                        </span>
                      </div>
                    </div>
                  )}
                />
              </div>

              {/* Name */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cat-name">Name</Label>
                <Input
                  id="cat-name"
                  placeholder="e.g. Class 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Slug — auto-generated */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="cat-slug">
                  Slug
                  <span className="ml-2 text-xs text-muted-foreground font-normal">
                    (auto-generated)
                  </span>
                </Label>
                <Input
                  id="cat-slug"
                  value={slug}
                  disabled
                  className="font-mono text-sm bg-muted/40 cursor-not-allowed"
                />
              </div>

              <Button type="submit" disabled={submitting} className="mt-1">
                {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                {editingCategory ? "Update Category" : "Create Category"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* DataTable with server-side pagination */}
      {/* Search + Table */}
      <div className="space-y-4">
        <DataTable
          columns={columns}
          data={filteredCategories}
          getRowId={(row) => String(row.id)}
          onRowClick={openEditCategory}
          toolbarLeft={
            <div className="w-full sm:w-auto">
              <Input
                placeholder="Search categories..."
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
              onClick={fetchCategories}
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
      </div>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !deleteLoading && !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the category. All child categories will also be hidden.
              This action can be reversed from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={deleteLoading}
              onClick={(e) => {
                e.preventDefault();
                if (deleteTarget) handleDelete(deleteTarget);
              }}
            >
              {deleteLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              Delete
            </Button>
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
              Delete {bulkDeleteTargets.length} selected categories?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete the selected categories. Child categories may also be hidden.
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
