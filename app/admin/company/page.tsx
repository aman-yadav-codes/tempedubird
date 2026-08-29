"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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
  Edit,
  CreditCard,
  Wallet,
  QrCode,
  IndianRupee,
  Copy,
  Check,
} from "lucide-react";
import { toast } from "sonner";

import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const PAGE_TABS = [
  { slug: "contact-branches", label: "Contact & Branches", icon: MapPin },
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
  const { user, accessToken } = useAuthStore();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isInstAdmin = isInstitutionAdminUser(user);
  const canAccessCompany = isPlatformAdmin || isInstAdmin;

  const tabFromUrl = searchParams.get("tab") || "faqs";
  const [activeTab, setActiveTab] = useState<string>(tabFromUrl);

  const [loadingPages, setLoadingPages] = useState(true);
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
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl, activeTab]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    router.push(`/admin/company?tab=${val}`);
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
  const [branchCity, setBranchCity] = useState("");
  const [branchAddress, setBranchAddress] = useState("");
  const [branchPhone, setBranchPhone] = useState("");
  const [branchEmail, setBranchEmail] = useState("");
  const [branchMapUrl, setBranchMapUrl] = useState("");
  const [branchManagerName, setBranchManagerName] = useState("");
  const [branchStatus, setBranchStatus] = useState("active");
  const [savingBranch, setSavingBranch] = useState(false);

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
      const res = await fetch("/api/admin/company/payment-methods", { headers: authHeader });
      if (res.ok) {
        const json = await res.json();
        setPaymentMethods(json.data || []);
      }
    } catch (err) {
      console.error("Failed to load payment methods:", err);
    } finally {
      setLoadingPaymentMethods(false);
    }
  }, [authHeader]);

  const fetchBranches = useCallback(async () => {
    setLoadingBranches(true);
    try {
      const res = await fetch("/api/admin/company/branches", { headers: authHeader });
      if (res.ok) {
        const json = await res.json();
        setBranches(json.branches || []);
      }
    } catch (err) {
      console.error("Failed to load branches:", err);
    } finally {
      setLoadingBranches(false);
    }
  }, [authHeader]);

  // Fetch all company pages and FAQs
  const fetchAllData = useCallback(async () => {
    setLoadingPages(true);
    try {
      const [pagesRes, faqsRes] = await Promise.all([
        fetch("/api/admin/company/pages", { headers: authHeader }),
        fetch("/api/admin/company/faqs", { headers: authHeader }),
      ]);

      if (pagesRes.ok) {
        const pagesJson = await pagesRes.json();
        const map: Record<string, CompanyPageData> = {};
        (pagesJson.data || []).forEach((p: CompanyPageData) => {
          map[p.slug] = p;
        });
        setPagesData(map);
      }

      if (faqsRes.ok) {
        const faqsJson = await faqsRes.json();
        setFaqs(faqsJson.data || []);
      }

      void fetchHostels();
      void fetchLibraries();
      void fetchBranches();
      void fetchPaymentMethods();
    } catch (err) {
      console.error("Failed to load company data:", err);
      toast.error("Failed to load company pages data.");
    } finally {
      setLoadingPages(false);
    }
  }, [authHeader, fetchHostels, fetchLibraries, fetchBranches, fetchPaymentMethods]);

  useEffect(() => {
    if (isReady && canAccessCompany) {
      fetchAllData();
    }
  }, [isReady, canAccessCompany, fetchAllData]);

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
      const res = await fetch("/api/admin/company/pages", {
        method: "PUT",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
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
      const isEdit = Boolean(editingFaq);
      const url = "/api/admin/company/faqs";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingFaq?.id,
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
      fetchAllData();
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
    setBranchCity("");
    setBranchAddress("");
    setBranchPhone("");
    setBranchEmail("");
    setBranchMapUrl("");
    setBranchManagerName("");
    setBranchStatus("active");
    setBranchDialogOpen(true);
  };

  const handleOpenEditBranch = (b: any) => {
    setEditingBranch(b);
    setBranchName(b.branch_name || "");
    setBranchCity(b.city || "");
    setBranchAddress(b.address || "");
    setBranchPhone(b.phone || "");
    setBranchEmail(b.email || "");
    setBranchMapUrl(b.map_url || "");
    setBranchManagerName(b.manager_name || "");
    setBranchStatus(b.status || "active");
    setBranchDialogOpen(true);
  };

  const handleSaveBranch = async () => {
    if (!branchName.trim() || !branchCity.trim() || !branchAddress.trim()) {
      toast.error("Branch name, city, and address are required");
      return;
    }
    setSavingBranch(true);
    try {
      const method = editingBranch ? "PUT" : "POST";
      const res = await fetch("/api/admin/company/branches", {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeader,
        },
        body: JSON.stringify({
          id: editingBranch?.id,
          branch_name: branchName,
          city: branchCity,
          address: branchAddress,
          phone: branchPhone,
          email: branchEmail,
          map_url: branchMapUrl,
          manager_name: branchManagerName,
          status: branchStatus,
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

  if (!isReady || loadingPages) {
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
                        Configure official social media URLs for your institution. These links display in the public footer, contact page, and institute profiles.
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <div className="space-y-1.5">
                          <Label htmlFor="social-facebook" className="text-xs font-medium">Facebook Page URL</Label>
                          <Input
                            id="social-facebook"
                            className="bg-background text-sm"
                            value={page.metadata?.facebook || ""}
                            onChange={(e) => handleMetaChange("social-links", "facebook", e.target.value)}
                            placeholder="https://facebook.com/your-institution"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="social-twitter" className="text-xs font-medium">X (Twitter) URL</Label>
                          <Input
                            id="social-twitter"
                            className="bg-background text-sm"
                            value={page.metadata?.twitter || ""}
                            onChange={(e) => handleMetaChange("social-links", "twitter", e.target.value)}
                            placeholder="https://x.com/your-institution"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="social-pinterest" className="text-xs font-medium">Pinterest URL</Label>
                          <Input
                            id="social-pinterest"
                            className="bg-background text-sm"
                            value={page.metadata?.pinterest || ""}
                            onChange={(e) => handleMetaChange("social-links", "pinterest", e.target.value)}
                            placeholder="https://pinterest.com/your-institution"
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
                            placeholder="https://instagram.com/your-institution"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <Label htmlFor="social-youtube" className="text-xs font-medium">YouTube Channel URL</Label>
                          <Input
                            id="social-youtube"
                            className="bg-background text-sm"
                            value={page.metadata?.youtube || ""}
                            onChange={(e) => handleMetaChange("social-links", "youtube", e.target.value)}
                            placeholder="https://youtube.com/@your-institution"
                          />
                        </div>

                        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                          <Label htmlFor="social-linkedin" className="text-xs font-medium">LinkedIn Page URL</Label>
                          <Input
                            id="social-linkedin"
                            className="bg-background text-sm"
                            value={page.metadata?.linkedin || ""}
                            onChange={(e) => handleMetaChange("social-links", "linkedin", e.target.value)}
                            placeholder="https://linkedin.com/company/your-institution"
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
                    Add official UPI IDs, institutional bank accounts, QR payment codes, or online gateways to accept payments.
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
                                  Institution
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
        {/* Contact & Branches Tab */}
        <TabsContent value="contact-branches" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b bg-card px-6 py-4">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Platform Contact & Branches Directory
                </CardTitle>
                <CardDescription>
                  Manage official EduBird regional branch offices, contact centers, and headquarters displayed on the home and contact pages.
                </CardDescription>
              </div>
              <Button onClick={handleOpenAddBranch} size="sm" className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Add Branch
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {loadingBranches ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading branches...
                </div>
              ) : branches.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
                  <MapPin className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="font-medium text-base">No branch offices added yet.</p>
                  <p className="text-sm text-muted-foreground mb-4">Add regional branches to showcase your platform presence across cities.</p>
                  <Button onClick={handleOpenAddBranch} size="sm">
                    <Plus className="mr-1.5 h-4 w-4" /> Add Branch
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {branches.map((b) => (
                    <div
                      key={b.id}
                      className="p-5 rounded-2xl border bg-card hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-base text-foreground block">{b.branch_name}</span>
                            <Badge variant="outline" className="text-xs font-semibold text-primary mt-0.5">
                              {b.city}
                            </Badge>
                          </div>
                          <Badge variant={b.status === "active" ? "default" : "secondary"} className="text-[10px]">
                            {b.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{b.address}</p>
                        {b.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300">
                            <Phone className="w-3.5 h-3.5 text-primary" /> {b.phone}
                          </div>
                        )}
                        {b.email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-zinc-300">
                            <Mail className="w-3.5 h-3.5 text-primary" /> {b.email}
                          </div>
                        )}
                        {b.manager_name && (
                          <p className="text-[11px] text-muted-foreground pt-1">
                            Branch Manager: <span className="font-medium text-foreground">{b.manager_name}</span>
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t">
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditBranch(b)}>
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteBranch(b.id)}>
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
      </Tabs>

      {/* Add / Edit FAQ Dialog */}
      <Dialog open={faqDialogOpen} onOpenChange={setFaqDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingFaq ? "Edit FAQ" : "Add FAQ Question"}</DialogTitle>
            <DialogDescription>
              Add commonly asked questions and answers for your institution.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="faq-q">Question *</Label>
              <Input
                id="faq-q"
                value={faqQuestion}
                onChange={(e) => setFaqQuestion(e.target.value)}
                placeholder="e.g. What are the admission criteria and deadlines?"
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

      {/* Add / Edit Branch Dialog */}
      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBranch ? "Edit Branch Office" : "Add Branch Office"}</DialogTitle>
            <DialogDescription>
              Provide regional branch details to feature on the public platform.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="br-name">Branch / Office Name *</Label>
                <Input
                  id="br-name"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. EduBird North Regional Office"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="br-city">City *</Label>
                <Input
                  id="br-city"
                  value={branchCity}
                  onChange={(e) => setBranchCity(e.target.value)}
                  placeholder="e.g. New Delhi, Bengaluru"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="br-addr">Full Address *</Label>
              <Textarea
                id="br-addr"
                rows={2}
                value={branchAddress}
                onChange={(e) => setBranchAddress(e.target.value)}
                placeholder="e.g. Plot 102, Knowledge Park III..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="br-phone">Contact Phone</Label>
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
                  placeholder="delhi@edubird.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="br-mgr">Branch Manager</Label>
                <Input
                  id="br-mgr"
                  value={branchManagerName}
                  onChange={(e) => setBranchManagerName(e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="br-status">Status</Label>
                <select
                  id="br-status"
                  value={branchStatus}
                  onChange={(e) => setBranchStatus(e.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setBranchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBranch} disabled={savingBranch}>
              {savingBranch ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {editingBranch ? "Update Branch" : "Save Branch"}
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
                  headers: { "Content-Type": "application/json", ...authHeader },
                  body: JSON.stringify({
                    id: editingPm?.id,
                    name: pmName.trim(),
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
                Configure UPI IDs, institutional bank accounts, or gateway credentials for fee collection.
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
                    placeholder="e.g. Main Campus UPI & QR Pay or Institute Bank A/C"
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
                <Label className="font-semibold">Payment Instructions for Students / Parents</Label>
                <Textarea
                  rows={2}
                  value={pmInstructions}
                  onChange={(e) => setPmInstructions(e.target.value)}
                  placeholder="e.g. After completing the payment, please share the transaction UTR number or receipt screenshot with the admission desk."
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
                  Active (Available for Fee Collection)
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
    </div>
  );
}
