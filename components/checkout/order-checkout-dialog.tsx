"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Store,
  Truck,
  Calendar,
  Clock,
  MapPin,
  CreditCard,
  CheckCircle2,
  Package,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ShieldCheck,
  ChevronRight,
  Receipt,
  User,
  Phone,
  Mail,
  UserPlus,
  LogIn,
  AlertCircle,
  Info,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { AuthModalDialog } from "@/components/auth/auth-modal-dialog";
import { isUserStoreOwner } from "@/lib/auth/store-ownership";
import {
  isWeightBasedProduct,
  STANDARD_WEIGHT_OPTIONS,
  calculateWeightPrice,
  formatWeightPrice,
  formatGramsDisplay,
} from "@/lib/utils/weight-unit";

export interface CheckoutItem {
  id: number | string;
  name: string;
  type: "product" | "service";
  price?: number | null;
  sale_price?: number | null;
  suggested_price_inr?: number | null;
  suggested_price_usd?: number | null;
  pricing_model?: string | null;
  duration_minutes?: number | null;
  image_url?: string | null;
  unit?: string | null;
  provider_name?: string | null;
  provider_address?: string | null;
  provider_phone?: string | null;
  institution_id?: number | null;
  seller_info?: any;
  provider_info?: any;
}

interface OrderCheckoutDialogProps {
  open?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
  item: CheckoutItem | null;
  country?: string; // "IN" | "US"
  onSuccess?: (order: any) => void;
}

