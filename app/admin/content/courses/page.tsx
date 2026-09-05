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
  Upload,
  Languages,
  Globe,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  certificationProviderName?: string,
  medium?: string
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

  const combined = [cleanName, authPart, medium].filter(Boolean).join(" ");
  return toSlug(combined || cleanName);
}

function computeGeneratedCourseName(
  categoryName: string,
  authType: CourseAuthorityType = "board",
  boardName?: string,
  universityName?: string,
  certificationProviderName?: string,
  medium?: string
): string {
  const cat = (categoryName || "").trim();
  let authPart = "";
  if (authType === "board" && boardName) {
    authPart = boardName.trim();
  } else if (authType === "university" && universityName) {
    authPart = universityName.trim();
  } else if (authType === "certification" && certificationProviderName) {
    authPart = certificationProviderName.trim();
  }

  let baseName = "";
  if (cat && authPart) {
    if (cat.toLowerCase().includes(authPart.toLowerCase())) {
      baseName = cat;
    } else {
      baseName = `${cat} - ${authPart}`;
    }
  } else {
    baseName = cat || authPart || "";
  }

  const med = (medium || "").trim();
  if (med && baseName) {
    const medSuffix = med.toLowerCase().includes("medium") ? med : `${med} Medium`;
    if (!baseName.toLowerCase().includes(med.toLowerCase())) {
      return `${baseName} - ${medSuffix}`;
    }
  }

  return baseName;
}

const STANDARD_MEDIUMS = [
  "English",
  "Hindi",
  "Bilingual (English + Hindi)",
  "Sanskrit",
  "Urdu",
  "Bengali",
  "Marathi",
  "Telugu",
  "Tamil",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Punjabi",
  "Odia",
  "Assamese",
  "French",
  "German",
  "Spanish",
];

