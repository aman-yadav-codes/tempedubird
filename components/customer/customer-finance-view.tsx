"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  FileText,
  Download,
  Eye,
  RefreshCw,
  TrendingUp,
  Receipt,
  ShoppingCart,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FinanceRecord {
  id: number;
  invoiceNumber: string;
  orderNumber: string;
  date: string;
  description: string;
  amount: number;
  subtotal: number;
  discount: number;
  tax: number;
  paymentMethod: string;
  status: string;
  receiptUrl?: string;
}

export function CustomerFinanceView() {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRecord, setSelectedRecord] = useState<FinanceRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [metrics, setMetrics] = useState({
    totalSpent: 0,
    pendingAmount: 0,
    totalInvoices: 0,
    paidInvoices: 0,
  });

  const loadFinance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/customer/finance?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      }
    } catch (err) {
      console.error("Failed to load customer finance records:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadFinance();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const filteredRecords = records.filter((r) => {
    if (activeTab === "all") return true;
    return r.status.toLowerCase() === activeTab;
  });

  const getPaymentBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "paid") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold gap-1">
          <CheckCircle2 className="size-3" /> Paid
        </Badge>
      );
    }
    if (s === "refunded") {
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 text-xs font-semibold">
          Refunded
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-xs font-semibold gap-1">
        <Clock className="size-3" /> {status}
      </Badge>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="size-5 text-emerald-600" /> My Finance & Invoices
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Complete records of your order payments, transaction receipts, and digital tax invoices.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="h-9 text-xs">
            <Link href="/admin/orders">
              <ShoppingCart className="size-3.5 mr-1.5" /> View My Orders
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={loadFinance} className="h-9 text-xs">
            <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Total Expenditure
            </CardTitle>
            <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {loading ? "..." : formatCurrency(metrics.totalSpent)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              All settled payments
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Pending Payments
            </CardTitle>
            <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {loading ? "..." : formatCurrency(metrics.pendingAmount)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Awaiting verification
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Total Invoices
            </CardTitle>
            <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <FileText className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "..." : metrics.totalInvoices}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Receipts generated
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Paid Invoices
            </CardTitle>
            <div className="size-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <Receipt className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "..." : metrics.paidInvoices}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Fully cleared
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="h-9 p-1">
            <TabsTrigger value="all" className="text-xs">All Invoices</TabsTrigger>
            <TabsTrigger value="paid" className="text-xs">Paid</TabsTrigger>
            <TabsTrigger value="pending" className="text-xs">Pending</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search invoice # or order..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>
      </div>

      {/* Finance Table */}
      <Card className="shadow-xs border">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Loading financial records...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="size-12 rounded-full bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                <Receipt className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No financial records found</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {search
                    ? `No records matching "${search}".`
                    : "No transactions have been recorded on your account yet."}
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Invoice #</TableHead>
                    <TableHead className="text-xs">Order ID</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Description</TableHead>
                    <TableHead className="text-xs">Payment Method</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs text-right">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map((rec) => (
                    <TableRow key={rec.id} className="hover:bg-muted/50">
                      <TableCell className="font-bold text-xs text-foreground whitespace-nowrap">
                        {rec.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-xs text-primary font-medium whitespace-nowrap">
                        <Link href={`/admin/orders?order=${rec.orderNumber}`} className="hover:underline">
                          {rec.orderNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(rec.date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-foreground max-w-[240px] line-clamp-1">
                        {rec.description}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {rec.paymentMethod}
                      </TableCell>
                      <TableCell>
                        {getPaymentBadge(rec.status)}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-right text-foreground whitespace-nowrap">
                        {formatCurrency(rec.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-semibold text-primary"
                          onClick={() => {
                            setSelectedRecord(rec);
                            setDialogOpen(true);
                          }}
                        >
                          <Eye className="size-3.5 mr-1" /> View Receipt
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invoice / Receipt Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Receipt: {selectedRecord?.invoiceNumber}</span>
              {selectedRecord && getPaymentBadge(selectedRecord.status)}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Transaction Date: {selectedRecord && new Date(selectedRecord.date).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {selectedRecord && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="p-4 border rounded-xl bg-card space-y-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Order Reference:</span>
                  <span className="font-bold text-foreground">{selectedRecord.orderNumber}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Description:</span>
                  <span className="font-medium text-foreground text-right max-w-[200px]">{selectedRecord.description}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Payment Method:</span>
                  <span className="font-medium text-foreground">{selectedRecord.paymentMethod}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>{formatCurrency(selectedRecord.subtotal)}</span>
                </div>
                {selectedRecord.discount > 0 && (
                  <div className="flex justify-between border-b pb-2 text-emerald-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(selectedRecord.discount)}</span>
                  </div>
                )}
                {selectedRecord.tax > 0 && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Tax:</span>
                    <span>{formatCurrency(selectedRecord.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-foreground pt-1">
                  <span>Total Amount Paid:</span>
                  <span className="text-emerald-600">{formatCurrency(selectedRecord.amount)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => window.print()}
                >
                  <Download className="size-3.5 mr-1.5" /> Print / Save
                </Button>
                <Button
                  size="sm"
                  className="text-xs bg-[#d9232e] hover:bg-[#d9232e]/90 text-white"
                  onClick={() => setDialogOpen(false)}
                >
                  Done
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
