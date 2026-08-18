"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  BriefcaseBusiness,
  Clock3,
  Edit2,
  Eye,
  History,
  Loader2,
  Mail,
  MessageCircle,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Trash2,
  UserRound,
  UserRoundPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { DatePicker } from "@/components/shared/date-picker";
import { MultiInput } from "@/components/shared/multi-input";
import { ResponsiveDetailSurface } from "@/components/shared/responsive-detail-surface";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

type PhoneEntry = {
  number: string;
  is_whatsapp: boolean;
};

type SalesContact = {
  id: number;
  contact_type: string;
  full_name: string;
  emails: string[];
  phones: PhoneEntry[];
  website: string | null;
  business_name: string | null;
  business_is_active: boolean;
  designation: string | null;
  address: string | null;
  lead_source: string;
  sales_stage: string;
  pipeline_stage: string;
  next_follow_up_date: string | null;
  assigned_to: number | null;
  assigned_to_name: string | null;
  assigned_to_email: string | null;
  assigned_package_id: number | null;
  package_name: string | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
  created_by_name: string | null;
  updated_by_name: string | null;
  history?: SalesContactHistory[];
};

type SalesContactHistory = {
  id: number;
  action: string;
  before_data: Partial<SalesContact> | null;
  after_data: Partial<SalesContact> | null;
  changed_by: number | null;
  changed_by_name: string | null;
  changed_by_email: string | null;
  before_assigned_to_name: string | null;
  before_assigned_to_email: string | null;
  after_assigned_to_name: string | null;
  after_assigned_to_email: string | null;
  before_package_name: string | null;
  after_package_name: string | null;
  changed_at: string;
};

type SalesPackage = {
  id: number;
  name: string;
  package_for: string;
  package_for_types: string[] | null;
  price: string | number;
  price_unit: string;
  storage_limit_gb: string | number | null;
  validity_count: number;
  validity_unit: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  created_by_name: string | null;
  updated_by_name: string | null;
};

type UserOption = {
  id: number;
  full_name: string;
  email: string;
};

type InstitutionTypeOption = {
  id: number;
  name: string;
  slug?: string;
};

type ContactForm = Omit<SalesContact, "id" | "created_at" | "updated_at" | "assigned_to_name" | "assigned_to_email" | "package_name" | "created_by_name" | "updated_by_name">;

type PackageForm = {
  id?: number;
  name: string;
  package_for: string;
  package_for_types: string[];
  price: string;
  price_unit: string;
  storage_limit_gb: string;
  validity_count: string;
  validity_unit: string;
  description: string;
  is_active: boolean;
};

type PackageFormErrors = Partial<Record<"name" | "package_for" | "price" | "price_unit" | "storage_limit_gb" | "validity_count" | "validity_unit" | "description", string>>;
type StageUpdateForm = Pick<ContactForm, "sales_stage" | "pipeline_stage" | "next_follow_up_date" | "assigned_to" | "assigned_package_id" | "remarks">;

const contactTypes = [
  { value: "individual", label: "Individual" },
  { value: "student", label: "Student" },
  { value: "school", label: "School" },
  { value: "coaching_institute", label: "Coaching Institute" },
  { value: "university", label: "University" },
];

const leadSources = [
  { value: "google", label: "Google" },
  { value: "website", label: "Website" },
  { value: "social_media", label: "Social Media" },
  { value: "lead", label: "Lead" },
  { value: "mtm", label: "MTM" },
  { value: "promotion", label: "Promotion" },
];

const salesStages = [
  { value: "lead", label: "Lead" },
  { value: "called", label: "Called" },
  { value: "call_later", label: "Call later" },
  { value: "not_received_call", label: "Not received call" },
  { value: "not_interested", label: "Not interested" },
  { value: "meeting_demo", label: "Meeting/Demo" },
  { value: "need_proposal", label: "Need proposal" },
  { value: "proposal_sent", label: "Proposal sent" },
  { value: "interested_to_pay", label: "Interested to pay us" },
  { value: "send_invoice", label: "Send invoice" },
  { value: "paid", label: "Paid" },
  { value: "access_given", label: "Access given" },
  { value: "client_approved", label: "Client approved" },
];

const followUpRequiredStages = new Set([
  "called",
  "call_later",
  "meeting_demo",
  "need_proposal",
  "proposal_sent",
  "interested_to_pay",
  "send_invoice",
]);

const legacyStatusMap: Record<string, string> = {
  proposal: "need_proposal",
  no_need: "not_interested",
  not_received: "not_received_call",
  client_callback: "call_later",
  made_payment: "paid",
  client_approval: "client_approved",
};

const priceUnits = [
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
  { value: "once", label: "Once" },
];

const validityUnits = [
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const blankContactForm: ContactForm = {
  contact_type: "individual",
  full_name: "",
  emails: [],
  phones: [{ number: "", is_whatsapp: true }],
  website: null,
  business_name: null,
  business_is_active: false,
  designation: null,
  address: null,
  lead_source: "google",
  sales_stage: "lead",
  pipeline_stage: "lead",
  next_follow_up_date: null,
  assigned_to: null,
  assigned_package_id: null,
  remarks: null,
};

const blankPackageForm: PackageForm = {
  name: "",
  package_for: "",
  package_for_types: [],
  price: "",
  price_unit: "month",
  storage_limit_gb: "",
  validity_count: "1",
  validity_unit: "month",
  description: "",
  is_active: true,
};

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function optionLabel(options: Array<{ value: string; label: string }>, value: string | null | undefined) {
  const normalized = normalizeSalesStatus(value);
  return options.find((option) => option.value === normalized)?.label ?? value ?? "-";
}

function normalizeSalesStatus(value: string | null | undefined) {
  if (!value) return value;
  return legacyStatusMap[value] ?? value;
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString("en-IN") : "-";
}

function formatDateOnly(value: string | null | undefined) {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
}

function requiresFollowUpDate(status: string | null | undefined) {
  return followUpRequiredStages.has(normalizeSalesStatus(status) ?? "");
}

function outlookComposeUrl(email: string) {
  return `https://outlook.office.com/mail/deeplink/compose?to=${encodeURIComponent(email)}`;
}

function whatsappUrl(number: string) {
  const digits = number.replace(/\D/g, "");
  if (!digits) return "";
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
}

function useIsMobileSurface(breakpoint = 767) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(query.matches);

    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

function currency(value: string | number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value) || 0);
}

function packageTargetLabel(item: Pick<SalesPackage, "package_for" | "package_for_types">) {
  return Array.isArray(item.package_for_types) && item.package_for_types.length
    ? item.package_for_types.join(", ")
    : item.package_for;
}

function storageLabel(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "Not limited";
  return `${Number(value).toLocaleString("en-IN")} GB`;
}

function packageValidityLabel(item: Pick<SalesPackage, "validity_count" | "validity_unit">) {
  const unit = item.validity_unit === "year" ? "year" : "month";
  return `${item.validity_count ?? 1} ${unit}${Number(item.validity_count ?? 1) === 1 ? "" : "s"}`;
}

function firstPackageError(errors: PackageFormErrors) {
  return errors.name ?? errors.package_for ?? errors.price ?? errors.price_unit ?? errors.storage_limit_gb ?? errors.validity_count ?? errors.validity_unit ?? errors.description ?? "Please complete all package fields";
}

function validateEmail(value: string) {
  const email = value.trim();
  if (!email) return "Email address is required";
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? null : "Enter a valid email address";
}

function validatePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "Phone number is required";
  return digits.length === 10 ? null : "Enter a 10 digit phone number";
}

function buildContactForm(contact?: SalesContact | null): ContactForm {
  if (!contact) return blankContactForm;
  return {
    contact_type: contact.contact_type,
    full_name: contact.full_name,
    emails: Array.isArray(contact.emails) ? contact.emails.filter((email) => !validateEmail(email)) : [],
    phones: Array.isArray(contact.phones) && contact.phones.length
      ? contact.phones.filter((phone) => !validatePhone(phone.number))
      : [{ number: "", is_whatsapp: true }],
    website: contact.website,
    business_name: contact.business_name,
    business_is_active: contact.business_is_active,
    designation: contact.designation,
    address: contact.address,
    lead_source: contact.lead_source,
    sales_stage: normalizeSalesStatus(contact.sales_stage) ?? "lead",
    pipeline_stage: normalizeSalesStatus(contact.sales_stage || contact.pipeline_stage) ?? "lead",
    next_follow_up_date: contact.next_follow_up_date,
    assigned_to: contact.assigned_to,
    assigned_package_id: contact.assigned_package_id,
    remarks: contact.remarks,
  };
}

