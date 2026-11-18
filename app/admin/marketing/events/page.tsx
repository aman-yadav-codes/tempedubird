"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  CalendarDays,
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
  MapPin,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Filter,
  Clock,
  PartyPopper,
  Music,
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

export type EventRecord = {
  id: number;
  title: string;
  slug?: string;
  event_category: string;
  event_type: string;
  price: number | string;
  price_model: string;
  guest_capacity_min?: number;
  guest_capacity_max?: number;
  start_date?: string;
  end_date?: string;
  duration?: string;
  venue_name?: string;
  venue_type?: string;
  location?: string;
  inclusions?: string[];
  image_url?: string;
  description?: string;
  status: string;
  is_featured: boolean;
  created_at?: string;
};

const EVENT_CATEGORIES = [
  "Wedding & Reception",
  "Corporate Conference",
  "Birthday & Private Party",
  "Concert & Entertainment",
  "Exhibition & Trade Fair",
  "Seminar & Workshop",
  "Social Gathering",
];

const VENUE_TYPES = ["Indoor AC Banquet", "Open Lawn", "Poolside Area", "Rooftop Lounge", "Conference Auditorium", "Ballroom"];
const PRICE_MODELS = [
  { value: "per_package", label: "Per Package (Fixed)" },
  { value: "per_plate", label: "Per Plate / Buffet" },
  { value: "per_person", label: "Per Person / Ticket" },
  { value: "per_hour", label: "Per Hour Rental" },
];

