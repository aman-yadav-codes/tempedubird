"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAuthStore } from "@/store";
import { toast } from "sonner";
import {
  Play,
  Square,
  Clock,
  ChevronDown,
  ListTodo,
  Search,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CheckInLocationDialog } from "@/components/check-in-location-dialog";
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
  const [popoverOpen, setPopoverOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Geo-location check-in dialog state
  const [checkInDialogOpen, setCheckInDialogOpen] = useState<boolean>(false);
  const [pendingStartTask, setPendingStartTask] = useState<TaskItem | null>(null);

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

    // Light periodic sync every 30s
    const pollInterval = setInterval(fetchTasks, 30000);

    return () => {
      window.removeEventListener("task-status-updated", handleTaskUpdated);
      window.removeEventListener("focus", handleTaskUpdated);
      clearInterval(pollInterval);
    };
  }, [fetchTasks]);

  // Find currently running active task (and subtask if any)
  const activeInfo = useMemo(() => {
    for (const t of tasks) {
      const isTaskInProgress = normalizeStatus(t.status) === "in_progress";
      const runningSub = Array.isArray(t.sub_tasks)
        ? t.sub_tasks.find((s) => normalizeStatus(s.status) === "in_progress")
        : null;

      if (isTaskInProgress || runningSub) {
        return {
          task: t,
          subtask: runningSub || null,
        };
      }
    }
    return null;
  }, [tasks]);

  const activeTask = activeInfo?.task ?? null;
  const activeSubtask = activeInfo?.subtask ?? null;

  // Running elapsed timer calculation
  useEffect(() => {
    if (!activeTask) {
      setElapsedSeconds(0);
      return;
    }

    let startTimestamp: number | null = null;

    if (Array.isArray(activeTask.history) && activeTask.history.length > 0) {
      const starts = activeTask.history
        .filter((h: any) => h.action === "started" && h.timestamp)
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (starts[0]) {
        startTimestamp = new Date(starts[0].timestamp).getTime();
      }
    }

    if (!startTimestamp && activeSubtask?.started_at) {
      startTimestamp = new Date(activeSubtask.started_at).getTime();
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

  // Handle Stop Task with stop_location
  const handleStopTask = async () => {
    if (!activeTask || isOperating) return;
    setIsOperating(true);

    try {
      // Attempt fast location capture on checkout
      let stopLoc: BrowserLocation | null = null;
      try {
        stopLoc = await captureBrowserLocation(2000);
      } catch {}

      const updatedSubs = Array.isArray(activeTask.sub_tasks)
        ? activeTask.sub_tasks.map((s) =>
            normalizeStatus(s.status) === "in_progress"
              ? { ...s, status: "pending", stopped_at: new Date().toISOString() }
              : s
          )
        : [];

      const payload: any = {
        id: activeTask.id,
        status: "pending",
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
        toast.success(`Task stopped: "${activeTask.title}". Check-out recorded.`);
        await fetchTasks();
        window.dispatchEvent(
          new CustomEvent("task-status-updated", {
            detail: { taskId: activeTask.id, status: "pending" },
          })
        );
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to stop task.");
      }
    } catch (err) {
      console.error("[AdminActiveTaskWidget] Stop error:", err);
      toast.error("Error stopping task.");
    } finally {
      setIsOperating(false);
    }
  };

  // User clicked start on a task -> Open Location confirmation dialog first!
  const initiateStartTask = (task: TaskItem) => {
    setPendingStartTask(task);
    setPopoverOpen(false);
    setCheckInDialogOpen(true);
  };

  // Confirmed check-in with location -> execute start API
  const handleConfirmStartWithLocation = async (locData: BrowserLocation | null) => {
    if (!pendingStartTask || isOperating) return;
    setIsOperating(true);

    const task = pendingStartTask;

    try {
      // If another task was active, stop it first
      if (activeTask && activeTask.id !== task.id) {
        const updatedSubs = Array.isArray(activeTask.sub_tasks)
          ? activeTask.sub_tasks.map((s) =>
              normalizeStatus(s.status) === "in_progress"
                ? { ...s, status: "pending", stopped_at: new Date().toISOString() }
                : s
            )
          : [];

        await fetch("/api/admin/operations/tasks", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            id: activeTask.id,
            status: "pending",
            action: "stop_task",
            sub_tasks: updatedSubs,
          }),
        }).catch(() => {});
      }

      const res = await fetch("/api/admin/operations/tasks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          id: task.id,
          status: "in_progress",
          action: "start_task",
          start_location: locData && locData.latitude ? locData : undefined,
        }),
      });

      if (res.ok) {
        const locLabel = locData?.latitude ? ` at ${locData.latitude.toFixed(4)}°, ${locData.longitude.toFixed(4)}°` : "";
        toast.success(`Check-In recorded${locLabel}! Task "${task.title}" started.`);
        setCheckInDialogOpen(false);
        setPendingStartTask(null);
        await fetchTasks();
        window.dispatchEvent(
          new CustomEvent("task-status-updated", {
            detail: { taskId: task.id, status: "in_progress" },
          })
        );
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to start task.");
      }
    } catch (err) {
      console.error("[AdminActiveTaskWidget] Start error:", err);
      toast.error("Error starting task.");
    } finally {
      setIsOperating(false);
    }
  };

  // Pending tasks available to be started
  const pendingTasks = useMemo(() => {
    return tasks.filter((t) => {
      const norm = normalizeStatus(t.status);
      return norm === "pending" || norm === "under_review";
    });
  }, [tasks]);

  const filteredPendingTasks = useMemo(() => {
    if (!searchQuery.trim()) return pendingTasks;
    const q = searchQuery.toLowerCase();
    return pendingTasks.filter((t) => t.title.toLowerCase().includes(q));
  }, [pendingTasks, searchQuery]);

  // Profile tasks link base
  const profileTasksHref = pathname?.startsWith("/platformadmin")
    ? "/platformadmin/my-profile?tab=tasks"
    : "/admin/my-profile?tab=tasks";

  if (!user || isClientRole) return null;

  return (
    <div className="flex items-center gap-2">
      {activeTask ? (
        // ================= ACTIVE RUNNING STATE =================
        <div className="flex items-center gap-2 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/30 rounded-xl px-2.5 sm:px-3 py-1 shadow-2xs max-w-[280px] sm:max-w-[420px] md:max-w-[520px]">
          {/* Pulsing indicator */}
          <span className="relative flex h-2.5 w-2.5 shrink-0" title="Task in progress">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>

          {/* Task Title & Subtask Info */}
          <div className="flex flex-col min-w-0 pr-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span
                className="font-semibold text-xs sm:text-sm text-foreground truncate max-w-[110px] sm:max-w-[190px] md:max-w-[280px]"
                title={activeTask.title}
              >
                {activeTask.title}
              </span>
              {activeSubtask && (
                <Badge
                  variant="outline"
                  className="hidden md:inline-flex text-[10px] py-0 px-1.5 h-4 border-emerald-500/40 text-emerald-700 dark:text-emerald-300 truncate max-w-[110px]"
                  title={activeSubtask.title}
                >
                  {activeSubtask.title}
                </Badge>
              )}
            </div>
            {activeSubtask && (
              <span className="text-[10px] text-muted-foreground md:hidden truncate max-w-[120px]">
                {activeSubtask.title}
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
            title="Stop Current Task and Record Work Duration"
            className="h-7 sm:h-8 px-2.5 sm:px-3 text-xs font-bold gap-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-2xs shrink-0 cursor-pointer transition-all ml-1"
          >
            <Square className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
            <span className="hidden sm:inline">Stop Task</span>
            <span className="sm:hidden">Stop</span>
          </Button>
        </div>
      ) : (
        // ================= IDLE / START TASK STATE =================
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              disabled={isOperating || isLoading}
              className="h-8 px-2.5 sm:px-3 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-2xs cursor-pointer transition-all shrink-0"
              title="Start a task from your assigned tasks"
            >
              <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
              <span>Start Task</span>
              <ChevronDown className="w-3 h-3 opacity-70 ml-0.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-80 sm:w-96 p-0 shadow-xl rounded-2xl border bg-popover"
            align="start"
            sideOffset={8}
          >
            <div className="p-3 border-b flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="font-bold text-sm text-foreground">Assigned Tasks</span>
              </div>
              <Badge variant="outline" className="text-[11px] font-bold">
                {pendingTasks.length} Pending
              </Badge>
            </div>

            {pendingTasks.length > 3 && (
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search task to start..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-8 text-xs pl-8 rounded-lg"
                  />
                </div>
              </div>
            )}

            <div className="max-h-72 overflow-y-auto p-2 space-y-1.5 divide-y divide-border/40">
              {filteredPendingTasks.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-muted-foreground opacity-40 mb-2" />
                  <p className="text-xs font-semibold text-foreground">No pending tasks found</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {searchQuery ? "No tasks matched your search." : "All your tasks are either in progress or completed."}
                  </p>
                  <div className="mt-3">
                    <Link
                      href={profileTasksHref}
                      onClick={() => setPopoverOpen(false)}
                      className="text-xs text-primary hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      View all tasks in profile <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ) : (
                filteredPendingTasks.map((t) => {
                  const urgency = (t.urgency || "medium").toLowerCase();
                  const urgencyClass =
                    urgency === "urgent"
                      ? "text-rose-600 bg-rose-500/10 border-rose-500/20"
                      : urgency === "high"
                      ? "text-orange-600 bg-orange-500/10 border-orange-500/20"
                      : "text-blue-600 bg-blue-500/10 border-blue-500/20";

                  return (
                    <div
                      key={t.id}
                      className="pt-1.5 first:pt-0 flex items-center justify-between gap-2 p-2 hover:bg-muted/60 rounded-xl transition-colors group"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate" title={t.title}>
                          {t.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded border ${urgencyClass}`}>
                            {urgency}
                          </span>
                          {Array.isArray(t.sub_tasks) && t.sub_tasks.length > 0 && (
                            <span className="text-[10px] text-muted-foreground">
                              • {t.sub_tasks.length} deliverable(s)
                            </span>
                          )}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={isOperating}
                        onClick={() => initiateStartTask(t)}
                        className="h-7 px-2.5 text-xs font-bold gap-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-2xs shrink-0 cursor-pointer"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Start</span>
                      </Button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-2 border-t bg-muted/30 rounded-b-2xl flex items-center justify-between text-[11px] text-muted-foreground px-3">
              <span>First task start counts as Check-In</span>
              <Link
                href={profileTasksHref}
                onClick={() => setPopoverOpen(false)}
                className="text-primary hover:underline font-semibold"
              >
                My Tasks &rarr;
              </Link>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Geo-location confirmation dialog before check-in */}
      <CheckInLocationDialog
        open={checkInDialogOpen}
        onOpenChange={setCheckInDialogOpen}
        taskTitle={pendingStartTask?.title || "Task"}
        urgency={pendingStartTask?.urgency}
        isStarting={isOperating}
        onConfirm={handleConfirmStartWithLocation}
      />
    </div>
  );
}
