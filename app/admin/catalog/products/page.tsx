"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Package,
  Plus,
  Search,
  Tag,
  IndianRupee,
  DollarSign,
  Edit2,
  Trash2,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Layers,
  Sparkles,
  Calendar,
  Clock,
  Barcode,
  Scale,
  FolderTree,
  Briefcase,
  Eye,
  SlidersHorizontal,
  Upload,
  X,
  RefreshCw,
  Globe,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { CATALOG_AVAILABLE_COUNTRIES, getCatalogCountryMeta } from "@/lib/config/country-config";
import { useBusinessCurrency } from "@/hooks/use-business-currency";

interface MasterProduct {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  main_category_id: number | null;
  business_category_id?: number | null;
  main_category_name?: string | null;
  subcategory_id: number | null;
  subcategory_name?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  default_image_url: string | null;
  additional_images: string[];
  brand: string | null;
  model: string | null;
  sku: string | null;
  sku_prefix?: string | null;
  unit_of_measurement: string;
  attributes: Record<string, string>;
  synonyms: string[];
  countries?: string[];
  suggested_price: number | string;
  suggested_price_inr: number | string;
  suggested_price_usd: number | string;
  suggested_min_price?: number | string;
  suggested_max_price?: number | string;
  country_pricing?: Record<string, any>;
  business_profile_id?: number | null;
  business_name?: string | null;
  professional_profile_id?: number | null;
  professional_name?: string | null;
  profile_type?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface CategoryOption {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  category_type: string;
  business_category_id?: number | null;
  business_category_name?: string | null;
}

interface BusinessCategoryOption {
  id: number;
  name: string;
  slug: string;
}

interface AttributeRow {
  key: string;
  value: string;
}

interface ProductVariantRow {
  id: string;
  name: string;
  price: string;
  regular_price: string;
  unit: string;
  sku: string;
}

const COMMON_UOM_OPTIONS = [
  "Piece",
  "Box",
  "Kg",
  "Gram",
  "Liter",
  "Milliliter",
  "Meter",
  "Centimeter",
  "Pack",
  "Set",
  "Pair",
  "Dozen",
  "Roll",
  "Carton",
  "Unit",
];

export default function MasterProductsPage() {
  const { accessToken } = useAuthStore();
  const { currencySymbol, currencyCode } = useBusinessCurrency();
  const [products, setProducts] = useState<MasterProduct[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [businessCategories, setBusinessCategories] = useState<BusinessCategoryOption[]>([]);
  const [businessCategoryId, setBusinessCategoryId] = useState("");
  const [availableBusinesses, setAvailableBusinesses] = useState<{ id: number; name: string; city?: string }[]>([]);
  const [availableProfessionals, setAvailableProfessionals] = useState<{ id: number; name: string; designation?: string; business_name?: string }[]>([]);
  const [businessProfileId, setBusinessProfileId] = useState<string>("");
  const [professionalProfileId, setProfessionalProfileId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [businessCategoryFilter, setBusinessCategoryFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<MasterProduct | null>(null);
  const [saving, setSaving] = useState(false);

  // Upload States
  const [uploadingDefaultImage, setUploadingDefaultImage] = useState(false);
  const [uploadingAdditional, setUploadingAdditional] = useState(false);

  // View Details Drawer
  const [detailProduct, setDetailProduct] = useState<MasterProduct | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [defaultImageUrl, setDefaultImageUrl] = useState("");
  const [additionalImagesText, setAdditionalImagesText] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [sku, setSku] = useState("");
  const [unitOfMeasurement, setUnitOfMeasurement] = useState("Piece");
  const [synonymsText, setSynonymsText] = useState("");
  const [countries, setCountries] = useState<string[]>(["IN", "US"]);
  const [suggestedPrice, setSuggestedPrice] = useState("");
  const [suggestedPriceInr, setSuggestedPriceInr] = useState("");
  const [suggestedPriceUsd, setSuggestedPriceUsd] = useState("");
  const [suggestedMinPrice, setSuggestedMinPrice] = useState("");
  const [suggestedMaxPrice, setSuggestedMaxPrice] = useState("");
  const [suggestedMinPriceInr, setSuggestedMinPriceInr] = useState("");
  const [suggestedMaxPriceInr, setSuggestedMaxPriceInr] = useState("");
  const [suggestedMinPriceUsd, setSuggestedMinPriceUsd] = useState("");
  const [suggestedMaxPriceUsd, setSuggestedMaxPriceUsd] = useState("");
  const [countryPrices, setCountryPrices] = useState<Record<string, { price: string; min_price: string; max_price: string }>>({});
  const [isActive, setIsActive] = useState(true);
  const [attributeRows, setAttributeRows] = useState<AttributeRow[]>([{ key: "", value: "" }]);
  const [variants, setVariants] = useState<ProductVariantRow[]>([]);

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
    if (s.suggested_price_inr && (!suggestedPriceInr || suggestedPriceInr === "0")) {
      setSuggestedPriceInr(String(s.suggested_price_inr));
      setSuggestedPrice(String(s.suggested_price_inr));
    }
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

  const updateCountryPriceField = (code: string, field: "price" | "min_price" | "max_price", val: string) => {
    setCountryPrices((prev) => ({
      ...prev,
      [code]: {
        ...(prev[code] || { price: "", min_price: "", max_price: "" }),
        [field]: val,
      },
    }));
    if (code === "IN") {
      if (field === "price") { setSuggestedPriceInr(val); setSuggestedPrice(val); }
      if (field === "min_price") { setSuggestedMinPriceInr(val); setSuggestedMinPrice(val); }
      if (field === "max_price") { setSuggestedMaxPriceInr(val); setSuggestedMaxPrice(val); }
    } else if (code === "US") {
      if (field === "price") setSuggestedPriceUsd(val);
      if (field === "min_price") setSuggestedMinPriceUsd(val);
      if (field === "max_price") setSuggestedMaxPriceUsd(val);
    }
  };

  const toggleCountry = (code: string) => {
    if (countries.includes(code)) {
      if (countries.length === 1) {
        toast.error("At least one country must be selected");
        return;
      }
      setCountries(countries.filter((c) => c !== code));
    } else {
      setCountries([...countries, code]);
    }
  };

  // Derived category lists
  const mainCategories = useMemo(() => {
    return categories.filter((c) => {
      if (c.parent_id) return false;
      if (!businessCategoryId || businessCategoryId === "all") return true;
      return String(c.business_category_id) === String(businessCategoryId);
    });
  }, [categories, businessCategoryId]);

  const filterMainCategories = useMemo(() => {
    return categories.filter((c) => {
      if (c.parent_id) return false;
      if (businessCategoryFilter === "all") return true;
      return String(c.business_category_id) === String(businessCategoryFilter);
    });
  }, [categories, businessCategoryFilter]);

  const availableSubcategories = useMemo(() => {
    if (!mainCategoryId) return [];
    const mainIdNum = Number(mainCategoryId);
    return categories.filter((c) => c.parent_id === mainIdNum);
  }, [categories, mainCategoryId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes, bizRes, assigneesRes] = await Promise.all([
        fetch(`/api/admin/catalog/products`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        }),
        fetch(`/api/admin/categories?type=product&limit=1000`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        }),
        fetch(`/api/admin/categories?type=business&onlyRoot=true&limit=100`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        }),
        fetch(`/api/admin/catalog/assignees`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        }),
      ]);

      const prodData = await prodRes.json();
      if (prodRes.ok && prodData.products) {
        setProducts(prodData.products);
      }

      const catData = await catRes.json();
      if (catRes.ok && catData.data) {
        setCategories(catData.data);
      }

      const bizData = await bizRes.json();
      if (bizRes.ok && bizData.data) {
        setBusinessCategories(bizData.data);
      }

      if (assigneesRes.ok) {
        const assigneesData = await assigneesRes.json();
        if (assigneesData.businesses) setAvailableBusinesses(assigneesData.businesses);
        if (assigneesData.professionals) setAvailableProfessionals(assigneesData.professionals);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load master products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]);

