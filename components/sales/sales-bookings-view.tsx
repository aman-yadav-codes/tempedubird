"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  CalendarCheck2,
  Search,
  Filter,
  RefreshCw,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  IndianRupee,
  User,
  Phone,
  Mail,
  MoreVertical,
  Check,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { AdminSalesTabs } from "./admin-sales-tabs";
import { toast } from "sonner";

interface Booking {
  id: number;
  booking_number: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  service_name: string;
  booking_date: string;
  booking_time?: string;
  notes?: string;
  status: string;
  total_price: number;
  payment_status: string;
  created_at: string;
  business_name?: string;
  business_city?: string;
  business_phone?: string;
  professional_name?: string;
}

interface SalesBookingsViewProps {
  scope?: "admin" | "workspace";
}

export function SalesBookingsView({ scope = "admin" }: SalesBookingsViewProps) {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const endpoint = scope === "workspace" ? "/api/business/bookings" : "/api/admin/sales/bookings";

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch(endpoint);
      const json = await res.json();
      if (res.ok && json.bookings) {
        setBookings(json.bookings);
      } else {
        setBookings([]);
      }
    } catch {
      toast.error("Failed to load bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, [endpoint]);

  const handleUpdateStatus = async (status: string) => {
    if (!selectedBooking) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedBooking.id, status }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Booking status marked as ${status}`);
        setSelectedBooking(null);
        loadBookings();
      } else {
        toast.error(data.error || "Failed to update booking status");
      }
    } catch {
      toast.error("Network error while updating status");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      const q = search.toLowerCase();
      const matchSearch =
        (b.booking_number || "").toLowerCase().includes(q) ||
        (b.customer_name || "").toLowerCase().includes(q) ||
        (b.customer_phone || "").toLowerCase().includes(q) ||
        (b.service_name || "").toLowerCase().includes(q) ||
        (b.business_name || "").toLowerCase().includes(q);

      const matchStatus = statusFilter === "all" || b.status.toLowerCase() === statusFilter.toLowerCase();
      return matchSearch && matchStatus;
    });
  }, [bookings, search, statusFilter]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const confirmed = bookings.filter((b) => b.status === "confirmed").length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    const revenue = bookings.reduce((sum, b) => sum + (Number(b.total_price) || 0), 0);
    return { total, confirmed, pending, completed, revenue };
  }, [bookings]);

  const getStatusBadge = (status: string) => {
    const s = (status || "").toLowerCase();
    if (s === "confirmed") {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs gap-1">
          <CheckCircle2 className="size-3" /> Confirmed
        </Badge>
      );
    }
    if (s === "pending") {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs gap-1">
          <Clock className="size-3" /> Pending
        </Badge>
      );
    }
    if (s === "completed") {
      return (
        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs gap-1">
          <CheckCircle2 className="size-3" /> Completed
        </Badge>
      );
    }
    if (s === "cancelled") {
      return (
        <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-xs gap-1">
          <XCircle className="size-3" /> Cancelled
        </Badge>
      );
    }
    return <Badge variant="outline" className="text-xs">{status}</Badge>;
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Sales Navigation Tabs */}
      <AdminSalesTabs scope={scope} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarCheck2 className="size-5 text-primary" /> Service Bookings &amp; Appointments
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {scope === "admin"
              ? "Oversee all customer service bookings, appointments, and consultations across Varanasi businesses."
              : "Manage incoming customer bookings, appointments, and schedules for your business."}
          </p>
        </div>

        <Button size="sm" variant="outline" onClick={loadBookings} className="h-9 text-xs">
          <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="rounded-xl border shadow-2xs p-3.5">
          <span className="text-[11px] font-semibold text-muted-foreground block">Total Bookings</span>
          <span className="text-xl font-extrabold text-foreground">{stats.total}</span>
        </Card>
        <Card className="rounded-xl border shadow-2xs p-3.5">
          <span className="text-[11px] font-semibold text-amber-600 block">Pending Confirmation</span>
          <span className="text-xl font-extrabold text-amber-600">{stats.pending}</span>
        </Card>
        <Card className="rounded-xl border shadow-2xs p-3.5">
          <span className="text-[11px] font-semibold text-emerald-600 block">Confirmed Appointments</span>
          <span className="text-xl font-extrabold text-emerald-600">{stats.confirmed}</span>
        </Card>
        <Card className="rounded-xl border shadow-2xs p-3.5">
          <span className="text-[11px] font-semibold text-primary block">Total Value</span>
          <span className="text-xl font-extrabold text-primary">₹{stats.revenue.toLocaleString("en-IN")}</span>
        </Card>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search booking #, customer, phone, or service..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36 text-xs h-9">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bookings Table */}
      <Card className="rounded-xl border shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
            Loading service bookings...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <CalendarCheck2 className="size-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold text-foreground">No bookings found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              When customers book appointments or service consultations, they will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Booking #</TableHead>
                  <TableHead className="text-xs font-semibold">Customer Details</TableHead>
                  <TableHead className="text-xs font-semibold">Service Name</TableHead>
                  {scope === "admin" && <TableHead className="text-xs font-semibold">Business Provider</TableHead>}
                  <TableHead className="text-xs font-semibold">Appointment Slot</TableHead>
                  <TableHead className="text-xs font-semibold">Price</TableHead>
                  <TableHead className="text-xs font-semibold">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold text-primary">
                      {item.booking_number}
                    </TableCell>
                    <TableCell className="text-xs">
                      <span className="font-medium text-foreground block">{item.customer_name}</span>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        {item.customer_phone && <span>{item.customer_phone}</span>}
                        {item.customer_email && <span>• {item.customer_email}</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-medium">
                      {item.service_name}
                    </TableCell>
                    {scope === "admin" && (
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-1.5 font-medium">
                          <Building2 className="size-3.5 text-muted-foreground" />
                          <span>{item.business_name || item.professional_name || "—"}</span>
                        </div>
                      </TableCell>
                    )}
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="size-3 text-muted-foreground" />
                        <span>{item.booking_date ? String(item.booking_date).slice(0, 10) : "TBD"}</span>
                      </div>
                      {item.booking_time && (
                        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pl-4 mt-0.5">
                          <Clock className="size-2.5" />
                          <span>{item.booking_time}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-bold">
                      {item.total_price ? `₹${Number(item.total_price).toLocaleString("en-IN")}` : "Free"}
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-primary hover:text-primary"
                        onClick={() => setSelectedBooking(item)}
                      >
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Booking Details & Status Management Dialog */}
      <Dialog open={Boolean(selectedBooking)} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarCheck2 className="size-4 text-primary" /> Booking #{selectedBooking?.booking_number}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Review booking details and update appointment confirmation status.
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-3.5 text-xs">
              <div className="p-3 rounded-lg bg-muted/50 border space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground text-sm">{selectedBooking.service_name}</span>
                  {getStatusBadge(selectedBooking.status)}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Building2 className="size-3.5 text-primary" />
                  <span>{selectedBooking.business_name || selectedBooking.professional_name || "Provider"}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border bg-card space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground block">Customer Information</span>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Name:</span>
                    <span className="font-semibold text-foreground">{selectedBooking.customer_name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Phone:</span>
                    <span className="font-medium text-foreground">{selectedBooking.customer_phone || "—"}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground block text-[11px]">Email:</span>
                    <span className="font-medium text-foreground">{selectedBooking.customer_email || "—"}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-lg border bg-card">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Scheduled Date:</span>
                  <span className="font-medium text-foreground">
                    {selectedBooking.booking_date ? String(selectedBooking.booking_date).slice(0, 10) : "TBD"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Time Slot:</span>
                  <span className="font-medium text-foreground">{selectedBooking.booking_time || "Flexible"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Total Fee:</span>
                  <span className="font-bold text-foreground">
                    {selectedBooking.total_price ? `₹${Number(selectedBooking.total_price).toLocaleString("en-IN")}` : "Free"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Payment Mode:</span>
                  <span className="font-medium text-foreground uppercase">{selectedBooking.payment_status || "Pending"}</span>
                </div>
              </div>

              {selectedBooking.notes && (
                <div className="p-2.5 rounded-lg border bg-muted/40">
                  <span className="text-muted-foreground block text-[11px] font-semibold">Customer Notes:</span>
                  <p className="mt-0.5 text-foreground">{selectedBooking.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-3 flex flex-wrap gap-2 items-center justify-between border-t">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                size="sm"
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => handleUpdateStatus("confirmed")}
                disabled={updatingStatus}
              >
                Confirm
              </Button>
              <Button
                size="sm"
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => handleUpdateStatus("completed")}
                disabled={updatingStatus}
              >
                Complete
              </Button>
              <Button
                size="sm"
                variant="destructive"
                className="text-xs"
                onClick={() => handleUpdateStatus("cancelled")}
                disabled={updatingStatus}
              >
                Cancel
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => setSelectedBooking(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
