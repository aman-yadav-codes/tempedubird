"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import {
  Square,
  Clock,
  Briefcase,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { captureBrowserLocation, BrowserLocation } from "@/app/lib/geolocation";

interface SubTask {
  id: string | number;
  title: string;
  status: string;
  price?: string | number;
  assigned_employee_id?: number | string | null;
  started_at?: string | null;
  stopped_at?: string | null;
}

interface TaskItem {
  id: number;
  title: string;
  status: string;
  urgency?: string;
  started_at?: string | null;
  stopped_at?: string | null;
  sub_tasks?: SubTask[];
  history?: any[];
  assigned_employee_id?: number | string | null;
  assigned_employees?: any[];
  created_by?: number | string | null;
}

function normalizeStatus(s?: string): string {
  const norm = String(s || "").toLowerCase().trim();
  if (norm === "in_progress" || norm === "inprogress") return "in_progress";
  if (norm === "under_review" || norm === "underreview") return "under_review";
  if (norm === "completed" || norm === "done") return "completed";
  if (norm === "cancelled" || norm === "canceled") return "cancelled";
  return "pending";
}

function formatDuration(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function AdminActiveTaskWidget() {
  const { user, accessToken } = useAuthStore();
  const pathname = usePathname();

  const isClientRole = useMemo(() => {
    const roleCodes: string[] = (user as any)?.role_codes || [(user as any)?.role || (user as any)?.primary_role || ""];
    return (
      roleCodes.some((r) => String(r).toLowerCase() === "client") ||
      Boolean(pathname?.startsWith("/client"))
    );
  }, [user, pathname]);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isOperating, setIsOperating] = useState<boolean>(false);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Fetch tasks assigned to current user
  const fetchTasks = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch("/api/admin/operations/tasks?scope=me&employee_id=me", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error("[AdminActiveTaskWidget] Error fetching tasks:", err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Listen to custom cross-component event and window focus
  useEffect(() => {
    const handleTaskUpdated = () => {
      fetchTasks();
    };

    window.addEventListener("task-status-updated", handleTaskUpdated);
    window.addEventListener("focus", handleTaskUpdated);

    // Periodic sync every 20s
    const pollInterval = setInterval(fetchTasks, 20000);

    return () => {
      window.removeEventListener("task-status-updated", handleTaskUpdated);
      window.removeEventListener("focus", handleTaskUpdated);
      clearInterval(pollInterval);
    };
  }, [fetchTasks]);

  // Find currently running active subtask or task for the CURRENT USER ONLY
  const activeInfo = useMemo(() => {
    if (!user?.id) return null;
    const currentUserIdStr = String(user.id);
    const currentUserNameLower = (((user as any)?.name || (user as any)?.full_name) || "").toLowerCase().trim();

    const isRunningForMe = (sub: SubTask, t: TaskItem) => {
      const isSubRunning = normalizeStatus(sub.status) === "in_progress" || Boolean(sub.started_at && !sub.stopped_at);
      if (!isSubRunning) return false;

      // 1. Explicit started_by_id check
      if ((sub as any).started_by_id) {
        return String((sub as any).started_by_id) === currentUserIdStr;
      }

      // 2. Explicit started_by_name check
      if ((sub as any).started_by_name && currentUserNameLower) {
        return String((sub as any).started_by_name).toLowerCase().trim() === currentUserNameLower;
      }

      // 3. Check history of the task for latest start action on this subtask
      if (Array.isArray(t.history)) {
        const events = t.history
          .filter((h: any) => (h.action === "started" || h.action === "stopped") && String(h.subtask_id) === String(sub.id))
          .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        if (events[0] && events[0].action === "started") {
          if (events[0].user_id) return String(events[0].user_id) === currentUserIdStr;
          if (events[0].user_name && currentUserNameLower) {
            return String(events[0].user_name).toLowerCase().trim() === currentUserNameLower;
          }
        }
      }

      // 4. Assigned employee matching
      if (sub.assigned_employee_id) {
        return String(sub.assigned_employee_id) === currentUserIdStr;
      }
      if (Array.isArray((sub as any).assigned_staff_ids)) {
        return (sub as any).assigned_staff_ids.some((id: any) => String(id) === currentUserIdStr);
      }

      // 5. If client: check client assignment
      if (isClientRole) {
        if ((sub as any).client_id && String((sub as any).client_id) === currentUserIdStr) return true;
        if (String((t as any).client_id) === currentUserIdStr) return true;
      }

      return false;
    };

    // 1. Priority 1: Subtask in_progress running for THIS user
    for (const t of tasks) {
      const subs = Array.isArray(t.sub_tasks) ? t.sub_tasks : [];
      const myRunningSub = subs.find((s) => isRunningForMe(s, t));
      if (myRunningSub) {
        return {
          task: t,
          subtask: myRunningSub,
        };
      }
    }

    // 2. Priority 2: Task history where latest start action was for THIS user
    for (const t of tasks) {
      const hist = Array.isArray(t.history) ? t.history : [];
      const lastEvent = [...hist]
        .reverse()
        .find((h) => h.action === "started" || h.action === "stopped");
      if (lastEvent && lastEvent.action === "started" && String(lastEvent.user_id) === currentUserIdStr && lastEvent.subtask_id) {
        const subs = Array.isArray(t.sub_tasks) ? t.sub_tasks : [];
        const matchSub = subs.find((s) => String(s.id) === String(lastEvent.subtask_id));
        if (matchSub && normalizeStatus(matchSub.status) === "in_progress") {
          return {
            task: t,
            subtask: matchSub,
          };
        }
      }
    }

    // 3. Priority 3: Parent task in_progress explicitly started by or assigned to THIS user
    for (const t of tasks) {
      if (normalizeStatus(t.status) === "in_progress") {
        const isMyTask =
          (t as any).started_by_id ? String((t as any).started_by_id) === currentUserIdStr
          : t.assigned_employee_id ? String(t.assigned_employee_id) === currentUserIdStr
          : isClientRole && String((t as any).client_id) === currentUserIdStr;
        if (isMyTask) {
          const subs = Array.isArray(t.sub_tasks) ? t.sub_tasks : [];
          const mySub = subs.find((s) => isRunningForMe(s, t)) || subs[0] || null;
          return {
            task: t,
            subtask: mySub,
          };
        }
      }
    }

    return null;
  }, [tasks, user, isClientRole]);

  const activeTask = activeInfo?.task ?? null;
  const activeSubtask = activeInfo?.subtask ?? null;

  // Running elapsed timer calculation
  useEffect(() => {
    if (!activeTask) {
      setElapsedSeconds(0);
      return;
    }

    let startTimestamp: number | null = null;

    if (activeSubtask?.started_at) {
      startTimestamp = new Date(activeSubtask.started_at).getTime();
    }

    if (!startTimestamp && Array.isArray(activeTask.history)) {
      const subStarts = activeTask.history
        .filter(
          (h: any) =>
            h.action === "started" &&
            (!activeSubtask || String(h.subtask_id) === String(activeSubtask.id)) &&
            h.timestamp
        )
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (subStarts[0]?.timestamp) {
        startTimestamp = new Date(subStarts[0].timestamp).getTime();
      }
    }

    if (!startTimestamp && activeTask.started_at) {
      startTimestamp = new Date(activeTask.started_at).getTime();
    }

    if (!startTimestamp || isNaN(startTimestamp)) {
      startTimestamp = Date.now();
    }

    const calcElapsed = () => Math.max(0, Math.floor((Date.now() - startTimestamp!) / 1000));
    setElapsedSeconds(calcElapsed());

    const interval = setInterval(() => {
      setElapsedSeconds(calcElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTask, activeSubtask]);

  // Handle Stop Sub-task / Task
  const handleStopTask = async () => {
    if (!activeTask || isOperating) return;
    setIsOperating(true);

    try {
      let stopLoc: BrowserLocation | null = null;
      try {
        stopLoc = await captureBrowserLocation(2000);
      } catch {}

      const updatedSubs = Array.isArray(activeTask.sub_tasks)
        ? activeTask.sub_tasks.map((s) => {
            const isMatch = activeSubtask ? String(s.id) === String(activeSubtask.id) : normalizeStatus(s.status) === "in_progress";
            return isMatch
              ? { ...s, status: "pending", stopped_at: new Date().toISOString(), stopped_by_id: user?.id, stopped_by_name: (user as any)?.name || (user as any)?.full_name }
              : s;
          })
        : [];

      const hasOtherRunningSubs = updatedSubs.some((s) => normalizeStatus(s.status) === "in_progress");

      const payload: any = {
        id: activeTask.id,
        status: hasOtherRunningSubs ? "in_progress" : "pending",
        action: "stop_task",
        sub_tasks: updatedSubs,
        stop_location: stopLoc && stopLoc.latitude ? stopLoc : undefined,
      };

      if (activeSubtask) {
        payload.subtask_id = activeSubtask.id;
        payload.subtask_title = activeSubtask.title;
      }

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const titleLabel = activeSubtask ? `Sub-task: "${activeSubtask.title}"` : `Task: "${activeTask.title}"`;
        toast.success(`${titleLabel} stopped.`);
        await fetchTasks();
        window.dispatchEvent(
          new CustomEvent("task-status-updated", {
            detail: { taskId: activeTask.id, status: "pending" },
          })
        );
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to stop sub-task.");
      }
    } catch (err) {
      console.error("[AdminActiveTaskWidget] Stop error:", err);
      toast.error("Error stopping sub-task.");
    } finally {
      setIsOperating(false);
    }
  };

  const tasksUrl = pathname?.startsWith("/client")
    ? "/client/operations/tasks"
    : pathname?.startsWith("/platformadmin")
    ? "/platformadmin/operations/tasks"
    : "/admin/operations/tasks";

  if (!user) return null;

  return (
    <div className="flex items-center gap-2">
      {activeTask ? (
        // ================= ACTIVE RUNNING STATE (SHOWS SUB-TASK NAME) =================
        <div className="flex items-center gap-2 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-2.5 sm:px-3 py-1 shadow-2xs">
          {/* Pulsing live status indicator */}
          <span className="relative flex h-2.5 w-2.5 shrink-0" title="Sub-task in progress">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>

          {/* Sub-task Name (Prominently displayed as requested) */}
          <div className="flex items-center gap-1.5 min-w-0 pr-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400 shrink-0">
              Sub-task:
            </span>
            <span
              className="font-bold text-xs sm:text-sm text-foreground truncate max-w-[130px] sm:max-w-[200px] md:max-w-[300px]"
              title={activeSubtask ? activeSubtask.title : activeTask.title}
            >
              {activeSubtask ? activeSubtask.title : activeTask.title}
            </span>
            {activeTask && activeSubtask && (
              <span
                className="hidden md:inline-flex text-[11px] text-muted-foreground truncate max-w-[130px]"
                title={activeTask.title}
              >
                ({activeTask.title})
              </span>
            )}
          </div>

          {/* Live stopwatch timer */}
          <div className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-background/90 px-2 py-0.5 rounded-md border border-emerald-500/30 shadow-2xs flex items-center gap-1 shrink-0">
            <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
            <span>{formatDuration(elapsedSeconds)}</span>
          </div>

          {/* Stop Button */}
          <Button
            size="sm"
            variant="destructive"
            disabled={isOperating}
            onClick={handleStopTask}
            title="Stop sub-task timer and record duration"
            className="h-7 sm:h-8 px-2.5 text-xs font-bold gap-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-2xs shrink-0 cursor-pointer transition-all ml-1"
          >
            <Square className="w-3 h-3 fill-current" />
            <span>Stop</span>
          </Button>
        </div>
      ) : (
        // ================= IDLE STATE (NO DROPDOWN AS REQUESTED) =================
        <Link
          href={tasksUrl}
          className="inline-flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted/70 rounded-xl border border-dashed transition-all cursor-pointer"
          title="No sub-task currently in progress. Click to open Task Management"
        >
          <span className="w-2 h-2 rounded-full bg-zinc-400 shrink-0" />
          <span>No Active Sub-task</span>
        </Link>
      )}
    </div>
  );
}
