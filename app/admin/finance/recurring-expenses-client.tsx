"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  CalendarDays,
  ChevronDown,
  Copy,
  CreditCard,
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
  Tags,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import { DatePicker } from "@/components/shared/date-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { FinancePaymentMethodRow } from "@/lib/queries/finance";
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

type RecurringExpenseRow = {
  id: string;
  title: string;
  category_ids: number[];
  category_names: string[];
  payment_method: "cash" | "upi" | "net_banking";
  paid_by: string;
  paid_by_label: string;
  amount: string | number;
  frequency: "monthly" | "yearly";
  due_day: number;
  start_date: string;
  end_date: string | null;
  payment_status: "paid" | "due";
  reminder_days_before: number;
  next_due_date: string;
  is_active: boolean;
  description: string | null;
  institution_name?: string | null;
  created_by?: number | null;
  created_by_name?: string | null;
  created_by_role?: string | null;
  staff_id?: number | null;
  created_at?: string;
};

type RecurringExpenseResponse = {
  data: RecurringExpenseRow[];
  meta: {
    total: number;
    filtered_total: string | number;
    active_total: string | number;
    categories: ExpenseCategory[];
    payment_methods?: FinancePaymentMethodRow[];
    paid_by_options: PaidByOption[];
    employee_options?: { id: number; full_name: string; email: string | null; role_label: string | null }[];
  };
};

const DEFAULT_RECURRING_CATEGORIES: ExpenseCategory[] = [
  { id: 1, name: "Internet Bills" },
  { id: 2, name: "Water Bills" },
  { id: 3, name: "Electricity Bills" },
  { id: 4, name: "Rent" },
  { id: 5, name: "Staff Salary" },
  { id: 6, name: "Tea & Snacks" },
  { id: 7, name: "Software & Hosting" },
  { id: 8, name: "Domain & SSL" },
  { id: 9, name: "Others" },
];

type RecurringExpenseHistoryRow = {
  id: string;
  action: "created" | "updated" | "status_changed";
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_by_name: string | null;
  changed_at: string;
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  net_banking: "Net Banking",
};

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: "Monthly",
  yearly: "Yearly",
};

function todayText() {
  return new Date().toISOString().slice(0, 10);
}

