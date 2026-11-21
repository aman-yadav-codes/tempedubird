"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Check,
  Zap,
  Building2,
  Sparkles,
  ShieldCheck,
  Loader2,
  ArrowRight,
  Star,
  Users,
  Briefcase,
  TrendingUp,
  HelpCircle,
  PhoneCall,
  CheckCircle2,
  XCircle,
  ChevronDown,
  Layers,
  Database,
  BarChart3,
  Search,
  Package,
  Wrench,
  Bot,
  Headphones,
  FileText,
  BadgePercent,
  Plus,
  HardDrive,
  Cpu,
  Activity,
  Server,
  Clock,
  CreditCard,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { AuthModalDialog } from "@/components/auth/auth-modal-dialog";
import { useUserCountry } from "@/hooks/use-user-country";

export interface BusinessPackage {
  id: number;
  name: string;
  tier: string;
  package_category?: string;
  price: number;
  price_monthly: number;
  price_annual?: number;
  price_unit: string;
  currency_symbol?: string;
  country_code?: string;
  billing_cycle?: string;
  database_allowance?: string;
  file_storage_allowance?: string;
  monthly_bandwidth?: string;
  compute_allowance?: string;
  seo_service?: string;
  listing_limit_monthly?: number;
  is_popular?: boolean;
  target_audience?: string;
  description?: string;
  features_list?: string[];
  services_list?: { title: string; desc: string }[];
  overage_price_per_listing?: number;
  is_custom_enterprise?: boolean;
}

const DEFAULT_PACKAGES: BusinessPackage[] = [
  {
    id: 34,
    name: "Launch",
    tier: "launch",
    price: 399,
    price_monthly: 399,
    price_unit: "INR",
    billing_cycle: "Monthly",
    database_allowance: "250 MB",
    file_storage_allowance: "2 GB",
    monthly_bandwidth: "10 GB",
    compute_allowance: "100 units",
    seo_service: "Basic SEO support",
    description: "Ideal for early-stage startups and individual projects launching with essential database, storage, and SEO.",
    features_list: ["250 MB Database Allowance", "2 GB File Storage", "10 GB Monthly Bandwidth", "100 Compute Units", "Basic SEO support"],
  },
  {
    id: 35,
    name: "Growth",
    tier: "growth",
    price: 999,
    price_monthly: 999,
    price_unit: "INR",
    billing_cycle: "Monthly",
    database_allowance: "1 GB",
    file_storage_allowance: "10 GB",
    monthly_bandwidth: "50 GB",
    compute_allowance: "500 units",
    seo_service: "Local SEO support",
    is_popular: true,
    description: "Designed for fast-growing businesses needing expanded storage, regional visibility, and active compute headroom.",
    features_list: ["1 GB Database Allowance", "10 GB File Storage", "50 GB Monthly Bandwidth", "500 Compute Units", "Local SEO support"],
  },
  {
    id: 36,
    name: "Professional",
    tier: "professional",
    price: 2499,
    price_monthly: 2499,
    price_unit: "INR",
    billing_cycle: "Monthly",
    database_allowance: "5 GB",
    file_storage_allowance: "50 GB",
    monthly_bandwidth: "250 GB",
    compute_allowance: "2,000 units",
    seo_service: "Advanced SEO support",
    description: "Complete professional platform tier for scale, high traffic, dedicated compute, and comprehensive advanced SEO support.",
    features_list: ["5 GB Database Allowance", "50 GB File Storage", "250 GB Monthly Bandwidth", "2,000 Compute Units", "Advanced SEO support"],
  },
  {
    id: 37,
    name: "Enterprise",
    tier: "enterprise",
    price: 4999,
    price_monthly: 4999,
    price_unit: "INR",
    billing_cycle: "Monthly",
    database_allowance: "Custom",
    file_storage_allowance: "Custom",
    monthly_bandwidth: "Custom",
    compute_allowance: "Custom",
    seo_service: "Enterprise SEO and marketing services",
    is_custom_enterprise: true,
    description: "Custom enterprise tier starting at ₹4,999 with bespoke database, compute, unmetered bandwidth, and managed marketing.",
    features_list: ["Custom Database Allowance", "Custom File Storage", "Custom Monthly Bandwidth", "Custom Compute Units", "Enterprise SEO & marketing services"],
  },
];

