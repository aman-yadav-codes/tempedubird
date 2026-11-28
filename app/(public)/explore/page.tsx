"use client";

import { useEffect, useState, useCallback, useMemo, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  ChevronDown,
  ChevronRight,
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
  ArrowUpDown,
  Tag,
  FolderTree,
  Folder,
  BookOpen,
  SlidersHorizontal,
  CheckCircle2,
  Users,
  LayoutGrid,
  List,
  ArrowRight,
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
  Car,
  Home,
  BedDouble,
  UtensilsCrossed,
} from "lucide-react";
import { useAuthStore, useCartStore } from "@/store";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buildBusinessSeoUrl, buildProfessionalSeoUrl, buildCourseSeoUrl, buildJobSeoUrl, buildDiscoverySeoUrl, slugify, extractCleanCity, formatCategorySlug } from "@/lib/utils/seo-slug";
import { getCatalogCountryMeta } from "@/lib/config/country-config";
import { OrderCheckoutDialog, CheckoutItem } from "@/components/checkout/order-checkout-dialog";
import { CartDrawer } from "@/components/checkout/cart-drawer";
import { CartFloatingButton } from "@/components/checkout/cart-floating-button";
import { ServiceBookingDialog, BookingServiceItem } from "@/components/checkout/service-booking-dialog";
import { CompactProductCard } from "@/components/shared/compact-product-card";
import { CompactServiceCard } from "@/components/shared/compact-service-card";

interface DiscoveryItem {
  id: number;
  resultType: "business" | "professional" | "product" | "service" | "course" | "job" | "property" | "vehicle" | "event" | "dish" | "room" | "financial";
  name: string;
  title?: string;
  brand?: string | null;
  brand_name?: string | null;
  price?: number | string | null;
  rating?: number | null;
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
  // Course specific
  code?: string;
  duration_value?: number;
  duration_unit?: string;
  university_name?: string;
  seats_available?: number;
  authority_type?: string;
  thumbnail_url?: string;
  // Job specific
  department?: string;
  employment_type?: string;
  experience_level?: string;
  work_mode?: string;
  location?: string;
  salary_range?: string;
  openings_count?: number;
  company_name?: string;
  company_logo?: string;
  // Property specific
  bedrooms?: number | null;
  bathrooms?: number | null;
  built_up_area?: number | string | null;
  area_unit?: string | null;
  rental_amount?: number | null;
  availability_status?: string | null;
  // Vehicle specific
  manufacturing_year?: number | null;
  color?: string | null;
  mileage?: string | null;
  kilometers_driven?: number | null;
  registration_number?: string | null;
  // Event specific
  venue_name?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  is_free?: boolean | null;
  organizer_name?: string | null;
  business_name?: string | null;
  business_slug?: string | null;
  business_id?: number | string | null;
  institution_id?: number | string | null;
  institution_profile_id?: number | string | null;
  institution_slug?: string | null;
  institution_name?: string | null;
  image_url?: string | null;
  fee?: number | string | null;
  annual_fee?: number | string | null;
  sale_price?: number | string | null;
  discounted_price?: number | string | null;
  [key: string]: any;
}

export const BUSINESS_CATEGORY_VERTICALS: Record<string, Array<{ type: string; label: string }>> = {
  "retail-and-shopping": [
    { type: "business", label: "Businesses" },
    { type: "product", label: "Products" },
    { type: "service", label: "Services" },
    { type: "event", label: "Events" },
    { type: "professional", label: "Professionals" },
    { type: "job", label: "Jobs" },
  ],
  "real-estate": [
    { type: "property", label: "Property" },
    { type: "business", label: "Businesses" },
    { type: "room", label: "Rooms" },
    { type: "service", label: "Services" },
    { type: "professional", label: "Professionals" },
    { type: "job", label: "Jobs" },
  ],
  "construction": [
    { type: "business", label: "Businesses" },
    { type: "service", label: "Services" },
    { type: "product", label: "Products" },
    { type: "professional", label: "Professionals" },
    { type: "job", label: "Jobs" },
  ],
  "automotive": [
    { type: "vehicle", label: "Vehicle" },
    { type: "business", label: "Businesses" },
    { type: "product", label: "Products" },
    { type: "service", label: "Services" },
    { type: "professional", label: "Professionals" },
    { type: "event", label: "Events" },
    { type: "job", label: "Jobs" },
  ],
  "transport": [
    { type: "business", label: "Businesses" },
    { type: "vehicle", label: "Vehicle" },
    { type: "service", label: "Services" },
    { type: "job", label: "Jobs" },
  ],
  "hospitality": [
    { type: "room", label: "Rooms" },
    { type: "business", label: "Businesses" },
    { type: "service", label: "Services" },
    { type: "professional", label: "Professionals" },
    { type: "job", label: "Jobs" },
  ],
  "events": [
    { type: "event", label: "Events" },
    { type: "business", label: "Businesses" },
    { type: "service", label: "Services" },
    { type: "product", label: "Products" },
    { type: "professional", label: "Professionals" },
    { type: "job", label: "Jobs" },
  ],
  "financial-services": [
    { type: "business", label: "Businesses" },
    { type: "financial", label: "Finance" },
    { type: "service", label: "Services" },
    { type: "professional", label: "Professionals" },
    { type: "job", label: "Jobs" },
  ],
  "real-estate-and-construction": [
    { type: "property", label: "Property" },
    { type: "business", label: "Businesses" },
    { type: "room", label: "Rooms" },
    { type: "product", label: "Products" },
    { type: "professional", label: "Professionals" },
    { type: "course", label: "Courses" },
    { type: "event", label: "Events" },
    { type: "job", label: "Jobs" },
  ],
  "automotive-and-transport": [
    { type: "vehicle", label: "Vehicle" },
    { type: "business", label: "Businesses" },
    { type: "product", label: "Products" },
    { type: "service", label: "Services" },
    { type: "professional", label: "Professionals" },
    { type: "event", label: "Events" },
    { type: "job", label: "Jobs" },
  ],
  "education-and-coaching": [
    { type: "business", label: "Businesses" },
    { type: "course", label: "Courses" },
    { type: "professional", label: "Professionals" },
    { type: "event", label: "Events" },
    { type: "product", label: "Products" },
    { type: "job", label: "Jobs" },
  ],
  "hospitality-and-events": [
    { type: "room", label: "Rooms" },
    { type: "dish", label: "Dishes" },
    { type: "business", label: "Businesses" },
    { type: "event", label: "Events" },
    { type: "service", label: "Services" },
    { type: "professional", label: "Professionals" },
    { type: "course", label: "Courses" },
    { type: "job", label: "Jobs" },
  ],
  "healthcare-and-medical": [
    { type: "business", label: "Businesses" },
    { type: "professional", label: "Professionals" },
    { type: "product", label: "Products" },
    { type: "service", label: "Services" },
    { type: "event", label: "Events" },
    { type: "course", label: "Courses" },
    { type: "job", label: "Jobs" },
  ],
  "it-and-digital-agencies": [
    { type: "business", label: "Businesses" },
    { type: "service", label: "Services" },
    { type: "product", label: "Products" },
    { type: "course", label: "Courses" },
    { type: "professional", label: "Professionals" },
    { type: "event", label: "Events" },
    { type: "job", label: "Jobs" },
  ],
  "professional-and-financial-services": [
    { type: "business", label: "Businesses" },
    { type: "financial", label: "Finance" },
    { type: "service", label: "Services" },
    { type: "professional", label: "Professionals" },
    { type: "course", label: "Courses" },
    { type: "product", label: "Products" },
    { type: "event", label: "Events" },
    { type: "job", label: "Jobs" },
  ],
  "food-dining-and-cafes": [
    { type: "dish", label: "Dishes" },
    { type: "business", label: "Businesses" },
    { type: "product", label: "Products" },
    { type: "service", label: "Services" },
    { type: "event", label: "Events" },
    { type: "professional", label: "Professionals" },
    { type: "course", label: "Courses" },
    { type: "job", label: "Jobs" },
  ],
  "home-services-and-maintenance": [
    { type: "business", label: "Businesses" },
    { type: "service", label: "Services" },
    { type: "product", label: "Products" },
    { type: "professional", label: "Professionals" },
    { type: "course", label: "Courses" },
    { type: "event", label: "Events" },
    { type: "job", label: "Jobs" },
  ],
  "fitness-and-sports": [
    { type: "business", label: "Businesses" },
    { type: "course", label: "Courses" },
    { type: "product", label: "Products" },
    { type: "service", label: "Services" },
    { type: "professional", label: "Professionals" },
    { type: "event", label: "Events" },
    { type: "job", label: "Jobs" },
  ],
  "salons-and-personal-care": [
    { type: "business", label: "Businesses" },
    { type: "service", label: "Services" },
    { type: "product", label: "Products" },
    { type: "professional", label: "Professionals" },
    { type: "course", label: "Courses" },
    { type: "event", label: "Events" },
    { type: "job", label: "Jobs" },
  ],
};

export const DEFAULT_ALL_VERTICALS = [
  { type: "business", label: "Businesses" },
  { type: "product", label: "Products" },
  { type: "service", label: "Services" },
  { type: "professional", label: "Professionals" },
  { type: "course", label: "Courses" },
  { type: "job", label: "Jobs" },
  { type: "property", label: "Property" },
  { type: "vehicle", label: "Vehicle" },
  { type: "financial", label: "Finance" },
  { type: "dish", label: "Dishes" },
  { type: "room", label: "Rooms" },
  { type: "event", label: "Events" },
];

export const VERTICAL_DEFAULT_BUSINESS_CATEGORY: Record<string, string> = {
  vehicle: "automotive",
  property: "real-estate",
  dish: "food-dining-and-cafes",
  room: "hospitality",
  event: "events",
  financial: "financial-services",
  course: "education-and-coaching",
};

export interface CustomerExplorePageProps {
  initialType?: string;
  initialCategory?: string;
  initialCategoryName?: string;
  initialSubcategory?: string;
  initialCity?: string;
  initialQuery?: string;
}

