"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  BookOpen,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GraduationCap,
  Heart,
  List,
  MessageCircle,
  RefreshCw,
  School,
  Utensils,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

type TimetableScope = {
  role?: "student" | "teacher";
  institution_id: number;
  institution_name: string;
  program_id?: number;
  program_name?: string;
  section_id?: number;
  section_name?: string;
  academic_year_id?: number;
  academic_year_name?: string;
  teacher_id?: number;
  teacher_name?: string | null;
};

type TimetableSlot = {
  id: number;
  slot_name: string | null;
  slot_order: number;
  start_time: string;
  end_time: string;
  slot_type: "CLASS" | "BREAK" | "LUNCH" | "ASSEMBLY" | "ACTIVITY";
};

type TimetableEntry = {
  day_of_week: number;
  slot_id: number;
  subject_id: number;
  subject_name: string;
  teacher_id: number | null;
  teacher_name: string | null;
  program_id?: number;
  program_name?: string;
  section_id?: number | null;
  section_name?: string | null;
  academic_year_id?: number;
  academic_year_name?: string;
};

type ViewMode = "week" | "list";

const DAYS = [
  { value: 1, label: "Monday", short: "Mon" },
  { value: 2, label: "Tuesday", short: "Tue" },
  { value: 3, label: "Wednesday", short: "Wed" },
  { value: 4, label: "Thursday", short: "Thu" },
  { value: 5, label: "Friday", short: "Fri" },
  { value: 6, label: "Saturday", short: "Sat" },
  { value: 7, label: "Sunday", short: "Sun" },
];

function entryKey(day: number, slot: number) {
  return `${day}:${slot}`;
}

