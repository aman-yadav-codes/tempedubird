"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Package,
  Briefcase,
  Clock,
  MapPin,
  Calendar,
  MessageSquare,
  Star,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Phone,
  Mail,
  Globe,
  Share2,
  Eye,
  Camera,
  Image as ImageIcon,
  Upload,
  X,
  Layers,
  Save,
  Send,
  AlertCircle,
  BarChart3,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ImageUploadInput } from "@/components/shared/image-upload-input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function BusinessOwnerWorkspace() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessProfiles, setBusinessProfiles] = useState<any[]>([]);
  const [selectedBusiness, setSelectedBusiness] = useState<any | null>(null);

  // Tabs data
  const [products, setProducts] = useState<any[]>([]);
  const [masterProducts, setMasterProducts] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [masterServices, setMasterServices] = useState<any[]>([]);
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  // Dialogs
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [branchModalOpen, setBranchModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<number, string>>({});

  const [uploadingCustomProductImage, setUploadingCustomProductImage] = useState(false);
  const [uploadingProductGallery, setUploadingProductGallery] = useState(false);

  // Forms
  const [productCatalogSearch, setProductCatalogSearch] = useState("");
  const [newAttrKey, setNewAttrKey] = useState("");
  const [newAttrVal, setNewAttrVal] = useState("");
  const [productForm, setProductForm] = useState({
    masterProductId: "",
    customName: "",
    customDescription: "",
    customImageUrl: "",
    additionalImages: [] as string[],
    mainCategoryName: "",
    subcategoryName: "",
    price: "",
    currency: "INR",
    inventoryCount: "10",
    sku: "",
    isAvailable: true,
    attributes: {} as Record<string, string>,
  });

  const [serviceForm, setServiceForm] = useState({
    masterServiceId: "",
    customTitle: "",
    customDescription: "",
    price: "",
    durationMinutes: "60",
    isActive: true,
  });

  const [branchForm, setBranchForm] = useState({
    name: "",
    address: "",
    city: "",
    phone: "",
    email: "",
    managerName: "",
  });

  // Fetch Business Data
  const loadBusiness = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/business/profile");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load business profile");

      const list = data.data || [];
      setBusinessProfiles(list);
      if (list.length > 0 && !selectedBusiness) {
        setSelectedBusiness(list[0]);
      } else if (selectedBusiness) {
        const updated = list.find((b: any) => b.id === selectedBusiness.id) || list[0];
        setSelectedBusiness(updated);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load business");
    } finally {
      setLoading(false);
    }
  }, [selectedBusiness]);

  // Load Categories
  useEffect(() => {
    fetch("/api/admin/categories?type=business")
      .then((res) => res.json())
      .then((data) => {
        if (data.categories) setCategories(data.categories);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadBusiness();
  }, [loadBusiness]);

  // Load Sub-modules when business changes
  const loadBusinessDetails = useCallback(async (bId: number) => {
    try {
      // Products
      const pRes = await fetch(`/api/business/products?businessId=${bId}`);
      if (pRes.ok) {
        const pData = await pRes.json();
        setProducts(pData.products || []);
        setMasterProducts(pData.masterCatalog || []);
      }

      // Services
      const sRes = await fetch(`/api/business/services?businessId=${bId}`);
      if (sRes.ok) {
        const sData = await sRes.json();
        setServices(sData.services || []);
        setMasterServices(sData.masterCatalog || []);
      }

      // Enquiries
      const eRes = await fetch(`/api/business/enquiries?businessId=${bId}`);
      if (eRes.ok) {
        const eData = await eRes.json();
        setEnquiries(eData.enquiries || []);
      }

      // Reviews
      const rRes = await fetch(`/api/business/reviews?businessId=${bId}`);
      if (rRes.ok) {
        const rData = await rRes.json();
        setReviews(rData.reviews || []);
      }
    } catch (err) {
      console.error("Error loading business sub-modules", err);
    }
  }, []);

  useEffect(() => {
    if (selectedBusiness?.id) {
      loadBusinessDetails(selectedBusiness.id);
    }
  }, [selectedBusiness?.id, loadBusinessDetails]);

  // Save General Business Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness) return;
    try {
      setSaving(true);
      const res = await fetch("/api/business/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedBusiness),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update business profile");
      toast.success("Business profile updated successfully");
      loadBusiness();
    } catch (err: any) {
      toast.error(err.message || "Failed to save business profile");
    } finally {
      setSaving(false);
    }
  };

  // Image upload handlers for business products
  const handleUploadProductCustomImage = async (file: File) => {
    if (!file) return;
    setUploadingCustomProductImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "business/products");

      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload image");

      const url = data.data?.url || data.url;
      if (url) {
        setProductForm((prev) => ({ ...prev, customImageUrl: url }));
        toast.success("Custom product photo uploaded");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload custom photo");
    } finally {
      setUploadingCustomProductImage(false);
    }
  };

  const handleUploadProductGallery = async (files: FileList) => {
    if (!files || files.length === 0) return;
    setUploadingProductGallery(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", "business/products/gallery");
        const res = await fetch("/api/admin/uploads/image", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        return data.data?.url || data.url;
      });

      const urls = await Promise.all(uploadPromises);
      const validUrls = urls.filter(Boolean);
      if (validUrls.length > 0) {
        setProductForm((prev) => ({
          ...prev,
          additionalImages: [...(prev.additionalImages || []), ...validUrls],
        }));
        toast.success(`${validUrls.length} photo(s) added to gallery`);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to upload gallery photos");
    } finally {
      setUploadingProductGallery(false);
    }
  };

  // Save Product
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness?.id) return;
    try {
      const isUS = (selectedBusiness?.country_code || "").toUpperCase() === "US";
      const payload = {
        id: editingProduct?.id || null,
        businessId: selectedBusiness.id,
        masterProductId: productForm.masterProductId === "custom" ? null : (productForm.masterProductId ? Number(productForm.masterProductId) : null),
        customName: productForm.customName,
        customDescription: productForm.customDescription,
        customImageUrl: productForm.customImageUrl || null,
        additionalImages: productForm.additionalImages || [],
        price: Number(productForm.price),
        currency: productForm.currency || (isUS ? "USD" : "INR"),
        inventoryCount: Number(productForm.inventoryCount),
        sku: productForm.sku,
        isAvailable: productForm.isAvailable,
        attributes: productForm.attributes || {},
      };

      const res = await fetch("/api/business/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save product");

      toast.success(editingProduct ? "Product updated" : "Product added to inventory");
      setProductModalOpen(false);
      setEditingProduct(null);
      loadBusinessDetails(selectedBusiness.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    }
  };

  // Delete Product
  const handleDeleteProduct = async (pId: number) => {
    if (!confirm("Are you sure you want to remove this product?")) return;
    try {
      const res = await fetch(`/api/business/products?id=${pId}&businessId=${selectedBusiness.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete product");
      toast.success("Product removed");
      loadBusinessDetails(selectedBusiness.id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Save Service
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBusiness?.id) return;
    try {
      const payload = {
        id: editingService?.id || null,
        businessId: selectedBusiness.id,
        masterServiceId: serviceForm.masterServiceId || null,
        customTitle: serviceForm.customTitle,
        customDescription: serviceForm.customDescription,
        price: Number(serviceForm.price),
        durationMinutes: Number(serviceForm.durationMinutes),
        isActive: serviceForm.isActive,
      };

      const res = await fetch("/api/business/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save service");

      toast.success(editingService ? "Service updated" : "Service added");
      setServiceModalOpen(false);
      setEditingService(null);
      loadBusinessDetails(selectedBusiness.id);
    } catch (err: any) {
      toast.error(err.message || "Failed to save service");
    }
  };

  // Delete Service
  const handleDeleteService = async (sId: number) => {
    if (!confirm("Are you sure you want to remove this service?")) return;
    try {
      const res = await fetch(`/api/business/services?id=${sId}&businessId=${selectedBusiness.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete service");
      toast.success("Service removed");
      loadBusinessDetails(selectedBusiness.id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Update Enquiry Status
  const handleUpdateEnquiryStatus = async (eId: number, status: string) => {
    try {
      const res = await fetch("/api/business/enquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: eId, status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Enquiry marked as ${status}`);
      loadBusinessDetails(selectedBusiness.id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Submit Review Reply
  const handleReplyReview = async (reviewId: number) => {
    const text = replyTextMap[reviewId]?.trim();
    if (!text) {
      toast.error("Please enter a reply message");
      return;
    }
    try {
      const res = await fetch("/api/business/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId, reply: text }),
      });
      if (!res.ok) throw new Error("Failed to post reply");
      toast.success("Reply published successfully");
      setReplyTextMap((prev) => ({ ...prev, [reviewId]: "" }));
      loadBusinessDetails(selectedBusiness.id);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Add Branch
  const handleAddBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name.trim()) return;
    const branches = Array.isArray(selectedBusiness.branches) ? [...selectedBusiness.branches] : [];
    branches.push({ ...branchForm, id: Date.now() });
    setSelectedBusiness({ ...selectedBusiness, branches });
    setBranchModalOpen(false);
    setBranchForm({ name: "", address: "", city: "", phone: "", email: "", managerName: "" });
    toast.success("Branch added to draft. Click Save Changes to save.");
  };

  // Remove Branch
  const handleRemoveBranch = (index: number) => {
    const branches = Array.isArray(selectedBusiness.branches) ? [...selectedBusiness.branches] : [];
    branches.splice(index, 1);
    setSelectedBusiness({ ...selectedBusiness, branches });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!selectedBusiness) {
    return (
      <Card className="p-8 text-center">
        <Building2 className="size-12 mx-auto text-muted-foreground/40 mb-3" />
        <h3 className="text-lg font-bold">No Business Profile Found</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">
          You haven&apos;t created a business profile yet. Add your business to start listing products and services.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Business Header & Selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">{selectedBusiness.name}</h2>
            {selectedBusiness.is_verified && (
              <Badge className="bg-emerald-600 text-white gap-1">
                <CheckCircle2 className="size-3" /> Verified
              </Badge>
            )}
            <Badge variant="outline" className="capitalize">
              {selectedBusiness.business_type || "Business"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedBusiness.city ? `${selectedBusiness.city}, ` : ""}{selectedBusiness.country_code || "India"} • {products.length} Products • {services.length} Services • {enquiries.length} Enquiries
          </p>
        </div>

        <div className="flex items-center gap-2">
          {businessProfiles.length > 1 && (
            <Select
              value={String(selectedBusiness.id)}
              onValueChange={(val) => {
                const found = businessProfiles.find((b) => String(b.id) === val);
                if (found) setSelectedBusiness(found);
              }}
            >
              <SelectTrigger className="h-9 w-44 text-xs">
                <SelectValue placeholder="Switch Business" />
              </SelectTrigger>
              <SelectContent>
                {businessProfiles.map((b) => (
                  <SelectItem key={b.id} value={String(b.id)}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(selectedBusiness.slug ? `/institutes/${selectedBusiness.slug}` : `/institutes/${selectedBusiness.id}`, "_blank")}
          >
            <ExternalLink className="size-3.5 mr-1.5" />
            View Profile Page
          </Button>

          <Button size="sm" onClick={handleSaveProfile} disabled={saving} className="bg-primary text-white">
            {saving ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : <Save className="size-3.5 mr-1.5" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="profile" className="text-xs gap-1.5">
            <Building2 className="size-3.5" /> Profile & Contact
          </TabsTrigger>
          <TabsTrigger value="media" className="text-xs gap-1.5">
            <ImageIcon className="size-3.5" /> Logos & Gallery
          </TabsTrigger>
          <TabsTrigger value="hours-branches" className="text-xs gap-1.5">
            <Clock className="size-3.5" /> Hours & Branches
          </TabsTrigger>
          <TabsTrigger value="products" className="text-xs gap-1.5">
            <Package className="size-3.5" /> Products ({products.length})
          </TabsTrigger>
          <TabsTrigger value="services" className="text-xs gap-1.5">
            <Briefcase className="size-3.5" /> Services ({services.length})
          </TabsTrigger>
          <TabsTrigger value="enquiries" className="text-xs gap-1.5">
            <MessageSquare className="size-3.5" /> Enquiries ({enquiries.length})
          </TabsTrigger>
          <TabsTrigger value="reviews" className="text-xs gap-1.5">
            <Star className="size-3.5" /> Reviews ({reviews.length})
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs gap-1.5">
            <BarChart3 className="size-3.5" /> Analytics
          </TabsTrigger>
        </TabsList>

        {/* ================= TAB 1: PROFILE & CONTACT ================= */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Business Information</CardTitle>
              <CardDescription className="text-xs">
                Manage your primary business identity, category classification, and contact details.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Business Name *</Label>
                  <Input
                    required
                    value={selectedBusiness.name || ""}
                    onChange={(e) => setSelectedBusiness({ ...selectedBusiness, name: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Business Type</Label>
                  <Input
                    placeholder="e.g. Retail Store, Clinic, IT Services"
                    value={selectedBusiness.business_type || ""}
                    onChange={(e) => setSelectedBusiness({ ...selectedBusiness, business_type: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Established Year</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 2018"
                    value={selectedBusiness.established_year || ""}
                    onChange={(e) => setSelectedBusiness({ ...selectedBusiness, established_year: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Primary Category</Label>
                  <Select
                    value={selectedBusiness.category_id ? String(selectedBusiness.category_id) : ""}
                    onValueChange={(val) => setSelectedBusiness({ ...selectedBusiness, category_id: Number(val) })}
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue placeholder="Select Business Category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold">Country</Label>
                  <Select
                    value={selectedBusiness.country_code || "IN"}
                    onValueChange={(val) => setSelectedBusiness({ ...selectedBusiness, country_code: val })}
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN">India (+91)</SelectItem>
                      <SelectItem value="US">United States (+1)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Business Description</Label>
                <Textarea
                  placeholder="Tell customers about your business, background, mission, and specialities..."
                  value={selectedBusiness.custom_description || selectedBusiness.about || ""}
                  onChange={(e) => setSelectedBusiness({ ...selectedBusiness, custom_description: e.target.value })}
                  rows={4}
                  className="mt-1 text-xs"
                />
              </div>

              {/* Contact Information */}
              <div className="border-t pt-4 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Contact & Social Links</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <Phone className="size-3 text-emerald-600" /> Phone
                    </Label>
                    <Input
                      placeholder="+91 9876543210"
                      value={selectedBusiness.phone || ""}
                      onChange={(e) => setSelectedBusiness({ ...selectedBusiness, phone: e.target.value })}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <MessageSquare className="size-3 text-emerald-600" /> WhatsApp
                    </Label>
                    <Input
                      placeholder="+91 9876543210"
                      value={selectedBusiness.whatsapp || ""}
                      onChange={(e) => setSelectedBusiness({ ...selectedBusiness, whatsapp: e.target.value })}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <Mail className="size-3 text-blue-600" /> Email
                    </Label>
                    <Input
                      type="email"
                      placeholder="info@business.com"
                      value={selectedBusiness.email || ""}
                      onChange={(e) => setSelectedBusiness({ ...selectedBusiness, email: e.target.value })}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <Globe className="size-3 text-indigo-600" /> Website
                    </Label>
                    <Input
                      placeholder="https://example.com"
                      value={selectedBusiness.website || ""}
                      onChange={(e) => setSelectedBusiness({ ...selectedBusiness, website: e.target.value })}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs font-semibold">City</Label>
                    <Input
                      placeholder="e.g. Mumbai, New York"
                      value={selectedBusiness.city || ""}
                      onChange={(e) => setSelectedBusiness({ ...selectedBusiness, city: e.target.value })}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">State / Region</Label>
                    <Input
                      placeholder="e.g. Maharashtra, NY"
                      value={selectedBusiness.state || ""}
                      onChange={(e) => setSelectedBusiness({ ...selectedBusiness, state: e.target.value })}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">Locality / Area</Label>
                    <Input
                      placeholder="e.g. Andheri West"
                      value={selectedBusiness.locality || ""}
                      onChange={(e) => setSelectedBusiness({ ...selectedBusiness, locality: e.target.value })}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-semibold">PIN / ZIP Code</Label>
                    <Input
                      placeholder="e.g. 400053"
                      value={selectedBusiness.postal_code || ""}
                      onChange={(e) => setSelectedBusiness({ ...selectedBusiness, postal_code: e.target.value })}
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Full Address</Label>
                  <Input
                    placeholder="Shop/Office number, street, landmark..."
                    value={selectedBusiness.address || ""}
                    onChange={(e) => setSelectedBusiness({ ...selectedBusiness, address: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 2: LOGOS & GALLERY ================= */}
        <TabsContent value="media" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Logos, Cover & Gallery Images</CardTitle>
              <CardDescription className="text-xs">
                Upload your brand logo, profile cover header, and store/office gallery images.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="border rounded-lg p-3 space-y-2">
                  <ImageUploadInput
                    label="Logo Image"
                    value={selectedBusiness.logo_url || ""}
                    onChange={(url) => setSelectedBusiness({ ...selectedBusiness, logo_url: url })}
                    folder="business/logos"
                  />
                </div>

                <div className="border rounded-lg p-3 space-y-2">
                  <ImageUploadInput
                    label="Cover / Banner Image"
                    value={selectedBusiness.banner_url || ""}
                    onChange={(url) => setSelectedBusiness({ ...selectedBusiness, banner_url: url })}
                    folder="business/banners"
                  />
                </div>
              </div>

              {/* Gallery Images */}
              <div className="border rounded-lg p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Gallery Images</h4>
                    <p className="text-xs text-muted-foreground">Showcase your products, office, workspace, and happy customers.</p>
                  </div>
                  <label className="cursor-pointer inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-xs font-semibold border border-border bg-background hover:bg-muted text-foreground transition-colors shadow-2xs">
                    <Upload className="size-3 mr-1 text-primary" />
                    <span>Upload Gallery Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const toastId = toast.loading("Uploading gallery image...");
                        try {
                          const formData = new FormData();
                          formData.append("file", file);
                          formData.append("folder", "business/gallery");
                          const res = await fetch("/api/admin/uploads/image", { method: "POST", body: formData });
                          const data = await res.json();
                          if (!res.ok) throw new Error(data.error || "Upload failed");
                          const url = data.data?.url || data.url;
                          const current = Array.isArray(selectedBusiness.gallery_images) ? [...selectedBusiness.gallery_images] : [];
                          current.push(url);
                          setSelectedBusiness({ ...selectedBusiness, gallery_images: current });
                          toast.success("Gallery photo added!", { id: toastId });
                        } catch (err: any) {
                          toast.error(err.message || "Failed to upload photo", { id: toastId });
                        }
                      }}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                  {Array.isArray(selectedBusiness.gallery_images) && selectedBusiness.gallery_images.length > 0 ? (
                    selectedBusiness.gallery_images.map((img: string, i: number) => (
                      <div key={i} className="relative group rounded border overflow-hidden aspect-square bg-muted">
                        <img src={img} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            const current = [...selectedBusiness.gallery_images];
                            current.splice(i, 1);
                            setSelectedBusiness({ ...selectedBusiness, gallery_images: current });
                          }}
                          className="absolute top-1 right-1 size-6 rounded-full bg-rose-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      </div>
                    ))
                  ) : (
                    <p className="col-span-full text-xs text-muted-foreground py-4 text-center">
                      No gallery images uploaded yet. Click <strong>Upload Gallery Photo</strong> above.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 3: HOURS & BRANCHES ================= */}
        <TabsContent value="hours-branches" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Opening Hours */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Weekly Opening Hours</CardTitle>
                <CardDescription className="text-xs">Configure opening and closing times per day.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {DAYS_OF_WEEK.map((day) => {
                  const hours = (selectedBusiness.opening_hours && typeof selectedBusiness.opening_hours === "object") ? selectedBusiness.opening_hours[day] || {} : {};
                  return (
                    <div key={day} className="flex items-center justify-between text-xs py-1 border-b last:border-0">
                      <span className="w-24 font-medium">{day}</span>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={!hours.isClosed}
                          onChange={(e) => {
                            const newHours = { ...(selectedBusiness.opening_hours || {}) };
                            newHours[day] = { ...(newHours[day] || {}), isClosed: !e.target.checked };
                            setSelectedBusiness({ ...selectedBusiness, opening_hours: newHours });
                          }}
                          className="size-3.5"
                        />
                        <span>Open</span>
                        {!hours.isClosed ? (
                          <>
                            <Input
                              type="time"
                              value={hours.open || "09:00"}
                              onChange={(e) => {
                                const newHours = { ...(selectedBusiness.opening_hours || {}) };
                                newHours[day] = { ...(newHours[day] || {}), open: e.target.value };
                                setSelectedBusiness({ ...selectedBusiness, opening_hours: newHours });
                              }}
                              className="h-7 w-24 text-xs"
                            />
                            <span>to</span>
                            <Input
                              type="time"
                              value={hours.close || "19:00"}
                              onChange={(e) => {
                                const newHours = { ...(selectedBusiness.opening_hours || {}) };
                                newHours[day] = { ...(newHours[day] || {}), close: e.target.value };
                                setSelectedBusiness({ ...selectedBusiness, opening_hours: newHours });
                              }}
                              className="h-7 w-24 text-xs"
                            />
                          </>
                        ) : (
                          <span className="text-rose-600 font-semibold px-2">Closed</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Multiple Branches */}
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">Multiple Branches</CardTitle>
                  <CardDescription className="text-xs">Manage multiple locations and branches.</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => setBranchModalOpen(true)} className="h-7 text-xs">
                  <Plus className="size-3 mr-1" /> Add Branch
                </Button>
              </CardHeader>
              <CardContent className="space-y-2">
                {Array.isArray(selectedBusiness.branches) && selectedBusiness.branches.length > 0 ? (
                  selectedBusiness.branches.map((br: any, i: number) => (
                    <div key={i} className="border rounded p-3 text-xs flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-foreground">{br.name}</h4>
                        <p className="text-muted-foreground">{br.address} {br.city ? `• ${br.city}` : ""}</p>
                        {br.phone && <p className="text-muted-foreground">Phone: {br.phone}</p>}
                        {br.managerName && <p className="text-muted-foreground">Manager: {br.managerName}</p>}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-7 text-destructive"
                        onClick={() => handleRemoveBranch(i)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground py-6 text-center">
                    No branches configured. Click <strong>+ Add Branch</strong> above to add additional locations.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================= TAB 4: PRODUCTS ================= */}
        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Business Products ({products.length})</CardTitle>
                <CardDescription className="text-xs">
                  Pick from master product catalog or customize selling prices, inventory stock, and availability.
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs font-semibold"
                onClick={() => {
                  setEditingProduct(null);
                  setProductCatalogSearch("");
                  setNewAttrKey("");
                  setNewAttrVal("");
                  const isUS = (selectedBusiness?.country_code || "").toUpperCase() === "US";
                  setProductForm({
                    masterProductId: "",
                    customName: "",
                    customDescription: "",
                    customImageUrl: "",
                    additionalImages: [],
                    mainCategoryName: "",
                    subcategoryName: "",
                    price: "",
                    currency: isUS ? "USD" : "INR",
                    inventoryCount: "10",
                    sku: "",
                    isAvailable: true,
                    attributes: {},
                  });
                  setProductModalOpen(true);
                }}
              >
                <Plus className="size-3.5 mr-1" /> Add Product
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/30 font-semibold uppercase text-muted-foreground">
                      <th className="p-2">Item</th>
                      <th className="p-2">Category</th>
                      <th className="p-2 text-right">Selling Price</th>
                      <th className="p-2 text-center">Inventory</th>
                      <th className="p-2 text-center">Status</th>
                      <th className="p-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {products.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No products listed yet. Click <strong>+ Add Product</strong> to select from master catalog.
                        </td>
                      </tr>
                    ) : (
                      products.map((p) => {
                        const effectiveAttrs = p.effective_attributes || p.attributes || p.master_attributes || {};
                        const attrCount = typeof effectiveAttrs === "object" && effectiveAttrs !== null ? Object.keys(effectiveAttrs).length : 0;
                        return (
                          <tr key={p.id} className="hover:bg-muted/20">
                            <td className="p-2 flex items-center gap-2.5">
                              <img
                                src={p.custom_image_url || p.master_image_url || "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=100"}
                                alt={p.custom_name || p.master_name || "Product"}
                                className="size-10 rounded-lg object-cover border shrink-0"
                              />
                              <div>
                                <div className="font-semibold text-foreground">{p.custom_name || p.master_title || p.master_name}</div>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  {p.custom_image_url ? (
                                    <Badge variant="secondary" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200 py-0 px-1">
                                      Custom Image
                                    </Badge>
                                  ) : p.master_image_url ? (
                                    <Badge variant="outline" className="text-[9px] text-emerald-700 bg-emerald-50 border-emerald-200 py-0 px-1">
                                      Admin Default Image
                                    </Badge>
                                  ) : null}
                                  {p.sku && <span className="text-[10px] text-muted-foreground font-mono">SKU: {p.sku}</span>}
                                  {attrCount > 0 && (
                                    <Badge variant="outline" className="text-[9px] text-muted-foreground py-0 px-1">
                                      {attrCount} attrs
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="p-2 text-muted-foreground">
                              <div className="font-medium text-foreground">{p.main_category_name || p.category_name || "General"}</div>
                              {p.subcategory_name && (
                                <div className="text-[10px] text-muted-foreground">{p.subcategory_name}</div>
                              )}
                            </td>
                            <td className="p-2 text-right font-bold text-foreground">
                              {p.currency === "USD" ? `$${p.price}` : `₹${p.price}`}
                            </td>
                            <td className="p-2 text-center">
                              <Badge variant="outline" className={p.inventory_count > 0 ? "border-emerald-500 text-emerald-700" : "border-rose-500 text-rose-700"}>
                                {p.inventory_count} in stock
                              </Badge>
                            </td>
                            <td className="p-2 text-center">
                              <Badge variant={p.is_available ? "default" : "secondary"}>
                                {p.is_available ? "Available" : "Unavailable"}
                              </Badge>
                            </td>
                            <td className="p-2 text-right space-x-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7"
                                title="Edit Product"
                                onClick={() => {
                                  setEditingProduct(p);
                                  setProductCatalogSearch("");
                                  setNewAttrKey("");
                                  setNewAttrVal("");
                                  const isUS = (p.currency || selectedBusiness?.country_code || "").toUpperCase() === "US";
                                  const existingAttrs: Record<string, string> = {};
                                  const rawAttrs = p.effective_attributes || p.attributes || p.master_attributes;
                                  if (rawAttrs && typeof rawAttrs === "object") {
                                    for (const [k, v] of Object.entries(rawAttrs)) {
                                      existingAttrs[k] = typeof v === "string" ? v : JSON.stringify(v);
                                    }
                                  }
                                  setProductForm({
                                    masterProductId: String(p.master_product_id || ""),
                                    customName: p.custom_name || p.master_title || p.master_name || "",
                                    customDescription: p.custom_description || p.effective_description || "",
                                    customImageUrl: p.custom_image_url || "",
                                    additionalImages: Array.isArray(p.additional_images) ? p.additional_images : [],
                                    mainCategoryName: p.main_category_name || p.category_name || "General",
                                    subcategoryName: p.subcategory_name || "",
                                    price: String(p.price || ""),
                                    currency: p.currency || (isUS ? "USD" : "INR"),
                                    inventoryCount: String(p.inventory_count || "0"),
                                    sku: p.sku || "",
                                    isAvailable: p.is_available !== false,
                                    attributes: existingAttrs,
                                  });
                                  setProductModalOpen(true);
                                }}
                              >
                                <Edit2 className="size-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-destructive"
                                title="Remove Product"
                                onClick={() => handleDeleteProduct(p.id)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 5: SERVICES ================= */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Business Services ({services.length})</CardTitle>
                <CardDescription className="text-xs">
                  Pick from master service catalog or customize service descriptions, prices, and duration.
                </CardDescription>
              </div>
              <Button
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white h-8 text-xs"
                onClick={() => {
                  setEditingService(null);
                  setServiceForm({
                    masterServiceId: "",
                    customTitle: "",
                    customDescription: "",
                    price: "",
                    durationMinutes: "60",
                    isActive: true,
                  });
                  setServiceModalOpen(true);
                }}
              >
                <Plus className="size-3.5 mr-1" /> Add Service
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/30 font-semibold uppercase text-muted-foreground">
                      <th className="p-2">Service Title</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">Duration</th>
                      <th className="p-2 text-right">Price</th>
                      <th className="p-2 text-center">Availability</th>
                      <th className="p-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {services.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          No services offered yet. Click <strong>+ Add Service</strong> to pick from master services.
                        </td>
                      </tr>
                    ) : (
                      services.map((s) => (
                        <tr key={s.id} className="hover:bg-muted/20">
                          <td className="p-2 font-medium text-foreground">
                            {s.custom_title || s.master_title}
                            {s.custom_description && <p className="text-[10px] text-muted-foreground">{s.custom_description}</p>}
                          </td>
                          <td className="p-2 text-muted-foreground">{s.category_name || "General"}</td>
                          <td className="p-2 text-muted-foreground">{s.duration_minutes || 60} mins</td>
                          <td className="p-2 text-right font-bold text-foreground">
                            {s.currency === "USD" ? `$${s.price}` : `₹${s.price}`}
                          </td>
                          <td className="p-2 text-center">
                            <Badge variant={s.is_active ? "default" : "secondary"}>
                              {s.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                          <td className="p-2 text-right space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7"
                              onClick={() => {
                                setEditingService(s);
                                setServiceForm({
                                  masterServiceId: String(s.master_service_id || ""),
                                  customTitle: s.custom_title || "",
                                  customDescription: s.custom_description || "",
                                  price: String(s.price || ""),
                                  durationMinutes: String(s.duration_minutes || "60"),
                                  isActive: s.is_active,
                                });
                                setServiceModalOpen(true);
                              }}
                            >
                              <Edit2 className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive"
                              onClick={() => handleDeleteService(s.id)}
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 6: ENQUIRIES ================= */}
        <TabsContent value="enquiries" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer Enquiries & Booking Requests</CardTitle>
              <CardDescription className="text-xs">
                Inquiries received directly from customers discovering your business listing.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {enquiries.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">No customer enquiries received yet.</p>
              ) : (
                enquiries.map((enq) => (
                  <div key={enq.id} className="border rounded-lg p-3 text-xs space-y-2 bg-muted/10">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-sm text-foreground">{enq.customer_name}</span>
                        <div className="flex items-center gap-3 text-muted-foreground text-[11px] mt-0.5">
                          {enq.customer_phone && <span className="flex items-center gap-1"><Phone className="size-3" /> {enq.customer_phone}</span>}
                          {enq.customer_email && <span className="flex items-center gap-1"><Mail className="size-3" /> {enq.customer_email}</span>}
                        </div>
                      </div>
                      <Select
                        value={enq.status || "new"}
                        onValueChange={(val) => handleUpdateEnquiryStatus(enq.id, val)}
                      >
                        <SelectTrigger className="h-7 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="new">New</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="responded">Responded</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <p className="bg-background rounded p-2 text-foreground border">{enq.message}</p>

                    <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1">
                      <span>Received: {new Date(enq.created_at).toLocaleString()}</span>
                      {enq.customer_phone && (
                        <div className="flex gap-2">
                          <a
                            href={`https://wa.me/${enq.customer_phone.replace(/[^0-9]/g, "")}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:underline flex items-center gap-1"
                          >
                            <MessageSquare className="size-3" /> WhatsApp Customer
                          </a>
                          <a
                            href={`tel:${enq.customer_phone}`}
                            className="text-primary hover:underline flex items-center gap-1"
                          >
                            <Phone className="size-3" /> Call
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 7: REVIEWS ================= */}
        <TabsContent value="reviews" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Customer Reviews & Moderation</CardTitle>
              <CardDescription className="text-xs">
                Manage ratings and publish official business owner responses to customer feedback.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-xs text-muted-foreground py-8 text-center">No reviews submitted yet.</p>
              ) : (
                reviews.map((rev) => (
                  <div key={rev.id} className="border rounded-lg p-3 text-xs space-y-2 bg-muted/10">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-foreground">{rev.author_name}</span>
                        <div className="flex text-amber-500">
                          {Array.from({ length: 5 }).map((_, idx) => (
                            <Star
                              key={idx}
                              className={`size-3.5 ${idx < rev.rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
                            />
                          ))}
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(rev.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    {rev.title && <h5 className="font-semibold text-foreground">{rev.title}</h5>}
                    <p className="text-muted-foreground">{rev.comment}</p>

                    {/* Owner Reply */}
                    {rev.reply ? (
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded p-2 text-xs">
                        <span className="font-semibold text-emerald-800 dark:text-emerald-300">Your Response:</span>
                        <p className="mt-0.5 text-foreground">{rev.reply}</p>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 pt-2">
                        <Input
                          placeholder="Write a response to this customer review..."
                          value={replyTextMap[rev.id] || ""}
                          onChange={(e) => setReplyTextMap({ ...replyTextMap, [rev.id]: e.target.value })}
                          className="h-8 text-xs flex-1"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleReplyReview(rev.id)}
                          className="h-8 text-xs bg-primary text-white"
                        >
                          <Send className="size-3 mr-1" /> Reply
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= TAB 8: ANALYTICS ================= */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <span className="text-xs uppercase text-muted-foreground font-semibold">Active Products</span>
                <h3 className="text-2xl font-bold text-foreground mt-1">{products.length}</h3>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs uppercase text-muted-foreground font-semibold">Active Services</span>
                <h3 className="text-2xl font-bold text-foreground mt-1">{services.length}</h3>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs uppercase text-muted-foreground font-semibold">Customer Inquiries</span>
                <h3 className="text-2xl font-bold text-foreground mt-1">{enquiries.length}</h3>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <span className="text-xs uppercase text-muted-foreground font-semibold">Average Rating</span>
                <h3 className="text-2xl font-bold text-amber-500 mt-1">{selectedBusiness.avg_rating || "5.0"} ★</h3>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ================= ADD/EDIT PRODUCT MODAL ================= */}
      <Dialog open={productModalOpen} onOpenChange={setProductModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Package className="size-5 text-emerald-600" />
              <span>{editingProduct ? "Edit Business Product" : "Add Product from Master Catalog"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select a master product or configure custom selling prices, imagery, inventory, and description.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="space-y-3.5 text-xs">
            {(() => {
              const isUS = (selectedBusiness?.country_code || "").toUpperCase() === "US";
              const currencySymbol = isUS ? "$" : "₹";
              const selectedMp = masterProducts.find((p) => String(p.id) === String(productForm.masterProductId));
              const effectiveDefaultImage = selectedMp?.default_image_url || null;
              const isCustomImageActive = Boolean(productForm.customImageUrl);
              const displayImage = productForm.customImageUrl || effectiveDefaultImage || "https://placehold.co/120x120/f1f5f9/64748b?text=Product";

              const filteredCatalog = masterProducts.filter((mp) => {
                if (!productCatalogSearch.trim()) return true;
                const q = productCatalogSearch.toLowerCase();
                return (
                  (mp.name && mp.name.toLowerCase().includes(q)) ||
                  (mp.title && mp.title.toLowerCase().includes(q)) ||
                  (mp.brand && mp.brand.toLowerCase().includes(q)) ||
                  (mp.model && mp.model.toLowerCase().includes(q)) ||
                  (mp.sku && mp.sku.toLowerCase().includes(q)) ||
                  (mp.category_name && mp.category_name.toLowerCase().includes(q)) ||
                  (mp.main_category_name && mp.main_category_name.toLowerCase().includes(q)) ||
                  (mp.subcategory_name && mp.subcategory_name.toLowerCase().includes(q))
                );
              });

              const handleSelectMasterProduct = (val: string) => {
                if (val === "custom") {
                  setProductForm((prev) => ({
                    ...prev,
                    masterProductId: "custom",
                    customName: "",
                    customDescription: "",
                    customImageUrl: "",
                    additionalImages: [],
                    mainCategoryName: "",
                    subcategoryName: "",
                    price: "",
                    currency: isUS ? "USD" : "INR",
                    attributes: {},
                  }));
                  return;
                }

                const mp = masterProducts.find((p) => String(p.id) === val);
                if (mp) {
                  const countrySuggestedPrice = isUS
                    ? (mp.suggested_price_usd || mp.suggested_price || "")
                    : (mp.suggested_price_inr || mp.suggested_price || "");

                  const extractedAttrs: Record<string, string> = {};
                  if (mp.attributes && typeof mp.attributes === "object") {
                    for (const [k, v] of Object.entries(mp.attributes)) {
                      extractedAttrs[k] = typeof v === "string" ? v : JSON.stringify(v);
                    }
                  }

                  setProductForm((prev) => ({
                    ...prev,
                    masterProductId: val,
                    customName: mp.name || mp.title || "",
                    customDescription: mp.description || "",
                    customImageUrl: "", // automatically falls back to mp.default_image_url
                    additionalImages: Array.isArray(mp.additional_images) ? [...mp.additional_images] : [],
                    mainCategoryName: mp.main_category_name || mp.category_name || "General",
                    subcategoryName: mp.subcategory_name || "",
                    price: String(countrySuggestedPrice || ""),
                    currency: isUS ? "USD" : "INR",
                    sku: mp.sku || "",
                    attributes: extractedAttrs,
                  }));
                }
              };

              return (
                <>
                  {/* MASTER CATALOG SEARCH & SELECTION */}
                  {!editingProduct && (
                    <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Package className="size-3.5 text-emerald-600" /> Search & Select from Master Catalog
                        </Label>
                        <span className="text-[11px] text-muted-foreground">{filteredCatalog.length} products available</span>
                      </div>
                      
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                        <Input
                          placeholder="Search master catalog by name, brand, model, SKU, or category..."
                          value={productCatalogSearch}
                          onChange={(e) => setProductCatalogSearch(e.target.value)}
                          className="h-8 pl-8 text-xs bg-background"
                        />
                      </div>

                      <Select
                        value={productForm.masterProductId}
                        onValueChange={handleSelectMasterProduct}
                      >
                        <SelectTrigger className="mt-1 h-9 text-xs bg-background">
                          <SelectValue placeholder="Choose product to populate details..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-64">
                          <SelectItem value="custom">+ Custom Product (Not in catalog)</SelectItem>
                          {filteredCatalog.map((mp) => {
                            const suggested = isUS
                              ? (mp.suggested_price_usd ? `$${mp.suggested_price_usd}` : `$${mp.suggested_price || 0}`)
                              : (mp.suggested_price_inr ? `₹${mp.suggested_price_inr}` : `₹${mp.suggested_price || 0}`);
                            return (
                              <SelectItem key={mp.id} value={String(mp.id)}>
                                {mp.name || mp.title} {mp.brand ? `(${mp.brand})` : ""} - {suggested}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* AUTO-POPULATED MAIN CATEGORY & SUBCATEGORY */}
                  {(productForm.mainCategoryName || selectedMp) && (
                    <div className="flex flex-wrap items-center gap-2 p-2.5 bg-muted/40 rounded-xl border text-xs">
                      <span className="font-semibold text-muted-foreground">Category:</span>
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-medium">
                        {productForm.mainCategoryName || selectedMp?.main_category_name || selectedMp?.category_name || "General"}
                      </Badge>
                      {(productForm.subcategoryName || selectedMp?.subcategory_name) && (
                        <>
                          <span className="text-muted-foreground">›</span>
                          <Badge variant="outline" className="bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-200">
                            {productForm.subcategoryName || selectedMp?.subcategory_name}
                          </Badge>
                        </>
                      )}
                      {selectedMp?.brand && (
                        <span className="text-[11px] text-muted-foreground ml-auto">
                          Brand: <strong>{selectedMp.brand}</strong> {selectedMp.model ? `• ${selectedMp.model}` : ""}
                        </span>
                      )}
                    </div>
                  )}

                  {/* PRODUCT IMAGERY WITH ADMIN DEFAULT FALLBACK & CUSTOM UPLOADER */}
                  <div className="p-3 border rounded-xl bg-muted/20 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <ImageIcon className="size-3.5 text-emerald-600" /> Product Image
                      </Label>
                      {isCustomImageActive ? (
                        <Badge className="bg-purple-600/10 text-purple-700 border-purple-500/20 text-[10px] gap-1">
                          <CheckCircle2 className="size-3" /> Custom Image Active
                        </Badge>
                      ) : effectiveDefaultImage ? (
                        <Badge className="bg-emerald-600/10 text-emerald-700 border-emerald-500/20 text-[10px] gap-1">
                          <CheckCircle2 className="size-3" /> Admin Default Image Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-muted-foreground text-[10px]">
                          No Default Image
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="relative size-20 rounded-lg border overflow-hidden shrink-0 bg-muted shadow-xs">
                        <img
                          src={displayImage}
                          alt="Product preview"
                          className="size-full object-cover"
                          onError={(e) => {
                            (e.target as any).src = "https://placehold.co/100x100/f1f5f9/64748b?text=Product";
                          }}
                        />
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <p className="text-[11px] text-muted-foreground leading-tight">
                          {isCustomImageActive ? (
                            <span className="text-foreground font-medium">Custom photo active for this business listing. If removed, the admin default image will be displayed automatically.</span>
                          ) : effectiveDefaultImage ? (
                            <span><strong>Admin Default Image</strong> is displayed automatically. You can keep this or upload a custom photo below.</span>
                          ) : (
                            <span>No admin default image set. Upload a custom photo for your product.</span>
                          )}
                        </p>

                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs">
                            {uploadingCustomProductImage ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : (
                              <Upload className="size-3" />
                            )}
                            <span>{isCustomImageActive ? "Replace Custom Photo" : "Upload Custom Photo"}</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={uploadingCustomProductImage}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleUploadProductCustomImage(f);
                              }}
                            />
                          </label>

                          {isCustomImageActive && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-6 text-[11px] text-muted-foreground hover:text-foreground"
                              onClick={() => setProductForm({ ...productForm, customImageUrl: "" })}
                            >
                              Revert to Admin Default Image
                            </Button>
                          )}
                        </div>

                        <div className="mt-1">
                          <ImageUploadInput
                            value={productForm.customImageUrl}
                            onChange={(url) => setProductForm({ ...productForm, customImageUrl: url })}
                            folder="products"
                            compact
                          />
                        </div>
                      </div>
                    </div>

                    {/* ADDITIONAL PRODUCT GALLERY IMAGES */}
                    <div className="pt-2 border-t space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-semibold text-foreground text-[11px]">Additional Product Photos (Gallery)</span>
                          <p className="text-[10px] text-muted-foreground">Upload multiple photos to show angles, packaging, or variants.</p>
                        </div>
                        <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border border-border bg-background hover:bg-muted transition-colors">
                          {uploadingProductGallery ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <Plus className="size-3" />
                          )}
                          <span>Add Photos</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            disabled={uploadingProductGallery}
                            onChange={(e) => {
                              if (e.target.files) handleUploadProductGallery(e.target.files);
                            }}
                          />
                        </label>
                      </div>

                      {productForm.additionalImages && productForm.additionalImages.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {productForm.additionalImages.map((imgUrl, idx) => (
                            <div key={idx} className="relative group size-12 rounded-lg border overflow-hidden shrink-0 bg-muted">
                              <img
                                src={imgUrl}
                                alt={`Extra ${idx + 1}`}
                                className="size-full object-cover"
                                onError={(e) => {
                                  (e.target as any).src = "https://placehold.co/60x60/f1f5f9/64748b?text=Img";
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = productForm.additionalImages.filter((_, i) => i !== idx);
                                  setProductForm({ ...productForm, additionalImages: updated });
                                }}
                                className="absolute top-0.5 right-0.5 size-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Remove photo"
                              >
                                <X className="size-2.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* CUSTOMIZABLE PRODUCT NAME */}
                  <div>
                    <Label className="text-xs font-semibold">Custom Product Title *</Label>
                    <Input
                      required
                      value={productForm.customName}
                      onChange={(e) => setProductForm({ ...productForm, customName: e.target.value })}
                      placeholder="e.g. iPhone 15 Pro 250GB"
                      className="mt-1 h-8 text-xs font-medium"
                    />
                  </div>

                  {/* COUNTRY-SPECIFIC SUGGESTED BENCHMARK */}
                  {selectedMp && (
                    <div className="p-2.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 text-[11px] text-blue-900 dark:text-blue-300">
                      <div className="flex items-center justify-between font-semibold">
                        <span>Country Benchmark ({isUS ? "United States / USD" : "India / INR"}):</span>
                        <span className="text-sm font-bold text-blue-800 dark:text-blue-200">
                          {isUS
                            ? `$${Number(selectedMp.suggested_price_usd || selectedMp.suggested_price || 0).toLocaleString()}`
                            : `₹${Number(selectedMp.suggested_price_inr || selectedMp.suggested_price || 0).toLocaleString()}`}
                        </span>
                      </div>
                      <p className="text-[10px] text-blue-700/80 dark:text-blue-400/80 mt-0.5">
                        Pre-populated from admin catalog. Your selling price and inventory stock remain completely independent.
                      </p>
                    </div>
                  )}

                  {/* SELLING PRICE & INVENTORY / QUANTITY */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-semibold">Selling Price ({currencySymbol}) *</Label>
                      <Input
                        type="number"
                        required
                        step="0.01"
                        placeholder={`e.g. ${isUS ? "250" : "20000"}`}
                        value={productForm.price}
                        onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                        className="mt-1 h-8 text-xs font-medium"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold">Inventory / Quantity</Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="e.g. 10"
                        value={productForm.inventoryCount}
                        onChange={(e) => setProductForm({ ...productForm, inventoryCount: e.target.value })}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs font-semibold">SKU / Item Code</Label>
                      <Input
                        placeholder="e.g. PRD-102"
                        value={productForm.sku}
                        onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })}
                        className="mt-1 h-8 text-xs"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-5">
                      <input
                        type="checkbox"
                        id="availCheck"
                        checked={productForm.isAvailable}
                        onChange={(e) => setProductForm({ ...productForm, isAvailable: e.target.checked })}
                        className="size-4"
                      />
                      <label htmlFor="availCheck" className="cursor-pointer font-medium">In Stock & Available</label>
                    </div>
                  </div>

                  {/* CUSTOMIZABLE PRODUCT DESCRIPTION */}
                  <div>
                    <Label className="text-xs font-semibold">Product Description</Label>
                    <Textarea
                      placeholder="Product details, features, warranty, in-box items..."
                      value={productForm.customDescription}
                      onChange={(e) => setProductForm({ ...productForm, customDescription: e.target.value })}
                      rows={2}
                      className="mt-1 text-xs"
                    />
                  </div>

                  {/* PRODUCT ATTRIBUTES (WHERE SUPPORTED) */}
                  <div className="border rounded-xl p-3 bg-muted/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Layers className="size-3.5 text-indigo-600" /> Product Attributes & Specifications
                      </Label>
                      <Badge variant="secondary" className="text-[10px]">
                        {Object.keys(productForm.attributes).length} attribute(s)
                      </Badge>
                    </div>

                    {Object.keys(productForm.attributes).length > 0 ? (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {Object.entries(productForm.attributes).map(([key, val]) => (
                          <div key={key} className="flex items-center gap-2 bg-background p-1.5 rounded-md border text-xs">
                            <span className="font-semibold text-muted-foreground w-28 shrink-0 truncate">{key}:</span>
                            <Input
                              value={val}
                              onChange={(e) => {
                                setProductForm({
                                  ...productForm,
                                  attributes: { ...productForm.attributes, [key]: e.target.value },
                                });
                              }}
                              className="h-7 text-xs flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="size-6 text-destructive shrink-0"
                              title="Remove attribute"
                              onClick={() => {
                                const updated = { ...productForm.attributes };
                                delete updated[key];
                                setProductForm({ ...productForm, attributes: updated });
                              }}
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic">
                        No attributes configured yet. You can add custom specifications below (e.g. Color, Size, Storage, Warranty).
                      </p>
                    )}

                    {/* Add new attribute inline */}
                    <div className="flex items-center gap-2 pt-1 border-t">
                      <Input
                        placeholder="Attribute (e.g. Color, Size)"
                        value={newAttrKey}
                        onChange={(e) => setNewAttrKey(e.target.value)}
                        className="h-7 text-xs flex-1"
                      />
                      <Input
                        placeholder="Value (e.g. Midnight Black)"
                        value={newAttrVal}
                        onChange={(e) => setNewAttrVal(e.target.value)}
                        className="h-7 text-xs flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs shrink-0"
                        onClick={() => {
                          if (!newAttrKey.trim()) {
                            toast.error("Attribute name cannot be empty");
                            return;
                          }
                          setProductForm({
                            ...productForm,
                            attributes: {
                              ...productForm.attributes,
                              [newAttrKey.trim()]: newAttrVal.trim(),
                            },
                          });
                          setNewAttrKey("");
                          setNewAttrVal("");
                        }}
                      >
                        <Plus className="size-3 mr-1" /> Add
                      </Button>
                    </div>
                  </div>
                </>
              );
            })()}

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setProductModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                {editingProduct ? "Update Product" : "Save to Inventory"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= ADD/EDIT SERVICE MODAL ================= */}
      <Dialog open={serviceModalOpen} onOpenChange={setServiceModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingService ? "Edit Service" : "Add Service from Master Catalog"}</DialogTitle>
            <DialogDescription>Customize your service price, description, and duration.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveService} className="space-y-3 text-xs">
            {!editingService && (
              <div>
                <Label className="text-xs font-semibold">Select Master Service</Label>
                <Select
                  value={serviceForm.masterServiceId}
                  onValueChange={(val) => {
                    const ms = masterServices.find((s) => String(s.id) === val);
                    if (ms) {
                      setServiceForm({
                        ...serviceForm,
                        masterServiceId: val,
                        customTitle: ms.title || "",
                        customDescription: ms.description || "",
                        price: String(ms.suggested_price_inr || ""),
                        durationMinutes: String(ms.default_duration_minutes || "60"),
                      });
                    } else {
                      setServiceForm({ ...serviceForm, masterServiceId: val });
                    }
                  }}
                >
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue placeholder="Choose from catalog..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="custom">+ Custom Service (Not in catalog)</SelectItem>
                    {masterServices.map((ms) => (
                      <SelectItem key={ms.id} value={String(ms.id)}>
                        {ms.title} - ₹{ms.suggested_price_inr} ({ms.default_duration_minutes}m)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold">Service Title *</Label>
              <Input
                required
                value={serviceForm.customTitle}
                onChange={(e) => setServiceForm({ ...serviceForm, customTitle: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">Price (₹) *</Label>
                <Input
                  type="number"
                  required
                  step="0.01"
                  value={serviceForm.price}
                  onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Duration (Minutes)</Label>
                <Input
                  type="number"
                  value={serviceForm.durationMinutes}
                  onChange={(e) => setServiceForm({ ...serviceForm, durationMinutes: e.target.value })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold">Description</Label>
              <Textarea
                placeholder="Details of what is included in this service..."
                value={serviceForm.customDescription}
                onChange={(e) => setServiceForm({ ...serviceForm, customDescription: e.target.value })}
                rows={2}
                className="mt-1 text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setServiceModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" className="bg-indigo-600 text-white">
                Save Service
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= ADD BRANCH MODAL ================= */}
      <Dialog open={branchModalOpen} onOpenChange={setBranchModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Business Branch</DialogTitle>
            <DialogDescription>Add an additional office, showroom, or branch location.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddBranch} className="space-y-3 text-xs">
            <div>
              <Label className="text-xs font-semibold">Branch Name *</Label>
              <Input
                required
                placeholder="e.g. Downtown Branch"
                value={branchForm.name}
                onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold">Address *</Label>
              <Input
                required
                placeholder="Branch address..."
                value={branchForm.address}
                onChange={(e) => setBranchForm({ ...branchForm, address: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-semibold">City</Label>
                <Input
                  value={branchForm.city}
                  onChange={(e) => setBranchForm({ ...branchForm, city: e.target.value })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold">Phone</Label>
                <Input
                  value={branchForm.phone}
                  onChange={(e) => setBranchForm({ ...branchForm, phone: e.target.value })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold">Branch Manager Name</Label>
              <Input
                value={branchForm.managerName}
                onChange={(e) => setBranchForm({ ...branchForm, managerName: e.target.value })}
                className="mt-1 h-8 text-xs"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setBranchModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm">Add Branch</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

