"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  HardDrive,
  Info,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Users,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";
import { DummyRazorpayModal } from "@/components/subscriptions/razorpay-dummy-checkout-modal";

export type AdminPackage = {
  id: number;
  name: string;
  package_for: string;
  package_for_types?: string[];
  price: number;
  price_unit: "month" | "year" | "once" | string;
  price_monthly: number | null;
  price_yearly: number | null;
  price_once: number | null;
  storage_limit_gb: number | null;
  validity_count: number;
  validity_unit: "month" | "year" | "once" | string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
};

type CurrentSubscription = {
  id: number | null;
  institution_id: number;
  institution_name: string;
  package_id: number | null;
  package_name: string | null;
  status: string | null;
  starts_at: string | null;
  expires_at: string | null;
  price: string | number | null;
  price_unit: string | null;
  storage_limit_gb: string | number | null;
  validity_count: number | null;
  validity_unit: string | null;
  is_valid: boolean;
};

export default function BusinessPackagesSettingsPage() {
  const router = useRouter();
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitution, activeInstitutionId } = useActiveInstitution();

  const isPlatformAdmin = isPlatformAdminUser(user);
  const isInstitutionAdmin = isInstitutionAdminUser(user);
  const isBusinessOwner =
    isPlatformAdmin ||
    isInstitutionAdmin ||
    Boolean(user?.role_codes?.includes("business_owner")) ||
    Boolean(user?.role_codes?.includes("institution_admin"));

  useEffect(() => {
    if (isReady && !isPlatformAdmin) {
      router.replace("/workspace/subscription");
    }
  }, [isReady, isPlatformAdmin, router]);

  const [packages, setPackages] = useState<AdminPackage[]>([]);
  const [currentSub, setCurrentSub] = useState<CurrentSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [audienceFilter, setAudienceFilter] = useState<"all" | "institution" | "student" | "parent">("all");

  // Checkout modal state
  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [selectedPackageForCheckout, setSelectedPackageForCheckout] = useState<AdminPackage | null>(null);

  const authHeader = useMemo(() => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}), [accessToken]);

  const loadData = useCallback(async () => {
    try {
      // 1. Fetch official platform packages from sales_packages
      const pkgRes = await fetch("/api/admin/marketing/packages?limit=100", {
        headers: authHeader,
      });

      if (pkgRes.ok) {
        const pkgData = await pkgRes.json();
        if (Array.isArray(pkgData.packages)) {
          setPackages(pkgData.packages);
        }
      }

      // 2. Fetch institution current subscription status
      const targetInstId = activeInstitutionId || activeInstitution?.id || (user as any)?.institution_id || 160;
      const subRes = await fetch(`/api/admin/settings/subscription?institutionId=${targetInstId}`, {
        headers: authHeader,
      });

      if (subRes.ok) {
        const subData = await subRes.json();
        if (subData?.data?.subscription) {
          setCurrentSub(subData.data.subscription);
        }
      }
    } catch (err) {
      console.error("Failed to load packages data:", err);
      toast.error("Failed to load platform packages");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authHeader, activeInstitutionId, activeInstitution?.id, user]);

  useEffect(() => {
    if (isReady) {
      void loadData();
    }
  }, [isReady, loadData]);

  const handleRefresh = () => {
    setRefreshing(true);
    void loadData();
  };

  const handleChoosePackage = (pkg: AdminPackage) => {
    setSelectedPackageForCheckout(pkg);
    setCheckoutModalOpen(true);
  };

  // Filter packages
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (!pkg.is_active) return false;

      // Audience filter
      if (audienceFilter !== "all") {
        const pf = (pkg.package_for || "").toLowerCase();
        const types = Array.isArray(pkg.package_for_types)
          ? pkg.package_for_types.map((t) => String(t).toLowerCase())
          : [];

        if (audienceFilter === "institution") {
          const match =
            pf.includes("institution") ||
            pf.includes("institute") ||
            pf.includes("school") ||
            pf.includes("college") ||
            types.includes("institution") ||
            pf.includes("all");
          if (!match) return false;
        } else if (audienceFilter === "student") {
          const match = pf.includes("student") || pf.includes("learner") || types.includes("student");
          if (!match) return false;
        } else if (audienceFilter === "parent") {
          const match = pf.includes("parent") || pf.includes("guardian") || types.includes("parent");
          if (!match) return false;
        }
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = pkg.name.toLowerCase().includes(q);
        const descMatch = (pkg.description || "").toLowerCase().includes(q);
        const audienceMatch = (pkg.package_for || "").toLowerCase().includes(q);
        return nameMatch || descMatch || audienceMatch;
      }

      return true;
    });
  }, [packages, audienceFilter, search]);

  if (!isReady || loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-9 w-24" />
        </div>
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      </div>
    );
  }

  // Access check: only business owners, institution admins, or platform admins
  if (!isBusinessOwner) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center space-y-4 py-20">
        <div className="size-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
          <Lock className="size-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Restricted</h2>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          The Packages section in Settings is reserved exclusively for the <strong>Business Owner</strong> and Institution Administration.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/admin">Return to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const instIdForCheckout = activeInstitutionId || activeInstitution?.id || (user as any)?.institution_id || 160;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* ================= PAGE HEADER ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Settings &bull; Packages
            </span>
            <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] font-bold">
              Business Owner Access Only
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-2.5">
            <Boxes className="size-7 text-primary" />
            <span>Packages & Subscriptions</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl">
            Review official platform packages created by Platform Administration. Compare features, quotas, storage allowances, and activate or upgrade your subscription plan.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="rounded-xl text-xs gap-1.5"
          >
            <RefreshCw className={cn("size-3.5", refreshing && "animate-spin")} />
            <span>Refresh</span>
          </Button>

          {isPlatformAdmin && (
            <Button asChild size="sm" className="rounded-xl text-xs font-bold gap-1.5 bg-primary">
              <Link href="/admin/marketing/packages">
                <Plus className="size-3.5" />
                <span>Manage & Create Packages</span>
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* ================= PLATFORM ADMIN GOVERNANCE NOTICE ================= */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-start sm:items-center gap-3">
          <div className="size-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
            <ShieldCheck className="size-5" />
          </div>
          <div className="text-xs">
            <div className="font-bold text-foreground flex items-center gap-2">
              <span>Centrally Created by Platform Administration</span>
              <Badge variant="outline" className="text-[10px] bg-amber-500/20 text-amber-800 dark:text-amber-300 border-amber-500/40 font-bold">
                Platform Admin Only
              </Badge>
            </div>
            <p className="text-muted-foreground mt-0.5">
              These official packages are created and governed by Platform Admin. As the <strong>Business Owner</strong>, you can select, subscribe, and activate packages directly for your business.
            </p>
          </div>
        </div>
        {isPlatformAdmin && (
          <Badge className="bg-primary text-primary-foreground text-xs font-bold px-3 py-1 shrink-0">
            👑 Platform Administrator Mode
          </Badge>
        )}
      </div>

      {/* ================= CURRENT ACTIVE PLAN CARD ================= */}
      {currentSub && (
        <Card className="rounded-2xl border-2 border-emerald-500/30 bg-card p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  <span>Current Active Plan</span>
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Institution: <strong>{currentSub.institution_name}</strong>
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-foreground">
                {currentSub.package_name || "Enterprise Tier"}
              </h3>
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-primary" />
                  <span>
                    Expires: {currentSub.expires_at ? new Date(currentSub.expires_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Active"}
                  </span>
                </span>
                <span className="flex items-center gap-1.5">
                  <HardDrive className="size-3.5 text-primary" />
                  <span>Storage: {currentSub.storage_limit_gb ? `${currentSub.storage_limit_gb} GB` : "Unlimited"}</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <CreditCard className="size-3.5 text-primary" />
                  <span>Billing: ₹{Number(currentSub.price || 0).toLocaleString("en-IN")} / {currentSub.price_unit || "month"}</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge className="bg-emerald-500 text-white font-bold px-3 py-1.5 text-xs">
                Active & Verified
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* ================= AUDIENCE FILTER PILLS & SEARCH ================= */}
      <div className="bg-card border rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Audience Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAudienceFilter("all")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer",
                audienceFilter === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              All Packages ({packages.length})
            </button>

            <button
              type="button"
              onClick={() => setAudienceFilter("institution")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                audienceFilter === "institution"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Building2 className="size-3.5" />
              <span>For Institutions</span>
            </button>

            <button
              type="button"
              onClick={() => setAudienceFilter("student")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                audienceFilter === "student"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Users className="size-3.5" />
              <span>For Students</span>
            </button>

            <button
              type="button"
              onClick={() => setAudienceFilter("parent")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5",
                audienceFilter === "parent"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <ShieldCheck className="size-3.5" />
              <span>For Parents</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search package name or feature..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9 bg-background rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* ================= PACKAGES GRID ================= */}
      {filteredPackages.length === 0 ? (
        <div className="p-16 text-center rounded-2xl border bg-card space-y-3">
          <Boxes className="size-12 mx-auto text-muted-foreground opacity-30" />
          <h3 className="text-base font-bold text-foreground">No Packages Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {search.trim()
              ? `No packages match "${search}". Try another search term.`
              : "No packages available in this category."}
          </p>
          <Button size="sm" variant="outline" onClick={() => { setSearch(""); setAudienceFilter("all"); }}>
            Reset Filters
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPackages.map((pkg) => {
            const priceNum = Number(pkg.price || 0);
            const isCurrentPlan = currentSub?.package_id === pkg.id;
            const isInstPkg =
              (pkg.package_for || "").toLowerCase().includes("institution") ||
              (pkg.package_for || "").toLowerCase().includes("all");

            return (
              <Card
                key={pkg.id}
                className={cn(
                  "rounded-2xl border bg-card p-6 shadow-xs hover:shadow-lg transition-all flex flex-col justify-between group relative overflow-hidden",
                  isCurrentPlan
                    ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-md"
                    : "hover:border-primary/50"
                )}
              >
                {isCurrentPlan && (
                  <div className="absolute top-0 right-0 bg-emerald-600 text-white font-black text-[10px] px-3 py-1 rounded-bl-xl uppercase tracking-wider shadow-xs">
                    Current Active Plan
                  </div>
                )}

                <div className="space-y-4">
                  {/* Card Header & Badges */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5",
                        isInstPkg
                          ? "bg-primary/10 text-primary border-primary/30"
                          : "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30"
                      )}
                    >
                      {pkg.package_for || "Platform Package"}
                    </Badge>

                    {pkg.storage_limit_gb && (
                      <Badge variant="secondary" className="text-[10px] font-medium flex items-center gap-1">
                        <HardDrive className="size-3" />
                        <span>{pkg.storage_limit_gb} GB Storage</span>
                      </Badge>
                    )}
                  </div>

                  {/* Title & Validity */}
                  <div>
                    <h3 className="text-xl font-black text-foreground group-hover:text-primary transition-colors">
                      {pkg.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                      <Clock className="size-3.5 text-primary" />
                      <span>
                        Validity: {pkg.validity_count || 1} {pkg.validity_unit || "month"}{Number(pkg.validity_count) > 1 ? "s" : ""}
                      </span>
                    </p>
                  </div>

                  {/* Pricing Display */}
                  <div className="pt-3 border-t border-border/60">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl font-black text-foreground">
                        {priceNum === 0 ? "Free" : `₹${priceNum.toLocaleString("en-IN")}`}
                      </span>
                      {priceNum > 0 && (
                        <span className="text-xs font-semibold text-muted-foreground">
                          / {pkg.price_unit || "month"}
                        </span>
                      )}
                    </div>
                    {pkg.price_yearly && Number(pkg.price_yearly) > 0 && (
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1">
                        Annual Plan: ₹{Number(pkg.price_yearly).toLocaleString("en-IN")} / year
                      </p>
                    )}
                  </div>

                  {/* Feature Checklist */}
                  {pkg.description && (
                    <div className="space-y-2 pt-3 border-t border-border/50 text-xs">
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                        Included Entitlements
                      </p>
                      <ul className="space-y-1.5">
                        {pkg.description
                          .split("\n")
                          .filter((l) => l.trim())
                          .map((feature, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-2 text-foreground/90 text-xs leading-snug">
                              <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0 mt-0.5" />
                              <span>{feature.trim()}</span>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Card CTA Action */}
                <div className="pt-5 mt-5 border-t border-border/60">
                  {isCurrentPlan ? (
                    <Button
                      type="button"
                      disabled
                      className="w-full bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs h-10 rounded-xl cursor-not-allowed"
                    >
                      <ShieldCheck className="size-4 mr-2" />
                      <span>Current Active Plan</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => handleChoosePackage(pkg)}
                      className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-10 rounded-xl gap-2 shadow-xs group-hover:shadow-md transition-all cursor-pointer"
                    >
                      <Zap className="size-4" />
                      <span>{currentSub ? "Upgrade to This Plan" : "Choose & Activate Package"}</span>
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ================= DUMMY RAZORPAY PAYMENT MODAL ================= */}
      {selectedPackageForCheckout && (
        <DummyRazorpayModal
          open={checkoutModalOpen}
          onOpenChange={setCheckoutModalOpen}
          packageItem={selectedPackageForCheckout}
          institutionId={instIdForCheckout}
          roleTarget="business_owner"
          onSuccess={() => {
            void loadData();
          }}
        />
      )}
    </div>
  );
}
