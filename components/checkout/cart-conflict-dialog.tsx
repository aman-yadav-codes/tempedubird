"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, ShoppingBag, AlertTriangle, ArrowDown } from "lucide-react";
import { useCartStore } from "@/store";
import { toast } from "sonner";

export function CartConflictDialog() {
  const { conflict, resolveConflict, items } = useCartStore();

  if (!conflict || !conflict.isOpen) return null;

  const currentCount = items.length;
  const isTypeConflict = conflict.reason === "type" || conflict.reason === "both";
  const isStoreConflict = conflict.reason === "store" || conflict.reason === "both";

  const handleConfirm = () => {
    const newStore = conflict.newStoreName;
    const oldStore = conflict.currentStoreName;
    const pendingName = conflict.pendingItem?.name;

    resolveConflict("replace");

    if (pendingName) {
      toast.success(`Cart replaced! Added ${pendingName} from ${newStore}.`);
    } else {
      toast.success(`Cart cleared of previous items from ${oldStore}.`);
    }
  };

  const handleCancel = () => {
    resolveConflict("cancel");
    toast.info(`Kept items from ${conflict.currentStoreName} in cart.`);
  };

  return (
    <Dialog open={conflict.isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="w-[94vw] max-w-md p-0 overflow-hidden rounded-2xl border shadow-2xl gap-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-600 to-rose-600 text-white p-4 sm:p-5 pr-10">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0 shadow-inner">
              <AlertTriangle className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold text-white line-clamp-1">
                {isTypeConflict && isStoreConflict
                  ? "Switch Store & Category?"
                  : isTypeConflict
                  ? "Switch Category (Product vs Service)?"
                  : "Replace Items from Another Store?"}
              </h3>
              <p className="text-[11px] text-white/80 line-clamp-1">
                Single Front Store &amp; Single Category Policy
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3.5 text-xs">
          <p className="text-muted-foreground leading-relaxed break-words">
            {isTypeConflict && isStoreConflict ? (
              <>
                Your cart currently contains{" "}
                <strong className="text-foreground">
                  {currentCount} {conflict.currentType === "product" ? "product(s)" : "service(s)"}
                </strong>{" "}
                from <strong className="text-foreground">{conflict.currentStoreName}</strong>. At a
                time, you can only order from <strong>one front store</strong> and{" "}
                <strong>one category</strong>.
              </>
            ) : isTypeConflict ? (
              <>
                Your cart currently contains{" "}
                <strong className="text-foreground">
                  {conflict.currentType === "product" ? "products" : "services"}
                </strong>
                . At a time, you can either buy products or book services, but cannot mix them
                together in the same order.
              </>
            ) : (
              <>
                Your cart currently contains items from{" "}
                <strong className="text-foreground">{conflict.currentStoreName}</strong>. You can
                only order from <strong>one front store</strong> at a time.
              </>
            )}
          </p>

          {/* Clean Stacked Comparison Card */}
          <div className="rounded-xl border bg-muted/30 p-3.5 space-y-2.5">
            {/* 1. Currently in Cart */}
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="size-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5 text-muted-foreground border">
                <ShoppingBag className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                  Currently in Cart ({currentCount} item{currentCount === 1 ? "" : "s"})
                </span>
                <p className="text-xs font-bold text-foreground break-words line-clamp-1">
                  {conflict.currentStoreName}
                </p>
                <span className="text-[10px] text-muted-foreground capitalize">
                  Category: {conflict.currentType === "product" ? "Products" : "Services"}
                </span>
              </div>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-2 text-muted-foreground py-0.5">
              <div className="h-px bg-border flex-1" />
              <div className="size-5 rounded-full bg-background border flex items-center justify-center text-[10px] text-muted-foreground shadow-2xs">
                <ArrowDown className="size-3" />
              </div>
              <div className="h-px bg-border flex-1" />
            </div>

            {/* 2. New Selection */}
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="size-7 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 border border-rose-500/20">
                <Store className="size-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
                  New Selection
                </span>
                <p className="text-xs font-bold text-foreground break-words line-clamp-2">
                  {conflict.pendingItem?.name ||
                    `${conflict.newType === "product" ? "Product" : "Service"} Booking`}
                </p>
                <span className="text-[11px] text-muted-foreground block mt-0.5">
                  Store: <strong className="text-foreground">{conflict.newStoreName}</strong>
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground break-words leading-relaxed">
            Would you like to remove the previously added items from{" "}
            <strong className="text-foreground">{conflict.currentStoreName}</strong> and proceed with{" "}
            <strong className="text-foreground">{conflict.newStoreName}</strong>?
          </p>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t bg-muted/20 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="h-9 text-xs font-semibold cursor-pointer"
          >
            Keep Existing Cart
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirm}
            className="h-9 bg-[#d9232e] hover:bg-[#d9232e]/90 text-white font-bold text-xs px-4 cursor-pointer shadow-xs shrink-0"
          >
            Clear Cart &amp; Add New
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