export default function MarketingEventsPage({ isMasterCatalog = false }: { isMasterCatalog?: boolean } = {}) {
  const { user } = useAuthStore();
  const [events, setEvents] = useState<EventRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, active: 0, upcoming: 0, weddings: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    event_category: "Wedding & Reception",
    event_type: "Venue Package",
    price: "",
    price_model: "per_package",
    guest_capacity_min: 50,
    guest_capacity_max: 500,
    duration: "Full Day (8 Hours)",
    venue_name: "Imperial Grand Ballroom",
    venue_type: "Indoor AC Banquet",
    location: "",
    inclusions: ["Stage & Backdrop Decor", "Sound & DJ Setup", "Buffet Catering Setup", "Valet Parking", "Bridal Room"] as string[],
    image_url: "",
    description: "",
    status: "active",
    is_featured: false,
  });

  const [inclusionInput, setInclusionInput] = useState("");

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter !== "all") params.set("event_category", categoryFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/admin/marketing/events?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load events");
      const data = await res.json();
      setEvents(data.events || []);
      setStats(data.stats || { total: 0, active: 0, upcoming: 0, weddings: 0 });
    } catch (err: any) {
      toast.error(err?.message || "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, statusFilter]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleOpenAdd = () => {
    setEditingEvent(null);
    setFormData({
      title: "",
      event_category: "Wedding & Reception",
      event_type: "Venue Package",
      price: "",
      price_model: "per_package",
      guest_capacity_min: 50,
      guest_capacity_max: 500,
      duration: "Full Day (8 Hours)",
      venue_name: "Imperial Grand Ballroom",
      venue_type: "Indoor AC Banquet",
      location: "",
      inclusions: ["Stage & Backdrop Decor", "Sound & DJ Setup", "Buffet Catering Setup", "Valet Parking", "Bridal Room"],
      image_url: "",
      description: "",
      status: "active",
      is_featured: false,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (e: EventRecord) => {
    setEditingEvent(e);
    setFormData({
      title: e.title || "",
      event_category: e.event_category || "Wedding & Reception",
      event_type: e.event_type || "Venue Package",
      price: e.price ? String(e.price) : "",
      price_model: e.price_model || "per_package",
      guest_capacity_min: e.guest_capacity_min || 50,
      guest_capacity_max: e.guest_capacity_max || 500,
      duration: e.duration || "Full Day (8 Hours)",
      venue_name: e.venue_name || "",
      venue_type: e.venue_type || "Indoor AC Banquet",
      location: e.location || "",
      inclusions: Array.isArray(e.inclusions) ? e.inclusions : [],
      image_url: e.image_url || "",
      description: e.description || "",
      status: e.status || "active",
      is_featured: Boolean(e.is_featured),
    });
    setDialogOpen(true);
  };

  const handleAddInclusion = () => {
    if (!inclusionInput.trim()) return;
    if (!formData.inclusions.includes(inclusionInput.trim())) {
      setFormData((prev) => ({ ...prev, inclusions: [...prev.inclusions, inclusionInput.trim()] }));
    }
    setInclusionInput("");
  };

  const handleRemoveInclusion = (inc: string) => {
    setFormData((prev) => ({ ...prev, inclusions: prev.inclusions.filter((i) => i !== inc) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Please enter an event or package title");
      return;
    }

    try {
      setSubmitting(true);
      const url = editingEvent ? `/api/admin/marketing/events/${editingEvent.id}` : `/api/admin/marketing/events`;
      const method = editingEvent ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save event");
      }

      toast.success(editingEvent ? "Event updated successfully!" : "Event package created in marketing catalog!");
      setDialogOpen(false);
      fetchEvents();
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/marketing/events/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete event");
      toast.success("Event package removed successfully");
      setDeleteConfirmId(null);
      fetchEvents();
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
              <CalendarDays className="size-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {isMasterCatalog ? "Master Events Catalog" : "Events & Banquet Packages"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isMasterCatalog
              ? "Platform-wide master event, banquet, and celebration catalog templates."
              : "Showcase your event packages, wedding lawns, corporate conference bookings, and celebrations."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchEvents}
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
            <span>{isMasterCatalog ? "Add Master Event" : "Add Event Package"}</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Packages</p>
              <p className="text-2xl font-black text-foreground mt-1">{stats.total}</p>
            </div>
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <CalendarDays className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{stats.active}</p>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Weddings & Galas</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{stats.weddings}</p>
            </div>
            <div className="size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <PartyPopper className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Upcoming</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{stats.upcoming}</p>
            </div>
            <div className="size-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card p-3 rounded-2xl border shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title, venue name, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-background"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] h-10 rounded-xl bg-background">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {EVENT_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-10 rounded-xl bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="sold_out">Sold Out</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-3xl bg-card space-y-3">
          <div className="size-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <CalendarDays className="size-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No Event Packages Listed Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Create attractive packages for wedding banquets, corporate meetings, parties, and conferences.
          </p>
          <Button onClick={handleOpenAdd} className="mt-2 rounded-xl">
            <Plus className="size-4 mr-1.5" />
            Create First Package
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((e) => (
            <Card key={e.id} className="rounded-2xl border shadow-xs overflow-hidden group hover:border-primary/50 transition-all flex flex-col justify-between">
              <div>
                <div className="relative w-full h-48 bg-muted overflow-hidden">
                  {e.image_url ? (
                    <Image
                      src={e.image_url}
                      alt={e.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/60 text-muted-foreground">
                      <CalendarDays className="size-12 opacity-40" />
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <Badge variant="secondary" className="bg-background/90 backdrop-blur-md text-foreground font-bold shadow-xs">
                      {e.event_category}
                    </Badge>
                    {e.is_featured && (
                      <Badge className="bg-amber-500 text-white gap-1 text-[10px] font-bold">
                        <Sparkles className="size-3" /> Featured
                      </Badge>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <Badge
                      className={
                        e.status === "active"
                          ? "bg-emerald-600 text-white"
                          : e.status === "upcoming"
                          ? "bg-blue-600 text-white"
                          : "bg-rose-600 text-white"
                      }
                    >
                      {e.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-5 space-y-3">
                  <div>
                    <div className="text-xs font-semibold text-primary">
                      {e.venue_name || e.venue_type || "Event Venue"}
                    </div>
                    <h3 className="text-lg font-black text-foreground mt-0.5 group-hover:text-primary transition-colors line-clamp-1">
                      {e.title}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-2 border-y text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="size-3.5 text-primary" />
                      <span>{e.guest_capacity_min} - {e.guest_capacity_max} Guests</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="size-3.5 text-primary" />
                      <span className="line-clamp-1">{e.duration || "Full Day"}</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="pt-1">
                    <div className="text-lg font-black text-foreground">
                      ₹{Number(e.price).toLocaleString("en-IN")}
                      <span className="text-xs font-normal text-muted-foreground">
                        {" "}
                        {e.price_model === "per_plate"
                          ? "/ plate"
                          : e.price_model === "per_person"
                          ? "/ person"
                          : e.price_model === "per_hour"
                          ? "/ hour"
                          : "/ package"}
                      </span>
                    </div>
                    {e.venue_type && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {e.venue_type}
                      </div>
                    )}
                  </div>
                </CardContent>
              </div>

              <div className="px-5 pb-5 pt-1 flex items-center justify-end gap-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEdit(e)}
                  className="rounded-xl h-8 px-3 text-xs gap-1"
                >
                  <Edit2 className="size-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteConfirmId(e.id)}
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
              {editingEvent ? "Edit Event Package" : "Add Event Package"}
            </DialogTitle>
            <DialogDescription>
              Provide event package details, guest capacities, inclusions, and venue specifications.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="title">Event / Package Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Royal Wedding & Reception Experience Package"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="event_category">Category</Label>
                <Select
                  value={formData.event_category}
                  onValueChange={(val) => setFormData({ ...formData, event_category: val })}
                >
                  <SelectTrigger id="event_category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="venue_type">Venue Type</Label>
                <Select
                  value={formData.venue_type}
                  onValueChange={(val) => setFormData({ ...formData, venue_type: val })}
                >
                  <SelectTrigger id="venue_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VENUE_TYPES.map((v) => (
                      <SelectItem key={v} value={v}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price">Base Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="e.g. 75000"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price_model">Pricing Model</Label>
                <Select
                  value={formData.price_model}
                  onValueChange={(val) => setFormData({ ...formData, price_model: val })}
                >
                  <SelectTrigger id="price_model">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_MODELS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guest_capacity_min">Min Guests</Label>
                <Input
                  id="guest_capacity_min"
                  type="number"
                  min={1}
                  value={formData.guest_capacity_min}
                  onChange={(e) => setFormData({ ...formData, guest_capacity_min: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="guest_capacity_max">Max Guests</Label>
                <Input
                  id="guest_capacity_max"
                  type="number"
                  min={1}
                  value={formData.guest_capacity_max}
                  onChange={(e) => setFormData({ ...formData, guest_capacity_max: Number(e.target.value) })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="venue_name">Venue / Hall Name</Label>
                <Input
                  id="venue_name"
                  placeholder="e.g. Grand Crystal Ballroom"
                  value={formData.venue_name}
                  onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="duration">Standard Duration</Label>
                <Input
                  id="duration"
                  placeholder="e.g. 8 Hours, Evening 6 PM - 11 PM"
                  value={formData.duration}
                  onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="image_url">Photo / Banner URL</Label>
                <Input
                  id="image_url"
                  placeholder="https://..."
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>

              {/* Inclusions */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Package Inclusions</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add inclusion (e.g. DJ Sound, Buffet Setup, Decor)..."
                    value={inclusionInput}
                    onChange={(e) => setInclusionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddInclusion();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddInclusion} variant="secondary">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {formData.inclusions.map((inc) => (
                    <Badge key={inc} variant="outline" className="gap-1 pl-2.5 pr-1.5 py-1 text-xs">
                      <span>{inc}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveInclusion(inc)}
                        className="size-4 hover:bg-muted rounded-full inline-flex items-center justify-center"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="description">Package Description & Booking Terms</Label>
                <Textarea
                  id="description"
                  rows={3}
                  placeholder="Details on catering menu, advance payment, sound regulations..."
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
                  Mark as Featured Package (Prominent on public storefront)
                </Label>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingEvent ? "Save Changes" : "Create Package"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Event Package</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this event package? This action cannot be undone.
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
