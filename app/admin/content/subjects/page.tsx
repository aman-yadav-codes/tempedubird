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

  // Table Filters state
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterCategoryName, setFilterCategoryName] = useState("");
  const [filterCourseId, setFilterCourseId] = useState("");
  const [filterCourseName, setFilterCourseName] = useState("");

  // Dialog state (Add / Edit)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedCategoryName, setSelectedCategoryName] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedCourseName, setSelectedCourseName] = useState("");
  const [selectedCourseDetail, setSelectedCourseDetail] = useState<any | null>(null);
  const [loadingCourseDetail, setLoadingCourseDetail] = useState(false);
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectSlug, setSubjectSlug] = useState("");
  const [subjectIcon, setSubjectIcon] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Academic Structure Breakdown state: 'full_course' | 'year_sem'
  const [structureMode, setStructureMode] = useState<"full_course" | "year_sem">("full_course");
  const [activeYear, setActiveYear] = useState<number>(1);
  const [activeSubTerm, setActiveSubTerm] = useState<"sem1" | "sem2" | "annual">("sem1");
  const [maxYears, setMaxYears] = useState<number>(4);
  const [editTermType, setEditTermType] = useState<string>("full_course");
  const [editYearNumber, setEditYearNumber] = useState<number>(1);
  const [editSemesterNumber, setEditSemesterNumber] = useState<number>(1);

  // Multi-subject creation state with per-subject icon upload & term assignment
  const [subjectRows, setSubjectRows] = useState<
    { id: string; name: string; code: string; icon_url: string; term_type: string; term_number: number; term_name?: string; uploading?: boolean }[]
  >([{ id: "1", name: "", code: "", icon_url: "", term_type: "full_course", term_number: 1, term_name: "Full Course" }]);
  const [bulkInputText, setBulkInputText] = useState("");
  const [showBulkPaste, setShowBulkPaste] = useState(false);

  // Icon upload state
  const [uploadingIcon, setUploadingIcon] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

  const getCurrentTarget = useCallback(() => {
    if (structureMode === "full_course") {
      return {
        term_type: "full_course",
        term_number: 1,
        term_name: "Full Course",
        shortBadge: "Full Course",
      };
    }
    if (activeSubTerm === "annual") {
      return {
        term_type: "year",
        term_number: activeYear,
        term_name: `Year ${activeYear} (Annual)`,
        shortBadge: `Year ${activeYear}`,
      };
    }
    const semNum = (activeYear - 1) * 2 + (activeSubTerm === "sem1" ? 1 : 2);
    return {
      term_type: "semester",
      term_number: semNum,
      term_name: `Year ${activeYear} - Semester ${semNum}`,
      shortBadge: `Y${activeYear} • Sem ${semNum}`,
    };
  }, [structureMode, activeYear, activeSubTerm]);

  const fetchCourseDetail = useCallback(async (id: string | number) => {
    if (!id || !accessToken) {
      setSelectedCourseDetail(null);
      return;
    }
    setLoadingCourseDetail(true);
    try {
      const res = await fetch(`/api/admin/content/courses/${id}`, {
        headers: authHeader,
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setSelectedCourseDetail(json.data);
        const durVal = Number(json.data.duration_value);
        const durUnit = (json.data.duration_unit || "years").toLowerCase();
        let exactYears = 4;
        if (durVal && durVal > 0) {
          if (durUnit.includes("year")) {
            exactYears = durVal;
          } else if (durUnit.includes("month")) {
            exactYears = Math.max(1, Math.ceil(durVal / 12));
          } else if (durUnit.includes("sem")) {
            exactYears = Math.max(1, Math.ceil(durVal / 2));
          }
        }
        setMaxYears(exactYears);
        setActiveYear((prev) => (prev > exactYears ? 1 : prev));
      }
    } catch {
      // ignore
    } finally {
      setLoadingCourseDetail(false);
    }
  }, [accessToken, authHeader]);

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
      if (filterCategoryId) params.set("categoryId", filterCategoryId);
      if (filterCourseId) params.set("courseId", filterCourseId);

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
    const target = getCurrentTarget();
    setSubjectRows((prev) => [
      ...prev,
      {
        id: String(Date.now() + Math.random()),
        name: "",
        code: "",
        icon_url: "",
        term_type: target.term_type,
        term_number: target.term_number,
        term_name: target.term_name,
      },
    ]);
  };

  const removeSubjectRow = (id: string) => {
    const target = getCurrentTarget();
    if (subjectRows.length <= 1) {
      setSubjectRows([{
        id: "1",
        name: "",
        code: "",
        icon_url: "",
        term_type: target.term_type,
        term_number: target.term_number,
        term_name: target.term_name,
      }]);
      return;
    }
    setSubjectRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateSubjectRow = (
    id: string,
    field: "name" | "code" | "icon_url" | "uploading" | "term_type" | "term_number" | "term_name",
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

    const target = getCurrentTarget();

    const newRows = names.map((n, i) => ({
      id: String(Date.now() + i + Math.random()),
      name: n,
      code: "",
      icon_url: "",
      term_type: target.term_type,
      term_number: target.term_number,
      term_name: target.term_name,
    }));

    setSubjectRows((prev) => {
      const filtered = prev.filter((r) => r.name.trim() !== "");
      return [...filtered, ...newRows];
    });

    setBulkInputText("");
    setShowBulkPaste(false);
    toast.success(`Added ${names.length} subjects to ${target.term_name}`);
  };

  const resetForm = () => {
    setEditingSubject(null);
    setSelectedCategoryId(filterCategoryId || "");
    setSelectedCategoryName(filterCategoryName || "");
    setSelectedCourseId(filterCourseId || "");
    setSelectedCourseName(filterCourseName || "");
    setSelectedCourseDetail(null);
    setStructureMode("full_course");
    setActiveYear(1);
    setActiveSubTerm("sem1");
    setMaxYears(4);
    setEditTermType("full_course");
    setEditYearNumber(1);
    setEditSemesterNumber(1);
    setSubjectName("");
    setSubjectCode("");
    setSubjectSlug("");
    setSubjectIcon("");
    setSubjectRows([{ id: "1", name: "", code: "", icon_url: "", term_type: "full_course", term_number: 1, term_name: "Full Course" }]);
    setBulkInputText("");
    setShowBulkPaste(false);
  };

  const openCreateDialog = () => {
    resetForm();
    if (filterCourseId) {
      fetchCourseDetail(filterCourseId);
    }
    setDialogOpen(true);
  };

  const openEditDialog = (item: Subject) => {
    setEditingSubject(item);
    setSelectedCategoryId(item.category_id ? String(item.category_id) : "");
    setSelectedCategoryName(item.category_name || "");
    setSelectedCourseId(item.course_id ? String(item.course_id) : "");
    setSelectedCourseName(item.course_name || "");
    setSelectedCourseDetail(null);
    const itemTermType = item.term_type || "full_course";
    const itemTermNumber = item.term_number || 1;
    setEditTermType(itemTermType);
    if (itemTermType === "semester") {
      const derivedYear = Math.max(1, Math.ceil(itemTermNumber / 2));
      setEditYearNumber(derivedYear);
      setEditSemesterNumber(itemTermNumber);
      setStructureMode("year_sem");
      setActiveYear(derivedYear);
      setActiveSubTerm(itemTermNumber % 2 === 1 ? "sem1" : "sem2");
    } else if (itemTermType === "year") {
      setEditYearNumber(itemTermNumber);
      setEditSemesterNumber(1);
      setStructureMode("year_sem");
      setActiveYear(itemTermNumber);
      setActiveSubTerm("annual");
    } else {
      setStructureMode("full_course");
    }
    if (item.course_id) {
      fetchCourseDetail(item.course_id);
    }
    setSubjectName(item.name);
    setSubjectCode(item.code || "");
    setSubjectSlug(item.slug);
    setSubjectIcon(item.icon_url || "");
    setSubjectRows([{ id: "1", name: item.name, code: item.code || "", icon_url: item.icon_url || "", term_type: itemTermType, term_number: itemTermNumber, term_name: item.term_name || "Full Course" }]);
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
        let finalTermType = editTermType;
        let finalTermNumber = 1;
        let finalTermName = "Full Course";

        if (editTermType === "semester") {
          finalTermNumber = Number(editSemesterNumber) || 1;
          finalTermName = `Year ${editYearNumber} - Semester ${finalTermNumber}`;
        } else if (editTermType === "year") {
          finalTermNumber = Number(editYearNumber) || 1;
          finalTermName = `Year ${finalTermNumber} (Annual)`;
        }

        const payload = {
          name: subjectName.trim(),
          slug: subjectSlug.trim() || toSlug(subjectName),
          code: subjectCode.trim() || null,
          icon_url: subjectIcon.trim() || "/icons/default-subject.svg",
          categoryId: selectedCategoryId ? Number(selectedCategoryId) : null,
          courseId: selectedCourseId ? Number(selectedCourseId) : null,
          termType: finalTermType,
          termNumber: finalTermNumber,
          termName: finalTermName,
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
      const defaultTarget = getCurrentTarget();
      const payload = {
        categoryId: selectedCategoryId ? Number(selectedCategoryId) : null,
        courseId: selectedCourseId ? Number(selectedCourseId) : null,
        subjects: validRows.map((r) => {
          const rowTermType = r.term_type || defaultTarget.term_type;
          const rowTermNumber = r.term_number || defaultTarget.term_number;
          const rowTermName = r.term_name || defaultTarget.term_name;
          return {
            name: r.name.trim(),
            code: r.code.trim() || null,
            slug: toSlug(r.name.trim()),
            icon_url: r.icon_url?.trim() || "/icons/default-subject.svg",
            categoryId: selectedCategoryId ? Number(selectedCategoryId) : null,
            courseId: selectedCourseId ? Number(selectedCourseId) : null,
            termType: rowTermType,
            termNumber: Number(rowTermNumber),
            termName: rowTermName,
            is_active: true,
          };
        }),
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
      accessorKey: "category_name",
      header: "Class / Category",
      cell: ({ row }) => {
        const catName = row.original.category_name;
        if (!catName) return <span className="text-muted-foreground text-xs italic">Universal</span>;
        return (
          <Badge variant="secondary" className="text-xs font-semibold bg-primary/10 text-primary border-primary/20">
            {catName}
          </Badge>
        );
      },
    },
    {
      accessorKey: "course_name",
      header: "Course / Program",
      cell: ({ row }) => {
        const s = row.original;
        if (!s.course_name) return <span className="text-muted-foreground text-xs italic">-</span>;
        const derivedYear = s.term_type === "semester" ? Math.max(1, Math.ceil((s.term_number || 1) / 2)) : s.term_number || 1;
        return (
          <div className="flex flex-col gap-1 items-start">
            <Badge variant="outline" className="text-xs font-medium bg-muted/40">
              {s.course_name}
            </Badge>
            {s.term_type === "semester" && (
              <Badge variant="outline" className="text-[10px] font-semibold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                Year {derivedYear} • Sem {s.term_number || 1}
              </Badge>
            )}
            {s.term_type === "year" && (
              <Badge variant="outline" className="text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">
                Year {s.term_number || 1} (Annual)
              </Badge>
            )}
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
    <div className="space-y-6 w-full max-w-full">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
            <GraduationCap className="h-7 w-7 text-primary" />
            Master Subjects
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure subjects, codes, syllabus associations, and curriculum mapping.
          </p>
        </div>
        <Button
          onClick={openCreateDialog}
          className="bg-primary text-primary-foreground font-semibold shadow-xs gap-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" /> Add Master Subject
        </Button>
      </div>

      {/* Main Card */}
      <Card className="border border-border/80 shadow-xs">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Subjects List
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

        <CardContent className="p-4 space-y-4">
          {/* Search and Filters */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1 max-w-3xl">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search subjects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Filter by Category */}
              <div>
                <AsyncSearchPopover<{ id: number; name: string }>
                  value={filterCategoryId}
                  onChange={(val) => {
                    setFilterCategoryId(val);
                    if (!val) setFilterCategoryName("");
                  }}
                  onSelectItem={(item) => {
                    setFilterCategoryId(String(item.id));
                    setFilterCategoryName(item.name);
                  }}
                  selectedLabel={filterCategoryName || undefined}
                  placeholder="Filter by Class..."
                  searchPlaceholder="Type class name..."
                  emptyText="No class found"
                  fetcher={async (search, page) => {
                    const params = new URLSearchParams({
                      page: String(page),
                      limit: "20",
                      search,
                    });
                    const res = await fetch(
                      `/api/admin/content/categories?${params.toString()}`,
                      { headers: authHeader }
                    );
                    if (!res.ok) throw new Error("Failed to load classes");
                    const json = await res.json();
                    return { data: json.data || [], hasMore: page < (json.pageCount || 1) };
                  }}
                  getValue={(item) => String(item.id)}
                  getLabel={(item) => item.name}
                />
              </div>

              {/* Filter by Course */}
              <div>
                <AsyncSearchPopover<{ id: number; name: string; category_name?: string; code?: string }>
                  value={filterCourseId}
                  onChange={(val) => {
                    setFilterCourseId(val);
                    if (!val) setFilterCourseName("");
                  }}
                  onSelectItem={(item) => {
                    setFilterCourseId(String(item.id));
                    setFilterCourseName(item.name);
                  }}
                  selectedLabel={filterCourseName || undefined}
                  placeholder="Filter by Course..."
                  searchPlaceholder="Type course name..."
                  emptyText="No course found"
                  fetcher={async (search, page) => {
                    const params = new URLSearchParams({
                      page: String(page),
                      limit: "20",
                      search,
                    });
                    const res = await fetch(
                      `/api/admin/content/courses?${params.toString()}`,
                      { headers: authHeader }
                    );
                    if (!res.ok) throw new Error("Failed to load courses");
                    const json = await res.json();
                    return { data: json.data || [], hasMore: page < (json.pageCount || 1) };
                  }}
                  getValue={(item) => String(item.id)}
                  getLabel={(item) => item.name}
                />
              </div>
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

      {/* Add / Edit Dialog with 2-Column Split */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="!w-[94vw] !max-w-[1100px] sm:!max-w-[1100px] max-h-[92vh] flex flex-col p-6 overflow-hidden rounded-2xl">
          <DialogHeader className="pb-3 border-b shrink-0">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" />
                  {editingSubject ? "Edit Subject" : "Add Master Subject"}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {editingSubject
                    ? "Update subject details, code, and curriculum association."
                    : "Select course/program on the left to preview details on the right, then add subjects."}
                </DialogDescription>
              </div>
              {selectedCourseDetail && (
                <Badge variant="outline" className="hidden sm:inline-flex text-xs bg-primary/5 text-primary border-primary/20">
                  {selectedCourseDetail.name}
                </Badge>
              )}
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 py-2 pr-1">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-7 space-y-4">
                <div className="p-3.5 rounded-2xl border border-primary/20 bg-primary/[0.03] space-y-2">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Layers className="h-4 w-4 text-primary" />
                    Select Course / Program
                  </Label>
                  <AsyncSearchPopover<{ id: number; name: string; category_id?: number | null; category_name?: string; code?: string; duration_value?: number | null; duration_unit?: string | null }>
                    value={selectedCourseId}
                    onChange={(val) => {
                      setSelectedCourseId(val);
                      if (!val) {
                        setSelectedCourseName("");
                        setSelectedCategoryId("");
                        setSelectedCategoryName("");
                        setSelectedCourseDetail(null);
                        setMaxYears(4);
                        setActiveYear(1);
                      } else {
                        fetchCourseDetail(val);
                      }
                    }}
                    onSelectItem={(item) => {
                      setSelectedCourseId(String(item.id));
                      setSelectedCourseName(item.name);
                      if (item.category_id) {
                        setSelectedCategoryId(String(item.category_id));
                        setSelectedCategoryName(item.category_name || "");
                      }
                      if (item.duration_value) {
                        const durVal = Number(item.duration_value);
                        const durUnit = (item.duration_unit || "years").toLowerCase();
                        let exactYears = 4;
                        if (durVal && durVal > 0) {
                          if (durUnit.includes("year")) {
                            exactYears = durVal;
                          } else if (durUnit.includes("month")) {
                            exactYears = Math.max(1, Math.ceil(durVal / 12));
                          } else if (durUnit.includes("sem")) {
                            exactYears = Math.max(1, Math.ceil(durVal / 2));
                          }
                        }
                        setMaxYears(exactYears);
                        setActiveYear(1);
                      }
                      fetchCourseDetail(item.id);
                    }}
                    selectedLabel={selectedCourseName || undefined}
                    placeholder="Search and select Course / Program..."
                    searchPlaceholder="Type course or class name to search..."
                    emptyText="No matching course/program found"
                    fetcher={async (search, page) => {
                      const params = new URLSearchParams({ page: String(page), limit: "25", search });
                      const res = await fetch(`/api/admin/content/courses?${params.toString()}`, { headers: authHeader });
                      if (!res.ok) throw new Error("Failed to load courses");
                      const json = await res.json();
                      return { data: json.data || [], hasMore: page < (json.pageCount || 1) };
                    }}
                    getValue={(item) => String(item.id)}
                    getLabel={(item) => item.name}
                  />
                </div>

                {/* 2. Academic Structure Breakdown: Year as Main, Semester as Sub-Part */}
                <div className="p-3.5 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-primary" />
                      Academic Structure
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-medium">
                      {structureMode === "full_course"
                        ? "Full Program Basis"
                        : selectedCourseDetail?.duration_value
                          ? `Course Duration: ${selectedCourseDetail.duration_value} ${selectedCourseDetail.duration_unit || 'Years'}`
                          : "Year & Semester Hierarchy"}
                    </span>
                  </div>

                  {/* Mode Switcher: Full Course vs Year & Semester Breakdown */}
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-background rounded-xl border border-border/80 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => {
                        setStructureMode("full_course");
                        setEditTermType("full_course");
                      }}
                      className={`py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 text-xs ${structureMode === "full_course"
                          ? "bg-primary text-primary-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                    >
                      <span>🌟</span>
                      <span>Full Course</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setStructureMode("year_sem");
                        setEditTermType("semester");
                      }}
                      className={`py-1.5 px-2 rounded-lg transition-all text-center flex items-center justify-center gap-1.5 text-xs ${structureMode === "year_sem"
                          ? "bg-indigo-600 text-white shadow-xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        }`}
                    >
                      <span>📅</span>
                      <span>Year & Semester Breakdown</span>
                    </button>
                  </div>

                  {/* When Year & Semester is chosen: Render MAIN YEAR TABS, then SUB-SEMESTER TABS */}
                  {!editingSubject && structureMode === "year_sem" && (
                    <div className="space-y-3 pt-1 border-t border-border/60">
                      {/* LEVEL 1 (MAIN): Academic Years */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-foreground flex items-center gap-1">
                            <span>📅</span> 1. Select Academic Year (Main):
                          </span>
                          {!selectedCourseDetail?.duration_value && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setMaxYears((prev) => prev + 1)}
                              className="h-5 text-[10px] text-primary hover:text-primary px-1.5 font-semibold"
                            >
                              + Add Year {maxYears + 1}
                            </Button>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {Array.from({ length: maxYears }, (_, i) => i + 1).map((yr) => {
                            const semStart = (yr - 1) * 2 + 1;
                            const semEnd = yr * 2;
                            const yearSubjectCount = subjectRows.filter((r) => {
                              if (r.name.trim() === "") return false;
                              if (r.term_type === "year" && r.term_number === yr) return true;
                              if (r.term_type === "semester" && (r.term_number === semStart || r.term_number === semEnd)) return true;
                              return false;
                            }).length;
                            const isSelected = activeYear === yr;

                            return (
                              <button
                                key={yr}
                                type="button"
                                onClick={() => setActiveYear(yr)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border ${isSelected
                                    ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/20"
                                    : "bg-background text-foreground border-border hover:bg-muted"
                                  }`}
                              >
                                <span>Year {yr}</span>
                                {yearSubjectCount > 0 && (
                                  <span
                                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${isSelected
                                        ? "bg-white/20 text-white"
                                        : "bg-primary/10 text-primary"
                                      }`}
                                  >
                                    {yearSubjectCount}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* LEVEL 2 (SUB-PART): Semesters of the Selected Year */}
                      <div className="space-y-1.5 p-2.5 rounded-xl bg-background border border-border/80 shadow-2xs">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-foreground flex items-center gap-1">
                            <span>🎓</span> 2. Select Semester for <strong className="text-primary font-bold">Year {activeYear}</strong>:
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-1.5">
                          {/* Semester 1 of Year */}
                          {(() => {
                            const semNum = (activeYear - 1) * 2 + 1;
                            const count = subjectRows.filter(
                              (r) => r.term_type === "semester" && r.term_number === semNum && r.name.trim()
                            ).length;
                            const isActive = activeSubTerm === "sem1";
                            return (
                              <button
                                type="button"
                                onClick={() => setActiveSubTerm("sem1")}
                                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border ${isActive
                                    ? "bg-indigo-600 text-white border-indigo-700 shadow-2xs"
                                    : "bg-muted/40 text-foreground border-border/60 hover:bg-muted"
                                  }`}
                              >
                                <span>Sem {semNum}</span>
                                {count > 0 && (
                                  <span
                                    className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary font-bold"
                                      }`}
                                  >
                                    {count}
                                  </span>
                                )}
                              </button>
                            );
                          })()}

                          {/* Semester 2 of Year */}
                          {(() => {
                            const semNum = activeYear * 2;
                            const count = subjectRows.filter(
                              (r) => r.term_type === "semester" && r.term_number === semNum && r.name.trim()
                            ).length;
                            const isActive = activeSubTerm === "sem2";
                            return (
                              <button
                                type="button"
                                onClick={() => setActiveSubTerm("sem2")}
                                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border ${isActive
                                    ? "bg-indigo-600 text-white border-indigo-700 shadow-2xs"
                                    : "bg-muted/40 text-foreground border-border/60 hover:bg-muted"
                                  }`}
                              >
                                <span>Sem {semNum}</span>
                                {count > 0 && (
                                  <span
                                    className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary font-bold"
                                      }`}
                                  >
                                    {count}
                                  </span>
                                )}
                              </button>
                            );
                          })()}

                          {/* Full Year (Annual) */}
                          {(() => {
                            const count = subjectRows.filter(
                              (r) => r.term_type === "year" && r.term_number === activeYear && r.name.trim()
                            ).length;
                            const isActive = activeSubTerm === "annual";
                            return (
                              <button
                                type="button"
                                onClick={() => setActiveSubTerm("annual")}
                                className={`py-1.5 px-2 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 border ${isActive
                                    ? "bg-amber-500 text-white border-amber-600 shadow-2xs"
                                    : "bg-muted/40 text-foreground border-border/60 hover:bg-muted"
                                  }`}
                              >
                                <span>Full Year {activeYear}</span>
                                {count > 0 && (
                                  <span
                                    className={`text-[10px] px-1 py-0.2 rounded-full font-mono ${isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary font-bold"
                                      }`}
                                  >
                                    {count}
                                  </span>
                                )}
                              </button>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Active Target Banner */}
                      <div className="text-[11px] text-muted-foreground flex items-center justify-between bg-primary/5 px-2.5 py-1.5 rounded-lg border border-primary/20">
                        <span>
                          🎯 Target:{" "}
                          <strong className="text-primary font-bold">
                            {getCurrentTarget().term_name}
                          </strong>
                        </span>
                        <span className="text-[10px]">All inputs & pastes below will belong here.</span>
                      </div>
                    </div>
                  )}
                </div>

                {editingSubject ? (
                  <div className="p-4 rounded-2xl border border-border/80 bg-card space-y-3 shadow-xs">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold text-foreground">Subject Name *</Label>
                      <Input
                        placeholder="e.g. Mathematics, Physics, Chemistry, English"
                        value={subjectName}
                        onChange={(e) => {
                          setSubjectName(e.target.value);
                          setSubjectSlug(toSlug(e.target.value));
                        }}
                        className="text-xs h-9 bg-background"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-foreground">Subject Code</Label>
                        <Input
                          placeholder="e.g. MATH-01, PHY-101"
                          value={subjectCode}
                          onChange={(e) => setSubjectCode(e.target.value)}
                          className="text-xs h-9 bg-background"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-foreground">Slug Identifier</Label>
                        <Input
                          placeholder="slug-identifier"
                          value={subjectSlug}
                          onChange={(e) => setSubjectSlug(toSlug(e.target.value))}
                          className="text-xs h-9 bg-background"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-foreground">Academic Year (Main)</Label>
                        {editTermType === "full_course" ? (
                          <Input
                            value="Full Course"
                            disabled
                            className="text-xs h-9 bg-muted text-muted-foreground"
                          />
                        ) : (
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={editYearNumber}
                            onChange={(e) => {
                              const y = Number(e.target.value) || 1;
                              setEditYearNumber(y);
                              if (editTermType === "semester") {
                                setEditSemesterNumber((y - 1) * 2 + 1);
                              }
                            }}
                            className="text-xs h-9 bg-background"
                          />
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs font-semibold text-foreground">Semester (Sub-part)</Label>
                        {editTermType === "semester" ? (
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            value={editSemesterNumber}
                            onChange={(e) => setEditSemesterNumber(Number(e.target.value) || 1)}
                            className="text-xs h-9 bg-background"
                          />
                        ) : (
                          <Input
                            value={editTermType === "year" ? "Annual" : "Full Course"}
                            disabled
                            className="text-xs h-9 bg-muted text-muted-foreground"
                          />
                        )}
                      </div>
                    </div>

                    {/* Edit Subject Icon */}
                    <div className="space-y-2">
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
                        <div className="h-11 w-11 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
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
                            className={`px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted text-xs font-semibold cursor-pointer transition-colors flex items-center gap-1.5 ${uploadingIcon ? "pointer-events-none opacity-60" : ""
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
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <ListPlus className="h-4 w-4 text-primary" />
                        Subjects to Add
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold">
                          {subjectRows.filter((r) => r.name.trim()).length} Total
                        </Badge>
                        {structureMode !== "full_course" && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium bg-primary/5 text-primary border-primary/20">
                            {getCurrentTarget().shortBadge}:{" "}
                            {
                              subjectRows.filter(
                                (r) =>
                                  r.term_type === getCurrentTarget().term_type &&
                                  r.term_number === getCurrentTarget().term_number &&
                                  r.name.trim()
                              ).length
                            }
                          </Badge>
                        )}
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
                          Paste subjects for{" "}
                          <strong className="text-primary font-bold">
                            {getCurrentTarget().term_name}
                          </strong>{" "}
                          (comma or line separated):
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
                            Add to {getCurrentTarget().shortBadge}
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Dynamic Subject Rows with Predefined Icon Fallback & Hierarchical Term Badge */}
                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                      {subjectRows.map((row, idx) => {
                        const rowYear = row.term_type === "semester" ? Math.max(1, Math.ceil(row.term_number / 2)) : row.term_number;
                        return (
                          <div
                            key={row.id}
                            className="p-2.5 rounded-2xl border border-border/80 bg-card flex items-center gap-2 group hover:border-primary/40 transition-colors shadow-2xs"
                          >
                            <span className="text-[11px] font-bold text-muted-foreground w-5 text-center shrink-0">
                              #{idx + 1}
                            </span>

                            {/* Term Badge on Row */}
                            {structureMode !== "full_course" && (
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold shrink-0 cursor-pointer ${row.term_type === "semester"
                                    ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                  }`}
                                title="Click to assign to active target"
                                onClick={() => {
                                  const target = getCurrentTarget();
                                  updateSubjectRow(row.id, "term_type", target.term_type);
                                  updateSubjectRow(row.id, "term_number", target.term_number);
                                  updateSubjectRow(row.id, "term_name", target.term_name);
                                }}
                              >
                                {row.term_type === "semester"
                                  ? `Y${rowYear} • Sem ${row.term_number}`
                                  : `Year ${rowYear} (Annual)`}
                              </Badge>
                            )}

                            {/* Icon uploader for this specific row with Predefined Default Fallback */}
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
                                  title={row.icon_url ? "Click to change icon" : "Click to upload custom icon (default predefined icon active)"}
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

                            {/* Subject Name Input */}
                            <Input
                              placeholder={`Subject #${idx + 1} Name * (e.g. Mathematics)`}
                              value={row.name}
                              onChange={(e) => updateSubjectRow(row.id, "name", e.target.value)}
                              className="h-8 text-xs flex-1 bg-background"
                              required={idx === 0}
                            />

                            {/* Subject Code Input */}
                            <Input
                              placeholder="Code (e.g. MATH-01)"
                              value={row.code}
                              onChange={(e) => updateSubjectRow(row.id, "code", e.target.value)}
                              className="h-8 text-xs w-28 shrink-0 bg-background"
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
                        );
                      })}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addSubjectRow}
                      className="w-full h-8 text-xs font-semibold border-dashed gap-1.5 hover:border-primary hover:text-primary"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Another Subject to {getCurrentTarget().shortBadge}
                    </Button>
                  </div>
                )}
              </div>

              {/* RIGHT COLUMN: Course / Program Details Card (5 Cols) */}
              <div className="lg:col-span-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    <span>Course / Program Details</span>
                  </div>
                  {(selectedCourseId || selectedCourseDetail) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedCourseId("");
                        setSelectedCourseName("");
                        setSelectedCategoryId("");
                        setSelectedCategoryName("");
                        setSelectedCourseDetail(null);
                      }}
                      className="h-6 text-[10px] text-muted-foreground hover:text-destructive px-1.5"
                    >
                      Clear Selection
                    </Button>
                  )}
                </div>

                {loadingCourseDetail ? (
                  <div className="p-8 rounded-2xl border border-border/80 bg-muted/20 flex flex-col items-center justify-center space-y-2 text-muted-foreground text-xs min-h-[220px]">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span>Loading course details...</span>
                  </div>
                ) : selectedCourseDetail ? (
                  <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-3.5">
                    {/* Header: Icon + Title */}
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl border border-border/80 bg-background flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                        {selectedCourseDetail.icon_url || selectedCourseDetail.thumbnail_url ? (
                          <img
                            src={selectedCourseDetail.icon_url || selectedCourseDetail.thumbnail_url}
                            alt="Course Icon"
                            className="h-full w-full object-contain p-1"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <GraduationCap className="h-6 w-6 text-primary" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-sm text-foreground leading-snug">
                          {selectedCourseDetail.name}
                        </h4>
                        <p className="text-[11px] text-muted-foreground truncate" title={selectedCourseDetail.category_breadcrumb || selectedCourseDetail.category_name}>
                          {selectedCourseDetail.category_breadcrumb || selectedCourseDetail.category_name || "Academic Program"}
                        </p>
                      </div>
                    </div>

                    {/* Badges / Pill Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedCourseDetail.board_name && (
                        <Badge variant="secondary" className="text-[10px] font-medium bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">
                          Board: {selectedCourseDetail.board_name}
                        </Badge>
                      )}
                      {selectedCourseDetail.university_name && (
                        <Badge variant="secondary" className="text-[10px] font-medium bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20">
                          Univ: {selectedCourseDetail.university_name}
                        </Badge>
                      )}
                      {selectedCourseDetail.certification_provider_name && (
                        <Badge variant="secondary" className="text-[10px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20">
                          Cert: {selectedCourseDetail.certification_provider_name}
                        </Badge>
                      )}
                      {selectedCourseDetail.duration_value && (
                        <Badge variant="outline" className="text-[10px] font-medium">
                          {selectedCourseDetail.duration_value} {selectedCourseDetail.duration_unit || "Months"}
                        </Badge>
                      )}
                      {selectedCourseDetail.code && (
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {selectedCourseDetail.code}
                        </Badge>
                      )}
                    </div>

                    {/* Class / Level Box */}
                    <div className="text-[11px] bg-muted/40 p-2.5 rounded-xl border border-border/50">
                      <span className="text-muted-foreground block text-[10px] uppercase font-bold">Class / Level</span>
                      <span className="font-semibold text-foreground truncate block">
                        {selectedCourseDetail.category_breadcrumb || selectedCourseDetail.category_name || "General"}
                      </span>
                    </div>

                    {selectedCourseDetail.description && (
                      <p className="text-[11px] text-muted-foreground line-clamp-3 italic">
                        "{selectedCourseDetail.description}"
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-6 rounded-2xl border border-dashed border-border/80 bg-muted/15 flex flex-col items-center justify-center text-center space-y-2 min-h-[220px] text-muted-foreground">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <Layers className="w-5 h-5 text-muted-foreground/60" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-foreground">No Course Selected</h5>
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[220px]">
                        Select a Course / Program on the left to preview its academic details here.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

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
