"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  Edit2,
  Eye,
  LibraryBig,
  Loader2,
  MoreHorizontal,
  Plus,
  Power,
  PowerOff,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { StatsCards } from "@/components/master-data/stats-cards";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";

type CardCategory = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  target_audience: "student" | "staff";
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_name?: string | null;
  updated_by_name?: string | null;
};

type CategoryForm = {
  id?: number;
  name: string;
  description: string;
  target_audience: "student" | "staff";
};

const blankForm: CategoryForm = {
  name: "",
  description: "",
  target_audience: "student",
};

function audienceLabel(audience: CardCategory["target_audience"]) {
  return audience === "staff" ? "Staff" : "Student";
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export default function CardCategoriesPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const authHeader = useMemo(
    () => ({ Authorization: `Bearer ${accessToken}` }),
    [accessToken]
  );

  const [items, setItems] = useState<CardCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const [stats, setStats] = useState<{
    total: number;
    active: number;
    disabled: number;
    deleted: number;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageCount, setPageCount] = useState(-1);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<CategoryForm>(blankForm);
  const [viewing, setViewing] = useState<CardCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CardCategory | null>(null);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<CardCategory[]>([]);
  const bulkResetSelectionRef = useRef<(() => void) | null>(null);

  const loadCategories = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search: debouncedSearch,
      });
      const res = await fetch(`/api/admin/master-data/card-categories?${params}`, {
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load card categories");
      setItems(json.data ?? []);
      setPageCount(json.pageCount ?? -1);
      setStats(json.stats ?? null);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    authHeader,
    debouncedSearch,
    pagination.pageIndex,
    pagination.pageSize,
  ]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPagination((current) => ({ ...current, pageIndex: 0 }));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void loadCategories(), 0);
    return () => window.clearTimeout(timeout);
  }, [isReady, loadCategories]);

  function openCreate() {
    setForm(blankForm);
    setDialogOpen(true);
  }

  function openEdit(category: CardCategory) {
    setForm({
      id: category.id,
      name: category.name,
      description: category.description ?? "",
      target_audience: category.target_audience ?? "student",
    });
    setDialogOpen(true);
  }

  async function saveCategory() {
    if (!form.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(
        form.id
          ? `/api/admin/master-data/card-categories/${form.id}`
          : "/api/admin/master-data/card-categories",
        {
          method: form.id ? "PATCH" : "POST",
          headers: { ...authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name.trim(),
            description: form.description.trim() || null,
            target_audience: form.target_audience,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save card category");
      toast.success(form.id ? "Card category updated" : "Card category added");
      setDialogOpen(false);
      setForm(blankForm);
      await loadCategories();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const toggleStatus = useCallback(async (category: CardCategory) => {
    setActionId(category.id);
    try {
      const res = await fetch(`/api/admin/master-data/card-categories/${category.id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !category.is_active }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update card category");
      toast.success(`Card category ${category.is_active ? "disabled" : "enabled"}`);
      await loadCategories();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setActionId(null);
    }
  }, [authHeader, loadCategories]);

  async function deleteCategory() {
    if (!deleteTarget) return;
    setActionId(deleteTarget.id);
    try {
      const res = await fetch(`/api/admin/master-data/card-categories/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete card category");
      toast.success("Card category deleted");
      setDeleteTarget(null);
      await loadCategories();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setActionId(null);
    }
  }

  async function bulkSetStatus(
    categories: CardCategory[],
    isActive: boolean,
    resetSelection: () => void
  ) {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/master-data/card-categories", {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: categories.map((category) => category.id),
          is_active: isActive,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update card categories");
      toast.success(
        `${json.updated ?? categories.length} card categor${categories.length === 1 ? "y" : "ies"} ${isActive ? "enabled" : "disabled"}`
      );
      resetSelection();
      await loadCategories();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBulkLoading(false);
    }
  }

  async function bulkDeleteCategories() {
    if (!bulkDeleteTargets.length) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/master-data/card-categories", {
        method: "DELETE",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: bulkDeleteTargets.map((category) => category.id),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete card categories");
      toast.success(`${json.deleted ?? bulkDeleteTargets.length} card categories deleted`);
      setBulkDeleteTargets([]);
      bulkResetSelectionRef.current?.();
      bulkResetSelectionRef.current = null;
      await loadCategories();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBulkLoading(false);
    }
  }

  const columns = useMemo<ColumnDef<CardCategory>[]>(
    () => [
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
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
            aria-label="Select all card categories"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
            aria-label={`Select ${row.original.name}`}
          />
        ),
        enableSorting: false,
        enableHiding: false,
      },
      {
        accessorKey: "name",
        header: "Category",
        cell: ({ row }) => (
          <div className="min-w-52">
            <p className="font-medium">{row.original.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{row.original.slug}</p>
          </div>
        ),
      },
      {
        accessorKey: "target_audience",
        header: "For",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={
              row.original.target_audience === "staff"
                ? "border-sky-500/30 bg-sky-500/10 text-sky-500"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
            }
          >
            {audienceLabel(row.original.target_audience)}
          </Badge>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-md text-muted-foreground">
            {row.original.description || "-"}
          </span>
        ),
        enableSorting: false,
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={
              row.original.is_active
                ? "border-green-500/30 bg-green-500/10 text-green-600"
                : "border-destructive/30 bg-destructive/10 text-destructive"
            }
          >
            {row.original.is_active ? "Active" : "Disabled"}
          </Badge>
        ),
      },
      {
        accessorKey: "updated_at",
        header: "Updated",
        cell: ({ row }) => (
          <span className="whitespace-nowrap text-muted-foreground">
            {new Date(row.original.updated_at).toLocaleDateString("en-IN")}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const category = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  {actionId === category.id ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="size-4" />
                  )}
                  <span className="sr-only">Open category actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setViewing(category)}>
                  <Eye className="size-4" />
                  View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEdit(category)}>
                  <Edit2 className="size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => void toggleStatus(category)}>
                  {category.is_active ? (
                    <PowerOff className="size-4" />
                  ) : (
                    <Power className="size-4" />
                  )}
                  {category.is_active ? "Disable" : "Enable"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteTarget(category)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [actionId, toggleStatus]
  );

  if (!isReady) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-56" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-[420px] w-full rounded-md" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Card Categories</h1>
            <p className="text-muted-foreground">
              Manage global categories used by cards, certificates, receipts, and reports.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            Add Category
          </Button>
        </div>
        <StatsCards stats={stats} loading={loading && !stats} title="Card Categories" />
      </div>

      <DataTable
        columns={columns}
        data={items}
        loading={loading}
        manualPagination
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
        getRowId={(row) => String(row.id)}
        emptyText="No card categories found."
        toolbarLeft={
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search categories..."
            className="w-full sm:w-80"
          />
        }
        toolbarRight={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => void loadCategories()}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        }
        selectedActions={(selectedRows, resetSelection) => (
          <>
            <Button
              variant="outline"
              onClick={() => void bulkSetStatus(selectedRows, true, resetSelection)}
              disabled={bulkLoading}
            >
              <Power className="size-4" />
              Enable
            </Button>
            <Button
              variant="outline"
              onClick={() => void bulkSetStatus(selectedRows, false, resetSelection)}
              disabled={bulkLoading}
            >
              <PowerOff className="size-4" />
              Disable
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                bulkResetSelectionRef.current = resetSelection;
                setBulkDeleteTargets(selectedRows);
              }}
              disabled={bulkLoading}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          </>
        )}
      />

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open && !saving) setForm(blankForm);
          setDialogOpen(open);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LibraryBig className="size-5 text-destructive" />
              {form.id ? "Edit Card Category" : "Add Card Category"}
            </DialogTitle>
            <DialogDescription>
              This category is shared by every institution and future document templates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category-name">Name *</Label>
              <Input
                id="category-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="e.g. Achievement Certificate"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-audience">For *</Label>
              <Select
                value={form.target_audience}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    target_audience: value === "staff" ? "staff" : "student",
                  }))
                }
              >
                <SelectTrigger id="category-audience" className="w-full">
                  <SelectValue placeholder="Select person type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This decides whether the template generator loads students or teacher/driver staff.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category-description">Description</Label>
              <Textarea
                id="category-description"
                value={form.description}
                onChange={(event) =>
                  setForm((current) => ({ ...current, description: event.target.value }))
                }
                placeholder="What this category is used for"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void saveCategory()} disabled={saving}>
              {saving && <Loader2 className="size-4 animate-spin" />}
              {form.id ? "Save Changes" : "Add Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete card category?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {deleteTarget?.name}? Categories already used by achievements or templates cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void deleteCategory();
              }}
              disabled={actionId !== null}
            >
              {actionId !== null && <Loader2 className="size-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={bulkDeleteTargets.length > 0}
        onOpenChange={(open) => !open && setBulkDeleteTargets([])}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected card categories?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {bulkDeleteTargets.length} selected categories? Any category already in use will be protected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void bulkDeleteCategories();
              }}
              disabled={bulkLoading}
            >
              {bulkLoading && <Loader2 className="size-4 animate-spin" />}
              Delete Selected
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={Boolean(viewing)} onOpenChange={(open) => !open && setViewing(null)}>
        <SheetContent
          side="right"
          defaultSize={560}
          minSize={380}
          maxSize={760}
          resizeStorageKey="card-category-details-sheet-width"
          className="gap-0 overflow-hidden p-0"
        >
          <SheetHeader className="border-b border-border p-5 pr-14">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <LibraryBig className="size-5 text-destructive" />
              Card Category Details
            </SheetTitle>
            <SheetDescription>
              Global category information used across institutions.
            </SheetDescription>
          </SheetHeader>
          {viewing && (
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <div className="space-y-5">
                <div className="rounded-md border border-border bg-muted/20 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-2xl font-semibold">{viewing.name}</h2>
                      <p className="mt-1 font-mono text-sm text-muted-foreground">{viewing.slug}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        viewing.is_active
                          ? "border-green-500/30 bg-green-500/10 text-green-600"
                          : "border-destructive/30 bg-destructive/10 text-destructive"
                      }
                    >
                      {viewing.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="mt-4">
                    <Badge
                      variant="outline"
                      className={
                        viewing.target_audience === "staff"
                          ? "border-sky-500/30 bg-sky-500/10 text-sky-500"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                      }
                    >
                      For {audienceLabel(viewing.target_audience)}
                    </Badge>
                  </div>
                </div>

                <section className="space-y-2">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground">Description</h3>
                  <div className="rounded-md border border-border p-4 text-sm">
                    {viewing.description || "No description provided."}
                  </div>
                </section>

                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase text-muted-foreground">Audit</h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="font-medium">{new Date(viewing.created_at).toLocaleString("en-IN")}</p>
                      <p className="text-xs text-muted-foreground">{viewing.created_by_name || "System"}</p>
                    </div>
                    <div className="rounded-md border border-border p-3">
                      <p className="text-xs text-muted-foreground">Last updated</p>
                      <p className="font-medium">{new Date(viewing.updated_at).toLocaleString("en-IN")}</p>
                      <p className="text-xs text-muted-foreground">{viewing.updated_by_name || "System"}</p>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
