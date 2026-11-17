"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  BedDouble,
  Plus,
  Search,
  IndianRupee,
  RefreshCw,
  Tag,
  Check,
  X,
  Edit2,
  Trash2,
  Users,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Filter,
  Maximize2,
  Hotel,
  Tv,
  Wifi,
  Coffee,
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

export type RoomRecord = {
  id: number;
  title: string;
  slug?: string;
  room_type: string;
  price_per_night: number | string;
  weekend_price?: number | string | null;
  max_adults: number;
  max_children: number;
  bed_type?: string;
  room_size_sqft?: number;
  view_type?: string;
  amenities?: string[];
  check_in_time?: string;
  check_out_time?: string;
  image_url?: string;
  description?: string;
  status: string;
  is_featured: boolean;
  created_at?: string;
};

const ROOM_TYPES = [
  "Standard Room",
  "Deluxe Room",
  "Super Deluxe Room",
  "Executive Suite",
  "Presidential Suite",
  "Family Cottage",
  "Dormitory / Bed",
];

const BED_TYPES = [
  "1 King Bed",
  "1 Queen Bed",
  "2 Twin Beds",
  "2 Queen Beds",
  "1 King Bed + 1 Sofa Bed",
  "Single Bunk Bed",
];

const VIEW_TYPES = ["City View", "Sea / Pool View", "Garden View", "Mountain View", "Courtyard View"];

