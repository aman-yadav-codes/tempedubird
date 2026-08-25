"use client";

import { useEffect, useState, useMemo } from "react";
import {
  CreditCard,
  Plus,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Check,
  Building2,
  GraduationCap,
  Clock,
  HardDrive,
  Sparkles,
  Layers,
  Calendar,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  Zap,
  Tag,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuthStore } from "@/store";
import { getStoredActiveInstitutionId } from "@/lib/auth/active-institution";

export type MarketingPackage = {
  id: number;
  name: string;
  package_for: string;
  package_for_types: string[];
  price: number;
  price_unit: "month" | "year" | "once" | string;
  storage_limit_gb: number | null;
  validity_count: number;
  validity_unit: "month" | "year" | "once" | string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ProgramFee = {
  id: number;
  institution_id: number;
  institution_name: string;
  course_name: string;
  program_type_name: string | null;
  duration_value: number | null;
  duration_unit: string | null;
  fee_amount: number;
  fee_unit: string;
  admission_fee: number;
  teaching_method: string | null;
  seats_available: number | null;
  is_active: boolean;
};

export default function PricingPackagesPage() {
  const { accessToken } = useAuthStore();
  const [activeTab, setActiveTab] = useState<"platform" | "program">("platform");

  // Platform Pricing Packages State
  const [packages, setPackages] = useState<MarketingPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [frequencyFilter, setFrequencyFilter] = useState<string>("all");

  // Dialog State: Create / Edit Package
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<MarketingPackage | null>(null);
  const [savingPackage, setSavingPackage] = useState(false);
  const [packageFormData, setPackageFormData] = useState({
    name: "",
    packageFor: "All Institutions",
    price: "4999",
    priceUnit: "month", // "month" | "year" | "once"
    validityCount: "1",
    validityUnit: "month", // "month" | "year" | "once"
    storageLimitGb: "50",
    description: "Unlimited Students Access\nOnline Examination & Results\nLMS & Study Notes\nSMS & WhatsApp Integration\nPriority Support",
    isActive: true,
  });

  // Delete Dialog State
  const [deletePackageTarget, setDeletePackageTarget] = useState<MarketingPackage | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Program Fee State (Tab 2)
  const [programFees, setProgramFees] = useState<ProgramFee[]>([]);
  const [feeDialogOpen, setFeeDialogOpen] = useState(false);
  const [editingFee, setEditingFee] = useState<ProgramFee | null>(null);
  const [savingFee, setSavingFee] = useState(false);
  const [feeFormData, setFeeFormData] = useState({
    feeAmount: "25000",
    feeUnit: "year",
    admissionFee: "2500",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const activeInstId = getStoredActiveInstitutionId();
      let url = `/api/admin/marketing/packages?search=${encodeURIComponent(search)}`;
      if (activeInstId) {
        url += `&institutionId=${activeInstId}`;
      }

      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          ...(activeInstId ? { "x-institution-id": String(activeInstId) } : {}),
        },
      });
      const data = await res.json();
      if (res.ok) {
        if (data.packages) setPackages(data.packages);
        if (data.programFees) setProgramFees(data.programFees);
      }
    } catch (err) {
      console.error("Error fetching pricing packages:", err);
      toast.error("Failed to load pricing packages.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search]);

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      if (frequencyFilter !== "all" && pkg.price_unit !== frequencyFilter) {
        return false;
      }
      return true;
    });
  }, [packages, frequencyFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = packages.length;
    const monthly = packages.filter((p) => p.price_unit === "month").length;
    const yearly = packages.filter((p) => p.price_unit === "year").length;
    const oneTime = packages.filter((p) => p.price_unit === "once").length;
    const active = packages.filter((p) => p.is_active).length;
    return { total, monthly, yearly, oneTime, active };
  }, [packages]);

  // Open Create Modal
  const handleOpenCreatePackage = () => {
    setEditingPackage(null);
    setPackageFormData({
      name: "",
      packageFor: "All Institutions",
      price: "4999",
      priceUnit: "month",
      validityCount: "1",
      validityUnit: "month",
      storageLimitGb: "50",
      description: "Unlimited Students Access\nOnline Examination & Results\nLMS & Study Notes\nSMS & WhatsApp Integration\nPriority Support",
      isActive: true,
    });
    setPackageDialogOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditPackage = (pkg: MarketingPackage) => {
    setEditingPackage(pkg);
    setPackageFormData({
      name: pkg.name,
      packageFor: pkg.package_for || "All Institutions",
      price: String(pkg.price),
      priceUnit: pkg.price_unit || "month",
      validityCount: String(pkg.validity_count || 1),
      validityUnit: pkg.validity_unit || "month",
      storageLimitGb: pkg.storage_limit_gb ? String(pkg.storage_limit_gb) : "",
      description: pkg.description || "",
      isActive: pkg.is_active,
    });
    setPackageDialogOpen(true);
  };

  // Save (Create / Update) Pricing Package
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!packageFormData.name.trim()) {
      return toast.error("Package name is required");
    }

    setSavingPackage(true);
    try {
      const payload = {
        name: packageFormData.name.trim(),
        packageFor: packageFormData.packageFor.trim(),
        price: parseFloat(packageFormData.price) || 0,
        priceUnit: packageFormData.priceUnit,
        validityCount: parseInt(packageFormData.validityCount, 10) || 1,
        validityUnit: packageFormData.validityUnit,
        storageLimitGb: packageFormData.storageLimitGb ? parseFloat(packageFormData.storageLimitGb) : null,
        description: packageFormData.description.trim() || null,
        isActive: packageFormData.isActive,
      };

      let res: Response;
      if (editingPackage) {
        res = await fetch("/api/admin/marketing/packages", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ id: editingPackage.id, ...payload }),
        });
      } else {
        res = await fetch("/api/admin/marketing/packages", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to save pricing package");
      }

      toast.success(editingPackage ? "Pricing package updated successfully" : "Pricing package created successfully");
      setPackageDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save package");
    } finally {
      setSavingPackage(false);
    }
  };

  // Toggle Active Status
  const handleTogglePackageActive = async (pkg: MarketingPackage) => {
    try {
      const res = await fetch("/api/admin/marketing/packages", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id: pkg.id,
          isActive: !pkg.is_active,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Package "${pkg.name}" ${pkg.is_active ? "disabled" : "activated"}`);
        fetchData();
      } else {
        toast.error(data.error || "Failed to toggle status");
      }
    } catch {
      toast.error("Network error");
    }
  };

  // Delete Package
  const handleDeletePackage = async () => {
    if (!deletePackageTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/marketing/packages?id=${deletePackageTarget.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Package "${deletePackageTarget.name}" deleted successfully`);
        setDeletePackageTarget(null);
        fetchData();
      } else {
        toast.error(data.error || "Failed to delete package");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  };

  // Program Fee Edit
  const handleOpenFeeEdit = (fee: ProgramFee) => {
    setEditingFee(fee);
    setFeeFormData({
      feeAmount: String(fee.fee_amount || 25000),
      feeUnit: fee.fee_unit || "year",
      admissionFee: String(fee.admission_fee || 2500),
    });
    setFeeDialogOpen(true);
  };

  const handleSaveFee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFee) return;
    setSavingFee(true);
    try {
      const res = await fetch("/api/admin/marketing/packages", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          isProgramFee: true,
          programId: editingFee.id,
          feeAmount: parseFloat(feeFormData.feeAmount) || 0,
          feeUnit: feeFormData.feeUnit,
          admissionFee: parseFloat(feeFormData.admissionFee) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to update course fee");
      toast.success(`Fee updated for ${editingFee.course_name}!`);
      setFeeDialogOpen(false);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSavingFee(false);
    }
  };

  const formatPriceUnitBadge = (unit: string) => {
    switch (unit) {
      case "month":
        return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-[11px] font-bold">Monthly Plan</Badge>;
      case "year":
        return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-[11px] font-bold">Yearly Plan</Badge>;
      case "once":
        return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-bold">One-Time Lifetime</Badge>;
      default:
        return <Badge variant="outline" className="text-[11px] font-semibold">{unit}</Badge>;
    }
  };

  const formatPriceSuffix = (unit: string) => {
    switch (unit) {
      case "month":
        return "/month";
      case "year":
        return "/year";
      case "once":
        return "one-time";
      default:
        return `/${unit}`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-primary" />
            Pricing Packages & Plans
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            Configure platform subscription packages (monthly, yearly, or one-time) and institution program fees.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "platform" && (
            <Button
              onClick={handleOpenCreatePackage}
              className="bg-primary text-primary-foreground font-bold rounded-xl gap-2 shadow-xs hover:bg-primary/90"
              size="sm"
            >
              <Plus className="h-4 w-4" />
              Add Pricing Package
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchData} title="Refresh" className="rounded-xl">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin text-primary" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as "platform" | "program")} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md h-10 p-1 bg-muted/60 rounded-xl">
          <TabsTrigger value="platform" className="rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Platform Packages ({packages.length})
          </TabsTrigger>
          <TabsTrigger value="program" className="rounded-lg text-xs font-bold gap-2 data-[state=active]:bg-background data-[state=active]:shadow-xs">
            <GraduationCap className="h-3.5 w-3.5 text-primary" />
            Course Fee Structure ({programFees.length})
          </TabsTrigger>
        </TabsList>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: PLATFORM PRICING PACKAGES (Monthly / Yearly / One-Time)
           ───────────────────────────────────────────────────────────── */}
        <TabsContent value="platform" className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="p-4 rounded-2xl border border-border/80 bg-card shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Total Packages</span>
              <p className="text-2xl font-black text-foreground">{stats.total}</p>
              <span className="text-[10px] text-muted-foreground">{stats.active} Active Live</span>
            </div>

            <div className="p-4 rounded-2xl border border-blue-500/20 bg-blue-500/5 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">Monthly Plans</span>
              <p className="text-2xl font-black text-blue-700 dark:text-blue-300">{stats.monthly}</p>
              <span className="text-[10px] text-blue-600/80 dark:text-blue-400/80">Per Month Basis</span>
            </div>

            <div className="p-4 rounded-2xl border border-purple-500/20 bg-purple-500/5 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">Yearly Plans</span>
              <p className="text-2xl font-black text-purple-700 dark:text-purple-300">{stats.yearly}</p>
              <span className="text-[10px] text-purple-600/80 dark:text-purple-400/80">Annual Basis</span>
            </div>

            <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 shadow-2xs space-y-1">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">One-Time Plans</span>
              <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">{stats.oneTime}</p>
              <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Lifetime / Single Pay</span>
            </div>
          </div>

          {/* Search & Frequency Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-2xl border border-border/80">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search packages by name, audience, or features..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-background"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <SlidersHorizontal className="h-3.5 w-3.5" /> Billing:
              </span>
              <Select value={frequencyFilter} onValueChange={setFrequencyFilter}>
                <SelectTrigger className="h-9 w-40 text-xs bg-background font-semibold">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Frequencies</SelectItem>
                  <SelectItem value="month">Monthly Only</SelectItem>
                  <SelectItem value="year">Yearly Only</SelectItem>
                  <SelectItem value="once">One-Time Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Packages Grid */}
          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs font-semibold">Loading pricing packages...</span>
            </div>
          ) : filteredPackages.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground space-y-3 bg-muted/10">
              <CreditCard className="h-12 w-12 mx-auto opacity-30 text-primary" />
              <p className="font-extrabold text-lg text-foreground">No Pricing Packages Found</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Create subscription packages for institutions with monthly, yearly, or one-time payment options.
              </p>
              <Button onClick={handleOpenCreatePackage} className="gap-2 bg-primary text-primary-foreground font-bold rounded-xl" size="sm">
                <Plus className="h-4 w-4" /> Add First Package
              </Button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPackages.map((pkg) => {
                const featureLines = pkg.description
                  ? pkg.description.split("\n").map((f) => f.trim()).filter(Boolean)
                  : [];

                return (
                  <div
                    key={pkg.id}
                    className={`rounded-3xl border transition-all flex flex-col justify-between overflow-hidden shadow-2xs hover:shadow-md ${
                      pkg.is_active
                        ? "border-border/90 bg-card"
                        : "border-border/60 bg-muted/10 opacity-75"
                    }`}
                  >
                    <div className="p-6 space-y-5">
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          {formatPriceUnitBadge(pkg.price_unit)}
                          <h3 className="text-xl font-extrabold text-foreground tracking-tight line-clamp-1">{pkg.name}</h3>
                          <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3.5 w-3.5 text-primary" />
                            {pkg.package_for}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={pkg.is_active}
                            onCheckedChange={() => handleTogglePackageActive(pkg)}
                            title={pkg.is_active ? "Click to deactivate" : "Click to activate"}
                          />
                        </div>
                      </div>

                      {/* Pricing Display */}
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-primary/5 via-muted/30 to-background border border-primary/10 space-y-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-black text-foreground">
                            ₹{Number(pkg.price).toLocaleString("en-IN")}
                          </span>
                          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                            {formatPriceSuffix(pkg.price_unit)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          Validity: <strong className="text-foreground">{pkg.validity_count} {pkg.validity_unit}</strong>
                          {pkg.storage_limit_gb ? ` • Storage: ${pkg.storage_limit_gb} GB` : " • Unlimited Storage"}
                        </p>
                      </div>

                      {/* Features List */}
                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground block">
                          Included Features & Perks:
                        </span>
                        {featureLines.length > 0 ? (
                          <ul className="space-y-2">
                            {featureLines.map((line, i) => (
                              <li key={i} className="text-xs text-foreground/90 font-medium flex items-start gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{line}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-muted-foreground italic">Standard platform access & LMS suite</p>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="px-6 py-4 bg-muted/20 border-t border-border/60 flex items-center justify-between gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeletePackageTarget(pkg)}
                        className="h-8 px-2 text-xs font-semibold text-muted-foreground hover:text-destructive gap-1 rounded-xl"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEditPackage(pkg)}
                        className="h-8 px-3 text-xs font-bold border-primary/30 text-primary hover:bg-primary/10 gap-1.5 rounded-xl"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit Package
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: INSTITUTION PROGRAM & COURSE FEES
           ───────────────────────────────────────────────────────────── */}
        <TabsContent value="program" className="space-y-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/20 p-3 rounded-2xl border border-border/80">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search courses or institutions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-background"
              />
            </div>
            <span className="text-xs text-muted-foreground font-medium">
              Showing {programFees.length} course fee entries
            </span>
          </div>

          {loading ? (
            <div className="py-20 text-center flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-xs font-semibold">Loading course fee packages...</span>
            </div>
          ) : programFees.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center text-muted-foreground space-y-3 bg-muted/10">
              <GraduationCap className="h-12 w-12 mx-auto opacity-30 text-primary" />
              <p className="font-extrabold text-lg text-foreground">No Course Fee Packages Found</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Courses & programs created under your institution listings will automatically appear here with their fee structures.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {programFees.map((fee) => (
                <div
                  key={fee.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-2xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-[10px] font-bold text-primary bg-primary/10 border-primary/20">
                          {fee.program_type_name || "Course Program"}
                        </Badge>
                        <h3 className="font-extrabold text-base text-foreground line-clamp-1">{fee.course_name}</h3>
                        <p className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          {fee.institution_name}
                        </p>
                      </div>
                      <Badge className={fee.is_active ? "bg-emerald-500 text-white font-bold text-[10px]" : "bg-muted text-muted-foreground font-bold text-[10px]"}>
                        {fee.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>

                    <div className="p-3.5 bg-gradient-to-br from-muted/40 to-primary/5 rounded-xl border border-border/80 space-y-1.5">
                      <span className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Tuition Fee</span>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-foreground">
                          ₹{Number(fee.fee_amount).toLocaleString("en-IN")}
                        </span>
                        <span className="text-xs font-semibold text-muted-foreground">/{fee.fee_unit}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground pt-1.5 border-t border-border font-medium">
                        <span>Admission Fee:</span>
                        <span className="font-extrabold text-foreground">₹{Number(fee.admission_fee).toLocaleString("en-IN")}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-foreground font-medium p-2 bg-muted/30 rounded-lg border border-border/60">
                        <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{fee.duration_value ? `${fee.duration_value} ${fee.duration_unit || "year"}` : "Standard"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-foreground font-medium p-2 bg-muted/30 rounded-lg border border-border/60">
                        <Layers className="h-3.5 w-3.5 text-primary shrink-0" />
                        <span>{fee.teaching_method || "On Campus"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">
                      Seats: <strong className="text-foreground">{fee.seats_available ?? 60}</strong>
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenFeeEdit(fee)}
                      className="gap-1.5 text-xs font-bold text-primary border-primary/30 hover:bg-primary/10 rounded-xl"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit Fee</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ─────────────────────────────────────────────────────────────
          CREATE / EDIT PLATFORM PRICING PACKAGE MODAL
         ───────────────────────────────────────────────────────────── */}
      <Dialog open={packageDialogOpen} onOpenChange={setPackageDialogOpen}>
        <DialogContent className="max-w-3xl sm:max-w-3xl w-full rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              {editingPackage ? "Edit Pricing Package" : "Add New Pricing Package"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure billing frequency (monthly, yearly, or one-time), price, validity, storage, and feature highlights.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePackage} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="pkg-name" className="text-xs font-bold">Package Name *</Label>
              <Input
                id="pkg-name"
                placeholder="e.g. Starter Plan, Professional Growth, Institutional Enterprise..."
                value={packageFormData.name}
                onChange={(e) => setPackageFormData({ ...packageFormData, name: e.target.value })}
                required
                className="h-10 text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="pkg-for" className="text-xs font-bold">Package For (Audience)</Label>
                <Input
                  id="pkg-for"
                  placeholder="e.g. Schools, Colleges, Coaching..."
                  value={packageFormData.packageFor}
                  onChange={(e) => setPackageFormData({ ...packageFormData, packageFor: e.target.value })}
                  className="h-10 text-xs font-semibold"
                />
              </div>

              {/* Billing Basis (Monthly, Yearly, One-Time) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Billing Frequency *</Label>
                <Select
                  value={packageFormData.priceUnit}
                  onValueChange={(val) => {
                    setPackageFormData({
                      ...packageFormData,
                      priceUnit: val,
                      validityUnit: val === "once" ? "year" : val,
                    });
                  }}
                >
                  <SelectTrigger className="h-10 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Monthly (Per Month)</SelectItem>
                    <SelectItem value="year">Yearly (Per Year)</SelectItem>
                    <SelectItem value="once">One-Time (Lifetime)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="pkg-price" className="text-xs font-bold">Price (₹ INR) *</Label>
                <Input
                  id="pkg-price"
                  type="number"
                  placeholder="4999"
                  value={packageFormData.price}
                  onChange={(e) => setPackageFormData({ ...packageFormData, price: e.target.value })}
                  required
                  className="h-10 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pkg-storage" className="text-xs font-bold">Storage Limit (GB)</Label>
                <Input
                  id="pkg-storage"
                  type="number"
                  placeholder="50 (or leave blank for unlimited)"
                  value={packageFormData.storageLimitGb}
                  onChange={(e) => setPackageFormData({ ...packageFormData, storageLimitGb: e.target.value })}
                  className="h-10 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="pkg-validity-count" className="text-xs font-bold">Validity Duration</Label>
                <Input
                  id="pkg-validity-count"
                  type="number"
                  min="1"
                  placeholder="1"
                  value={packageFormData.validityCount}
                  onChange={(e) => setPackageFormData({ ...packageFormData, validityCount: e.target.value })}
                  className="h-10 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Validity Unit</Label>
                <Select
                  value={packageFormData.validityUnit}
                  onValueChange={(val) => setPackageFormData({ ...packageFormData, validityUnit: val })}
                >
                  <SelectTrigger className="h-10 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="month">Month(s)</SelectItem>
                    <SelectItem value="year">Year(s)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="pkg-desc" className="text-xs font-bold flex items-center justify-between">
                <span>Features & Perks (One per line)</span>
                <span className="text-[10px] text-muted-foreground">Each line appears with a checkmark</span>
              </Label>
              <Textarea
                id="pkg-desc"
                placeholder="Unlimited Students&#10;Online Examination System&#10;LMS & Study Notes&#10;SMS & WhatsApp Integration&#10;Priority Support"
                value={packageFormData.description}
                onChange={(e) => setPackageFormData({ ...packageFormData, description: e.target.value })}
                rows={4}
                className="text-xs font-mono"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl border border-border bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold">Active & Live</Label>
                <p className="text-[11px] text-muted-foreground">Enable this package for institution purchase & subscriptions</p>
              </div>
              <Switch
                checked={packageFormData.isActive}
                onCheckedChange={(checked) => setPackageFormData({ ...packageFormData, isActive: checked })}
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setPackageDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={savingPackage} className="bg-primary text-primary-foreground font-bold rounded-xl gap-2">
                {savingPackage ? <Loader2 className="h-4 w-4 animate-spin" /> : editingPackage ? "Update Package" : "Create Package"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ─────────────────────────────────────────────────────────────
          DELETE PRICING PACKAGE ALERT DIALOG
         ───────────────────────────────────────────────────────────── */}
      <AlertDialog open={!!deletePackageTarget} onOpenChange={(open) => !open && setDeletePackageTarget(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Pricing Package
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong className="text-foreground">{deletePackageTarget?.name}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting} className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePackage}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ─────────────────────────────────────────────────────────────
          EDIT PROGRAM FEE MODAL
         ───────────────────────────────────────────────────────────── */}
      <Dialog open={feeDialogOpen} onOpenChange={setFeeDialogOpen}>
        <DialogContent className="max-w-xl sm:max-w-xl w-full rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              Update Course Fee Structure
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Set the course tuition fee, billing frequency, and admission fee for{" "}
              <strong className="text-foreground">{editingFee?.course_name}</strong>.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveFee} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <Label htmlFor="fee-amount" className="text-xs font-bold">Tuition Fee Amount (₹) *</Label>
                <Input
                  id="fee-amount"
                  type="number"
                  placeholder="25000"
                  value={feeFormData.feeAmount}
                  onChange={(e) => setFeeFormData({ ...feeFormData, feeAmount: e.target.value })}
                  required
                  className="h-10 text-xs font-semibold"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Fee Frequency / Unit</Label>
                <Select
                  value={feeFormData.feeUnit}
                  onValueChange={(val) => setFeeFormData({ ...feeFormData, feeUnit: val })}
                >
                  <SelectTrigger className="h-10 text-xs font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="year">Per Year</SelectItem>
                    <SelectItem value="semester">Per Semester</SelectItem>
                    <SelectItem value="month">Per Month</SelectItem>
                    <SelectItem value="total">Total Course Fee</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admission-fee" className="text-xs font-bold">Admission & Registration Fee (₹)</Label>
              <Input
                id="admission-fee"
                type="number"
                placeholder="2500"
                value={feeFormData.admissionFee}
                onChange={(e) => setFeeFormData({ ...feeFormData, admissionFee: e.target.value })}
                className="h-10 text-xs font-semibold"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setFeeDialogOpen(false)} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={savingFee} className="bg-primary text-primary-foreground font-bold rounded-xl gap-2">
                {savingFee ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Course Fee"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
