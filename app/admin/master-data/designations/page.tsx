"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import { ArrowUpDown, Plus, Loader2, Trash2, RefreshCw, Power, PowerOff, MoreHorizontal } from "lucide-react";
import { StatsCards } from "@/components/master-data/stats-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Designation } from "@/lib/types/designation";
import { capitalize } from "@/lib/utils/capitalize";

function toSlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function buildColumns(
  setDeleteTarget: (d: Designation) => void,
  setEditingDesignation: (d: Designation) => void,
  handleToggleStatus: (designation: Designation) => Promise<void>,
  activeLoadingId: number | null,
  openDropdownId: number | null,
  setOpenDropdownId: (id: number | null) => void,
  setActiveLoadingId: (id: number | null) => void
): ColumnDef<Designation>[] {
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
          aria-label="Select all designations"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) =>
            row.toggleSelected(!!value)
          }
          aria-label="Select designation"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "id",
      header: ({ column }) => (
        <Button
          type="button"
          variant="ghost"
          className="h-auto gap-1 px-0 font-semibold hover:bg-transparent"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          ID
          <ArrowUpDown className="size-3.5" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-mono text-sm text-muted-foreground">
          {row.getValue("id")}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          type="button"
          variant="ghost"
          className="h-auto gap-1 px-0 font-semibold hover:bg-transparent"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Name
          <ArrowUpDown className="size-3.5" />
        </Button>
      ),
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
        const designation = row.original;
        return (
          <Badge
            variant="default"
            className={
              designation.is_active
                ? "bg-green-100 text-green-700 hover:bg-green-100"
                : "bg-red-100 text-red-700 hover:bg-red-100"
            }
          >
            {designation.is_active ? "Active" : "Disabled"}
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
      enableHiding: false,
      cell: ({ row }) => {
        const designation = row.original;
        return (
          <DropdownMenu
            open={openDropdownId === designation.id}
            onOpenChange={(isOpen) => setOpenDropdownId(isOpen ? designation.id : null)}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setEditingDesignation(designation)}>
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={activeLoadingId === designation.id}
                onSelect={(e) => {
                  e.preventDefault();
                  setActiveLoadingId(designation.id);
                  handleToggleStatus(designation).finally(() => setActiveLoadingId(null));
                }}
              >
                {activeLoadingId === designation.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <span>{designation.is_active ? "Disable designation" : "Enable designation"}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteTarget(designation)}
              >
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}


export default function DesignationsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();

  const [designations, setDesignations] = useState<Designation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(-1);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [stats, setStats] = useState<{ total: number; active: number; disabled: number; deleted: number } | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Designation | null>(null);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<Designation[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editingDesignation, setEditingDesignation] = useState<Designation | null>(null);
  const [activeLoadingId, setActiveLoadingId] = useState<number | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const bulkResetSelectionRef = useRef<(() => void) | null>(null);

  const authHeader = { Authorization: `Bearer ${accessToken}` };

  const fetchDesignations = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setStatsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/master-data/designations?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}&search=${encodeURIComponent(debouncedSearch)}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      const json = await res.json();
      if (res.ok) {
        setDesignations(json.data);
        setPageCount(json.pageCount);
        setStats(json.stats);
      } else {
        toast.error(json.error ?? "Failed to load designations");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, [accessToken, pagination.pageIndex, pagination.pageSize, debouncedSearch]);

  useEffect(() => {
    if (!isReady) return;

    const timeoutId = window.setTimeout(() => {
      void fetchDesignations();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isReady, fetchDesignations]);

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

  const handleAddDesignation = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/master-data/designations", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: capitalize(name.trim()),
          slug: slug.trim()
        }),
      });

      const json = await res.json();

      if (res.ok) {
        toast.success("Designation added successfully");
        setName("");
        setSlug("");
        setDialogOpen(false);
        await fetchDesignations();
      } else {
        toast.error(json.error ?? "Failed to add designation");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateDesignation = async () => {
    if (!editingDesignation || !name.trim() || !slug.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/master-data/designations/${editingDesignation.id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          name: capitalize(name.trim()),
          slug: slug.trim()
        }),
      });

      const json = await res.json();

      if (res.ok) {
        toast.success("Designation updated successfully");
        setName("");
        setSlug("");
        setEditingDesignation(null);
        await fetchDesignations();
      } else {
        toast.error(json.error ?? "Failed to update designation");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteDesignation = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/admin/master-data/designations/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeader,
      });

      if (res.ok) {
        toast.success("Designation deleted successfully");
        setDeleteTarget(null);
        await fetchDesignations();
      } else {
        const json = await res.json();
        toast.error(json.error ?? "Failed to delete designation");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleToggleStatus = async (designation: Designation) => {
    try {
      const res = await fetch(`/api/admin/master-data/designations/${designation.id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !designation.is_active }),
      });

      if (res.ok) {
        toast.success(`Designation ${!designation.is_active ? "enabled" : "disabled"}`);
        await fetchDesignations();
      } else {
        const json = await res.json();
        toast.error(json.error ?? "Failed to update designation");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const openEditDesignation = (designation: Designation) => {
    setOpenDropdownId(null);
    setName(designation.name);
    setSlug(designation.slug);
    setEditingDesignation(designation);
  };

  const columns = buildColumns(
    setDeleteTarget,
    openEditDesignation,
    handleToggleStatus,
    activeLoadingId,
    openDropdownId,
    setOpenDropdownId,
    setActiveLoadingId
  );

  const handleBulkStatus = async (selectedRows: Designation[], isActive: boolean) => {
    setBulkLoading(true);
    try {
      await Promise.all(
        selectedRows.map(designation =>
          fetch(`/api/admin/master-data/designations/${designation.id}`, {
            method: "PATCH",
            headers: { ...authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: isActive }),
          })
        )
      );
      toast.success(`Designations ${isActive ? "enabled" : "disabled"}`);
      bulkResetSelectionRef.current?.();
      await fetchDesignations();
    } catch {
      toast.error("Failed to update designations");
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkDelete = async (selectedRows: Designation[]) => {
    setBulkLoading(true);
    try {
      await Promise.all(
        selectedRows.map(designation =>
          fetch(`/api/admin/master-data/designations/${designation.id}`, {
            method: "DELETE",
            headers: authHeader,
          })
        )
      );
      toast.success("Designations deleted successfully");
      setBulkDeleteTargets([]);
      bulkResetSelectionRef.current?.();
      await fetchDesignations();
    } catch {
      toast.error("Failed to delete designations");
    } finally {
      setBulkLoading(false);
    }
  };

  if (!isReady) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-6 w-full max-w-md" />
        <div className="border rounded-lg p-4">
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full mb-2" />
          <Skeleton className="h-8 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-4 sm:gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Designations</h1>
            <p className="mt-1 hidden text-sm text-muted-foreground sm:block sm:text-base">Manage all designations in the system</p>
          </div>
          <Dialog
            open={dialogOpen || !!editingDesignation}
            onOpenChange={(open) => {
              if (open) {
                setDialogOpen(true);
              } else {
                setDialogOpen(false);
                setEditingDesignation(null);
                setName("");
                setSlug("");
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto">
                <Plus className="size-4" />
                Add Designation
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingDesignation ? "Edit Designation" : "Add New Designation"}
                </DialogTitle>
                <DialogDescription>
                  {editingDesignation
                    ? "Update the designation details"
                    : "Create a new designation for users in the system"
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g. Senior Developer"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setSlug(toSlug(e.target.value));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Slug</Label>
                  <Input
                    placeholder="e.g. senior-developer"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    disabled
                    className="bg-muted/40"
                  />
                </div>
                <Button
                  onClick={editingDesignation ? handleUpdateDesignation : handleAddDesignation}
                  disabled={submitting}
                  className="w-full"
                >
                  {submitting && <Loader2 className="size-4 mr-2 animate-spin" />}
                  {editingDesignation ? "Update Designation" : "Add Designation"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} loading={statsLoading} title="Designations" />
      </div>

      <DataTable
        columns={columns}
        data={designations}
        getRowId={(row) => String(row.id)}
        onRowClick={openEditDesignation}
        toolbarLeft={
          <div className="w-full sm:w-auto">
            <Input
              placeholder="Search by ID or name..."
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
            onClick={() => {
              fetchDesignations();
            }}
            disabled={loading}
            title="Refresh"
            className="shrink-0"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        }
        selectedActions={(rows) => (
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => {
                handleBulkStatus(rows, true);
              }}
              disabled={bulkLoading}
              className="gap-2 text-xs sm:text-sm w-full sm:w-auto"
            >
              <Power className="size-3 sm:size-4" />
              <span className="hidden sm:inline">Enable</span>
              <span className="sm:hidden">Enable</span>
              {bulkLoading && <Loader2 className="size-3 sm:size-4 animate-spin" />}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                handleBulkStatus(rows, false);
              }}
              disabled={bulkLoading}
              className="gap-2 text-xs sm:text-sm w-full sm:w-auto"
            >
              <PowerOff className="size-3 sm:size-4" />
              <span className="hidden sm:inline">Disable</span>
              <span className="sm:hidden">Disable</span>
              {bulkLoading && <Loader2 className="size-3 sm:size-4 animate-spin" />}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setBulkDeleteTargets(rows);
              }}
              disabled={bulkLoading}
              className="gap-2 text-xs sm:text-sm w-full sm:w-auto"
            >
              <Trash2 className="size-3 sm:size-4" />
              <span className="hidden sm:inline">Delete</span>
              <span className="sm:hidden">Delete</span>
              {bulkLoading && <Loader2 className="size-3 sm:size-4 animate-spin" />}
            </Button>
          </div>
        )}
        manualPagination={true}
        pageCount={pageCount}
        pagination={pagination}
        onPaginationChange={setPagination}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Designation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDesignation}
              className="bg-destructive hover:bg-destructive/90"
            >
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
            <AlertDialogTitle>Delete Designations</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {bulkDeleteTargets.length} designation(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleBulkDelete(bulkDeleteTargets)}
              disabled={bulkLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {bulkLoading && <Loader2 className="size-3.5 mr-1 animate-spin" />}
              Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
