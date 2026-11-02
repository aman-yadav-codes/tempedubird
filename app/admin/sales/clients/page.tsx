"use client";

import { normalizeUrl } from "@/lib/utils";

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
  KeyRound,
  Copy,
  Eye,
  EyeOff,
  ShieldCheck,
  Lock,
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

export type ChannelType =
  | "phone"
  | "whatsapp"
  | "email"
  | "facebook"
  | "teams"
  | "telegram"
  | "linkedin"
  | "instagram"
  | "website"
  | "other";

export type ClientContactChannel = {
  id: string;
  type: ChannelType;
  value: string;
  label: string;
  is_primary?: boolean;
};

export const CHANNEL_OPTIONS: Array<{
  id: ChannelType;
  label: string;
  placeholder: string;
  iconName: string;
}> = [
  { id: "phone", label: "Phone Number", placeholder: "+91 98765 43210", iconName: "phone" },
  { id: "whatsapp", label: "WhatsApp Number", placeholder: "+91 98765 43210", iconName: "whatsapp" },
  { id: "email", label: "Email Address", placeholder: "partner@company.com", iconName: "email" },
  { id: "facebook", label: "Facebook Profile", placeholder: "https://facebook.com/username", iconName: "facebook" },
  { id: "teams", label: "Microsoft Teams", placeholder: "user@organization.com or link", iconName: "teams" },
  { id: "telegram", label: "Telegram", placeholder: "@username or https://t.me/...", iconName: "telegram" },
  { id: "linkedin", label: "LinkedIn Profile", placeholder: "https://linkedin.com/in/username", iconName: "linkedin" },
  { id: "instagram", label: "Instagram Profile", placeholder: "@username or https://instagram.com/...", iconName: "instagram" },
  { id: "website", label: "Website Link", placeholder: "https://company.com", iconName: "website" },
  { id: "other", label: "Other Link / ID", placeholder: "Profile or contact handle", iconName: "other" },
];


export function renderChannelIcon(type: ChannelType, className = "w-3.5 h-3.5") {
  switch (type) {
    case "whatsapp":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.312.045-.634.074-1.807-.411-1.425-.589-2.34-2.029-2.411-2.124-.07-.094-.576-.767-.576-1.464 0-.697.362-1.04.492-1.183.13-.143.284-.179.379-.179.094 0 .189.001.272.005.087.004.204-.033.319.243.119.287.406.992.441 1.064.035.072.059.156.012.249-.047.094-.07.153-.141.235-.07.083-.149.185-.213.249-.071.071-.145.148-.063.289.083.141.368.608.79 0.984.544.484 1.003.633 1.144.704.141.07.225.059.309-.035.083-.095.355-.415.449-.557.094-.143.189-.119.319-.071.13.047.824.389.966.46.141.072.235.107.27.166.035.059.035.346-.109.751zM12 2C6.477 2 2 6.477 2 12c0 1.891.523 3.663 1.433 5.176L2 22l4.954-1.399C8.409 21.497 10.147 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2z" />
        </svg>
      );
    case "facebook":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );
    case "teams":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19.5 7.5a2.25 2.25 0 100-4.5 2.25 2.25 0 000 4.5zm-5 0a3 3 0 100-6 3 3 0 000 6zM22.5 10h-6a1.5 1.5 0 00-1.5 1.5V17a3 3 0 003 3h4.5a1.5 1.5 0 001.5-1.5v-7a1.5 1.5 0 00-1.5-1.5zm-9 0h-8A2.5 2.5 0 003 12.5v6A2.5 2.5 0 005.5 21h8a2.5 2.5 0 002.5-2.5v-6A2.5 2.5 0 0013.5 10z" />
        </svg>
      );
    case "telegram":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.19-.08-.05-.19-.02-.27 0-.12.03-1.99 1.27-5.63 3.73-.53.36-1.02.54-1.45.53-.48-.01-1.4-.27-2.08-.49-.84-.27-1.51-.42-1.45-.89.03-.25.38-.5.99-.76 3.88-1.69 6.47-2.8 7.78-3.34 3.71-1.54 4.48-1.81 4.98-1.82.11 0 .35.03.51.16.13.11.17.26.19.37-.01.07.01.21 0 .28z" />
        </svg>
      );
    case "linkedin":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.62 1.62 0 1 0 0-3.24 1.62 1.62 0 0 0 0 3.24m1.39 9.74v-8.37H5.07v8.37h2.78z" />
        </svg>
      );
    case "instagram":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      );
    case "email":
      return <Mail className={className} />;
    case "website":
      return <Globe className={className} />;
    case "phone":
    default:
      return <Phone className={className} />;
  }
}

