"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  Building2,
  Plus,
  Search,
  IndianRupee,
  RefreshCw,
  Tag,
  Check,
  X,
  Edit2,
  Trash2,
  MapPin,
  Home,
  Bed,
  Bath,
  Maximize2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Filter,
  ShieldCheck,
  Layers,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export type PropertyRecord = {
  id: number;
  title: string;
  slug?: string;
  property_type: string;
  listing_type: string;
  price: number | string;
  price_prefix?: string;
  price_suffix?: string;
  bedrooms?: number;
  bathrooms?: number;
  balconies?: number;
  area_sqft?: number;
  carpet_area_sqft?: number;
  furnishing?: string;
  floor_number?: string;
  facing?: string;
  address?: string;
  locality?: string;
  city?: string;
  state?: string;
  pincode?: string;
  amenities?: string[];
  image_url?: string;
  description?: string;
  possession_status?: string;
  status: string;
  is_featured: boolean;
  created_at?: string;
};

const PROPERTY_TYPES = [
  "Apartment / Flat",
  "Independent Villa",
  "Commercial Office",
  "Retail Shop",
  "Plot / Land",
  "Penthouse",
  "Warehouse / Godown",
  "Studio Apartment",
];

const LISTING_TYPES = ["For Sale", "For Rent", "Commercial Lease", "PG / Co-living"];
const FURNISHING_TYPES = ["Furnished", "Semi-Furnished", "Unfurnished"];

