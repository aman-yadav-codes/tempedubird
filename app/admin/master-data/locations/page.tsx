"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import { MapPin, Plus, Loader2, Trash2, RefreshCw, Power, PowerOff, Edit, MoreHorizontal } from "lucide-react";
import { StatsCards } from "@/components/master-data/stats-cards";
import { UniversalLocationPicker } from "@/components/shared/universal-location-picker";
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

const LOCATION_TYPES: LocationType[] = ["country", "state", "city", "area"];

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
            header: "Location / Area",
            cell: ({ row }) => {
                const loc = row.original;
                const type = loc.type || "state";
                let badgeClass = "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200";
                if (type === "country") {
                    badgeClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200";
                } else if (type === "state") {
                    badgeClass = "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200";
                } else if (type === "city") {
                    badgeClass = "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200";
                } else if (type === "area") {
                    badgeClass = "bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200";
                }

                return (
                    <div className="flex items-center gap-2 max-w-[280px]">
                        <span className="font-semibold text-foreground truncate" title={loc.name}>
                            {loc.name}
                        </span>
                        <Badge variant="outline" className={`capitalize font-bold text-[10px] px-1.5 py-0 shrink-0 ${badgeClass}`}>
                            {type}
                        </Badge>
                    </div>
                );
            },
        },
        {
            id: "city",
            header: "City",
            cell: ({ row }) => {
                const loc = row.original;
                const cityName = loc.city_name || (loc.type === "city" ? loc.name : loc.parent_name);
                return <span className="text-xs font-medium text-foreground">{cityName || "-"}</span>;
            },
        },
        {
            id: "state",
            header: "State",
            cell: ({ row }) => {
                const loc = row.original;
                const stateName = loc.state_name || (loc.type === "state" ? loc.name : null);
                return <span className="text-xs text-muted-foreground">{stateName || "-"}</span>;
            },
        },
        {
            id: "country",
            header: "Country",
            cell: ({ row }) => {
                const loc = row.original;
                return <span className="text-xs text-muted-foreground">{loc.country_name || "India"}</span>;
            },
        },
        {
            id: "coordinates",
            header: "Latitude & Longitude",
            cell: ({ row }) => {
                const loc = row.original;
                if (loc.latitude && loc.longitude) {
                    return (
                        <div className="flex items-center gap-1.5 text-xs text-foreground font-mono bg-muted/30 px-2 py-1 rounded-md border border-border/60 w-fit">
                            <MapPin className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                            <span>{parseFloat(loc.latitude).toFixed(4)}, {parseFloat(loc.longitude).toFixed(4)}</span>
                        </div>
                    );
                }
                return <span className="text-xs text-muted-foreground">-</span>;
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
    const [type, setType] = useState<LocationType>("city");
    const [country, setCountry] = useState("India");
    const [stateName, setStateName] = useState("");
    const [cityName, setCityName] = useState("");
    const [areaName, setAreaName] = useState("");
    const [parentId, setParentId] = useState("");
    const [parentLabel, setParentLabel] = useState("");
    const [latitude, setLatitude] = useState("");
    const [longitude, setLongitude] = useState("");
    const [locationScope, setLocationScope] = useState<string>("global");
    const [typeFilter, setTypeFilter] = useState<string>("all");
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
            const typeParam = typeFilter !== "all" ? `&type=${typeFilter}` : "";
            const res = await fetch(
                `/api/admin/master-data/locations?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}&search=${encodeURIComponent(debouncedSearch)}${typeParam}`,
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
    }, [accessToken, pagination.pageIndex, pagination.pageSize, debouncedSearch, typeFilter]);

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
        if (!areaName.trim() && !cityName.trim() && !stateName.trim() && !country.trim()) {
            toast.error("Please pick a location from the map or enter location details");
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch("/api/admin/master-data/locations", {
                method: "POST",
                headers: { ...authHeader, "Content-Type": "application/json" },
                body: JSON.stringify({
                    country: country.trim() || "India",
                    state: stateName.trim(),
                    city: cityName.trim(),
                    area: areaName.trim(),
                    latitude: latitude ? parseFloat(latitude) : null,
                    longitude: longitude ? parseFloat(longitude) : null,
                }),
            });

            const json = await res.json();

            if (res.ok) {
                toast.success("Location saved successfully");
                setCountry("India");
                setStateName("");
                setCityName("");
                setAreaName("");
                setName("");
                setSlug("");
                setLatitude("");
                setLongitude("");
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
                                className="flex flex-col gap-4 pt-1"
                            >
                                <UniversalLocationPicker
                                    value={{
                                        country,
                                        state: stateName,
                                        city: cityName,
                                        area: areaName,
                                        latitude,
                                        longitude,
                                    }}
                                    onChange={(loc) => {
                                        setCountry(loc.country || "India");
                                        setStateName(loc.state || "");
                                        setCityName(loc.city || "");
                                        setAreaName(loc.area || "");
                                        setLatitude(loc.latitude || "");
                                        setLongitude(loc.longitude || "");
                                        setName(loc.area || loc.city || loc.state || loc.country || "");
                                        setSlug(toSlug(loc.area || loc.city || loc.state || loc.country || ""));
                                    }}
                                    showStructuredFields={true}
                                    showCoordinates={true}
                                />

                                <Button type="submit" disabled={submitting} className="w-full">
                                    {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
                                    {editingLocation ? "Update Location" : "Save Location"}
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
                            className="w-full sm:w-64 text-xs"
                        />
                        <Select
                            value={typeFilter}
                            onValueChange={(value) => {
                                setTypeFilter(value);
                                setPagination((prev) => ({ ...prev, pageIndex: 0 }));
                            }}
                        >
                            <SelectTrigger className="w-full sm:w-[150px] text-xs">
                                <SelectValue placeholder="All Types" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="country">Country</SelectItem>
                                <SelectItem value="state">State</SelectItem>
                                <SelectItem value="city">City</SelectItem>
                                <SelectItem value="area">Area</SelectItem>
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
