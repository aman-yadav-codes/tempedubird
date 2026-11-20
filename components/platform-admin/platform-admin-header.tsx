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
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuthStore, useCartStore } from "@/store";
import { toast } from "sonner";
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
  {
    label: "Blog",
    href: "/blogs",
    icon: FileText,
    subcategories: [
      { label: "All Articles & Insights", href: "/blogs" },
      { label: "Academic & Curriculum", href: "/blogs?category=Academic+%26+Curriculum" },
      { label: "Career & Placements", href: "/blogs?category=Placements+%26+Career" },
      { label: "Technology & Innovation", href: "/blogs?category=Technology+%26+Innovation" },
      { label: "Admissions & Counseling", href: "/blogs?category=Admissions+%26+Counseling" },
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
          {/* + Add Listing Button: Direct Link to Packages & Pricing Page */}
          <Link href="/packages">
            <Button
              variant="outline"
              size="sm"
              className="h-8.5 px-3.5 rounded-full border border-border/80 bg-background/60 hover:bg-muted font-bold text-xs gap-1.5 cursor-pointer shadow-2xs shrink-0 hover:border-primary/50 transition-all"
            >
              <Plus className="size-3.5 text-primary" />
              <span>Add Listing</span>
            </Button>
          </Link>
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

          {/* Location Selector Button (Circular FindMy styled pin icon) */}
          <button
            type="button"
            onClick={() => setLocationDialogOpen(true)}
            className="relative size-8.5 rounded-full border border-border/80 bg-background/60 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer shrink-0 shadow-2xs group flex items-center justify-center"
            title={location ? `Location: ${location} (Click to change)` : "Select Location"}
            aria-label="Select Location"
          >
            <MapPin className="size-4 text-amber-500 group-hover:scale-110 transition-transform" />
            {isDetected && (
              <span
                className="absolute top-1 right-1 size-2 rounded-full bg-emerald-500 ring-2 ring-background"
                title="GPS Live Detected"
              />
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
        <DialogContent className="max-w-md bg-card border text-foreground rounded-3xl p-6 space-y-5 shadow-2xl">
          <DialogHeader className="space-y-1.5">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <MapPin className="size-5 text-amber-500" />
                <span>Select Your Location</span>
              </DialogTitle>
              {isDetected && (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                  Live GPS Active
                </Badge>
              )}
            </div>
            <DialogDescription className="text-xs text-muted-foreground">
              Discover verified businesses, services, products, and opportunities in your area.
            </DialogDescription>
          </DialogHeader>

          {/* Currently Selected Location Pill */}
          <div className="p-3.5 rounded-2xl bg-muted/40 border flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Active Location:</span>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-foreground flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                <span>{location || "All Locations"}</span>
              </span>
              {location && location !== "All Locations" && (
                <button
                  type="button"
                  onClick={() => {
                    setLocation("All Locations", false);
                    toast.success("Location set to All Locations");
                  }}
                  className="text-[10px] text-muted-foreground hover:text-amber-500 font-bold underline cursor-pointer ml-1"
                >
                  Clear
                </button>
              )}
            </div>
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
            className="w-full py-5 rounded-2xl border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-foreground font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
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
          <div className="relative flex items-center justify-center">
            <div className="w-full border-t border-border" />
            <span className="absolute bg-card px-3 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Or Enter Location
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
                placeholder="Enter city, province, or area name..."
                value={customLocationInput}
                onChange={(e) => setCustomLocationInput(e.target.value)}
                className="w-full h-11 pl-10 pr-24 rounded-2xl bg-background border border-border/80 text-xs sm:text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
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
                className="absolute right-1.5 h-8 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs cursor-pointer disabled:opacity-40"
              >
                Set
              </Button>
            </div>

            {/* Google Places Autocomplete Suggestions */}
            {locationSuggestions.length > 0 && (
              <div className="space-y-1 max-h-60 overflow-y-auto rounded-2xl border border-border/70 bg-card p-1.5 shadow-lg animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between px-2.5 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b border-border/40 pb-1">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="size-3 text-amber-500" />
                    Location Suggestions
                  </span>
                  <span className="text-[9px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full font-bold">
                    Google Places
                  </span>
                </div>
                {locationSuggestions.map((item) => (
                  <button
                    key={item.id || item.place_id}
                    type="button"
                    onClick={() => {
                      const chosenLocation = item.name || item.description.split(",")[0].trim();
                      setLocation(chosenLocation, false);
                      toast.success(`Location set to "${chosenLocation}"`);
                      setCustomLocationInput("");
                      setLocationSuggestions([]);
                      setLocationDialogOpen(false);
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-amber-500/10 transition-colors flex items-start gap-2.5 group cursor-pointer"
                  >
                    <div className="size-7 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-500 group-hover:text-black transition-colors">
                      <MapPin className="size-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-foreground group-hover:text-amber-600 transition-colors truncate">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {item.secondary_text || item.description}
                      </div>
                    </div>
                  </button>
                ))}
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
