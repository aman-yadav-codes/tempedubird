"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
    Building2,
    Eye,
    FileText,
    CalendarDays,
    CheckCircle2,
    Loader2,
    MoreHorizontal,
    PencilLine,
    Plus,
    Power,
    PowerOff,
    RefreshCw,
    Sparkles,
    Trash2,
    WandSparkles,
} from "lucide-react";
import { toast } from "sonner";

import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuthStore } from "@/store";
import { AiContentPreview } from "@/components/shared/ai-content-preview";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { } from "@/components/ui/card";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DataTable } from "@/components/ui/data-table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TemplateResizableHandle, TemplateResizablePanel, TemplateResizablePanelGroup } from "@/components/card-templates/template-resizable";
import { InstitutionProfile, InstitutionScholarship } from "@/lib/types/institution";
import type { AiScholarshipResponse } from "@/lib/types/ai";
import { cn } from "@/lib/utils";

function formatDate(value?: string) {
    if (!value) return "-";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

export default function ScholarshipsAdminPage() {
    const { isReady } = useAdminGuard();
    const isMobile = useIsMobile();
    const [isMounted, setIsMounted] = useState(false);
    const { accessToken } = useAuthStore();
    const { activeInstitution } = useActiveInstitution();
    const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

    const [items, setItems] = useState<InstitutionScholarship[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageCount, setPageCount] = useState(-1);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [editorOpen, setEditorOpen] = useState(false);
    const [editingScholarship, setEditingScholarship] = useState<InstitutionScholarship | null>(null);
    const [selectedInstitutionId, setSelectedInstitutionId] = useState("");
    const [selectedInstitutionLabel, setSelectedInstitutionLabel] = useState("");
    const [tweakMessage, setTweakMessage] = useState("");
    const [generatedContent, setGeneratedContent] = useState<AiScholarshipResponse | null>(null);
    const [isActive, setIsActive] = useState(true);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [viewTarget, setViewTarget] = useState<InstitutionScholarship | null>(null);
    const [viewSheetOpen, setViewSheetOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<InstitutionScholarship | null>(null);
    const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
    const isResizingPanelsRef = useRef(false);

    const fetchItems = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(pagination.pageIndex + 1),
                limit: String(pagination.pageSize),
                search: debouncedSearch,
            });
            if (activeInstitution) params.set("institutionId", String(activeInstitution.id));

            const res = await fetch(`/api/admin/institutions/scholarships?${params.toString()}`, {
                headers: authHeader,
            });
            const json = await res.json();
            if (res.ok) {
                setItems(json.data ?? []);
                setPageCount(json.pageCount ?? -1);
            } else {
                toast.error(json.error ?? "Failed to load scholarships");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    }, [accessToken, activeInstitution, authHeader, debouncedSearch, pagination.pageIndex, pagination.pageSize]);

    useEffect(() => {
        if (isReady) fetchItems();
    }, [fetchItems, isReady]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPagination((current) => ({ ...current, pageIndex: 0 }));
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const canUseResizablePanels = isMounted;

    const handleResizeStart = useCallback(() => {
        isResizingPanelsRef.current = true;
    }, []);

    const handleResizeEnd = useCallback(() => {
        isResizingPanelsRef.current = false;
    }, []);

    const redirectToAiSettings = useCallback((message = "Add API key first") => {
        toast.error(message);
        window.setTimeout(() => {
            window.location.href = "/admin/ai-settings";
        }, 450);
    }, []);

    useEffect(() => {
        if (!editorOpen) {
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
    }, [editorOpen, handleResizeEnd]);

    const resetEditor = () => {
        setEditingScholarship(null);
        setSelectedInstitutionId(activeInstitution ? String(activeInstitution.id) : "");
        setSelectedInstitutionLabel(activeInstitution?.name ?? "");
        setTweakMessage("");
        setGeneratedContent(null);
        setIsActive(true);
    };

    const openCreate = () => {
        resetEditor();
        setEditorOpen(true);
    };

    const openEdit = (item: InstitutionScholarship) => {
        setEditingScholarship(item);
        setSelectedInstitutionId(String(item.institution_id));
        setSelectedInstitutionLabel(item.institution_name ?? `Institution ${item.institution_id}`);
        setTweakMessage("");
        setGeneratedContent(item.ai_response);
        setIsActive(item.is_active);
        setEditorOpen(true);
    };

    const openView = (item: InstitutionScholarship) => {
        setViewTarget(item);
        setViewSheetOpen(true);
    };

    const handleViewSheetOpenChange = (open: boolean) => {
        setViewSheetOpen(open);
        if (!open) {
            window.setTimeout(() => setViewTarget(null), 180);
        }
    };

    const fetchInstitutions = async (search: string, page: number) => {
        const params = new URLSearchParams({
            page: String(page),
            limit: "10",
            search,
        });
        const res = await fetch(`/api/admin/institutions/profiles?${params.toString()}`, {
            headers: authHeader,
        });
        const json = await res.json();
        return {
            data: (json.data ?? []) as InstitutionProfile[],
            hasMore: page < (json.pageCount ?? 1),
        };
    };

    async function loadExistingScholarshipPreview(institutionId: string) {
        if (!institutionId) return;

        try {
            const params = new URLSearchParams({
                page: "1",
                limit: "1",
                institutionId,
            });
            const res = await fetch(`/api/admin/institutions/scholarships?${params.toString()}`, {
                headers: authHeader,
            });
            const json = await res.json();
            const existing = json?.data?.[0] as InstitutionScholarship | undefined;

            if (res.ok && existing) {
                setEditingScholarship(existing);
                setGeneratedContent(existing.ai_response ?? null);
                setIsActive(existing.is_active);
                return;
            }

            if (res.ok) {
                setEditingScholarship(null);
                setGeneratedContent(null);
                setIsActive(true);
            }
        } catch {
            // Keep the current editor state if the lookup fails.
        }
    }

    useEffect(() => {
        if (!editorOpen || !selectedInstitutionId) return;
        loadExistingScholarshipPreview(selectedInstitutionId);
    }, [editorOpen, selectedInstitutionId]);

    const generateScholarship = async () => {
        if (!selectedInstitutionId) {
            toast.error("Select an institution first");
            return;
        }

        setIsGenerating(true);
        try {
            const res = await fetch("/api/admin/ai/generate", {
                method: "POST",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({
                    contentTypeSlug: "scholarship",
                    institutionId: Number(selectedInstitutionId),
                    tweakMessage: tweakMessage.trim() || null,
                    inputContext: generatedContent ? JSON.stringify(generatedContent, null, 2) : null,
                }),
            });
            const json = await res.json();
            if (res.ok) {
                setGeneratedContent(json.data as AiScholarshipResponse);
                toast.success("Scholarship content generated");
            } else {
                if (json?.code === "AI_PROVIDER_NOT_CONFIGURED" || /api key/i.test(json?.error ?? "")) {
                    redirectToAiSettings(json.error ?? "Add API key first");
                    return;
                }
                toast.error(json.error ?? "Failed to generate scholarship content");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setIsGenerating(false);
        }
    };

    const saveScholarship = async () => {
        if (!selectedInstitutionId) {
            toast.error("Select an institution first");
            return;
        }
        if (!generatedContent) {
            toast.error("Generate content before saving");
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                institutionId: Number(selectedInstitutionId),
                aiResponse: generatedContent,
                isAiGenerated: true,
                isActive,
            };

            const url = editingScholarship ? `/api/admin/institutions/scholarships/${editingScholarship.id}` : "/api/admin/institutions/scholarships";
            const method = editingScholarship ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (res.ok) {
                toast.success(editingScholarship ? "Scholarship updated" : "Scholarship created");
                setEditorOpen(false);
                resetEditor();
                await fetchItems();
                if (json?.data) setViewTarget(json.data as InstitutionScholarship);
            } else {
                toast.error(json.error ?? "Failed to save scholarship");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleActive = async (item: InstitutionScholarship, nextValue: boolean) => {
        setActionLoadingId(item.id);
        try {
            const res = await fetch(`/api/admin/institutions/scholarships/${item.id}`, {
                method: "PATCH",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: nextValue }),
            });
            const json = await res.json();
            if (res.ok) {
                toast.success(nextValue ? "Scholarship enabled" : "Scholarship disabled");
                await fetchItems();
                if (viewTarget?.id === item.id && json?.data) {
                    setViewTarget(json.data as InstitutionScholarship);
                }
            } else {
                toast.error(json.error ?? "Failed to update scholarship");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setActionLoadingId(null);
        }
    };

    const deleteScholarship = async () => {
        if (!deleteTarget) return;

        try {
            const res = await fetch(`/api/admin/institutions/scholarships/${deleteTarget.id}`, {
                method: "DELETE",
                headers: authHeader,
            });
            const json = await res.json();
            if (res.ok) {
                toast.success("Scholarship deleted");
                setDeleteTarget(null);
                await fetchItems();
            } else {
                toast.error(json.error ?? "Failed to delete scholarship");
            }
        } catch {
            toast.error("Network error");
        }
    };

    const bulkDeleteScholarships = async (ids: number[], resetSelection: () => void) => {
        if (!ids.length) return;

        try {
            const res = await fetch(`/api/admin/institutions/scholarships`, {
                method: "PATCH",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({ ids, softDelete: true }),
            });
            const json = await res.json();
            if (res.ok) {
                toast.success("Scholarships deleted");
                resetSelection();
                await fetchItems();
            } else {
                toast.error(json.error ?? "Failed to delete scholarships");
            }
        } catch {
            toast.error("Network error");
        }
    };

    const columns: ColumnDef<InstitutionScholarship>[] = [
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
            accessorKey: "ai_response",
            header: "Preview",
            cell: ({ row }) => (
                <div className="max-w-[320px] space-y-1">
                    <div className="truncate text-sm font-medium text-foreground">
                        {row.original.ai_response?.description ?? "No description"}
                    </div>
                    <div className="line-clamp-2 wrap-break-word text-xs text-muted-foreground">
                        {row.original.ai_response?.eligibility?.[0] ?? "AI-generated scholarship content"}
                    </div>
                </div>
            ),
        },
        {
            accessorKey: "is_active",
            header: "Status",
            cell: ({ row }) => (
                <div className="flex flex-wrap gap-2">
                    <Badge className={cn(row.original.is_active ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500" : "border-rose-500/20 bg-rose-500/10 text-rose-500")}>
                        {row.original.is_active ? "Active" : "Disabled"}
                    </Badge>
                    <Badge variant="outline">{row.original.is_ai_generated ? "AI" : "Manual"}</Badge>
                </div>
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
                            <DropdownMenuItem onClick={() => openView(item)}>
                                <Eye className="mr-2 size-4" />
                                View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(item)}>
                                <PencilLine className="mr-2 size-4" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                disabled={actionLoadingId === item.id}
                                onClick={() => toggleActive(item, !item.is_active)}
                            >
                                {item.is_active ? (
                                    <>
                                        <PowerOff className="mr-2 size-4" />
                                        Disable
                                    </>
                                ) : (
                                    <>
                                        <Power className="mr-2 size-4" />
                                        Enable
                                    </>
                                )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(item)}>
                                <Trash2 className="mr-2 size-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];

    const selectedScholarshipActions = (selectedRows: InstitutionScholarship[], resetSelection: () => void) => (
        <Button
            variant="destructive"
            size="sm"
            onClick={() => bulkDeleteScholarships(selectedRows.map((row) => row.id), resetSelection)}
        >
            <Trash2 className="size-4" />
            Delete
        </Button>
    );

    const scholarshipData = viewTarget?.ai_response ?? null;
    const scholarshipSummaryItems = scholarshipData
        ? [
            { label: "Institution", value: viewTarget?.institution_name ?? `Institution ${viewTarget?.institution_id ?? "-"}`, icon: Building2 },
            { label: "Status", value: viewTarget?.is_active ? "Active" : "Disabled", icon: CheckCircle2 },
            { label: "Content", value: viewTarget?.is_ai_generated ? "AI generated" : "Manual", icon: WandSparkles },
            { label: "Updated", value: formatDate(viewTarget?.updated_at), icon: CalendarDays },
        ]
        : [];

    const renderScholarshipList = (items?: string[], variant: "bullet" | "numbered" = "bullet") => {
        if (!items?.length) {
            return <div className="text-sm text-muted-foreground">No data provided.</div>;
        }

        return (
            <ol className={cn("space-y-2", variant === "bullet" ? "list-disc pl-5" : "list-decimal pl-5")}>
                {items.map((item, index) => (
                    <li key={`${item}-${index}`} className="pl-1 text-sm leading-6 text-foreground wrap-break-word whitespace-normal">
                        {item}
                    </li>
                ))}
            </ol>
        );
    };

    return (
        <div className="space-y-6 w-full max-w-full">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Scholarships</h1>
                    <p className="text-sm text-muted-foreground">Generate scholarship content from the active AI provider, preview the structured JSON, and save it to the table.</p>
                </div>
                <div>
                    <Button onClick={openCreate} className="w-full gap-2 sm:w-auto">
                        <Plus className="size-4" />
                        New Scholarship
                    </Button>
                </div>
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
                filterPlaceholder="Search by institution or generated content..."
                toolbarLeft={
                    <Input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="Search scholarships..."
                        className="w-full sm:max-w-sm"
                    />
                }
                toolbarRight={
                    <Button variant="ghost" size="icon" onClick={fetchItems} disabled={loading} title="Refresh">
                        <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                }
                selectedActions={selectedScholarshipActions}
            />

            <Dialog open={editorOpen} onOpenChange={(open) => {
                if (!open && isResizingPanelsRef.current) return;
                setEditorOpen(open);
            }}>
                <DialogContent
                    showCloseButton={false}
                    className="flex h-[90dvh] max-h-[900px] w-[94vw] max-w-[1400px] flex-col gap-0 overflow-hidden rounded-lg border p-0 sm:max-w-[1400px] sm:p-0"
                    onPointerDownOutside={(event) => {
                        if (isResizingPanelsRef.current) {
                            event.preventDefault();
                        }
                    }}
                    onInteractOutside={(event) => {
                        if (isResizingPanelsRef.current) {
                            event.preventDefault();
                        }
                    }}
                >
                    <DialogHeader className="flex h-14 shrink-0 flex-row items-center justify-between border-b bg-background px-5 text-foreground">
                        <div>
                            <DialogTitle className="flex items-center gap-2">
                                <Sparkles className="size-4 text-primary" />
                                {editingScholarship ? "Edit Scholarship" : "Generate Scholarship"}
                            </DialogTitle>
                            <DialogDescription className="sr-only">
                                Generate scholarship content, preview the structured output, then save it.
                            </DialogDescription>
                        </div>
                        <DialogClose asChild>
                            <Button type="button" variant="ghost" size="icon">
                                <span aria-hidden="true" className="text-xl leading-none">&times;</span>
                                <span className="sr-only">Close scholarship generator</span>
                            </Button>
                        </DialogClose>
                    </DialogHeader>

                    <div className="min-h-0 min-w-0 flex-1 overflow-hidden bg-background text-foreground">
                        {canUseResizablePanels ? (
                            <TemplateResizablePanelGroup
                                id="scholarship-editor-layout"
                                direction={isMobile ? "vertical" : "horizontal"}
                                className="h-full min-h-0 min-w-0"
                            >
                                <TemplateResizablePanel defaultSize={isMobile ? "46%" : "30%"} minSize={isMobile ? "32%" : "22%"} className="min-h-0 min-w-0">
                                    <div className="flex h-full min-h-0 min-w-0 flex-col gap-5 overflow-y-auto p-5 md:p-7">
                                        <div>
                                            <h2 className="text-xl font-bold">Scholarship Setup</h2>
                                            <p className="mt-1 text-sm text-muted-foreground">Select an institution and generate verified scholarship content.</p>
                                        </div>
                                        <div className="space-y-5">
                                            <div className="space-y-2">
                                                <Label>Institution</Label>
                                                {activeInstitution ? (
                                                  <Input value={activeInstitution.name} disabled />
                                                ) : <AsyncSearchPopover<InstitutionProfile>
                                                    value={selectedInstitutionId}
                                                    onChange={(value) => {
                                                        setSelectedInstitutionId(value);
                                                        if (!value) {
                                                            setSelectedInstitutionLabel("");
                                                            setGeneratedContent(null);
                                                            setEditingScholarship(null);
                                                            setIsActive(true);
                                                        }
                                                    }}
                                                    selectedLabel={selectedInstitutionLabel}
                                                    onSelectItem={(item) => {
                                                        setSelectedInstitutionLabel(item.name);
                                                        setSelectedInstitutionId(String(item.id));
                                                    }}
                                                    placeholder="Select institution"
                                                    searchPlaceholder="Search institutions..."
                                                    emptyText="No institutions found"
                                                    fetcher={fetchInstitutions}
                                                    getValue={(item) => String(item.id)}
                                                    getLabel={(item) => item.name}
                                                />}
                                            </div>

                                            <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                                                <Checkbox checked={isActive} onCheckedChange={(checked) => setIsActive(!!checked)} />
                                                <div>
                                                    <div className="text-sm font-medium">Active</div>
                                                    <div className="text-xs text-muted-foreground">Inactive records stay in the table but are hidden from active flows.</div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <Label htmlFor="scholarship-tweak">Tweak message</Label>
                                                <Textarea
                                                    id="scholarship-tweak"
                                                    value={tweakMessage}
                                                    onChange={(event) => setTweakMessage(event.target.value)}
                                                    placeholder="Ask the AI to adjust tone, eligibility wording, or scholarship breakdown."
                                                    rows={6}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Button onClick={generateScholarship} disabled={!selectedInstitutionId || isGenerating} className="h-11 w-full gap-2 font-semibold">
                                                    {isGenerating ? <Loader2 className="size-4 animate-spin" /> : <WandSparkles className="size-4" />}
                                                    {generatedContent ? "Regenerate" : "Generate"}
                                                </Button>
                                                <Button variant="outline" onClick={resetEditor} disabled={isGenerating || isSaving} className="w-full">
                                                    Reset
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </TemplateResizablePanel>

                                <TemplateResizableHandle
                                    id={`scholarship-editor-separator-${isMobile ? "mobile" : "desktop"}`}
                                    onPointerDownCapture={handleResizeStart}
                                    onPointerUpCapture={handleResizeEnd}
                                    onPointerCancelCapture={handleResizeEnd}
                                />

                                <TemplateResizablePanel defaultSize={isMobile ? "54%" : "70%"} minSize={isMobile ? "32%" : "32%"} className="min-h-0 min-w-0">
                                    <div className="relative h-full min-w-0 bg-muted/20">
                                        {generatedContent && (
                                            <div className="absolute right-5 top-4 z-30 flex items-center overflow-hidden rounded-md border bg-background/95 text-foreground shadow-xl backdrop-blur">
                                                <Button onClick={saveScholarship} disabled={isSaving} variant="ghost" className="rounded-none">
                                                    {isSaving ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                                                    {editingScholarship ? "Update" : "Save"}
                                                </Button>
                                            </div>
                                        )}
                                        <div className="h-full min-h-0 overflow-y-auto">
                                            <div className="min-h-full border border-dashed border-transparent bg-background/40 p-5 md:p-7">
                                                <div className="mb-4 flex items-center justify-between gap-3">
                                                    <div>
                                                        <div className="text-sm font-semibold">Preview</div>
                                                        <div className="mt-1 text-xs text-muted-foreground">{generatedContent ? "Structured scholarship content" : "Generated content will appear here"}</div>
                                                    </div>
                                                    {generatedContent ? <Badge variant="outline">Ready</Badge> : <Badge variant="secondary">Empty</Badge>}
                                                </div>
                                                <div className="min-h-[calc(100%-4rem)]">
                                                    {generatedContent ? (
                                                        <AiContentPreview data={generatedContent} className="min-w-0" />
                                                    ) : (
                                                        <div className="flex min-h-[calc(90dvh-10rem)] items-center justify-center rounded-md border border-dashed bg-muted/20 px-3 py-8 text-center text-sm text-muted-foreground">
                                                            Generated content will appear here.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TemplateResizablePanel>
                            </TemplateResizablePanelGroup>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>

            <Sheet open={viewSheetOpen} onOpenChange={handleViewSheetOpenChange}>
                <SheetContent className="w-full overflow-y-auto overflow-x-hidden sm:max-w-5xl">
                    <div className="space-y-5 p-4 sm:p-5">
                        <SheetHeader className="space-y-3 border-b pb-4">
                            <div className="flex w-full flex-col gap-3">
                                <div className="flex w-full flex-col gap-2">
                                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                                        <Sparkles className="size-4 text-primary" />
                                        Scholarship details
                                    </div>
                                    <SheetTitle className="w-full text-2xl leading-tight">{viewTarget?.institution_name ?? "Scholarship"}</SheetTitle>
                                    <SheetDescription className="w-full max-w-none text-sm leading-6 text-foreground/90">
                                        {viewTarget ? `Generated or edited on ${formatDate(viewTarget.updated_at)}. Review the structured scholarship content below.` : "Scholarship preview"}
                                    </SheetDescription>
                                    {viewTarget && <div className="text-xs font-medium text-muted-foreground">ID: {viewTarget.id}</div>}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <Badge className={cn(viewTarget?.is_active ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-500" : "border-rose-500/20 bg-rose-500/10 text-rose-500")}>
                                        {viewTarget?.is_active ? "Active" : "Disabled"}
                                    </Badge>
                                    <Badge variant="outline" className="gap-1.5">
                                        <WandSparkles className="size-3.5" />
                                        {viewTarget?.is_ai_generated ? "AI generated" : "Manual"}
                                    </Badge>
                                </div>
                            </div>
                        </SheetHeader>

                        {scholarshipSummaryItems.length ? (
                            <div className="grid gap-2 sm:grid-cols-2">
                                {scholarshipSummaryItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <div key={item.label} className="rounded-lg border bg-card px-3 py-2 shadow-sm">
                                            <div className="flex items-start gap-2">
                                                <div className="mt-0.5 rounded-md border bg-muted/30 p-1.5 text-muted-foreground">
                                                    <Icon className="size-3.5" />
                                                </div>
                                                <div className="min-w-0 space-y-0.5">
                                                    <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{item.label}</div>
                                                    <div className="truncate text-sm font-semibold leading-5 text-foreground">{item.value}</div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : null}

                        <div className="space-y-6">
                            <div className="space-y-2 border-b pb-4">
                                <div className="flex items-center gap-2">
                                    <FileText className="size-4 text-primary" />
                                    <h3 className="text-sm font-semibold tracking-tight">Description</h3>
                                </div>
                                <p className="text-sm leading-7 text-muted-foreground">
                                    {scholarshipData?.description || "No description available."}
                                </p>
                            </div>

                            <div className="space-y-2 border-b pb-4">
                                <div className="flex items-center gap-2">
                                    <CheckCircle2 className="size-4 text-primary" />
                                    <h3 className="text-sm font-semibold tracking-tight">Eligibility</h3>
                                </div>
                                <p className="text-xs text-muted-foreground">Who can apply for this scholarship</p>
                                {renderScholarshipList(scholarshipData?.eligibility)}
                            </div>

                            <div className="space-y-2 border-b pb-4">
                                <div className="flex items-center gap-2">
                                    <WandSparkles className="size-4 text-primary" />
                                    <h3 className="text-sm font-semibold tracking-tight">Application Process</h3>
                                </div>
                                <p className="text-xs text-muted-foreground">Steps or workflow students should follow</p>
                                {renderScholarshipList(scholarshipData?.application_process, "numbered")}
                            </div>

                            <div className="space-y-2 border-b pb-4">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="size-4 text-primary" />
                                    <h3 className="text-sm font-semibold tracking-tight">Scholarship Amount</h3>
                                </div>
                                <p className="text-xs text-muted-foreground">Financial support details</p>
                                {renderScholarshipList(scholarshipData?.scholarship_amount)}
                            </div>

                            <div className="space-y-2 border-b pb-4">
                                <div className="flex items-center gap-2">
                                    <CalendarDays className="size-4 text-primary" />
                                    <h3 className="text-sm font-semibold tracking-tight">Financial Assistance</h3>
                                </div>
                                <p className="text-xs text-muted-foreground">Additional support or concessions</p>
                                {renderScholarshipList(scholarshipData?.financial_assistance)}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Building2 className="size-4 text-primary" />
                                    <h3 className="text-sm font-semibold tracking-tight">Required Documents</h3>
                                </div>
                                <p className="text-xs text-muted-foreground">Documents students should keep ready</p>
                                {renderScholarshipList(scholarshipData?.required_documents)}
                            </div>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete scholarship?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove the scholarship record and its generated JSON content.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={deleteScholarship}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
