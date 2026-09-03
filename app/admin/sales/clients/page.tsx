"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Building2,
  Plus,
  Search,
  Filter,
  UsersRound,
  Phone,
  Mail,
  Globe,
  MapPin,
  Star,
  Edit2,
  Trash2,
  RefreshCw,
  Loader2,
  ExternalLink,
  Briefcase,
  Store,
  Sparkles,
  LayoutGrid,
  Table as TableIcon,
  CheckCircle2,
  XCircle,
  Building,
  GraduationCap,
  HeartHandshake,
  Upload,
  Download,
  FileSpreadsheet,
  Check,
  ChevronRight,
  ChevronLeft,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProgressiveSave } from "@/hooks/use-progressive-save";
import { ProgressiveSaveIndicator } from "@/components/shared/progressive-save-indicator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import {
  GoogleLocationPicker,
  type PickedLocation,
} from "@/components/shared/google-location-picker";
import { BulkUploadClientsDialog } from "./_components/bulk-upload-dialog";

export type PhoneEntry = {
  id: string;
  number: string;
  label: string;
  is_primary: boolean;
};

export type EmailEntry = {
  id: string;
  email: string;
  label: string;
  is_primary: boolean;
};

export type ContactPersonEntry = {
  id: string;
  name: string;
  designation: string;
  phone: string;
  email: string;
};

export type VendorClientItem = {
  id: number;
  name: string;
  company_name: string | null;
  contact_person: string | null;
  category: string;
  vendor_type: string; // 'client' | 'corporate' | 'sponsor' | 'partner' | 'vendor' | 'individual'
  client_type?: string;
  email: string | null;
  phone: string | null;
  phones?: PhoneEntry[];
  emails?: EmailEntry[];
  contacts?: ContactPersonEntry[];
  website: string | null;
  profile_image?: string | null;
  address: string | null;
  city: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  location: string | null;
  area?: string | null;
  location_data?: any;
  rating: number;
  description: string | null;
  notes: string | null;
  status: "active" | "inactive";
  institution_id: number | null;
  created_at: string;
  updated_at?: string;
};

