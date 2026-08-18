"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
    Bot,
    CheckCircle2,
    Eye,
    FileJson,
    Loader2,
    MoreHorizontal,
    Plus,
    RefreshCw,
    Power,
    PowerOff,
    Sparkles,
    Trash2,
    WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthStore } from "@/store";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { TemplateResizableHandle, TemplateResizablePanel, TemplateResizablePanelGroup } from "@/components/card-templates/template-resizable";
import { institutionCutoffCreateSchema, institutionCutoffUpdateSchema } from "@/lib/validations";
import { InstitutionCutoff, InstitutionProfile, InstitutionProgram } from "@/lib/types/institution";
import { cn } from "@/lib/utils";

const CUTOFF_CONTENT_TYPE_SLUG = "institute-cutoffs";

type AcademicYearOption = {
    id: number;
    name: string;
    start_date?: string | null;
    end_date?: string | null;
};

function formatDate(value?: string) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function formatJsonForEditor(value: Record<string, unknown> | null) {
    if (!value) return "";
    return JSON.stringify(value, null, 2);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function formatTableValue(value: unknown) {
    if (value === null || value === undefined || value === "") return "-";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "number") return String(value);
    if (typeof value === "string") return value;
    if (Array.isArray(value)) {
        if (!value.length) return "-";
        if (value.every((item) => typeof item !== "object" || item === null)) {
            return value.map((item) => formatTableValue(item)).join(", ");
        }
        return "See section below";
    }
    return JSON.stringify(value);
}

