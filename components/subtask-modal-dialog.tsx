"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  History,
  Clock,
  IndianRupee,
  Sparkles,
  AlertTriangle,
  Plus,
  Zap,
  ListPlus,
  Loader2,
  CheckCircle2,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

export interface SubtaskModalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any | null;
  editingSubtask?: any | null; // When provided, dialog opens in EDIT mode
  staffOptions?: Array<{ id: number | string; name: string; role?: string | null }>;
  isStaffViewer?: boolean;
  onSaved?: () => void | Promise<void>;
  onOpenHistory?: (task: any, subtask?: any) => void;
}

export function SubtaskModalDialog({
  open,
  onOpenChange,
  task,
  editingSubtask = null,
  staffOptions = [],
  isStaffViewer = false,
  onSaved,
  onOpenHistory,
}: SubtaskModalDialogProps) {
  const accessToken = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);

  // Check if currentUser is project leader or platform admin
  const isLeader = useMemo(() => {
    if (!currentUser) return false;
    const roleCodes: string[] = Array.isArray((currentUser as any)?.role_codes)
      ? (currentUser as any).role_codes
      : [(currentUser as any)?.role || (currentUser as any)?.primary_role || ""].filter(Boolean);
    const hasLeaderRole = roleCodes.some((r) =>
      ["leader", "project_leader", "team_leader", "head_of_operations"].includes(String(r).toLowerCase())
    );
    if (hasLeaderRole) return true;

    if (!task) return false;
    const uid = String(currentUser.id);
    const leaderId = task.project_leader_id ? String(task.project_leader_id) : null;
    const leaderName = task.project_leader_name?.toLowerCase().trim();
    const leaderEmail = task.project_leader_email?.toLowerCase().trim();
    const uName = ((currentUser as any).full_name || (currentUser as any).name || "").toLowerCase().trim();
    const uEmail = (currentUser.email || "").toLowerCase().trim();
    return Boolean(
      (leaderId && leaderId === uid) ||
      (leaderName && uName && leaderName === uName) ||
      (leaderEmail && uEmail && leaderEmail === uEmail)
    );
  }, [currentUser, task]);

  const isPlatformAdmin = useMemo(() => {
    if (!currentUser) return false;
    const roleCodes: string[] = Array.isArray((currentUser as any)?.role_codes)
      ? (currentUser as any).role_codes
      : [(currentUser as any)?.role || (currentUser as any)?.primary_role || ""].filter(Boolean);
    return roleCodes.some((r) =>
      ["platform_admin", "superadmin", "super_admin", "admin", "platformadmin", "institution_admin", "head_of_operations"].includes(
        String(r).toLowerCase()
      )
    );
  }, [currentUser]);

  // Price is only seen by leader or platform admin
  const canSeePrice = isLeader || isPlatformAdmin;
  // Leader and platform admin can modify price and points
  const canModifyPriceAndPoints = isLeader || isPlatformAdmin;

  const isEditMode = Boolean(editingSubtask);

  // Mode switcher
  const [creationMode, setCreationMode] = useState<"single" | "bulk">("single");

  // Single / Edit mode state
  const [title, setTitle] = useState("");
  const [deliverable, setDeliverable] = useState("");
  const [price, setPrice] = useState("5000");
  const [staffId, setStaffId] = useState("none");
  const [cadence, setCadence] = useState("once");
  const [durationHours, setDurationHours] = useState("4");
  const [durationMinutes, setDurationMinutes] = useState("0");
  const [dailyTime, setDailyTime] = useState("10:00");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [deadlineTime, setDeadlineTime] = useState("18:00");
  const [urgency, setUrgency] = useState<"low" | "medium" | "high" | "urgent">("medium");
  const [points, setPoints] = useState("20");
  const [penaltyPoints, setPenaltyPoints] = useState("10");
  const [images, setImages] = useState<Array<{ url: string; name?: string }>>([]);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Bulk mode state
  const [bulkText, setBulkText] = useState("");
  const [bulkStripBullets, setBulkStripBullets] = useState(true);
  const [bulkDeduplicate, setBulkDeduplicate] = useState(true);

  // Saving state
  const [saving, setSaving] = useState(false);

  // Build effective staff options
  const effectiveStaffOptions = useMemo(() => {
    const list: Array<{ id: number | string; name: string; role?: string | null }> = [];

    const addToList = (id: any, name: string, role?: string | null) => {
      if (!id) return;
      if (!list.some((s) => String(s.id) === String(id))) {
        list.push({ id, name: name || "Staff", role: role || null });
      }
    };

    if (staffOptions && staffOptions.length > 0) {
      staffOptions.forEach((s) => addToList(s.id, s.name, s.role));
    } else {
      // Pull only members and clients assigned to this project
      if (Array.isArray(task?.assigned_employees)) {
        task.assigned_employees.forEach((e: any) => {
          if (e && e.id) addToList(e.id, e.name || "Staff", e.role || null);
        });
      }
      if (task?.assigned_employee_id) {
        addToList(task.assigned_employee_id, task.assigned_employee_name || "Staff", task.assigned_employee_role || null);
      }
      if (task?.project_leader_id) {
        addToList(task.project_leader_id, task.project_leader_name || "Project Leader", "Project Leader");
      }
      if (Array.isArray(task?.assigned_clients)) {
        task.assigned_clients.forEach((c: any) => {
          const cId = c.user_id || c.id;
          if (cId) addToList(cId, c.company_name || c.name || "Client", "Client");
        });
      }
      if (task?.client_id && task?.client_name && task?.client_name !== "EduBird") {
        addToList(task.client_id, task.client_name, "Client");
      }
    }

    if (editingSubtask?.assigned_employee_id) {
      addToList(
        editingSubtask.assigned_employee_id,
        editingSubtask.assigned_employee_name || "Staff Member",
        editingSubtask.assigned_employee_role || null
      );
    }

    return list;
  }, [staffOptions, task, editingSubtask]);

  // Synchronize form on open
  useEffect(() => {
    if (!open) return;

    if (editingSubtask) {
      setCreationMode("single");
      setTitle(editingSubtask.title || "");
      setDeliverable(editingSubtask.deliverable || "");
      setPrice(
        editingSubtask.price !== undefined && editingSubtask.price !== null
          ? String(editingSubtask.price)
          : "0"
      );
      setStaffId(
        editingSubtask.assigned_employee_id
          ? String(editingSubtask.assigned_employee_id)
          : "none"
      );
      const isDaily = Boolean(editingSubtask.is_daily_recurring);
      setCadence(editingSubtask.cadence || (isDaily ? "daily" : "once"));
      setDurationHours(
        editingSubtask.duration_hours !== undefined && editingSubtask.duration_hours !== null
          ? String(editingSubtask.duration_hours)
          : "1"
      );
      setDurationMinutes(
        editingSubtask.duration_minutes !== undefined && editingSubtask.duration_minutes !== null
          ? String(editingSubtask.duration_minutes)
          : "0"
      );
      setDailyTime(editingSubtask.daily_time || "10:00");
      setDeadlineDate(editingSubtask.deadline_date || "");
      setDeadlineTime(editingSubtask.deadline_time || "18:00");
      setUrgency(editingSubtask.urgency || "medium");
      setPoints(
        editingSubtask.points !== undefined && editingSubtask.points !== null
          ? String(editingSubtask.points)
          : "20"
      );
      setPenaltyPoints(
        editingSubtask.penalty_points !== undefined && editingSubtask.penalty_points !== null
          ? String(editingSubtask.penalty_points)
          : "10"
      );
      setImages(Array.isArray(editingSubtask.images) ? editingSubtask.images : []);
    } else {
      // Adding new
      setCreationMode("single");
      setTitle("");
      setDeliverable("");
      setPrice("5000");
      const defaultStaff = effectiveStaffOptions.length === 1 ? String(effectiveStaffOptions[0].id) : "none";
      setStaffId(defaultStaff);
      setCadence(task?.is_daily_recurring ? "daily" : "once");
      setDurationHours("4");
      setDurationMinutes("0");
      setDailyTime("10:00");
      const d = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      setDeadlineDate(d.toISOString().split("T")[0]);
      setDeadlineTime("18:00");
      setUrgency("medium");
      setPoints("20");
      setPenaltyPoints("10");
      setImages([]);
      setBulkText("");
    }
  }, [open, editingSubtask, task, effectiveStaffOptions]);

  // Parse bulk text
  const parsedBulkSubtasks = useMemo(() => {
    const lines = bulkText.split(/\r?\n/);
    const seen = new Set<string>();
    const result: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i].trim();
      if (!line) continue;

      if (bulkStripBullets) {
        line = line.replace(/^(\d+[\.\)]\s*|[-*•]\s*|\[[\sxX]?\]\s*)/, "").trim();
      }
      if (!line) continue;

      const normKey = line.toLowerCase();
      if (bulkDeduplicate && seen.has(normKey)) continue;
      seen.add(normKey);

      result.push(line);
    }
    return result;
  }, [bulkText, bulkStripBullets, bulkDeduplicate]);

  // Rollups
  const subTasks: any[] = Array.isArray(task?.sub_tasks) ? task.sub_tasks : [];
  const totalCost = subTasks.reduce((sum, s) => sum + (parseFloat(String(s.price)) || 0), 0) || parseFloat(String(task?.price || 0));
  const totalMinutes = subTasks.reduce((sum, s) => {
    const h = parseFloat(String(s.duration_hours)) || 0;
    const m = parseFloat(String(s.duration_minutes)) || 0;
    return sum + (h * 60) + m;
  }, 0);
  const totalDuration = totalMinutes > 0
    ? (() => {
        const h = Math.floor(totalMinutes / 60);
        const m = Math.round(totalMinutes % 60);
        if (h > 0 && m > 0) return `${h}h ${m}m`;
        if (h > 0) return `${h}h`;
        if (m > 0) return `${m}m`;
        return "0m";
      })()
    : (parseFloat(String(task?.estimated_hours || 0)) ? `${task.estimated_hours}h` : "0h");
  const completedCount = subTasks.filter((s) => s.status === "completed").length;

  // Handle paste image
  const handlePasteImage = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          uploadSingleFile(file);
          break;
        }
      }
    }
  };

  const uploadSingleFile = async (file: File) => {
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const headers: Record<string, string> = {};
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("/api/admin/uploads/image", {
        method: "POST",
        headers,
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to upload image");
      if (data.url) {
        setImages((prev) => [...prev, { url: data.url, name: file.name }]);
        toast.success("Image attached!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to attach image");
    } finally {
      setUploadingImage(false);
    }
  };

  // Submit Handler
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!task) return;

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

    const currentSubs: any[] = Array.isArray(task.sub_tasks) ? [...task.sub_tasks] : [];
    const assignedStaff = effectiveStaffOptions.find((s) => String(s.id) === staffId);
    const parsedHours = Math.max(0, parseInt(durationHours, 10) || 0);
    const parsedMins = Math.max(0, Math.min(59, parseInt(durationMinutes, 10) || 0));
    const isDaily = cadence === "daily";

    // 1. BULK CREATION MODE
    if (!isEditMode && creationMode === "bulk") {
      if (parsedBulkSubtasks.length === 0) {
        toast.error("Please enter at least one deliverable name (one per line)");
        return;
      }
      setSaving(true);
      try {
        const now = Date.now();
        const newSubs = parsedBulkSubtasks.map((name, idx) => ({
          id: `sub_${now}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          title: name.trim(),
          price: 0,
          assigned_employee_id: assignedStaff ? assignedStaff.id : (task.assigned_employee_id || currentUser?.id),
          assigned_employee_name: assignedStaff ? assignedStaff.name : (task.assigned_employee_name || currentUser?.full_name),
          assigned_employee_role: assignedStaff ? assignedStaff.role : (task.assigned_employee_role || null),
          duration_hours: 1,
          duration_minutes: 0,
          deadline_date: null,
          deadline_time: "18:00",
          daily_time: null,
          urgency: "medium",
          status: "pending",
          is_daily_recurring: false,
          cadence: "once",
          points: 20,
          penalty_points: 10,
          images: [],
          uploads: [],
          work_updates: [],
        }));

        const updated = [...newSubs, ...currentSubs];
        const res = await fetch("/api/admin/operations/tasks", {
          method: "PUT",
          headers,
          body: JSON.stringify({ id: task.id, sub_tasks: updated }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to add bulk sub-tasks");

        toast.success(`Successfully added ${newSubs.length} sub-tasks!`);
        if (onSaved) await onSaved();
        onOpenChange(false);
      } catch (err: any) {
        toast.error(err.message || "Failed to add sub-tasks");
      } finally {
        setSaving(false);
      }
      return;
    }

    // 2. SINGLE / EDIT MODE
    if (!title.trim()) {
      toast.error("Please enter a deliverable / sub-task name");
      return;
    }

    setSaving(true);
    try {
      let updated: any[] = [];
      if (isEditMode) {
        updated = currentSubs.map((s) => {
          if (String(s.id) !== String(editingSubtask.id)) return s;
          return {
            ...s,
            title: title.trim(),
            deliverable: deliverable.trim() || null,
            price: canModifyPriceAndPoints
              ? (parseFloat(price) || 0)
              : (editingSubtask?.price !== undefined ? parseFloat(String(editingSubtask.price)) || 0 : 0),
            assigned_employee_id: assignedStaff ? assignedStaff.id : null,
            assigned_employee_name: assignedStaff ? assignedStaff.name : null,
            assigned_employee_role: assignedStaff ? assignedStaff.role : null,
            cadence,
            is_daily_recurring: isDaily,
            duration_hours: parsedHours,
            duration_minutes: parsedMins,
            daily_time: isDaily ? (dailyTime || "10:00") : null,
            deadline_date: isDaily ? null : (deadlineDate || null),
            deadline_time: isDaily ? (dailyTime || "10:00") : (deadlineTime || "18:00"),
            urgency,
            points: canModifyPriceAndPoints
              ? (parseFloat(points) || 20)
              : (editingSubtask?.points !== undefined ? parseFloat(String(editingSubtask.points)) || 20 : 20),
            penalty_points: canModifyPriceAndPoints
              ? (parseFloat(penaltyPoints) || 10)
              : (editingSubtask?.penalty_points !== undefined ? parseFloat(String(editingSubtask.penalty_points)) || 10 : 10),
            images,
          };
        });
      } else {
        const newSub = {
          id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          title: title.trim(),
          deliverable: deliverable.trim() || null,
          price: parseFloat(price) || 0,
          assigned_employee_id: assignedStaff ? assignedStaff.id : (task.assigned_employee_id || currentUser?.id),
          assigned_employee_name: assignedStaff ? assignedStaff.name : (task.assigned_employee_name || currentUser?.full_name),
          assigned_employee_role: assignedStaff ? assignedStaff.role : (task.assigned_employee_role || null),
          cadence,
          is_daily_recurring: isDaily,
          duration_hours: parsedHours,
          duration_minutes: parsedMins,
          daily_time: isDaily ? (dailyTime || "10:00") : null,
          deadline_date: isDaily ? null : (deadlineDate || null),
          deadline_time: isDaily ? (dailyTime || "10:00") : (deadlineTime || "18:00"),
          urgency,
          status: "pending",
          points: parseFloat(points) || 20,
          penalty_points: parseFloat(penaltyPoints) || 10,
          images,
          uploads: [],
          work_updates: [],
        };
        updated = [newSub, ...currentSubs];
      }

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers,
        body: JSON.stringify({ id: task.id, sub_tasks: updated }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save sub-task");

      toast.success(isEditMode ? "Sub-task updated successfully!" : "Sub-task added successfully!");
      if (onSaved) await onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to save sub-task");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-3xl md:max-w-4xl max-h-[92vh] overflow-y-auto p-5 sm:p-6 rounded-2xl shadow-2xl">
        <DialogHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
            <div>
              <DialogTitle className="text-lg font-bold flex items-center gap-2">
                <Layers className="w-5 h-5 text-primary" />
                <span>
                  {isEditMode ? "Edit Sub-Task / Deliverable" : "Sub-Tasks Deliverables & Assignments"}
                </span>
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                Project: <strong className="text-foreground">{task?.title}</strong>
                {task?.client_name && (
                  <span> • Client: <strong className="text-primary">{task.client_name}</strong></span>
                )}
              </DialogDescription>
            </div>

            {/* Live Rollup Summary & History button (Done & Close removed per user request) */}
            <div className="flex items-center gap-2.5 flex-wrap">
              <div className="flex items-center gap-3 bg-muted/40 px-3 py-1.5 rounded-xl border text-xs">
                {canSeePrice && (
                  <div>
                    <span className="text-[10px] text-muted-foreground block">Total Cost</span>
                    <span className="font-bold text-foreground font-mono tracking-wider">
                      ₹{Math.round(totalCost).toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
                <div className={canSeePrice ? "border-l pl-3" : ""}>
                  <span className="text-[10px] text-muted-foreground block">Total Duration</span>
                  <span className="font-bold text-foreground font-mono">{totalDuration}</span>
                </div>
                <div className="border-l pl-3">
                  <span className="text-[10px] text-muted-foreground block">Completed</span>
                  <span className="font-bold text-emerald-600 font-mono">
                    {completedCount}/{subTasks.length}
                  </span>
                </div>
              </div>

              {onOpenHistory && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenHistory(task, editingSubtask || undefined)}
                  className="h-8 px-3 text-xs font-bold gap-1.5 text-muted-foreground hover:text-foreground cursor-pointer shadow-2xs"
                  title="View Task History & Geolocation"
                >
                  <History className="w-3.5 h-3.5 text-primary" />
                  <span>History</span>
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="p-4 rounded-xl border bg-card/60 space-y-3 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-foreground uppercase tracking-wider text-primary">
                {isEditMode ? "✏️ Edit Sub-Task Deliverable" : "+ Add New Sub-Task Deliverable"}
              </p>
              <span className="text-[11px] text-muted-foreground">
                {isEditMode ? "Modify fields and save changes" : "Fill in fields and click Add"}
              </span>
            </div>

            {/* Mode Switcher: Single vs Bulk (Only when creating) */}
            {!isEditMode && (
              <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border">
                <button
                  type="button"
                  onClick={() => setCreationMode("single")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    creationMode === "single"
                      ? "bg-background text-foreground shadow-xs border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Single Sub-Task</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreationMode("bulk")}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    creationMode === "bulk"
                      ? "bg-background text-foreground shadow-xs border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ListPlus className="w-3.5 h-3.5 text-primary" />
                  <span>Bulk Sub-Tasks (Paste Multiple)</span>
                  {parsedBulkSubtasks.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-mono font-bold ml-1">
                      {parsedBulkSubtasks.length}
                    </Badge>
                  )}
                </button>
              </div>
            )}

            {/* BULK MODE: Textarea & formatting checkboxes ONLY */}
            {!isEditMode && creationMode === "bulk" ? (
              <div className="space-y-2 p-3.5 bg-muted/20 rounded-xl border">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <span>Paste Deliverable Names (One per line) *</span>
                  </Label>
                  <span className="text-[11px] font-mono font-bold text-primary">
                    {parsedBulkSubtasks.length} {parsedBulkSubtasks.length === 1 ? "task" : "tasks"} detected
                  </span>
                </div>
                <Textarea
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder={`e.g.\n1. Design Homepage wireframes\n2. Integrate Payment Gateway\n3. Write API test cases\n4. Prepare Deployment checklist`}
                  rows={6}
                  className="text-xs font-mono bg-background resize-y leading-relaxed"
                  autoFocus
                />
                <div className="flex flex-wrap items-center gap-4 pt-0.5 text-xs text-muted-foreground">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={bulkStripBullets}
                      onChange={(e) => setBulkStripBullets(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary w-3.5 h-3.5"
                    />
                    <span className="text-[11px] font-medium">Clean bullets & numbering (1., -, •)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={bulkDeduplicate}
                      onChange={(e) => setBulkDeduplicate(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary w-3.5 h-3.5"
                    />
                    <span className="text-[11px] font-medium">Remove duplicate lines</span>
                  </label>
                </div>
              </div>
            ) : (
              <>
                {/* SINGLE / EDIT MODE */}
                {/* Row 1: Name, Cost, Assign Staff, Frequency & Cadence - All in ONE Row (Image 1) */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">Sub-Task Name *</Label>
                      <span className="text-[9px] text-muted-foreground">Ctrl+V paste image</span>
                    </div>
                    <div className="relative">
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onPaste={handlePasteImage}
                        placeholder="e.g. Curriculum Design, Lab Setup..."
                        className="text-xs h-9 bg-background pr-7"
                        autoFocus
                      />
                      <label
                        className="absolute right-2 top-2 text-muted-foreground hover:text-primary cursor-pointer p-0.5"
                        title="Attach image"
                      >
                        <ImageIcon className="w-3.5 h-3.5" />
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => e.target.files?.[0] && uploadSingleFile(e.target.files[0])}
                        />
                      </label>
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs font-semibold truncate block">Task Cost / Price (₹)</Label>
                    <div className="relative">
                      <IndianRupee className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      {!canSeePrice ? (
                        <Input
                          type="text"
                          value="★★★★★"
                          disabled
                          className="pl-7 text-xs h-9 font-mono bg-muted/40 cursor-not-allowed select-none text-muted-foreground font-bold tracking-wider"
                        />
                      ) : (
                        <Input
                          type="number"
                          step="100"
                          value={price}
                          disabled={!canModifyPriceAndPoints}
                          onChange={(e) => setPrice(e.target.value)}
                          placeholder="0.00"
                          className="pl-7 text-xs h-9 font-mono bg-background"
                        />
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold truncate">Assign Staff Member</Label>
                      {effectiveStaffOptions.length > 0 && (
                        <span className="text-[9px] text-primary font-bold bg-primary/10 px-1 py-0.5 rounded">
                          Project Team ({effectiveStaffOptions.length})
                        </span>
                      )}
                    </div>
                    <select
                      value={staffId}
                      onChange={(e) => setStaffId(e.target.value)}
                      className="w-full h-9 text-xs bg-background rounded-md border border-input px-2 font-medium outline-none focus:ring-1 focus:ring-ring cursor-pointer text-foreground truncate"
                    >
                      <option value="none">-- Unassigned --</option>
                      {effectiveStaffOptions.map((s) => (
                        <option key={s.id} value={String(s.id)}>
                          {s.name} {s.role ? `(${s.role})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-3 space-y-1">
                    <Label className="text-xs font-semibold flex items-center gap-1 truncate">
                      <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span>Task Frequency & Cadence *</span>
                    </Label>
                    <select
                      value={cadence}
                      onChange={(e) => setCadence(e.target.value)}
                      className="w-full text-xs h-9 bg-background border border-input rounded-md px-2 font-medium outline-none cursor-pointer text-foreground"
                    >
                      <option value="once">⚡ Once (One-Time)</option>
                      <option value="daily">🔁 Daily Basis</option>
                      <option value="weekly">📅 Weekly Basis</option>
                      <option value="monthly">🗓️ Monthly Basis</option>
                    </select>
                  </div>
                </div>

                {/* Deliverable Details / Requirement */}
                <div className="space-y-1">
                  <Label className="text-xs font-semibold flex items-center justify-between">
                    <span>Deliverable Details / Requirement</span>
                    <span className="text-[10px] text-muted-foreground font-normal">Shown on sub-task card</span>
                  </Label>
                  <Input
                    value={deliverable}
                    onChange={(e) => setDeliverable(e.target.value)}
                    placeholder="e.g. Event home page, Wireframes, Mobile responsive test"
                    className="text-xs h-9 bg-background"
                  />
                </div>

                {/* Uploaded Images Preview */}
                {uploadingImage && (
                  <div className="flex items-center gap-1.5 text-xs text-primary font-medium p-2 rounded-lg bg-primary/10">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Uploading image...</span>
                  </div>
                )}
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2 p-2 bg-muted/40 rounded-xl border">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-border bg-background">
                        <img src={img.url} alt={img.name || "Attachment"} className="h-12 w-16 object-cover" />
                        <button
                          type="button"
                          onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                          className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-sm opacity-90 hover:opacity-100 cursor-pointer"
                          title="Remove image"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Row 2: Scheduling, Duration, Urgency & Performance Points */}
                {cadence === "daily" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3 rounded-xl border bg-muted/10">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Duration Required</Label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={durationHours}
                            onChange={(e) => setDurationHours(e.target.value)}
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
                            value={durationMinutes}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || (Number(val) >= 0 && Number(val) <= 59)) {
                                setDurationMinutes(val);
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

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>Exact Daily Time</span>
                      </Label>
                      <Input
                        type="time"
                        value={dailyTime}
                        onChange={(e) => setDailyTime(e.target.value)}
                        className="text-xs h-9 bg-background font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Urgency Level</Label>
                      <select
                        value={urgency}
                        onChange={(e) => setUrgency(e.target.value as any)}
                        className="w-full h-9 text-xs bg-background rounded-md border border-input px-3 font-medium outline-none focus:ring-1 focus:ring-ring cursor-pointer text-foreground"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="grid grid-cols-2 gap-1.5">
                        <Label className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5 truncate">
                          <Sparkles className="w-2.5 h-2.5 shrink-0" />
                          +Reward PTS
                        </Label>
                        <Label className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-0.5 truncate">
                          <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                          -Penalty PTS
                        </Label>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="relative">
                          <Input
                            type="number"
                            value={points}
                            onChange={(e) => setPoints(e.target.value)}
                            disabled={!canModifyPriceAndPoints}
                            placeholder="20"
                            className={`text-xs h-9 font-mono bg-background pr-7 ${!canModifyPriceAndPoints ? "cursor-not-allowed opacity-80 bg-muted/40" : ""}`}
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-600 pointer-events-none">
                            +PTS
                          </span>
                        </div>
                        <div className="relative">
                          <Input
                            type="number"
                            value={penaltyPoints}
                            onChange={(e) => setPenaltyPoints(e.target.value)}
                            disabled={!canModifyPriceAndPoints}
                            placeholder="10"
                            className={`text-xs h-9 font-mono bg-background text-rose-600 pr-7 ${!canModifyPriceAndPoints ? "cursor-not-allowed opacity-80 bg-muted/40" : ""}`}
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-rose-600 pointer-events-none">
                            -PTS
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 p-3 rounded-xl border bg-muted/10">
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Duration of Task</Label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="relative">
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={durationHours}
                            onChange={(e) => setDurationHours(e.target.value)}
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
                            value={durationMinutes}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "" || (Number(val) >= 0 && Number(val) <= 59)) {
                                setDurationMinutes(val);
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

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Deadline Date</Label>
                      <Input
                        type="date"
                        value={deadlineDate}
                        onChange={(e) => setDeadlineDate(e.target.value)}
                        className="text-xs h-9 bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Deadline Time</Label>
                      <Input
                        type="time"
                        value={deadlineTime}
                        onChange={(e) => setDeadlineTime(e.target.value)}
                        className="text-xs h-9 bg-background"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-semibold">Urgency Level</Label>
                      <select
                        value={urgency}
                        onChange={(e) => setUrgency(e.target.value as any)}
                        className="w-full h-9 text-xs bg-background rounded-md border border-input px-3 font-medium outline-none focus:ring-1 focus:ring-ring cursor-pointer text-foreground"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <div className="grid grid-cols-2 gap-1.5">
                        <Label className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-0.5 truncate">
                          <Sparkles className="w-2.5 h-2.5 shrink-0" />
                          +Reward PTS
                        </Label>
                        <Label className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-0.5 truncate">
                          <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                          -Penalty PTS
                        </Label>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="relative">
                          <Input
                            type="number"
                            value={points}
                            onChange={(e) => setPoints(e.target.value)}
                            disabled={!canModifyPriceAndPoints}
                            placeholder="20"
                            className={`text-xs h-9 font-mono bg-background pr-7 ${!canModifyPriceAndPoints ? "cursor-not-allowed opacity-80 bg-muted/40" : ""}`}
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-emerald-600 pointer-events-none">
                            +PTS
                          </span>
                        </div>
                        <div className="relative">
                          <Input
                            type="number"
                            value={penaltyPoints}
                            onChange={(e) => setPenaltyPoints(e.target.value)}
                            disabled={!canModifyPriceAndPoints}
                            placeholder="10"
                            className={`text-xs h-9 font-mono bg-background text-rose-600 pr-7 ${!canModifyPriceAndPoints ? "cursor-not-allowed opacity-80 bg-muted/40" : ""}`}
                          />
                          <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-rose-600 pointer-events-none">
                            -PTS
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-end pt-1">
              <Button
                type="submit"
                size="sm"
                disabled={
                  saving ||
                  uploadingImage ||
                  (!isEditMode && creationMode === "bulk" && parsedBulkSubtasks.length === 0)
                }
                className="h-9 px-5 text-xs font-bold gap-1.5 shadow-sm cursor-pointer bg-red-600 hover:bg-red-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1" />
                    <span>Saving...</span>
                  </>
                ) : isEditMode ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    <span>Save Changes</span>
                  </>
                ) : creationMode === "bulk" ? (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    <span>
                      Add {parsedBulkSubtasks.length > 0 ? parsedBulkSubtasks.length : ""} Sub-Tasks in Bulk
                    </span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-1" />
                    <span>Add Sub-Task to List</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
