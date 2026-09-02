"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  BadgeDollarSign,
  BarChart3,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Copy,
  CreditCard,
  FileText,
  GraduationCap,
  IndianRupee,
  Landmark,
  ListFilter,
  Loader2,
  MoreHorizontal,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  Store,
  Tags,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import {
  DocumentFileUpload,
  type UploadedDocumentFile,
} from "@/components/shared/document-file-upload";
import { DatePicker } from "@/components/shared/date-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FinancePayerSuggestion, FinancePaymentMethodRow } from "@/lib/queries/finance";
import { DataTable } from "@/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useIsMobile } from "@/hooks/use-mobile";
import { hasPermission, isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

type IncomeCategory = {
  id: number;
  name: string;
};

type PaidToOption = {
  value: string;
  label: string;
};

type IncomeRow = {
  row_id: string;
  source_id: number;
  source_type: "manual" | "fee_payment" | "subscription";
  scope_type: "platform" | "institution";
  institution_id: number | null;
  institution_name: string | null;
  income_date: string;
  amount: string | number;
  payment_method: "cash" | "upi" | "net_banking";
  paid_by?: string | null;
  paid_by_label?: string | null;
  paid_to: string;
  paid_to_label: string;
  category_id: number | null;
  category_name: string;
  payer_name: string | null;
  reference: string | null;
  invoice_url: string | null;
  invoice_public_id: string | null;
  invoice_resource_type: string | null;
  invoice_file_name: string | null;
  description: string | null;
  created_by?: number | null;
  created_by_name?: string | null;
  created_by_role?: string | null;
  staff_id?: number | null;
  created_at: string;
};

type IncomeResponse = {
  data: IncomeRow[];
  meta: {
    total: number;
    filtered_total: string | number;
    this_month_total: string | number;
    scope: "platform" | "institution";
    institution_id: number | null;
    categories: IncomeCategory[];
    payment_methods?: FinancePaymentMethodRow[];
    payer_suggestions?: FinancePayerSuggestion[];
    paid_to_options: PaidToOption[];
    current_user_receiver?: { value: string; label: string };
  };
};

const DEFAULT_INCOME_CATEGORIES: IncomeCategory[] = [
  { id: 1, name: "Student Fee" },
  { id: 2, name: "Tuition Fee" },
  { id: 3, name: "Admission Fee" },
  { id: 4, name: "Exam Fee" },
  { id: 5, name: "Activity Fee" },
  { id: 6, name: "Donation" },
  { id: 7, name: "Hostel Fee" },
  { id: 8, name: "Transport Fee" },
  { id: 9, name: "Internet Bills" },
  { id: 10, name: "Others" },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  net_banking: "Net Banking",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  fee_payment: "Student Fee",
  subscription: "Subscription",
};

function currency(value: string | number | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeAmountInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole, ...decimalParts] = cleaned.split(".");
  if (decimalParts.length === 0) return whole;
  return `${whole}.${decimalParts.join("").slice(0, 2)}`;
}

function DetailContent({ row }: { row: IncomeRow }) {
  const details = [
    ["Date", formatDate(row.income_date)],
    ["Amount", currency(row.amount)],
    ["Source", SOURCE_LABELS[row.source_type] ?? row.source_type],
    ["Category", row.category_name],
    ["Method", PAYMENT_METHOD_LABELS[row.payment_method] ?? row.payment_method],
    ["Paid To", row.paid_to_label],
    ["Paid By", row.payer_name || row.institution_name || "-"],
    ["Reference", row.reference || "-"],
    ["Institution", row.institution_name || "-"],
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/10 p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">Income Amount</p>
        <p className="mt-2 text-2xl font-bold">{currency(row.amount)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{row.category_name} on {formatDate(row.income_date)}</p>
      </div>

      <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
        {details.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
            <p className="mt-1 break-words text-sm font-semibold">{value}</p>
          </div>
        ))}
      </div>

      {row.description ? (
        <div className="rounded-md border p-4">
          <p className="text-xs font-medium uppercase text-muted-foreground">Description</p>
          <p className="mt-2 whitespace-pre-wrap text-sm">{row.description}</p>
        </div>
      ) : null}

      {row.invoice_url ? (
        <Button asChild variant="outline" className="w-full justify-start gap-2">
          <a href={row.invoice_url} target="_blank" rel="noreferrer">
            <FileText className="size-4" />
            Open invoice attachment
          </a>
        </Button>
      ) : null}
    </div>
  );
}