function toTitle(value: string) {
    return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function extractNotes(value: Record<string, unknown> | null) {
    const rawNotes = value?.notes;
    if (!Array.isArray(rawNotes)) return [];
    return rawNotes.filter((note): note is string => typeof note === "string").map((note) => note.trim()).filter(Boolean);
}

function findYearSections(value: Record<string, unknown> | null) {
    if (!value) return [] as Array<Record<string, unknown>>;

    const sectionKeys = ["year_wise_cutoffs", "yearWiseCutoffs", "year_wise", "yearWise", "cutoffs_by_year"];
    for (const key of sectionKeys) {
        const candidate = value[key];
        if (Array.isArray(candidate)) {
            return candidate.filter(isPlainObject) as Array<Record<string, unknown>>;
        }
    }

    const directRows = Object.values(value).filter(isPlainObject) as Array<Record<string, unknown>>;
    if (directRows.length > 0 && directRows.some((row) => row.year !== undefined || row.academic_year !== undefined)) {
        return directRows;
    }

    return [];
}

function inferCutoffYearCount(value: Record<string, unknown> | null) {
    const sections = findYearSections(value);
    const years = new Set<string>();

    for (const section of sections) {
        const sectionYear = section.year ?? section.academic_year ?? section.academicYear ?? section.session;
        if (sectionYear !== undefined && sectionYear !== null && String(sectionYear).trim()) {
            years.add(String(sectionYear).trim());
        }

        for (const row of findYearRows(section)) {
            const rowYear = row.year ?? row.academic_year ?? row.academicYear ?? row.session;
            if (rowYear !== undefined && rowYear !== null && String(rowYear).trim()) {
                years.add(String(rowYear).trim());
            }
        }
    }

    return Math.max(years.size || sections.length || 1, 1);
}

function inferCutoffExamName(value: Record<string, unknown> | null) {
    if (!value) return "";

    const directExam = value.exam_name ?? value.exam ?? value.test_name ?? value.admission_basis ?? value.admissionBasis;
    if (directExam !== undefined && directExam !== null && String(directExam).trim()) {
        return String(directExam).trim();
    }

    for (const section of findYearSections(value)) {
        const sectionExam = section.exam_name ?? section.exam ?? section.test_name ?? section.admission_basis ?? section.admissionBasis;
        if (sectionExam !== undefined && sectionExam !== null && String(sectionExam).trim()) {
            return String(sectionExam).trim();
        }
    }

    return "";
}

function findYearRows(section: Record<string, unknown>) {
    const rowKeys = ["rows", "cutoffs", "data", "items", "records", "categories"];
    for (const key of rowKeys) {
        const candidate = section[key];
        if (Array.isArray(candidate)) {
            return candidate.filter(isPlainObject) as Array<Record<string, unknown>>;
        }
    }

    const nestedObjects = Object.entries(section).filter(([, fieldValue]) => Array.isArray(fieldValue) && fieldValue.some(isPlainObject));
    for (const [, fieldValue] of nestedObjects) {
        const candidate = fieldValue as unknown[];
        return candidate.filter(isPlainObject) as Array<Record<string, unknown>>;
    }

    return [] as Array<Record<string, unknown>>;
}

function orderTableColumns(columns: string[]) {
    const priority = (column: string) => {
        const normalized = column.toLowerCase();
        if (normalized === "category") return 0;
        if (normalized === "quota") return 1;
        if (normalized === "branch" || normalized === "course" || normalized === "program") return 2;
        const roundMatch = normalized.match(/^round[_-]?(\d+)$/);
        if (roundMatch) return 10 + Number(roundMatch[1]);
        if (normalized === "cutoff" || normalized === "closing_rank") return 30;
        return 100;
    };

    return [...columns].sort((a, b) => priority(a) - priority(b) || a.localeCompare(b));
}

function renderYearwiseCutoffs(value: Record<string, unknown> | null) {
    if (!value) {
        return <div className="rounded-md border border-dashed bg-muted/20 px-3 py-10 text-center text-sm text-muted-foreground">No AI response stored.</div>;
    }

    const notes = extractNotes(value);
    const yearSections = findYearSections(value);

    return (
        <div className="space-y-4">
            {notes.length > 0 && (
                <Card className="border-muted/60 bg-muted/10 shadow-none">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Notes</CardTitle>
                        <CardDescription>Read these before using the cutoff tables.</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0">
                        <ul className="list-disc space-y-2 pl-5 text-sm leading-6 text-muted-foreground">
                            {notes.map((note, index) => (
                                <li key={`${note}-${index}`}>{note}</li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            )}

            {yearSections.length > 0 ? (
                yearSections.map((section, index) => {
                    const sectionRows = findYearRows(section);
                    const sectionYear = section.year ?? section.academic_year ?? section.reference_year ?? section.label ?? `Year ${index + 1}`;
                    const sectionExam = section.exam_name ?? section.exam ?? section.test_name ?? null;

                    const columns = orderTableColumns(
                        Array.from(
                            new Set(
                                sectionRows.flatMap((row) => Object.keys(row).filter((column) => !["year", "exam_name", "exam", "label", "title"].includes(column)))
                            )
                        )
                    );

                    return (
                        <Card key={`${sectionYear}-${index}`} className="border-muted/60 shadow-none">
                            <CardHeader className="pb-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="space-y-1">
                                        <CardTitle className="text-base">{toTitle(String(sectionYear))}</CardTitle>
                                        {sectionExam ? <CardDescription>{formatTableValue(sectionExam)}</CardDescription> : null}
                                    </div>
                                    <Badge variant="outline" className="self-start">{sectionRows.length} row{sectionRows.length === 1 ? "" : "s"}</Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                                {sectionRows.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {columns.map((column) => (
                                                    <TableHead key={column} className="whitespace-nowrap">
                                                        {toTitle(column)}
                                                    </TableHead>
                                                ))}
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {sectionRows.map((row, rowIndex) => (
                                                <TableRow key={`${sectionYear}-${rowIndex}`}>
                                                    {columns.map((column) => (
                                                        <TableCell key={`${sectionYear}-${rowIndex}-${column}`} className="align-top whitespace-normal text-muted-foreground">
                                                            {formatTableValue(row[column])}
                                                        </TableCell>
                                                    ))}
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="rounded-md border border-dashed bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
                                        No cutoff rows found for this year.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    );
                })
            ) : (
                <Card className="border-muted/60 shadow-none">
                    <CardContent className="px-6 py-8 text-center text-sm text-muted-foreground">
                        No year-wise cutoff table found in the AI response.
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

export default function CutoffsAdminPage() {
    const { isReady } = useAdminGuard();
    const { accessToken, user: currentUser } = useAuthStore();
    const { activeInstitution, activeInstitutionId } = useActiveInstitution();
    const isMobile = useIsMobile();
    const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
    const isPlatformAdmin = Boolean(currentUser?.is_super_admin || currentUser?.role_codes?.includes("platform_admin"));
    const lockToActiveInstitution = Boolean(activeInstitution && !isPlatformAdmin);

    const [items, setItems] = useState<InstitutionCutoff[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageCount, setPageCount] = useState(-1);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCutoff, setEditingCutoff] = useState<InstitutionCutoff | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<InstitutionCutoff | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
    // Bulk actions state
    const [bulkDeleteTargets, setBulkDeleteTargets] = useState<InstitutionCutoff[]>([]);
    const [bulkLoading, setBulkLoading] = useState(false);
    const bulkResetSelectionRef = useRef<(() => void) | null>(null);
    const isResizingPanelsRef = useRef(false);
    const resizeClearTimerRef = useRef<number | null>(null);

    const [institutionId, setInstitutionId] = useState("");
    const [institutionLabel, setInstitutionLabel] = useState("");
    const [programId, setProgramId] = useState("");
    const [programLabel, setProgramLabel] = useState("");
    const [academicYearId, setAcademicYearId] = useState("");
    const [academicYearLabel, setAcademicYearLabel] = useState("");
    const [examName, setExamName] = useState("");
    const [tweakMessage, setTweakMessage] = useState("");
    const [generatedResponse, setGeneratedResponse] = useState<Record<string, unknown> | null>(null);
    const [jsonPreviewText, setJsonPreviewText] = useState("");
    const [isActive, setIsActive] = useState(true);

    const [viewTarget, setViewTarget] = useState<InstitutionCutoff | null>(null);
    const [viewSheetOpen, setViewSheetOpen] = useState(false);

    const fetchItems = useCallback(async () => {
        if (!accessToken) return;

        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(pagination.pageIndex + 1),
                limit: String(pagination.pageSize),
                search: debouncedSearch,
            });
            if (lockToActiveInstitution && activeInstitutionId) {
                params.set("institutionId", String(activeInstitutionId));
            }

            const res = await fetch(`/api/admin/institutions/cutoffs?${params.toString()}`, { headers: authHeader });
            const json = await res.json();
            if (res.ok) {
                setItems(json.data ?? []);
                setPageCount(json.pageCount ?? -1);
            } else {
                toast.error(json.error ?? "Failed to load cutoffs");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    }, [accessToken, activeInstitutionId, authHeader, debouncedSearch, lockToActiveInstitution, pagination.pageIndex, pagination.pageSize]);

    useEffect(() => {
        if (!isReady) return;
        const timeoutId = window.setTimeout(() => {
            void fetchItems();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [fetchItems, isReady]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPagination((current) => ({ ...current, pageIndex: 0 }));
        }, 300);

        return () => window.clearTimeout(timer);
    }, [searchTerm]);

    const fetchInstitutions = async (search: string, page: number) => {
        const params = new URLSearchParams({ page: String(page), limit: "10", search });
        const res = await fetch(`/api/admin/institutions/profiles?${params.toString()}`, { headers: authHeader });
        const json = await res.json();

        return {
            data: (json.data ?? []) as InstitutionProfile[],
            hasMore: page < (json.pageCount ?? 1),
        };
    };

    const fetchPrograms = async (search: string, page: number) => {
        const params = new URLSearchParams({ page: String(page), limit: "10", search });
        if (institutionId) params.set("institutionId", institutionId);

        const res = await fetch(`/api/admin/institutions/programs?${params.toString()}`, { headers: authHeader });
        const json = await res.json();

        return {
            data: (json.data ?? []) as InstitutionProgram[],
            hasMore: page < (json.pageCount ?? 1),
        };
    };

    const fetchAcademicYears = async (search: string, page: number) => {
        if (!institutionId) return { data: [] as AcademicYearOption[], hasMore: false };
        const params = new URLSearchParams({
            page: String(page),
            limit: "10",
            search,
            institutionId,
        });
        const res = await fetch(`/api/admin/institutions/academic-years?${params.toString()}`, { headers: authHeader });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load sessions");

        return {
            data: (json.data ?? []) as AcademicYearOption[],
            hasMore: page < (json.pageCount ?? 1),
        };
    };

    const resetForm = () => {
        setEditingCutoff(null);
        setInstitutionId(lockToActiveInstitution && activeInstitutionId ? String(activeInstitutionId) : "");
        setInstitutionLabel(lockToActiveInstitution && activeInstitution ? activeInstitution.name : "");
        setProgramId("");
        setProgramLabel("");
        setAcademicYearId("");
        setAcademicYearLabel("");
        setExamName("");
        setTweakMessage("");
        setGeneratedResponse(null);
        setJsonPreviewText("");
        setIsActive(true);
    };

    const handleResizeStart = useCallback(() => {
        if (resizeClearTimerRef.current) {
            window.clearTimeout(resizeClearTimerRef.current);
            resizeClearTimerRef.current = null;
        }
        isResizingPanelsRef.current = true;
    }, []);

    const handleResizeEnd = useCallback(() => {
        if (resizeClearTimerRef.current) window.clearTimeout(resizeClearTimerRef.current);
        resizeClearTimerRef.current = window.setTimeout(() => {
            isResizingPanelsRef.current = false;
            resizeClearTimerRef.current = null;
        }, 150);
    }, []);

    const redirectToAiSettings = useCallback((message = "Add API key first") => {
        toast.error(message);
        window.setTimeout(() => {
            window.location.href = "/admin/ai-settings";
        }, 450);
    }, []);

    useEffect(() => {
        if (!dialogOpen) {
            if (resizeClearTimerRef.current) {
                window.clearTimeout(resizeClearTimerRef.current);
                resizeClearTimerRef.current = null;
            }
            isResizingPanelsRef.current = false;
            return;
        }

        window.addEventListener("pointerup", handleResizeEnd);
        window.addEventListener("pointercancel", handleResizeEnd);
        window.addEventListener("blur", handleResizeEnd);

        return () => {
            window.removeEventListener("pointerup", handleResizeEnd);
            window.removeEventListener("pointercancel", handleResizeEnd);
            window.removeEventListener("blur", handleResizeEnd);
        };
    }, [dialogOpen, handleResizeEnd]);

    const openCreate = () => {
        resetForm();
        setDialogOpen(true);
    };

    const openEdit = (item: InstitutionCutoff) => {
        setEditingCutoff(item);
        setInstitutionId(String(item.institution_id));
        setInstitutionLabel(item.institution_name ?? `Institution ${item.institution_id}`);
        setProgramId(item.program_id ? String(item.program_id) : "");
        setProgramLabel(item.program_name ?? (item.program_id ? `Program ${item.program_id}` : "No program"));
        setAcademicYearId(item.academic_year_id ? String(item.academic_year_id) : "");
        setAcademicYearLabel(item.academic_year_name ?? (item.academic_year_id ? `Session ${item.academic_year_id}` : ""));
        setExamName(item.exam_name ?? "");
        setGeneratedResponse(item.ai_response ?? null);
        setJsonPreviewText(formatJsonForEditor(item.ai_response ?? null));
        setTweakMessage("");
        setIsActive(item.is_active);
        setDialogOpen(true);
    };

    const openView = (item: InstitutionCutoff) => {
        setViewTarget(item);
        setViewSheetOpen(true);
    };

    const handleViewSheetOpenChange = (open: boolean) => {
        setViewSheetOpen(open);
        if (!open) window.setTimeout(() => setViewTarget(null), 180);
    };

    const generateCutoffWithAi = async () => {
        if (!institutionId) {
            toast.error("Select an institution first");
            return;
        }
        if (!academicYearId) {
            toast.error("Select a session first");
            return;
        }

        setIsGenerating(true);
        try {
            const cutoffContext = {
                institution_name: institutionLabel || undefined,
                institution_id: Number(institutionId),
                program_name: programId ? programLabel : undefined,
                program_id: programId ? Number(programId) : undefined,
                academic_year_name: academicYearLabel || undefined,
                academic_year_id: Number(academicYearId),
            };

            const res = await fetch("/api/admin/ai/generate", {
                method: "POST",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({
                    contentTypeSlug: CUTOFF_CONTENT_TYPE_SLUG,
                    institutionId: Number(institutionId),
                    tweakMessage: tweakMessage.trim() || null,
                    inputContext: JSON.stringify({
                        ...cutoffContext,
                        previous_response: generatedResponse ?? null,
                        output_expectation: [
                            "Detect the relevant exam name or admission basis automatically when verified data is available.",
                            "Return only available cutoff years. Do not create 5 years by default.",
                            "Do not hallucinate missing data. If cutoff data is unavailable, return notes explaining what was unavailable.",
                            "Group available cutoffs by year, category, quota, branch/program, and round when those details exist.",
                        ].join(" "),
                    }, null, 2),
                }),
            });

            const json = await res.json();
            if (res.ok) {
                const nextResponse = (json.data ?? {}) as Record<string, unknown>;
                setExamName(inferCutoffExamName(nextResponse));
                setGeneratedResponse(nextResponse);
                setJsonPreviewText(formatJsonForEditor(nextResponse));
                toast.success("Cutoff response generated");
            } else {
                if (json?.code === "AI_PROVIDER_NOT_CONFIGURED" || /api key/i.test(json?.error ?? "")) {
                    redirectToAiSettings(json.error ?? "Add API key first");
                    return;
                }
                toast.error(json.error ?? "Failed to generate cutoff response");
            }
        } catch {
            toast.error("Network error while generating content");
        } finally {
            setIsGenerating(false);
        }
    };

    const parseEditableJson = () => {
        if (!jsonPreviewText.trim()) {
            toast.error("JSON preview cannot be empty");
            return null;
        }

        try {
            const parsed = JSON.parse(jsonPreviewText);
            if (!isPlainObject(parsed)) {
                toast.error("JSON preview must be a JSON object");
                return null;
            }
            return parsed as Record<string, unknown>;
        } catch {
            toast.error("Fix the JSON preview before saving");
            return null;
        }
    };

    const validateForm = () => {
        const editableJson = parseEditableJson();
        if (!editableJson) return null;
        const inferredExamName = inferCutoffExamName(editableJson);
        const inferredYearCount = inferCutoffYearCount(editableJson);
        if (!academicYearId) {
            toast.error("Select a session");
            return null;
        }

        const payload = {
            institutionId: Number(institutionId),
            programId: programId ? Number(programId) : null,
            academicYearId: Number(academicYearId),
            yearsToGenerate: inferredYearCount,
            examName: inferredExamName || examName.trim() || null,
            aiResponse: editableJson,
            isActive,
        };

        const parsed = editingCutoff
            ? institutionCutoffUpdateSchema.safeParse({ id: editingCutoff.id, ...payload })
            : institutionCutoffCreateSchema.safeParse(payload);

        if (!parsed.success) {
            const firstError = Object.values(parsed.error.flatten().fieldErrors).flat()[0];
            toast.error(firstError ?? "Please fix the cutoff form");
            return null;
        }

        return payload;
    };

    const saveCutoff = async () => {
        const payload = validateForm();
        if (!payload) return;

        setSubmitting(true);
        try {
            const url = editingCutoff
                ? `/api/admin/institutions/cutoffs/${editingCutoff.id}`
                : `/api/admin/institutions/cutoffs`;
            const method = editingCutoff ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const json = await res.json();
            if (res.ok) {
                toast.success(editingCutoff ? "Cutoff updated" : "Cutoff created");
                setDialogOpen(false);
                resetForm();
                await fetchItems();
            } else {
                toast.error(json.error ?? "Failed to save cutoff");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        setActionLoadingId(deleteTarget.id);
        try {
            const res = await fetch(`/api/admin/institutions/cutoffs/${deleteTarget.id}`, {
                method: "DELETE",
                headers: authHeader,
            });
            const json = await res.json();

            if (res.ok) {
                toast.success("Cutoff deleted");
                setDeleteTarget(null);
                await fetchItems();
            } else {
                toast.error(json.error ?? "Failed to delete cutoff");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setActionLoadingId(null);
        }
    };

    const bulkDeleteCutoffs = async () => {
        if (!bulkDeleteTargets.length) return;

        setBulkLoading(true);
        try {
            const res = await fetch(`/api/admin/institutions/cutoffs`, {
                method: "PATCH",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({ ids: bulkDeleteTargets.map((i) => i.id), softDelete: true }),
            });
            const json = await res.json();

            if (res.ok) {
                toast.success(`${bulkDeleteTargets.length} cutoffs deleted`);
                setBulkDeleteTargets([]);
                bulkResetSelectionRef.current?.();
                await fetchItems();
            } else {
                toast.error(json.error ?? "Failed to delete cutoffs");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setBulkLoading(false);
        }
    };

    const handleBulkStatus = async (selectedRows: InstitutionCutoff[], isActive: boolean, resetSelection: () => void) => {
        setBulkLoading(true);
        try {
            const res = await fetch(`/api/admin/institutions/cutoffs`, {
                method: "PATCH",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedRows.map((r) => r.id), isActive }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to update selected cutoffs");

            toast.success(`${selectedRows.length} cutoff${selectedRows.length === 1 ? "" : "s"} ${isActive ? "enabled" : "disabled"}`);
            resetSelection();
            await fetchItems();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to update cutoffs");
        } finally {
            setBulkLoading(false);
        }
    };

    const handleToggle = async (c: InstitutionCutoff) => {
        setActionLoadingId(c.id);
        try {
            const res = await fetch(`/api/admin/institutions/cutoffs/${c.id}`, {
                method: "PATCH",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !c.is_active }),
            });
            const json = await res.json();
            if (res.ok) {
                toast.success("Updated successfully");
                await fetchItems();
            } else {
                toast.error(json.error ?? "Failed to update");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setActionLoadingId(null);
        }
    };

    const columns: ColumnDef<InstitutionCutoff>[] = [
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
            accessorKey: "institution_name",
            header: "Institution",
            cell: ({ row }) => (
                <div className="space-y-1">
                    <div className="font-medium text-foreground">
                        {row.original.institution_name ?? `Institution ${row.original.institution_id}`}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "program_name",
            header: "Program",
            cell: ({ row }) => (
                <div className="space-y-1">
                    <div className="font-medium text-foreground">
                        {row.original.program_name ?? (row.original.program_id ? `Program ${row.original.program_id}` : "No program")}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "academic_year_name",
            header: "Session",
            cell: ({ row }) => (
                <div className="font-medium text-foreground">
                    {row.original.academic_year_name ?? (row.original.academic_year_id ? `Session ${row.original.academic_year_id}` : "-")}
                </div>
            ),
        },

        {
            accessorKey: "is_active",
            header: "Status",
            cell: ({ row }) => (
                <Badge className={cn(row.original.is_active ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500" : "border-rose-500/20 bg-rose-500/10 text-rose-500")}>
                    {row.original.is_active ? "Active" : "Disabled"}
                </Badge>
            ),
        },
        {
            accessorKey: "updated_at",
            header: "Updated",
            cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatDate(row.original.updated_at)}</span>,
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                                <MoreHorizontal className="size-4" />
                                <span className="sr-only">Open menu</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => openView(item)}>View</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(item)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem disabled={actionLoadingId === item.id} onSelect={(e) => { e.preventDefault(); setActionLoadingId(item.id); handleToggle(item).finally(() => setActionLoadingId(null)); }}>
                                {actionLoadingId === item.id ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                                {item.is_active ? "Disable" : "Enable"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" disabled={actionLoadingId === item.id} onClick={() => setDeleteTarget(item)}>
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    const selectedCutoffActions = (selectedRows: InstitutionCutoff[], resetSelection: () => void) => (
        <>
            <Button type="button" variant="outline" size="sm" disabled={bulkLoading} onClick={() => handleBulkStatus(selectedRows, true, resetSelection)}>
                <Power className="size-4" />
                Enable
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={bulkLoading} onClick={() => handleBulkStatus(selectedRows, false, resetSelection)}>
                <PowerOff className="size-4" />
                Disable
            </Button>
            <Button type="button" variant="destructive" size="sm" disabled={bulkLoading} onClick={() => { bulkResetSelectionRef.current = resetSelection; setBulkDeleteTargets(selectedRows); }}>
                <Trash2 className="size-4" />
                Delete
            </Button>
        </>
    );

    return (
        <div className="w-full max-w-full space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Institution Cutoffs</h1>
                    <p className="text-sm text-muted-foreground">
                        Generate and manage verified exam-wise cutoff JSON responses with available years, categories, and rounds.
                    </p>
                </div>
                <Button onClick={openCreate} className="w-full gap-2 sm:w-auto">
                    <Plus className="size-4" />
                    New Cutoff
                </Button>
            </div>

            <DataTable
                columns={columns}
                data={items}
                loading={loading}
                pageCount={pageCount}
                manualPagination
                pagination={pagination}
                onPaginationChange={setPagination}
                getRowId={(row) => String(row.id)}
                showRowNumbers
                filterPlaceholder="Search by institution or program..."
                toolbarLeft={
                    <Input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search cutoffs..."
                        className="w-full sm:max-w-sm"
                    />
                }
                toolbarRight={
                    <Button variant="ghost" size="icon" onClick={fetchItems} disabled={loading} title="Refresh">
                        <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                }
                selectedActions={selectedCutoffActions}
            />

            <Dialog open={dialogOpen} onOpenChange={(open) => {
                if (!open && isResizingPanelsRef.current) return;
                setDialogOpen(open);
            }}>
                <DialogContent
                    showCloseButton={false}
                    className="flex h-[90dvh] max-h-[900px] w-[94vw] max-w-[1400px] flex-col gap-0 overflow-hidden rounded-lg border p-0 sm:max-w-[1400px] sm:p-0"
                    onPointerDownOutside={(event) => {
                        if (isResizingPanelsRef.current) event.preventDefault();
                    }}
                    onInteractOutside={(event) => {
                        if (isResizingPanelsRef.current) event.preventDefault();
                    }}
                >
                    <DialogHeader className="flex h-14 shrink-0 flex-row items-center justify-between border-b bg-background px-5 text-foreground">
                        <div>
                            <DialogTitle className="flex items-center gap-2">
                                <Bot className="size-4 text-primary" />
                                {editingCutoff ? "Edit Cutoff" : "Generate Cutoff"}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Generate verified cutoff data and edit the JSON payload before saving.
                            </DialogDescription>
                        </div>
                        <DialogClose asChild>
                            <Button type="button" variant="ghost" size="icon">
                                <span aria-hidden="true" className="text-xl leading-none">&times;</span>
                                <span className="sr-only">Close cutoff generator</span>
                            </Button>
                        </DialogClose>
                    </DialogHeader>

                    <div className="min-h-0 min-w-0 flex-1 overflow-hidden bg-background text-foreground">
                        <TemplateResizablePanelGroup
                            id={`cutoff-generator-${isMobile ? "mobile" : "desktop"}`}
                            direction={isMobile ? "vertical" : "horizontal"}
                            className="h-full min-h-0 min-w-0"
                        >
                            <TemplateResizablePanel defaultSize={isMobile ? "46%" : "30%"} minSize={isMobile ? "32%" : "22%"} className="min-h-0 min-w-0">
                                <div className="flex h-full min-h-0 flex-col gap-5 overflow-y-auto p-5 md:p-7">
                                    <div>
                                        <h2 className="text-xl font-bold">Cutoff Setup</h2>
                                        <p className="mt-1 text-sm text-muted-foreground">Select the institution, session, and optional program. AI detects the exam and available cutoff rows.</p>
                                    </div>
                                    <div className="flex-1 min-h-0">
                                        <div className="space-y-4">
                                            <div className="grid gap-4">
                                                <div className="space-y-2">
                                                    <Label>Institution</Label>
                                                    {lockToActiveInstitution ? (
                                                        <Input value={institutionLabel || activeInstitution?.name || "Selected institution"} disabled className="disabled:opacity-100" />
                                                    ) : (
                                                        <AsyncSearchPopover<InstitutionProfile>
                                                            value={institutionId}
                                                            onChange={(value) => {
                                                                setInstitutionId(value);
                                                                if (!value) {
                                                                    setInstitutionLabel("");
                                                                    setProgramId("");
                                                                    setProgramLabel("");
                                                                    setAcademicYearId("");
                                                                    setAcademicYearLabel("");
                                                                }
                                                            }}
                                                            selectedLabel={institutionLabel}
                                                            onSelectItem={(item) => {
                                                                setInstitutionId(String(item.id));
                                                                setInstitutionLabel(item.name);
                                                                setProgramId("");
                                                                setProgramLabel("");
                                                                setAcademicYearId("");
                                                                setAcademicYearLabel("");
                                                            }}
                                                            placeholder="Select institution"
                                                            searchPlaceholder="Search institutions..."
                                                            emptyText="No institutions found"
                                                            fetcher={fetchInstitutions}
                                                            getValue={(item) => String(item.id)}
                                                            getLabel={(item) => item.name}
                                                        />
                                                    )}
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Session</Label>
                                                    <AsyncSearchPopover<AcademicYearOption>
                                                        value={academicYearId}
                                                        selectedLabel={academicYearLabel}
                                                        onChange={(value) => {
                                                            setAcademicYearId(value);
                                                            if (!value) setAcademicYearLabel("");
                                                        }}
                                                        onSelectItem={(item) => {
                                                            setAcademicYearId(String(item.id));
                                                            setAcademicYearLabel(item.name);
                                                        }}
                                                        placeholder={institutionId ? "Select session" : "Select institution first"}
                                                        searchPlaceholder="Search sessions..."
                                                        emptyText={institutionId ? "No sessions found" : "Choose an institution first"}
                                                        disabled={!institutionId}
                                                        fetcher={fetchAcademicYears}
                                                        getValue={(item) => String(item.id)}
                                                        getLabel={(item) => item.name}
                                                    />
                                                </div>

                                                <div className="space-y-2">
                                                    <Label>Program</Label>
                                                    <AsyncSearchPopover<InstitutionProgram>
                                                        value={programId}
                                                        onChange={(value) => {
                                                            setProgramId(value);
                                                            if (!value) setProgramLabel("No program");
                                                        }}
                                                        selectedLabel={programId ? programLabel : "No program"}
                                                        onSelectItem={(item) => {
                                                            setProgramId(String(item.id));
                                                            setProgramLabel(item.title);
                                                        }}
                                                        placeholder={institutionId ? "Select program" : "Select institution first"}
                                                        searchPlaceholder="Search programs..."
                                                        emptyText={institutionId ? "No programs found" : "Choose an institution first"}
                                                        disabled={!institutionId}
                                                        showDefaultOption
                                                        defaultOptionLabel="No program"
                                                        defaultOptionValue=""
                                                        fetcher={fetchPrograms}
                                                        getValue={(item) => String(item.id)}
                                                        getLabel={(item) => item.title}
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label>Tweak message (optional)</Label>
                                                <Textarea
                                                    value={tweakMessage}
                                                    onChange={(event) => setTweakMessage(event.target.value)}
                                                    rows={5}
                                                    placeholder="Ask for a specific exam, category, round, year, or extra heading if needed."
                                                />
                                            </div>

                                            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                                                <Checkbox checked={isActive} onCheckedChange={(checked) => setIsActive(!!checked)} />
                                                <div>
                                                    <div className="text-sm font-medium">Active</div>
                                                    <div className="text-xs text-muted-foreground">Inactive records stay saved but are hidden from active flows.</div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Button type="button" onClick={generateCutoffWithAi} disabled={isGenerating || !institutionId || !academicYearId} className="h-11 w-full gap-2 font-semibold">
                                                    {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
                                                    {generatedResponse ? "Regenerate" : "Generate with AI"}
                                                </Button>
                                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting || isGenerating} className="w-full">
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TemplateResizablePanel>

                            <TemplateResizableHandle
                                id={`cutoff-generator-separator-${isMobile ? "mobile" : "desktop"}`}
                                onPointerDownCapture={(event) => {
                                    event.stopPropagation();
                                    handleResizeStart();
                                }}
                                onPointerUpCapture={(event) => {
                                    event.stopPropagation();
                                    handleResizeEnd();
                                }}
                                onPointerCancelCapture={(event) => {
                                    event.stopPropagation();
                                    handleResizeEnd();
                                }}
                            />

                            <TemplateResizablePanel defaultSize={isMobile ? "54%" : "70%"} minSize={isMobile ? "32%" : "32%"} className="min-h-0 min-w-0">
                                <div className="relative h-full min-w-0 bg-muted/20">
                                    {jsonPreviewText.trim() && (
                                        <div className="absolute right-5 top-4 z-30 flex items-center overflow-hidden rounded-md border bg-background/95 text-foreground shadow-xl backdrop-blur">
                                            <Button type="button" onClick={saveCutoff} disabled={submitting} variant="ghost" className="rounded-none">
                                                {submitting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                                                {editingCutoff ? "Update" : "Save"}
                                            </Button>
                                        </div>
                                    )}
                                    <div className="h-full min-h-0">
                                        <div className="flex h-full min-h-0 flex-col border-l border-dashed bg-background/40">
                                            <div className="flex items-center justify-between border-b px-4 py-3">
                                                <div>
                                                    <div className="flex items-center gap-2 text-sm font-semibold">
                                                        <FileJson className="size-4 text-primary" />
                                                        JSON Preview
                                                    </div>
                                                    <div className="mt-1 text-xs text-muted-foreground">{jsonPreviewText.trim() ? "Editable generated payload" : "Generate once to preview the payload"}</div>
                                                </div>
                                                <Badge variant={jsonPreviewText.trim() ? "outline" : "secondary"}>{jsonPreviewText.trim() ? "Editable" : "Empty"}</Badge>
                                            </div>
                                            <div className="min-h-0 flex-1">
                                                {jsonPreviewText.trim() ? (
                                                    <Textarea
                                                        value={jsonPreviewText}
                                                        onChange={(event) => setJsonPreviewText(event.target.value)}
                                                        className="h-full min-h-0 resize-none rounded-none border-0 bg-transparent p-4 font-mono text-xs leading-5 text-foreground shadow-none outline-none focus-visible:ring-0 minimal-scrollbar"
                                                    />
                                                ) : (
                                                    <div className="flex h-full min-h-72 items-center justify-center px-4 py-10 text-center text-sm text-muted-foreground">
                                                        Generate AI response to preview and edit the JSON payload.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </TemplateResizablePanel>
                        </TemplateResizablePanelGroup>
                    </div>
                </DialogContent>
            </Dialog>

            <Sheet open={viewSheetOpen} onOpenChange={handleViewSheetOpenChange}>
                <SheetContent className="w-full overflow-y-auto overflow-x-hidden sm:max-w-5xl">
                    <div className="space-y-5 p-3 sm:p-4">
                        <SheetHeader className="space-y-3 border-b pb-4">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                    <Eye className="size-4 text-primary" />
                                    Cutoff details
                                </div>
                                <SheetTitle className="text-2xl leading-tight">{viewTarget?.exam_name || "General cutoff"}</SheetTitle>
                                <SheetDescription className="text-sm leading-6 text-foreground/90">
                                    {viewTarget
                                        ? `${viewTarget.years_to_generate} available year${viewTarget.years_to_generate === 1 ? "" : "s"} of cutoff data for ${viewTarget.institution_name ?? `Institution ${viewTarget.institution_id}`}.`
                                        : "Cutoff preview"}
                                </SheetDescription>
                                {viewTarget && <div className="text-xs font-medium text-muted-foreground">ID: {viewTarget.id}</div>}
                            </div>
                        </SheetHeader>

                        <div className="overflow-hidden rounded-xl border bg-card">
                            {viewTarget ? (
                                <div className="border-b px-2 py-2">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-md border bg-muted/20 px-2 py-2 text-sm">
                                            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                Program
                                            </div>
                                            <div className="font-semibold leading-5 text-foreground">
                                                {viewTarget.program_name ??
                                                    (viewTarget.program_id
                                                        ? `Program ${viewTarget.program_id}`
                                                        : "No program")}
                                            </div>
                                        </div>

                                        <div className="rounded-md border bg-muted/20 px-2 py-2 text-sm">
                                            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                Session
                                            </div>
                                            <div className="font-semibold leading-5 text-foreground">
                                                {viewTarget.academic_year_name ??
                                                    (viewTarget.academic_year_id
                                                        ? `Session ${viewTarget.academic_year_id}`
                                                        : "-")}
                                            </div>
                                        </div>

                                        <div className="rounded-md border bg-muted/20 px-2 py-2 text-sm">
                                            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                Exam Name
                                            </div>
                                            <div className="font-semibold leading-5 text-foreground">
                                                {viewTarget.exam_name || "-"}
                                            </div>
                                        </div>

                                        <div className="rounded-md border bg-muted/20 px-2 py-2 text-sm">
                                            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                Available years
                                            </div>
                                            <div className="font-semibold leading-5 text-foreground">
                                                {viewTarget.years_to_generate}
                                            </div>
                                        </div>

                                        <div className="rounded-md border bg-muted/20 px-2 py-2 text-sm">
                                            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                Status
                                            </div>
                                            <div className="font-semibold leading-5 text-foreground">
                                                {viewTarget.is_active ? "Active" : "Disabled"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : null}

                            <div className="px-2 py-2">
                                <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                                    <CheckCircle2 className="size-4 text-primary" />
                                    AI Response
                                </div>

                                {renderYearwiseCutoffs(viewTarget?.ai_response ?? null)}
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete cutoff?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove the selected cutoff record.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={bulkDeleteTargets.length > 0} onOpenChange={(open) => !bulkLoading && !open && setBulkDeleteTargets([])}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {bulkDeleteTargets.length} selected cutoffs?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will soft-delete the selected cutoff records.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={bulkLoading}>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={(e) => { e.preventDefault(); bulkDeleteCutoffs(); }} disabled={bulkLoading}>
                            Delete Selected
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
