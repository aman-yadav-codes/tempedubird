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
  Trophy,
  Plus,
  Building,
  Car,
  UtensilsCrossed,
  Landmark,
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
import { buildDiscoverySeoUrl } from "@/lib/utils/seo-slug";
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

  const displayCity = useMemo(() => {
    return userLocation && userLocation.toLowerCase() !== "all locations" ? userLocation : "Your Area";
  }, [userLocation]);

  // Unified Discovery Data
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [services, setServices] = useState<ServiceData[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalData[]>([]);
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [jobs, setJobs] = useState<JobData[]>([]);
  const [businesses, setBusinesses] = useState<BusinessData[]>([]);
  const [properties, setProperties] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [dishes, setDishes] = useState<any[]>([]);

  const financialCount = useMemo(() => {
    return services.filter(
      (s: any) =>
        s.category_type === "finance" ||
        s.category_name?.toLowerCase().includes("finance") ||
        s.name?.toLowerCase().includes("finance") ||
        s.name?.toLowerCase().includes("loan") ||
        s.name?.toLowerCase().includes("tax") ||
        s.name?.toLowerCase().includes("wealth") ||
        s.name?.toLowerCase().includes("audit")
    ).length;
  }, [services]);

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
            setProperties(json.data.properties || []);
            setVehicles(json.data.vehicles || []);
            setEvents(json.data.events || []);
            setDishes(json.data.dishes || []);
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

  // Filtered Products for the curated product section (Limited to top 8, 4 per row)
  const displayedProducts = useMemo(() => {
    if (selectedProductTab === "all") {
      return products.slice(0, 8);
    }
    const tabObj = CURATED_PRODUCT_TABS.find((t) => t.id === selectedProductTab);
    if (!tabObj || !tabObj.keywords) {
      return products.slice(0, 8);
    }
    const filtered = products.filter((p) => {
      const text = `${p.name} ${p.category_name || ""} ${p.description || ""}`.toLowerCase();
      return tabObj.keywords!.some((kw) => text.includes(kw));
    });
    return (filtered.length > 0 ? filtered : products).slice(0, 8);
  }, [products, selectedProductTab]);

  // Handle Quick Search Submission
  const handleSearch = (e?: React.FormEvent, customQuery?: string) => {
    if (e) e.preventDefault();
    const q = (customQuery !== undefined ? customQuery : searchQuery).trim();
    if (!q) return;
    setIsDropdownOpen(false);
    const locParam = userLocation && userLocation !== "All Locations" ? `&city=${encodeURIComponent(userLocation)}` : "";
    router.push(`/explore?q=${encodeURIComponent(q)}${locParam}`);
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
      {/* ================= 1. HERO SECTION (143PANDA DISCOVERY THEME) ================= */}
      <section className="relative overflow-hidden min-h-[580px] sm:min-h-[640px] lg:min-h-[690px] flex items-center py-12 sm:py-16 lg:py-20 bg-gradient-to-b from-[#259bf8] via-[#65befd] to-[#d0ecff]">
        {/* Soft atmospheric clouds */}
        <div className="absolute top-4 left-10 w-72 h-28 bg-white/35 rounded-full blur-2xl pointer-events-none z-0" />
        <div className="absolute top-16 right-16 w-96 h-36 bg-white/40 rounded-full blur-3xl pointer-events-none z-0" />
        <div className="absolute bottom-10 left-1/3 w-80 h-28 bg-white/30 rounded-full blur-2xl pointer-events-none z-0" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Eyebrow, Heading, Search Bar, Categories */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6">
              {/* Top Eyebrow Tag & Location Badge */}
              <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0c1a2e] text-white border border-slate-700/60 text-[11px] sm:text-xs font-bold shadow-md">
                  <Trophy className="size-3.5 text-amber-400" />
                  <span className="text-amber-400 font-extrabold tracking-wider">THE PREMIER LOCAL DISCOVERY PLATFORM</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      window.dispatchEvent(new CustomEvent("edubird-open-location-dialog"));
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0c1a2e] hover:bg-[#152742] text-white border border-slate-700/60 text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-md active:scale-95"
                  title="Click to select or change location"
                >
                  <MapPin className="size-3.5 text-amber-400" />
                  <span>Location: <strong className="text-white">{displayCity}</strong></span>
                  <span className="text-[11px] text-amber-400/90 ml-0.5">Change ⌵</span>
                </button>
              </div>

              {/* Heading & Subheading matching mockup */}
              <div className="space-y-3 max-w-2xl">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[68px] font-black tracking-tight text-[#071933] leading-[1.05]">
                  <span className="block">Find Anything,</span>
                  <span className="block">Anywhere Near You. <span className="inline-block text-amber-400 text-3xl sm:text-4xl">✨</span></span>
                </h1>
                <p className="text-sm sm:text-base text-[#0f284d]/90 max-w-xl leading-relaxed font-medium">
                  From products and services to businesses, professionals, jobs, property and events — discover everything you need, all in one place.
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
                  className="relative group flex items-center bg-white rounded-full shadow-[0_12px_40px_rgba(0,0,0,0.12)] border border-sky-100 px-3 sm:px-4 py-2 sm:py-2.5 transition-all focus-within:ring-4 focus-within:ring-sky-400/20"
                >
                  <div className="pl-1 flex items-center pointer-events-none text-sky-500">
                    <Search className="size-5" />
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
                    className="w-full h-11 pl-3 pr-4 bg-transparent text-slate-900 placeholder:text-slate-400 text-xs sm:text-sm font-medium focus:outline-none focus:ring-0 border-0"
                  />

                  <div className="flex items-center gap-1.5 shrink-0 pr-1">
                    {isSearching ? (
                      <Loader2 className="size-4 animate-spin text-sky-500 mr-1" />
                    ) : searchQuery ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults(null);
                          setIsDropdownOpen(false);
                        }}
                        className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer mr-1 transition-colors"
                        title="Clear search"
                      >
                        <X className="size-4" />
                      </button>
                    ) : null}

                    {/* Circular Bright Blue Search Button matching mockup */}
                    <Button
                      type="submit"
                      size="icon"
                      className="size-10 sm:size-11 rounded-full bg-[#0080ff] hover:bg-[#0070e0] active:scale-95 text-white shadow-md cursor-pointer transition-transform shrink-0"
                      title="Search"
                    >
                      <Search className="size-5" />
                    </Button>
                  </div>
                </form>

                {/* ================= AUTOCOMPLETE SEARCH SUGGESTIONS DROPDOWN ================= */}
                {isDropdownOpen && searchQuery.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-[58px] w-full bg-card rounded-2xl border border-border shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
                    {/* Filter Pills Header */}
                    <div className="flex items-center gap-1.5 p-2.5 border-b bg-muted/40 overflow-x-auto scrollbar-none text-xs">
                      <button
                        type="button"
                        onClick={() => setActiveSearchTab("all")}
                        className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] ${activeSearchTab === "all"
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
                          className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${activeSearchTab === "products"
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
                          className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${activeSearchTab === "services"
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
                          className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${activeSearchTab === "businesses"
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
                          className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${activeSearchTab === "professionals"
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
                          className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${activeSearchTab === "categories"
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
                                  className={`size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${item.type === "product"
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
                                      className={`text-[9px] px-1.5 py-0 uppercase font-bold tracking-wider ${item.type === "product"
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
            </div>

            {/* Right Column: 3D Baby Panda with Magnifying Glass & Directional Signpost */}
            <div className="lg:col-span-5 hidden lg:flex items-center justify-center relative">
              <div className="relative w-full max-w-[480px] aspect-[484/452] flex items-center justify-center">
                <Image
                  src="/images/hero-panda-3d-clean.webp"
                  alt="143Panda 3D Discovery Mascot & Navigation"
                  width={484}
                  height={452}
                  priority
                  className="w-full h-auto object-contain drop-shadow-[0_20px_40px_rgba(0,80,180,0.18)]"
                />
              </div>
        </div>
      </div>

              {/* Live Metric Stats Bar (Glassmorphic cards over hero landscape - Click opens dedicated page according to selected location) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 pt-6 border-t border-white/50 w-full relative z-20">
                {[
                  {
                    label: "Local Products",
                    value: products.length > 0 ? `${products.length}+` : "660+",
                    sub: "18 Local Stores",
                    icon: Package,
                    type: "product",
                  },
                  {
                    label: "Bookable Services",
                    value: services.length > 0 ? `${services.length}+` : "90+",
                    sub: "Verified Providers",
                    icon: Wrench,
                    type: "service",
                  },
                  {
                    label: "Top Experts",
                    value: professionals.length > 0 ? `${professionals.length}+` : "50+",
                    sub: "Doctors & Mentors",
                    icon: UserCheck,
                    type: "professional",
                  },
                  {
                    label: "Certified Programs",
                    value: courses.length > 0 ? `${courses.length}+` : "170+",
                    sub: "Degrees & Diplomas",
                    icon: GraduationCap,
                    type: "course",
                  },
                  {
                    label: "Career Openings",
                    value: jobs.length > 0 ? `${jobs.length}+` : "Active",
                    sub: "Local & On-site",
                    icon: Briefcase,
                    type: "job",
                  },
                  {
                    label: "Local Store Network",
                    value: businesses.length > 0 ? `${businesses.length} Stores` : "18 Stores",
                    sub: "Verified Partners",
                    icon: Store,
                    type: "business",
                  },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  const locParam = userLocation && userLocation !== "All Locations" ? `&city=${encodeURIComponent(userLocation)}` : "";
                  const targetUrl = `/explore?type=${stat.type}${locParam}`;

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => router.push(targetUrl)}
                      className="p-3 rounded-2xl border border-white/80 bg-white/85 hover:bg-white hover:border-sky-300 hover:scale-[1.03] active:scale-[0.98] backdrop-blur-md flex items-center gap-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all cursor-pointer text-left group"
                      title={`Explore ${stat.label}${userLocation && userLocation !== "All Locations" ? ` in ${userLocation}` : ""}`}
                    >
                      <div className="size-8 rounded-xl bg-sky-500/10 text-sky-600 group-hover:bg-sky-500 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-900 group-hover:text-sky-600 transition-colors">{stat.value}</div>
                        <div className="text-[10px] text-slate-600 group-hover:text-slate-900 truncate font-medium">{stat.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Row 2: Property, Event, Dishes, Vehicle, Financials */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3 pt-2.5 sm:pt-3 w-full relative z-20">
                {[
                  {
                    label: "Property & Real Estate",
                    value: properties.length > 0 ? `${properties.length}+` : "26+",
                    sub: "Commercial & Residential",
                    icon: Building,
                    type: "property",
                    targetUrl: "/explore?type=property",
                  },
                  {
                    label: "Events & Expos",
                    value: events.length > 0 ? `${events.length}+` : "50+",
                    sub: "Festivals & Conferences",
                    icon: Calendar,
                    type: "event",
                    targetUrl: "/explore?type=event",
                  },
                  {
                    label: "Dishes & Dining",
                    value: dishes.length > 0 ? `${dishes.length}+` : "20+",
                    sub: "Food Menus & Cuisines",
                    icon: UtensilsCrossed,
                    type: "dish",
                    targetUrl: "/explore?type=dish",
                  },
                  {
                    label: "Vehicles & Mobility",
                    value: vehicles.length > 0 ? `${vehicles.length}+` : "29+",
                    sub: "Cars, Bikes & Transport",
                    icon: Car,
                    type: "vehicle",
                    targetUrl: "/explore?type=vehicle",
                  },
                  {
                    label: "Financial Services",
                    value: financialCount > 0 ? `${financialCount}+` : "25+",
                    sub: "Loans, Tax & Wealth",
                    icon: Landmark,
                    type: "financial",
                    targetUrl: "/explore?type=service&category=all-financial-services",
                  },
                ].map((stat, i) => {
                  const Icon = stat.icon;
                  const locParam = userLocation && userLocation !== "All Locations" ? `&city=${encodeURIComponent(userLocation)}` : "";
                  const separator = stat.targetUrl.includes("?") ? "&" : "?";
                  const targetUrl = `${stat.targetUrl}${locParam ? `${separator}city=${encodeURIComponent(userLocation)}` : ""}`;

                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => router.push(targetUrl)}
                      className="p-3 rounded-2xl border border-white/80 bg-white/85 hover:bg-white hover:border-sky-300 hover:scale-[1.03] active:scale-[0.98] backdrop-blur-md flex items-center gap-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all cursor-pointer text-left group"
                      title={`Explore ${stat.label}${userLocation && userLocation !== "All Locations" ? ` in ${userLocation}` : ""}`}
                    >
                      <div className="size-8 rounded-xl bg-sky-500/10 text-sky-600 group-hover:bg-sky-500 group-hover:text-white flex items-center justify-center shrink-0 transition-colors">
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-black text-slate-900 group-hover:text-sky-600 transition-colors">{stat.value}</div>
                        <div className="text-[10px] text-slate-600 group-hover:text-slate-900 truncate font-medium">{stat.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Curved Wave Divider at Bottom of Hero */}
            <div className="absolute -bottom-1 left-0 right-0 overflow-hidden leading-none pointer-events-none z-10">
              <svg
                viewBox="0 0 1440 90"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="w-full h-10 sm:h-14 md:h-16"
                preserveAspectRatio="none"
              >
                <path
                  d="M0,32 C360,75 720,10 1080,48 C1260,66 1380,38 1440,32 L1440,90 L0,90 Z"
                  fill="#0284c7"
                  opacity="0.25"
                />
                <path
                  d="M0,48 C320,85 700,24 1060,58 C1240,74 1360,52 1440,48 L1440,90 L0,90 Z"
                  fill="white"
                />
              </svg>
            </div>
          </section>

          {/* ================= TRENDING CATEGORIES ACCORDING TO USER LOCATION ================= */}
          <TrendingLocationCategories location={userLocation} />

          {/* ================= ADD LISTING CALL TO ACTION SECTION ================= */}
          <section className="py-12 sm:py-16 bg-gradient-to-br from-amber-500/10 via-background to-sky-500/10 border-b border-border/40 relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
              <div className="bg-card border border-border/80 shadow-xl rounded-3xl p-6 sm:p-10 lg:p-12 relative overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-8">
                {/* Decorative background glow */}
                <div className="absolute -right-20 -top-20 size-72 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -left-20 -bottom-20 size-72 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />

                {/* Left side: Heading, description, and key value props */}
                <div className="space-y-4 max-w-2xl text-center lg:text-left">
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs font-black tracking-wide">
                    <Sparkles className="size-3.5 text-amber-500" />
                    <span>GROW YOUR BUSINESS &amp; REACH CUSTOMERS</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight leading-tight">
                    Want to List Your Business, Store, or Services?
                  </h2>

                  <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                    Join verified businesses, retail stores, academic coaches, and professional experts. Showcase your listings to high-intent local and international customers, get direct leads, and scale your brand.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-muted/40 border border-border/50 text-xs font-bold text-foreground">
                      <div className="size-7 rounded-xl bg-amber-500/20 text-amber-600 flex items-center justify-center shrink-0">
                        <Store className="size-4" />
                      </div>
                      <span className="truncate">Storefront &amp; Listings</span>
                    </div>

                    <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-muted/40 border border-border/50 text-xs font-bold text-foreground">
                      <div className="size-7 rounded-xl bg-sky-500/20 text-sky-600 flex items-center justify-center shrink-0">
                        <ShieldCheck className="size-4" />
                      </div>
                      <span className="truncate">Verified Badge &amp; Leads</span>
                    </div>

                    <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-muted/40 border border-border/50 text-xs font-bold text-foreground">
                      <div className="size-7 rounded-xl bg-emerald-500/20 text-emerald-600 flex items-center justify-center shrink-0">
                        <Award className="size-4" />
                      </div>
                      <span className="truncate">Flexible Packages</span>
                    </div>
                  </div>
                </div>

                {/* Right side: Primary CTA Button redirecting to packages page */}
                <div className="flex flex-col sm:flex-row lg:flex-col items-center gap-3 shrink-0 w-full sm:w-auto">
                  <Link href="/packages" className="w-full sm:w-auto">
                    <Button
                      size="lg"
                      className="w-full sm:w-auto h-12 sm:h-14 px-8 rounded-2xl bg-[#d9232e] hover:bg-[#b81d26] text-white font-black text-sm sm:text-base shadow-lg shadow-rose-500/25 gap-2.5 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Plus className="size-5" />
                      <span>Add Listing / Choose Package</span>
                      <ArrowRight className="size-4.5" />
                    </Button>
                  </Link>
                  <p className="text-[11px] font-semibold text-muted-foreground text-center">
                    Instant activation • No hidden fees
                  </p>
                </div>
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
