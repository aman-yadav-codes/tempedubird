"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck2,
  Search,
  RefreshCw,
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  IndianRupee,
  MapPin,
  AlertCircle,
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CustomerSalesTabs } from "./customer-sales-tabs";
import { toast } from "sonner";

interface Booking {
  id: number;
  booking_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  service_name: string;
  booking_date: string;
  booking_time: string;
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

export function CustomerBookingsView() {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/bookings");
      const json = await res.json();
      if (res.ok && json.data) {
        setBookings(json.data);
      } else {
        setBookings([]);
      }
    } catch {
      toast.error("Failed to load service bookings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleCancel = async () => {
    if (!selectedBooking) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/customer/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedBooking.id, status: "cancelled" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Booking cancelled successfully.");
        setSelectedBooking(null);
        loadBookings();
      } else {
        toast.error(data.error || "Failed to cancel booking");
      }
    } catch {
      toast.error("Network error while cancelling booking");
    } finally {
      setCancelling(false);
    }
  };

  const filtered = bookings.filter((item) => {
    const q = search.toLowerCase();
    const svc = (item.service_name || "").toLowerCase();
    const biz = (item.business_name || item.professional_name || "").toLowerCase();
    const num = (item.booking_number || "").toLowerCase();
    return svc.includes(q) || biz.includes(q) || num.includes(q);
  });

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
          <Clock className="size-3" /> Pending Confirmation
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
    return (
      <Badge variant="outline" className="text-xs">
        {status}
      </Badge>
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Sales Navigation Tabs */}
      <CustomerSalesTabs />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <CalendarCheck2 className="size-5 text-primary" /> My Service Bookings &amp; Appointments
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage your booked appointments, training sessions, consultations, and salon services.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline" className="h-9 text-xs">
            <Link href="/explore">
              <Search className="size-3.5 mr-1.5" /> Book New Service
            </Link>
          </Button>
          <Button size="sm" variant="outline" onClick={loadBookings} className="h-9 text-xs">
            <RefreshCw className={`size-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by booking #, service name, or business..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 text-xs h-9"
        />
      </div>

      {/* Content */}
      <Card className="rounded-xl border shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-xs text-muted-foreground">
            <RefreshCw className="size-5 animate-spin mx-auto mb-2 text-primary" />
            Loading your bookings...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <CalendarCheck2 className="size-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold text-foreground">No bookings found</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              You haven&apos;t booked any services or appointments yet. Browse verified services across Varanasi to book directly.
            </p>
            <Button asChild size="sm" className="mt-4 text-xs bg-primary text-white">
              <Link href="/explore">Explore Services</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Booking #</TableHead>
                  <TableHead className="text-xs font-semibold">Service Name</TableHead>
                  <TableHead className="text-xs font-semibold">Service Provider</TableHead>
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
                    <TableCell className="text-xs font-medium">
                      {item.service_name}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex items-center gap-1.5 font-medium">
                        <Building2 className="size-3.5 text-muted-foreground" />
                        <span>{item.business_name || item.professional_name || "Business Provider"}</span>
                      </div>
                      {item.business_city && (
                        <span className="text-[11px] text-muted-foreground block pl-5">{item.business_city}</span>
                      )}
                    </TableCell>
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
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Booking Details Dialog */}
      <Dialog open={Boolean(selectedBooking)} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <CalendarCheck2 className="size-4 text-primary" /> Booking #{selectedBooking?.booking_number}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Service Appointment Details &amp; Confirmation Status
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

              <div className="grid grid-cols-2 gap-2.5 p-3 rounded-lg border bg-card">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Appointment Date:</span>
                  <span className="font-medium text-foreground">
                    {selectedBooking.booking_date ? String(selectedBooking.booking_date).slice(0, 10) : "To Be Decided"}
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
                  <span className="text-muted-foreground block text-[11px] font-semibold">Special Instructions:</span>
                  <p className="mt-0.5 text-foreground">{selectedBooking.notes}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2 flex items-center justify-between sm:justify-between border-t">
            {selectedBooking && selectedBooking.status !== "cancelled" && selectedBooking.status !== "completed" ? (
              <Button
                variant="destructive"
                size="sm"
                className="text-xs"
                onClick={handleCancel}
                disabled={cancelling}
              >
                {cancelling ? "Cancelling..." : "Cancel Booking"}
              </Button>
            ) : (
              <div />
            )}
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
