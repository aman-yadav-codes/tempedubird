"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import {
  BarChart3,
  BookOpen,
  Check,
  Copy,
  Edit2,
  Eye,
  FolderTree,
  Info,
  Loader2,
  Megaphone,
  MoreHorizontal,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { HelpMarkdown } from "@/components/help/help-markdown";
import type { HelpArticleRow, HelpCategoryRow, HelpRecentUpdateRow } from "@/lib/queries/help-center";
import { slugify } from "@/lib/utils/slug";
import { useAuthStore } from "@/store";

type Mode = "overview" | "categories" | "articles" | "updates" | "analytics";

type PermissionOption = {
  id: number;
  code: string;
  name: string;
};

type ArticleForm = {
  category_id: number;
  title: string;
  slug: string;
  summary: string;
  content_md: string;
  visibility: "PUBLIC" | "AUTHENTICATED" | "PERMISSION_BASED";
  estimated_read_minutes: number;
  difficulty_level: string;
  is_featured: boolean;
  is_published: boolean;
  search_keywords: string;
  permission_ids: number[];
  assets: string;
  faqs: string;
  related_article_ids: string;
};

type CategoryForm = {
  parent_id?: number | null;
  name: string;
  slug: string;
  icon: string;
  description: string;
  sort_order: number;
  is_active: boolean;
};

type RecentUpdateForm = {
  title: string;
  description: string;
  href: string;
  update_date: string;
  sort_order: number;
  is_published: boolean;
};

const emptyCategory: CategoryForm = {
  name: "",
  slug: "",
  icon: "docs",
  description: "",
  sort_order: 0,
  is_active: true,
};

const emptyRecentUpdate: RecentUpdateForm = {
  title: "",
  description: "",
  href: "/help",
  update_date: new Date().toISOString().slice(0, 10),
  sort_order: 0,
  is_published: true,
};

const emptyArticle: ArticleForm = {
  category_id: 0,
  title: "",
  slug: "",
  summary: "",
  content_md: "# New Article\n\nWrite the guide here.",
  visibility: "PUBLIC",
  estimated_read_minutes: 3,
  difficulty_level: "Beginner",
  is_featured: false,
  is_published: false,
  search_keywords: "",
  permission_ids: [],
  assets: "[]",
  faqs: "[]",
  related_article_ids: "",
};

const searchKeywordsExample = "attendance, setup, timetable, students";
const assetsJsonExample = JSON.stringify(
  [
    {
      asset_type: "image",
      title: "Attendance setup screen",
      file_url: "https://example.com/screenshots/attendance-setup.png",
      thumbnail_url: "https://example.com/screenshots/attendance-setup-thumb.png",
      sort_order: 0,
    },
    {
      asset_type: "video",
      title: "Attendance setup walkthrough",
      file_url: "https://example.com/videos/attendance-setup.mp4",
      sort_order: 1,
    },
  ],
  null,
  2
);
const faqsJsonExample = JSON.stringify(
  [
    {
      question: "Why can't I mark attendance?",
      answer: "Create timetable slots and confirm students are enrolled in the selected class and section.",
      sort_order: 0,
    },
    {
      question: "Who can edit attendance?",
      answer: "Users with attendance edit permission can update attendance records.",
      sort_order: 1,
    },
  ],
  null,
  2
);
const relatedArticleIdsExample = "12, 18, 24";

