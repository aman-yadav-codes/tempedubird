"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  Copy,
  CreditCard,
  FileText,
  IndianRupee,
  Landmark,
  ListFilter,
  Loader2,
  MoreHorizontal,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Smartphone,
  Sparkles,
  Store,
  Tags,
  TrendingDown,
  User,
  Users,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { DatePicker } from "@/components/shared/date-picker";
import {
  DocumentFileUpload,
  type UploadedDocumentFile,
} from "@/components/shared/document-file-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FinancePaymentMethodRow, FinanceVendorSuggestion } from "@/lib/queries/finance";
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

type ExpenseCategory = {
  id: number;
  name: string;
};

type PaidByOption = {
  value: string;
  label: string;
};

type ExpenseRow = {
  row_id: string;
  source_id: number;
  source_type: "manual" | "subscription" | "allowance" | "recurring";
  scope_type: "platform" | "institution";
  institution_id: number | null;
  institution_name: string | null;
  expense_date: string;
  amount: string | number;
  payment_method: "cash" | "upi" | "net_banking";
  payment_status: "paid" | "due";
  paid_by: string;
  paid_by_label: string;
  paid_to?: string | null;
  paid_to_label?: string | null;
  category_id: number | null;
  category_name: string;
  reference: string | null;
  invoice_url: string | null;
  invoice_public_id: string | null;
  invoice_resource_type: string | null;
  invoice_file_name: string | null;
  description: string | null;
  created_at: string;
};

export type AllowanceBalanceUser = {
  user_id: number;
  user_name: string;
  user_email: string | null;
  total_allowance_provided: number;
  total_spent: number;
  in_hand_balance: number;
  allowance_count: number;
  spend_count: number;
};

export type AllowanceSummary = {
  total_provided: number;
  total_spent: number;
  total_in_hand: number;
  user_balances: AllowanceBalanceUser[];
};

type ExpenseResponse = {
  data: ExpenseRow[];
  meta: {
    total: number;
    filtered_total: string | number;
    this_month_total: string | number;
    due_total: string | number;
    due_count?: number;
    categories: ExpenseCategory[];
    payment_methods?: FinancePaymentMethodRow[];
    paid_by_options: PaidByOption[];
    employee_options?: { id: number; full_name: string; email: string | null; role_label: string | null }[];
    vendor_suggestions?: FinanceVendorSuggestion[];
    allowance_summary?: AllowanceSummary;
  };
};

const DEFAULT_EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 1, name: "Internet Bills" },
  { id: 2, name: "Water Bills" },
  { id: 3, name: "Electricity Bills" },
  { id: 4, name: "Rent" },
  { id: 5, name: "Staff Salary" },
  { id: 6, name: "Tea & Snacks" },
  { id: 7, name: "Stationery & Printing" },
  { id: 8, name: "Repairs & Maintenance" },
  { id: 9, name: "Software & Hosting" },
  { id: 10, name: "Others" },
];

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  net_banking: "Net Banking",
};

const STATUS_LABELS: Record<string, string> = {
  paid: "Paid",
  due: "Due",
};

