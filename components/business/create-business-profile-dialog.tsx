"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { setStoredActiveInstitutionId } from "@/lib/auth/active-institution";
import {
  Building2,
  Briefcase,
  MapPin,
  Phone,
  Clock,
  Plus,
  Trash2,
  Upload,
  Globe,
  Mail,
  MessageSquare,
  Sparkles,
  Loader2,
  CheckCircle2,
  X,
  Share2,
  ImageIcon,
  Search,
  Copy,
  ExternalLink,
  ChevronRight,
  GitBranch,
} from "lucide-react";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const LISTING_TYPE_OPTIONS = ["Business", "Professional"];

const SOCIAL_PLATFORMS = [
  { label: "Facebook", value: "facebook" },
  { label: "Instagram", value: "instagram" },
  { label: "LinkedIn", value: "linkedin" },
  { label: "Twitter / X", value: "twitter" },
  { label: "YouTube", value: "youtube" },
  { label: "Website", value: "website" },
  { label: "WhatsApp Channel", value: "whatsapp" },
  { label: "Pinterest", value: "pinterest" },
  { label: "TikTok", value: "tiktok" },
  { label: "GitHub", value: "github" },
];

export interface BranchData {
  id: string;
  name: string;
  is_main: boolean;
  country_code: "IN" | "US";
  location_search: string;
  city: string;
  state: string;
  district: string;
  locality: string;
  address: string;
  postal_code: string;
  latitude: string;
  longitude: string;
  phone: string;
  whatsapp: string;
  email: string;
  social_links: Array<{ id: string; platform: string; url: string }>;
}

const createDefaultBranch = (name = "Main Branch / Head Office", isMain = true): BranchData => ({
  id: String(Date.now() + Math.random()),
  name,
  is_main: isMain,
  country_code: "IN",
  location_search: "",
  city: "",
  state: "",
  district: "",
  locality: "",
  address: "",
  postal_code: "",
  latitude: "",
  longitude: "",
  phone: "",
  whatsapp: "",
  email: "",
  social_links: [],
});

const PRIORITY_BUSINESS_ROOTS = [
  "Healthcare & Medical",
  "Salons & Personal Care",
  "Food, Dining & Cafes",
  "Retail & Shopping",
  "Automotive & Transport",
  "Fitness & Sports",
  "Education & Coaching",
  "Real Estate & Construction",
  "IT & Digital Agencies",
  "Professional & Financial Services",
  "Hospitality & Events",
  "Home Services & Maintenance"
];

interface CreateBusinessProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (institution: { id: number; name: string }) => void;
  initialData?: any;
  isEdit?: boolean;
  defaultBusinessProfileId?: number | null;
}

