"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  History,
  Clock,
  Calendar,
  User,
  MapPin,
  ExternalLink,
  Play,
  Square,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Layers,
  Sparkles,
} from "lucide-react";

export interface TaskHistoryEvent {
  id: string;
  action: "created" | "started" | "stopped" | "completed" | "status_changed" | "modified" | string;
  timestamp: string;
  user_id?: number | string | null;
  user_name?: string | null;
  user_role?: string | null;
  old_status?: string | null;
  new_status?: string | null;
  subtask_id?: string | null;
  subtask_title?: string | null;
  location?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    address?: string;
  } | null;
  details?: string | null;
}

interface TaskHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: any | null;
}

export function TaskHistoryDialog({ open, onOpenChange, task }: TaskHistoryDialogProps) {
  if (!task) return null;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return String(dateStr);
    }
  };

  const rawHistory: TaskHistoryEvent[] = Array.isArray(task.history) ? task.history : [];

  // Look for timestamps in task fields, history events, or subtasks
  const startedEvent = rawHistory.find((e) => e.action === "started");
  const stoppedEvent = rawHistory.find((e) => e.action === "stopped");
  const completedEvent = rawHistory.find((e) => e.action === "completed");

  const subWithStart = Array.isArray(task.sub_tasks) ? task.sub_tasks.find((s: any) => s.started_at) : null;
  const subWithStop = Array.isArray(task.sub_tasks) ? task.sub_tasks.find((s: any) => s.stopped_at) : null;

  const effectiveStartedAt = task.started_at || startedEvent?.timestamp || subWithStart?.started_at || null;
  const effectiveStoppedAt = task.stopped_at || stoppedEvent?.timestamp || subWithStop?.stopped_at || null;
  const effectiveCompletedAt = task.completed_at || completedEvent?.timestamp || (task.status === "completed" ? task.updated_at : null);

  // Construct display events list, ensuring all milestones are represented
  const displayEvents: TaskHistoryEvent[] = [...rawHistory];

  if (!displayEvents.some((e) => e.action === "created") && task.created_at) {
    displayEvents.push({
      id: "synth_created",
      action: "created",
      timestamp: task.created_at,
      user_name: task.created_by_name || "Creator",
      details: "Task created",
      new_status: "pending",
    });
  }

  if (!displayEvents.some((e) => e.action === "started") && effectiveStartedAt) {
    displayEvents.push({
      id: "synth_started",
      action: "started",
      timestamp: effectiveStartedAt,
      user_name: task.assigned_employee_name || "Assignee",
      details: subWithStart?.title ? `Deliverable "${subWithStart.title}" started` : "Task started",
      location: task.start_location,
      new_status: "in_progress",
    });
  }

  if (!displayEvents.some((e) => e.action === "stopped") && effectiveStoppedAt) {
    displayEvents.push({
      id: "synth_stopped",
      action: "stopped",
      timestamp: effectiveStoppedAt,
      user_name: task.assigned_employee_name || "Assignee",
      details: subWithStop?.title ? `Deliverable "${subWithStop.title}" stopped` : "Task stopped",
      new_status: "pending",
    });
  }

  if (!displayEvents.some((e) => e.action === "completed") && effectiveCompletedAt) {
    displayEvents.push({
      id: "synth_completed",
      action: "completed",
      timestamp: effectiveCompletedAt,
      user_name: task.assigned_employee_name || "Assignee",
      details: "Task marked as completed",
      new_status: "completed",
    });
  }

  // Sort newest first
  displayEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Detect latest location
  const latestLocation =
    task.start_location ||
    displayEvents.find((e) => e.location?.latitude)?.location ||
    null;

  const getActionBadge = (action: string) => {
    switch (action) {
      case "started":
        return (
          <Badge className="bg-blue-600 text-white gap-1 text-[10px] font-bold">
            <Play className="w-2.5 h-2.5 fill-current" /> Started
          </Badge>
        );
      case "stopped":
        return (
          <Badge className="bg-rose-600 text-white gap-1 text-[10px] font-bold">
            <Square className="w-2.5 h-2.5 fill-current" /> Stopped
          </Badge>
        );
      case "completed":
        return (
          <Badge className="bg-emerald-600 text-white gap-1 text-[10px] font-bold">
            <CheckCircle2 className="w-2.5 h-2.5" /> Completed
          </Badge>
        );
      case "created":
        return (
          <Badge className="bg-purple-600 text-white gap-1 text-[10px] font-bold">
            <Calendar className="w-2.5 h-2.5" /> Created
          </Badge>
        );
      case "status_changed":
        return (
          <Badge className="bg-amber-600 text-white gap-1 text-[10px] font-bold">
            <RefreshCw className="w-2.5 h-2.5" /> Status Changed
          </Badge>
        );
      case "modified":
        return (
          <Badge variant="outline" className="border-indigo-500 text-indigo-700 dark:text-indigo-300 gap-1 text-[10px] font-bold">
            Modified
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-[10px] font-bold uppercase">
            {action}
          </Badge>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl w-[95vw] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <span>Task Activity & History Audit Trail</span>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Complete timeline of changes, timers, status transitions, and started location for:{" "}
            <strong className="text-foreground">{task.title}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Metadata Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Creation & Modifier Box */}
            <div className="p-3 rounded-xl border bg-muted/20 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>Creation & Updates</span>
              </div>
              <div className="text-[11px] text-muted-foreground space-y-1">
                <div>
                  <span className="font-semibold text-foreground">Created:</span> {formatDate(task.created_at)}
                </div>
                {task.created_by && (
                  <div>
                    <span className="font-semibold text-foreground">Created By:</span> {task.created_by_name || `#${task.created_by}`}
                  </div>
                )}
                <div>
                  <span className="font-semibold text-foreground">Last Modified:</span> {formatDate(task.updated_at)}
                </div>
                {task.status_changed_by && (
                  <div>
                    <span className="font-semibold text-foreground">Status Last Changed By:</span> {task.status_changed_by} ({formatDate(task.status_changed_at)})
                  </div>
                )}
              </div>
            </div>

            {/* Timers & Location Box */}
            <div className="p-3 rounded-xl border bg-muted/20 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-foreground">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Timers & Start Location</span>
              </div>
              <div className="text-[11px] text-muted-foreground space-y-1">
                <div>
                  <span className="font-semibold text-foreground">Started At:</span>{" "}
                  {effectiveStartedAt ? (
                    <span className="text-blue-700 dark:text-blue-400 font-bold">{formatDate(effectiveStartedAt)}</span>
                  ) : (
                    "Not started yet"
                  )}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Stopped At:</span>{" "}
                  {effectiveStoppedAt ? (
                    <span className="text-rose-700 dark:text-rose-400 font-bold">{formatDate(effectiveStoppedAt)}</span>
                  ) : (
                    "—"
                  )}
                </div>
                <div>
                  <span className="font-semibold text-foreground">Completed At:</span>{" "}
                  {effectiveCompletedAt ? (
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">{formatDate(effectiveCompletedAt)}</span>
                  ) : (
                    "—"
                  )}
                </div>

                {latestLocation && latestLocation.latitude ? (
                  <div className="pt-1 border-t border-border/50">
                    <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-bold">
                      <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                      <span>Started Location:</span>
                      <span className="font-mono text-[10px]">
                        {latestLocation.latitude.toFixed(4)}, {latestLocation.longitude.toFixed(4)}
                      </span>
                    </div>
                    {latestLocation.accuracy && (
                      <span className="text-[10px] text-muted-foreground block">
                        Accuracy: ±{latestLocation.accuracy}m
                      </span>
                    )}
                    <a
                      href={`https://www.google.com/maps?q=${latestLocation.latitude},${latestLocation.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline font-bold text-[10px] mt-0.5"
                    >
                      <ExternalLink className="w-2.5 h-2.5" /> View on Google Maps
                    </a>
                  </div>
                ) : (
                  <div className="text-[10px] text-muted-foreground italic pt-1 border-t border-border/50">
                    Location automatically recorded when task is started from browser
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chronological Activity Timeline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-primary" />
                <span>Timeline Events ({displayEvents.length})</span>
              </h4>
              <span className="text-[10px] text-muted-foreground">Newest first</span>
            </div>

            {displayEvents.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground border border-dashed rounded-xl">
                No activity history recorded yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {displayEvents.map((evt, idx) => (
                  <div
                    key={evt.id || idx}
                    className="p-2.5 rounded-xl border bg-background text-xs space-y-1 hover:border-primary/40 transition-colors shadow-2xs"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        {getActionBadge(evt.action)}
                        {evt.subtask_title && (
                          <span className="font-bold text-foreground text-[11px]">
                            • Deliverable: &ldquo;{evt.subtask_title}&rdquo;
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {formatDate(evt.timestamp)}
                      </span>
                    </div>

                    <div className="text-[11px] text-foreground flex items-center gap-1.5 flex-wrap">
                      {evt.user_name && (
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <User className="w-3 h-3 text-primary" />
                          <strong className="text-foreground">{evt.user_name}</strong>
                          {evt.user_role && <span className="text-[10px]">({evt.user_role})</span>}
                        </span>
                      )}
                      {evt.details && (
                        <span className="text-muted-foreground">• {evt.details}</span>
                      )}
                    </div>

                    {/* Geolocation in Event */}
                    {evt.location && evt.location.latitude ? (
                      <div className="flex items-center gap-1.5 text-[10px] bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md text-emerald-800 dark:text-emerald-300 w-fit">
                        <MapPin className="w-2.5 h-2.5 text-rose-500 shrink-0" />
                        <span className="font-mono">
                          {evt.location.latitude.toFixed(4)}, {evt.location.longitude.toFixed(4)}
                        </span>
                        <a
                          href={`https://www.google.com/maps?q=${evt.location.latitude},${evt.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline font-bold ml-1 inline-flex items-center gap-0.5"
                        >
                          Google Maps <ExternalLink className="w-2 h-2" />
                        </a>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs font-bold"
            >
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
