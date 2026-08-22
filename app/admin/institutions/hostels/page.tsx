"use client";

import { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  Loader2,
  Wifi,
  Zap,
  Utensils,
  Shield,
  Layers,
  Image as ImageIcon,
  DollarSign,
  Filter,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { MarketplaceSellOption } from "@/components/admin/marketplace-sell-option";

type InstitutionOption = {
  id: number;
  name: string;
  slug: string;
  type_name?: string;
};

type Hostel = {
  id?: number;
  institution_id: number;
  institution_name?: string;
  name: string;
  type: string;
  capacity: number;
  available_beds: number;
  annual_fee: number;
  monthly_rent: number;
  security_deposit: number;
  room_types: string;
  mess_facility: string;
  ac_available: boolean;
  wifi_available: boolean;
  canteen_available: boolean;
  canteen_details: string;
  facilities: string;
  gallery_urls: string;
  description: string;
  rules: string;
  sell_on_marketplace?: boolean;
  marketplace_price?: number;
};

const DEFAULT_HOSTEL: Hostel = {
  institution_id: 1,
  name: "",
  type: "Co-ed",
  capacity: 150,
  available_beds: 30,
  annual_fee: 65000,
  monthly_rent: 6500,
  security_deposit: 5000,
  room_types: "Single, Double & Triple Sharing",
  mess_facility: "Four Meals Daily (Veg & Non-Veg)",
  ac_available: true,
  wifi_available: true,
  canteen_available: true,
  canteen_details: "24x7 Student Cafeteria, Fresh Snacks & Beverage Counters",
  facilities: "1Gbps Wi-Fi, 24x7 Security, Power Backup, Gym, Biometric Access, Laundry, Study Room",
  gallery_urls: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=900&q=80",
  description: "Modern campus hostel featuring ergonomic furniture, high-speed connectivity, and hygienic dining.",
  rules: "Curfew time 10:00 PM. Visitors allowed in reception hall until 7:00 PM.",
  sell_on_marketplace: false,
  marketplace_price: 0,
};

export default function AdminHostelsPage() {
  const { user, accessToken } = useAuthStore();
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedInstitutionFilter, setSelectedInstitutionFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHostel, setEditingHostel] = useState<Hostel>(DEFAULT_HOSTEL);
  const [saving, setSaving] = useState(false);

  const isPlatformAdmin = Boolean(
    user?.role_codes?.includes("super_admin") ||
    user?.role_codes?.includes("platform_admin")
  );

  const userInstitutionId = user?.memberships?.[0]?.institution_id
    ? Number(user.memberships[0].institution_id)
    : null;

  useEffect(() => {
    fetchInstitutions();
  }, []);

  useEffect(() => {
    if (!isPlatformAdmin && userInstitutionId && selectedInstitutionFilter === "all") {
      setSelectedInstitutionFilter(String(userInstitutionId));
    }
  }, [isPlatformAdmin, userInstitutionId]);

  useEffect(() => {
    fetchHostels();
  }, [selectedInstitutionFilter]);

  const fetchInstitutions = async () => {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch("/api/admin/institutions/options", { headers });
      if (res.ok) {
        const json = await res.json();
        setInstitutions(json.institutions || []);
      }
    } catch (err) {
      console.error("Error fetching institution options:", err);
    }
  };

  const fetchHostels = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedInstitutionFilter !== "all") {
        params.set("institutionId", selectedInstitutionFilter);
      } else if (!isPlatformAdmin && userInstitutionId) {
        params.set("institutionId", String(userInstitutionId));
      }
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch(`/api/admin/institution/hostels?${params.toString()}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setHostels(json.data || []);
      }
    } catch (err) {
      toast.error("Failed to load hostels");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    const defaultInstId = userInstitutionId || (selectedInstitutionFilter !== "all" ? Number(selectedInstitutionFilter) : institutions[0]?.id || 1);
    setEditingHostel({
      ...DEFAULT_HOSTEL,
      institution_id: defaultInstId,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (hostel: Hostel) => {
    setEditingHostel({ ...hostel });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHostel.name.trim()) {
      toast.error("Hostel Name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/institution/hostels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingHostel),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save hostel");

      toast.success(editingHostel.id ? "Hostel updated successfully!" : "Hostel added successfully!");
      setDialogOpen(false);
      fetchHostels();
    } catch (err: any) {
      toast.error(err.message || "Error saving hostel");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this hostel facility?")) return;
    try {
      const res = await fetch(`/api/admin/institution/hostels?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Hostel deleted successfully!");
      fetchHostels();
    } catch (err) {
      toast.error("Failed to delete hostel");
    }
  };

  const filteredHostels = hostels.filter(
    (h) =>
      h.name.toLowerCase().includes(search.toLowerCase()) ||
      (h.institution_name && h.institution_name.toLowerCase().includes(search.toLowerCase())) ||
      (h.room_types && h.room_types.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
            <Building2 className="h-3.5 w-3.5" />
            <span>Campus Accommodation Management</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Hostel Facilities & Rooms</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage multiple hostels, associate with institutions, set fees, canteen features, and amenities.
          </p>
        </div>

        <Button onClick={handleOpenAdd} className="font-bold gap-2 shadow-sm bg-primary text-primary-foreground">
          <Plus className="h-4 w-4" />
          <span>Add New Hostel</span>
        </Button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search hostel name or room type..."
            className="pl-9 text-xs h-10 bg-background"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 shrink-0">
            <Filter className="h-3.5 w-3.5 text-primary" /> Filter Institution:
          </span>
          <Select value={selectedInstitutionFilter} onValueChange={setSelectedInstitutionFilter}>
            <SelectTrigger className="w-full sm:w-[220px] h-10 text-xs bg-background">
              <SelectValue placeholder="All Institutions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Institutions ({institutions.length})</SelectItem>
              {institutions.map((inst) => (
                <SelectItem key={inst.id} value={String(inst.id)}>
                  {inst.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Hostels Grid View */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading campus hostels...</span>
        </div>
      ) : filteredHostels.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground space-y-3">
          <Building2 className="h-10 w-10 mx-auto opacity-30 text-primary" />
          <p className="font-semibold text-lg text-foreground">No Hostels Registered</p>
          <p className="text-xs">Click "Add New Hostel" to add accommodation facilities for an institution.</p>
          <Button onClick={handleOpenAdd} size="sm" variant="outline" className="mt-2 text-xs">
            Add First Hostel
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredHostels.map((h) => (
            <Card key={h.id} className="p-6 shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between space-y-5 bg-card border-border">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <span className="text-[11px] font-bold text-primary flex items-center gap-1 mb-1">
                      <Building2 className="h-3.5 w-3.5" />
                      {h.institution_name || "Associated Institution"}
                    </span>
                    <h3 className="text-xl font-bold text-foreground leading-tight">{h.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">{h.room_types}</p>
                  </div>

                  <Badge className={h.type === "Boys" ? "bg-blue-600" : h.type === "Girls" ? "bg-purple-600" : "bg-emerald-600"}>
                    {h.type} Hostel
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{h.description}</p>

                {/* Capacity & Fee details strip */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-muted/60 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Annual Fee</span>
                    <span className="font-extrabold text-foreground">₹{Number(h.annual_fee || 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Capacity</span>
                    <span className="font-extrabold text-foreground">{h.capacity} Beds</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Vacant</span>
                    <span className="font-extrabold text-emerald-600">{h.available_beds} Beds</span>
                  </div>
                </div>

                {/* Badges for Amenities & Food */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {h.ac_available && (
                    <Badge variant="outline" className="text-[10px] gap-1 bg-amber-500/10 text-amber-600 border-amber-500/20 font-semibold">
                      <Zap className="h-3 w-3" /> AC
                    </Badge>
                  )}
                  {h.wifi_available && (
                    <Badge variant="outline" className="text-[10px] gap-1 bg-blue-500/10 text-blue-600 border-blue-500/20 font-semibold">
                      <Wifi className="h-3 w-3" /> Wi-Fi
                    </Badge>
                  )}
                  {h.canteen_available && (
                    <Badge variant="outline" className="text-[10px] gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-semibold">
                      <Utensils className="h-3 w-3" /> Canteen & Mess
                    </Badge>
                  )}
                </div>

                {/* Canteen details */}
                {h.canteen_details && (
                  <p className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/50">
                    <strong className="text-foreground">Mess & Food: </strong>{h.mess_facility} — {h.canteen_details}
                  </p>
                )}
              </div>

              {/* Action Footer */}
              <div className="pt-4 border-t border-border flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground font-semibold">
                  Deposit: ₹{Number(h.security_deposit || 0).toLocaleString("en-IN")}
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(h)}
                    className="h-8 text-xs font-semibold gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => h.id && handleDelete(h.id)}
                    className="h-8 px-2.5"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Hostel Dialog Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl! max-h-[90vh] overflow-y-auto p-6 bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {editingHostel.id ? "Edit Hostel Facility" : "Add New Hostel Facility"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Fill in hostel details, associated institution, fee structures, room types, and canteen features.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-6 pt-2">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 bg-muted/60 rounded-xl border border-border/60 gap-1">
                <TabsTrigger value="basic" className="py-2 text-xs font-bold">1. Institution & Basic</TabsTrigger>
                <TabsTrigger value="charges" className="py-2 text-xs font-bold">2. Charges & Rooms</TabsTrigger>
                <TabsTrigger value="food" className="py-2 text-xs font-bold">3. Food & Amenities</TabsTrigger>
                <TabsTrigger value="gallery" className="py-2 text-xs font-bold">4. Gallery & Rules</TabsTrigger>
              </TabsList>

              {/* Tab 1: Institution & Basic Info */}
              <TabsContent value="basic" className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Associated Institution <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={String(editingHostel.institution_id)}
                    onValueChange={(val) => setEditingHostel((prev) => ({ ...prev, institution_id: Number(val) }))}
                  >
                    <SelectTrigger className="bg-background text-xs h-10">
                      <SelectValue placeholder="Select Institution" />
                    </SelectTrigger>
                    <SelectContent>
                      {institutions.map((inst) => (
                        <SelectItem key={inst.id} value={String(inst.id)}>
                          {inst.name} {inst.type_name ? `(${inst.type_name})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Select which institution manages or owns this hostel.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">
                      Hostel Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. Apex Central Executive Hostel"
                      value={editingHostel.name}
                      onChange={(e) => setEditingHostel((prev) => ({ ...prev, name: e.target.value }))}
                      className="bg-background text-xs h-10"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Hostel Type</Label>
                    <Select
                      value={editingHostel.type}
                      onValueChange={(val) => setEditingHostel((prev) => ({ ...prev, type: val }))}
                    >
                      <SelectTrigger className="bg-background text-xs h-10">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Boys">Boys Hostel</SelectItem>
                        <SelectItem value="Girls">Girls Hostel</SelectItem>
                        <SelectItem value="Co-ed">Co-ed Hostel</SelectItem>
                        <SelectItem value="Executive">Executive / PG</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Total Bed Capacity</Label>
                    <Input
                      type="number"
                      value={editingHostel.capacity}
                      onChange={(e) => setEditingHostel((prev) => ({ ...prev, capacity: Number(e.target.value) }))}
                      className="bg-background text-xs h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Available Vacant Beds</Label>
                    <Input
                      type="number"
                      value={editingHostel.available_beds}
                      onChange={(e) => setEditingHostel((prev) => ({ ...prev, available_beds: Number(e.target.value) }))}
                      className="bg-background text-xs h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Brief Description</Label>
                  <Textarea
                    placeholder="Describe location, environment, campus distance..."
                    value={editingHostel.description}
                    onChange={(e) => setEditingHostel((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="bg-background text-xs resize-none"
                  />
                </div>
              </TabsContent>

              {/* Tab 2: Charges & Room Types */}
              <TabsContent value="charges" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Annual Fee (₹)</Label>
                    <Input
                      type="number"
                      value={editingHostel.annual_fee}
                      onChange={(e) => setEditingHostel((prev) => ({ ...prev, annual_fee: Number(e.target.value) }))}
                      className="bg-background text-xs h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Monthly Rent (₹)</Label>
                    <Input
                      type="number"
                      value={editingHostel.monthly_rent}
                      onChange={(e) => setEditingHostel((prev) => ({ ...prev, monthly_rent: Number(e.target.value) }))}
                      className="bg-background text-xs h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Security Deposit (₹)</Label>
                    <Input
                      type="number"
                      value={editingHostel.security_deposit}
                      onChange={(e) => setEditingHostel((prev) => ({ ...prev, security_deposit: Number(e.target.value) }))}
                      className="bg-background text-xs h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Available Room Types</Label>
                  <Input
                    placeholder="e.g. Single AC, Double Non-AC, 3-Sharing Deluxe"
                    value={editingHostel.room_types}
                    onChange={(e) => setEditingHostel((prev) => ({ ...prev, room_types: e.target.value }))}
                    className="bg-background text-xs h-10"
                  />
                </div>

                {/* Marketplace Option */}
                <MarketplaceSellOption
                  sellOnMarketplace={Boolean(editingHostel.sell_on_marketplace)}
                  onSellOnMarketplaceChange={(val) =>
                    setEditingHostel((prev) => ({
                      ...prev,
                      sell_on_marketplace: val,
                      marketplace_price: val ? prev.marketplace_price || prev.monthly_rent || 0 : 0,
                    }))
                  }
                  marketplacePrice={editingHostel.marketplace_price ?? 0}
                  onMarketplacePriceChange={(val) =>
                    setEditingHostel((prev) => ({ ...prev, marketplace_price: Number(val) }))
                  }
                  title="Sell on Marketplace"
                  description="List hostel accommodation on the EduBird national marketplace for students to discover and book."
                  priceLabel="Marketplace Listing Price / Monthly Rent (₹)"
                  pricePlaceholder="e.g. 0 for free listing or enter monthly rent amount"
                />
              </TabsContent>

              {/* Tab 3: Food & Amenities */}
              <TabsContent value="food" className="space-y-4 pt-4">
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-xs text-foreground flex items-center gap-1.5">
                        <Utensils className="h-4 w-4 text-primary" />
                        Food & Canteen Facility Available
                      </p>
                      <p className="text-[11px] text-muted-foreground">Does this hostel provide campus mess or canteen food services?</p>
                    </div>
                    <Switch
                      checked={editingHostel.canteen_available}
                      onCheckedChange={(checked) => setEditingHostel((prev) => ({ ...prev, canteen_available: checked }))}
                    />
                  </div>

                  {editingHostel.canteen_available && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Mess Meal Plan</Label>
                        <Input
                          placeholder="e.g. Four Meals Daily (Breakfast, Lunch, Snacks, Dinner)"
                          value={editingHostel.mess_facility}
                          onChange={(e) => setEditingHostel((prev) => ({ ...prev, mess_facility: e.target.value }))}
                          className="bg-background text-xs h-10"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-foreground">Canteen Details / Menu</Label>
                        <Input
                          placeholder="e.g. Veg & Non-Veg options, Night canteen open till 2:00 AM"
                          value={editingHostel.canteen_details}
                          onChange={(e) => setEditingHostel((prev) => ({ ...prev, canteen_details: e.target.value }))}
                          className="bg-background text-xs h-10"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-amber-500" /> Air Conditioned Rooms
                    </span>
                    <Switch
                      checked={editingHostel.ac_available}
                      onCheckedChange={(checked) => setEditingHostel((prev) => ({ ...prev, ac_available: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Wifi className="h-4 w-4 text-blue-500" /> High-Speed Wi-Fi
                    </span>
                    <Switch
                      checked={editingHostel.wifi_available}
                      onCheckedChange={(checked) => setEditingHostel((prev) => ({ ...prev, wifi_available: checked }))}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Facilities & Amenities List</Label>
                  <Textarea
                    placeholder="Comma-separated amenities (e.g. 1Gbps Wi-Fi, 24x7 Security, Gym, Power Backup, Laundry, Biometric Access, Study Room)"
                    value={editingHostel.facilities}
                    onChange={(e) => setEditingHostel((prev) => ({ ...prev, facilities: e.target.value }))}
                    rows={2}
                    className="bg-background text-xs resize-none"
                  />
                </div>
              </TabsContent>

              {/* Tab 4: Gallery & Rules */}
              <TabsContent value="gallery" className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    Hostel Gallery Image URLs
                  </Label>
                  <Textarea
                    placeholder="Enter image URLs (separated by line or comma)..."
                    value={editingHostel.gallery_urls}
                    onChange={(e) => setEditingHostel((prev) => ({ ...prev, gallery_urls: e.target.value }))}
                    rows={3}
                    className="bg-background text-xs resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Hostel Rules & Regulations</Label>
                  <Textarea
                    placeholder="Describe curfew time, visitor policy, discipline guidelines..."
                    value={editingHostel.rules}
                    onChange={(e) => setEditingHostel((prev) => ({ ...prev, rules: e.target.value }))}
                    rows={3}
                    className="bg-background text-xs resize-none"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="text-xs font-bold bg-primary text-primary-foreground gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                <span>{editingHostel.id ? "Save Hostel Changes" : "Create Hostel Facility"}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
