"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ShoppingBag,
  Plus,
  Search,
  IndianRupee,
  Package,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Edit2,
  Trash2,
  Eye,
  ExternalLink,
  Sparkles,
  RefreshCw,
  Tag,
  Boxes,
  Check,
  X,
  Building,
  GraduationCap,
  Image as ImageIcon,
  FolderPlus,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Info,
  Percent,
  ListChecks,
  UploadCloud,
  Upload,
  Loader2,
  Camera,
  Scan,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InheritMasterProductsDialog } from "@/components/admin/catalog/inherit-master-products-dialog";
import { ProductFormDialog, COMMON_UOM_OPTIONS } from "@/components/admin/catalog/product-form-dialog";
import { UpdateStockBillDialog } from "@/components/admin/catalog/update-stock-bill-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useBusinessCurrency } from "@/hooks/use-business-currency";

export type ProductCategory = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  is_active: boolean;
  products_count?: number;
  parent_id?: number | null;
  business_category_id?: number | null;
};

export type ProgramOption = {
  id: number;
  title: string;
  slug: string;
  fee_amount?: number | string | null;
  institution_name?: string | null;
};

export type ProductRecord = {
  id: number;
  title: string;
  slug: string;
  description?: string | null;
  price: number | string;
  sale_price?: number | string | null;
  category: string;
  category_id?: number | null;
  category_name?: string | null;
  unit?: string | null;
  unit_of_measurement?: string | null;
  program_ids?: number[] | null;
  associated_programs?: Array<{ id: number; title: string }> | null;
  image_url?: string | null;
  gallery?: string[] | null;
  institution_id?: number | null;
  institution_name?: string | null;
  stock_quantity: number | string;
  sku?: string | null;
  badge_text?: string | null;
  features?: string[] | null;
  brand?: string | null;
  model?: string | null;
  subcategory_id?: number | null;
  main_category_id?: number | null;
  attributes?: any;
  variants?: any;
  status: "active" | "draft" | "archived";
  is_featured: boolean;
  created_at: string;
};

