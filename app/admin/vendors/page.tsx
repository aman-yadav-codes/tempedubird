"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { UniversalLocationPicker } from "@/components/shared/universal-location-picker";
import {
  Briefcase,
  Building,
  Building2,
  Calendar,
  Camera,
  Car,
  CheckCircle2,
  Coffee,
  Edit,
  Eye,
  FolderPlus,
  GraduationCap,
  HeartHandshake,
  Home,
  Laptop,
  Layers,
  Library,
  Loader2,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  RefreshCw,
  Scissors,
  Search,
  Send,
  Shield,
  Shirt,
  Smartphone,
  Sparkles,
  Star,
  Tag,
  Trash2,
  Truck,
  Utensils,
  Wrench,
  Zap,
} from "lucide-react";
import { UniversalFeedbackDialog, type UniversalEntityTarget } from "@/components/public/universal-feedback-dialog";
import { CourseEnquiryDialog } from "@/components/public/course-enquiry-dialog";

export const ICON_MAP: Record<string, any> = {
  Briefcase,
  Sparkles,
  Shirt,
  Utensils,
  Home,
  Building2,
  Library,
  Building,
  Laptop,
  Wrench,
  Smartphone,
  Camera,
  Car,
  Scissors,
  Shield,
  Zap,
  Coffee,
  Truck,
  GraduationCap,
  HeartHandshake,
  Tag,
};

export function getCategoryIconComponent(iconName?: string | null) {
  if (!iconName) return Briefcase;
  return ICON_MAP[iconName] || Briefcase;
}

export const INITIAL_VENDOR_CATEGORIES = [
  { id: "all", label: "All Categories", icon: Briefcase },
  { id: "House Cleaner", label: "House Cleaner", icon: Sparkles },
  { id: "Dhobi / Cloth Cleaner", label: "Dhobi / Laundry", icon: Shirt },
  { id: "Cook / Catering", label: "Cook / Mess Catering", icon: Utensils },
  { id: "PG Owners", label: "PG Owners", icon: Home },
  { id: "Hostel Owners", label: "Hostel Owners", icon: Building2 },
  { id: "Library Owners", label: "Library Owners", icon: Library },
  { id: "Books & Stationery", label: "Books & Stationery", icon: Building },
  { id: "Tech Product Providers", label: "Tech Products & Gadgets", icon: Laptop },
  { id: "Computer Repairing Service", label: "Computer / Laptop Repair", icon: Wrench },
  { id: "Mobile Repair", label: "Mobile Repair", icon: Smartphone },
  { id: "Job Consultancy", label: "Job & Placement Consultancy", icon: Briefcase },
];

export const VENDOR_CATEGORIES = INITIAL_VENDOR_CATEGORIES;

export type VendorCategory = {
  id: number | string;
  name: string;
  slug?: string;
  icon?: string;
  description?: string | null;
  institution_id?: number | null;
  is_active?: boolean;
  vendor_count?: number;
};

export type Vendor = {
  id: number;
  name: string;
  category: string;
  phone: string;
  email: string | null;
  profile_image: string | null;
  address: string | null;
  city: string | null;
  location: string | null;
  country?: string | null;
  state?: string | null;
  map_url: string | null;
  rating: number;
  status: "active" | "inactive";
  description: string | null;
  created_at: string;
};

