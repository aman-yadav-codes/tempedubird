"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  CalendarCheck,
  Clock3,
  History,
  Loader2,
  MessageSquareText,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import { DatePicker } from "@/components/shared/date-picker";
import { MonthPicker } from "@/components/shared/month-picker";
import { TimePicker } from "@/components/shared/time-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useActiveAcademicYearId } from "@/hooks/use-active-academic-year-id";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { hasPermission } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

type StaffAttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE" | "LATE" | "HALF_DAY";
type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";
type Mode = "admin" | "self";

type StaffRow = {
  staff_user_id: number;
  full_name: string;
  email?: string | null;
  role_code: "teacher" | "driver";
  status: StaffAttendanceStatus | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  remarks: string;
  leave_from_date?: string;
  leave_to_date?: string;
};

type SelfAttendanceRow = {
  attendance_date: string;
  status: StaffAttendanceStatus;
  check_in_time?: string | null;
  check_out_time?: string | null;
  remarks: string;
};

type HistoryRow = SelfAttendanceRow & {
  id: number;
  staff_user_id: number;
  full_name: string;
  email?: string | null;
  role_code: "teacher" | "driver";
  marked_by_name?: string | null;
  updated_at?: string | null;
};

type LeaveRow = {
  id: number;
  staff_user_id: number;
  full_name: string;
  role_code: "teacher" | "driver";
  from_date: string;
  to_date: string;
  message: string;
  status: LeaveStatus;
  admin_note?: string | null;
  created_at: string;
  decided_by_name?: string | null;
  decided_at?: string | null;
};

const STATUS_OPTIONS: StaffAttendanceStatus[] = ["PRESENT", "ABSENT", "LEAVE", "LATE", "HALF_DAY"];
const PAGE_SIZE_OPTIONS = [10, 20, 50];
const UNMARKED_VALUE = "UNMARKED";

