"use client";

import React, { useMemo } from "react";
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
  MapPin,
  Calendar,
  Clock,
  ExternalLink,
  Navigation,
  CheckCircle2,
  Layers,
  ArrowRight,
  ShieldCheck,
  User,
} from "lucide-react";
import {
  getDayCheckInSessions,
  DayCheckInSession,
  DayTaskAttendanceMetrics,
} from "@/app/lib/task-attendance-sync";

interface DailyGeoAttendanceHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateKey: string | null;
  dateFormatted?: string;
  tasks: any[];
  shiftLabel?: string;
  expectedHours?: number;
  rowMetrics?: {
    checkIn: string;
    checkOut: string;
    checkInCount: number;
    workingHours: string;
    taskHours: string;
    status: string;
    statusColor?: string;
  } | null;
}

export function DailyGeoAttendanceHistoryDialog({
  open,
  onOpenChange,
  dateKey,
  dateFormatted,
  tasks,
  shiftLabel = "09:00 AM - 05:00 PM (General Shift)",
  expectedHours = 8,
  rowMetrics,
}: DailyGeoAttendanceHistoryDialogProps) {
  // Extract all sessions for this specific date
  const sessions: DayCheckInSession[] = useMemo(() => {
    if (!dateKey) return [];
    return getDayCheckInSessions(tasks, dateKey);
  }, [tasks, dateKey]);

  if (!dateKey) return null;

  const totalSessions = sessions.length;
  const activeSession = sessions.find((s) => s.isActive);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl shadow-2xl border">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 text-white border-b border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 text-primary border border-primary/30 rounded-xl">
                <MapPin className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  Check-In & Check-Out History
                  <Badge variant="secondary" className="text-[10px] font-bold bg-white/20 text-white">
                    {totalSessions} {totalSessions === 1 ? "Session" : "Sessions"}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-300 mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {dateFormatted || dateKey}
                </DialogDescription>
              </div>
            </div>

            <div className="text-xs text-slate-300 sm:text-right">
              <div className="font-semibold text-white">
                Shift: {shiftLabel.split("(")[0]?.trim() || "09:00 AM - 05:00 PM"}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                Required: {expectedHours}h standard shift
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          {rowMetrics && (
            <div className="mt-4 pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
              <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">1st Check-In</span>
                <span className="text-xs font-bold text-emerald-400 font-mono mt-0.5 block">
                  {rowMetrics.checkIn}
                </span>
              </div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Last Check-Out</span>
                <span className="text-xs font-bold text-sky-400 font-mono mt-0.5 block">
                  {rowMetrics.checkOut}
                </span>
              </div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Work Hours</span>
                <span className="text-xs font-bold text-amber-300 font-mono mt-0.5 block">
                  {rowMetrics.workingHours}
                </span>
              </div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/10">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">Status</span>
                <span className="text-xs font-black uppercase mt-0.5 block text-white">
                  {rowMetrics.status}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sessions Timeline & Geo Details */}
        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
          {sessions.length === 0 ? (
            <div className="py-12 text-center">
              <MapPin className="w-10 h-10 mx-auto text-muted-foreground opacity-30 mb-2" />
              <h4 className="text-sm font-semibold text-foreground">No granular task sessions recorded</h4>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                Attendance was logged via direct register stamp without discrete task start/stop geo coordinates.
              </p>
            </div>
          ) : (
            sessions.map((sess) => {
              const startMapsUrl = sess.startLocation
                ? `https://www.google.com/maps?q=${sess.startLocation.latitude},${sess.startLocation.longitude}`
                : null;
              const stopMapsUrl = sess.stopLocation
                ? `https://www.google.com/maps?q=${sess.stopLocation.latitude},${sess.stopLocation.longitude}`
                : null;

              return (
                <div
                  key={sess.id}
                  className="rounded-2xl border bg-card p-4 shadow-2xs space-y-3 hover:border-primary/40 transition-colors"
                >
                  {/* Session Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary text-primary-foreground font-black text-[10px] px-2 py-0.5">
                        Session #{sess.sessionIndex}
                      </Badge>
                      <h4 className="text-xs sm:text-sm font-bold text-foreground truncate max-w-[240px] sm:max-w-[340px]">
                        {sess.taskTitle}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
                        ⏱️ {sess.durationFormatted}
                      </span>
                      {sess.isActive ? (
                        <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                          In Progress
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          Completed
                        </Badge>
                      )}
                    </div>
                  </div>

                  {sess.subtaskTitle && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <Layers className="w-3.5 h-3.5 text-primary" />
                      <span>Deliverable:</span>
                      <strong className="text-foreground">{sess.subtaskTitle}</strong>
                    </div>
                  )}

                  {/* Punch In vs Punch Out Side-by-Side */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Check In Box */}
                    <div className="p-3 rounded-xl border bg-emerald-500/5 dark:bg-emerald-950/20 border-emerald-500/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Check-In (Punch In)
                        </span>
                        <span className="font-mono text-xs font-bold text-foreground">
                          {sess.startFormatted}
                        </span>
                      </div>

                      {sess.startLocation ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono font-medium text-foreground">
                            <span>
                              📍 {sess.startLocation.latitude.toFixed(4)}°, {sess.startLocation.longitude.toFixed(4)}°
                            </span>
                            {startMapsUrl && (
                              <a
                                href={startMapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-sans font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                              >
                                View Map <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                          {sess.startLocation.address ? (
                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                              {sess.startLocation.address}
                            </p>
                          ) : sess.startLocation.accuracy ? (
                            <span className="text-[9px] text-emerald-600/80 font-mono">
                              ±{sess.startLocation.accuracy}m GPS accuracy
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">
                          📍 Verified on Workstation (No GPS coords recorded)
                        </p>
                      )}
                    </div>

                    {/* Check Out Box */}
                    <div className="p-3 rounded-xl border bg-sky-500/5 dark:bg-sky-950/20 border-sky-500/20 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-sky-600" />
                          Check-Out (Punch Out)
                        </span>
                        <span className="font-mono text-xs font-bold text-foreground">
                          {sess.stopFormatted}
                        </span>
                      </div>

                      {sess.isActive ? (
                        <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                          </span>
                          Session currently running
                        </p>
                      ) : sess.stopLocation ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono font-medium text-foreground">
                            <span>
                              📍 {sess.stopLocation.latitude.toFixed(4)}°, {sess.stopLocation.longitude.toFixed(4)}°
                            </span>
                            {stopMapsUrl && (
                              <a
                                href={stopMapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] font-sans font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-0.5"
                              >
                                View Map <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                          {sess.stopLocation.address ? (
                            <p className="text-[10px] text-muted-foreground line-clamp-1">
                              {sess.stopLocation.address}
                            </p>
                          ) : sess.stopLocation.accuracy ? (
                            <span className="text-[9px] text-sky-600/80 font-mono">
                              ±{sess.stopLocation.accuracy}m GPS accuracy
                            </span>
                          ) : null}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground italic">
                          📍 Workstation punch out recorded
                        </p>
                      )}
                    </div>
                  </div>

                  {sess.actionUser && (
                    <div className="text-[10px] text-muted-foreground flex items-center gap-1 pt-0.5">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span>Action by: <strong className="text-foreground">{sess.actionUser}</strong></span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-muted/40 border-t flex items-center justify-between text-xs text-muted-foreground px-5">
          <span>Total {sessions.length} check-in punch(es) logged</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-8 px-4 text-xs font-bold rounded-xl"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
