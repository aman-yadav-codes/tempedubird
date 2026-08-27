"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CreditCard, QrCode, Building, Loader2, CheckCircle2, ShieldCheck, Repeat } from "lucide-react";

interface DummyRazorpayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  packageItem: {
    id: number;
    name: string;
    price: number | string;
    price_unit?: string;
    validity_count?: number;
    validity_unit?: string;
    target_role?: string;
  } | null;
  institutionId?: number | null;
  roleTarget?: string;
  onSuccess?: () => void;
}

export function DummyRazorpayModal({
  open,
  onOpenChange,
  packageItem,
  institutionId,
  roleTarget = "institution_admin",
  onSuccess,
}: DummyRazorpayModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "card" | "netbanking">("upi");
  const [isRecurring, setIsRecurring] = useState(true);
  const [loading, setLoading] = useState(false);
  const [successState, setSuccessState] = useState(false);

  if (!packageItem) return null;

  const priceNum = Number(packageItem.price) || 0;
  const formattedPrice = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(priceNum);

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/razorpay/dummy-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: packageItem.id,
          institutionId,
          amount: priceNum,
          isRecurring,
          paymentMethod,
          roleTarget,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Payment failed");
      }

      setSuccessState(true);
      toast.success("Payment successful! Package activated.");
      setTimeout(() => {
        setSuccessState(false);
        onOpenChange(false);
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      toast.error(err.message || "Failed to process dummy payment");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-2xl">
        {/* Razorpay branded header */}
        <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 text-white p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center font-bold text-lg">
                ₹
              </div>
              <div>
                <h3 className="font-semibold text-lg leading-tight">Razorpay Test Gateway</h3>
                <p className="text-xs text-blue-100/80">Secured Sandbox Simulation</p>
              </div>
            </div>
            <Badge className="bg-emerald-500/20 text-emerald-200 border-emerald-400/30 text-xs px-2.5 py-0.5">
              TEST MODE
            </Badge>
          </div>

          <div className="mt-5 p-3 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-between">
            <div>
              <p className="text-xs text-blue-100 uppercase tracking-wide">Selected Plan</p>
              <p className="font-bold text-base">{packageItem.name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-blue-100 uppercase tracking-wide">Total Payable</p>
              <p className="text-xl font-extrabold">{formattedPrice}</p>
            </div>
          </div>
        </div>

        {successState ? (
          <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-slate-800 dark:text-zinc-100">Payment Successful!</h4>
            <p className="text-sm text-muted-foreground">Your package has been activated with instant access.</p>
          </div>
        ) : (
          <div className="p-6 space-y-5">
            {/* Recurring payment toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60">
              <div className="flex items-center gap-2.5">
                <Repeat className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <div>
                  <Label htmlFor="recurring-toggle" className="text-sm font-semibold cursor-pointer">
                    Enable Recurring Auto-Debit
                  </Label>
                  <p className="text-xs text-muted-foreground">Test monthly auto-renew subscription</p>
                </div>
              </div>
              <Switch
                id="recurring-toggle"
                checked={isRecurring}
                onCheckedChange={setIsRecurring}
              />
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Select Mock Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("upi")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition text-xs font-medium ${
                    paymentMethod === "upi"
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold"
                      : "border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  <QrCode className="w-5 h-5" />
                  UPI / QR
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("card")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition text-xs font-medium ${
                    paymentMethod === "card"
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold"
                      : "border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  <CreditCard className="w-5 h-5" />
                  Card
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("netbanking")}
                  className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition text-xs font-medium ${
                    paymentMethod === "netbanking"
                      ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold"
                      : "border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  <Building className="w-5 h-5" />
                  NetBanking
                </button>
              </div>
            </div>

            <div className="text-xs text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-900 p-3 rounded-lg flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Razorpay Sandbox: No real card or bank credentials will be charged.</span>
            </div>

            <Button
              onClick={handlePay}
              disabled={loading}
              className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                `Complete Test Payment (${formattedPrice})`
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
