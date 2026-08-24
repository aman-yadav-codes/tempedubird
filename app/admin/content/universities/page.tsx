"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Loader2,
  Trash2,
  RefreshCw,
  Power,
  PowerOff,
  Search,
  Edit2,
  ExternalLink,
  MapPin,
  Award,
  Calendar,
  Globe,
  MoreHorizontal,
  Upload,
  X,
  Eye,
  School,
  Sparkles,
  Landmark,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { University, UniversityType } from "@/lib/types/university";

function toSlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

const UNIVERSITY_TYPES: { label: string; value: UniversityType }[] = [
  { label: "Central University", value: "central" },
  { label: "State University", value: "state" },
  { label: "Institute of National Importance", value: "institute_of_national_importance" },
  { label: "Deemed to be University", value: "deemed" },
  { label: "Private University", value: "private" },
  { label: "Autonomous Institution", value: "autonomous" },
  { label: "International University", value: "international" },
];

const typeBadgeStyles: Record<string, { bg: string; text: string; border: string; label: string }> = {
  central: { bg: "bg-purple-500/10", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/30", label: "Central University" },
  state: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", border: "border-blue-500/30", label: "State University" },
  institute_of_national_importance: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", border: "border-amber-500/30", label: "Institute of National Importance" },
  deemed: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-500/30", label: "Deemed University" },
  private: { bg: "bg-slate-500/10", text: "text-slate-600 dark:text-slate-400", border: "border-slate-500/30", label: "Private University" },
  autonomous: { bg: "bg-indigo-500/10", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-500/30", label: "Autonomous Institution" },
  international: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", border: "border-rose-500/30", label: "International University" },
};

export default function UniversitiesPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();

  // Table state
  const [universities, setUniversities] = useState<University[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [activeToggleLoadingId, setActiveToggleLoadingId] = useState<number | null>(null);

  // Dialog state (Add / Edit)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<University | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [code, setCode] = useState("");
  const [universityType, setUniversityType] = useState<UniversityType>("central");
  const [country, setCountry] = useState("India");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [establishedYear, setEstablishedYear] = useState("");
  const [accreditation, setAccreditation] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Logo upload state
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [logoInputMode, setLogoInputMode] = useState<"upload" | "url">("upload");
  const logoInputRef = useRef<HTMLInputElement>(null);

  // View Sheet state
  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [viewingUniversity, setViewingUniversity] = useState<University | null>(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<University | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((p) => ({ ...p, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const authHeader = useMemo(() => {
    return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
  }, [accessToken]);

  const fetchUniversities = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
        search: debouncedSearch,
      });
      if (typeFilter && typeFilter !== "all") {
        params.append("type", typeFilter);
      }

      const res = await fetch(`/api/admin/universities?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await res.json();
      if (res.ok) {
        setUniversities(json.data || []);
        setTotalCount(json.total || 0);
        setPageCount(json.pageCount || 0);
      } else {
        toast.error(json.error || "Failed to load universities");
      }
    } catch {
      toast.error("Network error while fetching universities");
    } finally {
      setLoading(false);
    }
  }, [accessToken, pagination, debouncedSearch, typeFilter, authHeader]);

  useEffect(() => {
    if (isReady && accessToken) {
      fetchUniversities();
    }
  }, [isReady, accessToken, fetchUniversities]);

  const resetForm = () => {
    setEditingUniversity(null);
    setName("");
    setSlug("");
    setCode("");
    setUniversityType("central");
    setCountry("India");
    setState("");
    setCity("");
    setWebsiteUrl("");
    setLogoUrl("");
    setEstablishedYear("");
    setAccreditation("");
    setDescription("");
    setLogoInputMode("upload");
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (item: University) => {
    setEditingUniversity(item);
    setName(item.name);
    setSlug(item.slug);
    setCode(item.code || "");
    setUniversityType((item.university_type as UniversityType) || "central");
    setCountry(item.country || "India");
    setState(item.state || "");
    setCity(item.city || "");
    setWebsiteUrl(item.website_url || "");
    setLogoUrl(item.logo_url || "");
    setEstablishedYear(item.established_year ? String(item.established_year) : "");
    setAccreditation(item.accreditation || "");
    setDescription(item.description || "");
    setLogoInputMode(item.logo_url ? "upload" : "upload");
    setDialogOpen(true);
  };

  const openViewSheet = (item: University) => {
    setViewingUniversity(item);
    setViewSheetOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingUniversity) {
      setSlug(toSlug(val));
    }
  };

  const handleLogoUpload = async (file: File) => {
    if (!file.type.match(/^image\/(png|jpe?g|webp|svg\+xml)$/)) {
      return toast.error("Only WebP, SVG, PNG, and JPEG images are allowed");
    }
    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Image file must be under 5MB");
    }

    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "universities");

      const res = await fetch("/api/admin/content/media", {
        method: "POST",
        headers: authHeader,
        body: formData,
      });
      const json = await res.json();
      if (res.ok && (json.url || json.data?.url)) {
        const uploadedUrl = json.url || json.data?.url;
        setLogoUrl(uploadedUrl);
        toast.success("University logo uploaded successfully");
      } else {
        toast.error(json.error || "Failed to upload logo");
      }
    } catch {
      toast.error("Network error during logo upload");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      return toast.error("University Name is required");
    }

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || toSlug(name),
        code: code.trim() || null,
        university_type: universityType,
        country: country.trim() || "India",
        state: state.trim() || null,
        city: city.trim() || null,
        website_url: websiteUrl.trim() || null,
        logo_url: logoUrl.trim() || null,
        established_year: establishedYear ? Number(establishedYear) : null,
        accreditation: accreditation.trim() || null,
        description: description.trim() || null,
        is_active: true,
      };

      if (editingUniversity) {
        const res = await fetch(`/api/admin/universities/${editingUniversity.id}`, {
          method: "PATCH",
          headers: { ...authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (res.ok) {
          toast.success("University updated successfully");
          setDialogOpen(false);
          fetchUniversities();
        } else {
          toast.error(json.error || "Failed to update university");
        }
      } else {
        const res = await fetch("/api/admin/universities", {
          method: "POST",
          headers: { ...authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (res.ok) {
          toast.success("University created successfully");
          setDialogOpen(false);
          fetchUniversities();
        } else {
          toast.error(json.error || "Failed to create university");
        }
      }
    } catch {
      toast.error("Network error while saving university");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: University) => {
    setActiveToggleLoadingId(item.id);
    try {
      const res = await fetch(`/api/admin/universities/${item.id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.is_active }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`University ${!item.is_active ? "enabled" : "disabled"}`);
        fetchUniversities();
      } else {
        toast.error(json.error || "Failed to update status");
      }
    } catch {
      toast.error("Network error while updating status");
    } finally {
      setActiveToggleLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/universities/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("University removed successfully");
        setDeleteTarget(null);
        fetchUniversities();
      } else {
        toast.error(json.error || "Failed to delete university");
      }
    } catch {
      toast.error("Network error while deleting university");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkStatus = async (selectedRows: University[], active: boolean) => {
    const ids = selectedRows.map((r) => r.id);
    if (ids.length === 0) return;
    try {
      const res = await fetch("/api/admin/universities", {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ ids, isActive: active }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`Updated status for ${ids.length} universities`);
        fetchUniversities();
      } else {
        toast.error(json.error || "Failed to update status");
      }
    } catch {
      toast.error("Network error while updating status");
    }
  };

  const handleBulkDelete = async (selectedRows: University[]) => {
    const ids = selectedRows.map((r) => r.id);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/admin/universities", {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ ids, softDelete: true }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(`Deleted ${ids.length} universities`);
        fetchUniversities();
      } else {
        toast.error(json.error || "Failed to delete universities");
      }
    } catch {
      toast.error("Network error while deleting universities");
    } finally {
      setBulkDeleting(false);
    }
  };

  const stats = useMemo(() => {
    const active = universities.filter((u) => u.is_active).length;
    const central = universities.filter((u) => u.university_type === "central" || u.university_type === "institute_of_national_importance").length;
    const stateType = universities.filter((u) => u.university_type === "state" || u.university_type === "deemed").length;
    return { total: totalCount, active, central, stateType };
  }, [universities, totalCount]);

  const columns: ColumnDef<University>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() ? true : table.getIsSomePageRowsSelected() ? "indeterminate" : false}
          onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(val) => row.toggleSelected(!!val)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      id: "no",
      header: "No.",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground font-medium">
          {pagination.pageIndex * pagination.pageSize + row.index + 1}
        </span>
      ),
    },
    {
      id: "name",
      header: "University / Institution",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl border bg-muted/20 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-2xs">
              {u.logo_url ? (
                <img
                  src={u.logo_url}
                  alt={u.name}
                  className="h-full w-full object-contain p-1"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = "none";
                  }}
                />
              ) : (
                <Building2 className="h-4 w-4 text-primary" />
              )}
            </div>
            <div className="flex flex-col min-w-0 max-w-[260px]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-xs text-foreground truncate" title={u.name}>
                  {u.name}
                </span>
                {u.code && (
                  <Badge variant="outline" className="text-[10px] py-0 px-1 font-semibold bg-muted/40">
                    {u.code}
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-muted-foreground font-mono truncate">{u.slug}</span>
            </div>
          </div>
        );
      },
    },
    {
      id: "type",
      header: "University Type",
      cell: ({ row }) => {
        const type = row.original.university_type || "central";
        const config = typeBadgeStyles[type] || {
          bg: "bg-muted",
          text: "text-foreground",
          border: "border-border",
          label: type,
        };
        return (
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold uppercase px-2 py-0.5 border ${config.bg} ${config.text} ${config.border}`}
          >
            {config.label}
          </Badge>
        );
      },
    },
    {
      id: "location",
      header: "Location",
      cell: ({ row }) => {
        const u = row.original;
        const locationText = [u.city, u.state, u.country].filter(Boolean).join(", ");
        return locationText ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-medium truncate max-w-[200px]" title={locationText}>
            <MapPin className="h-3.5 w-3.5 text-rose-500 shrink-0" />
            <span>{locationText}</span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">-</span>
        );
      },
    },
    {
      id: "accreditation",
      header: "Accreditation & Est.",
      cell: ({ row }) => {
        const u = row.original;
        return (
          <div className="flex flex-col gap-0.5 text-xs">
            {u.accreditation ? (
              <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold truncate max-w-[180px]" title={u.accreditation}>
                <Award className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{u.accreditation}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
            {u.established_year && (
              <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Est. {u.established_year}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "website",
      header: "Website",
      cell: ({ row }) => {
        const url = row.original.website_url;
        if (!url) return <span className="text-xs text-muted-foreground">-</span>;
        return (
          <a
            href={url.startsWith("http") ? url : `https://${url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
          >
            <Globe className="h-3.5 w-3.5" />
            <span>Visit</span>
            <ExternalLink className="h-3 w-3" />
          </a>
        );
      },
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const active = row.original.is_active;
        return (
          <Badge
            variant={active ? "default" : "secondary"}
            className={
              active
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold"
                : "bg-muted text-muted-foreground text-xs font-semibold"
            }
          >
            {active ? "Active" : "Disabled"}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const item = row.original;
        const active = item.is_active;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground font-semibold">
                University Options
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openViewSheet(item)} className="text-xs gap-2 cursor-pointer font-medium">
                <Eye className="h-3.5 w-3.5 text-primary" />
                View Overview
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => openEditDialog(item)} className="text-xs gap-2 cursor-pointer font-medium">
                <Edit2 className="h-3.5 w-3.5 text-foreground/80" />
                Edit University
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleToggleActive(item)}
                disabled={activeToggleLoadingId === item.id}
                className="text-xs gap-2 cursor-pointer font-medium"
              >
                {active ? (
                  <>
                    <PowerOff className="h-3.5 w-3.5 text-amber-500" />
                    <span>Disable</span>
                  </>
                ) : (
                  <>
                    <Power className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Enable</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteTarget(item)}
                className="text-xs gap-2 text-destructive focus:text-destructive cursor-pointer font-medium"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete University
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
            <Building2 className="h-6 w-6 text-primary" />
            Universities & Degree Institutions
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage central, state, deemed, and autonomous universities for degree programs and higher academic certifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            <Plus className="mr-2 h-4 w-4" /> Add University
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="rounded-2xl border bg-card/60 shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Universities</p>
              <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.total}</h3>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
              <Landmark className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Universities</p>
              <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">{stats.active}</h3>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <School className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Central & Nat. Inst.</p>
              <h3 className="text-2xl font-bold mt-1 text-purple-600 dark:text-purple-400">{stats.central}</h3>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <GraduationCap className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">State & Deemed</p>
              <h3 className="text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">{stats.stateType}</h3>
            </div>
            <div className="h-11 w-11 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <Award className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="rounded-2xl border bg-card/60 shadow-2xs">
        <CardContent className="p-6 space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search university by name, code, or city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background/80"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 text-xs w-[180px] bg-background/80">
                  <SelectValue placeholder="All University Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {UNIVERSITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-xs">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="icon"
                onClick={fetchUniversities}
                disabled={loading}
                title="Refresh Universities"
                className="h-9 w-9 shrink-0"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* DataTable */}
          <DataTable
            columns={columns}
            data={universities}
            loading={loading}
            searchKey="name"
            pageCount={pageCount}
            pagination={pagination}
            onPaginationChange={setPagination}
            selectedActions={(selectedRows, resetSelection) => {
              const rows = selectedRows;
              return (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-medium text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                    onClick={async () => {
                      await handleBulkStatus(rows, true);
                      resetSelection();
                    }}
                  >
                    <Power className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                    Enable ({rows.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs font-medium text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
                    onClick={async () => {
                      await handleBulkStatus(rows, false);
                      resetSelection();
                    }}
                  >
                    <PowerOff className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                    Disable ({rows.length})
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 text-xs font-medium"
                    onClick={async () => {
                      await handleBulkDelete(rows);
                      resetSelection();
                    }}
                    disabled={bulkDeleting}
                  >
                    {bulkDeleting ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    Delete ({rows.length})
                  </Button>
                </div>
              );
            }}
          />
        </CardContent>
      </Card>

      {/* Add / Edit University Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {editingUniversity ? "Edit University" : "Add University / Degree Institution"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Define higher education universities, accreditation details, and campus locations.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold">University / Institution Name *</Label>
                <Input
                  placeholder="e.g. University of Delhi (DU)"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Acronym / Code</Label>
                <Input
                  placeholder="e.g. DU, IITB"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">URL Slug *</Label>
                <Input
                  placeholder="e.g. university-of-delhi"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">University Type *</Label>
                <Select value={universityType} onValueChange={(val: any) => setUniversityType(val)}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIVERSITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">City</Label>
                <Input placeholder="e.g. New Delhi" value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">State / Region</Label>
                <Input placeholder="e.g. Delhi" value={state} onChange={(e) => setState(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Country</Label>
                <Input placeholder="e.g. India" value={country} onChange={(e) => setCountry(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Official Website</Label>
                <Input
                  placeholder="e.g. https://www.du.ac.in"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Established Year</Label>
                <Input
                  type="number"
                  placeholder="e.g. 1922"
                  value={establishedYear}
                  onChange={(e) => setEstablishedYear(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Accreditations & NIRF Ranking</Label>
              <Input
                placeholder="e.g. NAAC A++ | UGC Approved | NIRF Top 10"
                value={accreditation}
                onChange={(e) => setAccreditation(e.target.value)}
              />
            </div>

            {/* University Logo Upload / URL */}
            <div className="space-y-2 pt-1 border-t">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">University Emblem / Logo</Label>
                <div className="flex items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setLogoInputMode("upload")}
                    className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                      logoInputMode === "upload" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setLogoInputMode("url")}
                    className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                      logoInputMode === "url" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Direct URL
                  </button>
                </div>
              </div>

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
                  {logoUrl ? (
                    <div className="relative p-3 rounded-xl border bg-muted/20 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={logoUrl}
                          alt="University logo"
                          className="h-10 w-10 object-contain rounded border bg-background p-1 shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <div className="flex flex-col min-w-0 text-xs">
                          <span className="font-bold text-foreground">Uploaded Logo</span>
                          <span className="text-muted-foreground truncate max-w-[200px]">{logoUrl}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={uploadingLogo}
                        >
                          Change
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => setLogoUrl("")}
                        >
                          <X className="h-3.5 w-3.5" />
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
                      className={`cursor-pointer border-2 border-dashed rounded-xl p-3.5 text-center transition-all ${
                        isDraggingLogo ? "border-primary bg-primary/10" : "border-border/80 hover:border-primary/50 hover:bg-muted/30"
                      } ${uploadingLogo ? "pointer-events-none opacity-60" : ""}`}
                    >
                      {uploadingLogo ? (
                        <div className="flex items-center justify-center gap-2 py-2">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          <span className="text-xs font-semibold">Uploading emblem...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-1">
                          <Upload className="h-5 w-5 text-primary" />
                          <span className="text-xs font-bold text-foreground">Click to upload university emblem</span>
                          <span className="text-[10px] text-muted-foreground">WebP, SVG, PNG, JPEG up to 5MB</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Input
                  placeholder="Paste direct URL e.g. https://.../du-logo.png"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">About / Description</Label>
              <Textarea
                placeholder="Key academic faculties, research strengths, and historical background..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground font-semibold">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingUniversity ? "Save Changes" : "Create University"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View University Overview Sheet */}
      <Sheet open={viewSheetOpen} onOpenChange={setViewSheetOpen}>
        <SheetContent className="max-w-md w-full overflow-y-auto p-6 space-y-5">
          <SheetHeader className="p-0 space-y-2">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl border bg-muted/20 flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                {viewingUniversity?.logo_url ? (
                  <img
                    src={viewingUniversity.logo_url}
                    alt={viewingUniversity.name}
                    className="h-full w-full object-contain p-1"
                  />
                ) : (
                  <Building2 className="h-6 w-6 text-primary" />
                )}
              </div>
              <div>
                <SheetTitle className="text-base font-bold">{viewingUniversity?.name}</SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground font-mono">
                  {viewingUniversity?.slug}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {viewingUniversity && (
            <div className="space-y-4 text-xs">
              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Type:</span>
                  <Badge variant="outline" className="font-semibold uppercase text-[10px]">
                    {viewingUniversity.university_type}
                  </Badge>
                </div>
                {viewingUniversity.code && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Acronym / Code:</span>
                    <span className="font-bold text-foreground">{viewingUniversity.code}</span>
                  </div>
                )}
                {viewingUniversity.established_year && (
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground font-medium">Established:</span>
                    <span className="font-bold text-foreground">Year {viewingUniversity.established_year}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground font-medium">Location:</span>
                  <span className="font-bold text-foreground">
                    {[viewingUniversity.city, viewingUniversity.state, viewingUniversity.country].filter(Boolean).join(", ")}
                  </span>
                </div>
              </div>

              {viewingUniversity.accreditation && (
                <div className="p-3 rounded-xl border bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300 space-y-1">
                  <span className="font-bold block flex items-center gap-1.5">
                    <Award className="h-4 w-4" /> Accreditations & Rankings
                  </span>
                  <p className="text-[11px] font-medium">{viewingUniversity.accreditation}</p>
                </div>
              )}

              {viewingUniversity.website_url && (
                <div className="p-3 rounded-xl border bg-card flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <Globe className="h-4 w-4 text-primary shrink-0" />
                    <span className="truncate text-foreground font-medium">{viewingUniversity.website_url}</span>
                  </div>
                  <a
                    href={viewingUniversity.website_url.startsWith("http") ? viewingUniversity.website_url : `https://${viewingUniversity.website_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 font-bold shrink-0"
                  >
                    Open <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {viewingUniversity.description && (
                <div className="space-y-1.5">
                  <Label className="font-bold text-foreground">About Institution</Label>
                  <p className="text-muted-foreground leading-relaxed text-xs p-3 rounded-xl border bg-card/60">
                    {viewingUniversity.description}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <Button
                  onClick={() => {
                    setViewSheetOpen(false);
                    openEditDialog(viewingUniversity);
                  }}
                  className="w-full bg-primary text-primary-foreground font-semibold"
                >
                  <Edit2 className="mr-2 h-4 w-4" /> Edit University Details
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
              Delete University
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong className="text-foreground">{deleteTarget?.name}</strong> from the universities catalog?
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
