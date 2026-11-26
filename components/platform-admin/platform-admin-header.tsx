"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Shield,
  LogIn,
  User,
  ShoppingCart,
  Search,
  X,
  ArrowRight,
  Loader2,
  Package,
  Briefcase,
  Building2,
  UserCheck,
  FolderTree,
  Tag,
  ExternalLink,
  Store,
  ChevronRight,
  Sparkles,
  MapPin,
  Navigation,
  ChevronDown,
  Plus,
  GraduationCap,
  Menu,
  FileText,
  LogOut,
  Settings,
  Calendar,
  Building,
  Car,
  Globe,
  LayoutGrid,
  ShoppingBag,
  Landmark,
  TrendingUp,
  Utensils,
  Wrench,
  Dumbbell,
  Laptop,
  Scissors,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useUserLocation } from "@/hooks/use-user-location";
import { useUserCountry } from "@/hooks/use-user-country";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuthStore, useCartStore } from "@/store";
import { toast } from "sonner";
import { AuthModalDialog } from "@/components/auth/auth-modal-dialog";
import { buildDiscoverySeoUrl, extractCleanCity } from "@/lib/utils/seo-slug";
import { getCatalogCountryMeta } from "@/lib/config/country-config";
import { CartDrawer } from "@/components/checkout/cart-drawer";
import { parseSearchIntent } from "@/lib/utils/search-intent";
import { ProductStoresDialog } from "@/components/public/product-stores-dialog";
import { toRoleRoutePath } from "@/lib/auth/role-routes";

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

const BUSINESS_MEGA_CATEGORIES = [
  { label: "Automotive & Transport", categorySlug: "automotive-and-transport", icon: Car, bgClass: "bg-sky-100", iconClass: "text-sky-600" },
  { label: "Education & Coaching", categorySlug: "education-and-coaching", icon: GraduationCap, bgClass: "bg-amber-100", iconClass: "text-amber-600" },
  { label: "Fitness & Sports", categorySlug: "fitness-and-sports", icon: Dumbbell, bgClass: "bg-indigo-100", iconClass: "text-indigo-600" },
  { label: "Food, Dining & Cafes", categorySlug: "food-dining-and-cafes", icon: Utensils, bgClass: "bg-red-100", iconClass: "text-red-600" },
  { label: "Healthcare & Medical", categorySlug: "healthcare-and-medical", icon: Shield, bgClass: "bg-rose-100", iconClass: "text-rose-600" },
  { label: "Home Services & Maintenance", categorySlug: "home-services-and-maintenance", icon: Wrench, bgClass: "bg-teal-100", iconClass: "text-teal-600" },
  { label: "Hospitality & Events", categorySlug: "hospitality-and-events", icon: Sparkles, bgClass: "bg-purple-100", iconClass: "text-purple-600" },
  { label: "IT & Digital Agencies", categorySlug: "it-and-digital-agencies", icon: Laptop, bgClass: "bg-violet-100", iconClass: "text-violet-600" },
  { label: "Professional & Financial Services", categorySlug: "professional-and-financial-services", icon: Landmark, bgClass: "bg-emerald-100", iconClass: "text-emerald-600" },
  { label: "Real Estate & Construction", categorySlug: "real-estate-and-construction", icon: Building, bgClass: "bg-orange-100", iconClass: "text-orange-600" },
  { label: "Retail & Shopping", categorySlug: "retail-and-shopping", icon: ShoppingBag, bgClass: "bg-blue-100", iconClass: "text-blue-600" },
  { label: "Salons & Personal Care", categorySlug: "salons-and-personal-care", icon: Scissors, bgClass: "bg-pink-100", iconClass: "text-pink-600" },
];