export default function MarketingRoomsPage() {
  const { user } = useAuthStore();
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, available: 0, booked: 0, maintenance: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<RoomRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    room_type: "Deluxe Room",
    price_per_night: "",
    weekend_price: "",
    max_adults: 2,
    max_children: 1,
    bed_type: "1 King Bed",
    room_size_sqft: "",
    view_type: "City View",
    amenities: ["Free Wi-Fi", "Air Conditioning", "Smart TV", "Complimentary Breakfast", "Ensuite Bathroom", "Tea/Coffee Maker"] as string[],
    check_in_time: "02:00 PM",
    check_out_time: "11:00 AM",
    image_url: "",
    description: "",
    status: "available",
    is_featured: false,
  });

  const [amenityInput, setAmenityInput] = useState("");

  const fetchRooms = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (typeFilter !== "all") params.set("room_type", typeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/marketing/rooms?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load rooms");
      const data = await res.json();
      setRooms(data.rooms || []);
      setStats(data.stats || { total: 0, available: 0, booked: 0, maintenance: 0 });
    } catch (err: any) {
      toast.error(err?.message || "Failed to load rooms");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleOpenAdd = () => {
    setEditingRoom(null);
    setFormData({
      title: "",
      room_type: "Deluxe Room",
      price_per_night: "",
      weekend_price: "",
      max_adults: 2,
      max_children: 1,
      bed_type: "1 King Bed",
      room_size_sqft: "",
      view_type: "City View",
      amenities: ["Free Wi-Fi", "Air Conditioning", "Smart TV", "Complimentary Breakfast", "Ensuite Bathroom", "Tea/Coffee Maker"],
      check_in_time: "02:00 PM",
      check_out_time: "11:00 AM",
      image_url: "",
      description: "",
      status: "available",
      is_featured: false,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (r: RoomRecord) => {
    setEditingRoom(r);
    setFormData({
      title: r.title || "",
      room_type: r.room_type || "Deluxe Room",
      price_per_night: r.price_per_night ? String(r.price_per_night) : "",
      weekend_price: r.weekend_price ? String(r.weekend_price) : "",
      max_adults: r.max_adults || 2,
      max_children: r.max_children || 0,
      bed_type: r.bed_type || "1 King Bed",
      room_size_sqft: r.room_size_sqft ? String(r.room_size_sqft) : "",
      view_type: r.view_type || "City View",
      amenities: Array.isArray(r.amenities) ? r.amenities : [],
      check_in_time: r.check_in_time || "02:00 PM",
      check_out_time: r.check_out_time || "11:00 AM",
      image_url: r.image_url || "",
      description: r.description || "",
      status: r.status || "available",
      is_featured: Boolean(r.is_featured),
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
      toast.error("Please enter a room title");
      return;
    }
    if (!formData.price_per_night) {
      toast.error("Please enter price per night");
      return;
    }

    try {
      setSubmitting(true);
      const url = editingRoom ? `/api/admin/marketing/rooms/${editingRoom.id}` : `/api/admin/marketing/rooms`;
      const method = editingRoom ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save room");
      }

      toast.success(editingRoom ? "Room updated successfully!" : "Room added to hotel & stay catalog!");
      setDialogOpen(false);
      fetchRooms();
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/marketing/rooms/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete room");
      toast.success("Room removed successfully");
      setDeleteConfirmId(null);
      fetchRooms();
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
              <BedDouble className="size-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Rooms, Suites & Accommodations
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your hotel room types, resort suites, guest stays, amenities, and nightly rates.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchRooms}
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
            <span>Add Room</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Rooms</p>
              <p className="text-2xl font-black text-foreground mt-1">{stats.total}</p>
            </div>
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Hotel className="size-5" />
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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Booked / Occupied</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{stats.booked}</p>
            </div>
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <BedDouble className="size-5" />
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
            placeholder="Search by room title, type, view, bed..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-background"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[170px] h-10 rounded-xl bg-background">
              <SelectValue placeholder="Room Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Room Types</SelectItem>
              {ROOM_TYPES.map((t) => (
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
              <SelectItem value="booked">Booked</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rooms Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-3xl bg-card space-y-3">
          <div className="size-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <BedDouble className="size-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No Rooms Listed Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Showcase your deluxe rooms, executive suites, and hotel stays with rates and amenities.
          </p>
          <Button onClick={handleOpenAdd} className="mt-2 rounded-xl">
            <Plus className="size-4 mr-1.5" />
            Add First Room
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.map((r) => (
            <Card key={r.id} className="rounded-2xl border shadow-xs overflow-hidden group hover:border-primary/50 transition-all flex flex-col justify-between">
              <div>
                <div className="relative w-full h-48 bg-muted overflow-hidden">
                  {r.image_url ? (
                    <Image
                      src={r.image_url}
                      alt={r.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/60 text-muted-foreground">
                      <BedDouble className="size-12 opacity-40" />
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <Badge variant="secondary" className="bg-background/90 backdrop-blur-md text-foreground font-bold shadow-xs">
                      {r.room_type}
                    </Badge>
                    {r.is_featured && (
                      <Badge className="bg-amber-500 text-white gap-1 text-[10px] font-bold">
                        <Sparkles className="size-3" /> Featured
                      </Badge>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <Badge
                      className={
                        r.status === "available"
                          ? "bg-emerald-600 text-white"
                          : r.status === "booked"
                          ? "bg-amber-600 text-white"
                          : "bg-rose-600 text-white"
                      }
                    >
                      {r.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-5 space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-primary">
                      {r.view_type || "Deluxe View"}
                    </div>
                    <h3 className="text-lg font-black text-foreground mt-0.5 group-hover:text-primary transition-colors line-clamp-1">
                      {r.title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-3 gap-2 py-2 border-y text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="size-3.5 text-primary" />
                      <span>{r.max_adults} Adults</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BedDouble className="size-3.5 text-primary" />
                      <span className="line-clamp-1">{r.bed_type || "King Bed"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Maximize2 className="size-3.5 text-primary" />
                      <span>{r.room_size_sqft ? `${r.room_size_sqft} sqft` : "Spacious"}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="pt-1">
                    <div className="text-lg font-black text-foreground">
                      ₹{Number(r.price_per_night).toLocaleString("en-IN")}
                      <span className="text-xs font-normal text-muted-foreground"> / night</span>
                    </div>
                    {r.weekend_price && (
                      <div className="text-xs text-muted-foreground">
                        Weekend: ₹{Number(r.weekend_price).toLocaleString("en-IN")} / night
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>

              <div className="px-5 pb-5 pt-1 flex items-center justify-end gap-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEdit(r)}
                  className="rounded-xl h-8 px-3 text-xs gap-1"
                >
                  <Edit2 className="size-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteConfirmId(r.id)}
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
              {editingRoom ? "Edit Room Details" : "Add Room to Stays Catalog"}
            </DialogTitle>
            <DialogDescription>
              Configure room type, nightly tariff, bed configuration, occupancy, and guest amenities.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="title">Room Name / Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Executive Sea-Facing King Suite"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="room_type">Room Type</Label>
                <Select
                  value={formData.room_type}
                  onValueChange={(val) => setFormData({ ...formData, room_type: val })}
                >
                  <SelectTrigger id="room_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROOM_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bed_type">Bed Configuration</Label>
                <Select
                  value={formData.bed_type}
                  onValueChange={(val) => setFormData({ ...formData, bed_type: val })}
                >
                  <SelectTrigger id="bed_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BED_TYPES.map((b) => (
                      <SelectItem key={b} value={b}>{b}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price_per_night">Tariff per Night (₹) *</Label>
                <Input
                  id="price_per_night"
                  type="number"
                  placeholder="e.g. 4500"
                  value={formData.price_per_night}
                  onChange={(e) => setFormData({ ...formData, price_per_night: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="weekend_price">Weekend / Peak Price (₹)</Label>
                <Input
                  id="weekend_price"
                  type="number"
                  placeholder="e.g. 5200"
                  value={formData.weekend_price}
                  onChange={(e) => setFormData({ ...formData, weekend_price: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="max_adults">Max Adults</Label>
                <Input
                  id="max_adults"
                  type="number"
                  min={1}
                  max={20}
                  value={formData.max_adults}
                  onChange={(e) => setFormData({ ...formData, max_adults: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="max_children">Max Children</Label>
                <Input
                  id="max_children"
                  type="number"
                  min={0}
                  max={10}
                  value={formData.max_children}
                  onChange={(e) => setFormData({ ...formData, max_children: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="room_size_sqft">Room Area (sq ft)</Label>
                <Input
                  id="room_size_sqft"
                  type="number"
                  placeholder="e.g. 380"
                  value={formData.room_size_sqft}
                  onChange={(e) => setFormData({ ...formData, room_size_sqft: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="view_type">View Type</Label>
                <Select
                  value={formData.view_type}
                  onValueChange={(val) => setFormData({ ...formData, view_type: val })}
                >
                  <SelectTrigger id="view_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VIEW_TYPES.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="image_url">Room Photo URL</Label>
                <Input
                  id="image_url"
                  placeholder="https://..."
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>

              {/* Amenities */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Room Amenities & Features</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add amenity (e.g. Bathtub, Mini Bar, Balcony)..."
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
                <Label htmlFor="description">Description & Guest Policies</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Cancellation policy, extra bed charges, breakfast inclusions..."
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
                  Mark as Featured Room (Highlighted for instant booking)
                </Label>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingRoom ? "Save Changes" : "Create Room"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Room</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this room from the catalog? This action cannot be undone.
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
