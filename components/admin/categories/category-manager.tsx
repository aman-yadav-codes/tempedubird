"use client";

import { useEffect, useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { ImageUploadInput } from "@/components/shared/image-upload-input";
import {
  FolderTree,
  Plus,
  Search,
  Building2,
  Package,
  Briefcase,
  Layers,
  Edit2,
  Trash2,
  Loader2,
  Folder,
  ArrowRight,
  Sparkles,
  Info,
  UserCheck,
  CheckCircle2,
  X,
  Filter,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  parent_name?: string | null;
  depth: number;
  category_type?: string;
  business_category_id?: number | null;
  business_subcategory_id?: number | null;
  business_category_name?: string | null;
  business_subcategory_name?: string | null;
  icon_url?: string | null;
  image_url?: string | null;
  description?: string | null;
  synonyms?: string[] | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
}

interface BizCategoryOption {
  id: number;
  name: string;
  slug: string;
  parent_id?: number | null;
}

export function CategoryManagerContent() {
  const { accessToken } = useAuthStore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Tab state synced with URL query ?type=
  const urlType = searchParams.get("type") || "all";
  const [activeTab, setActiveTab] = useState<string>(urlType);

  // Categories list state
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Industry Filter state in table
  const [filterBizCatId, setFilterBizCatId] = useState<string>("all");
  const [filterBizSubcatId, setFilterBizSubcatId] = useState<string>("all");
  const [filterProfCatId, setFilterProfCatId] = useState<string>("all");

  // Root Business & Professional Categories (for dropdowns)
  const [businessRootCategories, setBusinessRootCategories] = useState<BizCategoryOption[]>([]);
  const [professionalRootCategories, setProfessionalRootCategories] = useState<BizCategoryOption[]>([]);
  // Business Subcategories cache (keyed by parent_id)
  const [bizSubcategoriesMap, setBizSubcategoriesMap] = useState<Record<number, BizCategoryOption[]>>({});
  const [loadingSubcategories, setLoadingSubcategories] = useState(false);

  // Dialog states
  // 1. Business Category Modal (Root)
  const [bizCatDialogOpen, setBizCatDialogOpen] = useState(false);
  // 2. Business Subcategory Modal
  const [bizSubcatDialogOpen, setBizSubcatDialogOpen] = useState(false);
  // 3. Product / Service / Professional Category Modal (Enforces 2-step flow)
  const [catalogCatDialogOpen, setCatalogCatDialogOpen] = useState(false);
  // 4. Edit Dialog
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  const [saving, setSaving] = useState(false);

  // Form State for Business Category (Root)
  const [bizCatName, setBizCatName] = useState("");
  const [bizCatSlug, setBizCatSlug] = useState("");
  const [bizCatIcon, setBizCatIcon] = useState("");
  const [bizCatDesc, setBizCatDesc] = useState("");

  // Form State for Business Subcategory
  const [bizSubcatParentId, setBizSubcatParentId] = useState<string>("");
  const [bizSubcatName, setBizSubcatName] = useState("");
  const [bizSubcatSlug, setBizSubcatSlug] = useState("");
  const [bizSubcatIcon, setBizSubcatIcon] = useState("");
  const [bizSubcatDesc, setBizSubcatDesc] = useState("");

  // Form State for Product / Service / Professional Category (2-step)
  const [formBizCatId, setFormBizCatId] = useState<string>("");
  const [formBizSubcatId, setFormBizSubcatId] = useState<string>("");
  const [formType, setFormType] = useState<"product" | "service" | "professional" | "course" | "job">("product");
  const [formParentId, setFormParentId] = useState<string>("none");
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formIconUrl, setFormIconUrl] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formSynonyms, setFormSynonyms] = useState("");

  // Keep state synced with URL
  useEffect(() => {
    const currentUrlType = searchParams.get("type") || "all";
    if (currentUrlType !== activeTab) {
      setActiveTab(currentUrlType);
      setFilterBizCatId("all");
      setFilterBizSubcatId("all");
      setSearch("");
      setPage(1);
    }
  }, [searchParams]);

  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setFilterBizCatId("all");
    setFilterBizSubcatId("all");
    setSearch("");
    setPage(1);
    const params = new URLSearchParams(searchParams.toString());
    if (val === "all") {
      params.delete("type");
    } else {
      params.set("type", val);
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  // Load root business and professional categories for all select dropdowns
  const loadBusinessRoots = useCallback(async () => {
    try {
      const [bizRes, profRes] = await Promise.all([
        fetch("/api/admin/categories?type=business&onlyRoot=true&limit=150", {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        }),
        fetch("/api/admin/categories?type=professional&onlyRoot=true&limit=150", {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        }),
      ]);
      const [bizData, profData] = await Promise.all([bizRes.json(), profRes.json()]);
      if (bizRes.ok && bizData.data) {
        setBusinessRootCategories(bizData.data);
      }
      if (profRes.ok && profData.data) {
        setProfessionalRootCategories(profData.data);
      }
    } catch {
      // silently handle
    }
  }, [accessToken]);

  useEffect(() => {
    loadBusinessRoots();
  }, [loadBusinessRoots]);

  // Load subcategories for a specific business category
  const loadBusinessSubcategories = useCallback(async (parentId: number) => {
    if (bizSubcategoriesMap[parentId]) return;
    setLoadingSubcategories(true);
    try {
      const res = await fetch(`/api/admin/categories?type=business&parentId=${parentId}&limit=150`, {
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      const data = await res.json();
      if (res.ok && data.data) {
        setBizSubcategoriesMap((prev) => ({ ...prev, [parentId]: data.data }));
      }
    } catch {
      // silently handle
    } finally {
      setLoadingSubcategories(false);
    }
  }, [accessToken, bizSubcategoriesMap]);

  // Load Main Categories Table Data
  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const typeParam = activeTab === "all" ? "" : `&type=${activeTab}`;
      const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";
      const bizCatParam =
        activeTab !== "professional" && filterBizCatId !== "all"
          ? `&business_category_id=${filterBizCatId}`
          : "";
      const bizSubcatParam =
        activeTab !== "professional" && filterBizSubcatId !== "all"
          ? `&business_subcategory_id=${filterBizSubcatId}`
          : "";
      const profParentParam =
        activeTab === "professional" && filterProfCatId !== "all"
          ? `&parentId=${filterProfCatId}`
          : "";

      const res = await fetch(
        `/api/admin/categories?page=${page}&limit=50${typeParam}${searchParam}${bizCatParam}${bizSubcatParam}${profParentParam}`,
        {
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        }
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to load categories");
      }
      if (data.data) {
        setCategories(data.data);
        setTotalCount(data.total !== undefined ? data.total : data.data.length);
      } else {
        setCategories([]);
        setTotalCount(0);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load categories");
    } finally {
      setLoading(false);
    }
  }, [accessToken, activeTab, search, page, filterBizCatId, filterBizSubcatId, filterProfCatId]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Slug auto-generators
  const generateSlug = (val: string) => {
    return val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-");
  };

  // 1. OPEN ADD BUSINESS CATEGORY MODAL
  const openAddBizCatDialog = () => {
    setBizCatName("");
    setBizCatSlug("");
    setBizCatIcon("");
    setBizCatDesc("");
    setBizCatDialogOpen(true);
  };

  // 2. OPEN ADD BUSINESS SUBCATEGORY MODAL
  const openAddBizSubcatDialog = () => {
    setBizSubcatParentId(businessRootCategories[0]?.id ? String(businessRootCategories[0].id) : "");
    setBizSubcatName("");
    setBizSubcatSlug("");
    setBizSubcatIcon("");
    setBizSubcatDesc("");
    setBizSubcatDialogOpen(true);
  };

  // 3. OPEN ADD PRODUCT / SERVICE / PROFESSIONAL / COURSE / JOB CATEGORY MODAL (Mandatory 2-Step)
  const openAddCatalogCatDialog = (targetType?: "product" | "service" | "professional" | "course" | "job") => {
    const determinedType =
      targetType ||
      (activeTab === "product"
        ? "product"
        : activeTab === "service"
          ? "service"
          : activeTab === "professional"
            ? "professional"
            : activeTab === "course"
              ? "course"
              : activeTab === "job"
                ? "job"
                : "product");

    setFormType(determinedType);

    // If course, default Business Category to Education & Coaching (7816)
    let defaultBizCatId = businessRootCategories[0]?.id ? String(businessRootCategories[0].id) : "";
    if (determinedType === "course") {
      const eduCat = businessRootCategories.find(
        (b) => b.id === 7816 || b.name.toLowerCase().includes("education")
      );
      if (eduCat) {
        defaultBizCatId = String(eduCat.id);
      }
    }

    setFormBizCatId(defaultBizCatId);
    setFormBizSubcatId("");
    if (defaultBizCatId) {
      loadBusinessSubcategories(Number(defaultBizCatId));
    }
    setFormParentId("none");
    setFormName("");
    setFormSlug("");
    setFormIconUrl("");
    setFormDesc("");
    setFormSynonyms("");
    setCatalogCatDialogOpen(true);
  };

  // 4. OPEN EDIT MODAL
  const openEditModal = (cat: CategoryItem) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormSlug(cat.slug);
    setFormType((cat.category_type as any) || "business");
    setFormParentId(cat.parent_id ? String(cat.parent_id) : "none");
    setFormBizCatId(cat.business_category_id ? String(cat.business_category_id) : "");
    setFormBizSubcatId(cat.business_subcategory_id ? String(cat.business_subcategory_id) : "");
    if (cat.business_category_id) {
      loadBusinessSubcategories(cat.business_category_id);
    }
    setFormIconUrl(cat.icon_url || "");
    setFormDesc(cat.description || "");
    setFormSynonyms(Array.isArray(cat.synonyms) ? cat.synonyms.join(", ") : "");
    setEditDialogOpen(true);
  };

  // SUBMIT 1: SAVE BUSINESS CATEGORY (ROOT)
  const handleSaveBizCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizCatName.trim()) {
      toast.error("Please enter a business category name");
      return;
    }
    setSaving(true);
    try {
      const slug = bizCatSlug.trim() || generateSlug(bizCatName);
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          name: bizCatName.trim(),
          slug,
          category_type: "business",
          parentId: null,
          icon_url: bizCatIcon.trim() || null,
          description: bizCatDesc.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create business category");

      toast.success("Business Category created successfully");
      setBizCatDialogOpen(false);
      loadBusinessRoots();
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  // SUBMIT 2: SAVE BUSINESS SUBCATEGORY
  const handleSaveBizSubcategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bizSubcatParentId) {
      toast.error("Please select a parent Business Category");
      return;
    }
    if (!bizSubcatName.trim()) {
      toast.error("Please enter a business subcategory name");
      return;
    }
    setSaving(true);
    try {
      const slug = bizSubcatSlug.trim() || generateSlug(bizSubcatName);
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          name: bizSubcatName.trim(),
          slug,
          category_type: "business",
          parentId: Number(bizSubcatParentId),
          icon_url: bizSubcatIcon.trim() || null,
          description: bizSubcatDesc.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create business subcategory");

      toast.success("Business Subcategory created successfully");
      setBizSubcatDialogOpen(false);
      // Invalidate cache for this parent
      setBizSubcategoriesMap((prev) => {
        const next = { ...prev };
        delete next[Number(bizSubcatParentId)];
        return next;
      });
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to save subcategory");
    } finally {
      setSaving(false);
    }
  };

  // SUBMIT 3: SAVE PRODUCT / SERVICE / PROFESSIONAL CATEGORY
  const handleSaveCatalogCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBizCatId) {
      toast.error("Please select a Business Category");
      return;
    }
    if (!formName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    setSaving(true);
    try {
      const slug = generateSlug(formName);
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          name: formName.trim(),
          slug,
          category_type: formType,
          business_category_id: Number(formBizCatId),
          business_subcategory_id: formBizSubcatId ? Number(formBizSubcatId) : null,
          parentId: null,
          icon_url: formIconUrl.trim() || null,
          description: formDesc.trim() || null,
          synonyms: formSynonyms.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create category");

      toast.success(`${formType.charAt(0).toUpperCase() + formType.slice(1)} Category created successfully`);
      setCatalogCatDialogOpen(false);
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to save category");
    } finally {
      setSaving(false);
    }
  };

  // SUBMIT 4: SAVE EDIT
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    if (!formName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    setSaving(true);
    try {
      const slug = formSlug.trim() || generateSlug(formName);
      const payload: any = {
        name: formName.trim(),
        slug,
        category_type: formType,
        parentId: formParentId !== "none" ? Number(formParentId) : null,
        business_category_id: formBizCatId ? Number(formBizCatId) : null,
        business_subcategory_id: formBizSubcatId ? Number(formBizSubcatId) : null,
        icon_url: formIconUrl.trim() || null,
        description: formDesc.trim() || null,
        synonyms: formSynonyms.split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean),
      };

      const res = await fetch(`/api/admin/categories/${editingCategory.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update category");

      toast.success("Category updated successfully");
      setEditDialogOpen(false);
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || "Error updating category");
    } finally {
      setSaving(false);
    }
  };

  // DELETE CATEGORY
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this category?")) return;
    try {
      const res = await fetch(`/api/admin/categories/${id}`, {
        method: "DELETE",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete category");
      }
      toast.success("Category deleted successfully");
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    }
  };

  // TOGGLE STATUS
  const handleToggleStatus = async (cat: CategoryItem) => {
    try {
      const res = await fetch(`/api/admin/categories/${cat.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ isActive: !cat.is_active }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Category ${!cat.is_active ? "activated" : "deactivated"}`);
      loadCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle status");
    }
  };

  // Active subcategories list for formBizCatId
  const currentFormSubcategories = useMemo(() => {
    if (!formBizCatId) return [];
    return bizSubcategoriesMap[Number(formBizCatId)] || [];
  }, [formBizCatId, bizSubcategoriesMap]);

  // Active subcategories list for table filter
  const currentFilterSubcategories = useMemo(() => {
    if (filterBizCatId === "all") return [];
    return bizSubcategoriesMap[Number(filterBizCatId)] || [];
  }, [filterBizCatId, bizSubcategoriesMap]);

  // Selected names for badges
  const selectedBizCat = useMemo(() => {
    return businessRootCategories.find((b) => String(b.id) === formBizCatId);
  }, [businessRootCategories, formBizCatId]);

  const selectedBizSubcat = useMemo(() => {
    return currentFormSubcategories.find((s) => String(s.id) === formBizSubcatId);
  }, [currentFormSubcategories, formBizSubcatId]);

  // Parent options within same category type
  const parentTypeOptions = useMemo(() => {
    return categories.filter(
      (c) =>
        c.category_type === formType &&
        (!editingCategory || c.id !== editingCategory.id) &&
        c.depth === 1
    );
  }, [categories, formType, editingCategory]);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-xs">
              <FolderTree className="size-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-foreground">
                {activeTab === "business"
                  ? "Business Categories & Subcategories"
                  : activeTab === "product"
                    ? "Product Categories & Subcategories"
                    : activeTab === "service"
                      ? "Service Categories & Subcategories"
                      : activeTab === "professional"
                        ? "Professional Categories & Subcategories"
                        : activeTab === "course"
                          ? "Course Categories & Subcategories"
                          : activeTab === "job"
                            ? "Job Categories & Subcategories"
                            : "Category System"}
              </h1>
              <p className="text-xs text-muted-foreground">
                {activeTab === "course"
                  ? "Manage course and academic categories mapped to Education & Coaching business sectors."
                  : activeTab === "job"
                    ? "Manage job classifications and employment categories mapped to business sectors."
                    : "Manage business classifications, product categories, and service categories with hierarchies."}
              </p>
            </div>
          </div>
        </div>

        {/* TOP ACTIONS */}
        <div className="flex flex-wrap items-center gap-2">
          {activeTab === "business" ? (
            <>
              <Button
                onClick={openAddBizCatDialog}
                size="sm"
                className="gap-1.5 text-xs font-bold bg-[#d9232e] hover:bg-[#b81d26] text-white shadow-sm h-9"
              >
                <Plus className="size-3.5" /> Add Business Category
              </Button>
              <Button
                onClick={openAddBizSubcatDialog}
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs font-bold border-rose-200 text-rose-700 hover:bg-rose-50 h-9"
              >
                <Plus className="size-3.5" /> Add Business Subcategory
              </Button>
            </>
          ) : activeTab === "product" ? (
            <Button
              onClick={() => openAddCatalogCatDialog("product")}
              size="sm"
              className="gap-1.5 text-xs font-bold bg-[#d9232e] hover:bg-[#b81d26] text-white shadow-sm h-9"
            >
              <Plus className="size-3.5" /> Add Product Category
            </Button>
          ) : activeTab === "service" ? (
            <Button
              onClick={() => openAddCatalogCatDialog("service")}
              size="sm"
              className="gap-1.5 text-xs font-bold bg-[#d9232e] hover:bg-[#b81d26] text-white shadow-sm h-9"
            >
              <Plus className="size-3.5" /> Add Service Category
            </Button>
          ) : activeTab === "professional" ? (
            <Button
              onClick={() => openAddCatalogCatDialog("professional")}
              size="sm"
              className="gap-1.5 text-xs font-bold bg-[#d9232e] hover:bg-[#b81d26] text-white shadow-sm h-9"
            >
              <Plus className="size-3.5" /> Add Professional Category
            </Button>
          ) : activeTab === "course" ? (
            <Button
              onClick={() => openAddCatalogCatDialog("course")}
              size="sm"
              className="gap-1.5 text-xs font-bold bg-[#d9232e] hover:bg-[#b81d26] text-white shadow-sm h-9"
            >
              <Plus className="size-3.5" /> Add Course Category
            </Button>
          ) : activeTab === "job" ? (
            <Button
              onClick={() => openAddCatalogCatDialog("job")}
              size="sm"
              className="gap-1.5 text-xs font-bold bg-[#d9232e] hover:bg-[#b81d26] text-white shadow-sm h-9"
            >
              <Plus className="size-3.5" /> Add Job Category
            </Button>
          ) : (
            // ALL ACTIONS
            <div className="flex items-center gap-2">
              <Button
                onClick={openAddBizCatDialog}
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs font-semibold h-9"
              >
                <Building2 className="size-3.5 text-rose-600" /> + Business Category
              </Button>
              <Button
                onClick={() => openAddCatalogCatDialog("product")}
                size="sm"
                className="gap-1.5 text-xs font-bold bg-[#d9232e] hover:bg-[#b81d26] text-white shadow-sm h-9"
              >
                <Plus className="size-3.5" /> Add Category
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* CATEGORY TYPE TABS */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border/50 text-xs font-semibold">
        {[
          { key: "all", label: "All Categories", icon: Layers },
          { key: "business", label: "Business Categories", icon: Building2 },
          { key: "product", label: "Product Categories", icon: Package },
          { key: "service", label: "Service Categories", icon: Briefcase },
          { key: "professional", label: "Professional Categories", icon: UserCheck },
          { key: "course", label: "Course Categories", icon: BookOpen },
          { key: "job", label: "Job Categories", icon: Briefcase },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleTabChange(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all cursor-pointer whitespace-nowrap",
                isActive
                  ? "bg-[#d9232e] text-white font-bold shadow-xs"
                  : "bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SEARCH & FILTERS ROW */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search categories by name, slug, or ID..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 h-9 text-xs bg-card"
          />
        </div>

        {/* Filter by Category Sector */}
        {activeTab === "professional" ? (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="w-full sm:w-64">
              <Select
                value={filterProfCatId}
                onValueChange={(val) => {
                  setFilterProfCatId(val);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-card">
                  <div className="flex items-center gap-1.5 truncate">
                    <UserCheck className="size-3 text-purple-600 shrink-0" />
                    <span className="truncate">
                      {filterProfCatId === "all"
                        ? "All Professional Sectors"
                        : professionalRootCategories.find((b) => String(b.id) === filterProfCatId)?.name || "Sector"}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">All Professional Sectors</SelectItem>
                  {professionalRootCategories.map((pc) => (
                    <SelectItem key={pc.id} value={String(pc.id)}>
                      {pc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {filterProfCatId !== "all" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterProfCatId("all");
                  setPage(1);
                }}
                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" /> Clear
              </Button>
            )}
          </div>
        ) : activeTab !== "business" ? (
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            <div className="w-full sm:w-56">
              <Select
                value={filterBizCatId}
                onValueChange={(val) => {
                  setFilterBizCatId(val);
                  setFilterBizSubcatId("all");
                  setPage(1);
                  if (val !== "all") {
                    loadBusinessSubcategories(Number(val));
                  }
                }}
              >
                <SelectTrigger className="h-9 text-xs bg-card">
                  <div className="flex items-center gap-1.5 truncate">
                    <Building2 className="size-3 text-muted-foreground shrink-0" />
                    <span className="truncate">
                      {filterBizCatId === "all"
                        ? "All Business Industries"
                        : businessRootCategories.find((b) => String(b.id) === filterBizCatId)?.name || "Industry"}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  <SelectItem value="all">All Business Industries</SelectItem>
                  {businessRootCategories.map((bc) => (
                    <SelectItem key={bc.id} value={String(bc.id)}>
                      {bc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filterBizCatId !== "all" && currentFilterSubcategories.length > 0 && (
              <div className="w-full sm:w-52">
                <Select
                  value={filterBizSubcatId}
                  onValueChange={(val) => {
                    setFilterBizSubcatId(val);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-9 text-xs bg-card">
                    <span className="truncate">
                      {filterBizSubcatId === "all"
                        ? "All Subcategories"
                        : currentFilterSubcategories.find((s) => String(s.id) === filterBizSubcatId)?.name || "Subcategory"}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    <SelectItem value="all">All Subcategories</SelectItem>
                    {currentFilterSubcategories.map((sub) => (
                      <SelectItem key={sub.id} value={String(sub.id)}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(filterBizCatId !== "all" || filterBizSubcatId !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterBizCatId("all");
                  setFilterBizSubcatId("all");
                  setPage(1);
                }}
                className="h-9 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" /> Clear
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {/* CATEGORIES TABLE */}
      <Card className="border border-border/60 shadow-xs overflow-hidden">
        <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between bg-muted/20">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <span>
              {activeTab === "all"
                ? "All System Categories"
                : activeTab === "business"
                  ? "Business Categories & Subcategories"
                  : activeTab === "product"
                    ? "Product Categories & Subcategories"
                    : activeTab === "service"
                      ? "Service Categories & Subcategories"
                      : activeTab === "professional"
                        ? "Professional Categories & Subcategories"
                        : activeTab === "course"
                          ? "Course Categories & Subcategories"
                          : activeTab === "job"
                            ? "Job Categories & Subcategories"
                            : "Categories"}
            </span>
            <Badge variant="secondary" className="text-[10px] font-bold">
              {totalCount} total
            </Badge>
          </CardTitle>

          <div className="text-[11px] text-muted-foreground">
            Page {page} of {Math.max(1, Math.ceil(totalCount / 50))}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
              <Loader2 className="size-5 animate-spin text-primary" />
              <span className="text-xs">Loading categories...</span>
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center p-12 text-muted-foreground space-y-2">
              <FolderTree className="size-10 mx-auto text-muted-foreground/40" />
              <p className="text-xs font-semibold">No categories found</p>
              <p className="text-[11px]">
                {activeTab === "business"
                  ? 'Click "+ Add Business Category" to create root industries or subcategories.'
                  : `Click "+ Add ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Category" to create new categories mapped to business industries.`}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-[70px]">ID</TableHead>
                    <TableHead>
                      {activeTab === "service"
                        ? "Services Name"
                        : activeTab === "product"
                          ? "Product Name"
                          : activeTab === "professional"
                            ? "Professional Role"
                            : "Category Name"}
                    </TableHead>
                    <TableHead>Slug</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>
                      {activeTab === "business"
                        ? "Parent Business Category"
                        : "Main Business Category"}
                    </TableHead>
                    <TableHead>
                      {activeTab === "service"
                        ? "Service Category"
                        : activeTab === "product"
                          ? "Product Category"
                          : activeTab === "professional"
                            ? "Professional Category"
                            : "Parent (Within Type)"}
                    </TableHead>
                    <TableHead className="text-center">Depth</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.map((cat) => (
                    <TableRow key={cat.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        #{cat.id}
                      </TableCell>
                      <TableCell className="font-bold text-xs text-foreground">
                        <div className="flex items-center gap-2">
                          {cat.category_type === "business" ? (
                            <div className="size-6 rounded-md bg-rose-500/10 flex items-center justify-center shrink-0 text-rose-600">
                              <Building2 className="size-3.5" />
                            </div>
                          ) : cat.category_type === "product" ? (
                            <div className="size-6 rounded-md bg-blue-500/10 flex items-center justify-center shrink-0 text-blue-600">
                              <Package className="size-3.5" />
                            </div>
                          ) : cat.category_type === "service" ? (
                            <div className="size-6 rounded-md bg-emerald-500/10 flex items-center justify-center shrink-0 text-emerald-600">
                              <Briefcase className="size-3.5" />
                            </div>
                          ) : (
                            <div className="size-6 rounded-md bg-purple-500/10 flex items-center justify-center shrink-0 text-purple-600">
                              <UserCheck className="size-3.5" />
                            </div>
                          )}
                          <span>{cat.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {cat.slug}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={`text-[9px] font-bold capitalize ${cat.category_type === "business"
                            ? "bg-rose-500/10 text-rose-700 border-rose-200"
                            : cat.category_type === "product"
                              ? "bg-blue-500/10 text-blue-700 border-blue-200"
                              : cat.category_type === "service"
                                ? "bg-emerald-500/10 text-emerald-700 border-emerald-200"
                                : "bg-purple-500/10 text-purple-700 border-purple-200"
                            }`}
                        >
                          {cat.category_type || "General"}
                        </Badge>
                      </TableCell>

                      {/* ASSOCIATED BUSINESS CLASSIFICATION */}
                      <TableCell className="text-xs">
                        {cat.category_type === "business" ? (
                          cat.parent_name ? (
                            <span className="flex items-center gap-1 font-medium text-foreground">
                              <Building2 className="size-3 text-rose-600" />
                              {cat.parent_name}
                            </span>
                          ) : (
                            <Badge variant="outline" className="text-[10px] bg-muted/40 font-semibold text-muted-foreground">
                              Root Industry Sector
                            </Badge>
                          )
                        ) : cat.business_category_name ? (
                          <div
                            onClick={() => openEditModal(cat)}
                            className="cursor-pointer group flex flex-col gap-0.5 p-1 rounded hover:bg-muted/60 transition-colors w-fit"
                            title="Click to change business classification"
                          >
                            <span className="inline-flex items-center gap-1 font-semibold text-[11px] text-foreground group-hover:text-primary transition-colors">
                              <Building2 className="size-3 text-rose-600 shrink-0" />
                              {cat.business_category_name}
                              <Edit2 className="size-2.5 opacity-0 group-hover:opacity-70 transition-opacity ml-1" />
                            </span>
                            {cat.business_subcategory_name && (
                              <span className="text-[10px] text-muted-foreground pl-4 flex items-center gap-1">
                                <ArrowRight className="size-2.5 text-muted-foreground" />
                                {cat.business_subcategory_name}
                              </span>
                            )}
                          </div>
                        ) : (
                          <Badge
                            onClick={() => openEditModal(cat)}
                            variant="outline"
                            className="text-[10px] text-amber-700 bg-amber-500/10 border-amber-300 hover:bg-amber-500/20 cursor-pointer transition-colors"
                            title="Click to assign business classification"
                          >
                            + Assign Business Category
                          </Badge>
                        )}
                      </TableCell>

                      {/* PARENT WITHIN TYPE */}
                      <TableCell className="text-xs text-muted-foreground">
                        {cat.parent_name && cat.category_type !== "business" ? (
                          <span className="flex items-center gap-1 font-medium text-foreground">
                            <Folder className="size-3 text-muted-foreground" />
                            {cat.parent_name}
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted-foreground">Root (Level 1)</span>
                        )}
                      </TableCell>

                      {/* DEPTH */}
                      <TableCell className="text-center">
                        <Badge variant="outline" className="text-[10px]">
                          Depth {cat.depth || 1}
                        </Badge>
                      </TableCell>

                      {/* STATUS */}
                      <TableCell className="text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(cat)}
                          className="cursor-pointer"
                          title="Click to toggle status"
                        >
                          {cat.is_active ? (
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              Inactive
                            </Badge>
                          )}
                        </button>
                      </TableCell>

                      {/* ACTIONS */}
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7"
                            onClick={() => openEditModal(cat)}
                          >
                            <Edit2 className="size-3.5 text-muted-foreground hover:text-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 hover:bg-rose-50 hover:text-rose-600"
                            onClick={() => handleDelete(cat.id)}
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

          {/* PAGINATION CONTROLS */}
          {totalCount > 50 && (
            <div className="p-3 border-t bg-muted/10 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                Showing {(page - 1) * 50 + 1} - {Math.min(page * 50, totalCount)} of {totalCount}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="h-8 text-xs font-medium"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page * 50 >= totalCount}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 text-xs font-medium"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DIALOG 1: ADD BUSINESS CATEGORY (ROOT) */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={bizCatDialogOpen} onOpenChange={setBizCatDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="size-4 text-rose-600" />
              Add Business Category (Industry Sector)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Create a top-level root industry sector (e.g. Healthcare & Medical, Automotive & Transport, Education).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBizCategory} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">Business Category Name *</Label>
              <Input
                placeholder="e.g. Automotive & Transportation"
                value={bizCatName}
                onChange={(e) => {
                  setBizCatName(e.target.value);
                  if (!bizCatSlug || bizCatSlug === generateSlug(bizCatName)) {
                    setBizCatSlug(generateSlug(e.target.value));
                  }
                }}
                className="mt-1 h-9 text-xs"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">URL Slug</Label>
              <Input
                placeholder="e.g. automotive-transportation"
                value={bizCatSlug}
                onChange={(e) => setBizCatSlug(e.target.value)}
                className="mt-1 h-9 text-xs font-mono"
              />
            </div>

            <div>
              <ImageUploadInput
                label="Category Icon or Image"
                value={bizCatIcon}
                onChange={setBizCatIcon}
                folder="categories"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Description (Optional)</Label>
              <Input
                placeholder="Short description of this industry sector..."
                value={bizCatDesc}
                onChange={(e) => setBizCatDesc(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setBizCatDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="gap-1.5 font-bold bg-[#d9232e] hover:bg-[#b81d26] text-white"
              >
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                Create Business Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DIALOG 2: ADD BUSINESS SUBCATEGORY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={bizSubcatDialogOpen} onOpenChange={setBizSubcatDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Building2 className="size-4 text-rose-600" />
              Add Business Subcategory
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add a specialized business type under an existing top-level Business Category.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveBizSubcategory} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold">Parent Business Category *</Label>
              <Select value={bizSubcatParentId} onValueChange={setBizSubcatParentId}>
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue placeholder="Select Business Category..." />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {businessRootCategories.map((bc) => (
                    <SelectItem key={bc.id} value={String(bc.id)}>
                      {bc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold">Business Subcategory Name *</Label>
              <Input
                placeholder="e.g. Automobile Workshop"
                value={bizSubcatName}
                onChange={(e) => {
                  setBizSubcatName(e.target.value);
                  if (!bizSubcatSlug || bizSubcatSlug === generateSlug(bizSubcatName)) {
                    setBizSubcatSlug(generateSlug(e.target.value));
                  }
                }}
                className="mt-1 h-9 text-xs"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">URL Slug</Label>
              <Input
                placeholder="e.g. automobile-workshop"
                value={bizSubcatSlug}
                onChange={(e) => setBizSubcatSlug(e.target.value)}
                className="mt-1 h-9 text-xs font-mono"
              />
            </div>

            <div>
              <ImageUploadInput
                label="Subcategory Icon or Image"
                value={bizSubcatIcon}
                onChange={setBizSubcatIcon}
                folder="categories"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold">Description (Optional)</Label>
              <Input
                placeholder="Brief description of this business type..."
                value={bizSubcatDesc}
                onChange={(e) => setBizSubcatDesc(e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setBizSubcatDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="gap-1.5 font-bold bg-[#d9232e] hover:bg-[#b81d26] text-white"
              >
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                Create Business Subcategory
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DIALOG 3: ADD PRODUCT / SERVICE / PROFESSIONAL CATEGORY */}
      {/* MANDATORY 2-STEP FLOW: CHOOSE BUSINESS CLASSIFICATION FIRST */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={catalogCatDialogOpen} onOpenChange={setCatalogCatDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              {formType === "product" ? (
                <Package className="size-4 text-blue-600" />
              ) : formType === "service" ? (
                <Briefcase className="size-4 text-emerald-600" />
              ) : formType === "course" ? (
                <BookOpen className="size-4 text-amber-600" />
              ) : formType === "job" ? (
                <Briefcase className="size-4 text-indigo-600" />
              ) : (
                <UserCheck className="size-4 text-purple-600" />
              )}
              Add {formType === "course" ? "Course" : formType === "job" ? "Job" : formType.charAt(0).toUpperCase() + formType.slice(1)} Category
            </DialogTitle>
            <DialogDescription className="text-xs">
              First select the associated business industry classification, then specify category details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCatalogCategory} className="space-y-4 pt-1">
            {/* STEP 1: BUSINESS CLASSIFICATION (REQUIRED) */}
            <div className="rounded-xl border border-rose-200 bg-rose-50/50 dark:bg-rose-950/10 p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full bg-[#d9232e] text-white flex items-center justify-center text-[10px] font-black">
                  1
                </div>
                <div>
                  <h4 className="text-xs font-bold text-foreground">
                    Business Classification (Required)
                  </h4>
                  <p className="text-[11px] text-muted-foreground">
                    Map this category to its root industry sector.
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-[11px] font-semibold text-foreground">
                  Business Category *
                </Label>
                <Select
                  value={formBizCatId}
                  onValueChange={(val) => {
                    setFormBizCatId(val);
                    setFormBizSubcatId("");
                    if (val) {
                      loadBusinessSubcategories(Number(val));
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs bg-background">
                    <SelectValue placeholder="Select Business Category..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {businessRootCategories.map((bc) => (
                      <SelectItem key={bc.id} value={String(bc.id)}>
                        {bc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formBizCatId && currentFormSubcategories.length > 0 && (
                <div className="pt-1">
                  <Label className="text-[11px] font-semibold text-foreground">
                    Business Subcategory (Optional)
                  </Label>
                  <Select
                    value={formBizSubcatId}
                    onValueChange={(val) => setFormBizSubcatId(val === "none" ? "" : val)}
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs bg-background">
                      <SelectValue placeholder="Select Business Subcategory..." />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectItem value="none">None / General</SelectItem>
                      {currentFormSubcategories.map((sub) => (
                        <SelectItem key={sub.id} value={String(sub.id)}>
                          {sub.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* STEP 2: CATEGORY DETAILS */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-full bg-muted text-foreground flex items-center justify-center text-[10px] font-black">
                  2
                </div>
                <h4 className="text-xs font-bold text-foreground">Category Details</h4>
              </div>

              <div>
                <Label className="text-xs font-semibold">
                  {formType === "course" ? "Course" : formType === "job" ? "Job" : formType.charAt(0).toUpperCase() + formType.slice(1)} Category Name *
                </Label>
                <Input
                  placeholder={
                    formType === "course"
                      ? "e.g. IIT-JEE Physics Coaching, Computer Science & Engineering"
                      : formType === "job"
                        ? "e.g. Senior Faculty, Lab Technician, Software Developer"
                        : formType === "product"
                          ? "e.g. Brake Systems & Components"
                          : formType === "service"
                            ? "e.g. Engine Diagnostics & Repair"
                            : "e.g. Certified Auto Mechanic"
                  }
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setFormSlug(generateSlug(e.target.value));
                  }}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>

              <div>
                <ImageUploadInput
                  label="Category Icon or Image"
                  value={formIconUrl}
                  onChange={setFormIconUrl}
                  folder="categories"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Description (Optional)</Label>
                <Input
                  placeholder="Short description of this category..."
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Synonyms &amp; Search Keywords (Optional)</Label>
                <Input
                  placeholder="e.g. potato, batata, aloo, alu (comma-separated)"
                  value={formSynonyms}
                  onChange={(e) => setFormSynonyms(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Alternate names and regional terms customers search for that match this category.
                </p>
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setCatalogCatDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving || !formBizCatId || !formName.trim()}
                className="gap-1.5 font-bold bg-[#d9232e] hover:bg-[#b81d26] text-white"
              >
                {saving && <Loader2 className="size-3.5 animate-spin" />}
                Create {formType === "course" ? "Course" : formType === "job" ? "Job" : formType.charAt(0).toUpperCase() + formType.slice(1)} Category
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DIALOG 4: EDIT CATEGORY */}
      {/* ───────────────────────────────────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Edit2 className="size-4 text-primary" />
              Edit Category: {editingCategory?.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update category details and business classification mappings.
            </DialogDescription>
          </DialogHeader>

          {editingCategory && (
            <form onSubmit={handleSaveEdit} className="space-y-4 pt-1">
              {/* If editing non-business category, show business mapping controls */}
              {editingCategory.category_type !== "business" && (
                <div className="rounded-xl border border-border/80 bg-muted/30 p-3 space-y-2.5">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-rose-600" />
                    Mapped Business Classification
                  </Label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Business Category</Label>
                      <Select
                        value={formBizCatId}
                        onValueChange={(val) => {
                          setFormBizCatId(val);
                          setFormBizSubcatId("");
                          loadBusinessSubcategories(Number(val));
                        }}
                      >
                        <SelectTrigger className="mt-1 h-8 text-xs bg-background">
                          <SelectValue placeholder="Select Business Category..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {businessRootCategories.map((bc) => (
                            <SelectItem key={bc.id} value={String(bc.id)}>
                              {bc.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-[10px] text-muted-foreground">Business Subcategory</Label>
                      <Select
                        value={formBizSubcatId}
                        onValueChange={setFormBizSubcatId}
                        disabled={!formBizCatId || loadingSubcategories}
                      >
                        <SelectTrigger className="mt-1 h-8 text-xs bg-background">
                          <SelectValue placeholder="Select Subcategory..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {currentFormSubcategories.map((sub) => (
                            <SelectItem key={sub.id} value={String(sub.id)}>
                              {sub.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold">Category Name *</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="mt-1 h-9 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">URL Slug</Label>
                  <Input
                    value={formSlug}
                    onChange={(e) => setFormSlug(e.target.value)}
                    className="mt-1 h-9 text-xs font-mono"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Parent Category</Label>
                  <Select value={formParentId} onValueChange={setFormParentId}>
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue placeholder="None (Root)" />
                    </SelectTrigger>
                    <SelectContent className="max-h-56">
                      <SelectItem value="none">None (Root Category)</SelectItem>
                      {categories
                        .filter((c) => c.id !== editingCategory.id && c.depth === 1)
                        .map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <ImageUploadInput
                  label="Subcategory Icon or Image"
                  value={formIconUrl}
                  onChange={setFormIconUrl}
                  folder="categories"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Description (Optional)</Label>
                <Input
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Synonyms &amp; Search Keywords</Label>
                <Input
                  placeholder="e.g. potato, batata, aloo, alu (comma-separated)"
                  value={formSynonyms}
                  onChange={(e) => setFormSynonyms(e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Alternate names and regional terms customers search for that match this category.
                </p>
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving}
                  className="gap-1.5 font-bold bg-[#d9232e] hover:bg-[#b81d26] text-white"
                >
                  {saving && <Loader2 className="size-3.5 animate-spin" />}
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CategoryManager() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center p-12 text-muted-foreground gap-2">
          <Loader2 className="size-5 animate-spin text-primary" />
          <span className="text-xs">Loading Category System...</span>
        </div>
      }
    >
      <CategoryManagerContent />
    </Suspense>
  );
}

