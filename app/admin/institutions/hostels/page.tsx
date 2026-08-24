"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
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
  Video,
  UploadCloud,
  FileText,
  X,
  Play,
  Dumbbell,
  BookOpen,
  Sparkles,
  Check,
  ShieldAlert,
  Clock,
  UserCheck,
  AlertCircle,
  PlusCircle,
  Settings2,
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

type MasterRule = {
  id: number;
  title: string;
  description?: string;
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
  mess_menu_details?: string;
  mess_menu_urls?: string;
  facilities: string;
  gallery_urls: string;
  video_urls?: string;
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
  mess_menu_details: "Monday-Sunday: Breakfast (7:30-9:30 AM), Lunch (12:30-2:30 PM), High Tea & Snacks (5:00-6:00 PM), Dinner (8:00-10:00 PM). Pure vegetarian and non-vegetarian counters separate. Special festival feast every Sunday.",
  mess_menu_urls: "",
  facilities: "1Gbps High-Speed Wi-Fi, 24x7 Power Backup Generator, Biometric & RFID Security Access, Modern Gymnasium & Fitness Center, Automated Laundry & Ironing, Dedicated Quiet Study Rooms, RO UV Drinking Water Stations",
  gallery_urls: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=900&q=80",
  video_urls: "",
  description: "Modern campus hostel featuring ergonomic furniture, high-speed connectivity, and hygienic dining.",
  rules: "Night Curfew: Campus gates close strictly at 10:00 PM.\nVisitor Policy: Visitors only permitted in the reception lounge until 7:00 PM.\nStrict Anti-Ragging Policy: Zero tolerance with immediate disciplinary action.\nQuiet Hours: Low noise levels between 10:00 PM and 6:00 AM.",
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

  // Master Amenities and Rules
  const [masterAmenities, setMasterAmenities] = useState<string[]>([]);
  const [masterRules, setMasterRules] = useState<MasterRule[]>([]);
  const [newMasterAmenity, setNewMasterAmenity] = useState("");
  const [newMasterRuleTitle, setNewMasterRuleTitle] = useState("");
  const [newMasterRuleDesc, setNewMasterRuleDesc] = useState("");
  const [addingMasterItem, setAddingMasterItem] = useState(false);

  // Upload States
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingMenu, setUploadingMenu] = useState(false);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const menuInputRef = useRef<HTMLInputElement>(null);

  const isPlatformAdmin = Boolean(
    user?.role_codes?.includes("super_admin") ||
    user?.role_codes?.includes("platform_admin")
  );

  const userInstitutionId = user?.memberships?.[0]?.institution_id
    ? Number(user.memberships[0].institution_id)
    : null;

  useEffect(() => {
    fetchInstitutions();
    fetchMasterConfig();
  }, []);

  useEffect(() => {
    if (!isPlatformAdmin && userInstitutionId && selectedInstitutionFilter === "all") {
      setSelectedInstitutionFilter(String(userInstitutionId));
    }
  }, [isPlatformAdmin, userInstitutionId]);

  useEffect(() => {
    fetchHostels();
  }, [selectedInstitutionFilter]);

  const fetchMasterConfig = async () => {
    try {
      const res = await fetch("/api/admin/institution/hostels/master-config");
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.amenities)) setMasterAmenities(json.amenities);
        if (Array.isArray(json.rules)) setMasterRules(json.rules);
      }
    } catch (err) {
      console.error("Error loading master hostel config:", err);
    }
  };

  const handleAddMasterAmenity = async () => {
    if (!newMasterAmenity.trim()) return;
    setAddingMasterItem(true);
    try {
      const res = await fetch("/api/admin/institution/hostels/master-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "amenity", name: newMasterAmenity.trim() }),
      });
      if (res.ok) {
        toast.success(`Master amenity "${newMasterAmenity.trim()}" added!`);
        setNewMasterAmenity("");
        fetchMasterConfig();
      }
    } catch (err) {
      toast.error("Failed to add master amenity");
    } finally {
      setAddingMasterItem(false);
    }
  };

  const handleDeleteMasterAmenity = async (name: string) => {
    if (!confirm(`Delete master amenity "${name}"?`)) return;
    try {
      const res = await fetch(`/api/admin/institution/hostels/master-config?type=amenity&name=${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Master amenity removed");
        fetchMasterConfig();
      }
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

  const handleAddMasterRule = async () => {
    if (!newMasterRuleTitle.trim()) {
      toast.error("Rule title is required");
      return;
    }
    setAddingMasterItem(true);
    try {
      const res = await fetch("/api/admin/institution/hostels/master-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "rule",
          title: newMasterRuleTitle.trim(),
          description: newMasterRuleDesc.trim(),
        }),
      });
      if (res.ok) {
        toast.success("Master rule added to dialog!");
        setNewMasterRuleTitle("");
        setNewMasterRuleDesc("");
        fetchMasterConfig();
      }
    } catch (err) {
      toast.error("Failed to add master rule");
    } finally {
      setAddingMasterItem(false);
    }
  };

  const handleDeleteMasterRule = async (id: number) => {
    if (!confirm("Delete this master rule from dialog?")) return;
    try {
      const res = await fetch(`/api/admin/institution/hostels/master-config?type=rule&id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Master rule deleted");
        fetchMasterConfig();
      }
    } catch (err) {
      toast.error("Failed to delete");
    }
  };

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "gallery_image" | "gallery_video" | "menu") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (type === "gallery_image") setUploadingImage(true);
    if (type === "gallery_video") setUploadingVideo(true);
    if (type === "menu") setUploadingMenu(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "program_media");

        const res = await fetch("/api/admin/uploads/image", {
          method: "POST",
          body: formData,
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "File upload failed");

        const uploadedUrl = json.data?.url;
        if (!uploadedUrl) continue;

        if (type === "gallery_image") {
          setEditingHostel((prev) => {
            const existing = prev.gallery_urls ? prev.gallery_urls.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean) : [];
            return {
              ...prev,
              gallery_urls: [...existing, uploadedUrl].join("\n"),
            };
          });
        } else if (type === "gallery_video") {
          setEditingHostel((prev) => {
            const existing = prev.video_urls ? prev.video_urls.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean) : [];
            return {
              ...prev,
              video_urls: [...existing, uploadedUrl].join("\n"),
            };
          });
        } else if (type === "menu") {
          setEditingHostel((prev) => {
            const existing = prev.mess_menu_urls ? prev.mess_menu_urls.split(/[\n,]+/).map((u) => u.trim()).filter(Boolean) : [];
            return {
              ...prev,
              mess_menu_urls: [...existing, uploadedUrl].join("\n"),
            };
          });
        }
      }
      toast.success(
        type === "gallery_image"
          ? "Photo(s) uploaded successfully!"
          : type === "gallery_video"
          ? "Video uploaded successfully!"
          : "Menu card uploaded successfully!"
      );
    } catch (err: any) {
      toast.error(err.message || "File upload failed");
    } finally {
      if (type === "gallery_image") setUploadingImage(false);
      if (type === "gallery_video") setUploadingVideo(false);
      if (type === "menu") setUploadingMenu(false);
      e.target.value = "";
    }
  };

  const removeGalleryUrl = (urlToRemove: string) => {
    setEditingHostel((prev) => {
      const urls = prev.gallery_urls
        .split(/[\n,]+/)
        .map((u) => u.trim())
        .filter((u) => u && u !== urlToRemove);
      return { ...prev, gallery_urls: urls.join("\n") };
    });
  };

  const removeVideoUrl = (urlToRemove: string) => {
    setEditingHostel((prev) => {
      const urls = (prev.video_urls || "")
        .split(/[\n,]+/)
        .map((u) => u.trim())
        .filter((u) => u && u !== urlToRemove);
      return { ...prev, video_urls: urls.join("\n") };
    });
  };

  const removeMenuUrl = (urlToRemove: string) => {
    setEditingHostel((prev) => {
      const urls = (prev.mess_menu_urls || "")
        .split(/[\n,]+/)
        .map((u) => u.trim())
        .filter((u) => u && u !== urlToRemove);
      return { ...prev, mess_menu_urls: urls.join("\n") };
    });
  };

  const toggleAmenityTag = (tag: string) => {
    setEditingHostel((prev) => {
      const currentList = prev.facilities
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
      const exists = currentList.some((f) => f.toLowerCase() === tag.toLowerCase());
      let nextList: string[];
      if (exists) {
        nextList = currentList.filter((f) => f.toLowerCase() !== tag.toLowerCase());
      } else {
        nextList = [...currentList, tag];
      }
      return { ...prev, facilities: nextList.join(", ") };
    });
  };

  const toggleRuleItem = (ruleTitle: string) => {
    setEditingHostel((prev) => {
      const currentLines = prev.rules
        .split("\n")
        .map((r) => r.trim())
        .filter(Boolean);
      const exists = currentLines.some((r) => r.toLowerCase().includes(ruleTitle.toLowerCase().slice(0, 20)));
      let nextLines: string[];
      if (exists) {
        nextLines = currentLines.filter((r) => !r.toLowerCase().includes(ruleTitle.toLowerCase().slice(0, 20)));
      } else {
        nextLines = [...currentLines, ruleTitle];
      }
      return { ...prev, rules: nextLines.join("\n") };
    });
  };

  const isRuleActive = (ruleTitle: string) => {
    return editingHostel.rules
      .toLowerCase()
      .includes(ruleTitle.toLowerCase().slice(0, 20));
  };

  const galleryImagesList = editingHostel.gallery_urls
    ? editingHostel.gallery_urls
        .split(/[\n,]+/)
        .map((u) => u.trim())
        .filter(Boolean)
    : [];

  const videoUrlsList = editingHostel.video_urls
    ? editingHostel.video_urls
        .split(/[\n,]+/)
        .map((u) => u.trim())
        .filter(Boolean)
    : [];

  const menuUrlsList = editingHostel.mess_menu_urls
    ? editingHostel.mess_menu_urls
        .split(/[\n,]+/)
        .map((u) => u.trim())
        .filter(Boolean)
    : [];

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
            Manage multiple hostels, institution associations, charges, mess menus, master amenities, rules, photos & videos.
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

                {/* Badges for Amenities, Food & Media */}
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
                  {h.video_urls && (
                    <Badge variant="outline" className="text-[10px] gap-1 bg-rose-500/10 text-rose-600 border-rose-500/20 font-semibold">
                      <Video className="h-3 w-3" /> Video Tour
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
        <DialogContent className="sm:max-w-4xl! max-h-[92vh] overflow-y-auto p-6 bg-card border border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {editingHostel.id ? "Edit Hostel Facility" : "Add New Hostel Facility"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Fill in hostel details, associated institution, fee structures, room types, mess menus, amenities, photos, videos, and campus rules.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-6 pt-2">
            <Tabs defaultValue="basic" className="w-full">
              <TabsList className="grid grid-cols-2 sm:grid-cols-6 w-full h-auto p-1 bg-muted/60 rounded-xl border border-border/60 gap-1">
                <TabsTrigger value="basic" className="py-2 text-xs font-bold">1. Basic</TabsTrigger>
                <TabsTrigger value="charges" className="py-2 text-xs font-bold">2. Charges</TabsTrigger>
                <TabsTrigger value="menu" className="py-2 text-xs font-bold">3. Food & Menu</TabsTrigger>
                <TabsTrigger value="amenities" className="py-2 text-xs font-bold">4. Amenities</TabsTrigger>
                <TabsTrigger value="gallery" className="py-2 text-xs font-bold">5. Media</TabsTrigger>
                <TabsTrigger value="rules" className="py-2 text-xs font-bold">6. Rules & Policies</TabsTrigger>
              </TabsList>

              {/* Hidden file inputs for direct device uploads (Computer / Mobile) */}
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFileUpload(e, "gallery_image")}
              />
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, "gallery_video")}
              />
              <input
                ref={menuInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => handleFileUpload(e, "menu")}
              />

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
                      placeholder="e.g. Maa Sharda Executive Campus Hostel"
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
                    placeholder="Describe location, environment, campus distance, study atmosphere..."
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
                    placeholder="e.g. Single AC, Double Non-AC, 3-Sharing Deluxe, 4-Sharing Standard"
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

              {/* Tab 3: Food & Menu */}
              <TabsContent value="menu" className="space-y-4 pt-4">
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
                    <div className="space-y-4 pt-2 border-t border-border">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground">Mess Meal Plan</Label>
                          <Input
                            placeholder="e.g. Four Meals Daily (Breakfast, Lunch, High Tea, Dinner)"
                            value={editingHostel.mess_facility}
                            onChange={(e) => setEditingHostel((prev) => ({ ...prev, mess_facility: e.target.value }))}
                            className="bg-background text-xs h-10"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-foreground">Canteen / Cafeteria Details</Label>
                          <Input
                            placeholder="e.g. 24x7 Night Canteen, Fresh Snacks, Fresh Juices & Beverages"
                            value={editingHostel.canteen_details}
                            onChange={(e) => setEditingHostel((prev) => ({ ...prev, canteen_details: e.target.value }))}
                            className="bg-background text-xs h-10"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">Daily / Weekly Mess Menu & Timings</Label>
                        <Textarea
                          placeholder="Describe weekly meal schedule (e.g. Monday: Paneer Butter Masala, Tuesday: Rajma Chawal, Sunday: Special Biryani/Feast) and timings..."
                          value={editingHostel.mess_menu_details || ""}
                          onChange={(e) => setEditingHostel((prev) => ({ ...prev, mess_menu_details: e.target.value }))}
                          rows={4}
                          className="bg-background text-xs resize-none"
                        />
                      </div>

                      {/* Menu Card Upload from Mobile / Computer */}
                      <div className="p-3.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                              <UploadCloud className="h-4 w-4 text-primary" />
                              Upload Mess Menu Card (Photo or PDF)
                            </span>
                            <span className="text-[11px] text-muted-foreground block">
                              Upload menu chart directly from your phone or computer.
                            </span>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            disabled={uploadingMenu}
                            onClick={() => menuInputRef.current?.click()}
                            className="text-xs font-bold bg-primary text-primary-foreground gap-1.5 shrink-0"
                          >
                            {uploadingMenu ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
                              </>
                            ) : (
                              <>
                                <UploadCloud className="h-3.5 w-3.5" /> Upload from Device
                              </>
                            )}
                          </Button>
                        </div>

                        {menuUrlsList.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                            {menuUrlsList.map((url, idx) => (
                              <div
                                key={idx}
                                className="relative flex items-center gap-2 p-1.5 pr-3 rounded-lg border bg-card text-xs"
                              >
                                <FileText className="h-4 w-4 text-primary shrink-0" />
                                <span className="truncate max-w-[200px] text-[11px] font-medium">{url}</span>
                                <button
                                  type="button"
                                  onClick={() => removeMenuUrl(url)}
                                  className="text-muted-foreground hover:text-destructive transition-colors ml-1"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Tab 4: Amenities & Facilities */}
              <TabsContent value="amenities" className="space-y-4 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card">
                    <span className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" /> Air Conditioned (AC) Rooms
                    </span>
                    <Switch
                      checked={editingHostel.ac_available}
                      onCheckedChange={(checked) => setEditingHostel((prev) => ({ ...prev, ac_available: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card">
                    <span className="text-xs font-bold text-foreground flex items-center gap-2">
                      <Wifi className="h-4 w-4 text-blue-500" /> High-Speed Wi-Fi (1Gbps)
                    </span>
                    <Switch
                      checked={editingHostel.wifi_available}
                      onCheckedChange={(checked) => setEditingHostel((prev) => ({ ...prev, wifi_available: checked }))}
                    />
                  </div>
                </div>

                {/* Master Amenity Tags from Database */}
                <div className="space-y-3 p-4 rounded-xl bg-muted/40 border border-border">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      Select Campus Amenities (Click to toggle for this hostel)
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {masterAmenities.length} standard options
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto pr-1">
                    {masterAmenities.map((tag) => {
                      const active = editingHostel.facilities
                        .split(",")
                        .some((f) => f.trim().toLowerCase() === tag.toLowerCase());
                      return (
                        <div key={tag} className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => toggleAmenityTag(tag)}
                            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all border flex items-center gap-1 cursor-pointer select-none ${
                              active
                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                : "bg-card text-foreground hover:bg-muted border-border"
                            }`}
                          >
                            {active ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3 opacity-60" />}
                            <span>{tag}</span>
                          </button>
                          {isPlatformAdmin && (
                            <button
                              type="button"
                              onClick={() => handleDeleteMasterAmenity(tag)}
                              title="Delete master amenity"
                              className="text-muted-foreground/50 hover:text-destructive text-[10px] p-0.5"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Platform Admin Inline Add Master Amenity */}
                  {isPlatformAdmin && (
                    <div className="pt-3 border-t border-border flex items-center gap-2">
                      <Input
                        placeholder="Add new master amenity for all hostels..."
                        value={newMasterAmenity}
                        onChange={(e) => setNewMasterAmenity(e.target.value)}
                        className="bg-background text-xs h-8"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddMasterAmenity();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={addingMasterItem || !newMasterAmenity.trim()}
                        onClick={handleAddMasterAmenity}
                        className="h-8 text-xs font-bold gap-1 shrink-0 bg-primary"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Option</span>
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Custom Facilities & Amenities Summary</Label>
                  <Textarea
                    placeholder="Comma-separated amenities (e.g. 1Gbps Wi-Fi, 24x7 Security, Gym, Power Backup, Laundry, Biometric Access, Study Room, Solar Water Heater)"
                    value={editingHostel.facilities}
                    onChange={(e) => setEditingHostel((prev) => ({ ...prev, facilities: e.target.value }))}
                    rows={2}
                    className="bg-background text-xs resize-none"
                  />
                </div>
              </TabsContent>

              {/* Tab 5: Gallery & Videos */}
              <TabsContent value="gallery" className="space-y-5 pt-4">
                {/* 1. Photo Gallery Section with Device Upload */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4 text-primary" />
                        Hostel Photo Gallery
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Upload hostel room photos, common areas, mess halls, and campus exterior from your computer or mobile.
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      disabled={uploadingImage}
                      onClick={() => imageInputRef.current?.click()}
                      className="text-xs font-bold bg-primary text-primary-foreground gap-1.5 shrink-0"
                    >
                      {uploadingImage ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-3.5 w-3.5" /> Upload Photos from Device
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Photo Preview Grid */}
                  {galleryImagesList.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {galleryImagesList.map((url, idx) => (
                        <div
                          key={idx}
                          className="group relative aspect-video rounded-xl overflow-hidden border border-border bg-muted/60"
                        >
                          <Image
                            src={url}
                            alt={`Hostel gallery ${idx + 1}`}
                            fill
                            sizes="(max-width: 768px) 50vw, 25vw"
                            className="object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeGalleryUrl(url)}
                            className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/70 hover:bg-destructive text-white flex items-center justify-center transition-colors cursor-pointer"
                            title="Remove image"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-muted-foreground border border-dashed rounded-xl space-y-1">
                      <ImageIcon className="h-8 w-8 mx-auto opacity-30 text-primary" />
                      <p className="text-xs font-semibold">No Photos Uploaded Yet</p>
                      <p className="text-[10px]">Click "Upload Photos from Device" or paste URLs below.</p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Or Paste Direct Image URLs (separated by new line or comma)</Label>
                    <Textarea
                      placeholder="https://images.unsplash.com/..."
                      value={editingHostel.gallery_urls}
                      onChange={(e) => setEditingHostel((prev) => ({ ...prev, gallery_urls: e.target.value }))}
                      rows={2}
                      className="bg-background text-xs resize-none"
                    />
                  </div>
                </div>

                {/* 2. Video Tour Section with Device Upload */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3">
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Video className="h-4 w-4 text-rose-500" />
                        Hostel Video Tours
                      </h4>
                      <p className="text-[11px] text-muted-foreground">
                        Upload video walk-throughs of rooms, washrooms, dining, and campus facilities from mobile or computer.
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      disabled={uploadingVideo}
                      onClick={() => videoInputRef.current?.click()}
                      className="text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 shrink-0"
                    >
                      {uploadingVideo ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Uploading Video...
                        </>
                      ) : (
                        <>
                          <UploadCloud className="h-3.5 w-3.5" /> Upload Video from Device
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Video Preview Grid */}
                  {videoUrlsList.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {videoUrlsList.map((url, idx) => (
                        <div
                          key={idx}
                          className="relative rounded-xl overflow-hidden border border-border bg-black aspect-video flex items-center justify-center"
                        >
                          <video
                            src={url}
                            controls
                            className="w-full h-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => removeVideoUrl(url)}
                            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/80 hover:bg-destructive text-white flex items-center justify-center transition-colors cursor-pointer z-10"
                            title="Remove video"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center text-muted-foreground border border-dashed rounded-xl space-y-1">
                      <Video className="h-8 w-8 mx-auto opacity-30 text-rose-500" />
                      <p className="text-xs font-semibold">No Video Tours Uploaded</p>
                      <p className="text-[10px]">Upload MP4 / MOV video files or paste video URLs below.</p>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Or Paste Direct Video URLs (separated by new line or comma)</Label>
                    <Textarea
                      placeholder="https://res.cloudinary.com/... or https://cdn.../video.mp4"
                      value={editingHostel.video_urls || ""}
                      onChange={(e) => setEditingHostel((prev) => ({ ...prev, video_urls: e.target.value }))}
                      rows={2}
                      className="bg-background text-xs resize-none"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Tab 6: Rules & Policies (DEDICATED TAB) */}
              <TabsContent value="rules" className="space-y-4 pt-4">
                {/* Master Standard Rules */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <ShieldAlert className="h-4 w-4 text-amber-500" />
                        Standard Hostel Rules & Policies
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Toggle standard rules to include them in this hostel profile.
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {masterRules.length} Standard Rules
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-60 overflow-y-auto pr-1">
                    {masterRules.map((rule) => {
                      const active = isRuleActive(rule.title);
                      return (
                        <div
                          key={rule.id}
                          onClick={() => toggleRuleItem(rule.title)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer select-none flex items-start justify-between gap-2.5 ${
                            active
                              ? "bg-primary/5 border-primary/40 shadow-xs"
                              : "bg-card border-border hover:bg-muted/50 opacity-70"
                          }`}
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <span className={`h-2 w-2 rounded-full ${active ? "bg-primary" : "bg-muted-foreground/40"}`} />
                              <h5 className="text-xs font-bold text-foreground leading-snug">{rule.title}</h5>
                            </div>
                            {rule.description && (
                              <p className="text-[10px] text-muted-foreground line-clamp-2 pl-3.5">{rule.description}</p>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                            <Switch checked={active} onCheckedChange={() => toggleRuleItem(rule.title)} />
                            {isPlatformAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteMasterRule(rule.id);
                                }}
                                className="text-muted-foreground/40 hover:text-destructive transition-colors p-1"
                                title="Delete master rule"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Platform Admin Inline Add Master Rule */}
                  {isPlatformAdmin && (
                    <div className="pt-3 border-t border-border space-y-2">
                      <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                        <PlusCircle className="h-3.5 w-3.5 text-primary" />
                        Platform Admin: Add Standard Rule (Appears on this dialog)
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          placeholder="Rule title (e.g. Leave Approval: Warden pass required)..."
                          value={newMasterRuleTitle}
                          onChange={(e) => setNewMasterRuleTitle(e.target.value)}
                          className="bg-background text-xs h-8"
                        />
                        <Input
                          placeholder="Optional explanation/description..."
                          value={newMasterRuleDesc}
                          onChange={(e) => setNewMasterRuleDesc(e.target.value)}
                          className="bg-background text-xs h-8"
                        />
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={addingMasterItem || !newMasterRuleTitle.trim()}
                        onClick={handleAddMasterRule}
                        className="h-8 text-xs font-bold gap-1.5 bg-primary"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Save Standard Rule</span>
                      </Button>
                    </div>
                  )}
                </div>

                {/* Custom Rules & Regulations Textarea */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">
                    Selected & Custom Rules Text (Editable)
                  </Label>
                  <Textarea
                    placeholder="Enter or customize rules and regulations for this hostel..."
                    value={editingHostel.rules}
                    onChange={(e) => setEditingHostel((prev) => ({ ...prev, rules: e.target.value }))}
                    rows={4}
                    className="bg-background text-xs resize-none"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Rules toggled above are automatically formatted here. You can also add institution-specific clauses.
                  </p>
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
