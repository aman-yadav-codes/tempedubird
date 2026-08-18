"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Zap,
  Building2,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  HelpCircle,
  Loader2,
  Plus,
  ArrowRight,
  Star,
  HardDrive,
  Calendar,
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
  storage_limit_gb: number | null;
  validity_count: number;
  validity_unit: string;
  description: string | null;
  features?: string[];
  isPopular?: boolean;
};

export default function PublicPackagesPage() {
  const { isAuthenticated } = useAuthStore();
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/public/packages");
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

  return (
    <div className="bg-background min-h-screen">
      {/* Hero Section */}
      <section className="relative border-b border-border bg-gradient-to-b from-card/80 via-background to-background py-16 lg:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,transparent)] dark:bg-grid-slate-700/25" />
        <div className="container relative mx-auto px-4 text-center max-w-4xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary ring-1 ring-primary/20">
            <Sparkles className="h-4 w-4" />
            <span>EduBird Institution Listing & Subscription Packages</span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-6xl leading-tight">
            Empower Your Institution & Boost Student Enrollments
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Choose the ideal package to list your institute, showcase courses, capture verified student leads, and manage admissions efficiently.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <span className={`text-sm font-semibold ${billingCycle === "monthly" ? "text-foreground" : "text-muted-foreground"}`}>
              Monthly Billing
            </span>
            <button
              type="button"
              onClick={() => setBillingCycle(billingCycle === "monthly" ? "annual" : "monthly")}
              className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-primary transition-colors duration-200 ease-in-out focus:outline-hidden"
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                  billingCycle === "annual" ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-sm font-semibold flex items-center gap-1.5 ${billingCycle === "annual" ? "text-foreground" : "text-muted-foreground"}`}>
              Annual Billing
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                Save 20%
              </span>
            </span>
          </div>
        </div>
      </section>

      {/* Packages Grid Section */}
      <section className="container mx-auto px-4 py-12 lg:py-16">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-sm font-medium">Loading subscription packages...</span>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 max-w-7xl mx-auto items-stretch">
            {packages.map((pkg) => {
              const adjustedPrice =
                billingCycle === "annual"
                  ? Math.round(pkg.price * 0.8 * 12)
                  : pkg.price;
              const unitText = billingCycle === "annual" ? "/year" : `/${pkg.price_unit}`;

              return (
                <div
                  key={pkg.id}
                  className={`relative flex flex-col justify-between rounded-2xl border bg-card p-8 shadow-sm transition-all duration-300 hover:shadow-xl ${
                    pkg.isPopular
                      ? "border-primary ring-2 ring-primary/20 shadow-md scale-105 bg-card/90"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  {pkg.isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground shadow-md flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      Most Popular Plan
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-foreground">{pkg.name}</h3>
                        <Badge variant="outline" className="text-[11px] font-medium uppercase tracking-wider">
                          {pkg.package_for}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground min-h-[36px]">
                        {pkg.description || "Comprehensive listing & marketing plan for educational growth."}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-border/60">
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold tracking-tight text-foreground">
                          ₹{adjustedPrice.toLocaleString("en-IN")}
                        </span>
                        <span className="text-sm font-medium text-muted-foreground">{unitText}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-1">Inclusive of all platform listing benefits.</p>
                    </div>

                    {/* Highlights */}
                    <div className="grid grid-cols-2 gap-2 text-xs py-2 bg-muted/30 rounded-lg p-2.5 border border-border/40">
                      {pkg.storage_limit_gb && (
                        <div className="flex items-center gap-1.5 text-foreground font-medium">
                          <HardDrive className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>{pkg.storage_limit_gb} GB Storage</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-foreground font-medium">
                        <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{pkg.validity_count} {pkg.validity_unit}(s)</span>
                      </div>
                    </div>

                    {/* Features list */}
                    <div className="space-y-3 pt-2">
                      <p className="text-xs font-bold uppercase tracking-wider text-foreground">Included Features:</p>
                      <ul className="space-y-2.5 text-xs text-muted-foreground">
                        {(pkg.features || [
                          "Verified Institute Profile Page",
                          "Course & Program Listings",
                          "Student Lead Capture & Notifications",
                          "Analytics & Placement Records",
                          "Standard Support",
                        ]).map((feat, idx) => (
                          <li key={idx} className="flex items-start gap-2.5">
                            <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span className="leading-snug">{feat}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="pt-8 mt-auto">
                    <Button
                      onClick={() => handleSelectPackage(pkg)}
                      className={`w-full py-6 text-sm font-bold shadow-sm gap-2 ${
                        pkg.isPopular
                          ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                          : "bg-card hover:bg-accent text-foreground border border-border"
                      }`}
                    >
                      <span>Choose {pkg.name}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Trust & Guarantee Banner */}
      <section className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid gap-6 sm:grid-cols-3 text-center">
            <div className="space-y-2 p-4">
              <ShieldCheck className="h-8 w-8 text-primary mx-auto" />
              <h4 className="font-bold text-foreground text-base">Verified Badging</h4>
              <p className="text-xs text-muted-foreground">Instantly gain student trust with verified institution status.</p>
            </div>
            <div className="space-y-2 p-4">
              <Zap className="h-8 w-8 text-primary mx-auto" />
              <h4 className="font-bold text-foreground text-base">Instant Setup</h4>
              <p className="text-xs text-muted-foreground">Your listing goes live immediately after package activation.</p>
            </div>
            <div className="space-y-2 p-4">
              <Building2 className="h-8 w-8 text-primary mx-auto" />
              <h4 className="font-bold text-foreground text-base">Multi-Campus Ready</h4>
              <p className="text-xs text-muted-foreground">Easily manage multiple branches, programs, and staff logins.</p>
            </div>
          </div>
        </div>
      </section>

      <AuthModalDialog open={authDialogOpen} onOpenChange={setAuthDialogOpen} defaultTab="signin" />
    </div>
  );
}
