"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  IndianRupee,
  Landmark,
  Loader2,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  User,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DocumentFileUpload, type UploadedDocumentFile } from "@/components/shared/document-file-upload";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";

type Transaction = {
  transaction_id: string;
  raw_id: number;
  transaction_type: "income" | "expense";
  transaction_date: string;
  party_name: string;
  party_phone?: string;
  party_email?: string;
  category_name?: string;
  category_id?: number;
  payment_method: string;
  payment_status: "paid" | "partially_paid" | "unpaid" | "cancelled";
  transaction_status: "completed" | "pending" | "cancelled";
  total_amount: number | string;
  amount_settled: number | string;
  balance_pending: number | string;
  subtotal?: number | string;
  discount_amount?: number | string;
  tax_amount?: number | string;
  description?: string;
  reference_no?: string;
  bill_number?: string;
  invoice_id?: number;
  document_url?: string;
  items?: any;
  created_by_name?: string;
  created_at: string;
};

type Summary = {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  paidAmount: number;
  pendingAmount: number;
  incomeCount: number;
  expenseCount: number;
  totalTransactions: number;
};

type LineItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  total: number;
  inventoryId?: number;
};

function formatCurrency(amount: number | string) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(num);
}

type TransactionsClientProps = {
  initialType?: "all" | "income" | "expense";
  defaultAction?: "add-income" | "add-expense";
};

