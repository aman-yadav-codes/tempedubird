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
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  ArrowRight,
  ArrowLeft,
  Truck,
  Store,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  Lock,
  LogIn,
  UserPlus,
  Loader2,
  Receipt,
  Sparkles,
  ShoppingBag,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { useCartStore, type CartItem } from "@/store";
import { AuthModalDialog } from "@/components/auth/auth-modal-dialog";

export function CartDrawer() {
  const {
    items,
    isOpen,
    setIsOpen,
    updateQuantity,
    removeItem,
    clearCart,
    getTotalCount,
    getTotalAmount,
  } = useCartStore();

  const { user } = useAuthStore();

  // Dialog stages: "cart" -> "checkout" -> "success"
  const [stage, setStage] = useState<"cart" | "checkout" | "success">("cart");
  const [loading, setLoading] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Checkout form states
  const [fulfillmentType, setFulfillmentType] = useState<"pickup" | "delivery">("pickup");
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [scheduledTime, setScheduledTime] = useState<string>("11:00 AM - 01:00 PM");
  const [customerName, setCustomerName] = useState<string>("");
  const [customerPhone, setCustomerPhone] = useState<string>("");
  const [customerEmail, setCustomerEmail] = useState<string>("");
  const [deliveryAddress, setDeliveryAddress] = useState<string>("");
  const [deliveryCity, setDeliveryCity] = useState<string>("");
  const [deliveryPostalCode, setDeliveryPostalCode] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("Online (UPI / Card / Netbanking)");
  const [notes, setNotes] = useState<string>("");
  const [placedOrder, setPlacedOrder] = useState<any | null>(null);

  // Initialize form defaults when user logs in or dialog opens
  useEffect(() => {
    if (isOpen) {
      if (stage !== "success") {
        setStage("cart");
      }
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setScheduledDate(tomorrow.toISOString().split("T")[0]);

      if (user) {
        setCustomerName(user.full_name || "");
        setCustomerPhone(user.phone || "");
        setCustomerEmail(user.email || "");
      }
    }
  }, [isOpen, user]);

  const totalCount = getTotalCount();
  const totalAmount = getTotalAmount();

  const handleProceedToCheckout = () => {
    if (items.length === 0) {
      toast.error("Your cart is empty.");
      return;
    }
    if (!user) {
      setAuthModalOpen(true);
      return;
    }
    setStage("checkout");
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      setAuthModalOpen(true);
      return;
    }

    if (!customerName.trim() || (!customerPhone.trim() && !customerEmail.trim())) {
      toast.error("Please enter your name and phone number or email.");
      return;
    }

    if (!scheduledDate) {
      toast.error("Please choose preferred date.");
      return;
    }

    if (fulfillmentType === "delivery" && !deliveryAddress.trim()) {
      toast.error("Please provide your delivery address.");
      return;
    }

    setLoading(true);
    try {
      const fullShippingAddress =
        fulfillmentType === "delivery"
          ? [deliveryAddress, deliveryCity, deliveryPostalCode].filter(Boolean).join(", ")
          : items[0]?.business_name ? `${items[0].business_name} Storefront` : "Merchant Store Location";

      const payload = {
        items: items.map((i) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          unitPrice: Number(i.price) || 0,
          totalPrice: (Number(i.price) || 0) * i.quantity,
          businessId: i.business_id || null,
        })),
        itemType: "product",
        totalAmount,
        fulfillmentType,
        scheduledDate,
        scheduledTime,
        shippingAddress: fullShippingAddress,
        paymentMethod,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
        notes: notes.trim(),
        businessId: items[0]?.business_id || null,
        institutionId: items[0]?.institution_id || null,
      };

      const res = await fetch("/api/orders/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to place order.");
      }

      setPlacedOrder(data.order);
      clearCart();
      setStage("success");
      toast.success(data.message || "Order placed successfully!");
    } catch (err: any) {
      toast.error(err?.message || "Order failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    if (stage === "success") {
      setStage("cart");
      setPlacedOrder(null);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg p-0 overflow-hidden rounded-2xl gap-0 border">
          {/* HEADER */}
          <div className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <ShoppingCart className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {stage === "cart"
                      ? `Shopping Cart (${totalCount})`
                      : stage === "checkout"
                      ? "Product Order Checkout"
                      : "Order Confirmed!"}
                  </h3>
                  <p className="text-[11px] text-white/80">
                    {stage === "cart"
                      ? "Review selected items before checkout"
                      : stage === "checkout"
                      ? "Select fulfillment & confirm details"
                      : "Thank you for your order"}
                  </p>
                </div>
              </div>

              {stage === "cart" && items.length > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={clearCart}
                  className="text-white/80 hover:text-white hover:bg-white/10 text-xs h-7 px-2"
                >
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* BODY */}
          <div className="p-4 sm:p-6 max-h-[70vh] overflow-y-auto">
            {/* 1. CART VIEW */}
            {stage === "cart" && (
              <div>
                {items.length === 0 ? (
                  <div className="py-12 text-center space-y-4">
                    <div className="size-16 rounded-2xl bg-muted mx-auto flex items-center justify-center text-muted-foreground">
                      <ShoppingBag className="size-8 opacity-40" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-foreground">Your Cart is Empty</h4>
                      <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                        Explore our products and click &quot;Add to Cart&quot; to buy fresh produce and groceries.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setIsOpen(false)}
                      className="text-xs font-bold"
                    >
                      Start Shopping
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors flex items-center gap-3"
                      >
                        {/* Thumbnail */}
                        <div className="relative size-16 rounded-lg bg-muted shrink-0 overflow-hidden border">
                          <Image
                            src={
                              item.image_url ||
                              "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=300&auto=format&fit=crop&q=60"
                            }
                            alt={item.name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-foreground truncate">
                              {item.name}
                            </h4>
                            <button
                              type="button"
                              onClick={() => removeItem(item.id)}
                              className="text-muted-foreground hover:text-rose-600 transition-colors p-1"
                              title="Remove item"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>

                          {item.brand && (
                            <p className="text-[11px] text-muted-foreground truncate">
                              {item.brand}
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-baseline gap-1">
                              <span className="text-xs font-black text-foreground">
                                ₹{item.price}
                              </span>
                              {item.unit && (
                                <span className="text-[10px] font-semibold text-muted-foreground">
                                  / {item.unit}
                                </span>
                              )}
                              {item.regular_price && Number(item.regular_price) > Number(item.price) && (
                                <span className="text-[10px] text-muted-foreground line-through">
                                  ₹{item.regular_price}
                                </span>
                              )}
                            </div>

                            {/* Quantity Controls */}
                            <div className="flex items-center border rounded-lg overflow-hidden bg-background shadow-2xs">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                className="size-6 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Minus className="size-3" />
                              </button>
                              <span className="w-7 text-center text-xs font-bold">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                className="size-6 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Subtotal summary card */}
                    <div className="mt-4 p-3.5 rounded-xl bg-muted/40 border space-y-2">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Total Items</span>
                        <span className="font-semibold text-foreground">{totalCount} items</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Fulfillment</span>
                        <span className="font-semibold text-foreground">Pickup / Delivery</span>
                      </div>
                      <div className="pt-2 border-t flex items-center justify-between text-sm font-bold text-foreground">
                        <span>Total Amount</span>
                        <span className="text-base font-black text-rose-600">₹{totalAmount}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. CHECKOUT VIEW */}
            {stage === "checkout" && (
              <form onSubmit={handlePlaceOrder} className="space-y-4">
                {/* Fulfillment Selection */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-foreground">Select Fulfillment Method</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFulfillmentType("pickup")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        fulfillmentType === "pickup"
                          ? "border-rose-600 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold ring-1 ring-rose-600"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <Store className="size-4 mb-1" />
                      <div className="text-xs">Store Pickup</div>
                      <div className="text-[10px] opacity-75 font-normal">Pick up at merchant shop</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFulfillmentType("delivery")}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        fulfillmentType === "delivery"
                          ? "border-rose-600 bg-rose-500/10 text-rose-700 dark:text-rose-400 font-bold ring-1 ring-rose-600"
                          : "border-border hover:bg-muted/40"
                      }`}
                    >
                      <Truck className="size-4 mb-1" />
                      <div className="text-xs">Doorstep Delivery</div>
                      <div className="text-[10px] opacity-75 font-normal">Delivered to your address</div>
                    </button>
                  </div>
                </div>

                {/* Date & Time Slot */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Preferred Date *</Label>
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
                    <Label className="text-xs font-semibold">Preferred Slot</Label>
                    <select
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-xs outline-none"
                    >
                      <option value="09:00 AM - 11:00 AM">09:00 AM - 11:00 AM</option>
                      <option value="11:00 AM - 01:00 PM">11:00 AM - 01:00 PM</option>
                      <option value="02:00 PM - 04:00 PM">02:00 PM - 04:00 PM</option>
                      <option value="04:00 PM - 06:00 PM">04:00 PM - 06:00 PM</option>
                      <option value="06:00 PM - 08:00 PM">06:00 PM - 08:00 PM</option>
                    </select>
                  </div>
                </div>

                {/* Delivery Address (if delivery selected) */}
                {fulfillmentType === "delivery" && (
                  <div className="space-y-2 p-3 bg-muted/30 rounded-xl border">
                    <Label className="text-xs font-bold text-foreground">Delivery Address *</Label>
                    <Textarea
                      placeholder="Flat/House No., Street name, Landmark..."
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      required
                      rows={2}
                      className="text-xs"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="City"
                        value={deliveryCity}
                        onChange={(e) => setDeliveryCity(e.target.value)}
                        className="text-xs h-8"
                      />
                      <Input
                        placeholder="Postal / PIN Code"
                        value={deliveryPostalCode}
                        onChange={(e) => setDeliveryPostalCode(e.target.value)}
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                )}

                {/* Contact info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Your Full Name *</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      placeholder="e.g. Rahul Sharma"
                      className="text-xs h-9"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Phone Number *</Label>
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

                {/* Payment Option */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Payment Option</Label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs shadow-xs outline-none"
                  >
                    <option value="Online (UPI / Card / Netbanking)">Online (UPI / QR / Debit / Credit Card)</option>
                    <option value="Cash on Delivery / Pickup">Cash on Delivery / Pay at Store</option>
                  </select>
                </div>

                {/* Order Summary in Checkout */}
                <div className="p-3 bg-muted/40 rounded-xl border flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-foreground">{totalCount} items</span>
                    <span className="text-muted-foreground ml-1">in order</span>
                  </div>
                  <div className="text-right font-black text-rose-600 text-sm">
                    Payable: ₹{totalAmount}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setStage("cart")}
                    className="gap-1 text-xs h-9"
                  >
                    <ArrowLeft className="size-3.5" /> Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    size="sm"
                    className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 gap-1.5 cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" /> Placing Order...
                      </>
                    ) : (
                      <>
                        Confirm Order (₹{totalAmount}) <ArrowRight className="size-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}

            {/* 3. SUCCESS VIEW */}
            {stage === "success" && placedOrder && (
              <div className="py-6 text-center space-y-4">
                <div className="size-16 rounded-full bg-emerald-500/10 text-emerald-600 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="size-10" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-base font-bold text-foreground">Order Placed Successfully!</h4>
                  <p className="text-xs text-muted-foreground">
                    Order Number: <span className="font-mono font-bold text-foreground">{placedOrder.order_number}</span>
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-muted/40 border text-left text-xs space-y-2 max-w-sm mx-auto">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fulfillment:</span>
                    <span className="font-semibold">{placedOrder.fulfillment_status || "Processing"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Paid:</span>
                    <span className="font-bold text-rose-600">₹{placedOrder.total_amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="font-medium">{placedOrder.payment_method}</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClose}
                    className="text-xs font-semibold"
                  >
                    Continue Shopping
                  </Button>
                  <Button
                    size="sm"
                    asChild
                    className="text-xs font-bold bg-primary text-primary-foreground"
                  >
                    <Link href="/admin/orders">View My Orders</Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* FOOTER for Cart Stage */}
          {stage === "cart" && items.length > 0 && (
            <div className="p-4 border-t bg-muted/10 flex items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-muted-foreground block">Subtotal</span>
                <span className="text-base font-black text-rose-600">₹{totalAmount}</span>
              </div>
              <Button
                onClick={handleProceedToCheckout}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs h-9 px-4 gap-1.5 cursor-pointer shadow-sm"
              >
                Proceed to Checkout ({totalCount}) <ArrowRight className="size-3.5" />
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Authentication Prompt Modal if user is not signed in */}
      <AuthModalDialog
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultTab="signup"
      />
    </>
  );
}

