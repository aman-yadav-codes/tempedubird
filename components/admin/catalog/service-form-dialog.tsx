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
  Briefcase,
  Plus,
  Trash2,
  Image as ImageIcon,
  CheckCircle2,
  Layers,
  Upload,
  X,
  Loader2,
  Clock,
  Globe,
  MapPin,
  IndianRupee,
} from "lucide-react";
import { toast } from "sonner";
import { useBusinessCurrency } from "@/hooks/use-business-currency";

export const PRICING_MODEL_OPTIONS = [
  { value: "fixed_price", label: "Fixed Price" },
  { value: "hourly", label: "Hourly Rate" },
  { value: "per_session", label: "Per Session" },
  { value: "per_visit", label: "Per Visit" },
  { value: "per_day", label: "Per Day" },
  { value: "per_project", label: "Per Project" },
  { value: "starting_from", label: "Starting From" },
  { value: "price_range", label: "Price Range" },
  { value: "free_consultation", label: "Free Consultation" },
  { value: "quote_required", label: "Quote on Request" },
];

export interface ServiceVariantItem {
  id: string;
  name: string;
  price: string | number;
  regular_price?: string | number;
  duration_minutes?: number | string;
  features?: string;
}

export interface ServiceFormData {
  id?: number;
  title: string;
  slug?: string;
  description?: string;
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
  variants?: ServiceVariantItem[];
  synonyms?: string[];
  pricing_model?: string;
  duration_minutes?: number;
  duration_unit?: string;
  delivery_mode?: string;
  service_location?: string;
  price: number | string;
  sale_price?: number | string | null;
  status?: "active" | "draft" | "archived";
}

