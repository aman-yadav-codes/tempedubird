"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Boxes,
  Plus,
  Search,
  Building2,
  Edit2,
  Trash2,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Package,
  TrendingDown,
  DollarSign,
  Layers,
  MapPin,
  Store,
  CheckCircle2,
  XCircle,
  LayoutGrid,
  Table as TableIcon,
  Tag,
  ArrowUpDown,
  User,
  FileText,
  Paperclip,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";

export type InventoryCategory = {
  id: number | string;
  name: string;
  slug?: string;
  description?: string | null;
  institution_id?: number | null;
  is_active?: boolean;
  item_count?: number;
};

export type InventoryItem = {
  id: number;
  name: string;
  sku: string | null;
  category: string;
  quantity: number;
  min_quantity: number;
  unit: string;
  unit_price: number | string;
  supplier_vendor_id: number | null;
  supplier_name: string | null;
  supplier_vendor_name?: string | null;
  location: string | null;
  condition: "new" | "good" | "fair" | "damaged" | "not_working" | "garbage" | "sold";
  status: "in_stock" | "low_stock" | "out_of_stock" | "discontinued";
  description: string | null;
  bill_url?: string | null;
  assigned_to_user_id?: number | null;
  assigned_to_name?: string | null;
  institution_id: number | null;
  created_at: string;
  updated_at?: string;
};

export const INITIAL_INVENTORY_CATEGORIES = [
  "Electronics & IT Hardware",
  "Books & Study Materials",
  "Stationery & Office Supplies",
  "Furniture & Class Fixtures",
  "Science & Computer Lab",
  "Sports & Physical Education",
  "Uniforms & Merchandise",
  "Maintenance & Cleaning Supplies",
  "General Supplies",
];

