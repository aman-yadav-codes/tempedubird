"use client";

import { useEffect, useState } from "react";
import {
  Library,
  Plus,
  Pencil,
  Trash2,
  Search,
  CheckCircle2,
  Loader2,
  BookOpen,
  Globe,
  Clock,
  Mail,
  Phone,
  DollarSign,
  Filter,
  Users,
  Award,
  Layers,
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
import { MarketplaceSellOption } from "@/components/admin/marketplace-sell-option";
import { useAuthStore } from "@/store";

type InstitutionOption = {
  id: number;
  name: string;
  slug: string;
  type_name?: string;
};

type LibraryItem = {
  id?: number;
  institution_id: number;
  institution_name?: string;
  name: string;
  total_books: number;
  digital_titles: number;
  journals_subscribed: number;
  seating_capacity: number;
  membership_fee: number;
  sell_on_marketplace?: boolean;
  marketplace_price?: number;
  opening_hours: string;
  e_resources_access: boolean;
  reading_hall_available: boolean;
  book_lending_available: boolean;
  borrowing_rules: string;
  librarian_name: string;
  librarian_email: string;
  librarian_phone: string;
  description: string;
  available_categories?: string;
  features?: string;
};

const DEFAULT_LIBRARY: LibraryItem = {
  institution_id: 1,
  name: "",
  total_books: 25000,
  digital_titles: 8000,
  journals_subscribed: 150,
  seating_capacity: 350,
  membership_fee: 0,
  sell_on_marketplace: false,
  marketplace_price: 0,
  opening_hours: "8:00 AM - 9:00 PM",
  e_resources_access: true,
  reading_hall_available: true,
  book_lending_available: true,
  borrowing_rules: "Maximum 4 books can be borrowed for a duration of 14 days. Renewal available online.",
  librarian_name: "Dr. Rajesh Verma",
  librarian_email: "library@institution.edu.in",
  librarian_phone: "+91 98765 12345",
  description: "State-of-the-art central library offering access to international journals, IEEE e-books, and automated borrowing.",
};

export default function AdminLibrariesPage() {
  const { user, accessToken } = useAuthStore();
  const [libraries, setLibraries] = useState<LibraryItem[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedInstitutionFilter, setSelectedInstitutionFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<LibraryItem>(DEFAULT_LIBRARY);
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
    fetchLibraries();
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

  const fetchLibraries = async () => {
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
      const res = await fetch(`/api/admin/institution/libraries?${params.toString()}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setLibraries(json.data || []);
      }
    } catch (err) {
      toast.error("Failed to load libraries");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdd = () => {
    const defaultInstId = userInstitutionId || (selectedInstitutionFilter !== "all" ? Number(selectedInstitutionFilter) : institutions[0]?.id || 1);
    setEditingLibrary({
      ...DEFAULT_LIBRARY,
      institution_id: defaultInstId,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (lib: LibraryItem) => {
    setEditingLibrary({ ...lib });
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLibrary.name.trim()) {
      toast.error("Library Name is required");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/institution/libraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingLibrary),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save library");

      toast.success(editingLibrary.id ? "Library updated successfully!" : "Library added successfully!");
      setDialogOpen(false);
      fetchLibraries();
    } catch (err: any) {
      toast.error(err.message || "Error saving library");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to remove this library resource?")) return;
    try {
      const res = await fetch(`/api/admin/institution/libraries?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Library deleted successfully!");
      fetchLibraries();
    } catch (err) {
      toast.error("Failed to delete library");
    }
  };

  const filteredLibraries = libraries.filter(
    (l) =>
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.institution_name && l.institution_name.toLowerCase().includes(search.toLowerCase())) ||
      (l.librarian_name && l.librarian_name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
            <Library className="h-3.5 w-3.5" />
            <span>Academic Knowledge Management</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Central & Digital Libraries</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage campus libraries, total print books, digital titles, journals, seating capacity, and membership prices.
          </p>
        </div>

        <Button onClick={handleOpenAdd} className="font-bold gap-2 shadow-sm bg-primary text-primary-foreground">
          <Plus className="h-4 w-4" />
          <span>Add New Library</span>
        </Button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search library name or librarian..."
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

      {/* Libraries Grid View */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading library resources...</span>
        </div>
      ) : filteredLibraries.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground space-y-3">
          <Library className="h-10 w-10 mx-auto opacity-30 text-primary" />
          <p className="font-semibold text-lg text-foreground">No Libraries Registered</p>
          <p className="text-xs">Click "Add New Library" to configure campus libraries for an institution.</p>
          <Button onClick={handleOpenAdd} size="sm" variant="outline" className="mt-2 text-xs">
            Add First Library
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredLibraries.map((l) => (
            <Card key={l.id} className="p-6 shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between space-y-5 bg-card border-border">
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2 border-b border-border pb-3">
                  <div>
                    <span className="text-[11px] font-bold text-primary flex items-center gap-1 mb-1">
                      <Library className="h-3.5 w-3.5" />
                      {l.institution_name || "Associated Institution"}
                    </span>
                    <h3 className="text-xl font-bold text-foreground leading-tight">{l.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3 text-primary shrink-0" /> {l.opening_hours}
                    </p>
                  </div>

                  <Badge variant="outline" className="text-xs font-bold border-primary/30 text-primary">
                    {l.membership_fee > 0 ? `₹${l.membership_fee}/yr` : "Free Access"}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{l.description}</p>

                {/* Resource Stats Strip */}
                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-xl bg-muted/60 text-center text-xs">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Print Books</span>
                    <span className="font-extrabold text-foreground">{Number(l.total_books || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">E-Journals</span>
                    <span className="font-extrabold text-primary">{Number(l.digital_titles || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold block">Capacity</span>
                    <span className="font-extrabold text-emerald-600">{l.seating_capacity} Seats</span>
                  </div>
                </div>

                {/* Librarian info */}
                <div className="text-xs text-muted-foreground bg-muted/30 p-2.5 rounded-lg border border-border/50 space-y-1">
                  <p className="font-bold text-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-primary" /> Librarian: {l.librarian_name || "Head Librarian"}
                  </p>
                  {l.librarian_email && (
                    <p className="text-[11px] truncate text-muted-foreground">{l.librarian_email} • {l.librarian_phone}</p>
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-4 border-t border-border flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted-foreground font-semibold">
                  {l.journals_subscribed || 100}+ Journals
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenEdit(l)}
                    className="h-8 text-xs font-semibold gap-1.5"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    <span>Edit</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => l.id && handleDelete(l.id)}
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

      {/* Add / Edit Library Dialog Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl! max-h-[90vh] overflow-y-auto p-6 bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <Library className="h-5 w-5 text-primary" />
              {editingLibrary.id ? "Edit Library Resource" : "Add New Library Resource"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure library details, books, digital titles, opening hours, librarian contact, and membership price.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-6 pt-2">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full h-auto p-1 bg-muted/60 rounded-xl border border-border/60 gap-1">
                <TabsTrigger value="basic" className="py-2 text-xs font-bold">1. Institution & Basic</TabsTrigger>
                <TabsTrigger value="resources" className="py-2 text-xs font-bold">2. Books & Resources</TabsTrigger>
                <TabsTrigger value="pricing" className="py-2 text-xs font-bold">3. Pricing & Features</TabsTrigger>
                <TabsTrigger value="librarian" className="py-2 text-xs font-bold">4. Librarian & Rules</TabsTrigger>
              </TabsList>

              {/* Tab 1: Institution & Basic Info */}
              <TabsContent value="basic" className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Associated Institution <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={String(editingLibrary.institution_id)}
                    onValueChange={(val) => setEditingLibrary((prev) => ({ ...prev, institution_id: Number(val) }))}
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
                  <p className="text-[11px] text-muted-foreground">Select which campus or institution this library belongs to.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">
                      Library Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      placeholder="e.g. Apex Central Knowledge Resource Center"
                      value={editingLibrary.name}
                      onChange={(e) => setEditingLibrary((prev) => ({ ...prev, name: e.target.value }))}
                      className="bg-background text-xs h-10"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Opening Hours</Label>
                    <Input
                      placeholder="e.g. 8:00 AM - 10:00 PM (24x7 During Exams)"
                      value={editingLibrary.opening_hours}
                      onChange={(e) => setEditingLibrary((prev) => ({ ...prev, opening_hours: e.target.value }))}
                      className="bg-background text-xs h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Brief Description</Label>
                  <Textarea
                    placeholder="Describe e-catalogues, IEEE subscriptions, reading pods..."
                    value={editingLibrary.description}
                    onChange={(e) => setEditingLibrary((prev) => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="bg-background text-xs resize-none"
                  />
                </div>
              </TabsContent>

              {/* Tab 2: Books & Resources */}
              <TabsContent value="resources" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Print Books Count</Label>
                    <Input
                      type="number"
                      value={editingLibrary.total_books}
                      onChange={(e) => setEditingLibrary((prev) => ({ ...prev, total_books: Number(e.target.value) }))}
                      className="bg-background text-xs h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Digital Titles / E-Books</Label>
                    <Input
                      type="number"
                      value={editingLibrary.digital_titles}
                      onChange={(e) => setEditingLibrary((prev) => ({ ...prev, digital_titles: Number(e.target.value) }))}
                      className="bg-background text-xs h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Journals Subscribed</Label>
                    <Input
                      type="number"
                      value={editingLibrary.journals_subscribed}
                      onChange={(e) => setEditingLibrary((prev) => ({ ...prev, journals_subscribed: Number(e.target.value) }))}
                      className="bg-background text-xs h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Seating Capacity</Label>
                    <Input
                      type="number"
                      value={editingLibrary.seating_capacity}
                      onChange={(e) => setEditingLibrary((prev) => ({ ...prev, seating_capacity: Number(e.target.value) }))}
                      className="bg-background text-xs h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Available Book Categories / Subjects</Label>
                  <Input
                    placeholder="e.g. Engineering, Computer Science, Medical, Management, Pure Sciences"
                    value={editingLibrary.available_categories}
                    onChange={(e) => setEditingLibrary((prev) => ({ ...prev, available_categories: e.target.value }))}
                    className="bg-background text-xs h-10"
                  />
                </div>
              </TabsContent>

              {/* Tab 3: Pricing & Features */}
              <TabsContent value="pricing" className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Membership Price / Annual Fee (₹)</Label>
                  <Input
                    type="number"
                    placeholder="0 for free campus access, or enter external fee"
                    value={editingLibrary.membership_fee}
                    onChange={(e) => setEditingLibrary((prev) => ({ ...prev, membership_fee: Number(e.target.value) }))}
                    className="bg-background text-xs h-10"
                  />
                  <p className="text-[11px] text-muted-foreground">Enter 0 if library is free for enrolled campus students.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                    <span className="text-xs font-bold text-foreground">Reading Hall Available</span>
                    <Switch
                      checked={editingLibrary.reading_hall_available}
                      onCheckedChange={(checked) => setEditingLibrary((prev) => ({ ...prev, reading_hall_available: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-card">
                    <span className="text-xs font-bold text-foreground">Digital E-Resources Access</span>
                    <Switch
                      checked={editingLibrary.e_resources_access}
                      onCheckedChange={(checked) => setEditingLibrary((prev) => ({ ...prev, e_resources_access: checked }))}
                    />
                  </div>
                </div>

                {/* Marketplace Option */}
                <MarketplaceSellOption
                  sellOnMarketplace={Boolean(editingLibrary.sell_on_marketplace)}
                  onSellOnMarketplaceChange={(val) =>
                    setEditingLibrary((prev) => ({
                      ...prev,
                      sell_on_marketplace: val,
                      marketplace_price: val ? prev.marketplace_price || prev.membership_fee || 0 : 0,
                    }))
                  }
                  marketplacePrice={editingLibrary.marketplace_price ?? 0}
                  onMarketplacePriceChange={(val) =>
                    setEditingLibrary((prev) => ({ ...prev, marketplace_price: Number(val) }))
                  }
                  title="Sell on Marketplace"
                  description="Offer digital/physical library subscriptions & memberships to external learners nationwide."
                  priceLabel="Marketplace Membership Charges (₹)"
                  pricePlaceholder="Enter annual/monthly price (e.g. 0 for Free or 999)"
                />

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Facilities & Features</Label>
                  <Textarea
                    placeholder="Comma-separated features (e.g. Air Conditioned, High-Speed Wi-Fi, Quiet Study Pods, Photocopy / Print Service, Digital Catalogue)"
                    value={editingLibrary.features}
                    onChange={(e) => setEditingLibrary((prev) => ({ ...prev, features: e.target.value }))}
                    rows={3}
                    className="bg-background text-xs resize-none"
                  />
                </div>
              </TabsContent>

              {/* Tab 4: Librarian & Guidelines */}
              <TabsContent value="librarian" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Librarian Name</Label>
                    <Input
                      placeholder="e.g. Dr. Rajesh Verma"
                      value={editingLibrary.librarian_name}
                      onChange={(e) => setEditingLibrary((prev) => ({ ...prev, librarian_name: e.target.value }))}
                      className="bg-background text-xs h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Librarian Email</Label>
                    <Input
                      type="email"
                      placeholder="library@institution.edu.in"
                      value={editingLibrary.librarian_email}
                      onChange={(e) => setEditingLibrary((prev) => ({ ...prev, librarian_email: e.target.value }))}
                      className="bg-background text-xs h-10"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-foreground">Librarian Phone</Label>
                    <Input
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={editingLibrary.librarian_phone}
                      onChange={(e) => setEditingLibrary((prev) => ({ ...prev, librarian_phone: e.target.value }))}
                      className="bg-background text-xs h-10"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Borrowing Rules & Guidelines</Label>
                  <Textarea
                    placeholder="Describe book issue limits, renewal rules, late fine charges..."
                    value={editingLibrary.borrowing_rules}
                    onChange={(e) => setEditingLibrary((prev) => ({ ...prev, borrowing_rules: e.target.value }))}
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
                <span>{editingLibrary.id ? "Save Library Changes" : "Create Library Resource"}</span>
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
