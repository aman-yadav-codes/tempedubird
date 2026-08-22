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

import { MultiSelect } from "@/components/ui/multi-select";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { ImagePreviewSlider } from "@/components/shared/image-preview-slider";
import { InstitutionProgram, MasterType } from "@/lib/types/institution";
import { slugify } from "@/lib/utils/slug";
import { cn } from "@/lib/utils";
import { MarketplaceSellOption } from "@/components/admin/marketplace-sell-option";

// ---------- Pending Media type ----------
interface PendingMedia {
    id: string;
    url: string;
    title: string;
    mediaType: "image" | "video";
    uploading?: boolean;
}

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

type FeeComponentForm = { title: string; amount: string; unit: string };

const FEE_UNIT_OPTIONS = [
    { value: "hour", label: "Hour" },
    { value: "day", label: "Day" },
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "year", label: "Year" },
] as const;

function normalizeFeeUnit(unit: string) {
    const normalized = unit.trim().toLowerCase();
    const unitMap: Record<string, string> = {
        hours: "hour",
        hour: "hour",
        days: "day",
        day: "day",
        weeks: "week",
        week: "week",
        months: "month",
        month: "month",
        years: "year",
        year: "year",
    };
    return unitMap[normalized] || "";
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
    const [categoryId, setCategoryId] = useState<string>("");
    const [categoryLabel, setCategoryLabel] = useState("");
    const [selectedLanguageIds, setSelectedLanguageIds] = useState<string[]>([]);
    const [selectedLanguages, setSelectedLanguages] = useState<{ id: number; name: string }[]>([]);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
    const [subjectOptionsCache, setSubjectOptionsCache] = useState<ProgramMultiOption[]>([]);
    const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
    const [sectionOptionsCache, setSectionOptionsCache] = useState<ProgramMultiOption[]>([]);

    // ---- Fee step fields ----
    const [tuitionFee, setTuitionFee] = useState("");
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

    const steps = [
        { label: "Basic", icon: BookOpen },
        { label: "Content", icon: Languages },
        { label: "Fees", icon: DollarSign },
        { label: "Media", icon: ImageIcon },
    ];

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
            if (useSidebarInstitution && activeInstitutionId) params.set("institutionId", String(activeInstitutionId));
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
    }, [accessToken, activeInstitutionId, pagination.pageIndex, pagination.pageSize, debouncedSearch, useSidebarInstitution, authHeader]);

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
        setFeeComponents([]);
        setCategoryId("");
        setCategoryLabel("");
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
    };

    const openCreateDialog = () => {
        setEditing(null);
        resetForm();
        setDialogOpen(true);
    };

    const openEditDialog = (item: InstitutionProgram) => {
        const requestId = editDetailRequestRef.current + 1;
        editDetailRequestRef.current = requestId;

        setEditing(item);
        setActiveStep(0);
        setProgramDetailLoading(true);
        setInstitutionId(item.institution_id);
        setInstitutionName((item as any).institution_name || "");
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

                setDurationValue(full.duration_value != null ? String(full.duration_value) : "");
                setDurationUnit(full.duration_unit || "");
                setSeatsAvailable(full.seats_available != null ? String(full.seats_available) : "");
                setTeachingMethod(full.teaching_method || "");
                setUniversityId(full.university_id || "");
                setUniversityName(full.university_name || (full.university_id ? `University ID: ${full.university_id}` : ""));
                const defaultFeeUnit = normalizeFeeUnit(String(full.duration_unit || "")) || "month";
                const savedFees = (full.fee_components || []).map((f: any) => ({
                    title: String(f.title || ""),
                    amount: String(f.amount ?? ""),
                    unit: normalizeFeeUnit(String(f.unit || f.fee_unit || "")) || defaultFeeUnit,
                }));
                const tuitionIndex = savedFees.findIndex((fee: FeeComponentForm) => {
                    const normalized = fee.title.trim().toLowerCase();
                    return normalized === "tuition fee" || normalized === "tuition" || normalized === "course fee";
                });
                if (tuitionIndex >= 0) {
                    setTuitionFee(savedFees[tuitionIndex].amount);
                    setFeeComponents(savedFees.filter((_: FeeComponentForm, index: number) => index !== tuitionIndex));
                } else {
                    setTuitionFee("");
                    setFeeComponents(savedFees);
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
    const handleAddFee = () => setFeeComponents((s) => [...s, { title: "", amount: "", unit: normalizeFeeUnit(durationUnit) || "month" }]);
    const handleRemoveFee = (i: number) => setFeeComponents((s) => s.filter((_, idx) => idx !== i));
    const handleFeeChange = (i: number, field: keyof FeeComponentForm, value: string) =>
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
            if (institutionBoardId) {
                params.set("boardId", String(institutionBoardId));
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
        [accessToken, categoryId, institutionBoardId]
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
        [accessToken]
    );

    // ---------- Build common payload ----------
    function buildPayload(extra: Record<string, any> = {}) {
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
            feeComponents: [
                ...(tuitionFee !== "" ? [{ title: "Tuition fee", amount: Number(tuitionFee), unit: normalizeFeeUnit(durationUnit) || null }] : []),
                ...feeComponents
                    .filter((f) => f.title.trim())
                    .map((f) => ({ title: f.title.trim(), amount: Number(f.amount || 0), unit: normalizeFeeUnit(f.unit) || null })),
            ],
        };
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
        setActiveStep(1);
        toast.error("Choose at least one subject");
        return false;
    }

    function validateBasicStepForNavigation() {
        if (programDetailLoading) {
            toast.info("Program details are still loading");
            return false;
        }
        if (!institutionId || !categoryId || !programTypeId || !title.trim()) {
            toast.error("Institution, Category, Program Type, and Title are required before navigating to other tabs");
            return false;
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
        if (!institutionId || !categoryId || !programTypeId || !title.trim()) {
            return toast.error("Institution, category, program type, and title are required");
        }
        if (!validateSubjectSelection()) return;
        if (!validateFeeStep()) return;
        setSubmitting(true);
        try {
            const payload = buildPayload({ institutionId: Number(institutionId) });
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
        if (!institutionId || !categoryId || !programTypeId || !title.trim()) {
            setActiveStep(0);
            return toast.error("Institution, category, program type, and title are required");
        }
        if (!validateSubjectSelection()) return;
        if (!validateFeeStep()) return;
        setSubmitting(true);
        try {
            const payload = buildPayload({ id: editing.id, institutionId: Number(institutionId) });
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
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
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
                                View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDialog(item)}>Edit</DropdownMenuItem>
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
                <div>
                    <Button onClick={openCreateDialog} className="w-full sm:w-auto">
                        <Plus className="mr-2 h-4 w-4" /> New Program
                    </Button>
                </div>
            </div>

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
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <BookOpen className="size-5" />
                            {editing ? "Edit Program" : "New Program"}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            {editing
                                ? "Update program particulars, category alignments, pricing parameters, and associated media assets."
                                : "Specify program catalog metadata, structural types, pricing schemas, and picture assets."}
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
                            <div className="space-y-4">
                                {/* Title */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Category</Label>
                                        <AsyncSearchPopover<any>
                                            value={categoryId}
                                            onChange={(v) => {
                                                setCategoryId(v);
                                                if (!v) {
                                                    setCategoryLabel("");
                                                    setTitle("");
                                                    setSlug("");
                                                    setSelectedSubjectIds([]);
                                                    setSubjectOptionsCache([]);
                                                    setSelectedSectionIds([]);
                                                    setSectionOptionsCache([]);
                                                }
                                            }}
                                            onSelectItem={(item) => {
                                                const nextTitle = item.name || "";
                                                setCategoryLabel(item.parent_name ? `${item.name} (${item.parent_name})` : item.name);
                                                setTitle(nextTitle);
                                                setSlug(slugify(nextTitle));
                                                setSelectedSubjectIds([]);
                                                setSubjectOptionsCache([]);
                                                setSelectedSectionIds([]);
                                                setSectionOptionsCache([]);
                                            }}
                                            selectedLabel={categoryLabel}
                                            placeholder="Choose a category..."
                                            searchPlaceholder="Search categories..."
                                            emptyText="No category found"
                                            fetcher={async (search, page) => {
                                                const res = await fetch(
                                                    `/api/admin/categories?page=${page}&limit=15&search=${encodeURIComponent(search)}`,
                                                    { headers: authHeader }
                                                );
                                                if (!res.ok) throw new Error("Failed to load categories");
                                                const json = await res.json();
                                                return { data: json.data || [], hasMore: page < json.pageCount };
                                            }}
                                            getValue={(item) => String(item.id)}
                                            getLabel={(item) => item.parent_name ? `${item.name} (${item.parent_name})` : item.name}
                                            renderItem={(c) => (
                                                <div className="flex flex-col py-1 text-left">
                                                    <span className="text-sm font-medium">{c.name}</span>
                                                    <span className="text-muted-foreground text-[10px]">under {c.parent_name || "root"}</span>
                                                </div>
                                            )}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Title</Label>
                                        <Input
                                            value={title}
                                            disabled
                                            placeholder="Select category to auto-fill title"
                                            className="bg-muted/40 border border-border"
                                        />
                                    </div>
                                </div>

                                {/* Institution + Program Type */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Institution</Label>
                                        {useSidebarInstitution ? (
                                            <Input
                                                value={institutionName || "Selected from sidebar"}
                                                disabled
                                                className="bg-muted/40 border border-border"
                                            />
                                        ) : (
                                            <AsyncSearchPopover<InstitutionOption>
                                                value={String(institutionId)}
                                                onChange={(value) => {
                                                    if (!value) applyInstitutionOptionToForm(null);
                                                    else setInstitutionId(value);
                                                }}
                                                onSelectItem={applyInstitutionOptionToForm}
                                                selectedLabel={institutionName || undefined}
                                                placeholder="Select institution..."
                                                searchPlaceholder="Search institutions..."
                                                emptyText="No institution found"
                                                fetcher={fetchInstitutions}
                                                getValue={(item) => String(item.id)}
                                                getLabel={getInstitutionOptionLabel}
                                                renderItem={(item) => (
                                                    <div className="flex flex-col py-1 text-left">
                                                        <span className="text-sm font-medium">{getInstitutionOptionLabel(item)}</span>
                                                        {item.slug && <span className="text-muted-foreground text-[10px]">{item.slug}</span>}
                                                    </div>
                                                )}
                                            />
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Program Type</Label>
                                        <AsyncSearchPopover
                                            value={String(programTypeId)}
                                            onChange={(v) => setProgramTypeId(v)}
                                            onSelectItem={(item: MasterType) => setProgramTypeName(item.name)}
                                            placeholder="Select program type"
                                            searchPlaceholder="Search types..."
                                            selectedLabel={programTypeName || undefined}
                                            fetcher={async (search, page) => {
                                                const res = await fetch(
                                                    `/api/program-types?search=${encodeURIComponent(search)}&page=${page}&limit=10`
                                                );
                                                if (!res.ok) throw new Error("Failed to fetch types");
                                                const json = await res.json();
                                                return { data: json.data, hasMore: page < json.pageCount };
                                            }}
                                            getValue={(it: MasterType) => String(it.id)}
                                            getLabel={(it: MasterType) => it.name}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Slug</Label>
                                    <Input
                                        value={slug}
                                        disabled
                                        placeholder="program-slug"
                                        className="bg-muted/40 border border-border"
                                    />
                                </div>

                                {/* Duration Value · Duration Unit · Seats Available · Teaching Method — equal 4 columns */}
                                {!isSubjectProgramType && (
                                    <>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Duration Value</Label>
                                        <Input
                                            type="number"
                                            min={0}
                                            value={durationValue}
                                            onChange={(e) => setDurationValue(e.target.value)}
                                            placeholder="e.g. 3"
                                            className="h-10 w-full bg-background/50 border border-border"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Duration Unit</Label>
                                        <Select value={durationUnit} onValueChange={setDurationUnit}>
                                            <SelectTrigger className="h-10 w-full bg-background/50 border border-border">
                                                <SelectValue placeholder="Select unit..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="hours">Hours</SelectItem>
                                                <SelectItem value="days">Days</SelectItem>
                                                <SelectItem value="weeks">Weeks</SelectItem>
                                                <SelectItem value="months">Months</SelectItem>
                                                <SelectItem value="years">Years</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Seats Available</Label>
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
                                                <SelectItem value="online">Online</SelectItem>
                                                <SelectItem value="classroom">Classroom / Offline</SelectItem>
                                                <SelectItem value="hybrid">Hybrid</SelectItem>
                                                <SelectItem value="distance">Distance</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Parent University (auto-filled, disabled) */}
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">
                                        Parent University
                                        <span className="ml-2 text-xs text-muted-foreground font-normal">(auto-filled from institution)</span>
                                    </Label>
                                    <Input
                                        value={universityName}
                                        disabled
                                        placeholder="Select an institution above to auto-fill"
                                        className="bg-muted/40 border border-border text-muted-foreground cursor-not-allowed"
                                    />
                                </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* -------- STEP 1: CONTENT -------- */}
                        {activeStep === 1 && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">About</Label>
                                    <Textarea
                                        value={about}
                                        onChange={(e) => setAbout(e.target.value)}
                                        placeholder="Brief summary regarding the curriculum parameters..."
                                        rows={4}
                                        className="bg-background/50 border border-border resize-none"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">
                                            Subjects <span className="text-primary">*</span>
                                        </Label>
                                        <MultiSelect
                                            options={[]}
                                            async
                                            value={selectedSubjectIds}
                                            onValueChange={setSelectedSubjectIds}
                                            selectedOptions={selectedSubjectOptions}
                                            includeSelectedOptionsInDropdown={false}
                                            placeholder={categoryId ? "Choose subjects..." : "Select category first"}
                                            fetcher={fetchSubjectOptions}
                                            searchable
                                            maxCount={4}
                                            disabled={!categoryId}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            Subjects are filtered by the selected category.
                                        </p>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Sections</Label>
                                        <MultiSelect
                                            options={[]}
                                            async
                                            value={selectedSectionIds}
                                            onValueChange={setSelectedSectionIds}
                                            selectedOptions={selectedSectionOptions}
                                            placeholder={categoryId ? "Choose sections..." : "Select category first"}
                                            fetcher={fetchSectionOptions}
                                            searchable
                                            maxCount={4}
                                            disabled={!categoryId}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* -------- STEP 2: FEES -------- */}
                        {activeStep === 2 && (
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Tuition Fee</Label>
                                    <div className="rounded-lg border bg-muted/20 p-3">
                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(220px,360px)] md:items-center">
                                            <div>
                                                <p className="font-medium">Tuition fee</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Unit is automatic from the selected duration unit.
                                                </p>
                                            </div>
                                            <div className="relative">
                                                <Input
                                                    type="number"
                                                    min={0}
                                                    placeholder="Amount"
                                                    value={tuitionFee}
                                                    onChange={(event) => setTuitionFee(event.target.value)}
                                                    className="h-10 pr-24"
                                                />
                                                <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm font-medium text-muted-foreground">
                                                    {feeDurationUnitLabel}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <Label className="text-sm font-medium">Other Fees</Label>
                                            <p className="text-xs text-muted-foreground">
                                                Add one-time fees like library, registration, material, or other charges.
                                            </p>
                                        </div>
                                        <Button onClick={handleAddFee} size="sm" variant="outline">
                                            <Plus className="mr-1 h-3.5 w-3.5" /> Add Row
                                        </Button>
                                    </div>
                                    <div className="max-h-75 space-y-2 overflow-y-auto pr-1">
                                        {feeComponents.map((f, i) => (
                                            <div key={i} className="grid grid-cols-12 items-center gap-2 rounded-lg border bg-muted/20 p-2">
                                                <div className="col-span-5">
                                                    <Input
                                                        placeholder="Fee name (e.g. Library fee)"
                                                        value={f.title}
                                                        onChange={(e) => handleFeeChange(i, "title", e.target.value)}
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div className="col-span-3">
                                                    <Input
                                                        type="number"
                                                        placeholder="Amount"
                                                        value={f.amount}
                                                        onChange={(e) => handleFeeChange(i, "amount", e.target.value)}
                                                        className="h-9"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <Select value={f.unit} onValueChange={(value) => handleFeeChange(i, "unit", value)}>
                                                        <SelectTrigger className="h-9 w-full bg-background/50">
                                                            <SelectValue placeholder="Unit" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {FEE_UNIT_OPTIONS.map((option) => (
                                                                <SelectItem key={option.value} value={option.value}>
                                                                    / {option.value}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="col-span-2 text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => handleRemoveFee(i)} className="h-9 text-destructive hover:bg-destructive/10">
                                                        Remove
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                        {feeComponents.length === 0 && (
                                            <div className="rounded-lg border border-dashed py-8 text-center text-sm text-muted-foreground">
                                                No other fees added yet.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Marketplace Option */}
                                <MarketplaceSellOption
                                    sellOnMarketplace={sellOnMarketplace}
                                    onSellOnMarketplaceChange={setSellOnMarketplace}
                                    marketplacePrice={marketplacePrice}
                                    onMarketplacePriceChange={(val) => setMarketplacePrice(Number(val))}
                                    title="Sell on Marketplace"
                                    description="List this course/program on the EduBird national marketplace for students to discover and enroll."
                                    priceLabel="Marketplace Enrollment Price (₹)"
                                    pricePlaceholder="Enter 0 for free or enrollment fee amount"
                                />
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
                                        if (activeStep === 1 && !validateSubjectSelection()) return;
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
        </div>
    );
}