interface ServiceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service?: ServiceFormData | null;
  onSuccess: () => void;
  apiEndpoint?: string; // defaults to "/api/admin/marketing/services"
  accessToken?: string | null;
}

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
  onSuccess,
  apiEndpoint = "/api/admin/marketing/services",
  accessToken,
}: ServiceFormDialogProps) {
  const { currencyCode, currencySymbol } = useBusinessCurrency();
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
  const [description, setDescription] = useState("");
  const [businessCategoryId, setBusinessCategoryId] = useState<string>("");
  const [mainCategoryId, setMainCategoryId] = useState<string>("");
  const [subcategoryId, setSubcategoryId] = useState<string>("");
  const [businessProfileId, setBusinessProfileId] = useState<string>("none");
  const [professionalProfileId, setProfessionalProfileId] = useState<string>("none");
  const [synonymsText, setSynonymsText] = useState("");
  const [defaultImageUrl, setDefaultImageUrl] = useState("");
  const [additionalImagesText, setAdditionalImagesText] = useState("");
  const [pricingModel, setPricingModel] = useState("fixed_price");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [durationUnit, setDurationUnit] = useState("minutes");
  const [deliveryMode, setDeliveryMode] = useState("online");
  const [serviceLocation, setServiceLocation] = useState("");
  const [attributeRows, setAttributeRows] = useState<{ key: string; value: string }[]>([
    { key: "", value: "" },
  ]);
  const [variants, setVariants] = useState<ServiceVariantItem[]>([]);
  const [price, setPrice] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [isActive, setIsActive] = useState(true);

  // Upload States
  const [uploadingDefaultImage, setUploadingDefaultImage] = useState(false);
  const [uploadingAdditional, setUploadingAdditional] = useState(false);

  // Slug auto-generation
  const handleNameChange = (val: string) => {
    setName(val);
    if (!service?.id) {
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
      fetch(`/api/admin/categories?type=service&limit=1000`, { headers }).then((r) => r.json()),
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

  // Sync Form fields with Service
  useEffect(() => {
    if (service) {
      setName(service.title || "");
      setSlug(service.slug || "");
      setDescription(service.description || "");
      setBusinessCategoryId(service.business_category_id ? String(service.business_category_id) : "");
      setMainCategoryId(service.main_category_id ? String(service.main_category_id) : service.category_id ? String(service.category_id) : "");
      setSubcategoryId(service.subcategory_id ? String(service.subcategory_id) : "");
      setBusinessProfileId(service.business_profile_id ? String(service.business_profile_id) : "none");
      setProfessionalProfileId(service.professional_profile_id ? String(service.professional_profile_id) : "none");
      setSynonymsText(Array.isArray(service.synonyms) ? service.synonyms.join(", ") : "");
      setDefaultImageUrl(service.image_url || "");
      setAdditionalImagesText(Array.isArray(service.gallery) ? service.gallery.join("\n") : "");
      setPricingModel(service.pricing_model || "fixed_price");
      setDurationMinutes(service.duration_minutes ? String(service.duration_minutes) : "60");
      setDurationUnit(service.duration_unit || "minutes");
      setDeliveryMode(service.delivery_mode || "online");
      setServiceLocation(service.service_location || "");

      if (service.attributes && typeof service.attributes === "object") {
        const rows = Object.entries(service.attributes).map(([k, v]) => ({ key: k, value: String(v) }));
        setAttributeRows(rows.length ? rows : [{ key: "", value: "" }]);
      } else {
        setAttributeRows([{ key: "", value: "" }]);
      }

      setVariants(Array.isArray(service.variants) ? service.variants : []);
      setPrice(service.price ? String(service.price) : "");
      setSalePrice(service.sale_price !== null && service.sale_price !== undefined ? String(service.sale_price) : "");
      setIsActive(service.status !== "draft" && service.status !== "archived");
    } else {
      setName("");
      setSlug("");
      setDescription("");
      setBusinessCategoryId("");
      setMainCategoryId("");
      setSubcategoryId("");
      setBusinessProfileId("none");
      setProfessionalProfileId("none");
      setSynonymsText("");
      setDefaultImageUrl("");
      setAdditionalImagesText("");
      setPricingModel("fixed_price");
      setDurationMinutes("60");
      setDurationUnit("minutes");
      setDeliveryMode("online");
      setServiceLocation("");
      setAttributeRows([{ key: "", value: "" }]);
      setVariants([]);
      setPrice("");
      setSalePrice("");
      setIsActive(true);
    }
    setActiveTab("category");
  }, [service, open]);

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
      formData.append("folder", "services");

      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData,
      });
      const data = await res.json();
      if (data.url) {
        setDefaultImageUrl(data.url);
        toast.success("Default service image uploaded successfully");
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
        formData.append("folder", "services");
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
        toast.success(`Uploaded ${uploadedUrls.length} additional photo(s)`);
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
      toast.error("Service title is required");
      setActiveTab("basic");
      return;
    }

    setSubmitting(true);
    try {
      const attributesObj: Record<string, string> = {};
      attributeRows.forEach((r) => {
        if (r.key.trim() && r.value.trim()) {
          attributesObj[r.key.trim()] = r.value.trim();
        }
      });

      const galleryList = additionalImagesText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const synonymsList = synonymsText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const selectedMainCat = categories.find((c) => String(c.id) === mainCategoryId);
      const categoryName = selectedMainCat?.name || "General";

      const payload = {
        id: service?.id,
        title: name.trim(),
        name: name.trim(),
        slug: slug.trim() || undefined,
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
        pricing_model: pricingModel || "fixed_price",
        duration_minutes: parseInt(durationMinutes) || 60,
        duration_unit: durationUnit || "minutes",
        delivery_mode: deliveryMode || "online",
        service_location: serviceLocation.trim() || null,
        price: parseFloat(price) || 0,
        currency: currencyCode || "INR",
        suggested_price: parseFloat(price) || 0,
        suggested_price_inr: parseFloat(price) || 0,
        sale_price: salePrice ? parseFloat(salePrice) : null,
        status: isActive ? "active" : "draft",
        is_active: isActive,
      };

      const method = service?.id ? "PUT" : "POST";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(apiEndpoint, {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save service");

      toast.success(service?.id ? "Service updated successfully!" : "Service created successfully!");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Failed to save service");
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
              <Briefcase className="size-5 text-sky-600" />
              <span>{service?.id ? "Edit Service Listing" : "Add Service"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure service details, pricing models, durations, deliverables, and service packages.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* FORM CONTENT */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-4 h-9">
              <TabsTrigger value="category" className="text-xs">Category & Synonyms</TabsTrigger>
              <TabsTrigger value="basic" className="text-xs">Service Info</TabsTrigger>
              <TabsTrigger value="media-attrs" className="text-xs">Media & Attributes</TabsTrigger>
              <TabsTrigger value="pricing" className="text-xs">Pricing & Packages</TabsTrigger>
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
                <Label className="text-xs font-bold">Service Synonyms (Search Keywords)</Label>
                <Input
                  placeholder="e.g. legal advisory, contract drafting, corporate compliance (comma-separated)"
                  value={synonymsText}
                  onChange={(e) => setSynonymsText(e.target.value)}
                  className="h-8 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Alternate names and keywords to boost visibility when customers search for this service.
                </p>
              </div>
            </TabsContent>

            {/* TAB 2: SERVICE INFO */}
            <TabsContent value="basic" className="space-y-3 pt-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Service Title *</Label>
                  <Input
                    placeholder="e.g. Comprehensive Corporate Legal Audit"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    required
                    className="h-8 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-bold">URL Slug *</Label>
                  <Input
                    placeholder="corporate-legal-audit"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Pricing Model *</Label>
                  <Select value={pricingModel} onValueChange={setPricingModel}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select Pricing Model" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRICING_MODEL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
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
                      placeholder="60"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                    <Select value={durationUnit} onValueChange={setDurationUnit}>
                      <SelectTrigger className="h-8 text-xs w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minutes">Minutes</SelectItem>
                        <SelectItem value="hours">Hours</SelectItem>
                        <SelectItem value="days">Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Delivery Mode</Label>
                  <Select value={deliveryMode} onValueChange={setDeliveryMode}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online / Virtual</SelectItem>
                      <SelectItem value="in_person">In-Person / Onsite</SelectItem>
                      <SelectItem value="hybrid">Hybrid (Both)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Service Location / Coverage (Optional)</Label>
                <Input
                  placeholder="e.g. Pan India, Client Premises, or Virtual via Zoom"
                  value={serviceLocation}
                  onChange={(e) => setServiceLocation(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>

              <div className="p-3 bg-muted/40 border border-muted/70 rounded-lg space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-foreground">
                  <Briefcase className="size-3.5 text-sky-600" />
                  <span>Store & Professional Assignment</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Assigned Business / Store</Label>
                    <Select value={businessProfileId} onValueChange={setBusinessProfileId}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned / General</SelectItem>
                        {availableBusinesses.map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.name} {b.city ? `(${b.city})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Assigned Specialist Professional</Label>
                    <Select value={professionalProfileId} onValueChange={setProfessionalProfileId}>
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Unassigned / General</SelectItem>
                        {availableProfessionals.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name} {p.designation ? `— ${p.designation}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-bold">Service Description & Scope</Label>
                <Textarea
                  placeholder="Provide comprehensive details of what is included, deliverables, process, and prerequisites..."
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
                    Active services appear in your public profile and customer booking.
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
                      <ImageIcon className="size-3.5 text-sky-600" /> Default Service Image
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      Upload or replace the primary service banner/image.
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
                      <Briefcase className="size-6 text-muted-foreground/50" />
                      <span className="text-[9px] mt-1 font-semibold">No Image</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold bg-sky-600 text-white hover:bg-sky-700 transition-colors shadow-xs">
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
                      <Layers className="size-3.5 text-sky-600" /> Additional Service Photos / Portfolio
                    </Label>
                    <p className="text-[10px] text-muted-foreground">
                      Upload or paste multiple portfolio photos.
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

              {/* SERVICE ATTRIBUTES */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-xs font-bold">Service Attributes & Features</Label>
                    <p className="text-[10px] text-muted-foreground">
                      Custom attributes (e.g. Prerequisites, Deliverables, Tools Used).
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
                        placeholder="Key (e.g. Turnaround Time)"
                        value={row.key}
                        onChange={(e) => updateAttributeRow(idx, "key", e.target.value)}
                        className="h-7 text-xs flex-1"
                      />
                      <Input
                        placeholder="Value (e.g. 3-5 Business Days)"
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

            {/* TAB 4: PRICING & PACKAGES */}
            <TabsContent value="pricing" className="space-y-4 pt-3">
              <div className="p-3.5 border rounded-xl bg-muted/10 border-border space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <IndianRupee className="size-3.5 text-sky-600" /> Base Service Pricing
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Service Rate / Base Price ({currencySymbol}) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 2500.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="h-8 text-xs font-mono font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px] font-semibold">Regular / MRP Price ({currencySymbol})</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="e.g. 3500.00"
                      value={salePrice}
                      onChange={(e) => setSalePrice(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* SERVICE PACKAGES & TIERS */}
              <div className="space-y-3 pt-3 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Layers className="size-3.5 text-sky-600" /> Service Packages &amp; Tiers (Basic, Standard, Premium)
                    </h4>
                    <p className="text-[10px] text-muted-foreground">
                      Define tiers or add-on packages with individual pricing and deliverables.
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
                          duration_minutes: durationMinutes || "60",
                          features: "",
                        },
                      ])
                    }
                    className="h-7 text-[11px] gap-1 cursor-pointer"
                  >
                    <Plus className="size-3" /> Add Package
                  </Button>
                </div>

                {variants.length === 0 ? (
                  <div className="p-3 text-center rounded-xl border border-dashed text-xs text-muted-foreground bg-muted/10">
                    No custom packages added. Standard rate applies. Click <strong>+ Add Package</strong> to define tiers (e.g., Basic, Standard, Premium).
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-muted-foreground px-1">
                      <span className="col-span-4">Package Name</span>
                      <span className="col-span-2">Price ({currencySymbol}) *</span>
                      <span className="col-span-2">Regular ({currencySymbol})</span>
                      <span className="col-span-3">Features / Inclusions</span>
                      <span className="col-span-1 text-right">Action</span>
                    </div>

                    {variants.map((v, vIdx) => (
                      <div key={v.id || vIdx} className="grid grid-cols-12 gap-2 items-center bg-muted/20 p-2 rounded-xl border border-border">
                        <div className="col-span-4">
                          <Input
                            placeholder="e.g. Comprehensive Retainer"
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

                        <div className="col-span-3">
                          <Input
                            placeholder="e.g. 5 Revisions, 24/7 Support"
                            value={v.features || ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setVariants((prev) => {
                                const copy = [...prev];
                                copy[vIdx] = { ...copy[vIdx], features: val };
                                return copy;
                              });
                            }}
                            className="h-8 text-xs"
                          />
                        </div>

                        <div className="col-span-1 flex justify-end">
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
              className="gap-1.5 font-bold bg-sky-600 hover:bg-sky-700 text-white"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5" />
                  {service?.id ? "Update Service" : "Save Service"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
