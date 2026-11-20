"use client";

import React, { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Sparkles,
  Search,
  X,
  Package,
  Store,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Tag,
  CheckCircle2,
  Apple,
  Wheat,
  Milk,
  Cookie,
  Flame,
  Coffee,
  Sparkle,
  HeartHandshake,
  Shirt,
  Tv,
  Gamepad2,
  Printer,
  Gift,
  ShoppingBag,
  Layers,
  UtensilsCrossed,
  Wine,
  ShieldCheck,
  TrendingDown,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ProductStoresDialog } from "@/components/public/product-stores-dialog";
import { CompactProductCard } from "@/components/shared/compact-product-card";

interface ProductItem {
  id: number | string;
  title: string;
  slug?: string;
  description?: string;
  price: number | string;
  sale_price?: number | string | null;
  category: string;
  category_id?: number | null;
  image_url?: string | null;
  stock_quantity?: number | null;
  sku?: string | null;
  unit?: string | null;
  unit_quantity?: number | null;
  badge_text?: string | null;
  is_featured?: boolean;
  business_profile_id?: number | null;
  institution_id?: number | null;
  institution_name?: string | null;
  name?: string;
  brand?: string;
  brand_name?: string;
}

// Icon resolver helper for grocery & retail categories
function getCategoryIcon(catName: string) {
  const lower = catName.toLowerCase();
  if (lower.includes("vegetable") || lower.includes("fruit")) return Apple;
  if (lower.includes("atta") || lower.includes("rice") || lower.includes("dal") || lower.includes("flour")) return Wheat;
  if (lower.includes("dairy") || lower.includes("milk") || lower.includes("bread") || lower.includes("egg")) return Milk;
  if (lower.includes("bakery") || lower.includes("biscuit") || lower.includes("cookie")) return Cookie;
  if (lower.includes("chip") || lower.includes("snack") || lower.includes("namkeen")) return Flame;
  if (lower.includes("tea") || lower.includes("coffee") || lower.includes("drink") || lower.includes("juice")) return Coffee;
  if (lower.includes("clean") || lower.includes("wash") || lower.includes("repellent")) return Sparkle;
  if (lower.includes("beauty") || lower.includes("skin") || lower.includes("cosmetic") || lower.includes("hair") || lower.includes("bath")) return Sparkles;
  if (lower.includes("health") || lower.includes("pharma") || lower.includes("wellness")) return HeartHandshake;
  if (lower.includes("electronic") || lower.includes("gadget") || lower.includes("appliances")) return Tv;
  if (lower.includes("stationery") || lower.includes("game") || lower.includes("toy")) return Gamepad2;
  if (lower.includes("print") || lower.includes("store")) return Printer;
  if (lower.includes("gift") || lower.includes("festive")) return Gift;
  if (lower.includes("chicken") || lower.includes("meat") || lower.includes("fish")) return UtensilsCrossed;
  if (lower.includes("home") || lower.includes("lifestyle")) return ShoppingBag;
  return Layers;
}