  const openCreateDialog = () => {
    setEditingProduct(null);
    setName("");
    setSlug("");
    setDescription("");
    setBusinessCategoryId("");
    setMainCategoryId("");
    setSubcategoryId("");
    setDefaultImageUrl("");
    setAdditionalImagesText("");
    setBrand("");
    setModel("");
    setSku("");
    setUnitOfMeasurement("Piece");
    setSynonymsText("");
    setCountries(["IN", "US"]);
    setSuggestedPrice("");
    setSuggestedPriceInr("");
    setSuggestedPriceUsd("");
    setSuggestedMinPrice("");
    setSuggestedMaxPrice("");
    setSuggestedMinPriceInr("");
    setSuggestedMaxPriceInr("");
    setSuggestedMinPriceUsd("");
    setSuggestedMaxPriceUsd("");
    setCountryPrices({
      IN: { price: "", min_price: "", max_price: "" },
      US: { price: "", min_price: "", max_price: "" },
    });
    setBusinessProfileId("none");
    setProfessionalProfileId("none");
    setIsActive(true);
    setAttributeRows([{ key: "", value: "" }]);
    setVariants([]);
    setDialogOpen(true);
  };

  const openEditDialog = (prod: MasterProduct) => {
    setEditingProduct(prod);
    setName(prod.name || "");
    setSlug(prod.slug || "");
    setDescription(prod.description || "");
    const mCatId = prod.main_category_id ? String(prod.main_category_id) : (prod.category_id ? String(prod.category_id) : "");
    setMainCategoryId(mCatId);
    setSubcategoryId(prod.subcategory_id ? String(prod.subcategory_id) : "");

    // Automatically resolve business category for edit mode
    if (mCatId) {
      const match = categories.find((c) => String(c.id) === mCatId);
      if (match?.business_category_id) {
        setBusinessCategoryId(String(match.business_category_id));
      } else {
        setBusinessCategoryId("");
      }
    } else {
      setBusinessCategoryId("");
    }
    setDefaultImageUrl(prod.default_image_url || "");
    setAdditionalImagesText(Array.isArray(prod.additional_images) ? prod.additional_images.join("\n") : "");
    setBrand(prod.brand || "");
    setModel(prod.model || "");
    setSku(prod.sku || prod.sku_prefix || "");
    setUnitOfMeasurement(prod.unit_of_measurement || "Piece");
    setSynonymsText(Array.isArray(prod.synonyms) ? prod.synonyms.join(", ") : "");
    const activeCountries = Array.isArray(prod.countries) && prod.countries.length > 0 ? prod.countries : ["IN", "US"];
    setCountries(activeCountries);

    const cp = (prod as any).country_pricing || {};
    const loadedCp: Record<string, { price: string; min_price: string; max_price: string }> = {};
    activeCountries.forEach((cCode) => {
      const data = cp[cCode] || cp[cCode.toUpperCase()] || cp[cCode.toLowerCase()] || {};
      loadedCp[cCode] = {
        price: data.price !== undefined && data.price !== null ? String(data.price) : (cCode === "IN" && prod.suggested_price_inr ? String(prod.suggested_price_inr) : cCode === "US" && prod.suggested_price_usd ? String(prod.suggested_price_usd) : ""),
        min_price: data.min_price !== undefined && data.min_price !== null ? String(data.min_price) : "",
        max_price: data.max_price !== undefined && data.max_price !== null ? String(data.max_price) : "",
      };
    });
    setCountryPrices(loadedCp);

    const inCp = cp.IN || cp.in || {};
    const usCp = cp.US || cp.us || {};

    const baseInr = prod.suggested_price_inr !== undefined && prod.suggested_price_inr !== null ? String(prod.suggested_price_inr) : (inCp.price ? String(inCp.price) : "");
    const baseUsd = prod.suggested_price_usd !== undefined && prod.suggested_price_usd !== null ? String(prod.suggested_price_usd) : (usCp.price ? String(usCp.price) : "");

    setSuggestedPrice(prod.suggested_price !== undefined ? String(prod.suggested_price) : "");
    setSuggestedPriceInr(baseInr);
    setSuggestedPriceUsd(baseUsd);
    setSuggestedMinPrice((prod as any).suggested_min_price !== undefined ? String((prod as any).suggested_min_price) : "");
    setSuggestedMaxPrice((prod as any).suggested_max_price !== undefined ? String((prod as any).suggested_max_price) : "");

    setSuggestedMinPriceInr(inCp.min_price ? String(inCp.min_price) : ((prod as any).suggested_min_price !== undefined ? String((prod as any).suggested_min_price) : ""));
    setSuggestedMaxPriceInr(inCp.max_price ? String(inCp.max_price) : ((prod as any).suggested_max_price !== undefined ? String((prod as any).suggested_max_price) : ""));
    setSuggestedMinPriceUsd(usCp.min_price ? String(usCp.min_price) : "");
    setSuggestedMaxPriceUsd(usCp.max_price ? String(usCp.max_price) : "");

    setBusinessProfileId(prod.business_profile_id ? String(prod.business_profile_id) : "none");
    setProfessionalProfileId(prod.professional_profile_id ? String(prod.professional_profile_id) : "none");

    setIsActive(prod.is_active !== undefined ? prod.is_active : true);

    if (prod.attributes && typeof prod.attributes === "object" && Object.keys(prod.attributes).length > 0) {
      setAttributeRows(
        Object.entries(prod.attributes).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      );
    } else {
      setAttributeRows([{ key: "", value: "" }]);
    }

    const loadedVariants = Array.isArray((prod as any).variants)
      ? (prod as any).variants.map((v: any, idx: number) => ({
          id: v.id || String(idx + 1),
          name: v.name || "",
          price: v.price !== undefined && v.price !== null ? String(v.price) : "",
          regular_price: v.regular_price !== undefined && v.regular_price !== null ? String(v.regular_price) : "",
          unit: v.unit || prod.unit_of_measurement || "Piece",
          sku: v.sku || "",
        }))
      : [];
    setVariants(loadedVariants);

    setDialogOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingProduct && (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, "-"))) {
      setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    }
  };

  const handleBasePriceChange = (val: string) => {
    setSuggestedPrice(val);
    if (!suggestedPriceInr || suggestedPriceInr === suggestedPrice) {
      setSuggestedPriceInr(val);
    }
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      setSuggestedPriceUsd((num / 85).toFixed(2));
    }
  };

  const addAttributeRow = () => {
    setAttributeRows([...attributeRows, { key: "", value: "" }]);
  };

  const removeAttributeRow = (idx: number) => {
    setAttributeRows(attributeRows.filter((_, i) => i !== idx));
  };

  const updateAttributeRow = (idx: number, field: "key" | "value", val: string) => {
    const updated = [...attributeRows];
    updated[idx][field] = val;
    setAttributeRows(updated);
  };

  // Image Upload Handlers
  const handleUploadDefaultImage = async (file: File) => {
    if (!file) return;
    setUploadingDefaultImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "catalog/products");

      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        body: formData,
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to upload image");

      const uploadedUrl = result.data?.url || result.url;
      if (uploadedUrl) {
        setDefaultImageUrl(uploadedUrl);
        toast.success("Default product image uploaded successfully");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload default image");
    } finally {
      setUploadingDefaultImage(false);
    }
  };

  const handleUploadAdditionalImages = async (files: FileList) => {
    if (!files || files.length === 0) return;
    setUploadingAdditional(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "catalog/products/gallery");
        const res = await fetch("/api/admin/uploads/image", {
          method: "POST",
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
          body: formData,
        });
        const data = await res.json();
        return data.data?.url || data.url;
      });

      const urls = await Promise.all(uploadPromises);
      const validUrls = urls.filter(Boolean);
      if (validUrls.length > 0) {
        setAdditionalImagesText((prev) => (prev ? `${prev}\n${validUrls.join("\n")}` : validUrls.join("\n")));
        toast.success(`${validUrls.length} image(s) uploaded to product gallery`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload gallery images");
    } finally {
      setUploadingAdditional(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter a product name");
      return;
    }

    setSaving(true);
    try {
      const attributesObj: Record<string, string> = {};
      attributeRows.forEach((row) => {
        if (row.key.trim() && row.value.trim()) {
          attributesObj[row.key.trim()] = row.value.trim();
        }
      });

      const additionalImages = additionalImagesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const synonyms = synonymsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const formattedVariants = variants
        .filter((v) => v.name.trim() && v.price.trim())
        .map((v, idx) => ({
          id: v.id || `v-${idx + 1}`,
          name: v.name.trim(),
          price: Number(v.price),
          regular_price: v.regular_price ? Number(v.regular_price) : undefined,
          unit: v.unit.trim() || unitOfMeasurement || "Piece",
          sku: v.sku.trim() || undefined,
        }));

      const countryPricing: Record<string, any> = {};
      countries.forEach((cCode) => {
        const meta = getCatalogCountryMeta(cCode);
        const cpVal = countryPrices[cCode] || { price: "", min_price: "", max_price: "" };
        const priceVal = cpVal.price ? Number(cpVal.price) : (cCode === "IN" && suggestedPriceInr ? Number(suggestedPriceInr) : cCode === "US" && suggestedPriceUsd ? Number(suggestedPriceUsd) : 0);
        const minVal = cpVal.min_price ? Number(cpVal.min_price) : (cCode === "IN" && suggestedMinPriceInr ? Number(suggestedMinPriceInr) : null);
        const maxVal = cpVal.max_price ? Number(cpVal.max_price) : (cCode === "IN" && suggestedMaxPriceInr ? Number(suggestedMaxPriceInr) : null);
        countryPricing[cCode] = {
          price: priceVal,
          min_price: minVal,
          max_price: maxVal,
          currency: meta.currencyCode,
          symbol: meta.currencySymbol,
        };
      });

      const inPrice = countryPricing["IN"]?.price || (suggestedPriceInr ? Number(suggestedPriceInr) : (suggestedPrice ? Number(suggestedPrice) : 0));
      const usPrice = countryPricing["US"]?.price || (suggestedPriceUsd ? Number(suggestedPriceUsd) : (inPrice > 0 ? Number((inPrice / 85).toFixed(2)) : 0));

      const payload = {
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || null,
        main_category_id: mainCategoryId ? Number(mainCategoryId) : null,
        subcategory_id: subcategoryId ? Number(subcategoryId) : null,
        category_id: subcategoryId ? Number(subcategoryId) : (mainCategoryId ? Number(mainCategoryId) : null),
        default_image_url: defaultImageUrl.trim() || null,
        additional_images: additionalImages,
        brand: brand.trim() || null,
        model: model.trim() || null,
        sku: sku.trim() || null,
        unit_of_measurement: unitOfMeasurement.trim() || "Piece",
        attributes: attributesObj,
        synonyms: synonyms,
        countries: countries,
        suggested_price: inPrice || (usPrice * 85),
        suggested_price_inr: inPrice,
        suggested_price_usd: usPrice,
        suggested_min_price: countryPricing["IN"]?.min_price || (suggestedMinPriceInr ? Number(suggestedMinPriceInr) : null),
        suggested_max_price: countryPricing["IN"]?.max_price || (suggestedMaxPriceInr ? Number(suggestedMaxPriceInr) : null),
        country_pricing: countryPricing,
        business_profile_id: businessProfileId && businessProfileId !== "none" ? Number(businessProfileId) : null,
        professional_profile_id: professionalProfileId && professionalProfileId !== "none" ? Number(professionalProfileId) : null,
        profile_type: (businessProfileId && businessProfileId !== "none" && professionalProfileId && professionalProfileId !== "none")
          ? "both"
          : (professionalProfileId && professionalProfileId !== "none" ? "professional" : "business"),
        variants: formattedVariants,
        is_active: isActive,
      };

      const url = "/api/admin/catalog/products";
      const method = editingProduct ? "PATCH" : "POST";
      const body = editingProduct ? { ...payload, id: editingProduct.id } : payload;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save product");

      toast.success(editingProduct ? "Master product updated successfully" : "Master product created successfully");
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this master product?")) return;
    try {
      const res = await fetch(`/api/admin/catalog/products?id=${id}`, {
        method: "DELETE",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete product");
      }
      toast.success("Product deleted successfully");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Error deleting product");
    }
  };

  const handleToggleStatus = async (product: MasterProduct) => {
    try {
      const res = await fetch("/api/admin/catalog/products", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ id: product.id, is_active: !product.is_active }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }
      toast.success(product.is_active ? "Product suspended" : "Product activated");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to update product status");
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase()) ||
        p.brand?.toLowerCase().includes(search.toLowerCase()) ||
        p.model?.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase()) ||
        p.synonyms?.some((s) => s.toLowerCase().includes(search.toLowerCase()));

      const matchesBusinessCategory =
        businessCategoryFilter === "all" ||
        String(p.business_category_id) === businessCategoryFilter ||
        String(categories.find((c) => c.id === p.category_id || c.id === p.main_category_id)?.business_category_id) === businessCategoryFilter;

      const matchesCategory =
        categoryFilter === "all" ||
        String(p.main_category_id) === categoryFilter ||
        String(p.subcategory_id) === categoryFilter ||
        String(p.category_id) === categoryFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && p.is_active) ||
        (statusFilter === "inactive" && !p.is_active);

      const matchesCountry =
        countryFilter === "all" ||
        (Array.isArray(p.countries) && p.countries.includes(countryFilter));

      return matchesSearch && matchesBusinessCategory && matchesCategory && matchesStatus && matchesCountry;
    });
  }, [products, search, businessCategoryFilter, categoryFilter, countryFilter, statusFilter, categories]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Package className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Master Product Catalog
              </h1>
              <p className="text-xs text-muted-foreground">
                Manage default product imagery, hierarchy, brands, models, SKUs, attributes, and country pricing benchmarks.
              </p>
            </div>
          </div>
        </div>

        <Button onClick={openCreateDialog} className="gap-1.5 text-xs font-bold shadow-sm">
          <Plus className="size-4" /> Add Master Product
        </Button>
      </div>

      {/* FILTER BAR */}
      <Card className="border border-border/60 shadow-xs">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search products by name, description, brand, model, SKU, or synonyms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Select
              value={businessCategoryFilter}
              onValueChange={(val) => {
                setBusinessCategoryFilter(val);
                setCategoryFilter("all");
              }}
            >
              <SelectTrigger className="w-full sm:w-[190px] h-9 text-xs font-semibold">
                <SelectValue placeholder="All Business Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Business Types ({businessCategories.length})</SelectItem>
                {businessCategories.map((bc) => (
                  <SelectItem key={bc.id} value={String(bc.id)}>
                    {bc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[190px] h-9 text-xs font-semibold">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories ({filterMainCategories.length})</SelectItem>
                {filterMainCategories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={countryFilter} onValueChange={setCountryFilter}>
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="IN">India (IN)</SelectItem>
                <SelectItem value="US">USA (US)</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active Only</SelectItem>
                <SelectItem value="inactive">Inactive Only</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* PRODUCTS TABLE */}
      <Card className="border border-border/60 shadow-xs">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span>Master Products</span>
              <Badge variant="secondary" className="text-[10px] font-bold">
                {filteredProducts.length} items
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-xs">Loading master products...</span>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground space-y-2">
              <Package className="size-10 mx-auto text-muted-foreground/40" />
              <p className="text-xs font-semibold">No master products found</p>
              <p className="text-[11px]">Click "Add Master Product" to create your first catalog item.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[70px]">Image</TableHead>
                    <TableHead>Product Name & Details</TableHead>
                    <TableHead>Brand & Model</TableHead>
                    <TableHead>SKU & Unit</TableHead>
                    <TableHead>Synonyms</TableHead>
                    <TableHead className="text-right">Suggested Price</TableHead>
                    <TableHead className="text-right">Admin Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((p) => (
                    <TableRow key={p.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell>
                        {p.default_image_url ? (
                          <img
                            src={p.default_image_url}
                            alt={p.name}
                            className="size-10 rounded-lg object-cover border"
                            onError={(e) => {
                              (e.target as any).src = "https://placehold.co/80x80/f1f5f9/64748b?text=Product";
                            }}
                          />
                        ) : (
                          <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border">
                            <ImageIcon className="size-4" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs max-w-[260px]">
                        <a
                          href={`/products/${p.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`font-bold text-xs truncate block cursor-pointer transition-colors hover:underline ${
                            (p.is_active !== undefined && p.is_active !== null ? Boolean(p.is_active) : (p.listing_status === "published" || p.status === "active"))
                              ? "!text-emerald-600 dark:!text-emerald-400 hover:!text-emerald-700"
                              : "!text-rose-600 dark:!text-rose-400 hover:!text-rose-700"
                          }`}
                          title={`${p.name} (Click to open product page)`}
                        >
                          {p.name}
                        </a>
                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            #{p.id} • /{p.slug}
                          </span>
                          {p.main_category_name ? (
                            <Badge variant="outline" className="text-[9px] py-0 px-1 bg-primary/5">
                              {p.main_category_name}
                            </Badge>
                          ) : p.category_name ? (
                            <Badge variant="outline" className="text-[9px] py-0 px-1">
                              {p.category_name}
                            </Badge>
                          ) : null}
                          {p.is_active ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] py-0 px-1">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[9px] py-0 px-1">
                              Suspended
                            </Badge>
                          )}
                        </div>
                        {p.business_name && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Briefcase className="size-2.5 text-primary shrink-0" />
                            <span className="font-medium text-foreground">{p.business_name}</span>
                          </div>
                        )}
                        {p.description && (
                          <div className="text-[10px] text-muted-foreground line-clamp-1 font-normal mt-0.5">
                            {p.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {p.brand ? (
                          <div className="font-medium text-foreground">{p.brand}</div>
                        ) : (
                          <span className="text-muted-foreground text-[10px]">—</span>
                        )}
                        {p.model && (
                          <div className="text-[10px] text-muted-foreground">Mod: {p.model}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="font-mono text-[11px] text-foreground font-medium">
                          {p.sku || "—"}
                        </div>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Scale className="size-3" /> {p.unit_of_measurement || "Piece"}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <div className="flex flex-wrap gap-1">
                          {p.synonyms && p.synonyms.length > 0 ? (
                            p.synonyms.slice(0, 2).map((syn, idx) => (
                              <Badge key={idx} variant="secondary" className="text-[9px] font-normal">
                                {syn}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-[10px]">—</span>
                          )}
                          {p.synonyms && p.synonyms.length > 2 && (
                            <span className="text-[9px] text-muted-foreground font-semibold">
                              +{p.synonyms.length - 2}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        <Popover>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="inline-flex items-center justify-end gap-1.5 py-1 px-2 rounded-md hover:bg-muted font-bold text-xs text-foreground cursor-pointer transition-colors group"
                            >
                              <div className="text-right">
                                <div>
                                  ₹ {Number(p.suggested_price_inr || p.suggested_price || 0).toLocaleString("en-IN")}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-normal flex items-center justify-end gap-1">
                                  <span>
                                    {Array.isArray(p.countries) && p.countries.length > 0
                                      ? `${p.countries.length} ${p.countries.length === 1 ? "country" : "countries"}`
                                      : "2 countries"}
                                  </span>
                                  <ChevronDown className="size-2.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                                </div>
                              </div>
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-80 p-3 space-y-2.5 shadow-lg">
                            <div className="flex items-center justify-between border-b pb-2">
                              <div className="font-semibold text-xs flex items-center gap-1.5 text-foreground">
                                <Globe className="size-3.5 text-primary" />
                                <span>Country-Wise Suggested Price</span>
                              </div>
                              <Badge variant="outline" className="text-[9px] font-mono">
                                {Array.isArray(p.countries) && p.countries.length > 0 ? `${p.countries.length} Active` : "2 Active"}
                              </Badge>
                            </div>

                            <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                              {(() => {
                                const activeCodes = Array.isArray(p.countries) && p.countries.length > 0 ? p.countries : ["IN", "US"];
                                return activeCodes.map((code) => {
                                  const meta = getCatalogCountryMeta(code);
                                  const countryP = p.country_pricing?.[code];
                                  const price = countryP?.price !== undefined
                                    ? countryP.price
                                    : code === "IN"
                                      ? (p.suggested_price_inr || p.suggested_price || 0)
                                      : code === "US"
                                        ? (p.suggested_price_usd || 0)
                                        : 0;
                                  const minP = countryP?.min_price !== undefined ? countryP.min_price : (code === "IN" ? p.suggested_min_price : undefined);
                                  const maxP = countryP?.max_price !== undefined ? countryP.max_price : (code === "IN" ? p.suggested_max_price : undefined);

                                  return (
                                    <div
                                      key={code}
                                      className="flex items-center justify-between p-2 rounded-md bg-muted/30 border border-muted/60 hover:bg-muted/50 transition-colors"
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-base leading-none">{meta.flag}</span>
                                        <div>
                                          <div className="font-medium text-xs text-foreground flex items-center gap-1">
                                            <span>{meta.name}</span>
                                            <span className="text-[9px] text-muted-foreground font-mono">({code})</span>
                                          </div>
                                          {(minP || maxP) ? (
                                            <div className="text-[10px] text-muted-foreground">
                                              Range: {meta.currencySymbol} {Number(minP || 0).toLocaleString()} – {meta.currencySymbol} {Number(maxP || 0).toLocaleString()}
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <div className="text-xs font-bold text-foreground">
                                          {meta.currencySymbol} {Number(price || 0).toLocaleString()}
                                        </div>
                                        <div className="text-[9px] text-muted-foreground font-mono">
                                          / {p.unit_of_measurement || "Piece"}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>

                            <p className="text-[10px] text-muted-foreground italic text-center pt-1 border-t">
                              Suggested discovery rates • Provider pricing remains independent
                            </p>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2.5 text-xs gap-1 cursor-pointer font-medium hover:bg-muted"
                            >
                              <span>Actions</span>
                              <ChevronDown className="size-3 text-muted-foreground" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs">
                            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                              Product Actions
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => window.open(`/products/${p.id}`, "_blank")}
                              className="cursor-pointer text-xs"
                            >
                              <ExternalLink className="size-3.5 mr-2 text-muted-foreground" /> View Public Page
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEditDialog(p)}
                              className="cursor-pointer text-xs"
                            >
                              <Edit2 className="size-3.5 mr-2 text-muted-foreground" /> Edit Product
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDetailProduct(p)}
                              className="cursor-pointer text-xs"
                            >
                              <Eye className="size-3.5 mr-2 text-muted-foreground" /> View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(p)}
                              className={`cursor-pointer text-xs ${
                                p.is_active ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                              }`}
                            >
                              {p.is_active ? (
                                <>
                                  <XCircle className="size-3.5 mr-2" /> Suspend Product
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="size-3.5 mr-2" /> Activate Product
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(p.id)}
                              className="cursor-pointer text-xs text-rose-600 dark:text-rose-400 focus:bg-rose-50 dark:focus:bg-rose-950/30"
                            >
                              <Trash2 className="size-3.5 mr-2" /> Delete Product
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE / EDIT DIALOG (Full 5.1 Requirements) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Package className="size-5 text-primary" />
              <span>{editingProduct ? "Edit Master Product" : "Create Master Product"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure master product fields, default imagery, suggested country prices, and specifications.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <Tabs defaultValue="category" className="w-full">
              <TabsList className="grid grid-cols-4 h-9">
                <TabsTrigger value="category" className="text-xs">Category & Synonyms</TabsTrigger>
                <TabsTrigger value="basic" className="text-xs">Basic Info</TabsTrigger>
                <TabsTrigger value="media-attrs" className="text-xs">Media & Attributes</TabsTrigger>
                <TabsTrigger value="pricing" className="text-xs">Pricing & SKU</TabsTrigger>
              </TabsList>

              {/* TAB 1: CATEGORY & SYNONYMS (FIRST TAB) */}
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
                        <SelectValue placeholder={!mainCategoryId ? "Select Product Category First" : (availableSubcategories.length === 0 ? "No Subcategories Found" : "Select Subcategory")} />
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
                      Active products can be discovered by customers and selected into business inventory.
                    </p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </TabsContent>

              {/* TAB 3: MEDIA & ATTRIBUTES */}
              <TabsContent value="media-attrs" className="space-y-4 pt-3">
                {/* DEFAULT IMAGE UPLOAD & MANAGEMENT */}
                <div className="p-3.5 border rounded-xl bg-muted/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <ImageIcon className="size-3.5 text-primary" /> Default Product Image
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Administrators can upload, replace, and manage the official default product image.
                      </p>
                    </div>
                    {defaultImageUrl && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] gap-1">
                        <CheckCircle2 className="size-3" /> Default Set
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-start gap-3.5">
                    {defaultImageUrl ? (
                      <div className="relative group size-20 rounded-xl border overflow-hidden shrink-0 bg-muted shadow-xs">
                        <img
                          src={defaultImageUrl}
                          alt="Default preview"
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
                          <span>{defaultImageUrl ? "Replace Default Image" : "Upload Default Image"}</span>
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
                            <Trash2 className="size-3 mr-1" /> Remove Image
                          </Button>
                        )}
                      </div>

                      <div className="space-y-1">
                        <Input
                          placeholder="Or paste direct image URL (https://...)"
                          value={defaultImageUrl}
                          onChange={(e) => setDefaultImageUrl(e.target.value)}
                          className="h-7 text-xs font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ADDITIONAL GALLERY IMAGES */}
                <div className="p-3.5 border rounded-xl bg-muted/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Layers className="size-3.5 text-primary" /> Additional Product Images
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Upload or paste multiple product gallery photos for different angles and packaging.
                      </p>
                    </div>
                    <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border border-border bg-background hover:bg-muted transition-colors shadow-xs">
                      {uploadingAdditional ? (
                        <Loader2 className="size-3 animate-spin" />
                      ) : (
                        <Plus className="size-3" />
                      )}
                      <span>Upload Gallery Photos</span>
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

                  {/* GALLERY THUMBNAILS */}
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
                                const list = additionalImagesText
                                  .split("\n")
                                  .map((s) => s.trim())
                                  .filter(Boolean);
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
                    placeholder="One image URL per line (paste or upload above)..."
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

              {/* TAB 4: PRICING & SKU (Moved after Media & Countries, Dynamic Country Pricing) */}
              <TabsContent value="pricing" className="space-y-4 pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">SKU / Reference Code (Optional)</Label>
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

                {/* PRODUCT VARIANTS & PACK SIZES */}
                <div className="space-y-3 pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Layers className="size-3.5 text-primary" /> Product Variants &amp; Pricing (Pack Sizes, Weights, Options)
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        Define custom variants with individual prices shown in store comparison &amp; product dropdowns (e.g. 250 g, 500 g, 1 kg).
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
                        <span className="col-span-2">MRP / Reg Price ({currencySymbol})</span>
                        <span className="col-span-2">Unit</span>
                        <span className="col-span-2 text-right">Action</span>
                      </div>
                      {variants.map((v, vIdx) => (
                        <div key={v.id || vIdx} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-xl border">
                          <div className="col-span-4">
                            <Input
                              placeholder="e.g. 500 g or 1 kg"
                              value={v.name}
                              onChange={(e) => {
                                const copy = [...variants];
                                copy[vIdx].name = e.target.value;
                                setVariants(copy);
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={`${currencySymbol} Price`}
                              value={v.price}
                              onChange={(e) => {
                                const copy = [...variants];
                                copy[vIdx].price = e.target.value;
                                setVariants(copy);
                              }}
                              className="h-7 text-xs font-mono font-bold"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              type="number"
                              step="0.01"
                              placeholder={`${currencySymbol} Reg Price`}
                              value={v.regular_price}
                              onChange={(e) => {
                                const copy = [...variants];
                                copy[vIdx].regular_price = e.target.value;
                                setVariants(copy);
                              }}
                              className="h-7 text-xs font-mono"
                            />
                          </div>
                          <div className="col-span-2">
                            <Input
                              placeholder="Unit"
                              value={v.unit}
                              onChange={(e) => {
                                const copy = [...variants];
                                copy[vIdx].unit = e.target.value;
                                setVariants(copy);
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div className="col-span-2 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setVariants((prev) => prev.filter((_, i) => i !== vIdx))}
                              className="size-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Delete variant"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="text-xs font-bold gap-1.5"
              >
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                {editingProduct ? "Update Product" : "Save Master Product"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW DETAILS DIALOG */}
      <Dialog open={Boolean(detailProduct)} onOpenChange={(open) => !open && setDetailProduct(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailProduct && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-start gap-3">
                  {detailProduct.default_image_url ? (
                    <img
                      src={detailProduct.default_image_url}
                      alt={detailProduct.name}
                      className="size-16 rounded-xl object-cover border shrink-0"
                    />
                  ) : (
                    <div className="size-16 rounded-xl bg-muted flex items-center justify-center text-muted-foreground border shrink-0">
                      <Package className="size-8" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <DialogTitle className="text-lg font-black">{detailProduct.name}</DialogTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">/{detailProduct.slug}</span>
                      {detailProduct.is_active ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px]">
                          Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-[10px]">
                          Inactive
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </DialogHeader>

              {detailProduct.description && (
                <div className="p-3 bg-muted/20 rounded-lg text-xs text-foreground/80 leading-relaxed">
                  {detailProduct.description}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 border rounded-lg bg-muted/10 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Main Category</span>
                  <span className="font-semibold">{detailProduct.main_category_name || detailProduct.category_name || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Subcategory</span>
                  <span className="font-semibold">{detailProduct.subcategory_name || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Brand / Model</span>
                  <span className="font-semibold">{detailProduct.brand || "—"} {detailProduct.model ? `(${detailProduct.model})` : ""}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">SKU / Reference</span>
                  <span className="font-mono font-semibold">{detailProduct.sku || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Unit of Measurement</span>
                  <span className="font-semibold">{detailProduct.unit_of_measurement || "Piece"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">India Suggested</span>
                  <span className="font-bold text-foreground">₹ {Number(detailProduct.suggested_price_inr || detailProduct.suggested_price || 0).toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">USA Suggested</span>
                  <span className="font-bold text-foreground">$ {Number(detailProduct.suggested_price_usd || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Created At</span>
                  <span className="text-muted-foreground">{new Date(detailProduct.created_at).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Updated At</span>
                  <span className="text-muted-foreground">{new Date(detailProduct.updated_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* ATTRIBUTES */}
              {detailProduct.attributes && Object.keys(detailProduct.attributes).length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Product Attributes</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(detailProduct.attributes).map(([k, v]) => (
                      <div key={k} className="p-2 border rounded bg-background text-xs">
                        <span className="text-[10px] text-muted-foreground block">{k}</span>
                        <span className="font-medium text-foreground">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SYNONYMS */}
              {detailProduct.synonyms && detailProduct.synonyms.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Synonyms / Search Terms</h4>
                  <div className="flex flex-wrap gap-1">
                    {detailProduct.synonyms.map((syn, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {syn}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* ADDITIONAL IMAGES */}
              {detailProduct.additional_images && detailProduct.additional_images.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gallery & Additional Images</h4>
                  <div className="flex flex-wrap gap-2">
                    {detailProduct.additional_images.map((img, idx) => (
                      <a key={idx} href={img} target="_blank" rel="noopener noreferrer">
                        <img
                          src={img}
                          alt={`Gallery ${idx + 1}`}
                          className="size-16 rounded-lg object-cover border hover:opacity-80 transition-opacity"
                        />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <DialogFooter className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDetailProduct(null)}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const p = detailProduct;
                    setDetailProduct(null);
                    openEditDialog(p);
                  }}
                  className="text-xs font-bold gap-1"
                >
                  <Edit2 className="size-3" /> Edit Product
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