export function IncomeClient() {
  const pathname = usePathname();
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitutionId, activeInstitution } = useActiveInstitution();
  const isMobile = useIsMobile();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isInstitutionAdmin = isInstitutionAdminUser(user) || (user as any)?.role === "institution_admin";
  const isPlatformSection = pathname?.startsWith("/platformadmin");
  const isPlatformScope = isPlatformSection || (!activeInstitutionId && (isPlatformAdmin || hasPermission(user, "finance.platform.income.view")));
  const targetInstitutionId = isPlatformSection ? null : (activeInstitutionId ?? (user as any)?.institution_id ?? user?.memberships?.[0]?.institution_id ?? (user as any)?.under_institution_id ?? null);
  const canCreate = isPlatformAdmin || isInstitutionAdmin || Boolean(targetInstitutionId) || (
    isPlatformScope
      ? hasPermission(user, "finance.platform.income.create") || hasPermission(user, "finance.platform.income")
      : Boolean(
          targetInstitutionId &&
            (hasPermission(user, "finance.income.create", { institutionId: targetInstitutionId }) ||
             hasPermission(user, "finance.income", { institutionId: targetInstitutionId }))
        )
  );
  const authHeader = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    [accessToken]
  );

  const [rows, setRows] = useState<IncomeRow[]>([]);
  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<FinancePaymentMethodRow[]>([]);
  const [payerSuggestions, setPayerSuggestions] = useState<FinancePayerSuggestion[]>([]);
  const [payerSuggestionsOpen, setPayerSuggestionsOpen] = useState(false);
  const [payerInputText, setPayerInputText] = useState("");
  const payerContainerRef = useRef<HTMLDivElement>(null);
  const [selectedPaymentMethodKey, setSelectedPaymentMethodKey] = useState<string>("cash");
  const [previewQrMethod, setPreviewQrMethod] = useState<FinancePaymentMethodRow | null>(null);
  const [paidToOptions, setPaidToOptions] = useState<PaidToOption[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<{ id: number; full_name: string; email: string | null; role_label: string | null }[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState<string | number>("0");
  const [thisMonthTotal, setThisMonthTotal] = useState<string | number>("0");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [source, setSource] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [selectedRow, setSelectedRow] = useState<IncomeRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<IncomeRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deletingRow, setDeletingRow] = useState<IncomeRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState("");
  const [saving, setSaving] = useState(false);
  const [payerMode, setPayerMode] = useState<"employee" | "custom">("custom");
  const [form, setForm] = useState({
    category_id: "",
    payment_method: "cash",
    income_date: todayText(),
    amount: "",
    paid_by: "",
    paid_by_label: "",
    paid_to: "",
    description: "",
  });
  const [invoiceFiles, setInvoiceFiles] = useState<UploadedDocumentFile[]>([]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (payerContainerRef.current && !payerContainerRef.current.contains(event.target as Node)) {
        setPayerSuggestionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeSelectedMethod = useMemo(() => {
    if (!selectedPaymentMethodKey.startsWith("pm_")) return null;
    const id = selectedPaymentMethodKey.replace("pm_", "");
    return paymentMethods.find((pm) => String(pm.id) === id) || null;
  }, [paymentMethods, selectedPaymentMethodKey]);

  const filteredSuggestions = useMemo(() => {
    if (!payerInputText.trim()) return payerSuggestions;
    const rawQuery = payerInputText.toLowerCase().trim();
    const queryWords = rawQuery.split(/\s+/).filter(Boolean);
    return payerSuggestions.filter((sug) => {
      const target = `${sug.name} ${sug.subtext || ""} ${sug.label}`.toLowerCase();
      return queryWords.every((word) => target.includes(word));
    });
  }, [payerInputText, payerSuggestions]);

  function handleSelectPaymentMethod(value: string) {
    setSelectedPaymentMethodKey(value);
    if (value.startsWith("pm_")) {
      const pmId = value.replace("pm_", "");
      const pm = paymentMethods.find((m) => String(m.id) === pmId);
      if (pm) {
        const isUpi = ["phonepe", "google_pay", "paytm", "bhim_upi", "other_upi"].includes(pm.method_type);
        const isBank = pm.method_type === "net_banking";
        const effectiveMethod: "cash" | "upi" | "net_banking" = isUpi ? "upi" : isBank ? "net_banking" : "cash";
        setForm((current) => ({ ...current, payment_method: effectiveMethod }));
      }
    } else {
      setForm((current) => ({ ...current, payment_method: value as "cash" | "upi" | "net_banking" }));
    }
  }

  function openAdd() {
    setEditingRow(null);
    setPayerInputText("");
    const defaultPm = paymentMethods.find((pm) => pm.is_default);
    let effectivePm: "cash" | "upi" | "net_banking" = "cash";
    if (defaultPm) {
      setSelectedPaymentMethodKey(`pm_${defaultPm.id}`);
      const isUpi = ["phonepe", "google_pay", "paytm", "bhim_upi", "other_upi"].includes(defaultPm.method_type);
      const isBank = defaultPm.method_type === "net_banking";
      effectivePm = isUpi ? "upi" : isBank ? "net_banking" : "cash";
    } else {
      setSelectedPaymentMethodKey("cash");
    }

    setIsCustomCategory(false);
    setCustomCategoryText("");
    const currentUserOption = paidToOptions.find((opt) => opt.value === String(user?.id)) || paidToOptions[0];

    setForm({
      category_id: String(categories[0]?.id ?? "1"),
      payment_method: effectivePm,
      income_date: todayText(),
      amount: "",
      paid_by: "",
      paid_by_label: "",
      paid_to: currentUserOption?.value || String(user?.id || ""),
      description: "",
    });
    setAddOpen(true);
  }

  function openEdit(row: IncomeRow) {
    setEditingRow(row);
    setPayerInputText(row.payer_name || row.paid_by_label || "");
    const hasMatchingEmployee = employeeOptions.some((emp) => String(emp.id) === row.paid_by || emp.full_name === row.payer_name);
    setPayerMode(hasMatchingEmployee ? "employee" : "custom");
    setSelectedPaymentMethodKey(row.payment_method || "cash");
    setIsCustomCategory(false);
    setCustomCategoryText("");
    setForm({
      category_id: String(row.category_id || ""),
      payment_method: row.payment_method || "cash",
      income_date: row.income_date ? row.income_date.slice(0, 10) : todayText(),
      amount: String(row.amount || ""),
      paid_by: row.paid_by || "",
      paid_by_label: row.payer_name || row.paid_by_label || "",
      paid_to: row.paid_to || "",
      description: row.description || "",
    });
    setEditOpen(true);
  }

  async function updateIncome() {
    if (!editingRow || !accessToken) return;
    if (!form.category_id) {
      toast.error("Select an income category (Payment For).");
      return;
    }
    if (!form.paid_to) {
      toast.error("Select a receiver (Paid To).");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Enter a valid income amount.");
      return;
    }
    setSaving(true);
    try {
      const paidToLabel = paidToOptions.find((opt) => opt.value === form.paid_to)?.label || form.paid_to;
      let effectivePaidBy = form.paid_by;
      let effectivePaidByLabel = form.paid_by_label;
      if (payerMode === "employee") {
        const emp = employeeOptions.find((e) => String(e.id) === form.paid_by);
        effectivePaidBy = emp ? String(emp.id) : form.paid_by;
        effectivePaidByLabel = emp ? emp.full_name : form.paid_by_label;
      }

      const res = await fetch(`/api/admin/finance/income/${editingRow.source_id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: Number(form.category_id),
          payment_method: form.payment_method,
          paid_by: effectivePaidBy,
          paid_by_label: effectivePaidByLabel,
          payer_name: effectivePaidByLabel,
          paid_to: form.paid_to,
          paid_to_label: paidToLabel,
          amount: Number(form.amount),
          income_date: form.income_date,
          description: form.description.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update income");
      toast.success("Income updated successfully");
      setEditOpen(false);
      void fetchIncome();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update income");
    } finally {
      setSaving(false);
    }
  }

  function updateFilter(updater: () => void) {
    updater();
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  async function saveIncome() {
    if (!accessToken) return;
    if (!canCreate) {
      toast.error("You do not have permission to add income.");
      return;
    }
    if (isCustomCategory) {
      if (!customCategoryText.trim()) {
        toast.error("Please enter a custom payment purpose / category.");
        return;
      }
    } else if (!form.category_id) {
      toast.error("Select a payment category (Payment For).");
      return;
    }
    let paidTo = paidToOptions.find((item) => item.value === form.paid_to);
    if (!paidTo && form.paid_to) {
      paidTo = { value: form.paid_to, label: user?.full_name || "Admin" };
    }
    if (!paidTo) {
      paidTo = paidToOptions[0] || { value: String(user?.id || "admin"), label: user?.full_name || "Admin" };
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Enter a valid income amount.");
      return;
    }

    const payerName = form.paid_by_label.trim() || payerInputText.trim();
    if (!payerName) {
      toast.error("Enter or select who paid this income (Payer name).");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/finance/income", {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          institutionId: targetInstitutionId,
          category_id: isCustomCategory ? 0 : Number(form.category_id),
          custom_category_name: isCustomCategory ? customCategoryText.trim() : null,
          payment_method: form.payment_method,
          paid_by: form.paid_by || null,
          paid_by_label: payerName,
          payer_name: payerName,
          income_date: form.income_date,
          amount: Number(form.amount),
          paid_to: paidTo.value,
          paid_to_label: paidTo.label,
          description: form.description.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add income");
      toast.success("Income and invoice receipt created successfully");
      setAddOpen(false);
      setPayerInputText("");
      setIsCustomCategory(false);
      setCustomCategoryText("");
      void fetchIncome();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add income");
    } finally {
      setSaving(false);
    }
  }

  async function deleteIncome() {
    if (!deletingRow || !accessToken) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/finance/income/${deletingRow.source_id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete income");
      toast.success("Income record deleted successfully");
      setDeleteOpen(false);
      setDeletingRow(null);
      void fetchIncome();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete income");
    } finally {
      setDeleting(false);
    }
  }

  const fetchIncome = useCallback(async () => {
    if (!isReady || !accessToken) return;
    if (!isPlatformScope && !targetInstitutionId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search,
        paymentMethod,
        source,
      });
      if (targetInstitutionId) params.set("institutionId", String(targetInstitutionId));
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const res = await fetch(`/api/admin/finance/income?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await res.json() as (IncomeResponse & { meta: { employee_options?: { id: number; full_name: string; email: string | null; role_label: string | null }[] } }) | { error?: string };
      if (!res.ok) throw new Error("error" in json ? json.error : "Failed to load income");

      const payload = json as IncomeResponse & { meta: { employee_options?: { id: number; full_name: string; email: string | null; role_label: string | null }[] } };
      setRows(payload.data);
      setTotalRows(payload.meta.total);
      setFilteredTotal(payload.meta.filtered_total);
      setThisMonthTotal(payload.meta.this_month_total);
      const incomingCategories = payload.meta.categories && payload.meta.categories.length > 0
        ? payload.meta.categories
        : DEFAULT_INCOME_CATEGORIES;
      setCategories(incomingCategories);
      if (payload.meta.payment_methods) {
        setPaymentMethods(payload.meta.payment_methods);
      }
      setPaidToOptions(payload.meta.paid_to_options);
      if (payload.meta.employee_options) {
        setEmployeeOptions(payload.meta.employee_options);
      }
      if (payload.meta.payer_suggestions) {
        setPayerSuggestions(payload.meta.payer_suggestions);
      }
      const defaultReceiverValue = payload.meta.current_user_receiver?.value || String(user?.id || "") || payload.meta.paid_to_options[0]?.value || "";
      setForm((current) => ({
        ...current,
        category_id: current.category_id || String(incomingCategories[0]?.id ?? "1"),
        paid_to: current.paid_to || defaultReceiverValue,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load income");
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    authHeader,
    fromDate,
    isPlatformScope,
    isReady,
    pagination.pageIndex,
    pagination.pageSize,
    paymentMethod,
    search,
    source,
    targetInstitutionId,
    toDate,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchIncome();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchIncome]);

  const columns = useMemo<ColumnDef<IncomeRow>[]>(() => [
    {
      accessorKey: "income_date",
      header: "Date & Time",
      cell: ({ row }) => (
        <div className="min-w-0">
          <span className="font-semibold block">{formatDate(row.original.income_date)}</span>
          <span className="text-[11px] text-muted-foreground">
            {row.original.created_at ? new Date(row.original.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true }) : ""}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "category_name",
      header: "Payment For",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{row.original.category_name}</p>
          <p className="truncate text-xs text-muted-foreground">{SOURCE_LABELS[row.original.source_type]}</p>
        </div>
      ),
    },
    {
      accessorKey: "payer_name",
      header: isPlatformScope ? "Institution" : "Paid By",
      cell: ({ row }) => row.original.payer_name || row.original.institution_name || "-",
    },
    {
      accessorKey: "payment_method",
      header: "Method",
      cell: ({ row }) => <Badge variant="outline">{PAYMENT_METHOD_LABELS[row.original.payment_method]}</Badge>,
    },
    {
      accessorKey: "paid_to_label",
      header: "Paid To",
    },
    {
      accessorKey: "created_by_name",
      header: "Recorded By",
      cell: ({ row }) => (
        <div className="min-w-0 space-y-0.5">
          <p className="font-medium text-xs truncate">{row.original.created_by_name || "Admin"}</p>
          {row.original.created_by_role && (
            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
              {row.original.created_by_role}
            </Badge>
          )}
        </div>
      ),
    },
    ...(isPlatformScope ? [{
      id: "scope_column",
      header: "Scope",
      cell: ({ row }: { row: { original: IncomeRow } }) => (
        <Badge variant={row.original.institution_name ? "secondary" : "default"} className="text-[11px]">
          {row.original.institution_name ? row.original.institution_name : "Platform Global"}
        </Badge>
      ),
    }] : []),
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => <span className="font-semibold">{currency(row.original.amount)}</span>,
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="size-4" />
              <span className="sr-only">Open actions</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedRow(row.original)}>View details</DropdownMenuItem>
            {row.original.source_type === "manual" ? (
              <>
                <DropdownMenuItem onClick={() => openEdit(row.original)}>Edit</DropdownMenuItem>
                <DropdownMenuItem className="text-rose-600 font-medium cursor-pointer" onClick={() => { setDeletingRow(row.original); setDeleteOpen(true); }}>Delete</DropdownMenuItem>
              </>
            ) : row.original.source_type === "fee_payment" ? (
              <DropdownMenuItem asChild>
                <Link href="/admin/students/fee-management">View in Fees</Link>
              </DropdownMenuItem>
            ) : null}
            {row.original.invoice_url ? (
              <DropdownMenuItem asChild>
                <a href={row.original.invoice_url} target="_blank" rel="noreferrer">Open invoice</a>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [isPlatformScope]);

  if (!isReady) return null;

  const pageCount = Math.max(1, Math.ceil(totalRows / pagination.pageSize));
  const scopeTitle = isPlatformScope ? "Platform Income" : `${activeInstitution?.name ?? "Institution"} Income`;
  const activeFilterCount = [
    paymentMethod !== "all",
    source !== "all",
    Boolean(fromDate),
    Boolean(toDate),
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <IndianRupee className="size-4 text-primary" />
            Finance income
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Income</h1>
            <p className="text-sm text-muted-foreground">
              {isPlatformScope
                ? "Track subscription income and manual platform receipts."
                : "Track student fee payments and manual institution receipts."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={fetchIncome} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
          {canCreate ? (
            <Button size="sm" onClick={openAdd} className="gap-2 cursor-pointer">
              <Plus className="size-4" />
              Add Income
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">This Month Income</p>
            <CalendarDays className="size-4 text-primary" />
          </div>
          {loading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-40" />
            </div>
          ) : (
            <>
              <p className="mt-3 text-2xl font-bold">{currency(thisMonthTotal)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{scopeTitle}</p>
            </>
          )}
        </div>
        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Filtered Income</p>
            <TrendingUp className="size-4 text-primary" />
          </div>
          {loading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
          ) : (
            <>
              <p className="mt-3 text-2xl font-bold">{currency(filteredTotal)}</p>
              <p className="mt-1 text-xs text-muted-foreground">Based on active filters</p>
            </>
          )}
        </div>
        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Income Records</p>
            <FileText className="size-4 text-primary" />
          </div>
          {loading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <>
              <p className="mt-3 text-2xl font-bold">{totalRows}</p>
              <p className="mt-1 text-xs text-muted-foreground">Server paginated</p>
            </>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        emptyText="No income records found."
        getRowId={(row) => row.row_id}
        manualPagination
        pageCount={pageCount}
        totalRows={totalRows}
        pagination={pagination}
        onPaginationChange={setPagination}
        onRowClick={(row) => setSelectedRow(row)}
        toolbarLeft={
          <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => updateFilter(() => setSearch(event.target.value))}
                placeholder="Search income..."
                className="w-full pl-8 sm:w-80"
              />
            </div>
            <Button
              type="button"
              variant={filtersOpen ? "secondary" : "outline"}
              onClick={() => setFiltersOpen((current) => !current)}
              className="w-full justify-center gap-2 sm:w-fit"
            >
              <ListFilter className="size-4" />
              Filters
              {activeFilterCount > 0 ? (
                <Badge className="h-5 rounded-full px-1.5 text-xs">{activeFilterCount}</Badge>
              ) : null}
              <ChevronDown className={cn("size-4 transition-transform", filtersOpen && "rotate-180")} />
            </Button>
          </div>
        }
        toolbarBelow={
          filtersOpen ? (
            <div className="rounded-md border bg-card p-3">
              <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="w-44 shrink-0">
                  <Label className="sr-only">Payment method</Label>
            <Select value={paymentMethod} onValueChange={(value) => updateFilter(() => setPaymentMethod(value))}>
                    <SelectTrigger className="w-full">
                <SelectValue placeholder="Payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All methods</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="net_banking">Net Banking</SelectItem>
              </SelectContent>
            </Select>
                </div>
                <div className="w-44 shrink-0">
                  <Label className="sr-only">Source</Label>
            <Select value={source} onValueChange={(value) => updateFilter(() => setSource(value))}>
                    <SelectTrigger className="w-full">
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                {isPlatformScope ? (
                  <SelectItem value="subscription">Subscription</SelectItem>
                ) : (
                  <SelectItem value="fee_payment">Student Fee</SelectItem>
                )}
              </SelectContent>
            </Select>
                </div>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(event) => updateFilter(() => setFromDate(event.target.value))}
                  className="w-44 shrink-0"
                />
                <Input
                  type="date"
                  value={toDate}
                  onChange={(event) => updateFilter(() => setToDate(event.target.value))}
                  className="w-44 shrink-0"
                />
                {activeFilterCount > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => {
                      updateFilter(() => {
                        setPaymentMethod("all");
                        setSource("all");
                        setFromDate("");
                        setToDate("");
                      });
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null
        }
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Income</DialogTitle>
            <DialogDescription>
              Add a manual income record for the active finance scope.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Payment For <span className="text-rose-500">*</span></Label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomCategory(!isCustomCategory);
                      if (!isCustomCategory) setCustomCategoryText("");
                    }}
                    className="text-xs text-primary hover:underline font-semibold cursor-pointer"
                  >
                    {isCustomCategory ? "📋 Choose standard" : "✏️ Type custom"}
                  </button>
                  <span className="text-muted-foreground">•</span>
                  <Link
                    href="/admin/finance/categories"
                    target="_blank"
                    className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1 font-medium"
                  >
                    <Tags className="size-3" />
                    Manage
                  </Link>
                </div>
              </div>

              {isCustomCategory ? (
                <div className="relative flex items-center">
                  <Input
                    value={customCategoryText}
                    onChange={(e) => setCustomCategoryText(e.target.value)}
                    placeholder="Enter custom purpose (e.g. Sports Fee, Uniform, Event)"
                    className="bg-background pr-8"
                    autoFocus
                  />
                  {customCategoryText && (
                    <button
                      type="button"
                      onClick={() => setCustomCategoryText("")}
                      className="absolute right-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ) : (
                <Select
                  value={form.category_id}
                  onValueChange={(value) => {
                    if (value === "__custom__") {
                      setIsCustomCategory(true);
                      setCustomCategoryText("");
                    } else {
                      setForm((current) => ({ ...current, category_id: value }));
                    }
                  }}
                >
                  <SelectTrigger className="w-full bg-background">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories.length > 0 ? categories : DEFAULT_INCOME_CATEGORIES).map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__" className="text-primary font-bold">
                      ✨ + Type Custom Purpose / Reason...
                    </SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Payment Method <span className="text-rose-500">*</span></Label>
                <Link
                  href="/admin/finance/payment-methods"
                  target="_blank"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <Landmark className="size-3" />
                  Manage Accounts
                </Link>
              </div>
              <Select
                value={selectedPaymentMethodKey}
                onValueChange={handleSelectPaymentMethod}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">💵 Cash Collection</SelectItem>
                  <SelectItem value="upi">⚡ UPI (Direct / Cashier)</SelectItem>
                  <SelectItem value="net_banking">🏦 Net Banking (Direct Transfer)</SelectItem>
                  {paymentMethods.length > 0 && (
                    <>
                      <div className="px-2 py-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Configured Accounts &amp; UPI
                      </div>
                      {paymentMethods.map((pm) => (
                        <SelectItem key={pm.id} value={`pm_${pm.id}`}>
                          {pm.method_type === "net_banking" && `🏦 ${pm.bank_name || pm.title} (${pm.account_number ? `..${pm.account_number.slice(-4)}` : "A/C"})`}
                          {pm.method_type === "phonepe" && `🟣 PhonePe (${pm.upi_id || pm.title})`}
                          {pm.method_type === "google_pay" && `🔵 Google Pay (${pm.upi_id || pm.title})`}
                          {pm.method_type === "paytm" && `🔷 Paytm (${pm.upi_id || pm.title})`}
                          {pm.method_type === "bhim_upi" && `🟢 BHIM UPI (${pm.upi_id || pm.title})`}
                          {pm.method_type === "other_upi" && `⚡ ${pm.title} (${pm.upi_id || ""})`}
                          {!["net_banking", "phonepe", "google_pay", "paytm", "bhim_upi", "other_upi"].includes(pm.method_type) && pm.title}
                        </SelectItem>
                      ))}
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* PREVIEW CARD FOR SELECTED BANK/UPI */}
            {activeSelectedMethod && activeSelectedMethod.method_type === "net_banking" && (
              <div className="sm:col-span-2 rounded-lg border bg-blue-500/5 p-3 text-xs space-y-1.5 border-blue-500/20">
                <div className="flex items-center justify-between font-semibold text-blue-700 dark:text-blue-400">
                  <span className="flex items-center gap-1.5"><Landmark className="size-3.5" /> {activeSelectedMethod.bank_name || activeSelectedMethod.title}</span>
                  <span className="text-[11px]">{activeSelectedMethod.account_type || "Bank Account"}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-muted-foreground pt-1">
                  <div>Holder: <span className="font-medium text-foreground">{activeSelectedMethod.account_holder_name || "-"}</span></div>
                  <div className="flex items-center gap-1">A/C: <span className="font-mono font-bold text-foreground">{activeSelectedMethod.account_number || "-"}</span></div>
                  <div className="flex items-center gap-1">IFSC: <span className="font-mono font-bold text-foreground">{activeSelectedMethod.ifsc_code || "-"}</span></div>
                  <div>Branch: <span className="font-medium text-foreground">{activeSelectedMethod.branch_name || "-"}</span></div>
                </div>
              </div>
            )}

            {activeSelectedMethod && ["phonepe", "google_pay", "paytm", "bhim_upi", "other_upi"].includes(activeSelectedMethod.method_type) && (
              <div className="sm:col-span-2 rounded-lg border bg-purple-500/5 p-3 text-xs flex items-center justify-between gap-3 border-purple-500/20">
                <div className="space-y-1">
                  <p className="font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                    <Smartphone className="size-3.5" />
                    {activeSelectedMethod.title}
                  </p>
                  <p className="text-muted-foreground font-mono font-bold text-xs text-foreground">
                    UPI ID: {activeSelectedMethod.upi_id || "-"}
                  </p>
                  {activeSelectedMethod.merchant_name && (
                    <p className="text-[11px] text-muted-foreground">Payee: {activeSelectedMethod.merchant_name}</p>
                  )}
                </div>
                {activeSelectedMethod.qr_code_url && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewQrMethod(activeSelectedMethod)}
                    className="gap-1.5 h-8 text-xs font-semibold cursor-pointer"
                  >
                    <QrCode className="size-3.5" />
                    Scan QR Code
                  </Button>
                )}
              </div>
            )}

            {/* PAID BY (PAYER) WITH AUTO-SUGGESTIONS & CUSTOM INPUT */}
            <div className="space-y-2 sm:col-span-2" ref={payerContainerRef}>
              <div className="flex items-center justify-between">
                <Label htmlFor="payer-input">
                  Paid By (Payer) <span className="text-rose-500">*</span>
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Select student / parent / client / contact / staff, or enter custom name
                </span>
              </div>

              <div className="relative">
                <div className="relative flex items-center">
                  <Input
                    id="payer-input"
                    value={payerInputText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPayerInputText(val);
                      setForm((prev) => ({
                        ...prev,
                        paid_by_label: val,
                        paid_by: "",
                      }));
                      setPayerSuggestionsOpen(true);
                    }}
                    onFocus={() => setPayerSuggestionsOpen(true)}
                    placeholder="Type to search Student (Class/Roll), Parent, Client, Contact, Staff, or type custom name"
                    className="pr-8 bg-background"
                  />
                  {payerInputText && (
                    <button
                      type="button"
                      onClick={() => {
                        setPayerInputText("");
                        setForm((prev) => ({ ...prev, paid_by: "", paid_by_label: "" }));
                      }}
                      className="absolute right-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* SUGGESTIONS POPOVER */}
                {payerSuggestionsOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg text-popover-foreground">
                    {filteredSuggestions.length > 0 ? (
                      <div className="space-y-0.5">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Database Suggestions ({filteredSuggestions.length})
                        </div>
                        {filteredSuggestions.slice(0, 40).map((sug) => (
                          <button
                            key={sug.id}
                            type="button"
                            onClick={() => {
                              setPayerInputText(sug.name);
                              setForm((prev) => ({
                                ...prev,
                                paid_by: sug.user_id ? String(sug.user_id) : "",
                                paid_by_label: sug.name,
                              }));
                              setPayerSuggestionsOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {sug.type === "student" && <GraduationCap className="size-3.5 text-blue-500 shrink-0" />}
                              {sug.type === "parent" && <Users className="size-3.5 text-emerald-500 shrink-0" />}
                              {sug.type === "client" && <Building2 className="size-3.5 text-indigo-500 shrink-0" />}
                              {sug.type === "vendor" && <Store className="size-3.5 text-rose-500 shrink-0" />}
                              {sug.type === "contact" && <Phone className="size-3.5 text-amber-500 shrink-0" />}
                              {sug.type === "employee" && <UserCheck className="size-3.5 text-purple-500 shrink-0" />}
                              <div className="min-w-0 truncate">
                                <p className="font-medium text-foreground truncate">{sug.name}</p>
                                {sug.subtext && <p className="text-[11px] text-muted-foreground truncate">{sug.subtext}</p>}
                              </div>
                            </div>
                            <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase font-bold shrink-0 ${
                              sug.type === "student" ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" :
                              sug.type === "parent" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                              sug.type === "client" ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400" :
                              sug.type === "vendor" ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" :
                              sug.type === "contact" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                              "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                            }`}>
                              {sug.type}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        No database records matched &quot;{payerInputText}&quot;
                      </div>
                    )}

                    {payerInputText.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            paid_by: "",
                            paid_by_label: payerInputText.trim(),
                          }));
                          setPayerSuggestionsOpen(false);
                        }}
                        className="mt-1 flex w-full items-center gap-2 border-t pt-1.5 px-2.5 py-1.5 text-xs text-primary font-medium hover:bg-primary/10 rounded cursor-pointer transition-colors"
                      >
                        <Sparkles className="size-3.5" />
                        Use custom payer: &quot;{payerInputText.trim()}&quot;
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Date <span className="text-rose-500">*</span></Label>
              <DatePicker
                value={form.income_date}
                onChange={(value) => setForm((current) => ({ ...current, income_date: value }))}
                placeholder="Select payment date"
                toYear={new Date().getFullYear() + 1}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="income-amount">Amount (₹) <span className="text-rose-500">*</span></Label>
              <Input
                id="income-amount"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: normalizeAmountInput(event.target.value) }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Paid To (Receiver) <span className="text-rose-500">*</span></Label>
                <span className="text-[11px] text-muted-foreground">
                  Default: {user?.full_name || "You"} (person recording income)
                </span>
              </div>
              <Select
                value={form.paid_to}
                onValueChange={(value) => setForm((current) => ({ ...current, paid_to: value }))}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select receiver" />
                </SelectTrigger>
                <SelectContent>
                  {paidToOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* AUTOMATIC INVOICE GENERATION NOTICE */}
            <div className="space-y-2 sm:col-span-2">
              <div className="rounded-lg border bg-blue-500/5 p-3 text-xs flex items-center gap-2.5 text-muted-foreground border-blue-500/20">
                <FileText className="size-4 text-primary shrink-0" />
                <span>
                  An official invoice and payment receipt will be <strong>automatically generated</strong> and saved in the <strong>Invoice</strong> section upon saving.
                </span>
              </div>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="income-description">Description / Remarks</Label>
              <Textarea
                id="income-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Optional notes or remarks"
                className="min-h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={saveIncome} disabled={saving || categories.length === 0} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Save Income
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT INCOME DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Income Record</DialogTitle>
            <DialogDescription>Modify details of the selected income entry.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Payment For <span className="text-rose-500">*</span></Label>
              <Select
                value={form.category_id}
                onValueChange={(value) => setForm((current) => ({ ...current, category_id: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Method <span className="text-rose-500">*</span></Label>
              <Select
                value={form.payment_method}
                onValueChange={(value) => setForm((current) => ({ ...current, payment_method: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="net_banking">Net Banking</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* EDIT PAID BY */}
            <div className="space-y-2 sm:col-span-2 rounded-lg border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-sm">Paid By (Payer)</Label>
                <div className="flex rounded-lg border bg-background p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setPayerMode("employee")}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-medium transition-colors",
                      payerMode === "employee" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Employee / Staff
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayerMode("custom")}
                    className={cn(
                      "rounded-md px-2.5 py-1 font-medium transition-colors",
                      payerMode === "custom" ? "bg-primary text-primary-foreground shadow-2xs" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Custom Payer
                  </button>
                </div>
              </div>

              {payerMode === "employee" ? (
                <div className="mt-2">
                  <Select
                    value={form.paid_by}
                    onValueChange={(val) => {
                      const emp = employeeOptions.find((e) => String(e.id) === val);
                      setForm((current) => ({
                        ...current,
                        paid_by: val,
                        paid_by_label: emp ? emp.full_name : "",
                      }));
                    }}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Select employee / staff member" />
                    </SelectTrigger>
                    <SelectContent>
                      {employeeOptions.map((emp) => (
                        <SelectItem key={emp.id} value={String(emp.id)}>
                          {emp.full_name} {emp.role_label ? `(${emp.role_label})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="mt-2">
                  <Input
                    value={form.paid_by_label}
                    onChange={(e) => setForm((current) => ({ ...current, paid_by_label: e.target.value, paid_by: "" }))}
                    placeholder="Enter payer name"
                    className="bg-background"
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Income Date <span className="text-rose-500">*</span></Label>
              <DatePicker
                value={form.income_date}
                onChange={(value) => setForm((current) => ({ ...current, income_date: value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (₹) <span className="text-rose-500">*</span></Label>
              <Input
                type="text"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm((current) => ({ ...current, amount: normalizeAmountInput(e.target.value) }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Paid To (Receiver) <span className="text-rose-500">*</span></Label>
              <Select
                value={form.paid_to}
                onValueChange={(value) => setForm((current) => ({ ...current, paid_to: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select receiver" />
                </SelectTrigger>
                <SelectContent>
                  {paidToOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description / Remarks</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                placeholder="Optional notes"
                className="min-h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={updateIncome} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Income Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this income entry of {deletingRow ? currency(deletingRow.amount) : ""}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteIncome} disabled={deleting} className="gap-2">
              {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isMobile ? (
        <Drawer open={Boolean(selectedRow)} onOpenChange={(open) => !open && setSelectedRow(null)}>
          <DrawerContent className="max-h-[92dvh]">
            <DrawerHeader>
              <DrawerTitle>Income Details</DrawerTitle>
              <DrawerDescription>{selectedRow ? SOURCE_LABELS[selectedRow.source_type] : ""}</DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6">
              {selectedRow ? <DetailContent row={selectedRow} /> : null}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={Boolean(selectedRow)} onOpenChange={(open) => !open && setSelectedRow(null)}>
          <SheetContent side="right" className={cn("overflow-y-auto p-0")} defaultSize={520} minSize={420}>
            <SheetHeader className="border-b p-5">
              <SheetTitle>Income Details</SheetTitle>
              <SheetDescription>{selectedRow ? SOURCE_LABELS[selectedRow.source_type] : ""}</SheetDescription>
            </SheetHeader>
            <div className="p-5">
              {selectedRow ? <DetailContent row={selectedRow} /> : null}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* QR Code Fullscreen Modal Preview */}
      <Dialog open={Boolean(previewQrMethod)} onOpenChange={(open) => !open && setPreviewQrMethod(null)}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader>
            <DialogTitle>{previewQrMethod?.title}</DialogTitle>
            <DialogDescription>Scan with any Indian UPI app (PhonePe, Google Pay, Paytm, BHIM, CRED)</DialogDescription>
          </DialogHeader>

          {previewQrMethod?.qr_code_url && (
            <div className="mx-auto my-2 size-64 overflow-hidden rounded-xl border bg-white p-3 shadow-md">
              <div className="relative size-full">
                <Image
                  src={previewQrMethod.qr_code_url}
                  alt="UPI QR Code"
                  fill
                  sizes="256px"
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          )}

          {previewQrMethod?.upi_id && (
            <div className="flex items-center justify-center gap-2 font-mono text-sm font-bold text-foreground">
              <span>{previewQrMethod.upi_id}</span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(previewQrMethod.upi_id!);
                  toast.success("Copied UPI ID to clipboard!");
                }}
                className="text-muted-foreground hover:text-foreground cursor-pointer"
                title="Copy UPI ID"
              >
                <Copy className="size-4" />
              </button>
            </div>
          )}

          <DialogFooter className="sm:justify-center">
            <Button variant="outline" onClick={() => setPreviewQrMethod(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
