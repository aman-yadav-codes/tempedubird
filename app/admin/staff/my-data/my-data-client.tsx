"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  Filter,
  HelpCircle,
  IndianRupee,
  Layers,
  ListTodo,
  Loader2,
  MessageSquare,
  Plus,
  Printer,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MonthPicker } from "@/components/shared/month-picker";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";

// ==================== Types ====================
type NoticeItem = {
  id: number;
  title: string;
  content: string;
  priority?: "low" | "normal" | "high" | "urgent";
  target_role?: string;
  category_name?: string;
  published_at?: string;
  created_at: string;
  author_name?: string;
  attachment_url?: string;
};

type ComplaintItem = {
  id: number;
  title: string;
  description: string;
  status: "pending" | "under_review" | "in_progress" | "resolved" | "rejected";
  priority?: "low" | "medium" | "high" | "urgent";
  category?: string;
  created_by_name?: string;
  created_at: string;
  assigned_to_name?: string;
  resolution?: string;
};

type TaskItem = {
  id: number;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "completed" | "on_hold" | "cancelled";
  urgency?: "low" | "medium" | "high" | "urgent";
  due_date?: string;
  progress?: number;
  sub_tasks?: Array<{ title: string; is_completed?: boolean; status?: string }>;
  created_at?: string;
};

type PerformanceData = {
  score: number;
  totalTasks: number;
  completedTasks: number;
  pointsEarned: number;
  deliverables?: Array<{
    id: number;
    title: string;
    status: string;
    points: number;
    date: string;
  }>;
  pointsHistory?: Array<{
    id: number;
    reason: string;
    points: number;
    created_at: string;
  }>;
};

type AttendanceLog = {
  id: number;
  attendance_date: string;
  status: "present" | "absent" | "late" | "half_day" | "leave";
  check_in_time?: string;
  check_out_time?: string;
  remarks?: string;
};

type AttendanceSummary = {
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  leaveDays: number;
  workingDays: number;
};

type TicketItem = {
  id: number;
  ticket_number?: string;
  subject: string;
  description?: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category?: string;
  created_at: string;
  creator_name?: string;
};

type DocumentItem = {
  id: number | string;
  title: string;
  category_name?: string;
  template_name?: string;
  created_at: string;
  rendered_html?: string;
  image_url?: string;
  pdf_url?: string;
};

type SalarySummary = {
  baseSalary: number;
  deductionAmount: number;
  payableSalary: number;
  payoutStatus?: "PAID" | "UNPAID";
  paidAt?: string;
};

