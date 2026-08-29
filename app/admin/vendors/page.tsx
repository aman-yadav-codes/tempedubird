"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store";
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
import { toast } from "sonner";
import { UniversalLocationPicker } from "@/components/shared/universal-location-picker";
import {
  Briefcase,
  Building,
  Building2,
  Calendar,
  CheckCircle2,
  Edit,
  Eye,
  Home,
  Laptop,
  Library,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Shirt,
  Smartphone,
  Sparkles,
  Star,
  Trash2,
  Utensils,
  Wrench,
} from "lucide-react";

export const VENDOR_CATEGORIES = [
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
  const isPlatformAdmin = isPlatformAdminUser(user);

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cityFilter, setCityFilter] = useState("all");
  const [areaFilter, setAreaFilter] = useState("all");
  const [availableCities, setAvailableCities] = useState<string[]>([]);
  const [availableAreas, setAvailableAreas] = useState<string[]>([]);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
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

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
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
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch vendor records");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, cityFilter, areaFilter, searchQuery]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setFormName("");
    setFormCategory(selectedCategory !== "all" ? selectedCategory : "House Cleaner");
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
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to delete vendor");
      }
    } catch {
      toast.error("Failed to delete vendor");
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

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchVendors} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md gap-1.5">
            <Plus className="w-4 h-4" /> Add New Vendor
          </Button>
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

        <div className="w-full sm:w-56">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="h-10 text-xs bg-background rounded-xl font-medium">
              <div className="flex items-center gap-2 truncate">
                <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                <SelectValue placeholder="All Categories" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {VENDOR_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                return (
                  <SelectItem key={cat.id} value={cat.id} className="text-xs">
                    <div className="flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5 text-muted-foreground" />
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
          <Button onClick={handleOpenAdd} size="sm" className="mt-2 font-bold">
            <Plus className="w-4 h-4 mr-1.5" /> Add Vendor Record
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {vendors.map((vendor) => (
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
                      <Badge variant="outline" className="text-[10px] font-bold mt-1 text-primary border-primary/30">
                        {vendor.category}
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

              <CardFooter className="p-4 bg-muted/20 border-t flex items-center justify-between gap-2">
                <a
                  href={`tel:${vendor.phone}`}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                >
                  <Phone className="w-3 h-3" /> Call Vendor
                </a>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(vendor)} className="h-8 text-xs font-semibold">
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteVendor(vendor.id)} className="h-8 text-xs text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

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

            <div className="space-y-4 py-4 text-xs">
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
                  <Label htmlFor="v-cat">Service Category *</Label>
                  <Select value={formCategory} onValueChange={setFormCategory}>
                    <SelectTrigger id="v-cat">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {VENDOR_CATEGORIES.filter((c) => c.id !== "all").map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.label}
                        </SelectItem>
                      ))}
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

              {/* Standard Address & Map Pin Location */}
              <div className="pt-2 border-t">
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
                  <Label htmlFor="v-img">Profile Picture / Logo URL</Label>
                  <Input
                    id="v-img"
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
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
    </div>
  );
}