const ENTITY_TYPES = [
  { id: "client", label: "Corporate Client", badgeColor: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-300" },
  { id: "sponsor", label: "Sponsor / Donor", badgeColor: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-300" },
  { id: "partner", label: "Educational Partner", badgeColor: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-300" },
  { id: "recruiter", label: "Campus Recruiter", badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-300" },
  { id: "individual", label: "Individual Client", badgeColor: "bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-300" },
  { id: "vendor", label: "Vendor / Supplier", badgeColor: "bg-teal-500/10 text-teal-700 dark:text-teal-400 border-teal-300" },
];

const SUGGESTED_CATEGORIES = [
  "Corporate Training Client",
  "Campus Recruiter",
  "Institutional Client",
  "Student Sponsor & CSR",
  "Academic & University Partner",
  "Industry Placement Partner",
  "Government & NGO Partner",
  "Consultancy Client",
  "General Client",
];

const PHONE_LABELS = [
  "Primary Mobile",
  "Office / Landline",
  "WhatsApp",
  "Alternate",
  "Toll-Free",
  "Accounts / Finance",
];

const EMAIL_LABELS = [
  "Work / Official",
  "Billing / Accounts",
  "Support / Helpdesk",
  "HR / Recruitment",
  "Personal",
];

export default function SalesClientsPage() {
  const { accessToken } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();

  const [records, setRecords] = useState<VendorClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Filter tabs
  const [activeTab, setActiveTab] = useState<"all" | "client" | "sponsor" | "partner">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<"company" | "contacts" | "location">("company");
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VendorClientItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form Fields - Tab 1: Company Details
  const [formName, setFormName] = useState("");
  const [formCompanyName, setFormCompanyName] = useState("");
  const [formContactPerson, setFormContactPerson] = useState("");
  const [formCategory, setFormCategory] = useState("Corporate Training Client");
  const [formType, setFormType] = useState("client");
  const [formWebsite, setFormWebsite] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "inactive">("active");

  // Form Fields - Tab 2: Multiple Contacts (Phones & Emails)
  const [formPhones, setFormPhones] = useState<PhoneEntry[]>([
    { id: "1", number: "", label: "Primary Mobile", is_primary: true },
  ]);
  const [formEmails, setFormEmails] = useState<EmailEntry[]>([
    { id: "1", email: "", label: "Work / Official", is_primary: true },
  ]);
  const [formAdditionalContacts, setFormAdditionalContacts] = useState<ContactPersonEntry[]>([]);

  // Form Fields - Tab 3: Location & Address
  const [formAddress, setFormAddress] = useState("");
  const [formCity, setFormCity] = useState("");
  const [formState, setFormState] = useState("");
  const [formArea, setFormArea] = useState("");
  const [formPincode, setFormPincode] = useState("");
  const [formCountry, setFormCountry] = useState("India");
  const [formLocationPicked, setFormLocationPicked] = useState<PickedLocation | null>(null);

  const clientFormState = useMemo(() => ({
    formName,
    formCompanyName,
    formWebsite,
    formDescription,
    formPhones,
    formEmails,
    formAddress,
    formCity,
    formState,
    formPincode,
  }), [formName, formCompanyName, formWebsite, formDescription, formPhones, formEmails, formAddress, formCity, formState, formPincode]);

  const { saveStatus: clientSaveStatus, clearDraft: clearClientDraft } = useProgressiveSave({
    formKey: `sales_client:${editingItem?.id || "new"}`,
    formState: clientFormState,
    enabled: dialogOpen,
    onRestore: (draft) => {
      if (draft.formName) setFormName(draft.formName);
      if (draft.formCompanyName) setFormCompanyName(draft.formCompanyName);
      if (draft.formWebsite) setFormWebsite(draft.formWebsite);
      if (draft.formDescription) setFormDescription(draft.formDescription);
      if (Array.isArray(draft.formPhones)) setFormPhones(draft.formPhones);
      if (Array.isArray(draft.formEmails)) setFormEmails(draft.formEmails);
      if (draft.formAddress) setFormAddress(draft.formAddress);
      if (draft.formCity) setFormCity(draft.formCity);
      if (draft.formState) setFormState(draft.formState);
      if (draft.formPincode) setFormPincode(draft.formPincode);
    },
  });

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeInstitution?.id) params.set("institution_id", String(activeInstitution.id));
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
      if (typeFilter && typeFilter !== "all") params.set("type", typeFilter);

      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/sales/clients?${params.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load client records");

      setRecords(data.clients || data.records || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch client records");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, statusFilter, categoryFilter, typeFilter, accessToken, activeInstitution]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleAddPhone = () => {
    setFormPhones((prev) => [
      ...prev,
      { id: String(Date.now()), number: "", label: "Alternate", is_primary: prev.length === 0 },
    ]);
  };

  const handleRemovePhone = (index: number) => {
    setFormPhones((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== index);
      if (!next.some((p) => p.is_primary)) {
        next[0].is_primary = true;
      }
      return next;
    });
  };

  const handleSetPrimaryPhone = (index: number) => {
    setFormPhones((prev) =>
      prev.map((p, i) => ({ ...p, is_primary: i === index }))
    );
  };

  const handleUpdatePhone = (index: number, patch: Partial<PhoneEntry>) => {
    setFormPhones((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...patch } : p))
    );
  };

  const handleAddEmail = () => {
    setFormEmails((prev) => [
      ...prev,
      { id: String(Date.now()), email: "", label: "Billing / Accounts", is_primary: prev.length === 0 },
    ]);
  };

  const handleRemoveEmail = (index: number) => {
    setFormEmails((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((_, i) => i !== index);
      if (!next.some((e) => e.is_primary)) {
        next[0].is_primary = true;
      }
      return next;
    });
  };

  const handleSetPrimaryEmail = (index: number) => {
    setFormEmails((prev) =>
      prev.map((e, i) => ({ ...e, is_primary: i === index }))
    );
  };

  const handleUpdateEmail = (index: number, patch: Partial<EmailEntry>) => {
    setFormEmails((prev) =>
      prev.map((e, i) => (i === index ? { ...e, ...patch } : e))
    );
  };

  const handleAddContactPerson = () => {
    setFormAdditionalContacts((prev) => [
      ...prev,
      { id: String(Date.now()), name: "", designation: "", phone: "", email: "" },
    ]);
  };

  const handleRemoveContactPerson = (index: number) => {
    setFormAdditionalContacts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateContactPerson = (index: number, patch: Partial<ContactPersonEntry>) => {
    setFormAdditionalContacts((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setDialogTab("company");
    setFormName("");
    setFormCompanyName("");
    setFormContactPerson("");
    setFormCategory("Corporate Client");
    setFormType("corporate");
    setFormWebsite("");
    setFormDescription("");
    setFormNotes("");
    setFormStatus("active");

    // Multiple Phones
    setFormPhones([{ id: "1", number: "", label: "Primary Mobile", is_primary: true }]);
    // Multiple Emails
    setFormEmails([{ id: "1", email: "", label: "Work / Official", is_primary: true }]);
    // Additional Contacts
    setFormAdditionalContacts([]);

    // Location
    setFormAddress("");
    setFormCity("");
    setFormState("");
    setFormArea("");
    setFormPincode("");
    setFormCountry("India");
    setFormLocationPicked(null);

    setDialogOpen(true);
  };

  const handleOpenEdit = (item: VendorClientItem) => {
    setEditingItem(item);
    setDialogTab("company");
    setFormName(item.name || "");
    setFormCompanyName(item.company_name || item.name || "");
    setFormContactPerson(item.contact_person || item.name || "");
    setFormCategory(item.category || "Corporate Client");
    setFormType(item.vendor_type || item.client_type || "corporate");
    setFormWebsite(item.website || "");
    setFormDescription(item.description || "");
    setFormNotes(item.notes || "");
    setFormStatus(item.status || "active");

    // Phones
    if (Array.isArray(item.phones) && item.phones.length > 0) {
      setFormPhones(
        item.phones.map((p, i) => ({
          id: p.id || String(i + 1),
          number: p.number || "",
          label: p.label || (i === 0 ? "Primary Mobile" : "Alternate"),
          is_primary: p.is_primary ?? (i === 0),
        }))
      );
    } else if (item.phone) {
      setFormPhones([{ id: "1", number: item.phone, label: "Primary Mobile", is_primary: true }]);
    } else {
      setFormPhones([{ id: "1", number: "", label: "Primary Mobile", is_primary: true }]);
    }

    // Emails
    if (Array.isArray(item.emails) && item.emails.length > 0) {
      setFormEmails(
        item.emails.map((e, i) => ({
          id: e.id || String(i + 1),
          email: e.email || "",
          label: e.label || (i === 0 ? "Work / Official" : "Billing / Accounts"),
          is_primary: e.is_primary ?? (i === 0),
        }))
      );
    } else if (item.email) {
      setFormEmails([{ id: "1", email: item.email, label: "Work / Official", is_primary: true }]);
    } else {
      setFormEmails([{ id: "1", email: "", label: "Work / Official", is_primary: true }]);
    }

    // Additional Contacts
    if (Array.isArray(item.contacts)) {
      setFormAdditionalContacts(
        item.contacts.map((c, i) => ({
          id: c.id || String(i + 1),
          name: c.name || "",
          designation: c.designation || "",
          phone: c.phone || "",
          email: c.email || "",
        }))
      );
    } else {
      setFormAdditionalContacts([]);
    }

    // Location
    setFormAddress(item.address || "");
    setFormCity(item.city || "");
    setFormState(item.state || "");
    setFormArea(item.area || item.location || "");
    setFormPincode(item.pincode || "");
    setFormCountry(item.country || "India");
    if (item.location_data && typeof item.location_data === "object") {
      setFormLocationPicked(item.location_data);
    } else {
      setFormLocationPicked(null);
    }

    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const company = formCompanyName.trim();
    const contact = formName.trim();
    if (!company && !contact) {
      toast.error("Please enter a business name or contact person name");
      setDialogTab("company");
      return;
    }

    const validPhones = formPhones.filter((p) => p.number.trim().length > 0);
    const validEmails = formEmails.filter((e) => e.email.trim().length > 0);
    const primaryPhone = validPhones.find((p) => p.is_primary)?.number || validPhones[0]?.number || "";
    const primaryEmail = validEmails.find((e) => e.is_primary)?.email || validEmails[0]?.email || "";

    setSaving(true);
    try {
      const payload = {
        id: editingItem?.id,
        name: contact || company,
        company_name: company || contact,
        contact_person: contact || company,
        category: formCategory || "Corporate Client",
        vendor_type: formType || "corporate",
        client_type: formType || "corporate",
        phone: primaryPhone || null,
        email: primaryEmail || null,
        phones: validPhones,
        emails: validEmails,
        contacts: formAdditionalContacts.filter((c) => c.name.trim().length > 0),
        website: formWebsite.trim() || null,
        address: formAddress.trim() || null,
        city: formCity.trim() || null,
        state: formState.trim() || null,
        area: formArea.trim() || null,
        location: formArea.trim() || null,
        pincode: formPincode.trim() || null,
        country: formCountry.trim() || "India",
        location_data: formLocationPicked || null,
        rating: editingItem?.rating ? Number(editingItem.rating) : 4.8,
        description: formDescription.trim() || null,
        notes: formNotes.trim() || null,
        status: formStatus || "active",
        institution_id: activeInstitution?.id || null,
      };

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const method = editingItem ? "PUT" : "POST";
      const res = await fetch("/api/admin/sales/clients", {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save record");

      toast.success(editingItem ? "Client updated successfully in database" : "Client added successfully to database");
      setDialogOpen(false);
      clearClientDraft();
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || "Failed to save record");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/sales/clients?id=${id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete record");

      toast.success("Client deleted successfully from database");
      setDeleteConfirmId(null);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete record");
    }
  };

  // Filtered dataset based on tab
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (activeTab === "client") return r.vendor_type === "client" || r.vendor_type === "corporate";
      if (activeTab === "sponsor") return r.vendor_type === "sponsor";
      if (activeTab === "partner") return r.vendor_type === "partner" || r.vendor_type === "recruiter";
      return true;
    });
  }, [records, activeTab]);

  // Statistics
  const stats = useMemo(() => {
    const total = records.length;
    const activeClients = records.filter((r) => r.status === "active").length;
    const corporateCount = records.filter((r) => r.vendor_type === "client" || r.vendor_type === "corporate" || r.vendor_type === "sponsor").length;
    const categoriesCount = new Set(records.map((r) => r.category).filter(Boolean)).size;
    return { total, activeClients, corporateCount, categoriesCount };
  }, [records]);

  // Category options for filter
  const distinctCategories = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.category) set.add(r.category);
    });
    return Array.from(set);
  }, [records]);

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
              <Building2 className="w-7 h-7 text-primary" />
              Clients & Corporate Partners
            </h1>
            {activeInstitution && (
              <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 font-medium">
                {activeInstitution.name}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your corporate partners, student sponsors, campus recruiters, and institutional clients.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRecords}
            disabled={loading}
            className="rounded-xl h-10 px-3.5"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin text-primary" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setBulkDialogOpen(true)}
            className="rounded-xl h-10 px-3.5 gap-2 border-primary/20 hover:bg-primary/5 text-primary font-semibold"
          >
            <Upload className="w-4 h-4" />
            Bulk Upload
          </Button>
          <Button
            onClick={handleOpenAdd}
            className="rounded-xl h-10 px-4 shadow-sm font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Add Client
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border bg-card shadow-sm p-4 hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Clients</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{stats.total}</h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <UsersRound className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm p-4 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Clients</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.activeClients}</h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm p-4 hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Corporate Accounts</p>
              <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.corporateCount}</h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Briefcase className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm p-4 hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Client Categories</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.categoriesCount}</h3>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Tabs & Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border-b pb-4">
        {/* Quick Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/50 flex-wrap">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Clients ({records.length})
          </button>
          <button
            onClick={() => setActiveTab("client")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "client"
                ? "bg-background text-blue-600 dark:text-blue-400 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" />
            Corporate Clients ({records.filter((r) => r.vendor_type === "client" || r.vendor_type === "corporate").length})
          </button>
          <button
            onClick={() => setActiveTab("sponsor")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "sponsor"
                ? "bg-background text-amber-600 dark:text-amber-400 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <HeartHandshake className="w-3.5 h-3.5" />
            Sponsors & Donors ({records.filter((r) => r.vendor_type === "sponsor").length})
          </button>
          <button
            onClick={() => setActiveTab("partner")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${
              activeTab === "partner"
                ? "bg-background text-purple-600 dark:text-purple-400 shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            Educational Partners ({records.filter((r) => r.vendor_type === "partner" || r.vendor_type === "recruiter").length})
          </button>
        </div>

        {/* View Switcher */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50 self-end md:self-auto shrink-0">
          <Button
            variant={viewMode === "cards" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className="h-8 px-2.5 rounded-lg text-xs"
          >
            <LayoutGrid className="w-3.5 h-3.5 mr-1" />
            Cards
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="h-8 px-2.5 rounded-lg text-xs"
          >
            <TableIcon className="w-3.5 h-3.5 mr-1" />
            Table
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by name, company, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl text-xs bg-background"
          />
        </div>

        {/* Entity Type Filter */}
        <div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-10 text-xs bg-background rounded-xl">
              <SelectValue placeholder="All Client Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Client Types</SelectItem>
              {ENTITY_TYPES.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs">
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Category Filter */}
        <div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-10 text-xs bg-background rounded-xl">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Categories</SelectItem>
              {distinctCategories.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Status Filter */}
        <div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 text-xs bg-background rounded-xl">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Loading client records...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center border rounded-2xl bg-card border-dashed p-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
            <Building2 className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No client records found</h3>
          <p className="text-sm text-muted-foreground mt-1 max-w-md">
            {searchQuery || typeFilter !== "all" || categoryFilter !== "all"
              ? "No client records match your selected filters. Try clearing your search parameters."
              : "No corporate or institutional clients added yet. Click below to add your first client."}
          </p>
          <Button onClick={handleOpenAdd} className="mt-4 rounded-xl font-semibold gap-2">
            <Plus className="w-4 h-4" />
            Add First Client
          </Button>
        </div>
      ) : viewMode === "cards" ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRecords.map((item) => {
            const entityTypeObj = ENTITY_TYPES.find((t) => t.id === item.vendor_type) || ENTITY_TYPES[0];
            return (
              <Card
                key={item.id}
                className="rounded-2xl border bg-card hover:border-primary/40 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div>
                  <div className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-semibold uppercase tracking-wider rounded-lg px-2 py-0.5 ${entityTypeObj.badgeColor}`}
                        >
                          {entityTypeObj.label}
                        </Badge>
                        <Badge variant="secondary" className="text-[11px] font-medium rounded-lg">
                          {item.category}
                        </Badge>
                      </div>

                      <Badge
                        variant={item.status === "active" ? "default" : "destructive"}
                        className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full"
                      >
                        {item.status}
                      </Badge>
                    </div>

                    <h3 className="text-base font-bold text-foreground mt-3 line-clamp-1">
                      {item.company_name || item.name}
                    </h3>
                    {item.company_name && item.company_name !== item.name && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <UsersRound className="w-3 h-3" /> Contact: {item.name}
                      </p>
                    )}

                    {item.description && (
                      <p className="text-xs text-muted-foreground/90 mt-2 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Meta Fields */}
                    <div className="space-y-1.5 mt-4 pt-3 border-t text-xs text-muted-foreground">
                      {item.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <a href={`tel:${item.phone}`} className="hover:underline hover:text-foreground font-mono">
                              {item.phone}
                            </a>
                            {item.phones && item.phones.length > 1 && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 font-mono h-4">
                                +{item.phones.length - 1} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      {item.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <a href={`mailto:${item.email}`} className="hover:underline hover:text-foreground truncate max-w-[170px]">
                              {item.email}
                            </a>
                            {item.emails && item.emails.length > 1 && (
                              <Badge variant="secondary" className="text-[10px] px-1 py-0 font-sans h-4">
                                +{item.emails.length - 1} more
                              </Badge>
                            )}
                          </div>
                        </div>
                      )}
                      {item.website && (
                        <div className="flex items-center gap-2">
                          <Globe className="w-3.5 h-3.5 text-primary shrink-0" />
                          <a
                            href={item.website.startsWith("http") ? item.website : `https://${item.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline hover:text-foreground truncate flex items-center gap-1"
                          >
                            {item.website.replace(/^https?:\/\//, "")}
                            <ExternalLink className="w-3 h-3 inline shrink-0" />
                          </a>
                        </div>
                      )}
                      {item.address && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                          <span className="truncate">{item.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-3 bg-muted/30 border-t flex items-center justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(item)}
                    className="h-8 px-2.5 rounded-lg text-xs font-semibold hover:bg-background"
                  >
                    <Edit2 className="w-3.5 h-3.5 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmId(item.id)}
                    className="h-8 px-2.5 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="border rounded-2xl overflow-hidden bg-card shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="p-3.5 pl-5">Business / Client Name</th>
                  <th className="p-3.5">Type</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Contact Details</th>
                  <th className="p-3.5">Address</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredRecords.map((item) => {
                  const entityTypeObj = ENTITY_TYPES.find((t) => t.id === item.vendor_type) || ENTITY_TYPES[0];
                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-3.5 pl-5">
                        <div className="font-bold text-foreground text-sm">{item.company_name || item.name}</div>
                        {item.company_name && item.company_name !== item.name && (
                          <div className="text-muted-foreground text-[11px]">Contact: {item.name}</div>
                        )}
                      </td>
                      <td className="p-3.5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold uppercase ${entityTypeObj.badgeColor}`}
                        >
                          {entityTypeObj.label}
                        </Badge>
                      </td>
                      <td className="p-3.5">{item.category}</td>
                      <td className="p-3.5 space-y-0.5 font-mono">
                        {item.phone && (
                          <div className="flex items-center gap-1">
                            <span>{item.phone}</span>
                            {item.phones && item.phones.length > 1 && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                                +{item.phones.length - 1}
                              </Badge>
                            )}
                          </div>
                        )}
                        {item.email && (
                          <div className="text-muted-foreground font-sans truncate max-w-[160px] flex items-center gap-1">
                            <span className="truncate">{item.email}</span>
                            {item.emails && item.emails.length > 1 && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 h-3.5">
                                +{item.emails.length - 1}
                              </Badge>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-3.5 max-w-[200px] truncate">{item.address || "-"}</td>
                      <td className="p-3.5">
                        <Badge
                          variant={item.status === "active" ? "default" : "destructive"}
                          className="text-[10px] uppercase font-bold"
                        >
                          {item.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            className="h-7 w-7 p-0 rounded-lg hover:bg-muted"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="h-7 w-7 p-0 rounded-lg text-rose-600 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Dialog with 3 Dedicated Tabs */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" />
              {editingItem ? "Edit Client Record" : "Add New Client"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Saved clients and corporate partners are stored in your institution directory.
            </DialogDescription>
          </DialogHeader>

          {/* Navigation Tabs Bar */}
          <div className="px-6 pb-3 border-b">
            <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/50">
              <button
                type="button"
                onClick={() => setDialogTab("company")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                  dialogTab === "company"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="w-3.5 h-3.5 text-primary" />
                Company Details
              </button>
              <button
                type="button"
                onClick={() => setDialogTab("contacts")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                  dialogTab === "contacts"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Phone className="w-3.5 h-3.5 text-primary" />
                Contacts & Numbers
                {formPhones.filter((p) => p.number.trim()).length > 0 && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 ml-1">
                    {formPhones.filter((p) => p.number.trim()).length}
                  </Badge>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDialogTab("location")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-lg transition-all ${
                  dialogTab === "location"
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Location & Address
              </button>
            </div>
          </div>

          <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-180px)] space-y-4">
              {/* TAB 1: COMPANY DETAILS */}
              {dialogTab === "company" && (
                <div className="space-y-4">
                  {/* Name and Company Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Business / Company Name *</Label>
                      <Input
                        placeholder="e.g., Apex Tech Solutions Pvt Ltd"
                        value={formCompanyName}
                        onChange={(e) => {
                          setFormCompanyName(e.target.value);
                          if (!formName) setFormName(e.target.value);
                        }}
                        className="text-xs h-9"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Contact Person / Owner Name *</Label>
                      <Input
                        placeholder="e.g., Rajesh Sharma"
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                        className="text-xs h-9"
                        required
                      />
                    </div>
                  </div>

                  {/* Website */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Website / Profile Link</Label>
                    <Input
                      placeholder="https://company.com"
                      value={formWebsite}
                      onChange={(e) => setFormWebsite(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>

                  {/* Description / Notes */}
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Description / Services Provided</Label>
                    <Textarea
                      placeholder="Details of partnership, corporate terms, or student benefits..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      rows={3}
                      className="text-xs resize-none"
                    />
                  </div>

                  {/* Status Selection */}
                  <div className="space-y-1 pt-1">
                    <Label className="text-xs font-semibold">Account Status</Label>
                    <Select value={formStatus} onValueChange={(val: any) => setFormStatus(val)}>
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder="Select Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active" className="text-xs">Active (Available for sales & engagements)</SelectItem>
                        <SelectItem value="inactive" className="text-xs">Inactive (Archived)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* TAB 2: CONTACTS & NUMBERS */}
              {dialogTab === "contacts" && (
                <div className="space-y-5">
                  {/* Phone Numbers Section */}
                  <div className="rounded-xl border p-4 bg-card/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Phone Numbers</h4>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {formPhones.length}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddPhone}
                        className="text-xs h-7 gap-1 font-semibold"
                      >
                        <Plus className="w-3 h-3" />
                        Add Phone
                      </Button>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {formPhones.map((phoneItem, idx) => (
                        <div key={phoneItem.id || idx} className="flex items-center gap-2">
                          <Input
                            placeholder="+91 98765 43210"
                            value={phoneItem.number}
                            onChange={(e) => handleUpdatePhone(idx, { number: e.target.value })}
                            className="text-xs h-9 font-mono flex-1"
                          />
                          <Select
                            value={phoneItem.label}
                            onValueChange={(val) => handleUpdatePhone(idx, { label: val })}
                          >
                            <SelectTrigger className="text-xs h-9 w-36">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {PHONE_LABELS.map((lbl) => (
                                <SelectItem key={lbl} value={lbl} className="text-xs">
                                  {lbl}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <button
                            type="button"
                            onClick={() => handleSetPrimaryPhone(idx)}
                            className={`px-2 py-1.5 text-[11px] font-semibold rounded-md transition-all shrink-0 ${
                              phoneItem.is_primary
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {phoneItem.is_primary ? "Primary" : "Make Primary"}
                          </button>

                          {formPhones.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemovePhone(idx)}
                              className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-500/10 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Email Addresses Section */}
                  <div className="rounded-xl border p-4 bg-card/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-primary" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Email Addresses</h4>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {formEmails.length}
                        </Badge>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddEmail}
                        className="text-xs h-7 gap-1 font-semibold"
                      >
                        <Plus className="w-3 h-3" />
                        Add Email
                      </Button>
                    </div>

                    <div className="space-y-2.5 pt-1">
                      {formEmails.map((emailItem, idx) => (
                        <div key={emailItem.id || idx} className="flex items-center gap-2">
                          <Input
                            type="email"
                            placeholder="partner@company.com"
                            value={emailItem.email}
                            onChange={(e) => handleUpdateEmail(idx, { email: e.target.value })}
                            className="text-xs h-9 flex-1"
                          />
                          <Select
                            value={emailItem.label}
                            onValueChange={(val) => handleUpdateEmail(idx, { label: val })}
                          >
                            <SelectTrigger className="text-xs h-9 w-36">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {EMAIL_LABELS.map((lbl) => (
                                <SelectItem key={lbl} value={lbl} className="text-xs">
                                  {lbl}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          <button
                            type="button"
                            onClick={() => handleSetPrimaryEmail(idx)}
                            className={`px-2 py-1.5 text-[11px] font-semibold rounded-md transition-all shrink-0 ${
                              emailItem.is_primary
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {emailItem.is_primary ? "Primary" : "Make Primary"}
                          </button>

                          {formEmails.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveEmail(idx)}
                              className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-500/10 shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Additional Representatives (Optional) */}
                  <div className="rounded-xl border p-4 bg-card/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UsersRound className="w-4 h-4 text-primary" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Key Representatives</h4>
                        {formAdditionalContacts.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                            {formAdditionalContacts.length}
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddContactPerson}
                        className="text-xs h-7 gap-1 font-semibold"
                      >
                        <Plus className="w-3 h-3" />
                        Add Representative
                      </Button>
                    </div>

                    {formAdditionalContacts.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground italic">
                        Optional: Add secondary contacts (e.g. HR Manager, Procurement Head).
                      </p>
                    ) : (
                      <div className="space-y-2.5 pt-1">
                        {formAdditionalContacts.map((c, idx) => (
                          <div key={c.id || idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-center p-2.5 rounded-lg border bg-background">
                            <Input
                              placeholder="Full Name"
                              value={c.name}
                              onChange={(e) => handleUpdateContactPerson(idx, { name: e.target.value })}
                              className="text-xs h-8"
                            />
                            <Input
                              placeholder="Designation / Role"
                              value={c.designation}
                              onChange={(e) => handleUpdateContactPerson(idx, { designation: e.target.value })}
                              className="text-xs h-8"
                            />
                            <Input
                              placeholder="Direct Phone"
                              value={c.phone}
                              onChange={(e) => handleUpdateContactPerson(idx, { phone: e.target.value })}
                              className="text-xs h-8 font-mono"
                            />
                            <div className="flex items-center gap-1.5">
                              <Input
                                placeholder="Direct Email"
                                value={c.email}
                                onChange={(e) => handleUpdateContactPerson(idx, { email: e.target.value })}
                                className="text-xs h-8 flex-1"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveContactPerson(idx)}
                                className="h-7 w-7 p-0 text-rose-600 hover:bg-rose-500/10 shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: LOCATION & ADDRESS */}
              {dialogTab === "location" && (
                <div className="space-y-4">
                  <div className="rounded-xl border p-4 bg-card/60 space-y-3">
                    <GoogleLocationPicker
                      value={formLocationPicked}
                      onChange={(location) => {
                        setFormLocationPicked(location);
                        if (location.full_address || location.formatted_address) {
                          setFormAddress(location.full_address || location.formatted_address);
                        }
                        if (location.city) setFormCity(location.city);
                        if (location.state) setFormState(location.state);
                        if (location.area) setFormArea(location.area);
                        if (location.pincode) setFormPincode(location.pincode);
                        if (location.country) setFormCountry(location.country);
                      }}
                    />

                    <div className="space-y-3 pt-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Street / Building Address</Label>
                        <Input
                          placeholder="Plot number, building name, street, road..."
                          value={formAddress}
                          onChange={(e) => setFormAddress(e.target.value)}
                          className="text-xs h-9"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">City</Label>
                          <Input
                            placeholder="e.g. Mumbai, Noida, Bengaluru"
                            value={formCity}
                            onChange={(e) => setFormCity(e.target.value)}
                            className="text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">State / Region</Label>
                          <Input
                            placeholder="e.g. Maharashtra, Uttar Pradesh"
                            value={formState}
                            onChange={(e) => setFormState(e.target.value)}
                            className="text-xs h-9"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Area / Landmark</Label>
                          <Input
                            placeholder="e.g. Electronic City"
                            value={formArea}
                            onChange={(e) => setFormArea(e.target.value)}
                            className="text-xs h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Pincode / Postal Code</Label>
                          <Input
                            placeholder="e.g. 560100"
                            value={formPincode}
                            onChange={(e) => setFormPincode(e.target.value)}
                            className="text-xs h-9 font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Country</Label>
                          <Input
                            placeholder="India"
                            value={formCountry}
                            onChange={(e) => setFormCountry(e.target.value)}
                            className="text-xs h-9"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dialog Action Buttons */}
            <div className="flex items-center justify-between p-4 px-6 border-t bg-muted/20 mt-auto">
              <ProgressiveSaveIndicator status={clientSaveStatus} />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    clearClientDraft();
                  }}
                  className="rounded-xl h-9 text-xs"
                >
                  Cancel
                </Button>

                {dialogTab === "contacts" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogTab("company")}
                    className="rounded-xl h-9 text-xs gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back
                  </Button>
                )}
                {dialogTab === "location" && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogTab("contacts")}
                    className="rounded-xl h-9 text-xs gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Back
                  </Button>
                )}

                {dialogTab === "company" && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setDialogTab("contacts")}
                    className="rounded-xl h-9 text-xs gap-1 font-semibold"
                  >
                    Next: Contacts
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                )}
                {dialogTab === "contacts" && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setDialogTab("location")}
                    className="rounded-xl h-9 text-xs gap-1 font-semibold"
                  >
                    Next: Location
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                )}

                <Button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl h-9 text-xs font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {editingItem ? "Update Client" : "Save Client"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <BulkUploadClientsDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        institutionId={activeInstitution?.id}
        accessToken={accessToken}
        onSuccess={fetchRecords}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(o) => !o && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-rose-600 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to permanently delete this client record from the database?
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-end gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmId(null)}
              className="rounded-xl text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="rounded-xl text-xs h-9 font-semibold"
            >
              Delete Client
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
