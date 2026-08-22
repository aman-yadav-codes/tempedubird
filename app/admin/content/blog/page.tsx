"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import type { SerializedEditorState } from "lexical";
import {
  ArrowUpDown,
  CalendarClock,
  Clock,
  FileText,
  Image as ImageIcon,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Tag,
  Video,
  Upload,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ChangeEvent,
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
import { Textarea } from "@/components/ui/textarea";
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
  category?: string | null;
  cover_image?: string | null;
  video_url?: string | null;
  summary?: string | null;
  tags?: string | null;
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
  category: string;
  cover_image: string;
  video_url: string;
  summary: string;
  tags: string;
  publishMode: "now" | "schedule" | "draft";
  status: BlogStatus;
  publishAt: string;
};

const BLOG_CATEGORIES = [
  "Academic & Curriculum",
  "Admissions & Counseling",
  "Campus Life & Culture",
  "Exams, Cutoffs & Results",
  "Placements & Career",
  "Scholarships & Financial Aid",
  "Student Activities & Sports",
  "Technology & Innovation",
  "Announcements & Notices",
];

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
  category: "Academic & Curriculum",
  cover_image: "",
  video_url: "",
  summary: "",
  tags: "",
  publishMode: "now",
  status: "published",
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
  if (!value) return "Immediate publish";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Immediate publish";

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
  if (!value || typeof value !== "object") return "";

  const root = (value as { root?: { children?: unknown[] } }).root;
  if (!root || !Array.isArray(root.children)) return "";

  const extractText = (nodes: unknown[]): string => {
    return nodes
      .map((node) => {
        if (!node || typeof node !== "object") return "";
        const item = node as { text?: string; children?: unknown[] };
        if (typeof item.text === "string") return item.text;
        if (Array.isArray(item.children)) return extractText(item.children);
        return "";
      })
      .filter(Boolean)
      .join(" ");
  };

  return extractText(root.children).trim();
}

