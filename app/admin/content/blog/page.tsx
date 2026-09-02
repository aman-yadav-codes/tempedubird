"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  Upload,
  Loader2,
  FolderPlus,
  X,
  Play,
  Film,
  Camera,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

export type BlogPost = {
  id: number;
  slug: string;
  title: string;
  category: string;
  sub_category?: string | null;
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

export type BlogCategoryItem = {
  id: number;
  name: string;
  slug: string;
  subcategories: { id: number; name: string; slug: string }[];
};

const DEFAULT_CATEGORIES: BlogCategoryItem[] = [
  {
    id: 1,
    name: "Academic & Curriculum",
    slug: "academic-curriculum",
    subcategories: [
      { id: 101, name: "Computer Science & IT", slug: "computer-science-it" },
      { id: 102, name: "Engineering & Technology", slug: "engineering-technology" },
      { id: 103, name: "Management & Business", slug: "management-business" },
      { id: 104, name: "Medical & Healthcare", slug: "medical-healthcare" },
    ],
  },
  {
    id: 2,
    name: "Admissions & Counseling",
    slug: "admissions-counseling",
    subcategories: [
      { id: 201, name: "UG Admissions 2026", slug: "ug-admissions-2026" },
      { id: 202, name: "PG & Masters Guidance", slug: "pg-masters-guidance" },
      { id: 203, name: "Counseling Rounds & Seat Allotment", slug: "counseling-rounds" },
    ],
  },
  {
    id: 3,
    name: "Campus Life & Culture",
    slug: "campus-life-culture",
    subcategories: [
      { id: 301, name: "Hostel & Residential Life", slug: "hostel-residential-life" },
      { id: 302, name: "Student Clubs & Fests", slug: "student-clubs-fests" },
    ],
  },
  {
    id: 4,
    name: "Exams, Cutoffs & Results",
    slug: "exams-cutoffs-results",
    subcategories: [
      { id: 401, name: "JEE & Engineering Entrance", slug: "jee-engineering-entrance" },
      { id: 402, name: "NEET & Medical Tests", slug: "neet-medical-tests" },
      { id: 403, name: "CAT / MBA Exams", slug: "cat-mba-exams" },
    ],
  },
  {
    id: 5,
    name: "Placements & Career",
    slug: "placements-career",
    subcategories: [
      { id: 501, name: "Internships & Traineeships", slug: "internships-traineeships" },
      { id: 502, name: "Resume & Interview Prep", slug: "resume-interview-prep" },
      { id: 503, name: "Salary Insights & Tech Hiring", slug: "salary-insights" },
    ],
  },
  {
    id: 6,
    name: "Scholarships & Financial Aid",
    slug: "scholarships-financial-aid",
    subcategories: [],
  },
  {
    id: 7,
    name: "Student Activities & Sports",
    slug: "student-activities-sports",
    subcategories: [],
  },
  {
    id: 8,
    name: "Technology & Innovation",
    slug: "technology-innovation",
    subcategories: [
      { id: 801, name: "Artificial Intelligence & ML", slug: "ai-ml" },
      { id: 802, name: "Full Stack Development", slug: "fullstack-dev" },
    ],
  },
  {
    id: 9,
    name: "Announcements & Notices",
    slug: "announcements-notices",
    subcategories: [],
  },
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
  const [categories, setCategories] = useState<BlogCategoryItem[]>(DEFAULT_CATEGORIES);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Editor Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("content");
  const [saving, setSaving] = useState(false);

  // Upload States
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBodyImage, setUploadingBodyImage] = useState(false);

  // Add Category Modal State
  const [addCatModalOpen, setAddCatModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryParentId, setNewCategoryParentId] = useState<string>("none");
  const [addingCategory, setAddingCategory] = useState(false);

  // Delete Alert State
  const [deletePostId, setDeletePostId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    category: "Academic & Curriculum",
    subCategory: "",
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

  // Hidden File Input Refs
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const videoFileInputRef = useRef<HTMLInputElement>(null);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const bodyImageInputRef = useRef<HTMLInputElement>(null);

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/content/blog/categories");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.data) && json.data.length > 0) {
          setCategories(json.data);
        }
      }
    } catch (err) {
      console.error("Error fetching categories:", err);
    }
  }, []);

  // Fetch Posts
  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/content/blog", {
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        const json = await res.json();
        setPosts(json.data || []);
      } else {
        toast.error("Failed to load blog articles");
      }
    } catch (err) {
      console.error("Error fetching blogs:", err);
      toast.error("Error loading blog articles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPosts();
    void fetchCategories();
  }, [fetchPosts, fetchCategories]);

  // Upload Handler to /api/admin/uploads/image
  const uploadMediaFile = async (
    file: File,
    folder: string = "program_media"
  ): Promise<string | null> => {
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder);

      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        body: form,
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "File upload failed");
      }
      return json.data?.url || null;
    } catch (err: any) {
      toast.error(err?.message || "Failed to upload file");
      return null;
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCover(true);
    const url = await uploadMediaFile(file, "program_media");
    if (url) {
      setFormData((prev) => ({ ...prev, coverImage: url }));
      toast.success("Cover image uploaded successfully!");
    }
    setUploadingCover(false);
    e.target.value = "";
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    const url = await uploadMediaFile(file, "program_media");
    if (url) {
      setFormData((prev) => ({ ...prev, videoUrl: url }));
      toast.success("Video uploaded successfully!");
    }
    setUploadingVideo(false);
    e.target.value = "";
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const url = await uploadMediaFile(file, "program_media");
    if (url) {
      setFormData((prev) => ({ ...prev, authorAvatar: url }));
      toast.success("Author avatar uploaded successfully!");
    }
    setUploadingAvatar(false);
    e.target.value = "";
  };

  const handleInsertBodyImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBodyImage(true);
    const url = await uploadMediaFile(file, "program_media");
    if (url) {
      const imgTag = `\n<figure class="my-6">\n  <img src="${url}" alt="Article image" class="rounded-xl border w-full max-h-[500px] object-cover" />\n</figure>\n`;
      setFormData((prev) => ({
        ...prev,
        contentHtml: (prev.contentHtml || "") + imgTag,
      }));
      toast.success("Image uploaded and inserted into article body!");
    }
    setUploadingBodyImage(false);
    e.target.value = "";
  };

  const handleAddCategorySubmit = async () => {
    if (!newCategoryName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    try {
      setAddingCategory(true);
      const payload: any = {
        name: newCategoryName.trim(),
      };
      if (newCategoryParentId && newCategoryParentId !== "none") {
        payload.parent_id = Number(newCategoryParentId);
      }

      const res = await fetch("/api/admin/content/blog/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to create category");
      }

      toast.success(json.message || "Category added successfully!");
      await fetchCategories();

      // If added subcategory for active category, select it
      if (newCategoryParentId !== "none") {
        const parent = categories.find((c) => c.id === Number(newCategoryParentId));
        if (parent) {
          setFormData((prev) => ({
            ...prev,
            category: parent.name,
            subCategory: newCategoryName.trim(),
          }));
        }
      } else {
        setFormData((prev) => ({
          ...prev,
          category: newCategoryName.trim(),
          subCategory: "",
        }));
      }

      setNewCategoryName("");
      setNewCategoryParentId("none");
      setAddCatModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to create category");
    } finally {
      setAddingCategory(false);
    }
  };

  // Get current subcategories for selected category in modal
  const currentCategoryObj = useMemo(() => {
    return categories.find(
      (c) => c.name.toLowerCase() === (formData.category || "").toLowerCase()
    );
  }, [categories, formData.category]);

  const openNewArticleModal = () => {
    const activeInstId = getStoredActiveInstitutionId();
    setEditingPostId(null);
    setFormData({
      title: "",
      slug: "",
      category: categories[0]?.name || "Academic & Curriculum",
      subCategory: categories[0]?.subcategories?.[0]?.name || "",
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
      institutionId: isPlatform ? null : activeInstId || null,
    });
    setActiveTab("content");
    setEditorOpen(true);
  };

  const openEditArticleModal = (post: BlogPost) => {
    setEditingPostId(post.id);
    setFormData({
      title: post.title || "",
      slug: post.slug || "",
      category: post.category || categories[0]?.name || "Academic & Curriculum",
      subCategory: post.sub_category || "",
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
        sub_category: formData.subCategory.trim() || null,
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save article");
      }

      toast.success(
        editingPostId ? "Article updated successfully!" : "Article published successfully!"
      );
      setEditorOpen(false);
      await fetchPosts();
    } catch (err: any) {
      console.error("Save article error:", err);
      toast.error(err.message || "Failed to save article");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleFeatured = async (post: BlogPost) => {
    try {
      const res = await fetch(`/api/admin/content/blog/${post.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_featured: !post.is_featured }),
      });

      if (res.ok) {
        toast.success(
          !post.is_featured
            ? `"${post.title}" pinned as featured!`
            : `"${post.title}" removed from featured.`
        );
        await fetchPosts();
      } else {
        toast.error("Failed to update featured status");
      }
    } catch {
      toast.error("Error updating featured status");
    }
  };

  const handleDeleteArticle = async () => {
    if (!deletePostId) return;
    try {
      setDeleting(true);
      const res = await fetch(`/api/admin/content/blog/${deletePostId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Article deleted successfully");
        setDeletePostId(null);
        await fetchPosts();
      } else {
        toast.error("Failed to delete article");
      }
    } catch {
      toast.error("Error deleting article");
    } finally {
      setDeleting(false);
    }
  };

  // Filtered Posts
  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const matchesSearch =
        search === "" ||
        post.title.toLowerCase().includes(search.toLowerCase()) ||
        (post.summary && post.summary.toLowerCase().includes(search.toLowerCase())) ||
        (post.tags && post.tags.toLowerCase().includes(search.toLowerCase())) ||
        (post.author_name && post.author_name.toLowerCase().includes(search.toLowerCase()));

      const matchesCategory =
        selectedCategory === "all" || post.category === selectedCategory;

      const matchesSubCategory =
        selectedSubCategory === "all" || post.sub_category === selectedSubCategory;

      const matchesStatus =
        selectedStatus === "all" || post.status === selectedStatus;

      return matchesSearch && matchesCategory && matchesSubCategory && matchesStatus;
    });
  }, [posts, search, selectedCategory, selectedSubCategory, selectedStatus]);

  // Statistics
  const totalArticles = posts.length;
  const totalPublished = posts.filter((p) => p.status === "published").length;
  const totalDrafts = posts.filter((p) => p.status === "draft" || p.status === "review").length;
  const totalViews = posts.reduce((sum, p) => sum + (p.views_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Blog Studio</h1>
            <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30">
              Publishing Hub
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Create, format, and publish articles, manage categories & sub-categories, upload media, and customize SEO.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void fetchPosts();
              void fetchCategories();
            }}
            disabled={loading}
            className="text-xs font-semibold h-9"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="text-xs font-semibold h-9"
          >
            <Link href="/blogs" target="_blank">
              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
              View Public Blog
            </Link>
          </Button>

          <Button
            size="sm"
            onClick={openNewArticleModal}
            className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 h-9 rounded-lg shadow-sm"
          >
            <Plus className="h-4 w-4" />
            New Article
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <Card className="p-4 border-border/80 bg-card/60 shadow-2xs">
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            Total Articles
          </p>
          <p className="text-2xl font-black text-foreground mt-1">{totalArticles}</p>
        </Card>
        <Card className="p-4 border-border/80 bg-card/60 shadow-2xs">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">
            Published Live
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
            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={(val) => {
              setSelectedCategory(val);
              setSelectedSubCategory("all");
            }}>
              <SelectTrigger className="w-[180px] text-xs h-9">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.name}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sub-Category Filter */}
            {selectedCategory !== "all" && (
              <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory}>
                <SelectTrigger className="w-[180px] text-xs h-9">
                  <SelectValue placeholder="All Sub-Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sub-Categories</SelectItem>
                  {categories
                    .find((c) => c.name === selectedCategory)
                    ?.subcategories?.map((sub) => (
                      <SelectItem key={sub.id} value={sub.name}>
                        {sub.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}

            {/* Status Filter */}
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

            {/* Quick Add Category Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewCategoryName("");
                setNewCategoryParentId("none");
                setAddCatModalOpen(true);
              }}
              className="text-xs h-9 font-medium"
            >
              <FolderPlus className="size-3.5 mr-1 text-primary" />
              Add Category
            </Button>
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
                <th className="p-3.5">Category & Subcategory</th>
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
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="size-4 animate-spin" />
                      <span>Loading articles...</span>
                    </div>
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
                    <td className="p-3.5 pl-4 max-w-[320px]">
                      <div className="flex items-center gap-3">
                        {post.cover_image ? (
                          <img
                            src={post.cover_image}
                            alt=""
                            className="h-11 w-16 object-cover rounded-lg border border-border shrink-0 bg-muted"
                          />
                        ) : (
                          <div className="h-11 w-16 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0 border">
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
                      <div className="flex flex-col gap-1 items-start">
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          {post.category || "General"}
                        </Badge>
                        {post.sub_category && (
                          <Badge variant="secondary" className="text-[9px] font-medium text-muted-foreground">
                            ↳ {post.sub_category}
                          </Badge>
                        )}
                        {post.tags && (
                          <p className="text-[10px] text-muted-foreground truncate max-w-[150px] mt-0.5">
                            #{post.tags}
                          </p>
                        )}
                      </div>
                    </td>

                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        {post.author_avatar ? (
                          <img
                            src={post.author_avatar}
                            alt=""
                            className="h-7 w-7 rounded-full object-cover border shrink-0"
                          />
                        ) : (
                          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0 border">
                            {(post.author_name || "A").slice(0, 1).toUpperCase()}
                          </div>
                        )}
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
                            post.is_featured
                              ? "text-amber-500 hover:text-amber-600"
                              : "text-muted-foreground hover:text-amber-500"
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

      {/* Hidden File Inputs for Direct Media Uploads */}
      <input
        type="file"
        ref={coverFileInputRef}
        onChange={handleCoverUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={videoFileInputRef}
        onChange={handleVideoUpload}
        accept="video/*"
        className="hidden"
      />
      <input
        type="file"
        ref={avatarFileInputRef}
        onChange={handleAvatarUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={bodyImageInputRef}
        onChange={handleInsertBodyImage}
        accept="image/*"
        className="hidden"
      />

      {/* WordPress-Style Full Article Studio Modal (EXPANDED WIDTH & CLEAN ERGONOMICS) */}
      <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
        <DialogContent className="w-[96vw] max-w-6xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden rounded-2xl shadow-2xl border-border/80 sm:max-w-6xl">
          {/* Top Bar Header */}
          <div className="px-6 py-4 border-b border-border/80 flex items-center justify-between sticky top-0 bg-background/95 backdrop-blur-xs z-10 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-foreground">
                  {editingPostId ? "Edit Article Studio" : "Write & Publish Article"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Format rich content, select categories, upload images & videos, configure author profile and SEO.
                </DialogDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditorOpen(false)}
                className="text-xs font-semibold rounded-lg h-9 px-4"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={saving}
                onClick={handleSaveArticle}
                className="text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg h-9 px-5 shadow-sm"
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                {saving ? "Saving..." : editingPostId ? "Save Changes" : "Publish Article"}
              </Button>
            </div>
          </div>

          {/* Modal Body Container with Tabs */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid grid-cols-4 w-full h-11 p-1 bg-muted/60 rounded-xl border">
                <TabsTrigger value="content" className="text-xs font-bold gap-1.5">
                  <FileText className="size-3.5" />
                  <span>Content & Text</span>
                </TabsTrigger>
                <TabsTrigger value="media" className="text-xs font-bold gap-1.5">
                  <ImageIcon className="size-3.5" />
                  <span>Images & Video</span>
                </TabsTrigger>
                <TabsTrigger value="publishing" className="text-xs font-bold gap-1.5">
                  <User className="size-3.5" />
                  <span>Author & Scope</span>
                </TabsTrigger>
                <TabsTrigger value="seo" className="text-xs font-bold gap-1.5">
                  <Globe className="size-3.5" />
                  <span>SEO & Social</span>
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: CONTENT & TEXT */}
              <TabsContent value="content" className="space-y-5 pt-1">
                {/* Article Title */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Article Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Master Data Structures and Algorithms for Engineering Placements"
                    className="text-sm font-semibold h-10"
                  />
                </div>

                {/* Slug, Category, Sub-Category 3-column Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Slug */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">URL Slug</Label>
                    <Input
                      value={formData.slug}
                      onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                      placeholder="master-data-structures-and-algorithms"
                      className="text-xs font-mono h-9"
                    />
                  </div>

                  {/* Category Selection */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Category *</Label>
                      <button
                        type="button"
                        onClick={() => {
                          setNewCategoryName("");
                          setNewCategoryParentId("none");
                          setAddCatModalOpen(true);
                        }}
                        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="size-3" /> Add Category
                      </button>
                    </div>
                    <Select
                      value={formData.category}
                      onValueChange={(val) => {
                        const matched = categories.find((c) => c.name === val);
                        setFormData((prev) => ({
                          ...prev,
                          category: val,
                          subCategory: matched?.subcategories?.[0]?.name || "",
                        }));
                      }}
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sub-Category Selection */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Sub-Category</Label>
                      <button
                        type="button"
                        onClick={() => {
                          setNewCategoryName("");
                          setNewCategoryParentId(currentCategoryObj ? String(currentCategoryObj.id) : "none");
                          setAddCatModalOpen(true);
                        }}
                        className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-0.5"
                      >
                        <Plus className="size-3" /> Add Sub-Category
                      </button>
                    </div>
                    <Select
                      value={formData.subCategory || "none"}
                      onValueChange={(val) =>
                        setFormData((prev) => ({
                          ...prev,
                          subCategory: val === "none" ? "" : val,
                        }))
                      }
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder="Select Subcategory (Optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Top-level only)</SelectItem>
                        {currentCategoryObj?.subcategories?.map((sub) => (
                          <SelectItem key={sub.id} value={sub.name}>
                            {sub.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Excerpt / Summary */}
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

                {/* Article Body HTML with Media Inserter toolbar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-bold">Article Body Content (HTML / Text) *</Label>
                      <p className="text-[11px] text-muted-foreground">
                        Use headings, paragraphs, bullet lists, blockquotes, and code snippets.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => bodyImageInputRef.current?.click()}
                      disabled={uploadingBodyImage}
                      className="h-8 text-xs font-semibold gap-1.5"
                    >
                      {uploadingBodyImage ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <ImageIcon className="size-3.5 text-primary" />
                      )}
                      Upload & Insert Image
                    </Button>
                  </div>

                  <Textarea
                    rows={14}
                    value={formData.contentHtml}
                    onChange={(e) => setFormData((prev) => ({ ...prev, contentHtml: e.target.value }))}
                    placeholder="<h2>Main Heading</h2><p>Write your article here...</p>"
                    className="font-mono text-xs leading-relaxed"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Article Tags (Comma-separated)</Label>
                  <Input
                    value={formData.tags}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
                    placeholder="Tech, Career, BCA, Coding, Placements"
                    className="text-xs h-9"
                  />
                </div>
              </TabsContent>

              {/* TAB 2: IMAGES & VIDEO */}
              <TabsContent value="media" className="space-y-6 pt-1">
                {/* 1. Featured Cover Image Section */}
                <div className="rounded-xl border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="size-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">Featured Cover Image</h3>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => coverFileInputRef.current?.click()}
                      disabled={uploadingCover}
                      className="text-xs font-semibold h-8 gap-1.5"
                    >
                      {uploadingCover ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Upload className="size-3.5 text-primary" />
                      )}
                      Upload Cover Image
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 items-start">
                    {/* Cover Preview */}
                    <div className="relative aspect-video w-full rounded-xl border bg-muted/40 overflow-hidden flex items-center justify-center">
                      {formData.coverImage ? (
                        <>
                          <img
                            src={formData.coverImage}
                            alt="Cover preview"
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, coverImage: "" }))}
                            className="absolute top-2 right-2 size-6 rounded-full bg-background/80 hover:bg-background flex items-center justify-center text-destructive shadow-sm"
                            title="Remove cover"
                          >
                            <X className="size-3.5" />
                          </button>
                        </>
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-muted-foreground p-4 text-center">
                          <ImageIcon className="size-8 opacity-50" />
                          <span className="text-xs font-medium">No cover image selected</span>
                        </div>
                      )}
                    </div>

                    {/* Image URL & Preset Selection */}
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-medium text-muted-foreground">Direct Image URL</Label>
                        <Input
                          value={formData.coverImage}
                          onChange={(e) => setFormData((prev) => ({ ...prev, coverImage: e.target.value }))}
                          placeholder="https://images.unsplash.com/..."
                          className="text-xs h-9"
                        />
                      </div>

                      <div>
                        <Label className="text-[11px] font-medium text-muted-foreground">Or pick from sample presets:</Label>
                        <div className="flex gap-2 pt-1.5 overflow-x-auto">
                          {SAMPLE_COVERS.map((sample, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => setFormData((prev) => ({ ...prev, coverImage: sample }))}
                              className={`h-12 w-20 rounded-lg border overflow-hidden shrink-0 transition-all ${
                                formData.coverImage === sample ? "ring-2 ring-primary" : "opacity-80 hover:opacity-100"
                              }`}
                            >
                              <img src={sample} alt="" className="h-full w-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Video Upload & Embed Section */}
                <div className="rounded-xl border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video className="size-4 text-primary" />
                      <h3 className="text-sm font-bold text-foreground">Featured Video (Optional)</h3>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => videoFileInputRef.current?.click()}
                      disabled={uploadingVideo}
                      className="text-xs font-semibold h-8 gap-1.5"
                    >
                      {uploadingVideo ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Upload className="size-3.5 text-primary" />
                      )}
                      Upload Video File (MP4, WebM)
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 items-start">
                    {/* Video Player Preview */}
                    <div className="relative aspect-video w-full rounded-xl border bg-muted/40 overflow-hidden flex items-center justify-center">
                      {formData.videoUrl ? (
                        formData.videoUrl.includes("youtube.com") || formData.videoUrl.includes("youtu.be") ? (
                          <div className="flex flex-col items-center justify-center gap-1.5 text-center p-3">
                            <Play className="size-8 text-red-500" />
                            <span className="text-xs font-semibold">YouTube Video Linked</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[240px]">
                              {formData.videoUrl}
                            </span>
                          </div>
                        ) : (
                          <video
                            src={formData.videoUrl}
                            controls
                            className="h-full w-full object-cover"
                          />
                        )
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-muted-foreground p-4 text-center">
                          <Film className="size-8 opacity-50" />
                          <span className="text-xs font-medium">No video uploaded or linked</span>
                        </div>
                      )}
                    </div>

                    {/* Video URL Input */}
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">
                        Direct Video URL or YouTube / Vimeo Embed
                      </Label>
                      <Input
                        value={formData.videoUrl}
                        onChange={(e) => setFormData((prev) => ({ ...prev, videoUrl: e.target.value }))}
                        placeholder="https://www.youtube.com/watch?v=... or https://res.cloudinary.com/..."
                        className="text-xs h-9"
                      />
                      <p className="text-[11px] text-muted-foreground">
                        Upload a video up to 100MB directly, or paste a YouTube / Vimeo link to stream seamlessly on the public blog page.
                      </p>
                      {formData.videoUrl && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setFormData((prev) => ({ ...prev, videoUrl: "" }))}
                          className="text-xs text-destructive hover:text-destructive h-7 px-2"
                        >
                          Clear Video
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 3: AUTHOR & SCOPE */}
              <TabsContent value="publishing" className="space-y-5 pt-1">
                {/* Author Avatar Upload Card */}
                <div className="rounded-xl border bg-card p-5 space-y-4">
                  <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Camera className="size-4 text-primary" />
                    Author Avatar & Profile Picture
                  </h3>

                  <div className="flex items-center gap-5">
                    <div className="relative size-20 rounded-full border-2 border-primary/20 bg-muted/40 overflow-hidden flex items-center justify-center shrink-0">
                      {formData.authorAvatar ? (
                        <img
                          src={formData.authorAvatar}
                          alt="Author avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="size-8 text-muted-foreground opacity-50" />
                      )}
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => avatarFileInputRef.current?.click()}
                          disabled={uploadingAvatar}
                          className="text-xs font-semibold h-8 gap-1.5"
                        >
                          {uploadingAvatar ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : (
                            <Upload className="size-3.5 text-primary" />
                          )}
                          Upload Avatar Photo
                        </Button>

                        {formData.authorAvatar && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setFormData((prev) => ({ ...prev, authorAvatar: "" }))}
                            className="text-xs text-destructive hover:text-destructive h-8 px-2"
                          >
                            Remove
                          </Button>
                        )}
                      </div>

                      <Input
                        value={formData.authorAvatar}
                        onChange={(e) => setFormData((prev) => ({ ...prev, authorAvatar: e.target.value }))}
                        placeholder="Or enter image URL: https://..."
                        className="text-xs h-8 max-w-md"
                      />
                    </div>
                  </div>
                </div>

                {/* Author Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Author Full Name</Label>
                    <Input
                      value={formData.authorName}
                      onChange={(e) => setFormData((prev) => ({ ...prev, authorName: e.target.value }))}
                      placeholder="e.g. Dr. Ramesh Gupta"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Author Role / Designation</Label>
                    <Input
                      value={formData.authorRole}
                      onChange={(e) => setFormData((prev) => ({ ...prev, authorRole: e.target.value }))}
                      placeholder="e.g. Dean of Computer Science"
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                {/* Publishing Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Estimated Reading Time (Minutes)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={60}
                      value={formData.readTimeMins}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          readTimeMins: parseInt(e.target.value, 10) || 5,
                        }))
                      }
                      className="text-xs h-9"
                    />
                  </div>

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
                        <SelectItem value="draft">Draft (Private)</SelectItem>
                        <SelectItem value="review">Under Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 flex flex-col justify-center">
                    <Label className="text-xs font-bold mb-1.5">Featured Showcase</Label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
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

              {/* TAB 4: SEO & SEARCH PREVIEW */}
              <TabsContent value="seo" className="space-y-5 pt-1">
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
                    className="text-xs h-9"
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
                    className="text-xs h-9"
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

      {/* Quick Modal: Add Category / Sub-Category */}
      <Dialog open={addCatModalOpen} onOpenChange={setAddCatModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <FolderPlus className="size-4 text-primary" />
              Add Blog Category / Subcategory
            </DialogTitle>
            <DialogDescription className="text-xs">
              Create a new category taxonomy for your blog articles.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Parent Category</Label>
              <Select
                value={newCategoryParentId}
                onValueChange={setNewCategoryParentId}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="Select Parent Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Create Top-Level Category)</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Select a parent category if you are adding a sub-category.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">
                {newCategoryParentId !== "none" ? "Sub-Category Name *" : "Category Name *"}
              </Label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={
                  newCategoryParentId !== "none"
                    ? "e.g. Data Science & Big Data"
                    : "e.g. Artificial Intelligence"
                }
                className="text-xs h-9"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddCatModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleAddCategorySubmit}
              disabled={addingCategory || !newCategoryName.trim()}
              className="bg-primary font-semibold"
            >
              {addingCategory ? (
                <Loader2 className="size-3.5 animate-spin mr-1.5" />
              ) : (
                <Plus className="size-3.5 mr-1.5" />
              )}
              {newCategoryParentId !== "none" ? "Save Sub-Category" : "Save Category"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={Boolean(deletePostId)} onOpenChange={() => setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this article?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This action cannot be undone. The article will be permanently removed from all listings and searches.
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
