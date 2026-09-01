"use client";

import { useEffect, useState, useCallback, useId } from "react";
import {
  ShoppingCart,
  Search,
  Filter,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Building2,
  TrendingUp,
  CheckCircle2,
  Clock,
  IndianRupee,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  Printer,
  FileText,
  Package,
  Truck,
  AlertCircle,
  MoreVertical,
  X,
  CreditCard,
  Receipt,
  User,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import type { SalesOrder, SalesOrderItem } from "@/lib/queries/orders";

type Stats = {
  totalOrders: number;
  totalRevenue: number;
  paidCount: number;
  pendingCount: number;
  avgOrderValue: number;
};

type InstitutionOption = {
  id: number;
  name: string;
};

export default function SalesOrdersPage() {
  const { user } = useAuthStore();
  const isPlatformAdmin = Boolean(user?.role_codes?.includes("platform_admin") || user?.is_super_admin);

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalOrders: 0,
    totalRevenue: 0,
    paidCount: 0,
    pendingCount: 0,
    avgOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");
  const [fulfillmentStatusFilter, setFulfillmentStatusFilter] = useState("all");
  const [selectedInstId, setSelectedInstId] = useState<string>("all");
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [viewOrder, setViewOrder] = useState<SalesOrder | null>(null);
  const [statusModalOrder, setStatusModalOrder] = useState<SalesOrder | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // New Order Form state
  const [formData, setFormData] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    shipping_address: "",
    notes: "",
    institution_id: "",
    payment_status: "Paid",
    payment_method: "Online (UPI / Card)",
    fulfillment_status: "Delivered",
    discount_amount: 0,
    tax_amount: 0,
    items: [
      { product_name: "", product_code: "", quantity: 1, unit_price: 0, total_price: 0 },
    ],
  });

  // Status update state
  const [editPaymentStatus, setEditPaymentStatus] = useState("Paid");
  const [editFulfillmentStatus, setEditFulfillmentStatus] = useState("Delivered");
  const [editNotes, setEditNotes] = useState("");

  const searchInputId = useId();

  // Load institutions list for platform admin
  useEffect(() => {
    if (!isPlatformAdmin) return;
    fetch("/api/admin/institutions?limit=100")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setInstitutions(data.data);
        }
      })
      .catch(() => {});
  }, [isPlatformAdmin]);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (paymentStatusFilter !== "all") params.set("paymentStatus", paymentStatusFilter);
      if (fulfillmentStatusFilter !== "all") params.set("fulfillmentStatus", fulfillmentStatusFilter);
      if (isPlatformAdmin && selectedInstId !== "all") params.set("institutionId", selectedInstId);

      const res = await fetch(`/api/admin/sales/orders?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setOrders(data.data || []);
        if (data.stats) setStats(data.stats);
      } else {
        toast.error(data.error || "Failed to load orders");
      }
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [search, paymentStatusFilter, fulfillmentStatusFilter, selectedInstId, isPlatformAdmin]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  // Handle items calculation in new order
  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...formData.items];
    updated[index] = { ...updated[index], [field]: value };
    if (field === "quantity" || field === "unit_price") {
      const q = Number(field === "quantity" ? value : updated[index].quantity) || 1;
      const p = Number(field === "unit_price" ? value : updated[index].unit_price) || 0;
      updated[index].total_price = q * p;
    }
    setFormData((prev) => ({ ...prev, items: updated }));
  };

  const addItemRow = () => {
    setFormData((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { product_name: "", product_code: "", quantity: 1, unit_price: 0, total_price: 0 },
      ],
    }));
  };

  const removeItemRow = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const subtotal = formData.items.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0);
  const totalAmount = Math.max(0, subtotal - Number(formData.discount_amount || 0) + Number(formData.tax_amount || 0));

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer_name.trim() || !formData.customer_email.trim()) {
      toast.error("Customer name and email are required");
      return;
    }
    if (formData.items.some((i) => !i.product_name.trim())) {
      toast.error("Please provide product name for all items");
      return;
    }

    setCreating(true);
    try {
      const payload = {
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        shipping_address: formData.shipping_address,
        notes: formData.notes,
        institution_id: formData.institution_id ? Number(formData.institution_id) : undefined,
        subtotal_amount: subtotal,
        discount_amount: Number(formData.discount_amount) || 0,
        tax_amount: Number(formData.tax_amount) || 0,
        total_amount: totalAmount,
        payment_status: formData.payment_status,
        payment_method: formData.payment_method,
        fulfillment_status: formData.fulfillment_status,
        items: formData.items,
      };

      const res = await fetch("/api/admin/sales/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Order created successfully!");
        setCreateDialogOpen(false);
        setFormData({
          customer_name: "",
          customer_email: "",
          customer_phone: "",
          shipping_address: "",
          notes: "",
          institution_id: "",
          payment_status: "Paid",
          payment_method: "Online (UPI / Card)",
          fulfillment_status: "Delivered",
          discount_amount: 0,
          tax_amount: 0,
          items: [{ product_name: "", product_code: "", quantity: 1, unit_price: 0, total_price: 0 }],
        });
        loadOrders();
      } else {
        toast.error(data.error || "Failed to create order");
      }
    } catch {
      toast.error("Error creating order");
    } finally {
      setCreating(false);
    }
  };

  const handleOpenStatusModal = (order: SalesOrder) => {
    setStatusModalOrder(order);
    setEditPaymentStatus(order.payment_status);
    setEditFulfillmentStatus(order.fulfillment_status);
    setEditNotes(order.notes || "");
  };

  const handleUpdateStatus = async () => {
    if (!statusModalOrder) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch("/api/admin/sales/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: statusModalOrder.id,
          payment_status: editPaymentStatus,
          fulfillment_status: editFulfillmentStatus,
          notes: editNotes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Order status updated!");
        setStatusModalOrder(null);
        loadOrders();
      } else {
        toast.error(data.error || "Failed to update order");
      }
    } catch {
      toast.error("Error updating order status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleDeleteOrder = async (id: number) => {
    if (!confirm("Are you sure you want to delete this order?")) return;
    try {
      const res = await fetch(`/api/admin/sales/orders?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Order deleted");
        loadOrders();
      } else {
        toast.error(data.error || "Failed to delete");
      }
    } catch {
      toast.error("Error deleting order");
    }
  };

  const handleViewReceipt = async (order: SalesOrder) => {
    try {
      const res = await fetch(`/api/admin/sales/orders/${order.id}`);
      const data = await res.json();
      if (data.success && data.data) {
        setViewOrder(data.data);
      } else {
        setViewOrder(order);
      }
    } catch {
      setViewOrder(order);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
            <ShoppingCart className="size-4" />
            <span>Sales & Commerce</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-foreground">
            Sales Orders & Invoices
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Track student store purchases, course booksets, identity kits, merchandise, and payment receipts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={loadOrders}
            disabled={loading}
            className="h-9 gap-1.5 text-xs font-bold"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            onClick={() => setCreateDialogOpen(true)}
            size="sm"
            className="h-9 gap-1.5 text-xs font-bold shadow-xs"
          >
            <Plus className="size-3.5" />
            New Order
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border/80 bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase">Total Revenue</span>
              <IndianRupee className="size-4 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-black text-foreground">
              {formatCurrency(stats.totalRevenue)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">All fulfilled and settled orders</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase">Total Orders</span>
              <ShoppingCart className="size-4 text-primary" />
            </div>
            <CardTitle className="text-2xl font-black text-foreground">
              {stats.totalOrders}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">Recorded customer transactions</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase">Paid / Completed</span>
              <CheckCircle2 className="size-4 text-emerald-600" />
            </div>
            <CardTitle className="text-2xl font-black text-emerald-600">
              {stats.paidCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">Payments received & cleared</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase">Pending Payment</span>
              <Clock className="size-4 text-amber-500" />
            </div>
            <CardTitle className="text-2xl font-black text-amber-600">
              {stats.pendingCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">Awaiting bank/cash settlement</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="text-xs font-bold uppercase">Avg Order Value</span>
              <TrendingUp className="size-4 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-black text-blue-600">
              {formatCurrency(stats.avgOrderValue)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground">Average transaction ticket size</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <Card className="border-border/80 bg-card">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id={searchInputId}
                placeholder="Search by Order #, Customer name, email, phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* Institution Filter (Platform Admin only) */}
              {isPlatformAdmin && institutions.length > 0 && (
                <Select value={selectedInstId} onValueChange={setSelectedInstId}>
                  <SelectTrigger className="w-[180px] h-9 text-xs">
                    <Building2 className="size-3.5 mr-1.5 text-muted-foreground" />
                    <SelectValue placeholder="All Institutions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Institutions</SelectItem>
                    {institutions.map((inst) => (
                      <SelectItem key={inst.id} value={String(inst.id)}>
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Payment Status Filter */}
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Payment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Payments</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>

              {/* Fulfillment Status Filter */}
              <Select value={fulfillmentStatusFilter} onValueChange={setFulfillmentStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs">
                  <SelectValue placeholder="Fulfillment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Deliveries</SelectItem>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Ready for Pickup">Ready for Pickup</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-16 text-center">
          <Loader2 className="size-8 animate-spin text-primary mb-3" />
          <p className="text-xs text-muted-foreground">Loading sales orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <Card className="border-dashed p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground mb-3">
            <ShoppingCart className="size-6" />
          </div>
          <h3 className="font-bold text-sm">No Sales Orders Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
            No orders match your search criteria. Create a new manual order or adjust your filters.
          </p>
          <Button onClick={() => setCreateDialogOpen(true)} size="sm" className="gap-1.5 text-xs font-bold">
            <Plus className="size-3.5" />
            Create First Order
          </Button>
        </Card>
      ) : (
        <div className="rounded-xl border border-border/80 overflow-hidden bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/80 bg-muted/40 font-bold text-muted-foreground">
                  <th className="p-3.5 pl-4">Order #</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Institution / Campus</th>
                  <th className="p-3.5">Items Summary</th>
                  <th className="p-3.5 text-right">Amount</th>
                  <th className="p-3.5">Payment</th>
                  <th className="p-3.5">Fulfillment</th>
                  <th className="p-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {orders.map((ord) => {
                  const isPaid = ord.payment_status === "Paid";
                  const isPending = ord.payment_status === "Pending";
                  const isDelivered = ord.fulfillment_status === "Delivered";

                  return (
                    <tr key={ord.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="font-mono font-bold text-foreground flex items-center gap-1.5">
                          <Receipt className="size-3.5 text-primary shrink-0" />
                          <span>{ord.order_number}</span>
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Calendar className="size-3" />
                          {new Date(ord.created_at).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="font-bold text-foreground">{ord.customer_name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span>{ord.customer_email}</span>
                          {ord.customer_phone && <span>· {ord.customer_phone}</span>}
                        </div>
                      </td>

                      <td className="p-3.5">
                        <Badge variant="outline" className="text-[10px] font-semibold bg-muted/30">
                          <Building2 className="size-3 mr-1 text-muted-foreground" />
                          {ord.institution_name || "Campus Store"}
                        </Badge>
                      </td>

                      <td className="p-3.5 max-w-[260px]">
                        <p className="truncate text-foreground font-medium" title={ord.items_summary || "Store items"}>
                          {ord.items_summary || "Store Products"}
                        </p>
                        {ord.notes && (
                          <p className="text-[11px] text-muted-foreground truncate italic mt-0.5">
                            {ord.notes}
                          </p>
                        )}
                      </td>

                      <td className="p-3.5 text-right font-bold text-foreground">
                        {formatCurrency(Number(ord.total_amount))}
                      </td>

                      <td className="p-3.5">
                        <div className="flex flex-col gap-1 items-start">
                          <Badge
                            className={`text-[10px] font-bold ${
                              isPaid
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : isPending
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                            }`}
                            variant="outline"
                          >
                            {ord.payment_status}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {ord.payment_method}
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <Badge
                          variant="secondary"
                          className={`text-[10px] font-bold ${
                            isDelivered
                              ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <Package className="size-3 mr-1" />
                          {ord.fulfillment_status}
                        </Badge>
                      </td>

                      <td className="p-3.5 text-right pr-4">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewReceipt(ord)}
                            className="h-7 text-xs font-bold px-2 gap-1"
                          >
                            <FileText className="size-3.5 text-primary" />
                            Invoice
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" className="h-7 w-7">
                                <MoreVertical className="size-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              <DropdownMenuLabel>Order Options</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleViewReceipt(ord)} className="gap-2">
                                <Printer className="size-3.5" /> View & Print Receipt
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenStatusModal(ord)} className="gap-2">
                                <Truck className="size-3.5" /> Update Status & Notes
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteOrder(ord.id)}
                                className="gap-2 text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-3.5" /> Delete Order
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE ORDER DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Plus className="size-4 text-primary" />
              Create Sales / Product Order
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record a counter purchase, bookstore transaction, student uniform package, or custom order.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateOrder} className="space-y-4 pt-2">
            {/* Campus selection if platform admin */}
            {isPlatformAdmin && institutions.length > 0 && (
              <div>
                <Label className="text-xs font-bold">Campus / Institution</Label>
                <Select
                  value={formData.institution_id}
                  onValueChange={(val) => setFormData((p) => ({ ...p, institution_id: val }))}
                >
                  <SelectTrigger className="h-9 text-xs mt-1">
                    <SelectValue placeholder="Select Institution" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((inst) => (
                      <SelectItem key={inst.id} value={String(inst.id)}>
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Customer Details */}
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <Label className="text-xs font-bold">Customer Name *</Label>
                <Input
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={formData.customer_name}
                  onChange={(e) => setFormData((p) => ({ ...p, customer_name: e.target.value }))}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Customer Email *</Label>
                <Input
                  required
                  type="email"
                  placeholder="e.g. student@gmail.com"
                  value={formData.customer_email}
                  onChange={(e) => setFormData((p) => ({ ...p, customer_email: e.target.value }))}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Phone Number</Label>
                <Input
                  placeholder="+91 98765 43210"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData((p) => ({ ...p, customer_phone: e.target.value }))}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            {/* Order Items */}
            <div className="space-y-2 pt-1 border-t border-border/60">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold">Order Items & Products</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItemRow}
                  className="h-7 text-xs font-bold gap-1"
                >
                  <Plus className="size-3" /> Add Item
                </Button>
              </div>

              {formData.items.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-muted/30 p-2 rounded-lg border">
                  <div className="flex-1">
                    <Input
                      placeholder="Product / Kit / Book Name"
                      value={item.product_name}
                      onChange={(e) => handleItemChange(idx, "product_name", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      placeholder="Code (Opt)"
                      value={item.product_code || ""}
                      onChange={(e) => handleItemChange(idx, "product_code", e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="w-16">
                    <Input
                      type="number"
                      min="1"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                      className="h-8 text-xs text-center"
                    />
                  </div>
                  <div className="w-24">
                    <Input
                      type="number"
                      min="0"
                      placeholder="Price (₹)"
                      value={item.unit_price}
                      onChange={(e) => handleItemChange(idx, "unit_price", e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="w-24 font-bold text-xs text-right pr-1">
                    {formatCurrency(item.total_price)}
                  </div>
                  {formData.items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => removeItemRow(idx)}
                      className="h-7 w-7 text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="grid gap-3 sm:grid-cols-3 bg-muted/40 p-3 rounded-lg border border-border/80">
              <div>
                <Label className="text-xs font-semibold">Discount Amount (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.discount_amount}
                  onChange={(e) => setFormData((p) => ({ ...p, discount_amount: Number(e.target.value) || 0 }))}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Tax / GST (₹)</Label>
                <Input
                  type="number"
                  min="0"
                  value={formData.tax_amount}
                  onChange={(e) => setFormData((p) => ({ ...p, tax_amount: Number(e.target.value) || 0 }))}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div className="flex flex-col justify-end text-right">
                <span className="text-[11px] font-bold text-muted-foreground uppercase">Grand Total</span>
                <span className="text-xl font-black text-primary">{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            {/* Payment & Fulfillment details */}
            <div className="grid gap-3 sm:grid-cols-3 pt-1 border-t border-border/60">
              <div>
                <Label className="text-xs font-bold">Payment Method</Label>
                <Select
                  value={formData.payment_method}
                  onValueChange={(val) => setFormData((p) => ({ ...p, payment_method: val }))}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Online (UPI / Card)">Online (UPI / Card)</SelectItem>
                    <SelectItem value="Cash / Counter Receipt">Cash / Counter Receipt</SelectItem>
                    <SelectItem value="Bank NEFT Transfer">Bank NEFT Transfer</SelectItem>
                    <SelectItem value="POS / Swipe Machine">POS / Swipe Machine</SelectItem>
                    <SelectItem value="Cheque">Cheque</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Payment Status</Label>
                <Select
                  value={formData.payment_status}
                  onValueChange={(val) => setFormData((p) => ({ ...p, payment_status: val }))}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Failed">Failed</SelectItem>
                    <SelectItem value="Refunded">Refunded</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-bold">Fulfillment Status</Label>
                <Select
                  value={formData.fulfillment_status}
                  onValueChange={(val) => setFormData((p) => ({ ...p, fulfillment_status: val }))}
                >
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Delivered">Delivered</SelectItem>
                    <SelectItem value="Processing">Processing</SelectItem>
                    <SelectItem value="Shipped">Shipped</SelectItem>
                    <SelectItem value="Ready for Pickup">Ready for Pickup</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Address & Notes */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-xs font-bold">Shipping / Delivery Address</Label>
                <Input
                  placeholder="Campus Counter Pickup / Student Hostel Room"
                  value={formData.shipping_address}
                  onChange={(e) => setFormData((p) => ({ ...p, shipping_address: e.target.value }))}
                  className="h-8 text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-bold">Order Notes / References</Label>
                <Input
                  placeholder="e.g. Admission ID: ADM-2026-104"
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  className="h-8 text-xs mt-1"
                />
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setCreateDialogOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={creating} className="gap-1.5 font-bold">
                {creating && <Loader2 className="size-3.5 animate-spin" />}
                Generate Order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW ORDER INVOICE / RECEIPT MODAL */}
      <Dialog open={Boolean(viewOrder)} onOpenChange={(open) => !open && setViewOrder(null)}>
        <DialogContent className="max-w-xl">
          {viewOrder && (
            <div className="space-y-4">
              {/* Receipt Header */}
              <div className="border-b pb-4 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-primary font-black text-lg">
                    <ShoppingCart className="size-5" />
                    <span>EduBird Campus Store</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {viewOrder.institution_name || "Maa Sharda Institute PVT LTD"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold text-sm text-foreground">{viewOrder.order_number}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {new Date(viewOrder.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Billed To & Status */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-muted/30 p-3 rounded-lg border">
                <div>
                  <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">
                    Billed To
                  </span>
                  <div className="font-bold text-foreground text-sm">{viewOrder.customer_name}</div>
                  <div className="text-muted-foreground">{viewOrder.customer_email}</div>
                  {viewOrder.customer_phone && (
                    <div className="text-muted-foreground">{viewOrder.customer_phone}</div>
                  )}
                  {viewOrder.shipping_address && (
                    <div className="text-muted-foreground mt-1 flex items-start gap-1">
                      <MapPin className="size-3 shrink-0 mt-0.5 text-primary" />
                      <span>{viewOrder.shipping_address}</span>
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="font-bold text-muted-foreground uppercase text-[10px] block mb-1">
                    Payment Details
                  </span>
                  <div className="font-bold text-emerald-600 text-sm">{viewOrder.payment_status}</div>
                  <div className="text-muted-foreground">{viewOrder.payment_method}</div>
                  <div className="mt-1">
                    <Badge variant="outline" className="text-[10px] font-bold">
                      {viewOrder.fulfillment_status}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted/50 font-bold border-b text-muted-foreground">
                      <th className="p-2.5 pl-3">Item Description</th>
                      <th className="p-2.5 text-center">Qty</th>
                      <th className="p-2.5 text-right">Price</th>
                      <th className="p-2.5 text-right pr-3">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {viewOrder.items && viewOrder.items.length > 0 ? (
                      viewOrder.items.map((item, i) => (
                        <tr key={i}>
                          <td className="p-2.5 pl-3 font-medium text-foreground">
                            {item.product_name}
                            {item.product_code && (
                              <span className="text-[10px] font-mono text-muted-foreground ml-1.5">
                                ({item.product_code})
                              </span>
                            )}
                          </td>
                          <td className="p-2.5 text-center">{item.quantity}</td>
                          <td className="p-2.5 text-right font-mono">{formatCurrency(Number(item.unit_price))}</td>
                          <td className="p-2.5 text-right pr-3 font-mono font-bold text-foreground">
                            {formatCurrency(Number(item.total_price))}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="p-2.5 pl-3 font-medium text-foreground">
                          {viewOrder.items_summary || "General Store Merchandise"}
                        </td>
                        <td className="p-2.5 text-center">1</td>
                        <td className="p-2.5 text-right font-mono">{formatCurrency(Number(viewOrder.total_amount))}</td>
                        <td className="p-2.5 text-right pr-3 font-mono font-bold text-foreground">
                          {formatCurrency(Number(viewOrder.total_amount))}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="flex justify-end pt-1">
                <div className="w-56 space-y-1 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span className="font-mono">{formatCurrency(Number(viewOrder.subtotal_amount || viewOrder.total_amount))}</span>
                  </div>
                  {Number(viewOrder.discount_amount) > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span className="font-mono">- {formatCurrency(Number(viewOrder.discount_amount))}</span>
                    </div>
                  )}
                  {Number(viewOrder.tax_amount) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Tax / GST:</span>
                      <span className="font-mono">+ {formatCurrency(Number(viewOrder.tax_amount))}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1.5 font-bold text-foreground text-sm">
                    <span>Total Paid:</span>
                    <span className="font-black text-primary font-mono">{formatCurrency(Number(viewOrder.total_amount))}</span>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <DialogFooter className="pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => window.print()}
                  className="gap-1.5 text-xs font-bold"
                >
                  <Printer className="size-3.5" /> Print Receipt
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setViewOrder(null)}
                  className="text-xs font-bold"
                >
                  Close
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* UPDATE STATUS MODAL */}
      <Dialog open={Boolean(statusModalOrder)} onOpenChange={(open) => !open && setStatusModalOrder(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Truck className="size-4 text-primary" />
              Update Order Status ({statusModalOrder?.order_number})
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-bold">Payment Status</Label>
              <Select value={editPaymentStatus} onValueChange={setEditPaymentStatus}>
                <SelectTrigger className="h-9 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                  <SelectItem value="Refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold">Fulfillment Status</Label>
              <Select value={editFulfillmentStatus} onValueChange={setEditFulfillmentStatus}>
                <SelectTrigger className="h-9 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Delivered">Delivered</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                  <SelectItem value="Shipped">Shipped</SelectItem>
                  <SelectItem value="Ready for Pickup">Ready for Pickup</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-bold">Order Notes / Tracking Details</Label>
              <Input
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="e.g. Courier tracking ID, receipt remarks"
                className="h-9 text-xs mt-1"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setStatusModalOrder(null)}
              disabled={updatingStatus}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleUpdateStatus}
              disabled={updatingStatus}
              className="gap-1.5 font-bold"
            >
              {updatingStatus && <Loader2 className="size-3.5 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