export function HomeCategoriesProductsSection() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductForStores, setSelectedProductForStores] = useState<{ id: number | string; name: string } | null>(null);
  const [storesDialogOpen, setStoresDialogOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadProducts() {
      try {
        setLoading(true);
        const res = await fetch("/api/public/products?institutionId=all&limit=1000");
        if (res.ok) {
          const data = await res.json();
          if (isMounted && data.products && Array.isArray(data.products)) {
            // Map title to name if needed
            const mapped = data.products.map((p: any) => ({
              ...p,
              name: p.title || p.name,
              category: (p.category || "General").trim(),
            }));
            setProducts(mapped);
          }
        }
      } catch (err) {
        console.error("Error loading home categories products:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute list of unique categories with counts
  const categoriesList = useMemo(() => {
    const map = new Map<string, number>();
    products.forEach((p) => {
      const cat = p.category || "General";
      map.set(cat, (map.get(cat) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [products]);

  // Filter products by selected category and search query
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesCategory =
        selectedCategory === "all" ||
        p.category.toLowerCase() === selectedCategory.toLowerCase();
      if (!matchesCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.title && p.title.toLowerCase().includes(q)) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q))
      );
    });
  }, [products, selectedCategory, searchQuery]);

  // Group products by category for category-wise rows
  const categoryGroups = useMemo(() => {
    const map = new Map<string, ProductItem[]>();
    filteredProducts.forEach((p) => {
      const cat = p.category || "General";
      const list = map.get(cat) || [];
      list.push(p);
      map.set(cat, list);
    });
    return Array.from(map.entries()).map(([categoryName, items]) => ({
      categoryName,
      items,
    }));
  }, [filteredProducts]);

  if (loading) {
    return (
      <section className="w-full py-14 border-t border-border/50 bg-gradient-to-b from-background via-muted/15 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                <Sparkles className="size-3.5" />
                <span>Explore Top Products by Category</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
                Best Sellers &amp; Daily Essentials
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Order fresh vegetables, grains, bakery items, electronics, and personal essentials directly from verified local businesses.
              </p>
            </div>
            <div className="flex items-center gap-2.5 shrink-0">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs font-bold h-9 px-3.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10 transition-colors shadow-2xs"
              >
                <Link href="/products" className="inline-flex items-center gap-1.5">
                  <span>Explore Products</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted/40 border border-border/60 animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="w-full py-14 border-t border-border/50 bg-gradient-to-b from-background via-muted/15 to-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
              <Sparkles className="size-3.5" />
              <span>Explore Top Products by Category</span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
              Best Sellers &amp; Daily Essentials
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Order fresh vegetables, grains, bakery items, electronics, and personal essentials directly from verified local businesses.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              asChild
              className="text-xs font-bold h-9 px-3.5 rounded-xl border-primary/30 text-primary hover:bg-primary/10 transition-colors shadow-2xs"
            >
              <Link href="/products" className="inline-flex items-center gap-1.5">
                <span>All {products.length} Products</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Filter Controls: Search & Horizontal Category Pills */}
        <div className="bg-card border rounded-2xl p-4 shadow-2xs space-y-3.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder={`Search across ${products.length} products (title, brand, category)...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs bg-muted/40 rounded-xl"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground p-0.5 cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0 justify-between sm:justify-end">
              <span className="font-medium">
                Showing <strong className="text-foreground">{filteredProducts.length}</strong> products
              </span>
              {(selectedCategory !== "all" || searchQuery) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedCategory("all");
                    setSearchQuery("");
                  }}
                  className="h-7 text-xs font-semibold text-primary hover:underline px-2 cursor-pointer"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Category Filter Chips (Horizontal Scrollable) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar scroll-smooth">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
              }`}
            >
              <Package className="size-3.5" />
              <span>All Categories</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === "all"
                    ? "bg-primary-foreground/20 text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {products.length}
              </span>
            </button>

            {categoriesList.slice(0, 6).map((c) => {
              const isSelected = selectedCategory.toLowerCase() === c.name.toLowerCase();
              const Icon = getCategoryIcon(c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => setSelectedCategory(c.name)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground border border-border/60"
                  }`}
                >
                  <Icon className="size-3.5" />
                  <span>{c.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {c.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Display */}
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border bg-card space-y-3">
            <Package className="size-10 mx-auto text-muted-foreground opacity-40" />
            <h3 className="text-sm font-bold text-foreground">No Products Found</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchQuery
                ? `No products matched your search "${searchQuery}".`
                : `No products listed in "${selectedCategory}".`}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedCategory("all");
                setSearchQuery("");
              }}
              className="text-xs font-semibold cursor-pointer"
            >
              Show All Products
            </Button>
          </div>
        ) : selectedCategory === "all" && !searchQuery.trim() ? (
          /* ================= CATEGORY-WISE GROUPED ROWS (TOP 3 CATEGORIES ONLY) ================= */
          <div className="space-y-10">
            {categoryGroups.slice(0, 3).map(({ categoryName, items }) => {
              const Icon = getCategoryIcon(categoryName);
              // Show top 3 products per category row for a clean 3-in-a-row layout
              const previewItems = items.slice(0, 4);
              return (
                <div key={categoryName} className="space-y-4">
                  {/* Category Header */}
                  <div className="flex items-center justify-between border-b pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Icon className="size-4.5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight">
                            {categoryName}
                          </h3>
                          <Badge variant="secondary" className="text-[11px] font-bold px-2 py-0.2">
                            {items.length} {items.length === 1 ? "Item" : "Items"}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedCategory(categoryName)}
                      className="text-xs font-bold text-primary hover:underline h-7 px-2 cursor-pointer gap-1"
                    >
                      <span>View All ({items.length})</span>
                      <ChevronRight className="size-3.5" />
                    </Button>
                  </div>

                  {/* Products Grid for this category: exactly 3 in one row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {previewItems.map((p) => (
                      <CompactProductCard
                        key={p.id}
                        product={p}
                        onOpenDetails={() => {
                          setSelectedProductForStores({ id: p.id, name: p.title || p.name || "Product" });
                          setStoresDialogOpen(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Link to view all remaining categories */}
            {categoryGroups.length > 3 && (
              <div className="p-6 rounded-2xl border border-dashed border-border/80 bg-muted/20 text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  Showing top 3 categories. Explore all {categoriesList.length} categories with 660+ items in our complete catalog.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="text-xs font-bold rounded-xl border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Link href="/products" className="inline-flex items-center gap-1.5">
                    <span>Browse Complete Catalog</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* ================= FILTERED GRID VIEW ================= */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-primary" />
                <span>
                  {selectedCategory !== "all" ? selectedCategory : "Search Results"}
                </span>
                <Badge variant="outline" className="text-xs font-semibold">
                  {filteredProducts.length}
                </Badge>
              </h3>
              {selectedCategory !== "all" && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedCategory("all")}
                  className="text-xs font-semibold text-primary hover:underline h-7 px-2 cursor-pointer"
                >
                  &larr; View All Categories
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredProducts.map((p) => (
                <CompactProductCard
                  key={p.id}
                  product={p}
                  onOpenDetails={() => {
                    setSelectedProductForStores({ id: p.id, name: p.title || p.name || "Product" });
                    setStoresDialogOpen(true);
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Multi-Store Comparison Dialog */}
      <ProductStoresDialog
        productId={selectedProductForStores?.id ?? null}
        productName={selectedProductForStores?.name}
        open={storesDialogOpen}
        onOpenChange={setStoresDialogOpen}
      />
    </section>
  );
}
