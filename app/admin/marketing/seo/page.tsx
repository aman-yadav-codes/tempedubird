"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
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
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  Compass,
  Copy,
  Edit,
  ExternalLink,
  Eye,
  FileText,
  Globe,
  HelpCircle,
  Info,
  Layers,
  Link as LinkIcon,
  Loader2,
  Monitor,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Smartphone,
  Sparkles,
  Tag,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { resolveSeoMetadata, SeoContextData, ConditionalRule } from "@/lib/seo/metadata-resolver";
import { cn } from "@/lib/utils";

export const PRESET_ROUTES = [
  { path: "/business/[slug]", name: "Business Detail", type: "dynamic_template", entity: "institution", initial: "B" },
  { path: "/services/[category]", name: "Category", type: "dynamic_template", entity: "category", initial: "C" },
  { path: "/courses/[slug]", name: "Course Detail", type: "dynamic_template", entity: "course", initial: "C" },
  { path: "/", name: "Home Page", type: "static", entity: "general", initial: "H" },
  { path: "/blog/[slug]", name: "Blog & Article", type: "dynamic_template", entity: "blog", initial: "B" },
  { path: "/vendors", name: "Services & Vendors", type: "static", entity: "vendor", initial: "S" },
  { path: "/location/[city]", name: "Location Hub", type: "dynamic_template", entity: "location", initial: "L" },
  { path: "/courses", name: "Courses Catalog", type: "static", entity: "course", initial: "C" },
  { path: "/pricing", name: "Pricing & Membership", type: "static", entity: "pricing", initial: "P" },
  { path: "/contact", name: "Contact & Branches", type: "static", entity: "general", initial: "C" },
];

export const AVAILABLE_VARIABLES = [
  { tag: "{{site_name}}", label: "Site Name", desc: "Platform brand name (e.g. EduBird)" },
  { tag: "{{course_title}}", label: "Course Title", desc: "Title of the course" },
  { tag: "{{institution_name}}", label: "Institute Name", desc: "Name of the institute/business" },
  { tag: "{{teacher_name}}", label: "Teacher Name", desc: "Faculty/Teacher name" },
  { tag: "{{blog_title}}", label: "Blog Title", desc: "Article headline" },
  { tag: "{{city}}", label: "City", desc: "Location city (e.g. Indore)" },
  { tag: "{{area}}", label: "Area / Locality", desc: "Location area (e.g. Bhawarkua)" },
  { tag: "{{state}}", label: "State", desc: "State name (e.g. Madhya Pradesh)" },
  { tag: "{{category}}", label: "Category", desc: "Subject or business category" },
  { tag: "{{price}}", label: "Price / Fees", desc: "Course price or discount" },
  { tag: "{{current_year}}", label: "Current Year", desc: "e.g. 2026" },
  { tag: "{{thumbnail}}", label: "Thumbnail URL", desc: "Feature image URL" },
];

