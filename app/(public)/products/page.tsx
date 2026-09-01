"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  Sparkles,
  Tag,
  Boxes,
  Layers,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
  Truck,
  Building2,
  SlidersHorizontal,
  Flame,
  Megaphone,
  Gift,
  ExternalLink,
  ChevronRight,
  Star,
  Percent,
  BookOpen,
  X,
  MessageSquare,
  Send,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CourseEnquiryDialog } from "@/components/public/course-enquiry-dialog";
import { UniversalFeedbackDialog, type UniversalEntityTarget } from "@/components/public/universal-feedback-dialog";
import { PortalBannerAd } from "@/components/public/portal-banner-ad";

export default function PublicProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedProgramId, setSelectedProgramId] = useState("all");
  const [programSearch, setProgramSearch] = useState("");
  const [selectedPriceRange, setSelectedPriceRange] = useState("all");

  // Feedback & Inquiry Dialog State
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [feedbackTarget, setFeedbackTarget] = useState<UniversalEntityTarget | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Load Products, Categories & Programs
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/public/products").then((r) => r.json()),
      fetch("/api/admin/marketing/products/categories?active=true").then((r) => r.json()).catch(() => ({ categories: [] })),
      fetch("/api/admin/marketing/products/programs").then((r) => r.json()).catch(() => ({ programs: [] })),
    ])
      .then(([prodData, catData, progData]) => {
        if (prodData.products) {
          setProducts(prodData.products);
        }
        if (catData.categories && Array.isArray(catData.categories)) {
          setCategories(catData.categories);
        }
        if (prodData.programs && Array.isArray(prodData.programs) && prodData.programs.length > 0) {
          setPrograms(prodData.programs);
        } else if (progData.programs && Array.isArray(progData.programs)) {
          setPrograms(progData.programs);
        }
      })
      .catch(() => toast.error("Failed to load store products"))
      .finally(() => setLoading(false));
  }, []);

  // Filtered Programs in Sidebar
  const filteredPrograms = useMemo(() => {
    const q = programSearch.trim().toLowerCase();
    if (!q) return programs;
    return programs.filter((p) =>
      (p.title || "").toLowerCase().includes(q) ||
      (p.institution_name || "").toLowerCase().includes(q)
    );
  }, [programs, programSearch]);

  // Selected Program Details
  const selectedProgramObj = useMemo(() => {
    if (selectedProgramId === "all") return null;
    return programs.find((p) => String(p.id) === String(selectedProgramId));
  }, [programs, selectedProgramId]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = search.trim().toLowerCase();
      if (q) {
        const matches =
          p.title?.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.category?.toLowerCase().includes(q);
        if (!matches) return false;
      }

      if (selectedCategory !== "all") {
        if (p.category !== selectedCategory && String(p.category_id) !== String(selectedCategory)) {
          return false;
        }
      }

      if (selectedProgramId !== "all") {
        const progIdNum = Number(selectedProgramId);
        const hasInArray = Array.isArray(p.program_ids) && (
          p.program_ids.includes(progIdNum) || p.program_ids.includes(String(progIdNum))
        );
        const hasInAssociated = Array.isArray(p.associated_programs) && p.associated_programs.some((ap: any) => ap.id === progIdNum);
        if (!hasInArray && !hasInAssociated) {
          return false;
        }
      }

      if (selectedPriceRange !== "all") {
        const price = Number(p.sale_price !== null && p.sale_price !== undefined ? p.sale_price : p.price);
        if (selectedPriceRange === "under-1000" && price >= 1000) return false;
        if (selectedPriceRange === "1000-3000" && (price < 1000 || price > 3000)) return false;
        if (selectedPriceRange === "above-3000" && price <= 3000) return false;
      }

      return true;
    });
  }, [products, search, selectedCategory, selectedProgramId, selectedPriceRange]);

  // Most Searched / Popular Products (Top 4)
  const mostSearchedProducts = useMemo(() => {
    return products.slice(0, 4);
  }, [products]);

  const handleOrderInquiry = (prod: any) => {
    setSelectedProduct(prod);
    setEnquiryOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-gradient-to-b from-primary/10 via-background to-background border-b border-border py-10 sm:py-14">
        <div className="container mx-auto px-4 text-center max-w-3xl space-y-3.5">
          <Badge variant="outline" className="text-xs font-extrabold uppercase px-3 py-1 bg-primary/10 text-primary border-primary/20">
            Official Academic Store & Student Kits
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground tracking-tight">
            Curated Study Kits, Uniforms & Lab Equipment
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
            Discover verified solved question banks, laboratory toolkits, official student apparel, and digital learning devices tailored for your course.
          </p>

          {/* SEARCH BAR */}
          <div className="pt-2 max-w-xl mx-auto flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search study kits, solved papers, uniforms..."
                className="pl-10 h-10 text-xs bg-card rounded-xl shadow-xs"
              />
            </div>
            {search && (
              <Button variant="ghost" size="sm" onClick={() => setSearch("")} className="text-xs font-bold">
                Clear
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* ================= LEFT MAIN CONTENT: 3 LISTINGS PER ROW ================= */}
          <div className="flex-1 min-w-0 w-full space-y-5">
            {/* Unified Filter Bar with Dropdowns */}
            <div className="p-3.5 bg-card border border-border rounded-2xl shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Results Count & Active Status */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-muted-foreground">
                    Showing <strong className="text-foreground text-sm font-black">{filteredProducts.length}</strong> items
                  </span>
                  {(selectedCategory !== "all" || selectedProgramId !== "all" || selectedPriceRange !== "all" || search.trim()) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCategory("all");
                        setSelectedProgramId("all");
                        setSelectedPriceRange("all");
                        setSearch("");
                      }}
                      className="text-[11px] h-7 px-2 font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                    >
                      Clear All Filters
                    </Button>
                  )}
                </div>

                {/* Dropdown Filters Grid / Row */}
                <div className="flex flex-wrap items-center gap-2.5">
                  {/* 1. Category Dropdown */}
                  <div className="w-[180px] sm:w-[200px]">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="h-9 text-xs font-bold bg-background border-border shadow-2xs">
                        <div className="flex items-center gap-1.5 truncate">
                          <Tag className="w-3.5 h-3.5 text-primary shrink-0" />
                          <SelectValue placeholder="All Categories" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="all">
                          All Categories ({products.length})
                        </SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id || cat.name} value={cat.name}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 2. Course / Academic Program Dropdown */}
                  <div className="w-[200px] sm:w-[230px]">
                    <Select value={selectedProgramId} onValueChange={setSelectedProgramId}>
                      <SelectTrigger className="h-9 text-xs font-bold bg-background border-border shadow-2xs">
                        <div className="flex items-center gap-1.5 truncate">
                          <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
                          <SelectValue placeholder="All Courses & Programs" />
                        </div>
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        <SelectItem value="all">
                          All Courses & Programs ({programs.length})
                        </SelectItem>
                        {programs.map((prog) => (
                          <SelectItem key={prog.id} value={String(prog.id)}>
                            {prog.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 3. Price Filter Dropdown */}
                  <div className="w-[130px] sm:w-[150px]">
                    <Select value={selectedPriceRange} onValueChange={setSelectedPriceRange}>
                      <SelectTrigger className="h-9 text-xs font-bold bg-background border-border shadow-2xs">
                        <SelectValue placeholder="All Prices" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Prices</SelectItem>
                        <SelectItem value="under-1000">Under ₹1,000</SelectItem>
                        <SelectItem value="1000-3000">₹1,000 - ₹3,000</SelectItem>
                        <SelectItem value="above-3000">Above ₹3,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Active Filter Badges Pills Row */}
              {(selectedCategory !== "all" || selectedProgramId !== "all" || selectedPriceRange !== "all") && (
                <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/60">
                  <span className="text-[11px] font-bold text-muted-foreground mr-1">Active Filters:</span>
                  
                  {selectedCategory !== "all" && (
                    <Badge
                      variant="secondary"
                      className="text-[11px] font-bold py-0.5 px-2 bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5"
                    >
                      <Tag className="h-3 w-3 shrink-0" />
                      <span>Category: {selectedCategory}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedCategory("all")}
                        className="hover:text-rose-600 cursor-pointer ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}

                  {selectedProgramObj && (
                    <Badge
                      variant="secondary"
                      className="text-[11px] font-bold py-0.5 px-2 bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5"
                    >
                      <GraduationCap className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[220px]">Course: {selectedProgramObj.title}</span>
                      <button
                        type="button"
                        onClick={() => setSelectedProgramId("all")}
                        className="hover:text-rose-600 cursor-pointer ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}

                  {selectedPriceRange !== "all" && (
                    <Badge
                      variant="secondary"
                      className="text-[11px] font-bold py-0.5 px-2 bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5"
                    >
                      <span>
                        Price:{" "}
                        {selectedPriceRange === "under-1000"
                          ? "Under ₹1,000"
                          : selectedPriceRange === "1000-3000"
                          ? "₹1,000 - ₹3,000"
                          : "Above ₹3,000"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedPriceRange("all")}
                        className="hover:text-rose-600 cursor-pointer ml-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* 3 LISTINGS PER ROW GRID */}
            {loading ? (
              <div className="p-16 text-center text-xs text-muted-foreground">Loading products...</div>
            ) : filteredProducts.length === 0 ? (
              <Card className="p-12 text-center space-y-3 bg-card border-border rounded-2xl">
                <ShoppingBag className="h-10 w-10 text-muted-foreground/40 mx-auto" />
                <h3 className="font-bold text-sm text-foreground">No products match your criteria</h3>
                <p className="text-xs text-muted-foreground">Try clearing filters or searching for different terms.</p>
                <Button size="sm" onClick={() => { setSearch(""); setSelectedCategory("all"); setSelectedProgramId("all"); setSelectedPriceRange("all"); }}>
                  Reset Filters
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredProducts.map((prod) => (
                  <Card
                    key={prod.id}
                    className="overflow-hidden border-border bg-card shadow-2xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between rounded-2xl group"
                  >
                    <div className="space-y-3">
                      {/* Product Image */}
                      <div className="relative h-44 w-full bg-muted overflow-hidden">
                        <img
                          src={prod.image_url || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80"}
                          alt={prod.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                          <Badge variant="secondary" className="text-[10px] font-extrabold bg-background/90 backdrop-blur-xs text-foreground shadow-2xs">
                            {prod.category}
                          </Badge>
                          {prod.badge_text && (
                            <Badge variant="outline" className="text-[10px] font-extrabold bg-primary text-primary-foreground border-transparent shadow-2xs">
                              {prod.badge_text}
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Title & Institution */}
                      <div className="px-4 space-y-1">
                        {prod.institution_name && (
                          <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> {prod.institution_name}
                          </span>
                        )}
                        <h3 className="font-extrabold text-sm text-foreground line-clamp-2 leading-snug">{prod.title}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">{prod.description}</p>
                      </div>

                      {/* Associated Academic Course Tags */}
                      {Array.isArray(prod.associated_programs) && prod.associated_programs.length > 0 && (
                        <div className="px-4 flex flex-wrap gap-1 pt-0.5">
                          {prod.associated_programs.slice(0, 2).map((prog: any) => (
                            <span
                              key={prog.id}
                              className="text-[9px] font-bold text-primary bg-primary/10 border border-primary/20 px-1.5 py-0.5 rounded-md flex items-center gap-1"
                            >
                              <GraduationCap className="w-2.5 h-2.5" />
                              <span className="truncate max-w-[120px]">{prog.title}</span>
                            </span>
                          ))}
                          {prod.associated_programs.length > 2 && (
                            <span className="text-[9px] font-semibold text-muted-foreground self-center">
                              +{prod.associated_programs.length - 2} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Features Preview */}
                      {Array.isArray(prod.features) && prod.features.length > 0 && (
                        <div className="px-4 space-y-1">
                          {prod.features.slice(0, 2).map((f: string, idx: number) => (
                            <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                              <span className="truncate">{f}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Price & Action */}
                    <div className="p-4 border-t border-border mt-3 space-y-3 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-black text-foreground">
                            ₹{Number(prod.sale_price !== null && prod.sale_price !== undefined ? prod.sale_price : prod.price).toLocaleString("en-IN")}
                          </span>
                          {prod.sale_price && Number(prod.sale_price) < Number(prod.price) && (
                            <span className="text-[11px] text-muted-foreground line-through">
                              ₹{Number(prod.price).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] text-emerald-600 font-bold block">
                          Verified Delivery
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
                        <button
                          type="button"
                          onClick={() => {
                            setFeedbackTarget({
                              type: "product",
                              id: prod.id,
                              title: prod.title,
                              subtitle: `${prod.category} • Academic Store`,
                              avg_rating: 4.8,
                              review_count: 16,
                            });
                            setFeedbackOpen(true);
                          }}
                          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md border border-amber-300 bg-amber-50/70 text-xs font-bold text-amber-800 transition hover:bg-amber-100 cursor-pointer"
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-amber-600" />
                          <span>Reviews & Q&A</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOrderInquiry(prod)}
                          className="flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary text-xs font-bold text-primary-foreground transition hover:bg-primary/90 cursor-pointer shadow-xs"
                        >
                          <Send className="h-3.5 w-3.5" />
                          <span>Enquiry</span>
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* ================= RIGHT SIDEBAR ================= */}
          <aside className="w-full lg:w-80 xl:w-88 shrink-0 space-y-6">
            {/* 1. COURSES & ACADEMIC PROGRAMS FILTER WIDGET */}
            <Card className="p-4 bg-card border-border shadow-xs rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-primary" />
                  Select Course / Program
                </h3>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {programs.length} Courses
                </span>
              </div>

              {/* Course Search Input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={programSearch}
                  onChange={(e) => setProgramSearch(e.target.value)}
                  placeholder="Search courses or institutes..."
                  className="pl-8 pr-7 h-8 text-xs bg-background rounded-lg border-border"
                />
                {programSearch && (
                  <button
                    type="button"
                    onClick={() => setProgramSearch("")}
                    className="absolute right-2 top-2 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Selected Course Active Chip */}
              {selectedProgramObj && (
                <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
                  <div className="truncate min-w-0 pr-2">
                    <span className="font-bold text-primary block truncate">{selectedProgramObj.title}</span>
                    {selectedProgramObj.institution_name && (
                      <span className="text-[10px] text-muted-foreground block truncate">
                        {selectedProgramObj.institution_name}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProgramId("all")}
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-600 shrink-0 cursor-pointer"
                    title="Clear course filter"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}

              {/* Scrollable Course Selection List */}
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                <button
                  type="button"
                  onClick={() => setSelectedProgramId("all")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold transition flex items-center justify-between cursor-pointer ${
                    selectedProgramId === "all"
                      ? "bg-primary text-primary-foreground font-bold shadow-2xs"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  <span className="truncate">All Courses & Programs</span>
                  <Badge variant={selectedProgramId === "all" ? "outline" : "secondary"} className="text-[10px] ml-1 shrink-0">
                    {products.length}
                  </Badge>
                </button>

                {filteredPrograms.length === 0 ? (
                  <div className="py-4 text-center space-y-1">
                    <p className="text-[11px] text-muted-foreground">
                      No courses found matching &quot;{programSearch}&quot;
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setProgramSearch("")}
                      className="text-[10px] h-6 px-2 text-primary"
                    >
                      Clear search
                    </Button>
                  </div>
                ) : (
                  filteredPrograms.map((prog) => {
                    const isSelected = String(prog.id) === String(selectedProgramId);
                    return (
                      <button
                        key={prog.id}
                        type="button"
                        onClick={() => setSelectedProgramId(isSelected ? "all" : String(prog.id))}
                        className={`w-full text-left p-2 rounded-lg text-xs transition flex flex-col gap-0.5 cursor-pointer ${
                          isSelected
                            ? "bg-primary/10 border border-primary/30 text-primary font-bold shadow-2xs"
                            : "hover:bg-muted text-foreground border border-transparent"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 w-full">
                          <span className="truncate font-bold text-xs">{prog.title}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />}
                        </div>
                        {prog.institution_name && (
                          <span className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
                            <Building2 className="w-2.5 h-2.5 shrink-0 opacity-70" />
                            {prog.institution_name}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </Card>

            {/* Dynamic Product Banner Ad (Right Sidebar) */}
            <PortalBannerAd
              section="product"
              placement="right_sidebar"
              fallbackBadge="STORE EXCLUSIVE"
              fallbackTitle="Verified Lab Kits & Study Essentials"
              fallbackDescription="Order genuine tools, uniforms, and approved books with direct campus delivery."
              fallbackCta="View Catalog"
              fallbackUrl="/products"
            />

            {/* 2. MOST SEARCHED / TRENDING PRODUCTS WIDGET */}
            <Card className="p-4 bg-card border-border shadow-xs rounded-2xl space-y-3">
              <div className="flex items-center justify-between border-b border-border pb-2.5">
                <h3 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500" />
                  Most Searched Products
                </h3>
                <Badge variant="outline" className="text-[10px] font-bold bg-rose-500/10 text-rose-600 border-rose-500/20">
                  Trending
                </Badge>
              </div>

              <div className="space-y-2.5">
                {mostSearchedProducts.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => handleOrderInquiry(p)}
                    className="p-2 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer flex items-center gap-3 group"
                  >
                    <img
                      src={p.image_url || "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80"}
                      alt={p.title}
                      className="w-12 h-12 rounded-lg object-cover bg-muted shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs text-foreground truncate group-hover:text-primary transition-colors">
                        {p.title}
                      </h4>
                      <div className="flex items-center justify-between mt-0.5">
                        <span className="text-xs font-black text-foreground">
                          ₹{Number(p.sale_price || p.price).toLocaleString("en-IN")}
                        </span>
                        <span className="text-[9px] text-emerald-600 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
                          Popular
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* 3. HIGH-IMPACT ADVERTISEMENT / PROMOTIONAL BANNERS */}
            <div className="space-y-4">
              {/* Primary Ad Banner */}
              <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-white shadow-md border border-indigo-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px] font-extrabold uppercase bg-indigo-500/20 text-indigo-300 border-indigo-500/30 flex items-center gap-1">
                    <Megaphone className="w-3 h-3 text-indigo-400" /> Sponsored Ad
                  </Badge>
                  <span className="text-[10px] font-bold text-indigo-400">Limited Time</span>
                </div>

                <div className="space-y-1">
                  <h4 className="font-black text-base leading-snug">
                    Flat 30% Off on Engineering & Robotics Lab Kits
                  </h4>
                  <p className="text-xs text-indigo-200/80 leading-relaxed">
                    Exclusive student coupon on complete Arduino & sensor starter modules for affiliated institutions.
                  </p>
                </div>

                <div className="pt-1 flex items-center justify-between">
                  <span className="text-xs font-black text-amber-300">Code: STEM30</span>
                  <Link href="/courses">
                    <Button size="sm" className="h-7 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white gap-1 rounded-lg">
                      Claim Offer <ArrowRight className="w-3 h-3" />
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Secondary Ad Banner */}
              <div className="relative overflow-hidden rounded-2xl p-4 bg-gradient-to-br from-amber-500/15 via-background to-amber-500/5 border border-amber-500/30 space-y-2">
                <div className="flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-black text-foreground">Free Institutional Delivery</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Order any official uniform set or 15-year solved paper series and get doorstep express delivery.
                </p>
                <div className="pt-1">
                  <span className="text-[11px] font-extrabold text-primary hover:underline flex items-center gap-1 cursor-pointer">
                    Explore Uniform Store <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* Inquiry Dialog */}
      {selectedProduct && (
        <CourseEnquiryDialog
          open={enquiryOpen}
          onOpenChange={setEnquiryOpen}
          course={{
            id: selectedProduct.id,
            title: selectedProduct.title,
            institute: selectedProduct.institution_name || "Official Store",
            fee_amount: selectedProduct.sale_price || selectedProduct.price,
            institutionId: selectedProduct.institution_id,
            type: "product",
            is_product: true,
          }}
        />
      )}

      {/* Universal Feedback Dialog */}
      <UniversalFeedbackDialog
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        target={feedbackTarget}
      />
    </div>
  );
}
