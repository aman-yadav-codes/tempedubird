"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import {
  UtensilsCrossed,
  Plus,
  Search,
  IndianRupee,
  RefreshCw,
  Tag,
  Check,
  X,
  Edit2,
  Trash2,
  Clock,
  Flame,
  Leaf,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Eye,
  Filter,
  ShieldCheck,
  Layers,
  ChefHat,
  Coffee,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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

export type DishRecord = {
  id: number;
  title: string;
  slug?: string;
  category: string;
  diet_type: string;
  price: number | string;
  sale_price?: number | string | null;
  preparation_time?: string;
  portion_size?: string;
  spice_level?: string;
  calories?: string;
  dietary_tags?: string[];
  ingredients?: string;
  image_url?: string;
  description?: string;
  status: string;
  is_featured: boolean;
  created_at?: string;
};

const DISH_CATEGORIES = [
  "Starters & Appetizers",
  "Main Course",
  "Breads & Rice",
  "Desserts & Sweets",
  "Beverages & Mocktails",
  "Fast Food & Snacks",
  "Breakfast Specials",
  "Chef's Specials",
];

const DIET_TYPES = [
  { value: "veg", label: "Vegetarian 🟢" },
  { value: "non_veg", label: "Non-Vegetarian 🔴" },
  { value: "vegan", label: "Vegan 🌿" },
  { value: "egg", label: "Egg 🟡" },
];

const SPICE_LEVELS = ["Mild", "Medium", "Spicy", "Extra Hot"];

