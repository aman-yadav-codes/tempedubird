"use client";

import { useEffect, useState, useMemo } from "react";
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
  HardDrive,
  Calendar,
  GraduationCap,
  Users,
  School,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AuthModalDialog } from "@/components/auth/auth-modal-dialog";
import { useAuthStore } from "@/store";

type Package = {
  id: number;
  name: string;
  package_for: string;
  price: number;
  price_unit: string;
  price_monthly: number | null;
  price_yearly: number | null;
  price_once: number | null;
  storage_limit_gb: number | null;
  validity_count: number;
  validity_unit: string;
  description: string | null;
  features?: string[];
  isPopular?: boolean;
};

type AudienceTab = "institution" | "student" | "parent";
type BillingCycle = "monthly" | "yearly" | "once";

const AUDIENCE_CONFIG: Record<
  AudienceTab,
  { label: string; icon: React.ElementType; color: string; bg: string; description: string }
> = {
  institution: {
    label: "For Institutions",
    icon: School,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/30",
    description: "Grow your school, college, or coaching center with our powerful institution plans.",
  },
  student: {
    label: "For Students",
    icon: GraduationCap,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-500/10 border-blue-500/30",
    description: "Unlock your full learning potential with study tools, live classes, and mock exams.",
  },
  parent: {
    label: "For Parents",
    icon: Users,
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    description: "Stay connected to your child's progress, attendance, fees, and school updates.",
  },
};

/** Derive audience type from user's role codes */
function getUserAudience(roleCodes: string[]): AudienceTab {
  const codes = roleCodes.map((c) => c.toLowerCase());
  // Check for student-type roles
  if (codes.some((c) => c.includes("student") || c.includes("learner"))) return "student";
  // Check for parent-type roles
  if (codes.some((c) => c.includes("parent") || c.includes("guardian"))) return "parent";
  // Default: institution / admin / teacher
  return "institution";
}