export function getChannelBadgeClass(type: ChannelType) {
  switch (type) {
    case "whatsapp":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20";
    case "facebook":
      return "bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/20";
    case "teams":
      return "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30 hover:bg-violet-500/20";
    case "telegram":
      return "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/30 hover:bg-sky-500/20";
    case "linkedin":
      return "bg-blue-600/10 text-blue-700 dark:text-blue-400 border-blue-600/30 hover:bg-blue-600/20";
    case "instagram":
      return "bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/30 hover:bg-pink-500/20";
    case "email":
      return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30 hover:bg-rose-500/20";
    case "website":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20";
    case "phone":
    default:
      return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20";
  }
}

export function getChannelHref(type: ChannelType, val: string) {
  const v = (val || "").trim();
  switch (type) {
    case "phone":
      return `tel:${v.replace(/[^0-9+]/g, "")}`;
    case "whatsapp":
      return `https://wa.me/${v.replace(/[^0-9]/g, "")}`;
    case "email":
      return `mailto:${v}`;
    case "facebook":
      return v.startsWith("http") ? v : `https://facebook.com/${v.replace(/^@/, "")}`;
    case "teams":
      return v.startsWith("http") ? v : `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(v)}`;
    case "telegram":
      return v.startsWith("http") ? v : `https://t.me/${v.replace(/^@/, "")}`;
    case "linkedin":
      return v.startsWith("http") ? v : `https://linkedin.com/in/${v.replace(/^@/, "")}`;
    case "instagram":
      return v.startsWith("http") ? v : `https://instagram.com/${v.replace(/^@/, "")}`;
    case "website":
      return v.startsWith("http") ? v : `https://${v}`;
    default:
      return v.startsWith("http") ? v : `https://${v}`;
  }
}

export const CHANNEL_TAGS = ["Primary", "Work", "Personal", "Support", "Direct", "Office", "Billing"];

