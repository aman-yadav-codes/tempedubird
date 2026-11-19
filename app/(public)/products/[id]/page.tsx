"use client";

import React, { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ShoppingCart,
  Plus,
  Minus,
  Store,
  MapPin,
  ChevronRight,
  ShieldCheck,
  Package,
  ArrowLeft,
  Share2,
  CheckCircle2,
  Sparkles,
  Phone,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useAuthStore, useCartStore } from "@/store";
import { isUserStoreOwner } from "@/lib/auth/store-ownership";
import { buildProductSeoUrl } from "@/lib/utils/seo-slug";
import {
  isWeightBasedProduct,
  STANDARD_WEIGHT_OPTIONS,
  calculateWeightPrice,
  formatWeightPrice,
  formatGramsDisplay,
} from "@/lib/utils/weight-unit";

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params?.id as string;

  const { user } = useAuthStore();
  const { addItem, getItemQuantity, updateQuantity, setIsOpen } = useCartStore();

  const [mounted, setMounted] = useState(false);
  const [product, setProduct] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!productId) return;
    setLoading(true);
    fetch(`/api/public/products/${productId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.product) {
          setProduct(data.product);
          setSelectedImage(data.product.default_image_url || "");
          const canonicalSeoUrl = buildProductSeoUrl(data.product);
          if (canonicalSeoUrl && !canonicalSeoUrl.startsWith("/products/")) {
            router.replace(canonicalSeoUrl);
          } else if (data.product.slug && /^\d+$/.test(productId) && data.product.slug !== productId) {
            router.replace(`/products/${data.product.slug}`);
          }
        } else {
          setProduct(null);
        }
      })
      .catch((err) => {
        console.error("Error loading product:", err);
      })
      .finally(() => setLoading(false));
  }, [productId]);

  const rawUnit = product?.unit || product?.unit_of_measurement || "unit";
  const weightMeta = useMemo(() => isWeightBasedProduct(rawUnit), [rawUnit]);

  const [selectedWeightKey, setSelectedWeightKey] = useState<string>(weightMeta.defaultKey);
  const [showCustom, setShowCustom] = useState(false);
  const [customGrams, setCustomGrams] = useState<string>("250");

  const basePrice = Number(product?.price || product?.suggested_price || 0);
  const baseRegularPrice = product?.regular_price ? Number(product.regular_price) : null;

  const { targetGrams, displayUnit, effectivePrice, effectiveRegularPrice, cartItemId } = useMemo(() => {
    if (!weightMeta.isWeight) {
      return {
        targetGrams: 0,
        displayUnit: rawUnit,
        effectivePrice: basePrice,
        effectiveRegularPrice: baseRegularPrice,
        cartItemId: String(product?.id || ""),
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

    const cId = `${product?.id}_${showCustom ? `${grams}g` : selectedWeightKey}`;

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
    product?.id,
  ]);

  const effectiveBusiness = useMemo(() => {
    if (!product) return null;
    return {
      id: product.business_profile_id,
      name: product.business_name || product.brand || "Store",
      slug: product.business_slug || "",
      institution_profile_id: product.institution_profile_id,
    };
  }, [product]);

  const isOwner = useMemo(() => isUserStoreOwner(user, effectiveBusiness), [user, effectiveBusiness]);

  const currentCartQty = mounted && cartItemId ? getItemQuantity(cartItemId) : 0;

  const handleAddToCart = () => {
    if (isOwner) {
      toast.error("You cannot order products from your own storefront.");
      return;
    }

    const added = addItem(
      {
        id: cartItemId,
        name: weightMeta.isWeight ? `${product.name} (${displayUnit})` : product.name,
        price: effectivePrice,
        regular_price: effectiveRegularPrice,
        image_url: product.default_image_url,
        brand: product.brand || effectiveBusiness?.name,
        unit: displayUnit,
        business_id: effectiveBusiness?.id,
        business_name: effectiveBusiness?.name,
        business_slug: effectiveBusiness?.slug,
        institution_id: effectiveBusiness?.institution_profile_id,
        item_type: "product",
      },
      1
    );

    if (added) {
      toast.success(`${product.name} (${displayUnit}) added to cart!`);
    }
  };

  const handleBuyNow = () => {
    handleAddToCart();
    setIsOpen(true);
  };

  const storeLink = product?.business_slug
    ? `/${product.category_slug || "retail-shopping"}/${product.business_slug}?tab=products&highlight=${product.id}`
    : null;

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-2">
          <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-muted-foreground">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <Package className="size-12 text-muted-foreground mx-auto opacity-40" />
        <h2 className="text-lg font-bold text-foreground">Product Not Found</h2>
        <p className="text-xs text-muted-foreground">
          The requested product could not be found or may have been removed.
        </p>
        <Button asChild size="sm">
          <Link href="/products">Browse All Products</Link>
        </Button>
      </div>
    );
  }

  const allImages = [
    product.default_image_url,
    ...(Array.isArray(product.additional_images) ? product.additional_images : []),
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <ChevronRight className="size-3" />
          <Link href="/products" className="hover:text-foreground">Products</Link>
          {product.category_name && (
            <>
              <ChevronRight className="size-3" />
              <span>{product.category_name}</span>
            </>
          )}
          <ChevronRight className="size-3" />
          <span className="text-foreground font-semibold truncate max-w-[200px]">{product.name}</span>
        </div>

        {/* Main Product Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-6 space-y-3">
            <div className="relative aspect-square w-full rounded-2xl bg-muted/30 border overflow-hidden shadow-2xs">
              <Image
                src={selectedImage || product.default_image_url || "https://placehold.co/600x600?text=Product"}
                alt={product.name}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 500px"
                className="object-cover"
              />
              <span className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                <CheckCircle2 className="size-3" /> In Stock
              </span>
            </div>

            {/* Thumbnail selector */}
            {allImages.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {allImages.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedImage(img)}
                    className={`relative size-16 rounded-xl border overflow-hidden shrink-0 cursor-pointer transition-all ${
                      selectedImage === img ? "ring-2 ring-primary border-primary" : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image src={img} alt={`${product.name} thumbnail ${i + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Product Info & Buy Box */}
          <div className="lg:col-span-6 space-y-5">
            <div>
              {product.brand && (
                <span className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block mb-1">
                  {product.brand}
                </span>
              )}
              <h1 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">
                {product.name}
              </h1>
              {product.sku && (
                <span className="text-[11px] text-muted-foreground font-mono mt-0.5 block">
                  SKU: {product.sku}
                </span>
              )}
            </div>

            {/* Price section */}
            <div className="p-4 rounded-2xl bg-muted/30 border space-y-1">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="text-2xl sm:text-3xl font-black text-foreground">
                  ₹{formatWeightPrice(effectivePrice)}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  / {displayUnit}
                </span>
                {effectiveRegularPrice && effectiveRegularPrice > effectivePrice && (
                  <span className="text-sm text-muted-foreground line-through">
                    ₹{formatWeightPrice(effectiveRegularPrice)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Inclusive of all applicable local taxes and store packaging.
              </p>
            </div>

            {/* Weight selector (if weight-based) */}
            {weightMeta.isWeight && (
              <div className="space-y-2.5 p-4 rounded-2xl border bg-card">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-foreground">Select Weight / Quantity:</span>
                  <button
                    type="button"
                    onClick={() => setShowCustom(!showCustom)}
                    className="text-primary hover:underline text-[11px] font-semibold cursor-pointer"
                  >
                    {showCustom ? "Choose standard pack" : "Enter custom grams"}
                  </button>
                </div>

                {showCustom ? (
                  <div className="flex items-center gap-2.5 pt-1">
                    <input
                      type="number"
                      min={10}
                      max={50000}
                      step={50}
                      value={customGrams}
                      onChange={(e) => setCustomGrams(e.target.value)}
                      placeholder="e.g. 350"
                      className="w-32 h-10 px-3 rounded-xl border bg-background text-xs font-bold font-mono shadow-2xs"
                    />
                    <span className="text-xs text-muted-foreground font-semibold">grams</span>
                    <span className="text-xs font-black text-rose-600 ml-auto">
                      = ₹{formatWeightPrice(effectivePrice)}
                    </span>
                  </div>
                ) : (
                  <Select
                    value={selectedWeightKey}
                    onValueChange={(val) => {
                      if (val === "custom") {
                        setShowCustom(true);
                      } else {
                        setSelectedWeightKey(val);
                        setShowCustom(false);
                      }
                    }}
                  >
                    <SelectTrigger className="w-full h-11 rounded-xl bg-background border text-xs font-bold">
                      <SelectValue placeholder="Select weight / pack" />
                    </SelectTrigger>
                    <SelectContent>
                      {STANDARD_WEIGHT_OPTIONS.map((opt) => {
                        const optPrice = calculateWeightPrice(basePrice, weightMeta.baseGrams, opt.grams);
                        return (
                          <SelectItem key={opt.key} value={opt.key} className="text-xs font-medium cursor-pointer">
                            <span className="font-bold text-foreground">{opt.label}</span>
                            <span className="text-muted-foreground ml-2">— ₹{formatWeightPrice(optPrice)}</span>
                          </SelectItem>
                        );
                      })}
                      <SelectItem value="custom" className="text-xs font-medium text-primary cursor-pointer border-t mt-1 pt-1.5">
                        Custom weight (enter grams)...
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            {/* Actions: Add to Cart & Buy Now */}
            <div className="space-y-3 pt-2">
              {isOwner ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-xs font-semibold">
                  Store Owner View: Self-ordering from your own front store is disabled.
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {currentCartQty > 0 ? (
                    <div className="flex items-center border border-rose-300 dark:border-rose-900 rounded-xl overflow-hidden bg-background h-10 shadow-xs px-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(cartItemId, currentCartQty - 1)}
                        className="size-8 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Minus className="size-3.5" />
                      </button>
                      <span className="w-10 text-center text-xs font-black text-rose-600">
                        {currentCartQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(cartItemId, currentCartQty + 1)}
                        className="size-8 flex items-center justify-center hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                      </button>
                    </div>
                  ) : (
                    <Button
                      size="lg"
                      onClick={handleAddToCart}
                      className="flex-1 h-11 text-xs font-bold gap-2 bg-[#d9232e] hover:bg-[#d9232e]/90 text-white cursor-pointer shadow-md"
                    >
                      <ShoppingCart className="size-4" /> Add to Cart
                    </Button>
                  )}

                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleBuyNow}
                    className="h-11 px-6 text-xs font-bold cursor-pointer"
                  >
                    Buy Now
                  </Button>
                </div>
              )}
            </div>

            {/* Seller / Storefront Card */}
            {effectiveBusiness && (
              <Card className="rounded-2xl border shadow-2xs bg-card">
                <CardContent className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {storeLink ? (
                      <Link
                        href={storeLink}
                        className="size-11 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center shrink-0 border transition-colors cursor-pointer"
                        title={`Visit ${effectiveBusiness.name} Storefront`}
                      >
                        <Store className="size-5" />
                      </Link>
                    ) : (
                      <div className="size-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 border">
                        <Store className="size-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                        Sold &amp; Fulfilled By
                      </span>
                      {storeLink ? (
                        <Link
                          href={storeLink}
                          className="text-sm font-bold text-foreground hover:text-primary hover:underline truncate block transition-colors cursor-pointer"
                          title={`Visit ${effectiveBusiness.name} Storefront`}
                        >
                          {effectiveBusiness.name}
                        </Link>
                      ) : (
                        <p className="text-sm font-bold text-foreground truncate">
                          {effectiveBusiness.name}
                        </p>
                      )}
                      {product.business_city && (
                        <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 truncate">
                          <MapPin className="size-3 text-muted-foreground shrink-0" />
                          {product.business_city}, {product.business_state || "India"}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Product Description */}
            {product.description && (
              <div className="space-y-2 pt-2 border-t">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Product Description
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>
            )}

            {/* Specifications / Attributes */}
            {product.attributes && typeof product.attributes === "object" && Object.keys(product.attributes).length > 0 && (
              <div className="space-y-2.5 pt-2 border-t">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Specifications &amp; Features
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(product.attributes).map(([key, value]) => (
                    <div key={key} className="p-2.5 rounded-xl border bg-muted/20">
                      <span className="text-[10px] text-muted-foreground block font-medium capitalize">
                        {key}
                      </span>
                      <span className="font-semibold text-foreground">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
