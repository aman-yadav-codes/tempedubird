"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Globe,
  MapPin,
  FolderTree,
  Search,
  ChevronRight,
  ChevronDown,
  Loader2,
  CheckCircle2,
  XCircle,
  Plus,
  ArrowLeft,
  Building2,
  Package,
  Briefcase,
  BookOpen,
  Car,
  Home,
  Calendar,
  UtensilsCrossed,
  Bed,
  Layers,
  Filter,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

// Vertical catalog definitions with icons
export const CATALOG_VERTICALS = [
  { key: "course", label: "Courses & Academic", icon: BookOpen },
  { key: "product", label: "Products", icon: Package },
  { key: "service", label: "Services", icon: Briefcase },
  { key: "vehicle", label: "Vehicles & Transport", icon: Car },
  { key: "property", label: "Properties & Real Estate", icon: Home },
  { key: "event", label: "Events & Workshops", icon: Calendar },
  { key: "dish", label: "Dishes & Menu", icon: UtensilsCrossed },
  { key: "room", label: "Rooms & Stays", icon: Bed },
  { key: "job", label: "Jobs & Careers", icon: Briefcase },
];

// Business Category to Verticals mapping
export const BUSINESS_CATEGORY_VERTICAL_MAP: Record<string, string[]> = {
  "education-and-coaching": ["course", "product", "service", "job"],
  "real-estate": ["property", "service", "product"],
  "construction": ["service", "product", "job"],
  "hospitality": ["room", "dish", "service"],
  "events": ["event", "service", "product"],
  "automotive": ["vehicle", "service", "product"],
  "transport": ["vehicle", "service"],
  "financial-services": ["service", "job"],
  "real-estate-and-construction": ["property", "service", "product"],
  "hospitality-and-events": ["room", "event", "dish", "service"],
  "automotive-and-transport": ["vehicle", "service", "product"],
  "food-dining-and-cafes": ["dish", "product", "service", "event"],
  "healthcare-and-medical": ["service", "product"],
  "retail-and-shopping": ["product", "service"],
  "salons-and-personal-care": ["service", "product"],
  "fitness-and-sports": ["service", "product", "event"],
  "home-services-and-maintenance": ["service", "product"],
  "it-and-digital-agencies": ["service", "product", "job"],
  "professional-and-financial-services": ["service", "job"],
};

interface SubcategoryItem {
  id: number;
  name: string;
  slug: string;
  parent_id: number;
  category_type?: string;
  is_active: boolean;
  is_seo_active: boolean;
}

interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  category_type: string;
  business_category_id?: number | null;
  icon_url?: string | null;
  is_active: boolean;
  is_seo_active: boolean;
  subcategories?: SubcategoryItem[];
  subcategoriesCount?: number;
  activeSubcategoriesCount?: number;
}

interface LocationItem {
  id: number;
  name: string;
  slug: string;
  type: "country" | "state" | "city" | "area";
  parent_id: number | null;
  is_active: boolean;
  is_seo_active: boolean;
  children_count: number;
}

interface BreadcrumbItem {
  id: number | null;
  name: string;
  type: string;
  slug?: string;
}

