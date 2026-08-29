"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarCheck, CheckCircle2, Clock3, Loader2, Save, XCircle } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";

import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { DatePicker } from "@/components/shared/date-picker";
import { MonthPicker } from "@/components/shared/month-picker";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useActiveAcademicYearId } from "@/hooks/use-active-academic-year-id";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { getStoredActiveAcademicSession } from "@/lib/auth/active-academic-session";
import { cn } from "@/lib/utils";
import { toRoleRoutePath } from "@/lib/auth/role-routes";
import { useAuthStore } from "@/store";

type AttendanceView = "mark" | "daily" | "monthly" | "history";
type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE" | "LATE";
type MarkMode = "FULL_DAY" | "PERIOD_WISE";
type DailyReportMode = "FULL_DAY" | "PERIOD_WISE";

type InstitutionOption = { id: number; name?: string; organization_name?: string };
type ProgramOption = { id: number; title: string; institution_id: number };
type SectionOption = { id: number; name: string };
type AcademicYearOption = {
  id: number;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  is_active?: boolean;
};
type StudentRow = {
  student_id: number;
  full_name: string;
  email?: string | null;
  admission_number?: string | null;
  roll_number?: string | null;
};
type SlotRow = {
  id: number;
  slot_name?: string | null;
  slot_order: number;
  start_time: string;
  end_time: string;
  subject_id: number;
  subject_name: string;
  teacher_id?: number | null;
  teacher_name?: string | null;
  can_mark?: boolean;
};
type FullDayRow = { student_id: number; status: AttendanceStatus; remarks?: string | null };
type PeriodRow = { student_id: number; slot_id: number; status: AttendanceStatus };
type StatusDraft = { status: AttendanceStatus; remarks: string };
type AttendanceStudentTableRow = StudentRow & {
  status: AttendanceStatus;
  remarks: string;
};
type DailyReportRow = {
  id: number | string;
  program_name: string;
  section_name: string;
  slot_id?: number;
  period_name?: string;
  slot_order?: number;
  start_time?: string;
  end_time?: string;
  subject_name?: string;
  teacher_name?: string | null;
  total: number;
  present: number;
  absent: number;
  leave: number;
  late: number;
};
type PeriodStudentRow = {
  student_id: number;
  user_id: number;
  full_name: string;
  avatar_url?: string | null;
  admission_number?: string | null;
  roll_number?: string | null;
};
type FullDayChartDatum = {
  status: string;
  statusCode: AttendanceStatus;
  count: number;
};
type MonthlyReportRow = {
  student_id: number;
  full_name: string;
  roll_number?: string | null;
  total: number;
  present: number;
  absent: number;
  leave: number;
};
type HistoryRow = {
  attendance_date: string;
  program_name: string;
  section_name: string;
  student_id: number;
  full_name: string;
  status: AttendanceStatus;
  remarks?: string | null;
};

const VIEW_LABELS: Record<AttendanceView, string> = {
  mark: "Mark Attendance",
  daily: "Daily Report",
  monthly: "Monthly Report",
  history: "Student History",
};

