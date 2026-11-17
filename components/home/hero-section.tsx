"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  CheckCircle2,
  BookOpen,
  Users,
  GraduationCap,
  TrendingUp,
  Package,
  Briefcase,
  Building2,
  UserCheck,
  FolderTree,
  Loader2,
  X,
  Tag,
  ChevronRight,
  ExternalLink,
  ArrowRight,
  Store,
} from "lucide-react";
import { parseSearchIntent } from "@/lib/utils/search-intent";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductStoresDialog } from "@/components/public/product-stores-dialog";

const HERO_STATS = [
  { value: "50,000+", label: "Courses", icon: BookOpen },
  { value: "10,000+", label: "Institutes", icon: Users },
  { value: "100+", label: "Categories", icon: GraduationCap },
  { value: "1M+", label: "Learners", icon: TrendingUp },
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

export function HeroSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<{
    businesses: SearchResultItem[];
    professionals: SearchResultItem[];
    products: SearchResultItem[];
    services: SearchResultItem[];
    categories: SearchResultItem[];
    courses: SearchResultItem[];
    institutes: SearchResultItem[];
    teachers: SearchResultItem[];
  } | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [storesDialogOpen, setStoresDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<{ id: number | string; name: string } | null>(null);

  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close suggestions on outside click
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
    const trimmed = searchQuery.trim();
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
        console.error("Hero instant search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;
    setIsOpen(false);
    const intent = parseSearchIntent(query);
    const finalParam = intent.cleanQuery ? encodeURIComponent(intent.cleanQuery) : encodeURIComponent(query);
    const separator = intent.targetRoute.includes("?") ? "&" : "?";
    const targetUrl = intent.targetRoute.startsWith("/explore")
      ? `${intent.targetRoute}${separator}q=${finalParam}`
      : `${intent.targetRoute}${separator}search=${finalParam}`;
    router.push(targetUrl);
  };

  const suggestionsList = (() => {
    if (!results) return [];
    return [
      ...(results.categories || []),
      ...(results.products || []),
      ...(results.services || []),
      ...(results.businesses || []),
      ...(results.professionals || []),
      ...(results.institutes || []),
      ...(results.courses || []),
      ...(results.teachers || []),
    ].slice(0, 8);
  })();

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#FFFDFD] via-[#FFF8F8]/60 to-white py-12 lg:py-20 border-b border-gray-100">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-12 items-center">
          {/* Left Column: Hero Content */}
          <div className="lg:col-span-7 space-y-6 text-left">
            {/* Verified Badge */}
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-rose-100/80 text-[#D92D20] text-xs font-semibold border border-rose-200/60 shadow-2xs">
              <CheckCircle2 className="h-3.5 w-3.5 text-[#D92D20]" />
              <span>Verified Learning Platform</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
              Find Products, Services &amp;{" "}
              <span className="text-[#D92D20]">Verified Businesses</span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-gray-600 max-w-xl leading-relaxed">
              Discover trusted businesses, professional consultants, top master products,
              specialized services, and accredited learning institutes.
            </p>

            {/* Hero Search Box with Autocomplete Dropdown */}
            <div ref={containerRef} className="relative max-w-2xl">
              <form
                onSubmit={handleSearchSubmit}
                className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-2xl shadow-lg border border-gray-100"
              >
                <div className="relative flex-1 w-full flex items-center">
                  <Search className="absolute left-4 h-5 w-5 text-gray-400 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onFocus={() => {
                      if (searchQuery.trim()) setIsOpen(true);
                    }}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products, services, businesses, professionals..."
                    className="w-full bg-transparent text-gray-900 text-sm font-normal py-3 pl-11 pr-10 outline-none placeholder:text-gray-400"
                  />
                  <div className="absolute right-3 flex items-center">
                    {isSearching ? (
                      <Loader2 className="size-4 animate-spin text-[#D92D20]" />
                    ) : searchQuery ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setResults(null);
                          setIsOpen(false);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-full"
                      >
                        <X className="size-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full sm:w-auto bg-[#D92D20] hover:bg-[#B91C1C] text-white font-bold text-sm px-7 py-3 rounded-xl transition-all shadow-md shrink-0 cursor-pointer"
                >
                  Search
                </button>
              </form>

              {/* Suggestions Dropdown */}
              {isOpen && searchQuery.trim().length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 overflow-hidden divide-y divide-gray-100 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="p-2.5 bg-gray-50/80 border-b flex items-center justify-between text-xs px-4">
                    <span className="font-semibold text-gray-600">
                      Suggestions for &quot;<strong className="text-gray-900">{searchQuery}</strong>&quot; ({totalCount})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        router.push(`/explore?q=${encodeURIComponent(searchQuery.trim())}`);
                      }}
                      className="text-xs font-bold text-[#D92D20] hover:underline flex items-center gap-1"
                    >
                      <span>Explore all</span>
                      <ArrowRight className="size-3" />
                    </button>
                  </div>

                  <div className="max-h-[340px] overflow-y-auto divide-y divide-gray-50">
                    {suggestionsList.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-500">
                        No direct suggestions found. Press Search to explore the full marketplace.
                      </div>
                    ) : (
                      suggestionsList.map((item, idx) => {
                        const isProfile = item.type === "business" || item.type === "professional";

                        return (
                          <div
                            key={`${item.type}-${item.id}-${idx}`}
                            className="p-3 hover:bg-rose-50/40 transition-colors flex items-center justify-between gap-3 group"
                          >
                            <div
                              onClick={() => {
                                setIsOpen(false);
                                if (item.type === "product") {
                                  setSelectedProduct({ id: item.id, name: item.title });
                                  setStoresDialogOpen(true);
                                } else if (isProfile) {
                                  router.push(item.profileHref || item.href);
                                } else {
                                  router.push(item.storefrontHref || item.listingHref || item.href);
                                }
                              }}
                              className="flex items-start gap-3 min-w-0 flex-1 cursor-pointer"
                            >
                              <div
                                className={`size-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                  item.type === "product"
                                    ? "bg-amber-100 text-amber-700"
                                    : item.type === "service"
                                    ? "bg-sky-100 text-sky-700"
                                    : item.type === "business"
                                    ? "bg-indigo-100 text-indigo-700"
                                    : item.type === "professional"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-rose-100 text-rose-700"
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
                                  <span className="text-xs font-bold text-gray-900 group-hover:text-[#D92D20] transition-colors">
                                    {item.title}
                                  </span>

                                  <Badge variant="outline" className="text-[9px] px-1 py-0 uppercase font-bold text-gray-500">
                                    {item.type}
                                  </Badge>

                                  {item.category_name && item.type !== "category" && (
                                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-gray-100 text-gray-600 font-medium flex items-center gap-1">
                                      <Tag className="size-2.5" />
                                      <span>{item.category_name}</span>
                                    </Badge>
                                  )}

                                  {item.subcategory_name && (
                                    <Badge variant="outline" className="text-[9px] px-1 py-0 text-gray-500">
                                      {item.subcategory_name}
                                    </Badge>
                                  )}
                                </div>

                                {item.subtitle && (
                                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                                    {item.subtitle}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5">
                              {isProfile ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="default"
                                  className="h-7 text-[11px] font-bold px-2.5 bg-[#D92D20] hover:bg-[#B91C1C] text-white gap-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setIsOpen(false);
                                    router.push(item.profileHref || item.href);
                                  }}
                                >
                                  <span>View Profile</span>
                                  <ExternalLink className="size-3" />
                                </Button>
                              ) : (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="secondary"
                                  className="h-7 text-[11px] font-semibold px-2 hover:bg-[#D92D20] hover:text-white transition-all gap-1"
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
                                      <span>Listings</span>
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
                </div>
              )}
            </div>

            {/* 4 Stat Badges */}
            <div className="pt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl border-t border-gray-100">
              {HERO_STATS.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="flex items-center gap-3 p-2 rounded-xl">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-[#D92D20]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-lg font-bold text-gray-900 leading-none">
                        {stat.value}
                      </div>
                      <div className="text-xs text-gray-500 font-medium mt-1">
                        {stat.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Hero Image Composition */}
          <div className="lg:col-span-5 relative">
            <div className="relative mx-auto max-w-lg lg:max-w-none">
              <div className="absolute -top-4 -bottom-4 -left-4 -right-4 bg-gradient-to-r from-rose-200/40 via-orange-100/40 to-rose-300/30 rounded-3xl blur-xl -z-10" />
              <div className="relative rounded-3xl overflow-hidden border border-gray-100 bg-white shadow-2xl">
                <div className="relative h-[340px] sm:h-[420px] w-full">
                  <Image
                    src="/images/hero-books.jpg"
                    alt="Stack of graduation textbooks and cap"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    className="object-cover object-center"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Store Comparison Dialog */}
      <ProductStoresDialog
        productId={selectedProduct?.id ?? null}
        productName={selectedProduct?.name}
        open={storesDialogOpen}
        onOpenChange={setStoresDialogOpen}
      />
    </section>
  );
}