export default function BusinessGrowthPackagesPage() {
  const { isAuthenticated, user } = useAuthStore();
  const { country, setCountry, availableCountries } = useUserCountry();
  const [packages, setPackages] = useState<BusinessPackage[]>(DEFAULT_PACKAGES);
  const [currentSub, setCurrentSub] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  // Checkout & Enterprise dialogs
  const [selectedPackage, setSelectedPackage] = useState<BusinessPackage | null>(null);
  const [subscribing, setSubscribing] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [enterpriseModalOpen, setEnterpriseModalOpen] = useState(false);
  const [enterpriseForm, setEnterpriseForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    listingEstimate: "5000+",
    message: "",
  });

  const loadCurrentSub = async () => {
    try {
      const res = await fetch(`/api/subscriptions/current?_t=${Date.now()}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success && json.subscription) {
        setCurrentSub(json.subscription);
      }
    } catch (err) {
      console.error("Failed to load current subscription:", err);
    }
  };

  const loadPackages = async (targetCountryCode?: string) => {
    try {
      const cCode = (targetCountryCode || country.code || "IN").toUpperCase();
      let fetchedPackages: BusinessPackage[] = [];
      const res = await fetch(`/api/public/packages?country=${encodeURIComponent(cCode)}&_t=${Date.now()}`, { cache: "no-store" });
      const json = await res.json();
      if (json.success && Array.isArray(json.packages) && json.packages.length > 0) {
        fetchedPackages = json.packages;
      } else {
        // Fallback to platformadmin endpoint
        const fbRes = await fetch(`/api/platformadmin/packages?country=${encodeURIComponent(cCode)}&_t=${Date.now()}`, { cache: "no-store" });
        const fbJson = await fbRes.json();
        if (fbJson.success && Array.isArray(fbJson.packages) && fbJson.packages.length > 0) {
          fetchedPackages = fbJson.packages;
        }
      }

      if (fetchedPackages.length > 0) {
        setPackages(fetchedPackages);
      }
    } catch (err) {
      console.error("Failed to load packages:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch Packages & Current Subscription
  useEffect(() => {
    loadPackages(country.code);
    loadCurrentSub();
  }, [isAuthenticated, country.code]);

  // Handle Subscribe
  const handleSubscribe = async () => {
    if (!isAuthenticated) {
      setAuthModalOpen(true);
      return;
    }

    if (!selectedPackage) return;

    if (selectedPackage.tier === "enterprise" || selectedPackage.is_custom_enterprise) {
      setSelectedPackage(null);
      setEnterpriseModalOpen(true);
      return;
    }

    setSubscribing(true);
    try {
      const res = await fetch("/api/subscriptions/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId: selectedPackage.id,
          billingCycle,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Subscribed to ${selectedPackage.name}!`);
        setSelectedPackage(null);
        await loadCurrentSub();
      } else {
        toast.error(data.error || "Subscription failed. Please try again.");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process subscription");
    } finally {
      setSubscribing(false);
    }
  };

  // Submit Enterprise Contact
  const handleEnterpriseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Thank you! Our Enterprise Growth Advisory team will contact you within 2 hours.");
    setEnterpriseModalOpen(false);
    setEnterpriseForm({ name: "", company: "", email: "", phone: "", listingEstimate: "5000+", message: "" });
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 selection:bg-amber-500 selection:text-black">
      {/* ================= 1. HERO SECTION ================= */}
      <section className="relative overflow-hidden pt-20 pb-16 lg:pt-28 lg:pb-24 border-b border-slate-200">
        {/* Subtle ambient backgrounds */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-amber-500/5 blur-[130px] rounded-full pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-6">
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-300 text-xs px-3.5 py-1 rounded-full font-bold uppercase tracking-wider shadow-none">
            <Sparkles className="size-3.5 mr-1.5 inline text-amber-600" /> Complete Business Ecosystem Partner
          </Badge>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 max-w-4xl mx-auto leading-[1.08]">
            Everything Your Business Needs to Grow.
          </h1>

          <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
            From setting up your business and hiring the right people to increasing sales, marketing your brand and managing daily operations — we help you build and grow your business.
          </p>

          {/* CTA & Anchor */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#plans"
              className="px-7 py-3.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-extrabold text-sm shadow-xl shadow-amber-500/20 active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Find Your Perfect Plan</span>
              <ArrowRight className="size-4" />
            </a>
            <Link
              href="/workspace/subscription"
              className="px-6 py-3.5 rounded-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-sm shadow-sm active:scale-95 transition-all inline-flex items-center gap-2"
            >
              <span>Manage Existing Subscription</span>
            </Link>
          </div>

          {/* Billing Toggle: Monthly vs Yearly */}
          <div className="pt-8 flex flex-col items-center justify-center gap-3">
            <div className="bg-slate-100 border border-slate-200 p-1 rounded-full flex items-center shadow-inner">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${billingCycle === "monthly"
                  ? "bg-amber-500 text-black shadow-md"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${billingCycle === "yearly"
                  ? "bg-amber-500 text-black shadow-md"
                  : "text-slate-600 hover:text-slate-900"
                  }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-black">
                  Save 20%
                </span>
              </button>
            </div>

            {/* Country & Currency Switcher Bar */}
            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                <Globe className="size-3.5 text-amber-500" />
                Country Pricing:
              </span>
              <div className="inline-flex items-center gap-1 p-1 rounded-full bg-slate-100 border border-slate-200 shadow-2xs">
                {[
                  { code: "IN", name: "India", flag: "🇮🇳", cur: "₹ INR" },
                  { code: "ZA", name: "South Africa", flag: "🇿🇦", cur: "R ZAR" },
                  { code: "US", name: "United States", flag: "🇺🇸", cur: "$ USD" },
                ].map((c) => {
                  const active = country.code === c.code;
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => setCountry(c.code)}
                      className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        active
                          ? "bg-white text-slate-900 shadow-xs border border-slate-200"
                          : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
                      }`}
                    >
                      <span>{c.flag}</span>
                      <span>{c.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({c.cur})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= 2. FOUR PRICING CARDS ================= */}
      <section id="plans" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        {/* ================= CURRENT ACTIVE PACKAGE CARD ================= */}
        {currentSub && (
          <div className="mb-12 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border-2 border-emerald-500/30 relative overflow-hidden shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500 text-white font-extrabold text-[11px] px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shadow-xs">
                    <CheckCircle2 className="size-3.5" />
                    <span>Current Active Package</span>
                  </Badge>
                  <span className="text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                    Active &amp; Verified
                  </span>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2 pt-1">
                  <span>{currentSub.plan_name || currentSub.package_name || "Launch Plan"}</span>
                  <Badge variant="outline" className="text-xs uppercase font-bold text-slate-600 bg-white">
                    {currentSub.tier || "launch"}
                  </Badge>
                </h2>

                <div className="flex items-baseline gap-1.5 text-slate-900">
                  <span className="text-3xl sm:text-4xl font-black">
                    {currentSub.currency_symbol || country.currencySymbol || "₹"}{Number(currentSub.price || 0).toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500 font-semibold">
                    {currentSub.price_unit || country.currencyCode || "INR"} / {currentSub.billing_cycle || "Monthly"}
                  </span>
                </div>
              </div>

              {/* Active Plan Specifications */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs text-xs">
                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <Database className="size-3 text-amber-500" /> Database
                  </span>
                  <strong className="font-bold text-slate-900 block truncate">
                    {currentSub.database_allowance || "250 MB"}
                  </strong>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <HardDrive className="size-3 text-blue-500" /> Storage
                  </span>
                  <strong className="font-bold text-slate-900 block truncate">
                    {currentSub.file_storage_allowance || "2 GB"}
                  </strong>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <Activity className="size-3 text-emerald-500" /> Bandwidth
                  </span>
                  <strong className="font-bold text-slate-900 block truncate">
                    {currentSub.monthly_bandwidth || "10 GB"}
                  </strong>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <Cpu className="size-3 text-purple-500" /> Compute
                  </span>
                  <strong className="font-bold text-slate-900 block truncate">
                    {currentSub.compute_allowance || "100 units"}
                  </strong>
                </div>

                <div className="space-y-0.5 col-span-2 sm:col-span-1">
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 font-medium">
                    <Search className="size-3 text-sky-500" /> SEO Support
                  </span>
                  <strong className="font-bold text-slate-900 block truncate">
                    {currentSub.seo_service || "Basic SEO support"}
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="text-center max-w-3xl mx-auto mb-10 space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
            {currentSub ? "Available Packages & Upgrades" : "Available Subscription Packages"}
          </h2>
          <p className="text-xs sm:text-sm text-slate-600">
            Choose or upgrade your plan anytime. All tiers include dedicated database and storage allowances, compute headroom, and SEO services.
          </p>
        </div>

        {packages.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-3xl border border-slate-200 p-8 space-y-3">
            <Package className="size-10 text-muted-foreground mx-auto" />
            <h3 className="text-base font-bold text-slate-800">No Packages Found</h3>
            <p className="text-xs text-muted-foreground">Unable to fetch packages right now.</p>
            <Button size="sm" variant="outline" onClick={loadPackages} className="cursor-pointer">
              Retry Loading
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-stretch">
            {packages.map((pkg) => {
              const pkgName = pkg.name || "";
              const pkgTier = pkg.tier || "";
              const isPopular = pkg.is_popular || pkgTier.toLowerCase() === "growth" || pkgName.toLowerCase() === "growth";
              const isEnterprise = pkgTier.toLowerCase() === "enterprise" || Boolean(pkg.is_custom_enterprise) || pkgName.toLowerCase() === "enterprise";
              const isCurrentPlan = Boolean(
                currentSub && (
                  currentSub.package_id === pkg.id ||
                  (currentSub.plan_name || currentSub.package_name || "").toLowerCase() === pkgName.toLowerCase() ||
                  (currentSub.tier || "").toLowerCase() === pkgTier.toLowerCase()
                )
              );
              const displayPrice =
                billingCycle === "yearly"
                  ? Math.round(Number(pkg.price_annual || (pkg.price || 0) * 10) / 12)
                  : Number(pkg.price_monthly || pkg.price || 0);

              const rawFeatures = pkg.features_list;
              const features: string[] = Array.isArray(rawFeatures)
                ? rawFeatures
                : typeof rawFeatures === "string"
                  ? (() => {
                    try {
                      const parsed = JSON.parse(rawFeatures);
                      return Array.isArray(parsed) ? parsed : [];
                    } catch {
                      return [];
                    }
                  })()
                  : [];

              return (
                <div
                  key={pkg.id}
                  className={`relative rounded-3xl flex flex-col transition-all duration-300 ${isCurrentPlan
                    ? "bg-emerald-50/40 border-2 border-emerald-500 shadow-xl shadow-emerald-500/10 lg:-translate-y-2"
                    : isPopular
                      ? "bg-amber-50/50 border-2 border-amber-500 shadow-xl shadow-amber-500/10 lg:-translate-y-2"
                      : "bg-white border border-slate-200 hover:border-slate-300 hover:shadow-lg shadow-sm"
                    }`}
                >
                  {/* Current Active Badge or Most Popular Badge */}
                  {isCurrentPlan ? (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                      <span className="bg-emerald-500 text-white font-black text-[11px] uppercase tracking-wider px-3.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> Current Active Plan
                      </span>
                    </div>
                  ) : isPopular ? (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                      <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-[11px] uppercase tracking-wider px-3.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                        <Sparkles className="size-3 fill-black text-black" /> Most Popular Choice
                      </span>
                    </div>
                  ) : null}

                  <div className="p-6 sm:p-7 flex-1 flex flex-col space-y-6">
                    {/* Header: Name & Audience */}
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900">{pkg.name}</h3>
                        <Badge
                          variant="outline"
                          className="capitalize text-[10px] font-bold border-slate-300 text-slate-700 bg-slate-50"
                        >
                          {pkg.tier || pkg.name}
                        </Badge>
                      </div>
                      {pkg.description && (
                        <p className="text-xs text-slate-500 font-medium mt-1.5 min-h-[32px] line-clamp-2">
                          {pkg.description}
                        </p>
                      )}
                    </div>

                    {/* Price with Country-Specific Currency */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900">
                          {pkg.currency_symbol || country.currencySymbol || "₹"}{displayPrice.toLocaleString()}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          {pkg.price_unit || country.currencyCode || "INR"} / month
                        </span>
                      </div>
                      {billingCycle === "yearly" && pkg.price_annual && (
                        <p className="text-[11px] font-semibold text-emerald-600">
                          Billed annually ({pkg.currency_symbol || country.currencySymbol || "₹"}{Number(pkg.price_annual).toLocaleString()} {pkg.price_unit || country.currencyCode || "INR"}/yr)
                        </p>
                      )}
                    </div>

                    {/* 5 Core Allowance Specifications */}
                    <div className="p-3.5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Database className="size-3.5 text-amber-500" /> Database
                        </span>
                        <strong className="font-bold text-slate-900">{pkg.database_allowance || "Custom"}</strong>
                      </div>

                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <HardDrive className="size-3.5 text-blue-500" /> File Storage
                        </span>
                        <strong className="font-bold text-slate-900">{pkg.file_storage_allowance || "Custom"}</strong>
                      </div>

                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Activity className="size-3.5 text-emerald-500" /> Bandwidth
                        </span>
                        <strong className="font-bold text-slate-900">{pkg.monthly_bandwidth || "Custom"}</strong>
                      </div>

                      <div className="flex items-center justify-between text-slate-700">
                        <span className="flex items-center gap-1.5 text-slate-500">
                          <Cpu className="size-3.5 text-purple-500" /> Compute
                        </span>
                        <strong className="font-bold text-slate-900">{pkg.compute_allowance || "Custom"}</strong>
                      </div>

                      <div className="pt-1.5 border-t border-slate-200 text-slate-700 flex flex-col">
                        <span className="flex items-center gap-1.5 text-slate-500 text-[11px] pb-0.5">
                          <Search className="size-3 text-sky-500" /> SEO Support
                        </span>
                        <span className="font-bold text-[11px] text-slate-900 truncate">
                          {pkg.seo_service || "Basic SEO support"}
                        </span>
                      </div>
                    </div>

                    {/* Features List */}
                    {features && features.length > 0 && (
                      <div className="space-y-2.5 flex-1 pt-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Included Features:
                        </span>
                        <ul className="space-y-2 text-xs text-slate-700">
                          {features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <CheckCircle2
                                className={`size-3.5 shrink-0 mt-0.5 ${isCurrentPlan
                                  ? "text-emerald-500"
                                  : isPopular
                                    ? "text-amber-500"
                                    : "text-emerald-500"
                                  }`}
                              />
                              <span className="leading-snug">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action Button */}
                    <div className="pt-4 mt-auto">
                      {isCurrentPlan ? (
                        <div className="w-full py-4 rounded-xl font-black text-xs sm:text-sm bg-emerald-500/15 border-2 border-emerald-500 text-emerald-800 flex items-center justify-center gap-2 select-none shadow-xs">
                          <CheckCircle2 className="size-4 text-emerald-600" />
                          <span>Current Active Plan</span>
                        </div>
                      ) : isEnterprise ? (
                        <Button
                          onClick={() => setEnterpriseModalOpen(true)}
                          className="w-full py-6 rounded-xl font-black text-xs sm:text-sm bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black shadow-lg cursor-pointer"
                        >
                          <span>Contact Sales for Enterprise</span>
                          <ArrowRight className="size-4 ml-1.5" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setSelectedPackage(pkg)}
                          className={`w-full py-6 rounded-xl font-black text-xs sm:text-sm cursor-pointer transition-all ${isPopular
                            ? "bg-amber-500 hover:bg-amber-400 text-black shadow-xl shadow-amber-500/20 active:scale-95"
                            : "bg-slate-900 hover:bg-slate-800 text-white border border-slate-800"
                            }`}
                        >
                          <span>Switch to {pkg.name}</span>
                          <ArrowRight className="size-4 ml-1.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ================= 3. LISTING USAGE EXPLANATION ================= */}
      <section className="bg-slate-50 border-y border-slate-200 py-16 lg:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs px-3 py-0.5 font-bold shadow-none">
              Transparent Data-Driven Billing
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">
              Our pricing grows with your business.
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Choose a monthly listing data allowance that matches your requirements and upgrade whenever your business needs more.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="size-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                <Database className="size-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Unique Listing Records Only</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                We never double-charge. A customer or buyer viewing your product or service profile multiple times counts as only 1 unique listing record per billing cycle.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="size-10 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center font-bold">
                <BarChart3 className="size-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Automated Usage Alerts</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Get real-time notification warnings when your monthly usage crosses 80%, 90%, and 100% capacity so you never face interruptions in lead acquisition.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="size-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                <Plus className="size-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Instant Credit Top-ups</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Ran out of listings mid-month? Add top-up credit packs directly from your dashboard or seamlessly upgrade your tier with prorated billing.
              </p>
            </div>
          </div>
        </div>
      </section>



      {/* ================= 5. FAQ SECTION ================= */}
      <section className="bg-slate-50 border-t border-slate-200 py-16 lg:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="text-center space-y-3">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Frequently Asked Questions</h2>
            <p className="text-sm text-slate-600">Everything you need to know about our business growth packages and billing.</p>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "What is included in each package?",
                a: "Each package provides a complete business ecosystem tier: Starter provides essential business setup and profile management. Growth adds team hiring, marketing campaigns, and lead generation. Professional adds department management, advanced sales, and BPM. Enterprise provides tailored workflows, a dedicated growth advisor, and multi-location management.",
              },
              {
                q: "How is monthly listing usage calculated?",
                a: "Usage is calculated based on unique listing records engaged during your active monthly billing cycle. Multiple views of the same listing by the same prospect are never double-counted.",
              },
              {
                q: "Can I upgrade my package anytime?",
                a: "Yes! You can instantly upgrade your package from your subscription dashboard. The remaining days on your current cycle will be prorated automatically.",
              },
              {
                q: "What happens when I reach my listing limit?",
                a: "When you reach 80% and 90% of your listing limit, you receive warning notifications. At 100%, you can either purchase top-up credits or activate automatic overage billing so your business never misses incoming customer inquiries.",
              },
              {
                q: "Can I purchase additional listing credits?",
                a: "Yes. Additional listing credits can be purchased in flexible top-up bundles (100, 250, 500 listings) directly from your dashboard without changing your plan tier.",
              },
              {
                q: "Can I cancel my subscription?",
                a: "Yes. You can cancel recurring subscription renewals at any time directly through your dashboard with zero cancellation fees. Your plan remains active until the end of your prepaid period.",
              },
              {
                q: "Do you provide customized enterprise solutions?",
                a: "Yes! Our Enterprise Suite is fully configurable for multi-location businesses, agencies, and large enterprises requiring custom listing volumes (5,000+), dedicated integrations, and custom SLA agreements.",
              },
              {
                q: "Can I change my package later?",
                a: "Absolutely. You can switch between Monthly and Annual billing or upgrade/downgrade your package whenever your business needs change.",
              },
            ].map((faq, idx) => (
              <details
                key={idx}
                className="group rounded-2xl border border-slate-200 bg-white p-5 open:bg-slate-50 open:border-slate-300 shadow-2xs transition-all cursor-pointer"
              >
                <summary className="font-bold text-sm sm:text-base text-slate-900 flex items-center justify-between list-none">
                  <span>{faq.q}</span>
                  <ChevronDown className="size-4 text-slate-400 group-open:rotate-180 transition-transform shrink-0 ml-2" />
                </summary>
                <p className="mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed pl-1">
                  {faq.a}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ================= 6. SUBSCRIBE CONFIRMATION MODAL ================= */}
      {selectedPackage && (
        <Dialog open={Boolean(selectedPackage)} onOpenChange={(open) => !open && setSelectedPackage(null)}>
          <DialogContent className="max-w-md bg-white border border-slate-200 text-slate-900 rounded-3xl p-6 sm:p-7 space-y-5">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Sparkles className="size-5 text-amber-500" />
                <span>Confirm {selectedPackage.name} Plan</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                You are subscribing to the {selectedPackage.name} tier with {selectedPackage.listing_limit_monthly.toLocaleString()} monthly listing data records.
              </DialogDescription>
            </DialogHeader>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span>Billing Frequency:</span>
                <span className="font-bold text-slate-900 capitalize">{billingCycle}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Database Allowance:</span>
                <span className="font-extrabold text-slate-900">{selectedPackage.database_allowance || "Custom"}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>File Storage Allowance:</span>
                <span className="font-extrabold text-slate-900">{selectedPackage.file_storage_allowance || "Custom"}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Monthly Bandwidth:</span>
                <span className="font-extrabold text-slate-900">{selectedPackage.monthly_bandwidth || "Custom"}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Compute Units:</span>
                <span className="font-extrabold text-slate-900">{selectedPackage.compute_allowance || "Custom"}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>SEO Service:</span>
                <span className="font-extrabold text-slate-900">{selectedPackage.seo_service || "Basic SEO support"}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-900">Amount Due Today:</span>
                <span className="text-lg font-black text-amber-600">
                  {selectedPackage.currency_symbol || country.currencySymbol || "₹"}
                  {Number(billingCycle === "yearly" && selectedPackage.price_annual ? selectedPackage.price_annual : selectedPackage.price_monthly).toLocaleString()} {selectedPackage.price_unit || country.currencyCode || "INR"}
                </span>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={() => setSelectedPackage(null)}
                className="w-full sm:w-auto border-slate-300 text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubscribe}
                disabled={subscribing}
                className="w-full sm:flex-1 bg-amber-500 hover:bg-amber-400 text-black font-extrabold cursor-pointer"
              >
                {subscribing ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    <span>Activating Subscription...</span>
                  </>
                ) : (
                  <span>Confirm & Activate Plan</span>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ================= 7. ENTERPRISE CONTACT MODAL ================= */}
      {enterpriseModalOpen && (
        <Dialog open={enterpriseModalOpen} onOpenChange={setEnterpriseModalOpen}>
          <DialogContent className="max-w-lg bg-white border border-slate-200 text-slate-900 rounded-3xl p-6 sm:p-7 space-y-5">
            <DialogHeader className="space-y-1">
              <DialogTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                <Building2 className="size-5 text-amber-500" />
                <span>Enterprise Custom Solution</span>
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Get a tailored package for large organizations, multi-location brands, and agencies with custom listing limits.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleEnterpriseSubmit} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Full Name *</label>
                  <input
                    required
                    value={enterpriseForm.name}
                    onChange={(e) => setEnterpriseForm({ ...enterpriseForm, name: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-amber-500"
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Company Name *</label>
                  <input
                    required
                    value={enterpriseForm.company}
                    onChange={(e) => setEnterpriseForm({ ...enterpriseForm, company: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-amber-500"
                    placeholder="Acme Corp"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Work Email *</label>
                  <input
                    type="email"
                    required
                    value={enterpriseForm.email}
                    onChange={(e) => setEnterpriseForm({ ...enterpriseForm, email: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-amber-500"
                    placeholder="john@company.com"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={enterpriseForm.phone}
                    onChange={(e) => setEnterpriseForm({ ...enterpriseForm, phone: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-amber-500"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Estimated Monthly Listings Required</label>
                <select
                  value={enterpriseForm.listingEstimate}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, listingEstimate: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="5,000 - 10,000">5,000 – 10,000 listings / month</option>
                  <option value="10,000 - 25,000">10,000 – 25,000 listings / month</option>
                  <option value="25,000+">25,000+ listings / month (Unlimited scale)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Specific Requirements or Integrations</label>
                <textarea
                  rows={3}
                  value={enterpriseForm.message}
                  onChange={(e) => setEnterpriseForm({ ...enterpriseForm, message: e.target.value })}
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-slate-900 focus:outline-none focus:border-amber-500"
                  placeholder="Tell us about your multi-location setup, custom ERP, or workflow needs..."
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEnterpriseModalOpen(false)}
                  className="border-slate-300 text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-amber-400 to-orange-500 text-black font-extrabold cursor-pointer"
                >
                  Request Custom Quote
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Auth Modal for Unauthenticated Users */}
      <AuthModalDialog
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        defaultTab="signin"
      />
    </div>
  );
}
