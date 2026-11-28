"use client";

import React, { useEffect, useState } from "react";
import { ShoppingCart, ArrowRight } from "lucide-react";
import { useCartStore } from "@/store";

export function CartFloatingButton() {
  const { getTotalCount, getTotalAmount, toggleCart } = useCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const totalCount = getTotalCount();
  const totalAmount = getTotalAmount();

  if (totalCount === 0) return null;

  return (
    <>
      {/* Mobile: Sleek Docked Bottom Checkout Bar */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-slate-800 px-4 py-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] shadow-[0_-4px_25px_rgba(0,0,0,0.12)] flex items-center justify-between sm:hidden animate-in slide-in-from-bottom duration-300">
        <button
          type="button"
          onClick={toggleCart}
          className="flex items-center gap-3 text-left cursor-pointer select-none group"
          title="View Cart Items"
        >
          <div className="relative flex items-center justify-center size-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 transition-transform group-hover:scale-105 group-active:scale-95">
            <ShoppingCart className="size-5" />
            <span className="absolute -top-1 -right-1 size-5 rounded-full bg-rose-600 text-white text-[10px] font-black flex items-center justify-center shadow-xs">
              {totalCount}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-muted-foreground leading-tight">
              {totalCount} {totalCount === 1 ? "item" : "items"} in cart
            </span>
            <span className="text-sm font-black text-foreground tracking-tight">₹{totalAmount}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={toggleCart}
          className="flex items-center gap-2 h-10 px-5 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-extrabold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
          title="Proceed to Checkout"
        >
          <span>View Cart &amp; Checkout</span>
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      {/* Desktop / Tablet: Floating Action Button */}
      <div className="hidden sm:block fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          type="button"
          onClick={toggleCart}
          className="flex items-center gap-3 px-4 py-3 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-rose-500/20"
          title="View Cart & Checkout"
        >
          <div className="relative">
            <ShoppingCart className="size-5" />
            <span className="absolute -top-2 -right-2.5 size-5 rounded-full bg-white text-rose-700 text-[10px] font-black flex items-center justify-center shadow-md">
              {totalCount}
            </span>
          </div>
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-white/80 uppercase font-semibold tracking-wider">
              Cart ({totalCount})
            </span>
            <span className="text-xs font-black">₹{totalAmount}</span>
          </div>
          <div className="pl-1 border-l border-white/20 text-[11px] font-extrabold uppercase flex items-center gap-1">
            <span>Checkout</span>
            <ArrowRight className="size-3" />
          </div>
        </button>
      </div>
    </>
  );
}

