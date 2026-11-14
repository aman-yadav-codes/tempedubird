"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Package,
  FileText,
  AlertCircle,
  Truck,
  MapPin,
  Eye,
  RefreshCw,
  ExternalLink,
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

interface OrderItem {
  id: number;
  product_name: string;
  product_code?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  subtotal_amount: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  payment_status: string;
  payment_method: string;
  fulfillment_status: string;
  shipping_address?: string;
  notes?: string;
  created_at: string;
  items_summary?: string;
  items?: OrderItem[];
}

export function CustomerOrdersView() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [metrics, setMetrics] = useState({
    totalOrders: 0,
    totalSpent: 0,
    paidCount: 0,
    pendingCount: 0,
  });

  const loadOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (activeTab !== "all") params.set("fulfillment_status", activeTab);

      const res = await fetch(`/api/customer/orders?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        if (data.metrics) {
          setMetrics(data.metrics);
        }
      }
    } catch (err) {
      console.error("Failed to load customer orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, activeTab]);

  const formatCurrency = (amt: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amt);
  };

  const getFulfillmentBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "delivered") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold gap-1">
          <CheckCircle2 className="size-3" /> Delivered
        </Badge>
      );
    }
    if (s === "shipped") {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 text-xs font-semibold gap-1">
          <Truck className="size-3" /> Shipped
        </Badge>
      );
    }
    if (s === "cancelled") {
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20 text-xs font-semibold">
          Cancelled
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-xs font-semibold gap-1">
        <Clock className="size-3" /> {status}
      </Badge>
    );
  };

  const getPaymentBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "paid") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold">
          Paid
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-xs font-semibold">
        {status}
      </Badge>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShoppingCart className="size-5 text-[#d9232e]" /> My Orders & Bookings
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            View orders you have placed, tracking status, item details, and receipts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="h-9 text-xs">
            <Link href="/explore">
              <Search className="size-3.5 mr-1.5" /> Explore Products & Services
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={loadOrders} className="h-9 text-xs">
            <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Filter Bar & Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="h-9 p-1">
            <TabsTrigger value="all" className="text-xs">All Orders</TabsTrigger>
            <TabsTrigger value="processing" className="text-xs">Processing</TabsTrigger>
            <TabsTrigger value="shipped" className="text-xs">Shipped</TabsTrigger>
            <TabsTrigger value="delivered" className="text-xs">Delivered</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search order # or items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-xs"
          />
        </div>
      </div>

      {/* Orders Table */}
      <Card className="shadow-xs border">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 text-center text-xs text-muted-foreground">
              Loading your orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="size-12 rounded-full bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                <Package className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">No orders found</p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {search
                    ? `No orders matching "${search}". Try searching with a different keyword.`
                    : "You haven't placed any orders yet. Explore our marketplace to get started."}
                </p>
              </div>
              <Button asChild size="sm" className="bg-[#d9232e] hover:bg-[#d9232e]/90 text-white text-xs">
                <Link href="/explore">Browse Marketplace</Link>
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Order ID</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Items & Description</TableHead>
                    <TableHead className="text-xs">Payment</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((ord) => (
                    <TableRow key={ord.id} className="hover:bg-muted/50">
                      <TableCell className="font-bold text-xs text-foreground whitespace-nowrap">
                        {ord.order_number}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(ord.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-xs text-foreground max-w-[260px]">
                        <div className="font-medium line-clamp-1">
                          {ord.items_summary || "Order Items"}
                        </div>
                        {ord.items && ord.items.length > 0 && (
                          <div className="text-[11px] text-muted-foreground">
                            {ord.items.length} {ord.items.length === 1 ? "item" : "items"}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5">
                          {getPaymentBadge(ord.payment_status)}
                          <div className="text-[10px] text-muted-foreground">
                            {ord.payment_method}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getFulfillmentBadge(ord.fulfillment_status)}
                      </TableCell>
                      <TableCell className="text-xs font-bold text-right text-foreground whitespace-nowrap">
                        {formatCurrency(ord.total_amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs font-semibold text-primary"
                          onClick={() => {
                            setSelectedOrder(ord);
                            setDialogOpen(true);
                          }}
                        >
                          <Eye className="size-3.5 mr-1" /> View Details
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

      {/* Order Details Modal */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Order Details: {selectedOrder?.order_number}</span>
              {selectedOrder && getFulfillmentBadge(selectedOrder.fulfillment_status)}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Placed on {selectedOrder && new Date(selectedOrder.created_at).toLocaleString()}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 pt-2 text-xs">
              {/* Items Table */}
              <div className="border rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="text-[11px]">Item</TableHead>
                      <TableHead className="text-[11px] text-center">Qty</TableHead>
                      <TableHead className="text-[11px] text-right">Price</TableHead>
                      <TableHead className="text-[11px] text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(selectedOrder.items || []).length > 0 ? (
                      selectedOrder.items!.map((it, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium text-xs">
                            {it.product_name}
                            {it.product_code && (
                              <span className="text-[10px] text-muted-foreground block">
                                SKU: {it.product_code}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">{it.quantity}</TableCell>
                          <TableCell className="text-right">{formatCurrency(it.unit_price)}</TableCell>
                          <TableCell className="text-right font-semibold">{formatCurrency(it.total_price)}</TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-3">
                          {selectedOrder.items_summary || "Items as specified in order"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Order Summary Pricing */}
              <div className="bg-muted/20 p-3.5 rounded-xl space-y-1.5 border">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(selectedOrder.subtotal_amount)}</span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(selectedOrder.discount_amount)}</span>
                  </div>
                )}
                {selectedOrder.tax_amount > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Tax:</span>
                    <span>{formatCurrency(selectedOrder.tax_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-foreground border-t pt-2">
                  <span>Final Total:</span>
                  <span className="text-[#d9232e]">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>

              {/* Delivery & Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {selectedOrder.shipping_address && (
                  <div className="p-3 border rounded-xl bg-card space-y-1">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-primary" /> Delivery Address
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      {selectedOrder.shipping_address}
                    </p>
                  </div>
                )}

                <div className="p-3 border rounded-xl bg-card space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <FileText className="size-3.5 text-emerald-600" /> Payment Information
                  </div>
                  <div className="space-y-0.5 text-[11px] text-muted-foreground">
                    <div>Method: <span className="font-medium text-foreground">{selectedOrder.payment_method}</span></div>
                    <div>Status: <span className="font-medium text-foreground">{selectedOrder.payment_status}</span></div>
                  </div>
                </div>
              </div>

              {selectedOrder.notes && (
                <div className="p-2.5 rounded-lg bg-muted/40 text-[11px] text-muted-foreground border">
                  <span className="font-semibold text-foreground">Notes: </span>
                  {selectedOrder.notes}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