export function TransactionsClient({ initialType, defaultAction }: TransactionsClientProps = {}) {
  const searchParams = useSearchParams();
  const urlType = searchParams?.get("type") as "all" | "income" | "expense" | null;
  const urlAction = searchParams?.get("action");
  const { accessToken } = useAuthStore();
  const { activeInstitutionId } = useActiveInstitution();
  const authHeader = useMemo<Record<string, string>>(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    [accessToken]
  );
  const [expenseFiles, setExpenseFiles] = useState<UploadedDocumentFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary>({
    totalIncome: 0,
    totalExpenses: 0,
    netBalance: 0,
    paidAmount: 0,
    pendingAmount: 0,
    incomeCount: 0,
    expenseCount: 0,
    totalTransactions: 0,
  });

  // Lookups
  const [incomeCategories, setIncomeCategories] = useState<{ id: number; name: string }[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<{ id: number; name: string }[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);

  // Filters
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">(initialType || (urlType === "income" || urlType === "expense" ? urlType : "all"));
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [paymentMethodFilter, setPaymentMethodFilter] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Dialog states
  const [addIncomeOpen, setAddIncomeOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [billModalOpen, setBillModalOpen] = useState(false);
  const [recordPaymentOpen, setRecordPaymentOpen] = useState(false);
  const [selectedTxn, setSelectedTxn] = useState<Transaction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialType) {
      setTypeFilter(initialType);
    }
  }, [initialType]);

  useEffect(() => {
    if (defaultAction === "add-income" || urlAction === "add-income") {
      setAddIncomeOpen(true);
    } else if (defaultAction === "add-expense" || urlAction === "add-expense") {
      setAddExpenseOpen(true);
    }
  }, [defaultAction, urlAction]);

  // Form states - Income
  const [incomeForm, setIncomeForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    customerId: "",
    customerName: "",
    customerPhone: "",
    customerEmail: "",
    customerAddress: "",
    categoryId: "",
    referenceNo: "",
    description: "",
    paymentMethod: "cash",
    amountReceived: "",
    notes: "",
    documentUrl: "",
    items: [
      { id: "1", name: "", quantity: 1, unitPrice: 0, taxRate: 0, discount: 0, total: 0 },
    ] as LineItem[],
  });

  // Form states - Expense
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    vendorId: "",
    vendorName: "",
    vendorPhone: "",
    vendorEmail: "",
    categoryId: "",
    referenceNo: "",
    supplierInvoiceNo: "",
    description: "",
    paymentMethod: "cash",
    amountPaid: "",
    updateInventory: false,
    notes: "",
    documentUrl: "",
    items: [
      { id: "1", name: "", quantity: 1, unitPrice: 0, taxRate: 0, discount: 0, total: 0 },
    ] as LineItem[],
  });

  // Partial Payment Form
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    paymentDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "cash",
    referenceNo: "",
    notes: "",
  });

  // Fetch Transactions Data
  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);
      if (searchQuery) params.set("search", searchQuery);
      if (paymentStatusFilter !== "all") params.set("paymentStatus", paymentStatusFilter);
      if (paymentMethodFilter !== "all") params.set("paymentMethod", paymentMethodFilter);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      if (activeInstitutionId) params.set("institutionId", String(activeInstitutionId));
      params.set("page", String(currentPage));
      params.set("limit", "20");

      const res = await fetch(`/api/admin/finance/transactions?${params.toString()}`, {
        headers: authHeader,
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to load transactions");
      }
      const data = await res.json();

      setTransactions(data.transactions || []);
      if (data.summary) setSummary(data.summary);
      if (data.pagination) setTotalPages(data.pagination.totalPages || 1);

      if (data.lookups) {
        setIncomeCategories(data.lookups.incomeCategories || []);
        setExpenseCategories(data.lookups.expenseCategories || []);
        setCustomers(data.lookups.customers || []);
        setVendors(data.lookups.vendors || []);
        setInventoryItems(data.lookups.inventoryItems || []);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load transactions");
    } finally {
      setLoading(false);
    }
  }, [typeFilter, searchQuery, paymentStatusFilter, paymentMethodFilter, fromDate, toDate, currentPage, activeInstitutionId, authHeader]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Line item calculations helper
  const calculateTotals = (items: LineItem[]) => {
    let subtotal = 0;
    let totalDiscount = 0;
    let totalTax = 0;

    items.forEach((item) => {
      const lineBase = item.quantity * item.unitPrice;
      const lineDisc = item.discount || 0;
      const afterDisc = Math.max(0, lineBase - lineDisc);
      const lineTax = (afterDisc * (item.taxRate || 0)) / 100;
      subtotal += lineBase;
      totalDiscount += lineDisc;
      totalTax += lineTax;
    });

    const grandTotal = Math.max(0, subtotal - totalDiscount + totalTax);
    return { subtotal, totalDiscount, totalTax, grandTotal };
  };

  const incomeCalculations = useMemo(() => calculateTotals(incomeForm.items), [incomeForm.items]);
  const expenseCalculations = useMemo(() => calculateTotals(expenseForm.items), [expenseForm.items]);

  // Handle line item update for income
  const updateIncomeItem = (index: number, field: keyof LineItem, value: any) => {
    setIncomeForm((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index], [field]: value };
      const base = item.quantity * item.unitPrice;
      const disc = Number(item.discount) || 0;
      const afterDisc = Math.max(0, base - disc);
      const tax = (afterDisc * (Number(item.taxRate) || 0)) / 100;
      item.total = afterDisc + tax;
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const addIncomeItem = () => {
    setIncomeForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: String(Date.now()), name: "", quantity: 1, unitPrice: 0, taxRate: 0, discount: 0, total: 0 },
      ],
    }));
  };

  const removeIncomeItem = (index: number) => {
    if (incomeForm.items.length <= 1) return;
    setIncomeForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Handle line item update for expense
  const updateExpenseItem = (index: number, field: keyof LineItem, value: any) => {
    setExpenseForm((prev) => {
      const newItems = [...prev.items];
      const item = { ...newItems[index], [field]: value };
      const base = item.quantity * item.unitPrice;
      const disc = Number(item.discount) || 0;
      const afterDisc = Math.max(0, base - disc);
      const tax = (afterDisc * (Number(item.taxRate) || 0)) / 100;
      item.total = afterDisc + tax;
      newItems[index] = item;
      return { ...prev, items: newItems };
    });
  };

  const addExpenseItem = () => {
    setExpenseForm((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { id: String(Date.now()), name: "", quantity: 1, unitPrice: 0, taxRate: 0, discount: 0, total: 0 },
      ],
    }));
  };

  const removeExpenseItem = (index: number) => {
    if (expenseForm.items.length <= 1) return;
    setExpenseForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  // Submit Income
  const handleSubmitIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const totalAmount = incomeCalculations.grandTotal;
      const received = incomeForm.amountReceived ? Number(incomeForm.amountReceived) : totalAmount;

      const payload = {
        type: "income",
        transactionDate: incomeForm.date,
        customerId: incomeForm.customerId || null,
        customerName: incomeForm.customerName,
        customerPhone: incomeForm.customerPhone,
        customerEmail: incomeForm.customerEmail,
        customerAddress: incomeForm.customerAddress,
        categoryId: incomeForm.categoryId ? Number(incomeForm.categoryId) : null,
        description: incomeForm.description,
        referenceNo: incomeForm.referenceNo,
        paymentMethod: incomeForm.paymentMethod,
        items: incomeForm.items.filter((i) => i.name.trim()),
        subtotal: incomeCalculations.subtotal,
        discountAmount: incomeCalculations.totalDiscount,
        taxAmount: incomeCalculations.totalTax,
        totalAmount,
        amountSettled: received,
        notes: incomeForm.notes,
        documentUrl: incomeForm.documentUrl,
      };

      const res = await fetch("/api/admin/finance/transactions", {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          institutionId: activeInstitutionId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create income entry");

      toast.success(`Income created! Invoice ${data.invoiceNumber} generated.`);
      setAddIncomeOpen(false);
      fetchTransactions();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit income transaction");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Expense
  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const totalAmount = expenseCalculations.grandTotal;
      const paid = expenseForm.amountPaid ? Number(expenseForm.amountPaid) : totalAmount;

      const payload = {
        type: "expense",
        transactionDate: expenseForm.date,
        vendorId: expenseForm.vendorId || null,
        vendorName: expenseForm.vendorName,
        vendorPhone: expenseForm.vendorPhone,
        vendorEmail: expenseForm.vendorEmail,
        categoryId: expenseForm.categoryId ? Number(expenseForm.categoryId) : null,
        description: expenseForm.description,
        referenceNo: expenseForm.referenceNo,
        supplierInvoiceNo: expenseForm.supplierInvoiceNo,
        paymentMethod: expenseForm.paymentMethod,
        items: expenseForm.items.filter((i) => i.name.trim()),
        subtotal: expenseCalculations.subtotal,
        discountAmount: expenseCalculations.totalDiscount,
        taxAmount: expenseCalculations.totalTax,
        totalAmount,
        amountSettled: paid,
        updateInventory: expenseForm.updateInventory,
        notes: expenseForm.notes,
        documentUrl: expenseForm.documentUrl,
      };

      const res = await fetch("/api/admin/finance/transactions", {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payload,
          institutionId: activeInstitutionId || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record expense");

      toast.success("Expense recorded successfully.");
      setAddExpenseOpen(false);
      fetchTransactions();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit expense transaction");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Partial Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTxn) return;
    try {
      setSubmitting(true);
      const res = await fetch(`/api/admin/finance/transactions/${selectedTxn.transaction_id}`, {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(paymentForm),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to record payment");

      toast.success("Payment recorded successfully.");
      setRecordPaymentOpen(false);
      fetchTransactions();
    } catch (err: any) {
      toast.error(err.message || "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel Transaction
  const handleCancelTransaction = async (txn: Transaction) => {
    if (!confirm(`Are you sure you want to cancel transaction ${txn.transaction_id}? This preserves audit history while updating status to cancelled.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/finance/transactions/${txn.transaction_id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to cancel transaction");
      toast.success("Transaction cancelled successfully.");
      fetchTransactions();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel transaction");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (!transactions.length) {
      toast.error("No transactions to export");
      return;
    }
    const headers = ["Transaction ID", "Type", "Date", "Party Name", "Phone", "Invoice / Bill #", "Total Amount", "Settled Amount", "Pending Balance", "Payment Status", "Payment Method", "Status"];
    const rows = transactions.map((t) => [
      t.transaction_id,
      t.transaction_type.toUpperCase(),
      t.transaction_date,
      `"${t.party_name.replace(/"/g, '""')}"`,
      t.party_phone || "",
      t.bill_number || "",
      t.total_amount,
      t.amount_settled,
      t.balance_pending,
      t.payment_status,
      t.payment_method,
      t.transaction_status,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Transactions_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <WalletCards className="size-4 text-primary" />
            Institution Finance
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Transactions</h1>
          <p className="text-sm text-muted-foreground">
            Manage both income and expenses with automatic invoice generation and balance tracking.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => fetchTransactions()} disabled={loading}>
            <RefreshCw className={`size-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <FileSpreadsheet className="size-4 mr-2 text-emerald-600" />
            Export CSV
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
            onClick={() => setAddIncomeOpen(true)}
          >
            <Plus className="size-4 mr-1.5" />
            Add Income
          </Button>
          <Button
            size="sm"
            className="bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-sm"
            onClick={() => setAddExpenseOpen(true)}
          >
            <Plus className="size-4 mr-1.5" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Income */}
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Income</p>
                <h3 className="mt-1 text-2xl font-bold text-emerald-600">{formatCurrency(summary.totalIncome)}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{summary.incomeCount} total entries</p>
              </div>
              <div className="rounded-full bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/40">
                <ArrowUpRight className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Total Expenses */}
        <Card className="border-l-4 border-l-rose-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Expenses</p>
                <h3 className="mt-1 text-2xl font-bold text-rose-600">{formatCurrency(summary.totalExpenses)}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{summary.expenseCount} total entries</p>
              </div>
              <div className="rounded-full bg-rose-50 p-2.5 text-rose-600 dark:bg-rose-950/40">
                <ArrowDownRight className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Net Balance */}
        <Card className={`border-l-4 shadow-sm ${summary.netBalance >= 0 ? "border-l-blue-500" : "border-l-amber-500"}`}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Net Balance</p>
                <h3 className={`mt-1 text-2xl font-bold ${summary.netBalance >= 0 ? "text-blue-600" : "text-amber-600"}`}>
                  {formatCurrency(summary.netBalance)}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {summary.netBalance >= 0 ? "Profitable / Surplus" : "Deficit / High Spend"}
                </p>
              </div>
              <div className="rounded-full bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/40">
                <IndianRupee className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Paid vs Pending */}
        <Card className="border-l-4 border-l-purple-500 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Settled vs Pending</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-lg font-bold text-slate-800 dark:text-slate-100">{formatCurrency(summary.paidAmount)}</span>
                </div>
                <p className="text-xs text-amber-600 font-medium mt-0.5">
                  Due/Pending: {formatCurrency(summary.pendingAmount)}
                </p>
              </div>
              <div className="rounded-full bg-purple-50 p-2.5 text-purple-600 dark:bg-purple-950/40">
                <Clock className="size-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            {/* Type Tabs */}
            <div className="flex items-center rounded-lg border bg-muted/40 p-1 w-fit">
              <button
                type="button"
                onClick={() => { setTypeFilter("all"); setCurrentPage(1); }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  typeFilter === "all" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Transactions ({summary.totalTransactions})
              </button>
              <button
                type="button"
                onClick={() => { setTypeFilter("income"); setCurrentPage(1); }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  typeFilter === "income" ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Income ({summary.incomeCount})
              </button>
              <button
                type="button"
                onClick={() => { setTypeFilter("expense"); setCurrentPage(1); }}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  typeFilter === "expense" ? "bg-rose-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Expenses ({summary.expenseCount})
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search party, invoice #, ref no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
          </div>

          {/* Secondary Filters */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-4 pt-1">
            {/* Payment Status */}
            <div>
              <Label className="text-xs text-muted-foreground">Payment Status</Label>
              <Select value={paymentStatusFilter} onValueChange={(val) => { setPaymentStatusFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="partially_paid">Partially Paid</SelectItem>
                  <SelectItem value="unpaid">Unpaid / Due</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Method */}
            <div>
              <Label className="text-xs text-muted-foreground">Payment Method</Label>
              <Select value={paymentMethodFilter} onValueChange={(val) => { setPaymentMethodFilter(val); setCurrentPage(1); }}>
                <SelectTrigger className="h-8 text-xs mt-1">
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="upi">UPI / QR</SelectItem>
                  <SelectItem value="net_banking">Net Banking / Transfer</SelectItem>
                  <SelectItem value="card">Debit / Credit Card</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* From Date */}
            <div>
              <Label className="text-xs text-muted-foreground">From Date</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => { setFromDate(e.target.value); setCurrentPage(1); }}
                className="h-8 text-xs mt-1"
              />
            </div>

            {/* To Date */}
            <div>
              <Label className="text-xs text-muted-foreground">To Date</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => { setToDate(e.target.value); setCurrentPage(1); }}
                className="h-8 text-xs mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Transactions Table */}
      <div className="rounded-lg border bg-card shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <th className="px-4 py-3">Txn ID</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Customer / Vendor</th>
                <th className="px-4 py-3">Invoice / Ref</th>
                <th className="px-4 py-3 text-right">Total Amount</th>
                <th className="px-4 py-3 text-right">Settled</th>
                <th className="px-4 py-3 text-right">Balance Due</th>
                <th className="px-4 py-3 text-center">Payment Status</th>
                <th className="px-4 py-3 text-center">Method</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-muted-foreground">
                    <Loader2 className="size-6 animate-spin mx-auto text-primary mb-2" />
                    Loading transactions...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-muted-foreground">
                    <WalletCards className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                    No transactions found. Use <strong>+ Add Income</strong> or <strong>+ Add Expense</strong> above to record transactions.
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => {
                  const isIncome = txn.transaction_type === "income";
                  return (
                    <tr key={txn.transaction_id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs font-semibold text-primary">
                        {txn.transaction_id}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {txn.transaction_date ? format(new Date(txn.transaction_date), "dd MMM yyyy") : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            isIncome
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                              : "border-rose-500 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300"
                          }
                        >
                          {isIncome ? (
                            <ArrowUpRight className="size-3 mr-1" />
                          ) : (
                            <ArrowDownRight className="size-3 mr-1" />
                          )}
                          {isIncome ? "Income" : "Expense"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{txn.party_name}</div>
                        {txn.party_phone && (
                          <div className="text-xs text-muted-foreground">{txn.party_phone}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {txn.bill_number ? (
                          <button
                            type="button"
                            onClick={() => { setSelectedTxn(txn); setBillModalOpen(true); }}
                            className="text-primary hover:underline flex items-center gap-1 font-semibold"
                          >
                            <FileText className="size-3.5 text-primary" />
                            {txn.bill_number}
                          </button>
                        ) : txn.reference_no ? (
                          <span className="text-muted-foreground">{txn.reference_no}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-foreground">
                        {formatCurrency(txn.total_amount)}
                      </td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">
                        {formatCurrency(txn.amount_settled)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {Number(txn.balance_pending) > 0 ? (
                          <span className="text-rose-600 font-bold">{formatCurrency(txn.balance_pending)}</span>
                        ) : (
                          <span className="text-muted-foreground">₹0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant="secondary"
                          className={
                            txn.payment_status === "paid"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : txn.payment_status === "partially_paid"
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                              : txn.payment_status === "cancelled"
                              ? "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                          }
                        >
                          {txn.payment_status === "paid" && <CheckCircle2 className="size-3 mr-1" />}
                          {txn.payment_status.replace("_", " ").toUpperCase()}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center text-xs uppercase font-medium text-muted-foreground">
                        {txn.payment_method.replace("_", " ")}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { setSelectedTxn(txn); setDetailsOpen(true); }}>
                              <FileText className="size-4 mr-2" />
                              View Details
                            </DropdownMenuItem>

                            {/* View / Print Bill */}
                            {isIncome && txn.bill_number && (
                              <DropdownMenuItem onClick={() => { setSelectedTxn(txn); setBillModalOpen(true); }}>
                                <Printer className="size-4 mr-2 text-primary" />
                                View / Print Invoice
                              </DropdownMenuItem>
                            )}

                            {/* Record Partial Payment */}
                            {txn.payment_status !== "paid" && txn.payment_status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedTxn(txn);
                                  setPaymentForm({
                                    amount: String(txn.balance_pending || ""),
                                    paymentDate: new Date().toISOString().slice(0, 10),
                                    paymentMethod: txn.payment_method || "cash",
                                    referenceNo: "",
                                    notes: "",
                                  });
                                  setRecordPaymentOpen(true);
                                }}
                              >
                                <CreditCard className="size-4 mr-2 text-emerald-600" />
                                Record Payment
                              </DropdownMenuItem>
                            )}

                            {/* Supplier invoice doc */}
                            {txn.document_url && (
                              <DropdownMenuItem onClick={() => window.open(txn.document_url, "_blank")}>
                                <Download className="size-4 mr-2" />
                                View Supplier Bill
                              </DropdownMenuItem>
                            )}

                            {txn.transaction_status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={() => handleCancelTransaction(txn)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-4 mr-2" />
                                Cancel Transaction
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination footer */}
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
          <div>
            Showing page {currentPage} of {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1 || loading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="h-7 text-xs"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages || loading}
              onClick={() => setCurrentPage((p) => p + 1)}
              className="h-7 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      {/* ======================= ADD INCOME DIALOG ======================= */}
      <Dialog open={addIncomeOpen} onOpenChange={setAddIncomeOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <ArrowUpRight className="size-5" />
              Add Income Transaction & Generate Bill
            </DialogTitle>
            <DialogDescription>
              Record an income entry. An official invoice with unique reference is automatically generated.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitIncome} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Transaction Date *</Label>
                <Input
                  type="date"
                  required
                  value={incomeForm.date}
                  onChange={(e) => setIncomeForm({ ...incomeForm, date: e.target.value })}
                  className="mt-1 h-9 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Select Customer</Label>
                <Select
                  value={incomeForm.customerId}
                  onValueChange={(val) => {
                    const c = customers.find((cust) => String(cust.id) === val);
                    if (c) {
                      setIncomeForm({
                        ...incomeForm,
                        customerId: val,
                        customerName: c.name || "",
                        customerPhone: c.phone || "",
                        customerEmail: c.email || "",
                        customerAddress: c.address || "",
                      });
                    } else {
                      setIncomeForm({ ...incomeForm, customerId: val });
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 h-9 text-sm">
                    <SelectValue placeholder="Existing customer..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">+ Enter New Customer</SelectItem>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name} {c.phone ? `(${c.phone})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Customer / Payer Name *</Label>
                <Input
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={incomeForm.customerName}
                  onChange={(e) => setIncomeForm({ ...incomeForm, customerName: e.target.value })}
                  className="mt-1 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Customer Phone</Label>
                <Input
                  placeholder="+91 9876543210"
                  value={incomeForm.customerPhone}
                  onChange={(e) => setIncomeForm({ ...incomeForm, customerPhone: e.target.value })}
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Customer Email</Label>
                <Input
                  type="email"
                  placeholder="customer@example.com"
                  value={incomeForm.customerEmail}
                  onChange={(e) => setIncomeForm({ ...incomeForm, customerEmail: e.target.value })}
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Income Category</Label>
                <Select
                  value={incomeForm.categoryId}
                  onValueChange={(val) => setIncomeForm({ ...incomeForm, categoryId: val })}
                >
                  <SelectTrigger className="mt-1 h-9 text-sm">
                    <SelectValue placeholder="Category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {incomeCategories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Products / Services Line Items */}
            <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Products / Services / Line Items
                </span>
                <Button type="button" variant="outline" size="sm" onClick={addIncomeItem} className="h-7 text-xs">
                  <Plus className="size-3 mr-1" /> Add Line Item
                </Button>
              </div>

              <div className="space-y-2">
                {incomeForm.items.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                    <div className="col-span-4">
                      <Input
                        placeholder="Item / Service Name *"
                        required
                        value={item.name}
                        onChange={(e) => updateIncomeItem(idx, "name", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateIncomeItem(idx, "quantity", Number(e.target.value))}
                        className="h-8 text-xs text-right"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Price"
                        value={item.unitPrice || ""}
                        onChange={(e) => updateIncomeItem(idx, "unitPrice", Number(e.target.value))}
                        className="h-8 text-xs text-right"
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Tax%"
                        value={item.taxRate || ""}
                        onChange={(e) => updateIncomeItem(idx, "taxRate", Number(e.target.value))}
                        className="h-8 text-xs text-right"
                      />
                    </div>
                    <div className="col-span-2 font-mono font-bold text-right pr-2">
                      {formatCurrency(item.total)}
                    </div>
                    <div className="col-span-1 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeIncomeItem(idx)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Summary */}
              <div className="border-t pt-2 flex flex-col items-end gap-1 text-xs">
                <div className="flex justify-between w-60">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-mono">{formatCurrency(incomeCalculations.subtotal)}</span>
                </div>
                {incomeCalculations.totalTax > 0 && (
                  <div className="flex justify-between w-60">
                    <span className="text-muted-foreground">Tax:</span>
                    <span className="font-mono">{formatCurrency(incomeCalculations.totalTax)}</span>
                  </div>
                )}
                <div className="flex justify-between w-60 font-bold text-sm text-foreground border-t pt-1">
                  <span>Grand Total:</span>
                  <span className="text-emerald-700 font-mono">
                    {formatCurrency(incomeCalculations.grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Payment Method *</Label>
                <Select
                  value={incomeForm.paymentMethod}
                  onValueChange={(val) => setIncomeForm({ ...incomeForm, paymentMethod: val })}
                >
                  <SelectTrigger className="mt-1 h-9 text-sm">
                    <SelectValue placeholder="Payment method..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI / QR Code</SelectItem>
                    <SelectItem value="net_banking">Net Banking / NEFT</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Amount Received</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={`Default: ₹${incomeCalculations.grandTotal}`}
                  value={incomeForm.amountReceived}
                  onChange={(e) => setIncomeForm({ ...incomeForm, amountReceived: e.target.value })}
                  className="mt-1 h-9 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Reference / Txn No.</Label>
                <Input
                  placeholder="e.g. UPI Ref / Cheque No."
                  value={incomeForm.referenceNo}
                  onChange={(e) => setIncomeForm({ ...incomeForm, referenceNo: e.target.value })}
                  className="mt-1 h-9 text-sm"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Notes / Remarks</Label>
              <Textarea
                placeholder="Additional notes for receipt and customer reference..."
                value={incomeForm.notes}
                onChange={(e) => setIncomeForm({ ...incomeForm, notes: e.target.value })}
                className="mt-1 text-xs"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddIncomeOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Printer className="size-4 mr-2" />}
                Save & Auto-Generate Invoice
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================= ADD EXPENSE DIALOG ======================= */}
      <Dialog open={addExpenseOpen} onOpenChange={setAddExpenseOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-700">
              <ArrowDownRight className="size-5" />
              Add Expense Transaction
            </DialogTitle>
            <DialogDescription>
              Record an operational expense, vendor purchase, or supplies invoice with multi-product items.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitExpense} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Transaction Date *</Label>
                <Input
                  type="date"
                  required
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="mt-1 h-9 text-sm"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Select Vendor</Label>
                <Select
                  value={expenseForm.vendorId}
                  onValueChange={(val) => {
                    const v = vendors.find((vend) => String(vend.id) === val);
                    if (v) {
                      setExpenseForm({
                        ...expenseForm,
                        vendorId: val,
                        vendorName: v.name || "",
                        vendorPhone: v.phone || "",
                        vendorEmail: v.email || "",
                      });
                    } else {
                      setExpenseForm({ ...expenseForm, vendorId: val });
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 h-9 text-sm">
                    <SelectValue placeholder="Existing vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">+ Enter New Vendor</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.name} {v.phone ? `(${v.phone})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Vendor / Supplier Name *</Label>
                <Input
                  required
                  placeholder="e.g. Star Office Supplies"
                  value={expenseForm.vendorName}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendorName: e.target.value })}
                  className="mt-1 h-9 text-sm"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Vendor Phone</Label>
                <Input
                  placeholder="+91 9876543210"
                  value={expenseForm.vendorPhone}
                  onChange={(e) => setExpenseForm({ ...expenseForm, vendorPhone: e.target.value })}
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Supplier Invoice No.</Label>
                <Input
                  placeholder="e.g. BILL-9821"
                  value={expenseForm.supplierInvoiceNo}
                  onChange={(e) => setExpenseForm({ ...expenseForm, supplierInvoiceNo: e.target.value })}
                  className="mt-1 h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Expense Category</Label>
                <Select
                  value={expenseForm.categoryId}
                  onValueChange={(val) => setExpenseForm({ ...expenseForm, categoryId: val })}
                >
                  <SelectTrigger className="mt-1 h-9 text-sm">
                    <SelectValue placeholder="Category..." />
                  </SelectTrigger>
                  <SelectContent>
                    {expenseCategories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Purchased Items Table */}
            <div className="border rounded-lg p-3 bg-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Purchased Products / Expenses Line Items
                </span>
                <Button type="button" variant="outline" size="sm" onClick={addExpenseItem} className="h-7 text-xs">
                  <Plus className="size-3 mr-1" /> Add Line Item
                </Button>
              </div>

              <div className="space-y-2">
                {expenseForm.items.map((item, idx) => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center text-xs">
                    <div className="col-span-4">
                      <Input
                        placeholder="Item / Product Name *"
                        required
                        value={item.name}
                        onChange={(e) => updateExpenseItem(idx, "name", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateExpenseItem(idx, "quantity", Number(e.target.value))}
                        className="h-8 text-xs text-right"
                      />
                    </div>
                    <div className="col-span-2">
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="Unit Price"
                        value={item.unitPrice || ""}
                        onChange={(e) => updateExpenseItem(idx, "unitPrice", Number(e.target.value))}
                        className="h-8 text-xs text-right"
                      />
                    </div>
                    <div className="col-span-1">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Tax%"
                        value={item.taxRate || ""}
                        onChange={(e) => updateExpenseItem(idx, "taxRate", Number(e.target.value))}
                        className="h-8 text-xs text-right"
                      />
                    </div>
                    <div className="col-span-2 font-mono font-bold text-right pr-2">
                      {formatCurrency(item.total)}
                    </div>
                    <div className="col-span-1 text-center">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-muted-foreground hover:text-destructive"
                        onClick={() => removeExpenseItem(idx)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals Summary */}
              <div className="border-t pt-2 flex flex-col items-end gap-1 text-xs">
                <div className="flex justify-between w-60">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span className="font-mono">{formatCurrency(expenseCalculations.subtotal)}</span>
                </div>
                {expenseCalculations.totalTax > 0 && (
                  <div className="flex justify-between w-60">
                    <span className="text-muted-foreground">Tax:</span>
                    <span className="font-mono">{formatCurrency(expenseCalculations.totalTax)}</span>
                  </div>
                )}
                <div className="flex justify-between w-60 font-bold text-sm text-foreground border-t pt-1">
                  <span>Grand Total:</span>
                  <span className="text-rose-700 font-mono">
                    {formatCurrency(expenseCalculations.grandTotal)}
                  </span>
                </div>
              </div>
            </div>

            {/* Inventory Update Toggle */}
            <div className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                id="updateInventory"
                checked={expenseForm.updateInventory}
                onChange={(e) => setExpenseForm({ ...expenseForm, updateInventory: e.target.checked })}
                className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <label htmlFor="updateInventory" className="cursor-pointer font-medium text-foreground">
                Update inventory stock automatically for matching items
              </label>
            </div>

            {/* Payment Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold">Payment Method *</Label>
                <Select
                  value={expenseForm.paymentMethod}
                  onValueChange={(val) => setExpenseForm({ ...expenseForm, paymentMethod: val })}
                >
                  <SelectTrigger className="mt-1 h-9 text-sm">
                    <SelectValue placeholder="Payment method..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI / QR Code</SelectItem>
                    <SelectItem value="net_banking">Net Banking / NEFT</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Amount Paid</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={`Default: ₹${expenseCalculations.grandTotal}`}
                  value={expenseForm.amountPaid}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amountPaid: e.target.value })}
                  className="mt-1 h-9 text-sm"
                />
              </div>
            </div>

            {/* Document / Invoice Upload */}
            <div>
              <Label className="text-xs font-semibold">Upload Supplier Bill / Invoice Receipt</Label>
              <DocumentFileUpload
                accessToken={accessToken}
                files={expenseFiles}
                onFilesChange={(files) => {
                  setExpenseFiles(files);
                  setExpenseForm((prev) => ({ ...prev, documentUrl: files[0]?.url || "" }));
                }}
                maxFiles={1}
                maxSize={10 * 1024 * 1024}
                accept="image/*,application/pdf"
                compact
                buttonLabel="Upload Invoice"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Notes / Description</Label>
              <Textarea
                placeholder="Description or notes about this expense..."
                value={expenseForm.notes}
                onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                className="mt-1 text-xs"
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddExpenseOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-rose-600 hover:bg-rose-700 text-white">
                {submitting ? <Loader2 className="size-4 animate-spin mr-2" /> : <Plus className="size-4 mr-2" />}
                Record Expense
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ======================= PRINTABLE BILL MODAL ======================= */}
      <Dialog open={billModalOpen} onOpenChange={setBillModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          {selectedTxn && (
            <div className="space-y-6 p-2 printable-invoice">
              {/* Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-primary">TAX INVOICE</h2>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">
                    Invoice No: <strong className="text-foreground">{selectedTxn.bill_number || selectedTxn.transaction_id}</strong>
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    Txn Ref: {selectedTxn.transaction_id}
                  </p>
                </div>
                <div className="text-right">
                  <h3 className="font-bold text-foreground">EduBird Institutional Services</h3>
                  <p className="text-xs text-muted-foreground">Date: {format(new Date(selectedTxn.transaction_date), "dd MMMM yyyy")}</p>
                </div>
              </div>

              {/* Bill To */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="border rounded p-3 bg-muted/20">
                  <p className="font-bold uppercase text-muted-foreground mb-1">Billed To:</p>
                  <p className="font-semibold text-sm text-foreground">{selectedTxn.party_name}</p>
                  {selectedTxn.party_phone && <p className="text-muted-foreground">Phone: {selectedTxn.party_phone}</p>}
                  {selectedTxn.party_email && <p className="text-muted-foreground">Email: {selectedTxn.party_email}</p>}
                </div>
                <div className="border rounded p-3 bg-muted/20 text-right">
                  <p className="font-bold uppercase text-muted-foreground mb-1">Payment Information:</p>
                  <p>Method: <strong className="uppercase">{selectedTxn.payment_method}</strong></p>
                  <p>Status: <strong className="uppercase text-emerald-700">{selectedTxn.payment_status}</strong></p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs text-left border-collapse border">
                <thead>
                  <tr className="bg-muted border-b">
                    <th className="p-2 border">#</th>
                    <th className="p-2 border">Item Description</th>
                    <th className="p-2 border text-right">Qty</th>
                    <th className="p-2 border text-right">Price</th>
                    <th className="p-2 border text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(selectedTxn.items) && selectedTxn.items.length > 0 ? (
                    selectedTxn.items.map((it: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 border">{i + 1}</td>
                        <td className="p-2 border font-medium">{it.name}</td>
                        <td className="p-2 border text-right">{it.quantity || 1}</td>
                        <td className="p-2 border text-right">{formatCurrency(it.unitPrice || it.unit_price || 0)}</td>
                        <td className="p-2 border text-right font-bold">{formatCurrency(it.total || it.line_total || (it.quantity * it.unitPrice))}</td>
                      </tr>
                    ))
                  ) : (
                    <tr className="border-b">
                      <td className="p-2 border">1</td>
                      <td className="p-2 border font-medium">{selectedTxn.category_name || "General Service / Products"}</td>
                      <td className="p-2 border text-right">1</td>
                      <td className="p-2 border text-right">{formatCurrency(selectedTxn.total_amount)}</td>
                      <td className="p-2 border text-right font-bold">{formatCurrency(selectedTxn.total_amount)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Calculation Summary */}
              <div className="flex justify-end text-xs">
                <div className="w-64 space-y-1.5 border p-3 rounded bg-muted/20">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>{formatCurrency(selectedTxn.subtotal || selectedTxn.total_amount)}</span>
                  </div>
                  {Number(selectedTxn.tax_amount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tax Amount:</span>
                      <span>{formatCurrency(selectedTxn.tax_amount || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1 font-bold text-sm text-foreground">
                    <span>Grand Total:</span>
                    <span>{formatCurrency(selectedTxn.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Amount Paid:</span>
                    <span>{formatCurrency(selectedTxn.amount_settled)}</span>
                  </div>
                  {Number(selectedTxn.balance_pending) > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>Balance Due:</span>
                      <span>{formatCurrency(selectedTxn.balance_pending)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Signatures & Footer */}
              <div className="flex justify-between items-end pt-6 border-t text-xs text-muted-foreground">
                <div>
                  <p>Computer generated invoice, valid without physical signature.</p>
                  <p>Thank you for your business!</p>
                </div>
                <div className="text-center">
                  <div className="w-36 border-b border-muted-foreground/40 mb-1"></div>
                  <p className="font-semibold text-foreground">Authorized Signatory</p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 no-print">
                <Button variant="outline" size="sm" onClick={() => setBillModalOpen(false)}>
                  Close
                </Button>
                <Button size="sm" onClick={() => window.print()} className="bg-primary text-white">
                  <Printer className="size-4 mr-1.5" />
                  Print Bill / Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================= RECORD PAYMENT MODAL ======================= */}
      <Dialog open={recordPaymentOpen} onOpenChange={setRecordPaymentOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for transaction <strong>{selectedTxn?.transaction_id}</strong>
            </DialogDescription>
          </DialogHeader>

          {selectedTxn && (
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div className="rounded-lg border p-3 bg-muted/20 text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-bold">{formatCurrency(selectedTxn.total_amount)}</span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Already Settled:</span>
                  <span>{formatCurrency(selectedTxn.amount_settled)}</span>
                </div>
                <div className="flex justify-between text-rose-600 font-bold border-t pt-1">
                  <span>Remaining Balance:</span>
                  <span>{formatCurrency(selectedTxn.balance_pending)}</span>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Payment Amount (₹) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  max={Number(selectedTxn.balance_pending)}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Payment Method *</Label>
                <Select
                  value={paymentForm.paymentMethod}
                  onValueChange={(val) => setPaymentForm({ ...paymentForm, paymentMethod: val })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="upi">UPI / QR Code</SelectItem>
                    <SelectItem value="net_banking">Net Banking / NEFT</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Payment Date</Label>
                <Input
                  type="date"
                  value={paymentForm.paymentDate}
                  onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Reference / Txn ID</Label>
                <Input
                  placeholder="e.g. UTR / Receipt No."
                  value={paymentForm.referenceNo}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                  className="mt-1"
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setRecordPaymentOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="size-4 animate-spin mr-1.5" /> : null}
                  Confirm Payment
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ======================= TRANSACTION DETAILS MODAL ======================= */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transaction Details</DialogTitle>
          </DialogHeader>
          {selectedTxn && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 border-b pb-2">
                <div>
                  <span className="text-muted-foreground">ID:</span>
                  <p className="font-bold font-mono text-primary">{selectedTxn.transaction_id}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-semibold">{format(new Date(selectedTxn.transaction_date), "dd MMM yyyy")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>
                  <p className="font-semibold uppercase">{selectedTxn.transaction_type}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Party:</span>
                  <p className="font-semibold">{selectedTxn.party_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 border-b pb-2">
                <div>
                  <span className="text-muted-foreground">Total:</span>
                  <p className="font-bold text-sm">{formatCurrency(selectedTxn.total_amount)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Settled:</span>
                  <p className="font-bold text-sm text-emerald-600">{formatCurrency(selectedTxn.amount_settled)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Pending:</span>
                  <p className="font-bold text-sm text-rose-600">{formatCurrency(selectedTxn.balance_pending)}</p>
                </div>
              </div>

              {selectedTxn.description && (
                <div>
                  <span className="text-muted-foreground">Description:</span>
                  <p className="mt-0.5">{selectedTxn.description}</p>
                </div>
              )}

              {selectedTxn.reference_no && (
                <div>
                  <span className="text-muted-foreground">Reference Number:</span>
                  <p className="font-mono mt-0.5">{selectedTxn.reference_no}</p>
                </div>
              )}

              {selectedTxn.document_url && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => window.open(selectedTxn.document_url, "_blank")}
                  >
                    <Download className="size-3.5 mr-2" />
                    Open Uploaded Document / Invoice
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

