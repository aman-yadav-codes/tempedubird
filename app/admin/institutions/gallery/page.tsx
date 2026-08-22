"use client";

import { useEffect, useState, useMemo } from "react";
import Image from "next/image";
import {
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit2,
  FolderPlus,
  Building2,
  Layers,
  Search,
  RefreshCw,
  Loader2,
  Maximize2,
  X,
  Sparkles,
  Tag,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import {
  DocumentFileUpload,
  type UploadedDocumentFile,
} from "@/components/shared/document-file-upload";

type GalleryCategory = {
  id: number;
  institution_id?: number | null;
  name: string;
  slug: string;
  description?: string | null;
  sort_order: number;
  image_count?: number;
};

type GalleryImageItem = {
  id: number;
  institution_id: number;
  institution_name: string;
  url: string;
  title: string;
  description?: string;
  sort_order: number;
  category_id?: number | null;
  category_name: string;
  media_type: string;
  created_at: string;
};

type InstitutionOption = {
  id: number;
  name: string;
  slug: string;
};

export default function AdminGalleryManagementPage() {
  const { user, accessToken } = useAuthStore();
  const { activeInstitutionId } = useActiveInstitution();

  const [images, setImages] = useState<GalleryImageItem[]>([]);
  const [categories, setCategories] = useState<GalleryCategory[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInstFilter, setSelectedInstFilter] = useState("all");
  const [selectedCatFilter, setSelectedCatFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Dialogs
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Form states for Upload
  const [formInstId, setFormInstId] = useState<number>(1);
  const [formCategoryId, setFormCategoryId] = useState<string>("default");
  const [newCatName, setNewCatName] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSortOrder, setFormSortOrder] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedDocumentFile[]>([]);
  const [directImageUrl, setDirectImageUrl] = useState("");
  const [saving, setSaving] = useState(false);

  // Form states for Category Management
  const [catNameInput, setCatNameInput] = useState("");
  const [catDescInput, setCatDescInput] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);

  // Editing state
  const [editingItem, setEditingItem] = useState<GalleryImageItem | null>(null);

  const isPlatformAdmin = Boolean(
    user?.role_codes?.includes("super_admin") ||
    user?.role_codes?.includes("platform_admin")
  );

  const userInstitutionId = activeInstitutionId || (user?.memberships?.[0]?.institution_id
    ? Number(user.memberships[0].institution_id)
    : null);

  useEffect(() => {
    fetchInstitutions();
  }, []);

  useEffect(() => {
    if (!isPlatformAdmin && userInstitutionId && selectedInstFilter === "all") {
      setSelectedInstFilter(String(userInstitutionId));
      setFormInstId(userInstitutionId);
    }
  }, [isPlatformAdmin, userInstitutionId]);

  useEffect(() => {
    fetchGalleryData();
    fetchCategories();
  }, [selectedInstFilter, selectedCatFilter]);

  const fetchInstitutions = async () => {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch("/api/admin/institutions/options", { headers });
      if (res.ok) {
        const json = await res.json();
        setInstitutions(json.institutions || []);
        if (json.institutions?.length > 0 && !formInstId) {
          setFormInstId(json.institutions[0].id);
        }
      }
    } catch (err) {
      console.error("Error fetching institutions:", err);
    }
  };

  const fetchCategories = async () => {
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const instParam = selectedInstFilter !== "all" ? selectedInstFilter : (userInstitutionId ? String(userInstitutionId) : "");
      const url = instParam ? `/api/admin/institutions/gallery/categories?institutionId=${instParam}` : "/api/admin/institutions/gallery/categories";
      const res = await fetch(url, { headers });
      if (res.ok) {
        const json = await res.json();
        setCategories(json.data || []);
      }
    } catch (err) {
      console.error("Error loading categories:", err);
    }
  };

  const fetchGalleryData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedInstFilter !== "all") {
        params.set("institutionId", selectedInstFilter);
      } else if (!isPlatformAdmin && userInstitutionId) {
        params.set("institutionId", String(userInstitutionId));
      }

      if (selectedCatFilter !== "all") {
        params.set("categoryId", selectedCatFilter);
      }

      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/institutions/gallery?${params.toString()}`, { headers });
      if (res.ok) {
        const json = await res.json();
        setImages(json.data || []);
      } else {
        toast.error("Failed to load gallery items");
      }
    } catch (err) {
      toast.error("Error loading gallery media");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenUpload = () => {
    const instId = selectedInstFilter !== "all"
      ? Number(selectedInstFilter)
      : (userInstitutionId || institutions[0]?.id || 1);

    setFormInstId(instId);
    setFormCategoryId(categories[0]?.id ? String(categories[0].id) : "default");
    setNewCatName("");
    setFormTitle("");
    setFormDescription("");
    setFormSortOrder(0);
    setUploadedFiles([]);
    setDirectImageUrl("");
    setUploadDialogOpen(true);
  };

  const handleSaveGallery = async () => {
    const urlsToSave: string[] = [];
    if (uploadedFiles.length > 0) {
      uploadedFiles.forEach((f) => {
        if (f.url) urlsToSave.push(f.url);
      });
    }
    if (directImageUrl.trim()) {
      urlsToSave.push(directImageUrl.trim());
    }

    if (urlsToSave.length === 0) {
      return toast.error("Please upload at least one image or enter an image URL");
    }

    if (!formInstId) {
      return toast.error("Please select an institution");
    }

    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const isCreatingNewCat = formCategoryId === "new" && newCatName.trim();
      const targetCategoryId = (!isCreatingNewCat && formCategoryId !== "default" && Number(formCategoryId) > 0)
        ? Number(formCategoryId)
        : null;

      const payload = {
        institution_id: formInstId,
        category_id: targetCategoryId,
        category_name: isCreatingNewCat ? newCatName.trim() : undefined,
        title: formTitle.trim() || "Campus Photo",
        description: formDescription.trim(),
        sort_order: Number(formSortOrder || 0),
        images: urlsToSave.map((url, idx) => ({
          url,
          title: formTitle.trim() ? (urlsToSave.length > 1 ? `${formTitle.trim()} ${idx + 1}` : formTitle.trim()) : "Campus Photo",
          description: formDescription.trim(),
          category_id: targetCategoryId,
          sort_order: Number(formSortOrder || 0) + idx,
        })),
      };

      const res = await fetch("/api/admin/institutions/gallery", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (res.ok) {
        toast.success(json.message || "Gallery images added successfully!");
        setUploadDialogOpen(false);
        fetchGalleryData();
        fetchCategories();
      } else {
        toast.error(json.error || "Failed to save gallery images");
      }
    } catch (err) {
      toast.error("Error saving gallery items");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!catNameInput.trim()) {
      return toast.error("Please enter a category name");
    }

    const instId = selectedInstFilter !== "all"
      ? Number(selectedInstFilter)
      : (userInstitutionId || institutions[0]?.id || 1);

    setCreatingCat(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/institutions/gallery/categories", {
        method: "POST",
        headers,
        body: JSON.stringify({
          institution_id: instId,
          name: catNameInput.trim(),
          description: catDescInput.trim(),
        }),
      });

      const json = await res.json();
      if (res.ok) {
        toast.success("Category created successfully!");
        setCatNameInput("");
        setCatDescInput("");
        fetchCategories();
      } else {
        toast.error(json.error || "Failed to create category");
      }
    } catch (err) {
      toast.error("Error creating category");
    } finally {
      setCreatingCat(false);
    }
  };

  const handleDeleteCategory = async (catId: number) => {
    if (catId < 0) {
      return toast.error("Default system categories cannot be deleted");
    }
    if (!confirm("Are you sure you want to delete this category? Photos will remain but be unassigned.")) return;

    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/institutions/gallery/categories?id=${catId}`, {
        method: "DELETE",
        headers,
      });

      if (res.ok) {
        toast.success("Category deleted");
        fetchCategories();
        fetchGalleryData();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to delete category");
      }
    } catch (err) {
      toast.error("Error deleting category");
    }
  };

  const handleDeleteImage = async (imageId: number) => {
    if (!confirm("Are you sure you want to delete this gallery photo?")) return;

    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/institutions/gallery?id=${imageId}`, {
        method: "DELETE",
        headers,
      });

      if (res.ok) {
        toast.success("Photo removed from gallery");
        setImages((prev) => prev.filter((item) => item.id !== imageId));
      } else {
        toast.error("Failed to delete photo");
      }
    } catch (err) {
      toast.error("Error deleting photo");
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem) return;
    setSaving(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/institutions/gallery", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          id: editingItem.id,
          title: editingItem.title,
          description: editingItem.description,
          category_id: editingItem.category_id,
          sort_order: editingItem.sort_order,
        }),
      });

      if (res.ok) {
        toast.success("Gallery item updated");
        setEditDialogOpen(false);
        fetchGalleryData();
      } else {
        toast.error("Failed to update item");
      }
    } catch (err) {
      toast.error("Error updating item");
    } finally {
      setSaving(false);
    }
  };

  const filteredImages = useMemo(() => {
    return images.filter((img) => {
      const matchesSearch =
        !search.trim() ||
        img.title?.toLowerCase().includes(search.toLowerCase()) ||
        img.description?.toLowerCase().includes(search.toLowerCase()) ||
        img.category_name?.toLowerCase().includes(search.toLowerCase());
      return matchesSearch;
    });
  }, [images, search]);

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
            <ImageIcon className="h-3.5 w-3.5" />
            <span>Campus Media Hub</span>
          </div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Campus Photo Gallery & Media
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Organize campus photographs by categories like Laboratories, Architecture, Library, Classrooms, and Events.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => setCategoryDialogOpen(true)}
            variant="outline"
            size="sm"
            className="font-bold gap-2 text-xs h-9"
          >
            <FolderPlus className="h-4 w-4 text-primary" />
            <span>Manage Categories</span>
          </Button>

          <Button
            onClick={handleOpenUpload}
            size="sm"
            className="font-bold gap-2 text-xs h-9 bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            <span>Add Gallery Images</span>
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          {/* Institution Filter (For multi-institution access) */}
          {(isPlatformAdmin || institutions.length > 1) && (
            <div className="w-64">
              <Select value={selectedInstFilter} onValueChange={setSelectedInstFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All Institutions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Institutions</SelectItem>
                  {institutions.map((inst) => (
                    <SelectItem key={inst.id} value={String(inst.id)}>
                      {inst.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search gallery photos..."
              className="pl-9 h-9 text-xs bg-background/60"
            />
          </div>
        </div>

        <Button onClick={fetchGalleryData} variant="ghost" size="sm" className="gap-2 text-xs h-9">
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setSelectedCatFilter("all")}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap ${
            selectedCatFilter === "all"
              ? "bg-[#800000] text-white shadow-md"
              : "bg-card text-foreground hover:bg-muted border border-border"
          }`}
        >
          All Photos ({images.length})
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCatFilter === String(cat.id);
          const count = images.filter((img) => img.category_id === cat.id || img.category_name === cat.name).length;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCatFilter(String(cat.id))}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer select-none whitespace-nowrap flex items-center gap-1.5 ${
                isSelected
                  ? "bg-[#800000] text-white shadow-md"
                  : "bg-card text-foreground hover:bg-muted border border-border"
              }`}
            >
              <span>{cat.name}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Images Grid */}
      {loading ? (
        <div className="py-24 text-center flex flex-col items-center justify-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-sm font-medium">Loading campus gallery media...</span>
        </div>
      ) : filteredImages.length === 0 ? (
        <Card className="p-16 text-center text-muted-foreground space-y-4">
          <ImageIcon className="h-12 w-12 mx-auto opacity-30 text-primary" />
          <div className="space-y-1">
            <h3 className="font-bold text-lg text-foreground">No Gallery Images Found</h3>
            <p className="text-xs max-w-md mx-auto">
              Start adding high-resolution images categorized by campus zones, labs, hostels, or events to enhance your institution landing page.
            </p>
          </div>
          <Button onClick={handleOpenUpload} className="font-bold text-xs bg-primary text-primary-foreground px-6 mt-2">
            <Plus className="h-4 w-4 mr-1.5" />
            Upload First Photo
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredImages.map((img, idx) => (
            <Card
              key={img.id}
              className="group overflow-hidden border border-border bg-card shadow-xs hover:border-primary/50 transition-all flex flex-col justify-between"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
                <Image
                  src={img.url}
                  alt={img.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300 cursor-pointer"
                  onClick={() => setLightboxIndex(idx)}
                />
                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 backdrop-blur-md rounded-lg p-1">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-white hover:text-primary hover:bg-white/20"
                    onClick={() => {
                      setEditingItem(img);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-white hover:text-destructive hover:bg-white/20"
                    onClick={() => handleDeleteImage(img.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                <div className="absolute bottom-2 left-2">
                  <Badge variant="secondary" className="text-[10px] font-bold bg-black/70 text-white backdrop-blur-sm border-0">
                    {img.category_name || "Campus"}
                  </Badge>
                </div>
              </div>

              <div className="p-3.5 space-y-1.5">
                <h4 className="font-bold text-sm text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {img.title}
                </h4>
                {img.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                    {img.description}
                  </p>
                )}
                {img.institution_name && (
                  <p className="text-[10px] text-muted-foreground font-semibold truncate pt-1 flex items-center gap-1">
                    <Building2 className="h-3 w-3 text-primary shrink-0" />
                    {img.institution_name}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Gallery Images Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <ImageIcon className="h-5 w-5 text-primary" />
              Add Images to Campus Gallery
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Upload photographs and assign them to specific gallery categories.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Institution Selector */}
            {(isPlatformAdmin || institutions.length > 1) && (
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Target Institution *</Label>
                <Select value={String(formInstId)} onValueChange={(v) => setFormInstId(Number(v))}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select Institution" />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((inst) => (
                      <SelectItem key={inst.id} value={String(inst.id)}>
                        {inst.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category Selector / Inline Creator */}
            <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-3.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-primary" />
                  Gallery Category *
                </Label>
                <span className="text-[11px] text-muted-foreground">
                  Select existing or type a new category
                </span>
              </div>

              <Select value={formCategoryId} onValueChange={setFormCategoryId}>
                <SelectTrigger className="text-xs bg-background">
                  <SelectValue placeholder="Choose Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="new" className="font-bold text-primary">
                    + Create New Custom Category...
                  </SelectItem>
                </SelectContent>
              </Select>

              {formCategoryId === "new" && (
                <div className="pt-2">
                  <Input
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="e.g. Robotics Center, Annual Sports 2026, Smart Labs"
                    className="text-xs bg-background"
                    autoFocus
                  />
                </div>
              )}
            </div>

            {/* Image Upload Component */}
            <div className="space-y-2">
              <Label className="text-xs font-bold">Upload Photos (Dropzone or Browse) *</Label>
              <DocumentFileUpload
                accessToken={accessToken}
                files={uploadedFiles}
                onFilesChange={setUploadedFiles}
                maxFiles={10}
                maxSize={10 * 1024 * 1024}
                buttonLabel="Choose Image Files"
                emptyText="Drop multiple images here or click to browse (up to 10 files)"
              />
            </div>

            {/* Or Direct Image URL */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs font-bold">Or Enter Direct Image URL</Label>
              <Input
                value={directImageUrl}
                onChange={(e) => setDirectImageUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="text-xs bg-background/50"
              />
            </div>

            {/* Title & Caption */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Photo Title / Caption</Label>
                <Input
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Main Administrative Block"
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Display Order</Label>
                <Input
                  type="number"
                  value={formSortOrder}
                  onChange={(e) => setFormSortOrder(Number(e.target.value))}
                  placeholder="0"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Description (Optional)</Label>
              <Textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Brief description about the infrastructure or facility shown..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)} disabled={saving} size="sm">
              Cancel
            </Button>
            <Button onClick={handleSaveGallery} disabled={saving} size="sm" className="bg-primary text-primary-foreground font-bold">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Saving...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5" /> Save to Gallery
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Categories Dialog */}
      <Dialog open={categoryDialogOpen} onOpenChange={setCategoryDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FolderPlus className="h-5 w-5 text-primary" />
              Manage Gallery Categories
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Create custom category albums to organize campus photos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Create Category Form */}
            <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <Plus className="h-3.5 w-3.5 text-primary" />
                Add New Gallery Category
              </h4>
              <div className="space-y-2">
                <Input
                  value={catNameInput}
                  onChange={(e) => setCatNameInput(e.target.value)}
                  placeholder="Category Name (e.g. Cultural Auditorium, Sports Complex)"
                  className="text-xs bg-background"
                />
                <Input
                  value={catDescInput}
                  onChange={(e) => setCatDescInput(e.target.value)}
                  placeholder="Short Description (optional)"
                  className="text-xs bg-background"
                />
              </div>
              <Button
                onClick={handleCreateCategory}
                disabled={creatingCat || !catNameInput.trim()}
                size="sm"
                className="w-full font-bold text-xs bg-primary text-primary-foreground"
              >
                {creatingCat ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Plus className="h-4 w-4 mr-1.5" />}
                Create Category
              </Button>
            </div>

            {/* List of Existing Categories */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Existing Categories ({categories.length})
              </Label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border bg-card text-xs"
                  >
                    <div className="space-y-0.5 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground truncate">{cat.name}</span>
                        {cat.id < 0 && (
                          <Badge variant="outline" className="text-[9px] font-semibold">
                            Standard
                          </Badge>
                        )}
                      </div>
                      {cat.description && (
                        <p className="text-[11px] text-muted-foreground truncate">{cat.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] text-muted-foreground font-semibold">
                        {cat.image_count ?? 0} photos
                      </span>
                      {cat.id > 0 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setCategoryDialogOpen(false)} size="sm" className="font-bold text-xs">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Image Details Dialog */}
      {editingItem && (
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-primary" />
                Edit Gallery Photo Details
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-2">
              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-muted">
                <Image src={editingItem.url} alt={editingItem.title} fill className="object-cover" />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Photo Title</Label>
                <Input
                  value={editingItem.title}
                  onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Category</Label>
                <Select
                  value={editingItem.category_id ? String(editingItem.category_id) : "default"}
                  onValueChange={(v) =>
                    setEditingItem({
                      ...editingItem,
                      category_id: v === "default" ? null : Number(v),
                    })
                  }
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Select category" />
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

              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Description</Label>
                <Textarea
                  value={editingItem.description || ""}
                  onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateItem} size="sm" disabled={saving} className="font-bold text-xs bg-primary text-primary-foreground">
                {saving ? "Saving..." : "Update Details"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Lightbox Preview */}
      {lightboxIndex !== null && filteredImages[lightboxIndex] && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4"
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            className="absolute top-5 right-5 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer transition-colors z-10"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="max-w-4xl max-h-[85vh] flex flex-col items-center text-center space-y-4">
            <div className="relative h-[65vh] w-[80vw] max-w-4xl">
              <Image
                src={filteredImages[lightboxIndex].url}
                alt={filteredImages[lightboxIndex].title}
                fill
                sizes="100vw"
                className="object-contain rounded-xl"
              />
            </div>
            <div className="text-white space-y-1 max-w-2xl px-4">
              <h3 className="text-lg font-bold">{filteredImages[lightboxIndex].title}</h3>
              <p className="text-xs text-slate-300">{filteredImages[lightboxIndex].description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
