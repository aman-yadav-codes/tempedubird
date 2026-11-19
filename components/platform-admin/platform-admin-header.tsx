"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
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
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { useAuthStore, useCartStore } from "@/store";
import { AuthModalDialog } from "@/components/auth/auth-modal-dialog";
import { CartDrawer } from "@/components/checkout/cart-drawer";
import { parseSearchIntent } from "@/lib/utils/search-intent";
import { ProductStoresDialog } from "@/components/public/product-stores-dialog";

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

const TOP_NAV_ITEMS = [
  {
    label: "Products",
    href: "/explore?type=product",
    icon: Package,
    subcategories: [
      { label: "All Products", href: "/explore?type=product" },
      { label: "Electronics & Tech", href: "/explore?type=product&category=Electronics" },
      { label: "Fashion & Apparel", href: "/explore?type=product&category=Fashion" },
      { label: "Home & Kitchen", href: "/explore?type=product&category=Home" },
      { label: "Groceries & Fresh", href: "/explore?type=product&category=Groceries" },
    ],
  },
  {
    label: "Professionals",
    href: "/explore?type=professional",
    icon: UserCheck,
    subcategories: [
      { label: "All Professionals", href: "/explore?type=professional" },
      { label: "Doctors & Healthcare", href: "/explore?type=professional&category=Healthcare" },
      { label: "Teachers & Mentors", href: "/explore?type=professional&category=Education" },
      { label: "Legal & Financial Advisors", href: "/explore?type=professional&category=Legal" },
      { label: "Tech & Software Consultants", href: "/explore?type=professional&category=Technology" },
    ],
  },
  {
    label: "Courses",
    href: "/explore?type=course",
    icon: GraduationCap,
    subcategories: [
      { label: "All Courses", href: "/explore?type=course" },
      { label: "Competitive Exams (JEE / NEET)", href: "/explore?type=course&category=Competitive" },
      { label: "Skill & Coding Bootcamps", href: "/explore?type=course&category=Technology" },
      { label: "School Coaching (8th-12th)", href: "/explore?type=course&category=Academic" },
      { label: "Degree & Diploma Programs", href: "/explore?type=course&category=Degree" },
    ],
  },
  {
    label: "Jobs",
    href: "/explore?type=job",
    icon: Briefcase,
    subcategories: [
      { label: "All Job Openings", href: "/explore?type=job" },
      { label: "Full-Time Roles", href: "/explore?type=job&timing=full-time" },
      { label: "Part-Time & Internships", href: "/explore?type=job&timing=internship" },
      { label: "Teaching & Faculty", href: "/explore?type=job&category=Teaching" },
      { label: "Retail & Operations", href: "/explore?type=job&category=Operations" },
    ],
  },
  {
    label: "Business",
    href: "/explore?type=business",
    icon: Building2,
    subcategories: [
      { label: "All Businesses", href: "/explore?type=business" },
      { label: "Verified Enterprises", href: "/explore?type=business&verified=true" },
      { label: "Retail Stores & Supermarkets", href: "/explore?type=business&category=Retail" },
      { label: "Coaching Institutes", href: "/explore?type=business&category=Coaching" },
      { label: "Clinics & Healthcare", href: "/explore?type=business&category=Healthcare" },
    ],
  },
];

