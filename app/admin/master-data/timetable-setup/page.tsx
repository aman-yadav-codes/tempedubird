"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Loader2, MoreHorizontal, Plus, RefreshCw, Save, Trash2, UserMinus } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef, PaginationState } from "@tanstack/react-table";

import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";

type InstitutionOption = { id: number; name?: string; organization_name?: string; slug?: string };
type ProgramOption = { id: number; title: string; institution_id: number; academic_year_id?: number | null; academic_year_name?: string | null };
type SectionOption = { id: number; name: string };
type AcademicYearOption = { id: number; name: string };
type SubjectOption = {
  id: number;
  name: string;
  mapped_teacher_id?: number | null;
  mapped_teacher_name?: string | null;
};
type TeacherOption = {
  id: number;
  full_name: string;
  email?: string | null;
  teaching_subject_ids?: number[];
  teaching_subjects?: string[];
};
type SlotType = "CLASS" | "BREAK" | "LUNCH" | "ASSEMBLY" | "ACTIVITY";
type ClassTeacherMapping = {
  teacher_id?: number | null;
  teacher_name?: string | null;
  teacher_email?: string | null;
};
type ClassTeacherRow = {
  id: number;
  program_id: number;
  program_name: string;
  section_id: number;
  section_name: string;
  academic_year_id: number;
  academic_year_name: string;
  teacher_id: number;
  teacher_name: string;
  teacher_email?: string | null;
};
type SlotRow = {
  clientKey: string;
  id?: number | null;
  slotName: string;
  slotOrder: number;
  startTime: string;
  endTime: string;
  slotType: SlotType;
  isActive: boolean;
};
type SlotOption = {
  id: number;
  slot_name?: string | null;
  slot_order: number;
  start_time: string;
  end_time: string;
  slot_type: SlotType;
};
type EntryRow = {
  day_of_week: number;
  slot_id: number;
  subject_id: number;
  subject_name?: string;
  teacher_id?: number | null;
  teacher_name?: string | null;
};
type DraftEntry = {
  subjectId: string;
  subjectName: string;
  teacherId: string;
  teacherName: string;
};
type ActiveCell = {
  key: string;
  dayLabel: string;
  slot: SlotOption;
};
type SlotApiRow = {
  id: number;
  slot_name?: string | null;
  slot_order: number;
  start_time: string;
  end_time: string;
  slot_type: SlotType;
  is_active: boolean;
};

const DAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 7, label: "Sunday" },
];

function keyFor(day: number, slotId: number) {
  return `${day}:${slotId}`;
}

