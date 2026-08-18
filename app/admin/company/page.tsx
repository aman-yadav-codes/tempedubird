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
  { slug: "contact-us", label: "Contact Us & Branches", icon: Mail },
  { slug: "hostels", label: "Hostel Facilities", icon: Building2 },
  { slug: "libraries", label: "Library Resources", icon: BookOpen },
];

export default function AdminCompanyPage() {
  const { isReady } = useAdminGuard();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, accessToken } = useAuthStore();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isInstAdmin = isInstitutionAdminUser(user);
  const canAccessCompany = isPlatformAdmin || isInstAdmin;

  const tabFromUrl = searchParams.get("tab") || "contact-us";
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

                  {/* Special Metadata for Contact Us: Multi-Branch & Location Contacts */}
                  {tab.slug === "contact-us" && (() => {
                    const currentBranches = Array.isArray(page.metadata?.branches) && page.metadata.branches.length > 0
                      ? page.metadata.branches
                      : [
                          {
                            id: "branch-1",
                            name: "Main Headquarters / Campus",
                            address: page.metadata?.address || "Orderly Bazar, Varanasi, UP, India",
                            working_hours: page.metadata?.working_hours || "Monday - Saturday: 9:00 AM - 6:00 PM IST",
                            emails: [
                              { id: "e-1", title: "Support Email", email: page.metadata?.email || "support@edubird.com" }
                            ],
                            phones: [
                              { id: "p-1", title: "General Helpline", number: page.metadata?.phone || "+91 1234567890", type: "phone" }
                            ]
                          }
                        ];

                    const updateBranches = (newBranches: any[]) => {
                      handleMetaChange("contact-us", "branches", newBranches);
                      if (newBranches.length > 0) {
                        const first = newBranches[0];
                        if (first.address) handleMetaChange("contact-us", "address", first.address);
                        if (first.working_hours) handleMetaChange("contact-us", "working_hours", first.working_hours);
                        if (first.emails?.[0]?.email) handleMetaChange("contact-us", "email", first.emails[0].email);
                        if (first.phones?.[0]?.number) handleMetaChange("contact-us", "phone", first.phones[0].number);
                      }
                    };

                    const handleAddBranch = () => {
                      const newBranch = {
                        id: `branch-${Date.now()}`,
                        name: `Branch Office ${currentBranches.length + 1}`,
                        address: "",
                        working_hours: "Monday - Saturday: 9:00 AM - 6:00 PM IST",
                        emails: [{ id: `e-${Date.now()}`, title: "Branch Email", email: "" }],
                        phones: [{ id: `p-${Date.now()}`, title: "Branch Phone", number: "", type: "phone" }],
                      };
                      updateBranches([...currentBranches, newBranch]);
                    };

                    const handleRemoveBranch = (bIndex: number) => {
                      const updated = currentBranches.filter((_: any, idx: number) => idx !== bIndex);
                      updateBranches(updated);
                    };

                    const handleUpdateBranchField = (bIndex: number, field: string, value: string) => {
                      const updated = currentBranches.map((b: any, idx: number) => {
                        if (idx !== bIndex) return b;
                        return { ...b, [field]: value };
                      });
                      updateBranches(updated);
                    };

                    const handleAddEmail = (bIndex: number) => {
                      const updated = currentBranches.map((b: any, idx: number) => {
                        if (idx !== bIndex) return b;
                        const emails = [...(b.emails || []), { id: `e-${Date.now()}`, title: "Email Title", email: "" }];
                        return { ...b, emails };
                      });
                      updateBranches(updated);
                    };

                    const handleUpdateEmail = (bIndex: number, eIndex: number, field: "title" | "email", value: string) => {
                      const updated = currentBranches.map((b: any, idx: number) => {
                        if (idx !== bIndex) return b;
                        const emails = (b.emails || []).map((e: any, eIdx: number) => {
                          if (eIdx !== eIndex) return e;
                          return { ...e, [field]: value };
                        });
                        return { ...b, emails };
                      });
                      updateBranches(updated);
                    };

                    const handleRemoveEmail = (bIndex: number, eIndex: number) => {
                      const updated = currentBranches.map((b: any, idx: number) => {
                        if (idx !== bIndex) return b;
                        const emails = (b.emails || []).filter((_: any, eIdx: number) => eIdx !== eIndex);
                        return { ...b, emails };
                      });
                      updateBranches(updated);
                    };

                    const handleAddPhone = (bIndex: number) => {
                      const updated = currentBranches.map((b: any, idx: number) => {
                        if (idx !== bIndex) return b;
                        const phones = [...(b.phones || []), { id: `p-${Date.now()}`, title: "Helpline", number: "", type: "phone" }];
                        return { ...b, phones };
                      });
                      updateBranches(updated);
                    };

                    const handleUpdatePhone = (bIndex: number, pIndex: number, field: "title" | "number" | "type", value: string) => {
                      const updated = currentBranches.map((b: any, idx: number) => {
                        if (idx !== bIndex) return b;
                        const phones = (b.phones || []).map((p: any, pIdx: number) => {
                          if (pIdx !== pIndex) return p;
                          return { ...p, [field]: value };
                        });
                        return { ...b, phones };
                      });
                      updateBranches(updated);
                    };

                    const handleRemovePhone = (bIndex: number, pIndex: number) => {
                      const updated = currentBranches.map((b: any, idx: number) => {
                        if (idx !== bIndex) return b;
                        const phones = (b.phones || []).filter((_: any, pIdx: number) => pIdx !== pIndex);
                        return { ...b, phones };
                      });
                      updateBranches(updated);
                    };

                    return (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-5 space-y-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 pb-3">
                          <div>
                            <h4 className="font-bold text-base text-primary flex items-center gap-2">
                              <Building2 className="h-5 w-5" /> Branch Offices & Location Contacts
                            </h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Add multiple branches with location address, titled emails, and choose between Phone or WhatsApp contact numbers.
                            </p>
                          </div>
                          <Button
                            type="button"
                            onClick={handleAddBranch}
                            variant="default"
                            size="sm"
                            className="font-bold text-xs gap-1.5 shadow-xs"
                          >
                            <Plus className="h-4 w-4" /> Add Branch Office
                          </Button>
                        </div>

                        {/* Branch Cards Loop */}
                        <div className="space-y-6">
                          {currentBranches.map((branch: any, bIdx: number) => (
                            <Card key={branch.id || bIdx} className="p-5 bg-card border-border shadow-xs space-y-5">
                              <div className="flex items-center justify-between gap-2 border-b border-border pb-3">
                                <div className="flex items-center gap-2 flex-1 max-w-md">
                                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                                  <Input
                                    value={branch.name || ""}
                                    onChange={(e) => handleUpdateBranchField(bIdx, "name", e.target.value)}
                                    placeholder="Branch Name (e.g. Headquarters / Delhi Branch)"
                                    className="font-bold text-sm bg-background"
                                  />
                                </div>
                                {currentBranches.length > 1 && (
                                  <Button
                                    type="button"
                                    onClick={() => handleRemoveBranch(bIdx)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:bg-destructive/10 text-xs gap-1"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Remove Branch
                                  </Button>
                                )}
                              </div>

                              {/* Address & Hours */}
                              <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-primary" />
                                    Location Address
                                  </Label>
                                  <Textarea
                                    rows={2}
                                    value={branch.address || ""}
                                    onChange={(e) => handleUpdateBranchField(bIdx, "address", e.target.value)}
                                    placeholder="Full office location address (e.g. Orderly Bazar, Varanasi, UP)"
                                    className="text-xs bg-background resize-none"
                                  />
                                </div>
                                <div className="space-y-1.5">
                                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                                    <Clock className="h-3.5 w-3.5 text-primary" />
                                    Working Hours
                                  </Label>
                                  <Input
                                    value={branch.working_hours || ""}
                                    onChange={(e) => handleUpdateBranchField(bIdx, "working_hours", e.target.value)}
                                    placeholder="Mon - Sat: 9:00 AM - 6:00 PM IST"
                                    className="text-xs bg-background"
                                  />
                                </div>
                              </div>

                              {/* Emails Section */}
                              <div className="space-y-3 pt-2 border-t border-border/60">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                    <Mail className="h-3.5 w-3.5 text-primary" />
                                    Email Desks ({branch.emails?.length || 0})
                                  </Label>
                                  <Button
                                    type="button"
                                    onClick={() => handleAddEmail(bIdx)}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs font-semibold gap-1"
                                  >
                                    <Plus className="h-3 w-3" /> Add Email Desk
                                  </Button>
                                </div>

                                {(branch.emails || []).map((emailItem: any, eIdx: number) => (
                                  <div key={emailItem.id || eIdx} className="flex items-center gap-2">
                                    <Input
                                      value={emailItem.title || ""}
                                      onChange={(e) => handleUpdateEmail(bIdx, eIdx, "title", e.target.value)}
                                      placeholder="Title (e.g. Support / Admissions)"
                                      className="text-xs bg-background w-1/3"
                                    />
                                    <Input
                                      value={emailItem.email || ""}
                                      onChange={(e) => handleUpdateEmail(bIdx, eIdx, "email", e.target.value)}
                                      placeholder="support@edubird.com"
                                      className="text-xs bg-background flex-1"
                                    />
                                    <Button
                                      type="button"
                                      onClick={() => handleRemoveEmail(bIdx, eIdx)}
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ))}
                              </div>

                              {/* Phone & WhatsApp Contacts Section */}
                              <div className="space-y-3 pt-2 border-t border-border/60">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-1.5">
                                    <Phone className="h-3.5 w-3.5 text-primary" />
                                    Phone & WhatsApp Numbers ({branch.phones?.length || 0})
                                  </Label>
                                  <Button
                                    type="button"
                                    onClick={() => handleAddPhone(bIdx)}
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs font-semibold gap-1"
                                  >
                                    <Plus className="h-3 w-3" /> Add Contact Number
                                  </Button>
                                </div>

                                {(branch.phones || []).map((phoneItem: any, pIdx: number) => (
                                  <div key={phoneItem.id || pIdx} className="flex items-center gap-2">
                                    <select
                                      value={phoneItem.type || "phone"}
                                      onChange={(e) => handleUpdatePhone(bIdx, pIdx, "type", e.target.value as any)}
                                      className="h-9 rounded-md border border-input bg-background px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring shrink-0"
                                    >
                                      <option value="phone">📞 Phone Call</option>
                                      <option value="whatsapp">💬 WhatsApp</option>
                                    </select>
                                    <Input
                                      value={phoneItem.title || ""}
                                      onChange={(e) => handleUpdatePhone(bIdx, pIdx, "title", e.target.value)}
                                      placeholder="Title (e.g. Admission Desk)"
                                      className="text-xs bg-background w-1/3"
                                    />
                                    <Input
                                      value={phoneItem.number || ""}
                                      onChange={(e) => handleUpdatePhone(bIdx, pIdx, "number", e.target.value)}
                                      placeholder="+91 9876543210"
                                      className="text-xs bg-background flex-1"
                                    />
                                    <Button
                                      type="button"
                                      onClick={() => handleRemovePhone(bIdx, pIdx)}
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

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

        {/* Hostels Tab */}
        <TabsContent value="hostels" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b bg-card px-6 py-4">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Institution Hostel Facilities
                </CardTitle>
                <CardDescription>
                  Manage campus residences, room capacity, fee structures, and amenities for students.
                </CardDescription>
              </div>
              <Button onClick={handleOpenAddHostel} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Add Hostel Building
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {loadingHostels ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading hostels...
                </div>
              ) : hostels.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
                  <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="font-medium text-base">No Hostels added yet.</p>
                  <p className="text-sm text-muted-foreground mb-4">Click "Add Hostel Building" to publish campus accommodation on your profile.</p>
                  <Button onClick={handleOpenAddHostel} size="sm">
                    <Plus className="mr-1.5 h-4 w-4" /> Add Hostel Building
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {hostels.map((h) => (
                    <div
                      key={h.id}
                      className="flex flex-col justify-between gap-4 p-5 rounded-xl border bg-card hover:border-primary/50 transition-all shadow-xs"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-lg text-foreground">{h.name}</h4>
                          <Badge variant="outline" className="bg-primary/10 text-primary font-semibold">
                            {h.type} Hostel
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">{h.description || "Modern student residence facility."}</p>

                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                          <div><span className="font-semibold text-foreground">Capacity:</span> {h.capacity} Beds</div>
                          <div><span className="font-semibold text-foreground">Available:</span> {h.available_beds} Beds</div>
                          <div><span className="font-semibold text-foreground">Annual Fee:</span> ₹{Number(h.annual_fee).toLocaleString("en-IN")}</div>
                          <div><span className="font-semibold text-foreground">Room Types:</span> {h.room_types}</div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          {h.ac_available && <Badge variant="secondary" className="text-[11px] bg-blue-500/10 text-blue-600">AC Available</Badge>}
                          {h.wifi_available && <Badge variant="secondary" className="text-[11px] bg-emerald-500/10 text-emerald-600">High-Speed Wi-Fi</Badge>}
                          {h.mess_facility && <Badge variant="secondary" className="text-[11px]">{h.mess_facility}</Badge>}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t mt-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditHostel(h)}>
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteHostel(h.id)}>
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

        {/* Libraries Tab */}
        <TabsContent value="libraries" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between border-b bg-card px-6 py-4">
              <div>
                <CardTitle className="text-xl flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Institution Library Resources
                </CardTitle>
                <CardDescription>
                  Manage physical books, digital e-journals, reading capacity, and librarian contacts.
                </CardDescription>
              </div>
              <Button onClick={handleOpenAddLibrary} className="flex items-center gap-1.5">
                <Plus className="h-4 w-4" /> Add Library Resource
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-4">
              {loadingLibraries ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mr-2" /> Loading library resources...
                </div>
              ) : libraries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/20">
                  <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50 mb-3" />
                  <p className="font-medium text-base">No Libraries added yet.</p>
                  <p className="text-sm text-muted-foreground mb-4">Click "Add Library Resource" to showcase library facilities on your profile.</p>
                  <Button onClick={handleOpenAddLibrary} size="sm">
                    <Plus className="mr-1.5 h-4 w-4" /> Add Library Resource
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {libraries.map((lib) => (
                    <div
                      key={lib.id}
                      className="flex flex-col justify-between gap-4 p-5 rounded-xl border bg-card hover:border-primary/50 transition-all shadow-xs"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-bold text-lg text-foreground">{lib.name}</h4>
                          <Badge variant="outline" className="bg-primary/10 text-primary font-semibold">
                            Library Resource
                          </Badge>
                        </div>

                        <p className="text-sm text-muted-foreground line-clamp-2">{lib.description || "Central academic library resource."}</p>

                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                          <div><span className="font-semibold text-foreground">Total Books:</span> {Number(lib.total_books).toLocaleString("en-IN")}</div>
                          <div><span className="font-semibold text-foreground">Digital Titles:</span> {Number(lib.digital_titles).toLocaleString("en-IN")}</div>
                          <div><span className="font-semibold text-foreground">Subscribed Journals:</span> {lib.journals_subscribed}</div>
                          <div><span className="font-semibold text-foreground">Seating Capacity:</span> {lib.seating_capacity} Seats</div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                          <span className="text-muted-foreground">Hours: <strong className="text-foreground">{lib.opening_hours}</strong></span>
                          {lib.reading_hall_available && <Badge variant="secondary" className="text-[11px] bg-purple-500/10 text-purple-600">Reading Hall Available</Badge>}
                          {lib.e_resources_access && <Badge variant="secondary" className="text-[11px] bg-blue-500/10 text-blue-600">24/7 E-Resource Portal</Badge>}
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-2 border-t mt-2">
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditLibrary(lib)}>
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteLibrary(lib.id)}>
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

      {/* Add / Edit Hostel Dialog */}
      <Dialog open={hostelDialogOpen} onOpenChange={setHostelDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingHostel ? "Edit Hostel Facility" : "Add Hostel Facility"}</DialogTitle>
            <DialogDescription>
              Provide hostel accommodation details, room sharing options, annual fees, and amenities.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <Label htmlFor="hostel-name">Hostel Building / Residence Name</Label>
              <Input
                id="hostel-name"
                value={hostelName}
                onChange={(e) => setHostelName(e.target.value)}
                placeholder="e.g. Executive Boys Hostel - Block A"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hostel-type">Hostel Type</Label>
                <select
                  id="hostel-type"
                  value={hostelType}
                  onChange={(e) => setHostelType(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="Boys">Boys Hostel</option>
                  <option value="Girls">Girls Hostel</option>
                  <option value="Co-ed">Co-ed Residence</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hostel-annual-fee">Annual Fee (₹)</Label>
                <Input
                  id="hostel-annual-fee"
                  type="number"
                  value={hostelAnnualFee}
                  onChange={(e) => setHostelAnnualFee(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="hostel-capacity">Total Capacity (Beds)</Label>
                <Input
                  id="hostel-capacity"
                  type="number"
                  value={hostelCapacity}
                  onChange={(e) => setHostelCapacity(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hostel-available-beds">Available Vacant Beds</Label>
                <Input
                  id="hostel-available-beds"
                  type="number"
                  value={hostelAvailableBeds}
                  onChange={(e) => setHostelAvailableBeds(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hostel-room-types">Room Sharing Options</Label>
              <Input
                id="hostel-room-types"
                value={hostelRoomTypes}
                onChange={(e) => setHostelRoomTypes(e.target.value)}
                placeholder="e.g. Single Occupancy, Double & Triple Sharing"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hostel-mess">Mess & Dining Facility</Label>
              <Input
                id="hostel-mess"
                value={hostelMessFacility}
                onChange={(e) => setHostelMessFacility(e.target.value)}
                placeholder="e.g. Four Meals Daily (Veg & Non-Veg options)"
              />
            </div>

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={hostelAcAvailable}
                  onChange={(e) => setHostelAcAvailable(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
                Air Conditioned (AC)
              </label>

              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={hostelWifiAvailable}
                  onChange={(e) => setHostelWifiAvailable(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
                Campus Wi-Fi Included
              </label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="hostel-desc">Description & Facilities</Label>
              <Textarea
                id="hostel-desc"
                rows={3}
                value={hostelDescription}
                onChange={(e) => setHostelDescription(e.target.value)}
                placeholder="Describe room furnishings, security, study halls..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="hostel-rules">Hostel Rules & Timings</Label>
              <Textarea
                id="hostel-rules"
                rows={2}
                value={hostelRules}
                onChange={(e) => setHostelRules(e.target.value)}
                placeholder="e.g. Visitor hours 4PM-7PM, Gate curfew 9:30 PM..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHostelDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveHostel} disabled={savingHostel}>
              {savingHostel ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {editingHostel ? "Update Hostel" : "Save Hostel"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Library Dialog */}
      <Dialog open={libraryDialogOpen} onOpenChange={setLibraryDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingLibrary ? "Edit Library Resource" : "Add Library Resource"}</DialogTitle>
            <DialogDescription>
              Provide information about physical book collections, digital titles, research journals, and reading hall.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[70vh] overflow-y-auto px-1">
            <div className="space-y-2">
              <Label htmlFor="lib-name">Library Name</Label>
              <Input
                id="lib-name"
                value={libraryName}
                onChange={(e) => setLibraryName(e.target.value)}
                placeholder="e.g. Central Knowledge & Research Library"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lib-books">Total Physical Books</Label>
                <Input
                  id="lib-books"
                  type="number"
                  value={libraryTotalBooks}
                  onChange={(e) => setLibraryTotalBooks(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lib-digital">Digital Titles / E-Books</Label>
                <Input
                  id="lib-digital"
                  type="number"
                  value={libraryDigitalTitles}
                  onChange={(e) => setLibraryDigitalTitles(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lib-journals">Subscribed Research Journals</Label>
                <Input
                  id="lib-journals"
                  type="number"
                  value={libraryJournalsSubscribed}
                  onChange={(e) => setLibraryJournalsSubscribed(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lib-seating">Seating Capacity (Seats)</Label>
                <Input
                  id="lib-seating"
                  type="number"
                  value={librarySeatingCapacity}
                  onChange={(e) => setLibrarySeatingCapacity(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lib-hours">Library Opening Hours</Label>
              <Input
                id="lib-hours"
                value={libraryOpeningHours}
                onChange={(e) => setLibraryOpeningHours(e.target.value)}
                placeholder="e.g. 8:00 AM - 10:00 PM (Monday - Saturday)"
              />
            </div>

            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={libraryReadingHall}
                  onChange={(e) => setLibraryReadingHall(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
                Quiet Reading Hall Available
              </label>

              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={libraryEResources}
                  onChange={(e) => setLibraryEResources(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-primary"
                />
                24/7 E-Resource Portal Access
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lib-contact-name">Head Librarian Name</Label>
                <Input
                  id="lib-contact-name"
                  value={libraryLibrarianName}
                  onChange={(e) => setLibraryLibrarianName(e.target.value)}
                  placeholder="e.g. Dr. Chief Librarian"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lib-contact-email">Librarian Email</Label>
                <Input
                  id="lib-contact-email"
                  value={libraryLibrarianEmail}
                  onChange={(e) => setLibraryLibrarianEmail(e.target.value)}
                  placeholder="library@institution.edu"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lib-desc">Library Overview & Description</Label>
              <Textarea
                id="lib-desc"
                rows={3}
                value={libraryDescription}
                onChange={(e) => setLibraryDescription(e.target.value)}
                placeholder="Describe reading atmosphere, computer terminals, RFID system..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lib-rules">Borrowing Rules & Policy</Label>
              <Textarea
                id="lib-rules"
                rows={2}
                value={libraryBorrowingRules}
                onChange={(e) => setLibraryBorrowingRules(e.target.value)}
                placeholder="e.g. Students can issue up to 4 books for 14 days."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setLibraryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLibrary} disabled={savingLibrary}>
              {savingLibrary ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
              {editingLibrary ? "Update Library" : "Save Library"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
