"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  FileText,
  Plus,
  Search,
  Sparkles,
  Calendar,
  Eye,
  Edit3,
  Trash2,
  ExternalLink,
  CheckCircle2,
  Clock,
  Tag,
  Image as ImageIcon,
  Building2,
  User,
  Layers,
  Star,
  RefreshCw,
  Globe,
  Share2,
  Check,
  Video,
  FileCode,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useAuthStore } from "@/store";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { getStoredActiveInstitutionId } from "@/lib/auth/active-institution";

const RichTextEditor = dynamic(
  () => import("@/components/editor/rich-text-editor").then((mod) => mod.RichTextEditor),
  { ssr: false, loading: () => <div className="h-64 flex items-center justify-center border rounded-lg bg-muted/20 text-xs text-muted-foreground">Loading WordPress-style editor...</div> }
);

export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  category: string;
  summary: string | null;
  content: any;
  content_html: string | null;
  cover_image: string | null;
  video_url: string | null;
  tags: string | null;
  status: "draft" | "review" | "published";
  is_featured: boolean;
  read_time_mins: number;
  views_count: number;
  author_name: string | null;
  author_role: string | null;
  author_avatar: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_keywords: string | null;
  canonical_url: string | null;
  institution_id: number | null;
  institution_name: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
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

const SAMPLE_COVERS = [
  "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=1200&q=80",
];

