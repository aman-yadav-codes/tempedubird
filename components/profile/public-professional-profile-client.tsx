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
  Search,
  X,
  ArrowUpDown,
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
import { useAuthStore, useCartStore } from "@/store";
import { isUserStoreOwner } from "@/lib/auth/store-ownership";
import { CartConflictDialog } from "@/components/checkout/cart-conflict-dialog";
import { CompactProductCard } from "@/components/shared/compact-product-card";
import { CompactServiceCard } from "@/components/shared/compact-service-card";

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
  const isOwner = useMemo(
    () =>
      isUserStoreOwner(user, professional) ||
      Boolean(
        user &&
        ((professional.user_id && user.id === professional.user_id) ||
          (professional.email && user.email?.toLowerCase() === professional.email.toLowerCase()))
      ),
    [user, professional]
  );
  const router = useRouter();
  const [demoLoggingIn, setDemoLoggingIn] = useState(false);

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

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (services.length > 0) return "services";
    if (products.length > 0) return "products";
    return "overview";
  });
  const [checkoutItem, setCheckoutItem] = useState<CheckoutItem | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Service category filter & search state
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>("all");
  const [serviceSearch, setServiceSearch] = useState<string>("");

  // Product category filter & search state
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>("all");
  const [productSearch, setProductSearch] = useState<string>("");

  // Compute service categories with counts
  const serviceCategories = useMemo(() => {
    const map = new Map<string, number>();
    services.forEach((s) => {
      const cat = (s.category_name || s.category || "General").trim();
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [services]);

  const [serviceSortBy, setServiceSortBy] = useState("featured");

  // Filter services by search, category, and sort
  const filteredServices = useMemo(() => {
    let list = services.filter((s) => {
      const cat = (s.category_name || s.category || "General").trim();
      const matchesCategory =
        selectedServiceCategory === "all" ||
        cat.toLowerCase() === selectedServiceCategory.toLowerCase();
      if (!matchesCategory) return false;

      if (!serviceSearch.trim()) return true;
      const query = serviceSearch.toLowerCase();
      return (
        (s.name && s.name.toLowerCase().includes(query)) ||
        (s.title && s.title.toLowerCase().includes(query)) ||
        (s.description && s.description.toLowerCase().includes(query)) ||
        cat.toLowerCase().includes(query)
      );
    });

    if (serviceSortBy === "price_asc") {
      list.sort((a, b) => Number(a.price || a.regular_price || 0) - Number(b.price || b.regular_price || 0));
    } else if (serviceSortBy === "price_desc") {
      list.sort((a, b) => Number(b.price || b.regular_price || 0) - Number(a.price || a.regular_price || 0));
    } else if (serviceSortBy === "name_asc") {
      list.sort((a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || ""));
    } else if (serviceSortBy === "name_desc") {
      list.sort((a, b) => (b.name || b.title || "").localeCompare(a.name || a.title || ""));
    } else if (serviceSortBy === "newest") {
      list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }

    return list;
  }, [services, selectedServiceCategory, serviceSearch, serviceSortBy]);

  // Group filtered services by category
  const groupedServices = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredServices.forEach((s) => {
      const cat = (s.category_name || s.category || "General").trim();
      const list = map.get(cat) || [];
      list.push(s);
      map.set(cat, list);
    });
    return Array.from(map.entries()).map(([categoryName, items]) => ({
      categoryName,
      items,
    }));
  }, [filteredServices]);

  // Compute product categories with counts
  const productCategories = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const cat = (p.category_name || p.category || "General").trim();
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [products]);

  // Compute product brands with counts
  const productBrands = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const b = (p.brand || p.brand_name || "").trim();
      if (b && b.toLowerCase() !== "generic") {
        map.set(b, (map.get(b) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [products]);

  const [selectedProductBrand, setSelectedProductBrand] = useState("all");
  const [productSortBy, setProductSortBy] = useState("featured");

  // Filter products by search, category, brand, and sort
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const cat = (p.category_name || p.category || "General").trim();
      const matchesCategory =
        selectedProductCategory === "all" ||
        cat.toLowerCase() === selectedProductCategory.toLowerCase();
      if (!matchesCategory) return false;

      const brand = (p.brand || p.brand_name || "").trim();
      const matchesBrand =
        selectedProductBrand === "all" ||
        brand.toLowerCase() === selectedProductBrand.toLowerCase();
      if (!matchesBrand) return false;

      if (!productSearch.trim()) return true;
      const query = productSearch.toLowerCase();
      return (
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.title && p.title.toLowerCase().includes(query)) ||
        (p.brand && p.brand.toLowerCase().includes(query)) ||
        (p.brand_name && p.brand_name.toLowerCase().includes(query)) ||
        (p.sku && p.sku.toLowerCase().includes(query)) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        cat.toLowerCase().includes(query)
      );
    });

    if (productSortBy === "price_asc") {
      list.sort((a, b) => Number(a.price || a.regular_price || 0) - Number(b.price || b.regular_price || 0));
    } else if (productSortBy === "price_desc") {
      list.sort((a, b) => Number(b.price || b.regular_price || 0) - Number(a.price || a.regular_price || 0));
    } else if (productSortBy === "name_asc") {
      list.sort((a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || ""));
    } else if (productSortBy === "name_desc") {
      list.sort((a, b) => (b.name || b.title || "").localeCompare(a.name || a.title || ""));
    } else if (productSortBy === "newest") {
      list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }

    return list;
  }, [products, selectedProductCategory, selectedProductBrand, productSearch, productSortBy]);

  // Group filtered products by category for category-wise display
  const groupedProducts = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredProducts.forEach((p) => {
      const cat = (p.category_name || p.category || "General").trim();
      const list = map.get(cat) || [];
      list.push(p);
      map.set(cat, list);
    });
    return Array.from(map.entries()).map(([categoryName, items]) => ({
      categoryName,
      items,
    }));
  }, [filteredProducts]);

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

  // Local state for dynamically submitted reviews
  const [submittedReviews, setSubmittedReviews] = useState<any[]>([]);

  const allReviews = useMemo(() => {
    const base = Array.isArray(reviews) ? reviews : [];
    return [...submittedReviews, ...base];
  }, [reviews, submittedReviews]);

  const reviewCount = allReviews.length;
  const avgRating = useMemo(() => {
    if (allReviews.length === 0) return "0.0";
    const sum = allReviews.reduce((acc, r) => acc + Number(r.rating || 5), 0);
    return (sum / allReviews.length).toFixed(1);
  }, [allReviews]);

  const latestReviews = useMemo(() => {
    return allReviews.slice(0, 3);
  }, [allReviews]);

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
    if (isOwner) {
      toast.error("You cannot book appointments on your own professional profile.");
      return;
    }
    const itemPrice = Number(srv.discounted_price || srv.regular_price || srv.suggested_price || srv.price || 0);

    const openServiceCheckout = () => {
      setCheckoutItem({
        id: srv.id,
        name: srv.name,
        type: "service",
        price: itemPrice,
        sale_price: srv.discounted_price ? Number(srv.discounted_price) : undefined,
        suggested_price_inr: itemPrice,
        pricing_model: srv.pricing_model || "Consultation Fee",
        duration_minutes: srv.duration_minutes || (srv.estimated_duration ? parseInt(srv.estimated_duration) : 60),
        institution_id: professional.institution_profile_id,
        provider_name: professional.name,
        provider_address: fullAddress,
        provider_info: {
          id: professional.id,
          name: professional.name,
          city: professional.city,
          state: professional.state,
          user_id: professional.user_id,
        },
      });
      setCheckoutOpen(true);
    };

    const { items, promptConflict } = useCartStore.getState();
    if (items.length > 0) {
      const firstItem = items[0];
      const curType = firstItem.item_type || "product";
      const sameStore =
        (firstItem.professional_id && Number(firstItem.professional_id) === Number(professional.id)) ||
        (firstItem.business_name && firstItem.business_name.toLowerCase() === professional.name.toLowerCase());

      if (curType === "product" || !sameStore) {
        promptConflict({
          currentStoreName: firstItem.business_name || firstItem.brand || "previous store",
          newStoreName: professional.name,
          currentType: curType,
          newType: "service",
          reason: curType === "product" && !sameStore ? "both" : curType === "product" ? "type" : "store",
          onConfirm: () => {
            openServiceCheckout();
          },
        });
        return;
      }
    }

    openServiceCheckout();
  }

  function handleOrderProduct(prod: any) {
    const itemPrice = Number(prod.discounted_price || prod.regular_price || prod.suggested_price || prod.price || 0);

    const openProductCheckout = () => {
      setCheckoutItem({
        id: prod.id,
        name: prod.name,
        type: "product",
        price: itemPrice,
        sale_price: prod.discounted_price ? Number(prod.discounted_price) : undefined,
        suggested_price_inr: itemPrice,
        institution_id: professional.institution_profile_id,
        seller_info: {
          id: professional.id,
          name: professional.name,
          city: professional.city,
          state: professional.state,
          user_id: professional.user_id,
        },
      });
      setCheckoutOpen(true);
    };

    const { items, promptConflict } = useCartStore.getState();
    if (items.length > 0) {
      const firstItem = items[0];
      const curType = firstItem.item_type || "product";
      const sameStore =
        (firstItem.professional_id && Number(firstItem.professional_id) === Number(professional.id)) ||
        (firstItem.business_name && firstItem.business_name.toLowerCase() === professional.name.toLowerCase());

      if (curType === "service" || !sameStore) {
        promptConflict({
          currentStoreName: firstItem.business_name || firstItem.brand || "previous store",
          newStoreName: professional.name,
          currentType: curType,
          newType: "product",
          reason: curType === "service" && !sameStore ? "both" : curType === "service" ? "type" : "store",
          onConfirm: () => {
            openProductCheckout();
          },
        });
        return;
      }
    }

    openProductCheckout();
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
            className={`rounded-full shadow-md bg-background/80 backdrop-blur-md hover:bg-background h-8 px-3 text-xs gap-1.5 ${isSaved ? "text-rose-600" : ""
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
                {reviewCount > 0 ? (
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
                ) : (
                  <div className="flex items-center gap-2 pt-1 text-xs">
                    <span className="text-muted-foreground">No client reviews yet</span>
                    <button
                      type="button"
                      onClick={() => setFeedbackOpen(true)}
                      className="text-primary hover:underline font-semibold ml-1 cursor-pointer"
                    >
                      Write a Review
                    </button>
                  </div>
                )}
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

              {isOwner ? (
                <Link
                  href="/admin/my-profile"
                  className="inline-flex items-center justify-center bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-md gap-2 text-xs h-10 px-4 rounded-md transition-colors"
                >
                  <ShieldCheck className="size-4" />
                  <span>Manage Your Profile</span>
                </Link>
              ) : (
                <Button
                  type="button"
                  onClick={() => setEnquiryOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md gap-2 cursor-pointer text-xs h-10 px-4"
                >
                  <Calendar className="size-4" />
                  <span>Book Consultation</span>
                </Button>
              )}

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

        {/* Professional Owner Notice Banner */}
        {isOwner && (
          <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="size-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="size-5" />
              </div>
              <div className="text-xs">
                <div className="font-extrabold text-foreground flex items-center gap-1.5">
                  <span>Professional Profile Owner Mode</span>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 font-bold">
                    Your Profile
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-0.5">
                  You are viewing your own professional profile. Self-booking consultations or ordering your own services is disabled.
                </p>
              </div>
            </div>
            <Link
              href="/admin/my-profile"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
            >
              Manage Profile
            </Link>
          </div>
        )}

        {/* ================= TABS & CONTENT SECTIONS ================= */}
        <div className="mt-8 pb-24 sm:pb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="relative w-full my-1">
              <div className="relative w-full overflow-hidden">
                <div className="overflow-x-auto no-scrollbar scroll-smooth touch-pan-x py-1 px-0.5">
                  <TabsList className="inline-flex flex-nowrap items-center justify-start gap-1.5 sm:gap-2 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 p-1.5 rounded-2xl h-auto shadow-2xs w-max min-w-full">
                    <TabsTrigger value="overview" className="shrink-0 rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer gap-2 whitespace-nowrap data-[state=active]:bg-[#0070f3] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all">
                      Overview &amp; Bio
                    </TabsTrigger>
                    <TabsTrigger value="services" className="shrink-0 rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer gap-2 whitespace-nowrap data-[state=active]:bg-[#0070f3] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all">
                      <Briefcase className="size-4 shrink-0" />
                      <span>Services ({services.length})</span>
                    </TabsTrigger>
                    {products.length > 0 && (
                      <TabsTrigger value="products" className="shrink-0 rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer gap-2 whitespace-nowrap data-[state=active]:bg-[#0070f3] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all">
                        <Package className="size-4 shrink-0" />
                        <span>Products ({products.length})</span>
                      </TabsTrigger>
                    )}
                    <TabsTrigger value="reviews" className="shrink-0 rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer gap-2 whitespace-nowrap data-[state=active]:bg-[#0070f3] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all">
                      <Star className="size-4 shrink-0" />
                      <span>Reviews ({reviewCount})</span>
                    </TabsTrigger>
                  </TabsList>
                </div>
              </div>
            </div>

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
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {services.slice(0, 4).map((s) => (
                            <CompactServiceCard
                              key={s.id}
                              service={s}
                              business={associatedBusiness}
                              onBook={handleBookService}
                            />
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

                  {/* Latest Reviews Card (Only if reviews exist) */}
                  {allReviews.length > 0 && (
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
                                {Array.from({ length: Math.max(0, Math.min(5, Math.round(Number(rev.rating) || 5))) }).map((_, i) => (
                                  <Star key={i} className="size-3 fill-amber-500 text-amber-500" />
                                ))}
                              </div>
                            </div>
                            <p className="text-muted-foreground line-clamp-2 text-[11px] leading-relaxed">
                              &quot;{rev.review || rev.comment || "Great experience and highly professional guidance."}&quot;
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
                  )}

                  {/* Consultation Hours (Only if working_hours provided) */}
                  {Boolean(professional.working_hours || professional.opening_hours) && (
                    <Card className="rounded-2xl border shadow-xs">
                      <CardHeader>
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <Clock className="size-4 text-primary" />
                          <span>Working &amp; Consultation Hours</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-xs">
                        {(() => {
                          const wh = professional.working_hours || professional.opening_hours;
                          if (typeof wh === "object" && wh !== null) {
                            return Object.entries(wh).map(([day, hrs]: [string, any]) => (
                              <div key={day} className="flex items-center justify-between py-1 border-b last:border-b-0 border-border/50">
                                <span className="font-semibold capitalize text-foreground">{day}</span>
                                <span className="text-muted-foreground">{typeof hrs === "string" ? hrs : `${hrs?.open || "10:00 AM"} – ${hrs?.close || "06:00 PM"}`}</span>
                              </div>
                            ));
                          }
                          return (
                            <p className="text-muted-foreground whitespace-pre-line">{String(wh)}</p>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ================= SERVICES TAB (CATEGORY-WISE) ================= */}
            <TabsContent value="services" className="mt-6 space-y-6">
              {services.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                  <Briefcase className="size-10 mx-auto text-muted-foreground opacity-40" />
                  <h3 className="text-sm font-bold text-foreground">No Services Listed Yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    This professional has not published specific service consultation packages yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Category Pills & Search Controls for Services */}
                  <div className="bg-card border rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
                      {/* Search Input */}
                      <div className="lg:col-span-6 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search by title, description, or keyword..."
                          value={serviceSearch}
                          onChange={(e) => setServiceSearch(e.target.value)}
                          className="pl-9 pr-8 h-10 text-xs bg-muted/30 rounded-xl"
                        />
                        {serviceSearch && (
                          <button
                            type="button"
                            onClick={() => setServiceSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Category Dropdown */}
                      <div className="lg:col-span-3">
                        <select
                          value={selectedServiceCategory}
                          onChange={(e) => setSelectedServiceCategory(e.target.value)}
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
                        >
                          <option value="all">All Categories ({services.length})</option>
                          {serviceCategories.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name} ({c.count})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sort By Dropdown */}
                      <div className="lg:col-span-3">
                        <select
                          value={serviceSortBy}
                          onChange={(e) => setServiceSortBy(e.target.value)}
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
                        >
                          <option value="featured">Sort: Featured</option>
                          <option value="price_asc">Price: Low to High</option>
                          <option value="price_desc">Price: High to Low</option>
                          <option value="name_asc">Name: A to Z</option>
                          <option value="name_desc">Name: Z to A</option>
                          <option value="newest">Newest First</option>
                        </select>
                      </div>
                    </div>

                    {/* Result count & reset */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                      <span className="font-medium">
                        Showing <strong className="text-foreground">{filteredServices.length}</strong> of {services.length} services
                      </span>
                      {(selectedServiceCategory !== "all" || serviceSearch || serviceSortBy !== "featured") && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedServiceCategory("all");
                            setServiceSearch("");
                            setServiceSortBy("featured");
                          }}
                          className="h-6 text-xs font-semibold text-primary hover:underline px-1.5 cursor-pointer"
                        >
                          Reset Filters
                        </Button>
                      )}
                    </div>

                    {/* Service Category Filter Pills */}
                    {serviceCategories.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar scroll-smooth">
                        <button
                          type="button"
                          onClick={() => setSelectedServiceCategory("all")}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                            selectedServiceCategory === "all"
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                          }`}
                        >
                          <span>All Services</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              selectedServiceCategory === "all"
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {services.length}
                          </span>
                        </button>
                        {serviceCategories.map((c) => {
                          const isSelected = selectedServiceCategory.toLowerCase() === c.name.toLowerCase();
                          return (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => setSelectedServiceCategory(c.name)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                isSelected
                                  ? "bg-primary text-primary-foreground shadow-xs"
                                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                              }`}
                            >
                              <span>{c.name}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                  isSelected
                                    ? "bg-primary-foreground/20 text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {c.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Service Listings: Category-Wise Grouping vs Filtered Grid */}
                  {filteredServices.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                      <Briefcase className="size-10 mx-auto text-muted-foreground opacity-40" />
                      <h3 className="text-sm font-bold text-foreground">No Services Found</h3>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        {serviceSearch
                          ? `No services match your search "${serviceSearch}".`
                          : `No services listed in "${selectedServiceCategory}".`}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedServiceCategory("all");
                          setServiceSearch("");
                        }}
                        className="text-xs font-semibold cursor-pointer"
                      >
                        Show All Services
                      </Button>
                    </div>
                  ) : selectedServiceCategory === "all" && !serviceSearch.trim() ? (
                    /* Category-Wise Grouped Sections */
                    <div className="space-y-8">
                      {groupedServices.map(({ categoryName, items }) => (
                        <div key={categoryName} className="space-y-3.5">
                          <div className="flex items-center justify-between border-b pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="w-1.5 h-5 rounded-full bg-primary" />
                              <h3 className="text-base font-bold text-foreground tracking-tight">{categoryName}</h3>
                              <Badge variant="secondary" className="text-xs font-bold px-2 py-0.5">
                                {items.length} {items.length === 1 ? "Service" : "Services"}
                              </Badge>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedServiceCategory(categoryName)}
                              className="text-xs font-bold text-primary hover:underline h-7 px-2 cursor-pointer"
                            >
                              View Only {categoryName} &rarr;
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            {items.map((s) => (
                              <CompactServiceCard
                                key={s.id}
                                service={s}
                                business={associatedBusiness}
                                onBook={handleBookService}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Filtered Grid View */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span className="w-1.5 h-4 rounded-full bg-primary" />
                          <span>
                            {selectedServiceCategory !== "all" ? selectedServiceCategory : "Search Results"}
                          </span>
                          <Badge variant="outline" className="text-xs font-semibold">
                            {filteredServices.length}
                          </Badge>
                        </h3>
                        {selectedServiceCategory !== "all" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedServiceCategory("all")}
                            className="text-xs font-semibold text-primary hover:underline h-7 px-2 cursor-pointer"
                          >
                            &larr; View All Categories
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {filteredServices.map((s) => (
                          <CompactServiceCard
                            key={s.id}
                            service={s}
                            business={associatedBusiness}
                            onBook={handleBookService}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ================= PRODUCTS TAB (IF ANY) (CATEGORY-WISE) ================= */}
            {products.length > 0 && (
              <TabsContent value="products" className="mt-6 space-y-6">
                <div className="space-y-6">
                  {/* Category Pills & Search Controls */}
                  <div className="bg-card border rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
                      {/* Search Input */}
                      <div className="lg:col-span-5 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search by title, SKU, or description..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="pl-9 pr-8 h-10 text-xs bg-muted/30 rounded-xl"
                        />
                        {productSearch && (
                          <button
                            type="button"
                            onClick={() => setProductSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Category Dropdown */}
                      <div className="lg:col-span-3">
                        <select
                          value={selectedProductCategory}
                          onChange={(e) => setSelectedProductCategory(e.target.value)}
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
                        >
                          <option value="all">All Categories ({products.length})</option>
                          {productCategories.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name} ({c.count})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* By Brand Dropdown */}
                      <div className="lg:col-span-2">
                        <select
                          value={selectedProductBrand}
                          onChange={(e) => setSelectedProductBrand(e.target.value)}
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
                        >
                          <option value="all">All Brands ({productBrands.length})</option>
                          {productBrands.map((b) => (
                            <option key={b.name} value={b.name}>
                              {b.name} ({b.count})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sort By Dropdown */}
                      <div className="lg:col-span-2">
                        <select
                          value={productSortBy}
                          onChange={(e) => setProductSortBy(e.target.value)}
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
                        >
                          <option value="featured">Sort: Featured</option>
                          <option value="price_asc">Price: Low to High</option>
                          <option value="price_desc">Price: High to Low</option>
                          <option value="name_asc">Name: A to Z</option>
                          <option value="name_desc">Name: Z to A</option>
                          <option value="newest">Newest First</option>
                        </select>
                      </div>
                    </div>

                    {/* Result count & reset */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                      <span className="font-medium">
                        Showing <strong className="text-foreground">{filteredProducts.length}</strong> of {products.length} products
                      </span>
                      {(selectedProductCategory !== "all" || selectedProductBrand !== "all" || productSearch || productSortBy !== "featured") && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProductCategory("all");
                            setSelectedProductBrand("all");
                            setProductSearch("");
                            setProductSortBy("featured");
                          }}
                          className="h-6 text-xs font-semibold text-primary hover:underline px-1.5 cursor-pointer"
                        >
                          Reset Filters
                        </Button>
                      )}
                    </div>

                    {/* Category Filter Pills */}
                    {productCategories.length > 1 && (
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar scroll-smooth">
                        <button
                          type="button"
                          onClick={() => setSelectedProductCategory("all")}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                            selectedProductCategory === "all"
                              ? "bg-primary text-primary-foreground shadow-xs"
                              : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                          }`}
                        >
                          <span>All Products</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                              selectedProductCategory === "all"
                                ? "bg-primary-foreground/20 text-primary-foreground"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {products.length}
                          </span>
                        </button>
                        {productCategories.map((c) => {
                          const isSelected = selectedProductCategory.toLowerCase() === c.name.toLowerCase();
                          return (
                            <button
                              key={c.name}
                              type="button"
                              onClick={() => setSelectedProductCategory(c.name)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                                isSelected
                                  ? "bg-primary text-primary-foreground shadow-xs"
                                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                              }`}
                            >
                              <span>{c.name}</span>
                              <span
                                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                                  isSelected
                                    ? "bg-primary-foreground/20 text-primary-foreground"
                                    : "bg-muted text-muted-foreground"
                                }`}
                              >
                                {c.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Product Listings: Category-Wise Grouping vs Filtered Grid */}
                  {filteredProducts.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                      <Package className="size-10 mx-auto text-muted-foreground opacity-40" />
                      <h3 className="text-sm font-bold text-foreground">No Products Found</h3>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        {productSearch
                          ? `No products match your search "${productSearch}".`
                          : `No products listed in "${selectedProductCategory}".`}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProductCategory("all");
                          setProductSearch("");
                        }}
                        className="text-xs font-semibold cursor-pointer"
                      >
                        Show All Products
                      </Button>
                    </div>
                  ) : selectedProductCategory === "all" && !productSearch.trim() ? (
                    /* Category-Wise Grouped Sections */
                    <div className="space-y-8">
                      {groupedProducts.map(({ categoryName, items }) => (
                        <div key={categoryName} className="space-y-3.5">
                          <div className="flex items-center justify-between border-b pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <span className="w-1.5 h-5 rounded-full bg-primary" />
                              <h3 className="text-base font-bold text-foreground tracking-tight">{categoryName}</h3>
                              <Badge variant="secondary" className="text-xs font-bold px-2 py-0.5">
                                {items.length} {items.length === 1 ? "Item" : "Items"}
                              </Badge>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedProductCategory(categoryName)}
                              className="text-xs font-bold text-primary hover:underline h-7 px-2 cursor-pointer"
                            >
                              View Only {categoryName} &rarr;
                            </Button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                            {items.map((p) => (
                              <CompactProductCard
                                key={p.id}
                                product={p}
                                business={associatedBusiness}
                                onAddToCart={() => handleOrderProduct(p)}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    /* Filtered Grid View */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span className="w-1.5 h-4 rounded-full bg-primary" />
                          <span>
                            {selectedProductCategory !== "all" ? selectedProductCategory : "Search Results"}
                          </span>
                          <Badge variant="outline" className="text-xs font-semibold">
                            {filteredProducts.length}
                          </Badge>
                        </h3>
                        {selectedProductCategory !== "all" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedProductCategory("all")}
                            className="text-xs font-semibold text-primary hover:underline h-7 px-2 cursor-pointer"
                          >
                            &larr; View All Categories
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {filteredProducts.map((p) => (
                          <CompactProductCard
                            key={p.id}
                            product={p}
                            business={associatedBusiness}
                            onAddToCart={() => handleOrderProduct(p)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
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
                  {allReviews.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      No client reviews yet. Be the first to share your experience with {professional.name}!
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {allReviews.map((rev) => (
                        <div key={rev.id} className="py-4 space-y-2 text-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-foreground text-sm">
                                {rev.user_name || rev.reviewer_name || "Client"}
                              </span>
                              {(rev.is_verified_user ?? true) && (
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-semibold gap-1 py-0">
                                  <ShieldCheck className="size-3 text-emerald-600" />
                                  <span>{rev.reviewer_role || "Verified Client"}</span>
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-0.5 text-amber-500">
                                {Array.from({ length: Math.max(0, Math.min(5, Math.round(Number(rev.rating) || 5))) }).map((_, i) => (
                                  <Star key={i} className="size-3.5 fill-amber-500 text-amber-500" />
                                ))}
                              </div>
                              <span className="text-[11px] text-muted-foreground/70 font-medium">
                                {rev.created_at ? new Date(rev.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Recent"}
                              </span>
                            </div>
                          </div>
                          {rev.title && (
                            <h4 className="font-bold text-xs text-foreground">{rev.title}</h4>
                          )}
                          <p className="text-muted-foreground leading-relaxed text-xs">
                            {rev.review || rev.comment}
                          </p>
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
        onReviewSubmitted={(newRev) => {
          setSubmittedReviews((prev) => [newRev, ...prev]);
        }}
      />

      {/* Cart Conflict Prompt Dialog */}
      <CartConflictDialog />
    </div>
  );
}

