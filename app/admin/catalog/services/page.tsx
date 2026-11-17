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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Briefcase,
  Plus,
  Search,
  IndianRupee,
  DollarSign,
  Clock,
  Edit2,
  Trash2,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  Upload,
  Download,
  FileSpreadsheet,
  Globe,
  Layers,
  Tag,
  ShieldCheck,
  Eye,
  X,
  AlertCircle,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { CATALOG_AVAILABLE_COUNTRIES, getCatalogCountryMeta } from "@/lib/config/country-config";

interface MasterService {
  id: number;
  name: string;
  slug: string;
  main_category_id: number | null;
  main_category_name?: string | null;
  subcategory_id: number | null;
  subcategory_name?: string | null;
  category_id?: number | null;
  category_name?: string | null;
  description: string | null;
  default_image_url: string | null;
  additional_images: string[];
  attributes?: Record<string, any>;
  synonyms: string[];
  countries: string[];
  pricing_model: string;
  supported_pricing_models?: string[];
  duration_minutes: number;
  duration_unit: string;
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

interface ServiceVariantRow {
  id: string;
  name: string;
  price: string;
  duration: string;
  description: string;
}

const PRICING_MODELS = [
  { value: "fixed_price", label: "Fixed price" },
  { value: "hourly", label: "Hourly" },
  { value: "per_visit", label: "Per visit" },
  { value: "per_session", label: "Per session" },
  { value: "per_project", label: "Per project" },
  { value: "per_day", label: "Per day" },
  { value: "per_unit", label: "Per unit" },
  { value: "starting_from", label: "Starting from" },
  { value: "price_range", label: "Price range" },
  { value: "free_consultation", label: "Free consultation" },
  { value: "quote_required", label: "Quote required" },
];

const DURATION_UNITS = ["minutes", "hours", "days", "weeks"];

export default function MasterServicesPage() {
  const { accessToken } = useAuthStore();
  const [services, setServices] = useState<MasterService[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [detailService, setDetailService] = useState<MasterService | null>(null);
  const [editingService, setEditingService] = useState<MasterService | null>(null);
  const [saving, setSaving] = useState(false);
  const [businessCategories, setBusinessCategories] = useState<BusinessCategoryOption[]>([]);
  const [businessCategoryId, setBusinessCategoryId] = useState("");
  const [availableBusinesses, setAvailableBusinesses] = useState<{ id: number; name: string; city?: string }[]>([]);
  const [availableProfessionals, setAvailableProfessionals] = useState<{ id: number; name: string; designation?: string; business_name?: string }[]>([]);
  const [businessProfileId, setBusinessProfileId] = useState<string>("");
  const [professionalProfileId, setProfessionalProfileId] = useState<string>("");

  // Synonym Manager State (Part 8)
  const [synonymModalOpen, setSynonymModalOpen] = useState(false);
  const [synonymTargetService, setSynonymTargetService] = useState<MasterService | null>(null);
  const [serviceSynonymsList, setServiceSynonymsList] = useState<any[]>([]);
  const [loadingSynonyms, setLoadingSynonyms] = useState(false);
  const [newSynonymText, setNewSynonymText] = useState("");
  const [newSynonymLang, setNewSynonymLang] = useState("en");
  const [newSynonymCountry, setNewSynonymCountry] = useState("all");

  // Upload States
  const [uploadingDefaultImage, setUploadingDefaultImage] = useState(false);
  const [uploadingAdditional, setUploadingAdditional] = useState(false);

  // Form Fields
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [mainCategoryId, setMainCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [defaultImageUrl, setDefaultImageUrl] = useState("");
  const [additionalImagesText, setAdditionalImagesText] = useState("");
  const [synonymsText, setSynonymsText] = useState("");
  const [countries, setCountries] = useState<string[]>(["IN", "US"]);
  const [pricingModel, setPricingModel] = useState("fixed_price");
  const [supportedPricingModels, setSupportedPricingModels] = useState<string[]>([
    "fixed_price", "hourly", "per_project", "starting_from", "quote_required"
  ]);
  const [durationValue, setDurationValue] = useState("60");
  const [durationUnit, setDurationUnit] = useState("minutes");
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
  const [variants, setVariants] = useState<ServiceVariantRow[]>([]);

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

  // Bulk Import text
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

  // Derived category lists
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [srvRes, catRes, bizRes, assigneesRes] = await Promise.all([
        fetch(`/api/admin/catalog/services`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        }),
        fetch(`/api/admin/categories?type=service&limit=1000`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        }),
        fetch(`/api/admin/categories?type=business&onlyRoot=true&limit=100`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        }),
        fetch(`/api/admin/catalog/assignees`, {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        }),
      ]);

      const srvData = await srvRes.json();
      if (srvRes.ok && srvData.services) {
        setServices(srvData.services);
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
      toast.error(err.message || "Failed to load master services");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [accessToken]);

