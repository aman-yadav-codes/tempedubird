"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
    ArrowUpDown,
    ChevronDown,
    ChevronUp,
    Clock,
    Download,
    ListFilter,
    Loader2,
    MoreHorizontal,
    PhoneCall,
    Plus,
    Search,
    TrendingUp,
    UserCheck,
    Users,
} from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { readJsonResponse } from "@/lib/api/read-json-response";

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
    | "qualified"
    | "garbage"
    | "contacted"
    | "waiting_for_response"
    | "negotiation"
    | "won"
    | "lost";

const LEAD_STATUSES: Array<{
    value: LeadStatusValue;
    label: string;
    description: string;
    className: string;
}> = [
    { value: "new", label: "New Enquiry", description: "Enquiry just received, awaiting initial action.", className: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300" },
    { value: "qualified", label: "Qualified", description: "Lead vetted and meets admission criteria.", className: "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" },
    { value: "garbage", label: "Garbage", description: "Invalid or spam enquiry.", className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300" },
    { value: "contacted", label: "Contacted", description: "Initial contact made with applicant/parent.", className: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300" },
    { value: "waiting_for_response", label: "Waiting for Response", description: "Follow-up sent, awaiting applicant reply.", className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300" },
    { value: "negotiation", label: "Negotiation", description: "Discussing fees, scholarships, or terms.", className: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-300" },
    { value: "won", label: "Won", description: "Lead enrolled and admission confirmed.", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
    { value: "lost", label: "Lost", description: "Lead declined or selected another institution.", className: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300" },
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
        <Badge variant="outline" className={`font-medium ${status.className}`}>
            {status.label}
        </Badge>
    );
}

export default function SalesLeadsPage() {
    useAdminGuard();
    const { accessToken } = useAuthStore();

    const [sessions, setSessions] = useState<VisitorSession[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSession, setSelectedSession] = useState<VisitorSession | null>(null);
    const [activities, setActivities] = useState<VisitorActivity[]>([]);
    const [loadingActivities, setLoadingActivities] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [followUpDialogSession, setFollowUpDialogSession] = useState<VisitorSession[] | null>(null);
    const [selectedStatus, setSelectedStatus] = useState<LeadStatusValue>("contacted");
    const [notes, setNotes] = useState("");
    const [savingStatus, setSavingStatus] = useState(false);
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
    const [totalRows, setTotalRows] = useState(0);

    const fetchLeads = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: String(pagination.pageIndex + 1),
                limit: String(pagination.pageSize),
            });
            if (searchTerm.trim()) params.set("search", searchTerm.trim());
            if (statusFilter !== "all") params.set("status", statusFilter);

            const res = await fetch(`/api/admin/tracker/sessions?${params.toString()}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const json = await readJsonResponse<{ data?: VisitorSession[]; total?: number; error?: string }>(res);
            if (!res.ok) throw new Error(json.error || "Failed to load leads");
            setSessions(json.data || []);
            setTotalRows(json.total || (json.data || []).length);
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to load leads");
        } finally {
            setLoading(false);
        }
    }, [accessToken, pagination.pageIndex, pagination.pageSize, searchTerm, statusFilter]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    const openDetails = useCallback(async (session: VisitorSession) => {
        setSelectedSession(session);
        if (!accessToken) return;
        setLoadingActivities(true);
        try {
            const res = await fetch(`/api/admin/tracker/sessions/${session.tracking_token}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const json = await readJsonResponse<{ data?: { activities?: VisitorActivity[] } }>(res);
            if (res.ok && json.data) setActivities(json.data.activities || []);
        } catch {
            setActivities([]);
        } finally {
            setLoadingActivities(false);
        }
    }, [accessToken]);

    const openFollowUpDialog = useCallback((targetSessions: VisitorSession[]) => {
        if (targetSessions.length === 0) return;
        setFollowUpDialogSession(targetSessions);
        setSelectedStatus(targetSessions[0]?.lead_status || "contacted");
        setNotes(targetSessions.length === 1 ? targetSessions[0]?.follow_up || "" : "");
    }, []);

    const saveFollowUpStatus = async () => {
        if (!followUpDialogSession || followUpDialogSession.length === 0 || !accessToken) return;
        setSavingStatus(false);
        try {
            const tokens = followUpDialogSession.map((s) => s.tracking_token);
            const res = await fetch(`/api/admin/tracker/sessions`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    tracking_tokens: tokens,
                    lead_status: selectedStatus,
                    follow_up: notes || "Status updated",
                }),
            });
            const json = await readJsonResponse<{ error?: string }>(res);
            if (!res.ok) throw new Error(json.error || "Failed to update status");
            toast.success("Lead status updated successfully");
            setFollowUpDialogSession(null);
            fetchLeads();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to update status");
        } finally {
            setSavingStatus(false);
        }
    };

    const stats = useMemo(() => {
        const total = totalRows || sessions.length;
        const newCount = sessions.filter((s) => !s.lead_status || s.lead_status === "new").length;
        const contacted = sessions.filter((s) => s.lead_status && ["contacted", "qualified", "waiting_for_response", "negotiation"].includes(s.lead_status)).length;
        const won = sessions.filter((s) => s.lead_status === "won").length;
        return { total, newCount, contacted, won };
    }, [sessions, totalRows]);

    const columns: ColumnDef<VisitorSession>[] = useMemo(() => [
        {
            id: "select",
            header: ({ table }) => (
                <Checkbox
                    checked={table.getIsAllPageRowsSelected()}
                    onCheckedChange={(val) => table.toggleAllPageRowsSelected(!!val)}
                />
            ),
            cell: ({ row }) => (
                <Checkbox
                    checked={row.getIsSelected()}
                    onCheckedChange={(val) => row.toggleSelected(!!val)}
                />
            ),
        },
        {
            accessorKey: "full_name",
            header: "Lead Name",
            cell: ({ row }) => (
                <div>
                    <p className="font-semibold text-foreground">{row.original.full_name || "Anonymous Visitor"}</p>
                    <p className="text-xs text-muted-foreground">{row.original.email || row.original.phone || "No direct contact"}</p>
                </div>
            ),
        },
        {
            accessorKey: "phone",
            header: "Contact Phone",
            cell: ({ row }) => (
                <span className="text-sm font-medium">{row.original.phone || "N/A"}</span>
            ),
        },
        {
            accessorKey: "lead_status",
            header: "Status",
            cell: ({ row }) => <LeadStatusBadge session={row.original} />,
        },
        {
            accessorKey: "activity_count",
            header: "Pageviews",
            cell: ({ row }) => (
                <Badge variant="secondary" className="font-normal">
                    {row.original.activity_count} pages
                </Badge>
            ),
        },
        {
            accessorKey: "last_seen_at",
            header: "Last Seen",
            cell: ({ row }) => (
                <span className="text-xs text-muted-foreground">{formatDate(row.original.last_seen_at)}</span>
            ),
        },
        {
            id: "actions",
            header: "Actions",
            cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontal className="size-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Options</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openDetails(row.original)}>
                            View activity log
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => openFollowUpDialog([row.original])}>
                            Update lead status
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
                    <h1 className="text-2xl font-bold tracking-tight">Sales — Leads</h1>
                    <p className="text-muted-foreground">Manage captured prospect leads, update contact status, and track visitor engagement.</p>
                </div>

                {/* Metric Summary Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                            <Users className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <p className="text-xs text-muted-foreground">Captured prospects</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">New Prospects</CardTitle>
                            <UserCheck className="size-4 text-sky-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-sky-600">{stats.newCount}</div>
                            <p className="text-xs text-muted-foreground">Requires initial contact</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">In Contact / Follow-Up</CardTitle>
                            <PhoneCall className="size-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600">{stats.contacted}</div>
                            <p className="text-xs text-muted-foreground">Active sales dialog</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Won / Converted</CardTitle>
                            <TrendingUp className="size-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">{stats.won}</div>
                            <p className="text-xs text-muted-foreground">Successfully converted</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Table & Toolbar */}
                <DataTable
                    columns={columns}
                    data={sessions}
                    loading={loading}
                    filterPlaceholder="Search lead name..."
                    pageCount={Math.ceil(totalRows / pagination.pageSize)}
                    manualPagination
                    pagination={pagination}
                    onPaginationChange={setPagination}
                    toolbarLeft={
                        <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center">
                            <div className="relative w-full sm:w-[280px]">
                                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Search lead name..."
                                    className="pl-9"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    {LEAD_STATUSES.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    }
                />

                {/* Activity Detail Sheet */}
                <Sheet open={!!selectedSession} onOpenChange={(open) => !open && setSelectedSession(null)}>
                    <SheetContent className="w-full sm:max-w-lg">
                        <SheetHeader>
                            <SheetTitle>{selectedSession?.full_name || "Lead Details"}</SheetTitle>
                            <SheetDescription>Public page journey & interaction timeline</SheetDescription>
                        </SheetHeader>
                        <div className="mt-6 space-y-4">
                            <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
                                <p className="text-sm font-semibold">Contact Info</p>
                                <p className="text-xs text-muted-foreground">Email: {selectedSession?.email || "N/A"}</p>
                                <p className="text-xs text-muted-foreground">Phone: {selectedSession?.phone || "N/A"}</p>
                                <p className="text-xs text-muted-foreground">Status: {selectedSession?.lead_status || "new"}</p>
                                {selectedSession?.follow_up && (
                                    <p className="text-xs italic text-muted-foreground">Notes: {selectedSession.follow_up}</p>
                                )}
                            </div>

                            <h4 className="text-sm font-semibold pt-2">Page Activity Log</h4>
                            {loadingActivities ? (
                                <div className="flex items-center justify-center p-6">
                                    <Loader2 className="size-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : activities.length === 0 ? (
                                <p className="text-xs text-muted-foreground p-4 text-center">No recorded activity logs.</p>
                            ) : (
                                <div className="space-y-3">
                                    {activities.map((act) => (
                                        <div key={act.id} className="border-l-2 border-primary/40 pl-3 py-1 text-xs">
                                            <p className="font-medium text-foreground">{act.page_title || act.page_url}</p>
                                            <p className="text-muted-foreground font-mono">{act.page_url}</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(act.visited_at)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Follow-Up Status Dialog */}
                <Dialog open={!!followUpDialogSession} onOpenChange={(open) => !open && setFollowUpDialogSession(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Update Lead Status</DialogTitle>
                            <DialogDescription>Update lead progress status and internal notes.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold">Lead Status</label>
                                <Select value={selectedStatus} onValueChange={(val) => setSelectedStatus(val as LeadStatusValue)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {LEAD_STATUSES.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>
                                                {s.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold">Notes / Follow-Up Details</label>
                                <Textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Enter conversation notes or next action steps..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setFollowUpDialogSession(null)}>Cancel</Button>
                            <Button onClick={saveFollowUpStatus} disabled={savingStatus}>
                                {savingStatus ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
