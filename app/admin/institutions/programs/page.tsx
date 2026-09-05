"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import {
    Plus,
    Loader2,
    BookOpen,
    Languages,
    DollarSign,
    ImageIcon,
    ArrowLeft,
    ArrowRight,
    RefreshCw,
    MoreHorizontal,
    GraduationCap,
    Upload,
    X,
    Power,
    PowerOff,
    Trash2,
    Sparkles,
    Clock,
    Building2,
    BadgeCheck,
    FolderTree,
    Percent,
    BadgePercent,
    Tag,
    Check,
    BookMarked,
    Users,
    Search,
    CheckCircle2,
    Layers,
    Calendar,
    RotateCcw,
    Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { MultiSelect } from "@/components/ui/multi-select";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { ImagePreviewSlider } from "@/components/shared/image-preview-slider";
import { useProgressiveSave } from "@/hooks/use-progressive-save";
import { ProgressiveSaveIndicator } from "@/components/shared/progressive-save-indicator";
import { InstitutionProgram, MasterType } from "@/lib/types/institution";
import { slugify } from "@/lib/utils/slug";
import { cn } from "@/lib/utils";
import { MarketplaceSellOption } from "@/components/admin/marketplace-sell-option";
import { ProgramSyllabusManager, EditableSyllabusTopic } from "@/components/admin/institutions/program-syllabus-manager";

// ---------- Pending Media type ----------
type PendingMedia = {
    id: string;
    file?: File;
    mediaType: "image" | "video";
    url: string;
    title: string;
    uploading?: boolean;
};

type ProgramMultiOption = {
    id: number;
    value: string;
    label: string;
    description?: string;
};

type ActiveInstitutionProfile = {
    board_id?: number | string | null;
    parent_university_id?: number | string | null;
    parent_university_name?: string | null;
};

type InstitutionOption = {
    id: number;
    name?: string | null;
    organization_name?: string | null;
    slug?: string | null;
    board_id?: number | string | null;
    parent_university_id?: number | string | null;
    parent_university_name?: string | null;
};

type FeeComponentForm = {
    id?: string;
    title: string;
    amount: string;
    payment_mode?: "one_time" | "installment";
    unit: string;
    installments_count?: number | string;
    has_discount?: boolean;
    discount_type?: "percentage" | "fixed";
    discount_value?: string;
};

const COMMON_FEE_TYPES = [
    "Tuition Fee",
    "Admission Fee",
    "Registration Fee",
    "Examination Fee",
    "Library Fee",
    "Laboratory & Practical Fee",
    "Transport / Bus Charges",
    "Hostel / Accommodation",
    "Development & Infra Fee",
    "Sports & Cultural Fee",
    "Study Material & Books",
    "Caution Deposit (Refundable)",
] as const;

const FEE_UNIT_OPTIONS = [
    { value: "one-time", label: "💳 One-Time Full Payment (Lump Sum)" },
    { value: "month", label: "📅 Monthly Basis (/ month)" },
    { value: "quarter", label: "🎓 Quarterly Basis (every 3 months)" },
    { value: "half-year", label: "🏛️ Half-Yearly / Semester (every 6 months)" },
    { value: "year", label: "📆 Yearly Basis (/ year)" },
    { value: "week", label: "⏱️ Weekly Basis (/ week)" },
    { value: "day", label: "☀️ Daily Basis (/ day)" },
] as const;

function normalizeFeeUnit(unit: string) {
    const normalized = (unit || "").trim().toLowerCase();
    const unitMap: Record<string, string> = {
        hours: "hour",
        hour: "hour",
        days: "day",
        day: "day",
        weeks: "week",
        week: "week",
        months: "month",
        month: "month",
        quarter: "quarter",
        quarters: "quarter",
        quarterly: "quarter",
        "half-year": "half-year",
        "half-yearly": "half-year",
        halfyear: "half-year",
        semester: "half-year",
        semesters: "half-year",
        years: "year",
        year: "year",
        yearly: "year",
        "one-time": "one-time",
        onetime: "one-time",
    };
    return unitMap[normalized] || normalized || "year";
}

function getEstimatedInstallmentsCount(unit: string, durationVal: number, durationUnitStr: string): number {
    const dVal = durationVal > 0 ? durationVal : 1;
    const dUnit = (durationUnitStr || "year").toLowerCase();
    let totalMonths = 12;
    if (dUnit.includes("month")) totalMonths = dVal;
    else if (dUnit.includes("year")) totalMonths = dVal * 12;
    else if (dUnit.includes("week")) totalMonths = Math.max(1, Math.round(dVal / 4.33));
    else if (dUnit.includes("day")) totalMonths = Math.max(1, Math.round(dVal / 30));

    const normUnit = normalizeFeeUnit(unit);
    switch (normUnit) {
        case "one-time": return 1;
        case "month": return totalMonths;
        case "quarter": return Math.max(1, Math.ceil(totalMonths / 3));
        case "half-year": return Math.max(1, Math.ceil(totalMonths / 6));
        case "year": return Math.max(1, Math.ceil(totalMonths / 12));
        case "week": return Math.max(1, Math.round(totalMonths * 4.33));
        case "day": return Math.max(1, totalMonths * 30);
        default: return 1;
    }
}

function feeUnitSuffix(unit: string) {
    const normalized = normalizeFeeUnit(unit);
    return normalized ? `/ ${normalized}` : "Select unit";
}

function getProgramMediaType(file: File) {
    if (file.type.startsWith("image/")) return "image" as const;
    if (file.type.startsWith("video/")) return "video" as const;
    return null;
}

function isVideoMedia(media: any) {
    return media?.media_type === "video" || media?.resource_type === "video" || /\.(mp4|webm|mov|m4v|ogg)$/i.test(media?.url || "");
}

