"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
    Building2,
    Eye,
    ImageIcon,
    Loader2,
    MoreHorizontal,
    PencilLine,
    Plus,
    RefreshCw,
    Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAuthStore } from "@/store";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { ImageUploader } from "@/components/shared/image-uploader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import type {
    InstitutionFacility,
    InstitutionFacilitySummary,
    InstitutionProfile,
    MasterType,
} from "@/lib/types/institution";
import { cn } from "@/lib/utils";

type InstitutionOption = Pick<InstitutionProfile, "id" | "name" | "organization_name" | "slug">;

type FacilityEditorItem = {
    facilityTypeId: number;
    facilityType: string;
    title: string;
    description: string;
    highlights: string[];
    media: Array<{ url: string; title: string; mediaType: "image" | "video" }>;
    isActive: boolean;
};

function institutionLabel(item: InstitutionOption) {
    return item.name || item.organization_name || item.slug || `Institution ${item.id}`;
}

function textValue(value: unknown) {
    if (value === null || value === undefined) return "";
    if (Array.isArray(value)) return value.map(textValue).find(Boolean) ?? "";
    return String(value).trim();
}

function stringItems(value: unknown) {
    if (Array.isArray(value)) return value.map(textValue).filter(Boolean);
    const text = textValue(value);
    return text ? text.split(/\r?\n/).map((item) => item.replace(/^[-*\d.)\s]+/, "").trim()).filter(Boolean) : [];
}

function normalizeAiFacilities(data: unknown, types: MasterType[], current: FacilityEditorItem[]) {
    const root = data && typeof data === "object" && !Array.isArray(data) ? data as Record<string, unknown> : {};
    const source = Array.isArray(root.facilities) ? root.facilities : [];
    const currentMap = new Map(current.map((item) => [item.facilityTypeId, item]));
    const byName = new Map(types.map((type) => [type.name.toLowerCase(), type]));

    return types.map((type) => {
        const generated = source.find((value) => {
            if (!value || typeof value !== "object" || Array.isArray(value)) return false;
            const record = value as Record<string, unknown>;
            const id = Number(record.facility_type_id ?? record.facilityTypeId);
            const name = textValue(record.facility_type ?? record.facilityType ?? record.type).toLowerCase();
            return id === type.id || byName.get(name)?.id === type.id;
        }) as Record<string, unknown> | undefined;
        const existing = currentMap.get(type.id);
        const generatedHighlights = stringItems(generated?.highlights ?? generated?.features);

        return {
            facilityTypeId: type.id,
            facilityType: type.name,
            title: textValue(generated?.title) || existing?.title || type.name,
            description: textValue(generated?.description ?? generated?.summary) || existing?.description || "",
            highlights: generatedHighlights.length ? generatedHighlights : existing?.highlights ?? [],
            media: existing?.media ?? [],
            isActive: existing?.isActive ?? true,
        } satisfies FacilityEditorItem;
    });
}

function fromStoredFacilities(rows: InstitutionFacility[]): FacilityEditorItem[] {
    return rows.map((row) => ({
        facilityTypeId: row.facility_type_id,
        facilityType: row.facility_type_name || `Facility ${row.facility_type_id}`,
        title: row.title || row.facility_type_name || "Facility",
        description: row.description || "",
        highlights: stringItems(row.ai_description?.highlights ?? row.ai_description?.features),
        media: (row.media ?? []).map((media) => ({
            url: media.url,
            title: media.title || row.title || row.facility_type_name || "Facility image",
            mediaType: media.media_type,
        })),
        isActive: row.is_active,
    }));
}

