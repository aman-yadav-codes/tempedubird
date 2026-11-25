"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ShoppingCart,
  Search,
  CheckCircle2,
  Clock,
  Package,
  FileText,
  AlertCircle,
  Truck,
  MapPin,
  Eye,
  RefreshCw,
  Printer,
  Receipt,
  Store,
  XCircle,
  Loader2,
  Calendar,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { OrderBillDialog } from "@/components/orders/order-bill-dialog";
import { OrderStatusDialog } from "@/components/orders/order-status-dialog";

import { CustomerSalesTabs } from "./customer-sales-tabs";

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
  created_by?: number | null;
  items_summary?: string;
  items?: OrderItem[];
  institution_name?: string;
  is_seller?: boolean;
  is_buyer?: boolean;
  can_cancel?: boolean;
  cancel_remaining_seconds?: number;
}

export function CustomerOrdersView() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [scope, setScope] = useState<"purchases" | "sales">("purchases");
  const [activeTab, setActiveTab] = useState("all");

  // Dialogs
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [billOrder, setBillOrder] = useState<Order | null>(null);
  const [billOpen, setBillOpen] = useState(false);
  const [statusOrder, setStatusOrder] = useState<Order | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);

  // Cancellation confirm modal
  const [cancelConfirmOrder, setCancelConfirmOrder] = useState<Order | null>(null);
  const [cancelLoading, setCancelLoading] = useState(false);

  // Live timer for 5-minute countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

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
      params.set("scope", scope);
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
      console.error("Failed to load orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOrders();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, activeTab, scope]);

  const formatCurrency = (amt: number | string | undefined | null) => {
    const num = Number(amt) || 0;
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(num);
  };

  /**
   * Calculate live remaining cancellation time for an order
   */
  const getCancelRemaining = (createdAt: string) => {
    const created = new Date(createdAt).getTime();
    if (isNaN(created)) return null;
    const diff = 5 * 60 * 1000 - (now - created);
    if (diff <= 0) return null;
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs < 10 ? "0" : ""}${secs}s`;
  };

  const handleCancelOrder = async (orderId: number) => {
    setCancelLoading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to cancel order");
      }
      toast.success(data.message || "Order has been cancelled successfully.");
      setCancelConfirmOrder(null);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, fulfillment_status: "Cancelled" } : null));
      }
      loadOrders();
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel order");
    } finally {
      setCancelLoading(false);
    }
  };

  const handleStatusUpdated = (updatedOrder: any) => {
    if (selectedOrder && selectedOrder.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder);
    }
    loadOrders();
  };

  const getFulfillmentBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "received") {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-xs font-semibold gap-1 animate-pulse">
          <Clock className="size-3" /> Received
        </Badge>
      );
    }
    if (s === "confirmed") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold gap-1">
          <CheckCircle2 className="size-3" /> Confirmed
        </Badge>
      );
    }
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
    if (s === "ready for pickup") {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-xs font-semibold gap-1">
          <Store className="size-3" /> Ready for Pickup
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
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <ShoppingCart className="size-5 text-[#d9232e]" /> My Orders &amp; Bookings
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          {scope === "purchases"
            ? "View orders you have placed, tracking status, item details, and receipts."
            : "Manage orders placed by customers on your store & services. Update status and generate bills."}
        </p>
      </div>

      {/* Scope Switcher: My Purchases vs Store Orders Received */}
      <div className="flex items-center border-b pb-1 gap-2">
        <button
          type="button"
          onClick={() => {
            setScope("purchases");
            setActiveTab("all");
          }}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            scope === "purchases"
              ? "border-[#d9232e] text-[#d9232e]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <ShoppingCart className="size-3.5" /> My Purchases (Orders Placed)
        </button>

        <button
          type="button"
          onClick={() => {
            setScope("sales");
            setActiveTab("all");
          }}
          className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
            scope === "sales"
              ? "border-[#d9232e] text-[#d9232e]"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Store className="size-3.5" /> Store Orders Received (Merchant Sales)
        </button>
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
            <div className="p-12 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="size-4 animate-spin text-[#d9232e]" /> Loading orders...
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <div className="size-12 rounded-full bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                <Package className="size-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">
                  {scope === "purchases" ? "No purchases found" : "No store orders received yet"}
                </p>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {search
                    ? `No orders matching "${search}". Try searching with a different keyword.`
                    : scope === "purchases"
                    ? "You haven't placed any orders yet. Explore our marketplace to get started."
                    : "No customers have placed orders on your storefront or services yet."}
                </p>
              </div>
              {scope === "purchases" && (
                <Button asChild size="sm" className="bg-[#d9232e] hover:bg-[#d9232e]/90 text-white text-xs">
                  <Link href="/explore">Browse Marketplace</Link>
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Order ID</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Items &amp; Description</TableHead>
                    <TableHead className="text-xs">Payment</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((ord) => {
                    const isPendingAccept =
                      (ord.fulfillment_status || "").toLowerCase() === "received" ||
                      (ord.fulfillment_status || "").toLowerCase() === "pending" ||
                      (ord.fulfillment_status || "").toLowerCase() === "";
                    const canBuyerCancel =
                      Boolean(ord.is_buyer) &&
                      isPendingAccept &&
                      ord.fulfillment_status !== "Cancelled";

                    const isSeller = Boolean(ord.is_seller) || scope === "sales";

                    return (
                      <TableRow key={ord.id} className="hover:bg-muted/50">
                        <TableCell className="font-bold text-xs text-foreground whitespace-nowrap">
                          {ord.order_number}
                          {isSeller && (
                            <span className="block text-[10px] text-amber-600 font-semibold font-sans">
                              Customer: {ord.customer_name}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(ord.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-xs text-foreground max-w-[240px]">
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
                        <TableCell className="text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* View Details */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs font-semibold text-primary px-2"
                              onClick={() => {
                                setSelectedOrder(ord);
                                setDetailsOpen(true);
                              }}
                            >
                              <Eye className="size-3.5 mr-1" /> View Details
                            </Button>

                            {/* Bill / Invoice */}
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs font-bold px-2 text-slate-700 border-slate-300 hover:bg-slate-100"
                              onClick={() => {
                                setBillOrder(ord);
                                setBillOpen(true);
                              }}
                              title="Generate official invoice / bill"
                            >
                              <Receipt className="size-3.5 mr-1 text-[#d9232e]" /> Bill
                            </Button>

                            {/* Seller Status Change Control */}
                            {isSeller && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs font-bold px-2 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                                onClick={() => {
                                  setStatusOrder(ord);
                                  setStatusOpen(true);
                                }}
                              >
                                <RefreshCw className="size-3 mr-1" /> Status
                              </Button>
                            )}

                            {/* Buyer Cancel Button (only appears before order is accepted) */}
                            {canBuyerCancel && (
                              <Button
                                size="sm"
                                variant="destructive"
                                className="h-7 text-[11px] font-bold px-2.5 bg-rose-600 hover:bg-rose-700 text-white"
                                onClick={() => setCancelConfirmOrder(ord)}
                                title="Cancel Order before it is accepted by the store"
                              >
                                <XCircle className="size-3 mr-1" /> Cancel Order
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* 1. ORDER DETAILS MODAL                                                    */}
      {/* ========================================================================= */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
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
              {/* Buyer Cancellation Banner (Allowed until store accepts) */}
              {(() => {
                const isBuyer = Boolean(selectedOrder.is_buyer);
                const isCancelled = selectedOrder.fulfillment_status === "Cancelled";
                const isPendingAccept =
                  (selectedOrder.fulfillment_status || "").toLowerCase() === "received" ||
                  (selectedOrder.fulfillment_status || "").toLowerCase() === "pending" ||
                  (selectedOrder.fulfillment_status || "").toLowerCase() === "";

                if (isBuyer && !isCancelled && isPendingAccept) {
                  return (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2">
                        <Clock className="size-4 text-amber-600 shrink-0" />
                        <div>
                          <strong className="block">Order Received (Awaiting Store Acceptance):</strong>
                          <span>You can cancel this order before the store accepts it.</span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="h-8 text-xs font-bold px-3 shrink-0"
                        onClick={() => {
                          setDetailsOpen(false);
                          setCancelConfirmOrder(selectedOrder);
                        }}
                      >
                        Cancel Order
                      </Button>
                    </div>
                  );
                } else if (isBuyer && !isCancelled && !isPendingAccept) {
                  return (
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 flex items-center gap-2 text-[11px]">
                      <ShieldCheck className="size-4 text-emerald-600" />
                      <span>Order has been accepted by the store. Cancellation is no longer available.</span>
                    </div>
                  );
                }
                return null;
              })()}

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
                              <span className="text-[10px] text-muted-foreground block font-mono">
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
                  <span className="text-[#d9232e] font-black">{formatCurrency(selectedOrder.total_amount)}</span>
                </div>
              </div>

              {/* Delivery & Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {selectedOrder.shipping_address && (
                  <div className="p-3 border rounded-xl bg-card space-y-1">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <MapPin className="size-3.5 text-primary" /> Fulfillment / Delivery
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

              {/* Seller / Buyer Control Actions */}
              <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t">
                {/* Generate Bill Button */}
                <Button
                  size="sm"
                  className="bg-[#d9232e] hover:bg-[#d9232e]/90 text-white font-bold text-xs gap-1.5"
                  onClick={() => {
                    setBillOrder(selectedOrder);
                    setBillOpen(true);
                  }}
                >
                  <Receipt className="size-3.5" /> Generate Bill / Invoice
                </Button>

                {/* Seller Status Update button */}
                {(selectedOrder.is_seller || scope === "sales") && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="font-bold text-xs gap-1.5 border-amber-500/40 text-amber-700 hover:bg-amber-500/10"
                    onClick={() => {
                      setStatusOrder(selectedOrder);
                      setStatusOpen(true);
                    }}
                  >
                    <RefreshCw className="size-3.5" /> Change Status (Seller Only)
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* 2. OFFICIAL BILL / INVOICE DIALOG                                         */}
      {/* ========================================================================= */}
      <OrderBillDialog
        open={billOpen}
        onOpenChange={setBillOpen}
        order={billOrder}
      />

      {/* ========================================================================= */}
      {/* 3. SELLER ORDER STATUS DIALOG                                             */}
      {/* ========================================================================= */}
      <OrderStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        order={statusOrder}
        onSuccess={handleStatusUpdated}
      />

      {/* ========================================================================= */}
      {/* 4. BUYER CANCEL CONFIRMATION DIALOG                                       */}
      {/* ========================================================================= */}
      <Dialog
        open={Boolean(cancelConfirmOrder)}
        onOpenChange={(v) => !v && setCancelConfirmOrder(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
              <AlertCircle className="size-5" /> Cancel Order #{cancelConfirmOrder?.order_number}?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              You are cancelling this order before it has been accepted by the store.
              Once cancelled, the seller will be notified and the order will be stopped.
            </DialogDescription>
          </DialogHeader>

          {cancelConfirmOrder && (
            <div className="py-2 space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-mono font-bold text-foreground">{cancelConfirmOrder.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Refundable:</span>
                  <span className="font-bold text-rose-600">{formatCurrency(cancelConfirmOrder.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Window Remaining:</span>
                  <span className="font-bold text-amber-600">{getCancelRemaining(cancelConfirmOrder.created_at)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={cancelLoading}
              onClick={() => setCancelConfirmOrder(null)}
              className="text-xs font-semibold"
            >
              Keep Order
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={cancelLoading}
              onClick={() => cancelConfirmOrder && handleCancelOrder(cancelConfirmOrder.id)}
              className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs gap-1.5"
            >
              {cancelLoading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Cancelling...
                </>
              ) : (
                "Yes, Cancel Order"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