export default function AdminVendorsPage() {
  const { user, accessToken } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const canManage = isPlatformAdmin || (user as any)?.role === "institution_admin" || Boolean((user as any)?.institution_id) || Boolean(activeInstitution);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [categories, setCategories] = useState<VendorCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);

  // Category Dialog State
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryTab, setCategoryTab] = useState<"create" | "manage">("create");
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  // Feedback & Enquiry State
  const [feedbackTarget, setFeedbackTarget] = useState<UniversalEntityTarget | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [enquiryVendor, setEnquiryVendor] = useState<Vendor | null>(null);
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  // Vendor Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [dialogTab, setDialogTab] = useState<"info" | "location">("info");
  const [saving, setSaving] = useState(false);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("House Cleaner");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formCountry, setFormCountry] = useState("India");
  const [formState, setFormState] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formRating, setFormRating] = useState("4.8");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");

  const fetchCategories = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeInstitution?.id) params.set("institution_id", String(activeInstitution.id));
      const res = await fetch(`/api/admin/vendors/categories?${params.toString()}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error("Failed to fetch vendor categories:", err);
    }
  }, [activeInstitution]);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeInstitution?.id) params.set("institution_id", String(activeInstitution.id));
      if (selectedCategory && selectedCategory !== "all") params.set("category", selectedCategory);
      if (cityFilter && cityFilter !== "all") params.set("city", cityFilter);
      if (areaFilter && areaFilter !== "all") params.set("area", areaFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/vendors?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load vendors");
      setVendors(data.vendors || []);
      if (Array.isArray(data.cities)) setAvailableCities(data.cities);
      if (Array.isArray(data.areas)) setAvailableAreas(data.areas);
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        setCategories(data.categories);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch vendor records");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, cityFilter, areaFilter, searchQuery, activeInstitution]);

  useEffect(() => {
    fetchCategories();
    fetchVendors();
  }, [fetchCategories, fetchVendors]);

  // Merge static fallback and dynamic categories into unified list
  const categoryOptions = useMemo(() => {
    if (categories.length > 0) {
      return categories.map((c) => ({
        id: c.name,
        label: c.name,
        icon: getCategoryIconComponent(c.icon),
        raw: c,
      }));
    }
    return INITIAL_VENDOR_CATEGORIES.filter((c) => c.id !== "all");
  }, [categories]);

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setDialogTab("info");
    setFormName("");
    setFormCategory(selectedCategory !== "all" ? selectedCategory : (categoryOptions[0]?.label || "House Cleaner"));
    setFormPhone("");
    setFormEmail("");
    setFormImage("");
    setFormCountry("India");
    setFormState("");
    setFormCity(cityFilter !== "all" ? cityFilter : "");
    setFormLocation(areaFilter !== "all" ? areaFilter : "");
    setFormAddress("");
    setFormRating("4.8");
    setFormDescription("");
    setFormStatus("active");
    setDialogOpen(true);
  };

  const handleOpenEdit = (v: Vendor) => {
    setEditingVendor(v);
    setDialogTab("info");
    setFormName(v.name || "");
    setFormCategory(v.category || "House Cleaner");
    setFormPhone(v.phone || "");
    setFormEmail(v.email || "");
    setFormImage(v.profile_image || "");
    setFormCountry(v.country || "India");
    setFormState(v.state || "");
    setFormCity(v.city || "");
    setFormLocation(v.location || "");
    setFormAddress(v.address || "");
    setFormRating(String(v.rating || 4.5));
    setFormDescription(v.description || "");
    setFormStatus(v.status || "active");
    setDialogOpen(true);
  };

  const handleSaveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      toast.error("Please fill in Vendor Name and Contact Phone Number");
      return;
    }

    setSaving(true);
    try {
      const method = editingVendor ? "PUT" : "POST";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/vendors", {
        method,
        headers,
        body: JSON.stringify({
          id: editingVendor?.id,
          name: formName.trim(),
          category: formCategory,
          phone: formPhone.trim(),
          email: formEmail.trim() || null,
          profile_image: formImage.trim() || null,
          address: formAddress.trim() || null,
          city: formCity.trim() || null,
          location: formLocation.trim() || null,
          country: formCountry.trim() || "India",
          state: formState.trim() || null,
          rating: Number(formRating) || 4.5,
          description: formDescription.trim() || null,
          status: formStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save vendor");

      toast.success(editingVendor ? "Vendor details updated!" : "Vendor added successfully!");
      setDialogOpen(false);
      fetchVendors();
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to save vendor record");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteVendor = async (id: number) => {
    if (!confirm("Are you sure you want to delete this vendor record?")) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/vendors?id=${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        toast.success("Vendor deleted successfully");
        fetchVendors();
        fetchCategories();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to delete vendor");
      }
    } catch {
      toast.error("Failed to delete vendor");
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    setSavingCategory(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/vendors/categories", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: newCatName.trim(),
          icon: "Briefcase",
          description: newCatDesc.trim() || null,
          institution_id: activeInstitution?.id || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create category");
      }

      toast.success(`Category "${newCatName.trim()}" created successfully!`);
      const createdCategoryName = data.category?.name || newCatName.trim();
      
      // Auto select in vendor form if dialog is open
      if (dialogOpen) {
        setFormCategory(createdCategoryName);
      }

      setNewCatName("");
      setNewCatDesc("");
      setCategoryDialogOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to create category");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (catId: number | string, catName: string) => {
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return;

    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/vendors/categories?id=${catId}`, {
        method: "DELETE",
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete category");
      }

      toast.success(`Category "${catName}" deleted successfully`);
      if (selectedCategory === catName) {
        setSelectedCategory("all");
      }
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <Briefcase className="w-4 h-4" />
            <span>Platform Resource Directory</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Vendors & Student Services</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage trusted student utilities, accommodations, cleaners, PG & hostel owners, IT repairs, and job consultants.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => { fetchVendors(); fetchCategories(); }} disabled={loading} className="gap-1.5 shadow-2xs">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>

          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCategoryTab("create");
                setCategoryDialogOpen(true);
              }}
              className="gap-1.5 border-primary/40 text-primary hover:bg-primary/10 font-bold shadow-2xs"
            >
              <Tag className="w-4 h-4 text-primary" /> + Add Category
            </Button>
          )}

          {canManage && (
            <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md gap-1.5">
              <Plus className="w-4 h-4" /> Add New Vendor
            </Button>
          )}
        </div>
      </div>

      {/* Search & Filters Bar (Category, City, Area) */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-muted/30 p-3 rounded-2xl border">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vendor by name, phone, email, services..."
            className="pl-9 bg-background h-10 text-xs rounded-xl"
          />
        </div>

        {/* Dynamic Category Filter */}
        <div className="w-full sm:w-56">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-10 text-xs bg-background rounded-xl font-medium">
              <div className="flex items-center gap-2 truncate">
                <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                <SelectValue placeholder="All Categories" />
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="all" className="text-xs font-semibold">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>All Categories</span>
                </div>
              </SelectItem>
              {categoryOptions.map((cat) => {
                const Icon = cat.icon;
                return (
                  <SelectItem key={cat.id} value={cat.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-primary" />
                      <span>{cat.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* City Filter */}
        <div className="w-full sm:w-48">
          <Select
            value={cityFilter}
            onValueChange={(val) => {
              setCityFilter(val);
              setAreaFilter("all");
            }}
          >
            <SelectTrigger className="h-10 text-xs bg-background rounded-xl font-medium">
              <div className="flex items-center gap-2 truncate">
                <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                <SelectValue placeholder="All Cities" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>All Cities</span>
                </div>
              </SelectItem>
              {availableCities.map((city) => (
                <SelectItem key={city} value={city} className="text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-amber-500" />
                    <span>{city}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Area Filter */}
        <div className="w-full sm:w-48">
          <Select value={areaFilter} onValueChange={setAreaFilter}>
            <SelectTrigger className="h-10 text-xs bg-background rounded-xl font-medium">
              <div className="flex items-center gap-2 truncate">
                <MapPin className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                <SelectValue placeholder="All Areas" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>All Areas</span>
                </div>
              </SelectItem>
              {availableAreas.map((area) => (
                <SelectItem key={area} value={area} className="text-xs">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-purple-500" />
                    <span>{area}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Category Quick Chips Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
            selectedCategory === "all"
              ? "bg-primary text-primary-foreground border-primary shadow-xs"
              : "bg-background text-muted-foreground hover:text-foreground border-border hover:bg-muted/50"
          }`}
        >
          <Briefcase className="w-3.5 h-3.5" />
          <span>All</span>
          <span className="ml-0.5 text-[10px] opacity-80 font-mono">({vendors.length})</span>
        </button>

        {categoryOptions.map((cat) => {
          const Icon = cat.icon;
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary shadow-xs"
                  : "bg-background text-muted-foreground hover:text-foreground border-border hover:bg-muted/50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}

        {canManage && (
          <button
            type="button"
            onClick={() => {
              setCategoryTab("create");
              setCategoryDialogOpen(true);
            }}
            className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-bold text-primary border border-dashed border-primary/40 hover:bg-primary/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Category
          </button>
        )}
      </div>

      {/* Vendors Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
          <span className="text-sm font-medium text-muted-foreground">Loading vendor directory...</span>
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-20 border rounded-3xl bg-muted/10 space-y-3">
          <Briefcase className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-lg font-bold text-foreground">No vendors found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            No vendor records match your selected category and search filters. Click &quot;Add New Vendor&quot; to list student service providers.
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            {canManage && (
              <Button onClick={handleOpenAdd} size="sm" className="font-bold">
                <Plus className="w-4 h-4 mr-1.5" /> Add Vendor Record
              </Button>
            )}
            {canManage && (
              <Button onClick={() => setCategoryDialogOpen(true)} variant="outline" size="sm" className="font-bold">
                <Tag className="w-4 h-4 mr-1.5" /> Add New Category
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {vendors.map((vendor) => {
            const CatIcon = getCategoryIconComponent(
              categories.find((c) => c.name.toLowerCase() === vendor.category?.toLowerCase())?.icon
            );
            return (
              <Card
                key={vendor.id}
                className="rounded-2xl border border-border/80 hover:border-primary/50 transition-all shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-lg overflow-hidden shrink-0">
                        {vendor.profile_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={vendor.profile_image} alt={vendor.name} className="w-full h-full object-cover" />
                        ) : (
                          vendor.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-base font-bold leading-tight">{vendor.name}</CardTitle>
                        <Badge variant="outline" className="text-[10px] font-bold mt-1 text-primary border-primary/30 gap-1 inline-flex items-center">
                          <CatIcon className="w-2.5 h-2.5" />
                          <span>{vendor.category}</span>
                        </Badge>
                      </div>
                    </div>
                    <Badge variant={vendor.status === "active" ? "default" : "secondary"} className="text-[10px] shrink-0">
                      {vendor.status}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-3 text-xs">
                  {vendor.description && (
                    <p className="text-muted-foreground line-clamp-2 leading-relaxed">{vendor.description}</p>
                  )}

                  <div className="space-y-1.5 pt-2 border-t text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="font-semibold text-foreground font-mono">{vendor.phone}</span>
                    </div>
                    {vendor.email && (
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{vendor.email}</span>
                      </div>
                    )}
                    {(vendor.city || vendor.location) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        {vendor.city && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                            <MapPin className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                            {vendor.city}
                          </span>
                        )}
                        {vendor.location && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200/80 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">
                            Area: {vendor.location}
                          </span>
                        )}
                      </div>
                    )}
                    {vendor.address && (
                      <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                        <span>{vendor.address}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 pt-1">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                      <span className="font-bold text-foreground">{vendor.rating} / 5.0 Rating</span>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="p-4 bg-muted/20 border-t space-y-2.5 flex flex-col">
                  <div className="w-full grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setFeedbackTarget({
                          type: "vendor",
                          id: vendor.id,
                          title: vendor.name,
                          subtitle: `${vendor.category} • ${vendor.city || vendor.location || "Vendor Services"}`,
                          avg_rating: vendor.rating || 5.0,
                          review_count: 18,
                        });
                        setFeedbackOpen(true);
                      }}
                      className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-amber-300 bg-amber-50/70 text-xs font-bold text-amber-800 transition hover:bg-amber-100 cursor-pointer shadow-2xs"
                    >
                      <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                      <span>Reviews & Q&A</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setEnquiryVendor(vendor);
                        setEnquiryOpen(true);
                      }}
                      className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-xs font-bold text-primary-foreground transition hover:bg-primary/90 cursor-pointer shadow-xs"
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>Enquiry</span>
                    </button>
                  </div>

                  {canManage && (
                    <div className="w-full flex items-center justify-between pt-1 border-t border-border/40">
                      <a
                        href={`tel:${vendor.phone}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground hover:text-primary hover:underline"
                      >
                        <Phone className="w-3 h-3" /> {vendor.phone}
                      </a>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(vendor)} className="h-7 px-2 text-[11px] font-semibold">
                          <Edit className="w-3 h-3 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteVendor(vendor.id)} className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Manage Vendor Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-0.5">
              <Tag className="w-4 h-4" />
              <span>Vendor Categories</span>
            </div>
            <DialogTitle>Vendor Service Categories</DialogTitle>
            <DialogDescription>
              Create new categories or manage existing vendor classification tags.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={categoryTab} onValueChange={(val: any) => setCategoryTab(val)} className="w-full pt-1">
            <TabsList className="grid grid-cols-2 w-full h-9 bg-muted/60 p-1 rounded-xl mb-4">
              <TabsTrigger
                value="create"
                className="text-xs font-semibold flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </TabsTrigger>
              <TabsTrigger
                value="manage"
                className="text-xs font-semibold flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Categories ({categories.length || categoryOptions.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Create Category */}
            <TabsContent value="create" className="space-y-4 outline-none">
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cat-name" className="font-semibold text-xs">Category Name *</Label>
                  <Input
                    id="cat-name"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Electrician & Plumbing, Tiffin Box Delivery..."
                    className="h-10 text-xs"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="cat-desc" className="font-semibold text-xs">Description (Optional)</Label>
                  <Textarea
                    id="cat-desc"
                    rows={3}
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Briefly describe what services belong to this category..."
                    className="text-xs"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCategoryDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={savingCategory} className="font-bold">
                    {savingCategory ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
                    Save Category
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            {/* Tab 2: Manage Categories */}
            <TabsContent value="manage" className="space-y-3 outline-none">
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {categories.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    Default system categories are currently active.
                  </div>
                ) : (
                  categories.map((cat) => {
                    const IconComp = getCategoryIconComponent(cat.icon);
                    const isCustom = cat.institution_id !== null && cat.institution_id !== undefined;
                    return (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border bg-card/60 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                            <IconComp className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-foreground">{cat.name}</span>
                              {isCustom && (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Custom</Badge>
                              )}
                            </div>
                            {cat.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1">{cat.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {cat.vendor_count || 0} vendor{Number(cat.vendor_count || 0) === 1 ? "" : "s"}
                          </span>
                          {canManage && typeof cat.id === "number" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCategoryTab("create")}
                  className="text-xs font-semibold gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Category
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setCategoryDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Vendor Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={handleSaveVendor}>
            <DialogHeader>
              <DialogTitle>{editingVendor ? "Edit Vendor Record" : "Add New Vendor Service Provider"}</DialogTitle>
              <DialogDescription>
                Provide service provider details, location, phone numbers, and profile photo.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <Tabs value={dialogTab} onValueChange={(val: any) => setDialogTab(val)} className="w-full">
                <TabsList className="grid grid-cols-2 w-full h-10 bg-muted/60 p-1 rounded-xl mb-4">
                  <TabsTrigger
                    value="info"
                    className="text-xs font-semibold flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    <Building2 className="w-3.5 h-3.5" />
                    <span>1. Business Info & Services</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="location"
                    className="text-xs font-semibold flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    <span>2. Address & Location</span>
                  </TabsTrigger>
                </TabsList>

                {/* Tab 1: Business Info & Services */}
                <TabsContent value="info" className="space-y-4 pt-1 outline-none">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="v-name">Vendor / Business Name *</Label>
                      <Input
                        id="v-name"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        placeholder="e.g. QuickClean Laundry Services"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="v-cat">Service Category *</Label>
                        <button
                          type="button"
                          onClick={() => {
                            setCategoryTab("create");
                            setCategoryDialogOpen(true);
                          }}
                          className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" /> New Category
                        </button>
                      </div>
                      <Select value={formCategory} onValueChange={setFormCategory}>
                        <SelectTrigger id="v-cat">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                          {categoryOptions.map((cat) => {
                            const IconComp = cat.icon;
                            return (
                              <SelectItem key={cat.id} value={cat.id}>
                                <div className="flex items-center gap-2">
                                  <IconComp className="w-3.5 h-3.5 text-primary" />
                                  <span>{cat.label}</span>
                                </div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="v-phone">Contact Phone Number *</Label>
                      <Input
                        id="v-phone"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="v-email">Email Address</Label>
                      <Input
                        id="v-email"
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="contact@vendor.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="v-rating">Rating (1 to 5)</Label>
                      <Input
                        id="v-rating"
                        type="number"
                        step="0.1"
                        min="1"
                        max="5"
                        value={formRating}
                        onChange={(e) => setFormRating(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="v-status">Status</Label>
                      <Select value={formStatus} onValueChange={(val: any) => setFormStatus(val)}>
                        <SelectTrigger id="v-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active (Visible)</SelectItem>
                          <SelectItem value="inactive">Inactive (Hidden)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="v-img">Profile Picture / Logo URL</Label>
                    <Input
                      id="v-img"
                      value={formImage}
                      onChange={(e) => setFormImage(e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="v-desc">Service Description</Label>
                    <Textarea
                      id="v-desc"
                      rows={2}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Describe offered services, student discounts, operating timings..."
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setDialogTab("location")}
                      className="text-xs font-semibold gap-1"
                    >
                      Next: Address & Location →
                    </Button>
                  </div>
                </TabsContent>

                {/* Tab 2: Address & Location */}
                <TabsContent value="location" className="space-y-4 pt-1 outline-none">
                  <UniversalLocationPicker
                    value={{
                      country: formCountry,
                      state: formState,
                      city: formCity,
                      area: formLocation,
                      address: formAddress,
                    }}
                    onChange={(loc) => {
                      setFormCountry(loc.country || "India");
                      setFormState(loc.state || "");
                      setFormCity(loc.city || "");
                      setFormLocation(loc.area || "");
                      setFormAddress(loc.address || "");
                    }}
                    showCoordinates={false}
                  />

                  <div className="flex justify-start pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDialogTab("info")}
                      className="text-xs"
                    >
                      ← Back
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                {editingVendor ? "Update Vendor" : "Save Vendor"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Universal Feedback Dialog */}
      <UniversalFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        target={feedbackTarget}
      />

      {/* Vendor Enquiry Dialog */}
      <CourseEnquiryDialog
        open={enquiryOpen}
        onOpenChange={setEnquiryOpen}
        course={enquiryVendor ? {
          id: enquiryVendor.id,
          title: enquiryVendor.name,
          institute: `${enquiryVendor.category} • ${enquiryVendor.city || enquiryVendor.location || "Vendor Services"}`,
          price: "Service Inquiry",
          duration: enquiryVendor.phone,
        } : null}
      />
    </div>
  );
}
