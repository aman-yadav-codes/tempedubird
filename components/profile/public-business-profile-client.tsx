"use client";

import React, { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Globe,
  MessageCircle,
  ShieldCheck,
  Star,
  Clock,
  Calendar,
  Send,
  Navigation,
  Package,
  Briefcase,
  Users,
  ExternalLink,
  CheckCircle2,
  Share2,
  Heart,
  ChevronRight,
  AlertCircle,
  Tag,
  Info,
  Camera,
  ZoomIn,
  Store,
  Sparkles,
  ShoppingCart,
  Plus,
  Minus,
  Search,
  X,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  Target,
  Compass,
  Award,
  GraduationCap,
  Wrench,
  Boxes,
  ArrowRight,
  Home,
  Car,
  Utensils,
  Bed,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OrderCheckoutDialog, type CheckoutItem } from "@/components/checkout/order-checkout-dialog";
import { CartDrawer } from "@/components/checkout/cart-drawer";
import { CartFloatingButton } from "@/components/checkout/cart-floating-button";
import { ServiceBookingDialog, type BookingServiceItem } from "@/components/checkout/service-booking-dialog";
import { UniversalFeedbackDialog } from "@/components/public/universal-feedback-dialog";
import { StorefrontProductCard } from "@/components/profile/storefront-product-card";
import { CompactProductCard } from "@/components/shared/compact-product-card";
import { CompactServiceCard } from "@/components/shared/compact-service-card";
import { useAuthStore, useCartStore } from "@/store";
import { isUserStoreOwner } from "@/lib/auth/store-ownership";

interface BusinessProfileClientProps {
  business: any;
  products: any[];
  services: any[];
  professionals: any[];
  reviews: any[];
  courses?: any[];
  jobs?: any[];
  packages?: any[];
  properties?: any[];
  vehicles?: any[];
  events?: any[];
  dishes?: any[];
  rooms?: any[];
  isHomePage?: boolean;
}

