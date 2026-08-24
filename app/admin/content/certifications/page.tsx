"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import {
  BadgeCheck,
  Plus,
  Loader2,
  Trash2,
  RefreshCw,
  Search,
  ExternalLink,
  Edit2,
  Eye,
  Globe,
  Upload,
  X,
  ImageIcon,
  ShieldCheck,
  Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { CertificationProvider } from "@/lib/types/certification-provider";

function toSlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function CertificationsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();

  // Table state
  const [items, setItems] = useState<CertificationProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Dialog state (Add / Edit)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CertificationProvider | null>(null);
  const [formName, setFormName] = useState("");
  const [formSlug, setFormSlug] = useState("");
  const [formCode, setFormCode] = useState("");
  const [formWebsite, setFormWebsite] = useState("");
  const [formLogo, setFormLogo] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Logo upload state (WebP, SVG, PNG, JPEG)
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [logoInputMode, setLogoInputMode] = useState<"upload" | "url">("upload");
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (file: File) => {
    if (!accessToken) {
      toast.error("Authentication required");
      return;
    }
    const acceptedTypes = ["image/webp", "image/svg+xml", "image/png", "image/jpeg", "image/jpg", "image/gif", "image/avif"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isAcceptedExt = ["webp", "svg", "png", "jpg", "jpeg", "gif", "avif"].includes(ext || "");
    if (!acceptedTypes.includes(file.type) && !isAcceptedExt) {
      toast.error("Only WebP, SVG, PNG, and JPEG images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be 5MB or smaller.");
      return;
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Image upload failed");
      }
      setFormLogo(json.data.url);
      toast.success("Logo uploaded successfully");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Image upload failed");
    } finally {
      setUploadingLogo(false);
    }
  };

  // View sheet state
  const [viewingItem, setViewingItem] = useState<CertificationProvider | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<CertificationProvider | null>(null);

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchItems = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/admin/certifications?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await res.json();
      if (res.ok) {
        setItems(json.data || []);
        setPageCount(json.pageCount || 0);
        setTotalCount(json.total || 0);
      } else {
        toast.error(json.error || "Failed to load certification providers");
      }
    } catch {
      toast.error("Network error while loading providers");
    } finally {
      setLoading(false);
    }
  }, [accessToken, pagination.pageIndex, pagination.pageSize, debouncedSearch, authHeader]);

  useEffect(() => {
    if (isReady && accessToken) {
      fetchItems();
    }
  }, [isReady, accessToken, fetchItems]);

  const resetForm = () => {
    setEditingItem(null);
    setFormName("");
    setFormSlug("");
    setFormCode("");
    setFormWebsite("");
    setFormLogo("");
    setFormDescription("");
    setLogoInputMode("upload");
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (item: CertificationProvider) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormSlug(item.slug);
    setFormCode(item.code || "");
    setFormWebsite(item.website_url || "");
    setFormLogo(item.logo_url || "");
    setFormDescription(item.description || "");
    setLogoInputMode(item.logo_url ? "upload" : "upload");
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      return toast.error("Provider Name is required");
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formName.trim(),
        slug: formSlug.trim() || toSlug(formName),
        provider_type: "certification",
        code: formCode.trim() || null,
        website_url: formWebsite.trim() || null,
        logo_url: formLogo.trim() || null,
        description: formDescription.trim() || null,
        is_active: true,
      };

      if (editingItem) {
        const res = await fetch(`/api/admin/certifications/${editingItem.id}`, {
          method: "PATCH",
          headers: { ...authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (res.ok) {
          toast.success("Provider updated successfully");
          setDialogOpen(false);
          resetForm();
          await fetchItems();
        } else {
          toast.error(json.error || "Failed to update provider");
        }
      } else {
        const res = await fetch("/api/admin/certifications", {
          method: "POST",
          headers: { ...authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (res.ok) {
          toast.success("Provider created successfully");
          setDialogOpen(false);
          resetForm();
          await fetchItems();
        } else {
          toast.error(json.error || "Failed to create provider");
        }
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/certifications/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (res.ok) {
        toast.success("Provider deleted");
        setDeleteTarget(null);
        await fetchItems();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to delete provider");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      const res = await fetch("/api/admin/certifications", {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ ids, softDelete: true }),
      });
      if (res.ok) {
        toast.success(`Deleted ${ids.length} provider(s)`);
        await fetchItems();
      } else {
        const json = await res.json();
        toast.error(json.error || "Bulk delete failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const columns: ColumnDef<CertificationProvider>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: "Certification / Affiliation Provider",
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div className="flex items-center gap-3">
            {p.logo_url ? (
              <img
                src={p.logo_url}
                alt={p.name}
                className="h-9 w-9 rounded-lg object-contain bg-muted/40 p-0.5 border border-border/60 shrink-0 shadow-2xs"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                {p.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-foreground truncate">{p.name}</span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-mono text-[11px]">{p.slug}</span>
                {p.code && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-[11px] font-medium text-foreground/80">{p.code}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "website_url",
      header: "Official Website",
      cell: ({ row }) => {
        const url = row.original.website_url;
        if (!url) return <span className="text-muted-foreground text-xs">-</span>;
        return (
          <a
            href={url.startsWith("http") ? url : `https://${url}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1 max-w-[200px] truncate"
          >
            <Globe className="h-3 w-3 shrink-0" />
            <span className="truncate">{url.replace(/^https?:\/\//, "")}</span>
            <ExternalLink className="h-2.5 w-2.5 shrink-0 opacity-60" />
          </a>
        );
      },
    },
    {
      accessorKey: "created_at",
      header: "Created Date",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </span>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setViewingItem(item);
                setViewOpen(true);
              }}
              title="View Details"
            >
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => openEditDialog(item)}
              title="Edit Provider"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => setDeleteTarget(item)}
              title="Delete Provider"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BadgeCheck className="h-6 w-6 text-primary" />
            Affiliated By / Certifications
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage certification providers and university affiliation bodies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            <Plus className="mr-2 h-4 w-4" /> Add Provider
          </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Providers</p>
              <h3 className="text-xl font-extrabold text-foreground">{totalCount}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <ImageIcon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Logos Uploaded</p>
              <h3 className="text-xl font-extrabold text-foreground">
                {items.filter((i) => Boolean(i.logo_url)).length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Official Links</p>
              <h3 className="text-xl font-extrabold text-foreground">
                {items.filter((i) => Boolean(i.website_url)).length}
              </h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table Card */}
      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-5 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search provider by name, slug or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background/50 border-border"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchItems}
                disabled={loading}
                title="Refresh"
                className="h-9 w-9"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* DataTable */}
          <DataTable
            columns={columns}
            data={items}
            loading={loading}
            searchKey="name"
            pagination={pagination}
            onPaginationChange={setPagination}
            pageCount={pageCount}
            showRowNumbers
            selectedActions={(selectedRows, resetSelection) => {
              const ids = selectedRows.map((r) => r.id);
              return (
                <div className="flex items-center gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={async () => {
                      if (confirm(`Delete ${ids.length} selected providers?`)) {
                        await handleBulkDelete(ids);
                        resetSelection();
                      }
                    }}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete ({ids.length})
                  </Button>
                </div>
              );
            }}
          />
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-primary" />
              {editingItem ? "Edit Certification / Affiliation Provider" : "Add Certification / Affiliation Provider"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add certification provider, credentials authority, or university affiliation details.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Provider Name */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Provider Name *</Label>
              <Input
                placeholder="e.g. UGC affiliate, Microsoft Certified, AWS Certification, AICTE"
                value={formName}
                onChange={(e) => {
                  setFormName(e.target.value);
                  if (!editingItem) {
                    setFormSlug(toSlug(e.target.value));
                  }
                }}
                required
              />
            </div>

            {/* Code / Registration No. */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Code / Registration No.</Label>
              <Input
                placeholder="e.g. UGC 1653, ISO-9001:2015"
                value={formCode}
                onChange={(e) => setFormCode(e.target.value)}
              />
            </div>

            {/* Slug Identifier and Official Website in one row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Slug Identifier</Label>
                <Input
                  placeholder="slug-identifier"
                  value={formSlug}
                  onChange={(e) => setFormSlug(toSlug(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Official Website</Label>
                <Input
                  placeholder="www.example.com or https://ugc.ac.in"
                  value={formWebsite}
                  onChange={(e) => setFormWebsite(e.target.value)}
                />
              </div>
            </div>

            {/* Logo / Badge Image Uploader (WebP, SVG, PNG, JPEG) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4 text-primary" />
                  Logo / Badge Image
                </Label>
                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setLogoInputMode("upload")}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      logoInputMode === "upload"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Upload File
                  </button>
                  <span className="text-muted-foreground">|</span>
                  <button
                    type="button"
                    onClick={() => setLogoInputMode("url")}
                    className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
                      logoInputMode === "url"
                        ? "bg-primary text-primary-foreground font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Direct URL
                  </button>
                </div>
              </div>

              {/* Hidden File Input */}
              <input
                ref={logoInputRef}
                type="file"
                accept=".webp,.svg,.png,.jpg,.jpeg,image/webp,image/svg+xml,image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleLogoUpload(file);
                    e.target.value = "";
                  }
                }}
              />

              {logoInputMode === "upload" ? (
                <div>
                  {formLogo ? (
                    <div className="relative p-3.5 rounded-2xl border border-border/80 bg-muted/20 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={formLogo}
                          alt="Badge preview"
                          className="h-12 w-12 object-contain rounded-xl border bg-background p-1.5 shrink-0 shadow-2xs"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <div className="flex flex-col min-w-0 text-xs">
                          <span className="font-bold text-foreground">Uploaded Logo Badge</span>
                          <span className="text-muted-foreground truncate max-w-[240px]">{formLogo}</span>
                          <span className="text-[10px] text-emerald-500 font-semibold mt-0.5">✓ Ready for save</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-medium"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={uploadingLogo}
                        >
                          Change
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setFormLogo("")}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingLogo(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setIsDraggingLogo(false);
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingLogo(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) handleLogoUpload(file);
                      }}
                      onClick={() => logoInputRef.current?.click()}
                      className={`cursor-pointer border-2 border-dashed rounded-2xl p-4 text-center transition-all ${
                        isDraggingLogo
                          ? "border-primary bg-primary/10"
                          : "border-border/80 hover:border-primary/50 hover:bg-muted/30"
                      } ${uploadingLogo ? "pointer-events-none opacity-60" : ""}`}
                    >
                      {uploadingLogo ? (
                        <div className="flex flex-col items-center justify-center py-2 space-y-2">
                          <Loader2 className="h-7 w-7 animate-spin text-primary" />
                          <span className="text-xs font-semibold text-foreground">Uploading image...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center py-3 space-y-1.5">
                          <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                            <Upload className="h-5 w-5" />
                          </div>
                          <div>
                            <span className="text-xs font-bold text-foreground block">
                              Click to browse or drag & drop badge logo
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                              Supports <strong className="text-foreground">WebP, SVG, PNG, JPEG/JPG</strong> up to 5MB
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Paste direct URL e.g. https://.../logo.png"
                    value={formLogo}
                    onChange={(e) => setFormLogo(e.target.value)}
                  />
                  {formLogo && (
                    <div className="p-2.5 rounded-xl border bg-muted/20 flex items-center gap-3">
                      <img
                        src={formLogo}
                        alt="Badge preview"
                        className="h-9 w-9 object-contain rounded border bg-background p-1"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                      <div className="text-xs min-w-0">
                        <span className="font-semibold block text-foreground">URL Preview</span>
                        <span className="text-muted-foreground truncate block max-w-xs">{formLogo}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground font-semibold">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingItem ? "Save Changes" : "Create Provider"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Detail Sheet */}
      <Sheet open={viewOpen} onOpenChange={setViewOpen}>
        <SheetContent className="max-w-md w-full overflow-y-auto">
          <SheetHeader className="space-y-1">
            <SheetTitle className="text-xl font-bold flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-primary" />
              Provider Overview
            </SheetTitle>
            <SheetDescription className="text-xs">
              Detailed metadata and recognition attributes.
            </SheetDescription>
          </SheetHeader>

          {viewingItem && (
            <div className="space-y-5 py-5 text-sm">
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-muted/20 border border-border/80">
                {viewingItem.logo_url ? (
                  <img
                    src={viewingItem.logo_url}
                    alt={viewingItem.name}
                    className="h-14 w-14 object-contain rounded-xl border bg-background p-1.5 shrink-0 shadow-2xs"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-extrabold text-xl shrink-0 border border-primary/20">
                    {viewingItem.name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-base text-foreground">{viewingItem.name}</h3>
                  {viewingItem.code && (
                    <span className="text-xs font-mono text-muted-foreground block mt-0.5">{viewingItem.code}</span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {viewingItem.code && (
                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-xs font-medium text-muted-foreground">Code</span>
                    <span className="font-mono text-xs font-semibold">{viewingItem.code}</span>
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-b border-border/60">
                  <span className="text-xs font-medium text-muted-foreground">Slug</span>
                  <span className="font-mono text-xs">{viewingItem.slug}</span>
                </div>

                {viewingItem.website_url && (
                  <div className="flex items-center justify-between py-2 border-b border-border/60">
                    <span className="text-xs font-medium text-muted-foreground">Official Website</span>
                    <a
                      href={viewingItem.website_url.startsWith("http") ? viewingItem.website_url : `https://${viewingItem.website_url}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Visit site <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                {viewingItem.description && (
                  <div className="py-2 border-b border-border/60 space-y-1">
                    <span className="text-xs font-medium text-muted-foreground block">Description</span>
                    <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {viewingItem.description}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-b border-border/60">
                  <span className="text-xs font-medium text-muted-foreground">Registered Date</span>
                  <span className="text-xs text-foreground">
                    {new Date(viewingItem.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <Button
                  onClick={() => {
                    setViewOpen(false);
                    openEditDialog(viewingItem);
                  }}
                  className="flex-1 bg-primary text-primary-foreground font-semibold"
                >
                  <Edit2 className="h-4 w-4 mr-1.5" /> Edit Provider
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Certification Provider
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong className="text-foreground">{deleteTarget?.name}</strong>? It will no longer appear for institution program certifications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
