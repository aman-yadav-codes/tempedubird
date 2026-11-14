"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  CreditCard,
  Package,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ArrowRight,
  ExternalLink,
  Search,
  Sparkles,
  Building2,
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
import { useAuthStore } from "@/store";

interface OrderItem {
  id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  total_amount: number;
  payment_status: string;
  payment_method: string;
  fulfillment_status: string;
  created_at: string;
  items_summary?: string;
  items?: OrderItem[];
}

interface FinanceRecord {
  id: number;
  invoiceNumber: string;
  orderNumber: string;
  date: string;
  description: string;
  amount: number;
  paymentMethod: string;
  status: string;
}

export function CustomerDashboard() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [financeRecords, setFinanceRecords] = useState<FinanceRecord[]>([]);
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    activeOrders: 0,
    totalSpent: 0,
    totalInvoices: 0,
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [ordersRes, financeRes] = await Promise.all([
          fetch("/api/customer/orders?limit=5"),
          fetch("/api/customer/finance?limit=5"),
        ]);

        if (ordersRes.ok) {
          const ordJson = await ordersRes.json();
          if (ordJson.orders) {
            setOrders(ordJson.orders);
            const active = ordJson.orders.filter(
              (o: Order) =>
                !["delivered", "cancelled"].includes(o.fulfillment_status.toLowerCase())
            ).length;
            setMetrics((prev) => ({
              ...prev,
              totalOrders: ordJson.metrics?.totalOrders || ordJson.orders.length,
              activeOrders: active,
              totalSpent: ordJson.metrics?.totalSpent || 0,
            }));
          }
        }

        if (financeRes.ok) {
          const finJson = await financeRes.json();
          if (finJson.records) {
            setFinanceRecords(finJson.records);
            setMetrics((prev) => ({
              ...prev,
              totalInvoices: finJson.metrics?.totalInvoices || finJson.records.length,
              totalSpent: finJson.metrics?.totalSpent || prev.totalSpent,
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load customer dashboard data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const getFulfillmentBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "delivered") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold gap-1">
          <CheckCircle2 className="size-3" /> Delivered
        </Badge>
      );
    }
    if (s === "cancelled") {
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 text-[11px] font-semibold">
          Cancelled
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[11px] font-semibold gap-1">
        <Clock className="size-3" /> {status}
      </Badge>
    );
  };

  const getPaymentBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === "paid") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-semibold">
          Paid
        </Badge>
      );
    }
    if (s === "refunded") {
      return (
        <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20 text-[11px] font-semibold">
          Refunded
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[11px] font-semibold">
        Pending
      </Badge>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-r from-red-500/10 via-rose-500/5 to-background p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-foreground">
                Welcome back, {user?.full_name || "Customer"}!
              </span>
              <Badge variant="outline" className="bg-[#d9232e]/10 text-[#d9232e] border-[#d9232e]/30 text-xs font-semibold">
                Customer Workspace
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Track your service bookings, purchased products, invoices, and financial history.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button asChild size="sm" variant="outline" className="h-9 text-xs">
              <Link href="/explore">
                <Search className="size-3.5 mr-1.5" /> Explore Catalog
              </Link>
            </Button>
            <Button asChild size="sm" className="h-9 text-xs bg-[#d9232e] hover:bg-[#d9232e]/90 text-white font-semibold">
              <Link href="/admin/orders">
                <ShoppingCart className="size-3.5 mr-1.5" /> View All Orders
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Orders */}
        <Card className="shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Total Orders
            </CardTitle>
            <div className="size-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <ShoppingCart className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "..." : metrics.totalOrders}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
              <span>All-time purchases & bookings</span>
            </p>
          </CardContent>
        </Card>

        {/* Active Orders */}
        <Card className="shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              In Progress
            </CardTitle>
            <div className="size-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Clock className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {loading ? "..." : metrics.activeOrders}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Currently processing or shipped
            </p>
          </CardContent>
        </Card>

        {/* Total Spent */}
        <Card className="shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Total Spent
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
              Verified paid transactions
            </p>
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card className="shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground">
              Invoices & Receipts
            </CardTitle>
            <div className="size-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <FileText className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {loading ? "..." : metrics.totalInvoices}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Downloadable tax invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid: Recent Orders (Left) & Finance Records (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card className="shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <ShoppingCart className="size-4 text-primary" /> My Recent Orders
              </CardTitle>
              <CardDescription className="text-xs">
                Your latest purchases and bookings
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs text-primary">
              <Link href="/admin/orders">
                View All <ArrowRight className="size-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Loading orders...
              </div>
            ) : orders.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="size-10 rounded-full bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                  <Package className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">No orders placed yet</p>
                  <p className="text-[11px] text-muted-foreground">
                    Discover products, services, and expert professionals in the catalog.
                  </p>
                </div>
                <Button asChild size="sm" variant="outline" className="text-xs">
                  <Link href="/explore">Browse Catalog</Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Order</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Fulfillment</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((ord) => (
                      <TableRow key={ord.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="font-semibold text-xs text-foreground">
                            {ord.order_number}
                          </div>
                          <div className="text-[11px] text-muted-foreground line-clamp-1 max-w-[180px]">
                            {ord.items_summary || "Order items"}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(ord.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {getFulfillmentBadge(ord.fulfillment_status)}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-right text-foreground">
                          {formatCurrency(ord.total_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Finance & Invoices */}
        <Card className="shadow-xs border">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                <CreditCard className="size-4 text-emerald-600" /> My Finance & Invoices
              </CardTitle>
              <CardDescription className="text-xs">
                Payment history and digital transaction receipts
              </CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-8 text-xs text-primary">
              <Link href="/admin/finance">
                View All <ArrowRight className="size-3 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                Loading finance records...
              </div>
            ) : financeRecords.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="size-10 rounded-full bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                  <FileText className="size-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-foreground">No financial records yet</p>
                  <p className="text-[11px] text-muted-foreground">
                    Invoices and payment receipts will be generated when you place orders.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Invoice #</TableHead>
                      <TableHead className="text-xs">Method</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {financeRecords.map((rec) => (
                      <TableRow key={rec.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="font-semibold text-xs text-foreground">
                            {rec.invoiceNumber}
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(rec.date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {rec.paymentMethod}
                        </TableCell>
                        <TableCell>
                          {getPaymentBadge(rec.status)}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-right text-foreground">
                          {formatCurrency(rec.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
