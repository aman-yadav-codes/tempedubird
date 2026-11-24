"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Package,
  Wrench,
  UserCheck,
  GraduationCap,
  Briefcase,
  MapPin,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Store,
  ChevronRight,
  Layers,
  Loader2,
  Building2,
  Building,
  Calendar,
  Car,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export interface TrendingCategoryItem {
  id: number;
  name: string;
  slug: string;
  vertical: "product" | "service" | "professional" | "course" | "job" | "business" | "property" | "event" | "vehicle";
  itemCount: number;
  storeCount?: number | null;
  providerCount?: number | null;
  sampleItems: string[];
  href: string;
}

interface TrendingCategoriesResponse {
  location: string;
  isLocationSpecific: boolean;
  counts: {
    products: number;
    services: number;
    professionals: number;
    courses: number;
    jobs: number;
    businesses: number;
    properties: number;
    events: number;
    vehicles: number;
    total: number;
  };
  categories: {
    products: TrendingCategoryItem[];
    services: TrendingCategoryItem[];
    professionals: TrendingCategoryItem[];
    courses: TrendingCategoryItem[];
    jobs: TrendingCategoryItem[];
    businesses: TrendingCategoryItem[];
    properties: TrendingCategoryItem[];
    events: TrendingCategoryItem[];
    vehicles: TrendingCategoryItem[];
  };
}

interface TrendingLocationCategoriesProps {
  location: string;
}

const VERTICAL_CONFIGS = {
  product: {
    label: "Product",
    pluralLabel: "Products",
    icon: Package,
    colorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    borderHover: "hover:border-rose-500/40",
    btnColor: "text-rose-600 hover:text-rose-700 dark:text-rose-400",
    badgeLabel: "Product Category",
    exploreAllUrl: "/products",
  },
  service: {
    label: "Service",
    pluralLabel: "Services",
    icon: Wrench,
    colorClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    borderHover: "hover:border-amber-500/40",
    btnColor: "text-amber-600 hover:text-amber-700 dark:text-amber-400",
    badgeLabel: "Service Category",
    exploreAllUrl: "/explore?type=service",
  },
  professional: {
    label: "Expert",
    pluralLabel: "Professionals",
    icon: UserCheck,
    colorClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    borderHover: "hover:border-sky-500/40",
    btnColor: "text-sky-600 hover:text-sky-700 dark:text-sky-400",
    badgeLabel: "Verified Expert",
    exploreAllUrl: "/explore?type=professional",
  },
  course: {
    label: "Program",
    pluralLabel: "Courses",
    icon: GraduationCap,
    colorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    borderHover: "hover:border-emerald-500/40",
    btnColor: "text-emerald-600 hover:text-emerald-700 dark:text-emerald-400",
    badgeLabel: "Certified Course",
    exploreAllUrl: "/courses",
  },
  job: {
    label: "Opening",
    pluralLabel: "Jobs",
    icon: Briefcase,
    colorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    borderHover: "hover:border-purple-500/40",
    btnColor: "text-purple-600 hover:text-purple-700 dark:text-purple-400",
    badgeLabel: "Career Track",
    exploreAllUrl: "/jobs",
  },
  business: {
    label: "Business",
    pluralLabel: "Businesses",
    icon: Building2,
    colorClass: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    borderHover: "hover:border-indigo-500/40",
    btnColor: "text-indigo-600 hover:text-indigo-700 dark:text-indigo-400",
    badgeLabel: "Business Entity",
    exploreAllUrl: "/businesses",
  },
  property: {
    label: "Property",
    pluralLabel: "Properties",
    icon: Building,
    colorClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
    borderHover: "hover:border-cyan-500/40",
    btnColor: "text-cyan-600 hover:text-cyan-700 dark:text-cyan-400",
    badgeLabel: "Real Estate",
    exploreAllUrl: "/properties",
  },
  event: {
    label: "Event",
    pluralLabel: "Events",
    icon: Calendar,
    colorClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    borderHover: "hover:border-rose-500/40",
    btnColor: "text-rose-600 hover:text-rose-700 dark:text-rose-400",
    badgeLabel: "Live Event",
    exploreAllUrl: "/events",
  },
  vehicle: {
    label: "Vehicle",
    pluralLabel: "Vehicles",
    icon: Car,
    colorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    borderHover: "hover:border-blue-500/40",
    btnColor: "text-blue-600 hover:text-blue-700 dark:text-blue-400",
    badgeLabel: "Automobile & EV",
    exploreAllUrl: "/vehicles",
  },
};