function buildStageUpdateForm(contact?: SalesContact | null): StageUpdateForm {
  return {
    sales_stage: normalizeSalesStatus(contact?.sales_stage || contact?.pipeline_stage) ?? "lead",
    pipeline_stage: normalizeSalesStatus(contact?.sales_stage || contact?.pipeline_stage) ?? "lead",
    next_follow_up_date: contact?.next_follow_up_date ?? null,
    assigned_to: contact?.assigned_to ?? null,
    assigned_package_id: contact?.assigned_package_id ?? null,
    remarks: contact?.remarks ?? null,
  };
}

function buildPackageForm(item?: SalesPackage | null): PackageForm {
  if (!item) return blankPackageForm;
  const targetTypes = Array.isArray(item.package_for_types) && item.package_for_types.length
    ? item.package_for_types
    : item.package_for
      ? item.package_for.split(",").map((value) => value.trim()).filter(Boolean)
      : [];
  return {
    id: item.id,
    name: item.name,
    package_for: targetTypes.join(", "),
    package_for_types: targetTypes,
    price: String(item.price ?? ""),
    price_unit: item.price_unit,
    storage_limit_gb: item.storage_limit_gb === null || item.storage_limit_gb === undefined ? "" : String(item.storage_limit_gb),
    validity_count: String(item.validity_count ?? 1),
    validity_unit: item.validity_unit ?? "month",
    description: item.description ?? "",
    is_active: item.is_active,
  };
}

function historyActionLabel(action: string) {
  if (action === "create") return "Created contact";
  if (action === "stage_update") return "Updated status";
  if (action === "update") return "Updated contact";
  if (action === "delete") return "Deleted contact";
  return action.replace(/_/g, " ");
}

function historyChangedBy(item: SalesContactHistory) {
  return item.changed_by_name || item.changed_by_email || "System";
}

function historyAssigneeLabel(item: SalesContactHistory, side: "before" | "after") {
  const name = side === "before" ? item.before_assigned_to_name : item.after_assigned_to_name;
  const email = side === "before" ? item.before_assigned_to_email : item.after_assigned_to_email;
  const id = side === "before" ? item.before_data?.assigned_to : item.after_data?.assigned_to;
  return name || email || (id ? `User #${id}` : "Not assigned");
}

function historyPackageLabel(item: SalesContactHistory, side: "before" | "after") {
  const name = side === "before" ? item.before_package_name : item.after_package_name;
  const id = side === "before" ? item.before_data?.assigned_package_id : item.after_data?.assigned_package_id;
  return name || (id ? `Package #${id}` : "Not assigned");
}