function formatMonth(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function formatDateDisplay(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(val?: number | string) {
  return Number(val || 0).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

export function MyDataClient() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const institutionId = activeInstitution?.id ? String(activeInstitution.id) : "";

  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));

  // Module States
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [performance, setPerformance] = useState<PerformanceData>({
    score: 85,
    totalTasks: 0,
    completedTasks: 0,
    pointsEarned: 0,
    deliverables: [],
    pointsHistory: [],
  });
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLog[]>([]);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary>({
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    halfDays: 0,
    leaveDays: 0,
    workingDays: 0,
  });
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [salarySummary, setSalarySummary] = useState<SalarySummary | null>(null);

  // Search & Filter
  const [search, setSearch] = useState("");

  // Dialogs
  const [selectedNotice, setSelectedNotice] = useState<NoticeItem | null>(null);
  const [newComplaintOpen, setNewComplaintOpen] = useState(false);
  const [complaintForm, setComplaintForm] = useState({ title: "", description: "", category: "General", priority: "medium" });
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  const [newTicketOpen, setNewTicketOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({ subject: "", description: "", category: "General", priority: "medium" });
  const [submittingTicket, setSubmittingTicket] = useState(false);

  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);

  const authHeaders = useMemo(
    () => (accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined),
    [accessToken]
  );

  // Fetch all employee records
  const loadMyData = useCallback(async () => {
    if (!isReady || !authHeaders) return;
    setLoading(true);

    try {
      const instQuery = institutionId ? `&institutionId=${institutionId}` : "";

      // 1. Noticeboard
      const fetchNotices = fetch(`/api/admin/institutions/news?limit=20${instQuery}`, { headers: authHeaders })
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((j) => setNotices(Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []))
        .catch(() => setNotices([]));

      // 2. Complaints
      const fetchComplaints = fetch(`/api/admin/institution/complaints?limit=20${instQuery}`, { headers: authHeaders })
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((j) => setComplaints(Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []))
        .catch(() => setComplaints([]));

      // 3. Tasks
      const fetchTasks = fetch(`/api/admin/operations/tasks?scope=me${instQuery}`, { headers: authHeaders })
        .then((r) => (r.ok ? r.json() : { tasks: [] }))
        .then((j) => setTasks(Array.isArray(j?.tasks) ? j.tasks : []))
        .catch(() => setTasks([]));

      // 4. Performance
      const fetchPerf = fetch(`/api/admin/staff/performance?mode=self${instQuery}`, { headers: authHeaders })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j) {
            setPerformance({
              score: Number(j.performanceScore || j.score || 85),
              totalTasks: Number(j.totalTasks || 0),
              completedTasks: Number(j.completedTasks || 0),
              pointsEarned: Number(j.pointsEarned || 0),
              deliverables: j.deliverables || [],
              pointsHistory: j.pointsHistory || [],
            });
          }
        })
        .catch(() => {});

      // 5. Attendance
      const fetchAttendance = fetch(`/api/admin/staff/attendance?mode=self&month=${month}${instQuery}`, { headers: authHeaders })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j) {
            setAttendanceLogs(j.logs || j.records || []);
            setAttendanceSummary({
              presentDays: Number(j.presentDays || j.present_count || 0),
              absentDays: Number(j.absentDays || j.absent_count || 0),
              lateDays: Number(j.lateDays || j.late_count || 0),
              halfDays: Number(j.halfDays || j.half_day_count || 0),
              leaveDays: Number(j.leaveDays || j.leave_count || 0),
              workingDays: Number(j.workingDays || j.total_working_days || 0),
            });
          }
        })
        .catch(() => {});

      // 6. Queries / Tickets
      const fetchTickets = fetch(`/api/admin/support/tickets?limit=20${instQuery}`, { headers: authHeaders })
        .then((r) => (r.ok ? r.json() : { tickets: [] }))
        .then((j) => setTickets(Array.isArray(j?.tickets) ? j.tickets : Array.isArray(j?.data) ? j.data : []))
        .catch(() => setTickets([]));

      // 7. Documents (Letters + Salary)
      const fetchDocs = fetch(`/api/admin/staff/letters?mode=self&limit=30${instQuery}`, { headers: authHeaders })
        .then((r) => (r.ok ? r.json() : { data: [] }))
        .then((j) => setDocuments(Array.isArray(j?.data) ? j.data : []))
        .catch(() => setDocuments([]));

      const fetchSalary = fetch(`/api/admin/staff/salary?mode=self&month=${month}${instQuery}`, { headers: authHeaders })
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j && Array.isArray(j.salary) && j.salary[0]) {
            const s = j.salary[0];
            setSalarySummary({
              baseSalary: Number(s.base_salary || 0),
              deductionAmount: Number(s.deduction_amount || 0),
              payableSalary: Number(s.payable_salary || 0),
              payoutStatus: s.payout_status || "UNPAID",
              paidAt: s.paid_at,
            });
          }
        })
        .catch(() => {});

      await Promise.allSettled([
        fetchNotices,
        fetchComplaints,
        fetchTasks,
        fetchPerf,
        fetchAttendance,
        fetchTickets,
        fetchDocs,
        fetchSalary,
      ]);
    } catch (err) {
      console.error("Failed to load employee data:", err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders, institutionId, isReady, month]);

  useEffect(() => {
    void loadMyData();
  }, [loadMyData]);

  // Handle complaint creation
  const handleCreateComplaint = async () => {
    if (!complaintForm.title.trim() || !complaintForm.description.trim()) {
      toast.error("Please fill in both title and description");
      return;
    }
    setSubmittingComplaint(true);
    try {
      const res = await fetch("/api/admin/institution/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          ...complaintForm,
          institutionId: institutionId ? Number(institutionId) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit complaint");
      toast.success("Complaint submitted successfully");
      setNewComplaintOpen(false);
      setComplaintForm({ title: "", description: "", category: "General", priority: "medium" });
      void loadMyData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create complaint");
    } finally {
      setSubmittingComplaint(false);
    }
  };

  // Handle query ticket creation
  const handleCreateTicket = async () => {
    if (!ticketForm.subject.trim() || !ticketForm.description.trim()) {
      toast.error("Please fill in both subject and description");
      return;
    }
    setSubmittingTicket(true);
    try {
      const res = await fetch("/api/admin/support/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        body: JSON.stringify({
          ...ticketForm,
          institutionId: institutionId ? Number(institutionId) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit query");
      toast.success("Query submitted successfully");
      setNewTicketOpen(false);
      setTicketForm({ subject: "", description: "", category: "General", priority: "medium" });
      void loadMyData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create query");
    } finally {
      setSubmittingTicket(false);
    }
  };

  // Instant print for document
  const handlePrintDoc = (htmlContent?: string) => {
    if (!htmlContent) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Document Print</title>
          <style>
            @page { size: A4 portrait; margin: 0; }
            body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          </style>
        </head>
        <body>${htmlContent}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

  // Instant PDF download
  const handleDownloadPdf = async (htmlContent?: string, filename = "document") => {
    if (!htmlContent) return;
    const toastId = toast.loading("Generating PDF...");
    try {
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.top = "-9999px";
      container.style.left = "-9999px";
      container.style.width = "794px";
      container.style.background = "#ffffff";
      container.innerHTML = htmlContent;
      document.body.appendChild(container);

      const canvas = await html2canvas(container, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF("p", "pt", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${filename}.pdf`);
      document.body.removeChild(container);
      toast.success("PDF downloaded!", { id: toastId });
    } catch (err) {
      toast.error("Failed to generate PDF", { id: toastId });
    }
  };

  return (
    <div className="space-y-6 w-full max-w-full">
      {/* Header Banner */}
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-background to-primary/5 p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md">
              <User className="size-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  My Data
                </h1>
                <Badge variant="outline" className="text-xs bg-background/80">
                  {((user as unknown as Record<string, unknown>)?.role_label as string) || user?.primary_role || "Employee Workspace"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Your personal employee portal: notices, complaints, tasks, performance, attendance, queries, and documents.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void loadMyData()}
              disabled={loading}
              className="gap-1.5 shadow-xs"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick KPI Stats Row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7 mt-6">
          <div
            onClick={() => setActiveTab("notices")}
            className="cursor-pointer rounded-xl border border-border/80 bg-card/60 p-3 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Notices</span>
              <Bell className="size-3.5 text-amber-500" />
            </div>
            <div className="text-xl font-bold mt-1 text-foreground">{notices.length}</div>
            <div className="text-[10px] text-muted-foreground">Circulars active</div>
          </div>

          <div
            onClick={() => setActiveTab("complaints")}
            className="cursor-pointer rounded-xl border border-border/80 bg-card/60 p-3 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Complaints</span>
              <ShieldAlert className="size-3.5 text-rose-500" />
            </div>
            <div className="text-xl font-bold mt-1 text-foreground">{complaints.length}</div>
            <div className="text-[10px] text-muted-foreground">Total records</div>
          </div>

          <div
            onClick={() => setActiveTab("performance")}
            className="cursor-pointer rounded-xl border border-border/80 bg-card/60 p-3 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Performance</span>
              <TrendingUp className="size-3.5 text-primary" />
            </div>
            <div className="text-xl font-bold mt-1 text-foreground">{performance.score}%</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              {performance.pointsEarned} pts
            </div>
          </div>

          <div
            onClick={() => setActiveTab("tasks")}
            className="cursor-pointer rounded-xl border border-border/80 bg-card/60 p-3 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>My Tasks</span>
              <ListTodo className="size-3.5 text-blue-500" />
            </div>
            <div className="text-xl font-bold mt-1 text-foreground">{tasks.length}</div>
            <div className="text-[10px] text-muted-foreground">Assigned tasks</div>
          </div>

          <div
            onClick={() => setActiveTab("attendance")}
            className="cursor-pointer rounded-xl border border-border/80 bg-card/60 p-3 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Attendance</span>
              <Calendar className="size-3.5 text-emerald-500" />
            </div>
            <div className="text-xl font-bold mt-1 text-foreground">
              {attendanceSummary.presentDays} <span className="text-xs font-normal text-muted-foreground">/ {attendanceSummary.workingDays || 30}d</span>
            </div>
            <div className="text-[10px] text-muted-foreground">{attendanceSummary.leaveDays} leaves</div>
          </div>

          <div
            onClick={() => setActiveTab("queries")}
            className="cursor-pointer rounded-xl border border-border/80 bg-card/60 p-3 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>My Queries</span>
              <HelpCircle className="size-3.5 text-purple-500" />
            </div>
            <div className="text-xl font-bold mt-1 text-foreground">{tickets.length}</div>
            <div className="text-[10px] text-muted-foreground">Support queries</div>
          </div>

          <div
            onClick={() => setActiveTab("documents")}
            className="cursor-pointer rounded-xl border border-border/80 bg-card/60 p-3 hover:bg-muted/40 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Documents</span>
              <FileCheck className="size-3.5 text-teal-500" />
            </div>
            <div className="text-xl font-bold mt-1 text-foreground">{documents.length}</div>
            <div className="text-[10px] text-muted-foreground">Issued letters</div>
          </div>
        </div>
      </div>

      {/* Main Tabs System */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex overflow-x-auto pb-1">
          <TabsList className="h-10 bg-muted/60 p-1">
            <TabsTrigger value="overview" className="gap-1.5 text-xs">
              <Layers className="size-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="notices" className="gap-1.5 text-xs">
              <Bell className="size-3.5" />
              Noticeboard ({notices.length})
            </TabsTrigger>
            <TabsTrigger value="complaints" className="gap-1.5 text-xs">
              <ShieldAlert className="size-3.5" />
              Complaints ({complaints.length})
            </TabsTrigger>
            <TabsTrigger value="performance" className="gap-1.5 text-xs">
              <TrendingUp className="size-3.5" />
              My Performance
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-1.5 text-xs">
              <ListTodo className="size-3.5" />
              My Tasks ({tasks.length})
            </TabsTrigger>
            <TabsTrigger value="attendance" className="gap-1.5 text-xs">
              <Calendar className="size-3.5" />
              My Attendance
            </TabsTrigger>
            <TabsTrigger value="queries" className="gap-1.5 text-xs">
              <HelpCircle className="size-3.5" />
              My Queries ({tickets.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="gap-1.5 text-xs">
              <FileCheck className="size-3.5" />
              Documents ({documents.length})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ================= OVERVIEW TAB ================= */}
        <TabsContent value="overview" className="space-y-5">
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {/* Recent Notices */}
            <Card className="shadow-xs">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Bell className="size-4 text-amber-500" />
                    Latest Notices
                  </CardTitle>
                  <CardDescription className="text-xs">Published for your role & campus</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("notices")} className="text-xs h-7 px-2">
                  View all
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {notices.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No notices published yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {notices.slice(0, 3).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => setSelectedNotice(n)}
                        className="cursor-pointer rounded-lg border border-border/70 p-2.5 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-xs truncate">{n.title}</p>
                          {n.priority === "urgent" && (
                            <Badge variant="destructive" className="text-[9px] px-1 py-0">Urgent</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{n.content}</p>
                        <p className="text-[10px] text-muted-foreground/80 mt-1">{formatDateDisplay(n.created_at)}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tasks in Progress */}
            <Card className="shadow-xs">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <ListTodo className="size-4 text-blue-500" />
                    Assigned Tasks
                  </CardTitle>
                  <CardDescription className="text-xs">Deliverables assigned to you</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("tasks")} className="text-xs h-7 px-2">
                  View all
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-4 text-center">No tasks assigned to you.</p>
                ) : (
                  <div className="space-y-2.5">
                    {tasks.slice(0, 3).map((t) => (
                      <div key={t.id} className="rounded-lg border border-border/70 p-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold text-xs truncate">{t.title}</p>
                          <Badge variant="outline" className="text-[9px] px-1.5 capitalize">{t.status}</Badge>
                        </div>
                        {t.due_date && (
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-1">
                            <Clock className="size-3 text-muted-foreground" />
                            Due: {formatDateDisplay(t.due_date)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance & Salary Summary */}
            <Card className="shadow-xs">
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <IndianRupee className="size-4 text-emerald-500" />
                    Monthly Salary & Attendance
                  </CardTitle>
                  <CardDescription className="text-xs">{formatMonth(month)} Summary</CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab("attendance")} className="text-xs h-7 px-2">
                  Details
                </Button>
              </CardHeader>
              <CardContent className="p-4 pt-2 space-y-3">
                <div className="rounded-lg bg-muted/40 p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Present Days:</span>
                    <span className="font-semibold text-foreground">{attendanceSummary.presentDays} / {attendanceSummary.workingDays || 30}</span>
                  </div>
                  {salarySummary && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Net Payable:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(salarySummary.payableSalary)}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground">Payout Status:</span>
                        <Badge variant={salarySummary.payoutStatus === "PAID" ? "default" : "outline"} className="text-[10px]">
                          {salarySummary.payoutStatus || "UNPAID"}
                        </Badge>
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================= NOTICEBOARD TAB ================= */}
        <TabsContent value="notices" className="space-y-4">
          <Card className="shadow-xs">
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Bell className="size-5 text-amber-500" />
                    Institution Noticeboard
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Official announcements and campus notices targeted to your profile.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {notices.length === 0 ? (
                <div className="p-12 text-center border rounded-xl">
                  <Bell className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="font-semibold text-sm">No notices published</p>
                  <p className="text-xs text-muted-foreground mt-1">There are no circulars for you at this time.</p>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {notices.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => setSelectedNotice(n)}
                      className="cursor-pointer rounded-xl border border-border/80 bg-card p-4 hover:border-primary/50 hover:shadow-xs transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <Badge variant={n.priority === "urgent" ? "destructive" : "outline"} className="text-[10px] capitalize">
                          {n.priority || "Normal"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">{formatDateDisplay(n.created_at)}</span>
                      </div>
                      <div>
                        <h4 className="font-bold text-sm text-foreground line-clamp-1">{n.title}</h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{n.content}</p>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t border-border/60">
                        <span>By: {n.author_name || "Institution Admin"}</span>
                        <span className="text-primary font-medium">Read more &rarr;</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= COMPLAINTS TAB ================= */}
        <TabsContent value="complaints" className="space-y-4">
          <Card className="shadow-xs">
            <CardHeader className="p-4 sm:p-6 pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <ShieldAlert className="size-5 text-rose-500" />
                    My Complaints & Grievances
                  </CardTitle>
                  <CardDescription className="text-xs">
                    View complaints filed by you or assigned to you for resolution.
                  </CardDescription>
                </div>
                <Button size="sm" onClick={() => setNewComplaintOpen(true)} className="gap-1.5 shadow-xs">
                  <Plus className="size-4" />
                  File Complaint
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {complaints.length === 0 ? (
                <div className="p-12 text-center border rounded-xl">
                  <ShieldAlert className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="font-semibold text-sm">No complaints recorded</p>
                  <p className="text-xs text-muted-foreground mt-1">You have not submitted or received any complaints.</p>
                  <Button size="sm" variant="outline" onClick={() => setNewComplaintOpen(true)} className="mt-4 gap-1.5">
                    <Plus className="size-4" />
                    Submit a Grievance
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border text-xs font-semibold text-muted-foreground uppercase bg-muted/30">
                      <tr>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Assigned / Resolution</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {complaints.map((c) => (
                        <tr key={c.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3.5 font-semibold text-foreground">
                            <div>{c.title}</div>
                            <div className="text-xs text-muted-foreground font-normal line-clamp-1">{c.description}</div>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">{c.category || "General"}</td>
                          <td className="px-4 py-3.5">
                            <Badge
                              variant={c.status === "resolved" ? "default" : c.status === "rejected" ? "destructive" : "outline"}
                              className="text-[10px] capitalize"
                            >
                              {c.status.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">{formatDateDisplay(c.created_at)}</td>
                          <td className="px-4 py-3.5 text-xs">
                            {c.resolution ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-medium">{c.resolution}</span>
                            ) : (
                              <span className="text-muted-foreground">{c.assigned_to_name ? `Assigned to: ${c.assigned_to_name}` : "Pending Assignment"}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= PERFORMANCE TAB ================= */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-5 md:grid-cols-3">
            <Card className="shadow-xs md:col-span-1">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  Performance Score
                </CardTitle>
                <CardDescription className="text-xs">Based on deliverables & milestones</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2 text-center space-y-4">
                <div className="inline-flex items-center justify-center p-6 rounded-full bg-primary/10 border-4 border-primary/20 text-3xl font-black text-primary">
                  {performance.score}%
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-muted/40 p-2">
                    <div className="font-bold text-base text-foreground">{performance.completedTasks}</div>
                    <div className="text-muted-foreground text-[10px]">Completed Tasks</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <div className="font-bold text-base text-emerald-600 dark:text-emerald-400">+{performance.pointsEarned}</div>
                    <div className="text-muted-foreground text-[10px]">Points Earned</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-xs md:col-span-2">
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold">Points & Recognition History</CardTitle>
                <CardDescription className="text-xs">Activity ledger of performance points</CardDescription>
              </CardHeader>
              <CardContent className="p-4 pt-2">
                {performance.pointsHistory?.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-8 text-center">No points history ledger yet.</p>
                ) : (
                  <div className="space-y-2">
                    {performance.pointsHistory?.map((p) => (
                      <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg border border-border/70 text-xs">
                        <div>
                          <div className="font-medium text-foreground">{p.reason}</div>
                          <div className="text-[10px] text-muted-foreground">{formatDateDisplay(p.created_at)}</div>
                        </div>
                        <Badge variant="outline" className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                          +{p.points} pts
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ================= TASKS TAB ================= */}
        <TabsContent value="tasks" className="space-y-4">
          <Card className="shadow-xs">
            <CardHeader className="p-4 sm:p-6 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ListTodo className="size-5 text-blue-500" />
                Assigned Operations & Academic Tasks
              </CardTitle>
              <CardDescription className="text-xs">
                All deliverables and assignments delegated to you.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {tasks.length === 0 ? (
                <div className="p-12 text-center border rounded-xl">
                  <CheckCircle2 className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="font-semibold text-sm">No tasks assigned</p>
                  <p className="text-xs text-muted-foreground mt-1">You are all caught up! New tasks will show here.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((t) => (
                    <div key={t.id} className="rounded-xl border border-border/80 bg-card p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-foreground">{t.title}</h4>
                          {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {t.urgency || "Normal"} Priority
                          </Badge>
                          <Badge variant={t.status === "completed" ? "default" : "secondary"} className="text-[10px] capitalize">
                            {t.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>

                      {t.due_date && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="size-3.5 text-muted-foreground" />
                          <span>Deadline: <strong>{formatDateDisplay(t.due_date)}</strong></span>
                        </div>
                      )}

                      {Array.isArray(t.sub_tasks) && t.sub_tasks.length > 0 && (
                        <div className="rounded-lg bg-muted/40 p-3 space-y-1.5 border border-border/50">
                          <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Sub-tasks ({t.sub_tasks.filter((s) => s.is_completed).length} / {t.sub_tasks.length})
                          </div>
                          {t.sub_tasks.map((st, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-foreground">
                              <span className={`size-2 rounded-full ${st.is_completed ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                              <span className={st.is_completed ? "line-through text-muted-foreground" : ""}>{st.title}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= ATTENDANCE TAB ================= */}
        <TabsContent value="attendance" className="space-y-4">
          <Card className="shadow-xs">
            <CardHeader className="p-4 sm:p-6 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Calendar className="size-5 text-emerald-500" />
                  My Monthly Attendance
                </CardTitle>
                <CardDescription className="text-xs">
                  Review daily check-in logs, leaves, and attendance breakdown.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Month:</Label>
                <MonthPicker value={month} onChange={setMonth} className="w-40" />
              </div>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-5">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <div className="text-xs text-muted-foreground">Present</div>
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {attendanceSummary.presentDays}
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <div className="text-xs text-muted-foreground">Late Check-in</div>
                  <div className="text-xl font-bold text-amber-500 mt-0.5">{attendanceSummary.lateDays}</div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <div className="text-xs text-muted-foreground">Half Day</div>
                  <div className="text-xl font-bold text-blue-500 mt-0.5">{attendanceSummary.halfDays}</div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <div className="text-xs text-muted-foreground">Absent</div>
                  <div className="text-xl font-bold text-rose-500 mt-0.5">{attendanceSummary.absentDays}</div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3 text-center">
                  <div className="text-xs text-muted-foreground">Approved Leaves</div>
                  <div className="text-xl font-bold text-purple-500 mt-0.5">{attendanceSummary.leaveDays}</div>
                </div>
              </div>

              {attendanceLogs.length === 0 ? (
                <div className="p-8 text-center border rounded-xl text-xs text-muted-foreground">
                  No attendance records logged for {formatMonth(month)}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border text-xs font-semibold text-muted-foreground uppercase bg-muted/30">
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Check-in</th>
                        <th className="px-4 py-3">Check-out</th>
                        <th className="px-4 py-3">Remarks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {attendanceLogs.map((log) => (
                        <tr key={log.id} className="hover:bg-muted/20 transition-colors text-xs">
                          <td className="px-4 py-3 font-semibold text-foreground">{formatDateDisplay(log.attendance_date)}</td>
                          <td className="px-4 py-3">
                            <Badge
                              variant={log.status === "present" ? "default" : log.status === "absent" ? "destructive" : "outline"}
                              className="text-[10px] capitalize"
                            >
                              {log.status.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{log.check_in_time || "-"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{log.check_out_time || "-"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{log.remarks || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= QUERIES / TICKETS TAB ================= */}
        <TabsContent value="queries" className="space-y-4">
          <Card className="shadow-xs">
            <CardHeader className="p-4 sm:p-6 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <HelpCircle className="size-5 text-purple-500" />
                  My Queries & Support Tickets
                </CardTitle>
                <CardDescription className="text-xs">
                  Raise questions or IT/HR support tickets and track resolution status.
                </CardDescription>
              </div>
              <Button size="sm" onClick={() => setNewTicketOpen(true)} className="gap-1.5 shadow-xs">
                <Plus className="size-4" />
                Raise Query
              </Button>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {tickets.length === 0 ? (
                <div className="p-12 text-center border rounded-xl">
                  <HelpCircle className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="font-semibold text-sm">No support queries raised</p>
                  <p className="text-xs text-muted-foreground mt-1">Need help with payroll, IT, or institution resources? Submit a query.</p>
                  <Button size="sm" variant="outline" onClick={() => setNewTicketOpen(true)} className="mt-4 gap-1.5">
                    <Plus className="size-4" />
                    Raise Query
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border text-xs font-semibold text-muted-foreground uppercase bg-muted/30">
                      <tr>
                        <th className="px-4 py-3">Ticket / Subject</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3">Priority</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {tickets.map((t) => (
                        <tr key={t.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3.5">
                            <div className="font-semibold text-foreground">{t.subject}</div>
                            {t.ticket_number && <div className="text-[10px] text-muted-foreground">#{t.ticket_number}</div>}
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">{t.category || "General"}</td>
                          <td className="px-4 py-3.5">
                            <Badge variant="outline" className="text-[10px] capitalize">
                              {t.priority}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge
                              variant={t.status === "resolved" ? "default" : t.status === "closed" ? "secondary" : "outline"}
                              className="text-[10px] capitalize"
                            >
                              {t.status.replace("_", " ")}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground">{formatDateDisplay(t.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ================= DOCUMENTS TAB ================= */}
        <TabsContent value="documents" className="space-y-4">
          <Card className="shadow-xs">
            <CardHeader className="p-4 sm:p-6 pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileCheck className="size-5 text-teal-500" />
                My Official Documents
              </CardTitle>
              <CardDescription className="text-xs">
                Official offer letters, salary slips, experience letters, and appreciation certificates issued to you.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              {documents.length === 0 ? (
                <div className="p-12 text-center border rounded-xl">
                  <FileText className="size-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="font-semibold text-sm">No documents issued yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Official documents generated for you (offer letters, salary slips, experience certificates) will appear here.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-border text-xs font-semibold text-muted-foreground uppercase bg-muted/30">
                      <tr>
                        <th className="px-4 py-3">Document Title</th>
                        <th className="px-4 py-3">Template / Type</th>
                        <th className="px-4 py-3">Issued Date</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3.5 font-semibold text-foreground">
                            {doc.title}
                          </td>
                          <td className="px-4 py-3.5">
                            <Badge variant="outline" className="text-[10px]">
                              {doc.category_name || doc.template_name || "Official Document"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-muted-foreground whitespace-nowrap">
                            {formatDateDisplay(doc.created_at)}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {doc.rendered_html && (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPreviewDoc(doc)}
                                    className="h-8 gap-1 px-2 text-xs"
                                  >
                                    <Eye className="size-3.5" />
                                    View
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleDownloadPdf(doc.rendered_html, doc.title)}
                                    className="h-8 gap-1 px-2 text-xs"
                                  >
                                    <Download className="size-3.5" />
                                    PDF
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handlePrintDoc(doc.rendered_html)}
                                    className="h-8 gap-1 px-2 text-xs"
                                  >
                                    <Printer className="size-3.5" />
                                    Print
                                  </Button>
                                </>
                              )}
                              {doc.image_url && !doc.rendered_html && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  asChild
                                  className="h-8 gap-1 px-2 text-xs"
                                >
                                  <a href={doc.image_url} target="_blank" rel="noreferrer" download>
                                    <Download className="size-3.5" />
                                    Download
                                  </a>
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Notice Detail Dialog */}
      <Dialog open={Boolean(selectedNotice)} onOpenChange={(o) => !o && setSelectedNotice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={selectedNotice?.priority === "urgent" ? "destructive" : "outline"} className="text-[10px] capitalize">
                {selectedNotice?.priority || "Notice"}
              </Badge>
              <span className="text-xs text-muted-foreground">{formatDateDisplay(selectedNotice?.created_at)}</span>
            </div>
            <DialogTitle className="text-lg font-bold">{selectedNotice?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {selectedNotice?.content}
            </p>
            {selectedNotice?.attachment_url && (
              <div className="pt-2 border-t">
                <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
                  <a href={selectedNotice.attachment_url} target="_blank" rel="noreferrer">
                    <Download className="size-3.5" />
                    Download Attachment
                  </a>
                </Button>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedNotice(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Complaint Dialog */}
      <Dialog open={newComplaintOpen} onOpenChange={setNewComplaintOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldAlert className="size-5 text-rose-500" />
              File a Grievance / Complaint
            </DialogTitle>
            <DialogDescription className="text-xs">
              Submit an issue confidentially to institution leadership.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Subject / Title *</Label>
              <Input
                placeholder="Brief summary of the issue..."
                value={complaintForm.title}
                onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category</Label>
                <Select
                  value={complaintForm.category}
                  onValueChange={(v) => setComplaintForm({ ...complaintForm, category: v })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Workplace">Workplace</SelectItem>
                    <SelectItem value="Salary & Payroll">Salary &amp; Payroll</SelectItem>
                    <SelectItem value="Infrastructure">Infrastructure</SelectItem>
                    <SelectItem value="Academic Operations">Academic Operations</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select
                  value={complaintForm.priority}
                  onValueChange={(v) => setComplaintForm({ ...complaintForm, priority: v })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Description *</Label>
              <Textarea
                placeholder="Provide detailed information regarding the issue..."
                rows={4}
                value={complaintForm.description}
                onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNewComplaintOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateComplaint} disabled={submittingComplaint} className="gap-1.5">
              {submittingComplaint && <Loader2 className="size-4 animate-spin" />}
              Submit Complaint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Raise Support Query Dialog */}
      <Dialog open={newTicketOpen} onOpenChange={setNewTicketOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <HelpCircle className="size-5 text-purple-500" />
              Raise Support Query
            </DialogTitle>
            <DialogDescription className="text-xs">
              Need assistance? Send your inquiry to the administration desk.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Subject *</Label>
              <Input
                placeholder="What do you need help with?"
                value={ticketForm.subject}
                onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category</Label>
                <Select
                  value={ticketForm.category}
                  onValueChange={(v) => setTicketForm({ ...ticketForm, category: v })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="General">General</SelectItem>
                    <SelectItem value="Payroll">Payroll</SelectItem>
                    <SelectItem value="IT Support">IT Support</SelectItem>
                    <SelectItem value="Leaves">Leaves &amp; Attendance</SelectItem>
                    <SelectItem value="Facilities">Facilities</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select
                  value={ticketForm.priority}
                  onValueChange={(v: "low" | "medium" | "high" | "urgent") => setTicketForm({ ...ticketForm, priority: v })}
                >
                  <SelectTrigger className="mt-1 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Query Details *</Label>
              <Textarea
                placeholder="Describe your request in detail..."
                rows={4}
                value={ticketForm.description}
                onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                className="mt-1 text-xs"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNewTicketOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTicket} disabled={submittingTicket} className="gap-1.5">
              {submittingTicket && <Loader2 className="size-4 animate-spin" />}
              Submit Query
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Document Preview Dialog */}
      <Dialog open={Boolean(previewDoc)} onOpenChange={(o) => !o && setPreviewDoc(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 border-b bg-muted/20 shrink-0">
            <div className="flex items-center justify-between pr-8">
              <div>
                <DialogTitle className="text-base font-bold">{previewDoc?.title}</DialogTitle>
                <DialogDescription className="text-xs">Issued on {formatDateDisplay(previewDoc?.created_at)}</DialogDescription>
              </div>
              <div className="flex items-center gap-2">
                {previewDoc?.rendered_html && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDownloadPdf(previewDoc.rendered_html, previewDoc.title)}
                      className="gap-1.5 h-8 text-xs"
                    >
                      <Download className="size-3.5" />
                      PDF
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePrintDoc(previewDoc.rendered_html)}
                      className="gap-1.5 h-8 text-xs"
                    >
                      <Printer className="size-3.5" />
                      Print
                    </Button>
                  </>
                )}
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 bg-muted/40 flex justify-center">
            {previewDoc?.rendered_html ? (
              <div
                className="bg-white text-black shadow-lg rounded-sm p-6 w-[794px] min-h-[1080px]"
                dangerouslySetInnerHTML={{ __html: previewDoc.rendered_html }}
              />
            ) : previewDoc?.image_url ? (
              <img src={previewDoc.image_url} alt={previewDoc.title} className="max-w-full rounded-md shadow-md" />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
