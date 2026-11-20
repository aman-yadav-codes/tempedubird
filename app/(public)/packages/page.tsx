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

export interface BusinessPackage {
  id: number;
  name: string;
  tier: "starter" | "growth" | "professional" | "enterprise";
  price: number;
  price_monthly: number;
  price_annual: number;
  price_unit: string;
  listing_limit_monthly: number;
  is_popular: boolean;
  target_audience: string;
  description: string;
  features_list: string[];
  services_list: { title: string; desc: string }[];
  overage_price_per_listing: number;
  is_custom_enterprise: boolean;
}

export default function BusinessGrowthPackagesPage() {
  const { isAuthenticated, user } = useAuthStore();
  const [packages, setPackages] = useState<BusinessPackage[]>([]);
  const [loading, setLoading] = useState(true);
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

  // Fetch Packages from DB
  useEffect(() => {
    async function loadPackages() {
      try {
        const res = await fetch("/api/public/packages?category=business_growth");
        const json = await res.json();
        if (json.success && json.packages?.length > 0) {
          setPackages(json.packages);
        }
      } catch (err) {
        console.error("Failed to load packages:", err);
      } finally {
        setLoading(false);
      }
    }
    loadPackages();
  }, []);

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
        window.location.href = "/workspace/subscription";
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
          <div className="pt-8 flex items-center justify-center gap-3">
            <div className="bg-slate-100 border border-slate-200 p-1 rounded-full flex items-center shadow-inner">
              <button
                type="button"
                onClick={() => setBillingCycle("monthly")}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  billingCycle === "monthly"
                    ? "bg-amber-500 text-black shadow-md"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle("yearly")}
                className={`px-5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  billingCycle === "yearly"
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
          </div>
        </div>
      </section>

      {/* ================= 2. FOUR PRICING CARDS ================= */}
      <section id="plans" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="size-8 animate-spin text-amber-400" />
            <p className="text-sm text-slate-400 font-medium">Loading subscription packages...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 items-stretch">
            {packages.map((pkg) => {
              const isPopular = pkg.is_popular || pkg.tier === "growth";
              const isEnterprise = pkg.tier === "enterprise" || pkg.is_custom_enterprise;
              const displayPrice =
                billingCycle === "yearly"
                  ? Math.round(Number(pkg.price_annual || pkg.price * 10) / 12)
                  : Number(pkg.price_monthly || pkg.price);

              return (
                <div
                  key={pkg.id}
                  className={`relative rounded-3xl flex flex-col transition-all duration-300 ${
                    isPopular
                      ? "bg-amber-50/50 border-2 border-amber-500 shadow-xl shadow-amber-500/10 lg:-translate-y-2"
                      : "bg-white border border-slate-200 hover:border-slate-300 hover:shadow-lg shadow-sm"
                  }`}
                >
                  {/* Most Popular Badge */}
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                      <span className="bg-gradient-to-r from-amber-500 to-orange-500 text-black font-black text-[11px] uppercase tracking-wider px-3.5 py-1 rounded-full shadow-lg flex items-center gap-1">
                        <Sparkles className="size-3 fill-black text-black" /> Most Popular Choice
                      </span>
                    </div>
                  )}

                  <div className="p-6 sm:p-7 flex-1 flex flex-col space-y-6">
                    {/* Header: Name & Audience */}
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl sm:text-2xl font-black text-slate-900">{pkg.name}</h3>
                        <Badge
                          variant="outline"
                          className="capitalize text-[10px] font-bold border-slate-300 text-slate-700 bg-slate-50"
                        >
                          {pkg.tier}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 font-medium mt-1.5 min-h-[32px] line-clamp-2">
                        {pkg.target_audience}
                      </p>
                    </div>

                    {/* Price and Allowance Highlight */}
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl sm:text-4xl font-black text-slate-900">
                          ${displayPrice}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">/ month</span>
                      </div>
                      {billingCycle === "yearly" && (
                        <p className="text-[11px] font-semibold text-emerald-600">
                          Billed annually (${pkg.price_annual}/yr)
                        </p>
                      )}

                      {/* Listing Limit Highlight (Core Pricing Factor) */}
                      <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">Monthly Listings:</span>
                        <span className="font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">
                          {pkg.listing_limit_monthly.toLocaleString()}+ listings
                        </span>
                      </div>
                    </div>

                    {/* Key Services & Capabilities */}
                    <div className="space-y-3 flex-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Included Ecosystem Features:
                      </span>
                      <ul className="space-y-2.5 text-xs text-slate-700">
                        {pkg.features_list?.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <CheckCircle2
                              className={`size-4 shrink-0 mt-0.5 ${
                                isPopular ? "text-amber-500" : "text-emerald-500"
                              }`}
                            />
                            <span className="leading-snug">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Action Button */}
                    <div className="pt-4">
                      {isEnterprise ? (
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
                          className={`w-full py-6 rounded-xl font-black text-xs sm:text-sm cursor-pointer transition-all ${
                            isPopular
                              ? "bg-amber-500 hover:bg-amber-400 text-black shadow-xl shadow-amber-500/20 active:scale-95"
                              : "bg-slate-900 hover:bg-slate-800 text-white border border-slate-800"
                          }`}
                        >
                          <span>Choose {pkg.name}</span>
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

      {/* ================= 4. FEATURE COMPARISON TABLE ================= */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 space-y-10">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">Compare Plan Capabilities</h2>
          <p className="text-sm text-slate-600">
            A comprehensive breakdown of tools, professional services, and assisted capabilities included across all plans.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-800">
                <th className="p-4 sm:p-5 font-black text-sm text-slate-900 w-1/3">Capability Matrix</th>
                <th className="p-4 sm:p-5 font-bold text-slate-700">Starter</th>
                <th className="p-4 sm:p-5 font-bold text-amber-800 bg-amber-50">Growth (Popular)</th>
                <th className="p-4 sm:p-5 font-bold text-slate-700">Professional</th>
                <th className="p-4 sm:p-5 font-bold text-slate-900">Enterprise</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[
                { feature: "Monthly Unique Listing Limit", s: "100 listings", g: "500 listings", p: "2,000 listings", e: "5,000+ (Custom)" },
                { feature: "Business Setup & Registration", s: "Basic Guidance", g: "Assisted Setup", p: "Advanced Assistance", e: "Custom Dedicated Setup" },
                { feature: "Hiring & Recruitment", s: "—", g: "Job Postings & Pipelines", p: "Multi-department Hiring", e: "Large-scale Recruitment" },
                { feature: "Sales Pipeline Management", s: "Basic Deals", g: "Lead Generation & Pipelines", p: "Advanced Multi-stage Pipelines", e: "Enterprise CRM & Custom Workflows" },
                { feature: "Marketing & Campaigns", s: "Directory Promotion", g: "Campaigns & Social Ads", p: "Strategy & Omnichannel", e: "Enterprise Strategy & Growth Manager" },
                { feature: "Branding & Online Presence", s: "Basic Profile", g: "Branding Improvement", p: "Brand Positioning & Collateral", e: "Advanced Custom Branding" },
                { feature: "Business Operations (BPM)", s: "Essential Tools", g: "Customer Follow-ups", p: "Business Process Management", e: "Full Workflow Automation" },
                { feature: "CRM & Customer Engagement", s: "Contact Book", g: "Lead Pipeline CRM", p: "Advanced Customer Insights", e: "Enterprise Multi-location CRM" },
                { feature: "Business Analytics & Reports", s: "Standard Stats", g: "Advanced Analytics", p: "KPI Monitoring & Exports", e: "Custom BI & Predictive Analytics" },
                { feature: "Team Members & Permissions", s: "Up to 3 Users", g: "Up to 10 Users", p: "Up to 25 Users", e: "Unlimited Multi-Branch" },
                { feature: "Automation & API Integrations", s: "—", g: "Webhooks", p: "Standard API Access", e: "Custom Integrations & Webhooks" },
                { feature: "Customer Support SLA", s: "Standard Email", g: "Priority Email & Chat", p: "24/7 Priority Support", e: "Dedicated Account Advisor + Phone" },
              ].map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 sm:p-4.5 font-bold text-slate-800">{row.feature}</td>
                  <td className="p-4 sm:p-4.5 text-slate-600">{row.s}</td>
                  <td className="p-4 sm:p-4.5 font-semibold text-amber-800 bg-amber-50/50">{row.g}</td>
                  <td className="p-4 sm:p-4.5 text-slate-600">{row.p}</td>
                  <td className="p-4 sm:p-4.5 font-bold text-slate-900">{row.e}</td>
                </tr>
              ))}
            </tbody>
          </table>
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

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="flex justify-between items-center text-slate-700">
                <span>Billing Frequency:</span>
                <span className="font-bold text-slate-900 capitalize">{billingCycle}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Monthly Allowance:</span>
                <span className="font-extrabold text-amber-700">{selectedPackage.listing_limit_monthly.toLocaleString()} listings</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-900">Amount Due Today:</span>
                <span className="text-lg font-black text-amber-600">
                  ${billingCycle === "yearly" ? selectedPackage.price_annual : selectedPackage.price_monthly}
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
