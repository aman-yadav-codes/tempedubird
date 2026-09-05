"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import {
    Plus,
    Loader2,
    Edit2,
    Trash2,
    Building2,
    Phone,
    Mail,
    Globe,
    Info,
    CheckCircle2,
    ArrowLeft,
    ArrowRight,
    MoreHorizontal,
    MapPin,
    GraduationCap,
    RefreshCw,
    Power,
    PowerOff,
    Sparkles,
    UserCheck,
    Target,
    Video,
    Film,
    Play,
    Link as LinkIcon,
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

import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { DocumentFileUpload, type UploadedDocumentFile } from "@/components/shared/document-file-upload";
import { GoogleLocationPicker, PickedLocation } from "@/components/shared/google-location-picker";
import { MasterType, InstitutionProfile, InstitutionBranch, InstitutionCourse } from "@/lib/types/institution";
import { InstitutionBranchManager } from "@/components/admin/institutions/institution-branch-manager";
import { InstitutionAgreementDialog } from "@/components/admin/institutions/institution-agreement-dialog";
import { InstitutionCourseManager } from "@/components/admin/institutions/institution-course-manager";
import { useProgressiveSave } from "@/hooks/use-progressive-save";
import { ProgressiveSaveIndicator } from "@/components/shared/progressive-save-indicator";
import { cn } from "@/lib/utils";

type InstitutionMedia = {
    id: number;
    institution_id: number;
    media_type: string;
    url: string;
    title?: string | null;
    sort_order?: number | null;
};

type InstitutionUploadFile = UploadedDocumentFile & {
    mediaId?: number;
};

function toSlug(text: string) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
}

function extractScalarText(value: unknown) {
    if (Array.isArray(value)) {
        for (const item of value) {
            const text = extractScalarText(item);
            if (text) return text;
        }
        return "";
    }
    if (value === null || value === undefined) return "";
    return String(value).trim();
}

function normalizePhoneTo10Digits(value: unknown) {
    const digits = extractScalarText(value).replace(/\D/g, "");
    if (!digits) return "";
    return digits.length >= 10 ? digits.slice(-10) : digits;
}

async function copyToClipboard(value: string, label: string) {
    const text = value.trim();
    if (!text || text === "-") return;

    try {
        await navigator.clipboard.writeText(text);
        toast.success(`${label} copied`);
    } catch {
        toast.error(`Failed to copy ${label.toLowerCase()}`);
    }
}

function normalizeInstitutionAiContent(data: Record<string, unknown>) {
    const normalized: Record<string, unknown> = { ...data };

    const aboutValue = extractScalarText(data.about ?? data.description ?? data.summary);
    if (aboutValue) normalized.about = aboutValue;

    const historyValue = extractScalarText(data.history ?? data.institution_history);
    if (historyValue) normalized.history = historyValue;

    const highlightsValue = data.key_highlights ?? data.highlights;
    if (Array.isArray(highlightsValue)) {
        normalized.key_highlights = highlightsValue.map((item) => extractScalarText(item)).filter(Boolean);
    }

    const phoneValue = normalizePhoneTo10Digits(data.phone ?? data.contact_phone ?? data.contact_number);
    if (phoneValue) normalized.phone = phoneValue;

    const emailValue = extractScalarText(data.email ?? data.contact_email);
    if (emailValue) normalized.email = emailValue;

    const websiteValue = extractScalarText(data.website_url ?? data.website ?? data.url);
    if (websiteValue) normalized.website_url = websiteValue;

    const yearValue = extractScalarText(data.establish_year ?? data.established_year ?? data.year_established);
    if (yearValue) normalized.establish_year = yearValue;

    return normalized;
}

function buildInstitutionAboutText(data: Record<string, unknown>, details: {
    name: string;
    institutionTypeName: string;
    location: string;
    establishedYear: string;
    parentUniversityName: string;
}) {
    const aboutValue = extractScalarText(data.about ?? data.description ?? data.summary);
    const historyValue = extractScalarText(data.history ?? data.institution_history);
    const highlightsValue = Array.isArray(data.key_highlights ?? data.highlights)
        ? (data.key_highlights ?? data.highlights) as unknown[]
        : [];
    const highlightText = highlightsValue.map((item) => extractScalarText(item)).filter(Boolean);

    const firstParagraph = aboutValue || [
        `${details.name} is a ${details.institutionTypeName || "recognized institution"}${details.location ? ` located in ${details.location}` : ""}.`,
        `It serves students through a structured academic environment focused on learning outcomes, institutional quality, and long-term student growth.`,
    ].join(" ");

    const secondParagraphParts: string[] = [];
    if (historyValue) {
        secondParagraphParts.push(historyValue);
    }
    if (details.establishedYear) {
        secondParagraphParts.push(`The institution was established in ${details.establishedYear}.`);
    }
    if (highlightText.length) {
        secondParagraphParts.push(`Key strengths include ${highlightText.join(", ")}.`);
    }
    if (details.parentUniversityName) {
        secondParagraphParts.push(`It is associated with ${details.parentUniversityName}.`);
    }
    if (details.location) {
        secondParagraphParts.push(`Its campus presence in ${details.location} supports accessibility and academic continuity.`);
    }

    const secondParagraph = secondParagraphParts.join(" ");
    return secondParagraph ? `${firstParagraph.trim()}\n\n${secondParagraph.trim()}` : firstParagraph.trim();
}

function formatAiFieldLabel(key: string) {
    return key
        .replace(/[_-]+/g, " ")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/^./, (char) => char.toUpperCase());
}

function formatAiFieldValue(value: unknown): string {
    if (value === null || value === undefined) return "-";
    if (Array.isArray(value)) {
        return value
            .map((item) => formatAiFieldValue(item))
            .filter((item) => item !== "-")
            .join("\n");
    }
    if (typeof value === "object") {
        return JSON.stringify(value, null, 2);
    }
    const text = String(value).trim();
    return text || "-";
}

function toBulletItems(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .flatMap((item) => toBulletItems(item))
            .map((item) => item.trim())
            .filter(Boolean);
    }

    if (typeof value === "string") {
        return value
            .split(/\r?\n+/)
            .map((item) => item.replace(/^[-•*\d.)\s]+/, "").trim())
            .filter(Boolean);
    }

    const text = extractScalarText(value);
    return text ? [text] : [];
}

function getInstitutionAiSections(source?: Record<string, unknown> | null) {
    if (!source || typeof source !== "object" || Array.isArray(source)) return [];

    const pickText = (keys: string[]) => {
        for (const key of keys) {
            const value = source[key];
            const text = extractScalarText(value);
            if (text) return text;
        }
        return "";
    };

    const pickArray = (keys: string[]) => {
        for (const key of keys) {
            const value = source[key];
            const items = toBulletItems(value);
            if (items.length) return items;
        }
        return [] as string[];
    };

    const sections: Array<{ key: string; label: string; value: string | string[] }> = [];

    const aboutText = pickText(["about", "description", "summary"]);
    if (aboutText) sections.push({ key: "about", label: "About", value: aboutText });

    const historyText = pickText(["history", "institution_history"]);
    if (historyText) sections.push({ key: "history", label: "History", value: historyText });

    const studentLifeItems = pickArray(["student_life", "studentLife", "campus_life", "campusLife"]);
    if (studentLifeItems.length) sections.push({ key: "student_life", label: "Student Life", value: studentLifeItems });

    const infrastructureItems = pickArray(["infrastructure", "infrastructure_details", "facilities", "campus_infrastructure"]);
    if (infrastructureItems.length) sections.push({ key: "infrastructure", label: "Infrastructure", value: infrastructureItems });

    const highlights = pickArray(["key_highlights", "highlights"]);
    if (highlights.length) sections.push({ key: "key_highlights", label: "Key Highlights", value: highlights });

    const campusOverviewItems = pickArray(["campus_overview", "campusOverview", "campus_overview_text", "campus_profile"]);
    if (campusOverviewItems.length) sections.push({ key: "campus_overview", label: "Campus Overview", value: campusOverviewItems });

    const recognitionItems = pickArray([
        "recognition_affiliations",
        "recognition_and_affiliations",
        "affiliations",
        "recognition",
        "accreditation",
        "accreditations",
    ]);
    if (recognitionItems.length) sections.push({ key: "recognition_affiliations", label: "Recognition & Affiliations", value: recognitionItems });

    const manualAbout = pickText(["manual_about", "about_manual"]);
    if (manualAbout) sections.push({ key: "manual_about", label: "Manual About", value: manualAbout });

    return sections;
}

