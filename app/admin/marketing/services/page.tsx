"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Briefcase,
  Plus,
  Search,
  IndianRupee,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Edit2,
  Trash2,
  Eye,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Tag,
  Boxes,
  Check,
  X,
  Building,
  GraduationCap,
  Image as ImageIcon,
  FolderPlus,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Info,
  Percent,
  ListChecks,
  UploadCloud,
  Upload,
  Loader2,
  Camera,
  Globe,
  MapPin,
  Calendar,
  Users,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ServiceCategory = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  is_active: boolean;
  services_count?: number;
};

export type ProgramOption = {
  id: number;
  title: string;
  slug: string;
  fee_amount?: number | string | null;
  institution_name?: string | null;
};

export type ServiceRecord = {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  price: number | string;
  sale_price?: number | string | null;
  category: string;
  category_id?: number | null;
  category_name?: string | null;
  program_ids?: number[] | null;
  associated_programs?: Array<{ id: number; title: string }> | null;
  image_url?: string | null;
  gallery?: string[] | null;
  institution_id?: number | null;
  institution_name?: string | null;
  badge_text?: string | null;
  features?: string[] | null;
  pricing_model: "fixed" | "hourly" | "per_session" | "free_consultation" | "quote_required";
  duration_minutes: number;
  duration_unit: string;
  delivery_mode: "online" | "in_person" | "hybrid";
  service_location?: string | null;
  status: "active" | "draft" | "archived";
  is_featured: boolean;
  created_at: string;
};

