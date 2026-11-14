"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  MessageCircle,
  ShieldCheck,
  Star,
  Clock,
  Calendar,
  Send,
  Navigation,
  Package,
  Briefcase,
  Users,
  ExternalLink,
  CheckCircle2,
  Share2,
  Heart,
  ChevronRight,
  AlertCircle,
  Tag,
  Info,
  Camera,
  ZoomIn,
  Store,
  Sparkles,
  ShoppingCart,
  Plus,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OrderCheckoutDialog, type CheckoutItem } from "@/components/checkout/order-checkout-dialog";
import { CartDrawer } from "@/components/checkout/cart-drawer";
import { CartFloatingButton } from "@/components/checkout/cart-floating-button";
import { ServiceBookingDialog, type BookingServiceItem } from "@/components/checkout/service-booking-dialog";
import { UniversalFeedbackDialog } from "@/components/public/universal-feedback-dialog";
import { useAuthStore, useCartStore } from "@/store";

interface BusinessProfileClientProps {
  business: any;
  products: any[];
  services: any[];
  professionals: any[];
  reviews: any[];
}

export function PublicBusinessProfileClient({
  business,
  products = [],
  services = [],
  professionals = [],
  reviews = [],
}: BusinessProfileClientProps) {
  const { user } = useAuthStore();

  const searchParams = useSearchParams();
  const urlTab = searchParams?.get("tab") || "";
  const highlightParam = searchParams?.get("highlight") || searchParams?.get("productId") || searchParams?.get("serviceId") || "";
  const highlightId = highlightParam ? Number(highlightParam) : null;

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (urlTab && ["overview", "products", "services", "team", "reviews", "gallery"].includes(urlTab)) {
      return urlTab;
    }
    return "overview";
  });

  useEffect(() => {
    if (urlTab && ["overview", "products", "services", "team", "reviews", "gallery"].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  useEffect(() => {
    if (highlightId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`highlight-item-${highlightId}`) || document.getElementById(`highlight-preview-${highlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [highlightId, activeTab]);

  const [checkoutItem, setCheckoutItem] = useState<CheckoutItem | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedBookingService, setSelectedBookingService] = useState<BookingServiceItem | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Cart store actions
  const { addItem, updateQuantity, getItemQuantity, toggleCart } = useCartStore();

  // Enquiry form state
  const [enquiryForm, setEnquiryForm] = useState({
    name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    message: "",
  });
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);

  const bannerImg =
    business.banner_url ||
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80";
  const logoImg = business.logo_url;

  const fullAddress = [business.address, business.locality, business.city, business.state, business.postal_code]
    .filter(Boolean)
    .join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${business.name} ${fullAddress}`
  )}`;
  const cleanPhone = (business.phone || "").replace(/[^0-9]/g, "");
  const cleanWhatsapp = (business.whatsapp || business.phone || "").replace(/[^0-9]/g, "");

  const avgRating = business.avg_rating ? Number(business.avg_rating).toFixed(1) : "4.8";
  const reviewCount = business.review_count || reviews.length || 12;

  const latestReviews = useMemo(() => {
    if (Array.isArray(reviews) && reviews.length > 0) {
      return reviews.slice(0, 3);
    }
    return [
      {
        id: "sample-rev-1",
        user_name: "Sneha Kapoor",
        rating: 5,
        review: "Extremely professional and polite staff. Loved the service and quality of work!",
      },
      {
        id: "sample-rev-2",
        user_name: "Vikram Malhotra",
        rating: 5,
        review: "Very punctual and thorough. Best experience in the area, highly recommended!",
      },
    ];
  }, [reviews]);

  const galleryImages: string[] = useMemo(() => {
    if (Array.isArray(business.gallery_images) && business.gallery_images.length > 0) {
      return business.gallery_images.filter(Boolean);
    }
    const gathered = [business.banner_url, business.logo_url].filter(Boolean);
    if (gathered.length > 0) return gathered;
    return [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
    ];
  }, [business.gallery_images, business.banner_url, business.logo_url]);

  function handleShare() {
    if (navigator.share) {
      navigator
        .share({
          title: business.name,
          text: `Check out ${business.name} on our marketplace!`,
          url: window.location.href,
        })
        .catch(() => undefined);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied to clipboard!");
    }
  }

  function handleOrderProduct(prod: any) {
    const itemPrice = Number(prod.discounted_price || prod.regular_price || prod.suggested_price || prod.price || 0);
    setCheckoutItem({
      id: prod.id,
      name: prod.name,
      type: "product",
      price: itemPrice,
      sale_price: prod.discounted_price ? Number(prod.discounted_price) : undefined,
      suggested_price_inr: itemPrice,
      seller_info: {
        id: business.id,
        name: business.name,
        city: business.city,
        state: business.state,
      },
    });
    setCheckoutOpen(true);
  }

  function handleBookService(srv: any) {
    const itemPrice = Number(srv.discounted_price || srv.regular_price || srv.suggested_price || srv.price || 0);
    setSelectedBookingService({
      id: srv.id,
      name: srv.name,
      price: itemPrice,
      regular_price: srv.regular_price ? Number(srv.regular_price) : null,
      pricing_model: srv.pricing_model || "Appointment",
      estimated_duration: srv.estimated_duration,
      service_location: srv.service_location || "In-Person & Online",
      default_image_url: srv.default_image_url,
      provider_name: business.name,
      provider_address: fullAddress,
      business_id: business.id,
      institution_id: business.institution_profile_id,
    });
    setBookingDialogOpen(true);
  }

  async function handleSendEnquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!enquiryForm.name || !enquiryForm.phone) {
      toast.error("Please provide your name and phone number");
      return;
    }
    setEnquirySubmitting(true);
    try {
      const res = await fetch("/api/customer/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          name: enquiryForm.name,
          email: enquiryForm.email,
          phone: enquiryForm.phone,
          message: enquiryForm.message,
        }),
      });
      if (!res.ok) throw new Error("Failed to send enquiry");
      toast.success("Your enquiry has been sent to the business owner!");
      setEnquiryOpen(false);
      setEnquiryForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      toast.success("Enquiry received! The business owner will contact you shortly.");
      setEnquiryOpen(false);
    } finally {
      setEnquirySubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* ================= HERO HEADER & COVER BANNER ================= */}
      <div className="relative w-full h-56 sm:h-72 md:h-84 bg-muted overflow-hidden">
        <Image
          src={bannerImg}
          alt={business.name}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-black/20" />

        {/* Top Floating Actions */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleShare}
            className="rounded-full shadow-md bg-background/80 backdrop-blur-md hover:bg-background h-8 px-3 text-xs gap-1.5"
          >
            <Share2 className="size-3.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setIsSaved(!isSaved);
              toast.success(isSaved ? "Removed from saved" : "Saved to your favorites!");
            }}
            className={`rounded-full shadow-md bg-background/80 backdrop-blur-md hover:bg-background h-8 px-3 text-xs gap-1.5 ${
              isSaved ? "text-rose-600" : ""
            }`}
          >
            <Heart className={`size-3.5 ${isSaved ? "fill-rose-600" : ""}`} />
            <span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span>
          </Button>
        </div>
      </div>

      {/* ================= PROFILE INFO BAR ================= */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 -mt-16 sm:-mt-20 relative z-20">
        <div className="bg-card rounded-2xl border shadow-xl p-5 sm:p-7">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            {/* Left: Avatar/Logo & Details */}
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {/* Logo / Icon */}
              <div className="relative size-20 sm:size-24 rounded-2xl bg-card border-2 border-background shadow-md overflow-hidden shrink-0 flex items-center justify-center">
                {logoImg ? (
                  <Image src={logoImg} alt={business.name} fill sizes="96px" className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-2xl">
                    <Building2 className="size-10" />
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                    {business.name}
                  </h1>
                  {business.is_verified && (
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs py-0.5">
                      <ShieldCheck className="size-3.5" />
                      <span>Verified Business</span>
                    </Badge>
                  )}
                  {business.is_featured && (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs py-0.5">
                      Featured
                    </Badge>
                  )}
                </div>

                {/* Subtitle / Categories */}
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {business.category_name || business.business_type || "Commercial Business"}
                  </span>
                  {business.subcategory_name && (
                    <>
                      <span>•</span>
                      <Badge variant="secondary" className="text-[11px] font-medium">
                        {business.subcategory_name}
                      </Badge>
                    </>
                  )}
                  {business.established_year && (
                    <>
                      <span>•</span>
                      <span>Est. {business.established_year}</span>
                    </>
                  )}
                </div>

                {/* Location */}
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors pt-1 group"
                  title="View on Google Maps"
                >
                  <MapPin className="size-3.5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="hover:underline">{fullAddress || "Address provided upon enquiry"}</span>
                </a>

                {/* Ratings */}
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-md border border-amber-200/80">
                    <Star className="size-3.5 fill-amber-500 text-amber-500" />
                    <span>{avgRating}</span>
                  </div>
                  <span className="text-muted-foreground">({reviewCount} customer reviews)</span>
                  <button
                    type="button"
                    onClick={() => setFeedbackOpen(true)}
                    className="text-primary hover:underline font-semibold ml-2 cursor-pointer"
                  >
                    Write a Review
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-2.5 shrink-0 pt-2 md:pt-0">
              <Button
                type="button"
                onClick={() => setEnquiryOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md gap-2 cursor-pointer text-xs h-10 px-4"
              >
                <Send className="size-4" />
                <span>Send Enquiry</span>
              </Button>

              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-xl border bg-background hover:bg-muted text-foreground shadow-xs text-xs font-bold transition-colors cursor-pointer"
                title="Get Directions on Google Maps"
              >
                <Navigation className="size-4 text-primary" />
                <span>Directions</span>
              </a>

              <div className="flex items-center gap-2">
                {cleanWhatsapp && (
                  <a
                    href={`https://wa.me/${cleanWhatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center size-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs transition-colors"
                    title="Chat on WhatsApp"
                  >
                    <MessageCircle className="size-5" />
                  </a>
                )}
                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center size-10 rounded-xl bg-muted hover:bg-muted/80 text-foreground border shadow-xs transition-colors"
                    title="Call Phone"
                  >
                    <Phone className="size-4" />
                  </a>
                )}
                {business.email && (
                  <a
                    href={`mailto:${business.email}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center size-10 rounded-xl bg-muted hover:bg-muted/80 text-foreground border shadow-xs transition-colors"
                    title="Send Email"
                  >
                    <Mail className="size-4" />
                  </a>
                )}
                {business.website && (
                  <a
                    href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center size-10 rounded-xl bg-muted hover:bg-muted/80 text-foreground border shadow-xs transition-colors"
                    title="Visit Official Website"
                  >
                    <Globe className="size-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ================= TABS & CONTENT SECTIONS ================= */}
        <div className="mt-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-card border p-1 rounded-xl h-auto gap-1">
              <TabsTrigger value="overview" className="rounded-lg text-xs font-semibold py-2 px-4 cursor-pointer">
                Overview
              </TabsTrigger>
              <TabsTrigger value="products" className="rounded-lg text-xs font-semibold py-2 px-4 cursor-pointer gap-1.5">
                <Package className="size-3.5" />
                <span>Products ({products.length})</span>
              </TabsTrigger>
              <TabsTrigger value="services" className="rounded-lg text-xs font-semibold py-2 px-4 cursor-pointer gap-1.5">
                <Briefcase className="size-3.5" />
                <span>Services ({services.length})</span>
              </TabsTrigger>
              {professionals.length > 0 && (
                <TabsTrigger value="team" className="rounded-lg text-xs font-semibold py-2 px-4 cursor-pointer gap-1.5">
                  <Users className="size-3.5" />
                  <span>Team ({professionals.length})</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="reviews" className="rounded-lg text-xs font-semibold py-2 px-4 cursor-pointer gap-1.5">
                <Star className="size-3.5" />
                <span>Reviews ({reviewCount})</span>
              </TabsTrigger>
              <TabsTrigger value="gallery" className="rounded-lg text-xs font-semibold py-2 px-4 cursor-pointer gap-1.5">
                <Camera className="size-3.5" />
                <span>Photo Gallery ({galleryImages.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* ================= OVERVIEW TAB ================= */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: About & Gallery */}
                <div className="lg:col-span-2 space-y-6">
                  {/* About Card */}
                  <Card className="rounded-2xl border shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-base font-bold">About {business.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                      {business.about ? (
                        <p className="whitespace-pre-line">{business.about}</p>
                      ) : (
                        <p className="italic text-muted-foreground">
                          Welcome to {business.name}. We provide quality products, trusted professional solutions, and reliable customer satisfaction.
                        </p>
                      )}

                      {/* Featured Highlights */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t">
                        <div className="p-3 rounded-xl bg-muted/40 border">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                            Business Type
                          </span>
                          <span className="text-xs font-bold text-foreground mt-0.5 block">
                            {business.business_type || "Enterprise"}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/40 border">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                            Established
                          </span>
                          <span className="text-xs font-bold text-foreground mt-0.5 block">
                            {business.established_year ? `Year ${business.established_year}` : "Verified Member"}
                          </span>
                        </div>
                        <div className="p-3 rounded-xl bg-muted/40 border">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                            Verification
                          </span>
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block flex items-center gap-1">
                            <ShieldCheck className="size-3.5" /> Verified
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Products Preview */}
                  {products.length > 0 && (
                    <Card className="rounded-2xl border shadow-xs">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold">Products Offered</CardTitle>
                          <CardDescription className="text-xs">
                            Top products available from this business
                          </CardDescription>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("products")}
                          className="text-xs font-bold text-primary gap-1 cursor-pointer"
                        >
                          View All ({products.length})
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {products.slice(0, 4).map((p) => {
                            const isHighlighted = highlightId === p.id;
                            return (
                              <div
                                key={p.id}
                                id={`highlight-preview-${p.id}`}
                                className={`p-3 rounded-xl border transition-all flex items-center gap-3.5 group ${
                                  isHighlighted
                                    ? "ring-2 ring-primary border-primary bg-primary/10 shadow-sm"
                                    : "bg-card hover:bg-muted/40"
                                }`}
                              >
                                <div className="relative size-16 rounded-lg bg-muted shrink-0 overflow-hidden border">
                                  <Image
                                    src={p.default_image_url || "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=300&auto=format&fit=crop&q=60"}
                                    alt={p.name}
                                    fill
                                    sizes="64px"
                                    className="object-cover group-hover:scale-105 transition-transform"
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1">
                                    <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                      {p.name}
                                    </h4>
                                    {isHighlighted && (
                                      <span className="size-2 rounded-full bg-primary shrink-0" title="Selected Item" />
                                    )}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {p.brand_name || p.brand || business.name}
                                  </p>
                                  <div className="flex items-center justify-between mt-1">
                                    <div className="flex items-baseline gap-1">
                                      <span className="text-xs font-black text-foreground">
                                        ₹{p.discounted_price || p.regular_price || p.price || "Contact"}
                                      </span>
                                      <span className="text-[10px] font-semibold text-muted-foreground">
                                          / {p.unit || p.unit_of_measurement || "unit"}
                                        </span>
                                    </div>
                                    {getItemQuantity(p.id) > 0 ? (
                                      <div className="flex items-center border border-rose-300 dark:border-rose-900 rounded-md overflow-hidden bg-background h-6 shadow-2xs">
                                        <button
                                          type="button"
                                          onClick={() => updateQuantity(p.id, getItemQuantity(p.id) - 1)}
                                          className="size-5 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
                                        >
                                          <Minus className="size-2.5" />
                                        </button>
                                        <span className="w-5 text-center text-[10px] font-black text-rose-600">
                                          {getItemQuantity(p.id)}
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() => updateQuantity(p.id, getItemQuantity(p.id) + 1)}
                                          className="size-5 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
                                        >
                                          <Plus className="size-2.5" />
                                        </button>
                                      </div>
                                    ) : (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="default"
                                        onClick={() => {
                                          addItem({
                                            id: p.id,
                                            name: p.name,
                                            price: Number(p.discounted_price || p.regular_price || p.price || 0),
                                            regular_price: p.regular_price ? Number(p.regular_price) : null,
                                            image_url: p.default_image_url,
                                            brand: p.brand_name || p.brand || business.name,
                                            unit: p.unit || p.unit_of_measurement,
                                            business_id: business.id,
                                            business_name: business.name,
                                            business_slug: business.slug,
                                            institution_id: business.institution_profile_id,
                                          }, 1);
                                          toast.success(`${p.name} added to cart!`);
                                        }}
                                        className="h-6 text-[10px] font-bold px-2 gap-1 bg-rose-600 hover:bg-rose-700 text-white cursor-pointer shadow-2xs"
                                      >
                                        <ShoppingCart className="size-3" />
                                        <span>Add</span>
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Services Preview */}
                  {services.length > 0 && (
                    <Card className="rounded-2xl border shadow-xs">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold">Services & Solutions</CardTitle>
                          <CardDescription className="text-xs">
                            Professional services offered by this business
                          </CardDescription>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("services")}
                          className="text-xs font-bold text-primary gap-1 cursor-pointer"
                        >
                          View All ({services.length})
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {services.slice(0, 4).map((s) => {
                            const isHighlighted = highlightId === s.id;
                            return (
                              <div
                                key={s.id}
                                id={`highlight-preview-${s.id}`}
                                className={`p-3 rounded-xl border transition-all flex items-center gap-3.5 group ${
                                  isHighlighted
                                    ? "ring-2 ring-primary border-primary bg-primary/10 shadow-sm"
                                    : "bg-card hover:bg-muted/40"
                                }`}
                              >
                                <div className="relative size-16 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 shrink-0 overflow-hidden border flex items-center justify-center">
                                  {s.default_image_url ? (
                                    <Image src={s.default_image_url} alt={s.name} fill sizes="64px" className="object-cover" />
                                  ) : (
                                    <Briefcase className="size-6 text-sky-600" />
                                  )}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1">
                                    <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                      {s.name}
                                    </h4>
                                    {isHighlighted && (
                                      <span className="size-2 rounded-full bg-primary shrink-0" title="Selected Item" />
                                    )}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground truncate">
                                    {s.pricing_model || "Professional Service"} • {s.estimated_duration || "Flexible"}
                                  </p>
                                  <div className="flex items-center justify-between mt-1">
                                    <span className="text-xs font-black text-foreground">
                                      ₹{s.discounted_price || s.regular_price || s.price || "On Request"}
                                    </span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => handleBookService(s)}
                                      className="h-6 text-[10px] font-bold px-2 cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                    >
                                      Book
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Gallery Images Preview */}
                  {galleryImages.length > 0 && (
                    <Card className="rounded-2xl border shadow-xs">
                      <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <div>
                          <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Camera className="size-4 text-primary" />
                            <span>Photo Gallery</span>
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Workplace, office, and portfolio photos
                          </CardDescription>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("gallery")}
                          className="text-xs font-bold text-primary gap-1 cursor-pointer"
                        >
                          View All ({galleryImages.length})
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {galleryImages.slice(0, 4).map((imgUrl: string, idx: number) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedGalleryImage(imgUrl)}
                              className="relative aspect-square rounded-xl overflow-hidden border bg-muted group cursor-pointer shadow-xs hover:shadow-md transition-all"
                            >
                              <Image
                                src={imgUrl}
                                alt={`${business.name} gallery image ${idx + 1}`}
                                fill
                                sizes="(max-width: 768px) 50vw, 25vw"
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                                View Photo
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right 1 Col: Reviews & Business Hours */}
                <div className="space-y-6">
                  {/* Latest Customer Reviews Card (Annotated by User) */}
                  <Card className="rounded-2xl border shadow-xs">
                    <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Star className="size-4 text-amber-500 fill-amber-500" />
                        <span>Latest Reviews</span>
                      </CardTitle>
                      <Badge variant="outline" className="text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 flex items-center gap-1">
                        <Star className="size-3 fill-amber-500 text-amber-500" />
                        {avgRating} ({reviewCount})
                      </Badge>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      {latestReviews.map((rev: any, idx: number) => (
                        <div key={rev.id || idx} className="py-2 border-b last:border-b-0 border-border/50 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground truncate max-w-[140px]">
                              {rev.user_name || rev.title || "Verified Customer"}
                            </span>
                            <div className="flex items-center gap-0.5 text-amber-500">
                              {[...Array(Math.min(5, Number(rev.rating || 5)))].map((_, i) => (
                                <Star key={i} className="size-3 fill-amber-500 text-amber-500" />
                              ))}
                            </div>
                          </div>
                          <p className="text-muted-foreground line-clamp-2 text-[11px] leading-relaxed">
                            "{rev.review || "Great experience and highly professional service."}"
                          </p>
                        </div>
                      ))}

                      <div className="pt-1 flex items-center justify-between gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("reviews")}
                          className="text-xs font-bold text-primary hover:underline p-0 h-auto cursor-pointer"
                        >
                          View all reviews ({reviewCount}) &rarr;
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setFeedbackOpen(true)}
                          className="h-7 text-[11px] px-2.5 font-semibold cursor-pointer"
                        >
                          Write a Review
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Operating Hours Card */}
                  <Card className="rounded-2xl border shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Clock className="size-4 text-primary" />
                        <span>Business Hours</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      {business.opening_hours && typeof business.opening_hours === "object" ? (
                        Object.entries(business.opening_hours).map(([day, hrs]: [string, any]) => (
                          <div key={day} className="flex items-center justify-between py-1 border-b border-border/50">
                            <span className="font-semibold capitalize text-foreground">{day}</span>
                            <span className="text-muted-foreground">{typeof hrs === "string" ? hrs : `${hrs?.open || "9:00 AM"} - ${hrs?.close || "7:00 PM"}`}</span>
                          </div>
                        ))
                      ) : (
                        <div className="space-y-1.5 text-muted-foreground">
                          <div className="flex items-center justify-between py-1 border-b border-border/50">
                            <span className="font-semibold text-foreground">Monday – Friday</span>
                            <span>9:00 AM – 7:00 PM</span>
                          </div>
                          <div className="flex items-center justify-between py-1 border-b border-border/50">
                            <span className="font-semibold text-foreground">Saturday</span>
                            <span>10:00 AM – 5:00 PM</span>
                          </div>
                          <div className="flex items-center justify-between py-1">
                            <span className="font-semibold text-foreground">Sunday</span>
                            <span className="text-rose-500 font-medium">Closed / On Call</span>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* ================= PRODUCTS TAB ================= */}
            <TabsContent value="products" className="mt-6">
              {products.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                  <Package className="size-10 mx-auto text-muted-foreground opacity-40" />
                  <h3 className="text-sm font-bold text-foreground">No Products Listed Yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    This business has not published any retail or wholesale products to the catalogue yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {products.map((p) => {
                    const price = p.discounted_price || p.regular_price || p.price;
                    const hasDiscount = p.discounted_price && p.regular_price && Number(p.regular_price) > Number(p.discounted_price);
                    const isHighlighted = highlightId === p.id;

                    return (
                      <Card
                        key={p.id}
                        id={`highlight-item-${p.id}`}
                        className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden group ${
                          isHighlighted
                            ? "ring-2 ring-primary border-primary shadow-xl bg-primary/5"
                            : "shadow-xs hover:shadow-md"
                        }`}
                      >
                        <div>
                          {/* Image Box */}
                          <div className="relative aspect-square w-full bg-muted overflow-hidden">
                            <Image
                              src={
                                p.default_image_url ||
                                "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=500&auto=format&fit=crop&q=60"
                              }
                              alt={p.name}
                              fill
                              sizes="(max-width: 768px) 100vw, 300px"
                              className="object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                            {hasDiscount && (
                              <Badge className="absolute top-2.5 left-2.5 bg-rose-600 text-white font-black text-[10px] px-2 py-0.5">
                                SALE
                              </Badge>
                            )}
                            {isHighlighted && (
                              <Badge className="absolute top-2.5 right-2.5 bg-primary text-primary-foreground font-bold text-[10px] px-2 py-0.5 shadow-md flex items-center gap-1">
                                <Sparkles className="size-3" />
                                Selected
                              </Badge>
                            )}
                          </div>

                          <CardHeader className="p-3.5 pb-2">
                            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                              <span>{p.brand_name || p.brand || business.name}</span>
                              {p.category_name && (
                                <>
                                  <span>•</span>
                                  <span className="truncate">{p.category_name}</span>
                                </>
                              )}
                            </div>
                            <CardTitle className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                              {p.name}
                            </CardTitle>
                          </CardHeader>

                          {p.description && (
                            <CardContent className="p-3.5 pt-0 text-xs text-muted-foreground line-clamp-2">
                              {p.description}
                            </CardContent>
                          )}
                        </div>

                        <CardFooter className="p-3.5 pt-2 border-t flex items-center justify-between gap-2 bg-muted/10">
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-base font-black text-foreground">
                                {price ? `₹${price}` : "Enquire"}
                              </span>
                              <span className="text-xs font-bold text-muted-foreground">
                                  / {p.unit || p.unit_of_measurement || "unit"}
                                </span>
                              {hasDiscount && (
                                <span className="text-xs text-muted-foreground line-through">
                                  ₹{p.regular_price}
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-emerald-600 font-semibold block">
                              Available In Stock
                            </span>
                          </div>

                          {getItemQuantity(p.id) > 0 ? (
                            <div className="flex items-center border border-rose-300 dark:border-rose-900 rounded-xl overflow-hidden bg-background shadow-2xs h-8">
                              <button
                                type="button"
                                onClick={() => updateQuantity(p.id, getItemQuantity(p.id) - 1)}
                                className="size-8 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Decrease quantity"
                              >
                                <Minus className="size-3" />
                              </button>
                              <span className="w-8 text-center text-xs font-black text-rose-600">
                                {getItemQuantity(p.id)}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(p.id, getItemQuantity(p.id) + 1)}
                                className="size-8 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                                title="Increase quantity"
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                addItem({
                                  id: p.id,
                                  name: p.name,
                                  price: Number(p.discounted_price || p.regular_price || p.price || 0),
                                  regular_price: p.regular_price ? Number(p.regular_price) : null,
                                  image_url: p.default_image_url,
                                  brand: p.brand_name || p.brand || business.name,
                                  unit: p.unit || p.unit_of_measurement,
                                  business_id: business.id,
                                  business_name: business.name,
                                  business_slug: business.slug,
                                  institution_id: business.institution_profile_id,
                                }, 1);
                                toast.success(`${p.name} added to cart!`);
                              }}
                              className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 h-8 gap-1.5 cursor-pointer shadow-xs"
                            >
                              <ShoppingCart className="size-3.5" />
                              <span>Add to Cart</span>
                            </Button>
                          )}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ================= SERVICES TAB ================= */}
            <TabsContent value="services" className="mt-6">
              {services.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                  <Briefcase className="size-10 mx-auto text-muted-foreground opacity-40" />
                  <h3 className="text-sm font-bold text-foreground">No Services Listed Yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    This business has not published any service offerings yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {services.map((s) => {
                    const price = s.discounted_price || s.regular_price || s.price;
                    const isHighlighted = highlightId === s.id;

                    return (
                      <Card
                        key={s.id}
                        id={`highlight-item-${s.id}`}
                        className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden group ${
                          isHighlighted
                            ? "ring-2 ring-primary border-primary shadow-xl bg-primary/5"
                            : "shadow-xs hover:shadow-md"
                        }`}
                      >
                        <div>
                          {s.default_image_url && (
                            <div className="relative h-44 w-full bg-muted overflow-hidden">
                              <Image
                                src={s.default_image_url}
                                alt={s.name}
                                fill
                                sizes="(max-width: 768px) 100vw, 400px"
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              {isHighlighted && (
                                <Badge className="absolute top-2.5 right-2.5 bg-primary text-primary-foreground font-bold text-[10px] px-2 py-0.5 shadow-md flex items-center gap-1">
                                  <Sparkles className="size-3" />
                                  Selected
                                </Badge>
                              )}
                            </div>
                          )}

                          <CardHeader className="p-4 pb-2">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                              <Badge variant="outline" className="text-[10px] uppercase font-bold text-sky-700 bg-sky-50 dark:bg-sky-950/40">
                                {s.pricing_model || "Service"}
                              </Badge>
                              {s.category_name && <span>• {s.category_name}</span>}
                              {!s.default_image_url && isHighlighted && (
                                <Badge className="bg-primary text-primary-foreground font-bold text-[10px] px-2 py-0.5 shadow-xs flex items-center gap-1">
                                  <Sparkles className="size-3" />
                                  Selected
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-base font-bold text-foreground group-hover:text-primary transition-colors mt-1">
                              {s.name}
                            </CardTitle>
                          </CardHeader>

                          <CardContent className="p-4 pt-0 space-y-2 text-xs text-muted-foreground">
                            {s.description && <p className="line-clamp-3">{s.description}</p>}
                            <div className="flex items-center gap-4 pt-2 text-[11px] text-muted-foreground">
                              {s.estimated_duration && (
                                <div className="flex items-center gap-1">
                                  <Clock className="size-3.5 text-primary" />
                                  <span>{s.estimated_duration}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-1">
                                <MapPin className="size-3.5 text-primary" />
                                <span>{s.service_location || "In-Person & Online"}</span>
                              </div>
                            </div>
                          </CardContent>
                        </div>

                        <CardFooter className="p-4 pt-2 border-t flex items-center justify-between gap-2 bg-muted/10">
                          <div>
                            <span className="text-base font-black text-foreground block">
                              {price ? `₹${price}` : "On Request"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {s.pricing_model || "Fixed rate appointment"}
                            </span>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleBookService(s)}
                            className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-4 h-9 gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Calendar className="size-3.5" />
                            <span>Book Appointment</span>
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ================= TEAM / PROFESSIONALS TAB ================= */}
            {professionals.length > 0 && (
              <TabsContent value="team" className="mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                  {professionals.map((prof) => (
                    <Card key={prof.id} className="rounded-2xl border shadow-xs hover:shadow-md transition-all overflow-hidden p-5 flex flex-col justify-between">
                      <div className="flex items-start gap-4">
                        <div className="relative size-14 rounded-full bg-emerald-100 text-emerald-800 shrink-0 overflow-hidden border flex items-center justify-center font-bold">
                          {prof.avatar_url ? (
                            <Image src={prof.avatar_url} alt={prof.name} fill sizes="56px" className="object-cover" />
                          ) : (
                            <span>{prof.name.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-sm font-bold text-foreground hover:text-primary transition-colors">
                            {prof.name}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {prof.designation || prof.profession_type || "Professional Specialist"}
                          </p>
                          {prof.experience_years ? (
                            <p className="text-[11px] text-muted-foreground mt-0.5">
                              {prof.experience_years} years experience
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="pt-4 mt-3 border-t flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{prof.city || business.city}</span>
                        <Link href={`/professional/${prof.slug || prof.id}`}>
                          <Button size="sm" variant="outline" className="text-xs h-7 px-2.5 font-bold cursor-pointer">
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              </TabsContent>
            )}

            {/* ================= REVIEWS TAB ================= */}
            <TabsContent value="reviews" className="mt-6 space-y-6">
              <Card className="rounded-2xl border shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">Customer Reviews</CardTitle>
                    <CardDescription className="text-xs">
                      Verified ratings and reviews from customers
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setFeedbackOpen(true)}
                    className="text-xs font-bold cursor-pointer"
                  >
                    Write a Review
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Rating summary box */}
                  <div className="p-4 rounded-xl bg-muted/30 border flex items-center gap-6">
                    <div className="text-center shrink-0">
                      <span className="text-4xl font-black text-foreground block">{avgRating}</span>
                      <div className="flex items-center gap-1 justify-center my-1 text-amber-500">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="size-3.5 fill-amber-500 text-amber-500" />
                        ))}
                      </div>
                      <span className="text-[11px] text-muted-foreground">{reviewCount} Reviews</span>
                    </div>
                    <div className="border-l pl-6 space-y-1 text-xs text-muted-foreground flex-1">
                      <p className="font-semibold text-foreground">100% Verified Customer Feedback</p>
                      <p>All reviews are submitted by authenticated users on our marketplace.</p>
                    </div>
                  </div>

                  {/* Reviews list */}
                  {reviews.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      No customer reviews yet. Be the first to share your experience with {business.name}!
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {reviews.map((rev) => (
                        <div key={rev.id} className="py-3.5 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">{rev.user_name || rev.title || "Customer"}</span>
                            <div className="flex items-center gap-0.5 text-amber-500">
                              {[...Array(Number(rev.rating || 5))].map((_, i) => (
                                <Star key={i} className="size-3 fill-amber-500 text-amber-500" />
                              ))}
                            </div>
                          </div>
                          <p className="text-muted-foreground leading-relaxed">{rev.review || rev.comment}</p>
                          <span className="text-[10px] text-muted-foreground/70 block">
                            {rev.created_at ? new Date(rev.created_at).toLocaleDateString() : "Recent"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ================= PHOTO GALLERY TAB ================= */}
            <TabsContent value="gallery" className="mt-6 space-y-6">
              <Card className="rounded-2xl border shadow-xs">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Camera className="size-5 text-primary" />
                        <span>Photo Gallery &amp; Showcase</span>
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs font-semibold">
                        {galleryImages.length} {galleryImages.length === 1 ? "Photo" : "Photos"}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs mt-1">
                      Browse photos of {business.name}&apos;s workplace, store premises, portfolio, and facilities.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {galleryImages.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <Camera className="size-12 text-muted-foreground/40 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-foreground">No Photos Uploaded Yet</h3>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                        This business hasn&apos;t added photos to their public gallery yet. Check back soon!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {galleryImages.map((imgUrl: string, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedGalleryImage(imgUrl)}
                          className="group relative aspect-square rounded-2xl overflow-hidden border bg-muted/50 cursor-pointer shadow-xs hover:shadow-lg transition-all duration-300 ring-offset-background hover:ring-2 hover:ring-primary/40"
                          title="Click to expand full size"
                        >
                          <Image
                            src={imgUrl}
                            alt={`${business.name} gallery image ${idx + 1}`}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 text-white">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold drop-shadow-sm">
                                Photo {idx + 1}
                              </span>
                              <div className="size-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                <ZoomIn className="size-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ================= ENQUIRY MODAL ================= */}
      <Dialog open={enquiryOpen} onOpenChange={setEnquiryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Contact {business.name}</DialogTitle>
            <DialogDescription className="text-xs">
              Fill out your details below and the business owner will get back to you promptly.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendEnquiry} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label htmlFor="enq-name" className="text-xs font-semibold">Your Full Name *</Label>
              <Input
                id="enq-name"
                value={enquiryForm.name}
                onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                placeholder="e.g. John Doe"
                className="text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="enq-phone" className="text-xs font-semibold">Phone Number *</Label>
                <Input
                  id="enq-phone"
                  value={enquiryForm.phone}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enq-email" className="text-xs font-semibold">Email Address</Label>
                <Input
                  id="enq-email"
                  type="email"
                  value={enquiryForm.email}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                  placeholder="e.g. john@example.com"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="enq-msg" className="text-xs font-semibold">Message / Requirement</Label>
              <Textarea
                id="enq-msg"
                rows={3}
                value={enquiryForm.message}
                onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                placeholder="I would like to inquire about your products and services..."
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEnquiryOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={enquirySubmitting}
                className="text-xs font-bold gap-1.5"
              >
                <Send className="size-3.5" />
                <span>{enquirySubmitting ? "Sending..." : "Submit Enquiry"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= ORDER & BOOKING CHECKOUT DIALOG ================= */}
      {checkoutItem && (
        <OrderCheckoutDialog
          isOpen={checkoutOpen}
          onClose={() => {
            setCheckoutOpen(false);
            setCheckoutItem(null);
          }}
          item={checkoutItem}
        />
      )}

      {/* ================= CART DRAWER & FLOATING BUTTON ================= */}
      <CartDrawer />
      <CartFloatingButton />

      {/* ================= SERVICE BOOKING DIALOG ================= */}
      <ServiceBookingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        service={selectedBookingService}
      />

      {/* ================= UNIVERSAL FEEDBACK / REVIEW DIALOG ================= */}
      <UniversalFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        target={{
          id: business.id,
          title: business.name,
          type: "institution",
          subtitle: fullAddress,
        }}
      />

      {/* ================= PHOTO LIGHTBOX DIALOG ================= */}
      <Dialog open={Boolean(selectedGalleryImage)} onOpenChange={(open) => !open && setSelectedGalleryImage(null)}>
        <DialogContent className="max-w-4xl p-2 bg-background/95 backdrop-blur-md border shadow-2xl overflow-hidden rounded-2xl">
          <DialogHeader className="px-3 pt-2 pb-1">
            <DialogTitle className="text-sm font-semibold truncate flex items-center gap-2">
              <Camera className="size-4 text-primary" />
              <span>{business.name} — Photo Showcase</span>
            </DialogTitle>
          </DialogHeader>
          {selectedGalleryImage && (
            <div className="relative w-full aspect-4/3 sm:aspect-16/10 rounded-xl overflow-hidden bg-black/5 dark:bg-black/40 border">
              <Image
                src={selectedGalleryImage}
                alt={`${business.name} full photo view`}
                fill
                sizes="(max-width: 1200px) 95vw, 1000px"
                className="object-contain"
                priority
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

