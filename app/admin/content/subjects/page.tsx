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
  Layers,
  Check,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
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

type SubjectSuggestion = {
  id: number;
  name: string;
  code: string | null;
  slug?: string;
  icon_url?: string | null;
};

function SubjectNameInputWithSuggestions({
  value,
  onChange,
  onSelectSuggestion,
  placeholder,
  required,
  className,
  accessToken,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelectSuggestion: (item: SubjectSuggestion) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  accessToken: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SubjectSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSuggestions = useCallback(async (q: string) => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/subjects/suggestions?search=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setSuggestions(json.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      fetchSuggestions(value);
    }, 150);
    return () => clearTimeout(timer);
  }, [value, open, fetchSuggestions]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative flex-1">
      <Input
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setOpen(true);
          fetchSuggestions(value);
        }}
        className={className}
        required={required}
      />
      {open && (suggestions.length > 0 || loading) && (
        <div className="absolute left-0 top-full mt-1 w-full min-w-[280px] max-w-md max-h-56 overflow-y-auto z-50 rounded-xl border border-border bg-popover text-popover-foreground shadow-lg p-1.5 space-y-0.5 backdrop-blur-md">
          {loading && suggestions.length === 0 ? (
            <div className="p-2.5 text-center text-xs text-muted-foreground flex items-center justify-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              Searching subject suggestions...
            </div>
          ) : (
            suggestions.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left p-2 rounded-lg hover:bg-muted/80 flex items-center justify-between gap-2 transition-colors cursor-pointer group"
                onClick={() => {
                  onSelectSuggestion(item);
                  setOpen(false);
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-6 rounded-md border bg-background flex items-center justify-center overflow-hidden shrink-0">
                    <img
                      src={item.icon_url || "/icons/default-subject.svg"}
                      alt=""
                      className="size-4 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/icons/default-subject.svg";
                      }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-foreground truncate group-hover:text-primary">
                    {item.name}
                  </span>
                </div>
                {item.code ? (
                  <Badge variant="secondary" className="text-[10px] font-mono shrink-0 py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                    {item.code}
                  </Badge>
                ) : (
                  <span className="text-[10px] text-muted-foreground italic shrink-0">Select</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
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
  const [allExistingSubjects, setAllExistingSubjects] = useState<
    { id: number; name: string; code: string | null; slug?: string }[]
  >([]);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

  const fetchAllCatalogCodes = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch("/api/admin/subjects/suggestions?limit=2000", {
        headers: authHeader,
      });
      const json = await res.json();
      if (res.ok && Array.isArray(json.data)) {
        setAllExistingSubjects(json.data);
      }
    } catch {
      // ignore
    }
  }, [accessToken, authHeader]);

  // Check duplicate code for Edit dialog
  const editDuplicateCodeWarning = useMemo(() => {
    if (!subjectCode.trim()) return null;
    const trimmed = subjectCode.trim().toLowerCase();
    return allExistingSubjects.find(
      (s) => s.code && s.code.trim().toLowerCase() === trimmed && s.id !== editingSubject?.id
    );
  }, [subjectCode, allExistingSubjects, editingSubject]);

  // Check duplicate code for each row in Add dialog
  const getRowCodeWarning = useCallback((rowId: string, code: string) => {
    if (!code.trim()) return null;
    const trimmed = code.trim().toLowerCase();

    // 1. Check against other rows in same modal
    const otherRowMatch = subjectRows.find(
      (r) => r.id !== rowId && r.code && r.code.trim().toLowerCase() === trimmed
    );
    if (otherRowMatch) {
      const otherIdx = subjectRows.findIndex((r) => r.id === otherRowMatch.id);
      return `Duplicate: already entered in Row #${otherIdx + 1}`;
    }

    // 2. Check against catalog database
    const dbMatch = allExistingSubjects.find(
      (s) => s.code && s.code.trim().toLowerCase() === trimmed
    );
    if (dbMatch) {
      return `Already used by "${dbMatch.name}" in catalog`;
    }

    return null;
  }, [subjectRows, allExistingSubjects]);

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
      fetchAllCatalogCodes();
    }
  }, [isReady, accessToken, fetchSubjects, fetchAllCatalogCodes]);

  const addSubjectRow = () => {
    setSubjectRows((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        name: "",
        code: "",
        icon_url: "",
      },
    ]);
  };

  const removeSubjectRow = (id: string) => {
    if (subjectRows.length <= 1) {
      setSubjectRows([{
        id: "1",
        name: "",
        code: "",
        icon_url: "",
      }]);
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
      id: String(Date.now() + i + Math.random()),
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
    fetchAllCatalogCodes();
    setDialogOpen(true);
  };

  const openEditDialog = (item: Subject) => {
    setEditingSubject(item);
    setSubjectName(item.name);
    setSubjectCode(item.code || "");
    setSubjectSlug(item.slug);
    setSubjectIcon(item.icon_url || "");
    setSubjectRows([{ id: "1", name: item.name, code: item.code || "", icon_url: item.icon_url || "" }]);
    fetchAllCatalogCodes();
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
          icon_url: subjectIcon.trim() || "/icons/default-subject.svg",
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
          icon_url: r.icon_url?.trim() || "/icons/default-subject.svg",
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

  // Bulk Status
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

  // Bulk Delete
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

  // Single Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/subjects/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (res.ok) {
        toast.success("Subject deleted successfully");
        setDeleteTarget(null);
        fetchSubjects();
      } else {
        toast.error("Failed to delete subject");
      }
    } catch {
      toast.error("Network error while deleting subject");
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle Active
  const handleToggleActive = async (item: Subject) => {
    setActiveToggleLoadingId(item.id);
    try {
      const res = await fetch(`/api/admin/subjects/${item.id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !item.is_active }),
      });
      if (res.ok) {
        toast.success(`Subject ${!item.is_active ? "activated" : "deactivated"}`);
        fetchSubjects();
      } else {
        toast.error("Failed to update status");
      }
    } catch {
      toast.error("Network error updating status");
    } finally {
      setActiveToggleLoadingId(null);
    }
  };

  // Table Columns
  const columns: ColumnDef<Subject>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(val) => row.toggleSelected(!!val)}
          aria-label="Select row"
          className="translate-y-[2px]"
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
            <img
              src={s.icon_url || "/icons/default-subject.svg"}
              alt={s.name}
              className="h-9 w-9 rounded-xl object-contain bg-muted/40 p-1 border border-border/60 shrink-0 shadow-2xs"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/icons/default-subject.svg";
              }}
            />
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
            className={`text-xs font-semibold ${active
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
    <div className="space-y-4 w-full max-w-full">
      {/* Main Card */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary" />
                Master Subjects
              </CardTitle>
              <CardDescription className="text-xs">
                Total {totalCount} master subjects configured across programs and classes.
              </CardDescription>
            </div>
            <Badge variant="secondary" className="font-mono text-xs font-semibold">
              {totalCount} Total
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-4">
          {/* DataTable with Single Aligned Toolbar */}
          <DataTable
            columns={columns}
            data={subjects}
            loading={loading}
            pagination={pagination}
            onPaginationChange={setPagination}
            pageCount={pageCount}
            showRowNumbers
            toolbarLeft={
              <div className="relative max-w-sm w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search master subjects by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
            }
            toolbarRight={
              <Button
                onClick={openCreateDialog}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs gap-1.5 h-9 text-xs"
              >
                <Plus className="h-4 w-4" /> Add Master Subject
              </Button>
            }
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

      {/* Add / Edit Dialog (Clean & Focused) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="!w-[94vw] sm:!max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden rounded-2xl">
          <DialogHeader className="pb-3 border-b shrink-0">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-primary" />
              {editingSubject ? "Edit Master Subject" : "Add Master Subject"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {editingSubject
                ? "Update master subject name, code, slug identifier, and vector icon."
                : "Add master subjects with autocomplete suggestions, subject codes, and custom icons."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            {editingSubject ? (
              <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-3.5 shadow-xs">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground">Subject Name *</Label>
                  <SubjectNameInputWithSuggestions
                    placeholder="e.g. Mathematics, Physics, Chemistry, English"
                    value={subjectName}
                    onChange={(val) => {
                      setSubjectName(val);
                      setSubjectSlug(toSlug(val));
                    }}
                    onSelectSuggestion={(suggestion) => {
                      setSubjectName(suggestion.name);
                      if (suggestion.code) setSubjectCode(suggestion.code);
                      if (suggestion.slug) setSubjectSlug(suggestion.slug);
                      if (suggestion.icon_url) setSubjectIcon(suggestion.icon_url);
                    }}
                    className="text-xs h-9 bg-background"
                    required
                    accessToken={accessToken}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                      <span>Subject Code (Optional)</span>
                    </Label>
                    <div className="relative">
                      <Input
                        placeholder="e.g. MATH-01, PHY-101"
                        value={subjectCode}
                        onChange={(e) => setSubjectCode(e.target.value)}
                        className={`text-xs h-9 bg-background ${
                          editDuplicateCodeWarning
                            ? "border-amber-500 bg-amber-500/5 text-amber-900 dark:text-amber-200 focus-visible:ring-amber-500"
                            : ""
                        }`}
                      />
                      {editDuplicateCodeWarning && (
                        <AlertTriangle className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-amber-500 pointer-events-none" />
                      )}
                    </div>
                    {editDuplicateCodeWarning && (
                      <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <span>
                          <strong>Duplicate Code Warning:</strong> Code &quot;{subjectCode}&quot; is already assigned to &quot;<strong>{editDuplicateCodeWarning.name}</strong>&quot;.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground">Slug Identifier</Label>
                    <Input
                      placeholder="slug-identifier"
                      value={subjectSlug}
                      onChange={(e) => setSubjectSlug(toSlug(e.target.value))}
                      className="text-xs h-9 bg-background"
                    />
                  </div>
                </div>

                {/* Edit Subject Icon */}
                <div className="space-y-2 pt-1 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                      <ImageIcon className="h-4 w-4 text-primary" />
                      Subject Icon
                    </Label>
                    {!subjectIcon && (
                      <span className="text-[10px] text-muted-foreground font-medium">
                        (Using predefined default icon)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                      <img
                        src={subjectIcon || "/icons/default-subject.svg"}
                        alt="icon"
                        className="h-full w-full object-contain p-1"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/icons/default-subject.svg";
                        }}
                      />
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
                        Change Icon
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
                          title="Reset to predefined icon"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <ListPlus className="h-4 w-4 text-primary" />
                    Subjects to Add
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold">
                      {subjectRows.filter((r) => r.name.trim()).length} Total
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
                      Paste multiple subject names (comma or line separated):
                    </Label>
                    <Textarea
                      placeholder="e.g. Mathematics, Physics, Chemistry, Biology, English, Accountancy, Computer Science"
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

                {/* Dynamic Subject Rows */}
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {subjectRows.map((row, idx) => (
                    <div
                      key={row.id}
                      className="p-2.5 rounded-2xl border border-border/80 bg-card flex items-center gap-2 group hover:border-primary/40 transition-colors shadow-2xs"
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
                        <div className="relative group/icon">
                          <label
                            htmlFor={`subject-row-icon-${row.id}`}
                            className="cursor-pointer block"
                            title={row.icon_url ? "Click to change icon" : "Click to upload custom icon"}
                          >
                            <img
                              src={row.icon_url || "/icons/default-subject.svg"}
                              alt="icon"
                              className="h-8 w-8 object-contain rounded-xl border bg-background p-1 shadow-2xs hover:border-primary transition-colors"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/icons/default-subject.svg";
                              }}
                            />
                          </label>
                          {row.icon_url && (
                            <button
                              type="button"
                              onClick={() => updateSubjectRow(row.id, "icon_url", "")}
                              className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-white flex items-center justify-center shadow text-[10px] opacity-0 group-hover/icon:opacity-100 transition-opacity"
                              title="Reset to predefined icon"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Subject Name Input with Suggestions */}
                      <SubjectNameInputWithSuggestions
                        placeholder={`Subject #${idx + 1} Name * (e.g. Mathematics)`}
                        value={row.name}
                        onChange={(val) => updateSubjectRow(row.id, "name", val)}
                        onSelectSuggestion={(suggestion) => {
                          updateSubjectRow(row.id, "name", suggestion.name);
                          if (suggestion.code) {
                            updateSubjectRow(row.id, "code", suggestion.code);
                          }
                          if (suggestion.icon_url) {
                            updateSubjectRow(row.id, "icon_url", suggestion.icon_url);
                          }
                        }}
                        className="h-8 text-xs bg-background flex-1"
                        required={idx === 0}
                        accessToken={accessToken}
                      />

                      {/* Subject Code Input with Immediate Warning */}
                      {(() => {
                        const rowWarning = getRowCodeWarning(row.id, row.code);
                        return (
                          <div className="relative shrink-0 flex flex-col">
                            <div className="relative">
                              <Input
                                placeholder="Code (Optional)"
                                value={row.code}
                                onChange={(e) => updateSubjectRow(row.id, "code", e.target.value)}
                                className={`h-8 text-xs w-28 sm:w-36 shrink-0 bg-background ${
                                  rowWarning
                                    ? "border-amber-500 bg-amber-500/5 text-amber-900 dark:text-amber-200 focus-visible:ring-amber-500 pr-7"
                                    : ""
                                }`}
                              />
                              {rowWarning && (
                                <AlertTriangle
                                  className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-amber-500 pointer-events-none"
                                />
                              )}
                            </div>
                            {rowWarning && (
                              <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mt-0.5 max-w-[140px] truncate block" title={rowWarning}>
                                ⚠️ {rowWarning}
                              </span>
                            )}
                          </div>
                        );
                      })()}

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

            <DialogFooter className="gap-2 pt-3 border-t shrink-0">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="h-9 text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="h-9 text-xs bg-primary text-primary-foreground font-semibold">
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