const SOURCE_LABELS: Record<string, string> = {
  manual: "Manual",
  subscription: "Subscription",
  allowance: "Allowance",
  recurring: "Recurring",
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

function DetailContent({ row }: { row: ExpenseRow }) {
  const details = [
    ["Date", formatDate(row.expense_date)],
    ["Amount", currency(row.amount)],
    ["Status", STATUS_LABELS[row.payment_status] ?? row.payment_status],
    ["Source", SOURCE_LABELS[row.source_type] ?? row.source_type],
    ["Payment For", row.category_name],
    ["Method", PAYMENT_METHOD_LABELS[row.payment_method] ?? row.payment_method],
    ["Paid By", row.paid_by_label],
    ["Paid To (Vendor/Receiver)", row.paid_to_label || row.paid_to || "-"],
    ["Reference", row.reference || "-"],
    ["Institution", row.institution_name || "-"],
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/10 p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">Expense Amount</p>
        <p className="mt-2 text-2xl font-bold">{currency(row.amount)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{row.category_name} on {formatDate(row.expense_date)}</p>
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

export function ExpenseClient() {
  const pathname = usePathname();
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitutionId } = useActiveInstitution();
  const isMobile = useIsMobile();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isPlatformSection = pathname?.startsWith("/platformadmin");
  const isPlatformScope = isPlatformSection || (!activeInstitutionId && (isPlatformAdmin || hasPermission(user, "finance.platform.expense.view")));
  const targetInstitutionId = isPlatformSection ? null : (activeInstitutionId ?? null);
  const authHeader = useMemo(() => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), [accessToken]);

  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<FinancePaymentMethodRow[]>([]);
  const [selectedPaymentMethodKey, setSelectedPaymentMethodKey] = useState<string>("cash");
  const [previewQrMethod, setPreviewQrMethod] = useState<FinancePaymentMethodRow | null>(null);
  const [paidByOptions, setPaidByOptions] = useState<PaidByOption[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<{ id: number; full_name: string; email: string | null; role_label: string | null }[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState<string | number>("0");
  const [thisMonthTotal, setThisMonthTotal] = useState<string | number>("0");
  const [dueTotal, setDueTotal] = useState<string | number>("0");
  const [dueCount, setDueCount] = useState(0);
  const [allowanceSummary, setAllowanceSummary] = useState<AllowanceSummary | null>(null);
  const [allowanceDialogOpen, setAllowanceDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [source, setSource] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [selectedRow, setSelectedRow] = useState<ExpenseRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ExpenseRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [customCategoryText, setCustomCategoryText] = useState("");
  const [vendorSuggestions, setVendorSuggestions] = useState<FinanceVendorSuggestion[]>([]);
  const [vendorSuggestionsOpen, setVendorSuggestionsOpen] = useState(false);
  const [vendorInputText, setVendorInputText] = useState("");
  const vendorContainerRef = useRef<HTMLDivElement>(null);
  const [deletingRow, setDeletingRow] = useState<ExpenseRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoiceFiles, setInvoiceFiles] = useState<UploadedDocumentFile[]>([]);
  const [form, setForm] = useState({
    category_id: "",
    payment_method: "cash",
    payment_status: "paid",
    expense_date: todayText(),
    amount: "",
    paid_by: "",
    paid_by_label: "",
    paid_to: "",
    paid_to_label: "",
    description: "",
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (vendorContainerRef.current && !vendorContainerRef.current.contains(event.target as Node)) {
        setVendorSuggestionsOpen(false);
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

  const filteredVendorSuggestions = useMemo(() => {
    if (!vendorInputText.trim()) return vendorSuggestions;
    const query = vendorInputText.toLowerCase().trim();
    return vendorSuggestions.filter(
      (sug) =>
        sug.name.toLowerCase().includes(query) ||
        (sug.company_name && sug.company_name.toLowerCase().includes(query)) ||
        (sug.category && sug.category.toLowerCase().includes(query)) ||
        (sug.subtext && sug.subtext.toLowerCase().includes(query))
    );
  }, [vendorInputText, vendorSuggestions]);

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
    setIsCustomCategory(false);
    setCustomCategoryText("");
    setVendorInputText("");
    setVendorSuggestionsOpen(false);
    const defaultPm = paymentMethods.find((pm) => pm.is_default);
    if (defaultPm) {
      setSelectedPaymentMethodKey(`pm_${defaultPm.id}`);
      const isUpi = ["phonepe", "google_pay", "paytm", "bhim_upi", "other_upi"].includes(defaultPm.method_type);
      const isBank = defaultPm.method_type === "net_banking";
      setForm((prev) => ({
        ...prev,
        payment_method: isUpi ? "upi" : isBank ? "net_banking" : "cash",
      }));
    } else {
      setSelectedPaymentMethodKey("cash");
    }

    // Default payer to the person adding expense (current user)
    const currentUserOption = paidByOptions.find((opt) => opt.value === String(user?.id)) || paidByOptions[0];

    setForm({
      category_id: String(categories[0]?.id ?? "1"),
      payment_method: "cash",
      payment_status: "paid",
      expense_date: todayText(),
      amount: "",
      paid_by: currentUserOption?.value || String(user?.id || ""),
      paid_by_label: currentUserOption?.label || user?.full_name || "Admin",
      paid_to: "",
      paid_to_label: "",
      description: "",
    });
    setAddOpen(true);
  }

  function openEdit(row: ExpenseRow) {
    setEditingRow(row);
    setIsCustomCategory(false);
    setCustomCategoryText("");
    setVendorInputText(row.paid_to_label || row.paid_to || "");
    setVendorSuggestionsOpen(false);
    setSelectedPaymentMethodKey(row.payment_method || "cash");
    setForm({
      category_id: String(row.category_id || ""),
      payment_method: row.payment_method || "cash",
      payment_status: row.payment_status || "paid",
      expense_date: row.expense_date ? row.expense_date.slice(0, 10) : todayText(),
      amount: String(row.amount || ""),
      paid_by: row.paid_by || "",
      paid_by_label: row.paid_by_label || "",
      paid_to: row.paid_to || "",
      paid_to_label: row.paid_to_label || "",
      description: row.description || "",
    });
    setEditOpen(true);
  }

  async function updateExpense() {
    if (!editingRow || !accessToken) return;
    if (!form.category_id) {
      toast.error("Select an expense category (Payment For).");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Enter a valid expense amount.");
      return;
    }
    setSaving(true);
    try {
      const opt = paidByOptions.find((o) => o.value === form.paid_by);
      const emp = employeeOptions.find((e) => String(e.id) === form.paid_by);
      const effectivePaidBy = form.paid_by || String(user?.id || "");
      const effectivePaidByLabel = opt ? opt.label : (emp ? emp.full_name : (form.paid_by_label || user?.full_name || "Admin"));
      const effectivePaidTo = form.paid_to_label.trim() || vendorInputText.trim() || form.paid_to;

      const res = await fetch(`/api/admin/finance/expense/${editingRow.source_id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: Number(form.category_id),
          payment_method: form.payment_method,
          payment_status: form.payment_status,
          paid_by: effectivePaidBy,
          paid_by_label: effectivePaidByLabel,
          paid_to: effectivePaidTo || null,
          paid_to_label: effectivePaidTo || null,
          expense_date: form.expense_date,
          amount: Number(form.amount),
          description: form.description.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update expense");
      toast.success("Expense record updated successfully");
      setEditOpen(false);
      setEditingRow(null);
      void fetchExpense();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update expense");
    } finally {
      setSaving(false);
    }
  }

  async function deleteExpense() {
    if (!deletingRow || !accessToken) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/finance/expense/${deletingRow.source_id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete expense");
      toast.success("Expense record deleted successfully");
      setDeleteOpen(false);
      setDeletingRow(null);
      void fetchExpense();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete expense");
    } finally {
      setDeleting(false);
    }
  }

  const isInstitutionAdmin = isInstitutionAdminUser(user);
  const canCreate = isPlatformAdmin || isInstitutionAdmin || Boolean(targetInstitutionId) || (
    isPlatformScope
      ? hasPermission(user, "finance.platform.expense.create") || hasPermission(user, "finance.platform.expense")
      : Boolean(
          targetInstitutionId &&
            (hasPermission(user, "finance.expense.create", { institutionId: targetInstitutionId }) ||
             hasPermission(user, "finance.expense", { institutionId: targetInstitutionId }))
        )
  );

  const fetchExpense = useCallback(async () => {
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
        paymentStatus,
        source,
      });
      if (targetInstitutionId) params.set("institutionId", String(targetInstitutionId));
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetch(`/api/admin/finance/expense?${params.toString()}`, { headers: authHeader });
      const json = await res.json() as ExpenseResponse | { error?: string };
      if (!res.ok) throw new Error("error" in json ? json.error : "Failed to load expenses");

      const payload = json as ExpenseResponse;
      setRows(payload.data);
      setTotalRows(payload.meta.total);
      setFilteredTotal(payload.meta.filtered_total);
      setThisMonthTotal(payload.meta.this_month_total);
      setDueTotal(payload.meta.due_total);
      setDueCount(payload.meta.due_count ?? 0);
      const incomingCategories = payload.meta.categories && payload.meta.categories.length > 0
        ? payload.meta.categories
        : DEFAULT_EXPENSE_CATEGORIES;
      setCategories(incomingCategories);
      if (payload.meta.payment_methods) {
        setPaymentMethods(payload.meta.payment_methods);
      }
      setPaidByOptions(payload.meta.paid_by_options);
      if (payload.meta.employee_options) {
        setEmployeeOptions(payload.meta.employee_options);
      }
      if (payload.meta.vendor_suggestions) {
        setVendorSuggestions(payload.meta.vendor_suggestions);
      }
      if (payload.meta.allowance_summary) {
        setAllowanceSummary(payload.meta.allowance_summary);
      }
      const defaultPayerValue = payload.meta.paid_by_options.find((opt) => opt.value === String(user?.id))?.value || payload.meta.paid_by_options[0]?.value || "";
      setForm((current) => ({
        ...current,
        category_id: current.category_id || String(incomingCategories[0]?.id ?? "1"),
        paid_by: current.paid_by || defaultPayerValue,
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load expenses");
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
    paymentStatus,
    search,
    source,
    targetInstitutionId,
    toDate,
    user?.id,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchExpense();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchExpense]);

  function updateFilter(updater: () => void) {
    updater();
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  async function saveExpense() {
    if (!accessToken) return;
    if (!canCreate) {
      toast.error("You do not have permission to add expense.");
      return;
    }
    if (isCustomCategory) {
      if (!customCategoryText.trim()) {
        toast.error("Please enter a custom expense purpose / category.");
        return;
      }
    } else if (!form.category_id) {
      toast.error("Select a payment category (Payment For).");
      return;
    }
    if (!form.paid_by) {
      toast.error("Select who paid this expense (Paid By).");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Enter a valid expense amount.");
      return;
    }

    const opt = paidByOptions.find((item) => item.value === form.paid_by);
    const emp = employeeOptions.find((e) => String(e.id) === form.paid_by);
    const effectivePaidBy = form.paid_by || String(user?.id || "");
    const effectivePaidByLabel = opt ? opt.label : (emp ? emp.full_name : (user?.full_name || "Admin"));
    const effectivePaidTo = form.paid_to_label.trim() || vendorInputText.trim() || form.paid_to;

    setSaving(true);
    try {
      const invoice = invoiceFiles[0] ?? null;
      const res = await fetch("/api/admin/finance/expense", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: targetInstitutionId,
          category_id: isCustomCategory ? 0 : Number(form.category_id),
          custom_category_name: isCustomCategory ? customCategoryText.trim() : null,
          payment_method: form.payment_method,
          payment_status: form.payment_status,
          expense_date: form.expense_date,
          amount: Number(form.amount),
          paid_by: effectivePaidBy,
          paid_by_label: effectivePaidByLabel,
          paid_to: effectivePaidTo || null,
          paid_to_label: effectivePaidTo || null,
          description: form.description.trim(),
          invoice_url: invoice?.url ?? null,
          invoice_public_id: invoice?.publicId ?? null,
          invoice_resource_type: invoice?.resourceType ?? null,
          invoice_file_name: invoice?.name ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add expense");
      toast.success("Expense added successfully");
      setAddOpen(false);
      setIsCustomCategory(false);
      setCustomCategoryText("");
      setVendorInputText("");
      setInvoiceFiles([]);
      void fetchExpense();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add expense");
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo<ColumnDef<ExpenseRow>[]>(() => [
    {
      accessorKey: "expense_date",
      header: "Date",
      cell: ({ row }) => <span className="font-medium">{formatDate(row.original.expense_date)}</span>,
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
      accessorKey: "payment_method",
      header: "Method",
      cell: ({ row }) => <Badge variant="outline">{PAYMENT_METHOD_LABELS[row.original.payment_method]}</Badge>,
    },
    {
      accessorKey: "payment_status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={row.original.payment_status === "due" ? "border-amber-500/50 text-amber-500" : "border-emerald-500/50 text-emerald-500"}
        >
          {STATUS_LABELS[row.original.payment_status]}
        </Badge>
      ),
    },
    {
      accessorKey: "paid_by_label",
      header: "Paid By",
    },
    {
      accessorKey: "paid_to_label",
      header: "Paid To",
      cell: ({ row }) => row.original.paid_to_label || row.original.paid_to || "-",
    },
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
            <DropdownMenuItem onClick={() => openEdit(row.original)}>Edit</DropdownMenuItem>
            <DropdownMenuItem className="text-rose-600 font-medium cursor-pointer" onClick={() => { setDeletingRow(row.original); setDeleteOpen(true); }}>Delete</DropdownMenuItem>
            {row.original.invoice_url ? (
              <DropdownMenuItem asChild>
                <a href={row.original.invoice_url} target="_blank" rel="noreferrer">Open invoice</a>
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

  if (!isReady) return null;

  const pageCount = Math.max(1, Math.ceil(totalRows / pagination.pageSize));
  const activeFilterCount = [
    paymentMethod !== "all",
    paymentStatus !== "all",
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
            Finance expense
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Expense</h1>
            <p className="text-sm text-muted-foreground">
              {isPlatformScope
                ? "Track manual platform expenses, allowances, and recurring schedules."
                : "Track manual institution expenses, subscriptions, allowances, and recurring schedules."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={fetchExpense} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
          {canCreate ? (
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Add Expense
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">This Month Expense</p>
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
              <p className="mt-1 text-xs text-muted-foreground">
                Total monthly operational spending
              </p>
            </>
          )}
        </div>

        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Allowance Provided</p>
            <Wallet className="size-4 text-indigo-600" />
          </div>
          {loading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-40" />
            </div>
          ) : (
            <>
              <p className="mt-3 text-2xl font-bold text-indigo-600">{currency(allowanceSummary?.total_provided ?? 0)}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Disbursed to staff &amp; custodians ({allowanceSummary?.user_balances?.length ?? 0} people)
              </p>
            </>
          )}
        </div>

        <div
          onClick={() => setAllowanceDialogOpen(true)}
          className="rounded-md border bg-card p-5 cursor-pointer hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <span>Allowance In Hand</span>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 py-0">
                View Person-wise
              </Badge>
            </p>
            <IndianRupee className="size-4 text-emerald-600" />
          </div>
          {loading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-40" />
            </div>
          ) : (
            <>
              <p className="mt-3 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {currency(allowanceSummary?.total_in_hand ?? 0)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground group-hover:text-emerald-700 transition-colors flex items-center justify-between">
                <span>Unspent balance with team</span>
                <span className="font-semibold text-primary underline text-[11px]">Click to inspect →</span>
              </p>
            </>
          )}
        </div>

        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Due Amount</p>
            <CreditCard className="size-4 text-rose-500" />
          </div>
          {loading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <>
              <p className="mt-3 text-2xl font-bold text-rose-600">{currency(dueTotal)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{dueCount} pending due records</p>
            </>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        emptyText="No expense records found."
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
                placeholder="Search expenses..."
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
              {activeFilterCount > 0 ? <Badge className="h-5 rounded-full px-1.5 text-xs">{activeFilterCount}</Badge> : null}
              <ChevronDown className={cn("size-4 transition-transform", filtersOpen && "rotate-180")} />
            </Button>
          </div>
        }
        toolbarBelow={filtersOpen ? (
          <div className="rounded-md border bg-card p-3">
            <div className="flex gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="w-44 shrink-0">
                <Select value={paymentMethod} onValueChange={(value) => updateFilter(() => setPaymentMethod(value))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Payment method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="net_banking">Net Banking</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-44 shrink-0">
                <Select value={paymentStatus} onValueChange={(value) => updateFilter(() => setPaymentStatus(value))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Payment status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="due">Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-44 shrink-0">
                <Select value={source} onValueChange={(value) => updateFilter(() => setSource(value))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Source" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    <SelectItem value="manual">Manual</SelectItem>
                    {!isPlatformScope ? <SelectItem value="subscription">Subscription</SelectItem> : null}
                    <SelectItem value="allowance">Allowance</SelectItem>
                    <SelectItem value="recurring">Recurring</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Input type="date" value={fromDate} onChange={(event) => updateFilter(() => setFromDate(event.target.value))} className="w-44 shrink-0" />
              <Input type="date" value={toDate} onChange={(event) => updateFilter(() => setToDate(event.target.value))} className="w-44 shrink-0" />
              {activeFilterCount > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => updateFilter(() => {
                    setPaymentMethod("all");
                    setPaymentStatus("all");
                    setSource("all");
                    setFromDate("");
                    setToDate("");
                  })}
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>Add a manual expense record for the active finance scope.</DialogDescription>
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
                    placeholder="Enter custom expense purpose (e.g. Electricity Bill, Stationery, Repairs)"
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
                    {(categories.length > 0 ? categories : DEFAULT_EXPENSE_CATEGORIES).map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                    <SelectItem value="__custom__" className="text-primary font-bold">
                      ✨ + Type Custom Purpose / Category...
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
              <Select value={selectedPaymentMethodKey} onValueChange={handleSelectPaymentMethod}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select payment method" /></SelectTrigger>
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

            {/* PAID BY (PAYER - EMPLOYEES & STAFF SUGGESTIONS) */}
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Paid By (Employee / Payer) <span className="text-rose-500">*</span></Label>
                <span className="text-[11px] text-muted-foreground">
                  Default: {user?.full_name || "You"} (person recording expense)
                </span>
              </div>
              <Select
                value={form.paid_by}
                onValueChange={(val) => {
                  const opt = paidByOptions.find((o) => o.value === val);
                  const emp = employeeOptions.find((e) => String(e.id) === val);
                  setForm((current) => ({
                    ...current,
                    paid_by: val,
                    paid_by_label: opt ? opt.label : (emp ? emp.full_name : val),
                  }));
                }}
              >
                <SelectTrigger className="w-full bg-background">
                  <SelectValue placeholder="Select employee who paid this expense" />
                </SelectTrigger>
                <SelectContent>
                  {paidByOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* PAID TO (VENDOR / RECIPIENT - VENDOR SUGGESTIONS + CUSTOM TEXT) */}
            <div className="space-y-2 sm:col-span-2" ref={vendorContainerRef}>
              <div className="flex items-center justify-between">
                <Label htmlFor="vendor-input">Paid To (Vendor / Recipient)</Label>
                <span className="text-[11px] text-muted-foreground">
                  Select from vendor records or type custom recipient
                </span>
              </div>

              <div className="relative">
                <div className="relative flex items-center">
                  <Input
                    id="vendor-input"
                    value={vendorInputText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVendorInputText(val);
                      setForm((prev) => ({
                        ...prev,
                        paid_to: val,
                        paid_to_label: val,
                      }));
                      setVendorSuggestionsOpen(true);
                    }}
                    onFocus={() => setVendorSuggestionsOpen(true)}
                    placeholder="Type to search vendor (e.g. Stationery, Electrician, Supplier) or enter custom recipient"
                    className="pr-8 bg-background"
                  />
                  {vendorInputText && (
                    <button
                      type="button"
                      onClick={() => {
                        setVendorInputText("");
                        setForm((prev) => ({ ...prev, paid_to: "", paid_to_label: "" }));
                      }}
                      className="absolute right-2.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* VENDOR SUGGESTIONS POPOVER */}
                {vendorSuggestionsOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg text-popover-foreground">
                    {filteredVendorSuggestions.length > 0 ? (
                      <div className="space-y-0.5">
                        <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Vendor Records &amp; Previous Recipients ({filteredVendorSuggestions.length})
                        </div>
                        {filteredVendorSuggestions.slice(0, 40).map((sug) => (
                          <button
                            key={sug.id}
                            type="button"
                            onClick={() => {
                              setVendorInputText(sug.name);
                              setForm((prev) => ({
                                ...prev,
                                paid_to: sug.name,
                                paid_to_label: sug.name,
                              }));
                              setVendorSuggestionsOpen(false);
                            }}
                            className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <Store className="size-3.5 text-amber-500 shrink-0" />
                              <div className="min-w-0 truncate">
                                <p className="font-medium text-foreground truncate">{sug.name}</p>
                                {sug.subtext && <p className="text-[11px] text-muted-foreground truncate">{sug.subtext}</p>}
                              </div>
                            </div>
                            <span className="rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 text-[10px] uppercase font-bold shrink-0">
                              {sug.category || "Vendor"}
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-2 text-center text-xs text-muted-foreground">
                        No vendor record matched &quot;{vendorInputText}&quot;
                      </div>
                    )}

                    {vendorInputText.trim() && (
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            paid_to: vendorInputText.trim(),
                            paid_to_label: vendorInputText.trim(),
                          }));
                          setVendorSuggestionsOpen(false);
                        }}
                        className="mt-1 flex w-full items-center gap-2 border-t pt-1.5 px-2.5 py-1.5 text-xs text-primary font-medium hover:bg-primary/10 rounded cursor-pointer transition-colors"
                      >
                        <Sparkles className="size-3.5" />
                        Use custom recipient: &quot;{vendorInputText.trim()}&quot;
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expense-amount">Amount (₹) <span className="text-rose-500">*</span></Label>
              <Input
                id="expense-amount"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: normalizeAmountInput(event.target.value) }))}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label>Payment Status <span className="text-rose-500">*</span></Label>
              <Select value={form.payment_status} onValueChange={(value) => setForm((current) => ({ ...current, payment_status: value }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="due">Due</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date <span className="text-rose-500">*</span></Label>
              <DatePicker
                value={form.expense_date}
                onChange={(value) => setForm((current) => ({ ...current, expense_date: value }))}
                placeholder="Select payment date"
                toYear={new Date().getFullYear() + 1}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Invoice / Bill Attachment</Label>
              <DocumentFileUpload
                accessToken={accessToken}
                files={invoiceFiles}
                onFilesChange={setInvoiceFiles}
                maxFiles={1}
                maxSize={10 * 1024 * 1024}
                accept="image/*,application/pdf"
                compact
                buttonLabel="Upload Invoice"
                emptyText="Upload image or PDF invoice (optional)"
                disabled={saving}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="expense-description">Description / Remarks</Label>
              <Textarea
                id="expense-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Optional notes"
                className="min-h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveExpense} disabled={saving || categories.length === 0} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Save Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT EXPENSE DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Expense Record</DialogTitle>
            <DialogDescription>Modify operational expense details.</DialogDescription>
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
            <div className="space-y-2 sm:col-span-2">
              <Label>Paid By (Employee / Payer) <span className="text-rose-500">*</span></Label>
              <Select
                value={form.paid_by}
                onValueChange={(val) => {
                  const opt = paidByOptions.find((o) => o.value === val);
                  const emp = employeeOptions.find((e) => String(e.id) === val);
                  setForm((current) => ({
                    ...current,
                    paid_by: val,
                    paid_by_label: opt ? opt.label : (emp ? emp.full_name : val),
                  }));
                }}
              >
                <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {paidByOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Paid To (Vendor / Recipient)</Label>
              <Input
                value={form.paid_to}
                onChange={(e) => setForm((current) => ({ ...current, paid_to: e.target.value, paid_to_label: e.target.value }))}
                placeholder="Vendor or staff recipient"
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

            <div className="space-y-2">
              <Label>Payment Status <span className="text-rose-500">*</span></Label>
              <Select
                value={form.payment_status}
                onValueChange={(value) => setForm((current) => ({ ...current, payment_status: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="due">Due</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Expense Date <span className="text-rose-500">*</span></Label>
              <DatePicker
                value={form.expense_date}
                onChange={(value) => setForm((current) => ({ ...current, expense_date: value }))}
              />
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
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={updateExpense} disabled={saving} className="gap-2">
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
            <DialogTitle>Delete Expense Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this expense entry of {deletingRow ? currency(deletingRow.amount) : ""}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={deleteExpense} disabled={deleting} className="gap-2">
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
              <DrawerTitle>Expense Details</DrawerTitle>
              <DrawerDescription>{selectedRow ? SOURCE_LABELS[selectedRow.source_type] : ""}</DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6">{selectedRow ? <DetailContent row={selectedRow} /> : null}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={Boolean(selectedRow)} onOpenChange={(open) => !open && setSelectedRow(null)}>
          <SheetContent side="right" className="overflow-y-auto p-0" defaultSize={520} minSize={420}>
            <SheetHeader className="border-b p-5">
              <SheetTitle>Expense Details</SheetTitle>
              <SheetDescription>{selectedRow ? SOURCE_LABELS[selectedRow.source_type] : ""}</SheetDescription>
            </SheetHeader>
            <div className="p-5">{selectedRow ? <DetailContent row={selectedRow} /> : null}</div>
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

      {/* Allowance In Hand & Person-wise Breakdown Dialog */}
      <Dialog open={allowanceDialogOpen} onOpenChange={setAllowanceDialogOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Wallet className="size-5 text-emerald-600" />
              Staff Allowance Provided &amp; In-Hand Balances
            </DialogTitle>
            <DialogDescription>
              Detailed statement of funds disbursed as allowances, verified expenditures, and remaining cash currently in hand with each team member.
            </DialogDescription>
          </DialogHeader>

          {/* Quick Summary Pill Row */}
          <div className="grid grid-cols-3 gap-3 p-3 bg-muted/40 rounded-xl border">
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground font-medium uppercase">Total Disbursed</p>
              <p className="text-lg font-bold text-foreground">{currency(allowanceSummary?.total_provided ?? 0)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground font-medium uppercase">Total Utilized</p>
              <p className="text-lg font-bold text-rose-600">{currency(allowanceSummary?.total_spent ?? 0)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[11px] text-muted-foreground font-medium uppercase">Total in Hand</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{currency(allowanceSummary?.total_in_hand ?? 0)}</p>
            </div>
          </div>

          {/* Table of Users */}
          <div className="rounded-xl border overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 border-b text-muted-foreground font-bold uppercase text-[11px]">
                <tr>
                  <th className="p-3">Staff / Custodian</th>
                  <th className="p-3 text-right">Allowance Provided</th>
                  <th className="p-3 text-right">Total Spent</th>
                  <th className="p-3 text-right">Cash In Hand</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y font-medium">
                {allowanceSummary?.user_balances && allowanceSummary.user_balances.length > 0 ? (
                  allowanceSummary.user_balances.map((u) => {
                    const inHand = Number(u.in_hand_balance || 0);
                    const provided = Number(u.total_allowance_provided || 0);
                    const spent = Number(u.total_spent || 0);

                    return (
                      <tr key={u.user_id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-foreground">{u.user_name}</div>
                          <div className="text-[10px] text-muted-foreground">{u.user_email || "Staff Member"}</div>
                        </td>
                        <td className="p-3 text-right font-semibold text-foreground">
                          {currency(provided)}
                        </td>
                        <td className="p-3 text-right font-semibold text-rose-600">
                          {currency(spent)}
                        </td>
                        <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {currency(inHand)}
                        </td>
                        <td className="p-3 text-center">
                          {inHand > 0 ? (
                            <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold">
                              ₹{Math.round(inHand).toLocaleString("en-IN")} in Hand
                            </Badge>
                          ) : inHand === 0 ? (
                            <Badge variant="secondary" className="text-[10px]">
                              Settled
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">
                              Overspent
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-muted-foreground">
                      No staff allowances have been issued yet in this scope.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <DialogFooter className="flex flex-row items-center justify-between sm:justify-between pt-2">
            <Link
              href="/admin/finance/allowance"
              className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
            >
              <Wallet className="size-3.5" /> Manage All Allowances &amp; Spends →
            </Link>
            <Button variant="outline" size="sm" onClick={() => setAllowanceDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