export const INVENTORY_CONDITIONS = [
  { id: "new", label: "Brand New", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  { id: "good", label: "Good Condition", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  { id: "fair", label: "Fair / Used", color: "bg-slate-500/10 text-slate-600 border-slate-500/20" },
  { id: "damaged", label: "Needs Repair / Damaged", color: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
  { id: "not_working", label: "Not Working / Broken", color: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
  { id: "garbage", label: "Garbage / Scrap", color: "bg-stone-500/10 text-stone-600 border-stone-500/20" },
  { id: "sold", label: "Sold / Liquidated", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
];

export const INVENTORY_UNITS = [
  "units",
  "pieces (pcs)",
  "boxes",
  "packets",
  "sets",
  "kg",
  "grams (g)",
  "litres (L)",
  "ml",
  "meters (m)",
  "bundles",
  "reams",
  "pairs",
  "rolls",
  "bottles",
];

export default function InventoryManagementPage() {
  const { user, accessToken } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const isPlatformAdmin = Boolean(user?.role_codes?.includes("platform_admin") || user?.is_super_admin);

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<InventoryCategory[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [conditionFilter, setConditionFilter] = useState("all");

  // Category Dialog State
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryTab, setCategoryTab] = useState<"create" | "manage">("create");
  const [newCatName, setNewCatName] = useState("");
  const [newCatDesc, setNewCatDesc] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);

  // Summary Stats
  const [stats, setStats] = useState({
    totalItems: 0,
    totalQuantity: 0,
    totalValue: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  });

  // Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [dialogTab, setDialogTab] = useState<"item" | "stock" | "assignment">("item");
  const [saving, setSaving] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form Fields
  const [formName, setFormName] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formCategory, setFormCategory] = useState("Stationery & Office Supplies");
  const [formQuantity, setFormQuantity] = useState("10");
  const [formMinQuantity, setFormMinQuantity] = useState("5");
  const [formUnit, setFormUnit] = useState("units");
  const [formUnitPrice, setFormUnitPrice] = useState("0");
  const [formSupplierId, setFormSupplierId] = useState("none");
  const [formSupplierName, setFormSupplierName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formCondition, setFormCondition] = useState<"new" | "good" | "fair" | "damaged" | "not_working" | "garbage" | "sold">("new");
  const [formStatus, setFormStatus] = useState<"in_stock" | "low_stock" | "out_of_stock" | "discontinued">("in_stock");
  const [formDescription, setFormDescription] = useState("");
  const [formBillUrl, setFormBillUrl] = useState("");
  const [formAssignedToUserId, setFormAssignedToUserId] = useState("none");
  const [formAssignedToName, setFormAssignedToName] = useState("");

  const fetchCategories = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (activeInstitution?.id) params.set("institution_id", String(activeInstitution.id));
      const res = await fetch(`/api/admin/inventory/categories?${params.toString()}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.categories)) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error("Failed to fetch inventory categories:", err);
    }
  }, [activeInstitution]);

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeInstitution?.id) params.set("institution_id", String(activeInstitution.id));
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (categoryFilter && categoryFilter !== "all") params.set("category", categoryFilter);
      if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
      if (conditionFilter && conditionFilter !== "all") params.set("condition", conditionFilter);

      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/inventory?${params.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load inventory");

      setItems(data.items || []);
      if (Array.isArray(data.suppliers)) setSuppliers(data.suppliers);
      if (Array.isArray(data.employees)) setEmployees(data.employees);
      if (Array.isArray(data.categories) && data.categories.length > 0) {
        setCategories(data.categories);
      }
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch inventory");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, categoryFilter, statusFilter, conditionFilter, accessToken, activeInstitution]);

  useEffect(() => {
    fetchCategories();
    fetchInventory();
  }, [fetchCategories, fetchInventory]);

  // Combined list of all category names
  const distinctCategories = useMemo(() => {
    const set = new Set<string>();
    if (categories.length > 0) {
      categories.forEach((c) => set.add(c.name));
    } else {
      INITIAL_INVENTORY_CATEGORIES.forEach((c) => set.add(c));
    }
    items.forEach((item) => {
      if (item.category) set.add(item.category);
    });
    return Array.from(set);
  }, [categories, items]);

  const handleOpenAdd = () => {
    setEditingItem(null);
    setDialogTab("item");
    setFormName("");
    setFormSku(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
    setFormCategory(categoryFilter !== "all" ? categoryFilter : (distinctCategories[0] || "Stationery & Office Supplies"));
    setFormQuantity("20");
    setFormMinQuantity("5");
    setFormUnit("units");
    setFormUnitPrice("150");
    setFormSupplierId("none");
    setFormSupplierName("");
    setFormLocation("Main Storage Room");
    setFormCondition("new");
    setFormStatus("in_stock");
    setFormDescription("");
    setFormBillUrl("");
    setFormAssignedToUserId("none");
    setFormAssignedToName("");
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setDialogTab("item");
    setFormName(item.name || "");
    setFormSku(item.sku || "");
    setFormCategory(item.category || "General Supplies");
    setFormQuantity(String(item.quantity ?? 0));
    setFormMinQuantity(String(item.min_quantity ?? 5));
    setFormUnit(item.unit || "units");
    setFormUnitPrice(String(item.unit_price ?? 0));
    setFormSupplierId(item.supplier_vendor_id ? String(item.supplier_vendor_id) : "none");
    setFormSupplierName(item.supplier_name || "");
    setFormLocation(item.location || "");
    setFormCondition(item.condition || "new");
    setFormStatus(item.status || "in_stock");
    setFormDescription(item.description || "");
    setFormBillUrl(item.bill_url || "");
    setFormAssignedToUserId(item.assigned_to_user_id ? String(item.assigned_to_user_id) : "none");
    setFormAssignedToName(item.assigned_to_name || "");
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Please enter an item name");
      return;
    }

    setSaving(true);
    try {
      const selectedSupplier = suppliers.find((s) => String(s.id) === formSupplierId);
      const supplierNameFinal = selectedSupplier ? selectedSupplier.name : (formSupplierName.trim() || null);

      const selectedEmployee = employees.find((emp) => String(emp.id) === formAssignedToUserId);
      const assignedNameFinal = selectedEmployee ? selectedEmployee.name : (formAssignedToName.trim() || null);

      const payload = {
        id: editingItem?.id,
        name: formName.trim(),
        sku: formSku.trim() || null,
        category: formCategory.trim() || "General Supplies",
        quantity: parseInt(formQuantity, 10) || 0,
        min_quantity: parseInt(formMinQuantity, 10) || 5,
        unit: formUnit.trim() || "units",
        unit_price: parseFloat(formUnitPrice) || 0,
        supplier_vendor_id: formSupplierId !== "none" ? Number(formSupplierId) : null,
        supplier_name: supplierNameFinal,
        location: formLocation.trim() || null,
        condition: formCondition,
        status: formStatus,
        description: formDescription.trim() || null,
        bill_url: formBillUrl.trim() || null,
        assigned_to_user_id: formAssignedToUserId !== "none" ? Number(formAssignedToUserId) : null,
        assigned_to_name: assignedNameFinal,
        institution_id: activeInstitution?.id || null,
      };

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const method = editingItem ? "PUT" : "POST";
      const res = await fetch("/api/admin/inventory", {
        method,
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save inventory item");

      toast.success(editingItem ? "Inventory item updated successfully" : "Inventory item added successfully");
      setDialogOpen(false);
      fetchInventory();
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to save inventory item");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/inventory?id=${id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete item");

      toast.success("Inventory item deleted successfully");
      setDeleteConfirmId(null);
      fetchInventory();
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item");
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    setSavingCategory(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/inventory/categories", {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: newCatName.trim(),
          description: newCatDesc.trim() || null,
          institution_id: activeInstitution?.id || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create category");
      }

      toast.success(`Category "${newCatName.trim()}" created successfully!`);
      const createdCategoryName = data.category?.name || newCatName.trim();

      if (dialogOpen) {
        setFormCategory(createdCategoryName);
      }

      setNewCatName("");
      setNewCatDesc("");
      setCategoryDialogOpen(false);
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to create category");
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategory = async (catId: number | string, catName: string) => {
    if (!confirm(`Are you sure you want to delete category "${catName}"?`)) return;

    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/inventory/categories?id=${catId}`, {
        method: "DELETE",
        headers,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete category");
      }

      toast.success(`Category "${catName}" deleted successfully`);
      if (categoryFilter === catName) {
        setCategoryFilter("all");
      }
      fetchCategories();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete category");
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground flex items-center gap-2.5">
              <Boxes className="w-7 h-7 text-primary" />
              Inventory &amp; Assets
            </h1>
            {activeInstitution ? (
              <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/20 font-medium">
                {activeInstitution.name}
              </Badge>
            ) : isPlatformAdmin ? (
              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30 font-medium">
                Platform Central Inventory
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-600 border-blue-500/30 font-medium">
                Institution Inventory
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Track and manage school equipment, books, stationery, lab assets, stock levels, custodian employees, and vendor suppliers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchInventory(); fetchCategories(); }}
            disabled={loading}
            className="rounded-xl h-10 px-3.5 shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin text-primary" : ""}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setCategoryTab("create");
              setCategoryDialogOpen(true);
            }}
            className="rounded-xl h-10 px-3.5 border-primary/40 text-primary hover:bg-primary/10 font-bold shadow-2xs gap-1.5"
          >
            <Tag className="w-4 h-4 text-primary" /> + Add Category
          </Button>

          <Button
            onClick={handleOpenAdd}
            className="rounded-xl h-10 px-4 shadow-sm font-semibold gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="w-4 h-4" />
            Add Inventory Item
          </Button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border bg-card shadow-sm p-4 hover:border-primary/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Unique Items</p>
              <h3 className="text-2xl font-black text-foreground mt-1">{stats.totalItems}</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stats.totalQuantity} total units in stock</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm p-4 hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Asset Value</p>
              <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                ₹{Number(stats.totalValue).toLocaleString("en-IN")}
              </h3>
              <p className="text-[11px] text-emerald-600/80 mt-0.5">Calculated from unit cost</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm p-4 hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Low Stock Alerts</p>
              <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{stats.lowStockCount}</h3>
              <p className="text-[11px] text-amber-600/80 mt-0.5">Below threshold limit</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border bg-card shadow-sm p-4 hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Out of Stock</p>
              <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">{stats.outOfStockCount}</h3>
              <p className="text-[11px] text-rose-600/80 mt-0.5">Requires immediate restock</p>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filter Bar & Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              placeholder="Search items, SKU, supplier, custodian..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl text-xs bg-background"
            />
          </div>

          {/* Category Filter */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-10 rounded-xl text-xs bg-background">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="max-h-56">
              <SelectItem value="all" className="text-xs font-semibold">All Categories</SelectItem>
              {distinctCategories.map((cat) => (
                <SelectItem key={cat} value={cat} className="text-xs">
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-10 rounded-xl text-xs bg-background">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Statuses</SelectItem>
              <SelectItem value="in_stock" className="text-xs">In Stock</SelectItem>
              <SelectItem value="low_stock" className="text-xs">Low Stock</SelectItem>
              <SelectItem value="out_of_stock" className="text-xs">Out of Stock</SelectItem>
              <SelectItem value="discontinued" className="text-xs">Discontinued</SelectItem>
            </SelectContent>
          </Select>

          {/* Condition Filter */}
          <Select value={conditionFilter} onValueChange={setConditionFilter}>
            <SelectTrigger className="h-10 rounded-xl text-xs bg-background">
              <SelectValue placeholder="All Conditions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Conditions</SelectItem>
              {INVENTORY_CONDITIONS.map((cond) => (
                <SelectItem key={cond.id} value={cond.id} className="text-xs">
                  {cond.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border self-end md:self-auto shrink-0">
          <Button
            type="button"
            variant={viewMode === "cards" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("cards")}
            className="h-8 px-3 rounded-lg text-xs font-semibold gap-1.5"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Cards
          </Button>
          <Button
            type="button"
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="h-8 px-3 rounded-lg text-xs font-semibold gap-1.5"
          >
            <TableIcon className="w-3.5 h-3.5" />
            Table
          </Button>
        </div>
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="py-24 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Loading inventory records...</p>
        </div>
      ) : items.length === 0 ? (
        <Card className="p-12 text-center rounded-2xl border bg-muted/10">
          <Package className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">No Inventory Items Found</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
            {searchQuery || categoryFilter !== "all" || statusFilter !== "all" || conditionFilter !== "all"
              ? "No items match your active search and filter criteria."
              : "Start by creating your first inventory asset or equipment record."}
          </p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <Button
              onClick={handleOpenAdd}
              size="sm"
              className="rounded-xl font-semibold gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add First Item
            </Button>
            <Button
              onClick={() => {
                setCategoryTab("create");
                setCategoryDialogOpen(true);
              }}
              variant="outline"
              size="sm"
              className="rounded-xl font-semibold gap-1.5"
            >
              <Tag className="w-4 h-4" />
              Add Category
            </Button>
          </div>
        </Card>
      ) : viewMode === "cards" ? (
        /* Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => {
            const condObj = INVENTORY_CONDITIONS.find((c) => c.id === item.condition);
            const isLowStock = Number(item.quantity) <= Number(item.min_quantity) && Number(item.quantity) > 0;
            const isOutOfStock = Number(item.quantity) <= 0 || item.status === "out_of_stock";

            return (
              <Card
                key={item.id}
                className="rounded-2xl border bg-card shadow-xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between overflow-hidden"
              >
                <CardHeader className="p-4 pb-2 space-y-1.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary bg-primary/5 border-primary/20">
                          {item.category}
                        </Badge>
                        {item.sku && (
                          <span className="text-[10px] font-mono text-muted-foreground">
                            {item.sku}
                          </span>
                        )}
                      </div>
                      <CardTitle className="text-base font-bold text-foreground mt-1.5 line-clamp-1">
                        {item.name}
                      </CardTitle>
                    </div>

                    {isOutOfStock ? (
                      <Badge variant="destructive" className="text-[10px] font-bold shrink-0">
                        Out of Stock
                      </Badge>
                    ) : isLowStock ? (
                      <Badge className="text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-white shrink-0">
                        Low Stock
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
                        In Stock
                      </Badge>
                    )}
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-1 space-y-3 text-xs">
                  {item.description && (
                    <p className="text-muted-foreground text-[11px] line-clamp-2">{item.description}</p>
                  )}

                  {/* Stock, Unit Price, Total Value */}
                  <div className="grid grid-cols-3 gap-2 bg-muted/40 p-2.5 rounded-xl border text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground">Quantity</p>
                      <p className="font-bold text-sm text-foreground mt-0.5">
                        {item.quantity} <span className="text-[10px] font-normal text-muted-foreground">{item.unit}</span>
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Unit Cost</p>
                      <p className="font-bold text-sm text-foreground mt-0.5">
                        ₹{Number(item.unit_price || 0).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Total Value</p>
                      <p className="font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                        ₹{((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toLocaleString("en-IN")}
                      </p>
                    </div>
                  </div>

                  {/* Details metadata */}
                  <div className="space-y-1.5 text-[11px] text-muted-foreground pt-1">
                    {item.location && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </div>
                    )}

                    {(item.supplier_name || item.supplier_vendor_name) && (
                      <div className="flex items-center gap-1.5">
                        <Store className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="truncate">Supplier: {item.supplier_vendor_name || item.supplier_name}</span>
                      </div>
                    )}

                    {item.assigned_to_name && (
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                        <span className="truncate">Custodian: {item.assigned_to_name}</span>
                      </div>
                    )}

                    {condObj && (
                      <div className="pt-1 flex items-center justify-between">
                        <Badge variant="outline" className={`text-[10px] font-semibold ${condObj.color}`}>
                          {condObj.label}
                        </Badge>
                        {item.bill_url && (
                          <a
                            href={item.bill_url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
                          >
                            <Paperclip className="w-3 h-3" /> View Bill
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>

                {/* Card Actions */}
                <div className="p-3 bg-muted/20 border-t flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Min Alert: {item.min_quantity} {item.unit}
                  </span>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(item)}
                      className="h-8 px-2.5 text-xs font-semibold rounded-lg hover:text-primary"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteConfirmId(item.id)}
                      className="h-8 w-8 p-0 text-rose-600 hover:bg-rose-500/10 rounded-lg"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="border rounded-2xl bg-card overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                <tr>
                  <th className="py-3 px-4">Item Name / SKU</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Unit Cost</th>
                  <th className="py-3 px-4">Total Value</th>
                  <th className="py-3 px-4">Condition</th>
                  <th className="py-3 px-4">Location / Assigned</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map((item) => {
                  const condObj = INVENTORY_CONDITIONS.find((c) => c.id === item.condition);
                  const isLowStock = Number(item.quantity) <= Number(item.min_quantity) && Number(item.quantity) > 0;
                  const isOutOfStock = Number(item.quantity) <= 0 || item.status === "out_of_stock";

                  return (
                    <tr key={item.id} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-foreground">{item.name}</div>
                        {item.sku && <div className="text-[10px] text-muted-foreground font-mono">{item.sku}</div>}
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-[10px] font-semibold text-primary bg-primary/5 border-primary/20">
                          {item.category}
                        </Badge>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-foreground">{item.quantity}</span>
                          <span className="text-muted-foreground text-[11px]">{item.unit}</span>
                          {isOutOfStock ? (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0">Out</Badge>
                          ) : isLowStock ? (
                            <Badge className="text-[9px] px-1 py-0 bg-amber-500 text-white">Low</Badge>
                          ) : null}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium">
                        ₹{Number(item.unit_price || 0).toLocaleString("en-IN")}
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toLocaleString("en-IN")}
                      </td>

                      <td className="py-3 px-4">
                        {condObj && (
                          <Badge variant="outline" className={`text-[10px] ${condObj.color}`}>
                            {condObj.label}
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-[11px] text-muted-foreground">
                          {item.location && <div className="truncate max-w-[150px]">{item.location}</div>}
                          {item.assigned_to_name && (
                            <div className="text-primary font-medium truncate max-w-[150px]">
                              Cust: {item.assigned_to_name}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(item)}
                            className="h-7 w-7 p-0 rounded-lg hover:text-primary"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteConfirmId(item.id)}
                            className="h-7 w-7 p-0 rounded-lg text-rose-600 hover:bg-rose-500/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Manage Inventory Category Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="sm:max-w-lg rounded-2xl p-6">
          <DialogHeader>
            <div className="flex items-center gap-2 text-primary font-bold text-xs uppercase tracking-wider mb-0.5">
              <Tag className="w-4 h-4" />
              <span>Inventory Categories</span>
            </div>
            <DialogTitle className="text-xl font-bold">Manage Inventory Categories</DialogTitle>
            <DialogDescription className="text-xs">
              Create new categories or manage item classification tags for school assets.
            </DialogDescription>
          </DialogHeader>

          <Tabs value={categoryTab} onValueChange={(val: any) => setCategoryTab(val)} className="w-full pt-1">
            <TabsList className="grid grid-cols-2 w-full h-9 bg-muted/60 p-1 rounded-xl mb-4">
              <TabsTrigger
                value="create"
                className="text-xs font-semibold flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </TabsTrigger>
              <TabsTrigger
                value="manage"
                className="text-xs font-semibold flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xs"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>All Categories ({categories.length || distinctCategories.length})</span>
              </TabsTrigger>
            </TabsList>

            {/* Tab 1: Create Category */}
            <TabsContent value="create" className="space-y-4 outline-none">
              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="inv-cat-name" className="font-semibold text-xs">Category Name *</Label>
                  <Input
                    id="inv-cat-name"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g., Robotics & IoT Lab, Musical Instruments..."
                    className="h-10 text-xs"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="inv-cat-desc" className="font-semibold text-xs">Description (Optional)</Label>
                  <Textarea
                    id="inv-cat-desc"
                    rows={3}
                    value={newCatDesc}
                    onChange={(e) => setNewCatDesc(e.target.value)}
                    placeholder="Briefly describe what assets and items belong to this category..."
                    className="text-xs"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setCategoryDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={savingCategory} className="font-bold">
                    {savingCategory ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
                    Save Category
                  </Button>
                </DialogFooter>
              </form>
            </TabsContent>

            {/* Tab 2: Manage Categories */}
            <TabsContent value="manage" className="space-y-3 outline-none">
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
                {categories.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground">
                    Default system inventory categories are currently active.
                  </div>
                ) : (
                  categories.map((cat) => {
                    const isCustom = cat.institution_id !== null && cat.institution_id !== undefined;
                    return (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border bg-card/60 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                            <Tag className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-xs text-foreground">{cat.name}</span>
                              {isCustom && (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">Custom</Badge>
                              )}
                            </div>
                            {cat.description && (
                              <p className="text-[11px] text-muted-foreground line-clamp-1">{cat.description}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {cat.item_count || 0} item{Number(cat.item_count || 0) === 1 ? "" : "s"}
                          </span>
                          {typeof cat.id === "number" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(cat.id, cat.name)}
                              className="h-7 w-7 p-0 text-destructive hover:bg-destructive/10"
                              title="Delete Category"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex justify-between items-center pt-3 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCategoryTab("create")}
                  className="text-xs font-semibold gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Another Category
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setCategoryDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Delete Item Confirmation Dialog */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-destructive">Confirm Item Deletion</DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to delete this inventory item? This action will remove stock history and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Delete Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / Edit Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Boxes className="w-5 h-5 text-primary" />
              {editingItem ? "Edit Inventory Item" : "Add New Inventory Item"}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manage equipment assets, stock quantities, custodian employees, pricing, and purchase bills.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <Tabs value={dialogTab} onValueChange={(val: any) => setDialogTab(val)} className="w-full">
              <TabsList className="grid grid-cols-3 w-full h-10 bg-muted/60 p-1 rounded-xl mb-4">
                <TabsTrigger
                  value="item"
                  className="text-xs font-semibold flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Item Details</span>
                </TabsTrigger>
                <TabsTrigger
                  value="stock"
                  className="text-xs font-semibold flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Stock & Pricing</span>
                </TabsTrigger>
                <TabsTrigger
                  value="assignment"
                  className="text-xs font-semibold flex items-center justify-center gap-1.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Location & Notes</span>
                </TabsTrigger>
              </TabsList>

              {/* Tab 1: Item Details */}
              <TabsContent value="item" className="space-y-4 pt-1 outline-none">
                {/* Item Name & SKU */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs font-semibold">Item Name *</Label>
                    <Input
                      placeholder="e.g., Dell OptiPlex Desktop Computers"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="text-xs h-9"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">SKU / Item Code</Label>
                    <Input
                      placeholder="e.g., SKU-1049"
                      value={formSku}
                      onChange={(e) => setFormSku(e.target.value)}
                      className="text-xs h-9 font-mono"
                    />
                  </div>
                </div>

                {/* Category & Physical Condition */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Category *</Label>
                      <button
                        type="button"
                        onClick={() => {
                          setCategoryTab("create");
                          setCategoryDialogOpen(true);
                        }}
                        className="text-[11px] font-bold text-primary hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> New Category
                      </button>
                    </div>
                    <Select value={formCategory} onValueChange={setFormCategory}>
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {distinctCategories.map((cat) => (
                          <SelectItem key={cat} value={cat} className="text-xs">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Physical Condition</Label>
                    <Select value={formCondition} onValueChange={(v: any) => setFormCondition(v)}>
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {INVENTORY_CONDITIONS.map((cond) => (
                          <SelectItem key={cond.id} value={cond.id} className="text-xs">
                            {cond.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setDialogTab("stock")}
                    className="text-xs font-semibold gap-1"
                  >
                    Next: Stock & Pricing →
                  </Button>
                </div>
              </TabsContent>

              {/* Tab 2: Stock & Pricing */}
              <TabsContent value="stock" className="space-y-4 pt-1 outline-none">
                {/* Quantity, Min Threshold, Unit (Dropdown), Unit Price */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Quantity in Stock *</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(e.target.value)}
                      className="text-xs h-9"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Low Alert Min *</Label>
                    <Input
                      type="number"
                      min="0"
                      value={formMinQuantity}
                      onChange={(e) => setFormMinQuantity(e.target.value)}
                      className="text-xs h-9"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Measurement Unit</Label>
                    <Select value={formUnit} onValueChange={setFormUnit}>
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        {INVENTORY_UNITS.map((unit) => (
                          <SelectItem key={unit} value={unit} className="text-xs">
                            {unit}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Unit Cost (₹)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formUnitPrice}
                      onChange={(e) => setFormUnitPrice(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                {/* Stock Status & Supplier Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Stock Availability Status</Label>
                    <Select value={formStatus} onValueChange={(v: any) => setFormStatus(v)}>
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="in_stock" className="text-xs">In Stock (Active)</SelectItem>
                        <SelectItem value="low_stock" className="text-xs">Low Stock (Alert)</SelectItem>
                        <SelectItem value="out_of_stock" className="text-xs">Out of Stock</SelectItem>
                        <SelectItem value="discontinued" className="text-xs">Discontinued</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Vendor Supplier</Label>
                    <Select value={formSupplierId} onValueChange={setFormSupplierId}>
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder="Select Supplier..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        <SelectItem value="none" className="text-xs">-- No Supplier / Direct Purchase --</SelectItem>
                        {suppliers.map((sup) => (
                          <SelectItem key={sup.id} value={String(sup.id)} className="text-xs">
                            {sup.name} {sup.category ? `(${sup.category})` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {formSupplierId === "none" && (
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Custom Supplier / Store Name</Label>
                    <Input
                      placeholder="e.g., Local Electronics Mart, Connaught Place"
                      value={formSupplierName}
                      onChange={(e) => setFormSupplierName(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                )}

                {/* Purchase Bill / Receipt URL */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Purchase Bill / Invoice Document URL</Label>
                  <Input
                    placeholder="https://... or uploaded bill receipt link"
                    value={formBillUrl}
                    onChange={(e) => setFormBillUrl(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="flex justify-between items-center pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDialogTab("item")}
                    className="text-xs"
                  >
                    ← Back
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setDialogTab("assignment")}
                    className="text-xs font-semibold gap-1"
                  >
                    Next: Location & Notes →
                  </Button>
                </div>
              </TabsContent>

              {/* Tab 3: Location & Custodian Notes */}
              <TabsContent value="assignment" className="space-y-4 pt-1 outline-none">
                {/* Storage Location & Assigned To (Employee Dropdown) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Storage Location / Shelf</Label>
                    <Input
                      placeholder="e.g., Computer Lab 2, Cabinet B"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs font-semibold">Assigned To (Employee / Custodian)</Label>
                    <Select
                      value={formAssignedToUserId}
                      onValueChange={(val) => {
                        setFormAssignedToUserId(val);
                        const matched = employees.find((emp) => String(emp.id) === val);
                        setFormAssignedToName(matched ? matched.name : "");
                      }}
                    >
                      <SelectTrigger className="text-xs h-9">
                        <SelectValue placeholder="Select Employee..." />
                      </SelectTrigger>
                      <SelectContent className="max-h-56">
                        <SelectItem value="none" className="text-xs">-- Unassigned / Central Storage --</SelectItem>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={String(emp.id)} className="text-xs">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium">{emp.name}</span>
                              <span className="text-[10px] text-muted-foreground">({emp.role || "Staff"})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Specifications / Asset Notes</Label>
                  <Textarea
                    placeholder="Serial numbers, warranty dates, or maintenance guidelines..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={3}
                    className="text-xs resize-none"
                  />
                </div>

                <div className="flex justify-start pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setDialogTab("stock")}
                    className="text-xs"
                  >
                    ← Back
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {/* Form Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
                className="h-9 px-4 text-xs font-semibold"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="h-9 px-4 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {editingItem ? "Update Item" : "Save Item"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