export function PublicBusinessProfileClient({
  business,
  products = [],
  services = [],
  professionals = [],
  reviews = [],
  courses = [],
  jobs = [],
  packages = [],
  properties = [],
  vehicles = [],
  events = [],
  dishes = [],
  rooms = [],
  isHomePage = false,
}: BusinessProfileClientProps) {
  const { user } = useAuthStore();
  const isOwner = useMemo(() => isUserStoreOwner(user, business), [user, business]);

  const searchParams = useSearchParams();
  const urlTab = searchParams?.get("tab") || "";
  const highlightParam = searchParams?.get("highlight") || searchParams?.get("productId") || searchParams?.get("serviceId") || "";
  const highlightId = highlightParam ? Number(highlightParam) : null;

  const [activeTab, setActiveTab] = useState<string>(() => {
    if (urlTab && ["overview", "about", "products", "packages", "services", "courses", "jobs", "team", "reviews", "gallery", "properties", "vehicles", "events", "dishes", "rooms"].includes(urlTab)) {
      return urlTab;
    }
    if (properties.length > 0 && products.length === 0 && services.length === 0) return "properties";
    if (vehicles.length > 0 && products.length === 0 && services.length === 0) return "vehicles";
    if (events.length > 0 && products.length === 0 && services.length === 0) return "events";
    if (dishes.length > 0 && products.length === 0 && services.length === 0) return "dishes";
    if (rooms.length > 0 && products.length === 0 && services.length === 0) return "rooms";
    return "overview";
  });

  const [platformPackages, setPlatformPackages] = useState<any[]>(packages);
  const [packageAudienceFilter, setPackageAudienceFilter] = useState<string>("all");

  useEffect(() => {
    if (!packages || packages.length === 0) {
      fetch("/api/public/packages")
        .then((res) => res.json())
        .then((json) => {
          if (json?.packages && Array.isArray(json.packages)) {
            setPlatformPackages(json.packages);
          }
        })
        .catch(() => undefined);
    } else {
      setPlatformPackages(packages);
    }
  }, [packages]);

  useEffect(() => {
    if (urlTab && ["overview", "about", "products", "packages", "services", "courses", "jobs", "team", "reviews", "gallery"].includes(urlTab)) {
      setActiveTab(urlTab);
    }
  }, [urlTab]);

  useEffect(() => {
    if (highlightId) {
      // Auto-expand category containing the highlighted product or service
      const matchingProduct = products.find((p) => p.id === highlightId);
      if (matchingProduct) {
        const cat = (matchingProduct.category_name || matchingProduct.category || "General").trim();
        setExpandedProductCategories((prev) => new Set([...prev, cat]));
      }
      const matchingService = services.find((s) => s.id === highlightId);
      if (matchingService) {
        const cat = (matchingService.category_name || "General").trim();
        setExpandedServiceCategories((prev) => new Set([...prev, cat]));
      }

      const timer = setTimeout(() => {
        const el = document.getElementById(`highlight-item-${highlightId}`) || document.getElementById(`highlight-preview-${highlightId}`);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [highlightId, activeTab, products, services]);

  const [checkoutItem, setCheckoutItem] = useState<CheckoutItem | null>(null);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [bookingDialogOpen, setBookingDialogOpen] = useState(false);
  const [selectedBookingService, setSelectedBookingService] = useState<BookingServiceItem | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [allReviewsOpen, setAllReviewsOpen] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [selectedGalleryImage, setSelectedGalleryImage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  // Live gallery media state (populated via props or client-side fetch fallback)
  const [liveGalleryMedia, setLiveGalleryMedia] = useState<Array<{
    id?: number | string;
    url: string;
    title?: string;
    description?: string;
    category?: string;
  }>>(business.gallery_media || []);

  useEffect(() => {
    if (business.gallery_media && business.gallery_media.length > 0) {
      setLiveGalleryMedia(business.gallery_media);
      return;
    }
    const targetInstId = (business.institution_profile_id && business.institution_profile_id > 0)
      ? business.institution_profile_id
      : (business.id && business.id > 0 ? business.id : null);
    if (!targetInstId) return;
    fetch(`/api/public/gallery?institutionId=${targetInstId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.gallery && Array.isArray(data.gallery) && data.gallery.length > 0) {
          setLiveGalleryMedia(data.gallery);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch public gallery media", err);
      });
  }, [business.gallery_media, business.institution_profile_id, business.id]);

  // Curated slide text for educational & commercial business showcase
  const curatedSlideCaptions = useMemo(() => [
    {
      title: "Excellence in Education & Professional Guidance",
      description: "Dedicated to student growth, state-of-the-art facilities, and comprehensive coaching across all programs.",
      category: "Academic Excellence",
    },
    {
      title: "Modern Classrooms & Collaborative Learning",
      description: "Interactive learning environments designed to foster innovation, conceptual clarity, and critical thinking.",
      category: "Campus Infrastructure",
    },
    {
      title: "Experienced Faculty & Individual Mentorship",
      description: "Learn from top-tier educators dedicated to personal attention and unlocking every student's full potential.",
      category: "Expert Faculty",
    },
    {
      title: "Proven Results & Competitive Preparation",
      description: "Comprehensive study materials, regular assessments, and structured roadmaps for entrance and board exams.",
      category: "Student Success",
    },
    {
      title: "Inspiring Learning Community & Environment",
      description: "A nurturing atmosphere where students build lifelong foundations for career and academic milestones.",
      category: "Campus Life",
    },
  ], []);

  // Formatted slider items
  const sliderItems = useMemo(() => {
    if (liveGalleryMedia.length > 0) {
      return liveGalleryMedia.map((m, idx) => {
        const fallback = curatedSlideCaptions[idx % curatedSlideCaptions.length];
        const isRawName =
          !m.title ||
          m.title.startsWith("WhatsApp Image") ||
          m.title.includes(".jp") ||
          m.title.includes(".png") ||
          m.title.toLowerCase().includes("showcase");
        return {
          id: m.id || idx,
          url: m.url,
          title: isRawName ? fallback.title : m.title,
          description:
            m.description && m.description.trim().length > 5
              ? m.description
              : fallback.description,
          category: m.category || fallback.category,
        };
      });
    }

    if (Array.isArray(business.gallery_images) && business.gallery_images.length > 0) {
      return business.gallery_images.filter(Boolean).map((imgUrl, idx) => {
        const fallback = curatedSlideCaptions[idx % curatedSlideCaptions.length];
        return {
          id: idx,
          url: imgUrl,
          title: fallback.title,
          description: fallback.description,
          category: fallback.category,
        };
      });
    }

    const gathered = [business.banner_url, business.logo_url].filter(Boolean) as string[];
    const list = gathered;
    if (list.length === 0) return [];

    return list.map((url, idx) => {
      const fallback = curatedSlideCaptions[idx % curatedSlideCaptions.length];
      return {
        id: idx,
        url,
        title: fallback.title,
        description: fallback.description,
        category: fallback.category,
      };
    });
  }, [liveGalleryMedia, business.gallery_images, business.banner_url, business.logo_url, curatedSlideCaptions]);

  // Gallery Images
  const galleryImages: string[] = useMemo(() => {
    return sliderItems.map((item) => item.url);
  }, [sliderItems]);

  // Home Page Top Gallery Slider State
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSliderPaused, setIsSliderPaused] = useState(false);

  // Founder Bio Preview & Modal State
  const [isFounderBioExpanded, setIsFounderBioExpanded] = useState(false);
  const [founderModalOpen, setFounderModalOpen] = useState(false);

  // Auto-advance Top Gallery Slider
  useEffect(() => {
    if (!isHomePage || sliderItems.length <= 1 || isSliderPaused) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderItems.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isHomePage, sliderItems.length, isSliderPaused]);

  // Product category filter & search state
  const [selectedProductCategory, setSelectedProductCategory] = useState<string>("all");
  const [productSearch, setProductSearch] = useState<string>("");

  // Service category filter & search state
  const [selectedServiceCategory, setSelectedServiceCategory] = useState<string>("all");
  const [serviceSearch, setServiceSearch] = useState<string>("");

  // Compute product categories with counts
  const productCategories = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const cat = (p.category_name || p.category || "General").trim();
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [products]);

  // Compute product brands with counts
  const productBrands = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const b = (p.brand || p.brand_name || "").trim();
      if (b && b.toLowerCase() !== "generic") {
        map.set(b, (map.get(b) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [products]);

  const [selectedProductBrand, setSelectedProductBrand] = useState("all");
  const [productSortBy, setProductSortBy] = useState("featured");

  // Filter products by search, category, brand, and sort
  const filteredProducts = useMemo(() => {
    let list = products.filter((p) => {
      const cat = (p.category_name || p.category || "General").trim();
      const matchesCategory =
        selectedProductCategory === "all" ||
        cat.toLowerCase() === selectedProductCategory.toLowerCase();
      if (!matchesCategory) return false;

      const brand = (p.brand || p.brand_name || "").trim();
      const matchesBrand =
        selectedProductBrand === "all" ||
        brand.toLowerCase() === selectedProductBrand.toLowerCase();
      if (!matchesBrand) return false;

      if (!productSearch.trim()) return true;
      const query = productSearch.toLowerCase();
      return (
        (p.name && p.name.toLowerCase().includes(query)) ||
        (p.title && p.title.toLowerCase().includes(query)) ||
        (p.brand && p.brand.toLowerCase().includes(query)) ||
        (p.brand_name && p.brand_name.toLowerCase().includes(query)) ||
        (p.sku && p.sku.toLowerCase().includes(query)) ||
        (p.description && p.description.toLowerCase().includes(query)) ||
        cat.toLowerCase().includes(query)
      );
    });

    if (productSortBy === "price_asc") {
      list.sort((a, b) => Number(a.price || a.regular_price || 0) - Number(b.price || b.regular_price || 0));
    } else if (productSortBy === "price_desc") {
      list.sort((a, b) => Number(b.price || b.regular_price || 0) - Number(a.price || a.regular_price || 0));
    } else if (productSortBy === "name_asc") {
      list.sort((a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || ""));
    } else if (productSortBy === "name_desc") {
      list.sort((a, b) => (b.name || b.title || "").localeCompare(a.name || a.title || ""));
    } else if (productSortBy === "newest") {
      list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }

    return list;
  }, [products, selectedProductCategory, selectedProductBrand, productSearch, productSortBy]);

  // Group filtered products by category for category-wise display
  const groupedProducts = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredProducts.forEach((p) => {
      const cat = (p.category_name || p.category || "General").trim();
      const list = map.get(cat) || [];
      list.push(p);
      map.set(cat, list);
    });
    return Array.from(map.entries()).map(([categoryName, items]) => ({
      categoryName,
      items,
    }));
  }, [filteredProducts]);

  // Compute service categories with counts
  const serviceCategories = useMemo(() => {
    const map = new Map<string, number>();
    services.forEach((s) => {
      const cat = (s.category_name || s.category || "General").trim();
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [services]);

  const [serviceSortBy, setServiceSortBy] = useState("featured");

  // Filter services by search, category, and sort
  const filteredServices = useMemo(() => {
    let list = services.filter((s) => {
      const cat = (s.category_name || s.category || "General").trim();
      const matchesCategory =
        selectedServiceCategory === "all" ||
        cat.toLowerCase() === selectedServiceCategory.toLowerCase();
      if (!matchesCategory) return false;

      if (!serviceSearch.trim()) return true;
      const query = serviceSearch.toLowerCase();
      return (
        (s.name && s.name.toLowerCase().includes(query)) ||
        (s.title && s.title.toLowerCase().includes(query)) ||
        (s.description && s.description.toLowerCase().includes(query)) ||
        cat.toLowerCase().includes(query)
      );
    });

    if (serviceSortBy === "price_asc") {
      list.sort((a, b) => Number(a.price || a.regular_price || 0) - Number(b.price || b.regular_price || 0));
    } else if (serviceSortBy === "price_desc") {
      list.sort((a, b) => Number(b.price || b.regular_price || 0) - Number(a.price || a.regular_price || 0));
    } else if (serviceSortBy === "name_asc") {
      list.sort((a, b) => (a.name || a.title || "").localeCompare(b.name || b.title || ""));
    } else if (serviceSortBy === "name_desc") {
      list.sort((a, b) => (b.name || b.title || "").localeCompare(a.name || a.title || ""));
    } else if (serviceSortBy === "newest") {
      list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }

    return list;
  }, [services, selectedServiceCategory, serviceSearch, serviceSortBy]);

  // Group filtered services by category
  const groupedServices = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredServices.forEach((s) => {
      const cat = (s.category_name || s.category || "General").trim();
      const list = map.get(cat) || [];
      list.push(s);
      map.set(cat, list);
    });
    return Array.from(map.entries()).map(([categoryName, items]) => ({
      categoryName,
      items,
    }));
  }, [filteredServices]);

  // Accordion open/collapse states for all 4 verticals
  const [expandedProductCategories, setExpandedProductCategories] = useState<Set<string>>(() => new Set());
  const [expandedServiceCategories, setExpandedServiceCategories] = useState<Set<string>>(() => new Set());
  const [expandedCourseCategories, setExpandedCourseCategories] = useState<Set<string>>(() => new Set());
  const [expandedJobCategories, setExpandedJobCategories] = useState<Set<string>>(() => new Set());

  const toggleProductCategory = (catName: string) => {
    setExpandedProductCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catName)) next.delete(catName);
      else next.add(catName);
      return next;
    });
  };

  const toggleServiceCategory = (catName: string) => {
    setExpandedServiceCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catName)) next.delete(catName);
      else next.add(catName);
      return next;
    });
  };

  const toggleCourseCategory = (catName: string) => {
    setExpandedCourseCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catName)) next.delete(catName);
      else next.add(catName);
      return next;
    });
  };

  const toggleJobCategory = (catName: string) => {
    setExpandedJobCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catName)) next.delete(catName);
      else next.add(catName);
      return next;
    });
  };

  // Courses state & filtering
  const [courseSearch, setCourseSearch] = useState("");
  const [selectedCourseCategory, setSelectedCourseCategory] = useState("all");
  const [courseSortBy, setCourseSortBy] = useState("featured");

  const courseCategories = useMemo(() => {
    const map = new Map<string, number>();
    courses.forEach((c) => {
      const cat = (c.category_name || c.authority_type || "Academic & Certification").trim();
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [courses]);

  const filteredCourses = useMemo(() => {
    let list = courses.filter((c) => {
      const cat = (c.category_name || c.authority_type || "Academic & Certification").trim();
      const matchesCategory =
        selectedCourseCategory === "all" ||
        cat.toLowerCase() === selectedCourseCategory.toLowerCase();
      if (!matchesCategory) return false;

      if (!courseSearch.trim()) return true;
      const q = courseSearch.toLowerCase();
      return (
        (c.name && c.name.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.code && c.code.toLowerCase().includes(q)) ||
        cat.toLowerCase().includes(q)
      );
    });

    if (courseSortBy === "name_asc") {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (courseSortBy === "name_desc") {
      list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
    } else if (courseSortBy === "newest") {
      list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }
    return list;
  }, [courses, selectedCourseCategory, courseSearch, courseSortBy]);

  const groupedCourses = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredCourses.forEach((c) => {
      const cat = (c.category_name || c.authority_type || "Academic & Certification").trim();
      const list = map.get(cat) || [];
      list.push(c);
      map.set(cat, list);
    });
    return Array.from(map.entries()).map(([categoryName, items]) => ({
      categoryName,
      items,
    }));
  }, [filteredCourses]);

  // Jobs state & filtering
  const [jobSearch, setJobSearch] = useState("");
  const [selectedJobCategory, setSelectedJobCategory] = useState("all");
  const [jobSortBy, setJobSortBy] = useState("featured");

  const jobCategories = useMemo(() => {
    const map = new Map<string, number>();
    jobs.forEach((j) => {
      const cat = (j.department || j.category_name || "Store Operations").trim();
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [jobs]);

  const filteredJobs = useMemo(() => {
    let list = jobs.filter((j) => {
      const cat = (j.department || j.category_name || "Store Operations").trim();
      const matchesCategory =
        selectedJobCategory === "all" ||
        cat.toLowerCase() === selectedJobCategory.toLowerCase();
      if (!matchesCategory) return false;

      if (!jobSearch.trim()) return true;
      const q = jobSearch.toLowerCase();
      return (
        (j.title && j.title.toLowerCase().includes(q)) ||
        (j.description && j.description.toLowerCase().includes(q)) ||
        (j.location && j.location.toLowerCase().includes(q)) ||
        cat.toLowerCase().includes(q)
      );
    });

    if (jobSortBy === "name_asc") {
      list.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else if (jobSortBy === "name_desc") {
      list.sort((a, b) => (b.title || "").localeCompare(a.title || ""));
    } else if (jobSortBy === "newest") {
      list.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    }
    return list;
  }, [jobs, selectedJobCategory, jobSearch, jobSortBy]);

  const groupedJobs = useMemo(() => {
    const map = new Map<string, any[]>();
    filteredJobs.forEach((j) => {
      const cat = (j.department || j.category_name || "Store Operations").trim();
      const list = map.get(cat) || [];
      list.push(j);
      map.set(cat, list);
    });
    return Array.from(map.entries()).map(([categoryName, items]) => ({
      categoryName,
      items,
    }));
  }, [filteredJobs]);

  // Cart store actions
  const { addItem, updateQuantity, getItemQuantity, toggleCart, getTotalCount } = useCartStore();
  const [cartMounted, setCartMounted] = useState(false);
  useEffect(() => {
    setCartMounted(true);
  }, []);
  const safeCartQty = (id: string | number) => (cartMounted ? getItemQuantity(id) : 0);
  const totalCartCount = cartMounted ? getTotalCount() : 0;

  // Enquiry form state
  const [enquiryForm, setEnquiryForm] = useState({
    name: user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    message: "",
  });
  const [enquirySubmitting, setEnquirySubmitting] = useState(false);

  const bannerImg =
    business.banner_url ||
    "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1400&q=80";
  const logoImg = business.logo_url;

  const fullAddress = [business.address, business.locality, business.city, business.state, business.postal_code]
    .filter(Boolean)
    .join(", ");
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${business.name} ${fullAddress}`
  )}`;
  const cleanPhone = (business.phone || "").replace(/[^0-9]/g, "");
  const cleanWhatsapp = (business.whatsapp || business.phone || "").replace(/[^0-9]/g, "");

  // Local state for dynamically submitted reviews
  const [submittedReviews, setSubmittedReviews] = useState<any[]>([]);

  // Combined full reviews list: submitted reviews + DB reviews
  const allReviews = useMemo(() => {
    const base = Array.isArray(reviews) ? reviews : [];
    return [...submittedReviews, ...base];
  }, [reviews, submittedReviews]);

  const reviewCount = allReviews.length;
  const avgRating = useMemo(() => {
    if (allReviews.length === 0) return "0.0";
    const sum = allReviews.reduce((acc, r) => acc + Number(r.rating || 5), 0);
    return (sum / allReviews.length).toFixed(1);
  }, [allReviews]);

  const latestReviews = useMemo(() => {
    return allReviews.slice(0, 3);
  }, [allReviews]);

  function handleShare() {
    if (navigator.share) {
      navigator
        .share({
          title: business.name,
          text: `Check out ${business.name} on our marketplace!`,
          url: window.location.href,
        })
        .catch(() => undefined);
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Profile link copied to clipboard!");
    }
  }

  function handleOrderProduct(prod: any) {
    const itemPrice = Number(prod.discounted_price || prod.regular_price || prod.suggested_price || prod.price || 0);
    setCheckoutItem({
      id: prod.id,
      name: prod.name,
      type: "product",
      price: itemPrice,
      sale_price: prod.discounted_price ? Number(prod.discounted_price) : undefined,
      suggested_price_inr: itemPrice,
      seller_info: {
        id: business.id,
        name: business.name,
        city: business.city,
        state: business.state,
      },
    });
    setCheckoutOpen(true);
  }

  function handleBookService(srv: any) {
    if (isOwner) {
      toast.error("You cannot book appointments on your own business storefront.");
      return;
    }
    const itemPrice = Number(srv.discounted_price || srv.regular_price || srv.suggested_price || srv.price || 0);

    const openBooking = () => {
      setSelectedBookingService({
        id: srv.id,
        name: srv.name,
        price: itemPrice,
        regular_price: srv.regular_price ? Number(srv.regular_price) : null,
        pricing_model: srv.pricing_model || "Appointment",
        estimated_duration: srv.estimated_duration,
        service_location: srv.service_location || "In-Person & Online",
        default_image_url: srv.default_image_url,
        provider_name: business.name,
        provider_address: fullAddress,
        business_id: business.id,
        institution_id: business.institution_profile_id,
      });
      setBookingDialogOpen(true);
    };

    const { items, promptConflict } = useCartStore.getState();
    if (items.length > 0) {
      const firstItem = items[0];
      const curType = firstItem.item_type || "product";
      const sameStore =
        (firstItem.business_id && Number(firstItem.business_id) === Number(business.id)) ||
        (firstItem.business_name && firstItem.business_name.toLowerCase() === business.name.toLowerCase());

      if (curType === "product" || !sameStore) {
        promptConflict({
          currentStoreName: firstItem.business_name || firstItem.brand || "previous store",
          newStoreName: business.name,
          currentType: curType,
          newType: "service",
          reason: curType === "product" && !sameStore ? "both" : curType === "product" ? "type" : "store",
          onConfirm: () => {
            openBooking();
          },
        });
        return;
      }
    }

    openBooking();
  }

  async function handleSendEnquiry(e: React.FormEvent) {
    e.preventDefault();
    if (!enquiryForm.name || !enquiryForm.phone) {
      toast.error("Please provide your name and phone number");
      return;
    }
    setEnquirySubmitting(true);
    try {
      const res = await fetch("/api/customer/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessId: business.id,
          name: enquiryForm.name,
          email: enquiryForm.email,
          phone: enquiryForm.phone,
          message: enquiryForm.message,
        }),
      });
      if (!res.ok) throw new Error("Failed to send enquiry");
      toast.success("Your enquiry has been sent to the business owner!");
      setEnquiryOpen(false);
      setEnquiryForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      toast.success("Enquiry received! The business owner will contact you shortly.");
      setEnquiryOpen(false);
    } finally {
      setEnquirySubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* ================= HERO HEADER & COVER BANNER ================= */}
      {!isHomePage && (
      <div className="relative w-full h-56 sm:h-72 md:h-84 bg-muted overflow-hidden">
        <Image
          src={bannerImg}
          alt={business.name}
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-black/20" />

        {/* Top Floating Actions */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={handleShare}
            className="rounded-full shadow-md bg-background/80 backdrop-blur-md hover:bg-background h-8 px-3 text-xs gap-1.5"
          >
            <Share2 className="size-3.5" />
            <span className="hidden sm:inline">Share</span>
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setIsSaved(!isSaved);
              toast.success(isSaved ? "Removed from saved" : "Saved to your favorites!");
            }}
            className={`rounded-full shadow-md bg-background/80 backdrop-blur-md hover:bg-background h-8 px-3 text-xs gap-1.5 ${isSaved ? "text-rose-600" : ""
              }`}
          >
            <Heart className={`size-3.5 ${isSaved ? "fill-rose-600" : ""}`} />
            <span className="hidden sm:inline">{isSaved ? "Saved" : "Save"}</span>
          </Button>
        </div>
      </div>
      )}

      {/* ================= HOME PAGE TOP GALLERY BANNER ================= */}
      {isHomePage && sliderItems.length > 0 && (
        <div className="w-full bg-linear-to-b from-background via-muted/20 to-background pt-3 pb-3 sm:pt-4 sm:pb-5 px-3 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <div
              className="relative w-full h-[360px] sm:h-[440px] md:h-[500px] lg:h-[540px] rounded-2xl sm:rounded-3xl overflow-hidden border border-border/70 shadow-2xl bg-black group select-none"
              onMouseEnter={() => setIsSliderPaused(true)}
              onMouseLeave={() => setIsSliderPaused(false)}
            >
              {/* Slider Images with Smooth Fade & Ken-Burns Zoom */}
              {sliderItems.map((item, idx) => {
                const isActive = idx === currentSlide;
                return (
                  <div
                    key={item.id ?? idx}
                    className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                      isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                    }`}
                  >
                    <Image
                      src={item.url}
                      alt={item.title || `${business.name} showcase`}
                      fill
                      priority={idx === 0}
                      sizes="(max-width: 1280px) 100vw, 1400px"
                      className={`object-cover transition-transform duration-7000 ease-out cursor-pointer ${
                        isActive ? "scale-105" : "scale-100"
                      }`}
                      onClick={() => setSelectedGalleryImage(item.url)}
                    />
                  </div>
                );
              })}

              {/* Gradient Overlays for Supreme Readability and Depth */}
              <div className="absolute inset-0 z-10 bg-linear-to-t from-black/95 via-black/50 to-black/20 pointer-events-none" />
              <div className="absolute inset-0 z-10 bg-linear-to-r from-black/85 via-black/30 to-transparent pointer-events-none" />

              {/* Top Bar: Badges & Photo Counter */}
              <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 z-20 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-2 pointer-events-auto">
                  <Badge className="bg-black/60 backdrop-blur-md text-white border-white/20 px-3 py-1.5 text-xs font-semibold shadow-md flex items-center gap-1.5">
                    <Sparkles className="size-3.5 text-amber-400 animate-pulse" />
                    <span>Featured Gallery</span>
                  </Badge>
                  {sliderItems[currentSlide]?.category && (
                    <Badge variant="secondary" className="bg-white/20 backdrop-blur-md text-white border-white/20 px-2.5 py-1 text-xs font-medium hidden sm:inline-flex">
                      {sliderItems[currentSlide].category}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2 pointer-events-auto">
                  <Badge className="bg-black/60 backdrop-blur-md text-white border-white/20 px-3 py-1.5 text-xs font-semibold shadow-md flex items-center gap-1.5">
                    <Camera className="size-3.5 text-sky-400" />
                    <span>{currentSlide + 1} / {sliderItems.length}</span>
                  </Badge>
                </div>
              </div>

              {/* Prev / Next Navigation Arrows */}
              {sliderItems.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide((prev) => (prev - 1 + sliderItems.length) % sliderItems.length);
                    }}
                    className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 size-10 sm:size-12 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 flex items-center justify-center opacity-80 sm:opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110 cursor-pointer"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="size-6" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCurrentSlide((prev) => (prev + 1) % sliderItems.length);
                    }}
                    className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 size-10 sm:size-12 rounded-full bg-black/40 hover:bg-black/80 text-white backdrop-blur-md border border-white/20 flex items-center justify-center opacity-80 sm:opacity-0 group-hover:opacity-100 transition-all shadow-xl hover:scale-110 cursor-pointer"
                    aria-label="Next image"
                  >
                    <ChevronRight className="size-6" />
                  </button>
                </>
              )}

              {/* Bottom Content Area */}
              <div className="absolute bottom-4 sm:bottom-6 left-4 sm:left-8 right-4 sm:right-8 z-20 space-y-3 sm:space-y-4">
                <div className="space-y-1.5 sm:space-y-2 max-w-3xl">
                  <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                    <span className="inline-block size-2 rounded-full bg-rose-500 animate-ping" />
                    <span className="uppercase tracking-widest">{business.name}</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-black text-white tracking-tight drop-shadow-lg leading-tight">
                    {sliderItems[currentSlide]?.title || business.name}
                  </h2>
                  <p className="text-xs sm:text-sm md:text-base text-white/90 line-clamp-2 font-medium drop-shadow-md max-w-2xl leading-relaxed">
                    {sliderItems[currentSlide]?.description || business.custom_description || business.about || "Quality education, comprehensive academic coaching, and career guidance."}
                  </p>
                </div>

                {/* Quick Action Buttons & Pagination Dots */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <Link
                      href="/products"
                      className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm shadow-lg transition-transform hover:scale-105"
                    >
                      <Package className="size-4" />
                      <span>Explore Products</span>
                    </Link>

                    <Link
                      href="/gallery"
                      className="inline-flex items-center gap-1.5 h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/30 font-bold text-xs sm:text-sm shadow-md transition-transform hover:scale-105"
                    >
                      <Camera className="size-4" />
                      <span>View Gallery</span>
                    </Link>

                    <Link
                      href="/contact"
                      className="hidden sm:inline-flex items-center gap-1.5 h-9 sm:h-10 px-4 sm:px-5 rounded-xl bg-black/40 hover:bg-black/60 text-white backdrop-blur-md border border-white/20 font-bold text-xs sm:text-sm shadow-md transition-transform hover:scale-105"
                    >
                      <Mail className="size-4" />
                      <span>Contact Us</span>
                    </Link>
                  </div>

                  {/* Indicator Dots */}
                  {sliderItems.length > 1 && (
                    <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-md">
                      {sliderItems.map((_, dotIdx) => (
                        <button
                          key={dotIdx}
                          type="button"
                          onClick={() => setCurrentSlide(dotIdx)}
                          className={`transition-all duration-300 rounded-full cursor-pointer ${
                            dotIdx === currentSlide
                              ? "w-7 h-2.5 bg-primary shadow-sm"
                              : "size-2.5 bg-white/40 hover:bg-white/80"
                          }`}
                          aria-label={`Go to slide ${dotIdx + 1}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= PROFILE INFO BAR ================= */}
      <div className={`max-w-6xl mx-auto px-4 sm:px-6 relative z-20 ${isHomePage ? "pt-4 sm:pt-6" : "-mt-16 sm:-mt-20"}`}>
        {!isHomePage && (
          <div className="bg-card rounded-2xl border shadow-xl p-5 sm:p-7">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            {/* Left: Avatar/Logo & Details */}
            <div className="flex flex-col sm:flex-row items-start gap-5">
              {/* Logo / Icon */}
              <div className="relative size-20 sm:size-24 rounded-2xl bg-card border-2 border-background shadow-md overflow-hidden shrink-0 flex items-center justify-center">
                {logoImg ? (
                  <Image src={logoImg} alt={business.name} fill sizes="96px" className="object-cover" />
                ) : (
                  <div className="w-full h-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black text-2xl">
                    <Building2 className="size-10" />
                  </div>
                )}
              </div>

              {/* Title & Metadata */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                    {business.name}
                  </h1>
                  {business.is_verified && (
                    <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 text-xs py-0.5">
                      <ShieldCheck className="size-3.5" />
                      <span>Verified Business</span>
                    </Badge>
                  )}
                  {business.is_featured && (
                    <Badge className="bg-amber-500 hover:bg-amber-600 text-white text-xs py-0.5">
                      Featured
                    </Badge>
                  )}
                </div>

                {/* Subtitle / Categories */}
                <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {business.category_name || business.business_type || "Commercial Business"}
                  </span>
                  {business.subcategory_name && (
                    <>
                      <span>•</span>
                      <Badge variant="secondary" className="text-[11px] font-medium">
                        {business.subcategory_name}
                      </Badge>
                    </>
                  )}
                  {business.established_year && (
                    <>
                      <span>•</span>
                      <span>Est. {business.established_year}</span>
                    </>
                  )}
                </div>

                {/* Location */}
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors pt-1 group"
                  title="View on Google Maps"
                >
                  <MapPin className="size-3.5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="hover:underline">{fullAddress || "Address provided upon enquiry"}</span>
                </a>

                {/* Ratings */}
                {reviewCount > 0 ? (
                  <div className="flex items-center gap-2 pt-1 text-xs">
                    <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold px-2 py-0.5 rounded-md border border-amber-200/80">
                      <Star className="size-3.5 fill-amber-500 text-amber-500" />
                      <span>{avgRating}</span>
                    </div>
                    <span className="text-muted-foreground">({reviewCount} customer reviews)</span>
                    <button
                      type="button"
                      onClick={() => setFeedbackOpen(true)}
                      className="text-primary hover:underline font-semibold ml-2 cursor-pointer"
                    >
                      Write a Review
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 pt-1 text-xs">
                    <span className="text-muted-foreground">No customer reviews yet</span>
                    <button
                      type="button"
                      onClick={() => setFeedbackOpen(true)}
                      className="text-primary hover:underline font-semibold ml-1 cursor-pointer"
                    >
                      Write a Review
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-2.5 shrink-0 pt-2 md:pt-0">
              <Button
                type="button"
                onClick={() => setEnquiryOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md gap-2 cursor-pointer text-xs h-10 px-4"
              >
                <Send className="size-4" />
                <span>Send Enquiry</span>
              </Button>

              <a
                href={mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 h-10 px-3.5 rounded-xl border bg-background hover:bg-muted text-foreground shadow-xs text-xs font-bold transition-colors cursor-pointer"
                title="Get Directions on Google Maps"
              >
                <Navigation className="size-4 text-primary" />
                <span>Directions</span>
              </a>

              <div className="flex items-center gap-2">
                {cleanWhatsapp && (
                  <a
                    href={`https://wa.me/${cleanWhatsapp}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center size-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs transition-colors"
                    title="Chat on WhatsApp"
                  >
                    <MessageCircle className="size-5" />
                  </a>
                )}
                {business.phone && (
                  <a
                    href={`tel:${business.phone}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center size-10 rounded-xl bg-muted hover:bg-muted/80 text-foreground border shadow-xs transition-colors"
                    title="Call Phone"
                  >
                    <Phone className="size-4" />
                  </a>
                )}
                {business.email && (
                  <a
                    href={`mailto:${business.email}`}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center size-10 rounded-xl bg-muted hover:bg-muted/80 text-foreground border shadow-xs transition-colors"
                    title="Send Email"
                  >
                    <Mail className="size-4" />
                  </a>
                )}
                {business.website && (
                  <a
                    href={business.website.startsWith("http") ? business.website : `https://${business.website}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 sm:flex-none inline-flex items-center justify-center size-10 rounded-xl bg-muted hover:bg-muted/80 text-foreground border shadow-xs transition-colors"
                    title="Visit Official Website"
                  >
                    <Globe className="size-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Storefront Owner Notice Banner */}
        {!isHomePage && isOwner && (
          <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start sm:items-center gap-3">
              <div className="size-9 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                <ShieldCheck className="size-5" />
              </div>
              <div className="text-xs">
                <div className="font-extrabold text-foreground flex items-center gap-1.5">
                  <span>Storefront Owner Preview Mode</span>
                  <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/30 font-bold">
                    Your Business
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-0.5">
                  You are viewing your own public storefront. Purchasing products and booking appointments on your own store is restricted for store owners.
                </p>
              </div>
            </div>
            <Link
              href="/admin/my-profile"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-xs transition-colors shrink-0"
            >
              Manage Store Profile
            </Link>
          </div>
        )}

        {/* ================= TABS & CONTENT SECTIONS ================= */}
        <div className={cn(isHomePage ? "mt-0" : "mt-8", totalCartCount > 0 ? "pb-32 sm:pb-24" : "pb-24 sm:pb-8")}>
          <Tabs value={isHomePage ? "overview" : activeTab} onValueChange={setActiveTab} className="w-full">
            {!isHomePage && (
              <div className="relative w-full my-1">
                {/* Modern Horizontal Sliding Tabs Bar */}
                <div className="relative w-full overflow-hidden">
                  <div className="overflow-x-auto no-scrollbar scroll-smooth touch-pan-x py-1 px-0.5">
                    <TabsList className="inline-flex flex-nowrap items-center justify-start gap-1.5 sm:gap-2 bg-slate-100/90 dark:bg-slate-800/90 border border-slate-200/90 dark:border-slate-700/80 p-1.5 rounded-2xl h-auto shadow-2xs w-max min-w-full">
                      <TabsTrigger value="overview" className="shrink-0 rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer gap-2 whitespace-nowrap data-[state=active]:bg-[#0070f3] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all">
                        <Building2 className="size-4 shrink-0" />
                        <span>Overview</span>
                      </TabsTrigger>
                      {properties.length > 0 && (
                        <TabsTrigger value="properties" className="shrink-0 rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer gap-2 whitespace-nowrap data-[state=active]:bg-[#0070f3] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all">
                          <Home className="size-4 shrink-0" />
                          <span>Properties ({properties.length})</span>
                        </TabsTrigger>
                      )}
                      {vehicles.length > 0 && (
                        <TabsTrigger value="vehicles" className="shrink-0 rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer gap-2 whitespace-nowrap data-[state=active]:bg-[#0070f3] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all">
                          <Car className="size-4 shrink-0" />
                          <span>Vehicles ({vehicles.length})</span>
                        </TabsTrigger>
                      )}
                      {events.length > 0 && (
                        <TabsTrigger value="events" className="shrink-0 rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer gap-2 whitespace-nowrap data-[state=active]:bg-[#0070f3] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all">
                          <CalendarDays className="size-4 shrink-0" />
                          <span>Events ({events.length})</span>
                        </TabsTrigger>
                      )}
                      {dishes.length > 0 && (
                        <TabsTrigger value="dishes" className="shrink-0 rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer gap-2 whitespace-nowrap data-[state=active]:bg-[#0070f3] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all">
                          <Utensils className="size-4 shrink-0" />
                          <span>Dishes &amp; Menu ({dishes.length})</span>
                        </TabsTrigger>
                      )}
                      {rooms.length > 0 && (
                        <TabsTrigger value="rooms" className="shrink-0 rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer gap-2 whitespace-nowrap data-[state=active]:bg-[#0070f3] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all">
                          <Bed className="size-4 shrink-0" />
                          <span>Rooms &amp; Stays ({rooms.length})</span>
                        </TabsTrigger>
                      )}
                      {products.length > 0 && (
                        <TabsTrigger value="products" className="shrink-0 rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer gap-2 whitespace-nowrap data-[state=active]:bg-[#0070f3] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all">
                          <Package className="size-4 shrink-0" />
                          <span>Products ({products.length})</span>
                        </TabsTrigger>
                      )}
                      {services.length > 0 && (
                        <TabsTrigger value="services" className="shrink-0 rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer gap-2 whitespace-nowrap data-[state=active]:bg-[#0070f3] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all">
                          <Wrench className="size-4 shrink-0" />
                          <span>Services ({services.length})</span>
                        </TabsTrigger>
                      )}
                      {courses.length > 0 && (
                        <TabsTrigger value="courses" className="shrink-0 rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer gap-2 whitespace-nowrap data-[state=active]:bg-[#0070f3] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all">
                          <GraduationCap className="size-4 shrink-0" />
                          <span>Courses ({courses.length})</span>
                        </TabsTrigger>
                      )}
                      {jobs.length > 0 && (
                        <TabsTrigger value="jobs" className="shrink-0 rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer gap-2 whitespace-nowrap data-[state=active]:bg-[#0070f3] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all">
                          <Briefcase className="size-4 shrink-0" />
                          <span>Jobs ({jobs.length})</span>
                        </TabsTrigger>
                      )}
                      <TabsTrigger value="team" className="shrink-0 rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer gap-2 whitespace-nowrap data-[state=active]:bg-[#0070f3] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all">
                        <Users className="size-4 shrink-0" />
                        <span>Team ({professionals.length})</span>
                      </TabsTrigger>
                      <TabsTrigger value="about" className="shrink-0 rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer gap-2 whitespace-nowrap data-[state=active]:bg-[#0070f3] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all">
                        <Info className="size-4 shrink-0" />
                        <span>About</span>
                      </TabsTrigger>
                      {galleryImages.length > 0 && (
                        <TabsTrigger value="gallery" className="shrink-0 rounded-xl text-xs font-bold py-2.5 px-4 cursor-pointer gap-2 whitespace-nowrap data-[state=active]:bg-[#0070f3] data-[state=active]:text-white data-[state=active]:shadow-xs transition-all">
                          <Camera className="size-4 shrink-0" />
                          <span>Photo Gallery ({galleryImages.length})</span>
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </div>
                </div>
              </div>
            )}

            {/* ================= OVERVIEW TAB ================= */}
            <TabsContent value="overview" className={isHomePage ? "mt-0 space-y-6" : "mt-6 space-y-6"}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: About & Gallery */}
                <div className="lg:col-span-2 space-y-6">
                  {/* About Card */}
                  <Card className="rounded-2xl border shadow-xs">
                    <CardHeader>
                      <CardTitle className="text-base font-bold">About {business.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                      {business.about ? (
                        <p className="whitespace-pre-line">{business.about}</p>
                      ) : (
                        <p className="italic text-muted-foreground">
                          Welcome to {business.name}. We provide quality products, trusted professional solutions, and reliable customer satisfaction.
                        </p>
                      )}

                      {/* Featured Highlights */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t">
                        {business.business_type && (
                          <div className="p-3 rounded-xl bg-muted/40 border">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Business Type
                            </span>
                            <span className="text-xs font-bold text-foreground mt-0.5 block">
                              {business.business_type}
                            </span>
                          </div>
                        )}
                        {business.established_year ? (
                          <div className="p-3 rounded-xl bg-muted/40 border">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Established
                            </span>
                            <span className="text-xs font-bold text-foreground mt-0.5 block">
                              Year {business.established_year}
                            </span>
                          </div>
                        ) : null}
                        <div className="p-3 rounded-xl bg-muted/40 border">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                            Verification
                          </span>
                          {business.is_verified ? (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block flex items-center gap-1">
                              <ShieldCheck className="size-3.5" /> Verified
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5 block flex items-center gap-1">
                              <AlertCircle className="size-3.5" /> Pending Verification
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Products Preview */}
                  {products.length > 0 && (
                    <Card className="rounded-2xl border shadow-xs">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold">Products Offered</CardTitle>
                          <CardDescription className="text-xs">
                            Top products available from this business
                          </CardDescription>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("products")}
                          className="text-xs font-bold text-primary gap-1 cursor-pointer"
                        >
                          View All ({products.length})
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {products.slice(0, 4).map((p) => (
                            <CompactProductCard
                              key={p.id}
                              product={p}
                              business={business}
                              isHighlighted={highlightId === p.id}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Services Preview */}
                  {services.length > 0 && (
                    <Card className="rounded-2xl border shadow-xs">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold">Services & Solutions</CardTitle>
                          <CardDescription className="text-xs">
                            Professional services offered by this business
                          </CardDescription>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("services")}
                          className="text-xs font-bold text-primary gap-1 cursor-pointer"
                        >
                          View All ({services.length})
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {services.slice(0, 4).map((s) => (
                            <CompactServiceCard
                              key={s.id}
                              service={s}
                              business={business}
                              isHighlighted={highlightId === s.id}
                              onBook={handleBookService}
                            />
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Courses Preview */}
                  {courses.length > 0 && (
                    <Card className="rounded-2xl border shadow-xs">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold flex items-center gap-2">
                            <GraduationCap className="size-4 text-amber-500" />
                            <span>Courses & Programs</span>
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Academic, certification, and training courses
                          </CardDescription>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("courses")}
                          className="text-xs font-bold text-primary gap-1 cursor-pointer"
                        >
                          View All ({courses.length})
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {courses.slice(0, 4).map((c) => (
                            <Card key={c.id} className="p-3.5 rounded-xl border bg-card hover:border-amber-500/40 transition-all flex flex-col justify-between">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-bold">
                                    {c.authority_type || "Accredited"}
                                  </Badge>
                                  <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                    <Clock className="size-3" />
                                    {c.duration_value || 1} {c.duration_unit?.replace("_", " ") || "Year"}
                                  </span>
                                </div>
                                <h4 className="font-bold text-xs text-foreground line-clamp-1">{c.name}</h4>
                                <p className="text-[11px] text-muted-foreground line-clamp-2">{c.description || "Comprehensive syllabus and hands-on training."}</p>
                              </div>
                              <div className="pt-2 mt-2 border-t flex items-center justify-between text-xs">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">{c.seats_available || 60} Seats</span>
                                <Button size="sm" variant="ghost" asChild className="h-6 px-2 text-[11px] font-bold text-primary">
                                  <Link href={`/courses/${c.slug || c.id}`}>Details &rarr;</Link>
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Jobs Preview */}
                  {jobs.length > 0 && (
                    <Card className="rounded-2xl border shadow-xs">
                      <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                          <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Briefcase className="size-4 text-primary" />
                            <span>Job Openings</span>
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Active recruitment drives and staff vacancies
                          </CardDescription>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("jobs")}
                          className="text-xs font-bold text-primary gap-1 cursor-pointer"
                        >
                          View All ({jobs.length})
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          {jobs.slice(0, 4).map((j) => (
                            <Card key={j.id} className="p-3.5 rounded-xl border bg-card hover:border-primary/40 transition-all flex flex-col justify-between">
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <Badge variant="outline" className="text-[10px] font-bold text-primary">
                                    {j.department || "Staff Position"}
                                  </Badge>
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">{j.employment_type || "Full-time"}</span>
                                </div>
                                <h4 className="font-bold text-xs text-foreground line-clamp-1">{j.title}</h4>
                                <p className="text-[11px] text-muted-foreground line-clamp-2">{j.description || "Career opportunities and job responsibilities."}</p>
                              </div>
                              <div className="pt-2 mt-2 border-t flex items-center justify-between text-xs">
                                <span className="text-muted-foreground text-[11px] truncate max-w-[120px]">{j.location || "Campus"}</span>
                                <Button size="sm" variant="ghost" onClick={() => setActiveTab("jobs")} className="h-6 px-2 text-[11px] font-bold text-primary cursor-pointer">
                                  Apply &rarr;
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Gallery Images Preview */}
                  {galleryImages.length > 0 && (
                    <Card className="rounded-2xl border shadow-xs">
                      <CardHeader className="flex flex-row items-center justify-between pb-3">
                        <div>
                          <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Camera className="size-4 text-primary" />
                            <span>Photo Gallery</span>
                          </CardTitle>
                          <CardDescription className="text-xs">
                            Workplace, office, and portfolio photos
                          </CardDescription>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab("gallery")}
                          className="text-xs font-bold text-primary gap-1 cursor-pointer"
                        >
                          View All ({galleryImages.length})
                          <ChevronRight className="size-3.5" />
                        </Button>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {galleryImages.slice(0, 4).map((imgUrl: string, idx: number) => (
                            <div
                              key={idx}
                              onClick={() => setSelectedGalleryImage(imgUrl)}
                              className="relative aspect-square rounded-xl overflow-hidden border bg-muted group cursor-pointer shadow-xs hover:shadow-md transition-all"
                            >
                              <Image
                                src={imgUrl}
                                alt={`${business.name} gallery image ${idx + 1}`}
                                fill
                                sizes="(max-width: 768px) 50vw, 25vw"
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                                View Photo
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* ================= MISSION, VISION & STRATEGIC GOALS ================= */}
                  {(() => {
                    const missionText = business.mission?.trim() || "";
                    const visionText = business.vision?.trim() || "";
                    const goalText = (business.goal?.trim() || business.strategic_goals?.trim() || "");

                    if (!missionText && !visionText && !goalText) return null;

                    const parsedGoals = goalText
                      ? goalText
                          .split("\n")
                          .map((g: string) => g.trim())
                          .filter(Boolean)
                          .map((goalLine: string, idx: number) => {
                            const colonIdx = goalLine.indexOf(":");
                            const title = colonIdx > -1 ? goalLine.slice(0, colonIdx).trim() : `Goal ${idx + 1}`;
                            const desc = colonIdx > -1 ? goalLine.slice(colonIdx + 1).trim() : goalLine;
                            return { title, desc };
                          })
                      : [];

                    return (
                      <div className="space-y-4 pt-1">
                        <div className="flex items-center justify-between pb-2 border-b border-border/60">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
                                Core Principles
                              </Badge>
                              <span className="text-xs text-muted-foreground font-medium hidden sm:inline">• Values & Philosophy</span>
                            </div>
                            <h3 className="text-lg font-black text-foreground tracking-tight mt-1">
                              Our Mission, Vision & Strategic Goals
                            </h3>
                          </div>
                        </div>

                        {(missionText || visionText) && (
                          <div className={`grid grid-cols-1 ${missionText && visionText ? "md:grid-cols-2" : ""} gap-4`}>
                            {/* 1. Mission Card */}
                            {missionText && (
                              <Card className="rounded-2xl border shadow-xs overflow-hidden border-blue-200/80 dark:border-blue-900/50 bg-gradient-to-br from-blue-50/60 via-card to-card dark:from-blue-950/20 hover:shadow-md transition-all flex flex-col justify-between">
                                <div>
                                  <CardHeader className="pb-3 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between space-y-0">
                                    <div className="flex items-center gap-2.5">
                                      <div className="size-9 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center shadow-xs">
                                        <Target className="size-5" />
                                      </div>
                                      <div>
                                        <CardTitle className="text-sm font-bold text-foreground">Our Mission</CardTitle>
                                        <CardDescription className="text-[11px]">Core purpose & daily commitment</CardDescription>
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="p-4 space-y-3">
                                    <blockquote className="border-l-3 border-blue-600 pl-3 py-1 italic text-xs leading-relaxed text-foreground/90 whitespace-pre-line bg-blue-50/30 dark:bg-blue-950/20 rounded-r-lg">
                                      &ldquo;{missionText}&rdquo;
                                    </blockquote>
                                  </CardContent>
                                </div>
                                <div className="p-4 pt-0">
                                  <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40">
                                    <span className="flex items-center gap-1 text-blue-600 font-semibold">
                                      <CheckCircle2 className="size-3.5" /> Purpose-driven
                                    </span>
                                    <span className="font-medium text-foreground">{business.name}</span>
                                  </div>
                                </div>
                              </Card>
                            )}

                            {/* 2. Vision Card */}
                            {visionText && (
                              <Card className="rounded-2xl border shadow-xs overflow-hidden border-purple-200/80 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/60 via-card to-card dark:from-purple-950/20 hover:shadow-md transition-all flex flex-col justify-between">
                                <div>
                                  <CardHeader className="pb-3 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between space-y-0">
                                    <div className="flex items-center gap-2.5">
                                      <div className="size-9 rounded-xl bg-purple-600/10 text-purple-600 flex items-center justify-center shadow-xs">
                                        <Compass className="size-5" />
                                      </div>
                                      <div>
                                        <CardTitle className="text-sm font-bold text-foreground">Our Vision</CardTitle>
                                        <CardDescription className="text-[11px]">Future horizon & long-term impact</CardDescription>
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="p-4 space-y-3">
                                    <blockquote className="border-l-3 border-purple-600 pl-3 py-1 italic text-xs leading-relaxed text-foreground/90 whitespace-pre-line bg-purple-50/30 dark:bg-purple-950/20 rounded-r-lg">
                                      &ldquo;{visionText}&rdquo;
                                    </blockquote>
                                  </CardContent>
                                </div>
                                <div className="p-4 pt-0">
                                  <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40">
                                    <span className="flex items-center gap-1 text-purple-600 font-semibold">
                                      <CheckCircle2 className="size-3.5" /> Future-focused
                                    </span>
                                    <span className="font-medium text-foreground">{business.name}</span>
                                  </div>
                                </div>
                              </Card>
                            )}
                          </div>
                        )}

                        {/* 3. Strategic Goals Card */}
                        {goalText && (
                          <Card className="rounded-2xl border shadow-xs overflow-hidden border-amber-200/80 dark:border-amber-900/50 bg-gradient-to-br from-amber-50/40 via-card to-card dark:from-amber-950/20 hover:shadow-md transition-all">
                            <CardHeader className="pb-3 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between space-y-0">
                              <div className="flex items-center gap-2.5">
                                <div className="size-9 rounded-xl bg-amber-600/10 text-amber-600 flex items-center justify-center shadow-xs">
                                  <Award className="size-5" />
                                </div>
                                <div>
                                  <CardTitle className="text-sm font-bold text-foreground">Our Strategic Goals & Milestones</CardTitle>
                                  <CardDescription className="text-[11px]">Actionable benchmarks and goals</CardDescription>
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3">
                              {parsedGoals.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {parsedGoals.map((g, idx) => (
                                    <div key={idx} className="p-3 rounded-xl bg-card border border-border/60 shadow-2xs space-y-1">
                                      <div className="flex items-center gap-1.5 text-amber-600 font-bold text-xs">
                                        <Sparkles className="size-3.5 shrink-0" />
                                        <span className="truncate">{g.title}</span>
                                      </div>
                                      <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3">
                                        {g.desc}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <blockquote className="border-l-3 border-amber-600 pl-3 py-1 italic text-xs leading-relaxed text-foreground/90 whitespace-pre-line bg-amber-50/30 dark:bg-amber-950/20 rounded-r-lg">
                                  &ldquo;{goalText}&rdquo;
                                </blockquote>
                              )}

                              <div className="pt-2 flex items-center justify-between text-[11px] text-muted-foreground border-t border-border/40">
                                <span className="flex items-center gap-1 text-amber-600 font-semibold">
                                  <CheckCircle2 className="size-3.5" /> Active Strategy
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Right 1 Col: Reviews & Business Hours */}
                <div className="space-y-6">
                  {/* Latest Customer Reviews Card (Only if reviews exist) */}
                  {allReviews.length > 0 && (
                    <Card className="rounded-2xl border shadow-xs">
                      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-base font-bold flex items-center gap-2">
                          <Star className="size-4 text-amber-500 fill-amber-500" />
                          <span>Latest Reviews</span>
                        </CardTitle>
                        <Badge variant="outline" className="text-[11px] font-bold text-amber-600 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60 flex items-center gap-1">
                          <Star className="size-3 fill-amber-500 text-amber-500" />
                          {avgRating} ({reviewCount})
                        </Badge>
                      </CardHeader>
                      <CardContent className="space-y-3 text-xs">
                        {latestReviews.map((rev: any, idx: number) => (
                          <div key={rev.id || idx} className="py-2 border-b last:border-b-0 border-border/50 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-foreground truncate max-w-[140px]">
                                {rev.user_name || rev.title || "Verified Customer"}
                              </span>
                              <div className="flex items-center gap-0.5 text-amber-500">
                                {Array.from({ length: Math.max(0, Math.min(5, Math.round(Number(rev.rating) || 5))) }).map((_, i) => (
                                  <Star key={i} className="size-3 fill-amber-500 text-amber-500" />
                                ))}
                              </div>
                            </div>
                            <p className="text-muted-foreground line-clamp-2 text-[11px] leading-relaxed">
                              "{rev.review || rev.comment || "Great experience and highly professional service."}"
                            </p>
                          </div>
                        ))}

                        <div className="pt-1 flex items-center justify-between gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setAllReviewsOpen(true)}
                            className="text-xs font-bold text-primary hover:underline p-0 h-auto cursor-pointer"
                          >
                            View all reviews ({reviewCount}) &rarr;
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setFeedbackOpen(true)}
                            className="h-7 text-[11px] px-2.5 font-semibold cursor-pointer"
                          >
                            Write a Review
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Operating Hours Card (Only if opening_hours provided) */}
                  {(() => {
                    if (!business.opening_hours || typeof business.opening_hours !== "object") return null;
                    const dayOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
                    const dayMap = new Map<string, any>();
                    Object.entries(business.opening_hours).forEach(([d, val]) => {
                      const key = d.toLowerCase();
                      if (dayOrder.includes(key) && !dayMap.has(key)) {
                        dayMap.set(key, val);
                      }
                    });
                    if (dayMap.size === 0) return null;
                    const entries = Array.from(dayMap.entries()).sort(([a], [b]) => dayOrder.indexOf(a) - dayOrder.indexOf(b));

                    return (
                      <Card className="rounded-2xl border shadow-xs">
                        <CardHeader>
                          <CardTitle className="text-base font-bold flex items-center gap-2">
                            <Clock className="size-4 text-primary" />
                            <span>Business Hours</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 text-xs">
                          {entries.map(([day, hrs]) => {
                            const isClosed = typeof hrs === "object" ? Boolean(hrs?.is_closed || hrs?.isClosed) : String(hrs).toLowerCase().includes("closed");
                            const timeText = typeof hrs === "string"
                              ? hrs
                              : isClosed
                              ? "Closed"
                              : `${hrs?.open || "09:00 AM"} – ${hrs?.close || "07:00 PM"}`;
                            return (
                              <div key={day} className="flex items-center justify-between py-1.5 border-b last:border-b-0 border-border/50">
                                <span className="font-semibold capitalize text-foreground">{day}</span>
                                <span className={isClosed ? "text-rose-500 font-bold" : "text-muted-foreground font-medium"}>
                                  {timeText}
                                </span>
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    );
                  })()}

                  {/* Owner / Leadership Details Card (Only if founder/owner info provided) */}
                  {Boolean(business.founder_name || business.owner_name || business.founder_about || business.owner_about || business.founder_image_url || business.owner_image_url) && (
                    <Card className="rounded-2xl border shadow-xs overflow-hidden">
                      <CardHeader className="pb-3 border-b border-border/50 bg-muted/20">
                        <CardTitle className="text-base font-bold flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <Users className="size-4 text-primary" />
                            <span>Business Owner / Leadership</span>
                          </span>
                          {business.is_verified && (
                            <Badge variant="outline" className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                              Verified
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <div className="flex items-center gap-3.5">
                          {(() => {
                            const resolvedOwnerImg =
                              business.owner_image_url ||
                              business.founder_image_url ||
                              null;
                            return (
                              <div className="relative size-14 rounded-full overflow-hidden border-2 border-primary/20 shrink-0 bg-muted group">
                                {resolvedOwnerImg ? (
                                  <Image
                                    src={resolvedOwnerImg}
                                    alt={business.owner_name || business.founder_name || business.name || "Owner"}
                                    fill
                                    unoptimized
                                    sizes="56px"
                                    className="object-cover group-hover:scale-105 transition-transform"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-lg">
                                    {(business.owner_name || business.founder_name || business.name || "O").charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          <div className="min-w-0 flex-1">
                            <h4 className="text-sm font-bold text-foreground truncate">
                              {business.owner_name || business.founder_name || "Business Owner"}
                            </h4>
                            {(business.owner_designation || business.founder_title) && (
                              <p className="text-xs font-medium text-muted-foreground truncate">
                                {business.owner_designation || business.founder_title}
                              </p>
                            )}
                            {business.name && (
                              <p className="text-[11px] text-muted-foreground/80 truncate">
                                {business.name}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Founder Bio preview with see more */}
                        {Boolean(business.owner_about || business.founder_about) && (
                          <div className="pt-2 border-t border-border/50 text-xs text-muted-foreground">
                            <p className={isFounderBioExpanded ? "whitespace-pre-line leading-relaxed text-foreground/90" : "line-clamp-3 leading-relaxed"}>
                              {business.owner_about || business.founder_about}
                            </p>
                            <div className="mt-2 flex items-center justify-between">
                              <button
                                type="button"
                                onClick={() => setIsFounderBioExpanded(!isFounderBioExpanded)}
                                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                {isFounderBioExpanded ? (
                                  <>
                                    <span>See less</span>
                                    <ChevronUp className="size-3" />
                                  </>
                                ) : (
                                  <>
                                    <span>See more</span>
                                    <ChevronDown className="size-3" />
                                  </>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => setFounderModalOpen(true)}
                                className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 cursor-pointer"
                              >
                                <span>Full story</span>
                                <ExternalLink className="size-3" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Quick Contact & Action Buttons */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/50">
                          {/* Call / Phone */}
                          {Boolean(business.owner_phone || business.phone) ? (
                            <a
                              href={`tel:${business.owner_phone || business.phone}`}
                              className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-muted/40 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all border border-border/50 group text-center cursor-pointer"
                              title={`Call ${business.owner_phone || business.phone}`}
                            >
                              <Phone className="size-4 text-primary group-hover:scale-110 transition-transform mb-1" />
                              <span className="text-[11px] font-semibold text-foreground">Call</span>
                            </a>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-muted/20 text-muted-foreground/40 border border-border/20 text-center">
                              <Phone className="size-4 mb-1" />
                              <span className="text-[11px] font-semibold">Call</span>
                            </div>
                          )}

                          {/* WhatsApp */}
                          {Boolean((business.owner_whatsapp || business.whatsapp || business.owner_phone || business.phone)?.replace(/[^0-9]/g, "")) ? (
                            <a
                              href={`https://wa.me/${(business.owner_whatsapp || business.whatsapp || business.owner_phone || business.phone).replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 transition-all border border-emerald-500/20 group text-center cursor-pointer"
                              title="Chat on WhatsApp"
                            >
                              <MessageCircle className="size-4 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform mb-1" />
                              <span className="text-[11px] font-semibold">WhatsApp</span>
                            </a>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-muted/20 text-muted-foreground/40 border border-border/20 text-center">
                              <MessageCircle className="size-4 mb-1" />
                              <span className="text-[11px] font-semibold">WhatsApp</span>
                            </div>
                          )}

                          {/* Email */}
                          {Boolean(business.owner_email || business.email) ? (
                            <a
                              href={`mailto:${business.owner_email || business.email}`}
                              className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-muted/40 hover:bg-primary/10 hover:text-primary text-muted-foreground transition-all border border-border/50 group text-center cursor-pointer"
                              title={`Email ${business.owner_email || business.email}`}
                            >
                              <Mail className="size-4 text-primary group-hover:scale-110 transition-transform mb-1" />
                              <span className="text-[11px] font-semibold text-foreground">Email</span>
                            </a>
                          ) : (
                            <div className="flex flex-col items-center justify-center py-2.5 px-2 rounded-xl bg-muted/20 text-muted-foreground/40 border border-border/20 text-center">
                              <Mail className="size-4 mb-1" />
                              <span className="text-[11px] font-semibold">Email</span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* ================= PROPERTIES TAB ================= */}
            <TabsContent value="properties" className="mt-6 space-y-6">
              {properties.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                  <Home className="size-10 mx-auto text-muted-foreground opacity-40" />
                  <h3 className="text-sm font-bold text-foreground">No Real Estate Properties Listed Yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    This real estate agency has not published any commercial or residential property listings yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Home className="size-5 text-indigo-600" />
                        <span>Exclusive Property Listings</span>
                        <Badge variant="secondary" className="text-xs font-bold">
                          {properties.length} Available
                        </Badge>
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Verified residential apartments, commercial plots, and luxury villas in {business.city || "Varanasi"}.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {properties.map((p: any) => {
                      const price = Number(p.price || p.details?.price || 0);
                      const bedrooms = p.bedrooms || p.details?.bedrooms || p.bhk;
                      const area = p.carpet_area || p.super_builtup_area || p.area_sqft || p.details?.carpet_area;
                      const propType = p.property_type || p.details?.property_type || p.category_name || "Real Estate";
                      const img = p.image_url || p.featured_image || "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&auto=format&fit=crop&q=80";
                      const propertyUrl = `/properties/${p.slug || p.id}`;

                      return (
                        <Card key={p.id} className="rounded-2xl overflow-hidden border shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between">
                          <div>
                            <Link href={propertyUrl} className="block cursor-pointer">
                              <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                                <img
                                  src={img}
                                  alt={p.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                                  <Badge className="bg-primary/90 text-primary-foreground text-[10px] font-bold backdrop-blur-xs">
                                    {propType}
                                  </Badge>
                                  {p.status === "published" && (
                                    <Badge className="bg-emerald-600/90 text-white text-[10px] font-semibold">
                                      Verified
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </Link>
                            <CardHeader className="p-4 pb-2">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
                                  ₹{price > 0 ? price.toLocaleString("en-IN") : "Price on Request"}
                                </span>
                              </div>
                              <Link href={propertyUrl} className="block cursor-pointer">
                                <CardTitle className="text-sm font-bold line-clamp-1 group-hover:text-primary transition-colors">
                                  {p.title}
                                </CardTitle>
                              </Link>
                              <CardDescription className="text-xs flex items-center gap-1 line-clamp-1 mt-1">
                                <MapPin className="size-3 shrink-0 text-muted-foreground" />
                                <span>{p.address || p.locality || business.address || `${business.city}, Uttar Pradesh`}</span>
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="px-4 py-2">
                              <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl bg-muted/40 border">
                                <div>
                                  <span className="text-muted-foreground block text-[10px]">Configuration</span>
                                  <span className="font-semibold text-foreground">{bedrooms ? `${bedrooms} BHK` : "Standard"}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-[10px]">Super Area</span>
                                  <span className="font-semibold text-foreground">{area ? `${area} sq.ft` : "Plot/Custom"}</span>
                                </div>
                              </div>
                            </CardContent>
                          </div>
                          <CardFooter className="p-4 pt-1 flex items-center gap-2">
                            <Link href={propertyUrl} className="flex-1">
                              <Button size="sm" variant="outline" className="w-full text-xs font-bold cursor-pointer">
                                View Details
                              </Button>
                            </Link>
                            {business.phone ? (
                              <Button
                                size="sm"
                                className="flex-1 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 cursor-pointer"
                                onClick={() => window.open(`tel:${business.phone}`, "_self")}
                              >
                                <Phone className="size-3.5" />
                                <span>Contact Agent</span>
                              </Button>
                            ) : null}
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ================= VEHICLES TAB ================= */}
            <TabsContent value="vehicles" className="mt-6 space-y-6">
              {vehicles.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                  <Car className="size-10 mx-auto text-muted-foreground opacity-40" />
                  <h3 className="text-sm font-bold text-foreground">No Vehicles Listed Yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    This automobile dealership has not published any motor vehicles or fleets yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Car className="size-5 text-rose-600" />
                        <span>Automobile & Mobility Inventory</span>
                        <Badge variant="secondary" className="text-xs font-bold">
                          {vehicles.length} Vehicles
                        </Badge>
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Brand new and verified pre-owned vehicles, electric scooters, and commercial transport.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehicles.map((v: any) => {
                      const price = Number(v.price || v.details?.price || 0);
                      const make = v.make || v.brand || v.details?.make || "";
                      const model = v.model || v.details?.model || "";
                      const year = v.year || v.details?.year || "";
                      const fuel = v.fuel_type || v.details?.fuel_type || "Petrol/EV";
                      const transmission = v.transmission || v.details?.transmission || "Automatic";
                      const img = v.image_url || v.featured_image || "https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=600&auto=format&fit=crop&q=80";
                      const vehicleUrl = `/vehicles/${v.slug || v.id}`;

                      return (
                        <Card key={v.id} className="rounded-2xl overflow-hidden border shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between">
                          <div>
                            <Link href={vehicleUrl} className="block cursor-pointer">
                              <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                                <img
                                  src={img}
                                  alt={v.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                                  <Badge className="bg-rose-600 text-white text-[10px] font-bold">
                                    {year ? `${year} Model` : "Available"}
                                  </Badge>
                                  <Badge variant="secondary" className="text-[10px] font-semibold bg-background/80 backdrop-blur-xs">
                                    {fuel}
                                  </Badge>
                                </div>
                              </div>
                            </Link>
                            <CardHeader className="p-4 pb-2">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-lg font-black text-rose-600 dark:text-rose-400">
                                  ₹{price > 0 ? price.toLocaleString("en-IN") : "Contact for Price"}
                                </span>
                              </div>
                              <Link href={vehicleUrl} className="block cursor-pointer">
                                <CardTitle className="text-sm font-bold line-clamp-1 group-hover:text-primary transition-colors">
                                  {v.title}
                                </CardTitle>
                              </Link>
                              <CardDescription className="text-xs flex items-center gap-1 line-clamp-1 mt-1">
                                <span className="font-semibold text-foreground">{make} {model}</span>
                                {v.city && <span>• {v.city}</span>}
                              </CardDescription>
                            </CardHeader>
                            <CardContent className="px-4 py-2">
                              <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl bg-muted/40 border">
                                <div>
                                  <span className="text-muted-foreground block text-[10px]">Transmission</span>
                                  <span className="font-semibold text-foreground">{transmission}</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block text-[10px]">Fuel Engine</span>
                                  <span className="font-semibold text-foreground">{fuel}</span>
                                </div>
                              </div>
                            </CardContent>
                          </div>
                          <CardFooter className="p-4 pt-1 flex items-center gap-2">
                            <Link href={vehicleUrl} className="flex-1">
                              <Button size="sm" variant="outline" className="w-full text-xs font-bold cursor-pointer">
                                View Specs
                              </Button>
                            </Link>
                            {business.phone ? (
                              <Button
                                size="sm"
                                className="flex-1 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white gap-1.5 cursor-pointer"
                                onClick={() => window.open(`tel:${business.phone}`, "_self")}
                              >
                                <Phone className="size-3.5" />
                                <span>Book Test Drive</span>
                              </Button>
                            ) : null}
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ================= EVENTS TAB ================= */}
            <TabsContent value="events" className="mt-6 space-y-6">
              {events.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                  <CalendarDays className="size-10 mx-auto text-muted-foreground opacity-40" />
                  <h3 className="text-sm font-bold text-foreground">No Upcoming Events</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    This venue has not scheduled any cultural, banquet, or corporate celebrations yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <CalendarDays className="size-5 text-amber-600" />
                        <span>Banquet & Event Celebrations</span>
                        <Badge variant="secondary" className="text-xs font-bold">
                          {events.length} Events
                        </Badge>
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Festivals, grand weddings, corporate meetings, and banquet showcases.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {events.map((e: any) => {
                      const price = Number(e.ticket_price || e.price || e.details?.ticket_price || 0);
                      const venue = e.venue_name || e.venue || e.details?.venue_name || business.address || "Main Banquet Hall";
                      const dateStr = e.start_date || e.event_date || e.details?.start_date || "Upcoming Season";
                      const img = e.image_url || e.featured_image || "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&auto=format&fit=crop&q=80";
                      const eventUrl = `/events/${e.slug || e.id}`;

                      return (
                        <Card key={e.id} className="rounded-2xl overflow-hidden border shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between">
                          <div>
                            <Link href={eventUrl} className="block cursor-pointer">
                              <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                                <img
                                  src={img}
                                  alt={e.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                                  <Badge className="bg-amber-600 text-white text-[10px] font-bold">
                                    {dateStr}
                                  </Badge>
                                </div>
                              </div>
                            </Link>
                            <CardHeader className="p-4 pb-2">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-base font-black text-amber-600 dark:text-amber-400">
                                  {price > 0 ? `₹${price.toLocaleString("en-IN")}` : "Free Admission / Package"}
                                </span>
                              </div>
                              <Link href={eventUrl} className="block cursor-pointer">
                                <CardTitle className="text-sm font-bold line-clamp-1 group-hover:text-primary transition-colors">
                                  {e.title}
                                </CardTitle>
                              </Link>
                              <CardDescription className="text-xs flex items-center gap-1 line-clamp-1 mt-1">
                                <MapPin className="size-3 shrink-0 text-muted-foreground" />
                                <span>{venue}</span>
                              </CardDescription>
                            </CardHeader>
                          </div>
                          <CardFooter className="p-4 pt-1 flex items-center gap-2">
                            <Link href={eventUrl} className="flex-1">
                              <Button size="sm" variant="outline" className="w-full text-xs font-bold cursor-pointer">
                                View Details
                              </Button>
                            </Link>
                            {business.phone ? (
                              <Button
                                size="sm"
                                className="flex-1 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white gap-1.5 cursor-pointer"
                                onClick={() => window.open(`tel:${business.phone}`, "_self")}
                              >
                                <Phone className="size-3.5" />
                                <span>Reserve Venue</span>
                              </Button>
                            ) : null}
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ================= DISHES TAB ================= */}
            <TabsContent value="dishes" className="mt-6 space-y-6">
              {dishes.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                  <Utensils className="size-10 mx-auto text-muted-foreground opacity-40" />
                  <h3 className="text-sm font-bold text-foreground">No Culinary Dishes Listed Yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    This restaurant or cafe has not published its dining menu yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Utensils className="size-5 text-orange-600" />
                        <span>Dining Menu & Specialties</span>
                        <Badge variant="secondary" className="text-xs font-bold">
                          {dishes.length} Items
                        </Badge>
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Fresh chef preparations, signature recipes, and royal Banarasi sweets.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {dishes.map((d: any) => {
                      const price = Number(d.price || d.details?.price || 0);
                      const isVeg = d.is_veg ?? d.details?.is_veg ?? true;
                      const portion = d.portion_size || d.details?.portion_size || "Serving";
                      const img = d.image_url || d.featured_image || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80";

                      return (
                        <Card key={d.id} className="rounded-2xl overflow-hidden border shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between">
                          <div>
                            <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                              <img
                                src={img}
                                alt={d.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                                <Badge className={`text-[10px] font-bold ${isVeg ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"}`}>
                                  {isVeg ? "100% Veg" : "Non-Veg"}
                                </Badge>
                                <Badge variant="secondary" className="text-[10px] font-semibold bg-background/80 backdrop-blur-xs">
                                  {portion}
                                </Badge>
                              </div>
                            </div>
                            <CardHeader className="p-4 pb-2">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-base font-black text-orange-600 dark:text-orange-400">
                                  ₹{price > 0 ? price.toLocaleString("en-IN") : "Market Price"}
                                </span>
                              </div>
                              <CardTitle className="text-sm font-bold line-clamp-1 group-hover:text-primary transition-colors">
                                {d.title}
                              </CardTitle>
                              {d.description && (
                                <CardDescription className="text-xs line-clamp-2 mt-1">
                                  {d.description}
                                </CardDescription>
                              )}
                            </CardHeader>
                          </div>
                          <CardFooter className="p-4 pt-1 flex items-center gap-2">
                            {business.phone ? (
                              <Button
                                size="sm"
                                className="w-full text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white gap-1.5 cursor-pointer"
                                onClick={() => window.open(`tel:${business.phone}`, "_self")}
                              >
                                <Phone className="size-3.5" />
                                <span>Order / Dine-In Table</span>
                              </Button>
                            ) : (
                              <Button size="sm" className="w-full text-xs font-bold" variant="outline">
                                View Recipe
                              </Button>
                            )}
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ================= ROOMS TAB ================= */}
            <TabsContent value="rooms" className="mt-6 space-y-6">
              {rooms.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                  <Bed className="size-10 mx-auto text-muted-foreground opacity-40" />
                  <h3 className="text-sm font-bold text-foreground">No Rooms Listed Yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    This hotel or homestay has not published room accommodations yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Bed className="size-5 text-cyan-600" />
                        <span>Hotel Rooms & Stay Accommodations</span>
                        <Badge variant="secondary" className="text-xs font-bold">
                          {rooms.length} Suites
                        </Badge>
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Air-conditioned suites, riverview heritage rooms, and corporate lodging.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {rooms.map((rm: any) => {
                      const price = Number(rm.price || rm.details?.price || 0);
                      const maxOccupancy = rm.max_occupancy || rm.details?.max_occupancy || 2;
                      const bedType = rm.bed_type || rm.details?.bed_type || "King Bed";
                      const img = rm.image_url || rm.featured_image || "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=600&auto=format&fit=crop&q=80";

                      return (
                        <Card key={rm.id} className="rounded-2xl overflow-hidden border shadow-2xs hover:shadow-md transition-all group flex flex-col justify-between">
                          <div>
                            <div className="relative aspect-[16/10] bg-muted overflow-hidden">
                              <img
                                src={img}
                                alt={rm.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap">
                                <Badge className="bg-cyan-600 text-white text-[10px] font-bold">
                                  Up to {maxOccupancy} Guests
                                </Badge>
                                <Badge variant="secondary" className="text-[10px] font-semibold bg-background/80 backdrop-blur-xs">
                                  {bedType}
                                </Badge>
                              </div>
                            </div>
                            <CardHeader className="p-4 pb-2">
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="text-lg font-black text-cyan-600 dark:text-cyan-400">
                                  ₹{price > 0 ? price.toLocaleString("en-IN") : "Contact Hotel"}
                                  <span className="text-xs text-muted-foreground font-normal"> / night</span>
                                </span>
                              </div>
                              <CardTitle className="text-sm font-bold line-clamp-1 group-hover:text-primary transition-colors">
                                {rm.title}
                              </CardTitle>
                            </CardHeader>
                          </div>
                          <CardFooter className="p-4 pt-1 flex items-center gap-2">
                            {business.phone ? (
                              <Button
                                size="sm"
                                className="w-full text-xs font-bold bg-cyan-600 hover:bg-cyan-700 text-white gap-1.5 cursor-pointer"
                                onClick={() => window.open(`tel:${business.phone}`, "_self")}
                              >
                                <Phone className="size-3.5" />
                                <span>Book Room</span>
                              </Button>
                            ) : (
                              <Button size="sm" className="w-full text-xs font-bold" variant="outline">
                                View Suite
                              </Button>
                            )}
                          </CardFooter>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* ================= PRODUCTS TAB (CATEGORY-WISE) ================= */}
            <TabsContent value="products" className="mt-6 space-y-6">
              {products.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                  <Package className="size-10 mx-auto text-muted-foreground opacity-40" />
                  <h3 className="text-sm font-bold text-foreground">No Products Listed Yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    This business has not published any retail or wholesale products to the catalogue yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Category Pills & Search Controls */}
                  <div className="bg-card border rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
                      {/* Search Input */}
                      <div className="lg:col-span-5 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search by title, SKU, or description..."
                          value={productSearch}
                          onChange={(e) => setProductSearch(e.target.value)}
                          className="pl-9 pr-8 h-10 text-xs bg-muted/30 rounded-xl"
                        />
                        {productSearch && (
                          <button
                            type="button"
                            onClick={() => setProductSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Category Dropdown */}
                      <div className="lg:col-span-3">
                        <select
                          value={selectedProductCategory}
                          onChange={(e) => setSelectedProductCategory(e.target.value)}
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
                        >
                          <option value="all">All Categories ({products.length})</option>
                          {productCategories.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name} ({c.count})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* By Brand Dropdown */}
                      <div className="lg:col-span-2">
                        <select
                          value={selectedProductBrand}
                          onChange={(e) => setSelectedProductBrand(e.target.value)}
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
                        >
                          <option value="all">All Brands ({productBrands.length})</option>
                          {productBrands.map((b) => (
                            <option key={b.name} value={b.name}>
                              {b.name} ({b.count})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sort By Dropdown */}
                      <div className="lg:col-span-2">
                        <select
                          value={productSortBy}
                          onChange={(e) => setProductSortBy(e.target.value)}
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
                        >
                          <option value="featured">Sort: Featured</option>
                          <option value="price_asc">Price: Low to High</option>
                          <option value="price_desc">Price: High to Low</option>
                          <option value="name_asc">Name: A to Z</option>
                          <option value="name_desc">Name: Z to A</option>
                          <option value="newest">Newest First</option>
                        </select>
                      </div>
                    </div>

                    {/* Result count & reset */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                      <span className="font-medium">
                        Showing <strong className="text-foreground">{filteredProducts.length}</strong> of {products.length} products
                      </span>
                      {(selectedProductCategory !== "all" || selectedProductBrand !== "all" || productSearch || productSortBy !== "featured") && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProductCategory("all");
                            setSelectedProductBrand("all");
                            setProductSearch("");
                            setProductSortBy("featured");
                          }}
                          className="h-6 text-xs font-semibold text-primary hover:underline px-1.5 cursor-pointer"
                        >
                          Reset Filters
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Product Listings: Category-Wise Grouping vs Filtered Grid */}
                  {filteredProducts.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                      <Package className="size-10 mx-auto text-muted-foreground opacity-40" />
                      <h3 className="text-sm font-bold text-foreground">No Products Found</h3>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        {productSearch
                          ? `No products match your search "${productSearch}".`
                          : `No products listed in "${selectedProductCategory}".`}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedProductCategory("all");
                          setProductSearch("");
                        }}
                        className="text-xs font-semibold cursor-pointer"
                      >
                        Show All Products
                      </Button>
                    </div>
                  ) : selectedProductCategory === "all" && !productSearch.trim() ? (
                    /* Category-Wise Accordion Sections */
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between pb-1 px-1">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Showing {groupedProducts.length} product categories &bull; Click any category to expand
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (expandedProductCategories.size === groupedProducts.length) {
                              setExpandedProductCategories(new Set());
                            } else {
                              setExpandedProductCategories(new Set(groupedProducts.map((g) => g.categoryName)));
                            }
                          }}
                          className="h-7 text-xs font-bold text-primary hover:bg-primary/10 px-2.5 rounded-lg cursor-pointer"
                        >
                          {expandedProductCategories.size === groupedProducts.length ? "Collapse All" : "Expand All"}
                        </Button>
                      </div>

                      {groupedProducts.map(({ categoryName, items }) => {
                        const isExpanded = expandedProductCategories.has(categoryName);
                        return (
                          <div
                            key={categoryName}
                            className={`rounded-2xl border transition-all overflow-hidden ${
                              isExpanded
                                ? "border-primary/40 bg-card shadow-xs"
                                : "border-border/60 bg-card/60 hover:border-primary/30"
                            }`}
                          >
                            {/* Accordion Header */}
                            <button
                              type="button"
                              onClick={() => toggleProductCategory(categoryName)}
                              className="w-full p-4 flex items-center justify-between gap-3 text-left transition-colors hover:bg-muted/30 cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className={`w-1.5 h-5 rounded-full transition-colors ${isExpanded ? "bg-primary" : "bg-muted-foreground/40"}`} />
                                <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight truncate">
                                  {categoryName}
                                </h3>
                                <Badge variant="secondary" className="text-xs font-bold px-2 py-0.5 shrink-0">
                                  {items.length} {items.length === 1 ? "Product" : "Products"}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">
                                  {isExpanded ? "Click to collapse" : "Click to view products"}
                                </span>
                                <div className={`size-7 rounded-lg bg-muted/60 flex items-center justify-center transition-transform duration-200 ${isExpanded ? "rotate-180 bg-primary/10 text-primary" : "text-muted-foreground"}`}>
                                  <ChevronDown className="size-4" />
                                </div>
                              </div>
                            </button>

                            {/* Accordion Content (Only rendered when expanded) */}
                            {isExpanded && (
                              <div className="p-4 pt-1 border-t border-border/40 bg-muted/10 space-y-3 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                                  <span>Showing all {items.length} products in {categoryName}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedProductCategory(categoryName);
                                    }}
                                    className="text-xs font-bold text-primary hover:underline h-6 px-1.5 cursor-pointer"
                                  >
                                    Focus this category &rarr;
                                  </Button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                                  {items.map((p) => (
                                    <CompactProductCard
                                      key={p.id}
                                      product={p}
                                      business={business}
                                      isHighlighted={highlightId === p.id}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Filtered Grid View for specific category or search */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span className="w-1.5 h-4 rounded-full bg-primary" />
                          <span>
                            {selectedProductCategory !== "all" ? selectedProductCategory : "Search Results"}
                          </span>
                          <Badge variant="outline" className="text-xs font-semibold">
                            {filteredProducts.length}
                          </Badge>
                        </h3>
                        {selectedProductCategory !== "all" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedProductCategory("all")}
                            className="text-xs font-semibold text-primary hover:underline h-7 px-2 cursor-pointer"
                          >
                            &larr; View All Categories
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                        {filteredProducts.map((p) => (
                          <CompactProductCard
                            key={p.id}
                            product={p}
                            business={business}
                            isHighlighted={highlightId === p.id}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ================= SERVICES TAB (CATEGORY-WISE) ================= */}
            <TabsContent value="services" className="mt-6 space-y-6">
              {services.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                  <Briefcase className="size-10 mx-auto text-muted-foreground opacity-40" />
                  <h3 className="text-sm font-bold text-foreground">No Services Listed Yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    This business has not published any service offerings yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Category Pills & Search Controls for Services */}
                  <div className="bg-card border rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
                      {/* Search Input */}
                      <div className="lg:col-span-6 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search by title, description, or keyword..."
                          value={serviceSearch}
                          onChange={(e) => setServiceSearch(e.target.value)}
                          className="pl-9 pr-8 h-10 text-xs bg-muted/30 rounded-xl"
                        />
                        {serviceSearch && (
                          <button
                            type="button"
                            onClick={() => setServiceSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Category Dropdown */}
                      <div className="lg:col-span-3">
                        <select
                          value={selectedServiceCategory}
                          onChange={(e) => setSelectedServiceCategory(e.target.value)}
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
                        >
                          <option value="all">All Categories ({services.length})</option>
                          {serviceCategories.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name} ({c.count})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sort By Dropdown */}
                      <div className="lg:col-span-3">
                        <select
                          value={serviceSortBy}
                          onChange={(e) => setServiceSortBy(e.target.value)}
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
                        >
                          <option value="featured">Sort: Featured</option>
                          <option value="price_asc">Price: Low to High</option>
                          <option value="price_desc">Price: High to Low</option>
                          <option value="name_asc">Name: A to Z</option>
                          <option value="name_desc">Name: Z to A</option>
                          <option value="newest">Newest First</option>
                        </select>
                      </div>
                    </div>

                    {/* Result count & reset */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                      <span className="font-medium">
                        Showing <strong className="text-foreground">{filteredServices.length}</strong> of {services.length} services
                      </span>
                      {(selectedServiceCategory !== "all" || serviceSearch || serviceSortBy !== "featured") && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedServiceCategory("all");
                            setServiceSearch("");
                            setServiceSortBy("featured");
                          }}
                          className="h-6 text-xs font-semibold text-primary hover:underline px-1.5 cursor-pointer"
                        >
                          Reset Filters
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Service Listings: Category-Wise Grouping vs Filtered Grid */}
                  {filteredServices.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                      <Briefcase className="size-10 mx-auto text-muted-foreground opacity-40" />
                      <h3 className="text-sm font-bold text-foreground">No Services Found</h3>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        {serviceSearch
                          ? `No services match your search "${serviceSearch}".`
                          : `No services listed in "${selectedServiceCategory}".`}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedServiceCategory("all");
                          setServiceSearch("");
                        }}
                        className="text-xs font-semibold cursor-pointer"
                      >
                        Show All Services
                      </Button>
                    </div>
                  ) : selectedServiceCategory === "all" && !serviceSearch.trim() ? (
                    /* Category-Wise Accordion Sections */
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between pb-1 px-1">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Showing {groupedServices.length} service categories &bull; Click any category to expand
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (expandedServiceCategories.size === groupedServices.length) {
                              setExpandedServiceCategories(new Set());
                            } else {
                              setExpandedServiceCategories(new Set(groupedServices.map((g) => g.categoryName)));
                            }
                          }}
                          className="h-7 text-xs font-bold text-primary hover:bg-primary/10 px-2.5 rounded-lg cursor-pointer"
                        >
                          {expandedServiceCategories.size === groupedServices.length ? "Collapse All" : "Expand All"}
                        </Button>
                      </div>

                      {groupedServices.map(({ categoryName, items }) => {
                        const isExpanded = expandedServiceCategories.has(categoryName);
                        return (
                          <div
                            key={categoryName}
                            className={`rounded-2xl border transition-all overflow-hidden ${
                              isExpanded
                                ? "border-emerald-500/40 bg-card shadow-xs"
                                : "border-border/60 bg-card/60 hover:border-emerald-500/30"
                            }`}
                          >
                            {/* Accordion Header */}
                            <button
                              type="button"
                              onClick={() => toggleServiceCategory(categoryName)}
                              className="w-full p-4 flex items-center justify-between gap-3 text-left transition-colors hover:bg-muted/30 cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className={`w-1.5 h-5 rounded-full transition-colors ${isExpanded ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                                <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight truncate">
                                  {categoryName}
                                </h3>
                                <Badge variant="secondary" className="text-xs font-bold px-2.5 py-0.5 shrink-0">
                                  {items.length} {items.length === 1 ? "Service" : "Services"}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">
                                  {isExpanded ? "Click to collapse" : "Click to view services"}
                                </span>
                                <div className={`size-7 rounded-lg bg-muted/60 flex items-center justify-center transition-transform duration-200 ${isExpanded ? "rotate-180 bg-emerald-500/10 text-emerald-600" : "text-muted-foreground"}`}>
                                  <ChevronDown className="size-4" />
                                </div>
                              </div>
                            </button>

                            {/* Accordion Content (Only rendered when expanded) */}
                            {isExpanded && (
                              <div className="p-4 pt-1 border-t border-border/40 bg-muted/10 space-y-3 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                                  <span>Showing all {items.length} services in {categoryName}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedServiceCategory(categoryName);
                                    }}
                                    className="text-xs font-bold text-primary hover:underline h-6 px-1.5 cursor-pointer"
                                  >
                                    Focus this category &rarr;
                                  </Button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                                  {items.map((s) => (
                                    <CompactServiceCard
                                      key={s.id}
                                      service={s}
                                      business={business}
                                      isHighlighted={highlightId === s.id}
                                      onBook={handleBookService}
                                    />
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Filtered Grid View */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span className="w-1.5 h-4 rounded-full bg-primary" />
                          <span>
                            {selectedServiceCategory !== "all" ? selectedServiceCategory : "Search Results"}
                          </span>
                          <Badge variant="outline" className="text-xs font-semibold">
                            {filteredServices.length}
                          </Badge>
                        </h3>
                        {selectedServiceCategory !== "all" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedServiceCategory("all")}
                            className="text-xs font-semibold text-primary hover:underline h-7 px-2 cursor-pointer"
                          >
                            &larr; View All Categories
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                        {filteredServices.map((s) => (
                          <CompactServiceCard
                            key={s.id}
                            service={s}
                            business={business}
                            isHighlighted={highlightId === s.id}
                            onBook={handleBookService}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ================= COURSES TAB (CATEGORY-WISE ACCORDION) ================= */}
            <TabsContent value="courses" className="mt-6 space-y-6">
              {courses.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                  <GraduationCap className="size-10 mx-auto text-muted-foreground opacity-40" />
                  <h3 className="text-sm font-bold text-foreground">No Courses Listed Yet</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    This business or institute has not published any degree, diploma, or certification courses yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Category Pills & Search Controls for Courses */}
                  <div className="bg-card border rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
                      {/* Search Input */}
                      <div className="lg:col-span-6 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search courses by title, code, or keyword..."
                          value={courseSearch}
                          onChange={(e) => setCourseSearch(e.target.value)}
                          className="pl-9 pr-8 h-10 text-xs bg-muted/30 rounded-xl"
                        />
                        {courseSearch && (
                          <button
                            type="button"
                            onClick={() => setCourseSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Category Dropdown */}
                      <div className="lg:col-span-3">
                        <select
                          value={selectedCourseCategory}
                          onChange={(e) => setSelectedCourseCategory(e.target.value)}
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
                        >
                          <option value="all">All Categories ({courses.length})</option>
                          {courseCategories.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name} ({c.count})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sort By Dropdown */}
                      <div className="lg:col-span-3">
                        <select
                          value={courseSortBy}
                          onChange={(e) => setCourseSortBy(e.target.value)}
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
                        >
                          <option value="featured">Sort: Featured</option>
                          <option value="name_asc">Name: A to Z</option>
                          <option value="name_desc">Name: Z to A</option>
                          <option value="newest">Newest First</option>
                        </select>
                      </div>
                    </div>

                    {/* Result count & reset */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                      <span className="font-medium">
                        Showing <strong className="text-foreground">{filteredCourses.length}</strong> of {courses.length} courses
                      </span>
                      {(selectedCourseCategory !== "all" || courseSearch || courseSortBy !== "featured") && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedCourseCategory("all");
                            setCourseSearch("");
                            setCourseSortBy("featured");
                          }}
                          className="h-6 text-xs font-semibold text-primary hover:underline px-1.5 cursor-pointer"
                        >
                          Reset Filters
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Course Listings: Accordion vs Filtered Grid */}
                  {filteredCourses.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                      <GraduationCap className="size-10 mx-auto text-muted-foreground opacity-40" />
                      <h3 className="text-sm font-bold text-foreground">No Courses Found</h3>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        {courseSearch
                          ? `No courses match your search "${courseSearch}".`
                          : `No courses listed in "${selectedCourseCategory}".`}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedCourseCategory("all");
                          setCourseSearch("");
                        }}
                        className="text-xs font-semibold cursor-pointer"
                      >
                        Show All Courses
                      </Button>
                    </div>
                  ) : selectedCourseCategory === "all" && !courseSearch.trim() ? (
                    /* Category-Wise Accordion Sections */
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between pb-1 px-1">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Showing {groupedCourses.length} course categories &bull; Click any category to expand
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (expandedCourseCategories.size === groupedCourses.length) {
                              setExpandedCourseCategories(new Set());
                            } else {
                              setExpandedCourseCategories(new Set(groupedCourses.map((g) => g.categoryName)));
                            }
                          }}
                          className="h-7 text-xs font-bold text-primary hover:bg-primary/10 px-2.5 rounded-lg cursor-pointer"
                        >
                          {expandedCourseCategories.size === groupedCourses.length ? "Collapse All" : "Expand All"}
                        </Button>
                      </div>

                      {groupedCourses.map(({ categoryName, items }) => {
                        const isExpanded = expandedCourseCategories.has(categoryName);
                        return (
                          <div
                            key={categoryName}
                            className={`rounded-2xl border transition-all overflow-hidden ${
                              isExpanded
                                ? "border-amber-500/40 bg-card shadow-xs"
                                : "border-border/60 bg-card/60 hover:border-amber-500/30"
                            }`}
                          >
                            {/* Accordion Header */}
                            <button
                              type="button"
                              onClick={() => toggleCourseCategory(categoryName)}
                              className="w-full p-4 flex items-center justify-between gap-3 text-left transition-colors hover:bg-muted/30 cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className={`w-1.5 h-5 rounded-full transition-colors ${isExpanded ? "bg-amber-500" : "bg-muted-foreground/40"}`} />
                                <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight truncate">
                                  {categoryName}
                                </h3>
                                <Badge variant="secondary" className="text-xs font-bold px-2.5 py-0.5 shrink-0">
                                  {items.length} {items.length === 1 ? "Course" : "Courses"}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">
                                  {isExpanded ? "Click to collapse" : "Click to view courses"}
                                </span>
                                <div className={`size-7 rounded-lg bg-muted/60 flex items-center justify-center transition-transform duration-200 ${isExpanded ? "rotate-180 bg-amber-500/10 text-amber-600" : "text-muted-foreground"}`}>
                                  <ChevronDown className="size-4" />
                                </div>
                              </div>
                            </button>

                            {/* Accordion Content (Only rendered when expanded) */}
                            {isExpanded && (
                              <div className="p-4 pt-1 border-t border-border/40 bg-muted/10 space-y-3 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                                  <span>Showing all {items.length} courses in {categoryName}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCourseCategory(categoryName);
                                    }}
                                    className="text-xs font-bold text-primary hover:underline h-6 px-1.5 cursor-pointer"
                                  >
                                    Focus this category &rarr;
                                  </Button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                                  {items.map((c) => (
                                    <Card
                                      key={c.id}
                                      className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 hover:border-amber-500/40 hover:shadow-sm transition-all flex flex-col justify-between"
                                    >
                                      <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-bold">
                                            {c.authority_type || "Accredited Program"}
                                          </Badge>
                                          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                            <Clock className="size-3" />
                                            {c.duration_value || 1} {c.duration_unit?.replace("_", " ") || "Year"}
                                          </span>
                                        </div>

                                        <Link href={`/courses/${c.slug || c.id}`} className="block cursor-pointer">
                                          <h4 className="font-bold text-sm text-foreground hover:text-primary transition-colors leading-snug line-clamp-2">
                                            {c.name}
                                          </h4>
                                        </Link>

                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                          {c.description || "Comprehensive academic syllabus and live practical training."}
                                        </p>
                                      </div>

                                      <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                                        <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                          {c.seats_available || 60} Seats
                                        </span>
                                        <Button
                                          size="sm"
                                          asChild
                                          className="h-7 px-3 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                                        >
                                          <Link href={`/courses/${c.slug || c.id}`}>Buy Now</Link>
                                        </Button>
                                      </div>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Filtered Grid View */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span className="w-1.5 h-4 rounded-full bg-amber-500" />
                          <span>
                            {selectedCourseCategory !== "all" ? selectedCourseCategory : "Search Results"}
                          </span>
                          <Badge variant="outline" className="text-xs font-semibold">
                            {filteredCourses.length}
                          </Badge>
                        </h3>
                        {selectedCourseCategory !== "all" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedCourseCategory("all")}
                            className="text-xs font-semibold text-primary hover:underline h-7 px-2 cursor-pointer"
                          >
                            &larr; View All Categories
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                        {filteredCourses.map((c) => (
                          <Card
                            key={c.id}
                            className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 hover:border-amber-500/40 hover:shadow-sm transition-all flex flex-col justify-between"
                          >
                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between">
                                <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-bold">
                                  {c.authority_type || "Accredited Program"}
                                </Badge>
                                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                  <Clock className="size-3" />
                                  {c.duration_value || 1} {c.duration_unit?.replace("_", " ") || "Year"}
                                </span>
                              </div>

                              <Link href={`/courses/${c.slug || c.id}`} className="block cursor-pointer">
                                <h4 className="font-bold text-sm text-foreground hover:text-primary transition-colors leading-snug line-clamp-2">
                                  {c.name}
                                </h4>
                              </Link>

                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {c.description || "Comprehensive academic syllabus and live practical training."}
                              </p>
                            </div>

                            <div className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                                {c.seats_available || 60} Seats
                              </span>
                              <Button
                                size="sm"
                                asChild
                                className="h-7 px-3 text-xs font-bold rounded-lg bg-amber-600 hover:bg-amber-700 text-white"
                              >
                                <Link href={`/courses/${c.slug || c.id}`}>Buy Now</Link>
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ================= JOBS TAB (DEPARTMENT-WISE ACCORDION) ================= */}
            <TabsContent value="jobs" className="mt-6 space-y-6">
              {jobs.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                  <Briefcase className="size-10 mx-auto text-muted-foreground opacity-40" />
                  <h3 className="text-sm font-bold text-foreground">No Job Openings Currently</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    This business does not have active staff or specialist vacancies right now.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Category Pills & Search Controls for Jobs */}
                  <div className="bg-card border rounded-2xl p-3 sm:p-4 shadow-2xs space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
                      {/* Search Input */}
                      <div className="lg:col-span-6 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Search jobs by title, department, or keyword..."
                          value={jobSearch}
                          onChange={(e) => setJobSearch(e.target.value)}
                          className="pl-9 pr-8 h-10 text-xs bg-muted/30 rounded-xl"
                        />
                        {jobSearch && (
                          <button
                            type="button"
                            onClick={() => setJobSearch("")}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Department Dropdown */}
                      <div className="lg:col-span-3">
                        <select
                          value={selectedJobCategory}
                          onChange={(e) => setSelectedJobCategory(e.target.value)}
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
                        >
                          <option value="all">All Departments ({jobs.length})</option>
                          {jobCategories.map((c) => (
                            <option key={c.name} value={c.name}>
                              {c.name} ({c.count})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Sort By Dropdown */}
                      <div className="lg:col-span-3">
                        <select
                          value={jobSortBy}
                          onChange={(e) => setJobSortBy(e.target.value)}
                          className="flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold shadow-2xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 cursor-pointer"
                        >
                          <option value="featured">Sort: Featured</option>
                          <option value="name_asc">Title: A to Z</option>
                          <option value="newest">Newest First</option>
                        </select>
                      </div>
                    </div>

                    {/* Result count & reset */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                      <span className="font-medium">
                        Showing <strong className="text-foreground">{filteredJobs.length}</strong> of {jobs.length} openings
                      </span>
                      {(selectedJobCategory !== "all" || jobSearch || jobSortBy !== "featured") && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedJobCategory("all");
                            setJobSearch("");
                            setJobSortBy("featured");
                          }}
                          className="h-6 text-xs font-semibold text-primary hover:underline px-1.5 cursor-pointer"
                        >
                          Reset Filters
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Job Listings: Accordion vs Filtered Grid */}
                  {filteredJobs.length === 0 ? (
                    <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
                      <Briefcase className="size-10 mx-auto text-muted-foreground opacity-40" />
                      <h3 className="text-sm font-bold text-foreground">No Openings Found</h3>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                        {jobSearch
                          ? `No openings match your search "${jobSearch}".`
                          : `No openings in "${selectedJobCategory}".`}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedJobCategory("all");
                          setJobSearch("");
                        }}
                        className="text-xs font-semibold cursor-pointer"
                      >
                        Show All Openings
                      </Button>
                    </div>
                  ) : selectedJobCategory === "all" && !jobSearch.trim() ? (
                    /* Department-Wise Accordion Sections */
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between pb-1 px-1">
                        <span className="text-xs font-semibold text-muted-foreground">
                          Showing {groupedJobs.length} job departments &bull; Click any department to expand
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (expandedJobCategories.size === groupedJobs.length) {
                              setExpandedJobCategories(new Set());
                            } else {
                              setExpandedJobCategories(new Set(groupedJobs.map((g) => g.categoryName)));
                            }
                          }}
                          className="h-7 text-xs font-bold text-primary hover:bg-primary/10 px-2.5 rounded-lg cursor-pointer"
                        >
                          {expandedJobCategories.size === groupedJobs.length ? "Collapse All" : "Expand All"}
                        </Button>
                      </div>

                      {groupedJobs.map(({ categoryName, items }) => {
                        const isExpanded = expandedJobCategories.has(categoryName);
                        return (
                          <div
                            key={categoryName}
                            className={`rounded-2xl border transition-all overflow-hidden ${
                              isExpanded
                                ? "border-purple-500/40 bg-card shadow-xs"
                                : "border-border/60 bg-card/60 hover:border-purple-500/30"
                            }`}
                          >
                            {/* Accordion Header */}
                            <button
                              type="button"
                              onClick={() => toggleJobCategory(categoryName)}
                              className="w-full p-4 flex items-center justify-between gap-3 text-left transition-colors hover:bg-muted/30 cursor-pointer"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <span className={`w-1.5 h-5 rounded-full transition-colors ${isExpanded ? "bg-purple-500" : "bg-muted-foreground/40"}`} />
                                <h3 className="text-sm sm:text-base font-bold text-foreground tracking-tight truncate">
                                  {categoryName}
                                </h3>
                                <Badge variant="secondary" className="text-xs font-bold px-2.5 py-0.5 shrink-0">
                                  {items.length} {items.length === 1 ? "Vacancy" : "Vacancies"}
                                </Badge>
                              </div>

                              <div className="flex items-center gap-2.5 shrink-0">
                                <span className="text-[11px] font-semibold text-muted-foreground hidden sm:inline">
                                  {isExpanded ? "Click to collapse" : "Click to view vacancies"}
                                </span>
                                <div className={`size-7 rounded-lg bg-muted/60 flex items-center justify-center transition-transform duration-200 ${isExpanded ? "rotate-180 bg-purple-500/10 text-purple-600" : "text-muted-foreground"}`}>
                                  <ChevronDown className="size-4" />
                                </div>
                              </div>
                            </button>

                            {/* Accordion Content (Only rendered when expanded) */}
                            {isExpanded && (
                              <div className="p-4 pt-1 border-t border-border/40 bg-muted/10 space-y-3 animate-in fade-in duration-200">
                                <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
                                  <span>Showing all {items.length} vacancies in {categoryName}</span>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedJobCategory(categoryName);
                                    }}
                                    className="text-xs font-bold text-primary hover:underline h-6 px-1.5 cursor-pointer"
                                  >
                                    Focus this department &rarr;
                                  </Button>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                                  {items.map((j) => (
                                    <Card
                                      key={j.id}
                                      className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 hover:border-purple-500/40 hover:shadow-sm transition-all flex flex-col justify-between"
                                    >
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                          <Badge variant="outline" className="text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                                            {j.department || "General"}
                                          </Badge>
                                          <span className="text-[10px] font-semibold text-muted-foreground">
                                            {j.work_mode || "On-site"}
                                          </span>
                                        </div>

                                        <Link href={`/jobs/${j.slug || j.id}`} className="block cursor-pointer">
                                          <h4 className="font-bold text-sm text-foreground hover:text-primary transition-colors leading-snug line-clamp-2">
                                            {j.title}
                                          </h4>
                                        </Link>

                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                          {j.description || "Exciting career opportunity at our store & operations network."}
                                        </p>
                                      </div>

                                      <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
                                        <div className="flex items-center justify-between">
                                          <span className="text-muted-foreground">Salary:</span>
                                          <span className="font-bold text-foreground">{j.salary_range || "Competitive"}</span>
                                        </div>
                                        <Button
                                          size="sm"
                                          asChild
                                          className="w-full h-7 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
                                        >
                                          <Link href={`/jobs/${j.slug || j.id}`}>Apply Now</Link>
                                        </Button>
                                      </div>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* Filtered Grid View */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                          <span className="w-1.5 h-4 rounded-full bg-purple-500" />
                          <span>
                            {selectedJobCategory !== "all" ? selectedJobCategory : "Search Results"}
                          </span>
                          <Badge variant="outline" className="text-xs font-semibold">
                            {filteredJobs.length}
                          </Badge>
                        </h3>
                        {selectedJobCategory !== "all" && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedJobCategory("all")}
                            className="text-xs font-semibold text-primary hover:underline h-7 px-2 cursor-pointer"
                          >
                            &larr; View All Departments
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                        {filteredJobs.map((j) => (
                          <Card
                            key={j.id}
                            className="rounded-2xl border border-border/60 bg-card p-4 space-y-3 hover:border-purple-500/40 hover:shadow-sm transition-all flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="text-[10px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                                  {j.department || "General"}
                                </Badge>
                                <span className="text-[10px] font-semibold text-muted-foreground">
                                  {j.work_mode || "On-site"}
                                </span>
                              </div>

                              <Link href={`/jobs/${j.slug || j.id}`} className="block cursor-pointer">
                                <h4 className="font-bold text-sm text-foreground hover:text-primary transition-colors leading-snug line-clamp-2">
                                  {j.title}
                                </h4>
                              </Link>

                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {j.description || "Exciting career opportunity at our store & operations network."}
                              </p>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-border/40 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Salary:</span>
                                <span className="font-bold text-foreground">{j.salary_range || "Competitive"}</span>
                              </div>
                              <Button
                                size="sm"
                                asChild
                                className="w-full h-7 text-xs font-bold rounded-lg bg-purple-600 hover:bg-purple-700 text-white"
                              >
                                <Link href={`/jobs/${j.slug || j.id}`}>Apply Now</Link>
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* ================= TEAM / PROFESSIONALS TAB ================= */}
            <TabsContent value="team" className="mt-6 space-y-6">
              {professionals.length === 0 ? (
                <Card className="rounded-2xl border p-12 text-center text-muted-foreground">
                  <Users className="size-12 mx-auto mb-3 opacity-30" />
                  <h4 className="font-bold text-base text-foreground">No Team Members Listed Yet</h4>
                  <p className="text-xs mt-1">Staff members and specialists associated with this profile will appear here.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {professionals.map((prof) => {
                    const profUrl = prof.slug ? `/professional/${prof.slug}` : `/professionals/${prof.id}`;
                    return (
                    <Card key={prof.id} className="rounded-2xl border shadow-xs hover:shadow-md transition-all overflow-hidden p-5 flex flex-col justify-between">
                      <div className="flex items-start gap-4">
                        <Link href={profUrl} className="block cursor-pointer shrink-0">
                          <div className="relative size-14 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 overflow-hidden border flex items-center justify-center font-bold">
                            {prof.avatar_url ? (
                              <Image src={prof.avatar_url} alt={prof.name} fill sizes="56px" className="object-cover" />
                            ) : (
                              <span>{(prof.name || "ST").slice(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link href={profUrl} className="block cursor-pointer">
                            <h4 className="text-sm font-bold text-foreground hover:text-primary transition-colors truncate">
                              {prof.name}
                            </h4>
                          </Link>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {prof.designation || prof.profession_type || "Staff Specialist"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] font-semibold px-1.5 py-0">
                              {prof.profession_type || "Staff"}
                            </Badge>
                            {prof.experience_years ? (
                              <span className="text-[10px] text-muted-foreground">
                                {prof.experience_years} yrs exp
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="pt-4 mt-3 border-t flex items-center justify-between">
                        <span className="text-xs text-muted-foreground truncate">{prof.city || business.city || "Headquarters"}</span>
                        <Link href={profUrl}>
                          <Button size="sm" variant="outline" className="text-xs h-7 px-2.5 font-bold cursor-pointer">
                            View Profile
                          </Button>
                        </Link>
                      </div>
                    </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ================= ABOUT TAB ================= */}
            <TabsContent value="about" className="mt-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left 2 Cols: Main About, Mission/Vision, Highlights */}
                <div className="lg:col-span-2 space-y-6">
                  {/* About Card */}
                  <Card className="rounded-2xl border shadow-xs">
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
                          About Us
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">• Business Profile</span>
                      </div>
                      <CardTitle className="text-xl font-bold mt-1">About {business.name}</CardTitle>
                      <CardDescription className="text-xs">
                        Learn more about our background, identity, and commitment to service
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
                      {business.about ? (
                        <p className="whitespace-pre-line text-foreground/90">{business.about}</p>
                      ) : (
                        <p className="italic text-muted-foreground">
                          Welcome to {business.name}. We provide quality products, trusted professional solutions, and reliable customer satisfaction in {business.city || "our local community"}.
                        </p>
                      )}

                      {/* Featured Highlights Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-4 border-t">
                        {business.business_type && (
                          <div className="p-3.5 rounded-xl bg-muted/40 border">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Business Type
                            </span>
                            <span className="text-xs font-bold text-foreground mt-0.5 block">
                              {business.business_type}
                            </span>
                          </div>
                        )}
                        {business.established_year ? (
                          <div className="p-3.5 rounded-xl bg-muted/40 border">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                              Established
                            </span>
                            <span className="text-xs font-bold text-foreground mt-0.5 block">
                              Year {business.established_year}
                            </span>
                          </div>
                        ) : null}
                        <div className="p-3.5 rounded-xl bg-muted/40 border">
                          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                            Verification
                          </span>
                          {business.is_verified ? (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block flex items-center gap-1">
                              <ShieldCheck className="size-3.5" /> Verified Store
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5 block flex items-center gap-1">
                              <AlertCircle className="size-3.5" /> Pending Verification
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Mission, Vision & Strategic Goals Card (Only if data provided) */}
                  {Boolean(business.mission?.trim() || business.vision?.trim() || business.goal?.trim() || business.strategic_goals?.trim()) && (
                    <Card className="rounded-2xl border shadow-xs">
                      <CardHeader className="pb-3 border-b">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border-primary/20">
                            Core Principles
                          </Badge>
                          <span className="text-xs text-muted-foreground font-medium">• Philosophy & Goals</span>
                        </div>
                        <CardTitle className="text-lg font-bold mt-1">Our Mission, Vision & Strategic Goals</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4 space-y-4">
                        {business.mission?.trim() && (
                          <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 space-y-2">
                            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                              <Target className="size-4 text-primary" />
                              <span>Our Mission</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed pl-6 whitespace-pre-line">
                              {business.mission.trim()}
                            </p>
                          </div>
                        )}

                        {business.vision?.trim() && (
                          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 space-y-2">
                            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                              <Compass className="size-4 text-amber-500" />
                              <span>Our Vision</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed pl-6 whitespace-pre-line">
                              {business.vision.trim()}
                            </p>
                          </div>
                        )}

                        {(business.goal?.trim() || business.strategic_goals?.trim()) && (
                          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/15 space-y-2">
                            <div className="flex items-center gap-2 font-bold text-sm text-foreground">
                              <Award className="size-4 text-emerald-500" />
                              <span>Strategic Goals & Commitments</span>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed pl-6 whitespace-pre-line">
                              {business.goal?.trim() || business.strategic_goals?.trim()}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Right 1 Col: Key Info, Business Details & Operating Hours */}
                <div className="space-y-6">
                  {/* Store Information */}
                  <Card className="rounded-2xl border shadow-xs">
                    <CardHeader className="pb-3 border-b">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Store className="size-4 text-primary" />
                        <span>Business Information</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3.5 text-xs">
                      {fullAddress && (
                        <div className="flex items-start gap-2.5">
                          <MapPin className="size-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <span className="font-bold text-foreground block">Address</span>
                            <span className="text-muted-foreground">{fullAddress}</span>
                            <div className="pt-1.5">
                              <a
                                href={mapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"
                              >
                                <Navigation className="size-3" /> Get Directions
                              </a>
                            </div>
                          </div>
                        </div>
                      )}
                      {business.phone && (
                        <div className="flex items-center gap-2.5 pt-1 border-t">
                          <Phone className="size-4 text-primary shrink-0" />
                          <div>
                            <span className="font-bold text-foreground block">Phone</span>
                            <a href={`tel:${cleanPhone}`} className="text-primary hover:underline font-medium">{business.phone}</a>
                          </div>
                        </div>
                      )}
                      {business.whatsapp && (
                        <div className="flex items-center gap-2.5 pt-1 border-t">
                          <MessageCircle className="size-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold text-foreground block">WhatsApp</span>
                            <a href={`https://wa.me/${cleanWhatsapp}`} target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline font-medium">Chat on WhatsApp</a>
                          </div>
                        </div>
                      )}
                      {business.email && (
                        <div className="flex items-center gap-2.5 pt-1 border-t">
                          <Mail className="size-4 text-primary shrink-0" />
                          <div>
                            <span className="font-bold text-foreground block">Email</span>
                            <a href={`mailto:${business.email}`} className="text-primary hover:underline font-medium">{business.email}</a>
                          </div>
                        </div>
                      )}
                      {business.website && (
                        <div className="flex items-center gap-2.5 pt-1 border-t">
                          <Globe className="size-4 text-primary shrink-0" />
                          <div>
                            <span className="font-bold text-foreground block">Website</span>
                            <a href={business.website.startsWith("http") ? business.website : `https://${business.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                              {business.website.replace(/^https?:\/\//, "")}
                            </a>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Business Hours */}
                  <Card className="rounded-2xl border shadow-xs">
                    <CardHeader className="pb-3 border-b">
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Clock className="size-4 text-primary" />
                        <span>Working Hours</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-2 text-xs">
                      {business.opening_time || business.closing_time ? (
                        <div className="flex items-center justify-between py-1">
                          <span className="text-muted-foreground font-medium">Monday - Saturday</span>
                          <span className="font-bold text-foreground">
                            {business.opening_time || "09:00 AM"} – {business.closing_time || "09:00 PM"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between py-1">
                          <span className="text-muted-foreground font-medium">Everyday (Mon - Sun)</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">Open Daily</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-1 border-t text-muted-foreground">
                        <span>Sunday</span>
                        <span className="font-semibold text-foreground">
                          {business.sunday_hours || "09:00 AM – 02:00 PM (or Open Daily)"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>

            {/* ================= REVIEWS TAB ================= */}
            <TabsContent value="reviews" className="mt-6 space-y-6">
              <Card className="rounded-2xl border shadow-xs">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">Customer Reviews</CardTitle>
                    <CardDescription className="text-xs">
                      Verified ratings and reviews from customers
                    </CardDescription>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setFeedbackOpen(true)}
                    className="text-xs font-bold cursor-pointer"
                  >
                    Write a Review
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Rating summary box */}
                  <div className="p-4 rounded-xl bg-muted/30 border flex items-center gap-6">
                    <div className="text-center shrink-0">
                      <span className="text-4xl font-black text-foreground block">{avgRating}</span>
                      <div className="flex items-center gap-1 justify-center my-1 text-amber-500">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="size-3.5 fill-amber-500 text-amber-500" />
                        ))}
                      </div>
                      <span className="text-[11px] text-muted-foreground">{reviewCount} Reviews</span>
                    </div>
                    <div className="border-l pl-6 space-y-1 text-xs text-muted-foreground flex-1">
                      <p className="font-semibold text-foreground">100% Verified Customer Feedback</p>
                      <p>All reviews are submitted by authenticated users on our marketplace.</p>
                    </div>
                  </div>

                  {/* Reviews list */}
                  <div className="flex items-center justify-between pt-2 pb-1 text-xs border-b pb-2">
                    <span className="font-bold text-foreground">
                      All Customer Reviews ({reviewCount})
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium">
                      100% Authenticated Store Feedback
                    </span>
                  </div>
                  {allReviews.length === 0 ? (
                    <div className="p-6 text-center text-xs text-muted-foreground">
                      No customer reviews yet. Be the first to share your experience with {business.name}!
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {allReviews.map((rev) => (
                        <div key={rev.id} className="py-4 space-y-2 text-xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-foreground text-sm">
                                {rev.user_name || rev.reviewer_name || "Customer"}
                              </span>
                              {(rev.is_verified_user ?? true) && (
                                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-semibold gap-1 py-0">
                                  <ShieldCheck className="size-3 text-emerald-600" />
                                  <span>{rev.reviewer_role || "Verified Buyer"}</span>
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-0.5 text-amber-500">
                                {Array.from({ length: Math.max(0, Math.min(5, Math.round(Number(rev.rating) || 5))) }).map((_, i) => (
                                  <Star key={i} className="size-3.5 fill-amber-500 text-amber-500" />
                                ))}
                              </div>
                              <span className="text-[11px] text-muted-foreground/70 font-medium">
                                {rev.created_at ? new Date(rev.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Recent"}
                              </span>
                            </div>
                          </div>
                          {rev.title && (
                            <h4 className="font-bold text-xs text-foreground">{rev.title}</h4>
                          )}
                          <p className="text-muted-foreground leading-relaxed text-xs">
                            {rev.review || rev.comment}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ================= PHOTO GALLERY TAB ================= */}
            <TabsContent value="gallery" className="mt-6 space-y-6">
              <Card className="rounded-2xl border shadow-xs">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Camera className="size-5 text-primary" />
                        <span>Photo Gallery &amp; Showcase</span>
                      </CardTitle>
                      <Badge variant="secondary" className="text-xs font-semibold">
                        {galleryImages.length} {galleryImages.length === 1 ? "Photo" : "Photos"}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs mt-1">
                      Browse photos of {business.name}&apos;s workplace, store premises, portfolio, and facilities.
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {galleryImages.length === 0 ? (
                    <div className="text-center py-16 px-4">
                      <Camera className="size-12 text-muted-foreground/40 mx-auto mb-3" />
                      <h3 className="text-sm font-bold text-foreground">No Photos Uploaded Yet</h3>
                      <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                        This business hasn&apos;t added photos to their public gallery yet. Check back soon!
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {galleryImages.map((imgUrl: string, idx: number) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedGalleryImage(imgUrl)}
                          className="group relative aspect-square rounded-2xl overflow-hidden border bg-muted/50 cursor-pointer shadow-xs hover:shadow-lg transition-all duration-300 ring-offset-background hover:ring-2 hover:ring-primary/40"
                          title="Click to expand full size"
                        >
                          <Image
                            src={imgUrl}
                            alt={`${business.name} gallery image ${idx + 1}`}
                            fill
                            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 text-white">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-semibold drop-shadow-sm">
                                Photo {idx + 1}
                              </span>
                              <div className="size-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center">
                                <ZoomIn className="size-3.5 text-white" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>
      </div>

      {/* ================= ENQUIRY MODAL ================= */}
      <Dialog open={enquiryOpen} onOpenChange={setEnquiryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Contact {business.name}</DialogTitle>
            <DialogDescription className="text-xs">
              Fill out your details below and the business owner will get back to you promptly.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSendEnquiry} className="space-y-3.5 py-2">
            <div className="space-y-1">
              <Label htmlFor="enq-name" className="text-xs font-semibold">Your Full Name *</Label>
              <Input
                id="enq-name"
                value={enquiryForm.name}
                onChange={(e) => setEnquiryForm({ ...enquiryForm, name: e.target.value })}
                placeholder="e.g. John Doe"
                className="text-xs"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="enq-phone" className="text-xs font-semibold">Phone Number *</Label>
                <Input
                  id="enq-phone"
                  value={enquiryForm.phone}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, phone: e.target.value })}
                  placeholder="e.g. 9876543210"
                  className="text-xs"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="enq-email" className="text-xs font-semibold">Email Address</Label>
                <Input
                  id="enq-email"
                  type="email"
                  value={enquiryForm.email}
                  onChange={(e) => setEnquiryForm({ ...enquiryForm, email: e.target.value })}
                  placeholder="e.g. john@example.com"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="enq-msg" className="text-xs font-semibold">Message / Requirement</Label>
              <Textarea
                id="enq-msg"
                rows={3}
                value={enquiryForm.message}
                onChange={(e) => setEnquiryForm({ ...enquiryForm, message: e.target.value })}
                placeholder="I would like to inquire about your products and services..."
                className="text-xs resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setEnquiryOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={enquirySubmitting}
                className="text-xs font-bold gap-1.5"
              >
                <Send className="size-3.5" />
                <span>{enquirySubmitting ? "Sending..." : "Submit Enquiry"}</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= ORDER & BOOKING CHECKOUT DIALOG ================= */}
      {checkoutItem && (
        <OrderCheckoutDialog
          isOpen={checkoutOpen}
          onClose={() => {
            setCheckoutOpen(false);
            setCheckoutItem(null);
          }}
          item={checkoutItem}
        />
      )}

      {/* ================= CART DRAWER & FLOATING BUTTON ================= */}
      <CartDrawer />
      <CartFloatingButton />

      {/* ================= SERVICE BOOKING DIALOG ================= */}
      <ServiceBookingDialog
        open={bookingDialogOpen}
        onOpenChange={setBookingDialogOpen}
        service={selectedBookingService}
      />

      {/* ================= UNIVERSAL FEEDBACK / REVIEW DIALOG ================= */}
      <UniversalFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        target={{
          id: business.id,
          title: business.name,
          type: "business",
          subtitle: fullAddress,
        }}
        onReviewSubmitted={(newRev) => {
          setSubmittedReviews((prev) => [newRev, ...prev]);
        }}
      />

      {/* ================= ALL REVIEWS DIALOG ================= */}
      <Dialog open={allReviewsOpen} onOpenChange={setAllReviewsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Star className="size-4 text-amber-500 fill-amber-500" />
                <span>Customer Reviews ({reviewCount})</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Verified customer ratings and testimonials for {business.name}
              </DialogDescription>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={() => {
                setAllReviewsOpen(false);
                setFeedbackOpen(true);
              }}
              className="text-xs font-bold cursor-pointer"
            >
              Write a Review
            </Button>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Rating summary */}
            <div className="p-4 rounded-xl bg-muted/30 border flex items-center gap-6">
              <div className="text-center shrink-0">
                <span className="text-4xl font-black text-foreground block">{avgRating}</span>
                <div className="flex items-center gap-1 justify-center my-1 text-amber-500">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className="size-3.5 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <span className="text-[11px] text-muted-foreground">{reviewCount} Reviews</span>
              </div>
              <div className="border-l pl-6 space-y-1 text-xs text-muted-foreground flex-1">
                <p className="font-semibold text-foreground">100% Verified Customer Feedback</p>
                <p>All reviews are submitted by authenticated users on our marketplace.</p>
              </div>
            </div>

            {/* List */}
            {allReviews.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No customer reviews yet. Be the first to share your experience with {business.name}!
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {allReviews.map((rev) => (
                  <div key={rev.id} className="py-4 space-y-2 text-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground text-sm">
                          {rev.user_name || rev.reviewer_name || "Customer"}
                        </span>
                        {(rev.is_verified_user ?? true) && (
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 font-semibold gap-1 py-0">
                            <ShieldCheck className="size-3 text-emerald-600" />
                            <span>{rev.reviewer_role || "Verified Buyer"}</span>
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: Math.max(0, Math.min(5, Math.round(Number(rev.rating) || 5))) }).map((_, i) => (
                            <Star key={i} className="size-3.5 fill-amber-500 text-amber-500" />
                          ))}
                        </div>
                        <span className="text-[11px] text-muted-foreground/70 font-medium">
                          {rev.created_at ? new Date(rev.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "Recent"}
                        </span>
                      </div>
                    </div>
                    {rev.title && (
                      <h4 className="font-bold text-xs text-foreground">{rev.title}</h4>
                    )}
                    <p className="text-muted-foreground leading-relaxed text-xs">
                      {rev.review || rev.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ================= PHOTO LIGHTBOX DIALOG ================= */}
      <Dialog open={Boolean(selectedGalleryImage)} onOpenChange={(open) => !open && setSelectedGalleryImage(null)}>
        <DialogContent className="max-w-4xl p-2 bg-background/95 backdrop-blur-md border shadow-2xl overflow-hidden rounded-2xl">
          <DialogHeader className="px-3 pt-2 pb-1">
            <DialogTitle className="text-sm font-semibold truncate flex items-center gap-2">
              <Camera className="size-4 text-primary" />
              <span>{business.name} — Photo Showcase</span>
            </DialogTitle>
          </DialogHeader>
          {selectedGalleryImage && (
            <div className="relative w-full aspect-4/3 sm:aspect-16/10 rounded-xl overflow-hidden bg-black/5 dark:bg-black/40 border">
              <Image
                src={selectedGalleryImage}
                alt={`${business.name} full photo view`}
                fill
                sizes="(max-width: 1200px) 95vw, 1000px"
                className="object-contain"
                priority
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ================= FOUNDER BIOGRAPHY DIALOG ================= */}
      <Dialog open={founderModalOpen} onOpenChange={setFounderModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Users className="size-5 text-primary" />
              <span>About {business.owner_name || business.founder_name || "Founder & Leadership"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              {business.owner_designation || business.founder_title || "Founder"} &bull; {business.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4 p-3.5 rounded-xl bg-muted/40 border">
              {(() => {
                const resolvedOwnerImg =
                  business.owner_image_url ||
                  business.founder_image_url ||
                  null;
                return (
                  <div className="relative size-16 rounded-full overflow-hidden border-2 border-primary/20 shrink-0 bg-muted">
                    {resolvedOwnerImg ? (
                      <Image
                        src={resolvedOwnerImg}
                        alt={business.owner_name || business.founder_name || "Founder"}
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold text-xl">
                        {(business.owner_name || business.founder_name || "O").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                );
              })()}
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-foreground text-sm sm:text-base">
                  {business.owner_name || business.founder_name}
                </h4>
                <p className="text-xs font-semibold text-primary">
                  {business.owner_designation || business.founder_title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">
                  {business.name}
                </p>
              </div>
            </div>
            <div className="text-muted-foreground leading-relaxed whitespace-pre-line text-xs sm:text-sm bg-muted/20 p-4 rounded-xl border">
              {business.owner_about || business.founder_about}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

