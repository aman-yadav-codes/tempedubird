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

const PAGE_TABS = [
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
    } catch (err) {
      console.error("Failed to load company data:", err);
      toast.error("Failed to load company pages data.");
    } finally {
      setLoadingPages(false);
    }
  }, [authHeader, fetchHostels, fetchLibraries]);

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
      {/* Header Banner */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Company Pages Management</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage public website pages (About Us, Privacy Policy, Contact Us, Terms, Copyright, Refund, FAQs). Content updates render live on the website.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewMode(!previewMode)}
            className="flex items-center gap-1.5"
          >
            <Eye className="h-4 w-4 text-muted-foreground" />
            {previewMode ? "Edit Mode" : "Preview Mode"}
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <TabsList className="flex flex-wrap h-auto p-1.5 bg-muted/60 rounded-xl gap-1">
          {PAGE_TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.slug}
                value={tab.slug}
                className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium transition-all data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Dynamic Page Content Tabs (1 to 6) */}
        {PAGE_TABS.filter((t) => t.slug !== "faqs").map((tab) => {
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
    </div>
  );
}
