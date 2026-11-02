"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  MapPin,
  Loader2,
  UserCheck,
  Sparkles,
  Check,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { DailyGeoAttendanceHistoryDialog } from "@/components/daily-geo-attendance-history-dialog";
import {
  calculateDayTaskAttendance,
  parseShiftTiming,
  evaluateComplianceAndDedication,
  type DedicationTier,
} from "@/app/lib/task-attendance-sync";

type StaffAttendanceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffUser: { id: number; full_name: string; email?: string; shift_timing?: string } | null;
  accessToken: string | null;
};

export function StaffAttendanceDialog({
  open,
  onOpenChange,
  staffUser,
  accessToken,
}: StaffAttendanceDialogProps) {
  const { activeInstitutionId } = useActiveInstitution();
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [geoHistoryDialogOpen, setGeoHistoryDialogOpen] = useState(false);
  const [selectedGeoHistoryRow, setSelectedGeoHistoryRow] = useState<any | null>(null);

  // Month options for picker
  const monthOptions = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - i);
      const val = d.toISOString().slice(0, 7);
      const label = d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
      return { value: val, label };
    });
  }, []);

  // Fetch staff attendance records & tasks
  useEffect(() => {
    if (!open || !staffUser) return;

    let isMounted = true;
    setLoading(true);

    const loadData = async () => {
      try {
        const headers: Record<string, string> = {};
        if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

        const instQuery = activeInstitutionId ? `&institutionId=${activeInstitutionId}` : "";
        const [attRes, tasksRes] = await Promise.all([
          fetch(
            `/api/admin/staff/attendance?mode=self&staffUserId=${staffUser.id}&month=${selectedMonth}${instQuery}`,
            { headers }
          ),
          fetch(
            `/api/admin/operations/tasks?employee_id=${staffUser.id}`,
            { headers }
          ),
        ]);

        if (!isMounted) return;

        if (attRes.ok) {
          const json = await attRes.json();
          setAttendanceData(json);
        }

        if (tasksRes.ok) {
          const json = await tasksRes.json();
          setTasks(Array.isArray(json.tasks) ? json.tasks : []);
        }
      } catch (err) {
        console.error("Failed to load staff attendance logs:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [open, staffUser, accessToken, selectedMonth, activeInstitutionId]);

  // Compute daily attendance logs based on tasks and DB records
  const attendanceLogs = useMemo(() => {
    const [yearStr, monthStr] = (selectedMonth || "2026-10").split("-");
    const year = parseInt(yearStr, 10) || 2026;
    const month = parseInt(monthStr, 10) - 1;
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    const maxDay = isCurrentMonth ? today.getDate() : new Date(year, month + 1, 0).getDate();

    const formatTimeOnly = (ms: number) => {
      return new Date(ms).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    };

    const userShift = parseShiftTiming(
      attendanceData?.shift_info ||
      attendanceData?.shift_timing ||
      staffUser?.shift_timing ||
      "09:00 AM - 05:00 PM (General Shift)"
    );

    // Build holiday map
    const holidayMap: Record<string, { title: string; description?: string }> = {};
    if (Array.isArray(attendanceData?.holidays)) {
      attendanceData.holidays.forEach((h: any) => {
        const s = String(h.start_date || "").slice(0, 10);
        const e = String(h.end_date || s).slice(0, 10);
        if (s) {
          holidayMap[s] = { title: h.title, description: h.description };
          if (e && e !== s) {
            const startD = new Date(s);
            const endD = new Date(e);
            let cur = new Date(startD);
            while (cur <= endD) {
              const key = cur.toISOString().slice(0, 10);
              holidayMap[key] = { title: h.title, description: h.description };
              cur.setDate(cur.getDate() + 1);
            }
          }
        }
      });
    }

    const formatDbTime = (t: string | null) => {
      if (!t) return "—";
      if (t.includes("AM") || t.includes("PM") || t.includes("am") || t.includes("pm")) return t;
      const parts = t.split(":");
      if (parts.length >= 2) {
        const h = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const ampm = h >= 12 ? "pm" : "am";
        const h12 = h % 12 || 12;
        return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
      }
      return t;
    };

    const logs: Array<{
      dateKey: string;
      dateFormatted: string;
      checkIn: string;
      checkOut: string;
      checkInCount: number;
      workingHours: string;
      workingMinutes: number;
      taskHours: string;
      taskMinutes: number;
      totalHours: string;
      status: string;
      statusColor: string;
      taskInfo?: string;
      shiftLabel: string;
      expectedHours: number;
      isLate: boolean;
      lateMinutes: number;
      lateLabel: string;
      isEarlyExit: boolean;
      earlyExitMinutes: number;
      earlyExitLabel: string;
      attentivenessScore: number;
      dedicationTier: DedicationTier;
      tierLabel: string;
      tierColor: string;
    }> = [];

    for (let day = maxDay; day >= 1; day--) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const currentDate = new Date(year, month, day, 12, 0, 0);
      const isSunday = currentDate.getDay() === 0;
      const isToday = isCurrentMonth && day === today.getDate();
      const dayHoliday = holidayMap[dateStr];

      const baseDateFormatted = currentDate.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      const dateFormatted = dayHoliday ? `${baseDateFormatted} • 🏖️ ${dayHoliday.title}` : baseDateFormatted;

      const metrics = calculateDayTaskAttendance(tasks, dateStr, userShift, dayHoliday);

      if (metrics.checkInCount > 0 || metrics.earliestStart !== null) {
        const checkIn = metrics.earliestStart ? formatTimeOnly(metrics.earliestStart) : "—";
        let checkOut = "—";
        if (isToday && metrics.hasActiveTask) {
          checkOut = "Active / In Progress";
        } else if (metrics.latestStop !== null) {
          checkOut = formatTimeOnly(metrics.latestStop);
        }

        const wH = Math.floor(metrics.workingMinutes / 60);
        const wM = metrics.workingMinutes % 60;
        const workingHours = `${wH}h ${String(wM).padStart(2, "0")}m`;

        const tH = Math.floor(metrics.taskMinutes / 60);
        const tM = metrics.taskMinutes % 60;
        const taskHours = `${tH}h ${String(tM).padStart(2, "0")}m`;

        let status: string = metrics.status;
        let statusColor = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
        if (status === "HALF_DAY") {
          statusColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
        } else if (checkOut === "Active / In Progress") {
          statusColor = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
        } else if (metrics.isLate && metrics.workingMinutes < metrics.expectedMinutes) {
          status = "LATE";
          statusColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
        }

        logs.push({
          dateKey: dateStr,
          dateFormatted,
          checkIn,
          checkOut,
          checkInCount: metrics.checkInCount,
          workingHours,
          workingMinutes: metrics.workingMinutes,
          taskHours,
          taskMinutes: metrics.taskMinutes,
          totalHours: workingHours,
          status,
          statusColor,
          taskInfo: metrics.taskTitles.length > 0 ? metrics.taskTitles.join(", ") : undefined,
          shiftLabel: metrics.shiftLabel,
          expectedHours: metrics.expectedHours,
          isLate: metrics.isLate,
          lateMinutes: metrics.lateMinutes,
          lateLabel: metrics.lateLabel,
          isEarlyExit: metrics.isEarlyExit,
          earlyExitMinutes: metrics.earlyExitMinutes,
          earlyExitLabel: metrics.earlyExitLabel,
          attentivenessScore: metrics.attentivenessScore,
          dedicationTier: metrics.dedicationTier,
          tierLabel: metrics.tierLabel,
          tierColor: metrics.tierColor,
        });
      } else {
        const dbRecord = Array.isArray(attendanceData?.attendance)
          ? attendanceData.attendance.find((a: any) => {
              if (!a.date && !a.attendance_date) return false;
              const d = a.date || a.attendance_date;
              return d === dateStr || String(d).startsWith(dateStr);
            })
          : null;

        if (dbRecord) {
          const wHrs = Number(dbRecord.working_hours || 0);
          const wH = Math.floor(wHrs);
          const wM = Math.round((wHrs % 1) * 60);
          const tHrs = Number(dbRecord.task_hours || 0);
          const tH = Math.floor(tHrs);
          const tM = Math.round((tHrs % 1) * 60);
          let status = dbRecord.status || "PRESENT";
          let statusColor = "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
          if (status === "HALF_DAY") statusColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
          else if (status === "ABSENT") statusColor = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
          else if (status === "LATE") statusColor = "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
          else if (status === "LEAVE" || status === "CASUAL_LEAVE") statusColor = "bg-purple-500/10 text-purple-600 border-purple-500/20";

          let earliestStartMs: number | null = null;
          if (dbRecord.check_in_time) {
            const [h, m] = String(dbRecord.check_in_time).split(":").map(Number);
            earliestStartMs = new Date(year, month, day, h || 0, m || 0).getTime();
          }
          let latestStopMs: number | null = null;
          if (dbRecord.check_out_time) {
            const [h, m] = String(dbRecord.check_out_time).split(":").map(Number);
            latestStopMs = new Date(year, month, day, h || 0, m || 0).getTime();
          }

          const dbCompliance = evaluateComplianceAndDedication({
            earliestStart: earliestStartMs,
            latestStop: latestStopMs,
            workingMinutes: Math.round(wHrs * 60),
            taskMinutes: Math.round(tHrs * 60),
            shift: userShift,
            hasActiveTask: false,
            isToday: false,
          });

          const isLate = dbRecord.is_late ?? dbCompliance.isLate;
          const lateMinutes = dbRecord.late_minutes ?? dbCompliance.lateMinutes;
          const isEarlyExit = dbRecord.is_early_exit ?? dbCompliance.isEarlyExit;
          const earlyExitMinutes = dbRecord.early_exit_minutes ?? dbCompliance.earlyExitMinutes;
          const attentivenessScore = Number(dbRecord.attentiveness_score || dbCompliance.attentivenessScore);
          const dedicationTier = (dbRecord.dedication_tier || dbCompliance.dedicationTier) as DedicationTier;

          logs.push({
            dateKey: dateStr,
            dateFormatted,
            checkIn: formatDbTime(dbRecord.check_in_time),
            checkOut: formatDbTime(dbRecord.check_out_time),
            checkInCount: Number(dbRecord.check_in_count || (dbRecord.check_in_time ? 1 : 0)),
            workingHours: `${wH}h ${String(wM).padStart(2, "0")}m`,
            workingMinutes: Math.round(wHrs * 60),
            taskHours: `${tH}h ${String(tM).padStart(2, "0")}m`,
            taskMinutes: Math.round(tHrs * 60),
            totalHours: `${wH}h ${String(wM).padStart(2, "0")}m`,
            status,
            statusColor,
            shiftLabel: dbRecord.shift_name || userShift.label,
            expectedHours: userShift.expectedHours,
            isLate,
            lateMinutes,
            lateLabel: isLate ? `Late (+${lateMinutes}m)` : "On Time",
            isEarlyExit,
            earlyExitMinutes,
            earlyExitLabel: isEarlyExit ? `Left Early (-${earlyExitMinutes}m)` : "Full Shift",
            attentivenessScore,
            dedicationTier,
            tierLabel: dbCompliance.tierLabel,
            tierColor: dbCompliance.tierColor,
          });
        } else {
          let status = "ABSENT";
          let statusColor = "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
          let tierLabel = "Needs Attention";
          let tierColor = "bg-rose-500/10 text-rose-600 border-rose-500/20";

          if (dayHoliday) {
            status = "HOLIDAY";
            statusColor = "bg-purple-500/10 text-purple-600 border-purple-500/20";
            tierLabel = "🏖️ " + dayHoliday.title;
            tierColor = "bg-purple-500/10 text-purple-600 border-purple-500/20";
          } else if (isSunday) {
            status = "WEEKLY_OFF";
            statusColor = "bg-slate-500/10 text-slate-600 border-slate-500/20";
            tierLabel = "Weekend";
            tierColor = "bg-slate-500/10 text-slate-500 border-slate-500/20";
          }

          logs.push({
            dateKey: dateStr,
            dateFormatted,
            checkIn: "—",
            checkOut: "—",
            checkInCount: 0,
            workingHours: "0h 00m",
            workingMinutes: 0,
            taskHours: "0h 00m",
            taskMinutes: 0,
            totalHours: "0h 00m",
            status,
            statusColor,
            shiftLabel: userShift.label,
            expectedHours: userShift.expectedHours,
            isLate: false,
            lateMinutes: 0,
            lateLabel: "—",
            isEarlyExit: false,
            earlyExitMinutes: 0,
            earlyExitLabel: "—",
            attentivenessScore: 0,
            dedicationTier: "NEEDS_ATTENTION",
            tierLabel,
            tierColor,
          });
        }
      }
    }

    return logs;
  }, [selectedMonth, attendanceData, tasks, staffUser]);

  // Statistics KPI calculation
  const stats = useMemo(() => {
    const present = attendanceLogs.filter((r) => r.status === "PRESENT" || r.status === "LATE").length;
    const halfDays = attendanceLogs.filter((r) => r.status === "HALF_DAY").length;
    const absent = attendanceLogs.filter((r) => r.status === "ABSENT").length;
    const leaves = attendanceLogs.filter((r) => r.status === "LEAVE" || r.status === "CASUAL_LEAVE").length;
    const holidays = attendanceLogs.filter((r) => r.status === "WEEKLY_OFF" || r.status === "HOLIDAY").length;
    const workingDays = attendanceLogs.filter((r) => r.status !== "WEEKLY_OFF" && r.status !== "HOLIDAY").length;
    const totalWorkingMinutes = attendanceLogs.reduce((sum, r) => sum + (r.workingMinutes || 0), 0);
    const totalWorkingHours = `${Math.floor(totalWorkingMinutes / 60)}h ${totalWorkingMinutes % 60}m`;
    const rate = workingDays > 0 ? Math.round(((present + halfDays * 0.5) / workingDays) * 100) : 0;

    return {
      present,
      halfDays,
      absent,
      leaves,
      holidays,
      workingDays,
      totalWorkingHours,
      rate,
    };
  }, [attendanceLogs]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl xl:max-w-6xl max-h-[92vh] flex flex-col p-6 overflow-hidden rounded-2xl">
          {/* Header */}
          <DialogHeader className="border-b pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2">
                    Daily Attendance & Task Working Hours
                    {staffUser?.full_name && (
                      <Badge variant="outline" className="text-xs font-semibold bg-muted/40 text-foreground">
                        {staffUser.full_name}
                      </Badge>
                    )}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Late entry & early departure evaluated by profile shift policy • Attentiveness & dedication calculated by working hours
                  </DialogDescription>
                </div>
              </div>

              {/* Month Selector & Shift Badge */}
              <div className="flex items-center gap-2">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-8 text-xs w-36 rounded-lg bg-background font-medium">
                    <Calendar className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value} className="text-xs">
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-semibold px-2.5 py-1 whitespace-nowrap">
                  {attendanceData?.shift_info?.label ||
                    attendanceData?.shift_timing ||
                    staffUser?.shift_timing ||
                    "07:45 AM - 03:30 PM (Faculty & Staff Half-Day Shift)"}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground font-medium">Calculating daily task attendance and shift metrics...</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 pt-2 pr-1">
              {/* Metric Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2.5">
                <Card className="p-3 rounded-xl border text-center bg-card shadow-2xs">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Attendance Rate</span>
                  <p className="text-xl font-black text-primary mt-0.5">{stats.rate}%</p>
                </Card>
                <Card className="p-3 rounded-xl border text-center bg-emerald-500/5 border-emerald-500/20 shadow-2xs">
                  <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Present</span>
                  <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.present}</p>
                </Card>
                <Card className="p-3 rounded-xl border text-center bg-amber-500/5 border-amber-500/20 shadow-2xs">
                  <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Half Day</span>
                  <p className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{stats.halfDays}</p>
                </Card>
                <Card className="p-3 rounded-xl border text-center bg-rose-500/5 border-rose-500/20 shadow-2xs">
                  <span className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Absent</span>
                  <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{stats.absent}</p>
                </Card>
                <Card className="p-3 rounded-xl border text-center bg-blue-500/5 border-blue-500/20 shadow-2xs">
                  <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Leaves</span>
                  <p className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5">{stats.leaves}</p>
                </Card>
                <Card className="p-3 rounded-xl border text-center bg-purple-500/5 border-purple-500/20 shadow-2xs">
                  <span className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Holidays</span>
                  <p className="text-xl font-black text-purple-600 dark:text-purple-400 mt-0.5">{stats.holidays}</p>
                </Card>
              </div>

              {/* Attendance Table */}
              <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left min-w-[850px]">
                    <thead className="bg-muted/40 text-muted-foreground border-b uppercase text-[10px] font-semibold">
                      <tr>
                        <th className="p-3 pl-4">Date & Assigned Shift</th>
                        <th className="p-3">Check In (1st Start)</th>
                        <th className="p-3">Check Out (Last Stop)</th>
                        <th className="p-3 text-center">Check-ins</th>
                        <th className="p-3">Working Hours</th>
                        <th className="p-3">Task Hours</th>
                        <th className="p-3">Attentive & Dedicated</th>
                        <th className="p-3 pr-4 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {attendanceLogs.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-muted-foreground">
                            No attendance records for {selectedMonth}.
                          </td>
                        </tr>
                      ) : (
                        attendanceLogs.map((row, idx) => (
                          <tr key={idx} className="hover:bg-muted/30 transition-colors">
                            {/* Date & Shift */}
                            <td className="p-3 pl-4 font-semibold text-foreground">
                              <div>{row.dateFormatted}</div>
                              <div className="text-[10px] text-muted-foreground/80 font-normal mt-0.5 truncate max-w-[210px]" title={row.shiftLabel}>
                                {row.shiftLabel}
                              </div>
                              {row.taskInfo && (
                                <div className="text-[10px] text-primary font-medium truncate max-w-[210px] mt-0.5" title={row.taskInfo}>
                                  {row.taskInfo}
                                </div>
                              )}
                            </td>

                            {/* Check In */}
                            <td className="p-3 font-mono font-medium">
                              <div>{row.checkIn}</div>
                              {row.checkIn !== "—" && (
                                row.isLate ? (
                                  <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 text-[9px] font-bold px-1.5 py-0 mt-0.5 w-fit flex items-center gap-1">
                                    ⚠️ Late (+{row.lateMinutes}m)
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                                    ✓ On Time
                                  </span>
                                )
                              )}
                            </td>

                            {/* Check Out */}
                            <td className="p-3 font-mono font-medium">
                              {row.checkOut === "Active / In Progress" ? (
                                <Badge variant="outline" className="text-[10px] text-blue-600 bg-blue-500/10 border-blue-500/20 font-medium">
                                  Active / In Progress
                                </Badge>
                              ) : (
                                <>
                                  <div>{row.checkOut}</div>
                                  {row.checkOut !== "—" && (
                                    row.isEarlyExit ? (
                                      <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[9px] font-bold px-1.5 py-0 mt-0.5 w-fit flex items-center gap-1">
                                        ⚠️ Left Early (-{row.earlyExitMinutes}m)
                                      </Badge>
                                    ) : (
                                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                                        ✓ Full Shift
                                      </span>
                                    )
                                  )}
                                </>
                              )}
                            </td>

                            {/* Check-ins Count with Clickable Geo History */}
                            <td className="p-3 text-center font-mono font-medium">
                              {row.checkInCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedGeoHistoryRow(row);
                                    setGeoHistoryDialogOpen(true);
                                  }}
                                  title="Click to view Check-In & Check-Out Geo-Location history for this day"
                                  className="inline-flex items-center gap-1 cursor-pointer group focus:outline-hidden"
                                >
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px] font-bold bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-2xs hover:scale-110 cursor-pointer flex items-center gap-1 px-2 py-0.5"
                                  >
                                    <MapPin className="w-2.5 h-2.5 text-primary group-hover:text-primary-foreground" />
                                    <span>{row.checkInCount}</span>
                                  </Badge>
                                </button>
                              ) : (
                                "—"
                              )}
                            </td>

                            {/* Working Hours */}
                            <td className="p-3">
                              <div className="font-semibold text-foreground">{row.workingHours}</div>
                              <span className="text-[10px] text-muted-foreground block font-mono">
                                Req: {row.expectedHours || 8}h
                              </span>
                            </td>

                            {/* Task Hours */}
                            <td className="p-3 font-semibold text-indigo-600 dark:text-indigo-400">
                              <div>{row.taskHours}</div>
                              {row.workingMinutes > 0 && (
                                <span className="text-[10px] text-muted-foreground block font-mono">
                                  {Math.round((row.taskMinutes / row.workingMinutes) * 100)}% active
                                </span>
                              )}
                            </td>

                            {/* Attentive & Dedicated */}
                            <td className="p-3">
                              {row.status === "WEEKLY_OFF" ? (
                                <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-500/20">
                                  Weekend
                                </Badge>
                              ) : row.status === "HOLIDAY" ? (
                                <Badge variant="outline" className="text-[10px] text-rose-600 dark:text-rose-400 border-rose-500/30 bg-rose-500/10 font-semibold">
                                  {row.tierLabel || "🏖️ Holiday"}
                                </Badge>
                              ) : row.status === "CASUAL_LEAVE" || row.status === "LEAVE" ? (
                                <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/20">
                                  Leave
                                </Badge>
                              ) : row.workingMinutes > 0 ? (
                                <div>
                                  <Badge className={`text-[10px] font-bold border ${row.tierColor}`}>
                                    {row.tierLabel}
                                  </Badge>
                                  <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                    {row.attentivenessScore}% Attentive
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">—</span>
                              )}
                            </td>

                            {/* Status */}
                            <td className="p-3 pr-4 text-right">
                              <Badge className={`text-[10px] font-bold uppercase px-2 py-0.5 ${row.statusColor}`}>
                                {row.status.replace(/_/g, " ")}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Daily Geo-Location History Modal */}
      <DailyGeoAttendanceHistoryDialog
        open={geoHistoryDialogOpen}
        onOpenChange={setGeoHistoryDialogOpen}
        dateKey={selectedGeoHistoryRow?.dateKey || null}
        dateFormatted={selectedGeoHistoryRow?.dateFormatted}
        tasks={tasks}
        shiftLabel={selectedGeoHistoryRow?.shiftLabel}
        expectedHours={selectedGeoHistoryRow?.expectedHours}
        rowMetrics={selectedGeoHistoryRow}
      />
    </>
  );
}
