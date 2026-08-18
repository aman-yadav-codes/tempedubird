"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import { Plus, Loader2, MoreHorizontal, RefreshCw, Power, PowerOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

import { MasterType } from "@/lib/types/institution";
import { capitalize } from "@/lib/utils/capitalize";
import { slugify } from "@/lib/utils/slug";

function buildColumns(
    setDeleteTarget: (t: MasterType | null) => void,
    setEditing: (t: MasterType | null) => void,
    handleToggle: (t: MasterType) => Promise<void>,
    activeLoadingId: number | null,
    openDropdownId: number | null,
    setOpenDropdownId: (id: number | null) => void,
    setActiveLoadingId: (id: number | null) => void
): ColumnDef<MasterType>[] {
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
            id: "name",
            accessorKey: "name",
            header: "Name",
            cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>,
        },
        {
            accessorKey: "slug",
            header: "Slug",
            cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.getValue("slug")}</span>,
        },
        {
            id: "status",
            header: "Status",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <Badge variant="default" className={item.is_active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
                        {item.is_active ? "Active" : "Disabled"}
                    </Badge>
                );
            },
        },
        {
            id: "created_at",
            accessorKey: "created_at",
            header: "Created",
            cell: ({ row }) => <span className="text-sm text-muted-foreground">{new Date(row.getValue("created_at")).toLocaleDateString()}</span>,
        },
        {
            id: "actions",
            cell: ({ row }) => {
                const item = row.original;
                return (
                    <DropdownMenu open={openDropdownId === item.id} onOpenChange={(isOpen) => setOpenDropdownId(isOpen ? item.id : null)}>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0"><span className="sr-only">Open</span><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => { setOpenDropdownId(null); setEditing(item); }}>
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                disabled={activeLoadingId === item.id}
                                onSelect={(e) => {
                                    e.preventDefault();
                                    setActiveLoadingId(item.id);
                                    handleToggle(item).finally(() => {
                                        setActiveLoadingId(null);
                                        setOpenDropdownId(null);
                                    });
                                }}
                            >
                                {activeLoadingId === item.id && <Loader2 className="mr-2 size-4 animate-spin" />}
                                {item.is_active ? "Disable" : "Enable"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => { setOpenDropdownId(null); setDeleteTarget(item); }}>
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                );
            },
        },
    ];
}