export function HelpCenterAdmin({ mode }: { mode: Mode }) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const [categories, setCategories] = useState<HelpCategoryRow[]>([]);
  const [articles, setArticles] = useState<HelpArticleRow[]>([]);
  const [recentUpdates, setRecentUpdates] = useState<HelpRecentUpdateRow[]>([]);
  const [permissions, setPermissions] = useState<PermissionOption[]>([]);
  const [permissionsLoading, setPermissionsLoading] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [articleDialogOpen, setArticleDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategory);
  const [articleForm, setArticleForm] = useState<ArticleForm>(emptyArticle);
  const [updateForm, setUpdateForm] = useState<RecentUpdateForm>(emptyRecentUpdate);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [editingArticleId, setEditingArticleId] = useState<number | null>(null);
  const [editingUpdateId, setEditingUpdateId] = useState<number | null>(null);

  const headers = useMemo(
    () => ({
      "Content-Type": "application/json",
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    }),
    [accessToken]
  );

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const tasks: Promise<void>[] = [
        fetch("/api/help/categories?admin=1", { headers }).then(async (res) => {
          const json = await res.json();
          setCategories(json.data ?? []);
        }),
        fetch("/api/help/articles?admin=1&limit=200", { headers }).then(async (res) => {
          const json = await res.json();
          setArticles(json.data ?? []);
        }),
        fetch("/api/help/recent-updates?admin=1&limit=100", { headers }).then(async (res) => {
          const json = await res.json();
          setRecentUpdates(json.data ?? []);
        }),
      ];
      if (mode === "analytics") {
        tasks.push(
          fetch("/api/help/analytics", { headers }).then(async (res) => {
            const json = await res.json();
            setAnalytics(json.data ?? null);
          })
        );
      }
      await Promise.all(tasks);
    } catch (error: any) {
      toast.error(error?.message ?? "Unable to load help center data.");
    } finally {
      setLoading(false);
    }
  }, [accessToken, headers, mode]);

  const loadPermissionsIfNeeded = useCallback(async () => {
    if (!accessToken || permissions.length || permissionsLoading) return;
    setPermissionsLoading(true);
    try {
      const res = await fetch("/api/admin/access/options?type=permissions&limit=500", { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unable to load permissions.");
      setPermissions(json.data ?? []);
    } catch (error: any) {
      toast.error(error?.message ?? "Unable to load permissions.");
    } finally {
      setPermissionsLoading(false);
    }
  }, [accessToken, headers, permissions.length, permissionsLoading]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      load();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [load]);

  function openNewCategory() {
    setEditingCategoryId(null);
    setCategoryForm(emptyCategory);
    setCategoryDialogOpen(true);
  }

  const openEditCategory = useCallback((category: HelpCategoryRow) => {
    setEditingCategoryId(category.id);
    setCategoryForm({
      parent_id: category.parent_id,
      name: category.name,
      slug: category.slug,
      icon: category.icon ?? "docs",
      description: category.description ?? "",
      sort_order: category.sort_order,
      is_active: category.is_active,
    });
    setCategoryDialogOpen(true);
  }, []);

  function openNewArticle() {
    setEditingArticleId(null);
    setArticleForm({
      ...emptyArticle,
      category_id: categories[0]?.id ?? 0,
    });
    setArticleDialogOpen(true);
  }

  const openEditArticle = useCallback(async (article: HelpArticleRow) => {
    setEditingArticleId(article.id);
    const res = await fetch(`/api/help/articles/${article.slug}`, { headers });
    const json = await res.json();
    const detailed = json.data ?? article;
    setArticleForm({
      category_id: detailed.category_id,
      title: detailed.title,
      slug: detailed.slug,
      summary: detailed.summary ?? "",
      content_md: detailed.content_md ?? "",
      visibility: detailed.visibility,
      estimated_read_minutes: detailed.estimated_read_minutes ?? 3,
      difficulty_level: detailed.difficulty_level ?? "",
      is_featured: Boolean(detailed.is_featured),
      is_published: Boolean(detailed.is_published),
      search_keywords: detailed.search_keywords ?? "",
      permission_ids: (detailed.permissions ?? []).map((permission: PermissionOption) => permission.id),
      assets: JSON.stringify(detailed.assets ?? [], null, 2),
      faqs: JSON.stringify(detailed.faqs ?? [], null, 2),
      related_article_ids: (detailed.related_articles ?? []).map((item: any) => item.id).join(", "),
    });
    setArticleDialogOpen(true);
  }, [headers]);

  function openNewUpdate() {
    setEditingUpdateId(null);
    setUpdateForm(emptyRecentUpdate);
    setUpdateDialogOpen(true);
  }

  const openEditUpdate = useCallback((update: HelpRecentUpdateRow) => {
    setEditingUpdateId(update.id);
    setUpdateForm({
      title: update.title,
      description: update.description ?? "",
      href: update.href ?? "",
      update_date: new Date(update.update_date).toISOString().slice(0, 10),
      sort_order: update.sort_order,
      is_published: update.is_published,
    });
    setUpdateDialogOpen(true);
  }, []);

  async function saveCategory() {
    setSaving(true);
    try {
      const res = await fetch(editingCategoryId ? `/api/help/categories/${editingCategoryId}` : "/api/help/categories", {
        method: editingCategoryId ? "PUT" : "POST",
        headers,
        body: JSON.stringify(categoryForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unable to save category.");
      toast.success("Category saved.");
      setCategoryDialogOpen(false);
      await load();
    } catch (error: any) {
      toast.error(error?.message ?? "Unable to save category.");
    } finally {
      setSaving(false);
    }
  }

  async function saveArticle() {
    setSaving(true);
    try {
      const payload = {
        ...articleForm,
        category_id: Number(articleForm.category_id),
        estimated_read_minutes: Number(articleForm.estimated_read_minutes) || 3,
        permission_ids: articleForm.visibility === "PERMISSION_BASED" ? articleForm.permission_ids : [],
        assets: parseJsonArray(articleForm.assets, "assets"),
        faqs: parseJsonArray(articleForm.faqs, "FAQs"),
        related_article_ids: String(articleForm.related_article_ids ?? "")
          .split(",")
          .map((value) => Number(value.trim()))
          .filter((value) => Number.isInteger(value) && value > 0),
      };
      const res = await fetch(editingArticleId ? `/api/help/articles/${editingArticleId}` : "/api/help/articles", {
        method: editingArticleId ? "PUT" : "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unable to save article.");
      toast.success("Article saved.");
      setArticleDialogOpen(false);
      await load();
    } catch (error: any) {
      toast.error(error?.message ?? "Unable to save article.");
    } finally {
      setSaving(false);
    }
  }

  async function saveUpdate() {
    setSaving(true);
    try {
      const payload = {
        ...updateForm,
        sort_order: Number(updateForm.sort_order) || 0,
        description: updateForm.description || null,
        href: updateForm.href || null,
      };
      const res = await fetch(editingUpdateId ? `/api/help/recent-updates/${editingUpdateId}` : "/api/help/recent-updates", {
        method: editingUpdateId ? "PUT" : "POST",
        headers,
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Unable to save recent update.");
      toast.success("Recent update saved.");
      setUpdateDialogOpen(false);
      await load();
    } catch (error: any) {
      toast.error(error?.message ?? "Unable to save recent update.");
    } finally {
      setSaving(false);
    }
  }

  const deleteRecord = useCallback(async (kind: "category" | "article" | "recent update", id: number) => {
    if (!window.confirm(`Delete this ${kind}?`)) return;
    const url =
      kind === "category"
        ? `/api/help/categories/${id}`
        : kind === "article"
          ? `/api/help/articles/${id}`
          : `/api/help/recent-updates/${id}`;
    const res = await fetch(url, { method: "DELETE", headers });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error ?? `Unable to delete ${kind}.`);
      return;
    }
    toast.success(`${capitalize(kind)} deleted.`);
    await load();
  }, [headers, load]);

  const categoryColumns = useMemo<ColumnDef<HelpCategoryRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Category",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.slug}</div>
          </div>
        ),
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }) => <span className="line-clamp-1 text-muted-foreground">{row.original.description ?? "-"}</span>,
      },
      {
        accessorKey: "article_count",
        header: "Articles",
        cell: ({ row }) => row.original.article_count ?? 0,
      },
      {
        accessorKey: "sort_order",
        header: "Order",
      },
      {
        accessorKey: "is_active",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.is_active ? "default" : "outline"}>
            {row.original.is_active ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <RowActions
            onEdit={() => openEditCategory(row.original)}
            onDelete={() => deleteRecord("category", row.original.id)}
          />
        ),
      },
    ],
    [deleteRecord, openEditCategory]
  );

  const articleColumns = useMemo<ColumnDef<HelpArticleRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Article",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.title}</div>
            <div className="line-clamp-1 text-xs text-muted-foreground">{row.original.summary ?? row.original.slug}</div>
          </div>
        ),
      },
      {
        accessorKey: "category_name",
        header: "Category",
        cell: ({ row }) => row.original.category_name ?? "-",
      },
      {
        accessorKey: "visibility",
        header: "Visibility",
        cell: ({ row }) => <Badge variant="outline">{row.original.visibility}</Badge>,
      },
      {
        accessorKey: "estimated_read_minutes",
        header: "Read",
        cell: ({ row }) => `${row.original.estimated_read_minutes ?? 3} min`,
      },
      {
        accessorKey: "is_published",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.is_published ? "default" : "outline"}>
            {row.original.is_published ? "Published" : "Draft"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <RowActions
            previewHref={row.original.category_slug ? `/help/${row.original.category_slug}/${row.original.slug}` : `/help/${row.original.slug}`}
            onEdit={() => openEditArticle(row.original)}
            onDelete={() => deleteRecord("article", row.original.id)}
          />
        ),
      },
    ],
    [deleteRecord, openEditArticle]
  );

  const updateColumns = useMemo<ColumnDef<HelpRecentUpdateRow>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Update",
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.title}</div>
            <div className="line-clamp-1 text-xs text-muted-foreground">{row.original.description ?? row.original.href ?? "-"}</div>
          </div>
        ),
      },
      {
        accessorKey: "update_date",
        header: "Date",
        cell: ({ row }) => formatDate(row.original.update_date),
      },
      {
        accessorKey: "href",
        header: "Link",
        cell: ({ row }) => row.original.href ?? "-",
      },
      {
        accessorKey: "sort_order",
        header: "Order",
      },
      {
        accessorKey: "is_published",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.is_published ? "default" : "outline"}>
            {row.original.is_published ? "Published" : "Draft"}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => (
          <RowActions
            previewHref={row.original.href || "/help/recent-updates"}
            onEdit={() => openEditUpdate(row.original)}
            onDelete={() => deleteRecord("recent update", row.original.id)}
          />
        ),
      },
    ],
    [deleteRecord, openEditUpdate]
  );

  if (loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <Loader2 className="mr-2 size-5 animate-spin text-primary" />
        Loading help center...
      </div>
    );
  }

  if (mode === "overview") {
    return (
      <Shell title="Help Center" subtitle="Manage public help pages, searchable articles, FAQs, and role-gated documentation.">
        <div className="grid gap-4 md:grid-cols-3">
          <OverviewCard href="/admin/settings/help-center/categories" icon={FolderTree} title="Categories" value={categories.length} />
          <OverviewCard href="/admin/settings/help-center/articles" icon={BookOpen} title="Articles" value={articles.length} />
          <OverviewCard href="/admin/settings/help-center/updates" icon={Megaphone} title="Recent Updates" value={recentUpdates.length} />
          <OverviewCard href="/admin/settings/help-center/analytics" icon={BarChart3} title="Analytics" value="Open" />
        </div>
      </Shell>
    );
  }

  if (mode === "categories") {
    return (
      <Shell
        title="Help Categories"
        subtitle="Create category groups shown on the public Help Center home page."
        action={<Button onClick={openNewCategory}><Plus className="size-4" /> Add Category</Button>}
      >
        <DataTable
          columns={categoryColumns}
          data={categories}
          searchKey="name"
          filterPlaceholder="Filter categories..."
          emptyText="No help categories yet."
        />
        <CategoryDialog
          open={categoryDialogOpen}
          onOpenChange={setCategoryDialogOpen}
          form={categoryForm}
          setForm={setCategoryForm}
          saving={saving}
          editing={Boolean(editingCategoryId)}
          onSave={saveCategory}
        />
      </Shell>
    );
  }

  if (mode === "articles") {
    return (
      <Shell
        title="Help Articles"
        subtitle="Manage markdown articles, visibility, FAQs, assets, related guides, and permission-based docs."
        action={<Button onClick={openNewArticle}><Plus className="size-4" /> Add Article</Button>}
      >
        <DataTable
          columns={articleColumns}
          data={articles}
          searchKey="title"
          filterPlaceholder="Filter articles..."
          emptyText="No help articles yet."
        />
        <ArticleDialog
          open={articleDialogOpen}
          onOpenChange={setArticleDialogOpen}
          form={articleForm}
          setForm={setArticleForm}
          categories={categories}
          articles={articles}
          permissions={permissions}
          permissionsLoading={permissionsLoading}
          loadPermissionsIfNeeded={loadPermissionsIfNeeded}
          saving={saving}
          editing={Boolean(editingArticleId)}
          onSave={saveArticle}
        />
      </Shell>
    );
  }

  if (mode === "updates") {
    return (
      <Shell
        title="Recent Updates"
        subtitle="Manage the update notes shown on the Help Center home page and full update feed."
        action={<Button onClick={openNewUpdate}><Plus className="size-4" /> Add Update</Button>}
      >
        <DataTable
          columns={updateColumns}
          data={recentUpdates}
          searchKey="title"
          filterPlaceholder="Filter recent updates..."
          emptyText="No recent updates yet."
        />
        <RecentUpdateDialog
          open={updateDialogOpen}
          onOpenChange={setUpdateDialogOpen}
          form={updateForm}
          setForm={setUpdateForm}
          saving={saving}
          editing={Boolean(editingUpdateId)}
          onSave={saveUpdate}
        />
      </Shell>
    );
  }

  return (
    <Shell title="Help Analytics" subtitle="Review searches, most viewed articles, and content gaps.">
      <div className="grid gap-4 lg:grid-cols-2">
        <AnalyticsPanel title="Most Viewed" rows={analytics?.mostViewed} primary="title" secondary="views" />
        <AnalyticsPanel title="Top Searches" rows={analytics?.searches} primary="search_term" secondary="count" />
        <AnalyticsPanel title="No Views Yet" rows={analytics?.zeroViews} primary="title" />
        <AnalyticsPanel title="No Result Searches" rows={analytics?.noResults} primary="search_term" secondary="searched_at" />
      </div>
    </Shell>
  );
}