type ActiveTab = "all" | "products" | "services" | "professionals" | "courses" | "jobs" | "businesses" | "properties" | "events" | "vehicles";

export function TrendingLocationCategories({ location }: TrendingLocationCategoriesProps) {
  const [data, setData] = useState<TrendingCategoriesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>("businesses");

  const effectiveLoc = location?.trim() || "Varanasi";

  // Re-fetch trending categories when location prop changes
  useEffect(() => {
    let isMounted = true;
    async function loadTrending() {
      try {
        setLoading(true);
        const url = `/api/public/trending-categories?location=${encodeURIComponent(effectiveLoc)}&limit=8`;
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (isMounted && json.success) {
            setData(json);
          }
        }
      } catch (err) {
        console.error("Failed to load location trending categories:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadTrending();
    return () => {
      isMounted = false;
    };
  }, [effectiveLoc]);

  // Flattened or filtered list of categories
  const displayedCategories = useMemo(() => {
    if (!data?.categories) return [];

    if (activeTab === "products") return data.categories.products || [];
    if (activeTab === "services") return data.categories.services || [];
    if (activeTab === "professionals") return data.categories.professionals || [];
    if (activeTab === "courses") return data.categories.courses || [];
    if (activeTab === "jobs") return data.categories.jobs || [];
    if (activeTab === "businesses") return data.categories.businesses || [];
    if (activeTab === "properties") return data.categories.properties || [];
    if (activeTab === "events") return data.categories.events || [];
    if (activeTab === "vehicles") return data.categories.vehicles || [];

    // "all": Interleave categories from all verticals
    const p = data.categories.products || [];
    const s = data.categories.services || [];
    const prof = data.categories.professionals || [];
    const c = data.categories.courses || [];
    const j = data.categories.jobs || [];
    const b = data.categories.businesses || [];
    const prop = data.categories.properties || [];
    const ev = data.categories.events || [];
    const v = data.categories.vehicles || [];

    const result: TrendingCategoryItem[] = [];
    const maxLen = Math.max(p.length, s.length, prof.length, c.length, j.length, b.length, prop.length, ev.length, v.length);

    for (let i = 0; i < maxLen; i++) {
      if (p[i]) result.push(p[i]);
      if (s[i]) result.push(s[i]);
      if (prof[i]) result.push(prof[i]);
      if (c[i]) result.push(c[i]);
      if (j[i]) result.push(j[i]);
      if (b[i]) result.push(b[i]);
      if (prop[i]) result.push(prop[i]);
      if (ev[i]) result.push(ev[i]);
      if (v[i]) result.push(v[i]);
    }

    return result.slice(0, 18);
  }, [data, activeTab]);

  const counts = data?.counts || {
    products: 0,
    services: 0,
    professionals: 0,
    courses: 0,
    jobs: 0,
    businesses: 0,
    properties: 0,
    events: 0,
    vehicles: 0,
    total: 0,
  };

  return (
    <section id="trending-categories" className="py-14 sm:py-18 border-b border-border/40 bg-background/50 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border-primary/20 gap-1.5 shadow-2xs">
                <Sparkles className="size-3.5" />
                <span>Popular in Your Area</span>
              </Badge>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border/60">
                <MapPin className="size-3 text-primary" />
                <span>{effectiveLoc}</span>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
              Trending Categories in <span className="text-primary">{effectiveLoc}</span>
            </h2>

            <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl leading-relaxed">
              Explore the most popular categories across local store products, on-demand services, verified experts, degree programs, and career openings near you.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs font-bold gap-1.5 rounded-xl border-border/70 hover:border-primary/50 shadow-2xs"
            >
              <Link href={`/explore?location=${encodeURIComponent(effectiveLoc)}`}>
                <span>Explore All in {effectiveLoc}</span>
                <ArrowRight className="size-3.5 text-primary" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-border/40">
          <button
            type="button"
            onClick={() => setActiveTab("businesses")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === "businesses"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
            }`}
          >
            <Building2 className="size-3.5" />
            <span>Business</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === "businesses"
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {counts.businesses}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("products")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === "products"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
            }`}
          >
            <Package className="size-3.5 text-rose-500" />
            <span>Products</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === "products" ? "bg-white/20 text-white" : "bg-muted text-foreground"
              }`}
            >
              {counts.products}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("professionals")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === "professionals"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
            }`}
          >
            <UserCheck className="size-3.5 text-sky-500" />
            <span>Professionals</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === "professionals" ? "bg-white/20 text-white" : "bg-muted text-foreground"
              }`}
            >
              {counts.professionals}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("courses")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === "courses"
                ? "bg-emerald-600 text-white shadow-xs"
                : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
            }`}
          >
            <GraduationCap className="size-3.5 text-emerald-500" />
            <span>Courses</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === "courses" ? "bg-white/20 text-white" : "bg-muted text-foreground"
              }`}
            >
              {counts.courses}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("jobs")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === "jobs"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
            }`}
          >
            <Briefcase className="size-3.5 text-purple-500" />
            <span>Jobs</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === "jobs" ? "bg-white/20 text-white" : "bg-muted text-foreground"
              }`}
            >
              {counts.jobs}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("properties")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === "properties"
                ? "bg-cyan-600 text-white shadow-xs"
                : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
            }`}
          >
            <Building className="size-3.5 text-cyan-500" />
            <span>Property</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === "properties" ? "bg-white/20 text-white" : "bg-muted text-foreground"
              }`}
            >
              {counts.properties}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("vehicles")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === "vehicles"
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
            }`}
          >
            <Car className="size-3.5 text-blue-500" />
            <span>Vehicles</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === "vehicles" ? "bg-white/20 text-white" : "bg-muted text-foreground"
              }`}
            >
              {counts.vehicles}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("events")}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
              activeTab === "events"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-card hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
            }`}
          >
            <Calendar className="size-3.5 text-rose-500" />
            <span>Events</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                activeTab === "events" ? "bg-white/20 text-white" : "bg-muted text-foreground"
              }`}
            >
              {counts.events}
            </span>
          </button>
        </div>

        {/* Categories Grid or Loading State */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="size-8 text-primary animate-spin mx-auto" />
            <p className="text-xs text-muted-foreground font-medium">
              Scanning local categories in {effectiveLoc}...
            </p>
          </div>
        ) : displayedCategories.length === 0 ? (
          <div className="py-12 text-center rounded-2xl border bg-card/60 p-8 space-y-3">
            <Sparkles className="size-8 text-muted-foreground/40 mx-auto" />
            <p className="text-sm font-bold text-foreground">No trending categories in this category</p>
            <p className="text-xs text-muted-foreground">
              Try switching tabs or resetting location to explore nationwide categories.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {displayedCategories.map((cat, idx) => {
              const cfg = VERTICAL_CONFIGS[cat.vertical] || VERTICAL_CONFIGS.product;
              const Icon = cfg.icon;

              return (
                <Link
                  key={`trend-cat-${cat.vertical}-${cat.id}-${idx}`}
                  href={cat.href}
                  className={`group block p-4 rounded-2xl border bg-card/80 transition-all duration-200 hover:shadow-md ${cfg.borderHover} relative flex flex-col justify-between`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Icon + Vertical Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className={`size-10 rounded-xl flex items-center justify-center shrink-0 border ${cfg.colorClass}`}>
                        <Icon className="size-5" />
                      </div>

                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${cfg.colorClass}`}
                      >
                        {cfg.label}
                      </Badge>
                    </div>

                    {/* Category Title & Item Count */}
                    <div>
                      <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-1" title={cat.name}>
                        {cat.name}
                      </h3>

                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                        <TrendingUp className="size-3 text-emerald-500 shrink-0" />
                        <span className="font-semibold text-foreground">
                          {cat.itemCount.toLocaleString()} {cfg.pluralLabel}
                        </span>
                        {cat.storeCount && cat.storeCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="truncate">{cat.storeCount} Stores</span>
                          </>
                        )}
                        {cat.providerCount && cat.providerCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="truncate">{cat.providerCount} Providers</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Sample items / Popular Pills */}
                    {cat.sampleItems && cat.sampleItems.length > 0 && (
                      <div className="pt-2 border-t border-border/50 flex flex-wrap gap-1">
                        {cat.sampleItems.slice(0, 2).map((item, iIdx) => (
                          <span
                            key={iIdx}
                            className="inline-block max-w-[140px] truncate rounded-md bg-muted/70 px-1.5 py-0.5 text-[10px] text-muted-foreground font-medium"
                            title={item}
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom: Explore link */}
                  <div className="pt-3 mt-3 border-t border-border/50 flex items-center justify-between text-xs">
                    <span className={`text-[11px] font-bold group-hover:underline flex items-center gap-1 ${cfg.btnColor}`}>
                      <span>Explore {cfg.pluralLabel}</span>
                      <ChevronRight className="size-3 group-hover:translate-x-0.5 transition-transform" />
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      In {effectiveLoc}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
