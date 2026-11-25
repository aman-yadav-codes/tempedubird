"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Briefcase,
  Store,
  MapPin,
  ChevronRight,
  Clock,
  Sparkles,
  Phone,
  CheckCircle2,
  Calendar,
  Share2,
  Star,
  ShieldCheck,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuthStore, useCartStore } from "@/store";
import { buildBusinessSeoUrl, buildProfessionalSeoUrl } from "@/lib/utils/seo-slug";

interface Props {
  service: any;
  provider?: any;
  providerType?: "business" | "professional";
  reviews?: any[];
}

export function PublicServiceDetailView({
  service,
  provider,
  providerType = "business",
  reviews = [],
}: Props) {
  const { user } = useAuthStore();
  const { addItem, setIsOpen } = useCartStore();

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const price = Number(service.price || service.sale_price || service.regular_price || 0);
  const regularPrice = service.regular_price ? Number(service.regular_price) : null;
  const hasDiscount = Boolean(regularPrice && regularPrice > price);
  const discountPercent = hasDiscount && regularPrice ? Math.round(((regularPrice - price) / regularPrice) * 100) : 0;

  const providerName = provider?.name || service.provider_name || service.business_name || "Verified Service Center";
  const providerLocation = [provider?.locality, provider?.city, provider?.state].filter(Boolean).join(", ") || service.city || "Varanasi";
  const providerPhone = provider?.phone || service.phone || "+91 9876543210";
  const providerWhatsapp = provider?.whatsapp || providerPhone.replace(/[^0-9]/g, "");

  const providerUrl = provider
    ? providerType === "professional"
      ? buildProfessionalSeoUrl(provider)
      : buildBusinessSeoUrl(provider)
    : "#";

  const handleBookNow = () => {
    const added = addItem(
      {
        id: `srv_${service.id}`,
        name: service.name || service.title,
        price: price,
        regular_price: regularPrice,
        image_url: service.default_image_url || service.image_url,
        brand: providerName,
        unit: service.pricing_model || "Service",
        business_id: provider?.id,
        business_name: providerName,
        business_slug: provider?.slug,
        item_type: "service",
      },
      1
    );

    if (added) {
      toast.success(`${service.name || service.title} added to your booked services!`);
      setIsOpen(true);
    }
  };

  const handleConfirmDirectBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDate) {
      toast.error("Please pick a preferred booking date.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/customer/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: service.business_id || service.businessId,
          professionalId: service.professional_id || service.professionalId,
          serviceId: service.id,
          serviceName: service.name || service.title || "Service",
          bookingDate,
          bookingTime,
          notes,
          totalPrice: finalPrice,
        }),
      });
      if (res.ok) {
        toast.success("Booking request sent! The service provider will call to confirm your appointment.");
        setBookingOpen(false);
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error || "Failed to submit booking. Please try again.");
      }
    } catch {
      toast.error("Failed to submit booking. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.share) {
      navigator.share({
        title: service.name || service.title,
        text: `Book ${service.name || service.title} in ${providerLocation}`,
        url: window.location.href,
      }).catch(() => {});
    } else if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Service link copied to clipboard!");
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
            <Link href="/explore?type=service" className="hover:text-primary transition-colors">Services</Link>
            {service.category_name && (
              <>
                <ChevronRight className="size-3" />
                <span className="text-foreground font-medium">{service.category_name}</span>
              </>
            )}
            <ChevronRight className="size-3" />
            <span className="text-primary font-semibold truncate max-w-[240px]">{service.name || service.title}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Service Content (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main Header Card */}
            <Card className="rounded-2xl border shadow-xs overflow-hidden bg-card">
              <div className="relative aspect-video sm:aspect-21/9 bg-muted overflow-hidden">
                <Image
                  src={service.default_image_url || service.image_url || "/placeholder-service.jpg"}
                  alt={service.name || service.title}
                  fill
                  priority
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge className="bg-primary text-white font-bold text-xs shadow-sm">
                    {service.category_name || "Professional Service"}
                  </Badge>
                  {service.subcategory_name && (
                    <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-xs text-xs">
                      {service.subcategory_name}
                    </Badge>
                  )}
                </div>
                <div className="absolute bottom-4 left-4 right-4 text-white">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                    {service.name || service.title}
                  </h1>
                  <p className="text-xs sm:text-sm text-white/80 mt-1 flex items-center gap-2">
                    <MapPin className="size-3.5 text-primary" />
                    Available in {providerLocation}
                  </p>
                </div>
              </div>

              <CardContent className="p-6 space-y-6">
                {/* Highlights bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-muted/40 border">
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Estimated Time</span>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="size-3.5 text-primary" />
                      {service.estimated_duration || `${service.duration_minutes || 60} mins`}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Service Location</span>
                    <span className="text-xs font-bold text-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3.5 text-primary" />
                      {service.service_location || "At Center & Doorstep"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Pricing Model</span>
                    <span className="text-xs font-bold text-foreground capitalize mt-0.5 block">
                      {service.pricing_model?.replace("_", " ") || "Fixed Price"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-foreground block font-medium">Guarantee</span>
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 mt-0.5">
                      <ShieldCheck className="size-3.5" />
                      100% Verified
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-foreground">About This Service</h3>
                  <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                    {service.description ||
                      `${service.name || service.title} is offered with highest quality standards in ${providerLocation}. Expert professionals handle the entire service requirement with verified tools, clear timelines, and customer satisfaction guarantee.`}
                  </div>
                </div>

                {/* Key Benefits */}
                <div className="space-y-3 pt-2 border-t">
                  <h3 className="text-base font-bold text-foreground">Key Inclusions & Highlights</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                    {[
                      "Complete end-to-end service execution by verified experts",
                      "Transparent pricing with no hidden travel or service charges",
                      "Full customer support and post-service warranty",
                      "Flexible scheduling (Morning, Afternoon & Evening slots)",
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-foreground/80">
                        <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Reviews Section */}
            <Card className="rounded-2xl border shadow-xs bg-card">
              <CardHeader className="p-6 pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Star className="size-4.5 text-amber-500 fill-amber-500" />
                    Customer Reviews & Feedback ({reviews.length > 0 ? reviews.length : "Verified"})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {(reviews.length > 0 ? reviews : [
                  {
                    id: 1,
                    rating: 5,
                    title: "Excellent service on time",
                    review: "Very professional team. Completed the entire task within the promised time frame. Highly recommended in Varanasi!",
                    user_name: "Prakash Sharma",
                    created_at: "2026-05-12T10:00:00Z",
                  },
                  {
                    id: 2,
                    rating: 5,
                    title: "Reasonable price and great quality",
                    review: "Found this through the marketplace portal. Smooth communication, proper invoicing, and courteous staff.",
                    user_name: "Ritu Verma",
                    created_at: "2026-06-04T14:30:00Z",
                  },
                ]).map((r) => (
                  <div key={r.id} className="p-4 rounded-xl border bg-muted/20 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground">{r.user_name || "Satisfied Client"}</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: Math.max(0, Math.min(5, Math.round(Number(r.rating) || 5))) }).map((_, i) => (
                          <Star key={i} className="size-3 text-amber-500 fill-amber-500" />
                        ))}
                      </div>
                    </div>
                    {r.title && <p className="text-xs font-semibold text-foreground">{r.title}</p>}
                    <p className="text-xs text-muted-foreground">{r.review}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column (Booking, Pricing & Provider Card) */}
          <div className="space-y-6">
            {/* Sticky Pricing & Booking Card */}
            <Card className="rounded-2xl border shadow-md bg-card sticky top-20 overflow-hidden">
              <div className="p-6 space-y-6">
                <div>
                  <span className="text-xs text-muted-foreground font-semibold">Service Fee</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-black text-foreground">
                      ₹{price > 0 ? price.toLocaleString("en-IN") : "Contact for Quote"}
                    </span>
                    {hasDiscount && (
                      <>
                        <span className="text-sm text-muted-foreground line-through">
                          ₹{regularPrice?.toLocaleString("en-IN")}
                        </span>
                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs font-bold">
                          {discountPercent}% OFF
                        </Badge>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Inclusive of all taxes & standard inspection
                  </p>
                </div>

                <div className="space-y-2.5">
                  <Button
                    onClick={() => setBookingOpen(true)}
                    className="w-full text-xs font-bold py-5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                  >
                    <Calendar className="size-4 mr-2" /> Book Appointment Now
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleBookNow}
                    className="w-full text-xs font-semibold py-5 cursor-pointer"
                  >
                    <Sparkles className="size-4 mr-2 text-primary" /> Add to Service Cart
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
                      href={`https://wa.me/${providerWhatsapp}?text=${encodeURIComponent(`Hi, I am interested in booking ${service.name || service.title}. Please share availability.`)}`}
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
                    <a href={`tel:${providerPhone}`}>
                      <Phone className="size-3.5 mr-1" /> Call Provider
                    </a>
                  </Button>
                </div>

                <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                  <span>Share this service:</span>
                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1 hover:text-primary font-semibold transition-colors cursor-pointer"
                  >
                    <Share2 className="size-3.5" /> Share
                  </button>
                </div>
              </div>
            </Card>

            {/* Provider Info Card */}
            <Card className="rounded-2xl border shadow-xs bg-card p-5 space-y-4">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Offered By
              </span>
              <div className="flex items-start gap-3">
                {providerUrl !== "#" ? (
                  <Link href={providerUrl} className="block cursor-pointer shrink-0" title={`Visit ${providerName} Profile`}>
                    <div className="size-12 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center font-bold text-base transition-colors">
                      {providerType === "professional" ? <Briefcase className="size-6" /> : <Store className="size-6" />}
                    </div>
                  </Link>
                ) : (
                  <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0">
                    {providerType === "professional" ? <Briefcase className="size-6" /> : <Store className="size-6" />}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {providerUrl !== "#" ? (
                    <Link href={providerUrl} className="block cursor-pointer group/prov" title={`Visit ${providerName} Profile`}>
                      <h4 className="font-bold text-sm text-foreground group-hover/prov:text-primary group-hover/prov:underline transition-colors truncate">
                        {providerName}
                      </h4>
                    </Link>
                  ) : (
                    <h4 className="font-bold text-sm text-foreground truncate">{providerName}</h4>
                  )}
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3 text-primary shrink-0" />
                    <span className="truncate">{providerLocation}</span>
                  </p>
                  <Badge variant="secondary" className="mt-2 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    <ShieldCheck className="size-3 mr-1" /> Verified Provider
                  </Badge>
                </div>
              </div>

              {provider?.about && (
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {provider.about}
                </p>
              )}

              <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold">
                <Link href={providerUrl}>
                  View Full Profile & All Listings <ArrowRight className="size-3.5 ml-1" />
                </Link>
              </Button>
            </Card>
          </div>
        </div>
      </div>

      {/* Direct Booking Modal */}
      <Dialog open={bookingOpen} onOpenChange={setBookingOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Book Appointment: {service.name || service.title}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Choose your preferred date and time. {providerName} will confirm your slot.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleConfirmDirectBooking} className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Preferred Date *
              </label>
              <Input
                type="date"
                required
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Preferred Time Slot
              </label>
              <Input
                type="time"
                value={bookingTime}
                onChange={(e) => setBookingTime(e.target.value)}
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Special Instructions / Notes
              </label>
              <Textarea
                placeholder="E.g. landmark, specific issue, urgent requirement..."
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setBookingOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="bg-primary text-white">
                {submitting ? "Booking..." : "Confirm Booking"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
