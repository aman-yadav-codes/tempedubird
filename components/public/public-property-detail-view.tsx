"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Building2,
  Home,
  MapPin,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Phone,
  MessageCircle,
  ArrowRight,
  IndianRupee,
  Calendar,
  Maximize2,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { buildBusinessSeoUrl } from "@/lib/utils/seo-slug";

interface Props {
  property: any;
  owner?: any;
}

export function PublicPropertyDetailView({ property, owner }: Props) {
  const { user } = useAuthStore();

  const [visitOpen, setVisitOpen] = useState(false);
  const [form, setForm] = useState({
    name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    visitDate: "",
    notes: `Hi, I am interested in scheduling a site visit for ${property.name || property.title}.`,
  });
  const [submitting, setSubmitting] = useState(false);

  const ownerName = owner?.name || property.seller_name || property.agency_name || "Maa Sharda Real Estate & Infrastructure";
  const propLocation = [property.locality, property.city, property.state].filter(Boolean).join(", ") || "Pandeypur, Varanasi";
  const ownerPhone = owner?.phone || property.phone || "+91 9876543210";
  const ownerWhatsapp = owner?.whatsapp || ownerPhone.replace(/[^0-9]/g, "");
  const businessSlug = owner?.slug || property.business_slug || property.business_id;
  const businessUrl = businessSlug ? `/business/${businessSlug}` : (owner ? buildBusinessSeoUrl(owner) : "#");

  const price = Number(property.price || property.rent_amount || 0);

  const handleVisitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.visitDate) {
      toast.error("Please provide your name, phone number, and preferred visit date.");
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast.success("Site visit requested! The property manager will call you to confirm the appointment.");
      setVisitOpen(false);
    } catch {
      toast.error("Failed to schedule site visit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.share) {
      navigator.share({
        title: property.name || property.title,
        text: `Check out this listing for ${property.name || property.title} in ${propLocation}`,
        url: window.location.href,
      }).catch(() => {});
    } else if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Property listing URL copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      {/* Breadcrumb Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="size-3" />
            <Link href="/explore?type=business" className="hover:text-primary transition-colors">Real Estate & Properties</Link>
            {property.category_name && (
              <>
                <ChevronRight className="size-3" />
                <span className="text-foreground font-medium">{property.category_name}</span>
              </>
            )}
            <ChevronRight className="size-3" />
            <span className="text-primary font-semibold truncate max-w-[240px]">{property.name || property.title}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Property Content (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl border shadow-xs overflow-hidden bg-card">
              <div className="relative aspect-video sm:aspect-21/9 bg-muted overflow-hidden">
                <Image
                  src={property.image_url || property.default_image_url || "/placeholder-property.jpg"}
                  alt={property.name || property.title}
                  fill
                  priority
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge className="bg-emerald-600 text-white font-bold text-xs shadow-sm">
                    {property.property_type || "Commercial Space"}
                  </Badge>
                  <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-xs text-xs">
                    {property.furnishing || "Semi-Furnished"}
                  </Badge>
                </div>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {property.name || property.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-white/80 mt-1 flex items-center gap-2">
                    <MapPin className="size-3.5 text-emerald-400" />
                    {propLocation}
                  </p>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Key Metrics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/40 border">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Carpet Area</span>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1 mt-0.5">
                      <Maximize2 className="size-3.5 text-primary" />
                      {property.area_sqft || 1800} Sq. Ft.
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Floor Level</span>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1 mt-0.5">
                      <Layers className="size-3.5 text-primary" />
                      {property.floor_number || "1st Floor (Road Facing)"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Suitable For</span>
                    <span className="text-xs font-bold text-foreground truncate mt-0.5 block">
                      {property.suitable_for || "Coaching / Corporate Office"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Possession</span>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="size-3.5" />
                      Immediate
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-foreground">Property Overview</h3>
                  <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                    {property.description ||
                      `${property.name || property.title} is prominently located in ${propLocation}. Ideally structured for educational institutes, coaching classes, corporate offices, or clinical setups with high vehicular footfall, broad road frontage, and ample dedicated parking.`}
                  </div>
                </div>

                {/* Amenities */}
                <div className="space-y-3 pt-2 border-t">
                  <h3 className="text-base font-bold text-foreground">Key Amenities & Infrastructure</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {[
                      "24x7 Power Backup with Generator connection",
                      "High-speed elevator & wide staircase access",
                      "Separate washrooms for male and female staff/students",
                      "Dedicated covered vehicle parking space",
                      "Fire fighting equipment & safety certification",
                      "Water purifier & 24hr continuous water supply",
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-foreground/80">
                        <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column (Pricing & Contact) */}
          <div className="space-y-6">
            <Card className="rounded-2xl border shadow-md bg-card sticky top-20 overflow-hidden">
              <div className="p-6 space-y-6">
                <div>
                  <span className="text-xs text-muted-foreground font-semibold">Pricing / Rent</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-foreground">
                      {price > 0 ? `₹${price.toLocaleString("en-IN")}` : "₹45,000 / month"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Negotiable for long-term commercial lease
                  </p>
                </div>

                <div className="space-y-2.5">
                  <Button
                    onClick={() => setVisitOpen(true)}
                    className="w-full text-xs font-bold py-5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                  >
                    <Calendar className="size-4 mr-2" /> Schedule Site Visit
                  </Button>
                </div>

                {/* Direct Contact Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="text-xs font-medium text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                  >
                    <a
                      href={`https://wa.me/${ownerWhatsapp}?text=${encodeURIComponent(`Hi, I am interested in ${property.name || property.title} in ${propLocation}.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="size-3.5 mr-1 text-emerald-600" /> WhatsApp
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="text-xs font-medium"
                  >
                    <a href={`tel:${ownerPhone}`}>
                      <Phone className="size-3.5 mr-1" /> Call Owner
                    </a>
                  </Button>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>Share this listing:</span>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1 hover:text-primary font-semibold transition-colors cursor-pointer"
                  >
                    <Share2 className="size-3.5" /> Share
                  </button>
                </div>
              </div>
            </Card>

            {/* Owner / Agency Info Card */}
            <Card className="rounded-2xl border shadow-xs bg-card p-5 space-y-4">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Listed By
              </span>
              <div className="flex items-start gap-3">
                {businessUrl !== "#" ? (
                  <Link href={businessUrl} className="block cursor-pointer shrink-0">
                    <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors flex items-center justify-center font-bold text-base">
                      <Building2 className="size-6" />
                    </div>
                  </Link>
                ) : (
                  <div className="size-12 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold text-base shrink-0">
                    <Building2 className="size-6" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {businessSlug ? (
                    <Link href={businessUrl} className="hover:text-emerald-600 hover:underline block truncate">
                      <h4 className="font-bold text-sm text-foreground truncate">{ownerName}</h4>
                    </Link>
                  ) : (
                    <h4 className="font-bold text-sm text-foreground truncate">{ownerName}</h4>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3 text-primary shrink-0" />
                    <span className="truncate">{propLocation}</span>
                  </p>
                  <Badge variant="secondary" className="mt-2 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    <ShieldCheck className="size-3 mr-1" /> Verified Partner
                  </Badge>
                </div>
              </div>

              {(owner || businessSlug) && (
                <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold">
                  <Link href={businessUrl}>
                    View Owner Profile & All Properties <ArrowRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Schedule Site Visit Modal */}
      <Dialog open={visitOpen} onOpenChange={setVisitOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Schedule Site Visit: {property.name || property.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select your preferred date for physical inspection.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleVisitSubmit} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Your Name *
              </label>
              <Input
                required
                placeholder="Full Name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Phone Number *
              </label>
              <Input
                required
                placeholder="+91 9876543210"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Preferred Visit Date *
              </label>
              <Input
                type="date"
                required
                value={form.visitDate}
                onChange={(e) => setForm({ ...form, visitDate: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Notes / Requirement
              </label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="text-xs resize-none"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setVisitOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="bg-emerald-600 text-white">
                {submitting ? "Scheduling..." : "Request Visit"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