export type SeoTag = {
  id: number;
  page_path: string;
  route_path?: string;
  template_name?: string;
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

export type GlobalSeoSettings = {
  site_name: string;
  title_suffix: string;
  default_meta_description: string;
  default_og_image: string;
  default_robots_index: string;
  default_robots_follow: string;
  google_search_console_tag?: string;
  bing_webmaster_tag?: string;
  google_analytics_id?: string;
  gtm_container_id?: string;
  organization_schema?: Record<string, any>;
};

export default function SeoManagementPage() {
  const { accessToken } = useAuthStore();
  const [tags, setTags] = useState<SeoTag[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSeoSettings>({
    site_name: "EduBird",
    title_suffix: " | EduBird",
    default_meta_description: "Manage default SEO templates, custom page SEO settings, and global defaults for public EduBird pages.",
    default_og_image: "/images/og-home.jpg",
    default_robots_index: "Index",
    default_robots_follow: "Follow",
    google_search_console_tag: "",
    bing_webmaster_tag: "",
    google_analytics_id: "",
    gtm_container_id: "",
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"templates" | "custom_pages" | "builder" | "global">("templates");
  const [expandedTagIds, setExpandedTagIds] = useState<Set<number>>(new Set());
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Dialog State (Edit / Add)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<SeoTag | null>(null);
  const [saving, setSaving] = useState(false);
  const [activeFormTab, setActiveFormTab] = useState<"meta" | "social" | "preview">("meta");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");

  // Form fields
  const [formPath, setFormPath] = useState("/");
  const [formTemplateName, setFormTemplateName] = useState("");
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

  // Global Settings Form state
  const [globalForm, setGlobalForm] = useState<GlobalSeoSettings>(globalSettings);
  const [savingGlobal, setSavingGlobal] = useState(false);

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
      if (data.global_settings) {
        setGlobalSettings(data.global_settings);
        setGlobalForm(data.global_settings);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch SEO tags");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Expand / Collapse
  const toggleExpand = (id: number) => {
    setExpandedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleExpandAll = () => {
    if (expandedTagIds.size > 0) {
      setExpandedTagIds(new Set());
    } else {
      const allIds = new Set(tags.map((t) => t.id));
      setExpandedTagIds(allIds);
    }
  };

  // Quick Inline Toggle: Active, Index, Follow
  const handleTogglePill = async (tag: SeoTag, field: "active" | "index" | "follow") => {
    setTogglingId(tag.id);
    try {
      const body: Record<string, any> = { id: tag.id };
      if (field === "active") {
        body.is_active = !tag.is_active;
      } else if (field === "index") {
        body.toggle_index = true;
      } else if (field === "follow") {
        body.toggle_follow = true;
      }

      const res = await fetch("/api/admin/seo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update status");

      setTags((prev) =>
        prev.map((t) => (t.id === tag.id ? { ...t, ...data.tag } : t))
      );
      toast.success(
        field === "active"
          ? `Template is now ${data.tag.is_active ? "Active" : "Inactive"}`
          : field === "index"
          ? `Indexing directive set to ${data.tag.robots_directive}`
          : `Follow directive updated`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update toggle");
    } finally {
      setTogglingId(null);
    }
  };

  // Open Edit / Add
  const handleOpenAdd = (customPath?: string) => {
    setEditingTag(null);
    setFormPath(customPath || "/");
    setFormTemplateName("");
    setFormPageType(customPath && customPath.includes("[") ? "dynamic_template" : "static");
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
      { condition: "city_present", action: "append_title", value: "in {{city}}, {{state}}" },
    ]);
    setActiveFormTab("meta");
    setDialogOpen(true);
  };

  const handleOpenEdit = (t: SeoTag) => {
    setEditingTag(t);
    setFormPath(t.page_path);
    setFormTemplateName(t.template_name || "");
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
      setFormKeywords((prev) => (prev ? `${prev}, ${variableTag}` : variableTag));
    } else if (activeFocusedField === "og_title") {
      setFormOgTitle((prev) => `${prev} ${variableTag}`.trim());
    } else if (activeFocusedField === "og_desc") {
      setFormOgDesc((prev) => `${prev} ${variableTag}`.trim());
    } else if (activeFocusedField === "canonical") {
      setFormCanonical((prev) => `${prev}${variableTag}`);
    }
    toast.success(`Inserted ${variableTag}`);
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
          template_name: formTemplateName.trim() || undefined,
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

  const handleSaveGlobal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingGlobal(true);
    try {
      const res = await fetch("/api/admin/seo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save_global_settings",
          ...globalForm,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save global settings");

      setGlobalSettings(data.global_settings);
      toast.success("Global SEO settings saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save global settings");
    } finally {
      setSavingGlobal(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this SEO meta configuration?")) return;
    try {
      const res = await fetch(`/api/admin/seo?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("SEO configuration deleted");
        fetchTags();
      }
    } catch {
      toast.error("Failed to delete SEO config");
    }
  };

  // Live Resolved Preview Output for dialog
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
      canonical_url: formCanonical,
      robots_directive: formRobots,
      schema_markup_type: formSchemaType,
      conditional_rules: formConditionalRules,
      is_active: true,
    },
    previewContext
  );

  // Group tags into Templates vs Custom Static Pages
  const templatesList = useMemo(
    () => tags.filter((t) => t.page_type === "dynamic_template" || t.page_path.includes("[")),
    [tags]
  );
  const customPagesList = useMemo(
    () => tags.filter((t) => t.page_type === "static" && !t.page_path.includes("[")),
    [tags]
  );

  // Filter based on search query
  const filteredTemplates = useMemo(() => {
    if (!searchQuery.trim()) return templatesList;
    const q = searchQuery.toLowerCase();
    return templatesList.filter(
      (t) =>
        t.page_path.toLowerCase().includes(q) ||
        (t.template_name && t.template_name.toLowerCase().includes(q)) ||
        t.meta_title.toLowerCase().includes(q)
    );
  }, [templatesList, searchQuery]);

  const filteredCustomPages = useMemo(() => {
    if (!searchQuery.trim()) return customPagesList;
    const q = searchQuery.toLowerCase();
    return customPagesList.filter(
      (t) =>
        t.page_path.toLowerCase().includes(q) ||
        (t.template_name && t.template_name.toLowerCase().includes(q)) ||
        t.meta_title.toLowerCase().includes(q)
    );
  }, [customPagesList, searchQuery]);

  // Helper to parse robots status
  const getRobotsStatus = (directive: string) => {
    const d = (directive || "index, follow").toLowerCase();
    const isIndex = d.includes("index") && !d.includes("noindex");
    const isFollow = d.includes("follow") && !d.includes("nofollow");
    return { isIndex, isFollow };
  };

  // Helper to get letter avatar
  const getInitial = (tag: SeoTag) => {
    if (tag.template_name) return tag.template_name.charAt(0).toUpperCase();
    if (tag.page_path.startsWith("/business")) return "B";
    if (tag.page_path.startsWith("/services") || tag.page_path.startsWith("/courses/category")) return "C";
    if (tag.page_path.startsWith("/courses")) return "C";
    if (tag.page_path === "/") return "H";
    if (tag.page_path.startsWith("/blog")) return "B";
    if (tag.page_path.startsWith("/vendors")) return "S";
    if (tag.page_path.startsWith("/location")) return "L";
    return tag.page_path.replace(/^\//, "").charAt(0).toUpperCase() || "P";
  };

  // Helper for Template Title display
  const getDisplayName = (tag: SeoTag) => {
    if (tag.template_name) return tag.template_name;
    if (tag.page_path === "/business/[slug]") return "Business Detail";
    if (tag.page_path === "/services/[category]") return "Category";
    if (tag.page_path === "/courses/[slug]") return "Course Detail";
    if (tag.page_path === "/") return "Home Page";
    if (tag.page_path === "/blog/[slug]") return "Blog & Article";
    if (tag.page_path === "/vendors") return "Services & Vendors";
    if (tag.page_path === "/location/[city]") return "Location Hub";
    return tag.page_path;
  };

  // Render a Template / Page Row Card matching the user's screenshot
  const renderItemCard = (tag: SeoTag) => {
    const isExpanded = expandedTagIds.has(tag.id);
    const { isIndex, isFollow } = getRobotsStatus(tag.robots_directive);
    const initial = getInitial(tag);
    const displayName = getDisplayName(tag);

    return (
      <div
        key={tag.id}
        className="rounded-2xl border border-white/10 bg-[#241f1c]/80 hover:bg-[#28221f]/90 transition-all shadow-sm overflow-hidden"
      >
        {/* Card Header Row */}
        <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            {/* Circle Avatar Badge with Initial */}
            <div className="w-10 h-10 rounded-full bg-[#523223] text-[#f28c5a] border border-[#f28c5a]/30 font-bold flex items-center justify-center text-sm shrink-0 shadow-inner">
              {initial}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-bold text-white truncate tracking-tight">
                {displayName}
              </h3>
              <p className="text-xs font-mono text-zinc-400 truncate">
                {tag.page_path}
              </p>
            </div>
          </div>

          {/* Right Action Pills */}
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {/* Active Toggle Pill */}
            <button
              type="button"
              disabled={togglingId === tag.id}
              onClick={() => handleTogglePill(tag, "active")}
              className={cn(
                "h-8 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer",
                tag.is_active
                  ? "bg-[#e06836] hover:bg-[#cf5c2c] text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              )}
              title="Toggle Active Status"
            >
              {tag.is_active ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
              <span>{tag.is_active ? "Active" : "Inactive"}</span>
            </button>

            {/* Index Toggle Pill */}
            <button
              type="button"
              disabled={togglingId === tag.id}
              onClick={() => handleTogglePill(tag, "index")}
              className={cn(
                "h-8 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer",
                isIndex
                  ? "bg-[#e06836] hover:bg-[#cf5c2c] text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              )}
              title="Toggle Indexing Directive"
            >
              {isIndex ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
              <span>{isIndex ? "Index" : "NoIndex"}</span>
            </button>

            {/* Follow Toggle Pill */}
            <button
              type="button"
              disabled={togglingId === tag.id}
              onClick={() => handleTogglePill(tag, "follow")}
              className={cn(
                "h-8 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer",
                isFollow
                  ? "bg-[#e06836] hover:bg-[#cf5c2c] text-white"
                  : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
              )}
              title="Toggle Follow Directive"
            >
              {isFollow ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <X className="w-3.5 h-3.5" />}
              <span>{isFollow ? "Follow" : "NoFollow"}</span>
            </button>

            {/* Expand / Collapse Chevron Button */}
            <button
              type="button"
              onClick={() => toggleExpand(tag.id)}
              className="w-8 h-8 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 flex items-center justify-center transition-colors cursor-pointer border border-white/5"
              title={isExpanded ? "Collapse Details" : "Expand Details"}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4 text-zinc-300" />
              ) : (
                <ChevronDown className="w-4 h-4 text-zinc-300" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded Drawer Details */}
        {isExpanded && (
          <div className="border-t border-white/10 bg-[#1e1917]/70 p-4 sm:p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Meta Title Template */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-muted-foreground font-semibold">
                  <span>Meta Title Tag Pattern</span>
                  <span className="font-mono text-[10px]">{tag.meta_title.length} chars</span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-zinc-200 font-mono text-xs break-words">
                  {tag.meta_title}
                </div>
              </div>

              {/* Meta Description Template */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-muted-foreground font-semibold">
                  <span>Meta Description Pattern</span>
                  <span className="font-mono text-[10px]">
                    {tag.meta_description?.length || 0} chars
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-zinc-200 font-mono text-xs break-words">
                  {tag.meta_description || <span className="text-zinc-500 italic">No description defined</span>}
                </div>
              </div>
            </div>

            {/* Keywords & Schema Info */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-white/5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-zinc-400 font-semibold">Schema:</span>
                <Badge variant="outline" className="bg-[#e06836]/10 text-[#f28c5a] border-[#e06836]/30 text-[10px] font-mono">
                  {tag.schema_markup_type || "WebPage"}
                </Badge>
                {tag.canonical_url && (
                  <>
                    <span className="text-zinc-600">|</span>
                    <span className="text-[11px] text-zinc-400 font-semibold">Canonical:</span>
                    <span className="font-mono text-[10px] text-zinc-300 truncate max-w-[200px]">
                      {tag.canonical_url}
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEdit(tag)}
                  className="h-8 text-xs font-bold gap-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-white border-white/10"
                >
                  <Edit className="w-3.5 h-3.5 text-[#e06836]" />
                  <span>Edit Template</span>
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(tag.id)}
                  className="h-8 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#1c1816] text-zinc-100 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Banner matching the user screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div className="space-y-1.5">
          {/* Orange Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#3d2417] border border-[#e06836]/40 text-[#f28c5a] text-[10px] font-extrabold uppercase tracking-widest">
            <Settings className="w-3 h-3 text-[#f28c5a]" />
            <span>SEARCH VISIBILITY</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            SEO & Meta Tags
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl">
            Manage default SEO templates, custom page SEO settings, and global defaults for public EduBird pages.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTags}
            disabled={loading}
            className="h-10 text-xs font-bold bg-zinc-800/60 border-white/10 text-zinc-200 hover:bg-zinc-800"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin text-[#e06836]")} />
            Refresh
          </Button>

          {/* "+ Custom Page SEO" Orange CTA Button */}
          <Button
            onClick={() => {
              setActiveTab("builder");
              handleOpenAdd();
            }}
            className="h-10 px-4 bg-[#e06836] hover:bg-[#cf5c2c] text-white font-bold rounded-xl shadow-lg shadow-[#e06836]/20 gap-1.5 text-xs sm:text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Custom Page SEO</span>
          </Button>
        </div>
      </div>

      {/* Top 4 Stat / Metric Cards matching the user screenshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Templates */}
        <div className="rounded-2xl border border-white/10 bg-[#251f1c]/70 p-4 sm:p-5 backdrop-blur-md shadow-sm space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3d2417] text-[#f28c5a] border border-[#e06836]/30 flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-wider">
                Templates
              </span>
              <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                {templatesList.length}/{templatesList.length}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Templates */}
        <div className="rounded-2xl border border-white/10 bg-[#251f1c]/70 p-4 sm:p-5 backdrop-blur-md shadow-sm space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3d2417] text-[#f28c5a] border border-[#e06836]/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-wider">
                Active Templates
              </span>
              <span className="text-2xl sm:text-3xl font-black font-mono text-white tracking-tight">
                {templatesList.filter((t) => t.is_active).length}
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Default Robots Index */}
        <div className="rounded-2xl border border-white/10 bg-[#251f1c]/70 p-4 sm:p-5 backdrop-blur-md shadow-sm space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3d2417] text-[#f28c5a] border border-[#e06836]/30 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-wider truncate">
                Default Robots Index
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {globalSettings.default_robots_index || "Index"}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Default Robots Follow */}
        <div className="rounded-2xl border border-white/10 bg-[#251f1c]/70 p-4 sm:p-5 backdrop-blur-md shadow-sm space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3d2417] text-[#f28c5a] border border-[#e06836]/30 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-wider truncate">
                Default Robots Follow
              </span>
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {globalSettings.default_robots_follow || "Follow"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Row matching the user screenshot */}
      <div className="border-b border-white/10 flex items-center gap-6 overflow-x-auto text-sm font-bold pb-0">
        {[
          { id: "templates", label: "Default Templates" },
          { id: "custom_pages", label: "Custom Pages" },
          { id: "builder", label: "Custom Page SEO" },
          { id: "global", label: "Global Settings" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "pb-3.5 transition-all cursor-pointer whitespace-nowrap font-bold text-sm sm:text-base relative",
              activeTab === tab.id
                ? "text-[#e06836]"
                : "text-zinc-400 hover:text-zinc-200"
            )}
          >
            <span>{tab.label}</span>
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#e06836] rounded-full shadow-sm shadow-[#e06836]" />
            )}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: 1. Default Templates */}
      {activeTab === "templates" && (
        <div className="space-y-4">
          {/* Search & Action Bar matching screenshot */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Dark Search Box */}
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates by page type, title, or URL..."
                className="pl-10 h-10 text-xs bg-[#241f1c] border-white/10 rounded-xl text-white placeholder:text-zinc-500 focus-visible:ring-[#e06836]"
              />
            </div>

            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-xs text-zinc-400 font-medium">
                {filteredTemplates.length} of {templatesList.length} templates
              </span>

              {/* Expand All Button */}
              <button
                type="button"
                onClick={handleExpandAll}
                className="px-3.5 py-2 rounded-xl bg-[#241f1c] hover:bg-zinc-800 text-xs font-bold text-zinc-300 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>◇</span>
                <span>{expandedTagIds.size > 0 ? "Collapse All" : "Expand All"}</span>
              </button>
            </div>
          </div>

          {/* List of Template Cards */}
          {loading ? (
            <div className="p-12 text-center text-zinc-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#e06836]" />
              <p className="text-xs">Loading SEO default templates...</p>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="p-8 text-center bg-[#241f1c]/50 rounded-2xl border border-white/10 text-zinc-400 text-xs">
              No matching SEO templates found.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTemplates.map((t) => renderItemCard(t))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 2. Custom Pages */}
      {activeTab === "custom_pages" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative flex-1 w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search custom pages by route, title, or keywords..."
                className="pl-10 h-10 text-xs bg-[#241f1c] border-white/10 rounded-xl text-white placeholder:text-zinc-500 focus-visible:ring-[#e06836]"
              />
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <span className="text-xs text-zinc-400 font-medium">
                {filteredCustomPages.length} of {customPagesList.length} custom pages
              </span>

              <Button
                onClick={() => handleOpenAdd("/about")}
                size="sm"
                className="bg-[#e06836] hover:bg-[#cf5c2c] text-white text-xs font-bold gap-1 rounded-xl"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Custom Page</span>
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="p-12 text-center text-zinc-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#e06836]" />
              <p className="text-xs">Loading custom pages...</p>
            </div>
          ) : filteredCustomPages.length === 0 ? (
            <div className="p-8 text-center bg-[#241f1c]/50 rounded-2xl border border-white/10 text-zinc-400 text-xs space-y-2">
              <p>No custom static pages configured yet.</p>
              <Button
                onClick={() => handleOpenAdd("/about")}
                size="sm"
                variant="outline"
                className="text-xs border-white/10 text-zinc-200"
              >
                Configure First Custom Page
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCustomPages.map((t) => renderItemCard(t))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 3. Custom Page SEO Builder */}
      {activeTab === "builder" && (
        <Card className="rounded-2xl border-white/10 bg-[#241f1c]/80 text-zinc-100 p-6 space-y-6">
          <CardHeader className="p-0">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Wand2 className="w-5 h-5 text-[#e06836]" />
              <span>Custom Page SEO Builder</span>
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Define custom title tags, meta descriptions, OpenGraph social cards, and schema definitions for any page.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-semibold">Route Path *</Label>
                <Input
                  required
                  value={formPath}
                  onChange={(e) => setFormPath(e.target.value)}
                  placeholder="/summer-camp-2026 or /courses/[slug]"
                  className="bg-black/30 border-white/10 text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-semibold">Template Display Name</Label>
                <Input
                  value={formTemplateName}
                  onChange={(e) => setFormTemplateName(e.target.value)}
                  placeholder="e.g. Summer Camp Program"
                  className="bg-black/30 border-white/10 text-xs"
                />
              </div>
            </div>

            {/* Variable Inserter Chips */}
            <div className="space-y-1.5 bg-black/20 p-3 rounded-xl border border-white/5">
              <span className="text-[11px] font-bold text-zinc-400 block uppercase tracking-wider">
                Click to Insert Dynamic Variable
              </span>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {AVAILABLE_VARIABLES.map((v) => (
                  <button
                    key={v.tag}
                    type="button"
                    onClick={() => handleInsertVariable(v.tag)}
                    className="px-2 py-0.5 rounded-lg bg-[#3d2417] hover:bg-[#523223] border border-[#e06836]/30 text-[#f28c5a] text-[10px] font-mono cursor-pointer transition-colors"
                    title={v.desc}
                  >
                    {v.tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-300">
                <Label className="font-semibold">Meta Title Tag *</Label>
                <span className={cn("font-mono text-[10px]", formTitle.length > 60 ? "text-amber-400" : "text-zinc-400")}>
                  {formTitle.length}/60 chars
                </span>
              </div>
              <Input
                required
                value={formTitle}
                onFocus={() => setActiveFocusedField("title")}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Page Title Tag..."
                className="bg-black/30 border-white/10 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-zinc-300">
                <Label className="font-semibold">Meta Description</Label>
                <span className={cn("font-mono text-[10px]", formDesc.length > 160 ? "text-amber-400" : "text-zinc-400")}>
                  {formDesc.length}/160 chars
                </span>
              </div>
              <Textarea
                rows={3}
                value={formDesc}
                onFocus={() => setActiveFocusedField("desc")}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Comprehensive meta description summarizing page value..."
                className="bg-black/30 border-white/10 text-xs leading-relaxed"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-semibold">Keywords (comma-separated)</Label>
                <Input
                  value={formKeywords}
                  onFocus={() => setActiveFocusedField("keywords")}
                  onChange={(e) => setFormKeywords(e.target.value)}
                  placeholder="coaching, test series, best faculty"
                  className="bg-black/30 border-white/10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-semibold">Canonical URL</Label>
                <Input
                  value={formCanonical}
                  onFocus={() => setActiveFocusedField("canonical")}
                  onChange={(e) => setFormCanonical(e.target.value)}
                  placeholder="https://edubird.net/..."
                  className="bg-black/30 border-white/10 text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-semibold">Robots Directive</Label>
                <Select value={formRobots} onValueChange={setFormRobots}>
                  <SelectTrigger className="bg-black/30 border-white/10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#241f1c] border-white/10 text-white">
                    <SelectItem value="index, follow">index, follow (Recommended)</SelectItem>
                    <SelectItem value="noindex, follow">noindex, follow</SelectItem>
                    <SelectItem value="index, nofollow">index, nofollow</SelectItem>
                    <SelectItem value="noindex, nofollow">noindex, nofollow</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-semibold">Schema Markup Type</Label>
                <Select value={formSchemaType} onValueChange={setFormSchemaType}>
                  <SelectTrigger className="bg-black/30 border-white/10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#241f1c] border-white/10 text-white">
                    <SelectItem value="WebPage">WebPage</SelectItem>
                    <SelectItem value="Course">Course</SelectItem>
                    <SelectItem value="EducationalOrganization">EducationalOrganization</SelectItem>
                    <SelectItem value="Article">Article</SelectItem>
                    <SelectItem value="CollectionPage">CollectionPage</SelectItem>
                    <SelectItem value="LocalBusiness">LocalBusiness</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-3 border-t border-white/10">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveTab("templates")}
                className="text-xs border-white/10"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#e06836] hover:bg-[#cf5c2c] text-white text-xs font-bold"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Save Page SEO Configuration
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* TAB CONTENT: 4. Global Settings */}
      {activeTab === "global" && (
        <Card className="rounded-2xl border-white/10 bg-[#241f1c]/80 text-zinc-100 p-6 space-y-6">
          <CardHeader className="p-0">
            <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-[#e06836]" />
              <span>Global SEO & Webmaster Defaults</span>
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400">
              Configure global fallbacks, default robot crawlers behavior, site title templates, and Google search verification tags.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSaveGlobal} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-semibold">Site Name</Label>
                <Input
                  value={globalForm.site_name}
                  onChange={(e) => setGlobalForm({ ...globalForm, site_name: e.target.value })}
                  placeholder="EduBird"
                  className="bg-black/30 border-white/10 text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-semibold">Site Title Suffix</Label>
                <Input
                  value={globalForm.title_suffix}
                  onChange={(e) => setGlobalForm({ ...globalForm, title_suffix: e.target.value })}
                  placeholder=" | EduBird"
                  className="bg-black/30 border-white/10 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-300 font-semibold">Default Fallback Meta Description</Label>
              <Textarea
                rows={2}
                value={globalForm.default_meta_description}
                onChange={(e) => setGlobalForm({ ...globalForm, default_meta_description: e.target.value })}
                placeholder="Fallback description when a page doesn't have a specific meta description..."
                className="bg-black/30 border-white/10 text-xs"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-semibold">Default Robots Index</Label>
                <Select
                  value={globalForm.default_robots_index}
                  onValueChange={(val) => setGlobalForm({ ...globalForm, default_robots_index: val })}
                >
                  <SelectTrigger className="bg-black/30 border-white/10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#241f1c] border-white/10 text-white">
                    <SelectItem value="Index">Index (Allow Search Engines to Index)</SelectItem>
                    <SelectItem value="NoIndex">NoIndex (Disallow Indexing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-300 font-semibold">Default Robots Follow</Label>
                <Select
                  value={globalForm.default_robots_follow}
                  onValueChange={(val) => setGlobalForm({ ...globalForm, default_robots_follow: val })}
                >
                  <SelectTrigger className="bg-black/30 border-white/10 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#241f1c] border-white/10 text-white">
                    <SelectItem value="Follow">Follow (Allow Crawlers to Follow Links)</SelectItem>
                    <SelectItem value="NoFollow">NoFollow (Do Not Follow Links)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Verification Codes */}
            <div className="p-4 rounded-xl bg-black/20 border border-white/5 space-y-3">
              <span className="text-xs font-bold text-white block">
                Webmaster & Search Console Verification
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-400">Google Site Verification Code</Label>
                  <Input
                    value={globalForm.google_search_console_tag || ""}
                    onChange={(e) => setGlobalForm({ ...globalForm, google_search_console_tag: e.target.value })}
                    placeholder="google-site-verification=xxxx..."
                    className="bg-black/30 border-white/10 text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-[11px] text-zinc-400">Bing Webmaster Code</Label>
                  <Input
                    value={globalForm.bing_webmaster_tag || ""}
                    onChange={(e) => setGlobalForm({ ...globalForm, bing_webmaster_tag: e.target.value })}
                    placeholder="msvalidate.01=xxxx..."
                    className="bg-black/30 border-white/10 text-xs font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Quick Links for XML Sitemap & Robots.txt */}
            <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-white/10 text-xs">
              <div className="flex items-center gap-3 text-zinc-400">
                <a
                  href="/sitemap.xml"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[#e06836] hover:underline"
                >
                  <span>/sitemap.xml</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <span>•</span>
                <a
                  href="/robots.txt"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[#e06836] hover:underline"
                >
                  <span>/robots.txt</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <Button
                type="submit"
                disabled={savingGlobal}
                className="bg-[#e06836] hover:bg-[#cf5c2c] text-white text-xs font-bold"
              >
                {savingGlobal && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Save Global Defaults
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Edit / Add Modal with Live Google SERP and Social Card Previews */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[700px] w-[95vw] bg-[#241f1c] text-zinc-100 border-white/10 p-6 space-y-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Edit className="w-5 h-5 text-[#e06836]" />
              <span>{editingTag ? `Edit SEO: ${editingTag.page_path}` : "Configure New Page SEO"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Customize meta tags, dynamic variables, and preview the live Google search snippet.
            </DialogDescription>
          </DialogHeader>

          {/* Form Tabs */}
          <div className="flex items-center gap-3 border-b border-white/10 pb-2 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveFormTab("meta")}
              className={cn("pb-1 cursor-pointer", activeFormTab === "meta" ? "text-[#e06836] border-b-2 border-[#e06836]" : "text-zinc-400")}
            >
              Meta & Tags
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab("social")}
              className={cn("pb-1 cursor-pointer", activeFormTab === "social" ? "text-[#e06836] border-b-2 border-[#e06836]" : "text-zinc-400")}
            >
              OpenGraph Social Cards
            </button>
            <button
              type="button"
              onClick={() => setActiveFormTab("preview")}
              className={cn("pb-1 cursor-pointer", activeFormTab === "preview" ? "text-[#e06836] border-b-2 border-[#e06836]" : "text-zinc-400")}
            >
              Live Search SERP Preview
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            {activeFormTab === "meta" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-300">Route Path *</Label>
                    <Input
                      required
                      value={formPath}
                      onChange={(e) => setFormPath(e.target.value)}
                      placeholder="/courses/[slug]"
                      className="bg-black/30 border-white/10 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-300">Template Display Name</Label>
                    <Input
                      value={formTemplateName}
                      onChange={(e) => setFormTemplateName(e.target.value)}
                      placeholder="e.g. Course Detail"
                      className="bg-black/30 border-white/10 text-xs"
                    />
                  </div>
                </div>

                {/* Variable Inserter Chips */}
                <div className="space-y-1 bg-black/20 p-2.5 rounded-xl border border-white/5">
                  <span className="text-[10px] font-bold text-zinc-400 block uppercase tracking-wider">
                    Click to Insert Variable
                  </span>
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {AVAILABLE_VARIABLES.map((v) => (
                      <button
                        key={v.tag}
                        type="button"
                        onClick={() => handleInsertVariable(v.tag)}
                        className="px-2 py-0.5 rounded bg-[#3d2417] hover:bg-[#523223] border border-[#e06836]/30 text-[#f28c5a] text-[10px] font-mono cursor-pointer"
                      >
                        {v.tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-zinc-300">
                    <Label>Meta Title Tag *</Label>
                    <span className="font-mono text-[10px] text-zinc-400">{formTitle.length}/60</span>
                  </div>
                  <Input
                    required
                    value={formTitle}
                    onFocus={() => setActiveFocusedField("title")}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="bg-black/30 border-white/10 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-zinc-300">
                    <Label>Meta Description</Label>
                    <span className="font-mono text-[10px] text-zinc-400">{formDesc.length}/160</span>
                  </div>
                  <Textarea
                    rows={3}
                    value={formDesc}
                    onFocus={() => setActiveFocusedField("desc")}
                    onChange={(e) => setFormDesc(e.target.value)}
                    className="bg-black/30 border-white/10 text-xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-300">Robots Directive</Label>
                    <Select value={formRobots} onValueChange={setFormRobots}>
                      <SelectTrigger className="bg-black/30 border-white/10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#241f1c] border-white/10 text-white">
                        <SelectItem value="index, follow">index, follow</SelectItem>
                        <SelectItem value="noindex, follow">noindex, follow</SelectItem>
                        <SelectItem value="index, nofollow">index, nofollow</SelectItem>
                        <SelectItem value="noindex, nofollow">noindex, nofollow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs text-zinc-300">Schema Type</Label>
                    <Select value={formSchemaType} onValueChange={setFormSchemaType}>
                      <SelectTrigger className="bg-black/30 border-white/10 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#241f1c] border-white/10 text-white">
                        <SelectItem value="WebPage">WebPage</SelectItem>
                        <SelectItem value="Course">Course</SelectItem>
                        <SelectItem value="EducationalOrganization">EducationalOrganization</SelectItem>
                        <SelectItem value="Article">Article</SelectItem>
                        <SelectItem value="CollectionPage">CollectionPage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {activeFormTab === "social" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs text-zinc-300">OpenGraph Title</Label>
                  <Input
                    value={formOgTitle}
                    onFocus={() => setActiveFocusedField("og_title")}
                    onChange={(e) => setFormOgTitle(e.target.value)}
                    placeholder="Defaults to Meta Title"
                    className="bg-black/30 border-white/10 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-zinc-300">OpenGraph Description</Label>
                  <Textarea
                    rows={2}
                    value={formOgDesc}
                    onFocus={() => setActiveFocusedField("og_desc")}
                    onChange={(e) => setFormOgDesc(e.target.value)}
                    placeholder="Defaults to Meta Description"
                    className="bg-black/30 border-white/10 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-zinc-300">Social Share Image URL (og:image)</Label>
                  <Input
                    value={formOgImage}
                    onChange={(e) => setFormOgImage(e.target.value)}
                    placeholder="https://... or {{thumbnail}}"
                    className="bg-black/30 border-white/10 text-xs font-mono"
                  />
                </div>
              </div>
            )}

            {activeFormTab === "preview" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-400 font-bold uppercase tracking-wider">
                    Google Search Snippet Simulation
                  </span>
                  <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("desktop")}
                      className={cn("p-1.5 rounded text-xs", previewDevice === "desktop" ? "bg-[#e06836] text-white" : "text-zinc-400")}
                    >
                      <Monitor className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewDevice("mobile")}
                      className={cn("p-1.5 rounded text-xs", previewDevice === "mobile" ? "bg-[#e06836] text-white" : "text-zinc-400")}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Google SERP Snippet Box */}
                <div className="p-4 rounded-xl bg-white text-zinc-900 space-y-1.5 shadow-md">
                  <div className="flex items-center gap-2 text-xs text-zinc-600">
                    <span className="w-4 h-4 rounded-full bg-orange-600 text-white flex items-center justify-center text-[9px] font-bold">E</span>
                    <span className="truncate">https://edubird.net &gt; {formPath.replace(/^\//, "")}</span>
                  </div>
                  <h4 className="text-base font-medium text-[#1a0dab] hover:underline cursor-pointer line-clamp-1">
                    {resolvedPreview.title || "Sample Page Title"}
                  </h4>
                  <p className="text-xs text-[#4d5156] line-clamp-2 leading-relaxed">
                    {resolvedPreview.description || "Sample meta description showing how your educational page will appear in Google and Bing search results."}
                  </p>
                </div>
              </div>
            )}

            <DialogFooter className="pt-2 border-t border-white/10">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="text-xs border-white/10">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="bg-[#e06836] hover:bg-[#cf5c2c] text-white text-xs font-bold">
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Save Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