function currency(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function dateInput(value: string | null | undefined) {
  return value ? value.slice(0, 10) : "";
}

function normalizeAmountInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole, ...rest] = cleaned.split(".");
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join("").slice(0, 2)}`;
}

function detailRows(row: RecurringExpenseRow) {
  return [
    ["Categories", row.category_names.join(", ") || "-"],
    ["Frequency", FREQUENCY_LABELS[row.frequency] ?? row.frequency],
    ["Start Date", formatDate(row.start_date)],
    ["End Date", formatDate(row.end_date)],
    ["Payment Status", row.payment_status === "paid" ? "Paid" : "Due"],
    ["Reminder", `${row.reminder_days_before} day${row.reminder_days_before === 1 ? "" : "s"} earlier`],
    ["Next Due", formatDate(row.next_due_date)],
    ["Payment Method", PAYMENT_METHOD_LABELS[row.payment_method] ?? row.payment_method],
    ["Paid By", row.paid_by_label],
    ["Status", row.is_active ? "Active" : "Inactive"],
  ];
}

function historySummary(item: RecurringExpenseHistoryRow) {
  if (item.action === "created") return "Schedule created";
  if (item.action === "status_changed") {
    return `Payment status changed from ${item.old_values?.payment_status ?? "-"} to ${item.new_values?.payment_status ?? "-"}`;
  }
  const labels: Record<string, string> = {
    start_date: "start date",
    end_date: "end date",
    next_due_date: "next due date",
    payment_status: "payment status",
    reminder_days_before: "reminder days",
    amount: "amount",
    title: "expense name",
    frequency: "frequency",
  };
  const changes = Object.entries(labels)
    .filter(([key]) => item.old_values?.[key] !== item.new_values?.[key])
    .map(([, label]) => label);
  return changes.length ? `Updated ${changes.join(", ")}` : "Schedule updated";
}

function formatHistoryValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  if (key.includes("date")) return formatDate(String(value));
  if (key === "amount") return currency(String(value));
  if (key === "category_ids" && Array.isArray(value)) return value.join(", ");
  if (key === "reminder_days_before") return `${value} day${Number(value) === 1 ? "" : "s"} earlier`;
  if (key === "payment_method") return PAYMENT_METHOD_LABELS[String(value)] ?? String(value);
  if (key === "frequency") return FREQUENCY_LABELS[String(value)] ?? String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

function historyChanges(item: RecurringExpenseHistoryRow) {
  if (!item.old_values || !item.new_values) return [];
  const labels: Record<string, string> = {
    title: "Expense Name",
    category_ids: "Categories",
    payment_method: "Payment Method",
    paid_by_label: "Paid By",
    amount: "Amount",
    frequency: "Frequency",
    start_date: "Start Date",
    end_date: "End Date",
    next_due_date: "Next Due",
    payment_status: "Payment Status",
    reminder_days_before: "Reminder",
    description: "Description",
  };
  return Object.entries(labels)
    .filter(([key]) => JSON.stringify(item.old_values?.[key] ?? null) !== JSON.stringify(item.new_values?.[key] ?? null))
    .map(([key, label]) => ({
      key,
      label,
      oldValue: formatHistoryValue(key, item.old_values?.[key]),
      newValue: formatHistoryValue(key, item.new_values?.[key]),
    }));
}

function DetailContent({
  row,
  history,
  historyLoading,
}: {
  row: RecurringExpenseRow;
  history: RecurringExpenseHistoryRow[];
  historyLoading: boolean;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-md border bg-muted/10 p-5">
        <p className="text-xs font-medium uppercase text-muted-foreground">Recurring Amount</p>
        <p className="mt-2 text-2xl font-bold">{currency(row.amount)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {row.title} - {FREQUENCY_LABELS[row.frequency] ?? row.frequency}
        </p>
      </div>
      <div className="grid overflow-hidden rounded-md border bg-muted/10 sm:grid-cols-2">
        {detailRows(row).map(([label, value]) => (
          <div key={label} className="border-b p-4 last:border-b-0 sm:[&:nth-last-child(-n+2)]:border-b-0 sm:odd:border-r">
            <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
            <p className="mt-2 text-sm font-semibold leading-5">{value}</p>
          </div>
        ))}
      </div>
      {row.description ? (
        <div className="rounded-md border bg-muted/10 p-5">
          <p className="text-xs font-medium uppercase text-muted-foreground">Description</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{row.description}</p>
        </div>
      ) : null}
      <div className="rounded-md border bg-muted/10">
        <div className="border-b p-5">
          <p className="text-sm font-semibold">History</p>
          <p className="mt-1 text-xs text-muted-foreground">Saved changes for this recurring expense.</p>
        </div>
        <div className="divide-y">
          {historyLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="p-4">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="mt-2 h-3 w-1/3" />
              </div>
            ))
          ) : history.length ? (
            history.map((item) => (
              <div key={item.id} className="p-4">
                <p className="text-sm font-medium">{historySummary(item)}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(item.changed_at)} by {item.changed_by_name || "System"}
                </p>
                {historyChanges(item).length ? (
                  <div className="mt-3 overflow-hidden rounded-md border">
                    <div className="hidden grid-cols-[1fr_1.2fr_1.2fr] gap-2 border-b bg-muted/20 px-3 py-2 text-xs font-medium uppercase text-muted-foreground sm:grid">
                      <span>Field</span>
                      <span>Previous</span>
                      <span>Updated</span>
                    </div>
                    {historyChanges(item).map((change) => (
                      <div
                        key={change.key}
                        className="grid gap-2 border-b bg-background/30 p-3 text-xs last:border-b-0 sm:grid-cols-[1fr_1.2fr_1.2fr] sm:items-center"
                      >
                        <p className="font-medium text-muted-foreground">{change.label}</p>
                        <p className="break-words">
                          <span className="mr-1 text-muted-foreground sm:hidden">Previous:</span>
                          {change.oldValue}
                        </p>
                        <p className="break-words">
                          <span className="mr-1 text-muted-foreground sm:hidden">Updated:</span>
                          {change.newValue}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <p className="p-5 text-sm text-muted-foreground">No history yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function RecurringExpensesClient() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitutionId, activeInstitution } = useActiveInstitution();
  const isMobile = useIsMobile();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isPlatformScope = isPlatformAdmin || hasPermission(user, "finance.platform.recurring_expenses.view");
  const targetInstitutionId = isPlatformScope ? null : activeInstitutionId;
  const authHeader = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    [accessToken]
  );

  const [rows, setRows] = useState<RecurringExpenseRow[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<FinancePaymentMethodRow[]>([]);
  const [selectedPaymentMethodKey, setSelectedPaymentMethodKey] = useState<string>("cash");
  const [previewQrMethod, setPreviewQrMethod] = useState<FinancePaymentMethodRow | null>(null);
  const [paidByOptions, setPaidByOptions] = useState<PaidByOption[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState<string | number>("0");
  const [activeTotal, setActiveTotal] = useState<string | number>("0");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [frequency, setFrequency] = useState("all");
  const [status, setStatus] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [selectedRow, setSelectedRow] = useState<RecurringExpenseRow | null>(null);
  const [selectedHistory, setSelectedHistory] = useState<RecurringExpenseHistoryRow[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<RecurringExpenseRow | null>(null);
  const [deletingRow, setDeletingRow] = useState<RecurringExpenseRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category_ids: [] as string[],
    payment_method: "cash",
    paid_by: "",
    amount: "",
    frequency: "monthly",
    start_date: todayText(),
    end_date: "",
    payment_status: "due",
    reminder_days_before: "3",
    description: "",
  });

  const activeSelectedMethod = useMemo(() => {
    if (!selectedPaymentMethodKey.startsWith("pm_")) return null;
    const id = selectedPaymentMethodKey.replace("pm_", "");
    return paymentMethods.find((pm) => String(pm.id) === id) || null;
  }, [paymentMethods, selectedPaymentMethodKey]);

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

  const isInstitutionAdmin = isInstitutionAdminUser(user);
  const canCreate = isPlatformAdmin || isInstitutionAdmin || Boolean(targetInstitutionId) || (
    isPlatformScope
      ? hasPermission(user, "finance.platform.recurring_expenses.create") || hasPermission(user, "finance.platform.recurring_expenses")
      : Boolean(
          targetInstitutionId &&
            (hasPermission(user, "finance.recurring_expenses.create", { institutionId: targetInstitutionId }) ||
             hasPermission(user, "finance.recurring_expenses", { institutionId: targetInstitutionId }))
        )
  );
  const canEdit = isPlatformAdmin || isInstitutionAdmin || Boolean(targetInstitutionId) || (
    isPlatformScope
      ? hasPermission(user, "finance.platform.recurring_expenses.edit") || hasPermission(user, "finance.platform.recurring_expenses")
      : Boolean(
          targetInstitutionId &&
            (hasPermission(user, "finance.recurring_expenses.edit", { institutionId: targetInstitutionId }) ||
             hasPermission(user, "finance.recurring_expenses", { institutionId: targetInstitutionId }))
        )
  );

  const fetchRecurring = useCallback(async () => {
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
        frequency,
        status,
      });
      if (targetInstitutionId) params.set("institutionId", String(targetInstitutionId));
      const res = await fetch(`/api/admin/finance/recurring-expenses?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await res.json() as RecurringExpenseResponse | { error?: string };
      if (!res.ok) throw new Error("error" in json ? json.error : "Failed to load recurring expenses");

      const payload = json as RecurringExpenseResponse;
      setRows(payload.data);
      setTotalRows(payload.meta.total);
      setFilteredTotal(payload.meta.filtered_total);
      setActiveTotal(payload.meta.active_total);
      const incomingCategories = payload.meta.categories && payload.meta.categories.length > 0
        ? payload.meta.categories
        : DEFAULT_RECURRING_CATEGORIES;
      setCategories(incomingCategories);
      if (payload.meta.payment_methods) {
        setPaymentMethods(payload.meta.payment_methods);
      }
      setPaidByOptions(payload.meta.paid_by_options);
      setForm((current) => ({
        ...current,
        category_ids: current.category_ids.length ? current.category_ids : incomingCategories[0] ? [String(incomingCategories[0].id)] : ["1"],
        paid_by: current.paid_by || payload.meta.paid_by_options[0]?.value || "",
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load recurring expenses");
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    authHeader,
    frequency,
    isPlatformScope,
    isReady,
    pagination.pageIndex,
    pagination.pageSize,
    paymentMethod,
    search,
    status,
    targetInstitutionId,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchRecurring();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchRecurring]);

  const fetchHistory = useCallback(async (row: RecurringExpenseRow) => {
    if (!accessToken) return;
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ historyFor: row.id });
      if (targetInstitutionId) params.set("institutionId", String(targetInstitutionId));
      const res = await fetch(`/api/admin/finance/recurring-expenses?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await res.json() as { data?: RecurringExpenseHistoryRow[]; error?: string };
      if (!res.ok) throw new Error(json.error || "Failed to load recurring expense history");
      setSelectedHistory(json.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load recurring expense history");
      setSelectedHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [accessToken, authHeader, targetInstitutionId]);

  useEffect(() => {
    if (!selectedRow) return undefined;
    const timer = window.setTimeout(() => {
      void fetchHistory(selectedRow);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchHistory, selectedRow]);

  function updateFilter(updater: () => void) {
    updater();
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  function resetForm() {
    setForm({
      title: "",
      category_ids: categories[0] ? [String(categories[0].id)] : [],
      payment_method: "cash",
      paid_by: paidByOptions[0]?.value || "",
      amount: "",
      frequency: "monthly",
      start_date: todayText(),
      end_date: "",
      payment_status: "due",
      reminder_days_before: "3",
      description: "",
    });
  }

  function openAddDialog() {
    setEditingRow(null);
    resetForm();
    const defaultPm = paymentMethods.find((pm) => pm.is_default);
    if (defaultPm) {
      setSelectedPaymentMethodKey(`pm_${defaultPm.id}`);
      const isUpi = ["phonepe", "google_pay", "paytm", "bhim_upi", "other_upi"].includes(defaultPm.method_type);
      const isBank = defaultPm.method_type === "net_banking";
      setForm((current) => ({ ...current, payment_method: isUpi ? "upi" : isBank ? "net_banking" : "cash" }));
    } else {
      setSelectedPaymentMethodKey("cash");
    }
    setAddOpen(true);
  }

  function openEditDialog(row: RecurringExpenseRow) {
    setEditingRow(row);
    setSelectedPaymentMethodKey(row.payment_method || "cash");
    setForm({
      title: row.title,
      category_ids: row.category_ids.map(String),
      payment_method: row.payment_method,
      paid_by: row.paid_by,
      amount: String(row.amount ?? ""),
      frequency: row.frequency,
      start_date: dateInput(row.start_date) || todayText(),
      end_date: dateInput(row.end_date),
      payment_status: row.payment_status,
      reminder_days_before: String(row.reminder_days_before ?? 3),
      description: row.description || "",
    });
    setAddOpen(true);
  }

  async function deleteRecurringExpense() {
    if (!deletingRow || !accessToken) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/finance/recurring-expenses/${deletingRow.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete recurring expense");
      toast.success("Recurring expense deleted successfully");
      setDeleteOpen(false);
      setDeletingRow(null);
      void fetchRecurring();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete recurring expense");
    } finally {
      setDeleting(false);
    }
  }

  async function saveRecurringExpense() {
    if (!accessToken) return;
    if (editingRow ? !canEdit : !canCreate) {
      toast.error(`You do not have permission to ${editingRow ? "update" : "add"} recurring expenses.`);
      return;
    }
    const paidBy = paidByOptions.find((item) => item.value === form.paid_by) ||
      paidByOptions.find((item) => item.value === String(user?.id)) ||
      paidByOptions[0] || { value: String(user?.id || ""), label: user?.full_name || "Admin" };

    setSaving(true);
    try {
      const res = await fetch("/api/admin/finance/recurring-expenses", {
        method: editingRow ? "PATCH" : "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: targetInstitutionId,
          id: editingRow ? Number(editingRow.id) : undefined,
          title: form.title,
          category_ids: form.category_ids.map(Number),
          payment_method: form.payment_method,
          paid_by: paidBy.value,
          paid_by_label: paidBy.label,
          amount: Number(form.amount),
          frequency: form.frequency,
          start_date: form.start_date,
          end_date: form.end_date || null,
          payment_status: form.payment_status,
          reminder_days_before: Number(form.reminder_days_before || 3),
          description: form.description.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `Failed to ${editingRow ? "update" : "add"} recurring expense`);
      toast.success(editingRow ? "Recurring expense updated" : "Recurring expense added");
      setAddOpen(false);
      setEditingRow(null);
      resetForm();
      void fetchRecurring();
      if (selectedRow) void fetchHistory(selectedRow);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to ${editingRow ? "update" : "add"} recurring expense`);
    } finally {
      setSaving(false);
    }
  }

  const markPaymentStatus = useCallback(async (row: RecurringExpenseRow, paymentStatus: "paid" | "due") => {
    if (!accessToken || !canEdit) {
      toast.error("You do not have permission to update recurring expenses.");
      return;
    }

    try {
      const res = await fetch("/api/admin/finance/recurring-expenses", {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: targetInstitutionId,
          id: Number(row.id),
          action: "payment_status",
          payment_status: paymentStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update recurring expense");
      toast.success(paymentStatus === "paid" ? "Marked as paid" : "Marked as due");
      setSelectedRow((current) => current?.id === row.id ? { ...current, payment_status: paymentStatus } : current);
      void fetchRecurring();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update recurring expense");
    }
  }, [accessToken, authHeader, canEdit, fetchRecurring, targetInstitutionId]);

  const columns = useMemo<ColumnDef<RecurringExpenseRow>[]>(() => [
    {
      accessorKey: "title",
      header: "Expense",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{row.original.title}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.category_names.join(", ") || "-"}</p>
        </div>
      ),
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => <span className="font-semibold">{currency(row.original.amount)}</span>,
    },
    {
      accessorKey: "frequency",
      header: "Frequency",
      cell: ({ row }) => <Badge variant="outline">{FREQUENCY_LABELS[row.original.frequency]}</Badge>,
    },
    {
      accessorKey: "next_due_date",
      header: "Next Due",
      cell: ({ row }) => <span className="font-medium">{formatDate(row.original.next_due_date)}</span>,
    },
    {
      accessorKey: "payment_status",
      header: "Payment",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={row.original.payment_status === "paid" ? "border-emerald-500/50 text-emerald-500" : "border-amber-500/50 text-amber-500"}
        >
          {row.original.payment_status === "paid" ? "Paid" : "Due"}
        </Badge>
      ),
    },
    {
      accessorKey: "paid_by_label",
      header: "Paid By",
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
      cell: ({ row }: { row: { original: RecurringExpenseRow } }) => (
        <Badge variant={row.original.institution_name ? "secondary" : "default"} className="text-[11px]">
          {row.original.institution_name ? row.original.institution_name : "Platform Global"}
        </Badge>
      ),
    }] : []),
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant="outline" className={row.original.is_active ? "border-emerald-500/50 text-emerald-500" : ""}>
          {row.original.is_active ? "Active" : "Inactive"}
        </Badge>
      ),
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
            {canEdit ? (
              <>
                <DropdownMenuItem onClick={() => openEditDialog(row.original)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => markPaymentStatus(row.original, row.original.payment_status === "paid" ? "due" : "paid")}>
                  Mark {row.original.payment_status === "paid" ? "due" : "paid"}
                </DropdownMenuItem>
                <DropdownMenuItem className="text-rose-600 font-medium cursor-pointer" onClick={() => { setDeletingRow(row.original); setDeleteOpen(true); }}>Delete</DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [canEdit, isPlatformScope, markPaymentStatus]);

  if (!isReady) return null;

  const pageCount = Math.max(1, Math.ceil(totalRows / pagination.pageSize));
  const scopeTitle = isPlatformScope ? "Platform Recurring" : `${activeInstitution?.name ?? "Institution"} Recurring`;
  const activeFilterCount = [
    paymentMethod !== "all",
    frequency !== "all",
    status !== "all",
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <IndianRupee className="size-4 text-primary" />
            Finance recurring expenses
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Recurring Expenses</h1>
            <p className="text-sm text-muted-foreground">
              Manage fixed repeating expenses like rent, hosting, internet, water, domain, SSL, and monthly contracts.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={fetchRecurring} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
          {canCreate ? (
            <Button size="sm" onClick={openAddDialog} className="gap-2">
              <Plus className="size-4" />
              Add Recurring
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Active Monthly Value</p>
            <CalendarDays className="size-4 text-primary" />
          </div>
          {loading ? <Skeleton className="mt-3 h-8 w-28" /> : <p className="mt-3 text-2xl font-bold">{currency(activeTotal)}</p>}
          <p className="mt-1 text-xs text-muted-foreground">{scopeTitle}</p>
        </div>
        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Filtered Value</p>
            <TrendingDown className="size-4 text-primary" />
          </div>
          {loading ? <Skeleton className="mt-3 h-8 w-28" /> : <p className="mt-3 text-2xl font-bold">{currency(filteredTotal)}</p>}
          <p className="mt-1 text-xs text-muted-foreground">Based on active filters</p>
        </div>
        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Schedules</p>
            <CalendarDays className="size-4 text-primary" />
          </div>
          {loading ? <Skeleton className="mt-3 h-8 w-16" /> : <p className="mt-3 text-2xl font-bold">{totalRows}</p>}
          <p className="mt-1 text-xs text-muted-foreground">Server paginated</p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        emptyText="No recurring expense records found."
        getRowId={(row) => row.id}
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
                placeholder="Search recurring expenses..."
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
                <Select value={frequency} onValueChange={(value) => updateFilter(() => setFrequency(value))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Frequency" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All frequencies</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-44 shrink-0">
                <Select value={status} onValueChange={(value) => updateFilter(() => setStatus(value))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {activeFilterCount > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  className="shrink-0"
                  onClick={() => updateFilter(() => {
                    setPaymentMethod("all");
                    setFrequency("all");
                    setStatus("all");
                  })}
                >
                  Clear
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}
      />

      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setEditingRow(null);
        }}
      >
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingRow ? "Edit Recurring Expense" : "Add Recurring Expense"}</DialogTitle>
            <DialogDescription>
              {editingRow ? "Update this repeating expense schedule and keep the old values in history." : "Add a repeating monthly or yearly expense schedule."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="recurring-title">Expense Name</Label>
              <Input
                id="recurring-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="e.g. Rent, Domain, SSL, Tea contract"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Category <span className="text-rose-500">*</span></Label>
                <Link
                  href="/admin/finance/categories"
                  target="_blank"
                  className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <Tags className="size-3" />
                  Manage Categories
                </Link>
              </div>
              <Select
                value={form.category_ids[0] ?? ""}
                onValueChange={(value) => setForm((current) => ({ ...current, category_ids: value ? [value] : [] }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select recurring category" />
                </SelectTrigger>
                <SelectContent>
                  {(categories.length > 0 ? categories : DEFAULT_RECURRING_CATEGORIES).map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
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
            <div className="space-y-2">
              <Label htmlFor="recurring-amount">Amount</Label>
              <Input
                id="recurring-amount"
                type="text"
                inputMode="decimal"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: normalizeAmountInput(event.target.value) }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={(value) => setForm((current) => ({ ...current, frequency: value }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select
                value={form.payment_status}
                onValueChange={(value) => setForm((current) => ({ ...current, payment_status: value }))}
              >
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="due">Due</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recurring-reminder-days">Reminder Days Earlier</Label>
              <Input
                id="recurring-reminder-days"
                type="number"
                min={0}
                max={365}
                value={form.reminder_days_before}
                onChange={(event) => setForm((current) => ({ ...current, reminder_days_before: event.target.value }))}
                placeholder="3"
              />
            </div>
            <div className="space-y-2">
              <Label>Start Date</Label>
              <DatePicker
                value={form.start_date}
                onChange={(value) => setForm((current) => ({ ...current, start_date: value }))}
                placeholder="Select start date"
                toYear={new Date().getFullYear() + 5}
              />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <DatePicker
                value={form.end_date}
                onChange={(value) => setForm((current) => ({ ...current, end_date: value }))}
                placeholder="Select end date"
                fromYear={new Date().getFullYear() - 1}
                toYear={new Date().getFullYear() + 10}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Optional notes"
                className="min-h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveRecurringExpense} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              {editingRow ? "Update Recurring" : "Save Recurring"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Delete Recurring Expense</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this recurring expense schedule &quot;{deletingRow?.title}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={deleteRecurringExpense} disabled={deleting} className="gap-2">
              {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isMobile ? (
        <Drawer open={Boolean(selectedRow)} onOpenChange={(open) => !open && setSelectedRow(null)}>
          <DrawerContent className="max-h-[92dvh]">
            <DrawerHeader className="border-b text-left">
              <DrawerTitle>{selectedRow?.title}</DrawerTitle>
              <DrawerDescription>{selectedRow ? FREQUENCY_LABELS[selectedRow.frequency] : ""}</DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6">
              {selectedRow ? (
                <DetailContent row={selectedRow} history={selectedHistory} historyLoading={historyLoading} />
              ) : null}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={Boolean(selectedRow)} onOpenChange={(open) => !open && setSelectedRow(null)}>
          <SheetContent className="w-full overflow-y-auto p-0 sm:max-w-xl">
            <SheetHeader className="border-b px-6 py-5 text-left">
              <SheetTitle>{selectedRow?.title}</SheetTitle>
              <SheetDescription>{selectedRow ? FREQUENCY_LABELS[selectedRow.frequency] : ""}</SheetDescription>
            </SheetHeader>
            <div className="px-6 py-6">
              {selectedRow ? (
                <DetailContent row={selectedRow} history={selectedHistory} historyLoading={historyLoading} />
              ) : null}
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
