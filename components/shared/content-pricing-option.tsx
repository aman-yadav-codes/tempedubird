"use client";

import { IndianRupee, Gift, Tag, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ContentPricingOptionProps {
  isPaid: boolean;
  onIsPaidChange: (val: boolean) => void;
  price: number | string;
  onPriceChange: (val: number | string) => void;
  label?: string;
  description?: string;
  className?: string;
}

export function ContentPricingOption({
  isPaid,
  onIsPaidChange,
  price,
  onPriceChange,
  label = "Content Pricing",
  description = "Choose whether this content is offered for Free or as Paid with specified charges.",
  className,
}: ContentPricingOptionProps) {
  const numericPrice = Number(price) || 0;

  return (
    <div
      className={cn(
        "rounded-2xl border transition-all p-4 space-y-3.5 bg-card/60 shadow-2xs",
        isPaid
          ? "border-rose-500/40 bg-gradient-to-br from-rose-50/50 via-background to-amber-50/20 dark:from-rose-950/20 dark:via-background"
          : "border-emerald-500/30 bg-gradient-to-br from-emerald-50/40 via-background to-background dark:from-emerald-950/20 dark:via-background",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Label className="text-sm font-bold text-foreground flex items-center gap-1.5">
              <Tag className="h-4 w-4 text-primary" />
              {label}
            </Label>
            {isPaid ? (
              <Badge className="bg-rose-600 hover:bg-rose-600 text-white text-[10px] font-bold">
                Paid (₹{numericPrice})
              </Badge>
            ) : (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-bold">
                Free
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>

        {/* Free / Paid Toggle Buttons */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/70 shrink-0">
          <button
            type="button"
            onClick={() => {
              onIsPaidChange(false);
              onPriceChange(0);
            }}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
              !isPaid
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Gift className="h-3.5 w-3.5" />
            Free
          </button>

          <button
            type="button"
            onClick={() => {
              onIsPaidChange(true);
              if (numericPrice === 0) onPriceChange(199);
            }}
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all",
              isPaid
                ? "bg-rose-600 text-white shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <IndianRupee className="h-3.5 w-3.5" />
            Paid
          </button>
        </div>
      </div>

      {/* When Paid is active: Cost Input */}
      {isPaid && (
        <div className="pt-3 border-t border-rose-200/60 dark:border-rose-900/40 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <IndianRupee className="h-3.5 w-3.5 text-rose-600" />
              <span>Cost / Price (₹) *</span>
            </Label>
            <span className="text-[11px] text-muted-foreground">
              Enter amount in INR that will be charged for access
            </span>
          </div>

          <div className="relative max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground font-bold text-sm">
              ₹
            </div>
            <Input
              type="number"
              min="1"
              step="1"
              value={price}
              onChange={(e) => onPriceChange(e.target.value)}
              placeholder="e.g. 199, 499, 999"
              className="pl-7 bg-background font-bold text-sm h-10 border-rose-300 dark:border-rose-800 focus-visible:ring-rose-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}
