"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  CalendarDays,
  ChevronDown,
  CreditCard,
  FileText,
  IndianRupee,
  ListFilter,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";

import { DatePicker } from "@/components/shared/date-picker";
import {
  DocumentFileUpload,
  type UploadedDocumentFile,
} from "@/components/shared/document-file-upload";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
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

type ExpenseResponse = {
  data: ExpenseRow[];
  meta: {
    total: number;
    filtered_total: string | number;
    this_month_total: string | number;
    due_total: string | number;
    due_count?: number;
    categories: ExpenseCategory[];
    paid_by_options: PaidByOption[];
  };
};

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
    ["Category", row.category_name],
    ["Method", PAYMENT_METHOD_LABELS[row.payment_method] ?? row.payment_method],
    ["Paid By", row.paid_by_label],
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
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitutionId } = useActiveInstitution();
  const isMobile = useIsMobile();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isPlatformScope = isPlatformAdmin || hasPermission(user, "finance.platform.expense.view");
  const targetInstitutionId = isPlatformScope ? null : activeInstitutionId;
  const authHeader = useMemo(() => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), [accessToken]);

  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [paidByOptions, setPaidByOptions] = useState<PaidByOption[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState<string | number>("0");
  const [thisMonthTotal, setThisMonthTotal] = useState<string | number>("0");
  const [dueTotal, setDueTotal] = useState<string | number>("0");
  const [dueCount, setDueCount] = useState(0);
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
    description: "",
  });

  function openEdit(row: ExpenseRow) {
    setEditingRow(row);
    setForm({
      category_id: String(row.category_id || ""),
      payment_method: row.payment_method || "cash",
      payment_status: row.payment_status || "paid",
      expense_date: row.expense_date ? row.expense_date.slice(0, 10) : todayText(),
      amount: String(row.amount || ""),
      paid_by: row.paid_by || "",
      description: row.description || "",
    });
    setEditOpen(true);
  }

  async function updateExpense() {
    if (!editingRow || !accessToken) return;
    if (!form.category_id) {
      toast.error("Select an expense category.");
      return;
    }
    if (!form.paid_by) {
      toast.error("Select Payer (Paid By).");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Enter a valid expense amount.");
      return;
    }
    setSaving(true);
    try {
      const paidByLabel = paidByOptions.find((opt) => opt.value === form.paid_by)?.label || form.paid_by;
      const res = await fetch(`/api/admin/finance/expense/${editingRow.source_id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          category_id: Number(form.category_id),
          payment_method: form.payment_method,
          payment_status: form.payment_status,
          paid_by: form.paid_by,
          paid_by_label: paidByLabel,
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

  const canCreate = isPlatformScope
    ? hasPermission(user, "finance.platform.expense.create")
    : Boolean(
        targetInstitutionId &&
          hasPermission(user, "finance.expense.create", { institutionId: targetInstitutionId })
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
      setCategories(payload.meta.categories);
      setPaidByOptions(payload.meta.paid_by_options);
      setForm((current) => ({
        ...current,
        category_id: current.category_id || String(payload.meta.categories[0]?.id ?? ""),
        paid_by: current.paid_by || payload.meta.paid_by_options[0]?.value || "",
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
    const paidBy = paidByOptions.find((item) => item.value === form.paid_by);
    if (!paidBy) {
      toast.error("Select who paid this expense.");
      return;
    }

    setSaving(true);
    try {
      const invoice = invoiceFiles[0] ?? null;
      const res = await fetch("/api/admin/finance/expense", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: targetInstitutionId,
          category_id: Number(form.category_id),
          payment_method: form.payment_method,
          payment_status: form.payment_status,
          expense_date: form.expense_date,
          amount: Number(form.amount),
          paid_by: paidBy.value,
          paid_by_label: paidBy.label,
          description: form.description.trim(),
          invoice_url: invoice?.url ?? null,
          invoice_public_id: invoice?.publicId ?? null,
          invoice_resource_type: invoice?.resourceType ?? null,
          invoice_file_name: invoice?.name ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add expense");
      toast.success("Expense added");
      setAddOpen(false);
      setForm({
        category_id: String(categories[0]?.id ?? ""),
        payment_method: "cash",
        payment_status: "paid",
        expense_date: todayText(),
        amount: "",
        paid_by: paidByOptions[0]?.value || "",
        description: "",
      });
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

      <div className="grid gap-3 md:grid-cols-3">
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
                Includes manual expenses + allowance + recurring expenses
              </p>
            </>
          )}
        </div>
        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Filtered Expense</p>
            <TrendingDown className="size-4 text-primary" />
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
            <p className="text-sm text-muted-foreground">Due Amount</p>
            <CreditCard className="size-4 text-primary" />
          </div>
          {loading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-4 w-32" />
            </div>
          ) : (
            <>
              <p className="mt-3 text-2xl font-bold">{currency(dueTotal)}</p>
              <p className="mt-1 text-xs text-muted-foreground">{dueCount} due records</p>
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
              <Label>Payment For</Label>
              <Select value={form.category_id} onValueChange={(value) => setForm((current) => ({ ...current, category_id: value }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map((category) => <SelectItem key={category.id} value={String(category.id)}>{category.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={form.payment_method} onValueChange={(value) => setForm((current) => ({ ...current, payment_method: value }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI</SelectItem>
                  <SelectItem value="net_banking">Net Banking</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <DatePicker
                value={form.expense_date}
                onChange={(value) => setForm((current) => ({ ...current, expense_date: value }))}
                placeholder="Select payment date"
                toYear={new Date().getFullYear() + 1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expense-amount">Amount</Label>
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
              <Label>Paid By</Label>
              <Select value={form.paid_by} onValueChange={(value) => setForm((current) => ({ ...current, paid_by: value }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select payer" /></SelectTrigger>
                <SelectContent>
                  {paidByOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Status</Label>
              <Select value={form.payment_status} onValueChange={(value) => setForm((current) => ({ ...current, payment_status: value }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="due">Due</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Invoice Attachment</Label>
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
              <Label htmlFor="expense-description">Description</Label>
              <Textarea
                id="expense-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="Optional notes"
                className="min-h-24"
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
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit Expense Record</DialogTitle>
            <DialogDescription>Modify operational expense details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Category</Label>
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
              <Label>Payment Method</Label>
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
            <div className="space-y-2">
              <Label>Payment Status</Label>
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
              <Label>Expense Date</Label>
              <DatePicker
                value={form.expense_date}
                onChange={(value) => setForm((current) => ({ ...current, expense_date: value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Amount (₹)</Label>
              <Input
                type="text"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm((current) => ({ ...current, amount: e.target.value }))}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Paid By</Label>
              <Select
                value={form.paid_by}
                onValueChange={(value) => setForm((current) => ({ ...current, paid_by: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Payer" />
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
            <div className="space-y-2 sm:col-span-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
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
    </div>
  );
}
