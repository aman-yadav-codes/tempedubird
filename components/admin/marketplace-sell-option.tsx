"use client";

import { ShoppingBag, Sparkles, IndianRupee, Tag } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MarketplaceSellOptionProps {
  sellOnMarketplace: boolean;
  onSellOnMarketplaceChange: (val: boolean) => void;
  marketplacePrice: number | string;
  onMarketplacePriceChange: (val: number | string) => void;
  title?: string;
  description?: string;
  priceLabel?: string;
  pricePlaceholder?: string;
  className?: string;
}

export function MarketplaceSellOption({
  sellOnMarketplace,
  onSellOnMarketplaceChange,
  marketplacePrice,
  onMarketplacePriceChange,
  title = "Sell on Marketplace",
  description = "Publish this item to the national EduBird public marketplace for learners across India.",
  priceLabel = "Selling Charges / Marketplace Price (₹)",
  pricePlaceholder = "Enter charges (e.g. 0 for Free or 499)",
  className,
}: MarketplaceSellOptionProps) {
  const numericPrice = Number(marketplacePrice) || 0;
  const isFree = numericPrice === 0;

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all p-4 space-y-3.5",
        sellOnMarketplace
          ? "border-rose-500/40 bg-gradient-to-br from-rose-50/60 via-amber-50/30 to-background dark:from-rose-950/20 dark:via-zinc-900/50 shadow-xs"
          : "border-border bg-muted/20",
        className
      )}
    >
      {/* Top Toggle Row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "h-9 w-9 rounded-xl flex items-center justify-center transition-colors",
              sellOnMarketplace
                ? "bg-rose-600 text-white shadow-sm shadow-rose-600/20"
                : "bg-muted text-muted-foreground"
            )}
          >
            <ShoppingBag className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label className="text-xs sm:text-sm font-extrabold text-foreground cursor-pointer">
                {title}
              </Label>
              {sellOnMarketplace && (
                <Badge className="bg-rose-600 text-white text-[9px] font-bold px-1.5 py-0.2">
                  Marketplace Active
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
              {description}
            </p>
          </div>
        </div>

        <Switch
          checked={sellOnMarketplace}
          onCheckedChange={onSellOnMarketplaceChange}
        />
      </div>

      {/* Conditional Price Input when Sell On Marketplace is Yes */}
      {sellOnMarketplace && (
        <div className="pt-2 border-t border-rose-200/60 dark:border-rose-900/40 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-rose-600" />
              <span>{priceLabel}</span>
            </Label>

            {/* Free vs Paid Quick Badge Indicator */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-muted-foreground">Listing Type:</span>
              {isFree ? (
                <span className="font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  Free Access (₹0)
                </span>
              ) : (
                <span className="font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                  Chargeable (₹{numericPrice})
                </span>
              )}
            </div>
          </div>

          <div className="relative">
            <span className="absolute left-3.5 top-2.5 text-muted-foreground font-bold text-xs flex items-center">
              ₹
            </span>
            <Input
              type="number"
              min={0}
              placeholder={pricePlaceholder}
              value={marketplacePrice === 0 ? "" : marketplacePrice}
              onChange={(e) => {
                const val = e.target.value === "" ? 0 : Number(e.target.value);
                onMarketplacePriceChange(val);
              }}
              className="pl-8 text-xs font-semibold h-10 bg-background border-rose-200/80 dark:border-rose-900/60 focus-visible:ring-rose-500"
            />
          </div>

          <p className="text-[10px] text-muted-foreground">
            💡 Tip: Enter <strong className="text-foreground">0</strong> to offer this as Free for all students, or enter the amount you want to charge on the EduBird marketplace.
          </p>
        </div>
      )}
    </div>
  );
}