export default function InstitutionFacilitiesPage() {
    const { isReady } = useAdminGuard();
    const { accessToken } = useAuthStore();
    const { activeInstitution } = useActiveInstitution();
    const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);

    const [items, setItems] = useState<InstitutionFacilitySummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [pageCount, setPageCount] = useState(-1);
    const [search, setSearch] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [editorOpen, setEditorOpen] = useState(false);
    const [institutionId, setInstitutionId] = useState("");
    const [institutionName, setInstitutionName] = useState("");
    const [facilityTypes, setFacilityTypes] = useState<MasterType[]>([]);
    const [selectedTypeIds, setSelectedTypeIds] = useState<string[]>([]);
    const [roughNotes, setRoughNotes] = useState("");
    const [editorItems, setEditorItems] = useState<FacilityEditorItem[]>([]);
    const [editorLoading, setEditorLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [saving, setSaving] = useState(false);
    const [hasExistingFacilities, setHasExistingFacilities] = useState(false);

    const [viewOpen, setViewOpen] = useState(false);
    const [viewSummary, setViewSummary] = useState<InstitutionFacilitySummary | null>(null);
    const [viewFacilities, setViewFacilities] = useState<InstitutionFacility[]>([]);
    const [viewLoading, setViewLoading] = useState(false);

    const facilityOptions = useMemo<MultiSelectOption[]>(
        () => facilityTypes.map((type) => ({ value: String(type.id), label: type.name, description: type.slug })),
        [facilityTypes]
    );
    const selectedTypes = useMemo(
        () => selectedTypeIds
            .map((id) => facilityTypes.find((type) => type.id === Number(id)))
            .filter((type): type is MasterType => Boolean(type)),
        [facilityTypes, selectedTypeIds]
    );

    const fetchItems = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(pagination.pageIndex + 1),
                limit: String(pagination.pageSize),
                search: debouncedSearch,
            });
            if (activeInstitution) {
                params.set("institutionId", String(activeInstitution.id));
                params.set("view", "summary");
            }
            const res = await fetch(`/api/admin/institutions/facilities?${params.toString()}`, { headers: authHeader });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Failed to load facilities");
            setItems(json.data ?? []);
            setPageCount(json.pageCount ?? -1);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Network error");
        } finally {
            setLoading(false);
        }
    }, [accessToken, activeInstitution, authHeader, debouncedSearch, pagination.pageIndex, pagination.pageSize]);

    useEffect(() => {
        if (!isReady) return;
        const timer = window.setTimeout(() => void fetchItems(), 0);
        return () => window.clearTimeout(timer);
    }, [fetchItems, isReady]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearch(search);
            setPagination((current) => ({ ...current, pageIndex: 0 }));
        }, 300);
        return () => window.clearTimeout(timer);
    }, [search]);

    const fetchInstitutions = useCallback(async (query: string, page: number) => {
        const res = await fetch(`/api/admin/institutions/facilities/options?kind=institutions&search=${encodeURIComponent(query)}&page=${page}&limit=10`, {
            headers: authHeader,
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load institutions");
        return { data: (json.data ?? []) as InstitutionOption[], hasMore: page < (json.pageCount ?? 1) };
    }, [authHeader]);

    const loadFacilityTypes = useCallback(async () => {
        const res = await fetch("/api/admin/institutions/facilities/options?kind=facility-types", { headers: authHeader });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load facility types");
        setFacilityTypes(json.data ?? []);
        return (json.data ?? []) as MasterType[];
    }, [authHeader]);

    const loadInstitutionFacilities = useCallback(async (id: number, types?: MasterType[]) => {
        const res = await fetch(`/api/admin/institutions/facilities?institutionId=${id}`, { headers: authHeader });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Failed to load institution facilities");
        const rows = (json.data ?? []) as InstitutionFacility[];
        setHasExistingFacilities(rows.length > 0);
        setSelectedTypeIds(rows.map((row) => String(row.facility_type_id)));
        setEditorItems(fromStoredFacilities(rows));
        if (!rows.length && types?.length) setEditorItems([]);
        return rows;
    }, [authHeader]);

    const resetEditor = () => {
        setInstitutionId(activeInstitution ? String(activeInstitution.id) : "");
        setInstitutionName(activeInstitution?.name ?? "");
        setSelectedTypeIds([]);
        setRoughNotes("");
        setEditorItems([]);
        setHasExistingFacilities(false);
    };

    const openCreate = async () => {
        resetEditor();
        setEditorOpen(true);
        setEditorLoading(true);
        try {
            const types = await loadFacilityTypes();
            if (activeInstitution) await loadInstitutionFacilities(activeInstitution.id, types);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to load facility types");
        } finally {
            setEditorLoading(false);
        }
    };

    const openEdit = async (summary: InstitutionFacilitySummary) => {
        resetEditor();
        setInstitutionId(String(summary.institution_id));
        setInstitutionName(summary.institution_name);
        setEditorOpen(true);
        setEditorLoading(true);
        try {
            const types = await loadFacilityTypes();
            await loadInstitutionFacilities(summary.institution_id, types);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to load facilities");
        } finally {
            setEditorLoading(false);
        }
    };

    const handleInstitutionChange = async (value: string) => {
        setInstitutionId(value);
        setSelectedTypeIds([]);
        setEditorItems([]);
        if (!value) return;
        setEditorLoading(true);
        try {
            await loadInstitutionFacilities(Number(value), facilityTypes);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to load facilities");
        } finally {
            setEditorLoading(false);
        }
    };

    const syncSelectedTypes = (values: string[]) => {
        setSelectedTypeIds(values);
        const types = values
            .map((value) => facilityTypes.find((type) => type.id === Number(value)))
            .filter((type): type is MasterType => Boolean(type));
        setEditorItems((current) => normalizeAiFacilities({ facilities: [] }, types, current));
    };

    const generateWithAi = async () => {
        if (!institutionId) return toast.error("Select an institution first");
        if (!selectedTypes.length) return toast.error("Select at least one facility type");

        setGenerating(true);
        try {
            const res = await fetch("/api/admin/ai/generate", {
                method: "POST",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({
                    contentTypeSlug: "institution-facilities",
                    institutionId: Number(institutionId),
                    inputContext: JSON.stringify({
                        institution_name: institutionName,
                        selected_facility_types: selectedTypes.map((type) => ({
                            facility_type_id: type.id,
                            facility_type: type.name,
                            slug: type.slug,
                        })),
                        rough_notes: roughNotes.trim() || null,
                        existing_content: editorItems,
                        rules: [
                            "Return exactly one facility object for each selected facility type.",
                            "Preserve each provided facility_type_id.",
                            "Do not invent exact counts or specifications unless rough notes provide them.",
                        ],
                    }, null, 2),
                }),
            });
            const json = await res.json();
            if (!res.ok) {
                if (json.code === "AI_PROVIDER_NOT_CONFIGURED") {
                    toast.error("Add API key first");
                    window.setTimeout(() => { window.location.href = "/admin/ai-settings"; }, 450);
                    return;
                }
                throw new Error(json.error ?? "Failed to generate facility content");
            }
            setEditorItems(normalizeAiFacilities(json.data, selectedTypes, editorItems));
            toast.success("Facility content generated");
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Network error");
        } finally {
            setGenerating(false);
        }
    };

    const updateEditorItem = (facilityTypeId: number, patch: Partial<FacilityEditorItem>) => {
        setEditorItems((current) => current.map((item) => item.facilityTypeId === facilityTypeId ? { ...item, ...patch } : item));
    };

    const saveFacilities = async () => {
        if (!institutionId) return toast.error("Select an institution first");

        setSaving(true);
        try {
            const res = await fetch("/api/admin/institutions/facilities", {
                method: hasExistingFacilities ? "PUT" : "POST",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({
                    institutionId: Number(institutionId),
                    facilities: editorItems.map((item, index) => ({
                        facilityTypeId: item.facilityTypeId,
                        title: item.title,
                        description: item.description,
                        aiDescription: {
                            facility_type: item.facilityType,
                            highlights: item.highlights,
                            rough_notes: roughNotes.trim() || null,
                        },
                        media: item.media.map((media, mediaIndex) => ({
                            mediaType: media.mediaType,
                            url: media.url,
                            title: media.title,
                            sortOrder: mediaIndex,
                        })),
                        displayOrder: index,
                        isActive: item.isActive,
                    })),
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Failed to save facilities");
            toast.success("Facilities saved");
            setEditorOpen(false);
            await fetchItems();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Network error");
        } finally {
            setSaving(false);
        }
    };

    const openView = async (summary: InstitutionFacilitySummary) => {
        setViewSummary(summary);
        setViewOpen(true);
        setViewLoading(true);
        try {
            const res = await fetch(`/api/admin/institutions/facilities?institutionId=${summary.institution_id}`, { headers: authHeader });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? "Failed to load facility details");
            setViewFacilities(json.data ?? []);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Network error");
        } finally {
            setViewLoading(false);
        }
    };

    const columns: ColumnDef<InstitutionFacilitySummary>[] = [
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
                <Checkbox checked={row.getIsSelected()} onCheckedChange={(value) => row.toggleSelected(!!value)} aria-label="Select row" />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "institution_name",
            header: "Institution",
            cell: ({ row }) => <div className="font-medium">{row.original.institution_name}</div>,
        },
        {
            accessorKey: "facility_count",
            header: "Facilities",
            cell: ({ row }) => <Badge variant="outline">{row.original.facility_count}</Badge>,
        },
        {
            accessorKey: "media_count",
            header: "Media",
            cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.media_count}</span>,
        },
        {
            accessorKey: "is_active",
            header: "Status",
            cell: ({ row }) => (
                <Badge className={cn(row.original.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                    {row.original.is_active ? "Active" : "Disabled"}
                </Badge>
            ),
        },
        {
            accessorKey: "updated_at",
            header: "Updated",
            cell: ({ row }) => (
                <span className="text-sm text-muted-foreground">
                    {row.original.updated_at ? new Date(row.original.updated_at).toLocaleDateString() : "-"}
                </span>
            ),
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8"><MoreHorizontal className="size-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openView(row.original)}>
                            <Eye className="mr-2 size-4" /> View Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(row.original)}>
                            <PencilLine className="mr-2 size-4" /> Manage Facilities
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];

    return (
        <div className="w-full max-w-full space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Institution Facilities</h1>
                    <p className="text-sm text-muted-foreground">Manage facility content and separate image galleries for each institution.</p>
                </div>
                <Button onClick={openCreate} className="w-full sm:w-auto">
                    <Plus className="mr-2 size-4" /> Add Facilities
                </Button>
            </div>

            <DataTable
                columns={columns}
                data={items}
                loading={loading}
                pagination={pagination}
                onPaginationChange={setPagination}
                pageCount={pageCount}
                showRowNumbers
                toolbarLeft={
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search institutions..."
                        className="w-full sm:w-72"
                    />
                }
                toolbarRight={
                    <Button variant="ghost" size="icon" onClick={fetchItems} disabled={loading} title="Refresh">
                        <RefreshCw className={cn("size-4", loading && "animate-spin")} />
                    </Button>
                }
            />

            <Dialog open={editorOpen} onOpenChange={(open) => {
                setEditorOpen(open);
                if (!open) resetEditor();
            }}>
                <DialogContent className="max-h-[94vh] overflow-y-auto bg-card p-0 sm:max-w-7xl!">
                    <DialogHeader className="border-b px-6 py-5">
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="size-5 text-primary" />
                            Manage Institution Facilities
                        </DialogTitle>
                        <DialogDescription>Select facility types, generate descriptions, and upload images separately for every facility.</DialogDescription>
                    </DialogHeader>

                    <div className="grid min-h-[680px] lg:grid-cols-2">
                        <div className="space-y-5 border-b p-6 lg:border-r lg:border-b-0">
                            <div className="space-y-2">
                                <Label>Institution</Label>
                                {activeInstitution ? (
                                  <Input value={activeInstitution.name} disabled />
                                ) : <AsyncSearchPopover<InstitutionOption>
                                    value={institutionId}
                                    selectedLabel={institutionName || undefined}
                                    onChange={(value) => {
                                        void handleInstitutionChange(value);
                                        if (!value) setInstitutionName("");
                                    }}
                                    onSelectItem={(item) => setInstitutionName(institutionLabel(item))}
                                    placeholder="Select institution"
                                    searchPlaceholder="Search institutions..."
                                    fetcher={fetchInstitutions}
                                    getValue={(item) => String(item.id)}
                                    getLabel={institutionLabel}
                                />}
                            </div>

                            <div className="space-y-2">
                                <Label>Facility Types</Label>
                                <MultiSelect
                                    value={selectedTypeIds}
                                    selectedOptions={facilityOptions.filter((option) => selectedTypeIds.includes(option.value))}
                                    options={facilityOptions}
                                    onValueChange={syncSelectedTypes}
                                    placeholder={editorLoading ? "Loading facility types..." : "Select facility types..."}
                                    emptyIndicator="No facility types found"
                                    loading={editorLoading}
                                    maxCount={4}
                                    deduplicateOptions
                                    className="w-full"
                                    popoverClassName="w-[var(--radix-popover-trigger-width)]"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Rough facility details</Label>
                                <Textarea
                                    value={roughNotes}
                                    onChange={(event) => setRoughNotes(event.target.value)}
                                    placeholder="Example: library has a reading room, laboratory has modern equipment, sports ground is available..."
                                    rows={8}
                                    className="resize-none"
                                />
                            </div>

                            <Button onClick={generateWithAi} disabled={generating || editorLoading || !institutionId || !selectedTypeIds.length} className="h-11 w-full gap-2">
                                {generating ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                                Generate all with AI
                            </Button>
                        </div>

                        <div className="min-w-0 p-6">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h3 className="font-semibold">Facility Preview</h3>
                                    <p className="text-sm text-muted-foreground">Edit content and upload an image for each facility.</p>
                                </div>
                                <Badge variant="outline">{editorItems.length} facilities</Badge>
                            </div>

                            <div className="max-h-[66vh] space-y-4 overflow-y-auto pr-1">
                                {editorLoading ? (
                                    [0, 1, 2].map((item) => (
                                        <div key={item} className="rounded-md border p-4">
                                            <div className="h-5 w-36 animate-pulse rounded bg-muted" />
                                            <div className="mt-3 h-20 animate-pulse rounded bg-muted" />
                                        </div>
                                    ))
                                ) : editorItems.length ? editorItems.map((item) => (
                                    <div key={item.facilityTypeId} className="space-y-4 rounded-md border bg-background/40 p-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <Badge variant="outline">{item.facilityType}</Badge>
                                            <label className="flex items-center gap-2 text-sm">
                                                <Checkbox
                                                    checked={item.isActive}
                                                    onCheckedChange={(value) => updateEditorItem(item.facilityTypeId, { isActive: Boolean(value) })}
                                                />
                                                Active
                                            </label>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Title</Label>
                                            <Input value={item.title} onChange={(event) => updateEditorItem(item.facilityTypeId, { title: event.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Description</Label>
                                            <Textarea
                                                value={item.description}
                                                onChange={(event) => updateEditorItem(item.facilityTypeId, { description: event.target.value })}
                                                rows={4}
                                                className="resize-none"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Facility Image</Label>
                                            <ImageUploader
                                                value={item.media[0]?.url ?? ""}
                                                onChange={(url) => updateEditorItem(item.facilityTypeId, {
                                                    media: url ? [{ url, title: `${item.title} image`, mediaType: "image" }] : [],
                                                })}
                                                accessToken={accessToken}
                                                label={`${item.facilityType} image`}
                                                aspectRatio={16 / 9}
                                            />
                                        </div>
                                    </div>
                                )) : (
                                    <div className="grid min-h-[420px] place-items-center rounded-md border border-dashed text-center text-sm text-muted-foreground">
                                        Select facility types to prepare the facility profiles.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 border-t px-6 py-4">
                        <Button variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
                        <Button onClick={saveFacilities} disabled={saving || editorLoading || !institutionId}>
                            {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Save Facilities
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <Sheet open={viewOpen} onOpenChange={(open) => {
                setViewOpen(open);
                if (!open) {
                    setViewSummary(null);
                    setViewFacilities([]);
                }
            }}>
                <SheetContent
                    className="h-dvh w-full gap-0 overflow-hidden bg-card p-0 sm:max-w-3xl"
                    defaultSize={760}
                    minSize={540}
                    maxSize={1040}
                    resizeStorageKey="institution-facilities-sheet-width"
                >
                    <SheetHeader className="border-b px-6 py-5 pr-12">
                        <SheetTitle className="flex items-center gap-2">
                            <Building2 className="size-5 text-primary" />
                            Facility Profile
                        </SheetTitle>
                        <SheetDescription>{viewSummary?.institution_name || "Institution facility details"}</SheetDescription>
                    </SheetHeader>

                    <div className="h-[calc(100dvh-94px)] overflow-y-auto p-6">
                        {viewLoading ? (
                            <div className="space-y-4">
                                {[0, 1, 2].map((item) => <div key={item} className="h-40 animate-pulse rounded-md bg-muted" />)}
                            </div>
                        ) : viewFacilities.length ? (
                            <div className="space-y-5">
                                <div className="rounded-md border bg-background/40 p-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-lg font-semibold">{viewSummary?.institution_name}</h2>
                                            <p className="text-sm text-muted-foreground">{viewFacilities.length} configured facilities</p>
                                        </div>
                                        <Badge className={cn(viewSummary?.is_active ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500")}>
                                            {viewSummary?.is_active ? "Active" : "Disabled"}
                                        </Badge>
                                    </div>
                                </div>

                                {viewFacilities.map((facility) => (
                                    <section key={facility.id} className="overflow-hidden rounded-md border bg-background/30">
                                        {(facility.media?.[0]?.url || facility.image_url) ? (
                                            <div className="aspect-video w-full bg-muted">
                                                {/* Facility media can be hosted by the configured upload provider. */}
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img
                                                    src={facility.media?.[0]?.url || facility.image_url || ""}
                                                    alt={facility.title || facility.facility_type_name || "Facility"}
                                                    className="h-full w-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <div className="grid aspect-[3/1] place-items-center bg-muted/30">
                                                <ImageIcon className="size-8 text-muted-foreground" />
                                            </div>
                                        )}
                                        <div className="space-y-3 p-5">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <h3 className="text-lg font-semibold">{facility.title || facility.facility_type_name}</h3>
                                                <div className="flex gap-2">
                                                    <Badge variant="outline">{facility.facility_type_name}</Badge>
                                                    <Badge variant={facility.is_active ? "default" : "secondary"}>
                                                        {facility.is_active ? "Active" : "Inactive"}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                                                {facility.description || "No description added."}
                                            </p>
                                            {stringItems(facility.ai_description?.highlights).length ? (
                                                <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                                                    {stringItems(facility.ai_description?.highlights).map((highlight, index) => (
                                                        <li key={`${facility.id}-${index}`}>{highlight}</li>
                                                    ))}
                                                </ul>
                                            ) : null}
                                        </div>
                                    </section>
                                ))}
                            </div>
                        ) : (
                            <div className="grid min-h-[420px] place-items-center rounded-md border border-dashed text-sm text-muted-foreground">
                                No facilities configured for this institution.
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </div>
    );
}