export function OrderCheckoutDialog({
  open,
  isOpen,
  onOpenChange,
  onClose,
  item,
  country = "IN",
  onSuccess,
}: OrderCheckoutDialogProps) {
  const isDialogActive = Boolean(open ?? isOpen);
  const handleOpenChange = (v: boolean) => {
    if (!v && onClose) onClose();
    if (onOpenChange) onOpenChange(v);
  };
  const { user } = useAuthStore();

  const isProduct = item?.type === "product";
  const isService = item?.type === "service";

  // Auth gate modal state
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authDefaultTab, setAuthDefaultTab] = useState<"signin" | "signup">("signup");

  // Step indicator
  // For Product: 1 = Fulfillment Type -> 2 = Schedule & Address -> 3 = Payment -> 4 = Success
  // For Service: 1 = Appointment Schedule -> 2 = Payment -> 3 = Success
  const [step, setStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(false);

  // Form states
  const [quantity, setQuantity] = useState<number>(1);
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">("pickup");

  // Scheduling states
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("");

  // Customer & Delivery Address details
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [deliveryCity, setDeliveryCity] = useState<string>("");
  const [deliveryPostalCode, setDeliveryPostalCode] = useState<string>("");

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState<string>("Online (UPI / Card / Netbanking)");
  const [notes, setNotes] = useState<string>("");

  // Placed Order state
  const [completedOrder, setCompletedOrder] = useState<any | null>(null);

  // Weight & Grams Selection (for products priced in KG or weight units)
  const [selectedWeightKey, setSelectedWeightKey] = useState<string>("1kg");
  const [showCustomWeight, setShowCustomWeight] = useState(false);
  const [customGrams, setCustomGrams] = useState<string>("250");

  // Auto-populate user details when opened
  useEffect(() => {
    if (open) {
      setStep(1);
      setCompletedOrder(null);
      setQuantity(1);
      setFulfillmentType("pickup");
      setPaymentMethod("Online (UPI / Card / Netbanking)");
      setNotes("");

      if (item?.unit) {
        const meta = isWeightBasedProduct(item.unit);
        setSelectedWeightKey(meta.defaultKey);
        setShowCustomWeight(false);
      }

      // Set default tomorrow date
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split("T")[0]);
      setScheduledTime("11:00 AM - 01:00 PM");

      if (user) {
        setCustomerName(user.full_name || "");
        setCustomerPhone(user.phone || "");
        setCustomerEmail(user.email || "");
      }
    }
  }, [open, user, item]);

  if (!item) return null;

  // Compute unit price
  const basePrice = country === "US"
    ? (item.suggested_price_usd || item.price || item.sale_price || 0)
    : (item.suggested_price_inr || item.sale_price || item.price || 0);

  const weightMeta = isWeightBasedProduct(item.unit);
  let effectiveGrams = 1000;
  let effectiveDisplayUnit = item.unit || "unit";

  if (weightMeta.isWeight && isProduct) {
    if (showCustomWeight) {
      effectiveGrams = Math.max(10, Number(customGrams) || 100);
      effectiveDisplayUnit = formatGramsDisplay(effectiveGrams);
    } else {
      const opt = STANDARD_WEIGHT_OPTIONS.find((o) => o.key === selectedWeightKey) || STANDARD_WEIGHT_OPTIONS[3];
      effectiveGrams = opt.grams;
      effectiveDisplayUnit = opt.label;
    }
  }

  const unitPrice = weightMeta.isWeight && isProduct
    ? calculateWeightPrice(Number(basePrice) || 0, weightMeta.baseGrams, effectiveGrams)
    : (Number(basePrice) || 0);

  const totalPrice = unitPrice * Math.max(1, quantity);
  const currencySymbol = country === "US" ? "$" : "₹";

  const isOwner = isUserStoreOwner(user, {
    institution_id: item?.institution_id,
    institution_profile_id: item?.institution_id,
    user_id: item?.seller_info?.user_id || item?.provider_info?.user_id,
    owner_id: item?.seller_info?.owner_id || item?.provider_info?.owner_id,
  });

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();

    if (isOwner) {
      toast.error("Store Owner Restriction: You cannot place orders or book services from your own storefront.");
      return;
    }

    if (isProduct) {
      if (step === 1) {
        setStep(2);
      } else if (step === 2) {
        if (!scheduledDate) {
          toast.error("Please select a date.");
          return;
        }
        if (fulfillmentType === "delivery" && !deliveryAddress.trim()) {
          toast.error("Please enter your complete delivery address.");
          return;
        }
        if (!customerName.trim() || (!customerPhone.trim() && !customerEmail.trim())) {
          toast.error("Please enter your name and phone number or email.");
          return;
        }
        setStep(3);
      }
    } else {
      // Service
      if (step === 1) {
        if (!scheduledDate) {
          toast.error("Please choose your appointment date.");
          return;
        }
        if (!customerName.trim() || (!customerPhone.trim() && !customerEmail.trim())) {
          toast.error("Please enter your name and contact phone or email.");
          return;
        }
        setStep(2);
      }
    }
  };

  const handleConfirmOrder = async () => {
    if (isOwner) {
      toast.error("Store Owner Restriction: You cannot place orders or book services from your own storefront.");
      return;
    }

    setLoading(true);
    try {
      const fullShippingAddress = fulfillmentType === "delivery"
        ? [deliveryAddress, deliveryCity, deliveryPostalCode].filter(Boolean).join(", ")
        : item.provider_address || "Merchant Store Location";

      const payload = {
        itemName: weightMeta.isWeight && isProduct ? `${item.name} (${effectiveDisplayUnit})` : item.name,
        itemType: item.type,
        quantity: isProduct ? quantity : 1,
        unitPrice,
        totalAmount: totalPrice,
        fulfillmentType: isProduct ? fulfillmentType : "appointment",
        scheduledDate,
        scheduledTime,
        shippingAddress: fullShippingAddress,
        paymentMethod,
        customerName,
        customerPhone,
        customerEmail,
        notes,
        institutionId: item.institution_id || null,
      };

      const res = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to complete checkout.");
      }

      setCompletedOrder(data.order);
      toast.success(data.message || (isService ? "Appointment confirmed!" : "Order placed successfully!"));
      if (onSuccess) onSuccess(data.order);

      // Move to success screen
      setStep(isProduct ? 4 : 3);
    } catch (err: any) {
      toast.error(err.message || "Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <Dialog open={isDialogActive} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl p-0 overflow-hidden rounded-2xl gap-0 border">
        {/* MODAL HEADER */}
        <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Badge className="bg-white/20 text-white hover:bg-white/30 border-0 text-[10px] font-bold uppercase tracking-wider">
                {isProduct ? "Product Order Checkout" : "Service Appointment Booking"}
              </Badge>
              <h3 className="text-base font-bold text-white line-clamp-1">
                {item.name}
              </h3>
            </div>
            {unitPrice > 0 && (
              <div className="text-right">
                <div className="text-[11px] text-white/80">Price</div>
                <div className="text-xl font-black text-white flex items-baseline justify-end gap-1">
                  <span>{currencySymbol}{formatWeightPrice(unitPrice)}</span>
                  {(item.unit || effectiveDisplayUnit) && <span className="text-xs font-semibold text-white/80">/ {effectiveDisplayUnit}</span>}
                </div>
              </div>
            )}
          </div>

          {/* Stepper Bar */}
          {!completedOrder && user && (
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/20 text-xs text-white/90">
              {isProduct ? (
                <>
                  <span className={`flex items-center gap-1 font-semibold ${step >= 1 ? "text-white" : "text-white/60"}`}>
                    <span className="size-5 rounded-full bg-white text-rose-700 flex items-center justify-center text-[11px] font-bold">1</span>
                    Fulfillment
                  </span>
                  <ChevronRight className="size-3 text-white/50" />
                  <span className={`flex items-center gap-1 font-semibold ${step >= 2 ? "text-white" : "text-white/60"}`}>
                    <span className="size-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[11px] font-bold">2</span>
                    Date & Details
                  </span>
                  <ChevronRight className="size-3 text-white/50" />
                  <span className={`flex items-center gap-1 font-semibold ${step >= 3 ? "text-white" : "text-white/60"}`}>
                    <span className="size-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[11px] font-bold">3</span>
                    Payment
                  </span>
                </>
              ) : (
                <>
                  <span className={`flex items-center gap-1 font-semibold ${step >= 1 ? "text-white" : "text-white/60"}`}>
                    <span className="size-5 rounded-full bg-white text-rose-700 flex items-center justify-center text-[11px] font-bold">1</span>
                    Appointment Date & Time
                  </span>
                  <ChevronRight className="size-3 text-white/50" />
                  <span className={`flex items-center gap-1 font-semibold ${step >= 2 ? "text-white" : "text-white/60"}`}>
                    <span className="size-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[11px] font-bold">2</span>
                    Payment & Confirm
                  </span>
                </>
              )}
            </div>
          )}
        </div>

        {/* MODAL BODY */}
        <div className="p-5 max-h-[75vh] overflow-y-auto">
          {!user ? (
            <div className="py-8 px-4 text-center space-y-5">
              <div className="size-16 rounded-2xl bg-rose-500/10 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 mx-auto flex items-center justify-center shadow-inner">
                <Lock className="size-8" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-lg font-extrabold text-foreground">
                  {isService ? "Account Required to Book Service" : "Account Required to Buy Products"}
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {isService
                    ? "Please register or sign in to your account first to confirm your service appointment schedule and receive booking details."
                    : "Please register or sign in to your account first to place your order, track pickup or doorstep delivery, and receive your invoice receipt."}
                </p>
              </div>

              {/* Policy note: at a time either buy product or book services */}
              <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left flex items-start gap-3 max-w-md mx-auto text-xs">
                <AlertCircle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-amber-900 dark:text-amber-200 text-[11px] leading-relaxed">
                  <strong>Single Transaction Policy:</strong>
                  <div className="mt-0.5">
                    At a time, you can <strong>either purchase products OR book service appointments</strong>. Products and services cannot be mixed together in the same order.
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2 max-w-md mx-auto">
                <Button
                  type="button"
                  onClick={() => {
                    setAuthDefaultTab("signup");
                    setAuthModalOpen(true);
                  }}
                  className="w-full sm:w-1/2 bg-primary text-primary-foreground font-bold text-xs h-10 gap-2 shadow-xs cursor-pointer"
                >
                  <UserPlus className="size-4" />
                  Register Account
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setAuthDefaultTab("signin");
                    setAuthModalOpen(true);
                  }}
                  className="w-full sm:w-1/2 font-semibold text-xs h-10 gap-2 cursor-pointer"
                >
                  <LogIn className="size-4" />
                  Sign In
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* POLICY BANNER: SINGLE CATEGORY TRANSACTION */}
              {!completedOrder && (
                <div className="mb-4 p-2.5 rounded-xl border flex items-center justify-between text-xs bg-muted/30">
                  <div className="flex items-center gap-2">
                    {isProduct ? (
                      <Package className="size-4 text-primary" />
                    ) : (
                      <Calendar className="size-4 text-purple-600" />
                    )}
                    <span className="font-semibold text-foreground text-[11px]">
                      {isProduct
                        ? "Product Purchase Mode (Physical items only)"
                        : "Service Booking Mode (Appointment only)"}
                    </span>
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground">
                    {isProduct ? "No Services Mixed" : "No Products Mixed"}
                  </Badge>
                </div>
              )}

              {/* STORE OWNER PREVIEW BANNER */}
              {isOwner && !completedOrder && (
                <div className="mb-4 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 flex items-start gap-3 text-xs">
                  <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-bold block">Store Owner Preview</span>
                    <span>
                      You are the owner/manager of this listing. Store owners and providers cannot place orders or book appointments on their own listings.
                    </span>
                  </div>
                </div>
              )}

              {/* ========================================================= */}
              {/* PRODUCT FLOW: STEP 1 - FULFILLMENT CHOICE                 */}
              {/* ========================================================= */}
              {isProduct && step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div>
                <Label className="text-xs font-bold text-foreground block mb-2">
                  Select how you want to receive your product:
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option A: Store Pickup */}
                  <div
                    onClick={() => setFulfillmentType("pickup")}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                      fulfillmentType === "pickup"
                        ? "border-[#d9232e] bg-rose-50/50 dark:bg-rose-950/20 shadow-xs"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                        <Store className="size-5" />
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 font-semibold">
                        Free Pickup
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        Collect from Shop
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Pick up your packaged order directly from the store at your chosen date &amp; time.
                      </p>
                    </div>
                  </div>

                  {/* Option B: Home Delivery */}
                  <div
                    onClick={() => setFulfillmentType("delivery")}
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                      fulfillmentType === "delivery"
                        ? "border-[#d9232e] bg-rose-50/50 dark:bg-rose-950/20 shadow-xs"
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="size-9 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                        <Truck className="size-5" />
                      </div>
                      <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 font-semibold">
                        Doorstep Delivery
                      </Badge>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">
                        Wanted it Delivered
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Have your order safely dispatched and delivered directly to your home or office address.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weight & Grams Selection (for items priced in KG or weight units) */}
              {weightMeta.isWeight && (
                <div className="p-3.5 border rounded-xl bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div>
                      <Label className="text-xs font-bold text-foreground">Select Weight / Pack</Label>
                      <p className="text-[10px] text-muted-foreground">Order in grams or kilograms</p>
                    </div>
                    <Badge className="bg-rose-600 text-white font-bold text-xs">
                      {effectiveDisplayUnit}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {STANDARD_WEIGHT_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => {
                          setSelectedWeightKey(opt.key);
                          setShowCustomWeight(false);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedWeightKey === opt.key && !showCustomWeight
                            ? "bg-rose-600 text-white shadow-2xs"
                            : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
                        }`}
                      >
                        {opt.shortLabel}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowCustomWeight(!showCustomWeight)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        showCustomWeight
                          ? "bg-rose-600 text-white shadow-2xs"
                          : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
                      }`}
                    >
                      Custom g
                    </button>
                  </div>

                  {showCustomWeight && (
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border text-xs mt-1">
                      <span className="text-[11px] font-semibold text-muted-foreground shrink-0">Enter grams:</span>
                      <input
                        type="number"
                        min="10"
                        step="50"
                        placeholder="e.g. 350"
                        value={customGrams}
                        onChange={(e) => setCustomGrams(e.target.value)}
                        className="w-24 h-7 text-xs px-2 rounded border bg-background font-mono font-bold"
                      />
                      <span className="text-xs font-bold text-rose-600 shrink-0">
                        = {currencySymbol}{formatWeightPrice(unitPrice)} per pack
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Quantity Selector */}
              <div className="p-3.5 border rounded-xl bg-muted/20 flex items-center justify-between">
                <div>
                  <Label className="text-xs font-bold text-foreground">Quantity</Label>
                  <p className="text-[10px] text-muted-foreground">Select number of units</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8 text-xs font-bold"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  >
                    -
                  </Button>
                  <span className="w-8 text-center text-xs font-bold text-foreground">
                    {quantity}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-8 text-xs font-bold"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    +
                  </Button>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isOwner} className="bg-[#d9232e] hover:bg-[#d9232e]/90 text-white font-bold gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  Next: Select Date &amp; Time <ArrowRight className="size-3.5" />
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* ========================================================= */}
          {/* PRODUCT FLOW: STEP 2 - DATE, TIME & DETAILS               */}
          {/* ========================================================= */}
          {isProduct && step === 2 && (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div className="p-3 rounded-xl border bg-muted/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {fulfillmentType === "pickup" ? (
                    <Store className="size-4 text-primary" />
                  ) : (
                    <Truck className="size-4 text-blue-600" />
                  )}
                  <span className="font-semibold text-foreground">
                    {fulfillmentType === "pickup" ? "Store Pickup Selected" : "Home Delivery Selected"}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] text-primary"
                  onClick={() => setStep(1)}
                >
                  Change
                </Button>
              </div>

              {/* DATE & TIME SELECTOR */}
              <div className="border rounded-xl p-3.5 space-y-3 bg-card shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                  <Calendar className="size-3.5 text-primary" />
                  {fulfillmentType === "pickup" ? "When will you collect the product?" : "When should we deliver the product?"}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-semibold">
                      {fulfillmentType === "pickup" ? "Pickup Date *" : "Delivery Date *"}
                    </Label>
                    <Input
                      type="date"
                      min={todayStr}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">
                      {fulfillmentType === "pickup" ? "Preferred Pickup Time Slot" : "Preferred Delivery Time Slot"}
                    </Label>
                    <select
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none"
                    >
                      <option value="Morning (10:00 AM - 01:00 PM)">Morning (10:00 AM - 01:00 PM)</option>
                      <option value="Afternoon (01:00 PM - 04:00 PM)">Afternoon (01:00 PM - 04:00 PM)</option>
                      <option value="Evening (04:00 PM - 07:00 PM)">Evening (04:00 PM - 07:00 PM)</option>
                      <option value="Anytime (10:00 AM - 08:00 PM)">Anytime (10:00 AM - 08:00 PM)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* DELIVERY ADDRESS (ONLY IF HOME DELIVERY) */}
              {fulfillmentType === "delivery" && (
                <div className="border rounded-xl p-3.5 space-y-3 bg-card shadow-2xs">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                    <MapPin className="size-3.5 text-blue-600" />
                    Delivery Destination Address *
                  </div>

                  <div>
                    <Label className="text-[11px] font-semibold">House / Flat / Street Address *</Label>
                    <Input
                      placeholder="e.g. Flat 402, Sunrise Towers, Sigra"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      required
                      className="mt-1 h-9 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[11px] font-semibold">City / District</Label>
                      <Input
                        placeholder="e.g. Varanasi"
                        value={deliveryCity}
                        onChange={(e) => setDeliveryCity(e.target.value)}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[11px] font-semibold">Postal / PIN Code</Label>
                      <Input
                        placeholder="e.g. 221002"
                        value={deliveryPostalCode}
                        onChange={(e) => setDeliveryPostalCode(e.target.value)}
                        className="mt-1 h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CONTACT DETAILS */}
              <div className="border rounded-xl p-3.5 space-y-3 bg-card shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                  <User className="size-3.5 text-emerald-600" />
                  Your Contact Information
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-semibold">Full Name *</Label>
                    <Input
                      placeholder="Your full name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Mobile Number *</Label>
                    <Input
                      placeholder="10-digit mobile number"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold">Email Address (for order receipts)</Label>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setStep(1)}>
                  <ArrowLeft className="size-3.5 mr-1" /> Back
                </Button>
                <Button type="submit" size="sm" disabled={isOwner} className="bg-[#d9232e] hover:bg-[#d9232e]/90 text-white font-bold gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  Proceed to Payment <ArrowRight className="size-3.5" />
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* ========================================================= */}
          {/* PRODUCT FLOW: STEP 3 - PAYMENT & CONFIRMATION             */}
          {/* ========================================================= */}
          {isProduct && step === 3 && (
            <div className="space-y-4">
              {/* Order Summary Box */}
              <div className="border rounded-xl p-4 bg-muted/20 space-y-3">
                <h4 className="text-xs font-bold text-foreground border-b pb-2 flex items-center justify-between">
                  <span>Order Summary</span>
                  <Badge variant="outline" className="text-[10px]">
                    {fulfillmentType === "pickup" ? "🏪 Shop Pickup" : "🚚 Home Delivery"}
                  </Badge>
                </h4>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-foreground">
                      {item.name} × {quantity} {item.unit ? `(${item.unit})` : ""}
                    </span>
                    <span>{currencySymbol}{totalPrice.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Scheduled {fulfillmentType === "pickup" ? "Collection" : "Delivery"}:</span>
                    <span className="font-semibold text-foreground">{scheduledDate} ({scheduledTime})</span>
                  </div>
                  {fulfillmentType === "delivery" && deliveryAddress && (
                    <div className="flex justify-between text-muted-foreground text-[11px]">
                      <span>Destination:</span>
                      <span className="font-medium text-foreground text-right max-w-[240px] truncate">
                        {[deliveryAddress, deliveryCity].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Fulfillment Charges:</span>
                    <span className="text-emerald-600 font-bold">FREE</span>
                  </div>
                  <div className="flex justify-between text-sm font-extrabold text-foreground border-t pt-2 mt-2">
                    <span>Total Amount:</span>
                    <span className="text-[#d9232e]">{currencySymbol}{totalPrice.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* PAYMENT METHOD SELECTOR */}
              <div className="border rounded-xl p-4 bg-card shadow-2xs space-y-3">
                <Label className="text-xs font-bold text-foreground block">
                  Select Payment Method:
                </Label>

                <div className="space-y-2 text-xs">
                  <div
                    onClick={() => setPaymentMethod("Online (UPI / Card / Netbanking)")}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      paymentMethod.startsWith("Online")
                        ? "border-[#d9232e] bg-rose-50/40 dark:bg-rose-950/20 font-bold"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="size-4 text-primary" />
                      <div>
                        <div>Online Payment (UPI, Cards, Netbanking)</div>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          Instant verified confirmation with digital receipt
                        </div>
                      </div>
                    </div>
                    {paymentMethod.startsWith("Online") && <CheckCircle2 className="size-4 text-[#d9232e]" />}
                  </div>

                  <div
                    onClick={() => setPaymentMethod(fulfillmentType === "pickup" ? "Pay at Shop Pickup" : "Cash on Delivery (COD)")}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      !paymentMethod.startsWith("Online")
                        ? "border-[#d9232e] bg-rose-50/40 dark:bg-rose-950/20 font-bold"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Receipt className="size-4 text-emerald-600" />
                      <div>
                        <div>{fulfillmentType === "pickup" ? "Pay at Store upon Collection" : "Cash on Delivery (COD)"}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          Pay cash or UPI when collecting or upon delivery
                        </div>
                      </div>
                    </div>
                    {!paymentMethod.startsWith("Online") && <CheckCircle2 className="size-4 text-[#d9232e]" />}
                  </div>
                </div>
              </div>

              {/* Additional Note */}
              <div>
                <Label className="text-[11px] font-semibold">Special Instructions or Notes (Optional)</Label>
                <Input
                  placeholder="e.g. Call before delivery, handle with care"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setStep(2)} disabled={loading}>
                  <ArrowLeft className="size-3.5 mr-1" /> Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmOrder}
                  disabled={loading || isOwner}
                  className="bg-[#d9232e] hover:bg-[#d9232e]/90 text-white font-bold gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Processing Order...
                    </>
                  ) : (
                    <>
                      Confirm &amp; Place Order ({currencySymbol}{totalPrice.toLocaleString()})
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* ========================================================= */}
          {/* SERVICE FLOW: STEP 1 - BOOK APPOINTMENT DATE & TIME       */}
          {/* ========================================================= */}
          {isService && step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-300 text-xs flex items-center gap-2">
                <Calendar className="size-4 shrink-0 text-emerald-600" />
                <span>
                  Please select your preferred <strong>appointment date and time slot</strong> for this service.
                </span>
              </div>

              {/* DATE & TIME SELECTION */}
              <div className="border rounded-xl p-3.5 space-y-3 bg-card shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                  <Clock className="size-3.5 text-primary" />
                  Appointment Schedule
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-semibold">Appointment Date *</Label>
                    <Input
                      type="date"
                      min={todayStr}
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Preferred Time Slot *</Label>
                    <select
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="mt-1 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs focus-visible:outline-none"
                    >
                      <option value="10:00 AM - 11:00 AM">10:00 AM - 11:00 AM</option>
                      <option value="11:30 AM - 12:30 PM">11:30 AM - 12:30 PM</option>
                      <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM</option>
                      <option value="03:30 PM - 04:30 PM">03:30 PM - 04:30 PM</option>
                      <option value="05:00 PM - 06:00 PM">05:00 PM - 06:00 PM</option>
                      <option value="06:30 PM - 07:30 PM">06:30 PM - 07:30 PM</option>
                    </select>
                  </div>
                </div>

                {item.duration_minutes && (
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Sparkles className="size-3 text-amber-500" />
                    Estimated Duration: <strong>{item.duration_minutes} minutes</strong>
                  </div>
                )}
              </div>

              {/* CONTACT DETAILS */}
              <div className="border rounded-xl p-3.5 space-y-3 bg-card shadow-2xs">
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                  <User className="size-3.5 text-primary" />
                  Client Contact Information
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] font-semibold">Your Full Name *</Label>
                    <Input
                      placeholder="e.g. Rahul Sharma"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] font-semibold">Mobile Number *</Label>
                    <Input
                      placeholder="10-digit mobile number"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      required
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-[11px] font-semibold">Email Address (for appointment confirmation)</Label>
                  <Input
                    type="email"
                    placeholder="name@example.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              {/* Requirement Notes */}
              <div>
                <Label className="text-[11px] font-semibold">Service Requirement / Consultation Details</Label>
                <Textarea
                  placeholder="Describe your requirements or any specific questions for the professional/provider..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="mt-1 text-xs resize-none"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isOwner} className="bg-[#d9232e] hover:bg-[#d9232e]/90 text-white font-bold gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed">
                  Next: Payment &amp; Review <ArrowRight className="size-3.5" />
                </Button>
              </DialogFooter>
            </form>
          )}

          {/* ========================================================= */}
          {/* SERVICE FLOW: STEP 2 - PAYMENT & CONFIRMATION             */}
          {/* ========================================================= */}
          {isService && step === 2 && (
            <div className="space-y-4">
              {/* Booking Summary Box */}
              <div className="border rounded-xl p-4 bg-muted/20 space-y-3">
                <h4 className="text-xs font-bold text-foreground border-b pb-2 flex items-center justify-between">
                  <span>Appointment Summary</span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                    Confirmed Slot
                  </Badge>
                </h4>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between font-medium">
                    <span className="text-foreground">{item.name}</span>
                    <span>{unitPrice > 0 ? `${currencySymbol}${unitPrice.toLocaleString()}` : "Free Consultation"}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground text-[11px]">
                    <span>Appointment Date &amp; Slot:</span>
                    <span className="font-semibold text-foreground">{scheduledDate} ({scheduledTime})</span>
                  </div>
                  {item.provider_name && (
                    <div className="flex justify-between text-muted-foreground text-[11px]">
                      <span>Service Provider:</span>
                      <span className="font-semibold text-foreground">{item.provider_name}</span>
                    </div>
                  )}
                  {item.duration_minutes && (
                    <div className="flex justify-between text-muted-foreground text-[11px]">
                      <span>Duration:</span>
                      <span>{item.duration_minutes} mins</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm font-extrabold text-foreground border-t pt-2 mt-2">
                    <span>Payable Fee:</span>
                    <span className="text-[#d9232e]">
                      {unitPrice > 0 ? `${currencySymbol}${unitPrice.toLocaleString()}` : "Zero Advance (Quote Required)"}
                    </span>
                  </div>
                </div>
              </div>

              {/* PAYMENT METHOD SELECTOR */}
              <div className="border rounded-xl p-4 bg-card shadow-2xs space-y-3">
                <Label className="text-xs font-bold text-foreground block">
                  Select Payment Option:
                </Label>

                <div className="space-y-2 text-xs">
                  <div
                    onClick={() => setPaymentMethod("Online (UPI / Card / Netbanking)")}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      paymentMethod.startsWith("Online")
                        ? "border-[#d9232e] bg-rose-50/40 dark:bg-rose-950/20 font-bold"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <CreditCard className="size-4 text-primary" />
                      <div>
                        <div>Pay Online (UPI / Card / Netbanking)</div>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          Instant booking confirmation and digital invoice
                        </div>
                      </div>
                    </div>
                    {paymentMethod.startsWith("Online") && <CheckCircle2 className="size-4 text-[#d9232e]" />}
                  </div>

                  <div
                    onClick={() => setPaymentMethod("Pay at Appointment")}
                    className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      !paymentMethod.startsWith("Online")
                        ? "border-[#d9232e] bg-rose-50/40 dark:bg-rose-950/20 font-bold"
                        : "border-border hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Receipt className="size-4 text-emerald-600" />
                      <div>
                        <div>Pay at Appointment (Direct to Provider)</div>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          Settle payment directly during your appointment
                        </div>
                      </div>
                    </div>
                    {!paymentMethod.startsWith("Online") && <CheckCircle2 className="size-4 text-[#d9232e]" />}
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setStep(1)} disabled={loading}>
                  <ArrowLeft className="size-3.5 mr-1" /> Back
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleConfirmOrder}
                  disabled={loading || isOwner}
                  className="bg-[#d9232e] hover:bg-[#d9232e]/90 text-white font-bold gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Confirming Booking...
                    </>
                  ) : (
                    <>
                      Confirm &amp; Book Appointment
                    </>
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}

          {/* ========================================================= */}
          {/* SUCCESS SCREEN (BOTH PRODUCT & SERVICE)                   */}
          {/* ========================================================= */}
          {completedOrder && (
            <div className="py-6 px-2 text-center space-y-4">
              <div className="size-14 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="size-8" />
              </div>

              <div className="space-y-1">
                <h3 className="text-lg font-extrabold text-foreground">
                  {isService ? "Appointment Successfully Booked!" : "Order Successfully Placed!"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Your reference ID is <strong className="text-foreground">{completedOrder.order_number}</strong>
                </p>
              </div>

              {/* Order Info Card */}
              <div className="p-4 border rounded-xl bg-card text-xs space-y-2 text-left max-w-md mx-auto">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{isService ? "Service:" : "Product:"}</span>
                  <span className="font-bold text-foreground">{item.name}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">{isService ? "Appointment Slot:" : (fulfillmentType === "pickup" ? "Pickup Schedule:" : "Delivery Schedule:")}</span>
                  <span className="font-semibold text-foreground">{scheduledDate} ({scheduledTime})</span>
                </div>
                {isProduct && (
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-muted-foreground">Fulfillment:</span>
                    <span className="font-semibold text-foreground">
                      {fulfillmentType === "pickup" ? "🏪 Store Pickup" : "🚚 Doorstep Delivery"}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-b pb-2">
                  <span className="text-muted-foreground">Payment Status:</span>
                  <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                    {completedOrder.payment_status || "Confirmed"}
                  </Badge>
                </div>
                <div className="flex justify-between pt-1 font-extrabold">
                  <span>Total Amount:</span>
                  <span className="text-[#d9232e]">{currencySymbol}{totalPrice.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-3">
                <Button
                  asChild
                  size="sm"
                  className="w-full sm:w-auto bg-[#d9232e] hover:bg-[#d9232e]/90 text-white font-bold text-xs"
                >
                  <Link href="/admin/orders">
                    View in My Orders <ArrowRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto text-xs"
                  onClick={() => onOpenChange(false)}
                >
                  Continue Browsing
                </Button>
              </div>
            </div>
          )}
            </>
          )}
        </div>

        <AuthModalDialog
          open={authModalOpen}
          onOpenChange={setAuthModalOpen}
          defaultTab={authDefaultTab}
        />
      </DialogContent>
    </Dialog>
  );
}