function pickFirstFieldValue(source: Record<string, unknown>, keys: string[]) {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(source, key) && source[key] !== null && source[key] !== undefined) {
            return source[key];
        }
    }
    return undefined;
}

function buildColumns(
    setDeleteTarget: (t: InstitutionProfile | null) => void,
    setEditing: (t: InstitutionProfile | null) => void,
    handleToggle: (t: InstitutionProfile) => Promise<void>,
    activeLoadingId: number | null,
    setViewTarget: (t: InstitutionProfile | null) => void,
    setAgreementTarget: (t: InstitutionProfile | null) => void
): ColumnDef<InstitutionProfile>[] {
    return [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={
                        table.getIsAllPageRowsSelected()
                            ? true
                            : table.getIsSomePageRowsSelected()
                                ? "indeterminate"
                                : false
                    }
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
            header: "Institution Name",
            cell: ({ row }) => (
                <div className="font-medium text-foreground">
                    {row.original.name || row.original.organization_name || row.original.slug}
                </div>
            ),
        },
        {
            accessorKey: "type_name",
            header: "Type",
            cell: ({ row }) => (
                <div className="text-sm text-muted-foreground truncate">
                    {row.original.type_name} {row.original.subtype_name ? `(${row.original.subtype_name})` : ""}
                </div>
            ),
        },
        {
            accessorKey: "slug",
            header: "Slug",
            cell: ({ row }) => (
                <div className="font-mono text-xs text-muted-foreground truncate" style={{ maxWidth: 150 }}>
                    {row.getValue("slug")}
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
            accessorKey: "created_at",
            header: "Created",
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {new Date(row.getValue("created_at")).toLocaleDateString("en-US", {
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
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="h-8 w-8 p-0 hover:bg-accent"
                            >
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setViewTarget(item)}>
                                View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditing(item)}>
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setAgreementTarget(item)}>
                                Agreement
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => handleToggle(item)}
                                disabled={activeLoadingId === item.id}
                            >
                                {activeLoadingId === item.id ? (
                                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                                ) : null}
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
}

export default function InstitutionsAdminPage() {
    const { isReady } = useAdminGuard();
    const { accessToken, user } = useAuthStore();

    const [items, setItems] = useState<InstitutionProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageCount, setPageCount] = useState(-1);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [agreementTarget, setAgreementTarget] = useState<InstitutionProfile | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [name, setName] = useState("");
    const [institutionTypeId, setInstitutionTypeId] = useState<number | string>("");
    const [institutionTypeName, setInstitutionTypeName] = useState("");
    const [institutionSubtypeId, setInstitutionSubtypeId] = useState<number | string>("");
    const [slug, setSlug] = useState("");
    const [establishedYear, setEstablishedYear] = useState<number | "">("");
    const [about, setAbout] = useState("");
    const [mission, setMission] = useState("");
    const [vision, setVision] = useState("");
    const [goal, setGoal] = useState("");
    const [aiContent, setAiContent] = useState<Record<string, unknown> | null>(null);
    const [generatingAi, setGeneratingAi] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [imageUrl, setImageUrl] = useState("");
    const [logoFile, setLogoFile] = useState<InstitutionUploadFile | null>(null);
    const [mediaList, setMediaList] = useState<InstitutionMedia[]>([]);
    const [galleryFiles, setGalleryFiles] = useState<InstitutionUploadFile[]>([]);
    const [videoFiles, setVideoFiles] = useState<InstitutionUploadFile[]>([]);
    const [videoUrlInput, setVideoUrlInput] = useState("");
    const [videoTitleInput, setVideoTitleInput] = useState("");
    const [mediaLoading, setMediaLoading] = useState(false);
    const [parentUniversityId, setParentUniversityId] = useState<number | string>("");
    const [parentUniversityName, setParentUniversityName] = useState("");
    const [boardId, setBoardId] = useState<number | string>("");
    const [boardName, setBoardName] = useState("");
    const [founderName, setFounderName] = useState("");
    const [founderTitle, setFounderTitle] = useState("");
    const [founderImageUrl, setFounderImageUrl] = useState("");
    const [founderAbout, setFounderAbout] = useState("");
    const [founderFiles, setFounderFiles] = useState<UploadedDocumentFile[]>([]);

    const [deleteTarget, setDeleteTarget] = useState<InstitutionProfile | null>(null);
    const [editing, setEditing] = useState<InstitutionProfile | null>(null);
    const [activeLoadingId, setActiveLoadingId] = useState<number | null>(null);
    const [activeStep, setActiveStep] = useState(0);
    const [stagedBranches, setStagedBranches] = useState<InstitutionBranch[]>([]);
    const [stagedCourses, setStagedCourses] = useState<InstitutionCourse[]>([]);
    const [isMarketplaceEnabled, setIsMarketplaceEnabled] = useState(true);

    const institutionFormState = useMemo(() => ({
        name,
        slug,
        institutionTypeId,
        institutionSubtypeId,
        establishedYear,
        about,
        mission,
        vision,
        goal,
        founderName,
        founderTitle,
        founderAbout,
        boardId,
        parentUniversityId,
        isMarketplaceEnabled,
    }), [name, slug, institutionTypeId, institutionSubtypeId, establishedYear, about, mission, vision, goal, founderName, founderTitle, founderAbout, boardId, parentUniversityId, isMarketplaceEnabled]);

    const { saveStatus: institutionSaveStatus, clearDraft: clearInstitutionDraft } = useProgressiveSave({
        formKey: `institution_profile:${editing?.id || "new"}`,
        formState: institutionFormState,
        enabled: dialogOpen,
    });

    const [viewing, setViewing] = useState<InstitutionProfile | null>(null);
    const [viewOpen, setViewOpen] = useState(false);

    const parsedLoc = useMemo(() => {
        if (!viewing || !viewing.location_name) return null;
        const fullAddress = viewing.location_name;
        const parts = fullAddress.split(",").map(p => p.trim());
        let country = "-";
        let state = "-";
        let city = "-";
        let pincode = "-";

        if (parts.length > 0) {
            country = parts[parts.length - 1];
        }
        if (parts.length > 1) {
            const statePart = parts[parts.length - 2];
            const pincodeMatch = statePart.match(/\b\d{6}\b/);
            if (pincodeMatch) {
                pincode = pincodeMatch[0];
                state = statePart.replace(pincode, "").trim();
            } else {
                state = statePart;
            }
        }
        if (parts.length > 2) {
            city = parts[parts.length - 3];
        }
        return { country, state, city, pincode };
    }, [viewing]);

    const viewingAiSections = useMemo(() => getInstitutionAiSections(viewing?.ai_content), [viewing?.ai_content]);

    // Detect college type to show parent university field
    const isCollegeType = institutionTypeName.toLowerCase().includes("college");
    const normalizedInstitutionType = institutionTypeName.toLowerCase();
    const showBoardField =
        normalizedInstitutionType.includes("school") &&
        !normalizedInstitutionType.includes("coaching");

    const steps = [
        { label: "Basic", icon: Building2 },
        { label: "Mission, Vision & Goal", icon: Target },
        { label: "Contact & Branches", icon: MapPin },
        { label: "Founder", icon: UserCheck },
    ];

    const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

    const logoFiles = useMemo<InstitutionUploadFile[]>(() => {
        const trimmedUrl = imageUrl.trim();
        if (!trimmedUrl) return [];
        if (logoFile?.url === trimmedUrl) return [logoFile];
        const existingLogo = mediaList.find((media) => media.media_type === "logo" && media.url === trimmedUrl);
        return [{
            url: trimmedUrl,
            publicId: "",
            resourceType: "image",
            fileType: "image/*",
            name: existingLogo?.title || "Institution logo",
            mediaId: existingLogo?.id,
        }];
    }, [imageUrl, logoFile, mediaList]);

    function mediaToUploadFile(media: InstitutionMedia): InstitutionUploadFile {
        return {
            url: media.url,
            publicId: "",
            resourceType: "image",
            fileType: "image/*",
            name: media.title || media.media_type,
            mediaId: media.id,
        };
    }

    async function postInstitutionMedia(
        institutionId: number,
        mediaType: "logo" | "image" | "video",
        url: string,
        title: string,
        sortOrder = 0,
    ) {
        const res = await fetch(`/api/admin/institutions/institution-media`, {
            method: "POST",
            headers: { ...authHeader, "Content-Type": "application/json" },
            body: JSON.stringify({
                institutionId,
                mediaType,
                url,
                title,
                sortOrder,
            }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to save institution media");
        return json.data as InstitutionMedia;
    }

    async function syncInstitutionMedia(institutionId: number) {
        const existingLogo = mediaList.find((media) => media.media_type === "logo");
        const trimmedLogoUrl = imageUrl.trim();

        if (existingLogo?.url !== trimmedLogoUrl) {
            if (existingLogo) {
                await deleteInstitutionMedia(existingLogo.id, { silent: true, refresh: false });
            }
            if (trimmedLogoUrl) {
                await postInstitutionMedia(institutionId, "logo", trimmedLogoUrl, "Logo", 0);
            }
        }

        const newGalleryFiles = galleryFiles.filter((file) => !file.mediaId);
        await Promise.all(
            newGalleryFiles.map((file, index) =>
                postInstitutionMedia(
                    institutionId,
                    "image",
                    file.url,
                    file.name || `Gallery image ${index + 1}`,
                    index + 1,
                )
            )
        );

        const newVideoFiles = videoFiles.filter((file) => !file.mediaId);
        await Promise.all(
            newVideoFiles.map((file, index) =>
                postInstitutionMedia(
                    institutionId,
                    "video",
                    file.url,
                    file.name || `Gallery video ${index + 1}`,
                    index + 100,
                )
            )
        );
    }

    const fetchParentUniversityOptions = useCallback(async (search: string, page: number) => {
        const res = await fetch(
            `/api/admin/institutions/profiles?search=${encodeURIComponent(search)}&page=${page}&limit=20&typeSearch=university&isActive=true&parentUniversityLookup=1`,
            { headers: authHeader }
        );
        if (!res.ok) throw new Error("Failed to fetch universities");
        const json = await res.json();
        return {
            data: json.data as InstitutionProfile[],
            hasMore: page < Number(json.pageCount ?? 0),
        };
    }, [authHeader]);

    const buildInstitutionAiContext = useCallback(() => {
        return JSON.stringify(
            {
                name,
                institutionType: institutionTypeName || "",
                institutionSubtype: editing?.subtype_name || "",
                established_year: establishedYear || "",
                about,
                mission,
                vision,
                goal,
                ai_content: aiContent,
                parent_university: parentUniversityName || editing?.parent_university_name || "",
                output_requirements: {
                    establish_year: "Return a 4-digit year",
                    key_highlights: "Return an array of strings",
                },
            },
            null,
            2
        );
    }, [about, aiContent, editing?.parent_university_name, editing?.subtype_name, establishedYear, goal, institutionTypeName, mission, name, parentUniversityName, vision]);

    const applyInstitutionAiResponse = useCallback((data: Record<string, unknown>) => {
        const normalized = normalizeInstitutionAiContent(data);
        setAiContent(normalized);

        const combinedAbout = buildInstitutionAboutText(normalized, {
            name: name.trim() || editing?.name || editing?.organization_name || "This institution",
            institutionTypeName: institutionTypeName.trim(),
            location: "",
            establishedYear: String(establishedYear || normalized.establish_year || normalized.established_year || "").trim(),
            parentUniversityName: parentUniversityName || editing?.parent_university_name || "",
        });

        setAbout(combinedAbout);

        const establishedYearValue = extractScalarText(normalized.establish_year ?? normalized.established_year ?? normalized.year_established);

        if (establishedYearValue !== undefined && establishedYearValue !== null && String(establishedYearValue).trim()) {
            const year = Number(establishedYearValue);
            if (!Number.isNaN(year)) {
                setEstablishedYear(year);
            }
        }
    }, [editing?.name, editing?.organization_name, editing?.parent_university_name, establishedYear, institutionTypeName, name, parentUniversityName]);

    const aiGeneratedAbout = useMemo(() => {
        if (!aiContent) return "";
        return buildInstitutionAboutText(aiContent, {
            name: name.trim() || editing?.name || editing?.organization_name || "This institution",
            institutionTypeName: institutionTypeName.trim(),
            location: "",
            establishedYear: String(establishedYear || aiContent.establish_year || aiContent.established_year || "").trim(),
            parentUniversityName: parentUniversityName || editing?.parent_university_name || "",
        });
    }, [aiContent, editing?.name, editing?.organization_name, editing?.parent_university_name, institutionTypeName, name, parentUniversityName, establishedYear]);

    const isManualAbout = useMemo(() => {
        if (!aiGeneratedAbout) return Boolean(about.trim());
        return about.trim() !== aiGeneratedAbout.trim();
    }, [about, aiGeneratedAbout]);

    const generateInstitutionDetails = useCallback(async () => {
        if (!name.trim()) {
            toast.error("Enter the institution name before generating AI content");
            return;
        }

        setGeneratingAi(true);
        try {
            const payload = {
                contentTypeSlug: "institution-details",
                institutionId: editing?.id ?? undefined,
                institutionName: editing ? undefined : name.trim(),
                inputContext: buildInstitutionAiContext(),
            };

            const res = await fetch("/api/admin/ai/generate", {
                method: "POST",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();

            if (!res.ok) {
                toast.error(json.error ?? "Failed to generate institution details");
                return;
            }

            applyInstitutionAiResponse((json.data ?? {}) as Record<string, unknown>);
            toast.success("Institution details generated");
        } catch {
            toast.error("Network error");
        } finally {
            setGeneratingAi(false);
        }
    }, [applyInstitutionAiResponse, authHeader, buildInstitutionAiContext, editing?.id, name]);

    const fetchItems = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
            const res = await fetch(
                `/api/admin/institutions/profiles?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}&search=${encodeURIComponent(
                    debouncedSearch
                )}`,
                { headers: authHeader }
            );
            const json = await res.json();
            if (res.ok) {
                setItems(json.data || []);
                setPageCount(json.pageCount);
            } else {
                toast.error(json.error ?? "Failed to load institutions");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    }, [accessToken, pagination.pageIndex, pagination.pageSize, debouncedSearch]);

    useEffect(() => {
        if (!isReady) return;
        const timeout = window.setTimeout(() => void fetchItems(), 0);
        return () => window.clearTimeout(timeout);
    }, [isReady, fetchItems]);

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
        }, 300);
        return () => clearTimeout(t);
    }, [searchTerm]);

    useEffect(() => {
        if (!editing) return;
        const timeout = window.setTimeout(() => {
            setActiveStep(0);
            setName(editing.name || editing.organization_name || "");
            setInstitutionTypeId(editing.institution_type_id);
            setInstitutionTypeName(editing.type_name || "");
            setInstitutionSubtypeId(editing.institution_subtype_id ?? "");
            setSlug(editing.slug ?? "");
            setEstablishedYear(editing.established_year ?? "");
            setAbout(editing.about ?? "");
            setMission(editing.mission ?? "");
            setVision(editing.vision ?? "");
            setGoal(editing.goal ?? "");
            setAiContent(editing.ai_content ?? null);
            setImageUrl("");
            setLogoFile(null);
            setGalleryFiles([]);
            setParentUniversityId(editing.parent_university_id ?? "");
            setParentUniversityName("");
            setBoardId(editing.board_id ?? "");
            setBoardName(editing.board_name ?? "");
            setFounderName(editing.founder_name ?? "");
            setFounderTitle(editing.founder_title ?? "");
            setFounderImageUrl(editing.founder_image_url ?? "");
            setFounderAbout(editing.founder_about ?? "");
            setIsMarketplaceEnabled(editing.is_marketplace_enabled !== false);
            setFounderFiles(editing.founder_image_url ? [{
                url: editing.founder_image_url,
                publicId: "",
                resourceType: "image",
                fileType: "image/*",
                name: "Founder photo",
            }] : []);
            setDialogOpen(true);
            fetchMedia(editing.id);
        }, 0);
        return () => window.clearTimeout(timeout);
    }, [editing]);

    const resetForm = () => {
        setName("");
        setInstitutionTypeId("");
        setInstitutionTypeName("");
        setInstitutionSubtypeId("");
        setSlug("");
        setEstablishedYear("");
        setAbout("");
        setMission("");
        setVision("");
        setGoal("");
        setAiContent(null);
        setImageUrl("");
        setLogoFile(null);
        setMediaList([]);
        setGalleryFiles([]);
        setParentUniversityId("");
        setParentUniversityName("");
        setBoardId("");
        setBoardName("");
        setFounderName("");
        setFounderTitle("");
        setFounderImageUrl("");
        setFounderAbout("");
        setFounderFiles([]);
        setStagedBranches([]);
        setStagedCourses([]);
        setIsMarketplaceEnabled(true);
        setActiveStep(0);
    };

    const openCreateDialog = () => {
        setEditing(null);
        resetForm();
        setDialogOpen(true);
    };

    async function fetchMedia(institutionId: number) {
        setMediaLoading(true);
        try {
            const res = await fetch(`/api/admin/institutions/institution-media?institutionId=${institutionId}`, {
                headers: authHeader,
            });
            const json = await res.json();
            if (res.ok) {
                const media = (json.data || []) as InstitutionMedia[];
                setMediaList(media);
                const logo = media.find((item) => item.media_type === "logo");
                setImageUrl(logo?.url || "");
                setLogoFile(logo ? mediaToUploadFile(logo) : null);
                setGalleryFiles(
                    media
                        .filter((item) => item.media_type === "image" || item.media_type === "gallery")
                        .slice(0, 20)
                        .map(mediaToUploadFile)
                );
                setVideoFiles(
                    media
                        .filter((item) => item.media_type === "video")
                        .slice(0, 20)
                        .map(mediaToUploadFile)
                );
            }
        } catch (err) {
            console.error(err);
        } finally {
            setMediaLoading(false);
        }
    }

    async function deleteInstitutionMedia(
        id: number,
        options: { silent?: boolean; refresh?: boolean } = {},
    ) {
        try {
            const res = await fetch(`/api/admin/institutions/institution-media/${id}`, {
                method: "DELETE",
                headers: authHeader,
            });
            if (res.ok) {
                if (!options.silent) toast.success("Removed");
                setMediaList((current) => current.filter((media) => media.id !== id));
                setGalleryFiles((current) => current.filter((file) => file.mediaId !== id));
                if (options.refresh !== false && editing) await fetchMedia(editing.id);
            } else {
                const json = await res.json();
                toast.error(json.error ?? "Failed to remove");
            }
        } catch {
            toast.error("Network error");
        }
    }

    function handleLogoFilesChange(nextFiles: UploadedDocumentFile[]) {
        const nextLogo = nextFiles[0] as InstitutionUploadFile | undefined;
        const existingLogo = mediaList.find((media) => media.media_type === "logo");
        if (!nextLogo && existingLogo && imageUrl === existingLogo.url) {
            void deleteInstitutionMedia(existingLogo.id, { refresh: false });
        }
        setLogoFile(nextLogo ?? null);
        setImageUrl(nextLogo?.url || "");
    }

    function handleGalleryFilesChange(nextFiles: UploadedDocumentFile[]) {
        const next = nextFiles.slice(0, 20) as InstitutionUploadFile[];
        const nextMediaIds = new Set(next.map((file) => file.mediaId).filter(Boolean));
        const removedExisting = galleryFiles.filter((file) => file.mediaId && !nextMediaIds.has(file.mediaId));
        removedExisting.forEach((file) => {
            if (file.mediaId) void deleteInstitutionMedia(file.mediaId, { refresh: false });
        });
        setGalleryFiles(next);
    }

    function handleVideoFilesChange(nextFiles: UploadedDocumentFile[]) {
        const next = nextFiles.slice(0, 20) as InstitutionUploadFile[];
        const nextMediaIds = new Set(next.map((file) => file.mediaId).filter(Boolean));
        const removedExisting = videoFiles.filter((file) => file.mediaId && !nextMediaIds.has(file.mediaId));
        removedExisting.forEach((file) => {
            if (file.mediaId) void deleteInstitutionMedia(file.mediaId, { refresh: false });
        });
        setVideoFiles(next);
    }

    async function handleAddVideoLink() {
        const url = videoUrlInput.trim();
        if (!url) return toast.error("Enter a valid video URL");
        const title = videoTitleInput.trim() || "Gallery Video";

        if (editing?.id) {
            try {
                const created = await postInstitutionMedia(editing.id, "video", url, title, 100);
                setVideoFiles((prev) => [...prev, mediaToUploadFile(created)]);
                toast.success("Video added to gallery");
            } catch {
                toast.error("Failed to add video");
            }
        } else {
            setVideoFiles((prev) => [
                ...prev,
                {
                    url,
                    publicId: "",
                    resourceType: "video",
                    fileType: "video/*",
                    name: title,
                },
            ]);
            toast.success("Video added");
        }
        setVideoUrlInput("");
        setVideoTitleInput("");
    }

    const handleCreate = async () => {
        if (!name || !institutionTypeId) return toast.error("Name and type are required");
        setSubmitting(true);
        try {
            const payload = {
                name: name,
                institutionTypeId: Number(institutionTypeId),
                institutionSubtypeId: institutionSubtypeId ? Number(institutionSubtypeId) : null,
                slug: slug || toSlug(name),
                establishedYear: establishedYear || null,
                about: isManualAbout ? about || null : null,
                mission: mission || null,
                vision: vision || null,
                goal: goal || null,
                founderName: founderName || null,
                founderTitle: founderTitle || null,
                founderImageUrl: founderImageUrl || null,
                founderAbout: founderAbout || null,
                aiContent: aiContent,
                parentUniversityId: parentUniversityId ? Number(parentUniversityId) : null,
                boardId: showBoardField && boardId ? Number(boardId) : null,
                isMarketplaceEnabled,
                createdBy: null,
            };

            const res = await fetch(`/api/admin/institutions/profiles`, {
                method: "POST",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (res.ok) {
                toast.success("Created");
                const created = json.data;
                await syncInstitutionMedia(created.id);
                if (stagedBranches.length > 0) {
                    for (const branch of stagedBranches) {
                        try {
                            await fetch("/api/admin/institutions/branches", {
                                method: "POST",
                                headers: { ...authHeader, "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    institutionId: created.id,
                                    branchName: branch.branch_name,
                                    address: branch.address,
                                    city: branch.city,
                                    state: branch.state,
                                    pincode: branch.pincode,
                                    workingHours: branch.working_hours,
                                    phones: branch.phones,
                                    emails: branch.emails,
                                    isPrimary: branch.is_primary,
                                }),
                            });
                        } catch (branchErr) {
                            console.error("Error saving staged branch:", branchErr);
                        }
                    }
                }
                if (stagedCourses.length > 0) {
                    for (const course of stagedCourses) {
                        try {
                            await fetch("/api/admin/institutions/courses", {
                                method: "POST",
                                headers: { ...authHeader, "Content-Type": "application/json" },
                                body: JSON.stringify({
                                    institutionId: created.id,
                                    courseName: course.course_name,
                                    stream: course.stream,
                                    boardOrUniversity: course.board_or_university,
                                    duration: course.duration,
                                    price: course.price,
                                    feeAmount: course.fee_amount,
                                    eligibility: course.eligibility,
                                    description: course.description,
                                    seatsAvailable: course.seats_available,
                                    sortOrder: course.sort_order,
                                }),
                            });
                        } catch (courseErr) {
                            console.error("Error saving staged course:", courseErr);
                        }
                    }
                }
                setImageUrl("");
                setGalleryFiles([]);
                setStagedBranches([]);
                setStagedCourses([]);
                setDialogOpen(false);
                setEditing(null);
                await fetchItems();
            } else {
                toast.error(json.error ?? "Failed to create");
            }
        } catch (err) {
            toast.error("Network error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdate = async () => {
        if (!editing) return;
        setSubmitting(true);
        try {
            const payload = {
                id: editing.id,
                name: name,
                institutionTypeId: Number(institutionTypeId),
                institutionSubtypeId: institutionSubtypeId ? Number(institutionSubtypeId) : null,
                slug: slug || toSlug(name),
                establishedYear: establishedYear || null,
                about: isManualAbout ? about || null : null,
                mission: mission || null,
                vision: vision || null,
                goal: goal || null,
                founderName: founderName || null,
                founderTitle: founderTitle || null,
                founderImageUrl: founderImageUrl || null,
                founderAbout: founderAbout || null,
                aiContent: aiContent,
                parentUniversityId: parentUniversityId ? Number(parentUniversityId) : null,
                boardId: showBoardField && boardId ? Number(boardId) : null,
                isMarketplaceEnabled,
                updatedBy: null,
            };

            const res = await fetch(`/api/admin/institutions/profiles/${editing.id}`, {
                method: "PATCH",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (res.ok) {
                toast.success("Updated");
                await syncInstitutionMedia(editing.id);
                await fetchMedia(editing.id);
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

    const handleToggle = async (t: InstitutionProfile) => {
        setActiveLoadingId(t.id);
        try {
            const res = await fetch(`/api/admin/institutions/profiles/${t.id}`, {
                method: "PATCH",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !t.is_active }),
            });
            const json = await res.json();
            if (res.ok) {
                toast.success("Updated");
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
            const res = await fetch(`/api/admin/institutions/profiles/${deleteTarget.id}`, {
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

    const columns = buildColumns(setDeleteTarget, setEditing, handleToggle, activeLoadingId, (item) => {
        setViewing(item);
        setViewOpen(true);
        if (item) {
            fetchMedia(item.id);
        }
    }, setAgreementTarget);

    const pathname = usePathname();
    const isPlatformAdmin = Boolean(
        pathname?.startsWith("/platformadmin") ||
        user?.is_super_admin ||
        user?.role_codes?.includes("platform_admin") ||
        user?.roles?.includes("platform_admin") ||
        user?.primary_role === "platform_admin" ||
        (!user?.memberships?.length)
    );

    return (
        <div className="space-y-6 w-full max-w-full">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Institutions</h1>
                    <p className="text-sm text-muted-foreground">Manage organization profiles, contact info, subtypes and media.</p>
                </div>
                {!isPlatformAdmin && (
                    <div>
                        <Button onClick={openCreateDialog} className="w-full sm:w-auto">
                            <Plus className="mr-2 h-4 w-4" /> New Institution
                        </Button>
                    </div>
                )}
            </div>

            <DataTable
                columns={columns}
                data={items}
                loading={loading}
                searchKey="name"
                filterPlaceholder="Search by name..."
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
                                    const res = await fetch("/api/admin/institutions/profiles", {
                                        method: "PATCH",
                                        headers: { ...authHeader, "Content-Type": "application/json" },
                                        body: JSON.stringify({ ids, isActive: true }),
                                    });
                                    if (res.ok) {
                                        toast.success("Activated selected profiles");
                                        resetSelection();
                                        fetchItems();
                                    } else toast.error("Failed to activate");
                                } catch {
                                    toast.error("Network error");
                                }
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
                                    const res = await fetch("/api/admin/institutions/profiles", {
                                        method: "PATCH",
                                        headers: { ...authHeader, "Content-Type": "application/json" },
                                        body: JSON.stringify({ ids, isActive: false }),
                                    });
                                    if (res.ok) {
                                        toast.success("Disabled selected profiles");
                                        resetSelection();
                                        fetchItems();
                                    } else toast.error("Failed to disable");
                                } catch {
                                    toast.error("Network error");
                                }
                            }}
                        >
                            <PowerOff className="size-4" />
                            Disable
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                                if (confirm("Are you sure you want to delete these profiles?")) {
                                    const ids = selectedRows.map((r) => r.id);
                                    try {
                                        const res = await fetch("/api/admin/institutions/profiles", {
                                            method: "PATCH",
                                            headers: { ...authHeader, "Content-Type": "application/json" },
                                            body: JSON.stringify({ ids, softDelete: true }),
                                        });
                                        if (res.ok) {
                                            toast.success("Deleted selected profiles");
                                            resetSelection();
                                            fetchItems();
                                        } else toast.error("Failed to delete");
                                    } catch {
                                        toast.error("Network error");
                                    }
                                }
                            }}
                        >
                            <Trash2 className="size-4" />
                            Delete
                        </Button>
                    </div>
                )}
            />

            <Dialog
                open={dialogOpen}
                onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) resetForm();
                }}
            >
                <DialogContent
                    className="max-h-[92vh] overflow-x-hidden overflow-y-auto bg-card border border-border/80 backdrop-blur-2xl p-4 sm:p-6"
                    style={{ maxWidth: "64rem" }}
                    onInteractOutside={(event) => {
                        const target = event.target as HTMLElement;
                        if (target?.closest?.(".pac-container")) event.preventDefault();
                    }}
                    onPointerDownOutside={(event) => {
                        const target = event.target as HTMLElement;
                        if (target?.closest?.(".pac-container")) event.preventDefault();
                    }}
                >
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <Building2 className="size-5" />
                            {editing ? "Edit Institution" : "New Institution"}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            {editing
                                ? "Update detailed profile specifications, media resources and contact properties."
                                : "Add professional credentials, media content and classification metadata for this profile."}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Wizard Steps Header */}
                    <div className="-mx-4 overflow-x-auto overscroll-x-contain px-4 pb-2 mb-6 sm:mx-0 sm:overflow-visible sm:px-0 sm:pb-0">
                        <ol className="flex w-max min-w-full gap-2 sm:w-full sm:grid sm:grid-cols-4">
                            {steps.map((step, idx) => {
                                const Icon = step.icon;
                                const isActive = idx === activeStep;
                                const isComplete = idx < activeStep;

                                return (
                                    <li key={step.label} className="min-w-32 shrink-0 sm:min-w-0">
                                        <button
                                            type="button"
                                            onClick={() => setActiveStep(idx)}
                                            className={cn(
                                                "flex h-12 w-full items-center gap-2 whitespace-nowrap rounded-md border px-3 text-left text-sm transition-colors",
                                                isActive && "border-primary bg-primary text-primary-foreground shadow-sm",
                                                isComplete && !isActive && "bg-emerald-500/10 text-emerald-500 border-emerald-500/25",
                                                !isActive && !isComplete && "border-border hover:bg-muted text-muted-foreground"
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
                    </div>

                    <div className="py-2">
                        {activeStep === 0 && (
                            <div className="space-y-4 min-w-0">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2 min-w-0">
                                        <Label className="text-sm font-medium">Institution Name</Label>
                                        <Input
                                            value={name}
                                            onChange={(e) => {
                                                setName(e.target.value);
                                                if (!editing) {
                                                    setSlug(toSlug(e.target.value));
                                                }
                                            }}
                                            placeholder="e.g. Stanford University"
                                            className="bg-background/50 border border-border"
                                        />
                                    </div>
                                    <div className="space-y-2 min-w-0">
                                        <Label className="text-sm font-medium">Type</Label>
                                        <AsyncSearchPopover
                                            value={String(institutionTypeId)}
                                            onChange={(v) => setInstitutionTypeId(v)}
                                            onSelectItem={(item: MasterType) => {
                                                setInstitutionTypeName(item.name);
                                                const selectedType = item.name.toLowerCase();
                                                if (!selectedType.includes("school") || selectedType.includes("coaching")) {
                                                    setBoardId("");
                                                    setBoardName("");
                                                }
                                            }}
                                            placeholder="Select type"
                                            searchPlaceholder="Search types..."
                                            selectedLabel={editing?.type_name || institutionTypeName || undefined}
                                            fetcher={async (search, page) => {
                                                const res = await fetch(
                                                    `/api/institution-types?search=${encodeURIComponent(
                                                        search
                                                    )}&page=${page}&limit=10`
                                                );
                                                if (!res.ok) throw new Error("Failed to fetch types");
                                                const json = await res.json();
                                                return { data: json.data, hasMore: page < json.pageCount };
                                            }}
                                            getValue={(item: MasterType) => String(item.id)}
                                            getLabel={(item: MasterType) => item.name}
                                        />
                                    </div>
                                </div>

                                {/* Organization Logo Upload — right after Institution Name in Basic tab */}
                                <div className="space-y-2 rounded-lg border bg-muted/10 p-3.5">
                                    <div>
                                        <Label className="text-sm font-medium flex items-center gap-1.5">
                                            Organization Logo
                                            <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                                        </Label>
                                        <p className="text-xs text-muted-foreground">Upload organization logo image or paste a direct image URL.</p>
                                    </div>
                                    <DocumentFileUpload
                                        accessToken={accessToken}
                                        files={logoFiles}
                                        onFilesChange={handleLogoFilesChange}
                                        maxFiles={1}
                                        maxSize={5 * 1024 * 1024}
                                        compact
                                        buttonLabel="Upload Logo"
                                        emptyText="Drop organization logo here or click to browse"
                                    />
                                    <div className="flex gap-2">
                                        <Input
                                            value={imageUrl}
                                            onChange={(event) => {
                                                setLogoFile(null);
                                                setImageUrl(event.target.value);
                                            }}
                                            placeholder="https://example.com/logo.png"
                                            className="bg-background/50 text-xs"
                                        />
                                    </div>
                                </div>
                                {showBoardField && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Board</Label>
                                        <AsyncSearchPopover
                                            value={String(boardId)}
                                            onChange={(v) => {
                                                setBoardId(v);
                                                if (!v) setBoardName("");
                                            }}
                                            onSelectItem={(item: MasterType) => setBoardName(item.name)}
                                            placeholder="Select board"
                                            searchPlaceholder="Search boards..."
                                            selectedLabel={boardName || undefined}
                                            fetcher={async (search, page) => {
                                                const res = await fetch(
                                                    `/api/admin/boards?search=${encodeURIComponent(search)}&page=${page}&limit=10`,
                                                    { headers: authHeader }
                                                );
                                                if (!res.ok) throw new Error("Failed to fetch boards");
                                                const json = await res.json();
                                                return { data: json.data, hasMore: page < json.pageCount };
                                            }}
                                            getValue={(item: MasterType) => String(item.id)}
                                            getLabel={(item: MasterType) => item.name}
                                        />
                                    </div>
                                )}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2 min-w-0">
                                        <Label className="text-sm font-medium">Subtype</Label>
                                        <AsyncSearchPopover
                                            value={String(institutionSubtypeId)}
                                            onChange={(v) => setInstitutionSubtypeId(v)}
                                            placeholder="Select subtype (optional)"
                                            searchPlaceholder="Search subtypes..."
                                            selectedLabel={editing?.subtype_name ?? undefined}
                                            fetcher={async (search, page) => {
                                                const res = await fetch(
                                                    `/api/institution-subtypes?search=${encodeURIComponent(
                                                        search
                                                    )}&page=${page}&limit=10`
                                                );
                                                if (!res.ok) throw new Error("Failed to fetch subtypes");
                                                const json = await res.json();
                                                return { data: json.data, hasMore: page < json.pageCount };
                                            }}
                                            getValue={(item: MasterType) => String(item.id)}
                                            getLabel={(item: MasterType) => item.name}
                                        />
                                    </div>
                                    <div className="space-y-2 min-w-0">
                                        <Label className="text-sm font-medium">Slug</Label>
                                        <Input
                                            value={slug}
                                            onChange={(e) => setSlug(e.target.value)}
                                            placeholder="institution-slug"
                                            className="bg-background/50 border border-border"
                                        />
                                    </div>
                                </div>
                                {isCollegeType && (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center gap-1.5">
                                            <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                                            Parent University
                                            <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                                        </Label>
                                        <AsyncSearchPopover
                                            value={String(parentUniversityId)}
                                            onChange={(v) => setParentUniversityId(v)}
                                            onSelectItem={(item: InstitutionProfile) => setParentUniversityName(item.name || item.organization_name || "")}
                                            placeholder="Select parent university"
                                            searchPlaceholder="Search universities..."
                                            selectedLabel={parentUniversityName || undefined}
                                            fetcher={fetchParentUniversityOptions}
                                            getValue={(item: InstitutionProfile) => String(item.id)}
                                            getLabel={(item: InstitutionProfile) => item.name || item.organization_name || ""}
                                        />
                                    </div>
                                )}

                                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-2">
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <Checkbox
                                            checked={isMarketplaceEnabled}
                                            onCheckedChange={(checked) => setIsMarketplaceEnabled(Boolean(checked))}
                                            className="mt-0.5"
                                        />
                                        <div className="space-y-0.5">
                                            <span className="text-sm font-semibold text-foreground flex items-center gap-2">
                                                Institute should be available on edubird market place
                                            </span>
                                            <p className="text-xs text-muted-foreground">
                                                When enabled, this institution and its active programs will be publicly discoverable on the EduBird educational marketplace & course catalog.
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>
                        )}

                        {activeStep === 1 && (
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-background/60 p-3">
                                    <div className="space-y-1">
                                        <div className="text-sm font-medium">AI assisted fill</div>
                                        <p className="text-xs text-muted-foreground">
                                            Uses AI to populate mission, vision, goal and overview fields.
                                        </p>
                                    </div>
                                    <Button type="button" variant="outline" onClick={generateInstitutionDetails} disabled={generatingAi || !name.trim()} className="gap-2">
                                        {generatingAi ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                                        Generate with AI
                                    </Button>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Established Year</Label>
                                    <Input
                                        type="number"
                                        value={String(establishedYear)}
                                        onChange={(e) => setEstablishedYear(e.target.value ? Number(e.target.value) : "")}
                                        placeholder="e.g. 1998"
                                        className="bg-background/50 border border-border max-w-xs"
                                    />
                                </div>

                                <div className="space-y-2 min-w-0">
                                    <Label className="text-sm font-medium">Mission Statement</Label>
                                    <Textarea
                                        value={mission}
                                        onChange={(e) => setMission(e.target.value)}
                                        placeholder="State the core mission of the institution..."
                                        rows={3}
                                        className="bg-background/50 border border-border resize-none"
                                    />
                                </div>

                                <div className="space-y-2 min-w-0">
                                    <Label className="text-sm font-medium">Vision Statement</Label>
                                    <Textarea
                                        value={vision}
                                        onChange={(e) => setVision(e.target.value)}
                                        placeholder="Describe the long-term vision and goals..."
                                        rows={3}
                                        className="bg-background/50 border border-border resize-none"
                                    />
                                </div>

                                <div className="space-y-2 min-w-0">
                                    <Label className="text-sm font-medium">Institutional Goals & Objectives</Label>
                                    <Textarea
                                        value={goal}
                                        onChange={(e) => setGoal(e.target.value)}
                                        placeholder="Key goals, targets, and educational outcomes..."
                                        rows={3}
                                        className="bg-background/50 border border-border resize-none"
                                    />
                                </div>

                                <div className="space-y-2 min-w-0">
                                    <Label className="text-sm font-medium">About / Overview</Label>
                                    <Textarea
                                        value={about}
                                        onChange={(e) => setAbout(e.target.value)}
                                        placeholder="Provide a general description of the institution..."
                                        rows={3}
                                        className="bg-background/50 border border-border resize-none"
                                    />
                                </div>
                            </div>
                        )}

                        {activeStep === 2 && (
                            <div className="space-y-4">
                                <InstitutionBranchManager
                                    institutionId={editing?.id || 0}
                                    accessToken={accessToken}
                                    stagedBranches={stagedBranches}
                                    onStagedBranchesChange={setStagedBranches}
                                />
                            </div>
                        )}

                        {activeStep === 3 && (
                            <div className="space-y-4">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-semibold flex items-center gap-2">
                                        <UserCheck className="size-4 text-primary" />
                                        About Founder & Leadership
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Add information about the founder, chairman, or leadership of this institution.
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Founder Name</Label>
                                        <Input
                                            value={founderName}
                                            onChange={(e) => setFounderName(e.target.value)}
                                            placeholder="e.g. Dr. A. P. J. Abdul Kalam"
                                            className="bg-background/50 border border-border"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Title / Designation</Label>
                                        <Input
                                            value={founderTitle}
                                            onChange={(e) => setFounderTitle(e.target.value)}
                                            placeholder="e.g. Founder & Managing Trustee"
                                            className="bg-background/50 border border-border"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 rounded-lg border bg-muted/10 p-3">
                                    <div>
                                        <Label className="text-sm font-medium">Founder Portrait / Image</Label>
                                        <p className="text-xs text-muted-foreground">Upload a profile picture of the founder or paste an image URL.</p>
                                    </div>
                                    <DocumentFileUpload
                                        accessToken={accessToken}
                                        files={founderFiles}
                                        onFilesChange={(files) => {
                                            setFounderFiles(files);
                                            if (files[0]?.url) setFounderImageUrl(files[0].url);
                                        }}
                                        maxFiles={1}
                                        maxSize={5 * 1024 * 1024}
                                        compact
                                        buttonLabel="Upload Founder Image"
                                        emptyText="Drop founder photo here or click to browse"
                                    />
                                    <div className="flex gap-2">
                                        <Input
                                            value={founderImageUrl}
                                            onChange={(event) => setFounderImageUrl(event.target.value)}
                                            placeholder="https://example.com/founder-photo.jpg"
                                            className="bg-background/50"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">About Founder (Bio)</Label>
                                    <Textarea
                                        value={founderAbout}
                                        onChange={(e) => setFounderAbout(e.target.value)}
                                        placeholder="Write about the founder's vision, background, achievements and leadership journey..."
                                        rows={4}
                                        className="bg-background/50 border border-border resize-none"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-border">
                        <div className="flex items-center gap-2">
                            {activeStep > 0 && (
                                <Button variant="outline" onClick={() => setActiveStep((s) => s - 1)}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                </Button>
                            )}
                            <ProgressiveSaveIndicator status={institutionSaveStatus} />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                onClick={() => {
                                    setDialogOpen(false);
                                    setEditing(null);
                                    clearInstitutionDraft();
                                }}
                            >
                                Cancel
                            </Button>
                            {activeStep < steps.length - 1 ? (
                                <Button
                                    onClick={() => {
                                        if (activeStep === 0 && (!name || !institutionTypeId)) {
                                            return toast.error("Institution name and type are required");
                                        }
                                        setActiveStep((s) => s + 1);
                                    }}
                                >
                                    Next <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <Button
                                    onClick={() => {
                                        if (editing) {
                                            void handleUpdate();
                                        } else {
                                            void handleCreate();
                                        }
                                        clearInstitutionDraft();
                                    }}
                                    disabled={submitting}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...
                                        </>
                                    ) : editing ? (
                                        "Save Changes"
                                    ) : (
                                        "Register Profile"
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent className="bg-card border border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-bold">Delete Institution Profile?</AlertDialogTitle>
                        <p className="text-sm text-muted-foreground">
                            This actions marks the profile as deleted. All programs, placements and scholars associated with this institution will remain but this profile will not be active or listed.
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
            <InstitutionAgreementDialog
                open={!!agreementTarget}
                onOpenChange={(open) => !open && setAgreementTarget(null)}
                institution={agreementTarget}
            />

            <Sheet open={viewOpen} onOpenChange={(open) => {
                setViewOpen(open);
                if (!open) setViewing(null);
            }}>
                <SheetContent
                    className="h-dvh w-full gap-0 overflow-hidden bg-card p-0 text-foreground backdrop-blur-2xl sm:max-w-2xl"
                    defaultSize={680}
                    minSize={520}
                    maxSize={920}
                    resizeStorageKey="institution-profile-sheet-width"
                >
                    <SheetHeader className="shrink-0 border-b border-border px-4 py-5 pr-12 sm:px-6">
                        <SheetTitle className="text-xl font-bold flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            Institution Profile
                        </SheetTitle>
                        <SheetDescription>
                            Full details and registration parameters of the institution.
                        </SheetDescription>
                        {viewing && <div className="text-xs font-medium text-muted-foreground">ID: {viewing.id}</div>}
                    </SheetHeader>

                    {viewing && (
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-6 sm:px-6">
                            <div className="space-y-6 pb-6">
                            {/* Header Section */}
                            <div className="flex items-start gap-5 py-2">
                                {mediaList.find(m => m.media_type === "logo")?.url ? (
                                    <img
                                        src={mediaList.find(m => m.media_type === "logo").url}
                                        alt="Logo"
                                        className="h-28 w-28 shrink-0 object-cover rounded-md border bg-white p-1"
                                    />
                                ) : (
                                    <div className="h-28 w-28 shrink-0 rounded-md bg-primary/10 flex items-center justify-center border border-primary/20">
                                        <GraduationCap className="h-11 w-11 text-primary" />
                                    </div>
                                )}
                                <div className="min-w-0 flex-1 space-y-2 pt-1">
                                    <div className="space-y-1">
                                        <h2 className="text-xl font-semibold text-foreground leading-tight wrap-break-word">
                                            {viewing.name || viewing.organization_name || viewing.slug}
                                        </h2>
                                        <p className="text-xs text-muted-foreground font-mono mt-1">
                                            {viewing.slug}
                                        </p>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline" className="capitalize">
                                            {viewing.type_name}
                                        </Badge>
                                        {viewing.subtype_name && (
                                            <Badge variant="outline" className="capitalize">
                                                {viewing.subtype_name}
                                            </Badge>
                                        )}
                                        <Badge
                                            className={cn(
                                                viewing.is_active
                                                    ? "bg-green-100 text-green-700 hover:bg-green-100"
                                                    : "bg-red-100 text-red-700 hover:bg-red-100"
                                            )}
                                        >
                                            {viewing.is_active ? "Active" : "Disabled"}
                                        </Badge>
                                    </div>
                                </div>
                            </div>

                            {/* Core Details Grid */}
                            <section className="space-y-2">
                                <h3 className="text-sm font-semibold">General Information</h3>
                                <div className="space-y-3 text-sm">
                                    <div className="rounded-md border p-4 w-full">
                                        <span className="text-xs text-muted-foreground block">Established Year</span>
                                        <p className="font-medium mt-1">{viewing.established_year || "-"}</p>
                                    </div>
                                    {(viewing.board_name || viewing.board_id) && (
                                        <div className="rounded-md border p-4 w-full">
                                            <span className="text-xs text-muted-foreground block">Board</span>
                                            <p className="font-medium mt-1">
                                                {viewing.board_name || `ID: ${viewing.board_id}`}
                                            </p>
                                        </div>
                                    )}
                                    <div className="rounded-md border p-4 w-full">
                                        <span className="text-xs text-muted-foreground block">Parent University</span>
                                        <p className="font-medium mt-1">
                                            {viewing.parent_university_name || (viewing.parent_university_id ? `ID: ${viewing.parent_university_id}` : "None / Independent")}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Mission, Vision & Goal Section */}
                            <section className="space-y-3">
                                <h3 className="text-sm font-semibold flex items-center gap-2">
                                    <Target className="size-4 text-primary" />
                                    Mission, Vision & Goal
                                </h3>
                                <div className="grid gap-3 text-sm">
                                    {viewing.mission && (
                                        <div className="rounded-md border p-3.5 space-y-1 bg-muted/10">
                                            <span className="text-xs font-bold text-primary uppercase tracking-wider block">Mission</span>
                                            <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{viewing.mission}</p>
                                        </div>
                                    )}
                                    {viewing.vision && (
                                        <div className="rounded-md border p-3.5 space-y-1 bg-muted/10">
                                            <span className="text-xs font-bold text-primary uppercase tracking-wider block">Vision</span>
                                            <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{viewing.vision}</p>
                                        </div>
                                    )}
                                    {viewing.goal && (
                                        <div className="rounded-md border p-3.5 space-y-1 bg-muted/10">
                                            <span className="text-xs font-bold text-primary uppercase tracking-wider block">Goals & Objectives</span>
                                            <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{viewing.goal}</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {viewingAiSections.length > 0 && (
                                <section className="space-y-2">
                                    <div className="rounded-md border p-4 text-sm">
                                        {viewingAiSections.map((section) => (
                                            <div key={section.key} className="space-y-2 py-3 first:pt-0 last:pb-0 border-b border-border/50 last:border-b-0">
                                                <h3 className="text-sm font-semibold text-foreground">{section.label}</h3>
                                                {Array.isArray(section.value) ? (
                                                    <ul className="space-y-1 list-disc pl-5 text-muted-foreground leading-relaxed">
                                                        {section.value.map((item, index) => (
                                                            <li key={`${section.key}-${index}`}>{item}</li>
                                                        ))}
                                                    </ul>
                                                ) : (
                                                    <p className="whitespace-pre-line leading-relaxed text-muted-foreground">
                                                        {section.value}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            )}

                            <section className="space-y-2">
                                <h3 className="text-sm font-semibold">Manual About</h3>
                                <div className="rounded-md border p-4 text-sm">
                                    <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                                        {viewing.about || "No manual about text provided."}
                                    </p>
                                </div>
                            </section>

                            {/* About Founder Section */}
                            {(viewing.founder_name || viewing.founder_about || viewing.founder_image_url) && (
                                <section className="space-y-2">
                                    <h3 className="flex items-center gap-2 text-sm font-semibold">
                                        <UserCheck className="size-4 text-primary" />
                                        About Founder & Leadership
                                    </h3>
                                    <div className="rounded-xl border bg-card p-4 text-sm space-y-4 shadow-sm">
                                        <div className="flex items-center gap-4">
                                            {viewing.founder_image_url ? (
                                                <img
                                                    src={viewing.founder_image_url}
                                                    alt={viewing.founder_name || "Founder"}
                                                    className="h-16 w-16 rounded-full object-cover border-2 border-primary/20 bg-muted shrink-0"
                                                />
                                            ) : (
                                                <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary font-bold text-xl shrink-0">
                                                    {viewing.founder_name ? viewing.founder_name[0]?.toUpperCase() : "F"}
                                                </div>
                                            )}
                                            <div className="space-y-1">
                                                <h4 className="font-semibold text-base text-foreground leading-tight">
                                                    {viewing.founder_name || "Founder"}
                                                </h4>
                                                {viewing.founder_title && (
                                                    <Badge variant="secondary" className="font-normal text-xs">
                                                        {viewing.founder_title}
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                        {viewing.founder_about && (
                                            <p className="text-muted-foreground whitespace-pre-line leading-relaxed text-xs border-t border-border/60 pt-3">
                                                {viewing.founder_about}
                                            </p>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Courses Management Section */}
                            <section className="space-y-3 pt-2">
                                <InstitutionCourseManager institutionId={viewing.id} accessToken={accessToken} />
                            </section>

                            {/* Branch Contacts Management Section */}
                            <section className="space-y-3 pt-2">
                                <InstitutionBranchManager institutionId={viewing.id} accessToken={accessToken} />
                            </section>

                            {/* Images Carousel or gallery if any */}
                            {mediaList.filter(m => m.media_type !== "logo").length > 0 && (
                                <section className="space-y-2">
                                    <h3 className="text-sm font-semibold">Institution Media</h3>
                                    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
                                        {mediaList.filter(m => m.media_type !== "logo").map((m, idx) => (
                                            <a key={idx} href={m.url} target="_blank" rel="noopener noreferrer" className="relative group aspect-video overflow-hidden rounded-md border bg-muted/40 hover:border-primary/40 transition-colors">
                                                <img src={m.url} alt={m.title || "Media"} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" />
                                            </a>
                                        ))}
                                    </div>
                                </section>
                            )}
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}