export default function PublicPackagesPage() {
  const { isAuthenticated, user } = useAuthStore();

  // Determine the active tab — logged-in users are locked to their audience
  const userAudience: AudienceTab | null = useMemo(() => {
    if (!isAuthenticated || !user) return null;
    return getUserAudience(user.role_codes ?? []);
  }, [isAuthenticated, user]);

  const [activeTab, setActiveTab] = useState<AudienceTab>("institution");
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  // When user logs in, snap to their audience tab
  useEffect(() => {
    if (userAudience) setActiveTab(userAudience);
  }, [userAudience]);

  // Fetch whenever active tab changes
  useEffect(() => {
    fetchPackages(activeTab);
  }, [activeTab]);

  const fetchPackages = async (audience: AudienceTab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/public/packages?audience=${audience}`);
      const data = await res.json();
      if (res.ok && data.packages) {
        setPackages(data.packages);
      }
    } catch (err) {
      console.error("Error loading packages:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPackage = (pkg: Package) => {
    if (!isAuthenticated) {
      setAuthDialogOpen(true);
    } else {
      window.location.href = `/contact?package=${pkg.id}`;
    }
  };

  const config = AUDIENCE_CONFIG[activeTab];
  const isLocked = userAudience !== null; // Logged-in users can't switch tabs

  return (
    <div className="bg-background min-h-screen">
      {/* Hero */}
      <section className="relative border-b border-border bg-gradient-to-b from-card/80 via-background to-background py-14 lg:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,transparent)] dark:bg-grid-slate-700/25" />
        <div className="container relative mx-auto px-4 text-center max-w-4xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/20">
            <Sparkles className="h-4 w-4" />
            <span>EduBird Subscription Plans</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl leading-tight">
            {isAuthenticated && userAudience === "student"
              ? "Plans Built for Your Learning Journey"
              : isAuthenticated && userAudience === "parent"
              ? "Stay Connected to Your Child's Education"
              : "Empower Your Institution & Boost Enrollments"}
          </h1>

          <p className="text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            {config.description}
          </p>

          {/* Audience Tabs — hidden for logged-in users (auto-selected) */}
          {!isLocked && (
            <div className="pt-4 flex items-center justify-center gap-2 flex-wrap">
              {(Object.keys(AUDIENCE_CONFIG) as AudienceTab[]).map((tab) => {
                const cfg = AUDIENCE_CONFIG[tab];
                const Icon = cfg.icon;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveTab(tab)}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-bold transition-all duration-200 ${
                      activeTab === tab
                        ? `${cfg.bg} ${cfg.color} shadow-sm`
                        : "bg-background border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Show active audience badge for logged-in users */}
          {isLocked && (
            <div className="pt-4 flex justify-center">
              <div className={`inline-flex items-center gap-2 px-5 py-2 rounded-full border text-sm font-bold ${config.bg} ${config.color}`}>
                <config.icon className="h-4 w-4" />
                {config.label}
              </div>
            </div>
          )}

          {/* Billing Tabs: Monthly / Yearly / One-Time */}
          <div className="pt-2 flex items-center justify-center">
            <div className="inline-flex rounded-full border border-border bg-muted/40 p-1 gap-1">
              {([
                { key: "monthly", label: "Monthly", color: "bg-blue-500" },
                { key: "yearly",  label: "Yearly",  color: "bg-purple-500", badge: "Best Value" },
                { key: "once",    label: "One-Time", color: "bg-emerald-500" },
              ] as { key: BillingCycle; label: string; color: string; badge?: string }[]).map(({ key, label, color, badge }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBillingCycle(key)}
                  className={`relative inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold transition-all duration-200 ${
                    billingCycle === key
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
                  {label}
                  {badge && (
                    <span className="ml-1 rounded-full bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                      {badge}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Packages Grid */}
      <section className="container mx-auto px-4 py-12 lg:py-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm font-medium">Loading plans...</span>
          </div>
        ) : packages.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="font-semibold text-lg">No plans available right now.</p>
            <p className="text-sm mt-1">Please check back soon or contact us.</p>
          </div>
        ) : (
          <div className={`grid gap-8 max-w-7xl mx-auto items-stretch ${
            packages.length === 1
              ? "max-w-md mx-auto"
              : packages.length === 2
              ? "md:grid-cols-2 max-w-3xl mx-auto"
              : "md:grid-cols-2 lg:grid-cols-3"
          }`}>
            {packages.map((pkg, idx) => {
              const isPopularPick = idx === 1 && packages.length >= 3;

              // Determine price to display based on billing cycle
              const displayPrice =
                billingCycle === "monthly" ? (pkg.price_monthly ?? null)
                : billingCycle === "yearly"  ? (pkg.price_yearly  ?? null)
                : billingCycle === "once"    ? (pkg.price_once    ?? null)
                : null;

              const hasPrice = displayPrice !== null;
              const unitText =
                billingCycle === "monthly" ? "/month"
                : billingCycle === "yearly"  ? "/year"
                : "one-time";

              const features = pkg.description
                ? pkg.description.split("\n").filter(Boolean)
                : pkg.features ?? [];

              if (!hasPrice) {
                // This plan doesn't offer the selected billing period — show greyed-out card
                return (
                  <div key={pkg.id} className="relative flex flex-col rounded-2xl border border-dashed border-border/50 bg-muted/20 p-7 opacity-60">
                    <div className="text-center py-8 space-y-2">
                      <p className="font-bold text-foreground">{pkg.name}</p>
                      <p className="text-xs text-muted-foreground">Not available on {billingCycle} billing</p>
                      <div className="flex flex-wrap gap-1 justify-center pt-2">
                        {pkg.price_monthly != null && <span className="text-[10px] bg-blue-500/10 text-blue-600 rounded-full px-2 py-0.5 font-semibold">Monthly available</span>}
                        {pkg.price_yearly  != null && <span className="text-[10px] bg-purple-500/10 text-purple-600 rounded-full px-2 py-0.5 font-semibold">Yearly available</span>}
                        {pkg.price_once    != null && <span className="text-[10px] bg-emerald-500/10 text-emerald-600 rounded-full px-2 py-0.5 font-semibold">One-time available</span>}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={pkg.id}
                  className={`relative flex flex-col justify-between rounded-2xl border bg-card p-7 shadow-sm transition-all duration-300 hover:shadow-xl ${
                    isPopularPick
                      ? "border-primary ring-2 ring-primary/20 shadow-md scale-[1.03] bg-card/90"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {isPopularPick && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground shadow-md flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      Most Popular
                    </div>
                  )}

                  <div className="space-y-5">
                    {/* Name & Audience Badge */}
                    <div>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <h3 className="text-xl font-bold text-foreground">{pkg.name}</h3>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold uppercase tracking-wider ${config.bg} ${config.color} border-0`}
                        >
                          {pkg.package_for}
                        </Badge>
                      </div>
                    </div>

                    {/* Price */}
                  <div className="border-t border-border/60 pt-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-extrabold tracking-tight text-foreground">
                        ₹{displayPrice!.toLocaleString("en-IN")}
                      </span>
                      <span className="text-sm font-medium text-muted-foreground">{unitText}</span>
                    </div>
                    {/* Show other available billing options */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {pkg.price_monthly != null && billingCycle !== "monthly" && (
                        <button onClick={() => setBillingCycle("monthly")} className="text-[10px] bg-blue-500/10 text-blue-600 rounded-full px-2 py-0.5 font-semibold hover:bg-blue-500/20 transition-colors">
                          ₹{pkg.price_monthly.toLocaleString("en-IN")}/mo
                        </button>
                      )}
                      {pkg.price_yearly != null && billingCycle !== "yearly" && (
                        <button onClick={() => setBillingCycle("yearly")} className="text-[10px] bg-purple-500/10 text-purple-600 rounded-full px-2 py-0.5 font-semibold hover:bg-purple-500/20 transition-colors">
                          ₹{pkg.price_yearly.toLocaleString("en-IN")}/yr
                        </button>
                      )}
                      {pkg.price_once != null && billingCycle !== "once" && (
                        <button onClick={() => setBillingCycle("once")} className="text-[10px] bg-emerald-500/10 text-emerald-600 rounded-full px-2 py-0.5 font-semibold hover:bg-emerald-500/20 transition-colors">
                          ₹{pkg.price_once.toLocaleString("en-IN")} once
                        </button>
                      )}
                    </div>
                  </div>

                    {/* Metadata chips */}
                    <div className="flex flex-wrap gap-2 text-xs">
                      {pkg.storage_limit_gb && (
                        <span className="flex items-center gap-1 bg-muted/60 rounded-full px-2.5 py-1 font-medium text-foreground">
                          <HardDrive className="h-3 w-3 text-primary" />
                          {pkg.storage_limit_gb} GB
                        </span>
                      )}
                      <span className="flex items-center gap-1 bg-muted/60 rounded-full px-2.5 py-1 font-medium text-foreground">
                        <Calendar className="h-3 w-3 text-primary" />
                        {pkg.validity_count} {pkg.validity_unit}(s)
                      </span>
                    </div>

                    {/* Features */}
                    <div className="space-y-2.5 pt-1">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">What's included</p>
                      <ul className="space-y-2 text-xs text-muted-foreground">
                        {features.map((feat, fidx) => (
                          <li key={fidx} className="flex items-start gap-2">
                            <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="leading-snug">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="pt-7 mt-auto">
                    <Button
                      onClick={() => handleSelectPackage(pkg)}
                      className={`w-full py-5 text-sm font-bold shadow-sm gap-2 ${
                        isPopularPick
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                          : "bg-card hover:bg-accent text-foreground border border-border"
                      }`}
                    >
                      <span>Choose {pkg.name}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    {!isAuthenticated && (
                      <p className="text-center text-[10px] text-muted-foreground mt-2">
                        Sign in to activate this plan
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Trust Banner */}
      <section className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid gap-6 sm:grid-cols-3 text-center">
            <div className="space-y-2 p-4">
              <ShieldCheck className="h-8 w-8 text-primary mx-auto" />
              <h4 className="font-bold text-foreground text-base">Verified & Trusted</h4>
              <p className="text-xs text-muted-foreground">Gain instant trust with a verified badge on your profile.</p>
            </div>
            <div className="space-y-2 p-4">
              <Zap className="h-8 w-8 text-primary mx-auto" />
              <h4 className="font-bold text-foreground text-base">Instant Activation</h4>
              <p className="text-xs text-muted-foreground">Your plan goes live immediately after activation.</p>
            </div>
            <div className="space-y-2 p-4">
              <Building2 className="h-8 w-8 text-primary mx-auto" />
              <h4 className="font-bold text-foreground text-base">Dedicated Support</h4>
              <p className="text-xs text-muted-foreground">Email, call, and live chat support depending on your plan.</p>
            </div>
          </div>
        </div>
      </section>

      <AuthModalDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} defaultTab="signin" />
    </div>
  );
}
