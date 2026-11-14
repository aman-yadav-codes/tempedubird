"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useUserLocation } from "@/hooks/use-user-location";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Search,
  MapPin,
  Building2,
  Briefcase,
  Package,
  Layers,
  Phone,
  MessageCircle,
  Mail,
  Globe,
  Navigation,
  Heart,
  Star,
  ShieldCheck,
  AlertTriangle,
  Send,
  Loader2,
  Sparkles,
  Filter,
  CheckCircle2,
  X,
  ExternalLink,
  Calendar,
  Clock,
  IndianRupee,
  DollarSign,
  LocateFixed,
  ShoppingCart,
  Plus,
  Minus,
} from "lucide-react";
import { useAuthStore, useCartStore } from "@/store";
import { toast } from "sonner";
import Link from "next/link";
import { buildBusinessSeoUrl, buildProfessionalSeoUrl } from "@/lib/utils/seo-slug";
import { OrderCheckoutDialog, CheckoutItem } from "@/components/checkout/order-checkout-dialog";
import { CartDrawer } from "@/components/checkout/cart-drawer";
import { CartFloatingButton } from "@/components/checkout/cart-floating-button";
import { ServiceBookingDialog, BookingServiceItem } from "@/components/checkout/service-booking-dialog";

interface DiscoveryItem {
  id: number;
  resultType: "business" | "professional" | "product" | "service";
  name: string;
  slug?: string;
  business_type?: string;
  profession_type?: string;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  locality?: string | null;
  address?: string | null;
  postal_code?: string | null;
  country_code?: string;
  about?: string | null;
  description?: string | null;
  established_year?: number | null;
  experience_years?: number | null;
  logo_url?: string | null;
  avatar_url?: string | null;
  default_image_url?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  is_verified?: boolean;
  is_featured?: boolean;
  category_name?: string | null;
  avg_rating?: number;
  review_count?: number;
  suggested_price_inr?: number | null;
  suggested_price_usd?: number | null;
  pricing_model?: string | null;
  duration_minutes?: number | null;
  seller_info?: any;
  provider_info?: any;
}