function getMediaTypeFromUrl(url: string): "image" | "video" | null {
    const lower = url.toLowerCase();
    if (/\.(png|jpg|jpeg|webp|gif|avif)(\?|#|$)/i.test(lower)) return "image";
    if (/\.(mp4|webm|mov|m4v|ogg|mkv)(\?|#|$)/i.test(lower)) return "video";
    return null;
}

function getMediaTitleFromUrl(url: string) {
    try {
        const parsed = new URL(url);
        const lastPath = parsed.pathname.split("/").filter(Boolean).pop();
        return lastPath ? decodeURIComponent(lastPath) : "media";
    } catch {
        return "media";
    }
}

export default function ProgramsAdminPage() {
    const { isReady } = useAdminGuard();
    const { accessToken, user } = useAuthStore();
    const { activeInstitution, activeInstitutionId } = useActiveInstitution();
    const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
    const isPlatformAdmin = Boolean(user?.role_codes?.includes("platform_admin") || user?.is_super_admin);
    const useSidebarInstitution = Boolean(activeInstitution && !isPlatformAdmin);

    const [items, setItems] = useState<InstitutionProgram[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageCount, setPageCount] = useState(-1);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [dialogOpen, setDialogOpen] = useState(false);

    // Platform Admin Institution Filter
    const [selectedFilterInstitutionId, setSelectedFilterInstitutionId] = useState<string>("all");
    const [registeredInstitutions, setRegisteredInstitutions] = useState<InstitutionOption[]>([]);
    const [loadingInstitutions, setLoadingInstitutions] = useState(false);

    // ---- Basic step fields ----
    const [institutionId, setInstitutionId] = useState<number | string>("");
    const [institutionName, setInstitutionName] = useState("");
    const [institutionBoardId, setInstitutionBoardId] = useState<number | string>("");
    const [activeInstitutionProfile, setActiveInstitutionProfile] = useState<ActiveInstitutionProfile | null>(null);
    const [programTypeId, setProgramTypeId] = useState<number | string>("");
    const [programTypeName, setProgramTypeName] = useState("");
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [durationValue, setDurationValue] = useState<string>("");
    const [durationUnit, setDurationUnit] = useState<string>("");
    const [seatsAvailable, setSeatsAvailable] = useState<string>("");
    const [teachingMethod, setTeachingMethod] = useState<string>("");
    const [universityId, setUniversityId] = useState<number | string>("");
    const [universityName, setUniversityName] = useState("");
    // ---- Content step fields ----
    const [about, setAbout] = useState("");
    const [masterCourseId, setMasterCourseId] = useState<string>("");
    const [selectedMasterCourse, setSelectedMasterCourse] = useState<any>(null);
    const [categoryId, setCategoryId] = useState<string>("");
    const [categoryLabel, setCategoryLabel] = useState("");
    const [selectedLanguageIds, setSelectedLanguageIds] = useState<string[]>([]);
    const [selectedLanguages, setSelectedLanguages] = useState<{ id: number; name: string }[]>([]);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
    const [subjectOptionsCache, setSubjectOptionsCache] = useState<ProgramMultiOption[]>([]);
    const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
    const [sectionOptionsCache, setSectionOptionsCache] = useState<ProgramMultiOption[]>([]);

    // ---- Fee step fields ----
    const [defaultFeePaymentBasis, setDefaultFeePaymentBasis] = useState<"installment" | "one_time">("installment");
    const [tuitionFee, setTuitionFee] = useState("");
    const [tuitionFeeUnit, setTuitionFeeUnit] = useState<string>("year");
    const [hasDiscount, setHasDiscount] = useState<boolean>(false);
    const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
    const [discountValue, setDiscountValue] = useState<string>("");
    const [feeComponents, setFeeComponents] = useState<FeeComponentForm[]>([]);

    // ---- Media step fields ----
    const [mediaList, setMediaList] = useState<any[]>([]);
    const [mediaLoading, setMediaLoading] = useState(false);
    const [pendingMediaFiles, setPendingMediaFiles] = useState<PendingMedia[]>([]);
    const [mediaUploading, setMediaUploading] = useState(false);
    const [mediaUrlInput, setMediaUrlInput] = useState("");
    const [mediaUrlType, setMediaUrlType] = useState<"auto" | "image" | "video">("auto");
    const mediaInputRef = useRef<HTMLInputElement>(null);
    const editDetailRequestRef = useRef(0);

    const [submitting, setSubmitting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<InstitutionProgram | null>(null);
    const [editing, setEditing] = useState<InstitutionProgram | null>(null);
    const [activeLoadingId, setActiveLoadingId] = useState<number | null>(null);
    const [activeStep, setActiveStep] = useState(0);
    const [programDetailLoading, setProgramDetailLoading] = useState(false);
    const [sellOnMarketplace, setSellOnMarketplace] = useState(false);
    const [marketplacePrice, setMarketplacePrice] = useState<number>(0);

    // ---- View sheet ----
    const [viewing, setViewing] = useState<InstitutionProgram | null>(null);
    const [viewOpen, setViewOpen] = useState(false);
    const [viewMediaList, setViewMediaList] = useState<any[]>([]);
    const [viewDetail, setViewDetail] = useState<any>(null);
    const [viewDetailLoading, setViewDetailLoading] = useState(false);

    const isMediaUploadPending = mediaUploading || pendingMediaFiles.some((media) => media.uploading);
    const selectedSubjectOptions = useMemo(() => {
        const optionMap = new Map(subjectOptionsCache.map((option) => [option.value, option] as const));
        return selectedSubjectIds
            .map((value) => optionMap.get(value))
            .filter((option): option is ProgramMultiOption => Boolean(option));
    }, [selectedSubjectIds, subjectOptionsCache]);
    const selectedSectionOptions = useMemo(() => {
        const optionMap = new Map(sectionOptionsCache.map((option) => [option.value, option] as const));
        return selectedSectionIds
            .map((value) => optionMap.get(value))
            .filter((option): option is ProgramMultiOption => Boolean(option));
    }, [selectedSectionIds, sectionOptionsCache]);
    const feeDurationUnitLabel = useMemo(() => {
        return normalizeFeeUnit(durationUnit) ? feeUnitSuffix(durationUnit) : "per program";
    }, [durationUnit]);
    const isSubjectProgramType = useMemo(
        () => programTypeName.trim().toLowerCase() === "subject",
        [programTypeName]
    );

    const [availableProgramTypes, setAvailableProgramTypes] = useState<MasterType[]>([]);
    const [boardId, setBoardId] = useState<string>("");
    const [boardName, setBoardName] = useState<string>("");

    useEffect(() => {
        if (!accessToken) return;
        fetch(`/api/program-types?limit=50`, { headers: authHeader })
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
                const types = json?.data || [];
                setAvailableProgramTypes(types);
                if (types.length > 0 && !programTypeId) {
                    setProgramTypeId(String(types[0].id));
                    setProgramTypeName(types[0].name);
                }
            })
            .catch(() => undefined);
    }, [accessToken, authHeader, programTypeId]);

    const getInstitutionOptionLabel = useCallback((item: InstitutionOption) => {
        return item.organization_name || item.name || item.slug || `Institution ${item.id}`;
    }, []);

    const applyInstitutionOptionToForm = useCallback((item: InstitutionOption | null) => {
        if (!item) {
            setInstitutionId("");
            setInstitutionName("");
            setInstitutionBoardId("");
            setUniversityId("");
            setUniversityName("");
            setSelectedSubjectIds([]);
            setSubjectOptionsCache([]);
            setSelectedSectionIds([]);
            setSectionOptionsCache([]);
            return;
        }

        if (String(institutionId) !== String(item.id)) {
            setSelectedSubjectIds([]);
            setSubjectOptionsCache([]);
            setSelectedSectionIds([]);
            setSectionOptionsCache([]);
        }

        setInstitutionId(item.id);
        setInstitutionName(getInstitutionOptionLabel(item));
        setInstitutionBoardId(item.board_id || "");
        if (item.parent_university_id) {
            setUniversityId(item.parent_university_id);
            setUniversityName(item.parent_university_name || `University ID: ${item.parent_university_id}`);
        } else {
            setUniversityId("");
            setUniversityName("");
        }
    }, [getInstitutionOptionLabel, institutionId]);

    const fetchInstitutions = useCallback(async (search: string, page: number) => {
        const params = new URLSearchParams({
            page: String(page),
            limit: "15",
            search,
        });
        const res = await fetch(`/api/admin/institutions/profiles?${params.toString()}`, { headers: authHeader });
        if (!res.ok) throw new Error("Failed to load institutions");
        const json = await res.json();
        return { data: json.data || [], hasMore: page < Number(json.pageCount ?? 0) };
    }, [authHeader]);

    const applyActiveInstitutionToForm = useCallback(() => {
        if (!useSidebarInstitution || !activeInstitution) return;
        if (String(institutionId) !== String(activeInstitution.id)) {
            setSelectedSubjectIds([]);
            setSubjectOptionsCache([]);
            setSelectedSectionIds([]);
            setSectionOptionsCache([]);
        }
        setInstitutionId(activeInstitution.id);
        setInstitutionName(activeInstitution.name);
        setInstitutionBoardId(activeInstitutionProfile?.board_id || "");
        if (activeInstitutionProfile?.parent_university_id) {
            setUniversityId(activeInstitutionProfile.parent_university_id);
            setUniversityName(activeInstitutionProfile.parent_university_name || `University ID: ${activeInstitutionProfile.parent_university_id}`);
        } else {
            setUniversityId("");
            setUniversityName("");
        }
    }, [activeInstitution, activeInstitutionProfile, institutionId, useSidebarInstitution]);

    const [syllabusNodes, setSyllabusNodes] = useState<EditableSyllabusTopic[]>([]);
    const [derivedStream, setDerivedStream] = useState<string>("");

    const autoDetectProgramAttributes = useCallback((courseName: string) => {
        const lower = courseName.toLowerCase();
        let detectedType = "";
        let detectedStream = "";
        let suggestedDuration = { value: "", unit: "" };

        if (/\b(b\.?tech|m\.?tech|b\.?e\.?|m\.?e\.?|bca|mca|b\.?sc|m\.?sc|b\.?com|m\.?com|bba|mba|mbbs|b\.?pharm|ll\.?b|ll\.?m|ph\.?d|bachelor|master|degree)\b/i.test(lower)) {
            detectedType = "Degree";
            if (/\b(b\.?tech|b\.?e\.?)\b/i.test(lower)) suggestedDuration = { value: "4", unit: "years" };
            else if (/\b(m\.?tech|mba|mca|m\.?sc|m\.?com)\b/i.test(lower)) suggestedDuration = { value: "2", unit: "years" };
            else if (/\b(b\.?sc|b\.?com|bba|bca|b\.?a\.?)\b/i.test(lower)) suggestedDuration = { value: "3", unit: "years" };
            else if (/\b(mbbs)\b/i.test(lower)) suggestedDuration = { value: "5", unit: "years" };
        } else if (/\b(diploma|polytechnic)\b/i.test(lower)) {
            detectedType = "Diploma";
            suggestedDuration = { value: "3", unit: "years" };
        } else if (/\b(class|grade|10th|12th|9th|11th|secondary|primary|cbse|icse)\b/i.test(lower)) {
            detectedType = "Academics";
            suggestedDuration = { value: "1", unit: "years" };
        } else if (/\b(neet|jee|upsc|ssc|gate|cat|clat|coaching|foundation)\b/i.test(lower)) {
            detectedType = "Competitive Coaching";
            suggestedDuration = { value: "1", unit: "years" };
        } else if (/\b(certificate|cert|bootcamp|skill)\b/i.test(lower)) {
            detectedType = "Certification";
            suggestedDuration = { value: "6", unit: "months" };
        }

        // Stream detection
        if (/\b(mechanical|civil|cse|computer|electrical|electronics|robotics|ai|data|engineering|automobile|aero)\b/i.test(lower)) {
            detectedStream = "Engineering & Technology";
        } else if (/\b(medical|mbbs|nursing|pharmacy|dental|neet|biotech|ayurveda|homeopathy)\b/i.test(lower)) {
            detectedStream = "Medical & Healthcare";
        } else if (/\b(commerce|finance|accounting|bba|mba|b\.?com|banking|chartered|economics)\b/i.test(lower)) {
            detectedStream = "Commerce & Management";
        } else if (/\b(physics|chemistry|math|science|biology|zoology|botany|pcm|pcb)\b/i.test(lower)) {
            detectedStream = "Science & Research";
        } else if (/\b(arts|humanities|history|political|english|literature|sociology|psychology)\b/i.test(lower)) {
            detectedStream = "Arts & Humanities";
        } else if (/\b(law|legal|llb|llm|judiciary|corporate law)\b/i.test(lower)) {
            detectedStream = "Law & Legal Studies";
        } else if (/\b(design|animation|vfx|ui\/ux|graphic|multimedia|fashion)\b/i.test(lower)) {
            detectedStream = "Design & Media";
        }

        return { detectedType, detectedStream, suggestedDuration };
    }, []);

    const steps = [
        { label: "Basic", icon: BookOpen },
        { label: "Syllabus", icon: BookOpen },
        { label: "Fees", icon: DollarSign },
        { label: "Media", icon: ImageIcon },
    ];

    // Fetch registered institutions for Platform Admin filter & selector
    useEffect(() => {
        if (!accessToken || !isPlatformAdmin) return;
        setLoadingInstitutions(true);
        fetch(`/api/admin/institutions/profiles?limit=150`, { headers: authHeader })
            .then((r) => (r.ok ? r.json() : null))
            .then((json) => {
                setRegisteredInstitutions(json?.data || []);
            })
            .catch(() => undefined)
            .finally(() => setLoadingInstitutions(false));
    }, [accessToken, authHeader, isPlatformAdmin]);

    // ---------- Master Courses Catalog & Adoption State ----------
    const [selectCoursesModalOpen, setSelectCoursesModalOpen] = useState(false);
    const [masterCatalogList, setMasterCatalogList] = useState<any[]>([]);
    const [masterCatalogLoading, setMasterCatalogLoading] = useState(false);
    const [masterCatalogSearch, setMasterCatalogSearch] = useState("");
    const [selectedMasterCourseIds, setSelectedMasterCourseIds] = useState<string[]>([]);
    const [adoptingCourses, setAdoptingCourses] = useState(false);
    const [catalogCategoryFilter, setCatalogCategoryFilter] = useState("all");

    const fetchMasterCatalog = useCallback(async (searchQuery = "") => {
        setMasterCatalogLoading(true);
        try {
            const effInstId = getEffectiveInstitutionId();
            const params = new URLSearchParams();
            if (effInstId) params.set("institutionId", String(effInstId));
            if (searchQuery.trim()) params.set("search", searchQuery.trim());
            const res = await fetch(`/api/admin/institutions/programs/master-catalog?${params.toString()}`, {
                headers: authHeader,
            });
            const json = await res.json();
            if (res.ok) {
                setMasterCatalogList(json.data || []);
            } else {
                toast.error(json.error || "Failed to load master courses catalog");
            }
        } catch {
            toast.error("Failed to load catalog");
        } finally {
            setMasterCatalogLoading(false);
        }
    }, [authHeader, getEffectiveInstitutionId]);

    const openSelectCoursesModal = () => {
        setSelectedMasterCourseIds([]);
        setCatalogCategoryFilter("all");
        setSelectCoursesModalOpen(true);
        fetchMasterCatalog(masterCatalogSearch);
    };

    const handleToggleSelectCourse = (courseId: string) => {
        setSelectedMasterCourseIds((prev) =>
            prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
        );
    };

    const handleAdoptSelectedCourses = async (directCourses?: any[]) => {
        const effInstId = getEffectiveInstitutionId();
        if (!effInstId) {
            toast.error("No active institution selected");
            return;
        }

        const coursesToAdopt = directCourses || masterCatalogList.filter((c) => selectedMasterCourseIds.includes(c.id));
        if (coursesToAdopt.length === 0) {
            toast.error("Please select at least one course / program");
            return;
        }

        setAdoptingCourses(true);
        try {
            const res = await fetch(`/api/admin/institutions/programs/adopt`, {
                method: "POST",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({
                    institutionId: effInstId,
                    courses: coursesToAdopt,
                }),
            });
            const json = await res.json();
            if (res.ok) {
                toast.success(json.message || `Successfully added ${coursesToAdopt.length} course(s) to your institution`);
                setSelectCoursesModalOpen(false);
                setSelectedMasterCourseIds([]);
                await fetchItems();
            } else {
                toast.error(json.error || "Failed to add courses");
            }
        } catch {
            toast.error("Failed to add selected courses");
        } finally {
            setAdoptingCourses(false);
        }
    };

    // ---------- Batch / Section Management State ----------
    type BatchFeeScheduleOption = {
        id: string;
        fee_type: string;
        custom_title: string;
        unit: "one-time" | "month" | "quarter" | "half-year" | "year" | "semester" | "week";
        amount: string;
        installments_count: string;
        has_discount: boolean;
        discount_type: "percentage" | "fixed";
        discount_value: string;
    };

    const createDefaultBatchFeeOption = (
        type = "Course Tuition Fee",
        unit: "one-time" | "month" | "quarter" | "half-year" | "year" | "semester" | "week" = "one-time",
        progInfo?: any
    ): BatchFeeScheduleOption => {
        const info = progInfo || batchMeta.programInfo;
        const rawDur = info?.duration_value || 1;
        const durVal = typeof rawDur === "number" ? rawDur : parseInt(rawDur) || 1;
        const durUnit = (info?.duration_unit || "year").toLowerCase();

        let installments = "1";
        if (unit === "one-time") {
            installments = "1";
        } else if (unit === "year") {
            if (durUnit.includes("month")) {
                installments = String(Math.max(1, Math.ceil(durVal / 12)));
            } else if (durUnit.includes("sem")) {
                installments = String(Math.max(1, Math.ceil(durVal / 2)));
            } else {
                installments = String(Math.max(1, durVal));
            }
        } else if (unit === "semester") {
            if (durUnit.includes("month")) {
                installments = String(Math.max(1, Math.ceil(durVal / 6)));
            } else if (durUnit.includes("sem")) {
                installments = String(Math.max(1, durVal));
            } else {
                installments = String(Math.max(1, durVal * 2));
            }
        } else if (unit === "half-year") {
            if (durUnit.includes("month")) {
                installments = String(Math.max(1, Math.ceil(durVal / 6)));
            } else {
                installments = String(Math.max(1, durVal * 2));
            }
        } else if (unit === "quarter") {
            if (durUnit.includes("month")) {
                installments = String(Math.max(1, Math.ceil(durVal / 3)));
            } else {
                installments = String(Math.max(1, durVal * 4));
            }
        } else if (unit === "month") {
            if (durUnit.includes("month")) {
                installments = String(Math.max(1, durVal));
            } else if (durUnit.includes("sem")) {
                installments = String(Math.max(1, durVal * 6));
            } else {
                installments = String(Math.max(1, durVal * 12));
            }
        } else if (unit === "week") {
            if (durUnit.includes("month")) {
                installments = String(Math.max(1, durVal * 4));
            } else {
                installments = String(Math.max(1, durVal * 52));
            }
        }

        return {
            id: `batch-fee-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            fee_type: type,
            custom_title: "",
            unit,
            amount: "25000",
            installments_count: installments,
            has_discount: false,
            discount_type: "percentage",
            discount_value: "",
        };
    };

    const [batchModalOpen, setBatchModalOpen] = useState(false);
    const [batchTargetProgram, setBatchTargetProgram] = useState<InstitutionProgram | null>(null);
    const [programBatches, setProgramBatches] = useState<any[]>([]);
    const [batchMeta, setBatchMeta] = useState<{
        sections: any[];
        languages: any[];
        subjects: any[];
        programInfo?: any;
        courseTerms?: any[];
        attendanceSetups?: any[];
    }>({
        sections: [],
        languages: [],
        subjects: [],
        courseTerms: [],
        attendanceSetups: [],
    });
    const [loadingBatches, setLoadingBatches] = useState(false);
    const [savingBatch, setSavingBatch] = useState(false);
    const [batchActiveTab, setBatchActiveTab] = useState<"details" | "fee" | "list">("details");

    const initialBatchFormData = {
        batchName: "",
        selectedSections: ["Section A"] as string[],
        newCustomSection: "",
        seatsAvailable: "",
        teachingMethod: "Classroom",
        attendanceSetupId: "",
        attendanceSetupTitle: "Daily Attendance (Full Day)",
    };
    const [batchForm, setBatchForm] = useState(initialBatchFormData);
    const [batchFeeOptions, setBatchFeeOptions] = useState<BatchFeeScheduleOption[]>([
        createDefaultBatchFeeOption("Course Tuition Fee", "one-time"),
    ]);

    // Derive course year and semester options from course duration and terms
    const derivedAcademicTerms = useMemo(() => {
        const terms: Array<{ key: string; label: string; year?: number; semester?: number }> = [];

        // 1. From master_course_subjects if present
        if (batchMeta.courseTerms && batchMeta.courseTerms.length > 0) {
            const seen = new Set<string>();
            for (const ct of batchMeta.courseTerms) {
                const key = `term-${ct.term_type || "term"}-${ct.term_number || 1}`;
                if (seen.has(key)) continue;
                seen.add(key);

                if (ct.term_type === "semester") {
                    const derivedYear = Math.max(1, Math.ceil((ct.term_number || 1) / 2));
                    terms.push({
                        key,
                        label: `Year ${derivedYear} • Semester ${ct.term_number}`,
                        year: derivedYear,
                        semester: ct.term_number,
                    });
                } else if (ct.term_type === "year") {
                    terms.push({
                        key,
                        label: `Year ${ct.term_number} (Annual)`,
                        year: ct.term_number,
                    });
                } else if (ct.term_name) {
                    terms.push({
                        key,
                        label: ct.term_name,
                    });
                }
            }
        }

        // 2. Fallback to program/course duration_value
        if (terms.length === 0) {
            const rawDur = batchMeta.programInfo?.duration_value || 1;
            const durVal = typeof rawDur === "number" ? rawDur : parseInt(rawDur) || 1;
            const durUnit = (batchMeta.programInfo?.duration_unit || "year").toLowerCase();

            if (durUnit.includes("sem") || batchMeta.programInfo?.duration_type === "semester") {
                for (let s = 1; s <= Math.max(1, durVal); s++) {
                    const y = Math.max(1, Math.ceil(s / 2));
                    terms.push({
                        key: `sem-${s}`,
                        label: `Year ${y} • Semester ${s}`,
                        year: y,
                        semester: s,
                    });
                }
            } else {
                for (let y = 1; y <= Math.max(1, durVal); y++) {
                    terms.push({
                        key: `sem-${y * 2 - 1}`,
                        label: `Year ${y} • Semester ${y * 2 - 1}`,
                        year: y,
                        semester: y * 2 - 1,
                    });
                    terms.push({
                        key: `sem-${y * 2}`,
                        label: `Year ${y} • Semester ${y * 2}`,
                        year: y,
                        semester: y * 2,
                    });
                    terms.push({
                        key: `year-${y}`,
                        label: `Year ${y} (Annual)`,
                        year: y,
                    });
                }
            }
        }

        // Universal option
        terms.unshift({
            key: "full_course",
            label: "Universal / Full Course",
        });

        return terms;
    }, [batchMeta.courseTerms, batchMeta.programInfo]);

    const handleAddBatchFeeSchedule = (
        type = "Course Tuition Fee",
        unit: "one-time" | "month" | "quarter" | "half-year" | "year" | "semester" | "week" = "one-time"
    ) => {
        setBatchFeeOptions(prev => [...prev, createDefaultBatchFeeOption(type, unit, batchMeta.programInfo)]);
    };

    const handleRemoveBatchFeeSchedule = (id: string) => {
        setBatchFeeOptions(prev => prev.filter(f => f.id !== id));
    };

    const handleUpdateBatchFeeSchedule = (id: string, updates: Partial<BatchFeeScheduleOption>) => {
        setBatchFeeOptions(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    };

    const handleClearBatchForm = () => {
        setBatchForm(initialBatchFormData);
        setBatchFeeOptions([createDefaultBatchFeeOption("Course Tuition Fee", "one-time", batchMeta.programInfo)]);
    };

    const fetchProgramBatches = useCallback(async (programId: number) => {
        setLoadingBatches(true);
        try {
            const res = await fetch(`/api/admin/institutions/programs/${programId}/batches`, {
                headers: authHeader,
            });
            const json = await res.json();
            if (res.ok) {
                setProgramBatches(json.data || []);
                if (json.meta) {
                    setBatchMeta(json.meta);
                    const setups = json.meta.attendanceSetups || [];
                    const defaultSetup = setups.find((s: any) => s.is_default) || setups[0];
                    if (defaultSetup) {
                        setBatchForm((prev) => ({
                            ...prev,
                            attendanceSetupId: prev.attendanceSetupId || String(defaultSetup.id),
                            attendanceSetupTitle: prev.attendanceSetupTitle || defaultSetup.title,
                        }));
                    }
                }
            } else {
                toast.error(json.error || "Failed to load batches");
            }
        } catch {
            toast.error("Network error while loading batches");
        } finally {
            setLoadingBatches(false);
        }
    }, [authHeader]);

    const { saveStatus: batchSaveStatus, clearDraft: clearBatchDraft } = useProgressiveSave({
        formKey: `program_batch:${batchTargetProgram?.id || "new"}`,
        formState: { batchForm, batchFeeOptions },
        enabled: batchModalOpen,
    });

    const openBatchModal = (program: InstitutionProgram) => {
        setBatchTargetProgram(program);
        setBatchForm(initialBatchFormData);
        const progInfo = {
            duration_value: program.duration_value,
            duration_unit: program.duration_unit,
            duration_type: (program as any).duration_type,
        };
        setBatchFeeOptions([createDefaultBatchFeeOption("Course Tuition Fee", "one-time", progInfo)]);
        setBatchActiveTab("details");
        setBatchModalOpen(true);
        fetchProgramBatches(program.id);
    };

    const handleAddBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!batchTargetProgram || !batchForm.batchName.trim()) {
            toast.error("Batch name is required");
            return;
        }
        if (batchForm.selectedSections.length === 0) {
            toast.error("Please select at least one section");
            return;
        }
        setSavingBatch(true);

        const primaryFee = batchFeeOptions[0];
        const computedPrice = primaryFee ? Number(primaryFee.amount) || 0 : undefined;
        const computedInstallments = primaryFee ? Number(primaryFee.installments_count) || 1 : 1;
        const computedDiscount = primaryFee?.has_discount && primaryFee.discount_type === "percentage"
            ? Number(primaryFee.discount_value) || 0
            : 0;

        try {
            const res = await fetch(`/api/admin/institutions/programs/${batchTargetProgram.id}/batches`, {
                method: "POST",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({
                    batchName: batchForm.batchName.trim(),
                    sections: batchForm.selectedSections,
                    attendanceSetupId: batchForm.attendanceSetupId ? batchForm.attendanceSetupId : undefined,
                    attendanceSetupTitle: batchForm.attendanceSetupTitle || undefined,
                    seatsAvailable: batchForm.seatsAvailable ? Number(batchForm.seatsAvailable) : undefined,
                    teachingMethod: batchForm.teachingMethod.trim(),
                    price: computedPrice,
                    discountPercent: computedDiscount,
                    installmentsCount: computedInstallments,
                    feeOptions: batchFeeOptions,
                }),
            });
            const json = await res.json();
            if (res.ok) {
                toast.success(json.message || "Batch created successfully");
                clearBatchDraft();
                handleClearBatchForm();
                if (batchTargetProgram) {
                    await fetchProgramBatches(batchTargetProgram.id);
                }
                setBatchActiveTab("list");
            } else {
                toast.error(json.error || "Failed to create batch");
            }
        } catch {
            toast.error("Failed to add batch");
        } finally {
            setSavingBatch(false);
        }
    };

    const handleRemoveBatch = async (sectionId: number) => {
        if (!batchTargetProgram) return;
        try {
            const res = await fetch(`/api/admin/institutions/programs/${batchTargetProgram.id}/batches?sectionId=${sectionId}`, {
                method: "DELETE",
                headers: authHeader,
            });
            if (res.ok) {
                toast.success("Batch removed from program");
                await fetchProgramBatches(batchTargetProgram.id);
            } else {
                const json = await res.json();
                toast.error(json.error || "Failed to remove batch");
            }
        } catch {
            toast.error("Failed to remove batch");
        }
    };

    // ---------- Standalone Syllabus Management State ----------
    const [syllabusModalOpen, setSyllabusModalOpen] = useState(false);
    const [syllabusTargetProgram, setSyllabusTargetProgram] = useState<InstitutionProgram | null>(null);
    const [standaloneSyllabusNodes, setStandaloneSyllabusNodes] = useState<EditableSyllabusTopic[]>([]);
    const [syllabusSubjectOptions, setSyllabusSubjectOptions] = useState<{ id: number; value: string; label: string }[]>([]);
    const [syllabusSubjectIds, setSyllabusSubjectIds] = useState<string[]>([]);
    const [loadingSyllabusDetail, setLoadingSyllabusDetail] = useState(false);

    const openSyllabusModal = async (program: InstitutionProgram) => {
        setSyllabusTargetProgram(program);
        setSyllabusModalOpen(true);
        setLoadingSyllabusDetail(true);
        setStandaloneSyllabusNodes([]);
        try {
            const res = await fetch(`/api/admin/institutions/programs/${program.id}`, {
                headers: authHeader,
            });
            const json = await res.json();
            if (res.ok && json.data) {
                const full = json.data;
                const subjectIds: number[] = full.subject_ids || [];
                const subjectNames: string[] = full.subject_names || [];
                const options = subjectIds.map((id, idx) => ({
                    id,
                    value: String(id),
                    label: subjectNames[idx] || `Subject #${id}`,
                }));
                setSyllabusSubjectOptions(options);
                setSyllabusSubjectIds(subjectIds.map(String));
            }
        } catch {
            toast.error("Failed to load program subjects for syllabus");
        } finally {
            setLoadingSyllabusDetail(false);
        }
    };

    // ---------- Fetch ----------
    const fetchItems = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(pagination.pageIndex + 1),
                limit: String(pagination.pageSize),
                search: debouncedSearch,
            });
            if (isPlatformAdmin && selectedFilterInstitutionId && selectedFilterInstitutionId !== "all") {
                params.set("institutionId", String(selectedFilterInstitutionId));
            } else if (useSidebarInstitution && activeInstitutionId) {
                params.set("institutionId", String(activeInstitutionId));
            }
            const res = await fetch(
                `/api/admin/institutions/programs?${params.toString()}`,
                { headers: authHeader }
            );
            const json = await res.json();
            if (res.ok) {
                setItems(json.data || []);
                setPageCount(json.pageCount);
            } else {
                toast.error(json.error ?? "Failed to load programs");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    }, [accessToken, activeInstitutionId, pagination.pageIndex, pagination.pageSize, debouncedSearch, useSidebarInstitution, isPlatformAdmin, selectedFilterInstitutionId, authHeader]);

    useEffect(() => {
        if (isReady) fetchItems();
    }, [isReady, fetchItems]);

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
        }, 300);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        if (!accessToken || !useSidebarInstitution || !activeInstitutionId) {
            const timeout = window.setTimeout(() => setActiveInstitutionProfile(null), 0);
            return () => window.clearTimeout(timeout);
        }

        let cancelled = false;
        const timeout = window.setTimeout(async () => {
            try {
                const params = new URLSearchParams({
                    institutionId: String(activeInstitutionId),
                    page: "1",
                    limit: "1",
                });
                const res = await fetch(`/api/admin/institutions/profiles?${params.toString()}`, {
                    headers: { Authorization: `Bearer ${accessToken}` },
                });
                const json = await res.json();
                if (!res.ok) throw new Error(json.error || "Failed to load institution");
                if (!cancelled) setActiveInstitutionProfile(json.data?.[0] ?? null);
            } catch {
                if (!cancelled) setActiveInstitutionProfile(null);
            }
        }, 0);

        return () => {
            cancelled = true;
            window.clearTimeout(timeout);
        };
    }, [accessToken, activeInstitutionId, useSidebarInstitution]);

    useEffect(() => {
        if (!dialogOpen || editing) return;
        const timeout = window.setTimeout(applyActiveInstitutionToForm, 0);
        return () => window.clearTimeout(timeout);
    }, [applyActiveInstitutionToForm, dialogOpen, editing]);

    useEffect(() => {
        if (!isSubjectProgramType) return;
        setDurationValue("");
        setDurationUnit("");
        setSeatsAvailable("");
        setTeachingMethod("");
        setUniversityId("");
        setUniversityName("");
    }, [isSubjectProgramType]);

    useEffect(() => {
        const defaultUnit = normalizeFeeUnit(durationUnit);
        if (!defaultUnit) return;
        setFeeComponents((current) => {
            let changed = false;
            const next = current.map((fee) => {
                if (normalizeFeeUnit(fee.unit)) return fee;
                changed = true;
                return { ...fee, unit: defaultUnit };
            });
            return changed ? next : current;
        });
    }, [durationUnit]);

    // ---------- Reset ----------
    const resetForm = () => {
        if (useSidebarInstitution && activeInstitution) {
            setInstitutionId(activeInstitution.id);
            setInstitutionName(activeInstitution.name);
            setInstitutionBoardId(activeInstitutionProfile?.board_id || "");
        } else {
            setInstitutionId("");
            setInstitutionName("");
            setInstitutionBoardId("");
        }
        setProgramTypeId("");
        setProgramTypeName("");
        setTitle("");
        setSlug("");
        setAbout("");
        setDurationValue("");
        setDurationUnit("");
        setSeatsAvailable("");
        setTeachingMethod("");
        if (useSidebarInstitution && activeInstitutionProfile?.parent_university_id) {
            setUniversityId(activeInstitutionProfile.parent_university_id);
            setUniversityName(activeInstitutionProfile.parent_university_name || `University ID: ${activeInstitutionProfile.parent_university_id}`);
        } else {
            setUniversityId("");
            setUniversityName("");
        }
        setTuitionFee("");
        setTuitionFeeUnit("year");
        setHasDiscount(false);
        setDiscountType("percentage");
        setDiscountValue("");
        setFeeComponents([]);
        setCategoryId("");
        setCategoryLabel("");
        setBoardId("");
        setBoardName("");
        setSelectedLanguageIds([]);
        setSelectedLanguages([]);
        setSelectedSubjectIds([]);
        setSubjectOptionsCache([]);
        setSelectedSectionIds([]);
        setSectionOptionsCache([]);
        setMediaList([]);
        setPendingMediaFiles([]);
        setMediaUrlInput("");
        setMediaUrlType("auto");
        setActiveStep(0);
        setProgramDetailLoading(false);
        setSellOnMarketplace(false);
        setMarketplacePrice(0);
        setSyllabusNodes([]);
        setDerivedStream("");
    };

    // Preload default predefined values: Hindi, English, Section A, Offline
    const applyDefaultOperationalValues = useCallback(async () => {
        setTeachingMethod("classroom");

        // 1. Preload Hindi & English languages
        try {
            const langRes = await fetch(`/api/languages?limit=50`);
            if (langRes.ok) {
                const langJson = await langRes.json();
                const allLangs = langJson.data || [];
                const defaultLangs = allLangs.filter((l: any) => {
                    const name = (l.name || "").toLowerCase();
                    return name === "english" || name === "hindi";
                });
                if (defaultLangs.length > 0) {
                    setSelectedLanguageIds(defaultLangs.map((l: any) => String(l.id)));
                    setSelectedLanguages(defaultLangs.map((l: any) => ({ id: l.id, name: l.name })));
                }
            }
        } catch (err) {
            console.error("Failed to preload default languages:", err);
        }

        // 2. Preload Section A
        try {
            const secRes = await fetch(`/api/admin/sections?search=A&limit=10`, { headers: authHeader });
            if (secRes.ok) {
                const secJson = await secRes.json();
                const allSections = secJson.data || [];
                const sectionA = allSections.find((s: any) => (s.name || "").trim().toUpperCase() === "A" || (s.name || "").toLowerCase() === "section a") || allSections[0];
                if (sectionA) {
                    setSelectedSectionIds([String(sectionA.id)]);
                    setSectionOptionsCache([
                        {
                            id: sectionA.id,
                            value: String(sectionA.id),
                            label: sectionA.name,
                            description: sectionA.slug,
                        },
                    ]);
                }
            }
        } catch (err) {
            console.error("Failed to preload default section:", err);
        }
    }, [authHeader]);

    const openCreateDialog = () => {
        setEditing(null);
        resetForm();
        if (isPlatformAdmin && selectedFilterInstitutionId && selectedFilterInstitutionId !== "all") {
            const preselected = registeredInstitutions.find((i) => String(i.id) === String(selectedFilterInstitutionId));
            if (preselected) {
                applyInstitutionOptionToForm(preselected);
            }
        }
        applyDefaultOperationalValues();
        setDialogOpen(true);
    };

    const openEditDialog = (item: InstitutionProgram) => {
        const requestId = editDetailRequestRef.current + 1;
        editDetailRequestRef.current = requestId;

        setEditing(item);
        setActiveStep(0);
        setProgramDetailLoading(true);
        setSyllabusNodes([]);
        setDerivedStream("");
        setInstitutionId(item.institution_id);
        setInstitutionName((item as any).institution_name || "");
        setBoardId(item.board_id ? String(item.board_id) : "");
        setBoardName((item as any).board_name || "");
        setProgramTypeId(item.program_type_id);
        setProgramTypeName(item.program_type_name || "");
        setTitle(item.title);
        setSlug(slugify(item.title));
        setAbout(item.about ?? "");
        setDurationValue("");
        setDurationUnit("");
        setSeatsAvailable("");
        setTeachingMethod("");
        setUniversityId("");
        setUniversityName("");
        setTuitionFee("");
        setFeeComponents([]);
        setCategoryId("");
        setCategoryLabel("");
        setSelectedLanguageIds([]);
        setSelectedLanguages([]);
        setSelectedSubjectIds([]);
        setSubjectOptionsCache([]);
        setSelectedSectionIds([]);
        setSectionOptionsCache([]);
        setPendingMediaFiles([]);
        setDialogOpen(true);
        fetchProgramMedia(item.id);

        fetch(`/api/admin/institutions/programs/${item.id}`, { headers: authHeader })
            .then((res) => res.json())
            .then((json) => {
                if (editDetailRequestRef.current !== requestId) return;
                const full = json?.data;
                if (!full) return;

                if (full.institution_name) setInstitutionName(full.institution_name);
                if (full.program_type_name) setProgramTypeName(full.program_type_name);
                setInstitutionBoardId(full.institution_board_id || "");
                if (full.board_id) {
                    setBoardId(String(full.board_id));
                    setBoardName(full.board_name || `Board #${full.board_id}`);
                } else if (full.institution_board_id) {
                    setBoardId(String(full.institution_board_id));
                    setBoardName(full.institution_board_name || `Board #${full.institution_board_id}`);
                }

                setDurationValue(full.duration_value != null ? String(full.duration_value) : "");
                setDurationUnit(full.duration_unit || "");
                setSeatsAvailable(full.seats_available != null ? String(full.seats_available) : "");
                setTeachingMethod(full.teaching_method || "");
                setUniversityId(full.university_id || "");
                setUniversityName(full.university_name || (full.university_id ? `University ID: ${full.university_id}` : ""));
                const defaultFeeUnit = normalizeFeeUnit(String(full.duration_unit || "")) || "month";
                const savedFees: FeeComponentForm[] = (full.fee_components || []).map((f: any, idx: number) => {
                    const rawDiscType = f.discount_type || (idx === 0 ? full.discount_type : null);
                    const rawDiscVal = f.discount_value ?? (idx === 0 ? full.discount_value : null);
                    const hasDisc = Boolean(rawDiscType || (rawDiscVal != null && rawDiscVal > 0));
                    const normUnit = normalizeFeeUnit(String(f.unit || f.fee_unit || "")) || defaultFeeUnit;
                    const instCount = f.installments_count != null
                        ? f.installments_count
                        : getEstimatedInstallmentsCount(normUnit, parseFloat(full.duration_value) || 1, full.duration_unit || "year");
                    return {
                        id: `fee-loaded-${idx}-${Date.now()}`,
                        title: String(f.title || ""),
                        amount: String(f.amount ?? ""),
                        unit: normUnit,
                        payment_mode: (normUnit === "one-time" || f.payment_mode === "one_time") ? "one_time" : "installment",
                        installments_count: instCount,
                        has_discount: hasDisc,
                        discount_type: rawDiscType === "fixed" ? "fixed" : "percentage",
                        discount_value: rawDiscVal != null ? String(rawDiscVal) : "",
                    };
                });

                if (savedFees.length > 0) {
                    setFeeComponents(savedFees);
                    const firstFee = savedFees[0];
                    setTuitionFee(firstFee.amount);
                    setTuitionFeeUnit(firstFee.unit || defaultFeeUnit);
                    setHasDiscount(Boolean(firstFee.has_discount));
                    setDiscountType(firstFee.discount_type || "percentage");
                    setDiscountValue(firstFee.discount_value || "");
                } else {
                    setTuitionFee("");
                    setTuitionFeeUnit(defaultFeeUnit);
                    setHasDiscount(false);
                    setDiscountType("percentage");
                    setDiscountValue("");
                    setFeeComponents([
                        {
                            id: `fee-starter-1`,
                            title: "Tuition Fee",
                            amount: "",
                            payment_mode: "installment",
                            unit: "month",
                            has_discount: false,
                            discount_type: "percentage",
                            discount_value: "",
                        },
                    ]);
                }

                const catId = full.picker_category_id || full.category_ids?.[0];
                if (catId) {
                    setCategoryId(String(catId));
                    const catName = full.picker_category_name || full.category_names?.[0];
                    const catParentName = full.picker_category_parent_name || full.category_parent_names?.[0];
                    setCategoryLabel(catName ? (catParentName ? `${catName} (${catParentName})` : catName) : `Category ID: ${catId}`);
                    if (catName) {
                        setTitle(catName);
                        setSlug(slugify(catName));
                    }
                }

                const langIds: number[] = full.language_ids || [];
                const langNames: string[] = full.language_names || [];
                if (langIds.length > 0) {
                    setSelectedLanguageIds(langIds.map(String));
                    setSelectedLanguages(langIds.map((id: number, i: number) => ({ id, name: langNames[i] || String(id) })));
                }

                const subjectIds: number[] = full.subject_ids || [];
                const subjectNames: string[] = full.subject_names || [];
                const subjectCategoryIds: number[] = full.subject_category_ids || [];
                const subjectCategoryNames: string[] = full.subject_category_names || [];
                setSelectedSubjectIds([
                    ...subjectIds.map(String),
                    ...subjectCategoryIds.map((id: number) => `category:${id}`),
                ]);
                setSubjectOptionsCache([
                    ...subjectIds.map((id: number, i: number) => ({
                        id,
                        value: String(id),
                        label: subjectNames[i] || String(id),
                    })),
                    ...subjectCategoryIds.map((id: number, i: number) => ({
                        id,
                        value: `category:${id}`,
                        label: subjectCategoryNames[i] || String(id),
                    })),
                ]);

                const sectionIds: number[] = full.section_ids || [];
                const sectionNames: string[] = full.section_names || [];
                setSelectedSectionIds(sectionIds.map(String));
                setSectionOptionsCache(sectionIds.map((id: number, i: number) => ({
                    id,
                    value: String(id),
                    label: sectionNames[i] || String(id),
                })));
                setSellOnMarketplace(Boolean(full.sell_on_marketplace));
                setMarketplacePrice(Number(full.marketplace_price ?? 0));
            })
            .catch(() => {
                if (editDetailRequestRef.current !== requestId) return;
                toast.error("Failed to load program details");
            })
            .finally(() => {
                if (editDetailRequestRef.current === requestId) setProgramDetailLoading(false);
            });
    };

    // ---------- Program Media ----------
    async function fetchProgramMedia(programId: number) {
        setMediaLoading(true);
        try {
            const res = await fetch(`/api/admin/institutions/program-media?programId=${programId}`, { headers: authHeader });
            const json = await res.json();
            if (res.ok) setMediaList(json.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setMediaLoading(false);
        }
    }

    // Upload a single media file → returns Cloudinary payload
    async function uploadMediaFile(file: File): Promise<{ url: string; mediaType: "image" | "video" }> {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/admin/uploads/image", {
            method: "POST",
            headers: authHeader,
            body: fd,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Upload failed");
        if (!json.data?.url) throw new Error("Upload did not return a URL");
        return {
            url: json.data?.url,
            mediaType: json.data?.media_type || (file.type.startsWith("video/") ? "video" : "image"),
        };
    }

    // Auto-managed sort_order for a programId's existing media
    function nextSortOrder(list: any[]) {
        if (!list.length) return 10;
        return Math.max(...list.map((m) => m.sort_order ?? 0)) + 10;
    }

    // Handle file selection — works for both create (pending) and edit (immediate)
    async function handleMediaFiles(files: FileList | null) {
        if (!files || files.length === 0) return;
        const fileArr = Array.from(files);
        const mediaFiles = fileArr
            .map((file) => ({ file, mediaType: getProgramMediaType(file) }))
            .filter((item): item is { file: File; mediaType: "image" | "video" } => item.mediaType !== null);

        if (mediaFiles.length === 0) {
            toast.error("Only image and video files are allowed");
            return;
        }

        if (editing) {
            // Edit mode: upload immediately and save to DB
            setMediaUploading(true);
            const baseSortOrder = nextSortOrder(mediaList);
            const uploadedMedia = await Promise.all(
                mediaFiles.map(async ({ file, mediaType }, index) => {
                    try {
                        const uploaded = await uploadMediaFile(file);
                        const saveRes = await fetch("/api/admin/institutions/program-media", {
                            method: "POST",
                            headers: { ...authHeader, "Content-Type": "application/json" },
                            body: JSON.stringify({
                                programId: editing.id,
                                mediaType: uploaded.mediaType || mediaType,
                                url: uploaded.url,
                                title: file.name,
                                sortOrder: baseSortOrder + index * 10,
                            }),
                        });
                        if (!saveRes.ok) {
                            const json = await saveRes.json();
                            throw new Error(json.error ?? `Failed to save ${file.name}`);
                        }
                        return (await saveRes.json()).data;
                    } catch (err) {
                        toast.error(err instanceof Error ? err.message : `Failed to upload ${file.name}`);
                        return null;
                    }
                })
            );
            const savedMedia = uploadedMedia.filter((item): item is any => Boolean(item));
            if (savedMedia.length > 0) {
                setMediaList((prev) => [...prev, ...savedMedia]);
            }
            setMediaUploading(false);
        } else {
            // Create mode: upload then queue as pending
            setMediaUploading(true);
            const placeholders = mediaFiles.map(({ file, mediaType }) => ({
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`,
                url: "",
                title: file.name,
                mediaType,
                uploading: true,
            }));
            setPendingMediaFiles((prev) => [...prev, ...placeholders]);

            await Promise.all(
                mediaFiles.map(async ({ file, mediaType }, index) => {
                    const pendingItem = placeholders[index];
                    try {
                        const uploaded = await uploadMediaFile(file);
                        setPendingMediaFiles((prev) =>
                            prev.map((item) =>
                                item.id === pendingItem.id
                                    ? {
                                        ...item,
                                        url: uploaded.url,
                                        mediaType: uploaded.mediaType || mediaType,
                                        uploading: false,
                                    }
                                    : item
                            )
                        );
                    } catch (err) {
                        toast.error(err instanceof Error ? err.message : `Failed to upload ${file.name}`);
                        setPendingMediaFiles((prev) => prev.filter((item) => item.id !== pendingItem.id));
                    }
                })
            );
            setMediaUploading(false);
        }
    }

    async function handleDeleteProgramMedia(id: number) {
        try {
            const res = await fetch(`/api/admin/institutions/program-media/${id}`, {
                method: "DELETE",
                headers: authHeader,
            });
            if (res.ok) {
                toast.success("Removed");
                if (editing) await fetchProgramMedia(editing.id);
            } else {
                const json = await res.json();
                toast.error(json.error ?? "Failed to remove");
            }
        } catch {
            toast.error("Network error");
        }
    }

    async function handleAddMediaByUrl() {
        const url = mediaUrlInput.trim();
        if (!url) {
            toast.error("Enter a media URL");
            return;
        }

        try {
            new URL(url);
        } catch {
            toast.error("Enter a valid URL");
            return;
        }

        const inferredType = getMediaTypeFromUrl(url);
        const mediaType = mediaUrlType === "auto" ? inferredType : mediaUrlType;

        if (!mediaType) {
            toast.error("Could not detect media type from URL. Select Image or Video.");
            return;
        }

        const title = getMediaTitleFromUrl(url);

        if (editing) {
            setMediaUploading(true);
            try {
                const saveRes = await fetch("/api/admin/institutions/program-media", {
                    method: "POST",
                    headers: { ...authHeader, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        programId: editing.id,
                        mediaType,
                        url,
                        title,
                        sortOrder: nextSortOrder(mediaList),
                    }),
                });
                const json = await saveRes.json();
                if (!saveRes.ok) {
                    throw new Error(json.error ?? "Failed to add media URL");
                }
                setMediaList((prev) => [...prev, json.data]);
                setMediaUrlInput("");
                setMediaUrlType("auto");
                toast.success("Media URL added");
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Failed to add media URL");
            } finally {
                setMediaUploading(false);
            }
            return;
        }

        const newPending: PendingMedia = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}-url`,
            url,
            title,
            mediaType,
            uploading: false,
        };

        setPendingMediaFiles((prev) => [...prev, newPending]);
        setMediaUrlInput("");
        setMediaUrlType("auto");
        toast.success("Media URL queued");
    }

    // ---------- Fee helpers ----------
    const handleAddFee = (presetTitle = "", unitOverride = "") => {
        const defaultUnit = unitOverride || (defaultFeePaymentBasis === "one_time" ? "one-time" : (normalizeFeeUnit(durationUnit) || "month"));
        const defaultMode = defaultUnit === "one-time" ? "one_time" : "installment";
        const estimatedCount = getEstimatedInstallmentsCount(defaultUnit, parseFloat(durationValue) || 1, durationUnit || "year");
        setFeeComponents((s) => [
            ...s,
            {
                id: `fee-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                title: presetTitle || (s.length === 0 ? "Tuition Fee" : ""),
                amount: "",
                payment_mode: defaultMode,
                unit: defaultUnit,
                installments_count: estimatedCount,
                has_discount: false,
                discount_type: "percentage",
                discount_value: "",
            },
        ]);
    };

    const handleGenerateAllPaymentPlans = () => {
        const primaryFee = feeComponents[0]?.amount ? parseFloat(feeComponents[0].amount) : (parseFloat(tuitionFee) || 50000);
        const durVal = parseFloat(durationValue) || 1;
        const durUnit = durationUnit || "year";

        const monthlyCount = getEstimatedInstallmentsCount("month", durVal, durUnit);
        const quarterlyCount = getEstimatedInstallmentsCount("quarter", durVal, durUnit);
        const halfYearCount = getEstimatedInstallmentsCount("half-year", durVal, durUnit);
        const yearlyCount = getEstimatedInstallmentsCount("year", durVal, durUnit);

        const plans: FeeComponentForm[] = [
            {
                id: `fee-plan-onetime-${Date.now()}`,
                title: "Tuition Fee (One-Time Full Payment)",
                amount: String(Math.round(primaryFee * 0.95)),
                payment_mode: "one_time",
                unit: "one-time",
                installments_count: 1,
                has_discount: true,
                discount_type: "percentage",
                discount_value: "5",
            },
            {
                id: `fee-plan-monthly-${Date.now() + 1}`,
                title: "Tuition Fee (Monthly Installments)",
                amount: String(Math.round(primaryFee / monthlyCount)),
                payment_mode: "installment",
                unit: "month",
                installments_count: monthlyCount,
                has_discount: false,
                discount_type: "percentage",
                discount_value: "",
            },
            {
                id: `fee-plan-quarterly-${Date.now() + 2}`,
                title: "Tuition Fee (Quarterly Installments)",
                amount: String(Math.round(primaryFee / quarterlyCount)),
                payment_mode: "installment",
                unit: "quarter",
                installments_count: quarterlyCount,
                has_discount: false,
                discount_type: "percentage",
                discount_value: "",
            },
            {
                id: `fee-plan-halfyearly-${Date.now() + 3}`,
                title: "Tuition Fee (Half-Yearly / Semester)",
                amount: String(Math.round(primaryFee / halfYearCount)),
                payment_mode: "installment",
                unit: "half-year",
                installments_count: halfYearCount,
                has_discount: false,
                discount_type: "percentage",
                discount_value: "",
            },
            {
                id: `fee-plan-yearly-${Date.now() + 4}`,
                title: "Tuition Fee (Annual Installments)",
                amount: String(Math.round(primaryFee / yearlyCount)),
                payment_mode: "installment",
                unit: "year",
                installments_count: yearlyCount,
                has_discount: false,
                discount_type: "percentage",
                discount_value: "",
            },
        ];

        setFeeComponents((prev) => [
            ...prev.filter(f => !f.title.toLowerCase().includes("tuition")),
            ...plans,
        ]);
        toast.success("Generated all standard payment plans (One-Time, Monthly, Quarterly, Half-Yearly, Yearly)");
    };

    const handleRemoveFee = (i: number) => setFeeComponents((s) => s.filter((_, idx) => idx !== i));
    const handleFeeChange = (i: number, field: keyof FeeComponentForm, value: any) =>
        setFeeComponents((s) => s.map((f, idx) => (idx === i ? { ...f, [field]: value } : f)));

    // ---------- Languages fetcher ----------
    const fetchLanguageOptions = useCallback(
        async (search: string, page: number) => {
            const res = await fetch(
                `/api/languages?page=${page}&limit=15&search=${encodeURIComponent(search)}`
            );
            const json = await res.json();
            setSelectedLanguages((prev) => {
                const map = new Map(prev.map((l) => [l.id, l]));
                for (const item of json.data || []) map.set(item.id, item);
                return Array.from(map.values());
            });
            return {
                data: (json.data || []).map((l: any) => ({ label: l.name, value: String(l.id) })),
                hasMore: page < json.pageCount,
            };
        },
        [accessToken]
    );

    const fetchSubjectOptions = useCallback(
        async (search: string, page: number) => {
            if (!categoryId) {
                return { data: [], hasMore: false };
            }

            const params = new URLSearchParams({
                type: "subject",
                search,
                page: String(page),
                limit: "100",
                categoryIds: categoryId,
            });
            const effectiveBoard = boardId || institutionBoardId;
            if (effectiveBoard) {
                params.set("boardId", String(effectiveBoard));
            }

            const res = await fetch(`/api/admin/categories/tree/search?${params.toString()}`, { headers: authHeader });
            if (!res.ok) throw new Error("Failed to load subjects");
            const json = await res.json();
            const options = (json.data || []).map((item: { id: number; name: string; breadcrumb?: string; type?: string }) => ({
                id: item.id,
                value: item.type === "category_subject" ? `category:${item.id}` : String(item.id),
                label: item.name,
                description: item.breadcrumb || undefined,
            }));

            setSubjectOptionsCache((prev) => {
                const next = new Map(prev.map((option) => [option.value, option] as const));
                for (const option of options) next.set(option.value, option);
                return Array.from(next.values());
            });

            return { data: options, hasMore: page < (json.pageCount ?? page) };
        },
        [accessToken, categoryId, boardId, institutionBoardId, authHeader]
    );

    const fetchSectionOptions = useCallback(
        async (search: string, page: number) => {
            const res = await fetch(
                `/api/admin/sections?page=${page}&limit=15&search=${encodeURIComponent(search)}`,
                { headers: authHeader }
            );
            if (!res.ok) throw new Error("Failed to load sections");
            const json = await res.json();
            const options = (json.data || []).map((item: { id: number; name: string; slug?: string }) => ({
                id: item.id,
                value: String(item.id),
                label: item.name,
                description: item.slug,
            }));

            setSectionOptionsCache((prev) => {
                const next = new Map(prev.map((option) => [option.value, option] as const));
                for (const option of options) next.set(option.value, option);
                return Array.from(next.values());
            });

            return { data: options, hasMore: page < (json.pageCount ?? page) };
        },
        [accessToken, authHeader]
    );

    // ---------- Build common payload ----------
    function buildPayload(extra: Record<string, any> = {}) {
        const numericTuition = parseFloat(tuitionFee) || 0;
        const numericDiscount = parseFloat(discountValue) || 0;
        const calculatedDiscountAmount = hasDiscount && numericDiscount > 0
            ? discountType === "percentage"
                ? (numericTuition * Math.min(100, numericDiscount)) / 100
                : Math.min(numericTuition, numericDiscount)
            : 0;
        const finalPayableTuition = Math.max(0, numericTuition - calculatedDiscountAmount);
        const finalTuitionUnit = tuitionFeeUnit || normalizeFeeUnit(durationUnit) || "year";

        const serializedFees = feeComponents
            .filter((f) => f.title.trim() && f.amount)
            .map((f) => {
                const numAmt = parseFloat(f.amount) || 0;
                const numDisc = parseFloat(f.discount_value || "0") || 0;
                const hasDisc = Boolean(f.has_discount && numDisc > 0);
                const discAmt = hasDisc
                    ? f.discount_type === "percentage"
                        ? (numAmt * Math.min(100, numDisc)) / 100
                        : Math.min(numAmt, numDisc)
                    : 0;
                const finalAmt = Math.max(0, numAmt - discAmt);
                const normUnit = normalizeFeeUnit(f.unit) || "month";
                const instCount = f.installments_count != null && !isNaN(Number(f.installments_count))
                    ? Number(f.installments_count)
                    : getEstimatedInstallmentsCount(normUnit, parseFloat(durationValue) || 1, durationUnit || "year");

                return {
                    title: f.title.trim(),
                    amount: numAmt,
                    unit: normUnit,
                    payment_mode: f.payment_mode || (normUnit === "one-time" ? "one_time" : "installment"),
                    installments_count: instCount,
                    discount_type: hasDisc ? f.discount_type : null,
                    discount_value: hasDisc ? numDisc : null,
                    final_amount: finalAmt,
                };
            });

        const primaryFee = serializedFees[0] || (tuitionFee ? {
            title: "Tuition fee",
            amount: Number(tuitionFee),
            unit: finalTuitionUnit,
            discount_type: hasDiscount && numericDiscount > 0 ? discountType : null,
            discount_value: hasDiscount && numericDiscount > 0 ? numericDiscount : null,
            final_amount: finalPayableTuition,
        } : null);

        const payload: any = {
            ...extra,
            programTypeId: Number(programTypeId),
            title: title.trim(),
            about: about || null,
            categoryIds: categoryId ? [Number(categoryId)] : [],
            languageIds: selectedLanguageIds.map(Number),
            subjectIds: selectedSubjectIds
                .filter((value) => !value.startsWith("category:"))
                .map(Number),
            subjectCategoryIds: selectedSubjectIds
                .filter((value) => value.startsWith("category:"))
                .map((value) => Number(value.replace("category:", ""))),
            sectionIds: selectedSectionIds.map(Number),
            discount_type: primaryFee?.discount_type || (hasDiscount && numericDiscount > 0 ? discountType : null),
            discount_value: primaryFee?.discount_value || (hasDiscount && numericDiscount > 0 ? numericDiscount : null),
            tuition_fee_unit: primaryFee?.unit || finalTuitionUnit,
            feeComponents: serializedFees.length > 0
                ? serializedFees
                : (primaryFee ? [primaryFee] : []),
        };
        if (boardId && boardId.trim() && !isNaN(Number(boardId))) {
            payload.boardId = Number(boardId);
        } else if (institutionBoardId && !isNaN(Number(institutionBoardId))) {
            payload.boardId = Number(institutionBoardId);
        }
        if (slug.trim()) payload.slug = slug.trim();
        payload.sell_on_marketplace = sellOnMarketplace;
        payload.marketplace_price = marketplacePrice;
        if (!isSubjectProgramType) {
            if (durationValue !== "") payload.durationValue = Number(durationValue);
            if (durationUnit) payload.durationUnit = durationUnit;
            if (seatsAvailable !== "") payload.seatsAvailable = Number(seatsAvailable);
            if (teachingMethod) payload.teachingMethod = teachingMethod;
            if (universityId !== "") payload.universityId = Number(universityId);
        }
        return payload;
    }

    function hasSelectedSubjects() {
        return selectedSubjectIds.length > 0;
    }

    function validateSubjectSelection() {
        if (hasSelectedSubjects()) return true;
        setActiveStep(0);
        toast.error("Please choose a program / class with subjects");
        return false;
    }

    function getEffectiveInstitutionId(): number | null {
        if (institutionId && String(institutionId).trim() && !isNaN(Number(institutionId))) return Number(institutionId);
        if (activeInstitutionId && !isNaN(Number(activeInstitutionId))) return Number(activeInstitutionId);
        if (activeInstitution?.id && !isNaN(Number(activeInstitution.id))) return Number(activeInstitution.id);
        if ((activeInstitutionProfile as any)?.id && !isNaN(Number((activeInstitutionProfile as any).id))) return Number((activeInstitutionProfile as any).id);
        return null;
    }

    function getEffectiveProgramTypeId(): number {
        if (programTypeId && String(programTypeId).trim() && !isNaN(Number(programTypeId))) return Number(programTypeId);
        if (availableProgramTypes.length > 0) return Number(availableProgramTypes[0].id);
        return 1;
    }

    function validateBasicStepForNavigation() {
        if (programDetailLoading) {
            toast.info("Program details are still loading");
            return false;
        }
        const effInstId = getEffectiveInstitutionId();
        if (!effInstId) {
            toast.error("No active institution found. Please ensure an institution is selected.");
            return false;
        }
        if (!categoryId) {
            toast.error("Please choose a program / class from the Content tab");
            return false;
        }
        if (!title.trim() && categoryLabel) {
            setTitle(categoryLabel.split("›").pop()?.trim() || categoryLabel);
        }
        return true;
    }

    function validateFeeStep() {
        const missingUnit = feeComponents.some((fee) => {
            const hasFeeValue = Boolean(fee.title.trim() || fee.amount.trim());
            return hasFeeValue && !normalizeFeeUnit(fee.unit);
        });
        if (missingUnit) {
            setActiveStep(2);
            toast.error("Select a unit for every other fee row");
            return false;
        }
        return true;
    }

    // ---------- Create ----------
    const handleCreate = async () => {
        const effInstId = getEffectiveInstitutionId();
        if (!effInstId) {
            return toast.error("No active institution found for registration");
        }
        if (!categoryId) {
            return toast.error("Please choose a course / category from the category tree");
        }
        const effectiveTitle = title.trim() || categoryLabel.split("›").pop()?.trim() || categoryLabel || "Program";
        if (!title.trim()) setTitle(effectiveTitle);
        const effTypeId = getEffectiveProgramTypeId();

        if (!validateSubjectSelection()) return;
        if (!validateFeeStep()) return;
        setSubmitting(true);
        try {
            const payload = buildPayload({ institutionId: effInstId });
            payload.programTypeId = effTypeId;
            payload.title = effectiveTitle;
            payload.slug = slug.trim() || slugify(effectiveTitle);

            const res = await fetch(`/api/admin/institutions/programs`, {
                method: "POST",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (res.ok) {
                const created = json.data;
                // Save pending media files with auto sort_order
                let sortOrder = 10;
                for (const pm of pendingMediaFiles.filter((p) => p.url && !p.uploading)) {
                    await fetch("/api/admin/institutions/program-media", {
                        method: "POST",
                        headers: { ...authHeader, "Content-Type": "application/json" },
                        body: JSON.stringify({
                            programId: created.id,
                            mediaType: pm.mediaType,
                            url: pm.url,
                            title: pm.title,
                            sortOrder,
                        }),
                    });
                    sortOrder += 10;
                }
                toast.success("Created");
                setDialogOpen(false);
                setEditing(null);
                await fetchItems();
            } else {
                toast.error(json.error ?? "Failed to create");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setSubmitting(false);
        }
    };

    // ---------- Update ----------
    const handleUpdate = async () => {
        if (!editing) return;
        if (programDetailLoading) {
            toast.info("Program details are still loading");
            return;
        }
        const effInstId = getEffectiveInstitutionId();
        if (!effInstId) {
            setActiveStep(0);
            return toast.error("No active institution found");
        }
        if (!categoryId) {
            setActiveStep(0);
            return toast.error("Please choose a course / category from the category tree");
        }
        const effectiveTitle = title.trim() || categoryLabel.split("›").pop()?.trim() || categoryLabel || editing.title;
        const effTypeId = getEffectiveProgramTypeId();

        if (!validateSubjectSelection()) return;
        if (!validateFeeStep()) return;
        setSubmitting(true);
        try {
            const payload = buildPayload({ id: editing.id, institutionId: effInstId });
            payload.programTypeId = effTypeId;
            payload.title = effectiveTitle;
            payload.slug = slug.trim() || slugify(effectiveTitle);
            const res = await fetch(`/api/admin/institutions/programs/${editing.id}`, {
                method: "PATCH",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (res.ok) {
                toast.success("Updated");
                setDialogOpen(false);
                setEditing(null);
                await fetchItems();
            } else {
                toast.error(json.error ?? "Failed to update");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setSubmitting(false);
        }
    };

    // ---------- Toggle / Delete ----------
    const handleToggle = async (p: InstitutionProgram) => {
        setActiveLoadingId(p.id);
        try {
            const res = await fetch(`/api/admin/institutions/programs/${p.id}`, {
                method: "PATCH",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !p.is_active }),
            });
            const json = await res.json();
            if (res.ok) {
                toast.success("Updated successfully");
                await fetchItems();
            } else {
                toast.error(json.error ?? "Failed");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setActiveLoadingId(null);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/institutions/programs/${deleteTarget.id}`, {
                method: "DELETE",
                headers: authHeader,
            });
            if (res.ok) {
                toast.success("Deleted");
                setDeleteTarget(null);
                await fetchItems();
            } else {
                const json = await res.json();
                toast.error(json.error ?? "Failed to delete");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setSubmitting(false);
        }
    };

    // ---------- Columns ----------
    const columns: ColumnDef<InstitutionProgram>[] = [
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
            accessorKey: "title",
            header: "Title",
            cell: ({ row }) => <div className="font-medium text-foreground">{row.getValue("title")}</div>,
        },
        {
            accessorKey: "program_type_name",
            header: "Program Type",
            cell: ({ row }) => <div className="text-sm text-muted-foreground truncate">{row.original.program_type_name}</div>,
        },
        {
            accessorKey: "slug",
            header: "Institution",
            cell: ({ row }) => (
                <div className="text-sm text-muted-foreground truncate max-w-37.5">
                    {row.original.institution_name || "-"}
                </div>
            ),
        },
        {
            id: "status",
            header: "Status",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <Badge
                        variant="default"
                        className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                            item.is_active
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15"
                                : "bg-rose-500/10 text-rose-500 border-rose-500/20 hover:bg-rose-500/15"
                        )}
                    >
                        {item.is_active ? "Active" : "Disabled"}
                    </Badge>
                );
            },
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-accent">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openBatchModal(item)}>
                                <Users className="h-4 w-4 mr-2 text-primary" /> Add Batches / Sections
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openSyllabusModal(item)}>
                                <BookMarked className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" /> Syllabus
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={async () => {
                                    setViewing(item);
                                    setViewDetail(null);
                                    setViewMediaList([]);
                                    setViewOpen(true);
                                    setViewDetailLoading(true);
                                    try {
                                        const [detailRes, mediaRes] = await Promise.all([
                                            fetch(`/api/admin/institutions/programs/${item.id}`, { headers: authHeader }),
                                            fetch(`/api/admin/institutions/program-media?programId=${item.id}`, { headers: authHeader }),
                                        ]);
                                        const detailJson = await detailRes.json();
                                        const mediaJson = await mediaRes.json();
                                        setViewDetail(detailJson.data || null);
                                        setViewMediaList(mediaJson.data || []);
                                    } catch {
                                        // keep basic item data
                                    } finally {
                                        setViewDetailLoading(false);
                                    }
                                }}
                            >
                                View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleToggle(item)} disabled={activeLoadingId === item.id}>
                                {activeLoadingId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                                {item.is_active ? "Disable" : "Enable"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={() => setDeleteTarget(item)}
                            >
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    // ============================================================
    // RENDER
    // ============================================================
    return (
        <div className="space-y-6 w-full max-w-full">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Programs</h1>
                    <p className="text-sm text-muted-foreground">Manage academic curriculum, classification metadata, fees structures, and image gallery.</p>
                </div>
                {!isPlatformAdmin && (
                    <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                        <Button
                            onClick={openSelectCoursesModal}
                            className="w-full sm:w-auto font-bold gap-1.5 shadow-sm"
                        >
                            <BookOpen className="h-4 w-4" /> Select Program / Course
                        </Button>
                    </div>
                )}
            </div>

            {/* Platform Admin Institution Filter Header */}
            {isPlatformAdmin && (
                <div className="p-4 rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/5 via-card to-background flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
                            <Building2 className="h-4 w-4" />
                        </div>
                        <div>
                            <span className="text-xs font-extrabold text-foreground block">
                                Platform Admin Institution View
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                                Select any registered institution to list and manage their specific courses & programs
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Select
                            value={selectedFilterInstitutionId}
                            onValueChange={(val) => {
                                setSelectedFilterInstitutionId(val);
                                setPagination((p) => ({ ...p, pageIndex: 0 }));
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-[300px] bg-background text-xs font-bold h-9 border-border/80">
                                <SelectValue placeholder="All Registered Institutions" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[320px]">
                                <SelectItem value="all" className="font-bold text-primary">
                                    🌐 All Registered Institutions
                                </SelectItem>
                                {registeredInstitutions.map((inst) => (
                                    <SelectItem key={inst.id} value={String(inst.id)}>
                                        <div className="flex items-center gap-2 py-0.5">
                                            <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                                            <span className="font-semibold">{getInstitutionOptionLabel(inst)}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {selectedFilterInstitutionId !== "all" && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSelectedFilterInstitutionId("all");
                                    setPagination((p) => ({ ...p, pageIndex: 0 }));
                                }}
                                className="h-9 text-xs text-muted-foreground hover:text-foreground shrink-0"
                            >
                                Clear
                            </Button>
                        )}
                    </div>
                </div>
            )}

            <DataTable
                columns={columns}
                data={items}
                loading={loading}
                searchKey="title"
                filterPlaceholder="Search by title..."
                pagination={pagination}
                onPaginationChange={setPagination}
                pageCount={pageCount}
                showRowNumbers
                toolbarRight={
                    <Button variant="ghost" size="icon" onClick={fetchItems} disabled={loading} title="Refresh">
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                }
                selectedActions={(selectedRows, resetSelection) => (
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                                const ids = selectedRows.map((r) => r.id);
                                try {
                                    const res = await fetch("/api/admin/institutions/programs", {
                                        method: "PATCH",
                                        headers: { ...authHeader, "Content-Type": "application/json" },
                                        body: JSON.stringify({ ids, isActive: true }),
                                    });
                                    if (res.ok) { toast.success("Activated selected programs"); resetSelection(); fetchItems(); }
                                    else toast.error("Failed to activate");
                                } catch { toast.error("Network error"); }
                            }}
                        >
                            <Power className="size-4" />
                            Enable
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                                const ids = selectedRows.map((r) => r.id);
                                try {
                                    const res = await fetch("/api/admin/institutions/programs", {
                                        method: "PATCH",
                                        headers: { ...authHeader, "Content-Type": "application/json" },
                                        body: JSON.stringify({ ids, isActive: false }),
                                    });
                                    if (res.ok) { toast.success("Disabled selected programs"); resetSelection(); fetchItems(); }
                                    else toast.error("Failed to disable");
                                } catch { toast.error("Network error"); }
                            }}
                        >
                            <PowerOff className="size-4" />
                            Disable
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                                if (confirm("Are you sure you want to delete these programs?")) {
                                    const ids = selectedRows.map((r) => r.id);
                                    try {
                                        const res = await fetch("/api/admin/institutions/programs", {
                                            method: "PATCH",
                                            headers: { ...authHeader, "Content-Type": "application/json" },
                                            body: JSON.stringify({ ids, softDelete: true }),
                                        });
                                        if (res.ok) { toast.success("Deleted selected programs"); resetSelection(); fetchItems(); }
                                        else toast.error("Failed to delete");
                                    } catch { toast.error("Network error"); }
                                }
                            }}
                        >
                            <Trash2 className="size-4" />
                            Delete
                        </Button>
                    </div>
                )}
            />

            {/* ===== CREATE / EDIT DIALOG ===== */}
            <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) {
                        editDetailRequestRef.current += 1;
                        setEditing(null);
                        resetForm();
                    }
                }}
            >
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl! bg-card border border-border/80 backdrop-blur-2xl">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <BookOpen className="size-5" />
                            {editing ? "Edit Program" : "New Program"}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            {editing ? "Edit Program" : "New Program"}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Step Indicators */}
                    <ol className="grid grid-cols-4 gap-2 sm:grid-cols-4 mb-6">
                        {steps.map((step, idx) => {
                            const Icon = step.icon;
                            const isActive = idx === activeStep;
                            const isComplete = idx < activeStep;
                            return (
                                <li key={step.label}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (idx > 0 && !validateBasicStepForNavigation()) return;
                                            if (idx > 2 && !validateFeeStep()) return;
                                            setActiveStep(idx);
                                        }}
                                        disabled={programDetailLoading}
                                        className={cn(
                                            "flex h-12 w-full items-center gap-2 rounded-md border px-3 text-left text-sm transition-colors",
                                            isActive && "border-primary bg-primary text-primary-foreground shadow-sm",
                                            isComplete && !isActive && "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
                                            !isActive && !isComplete && "border-border hover:bg-muted text-muted-foreground",
                                            programDetailLoading && "cursor-not-allowed opacity-60"
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "grid size-7 shrink-0 place-items-center rounded-full border",
                                                isActive && "border-primary-foreground/50",
                                                isComplete && !isActive && "bg-background border-emerald-500/35"
                                            )}
                                        >
                                            <Icon className="h-3.5 w-3.5" />
                                        </span>
                                        <span className="truncate font-medium">{step.label}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>

                    <div className={cn("py-2", programDetailLoading && "pointer-events-none opacity-70")}>
                        {programDetailLoading && (
                            <div className="mb-4 flex items-center gap-2 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" />
                                Loading program details...
                            </div>
                        )}
                        {/* -------- STEP 0: BASIC -------- */}
                        {activeStep === 0 && (
                            <div className="space-y-5">
                                {/* ─── 1. Registered Institution Selector (Platform Admin) ─── */}
                                {isPlatformAdmin ? (
                                    <div className="space-y-2.5 p-3.5 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-muted/20 shadow-2xs">
                                        <Label className="text-sm font-bold flex items-center justify-between">
                                            <span className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-primary" />
                                                Select Registered Institution *
                                            </span>
                                            <Badge variant="outline" className="text-[10px] bg-background border-primary/30 text-primary font-bold">
                                                Platform Admin
                                            </Badge>
                                        </Label>
                                        
                                        <Select
                                            value={String(institutionId || "")}
                                            onValueChange={(val) => {
                                                const found = registeredInstitutions.find((inst) => String(inst.id) === String(val));
                                                applyInstitutionOptionToForm(found || null);
                                            }}
                                        >
                                            <SelectTrigger className="bg-background text-sm font-bold h-10 border-border/80">
                                                <SelectValue placeholder="Choose a registered institution..." />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[320px]">
                                                {registeredInstitutions.map((inst) => (
                                                    <SelectItem key={inst.id} value={String(inst.id)}>
                                                        <div className="flex items-center gap-2 py-0.5">
                                                            <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
                                                            <span className="font-bold">{getInstitutionOptionLabel(inst)}</span>
                                                            {inst.slug && (
                                                                <span className="text-[11px] text-muted-foreground">({inst.slug})</span>
                                                            )}
                                                        </div>
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>

                                        {institutionId ? (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground pt-0.5 flex-wrap">
                                                <span className="font-semibold text-foreground flex items-center gap-1.5">
                                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                    Selected: {institutionName || `Institution #${institutionId}`}
                                                </span>
                                                {institutionBoardId && (
                                                    <Badge variant="secondary" className="text-[10px]">
                                                        Board ID: {institutionBoardId}
                                                    </Badge>
                                                )}
                                                {universityName && (
                                                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                                                        {universityName}
                                                    </Badge>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
                                                ⚠️ Please select the registered institution this course/program belongs to.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    activeInstitution && (
                                        <div className="p-3 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="h-4 w-4 text-primary" />
                                                <span className="text-xs font-bold text-foreground">
                                                    Institution: {activeInstitution.name}
                                                </span>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] font-bold">
                                                ID: {activeInstitution.id}
                                            </Badge>
                                        </div>
                                    )
                                )}

                                {/* ─── 2. Program / Class Picker (from Content Tab) ─── */}
                                <div className="space-y-3">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-bold flex items-center justify-between">
                                            <span>Choose Program / Class *</span>
                                            <span className="text-xs text-primary font-semibold">From Content Tab</span>
                                        </Label>
                                         <AsyncSearchPopover<{
                                             id: number;
                                             name: string;
                                             slug: string;
                                             category_id: number;
                                             category_name: string;
                                             category_breadcrumb?: string;
                                             authority_type: string;
                                             board_id?: number;
                                             board_name?: string;
                                             university_name?: string;
                                             certification_provider_name?: string;
                                             duration_value?: number;
                                             duration_unit?: string;
                                             subjects?: Array<{ id: number; name: string; code?: string; slug?: string }>;
                                             description?: string;
                                         }>
                                             value={masterCourseId || categoryId}
                                             onChange={(v) => {
                                                 setMasterCourseId(v);
                                                 if (!v) {
                                                     setSelectedMasterCourse(null);
                                                     setCategoryLabel("");
                                                     setTitle("");
                                                     setSlug("");
                                                     setDerivedStream("");
                                                     setSelectedSubjectIds([]);
                                                     setSubjectOptionsCache([]);
                                                 }
                                             }}
                                             onSelectItem={(item) => {
                                                 setMasterCourseId(String(item.id));
                                                 setSelectedMasterCourse(item);
                                                 setTitle(item.name);
                                                 setSlug(item.slug || slugify(item.name));
                                                 setCategoryId(String(item.category_id));
                                                 const label = item.category_breadcrumb || item.category_name || item.name;
                                                 setCategoryLabel(label);

                                                 if (item.board_id) {
                                                     setBoardId(String(item.board_id));
                                                     setBoardName(item.board_name || "");
                                                 } else {
                                                     setBoardId("");
                                                     setBoardName("");
                                                 }
                                                 if (item.university_name) {
                                                     setUniversityName(item.university_name);
                                                 }
                                                 if (item.duration_value) {
                                                     setDurationValue(String(item.duration_value));
                                                     setDurationUnit(item.duration_unit || "years");
                                                 }
                                                 if (item.description && !about) {
                                                     setAbout(item.description);
                                                 }
                                                 if (item.subjects && item.subjects.length > 0) {
                                                     const sids = item.subjects.map((s) => String(s.id));
                                                     const sOptions = item.subjects.map((s) => ({
                                                         id: s.id,
                                                         value: String(s.id),
                                                         label: s.name,
                                                         code: s.code,
                                                     }));
                                                     setSelectedSubjectIds(sids);
                                                     setSubjectOptionsCache(sOptions);
                                                 }
                                             }}
                                             selectedLabel={selectedMasterCourse?.name || title || categoryLabel || undefined}
                                             placeholder="Select program / class created in Content tab..."
                                             searchPlaceholder="Search programs / classes created in Content..."
                                             emptyText="No programs found in Content tab"
                                             fetcher={async (search, page) => {
                                                 try {
                                                     const res = await fetch(
                                                         `/api/admin/content/courses?page=${page}&limit=20&search=${encodeURIComponent(search)}`,
                                                         { headers: authHeader }
                                                     );
                                                     if (!res.ok) return { data: [], hasMore: false };
                                                     const json = await res.json();
                                                     return { data: json.data || [], hasMore: page < (json.pageCount || 1) };
                                                 } catch (err) {
                                                     console.error("Failed to load courses from Content tab:", err);
                                                     return { data: [], hasMore: false };
                                                 }
                                             }}
                                             getValue={(item) => String(item.id)}
                                             getLabel={(item) => item.name}
                                             renderItem={(c) => (
                                                 <div className="flex items-center justify-between py-2 w-full text-left gap-3">
                                                     <div className="flex flex-col min-w-0">
                                                         <span className="text-sm font-bold text-foreground truncate">{c.name}</span>
                                                         <span className="text-xs text-muted-foreground truncate">{c.category_breadcrumb || c.category_name}</span>
                                                     </div>
                                                     <div className="flex items-center gap-1.5 shrink-0">
                                                         {c.board_name && (
                                                             <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/20">
                                                                 {c.board_name}
                                                             </Badge>
                                                         )}
                                                         {c.university_name && (
                                                             <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">
                                                                 {c.university_name}
                                                             </Badge>
                                                         )}
                                                         {c.certification_provider_name && (
                                                             <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20">
                                                                 {c.certification_provider_name}
                                                             </Badge>
                                                         )}
                                                         {c.duration_value && (
                                                             <Badge variant="secondary" className="text-[10px]">
                                                                 {c.duration_value} {c.duration_unit}
                                                             </Badge>
                                                         )}
                                                     </div>
                                                 </div>
                                             )}
                                         />
                                     </div>

                                     {/* Pre-configured Program Details Summary Card */}
                                     {(selectedMasterCourse || title) && (
                                         <div className="p-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-muted/20 space-y-3.5 shadow-2xs">
                                             <div className="flex items-center justify-between pb-2 border-b border-border/60">
                                                 <div className="flex items-center gap-2">
                                                     <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                                                         <Sparkles className="h-4 w-4" />
                                                     </div>
                                                     <div>
                                                         <span className="text-xs font-bold text-foreground block">
                                                             Content Program Configuration
                                                         </span>
                                                         <span className="text-[11px] text-muted-foreground">
                                                             Pre-configured curriculum and accreditation parameters
                                                         </span>
                                                     </div>
                                                 </div>
                                                 <Badge variant="outline" className="text-[11px] font-semibold bg-background border-primary/30 text-primary">
                                                     Auto-Synced
                                                 </Badge>
                                             </div>

                                             {/* 3 Metric Badges: Duration · Authority · Category */}
                                             <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                                 {/* 1. Duration */}
                                                 <div className="p-2.5 rounded-xl border border-border/80 bg-background/80 flex items-start gap-2.5">
                                                     <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 shrink-0 mt-0.5">
                                                         <Clock className="h-4 w-4" />
                                                     </div>
                                                     <div className="flex flex-col min-w-0">
                                                         <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                                                             Duration
                                                         </span>
                                                         <span className="text-xs font-bold text-foreground truncate">
                                                             {durationValue ? `${durationValue} ${durationUnit || "years"}` : "Standard Duration"}
                                                         </span>
                                                     </div>
                                                 </div>

                                                 {/* 2. Board / University / Affiliation Authority */}
                                                 <div className="p-2.5 rounded-xl border border-border/80 bg-background/80 flex items-start gap-2.5">
                                                     <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-600 shrink-0 mt-0.5">
                                                         {boardName ? (
                                                             <BookOpen className="h-4 w-4" />
                                                         ) : universityName ? (
                                                             <Building2 className="h-4 w-4" />
                                                         ) : (
                                                             <BadgeCheck className="h-4 w-4" />
                                                         )}
                                                     </div>
                                                     <div className="flex flex-col min-w-0">
                                                         <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                                                             {boardName ? "Educational Board" : universityName ? "University" : "Affiliation Body"}
                                                         </span>
                                                         <span className="text-xs font-bold text-foreground truncate" title={boardName || universityName || selectedMasterCourse?.certification_provider_name}>
                                                             {boardName || universityName || selectedMasterCourse?.certification_provider_name || "Autonomous / Direct"}
                                                         </span>
                                                     </div>
                                                 </div>

                                                 {/* 3. Category Tree */}
                                                 <div className="p-2.5 rounded-xl border border-border/80 bg-background/80 flex items-start gap-2.5">
                                                     <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 shrink-0 mt-0.5">
                                                         <FolderTree className="h-4 w-4" />
                                                     </div>
                                                     <div className="flex flex-col min-w-0">
                                                         <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">
                                                             Category
                                                         </span>
                                                         <span className="text-xs font-bold text-foreground truncate" title={categoryLabel || title}>
                                                             {categoryLabel || title}
                                                         </span>
                                                     </div>
                                                 </div>
                                             </div>

                                             {/* 4. Pre-configured Curriculum Subjects */}
                                             {selectedSubjectIds.length > 0 && (
                                                 <div className="p-2.5 rounded-xl border border-border/80 bg-background/80 space-y-1.5">
                                                     <div className="flex items-center justify-between">
                                                         <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                                             <GraduationCap className="h-3.5 w-3.5 text-primary" />
                                                             Curriculum Subjects ({selectedSubjectIds.length})
                                                         </span>
                                                         <span className="text-[10px] text-muted-foreground font-normal">
                                                             Available in Syllabus tab
                                                         </span>
                                                     </div>
                                                     <div className="flex flex-wrap gap-1.5 pt-0.5">
                                                         {selectedSubjectOptions.map((subj) => (
                                                             <Badge
                                                                 key={subj.value}
                                                                 variant="secondary"
                                                                 className="text-[11px] py-0.5 px-2 bg-muted/60 hover:bg-muted font-medium border border-border/60"
                                                             >
                                                                 <GraduationCap className="h-3 w-3 mr-1 text-primary" />
                                                                 {subj.label}
                                                             </Badge>
                                                         ))}
                                                     </div>
                                                 </div>
                                             )}
                                         </div>
                                     )}

                                     {/* Institution Specific Operational Details: Seats Available · Teaching Method */}
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                         <div className="space-y-2">
                                             <Label className="text-sm font-medium">Seats Available (Optional)</Label>
                                             <Input
                                                 type="number"
                                                 min={0}
                                                 value={seatsAvailable}
                                                 onChange={(e) => setSeatsAvailable(e.target.value)}
                                                 placeholder="e.g. 60"
                                                 className="h-10 w-full bg-background/50 border border-border"
                                             />
                                         </div>
                                         <div className="space-y-2">
                                             <Label className="text-sm font-medium">Teaching Method</Label>
                                             <Select value={teachingMethod} onValueChange={setTeachingMethod}>
                                                 <SelectTrigger className="h-10 w-full bg-background/50 border border-border">
                                                     <SelectValue placeholder="Select method..." />
                                                 </SelectTrigger>
                                                 <SelectContent>
                                                     <SelectItem value="classroom">Classroom / Offline</SelectItem>
                                                     <SelectItem value="online">Online</SelectItem>
                                                     <SelectItem value="hybrid">Hybrid</SelectItem>
                                                     <SelectItem value="distance">Distance</SelectItem>
                                                 </SelectContent>
                                             </Select>
                                         </div>
                                     </div>

                                     {/* Institution Operational Details: Languages · Sections */}
                                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                                         <div className="space-y-2">
                                             <Label className="text-sm font-medium">Languages</Label>
                                             <MultiSelect
                                                 options={[]}
                                                 async
                                                 value={selectedLanguageIds}
                                                 onValueChange={(v) => {
                                                     setSelectedLanguageIds(v);
                                                     setSelectedLanguages((prev) => prev.filter((l) => v.includes(String(l.id))));
                                                 }}
                                                 selectedOptions={selectedLanguages.map((l) => ({ label: l.name, value: String(l.id) }))}
                                                 placeholder="Choose languages..."
                                                 fetcher={fetchLanguageOptions}
                                             />
                                         </div>

                                         <div className="space-y-2">
                                             <Label className="text-sm font-medium">Sections</Label>
                                             <MultiSelect
                                                 options={[]}
                                                 async
                                                 value={selectedSectionIds}
                                                 onValueChange={setSelectedSectionIds}
                                                 selectedOptions={selectedSectionOptions}
                                                 placeholder="Choose sections..."
                                                 fetcher={fetchSectionOptions}
                                                 searchable
                                                 maxCount={4}
                                             />
                                         </div>
                                     </div>
                                 </div>
                            </div>
                        )}

                        {/* -------- STEP 1: SYLLABUS -------- */}
                        {activeStep === 1 && (
                            <ProgramSyllabusManager
                                subjectIds={selectedSubjectIds}
                                subjectOptions={selectedSubjectOptions}
                                categoryName={categoryLabel || title}
                                authHeader={authHeader}
                                syllabusNodes={syllabusNodes}
                                onSyllabusNodesChange={setSyllabusNodes}
                            />
                        )}

                        {/* -------- STEP 2: FEES -------- */}
                        {activeStep === 2 && (
                            <div className="space-y-6">
                                {/* Flexible Multi-Payment Plans Header */}
                                <div className="p-4.5 rounded-2xl border border-border/80 bg-card/60 space-y-4 shadow-2xs">
                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <DollarSign className="h-5 w-5 text-primary" />
                                                <Label className="text-sm font-extrabold text-foreground">
                                                    Program Fee Structure & Flexible Payment Plans
                                                </Label>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                Configure both <strong>One-Time upfront fees</strong> and <strong>Installment plans</strong> (Monthly, Quarterly, Half-Yearly, Yearly, Weekly) with automatic total cost calculations.
                                            </p>
                                        </div>

                                        {/* Quick Generator Button */}
                                        <Button
                                            type="button"
                                            onClick={handleGenerateAllPaymentPlans}
                                            variant="outline"
                                            size="sm"
                                            className="text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 h-8.5 gap-1.5 shadow-2xs self-start lg:self-auto shrink-0"
                                        >
                                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                                            Auto-Generate All Payment Plans
                                        </Button>
                                    </div>

                                    {/* Quick Add Plan Buttons */}
                                    <div className="pt-2.5 border-t border-border/40 space-y-2">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[11px] font-extrabold text-muted-foreground uppercase mr-1">
                                                Add Payment Schedule:
                                            </span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddFee("Tuition Fee", "one-time")}
                                                className="h-7.5 text-[11px] font-bold bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/40 border-border/70 gap-1 rounded-lg"
                                            >
                                                💳 + One-Time Plan
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddFee("Tuition Fee", "month")}
                                                className="h-7.5 text-[11px] font-bold bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/40 border-border/70 gap-1 rounded-lg"
                                            >
                                                📅 + Monthly Plan
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddFee("Tuition Fee", "quarter")}
                                                className="h-7.5 text-[11px] font-bold bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/40 border-border/70 gap-1 rounded-lg"
                                            >
                                                🎓 + Quarterly (3 mo)
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddFee("Tuition Fee", "half-year")}
                                                className="h-7.5 text-[11px] font-bold bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/40 border-border/70 gap-1 rounded-lg"
                                            >
                                                🏛️ + Half-Yearly (6 mo)
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddFee("Tuition Fee", "year")}
                                                className="h-7.5 text-[11px] font-bold bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/40 border-border/70 gap-1 rounded-lg"
                                            >
                                                📆 + Yearly Plan
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddFee("Tuition Fee", "week")}
                                                className="h-7.5 text-[11px] font-bold bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/40 border-border/70 gap-1 rounded-lg"
                                            >
                                                ⏱️ + Weekly Plan
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Fee Components List */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h4 className="text-sm font-extrabold text-foreground">
                                                Configured Fee Schedules & Payment Plans ({feeComponents.length})
                                            </h4>
                                            <p className="text-xs text-muted-foreground">
                                                Specify the installment rate, billing frequency, installment count, and applicable discounts.
                                            </p>
                                        </div>
                                        <Button
                                            type="button"
                                            onClick={() => handleAddFee()}
                                            size="sm"
                                            variant="outline"
                                            className="text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 h-8 gap-1.5"
                                        >
                                            <Plus className="h-3.5 w-3.5" /> Add Fee Option
                                        </Button>
                                    </div>

                                    {feeComponents.length === 0 ? (
                                        <div className="p-8 text-center border rounded-2xl border-dashed bg-muted/10 space-y-3">
                                            <DollarSign className="h-8 w-8 text-muted-foreground/60 mx-auto" />
                                            <div className="space-y-1">
                                                <p className="text-sm font-bold text-foreground">No fee components configured yet</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Add One-Time or Installment (Monthly, Quarterly, Yearly) options for this course.
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-center gap-2 pt-1">
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    onClick={handleGenerateAllPaymentPlans}
                                                    className="text-xs font-bold bg-primary text-primary-foreground gap-1.5"
                                                >
                                                    <Sparkles className="h-3.5 w-3.5" /> Auto-Generate All Payment Plans
                                                </Button>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleAddFee("Tuition Fee", "one-time")}
                                                    className="text-xs font-bold"
                                                >
                                                    <Plus className="h-3.5 w-3.5" /> Add One-Time Fee
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {feeComponents.map((fee, idx) => {
                                                const numAmount = parseFloat(fee.amount) || 0;
                                                const numDiscount = parseFloat(fee.discount_value || "0") || 0;
                                                const hasDisc = Boolean(fee.has_discount && numDiscount > 0);
                                                const discDeduction = hasDisc
                                                    ? fee.discount_type === "percentage"
                                                        ? (numAmount * Math.min(100, numDiscount)) / 100
                                                        : Math.min(numAmount, numDiscount)
                                                    : 0;
                                                const netPerInstallment = Math.max(0, numAmount - discDeduction);
                                                const normUnit = normalizeFeeUnit(fee.unit);
                                                const estimatedCount = fee.installments_count != null && !isNaN(Number(fee.installments_count))
                                                    ? Number(fee.installments_count)
                                                    : getEstimatedInstallmentsCount(normUnit, parseFloat(durationValue) || 1, durationUnit || "year");
                                                const totalPlanCost = netPerInstallment * Math.max(1, estimatedCount);
                                                const grossPlanCost = numAmount * Math.max(1, estimatedCount);

                                                return (
                                                    <div
                                                        key={fee.id || idx}
                                                        className="p-4 rounded-2xl border border-border bg-card shadow-2xs space-y-4 hover:border-primary/40 transition-all"
                                                    >
                                                        {/* Fee Head Header */}
                                                        <div className="flex items-center justify-between pb-2.5 border-b border-border/50">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <Badge variant="outline" className="text-[10px] font-extrabold bg-primary/10 text-primary border-primary/20">
                                                                    Option #{idx + 1}
                                                                </Badge>
                                                                <Badge
                                                                    variant="secondary"
                                                                    className={`text-[10px] font-bold ${
                                                                        normUnit === "one-time"
                                                                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                                                            : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                                                                    }`}
                                                                >
                                                                    {normUnit === "one-time"
                                                                        ? "💳 One-Time Full Payment"
                                                                        : normUnit === "month"
                                                                        ? "📅 Monthly Installments"
                                                                        : normUnit === "quarter"
                                                                        ? "🎓 Quarterly (every 3 mo)"
                                                                        : normUnit === "half-year"
                                                                        ? "🏛️ Half-Yearly (every 6 mo)"
                                                                        : normUnit === "year"
                                                                        ? "📆 Annual Installment"
                                                                        : normUnit === "week"
                                                                        ? "⏱️ Weekly Installment"
                                                                        : "☀️ Daily Installment"}
                                                                </Badge>
                                                                <span className="text-xs font-bold text-foreground">
                                                                    {fee.title.trim() || "Untitled Fee"}
                                                                </span>
                                                            </div>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleRemoveFee(idx)}
                                                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>

                                                        {/* Core Inputs: Fee Type · Rate Amount · Installments Count */}
                                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
                                                            {/* 1. Fee Type */}
                                                            <div className="sm:col-span-6 space-y-1.5">
                                                                <Label className="text-xs font-bold text-foreground">
                                                                    Fee Type *
                                                                </Label>
                                                                <Select
                                                                    value={COMMON_FEE_TYPES.includes(fee.title as any) ? fee.title : (fee.title ? "custom" : "")}
                                                                    onValueChange={(val) => {
                                                                        if (val === "custom") {
                                                                            handleFeeChange(idx, "title", fee.title && !COMMON_FEE_TYPES.includes(fee.title as any) ? fee.title : "");
                                                                        } else {
                                                                            handleFeeChange(idx, "title", val);
                                                                        }
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="h-9.5 text-xs bg-background font-medium">
                                                                        <SelectValue placeholder="Select Fee Type..." />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        {COMMON_FEE_TYPES.map((type) => (
                                                                            <SelectItem key={type} value={type}>
                                                                                {type}
                                                                            </SelectItem>
                                                                        ))}
                                                                        <SelectItem value="custom">✏️ Custom / Other Fee</SelectItem>
                                                                    </SelectContent>
                                                                </Select>

                                                                {/* Custom Title Input if custom/other is selected */}
                                                                {(!COMMON_FEE_TYPES.includes(fee.title as any) || fee.title === "" || fee.title === "custom") && (
                                                                    <Input
                                                                        placeholder="Enter custom fee name..."
                                                                        value={fee.title === "custom" ? "" : fee.title}
                                                                        onChange={(e) => handleFeeChange(idx, "title", e.target.value)}
                                                                        className="h-8 text-xs bg-background mt-1 animate-in fade-in"
                                                                    />
                                                                )}
                                                            </div>

                                                            {/* 2. Amount per installment */}
                                                            <div className="sm:col-span-4 space-y-1.5">
                                                                <Label className="text-xs font-bold text-foreground">
                                                                    {normUnit === "one-time" ? "Lump Sum Amount (₹) *" : "Rate per Installment (₹) *"}
                                                                </Label>
                                                                <Input
                                                                    type="number"
                                                                    min={0}
                                                                    placeholder="e.g. 5000"
                                                                    value={fee.amount}
                                                                    onChange={(e) => handleFeeChange(idx, "amount", e.target.value)}
                                                                    className="h-9.5 text-xs font-semibold bg-background"
                                                                />
                                                            </div>

                                                            {/* 3. Total Installments Multiplier */}
                                                            <div className="sm:col-span-2 space-y-1.5">
                                                                <Label className="text-xs font-bold text-foreground">
                                                                    Installments #
                                                                </Label>
                                                                <Input
                                                                    type="number"
                                                                    min={1}
                                                                    disabled={normUnit === "one-time"}
                                                                    value={normUnit === "one-time" ? 1 : (fee.installments_count ?? estimatedCount)}
                                                                    onChange={(e) => handleFeeChange(idx, "installments_count", e.target.value)}
                                                                    className="h-9.5 text-xs bg-background"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Discount & Live Cost Calculation Bar */}
                                                        <div className="p-3 rounded-xl bg-muted/30 border border-border/60 space-y-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <Tag className="h-3.5 w-3.5 text-primary" />
                                                                    <span className="text-xs font-bold text-foreground">
                                                                        Discount / Scholarship Waiver
                                                                    </span>
                                                                </div>
                                                                <Checkbox
                                                                    id={`fee-disc-${idx}`}
                                                                    checked={Boolean(fee.has_discount)}
                                                                    onCheckedChange={(checked) => handleFeeChange(idx, "has_discount", Boolean(checked))}
                                                                />
                                                            </div>

                                                            {fee.has_discount && (
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1.5 border-t border-border/40 animate-in fade-in">
                                                                    <div className="space-y-1">
                                                                        <Label className="text-[11px] font-bold text-muted-foreground">Discount Type</Label>
                                                                        <Select
                                                                            value={fee.discount_type || "percentage"}
                                                                            onValueChange={(val) => handleFeeChange(idx, "discount_type", val)}
                                                                        >
                                                                            <SelectTrigger className="h-8 text-xs bg-background">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                            <SelectContent>
                                                                                <SelectItem value="percentage">Percentage (%)</SelectItem>
                                                                                <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                                                                            </SelectContent>
                                                                        </Select>
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <Label className="text-[11px] font-bold text-muted-foreground">Discount Value</Label>
                                                                        <Input
                                                                            type="number"
                                                                            min={0}
                                                                            max={fee.discount_type === "percentage" ? 100 : undefined}
                                                                            placeholder={fee.discount_type === "percentage" ? "e.g. 10" : "e.g. 1000"}
                                                                            value={fee.discount_value || ""}
                                                                            onChange={(e) => handleFeeChange(idx, "discount_value", e.target.value)}
                                                                            className="h-8 text-xs bg-background"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {/* Real-time "How much it will cost" Calculation Preview */}
                                                            {numAmount > 0 && (
                                                                <div className="p-2.5 rounded-lg bg-background border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                                                                    <div className="space-y-0.5">
                                                                        <span className="text-[11px] text-muted-foreground">
                                                                            Installment Rate:{" "}
                                                                            {hasDisc && (
                                                                                <span className="line-through mr-1 text-muted-foreground/80">
                                                                                    ₹{numAmount.toLocaleString()}
                                                                                </span>
                                                                            )}
                                                                            <strong className="text-foreground">
                                                                                ₹{netPerInstallment.toLocaleString()} / {normUnit}
                                                                            </strong>
                                                                        </span>
                                                                        {normUnit !== "one-time" && (
                                                                            <p className="text-[10.5px] text-muted-foreground">
                                                                                Schedule: {estimatedCount} payments × ₹{netPerInstallment.toLocaleString()}
                                                                            </p>
                                                                        )}
                                                                    </div>

                                                                    <div className="text-left sm:text-right">
                                                                        <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                                                                            Total Cost Under This Plan
                                                                        </span>
                                                                        <span className="text-sm font-black text-primary">
                                                                            ₹{totalPlanCost.toLocaleString()}
                                                                        </span>
                                                                        {hasDisc && (
                                                                            <span className="text-[10px] text-emerald-600 font-bold block">
                                                                                (Saved ₹{(grossPlanCost - totalPlanCost).toLocaleString()})
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* ─── How Much It Will Cost Comparison Matrix ─── */}
                                {feeComponents.filter(f => parseFloat(f.amount) > 0).length > 0 && (
                                    <div className="p-4.5 rounded-2xl bg-muted/30 border border-border/80 space-y-3.5 shadow-2xs">
                                        <div className="flex items-center justify-between flex-wrap gap-2">
                                            <div className="flex items-center gap-2 text-foreground font-extrabold text-sm">
                                                <BadgePercent className="h-4.5 w-4.5 text-primary" />
                                                <span>Payment Plans Cost Comparison Matrix</span>
                                            </div>
                                            <Badge variant="outline" className="text-[11px] font-bold bg-background">
                                                {feeComponents.filter(f => parseFloat(f.amount) > 0).length} Active Pricing Options
                                            </Badge>
                                        </div>

                                        <p className="text-xs text-muted-foreground">
                                            Below is the complete side-by-side cost breakdown comparing how much a student pays under each payment model:
                                        </p>

                                        <div className="overflow-x-auto rounded-xl border border-border bg-card">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-muted/60 border-b border-border text-[11px] uppercase font-bold text-muted-foreground">
                                                    <tr>
                                                        <th className="p-3">Payment Option / Schedule</th>
                                                        <th className="p-3">Billing Cycle</th>
                                                        <th className="p-3">Installment Rate</th>
                                                        <th className="p-3">Installments</th>
                                                        <th className="p-3">Discount</th>
                                                        <th className="p-3 text-right">Total Net Cost</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/60">
                                                    {feeComponents
                                                        .filter(f => parseFloat(f.amount) > 0)
                                                        .map((f, i) => {
                                                            const numAmt = parseFloat(f.amount) || 0;
                                                            const numDisc = parseFloat(f.discount_value || "0") || 0;
                                                            const hasDisc = Boolean(f.has_discount && numDisc > 0);
                                                            const deduction = hasDisc
                                                                ? f.discount_type === "percentage" ? (numAmt * Math.min(100, numDisc)) / 100 : Math.min(numAmt, numDisc)
                                                                : 0;
                                                            const netRate = Math.max(0, numAmt - deduction);
                                                            const normUnit = normalizeFeeUnit(f.unit);
                                                            const instCount = f.installments_count != null && !isNaN(Number(f.installments_count))
                                                                ? Number(f.installments_count)
                                                                : getEstimatedInstallmentsCount(normUnit, parseFloat(durationValue) || 1, durationUnit || "year");
                                                            const totalCost = netRate * Math.max(1, instCount);

                                                            return (
                                                                <tr key={f.id || i} className="hover:bg-muted/20 transition-colors">
                                                                    <td className="p-3 font-bold text-foreground">
                                                                        <div className="flex items-center gap-1.5">
                                                                            <span>{f.title || "Fee Head"}</span>
                                                                            {normUnit === "one-time" && (
                                                                                <Badge variant="outline" className="text-[9px] font-extrabold bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                                                                    One-Time Upfront
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 font-medium text-muted-foreground capitalize">
                                                                        {normUnit === "one-time" ? "Lump Sum" : normUnit === "half-year" ? "Half-Yearly (6mo)" : `${normUnit}ly`}
                                                                    </td>
                                                                    <td className="p-3 font-semibold text-foreground">
                                                                        ₹{netRate.toLocaleString()} <span className="text-[10px] text-muted-foreground">/ {normUnit}</span>
                                                                    </td>
                                                                    <td className="p-3 font-medium text-muted-foreground">
                                                                        {normUnit === "one-time" ? "1 Payment" : `${instCount} × Payments`}
                                                                    </td>
                                                                    <td className="p-3">
                                                                        {hasDisc ? (
                                                                            <span className="text-emerald-600 font-bold">
                                                                                {f.discount_type === "percentage" ? `${f.discount_value}% OFF` : `-₹${deduction.toLocaleString()}`}
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-muted-foreground">—</span>
                                                                        )}
                                                                    </td>
                                                                    <td className="p-3 text-right">
                                                                        <span className="text-sm font-black text-primary">
                                                                            ₹{totalCost.toLocaleString()}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Marketplace Direct Checkout */}
                                <div className="border-t pt-4">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between rounded-xl border p-4 bg-muted/10">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-medium">Sell Course on Marketplace</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Enable this to list the program in the public marketplace for direct student checkout.
                                                </p>
                                            </div>
                                            <Checkbox
                                                checked={sellOnMarketplace}
                                                onCheckedChange={(checked) => setSellOnMarketplace(Boolean(checked))}
                                            />
                                        </div>

                                        {sellOnMarketplace && (
                                            <div className="space-y-2 rounded-xl border border-primary/20 bg-primary/5 p-4 animate-in fade-in">
                                                <Label className="text-sm font-medium">Marketplace Selling Price (Rs.)</Label>
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    placeholder="e.g. 4999"
                                                    value={marketplacePrice || ""}
                                                    onChange={(e) => setMarketplacePrice(Number(e.target.value) || 0)}
                                                    className="h-10 bg-background"
                                                />
                                                <p className="text-xs text-muted-foreground">
                                                    This price will be displayed to students on the public store.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* -------- STEP 3: MEDIA -------- */}
                        {activeStep === 3 && (
                            <div className="space-y-4">
                                {/* Drop zone */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Upload Media</Label>
                                    <div
                                        className={cn(
                                            "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                                            "hover:border-primary/50 hover:bg-primary/5",
                                            mediaUploading && "opacity-60 pointer-events-none"
                                        )}
                                        onClick={() => mediaInputRef.current?.click()}
                                        onDragOver={(e) => e.preventDefault()}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            handleMediaFiles(e.dataTransfer.files);
                                        }}
                                    >
                                        <input
                                            ref={mediaInputRef}
                                            type="file"
                                            accept="image/*,video/*"
                                            multiple
                                            className="hidden"
                                            onChange={(e) => handleMediaFiles(e.target.files)}
                                        />
                                        {mediaUploading ? (
                                            <div className="flex flex-col items-center gap-2">
                                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                                <p className="text-sm text-muted-foreground">Uploading...</p>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center gap-2">
                                                <Upload className="h-8 w-8 text-muted-foreground" />
                                                <p className="text-sm font-medium">Drop images or videos here or click to browse</p>
                                                <p className="text-xs text-muted-foreground">Multiple files supported · PNG, JPG, WEBP, GIF, MP4, WEBM</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Or Add Media URL</Label>
                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-12">
                                        <div className="md:col-span-8">
                                            <Input
                                                value={mediaUrlInput}
                                                onChange={(e) => setMediaUrlInput(e.target.value)}
                                                placeholder="https://example.com/media.jpg or https://example.com/video.mp4"
                                                disabled={mediaUploading}
                                            />
                                        </div>
                                        <div className="md:col-span-2">
                                            <Select value={mediaUrlType} onValueChange={(value: "auto" | "image" | "video") => setMediaUrlType(value)}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Type" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="auto">Auto</SelectItem>
                                                    <SelectItem value="image">Image</SelectItem>
                                                    <SelectItem value="video">Video</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="md:col-span-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="w-full"
                                                onClick={handleAddMediaByUrl}
                                                disabled={mediaUploading}
                                            >
                                                Add URL
                                            </Button>
                                        </div>
                                    </div>
                                    <p className="text-xs text-muted-foreground">Use Auto for links with file extensions, or choose type manually.</p>
                                </div>

                                {/* Create mode: pending media preview */}
                                {!editing && pendingMediaFiles.length > 0 && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Queued for Upload ({pendingMediaFiles.length})</Label>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {pendingMediaFiles.map((pm, i) => (
                                                <div key={pm.id} className="relative group border rounded-xl overflow-hidden bg-muted/20">
                                                    {pm.uploading || !pm.url ? (
                                                        <div className="h-24 w-full flex items-center justify-center bg-muted/40">
                                                            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                                        </div>
                                                    ) : pm.mediaType === "video" || isVideoMedia(pm) ? (
                                                        <video
                                                            src={pm.url}
                                                            className="h-24 w-full object-cover"
                                                            muted
                                                            controls
                                                            playsInline
                                                        />
                                                    ) : (
                                                        <img
                                                            src={pm.url}
                                                            alt={pm.title}
                                                            className="h-24 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                                        />
                                                    )}
                                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2">
                                                        <div className="flex items-center justify-between gap-2 text-xs text-white truncate font-medium">
                                                            <span className="truncate">{pm.title}</span>
                                                            <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                                                                {pm.mediaType}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="mt-1 text-white bg-red-600 hover:bg-red-700 rounded px-2 py-1 text-xs w-full"
                                                            onClick={() => setPendingMediaFiles((prev) => prev.filter((item) => item.id !== pm.id))}
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Edit mode: saved media gallery */}
                                {editing && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">
                                            Program Gallery{mediaList.length > 0 ? ` (${mediaList.length})` : ""}
                                        </Label>
                                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {mediaLoading ? (
                                                <div className="col-span-full py-6 flex justify-center items-center">
                                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                </div>
                                            ) : mediaList.length ? (
                                                mediaList.map((m) => (
                                                    <div key={m.id} className="relative group border rounded-xl overflow-hidden bg-muted/20">
                                                        {isVideoMedia(m) ? (
                                                            <video
                                                                src={m.url}
                                                                className="h-24 w-full object-cover"
                                                                muted
                                                                controls
                                                                playsInline
                                                            />
                                                        ) : (
                                                            <img
                                                                src={m.url}
                                                                alt={m.title || m.media_type}
                                                                className="h-24 w-full object-cover transition-transform duration-200 group-hover:scale-105"
                                                            />
                                                        )}
                                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-2">
                                                            <div className="flex items-center justify-between gap-2 text-xs text-white truncate font-medium">
                                                                <span className="truncate">{m.title || m.media_type}</span>
                                                                <span className="rounded-full border border-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                                                                    {m.media_type}
                                                                </span>
                                                            </div>
                                                            <div className="text-xs text-white/60">Order: {m.sort_order}</div>
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                className="h-7 py-0 px-2 text-xs w-full mt-1"
                                                                onClick={() => handleDeleteProgramMedia(m.id)}
                                                            >
                                                                Remove
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="col-span-full py-8 text-center text-sm text-muted-foreground border border-dashed rounded-xl">
                                                    No media resources uploaded yet
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Footer nav */}
                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
                        <div>
                            {activeStep > 0 && (
                                <Button variant="outline" onClick={() => setActiveStep((s) => s - 1)}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                disabled={programDetailLoading || submitting}
                                onClick={() => {
                                    editDetailRequestRef.current += 1;
                                    setDialogOpen(false);
                                    setEditing(null);
                                }}
                            >
                                Cancel
                            </Button>
                            {activeStep < steps.length - 1 ? (
                                <Button
                                    disabled={programDetailLoading}
                                    onClick={() => {
                                        if (activeStep === 0 && !validateBasicStepForNavigation()) return;
                                        if (activeStep === 2 && !validateFeeStep()) return;
                                        setActiveStep((s) => s + 1);
                                    }}
                                >
                                    {programDetailLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Next <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => (editing ? handleUpdate() : handleCreate())}
                                    disabled={submitting || isMediaUploadPending || programDetailLoading}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                                >
                                    {submitting ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</>
                                    ) : isMediaUploadPending ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading media...</>
                                    ) : editing ? (
                                        "Save Changes"
                                    ) : (
                                        "Register Program"
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent className="bg-card border border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-bold">Delete Program?</AlertDialogTitle>
                        <p className="text-sm text-muted-foreground">
                            This action permanently removes the selected program from this institution. Course mappings, pricing listings and media will be archived.
                        </p>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                        <AlertDialogCancel className="hover:bg-muted">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>
                            Confirm Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* View Program Sheet */}
            <Sheet open={viewOpen} onOpenChange={(open) => {
                setViewOpen(open);
                if (!open) { setViewing(null); setViewDetail(null); setViewMediaList([]); }
            }}>
                <SheetContent
                    className="h-dvh w-full gap-0 overflow-hidden bg-card p-0 text-foreground backdrop-blur-2xl sm:max-w-3xl"
                    defaultSize={760}
                    minSize={520}
                    maxSize={980}
                    resizeStorageKey="program-details-sheet-width"
                >
                    <SheetHeader className="shrink-0 border-b border-border px-4 py-5 pr-12 sm:px-6">
                        <SheetTitle className="text-xl font-bold flex items-center gap-2">
                            <GraduationCap className="h-5 w-5 text-primary" />
                            Program Details
                        </SheetTitle>
                        <SheetDescription>Full details of the academic program.</SheetDescription>
                        {(viewing || viewDetail) && <div className="text-xs font-medium text-muted-foreground">ID: {(viewDetail || viewing as any)?.id}</div>}
                    </SheetHeader>

                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
                        {viewDetailLoading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (viewing || viewDetail) && (() => {
                            const d = viewDetail || viewing as any;
                            const feeTotal = (d.fee_components || []).reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);
                            return (
                                <div className="space-y-6 pb-6">
                                {/* ── Header card ── */}
                                <div className="flex items-start gap-4 rounded-xl border bg-muted/20 p-4">
                                    <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20 shrink-0">
                                        <GraduationCap className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="min-w-0 flex-1 space-y-2">
                                        <div>
                                            <h2 className="text-lg font-semibold text-foreground leading-tight">{d.title}</h2>
                                            <p className="text-xs text-muted-foreground font-mono mt-0.5">{d.slug}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {d.program_type_name && <Badge variant="outline">{d.program_type_name}</Badge>}
                                            <Badge className={cn(d.is_active ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20")}>
                                                {d.is_active ? "Active" : "Disabled"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* ── Identification ── */}
                                <section className="space-y-2">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identification</h3>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
                                        <div className="rounded-md border p-3 col-span-2">
                                            <span className="text-xs text-muted-foreground block">Institution</span>
                                            <p className="font-medium mt-0.5">{d.institution_name || `ID: ${d.institution_id}`}</p>
                                        </div>
                                        {(d.institution_board_name || d.institution_board_id) && (
                                            <div className="rounded-md border p-3 col-span-2">
                                                <span className="text-xs text-muted-foreground block">Board</span>
                                                <p className="font-medium mt-0.5">{d.institution_board_name || `ID: ${d.institution_board_id}`}</p>
                                            </div>
                                        )}
                                        {(d.university_name || d.university_id) && (
                                            <div className="rounded-md border p-3 col-span-2">
                                                <span className="text-xs text-muted-foreground block">Parent University</span>
                                                <p className="font-medium mt-0.5">{d.university_name || `ID: ${d.university_id}`}</p>
                                            </div>
                                        )}
                                        <div className="rounded-md border p-3">
                                            <span className="text-xs text-muted-foreground block">Program Type</span>
                                            <p className="font-medium mt-0.5">{d.program_type_name || `ID: ${d.program_type_id}`}</p>
                                        </div>
                                        <div className="rounded-md border p-3">
                                            <span className="text-xs text-muted-foreground block">Status</span>
                                            <p className="font-medium mt-0.5">{d.is_active ? "Active" : "Disabled"}</p>
                                        </div>
                                        <div className="rounded-md border p-3 col-span-2">
                                            <span className="text-xs text-muted-foreground block">Slug</span>
                                            <p className="font-medium mt-0.5 font-mono text-xs break-all">{d.slug}</p>
                                        </div>
                                    </div>
                                </section>

                                {/* ── Program Details ── */}
                                <section className="space-y-2">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Program Details</h3>
                                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 text-sm">
                                        {(d.duration_value != null) && (
                                            <div className="rounded-md border p-3">
                                                <span className="text-xs text-muted-foreground block">Duration</span>
                                                <p className="font-medium mt-0.5 capitalize">
                                                    {d.duration_value}{d.duration_unit ? ` ${d.duration_unit}` : ""}
                                                </p>
                                            </div>
                                        )}
                                        {(d.seats_available != null) && (
                                            <div className="rounded-md border p-3">
                                                <span className="text-xs text-muted-foreground block">Seats Available</span>
                                                <p className="font-medium mt-0.5">{d.seats_available}</p>
                                            </div>
                                        )}
                                        {d.teaching_method && (
                                            <div className="rounded-md border p-3">
                                                <span className="text-xs text-muted-foreground block">Teaching Method</span>
                                                <p className="font-medium mt-0.5 capitalize">{d.teaching_method.replace("_", " ")}</p>
                                            </div>
                                        )}
                                        <div className="rounded-md border p-3">
                                            <span className="text-xs text-muted-foreground block">Created</span>
                                            <p className="font-medium mt-0.5">{d.created_at ? new Date(d.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</p>
                                        </div>
                                        {d.updated_at && (
                                            <div className="rounded-md border p-3">
                                                <span className="text-xs text-muted-foreground block">Last Updated</span>
                                                <p className="font-medium mt-0.5">{new Date(d.updated_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</p>
                                            </div>
                                        )}
                                    </div>
                                    {/* Show placeholder row if no optional fields */}
                                    {d.duration_value == null && d.seats_available == null && !d.teaching_method && (
                                        <p className="text-xs text-muted-foreground italic">No additional details recorded.</p>
                                    )}
                                </section>

                                {/* ── About ── */}
                                {d.about && (
                                    <section className="space-y-2">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">About</h3>
                                        <div className="rounded-md border p-3 text-sm bg-muted/10">
                                            <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{d.about}</p>
                                        </div>
                                    </section>
                                )}

                                {/* ── Categories & Languages ── */}
                                {(d.category_names?.length > 0 || d.language_names?.length > 0 || d.subject_names?.length > 0 || d.subject_category_names?.length > 0 || d.section_names?.length > 0) && (
                                    <section className="space-y-2">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Classification</h3>
                                        <div className="grid gap-2 grid-cols-2 text-sm">
                                            {d.category_names?.length > 0 && (
                                                <div className="rounded-md border p-3 col-span-2">
                                                    <span className="text-xs text-muted-foreground block">Categories</span>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {d.category_names.map((cat: string, i: number) => (
                                                            <Badge key={i} variant="outline" className="text-xs">{cat}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {d.language_names?.length > 0 && (
                                                <div className="rounded-md border p-3">
                                                    <span className="text-xs text-muted-foreground block">Languages</span>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {d.language_names.map((lang: string, i: number) => (
                                                            <Badge key={i} variant="secondary" className="text-xs">{lang}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {(d.subject_names?.length > 0 || d.subject_category_names?.length > 0) && (
                                                <div className="rounded-md border p-3">
                                                    <span className="text-xs text-muted-foreground block">Subjects</span>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {[...(d.subject_names || []), ...(d.subject_category_names || [])].map((subject: string, i: number) => (
                                                            <Badge key={i} variant="outline" className="text-xs">{subject}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {d.section_names?.length > 0 && (
                                                <div className="rounded-md border p-3">
                                                    <span className="text-xs text-muted-foreground block">Sections</span>
                                                    <div className="mt-2 flex flex-wrap gap-2">
                                                        {d.section_names.map((section: string, i: number) => (
                                                            <Badge key={i} variant="secondary" className="text-xs">{section}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                )}

                                {/* ── Fee Structure ── */}
                                {d.fee_components?.length > 0 && (
                                    <section className="space-y-2">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fee Structure</h3>
                                        <div className="rounded-md border divide-y divide-border text-sm overflow-hidden">
                                            {d.fee_components.map((f: any, i: number) => (
                                                <div key={i} className="flex items-center justify-between px-3 py-2.5">
                                                    <span className="text-muted-foreground">{f.title}</span>
                                                    <span className="font-medium font-mono">
                                                        Rs. {Number(f.amount).toLocaleString()}
                                                        {f.unit ? <span className="ml-1 text-xs text-muted-foreground">/ {f.unit}</span> : null}
                                                    </span>
                                                </div>
                                            ))}
                                            <div className="flex items-center justify-between px-3 py-2.5 bg-primary/5">
                                                <span className="font-semibold text-xs">Total</span>
                                                <span className="font-bold font-mono text-primary">Rs. {feeTotal.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {/* ── Program Media ── */}
                                <section className="space-y-2">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Media{viewMediaList.length > 0 ? ` (${viewMediaList.length})` : ""}
                                    </h3>
                                    {viewMediaList.length > 0 ? (
                                        <div className="space-y-2">
                                            <ImagePreviewSlider
                                                images={viewMediaList.map((m: any) => ({
                                                    src: m.url,
                                                    alt: m.title || "Program media",
                                                    type: isVideoMedia(m) ? "video" : "image",
                                                    poster: isVideoMedia(m) ? undefined : m.url,
                                                }))}
                                                previewWidth={640}
                                                previewHeight={360}
                                                className="aspect-video border border-border/70 bg-muted/20"
                                            />
                                            <p className="text-[11px] text-muted-foreground">
                                                Click preview to open full media viewer
                                            </p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic">No media uploaded for this program.</p>
                                    )}
                                </section>
                                </div>
                            );
                        })()}
                    </div>
                </SheetContent>
            </Sheet>

            {/* ============================================================ */}
            {/* MODAL: SELECT MASTER PROGRAMS / COURSES (FROM PLATFORM ADMIN) */}
            {/* ============================================================ */}
            <Dialog open={selectCoursesModalOpen} onOpenChange={setSelectCoursesModalOpen}>
                <DialogContent className="sm:max-w-4xl w-[94vw] max-h-[90vh] flex flex-col p-6 overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-primary" />
                            <span>Select & Add Courses & Programs</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Browse master courses & standard academic curriculum created by platform administration. Select and add them directly to your active institution.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Search & Filter Bar */}
                    <div className="py-2 space-y-3">
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={masterCatalogSearch}
                                    onChange={(e) => {
                                        setMasterCatalogSearch(e.target.value);
                                        fetchMasterCatalog(e.target.value);
                                    }}
                                    placeholder="Search by course name, code, stream, or subjects..."
                                    className="pl-9 text-xs h-9"
                                />
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => fetchMasterCatalog(masterCatalogSearch)}
                                disabled={masterCatalogLoading}
                                className="h-9 text-xs gap-1"
                            >
                                <RefreshCw className={cn("w-3.5 h-3.5", masterCatalogLoading && "animate-spin")} /> Refresh
                            </Button>
                        </div>
                    </div>

                    {/* Catalog List / Grid */}
                    <div className="flex-1 overflow-y-auto pr-1 space-y-3 min-h-[260px] max-h-[50vh]">
                        {masterCatalogLoading ? (
                            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground space-y-2">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <span className="text-xs font-semibold">Loading platform master catalog...</span>
                            </div>
                        ) : masterCatalogList.length === 0 ? (
                            <div className="text-center py-16 border rounded-2xl bg-muted/10 space-y-2">
                                <BookOpen className="w-10 h-10 text-muted-foreground/40 mx-auto" />
                                <h4 className="text-sm font-bold">No Courses Found</h4>
                                <p className="text-xs text-muted-foreground">Try clearing search filters or search with another keyword.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                                {masterCatalogList.map((course) => {
                                    const isSelected = selectedMasterCourseIds.includes(course.id);
                                    const isAdded = course.is_already_added;

                                    return (
                                        <div
                                            key={course.id}
                                            onClick={() => {
                                                if (!isAdded) handleToggleSelectCourse(course.id);
                                            }}
                                            className={cn(
                                                "p-4 rounded-2xl border transition-all text-xs flex flex-col justify-between space-y-3",
                                                isAdded
                                                    ? "bg-muted/30 border-border/60 opacity-80 cursor-default"
                                                    : isSelected
                                                    ? "bg-primary/5 border-primary shadow-xs cursor-pointer ring-1 ring-primary"
                                                    : "bg-card hover:border-primary/50 cursor-pointer shadow-2xs"
                                            )}
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-start gap-2.5 min-w-0">
                                                        {!isAdded && (
                                                            <Checkbox
                                                                checked={isSelected}
                                                                onCheckedChange={() => handleToggleSelectCourse(course.id)}
                                                                className="mt-0.5"
                                                            />
                                                        )}
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                                                                    {course.program_type_name}
                                                                </Badge>
                                                                <span className="font-mono text-[10px] text-muted-foreground font-semibold">
                                                                    {course.code}
                                                                </span>
                                                            </div>
                                                            <h4 className="font-bold text-sm text-foreground leading-snug">
                                                                {course.title}
                                                            </h4>
                                                        </div>
                                                    </div>

                                                    {isAdded ? (
                                                        <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/40 text-[10px] gap-1 font-bold shrink-0">
                                                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Added
                                                        </Badge>
                                                    ) : (
                                                        <Button
                                                            size="sm"
                                                            variant={isSelected ? "default" : "outline"}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleAdoptSelectedCourses([course]);
                                                            }}
                                                            disabled={adoptingCourses}
                                                            className="h-7 text-xs font-bold gap-1 shrink-0 px-2.5"
                                                        >
                                                            <Plus className="w-3.5 h-3.5" /> Add
                                                        </Button>
                                                    )}
                                                </div>

                                                <p className="text-muted-foreground line-clamp-2 text-[11px] leading-relaxed">
                                                    {course.description || "Comprehensive academic syllabus and curriculum modules."}
                                                </p>

                                                {/* Subjects Included */}
                                                {Array.isArray(course.subjects) && course.subjects.length > 0 && (
                                                    <div className="space-y-1 pt-1">
                                                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                                            Subjects ({course.subjects.length})
                                                        </span>
                                                        <div className="flex flex-wrap gap-1">
                                                            {course.subjects.slice(0, 4).map((sub: string, idx: number) => (
                                                                <span
                                                                    key={idx}
                                                                    className="px-1.5 py-0.5 rounded-md bg-muted text-[10px] font-medium text-foreground"
                                                                >
                                                                    {sub}
                                                                </span>
                                                            ))}
                                                            {course.subjects.length > 4 && (
                                                                <span className="text-[10px] text-muted-foreground font-semibold px-1 py-0.5">
                                                                    +{course.subjects.length - 4} more
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t text-[11px] text-muted-foreground">
                                                <span className="inline-flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" />
                                                    {course.duration_text || `${course.duration_value} months`}
                                                </span>
                                                <span className="font-semibold text-foreground">
                                                    {course.category_name}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Dialog Footer */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t mt-2">
                        <div className="text-xs text-muted-foreground">
                            {selectedMasterCourseIds.length > 0 ? (
                                <span className="font-bold text-foreground">
                                    {selectedMasterCourseIds.length} course(s) selected
                                </span>
                            ) : (
                                <span>Select one or more courses above to add them simultaneously</span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSelectCoursesModalOpen(false)}
                                disabled={adoptingCourses}
                                className="h-9 text-xs flex-1 sm:flex-none font-semibold"
                            >
                                Close
                            </Button>
                            <Button
                                type="button"
                                onClick={() => handleAdoptSelectedCourses()}
                                disabled={selectedMasterCourseIds.length === 0 || adoptingCourses}
                                className="h-9 text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground flex-1 sm:flex-none gap-1.5 shadow-sm"
                            >
                                {adoptingCourses ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <Plus className="w-3.5 h-3.5" />
                                )}
                                Add Selected ({selectedMasterCourseIds.length}) Courses
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ============================================================ */}
            {/* MODAL: MANAGE BATCHES & SECTIONS FOR PROGRAM */}
            {/* ============================================================ */}
            <Dialog open={batchModalOpen} onOpenChange={setBatchModalOpen}>
                <DialogContent className="sm:max-w-4xl w-[95vw] max-h-[92vh] flex flex-col p-6 overflow-hidden">
                    <DialogHeader className="pb-2 border-b">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                                    <Users className="h-5 w-5" />
                                </div>
                                <div>
                                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                        <span>Batches & Sections Management</span>
                                    </DialogTitle>
                                    <DialogDescription className="text-xs mt-0.5">
                                        Manage batches, sections, seats & fee structures for <strong className="text-foreground">{batchTargetProgram?.title}</strong>
                                    </DialogDescription>
                                </div>
                            </div>
                            <Badge variant="outline" className="hidden sm:inline-flex text-xs px-2.5 py-1 bg-primary/5 text-primary border-primary/20">
                                {programBatches.length} {programBatches.length === 1 ? "Batch" : "Batches"} Configured
                            </Badge>
                        </div>
                    </DialogHeader>

                    {/* Tabs Navigation */}
                    <Tabs value={batchActiveTab} onValueChange={(v) => setBatchActiveTab(v as "details" | "fee" | "list")} className="flex flex-col flex-1 overflow-hidden pt-2">
                        <TabsList className="grid grid-cols-3 max-w-md shrink-0 mb-3 bg-muted/60">
                            <TabsTrigger value="details" className="text-xs font-semibold gap-1.5">
                                <Users className="w-3.5 h-3.5" /> 1. Batch Details
                            </TabsTrigger>
                            <TabsTrigger value="fee" className="text-xs font-semibold gap-1.5">
                                <Wallet className="w-3.5 h-3.5" /> 2. Fee Structure ({batchFeeOptions.length})
                            </TabsTrigger>
                            <TabsTrigger value="list" className="text-xs font-semibold gap-1.5">
                                <Layers className="w-3.5 h-3.5" /> Active Batches ({programBatches.length})
                            </TabsTrigger>
                        </TabsList>

                        {/* TAB 1: BATCH BASIC DETAILS */}
                        <TabsContent value="details" className="flex-1 overflow-y-auto pr-1 space-y-4 data-[state=active]:flex data-[state=active]:flex-col">
                            <form onSubmit={handleAddBatch} className="space-y-4">
                                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04] p-4 space-y-3.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <h4>Batch Basic Details</h4>
                                        </div>
                                        {batchMeta.programInfo?.duration_value && (
                                            <Badge variant="outline" className="text-[10px] font-semibold bg-primary/5 text-primary border-primary/20">
                                                Duration: {batchMeta.programInfo.duration_value} {batchMeta.programInfo.duration_unit || "Years"}
                                            </Badge>
                                        )}
                                    </div>

                                    {/* 1. Batch Name & Multi-Section Selection */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        {/* Batch Name */}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground">
                                                Batch Name <span className="text-destructive">*</span>
                                            </Label>
                                            <Input
                                                placeholder="e.g. Morning Batch 2026"
                                                value={batchForm.batchName}
                                                onChange={(e) => setBatchForm(prev => ({ ...prev, batchName: e.target.value }))}
                                                className="text-xs h-9 bg-background"
                                                required
                                            />
                                        </div>

                                        {/* Seats / Max Students */}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground">
                                                Seats / Max Students (per section)
                                            </Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                placeholder="e.g. 50"
                                                value={batchForm.seatsAvailable}
                                                onChange={(e) => setBatchForm(prev => ({ ...prev, seatsAvailable: e.target.value }))}
                                                className="text-xs h-9 bg-background"
                                            />
                                        </div>
                                    </div>

                                    {/* 2. Multi-Section Selector */}
                                    <div className="space-y-2 p-3 rounded-xl border border-border/80 bg-background/80">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                                <Users className="h-3.5 w-3.5 text-primary" />
                                                Assign Sections <span className="text-destructive">*</span>
                                            </Label>
                                            <span className="text-[11px] text-muted-foreground">
                                                {batchForm.selectedSections.length} section(s) selected
                                            </span>
                                        </div>

                                        {/* Quick Section Chips Toggle */}
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            {["Section A", "Section B", "Section C", "Section D", "Section E", "Section F"].map((sec) => {
                                                const isSelected = batchForm.selectedSections.includes(sec);
                                                return (
                                                    <button
                                                        key={sec}
                                                        type="button"
                                                        onClick={() => {
                                                            setBatchForm(prev => ({
                                                                ...prev,
                                                                selectedSections: isSelected
                                                                    ? prev.selectedSections.filter(s => s !== sec)
                                                                    : [...prev.selectedSections, sec]
                                                            }));
                                                        }}
                                                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                                                            isSelected
                                                                ? "bg-primary text-primary-foreground border-primary shadow-2xs"
                                                                : "bg-muted/40 hover:bg-muted text-foreground border-border"
                                                        }`}
                                                    >
                                                        {isSelected ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3 text-muted-foreground" />}
                                                        <span>{sec}</span>
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Custom Section Adder */}
                                        <div className="flex items-center gap-2 pt-1">
                                            <Input
                                                placeholder="Add custom section name (e.g. Section G, Batch 1)..."
                                                value={batchForm.newCustomSection}
                                                onChange={(e) => setBatchForm(prev => ({ ...prev, newCustomSection: e.target.value }))}
                                                onKeyDown={(e) => {
                                                    if (e.key === "Enter") {
                                                        e.preventDefault();
                                                        const custom = batchForm.newCustomSection.trim();
                                                        if (custom && !batchForm.selectedSections.includes(custom)) {
                                                            setBatchForm(prev => ({
                                                                ...prev,
                                                                selectedSections: [...prev.selectedSections, custom],
                                                                newCustomSection: "",
                                                            }));
                                                        }
                                                    }
                                                }}
                                                className="text-xs h-8 bg-background flex-1"
                                            />
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                    const custom = batchForm.newCustomSection.trim();
                                                    if (custom && !batchForm.selectedSections.includes(custom)) {
                                                        setBatchForm(prev => ({
                                                            ...prev,
                                                            selectedSections: [...prev.selectedSections, custom],
                                                            newCustomSection: "",
                                                        }));
                                                    }
                                                }}
                                                className="h-8 text-xs font-semibold"
                                            >
                                                + Add Section
                                            </Button>
                                        </div>

                                        {/* Selected Section Badges */}
                                        {batchForm.selectedSections.length > 0 && (
                                            <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                                <span className="text-[10px] uppercase font-bold text-muted-foreground mr-1">Active Sections:</span>
                                                {batchForm.selectedSections.map((sec) => (
                                                    <Badge
                                                        key={sec}
                                                        variant="secondary"
                                                        className="text-xs font-semibold bg-primary/10 text-primary border border-primary/20 gap-1 pr-1.5"
                                                    >
                                                        <span>{sec}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setBatchForm(prev => ({
                                                                    ...prev,
                                                                    selectedSections: prev.selectedSections.filter(s => s !== sec)
                                                                }));
                                                            }}
                                                            className="hover:bg-primary/20 rounded-full p-0.5"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </Badge>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* 3. Teaching Method & Attendance Setup */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                                        {/* Teaching Method */}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground">
                                                Teaching Method
                                            </Label>
                                            <Select
                                                value={batchForm.teachingMethod}
                                                onValueChange={(val) => setBatchForm(prev => ({ ...prev, teachingMethod: val }))}
                                            >
                                                <SelectTrigger className="text-xs h-9 bg-background">
                                                    <SelectValue placeholder="Select Method" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Classroom">Classroom / Offline</SelectItem>
                                                    <SelectItem value="Online Live">Online Live Classes</SelectItem>
                                                    <SelectItem value="Hybrid">Hybrid (Online + Offline)</SelectItem>
                                                    <SelectItem value="Recorded">Recorded Lectures</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {/* Attendance Setup Dropdown */}
                                        <div className="space-y-1.5">
                                            <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="h-3.5 w-3.5 text-primary" />
                                                    Attendance Setup
                                                </span>
                                            </Label>
                                            <Select
                                                value={batchForm.attendanceSetupId || batchForm.attendanceSetupTitle}
                                                onValueChange={(val) => {
                                                    const setups = batchMeta.attendanceSetups || [];
                                                    const matched = setups.find((s: any) => String(s.id) === val || s.title === val);
                                                    if (matched) {
                                                        setBatchForm((prev) => ({
                                                            ...prev,
                                                            attendanceSetupId: String(matched.id),
                                                            attendanceSetupTitle: matched.title,
                                                        }));
                                                    } else {
                                                        setBatchForm((prev) => ({
                                                            ...prev,
                                                            attendanceSetupId: "",
                                                            attendanceSetupTitle: val,
                                                        }));
                                                    }
                                                }}
                                            >
                                                <SelectTrigger className="text-xs h-9 bg-background font-medium">
                                                    <SelectValue placeholder="Select Attendance Setup" />
                                                </SelectTrigger>
                                                <SelectContent className="max-h-60">
                                                    {(batchMeta.attendanceSetups || []).length > 0 ? (
                                                        batchMeta.attendanceSetups.map((s: any) => (
                                                            <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-semibold text-foreground">{s.title}</span>
                                                                    <span className="text-[10px] text-muted-foreground">
                                                                        ({s.attendance_mode === "PERIOD_WISE" ? "Period-Wise" : s.attendance_mode === "BIOMETRIC" ? "Biometric" : "Full Day"}
                                                                        {s.start_time ? ` • ${s.start_time} - ${s.end_time}` : ""})
                                                                    </span>
                                                                    {s.is_default && (
                                                                        <span className="text-[9px] px-1 py-0.2 rounded bg-primary/10 text-primary font-bold">Default</span>
                                                                    )}
                                                                </div>
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <>
                                                            <SelectItem value="Daily Attendance (Full Day)">Daily Attendance (Full Day)</SelectItem>
                                                            <SelectItem value="Period-Wise Lecture Attendance">Period-Wise Lecture Attendance</SelectItem>
                                                            <SelectItem value="Regular Academic Shift (08:00 - 14:30)">Regular Academic Shift (08:00 - 14:30)</SelectItem>
                                                            <SelectItem value="Biometric Attendance (In / Out)">Biometric Attendance (In / Out)</SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* Form Action Buttons */}
                                <div className="flex items-center justify-between pt-2 border-t">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() => {
                                                handleClearBatchForm();
                                                clearBatchDraft();
                                            }}
                                            disabled={savingBatch}
                                            className="h-9 px-4 text-xs font-semibold gap-1.5"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5" /> Clear
                                        </Button>
                                        <ProgressiveSaveIndicator status={batchSaveStatus} />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="secondary"
                                            onClick={() => setBatchActiveTab("fee")}
                                            className="h-9 px-4 text-xs font-bold gap-1.5"
                                        >
                                            Configure Fee Structure <ArrowRight className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button
                                            type="submit"
                                            disabled={savingBatch || !batchForm.batchName.trim() || batchForm.selectedSections.length === 0}
                                            className="h-9 px-5 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                                        >
                                            {savingBatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                            Save Batch ({batchForm.selectedSections.length} Section{batchForm.selectedSections.length > 1 ? "s" : ""})
                                        </Button>
                                    </div>
                                </div>
                            </form>
                        </TabsContent>

                        {/* TAB 2: FEE STRUCTURE / PAYMENT PLANS */}
                        <TabsContent value="fee" className="flex-1 overflow-y-auto pr-1 space-y-4 data-[state=active]:flex data-[state=active]:flex-col">
                            {/* Course Duration Header & Quick Add Payment Schedule Buttons */}
                            {(() => {
                                const progInfo = batchMeta.programInfo || batchTargetProgram;
                                const rawDur = progInfo?.duration_value || 1;
                                const durVal = typeof rawDur === "number" ? rawDur : parseInt(rawDur) || 1;
                                const durUnit = (progInfo?.duration_unit || "year").toLowerCase();

                                const isAnnual = durUnit.includes("annual") || durUnit.includes("year");
                                const totalYears = isAnnual ? durVal : Math.max(1, Math.ceil(durVal / 12));
                                const totalSemesters = durUnit.includes("sem") ? durVal : totalYears * 2;
                                const totalMonths = durUnit.includes("month") ? durVal : totalYears * 12;

                                return (
                                    <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/[0.03] space-y-2.5 shadow-2xs">
                                        <div className="flex items-center justify-between pb-1.5 border-b border-border/60">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-primary" />
                                                <span className="text-xs font-bold text-foreground">
                                                    Program Duration: {durVal} {progInfo?.duration_unit || "Years"}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    ({totalYears} Year{totalYears > 1 ? "s" : ""} • {totalSemesters} Semesters • {totalMonths} Months)
                                                </span>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] font-bold bg-background text-primary border-primary/30">
                                                Auto-Calibrated
                                            </Badge>
                                        </div>

                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-[11px] font-extrabold text-muted-foreground uppercase mr-1">
                                                Add Payment Schedule:
                                            </span>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddBatchFeeSchedule("Course Tuition Fee", "one-time")}
                                                className="h-7 text-[11px] font-bold bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/40 border-border/70 gap-1 rounded-lg"
                                            >
                                                💳 + One-Time Plan (1 Full Payment)
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddBatchFeeSchedule("Course Tuition Fee", "year")}
                                                className="h-7 text-[11px] font-bold bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/40 border-border/70 gap-1 rounded-lg"
                                            >
                                                🏛️ + Yearly Plan ({totalYears} Year{totalYears > 1 ? "s" : ""})
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddBatchFeeSchedule("Course Tuition Fee", "semester")}
                                                className="h-7 text-[11px] font-bold bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/40 border-border/70 gap-1 rounded-lg"
                                            >
                                                🎓 + Semester Plan ({totalSemesters} Semesters)
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddBatchFeeSchedule("Course Tuition Fee", "month")}
                                                className="h-7 text-[11px] font-bold bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/40 border-border/70 gap-1 rounded-lg"
                                            >
                                                📅 + Monthly Plan ({totalMonths} Months)
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddBatchFeeSchedule("Course Tuition Fee", "quarter")}
                                                className="h-7 text-[11px] font-bold bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/40 border-border/70 gap-1 rounded-lg"
                                            >
                                                + Quarterly ({totalYears * 4} Quarters)
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleAddBatchFeeSchedule("Course Tuition Fee", "half-year")}
                                                className="h-7 text-[11px] font-bold bg-background hover:bg-primary/5 hover:text-primary hover:border-primary/40 border-border/70 gap-1 rounded-lg"
                                            >
                                                + Half-Yearly ({totalYears * 2} Terms)
                                            </Button>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Fee Schedules List */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="text-sm font-extrabold text-foreground">
                                            Configured Fee Schedules & Payment Plans ({batchFeeOptions.length})
                                        </h4>
                                        <p className="text-xs text-muted-foreground">
                                            Specify the installment rate, billing frequency, installment count, and applicable discounts.
                                        </p>
                                    </div>
                                    <Button
                                        type="button"
                                        onClick={() => handleAddBatchFeeSchedule()}
                                        size="sm"
                                        variant="outline"
                                        className="text-xs font-bold border-primary/40 text-primary hover:bg-primary/10 h-8 gap-1.5"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Add Fee Option
                                    </Button>
                                </div>

                                {batchFeeOptions.length === 0 ? (
                                    <div className="p-8 text-center border rounded-xl border-dashed bg-muted/10 space-y-2">
                                        <Wallet className="h-7 w-7 text-muted-foreground/60 mx-auto" />
                                        <p className="text-xs font-bold text-foreground">No fee schedules configured yet</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            Click any button above to add a payment plan (One-Time, Monthly, Quarterly, Yearly).
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {batchFeeOptions.map((fee, idx) => {
                                            const numAmount = parseFloat(fee.amount) || 0;
                                            const numDiscount = parseFloat(fee.discount_value || "0") || 0;
                                            const hasDisc = Boolean(fee.has_discount && numDiscount > 0);
                                            const discDeduction = hasDisc
                                                ? fee.discount_type === "percentage"
                                                    ? (numAmount * Math.min(100, numDiscount)) / 100
                                                    : Math.min(numAmount, numDiscount)
                                                : 0;
                                            const netPerInstallment = Math.max(0, numAmount - discDeduction);
                                            const count = Math.max(1, parseInt(fee.installments_count) || 1);
                                            const totalCost = netPerInstallment * count;

                                            const unitLabelMap: Record<string, string> = {
                                                "one-time": "One-Time",
                                                "month": "Monthly Installment",
                                                "quarter": "Quarterly Installment",
                                                "half-year": "Half-Yearly Installment",
                                                "year": "Yearly Installment",
                                                "week": "Weekly Installment",
                                            };

                                            return (
                                                <div
                                                    key={fee.id}
                                                    className="p-4 rounded-xl border border-border bg-card shadow-xs space-y-3 hover:border-primary/40 transition-all"
                                                >
                                                    {/* Card Header */}
                                                    <div className="flex items-center justify-between pb-2 border-b border-border/50">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <Badge variant="outline" className="text-[10px] font-extrabold bg-primary/10 text-primary border-primary/20">
                                                                Option #{idx + 1}
                                                            </Badge>
                                                            <Badge variant="secondary" className="text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20">
                                                                {unitLabelMap[fee.unit] || fee.unit}
                                                            </Badge>
                                                            <span className="text-xs font-bold text-foreground">
                                                                {fee.fee_type === "Custom / Other Fee" && fee.custom_title ? fee.custom_title : fee.fee_type}
                                                            </span>
                                                        </div>
                                                        <Button
                                                            type="button"
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() => handleRemoveBatchFeeSchedule(fee.id)}
                                                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    </div>

                                                    {/* Row 1: Fee Type, Rate per Installment, Installments # */}
                                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                                        <div className="space-y-1.5 sm:col-span-1">
                                                            <Label className="text-xs font-semibold text-foreground">Fee Type *</Label>
                                                            <Select
                                                                value={fee.fee_type}
                                                                onValueChange={(val) => handleUpdateBatchFeeSchedule(fee.id, { fee_type: val })}
                                                            >
                                                                <SelectTrigger className="text-xs h-9 bg-background">
                                                                    <SelectValue placeholder="Select Fee Type" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="Course Tuition Fee">Course Tuition Fee</SelectItem>
                                                                    <SelectItem value="Tuition Fee">Tuition Fee</SelectItem>
                                                                    <SelectItem value="Admission Fee">Admission Fee</SelectItem>
                                                                    <SelectItem value="Registration Fee">Registration Fee</SelectItem>
                                                                    <SelectItem value="Exam / Certification Fee">Exam / Certification Fee</SelectItem>
                                                                    <SelectItem value="Lab / Practical Fee">Lab / Practical Fee</SelectItem>
                                                                    <SelectItem value="Custom / Other Fee">Custom / Other Fee</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            {fee.fee_type === "Custom / Other Fee" && (
                                                                <Input
                                                                    placeholder="Enter Custom Fee Head Name"
                                                                    value={fee.custom_title}
                                                                    onChange={(e) => handleUpdateBatchFeeSchedule(fee.id, { custom_title: e.target.value })}
                                                                    className="text-xs h-8 mt-1.5 bg-background"
                                                                />
                                                            )}
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs font-semibold text-foreground">Rate per Installment (₹) *</Label>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                placeholder="25000.00"
                                                                value={fee.amount}
                                                                onChange={(e) => handleUpdateBatchFeeSchedule(fee.id, { amount: e.target.value })}
                                                                className="text-xs h-9 bg-background"
                                                            />
                                                        </div>

                                                        <div className="space-y-1.5">
                                                            <Label className="text-xs font-semibold text-foreground">Installments #</Label>
                                                            <Input
                                                                type="number"
                                                                min="1"
                                                                placeholder="1"
                                                                value={fee.installments_count}
                                                                onChange={(e) => handleUpdateBatchFeeSchedule(fee.id, { installments_count: e.target.value })}
                                                                className="text-xs h-9 bg-background"
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Row 2: Discount / Scholarship Waiver */}
                                                    <div className="rounded-lg border border-border/70 p-2.5 bg-muted/20 space-y-2">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                                                <Tag className="w-3.5 h-3.5 text-primary" />
                                                                <span>Discount / Scholarship Waiver</span>
                                                            </div>
                                                            <Checkbox
                                                                checked={fee.has_discount}
                                                                onCheckedChange={(c) => handleUpdateBatchFeeSchedule(fee.id, { has_discount: Boolean(c) })}
                                                            />
                                                        </div>

                                                        {fee.has_discount && (
                                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-border/40">
                                                                <div className="space-y-1">
                                                                    <Label className="text-[11px] font-medium text-muted-foreground">Discount Type</Label>
                                                                    <Select
                                                                        value={fee.discount_type}
                                                                        onValueChange={(val: "percentage" | "fixed") => handleUpdateBatchFeeSchedule(fee.id, { discount_type: val })}
                                                                    >
                                                                        <SelectTrigger className="text-xs h-8 bg-background">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="percentage">Percentage (%)</SelectItem>
                                                                            <SelectItem value="fixed">Fixed Amount (₹)</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </div>
                                                                <div className="space-y-1">
                                                                    <Label className="text-[11px] font-medium text-muted-foreground">Discount Value</Label>
                                                                    <Input
                                                                        type="number"
                                                                        min="0"
                                                                        placeholder={fee.discount_type === "percentage" ? "10" : "1000"}
                                                                        value={fee.discount_value}
                                                                        onChange={(e) => handleUpdateBatchFeeSchedule(fee.id, { discount_value: e.target.value })}
                                                                        className="text-xs h-8 bg-background"
                                                                    />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Row 3: Calculation Footer */}
                                                    <div className="flex items-center justify-between pt-1 text-xs bg-muted/40 p-2 rounded-lg">
                                                        <div className="space-y-0.5">
                                                            <div className="font-semibold text-foreground">
                                                                Installment Rate: ₹{netPerInstallment.toLocaleString()} / {fee.unit === "one-time" ? "full course" : fee.unit}
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground">
                                                                Schedule: {count} payments &times; ₹{netPerInstallment.toLocaleString()}
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                                                Total Cost Under This Plan
                                                            </span>
                                                            <span className="text-base font-extrabold text-primary">
                                                                ₹{totalCost.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Fee Tab Action Bar */}
                            <div className="flex items-center justify-between pt-3 border-t">
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setBatchActiveTab("details")}
                                        className="h-9 px-4 text-xs font-semibold gap-1.5"
                                    >
                                        <ArrowLeft className="w-3.5 h-3.5" /> Back to Batch Details
                                    </Button>
                                    <ProgressiveSaveIndicator status={batchSaveStatus} />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                            handleClearBatchForm();
                                            clearBatchDraft();
                                        }}
                                        disabled={savingBatch}
                                        className="h-9 px-4 text-xs font-semibold gap-1.5"
                                    >
                                        <RotateCcw className="w-3.5 h-3.5" /> Clear
                                    </Button>
                                    <Button
                                        type="button"
                                        onClick={handleAddBatch}
                                        disabled={savingBatch || !batchForm.batchName.trim()}
                                        className="h-9 px-5 text-xs font-bold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                                    >
                                        {savingBatch ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                                        Save Batch
                                    </Button>
                                </div>
                            </div>
                        </TabsContent>

                        {/* TAB 3: ACTIVE BATCHES LIST */}
                        <TabsContent value="list" className="flex-1 overflow-y-auto pr-1 space-y-3 data-[state=active]:flex data-[state=active]:flex-col">
                            {loadingBatches ? (
                                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground text-xs space-y-2">
                                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                    <span>Loading program batches...</span>
                                </div>
                            ) : programBatches.length === 0 ? (
                                <div className="p-8 rounded-xl border border-dashed text-center flex flex-col items-center justify-center space-y-2 text-muted-foreground">
                                    <Users className="w-8 h-8 text-muted-foreground/40" />
                                    <p className="text-xs font-semibold">No batches configured for this program yet.</p>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setBatchActiveTab("details")}
                                        className="text-xs font-bold mt-2"
                                    >
                                        <Plus className="w-3.5 h-3.5 mr-1" /> Add Your First Batch
                                    </Button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {programBatches.map((batch) => {
                                        const finalPrice = Number(batch.price) > 0
                                            ? Math.max(0, Math.round(Number(batch.price) * (1 - (Number(batch.discount_percent) || 0) / 100)))
                                            : null;
                                        return (
                                            <div
                                                key={batch.id || batch.section_id}
                                                className="p-3.5 rounded-xl border bg-card hover:border-primary/40 transition-all shadow-xs flex flex-col justify-between gap-3"
                                            >
                                                <div className="space-y-2">
                                                    {/* Header: Name + Status */}
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                                                                <Users className="w-4 h-4" />
                                                            </div>
                                                            <div>
                                                                <h5 className="font-bold text-sm text-foreground leading-tight">
                                                                    {batch.batch_name || batch.name}
                                                                </h5>
                                                                <span className="text-[11px] text-muted-foreground">
                                                                    {batch.enrolled_students_count ?? 0} enrolled students
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                                                            Active
                                                        </Badge>
                                                    </div>

                                                    {/* Badges Grid */}
                                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                                        {batch.academic_term && (
                                                            <Badge variant="secondary" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                                                                <Calendar className="h-3 w-3" />
                                                                {batch.academic_term}
                                                            </Badge>
                                                        )}
                                                        {batch.section_name && (
                                                            <Badge variant="secondary" className="text-[10px] font-medium">
                                                                Section: {batch.section_name}
                                                            </Badge>
                                                        )}
                                                        {batch.attendance_setup_title && (
                                                            <Badge variant="secondary" className="text-[10px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20 flex items-center gap-1">
                                                                <Clock className="h-3 w-3" />
                                                                {batch.attendance_setup_title}
                                                            </Badge>
                                                        )}
                                                        {(batch.language_title || batch.language_name) && (
                                                            <Badge variant="secondary" className="text-[10px] font-medium bg-blue-500/10 text-blue-600 border-blue-500/20">
                                                                {batch.language_title || batch.language_name}
                                                            </Badge>
                                                        )}
                                                        {batch.seats_available != null && (
                                                            <Badge variant="secondary" className="text-[10px] font-medium bg-purple-500/10 text-purple-600 border-purple-500/20">
                                                                {batch.seats_available} Seats
                                                            </Badge>
                                                        )}
                                                        {batch.teaching_method && (
                                                            <Badge variant="secondary" className="text-[10px] font-medium bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                                                                {batch.teaching_method}
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    {/* Fee and Module Details */}
                                                    {Number(batch.price) > 0 && (
                                                        <div className="text-xs pt-1 space-y-1 bg-muted/30 p-2 rounded-lg border border-border/50">
                                                            <div className="flex items-center justify-between text-xs">
                                                                <span className="text-muted-foreground">Tuition Fee:</span>
                                                                <div className="flex items-center gap-1.5">
                                                                    {Number(batch.discount_percent) > 0 && (
                                                                        <span className="line-through text-muted-foreground text-[11px]">
                                                                            ₹{Number(batch.price).toLocaleString()}
                                                                        </span>
                                                                    )}
                                                                    <span className="font-bold text-foreground">
                                                                        ₹{finalPrice?.toLocaleString()}
                                                                    </span>
                                                                    {Number(batch.discount_percent) > 0 && (
                                                                        <span className="text-[10px] text-emerald-600 font-bold bg-emerald-500/10 px-1 rounded">
                                                                            {batch.discount_percent}% off
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {Number(batch.installments_count) > 1 && (
                                                                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                                                    <span>Installments:</span>
                                                                    <span>{batch.installments_count} parts</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Footer Action */}
                                                <div className="flex items-center justify-end pt-1 border-t border-border/40">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        onClick={() => handleRemoveBatch(batch.section_id || batch.id)}
                                                        className="h-7 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive px-2"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 mr-1" /> Remove Batch
                                                    </Button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* ============================================================ */}
            {/* MODAL: MANAGE SYLLABUS FOR PROGRAM */}
            {/* ============================================================ */}
            <Dialog open={syllabusModalOpen} onOpenChange={setSyllabusModalOpen}>
                <DialogContent className="sm:max-w-5xl w-[95vw] max-h-[92vh] flex flex-col p-6 overflow-hidden">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <BookMarked className="h-5 w-5 text-primary" />
                            <span>Curriculum & Syllabus &mdash; {syllabusTargetProgram?.title}</span>
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Define modules, units, chapters, learning topics, and estimated hours for this program's subjects.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-2 min-h-[350px]">
                        {loadingSyllabusDetail ? (
                            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground space-y-2">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <span className="text-xs font-semibold">Loading curriculum & subjects...</span>
                            </div>
                        ) : (
                            <ProgramSyllabusManager
                                subjectIds={syllabusSubjectIds}
                                subjectOptions={syllabusSubjectOptions}
                                categoryName={syllabusTargetProgram?.title || "Program"}
                                authHeader={authHeader}
                                syllabusNodes={standaloneSyllabusNodes}
                                onSyllabusNodesChange={setStandaloneSyllabusNodes}
                            />
                        )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSyllabusModalOpen(false)}
                            className="text-xs h-9 font-semibold"
                        >
                            Close
                        </Button>
                        <Button
                            type="button"
                            onClick={() => {
                                toast.success("Syllabus updated successfully!");
                                setSyllabusModalOpen(false);
                            }}
                            className="text-xs h-9 font-bold bg-primary text-primary-foreground"
                        >
                            Save Syllabus
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
