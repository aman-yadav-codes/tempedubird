"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  User,
  Phone,
  Mail,
  ShieldCheck,
  Building2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { AuthModalDialog } from "@/components/auth/auth-modal-dialog";

export interface BookingServiceItem {
  id: number | string;
  name: string;
  price?: number | null;
  regular_price?: number | null;
  pricing_model?: string | null;
  estimated_duration?: string | null;
  service_location?: string | null;
  default_image_url?: string | null;
  provider_name?: string | null;
  provider_address?: string | null;
  business_id?: number | null;
  professional_id?: number | null;
  institution_id?: number | null;
}

interface ServiceBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: BookingServiceItem | null;
  onSuccess?: (booking: any) => void;
}

export function ServiceBookingDialog({
  open,
  onOpenChange,
  service,
  onSuccess,
}: ServiceBookingDialogProps) {
  const { user } = useAuthStore();

  const [step, setStep] = useState<1 | 2 | 3>(1); // 1 = Schedule, 2 = Payment & Confirm, 3 = Success
  const [loading, setLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Booking fields
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("11:00 AM - 12:30 PM");
  const [serviceMode, setServiceMode] = useState<string>("In-Person at Center / Salon");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Pay at Venue / Appointment");
  const [confirmedBooking, setConfirmedBooking] = useState<any | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setConfirmedBooking(null);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split("T")[0]);
      setScheduledTime("11:00 AM - 12:30 PM");
      setPaymentMethod("Pay at Venue / Appointment");
      setNotes("");

      if (user) {
        setCustomerName(user.full_name || "");
        setCustomerPhone(user.phone || "");
        setCustomerEmail(user.email || "");
      }
    }
  }, [open, user]);

  if (!service) return null;

  const price = service.price || service.regular_price || 0;

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    if (!scheduledDate) {
      toast.error("Please pick your preferred appointment date.");
      return;
    }
    if (!customerName.trim() || (!customerPhone.trim() && !customerEmail.trim())) {
      toast.error("Please provide your name and phone number or email.");
      return;
    }
    setStep(2);
  };

  const handleConfirmBooking = async () => {
    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        itemName: service.name,
        itemType: "service",
        quantity: 1,
        unitPrice: Number(price) || 0,
        totalAmount: Number(price) || 0,
        fulfillmentType: "appointment",
        scheduledDate,
        scheduledTime,
        shippingAddress: serviceMode === "Home Visit" && address ? `Home Visit: ${address}` : (service.provider_address || "Service Provider Location"),
        paymentMethod,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        notes: `Mode: ${serviceMode} | ${notes || "No extra instructions"}`,
        businessId: service.business_id || null,
        professionalId: service.professional_id || null,
        institutionId: service.institution_id || null,
      };

      const res = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to book appointment.");
      }

      setConfirmedBooking(data.order);
      setStep(3);
      toast.success("Appointment booked successfully!");
      if (onSuccess) onSuccess(data.order);
    } catch (err: any) {
      toast.error(err?.message || "Booking failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl gap-0 border">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-sky-600 to-indigo-700 text-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold uppercase tracking-wider">
                  Service Appointment Booking
                </Badge>
                <h3 className="text-base font-bold text-white line-clamp-1">
                  {service.name}
                </h3>
                <p className="text-[11px] text-white/80">
                  {service.provider_name ? `By ${service.provider_name}` : "Professional Service"}
                  {service.estimated_duration ? ` • ${service.estimated_duration}` : ""}
                </p>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-white/80 uppercase font-semibold block">Fee</span>
                <span className="text-lg font-black text-white">
                  {price ? `₹${price}` : "On Request"}
                </span>
              </div>
            </div>

            {/* Stepper */}
            {step < 3 && user && (
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/20 text-xs text-white/90">
                <span className={`flex items-center gap-1 font-semibold ${step >= 1 ? "text-white" : "text-white/60"}`}>
                  <span className="size-5 rounded-full bg-white text-sky-700 flex items-center justify-center text-[11px] font-bold">1</span>
                  Schedule & Info
                </span>
                <span className="text-white/40">›</span>
                <span className={`flex items-center gap-1 font-semibold ${step >= 2 ? "text-white" : "text-white/60"}`}>
                  <span className="size-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[11px] font-bold">2</span>
                  Confirm & Payment
                </span>
              </div>
            )}
          </div>

          {/* BODY */}
          <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto">
            {/* Auth Gate Screen if not signed in */}
            {!user ? (
              <div className="py-8 px-4 text-center space-y-4">
                <div className="size-16 rounded-2xl bg-sky-500/10 text-sky-600 mx-auto flex items-center justify-center">
                  <Lock className="size-8" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-foreground">Sign In Required to Book</h4>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Please register or sign in with your phone or email to schedule an appointment with this provider.
                  </p>
                </div>
                <Button
                  onClick={() => setAuthModalOpen(true)}
                  className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-9 px-6 gap-1.5 cursor-pointer"
                >
                  Sign In / Register to Book
                </Button>
              </div>
            ) : (
              <>
                {/* STEP 1: SCHEDULE */}
                {step === 1 && (
                  <form onSubmit={handleNext} className="space-y-4">
                    {/* Date and Time */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Appointment Date *</Label>
                        <Input
                          type="date"
                          value={scheduledDate}
                          min={new Date().toISOString().split("T")[0]}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          required
                          className="text-xs h-9"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Preferred Time Slot *</Label>
                        <select
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-xs outline-none"
                        >
                          <option value="09:00 AM - 10:30 AM">Morning (09:00 AM - 10:30 AM)</option>
                          <option value="11:00 AM - 12:30 PM">Morning (11:00 AM - 12:30 PM)</option>
                          <option value="02:00 PM - 03:30 PM">Afternoon (02:00 PM - 03:30 PM)</option>
                          <option value="04:00 PM - 05:30 PM">Evening (04:00 PM - 05:30 PM)</option>
                          <option value="06:00 PM - 07:30 PM">Evening (06:00 PM - 07:30 PM)</option>
                        </select>
                      </div>
                    </div>

                    {/* Mode / Location */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Service Mode / Location</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setServiceMode("In-Person at Center / Salon")}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                            serviceMode.includes("In-Person")
                              ? "border-sky-600 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 font-bold ring-1 ring-sky-600"
                              : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <Building2 className="size-3.5 mb-1 text-sky-600" />
                          <div>At Venue / Center</div>
                          <div className="text-[10px] opacity-75 font-normal">Visit provider premises</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setServiceMode("Home Visit / Doorstep")}
                          className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                            serviceMode.includes("Home")
                              ? "border-sky-600 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 font-bold ring-1 ring-sky-600"
                              : "border-border hover:bg-muted/40"
                          }`}
                        >
                          <MapPin className="size-3.5 mb-1 text-sky-600" />
                          <div>Home Visit</div>
                          <div className="text-[10px] opacity-75 font-normal">Provider visits your address</div>
                        </button>
                      </div>
                    </div>

                    {serviceMode.includes("Home") && (
                      <div className="space-y-1 p-3 bg-muted/40 rounded-xl border">
                        <Label className="text-xs font-semibold">Your Address for Home Visit *</Label>
                        <Textarea
                          placeholder="Complete address with landmark..."
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          required
                          rows={2}
                          className="text-xs"
                        />
                      </div>
                    )}

                    {/* Client Information */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Your Full Name *</Label>
                        <Input
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          required
                          placeholder="e.g. Ananya Sen"
                          className="text-xs h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Contact Phone Number *</Label>
                        <Input
                          type="tel"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          required
                          placeholder="e.g. 9876543210"
                          className="text-xs h-9"
                        />
                      </div>
                    </div>

                    {/* Additional Notes */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Special Requests / Requirements</Label>
                      <Textarea
                        placeholder="Any preferences or symptoms / details the provider should know..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={2}
                        className="text-xs"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        type="submit"
                        className="bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-9 px-5 gap-1.5 cursor-pointer"
                      >
                        Proceed to Confirmation <ArrowRight className="size-3.5" />
                      </Button>
                    </div>
                  </form>
                )}

                {/* STEP 2: PAYMENT & CONFIRM */}
                {step === 2 && (
                  <div className="space-y-4">
                    {/* Booking Review Card */}
                    <div className="p-3.5 bg-muted/40 rounded-xl border space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service:</span>
                        <span className="font-bold text-foreground">{service.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date & Slot:</span>
                        <span className="font-semibold text-foreground">{scheduledDate} @ {scheduledTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Service Mode:</span>
                        <span className="font-semibold text-foreground">{serviceMode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Client Name:</span>
                        <span className="font-semibold text-foreground">{customerName} ({customerPhone})</span>
                      </div>
                      <div className="pt-2 border-t flex justify-between items-center text-sm">
                        <span className="font-bold">Total Payable</span>
                        <span className="font-black text-sky-700 dark:text-sky-400">
                          {price ? `₹${price}` : "Free / Post-Service Billing"}
                        </span>
                      </div>
                    </div>

                    {/* Payment Mode */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Payment Method</Label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-xs outline-none"
                      >
                        <option value="Pay at Venue / Appointment">Pay at Appointment / Venue (Cash / UPI on spot)</option>
                        <option value="Online (UPI / Card / Netbanking)">Pay Online Now (Instant Confirmation)</option>
                      </select>
                    </div>

                    <div className="pt-3 flex items-center justify-between gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setStep(1)}
                        className="gap-1 text-xs h-9"
                      >
                        <ArrowLeft className="size-3.5" /> Back
                      </Button>

                      <Button
                        type="button"
                        onClick={handleConfirmBooking}
                        disabled={loading}
                        className="flex-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs h-9 gap-1.5 cursor-pointer shadow-sm"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" /> Confirming Booking...
                          </>
                        ) : (
                          <>
                            Confirm Appointment <CheckCircle2 className="size-3.5" />
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3: SUCCESS */}
                {step === 3 && confirmedBooking && (
                  <div className="py-6 text-center space-y-4">
                    <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
                      <CheckCircle2 className="size-10" />
                    </div>

                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-foreground">Appointment Booked!</h4>
                      <p className="text-xs text-muted-foreground">
                        Booking ID: <span className="font-mono font-bold text-foreground">{confirmedBooking.order_number}</span>
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-muted/40 border text-left text-xs space-y-2 max-w-sm mx-auto">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Date:</span>
                        <span className="font-semibold">{scheduledDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Time Slot:</span>
                        <span className="font-semibold">{scheduledTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-semibold">{serviceMode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <span className="font-bold text-emerald-600">Confirmed</span>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-center gap-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="text-xs font-semibold"
                      >
                        Done
                      </Button>
                      <Button
                        size="sm"
                        asChild
                        className="text-xs font-bold bg-primary text-primary-foreground"
                      >
                        <Link href="/admin/orders">View My Bookings</Link>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AuthModalDialog
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultTab="signup"
      />
    </>
  );
}

