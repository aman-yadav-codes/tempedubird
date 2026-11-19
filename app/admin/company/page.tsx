"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
  Building2,
  BookOpen,
  CheckCircle2,
  Copyright,
  Eye,
  FileText,
  HelpCircle,
  Info,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Share2,
  ShieldCheck,
  Trash2,
  Clock,
  Sparkles,
  Target,
  Compass,
  User,
  School,
  Edit,
  CreditCard,
  Wallet,
  QrCode,
  IndianRupee,
  Copy,
  Check,
  Upload,
  Globe,
  ExternalLink,
  Briefcase,
  GraduationCap,
  Award,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";

import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";

type CompanyPageData = {
  id: number;
  slug: string;
  title: string;
  subtitle: string | null;
  content: string;
  metadata: Record<string, any> & {
    email?: string;
    phone?: string;
    working_hours?: string;
    address?: string;
    facebook?: string;
    twitter?: string;
    pinterest?: string;
    whatsapp?: string;
    instagram?: string;
    youtube?: string;
    linkedin?: string;
  };
  is_published: boolean;
  updated_at: string;
};

type FaqItem = {
  id: number;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  is_published: boolean;
};

export type PaymentMethodItem = {
  id: number;
  institution_id: number | null;
  name: string;
  method_type: string;
  display_name: string | null;
  upi_id: string | null;
  qr_code_url: string | null;
  bank_name: string | null;
  account_holder_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  branch_name: string | null;
  account_type: string;
  gateway_provider: string | null;
  merchant_id: string | null;
  instructions: string | null;
  convenience_fee_percent: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

const COMPANY_TABS = [
  { slug: "contact-branches", label: "Identity", icon: Building2 },
  { slug: "address", label: "Address", icon: MapPin },
  { slug: "working-hours", label: "Working Hours", icon: Clock },
];

const ALL_DETAILS_TABS = [
  { slug: "contact-branches", label: "Identity", icon: Building2 },
  { slug: "address", label: "Address", icon: MapPin },
  { slug: "working-hours", label: "Working Hours", icon: Clock },
  { slug: "about-institute", label: "About Us", icon: Info },
  { slug: "mission-vision-goal", label: "Mission, Vision & Goal", icon: Target },
  { slug: "about-founder", label: "About Founder", icon: User },
  { slug: "payment-methods", label: "Payment Methods", icon: CreditCard },
  { slug: "faqs", label: "FAQs", icon: HelpCircle },
  { slug: "privacy-policy", label: "Privacy Policy", icon: ShieldCheck },
  { slug: "terms-and-conditions", label: "Terms & Conditions", icon: FileText },
  { slug: "copyright-policy", label: "Copyright Policy", icon: Copyright },
  { slug: "refund-policy", label: "Refund Policy", icon: RefreshCw },
  { slug: "social-links", label: "Social Media Links", icon: Share2 },
];

const PAGE_TABS = [
  { slug: "payment-methods", label: "Payment Methods", icon: CreditCard },
  { slug: "faqs", label: "FAQs", icon: HelpCircle },
  { slug: "privacy-policy", label: "Privacy Policy", icon: ShieldCheck },
  { slug: "terms-and-conditions", label: "Terms & Conditions", icon: FileText },
  { slug: "copyright-policy", label: "Copyright Policy", icon: Copyright },
  { slug: "refund-policy", label: "Refund Policy", icon: RefreshCw },
  { slug: "social-links", label: "Social Media Links", icon: Share2 },
];

export default function AdminCompanyPage() {
  const { isReady } = useAdminGuard();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user, accessToken } = useAuthStore();
  const { activeInstitutionId, defaultEnvInstitutionId } = useActiveInstitution();
  const effectiveInstId = useMemo(() => {
    return activeInstitutionId || defaultEnvInstitutionId || (typeof window !== "undefined" ? (localStorage.getItem("edubird.activeInstitutionId") || localStorage.getItem("active_institution_id") || "") : "");
  }, [activeInstitutionId, defaultEnvInstitutionId]);
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isInstAdmin = isInstitutionAdminUser(user);
  const canAccessCompany = isPlatformAdmin || isInstAdmin;

  const rawTab = searchParams.get("tab");
  const tabFromUrl = rawTab || "contact-branches";
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl);

  const [loadingPages, setLoadingPages] = useState(false);
  const [pagesData, setPagesData] = useState<Record<string, CompanyPageData>>({});
  const [savingPage, setSavingPage] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // FAQ State
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loadingFaqs, setLoadingFaqs] = useState(false);
  const [faqDialogOpen, setFaqDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FaqItem | null>(null);
  const [faqQuestion, setFaqQuestion] = useState("");
  const [faqAnswer, setFaqAnswer] = useState("");
  const [faqCategory, setFaqCategory] = useState("General");
  const [faqOrder, setFaqOrder] = useState(0);
  const [faqPublished, setFaqPublished] = useState(true);
  const [savingFaq, setSavingFaq] = useState(false);

  // Hostel State
  const [hostels, setHostels] = useState<any[]>([]);
  const [loadingHostels, setLoadingHostels] = useState(false);
  const [hostelDialogOpen, setHostelDialogOpen] = useState(false);
  const [editingHostel, setEditingHostel] = useState<any | null>(null);
  const [hostelName, setHostelName] = useState("");
  const [hostelType, setHostelType] = useState("Boys");
  const [hostelCapacity, setHostelCapacity] = useState(150);
  const [hostelAvailableBeds, setHostelAvailableBeds] = useState(35);
  const [hostelAnnualFee, setHostelAnnualFee] = useState(55000);
  const [hostelRoomTypes, setHostelRoomTypes] = useState("Single, Double & Triple Sharing");
  const [hostelMessFacility, setHostelMessFacility] = useState("Four Meals Daily (Veg & Non-Veg)");
  const [hostelAcAvailable, setHostelAcAvailable] = useState(true);
  const [hostelWifiAvailable, setHostelWifiAvailable] = useState(true);
  const [hostelSecurityDeposit, setHostelSecurityDeposit] = useState(5000);
  const [hostelDescription, setHostelDescription] = useState("");
  const [hostelRules, setHostelRules] = useState("");
  const [savingHostel, setSavingHostel] = useState(false);

  // Library State
  const [libraries, setLibraries] = useState<any[]>([]);
  const [loadingLibraries, setLoadingLibraries] = useState(false);
  const [libraryDialogOpen, setLibraryDialogOpen] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<any | null>(null);
  const [libraryName, setLibraryName] = useState("");
  const [libraryTotalBooks, setLibraryTotalBooks] = useState(25000);
  const [libraryDigitalTitles, setLibraryDigitalTitles] = useState(8500);
  const [libraryJournalsSubscribed, setLibraryJournalsSubscribed] = useState(150);
  const [librarySeatingCapacity, setLibrarySeatingCapacity] = useState(350);
  const [libraryReadingHall, setLibraryReadingHall] = useState(true);
  const [libraryEResources, setLibraryEResources] = useState(true);
  const [libraryOpeningHours, setLibraryOpeningHours] = useState("8:00 AM - 10:00 PM");
  const [libraryBorrowingRules, setLibraryBorrowingRules] = useState("Students can issue up to 4 books for 14 days.");
  const [libraryLibrarianName, setLibraryLibrarianName] = useState("Head Librarian");
  const [libraryLibrarianEmail, setLibraryLibrarianEmail] = useState("");
  const [libraryLibrarianPhone, setLibraryLibrarianPhone] = useState("");
  const [libraryDescription, setLibraryDescription] = useState("");
  const [savingLibrary, setSavingLibrary] = useState(false);

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

  // Sync tab with URL
  useEffect(() => {
    if (tabFromUrl) {
      let normalizedTab = tabFromUrl === "branches" ? "address" : tabFromUrl;
      if (normalizedTab === "about-us") normalizedTab = "about-institute";
      if (normalizedTab === "mission-vision-goals") normalizedTab = "mission-vision-goal";
      if (normalizedTab !== activeTab) {
        setActiveTab(normalizedTab);
      }
    }
  }, [tabFromUrl, activeTab]);

  const basePath = pathname?.startsWith("/platformadmin")
    ? "/platformadmin/company"
    : pathname?.startsWith("/workspace")
      ? "/workspace/company"
      : "/admin/company";

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    router.push(`${basePath}?tab=${val}`);
  };

  const fetchHostels = useCallback(async () => {
    setLoadingHostels(true);
    try {
      const res = await fetch("/api/admin/institution/hostels", { headers: authHeader });
      if (res.ok) {
        const json = await res.json();
        setHostels(json.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch hostels:", e);
    } finally {
      setLoadingHostels(false);
    }
  }, [authHeader]);

  const fetchLibraries = useCallback(async () => {
    setLoadingLibraries(true);
    try {
      const res = await fetch("/api/admin/institution/libraries", { headers: authHeader });
      if (res.ok) {
        const json = await res.json();
        setLibraries(json.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch libraries:", e);
    } finally {
      setLoadingLibraries(false);
    }
  }, [authHeader]);

  // Branch State
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [branchName, setBranchName] = useState("");
  const [branchType, setBranchType] = useState("Regional Office");
  const [branchCity, setBranchCity] = useState("");
  const [branchState, setBranchState] = useState("");
  const [branchPincode, setBranchPincode] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [branchEmail, setBranchEmail] = useState("");
  const [branchMapUrl, setBranchMapUrl] = useState("");
  const [branchManagerName, setBranchManagerName] = useState("");
  const [branchStatus, setBranchStatus] = useState("active");
  const [branchIsHq, setBranchIsHq] = useState(false);
  const [savingBranch, setSavingBranch] = useState(false);
  const [branchAddressQuery, setBranchAddressQuery] = useState("");
  const [branchAddressSuggestions, setBranchAddressSuggestions] = useState<any[]>([]);
  const [showBranchSuggestions, setShowBranchSuggestions] = useState(false);
  const [searchingBranchAddress, setSearchingBranchAddress] = useState(false);
  const branchAddressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Platform Company Info State
  const DAYS_OF_WEEK = useMemo(
    () =>
      [
        { key: "monday", label: "Monday" },
        { key: "tuesday", label: "Tuesday" },
        { key: "wednesday", label: "Wednesday" },
        { key: "thursday", label: "Thursday" },
        { key: "friday", label: "Friday" },
        { key: "saturday", label: "Saturday" },
        { key: "sunday", label: "Sunday" },
      ] as const,
    []
  );

  const DEFAULT_OPENING_HOURS = useMemo(
    () => ({
      monday: { open: "09:00 AM", close: "07:00 PM", is_closed: false },
      tuesday: { open: "09:00 AM", close: "07:00 PM", is_closed: false },
      wednesday: { open: "09:00 AM", close: "07:00 PM", is_closed: false },
      thursday: { open: "09:00 AM", close: "07:00 PM", is_closed: false },
      friday: { open: "09:00 AM", close: "07:00 PM", is_closed: false },
      saturday: { open: "10:00 AM", close: "06:00 PM", is_closed: false },
      sunday: { open: "10:00 AM", close: "04:00 PM", is_closed: true },
    }),
    []
  );

  const TIME_SLOTS = useMemo(
    () => [
      "06:00 AM", "06:30 AM", "07:00 AM", "07:30 AM", "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM",
      "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "01:00 PM", "01:30 PM",
      "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM", "04:30 PM", "05:00 PM", "05:30 PM",
      "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM", "08:30 PM", "09:00 PM", "09:30 PM",
      "10:00 PM", "10:30 PM", "11:00 PM",
    ],
    []
  );

  const [companyInfo, setCompanyInfo] = useState({
    company_name: "EduBird Technologies Private Limited",
    brand_name: "EduBird Platform",
    logo_url: "",
    favicon_url: "",
    banner_url: "",
    gallery_images: [] as string[],
    tagline: "Empowering Next-Generation Business & Growth",
    listing_type: "business",
    category_id: null as number | null,
    subcategory_id: null as number | null,
    subcategory_ids: [] as number[],
    business_type: "",
    experience_years: "" as string | number,
    skills: "",
    qualifications: "",
    about_text: "",
    about: "",
    mission: "",
    vision: "",
    goal: "",
    founder_name: "",
    founder_title: "",
    founder_image_url: "",
    founder_about: "",
    established_year: "",
    certified_or_affiliated_with: "",
    support_email: "support@edubird.com",
    support_phone: "+91 98765 43210",
    helpline_toll_free: "1800 123 4567",
    website_url: "https://edubird.com",
    address_street: "",
    address_city: "",
    address_state: "",
    address_pincode: "",
    cin_number: "",
    gstin: "",
    working_hours: "Monday - Saturday: 9:00 AM - 6:00 PM",
    opening_hours: {
      monday: { open: "09:00 AM", close: "07:00 PM", is_closed: false },
      tuesday: { open: "09:00 AM", close: "07:00 PM", is_closed: false },
      wednesday: { open: "09:00 AM", close: "07:00 PM", is_closed: false },
      thursday: { open: "09:00 AM", close: "07:00 PM", is_closed: false },
      friday: { open: "09:00 AM", close: "07:00 PM", is_closed: false },
      saturday: { open: "10:00 AM", close: "06:00 PM", is_closed: false },
      sunday: { open: "10:00 AM", close: "04:00 PM", is_closed: true },
    } as Record<string, { open: string; close: string; is_closed: boolean }>,
  });
  const [businessCategories, setBusinessCategories] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [professionalCategories, setProfessionalCategories] = useState<{ id: number; name: string; slug: string }[]>([]);
  const [subcategories, setSubcategories] = useState<{ id: number; name: string; slug: string; parent_id: number }[]>([]);
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);
  const [loadingCompanyInfo, setLoadingCompanyInfo] = useState(false);
  const [savingCompanyInfo, setSavingCompanyInfo] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingFounderImage, setUploadingFounderImage] = useState(false);

  // Facilities State
  const [facilities, setFacilities] = useState<any[]>([]);
  const [facilityTypes, setFacilityTypes] = useState<any[]>([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [savingFacility, setSavingFacility] = useState(false);
  const [facilityDialogOpen, setFacilityDialogOpen] = useState(false);
  const [editingFacility, setEditingFacility] = useState<any | null>(null);
  const [facilityTitle, setFacilityTitle] = useState("");
  const [facilityTypeId, setFacilityTypeId] = useState<number | string>("");
  const [facilityDescription, setFacilityDescription] = useState("");
  const [facilityImageUrl, setFacilityImageUrl] = useState("");
  const [facilityIsActive, setFacilityIsActive] = useState(true);
  const [uploadingFacilityImage, setUploadingFacilityImage] = useState(false);

  const fetchFacilitiesData = useCallback(async () => {
    setLoadingFacilities(true);
    try {
      const res = await fetch("/api/admin/company/facilities", { headers: authHeader });
      if (res.ok) {
        const json = await res.json();
        setFacilities(json.facilities || []);
        setFacilityTypes(json.facilityTypes || []);
      }
    } catch (err) {
      console.error("Failed to load facilities:", err);
    } finally {
      setLoadingFacilities(false);
    }
  }, [authHeader]);

  const handleOpenAddFacility = () => {
    setEditingFacility(null);
    setFacilityTitle("");
    setFacilityTypeId(facilityTypes[0]?.id || "");
    setFacilityDescription("");
    setFacilityImageUrl("");
    setFacilityIsActive(true);
    setFacilityDialogOpen(true);
  };

  const handleOpenEditFacility = (f: any) => {
    setEditingFacility(f);
    setFacilityTitle(f.title || "");
    setFacilityTypeId(f.facility_type_id || "");
    setFacilityDescription(f.description || "");
    setFacilityImageUrl(f.image_url || "");
    setFacilityIsActive(f.is_active !== false);
    setFacilityDialogOpen(true);
  };

  const handleSaveFacility = async () => {
    if (!facilityTypeId) {
      toast.error("Please select a facility category/type");
      return;
    }
    setSavingFacility(true);
    try {
      const payload = {
        id: editingFacility ? editingFacility.id : undefined,
        facility_type_id: Number(facilityTypeId),
        title: facilityTitle.trim() || undefined,
        description: facilityDescription.trim() || undefined,
        image_url: facilityImageUrl || undefined,
        is_active: facilityIsActive,
      };
      const res = await fetch("/api/admin/company/facilities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save facility");
      toast.success(editingFacility ? "Facility updated successfully!" : "New facility added successfully!");
      setFacilityDialogOpen(false);
      setEditingFacility(null);
      void fetchFacilitiesData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save facility");
    } finally {
      setSavingFacility(false);
    }
  };

  const handleDeleteFacility = async (id: number) => {
    if (!confirm("Are you sure you want to delete this facility?")) return;
    try {
      const res = await fetch(`/api/admin/company/facilities?id=${id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to delete facility");
      }
      toast.success("Facility deleted successfully!");
      void fetchFacilitiesData();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete facility");
    }
  };

  const handleFounderImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFounderImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        headers: authHeader,
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "Upload failed");
      setCompanyInfo((prev) => ({ ...prev, founder_image_url: json.url }));
      toast.success("Founder photograph uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingFounderImage(false);
    }
  };

  const handleFacilityImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFacilityImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        headers: authHeader,
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "Upload failed");
      setFacilityImageUrl(json.url);
      toast.success("Facility photo uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingFacilityImage(false);
    }
  };

  // Payment Methods State
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodItem[]>([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(false);
  const [pmDialogOpen, setPmDialogOpen] = useState(false);
  const [editingPm, setEditingPm] = useState<PaymentMethodItem | null>(null);
  const [pmName, setPmName] = useState("");
  const [pmMethodType, setPmMethodType] = useState("upi_qr");
  const [pmDisplayName, setPmDisplayName] = useState("");
  const [pmUpiId, setPmUpiId] = useState("");
  const [pmQrCodeUrl, setPmQrCodeUrl] = useState("");
  const [pmBankName, setPmBankName] = useState("");
  const [pmAccountHolderName, setPmAccountHolderName] = useState("");
  const [pmAccountNumber, setPmAccountNumber] = useState("");
  const [pmIfscCode, setPmIfscCode] = useState("");
  const [pmBranchName, setPmBranchName] = useState("");
  const [pmAccountType, setPmAccountType] = useState("Current");
  const [pmGatewayProvider, setPmGatewayProvider] = useState("Razorpay");
  const [pmMerchantId, setPmMerchantId] = useState("");
  const [pmInstructions, setPmInstructions] = useState("");
  const [pmConvenienceFee, setPmConvenienceFee] = useState("0");
  const [pmIsActive, setPmIsActive] = useState(true);
  const [pmSortOrder, setPmSortOrder] = useState(0);
  const [savingPm, setSavingPm] = useState(false);

  const fetchPaymentMethods = useCallback(async () => {
    setLoadingPaymentMethods(true);
    try {
      const activeInstId = effectiveInstId ? String(effectiveInstId) : "";
      const url = activeInstId ? `/api/admin/company/payment-methods?institutionId=${encodeURIComponent(activeInstId)}` : "/api/admin/company/payment-methods";
      const res = await fetch(url, {
        headers: {
          ...authHeader,
          ...(activeInstId ? { "x-institution-id": activeInstId, "x-business-id": activeInstId } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        setPaymentMethods(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load payment methods:", err);
    } finally {
      setLoadingPaymentMethods(false);
    }
  }, [authHeader, effectiveInstId]);

  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const activeInstId = effectiveInstId ? String(effectiveInstId) : "";
      const url = activeInstId ? `/api/admin/company/branches?businessId=${encodeURIComponent(activeInstId)}` : "/api/admin/company/branches";
      const res = await fetch(url, {
        headers: {
          ...authHeader,
          ...(activeInstId ? { "x-institution-id": activeInstId, "x-business-id": activeInstId } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        setBranches(json.branches || []);
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
    } finally {
      setLoadingBranches(false);
    }
  }, [authHeader, effectiveInstId]);

  const fetchSubcategories = useCallback(async (categoryId: number | null) => {
    if (!categoryId) {
      setSubcategories([]);
      return;
    }
    setLoadingSubcategories(true);
    try {
      const res = await fetch(`/api/admin/company/info?action=subcategories&category_id=${categoryId}`, { headers: authHeader });
      if (res.ok) {
        const json = await res.json();
        setSubcategories(json.subcategories || json.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch subcategories:", e);
    } finally {
      setLoadingSubcategories(false);
    }
  }, [authHeader]);

  const fetchCompanyInfo = useCallback(async () => {
    setLoadingCompanyInfo(true);
    try {
      const activeInstId = effectiveInstId ? String(effectiveInstId) : (typeof window !== "undefined" ? (localStorage.getItem("edubird.activeInstitutionId") || localStorage.getItem("active_institution_id") || "") : "");
      const url = activeInstId ? `/api/admin/company/info?institutionId=${encodeURIComponent(activeInstId)}` : "/api/admin/company/info";
      const res = await fetch(url, {
        headers: {
          ...authHeader,
          ...(activeInstId ? { "x-institution-id": activeInstId, "x-business-id": activeInstId } : {}),
        },
      });
      if (res.ok) {
        const json = await res.json();
        if (json.businessCategories || json.categories) {
          setBusinessCategories(json.businessCategories || json.categories || []);
        }
        if (json.professionalCategories) {
          setProfessionalCategories(json.professionalCategories || []);
        }
        if (json.subcategories) {
          setSubcategories(json.subcategories || []);
        }
        if (json.data) {
          const sIds = Array.isArray(json.data.subcategory_ids) && json.data.subcategory_ids.length > 0
            ? json.data.subcategory_ids.map(Number).filter((n: number) => !isNaN(n))
            : (json.data.subcategory_id ? [Number(json.data.subcategory_id)] : []);
          let parsedHours = DEFAULT_OPENING_HOURS;
          if (json.data.opening_hours && typeof json.data.opening_hours === "object" && Object.keys(json.data.opening_hours).length > 0) {
            parsedHours = { ...DEFAULT_OPENING_HOURS, ...json.data.opening_hours };
          }
          setCompanyInfo((prev) => ({
            ...prev,
            ...json.data,
            about: json.data.about || json.data.about_text || prev.about || "",
            about_text: json.data.about_text || json.data.about || prev.about_text || "",
            founder_name: json.data.founder_name || prev.founder_name || "",
            founder_title: json.data.founder_title || prev.founder_title || "",
            founder_image_url: json.data.founder_image_url || prev.founder_image_url || "",
            founder_about: json.data.founder_about || prev.founder_about || "",
            mission: json.data.mission || prev.mission || "",
            vision: json.data.vision || prev.vision || "",
            goal: json.data.goal || prev.goal || "",
            established_year: json.data.established_year ? String(json.data.established_year) : (prev.established_year || ""),
            opening_hours: parsedHours,
            subcategory_ids: sIds,
            subcategory_id: sIds[0] || json.data.subcategory_id || null,
            listing_type: json.data.listing_type || "business",
          }));
        }
      }
    } catch (err) {
      console.error("Failed to load company info:", err);
    } finally {
      setLoadingCompanyInfo(false);
    }
  }, [authHeader, DEFAULT_OPENING_HOURS]);

  const handleDayTimeChange = (dayKey: string, field: "open" | "close", val: string) => {
    setCompanyInfo((prev) => {
      const prevHours = prev.opening_hours || DEFAULT_OPENING_HOURS;
      const currentDay = prevHours[dayKey] || { open: "09:00 AM", close: "07:00 PM", is_closed: false };
      return {
        ...prev,
        opening_hours: {
          ...prevHours,
          [dayKey]: {
            ...currentDay,
            [field]: val,
          },
        },
      };
    });
  };

  const handleDayToggleClosed = (dayKey: string) => {
    setCompanyInfo((prev) => {
      const prevHours = prev.opening_hours || DEFAULT_OPENING_HOURS;
      const currentDay = prevHours[dayKey] || { open: "09:00 AM", close: "07:00 PM", is_closed: false };
      return {
        ...prev,
        opening_hours: {
          ...prevHours,
          [dayKey]: {
            ...currentDay,
            is_closed: !currentDay.is_closed,
          },
        },
      };
    });
  };

  const handleCopyMondayToWeekdays = () => {
    setCompanyInfo((prev) => {
      const prevHours = prev.opening_hours || DEFAULT_OPENING_HOURS;
      const mon = prevHours.monday || { open: "09:00 AM", close: "07:00 PM", is_closed: false };
      const updated = { ...prevHours };
      ["tuesday", "wednesday", "thursday", "friday", "saturday"].forEach((d) => {
        updated[d] = { ...mon };
      });
      return {
        ...prev,
        opening_hours: updated,
      };
    });
    toast.success("Applied Monday operating hours to Tuesday through Saturday!");
  };

  const handleSaveCompanyInfo = async () => {
    setSavingCompanyInfo(true);
    try {
      const activeInstId = effectiveInstId ? String(effectiveInstId) : (typeof window !== "undefined" ? (localStorage.getItem("edubird.activeInstitutionId") || localStorage.getItem("active_institution_id") || "") : "");
      const summaryText = Object.entries(companyInfo.opening_hours || DEFAULT_OPENING_HOURS)
        .map(([day, s]: [string, any]) => `${day.slice(0, 3).toUpperCase()}: ${s.is_closed ? "Closed" : `${s.open}-${s.close}`}`)
        .join(", ");

      const payload = {
        ...companyInfo,
        institution_id: activeInstId ? Number(activeInstId) : undefined,
        working_hours: companyInfo.working_hours || summaryText,
      };

      const res = await fetch("/api/admin/company/info", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
          ...(activeInstId ? { "x-institution-id": activeInstId, "x-business-id": activeInstId } : {}),
          ...((companyInfo as any)?.business_id ? { "x-business-id": String((companyInfo as any).business_id) } : {}),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update company info");
      toast.success(
        companyInfo.listing_type === "professional"
          ? "Professional profile & working hours updated successfully!"
          : "Company details & operating hours updated successfully!"
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to save company information");
    } finally {
      setSavingCompanyInfo(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>, field: "logo_url" | "favicon_url" = "logo_url") => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (field === "favicon_url") {
      setUploadingFavicon(true);
    } else {
      setUploadingLogo(true);
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        headers: authHeader,
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(json.error || "Upload failed");
      }
      setCompanyInfo((prev) => ({ ...prev, [field]: json.url }));
      toast.success(field === "logo_url" ? "Company logo uploaded!" : "Favicon uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      if (field === "favicon_url") {
        setUploadingFavicon(false);
      } else {
        setUploadingLogo(false);
      }
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBanner(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        headers: authHeader,
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.url) throw new Error(json.error || "Upload failed");
      setCompanyInfo((prev) => ({ ...prev, banner_url: json.url }));
      toast.success("Cover banner uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload banner");
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleGalleryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingGallery(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/admin/uploads/image", {
          method: "POST",
          headers: authHeader,
          body: formData,
        });
        const json = await res.json();
        if (res.ok && json.url) {
          uploadedUrls.push(json.url);
        }
      }
      if (uploadedUrls.length > 0) {
        setCompanyInfo((prev) => ({
          ...prev,
          gallery_images: [...(prev.gallery_images || []), ...uploadedUrls],
        }));
        toast.success(`${uploadedUrls.length} image(s) added to gallery!`);
      } else {
        throw new Error("No images could be uploaded");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload gallery images");
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    setCompanyInfo((prev) => ({
      ...prev,
      gallery_images: (prev.gallery_images || []).filter((_, i) => i !== index),
    }));
  };

  // Fetch pages data
  const fetchPagesData = useCallback(async () => {
    setLoadingPages(true);
    try {
      const activeInstId = effectiveInstId ? String(effectiveInstId) : "";
      const url = activeInstId ? `/api/admin/company/pages?institutionId=${encodeURIComponent(activeInstId)}` : "/api/admin/company/pages";
      const pagesRes = await fetch(url, {
        headers: {
          ...authHeader,
          ...(activeInstId ? { "x-institution-id": activeInstId, "x-business-id": activeInstId } : {}),
        },
      });
      if (pagesRes.ok) {
        const pagesJson = await pagesRes.json();
        const map: Record<string, CompanyPageData> = {};
        (pagesJson.data || []).forEach((p: CompanyPageData) => {
          map[p.slug] = p;
        });
        setPagesData(map);
      }
    } catch (err) {
      console.error("Failed to load company pages:", err);
      toast.error("Failed to load company pages data.");
    } finally {
      setLoadingPages(false);
    }
  }, [authHeader, effectiveInstId]);

  // Fetch FAQs data
  const fetchFaqsData = useCallback(async () => {
    try {
      const activeInstId = effectiveInstId ? String(effectiveInstId) : "";
      const url = activeInstId ? `/api/admin/company/faqs?institutionId=${encodeURIComponent(activeInstId)}` : "/api/admin/company/faqs";
      const faqsRes = await fetch(url, {
        headers: {
          ...authHeader,
          ...(activeInstId ? { "x-institution-id": activeInstId, "x-business-id": activeInstId } : {}),
        },
      });
      if (faqsRes.ok) {
        const faqsJson = await faqsRes.json();
        setFaqs(faqsJson.data || []);
      }
    } catch (err) {
      console.error("Failed to load FAQs:", err);
    }
  }, [authHeader, effectiveInstId]);

  // Fetch data on-demand based on active tab
  useEffect(() => {
    if (!isReady || !canAccessCompany) return;
    void fetchCompanyInfo();
    void fetchBranches();
    void fetchPagesData();
    void fetchPaymentMethods();
    void fetchFaqsData();
    void fetchFacilitiesData();
    if (activeTab === "hostels") {
      void fetchHostels();
    } else if (activeTab === "libraries") {
      void fetchLibraries();
    }
  }, [isReady, canAccessCompany, activeTab, fetchHostels, fetchLibraries, fetchBranches, fetchCompanyInfo, fetchPaymentMethods, fetchFaqsData, fetchPagesData, fetchFacilitiesData]);

  // Handle Page Form Field Changes
  const handlePageChange = (slug: string, field: string, value: any) => {
    setPagesData((prev) => {
      const current = prev[slug];
      if (!current) return prev;
      return {
        ...prev,
        [slug]: {
          ...current,
          [field]: value,
        },
      };
    });
  };

  // Handle Metadata Field Changes (e.g. for contact-us)
  const handleMetaChange = (slug: string, key: string, value: any) => {
    setPagesData((prev) => {
      const current = prev[slug];
      if (!current) return prev;
      return {
        ...prev,
        [slug]: {
          ...current,
          metadata: {
            ...(current.metadata || {}),
            [key]: value,
          },
        },
      };
    });
  };

  // Save Page Content to API
  const handleSavePage = async (slug: string) => {
    const page = pagesData[slug];
    if (!page) return;

    setSavingPage(true);
    try {
      const activeInstId = effectiveInstId ? String(effectiveInstId) : "";
      const res = await fetch("/api/admin/company/pages", {
        method: "PUT",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
          ...(activeInstId ? { "x-institution-id": activeInstId, "x-business-id": activeInstId } : {}),
        },
        body: JSON.stringify({
          institution_id: activeInstId ? Number(activeInstId) : undefined,
          slug: page.slug,
          title: page.title,
          subtitle: page.subtitle,
          content: page.content,
          metadata: page.metadata,
          is_published: page.is_published,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update page");

      toast.success(`${page.title} updated successfully!`);
      setPagesData((prev) => ({
        ...prev,
        [slug]: json.data,
      }));
    } catch (err: any) {
      toast.error(err.message || "Error saving page");
    } finally {
      setSavingPage(false);
    }
  };

  // FAQ Handlers
  const handleOpenFaqDialog = (faq?: FaqItem) => {
    if (faq) {
      setEditingFaq(faq);
      setFaqQuestion(faq.question);
      setFaqAnswer(faq.answer);
      setFaqCategory(faq.category || "General");
      setFaqOrder(faq.sort_order || 0);
      setFaqPublished(faq.is_published);
    } else {
      setEditingFaq(null);
      setFaqQuestion("");
      setFaqAnswer("");
      setFaqCategory("General");
      setFaqOrder(faqs.length + 1);
      setFaqPublished(true);
    }
    setFaqDialogOpen(true);
  };

  const handleOpenAddFaq = () => handleOpenFaqDialog();
  const handleOpenEditFaq = (faq: FaqItem) => handleOpenFaqDialog(faq);

  const handleSaveFaq = async () => {
    if (!faqQuestion.trim() || !faqAnswer.trim()) {
      toast.error("Please fill in both Question and Answer");
      return;
    }

    setSavingFaq(true);
    try {
      const activeInstId = effectiveInstId ? String(effectiveInstId) : "";
      const isEdit = Boolean(editingFaq);
      const url = activeInstId ? `/api/admin/company/faqs?institutionId=${encodeURIComponent(activeInstId)}` : "/api/admin/company/faqs";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
          ...(activeInstId ? { "x-institution-id": activeInstId, "x-business-id": activeInstId } : {}),
        },
        body: JSON.stringify({
          id: editingFaq?.id,
          institution_id: activeInstId ? Number(activeInstId) : undefined,
          question: faqQuestion.trim(),
          answer: faqAnswer.trim(),
          category: faqCategory.trim() || "General",
          sort_order: faqOrder,
          is_published: faqPublished,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save FAQ");

      toast.success(isEdit ? "FAQ updated" : "FAQ created");
      setFaqDialogOpen(false);
      void fetchFaqsData();
    } catch (err: any) {
      toast.error(err.message || "Error saving FAQ");
    } finally {
      setSavingFaq(false);
    }
  };

  const handleDeleteFaq = async (id: number) => {
    if (!confirm("Are you sure you want to delete this FAQ?")) return;

    try {
      const res = await fetch(`/api/admin/company/faqs?id=${id}`, {
        method: "DELETE",
        headers: authHeader,
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete FAQ");

      toast.success("FAQ deleted successfully");
      setFaqs((prev) => prev.filter((f) => f.id !== id));
    } catch (err: any) {
      toast.error(err.message || "Error deleting FAQ");
    }
  };

  // Hostel Handlers
  const handleOpenAddHostel = () => {
    setEditingHostel(null);
    setHostelName("");
    setHostelType("Boys");
    setHostelCapacity(150);
    setHostelAvailableBeds(35);
    setHostelAnnualFee(55000);
    setHostelRoomTypes("Single, Double & Triple Sharing");
    setHostelMessFacility("Four Meals Daily (Veg & Non-Veg)");
    setHostelAcAvailable(true);
    setHostelWifiAvailable(true);
    setHostelSecurityDeposit(5000);
    setHostelDescription("Modern campus residence equipped with 24/7 security, study rooms, and hygienic dining hall.");
    setHostelRules("Visitors allowed between 4:00 PM - 7:00 PM. Gate closes at 9:30 PM.");
    setHostelDialogOpen(true);
  };

  const handleOpenEditHostel = (h: any) => {
    setEditingHostel(h);
    setHostelName(h.name || "");
    setHostelType(h.type || "Boys");
    setHostelCapacity(h.capacity || 150);
    setHostelAvailableBeds(h.available_beds || 35);
    setHostelAnnualFee(h.annual_fee || 55000);
    setHostelRoomTypes(h.room_types || "Single, Double & Triple Sharing");
    setHostelMessFacility(h.mess_facility || "Four Meals Daily");
    setHostelAcAvailable(Boolean(h.ac_available));
    setHostelWifiAvailable(Boolean(h.wifi_available));
    setHostelSecurityDeposit(h.security_deposit || 5000);
    setHostelDescription(h.description || "");
    setHostelRules(h.rules || "");
    setHostelDialogOpen(true);
  };

  const handleSaveHostel = async () => {
    if (!hostelName.trim()) {
      toast.error("Hostel Name is required");
      return;
    }
    setSavingHostel(true);
    try {
      const res = await fetch("/api/admin/institution/hostels", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({
          id: editingHostel?.id,
          name: hostelName,
          type: hostelType,
          capacity: hostelCapacity,
          available_beds: hostelAvailableBeds,
          annual_fee: hostelAnnualFee,
          room_types: hostelRoomTypes,
          mess_facility: hostelMessFacility,
          ac_available: hostelAcAvailable,
          wifi_available: hostelWifiAvailable,
          security_deposit: hostelSecurityDeposit,
          description: hostelDescription,
          rules: hostelRules,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save hostel");
      toast.success(editingHostel ? "Hostel updated successfully!" : "Hostel added successfully!");
      setHostelDialogOpen(false);
      void fetchHostels();
    } catch (e: any) {
      toast.error(e.message || "Could not save hostel");
    } finally {
      setSavingHostel(false);
    }
  };

  const handleDeleteHostel = async (id: number) => {
    if (!confirm("Are you sure you want to delete this hostel residence?")) return;
    try {
      const res = await fetch(`/api/admin/institution/hostels?id=${id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (res.ok) {
        toast.success("Hostel deleted successfully!");
        void fetchHostels();
      }
    } catch (e) {
      toast.error("Failed to delete hostel");
    }
  };

  // Library Handlers
  const handleOpenAddLibrary = () => {
    setEditingLibrary(null);
    setLibraryName("Central Knowledge & Digital Resource Hub");
    setLibraryTotalBooks(25000);
    setLibraryDigitalTitles(8500);
    setLibraryJournalsSubscribed(150);
    setLibrarySeatingCapacity(350);
    setLibraryReadingHall(true);
    setLibraryEResources(true);
    setLibraryOpeningHours("8:00 AM - 10:00 PM");
    setLibraryBorrowingRules("Students can issue up to 4 books for 14 days with online renewals.");
    setLibraryLibrarianName("Dr. Chief Librarian");
    setLibraryLibrarianEmail("library@institution.edu");
    setLibraryLibrarianPhone("+91 9876543210");
    setLibraryDescription("Fully air-conditioned central library featuring RFID cataloguing, digital e-resource learning stations, and quiet reading zones.");
    setLibraryDialogOpen(true);
  };

  const handleOpenEditLibrary = (lib: any) => {
    setEditingLibrary(lib);
    setLibraryName(lib.name || "");
    setLibraryTotalBooks(lib.total_books || 25000);
    setLibraryDigitalTitles(lib.digital_titles || 8500);
    setLibraryJournalsSubscribed(lib.journals_subscribed || 150);
    setLibrarySeatingCapacity(lib.seating_capacity || 350);
    setLibraryReadingHall(Boolean(lib.reading_hall_available));
    setLibraryEResources(Boolean(lib.e_resources_access));
    setLibraryOpeningHours(lib.opening_hours || "8:00 AM - 10:00 PM");
    setLibraryBorrowingRules(lib.borrowing_rules || "");
    setLibraryLibrarianName(lib.librarian_name || "");
    setLibraryLibrarianEmail(lib.librarian_email || "");
    setLibraryLibrarianPhone(lib.librarian_phone || "");
    setLibraryDescription(lib.description || "");
    setLibraryDialogOpen(true);
  };

  const handleSaveLibrary = async () => {
    if (!libraryName.trim()) {
      toast.error("Library Name is required");
      return;
    }
    setSavingLibrary(true);
    try {
      const res = await fetch("/api/admin/institution/libraries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({
          id: editingLibrary?.id,
          name: libraryName,
          total_books: libraryTotalBooks,
          digital_titles: libraryDigitalTitles,
          journals_subscribed: libraryJournalsSubscribed,
          seating_capacity: librarySeatingCapacity,
          reading_hall_available: libraryReadingHall,
          e_resources_access: libraryEResources,
          opening_hours: libraryOpeningHours,
          borrowing_rules: libraryBorrowingRules,
          librarian_name: libraryLibrarianName,
          librarian_email: libraryLibrarianEmail,
          librarian_phone: libraryLibrarianPhone,
          description: libraryDescription,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save library resource");
      toast.success(editingLibrary ? "Library resource updated!" : "Library resource added!");
      setLibraryDialogOpen(false);
      void fetchLibraries();
    } catch (e: any) {
      toast.error(e.message || "Could not save library resource");
    } finally {
      setSavingLibrary(false);
    }
  };

  const handleDeleteLibrary = async (id: number) => {
    if (!confirm("Are you sure you want to delete this library resource?")) return;
    try {
      const res = await fetch(`/api/admin/institution/libraries?id=${id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (res.ok) {
        toast.success("Library resource deleted!");
        void fetchLibraries();
      }
    } catch (e) {
      toast.error("Failed to delete library");
    }
  };

  // Branch Handlers
  const handleOpenAddBranch = () => {
    setEditingBranch(null);
    setBranchName("");
    setBranchType("Regional Office");
    setBranchCity("");
    setBranchState("");
    setBranchPincode("");
    setBranchAddress("");
    setBranchPhone("");
    setBranchEmail("");
    setBranchMapUrl("");
    setBranchManagerName("");
    setBranchStatus("active");
    setBranchIsHq(false);
    setBranchAddressQuery("");
    setBranchAddressSuggestions([]);
    setShowBranchSuggestions(false);
    setBranchDialogOpen(true);
  };

  const handleOpenEditBranch = (b: any) => {
    setEditingBranch(b);
    setBranchName(b.branch_name || "");
    setBranchType(b.branch_type || "Branch Office");
    setBranchCity(b.city || "");
    setBranchState(b.state || "");
    setBranchPincode(b.pincode || "");
    setBranchAddress(b.address || "");
    setBranchAddressQuery(b.address || "");
    setBranchAddressSuggestions([]);
    setShowBranchSuggestions(false);
    setBranchPhone(b.phone || "");
    setBranchEmail(b.email || "");
    setBranchMapUrl(b.map_url || "");
    setBranchManagerName(b.manager_name || "");
    setBranchStatus(b.status || "active");
    setBranchIsHq(Boolean(b.is_headquarters));
    setBranchDialogOpen(true);
  };

  const handleSaveBranch = async () => {
    if (!branchName.trim() || !branchCity.trim() || !branchAddress.trim()) {
      toast.error("Branch name, city, and address are required");
      return;
    }
    setSavingBranch(true);
    try {
      const activeInstId = effectiveInstId ? String(effectiveInstId) : "";
      const method = editingBranch ? "PUT" : "POST";
      const res = await fetch("/api/admin/company/branches", {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
          ...(activeInstId ? { "x-institution-id": activeInstId, "x-business-id": activeInstId } : {}),
        },
        body: JSON.stringify({
          id: editingBranch?.id,
          business_id: activeInstId ? Number(activeInstId) : undefined,
          institution_id: activeInstId ? Number(activeInstId) : undefined,
          branch_name: branchName,
          branch_type: branchType,
          city: branchCity,
          state: branchState,
          pincode: branchPincode,
          address: branchAddress,
          phone: branchPhone,
          email: branchEmail,
          map_url: branchMapUrl,
          manager_name: branchManagerName,
          status: branchStatus,
          is_headquarters: branchIsHq,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save branch");
      toast.success(editingBranch ? "Branch updated!" : "Branch added!");
      setBranchDialogOpen(false);
      void fetchBranches();
    } catch (e: any) {
      toast.error(e.message || "Could not save branch");
    } finally {
      setSavingBranch(false);
    }
  };

  // Google Places address autocomplete for address
  const searchBranchAddress = useCallback(async (query: string) => {
    const q = query.trim();
    if (!q || q.length < 2) {
      setBranchAddressSuggestions([]);
      setShowBranchSuggestions(false);
      return;
    }
    setSearchingBranchAddress(true);
    try {
      const res = await fetch(`/api/public/places/autocomplete?input=${encodeURIComponent(q)}&country=in`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.predictions) && data.predictions.length > 0) {
          setBranchAddressSuggestions(data.predictions);
          setShowBranchSuggestions(true);
          return;
        }
      }
      setBranchAddressSuggestions([]);
      setShowBranchSuggestions(false);
    } catch (err) {
      console.warn("Address search error:", err);
      setBranchAddressSuggestions([]);
      setShowBranchSuggestions(false);
    } finally {
      setSearchingBranchAddress(false);
    }
  }, []);

  const handleBranchAddressInputChange = (val: string) => {
    setBranchAddressQuery(val);
    setBranchAddress(val);
    if (branchAddressTimerRef.current) clearTimeout(branchAddressTimerRef.current);
    branchAddressTimerRef.current = setTimeout(() => searchBranchAddress(val), 200);
  };

  const handleSelectBranchSuggestion = async (item: any) => {
    const fullText = item.description || item.formatted_address || item.name;
    setBranchAddress(fullText);
    setBranchAddressQuery(fullText);
    setShowBranchSuggestions(false);
    setBranchAddressSuggestions([]);

    if (item.city) setBranchCity(item.city);
    if (item.state) setBranchState(item.state);
    if (item.pincode) setBranchPincode(item.pincode);
    if (item.map_url) setBranchMapUrl((prev) => prev || item.map_url);

    if (item.place_id && item.source === "google") {
      try {
        const detailRes = await fetch(
          `/api/public/places/autocomplete?action=details&place_id=${encodeURIComponent(item.place_id)}`
        );
        if (detailRes.ok) {
          const det = await detailRes.json();
          if (det.success) {
            if (det.formatted_address) {
              setBranchAddress(det.formatted_address);
              setBranchAddressQuery(det.formatted_address);
            }
            if (det.city) setBranchCity(det.city);
            if (det.state) setBranchState(det.state);
            if (det.pincode) setBranchPincode(det.pincode);
            if (det.map_url) setBranchMapUrl(det.map_url);
            toast.success("Location & address details populated from Google Maps");
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch place details:", err);
      }
    }

    toast.success("Address auto-filled from suggestion");
  };

  const handleDeleteBranch = async (id: number) => {
    if (!confirm("Are you sure you want to delete this branch?")) return;
    try {
      const res = await fetch(`/api/admin/company/branches?id=${id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (res.ok) {
        toast.success("Branch deleted!");
        void fetchBranches();
      }
    } catch (e) {
      toast.error("Failed to delete branch");
    }
  };

  if (!isReady) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading Information management section...</span>
      </div>
    );
  }

  if (!canAccessCompany) {
    return (
      <div className="p-6 text-center text-red-500">
        Access Denied. Admin privileges required to manage Information content.
      </div>
    );
  }

  const renderWorkingHoursEditor = () => (
    <div className="p-5 rounded-xl border bg-muted/20 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary shrink-0" />
          <div>
            <h3 className="font-semibold text-sm tracking-wide uppercase text-foreground">
              {companyInfo.listing_type === "professional" ? "Working Hours & Professional Availability" : "Operating & Working Hours"}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Set standard opening and closing times or off-days. Published publicly on your store front.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyMondayToWeekdays}
            className="text-[11px] h-7 px-2.5 font-semibold gap-1 cursor-pointer"
            title="Copy Monday's open & close time to Tuesday through Saturday"
          >
            <Copy className="h-3 w-3" />
            Apply Mon to Sat
          </Button>
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <div className="grid grid-cols-1 divide-y divide-border/60 rounded-xl border bg-background overflow-hidden shadow-2xs">
          {DAYS_OF_WEEK.map(({ key, label }) => {
            const sched = companyInfo.opening_hours?.[key] || DEFAULT_OPENING_HOURS[key];
            const isClosed = Boolean(sched?.is_closed);
            return (
              <div
                key={key}
                className={`p-3 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                  isClosed ? "bg-muted/15" : "bg-card"
                }`}
              >
                {/* Day name & status pill */}
                <div className="flex items-center gap-3 sm:w-48">
                  <span className="font-bold text-xs text-foreground capitalize w-24">
                    {label}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDayToggleClosed(key)}
                    className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold cursor-pointer transition-colors ${
                      isClosed
                        ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 hover:bg-rose-500/20"
                        : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-500/20"
                    }`}
                  >
                    {isClosed ? "Closed / Off" : "Open"}
                  </button>
                </div>

                {/* Timing controls */}
                {isClosed ? (
                  <div className="text-xs text-rose-500 font-semibold italic flex items-center gap-2 sm:ml-auto">
                    <span>Closed on {label}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDayToggleClosed(key)}
                      className="h-6 px-2 text-[11px] text-primary hover:underline font-bold cursor-pointer"
                    >
                      Set Open
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground font-medium">Opens:</span>
                      <select
                        value={sched?.open || "09:00 AM"}
                        onChange={(e) => handleDayTimeChange(key, "open", e.target.value)}
                        className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-semibold focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        {TIME_SLOTS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <span className="text-muted-foreground text-xs font-bold px-0.5">&ndash;</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-muted-foreground font-medium">Closes:</span>
                      <select
                        value={sched?.close || "07:00 PM"}
                        onChange={(e) => handleDayTimeChange(key, "close", e.target.value)}
                        className="h-8 rounded-lg border border-input bg-background px-2 text-xs font-semibold focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        {TIME_SLOTS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDayToggleClosed(key)}
                      className="h-7 px-2 text-[11px] text-muted-foreground hover:text-rose-600 font-medium cursor-pointer"
                      title="Mark day as closed"
                    >
                      Mark Closed
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderAddressManagementCard = () => (
    <Card className="border-border shadow-xs">
      <CardHeader className="flex flex-row items-center justify-between border-b bg-card/60 px-6 py-4">
        <div className="space-y-1">
          <CardTitle className="text-xl flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Office Addresses & Operating Centers
          </CardTitle>
          <CardDescription>
            Manage official office addresses, campus locations, and regional operating centers.
          </CardDescription>
        </div>
        <Button onClick={handleOpenAddBranch} size="sm" className="flex items-center gap-1.5">
          <Plus className="h-4 w-4" /> Add Address / Office
        </Button>
      </CardHeader>

      <CardContent className="p-6 space-y-4">
        {loadingBranches ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading addresses...
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
            <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="font-medium text-base">No office addresses configured yet.</p>
            <p className="text-sm text-muted-foreground mb-4">Add office locations to showcase your verified address presence across cities and states.</p>
            <Button onClick={handleOpenAddBranch} size="sm">
              <Plus className="mr-1.5 h-4 w-4" /> Add Address / Office
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {branches.map((b) => (
              <div
                key={b.id}
                className={`p-5 rounded-2xl border bg-card hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between space-y-4 ${
                  b.is_headquarters ? "border-primary/40 bg-primary/[0.02]" : ""
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-base text-foreground block">{b.branch_name}</span>
                        {b.is_headquarters ? (
                          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] gap-1 py-0 h-5 font-semibold">
                            <Sparkles className="w-3 h-3" /> HQ
                          </Badge>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs font-semibold text-primary">
                          {b.city}{b.state ? `, ${b.state}` : ""}
                        </Badge>
                        {b.branch_type && (
                          <Badge variant="secondary" className="text-[10px]">
                            {b.branch_type}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Badge variant={b.status === "active" ? "default" : "secondary"} className="text-[10px]">
                      {b.status}
                    </Badge>
                  </div>

                  <div className="space-y-1.5 text-xs text-muted-foreground pt-1">
                    <p className="leading-relaxed text-foreground/80">{b.address}{b.pincode ? ` - ${b.pincode}` : ""}</p>
                    {b.phone && (
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300">
                        <Phone className="w-3.5 h-3.5 text-primary shrink-0" /> {b.phone}
                      </div>
                    )}
                    {b.email && (
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-zinc-300">
                        <Mail className="w-3.5 h-3.5 text-primary shrink-0" /> {b.email}
                      </div>
                    )}
                    {b.manager_name && (
                      <p className="text-[11px] text-muted-foreground pt-1">
                        Contact Person: <span className="font-medium text-foreground">{b.manager_name}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  {b.map_url ? (
                    <a
                      href={b.map_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" /> Map Location
                    </a>
                  ) : <span />}
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEditBranch(b)}>
                      <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteBranch(b.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6 p-6">
      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
        {/* Dynamic Page Content Tabs (Excluding FAQs, Payment Methods & Branches) */}
        {PAGE_TABS.filter((t) => t.slug !== "faqs" && t.slug !== "payment-methods" && t.slug !== "contact-branches").map((tab) => {
          const page: CompanyPageData = pagesData[tab.slug] || {
            id: 0,
            slug: tab.slug,
            title: tab.label,
            subtitle: "",
            content: "",
            metadata: {},
            is_published: true,
            updated_at: new Date().toISOString(),
          };

          return (
            <TabsContent key={tab.slug} value={tab.slug} className="space-y-6">
              {loadingPages ? (
                <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="ml-2 text-sm text-muted-foreground">Loading {tab.label} content...</span>
                </div>
              ) : (
                <Card>
                <CardHeader className="flex flex-row items-center justify-between border-b bg-card px-6 py-4">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <tab.icon className="h-5 w-5 text-primary" />
                      {tab.label} Settings
                    </CardTitle>
                    <CardDescription>
                      Update page content, hero texts, and publication settings for {tab.label}.
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={page.is_published}
                        onChange={(e) => handlePageChange(tab.slug, "is_published", e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      Published on Site
                    </label>
                    <Button
                      onClick={() => handleSavePage(tab.slug)}
                      disabled={savingPage}
                      className="flex items-center gap-1.5"
                    >
                      {savingPage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Changes
                    </Button>
                  </div>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                  {/* Basic Metadata */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`${tab.slug}-title`}>Page Heading / Title</Label>
                      <Input
                        id={`${tab.slug}-title`}
                        value={page.title}
                        onChange={(e) => handlePageChange(tab.slug, "title", e.target.value)}
                        placeholder={`e.g. ${tab.label}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`${tab.slug}-subtitle`}>Subtitle / Short Description</Label>
                      <Input
                        id={`${tab.slug}-subtitle`}
                        value={page.subtitle || ""}
                        onChange={(e) => handlePageChange(tab.slug, "subtitle", e.target.value)}
                        placeholder="Short subtitle displayed in the page hero header..."
                      />
                    </div>
                  </div>

                  {/* Special Metadata for Social Media Links */}
                  {tab.slug === "social-links" && (
                    <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-4">
                      <h4 className="font-semibold text-sm text-primary flex items-center gap-2">
                        <Share2 className="h-4 w-4" /> Official Social Media Links
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        Configure official social media URLs for your business. These links display in the public footer, contact page, and business profiles.
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="social-facebook" className="text-xs font-medium">Facebook Page URL</Label>
                          <Input
                            id="social-facebook"
                            className="bg-background text-sm"
                            value={page.metadata?.facebook || ""}
                            onChange={(e) => handleMetaChange("social-links", "facebook", e.target.value)}
                            placeholder="https://facebook.com/your-business"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="social-twitter" className="text-xs font-medium">X (Twitter) URL</Label>
                          <Input
                            id="social-twitter"
                            className="bg-background text-sm"
                            value={page.metadata?.twitter || ""}
                            onChange={(e) => handleMetaChange("social-links", "twitter", e.target.value)}
                            placeholder="https://x.com/your-business"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="social-pinterest" className="text-xs font-medium">Pinterest URL</Label>
                          <Input
                            id="social-pinterest"
                            className="bg-background text-sm"
                            value={page.metadata?.pinterest || ""}
                            onChange={(e) => handleMetaChange("social-links", "pinterest", e.target.value)}
                            placeholder="https://pinterest.com/your-business"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="social-whatsapp" className="text-xs font-medium">WhatsApp Number / Link</Label>
                          <Input
                            id="social-whatsapp"
                            className="bg-background text-sm"
                            value={page.metadata?.whatsapp || ""}
                            onChange={(e) => handleMetaChange("social-links", "whatsapp", e.target.value)}
                            placeholder="+91 1234567890 or https://wa.me/..."
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="social-instagram" className="text-xs font-medium">Instagram Profile URL</Label>
                          <Input
                            id="social-instagram"
                            className="bg-background text-sm"
                            value={page.metadata?.instagram || ""}
                            onChange={(e) => handleMetaChange("social-links", "instagram", e.target.value)}
                            placeholder="https://instagram.com/your-business"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="social-youtube" className="text-xs font-medium">YouTube Channel URL</Label>
                          <Input
                            id="social-youtube"
                            className="bg-background text-sm"
                            value={page.metadata?.youtube || ""}
                            onChange={(e) => handleMetaChange("social-links", "youtube", e.target.value)}
                            placeholder="https://youtube.com/@your-business"
                          />
                        </div>

                        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                          <Label htmlFor="social-linkedin" className="text-xs font-medium">LinkedIn Page URL</Label>
                          <Input
                            id="social-linkedin"
                            className="bg-background text-sm"
                            value={page.metadata?.linkedin || ""}
                            onChange={(e) => handleMetaChange("social-links", "linkedin", e.target.value)}
                            placeholder="https://linkedin.com/company/your-business"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Page Body Content */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`${tab.slug}-content`}>Page Body Content (HTML / Rich Text)</Label>
                      <span className="text-xs text-muted-foreground">
                        Supports standard HTML tags (h2, h3, p, ul, li, strong, etc.)
                      </span>
                    </div>

                    {previewMode ? (
                      <div
                        className="min-h-[300px] rounded-md border p-4 bg-card prose prose-sm dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: page.content || "<p class='text-muted-foreground italic'>No content provided yet.</p>" }}
                      />
                    ) : (
                      <Textarea
                        id={`${tab.slug}-content`}
                        rows={14}
                        value={page.content}
                        onChange={(e) => handlePageChange(tab.slug, "content", e.target.value)}
                        placeholder="Write the full page body content HTML here..."
                        className="font-mono text-sm leading-relaxed"
                      />
                    )}
                  </div>
                </CardContent>
              </Card>
              )}
            </TabsContent>
          );
        })}

        {/* FAQs Tab */}
        <TabsContent value="faqs" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b bg-card px-6 py-4">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-primary" />
                  Frequently Asked Questions (FAQs)
                </CardTitle>
                <CardDescription>
                  Manage questions and answers displayed on the public /faqs page.
                </CardDescription>
              </div>
              <Button onClick={handleOpenAddFaq} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Add FAQ
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {loadingFaqs ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading FAQs...
                </div>
              ) : faqs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
                  <HelpCircle className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="font-medium text-base">No FAQs added yet.</p>
                  <p className="text-sm text-muted-foreground mb-4">Click "Add FAQ" to publish helpful Q&As for students and parents.</p>
                  <Button onClick={handleOpenAddFaq} size="sm">
                    <Plus className="mr-1.5 h-4 w-4" /> Add FAQ
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {faqs.map((faq) => (
                    <div
                      key={faq.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-card hover:border-primary/50 transition-all shadow-xs"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{faq.question}</span>
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {faq.category}
                          </Badge>
                          {faq.is_published ? (
                            <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 font-semibold">
                              Published
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] bg-amber-500/10 text-amber-600 font-semibold">
                              Draft
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-2">{faq.answer}</p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditFaq(faq)}>
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteFaq(faq.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Methods Tab */}
        <TabsContent value="payment-methods" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b bg-card px-6 py-4">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Official Payment Methods & Bank Accounts
                </CardTitle>
                <CardDescription>
                  Configure UPI IDs, QR codes, bank accounts, and payment gateway integrations for tuition fee collection and admissions.
                </CardDescription>
              </div>
              <Button onClick={() => {
                setEditingPm(null);
                setPmName("");
                setPmMethodType("upi_qr");
                setPmDisplayName("");
                setPmUpiId("");
                setPmQrCodeUrl("");
                setPmBankName("");
                setPmAccountHolderName("");
                setPmAccountNumber("");
                setPmIfscCode("");
                setPmBranchName("");
                setPmAccountType("Current");
                setPmGatewayProvider("Razorpay");
                setPmMerchantId("");
                setPmInstructions("");
                setPmConvenienceFee("0");
                setPmIsActive(true);
                setPmSortOrder(paymentMethods.length + 1);
                setPmDialogOpen(true);
              }} size="sm" className="flex items-center gap-1.5 font-bold">
                <Plus className="h-4 w-4" /> Add Payment Method
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {loadingPaymentMethods ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading payment methods...
                </div>
              ) : paymentMethods.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-2xl bg-muted/20 space-y-3">
                  <Wallet className="mx-auto h-12 w-12 text-muted-foreground/40" />
                  <p className="font-bold text-base text-foreground">No payment methods configured</p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Add official UPI IDs, company bank accounts, QR payment codes, or online gateways to accept payments.
                  </p>
                  <Button onClick={() => {
                    setEditingPm(null);
                    setPmName("");
                    setPmMethodType("upi_qr");
                    setPmDisplayName("");
                    setPmUpiId("");
                    setPmQrCodeUrl("");
                    setPmBankName("");
                    setPmAccountHolderName("");
                    setPmAccountNumber("");
                    setPmIfscCode("");
                    setPmBranchName("");
                    setPmAccountType("Current");
                    setPmGatewayProvider("Razorpay");
                    setPmMerchantId("");
                    setPmInstructions("");
                    setPmConvenienceFee("0");
                    setPmIsActive(true);
                    setPmSortOrder(1);
                    setPmDialogOpen(true);
                  }} size="sm" className="font-bold">
                    <Plus className="mr-1.5 h-4 w-4" /> Add Payment Method
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {paymentMethods.map((pm) => {
                    const isUpi = pm.method_type === "upi_qr";
                    const isBank = pm.method_type === "bank_transfer";
                    const isGateway = pm.method_type === "online_gateway";

                    return (
                      <div
                        key={pm.id}
                        className={`p-5 rounded-2xl border bg-card hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between space-y-4 ${
                          !pm.is_active ? "opacity-75 bg-muted/20" : ""
                        }`}
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
                                {isUpi ? (
                                  <QrCode className="w-5 h-5" />
                                ) : isBank ? (
                                  <Building2 className="w-5 h-5" />
                                ) : (
                                  <CreditCard className="w-5 h-5" />
                                )}
                              </div>
                              <div className="min-w-0">
                                <span className="font-bold text-sm text-foreground block truncate">{pm.name}</span>
                                <Badge variant="outline" className="text-[10px] font-bold text-primary border-primary/30 mt-0.5 capitalize">
                                  {pm.method_type.replace("_", " ")}
                                </Badge>
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <Badge variant={pm.is_active ? "default" : "secondary"} className="text-[10px]">
                                {pm.is_active ? "Active" : "Disabled"}
                              </Badge>
                              {pm.institution_id ? (
                                <Badge variant="outline" className="text-[9px] font-medium text-muted-foreground">
                                  Business
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[9px] font-medium bg-blue-500/10 text-blue-600">
                                  Platform
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Specific Fields */}
                          {isUpi && (
                            <div className="space-y-2 pt-2 border-t text-xs">
                              {pm.upi_id && (
                                <div className="p-2.5 rounded-xl bg-muted/40 border flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-semibold text-muted-foreground block">UPI ID / VPA</span>
                                    <span className="font-mono font-bold text-foreground text-xs truncate block">{pm.upi_id}</span>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 shrink-0"
                                    onClick={() => {
                                      navigator.clipboard.writeText(pm.upi_id || "");
                                      toast.success("UPI ID copied to clipboard!");
                                    }}
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </Button>
                                </div>
                              )}

                              {pm.qr_code_url && (
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                  <QrCode className="w-3.5 h-3.5 text-primary" />
                                  <span>QR Code Configured</span>
                                </div>
                              )}
                            </div>
                          )}

                          {isBank && (
                            <div className="space-y-2 pt-2 border-t text-xs">
                              <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border text-[11px]">
                                {pm.bank_name && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground font-medium">Bank:</span>
                                    <span className="font-bold text-foreground">{pm.bank_name}</span>
                                  </div>
                                )}
                                {pm.account_holder_name && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground font-medium">A/C Name:</span>
                                    <span className="font-semibold text-foreground truncate max-w-[160px]">{pm.account_holder_name}</span>
                                  </div>
                                )}
                                {pm.account_number && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground font-medium">A/C No:</span>
                                    <span className="font-mono font-bold text-foreground flex items-center gap-1">
                                      {pm.account_number}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(pm.account_number || "");
                                          toast.success("Account number copied!");
                                        }}
                                        className="hover:text-primary"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </span>
                                  </div>
                                )}
                                {pm.ifsc_code && (
                                  <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground font-medium">IFSC Code:</span>
                                    <span className="font-mono font-bold text-foreground flex items-center gap-1">
                                      {pm.ifsc_code}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          navigator.clipboard.writeText(pm.ifsc_code || "");
                                          toast.success("IFSC copied!");
                                        }}
                                        className="hover:text-primary"
                                      >
                                        <Copy className="w-3 h-3" />
                                      </button>
                                    </span>
                                  </div>
                                )}
                                {pm.branch_name && (
                                  <div className="flex justify-between">
                                    <span className="text-muted-foreground font-medium">Branch:</span>
                                    <span className="text-muted-foreground">{pm.branch_name}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {isGateway && (
                            <div className="space-y-1.5 pt-2 border-t text-[11px]">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Provider:</span>
                                <span className="font-bold text-foreground">{pm.gateway_provider || "Razorpay"}</span>
                              </div>
                              {pm.merchant_id && (
                                <div className="flex justify-between font-mono">
                                  <span className="text-muted-foreground">Merchant ID:</span>
                                  <span className="truncate max-w-[150px]">{pm.merchant_id}</span>
                                </div>
                              )}
                              {Number(pm.convenience_fee_percent) > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Surcharge:</span>
                                  <span className="font-bold text-rose-600">+{pm.convenience_fee_percent}%</span>
                                </div>
                              )}
                            </div>
                          )}

                          {pm.instructions && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2 bg-muted/20 p-2 rounded-lg border border-border/50">
                              {pm.instructions}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t text-xs">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const res = await fetch("/api/admin/company/payment-methods", {
                                  method: "PUT",
                                  headers: { "Content-Type": "application/json", ...authHeader },
                                  body: JSON.stringify({ id: pm.id, is_active: !pm.is_active }),
                                });
                                if (res.ok) {
                                  toast.success(`Payment method ${!pm.is_active ? "activated" : "disabled"}`);
                                  void fetchPaymentMethods();
                                }
                              } catch {
                                toast.error("Failed to update status");
                              }
                            }}
                            className={`text-[11px] font-bold transition-colors ${
                              pm.is_active ? "text-emerald-600 hover:text-emerald-700" : "text-slate-400 hover:text-foreground"
                            }`}
                          >
                            {pm.is_active ? "✓ Enabled" : "○ Disabled"}
                          </button>

                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingPm(pm);
                                setPmName(pm.name || "");
                                setPmMethodType(pm.method_type || "upi_qr");
                                setPmDisplayName(pm.display_name || "");
                                setPmUpiId(pm.upi_id || "");
                                setPmQrCodeUrl(pm.qr_code_url || "");
                                setPmBankName(pm.bank_name || "");
                                setPmAccountHolderName(pm.account_holder_name || "");
                                setPmAccountNumber(pm.account_number || "");
                                setPmIfscCode(pm.ifsc_code || "");
                                setPmBranchName(pm.branch_name || "");
                                setPmAccountType(pm.account_type || "Current");
                                setPmGatewayProvider(pm.gateway_provider || "Razorpay");
                                setPmMerchantId(pm.merchant_id || "");
                                setPmInstructions(pm.instructions || "");
                                setPmConvenienceFee(String(pm.convenience_fee_percent || 0));
                                setPmIsActive(pm.is_active);
                                setPmSortOrder(pm.sort_order || 0);
                                setPmDialogOpen(true);
                              }}
                              className="h-8 text-xs"
                            >
                              <Edit className="h-3.5 w-3.5 mr-1" /> Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                if (!confirm(`Are you sure you want to delete "${pm.name}"?`)) return;
                                try {
                                  const res = await fetch(`/api/admin/company/payment-methods?id=${pm.id}`, {
                                    method: "DELETE",
                                    headers: authHeader,
                                  });
                                  if (res.ok) {
                                    toast.success("Payment method deleted");
                                    void fetchPaymentMethods();
                                  }
                                } catch {
                                  toast.error("Failed to delete payment method");
                                }
                              }}
                              className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        {/* Company Info & Branches Tab */}
        <TabsContent value="contact-branches" className="space-y-6">
          {/* 1. Platform Company Information & Brand Identity Card */}
          <Card className="border-border shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-card/60 px-6 py-4">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Identity
                </CardTitle>
                <CardDescription>
                  Configure display name, categories, legal entity, or professional credentials.
                </CardDescription>
              </div>
              <Button
                onClick={handleSaveCompanyInfo}
                disabled={savingCompanyInfo || loadingCompanyInfo}
                size="sm"
                className="gap-2"
              >
                {savingCompanyInfo ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {companyInfo.listing_type === "professional" ? "Save Professional Profile" : "Save Information"}
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {loadingCompanyInfo ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span>Loading details...</span>
                </div>
              ) : (
                <>
                  {/* Brand Identity Section */}
                  <div className="p-5 rounded-xl border bg-muted/20 space-y-4">
                    <div className="flex items-center gap-2 border-b pb-3">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <h3 className="font-semibold text-sm tracking-wide uppercase text-foreground">Identity</h3>
                    </div>

                    <div className="space-y-4">
                      {/* Display Name */}
                      <div className="space-y-2">
                        <Label htmlFor="ci-brand-name" className="text-xs font-semibold">Display Name *</Label>
                        <Input
                          id="ci-brand-name"
                          value={companyInfo.brand_name || ""}
                          onChange={(e) => setCompanyInfo((prev) => ({ ...prev, brand_name: e.target.value }))}
                          placeholder="e.g. Kisan Fresh Mandi & Grocery Mart"
                        />
                      </div>

                      {/* Listing Type & Categories Section */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                        {/* Listing Type */}
                        <div className="space-y-1.5">
                          <Label htmlFor="ci-listing-type" className="text-xs font-semibold flex items-center gap-1.5">
                            <span>Listing Type / Account Type</span>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal border-primary/30 text-primary">Required</Badge>
                          </Label>
                          <select
                            id="ci-listing-type"
                            value={companyInfo.listing_type || "business"}
                            onChange={(e) => {
                              const newType = e.target.value;
                              setCompanyInfo((prev) => ({
                                ...prev,
                                listing_type: newType,
                                category_id: null,
                                subcategory_id: null,
                                subcategory_ids: [],
                                business_type: "",
                              }));
                              setSubcategories([]);
                            }}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                          >
                            <option value="business">🏢 Business Account</option>
                            <option value="professional">👤 Professional Account</option>
                          </select>
                          <p className="text-[11px] text-muted-foreground">
                            {companyInfo.listing_type === "professional"
                              ? "Individual practitioner, coach, doctor, or consultant"
                              : "Company, enterprise, agency, or commercial business"}
                          </p>
                        </div>

                        {/* Category */}
                        <div className="space-y-1.5">
                          <Label htmlFor="ci-category" className="text-xs font-semibold flex items-center gap-1.5">
                            <span>{companyInfo.listing_type === "professional" ? "Professional Category" : "Business Category"}</span>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal border-primary/30 text-primary">Required</Badge>
                          </Label>
                          <select
                            id="ci-category"
                            value={companyInfo.category_id || ""}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : null;
                              const activeList = companyInfo.listing_type === "professional" ? professionalCategories : businessCategories;
                              const matched = activeList.find((c) => c.id === val);
                              setCompanyInfo((prev) => ({
                                ...prev,
                                category_id: val,
                                subcategory_id: null,
                                subcategory_ids: [],
                                business_type: matched ? matched.name : prev.business_type,
                              }));
                              if (val) {
                                fetchSubcategories(val);
                              } else {
                                setSubcategories([]);
                              }
                            }}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                          >
                            <option value="">Select Category</option>
                            {(companyInfo.listing_type === "professional" ? professionalCategories : businessCategories).map((cat) => (
                              <option key={cat.id} value={cat.id}>
                                {cat.name}
                              </option>
                            ))}
                          </select>
                          <p className="text-[11px] text-muted-foreground">
                            Primary sector or operational industry
                          </p>
                        </div>

                        {/* Subcategory */}
                        <div className="space-y-1.5">
                          <Label htmlFor="ci-subcategory" className="text-xs font-semibold flex items-center justify-between">
                            <span>
                              {companyInfo.listing_type === "professional" ? "Specialization / Subcategories" : "Business Subcategories"}
                            </span>
                            {companyInfo.subcategory_ids && companyInfo.subcategory_ids.length > 0 && (
                              <span className="text-[10px] text-primary font-medium">
                                {companyInfo.subcategory_ids.length} selected
                              </span>
                            )}
                          </Label>
                          <MultiSelect
                            options={subcategories.map((sub) => ({
                              label: sub.name,
                              value: String(sub.id),
                            }))}
                            value={(companyInfo.subcategory_ids || []).map(String)}
                            onValueChange={(vals) => {
                              const numVals = vals.map(Number).filter((n) => !isNaN(n) && n > 0);
                              setCompanyInfo((prev) => ({
                                ...prev,
                                subcategory_ids: numVals,
                                subcategory_id: numVals[0] || null,
                              }));
                            }}
                            placeholder={
                              loadingSubcategories
                                ? "Loading subcategories..."
                                : !companyInfo.category_id
                                ? "Select a category first"
                                : "Select subcategories..."
                            }
                            disabled={!companyInfo.category_id || loadingSubcategories}
                            maxCount={2}
                            responsive
                            searchable={subcategories.length > 5}
                            deduplicateOptions
                            className="w-full min-h-10 bg-background"
                            popoverClassName="z-100"
                          />
                          <p className="text-[11px] text-muted-foreground">
                            Specific domain niches or specializations (multiple can be selected)
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Conditional Section: Legal Entity (Business) vs Professional Profile (Professional) */}
                  {companyInfo.listing_type === "professional" ? (
                    <div className="p-5 rounded-xl border bg-muted/20 space-y-4">
                      <div className="flex items-center gap-2 border-b pb-3">
                        <Briefcase className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-sm tracking-wide uppercase text-foreground">Professional Profile & Credentials</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="ci-exp-years" className="text-xs font-semibold">Total Experience (Years) *</Label>
                          <Input
                            id="ci-exp-years"
                            type="number"
                            min="0"
                            max="70"
                            value={companyInfo.experience_years ?? ""}
                            onChange={(e) => setCompanyInfo((prev) => ({ ...prev, experience_years: e.target.value }))}
                            placeholder="e.g. 8"
                          />
                          <p className="text-[11px] text-muted-foreground">Total practice or industry experience</p>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="ci-qualifications" className="text-xs font-semibold">Education & Highest Qualifications *</Label>
                          <Input
                            id="ci-qualifications"
                            value={companyInfo.qualifications || ""}
                            onChange={(e) => setCompanyInfo((prev) => ({ ...prev, qualifications: e.target.value }))}
                            placeholder="e.g. LL.M in Corporate Law, B.A. LL.B (Hons), Bar Council License"
                          />
                          <p className="text-[11px] text-muted-foreground">Degrees, diplomas, certifications or academic credentials</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ci-skills" className="text-xs font-semibold">Key Skills & Specializations *</Label>
                        <Input
                          id="ci-skills"
                          value={companyInfo.skills || ""}
                          onChange={(e) => setCompanyInfo((prev) => ({ ...prev, skills: e.target.value }))}
                          placeholder="e.g. Corporate Law, Contract Negotiation, IP Licensing, Civil Litigation, Dispute Advisory"
                        />
                        <p className="text-[11px] text-muted-foreground">Comma-separated skills, domains, or competencies</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ci-about" className="text-xs font-semibold">Professional Bio / Practice Overview</Label>
                        <Textarea
                          id="ci-about"
                          rows={3}
                          value={companyInfo.about_text || ""}
                          onChange={(e) => setCompanyInfo((prev) => ({ ...prev, about_text: e.target.value }))}
                          placeholder="Comprehensive summary of professional journey, core practice areas, and advisory engagements..."
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="p-5 rounded-xl border bg-muted/20 space-y-4">
                      <div className="flex items-center gap-2 border-b pb-3">
                        <Building2 className="h-4 w-4 text-primary" />
                        <h3 className="font-semibold text-sm tracking-wide uppercase text-foreground">Legal Entity & Registration</h3>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2 md:col-span-1">
                          <Label htmlFor="ci-legal-name" className="text-xs font-semibold">Registered Company Legal Name *</Label>
                          <Input
                            id="ci-legal-name"
                            value={companyInfo.company_name || ""}
                            onChange={(e) => setCompanyInfo((prev) => ({ ...prev, company_name: e.target.value }))}
                            placeholder="e.g. EduBird Technologies Private Limited"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ci-cin" className="text-xs font-semibold">Corporate Identity No (CIN)</Label>
                          <Input
                            id="ci-cin"
                            value={companyInfo.cin_number || ""}
                            onChange={(e) => setCompanyInfo((prev) => ({ ...prev, cin_number: e.target.value }))}
                            placeholder="e.g. U72900DL2023PTC123456"
                            className="font-mono text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="ci-gstin" className="text-xs font-semibold">GSTIN / Tax ID</Label>
                          <Input
                            id="ci-gstin"
                            value={companyInfo.gstin || ""}
                            onChange={(e) => setCompanyInfo((prev) => ({ ...prev, gstin: e.target.value }))}
                            placeholder="e.g. 07AAAAA0000A1Z5"
                            className="font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ci-about" className="text-xs font-semibold">About Company / Platform Brief</Label>
                        <Textarea
                          id="ci-about"
                          rows={2}
                          value={companyInfo.about_text || ""}
                          onChange={(e) => setCompanyInfo((prev) => ({ ...prev, about_text: e.target.value }))}
                          placeholder="Brief summary of company vision, mission, and scope shown on platform landing pages..."
                        />
                      </div>
                    </div>
                  )}

                  {/* Images & Media Gallery Section */}
                  <div className="p-5 rounded-xl border bg-muted/20 space-y-5">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="h-4 w-4 text-primary" />
                          <h3 className="font-semibold text-sm tracking-wide uppercase text-foreground">
                            {companyInfo.listing_type === "professional" ? "Professional Photos & Media Gallery" : "Business Images & Media Gallery"}
                          </h3>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {companyInfo.listing_type === "professional"
                            ? "Upload your professional profile photo, cover banner, and portfolio showcase images."
                            : "Upload your business logo, storefront cover banner, and multiple showcase gallery photos."}
                        </p>
                      </div>
                    </div>

                    {/* Row 1: Logo/Profile Photo & Cover Banner */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      {/* Box 1: Logo or Profile Photo */}
                      <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {companyInfo.listing_type === "professional" ? "Profile Photo / Avatar *" : "Business Logo *"}
                          </Label>
                          <span className="text-[10px] text-muted-foreground">Square 1:1 ratio</span>
                        </div>

                        <div className="flex items-center gap-4">
                          <div className={`size-20 border overflow-hidden relative flex items-center justify-center bg-muted/40 shrink-0 ${companyInfo.listing_type === "professional" ? "rounded-full" : "rounded-2xl"}`}>
                            {companyInfo.logo_url ? (
                              <img src={companyInfo.logo_url} alt="Logo" className="w-full h-full object-cover" />
                            ) : (
                              companyInfo.listing_type === "professional" ? (
                                <User className="size-8 text-muted-foreground/50" />
                              ) : (
                                <Building2 className="size-8 text-muted-foreground/50" />
                              )
                            )}
                          </div>

                          <div className="space-y-2 flex-1">
                            <div className="flex items-center gap-2">
                              <label className="cursor-pointer inline-flex items-center justify-center px-3 h-8 rounded-lg border bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold gap-1.5 shadow-2xs transition-colors">
                                {uploadingLogo ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                                <span>{uploadingLogo ? "Uploading..." : companyInfo.listing_type === "professional" ? "Upload Photo" : "Upload Logo"}</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  disabled={uploadingLogo}
                                  onChange={(e) => handleLogoUpload(e, "logo_url")}
                                />
                              </label>

                              {companyInfo.logo_url && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                  onClick={() => setCompanyInfo((prev) => ({ ...prev, logo_url: "" }))}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                              {companyInfo.listing_type === "professional"
                                ? "Professional headshot, portrait, or verified avatar photo."
                                : "Official company emblem, symbol, or brand mark."}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Box 2: Cover Banner */}
                      <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                            {companyInfo.listing_type === "professional" ? "Professional Cover Banner" : "Business Cover Banner"}
                          </Label>
                          <span className="text-[10px] text-muted-foreground">Landscape 16:9 ratio</span>
                        </div>

                        <div className="space-y-2">
                          <div className="aspect-[16/7] w-full rounded-xl border overflow-hidden relative bg-muted/40 flex items-center justify-center">
                            {companyInfo.banner_url ? (
                              <img src={companyInfo.banner_url} alt="Cover Banner" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center p-3 text-muted-foreground/60 space-y-1">
                                <ImageIcon className="size-6 mx-auto" />
                                <p className="text-[11px]">No cover banner uploaded</p>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <label className="cursor-pointer inline-flex items-center justify-center px-3 h-8 rounded-lg border bg-muted hover:bg-muted/80 text-xs font-semibold gap-1.5 shadow-2xs transition-colors">
                              {uploadingBanner ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
                              <span>{uploadingBanner ? "Uploading Banner..." : "Upload Banner"}</span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingBanner}
                                onChange={handleBannerUpload}
                              />
                            </label>

                            {companyInfo.banner_url && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                onClick={() => setCompanyInfo((prev) => ({ ...prev, banner_url: "" }))}
                              >
                                Remove Banner
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Gallery Images (Multiple) */}
                    <div className="p-4 rounded-xl border bg-card shadow-2xs space-y-3.5">
                      <div className="flex items-center justify-between border-b pb-2.5">
                        <div>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <ImageIcon className="size-3.5 text-primary" />
                            <span>{companyInfo.listing_type === "professional" ? "Portfolio & Work Showcase Gallery" : "Gallery & Showcase Images"}</span>
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold ml-1">
                              {(companyInfo.gallery_images || []).length}
                            </Badge>
                          </h4>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {companyInfo.listing_type === "professional"
                              ? "Upload multiple photos of work samples, certificates, consultation clinic, or office."
                              : "Upload multiple photos of storefront, product showcases, facility interior, and team."}
                          </p>
                        </div>

                        <label className="cursor-pointer inline-flex items-center justify-center px-3 h-8 rounded-lg border bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold gap-1.5 shadow-2xs transition-colors shrink-0">
                          {uploadingGallery ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                          <span>{uploadingGallery ? "Adding Photos..." : "Add Multiple Photos"}</span>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            disabled={uploadingGallery}
                            onChange={handleGalleryUpload}
                          />
                        </label>
                      </div>

                      {/* Gallery Grid */}
                      {(!companyInfo.gallery_images || companyInfo.gallery_images.length === 0) ? (
                        <div className="p-8 border-2 border-dashed rounded-xl text-center text-xs text-muted-foreground space-y-1">
                          <ImageIcon className="size-8 mx-auto text-muted-foreground/40 mb-1" />
                          <p className="font-semibold text-foreground text-xs">No gallery photos added yet</p>
                          <p className="text-[11px] text-muted-foreground">Click &ldquo;Add Multiple Photos&rdquo; above to select and upload multiple images.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pt-1">
                          {companyInfo.gallery_images.map((imgUrl, gIdx) => (
                            <div key={gIdx} className="aspect-video rounded-xl border overflow-hidden relative group bg-muted/30 shadow-2xs">
                              <img src={imgUrl} alt={`Gallery ${gIdx + 1}`} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button
                                  type="button"
                                  variant="destructive"
                                  size="icon"
                                  className="size-7 rounded-full shadow-md"
                                  onClick={() => handleRemoveGalleryImage(gIdx)}
                                  title="Remove photo"
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </div>
                              <span className="absolute bottom-1 left-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-black/60 text-white backdrop-blur-xs">
                                #{gIdx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Working Hours Section */}
                  {renderWorkingHoursEditor()}

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleSaveCompanyInfo}
                      disabled={savingCompanyInfo}
                      className="gap-2"
                    >
                      {savingCompanyInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {companyInfo.listing_type === "professional" ? "Save Professional Profile & Credentials" : "Save Information"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Dedicated Working Hours Tab */}
        <TabsContent value="working-hours" className="space-y-6">
          <Card className="border-border shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-card/60 px-6 py-4">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  {companyInfo.listing_type === "professional" ? "Working Hours & Professional Availability" : "Operating & Working Hours"}
                </CardTitle>
                <CardDescription>
                  Configure weekly operating schedule, open & close timings, and holidays. Displayed publicly on your storefront.
                </CardDescription>
              </div>
              <Button
                onClick={handleSaveCompanyInfo}
                disabled={savingCompanyInfo || loadingCompanyInfo}
                size="sm"
                className="gap-2"
              >
                {savingCompanyInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {companyInfo.listing_type === "professional" ? "Save Working Hours" : "Save Operating Hours"}
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {loadingCompanyInfo ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" />
                  <span>Loading working hours...</span>
                </div>
              ) : (
                <>
                  {renderWorkingHoursEditor()}
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleSaveCompanyInfo}
                      disabled={savingCompanyInfo}
                      className="gap-2"
                    >
                      {savingCompanyInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      {companyInfo.listing_type === "professional" ? "Save Working Hours" : "Save Operating Hours"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Address / Branch Offices Tab */}
        <TabsContent value="address" className="space-y-6">
          {renderAddressManagementCard()}
        </TabsContent>

        {/* 1. About Company Tab */}
        <TabsContent value="about-institute" className="space-y-6">
          <Card className="border-border shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-card/60 px-6 py-4">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  About Company & Organization Story
                </CardTitle>
                <CardDescription>
                  Configure comprehensive company overview, heritage, accreditations, and official profile descriptions.
                </CardDescription>
              </div>
              <Button
                onClick={handleSaveCompanyInfo}
                disabled={savingCompanyInfo || loadingCompanyInfo}
                size="sm"
                className="gap-2"
              >
                {savingCompanyInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Information
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inst-about" className="text-xs font-semibold">About Company / Overview & Story *</Label>
                  <Textarea
                    id="inst-about"
                    rows={8}
                    value={companyInfo.about || companyInfo.about_text || ""}
                    onChange={(e) => setCompanyInfo((prev) => ({ ...prev, about: e.target.value, about_text: e.target.value }))}
                    placeholder="Comprehensive description of the company, its background, services, expertise, and operational excellence..."
                  />
                  <p className="text-[11px] text-muted-foreground">This content displays in the About section on the public website and portal.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="inst-year" className="text-xs font-semibold">Established Year</Label>
                    <Input
                      id="inst-year"
                      type="number"
                      value={companyInfo.established_year || ""}
                      onChange={(e) => setCompanyInfo((prev) => ({ ...prev, established_year: e.target.value }))}
                      placeholder="e.g. 2019"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inst-accreditation" className="text-xs font-semibold">Accreditation & Affiliations</Label>
                    <Input
                      id="inst-accreditation"
                      value={companyInfo.certified_or_affiliated_with || ""}
                      onChange={(e) => setCompanyInfo((prev) => ({ ...prev, certified_or_affiliated_with: e.target.value }))}
                      placeholder="e.g. ISO 9001:2015, Recognized Partner"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inst-web" className="text-xs font-semibold">Official Website</Label>
                    <Input
                      id="inst-web"
                      value={companyInfo.website_url || ""}
                      onChange={(e) => setCompanyInfo((prev) => ({ ...prev, website_url: e.target.value }))}
                      placeholder="https://example.com"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveCompanyInfo}
                    disabled={savingCompanyInfo}
                    className="gap-2"
                  >
                    {savingCompanyInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Information
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. Mission, Vision & Goal Tab */}
        <TabsContent value="mission-vision-goal" className="space-y-6">
          <Card className="border-border shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-card/60 px-6 py-4">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Mission, Vision & Strategic Goals
                </CardTitle>
                <CardDescription>
                  Define your core principles, organization aims, customer success vision, and key strategic goals.
                </CardDescription>
              </div>
              <Button
                onClick={handleSaveCompanyInfo}
                disabled={savingCompanyInfo || loadingCompanyInfo}
                size="sm"
                className="gap-2"
              >
                {savingCompanyInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Mission, Vision & Goals
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="space-y-6">
                {/* Mission */}
                <div className="p-5 rounded-xl border bg-muted/20 space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Target className="h-4 w-4 text-rose-600" />
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-foreground">Mission Statement</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    What is your core purpose and primary commitment to clients and the community?
                  </p>
                  <Textarea
                    rows={4}
                    value={companyInfo.mission || ""}
                    onChange={(e) => setCompanyInfo((prev) => ({ ...prev, mission: e.target.value }))}
                    placeholder="Our mission is to provide high quality, accessible, and reliable services that empower our clients and community..."
                  />
                </div>

                {/* Vision */}
                <div className="p-5 rounded-xl border bg-muted/20 space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <Compass className="h-4 w-4 text-indigo-600" />
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-foreground">Vision Statement</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Where do you see the company in the future, and what benchmark of excellence do you aspire to achieve?
                  </p>
                  <Textarea
                    rows={4}
                    value={companyInfo.vision || ""}
                    onChange={(e) => setCompanyInfo((prev) => ({ ...prev, vision: e.target.value }))}
                    placeholder="Our vision is to become a trusted and leading organization recognized for quality, innovation, and client success..."
                  />
                </div>

                {/* Goals */}
                <div className="p-5 rounded-xl border bg-muted/20 space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    <h3 className="font-semibold text-sm uppercase tracking-wide text-foreground">Strategic Goals & Key Objectives</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    List key objectives such as Service Excellence, Innovation, Client Success, Industry Leadership, and Ethical Values.
                  </p>
                  <Textarea
                    rows={6}
                    value={companyInfo.goal || ""}
                    onChange={(e) => setCompanyInfo((prev) => ({ ...prev, goal: e.target.value }))}
                    placeholder="Service Excellence: Deliver exceptional quality and consistent reliability.&#10;Innovation: Adopt progressive tools and modern techniques.&#10;Client Success: Help every client achieve their strategic goals..."
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveCompanyInfo}
                    disabled={savingCompanyInfo}
                    className="gap-2"
                  >
                    {savingCompanyInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Mission, Vision & Goals
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. About Founder Tab */}
        <TabsContent value="about-founder" className="space-y-6">
          <Card className="border-border shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-card/60 px-6 py-4">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  About Founder & Leadership
                </CardTitle>
                <CardDescription>
                  Configure the founder profile, photograph, title/designation, leadership background, and vision message.
                </CardDescription>
              </div>
              <Button
                onClick={handleSaveCompanyInfo}
                disabled={savingCompanyInfo || loadingCompanyInfo}
                size="sm"
                className="gap-2"
              >
                {savingCompanyInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Founder Details
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                {/* Founder Photo */}
                <div className="md:col-span-4 flex flex-col items-center justify-center p-5 border rounded-xl bg-background text-center space-y-3">
                  <Label className="text-xs font-semibold text-muted-foreground">Founder / Leader Photograph</Label>
                  <div className="w-40 h-40 rounded-full border-2 border-dashed border-primary/40 flex items-center justify-center overflow-hidden bg-muted/30 relative group shadow-inner">
                    {companyInfo.founder_image_url ? (
                      <img
                        src={companyInfo.founder_image_url}
                        alt={companyInfo.founder_name || "Founder"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center text-muted-foreground p-3">
                        <User className="h-12 w-12 stroke-[1.5] text-primary/60 mb-1" />
                        <span className="text-[11px]">No photo set</span>
                      </div>
                    )}
                  </div>

                  <div className="w-full space-y-2">
                    <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 w-full text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors py-2 px-3 rounded-lg border border-primary/20">
                      {uploadingFounderImage ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      <span>{uploadingFounderImage ? "Uploading..." : "Upload Founder Photo"}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingFounderImage}
                        onChange={handleFounderImageUpload}
                      />
                    </label>
                    {companyInfo.founder_image_url && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive hover:bg-destructive/10 h-7 w-full"
                        onClick={() => setCompanyInfo((prev) => ({ ...prev, founder_image_url: "" }))}
                      >
                        Remove Photo
                      </Button>
                    )}
                    <p className="text-[11px] text-muted-foreground">JPG, PNG, or WebP (square recommended)</p>
                  </div>
                </div>

                {/* Founder Details */}
                <div className="md:col-span-8 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="founder-name" className="text-xs font-semibold">Founder / Director Full Name *</Label>
                      <Input
                        id="founder-name"
                        value={companyInfo.founder_name || ""}
                        onChange={(e) => setCompanyInfo((prev) => ({ ...prev, founder_name: e.target.value }))}
                        placeholder="e.g. Mr. Deepak Yadav"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="founder-title" className="text-xs font-semibold">Founder Title / Designation</Label>
                      <Input
                        id="founder-title"
                        value={companyInfo.founder_title || ""}
                        onChange={(e) => setCompanyInfo((prev) => ({ ...prev, founder_title: e.target.value }))}
                        placeholder="e.g. Founder & Managing Director"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="founder-bio" className="text-xs font-semibold">Founder Biography, Background & Vision Message *</Label>
                    <Textarea
                      id="founder-bio"
                      rows={8}
                      value={companyInfo.founder_about || ""}
                      onChange={(e) => setCompanyInfo((prev) => ({ ...prev, founder_about: e.target.value }))}
                      placeholder="Deepak Yadav aka MD sir is a visionary person with the perfect combination of Knowledge, Understanding, Creativity, and Imagination..."
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleSaveCompanyInfo}
                      disabled={savingCompanyInfo}
                      className="gap-2"
                    >
                      {savingCompanyInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Founder Details
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. Facilities & Infrastructure Tab */}
        <TabsContent value="facilities" className="space-y-6">
          <Card className="border-border shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-card/60 px-6 py-4">
              <div className="space-y-1">
                <CardTitle className="text-xl flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Facilities & Infrastructure Directory
                </CardTitle>
                <CardDescription>
                  Manage amenities, workspaces, equipment, infrastructure, and facilities showcased on public pages.
                </CardDescription>
              </div>
              <Button onClick={handleOpenAddFacility} size="sm" className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Add Facility
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              {loadingFacilities ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading facilities...
                </div>
              ) : facilities.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
                  <Sparkles className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="font-medium text-base">No facilities configured yet.</p>
                  <p className="text-sm text-muted-foreground mb-4">Add your infrastructure, workspaces, centers, and amenities.</p>
                  <Button onClick={handleOpenAddFacility} size="sm">
                    <Plus className="mr-1.5 h-4 w-4" /> Add Facility
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {facilities.map((f) => (
                    <div
                      key={f.id}
                      className="p-4 rounded-xl border bg-card hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-2.5">
                        <div className="w-full h-36 rounded-lg bg-muted/30 overflow-hidden relative border border-muted/50">
                          {f.image_url ? (
                            <img src={f.image_url} alt={f.title || "Facility"} className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                              <Sparkles className="h-8 w-8 stroke-[1.5] text-muted-foreground/40 mb-1" />
                              <span className="text-[11px]">No photo</span>
                            </div>
                          )}
                          <Badge className="absolute top-2 left-2 bg-background/90 text-foreground text-[10px] shadow-xs backdrop-blur-xs">
                            {f.facility_type_name || "Facility"}
                          </Badge>
                        </div>

                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-foreground">{f.title || f.facility_type_name}</h4>
                          <Badge variant={f.is_active ? "default" : "secondary"} className="text-[10px]">
                            {f.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>

                        {f.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {f.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t">
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => handleOpenEditFacility(f)}>
                          <Edit className="h-3 w-3 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 px-2 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteFacility(f.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add / Edit FAQ Dialog */}
      <Dialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFaq ? "Edit FAQ" : "Add FAQ Question"}</DialogTitle>
            <DialogDescription>
              Add commonly asked questions and answers for your business.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="faq-q">Question *</Label>
              <Input
                id="faq-q"
                value={faqQuestion}
                onChange={(e) => setFaqQuestion(e.target.value)}
                placeholder="e.g. What are your operating hours and services offered?"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="faq-a">Answer *</Label>
              <Textarea
                id="faq-a"
                rows={4}
                value={faqAnswer}
                onChange={(e) => setFaqAnswer(e.target.value)}
                placeholder="Provide a detailed and helpful response..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="faq-cat">Category</Label>
                <Input
                  id="faq-cat"
                  value={faqCategory}
                  onChange={(e) => setFaqCategory(e.target.value)}
                  placeholder="e.g. Admissions, Fees, Courses"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faq-order">Display Order</Label>
                <Input
                  id="faq-order"
                  type="number"
                  value={faqOrder}
                  onChange={(e) => setFaqOrder(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={faqPublished}
                  onChange={(e) => setFaqPublished(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
                Published on Site
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFaqDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFaq} disabled={savingFaq}>
              {savingFaq ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {editingFaq ? "Update FAQ" : "Save FAQ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Branch / Office Address Dialog */}
      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBranch ? "Edit Address" : "Add Address"}</DialogTitle>
            <DialogDescription className="sr-only">
              Configure official address and contact details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="br-name">Name of Address *</Label>
              <Input
                id="br-name"
                value={branchName}
                onChange={(e) => setBranchName(e.target.value)}
                placeholder="e.g. EduBird North Regional Office"
              />
            </div>

            <div className="space-y-2 relative">
              <Label htmlFor="br-addr">Street Address *</Label>
              <div className="relative">
                <Input
                  id="br-addr"
                  value={branchAddressQuery || branchAddress}
                  onChange={(e) => handleBranchAddressInputChange(e.target.value)}
                  onFocus={() => {
                    if (branchAddressSuggestions.length > 0) setShowBranchSuggestions(true);
                  }}
                  placeholder="Start typing to search address (e.g. km, park, street)..."
                  className="pr-10"
                />
                {searchingBranchAddress && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Type to get Google suggested locations. City, state & pincode will auto-fill.
              </p>
              {showBranchSuggestions && branchAddressSuggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-border/60">
                  {branchAddressSuggestions.map((item, idx) => (
                    <button
                      key={item.id || idx}
                      type="button"
                      className="w-full text-left px-3 py-2.5 hover:bg-accent/80 transition-colors flex items-start gap-2.5 cursor-pointer"
                      onClick={() => handleSelectBranchSuggestion(item)}
                    >
                      <MapPin className="size-4 text-rose-500 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate">{item.name}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{item.description || item.secondary_text}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="br-city">City *</Label>
                <Input
                  id="br-city"
                  value={branchCity}
                  onChange={(e) => setBranchCity(e.target.value)}
                  placeholder="e.g. Noida"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="br-state">State</Label>
                <Input
                  id="br-state"
                  value={branchState}
                  onChange={(e) => setBranchState(e.target.value)}
                  placeholder="e.g. Uttar Pradesh"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="br-pin">Pincode</Label>
                <Input
                  id="br-pin"
                  value={branchPincode}
                  onChange={(e) => setBranchPincode(e.target.value)}
                  placeholder="e.g. 201301"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="br-phone">Phone Number</Label>
                <Input
                  id="br-phone"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="br-email">Email Address</Label>
                <Input
                  id="br-email"
                  type="email"
                  value={branchEmail}
                  onChange={(e) => setBranchEmail(e.target.value)}
                  placeholder="noida@edubird.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="br-map">Google Maps Embed or Location Link URL</Label>
              <Input
                id="br-map"
                value={branchMapUrl}
                onChange={(e) => setBranchMapUrl(e.target.value)}
                placeholder="https://maps.google.com/?q=..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBranchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBranch} disabled={savingBranch}>
              {savingBranch ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {editingBranch ? "Update Address" : "Save Address"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Payment Method Dialog */}
      <Dialog open={pmDialogOpen} onOpenChange={setPmDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!pmName.trim()) {
                toast.error("Please enter a payment method name");
                return;
              }
              setSavingPm(true);
              try {
                const method = editingPm ? "PUT" : "POST";
                const res = await fetch("/api/admin/company/payment-methods", {
                  method,
                  headers: {
                    "Content-Type": "application/json",
                    ...authHeader,
                    ...(activeInstId ? { "x-institution-id": activeInstId, "x-business-id": activeInstId } : {}),
                  },
                  body: JSON.stringify({
                    id: editingPm?.id,
                    name: pmName.trim(),
                    institution_id: activeInstId ? Number(activeInstId) : undefined,
                    method_type: pmMethodType,
                    display_name: pmDisplayName.trim() || pmName.trim(),
                    upi_id: pmUpiId.trim() || null,
                    qr_code_url: pmQrCodeUrl.trim() || null,
                    bank_name: pmBankName.trim() || null,
                    account_holder_name: pmAccountHolderName.trim() || null,
                    account_number: pmAccountNumber.trim() || null,
                    ifsc_code: pmIfscCode.trim() || null,
                    branch_name: pmBranchName.trim() || null,
                    account_type: pmAccountType,
                    gateway_provider: pmGatewayProvider.trim() || null,
                    merchant_id: pmMerchantId.trim() || null,
                    instructions: pmInstructions.trim() || null,
                    convenience_fee_percent: Number(pmConvenienceFee) || 0,
                    is_active: pmIsActive,
                    sort_order: Number(pmSortOrder) || 0,
                  }),
                });

                const json = await res.json();
                if (!res.ok) throw new Error(json.error || "Failed to save payment method");

                toast.success(editingPm ? "Payment method updated!" : "Payment method added!");
                setPmDialogOpen(false);
                void fetchPaymentMethods();
              } catch (err: any) {
                toast.error(err.message || "Failed to save payment method");
              } finally {
                setSavingPm(false);
              }
            }}
          >
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                {editingPm ? "Edit Payment Method" : "Add Payment Method & Details"}
              </DialogTitle>
              <DialogDescription>
                Configure UPI IDs, business bank accounts, or gateway credentials for payment collection.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Payment Type / Category *</Label>
                  <select
                    value={pmMethodType}
                    onChange={(e) => setPmMethodType(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs font-semibold ring-offset-background"
                  >
                    <option value="upi_qr">UPI / QR Code Scan</option>
                    <option value="bank_transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
                    <option value="online_gateway">Online Payment Gateway</option>
                    <option value="cash_counter">Cash Counter (Accounts Desk)</option>
                    <option value="cheque_dd">Cheque / Demand Draft</option>
                    <option value="card_pos">POS Card Machine</option>
                    <option value="other">Other Method</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="font-semibold">Method Name / Title *</Label>
                  <Input
                    required
                    value={pmName}
                    onChange={(e) => setPmName(e.target.value)}
                    placeholder="e.g. Main Office UPI & QR Pay or Company Bank A/C"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="font-semibold">Public Display Subtitle</Label>
                <Input
                  value={pmDisplayName}
                  onChange={(e) => setPmDisplayName(e.target.value)}
                  placeholder="e.g. GooglePay, PhonePe, Paytm, BHIM, NetBanking"
                />
              </div>

              {/* UPI Fields */}
              {pmMethodType === "upi_qr" && (
                <div className="p-3.5 rounded-xl bg-muted/40 border space-y-3">
                  <h5 className="font-bold text-primary flex items-center gap-1.5">
                    <QrCode className="w-4 h-4" /> UPI & QR Code Settings
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="font-semibold">UPI ID / VPA *</Label>
                      <Input
                        value={pmUpiId}
                        onChange={(e) => setPmUpiId(e.target.value)}
                        placeholder="e.g. edubird.fees@icici"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-semibold">QR Code Image URL (optional)</Label>
                      <Input
                        value={pmQrCodeUrl}
                        onChange={(e) => setPmQrCodeUrl(e.target.value)}
                        placeholder="https://... or /uploads/qr.png"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Bank Details Fields */}
              {pmMethodType === "bank_transfer" && (
                <div className="p-3.5 rounded-xl bg-muted/40 border space-y-3">
                  <h5 className="font-bold text-primary flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> Bank Account Details
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="font-semibold">Bank Name *</Label>
                      <Input
                        value={pmBankName}
                        onChange={(e) => setPmBankName(e.target.value)}
                        placeholder="e.g. HDFC Bank / State Bank of India"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-semibold">Account Holder Name *</Label>
                      <Input
                        value={pmAccountHolderName}
                        onChange={(e) => setPmAccountHolderName(e.target.value)}
                        placeholder="e.g. Maa Sharda Educational Trust"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="font-semibold">Account Number *</Label>
                      <Input
                        value={pmAccountNumber}
                        onChange={(e) => setPmAccountNumber(e.target.value)}
                        placeholder="e.g. 50200012345678"
                        className="font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-semibold">IFSC Code *</Label>
                      <Input
                        value={pmIfscCode}
                        onChange={(e) => setPmIfscCode(e.target.value)}
                        placeholder="e.g. HDFC0001234"
                        className="font-mono uppercase"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-semibold">Account Type</Label>
                      <select
                        value={pmAccountType}
                        onChange={(e) => setPmAccountType(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background"
                      >
                        <option value="Current">Current Account</option>
                        <option value="Savings">Savings Account</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-semibold">Branch & City</Label>
                    <Input
                      value={pmBranchName}
                      onChange={(e) => setPmBranchName(e.target.value)}
                      placeholder="e.g. Connaught Place Branch, New Delhi"
                    />
                  </div>
                </div>
              )}

              {/* Online Gateway Fields */}
              {pmMethodType === "online_gateway" && (
                <div className="p-3.5 rounded-xl bg-muted/40 border space-y-3">
                  <h5 className="font-bold text-primary flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4" /> Gateway Credentials
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="font-semibold">Gateway Provider</Label>
                      <select
                        value={pmGatewayProvider}
                        onChange={(e) => setPmGatewayProvider(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs ring-offset-background"
                      >
                        <option value="Razorpay">Razorpay</option>
                        <option value="Stripe">Stripe</option>
                        <option value="Cashfree">Cashfree</option>
                        <option value="PayU">PayU</option>
                        <option value="Easebuzz">Easebuzz</option>
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-semibold">Merchant / Key ID</Label>
                      <Input
                        value={pmMerchantId}
                        onChange={(e) => setPmMerchantId(e.target.value)}
                        placeholder="e.g. rzp_live_xxxxxxxx"
                        className="font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label className="font-semibold">Payment Instructions for Customers / Clients</Label>
                <Textarea
                  rows={2}
                  value={pmInstructions}
                  onChange={(e) => setPmInstructions(e.target.value)}
                  placeholder="e.g. After completing the payment, please share the transaction UTR number or receipt screenshot with our billing desk."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="font-semibold">Convenience Fee / Surcharge (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={pmConvenienceFee}
                    onChange={(e) => setPmConvenienceFee(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="font-semibold">Display Order</Label>
                  <Input
                    type="number"
                    value={pmSortOrder}
                    onChange={(e) => setPmSortOrder(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pmIsActive}
                    onChange={(e) => setPmIsActive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-primary"
                  />
                  Active (Available for Payment Collection)
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPmDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={savingPm}>
                {savingPm ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                {editingPm ? "Update Payment Method" : "Save Payment Method"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Facility Dialog */}
      <Dialog open={facilityDialogOpen} onOpenChange={setFacilityDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFacility ? "Edit Facility" : "Add Facility"}</DialogTitle>
            <DialogDescription>
              Configure infrastructure, workspace, equipment, and facility details.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="fac-type">Facility Category / Type *</Label>
              <select
                id="fac-type"
                value={facilityTypeId}
                onChange={(e) => setFacilityTypeId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">Select facility category...</option>
                {facilityTypes.map((ft) => (
                  <option key={ft.id} value={ft.id}>
                    {ft.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fac-title">Facility Title / Display Name</Label>
              <Input
                id="fac-title"
                value={facilityTitle}
                onChange={(e) => setFacilityTitle(e.target.value)}
                placeholder="e.g. Advanced AI & Robotics Computing Lab"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fac-desc">Description & Equipment Details</Label>
              <Textarea
                id="fac-desc"
                rows={3}
                value={facilityDescription}
                onChange={(e) => setFacilityDescription(e.target.value)}
                placeholder="Equipped with 30 high-speed workstations, smart display, high-speed fiber internet..."
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">Facility Photo</Label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-lg border border-dashed flex items-center justify-center overflow-hidden bg-muted/30 shrink-0">
                  {facilityImageUrl ? (
                    <img src={facilityImageUrl} alt="Facility" className="w-full h-full object-cover" />
                  ) : (
                    <Sparkles className="h-5 w-5 text-muted-foreground/40" />
                  )}
                </div>
                <label className="cursor-pointer inline-flex items-center justify-center gap-1.5 text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors py-2 px-3 rounded-lg border border-primary/20">
                  {uploadingFacilityImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                  <span>{uploadingFacilityImage ? "Uploading..." : "Upload Photo"}</span>
                  <input type="file" accept="image/*" className="hidden" disabled={uploadingFacilityImage} onChange={handleFacilityImageUpload} />
                </label>
                {facilityImageUrl && (
                  <Button type="button" variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => setFacilityImageUrl("")}>
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="fac-active"
                checked={facilityIsActive}
                onChange={(e) => setFacilityIsActive(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="fac-active" className="text-sm font-normal cursor-pointer">
                Active and visible on public website & portal
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFacilityDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveFacility} disabled={savingFacility}>
              {savingFacility ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
              {editingFacility ? "Save Changes" : "Create Facility"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
