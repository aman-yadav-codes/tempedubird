"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
  LayoutGrid,
  List,
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  duration_hours?: number; // Duration / Estimated Hours
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
  client_id: number | null;
  client_name: string | null;
  institution_id: number | null;
  price: string | number;
  details: string | null;
  assigned_employee_id?: number | null;
  assigned_employee_name?: string | null;
  assigned_employee_role?: string | null;
  assigned_employee_email?: string | null;
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

export default function OperationsTasksPage() {
  const searchParams = useSearchParams();
  const { user, accessToken } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const [tasks, setTasks] = useState<OperationTask[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [modalStaffList, setModalStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  const isStaffRole = useMemo(() => {
    if (!user) return false;
    const codes = (user as any)?.role_codes || [(user as any)?.role || (user as any)?.primary_role || ""];
    const isOwnerOrAdmin = codes.some((r: string) =>
      ["platform_admin", "super_admin", "institution_admin", "school_owner", "college_owner", "university_owner"].includes(r)
    );
    return !isOwnerOrAdmin;
  }, [user]);

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
  const [formClientId, setFormClientId] = useState<string>("none");
  const [formClientName, setFormClientName] = useState("");
  const [formAssignedStaffId, setFormAssignedStaffId] = useState<string>("none");
  const [formAssignedStaffName, setFormAssignedStaffName] = useState("");
  const [formAssignedStaffRole, setFormAssignedStaffRole] = useState("");
  const [formDetails, setFormDetails] = useState("");
  const [formIsDailyRecurring, setFormIsDailyRecurring] = useState(false);
  const [formPoints, setFormPoints] = useState("20");
  const [formPenaltyPoints, setFormPenaltyPoints] = useState("10");

  const taskFormState = useMemo(() => ({
    formTitle,
    formClientId,
    formClientName,
    formAssignedStaffId,
    formAssignedStaffName,
    formAssignedStaffRole,
    formDetails,
    formIsDailyRecurring,
    formPoints,
    formPenaltyPoints,
  }), [formTitle, formClientId, formClientName, formAssignedStaffId, formAssignedStaffName, formAssignedStaffRole, formDetails, formIsDailyRecurring, formPoints, formPenaltyPoints]);

  const { saveStatus: taskSaveStatus, clearDraft: clearTaskDraft } = useProgressiveSave({
    formKey: `operations_task:${editingTask?.id || "new"}`,
    formState: taskFormState,
    enabled: taskDialogOpen,
    onRestore: (draft) => {
      if (draft.formTitle) setFormTitle(draft.formTitle);
      if (draft.formClientId) setFormClientId(draft.formClientId);
      if (draft.formClientName) setFormClientName(draft.formClientName);
      if (draft.formAssignedStaffId) setFormAssignedStaffId(draft.formAssignedStaffId);
      if (draft.formAssignedStaffName) setFormAssignedStaffName(draft.formAssignedStaffName);
      if (draft.formAssignedStaffRole) setFormAssignedStaffRole(draft.formAssignedStaffRole);
      if (draft.formDetails) setFormDetails(draft.formDetails);
      if (draft.formIsDailyRecurring !== undefined) setFormIsDailyRecurring(draft.formIsDailyRecurring);
      if (draft.formPoints) setFormPoints(draft.formPoints);
      if (draft.formPenaltyPoints) setFormPenaltyPoints(draft.formPenaltyPoints);
    },
  });

  // Modal 2: Manage Sub-Tasks for a Task
  const [subtaskModalOpen, setSubtaskModalOpen] = useState(false);
  const [selectedTaskForSubtasks, setSelectedTaskForSubtasks] = useState<OperationTask | null>(null);
  const [activeSubTasks, setActiveSubTasks] = useState<SubTask[]>([]);
  const [savingSubtasks, setSavingSubtasks] = useState(false);

  // Modal 3: Under Review Submission (Optional text or image)
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewModalTask, setReviewModalTask] = useState<OperationTask | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewImageUrl, setReviewImageUrl] = useState("");
  const [uploadingReviewImage, setUploadingReviewImage] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // New Subtask draft inputs
  const [newSubTitle, setNewSubTitle] = useState("");
  const [newSubPrice, setNewSubPrice] = useState("5000");
  const [newSubStaffId, setNewSubStaffId] = useState<string>("none");
  const [newSubDuration, setNewSubDuration] = useState("4");
  const [newSubPoints, setNewSubPoints] = useState("20");
  const [newSubPenaltyPoints, setNewSubPenaltyPoints] = useState("10");
  const [newSubDeadlineDate, setNewSubDeadlineDate] = useState("");
  const [newSubDeadlineNumber, setNewSubDeadlineNumber] = useState("18:00");
  const [newSubUrgency, setNewSubUrgency] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [newSubStatus, setNewSubStatus] = useState<"pending" | "in_progress" | "under_review" | "completed" | "cancelled">("pending");

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeInstitution?.id) params.set("institution_id", String(activeInstitution.id));
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedStatusTab && selectedStatusTab !== "all") params.set("status", selectedStatusTab);
      if (urgencyFilter && urgencyFilter !== "all") params.set("urgency", urgencyFilter);
      if (clientFilter && clientFilter !== "all") params.set("client_id", clientFilter);
      if (staffFilter && staffFilter !== "all") params.set("employee_id", staffFilter);

      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch(`/api/admin/operations/tasks?${params.toString()}`, { headers });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load operations tasks");

      setTasks(data.tasks || []);
      if (Array.isArray(data.clients)) setClients(data.clients);
      if (Array.isArray(data.staff)) setStaffList(data.staff);
      if (data.stats) setStats(data.stats);
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch operations tasks");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedStatusTab, urgencyFilter, clientFilter, staffFilter, accessToken, activeInstitution]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const resetSubtaskDraft = () => {
    setNewSubTitle("");
    setNewSubPrice("5000");
    setNewSubStaffId("none");
    setNewSubDuration("4");
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
    setFormClientId("none");
    setFormClientName("");
    setFormAssignedStaffId("none");
    setFormAssignedStaffName("");
    setFormAssignedStaffRole("");
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
    setFormClientId(t.client_id ? String(t.client_id) : "none");
    setFormClientName(t.client_name || "");
    setFormAssignedStaffId(t.assigned_employee_id ? String(t.assigned_employee_id) : "none");
    setFormAssignedStaffName(t.assigned_employee_name || "");
    setFormAssignedStaffRole(t.assigned_employee_role || "");
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

      const res = await fetch("/api/admin/operations/tasks", {
        method,
        headers,
        body: JSON.stringify({
          id: editingTask?.id,
          title: formTitle.trim(),
          client_id: formClientId !== "none" ? formClientId : null,
          client_name: formClientName.trim() || null,
          assigned_employee_id: formAssignedStaffId !== "none" ? parseInt(formAssignedStaffId) : null,
          assigned_employee_name: formAssignedStaffName.trim() || null,
          assigned_employee_role: formAssignedStaffRole.trim() || null,
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
    resetSubtaskDraft();
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

    const effectiveStaffList = modalStaffList.length > 0 ? modalStaffList : staffList;
    const assignedStaff = effectiveStaffList.find((s) => String(s.id) === newSubStaffId);

    const newSub: SubTask = {
      id: `sub_${Date.now()}`,
      title: newSubTitle.trim(),
      price: Number(newSubPrice) || 0,
      assigned_employee_id: assignedStaff ? assignedStaff.id : null,
      assigned_employee_name: assignedStaff ? assignedStaff.name : null,
      assigned_employee_role: assignedStaff ? assignedStaff.role : null,
      duration_hours: Number(newSubDuration) || 0,
      points: Number(newSubPoints) || 20,
      penalty_points: Number(newSubPenaltyPoints) || 10,
      deadline_date: newSubDeadlineDate || null,
      deadline_time: newSubDeadlineNumber || "18:00",
      urgency: newSubUrgency,
      status: newSubStatus,
    };

    const updated = [newSub, ...activeSubTasks];
    setActiveSubTasks(updated);
    resetSubtaskDraft();

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

      if (!res.ok) throw new Error("Failed to sync subtasks");
      fetchTasks();
    } catch {
      toast.error("Failed to sync subtask updates");
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

  const isTaskAssignedToMe = useCallback(
    (task: OperationTask) => {
      if (!user?.id) return false;
      const currentUserId = Number(user.id);
      const currentUserEmail = (user.email || "").toLowerCase();

      if (task.assigned_employee_id === currentUserId) return true;
      if (task.assigned_employee_email && task.assigned_employee_email.toLowerCase() === currentUserEmail) return true;

      if (Array.isArray(task.sub_tasks)) {
        return task.sub_tasks.some(
          (st) =>
            st.assigned_employee_id === currentUserId ||
            (st.assigned_employee_name && st.assigned_employee_name.toLowerCase() === (user.full_name || "").toLowerCase())
        );
      }
      return false;
    },
    [user]
  );

  const displayedTasks = useMemo(() => {
    let pool = scopeFilter === "assigned_to_me" ? tasks.filter((t) => isTaskAssignedToMe(t)) : tasks;

    // "once task will not apear once complete marked"
    // When viewing "All Tasks", hide completed Once tasks so only active tasks and daily tasks are displayed
    if (selectedStatusTab === "all") {
      pool = pool.filter((t) => !(t.status === "completed" && !t.is_daily_recurring));
    }

    return pool;
  }, [tasks, scopeFilter, selectedStatusTab, isTaskAssignedToMe]);

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
  const totalSubModalHours = activeSubTasks.reduce((sum, s) => sum + (s.duration_hours || 0), 0);
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
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border">
            <Button
              size="sm"
              variant={viewMode === "cards" ? "default" : "ghost"}
              onClick={() => setViewMode("cards")}
              className="h-8 text-xs font-bold gap-1.5"
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Full Width Cards
            </Button>
            <Button
              size="sm"
              variant={viewMode === "table" ? "default" : "ghost"}
              onClick={() => setViewMode("table")}
              className="h-8 text-xs font-bold gap-1.5"
            >
              <List className="w-3.5 h-3.5" /> Table View
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={fetchTasks} disabled={loading} className="gap-1.5 h-9">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>

          <Button onClick={handleOpenCreateTask} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md gap-1.5 h-9">
            <Plus className="w-4 h-4" /> Create Task / Project
          </Button>
        </div>
      </div>

      {/* Scope Switcher: All Tasks vs Tasks Assigned to Me */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-card rounded-2xl border shadow-xs">
        <div className="flex items-center gap-2">
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
              <h3 className="text-lg font-bold font-mono">₹{stats.totalRevenue.toLocaleString("en-IN")}</h3>
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

        {/* Urgency Filter */}
        <div className="w-full sm:w-44">
          <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
            <SelectTrigger className="h-10 text-xs bg-background rounded-xl font-medium">
              <SelectValue placeholder="All Urgencies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Urgencies</SelectItem>
              {SUBTASK_URGENCIES.map((u) => (
                <SelectItem key={u.id} value={u.id} className="text-xs">
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Client Filter */}
        <div className="w-full sm:w-44">
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger className="h-10 text-xs bg-background rounded-xl font-medium">
              <div className="flex items-center gap-2 truncate">
                <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                <SelectValue placeholder="All Clients" />
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              <SelectItem value="all" className="text-xs">All Clients</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                  {c.company_name || c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Staff / Employee Filter */}
        <div className="w-full sm:w-48">
          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger className="h-10 text-xs bg-background rounded-xl font-medium">
              <div className="flex items-center gap-2 truncate">
                <Users className="w-3.5 h-3.5 text-primary shrink-0" />
                <SelectValue placeholder="All Staff Members" />
              </div>
            </SelectTrigger>
            <SelectContent className="max-h-64 overflow-y-auto">
              <SelectItem value="all" className="text-xs">All Staff Members</SelectItem>
              {uniqueStaffList.map((s) => (
                <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                  {s.name} ({s.role})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
      ) : viewMode === "cards" ? (
        /* FULL WIDTH CARDS VIEW: Each task card expands with full horizontal room */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {displayedTasks.map((task) => {
            const subTasksList = Array.isArray(task.sub_tasks) ? task.sub_tasks : [];
            const completedSubs = subTasksList.filter((s) => s.status === "completed").length;
            const totalCost = subTasksList.reduce((sum, s) => sum + (parseFloat(String(s.price)) || 0), 0) || parseFloat(String(task.price || 0));
            const totalHours = subTasksList.reduce((sum, s) => sum + (parseFloat(String(s.duration_hours)) || 0), 0) || parseFloat(String(task.estimated_hours || 0));
            const isExpanded = expandedTaskSubtasks[task.id] ?? true;
            const hasMySubtasks = isTaskAssignedToMe(task);

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
                      {hasMySubtasks && (
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] gap-1 font-semibold">
                          <Sparkles className="w-3 h-3 text-amber-500" /> Assigned to You
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-auto">
                      {/* Quick Status Dropdown */}
                      <Select
                        value={task.status}
                        onValueChange={(val) => handleQuickTaskStatusChange(task.id, val)}
                      >
                        <SelectTrigger className="h-8 text-xs font-bold w-32 bg-muted/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {allowedStatuses.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="text-xs">
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

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

                  {/* Client & Description */}
                  {task.client_name && (
                    <div className="flex items-center gap-2 text-xs">
                      <Building2 className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-muted-foreground">Client:</span>
                      <span className="font-bold text-foreground">{task.client_name}</span>
                    </div>
                  )}

                  {task.details && (
                    <p className="text-muted-foreground text-xs leading-relaxed bg-muted/20 p-2.5 rounded-xl border">
                      {task.details}
                    </p>
                  )}

                  {/* Summary Bar: Total Cost, Duration, Sub-Tasks Progress */}
                  <div className="grid grid-cols-3 gap-2 bg-muted/30 p-3 rounded-xl border text-xs">
                    <div>
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Total Cost</span>
                      <span className="font-bold text-foreground font-mono text-sm">
                        ₹{totalCost.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="border-l pl-3">
                      <span className="text-muted-foreground block text-[10px] font-medium uppercase">Total Duration</span>
                      <span className="font-bold text-foreground font-mono text-sm">
                        {totalHours} hrs
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
                            (sub.assigned_employee_id === Number(user.id) ||
                             (sub.assigned_employee_name && sub.assigned_employee_name.toLowerCase() === (user.full_name || "").toLowerCase()))
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
                                <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-[11px]">
                                  ₹{sub.price?.toLocaleString("en-IN")}
                                </span>
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

                                {sub.duration_hours && (
                                  <span className="inline-flex items-center gap-1 font-mono">
                                    <Clock className="w-3.5 h-3.5" />
                                    {sub.duration_hours}h
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
                                <Select
                                  value={sub.status || "pending"}
                                  onValueChange={(val) => handleSubTaskStatusDirectUpdate(task, sub.id, val)}
                                >
                                  <SelectTrigger className="h-6 text-[10px] font-semibold w-28 bg-muted/20 py-0">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {allowedStatuses.map((s) => (
                                      <SelectItem key={s.id} value={s.id} className="text-xs">
                                        {s.label}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
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

                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => handleOpenEditTask(task)}>
                      <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit Task
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTask(task.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <Card className="rounded-2xl border overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-muted/50 border-b text-muted-foreground font-bold">
                <tr>
                  <th className="p-3.5 pl-4">Task / Project Name</th>
                  <th className="p-3.5">Client</th>
                  <th className="p-3.5">Sub-Tasks Breakdown</th>
                  <th className="p-3.5">Total Cost (₹)</th>
                  <th className="p-3.5">Total Duration</th>
                  <th className="p-3.5">Overall Status</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {displayedTasks.map((task) => {
                  const subTasksList = Array.isArray(task.sub_tasks) ? task.sub_tasks : [];
                  const completedSubs = subTasksList.filter((s) => s.status === "completed").length;
                  const totalCost = subTasksList.reduce((sum, s) => sum + (parseFloat(String(s.price)) || 0), 0) || parseFloat(String(task.price || 0));
                  const totalHours = subTasksList.reduce((sum, s) => sum + (parseFloat(String(s.duration_hours)) || 0), 0) || parseFloat(String(task.estimated_hours || 0));

                  const hasMySubtasks = isTaskAssignedToMe(task);

                  return (
                    <tr key={task.id} className={`hover:bg-muted/20 transition-colors ${hasMySubtasks ? "bg-emerald-500/[0.02]" : ""}`}>
                      <td className="p-3.5 pl-4 max-w-[280px]">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-foreground line-clamp-1">{task.title}</span>
                          <Badge variant="outline" className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[9px] px-1.5 py-0 gap-0.5 font-bold shrink-0">
                            <Sparkles className="w-2.5 h-2.5 text-amber-500" /> +{task.points || 20} / -{task.penalty_points || 10} pts
                          </Badge>
                          {task.is_daily_recurring && (
                            <Badge variant="outline" className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30 text-[9px] px-1.5 py-0 gap-0.5 font-bold shrink-0">
                              <RefreshCw className="w-2.5 h-2.5 text-blue-600" /> Daily Recurring
                            </Badge>
                          )}
                          {hasMySubtasks && (
                            <Badge variant="outline" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] px-1.5 py-0 gap-0.5 font-bold shrink-0">
                              <Sparkles className="w-2.5 h-2.5 text-amber-500" /> Assigned to You
                            </Badge>
                          )}
                        </div>
                        {task.details && (
                          <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{task.details}</div>
                        )}
                      </td>
                      <td className="p-3.5 font-semibold text-foreground">
                        {task.client_name || "-"}
                      </td>
                      <td className="p-3.5 max-w-[340px]">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenSubtasksModal(task)}
                            className="h-7 text-xs font-bold gap-1 bg-primary/5 text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground"
                          >
                            <Plus className="w-3.5 h-3.5" /> Manage Sub-Tasks ({subTasksList.length})
                          </Button>
                          {subTasksList.length > 0 && (
                            <span className="text-[10px] font-bold text-muted-foreground">
                              {completedSubs}/{subTasksList.length} Done
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3.5 font-bold font-mono text-sm">
                        ₹{totalCost.toLocaleString("en-IN")}
                      </td>
                      <td className="p-3.5 font-mono">
                        {totalHours} hours
                      </td>
                      <td className="p-3.5">{getStatusBadge(task.status)}</td>
                      <td className="p-3.5 pr-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => handleOpenEditTask(task)}>
                            <Edit2 className="w-3.5 h-3.5 mr-1" /> Edit
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteTask(task.id)}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* MODAL 1: Create / Edit Task / Project */}
      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent className="sm:max-w-xl w-[92vw] max-h-[90vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-primary" />
              <span>{editingTask ? "Edit Task / Project" : "Create New Task / Project"}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              First, enter the Task/Project Title, select or enter the Client Name, and add an overview. You can add sub-tasks immediately after!
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveMainTask} className="space-y-4 pt-2">
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Client Name (From Sales / Vendors)</Label>
              <Select
                value={formClientId}
                onValueChange={(val) => {
                  setFormClientId(val);
                  if (val === "none") {
                    setFormClientName("");
                  } else {
                    const selected = clients.find((c) => String(c.id) === val);
                    if (selected) {
                      setFormClientName(selected.company_name || selected.name);
                    }
                  }
                }}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="-- Select Client Account --" />
                </SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto">
                  <SelectItem value="none" className="text-xs">-- Select Client Account --</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                      {c.company_name || c.name} ({c.client_type || "Client"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formClientId === "none" && (
                <Input
                  value={formClientName}
                  onChange={(e) => setFormClientName(e.target.value)}
                  placeholder="Or type custom client name..."
                  className="text-xs h-8 mt-1.5"
                />
              )}
            </div>

            {/* Assign to Staff Member */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-primary" />
                Assign to Staff Member (Your Organization)
              </Label>
              <Select
                value={formAssignedStaffId}
                onValueChange={(val) => {
                  setFormAssignedStaffId(val);
                  if (val === "none") {
                    setFormAssignedStaffName("");
                    setFormAssignedStaffRole("");
                  } else {
                    const staff = uniqueStaffList.find((s) => String(s.id) === val);
                    if (staff) {
                      setFormAssignedStaffName(staff.name);
                      setFormAssignedStaffRole(staff.role);
                    }
                  }
                }}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="-- Select Staff Member --" />
                </SelectTrigger>
                <SelectContent className="max-h-64 overflow-y-auto">
                  <SelectItem value="none" className="text-xs">-- Unassigned (Assign Later) --</SelectItem>
                  {uniqueStaffList.map((s) => (
                    <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                      {s.name} ({s.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            {/* Points Configuration (Reward & Penalty) - Admin Only Editable */}
            {!isStaffRole ? (
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border bg-card/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <Label className="text-xs font-bold text-foreground">
                      Completion Points (Reward)
                    </Label>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      value={formPoints}
                      onChange={(e) => setFormPoints(e.target.value)}
                      placeholder="20"
                      className="text-xs h-9 font-mono bg-background"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600">
                      +PTS
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Added to staff score on completion</p>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    <Label className="text-xs font-bold text-foreground">
                      Penalty Points (Deduction)
                    </Label>
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      value={formPenaltyPoints}
                      onChange={(e) => setFormPenaltyPoints(e.target.value)}
                      placeholder="10"
                      className="text-xs h-9 font-mono bg-background text-rose-600"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-rose-600">
                      -PTS
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Deducted if uncompleted / missed</p>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl border bg-muted/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <div>
                    <span className="font-bold text-foreground block">Performance Policy (Admin Controlled)</span>
                    <span className="text-[11px] text-muted-foreground">
                      Staff receive +20 pts on completion; -10 pts penalty if missed. Points configurable by Admins only.
                    </span>
                  </div>
                </div>
                <Badge variant="outline" className="text-[10px] bg-background font-mono shrink-0">
                  +20 / -10 pts
                </Badge>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Main Task Details & Instructions</Label>
              <Textarea
                value={formDetails}
                onChange={(e) => setFormDetails(e.target.value)}
                placeholder="Overview of the project, deliverables scope, and client expectations..."
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
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
                </DialogDescription>
              </div>

              {/* Live Rollup Summary */}
              <div className="flex items-center gap-3 bg-muted/40 px-3 py-1.5 rounded-xl border text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Total Cost</span>
                  <span className="font-bold text-foreground font-mono">₹{totalSubModalCost.toLocaleString("en-IN")}</span>
                </div>
                <div className="border-l pl-3">
                  <span className="text-[10px] text-muted-foreground block">Total Duration</span>
                  <span className="font-bold text-foreground font-mono">{totalSubModalHours}h</span>
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
                    <Input
                      type="number"
                      step="100"
                      value={newSubPrice}
                      onChange={(e) => setNewSubPrice(e.target.value)}
                      placeholder="0.00"
                      className="pl-8 text-xs h-9 font-mono bg-background"
                    />
                  </div>
                </div>

                <div className="sm:col-span-4 space-y-1">
                  <Label className="text-xs font-semibold">Assign Staff Member</Label>
                  <Select value={newSubStaffId} onValueChange={setNewSubStaffId}>
                    <SelectTrigger className="text-xs h-9 bg-background">
                      <SelectValue placeholder="Assign Staff Member" />
                    </SelectTrigger>
                    <SelectContent className="max-h-64 overflow-y-auto">
                      <SelectItem value="none" className="text-xs">-- Unassigned --</SelectItem>
                      {uniqueModalStaffList.map((s) => (
                        <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                          {s.name} ({s.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 2: Duration, Deadline Date, Deadline Time, Urgency, Status */}
              <div className="grid grid-cols-2 sm:grid-cols-12 gap-3">
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs font-semibold">Duration (Hours)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={newSubDuration}
                    onChange={(e) => setNewSubDuration(e.target.value)}
                    className="text-xs h-9 font-mono bg-background"
                  />
                </div>

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

                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs font-semibold">Urgency Level</Label>
                  <Select value={newSubUrgency} onValueChange={(v: any) => setNewSubUrgency(v)}>
                    <SelectTrigger className="text-xs h-9 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBTASK_URGENCIES.map((u) => (
                        <SelectItem key={u.id} value={u.id} className="text-xs">
                          {u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-xs font-semibold">Sub-Task Status</Label>
                  <Select value={newSubStatus} onValueChange={(v: any) => setNewSubStatus(v)}>
                    <SelectTrigger className="text-xs h-9 bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedStatuses.map((s) => (
                        <SelectItem key={s.id} value={s.id} className="text-xs">
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Row 3: Points (Reward) & Penalty Points */}
              <div className="grid grid-cols-2 gap-3 p-2.5 rounded-xl border bg-muted/20">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-emerald-600" />
                    <span>Completion Points (+Reward)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={newSubPoints}
                      onChange={(e) => setNewSubPoints(e.target.value)}
                      placeholder="20"
                      className="text-xs h-8 font-mono bg-background"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-600">
                      +PTS
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-rose-600" />
                    <span>Penalty Points (-Deduction)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={newSubPenaltyPoints}
                      onChange={(e) => setNewSubPenaltyPoints(e.target.value)}
                      placeholder="10"
                      className="text-xs h-8 font-mono bg-background text-rose-600"
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
              <div className="flex items-center justify-between">
                <Label className="text-xs font-bold text-foreground">
                  Current Sub-Tasks ({activeSubTasks.length})
                </Label>
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
                          <span className="font-mono font-bold text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">
                            ₹{sub.price?.toLocaleString("en-IN")}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {getUrgencyBadge(sub.urgency)}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveSubTaskFromList(sub.id)}
                            className="h-7 w-7 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
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

                          {sub.duration_hours && (
                            <span className="inline-flex items-center gap-1 font-mono">
                              <Clock className="w-3.5 h-3.5" />
                              {sub.duration_hours}h
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
                          <Select
                            value={sub.status}
                            onValueChange={(val) => handleSubTaskStatusChangeInModal(sub.id, val)}
                          >
                            <SelectTrigger className="h-7 text-[10px] font-semibold w-28">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allowedStatuses.map((s) => (
                                <SelectItem key={s.id} value={s.id} className="text-xs">
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
    </div>
  );
}
