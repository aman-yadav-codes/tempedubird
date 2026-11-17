"use client";

import React, { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
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
    <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
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
        <div className="pl-1 border-l border-white/20 text-[11px] font-extrabold uppercase">
          Checkout →
        </div>
      </button>
    </div>
  );
}

