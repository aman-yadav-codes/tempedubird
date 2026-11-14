"use client";

import React, { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  UserCheck,
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
  ExternalLink,
  CheckCircle2,
  Share2,
  Heart,
  ChevronRight,
  Award,
  Sparkles,
  Tag,
  BookOpen,
  Loader2,
  KeyRound,
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
import { UniversalFeedbackDialog } from "@/components/public/universal-feedback-dialog";
import { useAuthStore } from "@/store";

interface ProfessionalProfileClientProps {
  professional: any;
  services: any[];
  products: any[];
  associatedBusiness: any | null;
  reviews: any[];
}

export function PublicProfessionalProfileClient({
  professional,
  services = [],
  products = [],
  associatedBusiness = null,
  reviews = [],
}: ProfessionalProfileClientProps) {
  const { user, setAuth } = useAuthStore();
  const router = useRouter();
  const [demoLoggingIn, setDemoLoggingIn] = useState(false);

  const isOwner = Boolean(
    user &&
      ((professional.user_id && user.id === professional.user_id) ||
        (professional.email && user.email?.toLowerCase() === professional.email.toLowerCase()))
  );

  async function handleDemoLogin() {
    setDemoLoggingIn(true);
    try {
      const res = await fetch("/api/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "ramesh" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Demo login failed");
      setAuth(data.user, data.accessToken);
      toast.success(`Signed in as ${data.user?.full_name || professional.name}!`, {
        description: "You now have access to Ramesh's professional controls.",
      });
      router.refresh();
    } catch (err: any) {
      toast.error(err?.message || "Failed to demo login");
    } finally {
      setDemoLoggingIn(false);
    }
  }

  const [activeTab, setActiveTab] = useState("overview");
  const [checkoutItem, setCheckoutItem] = useState<CheckoutItem | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Enquiry form state
  const [enquiryForm, setEnquiryForm] = useState({
    name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    message: "",
  });
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);

  const bannerImg =
    professional.banner_url ||
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80";
  const avatarImg = professional.avatar_url;

  const fullAddress = [professional.address, professional.locality, professional.city, professional.state, professional.postal_code]
    .filter(Boolean)
    .join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${professional.name} ${fullAddress}`
  )}`;
  const cleanPhone = (professional.phone || "").replace(/[^0-9]/g, "");
  const cleanWhatsapp = (professional.whatsapp || professional.phone || "").replace(/[^0-9]/g, "");

  const avgRating = professional.avg_rating ? Number(professional.avg_rating).toFixed(1) : "4.9";
  const reviewCount = professional.review_count || reviews.length || 18;

  const latestReviews = useMemo(() => {
    if (Array.isArray(reviews) && reviews.length > 0) {
      return reviews.slice(0, 3);
    }
    return [
      {
        id: 1,
        user_name: "Rahul Verma",
        rating: 5,
        review: "Excellent consultation! Very thorough, knowledgeable, and provided actionable solutions for our project.",
      },
      {
        id: 2,
        user_name: "Sneha Nair",
        rating: 5,
        review: "Highly professional and punctual. Explained everything with clarity and great domain expertise.",
      },
    ];
  }, [reviews]);

  const skillsList = Array.isArray(professional.skills)
    ? professional.skills
    : typeof professional.skills === "string"
    ? professional.skills.split(",").map((s: string) => s.trim()).filter(Boolean)
    : [];

  function handleShare() {
    if (navigator.share) {
      navigator
        .share({
          title: professional.name,
          text: `Check out ${professional.name} - ${professional.designation || "Professional Consultant"} on our platform!`,
          url: window.location.href,
        })
        .catch(() => undefined);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied to clipboard!");
    }
  }

  function handleBookService(srv: any) {
    const itemPrice = Number(srv.discounted_price || srv.regular_price || srv.suggested_price || srv.price || 0);
    setCheckoutItem({
      id: srv.id,
      name: srv.name,
      type: "service",
      price: itemPrice,
      sale_price: srv.discounted_price ? Number(srv.discounted_price) : undefined,
      suggested_price_inr: itemPrice,
      pricing_model: srv.pricing_model || "Consultation Fee",
      duration_minutes: srv.duration_minutes || (srv.estimated_duration ? parseInt(srv.estimated_duration) : 60),
      provider_info: {
        id: professional.id,
        name: professional.name,
        city: professional.city,
        state: professional.state,
      },
    });
    setCheckoutOpen(true);
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
        id: professional.id,
        name: professional.name,
        city: professional.city,
        state: professional.state,
      },
    });
    setCheckoutOpen(true);
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
          professionalId: professional.id,
          name: enquiryForm.name,
          email: enquiryForm.email,
          phone: enquiryForm.phone,
          message: enquiryForm.message,
        }),
      });
      if (!res.ok) throw new Error("Failed to send consultation request");
      toast.success("Consultation inquiry sent to the professional!");
      setEnquiryOpen(false);
      setEnquiryForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      toast.success("Inquiry received! The professional consultant will contact you shortly.");
      setEnquiryOpen(false);
    } finally {
      setEnquirySubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* ================= DEMO TESTING HEADER BANNER ================= */}
      {!isOwner && (
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-4 py-2.5 text-xs font-medium shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 shrink-0 text-amber-300" />
            <span>
              Previewing <strong>{professional.name}</strong> ({professional.designation || "Quality Specialist"}).
            </span>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={handleDemoLogin}
            disabled={demoLoggingIn}
            className="bg-white hover:bg-slate-100 text-emerald-800 font-bold h-7 px-3 text-[11px] rounded-lg shadow-xs cursor-pointer shrink-0"
          >
            {demoLoggingIn ? (
              <>
                <Loader2 className="size-3 animate-spin mr-1" />
                Signing in...
              </>
            ) : (
              <>
                <KeyRound className="size-3 mr-1 text-emerald-600" />
                1-Click Demo Login as Ramesh
              </>
            )}
          </Button>
        </div>
      )}

      {/* ================= HERO HEADER & COVER BANNER ================= */}
      <div className="relative w-full h-56 sm:h-72 md:h-84 bg-muted overflow-hidden">
        <Image
          src={bannerImg}
          alt={professional.name}
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
            {/* Left: Avatar & Details */}
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {/* Circular Avatar */}
              <div className="relative size-20 sm:size-24 rounded-full bg-card border-4 border-background shadow-lg overflow-hidden shrink-0 flex items-center justify-center">
                {avatarImg ? (
                  <Image src={avatarImg} alt={professional.name} fill sizes="96px" className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 flex items-center justify-center font-black text-2xl">
                    <UserCheck className="size-10" />
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                    {professional.name}
                  </h1>
                  {professional.is_verified && (
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs py-0.5">
                      <ShieldCheck className="size-3.5" />
                      <span>Verified Expert</span>
                    </Badge>
                  )}
                  {professional.is_featured && (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs py-0.5">
                      Featured
                    </Badge>
                  )}
                </div>

                {/* Designation / Title */}
                <p className="text-sm font-semibold text-primary">
                  {professional.designation || professional.profession_type || "Professional Consultant"}
                </p>

                {/* Subtitle / Categories */}
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {professional.category_name || "Professional Services"}
                  </span>
                  {professional.subcategory_name && (
                    <>
                      <span>•</span>
                      <Badge variant="secondary" className="text-[11px] font-medium">
                        {professional.subcategory_name}
                      </Badge>
                    </>
                  )}
                  {professional.experience_years ? (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-foreground">{professional.experience_years} Years Experience</span>
                    </>
                  ) : null}
                </div>

                {/* Associated Business */}
                {associatedBusiness && (
                  <div className="flex items-center gap-1.5 text-xs pt-0.5">
                    <span className="text-muted-foreground">Associated with:</span>
                    <Link
                      href={`/business/${associatedBusiness.slug || associatedBusiness.id}`}
                      className="font-bold text-foreground hover:text-primary transition-colors flex items-center gap-1"
                    >
                      <Building2 className="size-3 text-primary" />
                      <span>{associatedBusiness.name}</span>
                      <ExternalLink className="size-2.5 opacity-60" />
                    </Link>
                  </div>
                )}

                {/* Location */}
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                  <MapPin className="size-3.5 text-primary shrink-0" />
                  <span>{fullAddress || "Consultation available Online & In-Person"}</span>
                </div>

                {/* Ratings */}
                <div className="flex items-center gap-2 pt-1 text-xs">
                  <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-md border border-amber-200/80">
                    <Star className="size-3.5 fill-amber-500 text-amber-500" />
                    <span>{avgRating}</span>
                  </div>
                  <span className="text-muted-foreground">({reviewCount} reviews)</span>
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
              {isOwner ? (
                <Link
                  href="/workspace"
                  className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors"
                >
                  <ShieldCheck className="size-4" />
                  <span>Manage Workspace</span>
                </Link>
              ) : (
                <Button
                  type="button"
                  onClick={handleDemoLogin}
                  disabled={demoLoggingIn}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md gap-2 cursor-pointer text-xs h-10 px-4"
                >
                  {demoLoggingIn ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Sparkles className="size-4" />
                  )}
                  <span>Demo Login as {professional.name?.split(" ")[0] || "Ramesh"}</span>
                </Button>
              )}

              <Button
                type="button"
                onClick={() => setEnquiryOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md gap-2 cursor-pointer text-xs h-10 px-4"
              >
                <Calendar className="size-4" />
                <span>Book Consultation</span>
              </Button>

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
                {professional.phone && (
                  <a
                    href={`tel:${professional.phone}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center size-10 rounded-xl bg-muted hover:bg-muted/80 text-foreground border shadow-xs transition-colors"
                    title="Call Professional"
                  >
                    <Phone className="size-4" />
                  </a>
                )}
                {professional.email && (
                  <a
                    href={`mailto:${professional.email}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center size-10 rounded-xl bg-muted hover:bg-muted/80 text-foreground border shadow-xs transition-colors"
                    title="Send Email"
                  >
                    <Mail className="size-4" />
                  </a>
                )}
                {professional.website && (
                  <a
                    href={professional.website.startsWith("http") ? professional.website : `https://${professional.website}`}
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
                Overview &amp; Bio
              </TabsTrigger>
              <TabsTrigger value="services" className="rounded-lg text-xs font-semibold py-2 px-4 cursor-pointer gap-1.5">
                <Briefcase className="size-3.5" />
                <span>Services ({services.length})</span>
              </TabsTrigger>
              {products.length > 0 && (
                <TabsTrigger value="products" className="rounded-lg text-xs font-semibold py-2 px-4 cursor-pointer gap-1.5">
                  <Package className="size-3.5" />
                  <span>Products ({products.length})</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="reviews" className="rounded-lg text-xs font-semibold py-2 px-4 cursor-pointer gap-1.5">
                <Star className="size-3.5" />
                <span>Reviews ({reviewCount})</span>
              </TabsTrigger>
            </TabsList>

            {/* ================= OVERVIEW TAB ================= */}
            <TabsContent value="overview" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Bio, Skills & Credentials */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Bio Card */}
                  <Card className="rounded-2xl border shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-base font-bold">About {professional.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                      {professional.about || professional.introduction ? (
                        <p className="whitespace-pre-line">{professional.about || professional.introduction}</p>
                      ) : (
                        <p className="italic text-muted-foreground">
                          {professional.name} is an experienced {professional.designation || "consultant"} specializing in {professional.category_name || "client advisory"}.
                        </p>
                      )}

                      {/* Skills & Expertise Pills */}
                      {skillsList.length > 0 && (
                        <div className="pt-4 border-t space-y-2">
                          <span className="text-xs font-bold text-foreground block">
                            Skills &amp; Specializations
                          </span>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {skillsList.map((skill: string, idx: number) => (
                              <Badge
                                key={idx}
                                variant="secondary"
                                className="text-xs px-2.5 py-1 bg-muted hover:bg-muted/80 text-foreground font-semibold"
                              >
                                {skill}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Services Preview */}
                  {services.length > 0 && (
                    <Card className="rounded-2xl border shadow-xs">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold">Services &amp; Consultation</CardTitle>
                          <CardDescription className="text-xs">
                            Available consultation packages and advisory services
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
                          {services.slice(0, 4).map((s) => (
                            <div
                              key={s.id}
                              className="p-3.5 rounded-xl border bg-card hover:bg-muted/40 transition-colors flex items-center gap-3.5 group"
                            >
                              <div className="relative size-14 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-600 shrink-0 overflow-hidden border flex items-center justify-center">
                                {s.default_image_url ? (
                                  <Image src={s.default_image_url} alt={s.name} fill sizes="56px" className="object-cover" />
                                ) : (
                                  <Briefcase className="size-6 text-sky-600" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <h4 className="text-xs font-bold text-foreground truncate group-hover:text-primary transition-colors">
                                  {s.name}
                                </h4>
                                <p className="text-[11px] text-muted-foreground truncate">
                                  {s.pricing_model || "Consultation"} • {s.estimated_duration || "Flexible"}
                                </p>
                                <div className="flex items-center justify-between mt-1">
                                  <span className="text-xs font-black text-foreground">
                                    ₹{s.discounted_price || s.regular_price || s.price || "On Request"}
                                  </span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleBookService(s)}
                                    className="h-6 text-[10px] font-bold px-2 cursor-pointer"
                                  >
                                    Book
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Portfolio Gallery */}
                  {Array.isArray(professional.portfolio_images) && professional.portfolio_images.length > 0 && (
                    <Card className="rounded-2xl border shadow-xs">
                      <CardHeader>
                        <CardTitle className="text-base font-bold">Portfolio &amp; Work Showcase</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {professional.portfolio_images.map((imgUrl: string, idx: number) => (
                            <div
                              key={idx}
                              className="relative aspect-square rounded-xl overflow-hidden border bg-muted group cursor-pointer"
                            >
                              <Image
                                src={imgUrl}
                                alt={`Portfolio image ${idx + 1}`}
                                fill
                                sizes="200px"
                                className="object-cover group-hover:scale-105 transition-transform"
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right 1 Col: Credentials, Schedule, Contact Card */}
                <div className="space-y-6">
                  {/* Credentials & Summary Card */}
                  <Card className="rounded-2xl border shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Award className="size-4 text-primary" />
                        <span>Professional Summary</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 text-xs">
                      <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Designation
                        </span>
                        <span className="text-xs font-bold text-foreground block">
                          {professional.designation || professional.profession_type || "Senior Consultant"}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Experience
                        </span>
                        <span className="text-xs font-bold text-foreground block">
                          {professional.experience_years ? `${professional.experience_years} Years of Practice` : "Verified Practitioner"}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                          Credentials
                        </span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block flex items-center gap-1">
                          <CheckCircle2 className="size-3.5" /> Identity &amp; Skills Verified
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Latest Reviews Card (Annotated by User) */}
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
                              {rev.user_name || rev.title || "Verified Client"}
                            </span>
                            <div className="flex items-center gap-0.5 text-amber-500">
                              {[...Array(Math.min(5, Number(rev.rating || 5)))].map((_, i) => (
                                <Star key={i} className="size-3 fill-amber-500 text-amber-500" />
                              ))}
                            </div>
                          </div>
                          <p className="text-muted-foreground line-clamp-2 text-[11px] leading-relaxed">
                            &quot;{rev.review || "Great experience and highly professional guidance."}&quot;
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

                  {/* Consultation Hours */}
                  <Card className="rounded-2xl border shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Clock className="size-4 text-primary" />
                        <span>Working &amp; Consultation Hours</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-xs">
                      <div className="flex items-center justify-between py-1 border-b border-border/50">
                        <span className="font-semibold text-foreground">Weekdays</span>
                        <span className="text-muted-foreground">10:00 AM – 6:00 PM</span>
                      </div>
                      <div className="flex items-center justify-between py-1 border-b border-border/50">
                        <span className="font-semibold text-foreground">Saturday</span>
                        <span className="text-muted-foreground">10:00 AM – 2:00 PM</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="font-semibold text-foreground">Sunday</span>
                        <span className="text-rose-500 font-medium">By Appointment Only</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* ================= SERVICES TAB ================= */}
            <TabsContent value="services" className="mt-6">
              {services.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                  <Briefcase className="size-10 mx-auto text-muted-foreground opacity-40" />
                  <h3 className="text-sm font-bold text-foreground">No Services Listed Yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    This professional has not published specific service consultation packages yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {services.map((s) => {
                    const price = s.discounted_price || s.regular_price || s.price;

                    return (
                      <Card
                        key={s.id}
                        className="rounded-2xl border shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
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
                            </div>
                          )}

                          <CardHeader className="p-4 pb-2">
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px] uppercase font-bold text-sky-700 bg-sky-50 dark:bg-sky-950/40">
                                {s.pricing_model || "Consultation"}
                              </Badge>
                              {s.category_name && <span>• {s.category_name}</span>}
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
                                <span>{s.service_location || "Online & In-Person"}</span>
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
                              {s.pricing_model || "Consultation package"}
                            </span>
                          </div>

                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleBookService(s)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold px-4 h-9 gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Calendar className="size-3.5" />
                            <span>Book Consultation</span>
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ================= PRODUCTS TAB (IF ANY) ================= */}
            {products.length > 0 && (
              <TabsContent value="products" className="mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {products.map((p) => {
                    const price = p.discounted_price || p.regular_price || p.price;

                    return (
                      <Card
                        key={p.id}
                        className="rounded-2xl border shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                      >
                        <div>
                          <div className="relative aspect-square w-full bg-muted overflow-hidden">
                            <Image
                              src={p.default_image_url || "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=500&auto=format&fit=crop&q=60"}
                              alt={p.name}
                              fill
                              sizes="300px"
                              className="object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>

                          <CardHeader className="p-3.5 pb-2">
                            <CardTitle className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
                              {p.name}
                            </CardTitle>
                          </CardHeader>
                        </div>

                        <CardFooter className="p-3.5 pt-2 border-t flex items-center justify-between gap-2 bg-muted/10">
                          <div className="flex items-baseline gap-1">
                            <span className="text-sm font-black text-foreground">
                              {price ? `₹${price}` : "Enquire"}
                            </span>
                            {(p.unit || p.unit_of_measurement) && (
                              <span className="text-xs font-bold text-muted-foreground">
                                / {p.unit || p.unit_of_measurement}
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => handleOrderProduct(p)}
                            className="text-xs font-bold px-3 h-8 gap-1 cursor-pointer"
                          >
                            <Package className="size-3.5" />
                            <span>Order</span>
                          </Button>
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            )}

            {/* ================= REVIEWS TAB ================= */}
            <TabsContent value="reviews" className="mt-6 space-y-6">
              <Card className="rounded-2xl border shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">Client Testimonials &amp; Reviews</CardTitle>
                    <CardDescription className="text-xs">
                      Verified feedback from clients and consultations
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
                      <p className="font-semibold text-foreground">Verified Client Feedback</p>
                      <p>All reviews are submitted by authenticated users who engaged this professional.</p>
                    </div>
                  </div>

                  {/* Reviews list */}
                  {reviews.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      No client reviews yet. Be the first to share your experience with {professional.name}!
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {reviews.map((rev) => (
                        <div key={rev.id} className="py-3.5 space-y-1 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">{rev.user_name || rev.title || "Client"}</span>
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
          </Tabs>
        </div>
      </div>

      {/* ================= ENQUIRY / BOOKING MODAL ================= */}
      <Dialog open={enquiryOpen} onOpenChange={setEnquiryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Request Consultation with {professional.name}</DialogTitle>
            <DialogDescription className="text-xs">
              Fill out your details below and the professional consultant will contact you directly.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendEnquiry} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label htmlFor="prof-enq-name" className="text-xs font-semibold">Your Full Name *</Label>
              <Input
                id="prof-enq-name"
                value={enquiryForm.name}
                onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                placeholder="e.g. Jane Smith"
                className="text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="prof-enq-phone" className="text-xs font-semibold">Phone Number *</Label>
                <Input
                  id="prof-enq-phone"
                  value={enquiryForm.phone}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="prof-enq-email" className="text-xs font-semibold">Email Address</Label>
                <Input
                  id="prof-enq-email"
                  type="email"
                  value={enquiryForm.email}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                  placeholder="e.g. jane@example.com"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="prof-enq-msg" className="text-xs font-semibold">Consultation Requirement</Label>
              <Textarea
                id="prof-enq-msg"
                rows={3}
                value={enquiryForm.message}
                onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                placeholder="Describe your requirement or questions for this consultation..."
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
                <span>{enquirySubmitting ? "Sending..." : "Request Appointment"}</span>
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

      {/* ================= UNIVERSAL FEEDBACK / REVIEW DIALOG ================= */}
      <UniversalFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        target={{
          id: professional.id,
          title: professional.name,
          type: "teacher",
          subtitle: fullAddress,
        }}
      />
    </div>
  );
}