const TOP_NAV_ITEMS = [
  {
    label: "Business",
    type: "business",
    icon: LayoutGrid,
    isSpecialCategory: true,
    subcategories: BUSINESS_MEGA_CATEGORIES,
  },
  {
    label: "Shopping",
    type: "product",
    icon: ShoppingBag,
    subcategories: [
      { label: "All Products", categorySlug: "all-products" },
      ...BUSINESS_MEGA_CATEGORIES,
    ],
  },
  {
    label: "Professionals",
    type: "professional",
    icon: UserCheck,
    subcategories: [
      { label: "All Professionals", categorySlug: "all-professionals" },
      ...BUSINESS_MEGA_CATEGORIES,
    ],
  },
  {
    label: "Jobs",
    type: "job",
    icon: Briefcase,
    subcategories: [
      { label: "All Jobs", categorySlug: "all-jobs" },
      ...BUSINESS_MEGA_CATEGORIES,
    ],
  },
  {
    label: "Courses",
    type: "course",
    icon: GraduationCap,
    subcategories: [
      { label: "All Courses", categorySlug: "all-courses" },
      ...BUSINESS_MEGA_CATEGORIES,
    ],
  },
  {
    label: "Property",
    type: "property",
    icon: Building,
    subcategories: [
      { label: "All Properties", categorySlug: "all-properties" },
      { label: "Commercial Properties", categorySlug: "property-commercial-properties" },
      { label: "Industrial & Warehousing Estates", categorySlug: "property-industrial-warehousing-estates" },
      { label: "Plots & Development Lands", categorySlug: "property-plots-development-lands" },
      { label: "Residential Real Estate", categorySlug: "property-residential-real-estate" },
    ],
  },
  {
    label: "Vehicle",
    type: "vehicle",
    icon: Car,
    subcategories: [
      { label: "All Vehicles", categorySlug: "all-vehicles" },
      { label: "Commercial & Transport Vehicles", categorySlug: "vehicle-commercial-transport-vehicles" },
      { label: "Luxury & Exotic Automobiles", categorySlug: "vehicle-luxury-exotic-automobiles" },
      { label: "Passenger Cars & SUVs", categorySlug: "vehicle-passenger-cars-suvs" },
      { label: "Two-Wheelers & Motorcycles", categorySlug: "vehicle-two-wheelers-motorcycles" },
      { label: "Commuter & Economy Bikes", categorySlug: "commuter-and-economy-bikes" },
    ],
  },
  {
    label: "Events",
    type: "event",
    icon: Calendar,
    subcategories: [
      { label: "All Events", categorySlug: "all-events" },
      ...BUSINESS_MEGA_CATEGORIES,
    ],
  },
  {
    label: "Financial",
    type: "service",
    icon: Landmark,
    subcategories: [
      { label: "All Financial Services", categorySlug: "all-financial-services" },
      ...BUSINESS_MEGA_CATEGORIES,
    ],
  },
];