export function PlatformAdminHeader() {
  const router = useRouter();
  const { user } = useAuthStore();
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
    availableLocations,
  } = useUserLocation();

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

  const withLocation = (url: string) => {
    if (!location || location === "All Locations") return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}city=${encodeURIComponent(location)}`;
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
    <header className="w-full border-b border-border/40 bg-background/85 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 lg:gap-6">
        {/* Left: Minimal Platform Brand */}
        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2.5 text-foreground hover:opacity-90 transition-opacity shrink-0"
          >
            <div className="size-8.5 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black shadow-2xs">
              <Shield className="size-4.5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-base leading-tight">
                FindMy
              </span>
              <span className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold">
                Platform Admin
              </span>
            </div>
          </Link>
        </div>

        {/* Center: Top Navigation Menu (Products, Professionals, Courses, Jobs, Business) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
          {TOP_NAV_ITEMS.map((item) => (
            <DropdownMenu key={item.label}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-foreground/90 hover:text-primary hover:bg-muted/70 transition-colors cursor-pointer outline-none group"
                >
                  <span>{item.label}</span>
                  <ChevronDown className="size-3 text-muted-foreground/60 group-hover:text-primary transition-transform group-data-[state=open]:rotate-180" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 p-1.5 space-y-0.5 z-50">
                <div className="px-2.5 py-1.5 mb-1 bg-primary/5 rounded-md flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Explore {item.label}
                  </span>
                  <Link
                    href={withLocation(item.href)}
                    className="text-[10px] text-primary hover:underline font-bold"
                  >
                    View All →
                  </Link>
                </div>
                {item.subcategories.map((sub) => (
                  <DropdownMenuItem key={sub.label} asChild>
                    <Link
                      href={withLocation(sub.href)}
                      className="cursor-pointer text-xs py-1.5 px-2.5 rounded-md font-medium text-foreground hover:text-primary hover:bg-muted"
                    >
                      {sub.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ))}
        </nav>

        {/* Right: + Add Listing, Location Selector, Search, Cart, Sign In */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* + Add Listing Button (FindMy styled pill button) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8.5 px-3 rounded-full border border-border/80 bg-background/60 hover:bg-muted font-bold text-xs gap-1.5 cursor-pointer shadow-2xs shrink-0"
              >
                <Plus className="size-3.5 text-primary" />
                <span>Add Listing</span>
                <ChevronDown className="size-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 p-1.5 space-y-0.5 z-50">
              <div className="px-2.5 py-1.5 mb-1 bg-primary/5 rounded-md">
                <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                  Partner with Platform
                </span>
              </div>
              <DropdownMenuItem asChild>
                <Link
                  href="/admin/profiles"
                  className="cursor-pointer text-xs py-2 px-2.5 rounded-md font-semibold flex items-center gap-2 hover:bg-muted"
                >
                  <Building2 className="size-3.5 text-primary" />
                  <span>Register Business</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/admin/catalog/products"
                  className="cursor-pointer text-xs py-2 px-2.5 rounded-md font-semibold flex items-center gap-2 hover:bg-muted"
                >
                  <Package className="size-3.5 text-primary" />
                  <span>List Products</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/admin/catalog/services"
                  className="cursor-pointer text-xs py-2 px-2.5 rounded-md font-semibold flex items-center gap-2 hover:bg-muted"
                >
                  <Briefcase className="size-3.5 text-primary" />
                  <span>Offer Services</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/admin/catalog/courses"
                  className="cursor-pointer text-xs py-2 px-2.5 rounded-md font-semibold flex items-center gap-2 hover:bg-muted"
                >
                  <GraduationCap className="size-3.5 text-primary" />
                  <span>Publish Courses</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href="/admin/catalog/jobs"
                  className="cursor-pointer text-xs py-2 px-2.5 rounded-md font-semibold flex items-center gap-2 hover:bg-muted"
                >
                  <Briefcase className="size-3.5 text-primary" />
                  <span>Post Job Openings</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Location Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-border/70 bg-muted/40 hover:bg-muted text-xs font-semibold text-foreground transition-all cursor-pointer outline-none shrink-0 max-w-[130px] sm:max-w-[170px]"
                title="Select location"
              >
                <MapPin className="size-3.5 text-primary shrink-0" />
                <span className="truncate">{location || "All Locations"}</span>
                {isDetected && (
                  <span className="size-1.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20 shrink-0" title="Live location active" />
                )}
                <ChevronDown className="size-3 text-muted-foreground shrink-0 ml-auto" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 p-1.5 space-y-1 z-50">
              <div className="px-2.5 py-1.5 bg-primary/5 rounded-lg mb-1 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary">
                    Selected Location
                  </span>
                  <span className="text-xs font-bold text-foreground truncate">
                    {location || "All Locations"}
                  </span>
                </div>
                {isDetected && (
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 px-1.5 py-0.5 rounded-full">
                    GPS
                  </span>
                )}
              </div>

              {/* Auto-detect button */}
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
                Choose Location
              </DropdownMenuLabel>

              <div className="max-h-56 overflow-y-auto space-y-0.5">
                <DropdownMenuItem
                  onClick={() => setLocation("All Locations", false)}
                  className={cn(
                    "cursor-pointer text-xs py-1.5 px-2.5 rounded-lg font-medium",
                    (!location || location === "All Locations") && "font-bold text-primary bg-primary/10"
                  )}
                >
                  <span>All Locations (Entire Dataset)</span>
                </DropdownMenuItem>
                {availableLocations.map((loc) => (
                  <DropdownMenuItem
                    key={loc}
                    onClick={() => setLocation(loc, false)}
                    className={cn(
                      "cursor-pointer text-xs py-1.5 px-2.5 rounded-lg font-medium",
                      location === loc && "font-bold text-primary bg-primary/10"
                    )}
                  >
                    <span>{loc}</span>
                  </DropdownMenuItem>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Search: Replaces Theme Toggle */}
          <div ref={searchContainerRef} className="relative">
            {/* Desktop & Tablet Inline Search Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="relative hidden sm:flex items-center"
            >
              <Search className="absolute left-3 size-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search products, stores, services..."
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
                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new CustomEvent("search-query-sync", { detail: val }));
                  }
                }}
                className="w-48 md:w-64 lg:w-72 h-9 pl-8 pr-8 text-xs rounded-full bg-muted/60 hover:bg-muted/90 focus:bg-background border border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none text-foreground placeholder:text-muted-foreground"
              />
              <div className="absolute right-2.5 flex items-center gap-1">
                {isSearching ? (
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                ) : searchQuery ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery("");
                      setResults(null);
                      setIsDropdownOpen(false);
                    }}
                    className="p-0.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Clear search"
                  >
                    <X className="size-3" />
                  </button>
                ) : (
                  <kbd className="text-[9px] text-muted-foreground/60 border border-border/40 rounded px-1 py-0.5 pointer-events-none font-mono hidden md:inline-block">
                    ⌘K
                  </kbd>
                )}
              </div>
            </form>

            {/* Mobile Search Trigger Button */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="sm:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer"
              title="Search"
              aria-label="Search"
            >
              <Search className="size-4" />
            </button>

            {/* ================= AUTOCOMPLETE SEARCH SUGGESTIONS DROPDOWN (DESKTOP) ================= */}
            {isDropdownOpen && searchQuery.trim().length > 0 && (
              <div className="absolute right-0 top-[42px] w-[92vw] sm:w-[480px] md:w-[560px] bg-card rounded-2xl border border-border shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
                {/* Filter Pills Header */}
                <div className="flex items-center gap-1.5 p-2.5 border-b bg-muted/40 overflow-x-auto scrollbar-none text-xs">
                  <button
                    type="button"
                    onClick={() => setActiveTab("all")}
                    className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                      activeTab === "all"
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
                      className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
                        activeTab === "products"
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
                      className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
                        activeTab === "services"
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
                      className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
                        activeTab === "businesses"
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
                      className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
                        activeTab === "professionals"
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
                      className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
                        activeTab === "categories"
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
                <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
                  {displayedItems.length === 0 ? (
                    <div className="p-6 text-center space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">
                        No results found for &quot;<span className="text-foreground">{searchQuery}</span>&quot;
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-1 text-xs"
                        onClick={() => {
                          setIsDropdownOpen(false);
                          handleSearch();
                        }}
                      >
                        Search Full Marketplace
                      </Button>
                    </div>
                  ) : (
                    displayedItems.map((item, idx) => {
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
                                    setSelectedProduct({ id: item.id, name: item.title });
                                    setStoresDialogOpen(true);
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

          {/* Cart Button */}
          <button
            type="button"
            onClick={toggleCart}
            className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
            title="Shopping Cart"
            aria-label="Shopping Cart"
          >
            <ShoppingCart className="size-4" />
            {mounted && getTotalCount() > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white shadow-xs">
                {getTotalCount()}
              </span>
            )}
          </button>

          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/platformadmin/my-profile">
                <Button size="sm" variant="ghost" className="gap-1.5 text-xs h-9 px-2.5">
                  <User className="size-3.5 text-muted-foreground" />
                  <span className="max-w-[120px] truncate hidden md:inline">
                    {user.full_name || user.email}
                  </span>
                </Button>
              </Link>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={() => {
                setAuthDialogTab("signin");
                setAuthDialogOpen(true);
              }}
              className="gap-1.5 text-xs h-9 cursor-pointer bg-[#d9232e] hover:bg-[#d9232e]/90 text-white font-semibold"
            >
              <LogIn className="size-3.5" />
              Sign In
            </Button>
          )}
          {/* Mobile Menu Hamburger */}
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="lg:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
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
              <div className="size-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black">
                <Shield className="size-4" />
              </div>
              <span className="font-extrabold text-sm">FindMy Discovery</span>
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
                    href={withLocation(item.href)}
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
                  className={`px-2.5 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap text-[11px] ${
                    activeTab === "all"
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
                    className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
                      activeTab === "products"
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
                    className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
                      activeTab === "services"
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
                    className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
                      activeTab === "businesses"
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
                    className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
                      activeTab === "professionals"
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
                    className={`px-2.5 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
                      activeTab === "categories"
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

      {/* Shopping Cart Drawer */}
      <CartDrawer />
    </header>
  );
}