export type VendorClientItem = {
  channels?: ClientContactChannel[];
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

export type ClientRecord = VendorClientItem;

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
  const [formChannels, setFormChannels] = useState<ClientContactChannel[]>([
    { id: "1", type: "phone", value: "", label: "Primary", is_primary: true },
  ]);
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


  const handleAddChannel = (type: ChannelType = "phone") => {
    setFormChannels((prev) => [
      ...prev,
      {
        id: `ch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        type,
        value: "",
        label: type === "phone" ? "Primary" : type === "whatsapp" ? "WhatsApp" : "Work",
        is_primary: prev.length === 0,
      },
    ]);
  };

  const handleUpdateChannel = (index: number, patch: Partial<ClientContactChannel>) => {
    setFormChannels((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
  };

  const handleRemoveChannel = (index: number) => {
    setFormChannels((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSetPrimaryChannel = (index: number) => {
    setFormChannels((prev) =>
      prev.map((c, i) => ({
        ...c,
        is_primary: i === index,
      }))
    );
  };

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

    // Communication Channels
    setFormChannels([
      { id: "1", type: "phone", value: "", label: "Primary", is_primary: true },
      { id: "2", type: "whatsapp", value: "", label: "WhatsApp", is_primary: false },
      { id: "3", type: "email", value: "", label: "Work", is_primary: false },
    ]);
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

    // Channels
    let initialChannels: ClientContactChannel[] = [];
    if (Array.isArray(item.channels) && item.channels.length > 0) {
      initialChannels = item.channels.map((ch, idx) => ({
        id: ch.id || String(idx + 1),
        type: ch.type || "phone",
        value: ch.value || "",
        label: ch.label || "Primary",
        is_primary: Boolean(ch.is_primary),
      }));
    } else {
      if (Array.isArray(item.phones) && item.phones.length > 0) {
        item.phones.forEach((p, idx) => {
          if (p.number) {
            initialChannels.push({
              id: `p_${idx}`,
              type: p.label?.toLowerCase().includes("whatsapp") ? "whatsapp" : "phone",
              value: p.number,
              label: p.label || (p.is_primary ? "Primary" : "Work"),
              is_primary: p.is_primary,
            });
          }
        });
      } else if (item.phone) {
        initialChannels.push({
          id: "p_0",
          type: "phone",
          value: item.phone,
          label: "Primary",
          is_primary: true,
        });
      }

      if (Array.isArray(item.emails) && item.emails.length > 0) {
        item.emails.forEach((e, idx) => {
          if (e.email) {
            initialChannels.push({
              id: `e_${idx}`,
              type: "email",
              value: e.email,
              label: e.label || "Work",
              is_primary: e.is_primary,
            });
          }
        });
      } else if (item.email) {
        initialChannels.push({
          id: "e_0",
          type: "email",
          value: item.email,
          label: "Work",
          is_primary: false,
        });
      }

      if (item.website) {
        initialChannels.push({
          id: "w_0",
          type: "website",
          value: item.website,
          label: "Website",
        });
      }
    }
    if (initialChannels.length === 0) {
      initialChannels.push({ id: "1", type: "phone", value: "", label: "Primary", is_primary: true });
    }
    setFormChannels(initialChannels);

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
    if (!contact && !company) {
      toast.error("Please enter contact person name");
      setDialogTab("company");
      return;
    }

    const validChannels = formChannels.filter((c) => c.value.trim().length > 0);
    const primaryPhoneCh = validChannels.find((c) => (c.type === "phone" || c.type === "whatsapp") && c.is_primary)
      || validChannels.find((c) => c.type === "phone" || c.type === "whatsapp");
    const primaryEmailCh = validChannels.find((c) => c.type === "email" && c.is_primary)
      || validChannels.find((c) => c.type === "email");

    const validPhones = validChannels.filter((c) => c.type === "phone" || c.type === "whatsapp").map((c) => ({
      number: c.value,
      label: c.label || (c.type === "whatsapp" ? "WhatsApp" : "Primary"),
      is_primary: c.is_primary,
    }));
    const validEmails = validChannels.filter((c) => c.type === "email").map((c) => ({
      email: c.value,
      label: c.label || "Work",
      is_primary: c.is_primary,
    }));
    const primaryPhone = primaryPhoneCh?.value || "";
    const primaryEmail = primaryEmailCh?.value || "";

    setSaving(true);
    try {
      const payload = {
        id: editingItem?.id,
        name: contact || company,
        company_name: company || null,
        contact_person: contact || company,
        category: formCategory || "Corporate Client",
        vendor_type: formType || "corporate",
        client_type: formType || "corporate",
        phone: primaryPhone || null,
        email: primaryEmail || null,
        phones: validPhones,
        emails: validEmails,
        channels: validChannels,
        contacts: [],
        website: normalizeUrl(formWebsite),
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

  // Password & Access Management State
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordClient, setPasswordClient] = useState<ClientRecord | null>(null);
  const [passwordValue, setPasswordValue] = useState("");
  const [passwordEmail, setPasswordEmail] = useState("");
  const [passwordPhone, setPasswordPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [existingPassword, setExistingPassword] = useState<string | null>(null);
  const [hasExistingAccount, setHasExistingAccount] = useState(false);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  const generateRandomPassword = () => {
    const chars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let rand = "";
    for (let i = 0; i < 6; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const special = ["@", "#", "!", "$", "%"][Math.floor(Math.random() * 5)];
    return `Client@${rand}${special}`;
  };

  const handleOpenPasswordDialog = async (client: ClientRecord) => {
    setPasswordClient(client);
    setPasswordDialogOpen(true);
    setPasswordLoading(true);
    setCopiedCredentials(false);
    setShowPassword(false);

    const chEmail = Array.isArray(client.channels)
      ? client.channels.find((c: any) => c.type === "email")?.value
      : "";
    const chPhone = Array.isArray(client.channels)
      ? client.channels.find((c: any) => c.type === "phone" || c.type === "whatsapp")?.value
      : "";

    const emailToUse = client.email || chEmail || "";
    const phoneToUse = client.phone || chPhone || "";
    setPasswordEmail(emailToUse);
    setPasswordPhone(phoneToUse);

    const newPass = generateRandomPassword();
    setPasswordValue(newPass);

    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/sales/clients/credentials?clientId=${client.id}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setHasExistingAccount(Boolean(data.exists));
        if (data.plainPassword) {
          setExistingPassword(data.plainPassword);
          setPasswordValue(data.plainPassword);
        } else {
          setExistingPassword(null);
        }
        if (data.user?.email) setPasswordEmail(data.user.email);
        if (data.user?.phone) setPasswordPhone(data.user.phone);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleCopyCredentials = () => {
    const loginIdentifier = passwordEmail || passwordPhone || "Primary Email / Phone";
    const textToCopy = `Client Portal Access Credentials:
Login URL: ${typeof window !== "undefined" ? window.location.origin : ""}/admin/login
Username: ${loginIdentifier}
Password: ${passwordValue}`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy);
      setCopiedCredentials(true);
      toast.success("Login credentials copied to clipboard!");
      setTimeout(() => setCopiedCredentials(false), 2500);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordClient) return;
    if (!passwordValue || passwordValue.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (!passwordEmail && !passwordPhone) {
      toast.error("Please provide either an email address or phone number for login");
      return;
    }

    setPasswordSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/sales/clients/credentials", {
        method: "POST",
        headers,
        body: JSON.stringify({
          clientId: passwordClient.id,
          email: passwordEmail,
          phone: passwordPhone,
          password: passwordValue,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to set client portal password");

      toast.success("Client portal credentials generated and saved successfully!");
      setHasExistingAccount(true);
      setExistingPassword(passwordValue);
      setPasswordDialogOpen(false);
      fetchRecords();
    } catch (err: any) {
      toast.error(err.message || "Failed to save password");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleToggleStatus = async (item: ClientRecord) => {
    const newStatus = item.status === "active" ? "inactive" : "active";
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/sales/clients", {
        method: "PUT",
        headers,
        body: JSON.stringify({ id: item.id, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update client status");

      toast.success(
        newStatus === "active"
          ? `${item.company_name || item.name} is now Active`
          : `${item.company_name || item.name} has been Deactivated`
      );
      setRecords((prev) =>
        prev.map((r) => (r.id === item.id ? { ...r, status: newStatus } : r))
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

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

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            placeholder="Search by name, company, phone, email, contact..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl text-xs bg-background"
          />
        </div>

        {/* Status Filter */}
        <div className="w-full sm:w-48 shrink-0">
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
                    <h3 className="text-base font-bold text-foreground line-clamp-1">
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

                    {/* Contact Channels (Phone, WhatsApp, Email, FB, Teams, Telegram, etc.) */}
                    <div className="space-y-1.5 mt-4 pt-3 border-t text-xs text-muted-foreground">
                      {Array.isArray(item.channels) && item.channels.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {item.channels.map((ch, idx) => (
                            <a
                              key={ch.id || idx}
                              href={getChannelHref(ch.type, ch.value)}
                              target={ch.type === "phone" ? "_self" : "_blank"}
                              rel="noopener noreferrer"
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium transition-all shadow-2xs ${getChannelBadgeClass(
                                ch.type
                              )}`}
                              title={`${ch.label ? `${ch.label}: ` : ""}${ch.value}`}
                            >
                              {renderChannelIcon(ch.type, "w-3.5 h-3.5 shrink-0")}
                              <span className="truncate max-w-[170px]">{ch.value}</span>
                            </a>
                          ))}
                        </div>
                      ) : (
                        <>
                          {item.phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                              <a href={`tel:${item.phone}`} className="hover:underline hover:text-foreground font-mono">
                                {item.phone}
                              </a>
                            </div>
                          )}
                          {item.email && (
                            <div className="flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                              <a href={`mailto:${item.email}`} className="hover:underline hover:text-foreground truncate max-w-[170px]">
                                {item.email}
                              </a>
                            </div>
                          )}
                        </>
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
                <div className="p-3 bg-muted/30 border-t flex items-center justify-between gap-1.5 flex-wrap">
                  {/* Status Active / Deactive Toggle Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleStatus(item)}
                    className={`h-8 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      item.status === "active"
                        ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10 hover:bg-rose-500/10 hover:text-rose-600 hover:border-rose-400"
                        : "border-muted-foreground/30 text-muted-foreground bg-muted/40 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-400"
                    }`}
                    title={item.status === "active" ? "Active (Click to Deactivate)" : "Inactive (Click to Activate)"}
                  >
                    <span className={`w-2 h-2 rounded-full mr-1.5 ${item.status === "active" ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                    {item.status === "active" ? "Active" : "Inactive"}
                  </Button>

                  <div className="flex items-center gap-1.5 ml-auto">
                    {/* Create / View Password Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPasswordDialog(item)}
                      className="h-8 px-2.5 rounded-lg text-xs font-semibold border-primary/30 hover:bg-primary/10 text-primary gap-1.5 cursor-pointer shadow-2xs"
                      title="Generate or view client portal login password"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Password</span>
                    </Button>

                    {/* Edit Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(item)}
                      className="h-8 px-2.5 rounded-lg text-xs font-semibold hover:bg-background cursor-pointer"
                      title="Edit client record"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="h-8 px-2.5 rounded-lg text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                      title="Delete client record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
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
                      <td className="p-3.5 space-y-1">
                        {Array.isArray(item.channels) && item.channels.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-w-[220px]">
                            {item.channels.slice(0, 3).map((ch, i) => (
                              <a
                                key={ch.id || i}
                                href={getChannelHref(ch.type, ch.value)}
                                target={ch.type === "phone" ? "_self" : "_blank"}
                                rel="noopener noreferrer"
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] border ${getChannelBadgeClass(ch.type)}`}
                                title={`${ch.label || ch.type}: ${ch.value}`}
                              >
                                {renderChannelIcon(ch.type, "w-3 h-3 shrink-0")}
                                <span className="truncate max-w-[110px]">{ch.value}</span>
                              </a>
                            ))}
                            {item.channels.length > 3 && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                +{item.channels.length - 3}
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <>
                            {item.phone && (
                              <div className="flex items-center gap-1 font-mono">
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
                          </>
                        )}
                      </td>
                      <td className="p-3.5 max-w-[200px] truncate">{item.address || "-"}</td>
                      <td className="p-3.5">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleStatus(item)}
                          className={`h-7 px-2 rounded-lg text-[10px] font-semibold cursor-pointer transition-all ${
                            item.status === "active"
                              ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10 hover:bg-rose-500/10 hover:text-rose-600"
                              : "border-muted-foreground/30 text-muted-foreground bg-muted/40 hover:bg-emerald-500/10 hover:text-emerald-600"
                          }`}
                          title={item.status === "active" ? "Click to Deactivate" : "Click to Activate"}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full mr-1 ${item.status === "active" ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                          {item.status === "active" ? "Active" : "Inactive"}
                        </Button>
                      </td>
                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenPasswordDialog(item)}
                            className="h-7 px-2 rounded-lg text-xs font-semibold border-primary/30 text-primary hover:bg-primary/10 gap-1 cursor-pointer"
                            title="Generate or view client portal password"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                            <span>Password</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            className="h-7 w-7 p-0 rounded-lg hover:bg-muted cursor-pointer"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="h-7 w-7 p-0 rounded-lg text-rose-600 hover:bg-rose-500/10 cursor-pointer"
                            title="Delete"
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
                      <Label className="text-xs font-semibold">Business / Company Name <span className="text-muted-foreground font-normal">(Optional)</span></Label>
                      <Input
                        placeholder="e.g., Apex Tech Solutions Pvt Ltd"
                        value={formCompanyName}
                        onChange={(e) => setFormCompanyName(e.target.value)}
                        className="text-xs h-9"
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
                      placeholder="e.g. xyz.com, www.xyz.com, or https://..."
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


                </div>
              )}

              {/* TAB 2: COMMUNICATION CHANNELS & SOCIAL PROFILES */}
              {dialogTab === "contacts" && (
                <div className="space-y-4">
                  <div className="rounded-xl border p-4 bg-card/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-primary" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          Contact Channels & Social Profiles ({formChannels.length})
                        </h4>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddChannel("phone")}
                        className="text-xs h-7 gap-1 font-semibold cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        Add Channel
                      </Button>
                    </div>

                    <p className="text-[11px] text-muted-foreground">
                      Choose what you want to add: Phone Number, WhatsApp, Email, Facebook Profile Link, Microsoft Teams, Telegram, etc.
                    </p>

                    <div className="space-y-2.5 pt-1">
                      {formChannels.map((ch, idx) => {
                        const opt = CHANNEL_OPTIONS.find((o) => o.id === ch.type) || CHANNEL_OPTIONS[0];
                        return (
                          <div
                            key={ch.id || idx}
                            className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-lg border bg-background shadow-2xs"
                          >
                            {/* Type Dropdown */}
                            <Select
                              value={ch.type}
                              onValueChange={(val: ChannelType) => {
                                handleUpdateChannel(idx, {
                                  type: val,
                                  label: val === "phone" ? "Primary" : val === "whatsapp" ? "WhatsApp" : "Work",
                                });
                              }}
                            >
                              <SelectTrigger className="text-xs h-9 w-full sm:w-48 bg-muted/20 font-medium">
                                <div className="flex items-center gap-1.5 truncate">
                                  {renderChannelIcon(ch.type, "w-3.5 h-3.5 shrink-0")}
                                  <SelectValue />
                                </div>
                              </SelectTrigger>
                              <SelectContent>
                                {CHANNEL_OPTIONS.map((o) => (
                                  <SelectItem key={o.id} value={o.id} className="text-xs">
                                    <div className="flex items-center gap-2">
                                      {renderChannelIcon(o.id, "w-3.5 h-3.5 shrink-0")}
                                      <span>{o.label}</span>
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            {/* Value Input */}
                            <Input
                              placeholder={opt.placeholder}
                              value={ch.value}
                              onChange={(e) => handleUpdateChannel(idx, { value: e.target.value })}
                              className="text-xs h-9 flex-1"
                            />

                            {/* Tag / Label Dropdown */}
                            <Select
                              value={ch.label || "Work"}
                              onValueChange={(val) => handleUpdateChannel(idx, { label: val })}
                            >
                              <SelectTrigger className="text-xs h-9 w-28 bg-muted/20">
                                <SelectValue placeholder="Tag" />
                              </SelectTrigger>
                              <SelectContent>
                                {CHANNEL_TAGS.map((tag) => (
                                  <SelectItem key={tag} value={tag} className="text-xs">
                                    {tag}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>

                            <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                              <button
                                type="button"
                                onClick={() => handleSetPrimaryChannel(idx)}
                                className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-all cursor-pointer ${
                                  ch.is_primary
                                    ? "bg-primary text-primary-foreground shadow-xs"
                                    : "bg-muted text-muted-foreground hover:text-foreground"
                                }`}
                                title="Set as primary contact method"
                              >
                                {ch.is_primary ? "Primary" : "Make Primary"}
                              </button>

                              {formChannels.length > 1 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveChannel(idx)}
                                  className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-500/10 shrink-0 cursor-pointer"
                                  title="Remove channel"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
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

      {/* Client Portal Password / Access Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2.5 text-primary font-bold text-lg">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <KeyRound className="w-5 h-5" />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Client Portal Login & Password
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Generate portal access credentials for{" "}
              <span className="font-semibold text-foreground">
                {passwordClient?.company_name || passwordClient?.name}
              </span>
              . The client can log into the system with their email or phone number to view their profile and associated projects.
            </DialogDescription>
          </DialogHeader>

          {passwordLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="w-7 h-7 animate-spin text-primary mb-2" />
              <p className="text-xs text-muted-foreground">Checking client account status...</p>
            </div>
          ) : (
            <form onSubmit={handleSavePassword} className="space-y-4 pt-2">
              {hasExistingAccount && existingPassword && (
                <div className="p-3 rounded-xl border border-emerald-500/25 bg-emerald-500/10 flex items-start gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                      Active Portal Account Found
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      This client already has portal login access. You can view or reset their password below.
                    </p>
                  </div>
                </div>
              )}

              {/* Login Email */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Login Email <span className="text-muted-foreground font-normal">(Primary username)</span>
                </Label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    placeholder="e.g. client@company.com"
                    value={passwordEmail}
                    onChange={(e) => setPasswordEmail(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
              </div>

              {/* Login Phone */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  Login Phone <span className="text-muted-foreground font-normal">(Alternative username)</span>
                </Label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    placeholder="e.g. +91 98765 43210"
                    value={passwordPhone}
                    onChange={(e) => setPasswordPhone(e.target.value)}
                    className="pl-9 h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Password *</Label>
                  <button
                    type="button"
                    onClick={() => setPasswordValue(generateRandomPassword())}
                    className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles className="w-3 h-3" />
                    Generate Strong Password
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter or generate password"
                    value={passwordValue}
                    onChange={(e) => setPasswordValue(e.target.value)}
                    className="pl-9 pr-10 h-9 text-xs font-mono"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Quick Credentials Copy Card */}
              {passwordValue && (
                <div className="p-3 rounded-xl bg-muted/40 border text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground text-[11px]">Portal Login Summary</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyCredentials}
                      className="h-7 px-2 text-[11px] font-semibold gap-1.5 border-primary/20 text-primary hover:bg-primary/5 cursor-pointer"
                    >
                      {copiedCredentials ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy Credentials</span>
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="text-[11px] space-y-1 font-mono text-muted-foreground bg-background p-2 rounded-lg border">
                    <div><span className="text-foreground font-sans font-medium">Login: </span>{passwordEmail || passwordPhone || "—"}</div>
                    <div><span className="text-foreground font-sans font-medium">Password: </span>{passwordValue}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPasswordDialogOpen(false)}
                  className="rounded-xl text-xs h-9 cursor-pointer"
                  disabled={passwordSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={passwordSaving || (!passwordEmail && !passwordPhone) || !passwordValue}
                  className="rounded-xl text-xs h-9 font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                >
                  {passwordSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      {hasExistingAccount ? "Update Password" : "Save & Enable Login"}
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

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
