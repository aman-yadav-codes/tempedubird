"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingCart, Plus, Minus, Info, Package, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "sonner";
import { useAuthStore, useCartStore } from "@/store";
import { isUserStoreOwner } from "@/lib/auth/store-ownership";
import {
  isWeightBasedProduct,
  formatWeightPrice,
} from "@/lib/utils/weight-unit";
import { buildProductSeoUrl } from "@/lib/utils/seo-slug";

interface CompactProductCardProps {
  product: any;
  business?: any;
  isHighlighted?: boolean;
  onAddToCart?: (product: any) => void;
  onOpenDetails?: (product: any) => void;
  className?: string;
}

export function CompactProductCard({
  product: p,
  business,
  isHighlighted = false,
  onAddToCart,
  onOpenDetails,
  className = "",
}: CompactProductCardProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addItem, getItemQuantity, updateQuantity } = useCartStore();

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Determine effective business info
  const effectiveBusiness = business || {
    id: p.business_id || p.seller_info?.business_id || p.business_profile_id,
    name: p.business_name || p.seller_info?.business_name || p.brand_name || p.brand || "Store",
    slug: p.business_slug || p.seller_info?.business_slug || "",
    institution_profile_id: p.institution_id || p.seller_info?.institution_id,
    user_id: p.business_user_id || p.seller_info?.user_id,
  };

  const isOwner = useMemo(() => isUserStoreOwner(user, effectiveBusiness), [user, effectiveBusiness]);

  const rawUnit = p.unit || p.unit_of_measurement || "unit";
  const weightMeta = useMemo(() => isWeightBasedProduct(rawUnit), [rawUnit]);

  const basePrice = Number(
    (p.discounted_price !== undefined && p.discounted_price !== null && Number(p.discounted_price) > 0)
      ? p.discounted_price
      : (p.sale_price !== undefined && p.sale_price !== null && Number(p.sale_price) > 0)
      ? p.sale_price
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

  const baseRegularPrice = p.regular_price
    ? Number(p.regular_price)
    : p.suggested_max_price
    ? Number(p.suggested_max_price)
    : null;

  const hasDiscount = Boolean(baseRegularPrice && baseRegularPrice > basePrice);

  const cartItemId = String(p.id);
  const currentCartQty = mounted ? getItemQuantity(cartItemId) : 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();

    if (isOwner) {
      toast.error("You cannot order products from your own storefront.");
      return;
    }

    if (onAddToCart) {
      onAddToCart(p);
      return;
    }

    const added = addItem(
      {
        id: cartItemId,
        name: p.name || p.title,
        price: basePrice,
        regular_price: baseRegularPrice,
        image_url: p.default_image_url || p.image_url,
        brand: p.brand_name || p.brand || effectiveBusiness.name,
        unit: rawUnit,
        business_id: effectiveBusiness.id,
        business_name: effectiveBusiness.name,
        business_slug: effectiveBusiness.slug,
        institution_id: effectiveBusiness.institution_profile_id,
        item_type: "product",
      },
      1
    );

    if (added) {
      toast.success(`${p.name || p.title} added to cart!`);
    }
  };

  const productSlugOrId = p.slug || p.id;

  const handleOpenDetails = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onOpenDetails) {
      onOpenDetails(p);
    } else {
      router.push(`/products/${productSlugOrId}`);
    }
  };

  const productTitle = p.name || p.title || "Product";
  const brandName = p.brand_name || p.brand || effectiveBusiness.name || "Brand";
  const imageUrl =
    p.default_image_url ||
    p.image_url ||
    "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=300&auto=format&fit=crop&q=60";

  return (
    <div
      id={`product-compact-${p.id}`}
      onClick={(e) => {
        if (!e.defaultPrevented) {
          if (onOpenDetails) {
            onOpenDetails(p);
          } else {
            router.push(`/products/${productSlugOrId}`);
          }
        }
      }}
      className={`p-3 rounded-xl border transition-all flex items-center gap-3.5 group relative bg-card hover:bg-muted/30 cursor-pointer ${
        isHighlighted
          ? "ring-2 ring-primary border-primary bg-primary/10 shadow-sm"
          : "shadow-2xs hover:shadow-xs border-border/70"
      } ${className}`}
    >
      {/* 1. Left Thumbnail Image */}
      <div
        onClick={handleOpenDetails}
        className="relative size-16 rounded-lg bg-muted shrink-0 overflow-hidden border cursor-pointer group/img"
        title={`View ${productTitle}`}
      >
        <Image
          src={imageUrl}
          alt={productTitle}
          fill
          sizes="64px"
          className="object-cover group-hover/img:scale-105 transition-transform"
        />
        {isHighlighted && (
          <span className="absolute top-1 right-1 size-2 rounded-full bg-primary ring-2 ring-background" />
        )}
      </div>

      {/* 2. Middle Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <Link
            href={buildProductSeoUrl({ ...p, seller_info: effectiveBusiness })}
            onClick={handleOpenDetails}
            className="text-xs font-bold text-foreground truncate hover:text-primary transition-colors cursor-pointer block"
            title={productTitle}
          >
            {productTitle}
          </Link>
          {isHighlighted && (
            <span className="size-1.5 rounded-full bg-primary shrink-0" title="Selected Item" />
          )}
        </div>

        {effectiveBusiness.slug || effectiveBusiness.id ? (
          <Link
            href={effectiveBusiness.slug ? `/business/${effectiveBusiness.slug}` : `/business/${effectiveBusiness.id}`}
            onClick={(e) => e.stopPropagation()}
            className="text-[11px] text-muted-foreground font-semibold hover:text-primary hover:underline truncate block"
            title={effectiveBusiness.name || brandName}
          >
            {effectiveBusiness.name || brandName}
          </Link>
        ) : (
          <p className="text-[11px] text-muted-foreground truncate" title={brandName}>
            {brandName}
          </p>
        )}

        {/* Pricing */}
        <div className="flex items-center justify-between mt-1">
          <div className="flex items-baseline gap-1 min-w-0">
            <span className="text-xs font-black text-foreground">
              ₹{formatWeightPrice(basePrice)}
            </span>
            <span className="text-[10px] font-semibold text-muted-foreground truncate">
              / {rawUnit}
            </span>
            {hasDiscount && (
              <span className="text-[10px] text-muted-foreground line-through hidden sm:inline ml-0.5">
                ₹{formatWeightPrice(baseRegularPrice!)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Right Actions: Short Description Popover Icon + Add/Counter */}
      <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
        {/* Short Description Popover Trigger */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="size-7 rounded-full hover:bg-muted text-muted-foreground hover:text-primary flex items-center justify-center transition-colors cursor-pointer border border-border/60 hover:border-primary/50 shadow-2xs"
              title="Click to view short description"
              aria-label="Short description"
            >
              <Info className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-3 text-xs rounded-xl shadow-xl border bg-background" side="top">
            <div className="space-y-2">
              <div className="font-bold text-foreground text-xs line-clamp-1 border-b pb-1.5 flex items-center justify-between">
                <span>{productTitle}</span>
                <span className="text-[10px] text-rose-600 font-extrabold">₹{formatWeightPrice(basePrice)}</span>
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                {p.description || p.short_description || "No additional description provided for this product."}
              </p>
              {p.attributes && typeof p.attributes === "object" && Object.keys(p.attributes).length > 0 && (
                <div className="pt-1.5 border-t flex flex-wrap gap-1">
                  {Object.entries(p.attributes).slice(0, 4).map(([k, v]) => (
                    <span key={k} className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-medium">
                      {k}: {String(v)}
                    </span>
                  ))}
                </div>
              )}
              <div className="pt-1 border-t flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground font-medium">
                  Store: {effectiveBusiness.name}
                </span>
                <Link
                  href={`/products/${productSlugOrId}`}
                  onClick={handleOpenDetails}
                  className="text-[10px] font-bold text-primary hover:underline flex items-center gap-0.5"
                >
                  Full Details <ExternalLink className="size-2.5" />
                </Link>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Action Button / Quantity Selector */}
        {isOwner ? (
          <Badge variant="outline" className="text-[10px] font-bold text-amber-700 bg-amber-500/10 border-amber-500/30 px-1.5 py-0.5">
            Owner
          </Badge>
        ) : currentCartQty > 0 ? (
          <div className="flex items-center border border-rose-300 dark:border-rose-900 rounded-md overflow-hidden bg-background h-6 shadow-2xs">
            <button
              type="button"
              onClick={() => updateQuantity(cartItemId, currentCartQty - 1)}
              className="size-5 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Decrease quantity"
            >
              <Minus className="size-2.5" />
            </button>
            <span className="w-5 text-center text-[10px] font-black text-rose-600">
              {currentCartQty}
            </span>
            <button
              type="button"
              onClick={() => updateQuantity(cartItemId, currentCartQty + 1)}
              className="size-5 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              title="Increase quantity"
            >
              <Plus className="size-2.5" />
            </button>
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            onClick={handleAddToCart}
            className="h-6 text-[10px] font-bold px-2 gap-1 bg-[#d9232e] hover:bg-[#d9232e]/90 text-white cursor-pointer shadow-2xs shrink-0"
          >
            <ShoppingCart className="size-3" />
            <span>Add</span>
          </Button>
        )}
      </div>
    </div>
  );
}
