"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  Users,
  ShieldCheck,
  Briefcase,
  ArrowRight,
  ExternalLink,
  Layers,
  Sparkles,
  Package,
  FolderTree,
  UserCheck,
  Loader2,
  X,
  Tag,
  ChevronRight,
  IndianRupee,
  MapPin,
  GraduationCap,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductStoresDialog } from "@/components/public/product-stores-dialog";

const QUICK_MODULES = [
  {
    title: "Business & Professional Profiles",
    description: "Review, verify, and moderate all business and professional listings",
    href: "/platformadmin/profiles",
    icon: Building2,
  },
  {
    title: "Businesses & Professionals Directory",
    description: "Manage registered businesses, professionals, and tenant profiles",
    href: "/platformadmin/institutions",
    icon: Building2,
  },
  {
    title: "User Management",
    description: "Customers, business owners, professionals, and staff directory",
    href: "/platformadmin/users",
    icon: Users,
  },
  {
    title: "Access Control & Roles",
    description: "Unified role permissions and security policies",
    href: "/platformadmin/access-control",
    icon: ShieldCheck,
  },
  {
    title: "Operations & Tasks",
    description: "Track cross-organization deliverables and workflows",
    href: "/platformadmin/operations/tasks",
    icon: Briefcase,
  },
];

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

