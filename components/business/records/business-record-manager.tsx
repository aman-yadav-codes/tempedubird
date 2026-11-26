"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import {
  Car,
  Building2,
  UtensilsCrossed,
  BedDouble,
  GraduationCap,
  HeartPulse,
  CalendarDays,
  Plus,
  Search,
  Filter,
  Download,
  Upload,
  RefreshCw,
  Edit2,
  Trash2,
  Copy,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  LayoutGrid,
  Table as TableIcon,
  ChevronRight,
  MoreVertical,
  X,
  FileText,
  MapPin,
  IndianRupee,
  Shield,
  Layers,
  Tag,
  Check,
  AlertCircle,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/store/slices/auth.store";
import { useBusinessCurrency } from "@/hooks/use-business-currency";

export interface BusinessRecordManagerProps {
  vertical: "vehicles" | "properties" | "restaurants" | "hotels" | "events" | "education" | "healthcare";
  title: string;
  description: string;
  icon?: any;
  isMasterCatalog?: boolean;
}

export function BusinessRecordManager({ vertical, title, description, icon: HeaderIcon, isMasterCatalog = false }: BusinessRecordManagerProps) {
  const { accessToken } = useAuthStore();

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {};
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
    if (!isMasterCatalog) {
      const activeInst = typeof window !== "undefined" ? (localStorage.getItem("active_institution_id") || "") : "";
      if (activeInst) {
        headers["x-institution-id"] = activeInst;
        headers["x-business-id"] = activeInst;
      }
    }
    return headers;
  }, [accessToken, isMasterCatalog]);

  // Data States
  const { countryCode, currencyCode, currencySymbol, formatPrice: formatCurrencyPrice } = useBusinessCurrency();
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, published: 0, draft: 0, archived: 0 });
  const [loading, setLoading] = useState(true);
  const [formConfig, setFormConfig] = useState<any>(null);

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");

  // Dialog States
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category_id: "",
    subcategory_id: "",
    status: "published",
    is_active: true,
    is_featured: false,
    currency: "INR",
    price: "",
    featured_image: "",
    details: {} as Record<string, any>,
    custom_attributes: {} as Record<string, any>,
    media: [] as Array<{ url: string; title: string; is_featured?: boolean }>,
  });

  useEffect(() => {
    if (currencyCode && formData.currency === "INR" && currencyCode !== "INR") {
      setFormData((prev) => ({ ...prev, currency: currencyCode }));
    }
  }, [currencyCode]);

  // Import State
  const [importText, setImportText] = useState("");
  const [importing, setImporting] = useState(false);

  // 1. Fetch Form Configuration (Master Dropdowns & Dynamic Attributes)
  const fetchFormConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/business/records/form-config?vertical=${vertical}`, {
        headers: getHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setFormConfig(json);
      }
    } catch (err) {
      console.error("Failed to load form config:", err);
    }
  }, [vertical, getHeaders]);

  // 2. Fetch Business Records
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        vertical,
        page: String(page),
        limit: "20",
      });
      if (isMasterCatalog) params.set("is_master", "true");
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (categoryFilter !== "all") params.set("category_id", categoryFilter);

      const res = await fetch(`/api/business/records?${params.toString()}`, {
        headers: getHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setRecords(json.data || []);
        setStats(json.stats || { total: 0, published: 0, draft: 0, archived: 0 });
        setTotalPages(json.pagination?.totalPages || 1);
      } else {
        toast.error(json.error || "Failed to fetch records");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error loading records");
    } finally {
      setLoading(false);
    }
  }, [vertical, page, search, statusFilter, categoryFilter, getHeaders, isMasterCatalog]);

  useEffect(() => {
    fetchFormConfig();
  }, [fetchFormConfig]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  // Handle Open Create Form
  const handleOpenCreate = () => {
    setSelectedRecord(null);
    setFormData({
      title: "",
      description: "",
      category_id: "",
      subcategory_id: "",
      status: "published",
      is_active: true,
      is_featured: false,
      currency: currencyCode || "INR",
      price: "",
      featured_image: "",
      details: {},
      custom_attributes: {},
      media: [],
    });
    setFormDialogOpen(true);
  };

  // Handle Open Edit Form
  const handleOpenEdit = async (record: any) => {
    setSelectedRecord(record);
    try {
      const res = await fetch(`/api/business/records/${record.id}`, {
        headers: getHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        const full = json.data;
        const attrMap: Record<string, any> = {};
        if (Array.isArray(full.custom_attributes)) {
          for (const a of full.custom_attributes) {
            attrMap[a.attribute_code] = a.value_text || a.value_number || a.value_boolean || "";
          }
        }
        setFormData({
          title: full.title || "",
          description: full.description || "",
          category_id: full.category_id ? String(full.category_id) : "",
          subcategory_id: full.subcategory_id ? String(full.subcategory_id) : "",
          status: full.status || "published",
          is_active: Boolean(full.is_active),
          is_featured: Boolean(full.is_featured),
          currency: full.currency || currencyCode || "INR",
          price: full.price ? String(full.price) : "",
          featured_image: full.featured_image || "",
          details: full.details || {},
          custom_attributes: attrMap,
          media: full.media || [],
        });
        setFormDialogOpen(true);
      } else {
        toast.error(json.error || "Failed to load record details");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load record details");
    }
  };

  // Handle Open View Details
  const handleOpenView = async (record: any) => {
    setSelectedRecord(record);
    try {
      const res = await fetch(`/api/business/records/${record.id}`, {
        headers: getHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedRecord(json.data);
        setDetailDialogOpen(true);
      } else {
        toast.error(json.error || "Failed to load details");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to load details");
    }
  };

  // Handle Save (Create or Update)
  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error("Title / Name is required");
      return;
    }

    setSubmitting(true);
    try {
      const isEdit = Boolean(selectedRecord?.id);
      const url = isEdit ? `/api/business/records/${selectedRecord.id}` : `/api/business/records`;
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        ...formData,
        vertical_code: vertical,
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (json.success) {
        toast.success(json.message || "Saved successfully!");
        setFormDialogOpen(false);
        fetchRecords();
      } else {
        toast.error(json.error || "Failed to save record");
      }
    } catch (err: any) {
      toast.error(err.message || "Network error while saving");
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Status Toggle (Active / Inactive)
  const handleToggleActive = async (record: any) => {
    try {
      const nextActive = !record.is_active;
      const res = await fetch(`/api/business/records/${record.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(),
        },
        body: JSON.stringify({ is_active: nextActive }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Record marked as ${nextActive ? "Active" : "Inactive"}`);
        setRecords((prev) => prev.map((r) => (r.id === record.id ? { ...r, is_active: nextActive } : r)));
      } else {
        toast.error(json.error || "Failed to update status");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // Handle Status Change (Publish / Draft / Archive)
  const handleChangeStatus = async (record: any, newStatus: string) => {
    try {
      const res = await fetch(`/api/business/records/${record.id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(),
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(`Status changed to ${newStatus}`);
        fetchRecords();
      } else {
        toast.error(json.error || "Failed to update status");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // Handle One-Click Duplicate
  const handleDuplicate = async (record: any) => {
    try {
      const res = await fetch(`/api/business/records/${record.id}/duplicate`, {
        method: "POST",
        headers: getHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Record duplicated successfully!");
        fetchRecords();
      } else {
        toast.error(json.error || "Failed to duplicate record");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to duplicate record");
    }
  };

  // Handle Soft Delete
  const handleDelete = async (record: any) => {
    if (!confirm(`Are you sure you want to archive "${record.title}"?`)) return;
    try {
      const res = await fetch(`/api/business/records/${record.id}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message || "Record archived");
        fetchRecords();
      } else {
        toast.error(json.error || "Failed to archive record");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to archive record");
    }
  };

  // Handle CSV Import
  const handleImportCSV = async () => {
    if (!importText.trim()) {
      toast.error("Please paste CSV data or rows");
      return;
    }
    setImporting(true);
    try {
      const lines = importText.trim().split("\n").map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        toast.error("CSV must have a header row and at least one data row");
        setImporting(false);
        return;
      }
      const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ''));
      const parsedRecords = [];

      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ''));
        const obj: Record<string, string> = {};
        headers.forEach((h, idx) => {
          obj[h] = values[idx] || "";
        });
        parsedRecords.push(obj);
      }

      const res = await fetch(`/api/business/records/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(),
        },
        body: JSON.stringify({
          vertical_code: vertical,
          records: parsedRecords,
        }),
      });
      const json = await res.json();
      if (json.success) {
        toast.success(json.message);
        setImportDialogOpen(false);
        setImportText("");
        fetchRecords();
      } else {
        toast.error(json.error || "Import failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Error processing import");
    } finally {
      setImporting(false);
    }
  };

  // Helper: master options for type
  const getOptions = (typeCode: string) => {
    return formConfig?.masterOptions?.[typeCode] || [];
  };

  const IconComp = HeaderIcon || Sparkles;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-card to-muted/40 p-6 rounded-2xl border shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3.5 bg-primary/10 text-primary rounded-xl shadow-inner">
            <IconComp className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              <Badge variant="outline" className="text-xs uppercase bg-background font-semibold">
                {vertical}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={fetchRecords} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const activeInst = typeof window !== "undefined" ? (localStorage.getItem("active_institution_id") || "") : "";
              const url = `/api/business/records/export?vertical=${vertical}${activeInst ? `&institution_id=${activeInst}&business_id=${activeInst}` : ""}`;
              window.open(url, "_blank");
            }}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Bulk Import
          </Button>
          <Button onClick={handleOpenCreate} size="sm" className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            Add {title.slice(0, -1) || "Record"}
          </Button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-primary shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Records</p>
              <h3 className="text-2xl font-bold mt-1">{stats.total}</h3>
            </div>
            <div className="p-2.5 bg-primary/10 text-primary rounded-lg">
              <Layers className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Published</p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">{stats.published}</h3>
            </div>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Draft / Pending</p>
              <h3 className="text-2xl font-bold text-amber-600 mt-1">{stats.draft}</h3>
            </div>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-400 shadow-sm hover:shadow transition-shadow">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Archived</p>
              <h3 className="text-2xl font-bold text-slate-600 mt-1">{stats.archived}</h3>
            </div>
            <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg">
              <XCircle className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Toolbar */}
      <Card className="p-4 shadow-sm">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={`Search ${title.toLowerCase()} by title, slug, or keywords...`}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9 bg-muted/20"
              />
            </div>

            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center border rounded-lg p-0.5 bg-muted/30">
              <Button
                variant={viewMode === "table" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2.5"
                onClick={() => setViewMode("table")}
              >
                <TableIcon className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-8 px-2.5"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Main Records Display */}
      {loading ? (
        <Card className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
          <RefreshCw className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="font-medium">Loading {title.toLowerCase()}...</p>
        </Card>
      ) : records.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center">
          <IconComp className="h-12 w-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-semibold text-foreground">No records found</h3>
          <p className="text-sm mt-1 max-w-sm text-center">
            {search || statusFilter !== "all"
              ? "No records match your active search and filter criteria."
              : `You haven't created any ${title.toLowerCase()} yet. Click "Add" to create your first record.`}
          </p>
          <Button onClick={handleOpenCreate} size="sm" className="mt-4 gap-2">
            <Plus className="h-4 w-4" /> Add Record
          </Button>
        </Card>
      ) : viewMode === "table" ? (
        <Card className="overflow-hidden border shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 border-b text-xs uppercase font-semibold text-muted-foreground tracking-wider">
                <tr>
                  <th className="p-3.5 pl-4">Item & Details</th>
                  <th className="p-3.5">Specifics</th>
                  <th className="p-3.5">Price / Fees</th>
                  <th className="p-3.5 text-right pr-4 w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {records.map((r) => {
                  const details = r.details || {};
                  const publicUrl = (() => {
                    const q = encodeURIComponent(r.slug || r.title || "");
                    switch (vertical) {
                      case "vehicles":
                        return `/explore?type=vehicles&q=${q}`;
                      case "properties":
                        return `/explore?type=properties&q=${q}`;
                      case "events":
                        return `/explore?type=events&q=${q}`;
                      case "restaurants":
                        return `/explore?type=dishes&q=${q}`;
                      case "hotels":
                        return `/explore?type=rooms&q=${q}`;
                      case "education":
                        return `/explore?type=courses&q=${q}`;
                      default:
                        return `/explore?q=${q}`;
                    }
                  })();

                  return (
                    <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5 pl-4">
                        <div className="flex items-center gap-3">
                          {r.featured_image ? (
                            <img
                              src={r.featured_image}
                              alt={r.title}
                              className="h-12 w-12 rounded-lg object-cover border bg-muted flex-shrink-0"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                              <IconComp className="h-6 w-6" />
                            </div>
                          )}
                          <div className="min-w-0 space-y-1">
                            <a
                              href={publicUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`font-bold truncate max-w-xs flex items-center gap-1 group hover:underline ${
                                (r.is_active !== undefined && r.is_active !== null ? Boolean(r.is_active) : (r.status === "published" || r.status === "active"))
                                  ? "!text-emerald-600 dark:!text-emerald-400 hover:!text-emerald-700"
                                  : "!text-rose-600 dark:!text-rose-400 hover:!text-rose-700"
                              }`}
                            >
                              <span>{r.title}</span>
                              <ExternalLink className="size-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </a>
                            <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                              <span className="text-muted-foreground font-mono">/{r.slug}</span>
                              <Badge
                                variant={r.status === "published" ? "default" : r.status === "draft" ? "secondary" : "outline"}
                                className="capitalize text-[9px] py-0 px-1.5 h-4 font-medium"
                              >
                                {r.status}
                              </Badge>
                              {r.is_active ? (
                                <Badge className="bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 text-[9px] py-0 px-1.5 h-4 gap-0.5">
                                  <CheckCircle2 className="size-2.5" /> Active
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground text-[9px] py-0 px-1.5 h-4 gap-0.5">
                                  <XCircle className="size-2.5" /> Inactive
                                </Badge>
                              )}
                              {r.business_name && (
                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 h-4 bg-muted/40 text-muted-foreground font-normal gap-1">
                                  <Building2 className="size-2.5 text-muted-foreground" />
                                  <span className="truncate max-w-[160px]">{r.business_name}</span>
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-xs text-muted-foreground">
                        {vertical === "vehicles" && (
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">{details.manufacturing_year || "2024"} • {details.color || "Standard"}</p>
                            <p>{details.mileage || "15 kmpl"} • {details.kilometers_driven ? `${details.kilometers_driven.toLocaleString()} km` : "New"}</p>
                          </div>
                        )}
                        {vertical === "properties" && (
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">{details.bedrooms ? `${details.bedrooms} BHK` : "Commercial"} • {details.built_up_area} {details.area_unit || "sq ft"}</p>
                            <p className="truncate max-w-[200px]">{details.street_address || details.city || "Varanasi"}</p>
                          </div>
                        )}
                        {vertical === "restaurants" && (
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">{details.menu_category_name || "Specialty"}</p>
                            <p>{details.spice_level || "Medium"} • {details.prep_time_minutes ? `${details.prep_time_minutes} min` : "Quick Serve"}</p>
                          </div>
                        )}
                        {vertical === "hotels" && (
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">Room #{details.room_number || "Deluxe"}</p>
                            <p>Max {details.max_adults || 2} Adults • {details.room_size_sqft ? `${details.room_size_sqft} sqft` : "Spacious"}</p>
                          </div>
                        )}
                        {vertical === "events" && (
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">{details.start_date ? new Date(details.start_date).toLocaleDateString() : "Upcoming"}</p>
                            <p className="truncate max-w-[200px]">{details.venue_name || details.city || "Venue TBA"}</p>
                          </div>
                        )}
                        {vertical === "education" && (
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">{details.class_grade || "Grade 12"} - {details.section || "A"}</p>
                            <p>Adm: {details.admission_number || "Pending"}</p>
                          </div>
                        )}
                        {vertical === "healthcare" && (
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">ID: {details.patient_identifier || "PT-101"} • Blood: {details.blood_group || "N/A"}</p>
                            <p>Doctor: {details.assigned_doctor || "General Duty"}</p>
                          </div>
                        )}
                      </td>

                      <td className="p-3.5">
                        {r.price !== null && r.price !== undefined ? (
                          <span className="font-semibold text-foreground">
                            {formatCurrencyPrice(r.price, r.currency)}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">Included</span>
                        )}
                      </td>

                      <td className="p-3.5 text-right pr-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-xs font-medium gap-1 px-2">
                              <span>Actions</span>
                              <ChevronDown className="size-3 opacity-60" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                              Actions
                            </DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <a
                                href={publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="cursor-pointer flex items-center gap-2"
                              >
                                <ExternalLink className="size-3.5 text-blue-500" />
                                <span>View Public Page</span>
                              </a>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenView(r)}
                              className="cursor-pointer flex items-center gap-2"
                            >
                              <Eye className="size-3.5 text-muted-foreground" />
                              <span>View Details</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleOpenEdit(r)}
                              className="cursor-pointer flex items-center gap-2"
                            >
                              <Edit2 className="size-3.5 text-primary" />
                              <span>Edit Record</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDuplicate(r)}
                              className="cursor-pointer flex items-center gap-2"
                            >
                              <Copy className="size-3.5 text-muted-foreground" />
                              <span>Duplicate</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleToggleActive(r)}
                              className="cursor-pointer flex items-center gap-2"
                            >
                              {r.is_active ? (
                                <>
                                  <XCircle className="size-3.5 text-amber-500" />
                                  <span>Deactivate</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                                  <span>Activate</span>
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(r)}
                              className="cursor-pointer flex items-center gap-2 text-destructive focus:text-destructive"
                            >
                              <Trash2 className="size-3.5 text-destructive" />
                              <span>Delete Permanently</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {records.map((r) => (
            <Card key={r.id} className="overflow-hidden border shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="relative h-44 w-full bg-muted">
                  {r.featured_image ? (
                    <img src={r.featured_image} alt={r.title} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-primary/5 text-primary">
                      <IconComp className="h-10 w-10 opacity-60" />
                    </div>
                  )}
                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <Badge variant={r.status === "published" ? "default" : "secondary"} className="capitalize text-xs font-semibold shadow">
                      {r.status}
                    </Badge>
                  </div>
                </div>

                <CardContent className="p-4 space-y-2">
                  <h4 className="font-semibold text-base line-clamp-1">{r.title}</h4>
                  <p className="text-xs text-muted-foreground line-clamp-2">{r.description || "No description provided."}</p>

                  <div className="pt-2 flex items-center justify-between border-t text-sm">
                    <span className="font-bold text-foreground">
                      {formatCurrencyPrice(r.price, r.currency)}
                    </span>
                    <Switch checked={Boolean(r.is_active)} onCheckedChange={() => handleToggleActive(r)} />
                  </div>
                </CardContent>
              </div>

              <div className="p-3 bg-muted/30 border-t flex items-center justify-end gap-1.5">
                <Button variant="outline" size="sm" onClick={() => handleOpenView(r)} className="h-8 text-xs gap-1">
                  <Eye className="h-3.5 w-3.5" /> View
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleOpenEdit(r)} className="h-8 text-xs gap-1">
                  <Edit2 className="h-3.5 w-3.5" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDuplicate(r)} className="h-8 text-xs gap-1">
                  <Copy className="h-3.5 w-3.5" /> Clone
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(r)} className="h-8 text-xs px-2">
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* CREATE / EDIT DIALOG */}
      <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <IconComp className="h-5 w-5 text-primary" />
              {selectedRecord ? `Edit ${selectedRecord.title}` : `Create New ${title.slice(0, -1) || "Record"}`}
            </DialogTitle>
            <DialogDescription>
              Form fields and dependent dropdowns load dynamically from the centralized master data catalog.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveRecord} className="space-y-6 pt-2">
            {/* Section 1: Core Information */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-primary border-b pb-1">
                1. Basic Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Title / Name *</Label>
                  <Input
                    required
                    placeholder="e.g. 2024 Toyota Fortuner 4x4 / Luxury 3 BHK Apartment"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Selling Price / Standard Fee ({currencyCode || "INR"})</Label>
                  <Input
                    type="number"
                    placeholder={`e.g. ${currencySymbol}4500000`}
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Publishing Status</Label>
                  <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="published">Published</SelectItem>
                      <SelectItem value="draft">Draft (Private)</SelectItem>
                      <SelectItem value="archived">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Featured Image URL</Label>
                  <Input
                    placeholder="https://images.unsplash.com/..."
                    value={formData.featured_image}
                    onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <Label>Description & Overview</Label>
                  <Textarea
                    rows={3}
                    placeholder="Provide full description, specifications, and highlights..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Vertical-Specific Cascading Masters */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold uppercase tracking-wider text-primary border-b pb-1">
                2. Master Data Configurations
              </h4>

              {vertical === "vehicles" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Vehicle Type</Label>
                    <Select
                      value={formData.details.vehicle_type_id ? String(formData.details.vehicle_type_id) : ""}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, vehicle_type_id: Number(val) } })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Vehicle Type" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("vehicle_types").map((vt: any) => (
                          <SelectItem key={vt.id} value={String(vt.id)}>{vt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Vehicle Category</Label>
                    <Select
                      value={formData.category_id || ""}
                      onValueChange={(val) => setFormData({ ...formData, category_id: val, subcategory_id: "" })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("vehicle_categories").map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Vehicle Subcategory</Label>
                    <Select
                      value={formData.subcategory_id || ""}
                      onValueChange={(val) => setFormData({ ...formData, subcategory_id: val })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Subcategory" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("vehicle_subcategories")
                          .filter((sc: any) => !formData.category_id || sc.parent_id === Number(formData.category_id))
                          .map((sc: any) => (
                            <SelectItem key={sc.id} value={String(sc.id)}>{sc.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Brand / Manufacturer</Label>
                    <Select
                      value={formData.details.brand_id ? String(formData.details.brand_id) : ""}
                      onValueChange={(val) => setFormData({
                        ...formData,
                        details: {
                          ...formData.details,
                          brand_id: Number(val),
                          model_id: undefined,
                          variant_id: undefined,
                        }
                      })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Brand" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("vehicle_brands").map((b: any) => (
                          <SelectItem key={b.id} value={String(b.id)}>{b.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Model</Label>
                    <Select
                      value={formData.details.model_id ? String(formData.details.model_id) : ""}
                      onValueChange={(val) => setFormData({
                        ...formData,
                        details: {
                          ...formData.details,
                          model_id: Number(val),
                          variant_id: undefined,
                        }
                      })}
                    >
                      <SelectTrigger><SelectValue placeholder={formData.details.brand_id ? "Select Model" : "Select Brand First"} /></SelectTrigger>
                      <SelectContent>
                        {getOptions("vehicle_models")
                          .filter((m: any) => !formData.details.brand_id || m.parent_id === Number(formData.details.brand_id))
                          .map((m: any) => (
                            <SelectItem key={m.id} value={String(m.id)}>{m.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Variant</Label>
                    <Select
                      value={formData.details.variant_id ? String(formData.details.variant_id) : ""}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, variant_id: Number(val) } })}
                    >
                      <SelectTrigger><SelectValue placeholder={formData.details.model_id ? "Select Variant" : "Select Model First"} /></SelectTrigger>
                      <SelectContent>
                        {getOptions("vehicle_variants")
                          .filter((vr: any) => !formData.details.model_id || vr.parent_id === Number(formData.details.model_id))
                          .map((vr: any) => (
                            <SelectItem key={vr.id} value={String(vr.id)}>{vr.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Fuel Type</Label>
                    <Select
                      value={formData.details.fuel_type_id ? String(formData.details.fuel_type_id) : ""}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, fuel_type_id: Number(val) } })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Fuel" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("fuel_types").map((f: any) => (
                          <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Transmission</Label>
                    <Select
                      value={formData.details.transmission_type_id ? String(formData.details.transmission_type_id) : ""}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, transmission_type_id: Number(val) } })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Transmission" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("transmission_types").map((t: any) => (
                          <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Body Type</Label>
                    <Select
                      value={formData.details.body_type_id ? String(formData.details.body_type_id) : ""}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, body_type_id: Number(val) } })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Body Type" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("body_types").map((bt: any) => (
                          <SelectItem key={bt.id} value={String(bt.id)}>{bt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Vehicle Condition</Label>
                    <Select
                      value={formData.details.vehicle_condition_id ? String(formData.details.vehicle_condition_id) : ""}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, vehicle_condition_id: Number(val) } })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Condition" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("vehicle_conditions").map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Manufacturing Year</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 2024"
                      value={formData.details.manufacturing_year || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, manufacturing_year: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Registration Year</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 2024"
                      value={formData.details.registration_year || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, registration_year: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Color</Label>
                    <Input
                      placeholder="e.g. Pearl White / Midnight Black"
                      value={formData.details.color || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, color: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Mileage (kmpl)</Label>
                    <Input
                      placeholder="e.g. 16.5 kmpl"
                      value={formData.details.mileage || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, mileage: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Kilometers Driven</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 24000"
                      value={formData.details.kilometers_driven || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, kilometers_driven: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Number of Owners</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 1"
                      value={formData.details.number_of_owners || "1"}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, number_of_owners: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Seating Capacity</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 5 or 7"
                      value={formData.details.seating_capacity || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, seating_capacity: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Registration Number</Label>
                    <Input
                      placeholder="e.g. UP65-AB-1234"
                      value={formData.details.registration_number || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, registration_number: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>VIN / Chassis Number</Label>
                    <Input
                      placeholder="e.g. MBJA..."
                      value={formData.details.vin_chassis_number || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, vin_chassis_number: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Location / Showroom</Label>
                    <Input
                      placeholder="e.g. Varanasi Showroom"
                      value={formData.details.location || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, location: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Warranty Information</Label>
                    <Input
                      placeholder="e.g. 3 Years / 100,000 KM"
                      value={formData.details.warranty_info || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, warranty_info: e.target.value } })}
                    />
                  </div>

                  <div className="flex items-center gap-6 md:col-span-3 pt-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={Boolean(formData.details.is_negotiable)}
                        onCheckedChange={(val) => setFormData({ ...formData, details: { ...formData.details, is_negotiable: val } })}
                      />
                      <Label className="cursor-pointer">Price Negotiable</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={Boolean(formData.details.financing_available)}
                        onCheckedChange={(val) => setFormData({ ...formData, details: { ...formData.details, financing_available: val } })}
                      />
                      <Label className="cursor-pointer">Financing Available</Label>
                    </div>
                  </div>
                </div>
              )}

              {vertical === "properties" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Property Category</Label>
                    <Select
                      value={formData.category_id || ""}
                      onValueChange={(val) => setFormData({
                        ...formData,
                        category_id: val,
                        subcategory_id: "",
                        details: { ...formData.details, property_type_id: undefined }
                      })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("property_categories").map((c: any) => (
                          <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Property Subcategory</Label>
                    <Select
                      value={formData.subcategory_id || ""}
                      onValueChange={(val) => setFormData({
                        ...formData,
                        subcategory_id: val,
                        details: { ...formData.details, property_type_id: undefined }
                      })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Subcategory" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("property_subcategories")
                          .filter((sc: any) => !formData.category_id || sc.parent_id === Number(formData.category_id))
                          .map((sc: any) => (
                            <SelectItem key={sc.id} value={String(sc.id)}>{sc.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Property Type</Label>
                    <Select
                      value={formData.details.property_type_id ? String(formData.details.property_type_id) : ""}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, property_type_id: Number(val) } })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Type" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("property_types")
                          .filter((t: any) => !formData.subcategory_id || t.parent_id === Number(formData.subcategory_id))
                          .map((t: any) => (
                            <SelectItem key={t.id} value={String(t.id)}>{t.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Listing Type</Label>
                    <Select
                      value={formData.details.listing_type_id ? String(formData.details.listing_type_id) : ""}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, listing_type_id: Number(val) } })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Listing" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("listing_types").map((l: any) => (
                          <SelectItem key={l.id} value={String(l.id)}>{l.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Ownership Type</Label>
                    <Select
                      value={formData.details.ownership_type_id ? String(formData.details.ownership_type_id) : ""}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, ownership_type_id: Number(val) } })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Ownership" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("ownership_types").map((o: any) => (
                          <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Furnishing Type</Label>
                    <Select
                      value={formData.details.furnishing_type_id ? String(formData.details.furnishing_type_id) : ""}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, furnishing_type_id: Number(val) } })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Furnishing" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("furnishing_types").map((f: any) => (
                          <SelectItem key={f.id} value={String(f.id)}>{f.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Construction Status</Label>
                    <Select
                      value={formData.details.construction_status_id ? String(formData.details.construction_status_id) : ""}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, construction_status_id: Number(val) } })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Status" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("construction_status").map((cs: any) => (
                          <SelectItem key={cs.id} value={String(cs.id)}>{cs.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Property Condition</Label>
                    <Select
                      value={formData.details.property_condition_id ? String(formData.details.property_condition_id) : ""}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, property_condition_id: Number(val) } })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Condition" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("property_conditions").map((pc: any) => (
                          <SelectItem key={pc.id} value={String(pc.id)}>{pc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Land Type</Label>
                    <Select
                      value={formData.details.land_type_id ? String(formData.details.land_type_id) : ""}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, land_type_id: Number(val) } })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Land Type" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("land_types").map((lt: any) => (
                          <SelectItem key={lt.id} value={String(lt.id)}>{lt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Bedrooms (BHK)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 3"
                      value={formData.details.bedrooms || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, bedrooms: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Bathrooms</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 2"
                      value={formData.details.bathrooms || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, bathrooms: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Balconies</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 2"
                      value={formData.details.balconies || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, balconies: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Parking Spaces</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 1"
                      value={formData.details.parking_spaces || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, parking_spaces: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Built-up Area</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 1450"
                      value={formData.details.built_up_area || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, built_up_area: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Area Unit</Label>
                    <Input
                      placeholder="e.g. sq ft / sq yards"
                      value={formData.details.area_unit || "sq ft"}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, area_unit: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Monthly Rental Amount (if rent)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 25000"
                      value={formData.details.rental_amount || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, rental_amount: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Security Deposit</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 50000"
                      value={formData.details.security_deposit || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, security_deposit: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Maintenance Charges (Monthly)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 2000"
                      value={formData.details.maintenance_charges || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, maintenance_charges: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-3">
                    <Label>Street Address & Locality</Label>
                    <Input
                      placeholder="e.g. Tower 3, Royal Enclave, Pandeypur, Varanasi"
                      value={formData.details.street_address || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, street_address: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input
                      placeholder="e.g. Varanasi"
                      value={formData.details.city || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, city: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>State</Label>
                    <Input
                      placeholder="e.g. Uttar Pradesh"
                      value={formData.details.state || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, state: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Availability Status</Label>
                    <Select
                      value={formData.details.availability_status || "available"}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, availability_status: val } })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="available">Immediately Available</SelectItem>
                        <SelectItem value="under_offer">Under Offer</SelectItem>
                        <SelectItem value="sold">Sold / Leased Out</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {vertical === "restaurants" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>Menu Category</Label>
                      <Select
                        value={formData.category_id || (formData.details.menu_category_id ? String(formData.details.menu_category_id) : "")}
                        onValueChange={(val) => setFormData({
                          ...formData,
                          category_id: val,
                          subcategory_id: "",
                          details: { ...formData.details, menu_category_id: Number(val) }
                        })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select Category" /></SelectTrigger>
                        <SelectContent>
                          {(formConfig?.menuCategories?.length ? formConfig.menuCategories : getOptions("menu_categories")).map((mc: any) => (
                            <SelectItem key={mc.id} value={String(mc.id)}>{mc.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Menu Subcategory</Label>
                      <Select
                        value={formData.subcategory_id || ""}
                        onValueChange={(val) => setFormData({ ...formData, subcategory_id: val })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select Subcategory" /></SelectTrigger>
                        <SelectContent>
                          {getOptions("menu_subcategories")
                            .filter((sc: any) => !formData.category_id || sc.parent_id === Number(formData.category_id))
                            .map((sc: any) => (
                              <SelectItem key={sc.id} value={String(sc.id)}>{sc.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Cuisine</Label>
                      <Select
                        value={formData.details.cuisine_id ? String(formData.details.cuisine_id) : ""}
                        onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, cuisine_id: Number(val) } })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select Cuisine" /></SelectTrigger>
                        <SelectContent>
                          {getOptions("cuisines").map((c: any) => (
                            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Dietary Type</Label>
                      <Select
                        value={formData.details.dietary_type_id ? String(formData.details.dietary_type_id) : ""}
                        onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, dietary_type_id: Number(val) } })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select Dietary" /></SelectTrigger>
                        <SelectContent>
                          {getOptions("dietary_types").map((d: any) => (
                            <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Food Type</Label>
                      <Select
                        value={formData.details.food_type_id ? String(formData.details.food_type_id) : ""}
                        onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, food_type_id: Number(val) } })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select Food Type" /></SelectTrigger>
                        <SelectContent>
                          {getOptions("food_types").map((ft: any) => (
                            <SelectItem key={ft.id} value={String(ft.id)}>{ft.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Meal Type</Label>
                      <Select
                        value={formData.details.meal_type_id ? String(formData.details.meal_type_id) : ""}
                        onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, meal_type_id: Number(val) } })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select Meal Type" /></SelectTrigger>
                        <SelectContent>
                          {getOptions("meal_types").map((mt: any) => (
                            <SelectItem key={mt.id} value={String(mt.id)}>{mt.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Spice Level</Label>
                      <Select
                        value={formData.details.spice_level || "Medium"}
                        onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, spice_level: val } })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Mild">Mild</SelectItem>
                          <SelectItem value="Medium">Medium</SelectItem>
                          <SelectItem value="Spicy">Spicy</SelectItem>
                          <SelectItem value="Extra Hot">Extra Hot</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Prep Time (Minutes)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 20"
                        value={formData.details.prep_time_minutes || ""}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, prep_time_minutes: e.target.value } })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Discounted Price ({currencyCode || "INR"})</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 280"
                        value={formData.details.discounted_price || ""}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, discounted_price: e.target.value } })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Portion Size / Serving Unit</Label>
                      <Input
                        placeholder="e.g. 2 People / 500g / 1 Plate"
                        value={formData.details.portion_size || ""}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, portion_size: e.target.value } })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Calories (kcal)</Label>
                      <Input
                        type="number"
                        placeholder="e.g. 350"
                        value={formData.details.calories || ""}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, calories: e.target.value } })}
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-3">
                      <Label>Key Ingredients</Label>
                      <Input
                        placeholder="e.g. Cottage cheese, capsicum, onion, yogurt marinade, spices"
                        value={formData.details.ingredients || ""}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, ingredients: e.target.value } })}
                      />
                    </div>
                  </div>

                  <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
                    <div className="flex items-center justify-between">
                      <div>
                        <h5 className="text-sm font-semibold">Dish Variations (Optional)</h5>
                        <p className="text-xs text-muted-foreground">Add portion variations like Half / Full or Small / Medium / Large with custom prices.</p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1 text-xs"
                        onClick={() => {
                          const currentVars = Array.isArray(formData.details.variants) ? formData.details.variants : [];
                          setFormData({
                            ...formData,
                            details: {
                              ...formData.details,
                              variants: [...currentVars, { variant_name: "", price: "", discounted_price: "", is_default: false }]
                            }
                          });
                        }}
                      >
                        <Plus className="h-3.5 w-3.5" /> Add Variation
                      </Button>
                    </div>

                    {Array.isArray(formData.details.variants) && formData.details.variants.length > 0 && (
                      <div className="space-y-2">
                        {formData.details.variants.map((v: any, vIdx: number) => (
                          <div key={vIdx} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-center bg-background p-2.5 rounded-lg border">
                            <Input
                              placeholder="Name (e.g. Half, Full)"
                              value={v.variant_name || ""}
                              onChange={(e) => {
                                const copy = [...formData.details.variants];
                                copy[vIdx] = { ...copy[vIdx], variant_name: e.target.value };
                                setFormData({ ...formData, details: { ...formData.details, variants: copy } });
                              }}
                            />
                            <Input
                              type="number"
                              placeholder={`Price (${currencyCode || "INR"})`}
                              value={v.price || ""}
                              onChange={(e) => {
                                const copy = [...formData.details.variants];
                                copy[vIdx] = { ...copy[vIdx], price: e.target.value };
                                setFormData({ ...formData, details: { ...formData.details, variants: copy } });
                              }}
                            />
                            <Input
                              type="number"
                              placeholder="Discounted Price"
                              value={v.discounted_price || ""}
                              onChange={(e) => {
                                const copy = [...formData.details.variants];
                                copy[vIdx] = { ...copy[vIdx], discounted_price: e.target.value };
                                setFormData({ ...formData, details: { ...formData.details, variants: copy } });
                              }}
                            />
                            <div className="flex items-center justify-between">
                              <label className="text-xs flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(v.is_default)}
                                  onChange={(e) => {
                                    const copy = [...formData.details.variants];
                                    copy[vIdx] = { ...copy[vIdx], is_default: e.target.checked };
                                    setFormData({ ...formData, details: { ...formData.details, variants: copy } });
                                  }}
                                /> Default
                              </label>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                onClick={() => {
                                  const copy = formData.details.variants.filter((_: any, idx: number) => idx !== vIdx);
                                  setFormData({ ...formData, details: { ...formData.details, variants: copy } });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {vertical === "hotels" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Room Category</Label>
                    <Select
                      value={formData.category_id || (formData.details.room_category_id ? String(formData.details.room_category_id) : "")}
                      onValueChange={(val) => setFormData({
                        ...formData,
                        category_id: val,
                        subcategory_id: "",
                        details: { ...formData.details, room_category_id: Number(val), room_type_id: undefined }
                      })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Room Category" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("room_categories").map((rc: any) => (
                          <SelectItem key={rc.id} value={String(rc.id)}>{rc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Room Subcategory</Label>
                    <Select
                      value={formData.subcategory_id || (formData.details.room_subcategory_id ? String(formData.details.room_subcategory_id) : "")}
                      onValueChange={(val) => setFormData({
                        ...formData,
                        subcategory_id: val,
                        details: { ...formData.details, room_subcategory_id: Number(val), room_type_id: undefined }
                      })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Subcategory" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("room_subcategories")
                          .filter((sc: any) => !formData.category_id || sc.parent_id === Number(formData.category_id))
                          .map((sc: any) => (
                            <SelectItem key={sc.id} value={String(sc.id)}>{sc.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Room Type</Label>
                    <Select
                      value={formData.details.room_type_id ? String(formData.details.room_type_id) : ""}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, room_type_id: Number(val) } })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Room Type" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("room_types")
                          .filter((rt: any) => !formData.subcategory_id || rt.parent_id === Number(formData.subcategory_id))
                          .map((rt: any) => (
                            <SelectItem key={rt.id} value={String(rt.id)}>{rt.name}</SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Bed Type</Label>
                    <Select
                      value={formData.details.bed_type_id ? String(formData.details.bed_type_id) : ""}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, bed_type_id: Number(val) } })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Bed Type" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("bed_types").map((bt: any) => (
                          <SelectItem key={bt.id} value={String(bt.id)}>{bt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>View Type</Label>
                    <Select
                      value={formData.details.view_type_id ? String(formData.details.view_type_id) : ""}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, view_type_id: Number(val) } })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select View Type" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("view_types").map((vt: any) => (
                          <SelectItem key={vt.id} value={String(vt.id)}>{vt.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Meal Plan</Label>
                    <Select
                      value={formData.details.meal_plan_id ? String(formData.details.meal_plan_id) : ""}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, meal_plan_id: Number(val) } })}
                    >
                      <SelectTrigger><SelectValue placeholder="Select Meal Plan" /></SelectTrigger>
                      <SelectContent>
                        {getOptions("meal_plans").map((mp: any) => (
                          <SelectItem key={mp.id} value={String(mp.id)}>{mp.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Room Number / Suite Name</Label>
                    <Input
                      placeholder="e.g. 301 / Presidential Suite"
                      value={formData.details.room_number || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, room_number: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Room Size (Sq Ft)</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 450"
                      value={formData.details.room_size_sqft || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, room_size_sqft: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Number of Beds</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 1"
                      value={formData.details.number_of_beds || "1"}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, number_of_beds: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Max Adults</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 2"
                      value={formData.details.max_adults || "2"}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, max_adults: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Max Children</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 1"
                      value={formData.details.max_children || "1"}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, max_children: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Weekend Price Per Night ({currencyCode || "INR"})</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 5200"
                      value={formData.details.weekend_price || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, weekend_price: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Seasonal Price Per Night ({currencyCode || "INR"})</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 6500"
                      value={formData.details.seasonal_price || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, seasonal_price: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Extra Guest Charge ({currencyCode || "INR"})</Label>
                    <Input
                      type="number"
                      placeholder="e.g. 800"
                      value={formData.details.extra_guest_charge || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, extra_guest_charge: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Check-in Time</Label>
                    <Input
                      value={formData.details.check_in_time || "14:00"}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, check_in_time: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Check-out Time</Label>
                    <Input
                      value={formData.details.check_out_time || "11:00"}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, check_out_time: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-3">
                    <Label>Cancellation Policy</Label>
                    <Input
                      placeholder="e.g. Free cancellation up to 24 hours before check-in"
                      value={formData.details.cancellation_policy || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, cancellation_policy: e.target.value } })}
                    />
                  </div>
                </div>
              )}

              {vertical === "events" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>Event Category</Label>
                      <Select
                        value={formData.category_id || (formData.details.event_category_id ? String(formData.details.event_category_id) : "")}
                        onValueChange={(val) => setFormData({
                          ...formData,
                          category_id: val,
                          subcategory_id: "",
                          details: { ...formData.details, event_category_id: Number(val) }
                        })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select Event Category" /></SelectTrigger>
                        <SelectContent>
                          {getOptions("event_categories").map((ec: any) => (
                            <SelectItem key={ec.id} value={String(ec.id)}>{ec.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Event Subcategory</Label>
                      <Select
                        value={formData.subcategory_id || (formData.details.event_subcategory_id ? String(formData.details.event_subcategory_id) : "")}
                        onValueChange={(val) => setFormData({
                          ...formData,
                          subcategory_id: val,
                          details: { ...formData.details, event_subcategory_id: Number(val) }
                        })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select Subcategory" /></SelectTrigger>
                        <SelectContent>
                          {getOptions("event_subcategories")
                            .filter((sc: any) => !formData.category_id || sc.parent_id === Number(formData.category_id))
                            .map((sc: any) => (
                              <SelectItem key={sc.id} value={String(sc.id)}>{sc.name}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Event Type</Label>
                      <Select
                        value={formData.details.event_type_id ? String(formData.details.event_type_id) : ""}
                        onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, event_type_id: Number(val) } })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select Event Type" /></SelectTrigger>
                        <SelectContent>
                          {getOptions("event_types").map((et: any) => (
                            <SelectItem key={et.id} value={String(et.id)}>{et.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Event Format</Label>
                      <Select
                        value={formData.details.event_format_id ? String(formData.details.event_format_id) : ""}
                        onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, event_format_id: Number(val) } })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select Format" /></SelectTrigger>
                        <SelectContent>
                          {getOptions("event_formats").map((ef: any) => (
                            <SelectItem key={ef.id} value={String(ef.id)}>{ef.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Audience Type</Label>
                      <Select
                        value={formData.details.audience_type_id ? String(formData.details.audience_type_id) : ""}
                        onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, audience_type_id: Number(val) } })}
                      >
                        <SelectTrigger><SelectValue placeholder="Select Audience" /></SelectTrigger>
                        <SelectContent>
                          {getOptions("audience_types").map((at: any) => (
                            <SelectItem key={at.id} value={String(at.id)}>{at.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Organizer Name</Label>
                      <Input
                        placeholder="e.g. Apex Events / Organizers"
                        value={formData.details.organizer_name || ""}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, organizer_name: e.target.value } })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Start Date</Label>
                      <Input
                        type="date"
                        value={formData.details.start_date || ""}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, start_date: e.target.value } })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>End Date</Label>
                      <Input
                        type="date"
                        value={formData.details.end_date || ""}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, end_date: e.target.value } })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>Start Time</Label>
                      <Input
                        type="time"
                        value={formData.details.start_time || "10:00"}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, start_time: e.target.value } })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>End Time</Label>
                      <Input
                        type="time"
                        value={formData.details.end_time || "17:00"}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, end_time: e.target.value } })}
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Venue Name & Address</Label>
                      <Input
                        placeholder="e.g. Grand Convention Centre, Cantonment, Varanasi"
                        value={formData.details.venue_name || ""}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, venue_name: e.target.value } })}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label>City</Label>
                      <Input
                        placeholder="e.g. Varanasi"
                        value={formData.details.city || ""}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, city: e.target.value } })}
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Online Meeting / Webinar URL (if Virtual/Hybrid)</Label>
                      <Input
                        placeholder="https://zoom.us/j/... or https://meet.google.com/..."
                        value={formData.details.online_meeting_url || ""}
                        onChange={(e) => setFormData({ ...formData, details: { ...formData.details, online_meeting_url: e.target.value } })}
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-6">
                      <Switch
                        checked={Boolean(formData.details.is_free)}
                        onCheckedChange={(val) => setFormData({ ...formData, details: { ...formData.details, is_free: val } })}
                      />
                      <Label className="cursor-pointer">This is a Free Event</Label>
                    </div>
                  </div>

                  {!formData.details.is_free && (
                    <div className="border rounded-xl p-4 space-y-3 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <div>
                          <h5 className="text-sm font-semibold">Event Tickets & Pricing Tiers</h5>
                          <p className="text-xs text-muted-foreground">Define paid ticket classes, admission fees, and attendee capacities.</p>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="gap-1 text-xs"
                          onClick={() => {
                            const currentTix = Array.isArray(formData.details.tickets) ? formData.details.tickets : [];
                            setFormData({
                              ...formData,
                              details: {
                                ...formData.details,
                                tickets: [...currentTix, { name: "", price: "", total_capacity: "100" }]
                              }
                            });
                          }}
                        >
                          <Plus className="h-3.5 w-3.5" /> Add Ticket Tier
                        </Button>
                      </div>

                      {Array.isArray(formData.details.tickets) && formData.details.tickets.length > 0 && (
                        <div className="space-y-2">
                          {formData.details.tickets.map((t: any, tIdx: number) => (
                            <div key={tIdx} className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center bg-background p-2.5 rounded-lg border">
                              <Input
                                placeholder="Ticket Name (e.g. VIP Pass, Early Bird)"
                                value={t.name || ""}
                                onChange={(e) => {
                                  const copy = [...formData.details.tickets];
                                  copy[tIdx] = { ...copy[tIdx], name: e.target.value };
                                  setFormData({ ...formData, details: { ...formData.details, tickets: copy } });
                                }}
                              />
                              <Input
                                type="number"
                                placeholder={`Price (${currencyCode || "INR"})`}
                                value={t.price || ""}
                                onChange={(e) => {
                                  const copy = [...formData.details.tickets];
                                  copy[tIdx] = { ...copy[tIdx], price: e.target.value };
                                  setFormData({ ...formData, details: { ...formData.details, tickets: copy } });
                                }}
                              />
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  placeholder="Capacity (Seats)"
                                  value={t.total_capacity || ""}
                                  onChange={(e) => {
                                    const copy = [...formData.details.tickets];
                                    copy[tIdx] = { ...copy[tIdx], total_capacity: e.target.value };
                                    setFormData({ ...formData, details: { ...formData.details, tickets: copy } });
                                  }}
                                />
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive shrink-0"
                                  onClick={() => {
                                    const copy = formData.details.tickets.filter((_: any, idx: number) => idx !== tIdx);
                                    setFormData({ ...formData, details: { ...formData.details, tickets: copy } });
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {vertical === "education" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Admission Number</Label>
                    <Input
                      placeholder="e.g. MSI-2026-001"
                      value={formData.details.admission_number || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, admission_number: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Class / Grade</Label>
                    <Input
                      placeholder="e.g. Class 12 / B.Sc Year 2"
                      value={formData.details.class_grade || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, class_grade: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Section</Label>
                    <Input
                      placeholder="e.g. Section A"
                      value={formData.details.section || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, section: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Guardian Name</Label>
                    <Input
                      placeholder="e.g. Ramesh Sharma"
                      value={formData.details.guardian_name || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, guardian_name: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Guardian Contact</Label>
                    <Input
                      placeholder="e.g. +91 98765 44332"
                      value={formData.details.guardian_phone || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, guardian_phone: e.target.value } })}
                    />
                  </div>
                </div>
              )}

              {vertical === "healthcare" && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Patient Identifier</Label>
                    <Input
                      placeholder="e.g. PT-2026-101"
                      value={formData.details.patient_identifier || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, patient_identifier: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>Blood Group</Label>
                    <Select
                      value={formData.details.blood_group || "B+"}
                      onValueChange={(val) => setFormData({ ...formData, details: { ...formData.details, blood_group: val } })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
                          <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label>Assigned Doctor</Label>
                    <Input
                      placeholder="e.g. Dr. S. K. Verma, MD"
                      value={formData.details.assigned_doctor || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, assigned_doctor: e.target.value } })}
                    />
                  </div>

                  <div className="space-y-1.5 md:col-span-3">
                    <Label>Known Allergies / Medical Alerts</Label>
                    <Input
                      placeholder="e.g. Penicillin, Sulfa drugs, Asthmatic"
                      value={formData.details.known_allergies || ""}
                      onChange={(e) => setFormData({ ...formData, details: { ...formData.details, known_allergies: e.target.value } })}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Dynamic Custom Attributes Configured by Admin */}
            {formConfig?.attributes?.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold uppercase tracking-wider text-primary border-b pb-1 flex items-center justify-between">
                  <span>3. Dynamic Custom Attributes</span>
                  <Badge variant="outline" className="text-[10px]">Managed by Admin</Badge>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formConfig.attributes.map((attr: any) => (
                    <div key={attr.id} className="space-y-1.5">
                      <Label className="flex items-center gap-1">
                        {attr.label || attr.name}
                        {attr.is_required && <span className="text-destructive">*</span>}
                      </Label>
                      {attr.field_type === "select" && Array.isArray(attr.options) ? (
                        <Select
                          value={formData.custom_attributes[attr.name] || ""}
                          onValueChange={(val) => setFormData({
                            ...formData,
                            custom_attributes: { ...formData.custom_attributes, [attr.name]: val }
                          })}
                        >
                          <SelectTrigger><SelectValue placeholder={attr.placeholder || "Select"} /></SelectTrigger>
                          <SelectContent>
                            {attr.options.map((opt: string) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          type={attr.field_type === "number" ? "number" : "text"}
                          placeholder={attr.placeholder || `Enter ${attr.label}`}
                          value={formData.custom_attributes[attr.name] || ""}
                          onChange={(e) => setFormData({
                            ...formData,
                            custom_attributes: { ...formData.custom_attributes, [attr.name]: e.target.value }
                          })}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter className="pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => setFormDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="gap-2">
                {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {selectedRecord ? "Save Changes" : "Create Record"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* VIEW DETAILS DIALOG */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedRecord && (
            <div className="space-y-5">
              <DialogHeader>
                <div className="flex items-center justify-between gap-2">
                  <DialogTitle className="text-xl font-bold">{selectedRecord.title}</DialogTitle>
                  <Badge variant={selectedRecord.status === "published" ? "default" : "secondary"} className="capitalize">
                    {selectedRecord.status}
                  </Badge>
                </div>
                <DialogDescription className="font-mono text-xs">
                  ID: #{selectedRecord.id} • Slug: /{selectedRecord.slug}
                </DialogDescription>
              </DialogHeader>

              {selectedRecord.featured_image && (
                <div className="h-56 w-full rounded-xl overflow-hidden border">
                  <img src={selectedRecord.featured_image} alt={selectedRecord.title} className="h-full w-full object-cover" />
                </div>
              )}

              <div className="p-4 rounded-xl bg-muted/40 border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Selling / Booking Price</span>
                  <span className="text-xl font-bold text-primary">
                    {formatCurrencyPrice(selectedRecord.price, selectedRecord.currency)}
                  </span>
                </div>
                {selectedRecord.description && (
                  <p className="text-sm text-foreground/90 whitespace-pre-line border-t pt-2">
                    {selectedRecord.description}
                  </p>
                )}
              </div>

              {/* Specific Details */}
              {selectedRecord.details && (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Specifications & Configuration</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(selectedRecord.details).map(([k, v]) => {
                      if (v === null || v === undefined || typeof v === "object") return null;
                      return (
                        <div key={k} className="p-2.5 rounded-lg border bg-card flex justify-between items-center">
                          <span className="text-muted-foreground capitalize">{k.replace(/_/g, " ")}:</span>
                          <span className="font-medium text-foreground">{String(v)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Audit History */}
              {selectedRecord.audit_logs?.length > 0 && (
                <div className="space-y-2 border-t pt-3">
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Audit Log History</h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {selectedRecord.audit_logs.map((log: any) => (
                      <div key={log.id} className="text-xs p-2 rounded bg-muted/30 flex items-center justify-between">
                        <span className="font-medium capitalize text-primary">{log.action}</span>
                        <span className="text-muted-foreground font-mono">{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* BULK IMPORT DIALOG */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" />
              Bulk Import {title} via CSV
            </DialogTitle>
            <DialogDescription>
              Paste comma-separated rows with a header line (e.g. title, price, description, color, location).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <Textarea
              rows={8}
              className="font-mono text-xs"
              placeholder={`title,price,description,color,location\nSample Item 1,450000,Great condition,White,Varanasi\nSample Item 2,850000,Premium unit,Black,Varanasi`}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleImportCSV} disabled={importing} className="gap-2">
              {importing ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Start Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
