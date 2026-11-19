"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Sparkles,
  Package,
  Wrench,
  UserCheck,
  GraduationCap,
  Briefcase,
  Store,
  MapPin,
  ArrowRight,
  CheckCircle2,
  Tag,
  Star,
  ExternalLink,
  ShoppingCart,
  Calendar,
  Clock,
  Building2,
  TrendingDown,
  ShieldCheck,
  ChevronRight,
  Filter,
  Layers,
  Phone,
  Mail,
  Zap,
  Award,
  BookOpen,
  FolderTree,
  Loader2,
  X,
  Navigation,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserLocation } from "@/hooks/use-user-location";
import { useCartStore } from "@/store/slices/cart.store";
import { TrendingLocationCategories } from "@/components/home/trending-location-categories";
import { ProductStoresDialog } from "@/components/public/product-stores-dialog";
import { ServiceStoresDialog } from "@/components/public/service-stores-dialog";
import { ServiceBookingDialog, BookingServiceItem } from "@/components/checkout/service-booking-dialog";
import { toast } from "sonner";

interface ProductData {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  brand?: string | null;
  default_image_url?: string | null;
  suggested_price_inr?: string | number | null;
  category_name?: string | null;
  seller_info?: {
    business_name?: string;
    price?: number;
    city?: string;
    phone?: string;
  } | null;
}

interface ServiceData {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  estimated_duration?: string | null;
  default_image_url?: string | null;
  suggested_price_inr?: string | number | null;
  category_name?: string | null;
  provider_info?: any;
}

interface ProfessionalData {
  id: number;
  name: string;
  slug?: string;
  profession_type?: string;
  about?: string | null;
  experience_years?: number | null;
  avatar_url?: string | null;
  city?: string | null;
  is_verified?: boolean;
  category_name?: string | null;
  avg_rating?: string | number;
  review_count?: number;
}

interface CourseData {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  duration_value?: number;
  duration_unit?: string;
  thumbnail_url?: string | null;
  icon_url?: string | null;
  authority_type?: string | null;
  category_name?: string | null;
  seats_available?: number;
}

interface JobData {
  id: number;
  name?: string;
  title: string;
  slug?: string;
  department?: string;
  employment_type?: string;
  experience_level?: string;
  work_mode?: string;
  location?: string;
  salary_range?: string;
  openings_count?: number;
  company_name?: string;
}

interface BusinessData {
  id: number;
  name: string;
  slug?: string;
  city?: string | null;
  state?: string | null;
  locality?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  business_type?: string | null;
  category_name?: string | null;
  is_verified?: boolean;
}

interface SearchResultItem {
  id: number | string;
  title: string;
  subtitle?: string;
  category_name?: string | null;
  subcategory_name?: string | null;
  category_type?: string;
  designation?: string;
  price?: string | number | null;
  slug?: string;
  href: string;
  profileHref?: string;
  listingHref?: string;
  storefrontHref?: string;
  business_name?: string;
  logo_url?: string | null;
  avatar_url?: string | null;
  type: "business" | "professional" | "product" | "service" | "category" | "course" | "institute" | "teacher" | "practice" | "notes";
}

interface SearchResultsState {
  businesses: SearchResultItem[];
  professionals: SearchResultItem[];
  products: SearchResultItem[];
  services: SearchResultItem[];
  categories: SearchResultItem[];
  courses: SearchResultItem[];
  institutes: SearchResultItem[];
  teachers: SearchResultItem[];
  practice: SearchResultItem[];
  notes: SearchResultItem[];
}

// Curated product categories for the filter tabs (avoids showing all dozens of categories)
const CURATED_PRODUCT_TABS = [
  { id: "all", label: "Top Trending Picks" },
  { id: "groceries", label: "Groceries & Staples", keywords: ["atta", "rice", "dal", "flour", "oil", "vegetable", "fruit", "dairy", "milk", "biscuit", "cookie", "tea", "coffee"] },
  { id: "electronics", label: "Electronics & Tech", keywords: ["electronic", "gadget", "appliances", "phone", "macbook", "headphone"] },
  { id: "real_estate", label: "Heritage Villas & Living", keywords: ["villa", "colonial", "house", "luxury", "heritage"] },
  { id: "cleaners", label: "Cleaners & Repellents", keywords: ["clean", "wash", "repellent", "soap", "detergent", "sanitizer"] },
];

