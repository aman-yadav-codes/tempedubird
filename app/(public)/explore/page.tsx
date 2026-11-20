"use client";

import { useEffect, useState, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
} from "lucide-react";
import { useAuthStore, useCartStore } from "@/store";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buildBusinessSeoUrl, buildProfessionalSeoUrl, buildCourseSeoUrl, buildJobSeoUrl } from "@/lib/utils/seo-slug";
import { OrderCheckoutDialog, CheckoutItem } from "@/components/checkout/order-checkout-dialog";
import { CartDrawer } from "@/components/checkout/cart-drawer";
import { CartFloatingButton } from "@/components/checkout/cart-floating-button";
import { ServiceBookingDialog, BookingServiceItem } from "@/components/checkout/service-booking-dialog";
import { CompactProductCard } from "@/components/shared/compact-product-card";
import { CompactServiceCard } from "@/components/shared/compact-service-card";

interface DiscoveryItem {
  id: number;
  resultType: "business" | "professional" | "product" | "service" | "course" | "job";
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
}

function CustomerExplorePageContent() {
  const { user, accessToken } = useAuthStore();
  const searchParams = useSearchParams();
  const urlQ = searchParams.get("q") || searchParams.get("query") || searchParams.get("search") || "";
  const urlType = (searchParams.get("type") as any) || "all";
  const urlCountry = searchParams.get("country") || "";
  const urlCity = searchParams.get("city") || searchParams.get("location") || "";
  const urlCategory = searchParams.get("categoryId") ? Number(searchParams.get("categoryId")) : null;
  const urlCategoryName = searchParams.get("categoryName") || "";

  const urlBiz = searchParams.get("businessId") || searchParams.get("business_id");
  const activeBusinessId = urlBiz && /^\d+$/.test(urlBiz.trim()) ? Number(urlBiz.trim()) : null;

  const { location: userGlobalLocation, setLocation: setGlobalLocation } = useUserLocation();

  const [query, setQuery] = useState(urlQ);
  const [activeType, setActiveType] = useState<"all" | "business" | "service" | "product" | "professional" | "course" | "job">(
    urlCategory ? "all" : (["all", "business", "service", "product", "professional", "course", "job"].includes(urlType) ? urlType : "all")
  );
  const [country, setCountry] = useState<string>(urlCountry);
  const [city, setCity] = useState<string>(
    urlCity || (userGlobalLocation && userGlobalLocation !== "All Locations" ? userGlobalLocation : "")
  );
  const [locality, setLocality] = useState<string>("");
  const [postalCode, setPostalCode] = useState<string>("");

  // Cascading Category & Subcategory states
  const [categories, setCategories] = useState<Array<{ id: number; name: string; slug?: string; parent_id?: number | null }>>([]);
  const [subcategories, setSubcategories] = useState<Array<{ id: number; name: string; slug?: string }>>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(urlCategory);
  const [selectedCategoryName, setSelectedCategoryName] = useState<string>(urlCategoryName);
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState<number | null>(null);
  const [selectedSubcategoryName, setSelectedSubcategoryName] = useState<string>("");
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  // New filters matching FindMy search layout
  const [radius, setRadius] = useState<string>("no_radius");
  const [minRating, setMinRating] = useState<number>(0);
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);

  // Sync state if URL search parameters change
  useEffect(() => {
    if (urlQ) setQuery(urlQ);
    if (urlCategory) {
      // Check if urlCategory is a subcategory by querying API
      fetch(`/api/public/categories?id=${urlCategory}`)
        .then((r) => r.json())
        .then((json) => {
          const cat = json?.data;
          if (cat && cat.parent_id) {
            setSelectedCategoryId(Number(cat.parent_id));
            setSelectedSubcategoryId(Number(cat.id));
            setSelectedSubcategoryName(cat.name || "");
            if (cat.parent_name) setSelectedCategoryName(cat.parent_name);
          } else if (cat) {
            setSelectedCategoryId(Number(cat.id));
            setSelectedCategoryName(cat.name || urlCategoryName);
            setSelectedSubcategoryId(null);
            setSelectedSubcategoryName("");
          } else {
            setSelectedCategoryId(urlCategory);
            if (urlCategoryName) setSelectedCategoryName(urlCategoryName);
          }
        })
        .catch(() => {
          setSelectedCategoryId(urlCategory);
          if (urlCategoryName) setSelectedCategoryName(urlCategoryName);
        });
      setActiveType("all");
    } else if (urlType && ["all", "business", "service", "product", "professional", "course", "job"].includes(urlType)) {
      setActiveType(urlType);
    }
    if (urlCity) {
      setCity(urlCity);
    } else if (userGlobalLocation && userGlobalLocation !== "All Locations") {
      setCity(userGlobalLocation);
    } else if (userGlobalLocation === "All Locations") {
      setCity("");
    }
    if (urlCountry) setCountry(urlCountry);
  }, [urlQ, urlType, urlCity, urlCountry, urlCategory, urlCategoryName, userGlobalLocation]);

  // Results
  const [loading, setLoading] = useState(false);
  const [businesses, setBusinesses] = useState<DiscoveryItem[]>([]);
  const [professionals, setProfessionals] = useState<DiscoveryItem[]>([]);
  const [products, setProducts] = useState<DiscoveryItem[]>([]);
  const [services, setServices] = useState<DiscoveryItem[]>([]);
  const [courses, setCourses] = useState<DiscoveryItem[]>([]);
  const [jobs, setJobs] = useState<DiscoveryItem[]>([]);

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

  // Load categories dynamically based on selected Type
  useEffect(() => {
    let ignore = false;
    async function loadTypeCategories() {
      setLoadingCategories(true);
      try {
        const typeParam = activeType === "all" ? "" : `type=${activeType}&`;
        const bizParam = activeBusinessId ? `businessId=${activeBusinessId}&` : "";
        const res = await fetch(`/api/public/categories?${typeParam}${bizParam}onlyRoot=true&limit=300`);
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
  }, [activeType, activeBusinessId]);

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

  const totalFilteredCount =
    filteredBusinesses.length +
    filteredProfessionals.length +
    filteredProducts.length +
    filteredServices.length +
    filteredCourses.length +
    filteredJobs.length;

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
  const { addItem, updateQuantity, getItemQuantity } = useCartStore();
  const [cartMounted, setCartMounted] = useState(false);
  useEffect(() => {
    setCartMounted(true);
  }, []);
  const safeCartQty = (id: string | number) => (cartMounted ? getItemQuantity(id) : 0);

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
      .catch(() => {});
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

      const effectiveCatId = selectedSubcategoryId || selectedCategoryId;
      if (effectiveCatId) params.set("categoryId", String(effectiveCatId));

      const res = await fetch(`/api/public/discovery?${params.toString()}`);
      const data = await res.json();

      if (res.ok && data?.data) {
        setBusinesses(data.data.businesses || []);
        setProfessionals(data.data.professionals || []);
        setProducts(data.data.products || []);
        setServices(data.data.services || []);
        setCourses(data.data.courses || []);
        setJobs(data.data.jobs || []);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch discovery listings");
    } finally {
      setLoading(false);
    }
  }, [activeBusinessId, query, activeType, country, city, locality, postalCode, selectedCategoryId, selectedSubcategoryId]);

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
      const res = await fetch("/api/customer/enquiries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          businessId: enquiryModalItem.resultType === "business" ? enquiryModalItem.id : undefined,
          professionalId: enquiryModalItem.resultType === "professional" ? enquiryModalItem.id : undefined,
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

  return (
    <div className="min-h-screen bg-[#070e1c] text-slate-100 py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
      {/* 1. Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-400 flex-wrap">
        <Link href="/" className="hover:text-white transition-colors">Home</Link>
        <ChevronRight className="size-3 text-slate-600" />
        <button
          type="button"
          onClick={() => { setActiveType("all"); setSelectedCategoryId(null); setSelectedSubcategoryId(null); }}
          className="hover:text-white transition-colors capitalize cursor-pointer"
        >
          {activeType === "all" ? "Explore" : activeType === "business" ? "Businesses" : activeType === "service" ? "Services" : activeType === "product" ? "Products" : activeType === "professional" ? "Professionals" : activeType === "course" ? "Courses" : "Jobs"}
        </button>
        {city && (
          <>
            <ChevronRight className="size-3 text-slate-600" />
            <span className="text-slate-300">{city}</span>
          </>
        )}
        {(selectedCategoryName || selectedSubcategoryName) && (
          <>
            <ChevronRight className="size-3 text-slate-600" />
            <span className="text-amber-400 font-medium">{selectedSubcategoryName || selectedCategoryName}</span>
          </>
        )}
      </nav>

      {/* 2. Hero Headline Title & Subtitle */}
      <div className="space-y-1.5 pt-1">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight">
          {selectedSubcategoryName || selectedCategoryName || (activeType === "all" ? "Businesses & Services" : activeType.charAt(0).toUpperCase() + activeType.slice(1))}
          {city ? ` in ${city}` : ""}
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-3xl">
          Explore {selectedSubcategoryName || selectedCategoryName || "verified"} {activeType === "all" ? "businesses, services, and opportunities" : `${activeType}s`} in {city || "your area"}.
        </p>
      </div>

      {/* 3. Floating Glassmorphic Top Filter Bar */}
      <div className="bg-slate-900/85 border border-slate-700/60 shadow-2xl rounded-2xl p-2.5 backdrop-blur-xl flex flex-wrap items-center gap-2.5">
        {/* Keyword Search Input with Sparkle & Search Button */}
        <div className="relative flex-1 min-w-[220px]">
          <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-amber-400" />
          <input
            type="text"
            placeholder="Search all EduBird"
            value={productNameSearch}
            onChange={(e) => setProductNameSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') performSearch(); }}
            className="w-full h-11 pl-10 pr-10 bg-slate-950/70 border border-slate-800 rounded-xl text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-amber-400 transition-colors"
          />
          <button
            type="button"
            onClick={() => performSearch()}
            className="absolute right-2 top-1/2 -translate-y-1/2 size-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            title="Search"
          >
            <Search className="size-3.5" />
          </button>
        </div>

        {/* Location Dropdown Pill */}
        <div className="flex items-center gap-1.5 h-11 px-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs sm:text-sm text-slate-200 cursor-pointer hover:border-slate-700">
          <MapPin className="size-3.5 text-amber-400 shrink-0" />
          <select
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="bg-transparent text-xs sm:text-sm font-medium text-white focus:outline-none cursor-pointer pr-3 appearance-none"
          >
            <option value="" className="bg-slate-900 text-white">All Locations</option>
            {availableLocations.map((loc) => (
              <option key={loc.id} value={loc.name} className="bg-slate-900 text-white">
                {loc.name}
              </option>
            ))}
          </select>
          <ChevronDown className="size-3 text-slate-400 pointer-events-none" />
        </div>

        {/* Radius Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 hidden md:inline">Radius</span>
          <div className="flex items-center gap-1 h-11 px-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white">
            <select
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer appearance-none pr-3"
            >
              <option value="no_radius" className="bg-slate-900">No radius</option>
              <option value="5" className="bg-slate-900">5 km</option>
              <option value="10" className="bg-slate-900">10 km</option>
              <option value="25" className="bg-slate-900">25 km</option>
              <option value="50" className="bg-slate-900">50 km</option>
            </select>
            <ChevronDown className="size-3 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Rating Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 hidden md:inline">Rating</span>
          <div className="flex items-center gap-1 h-11 px-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white">
            <select
              value={minRating}
              onChange={(e) => setMinRating(Number(e.target.value))}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer appearance-none pr-3"
            >
              <option value="0" className="bg-slate-900">All</option>
              <option value="4.5" className="bg-slate-900">4.5+ ★</option>
              <option value="4.0" className="bg-slate-900">4.0+ ★</option>
              <option value="3.5" className="bg-slate-900">3.5+ ★</option>
            </select>
            <ChevronDown className="size-3 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Sort Pill */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 hidden md:inline">Sort</span>
          <div className="flex items-center gap-1 h-11 px-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-white">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer appearance-none pr-3"
            >
              <option value="featured" className="bg-slate-900">Name / Featured</option>
              <option value="name_asc" className="bg-slate-900">Name (A-Z)</option>
              <option value="name_desc" className="bg-slate-900">Name (Z-A)</option>
              <option value="rating_desc" className="bg-slate-900">Highest Rated</option>
              <option value="newest" className="bg-slate-900">Newest</option>
              <option value="price_asc" className="bg-slate-900">Price: Low to High</option>
              <option value="price_desc" className="bg-slate-900">Price: High to Low</option>
            </select>
            <ChevronDown className="size-3 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* 4. Results Count Label */}
      <div className="text-xs sm:text-sm font-semibold text-slate-400 pl-1">
        {totalFilteredCount} matching {activeType === "business" ? "businesses" : activeType === "service" ? "services" : activeType === "product" ? "products" : activeType === "course" ? "courses" : activeType === "job" ? "jobs" : "listings"}
      </div>

      {/* 5. Two-Column Layout: Grid on Left, Filters Sidebar on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Content Column */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-8">

      {/* Results Content */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-muted-foreground gap-3">
          <Loader2 className="size-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Finding matching listings...</span>
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

                  return (
                    <div
                      key={biz.id}
                      className="bg-slate-900/80 border border-slate-800 hover:border-slate-700/80 rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all flex flex-col justify-between group"
                    >
                      <div>
                        {/* Top Image Banner with Category Badge */}
                        <div className="relative h-44 w-full bg-slate-950 overflow-hidden">
                          <img
                            src={biz.cover_url || biz.logo_url || biz.default_image_url || "/images/hero-deer.jpg"}
                            alt={biz.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent pointer-events-none" />
                          <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md text-white text-[11px] font-semibold px-2.5 py-1 rounded-full border border-slate-700/80 shadow-md">
                            {biz.category_name || biz.business_type || "Business"}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleFavorite(biz)}
                            className={`absolute top-3 right-3 p-1.5 rounded-full backdrop-blur-md transition-colors cursor-pointer ${
                              isFavorited
                                ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                                : "bg-slate-950/60 text-slate-300 hover:text-rose-400 border border-slate-800"
                            }`}
                            title={isFavorited ? "Remove from favorites" : "Save to favorites"}
                          >
                            <Heart className={`size-4 ${isFavorited ? "fill-rose-400" : ""}`} />
                          </button>
                        </div>

                        {/* Body Info */}
                        <div className="p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <Link href={buildBusinessSeoUrl(biz)} className="flex-1 min-w-0">
                              <h3 className="text-base font-bold text-white group-hover:text-amber-400 transition-colors cursor-pointer truncate">
                                {biz.name}
                              </h3>
                            </Link>
                            {biz.is_verified && (
                              <Badge variant="outline" className="bg-emerald-950/60 text-emerald-400 border-emerald-800/80 text-[10px] px-1.5 py-0 shrink-0">
                                <ShieldCheck className="size-3 mr-0.5 text-emerald-400" /> Verified
                              </Badge>
                            )}
                          </div>

                          {/* Rating & Reviews */}
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <div className="flex items-center gap-1">
                              <Star className="size-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-bold text-white">{biz.avg_rating || "4.8"}</span>
                              <span className="text-slate-400">({biz.review_count || 12} reviews)</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-400 text-xs">
                              <MapPin className="size-3 text-amber-400 shrink-0" />
                              <span className="truncate max-w-[120px]">{biz.city || "Available"}</span>
                            </div>
                          </div>

                          {/* About snippet */}
                          {biz.about && (
                            <p className="text-slate-400 text-xs line-clamp-2">
                              {biz.about}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="p-4 pt-0 border-t border-slate-800/80 mt-2 flex flex-col gap-2">
                        <div className="grid grid-cols-4 gap-1.5 w-full pt-3">
                          {biz.phone ? (
                            <a
                              href={`tel:${biz.phone}`}
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-800 text-blue-400 hover:bg-slate-700 transition-colors"
                              title="Call Business"
                            >
                              <Phone className="size-4" />
                            </a>
                          ) : (
                            <span className="opacity-40 p-2 text-center text-slate-600"><Phone className="size-4 mx-auto" /></span>
                          )}

                          {whatsappClean ? (
                            <a
                              href={`https://wa.me/${whatsappClean}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-800 text-emerald-400 hover:bg-slate-700 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="size-4" />
                            </a>
                          ) : (
                            <span className="opacity-40 p-2 text-center text-slate-600"><MessageCircle className="size-4 mx-auto" /></span>
                          )}

                          {biz.email ? (
                            <a
                              href={`mailto:${biz.email}`}
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-800 text-purple-400 hover:bg-slate-700 transition-colors"
                              title="Send Email"
                            >
                              <Mail className="size-4" />
                            </a>
                          ) : (
                            <span className="opacity-40 p-2 text-center text-slate-600"><Mail className="size-4 mx-auto" /></span>
                          )}

                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-slate-800 text-amber-400 hover:bg-slate-700 transition-colors"
                            title="Directions on Map"
                          >
                            <Navigation className="size-4" />
                          </a>
                        </div>

                        <div className="flex items-center gap-2 w-full pt-1">
                          <Link href={buildBusinessSeoUrl(biz)} className="flex-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="w-full text-xs font-semibold gap-1.5 cursor-pointer border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white"
                            >
                              <Building2 className="size-3.5" /> Details
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            onClick={() => {
                              setEnquiryModalItem(biz);
                              setEnquiryForm((prev) => ({
                                ...prev,
                                name: user?.full_name || "",
                                email: user?.email || "",
                                phone: user?.phone || "",
                              }));
                            }}
                            className="flex-1 text-xs font-semibold gap-1.5 cursor-pointer bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold"
                          >
                            <Send className="size-3.5" /> Enquiry
                          </Button>
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProfessionals.map((pro) => {
                  const favKey = `professional-${pro.id}`;
                  const isFavorited = favorites.has(favKey);
                  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${pro.name} ${pro.city || ""}`)}`;
                  const whatsappClean = (pro.whatsapp || pro.phone || "").replace(/[^0-9]/g, "");

                  return (
                    <Card key={pro.id} className="rounded-2xl border shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                      <div>
                        <CardHeader className="pb-3 border-b bg-muted/10">
                          <div className="flex items-start justify-between gap-2">
<div className="flex items-start gap-3 min-w-0 flex-1">
                                {pro.avatar_url ? (
                                  <img
                                    src={pro.avatar_url}
                                    alt={pro.name}
                                    className="size-11 rounded-full object-cover border border-border shadow-2xs shrink-0"
                                  />
                                ) : (
                                  <div className="size-11 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-xs border border-primary/20">
                                    {pro.name.slice(0, 2).toUpperCase()}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <Link href={buildProfessionalSeoUrl(pro)}>
                                      <CardTitle className="text-base font-bold text-foreground hover:text-primary transition-colors cursor-pointer truncate">
                                        {pro.name}
                                      </CardTitle>
                                    </Link>
                                    {pro.is_verified && (
                                      <Badge variant="outline" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 text-[10px] px-1 py-0">
                                        <ShieldCheck className="size-3 mr-0.5 text-emerald-600" /> Verified
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground block mt-0.5 font-medium text-purple-600 dark:text-purple-400">
                                    {pro.profession_type} {pro.experience_years ? `• ${pro.experience_years} Years Experience` : ""}
                                  </span>
                                </div>
                              </div>

                            <button
                              onClick={() => handleToggleFavorite(pro)}
                              className={`p-1.5 rounded-full transition-all cursor-pointer ${
                                isFavorited ? "text-rose-600 bg-rose-50 dark:bg-rose-950/50" : "text-muted-foreground hover:text-rose-600"
                              }`}
                              title={isFavorited ? "Remove from favorites" : "Save to favorites"}
                            >
                              <Heart className={`size-4 ${isFavorited ? "fill-rose-600" : ""}`} />
                            </button>
                          </div>
                        </CardHeader>

                        <CardContent className="p-4 space-y-3 text-xs">
                          {/* Rating & Reviews */}
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1">
                              <Star className="size-3.5 fill-amber-400 text-amber-400" />
                              <span className="font-bold text-foreground">{pro.avg_rating || "New"}</span>
                              <span className="text-muted-foreground">({pro.review_count || 0} reviews)</span>
                            </div>
                            <button
                              onClick={() => setReviewModalItem(pro)}
                              className="text-primary hover:underline text-[11px] font-semibold cursor-pointer"
                            >
                              Write Review
                            </button>
                          </div>

                          {/* Address / Location */}
                          <div className="flex items-start gap-1.5 text-muted-foreground text-xs">
                            <MapPin className="size-3.5 shrink-0 mt-0.5 text-primary" />
                            <span>{[pro.locality, pro.city, pro.state].filter(Boolean).join(", ") || "City location available"}</span>
                          </div>

                          {/* About snippet */}
                          {pro.about && (
                            <p className="text-muted-foreground text-xs line-clamp-2 italic">
                              &quot;{pro.about}&quot;
                            </p>
                          )}
                        </CardContent>
                      </div>

                      {/* Action Buttons */}
                      <CardFooter className="p-4 pt-0 border-t border-border/40 bg-muted/5 flex flex-col gap-2 mt-2">
                        <div className="grid grid-cols-4 gap-1.5 w-full pt-3">
                          {pro.phone ? (
                            <a
                              href={`tel:${pro.phone}`}
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 transition-colors"
                              title="Call Professional"
                            >
                              <Phone className="size-4" />
                            </a>
                          ) : (
                            <span className="opacity-40 p-2 text-center text-muted-foreground"><Phone className="size-4 mx-auto" /></span>
                          )}

                          {whatsappClean ? (
                            <a
                              href={`https://wa.me/${whatsappClean}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950 dark:text-emerald-300 transition-colors"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="size-4" />
                            </a>
                          ) : (
                            <span className="opacity-40 p-2 text-center text-muted-foreground"><MessageCircle className="size-4 mx-auto" /></span>
                          )}

                          {pro.email ? (
                            <a
                              href={`mailto:${pro.email}`}
                              className="inline-flex items-center justify-center p-2 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 transition-colors"
                              title="Send Email"
                            >
                              <Mail className="size-4" />
                            </a>
                          ) : (
                            <span className="opacity-40 p-2 text-center text-muted-foreground"><Mail className="size-4 mx-auto" /></span>
                          )}

                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center justify-center p-2 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950 dark:text-amber-300 transition-colors"
                            title="Directions on Map"
                          >
                            <Navigation className="size-4" />
                          </a>
                        </div>

                        <div className="flex items-center gap-2 w-full pt-1">
                          <Link href={buildProfessionalSeoUrl(pro)} className="flex-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="w-full text-xs font-semibold gap-1.5 cursor-pointer"
                            >
                              <Briefcase className="size-3.5" /> View Profile
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                              setCheckoutItem({
                                id: pro.id,
                                name: `Consultation with ${pro.name}`,
                                type: "service",
                                provider_name: pro.name,
                                duration_minutes: 45,
                                suggested_price_inr: (pro as any).consultation_fee || 500,
                                institution_id: (pro as any).institution_profile_id || null,
                              });
                              setCheckoutOpen(true);
                            }}
                            className="flex-1 text-xs font-semibold gap-1.5 cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            <Calendar className="size-3.5" /> Book
                          </Button>
                          <button
                            onClick={() => setReportModalItem(pro)}
                            className="text-[11px] text-muted-foreground hover:text-destructive px-1.5 py-1 shrink-0"
                            title="Report listing"
                          >
                            Report
                          </button>
                        </div>
                      </CardFooter>
                    </Card>
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
          {(activeType === "all" || activeType === "service") && filteredServices.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Sparkles className="size-5 text-emerald-600" />
                Featured Services & Master Services ({filteredServices.length})
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
                {filteredCourses.map((c) => (
                  <Card key={c.id} className="rounded-2xl border shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden bg-card">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {c.category_name && (
                            <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 mb-1 bg-amber-50 text-amber-700 border-amber-200">
                              {c.category_name}
                            </Badge>
                          )}
                          <Link href={buildCourseSeoUrl(c)} className="hover:text-primary transition-colors cursor-pointer block">
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
                        <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                          <BookOpen className="size-4.5" />
                        </div>
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
                      <Link href={buildCourseSeoUrl(c)} className="flex-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs font-semibold"
                        >
                          View Details
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setEnquiryModalItem(c);
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
                ))}
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
                {filteredJobs.map((j) => (
                  <Card key={j.id} className="rounded-2xl border shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between overflow-hidden bg-card">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {j.department && (
                            <Badge variant="secondary" className="text-[10px] font-bold px-2 py-0.5 mb-1 bg-blue-50 text-blue-700 border-blue-200">
                              {j.department}
                            </Badge>
                          )}
                          <Link href={buildJobSeoUrl(j)} className="hover:text-primary transition-colors cursor-pointer block">
                            <h3 className="font-bold text-sm text-foreground leading-snug line-clamp-2">
                              {j.title || j.name}
                            </h3>
                          </Link>
                          {j.company_name && (
                            <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                              {j.company_name}
                            </p>
                          )}
                        </div>
                        <div className="size-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                          <Briefcase className="size-4.5" />
                        </div>
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
                      <Link href={buildJobSeoUrl(j)} className="flex-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full text-xs font-semibold"
                        >
                          View Details
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => {
                          setEnquiryModalItem(j);
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
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {totalFilteredCount === 0 && (
            <div className="text-center py-16 space-y-3 bg-slate-900/60 border border-slate-800 rounded-2xl p-8">
              <Search className="size-10 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-white">No matching listings found</h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
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
                  setSelectedCategoryId(null);
                  setSelectedCategoryName("");
                  setSelectedSubcategoryId(null);
                  setSelectedSubcategoryName("");
                  setSortBy("featured");
                  setProductNameSearch("");
                  setSelectedBrand("all");
                  setActiveType("all");
                  setRadius("no_radius");
                  setMinRating(0);
                  setVerifiedOnly(false);
                }}
                className="text-xs font-semibold cursor-pointer border-slate-700 text-slate-200 hover:bg-slate-800"
              >
                Reset All Filters
              </Button>
            </div>
          )}
        </div>
      )}
      </div>

      {/* Right Column: Filters Sidebar (Matching FindMy screenshot) */}
      <aside className="lg:col-span-4 xl:col-span-3">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md sticky top-24 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <SlidersHorizontal className="size-4 text-amber-400" />
              Filters
            </h2>
            <button
              type="button"
              onClick={() => {
                setProductNameSearch("");
                setActiveType("all");
                setSelectedCategoryId(null);
                setSelectedCategoryName("");
                setSelectedSubcategoryId(null);
                setSelectedSubcategoryName("");
                setSelectedBrand("all");
                setCity("");
                setRadius("no_radius");
                setMinRating(0);
                setVerifiedOnly(false);
                setSortBy("featured");
              }}
              className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              Clear all
            </button>
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Keywords</label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Search businesses..."
                value={productNameSearch}
                onChange={(e) => setProductNameSearch(e.target.value)}
                className="bg-slate-950/80 border-slate-800 text-white placeholder-slate-500 text-xs h-10 pr-8 rounded-xl"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-500 pointer-events-none" />
            </div>
          </div>

          {/* Category Filter */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">
              {activeType === "service" ? "Services category" : activeType === "course" ? "Course category" : "Category"}
            </label>
            <select
              value={selectedCategoryId || ""}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                setSelectedCategoryId(val);
                setSelectedSubcategoryId(null);
                setSelectedSubcategoryName("");
                if (val) {
                  const cat = categories.find((c) => c.id === val);
                  setSelectedCategoryName(cat ? cat.name : "");
                } else {
                  setSelectedCategoryName("");
                }
              }}
              className="w-full h-10 rounded-xl bg-slate-950/80 border border-slate-800 text-white text-xs px-3 focus:outline-none cursor-pointer"
            >
              <option value="">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory Filter (if category selected) */}
          {selectedCategoryId && subcategories.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Subcategory</label>
              <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => { setSelectedSubcategoryId(null); setSelectedSubcategoryName(""); }}
                  className={cn(
                    "w-full text-left text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center justify-between cursor-pointer",
                    !selectedSubcategoryId ? "bg-amber-400/20 text-amber-300 font-semibold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                  )}
                >
                  <span>All Subcategories</span>
                  <span className="text-[10px] text-slate-500">({subcategories.length})</span>
                </button>
                {subcategories.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => { setSelectedSubcategoryId(sub.id); setSelectedSubcategoryName(sub.name); }}
                    className={cn(
                      "w-full text-left text-xs px-3 py-1.5 rounded-lg transition-colors flex items-center justify-between cursor-pointer",
                      selectedSubcategoryId === sub.id ? "bg-amber-400/20 text-amber-300 font-semibold" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <span className="truncate">{sub.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Listing Type Filter */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300">Listing Type</label>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { id: "all", label: "All Types" },
                { id: "business", label: "Businesses" },
                { id: "service", label: "Services" },
                { id: "product", label: "Products" },
                { id: "professional", label: "Professionals" },
                { id: "course", label: "Courses" },
                { id: "job", label: "Jobs" },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveType(t.id as any)}
                  className={cn(
                    "text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all text-center truncate cursor-pointer",
                    activeType === t.id
                      ? "bg-amber-400 border-amber-400 text-slate-950 shadow-sm"
                      : "bg-slate-950/70 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Verified Only Toggle */}
          <div className="pt-2 border-t border-slate-800">
            <label className="flex items-center justify-between cursor-pointer text-xs text-slate-300">
              <span className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-emerald-400" />
                Verified Listings Only
              </span>
              <input
                type="checkbox"
                checked={verifiedOnly}
                onChange={(e) => setVerifiedOnly(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-amber-400 focus:ring-amber-400 size-4 cursor-pointer"
              />
            </label>
          </div>
        </div>
      </aside>
    </div>

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
                      className={`size-6 ${
                        star <= reviewForm.rating
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

export default function CustomerExplorePage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-16 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="size-4 animate-spin text-rose-600" />
          <span>Loading Discovery Directory...</span>
        </div>
      }
    >
      <CustomerExplorePageContent />
    </Suspense>
  );
}