export function CreateBusinessProfileDialog({
  open,
  onOpenChange,
  onSuccess,
  initialData,
  isEdit = false,
  defaultBusinessProfileId,
}: CreateBusinessProfileDialogProps) {
  const isEditMode = Boolean(isEdit || initialData);
  const { user, accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState("overview");
  const [submitting, setSubmitting] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // Metadata
  const [categories, setCategories] = useState<any[]>([]);
  const [professionalCategories, setProfessionalCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [dynamicSubcategories, setDynamicSubcategories] = useState<any[]>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [institutionTypes, setInstitutionTypes] = useState<any[]>([]);
  const [businesses, setBusinesses] = useState<any[]>([]);

  // Form Fields - Tab 1: Overview
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState("Business");
  const [institutionTypeId, setInstitutionTypeId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [about, setAbout] = useState("");
  const [establishedYear, setEstablishedYear] = useState<string>("");

  // Professional-specific Fields: Designation, Skills, Experience, and Associated Business
  const [designation, setDesignation] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [experienceYears, setExperienceYears] = useState<number>(0);
  const [businessProfileId, setBusinessProfileId] = useState<string>(
    defaultBusinessProfileId ? String(defaultBusinessProfileId) : ""
  );

  // Tab 2: Branches (Multiple branches with Google Maps location, country phone codes, email, whatsapp, and social media)
  const [branches, setBranches] = useState<BranchData[]>([createDefaultBranch()]);
  const [activeBranchIdx, setActiveBranchIdx] = useState<number>(0);

  // Live Location Suggestions state for branches
  const [searchingLocationBranchIdx, setSearchingLocationBranchIdx] = useState<number | null>(null);
  const [branchLocationSuggestions, setBranchLocationSuggestions] = useState<any[]>([]);
  const [showLocationDropdownIdx, setShowLocationDropdownIdx] = useState<number | null>(null);

  // Social link temporary input state per branch
  const [newSocialPlatform, setNewSocialPlatform] = useState<string>("instagram");
  const [newSocialUrl, setNewSocialUrl] = useState<string>("");

  // Tab 3: Hours (Dedicated Working Hours)
  const [openingHours, setOpeningHours] = useState<Record<string, { open: string; close: string; isClosed: boolean }>>({
    Monday: { open: "09:00", close: "19:00", isClosed: false },
    Tuesday: { open: "09:00", close: "19:00", isClosed: false },
    Wednesday: { open: "09:00", close: "19:00", isClosed: false },
    Thursday: { open: "09:00", close: "19:00", isClosed: false },
    Friday: { open: "09:00", close: "19:00", isClosed: false },
    Saturday: { open: "09:00", close: "18:00", isClosed: false },
    Sunday: { open: "10:00", close: "14:00", isClosed: true },
  });

  // Tab 4: Images & Gallery
  const [logoUrl, setLogoUrl] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Flags
  const [isActive, setIsActive] = useState(true);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  // Load types & categories when opened
  useEffect(() => {
    if (!open) return;
    setLoadingMetadata(true);

    fetch("/api/admin/institutions/create-business", {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.institutionTypes) setInstitutionTypes(data.institutionTypes);
        if (data.categories) setCategories(data.categories);
        if (data.professionalCategories) setProfessionalCategories(data.professionalCategories);
        if (data.subcategories) setSubcategories(data.subcategories);
        if (data.businesses) setBusinesses(data.businesses);

        if (data.institutionTypes?.length > 0 && !institutionTypeId) {
          const inst = data.institutionTypes.find((t: any) =>
            t.slug?.toLowerCase().includes("institute")
          );
          setInstitutionTypeId(String(inst?.id || data.institutionTypes[0].id));
        }
      })
      .catch((err) => console.error("Failed to load metadata:", err))
      .finally(() => setLoadingMetadata(false));
  }, [open, accessToken]);

  // Load initialData if provided (for edit mode)
  useEffect(() => {
    if (!open || !initialData) return;
    if (initialData.name) setName(initialData.name);
    if (initialData.business_type || initialData.businessType) {
      setBusinessType(initialData.business_type || initialData.businessType);
    }
    if (initialData.category_id || initialData.categoryId) {
      setCategoryId(String(initialData.category_id || initialData.categoryId));
    }
    if (initialData.subcategory_id || initialData.subcategoryId) {
      setSubcategoryId(String(initialData.subcategory_id || initialData.subcategoryId));
    }
    if (initialData.designation || initialData.professional_title || initialData.profession_type) {
      setDesignation(initialData.designation || initialData.professional_title || initialData.profession_type);
    }
    if (initialData.skills) {
      if (Array.isArray(initialData.skills)) {
        setSkills(initialData.skills);
      } else if (typeof initialData.skills === "string") {
        setSkills(initialData.skills.split(",").map((s: string) => s.trim()).filter(Boolean));
      }
    }
    if (initialData.experience_years != null || initialData.experienceYears != null) {
      setExperienceYears(Number(initialData.experience_years ?? initialData.experienceYears));
    }
    if (initialData.business_profile_id || initialData.businessProfileId) {
      setBusinessProfileId(String(initialData.business_profile_id || initialData.businessProfileId));
    } else if (defaultBusinessProfileId) {
      setBusinessProfileId(String(defaultBusinessProfileId));
    }
    if (initialData.about || initialData.description) {
      setAbout(initialData.about || initialData.description);
    }
    if (initialData.logo_url || initialData.logoUrl) {
      setLogoUrl(initialData.logo_url || initialData.logoUrl);
    }
    if (initialData.banner_url || initialData.bannerUrl) {
      setBannerUrl(initialData.banner_url || initialData.bannerUrl);
    }
    if (initialData.gallery_images || initialData.galleryImages) {
      setGalleryImages(initialData.gallery_images || initialData.galleryImages || []);
    }
    if (initialData.opening_hours || initialData.openingHours) {
      setOpeningHours(initialData.opening_hours || initialData.openingHours);
    }

    // Populate branches if present, else construct main branch from top-level fields
    if (Array.isArray(initialData.branches) && initialData.branches.length > 0) {
      setBranches(
        initialData.branches.map((b: any, idx: number) => ({
          id: b.id ? String(b.id) : String(Date.now() + idx),
          name: b.name || (idx === 0 ? "Main Branch / Head Office" : `Branch ${idx + 1}`),
          is_main: idx === 0,
          country_code: b.country_code || (initialData.country_code as any) || "IN",
          location_search: b.location_search || b.address || "",
          city: b.city || "",
          state: b.state || "",
          district: b.district || "",
          locality: b.locality || "",
          address: b.address || "",
          postal_code: b.postal_code || b.postalCode || "",
          latitude: b.latitude ? String(b.latitude) : "",
          longitude: b.longitude ? String(b.longitude) : "",
          phone: b.phone || "",
          whatsapp: b.whatsapp || "",
          email: b.email || "",
          social_links: Array.isArray(b.social_links)
            ? b.social_links
            : Object.entries(b.social_links || initialData.social_links || {}).map(
                ([platform, url], sIdx) => ({
                  id: String(sIdx),
                  platform,
                  url: String(url),
                })
              ),
        }))
      );
    } else {
      // Build main branch from root properties
      const mainB = createDefaultBranch();
      mainB.country_code = (initialData.country_code as any) || "IN";
      mainB.city = initialData.city || "";
      mainB.state = initialData.state || "";
      mainB.district = initialData.district || "";
      mainB.locality = initialData.locality || "";
      mainB.address = initialData.address || "";
      mainB.postal_code = initialData.postal_code || initialData.postalCode || "";
      mainB.latitude = initialData.latitude ? String(initialData.latitude) : "";
      mainB.longitude = initialData.longitude ? String(initialData.longitude) : "";
      mainB.phone = initialData.phone || "";
      mainB.whatsapp = initialData.whatsapp || "";
      mainB.email = initialData.email || "";
      if (initialData.social_links && typeof initialData.social_links === "object") {
        mainB.social_links = Object.entries(initialData.social_links).map(
          ([platform, url], sIdx) => ({
            id: String(sIdx),
            platform,
            url: String(url),
          })
        );
      }
      setBranches([mainB]);
    }
  }, [open, initialData]);

  const isProfessional = businessType.toLowerCase() === "professional";

  // Categories for the first dropdown: Professional categories when isProfessional, or Business categories when Business
  const availableFirstCategories = useMemo(() => {
    if (isProfessional) {
      if (professionalCategories.length > 0) {
        return professionalCategories.filter((c: any) => c.category_type === "professional");
      }
      const profRoots = subcategories.filter(
        (s) => s.category_type === "professional" && (!s.parent_id || s.depth === 1 || s.depth === 0)
      );
      if (profRoots.length > 0) return profRoots;
      return subcategories.filter((s) => s.category_type === "professional");
    }

    // STRICT FILTER: Only Business Categories (exclude academic, bachelors, classes, exams, etc.)
    const sourceList = (categories.length > 0 ? categories : subcategories) || [];
    const bizOnly = sourceList.filter((c: any) => {
      const isBizType = c.category_type === "business";
      const isPriorityName = PRIORITY_BUSINESS_ROOTS.some((p) => p.toLowerCase() === (c.name || "").toLowerCase());
      const isRoot = !c.parent_id || c.depth === 1 || c.depth === 0;
      const isAcademic =
        c.category_type === "academic" ||
        /^(bachelors|masters|phd|class\s*\(\d|competitive\s*exam|diploma|government\s*exam|pre\s*school|professional\s*course)/i.test(c.name || "");

      return (isBizType || isPriorityName) && isRoot && !isAcademic;
    });

    return bizOnly.sort((a: any, b: any) => {
      const aIdx = PRIORITY_BUSINESS_ROOTS.findIndex((p) => p.toLowerCase() === (a.name || "").toLowerCase());
      const bIdx = PRIORITY_BUSINESS_ROOTS.findIndex((p) => p.toLowerCase() === (b.name || "").toLowerCase());
      if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
      if (aIdx !== -1) return -1;
      if (bIdx !== -1) return 1;
      return (a.name || "").localeCompare(b.name || "");
    });
  }, [isProfessional, professionalCategories, categories, subcategories]);

  // Dynamic fetch when a category is selected
  useEffect(() => {
    if (!categoryId || categoryId === "none") {
      setDynamicSubcategories([]);
      return;
    }
    let isCancelled = false;
    setLoadingSubcategories(true);
    fetch(`/api/admin/institutions/create-business?parent_id=${categoryId}`, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isCancelled && data?.subcategories) {
          setDynamicSubcategories(data.subcategories);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!isCancelled) setLoadingSubcategories(false);
      });
    return () => {
      isCancelled = true;
    };
  }, [categoryId, accessToken]);

  // Second dropdown: Subcategories under the chosen category
  const filteredSubcategories = useMemo(() => {
    if (!categoryId || categoryId === "none") return [];

    if (dynamicSubcategories.length > 0) return dynamicSubcategories;

    const catIdNum = Number(categoryId);

    if (isProfessional) {
      // Find professional subcategories under this selected professional category
      const directChildren = subcategories.filter(
        (s) =>
          s.category_type === "professional" &&
          (Number(s.parent_id) === catIdNum || Number(s.business_category_id) === catIdNum)
      );
      return directChildren;
    } else {
      // For Business: show business subcategories under this parent category
      return subcategories.filter(
        (s) =>
          (s.category_type === "business" || !s.category_type) &&
          (Number(s.parent_id) === catIdNum || Number(s.business_category_id) === catIdNum)
      );
    }
  }, [categoryId, dynamicSubcategories, isProfessional, subcategories]);

  // Skill tag handlers
  const handleAddSkill = () => {
    if (!skillInput.trim()) return;
    const splitSkills = skillInput
      .split(/[,+]/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setSkills((prev) => {
      const existing = new Set(prev.map((s) => s.toLowerCase()));
      const toAdd = splitSkills.filter((s) => !existing.has(s.toLowerCase()));
      return [...prev, ...toAdd];
    });
    setSkillInput("");
  };

  const handleRemoveSkill = (index: number) => {
    setSkills((prev) => prev.filter((_, i) => i !== index));
  };

  // Branch CRUD handlers
  const updateBranch = (index: number, patch: Partial<BranchData>) => {
    setBranches((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...patch };
      return copy;
    });
  };

  const handleAddBranch = () => {
    const nextIdx = branches.length + 1;
    const newB = createDefaultBranch(`Branch ${nextIdx}`, false);
    setBranches((prev) => [...prev, newB]);
    setActiveBranchIdx(branches.length);
    toast.success(`Branch ${nextIdx} added`);
  };

  const handleRemoveBranch = (index: number) => {
    if (branches.length <= 1) {
      toast.error("You must have at least one branch");
      return;
    }
    setBranches((prev) => prev.filter((_, i) => i !== index));
    if (activeBranchIdx >= index) {
      setActiveBranchIdx(Math.max(0, activeBranchIdx - 1));
    }
    toast.success("Branch removed");
  };

  // Social link add/remove per branch
  const handleAddSocialLink = (branchIndex: number) => {
    if (!newSocialUrl.trim()) {
      toast.error("Please enter a valid URL link");
      return;
    }
    const currentLinks = branches[branchIndex]?.social_links || [];
    const updated = [
      ...currentLinks,
      {
        id: String(Date.now() + Math.random()),
        platform: newSocialPlatform,
        url: newSocialUrl.trim(),
      },
    ];
    updateBranch(branchIndex, { social_links: updated });
    setNewSocialUrl("");
    toast.success(`${newSocialPlatform} link added to branch`);
  };

  const handleRemoveSocialLink = (branchIndex: number, linkId: string) => {
    const currentLinks = branches[branchIndex]?.social_links || [];
    const updated = currentLinks.filter((l) => l.id !== linkId);
    updateBranch(branchIndex, { social_links: updated });
  };

  // Google Maps / Live Location Search per Branch
  const searchLocationForBranch = async (branchIndex: number, query: string, country: "IN" | "US") => {
    if (!query.trim() || query.length < 2) {
      setBranchLocationSuggestions([]);
      setShowLocationDropdownIdx(null);
      return;
    }
    setSearchingLocationBranchIdx(branchIndex);
    try {
      if (typeof window !== "undefined" && window.google?.maps?.places?.AutocompleteService) {
        const service = new window.google.maps.places.AutocompleteService();
        service.getPlacePredictions(
          {
            input: query,
            componentRestrictions: { country: country.toLowerCase() },
          },
          (predictions: any[], status: any) => {
            if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions?.length) {
              const mapped = predictions.slice(0, 5).map((p) => ({
                id: p.place_id,
                name: p.structured_formatting?.main_text || p.description,
                formatted_address: p.description,
                place_id: p.place_id,
              }));
              setBranchLocationSuggestions(mapped);
              setShowLocationDropdownIdx(branchIndex);
              setSearchingLocationBranchIdx(null);
            }
          }
        );
      }

      // Nominatim fallback with selected country
      const countryFilter = country === "IN" ? "countrycodes=in" : "countrycodes=us";
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&${countryFilter}&q=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const mapped = data.map((item: any) => {
          const addr = item.address || {};
          return {
            id: item.place_id,
            name: item.name || addr.road || addr.suburb || addr.city || query,
            formatted_address: item.display_name,
            lat: item.lat,
            lon: item.lon,
            city: addr.city || addr.town || addr.village || addr.county || "",
            state: addr.state || "",
            district: addr.state_district || addr.county || "",
            locality: addr.suburb || addr.neighbourhood || addr.residential || "",
            road: addr.road || "",
            pincode: addr.postcode || "",
          };
        });
        setBranchLocationSuggestions(mapped);
        setShowLocationDropdownIdx(branchIndex);
      }
    } catch (err) {
      console.warn("Branch location search error:", err);
    } finally {
      setSearchingLocationBranchIdx(null);
    }
  };

  const handleSelectBranchSuggestion = (branchIndex: number, item: any) => {
    const targetBranch = branches[branchIndex];
    if (!targetBranch) return;

    updateBranch(branchIndex, {
      location_search: item.name || item.formatted_address,
      city: item.city || targetBranch.city,
      state: item.state || targetBranch.state,
      district: item.district || targetBranch.district,
      locality: item.locality || targetBranch.locality,
      postal_code: item.pincode || targetBranch.postal_code,
      address: item.road
        ? `${item.name ? item.name + ", " : ""}${item.road}`
        : item.formatted_address.split(",")[0],
      latitude: item.lat ? String(item.lat) : targetBranch.latitude,
      longitude: item.lon ? String(item.lon) : targetBranch.longitude,
    });
    setShowLocationDropdownIdx(null);
    toast.success("Location details populated for branch");
  };

  // Upload image handler
  const handleUploadImage = async (file: File, type: "logo" | "banner" | "gallery") => {
    if (!file) return;
    if (type === "logo") setUploadingLogo(true);
    else if (type === "banner") setUploadingBanner(true);
    else setUploadingGallery(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append(
        "folder",
        type === "logo" ? "business/logos" : type === "banner" ? "business/banners" : "business/gallery"
      );

      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload image");

      const url = data.data?.url || data.url;
      if (url) {
        if (type === "logo") {
          setLogoUrl(url);
          toast.success("Logo uploaded successfully");
        } else if (type === "banner") {
          setBannerUrl(url);
          toast.success("Cover banner uploaded successfully");
        } else {
          setGalleryImages((prev) => [...prev, url]);
          toast.success("Gallery photo added successfully");
        }
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      if (type === "logo") setUploadingLogo(false);
      else if (type === "banner") setUploadingBanner(false);
      else setUploadingGallery(false);
    }
  };

  // Copy Monday's hours to all weekdays
  const copyMondayHoursToWeekdays = () => {
    const mondayHours = openingHours["Monday"];
    if (!mondayHours) return;
    setOpeningHours((prev) => ({
      ...prev,
      Tuesday: { ...mondayHours },
      Wednesday: { ...mondayHours },
      Thursday: { ...mondayHours },
      Friday: { ...mondayHours },
    }));
    toast.success("Applied Monday hours to all weekdays (Tue-Fri)");
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    if (!cleanName) {
      toast.error("Listing name is required");
      setActiveTab("overview");
      return;
    }

    const mainBranch = branches[0] || createDefaultBranch();

    // Map main branch social links to record for backwards compatibility
    const mainSocialLinks: Record<string, string> = {};
    (mainBranch.social_links || []).forEach((sl) => {
      if (sl.platform && sl.url) {
        mainSocialLinks[sl.platform] = sl.url;
      }
    });

    setSubmitting(true);
    try {
      const payload = {
        name: cleanName,
        businessType,
        institutionTypeId: institutionTypeId ? Number(institutionTypeId) : undefined,
        categoryId: categoryId ? Number(categoryId) : undefined,
        subcategoryId: subcategoryId ? Number(subcategoryId) : undefined,
        about: about.trim() || undefined,
        establishedYear: establishedYear ? Number(establishedYear) : undefined,
        logoUrl: logoUrl.trim() || undefined,
        bannerUrl: bannerUrl.trim() || undefined,
        galleryImages,

        // Primary Branch Location (silently preserves coordinates in DB)
        countryCode: mainBranch.country_code,
        state: mainBranch.state.trim() || undefined,
        district: mainBranch.district?.trim() || undefined,
        city: mainBranch.city.trim() || undefined,
        locality: mainBranch.locality?.trim() || undefined,
        postalCode: mainBranch.postal_code.trim() || undefined,
        address: mainBranch.address.trim() || undefined,
        latitude: mainBranch.latitude ? Number(mainBranch.latitude) : undefined,
        longitude: mainBranch.longitude ? Number(mainBranch.longitude) : undefined,

        // Primary Branch Contact Details
        phone: mainBranch.phone.trim() || undefined,
        whatsapp: mainBranch.whatsapp.trim() || undefined,
        email: mainBranch.email.trim() || undefined,
        website: mainSocialLinks["website"] || undefined,
        socialLinks: mainSocialLinks,

        // Working Hours & All Multiple Branches (full data persistence)
        openingHours,
        branches,

        isActive,
        isFeatured,
        isVerified,
        profileType: businessType.toLowerCase() === "professional" ? "professional" : "business",
        businessProfileId: businessType.toLowerCase() === "professional" && businessProfileId && businessProfileId !== "none" ? Number(businessProfileId) : undefined,
        designation: businessType.toLowerCase() === "professional" ? designation.trim() || undefined : undefined,
        skills: businessType.toLowerCase() === "professional" ? skills : undefined,
        experienceYears: businessType.toLowerCase() === "professional" ? Number(experienceYears) || 0 : undefined,
      };

      const res = await fetch("/api/admin/institutions/create-business", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create business listing");
      }

      const created = data.data;
      if (created?.id) {
        setStoredActiveInstitutionId(Number(created.id), {
          id: Number(created.id),
          name: created.name,
          roleName: isProfessional ? "Professional Provider" : "Business Owner",
        });
      }

      toast.success(isEditMode ? "Listing updated successfully!" : "Business listing created successfully!");
      onOpenChange(false);

      if (onSuccess && created) {
        onSuccess(created);
      } else {
        setTimeout(() => {
          window.location.href = "/workspace";
        }, 300);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Error saving listing");
    } finally {
      setSubmitting(false);
    }
  };

  const tabsList = ["overview", "branches", "hours", "images"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 gap-0 border-border/80 shadow-2xl">
        {/* MODAL HEADER */}
        <div className="p-5 border-b flex items-start justify-between bg-card">
          <div className="flex items-center gap-3">
            <div className={`flex size-11 items-center justify-center rounded-xl ${businessType.toLowerCase() === "professional" ? "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border-purple-200/50" : "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border-blue-200/50"} border shadow-xs`}>
              {businessType.toLowerCase() === "professional" ? <Briefcase className="size-6" /> : <Building2 className="size-6" />}
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <span>
                  {name.trim() ||
                    (isEditMode
                      ? businessType.toLowerCase() === "professional"
                        ? "Edit Professional Profile"
                        : "Edit Business Listing"
                      : businessType.toLowerCase() === "professional"
                      ? "New Professional Listing"
                      : "New Business Listing")}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  ({isEditMode ? "Edit" : "Draft"} • /{name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || (businessType.toLowerCase() === "professional" ? "new-professional" : "new-business")})
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {businessType.toLowerCase() === "professional"
                  ? "Professional Profile Management"
                  : "Business Listing Management"}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-2 mr-6">
            <Badge
              variant="outline"
              className={
                isVerified
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : "bg-amber-50 text-amber-700 border-amber-300"
              }
            >
              {isVerified ? "✓ Verified" : "⚠ Unverified"}
            </Badge>
          </div>
        </div>

        {/* FORM CONTENT */}
        <form onSubmit={handleSubmit} className="flex flex-col">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* TABS HEADER: 4 TABS ONLY */}
            <div className="px-5 pt-3 pb-2 border-b bg-muted/30">
              <TabsList className="w-full grid grid-cols-4 p-1 bg-muted/60 h-auto gap-1">
                <TabsTrigger
                  value="overview"
                  className="text-xs font-semibold py-2 data-[state=active]:bg-[#d9232e] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="branches"
                  className="text-xs font-semibold py-2 data-[state=active]:bg-[#d9232e] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                >
                  Branches ({branches.length})
                </TabsTrigger>
                <TabsTrigger
                  value="hours"
                  className="text-xs font-semibold py-2 data-[state=active]:bg-[#d9232e] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                >
                  Hours
                </TabsTrigger>
                <TabsTrigger
                  value="images"
                  className="text-xs font-semibold py-2 data-[state=active]:bg-[#d9232e] data-[state=active]:text-white data-[state=active]:shadow-sm transition-all"
                >
                  Images
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-5 space-y-4">
              {/* ================= TAB 1: OVERVIEW ================= */}
              <TabsContent value="overview" className="mt-0 space-y-4">
                <div className="border rounded-xl p-4 bg-card shadow-xs space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Row 1 Col 1: Listing Name */}
                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        LISTING NAME <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        placeholder={isProfessional ? "e.g. Dr. Rajesh Sharma / Advocate Priya Mehta" : "e.g. Apex Institute of Technology"}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-9 text-xs font-medium"
                        required
                      />
                    </div>

                    {/* Row 1 Col 2: Listing Type */}
                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        LISTING TYPE
                      </Label>
                      <Select
                        value={businessType}
                        onValueChange={(val) => {
                          setBusinessType(val);
                          setCategoryId("");
                          setSubcategoryId("");
                          setDynamicSubcategories([]);
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {LISTING_TYPE_OPTIONS.map((lt) => (
                            <SelectItem key={lt} value={lt}>
                              {lt}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Row 2 Col 1: Category (Professional Category if Professional, Main/Business Category if Business) */}
                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        {isProfessional ? "PROFESSIONAL CATEGORY" : "MAIN CATEGORY"}
                      </Label>
                      <Select
                        value={categoryId || undefined}
                        onValueChange={(val) => {
                          const nextVal = val === "none" ? "" : val;
                          setCategoryId(nextVal);
                          setSubcategoryId("");
                          setDynamicSubcategories([]);

                          if (nextVal && institutionTypes?.length > 0) {
                            const selectedCat = availableFirstCategories.find((c) => String(c.id) === nextVal);
                            if (selectedCat) {
                              const norm = (selectedCat.name + " " + (selectedCat.slug || "")).toLowerCase();
                              let matched: any = null;
                              if (norm.includes("digital") || /\b(it|agency|agencies|software|tech|developer|development|cyber)\b/i.test(norm)) {
                                matched = institutionTypes.find((t: any) => t.slug === "it-digital-agency" || t.name.toLowerCase() === "it & digital agency");
                              } else if (/\b(health|healthcare|clinic|medical|doctor|hospital|dental|pharmacy)\b/i.test(norm) && !norm.includes("hospitality")) {
                                matched = institutionTypes.find((t: any) => t.slug === "healthcare-clinic" || t.name.toLowerCase().includes("healthcare"));
                              } else if (/\b(retail|shopping|commerce|store|mart|market|shop|grocer|salon|spa|boutique|cloth|fashion|automotive|transport|dining|cafe|food)\b/i.test(norm)) {
                                matched = institutionTypes.find((t: any) => t.slug === "retail-commerce" || t.name.toLowerCase().includes("retail"));
                              } else if (/\b(professional|financial|finance|tax|legal|law|audit|consult|accounting|advocate|services|maintenance|construction|real estate)\b/i.test(norm)) {
                                matched = institutionTypes.find((t: any) => t.slug === "professional-services" || t.name.toLowerCase().includes("professional services"));
                              } else if (/\b(coaching|tuition|entrance|competitive)\b/i.test(norm)) {
                                matched = institutionTypes.find((t: any) => t.slug === "coaching" || t.name.toLowerCase().includes("coaching"));
                              } else if (/\b(school|k12|cbse|icse|secondary|primary|matric)\b/i.test(norm)) {
                                matched = institutionTypes.find((t: any) => t.slug === "school" || t.name.toLowerCase() === "school");
                              } else if (/\b(college|degree|undergraduate)\b/i.test(norm)) {
                                matched = institutionTypes.find((t: any) => t.slug === "college" || t.name.toLowerCase() === "college");
                              } else if (/\b(university|campus)\b/i.test(norm)) {
                                matched = institutionTypes.find((t: any) => t.slug === "university" || t.name.toLowerCase() === "university");
                              } else if (/\b(institute|institution|academy|training)\b/i.test(norm)) {
                                matched = institutionTypes.find((t: any) => t.slug === "institute" || t.name.toLowerCase() === "institute");
                              }
                              if (matched) {
                                setInstitutionTypeId(String(matched.id));
                              }
                            }
                          }
                        }}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder={loadingMetadata ? "Loading categories..." : isProfessional ? "Select Professional Category..." : "Select Main Category..."} />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {availableFirstCategories.length === 0 ? (
                            <div className="p-2 text-xs text-muted-foreground text-center">
                              {loadingMetadata ? "Loading categories..." : "No categories found"}
                            </div>
                          ) : (
                            availableFirstCategories.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>
                                {c.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Row 2 Col 2: Subcategory (populated dynamically based on the chosen category) */}
                    <div>
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        SUB CATEGORY
                      </Label>
                      <Select
                        value={subcategoryId || undefined}
                        onValueChange={(val) => setSubcategoryId(val === "none" ? "" : val)}
                        disabled={!categoryId || categoryId === "none" || (filteredSubcategories.length === 0 && !loadingSubcategories)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue
                            placeholder={
                              !categoryId || categoryId === "none"
                                ? isProfessional
                                  ? "Choose Professional Category first"
                                  : "Choose Main Category first"
                                : loadingSubcategories
                                ? "Loading subcategories..."
                                : filteredSubcategories.length === 0
                                ? "No subcategories available"
                                : "Select Sub Category..."
                            }
                          />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {filteredSubcategories.map((sc) => (
                            <SelectItem key={sc.id} value={String(sc.id)}>
                              {sc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Professional Fields: Designation, Experience & Skills */}
                {isProfessional && (
                  <div className="border rounded-xl p-4 bg-card shadow-xs space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Designation */}
                      <div>
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                          DESIGNATION / TITLE
                        </Label>
                        <Input
                          placeholder="e.g. Senior Software Architect / Consultant Cardiologist / Advocate"
                          value={designation}
                          onChange={(e) => setDesignation(e.target.value)}
                          className="h-9 text-xs font-medium bg-background"
                        />
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">
                          Official title or professional designation.
                        </span>
                      </div>

                      {/* Years of Experience */}
                      <div>
                        <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                          YEARS OF EXPERIENCE
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          max="70"
                          placeholder="e.g. 5"
                          value={experienceYears || ""}
                          onChange={(e) => setExperienceYears(Math.max(0, Number(e.target.value) || 0))}
                          className="h-9 text-xs font-medium bg-background"
                        />
                        <span className="text-[10px] text-muted-foreground mt-0.5 block">
                          Total years of professional experience.
                        </span>
                      </div>
                    </div>

                    {/* Skills Input with Badges/Chips */}
                    <div className="space-y-2 pt-1">
                      <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                        SKILLS & SPECIALIZATIONS
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Type skill and press Enter (or comma-separated e.g. React, UI/UX, SEO)..."
                          value={skillInput}
                          onChange={(e) => setSkillInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddSkill();
                            }
                          }}
                          className="h-9 text-xs bg-background"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={handleAddSkill}
                          className="h-9 text-xs font-semibold px-4 shrink-0 bg-primary/10 hover:bg-primary/20 text-primary"
                        >
                          <Plus className="size-3.5 mr-1" /> Add Skill
                        </Button>
                      </div>

                      {/* Skills Badges Chips */}
                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1.5">
                          {skills.map((skill, sIdx) => (
                            <Badge
                              key={sIdx}
                              variant="secondary"
                              className="pl-2.5 pr-1.5 py-1 text-xs font-medium bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5"
                            >
                              <span>{skill}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveSkill(sIdx)}
                                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                                title="Remove skill"
                              >
                                <X className="size-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Full Description (Optional) */}
                <div className="border rounded-xl p-4 bg-card shadow-xs space-y-2">
                  <div>
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                      FULL DESCRIPTION <span className="text-muted-foreground font-normal">(optional)</span>
                    </Label>
                    <Textarea
                      placeholder="Describe your organization, history, mission, services, products, or specialities..."
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      rows={3}
                      className="text-xs"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* ================= TAB 2: BRANCHES ================= */}
              <TabsContent value="branches" className="mt-0 space-y-4">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                      <GitBranch className="size-4 text-rose-600" />
                      Branch & Office Locations ({branches.length})
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Configure your headquarters and multiple branch locations with Google Maps, contact details, and social links.
                    </p>
                  </div>
                  <Button
                    type="button"
                    onClick={handleAddBranch}
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-xs font-bold border-rose-200 text-rose-700 hover:bg-rose-50 h-8"
                  >
                    <Plus className="size-3.5" /> Add Another Branch
                  </Button>
                </div>

                {/* Branch Selection Pills (if multiple branches) */}
                {branches.length > 1 && (
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    {branches.map((b, bIdx) => (
                      <button
                        key={b.id || bIdx}
                        type="button"
                        onClick={() => setActiveBranchIdx(bIdx)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                          activeBranchIdx === bIdx
                            ? "bg-[#d9232e] text-white shadow-xs"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span>{b.name || `Branch ${bIdx + 1}`}</span>
                        {b.is_main && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/20 text-white font-normal">
                            Main
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}

                {/* Active Branch Editor Card */}
                {branches.map((b, bIdx) => {
                  if (bIdx !== activeBranchIdx) return null;
                  const dialCode = b.country_code === "US" ? "+1" : "+91";

                  return (
                    <div key={b.id || bIdx} className="border rounded-xl p-4 bg-card shadow-xs space-y-4">
                      {/* Branch Header Row */}
                      <div className="flex items-center justify-between border-b pb-3">
                        <div className="flex items-center gap-2 flex-1 max-w-sm">
                          <Label className="text-xs font-bold shrink-0">Branch Name:</Label>
                          <Input
                            placeholder="e.g. Main Office / Bandra Branch"
                            value={b.name}
                            onChange={(e) => updateBranch(bIdx, { name: e.target.value })}
                            className="h-8 text-xs font-semibold"
                          />
                        </div>

                        <div className="flex items-center gap-2">
                          {b.is_main ? (
                            <Badge className="bg-rose-500/10 text-rose-700 border-rose-200 text-[10px]">
                              Primary / Head Office
                            </Badge>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs text-rose-600 hover:bg-rose-50 h-8 gap-1"
                              onClick={() => handleRemoveBranch(bIdx)}
                            >
                              <Trash2 className="size-3.5" /> Remove Branch
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* SECTION 1: GOOGLE MAPS LOCATION */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <MapPin className="size-3.5 text-red-600" /> Geographic Location & Address
                          </span>
                          <div className="flex items-center gap-2">
                            <Label className="text-xs font-semibold">Country:</Label>
                            <Select
                              value={b.country_code}
                              onValueChange={(val: "IN" | "US") =>
                                updateBranch(bIdx, { country_code: val })
                              }
                            >
                              <SelectTrigger className="h-7 w-36 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="IN">India (+91)</SelectItem>
                                <SelectItem value="US">United States (+1)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Google Maps / Live Suggestion Search */}
                        <div className="relative">
                          <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                            Search Address on Google Maps / Live Suggestion
                          </Label>
                          <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                            <Input
                              placeholder="Type street, landmark, or area for live Google Map suggestions..."
                              value={b.location_search || ""}
                              onChange={(e) => {
                                updateBranch(bIdx, { location_search: e.target.value });
                                searchLocationForBranch(bIdx, e.target.value, b.country_code);
                              }}
                              className="pl-8 h-9 text-xs"
                            />
                            {searchingLocationBranchIdx === bIdx && (
                              <Loader2 className="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 animate-spin text-muted-foreground" />
                            )}
                          </div>

                          {/* Autocomplete Dropdown */}
                          {showLocationDropdownIdx === bIdx && branchLocationSuggestions.length > 0 && (
                            <div className="absolute z-50 left-0 right-0 mt-1 bg-popover text-popover-foreground border rounded-lg shadow-lg overflow-hidden max-h-52 overflow-y-auto">
                              {branchLocationSuggestions.map((item, sIdx) => (
                                <button
                                  key={item.id || sIdx}
                                  type="button"
                                  onClick={() => handleSelectBranchSuggestion(bIdx, item)}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-muted/70 flex items-start gap-2 border-b last:border-b-0 transition-colors cursor-pointer"
                                >
                                  <MapPin className="size-3.5 text-red-500 shrink-0 mt-0.5" />
                                  <div>
                                    <p className="font-semibold text-foreground">{item.name}</p>
                                    <p className="text-[11px] text-muted-foreground truncate max-w-lg">
                                      {item.formatted_address}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Location Fields Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                          <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              City *
                            </Label>
                            <Input
                              placeholder={b.country_code === "US" ? "e.g. New York" : "e.g. Mumbai"}
                              value={b.city}
                              onChange={(e) => updateBranch(bIdx, { city: e.target.value })}
                              className="h-8 text-xs"
                              required
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              State / Region
                            </Label>
                            <Input
                              placeholder={b.country_code === "US" ? "e.g. NY" : "e.g. Maharashtra"}
                              value={b.state}
                              onChange={(e) => updateBranch(bIdx, { state: e.target.value })}
                              className="h-8 text-xs"
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              {b.country_code === "US" ? "County" : "District"}
                            </Label>
                            <Input
                              placeholder="District / County"
                              value={b.district}
                              onChange={(e) => updateBranch(bIdx, { district: e.target.value })}
                              className="h-8 text-xs"
                            />
                          </div>

                          <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              Locality / Area
                            </Label>
                            <Input
                              placeholder="e.g. Andheri West"
                              value={b.locality}
                              onChange={(e) => updateBranch(bIdx, { locality: e.target.value })}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="col-span-2">
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              Street Address
                            </Label>
                            <Input
                              placeholder="Office / Building name, street, road, landmark..."
                              value={b.address}
                              onChange={(e) => updateBranch(bIdx, { address: e.target.value })}
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              {b.country_code === "US" ? "ZIP Code" : "PIN Code"}
                            </Label>
                            <Input
                              placeholder={b.country_code === "US" ? "10001" : "400053"}
                              value={b.postal_code}
                              onChange={(e) => updateBranch(bIdx, { postal_code: e.target.value })}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* SECTION 2: CONTACT DETAILS WITH DYNAMIC COUNTRY CODE */}
                      <div className="space-y-3 border-t pt-3">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                          <Phone className="size-3.5 text-emerald-600" /> Branch Contact Information
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              Contact Phone ({dialCode})
                            </Label>
                            <div className="flex">
                              <span className="inline-flex items-center px-2.5 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-xs font-semibold">
                                {dialCode}
                              </span>
                              <Input
                                placeholder="Phone number..."
                                value={b.phone}
                                onChange={(e) => updateBranch(bIdx, { phone: e.target.value })}
                                className="rounded-l-none h-8 text-xs font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              WhatsApp Number ({dialCode})
                            </Label>
                            <div className="flex">
                              <span className="inline-flex items-center px-2.5 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-xs font-semibold">
                                {dialCode}
                              </span>
                              <Input
                                placeholder="WhatsApp number..."
                                value={b.whatsapp}
                                onChange={(e) => updateBranch(bIdx, { whatsapp: e.target.value })}
                                className="rounded-l-none h-8 text-xs font-mono"
                              />
                            </div>
                          </div>

                          <div>
                            <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block mb-1">
                              Email Address
                            </Label>
                            <Input
                              type="email"
                              placeholder="branch@business.com"
                              value={b.email}
                              onChange={(e) => updateBranch(bIdx, { email: e.target.value })}
                              className="h-8 text-xs"
                            />
                          </div>
                        </div>
                      </div>

                      {/* SECTION 3: SOCIAL MEDIA LINKS FOR BRANCH */}
                      <div className="space-y-3 border-t pt-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Share2 className="size-3.5 text-blue-600" /> Branch Social Media & Web Links
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {b.social_links.length} links added
                          </span>
                        </div>

                        {/* Add Social Link Inputs */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                          <div className="w-full sm:w-44">
                            <Select value={newSocialPlatform} onValueChange={setNewSocialPlatform}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {SOCIAL_PLATFORMS.map((p) => (
                                  <SelectItem key={p.value} value={p.value}>
                                    {p.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="relative flex-1">
                            <Input
                              placeholder="Enter platform profile URL link (https://...)"
                              value={newSocialUrl}
                              onChange={(e) => setNewSocialUrl(e.target.value)}
                              className="h-8 text-xs font-mono"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleAddSocialLink(bIdx);
                                }
                              }}
                            />
                          </div>

                          <Button
                            type="button"
                            onClick={() => handleAddSocialLink(bIdx)}
                            size="sm"
                            className="h-8 text-xs font-semibold gap-1 shrink-0"
                          >
                            <Plus className="size-3" /> Add Link
                          </Button>
                        </div>

                        {/* List of Added Social Media Links */}
                        {b.social_links.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-1">
                            {b.social_links.map((link) => (
                              <div
                                key={link.id}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border bg-muted/40 text-xs"
                              >
                                <span className="font-bold text-foreground capitalize">
                                  {link.platform}:
                                </span>
                                <span className="font-mono text-[11px] text-muted-foreground truncate max-w-[200px]">
                                  {link.url}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSocialLink(bIdx, link.id)}
                                  className="text-muted-foreground hover:text-rose-600 transition-colors ml-1 cursor-pointer"
                                  title="Remove link"
                                >
                                  <X className="size-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </TabsContent>

              {/* ================= TAB 3: HOURS (DEDICATED) ================= */}
              <TabsContent value="hours" className="mt-0 space-y-4">
                <div className="border rounded-xl p-4 bg-card shadow-xs space-y-3.5">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <Clock className="size-3.5 text-amber-600" /> Weekly Operating Hours
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Set your weekly business hours for customer visibility.
                      </p>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={copyMondayHoursToWeekdays}
                      className="text-xs font-medium gap-1.5 h-7 border-dashed"
                    >
                      <Copy className="size-3" /> Copy Mon Hours to Weekdays
                    </Button>
                  </div>

                  <div className="space-y-2 divide-y divide-border/60">
                    {DAYS_OF_WEEK.map((day) => {
                      const h = openingHours[day] || { open: "09:00", close: "19:00", isClosed: false };
                      return (
                        <div key={day} className="pt-2 flex items-center justify-between gap-4 text-xs">
                          <span className="font-bold text-foreground w-28">{day}</span>

                          <div className="flex items-center gap-2 flex-1 justify-end">
                            <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground select-none">
                              <input
                                type="checkbox"
                                checked={h.isClosed}
                                onChange={(e) =>
                                  setOpeningHours((prev) => ({
                                    ...prev,
                                    [day]: { ...h, isClosed: e.target.checked },
                                  }))
                                }
                                className="rounded size-3.5 text-primary"
                              />
                              <span className="text-[11px] font-medium">Closed</span>
                            </label>

                            {!h.isClosed ? (
                              <div className="flex items-center gap-1.5">
                                <Input
                                  type="time"
                                  value={h.open}
                                  onChange={(e) =>
                                    setOpeningHours((prev) => ({
                                      ...prev,
                                      [day]: { ...h, open: e.target.value },
                                    }))
                                  }
                                  className="h-7 w-24 text-xs font-mono"
                                />
                                <span className="text-muted-foreground">to</span>
                                <Input
                                  type="time"
                                  value={h.close}
                                  onChange={(e) =>
                                    setOpeningHours((prev) => ({
                                      ...prev,
                                      [day]: { ...h, close: e.target.value },
                                    }))
                                  }
                                  className="h-7 w-24 text-xs font-mono"
                                />
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground italic w-[190px] text-center">
                                Not open on {day}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              {/* ================= TAB 4: IMAGES ================= */}
              <TabsContent value="images" className="mt-0 space-y-4">
                {/* Logo & Banner Section with Previews */}
                <div className="border rounded-xl p-4 bg-card shadow-xs space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 border-b pb-2">
                    <ImageIcon className="size-3.5 text-purple-600" /> Branding & Media Assets
                  </h4>

                  {/* Logo Preview & Input */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      BUSINESS LOGO
                    </Label>
                    <div className="flex items-center gap-3">
                      <div className="size-16 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden bg-muted/30 shrink-0">
                        {logoUrl ? (
                          <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                        ) : (
                          <Building2 className="size-6 text-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <Input
                          placeholder="https://.../logo.png"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          className="h-8 text-xs font-mono"
                        />
                        <div className="flex items-center gap-2">
                          <label className="cursor-pointer inline-flex items-center justify-center px-2.5 h-7 rounded-md border bg-muted hover:bg-muted/80 text-xs font-medium gap-1">
                            {uploadingLogo ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                            <span>Upload Logo</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingLogo}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadImage(f, "logo");
                              }}
                            />
                          </label>
                          {logoUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs text-rose-600 hover:bg-rose-50"
                              onClick={() => setLogoUrl("")}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Banner Preview & Input */}
                  <div className="space-y-2 border-t pt-3">
                    <Label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                      COVER BANNER IMAGE
                    </Label>
                    {bannerUrl ? (
                      <div className="aspect-[16/6] w-full rounded-lg border overflow-hidden relative group bg-muted/20">
                        <img src={bannerUrl} alt="Cover Banner" className="w-full h-full object-cover" />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="size-6 absolute top-2 right-2 opacity-80 hover:opacity-100"
                          onClick={() => setBannerUrl("")}
                          title="Remove Banner"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="https://.../banner.jpg"
                        value={bannerUrl}
                        onChange={(e) => setBannerUrl(e.target.value)}
                        className="h-8 text-xs font-mono flex-1"
                      />
                      <label className="cursor-pointer inline-flex items-center justify-center px-2.5 h-8 rounded-md border bg-muted hover:bg-muted/80 text-xs font-medium gap-1 shrink-0">
                        {uploadingBanner ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                        <span>Upload Banner</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingBanner}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadImage(f, "banner");
                          }}
                        />
                      </label>
                    </div>
                    <p className="text-[10px] text-muted-foreground">Recommended format: Landscape 16:9 or 1200x400 JPEG/WebP</p>
                  </div>
                </div>

                {/* Additional Gallery Images with Grid Previews */}
                <div className="border rounded-xl p-4 bg-card shadow-xs space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <ImageIcon className="size-3.5 text-teal-600" /> Gallery Images ({galleryImages.length})
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Upload storefront, office, products, and facility showcase images.
                      </p>
                    </div>
                    <label className="cursor-pointer inline-flex items-center justify-center px-2.5 h-7 rounded-md border bg-muted hover:bg-muted/80 text-xs font-medium gap-1">
                      {uploadingGallery ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                      <span>Add Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingGallery}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadImage(f, "gallery");
                        }}
                      />
                    </label>
                  </div>

                  {/* Gallery Grid */}
                  {galleryImages.length === 0 ? (
                    <div className="p-6 border-2 border-dashed rounded-xl text-center text-xs text-muted-foreground">
                      <ImageIcon className="size-8 mx-auto text-muted-foreground/40 mb-1" />
                      <p className="font-medium text-foreground">No gallery photos added yet</p>
                      <p className="text-[11px] text-muted-foreground">Upload images to showcase in your business gallery</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {galleryImages.map((imgUrl, gIdx) => (
                        <div key={gIdx} className="aspect-video rounded-lg border overflow-hidden relative group bg-muted/20">
                          <img src={imgUrl} alt={`Gallery ${gIdx + 1}`} className="w-full h-full object-cover" />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="size-5 absolute top-1 right-1 opacity-80 hover:opacity-100"
                            onClick={() => setGalleryImages(galleryImages.filter((_, i) => i !== gIdx))}
                            title="Remove image"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>

          {/* DIALOG FOOTER */}
          <DialogFooter className="p-4 border-t bg-muted/20 flex flex-row items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="text-xs"
            >
              Cancel
            </Button>

            <div className="flex items-center gap-2">
              {activeTab !== "overview" && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs font-medium"
                  onClick={() => {
                    const curIdx = tabsList.indexOf(activeTab);
                    if (curIdx > 0) setActiveTab(tabsList[curIdx - 1]);
                  }}
                >
                  ‹ Previous Tab
                </Button>
              )}

              {activeTab !== "images" && (
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="text-xs font-medium"
                  onClick={() => {
                    const curIdx = tabsList.indexOf(activeTab);
                    if (curIdx < tabsList.length - 1) setActiveTab(tabsList[curIdx + 1]);
                  }}
                >
                  Next Tab ›
                </Button>
              )}

              {/* In Edit mode: show Save Changes on all tabs.
                  In Create mode: show Create Listing ONLY on last tab ("images") */}
              {(isEditMode || activeTab === "images") && (
                <Button
                  type="submit"
                  size="sm"
                  disabled={submitting}
                  className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" />
                      {isEditMode ? "Saving Changes..." : "Creating Listing..."}
                    </>
                  ) : isEditMode ? (
                    "Save Changes"
                  ) : businessType === "Professional" ? (
                    "Create Professional Listing"
                  ) : (
                    "Create Business Listing"
                  )}
                </Button>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
