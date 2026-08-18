"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import { Plus, Loader2, Edit2, Trash2, TrendingUp, Calendar, Landmark, GraduationCap, RefreshCw, MoreHorizontal, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/ui/data-table";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { InstitutionPlacement } from "@/lib/types/institution";

type InstitutionOption = {
    id: number;
    name?: string | null;
    organization_name?: string | null;
    slug?: string | null;
};

type AcademicYearOption = {
    id: number;
    name: string;
    start_date?: string | null;
    end_date?: string | null;
};

type ProgramOption = {
    id: number;
    title: string;
    slug?: string | null;
};

function getInstitutionLabel(item: InstitutionOption) {
    return item.name || item.organization_name || item.slug || `Institution #${item.id}`;
}

function getSessionYear(item: AcademicYearOption) {
    const match = item.name.match(/\d{4}/);
    if (match) return match[0];
    if (item.start_date) return String(new Date(item.start_date).getFullYear());
    return String(item.id);
}

function toNumber(value: string) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
}

function calculatePlacementPercentage(totalStudents: string, placedStudents: string) {
    const total = toNumber(totalStudents);
    const placed = toNumber(placedStudents);
    if (!total || total <= 0 || placed == null) return "";
    return ((placed / total) * 100).toFixed(2);
}

export default function PlacementsPage() {
    const { isReady } = useAdminGuard();
    const { accessToken, user: currentUser } = useAuthStore();
    const { activeInstitution, activeInstitutionId } = useActiveInstitution();
    const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
    const isPlatformAdmin = Boolean(currentUser?.is_super_admin || currentUser?.role_codes?.includes("platform_admin"));
    const lockToActiveInstitution = Boolean(activeInstitution && !isPlatformAdmin);

    const [items, setItems] = useState<InstitutionPlacement[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageCount, setPageCount] = useState(-1);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");
    const [institutionIdFilter, setInstitutionIdFilter] = useState<string>("");

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editing, setEditing] = useState<InstitutionPlacement | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<InstitutionPlacement | null>(null);
    const [viewTarget, setViewTarget] = useState<InstitutionPlacement | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [institutionId, setInstitutionId] = useState<string>("");
    const [institutionName, setInstitutionName] = useState<string>("");
    const [programId, setProgramId] = useState<string>("");
    const [programName, setProgramName] = useState<string>("");
    const [year, setYear] = useState<string>("");
    const [yearLabel, setYearLabel] = useState<string>("");
    const [averagePackage, setAveragePackage] = useState<string>("");
    const [highestPackage, setHighestPackage] = useState<string>("");
    const [lowestPackage, setLowestPackage] = useState<string>("");
    const [placementPercentage, setPlacementPercentage] = useState<string>("");
    const [totalStudents, setTotalStudents] = useState<string>("");
    const [placedStudents, setPlacedStudents] = useState<string>("");

    const updateTotalStudents = (value: string) => {
        setTotalStudents(value);
        setPlacementPercentage(calculatePlacementPercentage(value, placedStudents));
    };

    const updatePlacedStudents = (value: string) => {
        setPlacedStudents(value);
        setPlacementPercentage(calculatePlacementPercentage(totalStudents, value));
    };

    const fetchItems = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
            const q = new URLSearchParams({
                page: String(pagination.pageIndex + 1),
                limit: String(pagination.pageSize),
                search: debouncedSearch,
            });
            if (lockToActiveInstitution && activeInstitutionId) {
                q.set("institutionId", String(activeInstitutionId));
            } else if (institutionIdFilter) {
                q.set("institutionId", institutionIdFilter);
            }

            const res = await fetch(`/api/admin/institutions/placements?${q.toString()}`, { headers: authHeader });
            const json = await res.json();
            if (res.ok) {
                setItems(json.data || []);
                setPageCount(json.pageCount ?? -1);
            } else toast.error(json.error ?? "Failed to load placements");
        } catch {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    }, [accessToken, activeInstitutionId, authHeader, debouncedSearch, institutionIdFilter, lockToActiveInstitution, pagination.pageIndex, pagination.pageSize]);

    useEffect(() => {
        if (!isReady) return;
        const timeoutId = window.setTimeout(() => {
            void fetchItems();
        }, 0);
        return () => window.clearTimeout(timeoutId);
    }, [isReady, fetchItems]);

    useEffect(() => {
        const t = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPagination((p) => ({ ...p, pageIndex: 0 }));
        }, 300);
        return () => clearTimeout(t);
    }, [searchTerm]);

    const fetchInstitutions = useCallback(async (search: string, page: number) => {
        const res = await fetch(`/api/admin/institutions/profiles?search=${encodeURIComponent(search)}&page=${page}&limit=10`, { headers: authHeader });
        if (!res.ok) throw new Error("Failed to load institutions");
        const json = await res.json();
        return { data: (json.data ?? []) as InstitutionOption[], hasMore: page < json.pageCount };
    }, [authHeader]);

    const fetchAcademicYears = useCallback(async (search: string, page: number) => {
        if (!institutionId) return { data: [] as AcademicYearOption[], hasMore: false };
        const params = new URLSearchParams({
            search,
            page: String(page),
            limit: "10",
            institutionId,
        });
        const res = await fetch(`/api/admin/institutions/academic-years?${params.toString()}`, { headers: authHeader });
        if (!res.ok) throw new Error("Failed to load sessions");
        const json = await res.json();
        return { data: (json.data ?? []) as AcademicYearOption[], hasMore: page < json.pageCount };
    }, [authHeader, institutionId]);

    const fetchPrograms = useCallback(async (search: string, page: number) => {
        if (!institutionId) return { data: [] as ProgramOption[], hasMore: false };
        const params = new URLSearchParams({
            search,
            page: String(page),
            limit: "10",
            institutionId,
        });
        const res = await fetch(`/api/admin/institutions/programs?${params.toString()}`, { headers: authHeader });
        if (!res.ok) throw new Error("Failed to load programs");
        const json = await res.json();
        return { data: (json.data ?? []) as ProgramOption[], hasMore: page < json.pageCount };
    }, [authHeader, institutionId]);

    const resetForm = () => {
        setInstitutionId(lockToActiveInstitution && activeInstitutionId ? String(activeInstitutionId) : "");
        setInstitutionName(lockToActiveInstitution && activeInstitution ? activeInstitution.name : "");
        setProgramId("");
        setProgramName("");
        setYear("");
        setYearLabel("");
        setAveragePackage("");
        setHighestPackage("");
        setLowestPackage("");
        setPlacementPercentage("");
        setTotalStudents("");
        setPlacedStudents("");
    };

    const openCreate = () => {
        setEditing(null);
        resetForm();
        setDialogOpen(true);
    };

    const openEdit = (item: InstitutionPlacement) => {
        setEditing(item);
        setInstitutionId(String(item.institution_id));
        setInstitutionName(item.institution_name || `Institution #${item.institution_id}`);
        setProgramId(item.program_id ? String(item.program_id) : "");
        setProgramName(item.program_name || (item.program_id ? `Program #${item.program_id}` : ""));
        setYear(String(item.year ?? ""));
        setYearLabel(String(item.year ?? ""));
        setAveragePackage(item.average_package != null ? String(item.average_package) : "");
        setHighestPackage(item.highest_package != null ? String(item.highest_package) : "");
        setLowestPackage(item.lowest_package != null ? String(item.lowest_package) : "");
        setPlacementPercentage(item.placement_percentage != null ? String(item.placement_percentage) : "");
        setTotalStudents(item.total_students != null ? String(item.total_students) : "");
        setPlacedStudents(item.placed_students != null ? String(item.placed_students) : "");
        setDialogOpen(true);
    };

    const openView = (item: InstitutionPlacement) => {
        setViewTarget(item);
    };

    const handleSave = async () => {
        if (!institutionId || !programId || !year) return toast.error("Institution, program, and year are required");
        setSubmitting(true);

        const payload = {
            institutionId: Number(institutionId),
            programId: Number(programId),
            year: Number(year),
            averagePackage: averagePackage ? Number(averagePackage) : null,
            highestPackage: highestPackage ? Number(highestPackage) : null,
            lowestPackage: lowestPackage ? Number(lowestPackage) : null,
            placementPercentage: placementPercentage ? Number(placementPercentage) : null,
            totalStudents: totalStudents ? Number(totalStudents) : null,
            placedStudents: placedStudents ? Number(placedStudents) : null,
        };

        const url = editing ? `/api/admin/institutions/placements/${editing.id}` : `/api/admin/institutions/placements`;
        const method = editing ? "PATCH" : "POST";

        try {
            const res = await fetch(url, {
                method,
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            const json = await res.json();
            if (res.ok) {
                toast.success(editing ? "Updated placement successfully" : "Created placement successfully");
                setDialogOpen(false);
                await fetchItems();
            } else toast.error(json.error ?? "Failed to save placement");
        } catch {
            toast.error("Network error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/admin/institutions/placements/${deleteTarget.id}`, { method: "DELETE", headers: authHeader });
            const json = await res.json();
            if (res.ok) {
                toast.success("Placement deleted successfully");
                setDeleteTarget(null);
                await fetchItems();
            } else toast.error(json.error ?? "Failed to delete placement");
        } catch {
            toast.error("Network error");
        }
    };

    const columns: ColumnDef<InstitutionPlacement>[] = [
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
            accessorKey: "institution_name",
            header: "Institution",
            cell: ({ row }) => (
                <div className="font-medium text-foreground">
                    {row.original.institution_name || "-"}
                </div>
            ),
        },
        {
            accessorKey: "program_name",
            header: "Program",
            cell: ({ row }) => (
                <div className="font-medium text-foreground">
                    {row.original.program_name || (row.original.program_id ? `Program #${row.original.program_id}` : "-")}
                </div>
            ),
        },
        {
            accessorKey: "year",
            header: "Year",
            cell: ({ row }) => <Badge variant="outline" className="font-semibold">{row.getValue("year")}</Badge>,
        },
        {
            accessorKey: "average_package",
            header: "Avg Package (LPA)",
            cell: ({ row }) => (
                <span className="font-mono font-medium">
                    {row.getValue("average_package") != null ? `${row.getValue("average_package")} LPA` : "-"}
                </span>
            ),
        },
        {
            accessorKey: "highest_package",
            header: "Highest Package",
            cell: ({ row }) => (
                <span className="font-mono font-medium text-emerald-500">
                    {row.getValue("highest_package") != null ? `${row.getValue("highest_package")} LPA` : "-"}
                </span>
            ),
        },
        {
            accessorKey: "placement_percentage",
            header: "% Placed",
            cell: ({ row }) => (
                <span className="font-semibold text-sky-400">
                    {row.getValue("placement_percentage") != null ? `${row.getValue("placement_percentage")}%` : "-"}
                </span>
            ),
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-accent">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openView(row.original)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEdit(row.original)}>
                            <Edit2 className="mr-2 h-4 w-4" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteTarget(row.original)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ];

    return (
        <div className="space-y-6 w-full max-w-full">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Placements</h1>
                    <p className="text-sm text-muted-foreground">Manage yearly placement records, packages, and statistics for institutions.</p>
                </div>
                <div>
                    <Button onClick={openCreate} className="w-full sm:w-auto">
                        <Plus className="mr-2 h-4 w-4" /> New Placement
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-center">
                <Input
                    placeholder="Search by placement year..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                />
                {lockToActiveInstitution ? (
                    <Input value={activeInstitution?.name ?? "Selected institution"} disabled className="disabled:opacity-100" />
                ) : (
                    <AsyncSearchPopover<InstitutionOption>
                        value={institutionIdFilter}
                        onChange={(v) => setInstitutionIdFilter(v)}
                        placeholder="Filter by institution"
                        searchPlaceholder="Search institutions..."
                        fetcher={fetchInstitutions}
                        getValue={(item) => String(item.id)}
                        getLabel={getInstitutionLabel}
                    />
                )}
            </div>

            <DataTable
                columns={columns}
                data={items}
                loading={loading}
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
                            variant="destructive"
                            size="sm"
                            onClick={async () => {
                                if (confirm(`Are you sure you want to delete ${selectedRows.length} selected placements?`)) {
                                    const ids = selectedRows.map((r) => r.id);
                                    try {
                                        const res = await fetch("/api/admin/institutions/placements", {
                                            method: "PATCH",
                                            headers: { ...authHeader, "Content-Type": "application/json" },
                                            body: JSON.stringify({ ids, softDelete: true }),
                                        });
                                        if (res.ok) {
                                            toast.success("Successfully deleted selected placements");
                                            resetSelection();
                                            fetchItems();
                                        } else toast.error("Failed to delete placements");
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

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl! bg-card border border-border/80 backdrop-blur-2xl">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <TrendingUp className="size-5 text-primary" />
                            {editing ? "Edit Placement Record" : "New Placement Record"}
                        </DialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            {editing
                                ? "Update packages, selection details, student counts, and percentages."
                                : "Specify year, package stats, and student selection records for the selected institution."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                        <div className="space-y-2 md:col-span-2">
                            <Label className="text-sm font-medium flex items-center gap-1">
                                <Landmark className="h-3.5 w-3.5 text-muted-foreground" />
                                Institution *
                            </Label>
                            {lockToActiveInstitution ? (
                                <Input value={institutionName || activeInstitution?.name || "Selected institution"} disabled className="disabled:opacity-100" />
                            ) : (
                                <AsyncSearchPopover<InstitutionOption>
                                    value={institutionId}
                                    selectedLabel={institutionName}
                                    onChange={(v) => {
                                        setInstitutionId(v);
                                        if (!v) setInstitutionName("");
                                        setProgramId("");
                                        setProgramName("");
                                        setYear("");
                                        setYearLabel("");
                                    }}
                                    onSelectItem={(item) => setInstitutionName(getInstitutionLabel(item))}
                                    placeholder="Select institution"
                                    searchPlaceholder="Search institutions..."
                                    fetcher={fetchInstitutions}
                                    getValue={(item) => String(item.id)}
                                    getLabel={getInstitutionLabel}
                                />
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-1">
                                <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                                Program *
                            </Label>
                            <AsyncSearchPopover<ProgramOption>
                                value={programId}
                                selectedLabel={programName}
                                onChange={(value) => {
                                    setProgramId(value);
                                    if (!value) setProgramName("");
                                }}
                                onSelectItem={(item) => {
                                    setProgramId(String(item.id));
                                    setProgramName(item.title);
                                }}
                                placeholder={institutionId ? "Select program" : "Select institution first"}
                                searchPlaceholder="Search programs..."
                                emptyText={institutionId ? "No programs found" : "Choose an institution first"}
                                disabled={!institutionId}
                                fetcher={fetchPrograms}
                                getValue={(item) => String(item.id)}
                                getLabel={(item) => item.title}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                Session *
                            </Label>
                            <AsyncSearchPopover<AcademicYearOption>
                                value={year}
                                selectedLabel={yearLabel || year}
                                onChange={(value) => {
                                    setYear(value);
                                    if (!value) setYearLabel("");
                                }}
                                onSelectItem={(item) => {
                                    setYear(getSessionYear(item));
                                    setYearLabel(item.name);
                                }}
                                placeholder={institutionId ? "Select session" : "Select institution first"}
                                searchPlaceholder="Search sessions..."
                                emptyText="No sessions found"
                                disabled={!institutionId}
                                fetcher={fetchAcademicYears}
                                getValue={getSessionYear}
                                getLabel={(item) => item.name}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Average Package (LPA)</Label>
                            <Input placeholder="e.g. 6.5" value={averagePackage} onChange={(e) => setAveragePackage(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Highest Package (LPA)</Label>
                            <Input placeholder="e.g. 45.0" value={highestPackage} onChange={(e) => setHighestPackage(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Lowest Package (LPA)</Label>
                            <Input placeholder="e.g. 3.2" value={lowestPackage} onChange={(e) => setLowestPackage(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Total Students</Label>
                            <Input type="number" placeholder="e.g. 500" value={totalStudents} onChange={(e) => updateTotalStudents(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Placed Students</Label>
                            <Input type="number" placeholder="e.g. 420" value={placedStudents} onChange={(e) => updatePlacedStudents(e.target.value)} />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Placement Percentage (%)</Label>
                            <Input placeholder="e.g. 85.5" value={placementPercentage} onChange={(e) => setPlacementPercentage(e.target.value)} />
                        </div>

                    </div>

                    <div className="flex justify-end gap-3 mt-4 border-t pt-4">
                        <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave} disabled={submitting} className="min-w-25">
                            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save Changes" : "Create"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent className="bg-card border border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Placement Record?</AlertDialogTitle>
                        <DialogDescription className="text-sm text-muted-foreground">
                            This action cannot be undone. This will permanently remove the placement metrics for this year.
                        </DialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={handleDelete}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <Dialog open={!!viewTarget} onOpenChange={(open) => !open && setViewTarget(null)}>
                <DialogContent className="sm:max-w-2xl! bg-card border border-border/80 backdrop-blur-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Eye className="size-5 text-primary" />
                            Placement Details
                        </DialogTitle>
                        <DialogDescription>Read-only summary of the selected placement record.</DialogDescription>
                        {viewTarget && <div className="text-xs font-medium text-muted-foreground">ID: {viewTarget.id}</div>}
                    </DialogHeader>
                    {viewTarget ? (
                        <div className="grid gap-4 sm:grid-cols-2 py-2 text-sm">
                            <div className="rounded-lg border bg-muted/20 p-4">
                                <div className="text-muted-foreground">Institution</div>
                                <div className="mt-1 font-medium">{viewTarget.institution_name || `ID: ${viewTarget.institution_id}`}</div>
                            </div>
                            <div className="rounded-lg border bg-muted/20 p-4">
                                <div className="text-muted-foreground">Year</div>
                                <div className="mt-1 font-medium">{viewTarget.year}</div>
                            </div>
                            <div className="rounded-lg border bg-muted/20 p-4">
                                <div className="text-muted-foreground">Average Package</div>
                                <div className="mt-1 font-medium">{viewTarget.average_package ?? "-"} LPA</div>
                            </div>
                            <div className="rounded-lg border bg-muted/20 p-4">
                                <div className="text-muted-foreground">Highest Package</div>
                                <div className="mt-1 font-medium">{viewTarget.highest_package ?? "-"} LPA</div>
                            </div>
                            <div className="rounded-lg border bg-muted/20 p-4">
                                <div className="text-muted-foreground">Lowest Package</div>
                                <div className="mt-1 font-medium">{viewTarget.lowest_package ?? "-"} LPA</div>
                            </div>
                            <div className="rounded-lg border bg-muted/20 p-4">
                                <div className="text-muted-foreground">Placement Percentage</div>
                                <div className="mt-1 font-medium">{viewTarget.placement_percentage ?? "-"}%</div>
                            </div>
                            <div className="rounded-lg border bg-muted/20 p-4">
                                <div className="text-muted-foreground">Total Students</div>
                                <div className="mt-1 font-medium">{viewTarget.total_students ?? "-"}</div>
                            </div>
                            <div className="rounded-lg border bg-muted/20 p-4">
                                <div className="text-muted-foreground">Placed Students</div>
                                <div className="mt-1 font-medium">{viewTarget.placed_students ?? "-"}</div>
                            </div>
                        </div>
                    ) : null}
                </DialogContent>
            </Dialog>
        </div>
    );
}
