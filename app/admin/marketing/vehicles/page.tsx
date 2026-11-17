"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  Car,
  Plus,
  Search,
  IndianRupee,
  RefreshCw,
  Tag,
  Check,
  X,
  Edit2,
  Trash2,
  Fuel,
  Gauge,
  Users,
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Filter,
  ShieldCheck,
  Layers,
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

export type VehicleRecord = {
  id: number;
  title: string;
  slug?: string;
  brand?: string;
  model?: string;
  vehicle_type?: string;
  fuel_type?: string;
  transmission?: string;
  seating_capacity?: number;
  year?: number;
  registration_number?: string;
  price?: number | string | null;
  rental_price_per_day?: number | string | null;
  rental_price_per_hour?: number | string | null;
  mileage?: string;
  color?: string;
  features?: string[];
  image_url?: string;
  description?: string;
  status: string;
  is_featured: boolean;
  created_at?: string;
};

const VEHICLE_TYPES = ["SUV", "Sedan", "Hatchback", "Luxury", "Motorcycle", "Scooter", "Bus / Van", "Electric Vehicle", "Commercial"];
const FUEL_TYPES = ["Petrol", "Diesel", "Electric", "Hybrid", "CNG"];
const TRANSMISSIONS = ["Automatic", "Manual"];

export default function MarketingVehiclesPage() {
  const { user } = useAuthStore();
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, available: 0, booked: 0, maintenance: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    brand: "",
    model: "",
    vehicle_type: "SUV",
    fuel_type: "Petrol",
    transmission: "Automatic",
    seating_capacity: 5,
    year: new Date().getFullYear(),
    registration_number: "",
    price: "",
    rental_price_per_day: "",
    mileage: "",
    color: "",
    features: [] as string[],
    image_url: "",
    description: "",
    status: "available",
    is_featured: false,
  });

  const [featureInput, setFeatureInput] = useState("");

  const fetchVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("vehicle_type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/marketing/vehicles?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load vehicles");
      const data = await res.json();
      setVehicles(data.vehicles || []);
      setStats(data.stats || { total: 0, available: 0, booked: 0, maintenance: 0 });
    } catch (err: any) {
      toast.error(err?.message || "Failed to load vehicles");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setFormData({
      title: "",
      brand: "",
      model: "",
      vehicle_type: "SUV",
      fuel_type: "Petrol",
      transmission: "Automatic",
      seating_capacity: 5,
      year: new Date().getFullYear(),
      registration_number: "",
      price: "",
      rental_price_per_day: "",
      mileage: "",
      color: "",
      features: ["Air Conditioner", "Power Steering", "Airbags", "Bluetooth"],
      image_url: "",
      description: "",
      status: "available",
      is_featured: false,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (v: VehicleRecord) => {
    setEditingVehicle(v);
    setFormData({
      title: v.title || "",
      brand: v.brand || "",
      model: v.model || "",
      vehicle_type: v.vehicle_type || "SUV",
      fuel_type: v.fuel_type || "Petrol",
      transmission: v.transmission || "Automatic",
      seating_capacity: v.seating_capacity || 5,
      year: v.year || new Date().getFullYear(),
      registration_number: v.registration_number || "",
      price: v.price ? String(v.price) : "",
      rental_price_per_day: v.rental_price_per_day ? String(v.rental_price_per_day) : "",
      mileage: v.mileage || "",
      color: v.color || "",
      features: Array.isArray(v.features) ? v.features : [],
      image_url: v.image_url || "",
      description: v.description || "",
      status: v.status || "available",
      is_featured: Boolean(v.is_featured),
    });
    setDialogOpen(true);
  };

  const handleAddFeature = () => {
    if (!featureInput.trim()) return;
    if (!formData.features.includes(featureInput.trim())) {
      setFormData((prev) => ({ ...prev, features: [...prev.features, featureInput.trim()] }));
    }
    setFeatureInput("");
  };

  const handleRemoveFeature = (feat: string) => {
    setFormData((prev) => ({ ...prev, features: prev.features.filter((f) => f !== feat) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Please enter a vehicle title / model name");
      return;
    }

    try {
      setSubmitting(true);
      const url = editingVehicle ? `/api/admin/marketing/vehicles/${editingVehicle.id}` : `/api/admin/marketing/vehicles`;
      const method = editingVehicle ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save vehicle");
      }

      toast.success(editingVehicle ? "Vehicle updated successfully!" : "Vehicle added to marketing catalog!");
      setDialogOpen(false);
      fetchVehicles();
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/marketing/vehicles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete vehicle");
      toast.success("Vehicle deleted successfully");
      setDeleteConfirmId(null);
      fetchVehicles();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <Car className="size-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Vehicle Catalog & Fleet
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your automobile listings, rentals, vehicles for sale, and fleet inventory.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchVehicles}
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
            <span>Add Vehicle</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Vehicles</p>
              <p className="text-2xl font-black text-foreground mt-1">{stats.total}</p>
            </div>
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Car className="size-5" />
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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booked / Rented</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{stats.booked}</p>
            </div>
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Gauge className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Maintenance</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{stats.maintenance}</p>
            </div>
            <div className="size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <AlertCircle className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card p-3 rounded-2xl border shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, brand, model, registration..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-background"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[140px] h-10 rounded-xl bg-background">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {VEHICLE_TYPES.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-10 rounded-xl bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="rented">Rented</SelectItem>
              <SelectItem value="booked">Booked</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Vehicle Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-3xl bg-card space-y-3">
          <div className="size-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <Car className="size-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No Vehicles Added Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Showcase your automobile inventory, rental cars, and transport fleet to your customers.
          </p>
          <Button onClick={handleOpenAdd} className="mt-2 rounded-xl">
            <Plus className="size-4 mr-1.5" />
            Add First Vehicle
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <Card key={v.id} className="rounded-2xl border shadow-xs overflow-hidden group hover:border-primary/50 transition-all flex flex-col justify-between">
              <div>
                {/* Photo Header */}
                <div className="relative w-full h-48 bg-muted overflow-hidden">
                  {v.image_url ? (
                    <Image
                      src={v.image_url}
                      alt={v.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/60 text-muted-foreground">
                      <Car className="size-12 opacity-40" />
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <Badge variant="secondary" className="bg-background/90 backdrop-blur-md text-foreground font-bold shadow-xs">
                      {v.vehicle_type || "Vehicle"}
                    </Badge>
                    {v.is_featured && (
                      <Badge className="bg-amber-500 text-white gap-1 text-[10px] font-bold">
                        <Sparkles className="size-3" /> Featured
                      </Badge>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <Badge
                      className={
                        v.status === "available"
                          ? "bg-emerald-600 text-white"
                          : v.status === "maintenance"
                          ? "bg-rose-600 text-white"
                          : "bg-amber-600 text-white"
                      }
                    >
                      {v.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {/* Details */}
                <CardContent className="p-5 space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground">
                      {[v.brand, v.model, v.year].filter(Boolean).join(" • ")}
                    </div>
                    <h3 className="text-lg font-black text-foreground mt-0.5 group-hover:text-primary transition-colors">
                      {v.title}
                    </h3>
                  </div>

                  {/* Badges / Specs */}
                  <div className="grid grid-cols-3 gap-2 py-2 border-y text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Fuel className="size-3.5 text-primary" />
                      <span>{v.fuel_type || "Petrol"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Gauge className="size-3.5 text-primary" />
                      <span>{v.transmission || "Auto"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="size-3.5 text-primary" />
                      <span>{v.seating_capacity || 5} Seats</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-between pt-1">
                    <div>
                      {v.rental_price_per_day ? (
                        <div className="text-base font-black text-foreground">
                          ₹{Number(v.rental_price_per_day).toLocaleString("en-IN")}
                          <span className="text-xs font-normal text-muted-foreground"> / day</span>
                        </div>
                      ) : v.price ? (
                        <div className="text-base font-black text-foreground">
                          ₹{Number(v.price).toLocaleString("en-IN")}
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-muted-foreground">Price upon request</span>
                      )}
                    </div>

                    {v.registration_number && (
                      <span className="text-[11px] font-mono bg-muted px-2 py-0.5 rounded border">
                        {v.registration_number}
                      </span>
                    )}
                  </div>
                </CardContent>
              </div>

              {/* Action Buttons */}
              <div className="px-5 pb-5 pt-1 flex items-center justify-end gap-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEdit(v)}
                  className="rounded-xl h-8 px-3 text-xs gap-1"
                >
                  <Edit2 className="size-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteConfirmId(v.id)}
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
              {editingVehicle ? "Edit Vehicle Details" : "Add Vehicle to Marketing"}
            </DialogTitle>
            <DialogDescription>
              Provide vehicle specifications, pricing, features, and marketing media.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="title">Vehicle Title / Listing Name *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Toyota Fortuner 2.8 4x4 Automatic"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="brand">Brand / Make</Label>
                <Input
                  id="brand"
                  placeholder="e.g. Toyota, Honda, Hyundai"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  placeholder="e.g. Fortuner, City, Creta"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="vehicle_type">Vehicle Type</Label>
                <Select
                  value={formData.vehicle_type}
                  onValueChange={(val) => setFormData({ ...formData, vehicle_type: val })}
                >
                  <SelectTrigger id="vehicle_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="fuel_type">Fuel Type</Label>
                <Select
                  value={formData.fuel_type}
                  onValueChange={(val) => setFormData({ ...formData, fuel_type: val })}
                >
                  <SelectTrigger id="fuel_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="transmission">Transmission</Label>
                <Select
                  value={formData.transmission}
                  onValueChange={(val) => setFormData({ ...formData, transmission: val })}
                >
                  <SelectTrigger id="transmission">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSMISSIONS.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="seating_capacity">Seating Capacity</Label>
                <Input
                  id="seating_capacity"
                  type="number"
                  min={1}
                  max={60}
                  value={formData.seating_capacity}
                  onChange={(e) => setFormData({ ...formData, seating_capacity: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rental_price_per_day">Rental Price (₹ / day)</Label>
                <Input
                  id="rental_price_per_day"
                  type="number"
                  placeholder="e.g. 3500"
                  value={formData.rental_price_per_day}
                  onChange={(e) => setFormData({ ...formData, rental_price_per_day: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price">Purchase / Sale Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="e.g. 2400000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="registration_number">Registration / Plate No.</Label>
                <Input
                  id="registration_number"
                  placeholder="e.g. UP 65 AB 1234"
                  value={formData.registration_number}
                  onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="rented">Rented</SelectItem>
                    <SelectItem value="booked">Booked</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
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

              {/* Features List */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Features & Amenities</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add feature (e.g. GPS, Sunroof, Fastag)..."
                    value={featureInput}
                    onChange={(e) => setFeatureInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddFeature();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddFeature} variant="secondary">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {formData.features.map((feat) => (
                    <Badge key={feat} variant="outline" className="gap-1 pl-2.5 pr-1.5 py-1 text-xs">
                      <span>{feat}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFeature(feat)}
                        className="size-4 hover:bg-muted rounded-full inline-flex items-center justify-center"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="description">Overview & Notes</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Detailed description, terms, fuel policies..."
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
                  Mark as Featured Vehicle (Highlights on public storefront)
                </Label>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingVehicle ? "Save Changes" : "Create Vehicle"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Vehicle</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this vehicle from your marketing catalog? This action cannot be undone.
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