export default function AdminBlogPage() {
  const searchParams = useSearchParams();
  const { user, accessToken } = useAuthStore();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activePost, setActivePost] = useState<BlogPost | null>(null);
  const [form, setForm] = useState<BlogForm>(emptyForm);
  const [blogEditorLeftSize, setBlogEditorLeftSize] = useState(36);
  const [uploadingImage, setUploadingImage] = useState(false);

  const blogBodyRef = useRef<SerializedEditorState | null>(null);
  const blogEditorSplitRef = useRef<HTMLDivElement | null>(null);

  const authHeader = useMemo(() => {
    if (!accessToken) return null;
    return { Authorization: `Bearer ${accessToken}` };
  }, [accessToken]);

  const authorName = useMemo(() => {
    return user?.full_name?.trim() || user?.email?.trim() || "Institutional Admin";
  }, [user]);

  const fetchBlogs = useCallback(async () => {
    if (!authHeader) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/content/blog", { headers: authHeader });
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
      setBlogEditorLeftSize(Math.min(48, Math.max(26, nextSize)));
    };

    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  const handleImageFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setForm((prev) => ({ ...prev, cover_image: base64 }));
      setUploadingImage(false);
    };
    reader.onerror = () => {
      setUploadingImage(false);
    };
    reader.readAsDataURL(file);
  };

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
          <div className="flex items-center gap-3">
            {row.original.cover_image && (
              <img
                src={row.original.cover_image}
                alt=""
                className="h-10 w-12 object-cover rounded-lg border shrink-0 bg-muted"
              />
            )}
            <div className="min-w-0">
              <div className="font-semibold truncate">{row.original.title}</div>
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="text-primary font-medium">{row.original.category || "General"}</span>
                {row.original.tags && <span>• {row.original.tags}</span>}
              </div>
            </div>
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
      const finalStatus = form.publishMode === "now" ? "published" : form.status;
      const finalPublishAt = form.publishMode === "schedule" ? toIsoFromLocal(form.publishAt) : null;

      const response = await fetch("/api/admin/content/blog", {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          category: form.category,
          cover_image: form.cover_image,
          video_url: form.video_url,
          summary: form.summary,
          tags: form.tags,
          status: finalStatus,
          publish_at: finalPublishAt,
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
          <Button onClick={openAddBlog} disabled={!authHeader} className="font-bold gap-1.5">
            <Plus className="size-4" />
            Add Blog
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <DataTable
        columns={columns}
        data={posts}
        onRowClick={(post) => setActivePost(post)}
        emptyText={loading ? "Loading blogs..." : "No blog posts found."}
      />

      <Sheet open={Boolean(activePost)} onOpenChange={(open) => !open && setActivePost(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {activePost ? (
            <div className="space-y-6 pt-6">
              <SheetHeader>
                <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                  <Badge variant="outline" className="text-[10px]">{activePost.category || "Academic & Curriculum"}</Badge>
                </div>
                <SheetTitle className="text-xl font-bold">{activePost.title}</SheetTitle>
                <SheetDescription className="text-xs">
                  Created by {activePost.author} on {formatDateOnly(activePost.created_at)}
                </SheetDescription>
              </SheetHeader>

              {activePost.cover_image && (
                <div className="rounded-xl overflow-hidden border">
                  <img src={activePost.cover_image} alt="" className="w-full h-48 object-cover" />
                </div>
              )}

              {activePost.video_url && (
                <div className="p-3 bg-muted/40 rounded-xl border flex items-center gap-2 text-xs">
                  <Video className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-semibold text-muted-foreground truncate">Video Attached:</span>
                  <a href={activePost.video_url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate">
                    {activePost.video_url}
                  </a>
                </div>
              )}

              {activePost.summary && (
                <div className="p-3 rounded-xl bg-card border text-xs text-muted-foreground italic">
                  "{activePost.summary}"
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
                  <Badge
                    variant="outline"
                    className={`mt-1.5 ${statusClassName[getEffectiveStatus(activePost, now)]}`}
                  >
                    {statusLabel[getEffectiveStatus(activePost, now)]}
                  </Badge>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Publish Timer</p>
                  <p className="mt-1.5 text-xs font-medium">{formatDateTime(activePost.publish_at)}</p>
                </div>
                <div className="rounded-lg border bg-card p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Published</p>
                  <p className="mt-1.5 text-xs font-medium">
                    {activePost.published_at ? formatDateTime(activePost.published_at) : "-"}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border bg-card">
                <div className="border-b px-4 py-3">
                  <h3 className="font-semibold text-sm">Blog Content</h3>
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
          className="flex h-[90dvh] max-h-[920px] w-[96vw] max-w-[1400px] flex-col gap-0 overflow-hidden rounded-xl border bg-background p-0 shadow-2xl sm:max-w-[1400px]"
          onPointerDownOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="shrink-0 border-b px-5 py-3.5 pr-14">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FileText className="size-4 text-primary" />
              Add Blog Article
            </DialogTitle>
            <DialogDescription className="sr-only">
              Configure blog details, media, schedule, and author on the left panel, and format content on the right canvas.
            </DialogDescription>
          </DialogHeader>

          <div ref={blogEditorSplitRef} className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
            <div
              className="flex h-full min-h-0 min-w-0 shrink-0 grow-0 flex-col overflow-hidden bg-background border-r"
              style={{ flexBasis: `${blogEditorLeftSize}%` }}
            >
              <div className="shrink-0 border-b px-5 py-3.5 bg-muted/20">
                <h3 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" /> Blog Configuration & Fields
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Set title, category, media, tags, and publishing schedule.
                </p>
              </div>

              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="blog-title" className="text-xs font-bold">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="blog-title"
                    value={form.title}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, title: event.target.value }))
                    }
                    placeholder="e.g. Annual Admission Guide 2026..."
                    className="h-9 text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <Layers className="h-3.5 w-3.5 text-primary" /> Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.category}
                    onValueChange={(value) =>
                      setForm((current) => ({ ...current, category: value }))
                    }
                  >
                    <SelectTrigger className="w-full h-9 text-xs bg-background font-medium">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOG_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat} className="text-xs">
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 p-3 rounded-xl border border-border/80 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold flex items-center gap-1">
                      <ImageIcon className="h-3.5 w-3.5 text-primary" /> Cover Image
                    </Label>
                    {form.cover_image && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setForm((prev) => ({ ...prev, cover_image: "" }))}
                        className="h-6 px-1.5 text-[10px] text-destructive hover:bg-destructive/10"
                      >
                        <X className="h-3 w-3 mr-0.5" /> Remove
                      </Button>
                    )}
                  </div>

                  {form.cover_image ? (
                    <div className="relative rounded-lg overflow-hidden border border-border h-28 bg-card">
                      <img src={form.cover_image} alt="Cover Preview" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="flex-1 cursor-pointer">
                          <div className="border border-dashed border-border rounded-lg p-2.5 text-center hover:bg-muted/50 transition-colors flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground">
                            <Upload className="h-4 w-4 text-primary" />
                            <span>{uploadingImage ? "Uploading..." : "Upload Image"}</span>
                          </div>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                      <Input
                        value={form.cover_image}
                        onChange={(e) => setForm((prev) => ({ ...prev, cover_image: e.target.value }))}
                        placeholder="Or paste image URL (https://...)"
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="blog-video" className="text-xs font-bold flex items-center gap-1">
                    <Video className="h-3.5 w-3.5 text-primary" /> Video URL (Optional)
                  </Label>
                  <Input
                    id="blog-video"
                    value={form.video_url}
                    onChange={(e) => setForm((prev) => ({ ...prev, video_url: e.target.value }))}
                    placeholder="https://youtube.com/watch?v=... or mp4 stream"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="blog-summary" className="text-xs font-bold">
                    Short Summary / Excerpt
                  </Label>
                  <Textarea
                    id="blog-summary"
                    rows={2}
                    value={form.summary}
                    onChange={(e) => setForm((prev) => ({ ...prev, summary: e.target.value }))}
                    placeholder="Brief 1-2 line teaser summary for search & blog cards..."
                    className="text-xs resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="blog-tags" className="text-xs font-bold flex items-center gap-1">
                    <Tag className="h-3.5 w-3.5 text-primary" /> Topic Tags
                  </Label>
                  <Input
                    id="blog-tags"
                    value={form.tags}
                    onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                    placeholder="e.g. Admissions, Campus Life, Engineering"
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-2.5 p-3 rounded-xl border border-border/80 bg-muted/20">
                  <Label className="text-xs font-bold flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-primary" /> Publishing Schedule
                  </Label>

                  <div className="grid grid-cols-3 gap-1.5">
                    <Button
                      type="button"
                      variant={form.publishMode === "now" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setForm((prev) => ({ ...prev, publishMode: "now", status: "published" }))}
                      className="h-8 text-xs font-bold gap-1 px-2"
                    >
                      <Send className="h-3 w-3" /> Now
                    </Button>
                    <Button
                      type="button"
                      variant={form.publishMode === "schedule" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setForm((prev) => ({ ...prev, publishMode: "schedule", status: "draft" }))}
                      className="h-8 text-xs font-bold gap-1 px-2"
                    >
                      <Clock className="h-3 w-3" /> Schedule
                    </Button>
                    <Button
                      type="button"
                      variant={form.publishMode === "draft" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setForm((prev) => ({ ...prev, publishMode: "draft", status: "draft" }))}
                      className="h-8 text-xs font-bold gap-1 px-2"
                    >
                      Draft
                    </Button>
                  </div>

                  {form.publishMode === "schedule" && (
                    <div className="space-y-1.5 pt-1.5 border-t">
                      <Label className="text-[11px] font-semibold text-muted-foreground">Select Publish Date & Time</Label>
                      <CronScheduleField
                        value={form.publishAt}
                        onChange={(publishAt) =>
                          setForm((current) => ({ ...current, publishAt }))
                        }
                        minDate={todayDateValue()}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Post will be automatically published on the chosen schedule.
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="blog-author" className="text-xs font-bold">Blog By</Label>
                  <Input id="blog-author" value={authorName} readOnly className="bg-muted/40 h-8 text-xs font-semibold cursor-not-allowed" />
                </div>
              </div>

              <DialogFooter className="shrink-0 border-t px-5 py-3.5 flex items-center justify-between gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving} className="text-xs h-9">
                  Cancel
                </Button>
                <Button
                  onClick={saveBlog}
                  disabled={!form.title.trim() || saving}
                  className="text-xs h-9 font-bold bg-primary text-primary-foreground gap-1.5"
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-3.5" />}
                  {form.publishMode === "now" ? "Publish Blog" : form.publishMode === "schedule" ? "Schedule Blog" : "Save Draft"}
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
                  setBlogEditorLeftSize((size) => Math.min(48, size + 2));
                }
              }}
            >
              <div className="z-10 flex h-8 w-2 items-center justify-center rounded-full border bg-background shadow-sm transition-colors group-hover:border-primary/60">
                <span className="h-4 w-0.5 rounded-full bg-muted-foreground/60" />
              </div>
            </div>

            <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-background">
              <div className="shrink-0 border-b px-5 py-3.5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm">Document Canvas</h3>
                    <p className="text-xs text-muted-foreground">
                      Rich formatting, tables, lists, links, images, and quick slash commands.
                    </p>
                  </div>
                  <div className="hidden text-xs text-muted-foreground md:block">
                    Press{" "}
                    <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-mono">/</kbd>{" "}
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
