"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import type { SerializedEditorState } from "lexical";
import {
  ArrowUpDown,
  CalendarClock,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import { CronScheduleField } from "@/components/shared/cron-schedule-field";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useAuthStore } from "@/store";

const RichTextEditor = dynamic(
  () => import("@/components/editor/rich-text-editor").then((mod) => mod.RichTextEditor),
  { ssr: false }
);

type BlogStatus = "draft" | "review" | "published";

type BlogPost = {
  id: number;
  institution_id: number | null;
  title: string;
  author: string;
  status: BlogStatus;
  publish_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  content: SerializedEditorState | null;
};

type BlogForm = {
  title: string;
  status: BlogStatus;
  publishAt: string;
};

const statusClassName: Record<BlogStatus, string> = {
  draft: "border-muted-foreground/30 text-muted-foreground",
  published: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
  review: "border-yellow-500/45 bg-yellow-500/10 text-yellow-300",
};

const statusLabel: Record<BlogStatus, string> = {
  draft: "Draft",
  published: "Published",
  review: "Review",
};

const emptyForm: BlogForm = {
  title: "",
  status: "draft",
  publishAt: "",
};

function formatDateOnly(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "Manual publish";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Manual publish";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toIsoFromLocal(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function todayDateValue() {
  const date = new Date();
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getEffectiveStatus(post: BlogPost, now: number): BlogStatus {
  if (post.status !== "published" && post.publish_at) {
    const publishTime = new Date(post.publish_at).getTime();
    if (!Number.isNaN(publishTime) && publishTime <= now) {
      return "published";
    }
  }

  return post.status;
}

function getEditorPlainText(value: unknown): string {
  const parts: string[] = [];

  function visit(node: unknown) {
    if (!node || typeof node !== "object") return;
    const record = node as { text?: unknown; children?: unknown };

    if (typeof record.text === "string") {
      parts.push(record.text);
    }

    if (Array.isArray(record.children)) {
      record.children.forEach(visit);
      parts.push("\n");
    }
  }

  visit(value);
  return parts.join(" ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

export default function BlogPage() {
  const { user, accessToken } = useAuthStore();
  const searchParams = useSearchParams();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activePost, setActivePost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogForm>(emptyForm);
  const [blogEditorLeftSize, setBlogEditorLeftSize] = useState(34);
  const [now, setNow] = useState(() => Date.now());
  const blogEditorSplitRef = useRef<HTMLDivElement | null>(null);
  const blogBodyRef = useRef<SerializedEditorState | null>(null);

  const authorName = user?.full_name?.trim() || "Current user";
  const authHeader = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken],
  );

  const fetchBlogs = useCallback(async () => {
    if (!authHeader) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/content/blog", {
        headers: authHeader,
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Failed to load blogs.");
      setPosts(json.data ?? []);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Failed to load blogs.");
    } finally {
      setLoading(false);
    }
  }, [authHeader]);

  useEffect(() => {
    void fetchBlogs();
  }, [fetchBlogs]);

  useEffect(() => {
    const blogId = Number(searchParams.get("blogId"));
    if (!Number.isInteger(blogId) || blogId <= 0 || posts.length === 0) return;

    const matchingPost = posts.find((post) => post.id === blogId);
    if (matchingPost && activePost?.id !== matchingPost.id) {
      setActivePost(matchingPost);
    }
  }, [activePost?.id, posts, searchParams]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const startBlogEditorResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const container = blogEditorSplitRef.current;
    if (!container) return;

    event.preventDefault();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);

    const onMove = (moveEvent: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const nextSize = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      setBlogEditorLeftSize(Math.min(45, Math.max(24, nextSize)));
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  const columns = useMemo<ColumnDef<BlogPost>[]>(
    () => [
      {
        accessorKey: "title",
        header: ({ column }) => (
          <button
            type="button"
            className="flex items-center gap-2"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Blog
            <ArrowUpDown className="size-4" />
          </button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-semibold">{row.original.title}</div>
            <div className="text-sm text-muted-foreground">Website blog post</div>
          </div>
        ),
      },
      {
        accessorKey: "author",
        header: "Author",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = getEffectiveStatus(row.original, now);
          return (
            <Badge variant="outline" className={statusClassName[status]}>
              {statusLabel[status]}
            </Badge>
          );
        },
      },
      {
        accessorKey: "publish_at",
        header: "Publish Timer",
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarClock className="size-4 text-primary" />
            <span>{formatDateTime(row.original.publish_at)}</span>
          </div>
        ),
      },
      {
        accessorKey: "updated_at",
        header: "Updated",
        cell: ({ row }) => formatDateOnly(row.original.updated_at),
      },
    ],
    [now]
  );

  const openAddBlog = () => {
    blogBodyRef.current = null;
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const saveBlog = async () => {
    const title = form.title.trim();
    if (!title || !authHeader) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/content/blog", {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          status: form.status,
          publish_at: toIsoFromLocal(form.publishAt),
          content: blogBodyRef.current,
        }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Failed to save blog.");
      setPosts((current) => [json.data, ...current]);
      setDialogOpen(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save blog.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-primary">
            <FileText className="size-4" />
            Institution website content
          </div>
          <h1 className="text-2xl font-bold">Blog</h1>
          <p className="text-muted-foreground">
            Manage blog posts that will appear on the institution website.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={fetchBlogs} disabled={loading || !authHeader}>
            <RefreshCw className={loading ? "size-4 animate-spin" : "size-4"} />
            Refresh
          </Button>
          <Button onClick={openAddBlog}>
            <Plus className="size-4" />
            Add Blog
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={posts}
        searchKey="title"
        filterPlaceholder="Search blog posts..."
        emptyText={loading ? "Loading blogs..." : "No blog posts found."}
        onRowClick={(post) => setActivePost(post)}
      />

      <Sheet open={Boolean(activePost)} onOpenChange={(open) => !open && setActivePost(null)}>
        <SheetContent className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
          <SheetHeader className="border-b px-6 py-5 pr-14 text-left">
            <SheetTitle className="flex items-center gap-2 text-xl">
              <FileText className="size-5 text-primary" />
              {activePost?.title ?? "Blog"}
            </SheetTitle>
            <SheetDescription>
              {activePost ? `By ${activePost.author} · Updated ${formatDateOnly(activePost.updated_at)}` : ""}
            </SheetDescription>
          </SheetHeader>

          {activePost ? (
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                  <Badge
                    variant="outline"
                    className={`mt-2 ${statusClassName[getEffectiveStatus(activePost, now)]}`}
                  >
                    {statusLabel[getEffectiveStatus(activePost, now)]}
                  </Badge>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Publish Timer</p>
                  <p className="mt-2 text-sm font-medium">{formatDateTime(activePost.publish_at)}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Published</p>
                  <p className="mt-2 text-sm font-medium">
                    {activePost.published_at ? formatDateTime(activePost.published_at) : "-"}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Created</p>
                  <p className="mt-2 text-sm font-medium">{formatDateTime(activePost.created_at)}</p>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Institution</p>
                  <p className="mt-2 text-sm font-medium">
                    {activePost.institution_id ? `Institution #${activePost.institution_id}` : "Platform"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border bg-card">
                <div className="border-b px-4 py-3">
                  <h3 className="font-semibold">Blog Content</h3>
                </div>
                <div className="whitespace-pre-wrap px-4 py-4 text-sm leading-6 text-muted-foreground">
                  {getEditorPlainText(activePost.content) || "No content added."}
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="flex h-[88dvh] max-h-[900px] w-[96vw] max-w-[1400px] flex-col gap-0 overflow-hidden rounded-lg border bg-background p-0 shadow-2xl sm:max-w-[1400px]"
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-4 pr-14">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              Add Blog
            </DialogTitle>
            <DialogDescription className="sr-only">
              Add blog details on the left and write formatted blog content on the editor canvas.
            </DialogDescription>
          </DialogHeader>

          <div ref={blogEditorSplitRef} className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <div
              className="flex h-full min-h-0 min-w-0 shrink-0 grow-0 flex-col overflow-hidden bg-background"
              style={{ flexBasis: `${blogEditorLeftSize}%` }}
            >
              <div className="shrink-0 border-b px-5 py-5">
                <h3 className="font-semibold">Blog Fields</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Set title, status, author, and publish timer before saving. Write the blog
                  content on the canvas.
                </p>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
                <div className="space-y-2">
                  <Label htmlFor="blog-title">Title *</Label>
                  <Input
                    id="blog-title"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="Annual admission guide..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, status: value as BlogStatus }))
                    }
                  >
                    <SelectTrigger className="w-full bg-input/20">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent position="popper" className="w-[var(--radix-select-trigger-width)]">
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="review">Review</SelectItem>
                      <SelectItem value="published">Publish</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blog-author">Blog By</Label>
                  <Input id="blog-author" value={authorName} readOnly className="bg-input/20" />
                </div>

                <div className="space-y-2">
                  <Label>Publish Date & Time</Label>
                  <CronScheduleField
                    value={form.publishAt}
                    onChange={(publishAt) =>
                      setForm((current) => ({ ...current, publishAt }))
                    }
                    minDate={todayDateValue()}
                  />
                  <p className="text-xs text-muted-foreground">
                    Vercel Cron checks scheduled jobs every minute and publishes due blogs on
                    the server.
                  </p>
                </div>
              </div>

              <DialogFooter className="shrink-0 border-t px-5 py-4">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={saveBlog} disabled={!form.title.trim() || saving}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : null}
                  Add Blog
                </Button>
              </DialogFooter>
            </div>

            <div
              aria-label="Resize blog editor panels"
              role="separator"
              tabIndex={0}
              className="group relative z-30 flex w-px shrink-0 cursor-col-resize items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-3 after:-translate-x-1/2"
              onPointerDown={startBlogEditorResize}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") {
                  event.preventDefault();
                  setBlogEditorLeftSize((size) => Math.max(24, size - 2));
                }
                if (event.key === "ArrowRight") {
                  event.preventDefault();
                  setBlogEditorLeftSize((size) => Math.min(45, size + 2));
                }
              }}
            >
              <div className="z-10 flex h-8 w-2 items-center justify-center rounded-full border bg-background shadow-sm transition-colors group-hover:border-primary/60">
                <span className="h-4 w-0.5 rounded-full bg-muted-foreground/60" />
              </div>
            </div>

            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
              <div className="shrink-0 border-b px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">Document Canvas</h3>
                    <p className="text-sm text-muted-foreground">
                      Rich formatting, tables, lists, links, and quick commands.
                    </p>
                  </div>
                  <div className="hidden text-xs text-muted-foreground md:block">
                    Press{" "}
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px]">/</kbd>{" "}
                    for commands
                  </div>
                </div>
              </div>

              <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
                <RichTextEditor
                  key={dialogOpen ? "blog-editor-open" : "blog-editor-closed"}
                  onChange={(state) => {
                    blogBodyRef.current = state;
                  }}
                  placeholder="Press / for commands..."
                  maxLength={50000}
                  alwaysEditable
                  className="h-full min-h-0"
                />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
