"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ListPlus,
  Trash2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Users,
  Building2,
  Zap,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  RotateCcw,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Sliders,
  IndianRupee,
  UserCheck,
  CheckSquare,
  Square,
  Settings,
  Paperclip,
  FileText,
  FileCode,
  FileSpreadsheet,
  Video,
  Image as ImageIcon,
  ExternalLink,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { PROJECT_CURRENCIES } from "./page";

export interface StaffOption {
  id: number;
  name: string;
  role?: string | null;
  email?: string | null;
}

export interface ClientOption {
  id: number | string;
  name: string;
  company_name?: string | null;
}

export interface BulkAddTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffList: StaffOption[];
  clientsList?: ClientOption[];
  isInstitutionAdmin?: boolean;
  isPlatformRoute?: boolean;
  activeInstitutionId?: number | null;
  accessToken?: string | null;
  onSuccess: () => Promise<void> | void;
}

export interface TaskAttachment {
  name: string;
  url: string;
  type?: string;
  size?: number;
  uploaded_at?: string;
}

export interface IndividualTaskConfig {
  id: string;
  title: string;
  assigned_employee_id: string; // "none" or staff ID
  urgency: "low" | "medium" | "high" | "urgent";
  cadence: "once" | "daily" | "weekly" | "monthly";
  duration_hours: string;
  duration_minutes: string;
  deadline_date: string;
  deadline_time: string;
  cost: string;
  details?: string;
  attachments?: TaskAttachment[];
  isExpanded?: boolean;
}

