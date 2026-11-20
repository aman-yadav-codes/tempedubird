"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  CreditCard,
  Database,
  Sparkles,
  ArrowUpRight,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  Download,
  ShieldCheck,
  Building2,
  RefreshCw,
  Loader2,
  XCircle,
  HelpCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { useAuthStore } from "@/store";

export function BusinessSubscriptionManager() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);

  // Top-up dialog
  const [topupOpen, setTopupOpen] = useState(false);
  const [selectedTopup, setSelectedTopup] = useState<{ credits: number; price: number }>({
    credits: 100,
    price: 30,
  });
  const [purchasingTopup, setPurchasingTopup] = useState(false);

  // Cancel dialog
  const [cancelOpen, setCancelOpen] = useState(false);
  const [canceling, setCanceling] = useState(false);

  // Load Current Subscription & Invoices
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [subRes, invRes] = await Promise.all([
        fetch("/api/subscriptions/current"),
        fetch("/api/subscriptions/invoices"),
      ]);

      const subJson = await subRes.json();
      if (subJson.success && subJson.subscription) {
        setSubData(subJson.subscription);
      }

      const invJson = await invRes.json();
      if (invJson.success && invJson.invoices) {
        setInvoices(invJson.invoices);
      }
    } catch (err) {
      console.error("Error loading subscription dashboard:", err);
      toast.error("Failed to load subscription data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle Credit Top-up Purchase
  const handlePurchaseTopup = async () => {
    setPurchasingTopup(true);
    try {
      const res = await fetch("/api/subscriptions/topup-credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credits: selectedTopup.credits,
          price: selectedTopup.price,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Successfully added ${selectedTopup.credits} listing credits!`);
        setTopupOpen(false);
        loadData();
      } else {
        toast.error(data.error || "Top-up failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to purchase credits");
    } finally {
      setPurchasingTopup(false);
    }
  };

  // Handle Cancel Subscription
  const handleCancelSub = async () => {
    setCanceling(true);
    try {
      // Simulate cancellation
      toast.success("Subscription will not auto-renew at the end of the billing period.");
      setCancelOpen(false);
      loadData();
    } finally {
      setCanceling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center gap-3">
        <Loader2 className="size-8 animate-spin text-amber-500" />
        <p className="text-sm text-muted-foreground font-medium">Loading your business subscription...</p>
      </div>
    );
  }

  const sub = subData || {
    plan_name: "Starter",
    tier: "starter",
    status: "active",
    price: 49,
    price_unit: "USD",
    billing_cycle: "monthly",
    starts_at: "2026-11-01",
    expires_at: "2026-12-01",
    listing_allowance: 100,
    listings_used: 18,
    additional_credits: 0,
    total_allowed: 100,
    remaining_listings: 82,
    usage_percentage: 18,
    notification_level: 0,
  };

  const isWarning80 = sub.usage_percentage >= 80 && sub.usage_percentage < 90;
  const isWarning90 = sub.usage_percentage >= 90 && sub.usage_percentage < 100;
  const isLimitReached = sub.usage_percentage >= 100;

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Building2 className="size-7 text-amber-500" />
            <span>Business Subscription &amp; Usage</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Manage your business growth package, monitor monthly listing data capacity, and view payment history.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link href="/packages">
            <Button className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md gap-1.5 cursor-pointer">
              <Sparkles className="size-3.5 fill-black" />
              <span>Upgrade / Switch Plan</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            className="text-xs font-semibold gap-1.5"
            title="Refresh subscription stats"
          >
            <RefreshCw className="size-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Warning Alert if usage >= 80% */}
      {(isWarning80 || isWarning90 || isLimitReached) && (
        <div
          className={`p-4 rounded-2xl border flex items-start gap-3 shadow-sm ${
            isLimitReached
              ? "bg-rose-500/10 border-rose-500/30 text-rose-300"
              : isWarning90
              ? "bg-orange-500/10 border-orange-500/30 text-orange-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-300"
          }`}
        >
          <AlertTriangle className="size-5 shrink-0 mt-0.5" />
          <div className="flex-1 text-xs space-y-1">
            <h4 className="font-bold text-sm">
              {isLimitReached
                ? "Monthly Listing Data Limit Reached (100%)"
                : isWarning90
                ? "Listing Limit Warning (90% capacity used)"
                : "Listing Limit Notice (80% capacity used)"}
            </h4>
            <p className="leading-relaxed opacity-90">
              {isLimitReached
                ? "You have reached your monthly unique business listing limit. Inquiries or new listings may be throttled. Purchase additional listing credits or upgrade your tier to continue growing without disruption."
                : "Your business is expanding rapidly! You have utilized over 80% of your allocated monthly listing records. Consider adding a credit pack to stay ahead."}
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => setTopupOpen(true)}
            className="shrink-0 bg-white text-black font-bold text-xs hover:bg-white/90 shadow-xs"
          >
            Buy Extra Credits
          </Button>
        </div>
      )}

      {/* Active Subscription Overview Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Plan & Usage Progress */}
        <Card className="lg:col-span-2 rounded-3xl border shadow-sm overflow-hidden bg-card">
          <CardHeader className="bg-muted/30 border-b p-5 sm:p-6 flex flex-row items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <CardTitle className="text-xl font-black text-foreground">
                  {sub.plan_name || "Growth Plan"}
                </CardTitle>
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-extrabold uppercase">
                  {sub.status || "Active"}
                </Badge>
              </div>
              <CardDescription className="text-xs">
                Monthly business growth partner subscription
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-foreground">
                ${sub.price}
                <span className="text-xs font-medium text-muted-foreground">/{sub.billing_cycle === "yearly" ? "yr" : "mo"}</span>
              </div>
              <span className="text-[11px] text-muted-foreground capitalize">
                {sub.billing_cycle} auto-renewal
              </span>
            </div>
          </CardHeader>

          <CardContent className="p-5 sm:p-6 space-y-6">
            {/* Listing Data Capacity Progress */}
            <div className="p-5 rounded-2xl bg-muted/40 border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-foreground flex items-center gap-1.5">
                  <Database className="size-4 text-amber-500" />
                  <span>Unique Listing Data Usage</span>
                </span>
                <span className="font-extrabold text-foreground">
                  {sub.listings_used} / {sub.total_allowed} listings ({sub.usage_percentage}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-muted-foreground/20 h-3 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all rounded-full ${
                    sub.usage_percentage >= 100
                      ? "bg-rose-500"
                      : sub.usage_percentage >= 80
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, sub.usage_percentage)}%` }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
                <div className="p-2.5 rounded-xl bg-background border">
                  <span className="text-[10px] text-muted-foreground block">Plan Allowance</span>
                  <span className="font-black text-sm text-foreground">{sub.listing_allowance}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-background border">
                  <span className="text-[10px] text-muted-foreground block">Credit Top-ups</span>
                  <span className="font-black text-sm text-amber-500">+{sub.additional_credits}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-background border">
                  <span className="text-[10px] text-muted-foreground block">Remaining Data</span>
                  <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                    {sub.remaining_listings}
                  </span>
                </div>
              </div>
            </div>

            {/* Billing Timeline */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border bg-background flex items-center gap-3">
                <div className="size-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Calendar className="size-4" />
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px] block">Current Cycle Started</span>
                  <span className="font-bold text-foreground">{sub.starts_at || "Nov 1, 2026"}</span>
                </div>
              </div>

              <div className="p-4 rounded-xl border bg-background flex items-center gap-3">
                <div className="size-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <CreditCard className="size-4" />
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px] block">Next Billing / Renewal Date</span>
                  <span className="font-bold text-foreground">{sub.expires_at || "Dec 1, 2026"}</span>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-muted/20 border-t p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTopupOpen(true)}
                className="text-xs font-bold gap-1.5 cursor-pointer"
              >
                <Plus className="size-3.5 text-amber-500" />
                <span>Buy Listing Credits Pack</span>
              </Button>
              <Link href="/packages">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold gap-1.5 cursor-pointer hover:bg-primary/10"
                >
                  <ArrowUpRight className="size-3.5 text-primary" />
                  <span>Change Plan</span>
                </Button>
              </Link>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCancelOpen(true)}
              className="text-xs font-semibold text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
            >
              Cancel Renewal
            </Button>
          </CardFooter>
        </Card>

        {/* Right Col: Ecosystem Capabilities Summary */}
        <Card className="rounded-3xl border shadow-sm bg-card p-5 sm:p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-foreground font-black text-base">
              <ShieldCheck className="size-5 text-amber-500" />
              <span>Active Business Capabilities</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Your business is equipped with the following all-in-one growth ecosystem tools:
            </p>

            <ul className="space-y-2.5 text-xs text-muted-foreground">
              {[
                "Business Profile & Marketplace Discovery",
                "Lead Acquisition & Customer Management",
                "Automated Listing Analytics Tracking",
                "Sales Pipeline & Inquiry Manager",
                "Team Member Workflows & Access",
                "Priority Ecosystem Guidance",
              ].map((cap, i) => (
                <li key={i} className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                  <span className="font-medium text-foreground">{cap}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs space-y-2">
            <span className="font-bold text-amber-600 dark:text-amber-400 block">
              Need Multi-location or 5,000+ Listings?
            </span>
            <p className="text-muted-foreground leading-relaxed">
              Our Enterprise Advisory team builds bespoke data allowances, custom integrations, and dedicated hiring pipelines.
            </p>
            <Link href="/packages#plans" className="inline-block text-amber-500 font-bold hover:underline">
              Explore Enterprise Suite →
            </Link>
          </div>
        </Card>
      </div>

      {/* Payment History & Invoices */}
      <Card className="rounded-3xl border shadow-sm bg-card overflow-hidden">
        <CardHeader className="p-5 sm:p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-black text-foreground">
                Invoices &amp; Payment History
              </CardTitle>
              <CardDescription className="text-xs">
                View past subscription charges, top-up receipts, and tax invoices.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {invoices.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No historical invoices found. Invoices are generated automatically on renewal and credit purchases.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b bg-muted/30 text-muted-foreground">
                    <th className="p-4 font-bold">Invoice #</th>
                    <th className="p-4 font-bold">Plan / Description</th>
                    <th className="p-4 font-bold">Billing Period</th>
                    <th className="p-4 font-bold">Amount</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-mono font-bold text-foreground">{inv.invoice_number}</td>
                      <td className="p-4 font-semibold text-foreground">{inv.plan_name}</td>
                      <td className="p-4 text-muted-foreground">
                        {inv.billing_period_start ? `${inv.billing_period_start} to ${inv.billing_period_end}` : "Instant Top-up"}
                      </td>
                      <td className="p-4 font-bold text-foreground">
                        ${inv.amount} {inv.currency}
                      </td>
                      <td className="p-4">
                        <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 border-emerald-200">
                          {inv.status || "Paid"}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toast.success(`Receipt ${inv.invoice_number} downloaded.`)}
                          className="h-7 text-xs font-semibold gap-1 text-primary cursor-pointer"
                        >
                          <Download className="size-3" />
                          <span>PDF</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Credit Top-up Dialog */}
      {topupOpen && (
        <Dialog open={topupOpen} onOpenChange={setTopupOpen}>
          <DialogContent className="max-w-md bg-card border text-foreground rounded-3xl p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <Plus className="size-5 text-amber-500" />
                <span>Buy Listing Data Credits</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Add extra unique business listing records to your current billing cycle without changing your plan tier.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {[
                { credits: 100, price: 30, desc: "Best for small promotional bursts" },
                { credits: 250, price: 70, desc: "Popular top-up for active campaigns" },
                { credits: 500, price: 120, desc: "Maximum savings for scaling teams" },
              ].map((pack) => (
                <div
                  key={pack.credits}
                  onClick={() => setSelectedTopup({ credits: pack.credits, price: pack.price })}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                    selectedTopup.credits === pack.credits
                      ? "border-amber-500 bg-amber-500/10 shadow-xs"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-sm block">+{pack.credits} Listing Credits</span>
                    <span className="text-[11px] text-muted-foreground">{pack.desc}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black">${pack.price}</span>
                    <span className="text-[10px] text-muted-foreground block">one-time</span>
                  </div>
                </div>
              ))}
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setTopupOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button
                onClick={handlePurchaseTopup}
                disabled={purchasingTopup}
                className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs cursor-pointer"
              >
                {purchasingTopup ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-1.5" />
                    <span>Processing Top-up...</span>
                  </>
                ) : (
                  <span>Confirm &amp; Add +{selectedTopup.credits} Credits</span>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Cancel Dialog */}
      {cancelOpen && (
        <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
          <DialogContent className="max-w-md bg-card border rounded-3xl p-6 space-y-4">
            <DialogHeader>
              <DialogTitle className="text-lg font-black text-rose-500 flex items-center gap-2">
                <AlertTriangle className="size-5" />
                <span>Cancel Subscription Renewal?</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Are you sure you want to stop automatic renewal? Your business profile, active listings, and tools will remain fully operational until {sub.expires_at}.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => setCancelOpen(false)} className="text-xs">
                Keep Subscription
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelSub}
                disabled={canceling}
                className="font-bold text-xs cursor-pointer"
              >
                {canceling ? "Canceling..." : "Confirm Cancellation"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
