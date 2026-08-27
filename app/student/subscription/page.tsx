"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthStore } from "@/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Sparkles,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Calendar,
  Database,
  RefreshCw,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { DummyRazorpayModal } from "@/components/subscriptions/razorpay-dummy-checkout-modal";

type Plan = {
  id: number;
  name: string;
  price: number;
  price_unit: string;
  validity_count: number;
  validity_unit: string;
  storage_limit_gb: number | null;
  description: string;
  target_role?: string;
  is_recurring?: boolean;
  badge_text?: string;
};

type ActiveSub = {
  id: number;
  package_id: number;
  package_name: string;
  status: string;
  starts_at: string;
  expires_at: string;
  price: number;
  price_unit: string;
  is_recurring: boolean;
  razorpay_payment_id: string;
};

export default function StudentSubscriptionPage() {
  const { accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activeSub, setActiveSub] = useState<ActiveSub | null>(null);
  const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<Plan | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/student/subscriptions", { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch plans");

      setPlans(data.plans || []);
      setActiveSub(data.activeSubscription || null);
    } catch (err: any) {
      toast.error(err.message || "Failed to load subscription status");
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleOpenCheckout = (plan: Plan) => {
    setSelectedPlanForPayment(plan);
    setPaymentModalOpen(true);
  };

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Student Membership & Access</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">My Subscription & Plans</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Unlock premium lecture notes, competitive mock tests, AI flashcards, and live doubt sessions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchSubscriptions} disabled={loading} className="gap-2 self-start md:self-auto">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Active Package Banner / Not Activated State */}
      {loading ? (
        <Skeleton className="h-32 w-full rounded-2xl" />
      ) : activeSub ? (
        <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {activeSub.package_name || "Activated Student Pass"}
                </h2>
                <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-xs px-2.5">
                  ACTIVE
                </Badge>
                {activeSub.is_recurring && (
                  <Badge variant="outline" className="border-emerald-600 text-emerald-700 dark:text-emerald-300 text-xs">
                    Recurring Auto-Renew
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Valid through:{" "}
                <span className="font-semibold text-foreground">
                  {new Date(activeSub.expires_at).toLocaleDateString("en-IN", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </p>
              {activeSub.razorpay_payment_id && (
                <p className="text-xs text-muted-foreground">
                  Transaction Reference: <span className="font-mono">{activeSub.razorpay_payment_id}</span>
                </p>
              )}
            </div>
          </div>
          <Badge variant="secondary" className="px-4 py-2 font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800">
            Full Access Unlocked
          </Badge>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 border border-amber-500/30 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                No package is activated
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                You are currently on the free preview tier. Choose a student package below to activate mock exams & study features.
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              if (plans.length > 0) handleOpenCheckout(plans[0]);
            }}
            className="bg-amber-600 hover:bg-amber-700 text-white font-semibold shrink-0 rounded-xl"
          >
            <Zap className="w-4 h-4 mr-2" />
            Explore Packages
          </Button>
        </div>
      )}

      {/* Available Packages Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold tracking-tight">Available Student Packages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrent = activeSub?.package_id === plan.id;
            return (
              <Card
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-2xl transition-all duration-300 hover:shadow-lg border ${
                  isCurrent
                    ? "border-emerald-500 bg-emerald-500/5 dark:border-emerald-500/60 ring-2 ring-emerald-500/20"
                    : "border-slate-200 dark:border-zinc-800 hover:border-blue-400"
                }`}
              >
                {plan.badge_text && (
                  <div className="absolute -top-3 right-5">
                    <Badge className="bg-blue-600 text-white text-xs px-3 py-0.5 shadow-sm">
                      {plan.badge_text}
                    </Badge>
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="line-clamp-2 mt-1">
                    {plan.description || "Comprehensive student study and exam preparation package."}
                  </CardDescription>
                  <div className="mt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-slate-900 dark:text-zinc-50">
                        {formatPrice(plan.price)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        / {plan.price_unit}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Valid for {plan.validity_count} {plan.validity_unit}
                      {plan.validity_count > 1 ? "s" : ""}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 text-sm">
                  {plan.storage_limit_gb && (
                    <div className="flex items-center gap-2 text-muted-foreground text-xs">
                      <Database className="w-4 h-4 text-blue-500" />
                      <span>{plan.storage_limit_gb} GB Cloud Notes Storage</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground text-xs">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Instant activation via Razorpay Sandbox</span>
                  </div>
                </CardContent>

                <CardFooter className="pt-2">
                  <Button
                    onClick={() => handleOpenCheckout(plan)}
                    disabled={isCurrent}
                    className={`w-full rounded-xl font-semibold text-sm ${
                      isCurrent
                        ? "bg-emerald-600/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-600/20 cursor-default"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                    }`}
                  >
                    {isCurrent ? (
                      <span className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> Current Active Plan
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4" /> Pay with Razorpay
                      </span>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Checkout Modal */}
      <DummyRazorpayModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        packageItem={selectedPlanForPayment}
        roleTarget="student"
        onSuccess={fetchSubscriptions}
      />
    </div>
  );
}