function CustomerExplorePageContent() {
  const { user, accessToken } = useAuthStore();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") || searchParams.get("query") || searchParams.get("search") || "";
  const urlType = (searchParams.get("type") as any) || "all";
  const urlCountry = searchParams.get("country") || "";
  const urlCity = searchParams.get("city") || searchParams.get("location") || "";
  const urlCategory = searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : null;
  const urlCategoryName = searchParams.get("categoryName") || "";

  const { location: userGlobalLocation, setLocation: setGlobalLocation } = useUserLocation();

  const [query, setQuery] = useState(urlQ);
  const [activeType, setActiveType] = useState<"all" | "business" | "professional" | "product" | "service">(
    urlCategory ? "all" : (["all", "business", "professional", "product", "service"].includes(urlType) ? urlType : "all")
  );
  const [country, setCountry] = useState<string>(urlCountry);
  const [city, setCity] = useState<string>(
    urlCity || (userGlobalLocation && userGlobalLocation !== "All Locations" ? userGlobalLocation : "")
  );
  const [locality, setLocality] = useState<string>("");
  const [postalCode, setPostalCode] = useState<string>("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(urlCategory);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>(urlCategoryName);

  // Sync state if URL search parameters change
  useEffect(() => {
    if (urlQ) setQuery(urlQ);
    if (urlCategory) {
      setSelectedCategoryId(urlCategory);
      if (urlCategoryName) setSelectedCategoryName(urlCategoryName);
      setActiveType("all"); // Show all: business, professional, product, and services
    } else if (urlType && ["all", "business", "professional", "product", "service"].includes(urlType)) {
      setActiveType(urlType);
    }
    if (urlCity) {
      setCity(urlCity);
    } else if (userGlobalLocation && userGlobalLocation !== "All Locations" && !city) {
      setCity(userGlobalLocation);
    }
    if (urlCountry) setCountry(urlCountry);
  }, [urlQ, urlType, urlCity, urlCountry, urlCategory, urlCategoryName, userGlobalLocation]);

  // Results
  const [loading, setLoading] = useState(false);
  const [businesses, setBusinesses] = useState<DiscoveryItem[]>([]);
  const [professionals, setProfessionals] = useState<DiscoveryItem[]>([]);
  const [products, setProducts] = useState<DiscoveryItem[]>([]);
  const [services, setServices] = useState<DiscoveryItem[]>([]);

  // Categories list
  const [categories, setCategories] = useState<Array<{ id: number; name: string; category_type: string }>>([]);

  // Favorites set
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  // Geolocation
  const [locating, setLocating] = useState(false);
  const [detectedLocation, setDetectedLocation] = useState<string | null>(null);

  // Modals state
  const [enquiryModalItem, setEnquiryModalItem] = useState<DiscoveryItem | null>(null);
  const [reviewModalItem, setReviewModalItem] = useState<DiscoveryItem | null>(null);
  const [reportModalItem, setReportModalItem] = useState<DiscoveryItem | null>(null);
  const [checkoutItem, setCheckoutItem] = useState<CheckoutItem | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedBookingService, setSelectedBookingService] = useState<BookingServiceItem | null>(null);

  // Cart store actions
  const { addItem, updateQuantity, getItemQuantity } = useCartStore();

  // Enquiry form
  const [enquiryForm, setEnquiryForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
    preferredDate: "",
    preferredTime: "",
  });
  const [submittingEnquiry, setSubmittingEnquiry] = useState(false);

  // Review form
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    title: "",
    comment: "",
    imageUrl: "",
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Report form
  const [reportForm, setReportForm] = useState({
    reason: "incorrect",
    description: "",
  });
  const [submittingReport, setSubmittingReport] = useState(false);

  // Load Categories on mount
  useEffect(() => {
    fetch("/api/admin/categories?limit=100")
      .then((res) => res.json())
      .then((data) => {
        if (data?.data) {
          setCategories(data.data);
        }
      })
      .catch(() => {});
  }, []);

  // Load Favorites if logged in
  useEffect(() => {
    if (!accessToken) return;
    fetch("/api/customer/favorites", {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.data)) {
          const favSet = new Set<string>();
          for (const item of data.data) {
            favSet.add(`${item.target_type}-${item.business_id || item.professional_id || item.product_id || item.service_id}`);
          }
          setFavorites(favSet);
        }
      })
      .catch(() => {});
  }, [accessToken]);

  // Request Current Location
  const requestCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          // Reverse geocode using public open-meteo / nominatim or fallback
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (geoRes.ok) {
            const data = await geoRes.json();
            const addr = data.address || {};
            const detectedCity = addr.city || addr.town || addr.village || addr.state_district || "Current Location";
            const detectedState = addr.state || "";
            const detectedPostcode = addr.postcode || "";
            const countryCode = (addr.country_code || "in").toUpperCase();

            setCity(detectedCity);
            if (countryCode === "US") setCountry("US");
            else setCountry("IN");
            if (detectedPostcode) setPostalCode(detectedPostcode);

            const label = `${detectedCity}${detectedState ? `, ${detectedState}` : ""}`;
            setDetectedLocation(label);
            toast.success(`Location detected: ${label}`);
          }
        } catch (_) {
          setDetectedLocation(`Lat: ${latitude.toFixed(2)}, Lon: ${longitude.toFixed(2)}`);
          toast.success("Location coordinates shared");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        console.warn("Geolocation permission error:", err);
      },
      { timeout: 8000 }
    );
  }, []);

  // Perform Search
  const performSearch = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      if (activeType !== "all") params.set("type", activeType);
      if (country) params.set("country", country);
      if (city.trim()) params.set("city", city.trim());
      if (locality.trim()) params.set("locality", locality.trim());
      if (postalCode.trim()) params.set("postalCode", postalCode.trim());
      if (selectedCategoryId) params.set("categoryId", String(selectedCategoryId));

      const res = await fetch(`/api/public/discovery?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data?.data) {
        setBusinesses(data.data.businesses || []);
        setProfessionals(data.data.professionals || []);
        setProducts(data.data.products || []);
        setServices(data.data.services || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch discovery listings");
    } finally {
      setLoading(false);
    }
  }, [query, activeType, country, city, locality, postalCode, selectedCategoryId]);

  useEffect(() => {
    performSearch();
  }, [performSearch]);

  // Toggle Favorite
  const handleToggleFavorite = async (item: DiscoveryItem) => {
    if (!accessToken) {
      toast.error("Please log in to save favorites to your account");
      return;
    }
    const key = `${item.resultType}-${item.id}`;
    const isFav = favorites.has(key);

    try {
      const res = await fetch("/api/customer/favorites", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          targetType: item.resultType,
          businessId: item.resultType === "business" ? item.id : undefined,
          professionalId: item.resultType === "professional" ? item.id : undefined,
          productId: item.resultType === "product" ? item.id : undefined,
          serviceId: item.resultType === "service" ? item.id : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setFavorites((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(key);
        else next.add(key);
        return next;
      });

      toast.success(data.message);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error updating favorite");
    }
  };

  // Submit Enquiry
  const handleEnquirySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enquiryModalItem) return;

    setSubmittingEnquiry(true);
    try {
      const res = await fetch("/api/customer/enquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          businessId: enquiryModalItem.resultType === "business" ? enquiryModalItem.id : undefined,
          professionalId: enquiryModalItem.resultType === "professional" ? enquiryModalItem.id : undefined,
          customerName: enquiryForm.name || user?.full_name || "Customer",
          customerEmail: enquiryForm.email || user?.email,
          customerPhone: enquiryForm.phone || user?.phone,
          message: enquiryForm.message,
          preferredDate: enquiryForm.preferredDate || undefined,
          preferredTime: enquiryForm.preferredTime || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message || "Enquiry sent successfully!");
      setEnquiryModalItem(null);
      setEnquiryForm({ name: "", email: "", phone: "", message: "", preferredDate: "", preferredTime: "" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to send enquiry");
    } finally {
      setSubmittingEnquiry(false);
    }
  };

  // Submit Review
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewModalItem) return;

    setSubmittingReview(true);
    try {
      const images = reviewForm.imageUrl ? [reviewForm.imageUrl.trim()] : [];
      const res = await fetch("/api/customer/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          businessId: reviewModalItem.resultType === "business" ? reviewModalItem.id : undefined,
          professionalId: reviewModalItem.resultType === "professional" ? reviewModalItem.id : undefined,
          rating: reviewForm.rating,
          title: reviewForm.title,
          comment: reviewForm.comment,
          images,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message || "Review submitted successfully!");
      setReviewModalItem(null);
      setReviewForm({ rating: 5, title: "", comment: "", imageUrl: "" });
      performSearch();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Submit Report
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportModalItem) return;

    setSubmittingReport(true);
    try {
      const res = await fetch("/api/customer/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          targetType: reportModalItem.resultType,
          businessId: reportModalItem.resultType === "business" ? reportModalItem.id : undefined,
          professionalId: reportModalItem.resultType === "professional" ? reportModalItem.id : undefined,
          reportReason: reportForm.reason,
          description: reportForm.description,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast.success(data.message || "Report submitted successfully!");
      setReportModalItem(null);
      setReportForm({ reason: "incorrect", description: "" });
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to report listing");
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="min-h-screen bg-muted/20 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Search Header Banner */}
      <div className="rounded-3xl bg-linear-to-r from-blue-700 via-indigo-700 to-purple-800 text-white p-6 sm:p-10 shadow-lg relative overflow-hidden">
        <div className="relative z-10 space-y-4 max-w-3xl">
          <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 text-xs py-1 px-3">
            <Sparkles className="size-3.5 mr-1" /> Customer Directory & Marketplace
          </Badge>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Discover Verified Businesses, Top Professionals, Products & Services
          </h1>
          <p className="text-sm sm:text-base text-blue-100/90 leading-relaxed">
            Search nearby local enterprises, contact licensed consultants, browse catalogs with suggested INR/USD prices, and connect directly via Call or WhatsApp.
          </p>

          {/* Quick Location Detector */}
          <div className="flex items-center gap-2 pt-2 flex-wrap text-xs">
            <button
              onClick={requestCurrentLocation}
              disabled={locating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer font-medium"
            >
              <LocateFixed className={`size-3.5 ${locating ? "animate-spin" : ""}`} />
              <span>{locating ? "Detecting location..." : detectedLocation ? `Location: ${detectedLocation}` : "Share Current Location"}</span>
            </button>
            {detectedLocation && (
              <Badge variant="outline" className="text-white/80 border-white/20 bg-white/5 text-[11px]">
                <CheckCircle2 className="size-3 mr-1 text-emerald-300" /> Active
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Search & Location Filter Controls */}
      <Card className="rounded-2xl border shadow-sm">
        <CardContent className="p-4 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            {/* Keyword Input */}
            <div className="md:col-span-5 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search business name, doctor, lawyer, product, service, or keyword..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-9 text-sm h-11"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>

            {/* Country Selector */}
            <div className="md:col-span-2">
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-xs font-semibold shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <option value="">🌍 All Countries</option>
                <option value="IN">🇮🇳 India (₹ INR)</option>
                <option value="US">🇺🇸 United States ($ USD)</option>
              </select>
            </div>

            {/* City */}
            <div className="md:col-span-3 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="City (or leave empty for all)"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="pl-9 text-xs h-11"
              />
              {city && (
                <button
                  type="button"
                  onClick={() => setCity("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-[10px] font-bold"
                  title="Clear city to show all locations"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Locality / ZIP */}
            <div className="md:col-span-2">
              <Input
                placeholder="Locality / PIN / ZIP"
                value={locality || postalCode}
                onChange={(e) => {
                  setLocality(e.target.value);
                  setPostalCode(e.target.value);
                }}
                className="text-xs h-11"
              />
            </div>
          </div>

          {/* Location Scope Indicator */}
          <div className="flex items-center justify-between gap-2 p-2.5 bg-muted/40 rounded-xl text-xs flex-wrap border border-border/40">
            <div className="flex items-center gap-2">
              <MapPin className="size-3.5 text-rose-600 shrink-0" />
              <span className="text-muted-foreground font-medium">Location Scope:</span>
              <span className="font-bold text-foreground">
                {city ? `City: ${city}` : country ? `Country: ${country === "IN" ? "India" : "United States"}` : "Entire Available Dataset (All Locations & Countries)"}
              </span>
            </div>
            {city || country ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCity("");
                  setCountry("");
                  setLocality("");
                  setPostalCode("");
                }}
                className="h-7 text-[11px] px-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                Reset to Entire World (All Data)
              </Button>
            ) : (
              <span className="text-[11px] text-muted-foreground">
                Showing all registered businesses, professionals, products & services
              </span>
            )}
          </div>

          {/* Type Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border/50">
            <Tabs value={activeType} onValueChange={(val: any) => setActiveType(val)} className="w-full">
              <TabsList className="p-1 bg-muted/60 h-auto gap-1 flex-wrap">
                <TabsTrigger value="all" className="text-xs font-semibold px-3 py-1.5 gap-1.5">
                  <Layers className="size-3.5" /> All ({businesses.length + professionals.length + products.length + services.length})
                </TabsTrigger>
                <TabsTrigger value="business" className="text-xs font-semibold px-3 py-1.5 gap-1.5">
                  <Building2 className="size-3.5" /> Businesses ({businesses.length})
                </TabsTrigger>
                <TabsTrigger value="professional" className="text-xs font-semibold px-3 py-1.5 gap-1.5">
                  <Briefcase className="size-3.5" /> Professionals ({professionals.length})
                </TabsTrigger>
                <TabsTrigger value="product" className="text-xs font-semibold px-3 py-1.5 gap-1.5">
                  <Package className="size-3.5" /> Products ({products.length})
                </TabsTrigger>
                <TabsTrigger value="service" className="text-xs font-semibold px-3 py-1.5 gap-1.5">
                  <Sparkles className="size-3.5" /> Services ({services.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Active Category Filter Banner */}
      {selectedCategoryId && (
        <div className="flex items-center justify-between p-3.5 bg-primary/10 border border-primary/20 rounded-2xl text-xs flex-wrap gap-2 animate-in fade-in">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className="bg-primary text-primary-foreground font-bold text-xs py-0.5 px-2">
              Category Filter Active
            </Badge>
            <span className="font-bold text-foreground text-sm">
              {selectedCategoryName || categories.find((c) => c.id === selectedCategoryId)?.name || `Category #${selectedCategoryId}`}
            </span>
            <span className="text-muted-foreground text-xs hidden sm:inline">
              — Displaying all matching businesses, professionals, products, and services
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedCategoryId(null);
              setSelectedCategoryName("");
            }}
            className="h-7 text-xs font-bold text-primary hover:text-primary gap-1 cursor-pointer"
          >
            <X className="size-3.5" />
            <span>Clear Filter</span>
          </Button>
        </div>
      )}

      {/* Results Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-muted-foreground gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Finding matching listings...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Section: Businesses */}
          {(activeType === "all" || activeType === "business") && businesses.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Building2 className="size-5 text-blue-600" />
                  Businesses & Establishments ({businesses.length})
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {businesses.map((biz) => {
                  const favKey = `business-${biz.id}`;
                  const isFavorited = favorites.has(favKey);
                  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${biz.name} ${biz.city || ""}`)}`;
                  const whatsappClean = (biz.whatsapp || biz.phone || "").replace(/[^0-9]/g, "");

                  return (
                    <Card key={biz.id} className="rounded-2xl border shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                      <div>
                        <CardHeader className="pb-3 border-b bg-muted/10">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Link href={buildBusinessSeoUrl(biz)}>
                                  <CardTitle className="text-base font-bold text-foreground hover:text-primary transition-colors cursor-pointer">
                                    {biz.name}
                                  </CardTitle>
                                </Link>
                                {biz.is_verified && (
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 text-[10px] px-1 py-0">
                                    <ShieldCheck className="size-3 mr-0.5 text-emerald-600" /> Verified
                                  </Badge>
                                )}
                                {biz.is_featured && (
                                  <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-1.5 py-0">
                                    Featured
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground block mt-0.5">
                                {biz.business_type} • {biz.category_name || "General"}
                              </span>
                            </div>

                            <button
                              onClick={() => handleToggleFavorite(biz)}
                              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                                isFavorited ? "text-rose-600 bg-rose-50 dark:bg-rose-950/50" : "text-muted-foreground hover:text-rose-600"
                              }`}
                              title={isFavorited ? "Remove from favorites" : "Save to favorites"}
                            >
                              <Heart className={`size-4 ${isFavorited ? "fill-rose-600" : ""}`} />
                            </button>
                          </div>
                        </CardHeader>

                        <CardContent className="p-4 space-y-3 text-xs">
                          {/* Rating & Reviews */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <Star className="size-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-bold text-foreground">{biz.avg_rating || "New"}</span>
                              <span className="text-muted-foreground">({biz.review_count || 0} reviews)</span>
                            </div>
                            <button
                              onClick={() => setReviewModalItem(biz)}
                              className="text-primary hover:underline text-[11px] font-semibold cursor-pointer"
                            >
                              Write Review
                            </button>
                          </div>

                          {/* Address / Location */}
                          <div className="flex items-start gap-1.5 text-muted-foreground text-xs">
                            <MapPin className="size-3.5 shrink-0 mt-0.5 text-primary" />
                            <span>{[biz.locality, biz.city, biz.state].filter(Boolean).join(", ") || "Location on request"}</span>
                          </div>

                          {/* About snippet */}
                          {biz.about && (
                            <p className="text-muted-foreground text-xs line-clamp-2 italic">
                              &quot;{biz.about}&quot;
                            </p>
                          )}
                        </CardContent>
                      </div>

                      {/* Action Buttons */}
                      <CardFooter className="p-4 pt-0 border-t border-border/40 bg-muted/5 flex flex-col gap-2 mt-2">
                        <div className="grid grid-cols-4 gap-1.5 w-full pt-3">
                          {biz.phone ? (
                            <a
                              href={`tel:${biz.phone}`}
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition-colors"
                              title="Call Business"
                            >
                              <Phone className="size-4" />
                            </a>
                          ) : (
                            <span className="opacity-40 p-2 text-center text-muted-foreground"><Phone className="size-4 mx-auto" /></span>
                          )}

                          {whatsappClean ? (
                            <a
                              href={`https://wa.me/${whatsappClean}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="size-4" />
                            </a>
                          ) : (
                            <span className="opacity-40 p-2 text-center text-muted-foreground"><MessageCircle className="size-4 mx-auto" /></span>
                          )}

                          {biz.email ? (
                            <a
                              href={`mailto:${biz.email}`}
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 transition-colors"
                              title="Send Email"
                            >
                              <Mail className="size-4" />
                            </a>
                          ) : (
                            <span className="opacity-40 p-2 text-center text-muted-foreground"><Mail className="size-4 mx-auto" /></span>
                          )}

                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 transition-colors"
                            title="Directions on Map"
                          >
                            <Navigation className="size-4" />
                          </a>
                        </div>

                        <div className="flex items-center gap-2 w-full pt-1">
                          <Link href={buildBusinessSeoUrl(biz)} className="flex-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="w-full text-xs font-semibold gap-1.5 cursor-pointer"
                            >
                              <Building2 className="size-3.5" /> View Profile
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setEnquiryModalItem(biz);
                              setEnquiryForm((prev) => ({
                                ...prev,
                                name: user?.full_name || "",
                                email: user?.email || "",
                                phone: user?.phone || "",
                              }));
                            }}
                            className="flex-1 text-xs font-semibold gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            <Send className="size-3.5" /> Enquiry
                          </Button>
                          <button
                            onClick={() => setReportModalItem(biz)}
                            className="text-[11px] text-muted-foreground hover:text-destructive px-1.5 py-1 shrink-0"
                            title="Report listing"
                          >
                            Report
                          </button>
                        </div>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Professionals */}
          {(activeType === "all" || activeType === "professional") && professionals.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <Briefcase className="size-5 text-purple-600" />
                  Top Professionals & Consultants ({professionals.length})
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {professionals.map((pro) => {
                  const favKey = `professional-${pro.id}`;
                  const isFavorited = favorites.has(favKey);
                  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pro.name} ${pro.city || ""}`)}`;
                  const whatsappClean = (pro.whatsapp || pro.phone || "").replace(/[^0-9]/g, "");

                  return (
                    <Card key={pro.id} className="rounded-2xl border shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                      <div>
                        <CardHeader className="pb-3 border-b bg-muted/10">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Link href={buildProfessionalSeoUrl(pro)}>
                                  <CardTitle className="text-base font-bold text-foreground hover:text-primary transition-colors cursor-pointer">
                                    {pro.name}
                                  </CardTitle>
                                </Link>
                                {pro.is_verified && (
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 text-[10px] px-1 py-0">
                                    <ShieldCheck className="size-3 mr-0.5 text-emerald-600" /> Verified
                                  </Badge>
                                )}
                              </div>
                              <span className="text-xs text-muted-foreground block mt-0.5 font-medium text-purple-600 dark:text-purple-400">
                                {pro.profession_type} • {pro.experience_years ? `${pro.experience_years} Years Experience` : "Expert"}
                              </span>
                            </div>

                            <button
                              onClick={() => handleToggleFavorite(pro)}
                              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                                isFavorited ? "text-rose-600 bg-rose-50 dark:bg-rose-950/50" : "text-muted-foreground hover:text-rose-600"
                              }`}
                              title={isFavorited ? "Remove from favorites" : "Save to favorites"}
                            >
                              <Heart className={`size-4 ${isFavorited ? "fill-rose-600" : ""}`} />
                            </button>
                          </div>
                        </CardHeader>

                        <CardContent className="p-4 space-y-3 text-xs">
                          {/* Rating & Reviews */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <Star className="size-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-bold text-foreground">{pro.avg_rating || "New"}</span>
                              <span className="text-muted-foreground">({pro.review_count || 0} reviews)</span>
                            </div>
                            <button
                              onClick={() => setReviewModalItem(pro)}
                              className="text-primary hover:underline text-[11px] font-semibold cursor-pointer"
                            >
                              Write Review
                            </button>
                          </div>

                          {/* Address / Location */}
                          <div className="flex items-start gap-1.5 text-muted-foreground text-xs">
                            <MapPin className="size-3.5 shrink-0 mt-0.5 text-primary" />
                            <span>{[pro.locality, pro.city, pro.state].filter(Boolean).join(", ") || "City location available"}</span>
                          </div>

                          {/* About snippet */}
                          {pro.about && (
                            <p className="text-muted-foreground text-xs line-clamp-2 italic">
                              &quot;{pro.about}&quot;
                            </p>
                          )}
                        </CardContent>
                      </div>

                      {/* Action Buttons */}
                      <CardFooter className="p-4 pt-0 border-t border-border/40 bg-muted/5 flex flex-col gap-2 mt-2">
                        <div className="grid grid-cols-4 gap-1.5 w-full pt-3">
                          {pro.phone ? (
                            <a
                              href={`tel:${pro.phone}`}
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition-colors"
                              title="Call Professional"
                            >
                              <Phone className="size-4" />
                            </a>
                          ) : (
                            <span className="opacity-40 p-2 text-center text-muted-foreground"><Phone className="size-4 mx-auto" /></span>
                          )}

                          {whatsappClean ? (
                            <a
                              href={`https://wa.me/${whatsappClean}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="size-4" />
                            </a>
                          ) : (
                            <span className="opacity-40 p-2 text-center text-muted-foreground"><MessageCircle className="size-4 mx-auto" /></span>
                          )}

                          {pro.email ? (
                            <a
                              href={`mailto:${pro.email}`}
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 transition-colors"
                              title="Send Email"
                            >
                              <Mail className="size-4" />
                            </a>
                          ) : (
                            <span className="opacity-40 p-2 text-center text-muted-foreground"><Mail className="size-4 mx-auto" /></span>
                          )}

                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 transition-colors"
                            title="Directions on Map"
                          >
                            <Navigation className="size-4" />
                          </a>
                        </div>

                        <div className="flex items-center gap-2 w-full pt-1">
                          <Link href={buildProfessionalSeoUrl(pro)} className="flex-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="w-full text-xs font-semibold gap-1.5 cursor-pointer"
                            >
                              <Briefcase className="size-3.5" /> View Profile
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setCheckoutItem({
                                id: pro.id,
                                name: `Consultation with ${pro.name}`,
                                type: "service",
                                provider_name: pro.name,
                                duration_minutes: 45,
                                suggested_price_inr: (pro as any).consultation_fee || 500,
                                institution_id: (pro as any).institution_profile_id || null,
                              });
                              setCheckoutOpen(true);
                            }}
                            className="flex-1 text-xs font-semibold gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            <Calendar className="size-3.5" /> Book
                          </Button>
                          <button
                            onClick={() => setReportModalItem(pro)}
                            className="text-[11px] text-muted-foreground hover:text-destructive px-1.5 py-1 shrink-0"
                            title="Report listing"
                          >
                            Report
                          </button>
                        </div>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Products */}
          {(activeType === "all" || activeType === "product") && products.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Package className="size-5 text-indigo-600" />
                Featured Products & Master Catalog ({products.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {products.map((prod) => {
                  const price = country === "US" ? prod.suggested_price_usd : prod.suggested_price_inr;
                  const currencySymbol = country === "US" ? "$" : "₹";

                  return (
                    <Card key={prod.id} className="rounded-2xl border shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                      <div>
                        {prod.default_image_url ? (
                          <div className="h-40 w-full overflow-hidden rounded-t-2xl bg-muted/40">
                            <img src={prod.default_image_url} alt={prod.name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-32 w-full flex items-center justify-center bg-muted/30 text-muted-foreground/40 rounded-t-2xl">
                            <Package className="size-10" />
                          </div>
                        )}
                        <CardHeader className="p-4 pb-2">
                          <Badge variant="outline" className="w-fit text-[10px] mb-1">
                            {prod.category_name || "Product"}
                          </Badge>
                          <CardTitle className="text-sm font-bold text-foreground line-clamp-1">{prod.name}</CardTitle>
                          {prod.description && (
                            <p className="text-muted-foreground text-xs line-clamp-2 mt-1">{prod.description}</p>
                          )}
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-2">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs text-muted-foreground">Suggested Price:</span>
                            <span className="text-base font-extrabold text-foreground">
                              {currencySymbol} {price ? Number(price).toLocaleString() : "Contact"}
                            </span>
                          </div>
                          {prod.seller_info && (
                            <p className="text-[11px] text-muted-foreground">
                              Seller: <span className="font-semibold text-foreground">{prod.seller_info.business_name}</span> ({prod.seller_info.city || "Available"})
                            </p>
                          )}
                        </CardContent>
                      </div>

                      <CardFooter className="p-4 pt-0">
                        {getItemQuantity(prod.id) > 0 ? (
                          <div className="flex h-8 w-full items-center justify-between border border-rose-300 dark:border-rose-900 rounded-xl overflow-hidden bg-background px-2 shadow-2xs">
                            <button
                              type="button"
                              onClick={() => updateQuantity(prod.id, getItemQuantity(prod.id) - 1)}
                              className="size-6 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <Minus className="size-3" />
                            </button>
                            <span className="text-xs font-black text-rose-600">
                              {getItemQuantity(prod.id)} in Cart
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(prod.id, getItemQuantity(prod.id) + 1)}
                              className="size-6 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground"
                            >
                              <Plus className="size-3" />
                            </button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            className="w-full text-xs font-bold gap-1.5 cursor-pointer bg-rose-600 hover:bg-rose-700 text-white shadow-2xs"
                            onClick={() => {
                              const effPrice = Number((prod as any).suggested_price_inr || (prod as any).price || 0);
                              addItem({
                                id: prod.id,
                                name: prod.name,
                                price: effPrice,
                                regular_price: (prod as any).regular_price ? Number((prod as any).regular_price) : null,
                                image_url: prod.default_image_url,
                                brand: (prod as any).brand || prod.seller_info?.business_name,
                                business_id: prod.seller_info?.business_id || (prod as any).business_id,
                                institution_id: (prod as any).institution_id,
                              }, 1);
                              toast.success(`${prod.name} added to cart!`);
                            }}
                          >
                            <ShoppingCart className="size-3.5" /> Add to Cart
                          </Button>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Section: Services */}
          {(activeType === "all" || activeType === "service") && services.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="size-5 text-emerald-600" />
                Featured Services & Master Services ({services.length})
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {services.map((srv) => {
                  const price = country === "US" ? srv.suggested_price_usd : srv.suggested_price_inr;
                  const currencySymbol = country === "US" ? "$" : "₹";

                  return (
                    <Card key={srv.id} className="rounded-2xl border shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                      <div>
                        {srv.default_image_url ? (
                          <div className="h-40 w-full overflow-hidden rounded-t-2xl bg-muted/40">
                            <img src={srv.default_image_url} alt={srv.name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-32 w-full flex items-center justify-center bg-muted/30 text-muted-foreground/40 rounded-t-2xl">
                            <Sparkles className="size-10" />
                          </div>
                        )}
                        <CardHeader className="p-4 pb-2">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <Badge variant="outline" className="text-[10px]">
                              {srv.category_name || "Service"}
                            </Badge>
                            {srv.pricing_model && (
                              <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-0 text-[10px]">
                                {srv.pricing_model}
                              </Badge>
                            )}
                          </div>
                          <CardTitle className="text-sm font-bold text-foreground line-clamp-1">{srv.name}</CardTitle>
                          {srv.description && (
                            <p className="text-muted-foreground text-xs line-clamp-2 mt-1">{srv.description}</p>
                          )}
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-2">
                          <div className="flex items-baseline gap-1">
                            <span className="text-xs text-muted-foreground">Price:</span>
                            <span className="text-base font-extrabold text-foreground">
                              {currencySymbol} {price ? Number(price).toLocaleString() : "Quote"}
                            </span>
                          </div>
                          {srv.duration_minutes && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                              <Clock className="size-3" /> Duration: {srv.duration_minutes} mins
                            </span>
                          )}
                        </CardContent>
                      </div>

                      <CardFooter className="p-4 pt-0">
                        <Button
                          size="sm"
                          className="w-full text-xs font-bold gap-1.5 cursor-pointer bg-sky-600 hover:bg-sky-700 text-white shadow-2xs"
                          onClick={() => {
                            setSelectedBookingService({
                              id: srv.id,
                              name: srv.name,
                              price: (srv as any).suggested_price_inr || (srv as any).price || 0,
                              regular_price: (srv as any).regular_price ? Number((srv as any).regular_price) : null,
                              pricing_model: srv.pricing_model,
                              estimated_duration: (srv as any).estimated_duration || `${(srv as any).duration_minutes || 60} mins`,
                              service_location: (srv as any).service_location || "In-Person & Online",
                              default_image_url: srv.default_image_url,
                              provider_name: (srv as any).provider_name || "Service Provider",
                              business_id: (srv as any).business_id || null,
                              professional_id: (srv as any).professional_id || null,
                              institution_id: (srv as any).institution_id || null,
                            });
                            setBookingDialogOpen(true);
                          }}
                        >
                          <Calendar className="size-3.5" /> Book Appointment
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Empty state */}
          {businesses.length === 0 && professionals.length === 0 && products.length === 0 && services.length === 0 && (
            <div className="text-center py-16 space-y-3 bg-card border rounded-2xl p-8">
              <Search className="size-10 text-muted-foreground/40 mx-auto" />
              <h3 className="text-base font-bold text-foreground">No matching listings found</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Try searching for a different keyword or relaxing your city / locality filters.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setQuery("");
                  setCity("");
                  setLocality("");
                  setPostalCode("");
                  setSelectedCategoryId(null);
                  setActiveType("all");
                }}
                className="text-xs font-semibold cursor-pointer"
              >
                Reset All Filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Enquiry Modal */}
      <Dialog open={Boolean(enquiryModalItem)} onOpenChange={(open) => !open && setEnquiryModalItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Send className="size-4 text-primary" />
              Contact {enquiryModalItem?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Send your message directly to this business or professional.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEnquirySubmit} className="space-y-3 pt-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Your Full Name *</Label>
              <Input
                placeholder="e.g. John Doe"
                value={enquiryForm.name}
                onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                required
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">Contact Phone</Label>
                <Input
                  placeholder="Mobile number"
                  value={enquiryForm.phone}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input
                  type="email"
                  placeholder="name@email.com"
                  value={enquiryForm.email}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">Preferred Date</Label>
                <Input
                  type="date"
                  value={enquiryForm.preferredDate}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, preferredDate: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Preferred Time</Label>
                <Input
                  type="time"
                  value={enquiryForm.preferredTime}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, preferredTime: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Your Message / Requirement *</Label>
              <Textarea
                placeholder="Describe your inquiry, requested services, or questions..."
                value={enquiryForm.message}
                onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                required
                rows={3}
                className="mt-1 text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setEnquiryModalItem(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submittingEnquiry} className="gap-1.5 font-bold">
                {submittingEnquiry ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                Send Enquiry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Review Modal */}
      <Dialog open={Boolean(reviewModalItem)} onOpenChange={(open) => !open && setReviewModalItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Star className="size-4 text-amber-400 fill-amber-400" />
              Write Review for {reviewModalItem?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Share your verified experience and rating with the community.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReviewSubmit} className="space-y-3 pt-2 text-xs">
            {/* Star Rating */}
            <div>
              <Label className="text-xs font-semibold block mb-1">Your Rating *</Label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                    className="p-1 cursor-pointer transition-transform hover:scale-110"
                  >
                    <Star
                      className={`size-6 ${
                        star <= reviewForm.rating
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs font-bold text-foreground ml-2">
                  {reviewForm.rating} / 5 Stars
                </span>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Review Title</Label>
              <Input
                placeholder="e.g. Excellent service and very professional!"
                value={reviewForm.title}
                onChange={(e) => setReviewForm({ ...reviewForm, title: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Your Experience & Feedback *</Label>
              <Textarea
                placeholder="Detail what was great or what could be improved..."
                value={reviewForm.comment}
                onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                required
                rows={3}
                className="mt-1 text-xs resize-none"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Photo / Review Image URL (Optional)</Label>
              <Input
                placeholder="https://example.com/photo.jpg"
                value={reviewForm.imageUrl}
                onChange={(e) => setReviewForm({ ...reviewForm, imageUrl: e.target.value })}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setReviewModalItem(null)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submittingReview} className="gap-1.5 font-bold">
                {submittingReview ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                Post Review
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Report Listing Modal */}
      <Dialog open={Boolean(reportModalItem)} onOpenChange={(open) => !open && setReportModalItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-destructive">
              <AlertTriangle className="size-4" />
              Report Listing: {reportModalItem?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Help us maintain data integrity by reporting incorrect or fraudulent entries.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleReportSubmit} className="space-y-3 pt-2 text-xs">
            <div>
              <Label className="text-xs font-semibold">Reason for Report *</Label>
              <select
                value={reportForm.reason}
                onChange={(e) => setReportForm({ ...reportForm, reason: e.target.value })}
                className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none"
              >
                <option value="incorrect">Incorrect details or contact info</option>
                <option value="duplicate">Duplicate listing</option>
                <option value="fake">Fake / Non-existent business or professional</option>
                <option value="misleading">Misleading prices or claims</option>
                <option value="other">Other reason</option>
              </select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Details & Explanation *</Label>
              <Textarea
                placeholder="Please describe why this listing is incorrect or problematic..."
                value={reportForm.description}
                onChange={(e) => setReportForm({ ...reportForm, description: e.target.value })}
                required
                rows={3}
                className="mt-1 text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setReportModalItem(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                variant="destructive"
                disabled={submittingReport || !reportForm.description.trim()}
                className="gap-1.5 font-bold"
              >
                {submittingReport ? <Loader2 className="size-3.5 animate-spin" /> : <AlertTriangle className="size-3.5" />}
                Submit Report
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Universal Order & Appointment Checkout Dialog */}
      <OrderCheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        item={checkoutItem}
        country={country === "US" ? "US" : "IN"}
      />

      {/* Cart Drawer & Floating Cart Trigger */}
      <CartDrawer />
      <CartFloatingButton />

      {/* Service Appointment Booking Dialog */}
      <ServiceBookingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        service={selectedBookingService}
      />
    </div>
  );
}

export default function CustomerExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin text-rose-600" />
          <span>Loading Discovery Directory...</span>
        </div>
      }
    >
      <CustomerExplorePageContent />
    </Suspense>
  );
}

