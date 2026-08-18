"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import { BookOpen, Plus, Loader2, Trash2, RefreshCw, Power, PowerOff, Edit, MoreHorizontal } from "lucide-react";
import { StatsCards } from "@/components/master-data/stats-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
import { Skill } from "@/lib/types/skill";
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
  setDeleteTarget: (s: Skill) => void,
  setEditingSkill: (s: Skill) => void,
  handleToggleStatus: (skill: Skill) => Promise<void>,
  activeLoadingId: number | null,
  openDropdownId: number | null,
  setOpenDropdownId: (id: number | null) => void,
  setActiveLoadingId: (id: number | null) => void
): ColumnDef<Skill>[] {
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
          aria-label="Select all skills"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) =>
            row.toggleSelected(!!value)
          }
          aria-label="Select skill"
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
        const skill = row.original;
        return (
          <Badge
            variant="default"
            className={
              skill.is_active
                ? "bg-green-100 text-green-700 hover:bg-green-100"
                : "bg-red-100 text-red-700 hover:bg-red-100"
            }
          >
            {skill.is_active ? "Active" : "Disabled"}
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
        const skill = row.original;
        return (
          <DropdownMenu
            open={openDropdownId === skill.id}
            onOpenChange={(isOpen) => setOpenDropdownId(isOpen ? skill.id : null)}
          >
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setEditingSkill(skill)}>
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={activeLoadingId === skill.id}
                onSelect={(e) => {
                  e.preventDefault();
                  setActiveLoadingId(skill.id);
                  handleToggleStatus(skill).finally(() => setActiveLoadingId(null));
                }}
              >
                {activeLoadingId === skill.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <span>{skill.is_active ? "Disable skill" : "Enable skill"}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => setDeleteTarget(skill)}
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

export default function SkillsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();

  const [skills, setSkills] = useState<Skill[]>([]);
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

  const [deleteTarget, setDeleteTarget] = useState<Skill | null>(null);
  const [bulkDeleteTargets, setBulkDeleteTargets] = useState<Skill[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [editingSkill, setEditingSkill] = useState<Skill | null>(null);
  const [activeLoadingId, setActiveLoadingId] = useState<number | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
  const bulkResetSelectionRef = useRef<(() => void) | null>(null);

  const authHeader = { Authorization: `Bearer ${accessToken}` };

  const fetchStats = useCallback(async () => {
    if (!accessToken) return;
    setStatsLoading(true);
    try {
      const res = await fetch("/api/admin/master-data/skills/stats", {
        headers: authHeader,
      });
      const json = await res.json();
      if (res.ok) {
        setStats(json.data);
      }
    } catch {
      console.error("Failed to fetch stats");
    } finally {
      setStatsLoading(false);
    }
  }, [accessToken]);

  const fetchSkills = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/master-data/skills?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}&search=${encodeURIComponent(debouncedSearch)}`,
        { headers: authHeader }
      );
      const json = await res.json();
      if (res.ok) {
        setSkills(json.data);
        setPageCount(json.pageCount);
      } else {
        toast.error(json.error ?? "Failed to load skills");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }, [accessToken, pagination.pageIndex, pagination.pageSize, debouncedSearch]);

  useEffect(() => {
    if (isReady) {
      fetchSkills();
    }
  }, [isReady, fetchSkills]);

  useEffect(() => {
    if (isReady) {
      fetchStats();
    }
  }, [isReady]);

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

  useEffect(() => {
    if (editingSkill) {
      setName(editingSkill.name);
      setSlug(editingSkill.slug);
    }
  }, [editingSkill]);

  const handleAddSkill = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/master-data/skills", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ name: capitalize(name.trim()), slug: slug.trim() }),
      });

      const json = await res.json();

      if (res.ok) {
        toast.success("Skill added successfully");
        setName("");
        setSlug("");
        setDialogOpen(false);
        await fetchSkills();
        await fetchStats();
      } else {
        toast.error(json.error ?? "Failed to add skill");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateSkill = async () => {
    if (!editingSkill || !name.trim() || !slug.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/master-data/skills/${editingSkill.id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ name: capitalize(name.trim()), slug: slug.trim() }),
      });

      const json = await res.json();

      if (res.ok) {
        toast.success("Skill updated successfully");
        setName("");
        setSlug("");
        setEditingSkill(null);
        await fetchSkills();
        await fetchStats();
      } else {
        toast.error(json.error ?? "Failed to update skill");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSkill = async () => {
    if (!deleteTarget) return;

    try {
      const res = await fetch(`/api/admin/master-data/skills/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeader,
      });

      if (res.ok) {
        toast.success("Skill deleted successfully");
        setDeleteTarget(null);
        await fetchSkills();
        await fetchStats();
      } else {
        const json = await res.json();
        toast.error(json.error ?? "Failed to delete skill");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleToggleStatus = async (skill: Skill) => {
    try {
      const res = await fetch(`/api/admin/master-data/skills/${skill.id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !skill.is_active }),
      });

      if (res.ok) {
        toast.success(`Skill ${!skill.is_active ? "enabled" : "disabled"}`);
        await fetchSkills();
        await fetchStats();
      } else {
        const json = await res.json();
        toast.error(json.error ?? "Failed to update skill");
      }
    } catch {
      toast.error("Network error");
    }
  };

  async function handleBulkStatus(
    selectedRows: Skill[],
    isActive: boolean,
    resetSelection: () => void
  ) {
    setBulkLoading(true);
    try {
      await Promise.all(
        selectedRows.map((skill) =>
          fetch(`/api/admin/master-data/skills/${skill.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeader },
            body: JSON.stringify({ is_active: isActive }),
          }).then((res) => {
            if (!res.ok) throw new Error("Failed to update selected skills");
          })
        )
      );

      toast.success(
        `${selectedRows.length} skill${selectedRows.length === 1 ? "" : "s"} ${isActive ? "enabled" : "disabled"}`
      );
      resetSelection();
      fetchSkills();
      fetchStats();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to update skills"
      );
    } finally {
      setBulkLoading(false);
    }
  }

  async function handleBulkDelete() {
    setBulkLoading(true);
    try {
      await Promise.all(
        bulkDeleteTargets.map((skill) =>
          fetch(`/api/admin/master-data/skills/${skill.id}`, {
            method: "DELETE",
            headers: authHeader,
          }).then((res) => {
            if (!res.ok) throw new Error("Failed to delete selected skills");
          })
        )
      );

      toast.success(`${bulkDeleteTargets.length} skills deleted`);
      setBulkDeleteTargets([]);
      bulkResetSelectionRef.current?.();
      fetchSkills();
      fetchStats();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Failed to delete skills"
      );
    } finally {
      setBulkLoading(false);
    }
  }

  const columns = buildColumns(setDeleteTarget, setEditingSkill, handleToggleStatus, activeLoadingId, openDropdownId, setOpenDropdownId, setActiveLoadingId);

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
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Skills</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage all skills in the system</p>
          </div>
          <Dialog open={dialogOpen || !!editingSkill} onOpenChange={(open) => {
            if (open) {
              setDialogOpen(true);
            } else {
              setDialogOpen(false);
              setEditingSkill(null);
              setName("");
              setSlug("");
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto">
                <Plus className="size-4" />
                Add Skill
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BookOpen className="size-4" />
                  {editingSkill ? "Edit Skill" : "Add New Skill"}
                </DialogTitle>
                <DialogDescription>
                  {editingSkill
                    ? "Update the skill details"
                    : "Create a new skill that can be assigned to users"}
                </DialogDescription>
              </DialogHeader>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  editingSkill ? handleUpdateSkill() : handleAddSkill();
                }}
                className="flex flex-col gap-4 pt-2"
              >
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="skill-name">Name</Label>
                  <Input
                    id="skill-name"
                    placeholder="e.g. JavaScript"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setSlug(toSlug(e.target.value));
                    }}
                    required
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="skill-slug">
                    Slug{" "}
                    <span className="text-xs text-muted-foreground font-normal">
                      (auto-generated)
                    </span>
                  </Label>
                  <Input
                    id="skill-slug"
                    value={slug}
                    disabled
                    className="font-mono text-sm bg-muted/40 cursor-not-allowed"
                  />
                </div>
                <Button type="submit" disabled={submitting}>
                  {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                  {editingSkill ? "Update Skill" : "Create Skill"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <StatsCards stats={stats} loading={statsLoading} title="Skills" />
      </div>

      <DataTable
        columns={columns}
        data={skills}
        getRowId={(row) => String(row.id)}
        toolbarLeft={
          <div className="w-full sm:w-auto">
            <Input
              placeholder="Search skills..."
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
              fetchSkills();
              fetchStats();
            }}
            disabled={loading}
            title="Refresh"
            className="shrink-0"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        }
        selectedActions={(selectedRows) => (
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={() => {
                handleBulkStatus(selectedRows, true, () => { });
                fetchStats();
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
                handleBulkStatus(selectedRows, false, () => { });
                fetchStats();
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
                bulkResetSelectionRef.current = () => { };
                setBulkDeleteTargets(selectedRows);
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
            <AlertDialogTitle>Delete Skill</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSkill}
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
            <AlertDialogTitle>Delete Skills</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {bulkDeleteTargets.length} skill(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleBulkDelete()}
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
