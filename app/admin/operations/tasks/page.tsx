"use client";

export const PROJECT_CURRENCIES = [
  { code: "INR", symbol: "₹", label: "INR (₹) - Indian Rupee" },
  { code: "USD", symbol: "$", label: "USD ($) - US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR (€) - Euro" },
  { code: "GBP", symbol: "£", label: "GBP (£) - British Pound" },
  { code: "AED", symbol: "د.إ", label: "AED (د.إ) - UAE Dirham" },
];

export function getCurrencySymbol(code?: string | null) {
  const match = PROJECT_CURRENCIES.find((c) => c.code === (code || "INR").toUpperCase());
  return match?.symbol || (code || "₹");
}



import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Check,
  ClipboardCheck,
  ClipboardList,
  Plus,
  Search,
  Users,
  Clock,
  Calendar,
  AlertTriangle,
  IndianRupee,
  Building2,
  CheckCircle2,
  Zap,
  XCircle,
  TrendingUp,
  RefreshCw,
  Loader2,
  Edit2,
  Trash2,
  UserCheck,
  Flame,
  Info,
  CheckSquare,
  Square,
  ChevronDown,
  ChevronUp,
  Layers,
  FolderPlus,
  ArrowRight,
  Filter,
  Sparkles,
  User,
  FileCheck,
  FileText,
  ImageIcon,
  ExternalLink,
  RotateCcw,
  UploadCloud,
  X,
  Trophy,
  MinusCircle,
  PlusCircle,
  TrendingDown,
  Pencil,
  History,
  MoreVertical,
  Receipt,
  ListPlus,
  Globe,
  Monitor,
  Crown,
  FolderKanban,
  GitFork,
  Star,
  Play,
  ArrowRightCircle,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useProgressiveSave } from "@/hooks/use-progressive-save";
import { ProgressiveSaveIndicator } from "@/components/shared/progressive-save-indicator";
import { useAuthStore } from "@/store";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { TaskHistoryDialog } from "./task-history-dialog";
import { SubTaskUploadDialog } from "./subtask-upload-dialog";
import { ProjectInvoicesDialog } from "./project-invoices-dialog";
import { SubtaskCard } from "@/components/subtask-card";
import { SubtaskModalDialog } from "@/components/subtask-modal-dialog";

export type TaskStatus = "pending" | "in_progress" | "under_review" | "rework" | "recheck" | "completed" | "on_hold" | "cancelled" | "failed";

export type SubTask = {
  id: string;
  title: string;
  price: number; // Task Cost / Price (₹)
  image_url?: string | null;
  image_name?: string | null;
  assigned_employee_id?: number | null;
  assigned_employee_name?: string | null;
  assigned_employee_role?: string | null;
  assigned_employee_email?: string | null;
  duration_hours?: number; // Duration / Estimated Hours
  duration_minutes?: number; // Duration Minutes
  points?: number; // Performance Reward Points
  penalty_points?: number; // Performance Penalty Points
  deadline_date?: string | null;
  deadline_time?: string | null;
  daily_time?: string | null;
  is_daily_recurring?: boolean;
  cadence?: string | null;
  urgency: "low" | "medium" | "high" | "urgent";
  status: TaskStatus;
  notes?: string | null;
  uploads?: any[];
  work_updates?: any[];
};

export type OperationTask = {
  project_for?: "own_company" | "client" | null;
  company_name?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  currency?: string | null;
  cost?: string | number | null;
  live_url?: string | null;
  demo_url?: string | null;
  project_leader_id?: number | null;
  project_leader_name?: string | null;
  agreement_document_url?: string | null;
  agreement_document_name?: string | null;
  project_type_id?: number | null;
  project_type_name?: string | null;
  pipeline_id?: number | null;
  pipeline_name?: string | null;
  pipeline_phases?: Array<{
    id: string;
    name: string;
    description?: string;
    order: number;
    estimated_duration_hours?: number;
    assigned_role?: string;
    is_mandatory?: boolean;
    requires_approval?: boolean;
    status?: "not_started" | "in_progress" | "under_review" | "completed" | "on_hold" | "failed" | "cancelled";
    started_at?: string | null;
    completed_at?: string | null;
    notes?: string;
  }>;
  current_phase_index?: number;
  base_price?: number | null;
  extra_cost?: number | null;
  history?: any[];
  id: number;
  title: string;
  created_by?: number | string | null;
  client_id: number | null;
  client_name: string | null;
  institution_id: number | null;
  price: string | number;
  details: string | null;
  assigned_employee_id?: number | null;
  assigned_employee_name?: string | null;
  assigned_employee_role?: string | null;
  assigned_employee_email?: string | null;
  assigned_employees?: Array<{
    id: number;
    name: string;
    role?: string | null;
    email?: string | null;
  }>;
  assigned_clients?: Array<{
    id: number;
    name: string;
    company_name?: string | null;
    email?: string | null;
    phone?: string | null;
    client_type?: string | null;
  }>;
  estimated_hours: string | number;
  logged_hours: string | number;
  deadline: string | null;
  status: TaskStatus;
  urgency: "low" | "medium" | "high" | "urgent";
  is_daily_recurring?: boolean;
  last_recurring_date?: string | null;
  points?: string | number;
  penalty_points?: string | number;
  sub_tasks?: SubTask[];
  review_notes?: string | null;
  review_image_url?: string | null;
  review_submitted_at?: string | null;
  review_submitted_by?: string | null;
  created_at: string;
  updated_at: string;
};