// Helper to determine the single authority type based on category name and hierarchy
function detectAuthorityTypeFromCategory(categoryName: string, breadcrumb?: string): CourseAuthorityType {
  const text = `${categoryName} ${breadcrumb || ""}`.toLowerCase();

  // 1. School / K-12 Academics (LKG to Class 12th) -> Board
  const schoolRegex = /(lkg|ukg|nursery|pre-school|preschool|kindergarten|kg|primary|middle|secondary|senior secondary|matric|high school|school|k-12|class|grade|standard|std|\b(1-5|6-8|9-10|11-12|1st|2nd|3rd|4th|5th|6th|7th|8th|9th|10th|11th|12th|\d+th|\d+st|\d+nd|\d+rd)\b|intermediate|\+2|plus two)/i;
  if (schoolRegex.test(text)) {
    return "board";
  }

  // 2. Technical programs / Skill / IT & Software / Certifications / Competitive tracks -> Certification Body
  const technicalRegex = /(technical|tech\s+program|it & software|coding|programming|software engineering|cloud|devops|cyber security|cybersecurity|data science|machine learning|ai|artificial intelligence|full stack|web development|networking|professional|competitive|government|govt|upsc|ssc|banking|railway|gate|cat|neet|jee|certification|certificate|certified|bootcamp|skill|vocational|short-term|training program)/i;
  if (technicalRegex.test(text)) {
    return "certification";
  }

  // 3. Higher Education / Degrees / Bachelor, Master, PhD, Doctorate -> University
  const higherEdRegex = /(degree|bachelor|bachelors|undergraduate|\bug\b|b\.?tech|btech|b\.?e\b|be\b|b\.?sc|bsc|b\.?com|bcom|bba|bca|ba\b|llb|b\.?ed|bed|mbbs|bds|b\.?pharm|bpharm|b\.?arch|barch|b\.?des|bdes|master|masters|postgraduate|\bpg\b|m\.?tech|mtech|m\.?e\b|me\b|m\.?sc|msc|m\.?com|mcom|mba|mca|ma\b|llm|m\.?ed|med|md\b|ms\b|m\.?pharm|mpharm|phd|ph\.d|doctorate|post-doc|postdoc|m\.?phil|mphil|diploma|polytechnic|university|college)/i;
  if (higherEdRegex.test(text)) {
    return "university";
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
  const [activeDialogTab, setActiveDialogTab] = useState<"basic" | "duration_icon" | "subjects">("basic");
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
  const [medium, setMedium] = useState<string>("English");
  const [customMediumInput, setCustomMediumInput] = useState("");
  const [durationValue, setDurationValue] = useState<string>("1");
  const [durationUnit, setDurationUnit] = useState<string>("years");
  const [seatsAvailable, setSeatsAvailable] = useState<string>("");
  const [description, setDescription] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Dynamic Course Subjects state
  const [subjectRows, setSubjectRows] = useState<{
    id: string;
    name: string;
    code: string;
    term_type?: string;
    term_number?: number;
    term_name?: string;
  }[]>([
    { id: "1", name: "", code: "", term_type: "semester", term_number: 1, term_name: "Year 1 Semester 1" },
  ]);
  const [selectedTermFilter, setSelectedTermFilter] = useState<string>("all");
  const [bulkInputText, setBulkInputText] = useState("");
  const [showBulkPaste, setShowBulkPaste] = useState(false);

  // Subject multi-select search in popover
  const [subjectSearch, setSubjectSearch] = useState("");
  const [subjectPopoverOpen, setSubjectPopoverOpen] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);

  const handleCourseIconUpload = async (file: File) => {
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
        setIconUrl(uploadedUrl);
        toast.success("Course icon uploaded successfully");
      } else {
        toast.error(json.error || "Failed to upload icon");
      }
    } catch {
      toast.error("Failed to upload icon");
    } finally {
      setUploadingIcon(false);
    }
  };

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

    const generated = computeGeneratedCourseName(cname, detected, boardName, universityName, certificationProviderName, medium);
    setCourseName(generated);
    setCourseSlug(generateCourseSlug(generated, detected, boardName, universityName, certificationProviderName, medium));
  };

  // Compute available terms from duration selected in Tab 2
  const availableTerms = useMemo(() => {
    const num = Math.max(1, Number(durationValue) || 1);
    if (durationUnit === "years") {
      const terms: {
        key: string;
        label: string;
        term_type: string;
        term_number: number;
        term_name: string;
        yearNumber: number;
      }[] = [];
      for (let yr = 1; yr <= num; yr++) {
        const s1 = (yr - 1) * 2 + 1;
        const s2 = (yr - 1) * 2 + 2;
        terms.push({
          key: `sem-${s1}`,
          label: `Year ${yr} • Sem ${s1}`,
          term_type: "semester",
          term_number: s1,
          term_name: `Year ${yr} Semester ${s1}`,
          yearNumber: yr,
        });
        terms.push({
          key: `sem-${s2}`,
          label: `Year ${yr} • Sem ${s2}`,
          term_type: "semester",
          term_number: s2,
          term_name: `Year ${yr} Semester ${s2}`,
          yearNumber: yr,
        });
      }
      return terms;
    } else if (durationUnit === "years_annual") {
      const terms: {
        key: string;
        label: string;
        term_type: string;
        term_number: number;
        term_name: string;
        yearNumber: number;
      }[] = [];
      for (let yr = 1; yr <= num; yr++) {
        terms.push({
          key: `year-${yr}`,
          label: `Year ${yr} (Annual)`,
          term_type: "year",
          term_number: yr,
          term_name: `Year ${yr} (Annual)`,
          yearNumber: yr,
        });
      }
      return terms;
    } else if (durationUnit === "semesters") {
      const terms: {
        key: string;
        label: string;
        term_type: string;
        term_number: number;
        term_name: string;
        yearNumber: number;
      }[] = [];
      for (let s = 1; s <= num; s++) {
        const yr = Math.ceil(s / 2);
        terms.push({
          key: `sem-${s}`,
          label: `Year ${yr} • Sem ${s}`,
          term_type: "semester",
          term_number: s,
          term_name: `Semester ${s}`,
          yearNumber: yr,
        });
      }
      return terms;
    }
    return [
      {
        key: "full_course",
        label: "Full Course / Core Curriculum",
        term_type: "full_course",
        term_number: 1,
        term_name: "Core Curriculum",
        yearNumber: 1,
      },
    ];
  }, [durationValue, durationUnit]);

  const addSubjectRow = (preferredTermNumber?: number, preferredTermName?: string, preferredTermType?: string) => {
    const defaultTerm = availableTerms[0] || {
      term_type: "semester",
      term_number: 1,
      term_name: "Year 1 Semester 1",
    };
    setSubjectRows((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        name: "",
        code: "",
        term_type: preferredTermType || defaultTerm.term_type,
        term_number: preferredTermNumber ?? defaultTerm.term_number,
        term_name: preferredTermName || defaultTerm.term_name,
      },
    ]);
  };

  const removeSubjectRow = (id: string) => {
    if (subjectRows.length <= 1) {
      const defaultTerm = availableTerms[0] || {
        term_type: "semester",
        term_number: 1,
        term_name: "Year 1 Semester 1",
      };
      setSubjectRows([{ id: "1", name: "", code: "", ...defaultTerm }]);
      return;
    }
    setSubjectRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateSubjectRow = (
    id: string,
    field: "name" | "code" | "term_number" | "term_name" | "term_type",
    value: any
  ) => {
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

    let targetTerm = availableTerms[0];
    if (selectedTermFilter !== "all") {
      const found = availableTerms.find((t) => t.key === selectedTermFilter);
      if (found) targetTerm = found;
    }

    const newRows = names.map((n, i) => ({
      id: String(Date.now() + i),
      name: n,
      code: "",
      term_type: targetTerm?.term_type || "semester",
      term_number: targetTerm?.term_number || 1,
      term_name: targetTerm?.term_name || "Semester 1",
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
    setActiveDialogTab("basic");
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
    setMedium("English");
    setCustomMediumInput("");
    setDurationValue("1");
    setDurationUnit("years");
    setSeatsAvailable("");
    setDescription("");
    setThumbnailUrl("");
    setIconUrl("");
    setSelectedSubjectIds([]);
    setSubjectRows([
      { id: "1", name: "", code: "", term_type: "semester", term_number: 1, term_name: "Year 1 Semester 1" },
    ]);
    setSelectedTermFilter("all");
    setBulkInputText("");
    setShowBulkPaste(false);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (course: MasterCourse) => {
    setEditingCourse(course);
    setActiveDialogTab("basic");
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
    
    // Parse single medium
    let courseMedium = "English";
    if (Array.isArray(course.mediums) && course.mediums.length > 0) {
      courseMedium = course.mediums[0];
    } else if (course.medium) {
      courseMedium = course.medium.split(",")[0].trim() || "English";
    }
    setMedium(courseMedium);
    setCustomMediumInput("");

    setSeatsAvailable(course.seats_available ? String(course.seats_available) : "");
    setDescription(course.description || "");
    setThumbnailUrl(course.thumbnail_url || "");
    setIconUrl(course.icon_url || "");
    setSelectedSubjectIds(course.subjects ? course.subjects.map((s) => s.id) : course.subject_ids || []);
    
    if (course.subjects && course.subjects.length > 0) {
      setSubjectRows(
        course.subjects.map((s, i) => ({
          id: String(s.id || i + 1),
          name: s.name,
          code: s.code || "",
          term_type: s.term_type || "semester",
          term_number: s.term_number || 1,
          term_name: s.term_name || `Semester ${s.term_number || 1}`,
        }))
      );
    } else {
      setSubjectRows([
        { id: "1", name: "", code: "", term_type: "semester", term_number: 1, term_name: "Year 1 Semester 1" },
      ]);
    }
    setSelectedTermFilter("all");
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
      : generateCourseSlug(finalCourseName, authorityType, boardName, universityName, certificationProviderName, medium);

    setSubmitting(true);
    try {
      const validCustomSubjects = subjectRows
        .filter((r) => r.name.trim().length > 0)
        .map((r) => ({
          name: r.name.trim(),
          code: r.code.trim() || null,
          term_type: r.term_type || "semester",
          term_number: r.term_number || 1,
          term_name: r.term_name || `Semester ${r.term_number || 1}`,
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
        mediums: medium ? [medium] : ["English"],
        medium: medium || "English",
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
      id: "medium",
      header: "Medium",
      cell: ({ row }) => {
        const c = row.original;
        const mediums = Array.isArray(c.mediums) && c.mediums.length > 0
          ? c.mediums
          : c.medium
          ? c.medium.split(",").map((s) => s.trim()).filter(Boolean)
          : [];
        if (mediums.length === 0) return <span className="text-xs text-muted-foreground">-</span>;
        return (
          <div className="flex items-center gap-1 flex-wrap max-w-[180px]">
            {mediums.slice(0, 2).map((m) => (
              <Badge key={m} variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 font-medium">
                {m}
              </Badge>
            ))}
            {mediums.length > 2 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-muted/30">
                +{mediums.length - 2}
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
        const unitLabel = c.duration_unit === "years_annual"
          ? `Year${Number(c.duration_value) > 1 ? "s" : ""} (Annual)`
          : `${c.duration_unit}`;
        return (
          <span className="text-xs font-medium text-foreground flex items-center gap-1">
            <Clock className="h-3 w-3 text-muted-foreground" />
            {c.duration_value} {unitLabel}
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

      {/* Table Card */}
      <Card className="border border-border/80 shadow-xs">
        <CardContent className="p-5">
          {/* DataTable with Unified Single-Row Toolbar */}
          <DataTable
            columns={columns}
            data={courses}
            loading={loading}
            pagination={pagination}
            onPaginationChange={setPagination}
            pageCount={pageCount}
            showRowNumbers
            toolbarLeft={
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by course name, category, or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-9 text-xs bg-background/50 border-border"
                />
              </div>
            }
            toolbarRight={
              <div className="flex items-center gap-2">
                <Select value={authorityFilter} onValueChange={setAuthorityFilter}>
                  <SelectTrigger className="w-[180px] h-9 text-xs bg-background/50 border-border">
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
        <DialogContent className="max-w-4xl sm:max-w-4xl max-h-[90vh] overflow-y-auto w-full">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <BookCheck className="h-5 w-5 text-primary" />
              {editingCourse ? "Edit Course / Program" : "Add New Course / Program"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Select category, program title, dynamic affiliation authority, and curriculum subjects.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-1">
            {/* 3 Interactive Tabs */}
            <Tabs
              value={activeDialogTab}
              onValueChange={(val: string) => setActiveDialogTab(val as any)}
              className="w-full space-y-4"
            >
              <TabsList className="grid grid-cols-3 w-full h-11 p-1 bg-muted/60 rounded-xl border border-border/60">
                <TabsTrigger
                  value="basic"
                  className="text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-lg transition-all"
                >
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  1. Basic Info
                </TabsTrigger>
                <TabsTrigger
                  value="duration_icon"
                  className="text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-lg transition-all"
                >
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  2. Duration & Icon
                </TabsTrigger>
                <TabsTrigger
                  value="subjects"
                  className="text-xs font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-xs rounded-lg transition-all"
                >
                  <ListPlus className="h-3.5 w-3.5 text-primary" />
                  3. Subjects
                  {subjectRows.filter((r) => r.name.trim()).length > 0 && (
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold bg-primary/10 text-primary">
                      {subjectRows.filter((r) => r.name.trim()).length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              {/* TAB 1: Basic Info */}
              <TabsContent value="basic" className="space-y-3.5 mt-0 focus-visible:outline-none">
                {/* Step 1: Choose Main Category */}
                <div className="space-y-1.5 p-3.5 rounded-2xl border border-border/80 bg-muted/20">
                  <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>1. Main Category (from Manage Categories) *</span>
                    {categoryId && (
                      <span className="text-[10px] text-muted-foreground font-mono">
                        Category ID: #{categoryId}
                      </span>
                    )}
                  </Label>
                  <AsyncSearchPopover<{ id: number; name: string; breadcrumb?: string; depth?: number }>
                    value={categoryId}
                    onChange={(val) => {
                      setCategoryId(val);
                      if (!val) {
                        setCategoryName("");
                        setCategoryBreadcrumb("");
                      }
                    }}
                    onSelectItem={(item) => handleCategorySelect(item)}
                    selectedLabel={categoryName || undefined}
                    placeholder="Select main category from categories table..."
                    searchPlaceholder="Search categories by name..."
                    emptyText="No category found"
                    fetcher={async (search, page) => {
                      const res = await fetch(
                        `/api/admin/categories?page=${page}&limit=20&search=${encodeURIComponent(search)}`,
                        { headers: authHeader }
                      );
                      if (!res.ok) throw new Error("Failed to load categories");
                      const json = await res.json();
                      return { data: json.data || [], hasMore: page < (json.pageCount || 1) };
                    }}
                    getValue={(item) => String(item.id)}
                    getLabel={(item) => item.breadcrumb || item.name}
                    renderItem={(item) => (
                      <div className="flex flex-col py-0.5">
                        <span className="font-semibold text-xs text-foreground">{item.name}</span>
                        {item.breadcrumb && (
                          <span className="text-[10px] text-muted-foreground">{item.breadcrumb}</span>
                        )}
                      </div>
                    )}
                  />
                  {categoryBreadcrumb && (
                    <p className="text-[11px] text-muted-foreground truncate" title={categoryBreadcrumb}>
                      Selected Category: <strong className="text-foreground/80">{categoryBreadcrumb}</strong>
                    </p>
                  )}
                </div>

                {/* Step 2: Context-Aware Authority Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      {authorityType === "board" && <BookOpen className="h-4 w-4 text-violet-500" />}
                      {authorityType === "university" && <Building2 className="h-4 w-4 text-blue-500" />}
                      {authorityType === "certification" && <BadgeCheck className="h-4 w-4 text-amber-500" />}
                      <span>
                        2. {authorityType === "board" ? "Educational Board *" : authorityType === "university" ? "University / Degree Granting Institution *" : "Affiliated By / Certification Body *"}
                      </span>
                    </Label>

                    {/* Authority Type Quick Switcher */}
                    <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-lg border border-border/60 text-[10px] overflow-x-auto">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthorityType("board");
                          const generated = computeGeneratedCourseName(categoryName, "board", boardName, universityName, certificationProviderName, medium);
                          setCourseName(generated);
                          setCourseSlug(generateCourseSlug(generated, "board", boardName, universityName, certificationProviderName, medium));
                        }}
                        className={`px-2 py-0.5 rounded-md font-semibold transition-all whitespace-nowrap ${
                          authorityType === "board"
                            ? "bg-violet-600 text-white shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Board
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthorityType("university");
                          const generated = computeGeneratedCourseName(categoryName, "university", boardName, universityName, certificationProviderName, medium);
                          setCourseName(generated);
                          setCourseSlug(generateCourseSlug(generated, "university", boardName, universityName, certificationProviderName, medium));
                        }}
                        className={`px-2 py-0.5 rounded-md font-semibold transition-all whitespace-nowrap ${
                          authorityType === "university"
                            ? "bg-blue-600 text-white shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        University
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthorityType("certification");
                          const generated = computeGeneratedCourseName(categoryName, "certification", boardName, universityName, certificationProviderName, medium);
                          setCourseName(generated);
                          setCourseSlug(generateCourseSlug(generated, "certification", boardName, universityName, certificationProviderName, medium));
                        }}
                        className={`px-2 py-0.5 rounded-md font-semibold transition-all whitespace-nowrap ${
                          authorityType === "certification"
                            ? "bg-amber-600 text-white shadow-2xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Certification
                      </button>
                    </div>
                  </div>

                  {authorityType === "board" && (
                    <div className="space-y-1.5 p-3.5 rounded-2xl border border-violet-500/20 bg-violet-500/5">
                      <AsyncSearchPopover<{ id: number; name: string; slug: string; code?: string }>
                        value={boardId}
                        onChange={(val) => {
                          setBoardId(val);
                          if (!val) {
                            setBoardName("");
                            const generated = computeGeneratedCourseName(categoryName, "board", "", universityName, certificationProviderName, medium);
                            setCourseName(generated);
                            setCourseSlug(generateCourseSlug(generated, "board", "", universityName, certificationProviderName, medium));
                          }
                        }}
                        onSelectItem={(item) => {
                          setBoardId(String(item.id));
                          setBoardName(item.name);
                          const generated = computeGeneratedCourseName(categoryName, "board", item.name, universityName, certificationProviderName, medium);
                          setCourseName(generated);
                          setCourseSlug(generateCourseSlug(generated, "board", item.name, universityName, certificationProviderName, medium));
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
                      <AsyncSearchPopover<{ id: number; name: string; slug?: string }>
                        value={universityId}
                        onChange={(val) => {
                          setUniversityId(val);
                          if (!val) {
                            setUniversityName("");
                            const generated = computeGeneratedCourseName(categoryName, "university", boardName, "", certificationProviderName, medium);
                            setCourseName(generated);
                            setCourseSlug(generateCourseSlug(generated, "university", boardName, "", certificationProviderName, medium));
                          }
                        }}
                        onSelectItem={(item) => {
                          setUniversityId(String(item.id));
                          setUniversityName(item.name);
                          const generated = computeGeneratedCourseName(categoryName, "university", boardName, item.name, certificationProviderName, medium);
                          setCourseName(generated);
                          setCourseSlug(generateCourseSlug(generated, "university", boardName, item.name, certificationProviderName, medium));
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
                          const generated = computeGeneratedCourseName(categoryName, "university", boardName, customVal, certificationProviderName, medium);
                          setCourseName(generated);
                          setCourseSlug(generateCourseSlug(generated, "university", boardName, customVal, certificationProviderName, medium));
                        }}
                      />
                    </div>
                  )}

                  {authorityType === "certification" && (
                    <div className="space-y-1.5 p-3.5 rounded-2xl border border-amber-500/20 bg-amber-500/5">
                      <AsyncSearchPopover<{ id: number; name: string; slug: string; code?: string }>
                        value={certificationProviderId}
                        onChange={(val) => {
                          setCertificationProviderId(val);
                          if (!val) {
                            setCertificationProviderName("");
                            const generated = computeGeneratedCourseName(categoryName, "certification", boardName, universityName, "", medium);
                            setCourseName(generated);
                            setCourseSlug(generateCourseSlug(generated, "certification", boardName, universityName, "", medium));
                          }
                        }}
                        onSelectItem={(item) => {
                          setCertificationProviderId(String(item.id));
                          setCertificationProviderName(item.name);
                          const generated = computeGeneratedCourseName(categoryName, "certification", boardName, universityName, item.name, medium);
                          setCourseName(generated);
                          setCourseSlug(generateCourseSlug(generated, "certification", boardName, universityName, item.name, medium));
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
                </div>

                {/* Step 3: Course / Program Name */}
                <div className="space-y-1.5 p-3.5 rounded-2xl border border-border/80 bg-muted/20">
                  <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                    <span>3. Course / Program Name *</span>
                    {courseSlug && (
                      <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[220px]">
                        slug: {courseSlug}
                      </span>
                    )}
                  </Label>
                  <Input
                    placeholder="e.g. Class 10 - CBSE, B.Tech - Sharda University..."
                    value={courseName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCourseName(val);
                      setCourseSlug(generateCourseSlug(val, authorityType, boardName, universityName, certificationProviderName, medium));
                    }}
                    className="h-10 text-sm font-semibold bg-background"
                    required
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Auto-generated from Category and Board/University.
                  </p>
                </div>

                {/* Course Description */}
                <div className="space-y-1.5 p-3.5 rounded-2xl border border-border/80 bg-muted/20">
                  <Label className="text-xs font-semibold">4. Course Description / Highlights (Optional)</Label>
                  <Textarea
                    placeholder="Overview of curriculum, eligibility criteria, teaching methodologies..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="bg-background"
                  />
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <Button type="button" variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setActiveDialogTab("duration_icon")}
                    className="text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Next: Duration & Icon →
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 2: Duration & Icon */}
              <TabsContent value="duration_icon" className="space-y-4 mt-0 focus-visible:outline-none">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Left: Duration & Academic Structure */}
                  <div className="space-y-2.5 p-3.5 rounded-2xl border border-border/80 bg-muted/20 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-primary" />
                        1. Duration & Structure *
                      </Label>
                      <span className="text-[10px] text-muted-foreground font-semibold">
                        {durationUnit === "years"
                          ? `${durationValue || 1} Year${Number(durationValue) > 1 ? "s" : ""} • ${(Number(durationValue) || 1) * 2} Semesters`
                          : durationUnit === "years_annual"
                          ? `${durationValue || 1} Year${Number(durationValue) > 1 ? "s" : ""} (Annual)`
                          : durationUnit === "semesters"
                          ? `${durationValue || 1} Semesters • ${Math.ceil((Number(durationValue) || 1) / 2)} Years`
                          : `${durationValue || 1} ${durationUnit}`}
                      </span>
                    </div>

                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        placeholder="e.g. 4"
                        value={durationValue}
                        onChange={(e) => setDurationValue(e.target.value)}
                        className="w-24 h-9 text-xs font-semibold bg-background"
                        required
                      />
                      <Select value={durationUnit} onValueChange={setDurationUnit}>
                        <SelectTrigger className="flex-1 h-9 text-xs bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="years">Years (with Semesters)</SelectItem>
                          <SelectItem value="years_annual">Years (without Semesters / Annual)</SelectItem>
                          <SelectItem value="semesters">Semesters</SelectItem>
                          <SelectItem value="months">Months</SelectItem>
                          <SelectItem value="weeks">Weeks</SelectItem>
                          <SelectItem value="days">Days</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Interactive Visual Breakdown Badges */}
                    {durationUnit === "years" && (
                      <div className="p-2.5 rounded-xl bg-background/80 border border-border/60 space-y-1.5">
                        <div className="text-[10px] font-bold text-muted-foreground flex items-center justify-between">
                          <span>Generated Academic Breakdown:</span>
                          <span className="text-primary font-semibold">{(Number(durationValue) || 1) * 2} Total Semesters</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-0.5">
                          {Array.from({ length: Math.min(10, Math.max(1, Number(durationValue) || 1)) }).map((_, yIdx) => {
                            const yr = yIdx + 1;
                            const s1 = (yr - 1) * 2 + 1;
                            const s2 = (yr - 1) * 2 + 2;
                            return (
                              <div key={yr} className="flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded-md border text-[10px]">
                                <strong className="text-foreground font-semibold">Y{yr}:</strong>
                                <span className="text-indigo-600 dark:text-indigo-400 font-mono font-medium">Sem {s1}</span>
                                <span className="text-muted-foreground">•</span>
                                <span className="text-indigo-600 dark:text-indigo-400 font-mono font-medium">Sem {s2}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {durationUnit === "years_annual" && (
                      <div className="p-2.5 rounded-xl bg-background/80 border border-border/60 space-y-1.5">
                        <div className="text-[10px] font-bold text-muted-foreground flex items-center justify-between">
                          <span>Generated Academic Breakdown:</span>
                          <span className="text-primary font-semibold">{durationValue || 1} Total Year{Number(durationValue) > 1 ? "s" : ""} (Annual)</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-0.5">
                          {Array.from({ length: Math.min(10, Math.max(1, Number(durationValue) || 1)) }).map((_, yIdx) => {
                            const yr = yIdx + 1;
                            return (
                              <div key={yr} className="flex items-center gap-1.5 bg-muted/60 px-2.5 py-1 rounded-md border text-[10px]">
                                <strong className="text-foreground font-semibold">Year {yr}</strong>
                                <span className="text-muted-foreground text-[9px] font-medium">(Annual)</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {durationUnit === "semesters" && (
                      <div className="p-2.5 rounded-xl bg-background/80 border border-border/60 space-y-1.5">
                        <div className="text-[10px] font-bold text-muted-foreground flex items-center justify-between">
                          <span>Generated Semesters:</span>
                          <span className="text-primary font-semibold">{durationValue || 1} Semesters</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-0.5">
                          {Array.from({ length: Math.min(20, Math.max(1, Number(durationValue) || 1)) }).map((_, sIdx) => {
                            const sem = sIdx + 1;
                            const yr = Math.ceil(sem / 2);
                            return (
                              <span key={sem} className="bg-muted/60 px-2 py-0.5 rounded-md border text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                                Y{yr} • Sem {sem}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Course / Program Icon Upload */}
                  <div className="space-y-2 p-3.5 rounded-2xl border border-border/80 bg-muted/20 flex flex-col justify-between">
                    <div className="space-y-1">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4 text-primary" />
                        2. Course / Program Icon
                      </Label>
                      <p className="text-[11px] text-muted-foreground">
                        Upload custom vector icon (WebP, SVG, PNG) or paste URL.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <div className="h-14 w-14 rounded-2xl border border-border bg-background flex items-center justify-center overflow-hidden shrink-0 shadow-2xs">
                        {iconUrl ? (
                          <img
                            src={iconUrl}
                            alt="Course Icon"
                            className="h-full w-full object-contain p-1.5"
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                          />
                        ) : (
                          <GraduationCap className="h-7 w-7 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="file"
                            id="course-icon-upload-input"
                            accept=".webp,.svg,.png,.jpg,.jpeg,image/webp,image/svg+xml,image/png,image/jpeg"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleCourseIconUpload(file);
                                e.target.value = "";
                              }
                            }}
                          />
                          <label
                            htmlFor="course-icon-upload-input"
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
                            placeholder="or paste icon URL..."
                            value={iconUrl}
                            onChange={(e) => setIconUrl(e.target.value)}
                            className="h-8 text-xs flex-1 bg-background"
                          />
                          {iconUrl && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                              onClick={() => setIconUrl("")}
                              title="Clear icon"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveDialogTab("basic")}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    ← Back to Basic Info
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => setActiveDialogTab("subjects")}
                    className="text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Next: Subjects (Year & Semester Wise) →
                  </Button>
                </div>
              </TabsContent>

              {/* TAB 3: Subjects (Year & Semester Wise) */}
              <TabsContent value="subjects" className="space-y-3.5 mt-0 focus-visible:outline-none">
                <datalist id="existing-master-subjects-list">
                  {masterSubjects.map((s) => (
                    <option key={s.id} value={s.name}>
                      {s.code ? `Code: ${s.code}` : s.name}
                    </option>
                  ))}
                </datalist>

                <div className="space-y-3 p-3.5 rounded-2xl border border-border/80 bg-muted/20">
                  {/* Semester / Year Filter Bar */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                        <ListPlus className="h-4 w-4 text-primary" />
                        Curriculum Subjects (Year & Semester Wise)
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-semibold bg-primary/10 text-primary">
                          {subjectRows.filter((r) => r.name.trim()).length} Total
                        </Badge>
                      </Label>

                      <div className="flex items-center gap-1.5">
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
                    </div>

                    {/* Term Selector Pills */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                      <button
                        type="button"
                        onClick={() => setSelectedTermFilter("all")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border whitespace-nowrap ${
                          selectedTermFilter === "all"
                            ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                            : "bg-background text-foreground border-border/80 hover:bg-muted"
                        }`}
                      >
                        All Terms ({subjectRows.filter((r) => r.name.trim()).length})
                      </button>
                      {availableTerms.map((term) => {
                        const count = subjectRows.filter(
                          (r) => r.term_number === term.term_number && r.name.trim()
                        ).length;
                        const isActive = selectedTermFilter === term.key;
                        return (
                          <button
                            key={term.key}
                            type="button"
                            onClick={() => setSelectedTermFilter(term.key)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border whitespace-nowrap flex items-center gap-1.5 ${
                              isActive
                                ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                                : "bg-background text-foreground border-border/80 hover:bg-muted"
                            }`}
                          >
                            <span>{term.label}</span>
                            {count > 0 && (
                              <span className={`text-[10px] px-1 rounded-full font-mono font-bold ${
                                isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                              }`}>
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Bulk Paste Box */}
                  {showBulkPaste && (
                    <div className="p-3 rounded-2xl border border-primary/30 bg-primary/5 space-y-2">
                      <Label className="text-[11px] font-semibold text-muted-foreground block">
                        Paste multiple subjects (comma or line separated) into{" "}
                        <strong className="text-foreground">
                          {selectedTermFilter === "all"
                            ? availableTerms[0]?.label || "Semester 1"
                            : availableTerms.find((t) => t.key === selectedTermFilter)?.label}
                        </strong>:
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
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {subjectRows
                      .filter((r) => {
                        if (selectedTermFilter === "all") return true;
                        const matchedTerm = availableTerms.find((t) => t.key === selectedTermFilter);
                        return matchedTerm ? r.term_number === matchedTerm.term_number : true;
                      })
                      .map((row, idx) => (
                        <div
                          key={row.id}
                          className="p-2.5 rounded-xl border border-border/80 bg-background flex items-center gap-2 group hover:border-primary/40 transition-colors shadow-2xs"
                        >
                          <span className="text-[11px] font-bold text-muted-foreground w-6 text-center shrink-0">
                            #{idx + 1}
                          </span>

                          {/* Term / Semester Selector */}
                          <Select
                            value={String(row.term_number || 1)}
                            onValueChange={(val) => {
                              const num = Number(val);
                              const targetTerm = availableTerms.find((t) => t.term_number === num);
                              updateSubjectRow(row.id, "term_number", num);
                              if (targetTerm) {
                                updateSubjectRow(row.id, "term_type", targetTerm.term_type);
                                updateSubjectRow(row.id, "term_name", targetTerm.term_name);
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 text-[11px] w-36 sm:w-44 bg-muted/40 font-semibold shrink-0">
                              <SelectValue placeholder="Semester..." />
                            </SelectTrigger>
                            <SelectContent>
                              {availableTerms.map((t) => (
                                <SelectItem key={t.key} value={String(t.term_number)} className="text-xs">
                                  {t.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Autocomplete input with datalist */}
                          <Input
                            list="existing-master-subjects-list"
                            placeholder="Subject Name (e.g. Mathematics)"
                            value={row.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              updateSubjectRow(row.id, "name", val);
                              const matched = masterSubjects.find(
                                (s) => s.name.toLowerCase() === val.trim().toLowerCase()
                              );
                              if (matched && matched.code && !row.code) {
                                updateSubjectRow(row.id, "code", matched.code);
                              }
                            }}
                            className="h-8 text-xs flex-1 bg-background"
                          />

                          <Input
                            placeholder="Code"
                            value={row.code}
                            onChange={(e) => updateSubjectRow(row.id, "code", e.target.value)}
                            className="h-8 text-xs w-24 sm:w-28 shrink-0 bg-background"
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

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const targetTerm = selectedTermFilter !== "all"
                          ? availableTerms.find((t) => t.key === selectedTermFilter)
                          : availableTerms[0];
                        addSubjectRow(targetTerm?.term_number, targetTerm?.term_name, targetTerm?.term_type);
                      }}
                      className="flex-1 h-8 text-xs font-semibold border-dashed gap-1.5 hover:border-primary hover:text-primary"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Subject to{" "}
                      {selectedTermFilter === "all"
                        ? "Course"
                        : availableTerms.find((t) => t.key === selectedTermFilter)?.label}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveDialogTab("duration_icon")}
                    className="text-xs text-muted-foreground"
                  >
                    ← Back to Duration & Icon
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            {activeDialogTab === "subjects" && (
              <DialogFooter className="gap-2 pt-3 border-t border-border/60">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting} className="bg-primary text-primary-foreground font-semibold">
                  {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingCourse ? "Save Changes" : "Create Course"}
                </Button>
              </DialogFooter>
            )}
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

                {((Array.isArray(viewingCourse.mediums) && viewingCourse.mediums.length > 0) || viewingCourse.medium) && (
                  <div className="py-2 border-b border-border/60 space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground block">Medium of Instruction</span>
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(viewingCourse.mediums) && viewingCourse.mediums.length > 0
                        ? viewingCourse.mediums
                        : (viewingCourse.medium || "").split(",").map((s) => s.trim()).filter(Boolean)
                      ).map((m) => (
                        <Badge key={m} variant="secondary" className="text-xs py-0.5 bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/20 font-medium">
                          <Languages className="h-3 w-3 mr-1 text-blue-500" />
                          {m}
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

      {/* Fetch from Subject Table Modal Dialog */}
      <Dialog open={subjectPopoverOpen} onOpenChange={setSubjectPopoverOpen}>
        <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Fetch Subjects from Subject Table
            </DialogTitle>
            <DialogDescription className="text-xs">
              Select existing subjects from the master subjects database to add to this course.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subject by name or code..."
                value={subjectSearch}
                onChange={(e) => setSubjectSearch(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex-1 overflow-y-auto border rounded-xl p-2 space-y-1.5 min-h-60 max-h-72">
              {loadingSubjects ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground text-xs gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading subjects from database...
                </div>
              ) : masterSubjects.filter((s) =>
                  !subjectSearch.trim() ||
                  s.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
                  (s.code && s.code.toLowerCase().includes(subjectSearch.toLowerCase()))
                ).length === 0 ? (
                <div className="text-center py-10 text-muted-foreground text-xs">
                  No subjects found matching &quot;{subjectSearch}&quot;.
                </div>
              ) : (
                masterSubjects
                  .filter((s) =>
                    !subjectSearch.trim() ||
                    s.name.toLowerCase().includes(subjectSearch.toLowerCase()) ||
                    (s.code && s.code.toLowerCase().includes(subjectSearch.toLowerCase()))
                  )
                  .map((sub) => {
                    const isSelected =
                      selectedSubjectIds.includes(sub.id) ||
                      subjectRows.some(
                        (r) => r.name.trim().toLowerCase() === sub.name.trim().toLowerCase()
                      );
                    return (
                      <div
                        key={sub.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSubjectIds((prev) => prev.filter((id) => id !== sub.id));
                            setSubjectRows((prev) => {
                              const remaining = prev.filter(
                                (r) => r.name.trim().toLowerCase() !== sub.name.trim().toLowerCase()
                              );
                              return remaining.length > 0
                                ? remaining
                                : [{ id: String(Date.now()), name: "", code: "" }];
                            });
                          } else {
                            setSelectedSubjectIds((prev) => [...prev, sub.id]);
                            setSubjectRows((prev) => {
                              const filtered = prev.filter((r) => r.name.trim() !== "");
                              return [
                                ...filtered,
                                {
                                  id: String(sub.id),
                                  name: sub.name,
                                  code: sub.code || "",
                                },
                              ];
                            });
                          }
                        }}
                        className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                          isSelected
                            ? "border-primary/60 bg-primary/10 text-foreground"
                            : "border-border/60 hover:bg-muted/40 text-foreground/80"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Checkbox checked={isSelected} className="rounded" />
                          <div className="min-w-0">
                            <span className="font-semibold text-xs block truncate">{sub.name}</span>
                            {sub.code && (
                              <span className="text-[10px] text-muted-foreground">Code: {sub.code}</span>
                            )}
                          </div>
                        </div>
                        {sub.board_name && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {sub.board_name}
                          </Badge>
                        )}
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between gap-2 pt-2 border-t">
            <span className="text-xs text-muted-foreground font-medium">
              {subjectRows.filter((r) => r.name.trim()).length} subjects selected
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSubjectPopoverOpen(false)}
              >
                Done
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