export function UnifiedMarketplaceHome() {
  const router = useRouter();
  const {
    location: userLocation,
    setLocation: setUserLocation,
    availableLocations,
    requestLocation,
    isDetecting,
    isDetected,
  } = useUserLocation();
  const { addItem } = useCartStore();

  // Unified Discovery Data
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);

  // Search & Autocomplete State (Identical to PlatformAdminHeader)
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSearchTab, setActiveSearchTab] = useState<"all" | "products" | "services" | "businesses" | "professionals" | "categories">("all");
  const [searchResults, setSearchResults] = useState<SearchResultsState | null>(null);
  const [totalSearchCount, setTotalSearchCount] = useState(0);
  const heroSearchContainerRef = useRef<HTMLDivElement>(null);

  const [selectedProductTab, setSelectedProductTab] = useState<string>("all");

  // Modals state
  const [selectedProductForStores, setSelectedProductForStores] = useState<{ id: number | string; name: string } | null>(null);
  const [productStoresDialogOpen, setProductStoresDialogOpen] = useState(false);

  const [selectedServiceForStores, setSelectedServiceForStores] = useState<{ id: number | string; name: string } | null>(null);
  const [serviceStoresDialogOpen, setServiceStoresDialogOpen] = useState(false);

  const [selectedServiceForBooking, setSelectedServiceForBooking] = useState<BookingServiceItem | null>(null);
  const [serviceBookingDialogOpen, setServiceBookingDialogOpen] = useState(false);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (heroSearchContainerRef.current && !heroSearchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Instant live search debounced query
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchResults(null);
      setTotalSearchCount(0);
      setIsSearching(false);
      setIsDropdownOpen(false);
      return;
    }

    setIsSearching(true);
    setIsDropdownOpen(true);

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/public/search?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.results) {
            setSearchResults(data.results);
            setTotalSearchCount(data.total || 0);
          }
        }
      } catch (err) {
        console.error("Hero search fetch error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Autocomplete filtering based on active pill
  const displayedSearchItems = useMemo(() => {
    if (!searchResults) return [];
    if (activeSearchTab === "products") return searchResults.products || [];
    if (activeSearchTab === "services") return searchResults.services || [];
    if (activeSearchTab === "businesses") return searchResults.businesses || [];
    if (activeSearchTab === "professionals") return searchResults.professionals || [];
    if (activeSearchTab === "categories") return searchResults.categories || [];

    return [
      ...(searchResults.categories || []),
      ...(searchResults.products || []),
      ...(searchResults.services || []),
      ...(searchResults.businesses || []),
      ...(searchResults.professionals || []),
      ...(searchResults.institutes || []),
      ...(searchResults.courses || []),
      ...(searchResults.teachers || []),
    ];
  }, [searchResults, activeSearchTab]);

  const searchCounts = useMemo(() => ({
    all: totalSearchCount,
    products: searchResults?.products?.length || 0,
    services: searchResults?.services?.length || 0,
    businesses: searchResults?.businesses?.length || 0,
    professionals: searchResults?.professionals?.length || 0,
    categories: searchResults?.categories?.length || 0,
  }), [totalSearchCount, searchResults]);

  // Load live data from /api/public/discovery
  useEffect(() => {
    let isMounted = true;
    async function fetchDiscovery() {
      try {
        setLoading(true);
        const cityParam = userLocation && userLocation.toLowerCase() !== "all locations" ? `&city=${encodeURIComponent(userLocation)}` : "";
        const res = await fetch(`/api/public/discovery?limit=12${cityParam}`);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json?.data) {
            setProducts(json.data.products || []);
            setServices(json.data.services || []);
            setProfessionals(json.data.professionals || []);
            setCourses(json.data.courses || []);
            setJobs(json.data.jobs || []);
            setBusinesses(json.data.businesses || []);
          }
        }
      } catch (err) {
        console.error("Failed to load discovery data:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchDiscovery();
    return () => {
      isMounted = false;
    };
  }, [userLocation]);

  // Filtered Products for the curated product section (Limited to top 6, never all categories)
  const displayedProducts = useMemo(() => {
    if (selectedProductTab === "all") {
      return products.slice(0, 6);
    }
    const tabObj = CURATED_PRODUCT_TABS.find((t) => t.id === selectedProductTab);
    if (!tabObj || !tabObj.keywords) {
      return products.slice(0, 6);
    }
    const filtered = products.filter((p) => {
      const text = `${p.name} ${p.category_name || ""} ${p.description || ""}`.toLowerCase();
      return tabObj.keywords!.some((kw) => text.includes(kw));
    });
    return (filtered.length > 0 ? filtered : products).slice(0, 6);
  }, [products, selectedProductTab]);

  // Handle Quick Search Submission
  const handleSearch = (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const q = (customQuery !== undefined ? customQuery : searchQuery).trim();
    if (!q) return;
    setIsDropdownOpen(false);
    router.push(`/explore?q=${encodeURIComponent(q)}`);
  };

  // Add Product to Cart handler
  const handleAddToCart = (product: ProductData) => {
    const price = Number(product.seller_info?.price ?? product.suggested_price_inr ?? 0);
    addItem({
      id: product.id,
      name: product.name,
      price: price,
      regular_price: price,
      image_url: product.default_image_url || null,
      unit: "pcs",
      business_id: 25, // Pandeypur Mega Store
      business_name: product.seller_info?.business_name || "Pandeypur Mega Department Store",
      item_type: "product",
    });
    toast.success(`Added "${product.name}" to cart!`);
  };

  return (
    <div className="flex-1 flex flex-col w-full bg-background">
      {/* ================= 1. HERO SECTION (FINDMY DEER DISCOVERY THEME) ================= */}
      <section className="relative overflow-hidden min-h-[580px] sm:min-h-[640px] lg:min-h-[720px] flex items-center py-16 sm:py-20 lg:py-24 border-b border-border/50">
        {/* Scenic Deer Wildlife Nature Background Image */}
        <div className="absolute inset-0 z-0">
          <Image
            src="/images/hero-deer.jpg"
            alt="Scenic Golden Hour Nature Landscape with Majestic Deer"
            fill
            priority
            className="object-cover object-[75%_center] lg:object-[82%_center]"
            sizes="100vw"
            quality={90}
          />
          {/* Gradient Overlays for High Contrast & Text Legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/70 to-black/35 md:from-black/88 md:via-black/55 md:to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/45" />
          <div className="absolute inset-0 bg-amber-950/10 mix-blend-color" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-7">
          {/* Top Eyebrow Tag */}
          <div className="flex items-center gap-2">
            <span className="text-amber-400 font-extrabold uppercase tracking-[0.2em] text-xs sm:text-sm drop-shadow-md flex items-center gap-2">
              <Sparkles className="size-4 text-amber-400 animate-pulse" />
              THE PREMIER LOCAL DISCOVERY PLATFORM
            </span>
          </div>

          {/* Heading & Subheading */}
          <div className="space-y-3.5 max-w-2xl sm:max-w-3xl">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-white leading-[1.06] drop-shadow-xl">
              Looking for something? <br className="hidden sm:inline" />
              <span className="text-white">Let&apos;s find it.</span>
            </h1>
            <p className="text-sm sm:text-base lg:text-lg text-white/90 max-w-2xl leading-relaxed drop-shadow-md font-medium">
              Discover businesses, places, services, property, courses, products, jobs and more across South Africa &amp; your region.
            </p>
          </div>

          {/* Search Box & Location Selector & Suggestions */}
          <div ref={heroSearchContainerRef} className="relative max-w-2xl w-full space-y-3.5">
            {/* Primary Search Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="relative group flex items-center bg-black/45 backdrop-blur-md border border-white/25 hover:border-white/40 focus-within:border-amber-400/90 focus-within:ring-4 focus-within:ring-amber-400/20 rounded-full px-3 sm:px-4 py-2 sm:py-2.5 shadow-2xl transition-all"
            >
              <div className="pl-1 flex items-center pointer-events-none text-amber-400">
                <Sparkles className="size-5" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.trim()) setIsDropdownOpen(true);
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  if (val.trim()) {
                    setIsDropdownOpen(true);
                  } else {
                    setIsDropdownOpen(false);
                  }
                }}
                placeholder="What are you looking for today?"
                className="w-full h-11 pl-3 pr-4 bg-transparent text-white placeholder:text-white/70 text-xs sm:text-sm font-medium focus:outline-none focus:ring-0 border-0"
              />

              <div className="flex items-center gap-1.5 shrink-0 pr-1">
                {isSearching ? (
                  <Loader2 className="size-4 animate-spin text-amber-400 mr-1" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setSearchResults(null);
                      setIsDropdownOpen(false);
                    }}
                    className="p-1 rounded-full hover:bg-white/15 text-white/70 hover:text-white cursor-pointer mr-1 transition-colors"
                    title="Clear search"
                  >
                    <X className="size-4" />
                  </button>
                ) : null}

                {/* Circular Orange Search Button */}
                <Button
                  type="submit"
                  size="icon"
                  className="size-10 sm:size-11 rounded-full bg-orange-500 hover:bg-orange-600 active:scale-95 text-white shadow-lg cursor-pointer transition-transform shrink-0"
                  title="Search"
                >
                  <Search className="size-5" />
                </Button>
              </div>
            </form>

            {/* Location Selector Bar directly below search */}
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/45 backdrop-blur-md border border-white/20 hover:border-white/40 text-xs font-semibold text-white/95 hover:text-white transition-all cursor-pointer shadow-md"
                  >
                    <MapPin className="size-3.5 text-amber-400 shrink-0" />
                    <span>{userLocation || "Cape Town"}</span>
                    {isDetected && (
                      <span className="size-1.5 rounded-full bg-emerald-400 ring-2 ring-emerald-400/30" title="GPS active" />
                    )}
                    <ChevronDown className="size-3 text-white/60 ml-0.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-60 p-1.5 space-y-1 z-50">
                  <div className="px-2.5 py-1.5 bg-primary/5 rounded-lg mb-1 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        Location Filter
                      </span>
                      <span className="text-xs font-bold text-foreground truncate">
                        {userLocation || "Cape Town"}
                      </span>
                    </div>
                    {isDetected && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                        GPS
                      </span>
                    )}
                  </div>

                  <DropdownMenuItem
                    onClick={() => requestLocation(false)}
                    disabled={isDetecting}
                    className="cursor-pointer py-2 px-2.5 rounded-lg bg-background hover:bg-muted text-primary font-bold text-xs border border-border/50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {isDetecting ? (
                        <Loader2 className="size-3.5 animate-spin text-primary" />
                      ) : (
                        <Navigation className="size-3.5 text-primary" />
                      )}
                      <span>{isDetecting ? "Detecting GPS..." : "Detect Live Location"}</span>
                    </div>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="my-1" />

                  <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1">
                    Select Region
                  </DropdownMenuLabel>

                  <div className="max-h-56 overflow-y-auto space-y-0.5">
                    <DropdownMenuItem
                      onClick={() => setUserLocation("All Locations", false)}
                      className={cn(
                        "cursor-pointer text-xs py-1.5 px-2.5 rounded-lg font-medium",
                        (!userLocation || userLocation === "All Locations") && "font-bold text-primary bg-primary/10"
                      )}
                    >
                      <span>All Locations (Full Catalog)</span>
                    </DropdownMenuItem>
                    {availableLocations.map((loc) => (
                      <DropdownMenuItem
                        key={loc}
                        onClick={() => setUserLocation(loc, false)}
                        className={cn(
                          "cursor-pointer text-xs py-1.5 px-2.5 rounded-lg font-medium",
                          userLocation === loc && "font-bold text-primary bg-primary/10"
                        )}
                      >
                        <span>{loc}</span>
                      </DropdownMenuItem>
                    ))}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* "Try:" Quick Category & Search Recommendation Pills */}
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap pt-1 text-xs">
              <span className="text-white/80 font-bold mr-1 text-xs drop-shadow-sm">Try:</span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("Italian");
                  handleSearch(undefined, "Italian");
                }}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/20 hover:border-white/40 text-white/95 font-medium transition-all cursor-pointer shadow-xs"
              >
                🍕 I&apos;m craving Italian
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("2 bedroom");
                  handleSearch(undefined, "2 bedroom");
                }}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/20 hover:border-white/40 text-white/95 font-medium transition-all cursor-pointer shadow-xs"
              >
                🏠 2 bedroom
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("Need a plumber");
                  handleSearch(undefined, "Need a plumber");
                }}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/20 hover:border-white/40 text-white/95 font-medium transition-all cursor-pointer shadow-xs"
              >
                🔧 Need a plumber
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("Property for rent");
                  handleSearch(undefined, "Property for rent");
                }}
                className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 backdrop-blur-md border border-white/20 hover:border-white/40 text-white/95 font-medium transition-all cursor-pointer shadow-xs"
              >
                🏢 Property for rent
              </button>
              <Link
                href="/explore?type=product"
                className="px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 backdrop-blur-md border border-amber-400/40 text-amber-200 font-semibold transition-all cursor-pointer shadow-xs"
              >
                📦 Products
              </Link>
              <Link
                href="/explore?type=professional"
                className="px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 backdrop-blur-md border border-amber-400/40 text-amber-200 font-semibold transition-all cursor-pointer shadow-xs"
              >
                👨‍💼 Professionals
              </Link>
              <Link
                href="/explore?type=course"
                className="px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 backdrop-blur-md border border-amber-400/40 text-amber-200 font-semibold transition-all cursor-pointer shadow-xs"
              >
                🎓 Courses
              </Link>
              <Link
                href="/explore?type=job"
                className="px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 backdrop-blur-md border border-amber-400/40 text-amber-200 font-semibold transition-all cursor-pointer shadow-xs"
              >
                💼 Jobs
              </Link>
              <Link
                href="/explore?type=business"
                className="px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 backdrop-blur-md border border-amber-400/40 text-amber-200 font-semibold transition-all cursor-pointer shadow-xs"
              >
                🏢 Business
              </Link>
            </div>

            {/* ================= AUTOCOMPLETE SEARCH SUGGESTIONS DROPDOWN ================= */}
            {isDropdownOpen && searchQuery.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-[58px] w-full bg-card rounded-2xl border border-border shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Filter Pills Header */}
                <div className="flex items-center gap-1.5 p-2.5 border-b bg-muted/40 overflow-x-auto scrollbar-none text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveSearchTab("all")}
                    className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                      activeSearchTab === "all"
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-background text-muted-foreground border hover:bg-muted"
                    }`}
                  >
                    All ({searchCounts.all})
                  </button>

                  {searchCounts.products > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveSearchTab("products")}
                      className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
                        activeSearchTab === "products"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-background text-muted-foreground border hover:bg-muted"
                      }`}
                    >
                      <Package className="size-3" />
                      <span>Products ({searchCounts.products})</span>
                    </button>
                  )}

                  {searchCounts.services > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveSearchTab("services")}
                      className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
                        activeSearchTab === "services"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-background text-muted-foreground border hover:bg-muted"
                      }`}
                    >
                      <Briefcase className="size-3" />
                      <span>Services ({searchCounts.services})</span>
                    </button>
                  )}

                  {searchCounts.businesses > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveSearchTab("businesses")}
                      className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
                        activeSearchTab === "businesses"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-background text-muted-foreground border hover:bg-muted"
                      }`}
                    >
                      <Building2 className="size-3" />
                      <span>Businesses ({searchCounts.businesses})</span>
                    </button>
                  )}

                  {searchCounts.professionals > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveSearchTab("professionals")}
                      className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
                        activeSearchTab === "professionals"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-background text-muted-foreground border hover:bg-muted"
                      }`}
                    >
                      <UserCheck className="size-3" />
                      <span>Professionals ({searchCounts.professionals})</span>
                    </button>
                  )}

                  {searchCounts.categories > 0 && (
                    <button
                      type="button"
                      onClick={() => setActiveSearchTab("categories")}
                      className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
                        activeSearchTab === "categories"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "bg-background text-muted-foreground border hover:bg-muted"
                      }`}
                    >
                      <FolderTree className="size-3" />
                      <span>Categories ({searchCounts.categories})</span>
                    </button>
                  )}
                </div>

                {/* Suggestions List Container */}
                <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50 text-left">
                  {displayedSearchItems.length === 0 ? (
                    <div className="p-6 text-center space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        No results found for &quot;<span className="text-foreground">{searchQuery}</span>&quot;
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-1 text-xs cursor-pointer"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          handleSearch();
                        }}
                      >
                        Search Full Marketplace
                      </Button>
                    </div>
                  ) : (
                    displayedSearchItems.map((item, idx) => {
                      const isProfile = item.type === "business" || item.type === "professional";

                      return (
                        <div
                          key={`${item.type}-${item.id}-${idx}`}
                          className="p-3 hover:bg-muted/50 transition-colors flex items-center justify-between gap-3 group"
                        >
                          {/* Left: Icon, Name, Category Badges & Subtitle */}
                          <div
                            onClick={() => {
                              setIsDropdownOpen(false);
                              if (item.type === "product") {
                                setSelectedProductForStores({ id: item.id, name: item.title });
                                setProductStoresDialogOpen(true);
                              } else if (isProfile) {
                                router.push(item.profileHref || item.href);
                              } else {
                                router.push(item.storefrontHref || item.listingHref || item.href);
                              }
                            }}
                            className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer text-left"
                          >
                            {/* Icon Badge */}
                            <div
                              className={`size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                item.type === "product"
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400"
                                  : item.type === "service"
                                  ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-400"
                                  : item.type === "business"
                                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400"
                                  : item.type === "professional"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400"
                                  : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-400"
                              }`}
                            >
                              {item.type === "product" ? (
                                <Package className="size-4" />
                              ) : item.type === "service" ? (
                                <Briefcase className="size-4" />
                              ) : item.type === "business" ? (
                                <Building2 className="size-4" />
                              ) : item.type === "professional" ? (
                                <UserCheck className="size-4" />
                              ) : (
                                <FolderTree className="size-4" />
                              )}
                            </div>

                            {/* Text info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                                  {item.title}
                                </span>

                                {/* Type Pill */}
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1.5 py-0 uppercase font-bold tracking-wider ${
                                    item.type === "product"
                                      ? "border-amber-300 text-amber-700 bg-amber-50 dark:bg-amber-950/40"
                                      : item.type === "service"
                                      ? "border-sky-300 text-sky-700 bg-sky-50 dark:bg-sky-950/40"
                                      : item.type === "business"
                                      ? "border-indigo-300 text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40"
                                      : item.type === "professional"
                                      ? "border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40"
                                      : "border-rose-300 text-rose-700 bg-rose-50 dark:bg-rose-950/40"
                                  }`}
                                >
                                  {item.type}
                                </Badge>

                                {item.category_name && item.type !== "category" && (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] px-1.5 py-0 bg-muted text-muted-foreground font-semibold flex items-center gap-1"
                                  >
                                    <Tag className="size-2.5" />
                                    <span>{item.category_name}</span>
                                  </Badge>
                                )}
                              </div>

                              {item.subtitle && (
                                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Right: Quick Action Buttons */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {isProfile ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="default"
                                className="h-6 text-[10px] font-bold px-2 bg-primary hover:bg-primary/90 text-primary-foreground gap-1 cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsDropdownOpen(false);
                                  router.push(item.profileHref || item.href);
                                }}
                              >
                                <span>View Profile</span>
                                <ExternalLink className="size-2.5" />
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                className="h-6 text-[10px] font-bold px-2 hover:bg-primary hover:text-primary-foreground gap-1 transition-all cursor-pointer"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsDropdownOpen(false);
                                  if (item.type === "product") {
                                    setSelectedProductForStores({ id: item.id, name: item.title });
                                    setProductStoresDialogOpen(true);
                                  } else {
                                    router.push(item.storefrontHref || item.listingHref || item.href);
                                  }
                                }}
                              >
                                {item.type === "product" ? (
                                  <>
                                    <Store className="size-3" />
                                    <span>Compare Stores</span>
                                  </>
                                ) : item.type === "service" ? (
                                  <>
                                    <Store className="size-3" />
                                    <span>Store Front</span>
                                  </>
                                ) : (
                                  <>
                                    <span>Open</span>
                                    <ChevronRight className="size-3" />
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Dropdown Footer: View All Listings */}
                <div className="p-2 bg-muted/40 border-t flex items-center justify-between text-xs px-3">
                  <span className="text-[10px] text-muted-foreground">
                    Top suggestions for &quot;<strong className="text-foreground">{searchQuery}</strong>&quot;
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[11px] font-bold text-primary hover:text-primary gap-1 cursor-pointer p-0 hover:bg-transparent"
                    onClick={() => {
                      setIsDropdownOpen(false);
                      handleSearch();
                    }}
                  >
                    <span>View All</span>
                    <ArrowRight className="size-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Live Metric Stats Bar (Glassmorphic cards over hero landscape) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 pt-6 border-t border-white/20 max-w-5xl">
            {[
              { label: "Local Products", value: "660+", sub: "18 Local Stores", icon: Package },
              { label: "Bookable Services", value: "90+", sub: "Verified Providers", icon: Wrench },
              { label: "Top Experts", value: "50+", sub: "Doctors & Mentors", icon: UserCheck },
              { label: "Certified Programs", value: "170+", sub: "Degrees & Diplomas", icon: GraduationCap },
              { label: "Career Openings", value: "Active", sub: "Local & On-site", icon: Briefcase },
              { label: "Local Store Network", value: "18 Stores", sub: "Verified Partners", icon: Store },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className="p-3 rounded-xl border border-white/20 bg-black/45 backdrop-blur-md flex items-center gap-2.5 shadow-lg">
                  <div className="size-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-black text-white">{stat.value}</div>
                    <div className="text-[10px] text-white/75 truncate">{stat.label}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= TRENDING CATEGORIES ACCORDING TO USER LOCATION ================= */}
      <TrendingLocationCategories location={userLocation} />

      {/* ================= 2. FEATURED PRODUCTS (CURATED TABS - NEVER ALL CATEGORIES) ================= */}
      <section id="products" className="py-14 sm:py-18 border-b border-border/40 bg-muted/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                <Package className="size-3.5" />
                <span>Local Stores &amp; Products</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Trending Products from Varanasi Stores
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Compare live prices across 18+ Pandeypur stores with doorstep delivery or counter pickup.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs font-bold h-9 px-4 rounded-xl border-primary/30 text-primary hover:bg-primary/10 transition-colors shrink-0"
            >
              <Link href="/products" className="inline-flex items-center gap-1.5">
                <span>View All 660+ Products</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          {/* Curated Product Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {CURATED_PRODUCT_TABS.map((tab) => {
              const isSelected = selectedProductTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedProductTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Products Grid: Enforces Exactly 3 Cards Per Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-5">
            {displayedProducts.map((p) => {
              const priceNum = Number(p.seller_info?.price ?? p.suggested_price_inr ?? 0);
              const storeName = p.seller_info?.business_name || "Pandeypur Stores Network";
              const imageUrl = p.default_image_url || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&auto=format&fit=crop&q=60";

              return (
                <Card
                  key={p.id}
                  className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      {/* Product Image & Badges */}
                      <div className="relative aspect-4/3 w-full rounded-xl overflow-hidden bg-muted border border-border/40">
                        <Image
                          src={imageUrl}
                          alt={p.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <Badge className="bg-background/90 text-foreground text-[10px] font-bold backdrop-blur-xs shadow-2xs border border-border/50">
                            {p.brand || "Verified Brand"}
                          </Badge>
                        </div>
                        {p.category_name && (
                          <div className="absolute bottom-2 left-2">
                            <Badge variant="secondary" className="text-[10px] font-semibold bg-background/80 backdrop-blur-xs">
                              {p.category_name}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Product Title & Store */}
                      <div className="space-y-1">
                        <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                          {p.name}
                        </h3>
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 truncate">
                          <Store className="size-3 text-primary shrink-0" />
                          <span>{storeName}</span>
                        </p>
                      </div>
                    </div>

                    {/* Pricing & Actions */}
                    <div className="space-y-3 pt-2 border-t border-border/40">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-base font-black text-foreground">
                            ₹{priceNum.toLocaleString("en-IN")}
                          </div>
                          <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
                            <TrendingDown className="size-2.5" />
                            <span>18 Local Stores Selling</span>
                          </div>
                        </div>

                        {/* Multi-Store Compare Button */}
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => {
                            setSelectedProductForStores({ id: p.id, name: p.name });
                            setProductStoresDialogOpen(true);
                          }}
                          className="h-8 px-2.5 text-[11px] font-bold rounded-lg border border-border/60 gap-1 cursor-pointer hover:border-primary/40"
                        >
                          <span>Compare Stores</span>
                          <ChevronRight className="size-3" />
                        </Button>
                      </div>

                      {/* Direct Add to Cart */}
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddToCart(p)}
                        className="w-full h-9 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <ShoppingCart className="size-3.5" />
                        <span>Add to Cart</span>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= 3. ON-DEMAND LOCAL SERVICES ================= */}
      <section id="services" className="py-14 sm:py-18 border-b border-border/40 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Wrench className="size-3.5" />
                <span>On-Demand Services</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Professional &amp; Home Services in Your Area
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Book certified technicians, mentors, and corporate specialists with transparent upfront pricing.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs font-bold h-9 px-4 rounded-xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors shrink-0"
            >
              <Link href="/explore?type=service" className="inline-flex items-center gap-1.5">
                <span>View All 90+ Services</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-3 gap-5">
            {services.slice(0, 6).map((s) => {
              const price = Number(s.suggested_price_inr ?? 0);
              const duration = s.estimated_duration || "60 mins";
              const imageUrl = s.default_image_url || "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&auto=format&fit=crop&q=60";

              return (
                <Card
                  key={s.id}
                  className="group rounded-2xl border border-border/60 bg-card overflow-hidden hover:border-emerald-500/40 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <CardContent className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="relative aspect-16/10 w-full rounded-xl overflow-hidden bg-muted border border-border/40">
                        <Image
                          src={imageUrl}
                          alt={s.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2 left-2">
                          <Badge className="bg-background/90 text-foreground text-[10px] font-bold backdrop-blur-xs border border-border/50">
                            {s.category_name || "General Service"}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                          {s.name}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {s.description || "Certified expert service with guaranteed satisfaction and flexible appointment scheduling."}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 pt-2 border-t border-border/40">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="size-3.5 text-primary" />
                          <span>{duration}</span>
                        </div>
                        <div className="text-sm font-black text-foreground">
                          {price > 0 ? `₹${price.toLocaleString("en-IN")}` : "Free Consultation"}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedServiceForStores({ id: s.id, name: s.name });
                            setServiceStoresDialogOpen(true);
                          }}
                          className="h-8 text-[11px] font-bold rounded-lg border-border/70 hover:border-primary/50 cursor-pointer"
                        >
                          Compare (19)
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            setSelectedServiceForBooking({
                              id: s.id,
                              name: s.name,
                              price: price,
                              regular_price: price,
                              estimated_duration: duration,
                              default_image_url: imageUrl,
                            });
                            setServiceBookingDialogOpen(true);
                          }}
                          className="h-8 text-[11px] font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer"
                        >
                          <Calendar className="size-3" />
                          <span>Book</span>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= 4. VERIFIED PROFESSIONALS SPOTLIGHT ================= */}
      <section id="professionals" className="py-14 sm:py-18 border-b border-border/40 bg-muted/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <UserCheck className="size-3.5" />
                <span>Verified Experts</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Consult Verified Professionals &amp; Specialists
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Connect directly with certified doctors, legal consultants, private tutors, and supply managers.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs font-bold h-9 px-4 rounded-xl border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 transition-colors shrink-0"
            >
              <Link href="/explore?type=professional" className="inline-flex items-center gap-1.5">
                <span>Browse All Professionals</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {professionals.slice(0, 4).map((prof) => {
              const avatar = prof.avatar_url || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80";

              return (
                <Card
                  key={prof.id}
                  className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 hover:border-blue-500/40 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3.5 text-center flex flex-col items-center">
                    <div className="relative size-20 rounded-full overflow-hidden border-2 border-primary/20 bg-muted">
                      <Image src={avatar} alt={prof.name} fill className="object-cover" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-center gap-1">
                        <h3 className="font-bold text-sm text-foreground truncate">{prof.name}</h3>
                        {prof.is_verified && <CheckCircle2 className="size-3.5 text-blue-500 shrink-0" />}
                      </div>
                      <Badge variant="secondary" className="text-[10px] font-bold text-primary bg-primary/10">
                        {prof.profession_type || prof.category_name || "Specialist"}
                      </Badge>
                      <p className="text-[11px] text-muted-foreground pt-1 line-clamp-2">
                        {prof.about || "Dedicated professional committed to delivering high quality consultations."}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2.5 pt-3 border-t border-border/40 text-xs">
                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span>Experience:</span>
                      <span className="font-semibold text-foreground">{prof.experience_years || 5}+ Years</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground text-[11px]">
                      <span>Location:</span>
                      <span className="font-semibold text-foreground">{prof.city || "Varanasi"}</span>
                    </div>
                    <Button
                      size="sm"
                      asChild
                      className="w-full h-8 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <Link href={`/explore?type=professional&q=${encodeURIComponent(prof.name)}`}>
                        View Profile
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= 5. ACCREDITED COURSES & DEGREE PROGRAMS ================= */}
      <section id="courses" className="py-14 sm:py-18 border-b border-border/40 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <GraduationCap className="size-3.5" />
                <span>Academic &amp; Skill Programs</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Certified Courses &amp; Degree Programs
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Enroll in verified skill diplomas, college degrees, and industry-recognized certifications.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs font-bold h-9 px-4 rounded-xl border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors shrink-0"
            >
              <Link href="/courses" className="inline-flex items-center gap-1.5">
                <span>View All 170+ Courses</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
            {courses.slice(0, 3).map((c) => {
              const durationStr = `${c.duration_value || 1} ${c.duration_unit?.replace("_", " ") || "Year"}`;

              return (
                <Card
                  key={c.id}
                  className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 hover:border-amber-500/40 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-bold">
                        {c.authority_type || "Certified Program"}
                      </Badge>
                      <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                        <Clock className="size-3" />
                        {durationStr}
                      </span>
                    </div>

                    <h3 className="font-bold text-base text-foreground leading-snug line-clamp-2">
                      {c.name}
                    </h3>

                    <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                      {c.description || "Comprehensive academic syllabus and live project training designed to accelerate your career."}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-border/40">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Seats Available:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        {c.seats_available || 60} Seats
                      </span>
                    </div>

                    <Button
                      size="sm"
                      asChild
                      className="w-full h-9 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1.5"
                    >
                      <Link href={`/courses/${c.slug || c.id}`}>
                        <span>Explore Curriculum</span>
                        <ChevronRight className="size-3.5" />
                      </Link>
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= 6. LATEST CAREER & JOB OPENINGS ================= */}
      <section id="jobs" className="py-14 sm:py-18 border-b border-border/40 bg-muted/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <Briefcase className="size-3.5" />
                <span>Career Opportunities</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Active Job Openings &amp; Vacancies
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Apply directly to verified openings in medical, tech, retail management, and academics.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs font-bold h-9 px-4 rounded-xl border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 transition-colors shrink-0"
            >
              <Link href="/jobs" className="inline-flex items-center gap-1.5">
                <span>View All Openings</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {jobs.slice(0, 3).map((job) => (
              <Card
                key={job.id}
                className="rounded-2xl border border-border/60 bg-card p-5 space-y-4 hover:border-purple-500/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                      {job.department || "General"}
                    </Badge>
                    <span className="text-[11px] font-semibold text-muted-foreground">
                      {job.work_mode || "On-site"}
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-foreground leading-snug line-clamp-2">
                    {job.title || job.name}
                  </h3>

                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Building2 className="size-3.5 text-primary shrink-0" />
                    <span>{job.company_name || "Verified Organization"}</span>
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-border/40 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Salary:</span>
                    <span className="font-black text-foreground">{job.salary_range || "Negotiable"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Location:</span>
                    <span className="font-semibold text-foreground">{job.location || "Varanasi / Delhi"}</span>
                  </div>

                  <Button
                    size="sm"
                    asChild
                    className="w-full h-8 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white gap-1"
                  >
                    <Link href={`/jobs/${job.slug || job.id}`}>
                      <span>Apply Now</span>
                      <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 7. PANDEYPUR LOCAL STORES NETWORK ================= */}
      <section id="stores" className="py-14 sm:py-18 border-b border-border/40 bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                <Store className="size-3.5" />
                <span>Neighborhood Commerce</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Shop from Verified Pandeypur Stores
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Support your neighborhood businesses situated around Pandeypur, Varanasi with guaranteed quality.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs font-bold h-9 px-4 rounded-xl border-primary/30 text-primary hover:bg-primary/10 transition-colors shrink-0"
            >
              <Link href="/explore?type=business" className="inline-flex items-center gap-1.5">
                <span>All 18 Stores</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                id: 25,
                name: "Pandeypur Mega Department Store",
                category: "Supermarket & Groceries",
                address: "Pandeypur Main Chauraha, Varanasi",
                phone: "+91 94152 10103",
                slug: "pandeypur-mega-department-store",
              },
              {
                id: 28,
                name: "Shiv Ganga Electronics & Appliances",
                category: "Consumer Electronics",
                address: "Near Pandeypur Flyover, Varanasi",
                phone: "+91 94152 10106",
                slug: "shiv-ganga-electronics-appliances",
              },
              {
                id: 27,
                name: "Kashi Vishwanath Book Depot & Stationery",
                category: "Books & Office Supplies",
                address: "Station Road, Pandeypur, Varanasi",
                phone: "+91 94152 10105",
                slug: "kashi-vishwanath-book-depot",
              },
              {
                id: 10,
                name: "Kisan Fresh Mandi",
                category: "Organic Fruits & Vegetables",
                address: "Hukulganj Road, Pandeypur, Varanasi",
                phone: "+91 94152 10101",
                slug: "kisan-fresh-mandi",
              },
              {
                id: 29,
                name: "Aarogya Pharmacy & Wellness",
                category: "Medicines & Health Supplements",
                address: "Premchand Nagar Colony, Pandeypur",
                phone: "+91 94152 10107",
                slug: "aarogya-pharmacy-wellness",
              },
              {
                id: 26,
                name: "Banaras Sweets & Dairy Parlour",
                category: "Fresh Dairy & Sweets",
                address: "Panchkroshi Marg, Pandeypur, Varanasi",
                phone: "+91 94152 10104",
                slug: "banaras-sweets-dairy-parlour",
              },
            ].map((store) => (
              <Card
                key={store.id}
                className="rounded-2xl border border-border/60 bg-card p-5 space-y-3.5 hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="text-[10px] font-semibold">
                      {store.category}
                    </Badge>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <span className="size-1.5 rounded-full bg-emerald-500" />
                      Open Now
                    </span>
                  </div>

                  <h3 className="font-bold text-base text-foreground leading-snug">
                    {store.name}
                  </h3>

                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 pt-1">
                    <MapPin className="size-3.5 text-primary shrink-0" />
                    <span className="truncate">{store.address}</span>
                  </p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Phone className="size-3.5 text-primary shrink-0" />
                    <span>{store.phone}</span>
                  </p>
                </div>

                <Button
                  size="sm"
                  asChild
                  className="w-full h-8 text-xs font-bold rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                >
                  <Link href={`/explore?type=product`}>
                    Browse Store Inventory
                  </Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 8. WHY CHOOSE EDUBIRD PLATFORM ================= */}
      <section className="py-14 sm:py-18 bg-muted/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <Badge variant="outline" className="text-xs font-bold text-primary bg-primary/10 border-primary/20">
              Platform Guarantee
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Why Thousands Trust EduBird
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Built to make local commerce, skill education, and professional consultations transparent and effortless.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                title: "18+ Verified Stores",
                desc: "Compare identical goods across local stores and buy at the lowest verified market price.",
                icon: Store,
              },
              {
                title: "100% Vetted Profiles",
                desc: "Every professional and service provider undergoes credential verification before listing.",
                icon: ShieldCheck,
              },
              {
                title: "Fast Local Delivery",
                desc: "Same-day delivery and convenient store counter pickup across Pandeypur and Varanasi.",
                icon: Zap,
              },
              {
                title: "Direct Support & Return",
                desc: "Dedicated support team ensuring smooth order tracking, refunds, and resolution.",
                icon: CheckCircle2,
              },
            ].map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div key={i} className="p-5 rounded-2xl border border-border/60 bg-card space-y-2.5 text-center flex flex-col items-center">
                  <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="font-bold text-sm text-foreground">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================= DIALOGS ================= */}
      {/* 1. Multi-Store Product Comparison Dialog */}
      <ProductStoresDialog
        productId={selectedProductForStores?.id ?? null}
        productName={selectedProductForStores?.name}
        open={productStoresDialogOpen}
        onOpenChange={setProductStoresDialogOpen}
      />

      {/* 2. Multi-Store Service Comparison Dialog */}
      <ServiceStoresDialog
        serviceId={selectedServiceForStores?.id ?? null}
        serviceName={selectedServiceForStores?.name}
        open={serviceStoresDialogOpen}
        onOpenChange={setServiceStoresDialogOpen}
        onBookService={(bookingItem) => {
          setSelectedServiceForBooking(bookingItem);
          setServiceBookingDialogOpen(true);
        }}
      />

      {/* 3. Instant Service Booking Dialog */}
      <ServiceBookingDialog
        open={serviceBookingDialogOpen}
        onOpenChange={setServiceBookingDialogOpen}
        service={selectedServiceForBooking}
      />
    </div>
  );
}
