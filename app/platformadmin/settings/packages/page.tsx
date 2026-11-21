"use client";

import React, { useEffect, useState } from "react";
import {
  Package,
  Plus,
  Sparkles,
  Edit2,
  CheckCircle2,
  XCircle,
  Database,
  HardDrive,
  Activity,
  Cpu,
  Search,
  ShieldCheck,
  Loader2,
  RefreshCw,
  Power,
  SlidersHorizontal,
  Server,
  Zap,
  Globe,
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  CATALOG_AVAILABLE_COUNTRIES,
  getCatalogCountryMeta,
} from "@/lib/config/country-config";

interface SalesPackage {
  id: number;
  name: string;
  tier: string;
  package_category: string;
  price: number;
  price_monthly: number;
  price_annual?: number;
  price_unit: string;
  currency_symbol?: string;
  country_code?: string;
  billing_cycle: string;
  database_allowance: string;
  file_storage_allowance: string;
  monthly_bandwidth: string;
  compute_allowance: string;
  seo_service: string;
  description: string;
  is_active: boolean;
  is_popular?: boolean;
}

const FILTER_COUNTRIES = [
  { code: "ALL", name: "All Countries", flag: "🌐" },
  { code: "IN", name: "India (₹)", flag: "🇮🇳" },
  { code: "ZA", name: "South Africa (R)", flag: "🇿🇦" },
  { code: "US", name: "United States ($)", flag: "🇺🇸" },
  { code: "GB", name: "United Kingdom (£)", flag: "🇬🇧" },
  { code: "AE", name: "UAE (د.إ)", flag: "🇦🇪" },
];