const SAMPLE_SERVICE_IMAGES = [
  { label: "1-on-1 Consultation", url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80" },
  { label: "Strategy Meeting", url: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&q=80" },
  { label: "Design Sprint", url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8?w=800&q=80" },
  { label: "Technical Workshop", url: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&q=80" },
  { label: "Personal Styling", url: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80" },
];

const FORM_TABS = [
  { id: "basic", label: "Basic Info", icon: Info, count: "1" },
  { id: "category", label: "Category & Scope", icon: Tag, count: "2" },
  { id: "images", label: "Images", icon: ImageIcon, count: "3" },
  { id: "pricing", label: "Pricing & Duration", icon: IndianRupee, count: "4" },
  { id: "deliverables", label: "Deliverables & Features", icon: ListChecks, count: "5" },
] as const;

type FormTabId = (typeof FORM_TABS)[number]["id"];

function formatCurrency(val: number | string | null | undefined) {
  const num = Number(val) || 0;
  return `₹${num.toLocaleString("en-IN")}`;
}

export default function AdminServicesPage() {
  const { user, accessToken } = useAuthStore();
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [programOptions, setProgramOptions] = useState<ProgramOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    avgPrice: 0,
    categoriesCount: 0,
  });

  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedDeliveryMode, setSelectedDeliveryMode] = useState("all");

  // Service Add / Edit Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formTab, setFormTab] = useState<FormTabId>("basic");
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Category Management Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  // Form Fields for Service
  const [formTitle, setFormTitle] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formProgramIds, setFormProgramIds] = useState<number[]>([]);
  const [programSearch, setProgramSearch] = useState("");
  const [programDropdownOpen, setProgramDropdownOpen] = useState(false);
  const [formPrice, setFormPrice] = useState("");
  const [formSalePrice, setFormSalePrice] = useState("");
  const [formPricingModel, setFormPricingModel] = useState<"fixed" | "hourly" | "per_session" | "free_consultation" | "quote_required">("fixed");
  const [formDurationMinutes, setFormDurationMinutes] = useState("60");
  const [formDeliveryMode, setFormDeliveryMode] = useState<"online" | "in_person" | "hybrid">("online");
  const [formServiceLocation, setFormServiceLocation] = useState("");
  const [formBadge, setFormBadge] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "draft" | "archived">("active");
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formFeatures, setFormFeatures] = useState<string[]>([""]);
  const [uploadingImage, setUploadingImage] = useState(false);

  const isPlatformAdmin = Boolean(
    user?.role_codes?.some((r: string) => r.includes("super") || r.includes("platform")) ||
    (user as any)?.role === "platform_admin" ||
    user?.is_super_admin
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP, AVIF, GIF, etc.)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size should be less than 10MB");
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "services");

      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to upload image");
      }

      const uploadedUrl = json.data?.url || json.url;
      if (uploadedUrl) {
        setFormImage(uploadedUrl);
        toast.success("Service image uploaded successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = "";
    }
  };

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch("/api/admin/marketing/services/categories", { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch {}
  }, [accessToken]);

  // Fetch Course/Program Options
  const fetchProgramOptions = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch("/api/admin/marketing/products/programs", { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.programs)) {
        setProgramOptions(data.programs);
      }
    } catch {}
  }, [accessToken]);

  // Fetch Services
  const fetchServices = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (selectedCategoryId !== "all") params.set("category_id", selectedCategoryId);
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      if (selectedDeliveryMode !== "all") params.set("delivery_mode", selectedDeliveryMode);

      const res = await fetch(`/api/admin/marketing/services?${params.toString()}`, { headers });
      const data = await res.json();
      if (res.ok && Array.isArray(data.services)) {
        setServices(data.services);
        if (data.stats) setStats(data.stats);
      } else {
        toast.error(data.error || "Failed to load marketing services");
      }
    } catch {
      toast.error("Failed to fetch marketing services");
    } finally {
      setLoading(false);
    }
  }, [accessToken, search, selectedCategoryId, selectedStatus, selectedDeliveryMode]);

  useEffect(() => {
    fetchCategories();
    fetchProgramOptions();
  }, [fetchCategories, fetchProgramOptions]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchServices();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchServices]);

  const handleOpenCreate = () => {
    setEditingService(null);
    setFormTitle("");
    setFormCategoryId(categories[0]?.id ? String(categories[0].id) : "");
    setFormProgramIds([]);
    setFormPrice("");
    setFormSalePrice("");
    setFormPricingModel("fixed");
    setFormDurationMinutes("60");
    setFormDeliveryMode("online");
    setFormServiceLocation("");
    setFormBadge("");
    setFormImage("");
    setFormDescription("");
    setFormStatus("active");
    setFormIsFeatured(false);
    setFormFeatures([""]);
    setFormTab("basic");
    setDialogOpen(true);
  };

  const handleOpenEdit = (srv: ServiceRecord) => {
    setEditingService(srv);
    setFormTitle(srv.title || "");
    setFormCategoryId(srv.category_id ? String(srv.category_id) : "");
    setFormProgramIds(Array.isArray(srv.program_ids) ? srv.program_ids : []);
    setFormPrice(String(srv.price || ""));
    setFormSalePrice(srv.sale_price !== null && srv.sale_price !== undefined ? String(srv.sale_price) : "");
    setFormPricingModel(srv.pricing_model || "fixed");
    setFormDurationMinutes(String(srv.duration_minutes || 60));
    setFormDeliveryMode(srv.delivery_mode || "online");
    setFormServiceLocation(srv.service_location || "");
    setFormBadge(srv.badge_text || "");
    setFormImage(srv.image_url || "");
    setFormDescription(srv.description || "");
    setFormStatus(srv.status || "active");
    setFormIsFeatured(Boolean(srv.is_featured));
    setFormFeatures(Array.isArray(srv.features) && srv.features.length > 0 ? srv.features : [""]);
    setFormTab("basic");
    setDialogOpen(true);
  };

  const handleSaveService = async () => {
    if (!formTitle.trim()) {
      toast.error("Service title is required");
      setFormTab("basic");
      return;
    }

    setSaving(true);
    try {
      const selectedCat = categories.find((c) => String(c.id) === String(formCategoryId));
      const payload = {
        id: editingService?.id,
        title: formTitle.trim(),
        category_id: formCategoryId ? Number(formCategoryId) : null,
        category: selectedCat?.name || "General",
        program_ids: formProgramIds,
        price: formPrice === "" ? 0 : Number(formPrice),
        sale_price: formSalePrice === "" ? null : Number(formSalePrice),
        pricing_model: formPricingModel,
        duration_minutes: Number(formDurationMinutes) || 60,
        delivery_mode: formDeliveryMode,
        service_location: formServiceLocation.trim() || null,
        badge_text: formBadge.trim() || null,
        image_url: formImage.trim() || null,
        description: formDescription.trim() || null,
        status: formStatus,
        is_featured: formIsFeatured,
        features: formFeatures.filter((f) => f.trim().length > 0),
      };

      const method = editingService ? "PUT" : "POST";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/marketing/services", {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save service");

      toast.success(editingService ? "Service updated successfully!" : "Service created successfully!");
      setDialogOpen(false);
      fetchServices();
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm("Are you sure you want to delete this marketing service?")) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/marketing/services?id=${id}`, {
        method: "DELETE",
        headers,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete service");

      toast.success("Service removed from catalog");
      fetchServices();
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete service");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCatName.trim()) {
      toast.error("Category name is required");
      return;
    }
    setSavingCategory(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/marketing/services/categories", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: newCatName.trim(),
          description: newCatDesc.trim() || null,
          icon: "Briefcase",
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create category");

      toast.success("Category created successfully!");
      setNewCatName("");
      setNewCatDesc("");
      fetchCategories();
      setCategoryModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to create category");
    } finally {
      setSavingCategory(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
              Marketing Services
            </h1>
            <Badge variant="outline" className="text-[11px] font-bold text-sky-600 bg-sky-50 dark:bg-sky-950/40 border-sky-200">
              Services Catalog
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Publish, package, and market consultation, advisory, workshops, and bespoke professional services.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPlatformAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCategoryModalOpen(true)}
              className="h-9 px-3 text-xs font-bold rounded-xl gap-1.5 shadow-2xs"
            >
              <FolderPlus className="w-3.5 h-3.5 text-sky-600" />
              Manage Categories
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-9 px-3.5 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-1.5 shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Service
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchServices}
            disabled={loading}
            className="h-9 px-3 text-xs font-bold rounded-xl gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-card border-border shadow-2xs rounded-2xl">
          <p className="text-xs font-bold text-muted-foreground uppercase">Total Services</p>
          <p className="text-2xl font-black text-foreground mt-1">{stats.total}</p>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-3 h-3" /> Available in Catalog
          </span>
        </Card>

        <Card className="p-4 bg-card border-border shadow-2xs rounded-2xl">
          <p className="text-xs font-bold text-muted-foreground uppercase">Active Listings</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.active}</p>
          <span className="text-[10px] text-muted-foreground">Client bookable</span>
        </Card>

        <Card className="p-4 bg-card border-border shadow-2xs rounded-2xl">
          <p className="text-xs font-bold text-muted-foreground uppercase">Service Categories</p>
          <p className="text-2xl font-black text-sky-600 mt-1">{categories.length}</p>
          <span className="text-[10px] text-muted-foreground">Classifications</span>
        </Card>

        <Card className="p-4 bg-card border-border shadow-2xs rounded-2xl">
          <p className="text-xs font-bold text-muted-foreground uppercase">Avg. Fee / Session</p>
          <p className="text-2xl font-black text-foreground mt-1">{formatCurrency(stats.avgPrice)}</p>
          <span className="text-[10px] text-muted-foreground">Standard pricing</span>
        </Card>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search service title, description, or badge..."
            className="pl-9 text-xs h-9 bg-background rounded-lg"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
            <SelectTrigger className="w-[180px] h-9 text-xs font-bold bg-background rounded-lg">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories ({categories.length})</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedDeliveryMode} onValueChange={setSelectedDeliveryMode}>
            <SelectTrigger className="w-[140px] h-9 text-xs font-bold bg-background rounded-lg">
              <SelectValue placeholder="Delivery Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Delivery Modes</SelectItem>
              <SelectItem value="online">Online / Remote</SelectItem>
              <SelectItem value="in_person">In-Person / Onsite</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[130px] h-9 text-xs font-bold bg-background rounded-lg">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* SERVICES GRID */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" /> Loading marketing services...
        </div>
      ) : services.length === 0 ? (
        <Card className="p-10 text-center space-y-3 bg-card border-border rounded-2xl">
          <Briefcase className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h3 className="font-bold text-sm text-foreground">No services found</h3>
          <p className="text-xs text-muted-foreground">
            Click &quot;Add Service&quot; to publish your first consultation package, workshop, or bespoke solution.
          </p>
          <Button size="sm" onClick={handleOpenCreate} className="font-bold text-xs">
            <Plus className="w-4 h-4 mr-1" /> Add Service Now
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {services.map((srv) => {
            const hasSale = Boolean(srv.sale_price && Number(srv.sale_price) < Number(srv.price));
            const currentPrice = hasSale ? Number(srv.sale_price) : Number(srv.price);

            return (
              <Card
                key={srv.id}
                className="overflow-hidden border border-border/80 bg-card hover:border-primary/40 hover:shadow-md transition-all rounded-2xl flex flex-col justify-between group"
              >
                <div>
                  {/* Service Image & Badges */}
                  <div className="relative h-44 w-full bg-muted overflow-hidden">
                    {srv.image_url ? (
                      <Image
                        src={srv.image_url}
                        alt={srv.title}
                        fill
                        sizes="(max-width: 768px) 100vw, 360px"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-sky-50 dark:bg-sky-950/20 text-sky-600">
                        <Briefcase className="w-10 h-10 opacity-40 mb-1" />
                        <span className="text-[11px] font-semibold text-muted-foreground">No Cover Image</span>
                      </div>
                    )}

                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="secondary"
                        className={`text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-xs ${
                          srv.status === "active"
                            ? "bg-emerald-500/90 text-white"
                            : srv.status === "draft"
                            ? "bg-amber-500/90 text-white"
                            : "bg-slate-700/90 text-white"
                        }`}
                      >
                        {srv.status}
                      </Badge>

                      {srv.badge_text && (
                        <Badge variant="outline" className="text-[10px] font-bold bg-background/90 backdrop-blur-md text-foreground">
                          {srv.badge_text}
                        </Badge>
                      )}
                    </div>

                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-bold bg-background/90 backdrop-blur-md text-foreground flex items-center gap-1"
                      >
                        {srv.delivery_mode === "online" ? (
                          <>
                            <Video className="w-3 h-3 text-sky-500" /> Online
                          </>
                        ) : srv.delivery_mode === "in_person" ? (
                          <>
                            <MapPin className="w-3 h-3 text-emerald-500" /> In-Person
                          </>
                        ) : (
                          <>
                            <Globe className="w-3 h-3 text-purple-500" /> Hybrid
                          </>
                        )}
                      </Badge>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-semibold text-primary">{srv.category_name || srv.category || "General"}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        {srv.duration_minutes} mins
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                      {srv.title}
                    </h3>

                    {srv.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                        {srv.description}
                      </p>
                    )}

                    {/* Features list bullet points */}
                    {Array.isArray(srv.features) && srv.features.length > 0 && (
                      <div className="pt-2 border-t border-border/60 space-y-1">
                        {srv.features.slice(0, 2).map((feat, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">{feat}</span>
                          </div>
                        ))}
                        {srv.features.length > 2 && (
                          <span className="text-[10px] text-muted-foreground font-semibold block">
                            +{srv.features.length - 2} more deliverables
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Pricing & Actions */}
                <div className="p-4 pt-2 border-t border-border/60 flex items-center justify-between bg-muted/20">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-base font-black text-foreground">
                        {srv.pricing_model === "free_consultation"
                          ? "Free"
                          : srv.pricing_model === "quote_required"
                          ? "On Request"
                          : formatCurrency(currentPrice)}
                      </span>
                      {hasSale && srv.pricing_model !== "free_consultation" && (
                        <span className="text-xs text-muted-foreground line-through">
                          {formatCurrency(srv.price)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {srv.pricing_model.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenEdit(srv)}
                      className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteService(srv.id)}
                      className="h-8 w-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ================= ADD / EDIT SERVICE DIALOG ================= */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              {editingService ? "Edit Marketing Service" : "Create Marketing Service"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure service details, duration, pricing model, delivery mode, and deliverables.
            </DialogDescription>
          </DialogHeader>

          {/* Form Tabs */}
          <div className="flex items-center gap-1 p-1 bg-muted rounded-xl border border-border">
            {FORM_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = formTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFormTab(tab.id)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="space-y-4 py-2">
            {/* TAB 1: BASIC INFO */}
            {formTab === "basic" && (
              <div className="space-y-3 text-xs">
                <div>
                  <Label htmlFor="srv-title" className="text-xs font-semibold">Service Title *</Label>
                  <Input
                    id="srv-title"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. 1-on-1 Career Mentorship & Portfolio Review"
                    className="h-9 text-xs mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="srv-badge" className="text-xs font-semibold">Highlight Badge (Optional)</Label>
                    <Input
                      id="srv-badge"
                      value={formBadge}
                      onChange={(e) => setFormBadge(e.target.value)}
                      placeholder="e.g. Popular, Premium, Limited"
                      className="h-9 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="srv-status" className="text-xs font-semibold">Status</Label>
                    <Select value={formStatus} onValueChange={(v: any) => setFormStatus(v)}>
                      <SelectTrigger id="srv-status" className="h-9 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active (Visible)</SelectItem>
                        <SelectItem value="draft">Draft (Hidden)</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="srv-desc" className="text-xs font-semibold">Description</Label>
                  <Textarea
                    id="srv-desc"
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describe what the client receives, how the session is conducted, and key benefits..."
                    rows={4}
                    className="text-xs mt-1 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border">
                  <div>
                    <span className="font-bold text-foreground block text-xs">Featured Service</span>
                    <span className="text-[11px] text-muted-foreground">Highlight on hero sections and discovery listings</span>
                  </div>
                  <Switch checked={formIsFeatured} onCheckedChange={setFormIsFeatured} />
                </div>
              </div>
            )}

            {/* TAB 2: CATEGORY & SCOPE */}
            {formTab === "category" && (
              <div className="space-y-3 text-xs">
                <div>
                  <Label htmlFor="srv-cat" className="text-xs font-semibold">Service Category</Label>
                  <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                    <SelectTrigger id="srv-cat" className="h-9 text-xs mt-1">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Associated Programs / Bootcamps (Optional)</Label>
                  <p className="text-[11px] text-muted-foreground mb-1.5">
                    Link this consultation service to relevant academic or training courses.
                  </p>
                  <div className="max-h-40 overflow-y-auto p-2 rounded-xl border bg-background space-y-1">
                    {programOptions.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground italic p-2 block">No programs available</span>
                    ) : (
                      programOptions.map((prog) => {
                        const isSelected = formProgramIds.includes(prog.id);
                        return (
                          <div
                            key={prog.id}
                            onClick={() => {
                              if (isSelected) {
                                setFormProgramIds(formProgramIds.filter((id) => id !== prog.id));
                              } else {
                                setFormProgramIds([...formProgramIds, prog.id]);
                              }
                            }}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer transition-colors ${
                              isSelected ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted"
                            }`}
                          >
                            <span>{prog.title}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: IMAGES */}
            {formTab === "images" && (
              <div className="space-y-4 text-xs">
                <div>
                  <Label htmlFor="srv-img" className="text-xs font-semibold">Image URL</Label>
                  <Input
                    id="srv-img"
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    placeholder="https://images.unsplash.com/photo-..."
                    className="h-9 text-xs mt-1"
                  />
                </div>

                <div className="p-4 border-2 border-dashed rounded-xl text-center space-y-2 bg-muted/20">
                  <UploadCloud className="w-8 h-8 text-muted-foreground mx-auto" />
                  <p className="text-xs font-medium text-foreground">Upload Service Cover</p>
                  <p className="text-[10px] text-muted-foreground">PNG, JPG, WEBP up to 10MB</p>
                  <label className="inline-flex items-center justify-center h-8 px-3 text-xs font-bold bg-primary text-primary-foreground rounded-lg cursor-pointer hover:bg-primary/90 gap-1.5">
                    {uploadingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                    <span>{uploadingImage ? "Uploading..." : "Browse File"}</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-muted-foreground uppercase block mb-1.5">
                    Or Pick from Quick Sample Presets
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {SAMPLE_SERVICE_IMAGES.map((sample, idx) => (
                      <div
                        key={idx}
                        onClick={() => setFormImage(sample.url)}
                        className={`p-2 rounded-xl border text-center cursor-pointer transition-all ${
                          formImage === sample.url ? "border-primary bg-primary/10 ring-1 ring-primary" : "hover:bg-muted"
                        }`}
                      >
                        <div className="relative h-16 w-full rounded-lg overflow-hidden bg-muted mb-1">
                          <Image src={sample.url} alt={sample.label} fill sizes="120px" className="object-cover" />
                        </div>
                        <span className="text-[11px] font-semibold text-foreground truncate block">{sample.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PRICING & DURATION */}
            {formTab === "pricing" && (
              <div className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="srv-model" className="text-xs font-semibold">Pricing Model</Label>
                    <Select value={formPricingModel} onValueChange={(v: any) => setFormPricingModel(v)}>
                      <SelectTrigger id="srv-model" className="h-9 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Fixed Price</SelectItem>
                        <SelectItem value="hourly">Hourly Rate</SelectItem>
                        <SelectItem value="per_session">Per Session</SelectItem>
                        <SelectItem value="free_consultation">Free Consultation</SelectItem>
                        <SelectItem value="quote_required">Custom Quote Required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="srv-duration" className="text-xs font-semibold">Estimated Duration (Minutes)</Label>
                    <Input
                      id="srv-duration"
                      type="number"
                      value={formDurationMinutes}
                      onChange={(e) => setFormDurationMinutes(e.target.value)}
                      placeholder="60"
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="srv-price" className="text-xs font-semibold">Regular Price (₹)</Label>
                    <Input
                      id="srv-price"
                      type="number"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      placeholder="e.g. 1999"
                      disabled={formPricingModel === "free_consultation"}
                      className="h-9 text-xs mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="srv-sale" className="text-xs font-semibold">Offer / Sale Price (₹ Optional)</Label>
                    <Input
                      id="srv-sale"
                      type="number"
                      value={formSalePrice}
                      onChange={(e) => setFormSalePrice(e.target.value)}
                      placeholder="e.g. 1499"
                      disabled={formPricingModel === "free_consultation"}
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="srv-mode" className="text-xs font-semibold">Delivery Mode</Label>
                    <Select value={formDeliveryMode} onValueChange={(v: any) => setFormDeliveryMode(v)}>
                      <SelectTrigger id="srv-mode" className="h-9 text-xs mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="online">Online / Video Meeting</SelectItem>
                        <SelectItem value="in_person">In-Person / Onsite</SelectItem>
                        <SelectItem value="hybrid">Hybrid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="srv-loc" className="text-xs font-semibold">Location / Address (If Onsite)</Label>
                    <Input
                      id="srv-loc"
                      value={formServiceLocation}
                      onChange={(e) => setFormServiceLocation(e.target.value)}
                      placeholder="e.g. Campus Studio or Client Office"
                      className="h-9 text-xs mt-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: DELIVERABLES */}
            {formTab === "deliverables" && (
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs font-semibold">What&apos;s Included / Key Deliverables</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormFeatures([...formFeatures, ""])}
                      className="h-7 text-[11px] font-bold text-primary gap-1 p-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Deliverable
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-2">
                    Bullet points displayed on store and checkout (e.g. &quot;Full Portfolio Audit&quot;, &quot;Resume Review&quot;).
                  </p>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {formFeatures.map((feat, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <Input
                          value={feat}
                          onChange={(e) => {
                            const updated = [...formFeatures];
                            updated[idx] = e.target.value;
                            setFormFeatures(updated);
                          }}
                          placeholder={`Deliverable #${idx + 1}`}
                          className="h-9 text-xs"
                        />
                        {formFeatures.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setFormFeatures(formFeatures.filter((_, i) => i !== idx));
                            }}
                            className="h-9 w-9 text-rose-500 shrink-0"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-3 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="text-xs font-semibold">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSaveService}
              disabled={saving}
              className="text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              <span>{saving ? "Saving..." : editingService ? "Update Service" : "Publish Service"}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= CATEGORY MANAGEMENT MODAL ================= */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-primary" />
              Service Categories
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manage classifications and specializations for marketing services.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div>
              <Label htmlFor="cat-name" className="text-xs font-semibold">Category Name *</Label>
              <Input
                id="cat-name"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Legal Advisory & Retainers"
                className="h-9 text-xs mt-1"
              />
            </div>

            <div>
              <Label htmlFor="cat-desc" className="text-xs font-semibold">Description (Optional)</Label>
              <Textarea
                id="cat-desc"
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Brief summary of services in this category..."
                rows={2}
                className="text-xs mt-1 resize-none"
              />
            </div>

            <Button
              type="button"
              size="sm"
              onClick={handleCreateCategory}
              disabled={savingCategory}
              className="w-full text-xs font-bold gap-1.5 cursor-pointer mt-1"
            >
              {savingCategory ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add Category
            </Button>

            <div className="pt-2 border-t space-y-1.5 max-h-48 overflow-y-auto">
              <span className="text-[11px] font-bold text-muted-foreground uppercase block">
                Existing Categories ({categories.length})
              </span>
              {categories.map((c) => (
                <div key={c.id} className="p-2 rounded-lg border bg-muted/30 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-foreground block">{c.name}</span>
                    <span className="text-[10px] text-muted-foreground">{c.services_count || 0} services</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

