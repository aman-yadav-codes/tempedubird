"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Loader2,
  RefreshCw,
  School,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE" | "LATE";
type ViewMode = "FULL_DAY" | "PERIOD_WISE";

type AttendanceScope = {
  institution_name: string;
  program_name: string;
  section_name: string | null;
  academic_year_name: string;
};

type AttendanceStats = {
  total: number;
  present: number;
  absent: number;
  leave: number;
  late: number;
  percentage: number;
};

type FullDayRow = {
  attendance_date: string;
  status: AttendanceStatus;
  remarks: string | null;
};

type PeriodRow = {
  attendance_date: string;
  slot_id: number;
  slot_name: string | null;
  slot_order: number;
  start_time: string;
  end_time: string;
  subject_name: string | null;
  teacher_name: string | null;
  status: AttendanceStatus;
};

type PeriodGroup = {
  date: string;
  rows: PeriodRow[];
};

type OtherEnrollmentAttendance = {
  enrollment_id: number;
  institution_name: string;
  program_name: string;
  section_name: string | null;
  academic_year_name: string;
  full_day_count: number;
  period_count: number;
};

type ModeDateSummary = {
  attendance_date: string;
  record_count: number;
};

type FullDayTimelineItem =
  | { kind: "FULL_DAY"; date: string; row: FullDayRow }
  | { kind: "PERIOD_WISE_NOTICE"; date: string; recordCount: number };

type PeriodTimelineItem =
  | { kind: "PERIOD_WISE"; date: string; group: PeriodGroup }
  | { kind: "FULL_DAY_NOTICE"; date: string; recordCount: number };

type AttendanceResponse = {
  scope: AttendanceScope | null;
  month: string;
  sessionMonthRange?: {
    from: string;
    to: string;
  };
  fullDay: FullDayRow[];
  periodWise: PeriodRow[];
  modeDates: {
    fullDay: ModeDateSummary[];
    periodWise: ModeDateSummary[];
  };
  otherEnrollmentsWithAttendance: OtherEnrollmentAttendance[];
  stats: {
    fullDay: AttendanceStats;
    periodWise: AttendanceStats;
  };
};

const STATUS_META: Record<AttendanceStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  PRESENT: { label: "Present", className: "border-emerald-500/50 text-emerald-600 dark:text-emerald-300", icon: CheckCircle2 },
  ABSENT: { label: "Absent", className: "border-destructive/60 text-destructive", icon: XCircle },
  LEAVE: { label: "Leave", className: "border-sky-500/50 text-sky-600 dark:text-sky-300", icon: CalendarCheck },
  LATE: { label: "Late", className: "border-amber-500/60 text-amber-600 dark:text-amber-300", icon: Clock3 },
};
const STATUS_OPTIONS: AttendanceStatus[] = ["PRESENT", "ABSENT", "LEAVE", "LATE"];

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function clampMonth(value: string, min?: string, max?: string) {
  if (!value) return value;
  if (min && value < min) return min;
  if (max && value > max) return max;
  return value;
}

