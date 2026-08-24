"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ColumnDef, PaginationState } from "@tanstack/react-table";
import {
    ArrowUpDown,
    BookOpen,
    Calendar,
    CheckCircle2,
    Clock,
    DollarSign,
    Download,
    Globe,
    GraduationCap,
    HelpCircle,
    Loader2,
    Mail,
    MessageSquare,
    MoreHorizontal,
    PhoneCall,
    Plus,
    Search,
    Sparkles,
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
import { TooltipProvider } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";
import { readJsonResponse } from "@/lib/api/read-json-response";

export type SalesProgramOption = {
    id: number;
    title: string;
    duration_value?: number | null;
    duration_unit?: string | null;
    seats_available?: number | null;
    teaching_method?: string | null;
    languages?: string | null;
    categories?: string | null;
    board_name?: string | null;
    fee_components?: Array<{
        id?: number;
        title: string;
        amount: number;
        unit?: string | null;
        payment_mode?: string | null;
        discount_type?: string | null;
        discount_value?: number | null;
        final_amount?: number | null;
        installments_count?: number | null;
    }> | null;
};

type EnquiryRecord = {
    id: number;
    student_name: string;
    parent_name?: string | null;
    email?: string | null;
    phone: string;
    preferred_program?: string | null;
    source: string;
    status: EnquiryStatusValue;
    notes?: string | null;
    created_at: string;
    updated_at?: string;
};

type EnquiryStatusValue =
    | "new"
    | "qualified"
    | "garbage"
    | "contacted"
    | "waiting_for_response"
    | "negotiation"
    | "won"
    | "lost";

const ENQUIRY_STATUSES: Array<{
    value: EnquiryStatusValue;
    label: string;
    className: string;
}> = [
    { value: "new", label: "New Enquiry", className: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300" },
    { value: "qualified", label: "Qualified", className: "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300" },
    { value: "garbage", label: "Garbage", className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-300" },
    { value: "contacted", label: "Contacted", className: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300" },
    { value: "waiting_for_response", label: "Waiting for Response", className: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300" },
    { value: "negotiation", label: "Negotiation", className: "border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-300" },
    { value: "won", label: "Won", className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" },
    { value: "lost", label: "Lost", className: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300" },
];

function formatDate(value: string) {
    return new Date(value).toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function EnquiryStatusBadge({ status }: { status: EnquiryStatusValue }) {
    const s = ENQUIRY_STATUSES.find((item) => item.value === status) ?? ENQUIRY_STATUSES[0];
    return (
        <Badge variant="outline" className={`font-medium ${s.className}`}>
            {s.label}
        </Badge>
    );
}

export default function SalesEnquiriesPage() {
    useAdminGuard();
    const { accessToken } = useAuthStore();

    const [enquiries, setEnquiries] = useState<EnquiryRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [timeframeFilter, setTimeframeFilter] = useState<string>("all");
    const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 20 });
    const [totalRows, setTotalRows] = useState(0);

    // Modal dialog states for New Enquiry
    const [createOpen, setCreateOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formName, setFormName] = useState("");
    const [formParent, setFormParent] = useState("");
    const [formPhone, setFormPhone] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formProgram, setFormProgram] = useState("");
    const [formSource, setFormSource] = useState("Walk-in");
    const [formNotes, setFormNotes] = useState("");

    // Programs list fetched from institution admin
    const [programsOptions, setProgramsOptions] = useState<SalesProgramOption[]>([]);
    const [loadingPrograms, setLoadingPrograms] = useState(false);

    // Details & Status update dialog
    const [selectedEnquiry, setSelectedEnquiry] = useState<EnquiryRecord | null>(null);
    const [statusDialogEnquiry, setStatusDialogEnquiry] = useState<EnquiryRecord | null>(null);
    const [updateStatus, setUpdateStatus] = useState<EnquiryStatusValue>("contacted");
    const [updateNotes, setUpdateNotes] = useState("");
    const [updating, setUpdating] = useState(false);

    const fetchEnquiries = useCallback(async () => {
        if (!accessToken) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: String(pagination.pageSize),
                offset: String(pagination.pageIndex * pagination.pageSize),
            });
            if (searchTerm.trim()) params.set("search", searchTerm.trim());
            if (statusFilter !== "all") params.set("status", statusFilter);

            const res = await fetch(`/api/admin/sales/enquiries?${params.toString()}`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const json = await readJsonResponse<{ data?: EnquiryRecord[]; total?: number; error?: string }>(res);
            if (!res.ok) throw new Error(json.error || "Failed to load enquiries");
            setEnquiries(json.data || []);
            setTotalRows(json.total || (json.data || []).length);
        } catch {
            // Fallback sample data if endpoint not seeded yet
            setEnquiries([
                { id: 1, student_name: "Rahul Verma", parent_name: "Suresh Verma", phone: "+91 98765 43210", email: "suresh@example.com", preferred_program: "Class 10 - Science", source: "Walk-in", status: "new", notes: "Inquired about admission fees & schedule", created_at: new Date().toISOString() },
                { id: 2, student_name: "Priya Sharma", parent_name: "Anita Sharma", phone: "+91 98123 45678", email: "priya.sharma@example.com", preferred_program: "Class 12 - Commerce", source: "Website", status: "contacted", notes: "Sent prospectus on email", created_at: new Date().toISOString() },
            ]);
            setTotalRows(2);
        } finally {
            setLoading(false);
        }
    }, [accessToken, pagination.pageIndex, pagination.pageSize, searchTerm, statusFilter]);

    useEffect(() => {
        fetchEnquiries();
    }, [fetchEnquiries]);

    const fetchPrograms = useCallback(async () => {
        if (!accessToken) return;
        setLoadingPrograms(true);
        try {
            const res = await fetch(`/api/admin/institutions/programs?limit=100`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            const json = await readJsonResponse<{ data?: SalesProgramOption[]; error?: string }>(res);
            if (res.ok && json.data) {
                setProgramsOptions(json.data);
            }
        } catch {
            // fallback
        } finally {
            setLoadingPrograms(false);
        }
    }, [accessToken]);

    useEffect(() => {
        fetchPrograms();
    }, [fetchPrograms]);

    const handleCreateEnquiry = async () => {
        if (!formName.trim()) {
            toast.error("Please enter applicant / student name");
            return;
        }
        if (!formPhone.trim()) {
            toast.error("Please enter contact phone number");
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/sales/enquiries`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    student_name: formName,
                    parent_name: formParent,
                    phone: formPhone,
                    email: formEmail,
                    preferred_program: formProgram,
                    source: formSource,
                    notes: formNotes,
                }),
            });
            const json = await readJsonResponse<{ data?: EnquiryRecord; error?: string }>(res);
            if (!res.ok) throw new Error(json.error || "Failed to add enquiry");
            toast.success("New enquiry recorded successfully");
            setCreateOpen(false);
            setFormName("");
            setFormParent("");
            setFormPhone("");
            setFormEmail("");
            setFormProgram("");
            setFormNotes("");
            fetchEnquiries();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to record enquiry");
        } finally {
            setSaving(false);
        }
    };

    const handleUpdateStatus = async () => {
        if (!statusDialogEnquiry || !accessToken) return;
        setUpdating(true);
        try {
            const res = await fetch(`/api/admin/sales/enquiries/${statusDialogEnquiry.id}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status: updateStatus,
                    notes: updateNotes,
                }),
            });
            const json = await readJsonResponse<{ error?: string }>(res);
            if (!res.ok) throw new Error(json.error || "Failed to update enquiry status");
            toast.success("Enquiry status updated");
            setStatusDialogEnquiry(null);
            fetchEnquiries();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : "Failed to update enquiry");
        } finally {
            setUpdating(false);
        }
    };

    const selectedProgramObj = useMemo(() => {
        return programsOptions.find((p) => p.title === formProgram || String(p.id) === formProgram);
    }, [programsOptions, formProgram]);

    const uniquePrograms = useMemo(() => {
        const seen = new Set<string>();
        const list: SalesProgramOption[] = [];
        for (const p of programsOptions) {
            const cleanTitle = p.title?.trim();
            if (cleanTitle && !seen.has(cleanTitle)) {
                seen.add(cleanTitle);
                list.push(p);
            }
        }
        return list;
    }, [programsOptions]);

    const displayedEnquiries = useMemo(() => {
        if (timeframeFilter === "all") return enquiries;
        return enquiries.filter((e) => {
            if (!e.created_at) return true;
            const date = new Date(e.created_at);
            if (isNaN(date.getTime())) return true;
            const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
            if (timeframeFilter === "weekly") return diffDays <= 7;
            if (timeframeFilter === "monthly") return diffDays <= 30;
            if (timeframeFilter === "yearly") return diffDays <= 365;
            return true;
        });
    }, [enquiries, timeframeFilter]);

    const stats = useMemo(() => {
        const total = displayedEnquiries.length;
        const newCount = displayedEnquiries.filter((e) => e.status === "new").length;
        const inProgress = displayedEnquiries.filter((e) => ["contacted", "qualified", "waiting_for_response", "negotiation"].includes(e.status)).length;
        const converted = displayedEnquiries.filter((e) => e.status === "won").length;
        return { total, newCount, inProgress, converted };
    }, [displayedEnquiries]);

    const columns: ColumnDef<EnquiryRecord>[] = useMemo(() => [
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
            accessorKey: "student_name",
            header: "Applicant / Student",
            cell: ({ row }) => (
                <div>
                    <p className="font-semibold text-foreground">{row.original.student_name}</p>
                    {row.original.parent_name && (
                        <p className="text-xs text-muted-foreground">Parent: {row.original.parent_name}</p>
                    )}
                </div>
            ),
        },
        {
            accessorKey: "phone",
            header: "Contact",
            cell: ({ row }) => (
                <div>
                    <p className="text-sm font-medium">{row.original.phone}</p>
                    {row.original.email && <p className="text-xs text-muted-foreground">{row.original.email}</p>}
                </div>
            ),
        },
        {
            accessorKey: "preferred_program",
            header: "Program & Course Details",
            cell: ({ row }) => {
                const programName = row.original.preferred_program || "General Enquiry";
                const matched = programsOptions.find(
                    (p) => p.title.toLowerCase() === programName.toLowerCase() || String(p.id) === programName
                );

                if (!matched) {
                    return <span className="text-xs font-semibold text-foreground">{programName}</span>;
                }

                const primaryFee = matched.fee_components?.[0];
                const feeText = primaryFee
                    ? `₹${Number(primaryFee.amount).toLocaleString()}${primaryFee.unit ? `/${primaryFee.unit}` : ""}`
                    : null;
                const durationText = matched.duration_value
                    ? `${matched.duration_value} ${matched.duration_unit || "Yr"}`
                    : null;

                return (
                    <div className="space-y-1 py-0.5 max-w-[280px]">
                        <p className="text-xs font-bold text-foreground truncate">{matched.title}</p>
                        <div className="flex items-center gap-1 flex-wrap">
                            {feeText && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold text-primary bg-primary/5 border-primary/20">
                                    💰 {feeText}
                                </Badge>
                            )}
                            {durationText && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium bg-muted/60">
                                    ⏱️ {durationText}
                                </Badge>
                            )}
                            {matched.teaching_method && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium bg-muted/60">
                                    🏫 {matched.teaching_method}
                                </Badge>
                            )}
                            {matched.seats_available != null && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium bg-muted/60">
                                    🪑 {matched.seats_available} Seats
                                </Badge>
                            )}
                            {matched.languages && (
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-medium bg-muted/60">
                                    🌐 {matched.languages}
                                </Badge>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "source",
            header: "Source",
            cell: ({ row }) => (
                <Badge variant="secondary" className="font-normal">
                    {row.original.source}
                </Badge>
            ),
        },
        {
            accessorKey: "status",
            header: "Status",
            cell: ({ row }) => <EnquiryStatusBadge status={row.original.status} />,
        },
        {
            accessorKey: "created_at",
            header: "Date",
            cell: ({ row }) => (
                <span className="text-xs text-muted-foreground">{formatDate(row.original.created_at)}</span>
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
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => setSelectedEnquiry(row.original)}>
                            View details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={() => {
                                setStatusDialogEnquiry(row.original);
                                setUpdateStatus(row.original.status);
                                setUpdateNotes(row.original.notes || "");
                            }}
                        >
                            Update status
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            ),
        },
    ], []);

    return (
        <TooltipProvider>
            <div className="space-y-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Sales — Enquiries</h1>
                        <p className="text-muted-foreground">Track admission & course enquiries, follow up with parents/students, and manage admissions.</p>
                    </div>
                    <Button onClick={() => setCreateOpen(true)} className="gap-2 bg-rose-600 hover:bg-rose-700 text-white">
                        <Plus className="size-4" />
                        + Record New Enquiry
                    </Button>
                </div>

                {/* Summary Metric Cards */}
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Total Enquiries</CardTitle>
                            <MessageSquare className="size-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                            <p className="text-xs text-muted-foreground">Received admission inquiries</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">New Enquiries</CardTitle>
                            <Mail className="size-4 text-sky-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-sky-600">{stats.newCount}</div>
                            <p className="text-xs text-muted-foreground">Awaiting initial response</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                            <PhoneCall className="size-4 text-amber-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-amber-600">{stats.inProgress}</div>
                            <p className="text-xs text-muted-foreground">Active follow-up stage</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium">Admissions Taken</CardTitle>
                            <CheckCircle2 className="size-4 text-emerald-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-emerald-600">{stats.converted}</div>
                            <p className="text-xs text-muted-foreground">Enrolled students</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Data Table */}
                <DataTable
                    columns={columns}
                    data={displayedEnquiries}
                    loading={loading}
                    filterPlaceholder="Search student or parent name..."
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
                                    placeholder="Search name or phone..."
                                    className="pl-9"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[170px]">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    {ENQUIRY_STATUSES.map((s) => (
                                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={timeframeFilter} onValueChange={setTimeframeFilter}>
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue placeholder="All Time" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Time</SelectItem>
                                    <SelectItem value="weekly">Weekly (7 Days)</SelectItem>
                                    <SelectItem value="monthly">Monthly (30 Days)</SelectItem>
                                    <SelectItem value="yearly">Yearly (365 Days)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    }
                />

                {/* Record New Enquiry Dialog */}
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Record New Enquiry</DialogTitle>
                            <DialogDescription>Add a new walk-in, phone call, or online admission inquiry.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-3 sm:grid-cols-2">
                            <div className="space-y-1.5 sm:col-span-1 min-w-0">
                                <label className="text-xs font-semibold">Student / Applicant Name *</label>
                                <Input
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="e.g. Rahul Verma"
                                    className="text-xs"
                                />
                            </div>
                            <div className="space-y-1.5 sm:col-span-1 min-w-0">
                                <label className="text-xs font-semibold">Contact Phone Number *</label>
                                <Input
                                    value={formPhone}
                                    onChange={(e) => setFormPhone(e.target.value)}
                                    placeholder="+91 98765 43210"
                                    className="text-xs"
                                />
                            </div>
                            <div className="space-y-1.5 sm:col-span-1 min-w-0">
                                <label className="text-xs font-semibold">Email Address</label>
                                <Input
                                    value={formEmail}
                                    onChange={(e) => setFormEmail(e.target.value)}
                                    placeholder="applicant@example.com"
                                    className="text-xs"
                                />
                            </div>
                            <div className="space-y-1.5 sm:col-span-1 min-w-0">
                                <label className="text-xs font-semibold">Preferred Program / Class</label>
                                <Select value={formProgram} onValueChange={(val) => setFormProgram(val)}>
                                    <SelectTrigger className="w-full text-xs truncate">
                                        <SelectValue placeholder={loadingPrograms ? "Loading programs..." : "Select Single Program"} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-60 max-w-sm">
                                        {uniquePrograms.length > 0 ? (
                                            uniquePrograms.map((p) => (
                                                <SelectItem key={p.id} value={p.title} className="text-xs truncate">
                                                    {p.title}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <SelectItem value="General Enquiry" className="text-xs">General Enquiry</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Live Selected Program Info Preview Card */}
                            {selectedProgramObj && (
                                <div className="sm:col-span-2 p-3 rounded-xl bg-muted/40 border border-border/80 space-y-2 text-xs">
                                    <div className="flex items-center justify-between">
                                        <span className="font-extrabold text-foreground flex items-center gap-1.5">
                                            <BookOpen className="h-4 w-4 text-primary" />
                                            {selectedProgramObj.title}
                                        </span>
                                        {selectedProgramObj.teaching_method && (
                                            <Badge variant="outline" className="text-[10px] font-bold bg-background">
                                                🏫 {selectedProgramObj.teaching_method}
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t border-border/50 text-[11px]">
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">⏱️ Duration</span>
                                            <span className="font-bold text-foreground">
                                                {selectedProgramObj.duration_value ? `${selectedProgramObj.duration_value} ${selectedProgramObj.duration_unit || "Yr"}` : "Standard"}
                                            </span>
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">🪑 Available Seats</span>
                                            <span className="font-bold text-foreground">
                                                {selectedProgramObj.seats_available != null ? `${selectedProgramObj.seats_available} Seats` : "Open Intake"}
                                            </span>
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">🏫 Mode</span>
                                            <span className="font-bold text-foreground truncate block">
                                                {selectedProgramObj.teaching_method || "Classroom / Offline"}
                                            </span>
                                        </div>
                                        <div className="space-y-0.5">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">🌐 Languages</span>
                                            <span className="font-bold text-foreground truncate block">
                                                {selectedProgramObj.languages || "English, Hindi"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Fee Structure Preview */}
                                    {selectedProgramObj.fee_components && selectedProgramObj.fee_components.length > 0 && (
                                        <div className="pt-1.5 border-t border-border/50 space-y-1">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                                                💰 Available Fee Plans:
                                            </span>
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                {selectedProgramObj.fee_components.map((f, i) => {
                                                    const numAmt = Number(f.amount) || 0;
                                                    const numDisc = Number(f.discount_value) || 0;
                                                    const hasDisc = numDisc > 0;
                                                    const deduction = hasDisc
                                                        ? f.discount_type === "percentage" ? (numAmt * Math.min(100, numDisc)) / 100 : Math.min(numAmt, numDisc)
                                                        : 0;
                                                    const net = Math.max(0, numAmt - deduction);
                                                    return (
                                                        <Badge key={i} variant="secondary" className="text-[10.5px] font-semibold py-0.5 px-2 bg-background border border-border">
                                                            <strong>{f.title || "Fee"}:</strong>&nbsp;
                                                            {hasDisc && <span className="line-through text-muted-foreground mr-1">₹{numAmt.toLocaleString()}</span>}
                                                            <span className="text-primary font-bold">₹{net.toLocaleString()}</span>
                                                            <span className="text-muted-foreground ml-0.5">/{f.unit || "month"}</span>
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="space-y-1.5 sm:col-span-2 min-w-0">
                                <label className="text-xs font-semibold">Enquiry Source</label>
                                <Select value={formSource} onValueChange={setFormSource}>
                                    <SelectTrigger className="w-full text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Walk-in">Walk-in</SelectItem>
                                        <SelectItem value="Phone Call">Phone Call</SelectItem>
                                        <SelectItem value="Website">Website</SelectItem>
                                        <SelectItem value="EduBird">EduBird</SelectItem>
                                        <SelectItem value="Social Media">Social Media</SelectItem>
                                        <SelectItem value="Referral">Referral</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5 sm:col-span-2">
                                <label className="text-xs font-semibold">Enquiry Notes & Details</label>
                                <Textarea
                                    value={formNotes}
                                    onChange={(e) => setFormNotes(e.target.value)}
                                    placeholder="Enter details of what the parent/student asked..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                            <Button onClick={handleCreateEnquiry} disabled={saving} className="bg-rose-600 hover:bg-rose-700 text-white">
                                {saving ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                                Save Enquiry
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* View Details Sheet */}
                <Sheet open={!!selectedEnquiry} onOpenChange={(open) => !open && setSelectedEnquiry(null)}>
                    <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                        <SheetHeader>
                            <SheetTitle>{selectedEnquiry?.student_name}</SheetTitle>
                            <SheetDescription>Enquiry details & contact history</SheetDescription>
                        </SheetHeader>
                        <div className="mt-6 space-y-4 text-sm">
                            <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
                                <p className="font-semibold text-foreground">Applicant Info</p>
                                <p><span className="text-muted-foreground">Student:</span> {selectedEnquiry?.student_name}</p>
                                <p><span className="text-muted-foreground">Parent:</span> {selectedEnquiry?.parent_name || "N/A"}</p>
                                <p><span className="text-muted-foreground">Phone:</span> {selectedEnquiry?.phone}</p>
                                <p><span className="text-muted-foreground">Email:</span> {selectedEnquiry?.email || "N/A"}</p>
                                <p><span className="text-muted-foreground">Program:</span> {selectedEnquiry?.preferred_program || "General"}</p>
                                <p><span className="text-muted-foreground">Source:</span> {selectedEnquiry?.source}</p>
                                <p><span className="text-muted-foreground">Status:</span> {selectedEnquiry?.status}</p>
                                <p><span className="text-muted-foreground">Recorded On:</span> {selectedEnquiry?.created_at ? formatDate(selectedEnquiry.created_at) : "N/A"}</p>
                            </div>

                            {/* Program Info Card in Details Drawer */}
                            {(() => {
                                const prog = programsOptions.find(
                                    (p) => p.title.toLowerCase() === (selectedEnquiry?.preferred_program || "").toLowerCase() || String(p.id) === selectedEnquiry?.preferred_program
                                );
                                if (!prog) return null;
                                return (
                                    <div className="rounded-lg border p-4 space-y-2.5 bg-card shadow-2xs">
                                        <div className="flex items-center justify-between">
                                            <p className="font-extrabold text-foreground flex items-center gap-1.5 text-xs">
                                                <BookOpen className="h-4 w-4 text-primary" />
                                                {prog.title}
                                            </p>
                                            {prog.teaching_method && (
                                                <Badge variant="outline" className="text-[10px] font-bold">
                                                    {prog.teaching_method}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50">
                                            <div>
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold block">⏱️ Duration</span>
                                                <span className="font-semibold">{prog.duration_value ? `${prog.duration_value} ${prog.duration_unit || "Yr"}` : "Standard"}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold block">🪑 Available Seats</span>
                                                <span className="font-semibold">{prog.seats_available != null ? `${prog.seats_available} Seats` : "Open"}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold block">🏫 Mode</span>
                                                <span className="font-semibold">{prog.teaching_method || "Classroom / Offline"}</span>
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold block">🌐 Languages</span>
                                                <span className="font-semibold">{prog.languages || "English, Hindi"}</span>
                                            </div>
                                        </div>
                                        {prog.fee_components && prog.fee_components.length > 0 && (
                                            <div className="pt-1.5 border-t border-border/50 space-y-1">
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold block">💰 Fee Options:</span>
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    {prog.fee_components.map((f, i) => (
                                                        <Badge key={i} variant="secondary" className="text-[10px] py-0.5 px-2 bg-muted/60">
                                                            {f.title}: <strong>₹{Number(f.amount).toLocaleString()}</strong>/{f.unit || "mo"}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                            {selectedEnquiry?.notes && (
                                <div className="rounded-lg border p-4 space-y-1">
                                    <p className="font-semibold">Notes</p>
                                    <p className="text-muted-foreground text-xs">{selectedEnquiry.notes}</p>
                                </div>
                            )}
                        </div>
                    </SheetContent>
                </Sheet>

                {/* Update Status Dialog */}
                <Dialog open={!!statusDialogEnquiry} onOpenChange={(open) => !open && setStatusDialogEnquiry(null)}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Update Enquiry Status</DialogTitle>
                            <DialogDescription>Update stage and add follow-up remarks.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold">Status Stage</label>
                                <Select value={updateStatus} onValueChange={(val) => setUpdateStatus(val as EnquiryStatusValue)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ENQUIRY_STATUSES.map((s) => (
                                            <SelectItem key={s.value} value={s.value}>
                                                {s.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold">Follow-up Remarks</label>
                                <Textarea
                                    value={updateNotes}
                                    onChange={(e) => setUpdateNotes(e.target.value)}
                                    placeholder="Enter follow-up conversation details..."
                                    rows={3}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setStatusDialogEnquiry(null)}>Cancel</Button>
                            <Button onClick={handleUpdateStatus} disabled={updating}>
                                {updating ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                                Save Status
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );
}
