"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { toast } from "sonner";
import {
  Edit,
  ExternalLink,
  Eye,
  Globe,
  Layers,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";

export const PRESET_PAGES = [
  { path: "/", name: "Platform Home Page" },
  { path: "/courses", name: "Courses & Programs Catalog" },
  { path: "/exams", name: "Exams & Entrance Tests" },
  { path: "/institutions", name: "Institution Directory" },
  { path: "/pricing", name: "Pricing & Plans" },
  { path: "/contact", name: "Contact & Branches Page" },
  { path: "/blog", name: "Blogs & Articles" },
];

export type SeoTag = {
  id: number;
  page_path: string;
  meta_title: string;
  meta_description: string | null;
  keywords: string[];
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  canonical_url: string | null;
  robots_directive: string;
  updated_at: string;
};

export default function SeoManagementPage() {
  const { accessToken } = useAuthStore();
  const [tags, setTags] = useState<SeoTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<SeoTag | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formPath, setFormPath] = useState("/");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formKeywords, setFormKeywords] = useState("");
  const [formOgTitle, setFormOgTitle] = useState("");
  const [formOgDesc, setFormOgDesc] = useState("");
  const [formOgImage, setFormOgImage] = useState("");
  const [formCanonical, setFormCanonical] = useState("");
  const [formRobots, setFormRobots] = useState("index, follow");

  const fetchTags = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/seo");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load SEO tags");
      setTags(data.tags || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch SEO tags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const handleOpenAdd = () => {
    setEditingTag(null);
    setFormPath("/");
    setFormTitle("EduBird - India's Leading Multi-Tenant Education & LMS Platform");
    setFormDesc("Explore top CBSE, ICSE, University programs, online admissions, practice exams, and comprehensive institution management.");
    setFormKeywords("education, courses, admission, cbse, icse, mock tests, edubird");
    setFormOgTitle("EduBird - Education Simplified");
    setFormOgDesc("Explore top programs, admissions, and verified certifications.");
    setFormOgImage("/images/og-default.png");
    setFormCanonical("https://edubird.com");
    setFormRobots("index, follow");
    setDialogOpen(true);
  };

  const handleOpenEdit = (t: SeoTag) => {
    setEditingTag(t);
    setFormPath(t.page_path);
    setFormTitle(t.meta_title);
    setFormDesc(t.meta_description || "");
    setFormKeywords(Array.isArray(t.keywords) ? t.keywords.join(", ") : "");
    setFormOgTitle(t.og_title || t.meta_title);
    setFormOgDesc(t.og_description || t.meta_description || "");
    setFormOgImage(t.og_image || "");
    setFormCanonical(t.canonical_url || "");
    setFormRobots(t.robots_directive || "index, follow");
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPath.trim() || !formTitle.trim()) {
      toast.error("Please provide Page Path and Meta Title");
      return;
    }

    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/seo", {
        method: "POST",
        headers,
        body: JSON.stringify({
          page_path: formPath.trim(),
          meta_title: formTitle.trim(),
          meta_description: formDesc.trim() || null,
          keywords: formKeywords.split(",").map((k) => k.trim()).filter(Boolean),
          og_title: formOgTitle.trim() || formTitle.trim(),
          og_description: formOgDesc.trim() || formDesc.trim() || null,
          og_image: formOgImage.trim() || null,
          canonical_url: formCanonical.trim() || null,
          robots_directive: formRobots,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save SEO tags");

      toast.success("SEO Meta Tags configured successfully!");
      setDialogOpen(false);
      fetchTags();
    } catch (err: any) {
      toast.error(err.message || "Failed to save SEO meta tags");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove these SEO tags?")) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/seo?id=${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        toast.success("SEO config deleted");
        fetchTags();
      }
    } catch {
      toast.error("Failed to delete SEO config");
    }
  };

  const filteredTags = tags.filter(
    (t) =>
      t.page_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.meta_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <Globe className="w-4 h-4" />
            <span>Search Engine Optimization & Social Previews</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">SEO & Meta Tags Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure dynamic title tags, meta descriptions, OpenGraph social preview cards, keywords, and robots indexing per route.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchTags} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md gap-1.5">
            <Plus className="w-4 h-4" /> Add Page SEO Config
          </Button>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search page route or title..."
          className="pl-9 text-xs rounded-xl"
        />
      </div>

      {/* SEO Tags Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
          <span className="text-sm font-medium text-muted-foreground">Loading SEO meta configurations...</span>
        </div>
      ) : filteredTags.length === 0 ? (
        <div className="text-center py-20 border rounded-3xl bg-muted/10 space-y-3">
          <Globe className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-lg font-bold text-foreground">No SEO tags configured yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Configure meta titles and descriptions for key routes like Home, Courses catalog, and Exams.
          </p>
          <Button onClick={handleOpenAdd} size="sm" className="mt-2 font-bold">
            <Plus className="w-4 h-4 mr-1.5" /> Setup Route SEO
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTags.map((tag) => (
            <Card
              key={tag.id}
              className="rounded-2xl border border-border/80 hover:border-primary/50 transition-all shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden"
            >
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <Badge variant="outline" className="text-xs font-mono font-bold text-primary bg-primary/5 border-primary/20">
                      {tag.page_path}
                    </Badge>
                    <CardTitle className="text-base font-bold leading-snug line-clamp-2">{tag.meta_title}</CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-3 text-xs">
                {/* Google Search Snippet Simulation */}
                <div className="p-3 bg-muted/30 rounded-xl border border-border/60 space-y-1">
                  <div className="text-[10px] text-muted-foreground font-mono truncate">
                    https://edubird.com{tag.page_path}
                  </div>
                  <div className="text-xs font-bold text-blue-600 dark:text-blue-400 line-clamp-1">
                    {tag.meta_title}
                  </div>
                  <div className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                    {tag.meta_description || "No description provided."}
                  </div>
                </div>

                {tag.keywords && tag.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {tag.keywords.slice(0, 4).map((kw, i) => (
                      <Badge key={i} variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                        #{kw}
                      </Badge>
                    ))}
                    {tag.keywords.length > 4 && (
                      <span className="text-[10px] text-muted-foreground">+{tag.keywords.length - 4} more</span>
                    )}
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-4 bg-muted/20 border-t flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-[10px] font-mono">
                  🤖 {tag.robots_directive}
                </Badge>

                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(tag)} className="h-8 text-xs font-semibold">
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(tag.id)} className="h-8 text-xs text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* SEO Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingTag ? "Edit SEO Meta Tags" : "Add Page SEO Configuration"}</DialogTitle>
              <DialogDescription>
                Define search engine tags, OpenGraph social sharing meta, and indexing directives.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="seo-path">Target Route / Page Path *</Label>
                <div className="flex gap-2">
                  <Input
                    id="seo-path"
                    value={formPath}
                    onChange={(e) => setFormPath(e.target.value)}
                    placeholder="e.g. /courses or /exams"
                    required
                  />
                  <Select value={formPath} onValueChange={setFormPath}>
                    <SelectTrigger className="w-40 shrink-0">
                      <SelectValue placeholder="Preset Pages" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRESET_PAGES.map((p) => (
                        <SelectItem key={p.path} value={p.path}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="seo-title">Page Meta Title *</Label>
                <Input
                  id="seo-title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Explore Top Academic Courses | EduBird"
                  required
                />
                <span className="text-[10px] text-muted-foreground">{formTitle.length} / 60 recommended characters</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="seo-desc">Meta Description</Label>
                <Textarea
                  id="seo-desc"
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Summary snippet displayed on Google search results..."
                />
                <span className="text-[10px] text-muted-foreground">{formDesc.length} / 160 recommended characters</span>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="seo-kw">Keywords (Comma-separated)</Label>
                <Input
                  id="seo-kw"
                  value={formKeywords}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  placeholder="courses, admissions, coaching, mock exams"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-1.5">
                  <Label htmlFor="seo-ogtitle">OpenGraph Social Title</Label>
                  <Input
                    id="seo-ogtitle"
                    value={formOgTitle}
                    onChange={(e) => setFormOgTitle(e.target.value)}
                    placeholder="Social share title"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="seo-ogimg">Social Share Image URL</Label>
                  <Input
                    id="seo-ogimg"
                    value={formOgImage}
                    onChange={(e) => setFormOgImage(e.target.value)}
                    placeholder="https://.../og-banner.png"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="seo-canon">Canonical URL</Label>
                  <Input
                    id="seo-canon"
                    value={formCanonical}
                    onChange={(e) => setFormCanonical(e.target.value)}
                    placeholder="https://edubird.com/courses"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="seo-robots">Robots Indexing</Label>
                  <Select value={formRobots} onValueChange={setFormRobots}>
                    <SelectTrigger id="seo-robots">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="index, follow">index, follow (Allow Indexing)</SelectItem>
                      <SelectItem value="noindex, follow">noindex, follow (Hide from Google)</SelectItem>
                      <SelectItem value="noindex, nofollow">noindex, nofollow (Complete Disallow)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                {editingTag ? "Update SEO Tags" : "Save SEO Config"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
