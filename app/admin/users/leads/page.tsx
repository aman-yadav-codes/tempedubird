"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import { ArrowUpDown, ChevronDown, ChevronUp, Clock, ListFilter, Loader2, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";

type VisitorSession = {
    tracking_token: string;
    full_name: string | null;
    email: string | null;
    phone: string | null;
    follow_up: string | null;
    lead_status: LeadStatusValue | null;
    current_page_url: string | null;
    created_at: string;
    last_seen_at: string;
    activity_count: number;
};

type VisitorActivity = {
    id: number;
    page_url: string;
    page_title: string | null;
    trigger_type: string | null;
    visited_at: string;
};

type LeadStatusValue =
    | "new"
    | "contacted"
    | "follow_up"
    | "won"
    | "lost"
    | "not_interested"
    | "no_response"
    | "on_hold"
    | "invalid";

const LEAD_STATUSES: Array<{
    value: LeadStatusValue;
    label: string;
    description: string;
    className: string;
}> = [
    { value: "new", label: "New", description: "Lead just created, no action taken yet.", className: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300" },
    { value: "contacted", label: "Contacted", description: "Initial contact made.", className: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300" },
    { value: "follow_up", label: "Follow Up", description: "Needs another call, message, or email.", className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300" },
    { value: "won", label: "Won", description: "Lead became a customer or institution.", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
    { value: "lost", label: "Lost", description: "Lead rejected the offer or chose a competitor.", className: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300" },
    { value: "not_interested", label: "Not Interested", description: "Lead explicitly declined.", className: "border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-300" },
    { value: "no_response", label: "No Response", description: "Multiple contact attempts were made with no reply.", className: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-300" },
    { value: "on_hold", label: "On Hold", description: "Lead is temporarily paused.", className: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300" },
    { value: "invalid", label: "Invalid", description: "Lead contains fake or incorrect data.", className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300" },
];

function formatDate(value: string) {
    return new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getLeadStatus(session: VisitorSession) {
    return LEAD_STATUSES.find((status) => status.value === session.lead_status) ?? LEAD_STATUSES[0];
}

function LeadStatusBadge({ session }: { session: VisitorSession }) {
    const status = getLeadStatus(session);
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <Badge variant="outline" className={status.className}>
                    {status.label}
                </Badge>
            </TooltipTrigger>
            <TooltipContent sideOffset={6}>{status.description}</TooltipContent>
        </Tooltip>
    );
}

function buildAbsoluteUrl(value: string | null) {
    if (!value) return null;
    if (/^https?:\/\//i.test(value)) return value;
    if (typeof window === "undefined") return value;

    try {
        return new URL(value, window.location.origin).toString();
    } catch {
        return value;
    }
}

function matchesSearch(session: VisitorSession, search: string) {
    const query = search.trim().toLowerCase();
    if (!query) return true;

    const haystack = [
        session.full_name,
        session.email,
        session.phone,
        getLeadStatus(session).label,
        session.tracking_token,
        session.current_page_url,
    ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

    return haystack.includes(query);
}

async function readApiJson(res: Response) {
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        const text = await res.text();
        throw new Error(text.includes("<!DOCTYPE") ? "Your admin session expired. Please sign in again." : "Unexpected server response");
    }
    return res.json();
}

export default function LeadsPage() {
    const { isReady } = useAdminGuard();
    const { accessToken } = useAuthStore();
    const [sessions, setSessions] = useState<VisitorSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [pageCount, setPageCount] = useState(-1);
    const [pagination, setPagination] = useState<PaginationState>({
        pageIndex: 0,
        pageSize: 10,
    });
    const [selected, setSelected] = useState<VisitorSession | null>(null);
    const [activities, setActivities] = useState<VisitorActivity[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [showStatusFilters, setShowStatusFilters] = useState(false);
    const [statusFilter, setStatusFilter] = useState<LeadStatusValue | "all">("all");
    const [remoteSearchResults, setRemoteSearchResults] = useState<VisitorSession[] | null>(null);
    const [remoteSearchPageCount, setRemoteSearchPageCount] = useState(-1);
    const [followUpDialogOpen, setFollowUpDialogOpen] = useState(false);
    const [followUpText, setFollowUpText] = useState("");
    const [leadStatus, setLeadStatus] = useState<LeadStatusValue>("new");
    const [followUpTargets, setFollowUpTargets] = useState<string[]>([]);
    const [savingFollowUp, setSavingFollowUp] = useState(false);
    const resetSelectionRef = useRef<(() => void) | null>(null);

    const fetchLeads = useCallback(async () => {
        if (!isReady || !accessToken) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(pagination.pageIndex + 1),
                limit: String(pagination.pageSize),
            });
            if (statusFilter !== "all") params.set("status", statusFilter);
            const res = await fetch(`/api/admin/tracker/sessions?${params.toString()}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const json = await readApiJson(res);
            if (!res.ok) throw new Error(json.error || "Failed to load leads");
            setSessions(json.data || []);
            setPageCount(json.pageCount ?? -1);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to load leads");
        } finally {
            setLoading(false);
        }
    }, [accessToken, isReady, pagination.pageIndex, pagination.pageSize, statusFilter]);

    const fetchRemoteSearchLeads = useCallback(async (search: string) => {
        if (!isReady || !accessToken) return;

        try {
            const params = new URLSearchParams({
                page: String(pagination.pageIndex + 1),
                limit: String(pagination.pageSize),
                search,
            });
            if (statusFilter !== "all") params.set("status", statusFilter);

            const res = await fetch(`/api/admin/tracker/sessions?${params.toString()}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const json = await readApiJson(res);
            if (!res.ok) throw new Error(json.error || "Failed to load search results");

            setRemoteSearchResults(json.data || []);
            setRemoteSearchPageCount(json.pageCount ?? -1);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to search leads");
        }
    }, [accessToken, isReady, pagination.pageIndex, pagination.pageSize, statusFilter]);

    const selectStatusFilter = useCallback((status: LeadStatusValue | "all") => {
        setLoading(true);
        setStatusFilter(status);
        setPagination((current) => ({ ...current, pageIndex: 0 }));
        setRemoteSearchResults(null);
        setRemoteSearchPageCount(-1);
    }, []);

    useEffect(() => {
        const timeout = window.setTimeout(fetchLeads, 0);
        return () => window.clearTimeout(timeout);
    }, [fetchLeads]);

    const localSearchMatches = useMemo(
        () => sessions.filter((session) => matchesSearch(session, searchTerm)),
        [searchTerm, sessions]
    );

    useEffect(() => {
        if (!isReady || !accessToken) return;

        const normalizedSearch = searchTerm.trim();
        if (!normalizedSearch) {
            const timeout = window.setTimeout(() => {
                setRemoteSearchResults(null);
                setRemoteSearchPageCount(-1);
            }, 0);
            return () => window.clearTimeout(timeout);
        }

        if (localSearchMatches.length > 0) {
            const timeout = window.setTimeout(() => {
                setRemoteSearchResults(null);
                setRemoteSearchPageCount(-1);
            }, 0);
            return () => window.clearTimeout(timeout);
        }

        const timeout = window.setTimeout(() => {
            fetchRemoteSearchLeads(normalizedSearch);
        }, 250);

        return () => window.clearTimeout(timeout);
    }, [accessToken, fetchRemoteSearchLeads, isReady, localSearchMatches.length, searchTerm]);

    const openDetails = useCallback(async (session: VisitorSession) => {
        if (!isReady || !accessToken) return;
        setSelected(session);
        setDetailLoading(true);
        try {
            const res = await fetch(`/api/admin/tracker/sessions/${session.tracking_token}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const json = await readApiJson(res);
            if (!res.ok) throw new Error(json.error || "Failed to load lead journey");
            setSelected(json.data.session || session);
            setActivities(json.data.activities || []);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to load lead journey");
        } finally {
            setDetailLoading(false);
        }
    }, [accessToken, isReady]);

    const openFollowUpDialog = useCallback((targets: VisitorSession[], resetSelection?: () => void) => {
        const tokens = targets.map((item) => item.tracking_token);
        if (!tokens.length) return;

        setFollowUpTargets(tokens);
        setFollowUpText(targets.length === 1 ? targets[0].follow_up ?? "" : "");
        setLeadStatus(targets.length === 1 ? getLeadStatus(targets[0]).value : "new");
        setFollowUpDialogOpen(true);
        resetSelectionRef.current = resetSelection ?? null;
    }, []);

    const submitFollowUp = useCallback(async () => {
        if (!isReady || !accessToken || followUpTargets.length === 0) return;
        if (!followUpText.trim()) {
            toast.error("Follow-up details are required");
            return;
        }

        setSavingFollowUp(true);
        try {
            if (followUpTargets.length === 1) {
                const res = await fetch(`/api/admin/tracker/sessions/${followUpTargets[0]}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({ follow_up: followUpText, lead_status: leadStatus }),
                });
                const json = await readApiJson(res);
                if (!res.ok) throw new Error(json.error || "Failed to save follow-up");
            } else {
                const res = await fetch("/api/admin/tracker/sessions", {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${accessToken}`,
                    },
                    body: JSON.stringify({
                        tracking_tokens: followUpTargets,
                        follow_up: followUpText,
                        lead_status: leadStatus,
                    }),
                });
                const json = await readApiJson(res);
                if (!res.ok) throw new Error(json.error || "Failed to save follow-up");
            }

            toast.success("Lead updated");
            setFollowUpDialogOpen(false);
            if (resetSelectionRef.current) {
                resetSelectionRef.current();
            }
            resetSelectionRef.current = null;
            await fetchLeads();
            if (selected) {
                await openDetails(selected);
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Failed to save follow-up");
        } finally {
            setSavingFollowUp(false);
        }
    }, [accessToken, fetchLeads, followUpTargets, followUpText, isReady, leadStatus, openDetails, selected]);

    const hasSearch = searchTerm.trim().length > 0;
    const useRemoteSearch = hasSearch && localSearchMatches.length === 0;
    const tableData = useRemoteSearch ? (remoteSearchResults ?? []) : (hasSearch ? localSearchMatches : sessions);
    const tablePageCount = useRemoteSearch ? remoteSearchPageCount : pageCount;

    const columns = useMemo<ColumnDef<VisitorSession>[]>(() => [
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
            accessorKey: "full_name",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 px-3"
                >
                    Lead
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => {
                const lead = row.original;
                return (
                    <div className="min-w-0">
                        <p className="font-medium">{lead.full_name || "Unnamed lead"}</p>
                        <p className="truncate text-sm text-muted-foreground">{lead.email || lead.phone || lead.tracking_token}</p>
                    </div>
                );
            },
        },
        {
            id: "status",
            header: "Status",
            cell: ({ row }) => {
                return <LeadStatusBadge session={row.original} />;
            },
        },
        {
            accessorKey: "follow_up",
            header: "Follow-up",
            cell: ({ row }) => (
                row.original.follow_up ? (
                    <span className="line-clamp-1 max-w-[240px] text-muted-foreground">{row.original.follow_up}</span>
                ) : (
                    <span className="text-xs text-muted-foreground">Not added</span>
                )
            ),
        },
        {
            accessorKey: "current_page_url",
            header: "Current Page",
            cell: ({ row }) => {
                const url = buildAbsoluteUrl(row.original.current_page_url);
                if (!url) {
                    return <span className="block max-w-[280px] truncate text-muted-foreground">No current page</span>;
                }

                return (
                    <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block max-w-[280px] truncate text-muted-foreground underline-offset-4 hover:underline"
                        title={url}
                    >
                        {url}
                    </a>
                );
            },
        },
        {
            accessorKey: "activity_count",
            header: "Events",
            cell: ({ row }) => <Badge variant="secondary">{row.original.activity_count} events</Badge>,
        },
        {
            accessorKey: "last_seen_at",
            header: ({ column }) => (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
                    className="-ml-3 h-8 px-3"
                >
                    Last Seen
                    <ArrowUpDown className="ml-2 h-4 w-4" />
                </Button>
            ),
            cell: ({ row }) => (
                <span className="text-muted-foreground">{formatDate(row.original.last_seen_at)}</span>
            ),
        },
        {
            id: "actions",
            enableHiding: false,
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openDetails(row.original)}>
                            View journey
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openFollowUpDialog([row.original])}>
                            Update status
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ], [openDetails, openFollowUpDialog]);

    return (
        <TooltipProvider>
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
                <p className="text-muted-foreground">View enquiry leads, their status, and recent public-page activity.</p>
            </div>

            <DataTable
                columns={columns}
                data={tableData}
                loading={loading}
                filterPlaceholder="Filter by lead name..."
                pageCount={tablePageCount}
                manualPagination={useRemoteSearch || !hasSearch}
                pagination={useRemoteSearch || !hasSearch ? pagination : undefined}
                onPaginationChange={useRemoteSearch || !hasSearch ? setPagination : undefined}
                getRowId={(row) => row.tracking_token}
                toolbarLeft={
                    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                            value={searchTerm}
                            onChange={(event) => setSearchTerm(event.target.value)}
                            placeholder="Filter by lead name..."
                            className="w-full sm:w-[280px]"
                        />
                        <Button
                            type="button"
                            variant={showStatusFilters ? "secondary" : "outline"}
                            onClick={() => setShowStatusFilters((current) => !current)}
                            className="justify-between gap-2 sm:justify-center"
                        >
                            <ListFilter className="size-4" />
                            Status Filter
                            {showStatusFilters ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                        </Button>
                    </div>
                }
                toolbarBelow={showStatusFilters ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/20 p-3">
                        <Button
                            type="button"
                            size="sm"
                            variant={statusFilter === "all" ? "default" : "outline"}
                            onClick={() => selectStatusFilter("all")}
                        >
                            All
                        </Button>
                        {LEAD_STATUSES.map((status) => (
                            <Tooltip key={status.value}>
                                <TooltipTrigger asChild>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={statusFilter === status.value ? "default" : "outline"}
                                        onClick={() => selectStatusFilter(status.value)}
                                    >
                                        {status.label}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent sideOffset={6}>{status.description}</TooltipContent>
                            </Tooltip>
                        ))}
                    </div>
                ) : null}
                selectedActions={(selectedRows, resetSelection) => (
                    <Button
                        size="sm"
                        onClick={() => openFollowUpDialog(selectedRows, resetSelection)}
                    >
                        Update leads
                    </Button>
                )}
            />

            <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
                <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
                    <SheetHeader>
                        <SheetTitle>{selected?.full_name || "Lead Journey"}</SheetTitle>
                        <SheetDescription>{selected?.email || selected?.phone || selected?.tracking_token}</SheetDescription>
                    </SheetHeader>

                    <div className="space-y-4 px-4 pb-6">
                        {selected && (
                            <div className="rounded-md border bg-muted/20 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Current page</p>
                                        {buildAbsoluteUrl(selected.current_page_url) ? (
                                            <a
                                                href={buildAbsoluteUrl(selected.current_page_url)!}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="break-all font-medium underline-offset-4 hover:underline"
                                            >
                                                {buildAbsoluteUrl(selected.current_page_url)}
                                            </a>
                                        ) : (
                                            <p className="break-all font-medium">No current page</p>
                                        )}
                                    </div>
                                    <LeadStatusBadge session={selected} />
                                </div>
                                <p className="mt-3 flex items-center gap-1 text-sm text-muted-foreground">
                                    <Clock className="size-3.5" />
                                    Last seen {formatDate(selected.last_seen_at)}
                                </p>
                                <div className="mt-3">
                                    <p className="text-sm text-muted-foreground">Follow-up note</p>
                                    <p className="mt-1 whitespace-pre-wrap text-sm">
                                        {selected.follow_up?.trim() || "No follow-up added."}
                                    </p>
                                </div>
                            </div>
                        )}

                        {detailLoading ? (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Loader2 className="size-4 animate-spin" />
                                Loading journey...
                            </div>
                        ) : activities.length === 0 ? (
                            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">No activity recorded.</p>
                        ) : (
                            <div className="space-y-3">
                                {activities.map((activity) => (
                                    <div key={activity.id} className="rounded-md border bg-card p-3">
                                        <div className="flex items-center justify-between gap-3">
                                            <Badge variant="outline">{activity.trigger_type || "activity"}</Badge>
                                            <span className="text-xs text-muted-foreground">{formatDate(activity.visited_at)}</span>
                                        </div>
                                        <p className="mt-2 truncate text-sm font-medium">{activity.page_title || activity.page_url}</p>
                                        <a
                                            href={buildAbsoluteUrl(activity.page_url) || "#"}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="mt-1 block break-all text-xs text-muted-foreground underline-offset-4 hover:underline"
                                        >
                                            {buildAbsoluteUrl(activity.page_url) || activity.page_url}
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>

            <Dialog open={followUpDialogOpen} onOpenChange={setFollowUpDialogOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {followUpTargets.length > 1
                                ? `Update ${followUpTargets.length} leads`
                                : "Update lead"}
                        </DialogTitle>
                        <DialogDescription>
                            Set the lead stage and save any follow-up details.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Select value={leadStatus} onValueChange={(value) => setLeadStatus(value as LeadStatusValue)}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select lead status" />
                            </SelectTrigger>
                            <SelectContent>
                                {LEAD_STATUSES.map((status) => (
                                    <SelectItem key={status.value} value={status.value} title={status.description}>
                                        {status.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground">
                            {LEAD_STATUSES.find((status) => status.value === leadStatus)?.description}
                        </p>
                    </div>

                    <Textarea
                        rows={10}
                        className="min-h-[260px]"
                        placeholder="Write follow-up details (required)..."
                        value={followUpText}
                        onChange={(event) => setFollowUpText(event.target.value)}
                        required
                    />

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setFollowUpDialogOpen(false)}
                            disabled={savingFollowUp}
                        >
                            Cancel
                        </Button>
                        <Button onClick={submitFollowUp} disabled={savingFollowUp || !followUpText.trim()}>
                            {savingFollowUp ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
        </TooltipProvider>
    );
}
