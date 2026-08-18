"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { useAuthStore } from "@/store";

type InstitutionOption = { id: number; name?: string; organization_name?: string; slug?: string };
type ProgramOption = { id: number; title: string; institution_id: number };
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

function TimetableSkeleton() {
  return (
    <div className="overflow-hidden p-4">
      <div className="mb-4 flex gap-4">
        <Skeleton className="h-8 w-28 shrink-0" />
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="h-8 min-w-32 flex-1" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }, (_, row) => (
          <div key={row} className="flex gap-4">
            <Skeleton className="h-16 w-28 shrink-0" />
            {Array.from({ length: 6 }, (_, column) => (
              <Skeleton key={column} className="h-16 min-w-32 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StudentTimetablePage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
  const [mode, setMode] = useState<"view" | "create" | "edit">("view");
  const canEdit = mode !== "view";

  const [institutionId, setInstitutionId] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [programId, setProgramId] = useState("");
  const [programName, setProgramName] = useState("");
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [sectionId, setSectionId] = useState("");
  const [academicYearId, setAcademicYearId] = useState("");
  const [academicYearName, setAcademicYearName] = useState("");
  const [slots, setSlots] = useState<SlotOption[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [entryMap, setEntryMap] = useState<Record<string, DraftEntry>>({});
  const [viewEntries, setViewEntries] = useState<Map<string, EntryRow>>(new Map());
  const [loading, setLoading] = useState(false);
  const [programsLoading, setProgramsLoading] = useState(false);
  const [programDetailLoading, setProgramDetailLoading] = useState(false);
  const [yearsLoading, setYearsLoading] = useState(false);
  const [teachersLoading, setTeachersLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeCell, setActiveCell] = useState<ActiveCell | null>(null);
  const [assignment, setAssignment] = useState<DraftEntry>({
    subjectId: "",
    subjectName: "",
    teacherId: "",
    teacherName: "",
  });
  const loadRequestRef = useRef(0);
  const programDetailRequestRef = useRef(0);

  const resetProgram = () => {
    loadRequestRef.current += 1;
    programDetailRequestRef.current += 1;
    setProgramId("");
    setProgramName("");
    setSections([]);
    setSectionId("");
    setAcademicYearId("");
    setAcademicYearName("");
    setSlots([]);
    setSubjects([]);
    setEntryMap({});
    setViewEntries(new Map());
    setLoading(false);
    setProgramDetailLoading(false);
  };

  const fetchInstitutions = useCallback(async (search: string, page: number) => {
    const res = await fetch(`/api/admin/institutions/profiles?page=${page}&limit=15&search=${encodeURIComponent(search)}`, { headers: authHeader });
    if (!res.ok) throw new Error("Failed to load institutions");
    const json = await res.json();
    return { data: json.data || [], hasMore: page < json.pageCount };
  }, [authHeader]);

  const fetchPrograms = useCallback(async (search: string, page: number) => {
    if (!institutionId) return { data: [], hasMore: false };
    setProgramsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15", search, institutionId });
      const res = await fetch(`/api/admin/institutions/programs?${params.toString()}`, { headers: authHeader });
      if (!res.ok) throw new Error("Failed to load programs");
      const json = await res.json();
      return { data: json.data || [], hasMore: page < json.pageCount };
    } finally {
      setProgramsLoading(false);
    }
  }, [authHeader, institutionId]);

  const fetchAcademicYears = useCallback(async (search: string, page: number) => {
    if (!institutionId) return { data: [], hasMore: false };
    setYearsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15", search, institutionId });
      const res = await fetch(`/api/admin/institutions/academic-years?${params.toString()}`, { headers: authHeader });
      if (!res.ok) throw new Error("Failed to load academic years");
      const json = await res.json();
      return { data: json.data || [], hasMore: page < json.pageCount };
    } finally {
      setYearsLoading(false);
    }
  }, [authHeader, institutionId]);

  const fetchTeachers = useCallback(async (search: string, page: number) => {
    if (!institutionId) return { data: [], hasMore: false };
    setTeachersLoading(true);
    try {
      const params = new URLSearchParams({
        institutionId,
        page: String(page),
        limit: "15",
        search,
      });
      const res = await fetch(`/api/admin/users/teachers?${params.toString()}`, {
        headers: authHeader,
      });
      if (!res.ok) throw new Error("Failed to load teachers");
      const json = await res.json();
      return { data: json.data || [], hasMore: page < json.pageCount };
    } finally {
      setTeachersLoading(false);
    }
  }, [authHeader, institutionId]);

  async function loadProgramDetail(id: string) {
    if (!id) return;
    const requestId = ++programDetailRequestRef.current;
    setProgramDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/institutions/programs/${id}`, { headers: authHeader });
      const json = await res.json();
      if (requestId !== programDetailRequestRef.current) return;
      if (!res.ok) {
        toast.error(json.error ?? "Failed to load program");
        return;
      }
      if (String(json.data.institution_id) !== institutionId) {
        resetProgram();
        toast.error("This program does not belong to the selected institution");
        return;
      }
      setSections((json.data.section_ids || []).map((sectionIdValue: number, index: number) => ({
        id: sectionIdValue,
        name: json.data.section_names?.[index] || `Section ${sectionIdValue}`,
      })));
      if (json.data.academic_year_id) {
        setAcademicYearId(String(json.data.academic_year_id));
        setAcademicYearName(json.data.academic_year_name || `Academic Year ${json.data.academic_year_id}`);
      }
    } finally {
      if (requestId === programDetailRequestRef.current) {
        setProgramDetailLoading(false);
      }
    }
  }

  const loadTimetable = useCallback(async () => {
    const requestId = ++loadRequestRef.current;
    if (!programId || !sectionId || !academicYearId) {
      setSlots([]);
      setSubjects([]);
      setEntryMap({});
      setViewEntries(new Map());
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ programId, sectionId, academicYearId });
      const res = await fetch(`/api/admin/timetable/entries?${params.toString()}`, { headers: authHeader });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load timetable");
      if (requestId !== loadRequestRef.current) return;
      setSlots(json.slots || []);
      setSubjects(json.subjects || []);
      const nextMap: Record<string, DraftEntry> = {};
      const nextView = new Map<string, EntryRow>();
      for (const entry of json.entries || []) {
        nextMap[keyFor(entry.day_of_week, entry.slot_id)] = {
          subjectId: String(entry.subject_id),
          subjectName: entry.subject_name || "",
          teacherId: entry.teacher_id ? String(entry.teacher_id) : "",
          teacherName: entry.teacher_name || "",
        };
        nextView.set(keyFor(entry.day_of_week, entry.slot_id), entry);
      }
      setEntryMap(nextMap);
      setViewEntries(nextView);
    } catch (err) {
      if (requestId !== loadRequestRef.current) return;
      toast.error(err instanceof Error ? err.message : "Failed to load timetable");
    } finally {
      if (requestId === loadRequestRef.current) setLoading(false);
    }
  }, [academicYearId, authHeader, programId, sectionId]);

  useEffect(() => {
    if (!isReady) return;
    const timer = window.setTimeout(() => {
      loadTimetable();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [isReady, loadTimetable]);

  async function saveTimetable() {
    if (!programId || !sectionId || !academicYearId) return toast.error("Select program, section, and academic year");
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
    setSaving(true);
    try {
      const res = await fetch("/api/admin/timetable/entries", {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({ programId, sectionId, academicYearId, entries }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(json.error ?? "Failed to save timetable");
      toast.success("Timetable saved");
      setMode("view");
      await loadTimetable();
    } finally {
      setSaving(false);
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Time Table</h1>
          <p className="text-sm text-muted-foreground">Create and review weekly class schedules by section.</p>
        </div>
        <div className="flex rounded-md border bg-card p-1">
          {(["view", "create", "edit"] as const).map((item) => (
            <button
              key={item}
              className={`rounded px-3 py-1.5 text-sm font-medium capitalize ${mode === item ? "bg-destructive text-destructive-foreground" : "text-muted-foreground hover:bg-muted"}`}
              onClick={() => setMode(item)}
              disabled={saving}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-md border bg-card p-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label>Institution</Label>
            <AsyncSearchPopover<InstitutionOption>
              value={institutionId}
              onChange={(value) => {
                setInstitutionId(value);
                setInstitutionName("");
                resetProgram();
              }}
              onSelectItem={(item) => {
                setInstitutionId(String(item.id));
                setInstitutionName(item.organization_name || item.name || item.slug || `Institution ${item.id}`);
              }}
              selectedLabel={institutionName || undefined}
              placeholder="Select institution..."
              searchPlaceholder="Search institutions..."
              fetcher={fetchInstitutions}
              getValue={(item) => String(item.id)}
              getLabel={(item) => item.organization_name || item.name || item.slug || `Institution ${item.id}`}
            />
          </div>
          <div className="space-y-2">
            <Label>Program</Label>
            <AsyncSearchPopover<ProgramOption>
              value={programId}
              onChange={(value) => {
                loadRequestRef.current += 1;
                programDetailRequestRef.current += 1;
                setProgramId(value);
                setProgramName("");
                setSections([]);
                setSectionId("");
                setAcademicYearId("");
                setAcademicYearName("");
                setSlots([]);
                setSubjects([]);
                setEntryMap({});
                setViewEntries(new Map());
                setLoading(false);
                setProgramDetailLoading(false);
              }}
              onSelectItem={(item) => {
                setProgramId(String(item.id));
                setProgramName(item.title);
                setSectionId("");
                setSlots([]);
                setSubjects([]);
                setEntryMap({});
                setViewEntries(new Map());
                loadProgramDetail(String(item.id));
              }}
              selectedLabel={programName || undefined}
              placeholder={institutionId ? "Select program..." : "Select institution first"}
              searchPlaceholder="Search programs..."
              disabled={!institutionId}
              loading={programsLoading}
              fetcher={fetchPrograms}
              getValue={(item) => String(item.id)}
              getLabel={(item) => item.title}
            />
          </div>
          <div className="space-y-2">
            <Label>Section</Label>
            <Select
              value={sectionId}
              onValueChange={(value) => {
                loadRequestRef.current += 1;
                setSectionId(value);
                setSlots([]);
                setSubjects([]);
                setEntryMap({});
                setViewEntries(new Map());
                if (academicYearId) setLoading(true);
              }}
              disabled={programDetailLoading || !sections.length}
            >
              <SelectTrigger>
                {programDetailLoading ? (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    Loading sections...
                  </span>
                ) : (
                  <SelectValue placeholder={sections.length ? "Select section..." : "No sections"} />
                )}
              </SelectTrigger>
              <SelectContent>
                {sections.map((section) => <SelectItem key={section.id} value={String(section.id)}>{section.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Academic Year</Label>
            <AsyncSearchPopover<AcademicYearOption>
              value={academicYearId}
              onChange={(value) => {
                loadRequestRef.current += 1;
                setAcademicYearId(value);
                setAcademicYearName("");
                setSlots([]);
                setSubjects([]);
                setEntryMap({});
                setViewEntries(new Map());
                if (value && sectionId) setLoading(true);
              }}
              onSelectItem={(item) => setAcademicYearName(item.name)}
              selectedLabel={academicYearName || undefined}
              placeholder={institutionId ? "Select year..." : "Select institution first"}
              searchPlaceholder="Search years..."
              disabled={!institutionId}
              loading={yearsLoading}
              fetcher={fetchAcademicYears}
              getValue={(item) => String(item.id)}
              getLabel={(item) => item.name}
            />
          </div>
        </div>
      </section>

      <section className="rounded-md border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-5 text-destructive" />
            <div>
              <h2 className="font-semibold">Weekly Timetable</h2>
              <p className="text-xs text-muted-foreground">Break and lunch slots are displayed automatically from timetable setup.</p>
            </div>
          </div>
          {canEdit && (
            <Button onClick={saveTimetable} disabled={loading || saving || !slots.length}>
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              {saving ? "Saving..." : "Save Timetable"}
            </Button>
          )}
        </div>

        {loading ? (
          <TimetableSkeleton />
        ) : slots.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-36 p-3 text-left font-medium text-muted-foreground">Day</th>
                  {slots.map((slot) => (
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
                    {slots.map((slot) => {
                      const entryKey = keyFor(day.value, slot.id);
                      const entry = viewEntries.get(entryKey);
                      const draftEntry = entryMap[entryKey];
                      if (slot.slot_type !== "CLASS") {
                        return (
                          <td key={slot.id} className="p-3">
                            <div className="rounded-md border border-dashed bg-muted/20 p-3 text-center text-xs font-semibold text-muted-foreground">
                              {
                                {
                                  BREAK: "Break",
                                  LUNCH: "Lunch",
                                  ASSEMBLY: "Assembly",
                                  ACTIVITY: "Activity",
                                }[slot.slot_type]
                              }
                            </div>
                          </td>
                        );
                      }

                      return (
                        <td key={slot.id} className="p-3 align-top">
                          {canEdit ? (
                            <button
                              type="button"
                              onClick={() => openAssignment(day.label, slot, entryKey)}
                              disabled={saving}
                              className="min-h-16 w-full rounded-md border bg-background p-3 text-left transition hover:border-primary/60 hover:bg-muted/30 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {draftEntry ? (
                                <>
                                  <span className="block font-medium">{draftEntry.subjectName}</span>
                                  <span className="mt-1 block text-xs text-muted-foreground">
                                    {draftEntry.teacherName || "Choose teacher"}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs text-muted-foreground">Assign class</span>
                              )}
                            </button>
                          ) : entry ? (
                            <div className="rounded-md border bg-muted/10 p-3">
                              <p className="font-medium">{entry.subject_name}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{entry.teacher_name || "Teacher not mapped"}</p>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">No class</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Select program, section, and academic year. Configure slots first if no timetable grid appears.
          </div>
        )}
      </section>

      <Sheet open={Boolean(activeCell)} onOpenChange={(open) => !open && setActiveCell(null)}>
        <SheetContent
          className="w-full gap-0 overflow-hidden sm:max-w-lg"
          defaultSize={520}
          minSize={400}
          maxSize={720}
          resizeStorageKey="timetable-period-assignment-sheet"
        >
          <SheetHeader className="shrink-0 border-b p-5 pr-12 text-left">
            <SheetTitle>Assign Class Period</SheetTitle>
            <SheetDescription>
              {activeCell
                ? `${activeCell.dayLabel} · ${activeCell.slot.slot_name || `Slot ${activeCell.slot.slot_order}`} · ${String(activeCell.slot.start_time).slice(0, 5)} - ${String(activeCell.slot.end_time).slice(0, 5)}`
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
                loading={teachersLoading}
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
                Only active teachers from {institutionName || "the selected institution"} are available.
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
    </div>
  );
}
