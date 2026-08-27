"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  BarChart3,
  Calendar,
  Edit,
  ExternalLink,
  Eye,
  Globe,
  Image,
  Layers,
  Loader2,
  Megaphone,
  MousePointerClick,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from "lucide-react";

export const AD_PLACEMENT_SLOTS = [
  { id: "all", label: "All Slots" },
  { id: "home_hero_banner", label: "Home Page - Hero Banner (Top)" },
  { id: "courses_sidebar_ad", label: "Courses Catalog - Sidebar Ad" },
  { id: "institution_top_bar", label: "Institution Microsite - Top Bar" },
  { id: "student_dashboard_ad", label: "Student Dashboard - Card Ad" },
  { id: "footer_banner", label: "Public Footer - Full Banner" },
];

export type AdCampaign = {
  id: number;
  title: string;
  placement_slot: string;
  banner_image_url: string;
  target_url: string;
  call_to_action: string;
  sponsor_name: string | null;
  start_date: string | null;
  end_date: string | null;
  status: "active" | "paused" | "expired";
  impressions_count: number;
  clicks_count: number;
  created_at: string;
};

export default function AdsManagementPage() {
  const { accessToken, user } = useAuthStore();
  const [ads, setAds] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<AdCampaign | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formSlot, setFormSlot] = useState("home_hero_banner");
  const [formImage, setFormImage] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formCta, setFormCta] = useState("Learn More");
  const [formSponsor, setFormSponsor] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "paused" | "expired">("active");

  const fetchAds = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedSlot !== "all") params.set("placement", selectedSlot);

      const res = await fetch(`/api/admin/ads?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load ad campaigns");
      setAds(data.ads || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load ads");
    } finally {
      setLoading(false);
    }
  }, [selectedSlot]);

  useEffect(() => {
    fetchAds();
  }, [fetchAds]);

  const handleOpenAdd = () => {
    setEditingAd(null);
    setFormTitle("");
    setFormSlot(selectedSlot !== "all" ? selectedSlot : "home_hero_banner");
    setFormImage("");
    setFormTarget("");
    setFormCta("Explore Now");
    setFormSponsor("EduBird Partner");
    setFormStart(new Date().toISOString().slice(0, 10));
    setFormEnd("");
    setFormStatus("active");
    setDialogOpen(true);
  };

  const handleOpenEdit = (ad: AdCampaign) => {
    setEditingAd(ad);
    setFormTitle(ad.title);
    setFormSlot(ad.placement_slot);
    setFormImage(ad.banner_image_url);
    setFormTarget(ad.target_url);
    setFormCta(ad.call_to_action || "Learn More");
    setFormSponsor(ad.sponsor_name || "");
    setFormStart(ad.start_date ? ad.start_date.slice(0, 10) : "");
    setFormEnd(ad.end_date ? ad.end_date.slice(0, 10) : "");
    setFormStatus(ad.status || "active");
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formImage.trim() || !formTarget.trim()) {
      toast.error("Please enter Ad Title, Banner Image URL, and Destination Target URL");
      return;
    }

    setSaving(true);
    try {
      const method = editingAd ? "PUT" : "POST";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/ads", {
        method,
        headers,
        body: JSON.stringify({
          id: editingAd?.id,
          title: formTitle.trim(),
          placement_slot: formSlot,
          banner_image_url: formImage.trim(),
          target_url: formTarget.trim(),
          call_to_action: formCta.trim(),
          sponsor_name: formSponsor.trim() || null,
          start_date: formStart || null,
          end_date: formEnd || null,
          status: formStatus,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save ad");

      toast.success(editingAd ? "Ad campaign updated!" : "Ad banner created and scheduled!");
      setDialogOpen(false);
      fetchAds();
    } catch (err: any) {
      toast.error(err.message || "Failed to save ad");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this ad campaign?")) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/ads?id=${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        toast.success("Ad campaign deleted");
        fetchAds();
      }
    } catch {
      toast.error("Failed to delete ad");
    }
  };

  const totalImpressions = ads.reduce((acc, a) => acc + (a.impressions_count || 0), 0);
  const totalClicks = ads.reduce((acc, a) => acc + (a.clicks_count || 0), 0);
  const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : "0.0";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <Megaphone className="w-4 h-4" />
            <span>Monetization & Ad Spaces</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Ads Creation & Placement Management</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Publish sponsored banners, institutional admission promotion spots, and track live real-time impressions and click-through rates.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchAds} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md gap-1.5">
            <Plus className="w-4 h-4" /> Create Ad Campaign
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 rounded-2xl border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase">Total Ad Impressions</span>
            <Eye className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{totalImpressions.toLocaleString("en-IN")}</div>
          <p className="text-[11px] text-muted-foreground">Views rendered across all slots</p>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase">Total Ad Clicks</span>
            <MousePointerClick className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{totalClicks.toLocaleString("en-IN")}</div>
          <p className="text-[11px] text-muted-foreground">User click-throughs to destination URLs</p>
        </Card>

        <Card className="p-4 rounded-2xl border bg-card shadow-xs space-y-1">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-bold uppercase">Average CTR</span>
            <BarChart3 className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-foreground">{ctr}%</div>
          <p className="text-[11px] text-muted-foreground">Overall conversion engagement</p>
        </Card>
      </div>

      {/* Filter Slot Selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs font-bold text-muted-foreground">Filter by Slot:</span>
        <Select value={selectedSlot} onValueChange={setSelectedSlot}>
          <SelectTrigger className="w-72 h-9 text-xs font-semibold bg-background rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AD_PLACEMENT_SLOTS.map((slot) => (
              <SelectItem key={slot.id} value={slot.id}>
                {slot.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Ads List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
          <span className="text-sm font-medium text-muted-foreground">Loading ad campaigns...</span>
        </div>
      ) : ads.length === 0 ? (
        <div className="text-center py-20 border rounded-3xl bg-muted/10 space-y-3">
          <Megaphone className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-lg font-bold text-foreground">No ads placed in this slot</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Create an ad banner, select where it will appear on the platform, and link it to an admission page or partner sponsor.
          </p>
          <Button onClick={handleOpenAdd} size="sm" className="mt-2 font-bold">
            <Plus className="w-4 h-4 mr-1.5" /> Place New Ad
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {ads.map((ad) => {
            const slotName = AD_PLACEMENT_SLOTS.find((s) => s.id === ad.placement_slot)?.label || ad.placement_slot;
            return (
              <Card
                key={ad.id}
                className="rounded-2xl border border-border/80 hover:border-primary/50 transition-all shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden"
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold leading-tight">{ad.title}</CardTitle>
                      {ad.sponsor_name && (
                        <p className="text-xs text-muted-foreground mt-0.5">Sponsor: {ad.sponsor_name}</p>
                      )}
                    </div>
                    <Badge variant={ad.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {ad.status}
                    </Badge>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-semibold text-primary border-primary/30 mt-2 w-fit">
                    📍 {slotName}
                  </Badge>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-3">
                  {/* Banner Image Preview */}
                  <div className="w-full h-36 rounded-xl overflow-hidden bg-muted/40 border relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={ad.banner_image_url} alt={ad.title} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <a
                        href={ad.target_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-white text-black text-xs font-bold rounded-lg shadow-lg flex items-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Visit Target Link
                      </a>
                    </div>
                  </div>

                  {/* Impression & Click Stats */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2 rounded-xl bg-muted/40 border text-center">
                      <p className="text-[10px] text-muted-foreground font-semibold">Impressions</p>
                      <p className="text-sm font-black text-foreground">{ad.impressions_count || 0}</p>
                    </div>
                    <div className="p-2 rounded-xl bg-muted/40 border text-center">
                      <p className="text-[10px] text-muted-foreground font-semibold">Clicks</p>
                      <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{ad.clicks_count || 0}</p>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="p-4 bg-muted/20 border-t flex items-center justify-between gap-2">
                  <span className="text-[11px] text-muted-foreground">CTA: &quot;{ad.call_to_action}&quot;</span>
                  <div className="flex items-center gap-1.5">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEdit(ad)} className="h-8 text-xs font-semibold">
                      <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(ad.id)} className="h-8 text-xs text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingAd ? "Edit Ad Placement" : "Create & Place Ad Campaign"}</DialogTitle>
              <DialogDescription>
                Configure placement slot, destination click URL, and visual banner graphic.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="ad-title">Campaign / Ad Title *</Label>
                <Input
                  id="ad-title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. JEE Advanced 2026 Crash Course 50% Off"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ad-slot">Placement Slot *</Label>
                  <Select value={formSlot} onValueChange={setFormSlot}>
                    <SelectTrigger id="ad-slot">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AD_PLACEMENT_SLOTS.filter((s) => s.id !== "all").map((slot) => (
                        <SelectItem key={slot.id} value={slot.id}>
                          {slot.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ad-sponsor">Sponsor / Brand Name</Label>
                  <Input
                    id="ad-sponsor"
                    value={formSponsor}
                    onChange={(e) => setFormSponsor(e.target.value)}
                    placeholder="e.g. EduBird Premier"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ad-img">Banner Image URL *</Label>
                <Input
                  id="ad-img"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                  placeholder="https://images.unsplash.com/... or /banners/..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ad-target">Destination Target URL *</Label>
                  <Input
                    id="ad-target"
                    value={formTarget}
                    onChange={(e) => setFormTarget(e.target.value)}
                    placeholder="https://edubird.com/courses/... or /institutions/..."
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ad-cta">Button Call to Action (CTA)</Label>
                  <Input
                    id="ad-cta"
                    value={formCta}
                    onChange={(e) => setFormCta(e.target.value)}
                    placeholder="e.g. Apply Now, Get Discount"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ad-start">Start Date</Label>
                  <Input
                    id="ad-start"
                    type="date"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ad-end">End Date</Label>
                  <Input
                    id="ad-end"
                    type="date"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="ad-status">Status</Label>
                  <Select value={formStatus} onValueChange={(val: any) => setFormStatus(val)}>
                    <SelectTrigger id="ad-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active (Visible)</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                {editingAd ? "Update Campaign" : "Publish Ad Campaign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