export default function MarketingDishesPage({ isMasterCatalog = false }: { isMasterCatalog?: boolean } = {}) {
  const { user } = useAuthStore();
  const [dishes, setDishes] = useState<DishRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, available: 0, veg: 0, non_veg: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dietFilter, setDietFilter] = useState("all");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<DishRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    category: "Main Course",
    diet_type: "veg",
    price: "",
    sale_price: "",
    preparation_time: "15-20 mins",
    portion_size: "Serves 1-2",
    spice_level: "Medium",
    calories: "",
    dietary_tags: ["Chef Recommendation"] as string[],
    ingredients: "",
    image_url: "",
    description: "",
    status: "available",
    is_featured: false,
  });

  const [tagInput, setTagInput] = useState("");

  const fetchDishes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (dietFilter !== "all") params.set("diet_type", dietFilter);

      const res = await fetch(`/api/admin/marketing/dishes?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load dishes");
      const data = await res.json();
      setDishes(data.dishes || []);
      setStats(data.stats || { total: 0, available: 0, veg: 0, non_veg: 0 });
    } catch (err: any) {
      toast.error(err?.message || "Failed to load dishes");
    } finally {
      setLoading(false);
    }
  }, [search, categoryFilter, dietFilter]);

  useEffect(() => {
    fetchDishes();
  }, [fetchDishes]);

  const handleOpenAdd = () => {
    setEditingDish(null);
    setFormData({
      title: "",
      category: "Main Course",
      diet_type: "veg",
      price: "",
      sale_price: "",
      preparation_time: "15-20 mins",
      portion_size: "Serves 1-2",
      spice_level: "Medium",
      calories: "",
      dietary_tags: ["Chef Recommendation"],
      ingredients: "",
      image_url: "",
      description: "",
      status: "available",
      is_featured: false,
    });
    setDialogOpen(true);
  };

  const handleOpenEdit = (d: DishRecord) => {
    setEditingDish(d);
    setFormData({
      title: d.title || "",
      category: d.category || "Main Course",
      diet_type: d.diet_type || "veg",
      price: d.price ? String(d.price) : "",
      sale_price: d.sale_price ? String(d.sale_price) : "",
      preparation_time: d.preparation_time || "15-20 mins",
      portion_size: d.portion_size || "Serves 1-2",
      spice_level: d.spice_level || "Medium",
      calories: d.calories || "",
      dietary_tags: Array.isArray(d.dietary_tags) ? d.dietary_tags : [],
      ingredients: d.ingredients || "",
      image_url: d.image_url || "",
      description: d.description || "",
      status: d.status || "available",
      is_featured: Boolean(d.is_featured),
    });
    setDialogOpen(true);
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;
    if (!formData.dietary_tags.includes(tagInput.trim())) {
      setFormData((prev) => ({ ...prev, dietary_tags: [...prev.dietary_tags, tagInput.trim()] }));
    }
    setTagInput("");
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({ ...prev, dietary_tags: prev.dietary_tags.filter((t) => t !== tag) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Please enter a dish name");
      return;
    }
    if (!formData.price) {
      toast.error("Please enter a price");
      return;
    }

    try {
      setSubmitting(true);
      const url = editingDish ? `/api/admin/marketing/dishes/${editingDish.id}` : `/api/admin/marketing/dishes`;
      const method = editingDish ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save dish");
      }

      toast.success(editingDish ? "Dish updated successfully!" : "Dish added to restaurant menu!");
      setDialogOpen(false);
      fetchDishes();
    } catch (err: any) {
      toast.error(err?.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/marketing/dishes/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete dish");
      toast.success("Dish removed successfully");
      setDeleteConfirmId(null);
      fetchDishes();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 text-primary rounded-xl">
              <UtensilsCrossed className="size-6" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              {isMasterCatalog ? "Master Dishes & Menu Catalog" : "Restaurant Dishes & Food Menu"}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {isMasterCatalog
              ? "Platform-wide master dishes, food menu templates, and culinary catalog."
              : "Manage your food catalog, culinary specialties, beverages, appetizers, and dining menus."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={fetchDishes}
            className="rounded-xl h-9 gap-1.5"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          <Button
            type="button"
            onClick={handleOpenAdd}
            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-9 px-4 gap-1.5 shadow-sm"
          >
            <Plus className="size-4" />
            <span>{isMasterCatalog ? "Add Master Dish" : "Add Dish / Item"}</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Items</p>
              <p className="text-2xl font-black text-foreground mt-1">{stats.total}</p>
            </div>
            <div className="size-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <ChefHat className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Available</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{stats.available}</p>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vegetarian</p>
              <p className="text-2xl font-black text-emerald-600 mt-1">{stats.veg}</p>
            </div>
            <div className="size-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Leaf className="size-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-xs">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Non-Veg</p>
              <p className="text-2xl font-black text-rose-600 mt-1">{stats.non_veg}</p>
            </div>
            <div className="size-10 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center">
              <Flame className="size-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-card p-3 rounded-2xl border shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="size-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by dish name, ingredients, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 rounded-xl bg-background"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px] h-10 rounded-xl bg-background">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {DISH_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={dietFilter} onValueChange={setDietFilter}>
            <SelectTrigger className="w-[150px] h-10 rounded-xl bg-background">
              <SelectValue placeholder="Diet Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Diet Types</SelectItem>
              {DIET_TYPES.map((d) => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dishes Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : dishes.length === 0 ? (
        <div className="p-12 text-center border-2 border-dashed rounded-3xl bg-card space-y-3">
          <div className="size-14 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
            <UtensilsCrossed className="size-7" />
          </div>
          <h3 className="text-lg font-bold text-foreground">No Dishes Listed Yet</h3>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Add starters, main courses, snacks, and desserts to present your appetizing digital menu.
          </p>
          <Button onClick={handleOpenAdd} className="mt-2 rounded-xl">
            <Plus className="size-4 mr-1.5" />
            Add First Dish
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dishes.map((d) => (
            <Card key={d.id} className="rounded-2xl border shadow-xs overflow-hidden group hover:border-primary/50 transition-all flex flex-col justify-between">
              <div>
                <div className="relative w-full h-48 bg-muted overflow-hidden">
                  {d.image_url ? (
                    <Image
                      src={d.image_url}
                      alt={d.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 400px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted/60 text-muted-foreground">
                      <UtensilsCrossed className="size-12 opacity-40" />
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span
                      className={`size-3.5 rounded-full border-2 border-white shadow-xs ${
                        d.diet_type === "veg"
                          ? "bg-emerald-500"
                          : d.diet_type === "vegan"
                          ? "bg-teal-500"
                          : "bg-rose-500"
                      }`}
                      title={d.diet_type.toUpperCase()}
                    />
                    <Badge variant="secondary" className="bg-background/90 backdrop-blur-md text-foreground font-bold shadow-xs">
                      {d.category}
                    </Badge>
                  </div>

                  <div className="absolute top-3 right-3">
                    <Badge
                      className={
                        d.status === "available"
                          ? "bg-emerald-600 text-white"
                          : "bg-amber-600 text-white"
                      }
                    >
                      {d.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-5 space-y-3">
                  <div>
                    <h3 className="text-lg font-black text-foreground mt-0.5 group-hover:text-primary transition-colors line-clamp-1">
                      {d.title}
                    </h3>
                    {d.ingredients && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                        {d.ingredients}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 py-2 border-y text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="size-3.5 text-primary" />
                      <span>{d.preparation_time || "15 mins"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Flame className="size-3.5 text-primary" />
                      <span>{d.spice_level || "Medium"} Spice</span>
                    </div>
                  </div>

                  {/* Price */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-black text-foreground">
                        ₹{Number(d.price).toLocaleString("en-IN")}
                      </span>
                      {d.sale_price && (
                        <span className="text-xs line-through text-muted-foreground">
                          ₹{Number(d.sale_price).toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>

                    {d.portion_size && (
                      <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        {d.portion_size}
                      </span>
                    )}
                  </div>
                </CardContent>
              </div>

              <div className="px-5 pb-5 pt-1 flex items-center justify-end gap-2 border-t">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleOpenEdit(d)}
                  className="rounded-xl h-8 px-3 text-xs gap-1"
                >
                  <Edit2 className="size-3.5" />
                  <span>Edit</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteConfirmId(d.id)}
                  className="rounded-xl h-8 px-2.5 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black">
              {editingDish ? "Edit Dish Details" : "Add Dish to Menu"}
            </DialogTitle>
            <DialogDescription>
              Specify food name, pricing, portion size, dietary classifications, and spices.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="title">Dish / Item Name *</Label>
                <Input
                  id="title"
                  placeholder="e.g. Paneer Butter Masala Handi Special"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category">Menu Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger id="category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DISH_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="diet_type">Dietary Type</Label>
                <Select
                  value={formData.diet_type}
                  onValueChange={(val) => setFormData({ ...formData, diet_type: val })}
                >
                  <SelectTrigger id="diet_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIET_TYPES.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price">Price (₹) *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="e.g. 280"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="sale_price">Original / Strikethrough Price (₹)</Label>
                <Input
                  id="sale_price"
                  type="number"
                  placeholder="e.g. 320"
                  value={formData.sale_price}
                  onChange={(e) => setFormData({ ...formData, sale_price: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="preparation_time">Preparation Time</Label>
                <Input
                  id="preparation_time"
                  placeholder="e.g. 15-20 mins"
                  value={formData.preparation_time}
                  onChange={(e) => setFormData({ ...formData, preparation_time: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="portion_size">Portion Size</Label>
                <Input
                  id="portion_size"
                  placeholder="e.g. Serves 1-2, Full Plate, 500ml"
                  value={formData.portion_size}
                  onChange={(e) => setFormData({ ...formData, portion_size: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="spice_level">Spice Level</Label>
                <Select
                  value={formData.spice_level}
                  onValueChange={(val) => setFormData({ ...formData, spice_level: val })}
                >
                  <SelectTrigger id="spice_level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPICE_LEVELS.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="calories">Calories (kcal)</Label>
                <Input
                  id="calories"
                  placeholder="e.g. 340 kcal"
                  value={formData.calories}
                  onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="image_url">Dish Photo URL</Label>
                <Input
                  id="image_url"
                  placeholder="https://..."
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>

              {/* Dietary Tags */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Dietary Badges & Highlights</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add tag (e.g. Jain Available, Gluten-Free, Halal)..."
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                  />
                  <Button type="button" onClick={handleAddTag} variant="secondary">
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {formData.dietary_tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="gap-1 pl-2.5 pr-1.5 py-1 text-xs">
                      <span>{tag}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        className="size-4 hover:bg-muted rounded-full inline-flex items-center justify-center"
                      >
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="ingredients">Key Ingredients</Label>
                <Input
                  id="ingredients"
                  placeholder="e.g. Fresh cottage cheese, rich cashew-tomato gravy, aromatic butter..."
                  value={formData.ingredients}
                  onChange={(e) => setFormData({ ...formData, ingredients: e.target.value })}
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="description">Overview & Serving Notes</Label>
                <Textarea
                  id="description"
                  rows={2}
                  placeholder="Appetizing description, serving recommendations..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="flex items-center gap-3 sm:col-span-2 pt-1">
                <Switch
                  id="is_featured"
                  checked={formData.is_featured}
                  onCheckedChange={(val) => setFormData({ ...formData, is_featured: val })}
                />
                <Label htmlFor="is_featured" className="cursor-pointer font-bold">
                  Mark as Chef's Special / Featured Dish
                </Label>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "Saving..." : editingDish ? "Save Changes" : "Add Dish"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmId !== null} onOpenChange={(open) => !open && setDeleteConfirmId(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete Dish</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this dish from the menu? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
