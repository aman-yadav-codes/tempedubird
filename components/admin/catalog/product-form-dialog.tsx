"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Package,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Layers,
  Upload,
  X,
  Loader2,
  Briefcase,
  Tag,
  IndianRupee,
} from "lucide-react";
import { toast } from "sonner";
import { useBusinessCurrency } from "@/hooks/use-business-currency";

export const COMMON_UOM_OPTIONS = [
  "Piece",
  "kg",
  "gram",
  "litre",
  "ml",
  "pack",
  "box",
  "bottle",
  "can",
  "pair",
  "dozen",
  "meter",
  "set",
  "roll",
  "unit",
];

export interface ProductVariantItem {
  id: string;
  name: string;
  price: string | number;
  regular_price?: string | number;
  unit: string;
  sku?: string;
}

export interface ProductFormData {
  id?: number;
  title: string;
  slug?: string;
  description?: string;
  brand?: string;
  model?: string;
  business_category_id?: number | string;
  main_category_id?: number | string;
  category_id?: number | string;
  subcategory_id?: number | string;
  category_name?: string;
  business_profile_id?: number | string | null;
  professional_profile_id?: number | string | null;
  image_url?: string;
  gallery?: string[];
  attributes?: Record<string, string>;
  variants?: ProductVariantItem[];
  synonyms?: string[];
  sku?: string;
  unit?: string;
  unit_quantity?: number;
  price: number | string;
  sale_price?: number | string | null;
  stock_quantity?: number;
  status?: "active" | "draft" | "archived";
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: ProductFormData | null;
  onSuccess: () => void;
  apiEndpoint?: string; // defaults to "/api/admin/marketing/products"
  accessToken?: string | null;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  onSuccess,
  apiEndpoint = "/api/admin/marketing/products",
  accessToken,
}: ProductFormDialogProps) {
  const { countryCode, currencyCode, currencySymbol, formatPrice } = useBusinessCurrency();
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("category");

  // Options
  const [categories, setCategories] = useState<any[]>([]);
  const [businessCategories, setBusinessCategories] = useState<any[]>([]);
  const [availableBusinesses, setAvailableBusinesses] = useState<any[]>([]);
  const [availableProfessionals, setAvailableProfessionals] = useState<any[]>([]);

  // Form States
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [description, setDescription] = useState("");
  const [businessCategoryId, setBusinessCategoryId] = useState<string>("");
  const [mainCategoryId, setMainCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [businessProfileId, setBusinessProfileId] = useState<string>("none");
  const [professionalProfileId, setProfessionalProfileId] = useState<string>("none");
  const [synonymsText, setSynonymsText] = useState("");
  const [defaultImageUrl, setDefaultImageUrl] = useState("");
  const [additionalImagesText, setAdditionalImagesText] = useState("");
  const [attributeRows, setAttributeRows] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);
  const [variants, setVariants] = useState<ProductVariantItem[]>([]);
  const [sku, setSku] = useState("");
  const [unitOfMeasurement, setUnitOfMeasurement] = useState("Piece");
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [stockQuantity, setStockQuantity] = useState("100");
  const [isActive, setIsActive] = useState(true);

  // Upload States
  const [uploadingDefaultImage, setUploadingDefaultImage] = useState(false);
  const [uploadingAdditional, setUploadingAdditional] = useState(false);

  // Product auto-suggestions when typing
  const [productSuggestions, setProductSuggestions] = useState<any[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setProductSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(`/api/admin/catalog/products/autocomplete?q=${encodeURIComponent(trimmed)}`);
        const json = await res.json();
        if (json?.success && Array.isArray(json.suggestions)) {
          setProductSuggestions(json.suggestions);
          setShowSuggestions(json.suggestions.length > 0);
        } else {
          setProductSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (err) {
        console.warn("Product autocomplete fetch error:", err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [name]);

  const handleSelectSuggestion = (s: any) => {
    setName(s.name);
    if (s.slug) setSlug(s.slug);
    if (s.description && !description) setDescription(s.description);
    if (s.unit_of_measurement && !unitOfMeasurement) setUnitOfMeasurement(s.unit_of_measurement);
    if (s.suggested_price_inr && (!price || price === "0")) setPrice(String(s.suggested_price_inr));
    if (s.default_image_url && !defaultImageUrl) setDefaultImageUrl(s.default_image_url);
    if (s.synonyms && Array.isArray(s.synonyms) && s.synonyms.length > 0 && !synonymsText) {
      setSynonymsText(s.synonyms.join(", "));
    }
    if (s.category_id && !mainCategoryId) {
      setMainCategoryId(String(s.category_id));
    }
    if (s.subcategory_id && !subcategoryId) {
      setSubcategoryId(String(s.subcategory_id));
    }
    setShowSuggestions(false);
  };

  // Slug auto-generation
  const handleNameChange = (val: string) => {
    setName(val);
    if (!product?.id) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 80);
      setSlug(generated);
    }
  };

  // Fetch Categories & Assignees on Open
  useEffect(() => {
    if (!open) return;

    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    Promise.all([
      fetch(`/api/admin/categories?type=product&limit=1000`, { headers }).then((r) => r.json()),
      fetch(`/api/admin/categories?type=business&onlyRoot=true&limit=100`, { headers }).then((r) => r.json()),
      fetch(`/api/admin/catalog/assignees`, { headers }).then((r) => r.json()),
    ])
      .then(([catData, bizData, assigneesData]) => {
        if (catData?.data) setCategories(catData.data);
        if (bizData?.data) setBusinessCategories(bizData.data);
        if (assigneesData?.businesses) setAvailableBusinesses(assigneesData.businesses);
        if (assigneesData?.professionals) setAvailableProfessionals(assigneesData.professionals);
      })
      .catch((err) => console.warn("Failed loading categories/assignees:", err));
  }, [open, accessToken]);

  // Sync Form fields with Product
  useEffect(() => {
    if (product) {
      setName(product.title || "");
      setSlug(product.slug || "");
      setBrand(product.brand || "");
      setModel(product.model || "");
      setDescription(product.description || "");
      setBusinessCategoryId(product.business_category_id ? String(product.business_category_id) : "");
      setMainCategoryId(product.main_category_id ? String(product.main_category_id) : product.category_id ? String(product.category_id) : "");
      setSubcategoryId(product.subcategory_id ? String(product.subcategory_id) : "");
      setBusinessProfileId(product.business_profile_id ? String(product.business_profile_id) : "none");
      setProfessionalProfileId(product.professional_profile_id ? String(product.professional_profile_id) : "none");
      setSynonymsText(Array.isArray(product.synonyms) ? product.synonyms.join(", ") : "");
      setDefaultImageUrl(product.image_url || "");
      setAdditionalImagesText(Array.isArray(product.gallery) ? product.gallery.join("\n") : "");

      if (product.attributes && typeof product.attributes === "object") {
        const rows = Object.entries(product.attributes).map(([k, v]) => ({ key: k, value: String(v) }));
        setAttributeRows(rows.length ? rows : [{ key: "", value: "" }]);
      } else {
        setAttributeRows([{ key: "", value: "" }]);
      }

      setVariants(Array.isArray(product.variants) ? product.variants : []);
      setSku(product.sku || "");
      setUnitOfMeasurement(product.unit || "Piece");
      setPrice(product.price ? String(product.price) : "");
      setSalePrice(product.sale_price !== null && product.sale_price !== undefined ? String(product.sale_price) : "");
      setStockQuantity(product.stock_quantity ? String(product.stock_quantity) : "100");
      setIsActive(product.status !== "draft" && product.status !== "archived");
    } else {
      setName("");
      setSlug("");
      setBrand("");
      setModel("");
      setDescription("");
      setBusinessCategoryId("");
      setMainCategoryId("");
      setSubcategoryId("");
      setBusinessProfileId("none");
      setProfessionalProfileId("none");
      setSynonymsText("");
      setDefaultImageUrl("");
      setAdditionalImagesText("");
      setAttributeRows([{ key: "", value: "" }]);
      setVariants([]);
      setSku("");
      setUnitOfMeasurement("Piece");
      setPrice("");
      setSalePrice("");
      setStockQuantity("100");
      setIsActive(true);
    }
    setActiveTab("category");
  }, [product, open]);

  // Category Filtering
  const mainCategories = useMemo(() => {
    return categories.filter((c) => {
      if (c.parent_id) return false;
      if (!businessCategoryId || businessCategoryId === "all") return true;
      return String(c.business_category_id) === String(businessCategoryId);
    });
  }, [categories, businessCategoryId]);

  const availableSubcategories = useMemo(() => {
    if (!mainCategoryId) return [];
    const mainIdNum = Number(mainCategoryId);
    return categories.filter((c) => c.parent_id === mainIdNum);
  }, [categories, mainCategoryId]);

  // Attribute Handlers
  const addAttributeRow = () => {
    setAttributeRows((prev) => [...prev, { key: "", value: "" }]);
  };
  const updateAttributeRow = (idx: number, field: "key" | "value", val: string) => {
    setAttributeRows((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };
  const removeAttributeRow = (idx: number) => {
    setAttributeRows((prev) => prev.filter((_, i) => i !== idx));
  };

  // Upload Handlers
  const handleUploadDefaultImage = async (file: File) => {
    setUploadingDefaultImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "products");

      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setDefaultImageUrl(data.url);
        toast.success("Default image uploaded successfully");
      } else {
        toast.error(data.error || "Image upload failed");
      }
    } catch {
      toast.error("Network error during image upload");
    } finally {
      setUploadingDefaultImage(false);
    }
  };

  const handleUploadAdditionalImages = async (files: FileList) => {
    setUploadingAdditional(true);
    const uploadedUrls: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "products");
        const res = await fetch("/api/admin/uploads/image", {
          method: "POST",
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
          body: formData,
        });
        const data = await res.json();
        if (data.url) uploadedUrls.push(data.url);
      }
      if (uploadedUrls.length > 0) {
        const currentList = additionalImagesText.split("\n").filter((s) => s.trim());
        setAdditionalImagesText([...currentList, ...uploadedUrls].join("\n"));
        toast.success(`Uploaded ${uploadedUrls.length} additional image(s)`);
      }
    } catch {
      toast.error("Failed to upload some gallery photos");
    } finally {
      setUploadingAdditional(false);
    }
  };

  // Submit Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Product name is required");
      setActiveTab("basic");
      return;
    }

    setSubmitting(true);
    try {
      // Build attributes
      const attributesObj: Record<string, string> = {};
      attributeRows.forEach((r) => {
        if (r.key.trim() && r.value.trim()) {
          attributesObj[r.key.trim()] = r.value.trim();
        }
      });

      // Gallery list
      const galleryList = additionalImagesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      // Synonyms
      const synonymsList = synonymsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      // Category name lookup
      const selectedMainCat = categories.find((c) => String(c.id) === mainCategoryId);
      const categoryName = selectedMainCat?.name || "General";

      const payload = {
        id: product?.id,
        title: name.trim(),
        name: name.trim(),
        slug: slug.trim() || undefined,
        brand: brand.trim() || null,
        model: model.trim() || null,
        description: description.trim() || null,
        category: categoryName,
        category_id: mainCategoryId ? Number(mainCategoryId) : null,
        main_category_id: mainCategoryId ? Number(mainCategoryId) : null,
        subcategory_id: subcategoryId ? Number(subcategoryId) : null,
        business_profile_id: businessProfileId && businessProfileId !== "none" ? Number(businessProfileId) : null,
        professional_profile_id: professionalProfileId && professionalProfileId !== "none" ? Number(professionalProfileId) : null,
        image_url: defaultImageUrl.trim() || null,
        default_image_url: defaultImageUrl.trim() || null,
        gallery: galleryList,
        additional_images: galleryList,
        attributes: attributesObj,
        variants: variants.filter((v) => v.name.trim() && v.price),
        synonyms: synonymsList,
        sku: sku.trim() || null,
        unit: unitOfMeasurement || "Piece",
        unit_of_measurement: unitOfMeasurement || "Piece",
        price: parseFloat(price) || 0,
        suggested_price: parseFloat(price) || 0,
        suggested_price_inr: parseFloat(price) || 0,
        currency: currencyCode || "INR",
        sale_price: salePrice ? parseFloat(salePrice) : null,
        stock_quantity: parseInt(stockQuantity) || 100,
        status: isActive ? "active" : "draft",
        is_active: isActive,
      };

      const method = product?.id ? "PUT" : "POST";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(apiEndpoint, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save product");

      toast.success(product?.id ? "Product updated successfully!" : "Product created successfully!");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 flex flex-col">
        {/* HEADER */}
        <div className="p-5 pb-4 border-b border-border bg-card">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Package className="size-5 text-primary" />
              <span>{product?.id ? "Edit Product Listing" : "Add Product"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure product details, categories, default imagery, specifications, variants, and pricing.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* FORM CONTENT */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 h-9">
              <TabsTrigger value="category" className="text-xs">Category & Synonyms</TabsTrigger>
              <TabsTrigger value="basic" className="text-xs">Basic Info</TabsTrigger>
              <TabsTrigger value="media-attrs" className="text-xs">Media & Attributes</TabsTrigger>
              <TabsTrigger value="pricing" className="text-xs">Pricing & Variants</TabsTrigger>
            </TabsList>

            {/* TAB 1: CATEGORY & SYNONYMS */}
            <TabsContent value="category" className="space-y-3 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Business Type / Sector *</Label>
                  <Select
                    value={businessCategoryId}
                    onValueChange={(val) => {
                      setBusinessCategoryId(val);
                      setMainCategoryId("");
                      setSubcategoryId("");
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select Business Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Business Types</SelectItem>
                      {businessCategories.map((bc) => (
                        <SelectItem key={bc.id} value={String(bc.id)}>
                          {bc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Main Product Category *</Label>
                  <Select
                    value={mainCategoryId}
                    onValueChange={(val) => {
                      setMainCategoryId(val);
                      setSubcategoryId("");
                      if (!businessCategoryId || businessCategoryId === "all") {
                        const cat = categories.find((c) => String(c.id) === val);
                        if (cat?.business_category_id) {
                          setBusinessCategoryId(String(cat.business_category_id));
                        }
                      }
                    }}
                    disabled={mainCategories.length === 0}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={mainCategories.length === 0 ? "No Categories Found" : "Select Product Category"} />
                    </SelectTrigger>
                    <SelectContent>
                      {mainCategories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Sub Product Category</Label>
                  <Select
                    value={subcategoryId}
                    onValueChange={setSubcategoryId}
                    disabled={!mainCategoryId || availableSubcategories.length === 0}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={!mainCategoryId ? "Select Category First" : (availableSubcategories.length === 0 ? "No Subcategories Found" : "Select Subcategory")} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSubcategories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Product Synonyms (Search Keywords)</Label>
                <Input
                  placeholder="e.g. tee, collar shirt, sportswear, polo (comma-separated)"
                  value={synonymsText}
                  onChange={(e) => setSynonymsText(e.target.value)}
                  className="h-8 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Comma-separated alternate names and synonyms to enhance discovery when customers search for this item.
                </p>
              </div>
            </TabsContent>

            {/* TAB 2: BASIC INFO */}
            <TabsContent value="basic" className="space-y-3 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 relative">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">Product Name *</Label>
                    {loadingSuggestions && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Loader2 className="size-2.5 animate-spin text-primary" /> Searching...
                      </span>
                    )}
                  </div>
                  <Input
                    placeholder="e.g. Premium Cotton Polo T-Shirt"
                    value={name}
                    onChange={(e) => {
                      handleNameChange(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      if (productSuggestions.length > 0) setShowSuggestions(true);
                    }}
                    required
                    className="h-8 text-xs"
                  />

                  {/* Auto-suggestions dropdown */}
                  {showSuggestions && productSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-popover text-popover-foreground border rounded-xl shadow-xl max-h-56 overflow-y-auto p-1 space-y-0.5 animate-in fade-in-50 duration-150">
                      <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider border-b">
                        Available Products ({productSuggestions.length})
                      </div>
                      {productSuggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectSuggestion(s);
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors flex items-center gap-2.5 text-xs cursor-pointer group"
                        >
                          {s.default_image_url ? (
                            <img
                              src={s.default_image_url}
                              alt=""
                              className="size-7 rounded-md object-cover bg-muted shrink-0"
                            />
                          ) : (
                            <div className="size-7 rounded-md bg-primary/10 text-primary flex items-center justify-center shrink-0">
                              <Package className="size-3.5" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-foreground truncate group-hover:text-primary">
                              {s.name}
                            </div>
                            {s.unit_of_measurement && (
                              <div className="text-[10px] text-muted-foreground">
                                Unit: {s.unit_of_measurement} {s.suggested_price_inr ? `• ₹${s.suggested_price_inr}` : ""}
                              </div>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">URL Slug *</Label>
                  <Input
                    placeholder="premium-cotton-polo-t-shirt"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Product Description</Label>
                <Textarea
                  placeholder="Provide a comprehensive product description, specifications, and overview..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="text-xs"
                />
              </div>

              <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold">Active / Inactive Status</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Active products appear in your public store and customer search.
                  </p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>
            </TabsContent>

            {/* TAB 3: MEDIA & ATTRIBUTES */}
            <TabsContent value="media-attrs" className="space-y-4 pt-3">
              {/* DEFAULT IMAGE */}
              <div className="p-3.5 border rounded-xl bg-muted/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <ImageIcon className="size-3.5 text-primary" /> Default Product Image
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      Upload or replace the primary product image.
                    </p>
                  </div>
                  {defaultImageUrl && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] gap-1">
                      <CheckCircle2 className="size-3" /> Image Set
                    </Badge>
                  )}
                </div>

                <div className="flex items-start gap-3.5">
                  {defaultImageUrl ? (
                    <div className="relative group size-20 rounded-xl border overflow-hidden shrink-0 bg-muted shadow-xs">
                      <img
                        src={defaultImageUrl}
                        alt="Preview"
                        className="size-full object-cover"
                        onError={(e) => {
                          (e.target as any).src = "https://placehold.co/100x100/f1f5f9/64748b?text=Default";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setDefaultImageUrl("")}
                        className="absolute top-1 right-1 size-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        title="Remove default image"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="size-20 rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center text-muted-foreground shrink-0 bg-muted/20">
                      <ImageIcon className="size-6 text-muted-foreground/50" />
                      <span className="text-[9px] mt-1 font-semibold">No Image</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs">
                        {uploadingDefaultImage ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <Upload className="size-3.5" />
                        )}
                        <span>{defaultImageUrl ? "Replace Image" : "Upload Image"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadingDefaultImage}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadDefaultImage(f);
                          }}
                        />
                      </label>

                      {defaultImageUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setDefaultImageUrl("")}
                          className="h-7 text-xs text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-3 mr-1" /> Remove
                        </Button>
                      )}
                    </div>

                    <Input
                      placeholder="Or paste direct image URL (https://...)"
                      value={defaultImageUrl}
                      onChange={(e) => setDefaultImageUrl(e.target.value)}
                      className="h-7 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* GALLERY IMAGES */}
              <div className="p-3.5 border rounded-xl bg-muted/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold flex items-center gap-1.5">
                      <Layers className="size-3.5 text-primary" /> Additional Gallery Images
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      Upload or paste multiple product gallery photos.
                    </p>
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border border-border bg-background hover:bg-muted transition-colors shadow-xs">
                    {uploadingAdditional ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <Plus className="size-3" />
                    )}
                    <span>Upload Photos</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      disabled={uploadingAdditional}
                      onChange={(e) => {
                        if (e.target.files) handleUploadAdditionalImages(e.target.files);
                      }}
                    />
                  </label>
                </div>

                {additionalImagesText.split("\n").filter((s) => s.trim()).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {additionalImagesText
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((imgUrl, idx) => (
                        <div key={idx} className="relative group size-14 rounded-lg border overflow-hidden shrink-0 bg-muted">
                          <img
                            src={imgUrl}
                            alt={`Gallery ${idx + 1}`}
                            className="size-full object-cover"
                            onError={(e) => {
                              (e.target as any).src = "https://placehold.co/80x80/f1f5f9/64748b?text=Img";
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const list = additionalImagesText.split("\n").map((s) => s.trim()).filter(Boolean);
                              list.splice(idx, 1);
                              setAdditionalImagesText(list.join("\n"));
                            }}
                            className="absolute top-0.5 right-0.5 size-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete this image"
                          >
                            <X className="size-2.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                )}

                <Textarea
                  placeholder="One image URL per line..."
                  value={additionalImagesText}
                  onChange={(e) => setAdditionalImagesText(e.target.value)}
                  rows={2}
                  className="text-xs font-mono"
                />
              </div>

              {/* PRODUCT ATTRIBUTES */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold">Product Attributes</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Custom key-value attributes (e.g. Color, Size, Material, Weight).
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAttributeRow}
                    className="h-7 text-[11px] gap-1"
                  >
                    <Plus className="size-3" /> Add Attribute
                  </Button>
                </div>

                <div className="space-y-2">
                  {attributeRows.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder="Attribute name (e.g. Color)"
                        value={row.key}
                        onChange={(e) => updateAttributeRow(idx, "key", e.target.value)}
                        className="h-7 text-xs flex-1"
                      />
                      <Input
                        placeholder="Value (e.g. Navy Blue)"
                        value={row.value}
                        onChange={(e) => updateAttributeRow(idx, "value", e.target.value)}
                        className="h-7 text-xs flex-1"
                      />
                      {attributeRows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAttributeRow(idx)}
                          className="size-7 text-destructive shrink-0"
                        >
                          <Trash2 className="size-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* TAB 4: PRICING & VARIANTS */}
            <TabsContent value="pricing" className="space-y-4 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">SKU / Item Code</Label>
                  <Input
                    placeholder="e.g. SKU-PROD-1002"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Unit of Measurement *</Label>
                  <Select value={unitOfMeasurement} onValueChange={setUnitOfMeasurement}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select Unit" />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_UOM_OPTIONS.map((uom) => (
                        <SelectItem key={uom} value={uom}>
                          {uom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* BASE STORE PRICING */}
              <div className="p-3.5 border rounded-xl bg-muted/10 border-border space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <span className="text-primary font-bold text-xs">{currencySymbol}</span> Store Pricing & Inventory ({currencyCode})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Store Price ({currencySymbol}) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 45.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="h-8 text-xs font-mono font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">MRP / Regular Price ({currencySymbol})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 60.00"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Available Stock Quantity</Label>
                    <Input
                      type="number"
                      placeholder="100"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* PRODUCT VARIANTS & PACK SIZES */}
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Layers className="size-3.5 text-primary" /> Product Variants &amp; Pricing (Pack Sizes, Weights, Options)
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      Define custom variants with individual prices shown in storefront dropdowns (e.g. 250 g, 500 g, 1 kg).
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setVariants((prev) => [
                        ...prev,
                        {
                          id: `v-${Date.now()}`,
                          name: "",
                          price: "",
                          regular_price: "",
                          unit: unitOfMeasurement || "Piece",
                          sku: "",
                        },
                      ])
                    }
                    className="h-7 text-[11px] gap-1 cursor-pointer"
                  >
                    <Plus className="size-3" /> Add Variant
                  </Button>
                </div>

                {variants.length === 0 ? (
                  <div className="p-3 text-center rounded-xl border border-dashed text-xs text-muted-foreground bg-muted/10">
                    No custom variants added. Standard unit pricing applies. Click <strong>+ Add Variant</strong> to define pack sizes (e.g., 250 g, 500 g, 1 kg).
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-muted-foreground px-1">
                      <span className="col-span-4">Variant Name / Pack</span>
                      <span className="col-span-2">Price ({currencySymbol}) *</span>
                      <span className="col-span-2">MRP / Reg Price</span>
                      <span className="col-span-2">Unit</span>
                      <span className="col-span-2 text-right">Action</span>
                    </div>

                    {variants.map((v, vIdx) => (
                      <div key={v.id || vIdx} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-xl border border-border">
                        <div className="col-span-4">
                          <Input
                            placeholder="e.g. 500 g or 1 kg Pack"
                            value={v.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setVariants((prev) => {
                                const copy = [...prev];
                                copy[vIdx] = { ...copy[vIdx], name: val };
                                return copy;
                              });
                            }}
                            className="h-8 text-xs font-semibold"
                          />
                        </div>

                        <div className="col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="Price"
                            value={v.price}
                            onChange={(e) => {
                              const val = e.target.value;
                              setVariants((prev) => {
                                const copy = [...prev];
                                copy[vIdx] = { ...copy[vIdx], price: val };
                                return copy;
                              });
                            }}
                            className="h-8 text-xs font-mono font-bold"
                          />
                        </div>

                        <div className="col-span-2">
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="MRP"
                            value={v.regular_price || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setVariants((prev) => {
                                const copy = [...prev];
                                copy[vIdx] = { ...copy[vIdx], regular_price: val };
                                return copy;
                              });
                            }}
                            className="h-8 text-xs font-mono"
                          />
                        </div>

                        <div className="col-span-2">
                          <Input
                            placeholder="Unit"
                            value={v.unit}
                            onChange={(e) => {
                              const val = e.target.value;
                              setVariants((prev) => {
                                const copy = [...prev];
                                copy[vIdx] = { ...copy[vIdx], unit: val };
                                return copy;
                              });
                            }}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="col-span-2 flex justify-end">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => setVariants((prev) => prev.filter((_, i) => i !== vIdx))}
                            className="size-7 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* FOOTER */}
          <DialogFooter className="pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={submitting}
              className="gap-1.5 font-bold"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  {product?.id ? "Update Product" : "Save Product"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
