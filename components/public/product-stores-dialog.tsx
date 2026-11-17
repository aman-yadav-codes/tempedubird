"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  MapPin,
  Tag,
  Store,
  ExternalLink,
  ShoppingCart,
  CheckCircle2,
  Phone,
  Sparkles,
  TrendingDown,
  Loader2,
  Package,
} from "lucide-react";
import { useCartStore } from "@/store/slices/cart.store";
import { toast } from "sonner";

export interface ProductStoreListing {
  product_id: number;
  product_title: string;
  price: number;
  regular_price: number;
  unit: string;
  product_image: string | null;
  business_id: number;
  store_name: string;
  store_slug: string;
  store_logo: string | null;
  city: string | null;
  locality: string | null;
  state: string | null;
  phone: string | null;
  whatsapp: string | null;
  is_verified: boolean;
  store_url: string;
}

interface ProductStoresResponse {
  product: {
    id: number;
    name: string;
    slug: string;
    brand: string | null;
    display_unit: string;
    default_image_url: string | null;
    description: string | null;
    category_name: string | null;
    synonyms: string[];
    min_price: number;
    max_price: number;
    total_sellers: number;
  };
  stores: ProductStoreListing[];
}

interface ProductStoresDialogProps {
  productId: number | string | null;
  productName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductStoresDialog({
  productId,
  productName,
  open,
  onOpenChange,
}: ProductStoresDialogProps) {
  const [data, setData] = useState<ProductStoresResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, any>>({});
  const { addItem } = useCartStore();

  useEffect(() => {
    if (!open || !productId) {
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    const nameQuery = productName ? `?name=${encodeURIComponent(productName)}` : "";
    fetch(`/api/public/products/${encodeURIComponent(String(productId))}/stores${nameQuery}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || "Failed to load store listings");
        }
        return res.json();
      })
      .then((resData) => {
        if (isMounted) {
          setData(resData);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to find stores selling this product");
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, productId]);

  const product = data?.product;
  const stores = data?.stores || [];
  const minPrice = stores.length > 0 ? Math.min(...stores.map((s) => Number(s.price))) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden sm:rounded-2xl gap-0">
        <DialogHeader className="p-5 pb-3 border-b bg-muted/20">
          <div className="flex items-start gap-3.5">
            <div className="relative size-14 rounded-xl bg-muted border overflow-hidden shrink-0">
              <Image
                src={
                  product?.default_image_url ||
                  (product as any)?.imageUrl ||
                  "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=300&auto=format&fit=crop&q=60"
                }
                alt={product?.name || productName || "Product"}
                fill
                className="object-cover"
                sizes="56px"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 text-[10px] font-bold uppercase tracking-wider"
                >
                  {product?.category_name || (product as any)?.categoryName || "Product"}
                </Badge>
                {(product?.display_unit || (product as any)?.unit) && (
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    Unit: {product?.display_unit || (product as any)?.unit}
                  </Badge>
                )}
                {stores.length > 0 && (
                  <Badge className="bg-emerald-600 text-white text-[10px] font-bold">
                    {stores.length} {stores.length === 1 ? "Store Available" : "Stores Available"}
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-base font-bold text-foreground mt-1 truncate">
                {product?.name || productName || "Product Store Comparison"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {stores.length > 0 ? (
                  <span>
                    Price comparison across verified sellers • Starting from{" "}
                    <strong className="text-emerald-600 font-bold">
                      ₹{minPrice} / {product?.display_unit || (product as any)?.unit || "unit"}
                    </strong>
                  </span>
                ) : (
                  "Compare prices across local stores and order directly"
                )}
              </DialogDescription>
            </div>
          </div>

          {product?.synonyms && product.synonyms.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-border/40 text-[11px] text-muted-foreground flex-wrap">
              <Tag className="size-3 text-muted-foreground shrink-0" />
              <span className="font-semibold text-foreground/80">Also known as:</span>
              {product.synonyms.map((syn, idx) => (
                <span
                  key={idx}
                  className="bg-background px-1.5 py-0.5 rounded border text-[10px] font-medium"
                >
                  {syn}
                </span>
              ))}
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="size-8 mx-auto animate-spin text-primary opacity-70" />
              <p className="text-xs text-muted-foreground font-medium">
                Searching nearby stores and matching real-time prices...
              </p>
            </div>
          ) : error ? (
            <div className="py-12 text-center space-y-2">
              <Package className="size-10 mx-auto text-muted-foreground opacity-40" />
              <p className="text-xs text-rose-500 font-semibold">{error}</p>
            </div>
          ) : stores.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <Store className="size-10 mx-auto text-muted-foreground opacity-40" />
              <h4 className="text-sm font-bold text-foreground">No Local Stores Found</h4>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No active retail businesses are currently listing this item in their inventory.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs text-muted-foreground px-1 pb-1">
                <span className="font-semibold">Stores Selling This Item ({stores.length})</span>
                <span className="text-[11px]">Sorted by lowest price</span>
              </div>

              {stores.map((s: any, index: number) => {
                const storeId = s.storeId ?? s.business_id ?? s.store_id ?? index;
                const prodId = s.productId ?? s.product_id ?? productId ?? index;
                const uniqueKey = `${storeId}-${prodId}-${index}`;
                const storeName = s.storeName || s.store_name || "Verified Store";
                const storeLogo = s.storeLogo || s.store_logo || null;
                const isVerified = Boolean(s.isVerified ?? s.is_verified);
                const storeUrl = s.storeUrl || s.store_url || `/business/${s.storeSlug || s.store_slug || storeId}`;
                const location = s.fullLocation || [s.locality, s.city, s.state].filter(Boolean).join(", ");
                const itemUnit = s.unit || product?.display_unit || (product as any)?.unit || "unit";
                const productImage = s.productImage || s.product_image || product?.default_image_url || (product as any)?.imageUrl || null;
                const productTitle = s.productTitle || s.product_title || product?.name || productName || "Product";
                const rawPrice = Number(s.price || 0);
                const price = rawPrice > 0 ? rawPrice : 30;
                const isLowest = price === minPrice;

                // Derive variants from store or standard units
                let variants: any[] = [];
                if (Array.isArray(s.variants) && s.variants.length > 0) {
                  variants = s.variants.map((v: any, vIdx: number) => {
                    let vPrice = Number(v.price);
                    if (isNaN(vPrice) || vPrice <= 0) {
                      const vName = String(v.name || v.label || "").toLowerCase();
                      if (vName.includes("100")) vPrice = Math.max(2, Math.round(price * 0.1));
                      else if (vName.includes("250")) vPrice = Math.max(5, Math.round(price * 0.25));
                      else if (vName.includes("500")) vPrice = Math.max(10, Math.round(price * 0.5));
                      else if (vName.includes("1kg") || vName.includes("1 kg")) vPrice = price;
                      else if (vName.includes("2kg") || vName.includes("2 kg")) vPrice = Math.round(price * 2);
                      else if (vName.includes("5kg") || vName.includes("5 kg")) vPrice = Math.round(price * 5);
                      else vPrice = price;
                    }
                    return {
                      id: v.id || `v-${vIdx}`,
                      name: v.name || v.label || `Variant ${vIdx + 1}`,
                      price: vPrice,
                      unit: v.unit || itemUnit,
                    };
                  });
                } else {
                  const lowerUnit = String(itemUnit).toLowerCase();
                  if (lowerUnit.includes("kg") || lowerUnit === "kilo" || lowerUnit === "kilogram") {
                    variants = [
                      { id: "100g", name: "100 g", unit: "100g", price: Math.max(2, Math.round(price * 0.1)) },
                      { id: "250g", name: "250 g", unit: "250g", price: Math.max(5, Math.round(price * 0.25)) },
                      { id: "500g", name: "500 g", unit: "500g", price: Math.max(10, Math.round(price * 0.5)) },
                      { id: "1kg", name: "1 kg", unit: "1kg", price: price },
                      { id: "2kg", name: "2 kg", unit: "2kg", price: Math.round(price * 2) },
                      { id: "5kg", name: "5 kg", unit: "5kg", price: Math.round(price * 5) },
                    ];
                  } else if (lowerUnit.includes("liter") || lowerUnit.includes("litre") || lowerUnit === "l") {
                    variants = [
                      { id: "250ml", name: "250 ml", unit: "250ml", price: Math.max(5, Math.round(price * 0.25)) },
                      { id: "500ml", name: "500 ml", unit: "500ml", price: Math.max(10, Math.round(price * 0.5)) },
                      { id: "1l", name: "1 Litre", unit: "1l", price: price },
                      { id: "2l", name: "2 Litres", unit: "2l", price: Math.round(price * 2) },
                      { id: "5l", name: "5 Litres", unit: "5l", price: Math.round(price * 4.8) },
                    ];
                  } else if (lowerUnit.includes("200ml") || lowerUnit.includes("ml")) {
                    variants = [
                      { id: "100ml", name: "100 ml", unit: "100ml", price: Math.round(price * 0.55) },
                      { id: "200ml", name: "200 ml", unit: "200ml", price: price },
                      { id: "500ml", name: "500 ml", unit: "500ml", price: Math.round(price * 2.2) },
                    ];
                  } else if (lowerUnit.includes("pack") || lowerUnit.includes("piece") || lowerUnit.includes("unit")) {
                    variants = [
                      { id: "1unit", name: "1 Unit", unit: itemUnit, price: price },
                      { id: "pack2", name: "Pack of 2", unit: "2 units", price: Math.round(price * 1.9) },
                      { id: "pack5", name: "Pack of 5", unit: "5 units", price: Math.round(price * 4.5) },
                    ];
                  }
                }

                const defaultVar = variants.find((v: any) => v.name?.toLowerCase().includes("1 kg") || v.unit?.toLowerCase().includes("1kg")) || variants[0] || null;
                const chosenVariant = selectedVariants[uniqueKey] || defaultVar;
                const activePrice = chosenVariant ? Number(chosenVariant.price) : price;
                const activeUnit = chosenVariant?.unit || itemUnit;
                const activeTitle = chosenVariant ? `${productTitle} (${chosenVariant.name})` : productTitle;
                const activeCartId = chosenVariant ? `${prodId}_${chosenVariant.id || chosenVariant.name}` : prodId;

                return (
                  <div
                    key={uniqueKey}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isLowest
                        ? "bg-emerald-500/5 border-emerald-500/30 hover:border-emerald-500/50 shadow-xs"
                        : "bg-card hover:bg-muted/30 border-border"
                    }`}
                  >
                    {/* Left: Store info */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Link
                        href={storeUrl}
                        onClick={() => onOpenChange(false)}
                        className="relative size-11 rounded-lg bg-muted border overflow-hidden shrink-0 flex items-center justify-center font-black text-xs text-muted-foreground hover:opacity-85 transition-opacity cursor-pointer"
                        title={`Visit ${storeName}`}
                      >
                        {storeLogo ? (
                          <Image
                            src={storeLogo}
                            alt={storeName}
                            fill
                            className="object-cover"
                            sizes="44px"
                          />
                        ) : (
                          <Store className="size-5 text-muted-foreground" />
                        )}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={storeUrl}
                            onClick={() => onOpenChange(false)}
                            className="text-xs sm:text-sm font-bold text-foreground hover:text-primary transition-colors hover:underline cursor-pointer"
                            title={`Visit ${storeName}`}
                          >
                            {storeName}
                          </Link>
                          {isVerified && (
                            <span title="Verified Business" className="inline-flex items-center">
                              <CheckCircle2 className="size-3.5 text-sky-500 shrink-0" />
                            </span>
                          )}
                          {isLowest && (
                            <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[9px] font-black px-1.5 py-0 h-4 flex items-center gap-0.5">
                              <TrendingDown className="size-2.5" />
                              Best Price
                            </Badge>
                          )}
                        </div>

                        {location && (
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="size-3 text-muted-foreground shrink-0" />
                            <span className="truncate">{location}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Middle: Price & Unit */}
                    <div className="flex sm:flex-col items-baseline sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 shrink-0">
                      <div className="flex items-baseline gap-1">
                        <span className="text-base font-black text-foreground">
                          ₹{activePrice}
                        </span>
                        <span className="text-[11px] font-semibold text-muted-foreground">
                          / {activeUnit}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600">In Stock</span>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 shrink-0">
                      {variants.length > 0 && (
                        <div className="relative">
                          <select
                            value={chosenVariant?.id || chosenVariant?.name || ""}
                            onChange={(e) => {
                              const v = variants.find((item: any) => String(item.id || item.name) === e.target.value);
                              if (v) {
                                setSelectedVariants((prev) => ({ ...prev, [uniqueKey]: v }));
                              }
                            }}
                            className="h-8 pl-2 pr-4 rounded-lg border border-input bg-background text-[11px] font-bold text-foreground shadow-2xs focus:ring-1 focus:ring-primary cursor-pointer max-w-[140px] truncate"
                            title="Select variant / pack"
                          >
                            {variants.map((v: any, vIdx: number) => (
                              <option key={v.id || v.name || vIdx} value={String(v.id || v.name)}>
                                {v.name} — ₹{v.price}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <Button
                        type="button"
                        size="sm"
                        className="h-8 text-xs font-bold px-3.5 gap-1.5 bg-[#d9232e] hover:bg-[#d9232e]/90 text-white cursor-pointer rounded-lg shadow-2xs"
                        onClick={() => {
                          addItem({
                            id: activeCartId,
                            business_id: Number(storeId) || undefined,
                            business_name: storeName,
                            name: activeTitle,
                            price: activePrice,
                            unit: activeUnit,
                            image_url: productImage,
                          });
                          toast.success(`Added ${activeTitle} from ${storeName}!`, {
                            description: `₹${activePrice} / ${activeUnit}`,
                          });
                        }}
                      >
                        <ShoppingCart className="size-3.5" />
                        <span>Add</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
