"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "@/store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  MoreVertical,
  Play,
  Square,
  Upload,
  Clock,
  Calendar,
  User,
  Sparkles,
  Image as ImageIcon,
  Edit2,
  History,
  Trash2,
  Users,
  Check,
  ChevronDown,
} from "lucide-react";

export interface SubtaskCardProps {
  task: any;
  subtask: any;
  index: number;
  currentUserId?: number | string | null;
  isClientView?: boolean;
  staffOptions?: Array<{ id: number | string; name: string; role?: string | null }>;
  allowedStatuses?: Array<{ id: string; label: string }>;
  onUpdateSubtask: (task: any, subtaskId: string, updates: Record<string, any>) => Promise<void> | void;
  onDeleteSubtask: (task: any, subtaskId: string) => Promise<void> | void;
  onOpenEdit: (task: any, subtask: any) => void;
  onOpenHistory: (task: any, subtask: any) => void;
  onOpenUploads: (task: any, subtask: any) => void;
  onStatusChange?: (task: any, subtaskId: string, newStatus: string) => void;
  onStart?: (task: any, subtask: any) => void;
  onStop?: (task: any, subtask: any) => void;
}

export function SubtaskCard({
  task,
  subtask,
  index,
  currentUserId,
  isClientView = false,
  staffOptions = [],
  allowedStatuses = [
    { id: "pending", label: "Pending" },
    { id: "in_progress", label: "In Progress" },
    { id: "under_review", label: "Under Review" },
    { id: "completed", label: "Completed" },
  ],
  onUpdateSubtask,
  onDeleteSubtask,
  onOpenEdit,
  onOpenHistory,
  onOpenUploads,
  onStatusChange,
  onStart,
  onStop,
}: SubtaskCardProps) {
  const [priceInput, setPriceInput] = useState<string>(
    subtask.price !== undefined ? String(subtask.price) : "0"
  );
  const [isEditingDeliverable, setIsEditingDeliverable] = useState(false);
  const [deliverableInput, setDeliverableInput] = useState(subtask.deliverable || "");

  useEffect(() => {
    setDeliverableInput(subtask.deliverable || "");
  }, [subtask.deliverable]);

  const deliverableDisplay = useMemo(() => {
    // 1. Explicit deliverable field on subtask
    if (subtask.deliverable && typeof subtask.deliverable === "string" && subtask.deliverable.trim().length > 0) {
      return subtask.deliverable.trim();
    }
    // 2. Deliverables from uploads / deliverables list
    if (Array.isArray(subtask.uploads) && subtask.uploads.length > 0) {
      const names = subtask.uploads
        .map((u: any) => u.file_name || u.name || u.notes || u.title)
        .filter((n: any) => Boolean(n) && typeof n === "string" && !n.startsWith("http"));
      if (names.length === 1) return names[0];
      if (names.length > 1) return `${names[0]} (+${names.length - 1} more)`;
    }
    // 3. Fallback to subtask.notes if available
    if (subtask.notes && typeof subtask.notes === "string" && subtask.notes.trim().length > 0) {
      return subtask.notes.trim();
    }
    return null;
  }, [subtask.deliverable, subtask.uploads, subtask.notes]);

  const deliverableTooltip = useMemo(() => {
    const list: string[] = [];
    if (subtask.deliverable) list.push(`Deliverable: ${subtask.deliverable}`);
    if (Array.isArray(subtask.uploads) && subtask.uploads.length > 0) {
      const uplNames = subtask.uploads.map((u: any, idx: number) => `${idx + 1}. ${u.file_name || u.notes || "Upload"}`);
      list.push(`Uploaded Deliverables (${subtask.uploads.length}):\n${uplNames.join("\n")}`);
    }
    return list.join("\n\n");
  }, [subtask.deliverable, subtask.uploads]);

  const handleDeliverableBlur = () => {
    setIsEditingDeliverable(false);
    const val = deliverableInput.trim();
    if (val !== (subtask.deliverable || "").trim()) {
      onUpdateSubtask(task, subtask.id, { deliverable: val || null });
    }
  };

  const currentUser = useAuthStore((state) => state.user);

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

  const canSeePrice = isPlatformAdmin || isLeader;

  useEffect(() => {
    setPriceInput(subtask.price !== undefined ? String(subtask.price) : "0");
  }, [subtask.price]);

  const isSubDone = subtask.status === "completed";
  const isRunning = subtask.status === "in_progress";

  // Collect images from uploads / image_url
  const subImages: Array<{ url: string; name?: string }> = [];
  if (Array.isArray(subtask.images)) {
    subtask.images.forEach((img: any) => img?.url && subImages.push({ url: img.url, name: img.name }));
  }
  if (Array.isArray(subtask.uploads)) {
    subtask.uploads.forEach((u: any) => {
      const url = u.file_url || u.url;
      const isImg =
        u.file_type === "png" ||
        u.file_type === "jpg" ||
        u.file_type === "jpeg" ||
        u.file_type === "webp" ||
        u.file_type === "gif" ||
        String(url || "").match(/\.(png|jpg|jpeg|webp|gif|svg)/i);
      if (url && isImg && !subImages.some((si) => si.url === url)) {
        subImages.push({ url, name: u.file_name || u.name || "Attachment" });
      }
    });
  }
  if (subtask.image_url && !subImages.some((si) => si.url === subtask.image_url)) {
    subImages.push({ url: subtask.image_url, name: subtask.image_name || "Pasted Image" });
  }

  // Count total uploads / deliverables
  const totalUploadsCount = Array.isArray(subtask.uploads) ? subtask.uploads.length : (subImages.length > 0 ? subImages.length : 0);

  const isAssignedToUser =
    !isClientView &&
    currentUserId &&
    subtask.assigned_employee_id &&
    String(subtask.assigned_employee_id) === String(currentUserId);

  // Effective staff & client options strictly assigned to this project
  const effectiveStaffOptions: Array<{ id: number | string; name: string; role?: string | null }> = [];
  if (staffOptions && staffOptions.length > 0) {
    staffOptions.forEach((s) => {
      const cleanName = s.name?.includes(",") ? s.name.split(",")[0].trim() : s.name;
      const cleanRole = s.role && s.role.includes(",") ? s.role.split(",")[0].trim() : s.role;
      if (!effectiveStaffOptions.some((existing) => String(existing.id) === String(s.id))) {
        effectiveStaffOptions.push({
          id: s.id,
          name: cleanName,
          role: cleanRole || null,
        });
      }
    });
  } else {
    // Fallback: extract directly from project assigned employees and clients
    if (Array.isArray(task.assigned_employees)) {
      task.assigned_employees.forEach((e: any) => {
        if (e && e.id && !effectiveStaffOptions.some((s) => String(s.id) === String(e.id))) {
          const rawName = e.name || e.full_name || "Staff";
          const cleanName = rawName.includes(",") ? rawName.split(",")[0].trim() : rawName;
          const rawRole = e.role || null;
          const cleanRole = rawRole && rawRole.includes(",") ? rawRole.split(",")[0].trim() : rawRole;
          effectiveStaffOptions.push({ id: e.id, name: cleanName, role: cleanRole });
        }
      });
    }
    if (task.assigned_employee_id && !effectiveStaffOptions.some((s) => String(s.id) === String(task.assigned_employee_id))) {
      const rawName = task.assigned_employee_name || "Staff";
      const cleanName = rawName.includes(",") ? rawName.split(",")[0].trim() : rawName;
      const rawRole = task.assigned_employee_role || null;
      const cleanRole = rawRole && rawRole.includes(",") ? rawRole.split(",")[0].trim() : rawRole;
      effectiveStaffOptions.push({
        id: task.assigned_employee_id,
        name: cleanName,
        role: cleanRole,
      });
    }
    if (task.project_leader_id && !effectiveStaffOptions.some((s) => String(s.id) === String(task.project_leader_id))) {
      effectiveStaffOptions.push({
        id: task.project_leader_id,
        name: task.project_leader_name || "Project Leader",
        role: "Project Leader",
      });
    }
    if (Array.isArray(task.assigned_clients)) {
      task.assigned_clients.forEach((c: any) => {
        const cId = c.user_id || c.id;
        if (cId && !effectiveStaffOptions.some((s) => String(s.id) === String(cId))) {
          effectiveStaffOptions.push({
            id: cId,
            name: c.company_name || c.name || "Client",
            role: "Client",
          });
        }
      });
    }
    if (task.client_id && task.client_name && task.client_name !== "EduBird" && !effectiveStaffOptions.some((s) => String(s.id) === String(task.client_id))) {
      effectiveStaffOptions.push({
        id: task.client_id,
        name: task.client_name,
        role: "Client",
      });
    }
  }

  // Ensure current subtask assignee is preserved in options (avoid adding comma-separated concatenated names)
  if (
    subtask.assigned_employee_id &&
    !effectiveStaffOptions.some((s) => String(s.id) === String(subtask.assigned_employee_id))
  ) {
    const rawName = subtask.assigned_employee_name || "Assigned Member";
    const cleanName = rawName.includes(",") ? rawName.split(",")[0].trim() : rawName;
    const rawRole = subtask.assigned_employee_role || null;
    const cleanRole = rawRole && rawRole.includes(",") ? rawRole.split(",")[0].trim() : rawRole;
    effectiveStaffOptions.push({
      id: subtask.assigned_employee_id,
      name: cleanName,
      role: cleanRole,
    });
  }

  const handlePriceBlur = () => {
    const val = parseFloat(priceInput) || 0;
    if (val !== Number(subtask.price ?? 0)) {
      onUpdateSubtask(task, subtask.id, { price: val });
    }
  };

  const handleCadenceChange = (val: string) => {
    onUpdateSubtask(task, subtask.id, {
      cadence: val,
      is_daily_recurring: val !== "once",
    });
  };

  const handleUrgencyChange = (val: string) => {
    onUpdateSubtask(task, subtask.id, { urgency: val });
  };

  const handleAssigneeChange = (val: string) => {
    const matched = effectiveStaffOptions.find((s) => String(s.id) === val);
    onUpdateSubtask(task, subtask.id, {
      assigned_employee_id: val === "none" ? null : parseInt(val),
      assigned_employee_name: matched ? matched.name : null,
      assigned_employee_role: matched ? matched.role : null,
    });
  };

  // Multi-employee assignees support
  const currentAssignedIds: string[] = React.useMemo(() => {
    if (Array.isArray(subtask.assigned_employees) && subtask.assigned_employees.length > 0) {
      return subtask.assigned_employees.map((e: any) => String(e.id || e.user_id));
    }
    if (subtask.assigned_employee_name) {
      const names = subtask.assigned_employee_name.split(",").map((x: string) => x.trim().toLowerCase());
      const matched = effectiveStaffOptions.filter((s) => names.includes(s.name.toLowerCase()));
      if (matched.length > 0) return matched.map((s) => String(s.id));
    }
    if (subtask.assigned_employee_id) return [String(subtask.assigned_employee_id)];
    return [];
  }, [subtask.assigned_employees, subtask.assigned_employee_name, subtask.assigned_employee_id, effectiveStaffOptions]);

  const handleToggleAssignee = (empId: string) => {
    let nextIds: string[];
    if (currentAssignedIds.includes(empId)) {
      nextIds = currentAssignedIds.filter((id) => id !== empId);
    } else {
      nextIds = [...currentAssignedIds, empId];
    }
    const selectedEmps = effectiveStaffOptions.filter((s) => nextIds.includes(String(s.id)));
    const names = selectedEmps.map((s) => s.name).join(", ");
    const primaryId = selectedEmps[0] ? Number(selectedEmps[0].id) : null;
    const primaryRole = selectedEmps[0]?.role || null;
    onUpdateSubtask(task, subtask.id, {
      assigned_employees: selectedEmps,
      assigned_employee_name: names || null,
      assigned_employee_id: primaryId,
      assigned_employee_role: primaryRole,
    });
  };

  const handleClearAssignees = () => {
    onUpdateSubtask(task, subtask.id, {
      assigned_employees: [],
      assigned_employee_name: null,
      assigned_employee_id: null,
      assigned_employee_role: null,
    });
  };

  const handleStatusSelect = (val: string) => {
    if (onStatusChange) {
      onStatusChange(task, subtask.id, val);
    } else {
      onUpdateSubtask(task, subtask.id, { status: val });
    }
  };

  const currentCadence = subtask.cadence || (subtask.is_daily_recurring ? "daily" : "once");

  return (
    <div className="p-3 rounded-2xl bg-background border border-emerald-500/20 text-xs space-y-2 hover:border-emerald-500/40 transition-all shadow-2xs">
      {/* ================= Line 1: #{index + 1}, Title, Images, Assigned to You & 3-Dots Menu ================= */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0 flex-wrap flex-1">
          <span className="font-bold text-muted-foreground text-[10px] bg-muted/60 border px-1.5 py-0.5 rounded shrink-0">
            #{index + 1}
          </span>
          <span
            className={`font-bold text-xs break-words ${
              isSubDone ? "line-through text-muted-foreground" : "text-foreground"
            }`}
          >
            {subtask.title}
          </span>

          {/* Attached Images preview pill */}
          {subImages.length > 0 && (
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenUploads(task, subtask);
                }}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-[10px] font-semibold transition-all cursor-pointer shadow-2xs shrink-0"
                title="Click to view attached deliverable images & files in popup"
              >
                <ImageIcon className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                <span>
                  {subImages.length} {subImages.length === 1 ? "image" : "images"}
                </span>
              </button>
              {subImages.slice(0, 3).map((img, iIdx) => (
                <button
                  key={iIdx}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenUploads(task, subtask);
                  }}
                  className="group/img inline-block shrink-0 cursor-pointer"
                  title={img.name || "Click to open uploaded task files & deliverables dialog"}
                >
                  <img
                    src={img.url}
                    alt={img.name || "Task Visual"}
                    className="w-5 h-5 rounded border object-cover group-hover/img:scale-125 transition-transform shadow-2xs hover:ring-2 hover:ring-primary/50"
                  />
                </button>
              ))}
            </div>
          )}

          {isAssignedToUser && (
            <Badge
              variant="outline"
              className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[9px] px-1.5 py-0 gap-1 font-semibold shrink-0"
            >
              <Sparkles className="w-2.5 h-2.5 text-amber-500" /> Assigned to You
            </Badge>
          )}
        </div>

        {/* 3-Dots Action Menu (Highlighted by User: edit, history, delete) */}
        <div className="relative shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1 rounded-md hover:bg-muted text-rose-500 hover:text-rose-600 transition-colors cursor-pointer"
                title="Subtask Actions (Edit, History, Delete)"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-36 text-xs shadow-md">
              <DropdownMenuItem
                onClick={() => onOpenEdit(task, subtask)}
                className="cursor-pointer gap-2 font-medium"
              >
                <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Edit</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onOpenHistory(task, subtask)}
                className="cursor-pointer gap-2 font-medium"
              >
                <History className="w-3.5 h-3.5 text-amber-600" />
                <span>History</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDeleteSubtask(task, subtask.id)}
                className="cursor-pointer gap-2 font-medium text-destructive focus:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ================= Line 2: Price, Cadence, Priority, Points, Assignee & Duration ================= */}
      <div className="flex items-center gap-2 flex-wrap text-[11px]">
        {/* Directly Editable Price - only visible to Leader or Platform Admin */}
        {canSeePrice && (
          <div
            className="inline-flex items-center rounded-lg border border-rose-300 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-300 shadow-2xs shrink-0"
            title="Directly edit subtask price and press Enter or blur to save"
          >
            <span className="mr-0.5 font-bold">₹</span>
            <input
              type="number"
              min="0"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onBlur={handlePriceBlur}
              className="w-14 bg-transparent font-mono outline-none text-rose-700 dark:text-rose-300 font-bold text-xs"
            />
          </div>
        )}

        {/* Directly Editable Cadence Dropdown Badge */}
        <select
          value={currentCadence}
          onChange={(e) => handleCadenceChange(e.target.value)}
          className="h-6 text-[11px] font-semibold rounded-md border border-input bg-background/90 hover:bg-muted/40 px-2 outline-none cursor-pointer text-foreground shadow-2xs shrink-0"
          title="Directly switch frequency / cadence"
        >
          <option value="once">⚡ Once</option>
          <option value="daily">🔁 Daily</option>
          <option value="weekly">📅 Weekly</option>
          <option value="monthly">🗓️ Monthly</option>
        </select>

        {/* Directly Editable Priority Dropdown Badge */}
        <select
          value={subtask.urgency || "medium"}
          onChange={(e) => handleUrgencyChange(e.target.value)}
          className={`h-6 text-[11px] font-semibold rounded-md border px-2 outline-none cursor-pointer shadow-2xs shrink-0 ${
            subtask.urgency === "urgent"
              ? "bg-rose-500/10 text-rose-700 border-rose-400 dark:text-rose-300"
              : subtask.urgency === "high"
              ? "bg-orange-500/10 text-orange-700 border-orange-400 dark:text-orange-300"
              : subtask.urgency === "low"
              ? "bg-slate-500/10 text-slate-700 border-slate-300 dark:text-slate-300"
              : "bg-blue-500/10 text-blue-700 border-blue-300 dark:text-blue-300"
          }`}
          title="Directly change priority / urgency"
        >
          <option value="low">🕒 Low</option>
          <option value="medium">🕒 Medium</option>
          <option value="high">🔥 High</option>
          <option value="urgent">🚨 Urgent</option>
        </select>

        {/* Bonus / Penalty Points */}
        <Badge
          variant="outline"
          className="bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30 text-[9px] gap-1 font-semibold shrink-0"
        >
          <Sparkles className="w-2.5 h-2.5 text-amber-500" /> +Bonus {subtask.points ?? 20} / Penalty -
          {subtask.penalty_points ?? 10} pts
        </Badge>

        {/* Multi-Employee Assignee Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="inline-flex items-center gap-1 h-6 text-[11px] font-semibold rounded-md border border-input bg-background/90 hover:bg-muted/40 px-2 outline-none cursor-pointer text-foreground max-w-[200px] truncate shadow-2xs shrink-0"
              title="Assign one or multiple team members to this sub-task"
            >
              <Users className="w-3.5 h-3.5 text-primary shrink-0" />
              <span className="truncate">
                {currentAssignedIds.length === 0
                  ? "-- Unassigned --"
                  : currentAssignedIds.length === 1
                  ? (effectiveStaffOptions.find((s) => String(s.id) === currentAssignedIds[0])?.name || subtask.assigned_employee_name || "1 staff")
                  : `${currentAssignedIds.length} Team Members (${effectiveStaffOptions.filter((s) => currentAssignedIds.includes(String(s.id))).map((s) => s.name).join(", ")})`}
              </span>
              <ChevronDown className="w-2.5 h-2.5 opacity-60 shrink-0 ml-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64 p-2 space-y-1.5 z-50">
            <div className="flex items-center justify-between border-b pb-1 px-1">
              <span className="text-[11px] font-bold text-foreground">Assign Project Team</span>
              {currentAssignedIds.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAssignees}
                  className="text-[10px] text-destructive hover:underline font-semibold cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {effectiveStaffOptions.length === 0 ? (
                <div className="text-center py-2 text-xs text-muted-foreground">No project team members found</div>
              ) : (
                effectiveStaffOptions.map((emp) => {
                  const isChecked = currentAssignedIds.includes(String(emp.id));
                  return (
                    <div
                      key={emp.id}
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleAssignee(String(emp.id));
                      }}
                      className="flex items-center justify-between p-1.5 rounded-md hover:bg-muted/80 cursor-pointer text-xs transition-colors"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Checkbox checked={isChecked} onCheckedChange={() => handleToggleAssignee(String(emp.id))} />
                        <span className="font-medium text-foreground truncate">{emp.name}</span>
                        {emp.role && <span className="text-[10px] text-muted-foreground truncate">({emp.role})</span>}
                      </div>
                      {isChecked && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1" />}
                    </div>
                  );
                })
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Duration */}
        {(Number(subtask.duration_hours) > 0 || Number(subtask.duration_minutes) > 0) && (
          <span className="inline-flex items-center gap-1 font-mono text-foreground text-[11px] shrink-0">
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            {subtask.duration_hours || 0}h {subtask.duration_minutes || 0}m
          </span>
        )}

        {/* Logged Time */}
        <span className="text-[10px] text-muted-foreground font-mono ml-auto shrink-0">
          {subtask.logged_minutes ? `${subtask.logged_minutes}m taken` : "0m taken"}
        </span>
      </div>

      {/* ================= Line 3: Status, Start/Stop (hidden on client), Deadline, Task and updates ================= */}
      <div className="flex items-center justify-between gap-2 pt-1.5 border-t text-xs flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-semibold text-muted-foreground">Status:</span>
          <select
            value={subtask.status || "pending"}
            onChange={(e) => handleStatusSelect(e.target.value)}
            className="h-7 text-xs font-semibold w-28 bg-muted/20 rounded-md border border-input px-2 outline-none cursor-pointer text-foreground shadow-2xs"
          >
            {allowedStatuses.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>

          {/* Start / Stop Button: available for both staff and client */}
          {isRunning ? (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (onStop) onStop(task, subtask);
                  else handleStatusSelect("pending");
                }}
                className="h-7 px-2.5 text-xs font-bold gap-1 text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer shadow-2xs rounded-md"
              >
                <Square className="w-3 h-3 fill-current text-rose-600" />
                <span>Stop</span>
              </Button>
              {subtask.started_by_name && (
                <span
                  className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded truncate max-w-[120px]"
                  title={`Running by ${subtask.started_by_name}`}
                >
                  {subtask.started_by_name}
                </span>
              )}
            </div>
          ) : !isSubDone ? (
            <Button
              type="button"
              size="sm"
              onClick={() => {
                if (onStart) onStart(task, subtask);
                else handleStatusSelect("in_progress");
              }}
              className="h-7 px-2.5 text-xs font-bold gap-1 bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-2xs rounded-md"
            >
              <Play className="w-3 h-3 fill-current" />
              <span>Start</span>
            </Button>
          ) : null}
        </div>

        {/* Deliverable : show here */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-[280px] sm:max-w-xs md:max-w-md">
          <span className="font-semibold text-muted-foreground text-[11px] shrink-0">
            Deliverable :
          </span>
          {isEditingDeliverable ? (
            <input
              type="text"
              autoFocus
              value={deliverableInput}
              onChange={(e) => setDeliverableInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                } else if (e.key === "Escape") {
                  setDeliverableInput(subtask.deliverable || "");
                  setIsEditingDeliverable(false);
                }
              }}
              onBlur={handleDeliverableBlur}
              placeholder="e.g. Event home page"
              className="h-6 text-[11px] font-medium px-2 py-0.5 rounded border border-primary bg-background text-foreground outline-none w-full"
            />
          ) : (
            <div className="flex items-center gap-1 min-w-0 truncate">
              <button
                type="button"
                onClick={() => onOpenUploads(task, subtask)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/40 hover:bg-muted/70 border border-border/60 transition-colors cursor-pointer truncate text-[11px] group shadow-2xs"
                title={deliverableTooltip || "Click to view / upload deliverables in dialog"}
              >
                {deliverableDisplay ? (
                  <span className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                    {deliverableDisplay}
                  </span>
                ) : (
                  <span className="text-muted-foreground/70 italic">None</span>
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditingDeliverable(true);
                }}
                className="text-muted-foreground hover:text-primary p-0.5 rounded hover:bg-muted cursor-pointer shrink-0"
                title="Edit deliverable requirement"
              >
                <Edit2 className="w-2.5 h-2.5" />
              </button>
            </div>
          )}
        </div>

        {/* Deadline & Task and updates button */}
        <div className="flex items-center gap-2 ml-auto flex-wrap">
          {subtask.deadline_date && (
            <span className="inline-flex items-center gap-1 text-muted-foreground font-mono text-[10px] bg-muted/30 px-2 py-1 rounded-md border">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span>
                {subtask.deadline_date} {subtask.deadline_time || "18:00"}
              </span>
            </span>
          )}

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onOpenUploads(task, subtask)}
            className="h-7 px-2.5 text-xs font-bold gap-1.5 text-rose-600 dark:text-rose-400 border-rose-300 dark:border-rose-800/60 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer shadow-2xs rounded-md"
            title="Upload deliverable files or view updates"
          >
            <Upload className="w-3.5 h-3.5 text-rose-600" />
            <span>Task and updates</span>
            {totalUploadsCount > 0 && (
              <Badge
                variant="secondary"
                className="text-[9px] px-1 py-0 h-4 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold ml-0.5"
              >
                {totalUploadsCount}
              </Badge>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

