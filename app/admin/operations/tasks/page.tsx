"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import {
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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

export type TaskStatus = "pending" | "in_progress" | "under_review" | "recheck" | "completed" | "cancelled";

export type SubTask = {
  id: string;
  title: string;
  price: number; // Task Cost / Price (₹)
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
  urgency: "low" | "medium" | "high" | "urgent";
  status: TaskStatus;
  notes?: string | null;
};

export type OperationTask = {
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
  { id: "all", label: "All Tasks" },
  { id: "pending", label: "Pending", badgeColor: "bg-slate-100 text-slate-700 border-slate-300" },
  { id: "in_progress", label: "In Progress", badgeColor: "bg-blue-100 text-blue-800 border-blue-300" },
  { id: "under_review", label: "Under Review", badgeColor: "bg-amber-100 text-amber-800 border-amber-300" },
  { id: "recheck", label: "Needs Recheck", badgeColor: "bg-rose-100 text-rose-800 border-rose-300" },
  { id: "completed", label: "Completed", badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  { id: "cancelled", label: "Cancelled", badgeColor: "bg-zinc-100 text-zinc-800 border-zinc-300" },
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
  const [orgFilter, setOrgFilter] = useState<string>("all");
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

  const isStaffRole = useMemo(() => {
    if (!user) return false;
    const codes = (user as any)?.role_codes || [(user as any)?.role || (user as any)?.primary_role || ""];
    const isOwnerOrAdmin = codes.some((r: string) =>
      ["platform_admin", "super_admin", "institution_admin", "school_owner", "college_owner", "university_owner"].includes(r)
    );
    return !isOwnerOrAdmin;
  }, [user]);

  const isStaffViewer = useMemo(() => {
    return isStaffRole || Boolean(pathname?.startsWith("/staff"));
  }, [isStaffRole, pathname]);

  const formatPriceDisplay = useCallback((price: number | string | null | undefined) => {
    if (isStaffViewer) return "★★★★★";
    const num = typeof price === "number" ? price : parseFloat(String(price || 0));
    return `₹${num.toLocaleString("en-IN")}`;
  }, [isStaffViewer]);

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
  const [selectedStatusTab, setSelectedStatusTab] = useState<string>("all");

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
  const [clientSearchQuery, setClientSearchQuery] = useState("");
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);
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
      if (instId && instId !== "none" && instId !== "all") {
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
  }, [accessToken]);

  const selectedOrgName = useMemo(() => {
    if (formInstitutionId === "none") return "Platform Staff";
    const found = institutions.find((i) => String(i.id) === formInstitutionId);
    if (found) return found.name;
    if (activeInstitution && String(activeInstitution.id) === formInstitutionId) return activeInstitution.name;
    return "Selected Organization";
  }, [formInstitutionId, institutions, activeInstitution]);

  const dialogStaffList = useMemo(() => {
    const list = modalOrgStaffList.length > 0
      ? modalOrgStaffList
      : (formInstitutionId !== "none" ? staffList : []);
    const seen = new Set<number>();
    return list.filter((s) => {
      if (!s.id || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [modalOrgStaffList, formInstitutionId, staffList]);

  const addClientUrl = useMemo(() => {
    if (pathname?.startsWith("/platformadmin")) return "/platformadmin/sales/clients";
    if (pathname?.startsWith("/instituteadmin")) return "/instituteadmin/sales/clients";
    return "/admin/sales/clients";
  }, [pathname]);

  const filteredClientList = useMemo(() => {
    if (!clientSearchQuery.trim()) return clients;
    const q = clientSearchQuery.toLowerCase();
    return clients.filter((c) => {
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
  const [activeSubTasks, setActiveSubTasks] = useState<SubTask[]>([]);
  const [savingSubtasks, setSavingSubtasks] = useState(false);

  // When a main task is created/assigned with specific members, only those members appear in subtasks
  const subtaskAssigneeOptions = useMemo(() => {
    if (!selectedTaskForSubtasks) return uniqueModalStaffList;

    // 1. Check if the project has assigned employees array
    if (
      Array.isArray(selectedTaskForSubtasks.assigned_employees) &&
      selectedTaskForSubtasks.assigned_employees.length > 0
    ) {
      return selectedTaskForSubtasks.assigned_employees.map((emp) => ({
        id: emp.id,
        name: emp.name,
        role: emp.role || "Staff Member",
        email: emp.email || null,
      }));
    }

    // 2. Check if the project has a single assigned employee
    if (selectedTaskForSubtasks.assigned_employee_id) {
      return [
        {
          id: selectedTaskForSubtasks.assigned_employee_id,
          name: selectedTaskForSubtasks.assigned_employee_name || "Assigned Staff",
          role: selectedTaskForSubtasks.assigned_employee_role || "Staff Member",
          email: selectedTaskForSubtasks.assigned_employee_email || null,
        },
      ];
    }

    // 3. Fallback to all modal staff if project was left unassigned
    return uniqueModalStaffList;
  }, [selectedTaskForSubtasks, uniqueModalStaffList]);

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

  const fetchTasks = useCallback(async () => {
    const seq = ++fetchSeqRef.current;
    try {
      const isStaffRoute = Boolean(pathname?.startsWith("/staff"));
      const isStaffContext = isStaffRole || isStaffRoute;

      const params = new URLSearchParams();
      if (orgFilter && orgFilter !== "all") {
        params.set("institution_id", orgFilter);
      } else if (effectiveInstId) {
        params.set("institution_id", String(effectiveInstId));
      } else if (isPlatformRoute && orgFilter === "all") {
        params.set("institution_id", "all");
      }
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedStatusTab && selectedStatusTab !== "all") params.set("status", selectedStatusTab);
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
  }, [effectiveInstId, orgFilter, searchQuery, selectedStatusTab, urgencyFilter, clientFilter, staffFilter, accessToken, pathname, isStaffRole, scopeFilter, isPlatformRoute]);

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
    setNewSubUrgency("medium");
    setNewSubStatus("pending");
  };

  // Step 1: Open Create Task Modal
  const handleOpenCreateTask = () => {
    setEditingTask(null);
    setFormTitle("");
    const initialInstId = (orgFilter && orgFilter !== "all" && orgFilter !== "none")
      ? orgFilter
      : (activeInstitutionId ? String(activeInstitutionId) : (institutions[0]?.id ? String(institutions[0].id) : "none"));
    setFormInstitutionId(initialInstId);
    void fetchStaffForModal(initialInstId);
    setFormClientId("none");
    setFormClientName("");
    setClientSearchQuery("");
    setClientDropdownOpen(false);
    setFormAssignedStaffId("none");
    setFormAssignedStaffName("");
    setFormAssignedStaffRole("");
    setFormAssignedStaffIds([]);
    setStaffSearchQuery("");
    setStaffDropdownOpen(false);
    setFormDetails("");
    setFormIsDailyRecurring(false);
    setFormPoints("20");
    setFormPenaltyPoints("10");
    setTaskDialogOpen(true);
  };

  // Open Edit Main Task
  const handleOpenEditTask = (t: OperationTask) => {
    setEditingTask(t);
    setFormTitle(t.title || "");
    const initialInstId = t.institution_id ? String(t.institution_id) : (activeInstitutionId ? String(activeInstitutionId) : "none");
    setFormInstitutionId(initialInstId);
    void fetchStaffForModal(initialInstId);
    setFormClientId(t.client_id ? String(t.client_id) : "none");
    setFormClientName(t.client_name || "");
    setClientSearchQuery("");
    setClientDropdownOpen(false);
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
    setFormDetails(t.details || "");
    setFormIsDailyRecurring(Boolean(t.is_daily_recurring));
    setFormPoints(t.points !== undefined ? String(t.points) : "20");
    setFormPenaltyPoints(t.penalty_points !== undefined ? String(t.penalty_points) : "10");
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
          institution_id: formInstitutionId !== "none" && formInstitutionId !== "all" ? parseInt(formInstitutionId) : null,
          client_id: formClientId !== "none" ? formClientId : null,
          client_name: formClientName.trim() || null,
          assigned_employees: selectedStaffObjects,
          assigned_employee_id: primaryStaffId,
          assigned_employee_name: combinedStaffNames,
          assigned_employee_role: combinedStaffRoles,
          details: formDetails.trim() || null,
          is_daily_recurring: formIsDailyRecurring,
          points: parseFloat(formPoints) || 20,
          penalty_points: parseFloat(formPenaltyPoints) || 10,
          sub_tasks: editingTask?.sub_tasks || [],
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
    setActiveSubTasks(Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : []);

    const projectMembers = Array.isArray(task.assigned_employees) && task.assigned_employees.length > 0
      ? task.assigned_employees
      : (task.assigned_employee_id ? [{ id: task.assigned_employee_id }] : []);
    const defaultStaff = projectMembers.length === 1 ? String(projectMembers[0].id) : "none";
    resetSubtaskDraft(defaultStaff);
    setSubtaskModalOpen(true);

    try {
      const params = new URLSearchParams();
      if (task.institution_id) {
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
    if (!newSubTitle.trim()) {
      toast.error("Please enter a sub-task deliverable name");
      return;
    }

    const assignedStaff = subtaskAssigneeOptions.find((s) => String(s.id) === newSubStaffId);

    const parsedHours = Math.max(0, parseInt(newSubDurationHours, 10) || 0);
    const parsedMins = Math.max(0, Math.min(59, parseInt(newSubDurationMinutes, 10) || 0));

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
      deadline_date: selectedTaskForSubtasks?.is_daily_recurring ? null : (newSubDeadlineDate || null),
      deadline_time: selectedTaskForSubtasks?.is_daily_recurring ? null : (newSubDeadlineNumber || "18:00"),
      urgency: newSubUrgency,
      status: newSubStatus,
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
      const currentUserId = Number(user.id);
      const currentUserEmail = (user.email || "").toLowerCase().trim();
      const currentUserName = (user.full_name || "").toLowerCase().trim();

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
    [user]
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

  const displayedTasks = useMemo(() => {
    const isStaffRoute = Boolean(pathname?.startsWith("/staff"));
    const isStaffContext = isStaffRole || isStaffRoute;

    let pool = (scopeFilter === "assigned_to_me" || isStaffContext)
      ? tasks.filter((t) => isTaskAssignedToMe(t))
      : tasks;

    // "once task will not apear once complete marked"
    // When viewing "All Tasks", hide completed Once tasks so only active tasks and daily tasks are displayed
    if (selectedStatusTab === "all") {
      pool = pool.filter((t) => !(t.status === "completed" && !t.is_daily_recurring));
    }

    return pool;
  }, [tasks, scopeFilter, selectedStatusTab, isTaskAssignedToMe, isStaffRole, pathname]);

  const myAssignedTasksCount = useMemo(() => {
    return tasks.filter((t) => isTaskAssignedToMe(t)).length;
  }, [tasks, isTaskAssignedToMe]);

  // Get task count for tab
  const getTabCount = (tabId: string) => {
    const pool = scopeFilter === "assigned_to_me" ? displayedTasks : tasks;
    if (tabId === "all") return pool.filter((t) => !(t.status === "completed" && !t.is_daily_recurring)).length;
    if (tabId === "pending") return pool.filter((t) => t.status === "pending").length;
    if (tabId === "in_progress") return pool.filter((t) => t.status === "in_progress").length;
    if (tabId === "under_review") return pool.filter((t) => t.status === "under_review").length;
    if (tabId === "recheck") return pool.filter((t) => t.status === "recheck").length;
    if (tabId === "completed") return pool.filter((t) => t.status === "completed").length;
    if (tabId === "cancelled") return pool.filter((t) => t.status === "cancelled").length;
    return 0;
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

        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={handleOpenCreateTask} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md gap-1.5 h-9">
            <Plus className="w-4 h-4" /> Create Task / Project
          </Button>
        </div>
      </div>

      {/* Scope Switcher: All Tasks vs Tasks Assigned to Me */}
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
                className={`h-8 text-xs font-bold gap-1.5 ${
                  scopeFilter === "assigned_to_me"
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" /> Assigned to Me
                <Badge
                  className={`ml-1 text-[10px] px-1.5 py-0 ${
                    scopeFilter === "assigned_to_me" ? "bg-white text-emerald-800" : "bg-emerald-600 text-white"
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
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? "bg-background text-foreground shadow-sm border border-border"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold ${
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
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

        {/* Organization Filter (Platform Admin or Multi-Institution) */}
        {(isPlatformRoute || institutions.length > 1) && (
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
              {isPlatformRoute && <option value="none">Platform Tasks (No Org)</option>}
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
        <div className="w-full sm:w-44">
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full h-10 text-xs bg-background rounded-xl border border-input px-3 font-medium outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer text-foreground"
          >
            <option value="all">All Clients</option>
            {clients.map((c) => (
              <option key={c.id} value={String(c.id)}>
                {c.company_name || c.name}
              </option>
            ))}
          </select>
        </div>

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
        /* FULL WIDTH CARDS VIEW: Each task card expands with full horizontal room */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {displayedTasks.map((task) => {
            const subTasksList = Array.isArray(task.sub_tasks) ? task.sub_tasks : [];
            const completedSubs = subTasksList.filter((s) => s.status === "completed").length;
            const totalCost = subTasksList.reduce((sum, s) => sum + (parseFloat(String(s.price)) || 0), 0) || parseFloat(String(task.price || 0));
            const totalMinutes = subTasksList.reduce((sum, s) => {
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
            const isExpanded = expandedTaskSubtasks[task.id] ?? true;
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

                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      {/* Quick Status Dropdown */}
                      <select
                        value={task.status}
                        onChange={(e) => handleQuickTaskStatusChange(task.id, e.target.value)}
                        className="h-8 text-xs font-bold w-32 bg-muted/30 rounded-lg border border-input px-2 outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer text-foreground"
                      >
                        {allowedStatuses.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>

                      {/* Adjust Score button — admin only */}
                      {!isStaffRole && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleOpenAdjustScore(task)}
                          title="Add manual bonus or penalty score"
                          className="h-8 text-xs font-bold gap-1 border-amber-400/60 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                        >
                          <Trophy className="w-3.5 h-3.5" /> Adjust Score
                        </Button>
                      )}

                      <Button
                        size="sm"
                        onClick={() => handleOpenSubtasksModal(task)}
                        className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" /> + Sub-Tasks
                      </Button>
                    </div>
                  </div>

                  {/* FULL WIDTH TASK NAMING / TITLE */}
                  <div className="w-full pt-1">
                    <h3 className="text-base font-bold text-foreground leading-snug break-words w-full">
                      {task.title}
                    </h3>
                  </div>

                  {/* Client & Assigned Staff */}
                  <div className="space-y-1.5 pt-1">
                    {task.client_name && (
                      <div className="flex items-center gap-2 text-xs">
                        <Building2 className="w-4 h-4 text-primary shrink-0" />
                        <span className="text-muted-foreground">Client:</span>
                        <span className="font-bold text-foreground">{task.client_name}</span>
                      </div>
                    )}

                    {((task.assigned_employees && task.assigned_employees.length > 0) || task.assigned_employee_name) && (
                      <div className="flex items-center gap-1.5 flex-wrap text-xs">
                        <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-muted-foreground">Assigned:</span>
                        {task.assigned_employees && task.assigned_employees.length > 0 ? (
                          task.assigned_employees.map((emp) => (
                            <Badge key={emp.id} variant="secondary" className="text-[11px] py-0 px-2 font-medium bg-muted/60 border">
                              {emp.name} {emp.role ? `(${emp.role})` : ""}
                            </Badge>
                          ))
                        ) : (
                          <Badge variant="secondary" className="text-[11px] py-0 px-2 font-medium bg-muted/60 border">
                            {task.assigned_employee_name} {task.assigned_employee_role ? `(${task.assigned_employee_role})` : ""}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {task.details && (
                    <p className="text-muted-foreground text-xs leading-relaxed bg-muted/20 p-2.5 rounded-xl border">
                      {task.details}
                    </p>
                  )}

                  {/* Summary Bar: Total Cost, Duration, Sub-Tasks Progress */}
                  <div className="grid grid-cols-3 gap-2 bg-muted/30 p-3 rounded-xl border text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Total Cost</span>
                      <span className="font-bold text-foreground font-mono text-sm tracking-wider">
                        {formatPriceDisplay(totalCost)}
                      </span>
                    </div>
                    <div className="border-l pl-3">
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Total Duration</span>
                      <span className="font-bold text-foreground font-mono text-sm">
                        {totalHoursDisplay}
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
                        <span>Sub-Tasks & Assignees ({subTasksList.length})</span>
                      </div>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        {isExpanded ? "Collapse" : "Expand"}
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </span>
                    </div>

                    {isExpanded && subTasksList.length > 0 && (
                      <div className="space-y-2 pt-1">
                        {subTasksList.map((sub, index) => {
                          const isSubtaskAssignedToMe = Boolean(
                            user?.id &&
                            ((sub.assigned_employee_id && Number(sub.assigned_employee_id) === Number(user.id)) ||
                             (user.email && sub.assigned_employee_email && sub.assigned_employee_email.toLowerCase().trim() === user.email.toLowerCase().trim()) ||
                             (user.full_name && user.full_name.trim().length > 2 && user.full_name.toLowerCase() !== "admin" && sub.assigned_employee_name && sub.assigned_employee_name.toLowerCase().trim() === user.full_name.toLowerCase().trim()))
                          );

                          return (
                          <div
                            key={sub.id}
                            className={`p-3 rounded-xl bg-background border text-xs space-y-2 transition-colors shadow-2xs ${
                              isSubtaskAssignedToMe ? "border-emerald-500/50 bg-emerald-500/5" : "hover:border-primary/40"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <span className="font-bold text-muted-foreground text-[10px]">#{index + 1}</span>
                                <span className={`font-bold text-xs truncate ${sub.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                  {sub.title}
                                </span>
                                <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[11px] tracking-wider">
                                  {formatPriceDisplay(sub.price)}
                                </span>
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[10px] gap-1.5 font-semibold">
                                  <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-300 font-bold">
                                    <Sparkles className="w-2.5 h-2.5 text-emerald-600" /> Bonus +{sub.points !== undefined && sub.points !== null ? sub.points : 20}
                                  </span>
                                  <span className="text-muted-foreground/60">/</span>
                                  <span className="inline-flex items-center gap-0.5 text-rose-700 dark:text-rose-300 font-bold">
                                    Penalty -{sub.penalty_points !== undefined && sub.penalty_points !== null ? sub.penalty_points : 10} pts
                                  </span>
                                </Badge>
                                {isSubtaskAssignedToMe && (
                                  <Badge variant="outline" className="bg-emerald-500/20 text-emerald-800 dark:text-emerald-200 border-emerald-500/40 text-[9px] px-1.5 py-0 gap-1 font-bold">
                                    <Sparkles className="w-2.5 h-2.5 text-amber-500" /> Assigned to You
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {getUrgencyBadge(sub.urgency)}
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t text-[11px] text-muted-foreground">
                              <div className="flex flex-wrap items-center gap-3">
                                {sub.assigned_employee_name ? (
                                  <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                                    <UserCheck className="w-3.5 h-3.5 text-primary" />
                                    {sub.assigned_employee_name}
                                  </span>
                                ) : (
                                  <span className="italic text-muted-foreground">Unassigned</span>
                                )}

                                {formatSubtaskDuration(sub.duration_hours, sub.duration_minutes) && (
                                  <span className="inline-flex items-center gap-1 font-mono">
                                    <Clock className="w-3.5 h-3.5" />
                                    {formatSubtaskDuration(sub.duration_hours, sub.duration_minutes)}
                                  </span>
                                )}

                                {sub.deadline_date && (
                                  <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                                    <Calendar className="w-3.5 h-3.5" />
                                    {sub.deadline_date} {sub.deadline_time || ""}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-muted-foreground">Status:</span>
                                <select
                                  value={sub.status || "pending"}
                                  onChange={(e) => handleSubTaskStatusDirectUpdate(task, sub.id, e.target.value)}
                                  className="h-6 text-[10px] font-semibold w-28 bg-muted/20 rounded border border-input px-1.5 outline-none cursor-pointer text-foreground"
                                >
                                  {allowedStatuses.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      </div>
                    )}
                  </div>
                </CardContent>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between px-5 py-3 border-t bg-muted/10">
                  <div className="text-[11px] text-muted-foreground">
                    Created: {new Date(task.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                  </div>

                  {canEditOrRemove && (
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => handleOpenEditTask(task)}>
                        <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Task
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTask(task.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Create / Edit Task / Project */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-xl w-[92vw] max-h-[88vh] flex flex-col p-0 overflow-hidden shadow-2xl border">
          <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0 bg-background/95 backdrop-blur-xs">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              <span>{editingTask ? "Edit Task / Project" : "Create New Task / Project"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              First, enter the Task/Project Title, select or enter the Client Name, and add an overview. You can add sub-tasks immediately after!
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMainTask} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Organization / Institution Selection */}
            <div className="space-y-1.5 p-3 rounded-xl border bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  Organization / Institution *
                </Label>
                {formInstitutionId !== "none" && (
                  <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    Staff Dedicated to Organization
                  </span>
                )}
              </div>
              {isPlatformRoute || institutions.length > 1 ? (
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
                  {isPlatformRoute && (
                    <option value="none">Platform Operations (Internal / No Organization)</option>
                  )}
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Task / Project Name *</Label>
              <Input
                required
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="e.g. Corporate AWS Training Setup, Campus Hiring Drive"
                className="text-xs h-9"
              />
            </div>

            {/* Client Selection with Search & Quick Add */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  Client Name (From Sales / Vendors)
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
                  {(formClientId !== "none" || formClientName) && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormClientId("none");
                        setFormClientName("");
                        setClientSearchQuery("");
                      }}
                      className="text-[10px] text-muted-foreground hover:text-destructive transition-colors font-medium underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Custom Searchable Dropdown Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setClientDropdownOpen(!clientDropdownOpen)}
                  className="w-full flex items-center justify-between h-9 px-3 py-1.5 text-xs rounded-md border border-input bg-transparent shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <span className={`truncate text-left ${formClientId === "none" && !formClientName ? "text-muted-foreground" : "text-foreground font-medium flex items-center gap-2"}`}>
                    {formClientId !== "none" ? (
                      (() => {
                        const c = clients.find((cl) => String(cl.id) === formClientId);
                        if (!c) return formClientName || "Selected Client";
                        return (
                          <>
                            <span className="font-semibold text-foreground truncate">{c.company_name || c.name}</span>
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal shrink-0">
                              {c.client_type || "Client"}
                            </Badge>
                          </>
                        );
                      })()
                    ) : formClientName ? (
                      <>
                        <span className="font-semibold text-foreground truncate">{formClientName}</span>
                        <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal text-muted-foreground shrink-0">
                          Custom Client
                        </Badge>
                      </>
                    ) : (
                      "-- Select Client Account (Searchable) --"
                    )}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${clientDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown Content */}
                {clientDropdownOpen && (
                  <div className="mt-1.5 p-2 rounded-xl border bg-popover text-popover-foreground shadow-lg space-y-2 z-50">
                    {/* Search Bar inside dropdown */}
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

                    {/* Quick helper row */}
                    <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground border-b pb-1.5">
                      <span>
                        Showing {filteredClientList.length} client{filteredClientList.length === 1 ? "" : "s"}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setFormClientId("none");
                          setFormClientName("");
                          setClientDropdownOpen(false);
                        }}
                        className="text-[11px] text-muted-foreground hover:text-foreground underline"
                      >
                        Internal / No Client
                      </button>
                    </div>

                    {/* Scrollable list of clients */}
                    <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                      {/* Option to type custom name if searched */}
                      {clientSearchQuery.trim() && (
                        <div
                          onClick={() => {
                            setFormClientId("none");
                            setFormClientName(clientSearchQuery.trim());
                            setClientDropdownOpen(false);
                          }}
                          className="flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs bg-primary/5 hover:bg-primary/10 border border-dashed border-primary/30 text-primary font-medium mb-1"
                        >
                          <PlusCircle className="w-4 h-4 shrink-0 text-primary" />
                          <span className="truncate">
                            Use custom: <strong>&ldquo;{clientSearchQuery.trim()}&rdquo;</strong>
                          </span>
                        </div>
                      )}

                      {filteredClientList.length === 0 && !clientSearchQuery.trim() ? (
                        <div className="py-4 text-center text-xs text-muted-foreground">
                          No client accounts saved yet.
                        </div>
                      ) : filteredClientList.length === 0 ? (
                        <div className="py-3 text-center text-xs text-muted-foreground space-y-1">
                          <p>No client accounts found matching &quot;{clientSearchQuery}&quot;</p>
                          <p className="text-[10px]">Click the button above to use it as a custom client name.</p>
                        </div>
                      ) : (
                        filteredClientList.map((c) => {
                          const isSelected = String(c.id) === formClientId;
                          return (
                            <div
                              key={c.id}
                              onClick={() => {
                                setFormClientId(String(c.id));
                                setFormClientName(c.company_name || c.name);
                                setClientDropdownOpen(false);
                              }}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                                isSelected
                                  ? "bg-primary/10 text-foreground font-medium"
                                  : "hover:bg-muted/60 text-muted-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                                <div className="truncate">
                                  <span className="truncate text-foreground font-medium block">
                                    {c.company_name || c.name}
                                  </span>
                                  {c.contact_person && c.contact_person !== c.name && (
                                    <span className="text-[10px] text-muted-foreground block truncate">
                                      Contact: {c.contact_person}
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

                    <div className="pt-1.5 border-t flex items-center justify-between text-[11px] text-muted-foreground">
                      <a
                        href={addClientUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline font-semibold flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Create new client in Directory
                      </a>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setClientDropdownOpen(false)}
                        className="h-6 text-[11px] px-2"
                      >
                        Close
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* If custom client is chosen or formClientId === 'none' and there's a custom client, show editable input */}
              {formClientId === "none" && formClientName && (
                <div className="relative mt-1">
                  <Input
                    value={formClientName}
                    onChange={(e) => setFormClientName(e.target.value)}
                    placeholder="Custom client name..."
                    className="text-xs h-8 pr-20 font-medium"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-medium">
                    Custom Name
                  </span>
                </div>
              )}
            </div>

            {/* Assign to Staff Members (Multiple Choice) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-primary" />
                  Assign to Staff Member(s) ({selectedOrgName})
                </Label>
                {formAssignedStaffIds.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {formAssignedStaffIds.length} Selected
                    </span>
                    <button
                      type="button"
                      onClick={() => setFormAssignedStaffIds([])}
                      className="text-[10px] text-muted-foreground hover:text-destructive transition-colors font-medium underline"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              {/* Custom Multi-Select Dropdown Trigger */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setStaffDropdownOpen(!staffDropdownOpen)}
                  className="w-full flex items-center justify-between h-9 px-3 py-1.5 text-xs rounded-md border border-input bg-transparent shadow-xs hover:bg-muted/40 transition-colors focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <span className={`truncate text-left ${formAssignedStaffIds.length === 0 ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                    {formAssignedStaffIds.length === 0
                      ? "-- Unassigned (Click to Select Staff) --"
                      : formAssignedStaffIds.length === 1
                      ? (() => {
                          const s = dialogStaffList.find((st) => String(st.id) === formAssignedStaffIds[0]);
                          return s ? `${s.name} (${s.role})` : "1 staff member selected";
                        })()
                      : `${formAssignedStaffIds.length} staff members selected`}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${staffDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {/* Dropdown Content */}
                {staffDropdownOpen && (
                  <div className="mt-1.5 p-2 rounded-xl border bg-popover text-popover-foreground shadow-lg space-y-2 z-50">
                    {/* Search Bar inside dropdown */}
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

                    {/* Quick Select Buttons */}
                    <div className="flex items-center justify-between px-1 text-[11px] text-muted-foreground border-b pb-1.5">
                      <span>
                        Showing {filteredStaffList.length} staff member{filteredStaffList.length === 1 ? "" : "s"} from {selectedOrgName}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const allIds = Array.from(new Set([...formAssignedStaffIds, ...filteredStaffList.map((s) => String(s.id))]));
                            setFormAssignedStaffIds(allIds);
                          }}
                          className="text-primary hover:underline font-semibold"
                        >
                          Select All
                        </button>
                        <span>•</span>
                        <button
                          type="button"
                          onClick={() => {
                            const removeIds = new Set(filteredStaffList.map((s) => String(s.id)));
                            setFormAssignedStaffIds(formAssignedStaffIds.filter((id) => !removeIds.has(id)));
                          }}
                          className="hover:underline text-destructive font-semibold"
                        >
                          Deselect
                        </button>
                      </div>
                    </div>

                    {/* Scrollable list of staff members with checkboxes */}
                    <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                      {loadingModalOrgStaff ? (
                        <div className="py-4 text-center text-xs text-muted-foreground flex items-center justify-center gap-2">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          <span>Loading {selectedOrgName} staff...</span>
                        </div>
                      ) : filteredStaffList.length === 0 ? (
                        <div className="py-4 text-center text-xs text-muted-foreground">
                          No staff members found for {selectedOrgName}
                        </div>
                      ) : (
                        filteredStaffList.map((s) => {
                          const isSelected = formAssignedStaffIds.includes(String(s.id));
                          return (
                            <div
                              key={s.id}
                              onClick={() => {
                                setFormAssignedStaffIds((prev) =>
                                  prev.includes(String(s.id))
                                    ? prev.filter((id) => id !== String(s.id))
                                    : [...prev, String(s.id)]
                                );
                              }}
                              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs ${
                                isSelected
                                  ? "bg-primary/10 text-foreground font-medium"
                                  : "hover:bg-muted/60 text-muted-foreground"
                              }`}
                            >
                              <div className="flex items-center gap-2.5 truncate">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => {}}
                                  className="pointer-events-none"
                                />
                                <span className="truncate text-foreground font-medium">{s.name}</span>
                              </div>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 shrink-0 bg-background/50">
                                {s.role}
                              </Badge>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="pt-1 border-t flex justify-end">
                      <Button
                        type="button"
                        size="sm"
                        variant="default"
                        onClick={() => setStaffDropdownOpen(false)}
                        className="h-7 text-xs font-semibold px-3"
                      >
                        Done
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Selected Staff Member Chips (Below Trigger) */}
              {formAssignedStaffIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5">
                  {dialogStaffList
                    .filter((s) => formAssignedStaffIds.includes(String(s.id)))
                    .map((s) => (
                      <Badge
                        key={s.id}
                        variant="secondary"
                        className="text-[11px] py-0.5 pl-2 pr-1 gap-1 font-medium bg-muted/80 hover:bg-muted border"
                      >
                        <span>{s.name}</span>
                        <span className="text-[9px] text-muted-foreground">({s.role})</span>
                        <button
                          type="button"
                          onClick={() => setFormAssignedStaffIds((prev) => prev.filter((id) => id !== String(s.id)))}
                          className="hover:bg-destructive/20 hover:text-destructive rounded-full p-0.5 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                </div>
              )}
            </div>

            {/* Task Cadence / Frequency Selector */}
            <div className="space-y-2 p-3.5 rounded-xl border bg-muted/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  Task Frequency & Cadence *
                </Label>
                <span className="text-[10px] text-muted-foreground font-medium">Daily vs One-Time</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFormIsDailyRecurring(false)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    !formIsDailyRecurring
                      ? "bg-background border-primary shadow-xs ring-1 ring-primary/40 text-foreground"
                      : "bg-card/60 hover:bg-background/80 border-border text-muted-foreground"
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    ⚡ Once (One-Time)
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                    Standard single deliverable. Disappears from active board once completed.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormIsDailyRecurring(true)}
                  className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                    formIsDailyRecurring
                      ? "bg-background border-primary shadow-xs ring-1 ring-primary/40 text-foreground"
                      : "bg-card/60 hover:bg-background/80 border-border text-muted-foreground"
                  }`}
                >
                  <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                    🔁 Daily Basis
                  </span>
                  <span className="text-[10px] text-muted-foreground mt-0.5 leading-snug">
                    Regenerates everyday. Must be marked completed daily, else penalty applies.
                  </span>
                </button>
              </div>
            </div>





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
                <Button type="submit" disabled={savingTask} className="bg-primary font-bold">
                  {savingTask && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingTask ? "Save Changes" : "Create Task & Continue to Sub-Tasks"}
                </Button>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Dedicated Sub-Tasks Manager Modal */}
      <Dialog open={subtaskModalOpen} onOpenChange={setSubtaskModalOpen}>
        <DialogContent className="sm:max-w-[1150px] md:max-w-[1200px] w-[95vw] max-h-[92vh] overflow-y-auto p-6">
          <DialogHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  <span>Sub-Tasks Deliverables & Assignments</span>
                </DialogTitle>
                <DialogDescription className="text-xs mt-0.5">
                  Project: <strong className="text-foreground">{selectedTaskForSubtasks?.title}</strong>
                  {selectedTaskForSubtasks?.client_name && (
                    <span> • Client: <strong className="text-primary">{selectedTaskForSubtasks.client_name}</strong></span>
                  )}
                  {isSelectedTaskAssigned && (
                    <span className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                      <span className="text-[10px] text-muted-foreground font-semibold">Project Assigned Members:</span>
                      {subtaskAssigneeOptions.map((emp) => (
                        <span key={emp.id} className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                          {emp.name} {emp.role ? `(${emp.role})` : ""}
                        </span>
                      ))}
                    </span>
                  )}
                </DialogDescription>
              </div>

              {/* Live Rollup Summary */}
              <div className="flex items-center gap-3 bg-muted/40 px-3 py-1.5 rounded-xl border text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Total Cost</span>
                  <span className="font-bold text-foreground font-mono tracking-wider">{formatPriceDisplay(totalSubModalCost)}</span>
                </div>
                <div className="border-l pl-3">
                  <span className="text-[10px] text-muted-foreground block">Total Duration</span>
                  <span className="font-bold text-foreground font-mono">{totalSubModalHoursDisplay}</span>
                </div>
                <div className="border-l pl-3">
                  <span className="text-[10px] text-muted-foreground block">Completed</span>
                  <span className="font-bold text-emerald-600 font-mono">{completedSubModalCount}/{activeSubTasks.length}</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Sub-Task Input Box */}
            <div className="p-4 rounded-xl border bg-card/60 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground uppercase tracking-wider text-primary">
                  + Add New Sub-Task Deliverable
                </p>
                <span className="text-[11px] text-muted-foreground">Fill in fields and click Add</span>
              </div>

              {/* Row 1: Name, Price, Assign Staff */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-5 space-y-1">
                  <Label className="text-xs font-semibold">Sub-Task Name *</Label>
                  <Input
                    value={newSubTitle}
                    onChange={(e) => setNewSubTitle(e.target.value)}
                    placeholder="e.g. Curriculum Design, Lab Environment Setup, Client Demo"
                    className="text-xs h-9 bg-background"
                  />
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-xs font-semibold">Task Cost / Price (₹)</Label>
                  <div className="relative">
                    <IndianRupee className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    {isStaffViewer ? (
                      <Input
                        type="text"
                        value="★★★★★"
                        disabled
                        className="pl-8 text-xs h-9 font-mono bg-muted/40 cursor-not-allowed select-none text-muted-foreground font-bold tracking-wider"
                      />
                    ) : (
                      <Input
                        type="number"
                        step="100"
                        value={newSubPrice}
                        onChange={(e) => setNewSubPrice(e.target.value)}
                        placeholder="0.00"
                        className="pl-8 text-xs h-9 font-mono bg-background"
                      />
                    )}
                  </div>
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">Assign Staff Member</Label>
                    {isSelectedTaskAssigned ? (
                      <span className="text-[10px] text-primary font-bold bg-primary/10 px-1.5 py-0.5 rounded">
                        Project Team ({subtaskAssigneeOptions.length})
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted-foreground font-normal">
                        All Staff
                      </span>
                    )}
                  </div>
                  <select
                    value={newSubStaffId}
                    onChange={(e) => setNewSubStaffId(e.target.value)}
                    className="w-full h-9 text-xs bg-background rounded-md border border-input px-3 font-medium outline-none focus:ring-1 focus:ring-ring cursor-pointer text-foreground"
                  >
                    <option value="none">-- Unassigned --</option>
                    {subtaskAssigneeOptions.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name} {s.role ? `(${s.role})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Duration (Hours & Minutes), [Deadline Date, Deadline Time if not daily], Urgency, Status */}
              <div className="grid grid-cols-2 sm:grid-cols-12 gap-3">
                <div className={`${selectedTaskForSubtasks?.is_daily_recurring ? "sm:col-span-4" : "sm:col-span-3"} space-y-1`}>
                  <Label className="text-xs font-semibold">Duration</Label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newSubDurationHours}
                        onChange={(e) => setNewSubDurationHours(e.target.value)}
                        className="text-xs h-9 font-mono bg-background pr-6"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground pointer-events-none">
                        h
                      </span>
                    </div>
                    <div className="relative">
                      <Input
                        type="number"
                        min="0"
                        max="59"
                        placeholder="0"
                        value={newSubDurationMinutes}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === "" || (Number(val) >= 0 && Number(val) <= 59)) {
                            setNewSubDurationMinutes(val);
                          }
                        }}
                        className="text-xs h-9 font-mono bg-background pr-6"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-muted-foreground pointer-events-none">
                        m
                      </span>
                    </div>
                  </div>
                </div>

                {!selectedTaskForSubtasks?.is_daily_recurring && (
                  <>
                    <div className="sm:col-span-3 space-y-1">
                      <Label className="text-xs font-semibold">Deadline Date</Label>
                      <Input
                        type="date"
                        value={newSubDeadlineDate}
                        onChange={(e) => setNewSubDeadlineDate(e.target.value)}
                        className="text-xs h-9 bg-background"
                      />
                    </div>

                    <div className="sm:col-span-2 space-y-1">
                      <Label className="text-xs font-semibold">Deadline Time</Label>
                      <Input
                        type="time"
                        value={newSubDeadlineNumber}
                        onChange={(e) => setNewSubDeadlineNumber(e.target.value)}
                        className="text-xs h-9 bg-background"
                      />
                    </div>
                  </>
                )}

                <div className={`${selectedTaskForSubtasks?.is_daily_recurring ? "sm:col-span-4" : "sm:col-span-2"} space-y-1`}>
                  <Label className="text-xs font-semibold">Urgency Level</Label>
                  <select
                    value={newSubUrgency}
                    onChange={(e) => setNewSubUrgency(e.target.value as any)}
                    className="w-full h-9 text-xs bg-background rounded-md border border-input px-3 font-medium outline-none focus:ring-1 focus:ring-ring cursor-pointer text-foreground"
                  >
                    {SUBTASK_URGENCIES.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className={`${selectedTaskForSubtasks?.is_daily_recurring ? "sm:col-span-4" : "sm:col-span-2"} space-y-1`}>
                  <Label className="text-xs font-semibold">Sub-Task Status</Label>
                  <select
                    value={newSubStatus}
                    onChange={(e) => setNewSubStatus(e.target.value as any)}
                    className="w-full h-9 text-xs bg-background rounded-md border border-input px-3 font-medium outline-none focus:ring-1 focus:ring-ring cursor-pointer text-foreground"
                  >
                    {allowedStatuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Points (Reward) & Penalty Points */}
              <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl border bg-muted/20">
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-600" />
                      <span>Completion Points (+Reward)</span>
                    </Label>
                    {isStaffViewer && (
                      <span className="text-[10px] text-muted-foreground font-normal">(Admin managed)</span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      value={newSubPoints}
                      onChange={(e) => setNewSubPoints(e.target.value)}
                      disabled={isStaffViewer}
                      placeholder="20"
                      className={`text-xs h-8 font-mono bg-background ${isStaffViewer ? "cursor-not-allowed opacity-80 bg-muted/40" : ""}`}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-600">
                      +PTS
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1">
                    <Label className="text-xs font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-600" />
                      <span>Penalty Points (-Deduction)</span>
                    </Label>
                    {isStaffViewer && (
                      <span className="text-[10px] text-muted-foreground font-normal">(Admin managed)</span>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      value={newSubPenaltyPoints}
                      onChange={(e) => setNewSubPenaltyPoints(e.target.value)}
                      disabled={isStaffViewer}
                      placeholder="10"
                      className={`text-xs h-8 font-mono bg-background text-rose-600 ${isStaffViewer ? "cursor-not-allowed opacity-80 bg-muted/40" : ""}`}
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-rose-600">
                      -PTS
                    </span>
                  </div>
                </div>
              </div>

              {newSubStatus === "under_review" && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    Marking as <strong>Under Review</strong> indicates you have completed this deliverable. Platform & Institution Admins will be notified to inspect and approve.
                  </span>
                </div>
              )}

              <div className="flex justify-end pt-1">
                <Button type="button" size="sm" onClick={handleAddSubTaskToList} className="h-9 px-5 text-xs font-bold gap-1.5 shadow-sm">
                  <Plus className="w-4 h-4" /> Add Sub-Task to List
                </Button>
              </div>
            </div>

            {/* List of Added Sub-Tasks */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="text-xs font-bold text-foreground">
                  Current Sub-Tasks ({activeSubTasks.length})
                </Label>
                {isStaffViewer && (
                  <span className="text-[10px] text-muted-foreground font-medium italic">
                    (Added subtasks can only be modified or removed by Institution & Platform Admins)
                  </span>
                )}
              </div>

              {activeSubTasks.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {activeSubTasks.map((sub, index) => (
                    <div
                      key={sub.id}
                      className="p-3 rounded-xl bg-background border text-xs space-y-2 hover:border-primary/40 transition-colors shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-muted-foreground text-[10px]">#{index + 1}</span>
                          <span className={`font-bold text-sm truncate ${sub.status === "completed" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {sub.title}
                          </span>
                          <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-xs tracking-wider">
                            {formatPriceDisplay(sub.price)}
                          </span>
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[10px] gap-1.5 font-semibold">
                            <span className="inline-flex items-center gap-0.5 text-emerald-700 dark:text-emerald-300 font-bold">
                              <Sparkles className="w-2.5 h-2.5 text-emerald-600" /> Bonus +{sub.points !== undefined && sub.points !== null ? sub.points : 20}
                            </span>
                            <span className="text-muted-foreground/60">/</span>
                            <span className="inline-flex items-center gap-0.5 text-rose-700 dark:text-rose-300 font-bold">
                              Penalty -{sub.penalty_points !== undefined && sub.penalty_points !== null ? sub.penalty_points : 10} pts
                            </span>
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {getUrgencyBadge(sub.urgency)}
                          {!isStaffViewer && (
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => handleRemoveSubTaskFromList(sub.id)}
                              className="h-7 w-7 text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t text-[11px] text-muted-foreground">
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground font-medium">Assignee:</span>
                            {isStaffViewer ? (
                              <span className="font-semibold text-foreground text-[11px]">
                                {sub.assigned_employee_name || "Unassigned"}
                              </span>
                            ) : (
                              <select
                                value={sub.assigned_employee_id ? String(sub.assigned_employee_id) : "none"}
                                onChange={(e) => handleSubTaskAssigneeChangeInModal(sub.id, e.target.value)}
                                className="h-7 text-[11px] font-semibold bg-background rounded border border-input px-2 outline-none cursor-pointer text-foreground max-w-[170px] truncate"
                              >
                                <option value="none">-- Unassigned --</option>
                                {subtaskAssigneeOptions.map((s) => (
                                  <option key={s.id} value={String(s.id)}>
                                    {s.name}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>

                          {formatSubtaskDuration(sub.duration_hours, sub.duration_minutes) && (
                            <span className="inline-flex items-center gap-1 font-mono">
                              <Clock className="w-3.5 h-3.5" />
                              {formatSubtaskDuration(sub.duration_hours, sub.duration_minutes)}
                            </span>
                          )}

                          {!selectedTaskForSubtasks?.is_daily_recurring && sub.deadline_date && (
                            <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium">
                              <Calendar className="w-3.5 h-3.5" />
                              {sub.deadline_date} {sub.deadline_time || ""}
                            </span>
                          )}

                          {selectedTaskForSubtasks?.is_daily_recurring && (
                            <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-400 font-medium">
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Daily Deliverable</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-muted-foreground">Status:</span>
                          <select
                            value={sub.status}
                            onChange={(e) => handleSubTaskStatusChangeInModal(sub.id, e.target.value)}
                            className="h-7 text-[10px] font-semibold w-28 bg-background rounded border border-input px-1.5 outline-none cursor-pointer text-foreground"
                          >
                            {allowedStatuses.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed rounded-2xl text-xs text-muted-foreground bg-muted/10">
                  No sub-tasks added to this project yet. Use the form above to add deliverables with cost, assignee, duration, and deadlines.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t">
              <Button onClick={() => setSubtaskModalOpen(false)} className="bg-primary font-bold">
                Done & Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
                className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 transition-all ${
                  adjustType === "bonus"
                    ? "border-emerald-500 bg-emerald-500/10 shadow-sm"
                    : "border-border bg-card/60 hover:bg-muted/40"
                }`}
              >
                <PlusCircle className={`w-7 h-7 ${
                  adjustType === "bonus" ? "text-emerald-600" : "text-muted-foreground"
                }`} />
                <span className={`text-sm font-bold ${
                  adjustType === "bonus" ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground"
                }`}>Bonus (+)</span>
                <span className="text-[10px] text-muted-foreground text-center leading-snug">
                  Reward for great work, extra effort, or client appreciation
                </span>
              </button>

              <button
                type="button"
                onClick={() => setAdjustType("penalty")}
                className={`flex flex-col items-center justify-center gap-1.5 p-4 rounded-xl border-2 transition-all ${
                  adjustType === "penalty"
                    ? "border-rose-500 bg-rose-500/10 shadow-sm"
                    : "border-border bg-card/60 hover:bg-muted/40"
                }`}
              >
                <MinusCircle className={`w-7 h-7 ${
                  adjustType === "penalty" ? "text-rose-600" : "text-muted-foreground"
                }`} />
                <span className={`text-sm font-bold ${
                  adjustType === "penalty" ? "text-rose-700 dark:text-rose-300" : "text-muted-foreground"
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
                    className={`text-sm h-10 font-mono pr-14 ${
                      adjustType === "bonus" ? "text-emerald-700" : "text-rose-600"
                    }`}
                  />
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold ${
                    adjustType === "bonus" ? "text-emerald-600" : "text-rose-600"
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
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                        adjustPoints === String(p)
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
            <div className={`flex items-center justify-between gap-3 p-3.5 rounded-xl border-2 ${
              adjustType === "bonus"
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
              <span className={`text-2xl font-black font-mono ${
                adjustType === "bonus" ? "text-emerald-600" : "text-rose-600"
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
                className={`font-bold gap-1.5 ${
                  adjustType === "bonus"
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
                    <span className={`font-black ${
                      adjustHistorySummary.net >= 0 ? "text-emerald-600" : "text-rose-600"
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
                      className={`flex items-start justify-between gap-3 p-3 rounded-xl border text-xs ${
                        adj.adjustment_type === "bonus"
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
                        <span className={`text-sm font-black font-mono ${
                          adj.adjustment_type === "bonus" ? "text-emerald-600" : "text-rose-600"
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
    </div>
  );
}