function formatTime(value: string) {
  const [hours = "0", minutes = "00"] = String(value).split(":");
  const hour = Number(hours);
  if (!Number.isFinite(hour)) return value;
  return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? "PM" : "AM"}`;
}

function subjectStyle(subject: string) {
  const name = subject.toLowerCase();
  if (name.includes("english") || name.includes("language")) {
    return { icon: MessageCircle, className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300" };
  }
  if (name.includes("dance") || name.includes("music") || name.includes("activity")) {
    return { icon: Activity, className: "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300" };
  }
  if (name.includes("value") || name.includes("moral")) {
    return { icon: Heart, className: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-300" };
  }
  return { icon: BookOpen, className: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-300" };
}

function classLabel(entry: Pick<TimetableEntry, "program_name" | "section_name">) {
  return [entry.program_name, entry.section_name ? `Section ${entry.section_name}` : null]
    .filter(Boolean)
    .join(" - ") || "Class not assigned";
}

function TimetableSkeleton() {
  return (
    <div className="space-y-5" aria-label="Loading timetable" aria-busy="true">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}
      </div>
      <Skeleton className="h-[460px] rounded-xl" />
    </div>
  );
}

export default function MyTimetablePage() {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
  const currentDay = new Date().getDay() || 7;
  const [scope, setScope] = useState<TimetableScope | null>(null);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [selectedDay, setSelectedDay] = useState(() => currentDay <= 6 ? currentDay : 1);

  const loadTimetable = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const response = await fetch("/api/admin/classroom/my-timetable", {
        headers: authHeader,
        cache: "no-store",
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(json.error ?? "Failed to load your timetable");
      setScope(json.data ?? null);
      setSlots(json.slots ?? []);
      setEntries(json.entries ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load your timetable");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeader]);

  useEffect(() => {
    if (!isReady) return;
    const timer = window.setTimeout(() => void loadTimetable(), 0);
    return () => window.clearTimeout(timer);
  }, [isReady, loadTimetable]);

  const entriesByCell = useMemo(
    () => new Map(entries.map((entry) => [entryKey(entry.day_of_week, entry.slot_id), entry])),
    [entries]
  );
  const visibleDays = useMemo(() => entries.some((entry) => entry.day_of_week === 7) ? DAYS : DAYS.slice(0, 6), [entries]);
  const selectedDayIndex = visibleDays.findIndex((day) => day.value === selectedDay);
  const isTeacherTimetable = scope?.role === "teacher";
  const isParentView = Boolean(user?.role_codes?.includes("parent"));
  const todayEntryCount = useMemo(
    () => entries.filter((entry) => entry.day_of_week === currentDay).length,
    [currentDay, entries]
  );
  const assignedClassCount = useMemo(
    () => new Set(
      entries
        .filter((entry) => entry.program_id)
        .map((entry) => `${entry.program_id}:${entry.section_id ?? ""}`)
    ).size,
    [entries]
  );
  const assignedSubjectCount = useMemo(
    () => new Set(entries.map((entry) => entry.subject_id)).size,
    [entries]
  );

  function moveDay(direction: -1 | 1) {
    if (!visibleDays.length) return;
    const index = selectedDayIndex < 0 ? 0 : selectedDayIndex;
    const next = (index + direction + visibleDays.length) % visibleDays.length;
    setSelectedDay(visibleDays[next].value);
  }

  if (!isReady) return <TimetableSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isParentView ? "Timetable" : "My Timetable"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isTeacherTimetable ? "Your weekly teaching schedule, subjects, and classes." : "Your weekly class schedule, subjects, and teachers."}
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void loadTimetable()} disabled={loading}>
          <RefreshCw className={cn("size-4", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {loading && !scope ? <TimetableSkeleton /> : !scope ? (
        <Card className="items-center px-6 py-16 text-center">
          <School className="size-10 text-muted-foreground" />
          <div>
            <h2 className="font-semibold">No timetable found</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ask your institution administrator to assign your timetable.</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {(isTeacherTimetable ? [
              { label: "Institution", value: scope.institution_name, icon: School },
              { label: "Today's Periods", value: String(todayEntryCount), icon: CalendarDays },
              { label: "Classes", value: String(assignedClassCount), icon: GraduationCap },
              { label: "Subjects", value: String(assignedSubjectCount), icon: BookOpen },
            ] : [
              { label: "Class / Program", value: scope.program_name ?? "-", icon: GraduationCap },
              { label: "Section", value: scope.section_name ?? "-", icon: School },
              { label: "Academic Year", value: scope.academic_year_name ?? "-", icon: CalendarDays },
              { label: "Total Periods", value: String(entries.length), icon: Clock3 },
            ]).map((item) => (
              <Card key={item.label} className="gap-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{item.label}</p>
                  <item.icon className="size-4 text-destructive" />
                </div>
                <p className="text-xl font-semibold">{item.value}</p>
              </Card>
            ))}
          </div>

          <Card className="gap-0 overflow-hidden py-0">
            <CardHeader className="gap-4 border-b py-5 sm:grid-cols-[1fr_auto]">
              <div>
                <CardTitle>Weekly Schedule</CardTitle>
                <CardDescription className="mt-1">
                  {isTeacherTimetable ? `Teacher schedule for ${scope.institution_name}` : `${scope.program_name} - Section ${scope.section_name}`}
                </CardDescription>
              </div>
              <div className="flex w-fit rounded-lg border bg-muted/20 p-1">
                <Button size="sm" variant={viewMode === "week" ? "destructive" : "ghost"} onClick={() => setViewMode("week")}>
                  <CalendarDays className="size-4" /> Week View
                </Button>
                <Button size="sm" variant={viewMode === "list" ? "destructive" : "ghost"} onClick={() => setViewMode("list")}>
                  <List className="size-4" /> List View
                </Button>
              </div>
            </CardHeader>

            {!slots.length ? (
              <CardContent className="py-16 text-center text-sm text-muted-foreground">Your institution has not configured timetable slots yet.</CardContent>
            ) : viewMode === "week" ? (
              <CardContent className="space-y-5 py-5">
                <div className="flex items-center justify-between gap-3 border-b pb-3">
                  <div className="flex min-w-0 gap-1 overflow-x-auto">
                    {visibleDays.map((day) => (
                      <Button
                        key={day.value}
                        size="sm"
                        variant={selectedDay === day.value ? "destructive" : "ghost"}
                        className={cn(
                          "shrink-0",
                          day.value === currentDay && selectedDay !== day.value &&
                            "text-destructive ring-1 ring-inset ring-destructive/40"
                        )}
                        onClick={() => setSelectedDay(day.value)}
                      >
                        <span className="sm:hidden">{day.short}</span><span className="hidden sm:inline">{day.label}</span>
                        {day.value === currentDay && (
                          <span className={cn(
                            "ml-1 size-1.5 rounded-full",
                            selectedDay === day.value ? "bg-destructive-foreground" : "bg-destructive"
                          )} />
                        )}
                      </Button>
                    ))}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button size="icon-sm" variant="outline" aria-label="Previous day" onClick={() => moveDay(-1)}><ChevronLeft /></Button>
                    <Button size="icon-sm" variant="outline" aria-label="Next day" onClick={() => moveDay(1)}><ChevronRight /></Button>
                  </div>
                </div>

                <div className="w-full overflow-x-auto pb-3">
                  <div className="flex min-w-max items-start gap-3 pb-4">
                    {slots.map((slot) => {
                      const entry = entriesByCell.get(entryKey(selectedDay, slot.id));
                      const isBreak = slot.slot_type !== "CLASS";
                      const style = entry ? subjectStyle(entry.subject_name) : null;
                      const Icon = isBreak ? (slot.slot_type === "LUNCH" ? Utensils : Users) : style?.icon ?? BookOpen;
                      return (
                        <div key={slot.id} className="w-52 shrink-0 space-y-3">
                          <div className="h-12">
                            <p className="text-xs text-muted-foreground">{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</p>
                            <p className="mt-1 text-sm font-medium">{slot.slot_name || `Slot ${slot.slot_order}`}</p>
                          </div>
                          <div className={cn(
                            "flex h-44 flex-col items-center justify-center rounded-lg border p-4 text-center",
                            isBreak ? "border-dashed bg-muted/20 text-muted-foreground" : entry ? style?.className : "border-dashed bg-muted/10 text-muted-foreground"
                          )}>
                            <span className="mb-2 rounded-full bg-background/70 p-2"><Icon className="size-5" /></span>
                            <p className="line-clamp-3 flex min-h-15 items-center font-semibold leading-5">{isBreak ? slot.slot_name : entry?.subject_name || "No class assigned"}</p>
                            {!isBreak && entry && (
                              <p className="mt-1 text-xs opacity-80">
                                {isTeacherTimetable ? classLabel(entry) : entry.teacher_name || "Teacher not assigned"}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-x-5 gap-y-2 border-t pt-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-2"><BookOpen className="size-4 text-blue-500" /> Academic</span>
                  <span className="flex items-center gap-2"><MessageCircle className="size-4 text-emerald-500" /> Language</span>
                  <span className="flex items-center gap-2"><Activity className="size-4 text-violet-500" /> Activity</span>
                  <span className="flex items-center gap-2"><Utensils className="size-4 text-amber-500" /> Break</span>
                  <span className="flex items-center gap-2"><Heart className="size-4 text-rose-500" /> Value</span>
                </div>
              </CardContent>
            ) : (
              <CardContent className="space-y-5 py-5">
                {visibleDays.map((day) => (
                  <section key={day.value} className={cn("rounded-lg border", day.value === currentDay && "border-destructive/40 bg-destructive/[0.025]") }>
                    <div className="flex items-center justify-between border-b px-4 py-3">
                      <h3 className="font-semibold">{day.label}</h3>
                      {day.value === currentDay && <Badge variant="secondary">Today</Badge>}
                    </div>
                    <div className="divide-y">
                      {slots.map((slot) => {
                        const entry = entriesByCell.get(entryKey(day.value, slot.id));
                        const isBreak = slot.slot_type !== "CLASS";
                        return (
                          <div key={slot.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[150px_130px_1fr_180px] sm:items-center">
                            <span className="text-xs text-muted-foreground">{formatTime(slot.start_time)} - {formatTime(slot.end_time)}</span>
                            <span className="text-sm font-medium">{slot.slot_name || `Slot ${slot.slot_order}`}</span>
                            <span className={cn("text-sm", isBreak && "text-muted-foreground")}>{isBreak ? slot.slot_name : entry?.subject_name || "No class assigned"}</span>
                            <span className="text-xs text-muted-foreground">
                              {isBreak ? "" : entry ? (isTeacherTimetable ? classLabel(entry) : entry.teacher_name || "Teacher not assigned") : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
