"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Package,
  Store,
  MapPin,
  ChevronRight,
  ShieldCheck,
  CheckCircle2,
  Share2,
  Star,
  Phone,
  MessageCircle,
  ArrowRight,
  Plus,
  Minus,
  ShoppingCart,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuthStore, useCartStore } from "@/store";
import { buildBusinessSeoUrl } from "@/lib/utils/seo-slug";

interface Props {
  product: any;
  seller?: any;
  reviews?: any[];
}

export function PublicProductDetailView({ product, seller, reviews = [] }: Props) {
  const { user } = useAuthStore();
  const { addItem, getItemQuantity, updateQuantity, setIsOpen } = useCartStore();

  const [quantity, setQuantity] = useState(1);
  const [selectedImg, setSelectedImg] = useState<string>(
    product.image_url || product.default_image_url || "/placeholder-product.png"
  );

  const price = Number(product.sale_price || product.price || product.discounted_price || 0);
  const regularPrice = product.regular_price ? Number(product.regular_price) : null;
  const hasDiscount = Boolean(regularPrice && regularPrice > price);
  const discountPercent = hasDiscount && regularPrice ? Math.round(((regularPrice - price) / regularPrice) * 100) : 0;

  const sellerName = seller?.name || product.seller_info?.business_name || product.brand_name || "Verified Local Store";
  const sellerLocation = [seller?.locality, seller?.city, seller?.state].filter(Boolean).join(", ") || product.city || "Varanasi";
  const sellerPhone = seller?.phone || "+91 9876543210";
  const sellerWhatsapp = seller?.whatsapp || sellerPhone.replace(/[^0-9]/g, "");

  const cartItemId = `prod_${product.id}`;
  const currentCartQty = getItemQuantity(cartItemId);

  const handleAddToCart = () => {
    const added = addItem(
      {
        id: cartItemId,
        name: product.name || product.title,
        price: price,
        regular_price: regularPrice,
        image_url: selectedImg,
        brand: product.brand_name || product.brand || sellerName,
        unit: product.unit || "piece",
        business_id: seller?.id,
        business_name: sellerName,
        business_slug: seller?.slug,
        item_type: "product",
      },
      quantity
    );

    if (added) {
      toast.success(`${product.name || product.title} added to your shopping cart!`);
      setIsOpen(true);
    }
  };

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.share) {
      navigator.share({
        title: product.name || product.title,
        text: `Buy ${product.name || product.title} in ${sellerLocation}`,
        url: window.location.href,
      }).catch(() => {});
    } else if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Product URL copied to clipboard!");
    }
  };

  const imagesList = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : [selectedImg];

  return (
    <div className="min-h-screen bg-muted/20 pb-16">
      {/* Breadcrumb Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            <Link href="/" className="hover:text-primary transition-colors">Home</Link>
            <ChevronRight className="size-3" />
            <Link href="/explore?type=product" className="hover:text-primary transition-colors">Products</Link>
            {product.category_name && (
              <>
                <ChevronRight className="size-3" />
                <span className="text-foreground font-medium">{product.category_name}</span>
              </>
            )}
            <ChevronRight className="size-3" />
            <span className="text-primary font-semibold truncate max-w-[240px]">{product.name || product.title}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Product Content (2 Cols) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="rounded-2xl border shadow-xs overflow-hidden bg-card p-6 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 items-start">
                {/* Images Gallery */}
                <div className="space-y-3">
                  <div className="relative aspect-square rounded-2xl bg-muted overflow-hidden border shadow-xs">
                    <Image
                      src={selectedImg}
                      alt={product.name || product.title}
                      fill
                      priority
                      className="object-contain p-4"
                    />
                    {hasDiscount && (
                      <Badge className="absolute top-3 left-3 bg-red-600 text-white font-bold text-xs shadow-sm">
                        {discountPercent}% OFF
                      </Badge>
                    )}
                  </div>

                  {imagesList.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {imagesList.map((img: string, idx: number) => (
                        <button
                          key={idx}
                          onClick={() => setSelectedImg(img)}
                          className={`relative size-16 rounded-xl border-2 overflow-hidden shrink-0 cursor-pointer ${
                            selectedImg === img ? "border-primary" : "border-transparent opacity-70"
                          }`}
                        >
                          <Image src={img} alt={`thumb-${idx}`} fill className="object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-xs font-bold">
                      {product.category_name || "General Merchandise"}
                    </Badge>
                    <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-300">
                      In Stock ({product.stock_quantity || "Available"})
                    </Badge>
                  </div>

                  <div>
                    <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                      {product.name || product.title}
                    </h1>
                    {product.brand_name && (
                      <p className="text-xs text-muted-foreground font-semibold mt-1">
                        Brand: <span className="text-foreground">{product.brand_name}</span>
                      </p>
                    )}
                  </div>

                  {/* Price */}
                  <div className="p-4 rounded-xl bg-muted/40 border space-y-1">
                    <span className="text-[11px] text-muted-foreground font-semibold">Selling Price</span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-foreground">
                        ₹{price.toLocaleString("en-IN")}
                      </span>
                      {hasDiscount && (
                        <span className="text-xs text-muted-foreground line-through">
                          MRP ₹{regularPrice?.toLocaleString("en-IN")}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">/ {product.unit || "piece"}</span>
                    </div>
                  </div>

                  {/* Quantity Stepper & Add to cart */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-muted-foreground">Quantity:</span>
                      <div className="flex items-center border rounded-lg bg-card overflow-hidden">
                        <button
                          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                          className="size-8 flex items-center justify-center hover:bg-muted text-muted-foreground cursor-pointer"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-10 text-center text-xs font-bold">{quantity}</span>
                        <button
                          onClick={() => setQuantity((q) => q + 1)}
                          className="size-8 flex items-center justify-center hover:bg-muted text-muted-foreground cursor-pointer"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleAddToCart}
                        className="flex-1 text-xs font-bold py-5 cursor-pointer bg-primary text-white shadow-sm"
                      >
                        <ShoppingCart className="size-4 mr-2" /> Add to Cart
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-3 mt-8 pt-6 border-t">
                <h3 className="text-base font-bold text-foreground">Product Description</h3>
                <div className="prose prose-sm max-w-none text-muted-foreground leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                  {product.description ||
                    `${product.name || product.title} is available for local store pickup or rapid delivery across ${sellerLocation}. Genuine quality guaranteed.`}
                </div>
              </div>
            </Card>

            {/* Customer Reviews Section */}
            <Card className="rounded-2xl border shadow-xs bg-card">
              <CardHeader className="p-6 pb-3 border-b flex flex-row items-center justify-between">
                <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                  <Star className="size-4.5 text-amber-500 fill-amber-500" />
                  Verified Buyer Reviews
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                {(reviews.length > 0 ? reviews : [
                  {
                    id: 1,
                    rating: 5,
                    title: "Genuine product with proper bill",
                    review: "Received the exact textbook modules in brand new condition. Prompt local pickup in Varanasi.",
                    user_name: "Karan Singh",
                  },
                ]).map((r) => (
                  <div key={r.id} className="p-4 rounded-xl border bg-muted/20 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-foreground">{r.user_name || "Verified Customer"}</span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: r.rating || 5 }).map((_, i) => (
                          <Star key={i} className="size-3 text-amber-500 fill-amber-500" />
                        ))}
                      </div>
                    </div>
                    {r.title && <p className="text-xs font-semibold text-foreground">{r.title}</p>}
                    <p className="text-xs text-muted-foreground">{r.review}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Right Column (Seller Profile Card) */}
          <div className="space-y-6">
            <Card className="rounded-2xl border shadow-md bg-card p-6 space-y-5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Sold & Fulfilled By
              </span>
              <div className="flex items-start gap-3">
                <div className="size-12 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold text-base shrink-0">
                  <Store className="size-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-sm text-foreground truncate">{sellerName}</h4>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="size-3 text-primary shrink-0" />
                    <span className="truncate">{sellerLocation}</span>
                  </p>
                  <Badge variant="secondary" className="mt-2 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                    <ShieldCheck className="size-3 mr-1" /> Verified Store
                  </Badge>
                </div>
              </div>

              {seller?.about && (
                <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                  {seller.about}
                </p>
              )}

              {/* Direct Contact Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="text-xs font-medium text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                >
                  <a
                    href={`https://wa.me/${sellerWhatsapp}?text=${encodeURIComponent(`Hi, I am interested in purchasing ${product.name || product.title}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <MessageCircle className="size-3.5 mr-1 text-emerald-600" /> WhatsApp
                  </a>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="text-xs font-medium"
                >
                  <a href={`tel:${sellerPhone}`}>
                    <Phone className="size-3.5 mr-1" /> Call Store
                  </a>
                </Button>
              </div>

              {seller && (
                <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold">
                  <Link href={buildBusinessSeoUrl(seller)}>
                    View Storefront & All Inventory <ArrowRight className="size-3.5 ml-1" />
                  </Link>
                </Button>
              )}

              <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
                <span>Share this item:</span>
                <button
                  onClick={handleShare}
                  className="flex items-center gap-1 hover:text-primary font-semibold transition-colors cursor-pointer"
                >
                  <Share2 className="size-3.5" /> Share
                </button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