export default function PlatformAdminSettingsPackagesPage() {
  const [packages, setPackages] = useState<SalesPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountryFilter, setSelectedCountryFilter] = useState<string>("ALL");

  // Edit / Create Dialog State
  const [editPackage, setEditPackage] = useState<Partial<SalesPackage> | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const loadPackages = async (countryFilter: string = selectedCountryFilter) => {
    setLoading(true);
    try {
      const url =
        countryFilter && countryFilter !== "ALL"
          ? `/api/platformadmin/packages?country=${encodeURIComponent(countryFilter)}`
          : "/api/platformadmin/packages";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && json.packages) {
        setPackages(json.packages);
      }
    } catch (err) {
      toast.error("Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages(selectedCountryFilter);
  }, [selectedCountryFilter]);

  const handleToggleActive = async (pkg: SalesPackage) => {
    const nextState = !pkg.is_active;
    setTogglingId(pkg.id);

    // Optimistic update
    setPackages((prev) =>
      prev.map((p) => (p.id === pkg.id ? { ...p, is_active: nextState } : p))
    );

    try {
      const res = await fetch("/api/platformadmin/packages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pkg.id, is_active: nextState }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || `Package "${pkg.name}" is now ${nextState ? "Active" : "Deactivated"}`);
      } else {
        throw new Error(data.error || "Failed to update package status");
      }
    } catch (err: any) {
      toast.error(err.message || "Could not toggle package");
      // Revert optimistic update
      setPackages((prev) =>
        prev.map((p) => (p.id === pkg.id ? { ...p, is_active: pkg.is_active } : p))
      );
    } finally {
      setTogglingId(null);
    }
  };

  const handleCountryChangeInForm = (newCountryCode: string) => {
    const meta = getCatalogCountryMeta(newCountryCode);
    setEditPackage((prev) => ({
      ...prev,
      country_code: newCountryCode.toUpperCase(),
      price_unit: meta.currencyCode,
      currency_symbol: meta.currencySymbol,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPackage) return;
    setSaving(true);
    try {
      const method = isNew ? "POST" : "PUT";
      const payload = {
        ...editPackage,
        country_code: (editPackage.country_code || "IN").toUpperCase(),
        currency_symbol: editPackage.currency_symbol || "₹",
        price_unit: editPackage.price_unit || "INR",
        price_monthly: Number(editPackage.price_monthly) || 0,
        price: Number(editPackage.price_monthly) || 0,
        billing_cycle: editPackage.billing_cycle || "Monthly",
        package_category: editPackage.package_category || "hosting_growth",
        package_for: editPackage.package_category || "platform",
      };

      const res = await fetch("/api/platformadmin/packages", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Package saved successfully!");
        setEditPackage(null);
        loadPackages();
      } else {
        toast.error(data.error || "Failed to save package");
      }
    } catch (err) {
      toast.error("Failed to connect to server");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Server className="size-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Package &amp; Allowance Management
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Configure pricing tiers, country-specific currencies, compute &amp; database allowances, monthly bandwidth, and SEO services.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadPackages(selectedCountryFilter)}
            disabled={loading}
            className="gap-1.5 rounded-xl cursor-pointer"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              const defaultCountry = selectedCountryFilter !== "ALL" ? selectedCountryFilter : "IN";
              const countryMeta = getCatalogCountryMeta(defaultCountry);
              setIsNew(true);
              setEditPackage({
                name: "",
                tier: "growth",
                package_category: "hosting_growth",
                country_code: countryMeta.code,
                price_unit: countryMeta.currencyCode,
                currency_symbol: countryMeta.currencySymbol,
                price_monthly: countryMeta.code === "ZA" ? 199 : countryMeta.code === "US" ? 29 : 999,
                billing_cycle: "Monthly",
                database_allowance: "1 GB",
                file_storage_allowance: "10 GB",
                monthly_bandwidth: "50 GB",
                compute_allowance: "500 units",
                seo_service: "Local SEO support",
                is_active: true,
                description: "",
              });
            }}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold gap-1.5 rounded-xl shadow-xs cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Create Package</span>
          </Button>
        </div>
      </div>

      {/* Country Filter Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 mr-1 flex items-center gap-1.5">
          <Globe className="size-3.5 text-amber-500" />
          Filter by Country:
        </span>
        {FILTER_COUNTRIES.map((c) => {
          const isActive = selectedCountryFilter === c.code;
          return (
            <button
              key={c.code}
              type="button"
              onClick={() => setSelectedCountryFilter(c.code)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:bg-slate-100"
              }`}
            >
              <span>{c.flag}</span>
              <span>{c.name}</span>
            </button>
          );
        })}
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse h-96 bg-muted/40 rounded-2xl border" />
          ))}
        </div>
      ) : packages.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border p-8 space-y-3">
          <Package className="size-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">No Packages Found</h3>
          <p className="text-xs text-muted-foreground">
            No packages found for {selectedCountryFilter === "ALL" ? "the selected filter" : selectedCountryFilter}. Click &apos;Create Package&apos; above to configure subscription plans.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {packages.map((pkg) => {
            const isToggling = togglingId === pkg.id;
            const countryMeta = getCatalogCountryMeta(pkg.country_code || "IN");
            const symbol = pkg.currency_symbol || countryMeta.currencySymbol || "₹";
            const unit = pkg.price_unit || countryMeta.currencyCode || "INR";

            return (
              <Card
                key={pkg.id}
                className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden shadow-xs hover:shadow-md ${
                  pkg.is_active
                    ? "bg-white dark:bg-slate-900 border-border"
                    : "bg-slate-100/70 dark:bg-slate-900/40 border-slate-300/70 opacity-75"
                }`}
              >
                <CardHeader className="p-5 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full ${
                          pkg.name.toLowerCase() === "enterprise"
                            ? "bg-purple-500/10 text-purple-600 border-purple-300"
                            : pkg.name.toLowerCase() === "professional"
                            ? "bg-blue-500/10 text-blue-600 border-blue-300"
                            : pkg.name.toLowerCase() === "growth"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-300"
                            : "bg-amber-500/10 text-amber-600 border-amber-300"
                        }`}
                      >
                        {pkg.name}
                      </Badge>

                      {/* Country & Currency Badge */}
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                      >
                        <span>{countryMeta.flag}</span>
                        <span>{countryMeta.code}</span>
                      </Badge>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {pkg.is_popular && (
                        <Badge className="bg-amber-500 text-slate-950 font-black text-[9px] px-2 py-0.2 rounded-full gap-0.5">
                          <Sparkles className="size-2.5" />
                          <span>POPULAR</span>
                        </Badge>
                      )}
                      <Badge
                        variant={pkg.is_active ? "default" : "secondary"}
                        className={`text-[10px] font-bold ${
                          pkg.is_active
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-300"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {pkg.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </div>

                  <CardTitle className="text-lg font-black text-slate-900 dark:text-white pt-2">
                    {pkg.name}
                  </CardTitle>

                  <div className="pt-2 flex items-baseline gap-1.5">
                    <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      {symbol}{Number(pkg.price_monthly || pkg.price).toLocaleString()}
                    </span>
                    <span className="text-xs text-slate-500 font-semibold">
                      {unit} / {pkg.billing_cycle || "Monthly"}
                    </span>
                  </div>

                  {pkg.description && (
                    <CardDescription className="text-xs text-slate-500 line-clamp-2 pt-1 leading-relaxed">
                      {pkg.description}
                    </CardDescription>
                  )}
                </CardHeader>

                {/* Allowance Specifications */}
                <CardContent className="p-5 pt-3 pb-4 space-y-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-2">
                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Database className="size-3.5 text-amber-500" />
                        Database
                      </span>
                      <strong className="font-bold">{pkg.database_allowance || "Custom"}</strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <HardDrive className="size-3.5 text-blue-500" />
                        File Storage
                      </span>
                      <strong className="font-bold">{pkg.file_storage_allowance || "Custom"}</strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Activity className="size-3.5 text-emerald-500" />
                        Bandwidth
                      </span>
                      <strong className="font-bold">{pkg.monthly_bandwidth || "Custom"}</strong>
                    </div>

                    <div className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                        <Cpu className="size-3.5 text-purple-500" />
                        Compute
                      </span>
                      <strong className="font-bold">{pkg.compute_allowance || "Custom"}</strong>
                    </div>

                    <div className="flex flex-col pt-1.5 border-t border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 pb-0.5 text-[11px]">
                        <Search className="size-3 text-sky-500" />
                        SEO Support
                      </span>
                      <span className="font-bold text-[11px] text-slate-900 dark:text-white truncate">
                        {pkg.seo_service || "Basic SEO support"}
                      </span>
                    </div>
                  </div>
                </CardContent>

                {/* Footer Actions: Active Toggle & Edit Button */}
                <CardFooter className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={pkg.is_active}
                      onCheckedChange={() => handleToggleActive(pkg)}
                      disabled={isToggling}
                      id={`active-switch-${pkg.id}`}
                    />
                    <label
                      htmlFor={`active-switch-${pkg.id}`}
                      className="text-xs font-semibold cursor-pointer select-none text-slate-700 dark:text-slate-300"
                    >
                      {pkg.is_active ? "Active" : "Disabled"}
                    </label>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsNew(false);
                      setEditPackage({ ...pkg });
                    }}
                    className="h-8 px-3 rounded-xl gap-1 text-xs font-bold border-slate-300 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 cursor-pointer shadow-2xs"
                  >
                    <Edit2 className="size-3" />
                    <span>Edit</span>
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit / Create Dialog */}
      <Dialog open={Boolean(editPackage)} onOpenChange={(open) => !open && setEditPackage(null)}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto rounded-3xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900 dark:text-white">
              {isNew ? "Create New Package" : `Edit Package: ${editPackage?.name}`}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Configure country-specific currency, monthly price, allowances, and SEO services.
            </DialogDescription>
          </DialogHeader>

          {editPackage && (
            <form onSubmit={handleSave} className="space-y-4 pt-2">
              {/* Country Selection */}
              <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-100/70 dark:bg-slate-900/80 border">
                <div className="space-y-1 col-span-3 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Country</label>
                  <select
                    value={editPackage.country_code || "IN"}
                    onChange={(e) => handleCountryChangeInForm(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    {CATALOG_AVAILABLE_COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.code})
                      </option>
                    ))}
                    <option value="ALL">🌐 Global (ALL)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Currency Unit</label>
                  <input
                    type="text"
                    required
                    value={editPackage.price_unit || "INR"}
                    onChange={(e) => setEditPackage((prev) => ({ ...prev, price_unit: e.target.value }))}
                    placeholder="e.g. INR, ZAR, USD"
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Currency Symbol</label>
                  <input
                    type="text"
                    required
                    value={editPackage.currency_symbol || "₹"}
                    onChange={(e) => setEditPackage((prev) => ({ ...prev, currency_symbol: e.target.value }))}
                    placeholder="e.g. ₹, R, $"
                    className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Package Name</label>
                  <input
                    type="text"
                    required
                    value={editPackage.name || ""}
                    onChange={(e) => setEditPackage((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Launch"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tier Slug</label>
                  <input
                    type="text"
                    value={editPackage.tier || ""}
                    onChange={(e) => setEditPackage((prev) => ({ ...prev, tier: e.target.value }))}
                    placeholder="e.g. launch"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Monthly Price ({editPackage.currency_symbol || "₹"})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPackage.price_monthly !== undefined ? editPackage.price_monthly : ""}
                    onChange={(e) => setEditPackage((prev) => ({ ...prev, price_monthly: Number(e.target.value) }))}
                    placeholder="399"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Billing Cycle</label>
                  <input
                    type="text"
                    value={editPackage.billing_cycle || "Monthly"}
                    onChange={(e) => setEditPackage((prev) => ({ ...prev, billing_cycle: e.target.value }))}
                    placeholder="Monthly"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Allowances */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Database Allowance</label>
                  <input
                    type="text"
                    value={editPackage.database_allowance || ""}
                    onChange={(e) => setEditPackage((prev) => ({ ...prev, database_allowance: e.target.value }))}
                    placeholder="e.g. 250 MB or 1 GB"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">File Storage</label>
                  <input
                    type="text"
                    value={editPackage.file_storage_allowance || ""}
                    onChange={(e) => setEditPackage((prev) => ({ ...prev, file_storage_allowance: e.target.value }))}
                    placeholder="e.g. 2 GB or 10 GB"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Monthly Bandwidth</label>
                  <input
                    type="text"
                    value={editPackage.monthly_bandwidth || ""}
                    onChange={(e) => setEditPackage((prev) => ({ ...prev, monthly_bandwidth: e.target.value }))}
                    placeholder="e.g. 10 GB or 50 GB"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Compute Allowance</label>
                  <input
                    type="text"
                    value={editPackage.compute_allowance || ""}
                    onChange={(e) => setEditPackage((prev) => ({ ...prev, compute_allowance: e.target.value }))}
                    placeholder="e.g. 100 units"
                    className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">SEO Service</label>
                <input
                  type="text"
                  value={editPackage.seo_service || ""}
                  onChange={(e) => setEditPackage((prev) => ({ ...prev, seo_service: e.target.value }))}
                  placeholder="e.g. Basic SEO support or Local SEO support"
                  className="w-full h-10 px-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description</label>
                <textarea
                  rows={2}
                  value={editPackage.description || ""}
                  onChange={(e) => setEditPackage((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief package summary..."
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Active Toggle in Modal */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border">
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Package Active State</div>
                  <div className="text-[11px] text-slate-500">Enable or disable this package across user registration and checkout</div>
                </div>
                <Switch
                  checked={Boolean(editPackage.is_active)}
                  onCheckedChange={(checked) => setEditPackage((prev) => ({ ...prev, is_active: checked }))}
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditPackage(null)}
                  className="rounded-xl cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl gap-1.5 cursor-pointer"
                >
                  {saving && <Loader2 className="size-3.5 animate-spin" />}
                  <span>{isNew ? "Create Package" : "Save Changes"}</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