const ALL_SUBTASK_STATUSES = [
  { id: "pending", label: "Pending", color: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300" },
  { id: "in_progress", label: "In Progress", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300" },
  { id: "under_review", label: "Under Review", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400" },
  { id: "recheck", label: "Needs Recheck", color: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-400" },
  { id: "completed", label: "Completed", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300" },
  { id: "cancelled", label: "Cancelled", color: "bg-zinc-500/10 text-zinc-700 dark:text-zinc-300 border-zinc-300" },
];

const STAFF_ALLOWED_STATUSES = [
  { id: "pending", label: "Pending", color: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-300" },
  { id: "in_progress", label: "In Progress", color: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-300" },
  { id: "under_review", label: "Under Review (Submit for Approval)", color: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-400" },
  { id: "completed", label: "Completed", color: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-300" },
];

const SUBTASK_URGENCIES = [
  { id: "low", label: "Low", icon: Info, color: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300" },
  { id: "medium", label: "Medium", icon: Clock, color: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300" },
  { id: "high", label: "High Priority", icon: AlertTriangle, color: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300" },
  { id: "urgent", label: "Urgent / Critical", icon: Flame, color: "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300" },
];

const STATUS_TABS = [
  { id: "pending", label: "Pending", badgeColor: "bg-slate-100 text-slate-700 border-slate-300" },
  { id: "in_progress", label: "In Progress", badgeColor: "bg-blue-100 text-blue-800 border-blue-300" },
  { id: "under_review", label: "Under Review", badgeColor: "bg-amber-100 text-amber-800 border-amber-300" },
  { id: "rework", label: "Rework", badgeColor: "bg-rose-100 text-rose-800 border-rose-300" },
  { id: "completed", label: "Completed", badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { id: "cancelled", label: "Cancelled", badgeColor: "bg-zinc-100 text-zinc-800 border-zinc-300" },
  { id: "on_hold", label: "On Hold", badgeColor: "bg-orange-100 text-orange-800 border-orange-300" },
  { id: "failed", label: "Failed", badgeColor: "bg-red-100 text-red-800 border-red-300" },
];

export const formatSubtaskDuration = (durationHours?: number | null, durationMinutes?: number | null) => {
  const h = Number(durationHours) || 0;
  const m = Number(durationMinutes) || 0;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  if (m > 0) return `${m}m`;
  return null;
};

export default function OperationsTasksPage() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const { institutions, activeInstitution, activeInstitutionId } = useActiveInstitution();
  const isPlatformRoute = Boolean(pathname?.startsWith("/platformadmin"));
  const isInstitutionAdmin = useMemo(() => {
    // Platform admin and institution admin share the same simplified UI
    if (pathname?.startsWith("/instituteadmin") || isPlatformRoute) return true;
    const codes = (user as any)?.role_codes || [(user as any)?.role || (user as any)?.primary_role || ""];
    if (codes.some((r: string) => ["platform_admin", "super_admin"].includes(r))) return false;
    return codes.some((r: string) => ["institution_admin", "school_owner", "college_owner", "university_owner"].includes(r));
  }, [pathname, isPlatformRoute, user]);
  const [orgFilter, setOrgFilter] = useState<string>(isPlatformRoute ? "none" : "all");
  const effectiveInstId = useMemo(() => {
    if (orgFilter === "all") {
      return isPlatformRoute ? null : activeInstitutionId;
    }
    if (orgFilter === "none") {
      return null;
    }
    return Number(orgFilter) || null;
  }, [orgFilter, isPlatformRoute, activeInstitutionId]);
  const fetchSeqRef = React.useRef(0);
  const [tasks, setTasks] = useState<OperationTask[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [modalStaffList, setModalStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isClientRole = useMemo(() => {
    if (!user) return false;
    const codes = (user as any)?.role_codes || [(user as any)?.role || (user as any)?.primary_role || ""];
    return codes.includes("client") || (user as any)?.role === "client" || (user as any)?.primary_role === "client";
  }, [user]);

  const isStaffRole = useMemo(() => {
    if (!user) return false;
    const codes = (user as any)?.role_codes || [(user as any)?.role || (user as any)?.primary_role || ""];
    const isOwnerOrAdminOrClient = codes.some((r: string) =>
      ["platform_admin", "super_admin", "institution_admin", "school_owner", "college_owner", "university_owner", "client"].includes(r)
    );
    return !isOwnerOrAdminOrClient;
  }, [user]);

  const isStaffViewer = useMemo(() => {
    return isStaffRole || Boolean(pathname?.startsWith("/staff"));
  }, [isStaffRole, pathname]);

  const formatPriceDisplay = useCallback((price: number | string | null | undefined) => {
    if (isStaffViewer) return "★★★★★";
    const num = typeof price === "number" ? price : parseFloat(String(price || 0));
    return `₹${num.toLocaleString("en-IN")}`;
  }, [isStaffViewer]);

  const formatDateDisplay = useCallback((dateStr?: string | null) => {
    if (!dateStr) return null;
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  }, []);

  const initialScope = searchParams.get("scope") === "me" || isStaffRole ? "assigned_to_me" : "all";
  const [scopeFilter, setScopeFilter] = useState<"all" | "assigned_to_me">(initialScope);

  const uniqueStaffList = useMemo(() => {
    const seen = new Set<number>();
    return staffList.filter((s) => {
      if (!s.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [staffList]);

  const uniqueModalStaffList = useMemo(() => {
    const list = modalStaffList.length > 0 ? modalStaffList : staffList;
    const seen = new Set<number>();
    return list.filter((s) => {
      if (!s.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [modalStaffList, staffList]);

  // Selected Status Tab
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("pending");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [staffFilter, setStaffFilter] = useState("all");

  // Expanded subtasks in cards
  const [expandedTaskSubtasks, setExpandedTaskSubtasks] = useState<Record<number, boolean>>({});

  // Stats
  const [stats, setStats] = useState({
    totalTasks: 0,
    pendingTasks: 0,
    inProgressTasks: 0,
    completedTasks: 0,
    urgentTasks: 0,
    totalRevenue: 0,
    totalEstimatedHours: 0,
    totalLoggedHours: 0,
  });

  // Modal 1: Create / Edit Main Task
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<OperationTask | null>(null);
  const [savingTask, setSavingTask] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formInstitutionId, setFormInstitutionId] = useState<string>("none");
  const [modalOrgStaffList, setModalOrgStaffList] = useState<any[]>([]);
  const [loadingModalOrgStaff, setLoadingModalOrgStaff] = useState<boolean>(false);
  const [formClientId, setFormClientId] = useState<string>("none");
  const [formClientName, setFormClientName] = useState("");
  const [formAssignedClientIds, setFormAssignedClientIds] = useState<string[]>([]);
  const [formProjectFor, setFormProjectFor] = useState<"own_company" | "client">("own_company");
  const [formCompanyName, setFormCompanyName] = useState("EduBird");
  const [formStartDate, setFormStartDate] = useState("");
  const [formDueDate, setFormDueDate] = useState("");
  const [formCurrency, setFormCurrency] = useState("INR");
  const [formCost, setFormCost] = useState("0");
  const [formLiveUrl, setFormLiveUrl] = useState("");
  const [formDemoUrl, setFormDemoUrl] = useState("");
  const [formProjectLeaderId, setFormProjectLeaderId] = useState("none");
  const [formProjectLeaderName, setFormProjectLeaderName] = useState("");
  const [formAgreementDocUrl, setFormAgreementDocUrl] = useState("");
  const [formAgreementDocName, setFormAgreementDocName] = useState("");
  const [uploadingAgreement, setUploadingAgreement] = useState(false);

  // Dedicated Phase Status & Details Modal State
  const [phaseModalState, setPhaseModalState] = useState<{
    task: OperationTask;
    phaseIndex: number;
    phase: any;
  } | null>(null);
  const [phaseModalStatus, setPhaseModalStatus] = useState<string>("not_started");
  const [phaseModalNotes, setPhaseModalNotes] = useState<string>("");
  const [phaseModalAdvanceNext, setPhaseModalAdvanceNext] = useState<boolean>(true);
  const [savingPhaseModal, setSavingPhaseModal] = useState<boolean>(false);

  // Quick Attach Pipeline Modal State for existing projects
  const [attachPipelineTask, setAttachPipelineTask] = useState<OperationTask | null>(null);
  const [attachTypeId, setAttachTypeId] = useState<string>("none");
  const [attachPipelineId, setAttachPipelineId] = useState<string>("none");
  const [attachAvailablePipelines, setAttachAvailablePipelines] = useState<any[]>([]);
  const [savingAttachPipeline, setSavingAttachPipeline] = useState<boolean>(false);
  // Project Types & Pipelines for Project Creation
  const [projectTypesList, setProjectTypesList] = useState<any[]>([]);
  const [formProjectTypeId, setFormProjectTypeId] = useState<string>("none");
  const [formProjectTypeName, setFormProjectTypeName] = useState<string>("");
  const [formPipelineId, setFormPipelineId] = useState<string>("none");
  const [formPipelineName, setFormPipelineName] = useState<string>("");
  const [availablePipelines, setAvailablePipelines] = useState<any[]>([]);
  const [formPipelinePhases, setFormPipelinePhases] = useState<any[]>([]);
  const [loadingPipelines, setLoadingPipelines] = useState<boolean>(false);

  const fetchProjectTypesForModal = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/operations/project-types?status=active");
      if (res.ok) {
        const json = await res.json();
        setProjectTypesList(json.project_types || []);
      }
    } catch (e) {
      console.warn("fetchProjectTypesForModal error:", e);
    }
  }, []);

  const handleSelectProjectType = async (typeIdStr: string) => {
    setFormProjectTypeId(typeIdStr);
    if (typeIdStr === "none" || !typeIdStr) {
      setFormProjectTypeName("");
      setFormPipelineId("none");
      setFormPipelineName("");
      setAvailablePipelines([]);
      setFormPipelinePhases([]);
      return;
    }
    const pt = projectTypesList.find((p) => String(p.id) === String(typeIdStr));
    setFormProjectTypeName(pt ? pt.name : "");
    try {
      setLoadingPipelines(true);
      const res = await fetch(`/api/admin/operations/project-pipelines?project_type_id=${typeIdStr}&status=active`);
      if (res.ok) {
        const json = await res.json();
        const pls: any[] = json.pipelines || [];
        setAvailablePipelines(pls);
        const defaultPl = pls.find((p) => p.is_default) || pls[0];
        if (defaultPl) {
          setFormPipelineId(String(defaultPl.id));
          setFormPipelineName(defaultPl.name);
          setFormPipelinePhases(Array.isArray(defaultPl.phases) ? defaultPl.phases : []);
        } else {
          setFormPipelineId("none");
          setFormPipelineName("");
          setFormPipelinePhases([]);
        }
      }
    } catch (err) {
      console.warn("Failed to load pipelines for type:", err);
    } finally {
      setLoadingPipelines(false);
    }
  };

  const handleSelectPipeline = (pipelineIdStr: string) => {
    setFormPipelineId(pipelineIdStr);
    if (pipelineIdStr === "none" || !pipelineIdStr) {
      setFormPipelineName("");
      setFormPipelinePhases([]);
      return;
    }
    const pl = availablePipelines.find((p) => String(p.id) === String(pipelineIdStr));
    if (pl) {
      setFormPipelineName(pl.name);
      setFormPipelinePhases(Array.isArray(pl.phases) ? pl.phases : []);
    }
  };

  const handleUpdateProjectPhase = async (
    task: OperationTask,
    phaseIndex: number,
    newStatus: string,
    advanceNext: boolean = false,
    notes?: string
  ) => {
    try {
      const currentPhases = Array.isArray(task.pipeline_phases) ? [...task.pipeline_phases] : [];
      if (!currentPhases[phaseIndex]) return;

      currentPhases[phaseIndex] = {
        ...currentPhases[phaseIndex],
        status: newStatus as any,
        notes: notes !== undefined ? notes : currentPhases[phaseIndex].notes || "",
        started_at: newStatus === "in_progress" && !currentPhases[phaseIndex].started_at ? new Date().toISOString() : currentPhases[phaseIndex].started_at,
        completed_at: newStatus === "completed" ? new Date().toISOString() : currentPhases[phaseIndex].completed_at,
      };

      let newCurrentIndex = task.current_phase_index || 0;
      if (advanceNext && phaseIndex + 1 < currentPhases.length) {
        newCurrentIndex = phaseIndex + 1;
        if (currentPhases[newCurrentIndex].status === "not_started") {
          currentPhases[newCurrentIndex].status = "in_progress";
          currentPhases[newCurrentIndex].started_at = new Date().toISOString();
        }
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          id: task.id,
          pipeline_phases: currentPhases,
          current_phase_index: newCurrentIndex,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update phase status");
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? { ...t, pipeline_phases: currentPhases, current_phase_index: newCurrentIndex }
            : t
        )
      );

      toast.success(
        advanceNext
          ? `Advanced to next phase: "${currentPhases[newCurrentIndex]?.name}"`
          : `Phase "${currentPhases[phaseIndex]?.name}" status updated to ${newStatus}`
      );
    } catch (err: any) {
      toast.error(err.message || "Failed to update phase");
    }
  };

  const handleAgreementFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAgreement(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/uploads/documents", {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload agreement");
      setFormAgreementDocUrl(data.url || data.file_url || "");
      setFormAgreementDocName(file.name);
      toast.success("Agreement document uploaded successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload document");
    } finally {
      setUploadingAgreement(false);
    }
  };

  const [directDocUploadingTaskId, setDirectDocUploadingTaskId] = useState<number | null>(null);

  const handleDirectAgreementDocUpload = async (taskId: number, file: File) => {
    setDirectDocUploadingTaskId(taskId);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/uploads/documents", {
        method: "POST",
        headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload document");

      const fileUrl = data.url || data.file_url;
      const fileName = file.name;

      const targetTask = tasks.find((t) => t.id === taskId);
      const updateRes = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          id: taskId,
          title: targetTask?.title || "Project",
          agreement_document_url: fileUrl,
          agreement_document_name: fileName,
        }),
      });

      if (!updateRes.ok) {
        const d = await updateRes.json();
        throw new Error(d.error || "Failed to update project with agreement document");
      }

      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, agreement_document_url: fileUrl, agreement_document_name: fileName }
            : t
        )
      );

      toast.success(`Agreement document "${fileName}" uploaded and attached!`);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload agreement document");
    } finally {
      setDirectDocUploadingTaskId(null);
    }
  };

  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  const fetchClientsForModal = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      const token = accessToken || (typeof window !== "undefined" ? localStorage.getItem("accessToken") || localStorage.getItem("token") : "");
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("/api/admin/sales/clients?status=active", { headers });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.clients) && json.clients.length > 0) {
          setClients(json.clients);
        }
      }
    } catch (err) {
      console.warn("fetchClientsForModal error:", err);
    }
  }, [accessToken]);
  const [formAssignedStaffId, setFormAssignedStaffId] = useState<string>("none");
  const [formAssignedStaffName, setFormAssignedStaffName] = useState("");
  const [formAssignedStaffRole, setFormAssignedStaffRole] = useState("");
  const [formAssignedStaffIds, setFormAssignedStaffIds] = useState<string[]>([]);
  const [staffSearchQuery, setStaffSearchQuery] = useState("");
  const [staffDropdownOpen, setStaffDropdownOpen] = useState(false);
  const [formDetails, setFormDetails] = useState("");
  const [formIsDailyRecurring, setFormIsDailyRecurring] = useState(false);
  const [formPoints, setFormPoints] = useState("20");
  const [formPenaltyPoints, setFormPenaltyPoints] = useState("10");

  const fetchStaffForModal = useCallback(async (instId: string) => {
    setLoadingModalOrgStaff(true);
    try {
      const params = new URLSearchParams();
      if (isPlatformRoute) {
        params.set("institution_id", "none");
      } else if (instId && instId !== "none" && instId !== "all") {
        params.set("institution_id", instId);
      } else if (instId === "none") {
        params.set("institution_id", "none");
      }
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch(`/api/admin/operations/tasks?${params.toString()}`, { headers });
      const data = await res.json();
      if (Array.isArray(data.staff)) {
        setModalOrgStaffList(data.staff);
      }
    } catch {
      // fallback
    } finally {
      setLoadingModalOrgStaff(false);
    }
  }, [accessToken, isPlatformRoute]);

  const selectedOrgName = useMemo(() => {
    if (isPlatformRoute || formInstitutionId === "none") return "EduBird Organization";
    const found = institutions.find((i) => String(i.id) === formInstitutionId);
    if (found) return found.name;
    if (activeInstitution && String(activeInstitution.id) === formInstitutionId) return activeInstitution.name;
    return "EduBird Organization";
  }, [formInstitutionId, institutions, activeInstitution, isPlatformRoute]);

  const dialogStaffList = useMemo(() => {
    const list = modalOrgStaffList.length > 0
      ? modalOrgStaffList
      : staffList;
    const seen = new Set<number>();
    return list.filter((s) => {
      if (!s.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [modalOrgStaffList, staffList]);

  const addClientUrl = useMemo(() => {
    if (pathname?.startsWith("/platformadmin")) return "/platformadmin/sales/clients";
    if (pathname?.startsWith("/instituteadmin")) return "/instituteadmin/sales/clients";
    return "/admin/sales/clients";
  }, [pathname]);

  const filteredClientList = useMemo(() => {
    const baseList = clients;
    if (!clientSearchQuery.trim()) return baseList;
    const q = clientSearchQuery.toLowerCase();
    return baseList.filter((c) => {
      const name = (c.company_name || c.name || "").toLowerCase();
      const type = (c.client_type || "").toLowerCase();
      const contact = (c.contact_person || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      return name.includes(q) || type.includes(q) || contact.includes(q) || email.includes(q);
    });
  }, [clients, clientSearchQuery]);

  const filteredStaffList = useMemo(() => {
    if (!staffSearchQuery.trim()) return dialogStaffList;
    const q = staffSearchQuery.toLowerCase();
    return dialogStaffList.filter(
      (s) => (s.name && s.name.toLowerCase().includes(q)) || (s.role && s.role.toLowerCase().includes(q))
    );
  }, [dialogStaffList, staffSearchQuery]);

  const handleFormInstitutionChange = (newInstId: string) => {
    setFormInstitutionId(newInstId);
    setFormAssignedStaffIds([]);
    void fetchStaffForModal(newInstId);
  };

  const taskFormState = useMemo(() => ({
    formTitle,
    formClientId,
    formClientName,
    formAssignedStaffId,
    formAssignedStaffName,
    formAssignedStaffRole,
    formAssignedStaffIds,
    formDetails,
    formIsDailyRecurring,
    formPoints,
    formPenaltyPoints,
  }), [formTitle, formClientId, formClientName, formAssignedStaffId, formAssignedStaffName, formAssignedStaffRole, formAssignedStaffIds, formDetails, formIsDailyRecurring, formPoints, formPenaltyPoints]);

  const handleRestoreTaskDraft = useCallback((draft: any) => {
    if (draft.formTitle) setFormTitle(draft.formTitle);
    if (draft.formClientId) setFormClientId(draft.formClientId);
    if (draft.formClientName) setFormClientName(draft.formClientName);
    if (draft.formAssignedStaffId) setFormAssignedStaffId(draft.formAssignedStaffId);
    if (draft.formAssignedStaffName) setFormAssignedStaffName(draft.formAssignedStaffName);
    if (draft.formAssignedStaffRole) setFormAssignedStaffRole(draft.formAssignedStaffRole);
    if (Array.isArray(draft.formAssignedStaffIds)) setFormAssignedStaffIds(draft.formAssignedStaffIds);
    if (draft.formDetails) setFormDetails(draft.formDetails);
    if (draft.formIsDailyRecurring !== undefined) setFormIsDailyRecurring(draft.formIsDailyRecurring);
    if (draft.formPoints) setFormPoints(draft.formPoints);
    if (draft.formPenaltyPoints) setFormPenaltyPoints(draft.formPenaltyPoints);
  }, []);

  const { saveStatus: taskSaveStatus, clearDraft: clearTaskDraft } = useProgressiveSave({
    formKey: `operations_task:${editingTask?.id || "new"}`,
    formState: taskFormState,
    enabled: taskDialogOpen,
    onRestore: handleRestoreTaskDraft,
  });

  // Modal 2: Manage Sub-Tasks for a Task
  const [subtaskModalOpen, setSubtaskModalOpen] = useState(false);
  const [selectedTaskForSubtasks, setSelectedTaskForSubtasks] = useState<OperationTask | null>(null);
  const [editingSubtaskObject, setEditingSubtaskObject] = useState<SubTask | null>(null);
  const [activeSubTasks, setActiveSubTasks] = useState<SubTask[]>([]);
  const [savingSubtasks, setSavingSubtasks] = useState(false);

  // Helper to extract ONLY employees and clients assigned to a project/task
  const getProjectStaffOptions = useCallback((task: any) => {
    if (!task) return [];
    const optionsMap = new Map<string, { id: any; name: string; role?: string }>();

    // 1. Staff: Project assigned employees array
    if (Array.isArray(task.assigned_employees) && task.assigned_employees.length > 0) {
      task.assigned_employees.forEach((emp: any) => {
        if (emp?.id) {
          optionsMap.set(String(emp.id), {
            id: emp.id,
            name: emp.name || emp.full_name || `Employee #${emp.id}`,
            role: emp.role || "Staff Member",
          });
        }
      });
    }

    // 2. Staff: Project primary assigned employee
    if (task.assigned_employee_id) {
      optionsMap.set(String(task.assigned_employee_id), {
        id: task.assigned_employee_id,
        name: task.assigned_employee_name || "Assigned Staff",
        role: task.assigned_employee_role || "Staff Member",
      });
    }

    // 3. Staff: Project Leader
    if (task.project_leader_id) {
      if (!optionsMap.has(String(task.project_leader_id))) {
        optionsMap.set(String(task.project_leader_id), {
          id: task.project_leader_id,
          name: task.project_leader_name || "Project Leader",
          role: "Project Leader",
        });
      }
    }

    // 4. Clients: Project assigned clients array
    if (Array.isArray(task.assigned_clients) && task.assigned_clients.length > 0) {
      task.assigned_clients.forEach((c: any) => {
        const cId = c?.user_id || c?.id;
        if (cId) {
          optionsMap.set(String(cId), {
            id: cId,
            name: c.company_name || c.name || `Client #${c.id}`,
            role: c.client_type ? `${c.client_type} (Client)` : "Client",
          });
        }
      });
    }

    // 5. Clients: Project primary client
    if (task.client_id && task.client_name && task.client_name !== "EduBird") {
      if (!optionsMap.has(String(task.client_id))) {
        optionsMap.set(String(task.client_id), {
          id: task.client_id,
          name: task.client_name,
          role: "Client",
        });
      }
    }

    // 6. Fallback only if project has NO assigned members or clients at all
    if (optionsMap.size === 0) {
      if (user?.id) {
        optionsMap.set(String(user.id), {
          id: user.id,
          name: user.full_name || (user as any)?.name || user.email || "You",
          role: (user as any)?.role || "Staff Member",
        });
      }
    }

    return Array.from(optionsMap.values());
  }, [user]);

  // When a main task is created/assigned with specific members, only those members appear in subtasks
  const subtaskAssigneeOptions = useMemo(() => {
    if (!selectedTaskForSubtasks) return uniqueModalStaffList;
    const opts = getProjectStaffOptions(selectedTaskForSubtasks);
    return opts.length > 0 ? opts : uniqueModalStaffList;
  }, [selectedTaskForSubtasks, uniqueModalStaffList, getProjectStaffOptions]);

  const isSelectedTaskAssigned = useMemo(() => {
    return Boolean(
      (Array.isArray(selectedTaskForSubtasks?.assigned_employees) &&
        selectedTaskForSubtasks.assigned_employees.length > 0) ||
      selectedTaskForSubtasks?.assigned_employee_id
    );
  }, [selectedTaskForSubtasks]);

  // Modal 3: Under Review Submission (Optional text or image)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewModalTask, setReviewModalTask] = useState<OperationTask | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewImageUrl, setReviewImageUrl] = useState("");
  const [uploadingReviewImage, setUploadingReviewImage] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Modal 4: Adjust Score (Bonus / Penalty) — admin-only
  const [adjustScoreModalOpen, setAdjustScoreModalOpen] = useState(false);
  const [adjustScoreTask, setAdjustScoreTask] = useState<OperationTask | null>(null);
  const [adjustType, setAdjustType] = useState<"bonus" | "penalty">("bonus");
  const [adjustPoints, setAdjustPoints] = useState("10");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustEmployeeId, setAdjustEmployeeId] = useState<string>("none");
  const [adjustEmployeeName, setAdjustEmployeeName] = useState("");
  const [adjustHistory, setAdjustHistory] = useState<any[]>([]);
  const [adjustHistorySummary, setAdjustHistorySummary] = useState<any>(null);
  const [savingAdjustment, setSavingAdjustment] = useState(false);
  const [loadingAdjustHistory, setLoadingAdjustHistory] = useState(false);

  // New Subtask draft inputs
  const [newSubTitle, setNewSubTitle] = useState("");
  const [newSubPrice, setNewSubPrice] = useState("5000");
  const [newSubStaffId, setNewSubStaffId] = useState<string>("none");
  const [newSubDurationHours, setNewSubDurationHours] = useState("4");
  const [newSubDurationMinutes, setNewSubDurationMinutes] = useState("0");
  const [newSubPoints, setNewSubPoints] = useState("20");
  const [newSubPenaltyPoints, setNewSubPenaltyPoints] = useState("10");
  const [newSubDeadlineDate, setNewSubDeadlineDate] = useState("");
  const [newSubDeadlineNumber, setNewSubDeadlineNumber] = useState("18:00");
  const [newSubUrgency, setNewSubUrgency] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [newSubStatus, setNewSubStatus] = useState<"pending" | "in_progress" | "under_review" | "completed" | "cancelled">("pending");
  const [newSubDailyTime, setNewSubDailyTime] = useState("10:00");
  const [newSubIsDailyRecurring, setNewSubIsDailyRecurring] = useState<boolean>(false);
  const [newSubCadence, setNewSubCadence] = useState<string>("once");
  const [editSubCadence, setEditSubCadence] = useState<string>("once");

  // Mode toggle and bulk state for Modal 2
  const [subTaskCreationMode, setSubTaskCreationMode] = useState<"single" | "bulk">("single");
  const [bulkSubTaskText, setBulkSubTaskText] = useState("");
  const [bulkSubStripBullets, setBulkSubStripBullets] = useState(true);
  const [bulkSubDeduplicate, setBulkSubDeduplicate] = useState(true);

  const parsedBulkSubtasks = useMemo(() => {
    const lines = bulkSubTaskText.split(/\r?\n/);
    const seen = new Set<string>();
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      if (bulkSubStripBullets) {
        line = line.replace(/^(\d+[\.\)]\s*|[-*•]\s*|\[[\sxX]?\]\s*)/, "").trim();
      }
      if (!line) continue;

      const normKey = line.toLowerCase();
      if (bulkSubDeduplicate && seen.has(normKey)) continue;
      seen.add(normKey);

      result.push(line);
    }
    return result;
  }, [bulkSubTaskText, bulkSubStripBullets, bulkSubDeduplicate]);

  const [historyModalTask, setHistoryModalTask] = useState<OperationTask | null>(null);
  const [historyModalSubtask, setHistoryModalSubtask] = useState<SubTask | null>(null);
  const [uploadModalState, setUploadModalState] = useState<{ task: OperationTask; subtask: SubTask } | null>(null);
  const [invoicesModalTask, setInvoicesModalTask] = useState<OperationTask | null>(null);

  const fetchTasks = useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    try {
      const isStaffRoute = Boolean(pathname?.startsWith("/staff"));
      const isStaffContext = isStaffRole || isStaffRoute;

      const params = new URLSearchParams();
      if (isPlatformRoute) {
        params.set("institution_id", "none");
      } else if (orgFilter && orgFilter !== "all") {
        params.set("institution_id", orgFilter);
      } else if (effectiveInstId) {
        params.set("institution_id", String(effectiveInstId));
      }
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (urgencyFilter && urgencyFilter !== "all") params.set("urgency", urgencyFilter);
      if (clientFilter && clientFilter !== "all") params.set("client_id", clientFilter);
      if (staffFilter && staffFilter !== "all") {
        params.set("employee_id", staffFilter);
      } else if (isStaffContext || scopeFilter === "assigned_to_me") {
        params.set("employee_id", "me");
      }

      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/operations/tasks?${params.toString()}`, { headers });
      const data = await res.json();
      if (seq !== fetchSeqRef.current) return;
      if (!res.ok) throw new Error(data.error || "Failed to load operations tasks");

      setTasks(data.tasks || []);
      if (Array.isArray(data.clients)) setClients(data.clients);
      if (Array.isArray(data.staff)) setStaffList(data.staff);
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      if (seq === fetchSeqRef.current) {
        toast.error(err.message || "Failed to fetch operations tasks");
      }
    } finally {
      if (seq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [effectiveInstId, orgFilter, searchQuery, urgencyFilter, clientFilter, staffFilter, accessToken, pathname, isStaffRole, scopeFilter, isPlatformRoute]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks();
    }, 200);
    return () => clearTimeout(timer);
  }, [fetchTasks]);

  // Handle opening subtasks modal directly from URL query param
  useEffect(() => {
    const taskIdParam = searchParams.get("task_id");
    if (!taskIdParam || tasks.length === 0 || subtaskModalOpen) return;
    const matched = tasks.find((t) => String(t.id) === taskIdParam);
    if (matched) {
      handleOpenSubtasksModal(matched);
    }
  }, [searchParams, tasks, subtaskModalOpen]);

  const resetSubtaskDraft = (defaultStaffId: string = "none") => {
    setSubTaskCreationMode("single");
    setBulkSubTaskText("");
    setNewSubTitle("");
    setNewSubPrice("5000");
    setNewSubStaffId(defaultStaffId);
    setNewSubDurationHours("4");
    setNewSubDurationMinutes("0");
    setNewSubPoints("20");
    setNewSubPenaltyPoints("10");
    const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    setNewSubDeadlineDate(d.toISOString().split("T")[0]);
    setNewSubDeadlineNumber("18:00");
    setNewSubDailyTime("10:00");
    setNewSubUrgency("medium");
    setNewSubStatus("pending");
    setNewSubIsDailyRecurring(Boolean(selectedTaskForSubtasks?.is_daily_recurring));
  };

  // Step 1: Open Create Task Modal
  const handleOpenCreateTask = () => {
    setEditingTask(null);
    setFormTitle("");
    const initialInstId = isPlatformRoute
      ? "none"
      : ((orgFilter && orgFilter !== "all" && orgFilter !== "none")
        ? orgFilter
        : (activeInstitutionId ? String(activeInstitutionId) : (institutions[0]?.id ? String(institutions[0].id) : "none")));
    setFormInstitutionId(initialInstId);
    void fetchStaffForModal(initialInstId);
    setFormClientId("none");
    setFormClientName("");
    setFormAssignedClientIds([]);
    setClientSearchQuery("");
    setClientDropdownOpen(false);
    void fetchClientsForModal();
    const defaultStaffId = isStaffRole && user?.id ? String(user.id) : "none";
    const defaultStaffName = isStaffRole && user?.full_name ? user.full_name : "";
    const defaultStaffRole = isStaffRole ? ((user as any)?.role || (user as any)?.primary_role || "Staff") : "";
    setFormAssignedStaffId(defaultStaffId);
    setFormAssignedStaffName(defaultStaffName);
    setFormAssignedStaffRole(defaultStaffRole);
    setFormAssignedStaffIds(isStaffRole && user?.id ? [String(user.id)] : []);
    setStaffSearchQuery("");
    setStaffDropdownOpen(false);
    setFormStartDate("");
    setFormDueDate("");
    setFormLiveUrl("");
    setFormDemoUrl("");
    setFormProjectLeaderId("none");
    setFormProjectLeaderName("");
    setFormAgreementDocUrl("");
    setFormAgreementDocName("");
    setFormDetails("");
    setFormIsDailyRecurring(false);
    setFormPoints("20");
    setFormPenaltyPoints("10");
    setFormProjectTypeId("none");
    setFormProjectTypeName("");
    setFormPipelineId("none");
    setFormPipelineName("");
    setAvailablePipelines([]);
    setFormPipelinePhases([]);
    void fetchProjectTypesForModal();
    setTaskDialogOpen(true);
  };

  // Open Edit Main Task
  const handleOpenEditTask = (t: OperationTask) => {
    setEditingTask(t);
    setFormTitle(t.title || "");
    const initialInstId = isPlatformRoute
      ? "none"
      : (t.institution_id ? String(t.institution_id) : (activeInstitutionId ? String(activeInstitutionId) : "none"));
    setFormInstitutionId(initialInstId);
    void fetchStaffForModal(initialInstId);
    setFormClientId(t.client_id ? String(t.client_id) : "none");
    setFormClientName(t.client_name || "");
    const initialClientIds = Array.isArray(t.assigned_clients) && t.assigned_clients.length > 0
      ? t.assigned_clients.map((c) => String(c.id))
      : (t.client_id ? [String(t.client_id)] : []);
    setFormAssignedClientIds(initialClientIds);
    setClientSearchQuery("");
    setClientDropdownOpen(false);
    void fetchClientsForModal();
    setFormAssignedStaffId(t.assigned_employee_id ? String(t.assigned_employee_id) : "none");
    setFormAssignedStaffName(t.assigned_employee_name || "");
    setFormAssignedStaffRole(t.assigned_employee_role || "");
    if (Array.isArray(t.assigned_employees) && t.assigned_employees.length > 0) {
      setFormAssignedStaffIds(t.assigned_employees.map((e) => String(e.id)));
    } else if (t.assigned_employee_id) {
      setFormAssignedStaffIds([String(t.assigned_employee_id)]);
    } else {
      setFormAssignedStaffIds([]);
    }
    setStaffSearchQuery("");
    setStaffDropdownOpen(false);
    const isForClient = Boolean(t.client_id || (Array.isArray(t.assigned_clients) && t.assigned_clients.length > 0) || (t.client_name && t.client_name !== "EduBird"));
    setFormProjectFor(t.project_for === "client" || isForClient ? "client" : "own_company");
    setFormCompanyName(t.company_name || "EduBird");
    setFormStartDate(t.start_date ? t.start_date.split("T")[0] : "");
    setFormDueDate(t.due_date ? t.due_date.split("T")[0] : (t.deadline ? t.deadline.split("T")[0] : ""));
    setFormCurrency(t.currency || "INR");
    setFormCost(t.cost !== undefined ? String(t.cost) : (t.price !== undefined ? String(t.price) : "0"));
    setFormLiveUrl(t.live_url || "");
    setFormDemoUrl(t.demo_url || "");
    setFormProjectLeaderId(t.project_leader_id ? String(t.project_leader_id) : "none");
    setFormProjectLeaderName(t.project_leader_name || "");
    setFormAgreementDocUrl(t.agreement_document_url || "");
    setFormAgreementDocName(t.agreement_document_name || "");
    setFormDetails(t.details || "");
    setFormIsDailyRecurring(Boolean(t.is_daily_recurring));
    setFormPoints(t.points !== undefined ? String(t.points) : "20");
    setFormPenaltyPoints(t.penalty_points !== undefined ? String(t.penalty_points) : "10");
    setFormProjectTypeId(t.project_type_id ? String(t.project_type_id) : "none");
    setFormProjectTypeName(t.project_type_name || "");
    setFormPipelineId(t.pipeline_id ? String(t.pipeline_id) : "none");
    setFormPipelineName(t.pipeline_name || "");
    setFormPipelinePhases(Array.isArray(t.pipeline_phases) ? t.pipeline_phases : []);
    void fetchProjectTypesForModal();
    if (t.project_type_id) {
      void (async () => {
        try {
          const res = await fetch(`/api/admin/operations/project-pipelines?project_type_id=${t.project_type_id}&status=active`);
          if (res.ok) {
            const json = await res.json();
            setAvailablePipelines(json.pipelines || []);
          }
        } catch { }
      })();
    }
    setTaskDialogOpen(true);
  };

  // Save Step 1: Create or Update Task/Project
  const handleSaveMainTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error("Please enter Task / Project Name");
      return;
    }

    setSavingTask(true);
    try {
      const method = editingTask ? "PUT" : "POST";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const selectedClientObjects = clients
        .filter((c) => formAssignedClientIds.includes(String(c.id)))
        .map((c) => ({
          id: c.id,
          name: c.name,
          company_name: c.company_name || c.name,
          email: c.email || null,
          phone: c.phone || null,
          client_type: c.client_type || null,
          user_id: c.user_id || null,
        }));

      const primaryClientId = selectedClientObjects.length > 0
        ? selectedClientObjects[0].id
        : (formClientId !== "none" ? parseInt(formClientId) : null);
      const combinedClientNames = selectedClientObjects.length > 0
        ? selectedClientObjects.map((c) => c.company_name || c.name).filter(Boolean).join(", ")
        : (formClientName.trim() || null);

      const selectedStaffObjects = dialogStaffList
        .filter((s) => formAssignedStaffIds.includes(String(s.id)))
        .map((s) => ({ id: s.id, name: s.name, role: s.role || null, email: s.email || null }));

      const primaryStaffId = selectedStaffObjects.length > 0
        ? selectedStaffObjects[0].id
        : (formAssignedStaffId !== "none" ? parseInt(formAssignedStaffId) : null);
      const combinedStaffNames = selectedStaffObjects.length > 0
        ? selectedStaffObjects.map((s) => s.name).filter(Boolean).join(", ")
        : (formAssignedStaffName.trim() || null);
      const combinedStaffRoles = selectedStaffObjects.length > 0
        ? selectedStaffObjects.map((s) => s.role).filter(Boolean).join(", ")
        : (formAssignedStaffRole.trim() || null);

      const res = await fetch("/api/admin/operations/tasks", {
        method,
        headers,
        body: JSON.stringify({
          id: editingTask?.id,
          title: formTitle.trim(),
          institution_id: isPlatformRoute ? null : (formInstitutionId !== "none" && formInstitutionId !== "all" ? parseInt(formInstitutionId) : null),
          project_for: formProjectFor,
          company_name: formProjectFor === "own_company" ? formCompanyName : null,
          client_id: formProjectFor === "client" ? primaryClientId : null,
          client_name: formProjectFor === "client" ? combinedClientNames : "EduBird",
          assigned_clients: formProjectFor === "client" ? selectedClientObjects : [],
          assigned_employees: selectedStaffObjects,
          assigned_employee_id: primaryStaffId,
          assigned_employee_name: combinedStaffNames,
          assigned_employee_role: combinedStaffRoles,
          start_date: formStartDate || null,
          due_date: formDueDate || null,
          deadline: formDueDate || null,
          currency: formCurrency,
          cost: parseFloat(formCost) || 0,
          price: parseFloat(formCost) || 0,
          live_url: formLiveUrl.trim() || null,
          demo_url: formDemoUrl.trim() || null,
          project_leader_id: formProjectLeaderId !== "none" ? parseInt(formProjectLeaderId) : null,
          project_leader_name: formProjectLeaderName.trim() || null,
          agreement_document_url: formAgreementDocUrl.trim() || null,
          agreement_document_name: formAgreementDocName.trim() || null,
          details: formDetails.trim() || null,
          is_daily_recurring: formIsDailyRecurring,
          points: parseFloat(formPoints) || 20,
          penalty_points: parseFloat(formPenaltyPoints) || 10,
          sub_tasks: editingTask?.sub_tasks || [],
          project_type_id: formProjectTypeId !== "none" ? parseInt(formProjectTypeId) : null,
          project_type_name: formProjectTypeName.trim() || null,
          pipeline_id: formPipelineId !== "none" ? parseInt(formPipelineId) : null,
          pipeline_name: formPipelineName.trim() || null,
          pipeline_phases: formPipelinePhases,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save task");

      toast.success(editingTask ? "Task updated successfully!" : "Task / Project created successfully!");
      setTaskDialogOpen(false);
      await fetchTasks();

      if (!editingTask && data.task) {
        handleOpenSubtasksModal(data.task);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save task");
    } finally {
      setSavingTask(false);
    }
  };

  // Step 2: Open Dedicated Sub-Tasks Manager Modal
  const handleOpenSubtasksModal = async (task: OperationTask) => {
    setSelectedTaskForSubtasks(task);
    setEditingSubtaskObject(null);
    setActiveSubTasks(Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : []);

    const projectMembers = Array.isArray(task.assigned_employees) && task.assigned_employees.length > 0
      ? task.assigned_employees
      : (task.assigned_employee_id ? [{ id: task.assigned_employee_id }] : []);
    const defaultStaff = projectMembers.length === 1 ? String(projectMembers[0].id) : "none";
    resetSubtaskDraft(defaultStaff);
    setSubtaskModalOpen(true);

    try {
      const params = new URLSearchParams();
      if (isPlatformRoute) {
        params.set("institution_id", "none");
      } else if (task.institution_id) {
        params.set("institution_id", String(task.institution_id));
      }
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch(`/api/admin/operations/tasks?${params.toString()}`, { headers });
      const data = await res.json();
      if (res.ok && Array.isArray(data.staff)) {
        setModalStaffList(data.staff);
      }
    } catch {
      // fallback to staffList
    }
  };

  // Add Sub-Task in Modal 2 (Prepends to top so latest appears first)
  const handleAddSubTaskToList = async () => {
    if (subTaskCreationMode === "bulk") {
      if (parsedBulkSubtasks.length === 0) {
        toast.error("Please enter at least one deliverable name (one per line)");
        return;
      }

      const assignedStaff = subtaskAssigneeOptions.find((s) => String(s.id) === newSubStaffId);
      const parsedHours = Math.max(0, parseInt(newSubDurationHours, 10) || 0);
      const parsedMins = Math.max(0, Math.min(59, parseInt(newSubDurationMinutes, 10) || 0));
      const isDaily = newSubCadence === "daily";
      const now = Date.now();

      const newSubs: SubTask[] = parsedBulkSubtasks.map((line, idx) => ({
        id: `sub_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        title: line.trim(),
        price: Number(newSubPrice) || 0,
        assigned_employee_id: assignedStaff ? assignedStaff.id : null,
        assigned_employee_name: assignedStaff ? assignedStaff.name : null,
        assigned_employee_role: assignedStaff ? assignedStaff.role : null,
        duration_hours: parsedHours,
        duration_minutes: parsedMins,
        points: Number(newSubPoints) || 20,
        penalty_points: Number(newSubPenaltyPoints) || 10,
        deadline_date: isDaily ? null : (newSubDeadlineDate || null),
        deadline_time: isDaily ? (newSubDailyTime || "10:00") : (newSubDeadlineNumber || "18:00"),
        daily_time: isDaily ? (newSubDailyTime || "10:00") : null,
        urgency: newSubUrgency,
        status: "pending",
        is_daily_recurring: isDaily,
        cadence: newSubCadence,
      }));

      const updated = [...newSubs, ...activeSubTasks];
      setActiveSubTasks(updated);

      toast.success(`Added ${newSubs.length} sub-tasks!`);
      const projectMembers = Array.isArray(selectedTaskForSubtasks?.assigned_employees) && selectedTaskForSubtasks.assigned_employees.length > 0
        ? selectedTaskForSubtasks.assigned_employees
        : (selectedTaskForSubtasks?.assigned_employee_id ? [{ id: selectedTaskForSubtasks.assigned_employee_id }] : []);
      resetSubtaskDraft(projectMembers.length === 1 ? String(projectMembers[0].id) : "none");

      if (selectedTaskForSubtasks) {
        await saveSubtasksToServer(selectedTaskForSubtasks.id, updated);
      }
      return;
    }

    if (!newSubTitle.trim()) {
      toast.error("Please enter a sub-task deliverable name");
      return;
    }

    const assignedStaff = subtaskAssigneeOptions.find((s) => String(s.id) === newSubStaffId);

    const parsedHours = Math.max(0, parseInt(newSubDurationHours, 10) || 0);
    const parsedMins = Math.max(0, Math.min(59, parseInt(newSubDurationMinutes, 10) || 0));

    const isDaily = newSubCadence === "daily";
    const newSub: SubTask = {
      id: `sub_${Date.now()}`,
      title: newSubTitle.trim(),
      price: Number(newSubPrice) || 0,
      assigned_employee_id: assignedStaff ? assignedStaff.id : null,
      assigned_employee_name: assignedStaff ? assignedStaff.name : null,
      assigned_employee_role: assignedStaff ? assignedStaff.role : null,
      duration_hours: parsedHours,
      duration_minutes: parsedMins,
      points: Number(newSubPoints) || 20,
      penalty_points: Number(newSubPenaltyPoints) || 10,
      deadline_date: isDaily ? null : (newSubDeadlineDate || null),
      deadline_time: isDaily ? (newSubDailyTime || "10:00") : (newSubDeadlineNumber || "18:00"),
      daily_time: isDaily ? (newSubDailyTime || "10:00") : null,
      urgency: newSubUrgency,
      status: "pending",
      is_daily_recurring: isDaily,
      cadence: newSubCadence,
    };

    const updated = [newSub, ...activeSubTasks];
    setActiveSubTasks(updated);

    const projectMembers = Array.isArray(selectedTaskForSubtasks?.assigned_employees) && selectedTaskForSubtasks.assigned_employees.length > 0
      ? selectedTaskForSubtasks.assigned_employees
      : (selectedTaskForSubtasks?.assigned_employee_id ? [{ id: selectedTaskForSubtasks.assigned_employee_id }] : []);
    resetSubtaskDraft(projectMembers.length === 1 ? String(projectMembers[0].id) : "none");

    if (selectedTaskForSubtasks) {
      await saveSubtasksToServer(selectedTaskForSubtasks.id, updated);
    }
  };

  // Remove Sub-Task in Modal 2
  const handleRemoveSubTaskFromList = async (subId: string) => {
    const updated = activeSubTasks.filter((s) => s.id !== subId);
    setActiveSubTasks(updated);
    if (selectedTaskForSubtasks) {
      await saveSubtasksToServer(selectedTaskForSubtasks.id, updated);
    }
  };

  // Change Sub-Task status in Modal 2
  const handleSubTaskStatusChangeInModal = async (subId: string, newStatus: any) => {
    const updated = activeSubTasks.map((s) =>
      s.id === subId ? { ...s, status: newStatus } : s
    );
    setActiveSubTasks(updated);
    if (selectedTaskForSubtasks) {
      await saveSubtasksToServer(selectedTaskForSubtasks.id, updated);
    }
  };

  // Change Sub-Task assigned staff in Modal 2
  const handleSubTaskAssigneeChangeInModal = async (subId: string, staffIdStr: string) => {
    const assignedStaff = subtaskAssigneeOptions.find((s) => String(s.id) === staffIdStr);
    const updated = activeSubTasks.map((s) =>
      s.id === subId
        ? {
          ...s,
          assigned_employee_id: assignedStaff ? assignedStaff.id : null,
          assigned_employee_name: assignedStaff ? assignedStaff.name : null,
          assigned_employee_role: assignedStaff ? assignedStaff.role : null,
        }
        : s
    );
    setActiveSubTasks(updated);
    if (selectedTaskForSubtasks) {
      await saveSubtasksToServer(selectedTaskForSubtasks.id, updated);
    }
  };

  // Server sync helper for subtasks
  const saveSubtasksToServer = async (taskId: number, updatedSubs: SubTask[]) => {
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers,
        body: JSON.stringify({ id: taskId, sub_tasks: updatedSubs }),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Failed to sync subtasks");
      }
      fetchTasks();
    } catch (err: any) {
      toast.error(err?.message || "Failed to sync subtask updates");
    }
  };

  // Direct remove subtask from card
  const handleDirectRemoveSubTask = async (task: OperationTask, subId: string) => {
    if (!confirm("Are you sure you want to remove this deliverable / sub-task?")) return;
    const currentSubs = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
    const updatedSubs = currentSubs.filter((s) => s.id !== subId);
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, sub_tasks: updatedSubs } : t)));
    await saveSubtasksToServer(task.id, updatedSubs);
    toast.success("Sub-task removed successfully");
  };

  // Subtask Edit Dialog States & Handlers
  const [editSubtaskDialogOpen, setEditSubtaskDialogOpen] = useState(false);
  const [editingSubtaskTargetTask, setEditingSubtaskTargetTask] = useState<OperationTask | null>(null);
  const [editingSubtaskId, setEditingSubtaskId] = useState<string>("");
  const [editSubTitle, setEditSubTitle] = useState("");
  const [editSubPrice, setEditSubPrice] = useState("");
  const [editSubAssignedStaffId, setEditSubAssignedStaffId] = useState("none");
  const [editSubIsDaily, setEditSubIsDaily] = useState(false);
  const [editSubDurationHours, setEditSubDurationHours] = useState("");
  const [editSubDurationMinutes, setEditSubDurationMinutes] = useState("");
  const [editSubDailyTime, setEditSubDailyTime] = useState("");
  const [editSubDeadlineDate, setEditSubDeadlineDate] = useState("");
  const [editSubDeadlineTime, setEditSubDeadlineTime] = useState("");
  const [editSubUrgency, setEditSubUrgency] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [editSubPoints, setEditSubPoints] = useState("20");
  const [editSubPenaltyPoints, setEditSubPenaltyPoints] = useState("10");

  const handleOpenEditSubtask = (task: OperationTask, sub: SubTask) => {
    setSelectedTaskForSubtasks(task);
    setEditingSubtaskObject(sub);
    setSubtaskModalOpen(true);
  };

  const handleSaveEditedSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSubtaskTargetTask || !editingSubtaskId) return;
    if (!editSubTitle.trim()) {
      toast.error("Sub-task name is required");
      return;
    }

    const assignedStaff = subtaskAssigneeOptions.find((s) => String(s.id) === editSubAssignedStaffId);
    const currentSubs = Array.isArray(editingSubtaskTargetTask.sub_tasks) ? [...editingSubtaskTargetTask.sub_tasks] : [];
    const isDaily = editSubCadence === "daily";

    const updatedSubs = currentSubs.map((s) => {
      if (s.id !== editingSubtaskId) return s;
      return {
        ...s,
        title: editSubTitle.trim(),
        price: parseFloat(editSubPrice) || 0,
        is_daily_recurring: isDaily,
        cadence: editSubCadence,
        duration_hours: parseFloat(editSubDurationHours) || 0,
        duration_minutes: parseFloat(editSubDurationMinutes) || 0,
        daily_time: isDaily ? (editSubDailyTime || "10:00") : null,
        deadline_date: !isDaily ? (editSubDeadlineDate || null) : null,
        deadline_time: !isDaily ? (editSubDeadlineTime || null) : null,
        urgency: editSubUrgency,
        points: parseFloat(editSubPoints) || 20,
        penalty_points: parseFloat(editSubPenaltyPoints) || 10,
        assigned_employee_id: assignedStaff ? assignedStaff.id : null,
        assigned_employee_name: assignedStaff ? assignedStaff.name : null,
        assigned_employee_role: assignedStaff ? assignedStaff.role : null,
        assigned_employee_email: assignedStaff ? (assignedStaff as any).email || null : null,
      };
    });

    setTasks((prev) =>
      prev.map((t) => (t.id === editingSubtaskTargetTask.id ? { ...t, sub_tasks: updatedSubs } : t))
    );
    if (selectedTaskForSubtasks?.id === editingSubtaskTargetTask.id) {
      setActiveSubTasks(updatedSubs);
    }

    setEditSubtaskDialogOpen(false);
    await saveSubtasksToServer(editingSubtaskTargetTask.id, updatedSubs);
    toast.success("Sub-task updated successfully!");
  };



  // 1-Click inline field update for subtask (Price, Priority, Cadence, Assignee)
  const handleDirectSubtaskFieldUpdate = async (
    task: any,
    subId: string | number,
    fieldUpdates: Record<string, any>
  ) => {
    const currentSubs = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
    const updatedSubs = currentSubs.map((s: any) => {
      if (String(s.id) !== String(subId)) return s;
      return {
        ...s,
        ...fieldUpdates,
      };
    });

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, sub_tasks: updatedSubs } : t))
    );

    try {
      await saveSubtasksToServer(task.id, updatedSubs);
      toast.success("Subtask updated");
    } catch (err: any) {
      toast.error(err.message || "Failed to update subtask");
      fetchTasks();
    }
  };

  // 1-Click direct sub-task status toggle
  const handleSubTaskStatusDirectUpdate = async (task: OperationTask, subId: string, newStatus: any) => {
    const currentSubs = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
    const updatedSubs = currentSubs.map((s) =>
      s.id === subId ? { ...s, status: newStatus } : s
    );

    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, sub_tasks: updatedSubs } : t))
    );

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers,
        body: JSON.stringify({ id: task.id, sub_tasks: updatedSubs }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update subtask status");
      }
      if (newStatus === "under_review") {
        toast.success("Subtask submitted for review. Admins have been notified to inspect and approve.");
      } else {
        toast.success(`Subtask marked as ${newStatus.replace("_", " ")}`);
      }
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message || "Failed to update subtask status");
      fetchTasks();
    }
  };

  const handleQuickTaskStatusChange = async (taskId: number, newStatus: string) => {
    // If employee (or admin) marks task as under_review, prompt with optional text/image submission modal
    if (newStatus === "under_review") {
      const targetTask = tasks.find((t) => t.id === taskId);
      setReviewModalTask(targetTask || null);
      setReviewNotes(targetTask?.review_notes || "");
      setReviewImageUrl(targetTask?.review_image_url || "");
      setReviewModalOpen(true);
      return;
    }

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers,
        body: JSON.stringify({ id: taskId, status: newStatus }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update task status");
      }
      if (newStatus === "completed") {
        toast.success("Task marked as completed! Performance reward points awarded.");
      } else {
        toast.success(`Task moved to ${newStatus.replace("_", " ")}`);
      }
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleSubmitUnderReview = async (skipProof = false) => {
    if (!reviewModalTask) return;
    setSubmittingReview(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const payload: any = {
        id: reviewModalTask.id,
        status: "under_review",
        review_notes: skipProof ? null : (reviewNotes.trim() || null),
        review_image_url: skipProof ? null : (reviewImageUrl.trim() || null),
      };

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to submit for review");
      }

      toast.success("Task submitted for review! Admins have been notified to inspect and approve.");
      setReviewModalOpen(false);
      setReviewModalTask(null);
      setReviewNotes("");
      setReviewImageUrl("");
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleUploadReviewFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB");
      return;
    }

    setUploadingReviewImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "edubird/tasks");

      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        headers,
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.url) {
        setReviewImageUrl(data.url);
        toast.success("Proof image uploaded successfully!");
      } else {
        // Fallback to base64 Data URL so proof attachment always succeeds
        const reader = new FileReader();
        reader.onloadend = () => {
          if (typeof reader.result === "string") {
            setReviewImageUrl(reader.result);
            toast.success("Image attached as proof!");
          }
        };
        reader.readAsDataURL(file);
      }
    } catch {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === "string") {
          setReviewImageUrl(reader.result);
          toast.success("Image attached as proof!");
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setUploadingReviewImage(false);
    }
  };

  // ── Adjust Score Handlers ──────────────────────────────────────────────────
  const handleOpenAdjustScore = async (task: OperationTask) => {
    setAdjustScoreTask(task);
    setAdjustType("bonus");
    setAdjustPoints("10");
    setAdjustReason("");
    // Default to task's primary assigned employee
    if (task.assigned_employee_id) {
      setAdjustEmployeeId(String(task.assigned_employee_id));
      setAdjustEmployeeName(task.assigned_employee_name || "");
    } else {
      setAdjustEmployeeId("none");
      setAdjustEmployeeName("");
    }
    setAdjustScoreModalOpen(true);
    // Load history
    setLoadingAdjustHistory(true);
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch(`/api/admin/operations/tasks/adjustments?task_id=${task.id}`, { headers });
      const data = await res.json();
      if (res.ok) {
        setAdjustHistory(data.adjustments || []);
        setAdjustHistorySummary(data.summary || null);
      }
    } catch {
      setAdjustHistory([]);
    } finally {
      setLoadingAdjustHistory(false);
    }
  };

  const handleSaveAdjustment = async () => {
    if (!adjustScoreTask) return;
    if (adjustEmployeeId === "none" || !adjustEmployeeId) {
      toast.error("Please select a staff member to apply the adjustment to");
      return;
    }
    const pts = parseFloat(adjustPoints);
    if (!pts || pts <= 0) {
      toast.error("Points must be a positive number");
      return;
    }
    if (!adjustReason.trim()) {
      toast.error("Reason / note is required");
      return;
    }

    setSavingAdjustment(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/operations/tasks/adjustments", {
        method: "POST",
        headers,
        body: JSON.stringify({
          task_id: adjustScoreTask.id,
          employee_id: parseInt(adjustEmployeeId),
          employee_name: adjustEmployeeName,
          adjustment_type: adjustType,
          points: pts,
          reason: adjustReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save adjustment");

      toast.success(
        adjustType === "bonus"
          ? `✅ +${pts} bonus points applied to ${adjustEmployeeName || "staff"}!`
          : `⚠️ -${pts} penalty points applied to ${adjustEmployeeName || "staff"}`
      );

      // Refresh history
      setAdjustHistory((prev) => [data.adjustment, ...prev]);
      setAdjustHistorySummary((prev: any) => prev
        ? {
          ...prev,
          total_bonus: adjustType === "bonus" ? prev.total_bonus + pts : prev.total_bonus,
          total_penalty: adjustType === "penalty" ? prev.total_penalty + pts : prev.total_penalty,
          net: adjustType === "bonus" ? prev.net + pts : prev.net - pts,
          count: prev.count + 1,
        }
        : null
      );
      setAdjustPoints("10");
      setAdjustReason("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save adjustment");
    } finally {
      setSavingAdjustment(false);
    }
  };

  const handleDeleteAdjustment = async (adjId: number) => {
    if (!confirm("Remove this adjustment? This cannot be undone.")) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      const res = await fetch(`/api/admin/operations/tasks/adjustments?id=${adjId}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setAdjustHistory((prev) => prev.filter((a) => a.id !== adjId));
        toast.success("Adjustment removed");
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to remove adjustment");
      }
    } catch {
      toast.error("Failed to remove adjustment");
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (!confirm("Are you sure you want to delete this task/project?")) return;
    try {
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/operations/tasks?id=${id}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        toast.success("Task deleted successfully");
        fetchTasks();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to delete task");
      }
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const allowedStatuses = useMemo(() => {
    if (isStaffRole) {
      return STAFF_ALLOWED_STATUSES;
    }
    return ALL_SUBTASK_STATUSES;
  }, [isStaffRole]);

  const getUrgencyBadge = (urgency: string) => {
    const config = SUBTASK_URGENCIES.find((u) => u.id === urgency) || SUBTASK_URGENCIES[1];
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`text-[10px] font-bold gap-1 px-2 py-0.5 shrink-0 ${config.color}`}>
        <Icon className="w-3 h-3" />
        <span>{config.label}</span>
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const config = ALL_SUBTASK_STATUSES.find((s) => s.id === status) || ALL_SUBTASK_STATUSES[0];
    return (
      <Badge variant="outline" className={`text-[10px] font-bold capitalize ${config.color}`}>
        {config.label}
      </Badge>
    );
  };

  const isTaskDirectlyAssignedToMe = useCallback(
    (task: OperationTask) => {
      if (!user?.id) return false;
      if (isClientRole) return true;

      const currentUserId = Number(user.id);
      const currentUserEmail = (user.email || "").toLowerCase().trim();
      const currentUserName = (user.full_name || "").toLowerCase().trim();

      // Check client assignment
      if (task.client_id && Number(task.client_id) === currentUserId) return true;
      if (Array.isArray(task.assigned_clients)) {
        const clientMatch = task.assigned_clients.some(
          (c: any) =>
            (c.id && Number(c.id) === currentUserId) ||
            (c.user_id && Number(c.user_id) === currentUserId) ||
            (currentUserEmail && c.email && c.email.toLowerCase().trim() === currentUserEmail)
        );
        if (clientMatch) return true;
      }

      if (task.assigned_employee_id && Number(task.assigned_employee_id) === currentUserId) return true;
      if (task.assigned_employee_email && currentUserEmail && task.assigned_employee_email.toLowerCase().trim() === currentUserEmail) return true;

      if (Array.isArray(task.assigned_employees)) {
        const match = task.assigned_employees.some(
          (emp: any) =>
            (emp.id && Number(emp.id) === currentUserId) ||
            (emp.employee_id && Number(emp.employee_id) === currentUserId) ||
            (currentUserEmail && emp.email && emp.email.toLowerCase().trim() === currentUserEmail) ||
            (currentUserName && currentUserName.length > 2 && currentUserName !== "admin" && emp.name && emp.name.toLowerCase().trim() === currentUserName)
        );
        if (match) return true;
      }

      if (Array.isArray(task.sub_tasks)) {
        return task.sub_tasks.some(
          (st) =>
            (st.assigned_employee_id && Number(st.assigned_employee_id) === currentUserId) ||
            (currentUserEmail && st.assigned_employee_email && st.assigned_employee_email.toLowerCase().trim() === currentUserEmail) ||
            (currentUserName && currentUserName.length > 2 && currentUserName !== "admin" && st.assigned_employee_name && st.assigned_employee_name.toLowerCase().trim() === currentUserName)
        );
      }
      return false;
    },
    [user, isClientRole]
  );

  const isTaskAssignedToMe = useCallback(
    (task: OperationTask) => {
      if (!user?.id) return false;
      const currentUserId = Number(user.id);

      // Staff can see tasks they created OR tasks they are assigned to
      if (task.created_by && Number(task.created_by) === currentUserId) return true;

      return isTaskDirectlyAssignedToMe(task);
    },
    [user, isTaskDirectlyAssignedToMe]
  );

  const normalizeStatus = (s?: string | null): TaskStatus => {
    const val = (s || "pending").toLowerCase().trim().replace("-", "_").replace(" ", "_");
    if (val === "progress") return "in_progress";
    if (val === "review") return "under_review";
    if (val === "recheck" || val === "rework") return "rework";
    if (val === "on_hold" || val === "hold") return "on_hold";
    if (val === "failed") return "failed";
    return val as TaskStatus;
  };

  const displayedTasks = useMemo(() => {
    const isStaffRoute = Boolean(pathname?.startsWith("/staff"));
    const isStaffContext = isStaffRole || isStaffRoute;

    let pool = (scopeFilter === "assigned_to_me" || isStaffContext)
      ? tasks.filter((t) => isTaskAssignedToMe(t))
      : tasks;

    if (selectedStatusTab !== "all") {
      pool = pool.filter((t) => {
        const subs: SubTask[] = Array.isArray(t.sub_tasks) ? t.sub_tasks : [];
        if (subs.length > 0) {
          return subs.some((s) => normalizeStatus(s.status) === selectedStatusTab);
        }
        return normalizeStatus(t.status) === selectedStatusTab;
      });
    } else {
      pool = pool.filter((t) => !(t.status === "completed" && !t.is_daily_recurring));
    }

    return pool;
  }, [tasks, scopeFilter, selectedStatusTab, isTaskAssignedToMe, isStaffRole, pathname]);

  const myAssignedTasksCount = useMemo(() => {
    return tasks.filter((t) => isTaskAssignedToMe(t)).length;
  }, [tasks, isTaskAssignedToMe]);

  // Get task count for tab across subtasks (Image 3)
  const getTabCount = (tabId: string) => {
    const isStaffRoute = Boolean(pathname?.startsWith("/staff"));
    const isStaffContext = isStaffRole || isStaffRoute;
    const pool = (scopeFilter === "assigned_to_me" || isStaffContext)
      ? tasks.filter((t) => isTaskAssignedToMe(t))
      : tasks;

    let count = 0;
    for (const t of pool) {
      const subs: SubTask[] = Array.isArray(t.sub_tasks) ? t.sub_tasks : [];
      if (subs.length > 0) {
        if (tabId === "all") {
          count += subs.length;
        } else {
          count += subs.filter((s) => normalizeStatus(s.status) === tabId).length;
        }
      } else {
        if (tabId === "all" || normalizeStatus(t.status) === tabId) {
          count += 1;
        }
      }
    }
    return count;
  };

  // Subtasks modal calculated totals
  const totalSubModalCost = activeSubTasks.reduce((sum, s) => sum + (s.price || 0), 0);
  const totalSubModalTotalMinutes = activeSubTasks.reduce(
    (sum, s) => sum + ((Number(s.duration_hours) || 0) * 60) + (Number(s.duration_minutes) || 0),
    0
  );
  const totalSubModalHoursDisplay = (() => {
    const h = Math.floor(totalSubModalTotalMinutes / 60);
    const m = totalSubModalTotalMinutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    if (m > 0) return `${m}m`;
    return "0h";
  })();
  const completedSubModalCount = activeSubTasks.filter((s) => s.status === "completed").length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-wider mb-1">
            <ClipboardCheck className="w-4 h-4" />
            <span>Operations & Team Workflow</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Task & Operations Board</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Click any Status Tab to view its tasks in full-width, assign sub-tasks, and track employee deliverables.
          </p>
        </div>

        {!(isClientRole || Boolean(pathname?.startsWith("/client"))) && (() => {
          const opsBasePath = pathname?.startsWith("/platformadmin") ? "/platformadmin/operations" : "/admin/operations";
          return (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Link href={`${opsBasePath}/project-types`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs font-semibold gap-1.5 border hover:bg-muted/60 transition-colors shadow-2xs"
                  title="Configure and manage project types"
                >
                  <FolderKanban className="w-4 h-4 text-primary" />
                  <span>Project Types</span>
                </Button>
              </Link>

              <Link href={`${opsBasePath}/project-pipelines`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs font-semibold gap-1.5 border hover:bg-muted/60 transition-colors shadow-2xs"
                  title="Design and manage project pipeline templates"
                >
                  <GitFork className="w-4 h-4 text-primary" />
                  <span>Project Pipelines</span>
                </Button>
              </Link>

              <Button
                onClick={handleOpenCreateTask}
                className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md gap-1.5 h-9 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create Task / Project
              </Button>
            </div>
          );
        })()}
      </div>

      {/* Scope Switcher: Hidden on Institution Admin side */}
      {!isInstitutionAdmin && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card rounded-2xl border shadow-xs">
          <div className="flex items-center gap-2">
            {!(isStaffRole || pathname?.startsWith("/staff")) ? (
              <>
                <Button
                  size="sm"
                  variant={scopeFilter === "all" ? "default" : "outline"}
                  onClick={() => setScopeFilter("all")}
                  className="h-8 text-xs font-bold gap-1.5"
                >
                  <ClipboardList className="w-3.5 h-3.5" /> All Tasks
                  <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                    {tasks.length}
                  </Badge>
                </Button>

                <Button
                  size="sm"
                  variant={scopeFilter === "assigned_to_me" ? "default" : "outline"}
                  onClick={() => setScopeFilter("assigned_to_me")}
                  className={`h-8 text-xs font-bold gap-1.5 ${scopeFilter === "assigned_to_me"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                    }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Assigned to Me
                  <Badge
                    className={`ml-1 text-[10px] px-1.5 py-0 ${scopeFilter === "assigned_to_me" ? "bg-white text-emerald-800" : "bg-emerald-600 text-white"
                      }`}
                  >
                    {myAssignedTasksCount}
                  </Badge>
                </Button>
              </>
            ) : (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> My Tasks (Assigned to You or Created by You)
                <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                  {displayedTasks.length}
                </Badge>
              </div>
            )}
          </div>

          {user?.full_name && (
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
              <span>Staff Account:</span>
              <span className="font-bold text-foreground">{user.full_name}</span>
              {isStaffRole && (
                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                  Staff Mode
                </Badge>
              )}
            </div>
          )}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="rounded-2xl border bg-card/60 shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <ClipboardList className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Total Tasks</p>
              <h3 className="text-lg font-bold">{stats.totalTasks}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">In Progress</p>
              <h3 className="text-lg font-bold">{stats.inProgressTasks}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 flex items-center justify-center font-bold">
              <Flame className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Urgent / High</p>
              <h3 className="text-lg font-bold">{stats.urgentTasks}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-xs">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Completed</p>
              <h3 className="text-lg font-bold">{stats.completedTasks}</h3>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border bg-card/60 shadow-xs col-span-2 md:col-span-1">
          <CardContent className="p-3.5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <IndianRupee className="w-4.5 h-4.5" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Total Billed Cost</p>
              <h3 className="text-lg font-bold font-mono tracking-wider">{formatPriceDisplay(stats.totalRevenue)}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* TABS NAVIGATION BAR: Click any tab to view full-width tasks */}
      <div className="flex items-center gap-1.5 p-1.5 bg-muted/40 rounded-2xl border overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const isSelected = selectedStatusTab === tab.id;
          const count = getTabCount(tab.id);

          return (
            <button
              key={tab.id}
              onClick={() => setSelectedStatusTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${isSelected
                ? "bg-background text-foreground shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row items-center gap-3 bg-muted/20 p-3 rounded-2xl border">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tasks, deliverables, clients, or employees..."
            className="pl-9 bg-background h-10 text-xs rounded-xl"
          />
        </div>

        {/* Organization Filter (Multi-Institution only for institute routes; hidden on platform admin since all staff are assigned to EduBird organization) */}
        {!isPlatformRoute && institutions.length > 1 && (
          <div className="w-full sm:w-48">
            <select
              value={orgFilter}
              onChange={(e) => setOrgFilter(e.target.value)}
              className="w-full h-10 text-xs bg-background rounded-xl border border-input px-3 font-medium outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer text-foreground"
            >
              <option value="all">All Organizations</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={String(inst.id)}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Urgency Filter */}
        <div className="w-full sm:w-44">
          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="w-full h-10 text-xs bg-background rounded-xl border border-input px-3 font-medium outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer text-foreground"
          >
            <option value="all">All Urgencies</option>
            {SUBTASK_URGENCIES.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label}
              </option>
            ))}
          </select>
        </div>

        {/* Client Filter */}
        {!isInstitutionAdmin && (
          <div className="w-full sm:w-44">
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="w-full h-10 text-xs bg-background rounded-xl border border-input px-3 font-medium outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer text-foreground"
            >
              <option value="all">All Clients</option>
              {(isPlatformRoute ? clients.filter((c) => !c.institution_id) : clients).map((c) => (
                <option key={c.id} value={String(c.id)}>
                  {c.company_name || c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Staff / Employee Filter */}
        <div className="w-full sm:w-48">
          <select
            value={staffFilter}
            onChange={(e) => setStaffFilter(e.target.value)}
            className="w-full h-10 text-xs bg-background rounded-xl border border-input px-3 font-medium outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer text-foreground"
          >
            <option value="all">All Staff Members</option>
            {uniqueStaffList.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.name} ({s.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Full-Width Content Area */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary mr-2" />
          <span className="text-sm font-medium text-muted-foreground">Loading tasks...</span>
        </div>
      ) : displayedTasks.length === 0 ? (
        <div className="text-center py-20 border rounded-3xl bg-muted/10 space-y-3">
          {scopeFilter === "assigned_to_me" ? (
            <>
              <Sparkles className="w-12 h-12 text-emerald-500/60 mx-auto" />
              <h3 className="text-lg font-bold text-foreground">No Tasks Assigned to You</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                When your institution administrator assigns tasks or deliverables to you, they will appear right here.
              </p>
              <Button variant="outline" size="sm" onClick={() => setScopeFilter("all")} className="mt-2 text-xs font-bold">
                View All Tasks
              </Button>
            </>
          ) : (
            <>
              <ClipboardCheck className="w-12 h-12 text-muted-foreground/40 mx-auto" />
              <h3 className="text-lg font-bold text-foreground">
                No tasks found in &quot;{STATUS_TABS.find((t) => t.id === selectedStatusTab)?.label}&quot;
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Click &quot;Create Task / Project&quot; to add a new project, then use the Action button to add and assign multiple sub-tasks.
              </p>
              <Button onClick={handleOpenCreateTask} size="sm" className="mt-2 font-bold">
                <Plus className="w-4 h-4 mr-1.5" /> Create Task / Project
              </Button>
            </>
          )}
        </div>
      ) : (
        /* FULL WIDTH CARDS VIEW: Each project card takes full horizontal row */
        <div className="space-y-5">
          {displayedTasks.map((task) => {
            const rawSubTasksList: SubTask[] = Array.isArray(task.sub_tasks) ? task.sub_tasks : [];
            const subTasksList: SubTask[] = selectedStatusTab === "all"
              ? rawSubTasksList
              : rawSubTasksList.filter((s) => normalizeStatus(s.status) === selectedStatusTab);
            const completedSubs = rawSubTasksList.filter((s) => normalizeStatus(s.status) === "completed").length;
            const totalCost = rawSubTasksList.reduce((sum, s) => sum + (parseFloat(String(s.price)) || 0), 0) || parseFloat(String(task.price || 0));
            const totalMinutes = rawSubTasksList.reduce((sum, s) => {
              const h = parseFloat(String(s.duration_hours)) || 0;
              const m = parseFloat(String(s.duration_minutes)) || 0;
              return sum + (h * 60) + m;
            }, 0);
            const totalHoursDisplay = totalMinutes > 0
              ? (() => {
                const h = Math.floor(totalMinutes / 60);
                const m = Math.round(totalMinutes % 60);
                if (h > 0 && m > 0) return `${h}h ${m}m`;
                if (h > 0) return `${h}h`;
                if (m > 0) return `${m}m`;
                return "0m";
              })()
              : (parseFloat(String(task.estimated_hours || 0)) ? `${task.estimated_hours}h` : "0h");


            // Expected duration calculated according to team members assigned/working on each sub-task
            const expectedMinutes = rawSubTasksList.reduce((sum, s) => {
              const baseMin = ((parseFloat(String(s.duration_hours)) || 0) * 60) + (parseFloat(String(s.duration_minutes)) || 0);
              const teamMembers = new Set<string>();
              if (s.assigned_employee_name) {
                s.assigned_employee_name.split(",").map((x) => x.trim()).filter(Boolean).forEach((x) => teamMembers.add(x));
              }
              if (Array.isArray((s as any).assigned_employees)) {
                (s as any).assigned_employees.forEach((e: any) => {
                  const n = typeof e === "string" ? e : (e?.name || e?.full_name);
                  if (n) teamMembers.add(String(n).trim());
                });
              }
              if (Array.isArray(s.uploads)) {
                s.uploads.forEach((u: any) => {
                  if (u?.uploaded_by_name) teamMembers.add(String(u.uploaded_by_name).trim());
                });
              }
              if (Array.isArray(s.work_updates)) {
                s.work_updates.forEach((w: any) => {
                  if (w?.author_name) teamMembers.add(String(w.author_name).trim());
                });
              }
              if ((s as any).started_by_name) teamMembers.add(String((s as any).started_by_name).trim());
              const teamCount = Math.max(1, teamMembers.size);
              return sum + (baseMin * teamCount);
            }, 0);

            const expectedDurationDisplay = expectedMinutes > 0
              ? (() => {
                const h = Math.floor(expectedMinutes / 60);
                const m = Math.round(expectedMinutes % 60);
                if (h > 0 && m > 0) return `${h}h ${m}m`;
                if (h > 0) return `${h} hours`;
                if (m > 0) return `${m}m`;
                return "0m";
              })()
              : totalHoursDisplay;

            // Duration taken by team
            const durationTakenMinutes = rawSubTasksList.reduce((sum, s) => {
              const baseMin = ((parseFloat(String(s.duration_hours)) || 0) * 60) + (parseFloat(String(s.duration_minutes)) || 0);
              const logged = parseFloat(String((s as any).logged_minutes)) || 0;
              return sum + (logged > 0 ? logged : baseMin);
            }, 0);

            const durationTakenDisplay = durationTakenMinutes > 0
              ? (() => {
                const h = Math.floor(durationTakenMinutes / 60);
                const m = Math.round(durationTakenMinutes % 60);
                if (h > 0 && m > 0) return `${h}h ${m}m`;
                if (h > 0) return `${h}h`;
                if (m > 0) return `${m}m`;
                return "0m";
              })()
              : totalHoursDisplay;
            const isExpanded = expandedTaskSubtasks[task.id] ?? false;
            const isCreator = Boolean(user?.id && task.created_by && Number(task.created_by) === Number(user.id));
            const isAssigned = isTaskDirectlyAssignedToMe(task);
            const canEditOrRemove = !isStaffViewer || isCreator;

            return (
              <Card
                key={task.id}
                className="rounded-2xl border border-border/80 hover:border-primary/50 shadow-xs hover:shadow-md transition-all bg-card flex flex-col justify-between overflow-hidden"
              >
                <CardContent className="p-5 space-y-4 text-xs">
                  {/* Top Bar: Badges row, Status & Action Button on right */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    {!isInstitutionAdmin ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {getUrgencyBadge(task.urgency)}
                        <span className="text-[11px] text-muted-foreground font-mono">#{task.id}</span>
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[10px] gap-1 font-semibold">
                          <Sparkles className="w-3 h-3 text-amber-500" /> +{task.points || 20} / -{task.penalty_points || 10} pts
                        </Badge>
                        {task.is_daily_recurring && (
                          <Badge variant="outline" className={task.status === "completed" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] gap-1 font-semibold" : "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] gap-1 font-semibold"}>
                            <RefreshCw className="w-3 h-3" /> {task.status === "completed" ? "Daily Task (Completed Today)" : "Daily Recurring Task"}
                          </Badge>
                        )}
                        {isAssigned && isCreator && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] gap-1 font-semibold">
                            <Sparkles className="w-3 h-3 text-amber-500" /> Assigned & Created by You
                          </Badge>
                        )}
                        {isAssigned && !isCreator && (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] gap-1 font-semibold">
                            <Sparkles className="w-3 h-3 text-amber-500" /> Assigned to You
                          </Badge>
                        )}
                        {!isAssigned && isCreator && (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[10px] gap-1 font-semibold">
                            <Sparkles className="w-3 h-3 text-blue-500" /> Created by You
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-muted-foreground">#{task.id}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 shrink-0 ml-auto flex-wrap">
                      {/* Add Sub-Task Button */}
                      {canEditOrRemove && !isClientRole && (
                        <Button
                          size="sm"
                          onClick={() => handleOpenSubtasksModal(task)}
                          className="h-8 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg shadow-2xs cursor-pointer px-3"
                          title="Add sub-task"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Sub-Task</span>
                        </Button>
                      )}

                      {/* Status Dropdown (Image 4): pending, in_progress, completed, on_hold, rework, cancelled, failed */}
                      <select
                        value={task.status === "recheck" ? "rework" : task.status || "pending"}
                        onChange={(e) => handleQuickTaskStatusChange(task.id, e.target.value)}
                        className="h-8 text-xs font-bold w-32 bg-muted/30 rounded-lg border border-input px-2 outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer text-foreground capitalize"
                        title="Change project status"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In progress</option>
                        <option value="completed">Completed</option>
                        <option value="on_hold">On hold</option>
                        <option value="rework">Rework</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="failed">Failed</option>
                      </select>

                      {/* 3-dots Menu: invoices, Edit, History and info, delete (Image 4) */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer transition-colors"
                            title="More project actions"
                          >
                            <MoreVertical className="w-4 h-4 fill-current text-red-600" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 text-xs font-medium">
                          <DropdownMenuItem
                            onClick={() => setInvoicesModalTask(task)}
                            className="gap-2 cursor-pointer font-medium"
                          >
                            <Receipt className="w-4 h-4 text-primary" />
                            <span>Invoices</span>
                          </DropdownMenuItem>
                          {canEditOrRemove && !isClientRole && (
                            <DropdownMenuItem
                              onClick={() => handleOpenEditTask(task)}
                              className="gap-2 cursor-pointer font-medium"
                            >
                              <Edit2 className="w-4 h-4 text-blue-600" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => {
                              setHistoryModalSubtask(null);
                              setHistoryModalTask(task);
                            }}
                            className="gap-2 cursor-pointer font-medium"
                          >
                            <History className="w-4 h-4 text-amber-600" />
                            <span>History and info</span>
                          </DropdownMenuItem>
                          {canEditOrRemove && !isClientRole && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteTask(task.id)}
                                className="gap-2 text-destructive focus:text-destructive cursor-pointer font-medium"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* FULL WIDTH TASK NAMING / TITLE */}
                  <div className="w-full pt-1">
                    <h3 className="text-base font-bold text-foreground leading-snug break-words w-full">
                      {task.title}
                    </h3>
                  </div>

                  {/* Assigned Clients Badges */}
                  {(Array.isArray(task.assigned_clients) && task.assigned_clients.length > 0) || task.client_name ? (
                    <div className="flex items-center gap-1.5 text-xs pt-1 flex-wrap">
                      <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-muted-foreground text-[11px] font-medium">Client:</span>
                      {Array.isArray(task.assigned_clients) && task.assigned_clients.length > 0 ? (
                        task.assigned_clients.map((c) => (
                          <Badge key={c.id} variant="secondary" className="text-[11px] py-0 px-2 font-semibold gap-1">
                            <Building2 className="w-2.5 h-2.5 text-primary" />
                            {c.company_name || c.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="font-bold text-foreground text-xs">{task.client_name}</span>
                      )}
                    </div>
                  ) : null}

                  {task.details && (
                    <p className="text-muted-foreground text-xs leading-relaxed bg-muted/20 p-2.5 rounded-xl border">
                      {task.details}
                    </p>
                  )}

                  {/* Project Extended Details: Leader, Teams Staff, Dates, Live URL, Demo URL, Agreement Document */}
                  {(() => {
                    const teamStaffList: Array<{ id?: string | number; name: string; role?: string | null }> = [];
                    if (Array.isArray(task.assigned_employees) && task.assigned_employees.length > 0) {
                      task.assigned_employees.forEach((emp) => {
                        if (emp && emp.name && !teamStaffList.some((s) => String(s.id) === String(emp.id))) {
                          teamStaffList.push(emp);
                        }
                      });
                    } else if (task.assigned_employee_name) {
                      teamStaffList.push({
                        id: task.assigned_employee_id || "emp",
                        name: task.assigned_employee_name,
                        role: task.assigned_employee_role || null,
                      });
                    }

                    const isOverdue = Boolean(
                      task.due_date &&
                      new Date(task.due_date).getTime() < Date.now() &&
                      task.status !== "completed"
                    );

                    return (
                      <div className="space-y-2 p-3 bg-muted/20 rounded-xl border text-xs">
                        {/* Row 1: Project Leader, Teams Staff & Timeline Dates */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {/* Project Leader */}
                            {task.project_leader_name ? (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-900 dark:text-amber-300 border-amber-500/30 gap-1.5 py-1 px-2.5 font-semibold text-[11px]">
                                <Crown className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="text-muted-foreground font-normal">Leader:</span>
                                <strong className="text-foreground">{task.project_leader_name}</strong>
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-dashed gap-1 py-1 px-2 text-[11px]">
                                <Crown className="w-3 h-3 opacity-50 shrink-0" />
                                <span>No Leader Assigned</span>
                              </Badge>
                            )}

                            {/* Teams Staff */}
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-900 dark:text-blue-300 border-blue-500/30 gap-1.5 py-1 px-2.5 font-semibold text-[11px]">
                              <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span className="text-muted-foreground font-normal">Team Staff:</span>
                              {teamStaffList.length > 0 ? (
                                <strong className="text-foreground">
                                  {teamStaffList.map((m) => m.name).join(", ")}
                                </strong>
                              ) : (
                                <span className="italic font-normal text-muted-foreground">Unassigned</span>
                              )}
                            </Badge>
                          </div>

                          {/* Start Date & Due Date */}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="bg-background text-foreground border gap-1.5 py-1 px-2.5 text-[11px] font-medium">
                              <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span className="text-muted-foreground">Start Date:</span>
                              <strong className="font-mono">{task.start_date ? formatDateDisplay(task.start_date) : "Not set"}</strong>
                            </Badge>
                            <Badge
                              variant="outline"
                              className={`gap-1.5 py-1 px-2.5 text-[11px] font-medium ${isOverdue
                                  ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/40"
                                  : "bg-background text-foreground border"
                                }`}
                            >
                              <Clock className={`w-3.5 h-3.5 shrink-0 ${isOverdue ? "text-rose-600" : "text-amber-600"}`} />
                              <span className="text-muted-foreground">Due Date:</span>
                              <strong className="font-mono">{(task.due_date || task.deadline) ? formatDateDisplay(task.due_date || task.deadline) : "Not set"}</strong>
                              {isOverdue && (
                                <span className="text-[9px] uppercase font-bold text-rose-600 tracking-wider bg-rose-500/20 px-1 py-0.2 rounded ml-0.5">
                                  Overdue
                                </span>
                              )}
                            </Badge>
                          </div>
                        </div>

                        {/* Row 2: Live Website, Demo URL & Project Agreement Document */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {/* Live Website */}
                          {task.live_url ? (
                            <a
                              href={task.live_url.startsWith("http") ? task.live_url : `https://${task.live_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 transition-all group shadow-2xs"
                              title={`Open Live Website: ${task.live_url}`}
                            >
                              <Globe className="w-3.5 h-3.5 text-emerald-600 group-hover:scale-110 transition-transform shrink-0" />
                              <span>Live Website</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-muted-foreground/60 bg-muted/30 border border-dashed">
                              <Globe className="w-3 h-3 opacity-40 shrink-0" />
                              <span>No Live Website</span>
                            </span>
                          )}

                          {/* Demo URL */}
                          {task.demo_url ? (
                            <a
                              href={task.demo_url.startsWith("http") ? task.demo_url : `https://${task.demo_url}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-500/10 text-blue-800 dark:text-blue-300 border border-blue-500/30 hover:bg-blue-500/20 transition-all group shadow-2xs"
                              title={`Open Demo URL: ${task.demo_url}`}
                            >
                              <Monitor className="w-3.5 h-3.5 text-blue-600 group-hover:scale-110 transition-transform shrink-0" />
                              <span>Demo URL</span>
                              <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-muted-foreground/60 bg-muted/30 border border-dashed">
                              <Monitor className="w-3 h-3 opacity-40 shrink-0" />
                              <span>No Demo URL</span>
                            </span>
                          )}

                          {/* Project Agreement Document */}
                          {task.agreement_document_url ? (
                            <div className="inline-flex items-center gap-1.5 flex-wrap">
                              <a
                                href={task.agreement_document_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-violet-500/10 text-violet-800 dark:text-violet-300 border border-violet-500/30 hover:bg-violet-500/20 transition-all group shadow-2xs"
                                title={`View/Download Agreement: ${task.agreement_document_name || "Agreement Document"}`}
                              >
                                <FileText className="w-3.5 h-3.5 text-violet-600 group-hover:scale-110 transition-transform shrink-0" />
                                <span className="truncate max-w-[220px]">
                                  {task.agreement_document_name || "Project Agreement Document"}
                                </span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                              </a>
                              <label
                                className="inline-flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/80 cursor-pointer border border-dashed border-border transition-colors"
                                title="Upload new version / replace agreement document"
                              >
                                {directDocUploadingTaskId === task.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                                ) : (
                                  <Upload className="w-3 h-3 text-muted-foreground" />
                                )}
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt,.xlsx,.xls"
                                  disabled={directDocUploadingTaskId === task.id}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleDirectAgreementDocUpload(task.id, f);
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                            </div>
                          ) : (
                            <label
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-muted-foreground bg-muted/30 hover:bg-violet-500/10 hover:text-violet-700 hover:border-violet-500/40 border border-dashed cursor-pointer transition-all group shadow-2xs"
                              title="Click here to upload agreement document"
                            >
                              {directDocUploadingTaskId === task.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-violet-600 shrink-0" />
                              ) : (
                                <FileText className="w-3.5 h-3.5 opacity-60 group-hover:text-violet-600 shrink-0" />
                              )}
                              <span>No Agreement Doc</span>
                              <span className="text-[10px] text-violet-600 dark:text-violet-400 font-bold underline underline-offset-2 ml-0.5">
                                + Upload
                              </span>
                              <input
                                type="file"
                                className="hidden"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp,.txt,.xlsx,.xls"
                                disabled={directDocUploadingTaskId === task.id}
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) handleDirectAgreementDocUpload(task.id, f);
                                  e.target.value = "";
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Summary Bar: Total Cost, Duration, Sub-Tasks Progress */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-muted/30 p-3 rounded-xl border text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Total Cost</span>
                      <span className="font-bold text-foreground font-mono text-sm tracking-wider">
                        {formatPriceDisplay(totalCost)}
                      </span>
                    </div>
                    <div className="border-l pl-3">
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Expected Duration</span>
                      <span className="font-bold text-foreground font-mono text-sm">
                        {expectedDurationDisplay}
                      </span>
                    </div>
                    <div className="border-l pl-3">
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Duration Taken</span>
                      <span className="font-bold text-foreground font-mono text-sm">
                        {durationTakenDisplay}
                      </span>
                    </div>
                    <div className="border-l pl-3">
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Sub-Tasks</span>
                      <span className="font-bold text-foreground font-mono text-sm">
                        {completedSubs}/{subTasksList.length} Done
                      </span>
                    </div>
                  </div>

                  {/* Under Review Deliverables / Proof Section */}
                  {(task.review_notes || task.review_image_url || task.status === "under_review") && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 space-y-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                          <FileCheck className="w-4 h-4 text-amber-600" />
                          Review Deliverables & Proof
                        </span>
                        {task.review_submitted_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(task.review_submitted_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {task.review_notes ? (
                        <p className="text-foreground text-xs whitespace-pre-wrap bg-background/80 p-2.5 rounded-lg border leading-relaxed">
                          {task.review_notes}
                        </p>
                      ) : (
                        task.status === "under_review" && (
                          <p className="text-[11px] text-muted-foreground italic">
                            No notes attached. Deliverables submitted for administrative review.
                          </p>
                        )
                      )}

                      {task.review_image_url && (
                        <div className="pt-1">
                          <a
                            href={task.review_image_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block group"
                          >
                            <img
                              src={task.review_image_url}
                              alt="Proof deliverable"
                              className="max-h-36 rounded-lg border object-cover shadow-xs group-hover:opacity-90 transition-opacity"
                            />
                            <span className="text-[11px] text-primary group-hover:underline flex items-center gap-1 mt-1 font-semibold">
                              <ExternalLink className="w-3 h-3" /> Click to view full proof image
                            </span>
                          </a>
                        </div>
                      )}

                      {/* Admin Quick Decision Buttons */}
                      {!isStaffRole && task.status === "under_review" && (
                        <div className="flex items-center gap-2 pt-2 border-t border-amber-500/20">
                          <Button
                            size="sm"
                            onClick={() => handleQuickTaskStatusChange(task.id, "completed")}
                            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approve & Complete (+{task.points || 20} pts)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleQuickTaskStatusChange(task.id, "recheck")}
                            className="h-7 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 font-bold gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> Request Recheck
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress Bar */}
                  {subTasksList.length > 0 && (
                    <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${(completedSubs / subTasksList.length) * 100}%`,
                        }}
                      />
                    </div>
                  )}

                  {/* Project Pipeline Instance Workflow (if attached) */}
                  {Array.isArray(task.pipeline_phases) && task.pipeline_phases.length > 0 ? (() => {
                    const phases = task.pipeline_phases;
                    const currentIndex = task.current_phase_index ?? 0;
                    const completedPhasesCount = phases.filter((p) => p.status === "completed").length;
                    const currentPhase = phases[currentIndex] || phases[0];

                    const getPhaseStatusBadgeInfo = (st?: string) => {
                      switch (st) {
                        case "completed":
                          return { label: "Completed", bg: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30", dot: "bg-emerald-500" };
                        case "in_progress":
                          return { label: "In Progress", bg: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30", dot: "bg-blue-500 animate-pulse" };
                        case "under_review":
                          return { label: "Under Review", bg: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/40", dot: "bg-amber-500" };
                        case "on_hold":
                          return { label: "On Hold", bg: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30", dot: "bg-orange-500" };
                        case "failed":
                          return { label: "Failed", bg: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30", dot: "bg-rose-500" };
                        case "cancelled":
                          return { label: "Cancelled", bg: "bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 border-zinc-500/30", dot: "bg-zinc-500" };
                        default:
                          return { label: "Not Started", bg: "bg-muted/80 text-muted-foreground border-border", dot: "bg-muted-foreground/40" };
                      }
                    };

                    return (
                      <div className="space-y-3 p-3.5 bg-muted/25 rounded-xl border text-xs">
                        {/* Pipeline Header Bar */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b pb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-foreground flex items-center gap-1.5 text-xs">
                              <GitFork className="w-4 h-4 text-primary" />
                              {task.pipeline_name || "Project Pipeline"}
                            </span>
                            {task.project_type_name && (
                              <Badge variant="outline" className="text-[10px] bg-background font-semibold gap-1 py-0.5 px-2">
                                <FolderKanban className="w-3 h-3 text-primary" />
                                {task.project_type_name}
                              </Badge>
                            )}
                            <Badge
                              variant="secondary"
                              className="text-[10px] font-bold py-0.5 px-2.5 bg-primary/10 text-primary border border-primary/20"
                            >
                              Phase {currentIndex + 1} of {phases.length}: {currentPhase?.name || "In Progress"}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                            <span className="font-mono font-semibold text-foreground">
                              {completedPhasesCount}/{phases.length} Phases Done
                            </span>
                            <div className="w-20 bg-muted h-2.5 rounded-full overflow-hidden border">
                              <div
                                className="bg-primary h-full transition-all duration-300"
                                style={{ width: `${(completedPhasesCount / phases.length) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Interactive Phase Sequence Stepper */}
                        <div className="flex items-center gap-2.5 overflow-x-auto py-1 no-scrollbar">
                          {phases.map((ph, idx) => {
                            const isCurrent = idx === currentIndex;
                            const isDone = ph.status === "completed";
                            const isReview = ph.status === "under_review";
                            const statusInfo = getPhaseStatusBadgeInfo(ph.status);

                            return (
                              <div key={ph.id || idx} className="flex items-center gap-2 shrink-0">
                                <div
                                  className={`flex flex-col rounded-xl p-3 min-w-[200px] max-w-[220px] border shadow-2xs transition-all ${
                                    isCurrent
                                      ? "bg-card border-primary ring-2 ring-primary/30"
                                      : isDone
                                      ? "bg-emerald-500/5 border-emerald-500/30"
                                      : "bg-card border-border hover:border-input"
                                  }`}
                                >
                                  {/* Step number & Phase Status Dropdown */}
                                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                    <span
                                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${
                                        isDone
                                          ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                                          : isCurrent
                                          ? "bg-primary text-primary-foreground"
                                          : "bg-muted text-muted-foreground"
                                      }`}
                                    >
                                      Step {idx + 1}
                                    </span>

                                    {/* Prominent Phase Status Change Dropdown */}
                                    {canEditOrRemove ? (
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <button
                                            type="button"
                                            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer shadow-2xs ${statusInfo.bg}`}
                                            title="Click to change phase status"
                                          >
                                            <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                                            <span>{statusInfo.label}</span>
                                            <ChevronDown className="w-2.5 h-2.5 opacity-60 ml-0.5" />
                                          </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-44 text-xs font-medium">
                                          <DropdownMenuItem
                                            onClick={() => handleUpdateProjectPhase(task, idx, "not_started")}
                                            className="gap-2 cursor-pointer text-xs"
                                          >
                                            <span className="w-2 h-2 rounded-full bg-slate-400" />
                                            <span>Not Started</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => handleUpdateProjectPhase(task, idx, "in_progress")}
                                            className="gap-2 cursor-pointer text-xs text-blue-600 font-semibold"
                                          >
                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                            <span>In Progress</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => handleUpdateProjectPhase(task, idx, "under_review")}
                                            className="gap-2 cursor-pointer text-xs text-amber-600 font-semibold"
                                          >
                                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                                            <span>Under Review</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => handleUpdateProjectPhase(task, idx, "completed")}
                                            className="gap-2 cursor-pointer text-xs text-emerald-600 font-semibold"
                                          >
                                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span>Completed</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => handleUpdateProjectPhase(task, idx, "on_hold")}
                                            className="gap-2 cursor-pointer text-xs text-orange-600 font-semibold"
                                          >
                                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                                            <span>On Hold</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => handleUpdateProjectPhase(task, idx, "failed")}
                                            className="gap-2 cursor-pointer text-xs text-rose-600 font-semibold"
                                          >
                                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                                            <span>Failed</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuItem
                                            onClick={() => handleUpdateProjectPhase(task, idx, "cancelled")}
                                            className="gap-2 cursor-pointer text-xs text-muted-foreground font-semibold"
                                          >
                                            <span className="w-2 h-2 rounded-full bg-zinc-400" />
                                            <span>Cancelled</span>
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            onClick={() => {
                                              setPhaseModalState({ task, phaseIndex: idx, phase: ph });
                                              setPhaseModalStatus(ph.status || "not_started");
                                              setPhaseModalNotes(ph.notes || "");
                                              setPhaseModalAdvanceNext(true);
                                            }}
                                            className="gap-2 cursor-pointer text-xs text-primary font-bold"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                            <span>Phase Details & Notes...</span>
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className={`text-[10px] px-2 py-0.5 font-semibold ${statusInfo.bg}`}
                                      >
                                        <span className={`w-1.5 h-1.5 rounded-full mr-1 ${statusInfo.dot}`} />
                                        {statusInfo.label}
                                      </Badge>
                                    )}
                                  </div>

                                  {/* Phase Title */}
                                  <span
                                    className={`text-xs font-bold leading-tight line-clamp-1 ${
                                      isDone ? "text-emerald-800 dark:text-emerald-300 line-through opacity-80" : "text-foreground"
                                    }`}
                                    title={ph.name}
                                  >
                                    {ph.name}
                                  </span>

                                  {/* Role & Duration */}
                                  <div className="flex items-center justify-between text-[10px] text-muted-foreground mt-1.5 pt-1.5 border-t">
                                    <span className="truncate max-w-[105px]" title={ph.assigned_role || "Role: Unassigned"}>
                                      {ph.assigned_role || "Any"}
                                    </span>
                                    <span className="font-mono font-semibold">
                                      {ph.estimated_duration_hours ? `${ph.estimated_duration_hours}h` : "—"}
                                    </span>
                                  </div>

                                  {/* Quick Action buttons for current phase */}
                                  {canEditOrRemove && isCurrent && (
                                    <div className="pt-2 flex items-center gap-1.5">
                                      {ph.requires_approval && isReview ? (
                                        <Button
                                          size="sm"
                                          onClick={() => handleUpdateProjectPhase(task, idx, "completed", true)}
                                          className="h-6 text-[10px] font-bold w-full bg-amber-600 hover:bg-amber-700 text-white py-0 px-2 gap-1 shadow-2xs"
                                          title="Approve this phase and advance to next phase"
                                        >
                                          <Check className="w-3 h-3" /> Approve Phase
                                        </Button>
                                      ) : isDone && idx + 1 < phases.length ? (
                                        <Button
                                          size="sm"
                                          onClick={() => handleUpdateProjectPhase(task, idx, "completed", true)}
                                          className="h-6 text-[10px] font-bold w-full bg-primary hover:bg-primary/90 text-primary-foreground py-0 px-2 gap-1 shadow-2xs"
                                        >
                                          Next Phase <ArrowRight className="w-3 h-3" />
                                        </Button>
                                      ) : !isDone ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => handleUpdateProjectPhase(task, idx, "completed", true)}
                                          className="h-6 text-[10px] font-bold w-full border-emerald-500/40 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 py-0 px-2 gap-1"
                                        >
                                          <Check className="w-3 h-3 text-emerald-600" /> Mark Complete
                                        </Button>
                                      ) : null}
                                    </div>
                                  )}
                                </div>

                                {idx < phases.length - 1 && (
                                  <ArrowRight
                                    className={`w-3.5 h-3.5 shrink-0 ${
                                      idx < currentIndex ? "text-emerald-500" : "text-muted-foreground/30"
                                    }`}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })() : canEditOrRemove && (
                    <div className="flex items-center justify-between p-2.5 bg-muted/20 rounded-xl border border-dashed text-xs">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GitFork className="w-4 h-4 text-primary opacity-60" />
                        <span>No pipeline workflow assigned to this project yet.</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAttachPipelineTask(task);
                          setAttachTypeId("none");
                          setAttachPipelineId("none");
                          setAttachAvailablePipelines([]);
                          void fetchProjectTypesForModal();
                        }}
                        className="h-7 text-xs font-semibold gap-1 text-primary border-primary/30 hover:bg-primary/10"
                      >
                        <Plus className="w-3 h-3" /> Assign Pipeline
                      </Button>
                    </div>
                  )}

                  {/* Full-Width Sub-Tasks List */}
                  <div className="space-y-2 pt-1 border-t">
                    <div
                      className="flex items-center justify-between cursor-pointer hover:text-primary transition-colors text-xs font-bold text-foreground"
                      onClick={() =>
                        setExpandedTaskSubtasks((prev) => ({
                          ...prev,
                          [task.id]: !isExpanded,
                        }))
                      }
                    >
                      <div className="flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-primary" />
                        <span>
                          Sub-Tasks & Assignees ({subTasksList.length}
                          {rawSubTasksList.length !== subTasksList.length ? ` of ${rawSubTasksList.length}` : ""})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {canEditOrRemove && !isClientRole && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSubtasksModal(task);
                            }}
                            className="h-6 text-[11px] font-semibold gap-1 text-primary hover:bg-primary/10 border-primary/30 py-0 px-2 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>add sub task</span>
                          </Button>
                        )}
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {isExpanded ? "Collapse" : "Expand"}
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </div>
                    </div>

                    {isExpanded && subTasksList.length > 0 && (
                      <div className="space-y-3 pt-1">
                        {subTasksList.map((sub, index) => (
                          <SubtaskCard
                            key={sub.id || index}
                            task={task}
                            subtask={sub as any}
                            index={index}
                            currentUserId={user?.id}
                            isClientView={isClientRole || Boolean(pathname?.startsWith("/client"))}
                            staffOptions={getProjectStaffOptions(task)}
                            allowedStatuses={allowedStatuses}
                            onUpdateSubtask={handleDirectSubtaskFieldUpdate}
                            onDeleteSubtask={(t, subId) => handleDirectRemoveSubTask(t, String(subId))}
                            onOpenEdit={(t, s) => handleOpenEditSubtask(t, s as any)}
                            onOpenHistory={(t, s) => {
                              setHistoryModalSubtask(s as any);
                              setHistoryModalTask(t);
                            }}
                            onOpenUploads={(t, s) => setUploadModalState({ task: t, subtask: s as any })}
                            onStatusChange={(t, subId, status) => handleSubTaskStatusDirectUpdate(t, String(subId), status)}
                            onStart={(t, s) => handleSubTaskStatusDirectUpdate(t, String(s.id), "in_progress")}
                            onStop={(t, s) => handleSubTaskStatusDirectUpdate(t, String(s.id), "pending")}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>


              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Create / Edit Project */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-2xl w-[94vw] max-h-[90vh] flex flex-col p-0 overflow-hidden shadow-2xl border">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0 bg-background/95 backdrop-blur-xs">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              <span>{editingTask ? "Edit Project" : "Create Project"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Provide project details, ownership, timeline, budget currency, project leader, and agreement document.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMainTask} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {/* Organization / Institution Selection (if multiple) */}
              {!isInstitutionAdmin && (
                <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-primary" />
                      Organization / Institution *
                    </Label>
                    <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {isPlatformRoute ? "EduBird Platform" : "Staff Dedicated to Organization"}
                    </span>
                  </div>
                  {isPlatformRoute ? (
                    <div className="flex items-center justify-between h-9 px-3 text-xs rounded-md border border-input bg-background/80 shadow-xs">
                      <span className="font-semibold text-foreground truncate flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        EduBird Organization
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30 font-medium">
                        EduBird Staff Only
                      </Badge>
                    </div>
                  ) : institutions.length > 1 ? (
                    <select
                      value={formInstitutionId}
                      onChange={(e) => handleFormInstitutionChange(e.target.value)}
                      className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring font-medium text-foreground cursor-pointer"
                    >
                      {institutions.map((inst) => (
                        <option key={inst.id} value={String(inst.id)}>
                          {inst.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center justify-between h-9 px-3 text-xs rounded-md border border-input bg-background/80">
                      <span className="font-semibold text-foreground truncate">
                        {activeInstitution?.name || institutions[0]?.name || "My Organization"}
                      </span>
                      <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                        Active Organization
                      </Badge>
                    </div>
                  )}
                </div>
              )}

              {/* Project Name */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Project Name *</Label>
                <Input
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. EduBird LMS Portal Redesign, Enterprise Cloud Migration"
                  className="text-xs h-9"
                />
              </div>

              {/* Project Type & Pipeline Template Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border bg-muted/20">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <FolderKanban className="w-3.5 h-3.5 text-primary" />
                      Project Type
                    </Label>
                    <Link
                      href="/admin/operations/project-types"
                      target="_blank"
                      className="text-[10px] text-primary hover:underline font-medium"
                    >
                      Manage Types
                    </Link>
                  </div>
                  <select
                    value={formProjectTypeId}
                    onChange={(e) => handleSelectProjectType(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring font-medium text-foreground cursor-pointer"
                  >
                    <option value="none">-- Select Project Type --</option>
                    {projectTypesList.map((pt) => (
                      <option key={pt.id} value={String(pt.id)}>
                        {pt.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold flex items-center gap-1.5">
                      <GitFork className="w-3.5 h-3.5 text-primary" />
                      Pipeline Template
                    </Label>
                    <Link
                      href="/admin/operations/project-pipelines"
                      target="_blank"
                      className="text-[10px] text-primary hover:underline font-medium"
                    >
                      Manage Pipelines
                    </Link>
                  </div>
                  <select
                    value={formPipelineId}
                    disabled={formProjectTypeId === "none" || availablePipelines.length === 0}
                    onChange={(e) => handleSelectPipeline(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring font-medium text-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="none">
                      {formProjectTypeId === "none"
                        ? "-- Select Project Type First --"
                        : availablePipelines.length === 0
                          ? "-- No Active Pipelines for this Type --"
                          : "-- Select Pipeline Template --"}
                    </option>
                    {availablePipelines.map((pl) => (
                      <option key={pl.id} value={String(pl.id)}>
                        {pl.name} {pl.is_default ? "★ (Default)" : ""} ({Array.isArray(pl.phases) ? pl.phases.length : 0} phases)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Pipeline Phases Preview */}
                {formPipelinePhases.length > 0 && (
                  <div className="sm:col-span-2 space-y-1.5 pt-1 border-t mt-1">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground flex items-center gap-1">
                        <Layers className="w-3 h-3 text-primary" />
                        Pipeline Snapshot: {formPipelinePhases.length} Phases
                      </span>
                      <span className="font-mono text-[10px]">
                        Total Est: {formPipelinePhases.reduce((acc, p) => acc + (parseFloat(String(p.estimated_duration_hours || 0)) || 0), 0)}h
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1 no-scrollbar">
                      {formPipelinePhases.map((ph, idx) => (
                        <div
                          key={ph.id || idx}
                          className="flex items-center gap-1 text-[10px] bg-background border px-2 py-1 rounded-md shrink-0 shadow-2xs"
                        >
                          <span className="font-mono font-bold text-primary">{idx + 1}.</span>
                          <span className="font-medium text-foreground max-w-[120px] truncate" title={ph.name}>
                            {ph.name}
                          </span>
                          {ph.requires_approval && (
                            <span className="text-[9px] text-amber-600 bg-amber-500/15 px-1 rounded font-semibold">
                              Approval
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Ownership: For Own Company or Client */}
              <div className="space-y-2 p-3 rounded-xl border bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    Project For *
                  </Label>
                  <span className="text-[10px] text-muted-foreground font-medium">Select internal company or sales client</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormProjectFor("own_company");
                      setFormCompanyName("EduBird");
                      setFormClientName("EduBird");
                      setFormClientId("none");
                      setFormAssignedClientIds([]);
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${formProjectFor === "own_company"
                      ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40 text-foreground font-semibold"
                      : "bg-background hover:bg-muted/40 border-border text-muted-foreground"
                      }`}
                  >
                    <Building2 className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-foreground">Own Company (EduBird)</div>
                      <div className="text-[10px] text-muted-foreground">Assign for EduBird platform</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFormProjectFor("client");
                      setFormCompanyName("");
                      if (formClientName === "EduBird") {
                        setFormClientName("");
                        setFormClientId("none");
                      }
                      void fetchClientsForModal();
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all cursor-pointer ${formProjectFor === "client"
                      ? "bg-primary/10 border-primary shadow-xs ring-1 ring-primary/40 text-foreground font-semibold"
                      : "bg-background hover:bg-muted/40 border-border text-muted-foreground"
                      }`}
                  >
                    <Users className="w-4 h-4 text-primary shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-foreground">Client</div>
                      <div className="text-[10px] text-muted-foreground">Select from sales client section</div>
                    </div>
                  </button>
                </div>

                {formProjectFor === "own_company" ? (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-primary font-medium">
                    <Building2 className="w-4 h-4 shrink-0" />
                    <span>This project will be assigned for internal company: <strong>EduBird</strong></span>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-primary" />
                        Client Name (From Sales Client Section) <span className="text-destructive">*</span>
                        {formAssignedClientIds.length > 0 && (
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold">
                            {formAssignedClientIds.length} Selected
                          </Badge>
                        )}
                      </Label>
                      <div className="flex items-center gap-2">
                        <a
                          href={addClientUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1 bg-primary/10 hover:bg-primary/20 transition-colors px-2 py-0.5 rounded-full"
                          title="Open clients directory to add a new client record"
                        >
                          <Plus className="w-3 h-3" /> Add Client
                        </a>
                        {formAssignedClientIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => {
                              setFormAssignedClientIds([]);
                              setFormClientId("none");
                              setFormClientName("");
                              setClientSearchQuery("");
                            }}
                            className="text-[10px] text-muted-foreground hover:text-destructive transition-colors font-medium underline cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Multi-Client Searchable Picker Trigger */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (!clientDropdownOpen) {
                            void fetchClientsForModal();
                          }
                          setClientDropdownOpen(!clientDropdownOpen);
                        }}
                        className="w-full flex items-center justify-between h-9 px-3 py-1.5 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                      >
                        <span className="flex items-center gap-2 min-w-0 flex-1 truncate">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className={`truncate text-left ${formAssignedClientIds.length === 0 ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                            {formAssignedClientIds.length === 0
                              ? "-- Select Client Account (Searchable) --"
                              : formAssignedClientIds.length === 1
                                ? (() => {
                                  const c = clients.find((cl) => String(cl.id) === formAssignedClientIds[0]);
                                  return c ? `${c.company_name || c.name} (${c.client_type || "Client"})` : (formClientName || "1 client selected");
                                })()
                                : `${formAssignedClientIds.length} clients selected`}
                          </span>
                        </span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${clientDropdownOpen ? "rotate-180" : ""}`} />
                      </button>

                      {clientDropdownOpen && (
                        <div className="mt-1.5 p-2 rounded-xl border bg-popover text-popover-foreground shadow-lg space-y-2 z-50">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                            <Input
                              value={clientSearchQuery}
                              onChange={(e) => setClientSearchQuery(e.target.value)}
                              placeholder="Search clients by name, company, or type..."
                              className="pl-8 text-xs h-8"
                              autoFocus
                            />
                          </div>

                          <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground border-b pb-1.5">
                            <span>
                              Showing {filteredClientList.length} client{filteredClientList.length === 1 ? "" : "s"}
                            </span>
                            <div className="flex items-center gap-2">
                              {filteredClientList.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const allIds = Array.from(new Set([...formAssignedClientIds, ...filteredClientList.map((c) => String(c.id))]));
                                    setFormAssignedClientIds(allIds);
                                    if (allIds.length > 0) {
                                      setFormClientId(String(allIds[0]));
                                      const primaryC = clients.find((c) => String(c.id) === String(allIds[0]));
                                      if (primaryC) setFormClientName(primaryC.company_name || primaryC.name);
                                    }
                                  }}
                                  className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                                >
                                  Select All
                                </button>
                              )}
                              {formAssignedClientIds.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFormAssignedClientIds([]);
                                    setFormClientId("none");
                                    setFormClientName("");
                                  }}
                                  className="text-[10px] text-muted-foreground hover:underline cursor-pointer"
                                >
                                  Clear
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                            {filteredClientList.length === 0 ? (
                              <div className="py-4 text-center text-xs text-muted-foreground">
                                No clients found matching &quot;{clientSearchQuery}&quot;
                              </div>
                            ) : (
                              filteredClientList.map((c) => {
                                const isChecked = formAssignedClientIds.includes(String(c.id));
                                return (
                                  <div
                                    key={c.id}
                                    onClick={() => {
                                      if (isChecked) {
                                        const newIds = formAssignedClientIds.filter((id) => id !== String(c.id));
                                        setFormAssignedClientIds(newIds);
                                        if (newIds.length === 0) {
                                          setFormClientId("none");
                                          setFormClientName("");
                                        } else {
                                          setFormClientId(String(newIds[0]));
                                          const primaryC = clients.find((cl) => String(cl.id) === String(newIds[0]));
                                          if (primaryC) setFormClientName(primaryC.company_name || primaryC.name);
                                        }
                                      } else {
                                        const newIds = [...formAssignedClientIds, String(c.id)];
                                        setFormAssignedClientIds(newIds);
                                        setFormClientId(String(newIds[0]));
                                        setFormClientName(c.company_name || c.name);
                                      }
                                    }}
                                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${isChecked
                                      ? "bg-primary/10 text-primary font-bold"
                                      : "hover:bg-muted"
                                      }`}
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Checkbox
                                        checked={isChecked}
                                        onCheckedChange={() => { }}
                                        className="h-3.5 w-3.5"
                                      />
                                      <Building2 className={`w-3.5 h-3.5 shrink-0 ${isChecked ? "text-primary" : "text-muted-foreground"}`} />
                                      <div className="min-w-0">
                                        <span className="font-semibold text-foreground truncate block">
                                          {c.company_name || c.name}
                                        </span>
                                        {c.company_name && c.name && c.company_name !== c.name && (
                                          <span className="text-[10px] text-muted-foreground truncate block font-normal">
                                            {c.name}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5 shrink-0 bg-background/50 capitalize ml-2">
                                      {c.client_type || "Client"}
                                    </Badge>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Selected Clients Badges / Chips */}
                    {formAssignedClientIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {clients
                          .filter((c) => formAssignedClientIds.includes(String(c.id)))
                          .map((c) => (
                            <Badge
                              key={c.id}
                              variant="secondary"
                              className="text-[11px] py-1 pl-2 pr-1.5 gap-1.5 font-medium bg-muted/60 hover:bg-muted"
                            >
                              <Building2 className="w-3 h-3 text-primary" />
                              <span className="truncate max-w-[150px]">{c.company_name || c.name}</span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const newIds = formAssignedClientIds.filter((id) => id !== String(c.id));
                                  setFormAssignedClientIds(newIds);
                                  if (newIds.length === 0) {
                                    setFormClientId("none");
                                    setFormClientName("");
                                  } else {
                                    setFormClientId(String(newIds[0]));
                                    const primaryC = clients.find((cl) => String(cl.id) === String(newIds[0]));
                                    if (primaryC) setFormClientName(primaryC.company_name || primaryC.name);
                                  }
                                }}
                                className="hover:bg-muted-foreground/20 rounded-full p-0.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Timeline: Start Date and Due Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    Start Date
                  </Label>
                  <Input
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="text-xs h-9 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-rose-600" />
                    Due Date / Deadline
                  </Label>
                  <Input
                    type="date"
                    value={formDueDate}
                    onChange={(e) => setFormDueDate(e.target.value)}
                    className="text-xs h-9 bg-background"
                  />
                </div>
              </div>

              {/* Budget & Cost Section */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                    Currency
                  </Label>
                  <select
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring font-medium"
                  >
                    <option value="INR">INR (₹) - Indian Rupee</option>
                    <option value="USD">USD ($) - US Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="AED">AED (د.إ) - UAE Dirham</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5 text-emerald-600" />
                    Project Cost ({formCurrency === "INR" ? "₹" : formCurrency})
                  </Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formCost}
                    onChange={(e) => setFormCost(e.target.value)}
                    placeholder="0.00"
                    className="text-xs h-9 bg-background"
                  />
                </div>
              </div>

              {/* Live and Demo URLs */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-primary" />
                    Live Website / Portal URL
                  </Label>
                  <Input
                    type="url"
                    value={formLiveUrl}
                    onChange={(e) => setFormLiveUrl(e.target.value)}
                    placeholder="https://..."
                    className="text-xs h-9 bg-background"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                    Demo / Staging URL
                  </Label>
                  <Input
                    type="url"
                    value={formDemoUrl}
                    onChange={(e) => setFormDemoUrl(e.target.value)}
                    placeholder="https://staging..."
                    className="text-xs h-9 bg-background"
                  />
                </div>
              </div>

              {/* Agreement Document Upload */}
              <div className="space-y-2 p-3 rounded-xl border bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    Project Agreement / Contract Document
                  </Label>
                  {formAgreementDocUrl && (
                    <a
                      href={formAgreementDocUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline font-medium inline-flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> View Uploaded Agreement
                    </a>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".pdf,.doc,.docx,image/*"
                    onChange={handleAgreementFileUpload}
                    disabled={uploadingAgreement}
                    className="text-xs h-9 bg-background file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[11px] file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                  />
                  {uploadingAgreement && <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />}
                </div>
                {formAgreementDocName && (
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground bg-background px-2.5 py-1 rounded border">
                    <span className="truncate max-w-[400px]">📄 {formAgreementDocName}</span>
                    <button
                      type="button"
                      onClick={() => {
                        setFormAgreementDocUrl("");
                        setFormAgreementDocName("");
                      }}
                      className="text-destructive hover:underline text-[10px] ml-2"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Project Leader Assignment */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-primary" />
                  Project Leader (Responsible Owner)
                </Label>
                <select
                  value={formProjectLeaderId}
                  onChange={(e) => {
                    setFormProjectLeaderId(e.target.value);
                    const s = dialogStaffList.find((st) => String(st.id) === e.target.value);
                    setFormProjectLeaderName(s?.name || "");
                  }}
                  className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring font-medium"
                >
                  <option value="none">-- Select Project Leader (Optional) --</option>
                  {dialogStaffList.map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name} ({s.role || "Staff Member"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Team Members Multi-Select */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-primary" />
                    Assign Team Staff Members (Multiple)
                    {formAssignedStaffIds.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-bold">
                        {formAssignedStaffIds.length} Selected
                      </Badge>
                    )}
                  </Label>
                  <div className="flex items-center gap-2">
                    {formAssignedStaffIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormAssignedStaffIds([]);
                          setFormAssignedStaffId("none");
                          setFormAssignedStaffName("");
                          setFormAssignedStaffRole("");
                        }}
                        className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setStaffDropdownOpen(!staffDropdownOpen)}
                    className="w-full flex items-center justify-between p-2 rounded-xl border bg-background text-xs hover:border-primary/50 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                      <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className={`truncate text-left ${formAssignedStaffIds.length === 0 ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                        {formAssignedStaffIds.length === 0
                          ? "-- Select Staff Members (Searchable) --"
                          : formAssignedStaffIds.length === 1
                            ? (() => {
                              const s = dialogStaffList.find((st) => String(st.id) === formAssignedStaffIds[0]);
                              return s ? `${s.name} (${s.role || "Staff Member"})` : "1 staff member selected";
                            })()
                            : `${formAssignedStaffIds.length} staff members selected`}
                      </span>
                    </span>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${staffDropdownOpen ? "rotate-180" : ""}`} />
                  </button>

                  {staffDropdownOpen && (
                    <div className="mt-1.5 p-2 rounded-xl border bg-popover text-popover-foreground shadow-lg space-y-2 z-50">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
                        <Input
                          value={staffSearchQuery}
                          onChange={(e) => setStaffSearchQuery(e.target.value)}
                          placeholder="Search staff by name or role..."
                          className="pl-8 text-xs h-8"
                          autoFocus
                        />
                      </div>

                      <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground border-b pb-1.5">
                        <span>
                          Showing {filteredStaffList.length} staff member{filteredStaffList.length === 1 ? "" : "s"}
                        </span>
                        <div className="flex items-center gap-2">
                          {filteredStaffList.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const allIds = Array.from(new Set([...formAssignedStaffIds, ...filteredStaffList.map((s) => String(s.id))]));
                                setFormAssignedStaffIds(allIds);
                              }}
                              className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                            >
                              Select All
                            </button>
                          )}
                          {formAssignedStaffIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setFormAssignedStaffIds([])}
                              className="text-[10px] text-muted-foreground hover:underline cursor-pointer"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="max-h-48 overflow-y-auto space-y-0.5 pr-1">
                        {filteredStaffList.length === 0 ? (
                          <div className="py-4 text-center text-xs text-muted-foreground">
                            No staff found matching &quot;{staffSearchQuery}&quot;
                          </div>
                        ) : (
                          filteredStaffList.map((s) => {
                            const isChecked = formAssignedStaffIds.includes(String(s.id));
                            return (
                              <div
                                key={s.id}
                                onClick={() => {
                                  if (isChecked) {
                                    setFormAssignedStaffIds(formAssignedStaffIds.filter((id) => id !== String(s.id)));
                                  } else {
                                    setFormAssignedStaffIds([...formAssignedStaffIds, String(s.id)]);
                                  }
                                }}
                                className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${isChecked
                                  ? "bg-primary/10 text-primary font-bold"
                                  : "hover:bg-muted"
                                  }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={() => { }}
                                    className="h-3.5 w-3.5"
                                  />
                                  <User className={`w-3.5 h-3.5 shrink-0 ${isChecked ? "text-primary" : "text-muted-foreground"}`} />
                                  <span className="font-semibold text-foreground truncate block">
                                    {s.name}
                                  </span>
                                </div>
                                <Badge variant="outline" className="text-[10px] py-0 px-1.5 shrink-0 bg-background/50 capitalize ml-2">
                                  {s.role || "Staff Member"}
                                </Badge>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected Staff Chips */}
                {formAssignedStaffIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {dialogStaffList
                      .filter((s) => formAssignedStaffIds.includes(String(s.id)))
                      .map((s) => (
                        <Badge
                          key={s.id}
                          variant="secondary"
                          className="text-[11px] py-1 pl-2 pr-1.5 gap-1.5 font-medium bg-muted/60 hover:bg-muted"
                        >
                          <User className="w-3 h-3 text-primary" />
                          <span className="truncate max-w-[150px]">{s.name}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormAssignedStaffIds(formAssignedStaffIds.filter((id) => id !== String(s.id)));
                            }}
                            className="hover:bg-muted-foreground/20 rounded-full p-0.5 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                  </div>
                )}
              </div>

              {/* Project Scope / Description */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Project Scope & Deliverables (Optional)</Label>
                <Textarea
                  value={formDetails}
                  onChange={(e) => setFormDetails(e.target.value)}
                  placeholder="Describe project requirements, milestones, client specifications..."
                  className="text-xs min-h-[70px] resize-y"
                />
              </div>

              {/* Task Cadence / Frequency Selector */}
              {!isInstitutionAdmin && (
                <div className="space-y-2 p-3 rounded-xl border bg-muted/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      Project Cadence *
                    </Label>
                    <span className="text-[10px] text-muted-foreground font-medium">Daily vs One-Time</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormIsDailyRecurring(false)}
                      className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${!formIsDailyRecurring
                        ? "bg-background border-primary shadow-xs ring-1 ring-primary/40 text-foreground"
                        : "bg-card/60 hover:bg-background/80 border-border text-muted-foreground"
                        }`}
                    >
                      <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                        ⚡ Standard Project
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                        Deliverable workflow with milestones and sub-tasks.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormIsDailyRecurring(true)}
                      className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${formIsDailyRecurring
                        ? "bg-background border-primary shadow-xs ring-1 ring-primary/40 text-foreground"
                        : "bg-card/60 hover:bg-background/80 border-border text-muted-foreground"
                        }`}
                    >
                      <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                        🔁 Daily Recurring
                      </span>
                      <span className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                        Regenerates daily with routine checks.
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-3.5 border-t bg-muted/20 shrink-0">
              <ProgressiveSaveIndicator status={taskSaveStatus} />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTaskDialogOpen(false);
                    clearTaskDraft();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingTask || uploadingAgreement} className="bg-primary font-bold">
                  {savingTask && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingTask ? "Save Project Changes" : "Create Project & Continue to Sub-Tasks"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL: Phase Status & Details Modal */}
      <Dialog open={Boolean(phaseModalState)} onOpenChange={(open) => !open && setPhaseModalState(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Layers className="w-5 h-5 text-primary" />
              <span>Change Phase Status & Notes</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Project: <strong>{phaseModalState?.task.title}</strong>
              <span className="block text-[11px] text-muted-foreground mt-0.5">
                Phase #{Number(phaseModalState?.phaseIndex ?? 0) + 1}: {phaseModalState?.phase?.name}
              </span>
            </DialogDescription>
          </DialogHeader>

          {phaseModalState && (
            <div className="space-y-4 py-1 text-xs">
              {/* Selectable Phase Status Grid */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Phase Status</Label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {[
                    { id: "not_started", label: "Not Started", color: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/40 dark:text-slate-200" },
                    { id: "in_progress", label: "In Progress", color: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/40 dark:text-blue-200" },
                    { id: "under_review", label: "Under Review", color: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-200" },
                    { id: "completed", label: "Completed", color: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-200" },
                    { id: "on_hold", label: "On Hold", color: "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/40 dark:text-orange-200" },
                    { id: "failed", label: "Failed", color: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-900/40 dark:text-rose-200" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setPhaseModalStatus(s.id)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left font-semibold text-xs transition-all cursor-pointer ${
                        phaseModalStatus === s.id
                          ? `${s.color} ring-2 ring-primary shadow-xs font-bold`
                          : "bg-background border-border text-muted-foreground hover:bg-muted/40"
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${phaseModalStatus === s.id ? "bg-primary" : "bg-muted-foreground/40"}`} />
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Phase Notes & Updates */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-foreground">Phase Deliverables & Notes</Label>
                <Textarea
                  value={phaseModalNotes}
                  onChange={(e) => setPhaseModalNotes(e.target.value)}
                  placeholder="Record deliverable status, client approvals, or instructions for this phase..."
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>

              {/* Advance Next Phase Toggle */}
              {phaseModalStatus === "completed" && (
                <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer bg-muted/30 p-2.5 rounded-lg border">
                  <input
                    type="checkbox"
                    checked={phaseModalAdvanceNext}
                    onChange={(e) => setPhaseModalAdvanceNext(e.target.checked)}
                    className="rounded border-input text-primary h-4 w-4"
                  />
                  <span>Automatically advance project to next phase</span>
                </label>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPhaseModalState(null)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={savingPhaseModal}
              onClick={async () => {
                if (!phaseModalState) return;
                setSavingPhaseModal(true);
                await handleUpdateProjectPhase(
                  phaseModalState.task,
                  phaseModalState.phaseIndex,
                  phaseModalStatus,
                  phaseModalStatus === "completed" && phaseModalAdvanceNext,
                  phaseModalNotes
                );
                setSavingPhaseModal(false);
                setPhaseModalState(null);
              }}
              className="bg-primary text-primary-foreground font-semibold cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 mr-1" /> Save Phase Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL: Assign Pipeline Workflow to Existing Project */}
      <Dialog open={Boolean(attachPipelineTask)} onOpenChange={(open) => !open && setAttachPipelineTask(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <GitFork className="w-5 h-5 text-primary" />
              <span>Assign Pipeline Workflow</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Project: <strong>{attachPipelineTask?.title}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Select Project Type</Label>
              <select
                value={attachTypeId}
                onChange={async (e) => {
                  const tId = e.target.value;
                  setAttachTypeId(tId);
                  if (tId === "none") {
                    setAttachPipelineId("none");
                    setAttachAvailablePipelines([]);
                    return;
                  }
                  try {
                    const res = await fetch(`/api/admin/operations/project-pipelines?project_type_id=${tId}&status=active`);
                    if (res.ok) {
                      const data = await res.json();
                      const pls = data.pipelines || [];
                      setAttachAvailablePipelines(pls);
                      const def = pls.find((p: any) => p.is_default) || pls[0];
                      if (def) setAttachPipelineId(String(def.id));
                    }
                  } catch (err) {
                    console.error("Error loading pipelines:", err);
                  }
                }}
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-medium cursor-pointer"
              >
                <option value="none">-- Select Project Type --</option>
                {projectTypesList.map((pt) => (
                  <option key={pt.id} value={String(pt.id)}>
                    {pt.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold">Select Pipeline Template</Label>
              <select
                value={attachPipelineId}
                disabled={attachTypeId === "none" || attachAvailablePipelines.length === 0}
                onChange={(e) => setAttachPipelineId(e.target.value)}
                className="w-full h-9 px-3 text-xs rounded-md border border-input bg-background font-medium cursor-pointer disabled:opacity-50"
              >
                <option value="none">
                  {attachTypeId === "none"
                    ? "-- Select Project Type First --"
                    : attachAvailablePipelines.length === 0
                    ? "-- No active pipelines --"
                    : "-- Select Pipeline Template --"}
                </option>
                {attachAvailablePipelines.map((pl) => (
                  <option key={pl.id} value={String(pl.id)}>
                    {pl.name} {pl.is_default ? "★ (Default)" : ""} ({Array.isArray(pl.phases) ? pl.phases.length : 0} phases)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAttachPipelineTask(null)}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={savingAttachPipeline || attachPipelineId === "none"}
              onClick={async () => {
                if (!attachPipelineTask || attachPipelineId === "none") return;
                setSavingAttachPipeline(true);
                try {
                  const selType = projectTypesList.find((p) => String(p.id) === String(attachTypeId));
                  const selPl = attachAvailablePipelines.find((p) => String(p.id) === String(attachPipelineId));
                  const plPhases = Array.isArray(selPl?.phases) ? selPl.phases : [];

                  const headers: Record<string, string> = { "Content-Type": "application/json" };
                  if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

                  const res = await fetch("/api/admin/operations/tasks", {
                    method: "PUT",
                    headers,
                    body: JSON.stringify({
                      id: attachPipelineTask.id,
                      title: attachPipelineTask.title,
                      project_type_id: selType?.id || null,
                      project_type_name: selType?.name || null,
                      pipeline_id: selPl?.id || null,
                      pipeline_name: selPl?.name || null,
                      pipeline_phases: plPhases.map((ph: any, i: number) => ({
                        ...ph,
                        order: ph.order || i + 1,
                        status: i === 0 ? "in_progress" : "not_started",
                        started_at: i === 0 ? new Date().toISOString() : null,
                        completed_at: null,
                      })),
                      current_phase_index: 0,
                    }),
                  });

                  const resData = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(resData.error || "Failed to assign pipeline");
                  toast.success(`Pipeline "${selPl?.name}" assigned to project!`);
                  setAttachPipelineTask(null);
                  await fetchTasks();
                } catch (err: any) {
                  toast.error(err.message || "Failed to assign pipeline");
                } finally {
                  setSavingAttachPipeline(false);
                }
              }}
              className="bg-primary text-primary-foreground font-semibold cursor-pointer"
            >
              {savingAttachPipeline ? "Assigning..." : "Assign Pipeline"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unified Sub-Tasks Add & Edit Dialog */}
      <SubtaskModalDialog
        open={subtaskModalOpen}
        onOpenChange={(open) => {
          setSubtaskModalOpen(open);
          if (!open) {
            setEditingSubtaskObject(null);
          }
        }}
        task={selectedTaskForSubtasks}
        editingSubtask={editingSubtaskObject}
        staffOptions={subtaskAssigneeOptions}
        isStaffViewer={isStaffViewer}
        onSaved={fetchTasks}
        onOpenHistory={(t, s) => {
          setHistoryModalSubtask(s || null);
          setHistoryModalTask(t);
        }}
      />

      {/* Modal 3: Submit Task Under Review Dialog (Optional Text & Image) */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-lg w-[92vw] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-amber-500" />
              <span>Submit Task for Review & Approval</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              You are marking &quot;{reviewModalTask?.title}&quot; as Under Review. You can optionally submit notes or attach a screenshot/proof image for administrators to inspect. Both fields are optional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Optional Notes */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span>Deliverable Summary / Review Notes</span>
                <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
              </Label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="e.g. Completed module setup, verified all 50 accounts. Deliverable link: https://..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            {/* Optional Image Proof */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-primary" />
                  Proof Screenshot / Attachment
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
              </Label>

              {reviewImageUrl ? (
                <div className="relative rounded-xl border p-2.5 bg-muted/20 flex items-center gap-3">
                  <img
                    src={reviewImageUrl}
                    alt="Proof preview"
                    className="w-20 h-16 object-cover rounded-lg border shadow-xs"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">
                      Image proof attached
                    </p>
                    <a
                      href={reviewImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-primary hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <ExternalLink className="w-3 h-3" /> View image preview
                    </a>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setReviewImageUrl("")}
                    className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="flex flex-col items-center justify-center border-2 border-dashed border-border/80 hover:border-primary/60 rounded-xl p-4 cursor-pointer bg-muted/10 hover:bg-muted/30 transition-all text-center">
                    <UploadCloud className="w-6 h-6 text-muted-foreground mb-1" />
                    <span className="text-xs font-bold text-foreground">
                      {uploadingReviewImage ? "Uploading..." : "Upload Screenshot / Proof Image"}
                    </span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">
                      PNG, JPG, or WEBP up to 5MB (Optional)
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadReviewFile}
                      disabled={uploadingReviewImage}
                      className="hidden"
                    />
                  </label>

                  <div className="flex items-center gap-2">
                    <div className="h-px bg-border flex-1" />
                    <span className="text-[10px] text-muted-foreground uppercase">or paste image URL</span>
                    <div className="h-px bg-border flex-1" />
                  </div>

                  <Input
                    type="url"
                    value={reviewImageUrl}
                    onChange={(e) => setReviewImageUrl(e.target.value)}
                    placeholder="https://example.com/screenshot.png"
                    className="text-xs h-8"
                  />
                </div>
              )}
            </div>

            <DialogFooter className="flex items-center justify-between gap-2 pt-3 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setReviewModalOpen(false);
                  setReviewModalTask(null);
                  setReviewNotes("");
                  setReviewImageUrl("");
                }}
                disabled={submittingReview}
                className="text-xs"
              >
                Cancel
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => handleSubmitUnderReview(true)}
                  disabled={submittingReview}
                  className="text-xs font-medium text-muted-foreground hover:text-foreground"
                >
                  Skip & Submit
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSubmitUnderReview(false)}
                  disabled={submittingReview || uploadingReviewImage}
                  className="text-xs bg-primary font-bold gap-1"
                >
                  {submittingReview ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Submit for Review
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════════════════════════════════
          MODAL 4: Adjust Score — Manual Bonus / Penalty (Admin Only)
      ════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={adjustScoreModalOpen} onOpenChange={setAdjustScoreModalOpen}>
        <DialogContent className="sm:max-w-2xl w-[94vw] max-h-[92vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              <span>Adjust Score — Bonus / Penalty</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manually apply a bonus reward or penalty deduction to a staff member for task{" "}
              <strong className="text-foreground">#{adjustScoreTask?.id}: {adjustScoreTask?.title}</strong>.
              This is recorded in the performance ledger.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 pt-2">
            {/* ── Type Toggle ── */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAdjustType("bonus")}
                className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 transition-all ${adjustType === "bonus"
                  ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                  : "border-border bg-card/60 hover:bg-muted/40"
                  }`}
              >
                <PlusCircle className={`w-7 h-7 ${adjustType === "bonus" ? "text-emerald-600" : "text-muted-foreground"
                  }`} />
                <span className={`text-sm font-bold ${adjustType === "bonus" ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"
                  }`}>Bonus (+)</span>
                <span className="text-[10px] text-muted-foreground text-center leading-snug">
                  Reward for great work, extra effort, or client appreciation
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAdjustType("penalty")}
                className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 transition-all ${adjustType === "penalty"
                  ? "border-rose-500 bg-rose-500/10 shadow-sm"
                  : "border-border bg-card/60 hover:bg-muted/40"
                  }`}
              >
                <MinusCircle className={`w-7 h-7 ${adjustType === "penalty" ? "text-rose-600" : "text-muted-foreground"
                  }`} />
                <span className={`text-sm font-bold ${adjustType === "penalty" ? "text-rose-700 dark:text-rose-300" : "text-muted-foreground"
                  }`}>Penalty (-)</span>
                <span className="text-[10px] text-muted-foreground text-center leading-snug">
                  Deduction for delay, missed deadline, or quality issue
                </span>
              </button>
            </div>

            {/* ── Employee Picker ── */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                Apply to Staff Member
              </Label>
              <select
                value={adjustEmployeeId}
                onChange={(e) => {
                  const val = e.target.value;
                  setAdjustEmployeeId(val);
                  if (val === "none") {
                    setAdjustEmployeeName("");
                  } else {
                    const s = uniqueStaffList.find((st) => String(st.id) === val);
                    setAdjustEmployeeName(s?.name || "");
                  }
                }}
                className="w-full h-9 text-xs bg-background rounded-md border border-input px-3 font-medium outline-none focus:ring-1 focus:ring-ring cursor-pointer text-foreground"
              >
                <option value="none">-- Select Staff Member --</option>
                {adjustScoreTask?.assigned_employee_id && (
                  <option value={String(adjustScoreTask.assigned_employee_id)}>
                    ★ {adjustScoreTask.assigned_employee_name} (Assigned)
                  </option>
                )}
                {uniqueStaffList
                  .filter((s) => s.id !== adjustScoreTask?.assigned_employee_id)
                  .map((s) => (
                    <option key={s.id} value={String(s.id)}>
                      {s.name} ({s.role})
                    </option>
                  ))}
              </select>
            </div>

            {/* ── Points & Reason ── */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  {adjustType === "bonus" ? "Bonus Points" : "Penalty Points"}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    value={adjustPoints}
                    onChange={(e) => setAdjustPoints(e.target.value)}
                    placeholder="e.g. 10"
                    className={`text-sm h-10 font-mono pr-14 ${adjustType === "bonus" ? "text-emerald-700" : "text-rose-600"
                      }`}
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${adjustType === "bonus" ? "text-emerald-600" : "text-rose-600"
                    }`}>
                    {adjustType === "bonus" ? "+PTS" : "-PTS"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Quick Presets</Label>
                <div className="flex flex-wrap gap-1.5">
                  {[5, 10, 15, 25, 50].map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setAdjustPoints(String(p))}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${adjustPoints === String(p)
                        ? adjustType === "bonus"
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-rose-500 text-white border-rose-500"
                        : "bg-muted border-border text-muted-foreground hover:bg-muted/80"
                        }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Reason / Note *</Label>
              <textarea
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder={
                  adjustType === "bonus"
                    ? "e.g. Excellent client communication, delivered ahead of schedule, extra initiative taken..."
                    : "e.g. 2-day deadline miss without notice, incomplete deliverable, client complaint received..."
                }
                rows={3}
                className="w-full text-xs rounded-xl border px-3 py-2.5 bg-background resize-none outline-none focus:ring-2 ring-primary/30 transition"
              />
            </div>

            {/* ── Live Preview ── */}
            <div className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border-2 ${adjustType === "bonus"
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-rose-500/40 bg-rose-500/5"
              }`}>
              <div className="flex items-center gap-2">
                {adjustType === "bonus" ? (
                  <PlusCircle className="w-5 h-5 text-emerald-600" />
                ) : (
                  <MinusCircle className="w-5 h-5 text-rose-600" />
                )}
                <div>
                  <p className="text-xs font-bold text-foreground">
                    {adjustEmployeeName || "Selected Staff"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {adjustReason.trim() || "No reason entered yet"}
                  </p>
                </div>
              </div>
              <span className={`text-2xl font-black font-mono ${adjustType === "bonus" ? "text-emerald-600" : "text-rose-600"
                }`}>
                {adjustType === "bonus" ? "+" : "-"}{adjustPoints || "0"} pts
              </span>
            </div>

            {/* ── Action Buttons ── */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdjustScoreModalOpen(false)}
              >
                Close
              </Button>
              <Button
                type="button"
                onClick={handleSaveAdjustment}
                disabled={savingAdjustment || adjustEmployeeId === "none"}
                className={`font-bold gap-1.5 ${adjustType === "bonus"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-rose-600 hover:bg-rose-700 text-white"
                  }`}
              >
                {savingAdjustment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : adjustType === "bonus" ? (
                  <PlusCircle className="w-4 h-4" />
                ) : (
                  <MinusCircle className="w-4 h-4" />
                )}
                Apply {adjustType === "bonus" ? "Bonus" : "Penalty"}
              </Button>
            </div>

            {/* ── Adjustment History ── */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <TrendingDown className="w-3.5 h-3.5 text-primary" />
                  Adjustment History ({adjustHistory.length})
                </Label>
                {adjustHistorySummary && adjustHistory.length > 0 && (
                  <div className="flex items-center gap-3 text-[11px] font-mono">
                    <span className="text-emerald-600 font-bold">+{adjustHistorySummary.total_bonus} bonus</span>
                    <span className="text-rose-600 font-bold">-{adjustHistorySummary.total_penalty} penalty</span>
                    <span className={`font-black ${adjustHistorySummary.net >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}>
                      Net: {adjustHistorySummary.net >= 0 ? "+" : ""}{adjustHistorySummary.net}
                    </span>
                  </div>
                )}
              </div>

              {loadingAdjustHistory ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                </div>
              ) : adjustHistory.length === 0 ? (
                <div className="text-center py-6 border border-dashed rounded-xl text-xs text-muted-foreground bg-muted/10">
                  No manual adjustments have been applied to this task yet.
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {adjustHistory.map((adj: any) => (
                    <div
                      key={adj.id}
                      className={`flex items-start justify-between gap-3 p-3 rounded-xl border text-xs ${adj.adjustment_type === "bonus"
                        ? "bg-emerald-500/5 border-emerald-500/20"
                        : "bg-rose-500/5 border-rose-500/20"
                        }`}
                    >
                      <div className="flex items-start gap-2 min-w-0">
                        {adj.adjustment_type === "bonus" ? (
                          <PlusCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                        ) : (
                          <MinusCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">{adj.employee_name || `Employee #${adj.employee_id}`}</p>
                          <p className="text-muted-foreground leading-snug">{adj.reason}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            By {adj.created_by_name} • {new Date(adj.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-sm font-black font-mono ${adj.adjustment_type === "bonus" ? "text-emerald-600" : "text-rose-600"
                          }`}>
                          {adj.adjustment_type === "bonus" ? "+" : "-"}{adj.points}
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteAdjustment(adj.id)}
                          className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Remove adjustment"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task History & Geolocation Audit Trail Dialog */}
      <TaskHistoryDialog
        open={Boolean(historyModalTask)}
        onOpenChange={(open) => {
          if (!open) {
            setHistoryModalTask(null);
            setHistoryModalSubtask(null);
          }
        }}
        task={historyModalTask}
        filterSubtaskId={historyModalSubtask?.id}
        filterSubtaskTitle={historyModalSubtask?.title}
      />

      {/* Sub-Task Upload Dialog (Deliverables & Files) */}
      <SubTaskUploadDialog
        open={Boolean(uploadModalState)}
        onOpenChange={(open) => !open && setUploadModalState(null)}
        task={uploadModalState?.task || null}
        subtask={uploadModalState?.subtask || null}
        onSaved={fetchTasks}
      />

      {/* Project Invoices Dialog */}
      <ProjectInvoicesDialog
        open={Boolean(invoicesModalTask)}
        onOpenChange={(open) => !open && setInvoicesModalTask(null)}
        task={invoicesModalTask}
        onSaved={fetchTasks}
      />
    </div>
  );
}
