"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, RefreshCw, Store, ShieldCheck, AlertCircle } from "lucide-react";

interface OrderStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: any | null;
  onSuccess?: (updatedOrder: any) => void;
}

const FULFILLMENT_STATUSES = [
  { value: "Received", label: "Received (New Order Placed)" },
  { value: "Confirmed", label: "Confirmed (Order Accepted)" },
  { value: "Processing", label: "Processing (Preparing Order)" },
  { value: "Ready for Pickup", label: "Ready for Pickup (Customer Collect)" },
  { value: "Shipped", label: "Shipped (Dispatched for Delivery)" },
  { value: "Delivered", label: "Delivered (Completed)" },
  { value: "Cancelled", label: "Cancelled (Order Voided)" },
];

const PAYMENT_STATUSES = [
  { value: "Paid", label: "Paid" },
  { value: "Pending", label: "Pending" },
  { value: "Refunded", label: "Refunded" },
];

export function OrderStatusDialog({
  open,
  onOpenChange,
  order,
  onSuccess,
}: OrderStatusDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fulfillmentStatus, setFulfillmentStatus] = useState<string>(
    order?.fulfillment_status || "Processing"
  );
  const [paymentStatus, setPaymentStatus] = useState<string>(
    order?.payment_status || "Paid"
  );
  const [notes, setNotes] = useState<string>("");

  React.useEffect(() => {
    if (order) {
      setFulfillmentStatus(order.fulfillment_status || "Processing");
      setPaymentStatus(order.payment_status || "Paid");
      setNotes("");
    }
  }, [order]);

  if (!order) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_status",
          fulfillment_status: fulfillmentStatus,
          payment_status: paymentStatus,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update order status");
      }

      toast.success(data.message || `Order status updated to ${fulfillmentStatus}`);
      if (onSuccess) onSuccess(data.order);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 overflow-hidden rounded-2xl gap-0 border">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-4 sm:p-5">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
              <Store className="size-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                Update Order Status: {order.order_number}
              </h3>
              <p className="text-[11px] text-white/70">
                Seller Fulfillment Control &amp; Progress
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Order Summary Pill */}
          <div className="p-3 rounded-xl bg-muted/40 border space-y-1">
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Customer:</span>
              <span className="font-semibold text-foreground">{order.customer_name}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span className="text-muted-foreground">Current Status:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {order.fulfillment_status}
              </span>
            </div>
          </div>

          {/* Fulfillment Status Select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              Fulfillment Status
            </Label>
            <Select value={fulfillmentStatus} onValueChange={setFulfillmentStatus}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select fulfillment status" />
              </SelectTrigger>
              <SelectContent>
                {FULFILLMENT_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-muted-foreground">
              Only store sellers can change order status after receiving the order.
            </p>
          </div>

          {/* Payment Status Select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              Payment Status
            </Label>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select payment status" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_STATUSES.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-xs">
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Note */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-foreground">
              Status Notes / Customer Tracking Message (Optional)
            </Label>
            <Textarea
              placeholder="e.g. Package ready at counter #2, or Dispatched via courier"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-xs resize-none"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={loading}
              className="bg-[#d9232e] hover:bg-[#d9232e]/90 text-white font-bold text-xs gap-1.5 cursor-pointer shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" /> Updating...
                </>
              ) : (
                <>
                  <RefreshCw className="size-3.5" /> Save Status
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
