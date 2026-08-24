"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import {
  BookCheck,
  Plus,
  Loader2,
  Trash2,
  RefreshCw,
  Power,
  PowerOff,
  Search,
  Edit2,
  Eye,
  BookOpen,
  Building2,
  BadgeCheck,
  GraduationCap,
  FolderTree,
  Clock,
  Check,
  X,
  Sparkles,
  ImageIcon,
  ListPlus,
  ClipboardPaste,
  MoreHorizontal,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImageUploader } from "@/components/shared/image-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import {
  MasterCourse,
  CourseAuthorityType,
} from "@/lib/types/content-course";
import { Subject } from "@/lib/types/subject";

function toSlug(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function generateCourseSlug(
  name: string,
  authType: CourseAuthorityType = "board",
  boardName?: string,
  universityName?: string,
  certificationProviderName?: string
): string {
  const cleanName = (name || "").trim();
  let authPart = "";
  if (authType === "board" && boardName) {
    authPart = boardName;
  } else if (authType === "university" && universityName) {
    authPart = universityName;
  } else if (authType === "certification" && certificationProviderName) {
    authPart = certificationProviderName;
  }

  const combined = [cleanName, authPart].filter(Boolean).join(" ");
  return toSlug(combined || cleanName);
}

// Helper to determine the single authority type based on category name and hierarchy
function detectAuthorityTypeFromCategory(categoryName: string, breadcrumb?: string): CourseAuthorityType {
  const text = `${categoryName} ${breadcrumb || ""}`.toLowerCase();

  // 1. School / K-12 Academics -> Board
  const schoolRegex = /(preschool|pre-school|nursery|kindergarten|kg|primary|middle|secondary|senior secondary|matric|high school|school|k-12|class|grade|\b(1-5|6-8|9-10|11-12|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th|\d+th|\d+st|\d+nd|\d+rd)\b)/i;
  if (schoolRegex.test(text)) {
    return "board";
  }

  // 2. Higher Education / Degrees / Diplomas -> University
  const higherEdRegex = /(bachelor|bachelors|undergraduate|\bug\b|b\.?tech|b\.?e|b\.?sc|b\.?com|bba|bca|ba\b|llb|master|masters|postgraduate|\bpg\b|m\.?tech|m\.?sc|m\.?com|mba|mca|ma\b|phd|doctorate|diploma|polytechnic|degree|engineering|medical|university|college)/i;
  if (higherEdRegex.test(text)) {
    return "university";
  }

  // 3. Professional courses / Competitive / Government exams / Certifications -> Certification Body
  const professionalRegex = /(professional|competitive|government|govt|upsc|ssc|banking|railway|gate|cat|neet|jee|certification|certificate|skill|vocational|bootcamp|developer|data science|it & software)/i;
  if (professionalRegex.test(text)) {
    return "certification";
  }

  return "board";
}

export default function MasterCoursesPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();

  // Table state
  const [courses, setCourses] = useState<MasterCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageCount, setPageCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [authorityFilter, setAuthorityFilter] = useState("all");
  const [activeToggleLoadingId, setActiveToggleLoadingId] = useState<number | null>(null);

  // Master Subject options cache
  const [masterSubjects, setMasterSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Dialog state (Add / Edit)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<MasterCourse | null>(null);

  // Form fields
  const [categoryId, setCategoryId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryBreadcrumb, setCategoryBreadcrumb] = useState("");
  const [courseName, setCourseName] = useState("");
  const [courseSlug, setCourseSlug] = useState("");
  const [authorityType, setAuthorityType] = useState<CourseAuthorityType>("board");
  const [boardId, setBoardId] = useState("");
  const [boardName, setBoardName] = useState("");
  const [universityId, setUniversityId] = useState("");
  const [universityName, setUniversityName] = useState("");
  const [certificationProviderId, setCertificationProviderId] = useState("");
  const [certificationProviderName, setCertificationProviderName] = useState("");
  const [durationValue, setDurationValue] = useState<string>("1");
  const [durationUnit, setDurationUnit] = useState<string>("years");
  const [seatsAvailable, setSeatsAvailable] = useState<string>("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Dynamic Course Subjects state
  const [subjectRows, setSubjectRows] = useState<{ id: string; name: string; code: string }[]>([
    { id: "1", name: "", code: "" },
  ]);
  const [bulkInputText, setBulkInputText] = useState("");
  const [showBulkPaste, setShowBulkPaste] = useState(false);

  // Subject multi-select search in popover
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectPopoverOpen, setSubjectPopoverOpen] = useState(false);

  // View sheet state
  const [viewingCourse, setViewingCourse] = useState<MasterCourse | null>(null);
  const [viewOpen, setViewOpen] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<MasterCourse | null>(null);

  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

  // Debounce search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch Master Subjects for multi-select
  const fetchMasterSubjects = useCallback(async () => {
    if (!accessToken) return;
    setLoadingSubjects(true);
    try {
      const res = await fetch("/api/admin/subjects?limit=200", { headers: authHeader });
      const json = await res.json();
      if (res.ok) {
        setMasterSubjects(json.data || []);
      }
    } catch {
      console.error("Failed to load master subjects");
    } finally {
      setLoadingSubjects(false);
    }
  }, [accessToken, authHeader]);

  const fetchCourses = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(pagination.pageIndex + 1),
        limit: String(pagination.pageSize),
      });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (authorityFilter && authorityFilter !== "all") {
        params.set("authorityType", authorityFilter);
      }

      const res = await fetch(`/api/admin/content/courses?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await res.json();
      if (res.ok) {
        setCourses(json.data || []);
        setPageCount(json.pageCount || 0);
        setTotalCount(json.total || 0);
      } else {
        toast.error(json.error || "Failed to load courses");
      }
    } catch {
      toast.error("Network error while loading courses");
    } finally {
      setLoading(false);
    }
  }, [accessToken, pagination.pageIndex, pagination.pageSize, debouncedSearch, authorityFilter, authHeader]);

  useEffect(() => {
    if (isReady && accessToken) {
      fetchCourses();
      fetchMasterSubjects();
    }
  }, [isReady, accessToken, fetchCourses, fetchMasterSubjects]);

  // Handle Category selection from Manage Categories and auto-detect authority type
  const handleCategorySelect = (item: {
    id: string | number;
    name?: string;
    breadcrumb?: string;
    parent_name?: string | null;
    depth?: number;
  }) => {
    const cid = String(item.id);
    const cname = item.name || "";
    const cbreadcrumb = item.breadcrumb || (item.parent_name ? `${item.parent_name} › ${cname}` : cname);

    setCategoryId(cid);
    setCategoryName(cname);
    setCategoryBreadcrumb(cbreadcrumb);

    const detected = detectAuthorityTypeFromCategory(cname, cbreadcrumb);
    setAuthorityType(detected);

    // Auto-suggest course name and slug if empty
    if (!courseName.trim()) {
      setCourseName(cname);
      setCourseSlug(generateCourseSlug(cname, detected, boardName, universityName, certificationProviderName));
    }
  };

  const addSubjectRow = () => {
    setSubjectRows((prev) => [
      ...prev,
      { id: String(Date.now() + Math.random()), name: "", code: "" },
    ]);
  };

  const removeSubjectRow = (id: string) => {
    if (subjectRows.length <= 1) {
      setSubjectRows([{ id: "1", name: "", code: "" }]);
      return;
    }
    setSubjectRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateSubjectRow = (id: string, field: "name" | "code", value: string) => {
    setSubjectRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
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
    setEditingCourse(null);
    setCategoryId("");
    setCategoryName("");
    setCategoryBreadcrumb("");
    setCourseName("");
    setCourseSlug("");
    setAuthorityType("board");
    setBoardId("");
    setBoardName("");
    setUniversityId("");
    setUniversityName("");
    setCertificationProviderId("");
    setCertificationProviderName("");
    setDurationValue("1");
    setDurationUnit("years");
    setSeatsAvailable("");
    setDescription("");
    setThumbnailUrl("");
    setIconUrl("");
    setSelectedSubjectIds([]);
    setSubjectRows([{ id: "1", name: "", code: "" }]);
    setBulkInputText("");
    setShowBulkPaste(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (course: MasterCourse) => {
    setEditingCourse(course);
    setCategoryId(String(course.category_id));
    setCategoryName(course.category_name || "");
    setCategoryBreadcrumb(course.category_breadcrumb || "");
    setCourseName(course.name);
    setCourseSlug(course.slug);
    setAuthorityType(course.authority_type || "board");
    setBoardId(course.board_id ? String(course.board_id) : "");
    setBoardName(course.board_name || "");
    setUniversityId(course.university_id ? String(course.university_id) : "");
    setUniversityName(course.university_name || "");
    setCertificationProviderId(course.certification_provider_id ? String(course.certification_provider_id) : "");
    setCertificationProviderName(course.certification_provider_name || "");
    setDurationValue(course.duration_value ? String(course.duration_value) : "1");
    setDurationUnit(course.duration_unit || "years");
    setSeatsAvailable(course.seats_available ? String(course.seats_available) : "");
    setDescription(course.description || "");
    setThumbnailUrl(course.thumbnail_url || "");
    setIconUrl(course.icon_url || "");
    setSelectedSubjectIds(course.subjects ? course.subjects.map((s) => s.id) : course.subject_ids || []);
    
    if (course.subjects && course.subjects.length > 0) {
      setSubjectRows(
        course.subjects.map((s) => ({
          id: String(s.id),
          name: s.name,
          code: s.code || "",
        }))
      );
    } else {
      setSubjectRows([{ id: "1", name: "", code: "" }]);
    }
    setBulkInputText("");
    setShowBulkPaste(false);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !categoryName.trim()) {
      return toast.error("Please choose a Main Category from the database");
    }

    const finalCourseName = (courseName || categoryName).trim();
    if (!finalCourseName) {
      return toast.error("Please enter the Course / Program Name");
    }
    const finalCourseSlug = courseSlug.trim()
      ? toSlug(courseSlug)
      : generateCourseSlug(finalCourseName, authorityType, boardName, universityName, certificationProviderName);

    setSubmitting(true);
    try {
      const validCustomSubjects = subjectRows
        .filter((r) => r.name.trim().length > 0)
        .map((r) => ({
          name: r.name.trim(),
          code: r.code.trim() || null,
        }));

      const payload = {
        name: finalCourseName,
        slug: finalCourseSlug,
        categoryId: Number(categoryId),
        authorityType,
        boardId: authorityType === "board" && boardId ? Number(boardId) : null,
        universityId: authorityType === "university" && universityId ? Number(universityId) : null,
        universityName: authorityType === "university" && universityName ? universityName.trim() : null,
        certificationProviderId:
          authorityType === "certification" && certificationProviderId ? Number(certificationProviderId) : null,
        durationValue: durationValue ? Number(durationValue) : null,
        durationUnit,
        seatsAvailable: seatsAvailable ? Number(seatsAvailable) : null,
        description: description.trim() || null,
        thumbnail_url: thumbnailUrl.trim() || null,
        icon_url: iconUrl.trim() || null,
        subjectIds: selectedSubjectIds,
        customSubjects: validCustomSubjects,
        isActive: true,
      };

      if (editingCourse) {
        const res = await fetch(`/api/admin/content/courses/${editingCourse.id}`, {
          method: "PATCH",
          headers: { ...authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (res.ok) {
          toast.success("Course updated successfully");
          setDialogOpen(false);
          resetForm();
          await fetchCourses();
        } else {
          toast.error(json.error || "Failed to update course");
        }
      } else {
        const res = await fetch("/api/admin/content/courses", {
          method: "POST",
          headers: { ...authHeader, "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (res.ok) {
          toast.success("Course / Program created successfully");
          setDialogOpen(false);
          resetForm();
          await fetchCourses();
        } else {
          toast.error(json.error || "Failed to create course");
        }
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (course: MasterCourse) => {
    setActiveToggleLoadingId(course.id);
    try {
      const res = await fetch(`/api/admin/content/courses/${course.id}`, {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !course.is_active }),
      });
      if (res.ok) {
        toast.success(course.is_active ? "Course disabled" : "Course enabled");
        await fetchCourses();
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
      const res = await fetch(`/api/admin/content/courses/${deleteTarget.id}`, {
        method: "DELETE",
        headers: authHeader,
      });
      if (res.ok) {
        toast.success("Course deleted");
        setDeleteTarget(null);
        await fetchCourses();
      } else {
        const json = await res.json();
        toast.error(json.error || "Failed to delete course");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulkStatus = async (ids: number[], isActive: boolean) => {
    try {
      const res = await fetch("/api/admin/content/courses", {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ ids, isActive }),
      });
      if (res.ok) {
        toast.success(`Updated ${ids.length} course(s)`);
        await fetchCourses();
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
      const res = await fetch("/api/admin/content/courses", {
        method: "PATCH",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ ids, softDelete: true }),
      });
      if (res.ok) {
        toast.success(`Deleted ${ids.length} course(s)`);
        await fetchCourses();
      } else {
        const json = await res.json();
        toast.error(json.error || "Bulk delete failed");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const toggleSubjectSelection = (subjectId: number) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(subjectId) ? prev.filter((id) => id !== subjectId) : [...prev, subjectId]
    );
  };

  const getAuthorityBadge = (course: MasterCourse) => {
    if (course.authority_type === "board" || course.board_name) {
      return (
        <Badge variant="outline" className="gap-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/30 text-xs">
          <BookOpen className="h-3 w-3" />
          {course.board_name || "School Board"}
        </Badge>
      );
    }
    if (course.authority_type === "university" || course.university_name) {
      return (
        <Badge variant="outline" className="gap-1 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs">
          <Building2 className="h-3 w-3" />
          {course.university_name || "University"}
        </Badge>
      );
    }
    if (course.authority_type === "certification" || course.certification_provider_name) {
      return (
        <Badge variant="outline" className="gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">
          <BadgeCheck className="h-3 w-3" />
          {course.certification_provider_name || "Certification Provider"}
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-xs text-muted-foreground">
        Standard
      </Badge>
    );
  };

  const columns: ColumnDef<MasterCourse>[] = [
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
      header: "Course / Program",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex items-center gap-3">
            {c.thumbnail_url ? (
              <div className="h-10 w-10 rounded-xl border border-border bg-muted overflow-hidden shrink-0 shadow-2xs">
                <img src={c.thumbnail_url} alt={c.name} className="h-full w-full object-cover" />
              </div>
            ) : (
              <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0 border border-primary/20 shadow-2xs">
                {c.icon_url ? (
                  c.icon_url.startsWith("http") || c.icon_url.startsWith("/") ? (
                    <img src={c.icon_url} alt="icon" className="h-full w-full object-cover rounded-xl" />
                  ) : (
                    <span>{c.icon_url}</span>
                  )
                ) : (
                  <BookCheck className="h-5 w-5" />
                )}
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-foreground truncate">{c.name}</span>
              <span className="font-mono text-[11px] text-muted-foreground">{c.slug}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "category_name",
      header: "Category & Tree",
      cell: ({ row }) => {
        const c = row.original;
        return (
          <div className="flex flex-col max-w-[220px]">
            <span className="font-medium text-xs text-foreground truncate">{c.category_name}</span>
            {c.category_breadcrumb && (
              <span className="text-[11px] text-muted-foreground truncate" title={c.category_breadcrumb}>
                {c.category_breadcrumb}
              </span>
            )}
          </div>
        );
      },
    },
    {
      id: "authority",
      header: "Affiliation / Authority",
      cell: ({ row }) => getAuthorityBadge(row.original),
    },
    {
      id: "subjects",
      header: "Subjects",
      cell: ({ row }) => {
        const list = row.original.subjects || [];
        if (list.length === 0) return <span className="text-xs text-muted-foreground">-</span>;
        return (
          <div className="flex items-center gap-1 flex-wrap max-w-[200px]">
            {list.slice(0, 2).map((s) => (
              <Badge key={s.id} variant="secondary" className="text-[10px] px-1.5 py-0">
                {s.name}
              </Badge>
            ))}
            {list.length > 2 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/30">
                +{list.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "duration",
      header: "Duration",
      cell: ({ row }) => {
        const c = row.original;
        if (!c.duration_value) return <span className="text-xs text-muted-foreground">-</span>;
        return (
          <span className="text-xs font-medium text-foreground flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            {c.duration_value} {c.duration_unit}
          </span>
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
              >
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open actions menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem
                onClick={() => {
                  setViewingCourse(item);
                  setViewOpen(true);
                }}
                className="cursor-pointer gap-2"
              >
                <Eye className="h-4 w-4 text-muted-foreground" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => openEditDialog(item)}
                className="cursor-pointer gap-2"
              >
                <Edit2 className="h-4 w-4 text-muted-foreground" />
                Edit Course
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={activeToggleLoadingId === item.id}
                onClick={() => handleToggleActive(item)}
                className="cursor-pointer gap-2"
              >
                {activeToggleLoadingId === item.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                ) : (
                  <Power
                    className={`h-4 w-4 ${
                      active ? "text-emerald-500" : "text-muted-foreground"
                    }`}
                  />
                )}
                {active ? "Disable Course" : "Enable Course"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteTarget(item)}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Delete Course
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
            <BookCheck className="h-6 w-6 text-primary" />
            Courses & Programs
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure standardized courses, academic programs, degrees, and competitive exam tracks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openCreateDialog} className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
            <Plus className="mr-2 h-4 w-4" /> Add Course / Program
          </Button>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="border border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <BookCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Courses</p>
              <h3 className="text-xl font-extrabold text-foreground">{totalCount}</h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center font-bold">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">School Board Programs</p>
              <h3 className="text-xl font-extrabold text-foreground">
                {courses.filter((c) => c.authority_type === "board").length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">University Degrees</p>
              <h3 className="text-xl font-extrabold text-foreground">
                {courses.filter((c) => c.authority_type === "university").length}
              </h3>
            </div>
          </CardContent>
        </Card>
        <Card className="border border-border/80 shadow-2xs">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <BadgeCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Certifications & Exams</p>
              <h3 className="text-xl font-extrabold text-foreground">
                {courses.filter((c) => c.authority_type === "certification").length}
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
                placeholder="Search by course name, category, or code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background/50 border-border"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={authorityFilter} onValueChange={setAuthorityFilter}>
                <SelectTrigger className="w-[190px] h-9 text-xs bg-background/50 border-border">
                  <SelectValue placeholder="All Authority Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Authority Types</SelectItem>
                  <SelectItem value="board">School Boards</SelectItem>
                  <SelectItem value="university">Universities</SelectItem>
                  <SelectItem value="certification">Certifications / Bodies</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="ghost"
                size="icon"
                onClick={fetchCourses}
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
            data={courses}
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
                      if (confirm(`Delete ${ids.length} selected courses?`)) {
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

      {/* Add / Edit Course Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <BookCheck className="h-5 w-5 text-primary" />
              {editingCourse ? "Edit Course / Program" : "Add New Course / Program"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select category, program title, dynamic affiliation authority, and curriculum subjects.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Step 1: Choose Main Category from categories table */}
            <div className="space-y-1.5 p-3.5 rounded-2xl border border-border/80 bg-muted/20">
              <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>1. Main Category (from Manage Categories) *</span>
                {categoryName && (
                  <span className="text-[11px] text-primary font-semibold">
                    Detected: {authorityType === "board" ? "School Board" : authorityType === "university" ? "University Degree" : "Certification / Exam"}
                  </span>
                )}
              </Label>
              <AsyncSearchPopover<{ id: number; name: string; slug: string; parent_name?: string; depth?: number }>
                value={categoryId}
                onChange={(val) => {
                  setCategoryId(val);
                  if (!val) {
                    setCategoryName("");
                    setCategoryBreadcrumb("");
                  }
                }}
                onSelectItem={(item) => {
                  handleCategorySelect(item);
                }}
                selectedLabel={categoryName || undefined}
                placeholder="Select main category from categories table..."
                searchPlaceholder="Search main categories..."
                emptyText="No main categories found"
                fetcher={async (search, page) => {
                  const res = await fetch(
                    `/api/admin/categories?onlyRoot=true&page=${page}&limit=50&search=${encodeURIComponent(search)}`,
                    { headers: authHeader }
                  );
                  if (!res.ok) throw new Error("Failed to load categories");
                  const json = await res.json();
                  return { data: json.data || [], hasMore: page < (json.pageCount || 1) };
                }}
                getValue={(item) => String(item.id)}
                getLabel={(item) => item.name}
                renderItem={(c) => (
                  <div className="flex items-center justify-between py-1.5 w-full text-left gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-bold text-foreground truncate">{c.name}</span>
                      <span className="text-[10px] text-muted-foreground font-mono">{c.slug}</span>
                    </div>
                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 bg-background font-semibold shrink-0">
                      Main Category
                    </Badge>
                  </div>
                )}
              />
              {categoryBreadcrumb && (
                <p className="text-[11px] text-muted-foreground truncate" title={categoryBreadcrumb}>
                  Selected Category: <strong className="text-foreground/80">{categoryBreadcrumb}</strong>
                </p>
              )}
            </div>

            {/* Step 2: Course / Program Name */}
            <div className="space-y-1.5 p-3.5 rounded-2xl border border-border/80 bg-muted/20">
              <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>2. Course / Program Name *</span>
                {courseSlug && (
                  <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[220px]">
                    slug: {courseSlug}
                  </span>
                )}
              </Label>
              <Input
                placeholder="e.g. Class 1, Computer Science Engineering, UPSC General Studies..."
                value={courseName}
                onChange={(e) => {
                  const val = e.target.value;
                  setCourseName(val);
                  setCourseSlug(generateCourseSlug(val, authorityType, boardName, universityName, certificationProviderName));
                }}
                className="h-10 text-sm font-semibold"
                required
              />
              <p className="text-[11px] text-muted-foreground">
                Enter the exact course/program title to display across the platform.
              </p>
            </div>

            {/* Step 3: Single Context-Aware Authority Dropdown based on Category */}
            {authorityType === "board" && (
              <div className="space-y-1.5 p-3.5 rounded-2xl border border-violet-500/20 bg-violet-500/5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-violet-500" />
                  3. Educational Board *
                </Label>
                <AsyncSearchPopover<{ id: number; name: string; slug: string; code?: string }>
                  value={boardId}
                  onChange={(val) => {
                    setBoardId(val);
                    if (!val) {
                      setBoardName("");
                      setCourseSlug(generateCourseSlug(courseName, "board", "", universityName, certificationProviderName));
                    }
                  }}
                  onSelectItem={(item) => {
                    setBoardId(String(item.id));
                    setBoardName(item.name);
                    setCourseSlug(generateCourseSlug(courseName, "board", item.name, universityName, certificationProviderName));
                  }}
                  selectedLabel={boardName || undefined}
                  placeholder="Select Board (CBSE, ICSE, State Board, IB, Cambridge)..."
                  searchPlaceholder="Search boards..."
                  emptyText="No boards found"
                  fetcher={async (search, page) => {
                    const res = await fetch(
                      `/api/admin/boards?page=${page}&limit=20&search=${encodeURIComponent(search)}`,
                      { headers: authHeader }
                    );
                    if (!res.ok) throw new Error("Failed to load boards");
                    const json = await res.json();
                    return { data: json.data || [], hasMore: page < (json.pageCount || 1) };
                  }}
                  getValue={(item) => String(item.id)}
                  getLabel={(item) => item.name}
                />
              </div>
            )}

            {authorityType === "university" && (
              <div className="space-y-1.5 p-3.5 rounded-2xl border border-blue-500/20 bg-blue-500/5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-blue-500" />
                  3. University / Degree Granting Institution *
                </Label>
                <AsyncSearchPopover<{ id: number; name: string; slug?: string }>
                  value={universityId}
                  onChange={(val) => {
                    setUniversityId(val);
                    if (!val) {
                      setUniversityName("");
                      setCourseSlug(generateCourseSlug(courseName, "university", boardName, "", certificationProviderName));
                    }
                  }}
                  onSelectItem={(item) => {
                    setUniversityId(String(item.id));
                    setUniversityName(item.name);
                    setCourseSlug(generateCourseSlug(courseName, "university", boardName, item.name, certificationProviderName));
                  }}
                  selectedLabel={universityName || undefined}
                  placeholder="Select university or enter university name..."
                  searchPlaceholder="Search university from database..."
                  emptyText="No university found"
                  fetcher={async (search, page) => {
                    const res = await fetch(
                      `/api/admin/certifications?provider_type=affiliation&page=${page}&limit=20&search=${encodeURIComponent(search)}`,
                      { headers: authHeader }
                    );
                    if (!res.ok) throw new Error("Failed to load universities");
                    const json = await res.json();
                    return { data: json.data || [], hasMore: page < (json.pageCount || 1) };
                  }}
                  getValue={(item) => String(item.id)}
                  getLabel={(item) => item.name}
                  allowCustomValue
                  onCreateCustomValue={(customVal) => {
                    setUniversityId("");
                    setUniversityName(customVal);
                    setCourseSlug(generateCourseSlug(courseName, "university", boardName, customVal, certificationProviderName));
                  }}
                />
              </div>
            )}

            {authorityType === "certification" && (
              <div className="space-y-1.5 p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-amber-500" />
                  3. Affiliated By / Certification Body *
                </Label>
                <AsyncSearchPopover<{ id: number; name: string; slug: string; code?: string }>
                  value={certificationProviderId}
                  onChange={(val) => {
                    setCertificationProviderId(val);
                    if (!val) {
                      setCertificationProviderName("");
                      setCourseSlug(generateCourseSlug(courseName, "certification", boardName, universityName, ""));
                    }
                  }}
                  onSelectItem={(item) => {
                    setCertificationProviderId(String(item.id));
                    setCertificationProviderName(item.name);
                    setCourseSlug(generateCourseSlug(courseName, "certification", boardName, universityName, item.name));
                  }}
                  selectedLabel={certificationProviderName || undefined}
                  placeholder="Select certification provider (UGC, AICTE, NASSCOM, NPTEL)..."
                  searchPlaceholder="Search certification providers..."
                  emptyText="No certification providers found"
                  fetcher={async (search, page) => {
                    const res = await fetch(
                      `/api/admin/certifications?page=${page}&limit=20&search=${encodeURIComponent(search)}`,
                      { headers: authHeader }
                    );
                    if (!res.ok) throw new Error("Failed to load certification providers");
                    const json = await res.json();
                    return { data: json.data || [], hasMore: page < (json.pageCount || 1) };
                  }}
                  getValue={(item) => String(item.id)}
                  getLabel={(item) => item.name}
                />
              </div>
            )}

            {/* Step 4: Curriculum Subjects to Add */}
            <div className="space-y-3 p-3.5 rounded-2xl border border-border/80 bg-muted/10">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <ListPlus className="h-4 w-4 text-primary" />
                  4. Subjects to Add
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

              {/* Dynamic Subject Rows */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {subjectRows.map((row, idx) => (
                  <div
                    key={row.id}
                    className="p-2.5 rounded-xl border border-border/80 bg-card/60 flex items-center gap-2 group hover:border-primary/40 transition-colors shadow-2xs"
                  >
                    <span className="text-[11px] font-bold text-muted-foreground w-5 text-center shrink-0">
                      #{idx + 1}
                    </span>
                    <Input
                      placeholder={`Subject #${idx + 1} Name (e.g. Mathematics)`}
                      value={row.name}
                      onChange={(e) => updateSubjectRow(row.id, "name", e.target.value)}
                      className="h-8 text-xs flex-1"
                    />
                    <Input
                      placeholder="Code (Optional)"
                      value={row.code}
                      onChange={(e) => updateSubjectRow(row.id, "code", e.target.value)}
                      className="h-8 text-xs w-28 shrink-0"
                    />
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

            {/* Step 5: Duration */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">5. Duration</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 1"
                  value={durationValue}
                  onChange={(e) => setDurationValue(e.target.value)}
                  className="w-28"
                />
                <Select value={durationUnit} onValueChange={setDurationUnit}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="days">Days</SelectItem>
                    <SelectItem value="weeks">Weeks</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                    <SelectItem value="years">Years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Step 6: Description */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">6. Course Description / Highlights (Optional)</Label>
              <Textarea
                placeholder="Overview of curriculum, eligibility criteria, teaching methodologies..."
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
                {editingCourse ? "Save Changes" : "Create Course"}
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
              <BookCheck className="h-5 w-5 text-primary" />
              Course Overview
            </SheetTitle>
            <SheetDescription className="text-xs">
              Full curriculum profile and accreditation details.
            </SheetDescription>
          </SheetHeader>

          {viewingCourse && (
            <div className="space-y-5 py-5 text-sm">
              {viewingCourse.thumbnail_url && (
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden border border-border shadow-sm">
                  <img src={viewingCourse.thumbnail_url} alt={viewingCourse.name} className="h-full w-full object-cover" />
                  {viewingCourse.icon_url && (
                    <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-xl bg-background/90 backdrop-blur-sm border text-sm font-bold shadow-2xs">
                      {viewingCourse.icon_url}
                    </div>
                  )}
                </div>
              )}

              <div className="p-4 rounded-2xl bg-muted/20 border border-border/80 space-y-2">
                <div className="flex items-center gap-2.5">
                  {viewingCourse.icon_url && !viewingCourse.thumbnail_url && (
                    <span className="text-2xl">{viewingCourse.icon_url}</span>
                  )}
                  <h3 className="font-bold text-lg text-foreground">{viewingCourse.name}</h3>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {getAuthorityBadge(viewingCourse)}
                  {viewingCourse.duration_value && (
                    <Badge variant="outline" className="text-xs bg-background">
                      {viewingCourse.duration_value} {viewingCourse.duration_unit}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="py-2 border-b border-border/60 space-y-1">
                  <span className="text-xs font-medium text-muted-foreground block">Category Hierarchy</span>
                  <span className="text-xs font-semibold text-foreground block">
                    {viewingCourse.category_name}
                  </span>
                  {viewingCourse.category_breadcrumb && (
                    <p className="text-[11px] text-muted-foreground">
                      {viewingCourse.category_breadcrumb}
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-between py-2 border-b border-border/60">
                  <span className="text-xs font-medium text-muted-foreground">Slug</span>
                  <span className="font-mono text-xs">{viewingCourse.slug}</span>
                </div>

                {viewingCourse.subjects && viewingCourse.subjects.length > 0 && (
                  <div className="py-2 border-b border-border/60 space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground block">Curriculum Subjects</span>
                    <div className="flex flex-wrap gap-1.5">
                      {viewingCourse.subjects.map((s) => (
                        <Badge key={s.id} variant="secondary" className="text-xs py-0.5">
                          <GraduationCap className="h-3 w-3 mr-1 text-primary" />
                          {s.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {viewingCourse.description && (
                  <div className="py-2 border-b border-border/60 space-y-1">
                    <span className="text-xs font-medium text-muted-foreground block">Description</span>
                    <p className="text-xs text-foreground/90 leading-relaxed whitespace-pre-wrap">
                      {viewingCourse.description}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-between py-2 border-b border-border/60">
                  <span className="text-xs font-medium text-muted-foreground">Registered Date</span>
                  <span className="text-xs text-foreground">
                    {new Date(viewingCourse.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => {
                    setViewOpen(false);
                    openEditDialog(viewingCourse);
                  }}
                  className="w-full bg-primary text-primary-foreground font-semibold"
                >
                  <Edit2 className="h-4 w-4 mr-1.5" /> Edit Course / Program
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
              Delete Course / Program
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