export default function InstitutionTypesPage() {
    const { isReady } = useAdminGuard();
    const { accessToken } = useAuthStore();

    const [items, setItems] = useState<MasterType[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageCount, setPageCount] = useState(-1);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
    const [searchTerm, setSearchTerm] = useState("");
    const [debouncedSearch, setDebouncedSearch] = useState("");

    const [dialogOpen, setDialogOpen] = useState(false);
    const [name, setName] = useState("");
    const [slug, setSlug] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState<MasterType | null>(null);
    const [editing, setEditing] = useState<MasterType | null>(null);
    const [activeLoadingId, setActiveLoadingId] = useState<number | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<number | null>(null);

    // Bulk actions state
    const [bulkDeleteTargets, setBulkDeleteTargets] = useState<MasterType[]>([]);
    const [bulkLoading, setBulkLoading] = useState(false);
    const bulkResetSelectionRef = useRef<(() => void) | null>(null);

    const authHeader = { Authorization: `Bearer ${accessToken}` };

    const fetchItems = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/institutions/types?page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}&search=${encodeURIComponent(debouncedSearch)}`, { headers: authHeader });
            const json = await res.json();
            if (res.ok) {
                setItems(json.data);
                setPageCount(json.pageCount);
            } else {
                toast.error(json.error ?? "Failed to load");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setLoading(false);
        }
    }, [accessToken, pagination.pageIndex, pagination.pageSize, debouncedSearch]);

    useEffect(() => { if (isReady) fetchItems(); }, [isReady, fetchItems]);

    useEffect(() => { const t = setTimeout(() => { setDebouncedSearch(searchTerm); setPagination((p) => ({ ...p, pageIndex: 0 })); }, 300); return () => clearTimeout(t); }, [searchTerm]);

    useEffect(() => { if (editing) { setName(editing.name); setSlug(editing.slug); setDialogOpen(true); } }, [editing]);

    useEffect(() => {
        if (!dialogOpen) return;
        setSlug(slugify(name));
    }, [name, dialogOpen]);

    const handleCreate = async () => {
        if (!name.trim()) return toast.error("Name required");
        setSubmitting(true);
        try {
            const payload = { name: capitalize(name.trim()), slug: slugify(name) };
            const res = await fetch(`/api/admin/institutions/types`, { method: "POST", headers: { ...authHeader, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            const json = await res.json();
            if (res.ok) {
                toast.success("Created");
                setName(""); setSlug(""); setDialogOpen(false); await fetchItems();
            } else {
                toast.error(json.error ?? "Failed");
            }
        } catch {
            toast.error("Network error");
        } finally { setSubmitting(false); }
    };

    const handleUpdate = async () => {
        if (!editing) return;
        setSubmitting(true);
        try {
            const payload = { name: capitalize(name.trim()), slug: slugify(name) };
            const res = await fetch(`/api/admin/institutions/types/${editing.id}`, { method: "PATCH", headers: { ...authHeader, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
            const json = await res.json();
            if (res.ok) {
                toast.success("Updated"); setEditing(null); setName(""); setSlug(""); setDialogOpen(false); await fetchItems();
            } else {
                toast.error(json.error ?? "Failed");
            }
        } catch {
            toast.error("Network error");
        } finally { setSubmitting(false); }
    };

    const handleToggle = async (t: MasterType) => {
        try {
            const res = await fetch(`/api/admin/institutions/types/${t.id}`, { method: "PATCH", headers: { ...authHeader, "Content-Type": "application/json" }, body: JSON.stringify({ isActive: !t.is_active }) });
            const json = await res.json();
            if (res.ok) {
                toast.success("Updated"); await fetchItems();
            } else {
                toast.error(json.error ?? "Failed");
            }
        } catch {
            toast.error("Network error");
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        try {
            const res = await fetch(`/api/admin/institutions/types/${deleteTarget.id}`, { method: "DELETE", headers: authHeader });
            if (res.ok) {
                toast.success("Deleted"); setDeleteTarget(null); await fetchItems();
            } else {
                const json = await res.json(); toast.error(json.error ?? "Failed to delete");
            }
        } catch {
            toast.error("Network error");
        }
    };

    const handleBulkStatus = async (
        selectedRows: MasterType[],
        isActive: boolean,
        resetSelection: () => void
    ) => {
        setBulkLoading(true);
        try {
            const res = await fetch("/api/admin/institutions/types", {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...authHeader },
                body: JSON.stringify({
                    ids: selectedRows.map((item) => item.id),
                    isActive,
                }),
            });

            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json.error || "Failed to update selected types");
            }

            toast.success(
                `${selectedRows.length} type${selectedRows.length === 1 ? "" : "s"} ${isActive ? "enabled" : "disabled"}`
            );
            resetSelection();
            await fetchItems();
        } catch (err: unknown) {
            toast.error(
                err instanceof Error ? err.message : "Failed to update types"
            );
        } finally {
            setBulkLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        setBulkLoading(true);
        try {
            const res = await fetch("/api/admin/institutions/types", {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...authHeader },
                body: JSON.stringify({
                    ids: bulkDeleteTargets.map((item) => item.id),
                    softDelete: true,
                }),
            });

            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json.error || "Failed to delete selected types");
            }

            toast.success(`${bulkDeleteTargets.length} types deleted`);
            setBulkDeleteTargets([]);
            bulkResetSelectionRef.current?.();
            await fetchItems();
        } catch (err: unknown) {
            toast.error(
                err instanceof Error ? err.message : "Failed to delete types"
            );
        } finally {
            setBulkLoading(false);
        }
    };

    const columns = buildColumns(setDeleteTarget, setEditing, handleToggle, activeLoadingId, openDropdownId, setOpenDropdownId, setActiveLoadingId);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-semibold">Institution Types</h1>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> New Type
                    </Button>
                </div>
            </div>

            <DataTable
                columns={columns}
                data={items}
                loading={loading}
                getRowId={(row) => String(row.id)}
                toolbarLeft={
                    <Input
                        placeholder="Search types..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full sm:max-w-sm"
                    />
                }
                toolbarRight={
                    <Button variant="ghost" size="icon" onClick={fetchItems} disabled={loading} title="Refresh">
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    </Button>
                }
                selectedActions={(selectedRows, resetSelection) => (
                    <>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={bulkLoading}
                            onClick={() =>
                                handleBulkStatus(selectedRows, true, resetSelection)
                            }
                        >
                            <Power className="size-4" />
                            Enable
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={bulkLoading}
                            onClick={() =>
                                handleBulkStatus(selectedRows, false, resetSelection)
                            }
                        >
                            <PowerOff className="size-4" />
                            Disable
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={bulkLoading}
                            onClick={() => {
                                bulkResetSelectionRef.current = resetSelection;
                                setBulkDeleteTargets(selectedRows);
                            }}
                        >
                            <Trash2 className="size-4" />
                            Delete
                        </Button>
                    </>
                )}
                pagination={pagination}
                onPaginationChange={setPagination}
                pageCount={pageCount}
            />

            <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setDialogOpen(false); setEditing(null); setName(""); setSlug(""); } }}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit Type" : "New Type"}</DialogTitle>
                        <DialogDescription>
                            Create or update an institution type and its slug.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div>
                            <Label>Name</Label>
                            <Input value={name} onChange={(e) => setName(e.target.value)} />
                        </div>
                        <div>
                            <Label>Slug</Label>
                            <Input value={slug} readOnly className="font-mono text-sm bg-muted/40 cursor-not-allowed" />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                        <Button variant="ghost" onClick={() => { setDialogOpen(false); setEditing(null); setName(""); setSlug(""); }}>Cancel</Button>
                        <Button onClick={editing ? handleUpdate : handleCreate} disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (editing ? "Update" : "Create")}</Button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Type?</AlertDialogTitle>
                        <div className="text-sm text-muted-foreground">
                            This will soft-delete the type. This action can be reversed from the database.
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={bulkDeleteTargets.length > 0} onOpenChange={(open) => !bulkLoading && !open && setBulkDeleteTargets([])}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {bulkDeleteTargets.length} selected types?</AlertDialogTitle>
                        <div className="text-sm text-muted-foreground">
                            This will soft-delete the selected types. This action can be reversed from the database.
                        </div>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={bulkLoading}>Cancel</AlertDialogCancel>
                        <Button
                            variant="destructive"
                            disabled={bulkLoading}
                            onClick={(e) => {
                                e.preventDefault();
                                handleBulkDelete();
                            }}
                        >
                            {bulkLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                            Delete Selected
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