function ContactDialog({
  accessToken,
  packages,
  contact,
  onSaved,
  trigger,
  open,
  onOpenChange,
}: {
  accessToken: string | null;
  packages: SalesPackage[];
  contact?: SalesContact | null;
  onSaved: () => void;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isControlled = open !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const actualOpen = isControlled ? Boolean(open) : internalOpen;
  const isMobile = useIsMobileSurface();
  const [activeStep, setActiveStep] = useState(0);
  const [form, setForm] = useState<ContactForm>(() => buildContactForm(contact));
  const [emailDraft, setEmailDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(contact?.id);
  const steps = [
    { label: "Basic Details", icon: UserRoundPlus },
    { label: "Business Details", icon: BriefcaseBusiness },
    { label: "Source", icon: BadgeDollarSign },
  ];

  useEffect(() => {
    if (!actualOpen) return;
    const timeout = window.setTimeout(() => {
      setForm(buildContactForm(contact));
      setEmailDraft("");
      setPhoneDraft("");
      setErrors({});
      setActiveStep(0);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [actualOpen, contact]);

  function setDialogOpen(nextOpen: boolean) {
    if (isControlled) onOpenChange?.(nextOpen);
    else setInternalOpen(nextOpen);
  }

  function update<Key extends keyof ContactForm>(key: Key, value: ContactForm[Key]) {
    setErrors((current) => ({ ...current, [String(key)]: "" }));
    setForm((current) => {
      if (key === "sales_stage") {
        const salesStage = String(value);
        return {
          ...current,
          sales_stage: salesStage,
          pipeline_stage: salesStage,
          next_follow_up_date: requiresFollowUpDate(salesStage) ? current.next_follow_up_date : null,
        };
      }
      return { ...current, [key]: value };
    });
  }

  function updateEmails(values: string[]) {
    const validEmails: string[] = [];
    for (const value of values) {
      const email = value.trim();
      if (!email) continue;
      const error = validateEmail(email);
      if (error) {
        setErrors((current) => ({ ...current, emails: error }));
        continue;
      }
      validEmails.push(email);
    }
    update("emails", Array.from(new Set(validEmails)));
  }

  function updatePhoneNumbers(values: string[]) {
    const validPhones: string[] = [];
    for (const value of values) {
      const phone = value.replace(/\D/g, "");
      if (!phone) continue;
      const error = validatePhone(phone);
      if (error) {
        setErrors((current) => ({ ...current, phones: error }));
        continue;
      }
      validPhones.push(phone);
    }
    const next = Array.from(new Set(validPhones)).map((number, index) => ({
      number,
      is_whatsapp: form.phones.find((phone) => phone.number === number)?.is_whatsapp ?? index === 0,
    }));
    update("phones", next.length ? next : [{ number: "", is_whatsapp: true }]);
  }

  function validateBasicDetails() {
    const nextErrors: Record<string, string> = {};
    const emails = form.emails.map((item) => item.trim()).filter(Boolean);
    const phoneNumbers = form.phones.map((phone) => phone.number.trim()).filter(Boolean);

    if (!form.full_name.trim()) nextErrors.full_name = "Full name is required";
    if (!emails.length) nextErrors.emails = emailDraft.trim()
      ? validateEmail(emailDraft) ?? "Click Add Email before continuing"
      : "Add at least one email address";
    else nextErrors.emails = emails.map(validateEmail).find(Boolean) ?? "";
    if (emailDraft.trim() && emails.length) nextErrors.emails = validateEmail(emailDraft) ?? "Click Add Email before continuing";

    if (!phoneNumbers.length) nextErrors.phones = phoneDraft.trim()
      ? validatePhone(phoneDraft) ?? "Click Add Phone before continuing"
      : "Add at least one phone number";
    else nextErrors.phones = phoneNumbers.map(validatePhone).find(Boolean) ?? "";
    if (phoneDraft.trim() && phoneNumbers.length) nextErrors.phones = validatePhone(phoneDraft) ?? "Click Add Phone before continuing";

    Object.keys(nextErrors).forEach((key) => {
      if (!nextErrors[key]) delete nextErrors[key];
    });
    setErrors(nextErrors);
    return nextErrors;
  }

  function getBasicDetailsErrorMessage(nextErrors: Record<string, string>) {
    const messages = [
      nextErrors.full_name,
      nextErrors.emails,
      nextErrors.phones,
    ].filter(Boolean);

    if (messages.length === 0) return null;
    if (messages.length === 1) return messages[0];
    return messages.join(". ");
  }

  function validateSourceDetails() {
    const nextErrors: Record<string, string> = {};

    if (!form.lead_source) nextErrors.lead_source = "Select a lead source";
    if (!form.sales_stage) nextErrors.sales_stage = "Select a status";
    if (requiresFollowUpDate(form.sales_stage) && !form.next_follow_up_date) {
      nextErrors.next_follow_up_date = "Select next follow-up date";
    }
    if (!form.assigned_to) nextErrors.assigned_to = "Select an assigned platform admin";

    setErrors((current) => ({
      ...current,
      lead_source: "",
      sales_stage: "",
      next_follow_up_date: "",
      assigned_to: "",
      ...nextErrors,
    }));

    return nextErrors;
  }

  function getSourceDetailsErrorMessage(nextErrors: Record<string, string>) {
    const messages = [
      nextErrors.lead_source,
      nextErrors.sales_stage,
      nextErrors.next_follow_up_date,
      nextErrors.assigned_to,
    ].filter(Boolean);

    if (messages.length === 0) return null;
    if (messages.length === 1) return messages[0];
    return messages.join(". ");
  }

  function goNext() {
    if (activeStep === 0) {
      const nextErrors = validateBasicDetails();
      const message = getBasicDetailsErrorMessage(nextErrors);
      if (message) {
        toast.error(message);
        return;
      }
    }
    setActiveStep((step) => step + 1);
  }

  function validateBeforeSave() {
    const basicErrors = validateBasicDetails();
    const basicMessage = getBasicDetailsErrorMessage(basicErrors);
    if (basicMessage) {
      toast.error(basicMessage);
      setActiveStep(0);
      return false;
    }

    const sourceErrors = validateSourceDetails();
    const sourceMessage = getSourceDetailsErrorMessage(sourceErrors);
    if (sourceMessage) {
      toast.error(sourceMessage);
      setActiveStep(2);
      return false;
    }

    return true;
  }

  async function save() {
    if (!accessToken) return;
    if (!validateBeforeSave()) {
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        website: form.website?.trim() || null,
        business_name: form.business_name?.trim() || null,
        designation: form.designation?.trim() || null,
        address: form.address?.trim() || null,
        remarks: form.remarks?.trim() || null,
        next_follow_up_date: requiresFollowUpDate(form.sales_stage) ? form.next_follow_up_date : null,
        emails: form.emails.map((item) => item.trim()).filter(Boolean),
        phones: form.phones
          .map((phone) => ({ ...phone, number: phone.number.replace(/\D/g, "") }))
          .filter((phone) => phone.number),
      };
      const res = await fetch(
        isEdit ? `/api/admin/analytics/sales?resource=contacts&id=${contact?.id}` : "/api/admin/analytics/sales?resource=contacts",
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save contact");
      toast.success(isEdit ? "Sales contact updated" : "Sales contact added");
      setDialogOpen(false);
      onSaved();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const selectedAssigneeLabel = contact?.assigned_to === form.assigned_to
    ? contact?.assigned_to_name ?? contact?.assigned_to_email ?? ""
    : "";

  const title = isEdit ? "Edit Contact" : "Add Contact";
  const description = "Capture sales contact information, business context, and source details.";
  const formContent = (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-4 py-2 sm:space-y-5 sm:px-6 sm:py-4">
          <div className="relative">
            <div className="overflow-x-auto overscroll-x-contain scroll-smooth pb-1">
              <ol className="grid min-w-[430px] grid-cols-3 gap-2 sm:min-w-0">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = activeStep === index;
                  const isComplete = activeStep > index;

                  return (
                    <li key={step.label} className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setActiveStep(index)}
                        className={cn(
                          "flex h-10 w-full items-center gap-1.5 whitespace-nowrap rounded-md border px-2 text-left text-xs transition-colors sm:h-12 sm:gap-2 sm:px-3 sm:text-sm",
                          isActive && "border-primary bg-primary text-primary-foreground",
                          isComplete && !isActive && "bg-muted",
                          !isActive && !isComplete && "hover:bg-muted"
                        )}
                      >
                        <span
                          className={cn(
                            "grid size-6 shrink-0 place-items-center rounded-full border sm:size-7",
                            isActive && "border-primary-foreground/50",
                            isComplete && !isActive && "bg-background"
                          )}
                        >
                          <Icon className="size-3 sm:size-3.5" />
                        </span>
                        <span className="truncate text-xs font-medium sm:text-sm">{step.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          <div>
            {activeStep === 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Type of Contact</Label>
                  <Select value={form.contact_type} onValueChange={(value) => update("contact_type", value)}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{contactTypes.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Full Name *</Label>
                  <Input
                    value={form.full_name}
                    onChange={(event) => update("full_name", event.target.value)}
                    placeholder="Jane Cooper"
                    className={errors.full_name ? "border-destructive ring-1 ring-destructive/30" : undefined}
                  />
                  {errors.full_name && <p className="text-xs font-medium text-destructive">{errors.full_name}</p>}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Email Address *</Label>
                  <MultiInput
                    values={form.emails}
                    onChange={updateEmails}
                    onDraftChange={setEmailDraft}
                    validateItem={validateEmail}
                    error={errors.emails}
                    placeholder="jane@example.com"
                    inputMode="email"
                    addLabel="Add Email"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Phone *</Label>
                  <MultiInput
                    values={form.phones.map((phone) => phone.number).filter(Boolean)}
                    onChange={updatePhoneNumbers}
                    onDraftChange={setPhoneDraft}
                    validateItem={validatePhone}
                    error={errors.phones}
                    placeholder="9876543210"
                    inputMode="tel"
                    addLabel="Add Phone"
                  />
                  {form.phones.filter((phone) => phone.number).length > 0 && (
                    <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <Checkbox
                        checked={Boolean(form.phones[0]?.is_whatsapp)}
                        onCheckedChange={(checked) => update("phones", form.phones.map((phone, index) => ({ ...phone, is_whatsapp: index === 0 ? Boolean(checked) : false })))}
                      />
                      First number is WhatsApp number
                    </label>
                  )}
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Website <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                  <Input value={form.website ?? ""} onChange={(event) => update("website", event.target.value)} placeholder="https://example.com" />
                </div>
              </div>
            )}

            {activeStep === 1 && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Business Name <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                  <Input value={form.business_name ?? ""} onChange={(event) => update("business_name", event.target.value)} placeholder="EduBird Academy" />
                </div>
                <label className="flex h-10 items-center gap-3 self-end rounded-md border px-3">
                  <Checkbox checked={form.business_is_active} onCheckedChange={(checked) => update("business_is_active", Boolean(checked))} />
                  <span className="font-medium">Is business active?</span>
                </label>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Designation of Business <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                  <Input value={form.designation ?? ""} onChange={(event) => update("designation", event.target.value)} placeholder="Owner, Principal, Director" />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Address <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                  <Textarea value={form.address ?? ""} onChange={(event) => update("address", event.target.value)} placeholder="Full address" rows={4} />
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="grid gap-3">
                <div className="grid gap-3 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Lead Source *</Label>
                  <Select value={form.lead_source} onValueChange={(value) => update("lead_source", value)}>
                    <SelectTrigger className={cn("w-full", errors.lead_source && "border-destructive ring-1 ring-destructive/30")}><SelectValue /></SelectTrigger>
                    <SelectContent>{leadSources.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.lead_source && <p className="text-xs font-medium text-destructive">{errors.lead_source}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Status *</Label>
                  <Select value={form.sales_stage} onValueChange={(value) => update("sales_stage", value)}>
                    <SelectTrigger className={cn("w-full", errors.sales_stage && "border-destructive ring-1 ring-destructive/30")}><SelectValue /></SelectTrigger>
                    <SelectContent>{salesStages.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {errors.sales_stage && <p className="text-xs font-medium text-destructive">{errors.sales_stage}</p>}
                </div>
                {requiresFollowUpDate(form.sales_stage) && (
                  <div className="space-y-2">
                    <Label>Next Follow-up Date *</Label>
                    <DatePicker
                      value={form.next_follow_up_date ?? ""}
                      onChange={(value) => update("next_follow_up_date", value || null)}
                      placeholder="Select follow-up date"
                      className={errors.next_follow_up_date ? "border-destructive ring-1 ring-destructive/30" : undefined}
                    />
                    {errors.next_follow_up_date && <p className="text-xs font-medium text-destructive">{errors.next_follow_up_date}</p>}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Assigned Package <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                  <Select value={form.assigned_package_id ? String(form.assigned_package_id) : "none"} onValueChange={(value) => update("assigned_package_id", value === "none" ? null : Number(value))}>
                    <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Not Assigned</SelectItem>
                      {packages.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                <div className="space-y-2">
                  <Label>Assigned To *</Label>
                  <div className={errors.assigned_to ? "rounded-md border border-destructive ring-1 ring-destructive/30" : undefined}>
                  <AsyncSearchPopover<UserOption>
                    value={form.assigned_to ? String(form.assigned_to) : ""}
                    selectedLabel={selectedAssigneeLabel}
                    onChange={(value) => update("assigned_to", value ? Number(value) : null)}
                    placeholder="Select platform admin"
                    searchPlaceholder="Search platform admins..."
                    showDefaultOption
                    defaultOptionLabel="Not assigned"
                    fetcher={async (search, page) => {
                      if (!accessToken) return { data: [], hasMore: false };
                      const params = new URLSearchParams({ page: String(page), limit: "15", roleCode: "platform_admin", includeCurrentUser: "true" });
                      if (search) params.set("search", search);
                      const res = await fetch(`/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } });
                      const json = await res.json();
                      return { data: json.data ?? [], hasMore: page < (json.pageCount ?? page) };
                    }}
                    getValue={(item) => String(item.id)}
                    getLabel={(item) => item.full_name || item.email}
                    renderItem={(item) => (
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.full_name || item.email}</p>
                        <p className="truncate text-xs text-muted-foreground">{item.email}</p>
                      </div>
                    )}
                  />
                  </div>
                  {errors.assigned_to && <p className="text-xs font-medium text-destructive">{errors.assigned_to}</p>}
                </div>
                </div>
                <div className="space-y-2">
                  <Label>Note or Remarks <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                  <Textarea value={form.remarks ?? ""} onChange={(event) => update("remarks", event.target.value)} placeholder="Add sales notes, follow-up plan, or context" rows={5} />
                </div>
              </div>
            )}
          </div>

          <div className="-mx-4 mt-2 flex items-center gap-2 border-t bg-popover px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:mx-0 sm:mt-4 sm:justify-between sm:bg-transparent sm:px-0 sm:pb-0">
            <Button type="button" variant="outline" size="xs" className="h-8 flex-1 px-2 sm:flex-none" onClick={() => setActiveStep((step) => Math.max(step - 1, 0))} disabled={activeStep === 0 || saving}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <div className="flex flex-[2] items-center justify-end gap-2 sm:flex-none">
              <Button type="button" variant="outline" size="xs" className="h-8 flex-1 px-2 sm:flex-none" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              {activeStep < steps.length - 1 ? (
                <Button type="button" size="xs" className="h-8 flex-1 px-2 sm:flex-none" onClick={goNext}>
                  Next
                  <ArrowRight className="size-4" />
                </Button>
              ) : (
                <Button type="button" size="xs" className="h-8 flex-1 px-2 sm:flex-none" disabled={saving} onClick={() => void save()}>
                  {saving && <Loader2 className="size-4 animate-spin" />}
                  {isEdit ? "Update Contact" : "Create Contact"}
                </Button>
              )}
            </div>
          </div>
        </div>
  );

  if (isMobile) {
    return (
      <Drawer
        direction="bottom"
        open={actualOpen}
        onOpenChange={setDialogOpen}
      >
        {trigger ? <DrawerTrigger asChild>{trigger}</DrawerTrigger> : null}
        <DrawerContent className="h-[90dvh] max-h-[90dvh] w-full max-w-none overflow-hidden border-x-0 bg-popover p-0">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <DrawerHeader className="shrink-0 border-b px-4 pb-2 pt-6 text-left">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <DrawerTitle className="flex items-center gap-2 text-sm">
                    <UserRoundPlus className="size-4 text-destructive" />
                    <span className="truncate">{title}</span>
                  </DrawerTitle>
                  <DrawerDescription className="sr-only">{description}</DrawerDescription>
                </div>
                <DrawerClose asChild>
                  <Button type="button" variant="ghost" size="icon-xs" className="-mr-1">
                    <X className="size-4" />
                    <span className="sr-only">Close contact form</span>
                  </Button>
                </DrawerClose>
              </div>
            </DrawerHeader>
            {formContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={actualOpen} onOpenChange={setDialogOpen}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="shrink-0 border-b px-6 py-4 pr-12">
          <DialogTitle className="flex items-center gap-2">
            <UserRoundPlus className="size-4 text-destructive" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}

export default function SalesPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
  const [tab, setTab] = useState("contacts");
  const [contacts, setContacts] = useState<SalesContact[]>([]);
  const [packages, setPackages] = useState<SalesPackage[]>([]);
  const [institutionTypes, setInstitutionTypes] = useState<InstitutionTypeOption[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [packagesLoading, setPackagesLoading] = useState(true);
  const [contactSearch, setContactSearch] = useState("");
  const [packageSearch, setPackageSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [contactPageCount, setContactPageCount] = useState(-1);
  const [packagePageCount, setPackagePageCount] = useState(-1);
  const [contactPagination, setContactPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [packagePagination, setPackagePagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [viewingContact, setViewingContact] = useState<SalesContact | null>(null);
  const [contactDetailLoading, setContactDetailLoading] = useState(false);
  const [stageFormOpen, setStageFormOpen] = useState(false);
  const [stageForm, setStageForm] = useState<StageUpdateForm>(() => buildStageUpdateForm());
  const [stageErrors, setStageErrors] = useState<Record<string, string>>({});
  const [savingStage, setSavingStage] = useState(false);
  const [viewingPackage, setViewingPackage] = useState<SalesPackage | null>(null);
  const [editingContact, setEditingContact] = useState<SalesContact | null>(null);
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [packageForm, setPackageForm] = useState<PackageForm>(blankPackageForm);
  const [packageErrors, setPackageErrors] = useState<PackageFormErrors>({});
  const [savingPackage, setSavingPackage] = useState(false);
  const [bulkDeleteContacts, setBulkDeleteContacts] = useState<SalesContact[]>([]);
  const [bulkDeletePackages, setBulkDeletePackages] = useState<SalesPackage[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const contactResetSelectionRef = useRef<(() => void) | null>(null);
  const packageResetSelectionRef = useRef<(() => void) | null>(null);
  const institutionTypeOptions = useMemo<MultiSelectOption[]>(
    () => institutionTypes.map((type) => ({ label: type.name, value: type.name })),
    [institutionTypes]
  );

  const loadContacts = useCallback(async () => {
    if (!accessToken) return;
    setContactsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(contactPagination.pageIndex + 1),
        limit: String(contactPagination.pageSize),
        search: contactSearch.trim(),
      });
      if (stageFilter !== "all") params.set("salesStage", stageFilter);
      params.set("resource", "contacts");
      const res = await fetch(`/api/admin/analytics/sales?${params}`, { headers: authHeader });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load sales contacts");
      setContacts(json.data ?? []);
      setContactPageCount(json.pageCount ?? -1);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setContactsLoading(false);
    }
  }, [accessToken, authHeader, contactPagination.pageIndex, contactPagination.pageSize, contactSearch, stageFilter]);

  const loadPackages = useCallback(async () => {
    if (!accessToken) return;
    setPackagesLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(packagePagination.pageIndex + 1),
        limit: String(packagePagination.pageSize),
        search: packageSearch.trim(),
      });
      params.set("resource", "packages");
      const res = await fetch(`/api/admin/analytics/sales?${params}`, { headers: authHeader });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load sales packages");
      setPackages(json.data ?? []);
      setPackagePageCount(json.pageCount ?? -1);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPackagesLoading(false);
    }
  }, [accessToken, authHeader, packagePagination.pageIndex, packagePagination.pageSize, packageSearch]);

  const loadInstitutionTypes = useCallback(async () => {
    try {
      const response = await fetch("/api/institution-types?page=1&limit=100");
      const json = await response.json();
      if (!response.ok) throw new Error(json.error ?? "Failed to load institution types");
      setInstitutionTypes(json.data ?? []);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }, []);

  const loadContactDetail = useCallback(async (contact: SalesContact | number) => {
    if (!accessToken) return;
    const id = typeof contact === "number" ? contact : contact.id;
    if (typeof contact !== "number") {
      setViewingContact(contact);
      setStageForm(buildStageUpdateForm(contact));
      setStageErrors({});
      setStageFormOpen(false);
    }
    setContactDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/analytics/sales?resource=contacts&id=${id}`, { headers: authHeader });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load contact details");
      setViewingContact(json.data);
      setStageForm(buildStageUpdateForm(json.data));
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setContactDetailLoading(false);
    }
  }, [accessToken, authHeader]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void loadContacts(), 0);
    return () => window.clearTimeout(timeout);
  }, [isReady, loadContacts]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void loadPackages(), 0);
    return () => window.clearTimeout(timeout);
  }, [isReady, loadPackages]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void loadInstitutionTypes(), 0);
    return () => window.clearTimeout(timeout);
  }, [isReady, loadInstitutionTypes]);

  function updateStageForm<Key extends keyof StageUpdateForm>(key: Key, value: StageUpdateForm[Key]) {
    setStageErrors((current) => ({ ...current, [String(key)]: "" }));
    setStageForm((current) => {
      if (key === "sales_stage") {
        const salesStage = String(value);
        return {
          ...current,
          sales_stage: salesStage,
          pipeline_stage: salesStage,
          next_follow_up_date: requiresFollowUpDate(salesStage) ? current.next_follow_up_date : null,
        };
      }
      return { ...current, [key]: value };
    });
  }

  function validateStageForm() {
    const errors: Record<string, string> = {};
    if (!stageForm.sales_stage) errors.sales_stage = "Select a status";
    if (requiresFollowUpDate(stageForm.sales_stage) && !stageForm.next_follow_up_date) {
      errors.next_follow_up_date = "Select next follow-up date";
    }
    if (!stageForm.assigned_to) errors.assigned_to = "Select an assigned platform admin";
    setStageErrors(errors);
    return errors;
  }

  async function saveStageUpdate() {
    if (!accessToken || !viewingContact) return;
    const errors = validateStageForm();
    if (Object.keys(errors).length) {
      toast.error(errors.sales_stage ?? errors.next_follow_up_date ?? errors.assigned_to ?? "Complete the status update");
      return;
    }
    setSavingStage(true);
    try {
      const res = await fetch(`/api/admin/analytics/sales?resource=contacts&id=${viewingContact.id}&action=stage`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          sales_stage: stageForm.sales_stage,
          pipeline_stage: stageForm.sales_stage,
          next_follow_up_date: requiresFollowUpDate(stageForm.sales_stage) ? stageForm.next_follow_up_date : null,
          assigned_to: stageForm.assigned_to,
          assigned_package_id: stageForm.assigned_package_id,
          remarks: stageForm.remarks?.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to update status");
      setViewingContact(json.data);
      setStageForm(buildStageUpdateForm(json.data));
      setStageFormOpen(false);
      toast.success("Status updated");
      await loadContacts();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingStage(false);
    }
  }

  function validatePackageForm() {
    const errors: PackageFormErrors = {};
    const price = Number(packageForm.price);
    const storageLimit = packageForm.storage_limit_gb.trim() ? Number(packageForm.storage_limit_gb) : null;
    const validityCount = Number(packageForm.validity_count);

    if (!packageForm.name.trim()) errors.name = "Package name is required";
    if (packageForm.package_for_types.length === 0) errors.package_for = "Select at least one institution type";
    if (!packageForm.price.trim()) {
      errors.price = "Price is required";
    } else if (!Number.isFinite(price) || price <= 0) {
      errors.price = "Enter a price greater than 0";
    }
    if (!packageForm.price_unit.trim()) errors.price_unit = "Select price unit";
    if (storageLimit !== null && (!Number.isFinite(storageLimit) || storageLimit < 0)) {
      errors.storage_limit_gb = "Enter a valid storage limit";
    }
    if (!Number.isInteger(validityCount) || validityCount <= 0) {
      errors.validity_count = "Enter a valid validity";
    }
    if (!packageForm.validity_unit.trim()) errors.validity_unit = "Select validity unit";
    if (!packageForm.description.trim()) errors.description = "Package details are required";

    setPackageErrors(errors);
    return errors;
  }

  async function savePackage() {
    if (!accessToken) return;
    const errors = validatePackageForm();
    if (Object.keys(errors).length) {
      toast.error(firstPackageError(errors));
      return;
    }
    setSavingPackage(true);
    try {
      const res = await fetch(
        packageForm.id ? `/api/admin/analytics/sales?resource=packages&id=${packageForm.id}` : "/api/admin/analytics/sales?resource=packages",
        {
          method: packageForm.id ? "PATCH" : "POST",
          headers: { ...authHeader, "Content-Type": "application/json" },
          body: JSON.stringify({
            name: packageForm.name.trim(),
            package_for: packageForm.package_for_types.join(", "),
            package_for_types: packageForm.package_for_types,
            price: Number(packageForm.price),
            price_unit: packageForm.price_unit,
            storage_limit_gb: packageForm.storage_limit_gb.trim() ? Number(packageForm.storage_limit_gb) : null,
            validity_count: Number(packageForm.validity_count),
            validity_unit: packageForm.validity_unit,
            description: packageForm.description.trim(),
            is_active: packageForm.is_active,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save package");
      toast.success(packageForm.id ? "Sales package updated" : "Sales package added");
      setPackageDialogOpen(false);
      setPackageForm(blankPackageForm);
      setPackageErrors({});
      await loadPackages();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingPackage(false);
    }
  }

  async function deleteContacts(targets: SalesContact[]) {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/analytics/sales?resource=contacts", {
        method: "DELETE",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ ids: targets.map((item) => item.id) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete contacts");
      toast.success(`${json.deleted ?? targets.length} contact${targets.length === 1 ? "" : "s"} deleted`);
      setBulkDeleteContacts([]);
      contactResetSelectionRef.current?.();
      await loadContacts();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBulkLoading(false);
    }
  }

  async function deletePackages(targets: SalesPackage[]) {
    setBulkLoading(true);
    try {
      const res = await fetch("/api/admin/analytics/sales?resource=packages", {
        method: "DELETE",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ ids: targets.map((item) => item.id) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete packages");
      toast.success(`${json.deleted ?? targets.length} package${targets.length === 1 ? "" : "s"} deleted`);
      setBulkDeletePackages([]);
      packageResetSelectionRef.current?.();
      await loadPackages();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBulkLoading(false);
    }
  }

  const contactColumns = useMemo<ColumnDef<SalesContact>[]>(() => [
    {
      id: "select",
      header: ({ table }) => <Checkbox checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false} onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))} />,
      cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(Boolean(value))} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "full_name",
      header: "Contact",
      cell: ({ row }) => (
        <div className="min-w-56">
          <p className="font-medium">{row.original.full_name}</p>
          <p className="truncate text-sm text-muted-foreground">{row.original.emails?.[0] ?? row.original.phones?.[0]?.number ?? "-"}</p>
        </div>
      ),
    },
    {
      accessorKey: "business_name",
      header: "Business",
      cell: ({ row }) => row.original.business_name || "-",
    },
    {
      accessorKey: "sales_stage",
      header: "Status",
      cell: ({ row }) => <span className="whitespace-nowrap">{optionLabel(salesStages, row.original.sales_stage || row.original.pipeline_stage)}</span>,
    },
    {
      accessorKey: "assigned_to_name",
      header: "Assigned To",
      cell: ({ row }) => row.original.assigned_to_name || "Not assigned",
    },
    {
      accessorKey: "next_follow_up_date",
      header: "Next Follow-up",
      cell: ({ row }) => (
        <span className={cn(
          "whitespace-nowrap",
          row.original.next_follow_up_date ? "font-medium" : "text-muted-foreground",
        )}>
          {formatDateOnly(row.original.next_follow_up_date)}
        </span>
      ),
    },
    {
      accessorKey: "updated_at",
      header: "Last Update",
      cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.original.updated_at)}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => void loadContactDetail(row.original)}><Eye className="size-4" /> View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditingContact(row.original)}><Edit2 className="size-4" /> Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setBulkDeleteContacts([row.original])}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ], [loadContactDetail]);

  const packageColumns = useMemo<ColumnDef<SalesPackage>[]>(() => [
    {
      id: "select",
      header: ({ table }) => <Checkbox checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false} onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))} />,
      cell: ({ row }) => <Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(Boolean(value))} />,
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Package",
      cell: ({ row }) => (
        <div className="min-w-56">
          <p className="font-medium">{row.original.name}</p>
          <p className="text-sm text-muted-foreground">{packageTargetLabel(row.original)}</p>
        </div>
      ),
    },
    {
      accessorKey: "price",
      header: "Price",
      cell: ({ row }) => <span>{currency(row.original.price)} / {optionLabel(priceUnits, row.original.price_unit).toLowerCase()}</span>,
    },
    {
      accessorKey: "storage_limit_gb",
      header: "Storage",
      cell: ({ row }) => storageLabel(row.original.storage_limit_gb),
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => <Badge variant="outline" className={row.original.is_active ? "text-green-600" : "text-muted-foreground"}>{row.original.is_active ? "Active" : "Disabled"}</Badge>,
    },
    {
      accessorKey: "updated_at",
      header: "Last Update",
      cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{formatDate(row.original.updated_at)}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => setViewingPackage(row.original)}><Eye className="size-4" /> View</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { setPackageForm(buildPackageForm(row.original)); setPackageDialogOpen(true); }}><Edit2 className="size-4" /> Edit</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setBulkDeletePackages([row.original])}><Trash2 className="size-4" /> Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      enableSorting: false,
      enableHiding: false,
    },
  ], []);

  const stageAssigneeLabel = viewingContact?.assigned_to === stageForm.assigned_to
    ? viewingContact?.assigned_to_name ?? viewingContact?.assigned_to_email ?? ""
    : "";

  if (!isReady) {
    return <div className="space-y-4"><Skeleton className="h-9 w-56" /><Skeleton className="h-4 w-96" /><Skeleton className="h-[420px] w-full rounded-md" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight">Sales</h1>
          <p className="text-muted-foreground">Manage platform sales contacts, packages, and status progress.</p>
        </div>
        {tab === "contacts" ? (
          <ContactDialog
            accessToken={accessToken}
            packages={packages}
            onSaved={() => void loadContacts()}
            trigger={<Button className="w-full sm:w-auto"><Plus className="size-4" /> Add Contact</Button>}
          />
        ) : (
          <Button className="w-full sm:w-auto" onClick={() => { setPackageForm(blankPackageForm); setPackageDialogOpen(true); }}><Plus className="size-4" /> Add Package</Button>
        )}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList variant="line">
          <TabsTrigger value="contacts">Manage Sales</TabsTrigger>
          <TabsTrigger value="packages">Sales Packages</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "contacts" ? (
        <DataTable
          columns={contactColumns}
          data={contacts}
          loading={contactsLoading}
          manualPagination
          pageCount={contactPageCount}
          pagination={contactPagination}
          onPaginationChange={setContactPagination}
          onRowClick={(row) => void loadContactDetail(row)}
          getRowId={(row) => String(row.id)}
          hideMobileColumnsButton
          toolbarLeft={({ columnsButton }) => <>
            <Input value={contactSearch} onChange={(event) => { setContactSearch(event.target.value); setContactPagination((current) => ({ ...current, pageIndex: 0 })); }} placeholder="Search contacts..." className="w-full sm:w-80" />
            <div className="grid w-full grid-cols-2 gap-2 sm:block sm:w-52">
              <Select value={stageFilter} onValueChange={(value) => { setStageFilter(value); setContactPagination((current) => ({ ...current, pageIndex: 0 })); }}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {salesStages.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="sm:hidden">
                {columnsButton("w-full")}
              </div>
            </div>
          </>}
          toolbarRight={<Button variant="ghost" size="icon" onClick={() => void loadContacts()} disabled={contactsLoading}><RefreshCw className={cn("size-4", contactsLoading && "animate-spin")} /></Button>}
          selectedActions={(rows, resetSelection) => (
            <Button variant="destructive" disabled={bulkLoading} onClick={() => { contactResetSelectionRef.current = resetSelection; setBulkDeleteContacts(rows); }}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          )}
        />
      ) : (
        <DataTable
          columns={packageColumns}
          data={packages}
          loading={packagesLoading}
          manualPagination
          pageCount={packagePageCount}
          pagination={packagePagination}
          onPaginationChange={setPackagePagination}
          onRowClick={(row) => setViewingPackage(row)}
          getRowId={(row) => String(row.id)}
          toolbarLeft={<Input value={packageSearch} onChange={(event) => { setPackageSearch(event.target.value); setPackagePagination((current) => ({ ...current, pageIndex: 0 })); }} placeholder="Search packages..." className="w-full sm:w-80" />}
          toolbarRight={<Button variant="ghost" size="icon" onClick={() => void loadPackages()} disabled={packagesLoading}><RefreshCw className={cn("size-4", packagesLoading && "animate-spin")} /></Button>}
          selectedActions={(rows, resetSelection) => (
            <Button variant="destructive" disabled={bulkLoading} onClick={() => { packageResetSelectionRef.current = resetSelection; setBulkDeletePackages(rows); }}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          )}
        />
      )}

      <ContactDialog
        accessToken={accessToken}
        packages={packages}
        contact={editingContact}
        open={Boolean(editingContact)}
        onOpenChange={(open) => !open && setEditingContact(null)}
        onSaved={() => void loadContacts()}
      />

      <Dialog open={packageDialogOpen} onOpenChange={(open) => {
        if (!open && !savingPackage) {
          setPackageForm(blankPackageForm);
          setPackageErrors({});
        }
        setPackageDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Package className="size-5 text-destructive" /> {packageForm.id ? "Edit Package" : "Add Package"}</DialogTitle>
            <DialogDescription>Define package name, target, pricing, and details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Package Name *</Label>
              <Input
                value={packageForm.name}
                onChange={(event) => {
                  setPackageForm((current) => ({ ...current, name: event.target.value }));
                  setPackageErrors((current) => ({ ...current, name: undefined }));
                }}
                placeholder="Premium Sales Package"
                className={cn(packageErrors.name && "border-destructive focus-visible:ring-destructive")}
              />
              {packageErrors.name && <p className="text-xs font-medium text-destructive">{packageErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label>Package For *</Label>
              <div className={cn(packageErrors.package_for && "[&>button]:border-destructive [&>button]:focus-visible:ring-destructive")}>
                <MultiSelect
                  options={institutionTypeOptions}
                  value={packageForm.package_for_types}
                  onValueChange={(values) => {
                    setPackageForm((current) => ({
                      ...current,
                      package_for_types: values,
                      package_for: values.join(", "),
                    }));
                    setPackageErrors((current) => ({ ...current, package_for: undefined }));
                  }}
                  placeholder="Select institution types"
                  emptyIndicator={<p className="text-sm text-muted-foreground">No institution types found.</p>}
                  maxCount={3}
                />
              </div>
              {packageErrors.package_for && <p className="text-xs font-medium text-destructive">{packageErrors.package_for}</p>}
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <div className="space-y-2">
                <Label>Price *</Label>
                <Input
                  value={packageForm.price}
                  onChange={(event) => {
                    setPackageForm((current) => ({ ...current, price: event.target.value }));
                    setPackageErrors((current) => ({ ...current, price: undefined }));
                  }}
                  type="number"
                  min="0"
                  placeholder="25000"
                  className={cn(packageErrors.price && "border-destructive focus-visible:ring-destructive")}
                />
                {packageErrors.price && <p className="text-xs font-medium text-destructive">{packageErrors.price}</p>}
              </div>
              <div className="space-y-2">
                <Label>Unit *</Label>
                <Select
                  value={packageForm.price_unit}
                  onValueChange={(value) => {
                    setPackageForm((current) => ({ ...current, price_unit: value }));
                    setPackageErrors((current) => ({ ...current, price_unit: undefined }));
                  }}
                >
                  <SelectTrigger className={cn(packageErrors.price_unit && "border-destructive focus:ring-destructive")}><SelectValue /></SelectTrigger>
                  <SelectContent>{priceUnits.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
                {packageErrors.price_unit && <p className="text-xs font-medium text-destructive">{packageErrors.price_unit}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Storage (GB)</Label>
              <Input
                value={packageForm.storage_limit_gb}
                onChange={(event) => {
                  setPackageForm((current) => ({ ...current, storage_limit_gb: event.target.value }));
                  setPackageErrors((current) => ({ ...current, storage_limit_gb: undefined }));
                }}
                type="number"
                min="0"
                placeholder="50"
                className={cn(packageErrors.storage_limit_gb && "border-destructive focus-visible:ring-destructive")}
              />
              {packageErrors.storage_limit_gb && <p className="text-xs font-medium text-destructive">{packageErrors.storage_limit_gb}</p>}
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-2">
              <div className="space-y-2">
                <Label>Validity *</Label>
                <Input
                  value={packageForm.validity_count}
                  onChange={(event) => {
                    setPackageForm((current) => ({ ...current, validity_count: event.target.value }));
                    setPackageErrors((current) => ({ ...current, validity_count: undefined }));
                  }}
                  type="number"
                  min="1"
                  placeholder="1"
                  className={cn(packageErrors.validity_count && "border-destructive focus-visible:ring-destructive")}
                />
                {packageErrors.validity_count && <p className="text-xs font-medium text-destructive">{packageErrors.validity_count}</p>}
              </div>
              <div className="space-y-2">
                <Label>Period *</Label>
                <Select
                  value={packageForm.validity_unit}
                  onValueChange={(value) => {
                    setPackageForm((current) => ({ ...current, validity_unit: value }));
                    setPackageErrors((current) => ({ ...current, validity_unit: undefined }));
                  }}
                >
                  <SelectTrigger className={cn(packageErrors.validity_unit && "border-destructive focus:ring-destructive")}><SelectValue /></SelectTrigger>
                  <SelectContent>{validityUnits.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
                {packageErrors.validity_unit && <p className="text-xs font-medium text-destructive">{packageErrors.validity_unit}</p>}
              </div>
            </div>
            <label className="flex items-center gap-3 rounded-md border p-3 sm:col-span-2">
              <Checkbox checked={packageForm.is_active} onCheckedChange={(checked) => setPackageForm((current) => ({ ...current, is_active: Boolean(checked) }))} />
              <span className="font-medium">Package active</span>
            </label>
            <div className="space-y-2 sm:col-span-2">
              <Label>Details *</Label>
              <Textarea
                value={packageForm.description}
                onChange={(event) => {
                  setPackageForm((current) => ({ ...current, description: event.target.value }));
                  setPackageErrors((current) => ({ ...current, description: undefined }));
                }}
                placeholder="Package details and included services"
                rows={5}
                className={cn(packageErrors.description && "border-destructive focus-visible:ring-destructive")}
              />
              {packageErrors.description && <p className="text-xs font-medium text-destructive">{packageErrors.description}</p>}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPackageDialogOpen(false)} disabled={savingPackage}>Cancel</Button>
            <Button onClick={() => void savePackage()} disabled={savingPackage}>{savingPackage && <Loader2 className="size-4 animate-spin" />} Save Package</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ResponsiveDetailSurface
        open={Boolean(viewingContact)}
        onOpenChange={(open) => {
          if (!open) {
            setViewingContact(null);
            setStageFormOpen(false);
            setStageErrors({});
          }
        }}
        title={viewingContact ? (
          <span className="flex min-w-0 items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-primary/30 bg-primary/10 text-primary">
              <UserRound className="size-4" />
            </span>
            <span className="truncate">{viewingContact.full_name}</span>
          </span>
        ) : "Sales Contact"}
        description="Sales contact details and audit trail"
      >
        {viewingContact && (
          <div className="space-y-5 px-4 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {contactDetailLoading ? <Loader2 className="size-4 animate-spin" /> : <History className="size-4" />}
                <span>{contactDetailLoading ? "Loading latest audit..." : `${viewingContact.history?.length ?? 0} history record${(viewingContact.history?.length ?? 0) === 1 ? "" : "s"}`}</span>
              </div>
              <Button
                type="button"
                variant={stageFormOpen ? "outline" : "default"}
                onClick={() => {
                  setStageForm(buildStageUpdateForm(viewingContact));
                  setStageErrors({});
                  setStageFormOpen((current) => !current);
                }}
              >
                <BadgeDollarSign className="size-4" />
                Update Status
              </Button>
            </div>

            {stageFormOpen && (
              <section className="rounded-md border p-4">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold uppercase text-muted-foreground">Update Status</h3>
                    <p className="mt-1 text-sm text-muted-foreground">This update will be saved in the audit history.</p>
                  </div>
                </div>
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Status *</Label>
                      <Select value={stageForm.sales_stage} onValueChange={(value) => updateStageForm("sales_stage", value)}>
                        <SelectTrigger className={cn("w-full", stageErrors.sales_stage && "border-destructive ring-1 ring-destructive/30")}><SelectValue /></SelectTrigger>
                        <SelectContent>{salesStages.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                      </Select>
                      {stageErrors.sales_stage && <p className="text-xs font-medium text-destructive">{stageErrors.sales_stage}</p>}
                    </div>
                    {requiresFollowUpDate(stageForm.sales_stage) && (
                      <div className="space-y-2">
                        <Label>Next Follow-up Date *</Label>
                        <DatePicker
                          value={stageForm.next_follow_up_date ?? ""}
                          onChange={(value) => updateStageForm("next_follow_up_date", value || null)}
                          placeholder="Select follow-up date"
                          className={stageErrors.next_follow_up_date ? "border-destructive ring-1 ring-destructive/30" : undefined}
                        />
                        {stageErrors.next_follow_up_date && <p className="text-xs font-medium text-destructive">{stageErrors.next_follow_up_date}</p>}
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Assigned To *</Label>
                      <div className={stageErrors.assigned_to ? "rounded-md border border-destructive ring-1 ring-destructive/30" : undefined}>
                        <AsyncSearchPopover<UserOption>
                          value={stageForm.assigned_to ? String(stageForm.assigned_to) : ""}
                          selectedLabel={stageAssigneeLabel}
                          onChange={(value) => updateStageForm("assigned_to", value ? Number(value) : null)}
                          placeholder="Select platform admin"
                          searchPlaceholder="Search platform admins..."
                          showDefaultOption
                          defaultOptionLabel="Not assigned"
                          fetcher={async (search, page) => {
                            if (!accessToken) return { data: [], hasMore: false };
                            const params = new URLSearchParams({ page: String(page), limit: "15", roleCode: "platform_admin", includeCurrentUser: "true" });
                            if (search) params.set("search", search);
                            const res = await fetch(`/api/admin/users?${params}`, { headers: { Authorization: `Bearer ${accessToken}` } });
                            const json = await res.json();
                            return { data: json.data ?? [], hasMore: page < (json.pageCount ?? page) };
                          }}
                          getValue={(item) => String(item.id)}
                          getLabel={(item) => item.full_name || item.email}
                          renderItem={(item) => (
                            <div className="min-w-0">
                              <p className="truncate font-medium">{item.full_name || item.email}</p>
                              <p className="truncate text-xs text-muted-foreground">{item.email}</p>
                            </div>
                          )}
                        />
                      </div>
                      {stageErrors.assigned_to && <p className="text-xs font-medium text-destructive">{stageErrors.assigned_to}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label>Assigned Package <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                      <Select value={stageForm.assigned_package_id ? String(stageForm.assigned_package_id) : "none"} onValueChange={(value) => updateStageForm("assigned_package_id", value === "none" ? null : Number(value))}>
                        <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Not Assigned</SelectItem>
                          {packages.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Note or Remarks <span className="text-xs font-normal text-muted-foreground">(optional)</span></Label>
                    <Textarea value={stageForm.remarks ?? ""} onChange={(event) => updateStageForm("remarks", event.target.value)} placeholder="Add sales notes, follow-up plan, or context" rows={4} />
                  </div>
                  <div className="flex justify-end gap-2 border-t pt-3">
                    <Button type="button" variant="outline" onClick={() => setStageFormOpen(false)} disabled={savingStage}>Cancel</Button>
                    <Button type="button" onClick={() => void saveStageUpdate()} disabled={savingStage}>{savingStage && <Loader2 className="size-4 animate-spin" />} Save Status</Button>
                  </div>
                </div>
              </section>
            )}

            <DetailBlock title="Contact">
              <DetailRow label="Type" value={optionLabel(contactTypes, viewingContact.contact_type)} />
              <DetailRow label="Emails" value={<EmailContactLinks emails={viewingContact.emails ?? []} />} />
              <DetailRow label="Phones" value={<PhoneContactLinks phones={viewingContact.phones ?? []} />} />
              <DetailRow label="Website" value={viewingContact.website || "-"} />
            </DetailBlock>
            <DetailBlock title="Business">
              <DetailRow label="Name" value={viewingContact.business_name || "-"} />
              <DetailRow label="Active" value={viewingContact.business_is_active ? "Yes" : "No"} />
              <DetailRow label="Designation" value={viewingContact.designation || "-"} />
              <DetailRow label="Address" value={viewingContact.address || "-"} />
            </DetailBlock>
            <DetailBlock title="Sales">
              <CurrentStageHighlight contact={viewingContact} />
              <DetailRow label="Lead Source" value={optionLabel(leadSources, viewingContact.lead_source)} />
              <DetailRow
                label="Status"
                value={(
                  <span className="inline-flex rounded-md border border-primary/35 bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary">
                    {optionLabel(salesStages, viewingContact.sales_stage || viewingContact.pipeline_stage)}
                  </span>
                )}
              />
              <DetailRow label="Assigned To" value={viewingContact.assigned_to_name || "Not assigned"} />
              <DetailRow label="Package" value={viewingContact.package_name || "Not assigned"} />
              <DetailRow label="Next Follow-up" value={formatDateOnly(viewingContact.next_follow_up_date)} />
              <DetailRow label="Remarks" value={viewingContact.remarks || "-"} />
            </DetailBlock>
            <DetailBlock title="Audit">
              <DetailRow label="Created" value={`${formatDate(viewingContact.created_at)} by ${viewingContact.created_by_name || "System"}`} />
              <DetailRow label="Updated" value={`${formatDate(viewingContact.updated_at)} by ${viewingContact.updated_by_name || "System"}`} />
            </DetailBlock>
            <SalesHistoryTimeline history={viewingContact.history ?? []} loading={contactDetailLoading} />
          </div>
        )}
      </ResponsiveDetailSurface>

      <ResponsiveDetailSurface
        open={Boolean(viewingPackage)}
        onOpenChange={(open) => !open && setViewingPackage(null)}
        title={viewingPackage?.name ?? "Sales Package"}
        description="Sales package details"
      >
        {viewingPackage && (
          <div className="space-y-5 px-4 sm:px-6">
            <DetailBlock title="Package">
              <DetailRow label="Package For" value={packageTargetLabel(viewingPackage)} />
              <DetailRow label="Price" value={`${currency(viewingPackage.price)} / ${optionLabel(priceUnits, viewingPackage.price_unit).toLowerCase()}`} />
              <DetailRow label="Storage" value={storageLabel(viewingPackage.storage_limit_gb)} />
              <DetailRow label="Validity" value={packageValidityLabel(viewingPackage)} />
              <DetailRow label="Status" value={viewingPackage.is_active ? "Active" : "Disabled"} />
              <DetailRow label="Details" value={viewingPackage.description || "-"} />
            </DetailBlock>
            <DetailBlock title="Audit">
              <DetailRow label="Created" value={`${formatDate(viewingPackage.created_at)} by ${viewingPackage.created_by_name || "System"}`} />
              <DetailRow label="Updated" value={`${formatDate(viewingPackage.updated_at)} by ${viewingPackage.updated_by_name || "System"}`} />
            </DetailBlock>
          </div>
        )}
      </ResponsiveDetailSurface>

      <AlertDialog open={bulkDeleteContacts.length > 0} onOpenChange={(open) => !open && setBulkDeleteContacts([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected contacts?</AlertDialogTitle>
            <AlertDialogDescription>Delete {bulkDeleteContacts.length} selected sales contact{bulkDeleteContacts.length === 1 ? "" : "s"}? This is a soft delete and keeps audit history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={bulkLoading} onClick={(event) => { event.preventDefault(); void deleteContacts(bulkDeleteContacts); }}>{bulkLoading && <Loader2 className="size-4 animate-spin" />} Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeletePackages.length > 0} onOpenChange={(open) => !open && setBulkDeletePackages([])}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete selected packages?</AlertDialogTitle>
            <AlertDialogDescription>Delete {bulkDeletePackages.length} selected package{bulkDeletePackages.length === 1 ? "" : "s"}? Existing contact assignments keep their history.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={bulkLoading} onClick={(event) => { event.preventDefault(); void deletePackages(bulkDeletePackages); }}>{bulkLoading && <Loader2 className="size-4 animate-spin" />} Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function DetailBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border p-4">
      <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">{title}</h3>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function CurrentStageHighlight({ contact }: { contact: SalesContact }) {
  const status = normalizeSalesStatus(contact.sales_stage || contact.pipeline_stage) ?? "lead";
  const activeIndex = Math.max(0, salesStages.findIndex((stage) => stage.value === status));

  return (
    <div className="rounded-md border border-primary/25 bg-primary/10 p-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-primary">Current Status</p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {optionLabel(salesStages, status)}
          </p>
        </div>
        <Badge className="bg-primary text-primary-foreground">
          Priority {activeIndex + 1} of {salesStages.length}
        </Badge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
        {salesStages.map((stage, index) => {
          const isActive = index === activeIndex;
          const isDone = index < activeIndex;

          return (
            <div key={stage.value} className="min-w-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={stage.label}
                    className={cn(
                      "h-2 w-full rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive && "border-primary bg-primary ring-2 ring-primary/20",
                      isDone && "border-emerald-500/50 bg-emerald-500",
                      !isActive && !isDone && "border-border bg-muted",
                    )}
                  />
                </TooltipTrigger>
                <TooltipContent side="top">{stage.label}</TooltipContent>
              </Tooltip>
              <p className={cn(
                "mt-1 truncate text-[10px]",
                isActive ? "font-semibold text-primary" : "text-muted-foreground",
              )}>
                {stage.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[150px_1fr]">
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="min-w-0 whitespace-pre-wrap break-words text-sm font-medium">{value}</div>
    </div>
  );
}

function EmailContactLinks({ emails }: { emails: string[] }) {
  const validEmails = emails.map((email) => email.trim()).filter(Boolean);
  if (!validEmails.length) return "-";

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {validEmails.map((email) => (
        <div key={email} className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="min-w-0 break-all">{email}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button asChild type="button" variant="outline" size="icon-xs">
                <a href={outlookComposeUrl(email)} target="_blank" rel="noreferrer">
                  <Mail className="size-3.5" />
                  <span className="sr-only">Open Outlook for {email}</span>
                </a>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Open Outlook</TooltipContent>
          </Tooltip>
        </div>
      ))}
    </div>
  );
}

function PhoneContactLinks({ phones }: { phones: PhoneEntry[] }) {
  const validPhones = phones.filter((phone) => phone.number?.trim());
  if (!validPhones.length) return "-";

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {validPhones.map((phone, index) => {
        const url = phone.is_whatsapp ? whatsappUrl(phone.number) : "";
        return (
          <div key={`${phone.number}-${index}`} className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="min-w-0 break-all">
              {phone.number}{phone.is_whatsapp ? " (WhatsApp)" : ""}
            </span>
            {url && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button asChild type="button" variant="outline" size="icon-xs">
                    <a href={url} target="_blank" rel="noreferrer">
                      <MessageCircle className="size-3.5" />
                      <span className="sr-only">Open WhatsApp for {phone.number}</span>
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open WhatsApp</TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      })}
    </div>
  );
}

function SalesHistoryTimeline({ history, loading }: { history: SalesContactHistory[]; loading?: boolean }) {
  if (loading) {
    return (
      <div className="space-y-3 rounded-md border bg-muted/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="space-y-3 pl-5">
          {[0, 1].map((item) => (
            <div key={item} className="rounded-md border bg-background/60 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-28 rounded-full" />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <Skeleton className="h-14 rounded-md" />
                <Skeleton className="h-14 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!history.length) {
    return (
      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        No detailed audit history found for this contact yet.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-xs font-semibold uppercase text-muted-foreground">History</h4>
        <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary">
          {history.length} update{history.length === 1 ? "" : "s"}
        </Badge>
      </div>
      <ol className="relative space-y-4 pl-5 before:absolute before:left-[7px] before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-primary/25">
        {history.map((item) => (
          <li key={item.id} className="relative">
            <span className={cn(
              "absolute -left-5 top-1 grid size-4 place-items-center rounded-full border shadow-sm",
              item.action === "create" ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400" : "border-primary/50 bg-primary/15 text-primary",
            )}>
              <Clock3 className="size-2.5" />
            </span>
            <div className="rounded-md border bg-background/60 p-3 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{historyActionLabel(item.action)}</p>
                  <p className="text-xs text-muted-foreground">
                    by <span className="font-medium text-foreground">{historyChangedBy(item)}</span>
                  </p>
                </div>
                <Badge variant="outline" className="border-border/70 bg-muted/50 text-xs font-normal text-muted-foreground">
                  {formatDate(item.changed_at)}
                </Badge>
              </div>
              <HistoryChangeSummary item={item} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function HistoryChangeSummary({ item }: { item: SalesContactHistory }) {
  if (item.action === "create") {
    return (
      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <HistoryChip tone="red" label="Status" value={optionLabel(salesStages, String(item.after_data?.sales_stage ?? item.after_data?.pipeline_stage ?? ""))} />
        <HistoryChip tone="amber" label="Lead Source" value={optionLabel(leadSources, String(item.after_data?.lead_source ?? ""))} />
        <HistoryChip tone="green" label="Assigned To" value={historyAssigneeLabel(item, "after")} />
      </div>
    );
  }

  const fields: Array<{ key: keyof SalesContact; label: string; before: () => string; after: () => string }> = [
    {
      key: "sales_stage",
      label: "Status",
      before: () => optionLabel(salesStages, String(item.before_data?.sales_stage ?? "")),
      after: () => optionLabel(salesStages, String(item.after_data?.sales_stage ?? "")),
    },
    {
      key: "assigned_to",
      label: "Assigned To",
      before: () => historyAssigneeLabel(item, "before"),
      after: () => historyAssigneeLabel(item, "after"),
    },
    {
      key: "assigned_package_id",
      label: "Package",
      before: () => historyPackageLabel(item, "before"),
      after: () => historyPackageLabel(item, "after"),
    },
    {
      key: "remarks",
      label: "Remarks",
      before: () => String(item.before_data?.remarks ?? "-"),
      after: () => String(item.after_data?.remarks ?? "-"),
    },
  ];

  const changes = fields
    .map((field) => {
      const before = item.before_data?.[field.key];
      const after = item.after_data?.[field.key];
      if (JSON.stringify(before ?? null) === JSON.stringify(after ?? null)) return null;
      return {
        label: field.label,
        before: field.before(),
        after: field.after(),
      };
    })
    .filter(Boolean) as Array<{ label: string; before: string; after: string }>;

  if (!changes.length) {
    return <p className="mt-3 text-xs text-muted-foreground">Contact details were updated.</p>;
  }

  return (
    <div className="mt-3 grid gap-2">
      {changes.map((change) => (
        <div key={change.label} className="rounded-md border border-border/70 bg-muted/30 p-2.5 text-xs">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="font-medium">{change.label}</p>
            <Badge variant="outline" className="border-primary/30 bg-primary/10 px-1.5 py-0 text-[10px] text-primary">Changed</Badge>
          </div>
          <p className="mt-1 text-muted-foreground">
            {change.before} <span className="text-foreground">→</span> {change.after}
          </p>
        </div>
      ))}
    </div>
  );
}

function HistoryChip({ label, value, tone = "blue" }: { label: string; value: string; tone?: "blue" | "green" | "amber" | "red" }) {
  const toneClass = {
    blue: "border-sky-500/25 bg-sky-500/10",
    green: "border-emerald-500/25 bg-emerald-500/10",
    amber: "border-amber-500/25 bg-amber-500/10",
    red: "border-destructive/25 bg-destructive/10",
  }[tone];

  return (
    <div className={cn("rounded-md border p-2", toneClass)}>
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value || "-"}</p>
    </div>
  );
}