export function PlatformAdminHeader() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const { getTotalCount, toggleCart } = useCartStore();
  const [mounted, setMounted] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const [authDialogTab, setAuthDialogTab] = useState<"signin" | "signup">("signin");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // User Location
  const {
    location,
    isDetected,
    isDetecting,
    setLocation,
    requestLocation,
  } = useUserLocation();

  // User Country & Currency
  const { country, setCountry, availableCountries } = useUserCountry();

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "products" | "services" | "businesses" | "professionals" | "categories">("all");
  const [results, setResults] = useState<SearchResultsState | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Store comparison dialog (When clicked on a product from search suggestions)
  const [storesDialogOpen, setStoresDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: number | string; name: string } | null>(null);

  // Location selector dialog state
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [customLocationInput, setCustomLocationInput] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{
    id: string;
    place_id: string;
    name: string;
    description: string;
    secondary_text?: string;
    source?: string;
  }>>([]);
  const [isLoadingLocationSuggestions, setIsLoadingLocationSuggestions] = useState(false);

  // Listen for global request to open location dialog
  useEffect(() => {
    const handleOpen = () => setLocationDialogOpen(true);
    window.addEventListener("edubird-open-location-dialog", handleOpen);
    return () => window.removeEventListener("edubird-open-location-dialog", handleOpen);
  }, []);

  // Always ask to share location first on visit if no location has been selected
  useEffect(() => {
    try {
      const savedLoc = localStorage.getItem("edubird_user_location");
      const hasPrompted = sessionStorage.getItem("edubird_location_prompted_first");
      if ((!savedLoc || savedLoc === "All Locations") && !hasPrompted) {
        sessionStorage.setItem("edubird_location_prompted_first", "true");
        const timer = setTimeout(() => {
          setLocationDialogOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      }
    } catch { }
  }, []);

  // Debounced Google Places Autocomplete for Location Modal
  useEffect(() => {
    const trimmed = customLocationInput.trim();
    if (trimmed.length < 2) {
      setLocationSuggestions([]);
      setIsLoadingLocationSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingLocationSuggestions(true);
      try {
        const res = await fetch(`/api/public/places/autocomplete?input=${encodeURIComponent(trimmed)}`);
        const data = await res.json();
        if (data?.predictions && Array.isArray(data.predictions)) {
          setLocationSuggestions(data.predictions);
        } else {
          setLocationSuggestions([]);
        }
      } catch (err) {
        console.error("Failed to fetch location suggestions:", err);
        setLocationSuggestions([]);
      } finally {
        setIsLoadingLocationSuggestions(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [customLocationInput]);

  // Dynamic main categories fetched from database for all navigation verticals
  const [verticalCategories, setVerticalCategories] = useState<Record<string, Array<{ label: string; categorySlug: string }>>>({});

  useEffect(() => {
    let isMounted = true;
    async function loadMainCategories() {
      try {
        const res = await fetch("/api/public/categories?type=all&onlyRoot=true&limit=300");
        if (!res.ok) return;
        const json = await res.json();
        const list = json.data || json.categories || [];

        const mapped: Record<string, Array<{ label: string; categorySlug: string }>> = {
          business: [],
          product: [],
          professional: [],
          course: [],
          job: [],
          property: [],
          vehicle: [],
          event: [],
        };

        list.forEach((c: any) => {
          const catType = String(c.category_type || "").toLowerCase();
          const item = { label: c.name, categorySlug: c.slug };

          if (catType === "business") {
            mapped.business.push(item);
          } else if (catType === "product") {
            mapped.product.push(item);
          } else if (catType === "professional") {
            mapped.professional.push(item);
          } else if (catType === "course" || catType === "academic") {
            mapped.course.push(item);
          } else if (catType === "job" || catType === "jobs") {
            mapped.job.push(item);
          } else if (catType === "property" || catType === "properties") {
            mapped.property.push(item);
          } else if (catType === "vehicle" || catType === "vehicles") {
            mapped.vehicle.push(item);
          } else if (catType === "event" || catType === "events") {
            mapped.event.push(item);
          }
        });

        if (isMounted) {
          setVerticalCategories(mapped);
        }
      } catch (err) {
        console.warn("Failed to load header navigation categories:", err);
      }
    }

    loadMainCategories();
    return () => {
      isMounted = false;
    };
  }, []);

  const getItemSubcategories = (item: (typeof TOP_NAV_ITEMS)[0]) => {
    if ((item as any).isSpecialCategory || item.label === "Property" || item.type === "property" || item.label === "Vehicle" || item.type === "vehicle") {
      return item.subcategories;
    }
    const allLabel = `All ${item.label === "Shopping" ? "Products" : item.label === "Financial" ? "Financial Services" : item.label}`;
    const allSlug = `all-${item.type === "product" ? "products" : item.type === "professional" ? "professionals" : item.type === "service" ? "services" : item.type === "event" ? "events" : item.type === "course" ? "courses" : item.type === "job" ? "jobs" : item.type}`;
    const allItem = { label: allLabel, categorySlug: allSlug };
    return [allItem, ...BUSINESS_MEGA_CATEGORIES];
  };

  const withLocation = (url: string) => {
    if (!location || location === "All Locations") return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}city=${encodeURIComponent(location)}`;
  };

  const getNavHref = (
    item: (typeof TOP_NAV_ITEMS)[0],
    sub?: { label: string; categorySlug?: string; href?: string }
  ) => {
    if (sub?.href) return sub.href;
    if ("href" in item && (item as any).href && !sub) return (item as any).href;

    // Use clean canonical city (e.g. "Pandeypur Chauraha, Varanasi, Uttar Pradesh, India" -> "Varanasi")
    const locCity = extractCleanCity(location) || null;

    return buildDiscoverySeoUrl({
      type: item.type,
      category: sub?.categorySlug,
      location: locCity,
    });
  };

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch instant search suggestions
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setResults(null);
      setTotalCount(0);
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
            setResults(data.results);
            setTotalCount(data.total || 0);
          }
        }
      } catch (err) {
        console.error("Header search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setMounted(true);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    const handleSync = (e: any) => {
      if (typeof e.detail === "string") {
        setSearchQuery(e.detail);
        if (e.detail.trim()) {
          setIsDropdownOpen(true);
        } else {
          setIsDropdownOpen(false);
        }
      }
    };
    window.addEventListener("search-query-sync", handleSync);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("search-query-sync", handleSync);
    };
  }, []);

  const handleSearch = (queryToSearch?: string) => {
    const q = (queryToSearch !== undefined ? queryToSearch : searchQuery).trim();
    if (!q) return;
    setIsDropdownOpen(false);
    setSearchOpen(false);
    const intent = parseSearchIntent(q);
    const finalParam = intent.cleanQuery ? encodeURIComponent(intent.cleanQuery) : encodeURIComponent(q);
    const separator = intent.targetRoute.includes("?") ? "&" : "?";
    const targetUrl = intent.targetRoute.startsWith("/explore")
      ? `${intent.targetRoute}${separator}q=${finalParam}`
      : `${intent.targetRoute}${separator}search=${finalParam}`;
    router.push(targetUrl);
  };

  // Filter items based on active tab
  const displayedItems = (() => {
    if (!results) return [];
    if (activeTab === "products") return results.products || [];
    if (activeTab === "services") return results.services || [];
    if (activeTab === "businesses") return results.businesses || [];
    if (activeTab === "professionals") return results.professionals || [];
    if (activeTab === "categories") return results.categories || [];

    // "all": prioritize Products, Services, Businesses, Professionals, Categories
    return [
      ...(results.categories || []),
      ...(results.products || []),
      ...(results.services || []),
      ...(results.businesses || []),
      ...(results.professionals || []),
      ...(results.institutes || []),
      ...(results.courses || []),
      ...(results.teachers || []),
    ];
  })();

  const counts = {
    all: totalCount,
    products: results?.products?.length || 0,
    services: results?.services?.length || 0,
    businesses: results?.businesses?.length || 0,
    professionals: results?.professionals?.length || 0,
    categories: results?.categories?.length || 0,
  };

  const isPlatformUser = Boolean(
    user?.is_super_admin || user?.role_codes?.includes("platform_admin")
  );

  return (
    <header className="w-full border-b border-sky-100 bg-gradient-to-r from-sky-50/95 via-white/95 to-sky-50/95 backdrop-blur-md sticky top-0 z-40 transition-colors shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-3 lg:gap-6">
        {/* Left: 143Panda Platform Brand */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2 text-foreground hover:opacity-90 transition-opacity shrink-0 py-0.5"
            title="143Panda"
          >
            <div className="relative h-13 sm:h-16 w-auto flex items-center">
              <Image
                src="/images/143panda-logo.png"
                alt="143Panda"
                width={200}
                height={70}
                className="h-12 sm:h-15 w-auto object-contain hover:scale-105 transition-transform"
                priority
              />
            </div>
          </Link>
        </div>

        {/* Center: Top Navigation Menu (Categories, Shopping, Events, Courses, Property, Vehicle, Financial) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {TOP_NAV_ITEMS.map((item) => {
            if ((item as any).isSpecialCategory) {
              return (
                <DropdownMenu key={item.label}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-sky-600 hover:bg-sky-700 text-white shadow-xs cursor-pointer outline-none transition-colors group"
                    >
                      <LayoutGrid className="size-3.5" />
                      <span>{item.label}</span>
                      <ChevronDown className="size-3 text-sky-200 group-hover:text-white transition-transform group-data-[state=open]:rotate-180" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[720px] max-w-[95vw] p-4 z-50 rounded-2xl shadow-2xl border-sky-100 bg-white">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <div className="size-6 rounded-md bg-sky-100 text-sky-600 flex items-center justify-center">
                          <LayoutGrid className="size-3.5" />
                        </div>
                        <span className="text-sm font-bold text-slate-900">
                          Business Categories
                        </span>
                      </div>
                      <span className="text-xs text-sky-600 italic font-medium">
                        Find the right business, faster!
                      </span>
                    </div>

                    {/* 3-Column Categories Grid matching mockup */}
                    <div className="grid grid-cols-3 gap-x-3 gap-y-1">
                      {BUSINESS_MEGA_CATEGORIES.map((cat) => {
                        const CatIcon = cat.icon;
                        const navHref = getNavHref(item, cat);
                        return (
                          <DropdownMenuItem key={cat.label} asChild className="p-0 focus:bg-transparent">
                            <Link
                              href={navHref}
                              className="flex items-center justify-between p-2 rounded-xl hover:bg-sky-50 text-slate-700 hover:text-sky-600 transition-colors group cursor-pointer"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <div className={`size-6 rounded-md ${cat.bgClass} flex items-center justify-center shrink-0`}>
                                  <CatIcon className={`size-3 ${cat.iconClass}`} />
                                </div>
                                <span className="text-xs font-medium truncate">
                                  {cat.label}
                                </span>
                              </div>
                              <ChevronRight className="size-3 text-slate-300 group-hover:text-sky-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
                            </Link>
                          </DropdownMenuItem>
                        );
                      })}
                    </div>

                    {/* Footer Banner */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between bg-sky-50/70 -mx-4 -mb-4 px-4 py-2.5 rounded-b-2xl">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <TrendingUp className="size-4 text-sky-600" />
                        <span>Explore 12 Business Categories to Grow Your Business</span>
                      </div>
                      <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                        <Link
                          href={getNavHref(item)}
                          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs cursor-pointer transition-colors"
                        >
                          View All Categories →
                        </Link>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            }

            return (
              <DropdownMenu key={item.label}>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-800 hover:text-sky-600 hover:bg-sky-50/80 transition-colors cursor-pointer outline-none group"
                  >
                    <span>{item.label}</span>
                    <ChevronDown className="size-3 text-slate-400 group-hover:text-sky-600 transition-transform group-data-[state=open]:rotate-180" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64 max-h-[420px] overflow-y-auto p-1.5 space-y-0.5 z-50 rounded-xl shadow-xl border-sky-100 scrollbar-thin">
                  <div className="sticky top-0 z-10 px-2.5 py-1.5 mb-1 bg-sky-50/95 backdrop-blur-xs rounded-md flex items-center justify-between border-b border-sky-100 shadow-2xs">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
                      Explore {item.label}
                    </span>
                    <DropdownMenuItem asChild className="p-0 focus:bg-transparent">
                      <Link
                        href={getNavHref(item)}
                        className="text-[10px] text-sky-600 hover:underline font-bold cursor-pointer"
                      >
                        View All →
                      </Link>
                    </DropdownMenuItem>
                  </div>
                  {getItemSubcategories(item).map((sub) => {
                    const navHref = getNavHref(item, sub);
                    return (
                      <DropdownMenuItem
                        key={sub.label}
                        asChild
                      >
                        <Link
                          href={navHref}
                          className="cursor-pointer text-xs py-1.5 px-2.5 rounded-md font-medium text-slate-700 hover:text-sky-600 hover:bg-sky-50 block w-full"
                        >
                          {sub.label}
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            );
          })}
        </nav>

        {/* Right: Cart, Country Flag, Location Selector, User Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Cart Button with vibrant Red Count Badge */}
          <button
            type="button"
            onClick={toggleCart}
            className="relative p-2 rounded-full hover:bg-sky-100/60 text-slate-700 hover:text-sky-700 transition-colors cursor-pointer shrink-0"
            title="Shopping Cart"
            aria-label="Shopping Cart"
          >
            <ShoppingCart className="size-4.5" />
            {mounted && getTotalCount() > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-black text-white shadow-xs">
                {getTotalCount()}
              </span>
            )}
          </button>

          {/* Country Flag Selector (Dynamic Country & Currency: ZA 🇿🇦, IN 🇮🇳, US 🇺🇸 etc.) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 p-1 sm:px-2.5 sm:py-1 rounded-full hover:bg-sky-100/60 transition-colors cursor-pointer text-xs font-bold text-slate-700 shrink-0 border border-sky-100/80 bg-white shadow-2xs"
                title={`Country: ${country.name} (${country.currencyCode} ${country.currencySymbol})`}
              >
                <span className="text-base leading-none">{country.flag}</span>
                <span className="text-[11px] font-black text-slate-800 hidden sm:inline">{country.code}</span>
                <ChevronDown className="size-3 text-slate-400" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5 rounded-xl shadow-lg border-sky-100 max-h-80 overflow-y-auto">
              <DropdownMenuLabel className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1">
                Select Country &amp; Currency
              </DropdownMenuLabel>
              {availableCountries.map((c) => (
                <DropdownMenuItem
                  key={c.code}
                  onClick={() => {
                    setCountry(c.code);
                    toast.success(`Country set to ${c.name} ${c.flag}`, {
                      description: `Currency: ${c.currencyCode} (${c.currencySymbol})`,
                    });
                  }}
                  className={`cursor-pointer text-xs font-medium gap-2.5 py-2 px-2.5 rounded-lg flex items-center justify-between ${country.code === c.code ? "bg-sky-50 text-sky-700 font-bold" : ""
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{c.flag}</span>
                    <span>{c.name}</span>
                  </div>
                  <span className="text-[11px] text-slate-500 font-bold font-mono">
                    {c.currencySymbol} {c.currencyCode}
                  </span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Location Selector Button (Pin icon) */}
          <button
            type="button"
            onClick={() => setLocationDialogOpen(true)}
            className="relative size-8.5 rounded-full border border-sky-200/80 bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 transition-all cursor-pointer shrink-0 shadow-2xs group flex items-center justify-center"
            title={location ? `Location: ${location} (Click to change)` : "Select Location"}
            aria-label="Select Location"
          >
            <MapPin className="size-4 text-amber-500 group-hover:scale-110 transition-transform" />
            {isDetected && (
              <span
                className="absolute top-1 right-1 size-2 rounded-full bg-emerald-500 ring-2 ring-white"
                title="GPS Live Detected"
              />
            )}
          </button>

          {/* User Profile Dropdown matching mockup (My Store, Profile, Settings, Sign Out) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1 p-1 rounded-full hover:bg-sky-100/60 transition-colors cursor-pointer shrink-0 group outline-none"
                title={user ? user.full_name || user.email : "My Account"}
              >
                <div className="size-8.5 rounded-full bg-sky-500 hover:bg-sky-600 text-white flex items-center justify-center shadow-xs transition-colors">
                  <User className="size-4.5 text-white" />
                </div>
                <ChevronDown className="size-3 text-slate-400 group-hover:text-slate-600 transition-transform" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1.5 rounded-xl shadow-xl border-sky-100">
              {user ? (
                <>
                  <DropdownMenuLabel className="px-3 py-1.5 text-xs text-muted-foreground font-semibold truncate">
                    {user.full_name || user.email}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link
                      href={toRoleRoutePath("/admin", user)}
                      className="cursor-pointer text-xs font-semibold py-2 px-3 flex items-center gap-2 text-slate-700 hover:text-sky-600 rounded-lg hover:bg-sky-50"
                    >
                      <LayoutDashboard className="size-4 text-sky-500" />
                      <span>Dashboard</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/packages"
                      className="cursor-pointer text-xs font-semibold py-2 px-3 flex items-center gap-2 text-slate-700 hover:text-sky-600 rounded-lg hover:bg-sky-50"
                    >
                      <Package className="size-4 text-amber-500" />
                      <span>My Packages</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/workspace"
                      className="cursor-pointer text-xs font-semibold py-2 px-3 flex items-center gap-2 text-slate-700 hover:text-sky-600 rounded-lg hover:bg-sky-50"
                    >
                      <Store className="size-4 text-sky-500" />
                      <span>My Store</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/platformadmin/my-profile"
                      className="cursor-pointer text-xs font-semibold py-2 px-3 flex items-center gap-2 text-slate-700 hover:text-sky-600 rounded-lg hover:bg-sky-50"
                    >
                      <User className="size-4 text-sky-500" />
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link
                      href="/workspace/settings"
                      className="cursor-pointer text-xs font-semibold py-2 px-3 flex items-center gap-2 text-slate-700 hover:text-sky-600 rounded-lg hover:bg-sky-50"
                    >
                      <Settings className="size-4 text-sky-500" />
                      <span>Settings</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      clearAuth();
                      toast.success("Signed out successfully");
                      router.push("/");
                    }}
                    className="cursor-pointer text-xs font-semibold py-2 px-3 flex items-center gap-2 text-rose-600 hover:text-rose-700 rounded-lg hover:bg-rose-50"
                  >
                    <LogOut className="size-4 text-rose-500" />
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </>
              ) : (
                <DropdownMenuItem
                  onClick={() => {
                    setAuthDialogTab("signin");
                    setAuthDialogOpen(true);
                  }}
                  className="cursor-pointer text-xs font-semibold py-2 px-3 flex items-center gap-2 text-sky-600 hover:text-sky-700 rounded-lg hover:bg-sky-50"
                >
                  <LogIn className="size-4 text-sky-500" />
                  <span>Sign In</span>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-sky-100/60 transition-colors cursor-pointer shrink-0"
            title="Open Menu"
            aria-label="Open Menu"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      <Dialog open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <DialogContent className="w-[92vw] max-w-md p-0 overflow-hidden rounded-2xl border shadow-2xl">
          <div className="p-4 border-b flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="relative h-8 w-auto flex items-center">
                <Image
                  src="/images/143panda-logo.png"
                  alt="143Panda"
                  width={110}
                  height={38}
                  className="h-8 w-auto object-contain"
                />
              </div>
            </div>
          </div>
          <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Categories & Directory
            </p>
            <div className="space-y-1">
              {TOP_NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={getNavHref(item)}
                    onClick={() => setMobileNavOpen(false)}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-muted text-sm font-bold text-foreground transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Icon className="size-3.5" />
                      </div>
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>

            <div className="pt-3 border-t space-y-2">
              <Link
                href="/admin/profiles"
                onClick={() => setMobileNavOpen(false)}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-xs"
              >
                <Plus className="size-3.5" />
                <span>+ Register Business / Add Listing</span>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Quick Search Dialog (Mobile & Cmd/Ctrl+K) */}
      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="w-[94vw] max-w-lg p-0 overflow-hidden rounded-2xl border shadow-2xl gap-0">
          <div className="p-3.5 sm:p-4 border-b bg-background flex items-center gap-2.5">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search products, services, stores, professionals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              className="w-full text-xs sm:text-sm bg-transparent outline-none placeholder:text-muted-foreground text-foreground"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          {searchQuery.trim().length > 0 ? (
            <div className="flex flex-col max-h-[60vh] overflow-hidden">
              {/* Filter Pills Header */}
              <div className="flex items-center gap-1.5 p-2.5 border-b bg-muted/40 overflow-x-auto scrollbar-none text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] ${activeTab === "all"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-background text-muted-foreground border hover:bg-muted"
                    }`}
                >
                  All ({counts.all})
                </button>

                {counts.products > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("products")}
                    className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${activeTab === "products"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-background text-muted-foreground border hover:bg-muted"
                      }`}
                  >
                    <Package className="size-3" />
                    <span>Products ({counts.products})</span>
                  </button>
                )}

                {counts.services > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("services")}
                    className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${activeTab === "services"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-background text-muted-foreground border hover:bg-muted"
                      }`}
                  >
                    <Briefcase className="size-3" />
                    <span>Services ({counts.services})</span>
                  </button>
                )}

                {counts.businesses > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("businesses")}
                    className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${activeTab === "businesses"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-background text-muted-foreground border hover:bg-muted"
                      }`}
                  >
                    <Building2 className="size-3" />
                    <span>Businesses ({counts.businesses})</span>
                  </button>
                )}

                {counts.professionals > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("professionals")}
                    className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${activeTab === "professionals"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-background text-muted-foreground border hover:bg-muted"
                      }`}
                  >
                    <UserCheck className="size-3" />
                    <span>Professionals ({counts.professionals})</span>
                  </button>
                )}

                {counts.categories > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("categories")}
                    className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${activeTab === "categories"
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-background text-muted-foreground border hover:bg-muted"
                      }`}
                  >
                    <FolderTree className="size-3" />
                    <span>Categories ({counts.categories})</span>
                  </button>
                )}
              </div>

              {/* Suggestions List Container */}
              <div className="overflow-y-auto divide-y divide-border/50 max-h-[320px]">
                {displayedItems.length === 0 ? (
                  <div className="p-6 text-center space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground">
                      No results found for &quot;<span className="text-foreground">{searchQuery}</span>&quot;
                    </p>
                  </div>
                ) : (
                  displayedItems.map((item, idx) => {
                    const isProfile = item.type === "business" || item.type === "professional";

                    return (
                      <div
                        key={`m-${item.type}-${item.id}-${idx}`}
                        className="p-3 hover:bg-muted/50 transition-colors flex items-center justify-between gap-2.5"
                      >
                        <div
                          onClick={() => {
                            setSearchOpen(false);
                            if (item.type === "product") {
                              setSelectedProduct({ id: item.id, name: item.title });
                              setStoresDialogOpen(true);
                            } else if (isProfile) {
                              router.push(item.profileHref || item.href);
                            } else {
                              router.push(item.storefrontHref || item.listingHref || item.href);
                            }
                          }}
                          className="flex items-start gap-2.5 min-w-0 flex-1 cursor-pointer text-left"
                        >
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

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-foreground truncate">
                                {item.title}
                              </span>
                              <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase font-bold">
                                {item.type}
                              </Badge>
                            </div>
                            {item.subtitle && (
                              <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center shrink-0">
                          {item.type === "product" ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-6 text-[10px] font-bold px-2 gap-1 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearchOpen(false);
                                setSelectedProduct({ id: item.id, name: item.title });
                                setStoresDialogOpen(true);
                              }}
                            >
                              <Store className="size-3" />
                              <span>Compare</span>
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              className="h-6 text-[10px] font-bold px-2 gap-0.5 cursor-pointer"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearchOpen(false);
                                if (isProfile) {
                                  router.push(item.profileHref || item.href);
                                } else {
                                  router.push(item.storefrontHref || item.listingHref || item.href);
                                }
                              }}
                            >
                              <span>Open</span>
                              <ChevronRight className="size-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            /* Quick Categories */
            <div className="p-4 bg-muted/20 space-y-2.5 text-xs">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                Quick Suggestions
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Products", query: "products" },
                  { label: "Services", query: "services" },
                  { label: "Groceries & Supermarkets", query: "grocery" },
                  { label: "Salons & Parlours", query: "salon" },
                  { label: "Legal Services", query: "legal" },
                  { label: "Health & Clinics", query: "clinic" },
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => handleSearch(item.query)}
                    className="text-xs px-2.5 py-1 rounded-lg border bg-background hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors cursor-pointer text-muted-foreground font-medium"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 border-t bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
            <span className="text-[11px]">
              Press <strong className="text-foreground">Enter</strong> to explore
            </span>
            <Button
              size="sm"
              onClick={() => handleSearch()}
              disabled={!searchQuery.trim()}
              className="h-8 text-xs font-bold gap-1 bg-[#d9232e] hover:bg-[#d9232e]/90 text-white cursor-pointer"
            >
              <span>Search</span>
              <ArrowRight className="size-3" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Stores Comparison Dialog (When clicked on a product from header search suggestions) */}
      <ProductStoresDialog
        productId={selectedProduct?.id || null}
        productName={selectedProduct?.name || ""}
        open={storesDialogOpen}
        onOpenChange={setStoresDialogOpen}
      />

      {/* Login & Create Profile Dialog */}
      <AuthModalDialog
        open={authDialogOpen}
        onOpenChange={setAuthDialogOpen}
        defaultTab={authDialogTab}
      />

      {/* Location Modal Dialog: Detect Live GPS or Enter Any Specific Location */}
      <Dialog
        open={locationDialogOpen}
        onOpenChange={(open) => {
          setLocationDialogOpen(open);
          if (!open) {
            setCustomLocationInput("");
            setLocationSuggestions([]);
          }
        }}
      >
        <DialogContent className="sm:max-w-lg w-[calc(100vw-2rem)] bg-card border border-border/80 text-foreground rounded-3xl p-5 sm:p-6 shadow-2xl overflow-hidden gap-4">
          <DialogHeader className="space-y-1 pb-1 border-b border-border/40">
            <div className="flex items-center justify-between gap-2 pr-6">
              <DialogTitle className="text-lg sm:text-xl font-black flex items-center gap-2 text-foreground">
                <span className="p-1.5 rounded-xl bg-amber-500/10 text-amber-500">
                  <MapPin className="size-4 sm:size-5" />
                </span>
                <span>Select Your Location</span>
              </DialogTitle>
              {isDetected && (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                  Live GPS Active
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Discover verified businesses, services, products, and opportunities in your area worldwide.
            </DialogDescription>
          </DialogHeader>

          {/* Currently Selected Location Pill */}
          <div className="p-3 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-between text-xs gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground shrink-0">
                Active:
              </span>
              <span className="font-extrabold text-foreground flex items-center gap-1.5 min-w-0 truncate">
                <span className="size-2 rounded-full bg-amber-500 shrink-0 animate-pulse" />
                <span className="truncate" title={location || "All Locations"}>
                  {location || "All Locations"}
                </span>
              </span>
            </div>
            {location && location !== "All Locations" && (
              <button
                type="button"
                onClick={() => {
                  setLocation("All Locations", false);
                  toast.success("Location set to All Locations");
                }}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-background hover:bg-rose-50 dark:hover:bg-rose-950/40 text-[11px] font-bold text-muted-foreground hover:text-rose-600 border border-border/60 transition-colors cursor-pointer shadow-2xs"
                title="Reset location"
              >
                <X className="size-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* 1. Detect Live GPS Button */}
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await requestLocation(false);
              setLocationDialogOpen(false);
            }}
            disabled={isDetecting}
            className="w-full py-4 sm:py-5 rounded-2xl border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-foreground font-bold text-xs sm:text-sm flex items-center justify-center gap-2.5 shadow-xs cursor-pointer transition-all"
          >
            {isDetecting ? (
              <>
                <Loader2 className="size-4 animate-spin text-amber-500" />
                <span>Detecting your live coordinates...</span>
              </>
            ) : (
              <>
                <Navigation className="size-4 text-amber-500" />
                <span>Use My Current Location (GPS)</span>
              </>
            )}
          </Button>

          {/* Divider */}
          <div className="relative flex items-center justify-center my-0.5">
            <div className="w-full border-t border-border/60" />
            <span className="absolute bg-card px-3 text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">
              Or Enter Location Worldwide
            </span>
          </div>

          {/* 2. Enter Any Specific Location Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = customLocationInput.trim();
              if (trimmed) {
                setLocation(trimmed, false);
                toast.success(`Location set to "${trimmed}"`);
                setCustomLocationInput("");
                setLocationSuggestions([]);
                setLocationDialogOpen(false);
              }
            }}
            className="space-y-3"
          >
            <div className="relative flex items-center">
              <Search className="absolute left-3.5 size-4 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search any city, country, or area worldwide..."
                value={customLocationInput}
                onChange={(e) => setCustomLocationInput(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                className="w-full h-11 pl-10 pr-20 rounded-2xl bg-background border border-border/80 text-xs sm:text-sm font-medium placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
              {isLoadingLocationSuggestions && (
                <div className="absolute right-14 flex items-center justify-center pointer-events-none">
                  <Loader2 className="size-4 animate-spin text-amber-500" />
                </div>
              )}
              <Button
                type="submit"
                size="sm"
                disabled={!customLocationInput.trim()}
                className="absolute right-1.5 h-8 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs cursor-pointer shadow-xs disabled:opacity-40"
              >
                Set
              </Button>
            </div>

            {/* Google Places Autocomplete Suggestions */}
            {locationSuggestions.length > 0 && (
              <div className="space-y-1 max-h-56 overflow-y-auto rounded-2xl border border-border/80 bg-background/95 backdrop-blur-xs p-1.5 shadow-xl animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/40 pb-1 mb-1">
                  <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                    <Globe className="size-3" />
                    Worldwide Suggestions
                  </span>
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-bold border border-amber-500/20">
                    Google Places
                  </span>
                </div>
                {locationSuggestions.map((item) => (
                  <button
                    key={item.id || item.place_id}
                    type="button"
                    onClick={() => {
                      let chosenLocation = item.name || item.description.split(",")[0].trim();
                      if (item.secondary_text) {
                        const secParts = item.secondary_text.split(",").map((p) => p.trim()).filter(Boolean);
                        const cityPart = secParts[0];
                        if (cityPart && !chosenLocation.toLowerCase().includes(cityPart.toLowerCase())) {
                          chosenLocation = `${chosenLocation}, ${cityPart}`;
                        }
                      }
                      setLocation(chosenLocation, false);
                      toast.success(`Location set to "${chosenLocation}"`);
                      setCustomLocationInput("");
                      setLocationSuggestions([]);
                      setLocationDialogOpen(false);
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-amber-500/10 dark:hover:bg-amber-500/15 transition-all flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="size-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-500 group-hover:text-black transition-colors shadow-2xs">
                      <MapPin className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-foreground group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground group-hover:text-foreground/80 transition-colors truncate mt-0.5">
                        {item.secondary_text || item.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Quick Popular Worldwide Cities */}
            {!customLocationInput.trim() && (
              <div className="pt-1">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  <Globe className="size-3 text-amber-500" />
                  <span>Popular Locations Worldwide</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { name: "Varanasi, India", code: "IN" },
                    { name: "Cape Town, South Africa", code: "ZA" },
                    { name: "Johannesburg, South Africa", code: "ZA" },
                    { name: "London, UK", code: "GB" },
                    { name: "New York, USA", code: "US" },
                    { name: "Dubai, UAE", code: "AE" },
                    { name: "Sydney, Australia", code: "AU" },
                    { name: "Toronto, Canada", code: "CA" },
                  ].map((city) => (
                    <button
                      key={city.name}
                      type="button"
                      onClick={() => {
                        setLocation(city.name, false, city.code);
                        setCountry(city.code);
                        const cm = getCatalogCountryMeta(city.code);
                        toast.success(`Location set to "${city.name}"`, {
                          description: `Country & Currency set to ${cm.name} (${cm.currencyCode} ${cm.currencySymbol})`,
                        });
                        setLocationDialogOpen(false);
                      }}
                      className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted/60 hover:bg-amber-500/15 hover:text-amber-700 dark:hover:text-amber-400 border border-border/50 transition-colors cursor-pointer"
                    >
                      {city.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>

      {/* Shopping Cart Drawer */}
      <CartDrawer />
    </header>
  );
}
