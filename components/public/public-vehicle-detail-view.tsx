"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Car,
  MapPin,
  Building2,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Phone,
  MessageCircle,
  Gauge,
  Calendar,
  Fuel,
  Sparkles,
  KeyRound,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuthStore } from "@/store";

interface Props {
  vehicle: any;
  owner?: any;
}

export function PublicVehicleDetailView({ vehicle, owner }: Props) {
  const { user } = useAuthStore();

  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [form, setForm] = useState({
    name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    preferredDate: "",
    notes: `Hi, I am interested in "${vehicle.title || vehicle.name}". Please arrange a test drive and share pricing details.`,
  });
  const [submitting, setSubmitting] = useState(false);

  const ownerName =
    owner?.name ||
    vehicle.business_name ||
    vehicle.dealer_name ||
    "Authorized Dealer";
  const vehicleLocation =
    [vehicle.city, vehicle.state].filter(Boolean).join(", ") ||
    vehicle.address ||
    "Varanasi, India";
  const ownerPhone = owner?.phone || vehicle.phone || "+91 94152 20302";
  const ownerWhatsapp =
    owner?.whatsapp ||
    vehicle.whatsapp ||
    ownerPhone.replace(/[^0-9]/g, "");
  const businessSlug =
    owner?.slug || vehicle.business_slug || vehicle.business_id;

  const price = Number(vehicle.price || 0);

  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error("Please provide your name and phone number.");
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 600));
      toast.success(
        "Enquiry submitted! The dealership team will contact you to schedule your test drive."
      );
      setEnquiryOpen(false);
    } catch {
      toast.error("Failed to submit enquiry. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.share) {
      navigator
        .share({
          title: vehicle.title || vehicle.name,
          text: `Check out ${vehicle.title || vehicle.name} in ${vehicleLocation}`,
          url: window.location.href,
        })
        .catch(() => {});
    } else if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Vehicle listing link copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      {/* Breadcrumb Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <Link href="/" className="hover:text-primary transition-colors">
              Home
            </Link>
            <ChevronRight className="size-3" />
            <Link
              href="/vehicles"
              className="hover:text-primary transition-colors"
            >
              Vehicles
            </Link>
            {vehicle.category_name && (
              <>
                <ChevronRight className="size-3" />
                <span className="text-foreground font-medium">
                  {vehicle.category_name}
                </span>
              </>
            )}
            <ChevronRight className="size-3" />
            <span className="text-blue-600 font-semibold truncate max-w-[240px]">
              {vehicle.title || vehicle.name}
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Vehicle Content (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl border shadow-xs overflow-hidden bg-card">
              <div className="relative aspect-video sm:aspect-21/9 bg-muted overflow-hidden">
                <Image
                  src={
                    vehicle.image_url ||
                    vehicle.default_image_url ||
                    "/placeholder-vehicle.jpg"
                  }
                  alt={vehicle.title || vehicle.name}
                  fill
                  priority
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge className="bg-blue-600 text-white font-bold text-xs shadow-sm">
                    {price > 0 ? `₹${price.toLocaleString("en-IN")}` : "Price on Request"}
                  </Badge>
                  {vehicle.manufacturing_year && (
                    <Badge
                      variant="secondary"
                      className="bg-black/60 text-white backdrop-blur-xs text-xs"
                    >
                      {vehicle.manufacturing_year} Model
                    </Badge>
                  )}
                </div>
                <div className="absolute top-4 right-4">
                  <Button
                    size="sm"
                    variant="secondary"
                    className="size-8 p-0 rounded-full bg-black/60 text-white hover:bg-black/80 backdrop-blur-xs border-0"
                    onClick={handleShare}
                  >
                    <Share2 className="size-3.5" />
                  </Button>
                </div>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {vehicle.title || vehicle.name}
                  </h1>
                  <p className="text-xs sm:text-sm text-white/85 mt-1 flex items-center gap-2">
                    <MapPin className="size-3.5 text-blue-400 shrink-0" />
                    <span>{vehicleLocation}</span>
                  </p>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Key Specs Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">
                      Year
                    </span>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1 mt-0.5">
                      <Calendar className="size-3.5 text-blue-600" />
                      {vehicle.manufacturing_year || "2024"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">
                      Odometer
                    </span>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1 mt-0.5">
                      <Gauge className="size-3.5 text-blue-600" />
                      {vehicle.kilometers_driven
                        ? `${Number(vehicle.kilometers_driven).toLocaleString()} km`
                        : "Low Mileage"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">
                      Efficiency / Mileage
                    </span>
                    <span className="text-xs font-bold text-foreground truncate mt-0.5 block">
                      {vehicle.mileage || "Standard Economy"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">
                      Inspection
                    </span>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="size-3.5" />
                      Certified Checked
                    </span>
                  </div>
                </div>

                {/* Additional Spec Chips */}
                <div className="flex flex-wrap gap-2 text-xs">
                  {vehicle.color && (
                    <Badge variant="outline" className="px-2.5 py-1">
                      Color: <strong className="ml-1 text-foreground">{vehicle.color}</strong>
                    </Badge>
                  )}
                  {vehicle.engine_capacity && (
                    <Badge variant="outline" className="px-2.5 py-1">
                      Engine: <strong className="ml-1 text-foreground">{vehicle.engine_capacity}</strong>
                    </Badge>
                  )}
                  {vehicle.registration_number && (
                    <Badge variant="outline" className="px-2.5 py-1">
                      Reg: <strong className="ml-1 text-foreground">{vehicle.registration_number}</strong>
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="size-4 text-blue-600" />
                    Vehicle Overview
                  </h3>
                  <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                    {vehicle.description ||
                      `${vehicle.title || vehicle.name} is available for immediate delivery at ${vehicleLocation}. Thoroughly inspected by certified technicians, featuring clean ownership records, complete service documentation, and guaranteed roadworthiness.`}
                  </div>
                </div>

                {/* Assurance & Highlights */}
                <div className="space-y-3 pt-2 border-t">
                  <h3 className="text-base font-bold text-foreground">
                    Dealer Assurance & Guarantee
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {[
                      "150-Point comprehensive mechanical inspection passed",
                      "Zero accidental history & genuine odometer reading",
                      "RC transfer and RTO documentation support included",
                      "Complimentary comprehensive roadside assistance",
                      "Easy financing and loan approval options available",
                      "7-day money-back / exchange guarantee option",
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2 text-foreground/80"
                      >
                        <CheckCircle2 className="size-4 text-blue-600 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column (Pricing & Dealership) */}
          <div className="space-y-6">
            <Card className="rounded-2xl border shadow-md bg-card sticky top-20 overflow-hidden">
              <div className="p-6 space-y-6">
                <div>
                  <span className="text-xs text-muted-foreground font-semibold">
                    Showroom Price
                  </span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-foreground">
                      {price > 0 ? `₹${price.toLocaleString("en-IN")}` : "Price on Request"}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Price is negotiable. Exchange bonus & festive offers available.
                  </p>
                </div>

                <div className="space-y-2.5">
                  <Button
                    onClick={() => setEnquiryOpen(true)}
                    className="w-full text-xs font-bold py-5 cursor-pointer bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                  >
                    <KeyRound className="size-4 mr-2" /> Book Test Drive / Enquire
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
                      href={`https://wa.me/${ownerWhatsapp}?text=${encodeURIComponent(
                        `Hi, I am interested in inspecting "${vehicle.title || vehicle.name}" in ${vehicleLocation}.`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="size-3.5 mr-1 text-emerald-600" />
                      WhatsApp
                    </a>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    <a href={`tel:${ownerPhone}`}>
                      <Phone className="size-3.5 mr-1 text-slate-600" />
                      Call Dealer
                    </a>
                  </Button>
                </div>

                {/* Dealer Info Box */}
                <div className="p-4 rounded-xl bg-muted/40 border space-y-3">
                  <div className="flex items-center gap-2">
                    {businessSlug ? (
                      <Link href={`/business/${businessSlug}`} className="block cursor-pointer">
                        <div className="size-9 rounded-lg bg-blue-100 hover:bg-blue-200 transition-colors flex items-center justify-center text-blue-700">
                          <Building2 className="size-5" />
                        </div>
                      </Link>
                    ) : (
                      <div className="size-9 rounded-lg bg-blue-100 flex items-center justify-center text-blue-700">
                        <Building2 className="size-5" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] text-muted-foreground block uppercase tracking-wider font-semibold">
                        Dealership
                      </span>
                      {businessSlug ? (
                        <Link
                          href={`/business/${businessSlug}`}
                          className="text-xs font-bold text-foreground hover:text-blue-600 hover:underline truncate block"
                        >
                          {ownerName}
                        </Link>
                      ) : (
                        <span className="text-xs font-bold text-foreground truncate block">
                          {ownerName}
                        </span>
                      )}
                    </div>
                  </div>
                  {businessSlug && (
                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-blue-700 hover:text-blue-800 hover:bg-blue-50 font-semibold"
                    >
                      <Link href={`/business/${businessSlug}`}>
                        View Dealership Profile & Fleet →
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Enquiry Dialog */}
      <Dialog open={enquiryOpen} onOpenChange={setEnquiryOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book a Test Drive</DialogTitle>
            <DialogDescription>
              Submit your contact details for{" "}
              <span className="font-semibold text-foreground">
                {vehicle.title || vehicle.name}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEnquirySubmit} className="space-y-4 pt-2">
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Your Full Name *
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Anand Sharma"
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Phone Number *
              </label>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91..."
                required
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="your.email@example.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Preferred Test Drive Date
              </label>
              <Input
                type="date"
                value={form.preferredDate}
                onChange={(e) =>
                  setForm({ ...form, preferredDate: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground block mb-1">
                Message / Queries
              </label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEnquiryOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold"
              >
                {submitting ? "Submitting..." : "Schedule Test Drive"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
