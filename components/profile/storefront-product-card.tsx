"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Plus, Minus, Sparkles, Info, ExternalLink } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Link from "next/link";
import { toast } from "sonner";
import { useAuthStore, useCartStore } from "@/store";
import { isUserStoreOwner } from "@/lib/auth/store-ownership";
import {
  isWeightBasedProduct,
  STANDARD_WEIGHT_OPTIONS,
  calculateWeightPrice,
  formatWeightPrice,
  formatGramsDisplay,
} from "@/lib/utils/weight-unit";

interface StorefrontProductCardProps {
  product: any;
  business: any;
  isHighlighted?: boolean;
}

export function StorefrontProductCard({
  product: p,
  business,
  isHighlighted = false,
}: StorefrontProductCardProps) {
  const { user } = useAuthStore();
  const { addItem, getItemQuantity, updateQuantity } = useCartStore();

  const isOwner = useMemo(() => isUserStoreOwner(user, business), [user, business]);

  const rawUnit = p.unit || p.unit_of_measurement || "unit";
  const weightMeta = useMemo(() => isWeightBasedProduct(rawUnit), [rawUnit]);

  // Default selected weight: 1kg if kg-based, 500g if 500g-based, or defaultKey
  const [selectedWeightKey, setSelectedWeightKey] = useState<string>(weightMeta.defaultKey);
  const [showCustom, setShowCustom] = useState(false);
  const [customGrams, setCustomGrams] = useState<string>("250");

  const basePrice = Number(
    (p.discounted_price !== undefined && p.discounted_price !== null && Number(p.discounted_price) > 0)
      ? p.discounted_price
      : (p.price !== undefined && p.price !== null && Number(p.price) > 0)
      ? p.price
      : (p.suggested_price_inr !== undefined && p.suggested_price_inr !== null && Number(p.suggested_price_inr) > 0)
      ? p.suggested_price_inr
      : (p.suggested_price !== undefined && p.suggested_price !== null && Number(p.suggested_price) > 0)
      ? p.suggested_price
      : (p.regular_price !== undefined && p.regular_price !== null && Number(p.regular_price) > 0)
      ? p.regular_price
      : 0
  );
  const baseRegularPrice = p.regular_price ? Number(p.regular_price) : null;

  // Calculate effective grams, price, and display unit
  const { targetGrams, displayUnit, effectivePrice, effectiveRegularPrice, cartItemId } = useMemo(() => {
    if (!weightMeta.isWeight) {
      return {
        targetGrams: 0,
        displayUnit: rawUnit,
        effectivePrice: basePrice,
        effectiveRegularPrice: baseRegularPrice,
        cartItemId: String(p.id),
      };
    }

    let grams = 1000;
    let label = "1 kg";

    if (showCustom) {
      grams = Math.max(10, Number(customGrams) || 100);
      label = formatGramsDisplay(grams);
    } else {
      const opt = STANDARD_WEIGHT_OPTIONS.find((o) => o.key === selectedWeightKey) || STANDARD_WEIGHT_OPTIONS[3];
      grams = opt.grams;
      label = opt.label;
    }

    const price = calculateWeightPrice(basePrice, weightMeta.baseGrams, grams);
    const regPrice = baseRegularPrice
      ? calculateWeightPrice(baseRegularPrice, weightMeta.baseGrams, grams)
      : null;

    // Unique cart item id per weight option so 250g and 1kg don't collide
    const cId = `${p.id}_${showCustom ? `${grams}g` : selectedWeightKey}`;

    return {
      targetGrams: grams,
      displayUnit: label,
      effectivePrice: price,
      effectiveRegularPrice: regPrice,
      cartItemId: cId,
    };
  }, [
    weightMeta,
    rawUnit,
    basePrice,
    baseRegularPrice,
    selectedWeightKey,
    showCustom,
    customGrams,
    p.id,
  ]);

  const hasDiscount = Boolean(
    effectiveRegularPrice && effectiveRegularPrice > effectivePrice
  );

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const currentCartQty = mounted ? getItemQuantity(cartItemId) : 0;

  const handleAddToCart = () => {
    if (isOwner) {
      toast.error("You cannot order products from your own storefront.");
      return;
    }

    const added = addItem(
      {
        id: cartItemId,
        name: weightMeta.isWeight ? `${p.name} (${displayUnit})` : p.name,
        price: effectivePrice,
        regular_price: effectiveRegularPrice,
        image_url: p.default_image_url,
        brand: p.brand_name || p.brand || business.name,
        unit: displayUnit,
        business_id: business.id,
        business_name: business.name,
        business_slug: business.slug,
        institution_id: business.institution_profile_id,
        item_type: "product",
      },
      1
    );
    if (added) {
      toast.success(`${p.name} (${displayUnit}) added to cart!`);
    }
  };

  return (
    <Card
      id={`highlight-item-${p.id}`}
      className={`rounded-2xl border transition-all flex flex-col justify-between overflow-hidden group ${
        isHighlighted
          ? "ring-2 ring-primary border-primary shadow-xl bg-primary/5"
          : "shadow-xs hover:shadow-md"
      }`}
    >
      <div>
        {/* Image Box */}
        <Link href={`/products/${p.slug || p.id}`} className="block cursor-pointer">
          <div className="relative aspect-square w-full bg-muted overflow-hidden">
            <Image
              src={
                p.default_image_url ||
                "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=500&auto=format&fit=crop&q=60"
              }
              alt={p.name}
              fill
              sizes="(max-width: 768px) 100vw, 300px"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
            {hasDiscount && (
              <Badge className="absolute top-2.5 left-2.5 bg-rose-600 text-white font-black text-[10px] px-2 py-0.5 shadow-sm">
                SALE
              </Badge>
            )}
            {isHighlighted && (
              <Badge className="absolute top-2.5 right-2.5 bg-primary text-primary-foreground font-bold text-[10px] px-2 py-0.5 shadow-md flex items-center gap-1">
                <Sparkles className="size-3" />
                Selected
              </Badge>
            )}
          </div>
        </Link>

        {/* Card Header & Title */}
        <CardHeader className="p-3.5 pb-1">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span>{p.brand_name || p.brand || business.name}</span>
            {p.category_name && (
              <>
                <span>•</span>
                <span className="truncate">{p.category_name}</span>
              </>
            )}
          </div>
          <Link href={`/products/${p.slug || p.id}`} className="block cursor-pointer">
            <CardTitle className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2">
              {p.name}
            </CardTitle>
          </Link>
        </CardHeader>

        {p.description && (
          <CardContent className="p-3.5 pt-0 pb-2 text-xs text-muted-foreground line-clamp-2">
            {p.description}
          </CardContent>
        )}
      </div>

      <div>
        {/* WEIGHT & PACK SELECTOR (for products priced in KG or weight units) */}
        {weightMeta.isWeight && (
          <div className="px-3.5 pb-2 pt-1 border-t border-dashed border-border/70 space-y-1.5 bg-muted/20">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-bold text-muted-foreground">Order Quantity:</span>
              <span className="font-extrabold text-foreground bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded text-[11px] border border-rose-200 dark:border-rose-900">
                {displayUnit}
              </span>
            </div>

            <div className="flex items-center gap-1 flex-wrap">
              {STANDARD_WEIGHT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    setSelectedWeightKey(opt.key);
                    setShowCustom(false);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                    selectedWeightKey === opt.key && !showCustom
                      ? "bg-rose-600 text-white shadow-2xs"
                      : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
                  }`}
                >
                  {opt.shortLabel}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowCustom(!showCustom)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  showCustom
                    ? "bg-rose-600 text-white shadow-2xs"
                    : "bg-background hover:bg-muted text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                Custom g
              </button>
            </div>

            {showCustom && (
              <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-background border border-border text-xs mt-1">
                <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
                  Grams:
                </span>
                <input
                  type="number"
                  min="10"
                  step="50"
                  placeholder="e.g. 350"
                  value={customGrams}
                  onChange={(e) => setCustomGrams(e.target.value)}
                  className="w-20 h-6 text-xs px-1.5 rounded border bg-background font-mono font-bold"
                />
                <span className="text-[11px] font-bold text-rose-600 shrink-0">
                  = ₹{formatWeightPrice(effectivePrice)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Card Footer: Price & Add to Cart / Quantity controls */}
        <CardFooter className="p-3.5 pt-2 border-t flex items-center justify-between gap-2 bg-muted/10">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-base font-black text-foreground">
                {effectivePrice > 0 ? `₹${formatWeightPrice(effectivePrice)}` : "Enquire"}
              </span>
              <span className="text-xs font-bold text-muted-foreground">
                / {displayUnit}
              </span>
              {hasDiscount && (
                <span className="text-xs text-muted-foreground line-through">
                  ₹{formatWeightPrice(effectiveRegularPrice!)}
                </span>
              )}
            </div>
            <span className="text-[10px] text-emerald-600 font-semibold block">
              Available In Stock
            </span>
          </div>

          {isOwner ? (
            <Badge variant="outline" className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30 px-2.5 py-1">
              Store Owner View
            </Badge>
          ) : currentCartQty > 0 ? (
            <div className="flex items-center border border-rose-300 dark:border-rose-900 rounded-xl overflow-hidden bg-background shadow-2xs h-8">
              <button
                type="button"
                onClick={() => updateQuantity(cartItemId, currentCartQty - 1)}
                className="size-8 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Decrease quantity"
              >
                <Minus className="size-3" />
              </button>
              <span className="w-8 text-center text-xs font-black text-rose-600">
                {currentCartQty}
              </span>
              <button
                type="button"
                onClick={() => updateQuantity(cartItemId, currentCartQty + 1)}
                className="size-8 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title="Increase quantity"
              >
                <Plus className="size-3" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="size-8 rounded-full hover:bg-muted text-muted-foreground hover:text-primary flex items-center justify-center transition-colors cursor-pointer border border-border/60 hover:border-primary/50 shadow-2xs"
                    title="Click to view short description"
                    aria-label="Short description"
                  >
                    <Info className="size-4" />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3 text-xs rounded-xl shadow-xl border bg-background" side="top">
                  <div className="space-y-2">
                    <div className="font-bold text-foreground text-xs line-clamp-1 border-b pb-1.5 flex items-center justify-between">
                      <span>{p.name}</span>
                      <span className="text-[10px] text-rose-600 font-extrabold">₹{formatWeightPrice(effectivePrice)}</span>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed">
                      {p.description || "Fresh and genuine product directly from store inventory."}
                    </p>
                    <div className="pt-1 border-t flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground font-medium">
                        Store: {business.name}
                      </span>
                      <Link
                        href={`/products/${p.slug || p.id}`}
                        className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
                      >
                        Full Details <ExternalLink className="size-2.5" />
                      </Link>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Button
                type="button"
                size="sm"
                onClick={handleAddToCart}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-3.5 h-8 gap-1.5 cursor-pointer shadow-xs"
              >
                <ShoppingCart className="size-3.5" />
                <span>Add to Cart</span>
              </Button>
            </div>
          )}
        </CardFooter>
      </div>
    </Card>
  );
}