function CustomerExplorePageContent({
  initialType,
  initialCategory,
  initialCategoryName,
  initialSubcategory,
  initialCity,
  initialQuery,
}: CustomerExplorePageProps = {}) {
  const { user, accessToken } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlQ = searchParams?.get("q") || searchParams?.get("query") || searchParams?.get("search") || initialQuery || "";
  const rawType = (searchParams?.get("type") as any) || initialType || "all";
  const normalizedRawType = rawType === "finance" ? "financial" : rawType;
  const urlType = ["all", "business", "service", "product", "professional", "course", "job", "property", "vehicle", "event", "dish", "room", "financial"].includes(normalizedRawType) ? normalizedRawType : "all";
  const urlCountry = searchParams?.get("country") || "";
  const urlCity = searchParams?.get("city") || searchParams?.get("location") || initialCity || "";
  const rawCatParam = searchParams?.get("category") || searchParams?.get("category_slug") || initialCategory || "";
  const isAllCat = rawCatParam.toLowerCase().startsWith("all-") || rawCatParam.toLowerCase() === "all";
  const urlCategoryParam = isAllCat ? "" : rawCatParam;
  const urlSubcategoryParam = searchParams?.get("subcategory") || searchParams?.get("subcategory_slug") || initialSubcategory || "";
  const urlCategory = isAllCat ? null : (searchParams?.get("categoryId") ? Number(searchParams.get("categoryId")) : null);
  const urlCategoryName = isAllCat ? "" : (searchParams?.get("categoryName") || initialCategoryName || formatCategorySlug(urlCategoryParam) || "");

  const urlBiz = searchParams?.get("businessId") || searchParams?.get("business_id");
  const activeBusinessId = urlBiz && /^\d+$/.test(urlBiz.trim()) ? Number(urlBiz.trim()) : null;

  const urlBizCatParam = searchParams?.get("businessCategoryId") || searchParams?.get("business_category_id");
  const urlBizCat = urlBizCatParam && /^\d+$/.test(urlBizCatParam.trim()) ? Number(urlBizCatParam.trim()) : null;

  const { location: userGlobalLocation, setLocation: setGlobalLocation } = useUserLocation();

  const [query, setQuery] = useState(urlQ);
  const [activeType, setActiveType] = useState<"all" | "business" | "service" | "product" | "professional" | "course" | "job" | "property" | "vehicle" | "event" | "dish" | "room" | "financial">(urlType);
  const [country, setCountry] = useState<string>(urlCountry);
  const [city, setCity] = useState<string>(
    extractCleanCity(urlCity) || extractCleanCity(userGlobalLocation) || ""
  );
  const [locality, setLocality] = useState<string>("");
  const [postalCode, setPostalCode] = useState<string>("");

  // Cascading Category & Subcategory states
  const [businessCategories, setBusinessCategories] = useState<Array<{ id: number; name: string; slug?: string }>>([]);
  const [selectedBusinessCategoryId, setSelectedBusinessCategoryId] = useState<number | null>(urlBizCat);
  const [categories, setCategories] = useState<Array<{ id: number; name: string; slug?: string; parent_id?: number | null; business_category_id?: number | null }>>([]);
  const [subcategories, setSubcategories] = useState<Array<{ id: number; name: string; slug?: string }>>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(urlCategory);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>(urlCategoryName);
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>(urlCategoryParam);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(null);
  const [selectedSubcategoryName, setSelectedSubcategoryName] = useState<string>("");
  const [selectedSubcategorySlug, setSelectedSubcategorySlug] = useState<string>(urlSubcategoryParam);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  // New filters matching FindMy search layout
  const [radius, setRadius] = useState<string>("no_radius");
  const [minRating, setMinRating] = useState<number>(0);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAllSidebarCategories, setShowAllSidebarCategories] = useState<boolean>(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState<boolean>(false);

  // Helper to keep browser URL in sync using ONLY clean structured URLs
  const syncUrlParams = useCallback(
    (overrides?: {
      type?: string;
      city?: string;
      category?: string | null;
      subcategory?: string | null;
      q?: string;
      brand?: string;
    }) => {
      if (typeof window === "undefined") return;

      const targetType = overrides?.type !== undefined ? overrides.type : activeType;
      const targetCity = overrides?.city !== undefined ? overrides.city : city;
      const targetCat = overrides?.category !== undefined ? overrides.category : (selectedCategorySlug || selectedCategoryName);
      const targetSubcat = overrides?.subcategory !== undefined ? overrides.subcategory : (selectedSubcategorySlug || selectedSubcategoryName);
      const targetQ = overrides?.q !== undefined ? overrides.q : query;

      const newBasePath = buildDiscoverySeoUrl({
        type: targetType,
        category: targetCat,
        subcategory: targetSubcat,
        city: targetCity,
      });

      const qParam = targetQ && targetQ.trim() ? `?q=${encodeURIComponent(targetQ.trim())}` : "";
      const finalUrl = `${newBasePath}${qParam}`;

      if (window.location.pathname + window.location.search !== finalUrl) {
        window.history.replaceState(null, "", finalUrl);
      }
    },
    [activeType, city, selectedCategorySlug, selectedCategoryName, selectedSubcategorySlug, selectedSubcategoryName, query]
  );

  // Sync state if URL search parameters change
  useEffect(() => {
    if (urlQ) setQuery(urlQ);

    if (urlCategoryParam) {
      const typeParam = urlType && urlType !== "all" ? `&type=${urlType}` : "";
      fetch(`/api/public/categories?slug=${encodeURIComponent(urlCategoryParam)}${typeParam}`)
        .then((r) => r.json())
        .then(async (json) => {
          let cat = Array.isArray(json?.data) ? json.data[0] : json?.data;
          if (!cat && typeParam) {
            try {
              const fallbackRes = await fetch(`/api/public/categories?slug=${encodeURIComponent(urlCategoryParam)}`);
              const fallbackJson = await fallbackRes.json();
              cat = Array.isArray(fallbackJson?.data) ? fallbackJson.data[0] : fallbackJson?.data;
            } catch {}
          }
          if (cat) {
            const bizCatId = cat.business_category_id
              ? Number(cat.business_category_id)
              : cat.category_type === "business" && !cat.parent_id
                ? Number(cat.id)
                : null;

            if (cat.parent_id) {
              setSelectedCategoryId(Number(cat.parent_id));
              setSelectedSubcategoryId(Number(cat.id));
              setSelectedSubcategoryName(cat.name || "");
              setSelectedSubcategorySlug(cat.slug || urlCategoryParam);
              if (cat.parent_name) setSelectedCategoryName(cat.parent_name);
              if (bizCatId) setSelectedBusinessCategoryId(bizCatId);
            } else if (cat.category_type === "business") {
              setSelectedCategoryId(Number(cat.id));
              setSelectedCategoryName(cat.name || formatCategorySlug(urlCategoryParam) || urlCategoryParam);
              setSelectedCategorySlug(cat.slug || urlCategoryParam);
              setSelectedBusinessCategoryId(Number(cat.id));
            } else {
              // Vertical-specific category (like dish, vehicle, property, course, etc.)
              if (bizCatId) {
                setSelectedBusinessCategoryId(bizCatId);
                setSelectedCategoryId(bizCatId);
              } else {
                setSelectedCategoryId(Number(cat.id));
              }
              setSelectedSubcategoryId(Number(cat.id));
              setSelectedSubcategoryName(cat.name || "");
              setSelectedSubcategorySlug(cat.slug || urlCategoryParam);
            }
          } else {
            const formatted = formatCategorySlug(urlCategoryParam) || urlCategoryParam;
            setSelectedCategoryName(formatted);
            setSelectedCategorySlug(urlCategoryParam);
          }
        })
        .catch(() => {
          const formatted = formatCategorySlug(urlCategoryParam) || urlCategoryParam;
          setSelectedCategoryName(formatted);
          setSelectedCategorySlug(urlCategoryParam);
        });
    } else if (urlCategory) {
      fetch(`/api/public/categories?id=${urlCategory}`)
        .then((r) => r.json())
        .then((json) => {
          const cat = json?.data;
          const bizCatId = cat?.business_category_id
            ? Number(cat.business_category_id)
            : cat?.category_type === "business" && !cat.parent_id
              ? Number(cat.id)
              : null;

          if (cat && cat.parent_id) {
            setSelectedCategoryId(Number(cat.parent_id));
            setSelectedSubcategoryId(Number(cat.id));
            setSelectedSubcategoryName(cat.name || "");
            setSelectedSubcategorySlug(cat.slug || "");
            if (cat.parent_name) setSelectedCategoryName(cat.parent_name);
            if (bizCatId) setSelectedBusinessCategoryId(bizCatId);
          } else if (cat) {
            if (cat.category_type === "business") {
              setSelectedCategoryId(Number(cat.id));
              setSelectedCategoryName(cat.name || urlCategoryName);
              setSelectedCategorySlug(cat.slug || "");
              setSelectedSubcategoryId(null);
              setSelectedSubcategoryName("");
              setSelectedSubcategorySlug("");
              setSelectedBusinessCategoryId(Number(cat.id));
            } else {
              if (bizCatId) {
                setSelectedBusinessCategoryId(bizCatId);
                setSelectedCategoryId(bizCatId);
              } else {
                setSelectedCategoryId(Number(cat.id));
              }
              setSelectedSubcategoryId(Number(cat.id));
              setSelectedSubcategoryName(cat.name || urlCategoryName);
              setSelectedSubcategorySlug(cat.slug || "");
            }
          } else {
            setSelectedCategoryId(urlCategory);
            if (urlCategoryName) setSelectedCategoryName(urlCategoryName);
          }
        })
        .catch(() => {
          setSelectedCategoryId(urlCategory);
          if (urlCategoryName) setSelectedCategoryName(urlCategoryName);
        });
    }

    if (urlSubcategoryParam) {
      fetch(`/api/public/categories?slug=${encodeURIComponent(urlSubcategoryParam)}`)
        .then((r) => r.json())
        .then((json) => {
          const sub = Array.isArray(json?.data) ? json.data[0] : json?.data;
          if (sub) {
            setSelectedSubcategoryId(Number(sub.id));
            setSelectedSubcategoryName(sub.name || urlSubcategoryParam);
            setSelectedSubcategorySlug(sub.slug || urlSubcategoryParam);
          }
        })
        .catch(() => { });
    }

    const effectiveType = (urlType && urlType !== "all") ? urlType : (initialType || urlType || "all");
    const normalizedType = effectiveType === "finance" ? "financial" : effectiveType;
    if (["all", "business", "service", "product", "professional", "course", "job", "property", "vehicle", "event", "dish", "room", "financial"].includes(normalizedType)) {
      setActiveType(normalizedType as any);
    }
    if (urlBizCat) {
      setSelectedBusinessCategoryId(urlBizCat);
    }
    if (!urlCategoryParam && !urlCategory) {
      setSelectedCategoryId(null);
      setSelectedCategoryName("");
      setSelectedCategorySlug("");
      setSelectedSubcategoryId(null);
      setSelectedSubcategoryName("");
      setSelectedSubcategorySlug("");
    }
    const resolvedCity = extractCleanCity(urlCity) || extractCleanCity(userGlobalLocation) || "";
    setCity(resolvedCity);
    if (urlCountry) setCountry(urlCountry);
  }, [urlQ, urlType, initialType, urlCity, urlCountry, urlCategory, urlCategoryParam, urlSubcategoryParam, urlCategoryName, urlBizCat, userGlobalLocation]);

  // Sync with global header location / country change events (e.g. Pin button in header)
  useEffect(() => {
    const handleLocationChange = (e: any) => {
      const newLoc = e?.detail?.location;
      const newCountry = e?.detail?.countryCode;
      if (newLoc) {
        if (newLoc === "All Locations" || newLoc === "all") {
          setCity("");
          syncUrlParams({ city: "" });
        } else {
          const clean = extractCleanCity(newLoc) || newLoc;
          setCity(clean);
          syncUrlParams({ city: clean });
        }
      }
      if (newCountry) {
        setCountry(newCountry);
      }
    };

    const handleCountryChange = (e: any) => {
      const newCountry = e?.detail?.countryCode;
      if (newCountry) {
        setCountry(newCountry);
      }
    };

    window.addEventListener("edubird-location-change", handleLocationChange);
    window.addEventListener("edubird-country-change", handleCountryChange);

    return () => {
      window.removeEventListener("edubird-location-change", handleLocationChange);
      window.removeEventListener("edubird-country-change", handleCountryChange);
    };
  }, [syncUrlParams]);

  // Results
  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<DiscoveryItem[]>([]);
  const [professionals, setProfessionals] = useState<DiscoveryItem[]>([]);
  const [products, setProducts] = useState<DiscoveryItem[]>([]);
  const [services, setServices] = useState<DiscoveryItem[]>([]);
  const [courses, setCourses] = useState<DiscoveryItem[]>([]);
  const [jobs, setJobs] = useState<DiscoveryItem[]>([]);
  const [properties, setProperties] = useState<DiscoveryItem[]>([]);
  const [vehicles, setVehicles] = useState<DiscoveryItem[]>([]);
  const [events, setEvents] = useState<DiscoveryItem[]>([]);
  const [dishes, setDishes] = useState<DiscoveryItem[]>([]);
  const [rooms, setRooms] = useState<DiscoveryItem[]>([]);

  // Filter: Sort By, Keyword Search, Brand
  const [sortBy, setSortBy] = useState<string>("featured");
  const [productNameSearch, setProductNameSearch] = useState<string>("");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [availableLocations, setAvailableLocations] = useState<Array<{ id: number; name: string; type: string }>>([]);

  // Load active SEO locations for the location filter
  useEffect(() => {
    let ignore = false;
    async function loadActiveLocations() {
      try {
        const res = await fetch("/api/public/locations?type=city");
        const json = await res.json();
        if (!ignore && json?.data) {
          setAvailableLocations(json.data);
        }
      } catch (err) {
        console.error("Failed to load active SEO locations:", err);
      }
    }
    loadActiveLocations();
    return () => { ignore = true; };
  }, []);

  // Load categories dynamically based on selected Type and Main Business Type
  useEffect(() => {
    let ignore = false;
    async function loadTypeCategories() {
      setLoadingCategories(true);
      try {
        const typeParam = activeType === "all" ? "" : `type=${activeType}&`;
        const bizParam = activeBusinessId ? `businessId=${activeBusinessId}&` : "";
        const bizCatParam = selectedBusinessCategoryId ? `businessCategoryId=${selectedBusinessCategoryId}&` : "";
        const rootParam = selectedBusinessCategoryId ? "" : "onlyRoot=true&";
        const res = await fetch(`/api/public/categories?${typeParam}${bizParam}${bizCatParam}${rootParam}limit=300`);
        const json = await res.json();
        if (!ignore && json?.data) {
          setCategories(json.data);
        }
      } catch (err) {
        console.error("Failed to load categories for type:", err);
      } finally {
        if (!ignore) setLoadingCategories(false);
      }
    }
    loadTypeCategories();
    return () => { ignore = true; };
  }, [activeType, activeBusinessId, selectedBusinessCategoryId]);

  // Load Main Business Categories
  useEffect(() => {
    fetch(`/api/public/categories?type=business&onlyRoot=true&limit=100`)
      .then((r) => r.json())
      .then((d) => {
        if (d?.data && Array.isArray(d.data)) {
          const clean = d.data.filter((c: any) => c.name && c.name.toLowerCase() !== "admin" && c.slug !== "admin");
          setBusinessCategories(clean);
        }
      })
      .catch(() => { });
  }, []);

  // Reference to track activeType changes for vertical switching
  const prevActiveTypeRef = useRef<string>(activeType);

  // Auto-select natural business category for vertical when listing type changes or categories load
  useEffect(() => {
    if (businessCategories.length === 0) return;

    const typeChanged = prevActiveTypeRef.current !== activeType;
    prevActiveTypeRef.current = activeType;

    if (activeType && VERTICAL_DEFAULT_BUSINESS_CATEGORY[activeType]) {
      const defSlug = VERTICAL_DEFAULT_BUSINESS_CATEGORY[activeType];
      const matchedBc = businessCategories.find((b) => b.slug === defSlug || b.slug?.includes(defSlug));
      if (matchedBc) {
        if (!selectedBusinessCategoryId || typeChanged) {
          setSelectedBusinessCategoryId(matchedBc.id);
          setSelectedCategoryId(matchedBc.id);
          setSelectedCategoryName(matchedBc.name);
          setSelectedCategorySlug(matchedBc.slug || defSlug);
        }
      }
    }
  }, [businessCategories, activeType, selectedBusinessCategoryId]);

  const displayCategories = useMemo(() => {
    return businessCategories.length > 0 ? businessCategories : categories;
  }, [businessCategories, categories]);

  const filteredCategories = useMemo(() => {
    if (!selectedBusinessCategoryId) return displayCategories;
    return displayCategories.filter((c: any) => c.business_category_id === selectedBusinessCategoryId || c.id === selectedBusinessCategoryId);
  }, [displayCategories, selectedBusinessCategoryId]);

  // Active business category slug for vertical context
  const activeBusinessCategoryKey = useMemo(() => {
    if (selectedBusinessCategoryId) {
      const bc = businessCategories.find((b) => b.id === selectedBusinessCategoryId);
      if (bc?.slug) return bc.slug.toLowerCase().trim();
    }
    if (selectedCategoryId) {
      const bc = businessCategories.find((b) => b.id === selectedCategoryId);
      if (bc?.slug) return bc.slug.toLowerCase().trim();
      const cat = categories.find((c) => c.id === selectedCategoryId);
      if (cat?.business_category_id) {
        const parentBc = businessCategories.find((b) => b.id === cat.business_category_id);
        if (parentBc?.slug) return parentBc.slug.toLowerCase().trim();
      }
    }
    const raw = (selectedCategorySlug || urlCategoryParam || selectedCategoryName || "").toLowerCase().trim();
    for (const key of Object.keys(BUSINESS_CATEGORY_VERTICALS)) {
      if (raw.startsWith(key) || raw.includes(key)) {
        return key;
      }
    }
    const nameSlug = slugify(selectedCategoryName || "");
    for (const key of Object.keys(BUSINESS_CATEGORY_VERTICALS)) {
      if (nameSlug.startsWith(key) || nameSlug.includes(key)) {
        return key;
      }
    }
    if (activeType && VERTICAL_DEFAULT_BUSINESS_CATEGORY[activeType]) {
      return VERTICAL_DEFAULT_BUSINESS_CATEGORY[activeType];
    }
    return "";
  }, [selectedBusinessCategoryId, selectedCategoryId, businessCategories, categories, selectedCategorySlug, urlCategoryParam, selectedCategoryName, activeType]);

  const allowedVerticals = useMemo(() => {
    if (activeBusinessCategoryKey && BUSINESS_CATEGORY_VERTICALS[activeBusinessCategoryKey]) {
      const specific = BUSINESS_CATEGORY_VERTICALS[activeBusinessCategoryKey];
      const specificTypes = new Set(specific.map((s) => s.type));
      const remaining = DEFAULT_ALL_VERTICALS.filter((v) => !specificTypes.has(v.type));
      return [...specific, ...remaining];
    }
    return DEFAULT_ALL_VERTICALS;
  }, [activeBusinessCategoryKey]);

  // Fallback activeType if current vertical is not valid for selected business category
  useEffect(() => {
    if (allowedVerticals.length > 0 && activeType !== "all") {
      const exists = allowedVerticals.some((v) => v.type === activeType);
      if (!exists) {
        const fallback = allowedVerticals[0].type as any;
        setActiveType(fallback);
        syncUrlParams({ type: fallback });
      }
    }
  }, [allowedVerticals, activeType, syncUrlParams]);

  const effectiveBusinessCategoryId = useMemo(() => {
    if (selectedBusinessCategoryId) return selectedBusinessCategoryId;
    if (selectedCategoryId) {
      const isRootBiz = businessCategories.some((bc) => bc.id === selectedCategoryId);
      if (isRootBiz) return selectedCategoryId;
      const cat = categories.find((c) => c.id === selectedCategoryId);
      if (cat?.business_category_id) return cat.business_category_id;
      if (cat?.parent_id) {
        const isParentBiz = businessCategories.some((bc) => bc.id === cat.parent_id);
        if (isParentBiz) return cat.parent_id;
      }
    }
    if (activeBusinessCategoryKey) {
      const found = businessCategories.find((bc) => bc.slug === activeBusinessCategoryKey || bc.slug?.includes(activeBusinessCategoryKey));
      if (found) return found.id;
    }
    if (activeType && VERTICAL_DEFAULT_BUSINESS_CATEGORY[activeType]) {
      const defKey = VERTICAL_DEFAULT_BUSINESS_CATEGORY[activeType];
      const found = businessCategories.find((bc) => bc.slug === defKey || bc.slug?.includes(defKey));
      if (found) return found.id;
    }
    return null;
  }, [selectedBusinessCategoryId, selectedCategoryId, businessCategories, categories, activeBusinessCategoryKey, activeType]);

  const [typeCategories, setTypeCategories] = useState<Array<{ id: number; name: string; slug?: string; parent_id?: number | null }>>([]);
  const [loadingTypeCategories, setLoadingTypeCategories] = useState(false);

  useEffect(() => {
    let ignore = false;
    async function loadTypeCategoriesForActiveVertical() {
      setLoadingTypeCategories(true);
      try {
        const bizCatId = effectiveBusinessCategoryId;
        let url = "";

        if (activeType === "business" && bizCatId) {
          url = `/api/public/categories?parentId=${bizCatId}&limit=300`;
        } else if (activeType === "business") {
          url = `/api/public/categories?type=business&onlyRoot=true&limit=300`;
        } else if (bizCatId) {
          url = `/api/public/categories?type=${activeType}&businessCategoryId=${bizCatId}&limit=300`;
        } else {
          url = `/api/public/categories?type=${activeType}&limit=300`;
        }

        const res = await fetch(url);
        const json = await res.json();
        let list = Array.isArray(json?.data) ? json.data : [];

        if (list.length === 0 && activeType !== "business" && bizCatId) {
          const fallbackRes = await fetch(`/api/public/categories?type=${activeType}&limit=300`);
          const fallbackJson = await fallbackRes.json();
          if (Array.isArray(fallbackJson?.data) && fallbackJson.data.length > 0) {
            list = fallbackJson.data;
          }
        }

        if (!ignore) {
          setTypeCategories(list);
        }
      } catch (err) {
        console.error("Failed to load categories for active vertical:", err);
      } finally {
        if (!ignore) setLoadingTypeCategories(false);
      }
    }

    loadTypeCategoriesForActiveVertical();
    return () => { ignore = true; };
  }, [activeType, effectiveBusinessCategoryId]);

  // Load subcategories dynamically based on selected Category
  useEffect(() => {
    let ignore = false;
    async function loadCategorySubcategories() {
      if (!selectedCategoryId) {
        setSubcategories([]);
        setSelectedSubcategoryId(null);
        setSelectedSubcategoryName("");
        return;
      }
      setLoadingSubcategories(true);
      try {
        const bizParam = activeBusinessId ? `&businessId=${activeBusinessId}` : "";
        const res = await fetch(`/api/public/categories?parentId=${selectedCategoryId}${bizParam}&limit=300`);
        const json = await res.json();
        if (!ignore && json?.data) {
          setSubcategories(json.data);
        }
      } catch (err) {
        console.error("Failed to load subcategories:", err);
      } finally {
        if (!ignore) setLoadingSubcategories(false);
      }
    }
    loadCategorySubcategories();
    return () => { ignore = true; };
  }, [selectedCategoryId, activeBusinessId]);

  const availableBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    products.forEach((p) => {
      const b = (p.brand || (p as any).brand_name || "").trim();
      if (b && b.toLowerCase() !== "generic") {
        brandsSet.add(b);
      }
    });
    return Array.from(brandsSet).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = [...products];

    // Filter by search
    if (productNameSearch.trim()) {
      const q = productNameSearch.toLowerCase().trim();
      list = list.filter((p) =>
        (p.name || p.title || "").toLowerCase().includes(q) ||
        (p.description || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q)
      );
    }

    // Filter by brand (Only applicable for Product)
    if (selectedBrand && selectedBrand !== "all") {
      list = list.filter((p) => ((p.brand || (p as any).brand_name || "").trim()) === selectedBrand);
    }

    if (minRating > 0) {
      list = list.filter((p) => Number(p.rating || 0) >= minRating);
    }

    // Sort
    if (sortBy === "price_asc") {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortBy === "name_asc") {
      list.sort((a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || ""));
    } else if (sortBy === "name_desc") {
      list.sort((a, b) => (b.name || b.title || "").localeCompare(a.name || a.title || ""));
    } else if (sortBy === "rating_desc") {
      list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    } else if (sortBy === "newest") {
      list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }

    return list;
  }, [products, productNameSearch, selectedBrand, sortBy]);

  const filteredBusinesses = useMemo(() => {
    let list = [...businesses];
    if (productNameSearch.trim()) {
      const q = productNameSearch.toLowerCase().trim();
      list = list.filter((b) =>
        (b.name || "").toLowerCase().includes(q) ||
        (b.description || b.about || "").toLowerCase().includes(q)
      );
    }
    if (minRating > 0) {
      list = list.filter((b) => Number(b.rating || (b as any).avg_rating || 0) >= minRating);
    }
    if (verifiedOnly) {
      list = list.filter((b) => Boolean(b.is_verified));
    }
    if (sortBy === "name_asc") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "name_desc") {
      list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    } else if (sortBy === "rating_desc") {
      list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    } else if (sortBy === "newest") {
      list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }
    return list;
  }, [businesses, productNameSearch, sortBy]);

  const filteredProfessionals = useMemo(() => {
    let list = [...professionals];
    if (productNameSearch.trim()) {
      const q = productNameSearch.toLowerCase().trim();
      list = list.filter((p) =>
        (p.name || "").toLowerCase().includes(q) ||
        (p.description || p.about || "").toLowerCase().includes(q)
      );
    }
    if (minRating > 0) {
      list = list.filter((b) => Number(b.rating || (b as any).avg_rating || 0) >= minRating);
    }
    if (verifiedOnly) {
      list = list.filter((b) => Boolean(b.is_verified));
    }
    if (sortBy === "name_asc") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "name_desc") {
      list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    } else if (sortBy === "rating_desc") {
      list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    } else if (sortBy === "newest") {
      list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }
    return list;
  }, [professionals, productNameSearch, sortBy]);

  const filteredServices = useMemo(() => {
    let list = [...services];
    if (productNameSearch.trim()) {
      const q = productNameSearch.toLowerCase().trim();
      list = list.filter((s) =>
        (s.name || s.title || "").toLowerCase().includes(q) ||
        (s.description || "").toLowerCase().includes(q)
      );
    }
    if (sortBy === "price_asc") {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortBy === "name_asc") {
      list.sort((a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || ""));
    } else if (sortBy === "name_desc") {
      list.sort((a, b) => (b.name || b.title || "").localeCompare(a.name || a.title || ""));
    } else if (sortBy === "rating_desc") {
      list.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    } else if (sortBy === "newest") {
      list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }
    return list;
  }, [services, productNameSearch, sortBy]);

  const filteredCourses = useMemo(() => {
    let list = [...courses];
    if (productNameSearch.trim()) {
      const q = productNameSearch.toLowerCase().trim();
      list = list.filter((c) =>
        (c.name || "").toLowerCase().includes(q) ||
        (c.description || "").toLowerCase().includes(q) ||
        (c.code || "").toLowerCase().includes(q) ||
        (c.university_name || "").toLowerCase().includes(q)
      );
    }
    if (minRating > 0) {
      list = list.filter((b) => Number(b.rating || (b as any).avg_rating || 0) >= minRating);
    }
    if (verifiedOnly) {
      list = list.filter((b) => Boolean(b.is_verified));
    }
    if (sortBy === "name_asc") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "name_desc") {
      list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    } else if (sortBy === "newest") {
      list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }
    return list;
  }, [courses, productNameSearch, sortBy]);

  const filteredJobs = useMemo(() => {
    let list = [...jobs];
    if (productNameSearch.trim()) {
      const q = productNameSearch.toLowerCase().trim();
      list = list.filter((j) =>
        (j.name || j.title || "").toLowerCase().includes(q) ||
        (j.description || "").toLowerCase().includes(q) ||
        (j.department || "").toLowerCase().includes(q) ||
        (j.company_name || "").toLowerCase().includes(q)
      );
    }
    if (minRating > 0) {
      list = list.filter((b) => Number(b.rating || (b as any).avg_rating || 0) >= minRating);
    }
    if (verifiedOnly) {
      list = list.filter((b) => Boolean(b.is_verified));
    }
    if (sortBy === "name_asc") {
      list.sort((a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || ""));
    } else if (sortBy === "name_desc") {
      list.sort((a, b) => (b.name || b.title || "").localeCompare(a.name || a.title || ""));
    } else if (sortBy === "newest") {
      list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }
    return list;
  }, [jobs, productNameSearch, sortBy]);

  const filteredProperties = useMemo(() => {
    let list = [...properties];
    if (productNameSearch.trim()) {
      const q = productNameSearch.toLowerCase().trim();
      list = list.filter(
        (p) =>
          (p.name || p.title || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q) ||
          (p.city || "").toLowerCase().includes(q) ||
          (p.business_name || "").toLowerCase().includes(q)
      );
    }
    if (sortBy === "name_asc") {
      list.sort((a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || ""));
    } else if (sortBy === "name_desc") {
      list.sort((a, b) => (b.name || b.title || "").localeCompare(a.name || a.title || ""));
    } else if (sortBy === "newest") {
      list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }
    return list;
  }, [properties, productNameSearch, sortBy]);

  const filteredVehicles = useMemo(() => {
    let list = [...vehicles];
    if (productNameSearch.trim()) {
      const q = productNameSearch.toLowerCase().trim();
      list = list.filter(
        (v) =>
          (v.name || v.title || "").toLowerCase().includes(q) ||
          (v.description || "").toLowerCase().includes(q) ||
          (v.city || "").toLowerCase().includes(q) ||
          (v.business_name || "").toLowerCase().includes(q)
      );
    }
    if (sortBy === "name_asc") {
      list.sort((a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || ""));
    } else if (sortBy === "name_desc") {
      list.sort((a, b) => (b.name || b.title || "").localeCompare(a.name || a.title || ""));
    } else if (sortBy === "newest") {
      list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }
    return list;
  }, [vehicles, productNameSearch, sortBy]);

  const filteredEvents = useMemo(() => {
    let list = [...events];
    if (productNameSearch.trim()) {
      const q = productNameSearch.toLowerCase().trim();
      list = list.filter(
        (e) =>
          (e.name || e.title || "").toLowerCase().includes(q) ||
          (e.description || "").toLowerCase().includes(q) ||
          (e.venue_name || "").toLowerCase().includes(q) ||
          (e.city || "").toLowerCase().includes(q) ||
          (e.business_name || "").toLowerCase().includes(q)
      );
    }
    if (sortBy === "name_asc") {
      list.sort((a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || ""));
    } else if (sortBy === "name_desc") {
      list.sort((a, b) => (b.name || b.title || "").localeCompare(a.name || a.title || ""));
    } else if (sortBy === "newest") {
      list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }
    return list;
  }, [events, productNameSearch, sortBy]);

  const filteredDishes = useMemo(() => {
    let list = [...dishes];
    if (productNameSearch) {
      const q = productNameSearch.toLowerCase();
      list = list.filter(
        (d) =>
          (d.name || d.title || "").toLowerCase().includes(q) ||
          (d.description || "").toLowerCase().includes(q) ||
          (d.category_name || "").toLowerCase().includes(q) ||
          (d.subcategory_name || "").toLowerCase().includes(q) ||
          (d.business_name || "").toLowerCase().includes(q)
      );
    }
    if (sortBy === "name_asc") {
      list.sort((a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || ""));
    } else if (sortBy === "name_desc") {
      list.sort((a, b) => (b.name || b.title || "").localeCompare(a.name || a.title || ""));
    } else if (sortBy === "price_asc") {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortBy === "newest") {
      list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }
    return list;
  }, [dishes, productNameSearch, sortBy]);

  const filteredRooms = useMemo(() => {
    let list = [...rooms];
    if (productNameSearch) {
      const q = productNameSearch.toLowerCase();
      list = list.filter(
        (r) =>
          (r.name || r.title || "").toLowerCase().includes(q) ||
          (r.description || "").toLowerCase().includes(q) ||
          (r.category_name || "").toLowerCase().includes(q) ||
          (r.subcategory_name || "").toLowerCase().includes(q) ||
          (r.business_name || "").toLowerCase().includes(q)
      );
    }
    if (sortBy === "name_asc") {
      list.sort((a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || ""));
    } else if (sortBy === "name_desc") {
      list.sort((a, b) => (b.name || b.title || "").localeCompare(a.name || a.title || ""));
    } else if (sortBy === "price_asc") {
      list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    } else if (sortBy === "price_desc") {
      list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    } else if (sortBy === "newest") {
      list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }
    return list;
  }, [rooms, productNameSearch, sortBy]);

  const totalFilteredCount = useMemo(() => {
    switch (activeType) {
      case "business":
        return filteredBusinesses.length;
      case "professional":
        return filteredProfessionals.length;
      case "product":
        return filteredProducts.length;
      case "service":
        return filteredServices.length;
      case "course":
        return filteredCourses.length;
      case "job":
        return filteredJobs.length;
      case "property":
        return filteredProperties.length;
      case "vehicle":
        return filteredVehicles.length;
      case "event":
        return filteredEvents.length;
      case "dish":
        return filteredDishes.length;
      case "room":
        return filteredRooms.length;
      case "financial":
        return filteredServices.length;
      default:
        return (
          filteredBusinesses.length +
          filteredProfessionals.length +
          filteredProducts.length +
          filteredServices.length +
          filteredCourses.length +
          filteredJobs.length +
          filteredProperties.length +
          filteredVehicles.length +
          filteredEvents.length +
          filteredDishes.length +
          filteredRooms.length
        );
    }
  }, [
    activeType,
    filteredBusinesses.length,
    filteredProfessionals.length,
    filteredProducts.length,
    filteredServices.length,
    filteredCourses.length,
    filteredJobs.length,
    filteredProperties.length,
    filteredVehicles.length,
    filteredEvents.length,
  ]);

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
  const { addItem, updateQuantity, getItemQuantity, getTotalCount } = useCartStore();
  const [cartMounted, setCartMounted] = useState(false);
  useEffect(() => {
    setCartMounted(true);
  }, []);
  const safeCartQty = (id: string | number) => (cartMounted ? getItemQuantity(id) : 0);
  const mobileCartCount = cartMounted ? getTotalCount() : 0;

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
      .catch(() => { });
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
      if (activeBusinessId) params.set("businessId", String(activeBusinessId));
      if (query.trim()) params.set("q", query.trim());
      if (activeType !== "all") params.set("type", activeType);
      if (country) params.set("country", country);
      if (city.trim()) params.set("city", city.trim());
      if (locality.trim()) params.set("locality", locality.trim());
      if (postalCode.trim()) params.set("postalCode", postalCode.trim());
      if (selectedBusinessCategoryId) params.set("businessCategoryId", String(selectedBusinessCategoryId));

      const effectiveCatId = selectedSubcategoryId || selectedCategoryId;
      if (effectiveCatId) params.set("categoryId", String(effectiveCatId));

      const effectiveCatSlug = selectedSubcategorySlug || selectedCategorySlug;
      if (effectiveCatSlug) params.set("category", effectiveCatSlug);
      else if (selectedSubcategoryName || selectedCategoryName) params.set("category", selectedSubcategoryName || selectedCategoryName);

      const res = await fetch(`/api/public/discovery?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data?.data) {
        setBusinesses(data.data.businesses || []);
        setProfessionals(data.data.professionals || []);
        setProducts(data.data.products || []);
        setServices(data.data.services || []);
        setCourses(data.data.courses || []);
        setJobs(data.data.jobs || []);
        setProperties(data.data.properties || []);
        setVehicles(data.data.vehicles || []);
        setEvents(data.data.events || []);
        setDishes(data.data.dishes || []);
        setRooms(data.data.rooms || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch discovery listings");
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId, query, activeType, country, city, locality, postalCode, selectedBusinessCategoryId, selectedCategoryId, selectedSubcategoryId, selectedCategorySlug, selectedCategoryName, selectedSubcategorySlug, selectedSubcategoryName]);

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
      const resolvedBusinessId =
        enquiryModalItem.resultType === "business"
          ? enquiryModalItem.id
          : enquiryModalItem.business_id ||
            enquiryModalItem.businessId ||
            enquiryModalItem.institution_id ||
            enquiryModalItem.institution_profile_id ||
            undefined;

      const resolvedProfessionalId =
        enquiryModalItem.resultType === "professional"
          ? enquiryModalItem.id
          : enquiryModalItem.professional_id ||
            enquiryModalItem.professionalId ||
            undefined;

      const res = await fetch("/api/customer/enquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          businessId: resolvedBusinessId,
          professionalId: resolvedProfessionalId,
          productId: enquiryModalItem.resultType === "product" ? enquiryModalItem.id : enquiryModalItem.product_id || (enquiryModalItem as any).productId || undefined,
          serviceId: enquiryModalItem.resultType === "service" ? enquiryModalItem.id : enquiryModalItem.service_id || (enquiryModalItem as any).serviceId || undefined,
          courseId: enquiryModalItem.resultType === "course" || (enquiryModalItem as any).courseId ? ((enquiryModalItem as any).courseId || enquiryModalItem.id) : undefined,
          itemTitle: enquiryModalItem.title || enquiryModalItem.name,
          sourceUrl: typeof window !== "undefined" ? window.location.href : undefined,
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

  const isBusinessMode = Boolean(
    activeBusinessId ||
    process.env.NEXT_PUBLIC_APP_MODE === "business" ||
    process.env.NEXT_PUBLIC_APP_MODE === "institution"
  );

  const formatLocationAreaAndCity = (loc?: string | null) => {
    if (!loc || loc === "All Locations" || loc === "all") return "";
    let trimmed = loc.trim();
    if (trimmed.includes("-") && !trimmed.includes(" ")) {
      trimmed = trimmed
        .split("-")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }
    if (trimmed.toLowerCase().includes("pandeypur") && !trimmed.toLowerCase().includes("varanasi")) {
      return `${trimmed}, Varanasi`;
    }
    return trimmed;
  };

  const displayLocationText = useMemo(() => {
    if (city) return formatLocationAreaAndCity(city);
    if (userGlobalLocation && userGlobalLocation !== "All Locations" && userGlobalLocation !== "all") {
      return formatLocationAreaAndCity(userGlobalLocation);
    }
    if (country && country.toUpperCase() !== "ALL") {
      const cm = getCatalogCountryMeta(country);
      if (cm?.name) return cm.name;
    }
    return "All Locations";
  }, [city, userGlobalLocation, country]);

  const effectiveFullLocation = formatLocationAreaAndCity(
    city ||
    (userGlobalLocation && userGlobalLocation !== "All Locations" ? userGlobalLocation : "") ||
    (country && country.toUpperCase() !== "ALL" ? getCatalogCountryMeta(country)?.name : "") ||
    ""
  );

  const getVerticalLabel = (t: string) => {
    switch (t) {
      case "business": return "Businesses";
      case "service": return "Services";
      case "product": return "Products";
      case "professional": return "Professionals";
      case "course": return "Courses";
      case "job": return "Jobs";
      case "property": return "Properties";
      case "vehicle": return "Vehicles";
      case "event": return "Events";
      case "dish": return "Dishes";
      case "room": return "Rooms";
      case "financial": return "Finance";
      default: return "Explore";
    }
  };

  const renderFiltersContent = (isMobile = false) => (
    <div className={cn("space-y-6", !isMobile ? "bg-white border border-slate-200 rounded-2xl p-5 shadow-xs sticky top-24" : "p-1")}>
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-amber-500" />
          <span>Filters</span>
        </h2>
        <button
          type="button"
          onClick={() => {
            setProductNameSearch("");
            setActiveType("all");
            setSelectedBusinessCategoryId(null);
            setSelectedCategoryId(null);
            setSelectedCategoryName("");
            setSelectedCategorySlug("");
            setSelectedSubcategoryId(null);
            setSelectedSubcategoryName("");
            setSelectedSubcategorySlug("");
            setSelectedBrand("all");
            setCity("");
            setRadius("no_radius");
            setMinRating(0);
            setVerifiedOnly(false);
            setSortBy("featured");
            syncUrlParams({ type: "all", city: "", category: null, subcategory: null, q: "", brand: "all" });
          }}
          className="text-xs font-semibold text-amber-600 hover:text-amber-700 transition-colors cursor-pointer"
        >
          Clear all
        </button>
      </div>

      {/* 1. Listing Type / Vertical Dropdown (On Top) */}
      <div className="space-y-1.5">
        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
          <span>Listing Type</span>
          {allowedVerticals.length > 0 && (
            <span className="text-[10px] text-slate-400 font-normal">
              {allowedVerticals.length} available
            </span>
          )}
        </label>
        <div className="relative">
          <select
            value={activeType}
            onChange={(e) => {
              const newType = e.target.value as any;
              setActiveType(newType);
              setSelectedSubcategoryId(null);
              setSelectedSubcategoryName("");
              setSelectedSubcategorySlug("");

              if (newType && VERTICAL_DEFAULT_BUSINESS_CATEGORY[newType]) {
                const defSlug = VERTICAL_DEFAULT_BUSINESS_CATEGORY[newType];
                const matchedBc = businessCategories.find((b) => b.slug === defSlug || b.slug?.includes(defSlug));
                if (matchedBc) {
                  setSelectedBusinessCategoryId(matchedBc.id);
                  setSelectedCategoryId(matchedBc.id);
                  setSelectedCategoryName(matchedBc.name);
                  setSelectedCategorySlug(matchedBc.slug || defSlug);
                  syncUrlParams({ type: newType, category: matchedBc.slug || defSlug, subcategory: null });
                  return;
                }
              }
              syncUrlParams({ type: newType, subcategory: null });
            }}
            className="w-full h-10 rounded-xl bg-slate-50 hover:bg-slate-100/70 border border-slate-200 text-slate-900 text-xs px-3 pr-8 focus:outline-none focus:bg-white focus:border-blue-500 font-medium cursor-pointer transition-all appearance-none"
          >
            {allowedVerticals.map((v) => (
              <option key={v.type} value={v.type}>
                {v.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* 2. Business Category Filter */}
      <div className="space-y-2 pt-2 border-t border-slate-200">
        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
          <span>Business Category</span>
        </label>
        <div className="relative">
          {loadingCategories && businessCategories.length === 0 ? (
            <div className="w-full h-10 rounded-xl bg-slate-100 border border-slate-200 animate-pulse flex items-center px-3 text-xs text-slate-400 font-medium">
              Loading categories...
            </div>
          ) : (
            <>
              <select
                value={effectiveBusinessCategoryId || ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  setSelectedBusinessCategoryId(val);
                  setSelectedCategoryId(val);
                  setSelectedSubcategoryId(null);
                  setSelectedSubcategoryName("");
                  setSelectedSubcategorySlug("");
                  if (val) {
                    const cat = businessCategories.find((c) => c.id === val);
                    const catName = cat ? cat.name : "";
                    const catSlug = cat ? (cat.slug || cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")) : "";
                    setSelectedCategoryName(catName);
                    setSelectedCategorySlug(catSlug);
                    syncUrlParams({ category: catSlug || catName, subcategory: null });
                  } else {
                    setSelectedCategoryName("");
                    setSelectedCategorySlug("");
                    syncUrlParams({ category: null, subcategory: null });
                  }
                }}
                className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 pr-8 focus:outline-none focus:bg-white cursor-pointer appearance-none font-medium"
              >
                <option value="">
                  {businessCategories.length > 0 ? `All Business Categories (${businessCategories.length})` : "All Business Categories"}
                </option>
                {businessCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
            </>
          )}
        </div>
      </div>

      {/* 3. Category / Subcategory Filter for Selected Listing Type */}
      <div className="space-y-2 pt-2 border-t border-slate-200">
        <label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
          <span>
            {activeType === "product"
              ? "Product Category"
              : activeType === "course"
                ? "Course Category"
                : activeType === "job"
                  ? "Job Category"
                  : activeType === "property"
                    ? "Property Category"
                    : activeType === "vehicle"
                      ? "Vehicle Category"
                      : activeType === "event"
                        ? "Event Category"
                        : activeType === "professional"
                          ? "Profession Category"
                          : activeType === "service"
                            ? "Service Category"
                            : "Subcategory"}
          </span>
          {typeCategories.length > 0 && (
            <span className="text-[10px] text-slate-400 font-normal">
              ({typeCategories.length})
            </span>
          )}
        </label>

        {loadingTypeCategories && typeCategories.length === 0 ? (
          <div className="w-full h-10 rounded-xl bg-slate-100 border border-slate-200 animate-pulse flex items-center px-3 text-xs text-slate-400 font-medium">
            Loading categories...
          </div>
        ) : typeCategories.length > 0 ? (
          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
            <button
              type="button"
              onClick={() => {
                setSelectedSubcategoryId(null);
                setSelectedSubcategoryName("");
                setSelectedSubcategorySlug("");
                const bc = businessCategories.find((b) => b.id === effectiveBusinessCategoryId);
                const baseSlug = bc?.slug || "";
                setSelectedCategoryId(effectiveBusinessCategoryId);
                setSelectedCategorySlug(baseSlug);
                setSelectedCategoryName(bc?.name || "");
                syncUrlParams({ category: baseSlug || null, subcategory: null });
              }}
              className={cn(
                "w-full text-left text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center justify-between cursor-pointer",
                !selectedSubcategoryId
                  ? "bg-amber-100 text-amber-900 font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <span>All {activeType === "product" ? "Product Categories" : activeType === "job" ? "Job Categories" : activeType === "property" ? "Property Categories" : activeType === "vehicle" ? "Vehicle Categories" : activeType === "course" ? "Course Categories" : activeType === "event" ? "Event Categories" : activeType === "professional" ? "Profession Categories" : activeType === "service" ? "Service Categories" : "Subcategories"}</span>
              <span className="text-[10px] text-slate-400">({typeCategories.length})</span>
            </button>

            {typeCategories.map((cat) => {
              const catSlug = cat.slug || slugify(cat.name);
              const isSelected =
                selectedSubcategoryId === cat.id ||
                (selectedCategoryId === cat.id && !selectedSubcategoryId) ||
                selectedSubcategorySlug === catSlug ||
                (selectedCategorySlug === catSlug && !selectedSubcategorySlug);

              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedSubcategoryId(cat.id);
                    setSelectedSubcategoryName(cat.name);
                    setSelectedSubcategorySlug(catSlug);
                    syncUrlParams({ subcategory: catSlug });
                  }}
                  className={cn(
                    "w-full text-left text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center justify-between cursor-pointer",
                    isSelected
                      ? "bg-amber-100 text-amber-900 font-semibold"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  )}
                >
                  <span className="truncate">{cat.name}</span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-xs text-slate-400 italic py-1">
            No categories found for this listing type
          </div>
        )}
      </div>

      {/* Brand Filter (if products available) */}
      {activeType === "product" && availableBrands.length > 0 && (
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <label className="text-xs font-semibold text-slate-700">Brand</label>
          <select
            value={selectedBrand}
            onChange={(e) => {
              setSelectedBrand(e.target.value);
              syncUrlParams({ brand: e.target.value });
            }}
            className="w-full h-10 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs px-3 focus:outline-none focus:bg-white cursor-pointer"
          >
            <option value="all">All Brands ({availableBrands.length})</option>
            {availableBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Rating Star Checklist */}
      <div className="space-y-2 pt-2 border-t border-slate-200">
        <label className="text-xs font-semibold text-slate-700 block">Rating</label>
        <div className="space-y-1.5">
          {[
            { r: 5, label: "5 Star & Above" },
            { r: 4, label: "4 Star & Above" },
            { r: 3, label: "3 Star & Above" },
          ].map((item) => {
            const isSelected = minRating === item.r;
            return (
              <button
                key={item.r}
                type="button"
                onClick={() => setMinRating(isSelected ? 0 : item.r)}
                className={cn(
                  "w-full text-left text-xs px-2.5 py-1.5 rounded-xl transition-all flex items-center gap-2 cursor-pointer group",
                  isSelected
                    ? "bg-blue-50 text-blue-700 font-semibold border border-blue-200/60"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <div className={cn(
                  "size-3.5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                  isSelected ? "bg-blue-600 border-blue-600" : "border-slate-300 group-hover:border-slate-400 bg-white"
                )}>
                  {isSelected && <div className="size-1.5 rounded-full bg-white" />}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="size-3.5 fill-amber-400 text-amber-400 shrink-0" />
                  <span className="text-xs font-medium text-slate-700">{item.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Add Listing CTA Button (Desktop Sidebar Only) */}
      {!isMobile && (
        <div className="pt-2">
          <Link
            href="/packages"
            className="w-full h-10 rounded-xl bg-[#0070f3] hover:bg-blue-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="size-3.5" />
            <span>Add Listing</span>
          </Link>
        </div>
      )}

      {/* Verified Only Toggle */}
      <div className="pt-2 border-t border-slate-200">
        <label className="flex items-center justify-between cursor-pointer text-xs text-slate-700 font-medium">
          <span className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-emerald-600" />
            Verified Listings Only
          </span>
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="rounded border-slate-300 text-amber-500 focus:ring-amber-500 size-4 cursor-pointer"
          />
        </label>
      </div>

      {isMobile && (
        <div className="pt-3 border-t border-slate-200 sticky bottom-0 bg-white pb-1">
          <Button
            type="button"
            onClick={() => setMobileFiltersOpen(false)}
            className="w-full h-11 rounded-xl bg-[#0070f3] hover:bg-blue-600 text-white font-bold text-xs shadow-md cursor-pointer"
          >
            Show {totalFilteredCount} Results
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Hero Section with Panoramic Skyline & Floating Search Bar */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-sky-100/90 via-sky-50 to-blue-100/70 border border-sky-200/70 p-6 sm:p-10 shadow-xs">
        {/* Right scenic overlay */}
        <div className="absolute right-0 top-0 bottom-0 w-2/5 opacity-25 pointer-events-none overflow-hidden hidden md:block">
          <div className="absolute inset-0 bg-gradient-to-r from-sky-50 via-transparent to-transparent z-10" />
          <img
            src="/images/hero-books.jpg"
            alt="Scenic Skyline"
            className="w-full h-full object-cover object-right"
          />
        </div>

        <div className="relative z-10 max-w-4xl lg:max-w-5xl space-y-2">
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 flex-wrap">
            <Link href="/" className="hover:text-blue-600 transition-colors">Home</Link>
            <ChevronRight className="size-3 text-slate-400" />
            <button
              type="button"
              onClick={() => {
                setActiveType("all");
                setSelectedBusinessCategoryId(null);
                setSelectedCategoryId(null);
                setSelectedCategoryName("");
                setSelectedCategorySlug("");
                setSelectedSubcategoryId(null);
                setSelectedSubcategoryName("");
                setSelectedSubcategorySlug("");
                syncUrlParams({ type: "all", category: null, subcategory: null });
              }}
              className="hover:text-blue-600 transition-colors capitalize font-medium cursor-pointer"
            >
              {getVerticalLabel(activeType)}
            </button>
            {effectiveFullLocation && (
              <>
                <ChevronRight className="size-3 text-slate-400" />
                <span className="text-slate-700 font-medium">{effectiveFullLocation}</span>
              </>
            )}
            {(selectedCategoryName || selectedSubcategoryName) && (
              <>
                <ChevronRight className="size-3 text-slate-400" />
                <span className="text-blue-600 font-bold">{selectedSubcategoryName || selectedCategoryName}</span>
              </>
            )}
          </nav>

          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-slate-900 tracking-tight leading-tight sm:whitespace-nowrap truncate">
            {selectedSubcategoryName || selectedCategoryName || getVerticalLabel(activeType)}
            {effectiveFullLocation ? ` in ${effectiveFullLocation}` : ""}
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Find trusted {activeType === "professional" ? "professionals and experts" : activeType === "product" ? "products and stores" : activeType === "job" ? "jobs and opportunities" : activeType === "course" ? "courses and coaching" : "businesses and services"}{effectiveFullLocation ? ` in ${effectiveFullLocation}` : ""}.
          </p>
        </div>
      </div>

      {/* 2. Unified 1-Row Search & Filter Controls Bar */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200/90 p-2 flex flex-col md:flex-row md:flex-wrap lg:flex-nowrap items-center gap-2">
        {/* 1. First: Keyword Search Box */}
        <div className="relative flex-1 w-full min-w-[200px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeType === "professional" ? "professionals, services or skills..." : activeType === "product" ? "products, brands or stores..." : activeType === "job" ? "jobs, roles or companies..." : activeType === "course" ? "courses, subjects or institutes..." : "all listings, products, services..."}`}
            value={productNameSearch}
            onChange={(e) => setProductNameSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                syncUrlParams({ q: productNameSearch });
                performSearch();
              }
            }}
            className="w-full h-10 pl-10 pr-3 bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none font-medium"
          />
        </div>

        {/* 2. Location Selector */}
        <div className="flex items-center gap-1.5 h-10 px-2.5 bg-slate-50 border border-slate-200/80 rounded-xl shrink-0 w-full sm:w-auto">
          <MapPin className="size-3.5 text-blue-600 shrink-0" />
          <select
            value={city}
            onChange={(e) => {
              const val = e.target.value;
              setCity(val);
              syncUrlParams({ city: val });
            }}
            className="bg-transparent text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-4"
          >
            <option value="">All Locations</option>
            {availableLocations.map((loc) => (
              <option key={loc.id} value={loc.name}>
                {loc.name}
              </option>
            ))}
          </select>
          <ChevronDown className="size-3 text-slate-400 pointer-events-none -ml-3.5" />
        </div>

        {/* 3. Radius Filter */}
        <div className="flex items-center gap-1 h-10 px-2.5 bg-slate-50 border border-slate-200/80 rounded-xl shrink-0 text-xs w-full sm:w-auto">
          <span className="text-slate-400 font-normal text-xs">Radius</span>
          <select
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-3 text-xs"
          >
            <option value="no_radius">No radius</option>
            <option value="5">5 km</option>
            <option value="10">10 km</option>
            <option value="25">25 km</option>
            <option value="50">50 km</option>
          </select>
          <ChevronDown className="size-3 text-slate-400 pointer-events-none -ml-2" />
        </div>

        {/* 4. Rating Filter */}
        <div className="flex items-center gap-1 h-10 px-2.5 bg-slate-50 border border-slate-200/80 rounded-xl shrink-0 text-xs w-full sm:w-auto">
          <span className="text-slate-400 font-normal text-xs">Rating</span>
          <select
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-3 text-xs"
          >
            <option value="0">All</option>
            <option value="4.5">4.5+ ★</option>
            <option value="4.0">4.0+ ★</option>
            <option value="3.5">3.5+ ★</option>
          </select>
          <ChevronDown className="size-3 text-slate-400 pointer-events-none -ml-2" />
        </div>

        {/* 5. Sort Filter */}
        <div className="flex items-center gap-1 h-10 px-2.5 bg-slate-50 border border-slate-200/80 rounded-xl shrink-0 text-xs w-full sm:w-auto">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer appearance-none pr-3 text-xs"
          >
            <option value="featured">Sort: Name / Featured</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="rating_desc">Highest Rated</option>
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
          </select>
          <ChevronDown className="size-3 text-slate-400 pointer-events-none -ml-2" />
        </div>

        {/* 6. Blue Search Button */}
        <button
          type="button"
          onClick={() => {
            syncUrlParams({ q: productNameSearch });
            performSearch();
          }}
          className="h-10 px-5 rounded-xl bg-[#0070f3] hover:bg-blue-600 text-white text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs shrink-0 w-full sm:w-auto cursor-pointer"
        >
          <Search className="size-3.5" />
          <span>Search</span>
        </button>
      </div>

      {/* 3. Results Header Row with Count (Grid/List toggle removed as requested) */}
      <div className="flex items-center justify-between pt-1">
        {loading ? (
          <div className="h-5 w-44 bg-slate-200 animate-pulse rounded-md" />
        ) : (
          <div className="text-sm sm:text-base font-semibold text-slate-700 pl-1">
            <span className="text-blue-600 font-extrabold text-base sm:text-lg">{totalFilteredCount}</span> matching {activeType === "business" ? "businesses" : activeType === "service" ? "services" : activeType === "product" ? "products" : activeType === "course" ? "courses" : activeType === "job" ? "jobs" : "listings"}
          </div>
        )}
      </div>

      {/* 5. Two-Column Layout: Grid on Left, Filters Sidebar on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content Column */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-8">

          {/* Results Content */}
          {loading ? (
            <div className="space-y-6">
              <div className="h-6 w-56 bg-slate-200 animate-pulse rounded-md" />
              <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "grid grid-cols-1 gap-4"}>
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div
                    key={i}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs animate-pulse flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-44 w-full bg-slate-200" />
                      <div className="p-4 space-y-3">
                        <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                        <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                        <div className="flex items-center gap-2 pt-1">
                          <div className="h-4 w-12 bg-amber-100 rounded-md" />
                          <div className="h-3 w-20 bg-slate-100 rounded-md" />
                        </div>
                      </div>
                    </div>
                    <div className="p-4 pt-0 border-t border-slate-100 flex items-center justify-between gap-2 mt-2">
                      <div className="h-9 w-full bg-slate-100 rounded-xl" />
                      <div className="h-9 w-20 bg-slate-200 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Section: Businesses */}
              {(activeType === "all" || activeType === "business") && filteredBusinesses.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Building2 className="size-5 text-blue-600" />
                      Businesses & Establishments ({filteredBusinesses.length})
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredBusinesses.map((biz) => {
                      const favKey = `business-${biz.id}`;
                      const isFavorited = favorites.has(favKey);
                      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${biz.name} ${biz.city || ""}`)}`;
                      const whatsappClean = (biz.whatsapp || biz.phone || "").replace(/[^0-9]/g, "");
                      const bizUrl = buildBusinessSeoUrl(biz);

                      return (
                        <div
                          key={biz.id}
                          onClick={() => router.push(bizUrl)}
                          className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                        >
                          <div>
                            {/* Top Image Banner with Category Badge */}
                            <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                              <Link href={bizUrl} className="block w-full h-full">
                                <img
                                  src={(biz as any).cover_url || (biz as any).banner_url || biz.logo_url || biz.default_image_url || "/images/hero-deer.jpg"}
                                  alt={biz.name}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                              </Link>
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                              <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-md text-slate-800 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-slate-200 shadow-xs">
                                {biz.category_name || biz.business_type || "Business"}
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFavorite(biz);
                                }}
                                className={`absolute top-3 right-3 p-1.5 rounded-full backdrop-blur-md transition-colors cursor-pointer ${isFavorited
                                  ? "bg-rose-50 text-rose-600 border border-rose-200"
                                  : "bg-white/80 text-slate-600 hover:text-rose-600 border border-slate-200"
                                  }`}
                                title={isFavorited ? "Remove from favorites" : "Save to favorites"}
                              >
                                <Heart className={`size-4 ${isFavorited ? "fill-rose-600" : ""}`} />
                              </button>
                            </div>

                            {/* Body Info */}
                            <div className="p-4 space-y-2.5">
                              <div className="flex items-start justify-between gap-2">
                                <Link href={buildBusinessSeoUrl(biz)} className="flex-1 min-w-0">
                                  <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors cursor-pointer truncate">
                                    {biz.name}
                                  </h3>
                                </Link>
                                {biz.is_verified && (
                                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] px-1.5 py-0 shrink-0">
                                    <ShieldCheck className="size-3 mr-0.5 text-emerald-600" /> Verified
                                  </Badge>
                                )}
                              </div>

                              {/* Rating & Reviews */}
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <div className="flex items-center gap-1">
                                  <Star className="size-3.5 fill-amber-400 text-amber-400" />
                                  <span className="font-bold text-slate-900">{Number(biz.avg_rating) > 0 ? biz.avg_rating : "4.8"}</span>
                                  <span className="text-slate-500">({Number(biz.review_count) > 0 ? biz.review_count : 12} reviews)</span>
                                </div>
                                <div className="flex items-center gap-1 text-slate-500 text-xs">
                                  <MapPin className="size-3 text-amber-500 shrink-0" />
                                  <span className="truncate max-w-[120px]">{biz.city || "Available"}</span>
                                </div>
                              </div>

                              {/* About snippet */}
                              {biz.about && (
                                <p className="text-slate-600 text-xs line-clamp-2">
                                  {biz.about}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Footer Actions */}
                          <div className="p-4 pt-0 border-t border-slate-100 mt-2 flex flex-col gap-2">
                            <div className="grid grid-cols-4 gap-1.5 w-full pt-3">
                              {biz.phone ? (
                                <a
                                  href={`tel:${biz.phone}`}
                                  className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                                  title="Call Business"
                                >
                                  <Phone className="size-4" />
                                </a>
                              ) : (
                                <span className="opacity-40 p-2 text-center text-slate-400"><Phone className="size-4 mx-auto" /></span>
                              )}

                              {whatsappClean ? (
                                <a
                                  href={`https://wa.me/${whatsappClean}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center justify-center p-2 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors"
                                  title="Chat on WhatsApp"
                                >
                                  <MessageCircle className="size-4" />
                                </a>
                              ) : (
                                <span className="opacity-40 p-2 text-center text-slate-400"><MessageCircle className="size-4 mx-auto" /></span>
                              )}

                              {biz.email ? (
                                <a
                                  href={`mailto:${biz.email}`}
                                  className="inline-flex items-center justify-center p-2 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition-colors"
                                  title="Send Email"
                                >
                                  <Mail className="size-4" />
                                </a>
                              ) : (
                                <span className="opacity-40 p-2 text-center text-slate-400"><Mail className="size-4 mx-auto" /></span>
                              )}

                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center p-2 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                                title="Directions on Map"
                              >
                                <Navigation className="size-4" />
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section: Professionals */}
              {(activeType === "all" || activeType === "professional") && filteredProfessionals.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                      <Briefcase className="size-5 text-purple-600" />
                      Top Professionals & Consultants ({filteredProfessionals.length})
                    </h2>
                  </div>

                  <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "grid grid-cols-1 gap-4"}>
                    {filteredProfessionals.map((pro) => {
                      const favKey = `professional-${pro.id}`;
                      const isFavorited = favorites.has(favKey);
                      const proUrl = buildProfessionalSeoUrl(pro);

                      return (
                        <div
                          key={pro.id}
                          onClick={() => router.push(proUrl)}
                          className={cn(
                            "bg-white border border-slate-200 hover:border-blue-400 rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex justify-between group cursor-pointer",
                            viewMode === "grid" ? "flex-col" : "flex-col sm:flex-row sm:items-center gap-4"
                          )}
                        >
                          <div className={cn("min-w-0", viewMode === "list" && "flex-1")}>
                            {/* Top row: Avatar + Info + Heart */}
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                {/* Circular Avatar */}
                                <Link href={proUrl} onClick={(e) => e.stopPropagation()} className="shrink-0">
                                  {pro.avatar_url ? (
                                    <img
                                      src={pro.avatar_url}
                                      alt={pro.name}
                                      className="size-14 rounded-full object-cover border-2 border-white shadow-xs shrink-0"
                                    />
                                  ) : (
                                    <div className="size-14 rounded-full bg-rose-100 text-rose-600 font-bold flex items-center justify-center shrink-0 text-base shadow-xs">
                                      {pro.name.slice(0, 2).toUpperCase()}
                                    </div>
                                  )}
                                </Link>

                                {/* Name & Badges */}
                                <div className="min-w-0 flex-1">
                                  <Link href={proUrl} onClick={(e) => e.stopPropagation()}>
                                    <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                                      {pro.name}
                                    </h3>
                                  </Link>

                                  {/* Verified Badge */}
                                  {pro.is_verified && (
                                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/70 text-emerald-700 text-[10px] font-semibold mt-1">
                                      <CheckCircle2 className="size-3 text-emerald-600 fill-emerald-100" />
                                      <span>Verified</span>
                                    </div>
                                  )}

                                  {/* Profession & Experience */}
                                  <div className="flex items-center gap-1.5 text-xs text-purple-700 font-medium mt-1.5 truncate">
                                    <Briefcase className="size-3.5 text-purple-600 shrink-0" />
                                    <span className="truncate">
                                      {pro.profession_type || pro.designation || "Professional"}
                                      {pro.experience_years ? ` • ${pro.experience_years} Years Experience` : ""}
                                    </span>
                                  </div>

                                  {/* Rating */}
                                  <div className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-1">
                                    <Star className="size-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                    <span className="font-bold text-slate-800">{pro.avg_rating || "0.0"}</span>
                                    <span className="text-slate-400">({pro.review_count || 0} reviews)</span>
                                  </div>
                                </div>
                              </div>

                              {/* Favorite Heart Button */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleFavorite(pro);
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 transition-colors shrink-0 cursor-pointer"
                                title={isFavorited ? "Remove from favorites" : "Save to favorites"}
                              >
                                <Heart className={cn("size-4.5", isFavorited && "fill-rose-600 text-rose-600")} />
                              </button>
                            </div>
                          </div>

                          {/* Bottom Action Buttons: View Profile and Call */}
                          <div className={cn(
                            "flex items-center gap-2 border-t border-slate-100 pt-3 mt-3",
                            viewMode === "list" ? "sm:border-t-0 sm:pt-0 sm:mt-0 sm:w-56 shrink-0" : "w-full"
                          )}>
                            <Link
                              href={proUrl}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 text-center py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1 border border-sky-100"
                            >
                              <span>View Profile</span>
                              <ArrowRight className="size-3" />
                            </Link>

                            <a
                              href={`tel:${pro.phone || "9876543210"}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex-1 text-center py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 border border-sky-100"
                            >
                              <Phone className="size-3.5 text-sky-600" />
                              <span>Call</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section: Products */}
              {(activeType === "all" || activeType === "product") && filteredProducts.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Package className="size-5 text-indigo-600" />
                    Featured Products & Master Catalog ({filteredProducts.length})
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredProducts.map((prod) => (
                      <CompactProductCard
                        key={prod.id}
                        product={prod}
                        business={prod.seller_info ? {
                          id: prod.seller_info.business_id,
                          name: prod.seller_info.business_name,
                          slug: prod.seller_info.business_slug,
                          institution_profile_id: prod.seller_info.institution_id,
                          user_id: prod.seller_info.user_id,
                        } : undefined}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Section: Services */}
              {(activeType === "all" || activeType === "service" || activeType === "financial") && filteredServices.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Sparkles className="size-5 text-emerald-600" />
                    {activeType === "financial" ? `Financial Services (${filteredServices.length})` : `Featured Services & Master Services (${filteredServices.length})`}
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                    {filteredServices.map((srv) => (
                      <CompactServiceCard
                        key={srv.id}
                        service={srv}
                        business={srv.seller_info ? {
                          id: srv.seller_info.business_id,
                          name: srv.seller_info.business_name,
                          slug: srv.seller_info.business_slug,
                          institution_profile_id: srv.seller_info.institution_id,
                          user_id: srv.seller_info.user_id,
                        } : undefined}
                        onBook={(s) => {
                          setSelectedBookingService({
                            id: s.id,
                            name: s.name,
                            price: (s as any).suggested_price_inr || (s as any).price || 0,
                            regular_price: (s as any).regular_price ? Number((s as any).regular_price) : null,
                            pricing_model: s.pricing_model,
                            estimated_duration: (s as any).estimated_duration || `${(s as any).duration_minutes || 60} mins`,
                            service_location: (s as any).service_location || "In-Person & Online",
                            default_image_url: s.default_image_url,
                            provider_name: (s as any).provider_name || s.seller_info?.business_name || "Service Provider",
                            business_id: (s as any).business_id || s.seller_info?.business_id || null,
                            professional_id: (s as any).professional_id || null,
                            institution_id: (s as any).institution_id || null,
                          });
                          setBookingDialogOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Section: Courses */}
              {(activeType === "all" || activeType === "course") && filteredCourses.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <BookOpen className="size-5 text-amber-600" />
                    Featured Academic Courses & Programs ({filteredCourses.length})
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredCourses.map((c) => {
                      const courseUrl = buildCourseSeoUrl(c);
                      return (
                        <Card
                          key={c.id}
                          onClick={() => router.push(courseUrl)}
                          className="rounded-2xl border shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden bg-card cursor-pointer group"
                        >
                          <CardHeader className="p-4 pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                {c.category_name && (
                                  <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 mb-1 bg-amber-50 text-amber-700 border-amber-200">
                                    {c.category_name}
                                  </Badge>
                                )}
                                <Link href={courseUrl} className="group-hover:text-primary transition-colors cursor-pointer block">
                                  <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-2">
                                    {c.name}
                                  </h3>
                                </Link>
                                {c.code && (
                                  <p className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                    Code: {c.code}
                                  </p>
                                )}
                              </div>
                              <Link
                                href={courseUrl}
                                className="size-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0 hover:bg-amber-500/20 transition-colors"
                              >
                                <BookOpen className="size-4.5" />
                              </Link>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-1 pb-3 text-xs space-y-2 flex-1">
                            {c.description && (
                              <p className="text-muted-foreground text-[11px] line-clamp-2">
                                {c.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                              {c.duration_value && (
                                <span className="flex items-center gap-1 font-medium bg-muted/60 px-2 py-0.5 rounded-md">
                                  <Clock className="size-3 text-primary" />
                                  {c.duration_value} {c.duration_unit || "Months"}
                                </span>
                              )}
                              {c.university_name && (
                                <span className="flex items-center gap-1 font-medium bg-muted/60 px-2 py-0.5 rounded-md">
                                  <Building2 className="size-3 text-primary" />
                                  {c.university_name}
                                </span>
                              )}
                              {c.seats_available !== undefined && (
                                <span className="flex items-center gap-1 font-medium bg-muted/60 px-2 py-0.5 rounded-md">
                                  {c.seats_available} Seats Available
                                </span>
                              )}
                            </div>
                          </CardContent>
                          <CardFooter className="p-4 pt-0 border-t bg-muted/10 flex items-center justify-between gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCheckoutItem({
                                  id: c.id,
                                  name: c.name,
                                  type: "service",
                                  price: Number(c.price || c.fee || c.annual_fee || 5000),
                                  sale_price: Number(c.sale_price || c.discounted_price || c.price || c.fee || 5000),
                                  institution_id: c.institution_id || c.institution_profile_id || null,
                                  provider_name: c.university_name || c.institution_name || "Maa Sharda Institute",
                                } as any);
                                setCheckoutOpen(true);
                              }}
                              className="flex-1 text-xs font-semibold cursor-pointer border-slate-300 hover:bg-slate-100"
                            >
                              Buy Now
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEnquiryModalItem({ ...c, resultType: "course", courseId: c.id });
                                setEnquiryForm({
                                  name: user?.full_name || "",
                                  email: user?.email || "",
                                  phone: user?.phone || "",
                                  message: `Hi, I am interested in admission for ${c.name}. Please share details and fee structure.`,
                                  preferredDate: "",
                                  preferredTime: "",
                                });
                              }}
                              className="flex-1 text-xs font-bold bg-[#d9232e] hover:bg-[#b81d26] text-white"
                            >
                              Enquire
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Section: Jobs */}
              {(activeType === "all" || activeType === "job") && filteredJobs.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                    <Briefcase className="size-5 text-blue-600" />
                    Featured Job Openings & Vacancies ({filteredJobs.length})
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredJobs.map((j) => {
                      const jobUrl = buildJobSeoUrl(j);
                      const employerHref = j.institution_slug
                        ? `/institutes/${j.institution_slug}`
                        : j.business_slug
                        ? `/business/${j.business_slug}`
                        : j.institution_id
                        ? `/institutes/${j.institution_id}`
                        : j.business_id
                        ? `/business/${j.business_id}`
                        : null;
                      const employerName = j.company_name || j.institution_name;
                      return (
                        <Card
                          key={j.id}
                          onClick={() => router.push(jobUrl)}
                          className="rounded-2xl border shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden bg-card group cursor-pointer"
                        >
                          <CardHeader className="p-4 pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                {j.department && (
                                  <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 mb-1 bg-blue-50 text-blue-700 border-blue-200">
                                    {j.department}
                                  </Badge>
                                )}
                                <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                                  <Link href={jobUrl} className="hover:text-primary">
                                    {j.title || j.name}
                                  </Link>
                                </h3>
                                {employerName && (
                                  employerHref ? (
                                    <Link
                                      href={employerHref}
                                      onClick={(e) => e.stopPropagation()}
                                      className="text-xs text-muted-foreground font-semibold mt-0.5 hover:text-primary hover:underline truncate block transition-colors"
                                    >
                                      {employerName}
                                    </Link>
                                  ) : (
                                    <p className="text-xs text-muted-foreground font-semibold mt-0.5 truncate">
                                      {employerName}
                                    </p>
                                  )
                                )}
                              </div>
                              <Link
                                href={jobUrl}
                                className="size-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 hover:bg-blue-500/20 transition-colors"
                              >
                                <Briefcase className="size-4.5" />
                              </Link>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4 pt-1 pb-3 text-xs space-y-2 flex-1">
                            {j.description && (
                              <p className="text-muted-foreground text-[11px] line-clamp-2">
                                {j.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                              {j.location && (
                                <span className="flex items-center gap-1 font-medium bg-muted/60 px-2 py-0.5 rounded-md">
                                  <MapPin className="size-3 text-primary" />
                                  {j.location}
                                </span>
                              )}
                              {j.employment_type && (
                                <span className="flex items-center gap-1 font-medium bg-muted/60 px-2 py-0.5 rounded-md">
                                  {j.employment_type}
                                </span>
                              )}
                              {j.work_mode && (
                                <span className="flex items-center gap-1 font-medium bg-muted/60 px-2 py-0.5 rounded-md capitalize">
                                  {j.work_mode}
                                </span>
                              )}
                              {j.salary_range && (
                                <span className="flex items-center gap-1 font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                  {j.salary_range}
                                </span>
                              )}
                            </div>
                          </CardContent>
                          <CardFooter className="p-4 pt-0 border-t bg-muted/10 flex items-center justify-between gap-2">
                            <Link href={jobUrl} className="flex-1" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs font-semibold cursor-pointer"
                              >
                                View Details
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEnquiryModalItem({ ...j, resultType: "job", jobId: j.id });
                                setEnquiryForm({
                                  name: user?.full_name || "",
                                  email: user?.email || "",
                                  phone: user?.phone || "",
                                  message: `Hi, I would like to apply for the ${j.title || j.name} position. Please review my candidacy.`,
                                  preferredDate: "",
                                  preferredTime: "",
                                });
                              }}
                              className="flex-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Apply Now
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Properties Section */}
              {(activeType === "all" || activeType === "property") && filteredProperties.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Home className="size-4 text-emerald-600" />
                      Featured Properties & Real Estate ({filteredProperties.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredProperties.map((p) => {
                      const propUrl = `/properties/${p.slug || p.id}`;
                      return (
                        <Card
                          key={p.id}
                          onClick={() => router.push(propUrl)}
                          className="border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col justify-between cursor-pointer group"
                        >
                          <div>
                            <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                              <Link href={propUrl} className="block w-full h-full">
                                {p.image_url || p.default_image_url ? (
                                  <img
                                    src={p.image_url || p.default_image_url || ""}
                                    alt={p.title || p.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-emerald-50 text-emerald-600">
                                    <Home className="size-12 opacity-60" />
                                  </div>
                                )}
                              </Link>
                              <div className="absolute top-2.5 right-2.5 pointer-events-none">
                                <Badge className="bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5">
                                  {p.rental_amount ? `₹${Number(p.rental_amount).toLocaleString()}/mo` : p.price ? `₹${Number(p.price).toLocaleString()}` : "Price on Request"}
                                </Badge>
                              </div>
                              {p.city && (
                                <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
                                  <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-xs text-[10px] px-2 py-0.5 flex items-center gap-1">
                                    <MapPin className="size-2.5" />
                                    {p.city}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <CardContent className="p-4 space-y-2">
                              <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-emerald-600 transition-colors">
                                <Link href={propUrl}>
                                  {p.title || p.name}
                                </Link>
                              </h3>
                              {p.business_name && (
                                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <Building2 className="size-3 text-slate-400 shrink-0" />
                                  <Link
                                    href={p.business_slug ? `/business/${p.business_slug}` : p.business_id ? `/business/${p.business_id}` : "#"}
                                    onClick={(e) => e.stopPropagation()}
                                    className="truncate font-medium text-slate-700 hover:text-emerald-600 hover:underline transition-colors"
                                  >
                                    {p.business_name}
                                  </Link>
                                </div>
                              )}
                              {p.description && (
                                <p className="text-xs text-slate-600 line-clamp-2">
                                  {p.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-[11px] text-slate-600 pt-1 flex-wrap">
                                {p.bedrooms ? (
                                  <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">
                                    {p.bedrooms} BHK
                                  </span>
                                ) : null}
                                {p.built_up_area ? (
                                  <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">
                                    {p.built_up_area} {p.area_unit || "sq ft"}
                                  </span>
                                ) : null}
                                {p.address && (
                                  <span className="text-[10px] text-slate-400 truncate max-w-[200px]">
                                    {p.address}
                                  </span>
                                )}
                              </div>
                            </CardContent>
                          </div>
                          <CardFooter className="p-4 pt-0 border-t bg-slate-50/50 flex items-center justify-between gap-2 mt-2">
                            {p.phone && (
                              <a
                                href={`tel:${p.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 flex-1 transition-colors"
                              >
                                <Phone className="size-3" /> Call
                              </a>
                            )}
                            <Button
                              size="sm"
                              className="flex-1 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEnquiryModalItem({ ...p, resultType: "property", propertyId: p.id });
                                setEnquiryForm({
                                  name: user?.full_name || "",
                                  email: user?.email || "",
                                  phone: user?.phone || "",
                                  message: `Hi, I am interested in "${p.title || p.name}". Please share more details and arrange a site visit.`,
                                  preferredDate: "",
                                  preferredTime: "",
                                });
                              }}
                            >
                              Enquire Now
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Vehicles Section */}
              {(activeType === "all" || activeType === "vehicle") && filteredVehicles.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Car className="size-4 text-blue-600" />
                      Featured Vehicles & Mobility ({filteredVehicles.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredVehicles.map((v) => {
                      const vehUrl = `/vehicles/${v.slug || v.id}`;
                      return (
                        <Card
                          key={v.id}
                          onClick={() => router.push(vehUrl)}
                          className="border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col justify-between cursor-pointer group"
                        >
                          <div>
                            <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                              <Link href={vehUrl} className="block w-full h-full">
                                {v.image_url || v.default_image_url ? (
                                  <img
                                    src={v.image_url || v.default_image_url || ""}
                                    alt={v.title || v.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-blue-50 text-blue-600">
                                    <Car className="size-12 opacity-60" />
                                  </div>
                                )}
                              </Link>
                              <div className="absolute top-2.5 right-2.5 pointer-events-none">
                                <Badge className="bg-blue-600 text-white font-bold text-[10px] px-2 py-0.5">
                                  {v.price ? `₹${Number(v.price).toLocaleString()}` : "Price on Request"}
                                </Badge>
                              </div>
                              {v.city && (
                                <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
                                  <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-xs text-[10px] px-2 py-0.5 flex items-center gap-1">
                                    <MapPin className="size-2.5" />
                                    {v.city}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <CardContent className="p-4 space-y-2">
                              <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-blue-600 transition-colors">
                                <Link href={vehUrl}>
                                  {v.title || v.name}
                                </Link>
                              </h3>
                              {v.business_name && (
                                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <Building2 className="size-3 text-slate-400 shrink-0" />
                                  <Link
                                    href={v.business_slug ? `/business/${v.business_slug}` : v.business_id ? `/business/${v.business_id}` : "#"}
                                    onClick={(e) => e.stopPropagation()}
                                    className="truncate font-medium text-slate-700 hover:text-blue-600 hover:underline transition-colors"
                                  >
                                    {v.business_name}
                                  </Link>
                                </div>
                              )}
                              {v.description && (
                                <p className="text-xs text-slate-600 line-clamp-2">
                                  {v.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-[11px] text-slate-600 pt-1 flex-wrap">
                                {v.manufacturing_year ? (
                                  <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">
                                    {v.manufacturing_year}
                                  </span>
                                ) : null}
                                {v.color ? (
                                  <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">
                                    {v.color}
                                  </span>
                                ) : null}
                                {v.mileage ? (
                                  <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">
                                    {v.mileage}
                                  </span>
                                ) : null}
                                {v.kilometers_driven ? (
                                  <span className="bg-slate-100 px-2 py-0.5 rounded font-medium">
                                    {Number(v.kilometers_driven).toLocaleString()} km
                                  </span>
                                ) : null}
                              </div>
                            </CardContent>
                          </div>
                          <CardFooter className="p-4 pt-0 border-t bg-slate-50/50 flex items-center justify-between gap-2 mt-2">
                            {v.phone && (
                              <a
                                href={`tel:${v.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 flex-1 transition-colors"
                              >
                                <Phone className="size-3" /> Call Dealer
                              </a>
                            )}
                            <Button
                              size="sm"
                              className="flex-1 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEnquiryModalItem({ ...v, resultType: "vehicle", vehicleId: v.id });
                                setEnquiryForm({
                                  name: user?.full_name || "",
                                  email: user?.email || "",
                                  phone: user?.phone || "",
                                  message: `Hi, I am interested in purchasing "${v.title || v.name}". Please share test drive and best price details.`,
                                  preferredDate: "",
                                  preferredTime: "",
                                });
                              }}
                            >
                              Enquire Now
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Events Section */}
              {(activeType === "all" || activeType === "event") && filteredEvents.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="size-4 text-purple-600" />
                      Upcoming Events & Expos ({filteredEvents.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredEvents.map((e) => {
                      const eventUrl = `/events/${e.slug || e.id}`;
                      return (
                        <Card
                          key={e.id}
                          onClick={() => router.push(eventUrl)}
                          className="border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col justify-between cursor-pointer group"
                        >
                          <div>
                            <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                              <Link href={eventUrl} className="block w-full h-full">
                                {e.image_url || e.default_image_url ? (
                                  <img
                                    src={e.image_url || e.default_image_url || ""}
                                    alt={e.title || e.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-purple-50 text-purple-600">
                                    <Calendar className="size-12 opacity-60" />
                                  </div>
                                )}
                              </Link>
                              <div className="absolute top-2.5 right-2.5 pointer-events-none">
                                <Badge className={e.is_free ? "bg-emerald-600 text-white font-bold text-[10px] px-2 py-0.5" : "bg-purple-600 text-white font-bold text-[10px] px-2 py-0.5"}>
                                  {e.is_free ? "Free Entry" : e.price ? `₹${Number(e.price).toLocaleString()}` : "Pass Required"}
                                </Badge>
                              </div>
                              {e.city && (
                                <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
                                  <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-xs text-[10px] px-2 py-0.5 flex items-center gap-1">
                                    <MapPin className="size-2.5" />
                                    {e.city}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <CardContent className="p-4 space-y-2">
                              <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-purple-600 transition-colors">
                                <Link href={eventUrl}>
                                  {e.title || e.name}
                                </Link>
                              </h3>
                              {e.venue_name && (
                                <div className="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                                  <MapPin className="size-3 text-purple-500 shrink-0" />
                                  <span className="truncate">{e.venue_name}</span>
                                </div>
                              )}
                              {e.business_name && (
                                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <Building2 className="size-3 text-slate-400 shrink-0" />
                                  <Link
                                    href={e.business_slug ? `/business/${e.business_slug}` : e.business_id ? `/business/${e.business_id}` : "#"}
                                    onClick={(e) => e.stopPropagation()}
                                    className="truncate font-medium text-slate-700 hover:text-purple-600 hover:underline transition-colors"
                                  >
                                    {e.business_name}
                                  </Link>
                                </div>
                              )}
                              {e.description && (
                                <p className="text-xs text-slate-600 line-clamp-2">
                                  {e.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-[11px] text-slate-600 pt-1 flex-wrap">
                                {e.start_date && (
                                  <span className="bg-purple-50 text-purple-700 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                                    <Calendar className="size-3" />
                                    {new Date(e.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                  </span>
                                )}
                                {e.start_time && (
                                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded flex items-center gap-1">
                                    <Clock className="size-3" />
                                    {e.start_time}
                                  </span>
                                )}
                              </div>
                            </CardContent>
                          </div>
                          <CardFooter className="p-4 pt-0 border-t bg-slate-50/50 flex items-center justify-between gap-2 mt-2">
                            {e.phone && (
                              <a
                                href={`tel:${e.phone}`}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 flex-1 transition-colors"
                              >
                                <Phone className="size-3" /> Contact
                              </a>
                            )}
                            <Button
                              size="sm"
                              className="flex-1 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setEnquiryModalItem({ ...e, resultType: "event", eventId: e.id });
                                setEnquiryForm({
                                  name: user?.full_name || "",
                                  email: user?.email || "",
                                  phone: user?.phone || "",
                                  message: `Hi, I would like to register/attend "${e.title || e.name}". Please confirm schedule and booking.`,
                                  preferredDate: e.start_date || "",
                                  preferredTime: e.start_time || "",
                                });
                              }}
                            >
                              Register / Enquire
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dishes Section */}
              {(activeType === "all" || activeType === "dish") && filteredDishes.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <UtensilsCrossed className="size-4 text-rose-600" />
                      Popular Dishes & Menus ({filteredDishes.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredDishes.map((d) => {
                      const dishUrl = `/dishes/${d.slug || d.id}`;
                      return (
                        <Card
                          key={d.id}
                          onClick={() => router.push(dishUrl)}
                          className="border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col justify-between cursor-pointer group"
                        >
                          <div>
                            <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                              <Link href={dishUrl} className="block w-full h-full">
                                {d.image_url || d.default_image_url ? (
                                  <img
                                    src={d.image_url || d.default_image_url || ""}
                                    alt={d.title || d.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-rose-50 text-rose-600">
                                    <UtensilsCrossed className="size-12 opacity-60" />
                                  </div>
                                )}
                              </Link>
                              <div className="absolute top-2.5 right-2.5 pointer-events-none">
                                <Badge className="bg-rose-600 text-white font-bold text-[10px] px-2 py-0.5">
                                  {d.price ? `₹${Number(d.price).toLocaleString()}` : "Price on Request"}
                                </Badge>
                              </div>
                              {d.city && (
                                <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
                                  <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-xs text-[10px] px-2 py-0.5 flex items-center gap-1">
                                    <MapPin className="size-2.5" />
                                    {d.city}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <CardContent className="p-4 space-y-2">
                              <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-rose-600 transition-colors">
                                <Link href={dishUrl}>
                                  {d.title || d.name}
                                </Link>
                              </h3>
                              {d.business_name && (
                                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <Building2 className="size-3 text-slate-400 shrink-0" />
                                  <Link
                                    href={d.business_slug ? `/business/${d.business_slug}` : d.business_id ? `/business/${d.business_id}` : "#"}
                                    onClick={(ev) => ev.stopPropagation()}
                                    className="truncate font-medium text-slate-700 hover:text-rose-600 hover:underline transition-colors"
                                  >
                                    {d.business_name}
                                  </Link>
                                </div>
                              )}
                              {d.description && (
                                <p className="text-xs text-slate-600 line-clamp-2">
                                  {d.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-[11px] text-slate-600 pt-1 flex-wrap">
                                {d.subcategory_name || d.category_name ? (
                                  <span className="bg-rose-50 text-rose-700 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                                    <Tag className="size-3" />
                                    {d.subcategory_name || d.category_name}
                                  </span>
                                ) : null}
                                {d.spice_level && (
                                  <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                    {d.spice_level}
                                  </span>
                                )}
                              </div>
                            </CardContent>
                          </div>
                          <CardFooter className="p-4 pt-0 border-t bg-slate-50/50 flex items-center justify-between gap-2 mt-2">
                            {d.phone && (
                              <a
                                href={`tel:${d.phone}`}
                                onClick={(ev) => ev.stopPropagation()}
                                className="inline-flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 flex-1 transition-colors"
                              >
                                <Phone className="size-3" /> Call
                              </a>
                            )}
                            <Button
                              size="sm"
                              className="flex-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setEnquiryModalItem({ ...d, resultType: "dish", dishId: d.id });
                                setEnquiryForm({
                                  name: user?.full_name || "",
                                  email: user?.email || "",
                                  phone: user?.phone || "",
                                  message: `Hi, I would like to order or enquire about "${d.title || d.name}". Please confirm availability.`,
                                  preferredDate: "",
                                  preferredTime: "",
                                });
                              }}
                            >
                              Order / Enquire
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rooms Section */}
              {(activeType === "all" || activeType === "room") && filteredRooms.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <BedDouble className="size-4 text-indigo-600" />
                      Hotel Rooms & Stays ({filteredRooms.length})
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredRooms.map((r) => {
                      const roomUrl = `/rooms/${r.slug || r.id}`;
                      return (
                        <Card
                          key={r.id}
                          onClick={() => router.push(roomUrl)}
                          className="border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow duration-200 overflow-hidden flex flex-col justify-between cursor-pointer group"
                        >
                          <div>
                            <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                              <Link href={roomUrl} className="block w-full h-full">
                                {r.image_url || r.default_image_url ? (
                                  <img
                                    src={r.image_url || r.default_image_url || ""}
                                    alt={r.title || r.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-600">
                                    <BedDouble className="size-12 opacity-60" />
                                  </div>
                                )}
                              </Link>
                              <div className="absolute top-2.5 right-2.5 pointer-events-none">
                                <Badge className="bg-indigo-600 text-white font-bold text-[10px] px-2 py-0.5">
                                  {r.price ? `₹${Number(r.price).toLocaleString()} / night` : "Check Rates"}
                                </Badge>
                              </div>
                              {r.city && (
                                <div className="absolute bottom-2.5 left-2.5 pointer-events-none">
                                  <Badge variant="secondary" className="bg-black/60 text-white backdrop-blur-xs text-[10px] px-2 py-0.5 flex items-center gap-1">
                                    <MapPin className="size-2.5" />
                                    {r.city}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <CardContent className="p-4 space-y-2">
                              <h3 className="font-bold text-slate-900 text-sm line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                <Link href={roomUrl}>
                                  {r.title || r.name}
                                </Link>
                              </h3>
                              {r.business_name && (
                                <div className="text-[11px] text-slate-500 flex items-center gap-1">
                                  <Building2 className="size-3 text-slate-400 shrink-0" />
                                  <Link
                                    href={r.business_slug ? `/business/${r.business_slug}` : r.business_id ? `/business/${r.business_id}` : "#"}
                                    onClick={(ev) => ev.stopPropagation()}
                                    className="truncate font-medium text-slate-700 hover:text-indigo-600 hover:underline transition-colors"
                                  >
                                    {r.business_name}
                                  </Link>
                                </div>
                              )}
                              {r.description && (
                                <p className="text-xs text-slate-600 line-clamp-2">
                                  {r.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 text-[11px] text-slate-600 pt-1 flex-wrap">
                                {r.subcategory_name || r.category_name ? (
                                  <span className="bg-indigo-50 text-indigo-700 font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                                    <Tag className="size-3" />
                                    {r.subcategory_name || r.category_name}
                                  </span>
                                ) : null}
                                {r.max_adults && (
                                  <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                                    <Users className="size-3" />
                                    Up to {r.max_adults} Guests
                                  </span>
                                )}
                              </div>
                            </CardContent>
                          </div>
                          <CardFooter className="p-4 pt-0 border-t bg-slate-50/50 flex items-center justify-between gap-2 mt-2">
                            {r.phone && (
                              <a
                                href={`tel:${r.phone}`}
                                onClick={(ev) => ev.stopPropagation()}
                                className="inline-flex items-center justify-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 flex-1 transition-colors"
                              >
                                <Phone className="size-3" /> Call Hotel
                              </a>
                            )}
                            <Button
                              size="sm"
                              className="flex-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setEnquiryModalItem({ ...r, resultType: "room", roomId: r.id });
                                setEnquiryForm({
                                  name: user?.full_name || "",
                                  email: user?.email || "",
                                  phone: user?.phone || "",
                                  message: `Hi, I would like to check availability and book "${r.title || r.name}". Please confirm tariff and dates.`,
                                  preferredDate: "",
                                  preferredTime: "",
                                });
                              }}
                            >
                              Book / Enquire
                            </Button>
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {totalFilteredCount === 0 && (
                <div className="text-center py-16 space-y-3 bg-slate-50 border border-slate-200 rounded-2xl p-8">
                  <Search className="size-10 text-slate-400 mx-auto" />
                  <h3 className="text-base font-bold text-slate-900">No matching listings found</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    Try searching for a different keyword or relaxing your category or city filters.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      setCity("");
                      setLocality("");
                      setPostalCode("");
                      setSelectedBusinessCategoryId(null);
                      setSelectedCategoryId(null);
                      setSelectedCategoryName("");
                      setSelectedCategorySlug("");
                      setSelectedSubcategoryId(null);
                      setSelectedSubcategoryName("");
                      setSelectedSubcategorySlug("");
                      setSortBy("featured");
                      setProductNameSearch("");
                      setSelectedBrand("all");
                      setActiveType("all");
                      setRadius("no_radius");
                      setMinRating(0);
                      setVerifiedOnly(false);
                      syncUrlParams({ type: "all", city: "", category: null, subcategory: null, q: "", brand: "all" });
                    }}
                    className="text-xs font-semibold cursor-pointer border-slate-300 text-slate-700 hover:bg-slate-100"
                  >
                    Reset All Filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Filters Sidebar (Desktop Only) */}
        <aside className="hidden lg:block lg:col-span-4 xl:col-span-3">
          {renderFiltersContent(false)}
        </aside>
      </div>

      {/* Mobile Sticky Floating Filter Button */}
      <div className={cn(
        "fixed right-4 z-40 lg:hidden transition-all duration-300",
        mobileCartCount > 0 ? "bottom-20" : "bottom-6"
      )}>
        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="h-12 px-5 rounded-full bg-[#0070f3] hover:bg-blue-600 text-white font-bold text-xs shadow-2xl flex items-center gap-2 active:scale-95 transition-all cursor-pointer border-2 border-white/40 ring-4 ring-blue-500/20"
          title="Open Filters"
          aria-label="Open Filters"
        >
          <SlidersHorizontal className="size-4" />
          <span>Filters</span>
          {(selectedSubcategoryId || (activeType && activeType !== "all") || effectiveBusinessCategoryId || minRating > 0 || verifiedOnly) && (
            <span className="size-2 rounded-full bg-amber-300 ring-2 ring-blue-600 animate-pulse" />
          )}
        </button>
      </div>

      {/* Mobile Filters Modal Dialog */}
      <Dialog open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        <DialogContent className="w-[94vw] max-w-md max-h-[85vh] overflow-y-auto rounded-2xl p-5 border shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Filter Listings</DialogTitle>
            <DialogDescription>Filter listings by category, subcategory, rating, and verification</DialogDescription>
          </DialogHeader>
          {renderFiltersContent(true)}
        </DialogContent>
      </Dialog>

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
                      className={`size-6 ${star <= reviewForm.rating
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

function ExplorePageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <div className="space-y-3">
          <div className="h-4 w-48 bg-slate-200 animate-pulse rounded-md" />
          <div className="h-8 w-72 bg-slate-200 animate-pulse rounded-lg" />
          <div className="h-4 w-96 bg-slate-100 animate-pulse rounded-md" />
        </div>
        <div className="h-14 w-full bg-white rounded-2xl border border-slate-200 shadow-xs animate-pulse" />
        <div className="h-4 w-36 bg-slate-200 animate-pulse rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-2xl overflow-hidden h-72 animate-pulse" />
              ))}
            </div>
          </div>
          <div className="lg:col-span-4 xl:col-span-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 h-96 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CustomerExplorePage(props: CustomerExplorePageProps = {}) {
  return (
    <Suspense fallback={<ExplorePageSkeleton />}>
      <CustomerExplorePageContent {...props} />
    </Suspense>
  );
}

