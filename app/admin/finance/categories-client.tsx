"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  CreditCard,
  Edit2,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Tags,
  Trash2,
  TrendingUp,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { useAuthStore } from "@/store";

type CategoryTarget = "income" | "expense" | "recurring";

type CategoryRow = {
  name: string;
  targets: CategoryTarget[];
  income_id: number | null;
  expense_id: number | null;
  recurring_id: number | null;
  is_active: boolean;
  created_at: string;
};

const TARGET_CONFIG: Record<CategoryTarget, { label: string; icon: typeof TrendingUp; color: string; badgeClass: string }> = {
  income: {
    label: "Income",
    icon: TrendingUp,
    color: "text-emerald-500",
    badgeClass: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  },
  expense: {
    label: "Expense",
    icon: CreditCard,
    color: "text-rose-500",
    badgeClass: "bg-rose-500/10 text-rose-600 border-rose-500/20 dark:text-rose-400",
  },
  recurring: {
    label: "Recurring",
    icon: CalendarDays,
    color: "text-indigo-500",
    badgeClass: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:text-indigo-400",
  },
};

export function FinanceCategoriesClient() {
  const pathname = usePathname();
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitutionId, activeInstitution } = useActiveInstitution();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isPlatformSection = pathname?.startsWith("/platformadmin");
  const targetInstitutionId = isPlatformSection ? null : activeInstitutionId;

  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [search, setSearch] = useState("");

  // Add category state
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedTargets, setSelectedTargets] = useState<CategoryTarget[]>(["income", "expense"]);

  // Edit category modal state
  const [editingCategory, setEditingCategory] = useState<CategoryRow | null>(null);
  const [editName, setEditName] = useState("");
  const [editTargets, setEditTargets] = useState<CategoryTarget[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete state
  const [deletingCategory, setDeletingCategory] = useState<CategoryRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const authHeader = useMemo(() => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), [accessToken]);

  const scopeBadgeText = isPlatformSection || !targetInstitutionId
    ? "Platform finance categories"
    : `${activeInstitution?.name ?? "Institution"} finance categories`;

  const fetchCategories = useCallback(async () => {
    if (!isReady || !accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (targetInstitutionId) {
        params.set("institutionId", String(targetInstitutionId));
      }
      const res = await fetch(`/api/admin/finance/categories?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch categories");
      setCategories(json.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeader, isReady, targetInstitutionId]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCategoryName.trim();
    if (!cleanName) {
      toast.error("Enter a category name");
      return;
    }
    if (selectedTargets.length === 0) {
      toast.error("Select at least one page for this category");
      return;
    }

    setAdding(true);
    try {
      const res = await fetch("/api/admin/finance/categories", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: targetInstitutionId,
          name: cleanName,
          targets: selectedTargets,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add category");

      toast.success(`Added "${cleanName}" category`);
      setNewCategoryName("");
      setCategories(json.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add category");
    } finally {
      setAdding(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingCategory) return;
    const cleanName = editName.trim();
    if (!cleanName) {
      toast.error("Category name is required");
      return;
    }
    if (editTargets.length === 0) {
      toast.error("Select at least one page");
      return;
    }

    setSavingEdit(true);
    try {
      // First delete old and create new with updated targets
      const params = new URLSearchParams({ name: editingCategory.name });
      if (activeInstitutionId) params.set("institutionId", String(activeInstitutionId));

      await fetch(`/api/admin/finance/categories?${params.toString()}`, {
        method: "DELETE",
        headers: authHeader,
      });

      const res = await fetch("/api/admin/finance/categories", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: activeInstitutionId,
          name: cleanName,
          targets: editTargets,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update category");

      toast.success("Category updated successfully");
      setEditingCategory(null);
      setCategories(json.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update category");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingCategory) return;
    setDeleting(true);
    try {
      const params = new URLSearchParams({ name: deletingCategory.name });
      if (activeInstitutionId) params.set("institutionId", String(activeInstitutionId));

      const res = await fetch(`/api/admin/finance/categories?${params.toString()}`, {
        method: "DELETE",
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete category");

      toast.success(`Deleted "${deletingCategory.name}"`);
      setDeletingCategory(null);
      void fetchCategories();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete category");
    } finally {
      setDeleting(false);
    }
  };

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return categories;
    const term = search.toLowerCase().trim();
    return categories.filter((c) => c.name.toLowerCase().includes(term));
  }, [categories, search]);

  const allTargets: CategoryTarget[] = ["income", "expense", "recurring"];
  const unselectedAddTargets = allTargets.filter((t) => !selectedTargets.includes(t));

  if (!isReady) return null;

  return (
    <div className="space-y-6">
      {/* Header Banner matching screenshot */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Finance Categories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            These categories appear in Finance &gt; Income, Expense, and Recurring Expenses based on the selected pages.
          </p>
        </div>
        <Badge variant="outline" className="w-fit border-border/80 px-3 py-1 text-xs font-semibold text-foreground">
          {scopeBadgeText}
        </Badge>
      </div>

      {/* Add Category Section matching screenshot layout */}
      <form onSubmit={handleAddCategory} className="rounded-lg border bg-card/60 p-4 shadow-xs">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          {/* Text Input */}
          <div className="flex-1">
            <Input
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g. Internet Bills, Water Bills, Hosting Bills"
              className="h-11 border-muted-foreground/30 bg-background text-sm shadow-xs focus-visible:ring-1"
            />
          </div>

          {/* Multi-Select Pills Container */}
          <div className="flex min-h-11 min-w-[280px] items-center justify-between gap-1.5 rounded-md border border-muted-foreground/30 bg-background px-2.5 py-1.5 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              {selectedTargets.map((target) => {
                const cfg = TARGET_CONFIG[target];
                return (
                  <span
                    key={target}
                    className="inline-flex items-center gap-1 rounded-full border bg-muted/60 px-2.5 py-0.5 text-xs font-medium text-foreground"
                  >
                    <span>{cfg.label}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedTargets((prev) => prev.filter((t) => t !== target))}
                      className="text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                );
              })}
              {selectedTargets.length === 0 && (
                <span className="text-xs text-muted-foreground">Select pages...</span>
              )}
            </div>

            {/* Target Selector Dropdown */}
            <div className="flex items-center gap-1 pl-2">
              {selectedTargets.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTargets([])}
                  title="Clear all"
                  className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
              {unselectedAddTargets.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                    >
                      <ChevronDown className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {unselectedAddTargets.map((target) => {
                      const cfg = TARGET_CONFIG[target];
                      const Icon = cfg.icon;
                      return (
                        <DropdownMenuItem
                          key={target}
                          onClick={() => setSelectedTargets((prev) => [...prev, target])}
                          className="gap-2 text-xs font-medium cursor-pointer"
                        >
                          <Icon className={`size-3.5 ${cfg.color}`} />
                          Add {cfg.label}
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Add Category Submit Button */}
          <Button
            type="submit"
            disabled={adding || !newCategoryName.trim()}
            className="h-11 gap-2 bg-rose-500 font-semibold text-white hover:bg-rose-600 shadow-2xs cursor-pointer px-5"
          >
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            + Add Category
          </Button>
        </div>
      </form>

      {/* Filter and Categories List */}
      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="h-9 pl-9 text-xs"
            />
          </div>
          <Button variant="outline" size="sm" onClick={fetchCategories} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
        </div>

        {/* Categories Table / Card */}
        <div className="rounded-lg border bg-card shadow-xs overflow-hidden">
          {loading ? (
            <div className="space-y-3 p-6">
              <Skeleton className="h-6 w-1/3" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              <Tag className="mx-auto size-8 mb-2 text-muted-foreground/50" />
              <p className="font-medium">No finance categories yet.</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add categories above to organize your income, expense, and recurring expense records.
              </p>
            </div>
          ) : (
            <div className="divide-y">
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-4 bg-muted/30 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>Category Name</span>
                <span>Applies To</span>
                <span className="text-right">Actions</span>
              </div>
              {filteredCategories.map((category) => (
                <div
                  key={category.name}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-3.5 transition-colors hover:bg-muted/20 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">{category.name}</p>
                  </div>

                  {/* Badges for targets */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {category.targets.map((target) => {
                      const cfg = TARGET_CONFIG[target];
                      const Icon = cfg.icon;
                      return (
                        <Badge
                          key={target}
                          variant="outline"
                          className={`gap-1 px-2.5 py-0.5 text-xs font-semibold ${cfg.badgeClass}`}
                        >
                          <Icon className="size-3" />
                          {cfg.label}
                        </Badge>
                      );
                    })}
                  </div>

                  {/* Actions dropdown */}
                  <div className="flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="size-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingCategory(category);
                            setEditName(category.name);
                            setEditTargets([...category.targets]);
                          }}
                          className="gap-2 cursor-pointer"
                        >
                          <Edit2 className="size-3.5" />
                          Edit Category
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeletingCategory(category)}
                          className="gap-2 text-rose-600 font-medium cursor-pointer"
                        >
                          <Trash2 className="size-3.5" />
                          Delete Category
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Category Dialog */}
      <Dialog open={Boolean(editingCategory)} onOpenChange={(open) => !open && setEditingCategory(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Finance Category</DialogTitle>
            <DialogDescription>
              Update category name and which finance sections it appears in.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Category Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Category name"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Applies to Sections</Label>
              <div className="grid grid-cols-3 gap-2">
                {allTargets.map((target) => {
                  const cfg = TARGET_CONFIG[target];
                  const Icon = cfg.icon;
                  const active = editTargets.includes(target);
                  return (
                    <button
                      type="button"
                      key={target}
                      onClick={() =>
                        setEditTargets((prev) =>
                          active ? prev.filter((t) => t !== target) : [...prev, target]
                        )
                      }
                      className={`flex flex-col items-center justify-center gap-1.5 rounded-lg border p-3 text-xs font-semibold transition-all cursor-pointer ${
                        active
                          ? "border-primary bg-primary/10 text-primary shadow-xs"
                          : "border-border bg-card text-muted-foreground hover:bg-muted/50"
                      }`}
                    >
                      <Icon className="size-4" />
                      <span>{cfg.label}</span>
                      {active && <Check className="size-3 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingCategory(null)} disabled={savingEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit || !editName.trim()}>
              {savingEdit ? <Loader2 className="size-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={Boolean(deletingCategory)} onOpenChange={(open) => !open && setDeletingCategory(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertCircle className="size-5" />
              Delete Category
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete category &quot;{deletingCategory?.name}&quot;? Existing records will retain their history.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingCategory(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
