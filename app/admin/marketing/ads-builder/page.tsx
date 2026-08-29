"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Megaphone,
  Plus,
  Search,
  Building2,
  Calendar,
  Clock,
  MousePointerClick,
  Eye,
  ExternalLink,
  Edit2,
  Trash2,
  Play,
  Pause,
  Sparkles,
  RefreshCw,
  Check,
  X,
  Image as ImageIcon,
  Layers,
  SlidersHorizontal,
  TrendingUp,
  BarChart3,
  Target,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Globe,
  UploadCloud,
  Percent,
  GraduationCap,
  Users,
  FileText,
  ShoppingBag,
  Award,
  PenTool,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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

export type AdCampaignRecord = {
  id: number;
  title: string;
  institution_id?: number | null;
  institution_name?: string | null;
  ads_type: "top" | "middle" | "right_sidebar" | string;
  target_section?: "course" | "institute" | "teacher" | "notes" | "product" | "exam" | "practice" | "blog" | "general" | string;
  target_entity?: string;
  placement_zone?: string;
  image_url: string;
  creative_url?: string;
  headline?: string | null;
  description?: string | null;
  cta_text?: string | null;
  target_url?: string | null;
  open_in_new_tab: boolean;
  start_datetime?: string | null;
  end_datetime?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  max_impressions: number;
  max_clicks: number;
  impressions: number;
  clicks: number;
  status: "active" | "paused" | "scheduled" | "draft";
  created_at: string;
  profile_institution_name?: string | null;
  institution_logo?: string | null;
};

export type InstitutionOption = {
  id: number;
  name: string;
  city?: string | null;
  state?: string | null;
  logo_url?: string | null;
};

const DEFAULT_INSTITUTES: InstitutionOption[] = [
  { id: 101, name: "Maa Sharda Coaching & Institute", city: "Patna", state: "Bihar" },
  { id: 102, name: "Allen Career Institute", city: "Kota", state: "Rajasthan" },
  { id: 103, name: "Aakash Educational Services", city: "New Delhi", state: "Delhi" },
  { id: 104, name: "FIITJEE Premier Center", city: "New Delhi", state: "Delhi" },
  { id: 105, name: "Resonance Eduventures", city: "Kota", state: "Rajasthan" },
  { id: 106, name: "Physics Wallah Vidyapeeth", city: "Noida", state: "Uttar Pradesh" },
  { id: 107, name: "Delhi Public School (DPS)", city: "Delhi", state: "Delhi" },
  { id: 108, name: "IIT Delhi Extension Center", city: "New Delhi", state: "Delhi" },
  { id: 109, name: "Banaras Hindu University (BHU)", city: "Varanasi", state: "Uttar Pradesh" },
  { id: 110, name: "EduBird Global Academy", city: "Bengaluru", state: "Karnataka" },
  { id: 111, name: "Kendriya Vidyalaya Sangathan", city: "Lucknow", state: "Uttar Pradesh" },
  { id: 112, name: "Chanakya IAS Academy", city: "Patna", state: "Bihar" },
];

const TARGET_SECTIONS = [
  { id: "course", label: "Course", icon: GraduationCap, path: "/courses", desc: "Courses & Academic Programs" },
  { id: "institute", label: "Institute", icon: Building2, path: "/institutions", desc: "Institute & College Directory" },
  { id: "teacher", label: "Teacher", icon: Users, path: "/teachers", desc: "Faculty & Teacher Profiles" },
  { id: "notes", label: "Notes", icon: FileText, path: "/notes", desc: "Study Material & PDF Notes" },
  { id: "product", label: "Product", icon: ShoppingBag, path: "/products", desc: "Store, Uniforms & Lab Kits" },
  { id: "exam", label: "Exam", icon: Award, path: "/exams", desc: "Competitive & Entrance Exams" },
  { id: "practice", label: "Practice", icon: PenTool, path: "/practice", desc: "Mock Tests & Quizzes" },
  { id: "blog", label: "Blog", icon: BookOpen, path: "/blogs", desc: "Educational Blogs & Articles" },
  { id: "general", label: "General / Universal", icon: Globe, path: "/", desc: "Homepage & All Portal Pages" },
];

const SAMPLE_CREATIVES = [
  {
    label: "Admission Open 2026",
    url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&q=80",
    type: "top",
    section: "institute",
  },
  {
    label: "STEM & Robotics Lab",
    url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=1200&q=80",
    type: "middle",
    section: "product",
  },
  {
    label: "NEET & IIT Crash Course",
    url: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
    type: "right_sidebar",
    section: "course",
  },
  {
    label: "IELTS & Study Abroad",
    url: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80",
    type: "right_sidebar",
    section: "exam",
  },
  {
    label: "Full-Stack Coding Bootcamp",
    url: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=1200&q=80",
    type: "top",
    section: "course",
  },
];

