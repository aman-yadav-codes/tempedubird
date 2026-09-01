"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  CreditCard,
  Download,
  FileText,
  IndianRupee,
  ListFilter,
  Loader2,
  MoreHorizontal,
  Printer,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { DatePicker } from "@/components/shared/date-picker";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { hasPermission, isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import type { FinanceInvoiceRow } from "@/lib/queries/finance";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

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
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  net_banking: "Net Banking",
};

export function InvoicesClient() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitutionId, activeInstitution } = useActiveInstitution();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isPlatformScope = isPlatformAdmin || hasPermission(user, "finance.platform.income.view");
  const targetInstitutionId = isPlatformScope ? null : activeInstitutionId;

  const authHeader = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    [accessToken]
  );

  const [rows, setRows] = useState<FinanceInvoiceRow[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [totalAmount, setTotalAmount] = useState<string | number>("0");
  const [thisMonthTotal, setThisMonthTotal] = useState<string | number>("0");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("all");
  const [status, setStatus] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
  const [selectedInvoice, setSelectedInvoice] = useState<FinanceInvoiceRow | null>(null);
  const [deletingRow, setDeletingRow] = useState<FinanceInvoiceRow | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchInvoices = useCallback(async () => {
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
        status,
      });
      if (targetInstitutionId) params.set("institutionId", String(targetInstitutionId));
      if (fromDate) params.set("from", fromDate);
      if (toDate) params.set("to", toDate);

      const res = await fetch(`/api/admin/finance/invoices?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load invoices");

      setRows(json.data || []);
      setTotalRows(json.meta?.total || 0);
      setTotalAmount(json.meta?.total_amount || 0);
      setThisMonthTotal(json.meta?.this_month_total || 0);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load invoices");
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
    status,
    targetInstitutionId,
    toDate,
  ]);

  useEffect(() => {
    void fetchInvoices();
  }, [fetchInvoices]);

  function updateFilter(updater: () => void) {
    updater();
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  async function deleteInvoice() {
    if (!deletingRow || !accessToken) return;
    setDeleting(true);
    try {
      const params = targetInstitutionId ? `?institutionId=${targetInstitutionId}` : "";
      const res = await fetch(`/api/admin/finance/invoices/${deletingRow.id}${params}`, {
        method: "DELETE",
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete invoice");
      toast.success("Invoice deleted successfully");
      setDeleteOpen(false);
      setDeletingRow(null);
      void fetchInvoices();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete invoice");
    } finally {
      setDeleting(false);
    }
  }

  const columns = useMemo<ColumnDef<FinanceInvoiceRow>[]>(() => [
    {
      accessorKey: "invoice_number",
      header: "Invoice #",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => setSelectedInvoice(row.original)}
          className="font-mono text-xs font-semibold text-primary hover:underline flex items-center gap-1.5 cursor-pointer text-left"
        >
          <FileText className="size-3.5 text-muted-foreground" />
          {row.original.invoice_number}
        </button>
      ),
    },
    {
      accessorKey: "invoice_date",
      header: "Date",
      cell: ({ row }) => <span className="text-xs">{formatDate(row.original.invoice_date)}</span>,
    },
    {
      accessorKey: "payer_name",
      header: "Billed To / Payer",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-xs text-foreground">{row.original.payer_name}</p>
          <p className="text-[11px] text-muted-foreground">{row.original.category_name}</p>
        </div>
      ),
    },
    {
      accessorKey: "receiver_name",
      header: "Received By",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.receiver_name}</span>,
    },
    {
      accessorKey: "payment_method",
      header: "Method",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs capitalize">
          {PAYMENT_METHOD_LABELS[row.original.payment_method] || row.original.payment_method}
        </Badge>
      ),
    },
    {
      accessorKey: "total_amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => (
        <div className="text-right font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
          {currency(row.original.total_amount)}
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={cn(
            "text-[11px] font-semibold uppercase tracking-wider",
            row.original.status === "paid" ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10" : "border-amber-500/40 text-amber-600 bg-amber-500/10"
          )}
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedInvoice(row.original)} className="gap-2 cursor-pointer">
              <FileText className="size-4" />
              View &amp; Print Receipt
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 text-rose-600 font-medium cursor-pointer"
              onClick={() => {
                setDeletingRow(row.original);
                setDeleteOpen(true);
              }}
            >
              <Trash2 className="size-4" />
              Delete Invoice
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

  const activeFilterCount = [
    paymentMethod !== "all",
    status !== "all",
    Boolean(fromDate),
    Boolean(toDate),
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* HEADER & SUMMARY CARDS */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="size-4 text-primary" />
            Finance Invoices &amp; Receipts
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
            <p className="text-sm text-muted-foreground">
              Automatically generated and saved receipts for all recorded income.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 shadow-2xs">
          <p className="text-xs font-medium text-muted-foreground">Total Invoices</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{totalRows}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-2xs">
          <p className="text-xs font-medium text-muted-foreground">Total Revenue Invoiced</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {currency(totalAmount)}
          </p>
        </div>
        <div className="rounded-xl border bg-card p-4 shadow-2xs">
          <p className="text-xs font-medium text-muted-foreground">This Month Invoiced</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-primary">
            {currency(thisMonthTotal)}
          </p>
        </div>
      </div>

      {/* DATA TABLE & FILTERS */}
      <DataTable
        columns={columns}
        data={rows}
        pageCount={Math.max(1, Math.ceil(totalRows / pagination.pageSize))}
        pagination={pagination}
        onPaginationChange={setPagination}
        loading={loading}
        toolbarLeft={
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => updateFilter(() => setSearch(e.target.value))}
              placeholder="Search invoice #, payer, category..."
              className="pl-8 bg-background"
            />
          </div>
        }
        toolbarRight={
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={filtersOpen ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFiltersOpen((prev) => !prev)}
              className="gap-1.5 cursor-pointer"
            >
              <ListFilter className="size-4" />
              Filters
              {activeFilterCount > 0 && (
                <Badge variant="secondary" className="px-1.5 py-0 text-[10px] h-4">
                  {activeFilterCount}
                </Badge>
              )}
              <ChevronDown className={cn("size-3.5 transition-transform", filtersOpen && "rotate-180")} />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => void fetchInvoices()}
              disabled={loading}
              title="Refresh"
              className="cursor-pointer"
            >
              <RefreshCw className={cn("size-4", loading && "animate-spin")} />
            </Button>
          </div>
        }
        toolbarBelow={
          filtersOpen ? (
            <div className="rounded-lg border bg-card p-3 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                <Select value={paymentMethod} onValueChange={(val) => updateFilter(() => setPaymentMethod(val))}>
                  <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Payment Method" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Payment Methods</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI</SelectItem>
                    <SelectItem value="net_banking">Net Banking</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={status} onValueChange={(val) => updateFilter(() => setStatus(val))}>
                  <SelectTrigger className="w-full bg-background"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="due">Due</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <DatePicker
                  value={fromDate}
                  onChange={(val) => updateFilter(() => setFromDate(val))}
                  placeholder="From date"
                />

                <DatePicker
                  value={toDate}
                  onChange={(val) => updateFilter(() => setToDate(val))}
                  placeholder="To date"
                />
              </div>

              {activeFilterCount > 0 && (
                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => updateFilter(() => {
                      setPaymentMethod("all");
                      setStatus("all");
                      setFromDate("");
                      setToDate("");
                    })}
                    className="text-xs h-7 text-muted-foreground hover:text-foreground"
                  >
                    Clear Filters
                  </Button>
                </div>
              )}
            </div>
          ) : null
        }
      />

      {/* PRINTABLE RECEIPT / INVOICE MODAL */}
      <Dialog open={Boolean(selectedInvoice)} onOpenChange={(open) => !open && setSelectedInvoice(null)}>
        <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl p-0">
          <div className="p-6 space-y-6" id="printable-invoice">
            {/* INVOICE HEADER */}
            <div className="flex items-start justify-between border-b pb-5">
              <div>
                <h3 className="text-xl font-bold tracking-tight text-foreground">
                  {selectedInvoice?.institution_name || activeInstitution?.name || "Institution Receipt"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">Official Payment Receipt &amp; Invoice</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="font-mono text-xs font-semibold uppercase bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  {selectedInvoice?.status || "PAID"}
                </Badge>
                <p className="font-mono text-xs font-bold text-foreground mt-1.5">{selectedInvoice?.invoice_number}</p>
                <p className="text-[11px] text-muted-foreground">{formatDate(selectedInvoice?.invoice_date)}</p>
              </div>
            </div>

            {/* DETAILS GRID */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Billed To (Payer)</p>
                <p className="font-bold text-sm text-foreground">{selectedInvoice?.payer_name}</p>
                <p className="text-muted-foreground">Category: {selectedInvoice?.category_name}</p>
              </div>
              <div className="rounded-lg border bg-muted/20 p-3 space-y-1">
                <p className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">Payment Details</p>
                <p className="font-bold text-sm text-foreground capitalize">
                  {PAYMENT_METHOD_LABELS[selectedInvoice?.payment_method || "cash"] || selectedInvoice?.payment_method}
                </p>
                <p className="text-muted-foreground">Received By: {selectedInvoice?.receiver_name}</p>
              </div>
            </div>

            {/* LINE ITEM TABLE */}
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50 border-b text-muted-foreground font-semibold">
                    <th className="p-2.5 text-left">Description</th>
                    <th className="p-2.5 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="p-2.5">
                      <p className="font-medium text-foreground">{selectedInvoice?.category_name}</p>
                      {selectedInvoice?.notes && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{selectedInvoice.notes}</p>
                      )}
                    </td>
                    <td className="p-2.5 text-right font-mono font-medium">{currency(selectedInvoice?.amount)}</td>
                  </tr>
                  <tr className="bg-muted/20 font-bold">
                    <td className="p-2.5 text-foreground">Total Paid</td>
                    <td className="p-2.5 text-right font-mono text-emerald-600 text-sm">{currency(selectedInvoice?.total_amount)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="text-center text-[11px] text-muted-foreground border-t pt-4">
              <p>This is a computer generated receipt and does not require physical signature.</p>
              <p className="mt-0.5">Thank you for your payment!</p>
            </div>
          </div>

          <DialogFooter className="border-t p-4 sm:justify-between bg-muted/10">
            <Button variant="outline" size="sm" onClick={() => setSelectedInvoice(null)}>
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-2 cursor-pointer"
              onClick={() => {
                window.print();
              }}
            >
              <Printer className="size-4" />
              Print Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE CONFIRMATION DIALOG */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete invoice {deletingRow?.invoice_number}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteInvoice} disabled={deleting} className="gap-2">
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
