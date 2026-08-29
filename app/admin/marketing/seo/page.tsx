"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAuthStore } from "@/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  CheckCircle2,
  Code2,
  Copy,
  Edit,
  ExternalLink,
  Eye,
  Globe,
  Layers,
  Link as LinkIcon,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Share2,
  Sliders,
  Sparkles,
  Tag,
  Trash2,
  Wand2,
  Smartphone,
  Monitor,
} from "lucide-react";
import { resolveSeoMetadata, SeoContextData, ConditionalRule } from "@/lib/seo/metadata-resolver";

export const PRESET_ROUTES = [
  { path: "/", name: "Home Page", type: "static", entity: "general" },
  { path: "/courses", name: "Course Catalog", type: "static", entity: "course" },
  { path: "/courses/[slug]", name: "Course Detail (Dynamic)", type: "dynamic_template", entity: "course" },
  { path: "/institutions", name: "Institutes Directory", type: "static", entity: "institution" },
  { path: "/institutions/[id]", name: "Institute Campus (Dynamic)", type: "dynamic_template", entity: "institution" },
  { path: "/blog", name: "Blog Articles List", type: "static", entity: "blog" },
  { path: "/blog/[slug]", name: "Blog Post (Dynamic)", type: "dynamic_template", entity: "blog" },
  { path: "/vendors", name: "Vendors & Services Directory", type: "static", entity: "vendor" },
  { path: "/teachers/[id]", name: "Teacher Profile (Dynamic)", type: "dynamic_template", entity: "teacher" },
  { path: "/location/[area]", name: "Location Specific Page (Dynamic)", type: "dynamic_template", entity: "location" },
  { path: "/pricing", name: "Pricing & Plans", type: "static", entity: "pricing" },
  { path: "/contact", name: "Contact & Branches", type: "static", entity: "general" },
];

export const AVAILABLE_VARIABLES = [
  { tag: "{{site_name}}", label: "Site Name", desc: "Platform brand name (e.g. EduBird)" },
  { tag: "{{course_title}}", label: "Course Title", desc: "Title of the course" },
  { tag: "{{institution_name}}", label: "Institute Name", desc: "Name of the institute" },
  { tag: "{{teacher_name}}", label: "Teacher Name", desc: "Faculty/Teacher name" },
  { tag: "{{blog_title}}", label: "Blog Title", desc: "Article or blog headline" },
  { tag: "{{city}}", label: "City", desc: "Location city (e.g. Indore)" },
  { tag: "{{area}}", label: "Area / Locality", desc: "Location area (e.g. Bhawarkua)" },
  { tag: "{{state}}", label: "State", desc: "State name (e.g. Madhya Pradesh)" },
  { tag: "{{country}}", label: "Country", desc: "Country name (e.g. India)" },
  { tag: "{{category}}", label: "Category", desc: "Course or business category" },
  { tag: "{{price}}", label: "Price / Fees", desc: "Course pricing or discount" },
  { tag: "{{rating}}", label: "Rating", desc: "Review score (e.g. 4.8)" },
  { tag: "{{current_year}}", label: "Current Year", desc: "e.g. 2026" },
  { tag: "{{thumbnail}}", label: "Thumbnail URL", desc: "Course / Post feature image" },
];

export type SeoTag = {
  id: number;
  page_path: string;
  route_path?: string;
  page_type: "static" | "dynamic_template" | "conditional_rule";
  entity_type: string;
  meta_title: string;
  meta_description: string | null;
  keywords: string[];
  og_title: string | null;
  og_description: string | null;
  og_image: string | null;
  og_url: string | null;
  canonical_url: string | null;
  robots_directive: string;
  schema_markup_type: string;
  conditional_rules: ConditionalRule[];
  is_active: boolean;
  updated_at: string;
};