export function PlatformAdminHome() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "products" | "services" | "businesses" | "professionals" | "categories">("all");
  const [results, setResults] = useState<SearchResultsState | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [storesDialogOpen, setStoresDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: number | string; name: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch instant search suggestions
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      setTotalCount(0);
      setIsSearching(false);
      setIsOpen(false);
      return;
    }

    setIsSearching(true);
    setIsOpen(true);

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
        console.error("Platform admin instant search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      router.push("/platformadmin");
      return;
    }
    setIsOpen(false);
    // Direct quick match routing for admin shortcuts
    if (trimmed.includes("inst")) {
      router.push("/platformadmin/institutions");
    } else if (trimmed.includes("user") || trimmed.includes("staff") || trimmed.includes("customer")) {
      router.push("/platformadmin/users");
    } else if (trimmed.includes("role") || trimmed.includes("perm") || trimmed.includes("access")) {
      router.push("/platformadmin/access-control");
    } else if (trimmed.includes("task") || trimmed.includes("work") || trimmed.includes("operat")) {
      router.push("/platformadmin/operations/tasks");
    } else {
      router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
    }
  }

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

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-12 sm:py-20 max-w-4xl mx-auto w-full">
      {/* Central Google-style minimal branding */}
      <div className="text-center space-y-3 mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
          <Sparkles className="size-3" />
          <span>Platform Administrator Workspace</span>
        </div>
        <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-foreground">
          Edu<span className="text-primary">Bird</span>
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto">
          Centralized administration and platform governance for multi-institution infrastructure.
        </p>
      </div>

      {/* Google-style search bar with Suggestions Dropdown */}
      <div ref={containerRef} className="w-full max-w-2xl mb-8 relative">
        <form onSubmit={handleSearch}>
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground group-focus-within:text-primary transition-colors">
              <Search className="size-5" />
            </div>
            <input
              type="text"
              value={query}
              onFocus={() => {
                if (query.trim()) setIsOpen(true);
              }}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, services, businesses, professionals, or categories..."
              className="w-full h-13 pl-12 pr-12 rounded-full border border-border/80 bg-background text-foreground text-sm shadow-sm hover:shadow-md focus:shadow-md focus:outline-none focus:border-primary/80 focus:ring-4 focus:ring-primary/10 transition-all"
            />
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center gap-1">
              {isSearching ? (
                <Loader2 className="size-4 animate-spin text-primary" />
              ) : query ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setResults(null);
                    setIsOpen(false);
                  }}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted/80 transition-colors cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Buttons below search bar */}
          <div className="flex items-center justify-center gap-3 mt-4">
            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="text-xs px-4 h-9 rounded-md border border-border/60 hover:border-border cursor-pointer"
            >
              Search Platform
            </Button>
            <Link href="/platformadmin">
              <Button
                type="button"
                variant="default"
                size="sm"
                className="text-xs px-4 h-9 rounded-md gap-1.5 shadow-sm cursor-pointer"
              >
                <span>Open Console</span>
                <ArrowRight className="size-3.5" />
              </Button>
            </Link>
          </div>
        </form>

        {/* ================= AUTOCOMPLETE SEARCH SUGGESTIONS DROPDOWN ================= */}
        {isOpen && query.trim().length > 0 && (
          <div className="absolute left-0 right-0 top-[56px] bg-card rounded-2xl border border-border shadow-2xl z-50 overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Filter Pills Header */}
            <div className="flex items-center gap-1.5 p-3 border-b bg-muted/40 overflow-x-auto scrollbar-none text-xs">
              <button
                type="button"
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer whitespace-nowrap text-xs ${
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
                  className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-xs flex items-center gap-1.5 ${
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
                  className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-xs flex items-center gap-1.5 ${
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
                  className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-xs flex items-center gap-1.5 ${
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
                  className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-xs flex items-center gap-1.5 ${
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
                  className={`px-3 py-1 rounded-full font-semibold transition-all cursor-pointer whitespace-nowrap text-xs flex items-center gap-1.5 ${
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
                <div className="p-8 text-center space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    No results found for &quot;<span className="text-foreground">{query}</span>&quot;
                  </p>
                  <p className="text-[11px] text-muted-foreground/80">
                    Try searching by product brand, service type, or professional skill.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="mt-2 text-xs"
                    onClick={() => {
                      setIsOpen(false);
                      router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
                    }}
                  >
                    Search Full Marketplace Catalogue
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
                          setIsOpen(false);
                          if (item.type === "product") {
                            // On clicking searched product: show all stores selling this product with prices!
                            setSelectedProduct({ id: item.id, name: item.title });
                            setStoresDialogOpen(true);
                          } else if (isProfile) {
                            // If clicked on profile: open profile page!
                            router.push(item.profileHref || item.href);
                          } else {
                            // If clicked on service or category: open storefront/listing page!
                            router.push(item.storefrontHref || item.listingHref || item.href);
                          }
                        }}
                        className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
                      >
                        {/* Icon Badge */}
                        <div
                          className={`size-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
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
                          <div className="flex items-center gap-2 flex-wrap">
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

                            {/* Related Category Badge */}
                            {item.category_name && item.type !== "category" && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-2 py-0 bg-muted text-muted-foreground font-semibold flex items-center gap-1"
                              >
                                <Tag className="size-2.5" />
                                <span>{item.category_name}</span>
                              </Badge>
                            )}

                            {/* Related Subcategory Badge */}
                            {item.subcategory_name && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 font-medium text-muted-foreground"
                              >
                                {item.subcategory_name}
                              </Badge>
                            )}
                          </div>

                          {/* Subtitle / Details (e.g. Price, Location, Designation) */}
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
                          <>
                            {/* Open Profile Page Button */}
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              className="h-7 text-[11px] font-bold px-2.5 bg-primary hover:bg-primary/90 text-primary-foreground gap-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                                router.push(item.profileHref || item.href);
                              }}
                            >
                              <span>View Profile</span>
                              <ExternalLink className="size-3" />
                            </Button>

                            {/* View in Listings Button */}
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 text-[11px] font-medium px-2 border-border/80 text-muted-foreground hover:text-foreground"
                              title="Show in Search Listings"
                              onClick={(e) => {
                                e.stopPropagation();
                                setIsOpen(false);
                                router.push(item.listingHref || `/explore?type=${item.type}&q=${encodeURIComponent(item.title)}`);
                              }}
                            >
                              Listings
                            </Button>
                          </>
                        ) : (
                          /* Open Store Front or Listing Page Button */
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="h-7 text-[11px] font-bold px-2.5 hover:bg-primary hover:text-primary-foreground gap-1 transition-all"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsOpen(false);
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
                                <span>Open Listings</span>
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
            <div className="p-2.5 bg-muted/40 border-t flex items-center justify-between text-xs px-4">
              <span className="text-[11px] text-muted-foreground">
                Showing top suggestions for &quot;<strong className="text-foreground">{query}</strong>&quot;
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs font-bold text-primary hover:text-primary gap-1 cursor-pointer p-0 hover:bg-transparent"
                onClick={() => {
                  setIsOpen(false);
                  router.push(`/explore?q=${encodeURIComponent(query.trim())}`);
                }}
              >
                <span>View all listings on Explore Page</span>
                <ArrowRight className="size-3" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Quick shortcut cards */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3 pt-6 border-t border-border/40">
        {QUICK_MODULES.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group p-3.5 rounded-xl border border-border/60 bg-card/50 hover:bg-card hover:border-primary/30 transition-all flex items-start gap-3 shadow-2xs hover:shadow-sm"
            >
              <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Icon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                    {item.title}
                  </h3>
                  <ExternalLink className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-1" />
                </div>
                <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                  {item.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Multi-Store Comparison Dialog */}
      <ProductStoresDialog
        productId={selectedProduct?.id ?? null}
        productName={selectedProduct?.name}
        open={storesDialogOpen}
        onOpenChange={setStoresDialogOpen}
      />
    </div>
  );
}