export default function AdminBlogStudioPage() {
  const { user } = useAuthStore();
  const isPlatform = isPlatformAdminUser(user);

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Editor Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("content");
  const [saving, setSaving] = useState(false);

  // Delete Alert State
  const [deletePostId, setDeletePostId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    category: "Academic & Curriculum",
    summary: "",
    contentHtml: "",
    coverImage: "",
    videoUrl: "",
    tags: "",
    status: "published" as "draft" | "review" | "published",
    isFeatured: false,
    readTimeMins: 5,
    authorName: "",
    authorRole: "Educational Contributor",
    authorAvatar: "",
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    canonicalUrl: "",
    institutionId: null as number | null,
  });

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/content/blog", {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (res.ok) {
        const json = await res.json();
        setPosts(json.data || []);
      } else {
        toast.error("Failed to load blog posts");
      }
    } catch (err) {
      console.error("Error fetching blogs:", err);
      toast.error("Error loading blog posts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPosts();
  }, [fetchPosts]);

  const openNewArticleModal = () => {
    const activeInstId = getStoredActiveInstitutionId();
    setEditingPostId(null);
    setFormData({
      title: "",
      slug: "",
      category: "Academic & Curriculum",
      summary: "",
      contentHtml: `<h2>Introduction</h2><p>Start writing your educational article here...</p><h3>Key Highlights</h3><ul><li>Important topic point 1</li><li>Important topic point 2</li></ul>`,
      coverImage: SAMPLE_COVERS[Math.floor(Math.random() * SAMPLE_COVERS.length)],
      videoUrl: "",
      tags: "Education, Campus, Guide",
      status: "published",
      isFeatured: false,
      readTimeMins: 5,
      authorName: user?.full_name || "EduBird Faculty",
      authorRole: "Academic Specialist",
      authorAvatar: "",
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      canonicalUrl: "",
      institutionId: isPlatform ? null : (activeInstId || null),
    });
    setActiveTab("content");
    setEditorOpen(true);
  };

  const openEditArticleModal = (post: BlogPost) => {
    setEditingPostId(post.id);
    setFormData({
      title: post.title || "",
      slug: post.slug || "",
      category: post.category || "Academic & Curriculum",
      summary: post.summary || "",
      contentHtml: post.content_html || "",
      coverImage: post.cover_image || "",
      videoUrl: post.video_url || "",
      tags: post.tags || "",
      status: post.status || "published",
      isFeatured: Boolean(post.is_featured),
      readTimeMins: post.read_time_mins || 5,
      authorName: post.author_name || user?.full_name || "EduBird Faculty",
      authorRole: post.author_role || "Academic Specialist",
      authorAvatar: post.author_avatar || "",
      metaTitle: post.meta_title || "",
      metaDescription: post.meta_description || "",
      metaKeywords: post.meta_keywords || "",
      canonicalUrl: post.canonical_url || "",
      institutionId: post.institution_id,
    });
    setActiveTab("content");
    setEditorOpen(true);
  };

  const handleTitleChange = (val: string) => {
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");

    setFormData((prev) => ({
      ...prev,
      title: val,
      slug: prev.slug && editingPostId ? prev.slug : autoSlug,
      metaTitle: prev.metaTitle ? prev.metaTitle : val,
    }));
  };

  const handleSaveArticle = async () => {
    if (!formData.title.trim()) {
      toast.error("Please enter an article title.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: formData.title.trim(),
        slug: formData.slug.trim(),
        category: formData.category,
        summary: formData.summary.trim(),
        content_html: formData.contentHtml,
        cover_image: formData.coverImage.trim(),
        video_url: formData.videoUrl.trim(),
        tags: formData.tags.trim(),
        status: formData.status,
        is_featured: formData.isFeatured,
        read_time_mins: formData.readTimeMins,
        author_name: formData.authorName.trim(),
        author_role: formData.authorRole.trim(),
        author_avatar: formData.authorAvatar.trim(),
        meta_title: formData.metaTitle.trim(),
        meta_description: formData.metaDescription.trim(),
        meta_keywords: formData.metaKeywords.trim(),
        canonical_url: formData.canonicalUrl.trim(),
        institution_id: formData.institutionId,
      };

      const url = editingPostId
        ? `/api/admin/content/blog/${editingPostId}`
        : `/api/admin/content/blog`;
      const method = editingPostId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to save article");
      }

      toast.success(editingPostId ? "Article updated successfully!" : "Article published successfully!");
      setEditorOpen(false);
      void fetchPosts();
    } catch (err: any) {
      console.error("Save blog error:", err);
      toast.error(err.message || "Failed to save article");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteArticle = async () => {
    if (!deletePostId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/content/blog/${deletePostId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to delete article");
      }

      toast.success("Article deleted successfully");
      setDeletePostId(null);
      void fetchPosts();
    } catch (err: any) {
      toast.error(err.message || "Could not delete article");
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleFeatured = async (post: BlogPost) => {
    try {
      const res = await fetch(`/api/admin/content/blog/${post.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_featured: !post.is_featured }),
      });
      if (res.ok) {
        toast.success(post.is_featured ? "Removed from featured" : "Marked as featured article");
        void fetchPosts();
      }
    } catch {
      toast.error("Failed to update status");
    }
  };

  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      post.title.toLowerCase().includes(search.toLowerCase()) ||
      (post.summary && post.summary.toLowerCase().includes(search.toLowerCase())) ||
      (post.tags && post.tags.toLowerCase().includes(search.toLowerCase())) ||
      (post.author_name && post.author_name.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = selectedCategory === "all" || post.category === selectedCategory;
    const matchesStatus = selectedStatus === "all" || post.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalPublished = posts.filter((p) => p.status === "published").length;
  const totalDrafts = posts.filter((p) => p.status === "draft").length;
  const totalViews = posts.reduce((acc, p) => acc + (p.views_count || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <h1 className="text-2xl font-black text-foreground tracking-tight">
              WordPress & Blog CMS Studio
            </h1>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Create, format, and publish SEO-optimized articles, campus updates, and academic guides.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchPosts()}
            className="text-xs font-bold gap-1.5 rounded-xl cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="text-xs font-bold gap-1.5 rounded-xl cursor-pointer border-primary/40 text-primary hover:bg-primary/5"
          >
            <Link href="/blogs" target="_blank">
              <ExternalLink className="h-3.5 w-3.5" />
              View Public Blog
            </Link>
          </Button>

          <Button
            size="sm"
            onClick={openNewArticleModal}
            className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl cursor-pointer shadow-xs"
          >
            <Plus className="h-4 w-4" />
            New Article
          </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border-border/80 bg-card/60 shadow-2xs">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Total Articles
          </p>
          <p className="text-2xl font-black text-foreground mt-1">{posts.length}</p>
        </Card>
        <Card className="p-4 border-border/80 bg-card/60 shadow-2xs">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
            Published
          </p>
          <p className="text-2xl font-black text-foreground mt-1">{totalPublished}</p>
        </Card>
        <Card className="p-4 border-border/80 bg-card/60 shadow-2xs">
          <p className="text-[11px] font-bold text-amber-600 uppercase tracking-wider">
            Drafts & Review
          </p>
          <p className="text-2xl font-black text-foreground mt-1">{totalDrafts}</p>
        </Card>
        <Card className="p-4 border-border/80 bg-card/60 shadow-2xs">
          <p className="text-[11px] font-bold text-primary uppercase tracking-wider">
            Total Article Views
          </p>
          <p className="text-2xl font-black text-foreground mt-1">{totalViews}</p>
        </Card>
      </div>

      {/* Filter Toolbar */}
      <Card className="p-4 border-border/80 bg-card">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles by title, tag, or author..."
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px] text-xs h-9">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {BLOG_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[130px] text-xs h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="review">Review</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Articles Table */}
      <Card className="border-border/80 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-muted-foreground font-bold">
                <th className="p-3.5 pl-4">Article</th>
                <th className="p-3.5">Category & Tags</th>
                <th className="p-3.5">Author</th>
                <th className="p-3.5">Scope / Institute</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Views</th>
                <th className="p-3.5 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    Loading articles...
                  </td>
                </tr>
              ) : filteredPosts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    No articles found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-muted/20 transition-colors">
                    <td className="p-3.5 pl-4 max-w-[300px]">
                      <div className="flex items-center gap-3">
                        {post.cover_image ? (
                          <img
                            src={post.cover_image}
                            alt=""
                            className="h-11 w-16 object-cover rounded-lg border border-border shrink-0 bg-muted"
                          />
                        ) : (
                          <div className="h-11 w-16 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                            <ImageIcon className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            {post.is_featured && (
                              <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[9px] px-1 py-0 font-extrabold">
                                Featured
                              </Badge>
                            )}
                            <span className="font-bold text-foreground text-xs truncate block">
                              {post.title}
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                            /{post.slug}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {post.category || "General"}
                        </Badge>
                        {post.tags && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[150px]">
                            #{post.tags}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                          {(post.author_name || "A").slice(0, 1).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground text-xs truncate">
                            {post.author_name || "EduBird Editor"}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {post.author_role || "Contributor"}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="p-3.5">
                      {post.institution_name ? (
                        <span className="flex items-center gap-1 text-[11px] font-medium text-foreground truncate max-w-[140px]">
                          <Building2 className="h-3 w-3 text-primary shrink-0" />
                          {post.institution_name}
                        </span>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Platform Global
                        </Badge>
                      )}
                    </td>

                    <td className="p-3.5 text-center">
                      <Badge
                        className={`text-[10px] font-bold ${
                          post.status === "published"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : post.status === "review"
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : "bg-zinc-500/10 text-zinc-600 border-zinc-500/20"
                        }`}
                      >
                        {post.status.toUpperCase()}
                      </Badge>
                    </td>

                    <td className="p-3.5 text-center font-semibold text-muted-foreground">
                      {post.views_count || 0}
                    </td>

                    <td className="p-3.5 text-right pr-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleFeatured(post)}
                          title="Toggle Featured"
                          className={`h-7 w-7 cursor-pointer ${
                            post.is_featured ? "text-amber-500 hover:text-amber-600" : "text-muted-foreground hover:text-amber-500"
                          }`}
                        >
                          <Star className={`h-3.5 w-3.5 ${post.is_featured ? "fill-amber-400" : ""}`} />
                        </Button>

                        <Button
                          asChild
                          variant="ghost"
                          size="icon"
                          title="View Live Article"
                          className="h-7 w-7 text-muted-foreground hover:text-primary cursor-pointer"
                        >
                          <Link href={`/blogs/${post.slug || post.id}`} target="_blank">
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditArticleModal(post)}
                          title="Edit Article"
                          className="h-7 w-7 text-muted-foreground hover:text-primary cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeletePostId(post.id)}
                          title="Delete Article"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* WordPress-Style Full Article Studio Modal */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          <div className="p-6 border-b border-border/80 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-xs z-10">
            <div>
              <DialogTitle className="text-xl font-black text-foreground">
                {editingPostId ? "Edit Article" : "Write & Publish Article"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                WordPress-style rich content formatting, author profiling, and SEO configuration.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditorOpen(false)}
                className="text-xs font-bold rounded-xl"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={saving}
                onClick={handleSaveArticle}
                className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl"
              >
                <Check className="h-4 w-4" />
                {saving ? "Saving..." : editingPostId ? "Save Changes" : "Publish Article"}
              </Button>
            </div>
          </div>

          <div className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
              <TabsList className="grid grid-cols-3 w-full max-w-md h-9 p-1 bg-muted/60">
                <TabsTrigger value="content" className="text-xs font-bold">
                  Content & Media
                </TabsTrigger>
                <TabsTrigger value="publishing" className="text-xs font-bold">
                  Author & Scope
                </TabsTrigger>
                <TabsTrigger value="seo" className="text-xs font-bold">
                  SEO & Social
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: CONTENT & MEDIA */}
              <TabsContent value="content" className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Article Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Master Data Structures and Algorithms for Engineering Placements"
                    className="text-sm font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">URL Slug</Label>
                    <Input
                      value={formData.slug}
                      onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="master-data-structures-and-algorithms"
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Category</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(val) => setFormData((prev) => ({ ...prev, category: val }))}
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {BLOG_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Short Summary / Excerpt</Label>
                  <Textarea
                    rows={2}
                    value={formData.summary}
                    onChange={(e) => setFormData((prev) => ({ ...prev, summary: e.target.value }))}
                    placeholder="Brief 1-2 sentence overview of the article shown on cards and search results..."
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Featured Cover Image URL</Label>
                    <Input
                      value={formData.coverImage}
                      onChange={(e) => setFormData((prev) => ({ ...prev, coverImage: e.target.value }))}
                      placeholder="https://images.unsplash.com/..."
                      className="text-xs"
                    />
                    <div className="flex gap-1.5 pt-1 overflow-x-auto">
                      {SAMPLE_COVERS.map((sample, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setFormData((prev) => ({ ...prev, coverImage: sample }))}
                          className="h-7 w-12 rounded border overflow-hidden shrink-0 hover:ring-2 hover:ring-primary"
                        >
                          <img src={sample} alt="" className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Video URL (Optional YouTube / Vimeo)</Label>
                    <Input
                      value={formData.videoUrl}
                      onChange={(e) => setFormData((prev) => ({ ...prev, videoUrl: e.target.value }))}
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Article Body & Rich Content *</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Use rich HTML formatting or paragraphs, headings, bullet lists, blockquotes, and code snippets.
                  </p>
                  <Textarea
                    rows={12}
                    value={formData.contentHtml}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contentHtml: e.target.value }))}
                    placeholder="<h2>Main Heading</h2><p>Write your article here...</p>"
                    className="font-mono text-xs leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Article Tags (Comma-separated)</Label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                    placeholder="Tech, Career, BCA, Coding, Placements"
                    className="text-xs"
                  />
                </div>
              </TabsContent>

              {/* TAB 2: AUTHOR & PUBLISHING */}
              <TabsContent value="publishing" className="space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Author Name</Label>
                    <Input
                      value={formData.authorName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, authorName: e.target.value }))}
                      placeholder="e.g. Dr. Ramesh Gupta"
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Author Role / Designation</Label>
                    <Input
                      value={formData.authorRole}
                      onChange={(e) => setFormData((prev) => ({ ...prev, authorRole: e.target.value }))}
                      placeholder="e.g. Dean of Computer Science"
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Author Avatar URL</Label>
                    <Input
                      value={formData.authorAvatar}
                      onChange={(e) => setFormData((prev) => ({ ...prev, authorAvatar: e.target.value }))}
                      placeholder="https://..."
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Estimated Reading Time (Minutes)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={formData.readTimeMins}
                      onChange={(e) => setFormData((prev) => ({ ...prev, readTimeMins: parseInt(e.target.value, 10) || 5 }))}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Publishing Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(val: any) => setFormData((prev) => ({ ...prev, status: val }))}
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="published">Published (Live to Everyone)</SelectItem>
                        <SelectItem value="draft">Draft (Private to Authors)</SelectItem>
                        <SelectItem value="review">Under Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-center">
                    <Label className="text-xs font-bold mb-2">Featured Showcase</Label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={formData.isFeatured}
                        onChange={(e) => setFormData((prev) => ({ ...prev, isFeatured: e.target.checked }))}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      <span>Pin to Top as Hero Featured Article</span>
                    </label>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: SEO & SOCIAL */}
              <TabsContent value="seo" className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">SEO Meta Title</Label>
                    <span className="text-[10px] text-muted-foreground">
                      {formData.metaTitle.length}/60 recommended
                    </span>
                  </div>
                  <Input
                    value={formData.metaTitle}
                    onChange={(e) => setFormData((prev) => ({ ...prev, metaTitle: e.target.value }))}
                    placeholder="Catchy SEO title for Google search results..."
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">SEO Meta Description</Label>
                    <span className="text-[10px] text-muted-foreground">
                      {formData.metaDescription.length}/160 recommended
                    </span>
                  </div>
                  <Textarea
                    rows={3}
                    value={formData.metaDescription}
                    onChange={(e) => setFormData((prev) => ({ ...prev, metaDescription: e.target.value }))}
                    placeholder="Search snippet summary that entices users to click on search engine listings..."
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">SEO Meta Keywords</Label>
                  <Input
                    value={formData.metaKeywords}
                    onChange={(e) => setFormData((prev) => ({ ...prev, metaKeywords: e.target.value }))}
                    placeholder="engineering admissions, BCA syllabus, career guide"
                    className="text-xs"
                  />
                </div>

                {/* Google Search Result Live Preview Snippet */}
                <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-1.5">
                  <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                    Google Search Result Live Preview
                  </p>
                  <p className="text-xs text-emerald-700 font-mono truncate">
                    https://edubird.org/blogs/{formData.slug || "article-slug"}
                  </p>
                  <p className="text-sm font-bold text-blue-700 hover:underline cursor-pointer">
                    {formData.metaTitle || formData.title || "Your Article Title"}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {formData.metaDescription ||
                      formData.summary ||
                      "Your meta description summary will appear here on search results."}
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={Boolean(deletePostId)} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this article?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action cannot be undone. The article and its associated comments will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs font-bold">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteArticle}
              disabled={deleting}
              className="text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? "Deleting..." : "Delete Article"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