export default function SeoManagementPage() {
  const { accessToken } = useAuthStore();
  const [tags, setTags] = useState<SeoTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTabFilter, setActiveTabFilter] = useState("all");

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<SeoTag | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState("meta");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // Form fields
  const [formPath, setFormPath] = useState("/");
  const [formPageType, setFormPageType] = useState<"static" | "dynamic_template" | "conditional_rule">("static");
  const [formEntityType, setFormEntityType] = useState("general");
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formKeywords, setFormKeywords] = useState("");
  const [formOgTitle, setFormOgTitle] = useState("");
  const [formOgDesc, setFormOgDesc] = useState("");
  const [formOgImage, setFormOgImage] = useState("");
  const [formOgUrl, setFormOgUrl] = useState("");
  const [formCanonical, setFormCanonical] = useState("");
  const [formRobots, setFormRobots] = useState("index, follow");
  const [formSchemaType, setFormSchemaType] = useState("WebPage");
  const [formConditionalRules, setFormConditionalRules] = useState<ConditionalRule[]>([]);
  const [activeFocusedField, setActiveFocusedField] = useState<"title" | "desc" | "keywords" | "og_title" | "og_desc" | "canonical">("title");

  // Live Test Context Preview
  const [previewContext, setPreviewContext] = useState<SeoContextData>({
    site_name: "EduBird",
    course_title: "Full Stack Web Development & AI Bootcamp",
    institution_name: "Maa Sharda Institute",
    teacher_name: "Prof. Rajesh Sharma",
    blog_title: "Top 10 High Paying Tech Skills in 2026",
    city: "Indore",
    area: "Bhawarkua",
    state: "Madhya Pradesh",
    country: "India",
    category: "Information Technology",
    price: "₹14,999",
    discount: "20",
    rating: "4.9",
  });

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
    setFormPageType("static");
    setFormEntityType("general");
    setFormTitle("{{site_name}} - Leading Coaching, Courses & Campus Platform in {{city}}");
    setFormDesc("Discover top-rated institutes, verified coaching centers, mock exams, and career skill courses on {{site_name}}.");
    setFormKeywords("education portal, online coaching, competitive exams, test series, top institutes");
    setFormOgTitle("{{site_name}} - Transform Your Learning & Career");
    setFormOgDesc("Find the best courses, expert teachers, and coaching institutes across your city.");
    setFormOgImage("/images/og-home.jpg");
    setFormOgUrl("https://edubird.net/");
    setFormCanonical("https://edubird.net/");
    setFormRobots("index, follow");
    setFormSchemaType("WebPage");
    setFormConditionalRules([
      { condition: "city_present", action: "append_title", value: "in {{city}}, {{state}}" }
    ]);
    setActiveFormTab("meta");
    setDialogOpen(true);
  };

  const handleOpenEdit = (t: SeoTag) => {
    setEditingTag(t);
    setFormPath(t.page_path);
    setFormPageType(t.page_type || (t.page_path.includes("[") ? "dynamic_template" : "static"));
    setFormEntityType(t.entity_type || "general");
    setFormTitle(t.meta_title || "");
    setFormDesc(t.meta_description || "");
    setFormKeywords(Array.isArray(t.keywords) ? t.keywords.join(", ") : "");
    setFormOgTitle(t.og_title || t.meta_title || "");
    setFormOgDesc(t.og_description || t.meta_description || "");
    setFormOgImage(t.og_image || "");
    setFormOgUrl(t.og_url || t.canonical_url || "");
    setFormCanonical(t.canonical_url || "");
    setFormRobots(t.robots_directive || "index, follow");
    setFormSchemaType(t.schema_markup_type || "WebPage");
    setFormConditionalRules(
      Array.isArray(t.conditional_rules) 
        ? t.conditional_rules 
        : typeof t.conditional_rules === "string" 
          ? JSON.parse(t.conditional_rules || "[]") 
          : []
    );
    setActiveFormTab("meta");
    setDialogOpen(true);
  };

  const handleInsertVariable = (variableTag: string) => {
    if (activeFocusedField === "title") {
      setFormTitle((prev) => `${prev} ${variableTag}`.trim());
    } else if (activeFocusedField === "desc") {
      setFormDesc((prev) => `${prev} ${variableTag}`.trim());
    } else if (activeFocusedField === "keywords") {
      setFormKeywords((prev) => prev ? `${prev}, ${variableTag}` : variableTag);
    } else if (activeFocusedField === "og_title") {
      setFormOgTitle((prev) => `${prev} ${variableTag}`.trim());
    } else if (activeFocusedField === "og_desc") {
      setFormOgDesc((prev) => `${prev} ${variableTag}`.trim());
    } else if (activeFocusedField === "canonical") {
      setFormCanonical((prev) => `${prev}${variableTag}`);
    }
    toast.success(`Inserted ${variableTag}`);
  };

  const handleSelectPreset = (preset: typeof PRESET_ROUTES[0]) => {
    setFormPath(preset.path);
    setFormPageType(preset.type as any);
    setFormEntityType(preset.entity);
    if (preset.path === "/courses/[slug]") {
      setFormTitle("{{course_title}} Course Syllabus, Fees & Admissions | {{institution_name}}");
      setFormDesc("Enroll in {{course_title}} by {{institution_name}} in {{city}}, {{area}}. Complete curriculum, batches, faculty credentials, and online enrollment.");
      setFormKeywords("{{course_title}}, {{course_title}} fees, {{institution_name}}, coaching in {{city}}");
      setFormOgTitle("{{course_title}} by {{institution_name}} - Admissions Open");
      setFormCanonical("https://edubird.net/courses/{{slug}}");
      setFormSchemaType("Course");
    } else if (preset.path === "/institutions/[id]") {
      setFormTitle("{{institution_name}} {{city}} - Courses, Faculty, Reviews & Campus Info");
      setFormDesc("{{institution_name}} located in {{area}}, {{city}}, {{state}}. Check top courses offered, facilities, hostel living, student reviews, and contact info.");
      setFormKeywords("{{institution_name}}, institute in {{area}}, top coaching {{city}}");
      setFormOgTitle("{{institution_name}} Campus Portal & Admissions | {{city}}");
      setFormCanonical("https://edubird.net/institutions/{{id}}");
      setFormSchemaType("EducationalOrganization");
    } else if (preset.path === "/blog/[slug]") {
      setFormTitle("{{blog_title}} | Educational Articles & Guides | {{site_name}}");
      setFormDesc("Read \"{{blog_title}}\". Expert study tips, exam strategies, career advice, and syllabus breakdowns.");
      setFormKeywords("{{blog_title}}, exam tips, career guide, study notes");
      setFormCanonical("https://edubird.net/blog/{{slug}}");
      setFormSchemaType("Article");
    }
    toast.success(`Applied preset template for ${preset.name}`);
  };

  const handleAddConditionalRule = () => {
    setFormConditionalRules((prev) => [
      ...prev,
      { condition: "city_present", action: "append_title", value: "in {{city}}, {{state}}" }
    ]);
  };

  const handleRemoveConditionalRule = (index: number) => {
    setFormConditionalRules((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPath.trim() || !formTitle.trim()) {
      toast.error("Please provide Route Path and Meta Title");
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
          page_type: formPageType,
          entity_type: formEntityType,
          meta_title: formTitle.trim(),
          meta_description: formDesc.trim() || null,
          keywords: formKeywords.split(",").map((k) => k.trim()).filter(Boolean),
          og_title: formOgTitle.trim() || formTitle.trim(),
          og_description: formOgDesc.trim() || formDesc.trim() || null,
          og_image: formOgImage.trim() || null,
          og_url: formOgUrl.trim() || formCanonical.trim() || null,
          canonical_url: formCanonical.trim() || null,
          robots_directive: formRobots,
          schema_markup_type: formSchemaType,
          conditional_rules: formConditionalRules,
          is_active: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save SEO config");

      toast.success("SEO Meta Template configured successfully!");
      setDialogOpen(false);
      fetchTags();
    } catch (err: any) {
      toast.error(err.message || "Failed to save SEO meta tags");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this SEO meta configuration?")) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/seo?id=${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        toast.success("SEO configuration deleted");
        fetchTags();
      }
    } catch {
      toast.error("Failed to delete SEO config");
    }
  };

  // Live Resolved Preview Output
  const resolvedPreview = resolveSeoMetadata(
    {
      page_path: formPath,
      page_type: formPageType,
      meta_title: formTitle,
      meta_description: formDesc,
      keywords: formKeywords,
      og_title: formOgTitle,
      og_description: formOgDesc,
      og_image: formOgImage,
      og_url: formOgUrl,
      canonical_url: formCanonical,
      robots_directive: formRobots,
      schema_markup_type: formSchemaType,
      conditional_rules: formConditionalRules,
    },
    previewContext
  );

  const filteredTags = tags.filter((t) => {
    const matchesSearch =
      t.page_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.meta_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.meta_description && t.meta_description.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;
    if (activeTabFilter === "all") return true;
    if (activeTabFilter === "dynamic") return t.page_type === "dynamic_template" || t.page_path.includes("[");
    if (activeTabFilter === "static") return t.page_type === "static" && !t.page_path.includes("[");
    if (activeTabFilter === "course") return t.entity_type === "course" || t.page_path.includes("course");
    if (activeTabFilter === "institution") return t.entity_type === "institution" || t.page_path.includes("institution");
    if (activeTabFilter === "blog") return t.entity_type === "blog" || t.page_path.includes("blog");
    return true;
  });

  const dynamicCount = tags.filter((t) => t.page_type === "dynamic_template" || t.page_path.includes("[")).length;
  const staticCount = tags.filter((t) => t.page_type === "static" && !t.page_path.includes("[")).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <Globe className="w-4 h-4 text-primary" />
            <span>Search Engine Optimization & Social Previews</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">SEO & Meta Tags Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure dynamic title tags, meta descriptions, OpenGraph social cards, canonical URLs, and conditional rules per route.
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

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Configured Routes</span>
            <Globe className="w-4 h-4 text-primary" />
          </div>
          <p className="text-2xl font-black mt-2 text-foreground">{tags.length}</p>
          <span className="text-[10px] text-muted-foreground">Indexed in Sitemap</span>
        </Card>

        <Card className="rounded-2xl border p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Dynamic Templates</span>
            <Sparkles className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-black mt-2 text-purple-600">{dynamicCount}</p>
          <span className="text-[10px] text-muted-foreground">Wildcard & Entity Based</span>
        </Card>

        <Card className="rounded-2xl border p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">Static Pages</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black mt-2 text-blue-600">{staticCount}</p>
          <span className="text-[10px] text-muted-foreground">Core Website Routes</span>
        </Card>

        <Card className="rounded-2xl border p-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">OpenGraph Cards</span>
            <Share2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black mt-2 text-emerald-600">{tags.filter((t) => t.og_title || t.og_image).length}</p>
          <span className="text-[10px] text-muted-foreground">Social Preview Active</span>
        </Card>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/30 p-2.5 rounded-2xl border">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {[
            { id: "all", label: `All Routes (${tags.length})` },
            { id: "dynamic", label: `Dynamic Templates (${dynamicCount})` },
            { id: "static", label: `Static Pages (${staticCount})` },
            { id: "course", label: "Course Pages" },
            { id: "institution", label: "Institutes" },
            { id: "blog", label: "Blogs" },
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTabFilter === tab.id ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveTabFilter(tab.id)}
              className="text-xs h-8 rounded-xl font-bold shrink-0"
            >
              {tab.label}
            </Button>
          ))}
        </div>

        <div className="relative w-full sm:w-72 shrink-0">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search route path or meta title..."
            className="pl-8 bg-background h-8 text-xs rounded-xl"
          />
        </div>
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
          <h3 className="text-lg font-bold text-foreground">No SEO meta configs found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Click &quot;Add Page SEO Config&quot; to set custom meta titles, descriptions, keywords, OpenGraph previews, and canonical links.
          </p>
          <Button onClick={handleOpenAdd} size="sm" className="mt-2 font-bold">
            <Plus className="w-4 h-4 mr-1.5" /> Configure First Route
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTags.map((tag) => {
            const isDynamic = tag.page_type === "dynamic_template" || tag.page_path.includes("[");
            const keywordsList = Array.isArray(tag.keywords)
              ? tag.keywords
              : typeof tag.keywords === "string"
                ? (tag.keywords as string).split(",")
                : [];

            return (
              <Card
                key={tag.id}
                className="rounded-2xl border border-border/80 hover:border-primary/50 transition-all shadow-2xs hover:shadow-md flex flex-col justify-between overflow-hidden"
              >
                <CardHeader className="p-4 pb-2 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <code className="text-xs font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          {tag.page_path}
                        </code>
                        <Badge
                          variant="outline"
                          className={
                            isDynamic
                              ? "text-[10px] bg-purple-50 text-purple-700 border-purple-200"
                              : "text-[10px] bg-blue-50 text-blue-700 border-blue-200"
                          }
                        >
                          {isDynamic ? "Dynamic Template" : "Static Route"}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {tag.entity_type || "general"}
                        </Badge>
                      </div>
                      <CardTitle className="text-sm font-bold text-foreground leading-snug line-clamp-2 pt-1">
                        {tag.meta_title}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-2.5 text-xs text-muted-foreground">
                  {tag.meta_description && (
                    <p className="line-clamp-2 text-muted-foreground text-[11px] leading-relaxed">
                      {tag.meta_description}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-1 pt-1">
                    {keywordsList.slice(0, 4).map((kw, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 text-[10px] bg-muted/60 text-foreground px-2 py-0.5 rounded-md border"
                      >
                        <Tag className="w-2.5 h-2.5 text-primary shrink-0" />
                        {kw.trim()}
                      </span>
                    ))}
                    {keywordsList.length > 4 && (
                      <span className="text-[10px] text-muted-foreground self-center">
                        +{keywordsList.length - 4} more
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t text-[11px]">
                    <div className="flex items-center gap-1.5 truncate text-muted-foreground">
                      <LinkIcon className="w-3 h-3 text-primary shrink-0" />
                      <span className="truncate" title={tag.canonical_url || tag.page_path}>
                        {tag.canonical_url || "Auto Canonical"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground justify-end">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{tag.robots_directive || "index, follow"}</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="p-3 bg-muted/20 border-t flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Schema: {tag.schema_markup_type || "WebPage"}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(tag)}
                      className="h-7 text-xs font-semibold gap-1"
                    >
                      <Edit className="w-3 h-3" /> Edit Config
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tag.id)}
                      className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit SEO Configuration Dialog with Live Previews */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6">
          <form onSubmit={handleSave} className="space-y-5">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl font-black flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    {editingTag ? "Edit SEO Meta Configuration" : "Configure Page SEO & Meta Tags"}
                  </DialogTitle>
                  <DialogDescription className="text-xs">
                    Define dynamic page title, meta description, keywords, OpenGraph social tags, canonical URL, and conditional rules.
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            {/* Quick Preset Selector */}
            <div className="bg-muted/40 p-3 rounded-2xl border space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Wand2 className="w-3.5 h-3.5 text-primary" /> 1-Click Preset Route Templates
                </span>
                <span className="text-[10px] text-muted-foreground">Click to populate standard SEO patterns</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_ROUTES.map((p) => (
                  <button
                    key={p.path}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className="text-[11px] font-semibold bg-background hover:bg-primary/10 hover:text-primary hover:border-primary/40 px-2.5 py-1 rounded-lg border text-foreground transition-all cursor-pointer"
                  >
                    {p.name} <span className="text-[9px] text-muted-foreground font-mono">({p.path})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Template Variables Toolbar */}
            <div className="bg-primary/5 p-3 rounded-2xl border border-primary/20 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                  <Code2 className="w-3.5 h-3.5" /> Dynamic Template Variables
                </span>
                <span className="text-[10px] text-muted-foreground">
                  Inserting into: <strong className="text-foreground capitalize">{activeFocusedField.replace("_", " ")}</strong>
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {AVAILABLE_VARIABLES.map((v) => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => handleInsertVariable(v.tag)}
                    title={v.desc}
                    className="text-[10px] font-mono font-bold bg-background hover:bg-primary hover:text-white px-2 py-0.5 rounded-md border border-primary/30 text-primary transition-all cursor-pointer"
                  >
                    {v.tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Form Tabs */}
            <Tabs value={activeFormTab} onValueChange={setActiveFormTab} className="w-full">
              <TabsList className="grid grid-cols-4 w-full h-10 rounded-xl bg-muted/60 p-1">
                <TabsTrigger value="meta" className="text-xs font-bold rounded-lg">
                  1. Title & Meta
                </TabsTrigger>
                <TabsTrigger value="opengraph" className="text-xs font-bold rounded-lg">
                  2. OpenGraph & Social
                </TabsTrigger>
                <TabsTrigger value="conditional" className="text-xs font-bold rounded-lg">
                  3. Conditional Rules ({formConditionalRules.length})
                </TabsTrigger>
                <TabsTrigger value="preview" className="text-xs font-bold rounded-lg flex items-center gap-1 text-primary">
                  <Eye className="w-3 h-3" /> 4. Live SERP Preview
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: Title & Meta Tags */}
              <TabsContent value="meta" className="space-y-4 pt-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="seo-path">Route Path Pattern *</Label>
                    <Input
                      id="seo-path"
                      value={formPath}
                      onChange={(e) => setFormPath(e.target.value)}
                      placeholder="e.g. /courses/[slug] or /pricing"
                      className="font-mono text-xs"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="seo-pagetype">Page Strategy</Label>
                    <Select value={formPageType} onValueChange={(val: any) => setFormPageType(val)}>
                      <SelectTrigger id="seo-pagetype" className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="static">Static Page</SelectItem>
                        <SelectItem value="dynamic_template">Dynamic Template</SelectItem>
                        <SelectItem value="conditional_rule">Conditional Rule</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="seo-title">Meta Title Tag (`&lt;title&gt;`) *</Label>
                    <span className={`text-[10px] font-mono font-bold ${formTitle.length > 60 ? "text-amber-600" : "text-emerald-600"}`}>
                      {formTitle.length} chars (Recommended: 50-60)
                    </span>
                  </div>
                  <Input
                    id="seo-title"
                    value={formTitle}
                    onFocus={() => setActiveFocusedField("title")}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. {{course_title}} | Best Online & Classroom Coaching in {{city}}"
                    className="text-xs"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="seo-desc">Meta Description (`&lt;meta name=&quot;description&quot;&gt;`)</Label>
                    <span className={`text-[10px] font-mono font-bold ${formDesc.length > 160 ? "text-amber-600" : "text-emerald-600"}`}>
                      {formDesc.length} chars (Recommended: 140-160)
                    </span>
                  </div>
                  <Textarea
                    id="seo-desc"
                    rows={3}
                    value={formDesc}
                    onFocus={() => setActiveFocusedField("desc")}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="e.g. Enroll in {{course_title}} offered by {{institution_name}} in {{city}}, {{area}}. Check syllabus, fees, reviews, and faculty credentials."
                    className="text-xs leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="seo-keywords">Meta Keywords (Comma-separated)</Label>
                  <Input
                    id="seo-keywords"
                    value={formKeywords}
                    onFocus={() => setActiveFocusedField("keywords")}
                    onChange={(e) => setFormKeywords(e.target.value)}
                    placeholder="e.g. {{course_title}}, coaching in {{city}}, {{institution_name}} fees"
                    className="text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="seo-canonical">Canonical URL (`&lt;link rel=&quot;canonical&quot;&gt;`)</Label>
                    <Input
                      id="seo-canonical"
                      value={formCanonical}
                      onFocus={() => setActiveFocusedField("canonical")}
                      onChange={(e) => setFormCanonical(e.target.value)}
                      placeholder="e.g. https://edubird.net/courses/{{slug}}"
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="seo-robots">Robots Indexing Directive</Label>
                    <Select value={formRobots} onValueChange={setFormRobots}>
                      <SelectTrigger id="seo-robots" className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="index, follow">index, follow (Standard Indexing)</SelectItem>
                        <SelectItem value="noindex, follow">noindex, follow (Hide page, follow links)</SelectItem>
                        <SelectItem value="noindex, nofollow">noindex, nofollow (Private page)</SelectItem>
                        <SelectItem value="index, nofollow">index, nofollow (Index page, ignore links)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: OpenGraph & Social Previews */}
              <TabsContent value="opengraph" className="space-y-4 pt-3 text-xs">
                <div className="space-y-1.5">
                  <Label htmlFor="seo-ogtitle">OpenGraph Title (`&lt;meta property=&quot;og:title&quot;&gt;`)</Label>
                  <Input
                    id="seo-ogtitle"
                    value={formOgTitle}
                    onFocus={() => setActiveFocusedField("og_title")}
                    onChange={(e) => setFormOgTitle(e.target.value)}
                    placeholder="Leave empty to fallback to Meta Title"
                    className="text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="seo-ogdesc">OpenGraph Description (`&lt;meta property=&quot;og:description&quot;&gt;`)</Label>
                  <Textarea
                    id="seo-ogdesc"
                    rows={2}
                    value={formOgDesc}
                    onFocus={() => setActiveFocusedField("og_desc")}
                    onChange={(e) => setFormOgDesc(e.target.value)}
                    placeholder="Leave empty to fallback to Meta Description"
                    className="text-xs leading-relaxed"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="seo-ogimg">OpenGraph Social Image (`og:image`)</Label>
                    <Input
                      id="seo-ogimg"
                      value={formOgImage}
                      onChange={(e) => setFormOgImage(e.target.value)}
                      placeholder="e.g. {{thumbnail}} or https://images.unsplash.com/..."
                      className="text-xs font-mono"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="seo-ogurl">OpenGraph Target URL (`og:url`)</Label>
                    <Input
                      id="seo-ogurl"
                      value={formOgUrl}
                      onChange={(e) => setFormOgUrl(e.target.value)}
                      placeholder="e.g. https://edubird.net/courses/{{slug}}"
                      className="text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="seo-schema">Structured Data Schema Type (`JSON-LD`)</Label>
                  <Select value={formSchemaType} onValueChange={setFormSchemaType}>
                    <SelectTrigger id="seo-schema" className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="WebPage">WebPage (General)</SelectItem>
                      <SelectItem value="Course">Course (Educational Program)</SelectItem>
                      <SelectItem value="EducationalOrganization">EducationalOrganization (Institute)</SelectItem>
                      <SelectItem value="Article">Article (Blog / Guide)</SelectItem>
                      <SelectItem value="LocalBusiness">LocalBusiness (Vendor / Service)</SelectItem>
                      <SelectItem value="Product">Product (Plans / Package)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>

              {/* TAB 3: Conditional Rules */}
              <TabsContent value="conditional" className="space-y-4 pt-3 text-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-foreground">Conditional Meta Rules</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Add rules to automatically modify the Title and Description when dynamic parameters are present.
                    </p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={handleAddConditionalRule} className="gap-1 text-xs">
                    <Plus className="w-3.5 h-3.5" /> Add Rule
                  </Button>
                </div>

                {formConditionalRules.length === 0 ? (
                  <div className="p-6 border rounded-2xl text-center bg-muted/20 space-y-2">
                    <Sliders className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                    <p className="font-bold text-foreground">No conditional rules added</p>
                    <p className="text-[11px] text-muted-foreground">
                      Click &quot;Add Rule&quot; to append custom city, discount, or faculty tags conditionally.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {formConditionalRules.map((rule, idx) => (
                      <div key={idx} className="p-3 border rounded-xl bg-card flex flex-col sm:flex-row items-center gap-2">
                        <div className="w-full sm:w-1/3">
                          <Label className="text-[10px] text-muted-foreground block mb-1">Trigger Condition</Label>
                          <Select
                            value={rule.condition}
                            onValueChange={(val) => {
                              const updated = [...formConditionalRules];
                              updated[idx].condition = val;
                              setFormConditionalRules(updated);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="city_present">When City is present</SelectItem>
                              <SelectItem value="area_present">When Area is present</SelectItem>
                              <SelectItem value="discount_active">When Discount is active</SelectItem>
                              <SelectItem value="rating_high">When Rating &gt;= 4.5</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-full sm:w-1/3">
                          <Label className="text-[10px] text-muted-foreground block mb-1">Action</Label>
                          <Select
                            value={rule.action}
                            onValueChange={(val) => {
                              const updated = [...formConditionalRules];
                              updated[idx].action = val;
                              setFormConditionalRules(updated);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="append_title">Append to Title</SelectItem>
                              <SelectItem value="prepend_title">Prepend to Title</SelectItem>
                              <SelectItem value="append_desc">Append to Description</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="w-full sm:flex-1">
                          <Label className="text-[10px] text-muted-foreground block mb-1">Value / Text</Label>
                          <Input
                            value={rule.value}
                            onChange={(e) => {
                              const updated = [...formConditionalRules];
                              updated[idx].value = e.target.value;
                              setFormConditionalRules(updated);
                            }}
                            placeholder="e.g. in {{city}}, {{state}}"
                            className="h-8 text-xs"
                          />
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveConditionalRule(idx)}
                          className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 self-end sm:self-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* TAB 4: Live SERP & Social Previews */}
              <TabsContent value="preview" className="space-y-5 pt-3 text-xs">
                <div className="flex items-center justify-between border-b pb-2">
                  <div>
                    <h4 className="font-bold text-foreground">Live Search & Social Previews</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Real-time simulation of how your page appears on Google search and social media feeds.
                    </p>
                  </div>
                  <div className="flex items-center gap-1 bg-muted p-1 rounded-xl">
                    <Button
                      type="button"
                      variant={previewDevice === "desktop" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setPreviewDevice("desktop")}
                      className="h-7 text-xs gap-1 rounded-lg"
                    >
                      <Monitor className="w-3 h-3" /> Desktop
                    </Button>
                    <Button
                      type="button"
                      variant={previewDevice === "mobile" ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setPreviewDevice("mobile")}
                      className="h-7 text-xs gap-1 rounded-lg"
                    >
                      <Smartphone className="w-3 h-3" /> Mobile
                    </Button>
                  </div>
                </div>

                {/* Google SERP Snippet Preview */}
                <div className="space-y-2">
                  <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-blue-600" /> Google Search Engine Result Snippet
                  </span>
                  <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-sm space-y-1 max-w-2xl font-sans">
                    <div className="flex items-center gap-2 text-[12px] text-[#202124] leading-tight">
                      <div className="w-6 h-6 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-[10px] font-bold text-rose-700">
                        E
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-[#202124]">EduBird Platform</span>
                        <span className="text-[11px] text-[#4d5156] font-mono truncate">
                          {resolvedPreview.canonicalUrl || `https://edubird.net${formPath}`}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-[#1a0dab] hover:underline text-[18px] font-medium leading-normal cursor-pointer pt-1">
                      {resolvedPreview.title || "Page Title Here"}
                    </h3>
                    <p className="text-[#4d5156] text-[13px] leading-relaxed">
                      {resolvedPreview.description || "Meta description snippet will be rendered here."}
                    </p>
                  </div>
                </div>

                {/* Social Share Preview Card (OpenGraph) */}
                <div className="space-y-2 pt-2">
                  <span className="font-bold text-foreground text-xs flex items-center gap-1.5">
                    <Share2 className="w-3.5 h-3.5 text-emerald-600" /> OpenGraph Social Preview Card (WhatsApp, Facebook, LinkedIn)
                  </span>
                  <div className="max-w-md rounded-2xl border border-border overflow-hidden bg-card shadow-md">
                    <div className="h-44 bg-muted flex items-center justify-center text-muted-foreground relative overflow-hidden">
                      {resolvedPreview.openGraph.images[0]?.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={resolvedPreview.openGraph.images[0].url}
                          alt={resolvedPreview.openGraph.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Share2 className="w-8 h-8 opacity-40" />
                          <span className="text-[11px]">Social Image Preview</span>
                        </div>
                      )}
                    </div>
                    <div className="p-3.5 space-y-1">
                      <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider font-mono">
                        edubird.net
                      </span>
                      <h4 className="font-bold text-sm leading-snug text-foreground">
                        {resolvedPreview.openGraph.title}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {resolvedPreview.openGraph.description}
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="gap-2 pt-2 border-t">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-primary font-bold">
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingTag ? "Update SEO Configuration" : "Save SEO Configuration"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