function readJson(res: Response) {
  return res.json().catch(() => ({ error: "Server returned an invalid response" }));
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonth(value: string) {
  if (!value) return "";
  return new Date(`${value}-01T00:00:00`).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function formatTime(value: string) {
  const [hours = "0", minutes = "00"] = String(value).split(":");
  const hour = Number(hours);
  if (!Number.isFinite(hour)) return value;
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? "PM" : "AM"}`;
}

function periodStatusClass(status: AttendanceStatus) {
  if (status === "PRESENT") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200";
  if (status === "ABSENT") return "border-destructive/40 bg-destructive/10 text-destructive";
  if (status === "LEAVE") return "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200";
  return "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-200";
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <Badge variant="outline" className={cn("gap-1.5", meta.className)}>
      <Icon className="size-3.5" />
      {meta.label}
    </Badge>
  );
}

function OtherEnrollmentHint({ rows }: { rows: OtherEnrollmentAttendance[] }) {
  if (!rows.length) return null;

  const visibleRows = rows.slice(0, 3);
  return (
    <div className="mx-auto mb-5 max-w-2xl rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-left text-sm text-amber-900 dark:text-amber-100">
      <p className="font-medium">Attendance exists in another active enrollment.</p>
      <div className="mt-2 space-y-1">
        {visibleRows.map((row) => (
          <p key={row.enrollment_id} className="text-xs sm:text-sm">
            {row.institution_name} - {row.program_name}
            {row.section_name ? ` Section ${row.section_name}` : ""} ({row.academic_year_name}) has{" "}
            {row.full_day_count} full-day and {row.period_count} period records.
          </p>
        ))}
      </div>
      <p className="mt-2 text-xs sm:text-sm">
        Switch the sidebar enrollment to view those records.
      </p>
    </div>
  );
}

function OtherModeNoticeCard({ date, mode }: { date: string; mode: "FULL_DAY" | "PERIOD_WISE" }) {
  const label = mode === "FULL_DAY" ? "full-day" : "period-wise";
  const target = mode === "FULL_DAY" ? "Full Day" : "Period Wise";
  return (
    <div className="border-b bg-amber-500/5 px-4 py-3">
      <div className="rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-2 text-sm text-amber-900 dark:text-amber-100">
        <span className="font-medium">{formatDate(date)}</span>
        {" "}attendance is marked in {label} mode.
        <span className="text-amber-800/80 dark:text-amber-100/75"> Check the {target} tab.</span>
      </div>
    </div>
  );
}

function AttendanceSkeleton() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-24 rounded-lg" />)}
      </div>
      <Skeleton className="h-96 rounded-lg" />
    </div>
  );
}

export default function ClassroomAttendancePage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
  const [month, setMonth] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("FULL_DAY");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AttendanceResponse | null>(null);

  const loadAttendance = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (month) params.set("month", month);
      const res = await fetch(`/api/admin/classroom/attendance?${params.toString()}`, {
        headers: authHeader,
        cache: "no-store",
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load attendance");
      const payload = json as AttendanceResponse;
      setData(payload);
      if (payload.month && payload.month !== month) {
        setMonth(payload.month);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load attendance");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeader, month]);

  useEffect(() => {
    if (!isReady) return;
    const timer = window.setTimeout(() => void loadAttendance(), 0);
    return () => window.clearTimeout(timer);
  }, [isReady, loadAttendance]);

  const activeStats = viewMode === "FULL_DAY" ? data?.stats.fullDay : data?.stats.periodWise;
  const activeRows = viewMode === "FULL_DAY" ? data?.fullDay ?? [] : data?.periodWise ?? [];
  const periodGroups = useMemo<PeriodGroup[]>(() => {
    const groups = new Map<string, PeriodRow[]>();
    for (const row of data?.periodWise ?? []) {
      const key = String(row.attendance_date);
      groups.set(key, [...(groups.get(key) ?? []), row]);
    }
    return Array.from(groups, ([date, rows]) => ({
      date,
      rows: rows.sort((left, right) => left.slot_order - right.slot_order),
    }));
  }, [data?.periodWise]);
  const fullDayDateSet = useMemo(() => new Set((data?.modeDates?.fullDay ?? []).map((date) => date.attendance_date)), [data?.modeDates?.fullDay]);
  const periodWiseDateSet = useMemo(() => new Set((data?.modeDates?.periodWise ?? []).map((date) => date.attendance_date)), [data?.modeDates?.periodWise]);
  const fullDayMarkedInPeriodView = useMemo(
    () => (data?.modeDates?.fullDay ?? []).filter((date) => !periodWiseDateSet.has(date.attendance_date)),
    [data?.modeDates?.fullDay, periodWiseDateSet]
  );
  const periodWiseMarkedInFullDayView = useMemo(
    () => (data?.modeDates?.periodWise ?? []).filter((date) => !fullDayDateSet.has(date.attendance_date)),
    [data?.modeDates?.periodWise, fullDayDateSet]
  );
  const fullDayTimeline = useMemo<FullDayTimelineItem[]>(() => [
    ...(data?.fullDay ?? []).map((row) => ({ kind: "FULL_DAY" as const, date: row.attendance_date, row })),
    ...periodWiseMarkedInFullDayView.map((date) => ({
      kind: "PERIOD_WISE_NOTICE" as const,
      date: date.attendance_date,
      recordCount: date.record_count,
    })),
  ].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()), [data?.fullDay, periodWiseMarkedInFullDayView]);
  const periodTimeline = useMemo<PeriodTimelineItem[]>(() => [
    ...periodGroups.map((group) => ({ kind: "PERIOD_WISE" as const, date: group.date, group })),
    ...fullDayMarkedInPeriodView.map((date) => ({
      kind: "FULL_DAY_NOTICE" as const,
      date: date.attendance_date,
      recordCount: date.record_count,
    })),
  ].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()), [fullDayMarkedInPeriodView, periodGroups]);
  const cards = viewMode === "PERIOD_WISE"
    ? [
      { label: "Period Attendance %", value: `${activeStats?.percentage ?? 0}%`, icon: CalendarCheck },
      { label: "Total Periods", value: String(activeStats?.total ?? 0), icon: BookOpen },
      { label: "Present / Absent", value: `${activeStats?.present ?? 0} / ${activeStats?.absent ?? 0}`, icon: CheckCircle2 },
      { label: "Leave / Late", value: `${activeStats?.leave ?? 0} / ${activeStats?.late ?? 0}`, icon: Clock3 },
    ]
    : [
      { label: "Full-Day Attendance %", value: `${activeStats?.percentage ?? 0}%`, icon: CalendarCheck },
      { label: "Present Days", value: String(activeStats?.present ?? 0), icon: CheckCircle2 },
      { label: "Absent Days", value: String(activeStats?.absent ?? 0), icon: XCircle },
      { label: "Leave / Late Days", value: `${activeStats?.leave ?? 0} / ${activeStats?.late ?? 0}`, icon: Clock3 },
    ];
  const selectedMonth = month || data?.month || currentMonth();

  if (!isReady) return <AttendanceSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-sm text-muted-foreground">
            Attendance for the active institution and class selected in your sidebar.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadAttendance()} disabled={loading}>
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {loading && !data ? <AttendanceSkeleton /> : !data?.scope ? (
        <div className="flex min-h-72 flex-col items-center justify-center rounded-lg border bg-card px-6 text-center">
          <School className="size-10 text-muted-foreground" />
          <h2 className="mt-4 font-semibold">No active class enrollment found</h2>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Ask your institution administrator to assign your class, section, and academic year.
          </p>
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-card p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-muted-foreground">{data.scope.institution_name}</p>
                <h2 className="mt-1 truncate text-xl font-semibold">
                  {data.scope.program_name}
                  {data.scope.section_name ? ` - Section ${data.scope.section_name}` : ""}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{data.scope.academic_year_name}</p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  type="month"
                  value={selectedMonth}
                  min={data?.sessionMonthRange?.from}
                  max={data?.sessionMonthRange?.to}
                  onChange={(event) => {
                    const nextMonth = clampMonth(
                      event.target.value || data?.sessionMonthRange?.from || currentMonth(),
                      data?.sessionMonthRange?.from,
                      data?.sessionMonthRange?.to
                    );
                    setMonth(nextMonth);
                  }}
                  className="w-full sm:w-44"
                />
                <div className="grid grid-cols-2 rounded-md border bg-background p-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={viewMode === "FULL_DAY" ? "destructive" : "ghost"}
                    onClick={() => setViewMode("FULL_DAY")}
                  >
                    Full Day
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={viewMode === "PERIOD_WISE" ? "destructive" : "ghost"}
                    onClick={() => setViewMode("PERIOD_WISE")}
                  >
                    Period Wise
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div key={card.label} className="rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <card.icon className="size-4 text-destructive" />
                </div>
                <p className="mt-3 text-2xl font-bold">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="flex flex-col gap-1 border-b px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="font-semibold">
                  {viewMode === "FULL_DAY" ? "Full Day Attendance" : "Period Wise Attendance"}
                </h2>
                <p className="text-sm text-muted-foreground">{formatMonth(selectedMonth)}</p>
              </div>
              <Badge variant="secondary">{activeRows.length} records</Badge>
            </div>

            {loading ? (
              <div className="flex min-h-64 items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                Loading attendance...
              </div>
            ) : viewMode === "FULL_DAY" ? (
              <>
                {fullDayTimeline.length ? (
                  <div className="divide-y">
                    {fullDayTimeline.map((item) => (
                      item.kind === "PERIOD_WISE_NOTICE" ? (
                        <OtherModeNoticeCard key={`period-notice-${item.date}`} date={item.date} mode="PERIOD_WISE" />
                      ) : (
                        <div key={`${item.row.attendance_date}-${item.row.status}`} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_auto_1.4fr] sm:items-center">
                          <div>
                            <p className="font-medium">{formatDate(item.row.attendance_date)}</p>
                            <p className="text-xs text-muted-foreground">Daily attendance</p>
                          </div>
                          <StatusBadge status={item.row.status} />
                          <p className="text-sm text-muted-foreground">{item.row.remarks || "No remarks"}</p>
                        </div>
                      )
                    ))}
                  </div>
                ) : (
                  <div className="px-4 py-16 text-center text-sm text-muted-foreground">
                    <OtherEnrollmentHint rows={data.otherEnrollmentsWithAttendance ?? []} />
                    No full-day attendance found for {formatMonth(selectedMonth)}.
                  </div>
                )}
              </>
            ) : periodTimeline.length ? (
              <div className="space-y-4 p-4">
                {periodTimeline.map((item) => (
                  item.kind === "FULL_DAY_NOTICE" ? (
                    <OtherModeNoticeCard key={`full-day-notice-${item.date}`} date={item.date} mode="FULL_DAY" />
                  ) : (
                    <section key={item.group.date} className="rounded-md border bg-background/30">
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
                        <div>
                          <h3 className="font-semibold">{formatDate(item.group.date)}</h3>
                          <p className="text-xs text-muted-foreground">{item.group.rows.length} marked periods</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {STATUS_OPTIONS.map((status) => {
                            const count = item.group.rows.filter((row) => row.status === status).length;
                            return count ? <StatusBadge key={status} status={status} /> : null;
                          })}
                        </div>
                      </div>
                      <div className="overflow-x-auto p-4">
                        <div className="flex min-w-max gap-3">
                          {item.group.rows.map((row) => (
                            <div
                              key={`${row.attendance_date}-${row.slot_id}`}
                              className={cn(
                                "flex w-52 shrink-0 flex-col justify-between rounded-lg border p-3",
                                periodStatusClass(row.status)
                              )}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className="text-xs opacity-80">{formatTime(row.start_time)} - {formatTime(row.end_time)}</p>
                                    <p className="mt-1 text-sm font-semibold">{row.slot_name || `Period ${row.slot_order}`}</p>
                                  </div>
                                  <BookOpen className="size-4 shrink-0 opacity-80" />
                                </div>
                                <p className="mt-4 line-clamp-2 min-h-10 text-sm font-semibold">
                                  {row.subject_name || "Subject not assigned"}
                                </p>
                                <p className="mt-1 truncate text-xs opacity-80">{row.teacher_name || "Teacher not assigned"}</p>
                              </div>
                              <div className="mt-4">
                                <StatusBadge status={row.status} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </section>
                  )
                ))}
              </div>
            ) : (
              <div className="px-4 py-16 text-center text-sm text-muted-foreground">
                <OtherEnrollmentHint rows={data.otherEnrollmentsWithAttendance ?? []} />
                No period-wise attendance found for {formatMonth(selectedMonth)}.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
