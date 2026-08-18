"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import { MapPin, Plus, Loader2, Trash2, RefreshCw, Power, PowerOff, Edit, MoreHorizontal } from "lucide-react";
import { StatsCards } from "@/components/master-data/stats-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Location, LocationType } from "@/lib/types/location";
import { capitalize } from "@/lib/utils/capitalize";
import { AsyncSearchPopover } from "@/components/shared/async-search-popover";

const LOCATION_TYPES: LocationType[] = ["state", "city", "area"];

function toSlug(text: string) {
    return text
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

function buildColumns(
    setDeleteTarget: (l: Location) => void,
    setEditingLocation: (l: Location) => void,
    handleToggleStatus: (location: Location) => Promise<void>,
    activeLoadingId: number | null,
    openDropdownId: number | null,
    setOpenDropdownId: (id: number | null) => void,
    setActiveLoadingId: (id: number | null) => void
): ColumnDef<Location>[] {
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
                    onCheckedChange={(value) =>
                        table.toggleAllPageRowsSelected(!!value)
                    }
                    aria-label="Select all locations"
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(value) =>
                        row.toggleSelected(!!value)
                    }
                    aria-label="Select location"
                />
            ),
            enableSorting: false,
            enableHiding: false,
        },
        {
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => {
                const name = row.getValue("name") as string;
                return (
                    <div className="max-w-[320px]">
                        <span
                            className="font-medium truncate block"
                            title={name}
                        >
                            {name}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: "type",
            header: "Type",
            cell: ({ row }) => {
                const type = row.getValue("type") as string;
                return (
                    <Badge variant="outline" className="capitalize">
                        {type}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "location_scope",
            header: "Scope",
            cell: ({ row }) => {
                const scope = row.original.location_scope || "global";
                let badgeClass = "bg-blue-100 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";
                if (scope === "seo") {
                    badgeClass = "bg-purple-100 text-purple-700 hover:bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400";
                } else if (scope === "user") {
                    badgeClass = "bg-teal-100 text-teal-700 hover:bg-teal-100 dark:bg-teal-900/30 dark:text-teal-400";
                } else if (scope === "institution") {
                    badgeClass = "bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400";
                }
                return (
                    <Badge variant="default" className={`capitalize ${badgeClass}`}>
                        {scope}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "parent_name",
            header: "Parent Location",
            cell: ({ row }) => {
                const parentName = row.getValue("parent_name") as string | null;
                const parentId = row.original.parent_id;
                return (
                    <span className="text-sm text-muted-foreground">
                        {parentName ? `${parentName} (ID: ${parentId})` : "-"}
                    </span>
                );
            },
        },
        {
            id: "status",
            header: "Status",
            cell: ({ row }) => {
                const location = row.original;
                return (
                    <Badge
                        variant="default"
                        className={
                            location.is_active
                                ? "bg-green-100 text-green-700 hover:bg-green-100"
                                : "bg-red-100 text-red-700 hover:bg-red-100"
                        }
                    >
                        {location.is_active ? "Active" : "Disabled"}
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
            enableHiding: false,
            cell: ({ row }) => {
                const location = row.original;
                return (
                    <DropdownMenu
                        open={openDropdownId === location.id}
                        onOpenChange={(isOpen) => setOpenDropdownId(isOpen ? location.id : null)}
                    >
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setEditingLocation(location)}>
                                <span>Edit</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                disabled={activeLoadingId === location.id}
                                onSelect={(e) => {
                                    e.preventDefault();
                                    setActiveLoadingId(location.id);
                                    handleToggleStatus(location).finally(() => setActiveLoadingId(null));
                                }}
                            >
                                {activeLoadingId === location.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                <span>{location.is_active ? "Disable location" : "Enable location"}</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteTarget(location)}
                            >
                                <span>Delete</span>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];
}

export default function LocationsPage() {
    const { isReady } = useAdminGuard();
    const { accessToken } = useAuthStore();

    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageCount, setPageCount] = useState(-1);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [stats, setStats] = useState<{ total: number; active: number; disabled: number; deleted: number } | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [type, setType] = useState<LocationType>("state");
    const [parentId, setParentId] = useState("");
    const [parentLabel, setParentLabel] = useState("");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [locationScope, setLocationScope] = useState<string>("global");
    const [scopeFilter, setScopeFilter] = useState<string>("all");
    const [submitting, setSubmitting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Location | null>(null);
    const [bulkDeleteTargets, setBulkDeleteTargets] = useState<Location[]>([]);
    const [bulkLoading, setBulkLoading] = useState(false);
    const [editingLocation, setEditingLocation] = useState<Location | null>(null);
    const [activeLoadingId, setActiveLoadingId] = useState<number | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);
    const bulkResetSelectionRef = useRef<(() => void) | null>(null);

    const authHeader = { Authorization: `Bearer ${accessToken}` };

    const fetchStats = useCallback(async () => {
        if (!accessToken) return;
        setStatsLoading(true);
        try {
            const res = await fetch("/api/admin/master-data/locations/stats", {
                headers: authHeader,
            });
            const json = await res.json();
            if (res.ok) {
                setStats(json.data);
            }
        } catch {
            console.error("Failed to fetch stats");
        } finally {
            setStatsLoading(false);
        }
    }, [accessToken]);

    const fetchLocations = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
            const scopesParam = scopeFilter !== "all" ? `&scopes=${scopeFilter}` : "";
            const res = await fetch(
                `/api/admin/master-data/locations?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}&search=${encodeURIComponent(debouncedSearch)}${scopesParam}`,
                { headers: authHeader }
            );
            const json = await res.json();
            if (res.ok) {
                setLocations(json.data);
                setPageCount(json.pageCount);
            } else {
                toast.error(json.error ?? "Failed to load locations");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    }, [accessToken, pagination.pageIndex, pagination.pageSize, debouncedSearch, scopeFilter]);

    useEffect(() => {
        if (isReady) {
            fetchLocations();
        }
    }, [isReady, fetchLocations]);

    useEffect(() => {
        if (isReady) {
            fetchStats();
        }
    }, [isReady]);

    useEffect(() => {
        const timeout = setTimeout(() => {
            setDebouncedSearch(searchTerm);
            setPagination((prev) => ({
                ...prev,
                pageIndex: 0,
            }));
        }, 300);

        return () => clearTimeout(timeout);
    }, [searchTerm]);

    useEffect(() => {
        if (editingLocation) {
            setName(editingLocation.name);
            setSlug(editingLocation.slug);
            setType(editingLocation.type);
            setParentId(editingLocation.parent_id ? String(editingLocation.parent_id) : "");
            setParentLabel(editingLocation.parent_name || "");
            setLatitude(editingLocation.latitude || "");
            setLongitude(editingLocation.longitude || "");
            setLocationScope(editingLocation.location_scope || "global");
        }
    }, [editingLocation]);

    const handleAddLocation = async () => {
        if (!name.trim() || !slug.trim() || !type) {
            toast.error("Please fill in required fields");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/admin/master-data/locations", {
                method: "POST",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: capitalize(name.trim()),
                    slug: slug.trim(),
                    type,
                    parent_id: parentId ? parseInt(parentId) : null,
                    latitude: latitude ? parseFloat(latitude) : null,
                    longitude: longitude ? parseFloat(longitude) : null,
                    location_scope: locationScope,
                }),
            });

            const json = await res.json();

            if (res.ok) {
                toast.success("Location added successfully");
                setName("");
                setSlug("");
                setType("state");
                setParentId("");
                setParentLabel("");
                setLatitude("");
                setLongitude("");
                setLocationScope("global");
                setDialogOpen(false);
                await fetchLocations();
                await fetchStats();
            } else {
                toast.error(json.error ?? "Failed to add location");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleUpdateLocation = async () => {
        if (!editingLocation || !name.trim() || !slug.trim() || !type) {
            toast.error("Please fill in required fields");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/admin/master-data/locations/${editingLocation.id}`, {
                method: "PATCH",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: capitalize(name.trim()),
                    slug: slug.trim(),
                    type,
                    parent_id: parentId ? parseInt(parentId) : null,
                    latitude: latitude ? parseFloat(latitude) : null,
                    longitude: longitude ? parseFloat(longitude) : null,
                    location_scope: locationScope,
                }),
            });

            const json = await res.json();

            if (res.ok) {
                toast.success("Location updated successfully");
                setName("");
                setSlug("");
                setType("state");
                setParentId("");
                setParentLabel("");
                setLatitude("");
                setLongitude("");
                setLocationScope("global");
                setEditingLocation(null);
                await fetchLocations();
                await fetchStats();
            } else {
                toast.error(json.error ?? "Failed to update location");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteLocation = async () => {
        if (!deleteTarget) return;

        try {
            const res = await fetch(`/api/admin/master-data/locations/${deleteTarget.id}`, {
                method: "DELETE",
                headers: authHeader,
            });

            if (res.ok) {
                toast.success("Location deleted successfully");
                setDeleteTarget(null);
                await fetchLocations();
                await fetchStats();
            } else {
                const json = await res.json();
                toast.error(json.error ?? "Failed to delete location");
            }
        } catch {
            toast.error("Network error");
        }
    };

    const handleToggleStatus = async (location: Location) => {
        try {
            const res = await fetch(`/api/admin/master-data/locations/${location.id}`, {
                method: "PATCH",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({ is_active: !location.is_active }),
            });

            if (res.ok) {
                toast.success(`Location ${!location.is_active ? "enabled" : "disabled"}`);
                await fetchLocations();
                await fetchStats();
            } else {
                const json = await res.json();
                toast.error(json.error ?? "Failed to update location");
            }
        } catch {
            toast.error("Network error");
        }
    };

    async function handleBulkStatus(
        selectedRows: Location[],
        isActive: boolean,
        resetSelection: () => void
    ) {
        setBulkLoading(true);
        try {
            await Promise.all(
                selectedRows.map((location) =>
                    fetch(`/api/admin/master-data/locations/${location.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", ...authHeader },
                        body: JSON.stringify({ is_active: isActive }),
                    }).then((res) => {
                        if (!res.ok) throw new Error("Failed to update selected locations");
                    })
                )
            );

            toast.success(
                `${selectedRows.length} location${selectedRows.length === 1 ? "" : "s"} ${isActive ? "enabled" : "disabled"}`
            );
            resetSelection();
            fetchLocations();
            fetchStats();
        } catch (err: unknown) {
            toast.error(
                err instanceof Error ? err.message : "Failed to update locations"
            );
        } finally {
            setBulkLoading(false);
        }
    }

    async function handleBulkDelete() {
        setBulkLoading(true);
        try {
            await Promise.all(
                bulkDeleteTargets.map((location) =>
                    fetch(`/api/admin/master-data/locations/${location.id}`, {
                        method: "DELETE",
                        headers: authHeader,
                    }).then((res) => {
                        if (!res.ok) throw new Error("Failed to delete selected locations");
                    })
                )
            );

            toast.success(`${bulkDeleteTargets.length} locations deleted`);
            setBulkDeleteTargets([]);
            bulkResetSelectionRef.current?.();
            fetchLocations();
            fetchStats();
        } catch (err: unknown) {
            toast.error(
                err instanceof Error ? err.message : "Failed to delete locations"
            );
        } finally {
            setBulkLoading(false);
        }
    }

    const columns = buildColumns(setDeleteTarget, setEditingLocation, handleToggleStatus, activeLoadingId, openDropdownId, setOpenDropdownId, setActiveLoadingId);

    if (!isReady) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-6 w-full max-w-md" />
                <div className="border rounded-lg p-4">
                    <Skeleton className="h-8 w-full mb-2" />
                    <Skeleton className="h-8 w-full mb-2" />
                    <Skeleton className="h-8 w-full" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col gap-4 sm:gap-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Locations</h1>
                        <p className="text-sm sm:text-base text-muted-foreground mt-1">Manage all locations in the system</p>
                    </div>
                    <Dialog open={dialogOpen || !!editingLocation} onOpenChange={(open) => {
                        if (open) {
                            setDialogOpen(true);
                        } else {
                            setDialogOpen(false);
                            setEditingLocation(null);
                            setName("");
                            setSlug("");
                            setType("state");
                            setParentId("");
                            setParentLabel("");
                            setLatitude("");
                            setLongitude("");
                            setLocationScope("global");
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 w-full sm:w-auto">
                                <Plus className="size-4" />
                                Add Location
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <MapPin className="size-4" />
                                    {editingLocation ? "Edit Location" : "Add New Location"}
                                </DialogTitle>
                                <DialogDescription>
                                    {editingLocation
                                        ? "Update the location details"
                                        : "Create a new location in the system"}
                                </DialogDescription>
                            </DialogHeader>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    editingLocation ? handleUpdateLocation() : handleAddLocation();
                                }}
                                className="flex flex-col gap-4 pt-2"
                            >
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="location-name">Name *</Label>
                                    <Input
                                        id="location-name"
                                        placeholder="e.g. Maharashtra"
                                        value={name}
                                        onChange={(e) => {
                                            setName(e.target.value);
                                            setSlug(toSlug(e.target.value));
                                        }}
                                        required
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="location-slug">
                                        Slug{" "}
                                        <span className="text-xs text-muted-foreground font-normal">
                                            (auto-generated)
                                        </span>
                                    </Label>
                                    <Input
                                        id="location-slug"
                                        value={slug}
                                        disabled
                                        className="font-mono text-sm bg-muted/40 cursor-not-allowed"
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="location-type">Type *</Label>
                                    <Select value={type} onValueChange={(value) => setType(value as LocationType)}>
                                        <SelectTrigger id="location-type">
                                            <SelectValue placeholder="Select location type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {LOCATION_TYPES.map((t) => (
                                                <SelectItem key={t} value={t}>
                                                    {capitalize(t)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="location-scope">Scope *</Label>
                                    <Select value={locationScope} onValueChange={setLocationScope}>
                                        <SelectTrigger id="location-scope">
                                            <SelectValue placeholder="Select location scope" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {["global", "seo", "user", "institution"].map((s) => (
                                                <SelectItem key={s} value={s}>
                                                    {capitalize(s)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <Label htmlFor="location-parent">Parent Location</Label>
                                    <AsyncSearchPopover<Location>
                                        value={parentId}
                                        onChange={(value) => setParentId(value)}
                                        selectedLabel={parentLabel}
                                        placeholder="Select parent location"
                                        searchPlaceholder="Search locations..."
                                        emptyText="No location found"
                                        fetcher={async (search, page) => {
                                            const res = await fetch(
                                                `/api/admin/master-data/locations?page=${page}&limit=15&search=${encodeURIComponent(search)}`,
                                                { headers: authHeader }
                                            );
                                            const json = await res.json();
                                            return {
                                                data: json.data || [],
                                                hasMore: page < json.pageCount,
                                            };
                                        }}
                                        getValue={(item) => String(item.id)}
                                        getLabel={(item) => `${item.name} (${item.type})`}
                                        onSelectItem={(item) => {
                                            setParentLabel(`${item.name} (${item.type})`);
                                        }}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="location-lat">Latitude</Label>
                                        <Input
                                            id="location-lat"
                                            type="number"
                                            placeholder="e.g. 19.7515"
                                            step="0.0001"
                                            value={latitude}
                                            onChange={(e) => setLatitude(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <Label htmlFor="location-lng">Longitude</Label>
                                        <Input
                                            id="location-lng"
                                            type="number"
                                            placeholder="e.g. 75.7139"
                                            step="0.0001"
                                            value={longitude}
                                            onChange={(e) => setLongitude(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <Button type="submit" disabled={submitting}>
                                    {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                                    {editingLocation ? "Update Location" : "Create Location"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* Stats Cards */}
                <StatsCards stats={stats} loading={statsLoading} title="Locations" />
            </div>

            <DataTable
                columns={columns}
                data={locations}
                getRowId={(row) => String(row.id)}
                toolbarLeft={
                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                        <Input
                            placeholder="Search locations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-64"
                        />
                        <Select
                            value={scopeFilter}
                            onValueChange={(value) => {
                                setScopeFilter(value);
                                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-[150px]">
                                <SelectValue placeholder="All Scopes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Scopes</SelectItem>
                                <SelectItem value="global">Global</SelectItem>
                                <SelectItem value="seo">SEO</SelectItem>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="institution">Institution</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                }
                toolbarRight={
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            fetchLocations();
                            fetchStats();
                        }}
                        disabled={loading}
                        title="Refresh"
                        className="shrink-0"
                    >
                        <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                }
                selectedActions={(selectedRows) => (
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 w-full sm:w-auto">
                        <Button
                            variant="outline"
                            onClick={() => {
                                handleBulkStatus(selectedRows, true, () => { });
                                fetchStats();
                            }}
                            disabled={bulkLoading}
                            className="gap-2 text-xs sm:text-sm w-full sm:w-auto"
                        >
                            <Power className="size-3 sm:size-4" />
                            <span className="hidden sm:inline">Enable</span>
                            <span className="sm:hidden">Enable</span>
                            {bulkLoading && <Loader2 className="size-3 sm:size-4 animate-spin" />}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                handleBulkStatus(selectedRows, false, () => { });
                                fetchStats();
                            }}
                            disabled={bulkLoading}
                            className="gap-2 text-xs sm:text-sm w-full sm:w-auto"
                        >
                            <PowerOff className="size-3 sm:size-4" />
                            <span className="hidden sm:inline">Disable</span>
                            <span className="sm:hidden">Disable</span>
                            {bulkLoading && <Loader2 className="size-3 sm:size-4 animate-spin" />}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                bulkResetSelectionRef.current = () => { };
                                setBulkDeleteTargets(selectedRows);
                            }}
                            disabled={bulkLoading}
                            className="gap-2 text-xs sm:text-sm w-full sm:w-auto"
                        >
                            <Trash2 className="size-3 sm:size-4" />
                            <span className="hidden sm:inline">Delete</span>
                            <span className="sm:hidden">Delete</span>
                            {bulkLoading && <Loader2 className="size-3 sm:size-4 animate-spin" />}
                        </Button>
                    </div>
                )}
                manualPagination={true}
                pageCount={pageCount}
                pagination={pagination}
                onPaginationChange={setPagination}
            />

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Location</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteLocation}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog
                open={bulkDeleteTargets.length > 0}
                onOpenChange={(open) => !open && setBulkDeleteTargets([])}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Locations</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete {bulkDeleteTargets.length} location(s)? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => handleBulkDelete()}
                            disabled={bulkLoading}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {bulkLoading && <Loader2 className="size-3.5 mr-1 animate-spin" />}
                            Delete All
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