  const openCreateDialog = () => {
    setEditingService(null);
    setName("");
    setSlug("");
    setBusinessCategoryId("");
    setMainCategoryId("");
    setSubcategoryId("");
    setDescription("");
    setDefaultImageUrl("");
    setAdditionalImagesText("");
    setSynonymsText("");
    setCountries(["IN", "US"]);
    setPricingModel("fixed_price");
    setSupportedPricingModels(["fixed_price", "hourly", "per_project", "starting_from", "quote_required"]);
    setDurationValue("60");
    setDurationUnit("minutes");
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

  const openEditDialog = (srv: MasterService) => {
    setEditingService(srv);
    setName(srv.name || "");
    setSlug(srv.slug || "");
    const mCatId = srv.main_category_id ? String(srv.main_category_id) : (srv.category_id ? String(srv.category_id) : "");
    setMainCategoryId(mCatId);
    setSubcategoryId(srv.subcategory_id ? String(srv.subcategory_id) : "");

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
    setDescription(srv.description || "");
    setDefaultImageUrl(srv.default_image_url || "");
    setAdditionalImagesText(Array.isArray(srv.additional_images) ? srv.additional_images.join("\n") : "");
    setSynonymsText(Array.isArray(srv.synonyms) ? srv.synonyms.join(", ") : "");
    const activeCountries = Array.isArray(srv.countries) && srv.countries.length > 0 ? srv.countries : ["IN", "US"];
    setCountries(activeCountries);
    setPricingModel(srv.pricing_model || "fixed_price");
    setSupportedPricingModels(
      Array.isArray(srv.supported_pricing_models) && srv.supported_pricing_models.length > 0
        ? srv.supported_pricing_models
        : ["fixed_price", "hourly", "per_project", "starting_from", "quote_required"]
    );
    setDurationValue(String(srv.duration_minutes || 60));
    setDurationUnit(srv.duration_unit || "minutes");

    const cp = (srv as any).country_pricing || {};
    const loadedCp: Record<string, { price: string; min_price: string; max_price: string }> = {};
    activeCountries.forEach((cCode) => {
      const data = cp[cCode] || cp[cCode.toUpperCase()] || cp[cCode.toLowerCase()] || {};
      loadedCp[cCode] = {
        price: data.price !== undefined && data.price !== null ? String(data.price) : (cCode === "IN" && srv.suggested_price_inr ? String(srv.suggested_price_inr) : cCode === "US" && srv.suggested_price_usd ? String(srv.suggested_price_usd) : ""),
        min_price: data.min_price !== undefined && data.min_price !== null ? String(data.min_price) : "",
        max_price: data.max_price !== undefined && data.max_price !== null ? String(data.max_price) : "",
      };
    });
    setCountryPrices(loadedCp);

    const inCp = cp.IN || cp.in || {};
    const usCp = cp.US || cp.us || {};

    const baseInr = srv.suggested_price_inr !== undefined && srv.suggested_price_inr !== null ? String(srv.suggested_price_inr) : (inCp.price ? String(inCp.price) : "");
    const baseUsd = srv.suggested_price_usd !== undefined && srv.suggested_price_usd !== null ? String(srv.suggested_price_usd) : (usCp.price ? String(usCp.price) : "");

    setSuggestedPrice(srv.suggested_price !== undefined ? String(srv.suggested_price) : "");
    setSuggestedPriceInr(baseInr);
    setSuggestedPriceUsd(baseUsd);
    setSuggestedMinPrice(srv.suggested_min_price !== undefined ? String(srv.suggested_min_price) : "");
    setSuggestedMaxPrice(srv.suggested_max_price !== undefined ? String(srv.suggested_max_price) : "");

    setSuggestedMinPriceInr(inCp.min_price ? String(inCp.min_price) : (srv.suggested_min_price !== undefined ? String(srv.suggested_min_price) : ""));
    setSuggestedMaxPriceInr(inCp.max_price ? String(inCp.max_price) : (srv.suggested_max_price !== undefined ? String(srv.suggested_max_price) : ""));
    setSuggestedMinPriceUsd(usCp.min_price ? String(usCp.min_price) : "");
    setSuggestedMaxPriceUsd(usCp.max_price ? String(usCp.max_price) : "");

    setBusinessProfileId(srv.business_profile_id ? String(srv.business_profile_id) : "none");
    setProfessionalProfileId(srv.professional_profile_id ? String(srv.professional_profile_id) : "none");

    if (srv.attributes && typeof srv.attributes === "object" && Object.keys(srv.attributes).length > 0) {
      setAttributeRows(
        Object.entries(srv.attributes).map(([key, value]) => ({
          key,
          value: String(value),
        }))
      );
    } else {
      setAttributeRows([{ key: "", value: "" }]);
    }

    const loadedVariants = Array.isArray((srv as any).variants)
      ? (srv as any).variants.map((v: any, idx: number) => ({
          id: v.id || String(idx + 1),
          name: v.name || "",
          price: v.price !== undefined && v.price !== null ? String(v.price) : "",
          duration: v.duration || "",
          description: v.description || "",
        }))
      : [];
    setVariants(loadedVariants);

    setIsActive(srv.is_active !== undefined ? srv.is_active : true);
    setDialogOpen(true);
  };

  const openSynonymsManager = async (srv: MasterService) => {
    setSynonymTargetService(srv);
    setSynonymModalOpen(true);
    setLoadingSynonyms(true);
    try {
      const res = await fetch(`/api/admin/catalog/services/${srv.id}/synonyms`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load synonyms");
      setServiceSynonymsList(data.synonyms || []);
    } catch (e: any) {
      toast.error(e.message || "Error loading synonyms");
    } finally {
      setLoadingSynonyms(false);
    }
  };

  const handleAddSynonym = async () => {
    if (!synonymTargetService || !newSynonymText.trim()) return;
    try {
      const res = await fetch(`/api/admin/catalog/services/${synonymTargetService.id}/synonyms`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          synonym: newSynonymText.trim(),
          language: newSynonymLang,
          countryCode: newSynonymCountry !== "all" ? newSynonymCountry : null,
          isActive: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add synonym");
      toast.success("Synonym added successfully");
      setNewSynonymText("");
      setServiceSynonymsList((prev) => [...prev, data.synonym]);
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to add synonym");
    }
  };

  const handleToggleSynonym = async (synonymId: number, currentActive: boolean) => {
    if (!synonymTargetService) return;
    try {
      const res = await fetch(`/api/admin/catalog/services/${synonymTargetService.id}/synonyms`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          synonymId,
          isActive: !currentActive,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to toggle synonym");
      setServiceSynonymsList((prev) =>
        prev.map((s) => (s.id === synonymId ? { ...s, is_active: !currentActive } : s))
      );
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to update synonym");
    }
  };

  const handleDeleteSynonym = async (synonymId: number) => {
    if (!synonymTargetService) return;
    try {
      const res = await fetch(`/api/admin/catalog/services/${synonymTargetService.id}/synonyms?synonymId=${synonymId}`, {
        method: "DELETE",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete synonym");
      toast.success("Synonym deleted");
      setServiceSynonymsList((prev) => prev.filter((s) => s.id !== synonymId));
      loadData();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete synonym");
    }
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingService && (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, "-"))) {
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

  const toggleCountry = (code: string) => {
    setCountries((prev) =>
      prev.includes(code)
        ? prev.length > 1
          ? prev.filter((c) => c !== code)
          : prev
        : [...prev, code]
    );
  };

  // Upload Handlers
  const handleUploadDefaultImage = async (file: File) => {
    if (!file) return;
    setUploadingDefaultImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "catalog/services");

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
        toast.success("Default service image uploaded");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload service image");
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
        formData.append("folder", "catalog/services/gallery");
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
        toast.success(`${validUrls.length} image(s) uploaded to service gallery`);
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
      toast.error("Please enter a service name");
      return;
    }

    setSaving(true);
    try {
      const additionalImages = additionalImagesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const synonyms = synonymsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const attributesObj: Record<string, string> = {};
      attributeRows.forEach((row) => {
        if (row.key.trim() && row.value.trim()) {
          attributesObj[row.key.trim()] = row.value.trim();
        }
      });

      const formattedVariants = variants
        .filter((v) => v.name.trim() && v.price.trim())
        .map((v, idx) => ({
          id: v.id || `pkg-${idx + 1}`,
          name: v.name.trim(),
          price: Number(v.price),
          duration: v.duration.trim() || undefined,
          description: v.description.trim() || undefined,
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
        attributes: attributesObj,
        synonyms,
        countries,
        pricing_model: pricingModel,
        supported_pricing_models: [pricingModel],
        duration_minutes: Number(durationValue) || 60,
        duration_unit: durationUnit,
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

      const url = "/api/admin/catalog/services";
      const method = editingService ? "PATCH" : "POST";
      const body = editingService ? { ...payload, id: editingService.id } : payload;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save service");

      toast.success(editingService ? "Master service updated successfully" : "Master service created successfully");
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to save master service");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this master service? This will not affect existing provider quotes.")) return;
    try {
      const res = await fetch(`/api/admin/catalog/services?id=${id}`, {
        method: "DELETE",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete service");
      }
      toast.success("Master service deleted successfully");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Error deleting service");
    }
  };

  const handleExportCsv = () => {
    window.open(`/api/admin/catalog/services?format=csv`, "_blank");
  };

  const handleImportJson = async () => {
    if (!importText.trim()) {
      toast.error("Please paste JSON or CSV data");
      return;
    }

    setImporting(true);
    try {
      let parsedServices: any[] = [];
      try {
        parsedServices = JSON.parse(importText);
      } catch {
        // Fallback simple CSV parsing
        const lines = importText.split("\n").map((l) => l.trim()).filter(Boolean);
        parsedServices = lines.slice(1).map((line) => {
          const parts = line.split(",").map((s) => s.trim().replace(/^"|"$/g, ""));
          return {
            name: parts[0],
            pricing_model: parts[1] || "fixed",
            suggested_price_inr: parts[2] || 0,
            suggested_price_usd: parts[3] || 0,
          };
        });
      }

      if (!Array.isArray(parsedServices) || parsedServices.length === 0) {
        throw new Error("No valid service records found");
      }

      const res = await fetch("/api/admin/catalog/services", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ services: parsedServices }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import services");

      toast.success(`Successfully imported ${data.count || parsedServices.length} master services`);
      setImportDialogOpen(false);
      setImportText("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Failed to process import");
    } finally {
      setImporting(false);
    }
  };

  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.description?.toLowerCase().includes(search.toLowerCase()) ||
        s.pricing_model?.toLowerCase().includes(search.toLowerCase()) ||
        s.synonyms?.some((syn) => syn.toLowerCase().includes(search.toLowerCase()));

      const matchesCategory =
        categoryFilter === "all" ||
        String(s.main_category_id) === categoryFilter ||
        String(s.subcategory_id) === categoryFilter ||
        String(s.category_id) === categoryFilter;

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.is_active) ||
        (statusFilter === "inactive" && !s.is_active);

      const matchesCountry =
        countryFilter === "all" ||
        (Array.isArray(s.countries) && s.countries.includes(countryFilter));

      return matchesSearch && matchesCategory && matchesStatus && matchesCountry;
    });
  }, [services, search, categoryFilter, statusFilter, countryFilter]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
              <Briefcase className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                Master Service Catalog
              </h1>
              <p className="text-xs text-muted-foreground">
                Module 15: Manage independent master services, default imagery, country availability, suggested prices, and pricing models.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCsv}
            className="gap-1.5 text-xs font-semibold"
          >
            <Download className="size-3.5" /> Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setImportDialogOpen(true)}
            className="gap-1.5 text-xs font-semibold"
          >
            <FileSpreadsheet className="size-3.5" /> Bulk Import
          </Button>
          <Button onClick={openCreateDialog} className="gap-1.5 text-xs font-bold shadow-sm">
            <Plus className="size-4" /> Add Master Service
          </Button>
        </div>
      </div>

      {/* PROVIDER PROTECTION GUARANTEE ALERT */}
      <div className="p-3 rounded-xl border border-blue-500/20 bg-blue-500/5 text-xs flex items-start gap-2.5">
        <ShieldCheck className="size-4 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-foreground">Provider Pricing Isolation Guarantee: </span>
          <span className="text-muted-foreground">
            Master service suggested prices serve as discovery benchmarks. Modifying catalog rates will never overwrite independent service prices set by individual business owners or professional providers.
          </span>
        </div>
      </div>

      {/* FILTER BAR */}
      <Card className="border border-border/60 shadow-xs">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search services by title, description, pricing model, or synonyms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[200px] h-9 text-xs">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {mainCategories.map((c) => (
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
              <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs">
                <SelectValue placeholder="Status" />
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

      {/* SERVICES TABLE */}
      <Card className="border border-border/60 shadow-xs">
        <CardHeader className="py-3 px-4 border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <span>Master Services Catalog</span>
              <Badge variant="secondary" className="text-[10px] font-bold">
                {filteredServices.length} items
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
              <Loader2 className="size-5 animate-spin" />
              <span className="text-xs">Loading master services...</span>
            </div>
          ) : filteredServices.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground space-y-2">
              <Briefcase className="size-10 mx-auto text-muted-foreground/40" />
              <p className="text-xs font-semibold">No master services found</p>
              <p className="text-[11px]">Click "Add Master Service" to register your first service offering.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[70px]">Image</TableHead>
                    <TableHead>Service Title & Slug</TableHead>
                    <TableHead>Category Hierarchy</TableHead>
                    <TableHead>Pricing Model & Duration</TableHead>
                    <TableHead className="text-right">Suggested Price</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredServices.map((s) => (
                    <TableRow key={s.id} className="hover:bg-muted/40 transition-colors">
                      <TableCell>
                        {s.default_image_url ? (
                          <img
                            src={s.default_image_url}
                            alt={s.name}
                            className="size-10 rounded-lg object-cover border"
                            onError={(e) => {
                              (e.target as any).src = "https://placehold.co/80x80/f1f5f9/64748b?text=Service";
                            }}
                          />
                        ) : (
                          <div className="size-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground border">
                            <ImageIcon className="size-4" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-xs text-foreground">
                        <div>{s.name}</div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          /{s.slug}
                        </div>
                        {s.business_name && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                            <Briefcase className="size-2.5 text-primary shrink-0" />
                            <span className="font-medium text-foreground">{s.business_name}</span>
                          </div>
                        )}
                        {s.professional_name && (
                          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <span className="text-[9px] text-blue-500 font-bold shrink-0">👤</span>
                            <span>{s.professional_name}</span>
                          </div>
                        )}
                        {s.description && (
                          <div className="text-[10px] text-muted-foreground line-clamp-1 max-w-xs font-normal mt-0.5">
                            {s.description}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="space-y-0.5">
                          {s.main_category_name ? (
                            <Badge variant="outline" className="text-[10px] bg-primary/5">
                              {s.main_category_name}
                            </Badge>
                          ) : s.category_name ? (
                            <Badge variant="outline" className="text-[10px]">
                              {s.category_name}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-[10px]">—</span>
                          )}
                          {s.subcategory_name && (
                            <div>
                              <span className="text-[9px] text-muted-foreground">↳ </span>
                              <Badge variant="secondary" className="text-[9px]">
                                {s.subcategory_name}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs">
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {PRICING_MODELS.find((m) => m.value === s.pricing_model)?.label || s.pricing_model || "Fixed"}
                        </Badge>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="size-3" /> {s.duration_minutes || 60} {s.duration_unit || "minutes"}
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
                                  ₹ {Number(s.suggested_price_inr || s.suggested_price || 0).toLocaleString("en-IN")}
                                </div>
                                <div className="text-[10px] text-muted-foreground font-normal flex items-center justify-end gap-1">
                                  <span>
                                    {Array.isArray(s.countries) && s.countries.length > 0
                                      ? `${s.countries.length} ${s.countries.length === 1 ? "country" : "countries"}`
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
                                {Array.isArray(s.countries) && s.countries.length > 0 ? `${s.countries.length} Active` : "2 Active"}
                              </Badge>
                            </div>

                            <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                              {(() => {
                                const activeCodes = Array.isArray(s.countries) && s.countries.length > 0 ? s.countries : ["IN", "US"];
                                return activeCodes.map((code) => {
                                  const meta = getCatalogCountryMeta(code);
                                  const countryP = s.country_pricing?.[code];
                                  const price = countryP?.price !== undefined
                                    ? countryP.price
                                    : code === "IN"
                                      ? (s.suggested_price_inr || s.suggested_price || 0)
                                      : code === "US"
                                        ? (s.suggested_price_usd || 0)
                                        : 0;
                                  const minP = countryP?.min_price !== undefined ? countryP.min_price : (code === "IN" ? s.suggested_min_price : undefined);
                                  const maxP = countryP?.max_price !== undefined ? countryP.max_price : (code === "IN" ? s.suggested_max_price : undefined);

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
                                        <div className="text-[9px] text-muted-foreground font-mono uppercase">
                                          {meta.currencyCode}
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
                      <TableCell className="text-center">
                        {s.is_active ? (
                          <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] gap-1">
                            <CheckCircle2 className="size-3" /> Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground text-[10px] gap-1">
                            <XCircle className="size-3" /> Inactive
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground hover:text-foreground"
                            onClick={() => setDetailService(s)}
                            title="View Service Details"
                          >
                            <Eye className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-amber-600 hover:text-amber-700"
                            onClick={() => openSynonymsManager(s)}
                            title="Manage Synonyms"
                          >
                            <Tag className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-primary hover:text-primary"
                            onClick={() => openEditDialog(s)}
                            title="Edit Service"
                          >
                            <Edit2 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(s.id)}
                            title="Delete Service"
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE / EDIT DIALOG (Full Module 15 Requirements) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Briefcase className="size-5 text-primary" />
              <span>{editingService ? "Edit Master Service" : "Add Master Service"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure master service details, category assignment, country availability, and suggested benchmark pricing.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            <Tabs defaultValue="category" className="w-full">
              <TabsList className="grid grid-cols-4 h-9">
                <TabsTrigger value="category" className="text-xs">Category & Synonyms</TabsTrigger>
                <TabsTrigger value="basic" className="text-xs">Service Info</TabsTrigger>
                <TabsTrigger value="media-attrs" className="text-xs">Media & Attributes</TabsTrigger>
                <TabsTrigger value="pricing" className="text-xs">Suggested Pricing</TabsTrigger>
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
                    <Label className="text-xs font-bold">Main Service Category *</Label>
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
                        <SelectValue placeholder={mainCategories.length === 0 ? "No Categories Found" : "Select Service Category"} />
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
                    <Label className="text-xs font-bold">Sub Service Category</Label>
                    <Select
                      value={subcategoryId}
                      onValueChange={setSubcategoryId}
                      disabled={!mainCategoryId || availableSubcategories.length === 0}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder={!mainCategoryId ? "Select Service Category First" : (availableSubcategories.length === 0 ? "No Subcategories Found" : "Select Subcategory")} />
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
                  <Label className="text-xs font-bold">Service Synonyms (Discovery Keywords)</Label>
                  <Input
                    placeholder="e.g. coding, software, backend, frontend, react (comma-separated)"
                    value={synonymsText}
                    onChange={(e) => setSynonymsText(e.target.value)}
                    className="h-8 text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Alternate keywords and search aliases to ensure discovery across diverse client searches.
                  </p>
                </div>
              </TabsContent>

              {/* TAB 2: BASIC INFO */}
              <TabsContent value="basic" className="space-y-3 pt-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Service Title *</Label>
                    <Input
                      placeholder="e.g. Full Stack Web Application Development"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      required
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">URL Slug *</Label>
                    <Input
                      placeholder="full-stack-web-application-development"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Pricing Model *</Label>
                    <Select value={pricingModel} onValueChange={setPricingModel}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRICING_MODELS.map((pm) => (
                          <SelectItem key={pm.value} value={pm.value}>
                            {pm.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-bold">Estimated Duration</Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min="1"
                        placeholder="60"
                        value={durationValue}
                        onChange={(e) => setDurationValue(e.target.value)}
                        className="h-8 text-xs w-24"
                      />
                      <Select value={durationUnit} onValueChange={setDurationUnit}>
                        <SelectTrigger className="h-8 text-xs flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DURATION_UNITS.map((u) => (
                            <SelectItem key={u} value={u} className="capitalize">
                              {u}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-muted/40 border border-muted/70 rounded-lg space-y-2.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                    <Briefcase className="size-3.5 text-primary" />
                    <span>Store & Professional Assignment</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Assigned Store / Business Profile</Label>
                      <Select value={businessProfileId} onValueChange={setBusinessProfileId}>
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Unassigned (Platform Catalog)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned (Platform Catalog)</SelectItem>
                          {availableBusinesses.map((b) => (
                            <SelectItem key={b.id} value={String(b.id)}>
                              {b.name} {b.city ? `(${b.city})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground">
                        Assign this service under a store to list on its public storefront.
                      </p>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Assigned Professional Profile</Label>
                      <Select value={professionalProfileId} onValueChange={setProfessionalProfileId}>
                        <SelectTrigger className="h-8 text-xs bg-background">
                          <SelectValue placeholder="Unassigned (General Store Service)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Unassigned (General Store Service)</SelectItem>
                          {availableProfessionals.map((p) => (
                            <SelectItem key={p.id} value={String(p.id)}>
                              {p.name} {p.designation ? `— ${p.designation}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[10px] text-muted-foreground">
                        Assign directly under a professional profile (e.g. plumber, doctor, chef).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Service Description</Label>
                  <Textarea
                    placeholder="Provide a comprehensive breakdown of deliverables, inclusions, process, and prerequisites..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="text-xs"
                  />
                </div>

                <div className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                  <div className="space-y-0.5">
                    <Label className="text-xs font-bold">Active / Inactive Status</Label>
                    <p className="text-[11px] text-muted-foreground">
                      Active services are available for selection by professionals and business owners.
                    </p>
                  </div>
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                </div>
              </TabsContent>

              {/* TAB 3: MEDIA & ATTRIBUTES */}
              <TabsContent value="media-attrs" className="space-y-4 pt-3">
                {/* DEFAULT SERVICE IMAGE */}
                <div className="p-3.5 border rounded-xl bg-muted/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <ImageIcon className="size-3.5 text-primary" /> Default Service Image
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Primary representation image shown automatically when providers select this service.
                      </p>
                    </div>
                    {defaultImageUrl && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[10px] gap-1">
                        <CheckCircle2 className="size-3" /> Set
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
                          className="absolute top-1 right-1 size-5 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
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
                          <span>{defaultImageUrl ? "Replace Image" : "Upload Default Image"}</span>
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
                        placeholder="Or direct image URL (https://...)"
                        value={defaultImageUrl}
                        onChange={(e) => setDefaultImageUrl(e.target.value)}
                        className="h-7 text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* ADDITIONAL GALLERY IMAGES */}
                <div className="p-3.5 border rounded-xl bg-muted/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-bold flex items-center gap-1.5">
                        <Layers className="size-3.5 text-primary" /> Additional Gallery Images
                      </Label>
                      <p className="text-[10px] text-muted-foreground">
                        Upload multi-sample photos or process illustrations for this service.
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
                                const list = additionalImagesText
                                  .split("\n")
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                list.splice(idx, 1);
                                setAdditionalImagesText(list.join("\n"));
                              }}
                              className="absolute top-0.5 right-0.5 size-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Delete photo"
                            >
                              <X className="size-2.5" />
                            </button>
                          </div>
                        ))}
                    </div>
                  )}

                  <Textarea
                    placeholder="One URL per line..."
                    value={additionalImagesText}
                    onChange={(e) => setAdditionalImagesText(e.target.value)}
                    rows={2}
                    className="text-xs font-mono"
                  />
                </div>

                {/* SERVICE ATTRIBUTES */}
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-xs font-bold">Service Attributes</Label>
                      <p className="text-[10px] text-muted-foreground">
                        Custom key-value attributes (e.g. Service Type, Warranty, Deliverables, Tools Used).
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
                          placeholder="Attribute name (e.g. Warranty)"
                          value={row.key}
                          onChange={(e) => updateAttributeRow(idx, "key", e.target.value)}
                          className="h-7 text-xs flex-1"
                        />
                        <Input
                          placeholder="Value (e.g. 30 Days Free Service Guarantee)"
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

              {/* TAB 4: SUGGESTED PRICING */}
              <TabsContent value="pricing" className="space-y-4 pt-3">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Tag className="size-3.5 text-primary" /> Suggested Service Benchmark Pricing by Country
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        Configure suggested reference benchmark prices by country. Modifying catalog rates will not overwrite independent provider pricing.
                      </p>
                    </div>
                  </div>

                  {countries.length === 0 ? (
                    <div className="p-4 border rounded-xl bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-2.5">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">No countries available.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {countries.map((cCode) => {
                        const meta = getCatalogCountryMeta(cCode);
                        const cpVal = countryPrices[cCode] || {
                          price: cCode === "IN" ? suggestedPriceInr : cCode === "US" ? suggestedPriceUsd : "",
                          min_price: cCode === "IN" ? suggestedMinPriceInr : cCode === "US" ? suggestedMinPriceUsd : "",
                          max_price: cCode === "IN" ? suggestedMaxPriceInr : cCode === "US" ? suggestedMaxPriceUsd : "",
                        };
                        return (
                          <div key={cCode} className="p-3.5 border rounded-xl bg-muted/10 border-border space-y-3">
                            <div className="flex items-center justify-between border-b pb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">{meta.flag}</span>
                                <div>
                                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    {meta.name} Benchmark & Suggested Pricing ({meta.currencyCode} {meta.currencySymbol})
                                  </Label>
                                  <span className="text-[10px] text-muted-foreground block">
                                    Configure base, minimum, and maximum rates in {meta.currencyCode}
                                  </span>
                                </div>
                              </div>
                              <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                Active in {meta.code}
                              </Badge>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[11px] font-semibold">Suggested Base Price ({meta.currencySymbol})</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder={cCode === "IN" ? "e.g. 1500.00" : "e.g. 45.00"}
                                  value={cpVal.price || ""}
                                  onChange={(e) => updateCountryPriceField(cCode, "price", e.target.value)}
                                  className="h-8 text-xs font-mono"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] font-semibold">Suggested Min Price ({meta.currencySymbol})</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={cpVal.min_price || ""}
                                  onChange={(e) => updateCountryPriceField(cCode, "min_price", e.target.value)}
                                  className="h-8 text-xs font-mono"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] font-semibold">Suggested Max Price ({meta.currencySymbol})</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={cpVal.max_price || ""}
                                  onChange={(e) => updateCountryPriceField(cCode, "max_price", e.target.value)}
                                  className="h-8 text-xs font-mono"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* SERVICE VARIANTS / PACKAGES */}
                <div className="space-y-3 pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Layers className="size-3.5 text-primary" /> Service Packages &amp; Tier Pricing (Optional)
                      </h4>
                      <p className="text-[10px] text-muted-foreground">
                        Define packages or tier levels (e.g. Basic 30m, Standard 60m, Premium HD Package).
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
                            id: `pkg-${Date.now()}`,
                            name: "",
                            price: "",
                            duration: `${durationValue} ${durationUnit}`,
                            description: "",
                          },
                        ])
                      }
                      className="h-7 text-[11px] gap-1 cursor-pointer"
                    >
                      <Plus className="size-3" /> Add Package Variant
                    </Button>
                  </div>

                  {variants.length === 0 ? (
                    <div className="p-3 text-center rounded-xl border border-dashed text-xs text-muted-foreground bg-muted/10">
                      No packages defined. Base pricing applies. Click <strong>+ Add Package Variant</strong> to define service tiers.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-muted-foreground px-1">
                        <span className="col-span-4">Package / Tier Name</span>
                        <span className="col-span-2">Price (₹) *</span>
                        <span className="col-span-2">Duration</span>
                        <span className="col-span-3">Description / Inclusions</span>
                        <span className="col-span-1 text-right">Action</span>
                      </div>
                      {variants.map((v, vIdx) => (
                        <div key={v.id || vIdx} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-xl border">
                          <div className="col-span-4">
                            <Input
                              placeholder="e.g. Premium Bridal Package"
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
                              placeholder="₹ Price"
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
                              placeholder="e.g. 90 mins"
                              value={v.duration}
                              onChange={(e) => {
                                const copy = [...variants];
                                copy[vIdx].duration = e.target.value;
                                setVariants(copy);
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div className="col-span-3">
                            <Input
                              placeholder="e.g. Includes hair styling"
                              value={v.description}
                              onChange={(e) => {
                                const copy = [...variants];
                                copy[vIdx].description = e.target.value;
                                setVariants(copy);
                              }}
                              className="h-7 text-xs"
                            />
                          </div>
                          <div className="col-span-1 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => setVariants((prev) => prev.filter((_, i) => i !== vIdx))}
                              className="size-7 text-destructive hover:bg-destructive/10 cursor-pointer"
                              title="Delete package"
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
                {editingService ? "Update Master Service" : "Save Master Service"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* BULK IMPORT DIALOG */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <FileSpreadsheet className="size-5 text-primary" />
              <span>Bulk Import Services</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Paste a JSON array of services or CSV lines (name, pricing_model, suggested_price_inr, suggested_price_usd).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Textarea
              placeholder={`[\n  {\n    "name": "Accounting & Tax Filing",\n    "pricing_model": "fixed",\n    "suggested_price_inr": 5000,\n    "suggested_price_usd": 150\n  }\n]`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              rows={8}
              className="text-xs font-mono"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportDialogOpen(false)}
              disabled={importing}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleImportJson}
              disabled={importing}
              className="text-xs font-bold gap-1.5"
            >
              {importing && <Loader2 className="size-3.5 animate-spin" />}
              Import Services
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* VIEW DETAILS DIALOG */}
      <Dialog open={Boolean(detailService)} onOpenChange={(open) => !open && setDetailService(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailService && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-start gap-3">
                  {detailService.default_image_url ? (
                    <img
                      src={detailService.default_image_url}
                      alt={detailService.name}
                      className="size-16 rounded-xl object-cover border shrink-0"
                    />
                  ) : (
                    <div className="size-16 rounded-xl bg-muted flex items-center justify-center text-muted-foreground border shrink-0">
                      <Briefcase className="size-8" />
                    </div>
                  )}
                  <div className="space-y-1">
                    <DialogTitle className="text-lg font-black">{detailService.name}</DialogTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">/{detailService.slug}</span>
                      {detailService.is_active ? (
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

              {detailService.description && (
                <div className="p-3 bg-muted/20 rounded-lg text-xs text-foreground/80 leading-relaxed">
                  {detailService.description}
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 border rounded-lg bg-muted/10 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Main Category</span>
                  <span className="font-semibold">{detailService.main_category_name || detailService.category_name || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Subcategory</span>
                  <span className="font-semibold">{detailService.subcategory_name || "—"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Pricing Model</span>
                  <span className="font-semibold capitalize">{detailService.pricing_model || "Fixed"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Duration</span>
                  <span className="font-semibold">{detailService.duration_minutes || 60} {detailService.duration_unit || "minutes"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">India Benchmark</span>
                  <span className="font-bold text-foreground">₹ {Number(detailService.suggested_price_inr || detailService.suggested_price || 0).toLocaleString("en-IN")}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">USA Benchmark</span>
                  <span className="font-bold text-foreground">$ {Number(detailService.suggested_price_usd || 0).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Country Availability</span>
                  <span className="font-mono font-semibold">{(detailService.countries || []).join(", ") || "All"}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Created At</span>
                  <span className="text-muted-foreground">{new Date(detailService.created_at).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block font-bold uppercase">Updated At</span>
                  <span className="text-muted-foreground">{new Date(detailService.updated_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* SYNONYMS */}
              {detailService.synonyms && detailService.synonyms.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Synonyms / Search Terms</h4>
                  <div className="flex flex-wrap gap-1">
                    {detailService.synonyms.map((syn, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {syn}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* ATTRIBUTES */}
              {detailService.attributes && Object.keys(detailService.attributes).length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Service Attributes</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(detailService.attributes).map(([key, value]) => (
                      <div key={key} className="p-2 border rounded-md bg-muted/20 text-xs">
                        <span className="text-[10px] text-muted-foreground block font-bold uppercase">{key}</span>
                        <span className="font-medium text-foreground">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ADDITIONAL GALLERY IMAGES */}
              {detailService.additional_images && detailService.additional_images.length > 0 && (
                <div className="space-y-1.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gallery & Sample Photos</h4>
                  <div className="flex flex-wrap gap-2">
                    {detailService.additional_images.map((img, idx) => (
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
                  onClick={() => setDetailService(null)}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    const s = detailService;
                    setDetailService(null);
                    openEditDialog(s);
                  }}
                  className="text-xs font-bold gap-1"
                >
                  <Edit2 className="size-3" /> Edit Service
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* SYNONYM MANAGEMENT DIALOG (PART 8) */}
      <Dialog open={synonymModalOpen} onOpenChange={setSynonymModalOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Tag className="size-4 text-amber-600" />
              Service Synonyms: {synonymTargetService?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Part 8: Manage multiple search synonyms with case-insensitive matching, duplicate detection, language, and country targeting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {/* Add Synonym Form */}
            <div className="p-3 border rounded-lg bg-muted/20 space-y-2.5">
              <span className="font-semibold text-foreground text-[11px]">Add New Synonym</span>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Website Design, Web Building..."
                  value={newSynonymText}
                  onChange={(e) => setNewSynonymText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSynonym();
                    }
                  }}
                  className="h-8 text-xs flex-1"
                />
                <Select value={newSynonymLang} onValueChange={setNewSynonymLang}>
                  <SelectTrigger className="w-20 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">EN</SelectItem>
                    <SelectItem value="hi">HI</SelectItem>
                    <SelectItem value="es">ES</SelectItem>
                    <SelectItem value="fr">FR</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={newSynonymCountry} onValueChange={setNewSynonymCountry}>
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="IN">IN (₹)</SelectItem>
                    <SelectItem value="US">US ($)</SelectItem>
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={handleAddSynonym} className="h-8 text-xs gap-1">
                  <Plus className="size-3" /> Add
                </Button>
              </div>
            </div>

            {/* Synonyms Table */}
            <div className="border rounded-lg overflow-hidden bg-card">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40">
                    <TableHead className="text-xs font-bold">Synonym</TableHead>
                    <TableHead className="text-xs font-bold w-16">Lang</TableHead>
                    <TableHead className="text-xs font-bold w-16">Country</TableHead>
                    <TableHead className="text-xs font-bold w-20 text-center">Status</TableHead>
                    <TableHead className="text-xs font-bold w-12 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingSynonyms ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                        <Loader2 className="size-4 animate-spin mx-auto mb-1" />
                        Loading synonyms...
                      </TableCell>
                    </TableRow>
                  ) : serviceSynonymsList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                        No custom synonyms added yet. Type above to add synonyms for search indexing.
                      </TableCell>
                    </TableRow>
                  ) : (
                    serviceSynonymsList.map((syn) => (
                      <TableRow key={syn.id}>
                        <TableCell className="font-medium text-xs text-foreground">
                          {syn.synonym}
                        </TableCell>
                        <TableCell className="text-xs uppercase text-muted-foreground font-mono">
                          {syn.language || "en"}
                        </TableCell>
                        <TableCell className="text-xs uppercase text-muted-foreground font-mono">
                          {syn.country_code || "All"}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={syn.is_active}
                            onCheckedChange={() => handleToggleSynonym(syn.id, syn.is_active)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSynonym(syn.id)}
                            className="size-6 text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
