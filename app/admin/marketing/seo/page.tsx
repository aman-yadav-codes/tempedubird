"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Plus,
  Trash2,
  Edit2,
  Search,
  Sparkles,
  Loader2,
  CheckCircle2,
  Share2,
  Image as ImageIcon,
  ShieldCheck,
  ExternalLink,
  Code,
  Tag,
  FileText,
  AlertCircle,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { DocumentFileUpload } from "@/components/shared/document-file-upload";
import type { PageSeoRecord } from "@/lib/seo/metadata";

type Stats = {
  total: number;
  active_pages: number;
  with_favicon: number;
  with_social_card: number;
};

const initialForm = {
  page_path: "",
  page_name: "",
  meta_title: "",
  meta_description: "",
  meta_keywords: "",
  canonical_url: "",
  og_title: "",
  og_description: "",
  og_image: "",
  twitter_card: "summary_large_image",
  twitter_title: "",
  twitter_description: "",
  twitter_image: "",
  favicon_url: "",
  robots: "index, follow",
  schema_json: "",
  is_active: true,
};

export default function SeoManagementPage() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [pages, setPages] = useState<PageSeoRecord[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    active_pages: 0,
    with_favicon: 0,
    with_social_card: 0,
  });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ALL");

  // Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PageSeoRecord | null>(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<PageSeoRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPages = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category !== "ALL") params.set("category", category);

      const res = await fetch(`/api/admin/seo?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load SEO pages");

      setPages(data.data || []);
      setStats(
        data.stats || {
          total: 0,
          active_pages: 0,
          with_favicon: 0,
          with_social_card: 0,
        }
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch SEO pages");
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, category]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setForm(initialForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: PageSeoRecord) => {
    setEditingRecord(item);
    setForm({
      page_path: item.page_path,
      page_name: item.page_name,
      meta_title: item.meta_title,
      meta_description: item.meta_description || "",
      meta_keywords: item.meta_keywords || "",
      canonical_url: item.canonical_url || "",
      og_title: item.og_title || "",
      og_description: item.og_description || "",
      og_image: item.og_image || "",
      twitter_card: item.twitter_card || "summary_large_image",
      twitter_title: item.twitter_title || "",
      twitter_description: item.twitter_description || "",
      twitter_image: item.twitter_image || "",
      favicon_url: item.favicon_url || "",
      robots: item.robots || "index, follow",
      schema_json: item.schema_json || "",
      is_active: Boolean(item.is_active),
    });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.page_path.trim() || !form.meta_title.trim()) {
      toast.error("Please provide both page path and meta title.");
      return;
    }

    setSaving(true);
    try {
      const isEdit = Boolean(editingRecord?.id);
      const url = "/api/admin/seo";
      const method = isEdit ? "PUT" : "POST";
      const payload = isEdit ? { ...form, id: editingRecord?.id } : form;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save SEO configuration");

      toast.success(isEdit ? "Page SEO configuration updated!" : "New Page SEO configuration added!");
      setDialogOpen(false);
      fetchPages();
    } catch (err: any) {
      toast.error(err.message || "Failed to save SEO configuration");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget?.id) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/seo?id=${deleteTarget.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete SEO page");

      toast.success(`SEO config for "${deleteTarget.page_path}" removed.`);
      setDeleteTarget(null);
      fetchPages();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete SEO page");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <Globe className="size-4" />
            Search Engine & Social Metadata
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-foreground">
            Page SEO & Meta Tags Manager
          </h1>
          <p className="mt-1 text-xs text-muted-foreground max-w-2xl">
            Customize page titles, meta descriptions, keywords, favicons, and social share cards (Open Graph / Twitter) for all public pages, menus, listings, and detail views.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleOpenAdd} className="h-9 gap-1.5 font-bold text-xs">
            <Plus className="size-4" />
            Add Page SEO
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Configured Pages</span>
            <FileText className="size-4 text-primary" />
          </div>
          <p className="mt-2 text-2xl font-bold">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground mt-1">SEO rules mapped</p>
        </Card>

        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Indexed Pages</span>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {stats.active_pages}
          </p>
          <p className="text-[10px] text-muted-foreground mt-1">Robots: index, follow</p>
        </Card>

        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Custom Social Cards</span>
            <Share2 className="size-4 text-indigo-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">{stats.with_social_card}</p>
          <p className="text-[10px] text-muted-foreground mt-1">OG / Twitter image configured</p>
        </Card>

        <Card className="p-4 border bg-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Custom Favicons</span>
            <Sparkles className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-bold">{stats.with_favicon}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Branded browser icons</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by page name, path, or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9 text-xs w-[180px]">
              <SelectValue placeholder="Filter Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Pages</SelectItem>
              <SelectItem value="MAIN_MENU">Main Menu Pages</SelectItem>
              <SelectItem value="LEGAL">Legal & Information</SelectItem>
              <SelectItem value="CUSTOM">Custom Created</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pages Table / Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <Loader2 className="size-8 animate-spin text-primary mb-3" />
          <p className="text-xs text-muted-foreground">Loading SEO configurations...</p>
        </div>
      ) : pages.length === 0 ? (
        <div className="rounded-xl border border-dashed p-12 text-center space-y-3">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
            <Globe className="size-6" />
          </div>
          <h3 className="font-bold text-sm">No Page SEO Configurations Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Click the button below to add SEO metadata for any route or public page.
          </p>
          <Button onClick={handleOpenAdd} size="sm" className="gap-1 text-xs font-bold">
            <Plus className="size-3.5" /> Add Page SEO
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pages.map((page) => (
            <Card
              key={page.id}
              className="flex flex-col justify-between border border-border/80 bg-card transition-all duration-200 hover:shadow-md hover:border-primary/40 overflow-hidden"
            >
              <CardHeader className="p-4 pb-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-[10px] font-mono font-bold bg-muted text-foreground">
                      {page.page_path}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[10px] ${
                        page.robots?.includes("noindex")
                          ? "border-destructive/40 text-destructive bg-destructive/5"
                          : "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5"
                      }`}
                    >
                      {page.robots || "index, follow"}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleOpenEdit(page)}
                      title="Edit SEO"
                    >
                      <Edit2 className="size-3.5 text-muted-foreground hover:text-primary" />
                    </Button>
                    {!page.is_default && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeleteTarget(page)}
                        title="Delete SEO"
                      >
                        <Trash2 className="size-3.5 text-muted-foreground hover:text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>

                <CardTitle className="text-sm font-bold text-foreground line-clamp-1">
                  {page.page_name}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-4 pt-0 space-y-3">
                {/* Search Snippet Preview Box */}
                <div className="p-3 rounded-xl border bg-muted/20 space-y-1">
                  <p className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                    <Globe className="size-3 text-primary shrink-0" />
                    https://edubird.in{page.page_path}
                  </p>
                  <p className="text-xs font-bold text-blue-600 dark:text-blue-400 line-clamp-1 hover:underline cursor-pointer">
                    {page.meta_title}
                  </p>
                  <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {page.meta_description || "No description provided."}
                  </p>
                </div>

                {/* Keywords & Social Preview chips */}
                <div className="space-y-1.5 text-xs">
                  {page.meta_keywords && (
                    <div className="flex items-center gap-1 text-muted-foreground text-[10px] truncate">
                      <Tag className="size-3 shrink-0 text-primary" />
                      <span className="truncate">{page.meta_keywords}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1">
                      <ImageIcon className="size-3 text-muted-foreground" />
                      Social Image: {page.og_image ? "Configured" : "Default"}
                    </span>
                    <span className="flex items-center gap-1">
                      <Sparkles className="size-3 text-amber-500" />
                      Favicon: {page.favicon_url ? "Custom" : "Site Default"}
                    </span>
                  </div>
                </div>

                {/* Action footer */}
                <div className="pt-2 border-t flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-muted-foreground">
                    Title: {page.meta_title.length} chars
                  </span>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(page)}
                    className="h-7 text-xs font-bold"
                  >
                    Edit Meta Tags
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Globe className="size-5 text-primary" />
              {editingRecord ? `Edit SEO: ${editingRecord.page_name}` : "Configure Page SEO & Meta Tags"}
            </DialogTitle>
            <DialogDescription>
              Set search engine tags, favicon, social card preview, and indexing directives.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Page Route & Friendly Name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="page-path" className="text-xs font-bold">
                  Page URL / Path *
                </Label>
                <Input
                  id="page-path"
                  placeholder="e.g. /courses, /about, /custom-landing"
                  value={form.page_path}
                  onChange={(e) => setForm({ ...form, page_path: e.target.value })}
                  disabled={Boolean(editingRecord?.is_default)}
                  className="h-9 text-xs font-mono"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="page-name" className="text-xs font-bold">
                  Friendly Page Name *
                </Label>
                <Input
                  id="page-name"
                  placeholder="e.g. Courses Marketplace"
                  value={form.page_name}
                  onChange={(e) => setForm({ ...form, page_name: e.target.value })}
                  className="h-9 text-xs"
                  required
                />
              </div>
            </div>

            {/* Live Google Search Preview Box */}
            <div className="p-3.5 rounded-xl border border-primary/20 bg-muted/20 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex items-center gap-1 text-primary">
                  <Eye className="size-3.5" /> Google Search Result Preview
                </span>
                <span>
                  {form.meta_title.length}/60 chars · {form.meta_description.length}/160 chars
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono truncate">
                https://edubird.in{form.page_path || "/example"}
              </p>
              <h4 className="text-sm font-bold text-blue-600 dark:text-blue-400 line-clamp-1">
                {form.meta_title || "Page Title Will Appear Here"}
              </h4>
              <p className="text-xs text-muted-foreground line-clamp-2">
                {form.meta_description || "Provide a compelling meta description summarizing the page content for search engine users."}
              </p>
            </div>

            {/* Meta Title */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="meta-title" className="text-xs font-bold">
                  Meta Title *
                </Label>
                <span
                  className={`text-[10px] font-mono ${
                    form.meta_title.length > 60 ? "text-amber-500 font-bold" : "text-muted-foreground"
                  }`}
                >
                  {form.meta_title.length}/60 chars (Recommended: 50–60)
                </span>
              </div>
              <Input
                id="meta-title"
                placeholder="e.g. Explore Verified Engineering & Medical Courses - EduBird"
                value={form.meta_title}
                onChange={(e) => setForm({ ...form, meta_title: e.target.value })}
                className="h-9 text-xs"
                required
              />
            </div>

            {/* Meta Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="meta-description" className="text-xs font-bold">
                  Meta Description
                </Label>
                <span
                  className={`text-[10px] font-mono ${
                    form.meta_description.length > 160 ? "text-amber-500 font-bold" : "text-muted-foreground"
                  }`}
                >
                  {form.meta_description.length}/160 chars (Recommended: 120–160)
                </span>
              </div>
              <Textarea
                id="meta-description"
                rows={2}
                placeholder="A concise summary of what users and search bots will find on this page..."
                value={form.meta_description}
                onChange={(e) => setForm({ ...form, meta_description: e.target.value })}
                className="text-xs resize-none"
              />
            </div>

            {/* Meta Keywords & Canonical */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="meta-keywords" className="text-xs font-bold">
                  Meta Keywords (Comma-separated)
                </Label>
                <Input
                  id="meta-keywords"
                  placeholder="e.g. courses, admission, coaching, tutors"
                  value={form.meta_keywords}
                  onChange={(e) => setForm({ ...form, meta_keywords: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="canonical-url" className="text-xs font-bold">
                  Canonical URL (Optional)
                </Label>
                <Input
                  id="canonical-url"
                  placeholder="https://edubird.in/courses"
                  value={form.canonical_url}
                  onChange={(e) => setForm({ ...form, canonical_url: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Social Share Card (Open Graph & Twitter) Image */}
            <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                <Share2 className="size-4 text-primary" /> Social Share Card (Open Graph & Twitter)
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="og-title" className="text-xs font-bold">
                    Social Card Title (OG Title)
                  </Label>
                  <Input
                    id="og-title"
                    placeholder="Defaults to Meta Title if blank"
                    value={form.og_title}
                    onChange={(e) => setForm({ ...form, og_title: e.target.value })}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Twitter Card Type</Label>
                  <Select
                    value={form.twitter_card}
                    onValueChange={(val) => setForm({ ...form, twitter_card: val })}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="summary_large_image">Summary with Large Image</SelectItem>
                      <SelectItem value="summary">Standard Summary</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Social Share Banner Image (1200x630 px)</Label>
                <DocumentFileUpload
                  accessToken={accessToken}
                  files={
                    form.og_image
                      ? [
                          {
                            url: form.og_image,
                            publicId: "og-1",
                            resourceType: "image",
                            fileType: "image/*",
                            name: "Social Share Card",
                          },
                        ]
                      : []
                  }
                  onFilesChange={(files) => {
                    setForm({
                      ...form,
                      og_image: files[0]?.url || "",
                      twitter_image: files[0]?.url || "",
                    });
                  }}
                  maxFiles={1}
                  maxSize={5 * 1024 * 1024}
                  compact
                  buttonLabel="Upload Social Banner"
                  emptyText="Drop 1200x630 social banner or click to browse"
                />

                <Input
                  type="text"
                  placeholder="Or paste direct image URL (https://...)"
                  value={form.og_image}
                  onChange={(e) => setForm({ ...form, og_image: e.target.value, twitter_image: e.target.value })}
                  className="h-8 text-xs bg-background mt-1"
                />
              </div>
            </div>

            {/* Favicon & Robots Directive */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 rounded-xl border bg-muted/20">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center justify-between">
                  <span>Custom Favicon (.ico / .png / .svg)</span>
                  {form.favicon_url && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      Favicon Set
                    </span>
                  )}
                </Label>
                <DocumentFileUpload
                  accessToken={accessToken}
                  files={
                    form.favicon_url
                      ? [
                          {
                            url: form.favicon_url,
                            publicId: "fav-1",
                            resourceType: "image",
                            fileType: "image/*",
                            name: "Page Favicon",
                          },
                        ]
                      : []
                  }
                  onFilesChange={(files) => {
                    setForm({
                      ...form,
                      favicon_url: files[0]?.url || "",
                    });
                  }}
                  maxFiles={1}
                  maxSize={2 * 1024 * 1024}
                  compact
                  buttonLabel="Upload Favicon"
                  emptyText="Upload .ico, .png, or .svg favicon"
                />
                <Input
                  id="favicon-url"
                  placeholder="Or paste direct favicon path (/favicon.ico or https://...)"
                  value={form.favicon_url}
                  onChange={(e) => setForm({ ...form, favicon_url: e.target.value })}
                  className="h-8 text-xs bg-background mt-1"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Search Bot Robots Directive</Label>
                <Select
                  value={form.robots}
                  onValueChange={(val) => setForm({ ...form, robots: val })}
                >
                  <SelectTrigger className="h-9 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="index, follow">Index, Follow (Recommended)</SelectItem>
                    <SelectItem value="noindex, follow">No-Index, Follow</SelectItem>
                    <SelectItem value="noindex, nofollow">No-Index, No-Follow (Private)</SelectItem>
                    <SelectItem value="index, nofollow">Index, No-Follow</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Controls whether search engines index this page and follow its links.
                </p>
              </div>
            </div>

            {/* Status active */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Checkbox
                id="is-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked === true })}
              />
              <Label htmlFor="is-active" className="text-xs font-medium cursor-pointer">
                Active SEO metadata rule
              </Label>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="text-xs h-9 font-bold">
                {saving && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
                {editingRecord ? "Save Changes" : "Create SEO Rule"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="size-5" /> Delete Page SEO Configuration
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the custom SEO configuration for <strong>"{deleteTarget?.page_path}"</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="size-4 animate-spin mr-1.5" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