const blankSlot = (order: number): SlotRow => ({
  clientKey: `new-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  slotName: `Period ${order}`,
  slotOrder: order,
  startTime: "",
  endTime: "",
  slotType: "CLASS",
  isActive: true,
});

function ClassTeacherSkeleton() {
  return (
    <div className="grid gap-4 p-4 md:grid-cols-[1fr_360px] md:items-center" aria-label="Loading class teacher">
      <div className="space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-72 max-w-full" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function TimetableSlotsSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading timetable slots" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-md border p-3 md:grid-cols-[90px_1fr_130px_130px_140px_44px] md:items-end"
        >
          <div className="space-y-2"><Skeleton className="h-4 w-12" /><Skeleton className="h-10 w-full" /></div>
          <div className="space-y-2"><Skeleton className="h-4 w-10" /><Skeleton className="h-10 w-full" /></div>
          <div className="space-y-2"><Skeleton className="h-4 w-10" /><Skeleton className="h-10 w-full" /></div>
          <div className="space-y-2"><Skeleton className="h-4 w-8" /><Skeleton className="h-10 w-full" /></div>
          <div className="space-y-2"><Skeleton className="h-4 w-9" /><Skeleton className="h-10 w-full" /></div>
          <Skeleton className="h-10 w-10" />
        </div>
      ))}
    </div>
  );
}

export default function TimetableSetupPage() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
  const isPlatformAdmin = Boolean(user?.role_codes?.includes("platform_admin") || user?.is_super_admin);
  const useSidebarInstitution = Boolean(activeInstitution && !isPlatformAdmin);
  const [tab, setTab] = useState<"mapping" | "slots" | "periods">("mapping");

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
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [academicYearName, setAcademicYearName] = useState("");
  const [classTeacher, setClassTeacher] = useState<ClassTeacherMapping | null>(null);
  const [editingClassTeacher, setEditingClassTeacher] = useState(false);
  const [slots, setSlots] = useState<SlotRow[]>([]);
  const [timetableSlots, setTimetableSlots] = useState<SlotOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [entryMap, setEntryMap] = useState<Record<string, DraftEntry>>({});
  const [viewEntries, setViewEntries] = useState<Map<string, EntryRow>>(new Map());
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [assignment, setAssignment] = useState<DraftEntry>({
    subjectId: "",
    subjectName: "",
    teacherId: "",
    teacherName: "",
  });
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [timetableLoading, setTimetableLoading] = useState(false);
  const [programDetailLoading, setProgramDetailLoading] = useState(false);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [mappingSaving, setMappingSaving] = useState(false);
  const [timetableSaving, setTimetableSaving] = useState(false);
  const [slotsSaving, setSlotsSaving] = useState(false);
  const [classTeacherRows, setClassTeacherRows] = useState<ClassTeacherRow[]>([]);
  const [classTeacherListLoading, setClassTeacherListLoading] = useState(false);
  const [classTeacherSearch, setClassTeacherSearch] = useState("");
  const [classTeacherPageCount, setClassTeacherPageCount] = useState(0);
  const [classTeacherPagination, setClassTeacherPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [clearTargets, setClearTargets] = useState<ClassTeacherRow[]>([]);
  const [clearSaving, setClearSaving] = useState(false);
  const clearSelectionRef = useRef<(() => void) | null>(null);
  const timetableRequestRef = useRef(0);

  const resetProgram = useCallback(() => {
    setProgramId("");
    setProgramName("");
    setSections([]);
    setSectionId("");
    setAcademicYearId("");
    setAcademicYearName("");
    setClassTeacher(null);
    setEditingClassTeacher(false);
    setTimetableSlots([]);
    setSubjects([]);
    setEntryMap({});
    setViewEntries(new Map());
    setActiveCell(null);
    setProgramDetailLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      resetProgram();
      setSlots([]);
      setClassTeacherRows([]);
      setClassTeacherPagination((current) => ({ ...current, pageIndex: 0 }));
    }, 0);

    return () => window.clearTimeout(timer);
  }, [resetProgram, selectedInstitutionId]);

  const fetchInstitutions = useCallback(async (search: string, page: number) => {
    const res = await fetch(`/api/admin/institutions/profiles?page=${page}&limit=15&search=${encodeURIComponent(search)}`, { headers: authHeader });
    if (!res.ok) throw new Error("Failed to load institutions");
    const json = await res.json();
    return { data: json.data || [], hasMore: page < json.pageCount };
  }, [authHeader]);

  const fetchPrograms = useCallback(async (search: string, page: number) => {
    if (!selectedInstitutionId) return { data: [], hasMore: false };
    const params = new URLSearchParams({ page: String(page), limit: "15", search, institutionId: selectedInstitutionId });
    const res = await fetch(`/api/admin/institutions/programs?${params.toString()}`, { headers: authHeader });
    if (!res.ok) throw new Error("Failed to load programs");
    const json = await res.json();
    return { data: json.data || [], hasMore: page < json.pageCount };
  }, [authHeader, selectedInstitutionId]);

  const fetchAcademicYears = useCallback(async (search: string, page: number) => {
    if (!selectedInstitutionId) return { data: [], hasMore: false };
    setYearsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15", search, institutionId: selectedInstitutionId });
      const res = await fetch(`/api/admin/institutions/academic-years?${params.toString()}`, { headers: authHeader });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to load academic years");
      return { data: json.data || [], hasMore: page < json.pageCount };
    } finally {
      setYearsLoading(false);
    }
  }, [authHeader, selectedInstitutionId]);

  const fetchTeachers = useCallback(async (search: string, page: number) => {
    if (!accessToken || !selectedInstitutionId) return { data: [], hasMore: false };
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15", search, institutionId: selectedInstitutionId });
      const res = await fetch(`/api/admin/users/teachers?${params.toString()}`, { headers: authHeader });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Failed to load teachers");
      return { data: json.data || [], hasMore: page < json.pageCount };
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load teachers");
      return { data: [], hasMore: false };
    }
  }, [accessToken, authHeader, selectedInstitutionId]);

  const loadCurrentAcademicYear = useCallback(async () => {
    if (!accessToken || !selectedInstitutionId) {
      setAcademicYearId("");
      setAcademicYearName("");
      return;
    }

    setYearsLoading(true);
    try {
      const currentParams = new URLSearchParams({
        page: "1",
        limit: "1",
        institutionId: selectedInstitutionId,
        activeOnly: "true",
        currentOnly: "true",
      });
      let res = await fetch(`/api/admin/institutions/academic-years?${currentParams.toString()}`, { headers: authHeader });
      let json = await res.json().catch(() => ({}));
      let year: AcademicYearOption | undefined = json.data?.[0];

      if (!year) {
        const fallbackParams = new URLSearchParams({
          page: "1",
          limit: "1",
          institutionId: selectedInstitutionId,
          activeOnly: "true",
        });
        res = await fetch(`/api/admin/institutions/academic-years?${fallbackParams.toString()}`, { headers: authHeader });
        json = await res.json().catch(() => ({}));
        year = json.data?.[0];
      }

      if (year) {
        setAcademicYearId(String(year.id));
        setAcademicYearName(year.name);
      } else {
        setAcademicYearId("");
        setAcademicYearName("");
      }
    } catch {
      setAcademicYearId("");
      setAcademicYearName("");
    } finally {
      setYearsLoading(false);
    }
  }, [accessToken, authHeader, selectedInstitutionId]);

  useEffect(() => {
    if (!isReady) return;
    const timer = window.setTimeout(() => void loadCurrentAcademicYear(), 0);
    return () => window.clearTimeout(timer);
  }, [isReady, loadCurrentAcademicYear]);

  async function loadProgramDetail(id: string) {
    if (!id) return;
    setProgramDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/institutions/programs/${id}`, { headers: authHeader });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to load program");
        return;
      }
      setSections((json.data.section_ids || []).map((sectionIdValue: number, index: number) => ({
        id: sectionIdValue,
        name: json.data.section_names?.[index] || `Section ${sectionIdValue}`,
      })));
    } finally {
      setProgramDetailLoading(false);
    }
  }

  const loadClassTeacher = useCallback(async () => {
    if (!programId || !sectionId || !academicYearId) {
      setClassTeacher(null);
      setEditingClassTeacher(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ programId, sectionId, academicYearId });
      const res = await fetch(`/api/admin/timetable/class-teacher?${params.toString()}`, { headers: authHeader });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load class teacher");
      setClassTeacher(json.data || null);
      setEditingClassTeacher(!json.data?.teacher_id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load class teacher");
    } finally {
      setLoading(false);
    }
  }, [academicYearId, authHeader, programId, sectionId]);

  const loadTimetable = useCallback(async () => {
    const requestId = ++timetableRequestRef.current;
    if (!programId || !sectionId || !academicYearId) {
      setTimetableSlots([]);
      setSubjects([]);
      setEntryMap({});
      setViewEntries(new Map());
      setTimetableLoading(false);
      return;
    }

    setTimetableLoading(true);
    try {
      const params = new URLSearchParams({ programId, sectionId, academicYearId });
      const res = await fetch(`/api/admin/timetable/entries?${params.toString()}`, { headers: authHeader });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load timetable");
      if (requestId !== timetableRequestRef.current) return;

      setTimetableSlots(json.slots || []);
      setSubjects(json.subjects || []);
      const nextMap: Record<string, DraftEntry> = {};
      const nextView = new Map<string, EntryRow>();
      for (const entry of json.entries || []) {
        const entryKey = keyFor(entry.day_of_week, entry.slot_id);
        nextMap[entryKey] = {
          subjectId: String(entry.subject_id),
          subjectName: entry.subject_name || "",
          teacherId: entry.teacher_id ? String(entry.teacher_id) : "",
          teacherName: entry.teacher_name || "",
        };
        nextView.set(entryKey, entry);
      }
      setEntryMap(nextMap);
      setViewEntries(nextView);
    } catch (err) {
      if (requestId !== timetableRequestRef.current) return;
      toast.error(err instanceof Error ? err.message : "Failed to load timetable");
    } finally {
      if (requestId === timetableRequestRef.current) setTimetableLoading(false);
    }
  }, [academicYearId, authHeader, programId, sectionId]);

  const loadSlots = useCallback(async () => {
    if (!selectedInstitutionId) {
      setSlots([]);
      setSlotsLoading(false);
      return;
    }
    setSlotsLoading(true);
    try {
      const res = await fetch(`/api/admin/timetable/slots?institutionId=${selectedInstitutionId}`, { headers: authHeader });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load slots");
      setSlots(((json.data || []) as SlotApiRow[]).map((slot) => ({
        clientKey: `slot-${slot.id}`,
        id: slot.id,
        slotName: slot.slot_name || "",
        slotOrder: Number(slot.slot_order),
        startTime: String(slot.start_time || "").slice(0, 5),
        endTime: String(slot.end_time || "").slice(0, 5),
        slotType: slot.slot_type,
        isActive: slot.is_active,
      })));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load slots");
    } finally {
      setSlotsLoading(false);
    }
  }, [authHeader, selectedInstitutionId]);

  const loadClassTeacherList = useCallback(async () => {
    if (!selectedInstitutionId) {
      setClassTeacherRows([]);
      setClassTeacherPageCount(0);
      return;
    }

    setClassTeacherListLoading(true);
    try {
      const params = new URLSearchParams({
        institutionId: selectedInstitutionId,
        page: String(classTeacherPagination.pageIndex + 1),
        limit: String(classTeacherPagination.pageSize),
        search: classTeacherSearch,
      });
      const res = await fetch(`/api/admin/timetable/class-teacher?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load class teachers");
      setClassTeacherRows(json.data || []);
      setClassTeacherPageCount(json.pageCount || 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load class teachers");
    } finally {
      setClassTeacherListLoading(false);
    }
  }, [
    authHeader,
    classTeacherPagination.pageIndex,
    classTeacherPagination.pageSize,
    classTeacherSearch,
    selectedInstitutionId,
  ]);

  useEffect(() => {
    if (!isReady) return;
    const timer = window.setTimeout(() => {
      loadClassTeacher();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isReady, loadClassTeacher]);

  useEffect(() => {
    if (!isReady || tab !== "periods") return;
    const timer = window.setTimeout(() => {
      loadTimetable();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isReady, loadTimetable, tab]);

  useEffect(() => {
    if (!isReady || tab !== "slots") return;
    const timer = window.setTimeout(() => {
      loadSlots();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isReady, loadSlots, tab]);

  useEffect(() => {
    if (!isReady || tab !== "mapping") return;
    const timer = window.setTimeout(() => {
      loadClassTeacherList();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [isReady, loadClassTeacherList, tab]);

  async function saveClassTeacher() {
    if (!programId || !sectionId || !academicYearId) {
      toast.error("Select program, section, and academic year");
      return;
    }
    setMappingSaving(true);
    try {
      const res = await fetch("/api/admin/timetable/class-teacher", {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          sectionId,
          academicYearId,
          teacherId: classTeacher?.teacher_id ?? null,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(json.error ?? "Failed to save class teacher");
      toast.success(classTeacher?.teacher_id ? "Class teacher saved" : "Class teacher assignment cleared");
      await loadClassTeacher();
      await loadClassTeacherList();
    } finally {
      setMappingSaving(false);
    }
  }

  async function saveTimetable() {
    if (!programId || !sectionId || !academicYearId) {
      toast.error("Select program, section, and academic year");
      return;
    }

    const entries = Object.entries(entryMap)
      .filter(([, entry]) => entry.subjectId && entry.teacherId)
      .map(([key, entry]) => {
        const [dayOfWeek, slotId] = key.split(":").map(Number);
        return {
          dayOfWeek,
          slotId,
          subjectId: Number(entry.subjectId),
          teacherId: Number(entry.teacherId),
        };
      });

    setTimetableSaving(true);
    try {
      const res = await fetch("/api/admin/timetable/entries", {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ programId, sectionId, academicYearId, entries }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(json.error ?? "Failed to save timetable");
      toast.success("Timetable saved");
      await loadTimetable();
    } finally {
      setTimetableSaving(false);
    }
  }

  function openAssignment(dayLabel: string, slot: SlotOption, entryKey: string) {
    const current = entryMap[entryKey];
    setActiveCell({ key: entryKey, dayLabel, slot });
    setAssignment(current ?? {
      subjectId: "",
      subjectName: "",
      teacherId: "",
      teacherName: "",
    });
  }

  function applyAssignment() {
    if (!activeCell) return;
    if (!assignment.subjectId || !assignment.teacherId) {
      toast.error("Select both subject and teacher");
      return;
    }
    setEntryMap((prev) => ({ ...prev, [activeCell.key]: assignment }));
    setActiveCell(null);
  }

  function clearAssignment() {
    if (!activeCell) return;
    setEntryMap((prev) => {
      const next = { ...prev };
      delete next[activeCell.key];
      return next;
    });
    setActiveCell(null);
  }

  async function saveSlots() {
    if (!selectedInstitutionId) return toast.error("Select an institution");
    setSlotsSaving(true);
    try {
      const res = await fetch("/api/admin/timetable/slots", {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ institutionId: selectedInstitutionId, slots }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(json.error ?? "Failed to save slots");
      toast.success("Timetable slots saved");
      await loadSlots();
    } finally {
      setSlotsSaving(false);
    }
  }

  async function clearClassTeachers() {
    if (!clearTargets.length) return;
    setClearSaving(true);
    try {
      const res = await fetch("/api/admin/timetable/class-teacher", {
        method: "DELETE",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ ids: clearTargets.map((row) => row.id) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(json.error ?? "Failed to clear class teachers");
      toast.success(
        `${clearTargets.length} class teacher assignment${clearTargets.length === 1 ? "" : "s"} cleared`
      );
      clearSelectionRef.current?.();
      clearSelectionRef.current = null;
      setClearTargets([]);
      await loadClassTeacherList();
    } finally {
      setClearSaving(false);
    }
  }

  async function refreshActiveTab() {
    setRefreshing(true);
    try {
      if (tab === "slots") {
        await loadSlots();
        return;
      }

      const programRefresh = programId ? loadProgramDetail(programId) : Promise.resolve();
      if (tab === "periods") {
        await Promise.all([programRefresh, loadTimetable()]);
        return;
      }

      await Promise.all([programRefresh, loadClassTeacher(), loadClassTeacherList()]);
    } finally {
      setRefreshing(false);
    }
  }

  const classTeacherColumns = useMemo<ColumnDef<ClassTeacherRow>[]>(() => [
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
          aria-label="Select all class teacher assignments"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(Boolean(value))}
          aria-label={`Select ${row.original.program_name} section ${row.original.section_name}`}
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "program_name",
      header: "Class / Program",
      cell: ({ row }) => <span className="font-medium">{row.original.program_name}</span>,
    },
    {
      accessorKey: "section_name",
      header: "Section",
    },
    {
      accessorKey: "academic_year_name",
      header: "Academic Year",
    },
    {
      accessorKey: "teacher_name",
      header: "Class Teacher",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="font-medium">{row.original.teacher_name}</p>
          {row.original.teacher_email && (
            <p className="max-w-64 truncate text-xs text-muted-foreground">
              {row.original.teacher_email}
            </p>
          )}
        </div>
      ),
    },
    {
      id: "actions",
      header: "Actions",
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Open class teacher actions">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => {
                clearSelectionRef.current = null;
                setClearTargets([row.original]);
              }}
            >
              <UserMinus className="size-4" />
              Clear Class Teacher
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Timetable Setup</h1>
          <p className="text-sm text-muted-foreground">
            Configure student class timetables, period slot timings, and staff class teacher assignments.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-b border-border">
        <div className="flex min-w-0 gap-2 overflow-x-auto">
          <button
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "periods" ? "border-primary text-foreground font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("periods")}
          >
            <span>Student Timetable</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              For Students
            </Badge>
          </button>
          <button
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "mapping" ? "border-primary text-foreground font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("mapping")}
          >
            <span>Class Teacher Mapping</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
              For Staff
            </Badge>
          </button>
          <button
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "slots" ? "border-primary text-foreground font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("slots")}
          >
            <span>Timetable Slots</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30">
              Period Schedule
            </Badge>
          </button>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mb-1 shrink-0"
          onClick={() => void refreshActiveTab()}
          disabled={refreshing || !selectedInstitutionId}
          aria-label={`Refresh ${tab === "mapping" ? "class teacher mapping" : tab === "slots" ? "timetable slots" : "period teacher mapping"}`}
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {(!useSidebarInstitution || tab === "mapping" || tab === "periods") && (
      <section className="rounded-md border border-border bg-card p-4">
        <div className={`grid gap-3 md:grid-cols-2 ${useSidebarInstitution ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}>
          {!useSidebarInstitution && (
          <div className="min-h-[104px] space-y-2 rounded-md border border-border bg-background/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <Label>Institution</Label>
              <Badge variant="outline" className="shrink-0">Step 1</Badge>
            </div>
            <AsyncSearchPopover<InstitutionOption>
                value={institutionId}
                onChange={(value) => {
                  setInstitutionId(value);
                  if (!value) setInstitutionName("");
                }}
                onSelectItem={(item) => setInstitutionName(item.organization_name || item.name || item.slug || `Institution ${item.id}`)}
                selectedLabel={institutionName || undefined}
                placeholder="Select institution..."
                searchPlaceholder="Search institutions..."
                fetcher={fetchInstitutions}
                getValue={(item) => String(item.id)}
                getLabel={(item) => item.organization_name || item.name || item.slug || `Institution ${item.id}`}
            />
          </div>
          )}

          {(tab === "mapping" || tab === "periods") && (
            <>
              <div className="min-h-[104px] space-y-2 rounded-md border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>Program with Available Slots</Label>
                  <Badge variant="outline" className="shrink-0">Step {useSidebarInstitution ? 1 : 2}</Badge>
                </div>
                <AsyncSearchPopover<ProgramOption>
                  value={programId}
                  onChange={(value) => {
                    setProgramId(value);
                    setProgramName("");
                    setSections([]);
                    setSectionId("");
                    setClassTeacher(null);
                    setProgramDetailLoading(Boolean(value));
                  }}
                  onSelectItem={(item) => {
                    setProgramId(String(item.id));
                    setProgramName(item.title);
                    setSectionId("");
                    setClassTeacher(null);
                    loadProgramDetail(String(item.id));
                  }}
                  selectedLabel={programName || undefined}
                  placeholder={selectedInstitutionId ? "Select program..." : "Select institution first"}
                  searchPlaceholder="Search programs..."
                  disabled={!selectedInstitutionId}
                  fetcher={fetchPrograms}
                  getValue={(item) => String(item.id)}
                  getLabel={(item) => item.title}
                />
              </div>
              <div className="min-h-[104px] space-y-2 rounded-md border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>Section</Label>
                  <Badge variant="outline" className="shrink-0">Step {useSidebarInstitution ? 2 : 3}</Badge>
                </div>
                <Select
                  value={sectionId}
                  onValueChange={(value) => {
                    setSectionId(value);
                    setClassTeacher(null);
                  }}
                  disabled={programDetailLoading || !sections.length}
                >
                  <SelectTrigger className="w-full">
                    {programDetailLoading ? (
                      <span className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="size-4 animate-spin" />
                        Loading sections...
                      </span>
                    ) : (
                      <SelectValue placeholder={sections.length ? "Select section..." : programId ? "No sections" : "Select program first"} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => <SelectItem key={section.id} value={String(section.id)}>{section.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-h-[104px] space-y-2 rounded-md border border-border bg-background/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label>Academic Year</Label>
                  <Badge variant="outline" className="shrink-0">Step {useSidebarInstitution ? 3 : 4}</Badge>
                </div>
                <AsyncSearchPopover<AcademicYearOption>
                  value={academicYearId}
                  onChange={(value) => {
                    setAcademicYearId(value);
                    setClassTeacher(null);
                    if (!value) setAcademicYearName("");
                  }}
                  onSelectItem={(item) => setAcademicYearName(item.name)}
                  selectedLabel={academicYearName || undefined}
                  placeholder={
                    !selectedInstitutionId
                      ? "Select institution first"
                      : yearsLoading
                        ? "Current year loading..."
                        : "Select year..."
                  }
                  searchPlaceholder="Search years..."
                  disabled={!selectedInstitutionId}
                  loading={yearsLoading}
                  fetcher={fetchAcademicYears}
                  getValue={(item) => String(item.id)}
                  getLabel={(item) => item.name}
                />
              </div>
            </>
          )}
        </div>
      </section>
      )}

      {tab === "mapping" ? (
        <>
          <section className="rounded-md border bg-card">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h2 className="font-semibold">Class Teacher Mapping</h2>
                <p className="text-xs text-muted-foreground">Assign one class teacher to the selected program, section, and academic year.</p>
              </div>
              <Button
                onClick={saveClassTeacher}
                disabled={programDetailLoading || loading || mappingSaving || !programId || !sectionId || !academicYearId}
              >
                {mappingSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {mappingSaving ? "Saving..." : "Save Class Teacher"}
              </Button>
            </div>
            <div>
              {programDetailLoading || loading ? (
                <ClassTeacherSkeleton />
              ) : programId && sectionId && academicYearId ? (
                <div className="grid gap-4 p-4 md:grid-cols-[1fr_420px] md:items-center">
                  <div>
                    <p className="font-medium">Class Teacher</p>
                    <p className="text-xs text-muted-foreground">
                      This teacher is responsible for the selected section during this academic year.
                    </p>
                  </div>
                  {classTeacher?.teacher_id && classTeacher.teacher_name && !editingClassTeacher ? (
                    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border bg-background p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{classTeacher.teacher_name}</p>
                        {classTeacher.teacher_email && (
                          <p className="truncate text-xs text-muted-foreground">{classTeacher.teacher_email}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingClassTeacher(true)}
                        disabled={mappingSaving}
                      >
                        Change
                      </Button>
                    </div>
                  ) : (
                    <AsyncSearchPopover<TeacherOption>
                      value={classTeacher?.teacher_id ? String(classTeacher.teacher_id) : ""}
                      onChange={(value) => {
                        setClassTeacher(value ? { teacher_id: Number(value) } : null);
                      }}
                      onSelectItem={(teacher) => {
                        setClassTeacher({
                          teacher_id: teacher.id,
                          teacher_name: teacher.full_name,
                          teacher_email: teacher.email,
                        });
                        setEditingClassTeacher(false);
                      }}
                      selectedLabel={classTeacher?.teacher_name || undefined}
                      placeholder="Select class teacher..."
                      searchPlaceholder="Search teachers..."
                      fetcher={fetchTeachers}
                      getValue={(item) => String(item.id)}
                      getLabel={(item) => item.full_name}
                      renderItem={(item) => (
                        <div className="flex flex-col py-1 text-left">
                          <span className="text-sm font-medium">{item.full_name}</span>
                          {item.email && <span className="text-[10px] text-muted-foreground">{item.email}</span>}
                        </div>
                      )}
                    />
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Select a program, section, and academic year to assign a class teacher.
                </div>
              )}
            </div>
          </section>
          <section>
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-semibold">Class Teachers</h2>
                <p className="text-xs text-muted-foreground">
                  Review class teachers assigned to every program section and academic year.
                </p>
              </div>
              <Input
                value={classTeacherSearch}
                onChange={(event) => {
                  setClassTeacherSearch(event.target.value);
                  setClassTeacherPagination((current) => ({ ...current, pageIndex: 0 }));
                }}
                placeholder="Search class, section, teacher..."
                className="w-full sm:w-72"
                disabled={!selectedInstitutionId}
              />
            </div>
            <DataTable
              columns={classTeacherColumns}
              data={classTeacherRows}
              showRowNumbers
              loading={classTeacherListLoading}
              emptyText={selectedInstitutionId ? "No class teachers assigned." : "Select an institution to view class teachers."}
              getRowId={(row) => String(row.id)}
              manualPagination
              pageCount={classTeacherPageCount}
              pagination={classTeacherPagination}
              onPaginationChange={setClassTeacherPagination}
              selectedActions={(selectedRows, resetSelection) => (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    clearSelectionRef.current = resetSelection;
                    setClearTargets(selectedRows);
                  }}
                  disabled={clearSaving}
                >
                  <UserMinus className="size-4" />
                  Clear Class Teachers
                </Button>
              )}
            />
          </section>
        </>
      ) : tab === "periods" ? (
          <section className="rounded-md border bg-card">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-5 text-destructive" />
                <div>
                  <h2 className="font-semibold">Period Teacher Mapping</h2>
                  <p className="text-xs text-muted-foreground">
                    Assign subjects and teachers to every class period for the selected section.
                  </p>
                </div>
              </div>
              <Button onClick={saveTimetable} disabled={timetableLoading || timetableSaving || !timetableSlots.length}>
                {timetableSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {timetableSaving ? "Saving..." : "Save Period Mapping"}
              </Button>
            </div>

            {timetableLoading ? (
              <div className="p-4">
                <ClassTeacherSkeleton />
              </div>
            ) : timetableSlots.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="w-36 p-3 text-left font-medium text-muted-foreground">Day</th>
                      {timetableSlots.map((slot) => (
                        <th key={slot.id} className="min-w-36 p-3 text-left font-medium text-muted-foreground">
                          <span className="block text-foreground">{slot.slot_name || `Slot ${slot.slot_order}`}</span>
                          <span className="text-[11px]">{String(slot.start_time).slice(0, 5)} - {String(slot.end_time).slice(0, 5)}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day) => (
                      <tr key={day.value} className="border-b border-border/70 last:border-b-0">
                        <td className="p-3 font-medium">{day.label}</td>
                        {timetableSlots.map((slot) => {
                          const entryKey = keyFor(day.value, slot.id);
                          const entry = viewEntries.get(entryKey);
                          const draftEntry = entryMap[entryKey];
                          if (slot.slot_type !== "CLASS") {
                            return (
                              <td key={slot.id} className="p-3">
                                <div className="rounded-md border border-dashed bg-muted/20 p-3 text-center text-xs font-semibold text-muted-foreground">
                                  {{
                                    BREAK: "Break",
                                    LUNCH: "Lunch",
                                    ASSEMBLY: "Assembly",
                                    ACTIVITY: "Activity",
                                    CLASS: "Class",
                                  }[slot.slot_type]}
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={slot.id} className="p-3 align-top">
                              <button
                                type="button"
                                onClick={() => openAssignment(day.label, slot, entryKey)}
                                disabled={timetableSaving}
                                className="min-h-16 w-full rounded-md border bg-background p-3 text-left transition hover:border-primary/60 hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {draftEntry ? (
                                  <>
                                    <span className="block font-medium">{draftEntry.subjectName}</span>
                                    <span className="mt-1 block text-xs text-muted-foreground">
                                      {draftEntry.teacherName || "Choose teacher"}
                                    </span>
                                  </>
                                ) : entry ? (
                                  <>
                                    <span className="block font-medium">{entry.subject_name}</span>
                                    <span className="mt-1 block text-xs text-muted-foreground">
                                      {entry.teacher_name || "Choose teacher"}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Assign period</span>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 p-10 text-center text-sm text-muted-foreground">
                <p>Select program, section, and academic year. Configure timetable slots first if no grid appears.</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTab("slots")}
                  disabled={!selectedInstitutionId}
                >
                  <Plus className="size-4" />
                  Create Timetable Slot
                </Button>
              </div>
            )}
          </section>
      ) : tab === "slots" ? (
        <section className="rounded-md border bg-card">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <h2 className="font-semibold">Timetable Slots</h2>
              <p className="text-xs text-muted-foreground">Define class, break, and lunch periods for the selected institution.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setSlots((prev) => [...prev, blankSlot(prev.length + 1)])}
                disabled={!selectedInstitutionId || slotsLoading || slotsSaving}
              >
                <Plus className="size-4" />
                Add Slot
              </Button>
              <Button onClick={saveSlots} disabled={!selectedInstitutionId || slotsLoading || slotsSaving}>
                {slotsSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {slotsSaving ? "Saving..." : "Save Slots"}
              </Button>
            </div>
          </div>
          <div className="space-y-3 p-4">
            {slotsLoading ? (
              <TimetableSlotsSkeleton />
            ) : slots.length ? slots.map((slot, index) => (
              <div key={slot.clientKey} className="grid gap-3 rounded-md border p-3 md:grid-cols-[90px_1fr_130px_130px_140px_44px] md:items-end">
                <div className="space-y-1">
                  <Label>Order</Label>
                  <Input type="number" value={slot.slotOrder} onChange={(event) => setSlots((prev) => prev.map((row, i) => i === index ? { ...row, slotOrder: Number(event.target.value) } : row))} />
                </div>
                <div className="space-y-1">
                  <Label>Name</Label>
                  <Input value={slot.slotName} onChange={(event) => setSlots((prev) => prev.map((row, i) => i === index ? { ...row, slotName: event.target.value } : row))} />
                </div>
                <div className="space-y-1">
                  <Label>Start</Label>
                  <Input type="time" value={slot.startTime} onChange={(event) => setSlots((prev) => prev.map((row, i) => i === index ? { ...row, startTime: event.target.value } : row))} />
                </div>
                <div className="space-y-1">
                  <Label>End</Label>
                  <Input type="time" value={slot.endTime} onChange={(event) => setSlots((prev) => prev.map((row, i) => i === index ? { ...row, endTime: event.target.value } : row))} />
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={slot.slotType} onValueChange={(value: SlotType) => setSlots((prev) => prev.map((row, i) => i === index ? { ...row, slotType: value } : row))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLASS">Class</SelectItem>
                      <SelectItem value="BREAK">Break</SelectItem>
                      <SelectItem value="LUNCH">Lunch</SelectItem>
                      <SelectItem value="ASSEMBLY">Assembly</SelectItem>
                      <SelectItem value="ACTIVITY">Activity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSlots((prev) => prev.filter((_, i) => i !== index))}
                  disabled={slotsSaving}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )) : (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
                Select an institution and add slots.
              </div>
            )}
          </div>
        </section>
      ) : null}

      <Sheet open={Boolean(activeCell)} onOpenChange={(open) => !open && setActiveCell(null)}>
        <SheetContent
          className="w-full gap-0 overflow-hidden sm:max-w-lg"
          defaultSize={520}
          minSize={400}
          maxSize={720}
          resizeStorageKey="timetable-setup-period-assignment-sheet"
        >
          <SheetHeader className="shrink-0 border-b p-5 pr-12 text-left">
            <SheetTitle>Assign Class Period</SheetTitle>
            <SheetDescription>
              {activeCell
                ? `${activeCell.dayLabel} - ${activeCell.slot.slot_name || `Slot ${activeCell.slot.slot_order}`} - ${String(activeCell.slot.start_time).slice(0, 5)} to ${String(activeCell.slot.end_time).slice(0, 5)}`
                : "Choose the subject and teacher for this period."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select
                value={assignment.subjectId || "none"}
                onValueChange={(value) => {
                  const subject = subjects.find((item) => String(item.id) === value);
                  setAssignment({
                    subjectId: value === "none" ? "" : value,
                    subjectName: subject?.name || "",
                    teacherId: subject?.mapped_teacher_id ? String(subject.mapped_teacher_id) : "",
                    teacherName: subject?.mapped_teacher_name || "",
                  });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select subject..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Select subject</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={String(subject.id)}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Teacher</Label>
              <AsyncSearchPopover<TeacherOption>
                value={assignment.teacherId}
                onChange={(value) => {
                  if (!value) {
                    setAssignment((prev) => ({ ...prev, teacherId: "", teacherName: "" }));
                  }
                }}
                onSelectItem={(teacher) => {
                  setAssignment((prev) => ({
                    ...prev,
                    teacherId: String(teacher.id),
                    teacherName: teacher.full_name,
                  }));
                }}
                selectedLabel={assignment.teacherName || undefined}
                placeholder="Select teacher..."
                searchPlaceholder="Search institution teachers..."
                fetcher={fetchTeachers}
                getValue={(teacher) => String(teacher.id)}
                getLabel={(teacher) => teacher.full_name}
                renderItem={(teacher) => (
                  <div className="flex min-w-0 items-center justify-between gap-3 py-1 text-left">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{teacher.full_name}</p>
                      {teacher.email && (
                        <p className="truncate text-xs text-muted-foreground">{teacher.email}</p>
                      )}
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="shrink-0">
                            {teacher.teaching_subjects?.length ?? 0} subjects
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="block max-w-72">
                          <p className="mb-1 font-semibold">Teaching subjects</p>
                          <p>
                            {teacher.teaching_subjects?.length
                              ? teacher.teaching_subjects.join(", ")
                              : "No teaching subjects assigned"}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Only active teachers from {selectedInstitutionName || "the selected institution"} are available.
              </p>
            </div>
          </div>

          <SheetFooter className="shrink-0 flex-row justify-between border-t p-4">
            <Button
              type="button"
              variant="outline"
              onClick={clearAssignment}
              disabled={!activeCell || !entryMap[activeCell.key]}
            >
              Clear Period
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" onClick={() => setActiveCell(null)}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={applyAssignment}
                disabled={!assignment.subjectId || !assignment.teacherId}
              >
                Assign Period
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={clearTargets.length > 0}
        onOpenChange={(open) => {
          if (!open && !clearSaving) {
            clearSelectionRef.current = null;
            setClearTargets([]);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear class teacher assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              {clearTargets.length === 1
                ? `${clearTargets[0].teacher_name} will be removed from ${clearTargets[0].program_name}, section ${clearTargets[0].section_name}.`
                : `The class teacher will be cleared from ${clearTargets.length} selected classes.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearSaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                clearClassTeachers();
              }}
              disabled={clearSaving}
            >
              {clearSaving && <Loader2 className="size-4 animate-spin" />}
              {clearSaving ? "Clearing..." : "Clear Class Teacher"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
