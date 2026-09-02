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

export type ProductCategory = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  is_active: boolean;
  products_count?: number;
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

function formatCurrency(val: number | string | null | undefined) {
  const num = Number(val) || 0;
  return `₹${num.toLocaleString("en-IN")}`;
}

export default function AdminProductsPage() {
  const { user, accessToken } = useAuthStore();
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
  const [selectedCategoryId, setSelectedCategoryId] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

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
      if (selectedCategoryId !== "all") params.set("category_id", selectedCategoryId);
      if (selectedStatus !== "all") params.set("status", selectedStatus);

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
  }, [search, selectedCategoryId, selectedStatus, accessToken]);

  useEffect(() => {
    fetchCategories();
    fetchProgramOptions();
  }, [fetchCategories, fetchProgramOptions]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

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
    setFormTab("basic");
    setFormTitle("");
    setFormCategoryId(categories[0]?.id ? String(categories[0].id) : "");
    setFormProgramIds([]);
    setProgramSearch("");
    setProgramDropdownOpen(false);
    setFormPrice("");
    setFormSalePrice("");
    setFormStock("100");
    setFormSku(`PRD-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormBadge("");
    setFormImage(SAMPLE_IMAGES[0].url);
    setFormDescription("");
    setFormStatus("active");
    setFormIsFeatured(false);
    setFormFeatures([""]);
    setDialogOpen(true);
  };

  // Open Dialog for Edit
  const handleOpenEdit = (product: ProductRecord) => {
    setEditingProduct(product);
    setFormTab("basic");
    setFormTitle(product.title);
    setFormCategoryId(product.category_id ? String(product.category_id) : (categories.find(c => c.name === product.category)?.id ? String(categories.find(c => c.name === product.category)?.id) : ""));
    setProgramSearch("");
    setProgramDropdownOpen(false);
    
    // Parse program_ids
    let progIds: number[] = [];
    if (Array.isArray(product.program_ids)) {
      progIds = product.program_ids.map(Number).filter(n => !isNaN(n));
    } else if (Array.isArray(product.associated_programs)) {
      progIds = product.associated_programs.map(p => p.id);
    }
    setFormProgramIds(progIds);

    setFormPrice(String(product.price || ""));
    setFormSalePrice(product.sale_price !== null && product.sale_price !== undefined ? String(product.sale_price) : "");
    setFormStock(String(product.stock_quantity || "0"));
    setFormSku(product.sku || "");
    setFormBadge(product.badge_text || "");
    setFormImage(product.image_url || "");
    setFormDescription(product.description || "");
    setFormStatus(product.status || "active");
    setFormIsFeatured(Boolean(product.is_featured));
    setFormFeatures(
      Array.isArray(product.features) && product.features.length > 0
        ? product.features
        : [""]
    );
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
            size="sm"
            onClick={handleOpenCreate}
            className="font-bold text-xs gap-1.5 shadow-2xs h-9 rounded-xl cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchProducts}
            disabled={loading}
            className="h-9 px-3 text-xs font-bold rounded-xl gap-1.5 shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-primary" : ""}`} />
            Refresh
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
          <p className="text-2xl font-black text-foreground mt-1">{formatCurrency(stats.totalInventoryValue)}</p>
          <span className="text-[10px] text-muted-foreground">Stock valuation</span>
        </Card>
      </div>

      {/* FILTERS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, SKU, or description..."
            className="pl-9 text-xs h-9 bg-background rounded-lg"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
            <SelectTrigger className="w-[180px] h-9 text-xs font-bold bg-background rounded-lg">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories ({categories.length})</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[130px] h-9 text-xs font-bold bg-background rounded-lg">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* PRODUCTS GRID */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted-foreground">Loading products...</div>
      ) : products.length === 0 ? (
        <Card className="p-10 text-center space-y-3 bg-card border-border rounded-2xl">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/40 mx-auto" />
          <h3 className="font-bold text-sm text-foreground">No products found</h3>
          <p className="text-xs text-muted-foreground">Click "Add Product" to create your first study kit, book, or uniform listing.</p>
          <Button size="sm" onClick={handleOpenCreate} className="font-bold text-xs">
            <Plus className="w-4 h-4 mr-1" /> Add Product Now
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((prod) => (
            <Card
              key={prod.id}
              className="overflow-hidden border-border bg-card shadow-xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between rounded-2xl group"
            >
              <div className="space-y-3">
                {/* Product Image & Badges */}
                <div className="relative h-44 w-full bg-muted overflow-hidden">
                  <img
                    src={prod.image_url || SAMPLE_IMAGES[0].url}
                    alt={prod.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                    <Badge variant="secondary" className="text-[10px] font-extrabold bg-background/90 backdrop-blur-xs text-foreground shadow-2xs">
                      {prod.category_name || prod.category}
                    </Badge>
                    {prod.badge_text && (
                      <Badge variant="outline" className="text-[10px] font-extrabold bg-primary text-primary-foreground border-transparent shadow-2xs">
                        {prod.badge_text}
                      </Badge>
                    )}
                  </div>
                  <div className="absolute top-2.5 right-2.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-extrabold shadow-2xs ${
                        prod.status === "active"
                          ? "bg-emerald-500 text-white border-transparent"
                          : "bg-amber-500 text-white border-transparent"
                      }`}
                    >
                      {prod.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                {/* Title & SKU */}
                <div className="px-4 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">{prod.sku || `PRD-${prod.id}`}</span>
                    {prod.institution_name && (
                      <span className="text-[10px] font-bold text-primary truncate max-w-[140px]">{prod.institution_name}</span>
                    )}
                  </div>
                  <h3 className="font-extrabold text-base text-foreground line-clamp-2 leading-snug">{prod.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{prod.description || "No description provided."}</p>
                </div>

                {/* Associated Programs */}
                {Array.isArray(prod.associated_programs) && prod.associated_programs.length > 0 && (
                  <div className="px-4 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
                      <GraduationCap className="h-3 w-3 text-primary" /> Associated Programs:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {prod.associated_programs.slice(0, 2).map((prog: any) => (
                        <Badge key={prog.id} variant="outline" className="text-[9px] font-bold bg-primary/5 text-primary border-primary/20">
                          {prog.title}
                        </Badge>
                      ))}
                      {prod.associated_programs.length > 2 && (
                        <Badge variant="outline" className="text-[9px] font-bold text-muted-foreground">
                          +{prod.associated_programs.length - 2} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Price, Stock & Actions Footer */}
              <div className="p-4 border-t border-border mt-3 flex items-center justify-between gap-3 bg-muted/20">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-black text-foreground">
                      {formatCurrency(prod.sale_price !== null && prod.sale_price !== undefined ? prod.sale_price : prod.price)}
                    </span>
                    {prod.sale_price && Number(prod.sale_price) < Number(prod.price) && (
                      <span className="text-xs text-muted-foreground line-through">
                        {formatCurrency(prod.price)}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground font-semibold">
                    Stock: <strong>{prod.stock_quantity} units</strong>
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(prod)}
                    className="h-8 w-8 p-0 rounded-lg text-primary hover:bg-primary/10"
                    title="Edit Product"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteProduct(prod.id)}
                    className="h-8 w-8 p-0 rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20"
                    title="Delete Product"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* PRODUCT CREATE / EDIT DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="w-full sm:max-w-4xl lg:max-w-5xl max-h-[92vh] overflow-y-auto p-0 gap-0">
          <div className="p-5 pb-4 border-b border-border bg-muted/20">
            <DialogHeader>
              <DialogTitle className="text-xl font-black flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <span>{editingProduct ? "Edit Product Listing" : "Add New Product"}</span>
                  <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                    Configure basic information, categories, images, pricing & technical specifications
                  </span>
                </div>
              </DialogTitle>
            </DialogHeader>
          </div>

          <form onSubmit={handleSaveProduct} className="flex flex-col">
            <div className="p-5 space-y-4">
              {/* Tab Navigation Header */}
              <Tabs value={formTab} onValueChange={(val) => setFormTab(val as FormTabId)} className="w-full">
                <TabsList className="grid grid-cols-5 w-full bg-muted/60 p-1 rounded-xl h-auto gap-1 border border-border/50">
                  {FORM_TABS.map((t) => {
                    const IconComp = t.icon;
                    return (
                      <TabsTrigger
                        key={t.id}
                        value={t.id}
                        className="flex flex-col sm:flex-row items-center justify-center gap-1.5 py-2 px-1 text-xs font-bold rounded-lg transition-all"
                      >
                        <IconComp className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{t.label}</span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {/* TAB 1: BASIC */}
                <TabsContent value="basic" className="space-y-4 pt-3 outline-none focus-visible:outline-none">
                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-foreground">1. Basic Product Identity</h4>
                      <p className="text-[11px] text-muted-foreground">General details, inventory SKU, listing status and overview description.</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold bg-background">
                      Tab 1 of 5
                    </Badge>
                  </div>

                  {/* Title */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Product Title / Name *</Label>
                    <Input
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="e.g. Robotics & IoT Starter STEM Kit (50+ Sensors)"
                      className="text-xs h-9"
                      required
                    />
                  </div>

                  {/* SKU & Status */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">SKU / Item Code</Label>
                      <Input
                        value={formSku}
                        onChange={(e) => setFormSku(e.target.value)}
                        placeholder="e.g. PRD-8492"
                        className="text-xs h-9 font-mono"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Storefront Visibility Status *</Label>
                      <Select value={formStatus} onValueChange={(val: any) => setFormStatus(val)}>
                        <SelectTrigger className="text-xs h-9 font-semibold">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active (Visible in Store)</SelectItem>
                          <SelectItem value="draft">Draft (Hidden / Unlisted)</SelectItem>
                          <SelectItem value="archived">Archived (Discontinued)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Badge & Featured Toggle */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Promotional Badge Text (Optional)</Label>
                      <Input
                        value={formBadge}
                        onChange={(e) => setFormBadge(e.target.value)}
                        placeholder="e.g. Best Seller, Top Rated, New Release"
                        className="text-xs h-9"
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
                      <div className="space-y-0.5">
                        <Label className="text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                          Featured Product
                        </Label>
                        <p className="text-[10px] text-muted-foreground">
                          Spotlight in student store banner & recommendations
                        </p>
                      </div>
                      <Switch
                        checked={formIsFeatured}
                        onCheckedChange={setFormIsFeatured}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">Product Description & Overview</Label>
                    <Textarea
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Detailed overview, syllabus alignment, what is inside the box, key highlights..."
                      rows={4}
                      className="text-xs resize-none"
                    />
                  </div>
                </TabsContent>

                {/* TAB 2: CATEGORY & COURSES */}
                <TabsContent value="category" className="space-y-4 pt-3 outline-none focus-visible:outline-none">
                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-foreground">2. Category & Academic Program Alignment</h4>
                      <p className="text-[11px] text-muted-foreground">Categorize product and link it to student courses for smart cross-sell recommendations.</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold bg-background">
                      Tab 2 of 5
                    </Badge>
                  </div>

                  {/* Category Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Product Category (Platform Admin) *</Label>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {categories.length} categories available
                      </span>
                    </div>
                    <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                      <SelectTrigger className="text-xs h-9 font-semibold">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={String(cat.id)}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Link to Courses / Programs Multi-Select Dropdown */}
                  <div className="space-y-2.5 p-3.5 bg-muted/30 border border-border rounded-xl">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                        <GraduationCap className="h-4 w-4 text-primary" />
                        Associated Courses & Academic Programs (Multi-Select)
                      </Label>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                          {formProgramIds.length} Selected
                        </Badge>
                        {formProgramIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setFormProgramIds([])}
                            className="text-[10px] text-muted-foreground hover:text-rose-600 font-semibold cursor-pointer underline"
                          >
                            Clear All
                          </button>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Students enrolled in the selected courses will automatically see this product recommended inside their portal.
                    </p>

                    {/* Selected Program Badges */}
                    {formProgramIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 pb-1">
                        {formProgramIds.map((progId) => {
                          const prog = programOptions.find((p) => p.id === progId);
                          if (!prog) return null;
                          return (
                            <Badge
                              key={prog.id}
                              variant="secondary"
                              className="text-[10px] font-bold py-0.5 px-2 bg-primary/10 text-primary border border-primary/20 flex items-center gap-1.5"
                            >
                              <span className="truncate max-w-[200px]">{prog.title}</span>
                              <button
                                type="button"
                                onClick={() => toggleProgram(prog.id)}
                                className="hover:text-rose-600 cursor-pointer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}

                    {/* Dropdown Toggle Button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setProgramDropdownOpen((prev) => !prev)}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors cursor-pointer text-left"
                      >
                        <span className="flex items-center gap-2 truncate">
                          <BookOpen className="h-3.5 w-3.5 text-primary shrink-0" />
                          {formProgramIds.length === 0
                            ? `Select from all courses & academic programs (${programOptions.length} available)...`
                            : `${formProgramIds.length} course(s) selected (Click to modify)`}
                        </span>
                        <ChevronRight
                          className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 ${
                            programDropdownOpen ? "rotate-90" : ""
                          }`}
                        />
                      </button>

                      {/* Dropdown Menu Panel */}
                      {programDropdownOpen && (
                        <div className="mt-2 p-2.5 bg-background border border-border rounded-xl shadow-lg space-y-2 animate-in fade-in-50 duration-150">
                          {/* Search inside dropdown */}
                          <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                              value={programSearch}
                              onChange={(e) => setProgramSearch(e.target.value)}
                              placeholder={`Search ${programOptions.length} courses (e.g. Class 9, ADCA, BBA, Web Dev)...`}
                              className="pl-8 text-xs h-8 bg-muted/30"
                            />
                          </div>

                          {/* Quick Selection Actions */}
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 border-b border-border/60 pb-1.5">
                            <span>
                              Showing {filteredProgramOptions.length} of {programOptions.length} courses
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const allFilteredIds = filteredProgramOptions.map((p) => p.id);
                                  setFormProgramIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
                                }}
                                className="font-bold text-primary hover:underline cursor-pointer"
                              >
                                Select All ({filteredProgramOptions.length})
                              </button>
                            </div>
                          </div>

                          {/* Multi-Checkbox Scrollable Options List */}
                          {filteredProgramOptions.length === 0 ? (
                            <div className="p-4 text-center text-xs text-muted-foreground">
                              No courses match "{programSearch}"
                            </div>
                          ) : (
                            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                              {filteredProgramOptions.map((prog) => {
                                const isChecked = formProgramIds.includes(prog.id);
                                return (
                                  <div
                                    key={prog.id}
                                    onClick={() => toggleProgram(prog.id)}
                                    className={`p-2 rounded-lg border text-xs transition-all flex items-center justify-between gap-3 cursor-pointer select-none ${
                                      isChecked
                                        ? "bg-primary/10 border-primary text-primary font-bold shadow-2xs"
                                        : "bg-background border-border/60 text-foreground hover:bg-muted"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div
                                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                                          isChecked
                                            ? "bg-primary border-primary text-primary-foreground"
                                            : "border-muted-foreground/40 bg-background"
                                        }`}
                                      >
                                        {isChecked && <Check className="h-3 w-3" />}
                                      </div>
                                      <div className="truncate min-w-0">
                                        <span className="block truncate font-bold text-xs">{prog.title}</span>
                                        {prog.institution_name && (
                                          <span className="text-[10px] text-muted-foreground block truncate">
                                            {prog.institution_name}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {prog.fee_amount && (
                                      <span className="text-[10px] font-semibold text-muted-foreground shrink-0">
                                        {typeof prog.fee_amount === "number" || !isNaN(Number(prog.fee_amount))
                                          ? `₹${Number(prog.fee_amount).toLocaleString("en-IN")}`
                                          : prog.fee_amount}
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 3: IMAGES */}
                <TabsContent value="images" className="space-y-4 pt-3 outline-none focus-visible:outline-none">
                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-foreground">3. Product Media & Visual Assets</h4>
                      <p className="text-[11px] text-muted-foreground">Upload high quality product pictures, paste direct image URLs, or choose from quick sample presets.</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold bg-background">
                      Tab 3 of 5
                    </Badge>
                  </div>

                  {/* Direct Image Upload Box */}
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                      <span>Upload Product Photo</span>
                      <span className="text-[10px] font-normal text-muted-foreground">JPG, PNG, WEBP, AVIF (Max 10MB)</span>
                    </Label>

                    <div className="border-2 border-dashed border-border hover:border-primary/50 transition-colors rounded-xl p-4 bg-muted/10 text-center relative flex flex-col items-center justify-center gap-2">
                      <input
                        type="file"
                        id="product-image-file-input"
                        accept="image/png,image/jpeg,image/webp,image/avif,image/gif,image/svg+xml"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={uploadingImage}
                      />
                      
                      {uploadingImage ? (
                        <div className="py-4 flex flex-col items-center gap-2">
                          <Loader2 className="w-8 h-8 text-primary animate-spin" />
                          <p className="text-xs font-bold text-foreground">Uploading product image...</p>
                          <p className="text-[11px] text-muted-foreground">Please wait while the image is processed</p>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 py-1">
                          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <UploadCloud className="w-5 h-5" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="text-xs font-bold text-foreground">Drag & drop product picture here, or browse</p>
                            <p className="text-[10px] text-muted-foreground">High resolution product photos look great on storefront</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              onClick={() => document.getElementById("product-image-file-input")?.click()}
                              className="h-8 text-xs font-bold gap-1.5 shadow-sm cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              Browse &amp; Upload
                            </Button>
                            {formImage && (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setFormImage("")}
                                className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1 cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                                Clear Image
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Fallback Image URL Input */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Or Product Image URL</Label>
                      {formImage && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Image linked
                        </span>
                      )}
                    </div>
                    <Input
                      value={formImage}
                      onChange={(e) => setFormImage(e.target.value)}
                      placeholder="https://images.unsplash.com/... or uploaded Cloudinary URL"
                      className="text-xs h-9"
                    />
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-muted-foreground font-semibold py-0.5">Quick Presets:</span>
                      {SAMPLE_IMAGES.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setFormImage(s.url)}
                          className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground text-foreground transition-colors cursor-pointer"
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Live Visual Preview Container */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    <div className="border border-border rounded-xl p-3 bg-muted/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-muted-foreground">Storefront Card Preview</span>
                        {formImage && (
                          <span className="text-[10px] text-primary font-bold">Live Preview</span>
                        )}
                      </div>
                      <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-background border border-border/60 flex items-center justify-center shadow-inner">
                        {formImage ? (
                          <img
                            src={formImage}
                            alt={formTitle || "Product preview"}
                            className="w-full h-full object-cover transition-transform hover:scale-105 duration-300"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-1.5 text-muted-foreground p-4 text-center">
                            <ImageIcon className="w-8 h-8 opacity-40" />
                            <span className="text-[10px]">Upload an image or enter a URL to preview</span>
                          </div>
                        )}
                        {formBadge && (
                          <div className="absolute top-2 left-2 shadow-sm">
                            <Badge className="text-[9px] font-black bg-primary text-primary-foreground px-1.5 py-0.5">
                              {formBadge}
                            </Badge>
                          </div>
                        )}
                      </div>
                      <div className="pt-1">
                        <span className="font-bold text-xs line-clamp-1">{formTitle || "Sample Product Name"}</span>
                        <div className="flex items-center gap-2 text-xs font-semibold text-primary mt-0.5">
                          <span>{formPrice ? `₹${formPrice}` : "₹0"}</span>
                          {formSalePrice && (
                            <span className="text-muted-foreground line-through text-[11px]">
                              ₹{formSalePrice}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="border border-border/80 rounded-xl p-3.5 bg-muted/10 space-y-2 text-xs">
                      <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" />
                        Image Recommendations
                      </span>
                      <ul className="space-y-1.5 text-[11px] text-muted-foreground">
                        <li className="flex items-start gap-1.5">
                          <span className="text-primary font-bold">•</span>
                          <span>Upload crisp product photos in 16:9 or 1:1 square aspect ratio.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-primary font-bold">•</span>
                          <span>High resolution images (800x600 or higher) look sharp across mobile and desktop.</span>
                        </li>
                        <li className="flex items-start gap-1.5">
                          <span className="text-primary font-bold">•</span>
                          <span>Supports direct photo upload to cloud storage as well as external CDN URLs.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </TabsContent>

                {/* TAB 4: PRICE & STOCK */}
                <TabsContent value="price" className="space-y-4 pt-3 outline-none focus-visible:outline-none">
                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-foreground">4. Pricing, Discounts & Inventory</h4>
                      <p className="text-[11px] text-muted-foreground">Configure retail price, optional discounted sale rate, and inventory stock tracking.</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold bg-background">
                      Tab 4 of 5
                    </Badge>
                  </div>

                  {/* Prices */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Product Actual MRP Price (₹) *</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-bold">₹</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={formPrice}
                          onChange={(e) => setFormPrice(e.target.value)}
                          placeholder="e.g. 4999"
                          className="text-xs h-9 pl-7"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">Discounted Sale Price (₹) (Optional)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-bold">₹</span>
                        <Input
                          type="number"
                          step="0.01"
                          value={formSalePrice}
                          onChange={(e) => setFormSalePrice(e.target.value)}
                          placeholder="e.g. 3899"
                          className="text-xs h-9 pl-7"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Discount Callout */}
                  {(() => {
                    const p = parseFloat(formPrice);
                    const s = parseFloat(formSalePrice);
                    if (p > 0 && s > 0) {
                      if (s < p) {
                        const pct = Math.round(((p - s) / p) * 100);
                        const saved = p - s;
                        return (
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                            <div className="flex items-center gap-2">
                              <Percent className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span>Calculated Discount: <strong className="font-black text-emerald-800 dark:text-emerald-300">{pct}% OFF</strong></span>
                            </div>
                            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-bold border-emerald-500/30">
                              Student Saves ₹{saved.toLocaleString("en-IN")}
                            </Badge>
                          </div>
                        );
                      } else {
                        return (
                          <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
                            <AlertTriangle className="w-4 h-4 shrink-0" />
                            <span>Discounted sale price should be lower than the actual MRP price (₹{p}).</span>
                          </div>
                        );
                      }
                    }
                    return null;
                  })()}

                  {/* Stock Quantity */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Stock Quantity in Warehouse *</Label>
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-bold ${
                          parseInt(formStock) <= 0
                            ? "bg-rose-500/10 text-rose-600 border-rose-500/20"
                            : parseInt(formStock) <= 10
                            ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                            : "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        }`}
                      >
                        {parseInt(formStock) <= 0
                          ? "Out of Stock"
                          : parseInt(formStock) <= 10
                          ? "Low Stock Alert"
                          : "In Stock & Available"}
                      </Badge>
                    </div>
                    <Input
                      type="number"
                      value={formStock}
                      onChange={(e) => setFormStock(e.target.value)}
                      placeholder="100"
                      className="text-xs h-9"
                      min="0"
                    />
                  </div>
                </TabsContent>

                {/* TAB 5: SPECIFICATIONS */}
                <TabsContent value="specifications" className="space-y-4 pt-3 outline-none focus-visible:outline-none">
                  <div className="p-3 bg-primary/5 rounded-xl border border-primary/10 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black text-foreground">5. Specifications & Key Highlights</h4>
                      <p className="text-[11px] text-muted-foreground">List product features, package contents, warranty details, and technical parameters.</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] font-bold bg-background">
                      Tab 5 of 5
                    </Badge>
                  </div>

                  {/* Key Features Bullet Points */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold">Key Feature Bullets & Highlights</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleAddFeature}
                        className="text-[11px] h-7 px-2.5 text-primary font-bold hover:bg-primary/10"
                      >
                        <Plus className="h-3 w-3 mr-1" /> Add Bullet Point
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {formFeatures.map((feat, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-black text-muted-foreground shrink-0">
                            {idx + 1}
                          </span>
                          <Input
                            value={feat}
                            onChange={(e) => handleUpdateFeature(idx, e.target.value)}
                            placeholder={`Feature bullet ${idx + 1} (e.g. 15 Years Solved Papers, 1 Year Replacement Warranty)`}
                            className="text-xs h-8.5"
                          />
                          {formFeatures.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveFeature(idx)}
                              className="h-8.5 w-8.5 p-0 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 shrink-0"
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Quick Suggestion Pills */}
                    <div className="pt-2 border-t border-border/60">
                      <span className="text-[10px] font-bold text-muted-foreground block mb-1.5">
                        Quick Add Suggestions:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          "1-Year Replacement Warranty",
                          "100% Syllabus Covered",
                          "Includes Certificate of Completion",
                          "50+ Hands-on Experiments Kit",
                          "Step-by-Step Video Tutorials Included",
                          "Free Nationwide Express Delivery",
                        ].map((sug, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              if (formFeatures.length === 1 && formFeatures[0] === "") {
                                setFormFeatures([sug]);
                              } else {
                                setFormFeatures((prev) => [...prev, sug]);
                              }
                            }}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-muted hover:bg-primary/10 hover:text-primary text-muted-foreground transition-colors cursor-pointer"
                          >
                            + {sug}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Modal Actions Footer with Tab Navigation */}
            {(() => {
              const currentTabIndex = FORM_TABS.findIndex((t) => t.id === formTab);
              const hasPrevTab = currentTabIndex > 0;
              const hasNextTab = currentTabIndex < FORM_TABS.length - 1;

              return (
                <div className="p-4 px-6 border-t border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2.5">
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

                  <div className="flex items-center gap-2">
                    {hasPrevTab && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setFormTab(FORM_TABS[currentTabIndex - 1].id)}
                        className="text-xs font-bold gap-1"
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                        Previous
                      </Button>
                    )}

                    {hasNextTab && (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setFormTab(FORM_TABS[currentTabIndex + 1].id)}
                        className="text-xs font-bold gap-1"
                      >
                        Next
                        <ChevronRight className="h-3.5 w-3.5" />
                      </Button>
                    )}

                    <Button
                      type="submit"
                      disabled={saving}
                      size="sm"
                      className="font-bold text-xs gap-1.5 bg-primary text-primary-foreground shadow-sm hover:opacity-90"
                    >
                      {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      {editingProduct ? "Save Changes" : "Create Product"}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </form>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
