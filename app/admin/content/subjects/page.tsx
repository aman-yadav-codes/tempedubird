"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import {
  GraduationCap,
  Plus,
  Loader2,
  Trash2,
  RefreshCw,
  Power,
  PowerOff,
  Search,
  Edit2,
  BookOpen,
  MoreHorizontal,
  Upload,
  X,
  ImageIcon,
  ListPlus,
  ClipboardPaste,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Subject } from "@/lib/types/subject";

function toSlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function SubjectsPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();

  // Table state
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [activeToggleLoadingId, setActiveToggleLoadingId] = useState<number | null>(null);

  // Dialog state (Add / Edit)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [courseId, setCourseId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectSlug, setSubjectSlug] = useState("");
  const [subjectIcon, setSubjectIcon] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Multi-subject creation state with per-subject icon upload
  const [subjectRows, setSubjectRows] = useState<
    { id: string; name: string; code: string; icon_url: string; uploading?: boolean }[]
  >([{ id: "1", name: "", code: "", icon_url: "" }]);
  const [bulkInputText, setBulkInputText] = useState("");
  const [showBulkPaste, setShowBulkPaste] = useState(false);

  // Icon upload state
  const [uploadingIcon, setUploadingIcon] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const fetchSubjects = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);

      const res = await fetch(`/api/admin/subjects?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await res.json();
      if (res.ok) {
        setSubjects(json.data || []);
        setPageCount(json.pageCount || 0);
        setTotalCount(json.total || 0);
      } else {
        toast.error(json.error || "Failed to load subjects");
      }
    } catch {
      toast.error("Network error while loading subjects");
    } finally {
      setLoading(false);
    }
  }, [accessToken, pagination.pageIndex, pagination.pageSize, debouncedSearch, authHeader]);

  useEffect(() => {
    if (isReady && accessToken) {
      fetchSubjects();
    }
  }, [isReady, accessToken, fetchSubjects]);

  const addSubjectRow = () => {
    setSubjectRows((prev) => [
      ...prev,
      { id: String(Date.now() + Math.random()), name: "", code: "", icon_url: "" },
    ]);
  };

  const removeSubjectRow = (id: string) => {
    if (subjectRows.length <= 1) {
      setSubjectRows([{ id: "1", name: "", code: "", icon_url: "" }]);
      return;
    }
    setSubjectRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateSubjectRow = (
    id: string,
    field: "name" | "code" | "icon_url" | "uploading",
    value: any
  ) => {
    setSubjectRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const uploadIconForRow = async (rowId: string, file: File) => {
    if (!accessToken) {
      toast.error("Authentication required");
      return;
    }
    const allowed = ["image/webp", "image/svg+xml", "image/png", "image/jpeg", "image/jpg", "image/gif", "image/avif"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isAcceptedExt = ["webp", "svg", "png", "jpg", "jpeg", "gif", "avif"].includes(ext || "");
    if (!allowed.includes(file.type) && !isAcceptedExt) {
      toast.error("Please select a WebP, SVG, PNG, or JPEG image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB.");
      return;
    }

    updateSubjectRow(rowId, "uploading", true);
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
      const uploadedUrl = json.data?.url || json.url;
      if (res.ok && uploadedUrl) {
        updateSubjectRow(rowId, "icon_url", uploadedUrl);
        toast.success("Subject icon uploaded successfully");
      } else {
        toast.error(json.error || "Failed to upload icon");
      }
    } catch {
      toast.error("Failed to upload icon");
    } finally {
      updateSubjectRow(rowId, "uploading", false);
    }
  };

  const handleSingleIconUpload = async (file: File) => {
    if (!accessToken) {
      toast.error("Authentication required");
      return;
    }
    const allowed = ["image/webp", "image/svg+xml", "image/png", "image/jpeg", "image/jpg", "image/gif", "image/avif"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    const isAcceptedExt = ["webp", "svg", "png", "jpg", "jpeg", "gif", "avif"].includes(ext || "");
    if (!allowed.includes(file.type) && !isAcceptedExt) {
      toast.error("Please select a WebP, SVG, PNG, or JPEG image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB.");
      return;
    }

    setUploadingIcon(true);
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
      const uploadedUrl = json.data?.url || json.url;
      if (res.ok && uploadedUrl) {
        setSubjectIcon(uploadedUrl);
        toast.success("Subject icon uploaded successfully");
      } else {
        toast.error(json.error || "Failed to upload icon");
      }
    } catch {
      toast.error("Failed to upload icon");
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleApplyBulkPaste = () => {
    if (!bulkInputText.trim()) return;
    const names = bulkInputText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (names.length === 0) return;

    const newRows = names.map((n, i) => ({
      id: String(Date.now() + i),
      name: n,
      code: "",
      icon_url: "",
    }));

    setSubjectRows((prev) => {
      const filtered = prev.filter((r) => r.name.trim() !== "");
      return [...filtered, ...newRows];
    });

    setBulkInputText("");
    setShowBulkPaste(false);
    toast.success(`Added ${names.length} subjects to list`);
  };

  const resetForm = () => {
    setEditingSubject(null);
    setCourseId("");
    setSubjectName("");
    setSubjectCode("");
    setSubjectSlug("");
    setSubjectIcon("");
    setSubjectRows([{ id: "1", name: "", code: "", icon_url: "" }]);
    setBulkInputText("");
    setShowBulkPaste(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (item: Subject) => {
    setEditingSubject(item);
    setCourseId(item.course_id ? String(item.course_id) : "");
    setSubjectName(item.name);
    setSubjectCode(item.code || "");
    setSubjectSlug(item.slug);
    setSubjectIcon(item.icon_url || "");
    setSubjectRows([{ id: "1", name: item.name, code: item.code || "", icon_url: item.icon_url || "" }]);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSubject) {
      if (!subjectName.trim()) {
        return toast.error("Subject Name is required");
      }

      setSubmitting(true);
      try {
        const payload = {
          name: subjectName.trim(),
          slug: subjectSlug.trim() || toSlug(subjectName),
          code: subjectCode.trim() || null,
          icon_url: subjectIcon.trim() || null,
          courseId: courseId ? Number(courseId) : null,
          is_active: true,
        };

        const res = await fetch(`/api/admin/subjects/${editingSubject.id}`, {
          method: "PATCH",
          headers: { ...authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (res.ok) {
          toast.success("Subject updated successfully");
          setDialogOpen(false);
          fetchSubjects();
        } else {
          toast.error(json.error || "Failed to update subject");
        }
      } catch {
        toast.error("Network error while updating subject");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // Multi-subject create flow
    const validRows = subjectRows.filter((r) => r.name.trim().length > 0);
    if (validRows.length === 0) {
      return toast.error("Please add at least one subject name");
    }

    setSubmitting(true);
    try {
      const payload = {
        subjects: validRows.map((r) => ({
          name: r.name.trim(),
          code: r.code.trim() || null,
          slug: toSlug(r.name.trim()),
          icon_url: r.icon_url?.trim() || null,
          is_active: true,
        })),
      };

      const res = await fetch("/api/admin/subjects", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(
          validRows.length === 1
            ? "Subject created successfully"
            : `Successfully created ${json.count || validRows.length} subjects`
        );
        setDialogOpen(false);
        fetchSubjects();
      } else {
        toast.error(json.error || "Failed to create subjects");
      }
    } catch {
      toast.error("Network error while creating subjects");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (item: Subject) => {
    setActiveToggleLoadingId(item.id);
    try {
      const res = await fetch(`/api/admin/subjects/${item.id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.is_active }),
      });
      if (res.ok) {
        toast.success(item.is_active ? "Subject disabled" : "Subject enabled");
        await fetchSubjects();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to toggle status");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActiveToggleLoadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/subjects/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (res.ok) {
        toast.success("Subject deleted");
        setDeleteTarget(null);
        await fetchSubjects();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to delete subject");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkStatus = async (ids: number[], isActive: boolean) => {
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ ids, isActive }),
      });
      if (res.ok) {
        toast.success(`Updated ${ids.length} subject(s)`);
        await fetchSubjects();
      } else {
        const json = await res.json();
        toast.error(json.error || "Bulk update failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const handleBulkDelete = async (ids: number[]) => {
    try {
      const res = await fetch("/api/admin/subjects", {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ ids, softDelete: true }),
      });
      if (res.ok) {
        toast.success(`Deleted ${ids.length} subject(s)`);
        await fetchSubjects();
      } else {
        const json = await res.json();
        toast.error(json.error || "Bulk delete failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const columns: ColumnDef<Subject>[] = [
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
      header: "Subject",
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex items-center gap-3">
            {s.icon_url ? (
              <img
                src={s.icon_url}
                alt={s.name}
                className="h-9 w-9 rounded-xl object-contain bg-muted/40 p-1 border border-border/60 shrink-0 shadow-2xs"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            ) : (
              <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 border border-primary/20">
                <GraduationCap className="h-4 w-4" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-foreground truncate">{s.name}</span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className="font-mono text-[11px]">{s.slug}</span>
                {s.code && (
                  <>
                    <span>•</span>
                    <span className="font-mono text-[11px] font-medium text-foreground/80">{s.code}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "code",
      header: "Subject Code",
      cell: ({ row }) => {
        const code = row.original.code;
        if (!code) return <span className="text-muted-foreground text-xs font-mono">-</span>;
        return (
          <Badge variant="outline" className="font-mono text-xs bg-muted/30">
            {code}
          </Badge>
        );
      },
    },
    {
      accessorKey: "is_active",
      header: "Status",
      cell: ({ row }) => {
        const active = row.original.is_active;
        return (
          <Badge
            variant={active ? "default" : "secondary"}
            className={`text-xs font-semibold ${
              active
                ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                : "bg-muted text-muted-foreground border border-border"
            }`}
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
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Open menu"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={() => openEditDialog(item)}
                className="text-xs gap-2 cursor-pointer font-medium"
              >
                <Edit2 className="h-3.5 w-3.5 text-foreground/80" />
                Edit Subject
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleToggleActive(item)}
                disabled={activeToggleLoadingId === item.id}
                className="text-xs gap-2 cursor-pointer font-medium"
              >
                {active ? (
                  <>
                    <PowerOff className="h-3.5 w-3.5 text-amber-500" />
                    <span>Disable Subject</span>
                  </>
                ) : (
                  <>
                    <Power className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Enable Subject</span>
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteTarget(item)}
                className="text-xs gap-2 text-destructive focus:text-destructive cursor-pointer font-medium"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete Subject
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
            <GraduationCap className="h-6 w-6 text-primary" />
            Subjects
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage standard academic subjects across EduBird without class or board constraints.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            <Plus className="mr-2 h-4 w-4" /> Add Subject
          </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Subjects</p>
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
              <p className="text-xs text-muted-foreground font-medium">Subject Icons</p>
              <h3 className="text-xl font-extrabold text-foreground">
                {subjects.filter((s) => Boolean(s.icon_url)).length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Active Subjects</p>
              <h3 className="text-xl font-extrabold text-foreground">
                {subjects.filter((s) => s.is_active).length}
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
                placeholder="Search subject by name or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background/50 border-border"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={fetchSubjects}
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
            data={subjects}
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
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={async () => {
                      await handleBulkStatus(ids, true);
                      resetSelection();
                    }}
                  >
                    <Power className="mr-1.5 h-3.5 w-3.5 text-emerald-500" /> Enable ({ids.length})
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={async () => {
                      await handleBulkStatus(ids, false);
                      resetSelection();
                    }}
                  >
                    <PowerOff className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" /> Disable ({ids.length})
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={async () => {
                      if (confirm(`Delete ${ids.length} selected subjects?`)) {
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
        <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto w-full">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              {editingSubject ? "Edit Subject" : "Add Master Subject"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {editingSubject
                ? "Update subject details, code, and icon."
                : "Add universal master subjects with subject code and icon upload for each."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {editingSubject ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Subject Name *</Label>
                  <Input
                    placeholder="e.g. Mathematics, Physics, Chemistry, English"
                    value={subjectName}
                    onChange={(e) => {
                      setSubjectName(e.target.value);
                      setSubjectSlug(toSlug(e.target.value));
                    }}
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Subject Code</Label>
                    <Input
                      placeholder="e.g. MATH-01, PHY-101"
                      value={subjectCode}
                      onChange={(e) => setSubjectCode(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-semibold">Slug Identifier</Label>
                    <Input
                      placeholder="slug-identifier"
                      value={subjectSlug}
                      onChange={(e) => setSubjectSlug(toSlug(e.target.value))}
                    />
                  </div>
                </div>

                {/* Edit Subject Icon */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <ImageIcon className="h-4 w-4 text-primary" />
                    Subject Icon
                  </Label>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      {subjectIcon ? (
                        <img
                          src={subjectIcon}
                          alt="icon"
                          className="h-full w-full object-contain p-1"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <GraduationCap className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="file"
                        id="edit-subject-icon-upload"
                        accept=".webp,.svg,.png,.jpg,.jpeg,image/webp,image/svg+xml,image/png,image/jpeg"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleSingleIconUpload(file);
                            e.target.value = "";
                          }
                        }}
                      />
                      <label
                        htmlFor="edit-subject-icon-upload"
                        className={`px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${
                          uploadingIcon ? "pointer-events-none opacity-60" : ""
                        }`}
                      >
                        {uploadingIcon ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        Upload Icon
                      </label>
                      <Input
                        placeholder="or paste icon URL (https://...)"
                        value={subjectIcon}
                        onChange={(e) => setSubjectIcon(e.target.value)}
                        className="h-8 text-xs flex-1"
                      />
                      {subjectIcon && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setSubjectIcon("")}
                          title="Clear icon"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ListPlus className="h-4 w-4 text-primary" />
                    Subjects to Add
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold">
                      {subjectRows.filter((r) => r.name.trim()).length} Entered
                    </Badge>
                  </Label>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowBulkPaste(!showBulkPaste)}
                    className="h-7 px-2 text-[11px] font-semibold text-primary hover:text-primary gap-1"
                  >
                    <ClipboardPaste className="h-3.5 w-3.5" />
                    {showBulkPaste ? "Hide Quick Paste" : "Quick Bulk Paste"}
                  </Button>
                </div>

                {/* Bulk Paste Box */}
                {showBulkPaste && (
                  <div className="p-3 rounded-2xl border border-primary/30 bg-primary/5 space-y-2">
                    <Label className="text-[11px] font-semibold text-muted-foreground block">
                      Paste multiple subjects (comma or line separated):
                    </Label>
                    <Textarea
                      placeholder="e.g. Mathematics, Physics, Chemistry, Biology, English, Computer Science"
                      value={bulkInputText}
                      onChange={(e) => setBulkInputText(e.target.value)}
                      rows={3}
                      className="text-xs bg-background"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setShowBulkPaste(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="h-7 text-xs bg-primary text-primary-foreground font-semibold"
                        onClick={handleApplyBulkPaste}
                      >
                        Add All to List
                      </Button>
                    </div>
                  </div>
                )}

                {/* Dynamic Subject Rows with Per-Subject Icon Upload */}
                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {subjectRows.map((row, idx) => (
                    <div
                      key={row.id}
                      className="p-2.5 rounded-2xl border border-border/80 bg-card/60 flex items-center gap-2 group hover:border-primary/40 transition-colors shadow-2xs"
                    >
                      <span className="text-[11px] font-bold text-muted-foreground w-5 text-center shrink-0">
                        #{idx + 1}
                      </span>

                      {/* Icon uploader for this specific row */}
                      <div className="relative shrink-0">
                        <input
                          type="file"
                          id={`subject-row-icon-${row.id}`}
                          accept=".webp,.svg,.png,.jpg,.jpeg,image/webp,image/svg+xml,image/png,image/jpeg"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              uploadIconForRow(row.id, file);
                              e.target.value = "";
                            }
                          }}
                        />
                        {row.icon_url ? (
                          <div className="relative group/icon">
                            <img
                              src={row.icon_url}
                              alt="icon"
                              className="h-8 w-8 object-contain rounded-xl border bg-background p-1 shadow-2xs"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => updateSubjectRow(row.id, "icon_url", "")}
                              className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-white flex items-center justify-center shadow text-[10px] opacity-0 group-hover/icon:opacity-100 transition-opacity"
                              title="Remove icon"
                            >
                              ×
                            </button>
                          </div>
                        ) : (
                          <label
                            htmlFor={`subject-row-icon-${row.id}`}
                            className={`h-8 w-8 rounded-xl border border-dashed border-border bg-background hover:border-primary hover:bg-primary/5 flex items-center justify-center cursor-pointer transition-colors ${
                              row.uploading ? "pointer-events-none opacity-60" : ""
                            }`}
                            title="Upload Icon for this subject"
                          >
                            {row.uploading ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                            ) : (
                              <ImageIcon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                            )}
                          </label>
                        )}
                      </div>

                      {/* Subject Name Input */}
                      <Input
                        placeholder={`Subject #${idx + 1} Name * (e.g. Mathematics)`}
                        value={row.name}
                        onChange={(e) => updateSubjectRow(row.id, "name", e.target.value)}
                        className="h-8 text-xs flex-1"
                        required={idx === 0}
                      />

                      {/* Subject Code Input */}
                      <Input
                        placeholder="Code (e.g. MATH-01)"
                        value={row.code}
                        onChange={(e) => updateSubjectRow(row.id, "code", e.target.value)}
                        className="h-8 text-xs w-32 shrink-0"
                      />

                      {/* Remove Row Button */}
                      {subjectRows.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                          onClick={() => removeSubjectRow(row.id)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSubjectRow}
                  className="w-full h-8 text-xs font-semibold border-dashed gap-1.5 hover:border-primary hover:text-primary"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Another Subject
                </Button>
              </div>
            )}

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground font-semibold">
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {editingSubject
                  ? "Save Changes"
                  : subjectRows.filter((r) => r.name.trim()).length > 1
                  ? `Create ${subjectRows.filter((r) => r.name.trim()).length} Subjects`
                  : "Create Subject"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Subject
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong className="text-foreground">{deleteTarget?.name}</strong>?
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