const ADS_PLACEMENT_TYPES = [
  {
    id: "top",
    label: "Top Banner",
    description: "Header & Hero showcase placement (1200×280 or 728×90)",
    badge: "High Visibility",
  },
  {
    id: "middle",
    label: "Middle Section Banner",
    description: "In-feed content break & listing divider (1200×220)",
    badge: "High CTR",
  },
  {
    id: "right_sidebar",
    label: "Right Sidebar Banner",
    description: "Sticky right-column widget placement (300×250 or 336×280)",
    badge: "Targeted",
  },
] as const;

export default function AdsBuilderPage() {
  const [ads, setAds] = useState<AdCampaignRecord[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>(DEFAULT_INSTITUTES);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    impressions: 0,
    clicks: 0,
    ctr: "0.00%",
  });

  // Filter Bar States
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedSection, setSelectedSection] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Modal Create/Edit State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdCampaignRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formInstitutionId, setFormInstitutionId] = useState<string>("all");
  const [formInstitutionName, setFormInstitutionName] = useState<string>("");
  const [formInstitutionSearch, setFormInstitutionSearch] = useState("");
  const [formAdsType, setFormAdsType] = useState<"top" | "middle" | "right_sidebar">("top");
  const [formTargetSection, setFormTargetSection] = useState<string>("course");
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formHeadline, setFormHeadline] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCtaText, setFormCtaText] = useState("Apply Now");
  const [formTargetUrl, setFormTargetUrl] = useState("");
  const [formOpenInNewTab, setFormOpenInNewTab] = useState(true);
  const [formStartDatetime, setFormStartDatetime] = useState("");
  const [formEndDatetime, setFormEndDatetime] = useState("");
  const [formMaxImpressions, setFormMaxImpressions] = useState("0");
  const [formMaxClicks, setFormMaxClicks] = useState("0");
  const [formStatus, setFormStatus] = useState<"active" | "paused" | "scheduled" | "draft">("active");

  // Suggestion Box State
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Fetch Campaigns & Institutions
  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (selectedType !== "all") params.set("ads_type", selectedType);
      if (selectedSection !== "all") params.set("target_section", selectedSection);
      if (selectedStatus !== "all") params.set("status", selectedStatus);

      const res = await fetch(`/api/admin/marketing/ads?${params.toString()}`);
      const data = await res.json();
      if (data.ads) {
        setAds(data.ads);
      }
      if (data.institutions && Array.isArray(data.institutions) && data.institutions.length > 0) {
        setInstitutions(data.institutions);
      }
      if (data.stats) {
        setStats(data.stats);
      }
    } catch {
      toast.error("Failed to load banner ad campaigns");
    } finally {
      setLoading(false);
    }
  }, [search, selectedType, selectedSection, selectedStatus]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  // Filtered Institutions for Suggestion Box
  const filteredInstitutions = useMemo(() => {
    const q = formInstitutionSearch.trim().toLowerCase();
    if (!q) return institutions;
    return institutions.filter(
      (inst) =>
        inst.name.toLowerCase().includes(q) ||
        (inst.city && inst.city.toLowerCase().includes(q)) ||
        (inst.state && inst.state.toLowerCase().includes(q))
    );
  }, [institutions, formInstitutionSearch]);

  // Open Create Dialog
  const handleOpenCreate = () => {
    setEditingAd(null);
    setFormTitle("");
    setFormInstitutionId("all");
    setFormInstitutionName("");
    setFormInstitutionSearch("");
    setFormAdsType("top");
    setFormTargetSection("course");
    setFormImageUrl(SAMPLE_CREATIVES[0].url);
    setFormHeadline("Admissions Open For Academic Session 2026-27");
    setFormDescription("Join top-rated faculties with 100% scholarship opportunities. Limited seats available.");
    setFormCtaText("Enroll Now");
    setFormTargetUrl("https://edubird.in/courses");
    setFormOpenInNewTab(true);

    const now = new Date();
    const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    setFormStartDatetime(now.toISOString().slice(0, 16));
    setFormEndDatetime(in30Days.toISOString().slice(0, 16));

    setFormMaxImpressions("50000");
    setFormMaxClicks("2500");
    setFormStatus("active");
    setShowSuggestions(false);
    setDialogOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (ad: AdCampaignRecord) => {
    setEditingAd(ad);
    setFormTitle(ad.title || "");
    setFormInstitutionId(ad.institution_id ? String(ad.institution_id) : "all");
    setFormInstitutionName(ad.institution_name || ad.profile_institution_name || "");
    setFormInstitutionSearch(ad.institution_name || ad.profile_institution_name || "");
    setFormAdsType((ad.ads_type as any) || "top");
    setFormTargetSection(ad.target_section || ad.target_entity || "course");
    setFormImageUrl(ad.image_url || ad.creative_url || SAMPLE_CREATIVES[0].url);
    setFormHeadline(ad.headline || "");
    setFormDescription(ad.description || "");
    setFormCtaText(ad.cta_text || "Learn More");
    setFormTargetUrl(ad.target_url || "");
    setFormOpenInNewTab(ad.open_in_new_tab !== false);

    if (ad.start_datetime) {
      setFormStartDatetime(new Date(ad.start_datetime).toISOString().slice(0, 16));
    } else if (ad.start_date) {
      setFormStartDatetime(`${ad.start_date}T00:00`);
    } else {
      setFormStartDatetime("");
    }

    if (ad.end_datetime) {
      setFormEndDatetime(new Date(ad.end_datetime).toISOString().slice(0, 16));
    } else if (ad.end_date) {
      setFormEndDatetime(`${ad.end_date}T23:59`);
    } else {
      setFormEndDatetime("");
    }

    setFormMaxImpressions(String(ad.max_impressions || 0));
    setFormMaxClicks(String(ad.max_clicks || 0));
    setFormStatus(ad.status || "active");
    setShowSuggestions(false);
    setDialogOpen(true);
  };

  // Handle Form Submit
  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Campaign title is required");
      return;
    }
    if (!formImageUrl.trim()) {
      toast.error("Creative image URL is required");
      return;
    }
    if (!formTargetUrl.trim()) {
      toast.error("Target click URL is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        id: editingAd?.id,
        title: formTitle.trim(),
        institution_id: formInstitutionId !== "all" ? Number(formInstitutionId) : null,
        institution_name: formInstitutionName.trim() || null,
        ads_type: formAdsType,
        target_section: formTargetSection,
        image_url: formImageUrl.trim(),
        creative_url: formImageUrl.trim(),
        headline: formHeadline.trim() || null,
        description: formDescription.trim() || null,
        cta_text: formCtaText.trim() || "Learn More",
        target_url: formTargetUrl.trim(),
        open_in_new_tab: formOpenInNewTab,
        start_datetime: formStartDatetime ? new Date(formStartDatetime).toISOString() : null,
        end_datetime: formEndDatetime ? new Date(formEndDatetime).toISOString() : null,
        max_impressions: parseInt(formMaxImpressions) || 0,
        max_clicks: parseInt(formMaxClicks) || 0,
        status: formStatus,
      };

      const method = editingAd ? "PUT" : "POST";
      const res = await fetch("/api/admin/marketing/ads", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save ad campaign");
      }

      toast.success(editingAd ? "Campaign updated successfully!" : "New Banner Ad campaign launched!");
      setDialogOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      toast.error(err.message || "Failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Campaign Status
  const handleToggleStatus = async (ad: AdCampaignRecord) => {
    const newStatus = ad.status === "active" ? "paused" : "active";
    try {
      const res = await fetch("/api/admin/marketing/ads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ad.id, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Campaign ${newStatus === "active" ? "activated" : "paused"}`);
      fetchCampaigns();
    } catch {
      toast.error("Failed to toggle status");
    }
  };

  // Delete Campaign
  const handleDeleteAd = async (id: number) => {
    if (!confirm("Are you sure you want to delete this ad campaign?")) return;
    try {
      const res = await fetch(`/api/admin/marketing/ads?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete campaign");
      toast.success("Ad campaign deleted successfully");
      fetchCampaigns();
    } catch {
      toast.error("Failed to delete campaign");
    }
  };

  // Handle local image upload preview
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setFormImageUrl(reader.result);
          toast.success("Image uploaded successfully!");
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Quick Select an Institution from Suggestion
  const handleSelectInstitution = (inst: InstitutionOption | null) => {
    if (!inst) {
      setFormInstitutionId("all");
      setFormInstitutionName("");
      setFormInstitutionSearch("");
    } else {
      setFormInstitutionId(String(inst.id));
      setFormInstitutionName(inst.name);
      setFormInstitutionSearch(inst.name);
    }
    setShowSuggestions(false);
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Megaphone className="h-6 w-6" />
            </div>
            Portal & Banner Ads Builder
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Create featured banner advertisements, choose placement (Top, Middle, Right Sidebar), target section (Course, Institute, Teacher, Notes, Product, Exam, Practice, Blog), and set impression & click caps.
          </p>
        </div>

        <Button onClick={handleOpenCreate} className="gap-2 font-bold shadow-md cursor-pointer h-10 px-4">
          <Plus className="h-4 w-4" />
          <span>Create Banner Ad Campaign</span>
        </Button>
      </div>

      {/* STATS OVERVIEW CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="p-4 bg-card border-border rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">Total Campaigns</span>
            <Layers className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{stats.total}</p>
          <span className="text-[11px] text-muted-foreground font-semibold">{stats.active} Active Now</span>
        </Card>

        <Card className="p-4 bg-card border-border rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">Active Ad Slots</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{stats.active}</p>
          <span className="text-[11px] text-muted-foreground font-semibold">Running Live</span>
        </Card>

        <Card className="p-4 bg-card border-border rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">Total Impressions</span>
            <Eye className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{stats.impressions.toLocaleString("en-IN")}</p>
          <span className="text-[11px] text-muted-foreground font-semibold">Appearances Served</span>
        </Card>

        <Card className="p-4 bg-card border-border rounded-2xl shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">Total Clicks</span>
            <MousePointerClick className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-foreground mt-2">{stats.clicks.toLocaleString("en-IN")}</p>
          <span className="text-[11px] text-muted-foreground font-semibold">Inquiries Generated</span>
        </Card>

        <Card className="p-4 bg-card border-border rounded-2xl shadow-2xs col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground uppercase">Average CTR</span>
            <TrendingUp className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-2">{stats.ctr}</p>
          <span className="text-[11px] text-muted-foreground font-semibold">Click-Through Rate</span>
        </Card>
      </div>

      {/* FILTER & SEARCH CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-card border border-border rounded-2xl shadow-2xs">
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search campaigns by title, headline, or institute..."
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
          {/* Target Section Filter */}
          <Select value={selectedSection} onValueChange={setSelectedSection}>
            <SelectTrigger className="w-[140px] h-9 text-xs font-bold bg-background">
              <SelectValue placeholder="All Sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sections</SelectItem>
              {TARGET_SECTIONS.map((sec) => (
                <SelectItem key={sec.id} value={sec.id}>
                  {sec.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Ad Placement Type Filter */}
          <Select value={selectedType} onValueChange={setSelectedType}>
            <SelectTrigger className="w-[140px] h-9 text-xs font-bold bg-background">
              <SelectValue placeholder="All Placements" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Placements</SelectItem>
              <SelectItem value="top">Top Banner</SelectItem>
              <SelectItem value="middle">Middle Banner</SelectItem>
              <SelectItem value="right_sidebar">Right Sidebar</SelectItem>
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[120px] h-9 text-xs font-bold bg-background">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchCampaigns}
            className="h-9 px-2.5 font-bold text-xs"
            title="Refresh list"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* CAMPAIGNS GRID */}
      {loading ? (
        <div className="p-16 text-center text-xs text-muted-foreground space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto text-primary" />
          <p>Loading banner campaigns...</p>
        </div>
      ) : ads.length === 0 ? (
        <Card className="p-12 text-center space-y-4 bg-card border-border rounded-2xl">
          <div className="p-3 bg-muted/40 rounded-full w-14 h-14 mx-auto flex items-center justify-center">
            <Megaphone className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-base text-foreground">No Banner Campaigns Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Launch your first high-converting portal advertisement with custom target sections, appearance caps, and placement positions.
            </p>
          </div>
          <Button onClick={handleOpenCreate} className="gap-2 font-bold text-xs h-9">
            <Plus className="h-3.5 w-3.5" /> Create Banner Ad
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {ads.map((ad) => {
            const secInfo = TARGET_SECTIONS.find((s) => s.id === (ad.target_section || ad.target_entity)) || TARGET_SECTIONS[0];
            const SecIcon = secInfo.icon;

            return (
              <Card
                key={ad.id}
                className="overflow-hidden border-border bg-card shadow-2xs hover:shadow-md transition-all flex flex-col justify-between rounded-2xl group"
              >
                <div>
                  {/* Creative Banner Preview Image */}
                  <div className="relative w-full h-40 bg-muted overflow-hidden">
                    <img
                      src={ad.image_url || ad.creative_url}
                      alt={ad.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-extrabold uppercase bg-background/90 backdrop-blur-xs text-foreground shadow-2xs"
                      >
                        {ad.ads_type === "top"
                          ? "Top Banner"
                          : ad.ads_type === "middle"
                          ? "Middle Banner"
                          : "Right Sidebar"}
                      </Badge>

                      {/* Section Badge */}
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-bold bg-primary/90 text-primary-foreground shadow-2xs flex items-center gap-1"
                      >
                        <SecIcon className="w-2.5 h-2.5" />
                        <span>{secInfo.label}</span>
                      </Badge>

                      <Badge
                        variant="outline"
                        className={`text-[10px] font-black uppercase shadow-2xs ${
                          ad.status === "active"
                            ? "bg-emerald-500 text-white border-transparent"
                            : ad.status === "paused"
                            ? "bg-amber-500 text-white border-transparent"
                            : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {ad.status}
                      </Badge>
                    </div>

                    {ad.open_in_new_tab && (
                      <div className="absolute top-2.5 right-2.5">
                        <Badge variant="secondary" className="text-[9px] font-bold bg-background/90 text-foreground" title="Opens in New Tab">
                          <ExternalLink className="w-2.5 h-2.5 mr-1" /> New Tab
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-3">
                    <div>
                      {/* Advertised For Institution */}
                      {(ad.institution_name || ad.profile_institution_name) ? (
                        <span className="text-[11px] font-bold text-primary flex items-center gap-1.5 truncate">
                          <Building2 className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate">{ad.institution_name || ad.profile_institution_name}</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-bold text-muted-foreground flex items-center gap-1.5">
                          <Globe className="h-3.5 w-3.5 shrink-0" />
                          EduBird Global / Platform-wide
                        </span>
                      )}

                      <h3 className="font-extrabold text-sm text-foreground mt-1 line-clamp-1">{ad.title}</h3>
                      {ad.headline && (
                        <p className="text-xs font-semibold text-foreground/80 mt-0.5 line-clamp-1">{ad.headline}</p>
                      )}
                      {ad.description && (
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{ad.description}</p>
                      )}
                    </div>

                    {/* Schedule Dates */}
                    <div className="p-2 bg-muted/30 rounded-xl flex items-center justify-between text-[10px] text-muted-foreground font-semibold">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-primary" />
                        <span>
                          {ad.start_datetime
                            ? new Date(ad.start_datetime).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                            : "Immediate"}
                        </span>
                      </div>
                      <span>to</span>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" />
                        <span>
                          {ad.end_datetime
                            ? new Date(ad.end_datetime).toLocaleDateString("en-IN", { month: "short", day: "numeric" })
                            : "Ongoing"}
                        </span>
                      </div>
                    </div>

                    {/* Delivery & Engagement Metrics */}
                    <div className="grid grid-cols-3 gap-2 p-2.5 bg-muted/20 border border-border/60 rounded-xl text-center">
                      <div>
                        <span className="text-[9px] text-muted-foreground uppercase font-bold block">Appearances</span>
                        <span className="text-xs font-extrabold text-foreground">
                          {ad.impressions.toLocaleString("en-IN")}
                        </span>
                        {ad.max_impressions > 0 && (
                          <span className="text-[9px] text-muted-foreground block">
                            / {ad.max_impressions.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[9px] text-muted-foreground uppercase font-bold block">Clicks</span>
                        <span className="text-xs font-extrabold text-foreground">
                          {ad.clicks.toLocaleString("en-IN")}
                        </span>
                        {ad.max_clicks > 0 && (
                          <span className="text-[9px] text-muted-foreground block">
                            / {ad.max_clicks.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[9px] text-muted-foreground uppercase font-bold block">CTR</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                          {ad.impressions > 0
                            ? `${((ad.clicks / ad.impressions) * 100).toFixed(1)}%`
                            : "0.0%"}
                        </span>
                      </div>
                    </div>

                    {/* Target URL Preview */}
                    {ad.target_url && (
                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
                        <ExternalLink className="w-3 h-3 text-primary shrink-0" />
                        <span className="truncate">{ad.target_url}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-3 px-4 border-t border-border bg-muted/10 flex items-center justify-between gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(ad)}
                    className="h-8 px-2.5 text-xs font-bold gap-1"
                  >
                    {ad.status === "active" ? (
                      <>
                        <Pause className="h-3 w-3 text-amber-500" /> Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 text-emerald-500" /> Activate
                      </>
                    )}
                  </Button>

                  <div className="flex items-center gap-1.5">
                    {ad.target_url && (
                      <a
                        href={ad.target_url}
                        target={ad.open_in_new_tab ? "_blank" : "_self"}
                        rel="noreferrer"
                        className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-background hover:bg-muted text-muted-foreground transition-colors"
                        title="Test Destination URL"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(ad)}
                      className="h-8 w-8 p-0"
                      title="Edit Campaign"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteAd(ad.id)}
                      className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                      title="Delete Campaign"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT CAMPAIGN MODAL */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-0 gap-0">
          <div className="p-5 pb-4 border-b border-border bg-muted/20">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <span>{editingAd ? "Edit Banner Ad Campaign" : "Create New Banner Advertisement"}</span>
                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                    Target institution name, section dropdown, placement zone, image creative, scheduling, impression caps & click redirect
                  </span>
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>

          <form onSubmit={handleSaveCampaign} className="p-5 sm:p-6 space-y-5">
            {/* 1. CAMPAIGN TITLE & TARGET SECTION DROPDOWN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Campaign Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Campaign Title / Name *</Label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. IIT-JEE Super 30 Summer Batch 2026"
                  className="text-xs h-9"
                  required
                />
              </div>

              {/* NEW REQUESTED FIELD: TARGET PAGE / SECTION DROPDOWN */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-primary" />
                  Target Section / Category *
                </Label>
                <Select value={formTargetSection} onValueChange={setFormTargetSection}>
                  <SelectTrigger className="text-xs h-9 font-bold bg-background border-border">
                    <SelectValue placeholder="Select target section..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {TARGET_SECTIONS.map((sec) => {
                      const Icon = sec.icon;
                      return (
                        <SelectItem key={sec.id} value={sec.id}>
                          <div className="flex items-center gap-2 py-0.5">
                            <Icon className="w-3.5 h-3.5 text-primary" />
                            <span className="font-bold">{sec.label}</span>
                            <span className="text-[10px] text-muted-foreground">({sec.desc})</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 2. ADVERTISED FOR: INSTITUTION SUGGESTION BOX (ALWAYS VISIBLE & SEARCHABLE) */}
            <div className="p-3.5 bg-muted/20 border border-border rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  Advertised For (Institution Suggestion Box)
                </Label>
                {formInstitutionName && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 flex items-center gap-1"
                  >
                    <span>Selected: {formInstitutionName}</span>
                    <button
                      type="button"
                      onClick={() => handleSelectInstitution(null)}
                      className="hover:text-rose-600 cursor-pointer ml-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )}
              </div>

              {/* Search input + trigger button */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={formInstitutionSearch}
                  onChange={(e) => {
                    setFormInstitutionSearch(e.target.value);
                    setFormInstitutionName(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search and pick an institute (e.g. Maa Sharda, Allen, Aakash, FIITJEE)..."
                  className="pl-8 pr-24 text-xs h-9 bg-background"
                />
                <div className="absolute right-1 top-1 flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowSuggestions((prev) => !prev)}
                    className="h-7 text-[11px] px-2 font-bold gap-1 text-primary"
                  >
                    <span>{showSuggestions ? "Hide" : "Suggestions"}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${showSuggestions ? "rotate-180" : ""}`} />
                  </Button>
                </div>
              </div>

              {/* QUICK SUGGESTION PILLS */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                <span className="text-[10px] font-bold text-muted-foreground">Quick Picks:</span>
                <button
                  type="button"
                  onClick={() => handleSelectInstitution(null)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    !formInstitutionName
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted hover:bg-primary/20 hover:text-primary"
                  }`}
                >
                  EduBird Universal / All
                </button>
                {DEFAULT_INSTITUTES.slice(0, 5).map((inst) => (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => handleSelectInstitution(inst)}
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                      formInstitutionName === inst.name
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted hover:bg-primary/20 hover:text-primary"
                    }`}
                  >
                    {inst.name.split(" ")[0]} {inst.name.split(" ")[1] || ""}
                  </button>
                ))}
              </div>

              {/* EXPANDED SUGGESTIONS CONTAINER (RENDERED SAFELY IN FLOW) */}
              {showSuggestions && (
                <div className="p-2 bg-background border border-border rounded-xl shadow-inner max-h-48 overflow-y-auto space-y-1 mt-2">
                  <button
                    type="button"
                    onClick={() => handleSelectInstitution(null)}
                    className={`w-full text-left p-2 rounded-lg text-xs font-bold flex items-center justify-between transition-colors cursor-pointer ${
                      !formInstitutionName ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-primary" />
                      <span>General / EduBird Platform-wide (No specific institute)</span>
                    </div>
                    {!formInstitutionName && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>

                  {filteredInstitutions.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      No matching institutes found. (Custom name "{formInstitutionSearch}" will be saved)
                    </div>
                  ) : (
                    filteredInstitutions.map((inst) => {
                      const isSelected = formInstitutionName === inst.name || String(formInstitutionId) === String(inst.id);
                      return (
                        <button
                          key={inst.id}
                          type="button"
                          onClick={() => handleSelectInstitution(inst)}
                          className={`w-full text-left p-2 rounded-lg text-xs transition-colors flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-primary/10 text-primary font-bold"
                              : "hover:bg-muted text-foreground"
                          }`}
                        >
                          <div className="truncate min-w-0 pr-2">
                            <span className="block truncate font-bold">{inst.name}</span>
                            {inst.city && (
                              <span className="block text-[10px] text-muted-foreground truncate">
                                {inst.city} {inst.state ? `, ${inst.state}` : ""}
                              </span>
                            )}
                          </div>
                          {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* 3. ADS TYPE (TOP, MIDDLE, RIGHT SIDEBAR) */}
            <div className="space-y-2 p-3.5 bg-muted/20 border border-border rounded-xl">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-primary" />
                Ads Type & Placement Zone *
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {ADS_PLACEMENT_TYPES.map((pt) => {
                  const isSelected = formAdsType === pt.id;
                  return (
                    <div
                      key={pt.id}
                      onClick={() => setFormAdsType(pt.id as any)}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between gap-2 ${
                        isSelected
                          ? "bg-primary/10 border-primary shadow-xs font-bold text-primary"
                          : "bg-background border-border/80 text-foreground hover:bg-muted/60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-sm">{pt.label}</span>
                        <Badge
                          variant={isSelected ? "default" : "outline"}
                          className="text-[9px] font-black uppercase"
                        >
                          {pt.badge}
                        </Badge>
                      </div>
                      <p className={`text-[11px] leading-relaxed ${isSelected ? "text-primary/90" : "text-muted-foreground"}`}>
                        {pt.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 4. UPLOAD IMAGE / CREATIVE URL & LIVE PREVIEW */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-primary" />
                    Creative Image URL / Upload *
                  </Label>
                  <label className="text-[11px] font-bold text-primary hover:underline cursor-pointer flex items-center gap-1">
                    <UploadCloud className="w-3.5 h-3.5" />
                    Upload from Device
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                <Input
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="text-xs h-9 font-mono"
                  required
                />

                {/* Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-muted-foreground font-semibold">Sample Creatives:</span>
                  {SAMPLE_CREATIVES.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFormImageUrl(s.url);
                        setFormAdsType(s.type as any);
                        setFormTargetSection(s.section);
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted hover:bg-primary/20 hover:text-primary transition-colors cursor-pointer"
                    >
                      {s.label} ({s.type})
                    </button>
                  ))}
                </div>
              </div>

              {/* LIVE BANNER PREVIEW ACCORDING TO PLACEMENT */}
              <div className="p-3.5 bg-muted/20 border border-border rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase">
                    Live Banner Preview ({formAdsType.toUpperCase()})
                  </span>
                  <Badge variant="outline" className="text-[9px] font-bold">
                    Target Section: {TARGET_SECTIONS.find((s) => s.id === formTargetSection)?.label}
                  </Badge>
                </div>

                <div className="w-full bg-background border border-border/80 rounded-xl overflow-hidden shadow-xs flex items-center justify-center">
                  {formAdsType === "top" && (
                    <div className="relative w-full h-36 sm:h-44 overflow-hidden group">
                      <img src={formImageUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent p-5 flex flex-col justify-center text-white space-y-1 max-w-lg">
                        {formInstitutionName && (
                          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                            {formInstitutionName}
                          </span>
                        )}
                        <h4 className="font-black text-sm sm:text-base leading-snug">{formHeadline || formTitle}</h4>
                        {formDescription && <p className="text-xs text-slate-200 line-clamp-1">{formDescription}</p>}
                        <div className="pt-1">
                          <span className="inline-block px-3 py-1 bg-primary text-primary-foreground font-black text-xs rounded-lg shadow-sm">
                            {formCtaText} →
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {formAdsType === "middle" && (
                    <div className="relative w-full h-32 overflow-hidden">
                      <img src={formImageUrl} alt="Banner Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 to-transparent p-4 flex items-center justify-between text-white">
                        <div className="max-w-md space-y-0.5">
                          <span className="text-[9px] font-bold text-primary uppercase">Sponsored Feature</span>
                          <h4 className="font-black text-sm">{formHeadline || formTitle}</h4>
                          <p className="text-[11px] text-slate-300 line-clamp-1">{formDescription}</p>
                        </div>
                        <span className="px-3 py-1.5 bg-primary text-primary-foreground font-black text-xs rounded-lg shrink-0">
                          {formCtaText}
                        </span>
                      </div>
                    </div>
                  )}

                  {formAdsType === "right_sidebar" && (
                    <div className="w-64 p-3 bg-card border border-border rounded-xl space-y-2 text-center my-2">
                      <div className="h-32 w-full rounded-lg overflow-hidden">
                        <img src={formImageUrl} alt="Sidebar Preview" className="w-full h-full object-cover" />
                      </div>
                      <h4 className="font-black text-xs text-foreground leading-snug">{formHeadline || formTitle}</h4>
                      <p className="text-[10px] text-muted-foreground line-clamp-2">{formDescription}</p>
                      <button type="button" className="w-full py-1.5 bg-primary text-primary-foreground font-bold text-xs rounded-lg">
                        {formCtaText}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 5. HEADLINE, DESCRIPTION & CTA TEXT */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Banner Headline / Tagline</Label>
                <Input
                  value={formHeadline}
                  onChange={(e) => setFormHeadline(e.target.value)}
                  placeholder="e.g. 50% Scholarship on Early Admissions"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">CTA Button Label</Label>
                <Input
                  value={formCtaText}
                  onChange={(e) => setFormCtaText(e.target.value)}
                  placeholder="e.g. Enroll Now, Book Free Demo, Visit Campus"
                  className="text-xs h-9"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-bold">Description / Promotional Offer Text</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Short description highlighting key advantages, eligibility or deadlines..."
                  rows={2}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            {/* 6. START & END DATE & TIME */}
            <div className="p-3.5 bg-muted/20 border border-border rounded-xl space-y-3">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Schedule Active Window (Start & End Date & Time) *
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Start Date & Time *</Label>
                  <Input
                    type="datetime-local"
                    value={formStartDatetime}
                    onChange={(e) => setFormStartDatetime(e.target.value)}
                    className="text-xs h-9"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">End Date & Time *</Label>
                  <Input
                    type="datetime-local"
                    value={formEndDatetime}
                    onChange={(e) => setFormEndDatetime(e.target.value)}
                    className="text-xs h-9"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 7. MAXIMUM APPEARANCE NUMBER & MAXIMUM CLICK */}
            <div className="p-3.5 bg-muted/20 border border-border rounded-xl space-y-3">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" />
                Delivery Caps & Quota Limits
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Maximum Appearance Number (Impressions Cap)
                    </Label>
                    <span className="text-[10px] text-muted-foreground">0 = Unlimited</span>
                  </div>
                  <Input
                    type="number"
                    value={formMaxImpressions}
                    onChange={(e) => setFormMaxImpressions(e.target.value)}
                    placeholder="e.g. 50000"
                    className="text-xs h-9 font-mono"
                    min="0"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold text-muted-foreground">
                      Maximum Click (Clicks Cap)
                    </Label>
                    <span className="text-[10px] text-muted-foreground">0 = Unlimited</span>
                  </div>
                  <Input
                    type="number"
                    value={formMaxClicks}
                    onChange={(e) => setFormMaxClicks(e.target.value)}
                    placeholder="e.g. 2500"
                    className="text-xs h-9 font-mono"
                    min="0"
                  />
                </div>
              </div>
            </div>

            {/* 8. ON CLICK OPEN NEW PAGE OR NEW URL */}
            <div className="p-3.5 bg-muted/20 border border-border rounded-xl space-y-3">
              <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-primary" />
                On Click Destination (New URL & Tab Behavior) *
              </Label>

              <div className="space-y-3 pt-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Destination Target URL *</Label>
                  <Input
                    value={formTargetUrl}
                    onChange={(e) => setFormTargetUrl(e.target.value)}
                    placeholder="https://example.com/apply-now or /courses/12"
                    className="text-xs h-9 font-mono"
                    required
                  />
                </div>

                {/* Open in new page toggle */}
                <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-background">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                      <ExternalLink className="w-3.5 h-3.5 text-primary" />
                      Open in New Page / Tab (`_blank`)
                    </Label>
                    <p className="text-[11px] text-muted-foreground">
                      When enabled, users will open the link in a new browser tab without leaving EduBird.
                    </p>
                  </div>
                  <Switch
                    checked={formOpenInNewTab}
                    onCheckedChange={setFormOpenInNewTab}
                  />
                </div>
              </div>
            </div>

            {/* 9. STATUS SELECTION */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Campaign Status</Label>
              <Select value={formStatus} onValueChange={(val: any) => setFormStatus(val)}>
                <SelectTrigger className="text-xs h-9 font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active (Visible according to schedule)</SelectItem>
                  <SelectItem value="paused">Paused (Temporarily halted)</SelectItem>
                  <SelectItem value="scheduled">Scheduled (Awaiting start date)</SelectItem>
                  <SelectItem value="draft">Draft (Unpublished)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* MODAL FOOTER */}
            <DialogFooter className="pt-4 border-t border-border flex items-center justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="font-bold text-xs gap-1.5">
                {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                {editingAd ? "Save Changes" : "Launch Banner Campaign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