const STATUS_META: Record<StaffAttendanceStatus | LeaveStatus, { label: string; className: string }> = {
  PRESENT: { label: "Present", className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200" },
  ABSENT: { label: "Absent", className: "border-destructive/50 bg-destructive/15 text-destructive" },
  LEAVE: { label: "Leave", className: "border-sky-500/40 bg-sky-500/15 text-sky-200" },
  LATE: { label: "Late", className: "border-amber-500/40 bg-amber-500/15 text-amber-200" },
  HALF_DAY: { label: "Half Day", className: "border-violet-500/40 bg-violet-500/15 text-violet-200" },
  PENDING: { label: "Pending", className: "border-amber-500/40 bg-amber-500/15 text-amber-200" },
  APPROVED: { label: "Approved", className: "border-emerald-500/40 bg-emerald-500/15 text-emerald-200" },
  REJECTED: { label: "Rejected", className: "border-destructive/50 bg-destructive/15 text-destructive" },
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function addDays(value: string, days: number) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function isBeforeDate(value: string, minimum: string) {
  return Boolean(value && minimum && value < minimum);
}

function disableBefore(value: string) {
  return value ? { before: new Date(`${value}T00:00:00`) } : undefined;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatTime(value?: string | null) {
  return value?.slice(0, 5) || "";
}

function StatusBadge({ status }: { status: StaffAttendanceStatus | LeaveStatus | null }) {
  if (!status) {
    return <Badge variant="outline" className="rounded-md border-border text-muted-foreground">Unmarked</Badge>;
  }
  const meta = STATUS_META[status];
  return <Badge variant="outline" className={cn("border", meta.className)}>{meta.label}</Badge>;
}

function roleLabel(roleCode: string) {
  return roleCode === "driver" ? "Driver" : "Teacher";
}

function PaginationControls({
  page,
  pageCount,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-sm">
      <div className="text-muted-foreground">
        Showing page {page} of {Math.max(pageCount, 1)} - {total} record{total === 1 ? "" : "s"}
      </div>
      <div className="flex items-center gap-2">
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger className="h-9 w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAGE_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size} value={String(size)}>{size} rows</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

function TodayLeaveToggle({
  checked,
  onCheckedChange,
  label = "Today",
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex h-10 items-center gap-2 rounded-md border border-border bg-background px-3 text-sm">
      <Checkbox checked={checked} onCheckedChange={(value) => onCheckedChange(value === true)} />
      {label}
    </label>
  );
}

function TableSkeleton({ columns = 6 }: { columns?: number }) {
  return (
    <>
      {Array.from({ length: 8 }, (_, index) => (
        <tr key={index} className="border-b border-border/70">
          {Array.from({ length: columns }, (_, column) => (
            <td key={column} className="px-4 py-3">
              <Skeleton className="h-8 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function StaffAttendanceClient({ mode }: { mode: Mode }) {
  const { isReady } = useAdminGuard();
  const searchParams = useSearchParams();
  const { accessToken, user } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const activeAcademicYearId = useActiveAcademicYearId();
  const [tab, setTab] = useState(() => {
    const requestedTab = searchParams.get("tab");
    if (mode === "admin" && requestedTab === "leaves") return "leaves";
    if (mode === "admin" && requestedTab === "history") return "history";
    return mode === "self" ? "my-attendance" : "attendance";
  });
  const [date, setDate] = useState(today());
  const [month, setMonth] = useState(currentMonth());
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [selfAttendance, setSelfAttendance] = useState<SelfAttendanceRow[]>([]);
  const [historyRows, setHistoryRows] = useState<HistoryRow[]>([]);
  const [leaves, setLeaves] = useState<LeaveRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusNote, setStatusNote] = useState<Record<number, string>>({});
  const [selectedStaffIds, setSelectedStaffIds] = useState<Record<number, boolean>>({});
  const [bulkStatus, setBulkStatus] = useState<StaffAttendanceStatus>("PRESENT");
  const [bulkCheckIn, setBulkCheckIn] = useState("");
  const [bulkCheckOut, setBulkCheckOut] = useState("");
  const [bulkRemarks, setBulkRemarks] = useState("");
  const [bulkLeaveFromDate, setBulkLeaveFromDate] = useState(date);
  const [bulkLeaveToDate, setBulkLeaveToDate] = useState(date);
  const [selfStatus, setSelfStatus] = useState<StaffAttendanceStatus>("PRESENT");
  const [selfDate, setSelfDate] = useState(today());
  const [selfCheckIn, setSelfCheckIn] = useState("");
  const [selfCheckOut, setSelfCheckOut] = useState("");
  const [selfRemarks, setSelfRemarks] = useState("");
  const [selfLeaveFromDate, setSelfLeaveFromDate] = useState(today());
  const [selfLeaveToDate, setSelfLeaveToDate] = useState(today());
  const [selfSaving, setSelfSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRows, setTotalRows] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyTotalRows, setHistoryTotalRows] = useState(0);
  const [historyFromDate, setHistoryFromDate] = useState(today());
  const [historyToDate, setHistoryToDate] = useState(today());
  const [historyRoleCode, setHistoryRoleCode] = useState("all");
  const authHeaders = useMemo(
    () => accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
    [accessToken]
  );

  const institutionId = activeInstitution?.id ? String(activeInstitution.id) : "";
  const canSelfMark = Boolean(
    activeInstitution?.id &&
      (
        hasPermission(user, "teacher.myinstitution.myattendance.create", { institutionId: activeInstitution.id }) ||
        hasPermission(user, "driver.myinstitution.myattendance.create", { institutionId: activeInstitution.id })
      )
  );

  const loadData = useCallback(async () => {
    if (!isReady || !authHeaders || !institutionId) return;
    if (mode === "admin" && tab === "history") return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        institutionId,
        mode,
        date,
        month,
        page: String(page),
        limit: String(pageSize),
      });
      if (mode === "admin" && tab === "leaves") {
        params.set("action", "leaves");
      }
      if (mode === "self" && tab === "leave-request") {
        params.set("action", "leaves");
      }
      const res = await fetch(`/api/admin/staff/attendance?${params.toString()}`, { headers: authHeaders });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load staff attendance");
      if (Array.isArray(json.staff)) {
        setStaff(json.staff.map((row: StaffRow) => ({
          ...row,
          status: row.status ?? null,
          leave_from_date: date,
          leave_to_date: date,
        })));
      }
      if (Array.isArray(json.attendance)) setSelfAttendance(json.attendance);
      if (Array.isArray(json.leaves)) setLeaves(json.leaves);
      if (json.pagination) setTotalRows(Number(json.pagination.total || 0));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load staff attendance");
    } finally {
      setLoading(false);
    }
  }, [authHeaders, date, institutionId, isReady, mode, month, page, pageSize, tab]);

  const loadHistory = useCallback(async () => {
    if (!isReady || !authHeaders || !institutionId || mode !== "admin") return;
    setHistoryLoading(true);
    try {
      const params = new URLSearchParams({
        institutionId,
        action: "history",
        fromDate: historyFromDate,
        toDate: historyToDate,
        page: String(historyPage),
        limit: String(historyPageSize),
      });
      if (historyRoleCode !== "all") params.set("roleCode", historyRoleCode);
      const res = await fetch(`/api/admin/staff/attendance?${params.toString()}`, { headers: authHeaders });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load attendance history");
      setHistoryRows(json.history || []);
      setHistoryTotalRows(Number(json.pagination?.total || 0));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load attendance history");
    } finally {
      setHistoryLoading(false);
    }
  }, [authHeaders, historyFromDate, historyPage, historyPageSize, historyRoleCode, historyToDate, institutionId, isReady, mode]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadData(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadData]);

  useEffect(() => {
    if (tab !== "history") return;
    const timeout = window.setTimeout(() => void loadHistory(), 0);
    return () => window.clearTimeout(timeout);
  }, [loadHistory, tab]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSelectedStaffIds({});
      setBulkLeaveFromDate(date);
      setBulkLeaveToDate(date);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [date]);

  function updateStaffRow(staffUserId: number, patch: Partial<StaffRow>) {
    setStaff((current) =>
      current.map((row) =>
        row.staff_user_id === staffUserId ? { ...row, ...patch } : row
      )
    );
  }

  const selectedIds = useMemo(
    () => Object.entries(selectedStaffIds).filter(([, selected]) => selected).map(([id]) => Number(id)),
    [selectedStaffIds]
  );
  const allPageSelected = staff.length > 0 && staff.every((row) => selectedStaffIds[row.staff_user_id]);
  const pageCount = Math.max(1, Math.ceil(totalRows / pageSize));
  const historyPageCount = Math.max(1, Math.ceil(historyTotalRows / historyPageSize));
  const bulkLeaveIsToday = bulkLeaveFromDate === date && bulkLeaveToDate === date;
  const selfLeaveIsToday = selfLeaveFromDate === selfDate && selfLeaveToDate === selfDate;

  const statusTotals = useMemo(() => {
    return staff.reduce<Record<StaffAttendanceStatus, number>>(
      (totals, row) => row.status ? { ...totals, [row.status]: totals[row.status] + 1 } : totals,
      { PRESENT: 0, ABSENT: 0, LEAVE: 0, LATE: 0, HALF_DAY: 0 }
    );
  }, [staff]);

  function applyBulkValues() {
    if (!selectedIds.length) {
      toast.error("Select at least one staff member.");
      return;
    }
    setStaff((current) =>
      current.map((row) =>
        selectedIds.includes(row.staff_user_id)
          ? {
              ...row,
              status: bulkStatus,
              check_in_time: bulkStatus === "LEAVE" ? null : bulkCheckIn,
              check_out_time: bulkStatus === "LEAVE" ? null : bulkCheckOut,
              remarks: bulkRemarks,
              leave_from_date: bulkStatus === "LEAVE" ? bulkLeaveFromDate : row.leave_from_date,
              leave_to_date: bulkStatus === "LEAVE" ? bulkLeaveToDate : row.leave_to_date,
            }
          : row
      )
    );
  }

  async function saveAttendance() {
    if (!authHeaders || !institutionId) return;
    const rowsToSave = staff.filter((row) => row.status);
    if (!rowsToSave.length) {
      toast.error("Mark at least one staff attendance row before saving.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/admin/staff/attendance", {
        method: "PUT",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          institutionId: Number(institutionId),
          academicYearId: activeAcademicYearId,
          date,
          rows: rowsToSave.map((row) => ({
            staffUserId: row.staff_user_id,
            status: row.status,
            checkInTime: formatTime(row.check_in_time),
            checkOutTime: formatTime(row.check_out_time),
            remarks: row.remarks,
            leaveFromDate: row.leave_from_date || date,
            leaveToDate: row.leave_to_date || row.leave_from_date || date,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save attendance");
      toast.success("Staff attendance saved.");
      void loadData();
      if (tab === "history") void loadHistory();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  }

  async function markSelfAttendance() {
    if (!authHeaders || !institutionId) return;
    setSelfSaving(true);
    try {
      const res = await fetch("/api/admin/staff/attendance", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_self",
          institutionId: Number(institutionId),
          academicYearId: activeAcademicYearId,
          date: selfDate,
          status: selfStatus,
          checkInTime: selfCheckIn,
          checkOutTime: selfCheckOut,
          remarks: selfRemarks,
          leaveFromDate: selfLeaveFromDate,
          leaveToDate: selfLeaveToDate,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to mark attendance");
      toast.success(selfStatus === "LEAVE" ? "Leave request sent to institute admin." : "Attendance marked.");
      setMonth(selfStatus === "LEAVE" ? selfLeaveFromDate.slice(0, 7) : selfDate.slice(0, 7));
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to mark attendance");
    } finally {
      setSelfSaving(false);
    }
  }

  async function updateLeaveStatus(id: number, status: Exclude<LeaveStatus, "PENDING">) {
    if (!authHeaders) return;
    try {
      const res = await fetch("/api/admin/staff/attendance", {
        method: "PATCH",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, adminNote: statusNote[id] || "" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update leave request");
      toast.success(`Leave request ${status.toLowerCase()}.`);
      void loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update leave request");
    }
  }

  if (!activeInstitution) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center text-muted-foreground">
        Select an institution to manage staff attendance.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {mode === "self" ? "My Attendance" : "Staff Attendance"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "self"
              ? "View, mark attendance, and send leave requests to the institute admin."
              : "Mark teacher and driver attendance, review leave requests, and audit attendance history."}
          </p>
        </div>
        <Badge variant="outline" className="rounded-md">{activeInstitution.name}</Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList className="h-auto flex-wrap bg-transparent p-0" variant="line">
          {mode === "admin" ? (
            <>
              <TabsTrigger value="attendance" className="rounded-md border px-4 py-2">
                <CalendarCheck className="size-4" />
                Attendance
              </TabsTrigger>
              <TabsTrigger value="leaves" className="rounded-md border px-4 py-2">
                <MessageSquareText className="size-4" />
                Leaves Management
              </TabsTrigger>
              <TabsTrigger value="history" className="rounded-md border px-4 py-2">
                <History className="size-4" />
                Attendance History
              </TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="my-attendance" className="rounded-md border px-4 py-2">
                <Clock3 className="size-4" />
                My Attendance
              </TabsTrigger>
              <TabsTrigger value="leave-request" className="rounded-md border px-4 py-2">
                <MessageSquareText className="size-4" />
                Leave History
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="attendance" className="space-y-4">
          <div className="rounded-md border border-border bg-card">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border p-4">
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map((status) => (
                  <div key={status} className="rounded-md border border-border bg-background/40 px-3 py-2">
                    <div className="text-xs text-muted-foreground">{STATUS_META[status].label}</div>
                    <div className="text-lg font-semibold">{statusTotals[status]}</div>
                  </div>
                ))}
                <div className="rounded-md border border-border bg-background/40 px-3 py-2">
                  <div className="text-xs text-muted-foreground">Unmarked</div>
                  <div className="text-lg font-semibold">{staff.filter((row) => !row.status).length}</div>
                </div>
              </div>
              <div className="flex items-end gap-3">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <DatePicker value={date} onChange={setDate} className="w-44" />
                </div>
                <Button onClick={saveAttendance} disabled={saving || loading || !staff.some((row) => row.status)}>
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  Save
                </Button>
              </div>
            </div>

            <div className="border-b border-border bg-background/35 p-4">
              <div className="grid gap-3 lg:grid-cols-[180px_130px_130px_1fr_auto]">
                <div className="space-y-2">
                  <Label>Bulk Status</Label>
                  <Select value={bulkStatus} onValueChange={(value) => setBulkStatus(value as StaffAttendanceStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>{STATUS_META[status].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {bulkStatus === "LEAVE" ? (
                  <>
                    <div className="space-y-2">
                      <Label>One Day</Label>
                      <TodayLeaveToggle
                        checked={bulkLeaveIsToday}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setBulkLeaveFromDate(date);
                            setBulkLeaveToDate(date);
                          } else {
                            setBulkLeaveFromDate(date);
                            setBulkLeaveToDate(bulkLeaveToDate === date ? addDays(date, 1) : bulkLeaveToDate);
                          }
                        }}
                      />
                    </div>
                    {!bulkLeaveIsToday && (
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>From Date</Label>
                          <DatePicker
                            value={bulkLeaveFromDate}
                            onChange={(value) => {
                              setBulkLeaveFromDate(value);
                              if (isBeforeDate(bulkLeaveToDate, value)) setBulkLeaveToDate(value);
                            }}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>To Date</Label>
                          <DatePicker
                            value={bulkLeaveToDate}
                            onChange={setBulkLeaveToDate}
                            disabledDates={disableBefore(bulkLeaveFromDate)}
                            className="w-full"
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Check In</Label>
                      <TimePicker value={bulkCheckIn} onChange={setBulkCheckIn} placeholder="Check in" />
                    </div>
                    <div className="space-y-2">
                      <Label>Check Out</Label>
                      <TimePicker value={bulkCheckOut} onChange={setBulkCheckOut} placeholder="Check out" />
                    </div>
                  </>
                )}
                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Input value={bulkRemarks} onChange={(event) => setBulkRemarks(event.target.value)} placeholder="Applied to selected rows" />
                </div>
                <Button className="self-end" variant="outline" onClick={applyBulkValues}>
                  Apply to {selectedIds.length || 0}
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="border-b border-border bg-muted/30 text-left">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <Checkbox
                        checked={allPageSelected}
                        onCheckedChange={(checked) => {
                          const isChecked = checked === true;
                          setSelectedStaffIds((current) => ({
                            ...current,
                            ...Object.fromEntries(staff.map((row) => [row.staff_user_id, isChecked])),
                          }));
                        }}
                        aria-label="Select all staff on this page"
                      />
                    </th>
                    <th className="px-4 py-3">Staff</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Time / Leave Dates</th>
                    <th className="px-4 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton columns={6} />
                  ) : staff.length ? staff.map((row) => (
                    <tr key={row.staff_user_id} className="border-b border-border/70">
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={Boolean(selectedStaffIds[row.staff_user_id])}
                          onCheckedChange={(checked) =>
                            setSelectedStaffIds((current) => ({ ...current, [row.staff_user_id]: checked === true }))
                          }
                          aria-label={`Select ${row.full_name}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.full_name}</div>
                        <div className="text-xs text-muted-foreground">{row.email || `User #${row.staff_user_id}`}</div>
                      </td>
                      <td className="px-4 py-3">{roleLabel(row.role_code)}</td>
                      <td className="px-4 py-3">
                        <Select
                          value={row.status ?? UNMARKED_VALUE}
                          onValueChange={(value) =>
                            updateStaffRow(row.staff_user_id, {
                              status: value === UNMARKED_VALUE ? null : value as StaffAttendanceStatus,
                              check_in_time: value === "LEAVE" ? null : row.check_in_time,
                              check_out_time: value === "LEAVE" ? null : row.check_out_time,
                              leave_from_date: row.leave_from_date || date,
                              leave_to_date: row.leave_to_date || date,
                            })
                          }
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNMARKED_VALUE}>Unmarked</SelectItem>
                            {STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status} value={status}>{STATUS_META[status].label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        {row.status === "LEAVE" ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <TodayLeaveToggle
                              checked={(row.leave_from_date || date) === date && (row.leave_to_date || row.leave_from_date || date) === date}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  updateStaffRow(row.staff_user_id, { leave_from_date: date, leave_to_date: date });
                                } else {
                                  updateStaffRow(row.staff_user_id, {
                                    leave_from_date: row.leave_from_date || date,
                                    leave_to_date: row.leave_to_date && row.leave_to_date !== date ? row.leave_to_date : addDays(row.leave_from_date || date, 1),
                                  });
                                }
                              }}
                            />
                            {!((row.leave_from_date || date) === date && (row.leave_to_date || row.leave_from_date || date) === date) && (
                              <>
                                <DatePicker
                                  value={row.leave_from_date || date}
                                  onChange={(value) => updateStaffRow(row.staff_user_id, {
                                    leave_from_date: value,
                                    leave_to_date: isBeforeDate(row.leave_to_date || "", value)
                                      ? value
                                      : row.leave_to_date || value,
                                  })}
                                  className="w-36"
                                />
                                <DatePicker
                                  value={row.leave_to_date || row.leave_from_date || date}
                                  onChange={(value) => updateStaffRow(row.staff_user_id, { leave_to_date: value })}
                                  disabledDates={disableBefore(row.leave_from_date || date)}
                                  className="w-36"
                                />
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-2">
                            <TimePicker
                              value={formatTime(row.check_in_time)}
                              onChange={(value) => updateStaffRow(row.staff_user_id, { check_in_time: value })}
                              placeholder="Check in"
                              className="w-32"
                              disabled={!row.status}
                            />
                            <TimePicker
                              value={formatTime(row.check_out_time)}
                              onChange={(value) => updateStaffRow(row.staff_user_id, { check_out_time: value })}
                              placeholder="Check out"
                              className="w-32"
                              disabled={!row.status}
                            />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          value={row.remarks || ""}
                          onChange={(event) => updateStaffRow(row.staff_user_id, { remarks: event.target.value })}
                          placeholder="Optional note"
                          disabled={!row.status}
                        />
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No teachers or drivers found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={page}
              pageCount={pageCount}
              pageSize={pageSize}
              total={totalRows}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="leaves">
          <LeaveManagement
            leaves={leaves}
            loading={loading}
            statusNote={statusNote}
            onNoteChange={(id, note) => setStatusNote((current) => ({ ...current, [id]: note }))}
            onUpdateStatus={updateLeaveStatus}
          />
        </TabsContent>

        <TabsContent value="history">
          <div className="rounded-md border border-border bg-card">
            <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[160px_160px_150px_auto]">
              <div className="space-y-2">
                <Label>From Date</Label>
                <DatePicker value={historyFromDate} onChange={setHistoryFromDate} className="w-full" />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <DatePicker value={historyToDate} onChange={setHistoryToDate} className="w-full" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={historyRoleCode} onValueChange={setHistoryRoleCode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All roles</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="driver">Driver</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="self-end" onClick={() => {
                setHistoryPage(1);
                void loadHistory();
              }}>
                Load History
              </Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="border-b border-border bg-muted/30 text-left">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Staff</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Check In</th>
                    <th className="px-4 py-3">Check Out</th>
                    <th className="px-4 py-3">Remarks</th>
                    <th className="px-4 py-3">Marked By</th>
                  </tr>
                </thead>
                <tbody>
                  {historyLoading ? (
                    <TableSkeleton columns={8} />
                  ) : historyRows.length ? historyRows.map((row) => (
                    <tr key={row.id} className="border-b border-border/70">
                      <td className="px-4 py-3">{formatDate(row.attendance_date)}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{row.full_name}</div>
                        <div className="text-xs text-muted-foreground">{row.email || `User #${row.staff_user_id}`}</div>
                      </td>
                      <td className="px-4 py-3">{roleLabel(row.role_code)}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3">{formatTime(row.check_in_time) || "-"}</td>
                      <td className="px-4 py-3">{formatTime(row.check_out_time) || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.remarks || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.marked_by_name || "-"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No attendance history found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <PaginationControls
              page={historyPage}
              pageCount={historyPageCount}
              pageSize={historyPageSize}
              total={historyTotalRows}
              onPageChange={setHistoryPage}
              onPageSizeChange={(size) => {
                setHistoryPageSize(size);
                setHistoryPage(1);
              }}
            />
          </div>
        </TabsContent>

        <TabsContent value="my-attendance" className="space-y-4">
          {canSelfMark && (
            <div className="rounded-md border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Mark My Attendance</h2>
                  <p className="text-sm text-muted-foreground">This option appears only when your institute admin allows create permission.</p>
                </div>
                <Button onClick={markSelfAttendance} disabled={selfSaving}>
                  {selfSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                  {selfStatus === "LEAVE" ? "Request Leave" : "Mark"}
                </Button>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-[160px_170px_130px_130px_1fr]">
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={selfStatus} onValueChange={(value) => setSelfStatus(value as StaffAttendanceStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((status) => (
                        <SelectItem key={status} value={status}>{STATUS_META[status].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selfStatus === "LEAVE" ? (
                  <>
                    <div className="space-y-2">
                      <Label>One Day</Label>
                      <TodayLeaveToggle
                        checked={selfLeaveIsToday}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelfLeaveFromDate(selfDate);
                            setSelfLeaveToDate(selfDate);
                          } else {
                            setSelfLeaveFromDate(selfDate);
                            setSelfLeaveToDate(selfLeaveToDate === selfDate ? addDays(selfDate, 1) : selfLeaveToDate);
                          }
                        }}
                      />
                    </div>
                    {!selfLeaveIsToday && (
                      <div className="grid gap-2 sm:grid-cols-2 lg:col-span-2">
                        <div className="space-y-2">
                          <Label>From Date</Label>
                          <DatePicker
                            value={selfLeaveFromDate}
                            onChange={(value) => {
                              setSelfLeaveFromDate(value);
                              if (isBeforeDate(selfLeaveToDate, value)) setSelfLeaveToDate(value);
                            }}
                            className="w-full"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>To Date</Label>
                          <DatePicker
                            value={selfLeaveToDate}
                            onChange={setSelfLeaveToDate}
                            disabledDates={disableBefore(selfLeaveFromDate)}
                            className="w-full"
                          />
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <DatePicker value={selfDate} onChange={setSelfDate} className="w-full" />
                    </div>
                    <div className="space-y-2">
                      <Label>Check In</Label>
                      <TimePicker value={selfCheckIn} onChange={setSelfCheckIn} placeholder="Check in" />
                    </div>
                    <div className="space-y-2">
                      <Label>Check Out</Label>
                      <TimePicker value={selfCheckOut} onChange={setSelfCheckOut} placeholder="Check out" />
                    </div>
                  </>
                )}
                <div className="space-y-2 lg:col-span-1">
                  <Label>Remarks</Label>
                  <Input value={selfRemarks} onChange={(event) => setSelfRemarks(event.target.value)} placeholder="Optional note" />
                </div>
              </div>
            </div>
          )}

          <div className="rounded-md border border-border bg-card">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-border p-4">
              <div>
                <h2 className="text-lg font-semibold">Monthly Attendance</h2>
                <p className="text-sm text-muted-foreground">Attendance records visible for payroll and leave tracking.</p>
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <MonthPicker value={month} onChange={setMonth} className="w-44" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="border-b border-border bg-muted/30 text-left">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Check In</th>
                    <th className="px-4 py-3">Check Out</th>
                    <th className="px-4 py-3">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <TableSkeleton columns={5} />
                  ) : selfAttendance.length ? selfAttendance.map((row) => (
                    <tr key={row.attendance_date} className="border-b border-border/70">
                      <td className="px-4 py-3">{formatDate(row.attendance_date)}</td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                      <td className="px-4 py-3">{formatTime(row.check_in_time) || "-"}</td>
                      <td className="px-4 py-3">{formatTime(row.check_out_time) || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.remarks || "-"}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">No attendance found for this month.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="leave-request" className="space-y-4">
          <LeaveManagement leaves={leaves} loading={loading} readOnly />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeaveManagement({
  leaves,
  loading,
  readOnly = false,
  statusNote = {},
  onNoteChange,
  onUpdateStatus,
}: {
  leaves: LeaveRow[];
  loading: boolean;
  readOnly?: boolean;
  statusNote?: Record<number, string>;
  onNoteChange?: (id: number, note: string) => void;
  onUpdateStatus?: (id: number, status: Exclude<LeaveStatus, "PENDING">) => void;
}) {
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="border-b border-border p-4">
        <h2 className="text-lg font-semibold">{readOnly ? "Leave History" : "Leaves Management"}</h2>
        <p className="text-sm text-muted-foreground">
          {readOnly ? "Track leave messages, admin-marked leave, and decisions." : "Approve or reject leave messages sent by teachers and drivers."}
        </p>
      </div>
      <div className="divide-y divide-border">
        {loading ? (
          Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-3 p-4">
              <Skeleton className="h-5 w-52" />
              <Skeleton className="h-16 w-full" />
            </div>
          ))
        ) : leaves.length ? leaves.map((leave) => (
          <div key={leave.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold">{leave.full_name}</h3>
                  <Badge variant="outline" className="rounded-md">{roleLabel(leave.role_code)}</Badge>
                  <StatusBadge status={leave.status} />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatDate(leave.from_date)} to {formatDate(leave.to_date)}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">{formatDate(leave.created_at)}</span>
            </div>
            <p className="mt-3 rounded-md border border-border bg-background/40 p-3 text-sm">{leave.message}</p>
            {leave.admin_note && (
              <p className="mt-2 text-sm text-muted-foreground">Admin note: {leave.admin_note}</p>
            )}
            {!readOnly && leave.status === "PENDING" && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Input
                  value={statusNote[leave.id] || ""}
                  onChange={(event) => onNoteChange?.(leave.id, event.target.value)}
                  placeholder="Optional admin note"
                  className="min-w-60 flex-1"
                />
                <Button size="sm" onClick={() => onUpdateStatus?.(leave.id, "APPROVED")}>Approve</Button>
                <Button size="sm" variant="outline" onClick={() => onUpdateStatus?.(leave.id, "REJECTED")}>Reject</Button>
              </div>
            )}
          </div>
        )) : (
          <div className="p-8 text-center text-muted-foreground">No leave requests found.</div>
        )}
      </div>
    </div>
  );
}
