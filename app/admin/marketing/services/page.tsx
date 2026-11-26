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
import { useAdminGuard } from "@/hooks/use-admin-guard";
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
import { InheritMasterServicesDialog } from "@/components/admin/catalog/inherit-master-services-dialog";
import { ServiceFormDialog } from "@/components/admin/catalog/service-form-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBusinessCurrency } from "@/hooks/use-business-currency";

export type ServiceCategory = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  is_active: boolean;
  parent_id?: number | null;
  business_category_id?: number | null;
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

export default function AdminServicesPage() {
  const { isReady, isForbidden } = useAdminGuard();
  const { user, accessToken } = useAuthStore();
  const { currencyCode, currencySymbol, formatPrice } = useBusinessCurrency();
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
  const [businessCategories, setBusinessCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedBusinessCategoryId, setSelectedBusinessCategoryId] = useState("all");
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

  // Inherit Master Services Dialog State
  const [inheritModalOpen, setInheritModalOpen] = useState(false);

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
      if (selectedBusinessCategoryId !== "all") params.set("business_category_id", selectedBusinessCategoryId);
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
  }, [accessToken, search, selectedBusinessCategoryId, selectedCategoryId, selectedStatus, selectedDeliveryMode]);

  useEffect(() => {
    fetch("/api/admin/categories?type=business&onlyRoot=true&limit=100")
      .then((r) => r.json())
      .then((d) => {
        if (d?.data && Array.isArray(d.data)) {
          setBusinessCategories(d.data);
        }
      })
      .catch(() => {});
  }, []);

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

  // Root categories filtered by selected business category
  const rootCategories = useMemo(() => {
    const roots = categories.filter((c) => !c.parent_id);
    const pool = roots.length > 0 ? roots : categories;
    if (selectedBusinessCategoryId === "all") return pool;
    return pool.filter((c) => String(c.business_category_id) === String(selectedBusinessCategoryId));
  }, [categories, selectedBusinessCategoryId]);

  const handleOpenCreate = () => {
    setEditingService(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (srv: ServiceRecord) => {
    setEditingService(srv);
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

  if (!isReady || isForbidden) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Checking module access permissions...</p>
        </div>
      </div>
    );
  }

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
            variant="outline"
            size="sm"
            onClick={() => setInheritModalOpen(true)}
            className="h-9 px-3.5 text-xs font-bold border-sky-500/40 text-sky-600 hover:bg-sky-500/10 rounded-xl gap-1.5 shadow-2xs cursor-pointer"
          >
            <Layers className="w-4 h-4 text-sky-600" />
            Inherit
          </Button>

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
          <p className="text-2xl font-black text-foreground mt-1">{formatPrice(stats.avgPrice)}</p>
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
          <Select
            value={selectedBusinessCategoryId}
            onValueChange={(val) => {
              setSelectedBusinessCategoryId(val);
              setSelectedCategoryId("all");
            }}
          >
            <SelectTrigger className="w-[180px] h-9 text-xs font-bold bg-background rounded-lg">
              <SelectValue placeholder="All Business Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Business Types ({businessCategories.length})</SelectItem>
              {businessCategories.map((bc) => (
                <SelectItem key={bc.id} value={String(bc.id)}>
                  {bc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
            <SelectTrigger className="w-[180px] h-9 text-xs font-bold bg-background rounded-lg">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories ({rootCategories.length})</SelectItem>
              {rootCategories.map((c) => (
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
            Inherit pre-configured services from the master catalog or publish your bespoke service package.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => setInheritModalOpen(true)} className="font-bold text-xs rounded-xl border-sky-500/40 text-sky-600 hover:bg-sky-500/10">
              <Layers className="w-4 h-4 mr-1 text-sky-600" /> Inherit from Master Catalog
            </Button>
            <Button size="sm" onClick={handleOpenCreate} className="font-bold text-xs rounded-xl">
              <Plus className="w-4 h-4 mr-1" /> Add Service Now
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {services.map((srv) => {
            const hasSale = Boolean(srv.sale_price && Number(srv.sale_price) < Number(srv.price));
            const currentPrice = hasSale ? Number(srv.sale_price) : Number(srv.price || 0);
            const subtitle = [
              srv.pricing_model ? srv.pricing_model.replace(/_/g, " ") : "Fixed",
              srv.duration_minutes ? `${srv.duration_minutes} ${srv.duration_unit || "mins"}` : null,
              srv.category_name || srv.category || "General",
            ]
              .filter(Boolean)
              .slice(0, 2)
              .join(" • ");

            return (
              <div
                key={srv.id}
                className="p-3 rounded-2xl border transition-all flex items-center gap-3 group relative bg-card hover:bg-muted/30 shadow-2xs hover:shadow-xs border-border/70"
              >
                {/* 1. Left Thumbnail Image */}
                <Link
                  href={`/services/${srv.id}`}
                  className="relative size-16 rounded-xl bg-muted shrink-0 overflow-hidden border border-border/60 block group/img"
                  title={`View ${srv.title}`}
                >
                  {srv.image_url ? (
                    <img
                      src={srv.image_url}
                      alt={srv.title}
                      className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-sky-50 dark:bg-sky-950/20 text-sky-600">
                      <Briefcase className="size-6 opacity-60" />
                    </div>
                  )}
                </Link>

                {/* 2. Middle Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      href={`/services/${srv.id}`}
                      className={`text-xs font-bold truncate transition-colors cursor-pointer block max-w-[170px] hover:underline ${
                        (srv.is_active !== undefined && srv.is_active !== null ? Boolean(srv.is_active) : (srv.status === "active" || srv.status === "published"))
                          ? "!text-emerald-600 dark:!text-emerald-400 hover:!text-emerald-700"
                          : "!text-rose-600 dark:!text-rose-400 hover:!text-rose-700"
                      }`}
                      title={srv.title}
                    >
                      {srv.title}
                    </Link>
                  </div>

                  <p className="text-[11px] text-muted-foreground truncate" title={subtitle}>
                    {subtitle}
                  </p>

                  {/* Pricing */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-black text-foreground">
                      {formatPrice(currentPrice, srv.currency || currencyCode)}
                    </span>
                    {hasSale && (
                      <span className="text-[10px] text-muted-foreground line-through">
                        {formatPrice(srv.price, srv.currency || currencyCode)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground block truncate">
                    {srv.delivery_mode ? srv.delivery_mode.replace(/_/g, " ") : "Online"} • {srv.duration_minutes || 60}m
                  </span>
                </div>

                {/* 3. Right Actions: Status Badge, Info Popover, Edit, Delete */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider ${
                      srv.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    }`}
                  >
                    {srv.status}
                  </Badge>

                  <div className="flex items-center gap-1">
                    {/* Short Description Info Popover */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="size-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer border border-border/40 hover:border-border"
                          title="Click to view details & scope"
                          aria-label="Service description"
                        >
                          <Info className="size-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-3 text-xs rounded-xl shadow-xl border bg-background" side="top">
                        <div className="space-y-2">
                          <div className="font-bold text-foreground text-xs line-clamp-1 border-b pb-1.5 flex items-center justify-between">
                            <span>{srv.title}</span>
                            <span className="text-[10px] text-sky-600 font-black">{formatPrice(currentPrice, srv.currency || currencyCode)}</span>
                          </div>
                          <p className="text-muted-foreground text-[11px] leading-relaxed">
                            {srv.description || "No description provided."}
                          </p>
                          {Array.isArray(srv.features) && srv.features.length > 0 && (
                            <div className="pt-1.5 border-t space-y-1">
                              <span className="text-[10px] font-bold text-muted-foreground uppercase block">Inclusions:</span>
                              {srv.features.slice(0, 3).map((f, i) => (
                                <div key={i} className="text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Check className="size-3 text-emerald-600 shrink-0" />
                                  <span className="truncate">{f}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          <div className="pt-1 border-t flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                            <span>Category: {srv.category_name || srv.category}</span>
                            <span>Model: {srv.pricing_model || "Fixed"}</span>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(srv)}
                      className="size-7 p-0 rounded-lg text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/20 border-border/40 hover:border-border"
                      title="Edit Service"
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteService(srv.id)}
                      className="size-7 p-0 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-border/40 hover:border-border"
                      title="Delete Service"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ================= ADD / EDIT SERVICE DIALOG (Same as Platform Admin) ================= */}
      <ServiceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        service={editingService as any}
        onSuccess={fetchServices}
        accessToken={accessToken}
      />

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

      {/* INHERIT FROM MASTER CATALOG DIALOG */}
      <InheritMasterServicesDialog
        open={inheritModalOpen}
        onOpenChange={setInheritModalOpen}
        onSuccess={fetchServices}
        accessToken={accessToken}
      />
    </div>
  );
}

