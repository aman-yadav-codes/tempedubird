"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  AlertCircle,
  Bus,
  Check,
  ChevronRight,
  Compass,
  Edit2,
  IndianRupee,
  Layers,
  Loader2,
  MapPin,
  MoreHorizontal,
  Navigation,
  Plus,
  RefreshCw,
  Route,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Wrench,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

export type TransportFeeSlab = {
  id: number;
  institution_id: number | null;
  slab_name: string;
  min_km: number;
  max_km: number;
  monthly_fee: number;
  quarterly_fee: number | null;
  annual_fee: number | null;
  one_way_discount_percent: number;
  vehicle_type: string;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
};

const VEHICLE_TYPES = [
  { value: "all", label: "All Vehicles (Bus & Van)" },
  { value: "bus", label: "School Bus Only" },
  { value: "van", label: "Van / Mini-Bus Only" },
  { value: "auto", label: "Shared / Auto-Rickshaw" },
];

export function TransportationFeeClient() {
  const pathname = usePathname();
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitutionId, activeInstitution } = useActiveInstitution();
  const isPlatformAdmin = isPlatformAdminUser(user);
  const isPlatformSection = pathname?.startsWith("/platformadmin");
  const targetInstitutionId = isPlatformSection ? null : activeInstitutionId;

  const [slabs, setSlabs] = useState<TransportFeeSlab[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [vehicleFilter, setVehicleFilter] = useState<string>("all");

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlab, setEditingSlab] = useState<TransportFeeSlab | null>(null);
  const [slabName, setSlabName] = useState("");
  const [minKm, setMinKm] = useState("0");
  const [maxKm, setMaxKm] = useState("5");
  const [monthlyFee, setMonthlyFee] = useState("500");
  const [quarterlyFee, setQuarterlyFee] = useState("");
  const [annualFee, setAnnualFee] = useState("");
  const [oneWayDiscount, setOneWayDiscount] = useState("25");
  const [vehicleType, setVehicleType] = useState("all");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  // Seeding state
  const [seeding, setSeeding] = useState(false);

  // Delete modal state
  const [deletingSlab, setDeletingSlab] = useState<TransportFeeSlab | null>(null);
  const [deleting, setDeleting] = useState(false);

  const authHeader = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    [accessToken]
  );

  const scopeBadgeText =
    isPlatformSection || !targetInstitutionId
      ? "Platform Transport Fee Slabs"
      : `${activeInstitution?.name ?? "Institution"} Transport Fees`;

  // Fetch Slabs
  const fetchSlabs = useCallback(async () => {
    if (!isReady || !accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (targetInstitutionId) {
        params.set("institutionId", String(targetInstitutionId));
      }
      const res = await fetch(`/api/admin/finance/transportation-fees?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to fetch transportation fees");
      setSlabs(json.data ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load transportation fees");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeader, isReady, targetInstitutionId]);

  useEffect(() => {
    void fetchSlabs();
  }, [fetchSlabs]);

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingSlab(null);
    // Suggest next KM range based on existing max
    const highestMaxKm = slabs.length > 0 ? Math.max(...slabs.map((s) => s.max_km)) : 0;
    const nextMin = highestMaxKm > 0 ? highestMaxKm : 0;
    const nextMax = highestMaxKm > 0 ? highestMaxKm + (highestMaxKm >= 20 ? 15 : 5) : 5;
    const nextFee = slabs.length > 0 ? Math.max(...slabs.map((s) => s.monthly_fee)) + 300 : 500;

    setSlabName(`Zone ${String.fromCharCode(65 + slabs.length)} (${nextMin}–${nextMax} km)`);
    setMinKm(String(nextMin));
    setMaxKm(String(nextMax));
    setMonthlyFee(String(nextFee));
    setQuarterlyFee(String(Math.round(nextFee * 3 * 0.95))); // 5% discount for quarterly
    setAnnualFee(String(Math.round(nextFee * 12 * 0.9))); // 10% discount for annual
    setOneWayDiscount("25");
    setVehicleType("all");
    setDescription("");
    setIsActive(true);
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (slab: TransportFeeSlab) => {
    setEditingSlab(slab);
    setSlabName(slab.slab_name);
    setMinKm(String(slab.min_km));
    setMaxKm(String(slab.max_km));
    setMonthlyFee(String(slab.monthly_fee));
    setQuarterlyFee(slab.quarterly_fee ? String(slab.quarterly_fee) : "");
    setAnnualFee(slab.annual_fee ? String(slab.annual_fee) : "");
    setOneWayDiscount(String(slab.one_way_discount_percent ?? 0));
    setVehicleType(slab.vehicle_type || "all");
    setDescription(slab.description || "");
    setIsActive(slab.is_active);
    setModalOpen(true);
  };

  // Save (Create or Update)
  const handleSaveSlab = async () => {
    const name = slabName.trim();
    if (!name) {
      toast.error("Please enter a Slab / Zone name");
      return;
    }

    const nMin = Number(minKm);
    const nMax = Number(maxKm);
    const nMonthly = Number(monthlyFee);

    if (Number.isNaN(nMin) || nMin < 0) {
      toast.error("Min KM must be 0 or higher");
      return;
    }
    if (Number.isNaN(nMax) || nMax <= nMin) {
      toast.error("Max KM must be greater than Min KM");
      return;
    }
    if (Number.isNaN(nMonthly) || nMonthly < 0) {
      toast.error("Please enter a valid monthly fee");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        slab_name: name,
        min_km: nMin,
        max_km: nMax,
        monthly_fee: nMonthly,
        quarterly_fee: quarterlyFee ? Number(quarterlyFee) : null,
        annual_fee: annualFee ? Number(annualFee) : null,
        one_way_discount_percent: oneWayDiscount ? Number(oneWayDiscount) : 0,
        vehicle_type: vehicleType,
        description: description.trim() || null,
        is_active: isActive,
      };

      if (targetInstitutionId) {
        payload.institutionId = targetInstitutionId;
      }

      const url = editingSlab
        ? `/api/admin/finance/transportation-fees/${editingSlab.id}`
        : `/api/admin/finance/transportation-fees`;
      const method = editingSlab ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save distance slab");

      toast.success(
        editingSlab
          ? `Updated "${name}" successfully!`
          : `Created distance slab "${name}" successfully!`
      );
      setModalOpen(false);
      void fetchSlabs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save distance slab");
    } finally {
      setSaving(false);
    }
  };

  // Toggle Active State
  const handleToggleActive = async (slab: TransportFeeSlab) => {
    const nextState = !slab.is_active;
    try {
      const res = await fetch(`/api/admin/finance/transportation-fees/${slab.id}`, {
        method: "PATCH",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: nextState }),
      });
      if (!res.ok) throw new Error("Failed to update status");

      setSlabs((prev) =>
        prev.map((s) => (s.id === slab.id ? { ...s, is_active: nextState } : s))
      );
      toast.success(
        `"${slab.slab_name}" marked as ${nextState ? "Active" : "Inactive"}`
      );
    } catch {
      toast.error("Failed to change slab status");
    }
  };

  // Delete Slab
  const handleDeleteSlab = async () => {
    if (!deletingSlab) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/finance/transportation-fees/${deletingSlab.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete slab");

      toast.success(`Deleted "${deletingSlab.slab_name}"`);
      setDeletingSlab(null);
      void fetchSlabs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete distance slab");
    } finally {
      setDeleting(false);
    }
  };

  // Seed standard slabs
  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const res = await fetch(`/api/admin/finance/transportation-fees/seed`, {
        method: "POST",
        headers: {
          ...authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ institutionId: targetInstitutionId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load default distance slabs");

      toast.success("Standard distance slabs (Zone A to Zone E) loaded successfully!");
      void fetchSlabs();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to seed default slabs");
    } finally {
      setSeeding(false);
    }
  };

  // Filtered Slabs
  const filteredSlabs = useMemo(() => {
    return slabs.filter((s) => {
      const matchesSearch =
        search === "" ||
        s.slab_name.toLowerCase().includes(search.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(search.toLowerCase())) ||
        `${s.min_km}-${s.max_km}`.includes(search);

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.is_active) ||
        (statusFilter === "inactive" && !s.is_active);

      const matchesVehicle =
        vehicleFilter === "all" || s.vehicle_type === vehicleFilter;

      return matchesSearch && matchesStatus && matchesVehicle;
    });
  }, [slabs, search, statusFilter, vehicleFilter]);

  // KPI Calculations
  const stats = useMemo(() => {
    const activeSlabs = slabs.filter((s) => s.is_active);
    const maxKmSpan = slabs.length > 0 ? Math.max(...slabs.map((s) => s.max_km)) : 0;
    const minFee = activeSlabs.length > 0 ? Math.min(...activeSlabs.map((s) => s.monthly_fee)) : 0;
    const maxFee = activeSlabs.length > 0 ? Math.max(...activeSlabs.map((s) => s.monthly_fee)) : 0;

    return {
      total: slabs.length,
      active: activeSlabs.length,
      maxKm: maxKmSpan,
      minFee,
      maxFee,
    };
  }, [slabs]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <IndianRupee className="size-3.5 text-primary" />
            <span>Finance & Accounts</span>
            <span>•</span>
            <span className="text-primary font-bold">Transportation Fees</span>
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
              <Bus className="size-7 text-primary" />
              Transportation Fee Slabs
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
              Configure student bus and van transportation charges according to distance (KM) ranges and route zones.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Badge variant="outline" className="px-3 py-1 font-medium text-xs bg-muted/40">
            {scopeBadgeText}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSlabs}
            disabled={loading}
            className="h-9 gap-1.5 text-xs cursor-pointer"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
          {slabs.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedDefaults}
              disabled={seeding || loading}
              className="h-9 gap-1.5 text-xs text-primary border-primary/30 hover:bg-primary/10 cursor-pointer"
            >
              {seeding ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              Load Standard Slabs
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="h-9 gap-1.5 text-xs shadow-xs cursor-pointer bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="size-4" />
            Add Distance Slab
          </Button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Configured Slabs</span>
            <Layers className="size-4 text-primary" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {stats.active} <span className="text-xs font-normal text-muted-foreground">/ {stats.total} total</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Active distance slabs</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Max Route Distance</span>
            <Route className="size-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            {stats.maxKm} <span className="text-xs font-normal text-muted-foreground">KM</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Maximum school route coverage</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Starting Base Rate</span>
            <IndianRupee className="size-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            ₹{stats.minFee.toLocaleString("en-IN")} <span className="text-xs font-normal text-muted-foreground">/mo</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Lowest monthly slab rate</p>
        </div>

        <div className="rounded-xl border border-border/80 bg-card p-4 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Max Distance Rate</span>
            <Compass className="size-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-foreground">
            ₹{stats.maxFee.toLocaleString("en-IN")} <span className="text-xs font-normal text-muted-foreground">/mo</span>
          </div>
          <p className="text-[11px] text-muted-foreground">Highest monthly slab rate</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-2xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search slabs by name, KM, or description..."
            className="pl-9 h-9 text-xs"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="h-9 text-xs w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Slabs</SelectItem>
              <SelectItem value="inactive">Inactive Slabs</SelectItem>
            </SelectContent>
          </Select>

          {/* Vehicle filter */}
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="h-9 text-xs w-[140px]">
              <SelectValue placeholder="Vehicle Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Vehicles</SelectItem>
              <SelectItem value="bus">Bus Only</SelectItem>
              <SelectItem value="van">Van Only</SelectItem>
            </SelectContent>
          </Select>

          {slabs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedDefaults}
              disabled={seeding}
              className="h-9 text-xs gap-1 cursor-pointer"
              title="Add template slabs"
            >
              {seeding ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5 text-amber-500" />}
              <span className="hidden md:inline">Reset Defaults</span>
            </Button>
          )}
        </div>
      </div>

      {/* Slabs Grid / Table */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((idx) => (
            <div key={idx} className="rounded-xl border p-5 space-y-4 bg-card">
              <Skeleton className="h-6 w-3/4 rounded" />
              <Skeleton className="h-4 w-1/2 rounded" />
              <Skeleton className="h-10 w-full rounded" />
              <Skeleton className="h-8 w-1/3 rounded" />
            </div>
          ))}
        </div>
      ) : filteredSlabs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-card shadow-2xs space-y-4">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-xs">
            <Bus className="size-7" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-foreground">
              {search || statusFilter !== "all" || vehicleFilter !== "all"
                ? "No matching distance slabs found"
                : "No transportation fee slabs configured yet"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-md mx-auto">
              {search || statusFilter !== "all" || vehicleFilter !== "all"
                ? "Try clearing your search query or changing filters to see more results."
                : "Set up distance-based transportation charges so students can be enrolled with appropriate bus/van slabs."}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {slabs.length === 0 ? (
              <>
                <Button onClick={handleSeedDefaults} disabled={seeding} className="gap-2 text-xs">
                  {seeding ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  Load Standard Slabs (Zone A – Zone E)
                </Button>
                <Button variant="outline" onClick={handleOpenCreate} className="gap-2 text-xs">
                  <Plus className="size-4" />
                  Create Custom Slab
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("all");
                  setVehicleFilter("all");
                }}
                className="text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSlabs.map((slab) => {
            const distanceSpan = slab.max_km - slab.min_km;
            const oneWayRate =
              slab.one_way_discount_percent > 0
                ? Math.round(slab.monthly_fee * (1 - slab.one_way_discount_percent / 100))
                : slab.monthly_fee;

            return (
              <div
                key={slab.id}
                className={cn(
                  "rounded-xl border bg-card p-5 shadow-xs transition-all duration-200 hover:shadow-md flex flex-col justify-between gap-4 relative overflow-hidden",
                  !slab.is_active && "opacity-65 bg-muted/20 border-dashed"
                )}
              >
                {/* Visual top accent bar */}
                <div
                  className={cn(
                    "absolute top-0 left-0 right-0 h-1",
                    slab.is_active ? "bg-primary" : "bg-muted"
                  )}
                />

                <div className="space-y-3 pt-1">
                  {/* Header with Distance Badge and Actions */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                          <Navigation className="size-3" />
                          {slab.min_km} km – {slab.max_km} km
                        </span>
                        <span className="text-[11px] text-muted-foreground font-medium">
                          ({distanceSpan} km span)
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-foreground leading-snug">
                        {slab.slab_name}
                      </h3>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleOpenEdit(slab)}
                        title="Edit Slab"
                        className="size-8 cursor-pointer text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => setDeletingSlab(slab)}
                        title="Delete Slab"
                        className="size-8 cursor-pointer text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Visual KM Range Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Distance Range</span>
                      <span className="font-semibold text-foreground">{slab.min_km} to {slab.max_km} km</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted/60 overflow-hidden flex">
                      <div
                        className="h-full bg-primary/25 rounded-l-full"
                        style={{ width: `${Math.min(100, (slab.min_km / 50) * 100)}%` }}
                      />
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{
                          width: `${Math.max(8, Math.min(100, ((slab.max_km - slab.min_km) / 50) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="rounded-lg bg-muted/30 border border-border/70 p-3 space-y-2 text-xs">
                    <div className="flex items-baseline justify-between">
                      <span className="text-muted-foreground font-medium">Monthly Charge:</span>
                      <span className="text-base font-extrabold text-primary">
                        ₹{slab.monthly_fee.toLocaleString("en-IN")}<span className="text-xs font-normal text-muted-foreground">/mo</span>
                      </span>
                    </div>

                    {slab.quarterly_fee ? (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Quarterly Option:</span>
                        <span className="font-medium text-foreground">
                          ₹{slab.quarterly_fee.toLocaleString("en-IN")}
                        </span>
                      </div>
                    ) : null}

                    {slab.annual_fee ? (
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>Annual Option:</span>
                        <span className="font-medium text-foreground">
                          ₹{slab.annual_fee.toLocaleString("en-IN")}
                        </span>
                      </div>
                    ) : null}

                    {slab.one_way_discount_percent > 0 && (
                      <div className="flex items-center justify-between text-[11px] pt-1 border-t border-border/50 text-emerald-600 dark:text-emerald-400 font-medium">
                        <span>One-Way Commute ({slab.one_way_discount_percent}% off):</span>
                        <span>₹{oneWayRate.toLocaleString("en-IN")}/mo</span>
                      </div>
                    )}
                  </div>

                  {/* Description / Route Details */}
                  {slab.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 italic">
                      “{slab.description}”
                    </p>
                  )}
                </div>

                {/* Footer status & Vehicle type */}
                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground capitalize flex items-center gap-1.5 font-medium">
                    <Bus className="size-3.5 text-primary" />
                    {slab.vehicle_type === "all" ? "All Vehicles" : `${slab.vehicle_type} only`}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleToggleActive(slab)}
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border cursor-pointer transition-colors",
                      slab.is_active
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 hover:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", slab.is_active ? "bg-emerald-500" : "bg-muted-foreground")} />
                    {slab.is_active ? "Active" : "Inactive"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Distance Slab Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Bus className="size-5 text-primary" />
              {editingSlab ? "Edit Transportation Slab" : "Add Distance Slab"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure transportation charges according to distance (KM) from school / institution.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Slab Name */}
            <div className="space-y-1.5">
              <Label htmlFor="slab-name" className="text-xs font-semibold">
                Slab / Route Name *
              </Label>
              <Input
                id="slab-name"
                value={slabName}
                onChange={(e) => setSlabName(e.target.value)}
                placeholder="e.g. Zone A — Local Radius (0–5 km)"
                className="h-10 text-sm"
              />
              {/* Quick suggestion pills */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px]">
                <span className="text-muted-foreground">Suggestions:</span>
                {["Zone A (0–5 km)", "Zone B (5–10 km)", "Zone C (10–20 km)", "City Outskirts", "Express Highway"].map((sugg) => (
                  <button
                    key={sugg}
                    type="button"
                    onClick={() => setSlabName(sugg)}
                    className="px-2 py-0.5 rounded border border-border bg-muted/30 hover:bg-muted text-[11px] font-medium text-foreground cursor-pointer transition-colors"
                  >
                    {sugg}
                  </button>
                ))}
              </div>
            </div>

            {/* KM Range: Min KM & Max KM */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="slab-min-km" className="text-xs font-semibold">
                  Minimum Distance (KM) *
                </Label>
                <InputGroup>
                  <InputGroupInput
                    id="slab-min-km"
                    type="number"
                    min="0"
                    step="0.5"
                    value={minKm}
                    onChange={(e) => setMinKm(e.target.value)}
                    placeholder="0"
                  />
                  <InputGroupAddon>km</InputGroupAddon>
                </InputGroup>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slab-max-km" className="text-xs font-semibold">
                  Maximum Distance (KM) *
                </Label>
                <InputGroup>
                  <InputGroupInput
                    id="slab-max-km"
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={maxKm}
                    onChange={(e) => setMaxKm(e.target.value)}
                    placeholder="5"
                  />
                  <InputGroupAddon>km</InputGroupAddon>
                </InputGroup>
              </div>
            </div>

            {/* Visual Range Indicator Preview */}
            <div className="rounded-lg bg-muted/40 border p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between font-medium">
                <span className="text-muted-foreground">Range Span:</span>
                <span className="text-primary font-bold">
                  {Math.max(0, (Number(maxKm) || 0) - (Number(minKm) || 0))} Kilometers
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Applies to students residing between <span className="font-semibold text-foreground">{minKm || 0} km</span> and <span className="font-semibold text-foreground">{maxKm || 0} km</span> from the campus.
              </p>
            </div>

            {/* Monthly Fee */}
            <div className="space-y-1.5">
              <Label htmlFor="slab-monthly-fee" className="text-xs font-semibold">
                Monthly Transportation Fee *
              </Label>
              <InputGroup>
                <InputGroupAddon>₹</InputGroupAddon>
                <InputGroupInput
                  id="slab-monthly-fee"
                  type="number"
                  min="0"
                  step="50"
                  value={monthlyFee}
                  onChange={(e) => {
                    const val = e.target.value;
                    setMonthlyFee(val);
                    if (val && !Number.isNaN(Number(val))) {
                      const m = Number(val);
                      if (!quarterlyFee) setQuarterlyFee(String(Math.round(m * 3 * 0.95)));
                      if (!annualFee) setAnnualFee(String(Math.round(m * 12 * 0.9)));
                    }
                  }}
                  placeholder="e.g. 800"
                />
                <InputGroupAddon>/ month</InputGroupAddon>
              </InputGroup>
            </div>

            {/* Optional Quarterly and Annual Fee Overrides */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="slab-quarterly-fee" className="text-xs font-semibold">
                  Quarterly Fee <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <InputGroup>
                  <InputGroupAddon>₹</InputGroupAddon>
                  <InputGroupInput
                    id="slab-quarterly-fee"
                    type="number"
                    min="0"
                    step="100"
                    value={quarterlyFee}
                    onChange={(e) => setQuarterlyFee(e.target.value)}
                    placeholder="e.g. 2250"
                  />
                </InputGroup>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slab-annual-fee" className="text-xs font-semibold">
                  Annual Fee <span className="text-muted-foreground font-normal">(Optional)</span>
                </Label>
                <InputGroup>
                  <InputGroupAddon>₹</InputGroupAddon>
                  <InputGroupInput
                    id="slab-annual-fee"
                    type="number"
                    min="0"
                    step="100"
                    value={annualFee}
                    onChange={(e) => setAnnualFee(e.target.value)}
                    placeholder="e.g. 8500"
                  />
                </InputGroup>
              </div>
            </div>

            {/* One-way discount & Vehicle Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="slab-discount" className="text-xs font-semibold">
                  One-Way Discount %
                </Label>
                <InputGroup>
                  <InputGroupInput
                    id="slab-discount"
                    type="number"
                    min="0"
                    max="100"
                    step="5"
                    value={oneWayDiscount}
                    onChange={(e) => setOneWayDiscount(e.target.value)}
                    placeholder="25"
                  />
                  <InputGroupAddon>%</InputGroupAddon>
                </InputGroup>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slab-vehicle" className="text-xs font-semibold">
                  Vehicle Type
                </Label>
                <Select value={vehicleType} onValueChange={setVehicleType}>
                  <SelectTrigger id="slab-vehicle" className="h-10 text-xs">
                    <SelectValue placeholder="Vehicle Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {VEHICLE_TYPES.map((vt) => (
                      <SelectItem key={vt.value} value={vt.value}>
                        {vt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description / Route Coverage */}
            <div className="space-y-1.5">
              <Label htmlFor="slab-desc" className="text-xs font-semibold">
                Route Description & Key Landmarks
              </Label>
              <Textarea
                id="slab-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Covering Main Highway, Sector 12, Green City Market, and Railway Colony."
                rows={2}
                className="text-xs"
              />
            </div>

            {/* Active Switch */}
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
              <div className="space-y-0.5">
                <Label htmlFor="slab-active-switch" className="text-xs font-semibold cursor-pointer">
                  Active in Student Enrollment
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  When enabled, this slab will appear in the Class Assignment Transportation dropdown.
                </p>
              </div>
              <input
                id="slab-active-switch"
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 accent-primary cursor-pointer"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSlab} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="size-4 animate-spin" /> : null}
              {editingSlab ? "Save Changes" : "Create Distance Slab"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingSlab} onOpenChange={(open) => !open && setDeletingSlab(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600 font-bold">
              <AlertCircle className="size-5" />
              Delete Distance Slab
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to delete <span className="font-semibold text-foreground">"{deletingSlab?.slab_name}"</span> ({deletingSlab?.min_km}–{deletingSlab?.max_km} km)?
              Students currently enrolled in this slab will retain their existing fee records.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletingSlab(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteSlab}
              disabled={deleting}
              className="gap-1.5"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
              Delete Slab
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