function Shell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-muted-foreground">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function CategoryDialog({
  open,
  onOpenChange,
  form,
  setForm,
  saving,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: CategoryForm;
  setForm: (form: CategoryForm) => void;
  saving: boolean;
  editing: boolean;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[88vh] max-h-[88vh] flex-col overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>{editing ? "Edit Category" : "Add Category"}</DialogTitle>
          <DialogDescription>Configure how this category appears in the Help Center.</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-[420px_1fr]">
          <div className="space-y-4 overflow-y-auto border-r p-6">
            <Field label="Name">
              <Input
                value={form.name}
                onChange={(event) => {
                  const name = event.target.value;
                  const shouldSyncSlug = !form.slug || form.slug === slugify(form.name);
                  setForm({ ...form, name, slug: shouldSyncSlug ? slugify(name) : form.slug });
                }}
              />
            </Field>
            <Field label="Slug">
              <Input
                value={form.slug}
                onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })}
              />
            </Field>
            <Field label="Icon"><Input value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} /></Field>
            <Field label="Description"><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field>
            <Field label="Sort Order"><Input type="number" value={form.sort_order} onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })} /></Field>
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} />
              Active
            </label>
          </div>
          <CategoryPreview form={form} />
        </div>
        <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}><Save className="size-4" /> {saving ? "Saving..." : "Save Category"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ArticleDialog({
  open,
  onOpenChange,
  form,
  setForm,
  categories,
  articles,
  permissions,
  permissionsLoading,
  loadPermissionsIfNeeded,
  saving,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ArticleForm;
  setForm: (form: ArticleForm) => void;
  categories: HelpCategoryRow[];
  articles: HelpArticleRow[];
  permissions: PermissionOption[];
  permissionsLoading: boolean;
  loadPermissionsIfNeeded: () => void;
  saving: boolean;
  editing: boolean;
  onSave: () => void;
}) {
  useEffect(() => {
    if (open && form.visibility === "PERMISSION_BASED") {
      loadPermissionsIfNeeded();
    }
  }, [form.visibility, loadPermissionsIfNeeded, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92vh] max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-7xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>{editing ? "Edit Article" : "Add Article"}</DialogTitle>
          <DialogDescription>Write on the left and review the Help Center preview on the right.</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 overflow-hidden xl:grid-cols-[520px_1fr]">
          <div className="space-y-4 overflow-y-auto border-r p-6">
            <Field label="Category">
              <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.category_id} onChange={(event) => setForm({ ...form, category_id: Number(event.target.value) })}>
                <option value={0}>Select category...</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title">
                <Input
                  value={form.title}
                  onChange={(event) => {
                    const title = event.target.value;
                    const shouldSyncSlug = !form.slug || form.slug === slugify(form.title);
                    setForm({ ...form, title, slug: shouldSyncSlug ? slugify(title) : form.slug });
                  }}
                />
              </Field>
              <Field label="Slug">
                <Input
                  value={form.slug}
                  onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })}
                />
              </Field>
            </div>
            <Field label="Summary"><Textarea value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} /></Field>
            <Field label="Markdown Content"><Textarea className="min-h-72 font-mono" value={form.content_md} onChange={(event) => setForm({ ...form, content_md: event.target.value })} /></Field>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Visibility">
                <select className="w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.visibility} onChange={(event) => setForm({ ...form, visibility: event.target.value as ArticleForm["visibility"] })}>
                  <option value="PUBLIC">Public</option>
                  <option value="AUTHENTICATED">Authenticated</option>
                  <option value="PERMISSION_BASED">Permission based</option>
                </select>
              </Field>
              <Field label="Read Minutes"><Input type="number" value={form.estimated_read_minutes} onChange={(event) => setForm({ ...form, estimated_read_minutes: Number(event.target.value) })} /></Field>
              <Field label="Difficulty"><Input value={form.difficulty_level} onChange={(event) => setForm({ ...form, difficulty_level: event.target.value })} /></Field>
            </div>
            <Field
              label={
                <LabelWithHelp
                  label="Search Keywords"
                  description="Comma-separated keywords used by Help Center search."
                  example={searchKeywordsExample}
                />
              }
            >
              <Input
                value={form.search_keywords}
                placeholder={searchKeywordsExample}
                onChange={(event) => setForm({ ...form, search_keywords: event.target.value })}
              />
            </Field>
            {form.visibility === "PERMISSION_BASED" ? (
              <Field label="Required Permissions">
                {permissionsLoading ? (
                  <div className="flex h-24 items-center justify-center rounded-md border text-sm text-muted-foreground">
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Loading permissions...
                  </div>
                ) : (
                  <select multiple className="h-36 w-full rounded-md border bg-background px-3 py-2 text-sm" value={form.permission_ids.map(String)} onChange={(event) => setForm({ ...form, permission_ids: Array.from(event.target.selectedOptions).map((option) => Number(option.value)) })}>
                    {permissions.map((permission) => <option key={permission.id} value={permission.id}>{permission.code}</option>)}
                  </select>
                )}
              </Field>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 rounded-md border p-3 text-sm"><input type="checkbox" checked={form.is_featured} onChange={(event) => setForm({ ...form, is_featured: event.target.checked })} /> Featured</label>
              <label className="flex items-center gap-2 rounded-md border p-3 text-sm"><input type="checkbox" checked={form.is_published} onChange={(event) => setForm({ ...form, is_published: event.target.checked })} /> Published</label>
            </div>
            <Field
              label={
                <LabelWithHelp
                  label="Assets JSON"
                  description="JSON array of image or video assets linked to this article."
                  example={assetsJsonExample}
                />
              }
            >
              <Textarea
                className="min-h-24 font-mono"
                value={form.assets}
                placeholder={assetsJsonExample}
                onChange={(event) => setForm({ ...form, assets: event.target.value })}
              />
            </Field>
            <Field
              label={
                <LabelWithHelp
                  label="FAQs JSON"
                  description="JSON array of FAQ objects shown below the article."
                  example={faqsJsonExample}
                />
              }
            >
              <Textarea
                className="min-h-24 font-mono"
                value={form.faqs}
                placeholder={faqsJsonExample}
                onChange={(event) => setForm({ ...form, faqs: event.target.value })}
              />
            </Field>
            <Field
              label={
                <LabelWithHelp
                  label="Related Article IDs"
                  description="Comma-separated article IDs. These articles appear as related links."
                  example={articles.slice(0, 3).map((article) => article.id).join(", ") || relatedArticleIdsExample}
                />
              }
            >
              <Input
                value={form.related_article_ids}
                onChange={(event) => setForm({ ...form, related_article_ids: event.target.value })}
                placeholder={articles.slice(0, 3).map((article) => article.id).join(", ") || relatedArticleIdsExample}
              />
            </Field>
          </div>
          <ArticlePreview form={form} category={categories.find((category) => category.id === Number(form.category_id))} />
        </div>
        <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}><Save className="size-4" /> {saving ? "Saving..." : "Save Article"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RecentUpdateDialog({
  open,
  onOpenChange,
  form,
  setForm,
  saving,
  editing,
  onSave,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: RecentUpdateForm;
  setForm: (form: RecentUpdateForm) => void;
  saving: boolean;
  editing: boolean;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[82vh] max-h-[82vh] flex-col overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4">
          <DialogTitle>{editing ? "Edit Recent Update" : "Add Recent Update"}</DialogTitle>
          <DialogDescription>Write the update note on the left and preview the public card on the right.</DialogDescription>
        </DialogHeader>
        <div className="grid min-h-0 flex-1 overflow-hidden lg:grid-cols-[440px_1fr]">
          <div className="space-y-4 overflow-y-auto border-r p-6">
            <Field label="Title">
              <Input
                value={form.title}
                placeholder="Student classroom assignment submission flow"
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </Field>
            <Field label="Description">
              <Textarea
                className="min-h-28"
                value={form.description}
                placeholder="Short explanation shown on the full recent updates page."
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </Field>
            <Field label="Link">
              <Input
                value={form.href}
                placeholder="/help/assignments"
                onChange={(event) => setForm({ ...form, href: event.target.value })}
              />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Update Date">
                <Input
                  type="date"
                  value={form.update_date}
                  onChange={(event) => setForm({ ...form, update_date: event.target.value })}
                />
              </Field>
              <Field label="Sort Order">
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(event) => setForm({ ...form, sort_order: Number(event.target.value) })}
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 rounded-md border p-3 text-sm">
              <input type="checkbox" checked={form.is_published} onChange={(event) => setForm({ ...form, is_published: event.target.checked })} />
              Published
            </label>
          </div>
          <RecentUpdatePreview form={form} />
        </div>
        <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}><Save className="size-4" /> {saving ? "Saving..." : "Save Update"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CategoryPreview({ form }: { form: CategoryForm }) {
  return (
    <div className="overflow-y-auto bg-background/40 p-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="mb-4 flex size-11 items-center justify-center rounded-md border border-primary/30 bg-primary/10 text-primary">
          <FolderTree className="size-5" />
        </div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">{form.name || "Category name"}</h2>
          <Badge variant={form.is_active ? "default" : "outline"}>{form.is_active ? "Active" : "Inactive"}</Badge>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{form.description || "Category description preview."}</p>
        <div className="mt-4 text-xs text-muted-foreground">/{form.slug || "category-slug"}</div>
      </div>
    </div>
  );
}

function RecentUpdatePreview({ form }: { form: RecentUpdateForm }) {
  return (
    <div className="overflow-y-auto bg-background/40 p-6">
      <div className="rounded-lg border bg-card p-5">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Megaphone className="size-4 text-primary" />
            <h2 className="font-semibold">Recent Updates</h2>
          </div>
          <Badge variant={form.is_published ? "default" : "outline"}>{form.is_published ? "Published" : "Draft"}</Badge>
        </div>
        <div className="flex items-start gap-3 border-t py-4 text-sm">
          <span className="mt-2 size-1.5 rounded-full bg-primary" />
          <div className="min-w-0 flex-1">
            <div className="font-medium">{form.title || "Recent update title"}</div>
            <div className="mt-1 text-muted-foreground">{form.description || "Short update description preview."}</div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              <span>{form.update_date ? formatDate(form.update_date) : "Update date"}</span>
              <span>{form.href || "/help"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArticlePreview({ form, category }: { form: ArticleForm; category?: HelpCategoryRow }) {
  return (
    <div className="overflow-y-auto bg-background/40 p-6">
      <div className="rounded-lg border bg-card p-6">
        <div className="mb-3 flex flex-wrap gap-2">
          <Badge>{category?.name ?? "Category"}</Badge>
          <Badge variant="outline">{form.visibility}</Badge>
          {form.is_published ? <Badge variant="default">Published</Badge> : <Badge variant="outline">Draft</Badge>}
        </div>
        <h1 className="text-2xl font-bold">{form.title || "Article title"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{form.summary || "Article summary preview."}</p>
        <div className="mt-5 rounded-md border bg-background p-4">
          <HelpMarkdown content={form.content_md} />
        </div>
      </div>
    </div>
  );
}

function RowActions({
  previewHref,
  onEdit,
  onDelete,
}: {
  previewHref?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon"><MoreHorizontal className="size-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {previewHref ? (
          <DropdownMenuItem asChild>
            <Link href={previewHref} target="_blank"><Eye className="size-4" /> Preview</Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuItem onClick={onEdit}><Edit2 className="size-4" /> Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onClick={onDelete}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}

function LabelWithHelp({
  label,
  description,
  example,
}: {
  label: string;
  description: string;
  example: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copyExample() {
    await navigator.clipboard.writeText(example);
    setCopied(true);
    toast.success("Example copied.");
    window.setTimeout(() => setCopied(false), 1200);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span>{label}</span>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex size-5 items-center justify-center rounded-full border text-muted-foreground transition hover:border-primary/60 hover:text-primary"
            aria-label={`${label} format help`}
          >
            <Info className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-96 space-y-3">
          <div>
            <div className="font-medium">{label} format</div>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <pre className="max-h-64 overflow-auto rounded-md border bg-background p-3 text-xs text-foreground">
            <code>{example}</code>
          </pre>
          <Button type="button" variant="outline" size="sm" onClick={copyExample}>
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy example"}
          </Button>
        </PopoverContent>
      </Popover>
    </span>
  );
}

function OverviewCard({ href, icon: Icon, title, value }: { href: string; icon: typeof FolderTree; title: string; value: string | number }) {
  return (
    <Link href={href} className="rounded-xl border bg-card p-5 transition hover:border-primary/60">
      <Icon className="mb-4 size-5 text-primary" />
      <div className="text-sm text-muted-foreground">{title}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </Link>
  );
}

function AnalyticsPanel({ title, rows, primary, secondary }: { title: string; rows?: any[]; primary: string; secondary?: string }) {
  return (
    <div className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
      <h2 className="font-semibold">{title}</h2>
      <div className="space-y-2">
        {(rows ?? []).map((row, index) => (
          <div key={`${title}-${index}`} className="flex justify-between gap-3 rounded-md border p-3 text-sm">
            <span className="truncate">{row[primary]}</span>
            {secondary ? <span className="shrink-0 text-muted-foreground">{String(row[secondary] ?? "")}</span> : null}
          </div>
        ))}
        {!rows?.length ? <p className="text-sm text-muted-foreground">No data yet.</p> : null}
      </div>
    </div>
  );
}

function parseJsonArray(value: string, label: string) {
  const parsed = JSON.parse(value || "[]");
  if (!Array.isArray(parsed)) throw new Error(`${label} must be a JSON array.`);
  return parsed;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}
