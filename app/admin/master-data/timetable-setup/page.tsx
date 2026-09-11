"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Layers,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
} from "lucide-react";
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
type BatchOption = {
  id?: number;
  batch_name: string;
  name: string;
  section_ids?: number[];
  sections?: string[];
  section_name?: string;
  enrolled_students_count?: number;
};
type SectionOption = { id: number; name: string; batch_name?: string };
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
  batch_name?: string | null;
};
type ClassTeacherRow = {
  id: number;
  program_id: number;
  program_name: string;
  batch_name?: string;
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
  const [tab, setTab] = useState<"periods" | "mapping" | "slots">("periods");

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

  // Batches and sections state
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [selectedBatchName, setSelectedBatchName] = useState<string>("ALL");
  const [allSections, setAllSections] = useState<SectionOption[]>([]);
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
    setBatches([]);
    setSelectedBatchName("ALL");
    setAllSections([]);
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
      const batchRes = await fetch(`/api/admin/institutions/programs/${id}/batches`, { headers: authHeader });
      const batchJson = await batchRes.json().catch(() => ({}));

      const rawBatches: BatchOption[] = Array.isArray(batchJson.data) ? batchJson.data : [];
      setBatches(rawBatches);

      const secList: SectionOption[] = [];
      if (rawBatches.length > 0) {
        for (const b of rawBatches) {
          const bName = b.batch_name || b.name || "Default Batch";
          if (b.section_ids && b.section_ids.length > 0) {
            b.section_ids.forEach((sId: number, idx: number) => {
              const sName = b.sections?.[idx] || `Section ${sId}`;
              if (!secList.some((existing) => existing.id === sId)) {
                secList.push({
                  id: sId,
                  name: sName,
                  batch_name: bName,
                });
              }
            });
          } else if (b.id) {
            if (!secList.some((existing) => existing.id === b.id)) {
              secList.push({
                id: b.id,
                name: b.section_name || b.name || `Section ${b.id}`,
                batch_name: bName,
              });
            }
          }
        }
      }

      if (secList.length === 0) {
        const progRes = await fetch(`/api/admin/institutions/programs/${id}`, { headers: authHeader });
        const progJson = await progRes.json().catch(() => ({}));
        if (progJson.data?.section_ids) {
          (progJson.data.section_ids || []).forEach((sId: number, idx: number) => {
            secList.push({
              id: sId,
              name: progJson.data.section_names?.[idx] || `Section ${sId}`,
              batch_name: "Default Batch",
            });
          });
        }
      }

      setAllSections(secList);
      setSections(secList);
      setSelectedBatchName("ALL");
      if (secList.length > 0) {
        setSectionId(String(secList[0].id));
      } else {
        setSectionId("");
      }
    } finally {
      setProgramDetailLoading(false);
    }
  }

  // Handle batch filtering
  const handleBatchChange = (batchName: string) => {
    setSelectedBatchName(batchName);
    if (batchName === "ALL") {
      setSections(allSections);
      if (allSections.length > 0 && !allSections.some((s) => String(s.id) === sectionId)) {
        setSectionId(String(allSections[0].id));
      }
    } else {
      const filtered = allSections.filter((s) => (s.batch_name || "Default Batch") === batchName);
      setSections(filtered);
      if (filtered.length > 0) {
        if (!filtered.some((s) => String(s.id) === sectionId)) {
          setSectionId(String(filtered[0].id));
        }
      } else {
        setSectionId("");
      }
    }
    setClassTeacher(null);
  };

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

  async function saveClassTeacherExplicit(teacherIdToSave?: number | null) {
    if (!programId || !sectionId || !academicYearId) {
      toast.error("Select program, section, and academic year");
      return;
    }
    const targetTeacherId = teacherIdToSave !== undefined ? teacherIdToSave : (classTeacher?.teacher_id ?? null);
    setMappingSaving(true);
    try {
      const res = await fetch("/api/admin/timetable/class-teacher", {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          programId,
          sectionId,
          academicYearId,
          teacherId: targetTeacherId,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(json.error ?? "Failed to save class teacher");
      toast.success(targetTeacherId ? "Class teacher assigned successfully" : "Class teacher assignment cleared");
      setEditingClassTeacher(false);
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
      toast.success("Timetable period schedule saved successfully");
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
      if (clearTargets.some((t) => String(t.section_id) === sectionId && String(t.program_id) === programId)) {
        await loadClassTeacher();
      }
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

      if (tab === "periods") {
        if (programId) await loadProgramDetail(programId);
        await loadTimetable();
        await loadClassTeacher();
        return;
      }

      if (programId) await loadProgramDetail(programId);
      await loadClassTeacher();
      await loadClassTeacherList();
    } finally {
      setRefreshing(false);
    }
  }

  // Selected section object
  const currentSection = useMemo(() => {
    return allSections.find((s) => String(s.id) === sectionId);
  }, [allSections, sectionId]);

  const activeBatchName = currentSection?.batch_name || selectedBatchName !== "ALL" ? selectedBatchName : (batches[0]?.batch_name || "Batch");

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
      header: "Course & Program",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <BookOpen className="size-4 text-primary shrink-0" />
          <span className="font-medium text-foreground">{row.original.program_name}</span>
        </div>
      ),
    },
    {
      accessorKey: "batch_name",
      header: "Batch",
      cell: ({ row }) => (
        <Badge variant="secondary" className="font-medium">
          {row.original.batch_name || "Default Batch"}
        </Badge>
      ),
    },
    {
      accessorKey: "section_name",
      header: "Section",
      cell: ({ row }) => (
        <span className="font-semibold text-foreground">{row.original.section_name}</span>
      ),
    },
    {
      accessorKey: "academic_year_name",
      header: "Academic Year",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-xs">
          {row.original.academic_year_name}
        </Badge>
      ),
    },
    {
      accessorKey: "teacher_name",
      header: "Class Teacher",
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
            {row.original.teacher_name?.charAt(0)?.toUpperCase() || "T"}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-foreground text-sm">{row.original.teacher_name}</p>
            {row.original.teacher_email && (
              <p className="max-w-64 truncate text-xs text-muted-foreground">
                {row.original.teacher_email}
              </p>
            )}
          </div>
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
              <UserMinus className="size-4 mr-2" />
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
          <h1 className="text-2xl font-bold tracking-tight">Timetable Setup & Management</h1>
          <p className="text-sm text-muted-foreground">
            Create and manage timetables on a Course & Program, Batch, and Section basis, and assign class teachers.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-border">
        <div className="flex min-w-0 gap-2 overflow-x-auto">
          <button
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "periods" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("periods")}
          >
            <CalendarDays className="size-4" />
            <span>Student Timetable</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
              For Students
            </Badge>
          </button>
          <button
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "mapping" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("mapping")}
          >
            <UserCheck className="size-4" />
            <span>Class Teacher Mapping</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30">
              For Staff
            </Badge>
          </button>
          <button
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === "slots" ? "border-primary text-primary font-bold" : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setTab("slots")}
          >
            <Layers className="size-4" />
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
          className="mb-1 shrink-0 gap-1.5"
          onClick={() => void refreshActiveTab()}
          disabled={refreshing || !selectedInstitutionId}
          aria-label="Refresh timetable data"
        >
          <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Refresh</span>
        </Button>
      </div>

      {/* Scope Selectors (Course & Program, Batch, Section, Academic Year) */}
      {(!useSidebarInstitution || tab === "mapping" || tab === "periods") && (
        <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-border/60 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="size-3.5 text-primary" />
              Target Selection (Course, Program, Batch & Section)
            </span>
            {programName && (
              <span className="text-xs font-medium text-primary">
                {programName} {currentSection ? `• Section: ${currentSection.name}` : ""}
              </span>
            )}
          </div>
          <div className={`grid gap-3 grid-cols-1 sm:grid-cols-2 ${useSidebarInstitution ? "lg:grid-cols-4" : "lg:grid-cols-5"}`}>
            {!useSidebarInstitution && (
              <div className="space-y-1.5 rounded-lg border border-border/80 bg-background/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs font-semibold text-muted-foreground">Institution</Label>
                  <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Step 1</Badge>
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
                {/* Step 2: Course & Program */}
                <div className="space-y-1.5 rounded-lg border border-border/80 bg-background/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Course & Program</Label>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Step {useSidebarInstitution ? 1 : 2}</Badge>
                  </div>
                  <AsyncSearchPopover<ProgramOption>
                    value={programId}
                    onChange={(value) => {
                      setProgramId(value);
                      setProgramName("");
                      setBatches([]);
                      setSelectedBatchName("ALL");
                      setAllSections([]);
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
                    placeholder={selectedInstitutionId ? "Select Course & Program..." : "Select institution first"}
                    searchPlaceholder="Search courses and programs..."
                    disabled={!selectedInstitutionId}
                    fetcher={fetchPrograms}
                    getValue={(item) => String(item.id)}
                    getLabel={(item) => item.title}
                  />
                </div>

                {/* Step 3: Batch Selector */}
                <div className="space-y-1.5 rounded-lg border border-border/80 bg-background/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Batch</Label>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Step {useSidebarInstitution ? 2 : 3}</Badge>
                  </div>
                  <Select
                    value={selectedBatchName}
                    onValueChange={handleBatchChange}
                    disabled={programDetailLoading || !programId}
                  >
                    <SelectTrigger className="w-full">
                      {programDetailLoading ? (
                        <span className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Loader2 className="size-3.5 animate-spin" />
                          Loading batches...
                        </span>
                      ) : (
                        <SelectValue placeholder={batches.length ? "All Batches" : "No batches found"} />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Batches ({batches.length || allSections.length})</SelectItem>
                      {batches.map((batch, idx) => {
                        const bName = batch.batch_name || batch.name || `Batch ${idx + 1}`;
                        return (
                          <SelectItem key={`${bName}-${idx}`} value={bName}>
                            {bName} {batch.enrolled_students_count ? `(${batch.enrolled_students_count} std)` : ""}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Step 4: Section */}
                <div className="space-y-1.5 rounded-lg border border-border/80 bg-background/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Section</Label>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Step {useSidebarInstitution ? 3 : 4}</Badge>
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
                        <span className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Loader2 className="size-3.5 animate-spin" />
                          Loading sections...
                        </span>
                      ) : (
                        <SelectValue placeholder={sections.length ? "Select section..." : programId ? "No sections" : "Select program first"} />
                      )}
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((section) => (
                        <SelectItem key={section.id} value={String(section.id)}>
                          {section.name} {section.batch_name && selectedBatchName === "ALL" ? `(${section.batch_name})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Step 5: Academic Year */}
                <div className="space-y-1.5 rounded-lg border border-border/80 bg-background/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label className="text-xs font-semibold text-muted-foreground">Academic Year</Label>
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">Step {useSidebarInstitution ? 4 : 5}</Badge>
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

      {/* Tab Content */}
      {tab === "periods" ? (
        <div className="space-y-5">
          {/* Period Timetable Schedule Grid */}
          <section className="rounded-xl border bg-card shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border p-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <CalendarDays className="size-5" />
                </div>
                <div>
                  <h2 className="font-semibold text-base">Period Subject & Teacher Timetable</h2>
                  <p className="text-xs text-muted-foreground">
                    Click any period cell to assign or edit the subject and lecture teacher for that day and slot.
                  </p>
                </div>
              </div>
              <Button
                onClick={saveTimetable}
                disabled={timetableLoading || timetableSaving || !timetableSlots.length || !programId || !sectionId || !academicYearId}
                className="gap-1.5"
              >
                {timetableSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {timetableSaving ? "Saving Timetable..." : "Save Timetable"}
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
                    <tr className="border-b border-border bg-muted/40">
                      <th className="w-36 p-3.5 text-left font-semibold text-muted-foreground">Day</th>
                      {timetableSlots.map((slot) => (
                        <th key={slot.id} className="min-w-36 p-3.5 text-left font-semibold text-muted-foreground">
                          <span className="block text-foreground font-semibold">{slot.slot_name || `Slot ${slot.slot_order}`}</span>
                          <span className="text-[11px] font-medium text-muted-foreground">{String(slot.start_time).slice(0, 5)} - {String(slot.end_time).slice(0, 5)}</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {DAYS.map((day) => (
                      <tr key={day.value} className="border-b border-border/70 last:border-b-0 hover:bg-muted/10 transition">
                        <td className="p-3.5 font-bold text-foreground bg-muted/20 border-r border-border/50">{day.label}</td>
                        {timetableSlots.map((slot) => {
                          const entryKey = keyFor(day.value, slot.id);
                          const entry = viewEntries.get(entryKey);
                          const draftEntry = entryMap[entryKey];
                          if (slot.slot_type !== "CLASS") {
                            return (
                              <td key={slot.id} className="p-3">
                                <div className="rounded-lg border border-dashed bg-muted/30 p-3 text-center text-xs font-semibold text-muted-foreground">
                                  {{
                                    BREAK: "☕ Break",
                                    LUNCH: "🍱 Lunch",
                                    ASSEMBLY: "🔔 Assembly",
                                    ACTIVITY: "🎨 Activity",
                                    CLASS: "Class",
                                  }[slot.slot_type]}
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td key={slot.id} className="p-2.5 align-top">
                              <button
                                type="button"
                                onClick={() => openAssignment(day.label, slot, entryKey)}
                                disabled={timetableSaving}
                                className={`min-h-20 w-full rounded-xl border p-3 text-left transition ${
                                  draftEntry || entry
                                    ? "bg-primary/5 border-primary/30 hover:border-primary hover:bg-primary/10 shadow-xs"
                                    : "bg-background border-border/70 hover:border-primary/50 hover:bg-muted/30"
                                } disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                {draftEntry ? (
                                  <>
                                    <div className="flex items-center gap-1.5">
                                      <BookOpen className="size-3.5 text-primary shrink-0" />
                                      <span className="block font-semibold text-foreground text-xs leading-tight truncate">{draftEntry.subjectName}</span>
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                      <Users className="size-3 shrink-0 text-primary/70" />
                                      <span className="truncate">{draftEntry.teacherName || "Choose teacher"}</span>
                                    </div>
                                  </>
                                ) : entry ? (
                                  <>
                                    <div className="flex items-center gap-1.5">
                                      <BookOpen className="size-3.5 text-primary shrink-0" />
                                      <span className="block font-semibold text-foreground text-xs leading-tight truncate">{entry.subject_name}</span>
                                    </div>
                                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                      <Users className="size-3 shrink-0 text-primary/70" />
                                      <span className="truncate">{entry.teacher_name || "Choose teacher"}</span>
                                    </div>
                                  </>
                                ) : (
                                  <div className="flex flex-col items-center justify-center py-2 text-muted-foreground/60 hover:text-primary transition">
                                    <Plus className="size-4 mb-0.5" />
                                    <span className="text-[11px] font-medium">Assign</span>
                                  </div>
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
              <div className="flex flex-col items-center gap-3 p-12 text-center text-sm text-muted-foreground">
                <CalendarDays className="size-10 text-muted-foreground/40" />
                <p className="max-w-md">
                  Select a Course & Program, Batch/Section, and Academic Year above. If no slots appear, configure timetable bell slots first.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setTab("slots")}
                  disabled={!selectedInstitutionId}
                  className="gap-1.5 mt-2"
                >
                  <Plus className="size-4" />
                  Configure Timetable Slots
                </Button>
              </div>
            )}
          </section>
        </div>
      ) : tab === "mapping" ? (
        <div className="space-y-6">
          {/* Top Quick Assign Card */}
          <section className="rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-4">
              <div>
                <h2 className="font-semibold text-base">Assign Class Teacher</h2>
                <p className="text-xs text-muted-foreground">
                  Assign or update the dedicated class teacher for the selected Course, Batch, Section, and Academic Year.
                </p>
              </div>
              <Button
                onClick={() => void saveClassTeacherExplicit()}
                disabled={programDetailLoading || loading || mappingSaving || !programId || !sectionId || !academicYearId}
                className="gap-1.5"
              >
                {mappingSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {mappingSaving ? "Saving..." : "Save Class Teacher"}
              </Button>
            </div>
            <div className="pt-4">
              {programDetailLoading || loading ? (
                <ClassTeacherSkeleton />
              ) : programId && sectionId && academicYearId ? (
                <div className="grid gap-4 md:grid-cols-[1fr_420px] md:items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs font-semibold text-primary border-primary/30">
                        {programName}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {activeBatchName} • Section {currentSection?.name || sectionId}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      This teacher will be responsible for attendance, classroom conduct, and student records for this section during {academicYearName}.
                    </p>
                  </div>
                  {classTeacher?.teacher_id && classTeacher.teacher_name && !editingClassTeacher ? (
                    <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl border bg-muted/20 p-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">
                          {classTeacher.teacher_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">{classTeacher.teacher_name}</p>
                          {classTeacher.teacher_email && (
                            <p className="truncate text-xs text-muted-foreground">{classTeacher.teacher_email}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingClassTeacher(true)}
                          disabled={mappingSaving}
                        >
                          Change
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => void saveClassTeacherExplicit(null)}
                          disabled={mappingSaving}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
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
                        searchPlaceholder="Search institution teachers..."
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
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Select a Course & Program, Batch/Section, and Academic Year in the filter bar above to assign a class teacher.
                </div>
              )}
            </div>
          </section>

          {/* Table of all mapped class teachers */}
          <section className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="font-semibold text-base">Class Teachers Directory</h2>
                <p className="text-xs text-muted-foreground">
                  Review all class teachers assigned across courses, batches, and sections.
                </p>
              </div>
              <Input
                value={classTeacherSearch}
                onChange={(event) => {
                  setClassTeacherSearch(event.target.value);
                  setClassTeacherPagination((current) => ({ ...current, pageIndex: 0 }));
                }}
                placeholder="Search course, batch, section, teacher..."
                className="w-full sm:w-80"
                disabled={!selectedInstitutionId}
              />
            </div>
            <DataTable
              columns={classTeacherColumns}
              data={classTeacherRows}
              showRowNumbers
              loading={classTeacherListLoading}
              emptyText={selectedInstitutionId ? "No class teachers assigned yet." : "Select an institution to view class teachers."}
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
                  className="gap-1.5"
                >
                  <UserMinus className="size-4" />
                  Clear Class Teachers
                </Button>
              )}
            />
          </section>
        </div>
      ) : tab === "slots" ? (
        <section className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <h2 className="font-semibold text-base">Timetable Period Slots & Bell Schedule</h2>
              <p className="text-xs text-muted-foreground">Define class periods, intervals, and lunch timings for this institution.</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSlots((prev) => [...prev, blankSlot(prev.length + 1)])}
                disabled={!selectedInstitutionId || slotsLoading || slotsSaving}
                className="gap-1.5"
              >
                <Plus className="size-4" />
                Add Slot
              </Button>
              <Button
                size="sm"
                onClick={saveSlots}
                disabled={!selectedInstitutionId || slotsLoading || slotsSaving}
                className="gap-1.5"
              >
                {slotsSaving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                {slotsSaving ? "Saving..." : "Save Slots"}
              </Button>
            </div>
          </div>
          <div className="space-y-3 p-4">
            {slotsLoading ? (
              <TimetableSlotsSkeleton />
            ) : slots.length ? slots.map((slot, index) => (
              <div key={slot.clientKey} className="grid gap-3 rounded-xl border border-border/80 bg-background/50 p-3 md:grid-cols-[90px_1fr_130px_130px_140px_44px] md:items-end">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Order</Label>
                  <Input type="number" value={slot.slotOrder} onChange={(event) => setSlots((prev) => prev.map((row, i) => i === index ? { ...row, slotOrder: Number(event.target.value) } : row))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Period Name</Label>
                  <Input value={slot.slotName} onChange={(event) => setSlots((prev) => prev.map((row, i) => i === index ? { ...row, slotName: event.target.value } : row))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Start Time</Label>
                  <Input type="time" value={slot.startTime} onChange={(event) => setSlots((prev) => prev.map((row, i) => i === index ? { ...row, startTime: event.target.value } : row))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">End Time</Label>
                  <Input type="time" value={slot.endTime} onChange={(event) => setSlots((prev) => prev.map((row, i) => i === index ? { ...row, endTime: event.target.value } : row))} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Type</Label>
                  <Select value={slot.slotType} onValueChange={(value: SlotType) => setSlots((prev) => prev.map((row, i) => i === index ? { ...row, slotType: value } : row))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLASS">Class Lecture</SelectItem>
                      <SelectItem value="BREAK">Short Break</SelectItem>
                      <SelectItem value="LUNCH">Lunch Break</SelectItem>
                      <SelectItem value="ASSEMBLY">Morning Assembly</SelectItem>
                      <SelectItem value="ACTIVITY">Activity / Sports</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setSlots((prev) => prev.filter((_, i) => i !== index))}
                  disabled={slotsSaving}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            )) : (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                Select an institution and click <strong>Add Slot</strong> to configure the daily period schedule.
              </div>
            )}
          </div>
        </section>
      ) : null}

      {/* Sheet for assigning a subject & teacher to a period */}
      <Sheet open={Boolean(activeCell)} onOpenChange={(open) => !open && setActiveCell(null)}>
        <SheetContent
          className="w-full gap-0 overflow-hidden sm:max-w-lg"
          defaultSize={520}
          minSize={400}
          maxSize={720}
          resizeStorageKey="timetable-setup-period-assignment-sheet"
        >
          <SheetHeader className="shrink-0 border-b p-5 pr-12 text-left">
            <SheetTitle className="flex items-center gap-2">
              <CalendarDays className="size-5 text-primary" />
              Assign Period Lecture
            </SheetTitle>
            <SheetDescription>
              {activeCell
                ? `${activeCell.dayLabel} • ${activeCell.slot.slot_name || `Slot ${activeCell.slot.slot_order}`} (${String(activeCell.slot.start_time).slice(0, 5)} to ${String(activeCell.slot.end_time).slice(0, 5)})`
                : "Choose the subject and teacher for this period."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Subject</Label>
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
              <Label className="text-xs font-semibold">Teaching Teacher</Label>
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
                      <p className="truncate font-medium text-sm">{teacher.full_name}</p>
                      {teacher.email && (
                        <p className="truncate text-xs text-muted-foreground">{teacher.email}</p>
                      )}
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="shrink-0 text-xs">
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
                Only active teachers from {selectedInstitutionName || "the selected institution"} are listed.
              </p>
            </div>
          </div>

          <SheetFooter className="shrink-0 flex-row justify-between border-t p-4">
            <Button
              type="button"
              variant="outline"
              onClick={clearAssignment}
              disabled={!activeCell || !entryMap[activeCell.key]}
              className="text-destructive hover:text-destructive"
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
                className="gap-1.5"
              >
                <Check className="size-4" />
                Apply Period
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Confirmation modal for clearing multiple class teachers */}
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
                ? `${clearTargets[0].teacher_name} will be removed as class teacher from ${clearTargets[0].program_name} (${clearTargets[0].section_name}).`
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
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {clearSaving && <Loader2 className="size-4 animate-spin mr-1.5" />}
              {clearSaving ? "Clearing..." : "Clear Class Teacher"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
