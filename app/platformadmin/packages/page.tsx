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
  DollarSign,
  TrendingUp,
  ShieldCheck,
  Building2,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export default function PlatformAdminPackagesPage() {
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit / Create Dialog State
  const [editPackage, setEditPackage] = useState<any>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/platformadmin/packages?category=business_growth");
      const json = await res.json();
      if (json.success) {
        setPackages(json.packages || []);
      }
    } catch (err) {
      toast.error("Failed to load packages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const endpoint = "/api/platformadmin/packages";
      const method = isNew ? "POST" : "PUT";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editPackage),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message || "Package saved successfully!");
        setEditPackage(null);
        loadPackages();
      } else {
        toast.error(data.error || "Save failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save package");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight flex items-center gap-2.5">
            <Package className="size-7 text-amber-500" />
            <span>Business Growth Packages &amp; Pricing Management</span>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Configure monthly subscription tiers, monthly listing data limits, overage rates, and trial periods dynamically.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button
            onClick={() => {
              setIsNew(true);
              setEditPackage({
                name: "Custom Enterprise Tier",
                package_for: "Enterprise Clients & Large Agencies",
                tier: "enterprise",
                package_category: "business_growth",
                price_monthly: 599.0,
                price_annual: 5990.0,
                listing_limit_monthly: 10000,
                overage_price_per_listing: 0.25,
                auto_overage_enabled: true,
                trial_days: 14,
                is_popular: false,
                is_active: true,
                target_audience: "For multi-location corporate groups and digital agencies.",
                description: "Custom enterprise package with enhanced monthly listing limits and dedicated support.",
                features_list: [
                  "10,000+ unique listings/month",
                  "Dedicated Growth Account Manager",
                  "Custom ERP & API Integrations",
                  "Multi-location Centralized Dashboard",
                ],
              });
            }}
            className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs shadow-md gap-1.5 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Create Custom Package</span>
          </Button>
          <Button variant="outline" size="sm" onClick={loadPackages} className="text-xs font-semibold gap-1.5">
            <RefreshCw className="size-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Package Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-3">
          <Loader2 className="size-8 animate-spin text-amber-500" />
          <p className="text-xs text-muted-foreground">Loading database packages...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {packages.map((pkg) => (
            <Card
              key={pkg.id}
              className={`rounded-3xl border shadow-sm flex flex-col justify-between transition-all ${
                pkg.is_popular ? "border-amber-400/80 bg-amber-500/[0.03] shadow-md" : "bg-card"
              }`}
            >
              <CardHeader className="p-5 pb-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="capitalize text-[10px] font-bold">
                    {pkg.tier}
                  </Badge>
                  <div className="flex items-center gap-1.5">
                    {pkg.is_popular && (
                      <Badge className="bg-amber-500 text-black text-[9px] font-black uppercase">
                        Popular
                      </Badge>
                    )}
                    <Badge
                      variant="outline"
                      className={`text-[9px] font-bold ${
                        pkg.is_active ? "text-emerald-600 border-emerald-300" : "text-rose-600 border-rose-300"
                      }`}
                    >
                      {pkg.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-xl font-black text-foreground">{pkg.name}</CardTitle>
                <CardDescription className="text-xs line-clamp-2 min-h-[32px]">
                  {pkg.target_audience || pkg.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5 pt-0 space-y-4">
                {/* Pricing Box */}
                <div className="p-3.5 rounded-2xl bg-muted/40 border space-y-1.5">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-muted-foreground font-medium">Monthly:</span>
                    <span className="text-2xl font-black text-foreground">${pkg.price_monthly || pkg.price}</span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                    <span>Annual:</span>
                    <span className="font-bold text-foreground">${pkg.price_annual || pkg.price * 10}</span>
                  </div>
                  <div className="pt-2 border-t flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Listing Allowance:</span>
                    <span className="font-extrabold text-amber-500">
                      {pkg.listing_limit_monthly?.toLocaleString()} listings/mo
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>Overage Fee:</span>
                    <span className="font-medium">${pkg.overage_price_per_listing || 0.5}/listing</span>
                  </div>
                </div>

                {/* Features Count */}
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {pkg.features_list?.length || 0}
                  </span>{" "}
                  ecosystem capabilities configured
                </div>
              </CardContent>

              <div className="p-4 bg-muted/20 border-t rounded-b-3xl flex items-center justify-between">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsNew(false);
                    setEditPackage({ ...pkg });
                  }}
                  className="w-full text-xs font-bold gap-1.5 cursor-pointer hover:bg-muted"
                >
                  <Edit2 className="size-3.5 text-primary" />
                  <span>Configure Package</span>
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Edit / Configure Modal */}
      {editPackage && (
        <Dialog open={Boolean(editPackage)} onOpenChange={(open) => !open && setEditPackage(null)}>
          <DialogContent className="max-w-2xl bg-card border rounded-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-2">
                <SlidersHorizontal className="size-5 text-amber-500" />
                <span>{isNew ? "Create Package" : `Configure "${editPackage.name}"`}</span>
              </DialogTitle>
              <DialogDescription className="text-xs">
                Update dynamic subscription pricing, listing usage quotas, and visibility.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold">Package Name *</label>
                  <input
                    required
                    value={editPackage.name}
                    onChange={(e) => setEditPackage({ ...editPackage, name: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border bg-background text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">Tier Identifier</label>
                  <select
                    value={editPackage.tier}
                    onChange={(e) => setEditPackage({ ...editPackage, tier: e.target.value })}
                    className="w-full h-9 px-3 rounded-xl border bg-background text-foreground focus:outline-none focus:border-primary cursor-pointer capitalize"
                  >
                    <option value="starter">Starter</option>
                    <option value="growth">Growth</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold">Monthly Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPackage.price_monthly}
                    onChange={(e) => setEditPackage({ ...editPackage, price_monthly: parseFloat(e.target.value) })}
                    className="w-full h-9 px-3 rounded-xl border bg-background text-foreground font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">Annual Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editPackage.price_annual}
                    onChange={(e) => setEditPackage({ ...editPackage, price_annual: parseFloat(e.target.value) })}
                    className="w-full h-9 px-3 rounded-xl border bg-background text-foreground font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">Monthly Listings</label>
                  <input
                    type="number"
                    required
                    value={editPackage.listing_limit_monthly}
                    onChange={(e) => setEditPackage({ ...editPackage, listing_limit_monthly: parseInt(e.target.value, 10) })}
                    className="w-full h-9 px-3 rounded-xl border bg-background text-foreground font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-bold">Overage Price per Listing ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editPackage.overage_price_per_listing || 0.5}
                    onChange={(e) => setEditPackage({ ...editPackage, overage_price_per_listing: parseFloat(e.target.value) })}
                    className="w-full h-9 px-3 rounded-xl border bg-background text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold">Trial Period (Days)</label>
                  <input
                    type="number"
                    value={editPackage.trial_days || 14}
                    onChange={(e) => setEditPackage({ ...editPackage, trial_days: parseInt(e.target.value, 10) })}
                    className="w-full h-9 px-3 rounded-xl border bg-background text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold">Target Audience Summary</label>
                <input
                  value={editPackage.target_audience || ""}
                  onChange={(e) => setEditPackage({ ...editPackage, target_audience: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl border bg-background text-foreground"
                />
              </div>

              {/* Toggles: Most Popular, Visibility, Auto-Overage */}
              <div className="p-4 rounded-2xl bg-muted/40 border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-foreground block">Mark as &quot;Most Popular&quot;</span>
                    <span className="text-[11px] text-muted-foreground">Highlights this package with golden badges on /packages</span>
                  </div>
                  <Switch
                    checked={editPackage.is_popular}
                    onCheckedChange={(checked) => setEditPackage({ ...editPackage, is_popular: checked })}
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <span className="font-bold text-foreground block">Package Active / Visible</span>
                    <span className="text-[11px] text-muted-foreground">Controls whether this plan appears publicly to customers</span>
                  </div>
                  <Switch
                    checked={editPackage.is_active}
                    onCheckedChange={(checked) => setEditPackage({ ...editPackage, is_active: checked })}
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <span className="font-bold text-foreground block">Enable Auto-Overage Billing</span>
                    <span className="text-[11px] text-muted-foreground">Automatically bills excess listings instead of blocking</span>
                  </div>
                  <Switch
                    checked={editPackage.auto_overage_enabled}
                    onCheckedChange={(checked) => setEditPackage({ ...editPackage, auto_overage_enabled: checked })}
                  />
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" onClick={() => setEditPackage(null)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs cursor-pointer">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
