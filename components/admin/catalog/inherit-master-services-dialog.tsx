"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Briefcase,
  Search,
  CheckCircle2,
  Loader2,
  IndianRupee,
  Layers,
  Clock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useBusinessCurrency } from "@/hooks/use-business-currency";

export interface MasterServiceItem {
  id: number;
  name: string;
  slug: string;
  category_id?: number | null;
  category_name?: string;
  description?: string | null;
  default_image_url?: string | null;
  pricing_model?: string;
  duration_minutes?: number;
  duration_unit?: string;
  suggested_price: number;
  already_inherited: boolean;
}

interface InheritMasterServicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  accessToken?: string | null;
}

export function InheritMasterServicesDialog({
  open,
  onOpenChange,
  onSuccess,
  accessToken,
}: InheritMasterServicesDialogProps) {
  const { currencySymbol, currencyCode } = useBusinessCurrency();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [services, setServices] = useState<MasterServiceItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [customPrices, setCustomPrices] = useState<Record<number, string>>({});

  // Fetch master services available for inheritance
  const fetchMasterServices = async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/catalog/services/inherit", { headers });
      const data = await res.json();

      if (data.success && Array.isArray(data.services)) {
        setServices(data.services);
      } else {
        toast.error(data.error || "Failed to load master services");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load master services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchMasterServices();
      setSelectedIds([]);
      setCustomPrices({});
      setSearch("");
      setSelectedCategoryId("all");
    }
  }, [open]);

  // Extract unique categories
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    services.forEach((s) => {
      const name = s.category_name || "General";
      map.set(name, name);
    });
    return Array.from(map.values()).sort();
  }, [services]);

  // Filtered list
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchSearch =
        !search.trim() ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(search.toLowerCase())) ||
        (s.pricing_model && s.pricing_model.toLowerCase().includes(search.toLowerCase()));

      const matchCategory =
        selectedCategoryId === "all" || (s.category_name || "General") === selectedCategoryId;

      return matchSearch && matchCategory;
    });
  }, [services, search, selectedCategoryId]);

  const availableToInherit = useMemo(() => {
    return filteredServices.filter((s) => !s.already_inherited);
  }, [filteredServices]);

  const handleToggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    const uninheritedIds = availableToInherit.map((s) => s.id);
    const allSelected = uninheritedIds.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !uninheritedIds.includes(id)));
    } else {
      setSelectedIds((prev) => Array.from(new Set([...prev, ...uninheritedIds])));
    }
  };

  const handlePriceChange = (id: number, val: string) => {
    setCustomPrices((prev) => ({ ...prev, [id]: val }));
  };

  const handleInheritSubmit = async () => {
    if (selectedIds.length === 0) {
      toast.error("Please select at least one service to inherit");
      return;
    }

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const parsedPrices: Record<number, number> = {};
      Object.entries(customPrices).forEach(([id, priceStr]) => {
        const num = parseFloat(priceStr);
        if (!isNaN(num) && num > 0) {
          parsedPrices[Number(id)] = num;
        }
      });

      const res = await fetch("/api/admin/catalog/services/inherit", {
        method: "POST",
        headers,
        body: JSON.stringify({
          master_service_ids: selectedIds,
          custom_prices: parsedPrices,
          currency: currencyCode || "INR",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to inherit master services");
      }

      toast.success(data.message || `Successfully inherited ${selectedIds.length} services!`);
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err.message || "Failed to inherit services");
    } finally {
      setSubmitting(false);
    }
  };

  const formatPricingModel = (model?: string) => {
    if (!model) return "Fixed Price";
    return model
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        {/* HEADER */}
        <div className="p-5 pb-4 border-b border-border bg-card">
          <div className="flex items-center gap-2.5">
            <div className="size-9 rounded-xl bg-sky-500/10 text-sky-600 flex items-center justify-center shrink-0">
              <Layers className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                Inherit Services from Master Catalog
                <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider">
                  Master Repository
                </Badge>
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Browse pre-configured master services and inherit them into your service portfolio with benchmark or custom pricing.
              </DialogDescription>
            </div>
          </div>

          {/* SEARCH & FILTER CONTROLS */}
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search services by title, model, keywords..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
            <div className="flex items-center gap-2">
              <select
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                className="h-9 px-3 text-xs rounded-xl border border-input bg-background font-medium"
              >
                <option value="all">All Categories ({services.length})</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>

              {availableToInherit.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="h-9 text-xs font-bold rounded-xl whitespace-nowrap"
                >
                  {availableToInherit.every((s) => selectedIds.includes(s.id))
                    ? "Deselect All"
                    : "Select All"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* LIST AREA */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-muted/20">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="size-6 animate-spin text-sky-600" />
              <span className="text-xs font-semibold">Loading master services...</span>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="py-16 text-center space-y-2 bg-card rounded-2xl border border-dashed border-border p-6">
              <Briefcase className="size-10 text-muted-foreground/40 mx-auto" />
              <h4 className="text-sm font-bold text-foreground">No matching master services</h4>
              <p className="text-xs text-muted-foreground">
                Try clearing your search query or choosing another category filter.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredServices.map((s) => {
                const isSelected = selectedIds.includes(s.id);
                const isInherited = s.already_inherited;

                return (
                  <div
                    key={s.id}
                    className={`relative flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                      isInherited
                        ? "bg-muted/40 border-border opacity-70"
                        : isSelected
                        ? "bg-sky-500/5 border-sky-500 shadow-xs ring-1 ring-sky-500/20"
                        : "bg-card border-border hover:border-sky-500/40 hover:shadow-2xs"
                    }`}
                  >
                    {/* CHECKBOX */}
                    <div className="pt-0.5">
                      <Checkbox
                        checked={isInherited || isSelected}
                        disabled={isInherited}
                        onCheckedChange={() => handleToggleSelect(s.id)}
                        className="rounded-md"
                      />
                    </div>

                    {/* THUMBNAIL */}
                    <div className="relative size-14 rounded-xl overflow-hidden bg-muted shrink-0 border border-border/60">
                      {s.default_image_url ? (
                        <Image
                          src={s.default_image_url}
                          alt={s.name}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="size-full flex items-center justify-center text-muted-foreground/50">
                          <Briefcase className="size-6" />
                        </div>
                      )}
                    </div>

                    {/* DETAILS */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-foreground truncate block max-w-[200px]" title={s.name}>
                          {s.name}
                        </span>
                        {isInherited && (
                          <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300">
                            <CheckCircle2 className="size-3 mr-0.5" /> Added
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground flex-wrap">
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium">
                          {s.category_name || "General"}
                        </Badge>
                        <span>• {formatPricingModel(s.pricing_model)}</span>
                        {s.duration_minutes ? (
                          <span className="flex items-center gap-0.5">
                            • <Clock className="size-2.5" /> {s.duration_minutes}m
                          </span>
                        ) : null}
                      </div>

                      {/* BENCHMARK PRICE & CUSTOM PRICE */}
                      <div className="flex items-center gap-3 pt-1">
                        <div className="text-xs">
                          <span className="text-[10px] text-muted-foreground block">Benchmark:</span>
                          <span className="font-bold text-foreground flex items-center text-xs">
                            <span className="mr-0.5">{currencySymbol}</span>
                            {s.suggested_price || 0}
                          </span>
                        </div>

                        {!isInherited && isSelected && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-semibold text-sky-600">Your Price:</span>
                            <div className="relative w-24">
                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground pointer-events-none">
                                {currencySymbol}
                              </span>
                              <Input
                                type="number"
                                placeholder={String(s.suggested_price || 0)}
                                value={customPrices[s.id] ?? ""}
                                onChange={(e) => handlePriceChange(s.id, e.target.value)}
                                className="h-7 pl-5 pr-1 text-xs rounded-lg font-bold"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-border bg-card flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {selectedIds.length > 0 ? (
              <span className="font-bold text-sky-600">
                {selectedIds.length} service{selectedIds.length === 1 ? "" : "s"} selected for inheritance
              </span>
            ) : (
              <span>Select services to add to your catalog</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
              className="h-9 px-4 text-xs font-semibold rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleInheritSubmit}
              disabled={submitting || selectedIds.length === 0}
              className="h-9 px-4 text-xs font-bold rounded-xl gap-1.5 bg-sky-600 hover:bg-sky-700 text-white shadow-sm"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Inheriting...
                </>
              ) : (
                <>
                  <Layers className="size-3.5" />
                  Inherit Selected ({selectedIds.length})
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
