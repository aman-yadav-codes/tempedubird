"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
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
import {
  Calendar,
  CheckCircle2,
  Copy,
  Edit,
  Globe,
  IndianRupee,
  Layers,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  Sparkles,
  Tag,
  Trash2,
} from "lucide-react";

export type InstitutionOffer = {
  id: number;
  institution_id: number | null;
  institution_name?: string;
  title: string;
  description: string | null;
  coupon_code: string | null;
  discount_type: "percentage" | "flat";
  discount_value: number;
  banner_image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
};

export default function OffersManagementPage() {
  const { accessToken } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const [offers, setOffers] = useState<InstitutionOffer[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOffer, setEditingOffer] = useState<InstitutionOffer | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formDiscountType, setFormDiscountType] = useState<"percentage" | "flat">("percentage");
  const [formDiscountValue, setFormDiscountValue] = useState("15");
  const [formImage, setFormImage] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formActive, setFormActive] = useState(true);

  const fetchOffers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeInstitution?.id) params.set("institutionId", String(activeInstitution.id));

      const res = await fetch(`/api/admin/offers?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load offers");
      setOffers(data.offers || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load offers");
    } finally {
      setLoading(false);
    }
  }, [activeInstitution?.id]);

  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  const handleOpenAdd = () => {
    setEditingOffer(null);
    setFormTitle("");
    setFormDesc("");
    setFormCode("EARLYBIRD2026");
    setFormDiscountType("percentage");
    setFormDiscountValue("20");
    setFormImage("");
    setFormStart(new Date().toISOString().slice(0, 10));
    setFormEnd("");
    setFormActive(true);
    setDialogOpen(true);
  };

  const handleOpenEdit = (o: InstitutionOffer) => {
    setEditingOffer(o);
    setFormTitle(o.title);
    setFormDesc(o.description || "");
    setFormCode(o.coupon_code || "");
    setFormDiscountType(o.discount_type);
    setFormDiscountValue(String(o.discount_value));
    setFormImage(o.banner_image_url || "");
    setFormStart(o.start_date ? o.start_date.slice(0, 10) : "");
    setFormEnd(o.end_date ? o.end_date.slice(0, 10) : "");
    setFormActive(o.is_active);
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDiscountValue) {
      toast.error("Please provide Offer Title and Discount Value");
      return;
    }

    setSaving(true);
    try {
      const method = editingOffer ? "PUT" : "POST";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/offers", {
        method,
        headers,
        body: JSON.stringify({
          id: editingOffer?.id,
          institution_id: activeInstitution?.id || null,
          title: formTitle.trim(),
          description: formDesc.trim() || null,
          coupon_code: formCode.trim().toUpperCase() || null,
          discount_type: formDiscountType,
          discount_value: Number(formDiscountValue),
          banner_image_url: formImage.trim() || null,
          start_date: formStart || null,
          end_date: formEnd || null,
          is_active: formActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save offer");

      toast.success(editingOffer ? "Offer updated!" : "Promotional offer published!");
      setDialogOpen(false);
      fetchOffers();
    } catch (err: any) {
      toast.error(err.message || "Failed to save offer");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this offer?")) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/offers?id=${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        toast.success("Offer deleted");
        fetchOffers();
      }
    } catch {
      toast.error("Failed to delete offer");
    }
  };

  const copyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Coupon code "${code}" copied to clipboard!`);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Admission Incentives & Discounts</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">New Promotional Offers</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create coupon codes, seasonal tuition discounts, and display active promotional banners across your public institution microsite.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={fetchOffers} disabled={loading} className="gap-1.5">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
          <Button onClick={handleOpenAdd} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md gap-1.5">
            <Plus className="w-4 h-4" /> Create New Offer
          </Button>
        </div>
      </div>

      {/* Offers Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
          <span className="text-sm font-medium text-muted-foreground">Loading promotional offers...</span>
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-20 border rounded-3xl bg-muted/10 space-y-3">
          <Sparkles className="w-12 h-12 text-muted-foreground/40 mx-auto" />
          <h3 className="text-lg font-bold text-foreground">No active offers created yet</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Create discounts and coupons to incentivize student admissions and boost registrations on your website.
          </p>
          <Button onClick={handleOpenAdd} size="sm" className="mt-2 font-bold">
            <Plus className="w-4 h-4 mr-1.5" /> Launch An Offer
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {offers.map((offer) => (
            <Card
              key={offer.id}
              className="rounded-2xl border border-border/80 hover:border-primary/50 transition-all shadow-xs hover:shadow-md flex flex-col justify-between overflow-hidden relative"
            >
              <div className="h-2 bg-gradient-to-r from-amber-500 via-rose-500 to-primary" />
              <CardHeader className="p-5 pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-black text-xs">
                        {offer.discount_type === "percentage" ? `${offer.discount_value}% OFF` : `₹${offer.discount_value} OFF`}
                      </Badge>
                      <Badge variant={offer.is_active ? "default" : "secondary"} className="text-[10px]">
                        {offer.is_active ? "Live" : "Inactive"}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold leading-snug pt-1">{offer.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-3 text-xs">
                {offer.description && (
                  <p className="text-muted-foreground line-clamp-2 leading-relaxed">{offer.description}</p>
                )}

                {offer.coupon_code && (
                  <div className="p-3 bg-muted/40 rounded-xl border flex items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">Coupon Code</span>
                      <p className="font-mono font-black text-sm tracking-wider text-primary">{offer.coupon_code}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyCoupon(offer.coupon_code!)}
                      className="h-8 text-xs font-semibold gap-1 shrink-0"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </Button>
                  </div>
                )}

                {(offer.start_date || offer.end_date) && (
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[11px]">
                    <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>
                      Valid: {offer.start_date ? new Date(offer.start_date).toLocaleDateString("en-IN") : "Now"} –{" "}
                      {offer.end_date ? new Date(offer.end_date).toLocaleDateString("en-IN") : "Ongoing"}
                    </span>
                  </div>
                )}
              </CardContent>

              <CardFooter className="p-4 bg-muted/20 border-t flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground font-semibold">
                  {offer.institution_name || "Institution-Wide"}
                </span>

                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => handleOpenEdit(offer)} className="h-8 text-xs font-semibold">
                    <Edit className="w-3.5 h-3.5 mr-1" /> Edit
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(offer.id)} className="h-8 text-xs text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingOffer ? "Edit Promotional Offer" : "Create New Promotional Offer"}</DialogTitle>
              <DialogDescription>
                Set up discounts, promo codes, and validity to showcase on the institution website.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="off-title">Offer Headline / Title *</Label>
                <Input
                  id="off-title"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. 20% Early Bird Scholarship on 2026 Admissions"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="off-code">Coupon Code</Label>
                  <Input
                    id="off-code"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                    placeholder="e.g. EARLY2026"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="off-type">Discount Type</Label>
                  <Select value={formDiscountType} onValueChange={(v: any) => setFormDiscountType(v)}>
                    <SelectTrigger id="off-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (%)</SelectItem>
                      <SelectItem value="flat">Flat Amount (₹)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="off-val">Discount Value *</Label>
                  <Input
                    id="off-val"
                    type="number"
                    value={formDiscountValue}
                    onChange={(e) => setFormDiscountValue(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="off-desc">Offer Description</Label>
                <Textarea
                  id="off-desc"
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Terms, eligible batches, and benefits of this offer..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="off-start">Start Date</Label>
                  <Input
                    id="off-start"
                    type="date"
                    value={formStart}
                    onChange={(e) => setFormStart(e.target.value)}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="off-end">End Date</Label>
                  <Input
                    id="off-end"
                    type="date"
                    value={formEnd}
                    onChange={(e) => setFormEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : null}
                {editingOffer ? "Update Offer" : "Publish Offer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