export default function MarketingPropertiesPage({ isMasterCatalog = false }: { isMasterCatalog?: boolean } = {}) {
  const { user } = useAuthStore();
  const [properties, setProperties] = useState<PropertyRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, available: 0, for_sale: 0, for_rent: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [listingFilter, setListingFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<PropertyRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    property_type: "Apartment / Flat",
    listing_type: "For Sale",
    price: "",
    price_prefix: "₹",
    price_suffix: "",
    bedrooms: 2,
    bathrooms: 2,
    balconies: 1,
    area_sqft: "",
    carpet_area_sqft: "",
    furnishing: "Semi-Furnished",
    floor_number: "",
    facing: "East",
    address: "",
    locality: "",
    city: "",
    state: "",
    pincode: "",
    amenities: ["Car Parking", "Power Backup", "Security / CCTV", "Lift", "Water Storage"] as string[],
    image_url: "",
    description: "",
    possession_status: "Ready to Move",
    status: "available",
    is_featured: false,
  });

  const [amenityInput, setAmenityInput] = useState("");

  const fetchProperties = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("property_type", typeFilter);
      if (listingFilter !== "all") params.set("listing_type", listingFilter);

      const res = await fetch(`/api/admin/marketing/properties?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load properties");
      const data = await res.json();
      setProperties(data.properties || []);
      setStats(data.stats || { total: 0, available: 0, for_sale: 0, for_rent: 0 });
    } catch (err: any) {
      toast.error(err?.message || "Failed to load properties");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, listingFilter]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const handleOpenAdd = () => {
    setEditingProperty(null);
    setFormData({
      title: "",
      property_type: "Apartment / Flat",
      listing_type: "For Sale",
      price: "",
      price_prefix: "₹",
      price_suffix: "",
      bedrooms: 2,
      bathrooms: 2,
      balconies: 1,
      area_sqft: "",
      carpet_area_sqft: "",
      furnishing: "Semi-Furnished",
      floor_number: "",
      facing: "East",
      address: "",
      locality: "",
      city: "",
      state: "",
      pincode: "",
      amenities: ["Car Parking", "Power Backup", "Security / CCTV", "Lift", "Water Storage"],
      image_url: "",
      description: "",
      possession_status: "Ready to Move",
      status: "available",
      is_featured: false,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (p: PropertyRecord) => {
    setEditingProperty(p);
    setFormData({
      title: p.title || "",
      property_type: p.property_type || "Apartment / Flat",
      listing_type: p.listing_type || "For Sale",
      price: p.price ? String(p.price) : "",
      price_prefix: p.price_prefix || "₹",
      price_suffix: p.price_suffix || "",
      bedrooms: p.bedrooms || 2,
      bathrooms: p.bathrooms || 2,
      balconies: p.balconies || 1,
      area_sqft: p.area_sqft ? String(p.area_sqft) : "",
      carpet_area_sqft: p.carpet_area_sqft ? String(p.carpet_area_sqft) : "",
      furnishing: p.furnishing || "Semi-Furnished",
      floor_number: p.floor_number || "",
      facing: p.facing || "East",
      address: p.address || "",
      locality: p.locality || "",
      city: p.city || "",
      state: p.state || "",
      pincode: p.pincode || "",
      amenities: Array.isArray(p.amenities) ? p.amenities : [],
      image_url: p.image_url || "",
      description: p.description || "",
      possession_status: p.possession_status || "Ready to Move",
      status: p.status || "available",
      is_featured: Boolean(p.is_featured),
    });
    setDialogOpen(true);
  };

  const handleAddAmenity = () => {
    if (!amenityInput.trim()) return;
    if (!formData.amenities.includes(amenityInput.trim())) {
      setFormData((prev) => ({ ...prev, amenities: [...prev.amenities, amenityInput.trim()] }));
    }
    setAmenityInput("");
  };

  const handleRemoveAmenity = (amenity: string) => {
    setFormData((prev) => ({ ...prev, amenities: prev.amenities.filter((a) => a !== amenity) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Please enter a property title");
      return;
    }

    try {
      setSubmitting(true);
      const url = editingProperty ? `/api/admin/marketing/properties/${editingProperty.id}` : `/api/admin/marketing/properties`;
      const method = editingProperty ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save property");
      }

      toast.success(editingProperty ? "Property updated successfully!" : "Property listed in marketing catalog!");
      setDialogOpen(false);
      fetchProperties();
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/marketing/properties/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete property");
      toast.success("Property removed successfully");
      setDeleteConfirmId(null);
      fetchProperties();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Building2 className="size-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {isMasterCatalog ? "Master Properties Catalog" : "Real Estate & Property Listings"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isMasterCatalog
              ? "Platform-wide master property, residential, commercial, and rental templates."
              : "Manage your commercial & residential properties, plots, rental listings, and real estate offerings."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchProperties}
            className="rounded-xl h-9 gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            onClick={handleOpenAdd}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-9 px-4 gap-1.5 shadow-sm"
          >
            <Plus className="size-4" />
            <span>{isMasterCatalog ? "Add Master Property" : "Add Property"}</span>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Listings</p>
              <p className="text-2xl font-black text-foreground mt-1">{stats.total}</p>
            </div>
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Building2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{stats.available}</p>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">For Sale</p>
              <p className="text-2xl font-black text-indigo-600 mt-1">{stats.for_sale}</p>
            </div>
            <div className="size-10 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
              <Home className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">For Rent</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{stats.for_rent}</p>
            </div>
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <KeyRound className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="bg-card p-3 rounded-2xl border shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, locality, city, property type..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-background"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[160px] h-10 rounded-xl bg-background">
              <SelectValue placeholder="Property Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {PROPERTY_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={listingFilter} onValueChange={setListingFilter}>
            <SelectTrigger className="w-[140px] h-10 rounded-xl bg-background">
              <SelectValue placeholder="Listing Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Listings</SelectItem>
              {LISTING_TYPES.map((l) => (
                <SelectItem key={l} value={l}>{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : properties.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-3xl bg-card space-y-3">
          <div className="size-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <Building2 className="size-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No Properties Listed Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Add your apartments, commercial spaces, villas, and plots to reach interested buyers and tenants.
          </p>
          <Button onClick={handleOpenAdd} className="mt-2 rounded-xl">
            <Plus className="size-4 mr-1.5" />
            List First Property
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {properties.map((p) => (
            <Card key={p.id} className="rounded-2xl border shadow-xs overflow-hidden group hover:border-primary/50 transition-all flex flex-col justify-between">
              <div>
                <div className="relative w-full h-48 bg-muted overflow-hidden">
                  {p.image_url ? (
                    <Image
                      src={p.image_url}
                      alt={p.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/60 text-muted-foreground">
                      <Building2 className="size-12 opacity-40" />
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <Badge variant="secondary" className="bg-background/90 backdrop-blur-md text-foreground font-bold shadow-xs">
                      {p.listing_type}
                    </Badge>
                    {p.is_featured && (
                      <Badge className="bg-amber-500 text-white gap-1 text-[10px] font-bold">
                        <Sparkles className="size-3" /> Featured
                      </Badge>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <Badge
                      className={
                        p.status === "available"
                          ? "bg-emerald-600 text-white"
                          : p.status === "sold"
                          ? "bg-blue-600 text-white"
                          : "bg-amber-600 text-white"
                      }
                    >
                      {p.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-5 space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-primary">
                      {p.property_type}
                    </div>
                    <h3 className="text-lg font-black text-foreground mt-0.5 group-hover:text-primary transition-colors line-clamp-1">
                      {p.title}
                    </h3>
                    {(p.locality || p.city) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        <MapPin className="size-3 text-rose-500 shrink-0" />
                        <span className="line-clamp-1">{[p.locality, p.city].filter(Boolean).join(", ")}</span>
                      </div>
                    )}
                  </div>

                  {/* Specs */}
                  <div className="grid grid-cols-3 gap-2 py-2 border-y text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Bed className="size-3.5 text-primary" />
                      <span>{p.bedrooms || 2} BHK</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Bath className="size-3.5 text-primary" />
                      <span>{p.bathrooms || 2} Bath</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Maximize2 className="size-3.5 text-primary" />
                      <span>{p.area_sqft ? `${p.area_sqft} sqft` : "Spacious"}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="pt-1">
                    <div className="text-lg font-black text-foreground">
                      ₹{Number(p.price).toLocaleString("en-IN")}
                      {p.price_suffix && <span className="text-xs font-normal text-muted-foreground"> {p.price_suffix}</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {p.furnishing} • {p.possession_status || "Ready to Move"}
                    </div>
                  </div>
                </CardContent>
              </div>

              <div className="px-5 pb-5 pt-1 flex items-center justify-end gap-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEdit(p)}
                  className="rounded-xl h-8 px-3 text-xs gap-1"
                >
                  <Edit2 className="size-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteConfirmId(p.id)}
                  className="rounded-xl h-8 px-2.5 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {editingProperty ? "Edit Property Listing" : "List New Property"}
            </DialogTitle>
            <DialogDescription>
              Provide property specifications, location, amenities, and pricing details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="title">Property Title / Heading *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Spacious 3 BHK Luxury Apartment with Balcony"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="property_type">Property Type</Label>
                <Select
                  value={formData.property_type}
                  onValueChange={(val) => setFormData({ ...formData, property_type: val })}
                >
                  <SelectTrigger id="property_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROPERTY_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="listing_type">Listing Type</Label>
                <Select
                  value={formData.listing_type}
                  onValueChange={(val) => setFormData({ ...formData, listing_type: val })}
                >
                  <SelectTrigger id="listing_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LISTING_TYPES.map((l) => (
                      <SelectItem key={l} value={l}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price">Price / Monthly Rent (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="e.g. 6500000 or 25000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price_suffix">Price Suffix (e.g. / month)</Label>
                <Input
                  id="price_suffix"
                  placeholder="e.g. / month, negotiable"
                  value={formData.price_suffix}
                  onChange={(e) => setFormData({ ...formData, price_suffix: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bedrooms">Bedrooms (BHK)</Label>
                <Input
                  id="bedrooms"
                  type="number"
                  min={0}
                  max={20}
                  value={formData.bedrooms}
                  onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input
                  id="bathrooms"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.bathrooms}
                  onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="area_sqft">Super Built-up Area (sq ft)</Label>
                <Input
                  id="area_sqft"
                  type="number"
                  placeholder="e.g. 1450"
                  value={formData.area_sqft}
                  onChange={(e) => setFormData({ ...formData, area_sqft: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="furnishing">Furnishing Status</Label>
                <Select
                  value={formData.furnishing}
                  onValueChange={(val) => setFormData({ ...formData, furnishing: val })}
                >
                  <SelectTrigger id="furnishing">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FURNISHING_TYPES.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="locality">Locality / Sector</Label>
                <Input
                  id="locality"
                  placeholder="e.g. Pandeypur, Sigra, Gomti Nagar"
                  value={formData.locality}
                  onChange={(e) => setFormData({ ...formData, locality: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="e.g. Varanasi, Lucknow"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="image_url">Photo URL</Label>
                <Input
                  id="image_url"
                  placeholder="https://..."
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>

              {/* Amenities */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Amenities & Highlights</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add amenity (e.g. Swimming Pool, Gym, Club House)..."
                    value={amenityInput}
                    onChange={(e) => setAmenityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddAmenity();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddAmenity} variant="secondary">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {formData.amenities.map((amenity) => (
                    <Badge key={amenity} variant="outline" className="gap-1 pl-2.5 pr-1.5 py-1 text-xs">
                      <span>{amenity}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAmenity(amenity)}
                        className="size-4 hover:bg-muted rounded-full inline-flex items-center justify-center"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="description">Detailed Description</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Highlight key selling points, connectivity, nearby facilities..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-3 sm:col-span-2 pt-1">
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(val) => setFormData({ ...formData, is_featured: val })}
                />
                <Label htmlFor="is_featured" className="cursor-pointer font-bold">
                  Mark as Featured Property (Highlights on public storefront)
                </Label>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingProperty ? "Save Changes" : "List Property"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Property Listing</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this property from marketing? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
