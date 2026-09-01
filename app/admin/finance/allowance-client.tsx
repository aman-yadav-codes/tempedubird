"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  CalendarDays,
  ChevronDown,
  FileText,
  IndianRupee,
  ListFilter,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  UserRound,
  WalletCards,
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
import { hasPermission, isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

type AllowanceUserOption = {
  id: number;
  full_name: string;
  email: string | null;
  role_label: string | null;
};

type AllowanceRow = {
  row_id: string;
  id: number;
  scope_type: "platform" | "institution";
  institution_id: number | null;
  institution_name: string | null;
  user_id: number;
  user_name: string;
  user_email: string | null;
  role_label: string | null;
  allowance_date: string;
  amount: string | number;
  spent_amount: string | number;
  balance_amount: string | number;
  payment_method: "cash" | "upi" | "net_banking";
  invoice_url: string | null;
  invoice_public_id: string | null;
  invoice_resource_type: string | null;
  invoice_file_name: string | null;
  description: string | null;
  created_at: string;
};

type AllowanceResponse = {
  data: AllowanceRow[];
  meta: {
    total: number;
    filtered_total: string | number;
    this_month_total: string | number;
    cash_in_hand_total?: string | number;
    users: AllowanceUserOption[];
  };
};

type AllowanceSpendRow = {
  row_id: string;
  id: number;
  allowance_id: number;
  spend_date: string;
  amount: string | number;
  payment_method: "cash" | "upi" | "net_banking";
  invoice_url: string | null;
  invoice_public_id: string | null;
  invoice_resource_type: string | null;
  invoice_file_name: string | null;
  description: string | null;
  created_at: string;
};

type MyAllowanceResponse = {
  data: AllowanceSpendRow[];
  meta: {
    total: number;
    filtered_total: string | number;
    this_month_total: string | number;
    this_month_allowance_total: string | number;
    issued_total: string | number;
    spent_total: string | number;
    balance_total: string | number;
    allowances: AllowanceRow[];
  };
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  net_banking: "Net Banking",
};

function currency(value: string | number | null | undefined) {
  const num = Number(value) || 0;
  if (num < 0) {
    const formattedPos = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Math.abs(num));
    return `-${formattedPos}`;
  }
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
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

function DetailContent({ row, userLabel }: { row: AllowanceRow; userLabel: string }) {
  const details = [
    ["Date", formatDate(row.allowance_date)],
    ["Amount", currency(row.amount)],
    ["Method", PAYMENT_METHOD_LABELS[row.payment_method] ?? row.payment_method],
    [userLabel, row.user_name],
    ["Email", row.user_email || "-"],
    ["Role", row.role_label || "-"],
    ["Institution", row.institution_name || "-"],
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/10 p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">Allowance Amount</p>
        <p className="mt-2 text-2xl font-bold">{currency(row.amount)}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {row.user_name} on {formatDate(row.allowance_date)}
        </p>
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

function AllowanceDetailContent({
  row,
  userLabel,
  spends,
  spendsLoading,
}: {
  row: AllowanceRow;
  userLabel: string;
  spends: AllowanceSpendRow[];
  spendsLoading: boolean;
}) {
  return (
    <div className="space-y-5">
      <DetailContent row={row} userLabel={userLabel} />
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ["Allowance Issued", row.amount, "Total issued allowance"],
          ["Total Spent", row.spent_amount, "Recorded expenditures & expenses"],
          ["Cash in Hand", row.balance_amount, "Current cash in hand"],
        ].map(([label, value, helper]) => (
          <div key={label} className="rounded-md border bg-card p-4">
            <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
            <p className="mt-2 text-xl font-bold">{currency(value)}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{helper}</p>
          </div>
        ))}
      </div>
      <div className="rounded-md border">
        <div className="border-b p-4">
          <h3 className="font-semibold">Expenditure History</h3>
          <p className="text-xs text-muted-foreground">Expenses recorded from this allowance.</p>
        </div>
        <div className="divide-y">
          {spendsLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="grid gap-2 p-4 sm:grid-cols-[1fr_1.5fr_auto]">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))
          ) : spends.length ? (
            spends.map((spend) => (
              <div key={spend.row_id} className="grid gap-2 p-4 text-sm sm:grid-cols-[1fr_1.5fr_auto] sm:items-center">
                <div>
                  <p className="font-medium">{formatDate(spend.spend_date)}</p>
                  <p className="text-xs text-muted-foreground">{PAYMENT_METHOD_LABELS[spend.payment_method]}</p>
                </div>
                <p className="text-muted-foreground">{spend.description || "-"}</p>
                <p className="font-semibold">{currency(spend.amount)}</p>
              </div>
            ))
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">No expenditure recorded for this allowance.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function SpendDetailContent({ row }: { row: AllowanceSpendRow }) {
  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/10 p-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">Spent Amount</p>
        <p className="mt-2 text-2xl font-bold">{currency(row.amount)}</p>
        <p className="mt-1 text-sm text-muted-foreground">{formatDate(row.spend_date)}</p>
      </div>
      <div className="grid gap-3 rounded-md border p-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Method</p>
          <p className="mt-1 text-sm font-semibold">{PAYMENT_METHOD_LABELS[row.payment_method]}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase text-muted-foreground">Allowance</p>
          <p className="mt-1 text-sm font-semibold">#{row.allowance_id}</p>
        </div>
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

function MyAllowanceClient() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitutionId } = useActiveInstitution();
  const isMobile = useIsMobile();
  const authHeader = useMemo(() => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), [accessToken]);

  const [rows, setRows] = useState<AllowanceSpendRow[]>([]);
  const [allowances, setAllowances] = useState<AllowanceRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [balanceTotal, setBalanceTotal] = useState<string | number>("0");
  const [thisMonthTotal, setThisMonthTotal] = useState<string | number>("0");
  const [thisMonthAllowanceTotal, setThisMonthAllowanceTotal] = useState<string | number>("0");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [selectedRow, setSelectedRow] = useState<AllowanceSpendRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [invoiceFiles, setInvoiceFiles] = useState<UploadedDocumentFile[]>([]);
  const [form, setForm] = useState({
    allowance_id: "",
    payment_method: "cash",
    spend_date: todayText(),
    amount: "",
    description: "",
  });

  const fetchMyAllowance = useCallback(async () => {
    if (!isReady || !accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search,
        paymentMethod,
      });
      if (activeInstitutionId) params.set("institutionId", String(activeInstitutionId));
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);
      const res = await fetch(`/api/admin/finance/allowance/usage?${params.toString()}`, { headers: authHeader });
      const json = await res.json() as MyAllowanceResponse | { error?: string };
      if (!res.ok) throw new Error("error" in json ? json.error : "Failed to load expenditure history");
      const payload = json as MyAllowanceResponse;
      setRows(payload.data);
      setTotalRows(payload.meta.total);
      setBalanceTotal(payload.meta.balance_total);
      setThisMonthTotal(payload.meta.this_month_total);
      setThisMonthAllowanceTotal(payload.meta.this_month_allowance_total);
      setAllowances(payload.meta.allowances);
      setForm((current) => ({
        ...current,
        allowance_id: current.allowance_id || String(payload.meta.allowances.find((row) => Number(row.balance_amount) > 0)?.id ?? ""),
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load expenditure history");
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeInstitutionId, authHeader, fromDate, isReady, pagination.pageIndex, pagination.pageSize, paymentMethod, search, toDate]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchMyAllowance();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchMyAllowance]);

  function updateFilter(updater: () => void) {
    updater();
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  async function saveSpend() {
    if (!accessToken) return;
    if (!form.allowance_id) {
      toast.error("Select an allowance balance.");
      return;
    }
    setSaving(true);
    try {
      const invoice = invoiceFiles[0] ?? null;
      const res = await fetch("/api/admin/finance/allowance/usage", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          allowance_id: Number(form.allowance_id),
          payment_method: form.payment_method,
          spend_date: form.spend_date,
          amount: Number(form.amount),
          description: form.description.trim(),
          invoice_url: invoice?.url ?? null,
          invoice_public_id: invoice?.publicId ?? null,
          invoice_resource_type: invoice?.resourceType ?? null,
          invoice_file_name: invoice?.name ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add expenditure");
      toast.success("Expenditure added");
      setAddOpen(false);
      setForm({ allowance_id: "", payment_method: "cash", spend_date: todayText(), amount: "", description: "" });
      setInvoiceFiles([]);
      void fetchMyAllowance();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add expenditure");
    } finally {
      setSaving(false);
    }
  }

  const columns = useMemo<ColumnDef<AllowanceSpendRow>[]>(() => [
    {
      accessorKey: "spend_date",
      header: "Date",
      cell: ({ row }) => <span className="font-medium">{formatDate(row.original.spend_date)}</span>,
    },
    {
      accessorKey: "payment_method",
      header: "Method",
      cell: ({ row }) => <Badge variant="outline">{PAYMENT_METHOD_LABELS[row.original.payment_method]}</Badge>,
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="line-clamp-1">{row.original.description || "-"}</span>,
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
  const activeFilterCount = [paymentMethod !== "all", Boolean(fromDate), Boolean(toDate)].filter(Boolean).length;
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isInstitutionAdmin = isInstitutionAdminUser(user);
  const spendableAllowances = allowances.filter((row) => Number(row.balance_amount) > 0);
  const canCreateExpenditure = isPlatformAdmin || isInstitutionAdmin || Boolean(activeInstitutionId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <IndianRupee className="size-4 text-primary" />
            Finance allowance
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Allowance</h1>
            <p className="text-sm text-muted-foreground">Track allowance issued to you, your expenditure, and remaining balance.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={fetchMyAllowance} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
          {canCreateExpenditure ? (
            <Button size="sm" onClick={() => setAddOpen(true)} disabled={spendableAllowances.length === 0} className="gap-2">
              <Plus className="size-4" />
              Add Expenditure
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["This Month Allowance", thisMonthAllowanceTotal, "Funds issued this month"],
          ["This Month Expenditure", thisMonthTotal, "Amount spent this month"],
          ["Remaining Amount", balanceTotal, "Available allowance balance"],
        ].map(([label, value, helper]) => (
          <div key={label} className="rounded-md border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            {loading ? (
              <div className="mt-3 space-y-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-4 w-32" />
              </div>
            ) : (
              <>
                <p className="mt-3 text-2xl font-bold">{currency(value)}</p>
                <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
              </>
            )}
          </div>
        ))}
      </div>

      <DataTable
        columns={columns}
        data={rows}
        loading={loading}
        emptyText="No expenditure records found."
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
              <Input value={search} onChange={(event) => updateFilter(() => setSearch(event.target.value))} placeholder="Search expenditure..." className="w-full pl-8 sm:w-80" />
            </div>
            <Button type="button" variant={filtersOpen ? "secondary" : "outline"} onClick={() => setFiltersOpen((current) => !current)} className="w-full justify-center gap-2 sm:w-fit">
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
              <Input type="date" value={fromDate} onChange={(event) => updateFilter(() => setFromDate(event.target.value))} className="w-44 shrink-0" />
              <Input type="date" value={toDate} onChange={(event) => updateFilter(() => setToDate(event.target.value))} className="w-44 shrink-0" />
            </div>
          </div>
        ) : null}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Expenditure</DialogTitle>
            <DialogDescription>Record an expense made from allowance funds issued to you.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Allowance Balance</Label>
              <Select value={form.allowance_id} onValueChange={(value) => setForm((current) => ({ ...current, allowance_id: value }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Select allowance" /></SelectTrigger>
                <SelectContent>
                  {spendableAllowances.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {formatDate(option.allowance_date)} - {currency(option.balance_amount)} available
                    </SelectItem>
                  ))}
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
              <DatePicker value={form.spend_date} onChange={(value) => setForm((current) => ({ ...current, spend_date: value }))} placeholder="Select expenditure date" toYear={new Date().getFullYear() + 1} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="spend-amount">Spent Amount</Label>
              <Input
                id="spend-amount"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: normalizeAmountInput(event.target.value) }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Invoice Attachment</Label>
              <DocumentFileUpload accessToken={accessToken} files={invoiceFiles} onFilesChange={setInvoiceFiles} maxFiles={1} maxSize={10 * 1024 * 1024} accept="image/*,application/pdf" compact buttonLabel="Upload Invoice" emptyText="Upload image or PDF invoice (optional)" disabled={saving} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="spend-description">Description</Label>
              <Textarea id="spend-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="What was this expenditure for?" className="min-h-24" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveSpend} disabled={saving || spendableAllowances.length === 0} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Save Expenditure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isMobile ? (
        <Drawer open={Boolean(selectedRow)} onOpenChange={(open) => !open && setSelectedRow(null)}>
          <DrawerContent className="max-h-[92dvh]">
            <DrawerHeader>
              <DrawerTitle>Expenditure Details</DrawerTitle>
              <DrawerDescription>{selectedRow ? formatDate(selectedRow.spend_date) : ""}</DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6">{selectedRow ? <SpendDetailContent row={selectedRow} /> : null}</div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={Boolean(selectedRow)} onOpenChange={(open) => !open && setSelectedRow(null)}>
          <SheetContent side="right" className="overflow-y-auto p-0" defaultSize={520} minSize={420}>
            <SheetHeader className="border-b p-5">
              <SheetTitle>Expenditure Details</SheetTitle>
              <SheetDescription>{selectedRow ? formatDate(selectedRow.spend_date) : ""}</SheetDescription>
            </SheetHeader>
            <div className="p-5">{selectedRow ? <SpendDetailContent row={selectedRow} /> : null}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

export function AllowanceClient() {
  const { user } = useAuthStore();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isInstitutionAdmin = isInstitutionAdminUser(user);
  return isPlatformAdmin || isInstitutionAdmin ? <AdminAllowanceClient /> : <MyAllowanceClient />;
}

function AdminAllowanceClient() {
  const pathname = usePathname();
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitutionId, activeInstitution } = useActiveInstitution();
  const isMobile = useIsMobile();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isPlatformSection = pathname?.startsWith("/platformadmin");
  const isPlatformScope = isPlatformSection || (!activeInstitutionId && (isPlatformAdmin || hasPermission(user, "finance.platform.allowance.view")));
  const targetInstitutionId = isPlatformSection ? null : (activeInstitutionId ?? null);
  const authHeader = useMemo(() => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), [accessToken]);

  const [rows, setRows] = useState<AllowanceRow[]>([]);
  const [ownAllowances, setOwnAllowances] = useState<AllowanceRow[]>([]);
  const [users, setUsers] = useState<AllowanceUserOption[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [filteredTotal, setFilteredTotal] = useState<string | number>("0");
  const [thisMonthTotal, setThisMonthTotal] = useState<string | number>("0");
  const [cashInHandTotal, setCashInHandTotal] = useState<string | number>("0");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [userFilter, setUserFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [selectedRow, setSelectedRow] = useState<AllowanceRow | null>(null);
  const [selectedRowSpends, setSelectedRowSpends] = useState<AllowanceSpendRow[]>([]);
  const [selectedRowSpendsLoading, setSelectedRowSpendsLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [expenditureOpen, setExpenditureOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expenditureSaving, setExpenditureSaving] = useState(false);
  const [invoiceFiles, setInvoiceFiles] = useState<UploadedDocumentFile[]>([]);
  const [expenditureInvoiceFiles, setExpenditureInvoiceFiles] = useState<UploadedDocumentFile[]>([]);
  const [form, setForm] = useState({
    user_id: "",
    payment_method: "cash",
    allowance_date: todayText(),
    amount: "",
    description: "",
  });
  const [expenditureForm, setExpenditureForm] = useState({
    allowance_id: "",
    payment_method: "cash",
    spend_date: todayText(),
    amount: "",
    description: "",
  });

  const isInstitutionAdmin = isInstitutionAdminUser(user);
  const canCreate = isPlatformAdmin || isInstitutionAdmin || Boolean(targetInstitutionId) || (
    isPlatformScope
      ? hasPermission(user, "finance.platform.allowance.create") || hasPermission(user, "finance.platform.allowance")
      : Boolean(
          targetInstitutionId &&
            (hasPermission(user, "finance.allowance.create", { institutionId: targetInstitutionId }) ||
             hasPermission(user, "finance.allowance", { institutionId: targetInstitutionId }))
        )
  );
  const personLabel = isPlatformScope ? "User" : "Employee";
  const pageTitle = isPlatformScope ? "Platform Allowance" : `${activeInstitution?.name ?? "Institution"} Allowance`;

  const fetchOwnAllowanceBalances = useCallback(async () => {
    if (!isReady || !accessToken) return;
    try {
      const params = new URLSearchParams({
        page: "1",
        limit: "1",
        search: "",
        paymentMethod: "all",
      });
      if (targetInstitutionId) params.set("institutionId", String(targetInstitutionId));

      const res = await fetch(`/api/admin/finance/allowance/usage?${params.toString()}`, { headers: authHeader });
      const json = await res.json() as MyAllowanceResponse | { error?: string };
      if (!res.ok) throw new Error("error" in json ? json.error : "Failed to load expenditure balances");

      const payload = json as MyAllowanceResponse;
      setOwnAllowances(payload.meta.allowances);
      setExpenditureForm((current) => ({
        ...current,
        allowance_id: current.allowance_id || String(payload.meta.allowances.find((row) => Number(row.balance_amount) > 0)?.id ?? ""),
      }));
    } catch {
      setOwnAllowances([]);
    }
  }, [accessToken, authHeader, isReady, targetInstitutionId]);

  const fetchAllowance = useCallback(async () => {
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
      });
      if (targetInstitutionId) params.set("institutionId", String(targetInstitutionId));
      if (userFilter !== "all") params.set("userId", userFilter);
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const res = await fetch(`/api/admin/finance/allowance?${params.toString()}`, { headers: authHeader });
      const json = await res.json() as AllowanceResponse | { error?: string };
      if (!res.ok) throw new Error("error" in json ? json.error : "Failed to load allowances");

      const payload = json as AllowanceResponse;
      setRows(payload.data);
      setTotalRows(payload.meta.total);
      setFilteredTotal(payload.meta.filtered_total);
      setThisMonthTotal(payload.meta.this_month_total);
      setCashInHandTotal(payload.meta.cash_in_hand_total ?? "0");
      setUsers(payload.meta.users);
      setForm((current) => ({
        ...current,
        user_id: current.user_id || String(payload.meta.users[0]?.id ?? ""),
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load allowances");
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
    targetInstitutionId,
    toDate,
    userFilter,
  ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchAllowance();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchAllowance]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchOwnAllowanceBalances();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchOwnAllowanceBalances]);

  useEffect(() => {
    if (!selectedRow || !accessToken) {
      return;
    }

    const controller = new AbortController();
    async function fetchSelectedAllowanceSpends() {
      setSelectedRowSpendsLoading(true);
      try {
        const params = new URLSearchParams({
          allowanceId: String(selectedRow.id),
          page: "1",
          limit: "50",
          search: "",
          paymentMethod: "all",
        });
        const res = await fetch(`/api/admin/finance/allowance/usage?${params.toString()}`, {
          headers: authHeader,
          signal: controller.signal,
        });
        const json = await res.json() as MyAllowanceResponse | { error?: string };
        if (!res.ok) throw new Error("error" in json ? json.error : "Failed to load expenditure history");
        setSelectedRowSpends((json as MyAllowanceResponse).data);
      } catch (error) {
        if (!controller.signal.aborted) {
          toast.error(error instanceof Error ? error.message : "Failed to load expenditure history");
          setSelectedRowSpends([]);
        }
      } finally {
        if (!controller.signal.aborted) setSelectedRowSpendsLoading(false);
      }
    }

    void fetchSelectedAllowanceSpends();
    return () => controller.abort();
  }, [accessToken, authHeader, selectedRow]);

  function updateFilter(updater: () => void) {
    updater();
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  async function saveAllowance() {
    if (!accessToken) return;
    if (!canCreate) {
      toast.error("You do not have permission to add allowance.");
      return;
    }
    if (!form.user_id) {
      toast.error(`Select a ${personLabel.toLowerCase()}.`);
      return;
    }

    setSaving(true);
    try {
      const invoice = invoiceFiles[0] ?? null;
      const res = await fetch("/api/admin/finance/allowance", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: targetInstitutionId,
          user_id: Number(form.user_id),
          payment_method: form.payment_method,
          allowance_date: form.allowance_date,
          amount: Number(form.amount),
          description: form.description.trim(),
          invoice_url: invoice?.url ?? null,
          invoice_public_id: invoice?.publicId ?? null,
          invoice_resource_type: invoice?.resourceType ?? null,
          invoice_file_name: invoice?.name ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add allowance");
      toast.success("Allowance added");
      setAddOpen(false);
      setForm({
        user_id: String(users[0]?.id ?? ""),
        payment_method: "cash",
        allowance_date: todayText(),
        amount: "",
        description: "",
      });
      setInvoiceFiles([]);
      void fetchAllowance();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add allowance");
    } finally {
      setSaving(false);
    }
  }

  async function saveExpenditure() {
    if (!accessToken) return;
    if (!expenditureForm.allowance_id) {
      toast.error("Select an allowance balance.");
      return;
    }

    setExpenditureSaving(true);
    try {
      const invoice = expenditureInvoiceFiles[0] ?? null;
      const res = await fetch("/api/admin/finance/allowance/usage", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          allowance_id: Number(expenditureForm.allowance_id),
          payment_method: expenditureForm.payment_method,
          spend_date: expenditureForm.spend_date,
          amount: Number(expenditureForm.amount),
          description: expenditureForm.description.trim(),
          invoice_url: invoice?.url ?? null,
          invoice_public_id: invoice?.publicId ?? null,
          invoice_resource_type: invoice?.resourceType ?? null,
          invoice_file_name: invoice?.name ?? null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add expenditure");
      toast.success("Expenditure added");
      setExpenditureOpen(false);
      setExpenditureForm({
        allowance_id: "",
        payment_method: "cash",
        spend_date: todayText(),
        amount: "",
        description: "",
      });
      setExpenditureInvoiceFiles([]);
      void fetchAllowance();
      void fetchOwnAllowanceBalances();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add expenditure");
    } finally {
      setExpenditureSaving(false);
    }
  }

  const [editingRow, setEditingRow] = useState<AllowanceRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deletingRow, setDeletingRow] = useState<AllowanceRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function openEdit(row: AllowanceRow) {
    setEditingRow(row);
    setForm({
      user_id: String(row.user_id),
      payment_method: row.payment_method || "cash",
      allowance_date: row.allowance_date ? row.allowance_date.slice(0, 10) : todayText(),
      amount: String(row.amount || ""),
      description: row.description || "",
    });
    setEditOpen(true);
  }

  async function updateAllowance() {
    if (!editingRow || !accessToken) return;
    if (!form.user_id) {
      toast.error("Select a recipient user.");
      return;
    }
    if (!form.amount || Number(form.amount) <= 0) {
      toast.error("Enter a valid allowance amount.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/finance/allowance/${editingRow.id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: Number(form.user_id),
          payment_method: form.payment_method,
          allowance_date: form.allowance_date,
          amount: Number(form.amount),
          description: form.description.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update allowance");
      toast.success("Allowance record updated successfully");
      setEditOpen(false);
      setEditingRow(null);
      void fetchAllowance();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update allowance");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAllowance() {
    if (!deletingRow || !accessToken) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/finance/allowance/${deletingRow.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete allowance");
      toast.success("Allowance record deleted successfully");
      setDeleteOpen(false);
      setDeletingRow(null);
      void fetchAllowance();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete allowance");
    } finally {
      setDeleting(false);
    }
  }

  const columns = useMemo<ColumnDef<AllowanceRow>[]>(() => [
    {
      accessorKey: "allowance_date",
      header: "Date",
      cell: ({ row }) => <span className="font-medium">{formatDate(row.original.allowance_date)}</span>,
    },
    {
      accessorKey: "user_name",
      header: personLabel,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="truncate font-semibold">{row.original.user_name}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.user_email || row.original.role_label || "-"}</p>
        </div>
      ),
    },
    {
      accessorKey: "role_label",
      header: "Role",
      cell: ({ row }) => row.original.role_label || "-",
    },
    {
      accessorKey: "balance_amount",
      header: "Cash in Hand",
      cell: ({ row }) => {
        const balance = Number(row.original.balance_amount) || 0;
        const isNegative = balance < 0;
        return (
          <div className="flex flex-col">
            <span className={cn(
              "font-bold",
              isNegative
                ? "text-rose-600 dark:text-rose-400"
                : balance === 0
                ? "text-muted-foreground"
                : "text-emerald-600 dark:text-emerald-400"
            )}>
              {currency(row.original.balance_amount)}
            </span>
            {Number(row.original.spent_amount) > 0 ? (
              <span className={cn(
                "text-[10px]",
                isNegative ? "text-rose-600/80 font-medium" : "text-muted-foreground"
              )}>
                Spent: {currency(row.original.spent_amount)}
              </span>
            ) : null}
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Allowance Amount",
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
  ], [personLabel]);

  if (!isReady) return null;

  const pageCount = Math.max(1, Math.ceil(totalRows / pagination.pageSize));
  const activeFilterCount = [
    paymentMethod !== "all",
    userFilter !== "all",
    Boolean(fromDate),
    Boolean(toDate),
  ].filter(Boolean).length;
  const spendableOwnAllowances = ownAllowances.filter((row) => Number(row.balance_amount) > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <IndianRupee className="size-4 text-primary" />
            Finance allowance
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Allowance</h1>
            <p className="text-sm text-muted-foreground">
              {isPlatformScope
                ? "Track platform allowance funds issued to platform users."
                : "Track allowance funds issued to institution admins and teachers."}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={fetchAllowance} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Refresh
          </Button>
          {spendableOwnAllowances.length > 0 ? (
            <Button size="sm" onClick={() => setExpenditureOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Add Expenditure
            </Button>
          ) : null}
          {canCreate ? (
            <Button size="sm" onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="size-4" />
              Add Allowance
            </Button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">This Month Allowance</p>
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
              <p className="mt-1 text-xs text-muted-foreground">{pageTitle}</p>
            </>
          )}
        </div>
        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Total Allowance</p>
            <WalletCards className="size-4 text-primary" />
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
        <div className={cn(
          "rounded-md border bg-card p-5 transition-colors",
          Number(cashInHandTotal) < 0
            ? "border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/10"
            : "border-emerald-500/30 bg-emerald-500/5"
        )}>
          <div className="flex items-center justify-between gap-3">
            <p className={cn(
              "text-sm font-semibold",
              Number(cashInHandTotal) < 0 ? "text-rose-700 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300"
            )}>
              Total Cash in Hand
            </p>
            <IndianRupee className={cn(
              "size-4",
              Number(cashInHandTotal) < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
            )} />
          </div>
          {loading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-8 w-28" />
              <Skeleton className="h-4 w-36" />
            </div>
          ) : (
            <>
              <p className={cn(
                "mt-3 text-2xl font-bold",
                Number(cashInHandTotal) < 0 ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
              )}>
                {currency(cashInHandTotal)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {Number(cashInHandTotal) < 0 ? "Deficit: Spent exceeds allowance" : "After deducting expenses"}
              </p>
            </>
          )}
        </div>
        <div className="rounded-md border bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">Allowance Records</p>
            <UserRound className="size-4 text-primary" />
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
        emptyText="No allowance records found."
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
                placeholder="Search allowance..."
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
              <div className="w-56 shrink-0">
                <Select value={userFilter} onValueChange={(value) => updateFilter(() => setUserFilter(value))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder={personLabel} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All {personLabel.toLowerCase()}s</SelectItem>
                    {users.map((option) => (
                      <SelectItem key={option.id} value={String(option.id)}>
                        {option.full_name}
                      </SelectItem>
                    ))}
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
                    setUserFilter("all");
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
            <DialogTitle>Add Allowance</DialogTitle>
            <DialogDescription>
              Add a fund or allowance payout for a responsible {personLabel.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label>{personLabel} <span className="text-rose-500">*</span></Label>
                <span className="text-[11px] text-muted-foreground">
                  {users.length} {personLabel.toLowerCase()}{users.length === 1 ? "" : "s"} found
                </span>
              </div>
              <Select value={form.user_id} onValueChange={(value) => setForm((current) => ({ ...current, user_id: value }))}>
                <SelectTrigger className="w-full"><SelectValue placeholder={`Select ${personLabel.toLowerCase()}`} /></SelectTrigger>
                <SelectContent>
                  {users.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {option.full_name}{option.role_label ? ` (${option.role_label})` : ""}
                    </SelectItem>
                  ))}
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
                value={form.allowance_date}
                onChange={(value) => setForm((current) => ({ ...current, allowance_date: value }))}
                placeholder="Select allowance date"
                toYear={new Date().getFullYear() + 1}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="allowance-amount">Amount</Label>
              <Input
                id="allowance-amount"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                value={form.amount}
                onChange={(event) => setForm((current) => ({ ...current, amount: normalizeAmountInput(event.target.value) }))}
                placeholder="0.00"
              />
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
              <Label htmlFor="allowance-description">Description</Label>
              <Textarea
                id="allowance-description"
                value={form.description}
                onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="What this fund is for, usage notes, or handover details"
                className="min-h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={saveAllowance} disabled={saving || users.length === 0} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Save Allowance
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={expenditureOpen} onOpenChange={setExpenditureOpen}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Expenditure</DialogTitle>
            <DialogDescription>Record an expense made from allowance funds issued to you.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Allowance Balance</Label>
              <Select
                value={expenditureForm.allowance_id}
                onValueChange={(value) => setExpenditureForm((current) => ({ ...current, allowance_id: value }))}
              >
                <SelectTrigger className="w-full"><SelectValue placeholder="Select allowance" /></SelectTrigger>
                <SelectContent>
                  {spendableOwnAllowances.map((option) => (
                    <SelectItem key={option.id} value={String(option.id)}>
                      {formatDate(option.allowance_date)} - {currency(option.balance_amount)} available
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                value={expenditureForm.payment_method}
                onValueChange={(value) => setExpenditureForm((current) => ({ ...current, payment_method: value }))}
              >
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
                value={expenditureForm.spend_date}
                onChange={(value) => setExpenditureForm((current) => ({ ...current, spend_date: value }))}
                placeholder="Select expenditure date"
                toYear={new Date().getFullYear() + 1}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="admin-expenditure-amount">Spent Amount</Label>
              <Input
                id="admin-expenditure-amount"
                type="text"
                inputMode="decimal"
                pattern="[0-9]*[.]?[0-9]*"
                value={expenditureForm.amount}
                onChange={(event) => setExpenditureForm((current) => ({ ...current, amount: normalizeAmountInput(event.target.value) }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Invoice Attachment</Label>
              <DocumentFileUpload
                accessToken={accessToken}
                files={expenditureInvoiceFiles}
                onFilesChange={setExpenditureInvoiceFiles}
                maxFiles={1}
                maxSize={10 * 1024 * 1024}
                accept="image/*,application/pdf"
                compact
                buttonLabel="Upload Invoice"
                emptyText="Upload image or PDF invoice (optional)"
                disabled={expenditureSaving}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="admin-expenditure-description">Description</Label>
              <Textarea
                id="admin-expenditure-description"
                value={expenditureForm.description}
                onChange={(event) => setExpenditureForm((current) => ({ ...current, description: event.target.value }))}
                placeholder="What was this expenditure for?"
                className="min-h-24"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExpenditureOpen(false)} disabled={expenditureSaving}>Cancel</Button>
            <Button onClick={saveExpenditure} disabled={expenditureSaving || spendableOwnAllowances.length === 0} className="gap-2">
              {expenditureSaving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Save Expenditure
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT ALLOWANCE DIALOG */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit Allowance Entry</DialogTitle>
            <DialogDescription>Modify details of the issued allowance.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Recipient Employee <span className="text-rose-500">*</span></Label>
              <Select
                value={form.user_id}
                onValueChange={(value) => setForm((current) => ({ ...current, user_id: value }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.full_name}{u.role_label ? ` (${u.role_label})` : ""}
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
              <Label>Allowance Date</Label>
              <DatePicker
                value={form.allowance_date}
                onChange={(value) => setForm((current) => ({ ...current, allowance_date: value }))}
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
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={updateAllowance} disabled={saving} className="gap-2">
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
            <DialogTitle>Delete Allowance Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this allowance record of {deletingRow ? currency(deletingRow.amount) : ""}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={deleteAllowance} disabled={deleting} className="gap-2">
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
              <DrawerTitle>Allowance Details</DrawerTitle>
              <DrawerDescription>{selectedRow?.user_name ?? ""}</DrawerDescription>
            </DrawerHeader>
            <div className="overflow-y-auto px-4 pb-6">
              {selectedRow ? (
                <AllowanceDetailContent
                  row={selectedRow}
                  userLabel={personLabel}
                  spends={selectedRowSpends}
                  spendsLoading={selectedRowSpendsLoading}
                />
              ) : null}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Sheet open={Boolean(selectedRow)} onOpenChange={(open) => !open && setSelectedRow(null)}>
          <SheetContent side="right" className="overflow-y-auto p-0" defaultSize={520} minSize={420}>
            <SheetHeader className="border-b p-5">
              <SheetTitle>Allowance Details</SheetTitle>
              <SheetDescription>{selectedRow?.user_name ?? ""}</SheetDescription>
            </SheetHeader>
            <div className="p-5">
              {selectedRow ? (
                <AllowanceDetailContent
                  row={selectedRow}
                  userLabel={personLabel}
                  spends={selectedRowSpends}
                  spendsLoading={selectedRowSpendsLoading}
                />
              ) : null}
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