const SAMPLE_IMAGES = [
  { label: "Robotics Kit", url: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800&q=80" },
  { label: "Study Books", url: "https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800&q=80" },
  { label: "Uniform Blazer", url: "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80" },
  { label: "Drawing Tablet", url: "https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&q=80" },
  { label: "Stationery Set", url: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=800&q=80" },
];

const FORM_TABS = [
  { id: "basic", label: "Basic Info", icon: Info, count: "1" },
  { id: "category", label: "Category & Courses", icon: Tag, count: "2" },
  { id: "images", label: "Images", icon: ImageIcon, count: "3" },
  { id: "price", label: "Price & Stock", icon: IndianRupee, count: "4" },
  { id: "specifications", label: "Specifications", icon: ListChecks, count: "5" },
] as const;

type FormTabId = (typeof FORM_TABS)[number]["id"];

export default function AdminProductsPage() {
  const { user, accessToken } = useAuthStore();
  const { currencyCode, currencySymbol, formatPrice } = useBusinessCurrency();
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [programOptions, setProgramOptions] = useState<ProgramOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    outOfStock: 0,
    totalInventoryValue: 0,
  });

  const [search, setSearch] = useState("");
  const [businessCategories, setBusinessCategories] = useState<Array<{ id: number; name: string }>>([]);
  const [selectedBusinessCategoryId, setSelectedBusinessCategoryId] = useState("all");
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Product Add / Edit Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formTab, setFormTab] = useState<FormTabId>("basic");
  const [editingProduct, setEditingProduct] = useState<ProductRecord | null>(null);
  const [saving, setSaving] = useState(false);

  // Category Management Modal State (Platform Admin)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  // Inherit Master Products Dialog State
  const [inheritModalOpen, setInheritModalOpen] = useState(false);
  // Update Stock from Bill Dialog State
  const [billStockModalOpen, setBillStockModalOpen] = useState(false);

  // Form Fields for Product
  const [formTitle, setFormTitle] = useState("");
  const [formCategoryId, setFormCategoryId] = useState<string>("");
  const [formProgramIds, setFormProgramIds] = useState<number[]>([]);
  const [programSearch, setProgramSearch] = useState("");
  const [programDropdownOpen, setProgramDropdownOpen] = useState(false);
  const [formPrice, setFormPrice] = useState("");
  const [formSalePrice, setFormSalePrice] = useState("");
  const [formStock, setFormStock] = useState("100");
  const [formSku, setFormSku] = useState("");
  const [formBadge, setFormBadge] = useState("");
  const [formImage, setFormImage] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formStatus, setFormStatus] = useState<"active" | "draft" | "archived">("active");
  const [formIsFeatured, setFormIsFeatured] = useState(false);
  const [formFeatures, setFormFeatures] = useState<string[]>([""]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Add Stock Dialog State
  const [stockProduct, setStockProduct] = useState<ProductRecord | null>(null);
  const [stockQuantityInput, setStockQuantityInput] = useState<string>("");
  const [stockUnitInput, setStockUnitInput] = useState<string>("Piece");
  const [stockMode, setStockMode] = useState<"add" | "set">("add");
  const [savingStock, setSavingStock] = useState<boolean>(false);

  const handleOpenAddStock = (prod: ProductRecord) => {
    setStockProduct(prod);
    setStockQuantityInput("");
    setStockUnitInput(prod.unit || prod.unit_of_measurement || "Piece");
    setStockMode("add");
  };

  const handleSaveStock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!stockProduct) return;

    const qty = parseInt(stockQuantityInput);
    if (isNaN(qty) || qty < 0) {
      toast.error("Please enter a valid positive number for stock quantity");
      return;
    }

    setSavingStock(true);
    try {
      const payload: any = {
        id: stockProduct.id,
        unit: stockUnitInput.trim() || "Piece",
      };

      if (stockMode === "add") {
        payload.add_stock = qty;
      } else {
        payload.stock_quantity = qty;
      }

      const res = await fetch("/api/admin/marketing/products", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok && data.product) {
        toast.success(`Stock updated! Total: ${data.product.stock_quantity} ${data.product.unit || stockUnitInput} for ${stockProduct.title}`);

        // Update product in local state
        setProducts((prev) =>
          prev.map((p) =>
            p.id === stockProduct.id
              ? {
                  ...p,
                  stock_quantity: data.product.stock_quantity,
                  unit: data.product.unit || stockUnitInput,
                  unit_of_measurement: data.product.unit || stockUnitInput,
                }
              : p
          )
        );

        // Update stats
        setStats((prev) => {
          const oldStock = Number(stockProduct.stock_quantity) || 0;
          const newStock = Number(data.product.stock_quantity) || 0;
          const price = Number(stockProduct.sale_price || stockProduct.price) || 0;
          const wasOutOfStock = oldStock <= 0;
          const isNowOutOfStock = newStock <= 0;

          return {
            ...prev,
            outOfStock: prev.outOfStock + (isNowOutOfStock && !wasOutOfStock ? 1 : !isNowOutOfStock && wasOutOfStock ? -1 : 0),
            totalInventoryValue: prev.totalInventoryValue + (newStock - oldStock) * price,
          };
        });

        setStockProduct(null);
      } else {
        toast.error(data.error || "Failed to update stock");
      }
    } catch {
      toast.error("Error updating product stock");
    } finally {
      setSavingStock(false);
    }
  };

  const isPlatformAdmin = Boolean(
    user?.role_codes?.some((r: string) => r.includes("super") || r.includes("platform")) ||
    (user as any)?.role === "platform_admin" ||
    user?.is_super_admin
  );

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file (PNG, JPG, WEBP, AVIF, GIF, etc.)");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file size should be less than 10MB");
      return;
    }

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "products");

      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: formData,
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to upload image");
      }

      const uploadedUrl = json.data?.url || json.url;
      if (uploadedUrl) {
        setFormImage(uploadedUrl);
        toast.success("Product picture uploaded successfully!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
      if (e.target) e.target.value = "";
    }
  };

  // Fetch Categories
  const fetchCategories = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch("/api/admin/marketing/products/categories", { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch {}
  }, [accessToken]);

  // Fetch Course/Program Options
  const fetchProgramOptions = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch("/api/admin/marketing/products/programs", { headers });
      const data = await res.json();
      if (data.success && Array.isArray(data.programs)) {
        setProgramOptions(data.programs);
      }
    } catch {}
  }, [accessToken]);

  // Fetch Products
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (selectedBusinessCategoryId !== "all") params.set("business_category_id", selectedBusinessCategoryId);
      if (selectedCategoryId !== "all") params.set("category_id", selectedCategoryId);
      if (selectedSubcategoryId !== "all") params.set("subcategory_id", selectedSubcategoryId);
      if (selectedBrand !== "all") params.set("brand", selectedBrand);
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      if (sortBy !== "newest") params.set("sort_by", sortBy);

      const res = await fetch(`/api/admin/marketing/products?${params.toString()}`, { headers });
      const data = await res.json();
      if (data.products) {
        setProducts(data.products);
        if (data.stats) {
          setStats(data.stats);
        }
      }
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  }, [search, selectedBusinessCategoryId, selectedCategoryId, selectedSubcategoryId, selectedBrand, selectedStatus, sortBy, accessToken]);

  useEffect(() => {
    fetch("/api/admin/categories?type=business&onlyRoot=true&limit=100")
      .then((r) => r.json())
      .then((d) => {
        if (d?.data && Array.isArray(d.data)) {
          setBusinessCategories(d.data);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchProgramOptions();
  }, [fetchCategories, fetchProgramOptions]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Root categories vs subcategories filtered by selected business category
  const rootCategories = useMemo(() => {
    const roots = categories.filter((c) => !c.parent_id);
    const pool = roots.length > 0 ? roots : categories;
    if (selectedBusinessCategoryId === "all") return pool;
    return pool.filter((c) => String(c.business_category_id) === String(selectedBusinessCategoryId));
  }, [categories, selectedBusinessCategoryId]);

  const availableSubcategories = useMemo(() => {
    if (selectedCategoryId === "all") return [];
    return categories.filter((c) => String(c.parent_id) === String(selectedCategoryId));
  }, [categories, selectedCategoryId]);

  const availableBrands = useMemo(() => {
    const brandsSet = new Set<string>();
    products.forEach((p) => {
      const b = (p.brand || "").trim();
      if (b && b.toLowerCase() !== "generic") {
        brandsSet.add(b);
      }
    });
    return Array.from(brandsSet).sort();
  }, [products]);

  // Filtered Programs for dropdown
  const filteredProgramOptions = useMemo(() => {
    const q = programSearch.trim().toLowerCase();
    if (!q) return programOptions;
    return programOptions.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        (p.institution_name || "").toLowerCase().includes(q)
    );
  }, [programOptions, programSearch]);

  // Open Dialog for Create
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  // Open Dialog for Edit
  const handleOpenEdit = (product: ProductRecord) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  // Toggle Program Selection
  const toggleProgram = (progId: number) => {
    setFormProgramIds((prev) =>
      prev.includes(progId) ? prev.filter((id) => id !== progId) : [...prev, progId]
    );
  };

  // Handle Feature Fields
  const handleAddFeature = () => {
    setFormFeatures((prev) => [...prev, ""]);
  };

  const handleUpdateFeature = (index: number, value: string) => {
    setFormFeatures((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const handleRemoveFeature = (index: number) => {
    setFormFeatures((prev) => prev.filter((_, i) => i !== index));
  };

  // Submit Product Save
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Product title is required");
      return;
    }
    if (!formPrice || isNaN(Number(formPrice)) || Number(formPrice) < 0) {
      toast.error("Valid product actual price is required");
      return;
    }

    setSaving(true);
    try {
      const matchedCategory = categories.find((c) => String(c.id) === String(formCategoryId));
      const categoryName = matchedCategory?.name || (categories[0]?.name || "General");

      const payload = {
        id: editingProduct?.id,
        title: formTitle.trim(),
        price: parseFloat(formPrice),
        sale_price: formSalePrice ? parseFloat(formSalePrice) : null,
        category: categoryName,
        category_id: formCategoryId ? Number(formCategoryId) : null,
        program_ids: formProgramIds,
        image_url: formImage.trim() || null,
        stock_quantity: parseInt(formStock) || 0,
        sku: formSku.trim() || null,
        badge_text: formBadge.trim() || null,
        description: formDescription.trim() || null,
        features: formFeatures.filter((f) => f.trim().length > 0),
        status: formStatus,
        is_featured: formIsFeatured,
      };

      const method = editingProduct ? "PUT" : "POST";
      const res = await fetch("/api/admin/marketing/products", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save product");
      }

      toast.success(editingProduct ? "Product updated successfully!" : "Product created successfully!");
      setDialogOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      const res = await fetch(`/api/admin/marketing/products?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete product");
      toast.success("Product deleted successfully");
      fetchProducts();
    } catch {
      toast.error("Failed to delete product");
    }
  };

  // Create Category (Platform Admin)
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error("Category name is required");
      return;
    }
    setSavingCategory(true);
    try {
      const res = await fetch("/api/admin/marketing/products/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCatName.trim(),
          description: newCatDesc.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create category");
      toast.success("Product category created!");
      setNewCatName("");
      setNewCatDesc("");
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to create category");
    } finally {
      setSavingCategory(false);
    }
  };

  // Delete Category (Platform Admin)
  const handleDeleteCategory = async (catId: number) => {
    if (!confirm("Are you sure you want to delete this product category?")) return;
    try {
      const res = await fetch(`/api/admin/marketing/products/categories?id=${catId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete category");
      toast.success("Category deleted");
      fetchCategories();
    } catch {
      toast.error("Failed to delete category");
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <ShoppingBag className="w-4 h-4" />
            <span>Store & Product Catalog</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
            Products & Study Supplies
            <Badge variant="secondary" className="text-xs font-bold py-0.5 px-2 bg-primary/10 text-primary border-primary/20">
              {stats.total} Products
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-3xl">
            Create and manage books, solved paper banks, official uniforms, STEM kits, digital devices, and link products directly to specific academic programs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isPlatformAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCategoryModalOpen(true)}
              className="font-bold text-xs gap-1.5 shadow-2xs h-9 rounded-xl border-primary/30 text-primary hover:bg-primary/10"
            >
              <FolderPlus className="w-4 h-4" />
              Manage Categories
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setBillStockModalOpen(true)}
            className="font-bold text-xs gap-1.5 shadow-2xs h-9 rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 cursor-pointer"
            title="Upload purchase bill to extract items, update stock and log expenses"
          >
            <Scan className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Update Stock
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setInheritModalOpen(true)}
            className="font-bold text-xs gap-1.5 shadow-2xs h-9 rounded-xl border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
          >
            <Layers className="w-4 h-4 text-primary" />
            Inherit
          </Button>

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="font-bold text-xs gap-1.5 shadow-2xs h-9 rounded-xl cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 bg-card border-border shadow-2xs rounded-2xl">
          <p className="text-xs font-bold text-muted-foreground uppercase">Total Products</p>
          <p className="text-2xl font-black text-foreground mt-1">{stats.total}</p>
          <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
            <CheckCircle2 className="w-3 h-3" /> In Catalog
          </span>
        </Card>

        <Card className="p-4 bg-card border-border shadow-2xs rounded-2xl">
          <p className="text-xs font-bold text-muted-foreground uppercase">Active Listings</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{stats.active}</p>
          <span className="text-[10px] text-muted-foreground">Visible on store</span>
        </Card>

        <Card className="p-4 bg-card border-border shadow-2xs rounded-2xl">
          <p className="text-xs font-bold text-muted-foreground uppercase">Available Categories</p>
          <p className="text-2xl font-black text-indigo-600 mt-1">{categories.length}</p>
          <span className="text-[10px] text-muted-foreground">Managed by Platform</span>
        </Card>

        <Card className="p-4 bg-card border-border shadow-2xs rounded-2xl">
          <p className="text-xs font-bold text-muted-foreground uppercase">Inventory Value</p>
          <p className="text-2xl font-black text-foreground mt-1">{formatPrice(stats.totalInventoryValue)}</p>
          <span className="text-[10px] text-muted-foreground">Stock valuation</span>
        </Card>
      </div>

      {/* FILTERS & SEARCH */}
      <div className="flex flex-col gap-3 bg-card p-3.5 rounded-xl border border-border shadow-2xs">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, SKU, brand, or description..."
              className="pl-9 text-xs h-9 bg-background rounded-lg"
            />
          </div>

          {/* Quick Sort Control */}
          <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
            <label className="text-xs font-bold text-muted-foreground whitespace-nowrap">Sort By:</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[160px] h-9 text-xs font-bold bg-background rounded-lg">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="name_asc">Name: A to Z</SelectItem>
                <SelectItem value="name_desc">Name: Z to A</SelectItem>
                <SelectItem value="stock_desc">Highest Stock</SelectItem>
                <SelectItem value="stock_asc">Lowest Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Cascading Filter Controls: Business Category -> Particular Category -> Subcategory -> Brand -> Status */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-border/60">
          {/* Main Business Category Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Business Category
            </label>
            <Select
              value={selectedBusinessCategoryId}
              onValueChange={(val) => {
                setSelectedBusinessCategoryId(val);
                setSelectedCategoryId("all");
                setSelectedSubcategoryId("all");
              }}
            >
              <SelectTrigger className="w-full h-8 text-xs font-semibold bg-background rounded-lg">
                <SelectValue placeholder="All Business Types" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-80 w-[240px]">
                <SelectItem value="all">All Business Types ({businessCategories.length})</SelectItem>
                {businessCategories.map((bc) => (
                  <SelectItem key={bc.id} value={String(bc.id)}>
                    <span className="truncate">{bc.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Particular Category Filter (Filtered by Business Category) */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Category ({rootCategories.length})
            </label>
            <Select
              value={selectedCategoryId}
              onValueChange={(val) => {
                setSelectedCategoryId(val);
                setSelectedSubcategoryId("all");
              }}
            >
              <SelectTrigger className="w-full h-8 text-xs font-semibold bg-background rounded-lg">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-80 w-[240px]">
                <SelectItem value="all">All Categories ({rootCategories.length})</SelectItem>
                {rootCategories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    <div className="flex items-center justify-between w-full gap-2">
                      <span className="truncate">{c.name}</span>
                      {c.products_count !== undefined && (
                        <span className="text-[10px] text-muted-foreground font-semibold px-1.5 py-0.5 rounded-full bg-muted shrink-0">
                          {c.products_count}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subcategory Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Subcategory {selectedCategoryId !== "all" && `(${availableSubcategories.length})`}
            </label>
            <Select
              value={selectedSubcategoryId}
              onValueChange={setSelectedSubcategoryId}
              disabled={selectedCategoryId === "all" || availableSubcategories.length === 0}
            >
              <SelectTrigger className="w-full h-8 text-xs font-semibold bg-background rounded-lg disabled:opacity-50">
                <SelectValue
                  placeholder={
                    selectedCategoryId === "all"
                      ? "Select Category First"
                      : availableSubcategories.length === 0
                      ? "No Subcategories"
                      : "All Subcategories"
                  }
                />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-80 w-[240px]">
                <SelectItem value="all">All Subcategories ({availableSubcategories.length})</SelectItem>
                {availableSubcategories.map((sc) => (
                  <SelectItem key={sc.id} value={String(sc.id)}>
                    <span className="truncate">{sc.name}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Brand Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Brand ({availableBrands.length})
            </label>
            <Select value={selectedBrand} onValueChange={setSelectedBrand}>
              <SelectTrigger className="w-full h-8 text-xs font-semibold bg-background rounded-lg">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent position="popper" className="max-h-80 w-[200px]">
                <SelectItem value="all">All Brands ({availableBrands.length})</SelectItem>
                {availableBrands.map((b) => (
                  <SelectItem key={b} value={b}>
                    <span className="truncate">{b}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Status
            </label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full h-8 text-xs font-semibold bg-background rounded-lg">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
                <SelectItem value="out_of_stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* PRODUCTS GRID */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">Loading products...</div>
      ) : products.length === 0 ? (
        <Card className="p-10 text-center space-y-3 bg-card border-border rounded-2xl">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h3 className="font-bold text-sm text-foreground">No products found</h3>
          <p className="text-xs text-muted-foreground">Inherit already configured items from the master catalog or create a custom listing.</p>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={() => setInheritModalOpen(true)} className="font-bold text-xs rounded-xl border-primary/40 text-primary hover:bg-primary/10">
              <Layers className="w-4 h-4 mr-1 text-primary" /> Inherit from Master Catalog
            </Button>
            <Button size="sm" onClick={handleOpenCreate} className="font-bold text-xs rounded-xl">
              <Plus className="w-4 h-4 mr-1" /> Add Product Now
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {products.map((prod) => {
            const currentPrice = prod.sale_price !== null && prod.sale_price !== undefined && Number(prod.sale_price) > 0
              ? Number(prod.sale_price)
              : Number(prod.price || 0);
            const rawUnit = prod.unit || prod.unit_of_measurement || "Piece";
            const imageUrl = prod.image_url || SAMPLE_IMAGES[0].url;
            const brandOrCat = prod.brand || prod.category_name || prod.category || "General";

            return (
              <div
                key={prod.id}
                className="p-3 rounded-2xl border transition-all flex items-center gap-3 group relative bg-card hover:bg-muted/30 shadow-2xs hover:shadow-xs border-border/70"
              >
                {/* 1. Left Thumbnail Image */}
                <Link
                  href={`/products/${prod.id}`}
                  className="relative size-16 rounded-xl bg-muted shrink-0 overflow-hidden border border-border/60 block group/img"
                  title={`View ${prod.title}`}
                >
                  <img
                    src={imageUrl}
                    alt={prod.title}
                    className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as any).src = "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=300&auto=format&fit=crop&q=60";
                    }}
                  />
                </Link>

                {/* 2. Middle Content */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Link
                      href={`/products/${prod.id}`}
                      className="text-xs font-bold text-foreground truncate hover:text-primary transition-colors cursor-pointer block max-w-[170px]"
                      title={prod.title}
                    >
                      {prod.title}
                    </Link>
                  </div>

                  <p className="text-[11px] text-muted-foreground truncate" title={brandOrCat}>
                    {brandOrCat} {prod.sku ? `• ${prod.sku}` : ""}
                  </p>

                  {/* Pricing & Stock */}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-black text-foreground">
                      {formatPrice(currentPrice, prod.currency || currencyCode)}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground truncate">
                      / {rawUnit}
                    </span>
                    {(prod.unit || prod.unit_of_measurement) && (
                      <span className="text-xs font-bold text-muted-foreground">
                        / {prod.unit || prod.unit_of_measurement}
                      </span>
                    )}
                    {prod.sale_price && Number(prod.sale_price) < Number(prod.price) && (
                      <span className="text-[10px] text-muted-foreground line-through">
                        {formatPrice(prod.price, prod.currency || currencyCode)}
                      </span>
                    )}
                  </div>
                  {/* Stock */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] text-muted-foreground">
                      Stock:{" "}
                      <strong className={Number(prod.stock_quantity) <= 0 ? "text-rose-600 font-bold" : "text-foreground font-bold"}>
                        {prod.stock_quantity || 0} {rawUnit}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* 3. Right Actions: Status Badge, Info Popover, Add Stock, Edit, Delete */}
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <Badge
                    variant="outline"
                    className={`text-[9px] px-1.5 py-0 font-bold uppercase tracking-wider ${
                      prod.status === "active"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    }`}
                  >
                    {prod.status}
                  </Badge>

                  <div className="flex items-center gap-1">
                    {/* Short Description Info Popover */}
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="size-7 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors cursor-pointer border border-border/40 hover:border-border"
                          title="Click to view short description"
                          aria-label="Short description"
                        >
                          <Info className="size-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="w-72 p-3 text-xs rounded-xl shadow-xl border bg-background" side="top">
                        <div className="space-y-2">
                          <div className="font-bold text-foreground text-xs line-clamp-1 border-b pb-1.5 flex items-center justify-between">
                            <span>{prod.title}</span>
                            <span className="text-[10px] text-primary font-black">{formatPrice(currentPrice, prod.currency || currencyCode)}</span>
                          </div>
                          <p className="text-muted-foreground text-[11px] leading-relaxed">
                            {prod.description || "No description provided."}
                          </p>
                          <div className="pt-1 border-t flex items-center justify-between text-[10px] text-muted-foreground font-medium">
                            <span>Category: {prod.category_name || prod.category}</span>
                            <span>SKU: {prod.sku || `PRD-${prod.id}`}</span>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAddStock(prod)}
                      className="size-7 p-0 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 border-border/40 hover:border-border"
                      title="Add Stock (Quantity & Units)"
                    >
                      <Boxes className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenEdit(prod)}
                      className="size-7 p-0 rounded-lg text-primary hover:bg-primary/10 border-border/40 hover:border-border"
                      title="Edit Product"
                    >
                      <Edit2 className="size-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteProduct(prod.id)}
                      className="size-7 p-0 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border-border/40 hover:border-border"
                      title="Delete Product"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PRODUCT CREATE / EDIT DIALOG (Same as Platform Admin) */}
      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={editingProduct as any}
        onSuccess={fetchProducts}
        accessToken={accessToken}
      />

      {/* PLATFORM ADMIN PRODUCT CATEGORY MANAGER MODAL */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              Manage Product Categories (Platform Admin)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add and manage standardized product categories for institution admins to classify their course kits and products.
            </DialogDescription>
          </DialogHeader>

          {/* Add Category Form */}
          <form onSubmit={handleCreateCategory} className="space-y-3 p-3 bg-muted/40 border border-border rounded-xl">
            <h4 className="text-xs font-extrabold text-foreground">Add New Product Category</h4>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Category Name *</Label>
              <Input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="e.g. Competitive Exam Material"
                className="text-xs h-8"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Description (Optional)</Label>
              <Input
                value={newCatDesc}
                onChange={(e) => setNewCatDesc(e.target.value)}
                placeholder="Brief description of this category..."
                className="text-xs h-8"
              />
            </div>
            <Button type="submit" size="sm" disabled={savingCategory} className="w-full font-bold text-xs h-8">
              {savingCategory ? "Adding..." : "Add Category"}
            </Button>
          </form>

          {/* Existing Categories List */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-muted-foreground uppercase">Current Categories ({categories.length})</h4>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between gap-3 text-xs"
                >
                  <div className="truncate">
                    <span className="font-bold text-foreground block truncate">{cat.name}</span>
                    {cat.description && (
                      <span className="text-[10px] text-muted-foreground truncate block">{cat.description}</span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteCategory(cat.id)}
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-600 shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setCategoryModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* INHERIT FROM MASTER CATALOG DIALOG */}
      <InheritMasterProductsDialog
        open={inheritModalOpen}
        onOpenChange={setInheritModalOpen}
        onSuccess={fetchProducts}
        accessToken={accessToken}
      />

      {/* ADD / MANAGE PRODUCT STOCK DIALOG */}
      <Dialog open={Boolean(stockProduct)} onOpenChange={(open) => !open && setStockProduct(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Boxes className="size-4 text-primary" />
              Add / Manage Product Stock
            </DialogTitle>
            <DialogDescription className="text-xs">
              Add inventory stock quantity and select measurement units.
            </DialogDescription>
          </DialogHeader>

          {stockProduct && (
            <form onSubmit={handleSaveStock} className="space-y-4 pt-2">
              {/* Product Info Summary */}
              <div className="p-3 rounded-xl bg-muted/40 border flex items-center gap-3">
                <img
                  src={stockProduct.image_url || SAMPLE_IMAGES[0].url}
                  alt={stockProduct.title}
                  className="size-12 rounded-lg object-cover border shrink-0"
                  onError={(e) => {
                    (e.target as any).src = "https://images.unsplash.com/photo-1581244277943-fe4a9c777189?w=300&auto=format&fit=crop&q=60";
                  }}
                />
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-foreground truncate">{stockProduct.title}</h4>
                  <p className="text-[11px] text-muted-foreground truncate">{stockProduct.category_name || stockProduct.category}</p>
                  <p className="text-[11px] mt-0.5">
                    Current Stock: <strong className="text-foreground">{stockProduct.stock_quantity || 0} {stockProduct.unit || stockProduct.unit_of_measurement || "Piece"}</strong>
                  </p>
                </div>
              </div>

              {/* Stock Mode: Add to stock vs Set exact stock */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Operation Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setStockMode("add")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border text-center transition-colors ${
                      stockMode === "add"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background text-muted-foreground border-border hover:bg-muted/30"
                    }`}
                  >
                    + Add to Current Stock
                  </button>
                  <button
                    type="button"
                    onClick={() => setStockMode("set")}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border text-center transition-colors ${
                      stockMode === "set"
                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                        : "bg-background text-muted-foreground border-border hover:bg-muted/30"
                    }`}
                  >
                    = Set Exact Stock Total
                  </button>
                </div>
              </div>

              {/* Stock Quantity (Number) & Quick Add Chips */}
              <div className="space-y-2">
                <Label className="text-xs font-bold">
                  {stockMode === "add" ? "Quantity to Add (Number) *" : "New Stock Quantity (Number) *"}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  placeholder={stockMode === "add" ? "e.g. 50" : String(stockProduct.stock_quantity || 0)}
                  value={stockQuantityInput}
                  onChange={(e) => setStockQuantityInput(e.target.value)}
                  className="h-9 text-xs font-mono font-bold"
                  required
                  autoFocus
                />

                {/* Quick Number Chips */}
                {stockMode === "add" && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-muted-foreground">Quick add:</span>
                    {[10, 25, 50, 100, 250, 500].map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => {
                          const cur = parseInt(stockQuantityInput) || 0;
                          setStockQuantityInput(String(cur + chip));
                        }}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-border bg-muted/30 hover:bg-primary/10 hover:text-primary transition-colors cursor-pointer"
                      >
                        +{chip}
                      </button>
                    ))}
                    {stockQuantityInput && (
                      <button
                        type="button"
                        onClick={() => setStockQuantityInput("")}
                        className="text-[10px] text-muted-foreground hover:text-destructive transition-colors ml-1 cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Measurement Unit (Units) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Unit of Measurement (Units) *</Label>
                <Select value={stockUnitInput} onValueChange={setStockUnitInput}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="Select Unit" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {COMMON_UOM_OPTIONS.map((u) => (
                      <SelectItem key={u} value={u} className="text-xs">
                        {u}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">
                  Measurement unit displayed on storefront (e.g. kg, pack, bottle, piece).
                </p>
              </div>

              {/* Live Result Calculation Preview */}
              <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between text-xs">
                <span className="text-muted-foreground font-medium">Updated Stock Total:</span>
                <span className="font-mono font-black text-sm text-primary">
                  {stockMode === "add"
                    ? (Number(stockProduct.stock_quantity) || 0) + (parseInt(stockQuantityInput) || 0)
                    : parseInt(stockQuantityInput) || 0}{" "}
                  {stockUnitInput}
                </span>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setStockProduct(null)}
                  disabled={savingStock}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingStock || !stockQuantityInput}
                  className="font-bold gap-1.5"
                >
                  {savingStock && <Loader2 className="size-3.5 animate-spin" />}
                  Save Stock
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* UPDATE STOCK FROM BILL / INVOICE DIALOG */}
      <UpdateStockBillDialog
        open={billStockModalOpen}
        onOpenChange={setBillStockModalOpen}
        onSuccess={fetchProducts}
        catalogProducts={products.map((p) => ({
          id: p.id,
          title: p.title,
          unit: p.unit || p.unit_of_measurement || "Piece",
          stock_quantity: Number(p.stock_quantity || 0),
          price: Number(p.price || 0),
        }))}
      />
    </div>
  );
}