export function SeoLocationsManager() {
  const { accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"category" | "location">("category");

  // ==========================================
  // Category Tab States
  // ==========================================
  const [businessCategories, setBusinessCategories] = useState<Array<{ id: number; name: string; slug: string }>>([]);
  const [selectedBusinessCategory, setSelectedBusinessCategory] = useState<string>("all");
  const [selectedVertical, setSelectedVertical] = useState<string>("course");
  const [categorySearch, setCategorySearch] = useState<string>("");
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loadingCategories, setLoadingCategories] = useState<boolean>(true);
  const [expandedCategories, setExpandedCategories] = useState<Set<number>>(new Set());
  const [categorySummary, setCategorySummary] = useState<{ seoActive: number; inactive: number; total: number }>({
    seoActive: 0,
    inactive: 0,
    total: 0,
  });

  // ==========================================
  // Location Tab States
  // ==========================================
  const [currentParentId, setCurrentParentId] = useState<number | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, name: "All locations", type: "root" },
  ]);
  const [locations, setLocations] = useState<LocationItem[]>([]);
  const [locationSearch, setLocationSearch] = useState<string>("");
  const [loadingLocations, setLoadingLocations] = useState<boolean>(true);
  const [locationSummary, setLocationSummary] = useState<{ seoActive: number; inactive: number; total: number }>({
    seoActive: 0,
    inactive: 0,
    total: 0,
  });

  // Add Location Dialog
  const [addLocationDialogOpen, setAddLocationDialogOpen] = useState<boolean>(false);
  const [newLocationName, setNewLocationName] = useState<string>("");
  const [newLocationType, setNewLocationType] = useState<"country" | "state" | "city" | "area">("city");
  const [creatingLocation, setCreatingLocation] = useState<boolean>(false);

  // Active verticals based on selected Business Category
  const allowedVerticals = useMemo(() => {
    if (selectedBusinessCategory === "all") return CATALOG_VERTICALS;
    const allowedKeys = BUSINESS_CATEGORY_VERTICAL_MAP[selectedBusinessCategory];
    if (!allowedKeys || allowedKeys.length === 0) return CATALOG_VERTICALS;
    return CATALOG_VERTICALS.filter((v) => allowedKeys.includes(v.key));
  }, [selectedBusinessCategory]);

  // If selected vertical is not in allowed list, pick the first allowed vertical
  useEffect(() => {
    if (allowedVerticals.length > 0 && !allowedVerticals.some((v) => v.key === selectedVertical)) {
      setSelectedVertical(allowedVerticals[0].key);
    }
  }, [allowedVerticals, selectedVertical]);

  // ==========================================
  // Fetch Categories
  // ==========================================
  const fetchCategories = useCallback(async () => {
    setLoadingCategories(true);
    try {
      const bizParam =
        selectedBusinessCategory && selectedBusinessCategory !== "all"
          ? `&business_category_slug=${encodeURIComponent(selectedBusinessCategory)}`
          : "";
      const searchParam = categorySearch ? `&search=${encodeURIComponent(categorySearch)}` : "";
      const res = await fetch(
        `/api/platformadmin/seo-locations/categories?vertical=${selectedVertical}${bizParam}${searchParam}`
      );
      const json = await res.json();
      if (json.success) {
        setCategories(json.categories || []);
        if (json.summary) setCategorySummary(json.summary);
        if (json.businessCategories && businessCategories.length === 0) {
          setBusinessCategories(json.businessCategories);
        }
        // Expand first 3 categories by default
        if (json.categories && json.categories.length > 0) {
          setExpandedCategories(new Set(json.categories.slice(0, 3).map((c: any) => c.id)));
        }
      } else {
        toast.error(json.error || "Failed to load categories.");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error loading categories.");
    } finally {
      setLoadingCategories(false);
    }
  }, [selectedVertical, selectedBusinessCategory, categorySearch, businessCategories.length]);

  useEffect(() => {
    if (activeTab === "category") {
      fetchCategories();
    }
  }, [fetchCategories, activeTab]);

  // ==========================================
  // Fetch Locations
  // ==========================================
  const fetchLocations = useCallback(async () => {
    setLoadingLocations(true);
    try {
      const pParam = currentParentId !== null ? `parent_id=${currentParentId}&` : "";
      const sParam = locationSearch ? `search=${encodeURIComponent(locationSearch)}` : "";
      const res = await fetch(`/api/platformadmin/seo-locations/locations?${pParam}${sParam}`);
      const json = await res.json();
      if (json.success) {
        setLocations(json.locations || []);
        if (json.breadcrumbs) setBreadcrumbs(json.breadcrumbs);
        if (json.summary) setLocationSummary(json.summary);
      } else {
        toast.error(json.error || "Failed to load locations.");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error loading locations.");
    } finally {
      setLoadingLocations(false);
    }
  }, [currentParentId, locationSearch]);

  useEffect(() => {
    if (activeTab === "location") {
      fetchLocations();
    }
  }, [fetchLocations, activeTab]);

  // ==========================================
  // Toggle Category / Subcategory SEO Active
  // ==========================================
  const handleToggleCategory = async (id: number, currentActive: boolean, isRoot: boolean) => {
    const nextActive = !currentActive;

    // Optimistic update
    setCategories((prev) =>
      prev.map((cat) => {
        if (cat.id === id) {
          return {
            ...cat,
            is_seo_active: nextActive,
            is_active: nextActive,
          };
        }
        if (cat.subcategories) {
          const subIdx = cat.subcategories.findIndex((s) => s.id === id);
          if (subIdx !== -1) {
            const updatedSubs = [...cat.subcategories];
            updatedSubs[subIdx] = {
              ...updatedSubs[subIdx],
              is_seo_active: nextActive,
              is_active: nextActive,
            };
            return {
              ...cat,
              subcategories: updatedSubs,
              activeSubcategoriesCount: updatedSubs.filter((s) => s.is_seo_active).length,
            };
          }
        }
        return cat;
      })
    );

    try {
      const res = await fetch("/api/platformadmin/seo-locations/categories", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ id, is_seo_active: nextActive }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          nextActive
            ? "Marked SEO Active — Will now appear on listing pages"
            : "Marked Inactive — Hidden from listing pages"
        );
        if (json.summary) setCategorySummary(json.summary);
      } else {
        toast.error(json.error || "Failed to update status.");
        fetchCategories(); // revert
      }
    } catch (err: any) {
      toast.error(err.message || "Network error.");
      fetchCategories();
    }
  };

  // Toggle all subcategories of a category
  const handleToggleAllSubcategories = async (category: CategoryItem, activate: boolean) => {
    if (!category.subcategories || category.subcategories.length === 0) return;

    // Optimistic update
    setCategories((prev) =>
      prev.map((c) => {
        if (c.id === category.id) {
          const updatedSubs = (c.subcategories || []).map((s) => ({
            ...s,
            is_seo_active: activate,
            is_active: activate,
          }));
          return {
            ...c,
            is_seo_active: activate,
            is_active: activate,
            subcategories: updatedSubs,
            activeSubcategoriesCount: activate ? updatedSubs.length : 0,
          };
        }
        return c;
      })
    );

    try {
      const res = await fetch("/api/platformadmin/seo-locations/categories", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          id: category.id,
          is_seo_active: activate,
          cascade: true,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          activate
            ? `Activated category and all ${category.subcategories.length} subcategories`
            : `Deactivated category and all subcategories`
        );
        if (json.summary) setCategorySummary(json.summary);
      } else {
        toast.error(json.error || "Failed to update category.");
        fetchCategories();
      }
    } catch (err: any) {
      toast.error(err.message || "Network error.");
      fetchCategories();
    }
  };

  // Toggle Category Accordion Expand
  const toggleAccordion = (id: number) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ==========================================
  // Toggle Location SEO Active
  // ==========================================
  const handleToggleLocation = async (id: number, currentActive: boolean) => {
    const nextActive = !currentActive;

    // Optimistic update
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === id ? { ...loc, is_seo_active: nextActive, is_active: nextActive } : loc
      )
    );

    try {
      const res = await fetch("/api/platformadmin/seo-locations/locations", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ id, is_seo_active: nextActive }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(
          nextActive
            ? "Location marked SEO Active — Will now appear in public location selectors & listings"
            : "Location marked Inactive — Hidden from public listing filters"
        );
        if (json.summary) setLocationSummary(json.summary);
      } else {
        toast.error(json.error || "Failed to update location.");
        fetchLocations();
      }
    } catch (err: any) {
      toast.error(err.message || "Network error.");
      fetchLocations();
    }
  };

  // Create New Location
  const handleCreateLocation = async () => {
    if (!newLocationName.trim()) {
      toast.error("Please enter location name");
      return;
    }

    setCreatingLocation(true);
    try {
      const res = await fetch("/api/platformadmin/seo-locations/locations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          name: newLocationName.trim(),
          type: newLocationType,
          parent_id: currentParentId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success("Location added successfully!");
        setNewLocationName("");
        setAddLocationDialogOpen(false);
        fetchLocations();
      } else {
        toast.error(json.error || "Failed to add location.");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error.");
    } finally {
      setCreatingLocation(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Page Title & Subtitle */}
      <div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className="bg-primary/10 text-primary border-primary/20 text-xs px-2.5 py-0.5 font-bold uppercase tracking-wider"
          >
            Platform Management
          </Badge>
          <span className="text-xs text-muted-foreground font-medium">
            Directory & Search Engine Optimization
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 flex items-center gap-2.5 text-foreground">
          <Globe className="size-7 text-primary" />
          SEO locations
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Mark categories and locations that should be available for SEO pages.
        </p>
      </div>

      {/* Summary KPI Cards (Matching Image 1 & 2 dark styling) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* SEO Active Card */}
        <div className="rounded-2xl p-6 bg-slate-950 text-white border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            SEO active
          </div>
          <div className="text-4xl sm:text-5xl font-black mt-2 tracking-tight text-white">
            {activeTab === "category" ? categorySummary.seoActive : locationSummary.seoActive}
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium">
            {activeTab === "category"
              ? "Categories and subcategories marked for location URLs"
              : "Locations marked for SEO"}
          </div>
        </div>

        {/* Inactive Card */}
        <div className="rounded-2xl p-6 bg-slate-950 text-white border border-slate-800 shadow-xl relative overflow-hidden">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Inactive
          </div>
          <div className="text-4xl sm:text-5xl font-black mt-2 tracking-tight text-slate-300">
            {activeTab === "category" ? categorySummary.inactive : locationSummary.inactive}
          </div>
          <div className="text-xs text-slate-400 mt-2 font-medium">
            {activeTab === "category"
              ? "Categories and subcategories not marked for SEO"
              : "Locations not marked for SEO"}
          </div>
        </div>
      </div>

      {/* Main Tab Controls */}
      <div className="flex items-center gap-6 border-b border-border">
        <button
          onClick={() => setActiveTab("category")}
          className={cn(
            "pb-3 text-sm font-bold transition-all relative",
            activeTab === "category"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Category
        </button>
        <button
          onClick={() => setActiveTab("location")}
          className={cn(
            "pb-3 text-sm font-bold transition-all relative",
            activeTab === "location"
              ? "text-primary border-b-2 border-primary"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Location
        </button>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: CATEGORY TAB VIEW                                          */}
      {/* ================================================================= */}
      {activeTab === "category" && (
        <div className="space-y-6">
          {/* Step 1: Select Business Category & Step 2: Select Vertical Filter */}
          <Card className="rounded-2xl border shadow-xs bg-card">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* 1. Business Category Selector */}
                <div className="space-y-1.5 flex-1">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-primary" />
                    <span>1. Select Business Category</span>
                  </label>
                  <select
                    value={selectedBusinessCategory}
                    onChange={(e) => setSelectedBusinessCategory(e.target.value)}
                    className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
                  >
                    <option value="all">All Business Types / Universal</option>
                    {businessCategories.map((bc) => (
                      <option key={bc.id} value={bc.slug}>
                        {bc.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Vertical Filter Pills */}
                <div className="space-y-1.5 flex-[1.6]">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Layers className="size-3.5 text-primary" />
                    <span>2. Select Vertical (Activated for this Business Category)</span>
                  </label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {allowedVerticals.map((v) => {
                      const Icon = v.icon;
                      const isSelected = selectedVertical === v.key;
                      return (
                        <button
                          key={v.key}
                          type="button"
                          onClick={() => setSelectedVertical(v.key)}
                          className={cn(
                            "px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-2xs border",
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-background text-muted-foreground border-border hover:bg-muted/60 hover:text-foreground"
                          )}
                        >
                          <Icon className="size-3.5" />
                          <span>{v.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search Categories Bar & Description */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder="Search categories..."
                className="pl-10 pr-24 h-12 rounded-2xl bg-card border text-sm font-medium"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                {categories.length} categories
              </span>
            </div>
            <p className="text-xs text-muted-foreground font-medium px-1">
              Check each category or subcategory that should have SEO location URLs. They can be
              selected independently.
            </p>
          </div>

          {/* Categories & Subcategories List */}
          {loadingCategories ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-card border rounded-2xl">
              <Loader2 className="size-8 text-primary animate-spin" />
              <p className="text-xs font-semibold text-muted-foreground">Loading categories...</p>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center p-12 bg-card border rounded-2xl space-y-3">
              <FolderTree className="size-10 text-muted-foreground/50 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">No categories found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No categories match the selected filters or search query. Try choosing another
                vertical or relaxing your search keyword.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {categories.map((cat) => {
                const isExpanded = expandedCategories.has(cat.id);
                const subcategories = cat.subcategories || [];

                return (
                  <div
                    key={cat.id}
                    className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden transition-all"
                  >
                    {/* Category Header Row (matching Image 2) */}
                    <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/60 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start sm:items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleAccordion(cat.id)}
                          className="mt-0.5 sm:mt-0 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-5" />
                          ) : (
                            <ChevronRight className="size-5" />
                          )}
                        </button>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm sm:text-base font-bold text-foreground">
                              {cat.name}
                            </span>
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-2 py-0.5 font-semibold text-muted-foreground"
                            >
                              {cat.subcategoriesCount || subcategories.length} subcategories
                            </Badge>
                            <Badge
                              variant="outline"
                              className="text-[10px] px-2 py-0.5 font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800"
                            >
                              {cat.activeSubcategoriesCount || 0} active
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground font-mono mt-0.5">
                            slug: {cat.slug}
                          </div>
                        </div>
                      </div>

                      {/* Right controls: Bulk Actions + SEO Active Switch */}
                      <div className="flex items-center gap-3 pl-8 sm:pl-0">
                        {subcategories.length > 0 && (
                          <div className="flex items-center gap-1.5 mr-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleAllSubcategories(cat, true)}
                              className="h-7 text-[10px] font-bold text-muted-foreground hover:text-foreground px-2"
                            >
                              All On
                            </Button>
                            <span className="text-xs text-muted-foreground/40">|</span>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => handleToggleAllSubcategories(cat, false)}
                              className="h-7 text-[10px] font-bold text-muted-foreground hover:text-foreground px-2"
                            >
                              All Off
                            </Button>
                          </div>
                        )}

                        <div className="flex items-center gap-2 bg-background/80 px-3 py-1.5 rounded-xl border border-border shadow-2xs">
                          <Switch
                            id={`cat-switch-${cat.id}`}
                            checked={cat.is_seo_active}
                            onCheckedChange={() =>
                              handleToggleCategory(cat.id, cat.is_seo_active, true)
                            }
                          />
                          <Label
                            htmlFor={`cat-switch-${cat.id}`}
                            className="text-xs font-bold cursor-pointer whitespace-nowrap select-none"
                          >
                            SEO active
                          </Label>
                        </div>
                      </div>
                    </div>

                    {/* Subcategories Container (expanded) */}
                    {isExpanded && (
                      <div className="p-4 sm:p-5 border-t border-border/60 bg-muted/20 space-y-3">
                        <div className="text-xs font-bold text-foreground">
                          Subcategories ({subcategories.length})
                        </div>

                        {subcategories.length === 0 ? (
                          <p className="text-xs text-muted-foreground italic">
                            No subcategories under this category. The parent category is used directly
                            for listings.
                          </p>
                        ) : (
                          /* Subcategories Grid (Matching Image 2: 4 columns cards) */
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {subcategories.map((sub) => (
                              <div
                                key={sub.id}
                                className={cn(
                                  "p-3 rounded-xl border bg-card shadow-2xs transition-all flex flex-col justify-between gap-2",
                                  sub.is_seo_active
                                    ? "border-primary/40 bg-primary/5"
                                    : "border-border/80 opacity-70"
                                )}
                              >
                                <div>
                                  <div className="text-xs font-bold text-foreground truncate">
                                    {sub.name}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                                    slug: {sub.slug}
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                  <span className="text-[10px] font-semibold text-muted-foreground">
                                    {sub.is_seo_active ? "Active" : "Inactive"}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <Switch
                                      id={`sub-switch-${sub.id}`}
                                      checked={sub.is_seo_active}
                                      onCheckedChange={() =>
                                        handleToggleCategory(sub.id, sub.is_seo_active, false)
                                      }
                                      className="scale-90"
                                    />
                                    <Label
                                      htmlFor={`sub-switch-${sub.id}`}
                                      className="text-[10px] font-bold cursor-pointer select-none"
                                    >
                                      SEO active
                                    </Label>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: LOCATION TAB VIEW                                          */}
      {/* ================================================================= */}
      {activeTab === "location" && (
        <div className="space-y-6">
          {/* Search Locations Bar & Description */}
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  value={locationSearch}
                  onChange={(e) => setLocationSearch(e.target.value)}
                  placeholder="Search locations at this level"
                  className="pl-10 pr-28 h-12 rounded-2xl bg-card border text-sm font-medium"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">
                  {locations.length} locations
                </span>
              </div>
              <Button
                type="button"
                onClick={() => setAddLocationDialogOpen(true)}
                className="h-12 px-4 rounded-2xl font-bold flex items-center gap-2"
              >
                <Plus className="size-4" />
                <span className="hidden sm:inline">Add Location</span>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground font-medium px-1">
              Check each location that should be available for SEO pages. Open a place to see its
              smaller places.
            </p>
          </div>

          {/* Breadcrumbs Navigation (Matching Image 1: All locations > South Africa > ...) */}
          <div className="flex items-center flex-wrap gap-1.5 p-3 rounded-xl bg-card border text-xs font-bold">
            {breadcrumbs.map((crumb, idx) => {
              const isLast = idx === breadcrumbs.length - 1;
              return (
                <div key={crumb.id ?? "root"} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentParentId(crumb.id)}
                    className={cn(
                      "transition-colors hover:underline",
                      isLast
                        ? "text-primary cursor-default font-extrabold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {crumb.name}
                  </button>
                  {!isLast && <ChevronRight className="size-3.5 text-muted-foreground/60" />}
                </div>
              );
            })}
          </div>

          {/* Locations List */}
          {loadingLocations ? (
            <div className="flex flex-col items-center justify-center p-12 space-y-3 bg-card border rounded-2xl">
              <Loader2 className="size-8 text-primary animate-spin" />
              <p className="text-xs font-semibold text-muted-foreground">Loading locations...</p>
            </div>
          ) : locations.length === 0 ? (
            <div className="text-center p-12 bg-card border rounded-2xl space-y-3">
              <MapPin className="size-10 text-muted-foreground/50 mx-auto" />
              <h3 className="text-sm font-bold text-foreground">No locations at this level</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No child locations have been added under this place yet. Click &quot;Add Location&quot;
                above to insert smaller areas.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {locations.map((loc) => (
                <div
                  key={loc.id}
                  className="rounded-2xl border border-border bg-card p-4 sm:p-5 flex items-center justify-between gap-4 shadow-xs hover:bg-muted/30 transition-colors"
                >
                  {/* Location Info & Drilldown Button */}
                  <div
                    onClick={() => setCurrentParentId(loc.id)}
                    className="flex-1 cursor-pointer flex items-center gap-3 group"
                  >
                    <div className="p-2.5 rounded-xl bg-primary/10 text-primary border border-primary/20 group-hover:scale-105 transition-transform">
                      <MapPin className="size-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm sm:text-base font-bold text-foreground group-hover:text-primary transition-colors">
                          {loc.name}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-2 py-0 font-semibold uppercase">
                          {loc.type}
                        </Badge>
                        {loc.children_count > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-2 py-0 font-bold">
                            {loc.children_count} smaller places
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">
                        {loc.type} &middot; slug: {loc.slug}
                      </div>
                    </div>
                  </div>

                  {/* Right Controls: SEO Active Switch & Drill-down Arrow */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-background/80 px-3 py-1.5 rounded-xl border border-border shadow-2xs">
                      <Switch
                        id={`loc-switch-${loc.id}`}
                        checked={loc.is_seo_active}
                        onCheckedChange={() => handleToggleLocation(loc.id, loc.is_seo_active)}
                      />
                      <Label
                        htmlFor={`loc-switch-${loc.id}`}
                        className="text-xs font-bold cursor-pointer whitespace-nowrap select-none"
                      >
                        SEO active
                      </Label>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentParentId(loc.id)}
                      className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      title="Drill down into smaller places"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Location Modal */}
      <Dialog open={addLocationDialogOpen} onOpenChange={setAddLocationDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <MapPin className="size-5 text-primary" />
              Add New Location
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Current Parent Location</Label>
              <div className="text-xs font-semibold px-3 py-2 rounded-xl bg-muted border">
                {breadcrumbs[breadcrumbs.length - 1]?.name || "All locations (Root)"}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="loc-name" className="text-xs font-bold">
                Location Name *
              </Label>
              <Input
                id="loc-name"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
                placeholder="e.g. Varanasi, Eastern Cape, Koramangala..."
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="loc-type" className="text-xs font-bold">
                Location Type *
              </Label>
              <select
                id="loc-type"
                value={newLocationType}
                onChange={(e) => setNewLocationType(e.target.value as any)}
                className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
              >
                <option value="country">Country</option>
                <option value="state">State / Province</option>
                <option value="city">City / District</option>
                <option value="area">Area / Suburb</option>
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setAddLocationDialogOpen(false)}
              className="rounded-xl font-bold text-xs"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleCreateLocation}
              disabled={creatingLocation || !newLocationName.trim()}
              className="rounded-xl font-bold text-xs"
            >
              {creatingLocation ? <Loader2 className="size-4 animate-spin mr-1" /> : null}
              Save Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