export function BulkAddTasksDialog({
  open,
  onOpenChange,
  staffList,
  clientsList = [],
  isInstitutionAdmin = false,
  isPlatformRoute = false,
  activeInstitutionId,
  accessToken,
  onSuccess,
}: BulkAddTasksDialogProps) {
  const [step, setStep] = useState<"input" | "review">("input");
  const [rawText, setRawText] = useState("");
  const [stripBullets, setStripBullets] = useState(true);
  const [deduplicate, setDeduplicate] = useState(true);

  // Parsed list of tasks in review mode
  const [tasksList, setTasksList] = useState<IndividualTaskConfig[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  // Shared project attributes applied as defaults to tasks
  const [sharedProjectFor, setSharedProjectFor] = useState<"own_company" | "client">("own_company");
  const [sharedClientId, setSharedClientId] = useState("none");
  const [sharedClientName, setSharedClientName] = useState("");
  const [sharedStaffId, setSharedStaffId] = useState("none");
  const [sharedUrgency, setSharedUrgency] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [sharedCadence, setSharedCadence] = useState<"once" | "daily" | "weekly" | "monthly">("once");
  const [sharedDurationHours, setSharedDurationHours] = useState("1");
  const [sharedStartDate, setSharedStartDate] = useState(
    () => new Date().toISOString().split("T")[0]
  );
  const [sharedDueDate, setSharedDueDate] = useState("");
  const [sharedCost, setSharedCost] = useState("0");
  const [sharedCurrency, setSharedCurrency] = useState("INR");
  const [sharedDetails, setSharedDetails] = useState("");

  // Multi-Task Selection & Bulk Editing Panel State
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [uploadingTaskId, setUploadingTaskId] = useState<string | null>(null);
  const [bulkApplyAttachments, setBulkApplyAttachments] = useState(false);
  const [bulkSelectedAttachments, setBulkSelectedAttachments] = useState<TaskAttachment[]>([]);
  const [uploadingBulkAtt, setUploadingBulkAtt] = useState(false);

  const getFileIcon = (fileName: string) => {
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".pdf")) return <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />;
    if (lower.endsWith(".doc") || lower.endsWith(".docx")) return <FileCode className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
    if (lower.endsWith(".xls") || lower.endsWith(".xlsx") || lower.endsWith(".csv")) return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
    if (lower.endsWith(".mp4") || lower.endsWith(".mov") || lower.endsWith(".webm") || lower.endsWith(".avi")) return <Video className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
    if (lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp") || lower.endsWith(".gif")) return <ImageIcon className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
    return <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />;
  };

  const handleUploadTaskFile = async (taskId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingTaskId(taskId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", "task_attachment");
      const res = await fetch("/api/admin/uploads/documents", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const url = data.data?.url || data.url;
      const newAtt: TaskAttachment = {
        name: file.name,
        url,
        type: file.name.split(".").pop()?.toLowerCase(),
        size: file.size,
        uploaded_at: new Date().toISOString(),
      };
      setTasksList((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? { ...t, attachments: [...(t.attachments || []), newAtt] }
            : t
        )
      );
      toast.success(`Attached "${file.name}" to task`);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setUploadingTaskId(null);
      e.target.value = "";
    }
  };

  const handleRemoveTaskFile = (taskId: string, fileIdx: number) => {
    setTasksList((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const updated = [...(t.attachments || [])];
        updated.splice(fileIdx, 1);
        return { ...t, attachments: updated };
      })
    );
  };

  const handleUploadBulkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBulkAtt(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("documentType", "bulk_task_attachment");
      const res = await fetch("/api/admin/uploads/documents", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const url = data.data?.url || data.url;
      const newAtt: TaskAttachment = {
        name: file.name,
        url,
        type: file.name.split(".").pop()?.toLowerCase(),
        size: file.size,
        uploaded_at: new Date().toISOString(),
      };
      setBulkSelectedAttachments((prev) => [...prev, newAtt]);
      setBulkApplyAttachments(true);
      toast.success(`Attached "${file.name}" ready to apply to selected tasks`);
    } catch (err: any) {
      toast.error(err.message || "Failed to upload file");
    } finally {
      setUploadingBulkAtt(false);
      e.target.value = "";
    }
  };
  const RANDOM_BULK_TASK_NAMES = [
    "Fix UI Layout & Responsive Alignment",
    "Implement Design from Mockup",
    "Resolve Visual Glitch on Mobile",
    "Update Section Styling per Screenshot",
    "Refactor Component per Design Reference",
    "Review Screen Deliverable & Polish",
    "Fix Theme & Spacing Inconsistency",
    "Frontend Bug Fix from Visual Proof",
    "Implement Header & Navigation Update",
    "Design Adaptation for Dashboard Card",
    "Optimize Visual Assets & Render Bug",
    "Fix Button & Hover Styling Discrepancy",
    "Update Banner & Hero Graphic Layout",
    "Verify Cross-Browser Visual Alignment",
    "Implement Customer Feedback Visual Revision",
  ];

  const generateRandomTaskName = () => {
    const base = RANDOM_BULK_TASK_NAMES[Math.floor(Math.random() * RANDOM_BULK_TASK_NAMES.length)];
    const idNum = Math.floor(100 + Math.random() * 900);
    return `${base} #${idNum}`;
  };

  const handlePasteImageToTask = async (taskId: string, e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    let imageFile: File | null = null;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith("image/")) {
        imageFile = items[i].getAsFile();
        break;
      }
    }

    if (!imageFile) return;

    e.preventDefault();
    const randomTitle = generateRandomTaskName();
    setUploadingTaskId(taskId);
    setTasksList((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, title: t.title.trim().length > 0 ? t.title : randomTitle } : t))
    );

    const toastId = toast.loading("Uploading pasted image...");
    try {
      const formData = new FormData();
      formData.append("file", imageFile);
      formData.append("documentType", "task_image_paste");

      const res = await fetch("/api/admin/uploads/documents", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload image");

      const imageUrl = data.data?.url || data.url;
      const newAtt: TaskAttachment = {
        name: imageFile.name || `pasted_image_${Date.now()}.png`,
        url: imageUrl,
        type: "png",
        size: imageFile.size,
        uploaded_at: new Date().toISOString(),
      };

      setTasksList((prev) =>
        prev.map((t) =>
          t.id === taskId
            ? {
                ...t,
                attachments: [...(t.attachments || []), newAtt],
                title: t.title.trim().length > 0 ? t.title : randomTitle,
              }
            : t
        )
      );
      toast.success(`Image attached to "${randomTitle}"!`, { id: toastId });
    } catch (err: any) {
      toast.error(err.message || "Failed to upload pasted image", { id: toastId });
    } finally {
      setUploadingTaskId(null);
    }
  };

    const [bulkApplyAssignee, setBulkApplyAssignee] = useState(false);
  const [bulkValueAssignee, setBulkValueAssignee] = useState("none");
  const [bulkApplyUrgency, setBulkApplyUrgency] = useState(false);
  const [bulkValueUrgency, setBulkValueUrgency] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [bulkApplyCadence, setBulkApplyCadence] = useState(false);
  const [bulkValueCadence, setBulkValueCadence] = useState<"once" | "daily" | "weekly" | "monthly">("once");
  const [bulkApplyDuration, setBulkApplyDuration] = useState(false);
  const [bulkValueDuration, setBulkValueDuration] = useState("1");
  const [bulkApplyDeadline, setBulkApplyDeadline] = useState(false);
  const [bulkValueDeadline, setBulkValueDeadline] = useState("");
  const [bulkApplyCost, setBulkApplyCost] = useState(false);
  const [bulkValueCost, setBulkValueCost] = useState("0");

  const [saving, setSaving] = useState(false);
  const [failedTasks, setFailedTasks] = useState<{ title: string; error: string }[]>([]);

  // Parsing logic: creates IndividualTaskConfig items inheriting shared defaults
  const parseLines = (text: string, cleanBullets: boolean, removeDups: boolean): IndividualTaskConfig[] => {
    const lines = text.split(/\r?\n/);
    const seen = new Set<string>();
    const result: IndividualTaskConfig[] = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      if (cleanBullets) {
        line = line.replace(/^(\d+[\.\)]\s*|[-*•]\s*|\[[\sxX]?\]\s*)/, "").trim();
      }

      if (!line) continue;

      const normKey = line.toLowerCase();
      if (removeDups && seen.has(normKey)) {
        continue;
      }
      seen.add(normKey);

      result.push({
        id: `bulk_task_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        title: line,
        assigned_employee_id: sharedStaffId,
        urgency: sharedUrgency,
        cadence: sharedCadence,
        duration_hours: sharedDurationHours,
        duration_minutes: "0",
        deadline_date: sharedDueDate,
        deadline_time: "18:00",
        cost: sharedCost || "0",
        isExpanded: false,
      });
    }

    return result;
  };

  // Real-time preview count while typing in textarea
  const livePreview = useMemo(() => {
    return parseLines(rawText, stripBullets, deduplicate);
  }, [rawText, stripBullets, deduplicate, sharedStaffId, sharedUrgency, sharedCadence, sharedDurationHours, sharedDueDate, sharedCost]);

  const handleProceedToReview = () => {
    const parsed = parseLines(rawText, stripBullets, deduplicate);
    if (parsed.length === 0) {
      toast.error("Please enter at least one task (one task per line)");
      return;
    }
    setTasksList(parsed);
    setSelectedTaskIds(new Set());
    setFailedTasks([]);
    setStep("review");
  };

  const handleBackToInput = () => {
    setStep("input");
  };

  // Individual Task Updates
  const handleUpdateTaskField = <K extends keyof IndividualTaskConfig>(
    id: string,
    field: K,
    value: IndividualTaskConfig[K]
  ) => {
    setTasksList((prev) =>
      prev.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  };

  const handleToggleTaskExpand = (id: string) => {
    setTasksList((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExpanded: !t.isExpanded } : t))
    );
  };

  const handleRemoveTask = (id: string) => {
    setTasksList((prev) => prev.filter((t) => t.id !== id));
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleAddNewTaskRow = () => {
    const newId = `bulk_task_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setTasksList((prev) => [
      ...prev,
      {
        id: newId,
        title: "",
        assigned_employee_id: sharedStaffId,
        urgency: sharedUrgency,
        cadence: sharedCadence,
        duration_hours: sharedDurationHours,
        duration_minutes: "0",
        deadline_date: sharedDueDate,
        deadline_time: "18:00",
        cost: sharedCost || "0",
        isExpanded: true,
      },
    ]);
  };

  // Selection Logic
  const isAllSelected = tasksList.length > 0 && selectedTaskIds.size === tasksList.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(tasksList.map((t) => t.id)));
    }
  };

  const handleToggleSelectTask = (id: string) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDeleteSelected = () => {
    if (selectedTaskIds.size === 0) return;
    const count = selectedTaskIds.size;
    setTasksList((prev) => prev.filter((t) => !selectedTaskIds.has(t.id)));
    setSelectedTaskIds(new Set());
    toast.success(`Removed ${count} selected task${count === 1 ? "" : "s"}`);
  };

  // Multi-Task Bulk Update Application
  const handleApplyBulkSettings = () => {
    if (selectedTaskIds.size === 0) {
      toast.error("Please select at least one task to edit");
      return;
    }

    const hasAnyFieldSelected =
      bulkApplyAssignee ||
      bulkApplyUrgency ||
      bulkApplyCadence ||
      bulkApplyDuration ||
      bulkApplyDeadline ||
      bulkApplyCost;

    if (!hasAnyFieldSelected) {
      toast.info("Please check at least one field to update for the selected tasks");
      return;
    }

    setTasksList((prev) =>
      prev.map((t) => {
        if (!selectedTaskIds.has(t.id)) return t;
        return {
          ...t,
          ...(bulkApplyAssignee ? { assigned_employee_id: bulkValueAssignee } : {}),
          ...(bulkApplyUrgency ? { urgency: bulkValueUrgency } : {}),
          ...(bulkApplyCadence ? { cadence: bulkValueCadence } : {}),
          ...(bulkApplyDuration ? { duration_hours: bulkValueDuration } : {}),
          ...(bulkApplyDeadline ? { deadline_date: bulkValueDeadline } : {}),
          ...(bulkApplyCost ? { cost: bulkValueCost } : {}),
        };
      })
    );

    toast.success(`Updated settings for ${selectedTaskIds.size} selected tasks`);
    setBulkEditOpen(false);
  };

  // Apply Shared Defaults to All
  const handleApplySharedDefaultsToAll = () => {
    if (tasksList.length === 0) return;
    setTasksList((prev) =>
      prev.map((t) => ({
        ...t,
        assigned_employee_id: sharedStaffId,
        urgency: sharedUrgency,
        cadence: sharedCadence,
        duration_hours: sharedDurationHours,
        deadline_date: sharedDueDate,
        cost: sharedCost || "0",
      }))
    );
    toast.success("Applied shared default settings to all tasks");
  };

  // Helper to get staff name
  const getStaffName = (staffId: string) => {
    if (!staffId || staffId === "none") return "Unassigned";
    const st = staffList.find((s) => String(s.id) === String(staffId));
    return st ? st.name : "Staff";
  };

  // Final Submission
  const handleCreateAllTasks = async () => {
    const validTasks = tasksList.filter((t) => t.title.trim().length > 0);
    if (validTasks.length === 0) {
      toast.error("Please ensure at least one valid task with a title exists");
      return;
    }

    setSaving(true);
    setFailedTasks([]);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const selectedClient = clientsList.find((c) => String(c.id) === sharedClientId);
      const clientName = selectedClient ? (selectedClient.company_name || selectedClient.name) : sharedClientName;

      const payload = {
        bulk: true,
        institution_id: isPlatformRoute ? 1 : (activeInstitutionId || 1),
        shared: {
          project_for: sharedProjectFor,
          company_name: sharedProjectFor === "own_company" ? "EduBird" : (clientName.trim() || null),
          client_id: sharedProjectFor === "client" && sharedClientId !== "none" ? sharedClientId : null,
          client_name: sharedProjectFor === "client" ? (clientName.trim() || "Client") : "EduBird",
          status: "pending",
          start_date: sharedStartDate ? new Date(sharedStartDate).toISOString() : null,
          currency: sharedCurrency,
          details: sharedDetails.trim() || null,
        },
        tasks: validTasks.map((t) => {
          const staffObj = staffList.find((s) => String(s.id) === String(t.assigned_employee_id));
          return {
            title: t.title.trim(),
            details: t.details || null,
            urgency: t.urgency,
            cadence: t.cadence,
            is_daily_recurring: t.cadence !== "once",
            duration_hours: parseFloat(t.duration_hours) || 1,
            cost: parseFloat(t.cost) || 0,
            deadline: t.deadline_date ? new Date(t.deadline_date).toISOString() : null,
            assigned_employee_id: staffObj ? staffObj.id : (t.assigned_employee_id !== "none" ? Number(t.assigned_employee_id) : null),
            assigned_employee_name: staffObj ? staffObj.name : null,
            assigned_employee_role: staffObj ? (staffObj.role || null) : null,
            assigned_employee_email: staffObj ? (staffObj.email || null) : null,
            assigned_employees: staffObj ? [{ id: staffObj.id, name: staffObj.name, role: staffObj.role || null, email: staffObj.email || null }] : [],
            attachments: t.attachments || [],
          };
        }),
      };

      const res = await fetch("/api/admin/operations/tasks", {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to bulk create tasks");
      }

      if (data.failed && data.failed.length > 0) {
        setFailedTasks(data.failed);
        const failedTitles = new Set(data.failed.map((f: any) => f.title.toLowerCase()));
        setTasksList((prev) => prev.filter((t) => failedTitles.has(t.title.trim().toLowerCase())));
        toast.warning(
          `Created ${data.createdCount} tasks, but ${data.failed.length} failed. You can fix and retry below.`
        );
        await onSuccess();
      } else {
        toast.success(`🎉 Successfully created all ${data.createdCount || validTasks.length} tasks!`);
        setRawText("");
        setTasksList([]);
        setSelectedTaskIds(new Set());
        setStep("input");
        onOpenChange(false);
        await onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || "Bulk task creation failed");
    } finally {
      setSaving(false);
    }
  };

  const handleResetDialog = () => {
    setRawText("");
    setTasksList([]);
    setSelectedTaskIds(new Set());
    setFailedTasks([]);
    setStep("input");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && (v ? onOpenChange(v) : handleResetDialog())}>
      <DialogContent className="sm:max-w-4xl w-[96vw] max-h-[92vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader className="border-b pb-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <ListPlus className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                  <span>Bulk Add Tasks</span>
                  <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/30">
                    {step === "input" ? `${livePreview.length} Detected` : `${tasksList.length} Tasks`}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {step === "input"
                    ? "Paste or type multiple tasks below. Each new line automatically becomes a separate task."
                    : "Configure individual task settings or select multiple tasks to bulk-edit settings at once."}
                </DialogDescription>
              </div>
            </div>

            {/* Step indicator */}
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span
                className={`px-2 py-0.5 rounded-full ${
                  step === "input"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                1. Paste
              </span>
              <span className="text-muted-foreground">→</span>
              <span
                className={`px-2 py-0.5 rounded-full ${
                  step === "review"
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                2. Individual & Bulk Edit
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-0 pr-1">
          {step === "input" ? (
            <div className="space-y-3">
              {/* Textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground">
                    Paste Tasks List (One task per line) *
                  </Label>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    Supports 10, 50, 100+ tasks
                  </span>
                </div>
                <Textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={`Fix login page responsive issue\nUpdate homepage banner\nCreate new restaurant category\nCheck Google Search Console errors\nOptimize listing page loading speed\nFix mobile navigation menu`}
                  className="font-mono text-xs leading-relaxed min-h-[260px] p-3 resize-y bg-background"
                />
              </div>

              {/* Options Row */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-muted/30 border text-xs">
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                    <input
                      type="checkbox"
                      checked={stripBullets}
                      onChange={(e) => setStripBullets(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <span>Clean bullet points & numbering (e.g. 1., -, *)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer font-medium select-none">
                    <input
                      type="checkbox"
                      checked={deduplicate}
                      onChange={(e) => setDeduplicate(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <span>Remove duplicate lines</span>
                  </label>
                </div>

                <Badge
                  variant={livePreview.length > 0 ? "default" : "secondary"}
                  className="text-xs font-bold px-2.5 py-1"
                >
                  {livePreview.length} Task{livePreview.length === 1 ? "" : "s"} Detected
                </Badge>
              </div>

              {/* Sample helper tip */}
              <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-[11px] text-blue-800 dark:text-blue-300 space-y-1">
                <p className="font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Quick Tips:
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-0.5 pl-1">
                  <li>In the next step, you can customize each task individually or select multiple tasks to bulk-update their assignees, urgency, duration, or deadlines!</li>
                  <li>Empty lines are automatically ignored.</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Failed alert if retry */}
              {failedTasks.length > 0 && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 text-xs space-y-1">
                  <p className="font-bold flex items-center gap-1.5 text-rose-700 dark:text-rose-400">
                    <AlertCircle className="w-4 h-4" />
                    {failedTasks.length} task(s) could not be saved. Modify details below and retry:
                  </p>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                    {failedTasks.map((f, i) => (
                      <li key={i}>
                        <strong>{f.title}:</strong> {f.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Shared Default Settings Bar (Collapsible / Customizable) */}
              <div className="p-3.5 rounded-xl border bg-muted/20 space-y-2.5">
                <div className="flex items-center justify-between border-b pb-2 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider text-primary">
                      <Zap className="w-3.5 h-3.5" /> Shared Default Settings
                    </span>
                    <span className="text-[10px] text-muted-foreground">(Inherited by new tasks)</span>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleApplySharedDefaultsToAll}
                    className="h-7 text-[11px] font-semibold gap-1 text-primary border-primary/30 hover:bg-primary/5 cursor-pointer"
                    title="Reset all individual tasks to match these shared defaults"
                  >
                    <RotateCcw className="w-3 h-3" /> Apply Defaults to All Tasks
                  </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
                  {/* Project For */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Project For</Label>
                    <select
                      value={sharedProjectFor}
                      onChange={(e) => setSharedProjectFor(e.target.value as any)}
                      className="w-full h-8 text-xs bg-background rounded border border-input px-2 font-medium cursor-pointer"
                    >
                      <option value="own_company">EduBird (Own)</option>
                      <option value="client">Client</option>
                    </select>
                  </div>

                  {/* Assignee */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Default Assignee</Label>
                    <select
                      value={sharedStaffId}
                      onChange={(e) => setSharedStaffId(e.target.value)}
                      className="w-full h-8 text-xs bg-background rounded border border-input px-2 font-medium cursor-pointer"
                    >
                      <option value="none">Unassigned</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.name} ({s.role || "Staff"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Urgency */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Default Urgency</Label>
                    <select
                      value={sharedUrgency}
                      onChange={(e) => setSharedUrgency(e.target.value as any)}
                      className="w-full h-8 text-xs bg-background rounded border border-input px-2 font-medium cursor-pointer"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  {/* Cadence */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Default Cadence</Label>
                    <select
                      value={sharedCadence}
                      onChange={(e) => setSharedCadence(e.target.value as any)}
                      className="w-full h-8 text-xs bg-background rounded border border-input px-2 font-medium cursor-pointer"
                    >
                      <option value="once">Once</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>

                  {/* Due Date */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Default Due Date</Label>
                    <Input
                      type="date"
                      value={sharedDueDate}
                      onChange={(e) => setSharedDueDate(e.target.value)}
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Cost */}
                  <div className="space-y-1">
                    <Label className="text-[10px] font-semibold text-muted-foreground">Default Cost (₹)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={sharedCost}
                      onChange={(e) => setSharedCost(e.target.value)}
                      className="h-8 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Multi-Task Selection Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl bg-card border shadow-2xs">
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold select-none text-foreground">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                    />
                    <span>Select All ({tasksList.length})</span>
                  </label>

                  {selectedTaskIds.size > 0 && (
                    <Badge variant="secondary" className="text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary">
                      {selectedTaskIds.size} Selected
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {selectedTaskIds.size > 0 && (
                    <>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setBulkEditOpen((v) => !v)}
                        className="h-7 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground cursor-pointer shadow-xs"
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Edit Selected ({selectedTaskIds.size})</span>
                        {bulkEditOpen ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleDeleteSelected}
                        className="h-7 text-xs font-bold gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Selected</span>
                      </Button>
                    </>
                  )}

                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAddNewTaskRow}
                    className="h-7 text-xs font-bold gap-1 text-primary border-primary/30 hover:bg-primary/5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Task
                  </Button>
                </div>
              </div>

              {/* Multi-Task Bulk Edit Drawer / Panel */}
              {bulkEditOpen && selectedTaskIds.size > 0 && (
                <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between border-b border-primary/20 pb-2">
                    <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                      <Sliders className="w-4 h-4" />
                      Bulk Update Settings for {selectedTaskIds.size} Selected Task(s)
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      Only checked fields will be updated
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                    {/* Bulk Assignee */}
                    <div className="p-2 rounded-lg border bg-background space-y-1.5">
                      <label className="flex items-center gap-1.5 font-bold cursor-pointer text-foreground text-xs select-none">
                        <input
                          type="checkbox"
                          checked={bulkApplyAssignee}
                          onChange={(e) => setBulkApplyAssignee(e.target.checked)}
                          className="rounded border-input text-primary w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Update Assignee</span>
                      </label>
                      <select
                        disabled={!bulkApplyAssignee}
                        value={bulkValueAssignee}
                        onChange={(e) => setBulkValueAssignee(e.target.value)}
                        className={`w-full h-8 text-xs rounded border border-input px-2 font-medium ${
                          bulkApplyAssignee ? "bg-background cursor-pointer text-foreground" : "bg-muted text-muted-foreground opacity-60"
                        }`}
                      >
                        <option value="none">Unassigned</option>
                        {staffList.map((s) => (
                          <option key={s.id} value={String(s.id)}>
                            {s.name} ({s.role || "Staff"})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Bulk Urgency */}
                    <div className="p-2 rounded-lg border bg-background space-y-1.5">
                      <label className="flex items-center gap-1.5 font-bold cursor-pointer text-foreground text-xs select-none">
                        <input
                          type="checkbox"
                          checked={bulkApplyUrgency}
                          onChange={(e) => setBulkApplyUrgency(e.target.checked)}
                          className="rounded border-input text-primary w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Update Urgency</span>
                      </label>
                      <select
                        disabled={!bulkApplyUrgency}
                        value={bulkValueUrgency}
                        onChange={(e) => setBulkValueUrgency(e.target.value as any)}
                        className={`w-full h-8 text-xs rounded border border-input px-2 font-medium ${
                          bulkApplyUrgency ? "bg-background cursor-pointer text-foreground" : "bg-muted text-muted-foreground opacity-60"
                        }`}
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent / Critical</option>
                      </select>
                    </div>

                    {/* Bulk Cadence */}
                    <div className="p-2 rounded-lg border bg-background space-y-1.5">
                      <label className="flex items-center gap-1.5 font-bold cursor-pointer text-foreground text-xs select-none">
                        <input
                          type="checkbox"
                          checked={bulkApplyCadence}
                          onChange={(e) => setBulkApplyCadence(e.target.checked)}
                          className="rounded border-input text-primary w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Update Cadence</span>
                      </label>
                      <select
                        disabled={!bulkApplyCadence}
                        value={bulkValueCadence}
                        onChange={(e) => setBulkValueCadence(e.target.value as any)}
                        className={`w-full h-8 text-xs rounded border border-input px-2 font-medium ${
                          bulkApplyCadence ? "bg-background cursor-pointer text-foreground" : "bg-muted text-muted-foreground opacity-60"
                        }`}
                      >
                        <option value="once">⚡ Once</option>
                        <option value="daily">🔁 Daily</option>
                        <option value="weekly">📅 Weekly</option>
                        <option value="monthly">🗓️ Monthly</option>
                      </select>
                    </div>

                    {/* Bulk Duration */}
                    <div className="p-2 rounded-lg border bg-background space-y-1.5">
                      <label className="flex items-center gap-1.5 font-bold cursor-pointer text-foreground text-xs select-none">
                        <input
                          type="checkbox"
                          checked={bulkApplyDuration}
                          onChange={(e) => setBulkApplyDuration(e.target.checked)}
                          className="rounded border-input text-primary w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Update Duration (Hours)</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        disabled={!bulkApplyDuration}
                        value={bulkValueDuration}
                        onChange={(e) => setBulkValueDuration(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    {/* Bulk Deadline */}
                    <div className="p-2 rounded-lg border bg-background space-y-1.5">
                      <label className="flex items-center gap-1.5 font-bold cursor-pointer text-foreground text-xs select-none">
                        <input
                          type="checkbox"
                          checked={bulkApplyDeadline}
                          onChange={(e) => setBulkApplyDeadline(e.target.checked)}
                          className="rounded border-input text-primary w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Update Deadline Date</span>
                      </label>
                      <Input
                        type="date"
                        disabled={!bulkApplyDeadline}
                        value={bulkValueDeadline}
                        onChange={(e) => setBulkValueDeadline(e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    {/* Bulk Cost */}
                    <div className="p-2 rounded-lg border bg-background space-y-1.5">
                      <label className="flex items-center gap-1.5 font-bold cursor-pointer text-foreground text-xs select-none">
                        <input
                          type="checkbox"
                          checked={bulkApplyCost}
                          onChange={(e) => setBulkApplyCost(e.target.checked)}
                          className="rounded border-input text-primary w-3.5 h-3.5 cursor-pointer"
                        />
                        <span>Update Task Cost (₹)</span>
                      </label>
                      <Input
                        type="number"
                        min="0"
                        disabled={!bulkApplyCost}
                        value={bulkValueCost}
                        onChange={(e) => setBulkValueCost(e.target.value)}
                        className="h-8 text-xs font-mono"
                      />
                    </div>

                    {/* Bulk Attachments */}
                    <div className="p-2 rounded-lg border bg-background space-y-1.5 sm:col-span-2 lg:col-span-3">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-1.5 font-bold cursor-pointer text-foreground text-xs select-none">
                          <input
                            type="checkbox"
                            checked={bulkApplyAttachments}
                            onChange={(e) => setBulkApplyAttachments(e.target.checked)}
                            className="rounded border-input text-primary w-3.5 h-3.5 cursor-pointer"
                          />
                          <Paperclip className="w-3.5 h-3.5 text-primary" />
                          <span>Attach Files to Selected Tasks (Images, Video, PDF, Word, Excel)</span>
                        </label>
                        <span className="text-[10px] text-muted-foreground">Appends to existing files</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-dashed border-primary/50 hover:bg-primary/5 cursor-pointer text-xs font-semibold text-primary transition-colors">
                          {uploadingBulkAtt ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                          <span>{uploadingBulkAtt ? "Uploading..." : "Upload & Attach to Selected"}</span>
                          <input
                            type="file"
                            disabled={uploadingBulkAtt}
                            accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            onChange={handleUploadBulkFile}
                            className="hidden"
                          />
                        </label>
                        {bulkSelectedAttachments.map((att, fIdx) => (
                          <div key={fIdx} className="inline-flex items-center gap-1 px-2 py-1 rounded bg-muted text-[11px] font-medium border">
                            {getFileIcon(att.name)}
                            <span className="max-w-[120px] truncate">{att.name}</span>
                            <button
                              type="button"
                              onClick={() => setBulkSelectedAttachments((prev) => prev.filter((_, i) => i !== fIdx))}
                              className="text-destructive hover:bg-destructive/10 p-0.5 rounded"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-primary/20">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setBulkEditOpen(false)}
                      className="h-8 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleApplyBulkSettings}
                      className="h-8 px-4 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Apply to {selectedTaskIds.size} Selected Tasks</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* Tasks Review List with Individual Configuration */}
              <div className="space-y-2">
                <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                  {tasksList.map((task, idx) => {
                    const isSelected = selectedTaskIds.has(task.id);
                    return (
                      <div
                        key={task.id}
                        className={`p-2.5 rounded-xl border transition-all text-xs space-y-2 ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-xs ring-1 ring-primary/30"
                            : "bg-background hover:border-primary/40 shadow-2xs"
                        }`}
                      >
                        {/* Task Card Header */}
                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          {/* Checkbox */}
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectTask(task.id)}
                            className="rounded border-input text-primary focus:ring-primary w-4 h-4 cursor-pointer shrink-0"
                          />

                          {/* Index */}
                          <span className="font-mono font-bold text-muted-foreground text-[10px] bg-muted/60 border px-1.5 py-0.5 rounded shrink-0">
                            #{idx + 1}
                          </span>

                          {/* Editable Title with Ctrl+V image paste */}
                          <Input
                            value={task.title}
                            onChange={(e) => handleUpdateTaskField(task.id, "title", e.target.value)}
                            onPaste={(e) => handlePasteImageToTask(task.id, e)}
                            placeholder="Enter task title... (or paste image with Ctrl+V)"
                            className="h-8 text-xs font-semibold flex-1 bg-transparent min-w-[180px]"
                          />

                          {/* Quick Badges (Collapsed summary) */}
                          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                            {/* Urgency Badge */}
                            <Badge
                              variant="outline"
                              className={`text-[9px] px-1.5 py-0 font-bold uppercase ${
                                task.urgency === "urgent"
                                  ? "bg-rose-500/10 text-rose-700 border-rose-500/30"
                                  : task.urgency === "high"
                                  ? "bg-amber-500/10 text-amber-700 border-amber-500/30"
                                  : task.urgency === "low"
                                  ? "bg-slate-500/10 text-slate-700 border-slate-500/30"
                                  : "bg-blue-500/10 text-blue-700 border-blue-500/30"
                              }`}
                            >
                              {task.urgency}
                            </Badge>

                            {/* Assignee Badge */}
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-medium max-w-[120px] truncate">
                              <UserCheck className="w-2.5 h-2.5 mr-1 text-primary shrink-0" />
                              <span className="truncate">{getStaffName(task.assigned_employee_id)}</span>
                            </Badge>

                            {/* Deadline Badge */}
                            {task.deadline_date && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-muted-foreground font-mono">
                                <Calendar className="w-2.5 h-2.5 mr-1" />
                                {task.deadline_date}
                              </Badge>
                            )}

                            {/* Cost Badge */}
                            {parseFloat(task.cost) > 0 && (
                              <span className="font-mono font-bold text-primary text-[10px] bg-primary/10 px-1.5 py-0.5 rounded">
                                ₹{task.cost}
                              </span>
                            )}

                            {/* Attachments Badge */}
                            {task.attachments && task.attachments.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] bg-violet-500/10 text-violet-700 dark:text-violet-300 font-bold px-1.5 py-0.5 rounded border border-violet-500/20">
                                <Paperclip className="w-2.5 h-2.5" />
                                {task.attachments.length} file{task.attachments.length > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>

                          {/* Expand/Collapse Individual Settings Button */}
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleTaskExpand(task.id)}
                            className="h-8 px-2 text-[11px] font-semibold gap-1 text-muted-foreground hover:text-foreground shrink-0 cursor-pointer"
                            title="Configure individual task settings"
                          >
                            <Settings className="w-3.5 h-3.5 text-primary" />
                            <span className="hidden sm:inline">Settings</span>
                            {task.isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </Button>

                          {/* Delete Task Button */}
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={() => handleRemoveTask(task.id)}
                            className="h-8 w-8 text-destructive hover:bg-destructive/10 shrink-0 cursor-pointer"
                            title="Remove this task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>

                        {/* Individual Task Config Form (Expanded view) */}
                        {task.isExpanded && (
                          <>
                          <div className="pt-2 border-t border-border/60 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 bg-muted/20 p-2.5 rounded-lg text-xs">
                            {/* Individual Assignee */}
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                <Users className="w-2.5 h-2.5" /> Assignee
                              </Label>
                              <select
                                value={task.assigned_employee_id}
                                onChange={(e) => handleUpdateTaskField(task.id, "assigned_employee_id", e.target.value)}
                                className="w-full h-7 text-[11px] bg-background rounded border border-input px-1.5 font-medium cursor-pointer"
                              >
                                <option value="none">Unassigned</option>
                                {staffList.map((s) => (
                                  <option key={s.id} value={String(s.id)}>
                                    {s.name} ({s.role || "Staff"})
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Individual Urgency */}
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                <Zap className="w-2.5 h-2.5" /> Urgency
                              </Label>
                              <select
                                value={task.urgency}
                                onChange={(e) => handleUpdateTaskField(task.id, "urgency", e.target.value as any)}
                                className="w-full h-7 text-[11px] bg-background rounded border border-input px-1.5 font-medium cursor-pointer"
                              >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                              </select>
                            </div>

                            {/* Individual Cadence */}
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                <Clock className="w-2.5 h-2.5" /> Cadence
                              </Label>
                              <select
                                value={task.cadence}
                                onChange={(e) => handleUpdateTaskField(task.id, "cadence", e.target.value as any)}
                                className="w-full h-7 text-[11px] bg-background rounded border border-input px-1.5 font-medium cursor-pointer"
                              >
                                <option value="once">Once</option>
                                <option value="daily">Daily</option>
                                <option value="weekly">Weekly</option>
                                <option value="monthly">Monthly</option>
                              </select>
                            </div>

                            {/* Individual Duration */}
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-muted-foreground">Duration (Hours)</Label>
                              <Input
                                type="number"
                                min="0"
                                value={task.duration_hours}
                                onChange={(e) => handleUpdateTaskField(task.id, "duration_hours", e.target.value)}
                                className="h-7 text-[11px] font-mono"
                              />
                            </div>

                            {/* Individual Deadline */}
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-2.5 h-2.5" /> Deadline
                              </Label>
                              <Input
                                type="date"
                                value={task.deadline_date}
                                onChange={(e) => handleUpdateTaskField(task.id, "deadline_date", e.target.value)}
                                className="h-7 text-[11px]"
                              />
                            </div>

                            {/* Individual Cost */}
                            <div className="space-y-1">
                              <Label className="text-[10px] font-semibold text-muted-foreground flex items-center gap-1">
                                <IndianRupee className="w-2.5 h-2.5" /> Cost (₹)
                              </Label>
                              <Input
                                type="number"
                                min="0"
                                value={task.cost}
                                onChange={(e) => handleUpdateTaskField(task.id, "cost", e.target.value)}
                                className="h-7 text-[11px] font-mono"
                              />
                            </div>
                          </div>

                          {/* Task Attachments Section (Images, Video, PDF, Word, Excel) */}
                          <div className="pt-2 border-t space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                                <Paperclip className="w-3.5 h-3.5 text-primary" />
                                Task Attachments / Media (Images, Video, PDF, Word, Excel)
                              </Label>
                              <label className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer transition-colors">
                                {uploadingTaskId === task.id ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Upload className="w-3 h-3" />
                                )}
                                <span>{uploadingTaskId === task.id ? "Uploading..." : "+ Attach File"}</span>
                                <input
                                  type="file"
                                  disabled={uploadingTaskId === task.id}
                                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                                  onChange={(e) => handleUploadTaskFile(task.id, e)}
                                  className="hidden"
                                />
                              </label>
                            </div>

                            {(!task.attachments || task.attachments.length === 0) ? (
                              <p className="text-[11px] text-muted-foreground italic">
                                No files attached to this task. Click &quot;+ Attach File&quot; to upload an image, video, PDF, Word or Excel file.
                              </p>
                            ) : (
                              <div className="flex flex-wrap items-center gap-1.5">
                                {task.attachments.map((file, fIdx) => (
                                  <div
                                    key={fIdx}
                                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/70 hover:bg-muted border text-[11px] transition-colors"
                                  >
                                    {getFileIcon(file.name)}
                                    <span className="font-medium max-w-[140px] truncate" title={file.name}>
                                      {file.name}
                                    </span>
                                    {file.size && (
                                      <span className="text-[9px] text-muted-foreground">
                                        ({(file.size / 1024).toFixed(0)} KB)
                                      </span>
                                    )}
                                    <a
                                      href={file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline ml-0.5"
                                      title="Open file in new tab"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveTaskFile(task.id, fIdx)}
                                      className="text-destructive hover:bg-destructive/10 p-0.5 rounded transition-colors ml-0.5"
                                      title="Remove attachment"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          </>
                        )}
                      </div>
                    );
                  })}

                  {tasksList.length === 0 && (
                    <div className="text-center py-8 border border-dashed rounded-xl text-xs text-muted-foreground">
                      No tasks in list. Click &quot;Add Task&quot; or go back to paste.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="border-t pt-3 shrink-0 flex items-center justify-between sm:justify-between w-full">
          {step === "input" ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleResetDialog}
                disabled={saving}
                className="text-xs h-9"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleProceedToReview}
                disabled={livePreview.length === 0}
                className="text-xs font-bold h-9 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm cursor-pointer"
              >
                <span>Review {livePreview.length} Tasks</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleBackToInput}
                disabled={saving}
                className="text-xs h-9 gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Input</span>
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetDialog}
                  disabled={saving}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateAllTasks}
                  disabled={saving || tasksList.filter((t) => t.title.trim().length > 0).length === 0}
                  className="text-xs font-bold h-9 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md cursor-pointer"
                >
                  {saving ? (
                    <>
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      <span>Creating Tasks...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Create All {tasksList.filter((t) => t.title.trim().length > 0).length} Tasks</span>
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