const STATUS_META: Record<AttendanceStatus, { label: string; className: string; icon: typeof CheckCircle2 }> = {
  PRESENT: { label: "Present", className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200", icon: CheckCircle2 },
  ABSENT: { label: "Absent", className: "border-destructive/50 bg-destructive/15 text-destructive", icon: XCircle },
  LEAVE: { label: "Leave", className: "border-sky-500/40 bg-sky-500/15 text-sky-200", icon: CalendarCheck },
  LATE: { label: "Late", className: "border-amber-500/40 bg-amber-500/15 text-amber-200", icon: Clock3 },
};
const STATUS_OPTIONS: AttendanceStatus[] = ["PRESENT", "ABSENT", "LEAVE", "LATE"];
const PERIOD_CHART_CONFIG = {
  present: {
    label: "Present",
    color: "var(--destructive)",
  },
} satisfies ChartConfig;
const FULL_DAY_CHART_CONFIG = {
  count: {
    label: "Students",
    color: "var(--destructive)",
  },
} satisfies ChartConfig;

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function dateToMonth(value: string) {
  return value ? value.slice(0, 7) : currentMonth();
}

function yearFromDate(value?: string) {
  const parsed = Number(value?.slice(0, 4));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function localDate(value?: string) {
  if (!value) return null;
  const [year, month, day] = value.split("-").map(Number);
  if (![year, month, day].every(Number.isFinite)) return null;
  return new Date(year, month - 1, day);
}

function positiveString(value: string) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? String(parsed) : "";
}

function formatTime(value: string) {
  return value?.slice(0, 5) || "";
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function asPercent(present: number, total: number) {
  if (!total) return "0%";
  return `${((present / total) * 100).toFixed(2)}%`;
}

function initials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "S";
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const meta = STATUS_META[status];
  return <Badge className={cn("border", meta.className)} variant="outline">{meta.label}</Badge>;
}

function LoadingRows() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }, (_, index) => (
        <div key={index} className="grid gap-3 rounded-md border border-border bg-background/40 p-3 md:grid-cols-[1fr_360px]">
          <div className="space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function StudentAttendancePage() {
  const { isReady } = useAdminGuard();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { accessToken, user } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const activeAcademicYearId = useActiveAcademicYearId();
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
  const isPlatformAdmin = Boolean(user?.role_codes?.includes("platform_admin") || user?.is_super_admin);
  const useSidebarInstitution = Boolean(activeInstitution && !isPlatformAdmin);
  const view = useMemo<AttendanceView>(() => {
    const nextView = (searchParams.get("view") || "mark") as AttendanceView;
    return VIEW_LABELS[nextView] ? nextView : "mark";
  }, [searchParams]);

  const updateView = useCallback((nextView: AttendanceView) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", nextView);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, router, searchParams]);

  const [institutionId, setInstitutionId] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const selectedInstitutionId = useSidebarInstitution && activeInstitution
    ? String(activeInstitution.id)
    : institutionId;
  const selectedInstitutionName = useSidebarInstitution && activeInstitution
    ? activeInstitution.name
    : institutionName;
  const [programId, setProgramId] = useState("");
  const [programName, setProgramName] = useState("");
  const [sectionId, setSectionId] = useState("");
  const apiSectionId = positiveString(sectionId);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [academicYearId, setAcademicYearId] = useState("");
  const [academicYearName, setAcademicYearName] = useState("");
  const [academicYearStartDate, setAcademicYearStartDate] = useState("");
  const [academicYearEndDate, setAcademicYearEndDate] = useState("");
  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(currentMonth());
  const [fromDate, setFromDate] = useState(today());
  const [toDate, setToDate] = useState(today());
  const [studentSearch, setStudentSearch] = useState("");

  const [mode, setMode] = useState<MarkMode>("FULL_DAY");
  const [slotId, setSlotId] = useState("");
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Record<number, boolean>>({});
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [canMarkFullDay, setCanMarkFullDay] = useState(true);
  const [hasTimetableSlots, setHasTimetableSlots] = useState(false);
  const [fullDay, setFullDay] = useState<Record<number, StatusDraft>>({});
  const [periodAttendance, setPeriodAttendance] = useState<Record<number, Record<number, AttendanceStatus>>>({});
  const [markLoading, setMarkLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [programsLoading, setProgramsLoading] = useState(false);
  const [programDetailLoading, setProgramDetailLoading] = useState(false);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [dailyReportMode, setDailyReportMode] = useState<DailyReportMode>("FULL_DAY");
  const [dailyLoading, setDailyLoading] = useState(false);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dailyRows, setDailyRows] = useState<DailyReportRow[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<DailyReportRow | null>(null);
  const [periodStudents, setPeriodStudents] = useState<PeriodStudentRow[]>([]);
  const [periodStudentsLoading, setPeriodStudentsLoading] = useState(false);
  const [selectedFullDayStatus, setSelectedFullDayStatus] = useState<AttendanceStatus | null>(null);
  const [fullDayStudents, setFullDayStudents] = useState<PeriodStudentRow[]>([]);
  const [fullDayStudentsLoading, setFullDayStudentsLoading] = useState(false);
  const [monthlyRows, setMonthlyRows] = useState<MonthlyReportRow[]>([]);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const fullDayChartData = useMemo<FullDayChartDatum[]>(() => {
    const totals = dailyRows.reduce(
      (result, row) => ({
        PRESENT: result.PRESENT + Number(row.present || 0),
        ABSENT: result.ABSENT + Number(row.absent || 0),
        LEAVE: result.LEAVE + Number(row.leave || 0),
        LATE: result.LATE + Number(row.late || 0),
      }),
      { PRESENT: 0, ABSENT: 0, LEAVE: 0, LATE: 0 }
    );

    return STATUS_OPTIONS.map((status) => ({
      status: STATUS_META[status].label,
      statusCode: status,
      count: totals[status],
    }));
  }, [dailyRows]);

  const markRequestRef = useRef(0);
  const programDetailRequestRef = useRef(0);

  const clearProgram = useCallback(() => {
    programDetailRequestRef.current += 1;
    markRequestRef.current += 1;
    setProgramId("");
    setProgramName("");
    setSections([]);
    setSectionId("");
    setStudents([]);
    setSelectedStudentIds({});
    setSlots([]);
    setCanMarkFullDay(true);
    setHasTimetableSlots(false);
    setSlotId("");
    setFullDay({});
    setPeriodAttendance({});
    setProgramDetailLoading(false);
    setMarkLoading(false);
  }, []);

  const fetchInstitutions = useCallback(async (search: string, page: number) => {
    const res = await fetch(`/api/admin/institutions/profiles?page=${page}&limit=15&search=${encodeURIComponent(search)}`, { headers: authHeader });
    if (!res.ok) throw new Error("Failed to load institutions");
    const json = await res.json();
    return { data: json.data || [], hasMore: page < json.pageCount };
  }, [authHeader]);

  const fetchPrograms = useCallback(async (search: string, page: number) => {
    if (!selectedInstitutionId) return { data: [], hasMore: false };
    setProgramsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15", search, institutionId: selectedInstitutionId });
      const res = await fetch(`/api/admin/institutions/programs?${params.toString()}`, { headers: authHeader });
      if (!res.ok) throw new Error("Failed to load programs");
      const json = await res.json();
      return { data: json.data || [], hasMore: page < json.pageCount };
    } finally {
      setProgramsLoading(false);
    }
  }, [authHeader, selectedInstitutionId]);

  const fetchAcademicYears = useCallback(async (search: string, page: number) => {
    if (!selectedInstitutionId) return { data: [], hasMore: false };
    setYearsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "15",
        search,
        institutionId: selectedInstitutionId,
      });
      const res = await fetch(`/api/admin/institutions/academic-years?${params.toString()}`, {
        headers: authHeader,
      });
      if (!res.ok) throw new Error("Failed to load academic years");
      const json = await res.json();
      return { data: json.data || [], hasMore: page < json.pageCount };
    } catch (err) {
      console.warn("Error fetching academic years:", err);
      return { data: [], hasMore: false };
    } finally {
      setYearsLoading(false);
    }
  }, [authHeader, selectedInstitutionId]);

  const loadSelectedAcademicYear = useCallback(async () => {
    if (!selectedInstitutionId) {
      setAcademicYearId("");
      setAcademicYearName("");
      setAcademicYearStartDate("");
      setAcademicYearEndDate("");
      return;
    }

    if (activeAcademicYearId) {
      const year = getStoredActiveAcademicSession(selectedInstitutionId);
      if (year && year.id === activeAcademicYearId && String(year.institutionId) === selectedInstitutionId) {
        setYearsLoading(false);
        setAcademicYearId(String(year.id));
        setAcademicYearName(year.name);
        setAcademicYearStartDate(year.startDate);
        setAcademicYearEndDate(year.endDate);
        if (year.startDate) {
          setDate(year.startDate);
          setMonth(dateToMonth(year.startDate));
          setFromDate(year.startDate);
          setToDate(year.startDate);
        }
        return;
      }
    }

    // Auto-fetch active academic year for selected institution if not set
    try {
      setYearsLoading(true);
      const res = await fetch(`/api/admin/institutions/academic-years?institutionId=${selectedInstitutionId}&limit=10`, {
        headers: authHeader,
      });
      if (res.ok) {
        const json = await res.json();
        const years: AcademicYearOption[] = json.data || [];
        const activeYear = years.find((y) => y.is_active) || years[0];
        if (activeYear) {
          setAcademicYearId(String(activeYear.id));
          setAcademicYearName(activeYear.name);
          setAcademicYearStartDate(activeYear.start_date || "");
          setAcademicYearEndDate(activeYear.end_date || "");
          if (activeYear.start_date) {
            setDate(activeYear.start_date);
            setMonth(dateToMonth(activeYear.start_date));
            setFromDate(activeYear.start_date);
            setToDate(activeYear.start_date);
          }
        }
      }
    } catch (err) {
      console.warn("Could not auto-fetch academic year:", err);
    } finally {
      setYearsLoading(false);
    }
  }, [activeAcademicYearId, authHeader, selectedInstitutionId]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void loadSelectedAcademicYear(), 0);
    return () => window.clearTimeout(timeout);
  }, [isReady, loadSelectedAcademicYear]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      markRequestRef.current += 1;
      setStudents([]);
      setSelectedStudentIds({});
      setSlots([]);
      setSlotId("");
      setFullDay({});
      setPeriodAttendance({});
      setDailyRows([]);
      setMonthlyRows([]);
      setHistoryRows([]);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activeAcademicYearId]);

  const loadProgramDetail = useCallback(async (id: string) => {
    if (!id) return;
    const requestId = ++programDetailRequestRef.current;
    setProgramDetailLoading(true);
    setSectionId("");
    setSections([]);
    setStudents([]);
    setSelectedStudentIds({});
    setSlots([]);
    setCanMarkFullDay(true);
    setHasTimetableSlots(false);
    setSlotId("");
    try {
      const res = await fetch(`/api/admin/institutions/programs/${id}`, { headers: authHeader });
      const json = await res.json();
      if (requestId !== programDetailRequestRef.current) return;
      if (!res.ok) {
        toast.error(json.error ?? "Failed to load program");
        return;
      }
      if (String(json.data.institution_id) !== selectedInstitutionId) {
        clearProgram();
        toast.error("This program does not belong to the selected institution");
        return;
      }
      setSections((json.data.section_ids || []).map((sectionIdValue: number, index: number) => ({
        id: sectionIdValue,
        name: json.data.section_names?.[index] || `Section ${sectionIdValue}`,
      })));
    } finally {
      if (requestId === programDetailRequestRef.current) setProgramDetailLoading(false);
    }
  }, [authHeader, clearProgram, selectedInstitutionId]);

  const loadMarkData = useCallback(async () => {
    const requestId = ++markRequestRef.current;
    const needsSection = sections.length > 0;
    if (!programId || !academicYearId || !date || programDetailLoading || (needsSection && !apiSectionId)) {
      setStudents([]);
      setSelectedStudentIds({});
      setSlots([]);
      setCanMarkFullDay(true);
      setHasTimetableSlots(false);
      setSlotId("");
      setFullDay({});
      setPeriodAttendance({});
      setMarkLoading(false);
      return;
    }
    setMarkLoading(true);
    try {
      const params = new URLSearchParams({ action: "mark", programId, academicYearId, date });
      if (apiSectionId) params.set("sectionId", apiSectionId);
      const res = await fetch(`/api/admin/students/attendance?${params.toString()}`, { headers: authHeader });
      const json = await res.json();
      if (requestId !== markRequestRef.current) return;
      if (!res.ok) {
        toast.error(json.error ?? "Failed to load attendance");
        return;
      }
      const nextStudents: StudentRow[] = json.students || [];
      const nextSlots: SlotRow[] = json.slots || [];
      const nextCanMarkFullDay = json.canMarkFullDay !== false;
      const fullRows: FullDayRow[] = json.fullDay || [];
      const periodRows: PeriodRow[] = json.period || [];
      const fullMap: Record<number, StatusDraft> = {};
      const periodMap: Record<number, Record<number, AttendanceStatus>> = {};
      nextStudents.forEach((student) => {
        fullMap[student.student_id] = { status: "PRESENT", remarks: "" };
      });
      fullRows.forEach((row) => {
        fullMap[row.student_id] = { status: row.status, remarks: row.remarks || "" };
      });
      periodRows.forEach((row) => {
        periodMap[row.slot_id] = periodMap[row.slot_id] || {};
        periodMap[row.slot_id][row.student_id] = row.status;
      });
      setStudents(nextStudents);
      setSelectedStudentIds({});
      setSlots(nextSlots);
      setCanMarkFullDay(nextCanMarkFullDay);
      setHasTimetableSlots(Boolean(json.hasTimetableSlots));
      setFullDay(fullMap);
      setPeriodAttendance(periodMap);
      if (!nextCanMarkFullDay && mode === "FULL_DAY") {
        toast.error("You are not the class teacher of this section");
        setMode("PERIOD_WISE");
      }
      const firstAllowedSlot = nextSlots.find((slot) => slot.can_mark !== false) ?? nextSlots[0];
      if (!nextCanMarkFullDay && nextSlots.length > 0 && !nextSlots.some((slot) => slot.can_mark !== false)) {
        toast.error("No period is assigned to you for this section on this date");
      }
      if (!slotId && firstAllowedSlot) setSlotId(String(firstAllowedSlot.id));
      if (slotId && !nextSlots.some((slot) => String(slot.id) === slotId && slot.can_mark !== false)) {
        setSlotId(firstAllowedSlot ? String(firstAllowedSlot.id) : "");
      }
    } finally {
      if (requestId === markRequestRef.current) setMarkLoading(false);
    }
  }, [academicYearId, apiSectionId, authHeader, date, mode, programDetailLoading, programId, sections.length, slotId]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void loadMarkData(), 0);
    return () => window.clearTimeout(timeout);
  }, [isReady, loadMarkData]);

  const selectedSlot = slots.find((slot) => String(slot.id) === slotId);
  const selectedSlotCanMark = selectedSlot?.can_mark !== false;
  const academicYearStartYear = yearFromDate(academicYearStartDate);
  const academicYearEndYear = yearFromDate(academicYearEndDate);
  const sessionFromYear = academicYearStartYear ?? 1950;
  const sessionToYear = academicYearEndYear ?? 2100;
  const sessionDateDisabled = useCallback(
    (day: Date) => {
      const start = localDate(academicYearStartDate);
      const end = localDate(academicYearEndDate);
      return Boolean((start && day < start) || (end && day > end));
    },
    [academicYearEndDate, academicYearStartDate],
  );
  const sectionRequired = sections.length > 0;
  const attendanceScopeReady = Boolean(
    programId &&
    academicYearId &&
    date &&
    !programDetailLoading &&
    (!sectionRequired || apiSectionId)
  );
  const selectedSlotStatuses = useMemo(
    () => periodAttendance[Number(slotId)] || {},
    [periodAttendance, slotId]
  );
  const canLoadReports = Boolean(selectedInstitutionId);
  const selectedStudentIdList = useMemo(
    () => students.filter((student) => selectedStudentIds[student.student_id]).map((student) => student.student_id),
    [selectedStudentIds, students]
  );
  const selectedStudentIdSet = useMemo(() => new Set(selectedStudentIdList), [selectedStudentIdList]);
  const canSave = Boolean(
    attendanceScopeReady &&
    selectedStudentIdList.length &&
    (
      (mode === "FULL_DAY" && canMarkFullDay) ||
      (mode === "PERIOD_WISE" && slotId && slots.length && selectedSlotCanMark)
    )
  );
  const periodSetupMissing = mode === "PERIOD_WISE" && attendanceScopeReady && !markLoading && !hasTimetableSlots;
  const periodMappingMissing = mode === "PERIOD_WISE" && attendanceScopeReady && !markLoading && hasTimetableSlots && !slots.length;
  const studentControlsDisabled = markLoading || saving;
  const attendanceTableRows = useMemo<AttendanceStudentTableRow[]>(() => (
    students.map((student) => ({
      ...student,
      status: mode === "FULL_DAY"
        ? fullDay[student.student_id]?.status || "PRESENT"
        : selectedSlotStatuses[student.student_id] || "PRESENT",
      remarks: fullDay[student.student_id]?.remarks || "",
    }))
  ), [fullDay, mode, selectedSlotStatuses, students]);
  const filteredAttendanceRows = useMemo(() => {
    const needle = studentSearch.trim().toLowerCase();
    if (!needle) return attendanceTableRows;
    return attendanceTableRows.filter((student) =>
      [student.full_name, student.email, student.admission_number, student.roll_number]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle))
    );
  }, [attendanceTableRows, studentSearch]);

  function setStudentSelected(studentId: number, selected: boolean) {
    setSelectedStudentIds((prev) => {
      const next = { ...prev };
      if (selected) next[studentId] = true;
      else delete next[studentId];
      return next;
    });
  }

  function ensureStudentSelected(studentId: number) {
    setStudentSelected(studentId, true);
  }

  function syncSelectedRows(rows: AttendanceStudentTableRow[]) {
    const next = Object.fromEntries(rows.map((row) => [row.student_id, true]));
    setSelectedStudentIds((prev) => {
      const prevKeys = Object.keys(prev);
      const nextKeys = Object.keys(next);
      if (prevKeys.length === nextKeys.length && nextKeys.every((key) => prev[Number(key)])) {
        return prev;
      }
      return next;
    });
  }

  function setFullDayStatus(studentId: number, status: AttendanceStatus) {
    ensureStudentSelected(studentId);
    setFullDay((prev) => ({ ...prev, [studentId]: { status, remarks: prev[studentId]?.remarks || "" } }));
  }

  function setFullDayRemarks(studentId: number, remarks: string) {
    ensureStudentSelected(studentId);
    setFullDay((prev) => ({ ...prev, [studentId]: { status: prev[studentId]?.status || "PRESENT", remarks } }));
  }

  function setPeriodStatus(studentId: number, status: AttendanceStatus) {
    if (!slotId) return;
    ensureStudentSelected(studentId);
    setPeriodAttendance((prev) => ({
      ...prev,
      [Number(slotId)]: {
        ...(prev[Number(slotId)] || {}),
        [studentId]: status,
      },
    }));
  }

  const attendanceColumns: ColumnDef<AttendanceStudentTableRow>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? "indeterminate"
                : false
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(Boolean(value))}
          disabled={studentControlsDisabled || !students.length}
          aria-label="Select all students"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
          disabled={studentControlsDisabled}
          aria-label={`Select ${row.original.full_name}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "roll_number",
      header: "Roll",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.roll_number || "-"}</span>
      ),
    },
    {
      accessorKey: "full_name",
      header: "Student",
      cell: ({ row }) => (
        <div className="min-w-44">
          <div className="font-medium">{row.original.full_name}</div>
          <div className="text-xs text-muted-foreground">{row.original.email || "-"}</div>
        </div>
      ),
    },
    {
      accessorKey: "admission_number",
      header: "Admission",
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.admission_number || "-"}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <div className="grid min-w-[420px] grid-cols-2 gap-2 lg:grid-cols-4">
          {STATUS_OPTIONS.map((status) => {
            const meta = STATUS_META[status];
            const active = row.original.status === status;
            return (
              <Button
                key={status}
                type="button"
                size="sm"
                variant="outline"
                className={cn("justify-start", active && meta.className)}
                disabled={studentControlsDisabled || (mode === "PERIOD_WISE" && (!slotId || !selectedSlotCanMark))}
                onClick={() => {
                  row.toggleSelected(true);
                  if (mode === "FULL_DAY") setFullDayStatus(row.original.student_id, status);
                  else setPeriodStatus(row.original.student_id, status);
                }}
              >
                <meta.icon className="mr-2 size-4" />
                {meta.label}
              </Button>
            );
          })}
        </div>
      ),
      enableSorting: false,
    },
    ...(mode === "FULL_DAY"
      ? [{
        accessorKey: "remarks",
        header: "Remarks",
        cell: ({ row }) => (
          <Input
            value={row.original.remarks}
            onChange={(event) => {
              row.toggleSelected(true);
              setFullDayRemarks(row.original.student_id, event.target.value);
            }}
            disabled={studentControlsDisabled}
            placeholder="Optional remarks"
            className="min-w-64"
          />
        ),
        enableSorting: false,
      } satisfies ColumnDef<AttendanceStudentTableRow>]
      : []),
  ];

  async function markAllPeriodsPresent() {
    if (!slots.length) return;
    if (!canMarkFullDay) {
      toast.error("Only the class teacher of this section can mark all periods");
      return;
    }
    if (!selectedStudentIdList.length) {
      toast.error("Select at least one student");
      return;
    }
    setSaving(true);
    try {
      const rows = slots.flatMap((slot) =>
        selectedStudentIdList.map((studentId) => ({ studentId, slotId: slot.id, status: "PRESENT" }))
      );
      const res = await fetch("/api/admin/students/attendance", {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ programId, sectionId: apiSectionId || null, academicYearId, date, mode: "PERIOD_WISE", rows }),
      });
      const json = await res.json();
      if (!res.ok) return toast.error(json.error ?? "Failed to save attendance");
      toast.success("Selected students marked present for all periods");
      await loadMarkData();
    } finally {
      setSaving(false);
    }
  }

  async function saveAttendance() {
    if (!canSave) return;
    setSaving(true);
    try {
      const rows = mode === "FULL_DAY"
        ? students.filter((student) => selectedStudentIdSet.has(student.student_id)).map((student) => ({
          studentId: student.student_id,
          status: fullDay[student.student_id]?.status || "PRESENT",
          remarks: fullDay[student.student_id]?.remarks || null,
        }))
        : students.filter((student) => selectedStudentIdSet.has(student.student_id)).map((student) => ({
          studentId: student.student_id,
          slotId: Number(slotId),
          status: selectedSlotStatuses[student.student_id] || "PRESENT",
        }));
      const res = await fetch("/api/admin/students/attendance", {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ programId, sectionId: apiSectionId || null, academicYearId, date, mode, slotId: slotId || null, rows }),
      });
      const json = await res.json();
      if (!res.ok) return toast.error(json.error ?? "Failed to save attendance");
      toast.success("Attendance saved");
      await loadMarkData();
    } finally {
      setSaving(false);
    }
  }

  async function loadDailyReport() {
    if (!canLoadReports) return;
    setDailyLoading(true);
    try {
      const params = new URLSearchParams({
        action: "daily",
        institutionId: selectedInstitutionId,
        date,
        reportMode: dailyReportMode,
      });
      if (programId) params.set("programId", programId);
      if (apiSectionId) params.set("sectionId", apiSectionId);
      if (academicYearId) params.set("academicYearId", academicYearId);
      const res = await fetch(`/api/admin/students/attendance?${params.toString()}`, { headers: authHeader });
      const json = await res.json();
      if (!res.ok) return toast.error(json.error ?? "Failed to load daily report");
      setDailyRows(json.data || []);
    } finally {
      setDailyLoading(false);
    }
  }

  async function openPeriodStudents(period: DailyReportRow) {
    if (!period.slot_id || !programId || !academicYearId) return;

    setSelectedPeriod(period);
    setPeriodStudents([]);
    setPeriodStudentsLoading(true);
    try {
      const params = new URLSearchParams({
        action: "periodStudents",
        institutionId: selectedInstitutionId,
        programId,
        academicYearId,
        slotId: String(period.slot_id),
        date,
      });
      if (apiSectionId) params.set("sectionId", apiSectionId);
      const res = await fetch(`/api/admin/students/attendance?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to load present students");
        return;
      }
      setPeriodStudents(json.data || []);
    } finally {
      setPeriodStudentsLoading(false);
    }
  }

  async function openFullDayStudents(status: AttendanceStatus) {
    if (!programId || !academicYearId) return;

    setSelectedFullDayStatus(status);
    setFullDayStudents([]);
    setFullDayStudentsLoading(true);
    try {
      const params = new URLSearchParams({
        action: "fullDayStudents",
        institutionId: selectedInstitutionId,
        programId,
        academicYearId,
        status,
        date,
      });
      if (apiSectionId) params.set("sectionId", apiSectionId);
      const res = await fetch(`/api/admin/students/attendance?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? `Failed to load ${STATUS_META[status].label.toLowerCase()} students`);
        return;
      }
      setFullDayStudents(json.data || []);
    } finally {
      setFullDayStudentsLoading(false);
    }
  }

  async function loadMonthlyReport() {
    if (!programId || !academicYearId || (sectionRequired && !apiSectionId)) return;
    setMonthlyLoading(true);
    try {
      const params = new URLSearchParams({ action: "monthly", programId, academicYearId, month });
      if (apiSectionId) params.set("sectionId", apiSectionId);
      const res = await fetch(`/api/admin/students/attendance?${params.toString()}`, { headers: authHeader });
      const json = await res.json();
      if (!res.ok) return toast.error(json.error ?? "Failed to load monthly report");
      setMonthlyRows(json.data || []);
    } finally {
      setMonthlyLoading(false);
    }
  }

  async function loadHistory() {
    if (fromDate && toDate && toDate < fromDate) {
      toast.error("To date cannot be before from date.");
      return;
    }
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({ action: "history", from: fromDate, to: toDate });
      if (selectedInstitutionId) params.set("institutionId", selectedInstitutionId);
      if (programId) params.set("programId", programId);
      if (apiSectionId) params.set("sectionId", apiSectionId);
      if (academicYearId) params.set("academicYearId", academicYearId);
      const res = await fetch(`/api/admin/students/attendance?${params.toString()}`, { headers: authHeader });
      const json = await res.json();
      if (!res.ok) return toast.error(json.error ?? "Failed to load history");
      setHistoryRows(json.data || []);
    } finally {
      setHistoryLoading(false);
    }
  }

  if (!isReady) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-60" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">Track daily and period-wise student attendance by class section.</p>
        </div>
        <div className="flex rounded-md border border-border bg-card p-1">
          {(Object.keys(VIEW_LABELS) as AttendanceView[]).map((item) => (
            <Button
              key={item}
              size="sm"
              variant={view === item ? "destructive" : "ghost"}
              onClick={() => updateView(item)}
            >
              {VIEW_LABELS[item]}
            </Button>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-border bg-card p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="min-h-[104px] space-y-2 rounded-md border border-border bg-background/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Institution</Label>
              <Badge variant="outline" className="shrink-0">Step 1</Badge>
            </div>
            {useSidebarInstitution ? (
              <div className="flex h-10 items-center rounded-md border bg-muted/40 px-3 text-sm font-semibold text-foreground">
                <span className="truncate">{selectedInstitutionName || "Active institution"}</span>
              </div>
            ) : (
              <AsyncSearchPopover<InstitutionOption>
                value={institutionId}
                selectedLabel={institutionName}
                placeholder="Select institution..."
                searchPlaceholder="Search institutions..."
                fetcher={fetchInstitutions}
                getValue={(item) => String(item.id)}
                getLabel={(item) => item.name || item.organization_name || `Institution ${item.id}`}
                onChange={(value) => {
                  setInstitutionId(value);
                  clearProgram();
                }}
                onSelectItem={(item) => {
                  setInstitutionName(item.name || item.organization_name || `Institution ${item.id}`);
                }}
              />
            )}
          </div>
          <div className="min-h-[104px] space-y-2 rounded-md border border-border bg-background/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Program</Label>
              <Badge variant="outline" className="shrink-0">Step 2</Badge>
            </div>
            <AsyncSearchPopover<ProgramOption>
              value={programId}
              selectedLabel={programName}
              placeholder={selectedInstitutionId ? "Select program..." : "Select institution first"}
              searchPlaceholder="Search programs..."
              disabled={!selectedInstitutionId}
              loading={programsLoading}
              fetcher={fetchPrograms}
              getValue={(item) => String(item.id)}
              getLabel={(item) => item.title}
              onChange={(value) => {
                setProgramId(value);
                setSectionId("");
                setStudents([]);
                setSelectedStudentIds({});
                setSlots([]);
                setCanMarkFullDay(true);
                setHasTimetableSlots(false);
                setSlotId("");
                setFullDay({});
                setPeriodAttendance({});
                if (value) void loadProgramDetail(value);
              }}
              onSelectItem={(item) => setProgramName(item.title)}
            />
          </div>
          <div className="min-h-[104px] space-y-2 rounded-md border border-border bg-background/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Section</Label>
              <Badge variant="outline" className="shrink-0">Step 3</Badge>
            </div>
            <Select value={sectionId} onValueChange={setSectionId} disabled={!programId || programDetailLoading || sections.length === 0}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={programDetailLoading ? "Loading sections..." : sections.length ? "Select section..." : programId ? "All students" : "Select program first"} />
                {programDetailLoading ? <Loader2 className="ml-2 size-4 animate-spin text-muted-foreground" /> : null}
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={String(section.id)}>{section.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="min-h-[104px] space-y-2 rounded-md border border-border bg-background/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Academic Year</Label>
              <Badge variant="outline" className="shrink-0">Step 4</Badge>
            </div>
            <AsyncSearchPopover<AcademicYearOption>
              value={academicYearId}
              selectedLabel={academicYearName}
              placeholder={selectedInstitutionId ? "Select academic year..." : "Select institution first"}
              searchPlaceholder="Search academic year / session..."
              disabled={!selectedInstitutionId}
              loading={yearsLoading}
              fetcher={fetchAcademicYears}
              getValue={(item) => String(item.id)}
              getLabel={(item) => item.name}
              onChange={(value) => {
                setAcademicYearId(value);
              }}
              onSelectItem={(item) => {
                setAcademicYearName(item.name);
                setAcademicYearStartDate(item.start_date || "");
                setAcademicYearEndDate(item.end_date || "");
                if (item.start_date) {
                  setDate(item.start_date);
                  setMonth(dateToMonth(item.start_date));
                  setFromDate(item.start_date);
                  setToDate(item.start_date);
                }
              }}
            />
          </div>
        </div>
      </div>

      {view === "mark" && (
        <div className="rounded-md border border-border bg-card">
          <div className="border-b border-border p-4">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarCheck className="size-5 text-destructive" /> Mark Attendance</h2>
              <p className="text-sm text-muted-foreground">Full day attendance saves daily records. Period attendance follows timetable periods.</p>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <div className="min-w-0 flex-[1_1_12rem] space-y-1.5 sm:max-w-[13rem]">
                <Label>Date</Label>
                <DatePicker
                  value={date}
                  onChange={setDate}
                  placeholder="Pick a date"
                  className="w-full"
                  disabledDates={sessionDateDisabled}
                  fromYear={sessionFromYear}
                  toYear={sessionToYear}
                />
              </div>
              <div className="min-w-0 flex-[1_1_13rem] space-y-1.5 sm:max-w-[14rem]">
                <Label>Mode</Label>
                <div className="grid grid-cols-2 rounded-md border border-border bg-background p-1">
                  <Button
                    className="min-w-0 px-2"
                    size="sm"
                    variant={mode === "FULL_DAY" ? "destructive" : "ghost"}
                    disabled={!canMarkFullDay}
                    title={!canMarkFullDay ? "You are not the class teacher of this section" : undefined}
                    onClick={() => setMode("FULL_DAY")}
                  >
                    Full Day
                  </Button>
                  <Button className="min-w-0 px-2" size="sm" variant={mode === "PERIOD_WISE" ? "destructive" : "ghost"} onClick={() => setMode("PERIOD_WISE")}>Period Wise</Button>
                </div>
              </div>
              {mode === "PERIOD_WISE" && (
                <div className="min-w-0 flex-[999_1_17rem] space-y-1.5">
                  <Label>Period</Label>
                  <Select value={slotId} onValueChange={setSlotId} disabled={!slots.length || markLoading}>
                    <SelectTrigger className="w-full min-w-0 [&_[data-slot=select-value]]:truncate">
                      <SelectValue placeholder={markLoading ? "Loading periods..." : slots.length ? "Select mapped period..." : hasTimetableSlots ? "No mapped periods" : "No timetable slots"} />
                    </SelectTrigger>
                    <SelectContent>
                      {slots.map((slot) => (
                        <SelectItem key={slot.id} value={String(slot.id)} disabled={slot.can_mark === false}>
                          {slot.slot_name || `Period ${slot.slot_order}`} · {formatTime(slot.start_time)}-{formatTime(slot.end_time)}
                          {slot.subject_name ? ` · ${slot.subject_name}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {mode === "PERIOD_WISE" && (
                <Button
                  className="min-w-0 flex-[1_1_13rem] whitespace-nowrap sm:flex-none"
                  variant="outline"
                  onClick={markAllPeriodsPresent}
                  disabled={!canMarkFullDay || !selectedStudentIdList.length || !slots.length || saving || markLoading}
                  title={!canMarkFullDay ? "Only the class teacher of this section can mark all periods" : undefined}
                >
                  {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Mark All Periods Present
                </Button>
              )}
              <Button className="min-w-0 flex-[1_1_11rem] whitespace-nowrap sm:flex-none" onClick={saveAttendance} disabled={!canSave || saving || markLoading}>
                {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                {mode === "PERIOD_WISE" ? "Mark This Period" : "Mark Attendance"}
              </Button>
            </div>
          </div>
          {mode === "PERIOD_WISE" && selectedSlot && (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border px-4 py-3 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">
                {selectedSlot.slot_name || `Period ${selectedSlot.slot_order}`}
              </span>
              <span aria-hidden="true" className="text-muted-foreground/70">|</span>
              {formatTime(selectedSlot.start_time)} - {formatTime(selectedSlot.end_time)}
              <span aria-hidden="true" className="text-muted-foreground/70">|</span>
              <span className="min-w-0 truncate">{selectedSlot.subject_name || "Subject not assigned"}</span>
              <span aria-hidden="true" className="text-muted-foreground/70">|</span>
              <span className="min-w-0 truncate">{selectedSlot.teacher_name || "Teacher not assigned"}</span>
            </div>
          )}
          {periodSetupMissing && (
            <div className="border-b border-border px-4 py-4">
              <div className="flex flex-col gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100">Timetable slot is not created yet.</p>
                  <p className="mt-1 text-amber-800/80 dark:text-amber-100/80">
                    Create class period slots first, then map subjects and teachers for period-wise attendance.
                  </p>
                </div>
                <Button type="button" variant="outline" className="shrink-0" onClick={() => router.push(toRoleRoutePath("/admin/master-data/timetable-setup", user))}>
                  Create Timetable Slot
                </Button>
              </div>
            </div>
          )}
          {periodMappingMissing && (
            <div className="border-b border-border px-4 py-4">
              <div className="flex flex-col gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-amber-900 dark:text-amber-100">No mapped class periods for this date.</p>
                  <p className="mt-1 text-amber-800/80 dark:text-amber-100/80">
                    Map subject and teacher periods for this class weekday before marking period-wise attendance.
                  </p>
                </div>
                <Button type="button" variant="outline" className="shrink-0" onClick={() => router.push(toRoleRoutePath("/admin/master-data/timetable-setup", user))}>
                  Open Period Mapping
                </Button>
              </div>
            </div>
          )}
          {!attendanceScopeReady ? (
            <div className="p-12 text-center text-muted-foreground">
              {programDetailLoading
                ? "Loading class setup..."
                : sectionRequired
                  ? "Select program, section, academic year, and date to load students."
                  : "Select program, academic year, and date to load students."}
            </div>
          ) : !markLoading && !students.length ? (
            <div className="p-12 text-center text-muted-foreground">No enrolled students found for this class.</div>
          ) : !markLoading && mode === "PERIOD_WISE" && !slots.length ? (
            <div className="p-12 text-center text-muted-foreground">
              {hasTimetableSlots
                ? "No mapped periods found for this class and date."
                : "Create timetable slots before marking period-wise attendance."}
            </div>
          ) : (
            <div className="px-4">
              <DataTable
                key={`${mode}-${programId}-${sectionId || "all"}-${academicYearId}-${date}`}
                columns={attendanceColumns}
                data={markLoading ? [] : filteredAttendanceRows}
                loading={markLoading}
                emptyText="No students match your search."
                getRowId={(row) => String(row.student_id)}
                onSelectionChange={syncSelectedRows}
                toolbarLeft={(
                  <Input
                    value={studentSearch}
                    onChange={(event) => setStudentSearch(event.target.value)}
                    placeholder="Search student..."
                    className="w-full sm:w-80"
                    disabled={markLoading}
                  />
                )}
                selectedActions={(selectedRows) => (
                  <div className="text-sm text-muted-foreground">
                    Attendance will be saved for {selectedRows.length} selected student{selectedRows.length === 1 ? "" : "s"}.
                  </div>
                )}
              />
            </div>
          )}
        </div>
      )}

      {view === "daily" && (
        <div className="rounded-md border border-border bg-card">
          <div className="border-b border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">Daily Attendance</h2>
                <p className="text-sm text-muted-foreground">
                  View full-day totals or attendance recorded for each timetable period.
                </p>
              </div>
              <div className="flex rounded-md border border-border bg-background p-1">
                <Button
                  size="sm"
                  variant={dailyReportMode === "FULL_DAY" ? "destructive" : "ghost"}
                  onClick={() => {
                    setDailyReportMode("FULL_DAY");
                    setDailyRows([]);
                  }}
                >
                  Full Day
                </Button>
                <Button
                  size="sm"
                  variant={dailyReportMode === "PERIOD_WISE" ? "destructive" : "ghost"}
                  onClick={() => {
                    setDailyReportMode("PERIOD_WISE");
                    setDailyRows([]);
                  }}
                >
                  Period Wise
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-end justify-end gap-3">
              <div className="w-full space-y-2 sm:w-44">
                <Label>Date</Label>
                <DatePicker
                  value={date}
                  onChange={setDate}
                  placeholder="Pick a date"
                  className="w-full"
                  disabledDates={sessionDateDisabled}
                  fromYear={sessionFromYear}
                  toYear={sessionToYear}
                />
              </div>
              <Button className="w-full sm:w-auto" onClick={loadDailyReport} disabled={!canLoadReports || dailyLoading}>
                {dailyLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Load Report
              </Button>
            </div>
          </div>
          {dailyLoading ? <LoadingRows /> : dailyReportMode === "PERIOD_WISE" ? (
            <div className="p-4">
              {dailyRows.length ? (
                <div className="rounded-md border border-border bg-background/40 p-4">
                  <div className="mb-4">
                    <h3 className="font-semibold">Period Attendance</h3>
                    <p className="text-sm text-muted-foreground">
                      Present students by period. Select a bar to view the student list.
                    </p>
                  </div>
                  <ChartContainer
                    config={PERIOD_CHART_CONFIG}
                    className="w-full"
                    initialDimension={{ width: 900, height: Math.max(260, dailyRows.length * 58) }}
                    style={{ height: Math.max(260, dailyRows.length * 58) }}
                  >
                    <BarChart
                      accessibilityLayer
                      data={dailyRows.map((row) => ({
                        ...row,
                        periodLabel: `${row.period_name || `Period ${row.slot_order || ""}`} (${formatTime(row.start_time || "")}-${formatTime(row.end_time || "")})`,
                      }))}
                      layout="vertical"
                      margin={{ left: 12, right: 44 }}
                    >
                      <CartesianGrid horizontal={false} />
                      <YAxis
                        dataKey="periodLabel"
                        type="category"
                        tickLine={false}
                        axisLine={false}
                        width={190}
                      />
                      <XAxis dataKey="present" type="number" allowDecimals={false} hide />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="line" />}
                      />
                      <Bar
                        dataKey="present"
                        fill="var(--color-present)"
                        radius={4}
                        className="cursor-pointer"
                        onClick={(entry) => {
                          const period = (entry as { payload?: DailyReportRow }).payload;
                          if (period) void openPeriodStudents(period);
                        }}
                      >
                        <LabelList dataKey="present" position="right" className="fill-foreground font-medium" />
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No period-wise attendance found.
                </div>
              )}
            </div>
          ) : (
            <div className="p-4">
              {dailyRows.length ? (
                <div className="rounded-md border border-border bg-background/40 p-4">
                  <div className="mb-2">
                    <h3 className="font-semibold">Full Day Attendance</h3>
                    <p className="text-sm text-muted-foreground">
                      Select Present, Absent, Leave, or Late on the chart to view those students.
                    </p>
                  </div>
                  <ChartContainer
                    config={FULL_DAY_CHART_CONFIG}
                    className="mx-auto h-[360px] w-full max-w-2xl"
                    initialDimension={{ width: 640, height: 360 }}
                  >
                    <RadarChart
                      accessibilityLayer
                      data={fullDayChartData}
                      outerRadius="72%"
                      className="cursor-pointer"
                      onClick={(state) => {
                        const selected = fullDayChartData.find((item) => item.status === state?.activeLabel);
                        if (selected) void openFullDayStudents(selected.statusCode);
                      }}
                    >
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent indicator="line" />}
                      />
                      <PolarGrid />
                      <PolarAngleAxis
                        dataKey="status"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 13 }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, Math.max(1, ...fullDayChartData.map((item) => item.count))]}
                        tick={false}
                        axisLine={false}
                      />
                      <Radar
                        dataKey="count"
                        fill="var(--color-count)"
                        fillOpacity={0.45}
                        stroke="var(--color-count)"
                        strokeWidth={2}
                        dot={{ r: 5, fill: "var(--color-count)", strokeWidth: 0 }}
                      />
                    </RadarChart>
                  </ChartContainer>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  No full-day attendance found.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {view === "monthly" && (
        <div className="rounded-md border border-border bg-card">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border p-4">
            <div>
              <h2 className="text-lg font-semibold">Monthly Attendance</h2>
              <p className="text-sm text-muted-foreground">Student-wise percentage for the selected month.</p>
            </div>
            <div className="flex items-end gap-3">
              <div className="space-y-2">
                <Label>Month</Label>
                <MonthPicker
                  value={month}
                  onChange={setMonth}
                  placeholder="Pick month"
                  className="w-44"
                  fromYear={sessionFromYear}
                  toYear={sessionToYear}
                />
              </div>
              <Button onClick={loadMonthlyReport} disabled={!programId || !academicYearId || (sectionRequired && !apiSectionId) || monthlyLoading}>
                {monthlyLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Load Report
              </Button>
            </div>
          </div>
          {monthlyLoading ? <LoadingRows /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-border bg-muted/30 text-left">
                  <tr>
                    <th className="px-4 py-3">Roll</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Total</th>
                    <th className="px-4 py-3">Present</th>
                    <th className="px-4 py-3">Absent</th>
                    <th className="px-4 py-3">Leave</th>
                    <th className="px-4 py-3">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {monthlyRows.map((row) => (
                    <tr key={row.student_id} className="border-b border-border/70">
                      <td className="px-4 py-3 text-muted-foreground">{row.roll_number || "-"}</td>
                      <td className="px-4 py-3 font-medium">{row.full_name}</td>
                      <td className="px-4 py-3">{row.total}</td>
                      <td className="px-4 py-3 text-emerald-300">{row.present}</td>
                      <td className="px-4 py-3 text-destructive">{row.absent}</td>
                      <td className="px-4 py-3 text-sky-300">{row.leave}</td>
                      <td className="px-4 py-3 font-semibold">{asPercent(row.present, row.total)}</td>
                    </tr>
                  ))}
                  {!monthlyRows.length && <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">No monthly data found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {view === "history" && (
        <div className="rounded-md border border-border bg-card">
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border p-4">
            <div>
              <h2 className="text-lg font-semibold">Student Attendance History</h2>
              <p className="text-sm text-muted-foreground">Date range history for selected scope.</p>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-2">
                <Label>From Date</Label>
                <DatePicker
                  value={fromDate}
                  onChange={setFromDate}
                  placeholder="Select from date"
                  className="w-44"
                  disabledDates={sessionDateDisabled}
                  fromYear={sessionFromYear}
                  toYear={sessionToYear}
                />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <DatePicker
                  value={toDate}
                  onChange={setToDate}
                  placeholder="Select to date"
                  className="w-44"
                  disabledDates={sessionDateDisabled}
                  fromYear={sessionFromYear}
                  toYear={sessionToYear}
                />
              </div>
              <Button onClick={loadHistory} disabled={historyLoading || !selectedInstitutionId}>
                {historyLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Load History
              </Button>
            </div>
          </div>
          {historyLoading ? <LoadingRows /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] text-sm">
                <thead className="border-b border-border bg-muted/30 text-left">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Class</th>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((row, index) => (
                    <tr key={`${row.student_id}-${row.attendance_date}-${index}`} className="border-b border-border/70">
                      <td className="px-4 py-3">{formatDate(row.attendance_date)}</td>
                      <td className="px-4 py-3 font-medium">{row.full_name}</td>
                      <td className="px-4 py-3">{row.program_name}</td>
                      <td className="px-4 py-3">{row.section_name}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3 text-muted-foreground">{row.remarks || "-"}</td>
                    </tr>
                  ))}
                  {!historyRows.length && <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No history found.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Sheet
        open={Boolean(selectedPeriod)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPeriod(null);
            setPeriodStudents([]);
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{selectedPeriod?.period_name || "Period attendance"}</SheetTitle>
            <SheetDescription>
              {selectedPeriod
                ? `${selectedPeriod.program_name} - ${selectedPeriod.section_name} - ${formatTime(selectedPeriod.start_time || "")}-${formatTime(selectedPeriod.end_time || "")}`
                : "Present students"}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <div className="mb-4 rounded-md border border-border bg-muted/40 p-3 text-sm">
              <div className="font-medium">{selectedPeriod?.subject_name || "Subject not assigned"}</div>
              <div className="text-muted-foreground">
                {selectedPeriod?.teacher_name || "Teacher not assigned"} - {selectedPeriod?.present || 0} present
              </div>
            </div>
            {periodStudentsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : periodStudents.length ? (
              <ItemGroup>
                {periodStudents.map((student) => (
                  <Item key={student.student_id} variant="outline">
                    <ItemMedia>
                      <Avatar className="size-11">
                        <AvatarImage src={student.avatar_url || undefined} alt={student.full_name} />
                        <AvatarFallback>{initials(student.full_name)}</AvatarFallback>
                      </Avatar>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{student.full_name}</ItemTitle>
                      <ItemDescription>
                        ID: {student.admission_number || student.roll_number || student.student_id}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                ))}
              </ItemGroup>
            ) : (
              <div className="rounded-md border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                No present students found for this period.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(selectedFullDayStatus)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedFullDayStatus(null);
            setFullDayStudents([]);
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>
              {selectedFullDayStatus ? `${STATUS_META[selectedFullDayStatus].label} students` : "Full day attendance"}
            </SheetTitle>
            <SheetDescription>
              {programName || "Selected class"} - {sections.find((section) => String(section.id) === sectionId)?.name || "All students"} - {formatDate(date)}
            </SheetDescription>
          </SheetHeader>
          <div className="px-4 pb-6">
            <div className="mb-4 rounded-md border border-border bg-muted/40 p-3 text-sm">
              <div className="font-medium">
                {selectedFullDayStatus ? STATUS_META[selectedFullDayStatus].label : "Attendance status"}
              </div>
              <div className="text-muted-foreground">
                {fullDayStudents.length} student{fullDayStudents.length === 1 ? "" : "s"}
              </div>
            </div>
            {fullDayStudentsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, index) => (
                  <Skeleton key={index} className="h-16 w-full" />
                ))}
              </div>
            ) : fullDayStudents.length ? (
              <ItemGroup>
                {fullDayStudents.map((student) => (
                  <Item key={student.student_id} variant="outline">
                    <ItemMedia>
                      <Avatar className="size-11">
                        <AvatarImage src={student.avatar_url || undefined} alt={student.full_name} />
                        <AvatarFallback>{initials(student.full_name)}</AvatarFallback>
                      </Avatar>
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{student.full_name}</ItemTitle>
                      <ItemDescription>
                        ID: {student.admission_number || student.roll_number || student.student_id}
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                ))}
              </ItemGroup>
            ) : (
              <div className="rounded-md border border-dashed border-border px-4 py-12 text-center text-sm text-muted-foreground">
                No students found for this attendance status.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
