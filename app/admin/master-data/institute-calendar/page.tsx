"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { AsyncSearchPopover } from "@/components/shared/async-search-popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useActiveInstitution } from "@/hooks/use-active-institution";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

type InstitutionOption = {
  id: number;
  name?: string | null;
  organization_name?: string | null;
  slug?: string | null;
};

type CalendarEvent = {
  id: number;
  institution_id: number;
  title: string;
  description?: string | null;
  event_type: EventType;
  start_date: string;
  end_date: string;
  color?: string | null;
};

type EventType = "HOLIDAY" | "EVENT" | "NOTICE";

type EventForm = {
  id?: number;
  title: string;
  description: string;
  eventType: EventType;
  startDate: string;
  endDate: string;
  color: string;
};

const EVENT_TYPES: Array<{ value: EventType; label: string; color: string }> = [
  { value: "HOLIDAY", label: "Holiday", color: "#ef4444" },
  { value: "EVENT", label: "Event", color: "#38bdf8" },
  { value: "NOTICE", label: "Notice", color: "#f59e0b" },
];

const EVENT_COLORS = ["#3b82f6", "#6366f1", "#ec4899", "#ef4444", "#f97316", "#f59e0b", "#10b981"];
const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, "0"));
const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ALLOWED_FUTURE_YEAR_COUNT = 5;

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function instituteCalendarDateBounds() {
  const currentYear = new Date().getFullYear();
  const start = new Date(currentYear, 0, 1);
  const end = new Date(currentYear + ALLOWED_FUTURE_YEAR_COUNT, 11, 31, 23, 59, 59, 999);
  return { start, end };
}

function clampToInstituteCalendarRange(date: Date) {
  const { start, end } = instituteCalendarDateBounds();
  if (date < start) return new Date(start);
  if (date > end) return new Date(end);
  return date;
}

function isWithinInstituteCalendarRange(date: Date) {
  const { start, end } = instituteCalendarDateBounds();
  return date >= start && date <= end;
}

function instituteCalendarYearRangeLabel() {
  const { start, end } = instituteCalendarDateBounds();
  return `${start.getFullYear()} to ${end.getFullYear()}`;
}

function startOfCalendarGrid(date: Date) {
  const first = startOfMonth(date);
  const mondayBasedDay = (first.getDay() + 6) % 7;
  return addDays(first, -mondayBasedDay);
}

function endOfCalendarGrid(date: Date) {
  return addDays(startOfCalendarGrid(date), 41);
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function toDateInputValue(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toDateKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function compareDateKeys(a: string, b: string) {
  return a.localeCompare(b);
}

function fromDateInputValue(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatDateTimeButton(value: string) {
  return fromDateInputValue(value).toLocaleString([], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function updateDatePart(value: string, selectedDate: Date) {
  const current = fromDateInputValue(value);
  const next = new Date(selectedDate);
  next.setHours(current.getHours(), current.getMinutes(), 0, 0);
  return toDateInputValue(next);
}

function updateTimePart(value: string, hour: string, minute: string) {
  const next = fromDateInputValue(value);
  next.setHours(Number(hour), Number(minute), 0, 0);
  return toDateInputValue(next);
}

function toHolidayStart(value: string) {
  const next = startOfDay(fromDateInputValue(value));
  return toDateInputValue(next);
}

function toHolidayEnd(value: string) {
  const next = startOfDay(fromDateInputValue(value));
  next.setHours(23, 59, 59, 999);
  return toDateInputValue(next);
}

function parseApiDate(value: string) {
  return new Date(value);
}

function getEventTime(value: string) {
  return parseApiDate(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function monthLabel(date: Date) {
  return date.toLocaleDateString([], { month: "long", year: "numeric" });
}

function defaultForm(date = new Date()): EventForm {
  const boundedDate = clampToInstituteCalendarRange(date);
  const start = new Date(boundedDate);
  start.setHours(9, 0, 0, 0);
  const end = new Date(boundedDate);
  end.setHours(10, 0, 0, 0);

  return {
    title: "",
    description: "",
    eventType: "EVENT",
    startDate: toDateInputValue(start),
    endDate: toDateInputValue(end),
    color: "#38bdf8",
  };
}

function eventOverlapsDay(event: CalendarEvent, day: Date) {
  if (event.event_type === "HOLIDAY") {
    const dayKey = toDateKey(day);
    const startKey = toDateKey(parseApiDate(event.start_date));
    const endKey = toDateKey(parseApiDate(event.end_date));
    return compareDateKeys(dayKey, startKey) >= 0 && compareDateKeys(dayKey, endKey) <= 0;
  }

  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const start = parseApiDate(event.start_date);
  const end = parseApiDate(event.end_date);
  return start < dayEnd && end >= dayStart;
}

function isMultiDayHoliday(event: CalendarEvent) {
  return event.event_type === "HOLIDAY" && toDateKey(parseApiDate(event.start_date)) !== toDateKey(parseApiDate(event.end_date));
}

function eventTypeClass(type: EventType) {
  if (type === "HOLIDAY") return "border-red-500/70 bg-red-500/10 text-red-600 dark:text-red-200";
  if (type === "NOTICE") return "border-amber-500/70 bg-amber-500/10 text-amber-700 dark:text-amber-100";
  return "border-sky-500/70 bg-sky-500/10 text-sky-700 dark:text-sky-100";
}

function getInstitutionLabel(item: InstitutionOption) {
  return item.name || item.organization_name || `Institution #${item.id}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function EventDateTimePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const { start, end } = instituteCalendarDateBounds();
  const date = clampToInstituteCalendarRange(fromDateInputValue(value));
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(Math.floor(date.getMinutes() / 5) * 5).padStart(2, "0");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2 font-normal">
          <CalendarIcon className="size-4 text-muted-foreground" />
          <span className="truncate">{formatDateTimeButton(value)}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0" collisionPadding={24}>
        <div className="grid gap-0 sm:grid-cols-[auto_150px]">
          <Calendar
            mode="single"
            selected={date}
            defaultMonth={date}
            startMonth={startOfMonth(start)}
            endMonth={startOfMonth(end)}
            disabled={[{ before: start }, { after: end }]}
            onSelect={(selectedDate) => {
              if (selectedDate) onChange(updateDatePart(value, selectedDate));
            }}
            className="border-r border-border"
          />
          <div className="grid grid-cols-2 gap-3 p-3">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Hour</Label>
              <Select value={hour} onValueChange={(nextHour) => onChange(updateTimePart(value, nextHour, minute))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {HOURS.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Minute</Label>
              <Select value={minute} onValueChange={(nextMinute) => onChange(updateTimePart(value, hour, nextMinute))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-64">
                  {MINUTES.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              className="col-span-2"
              onClick={() => onChange(toDateInputValue(new Date()))}
            >
              Today
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function HolidayDatePicker({
  value,
  disabled,
  onChange,
}: {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const { start, end } = instituteCalendarDateBounds();
  const date = clampToInstituteCalendarRange(fromDateInputValue(value));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("w-full justify-start gap-2 font-normal", disabled && "opacity-50")}
          disabled={disabled}
        >
          <CalendarIcon className="size-4 text-muted-foreground" />
          <span className="truncate">
            {date.toLocaleDateString([], { day: "2-digit", month: "2-digit", year: "numeric" })}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0" collisionPadding={24}>
        <Calendar
          mode="single"
          selected={date}
          defaultMonth={date}
          startMonth={startOfMonth(start)}
          endMonth={startOfMonth(end)}
          disabled={[{ before: start }, { after: end }]}
          onSelect={(selectedDate) => {
            if (selectedDate) onChange(toHolidayStart(toDateInputValue(selectedDate)));
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

export function InstituteCalendarPageContent({
  defaultCalendarMode = false,
}: {
  defaultCalendarMode?: boolean;
}) {
  const { isReady } = useAdminGuard();
  const { accessToken, user } = useAuthStore();
  const { activeInstitution } = useActiveInstitution();
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
  const isPlatformAdmin = Boolean(user?.role_codes?.includes("platform_admin") || user?.is_super_admin);
  const useSidebarInstitution = Boolean(activeInstitution && !isPlatformAdmin && !defaultCalendarMode);

  const [institutionId, setInstitutionId] = useState("");
  const [institutionName, setInstitutionName] = useState("");
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [importingDefaults, setImportingDefaults] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<EventForm>(() => defaultForm());
  const [singleDayHoliday, setSingleDayHoliday] = useState(true);
  const selectedInstitutionId = defaultCalendarMode
    ? "default"
    : useSidebarInstitution && activeInstitution
    ? String(activeInstitution.id)
    : institutionId;
  const selectedInstitutionName = defaultCalendarMode
    ? "Platform default calendar"
    : useSidebarInstitution && activeInstitution
    ? activeInstitution.name
    : institutionName;

  const calendarDays = useMemo(() => {
    const start = startOfCalendarGrid(month);
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [month]);
  const eventStats = useMemo(() => ({
    events: events.length,
    holidays: events.filter((event) => event.event_type === "HOLIDAY").length,
    notices: events.filter((event) => event.event_type === "NOTICE").length,
  }), [events]);

  const fetchInstitutions = useCallback(async (search: string, page: number) => {
    const params = new URLSearchParams({ page: String(page), limit: "15", search });
    const res = await fetch(`/api/admin/institutions/profiles?${params.toString()}`, { headers: authHeader });
    if (!res.ok) throw new Error("Failed to load institutions");
    const json = await res.json();
    return { data: json.data || [], hasMore: page < json.pageCount };
  }, [authHeader]);

  const loadEvents = useCallback(async () => {
    if (!selectedInstitutionId) {
      setEvents([]);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        start: startOfCalendarGrid(month).toISOString(),
        end: endOfCalendarGrid(month).toISOString(),
      });
      if (defaultCalendarMode) {
        params.set("defaultCalendar", "1");
      } else {
        params.set("institutionId", selectedInstitutionId);
      }
      const res = await fetch(`/api/admin/master-data/institute-calendar?${params.toString()}`, {
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load calendar events");
      setEvents(json.data || []);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Failed to load calendar events");
    } finally {
      setLoading(false);
    }
  }, [authHeader, defaultCalendarMode, selectedInstitutionId, month]);

  useEffect(() => {
    if (!isReady) return;
    const timeoutId = window.setTimeout(() => {
      void loadEvents();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isReady, loadEvents]);

  function openCreateDialog(date?: Date) {
    setForm(defaultForm(date));
    setSingleDayHoliday(true);
    setDialogOpen(true);
  }

  function openEditDialog(event: CalendarEvent) {
    const startDate = toDateInputValue(parseApiDate(event.start_date));
    const endDate = toDateInputValue(parseApiDate(event.end_date));
    setForm({
      id: event.id,
      title: event.title,
      description: event.description || "",
      eventType: event.event_type,
      startDate,
      endDate,
      color: event.color || EVENT_TYPES.find((type) => type.value === event.event_type)?.color || "#38bdf8",
    });
    setSingleDayHoliday(event.event_type === "HOLIDAY" && toDateKey(fromDateInputValue(startDate)) === toDateKey(fromDateInputValue(endDate)));
    setDialogOpen(true);
  }

  async function saveEvent() {
    if (!selectedInstitutionId) {
      toast.error("Active institution is required");
      return;
    }
    if (!form.title.trim()) {
      toast.error("Event title is required");
      return;
    }

    setSaving(true);
    try {
      const startDate = form.eventType === "HOLIDAY" ? toHolidayStart(form.startDate) : form.startDate;
      const endDate = form.eventType === "HOLIDAY" ? toHolidayEnd(form.endDate) : form.endDate;
      if (!isWithinInstituteCalendarRange(fromDateInputValue(startDate)) || !isWithinInstituteCalendarRange(fromDateInputValue(endDate))) {
        toast.error(`Calendar events can only be added from ${instituteCalendarYearRangeLabel()}`);
        return;
      }
      if (form.eventType === "HOLIDAY" && compareDateKeys(toDateKey(fromDateInputValue(endDate)), toDateKey(fromDateInputValue(startDate))) < 0) {
        toast.error("Holiday end date cannot be before start date");
        return;
      }
      const payload = {
        id: form.id,
        ...(defaultCalendarMode
          ? { default_calendar: true }
          : { institution_id: Number(selectedInstitutionId) }),
        title: form.title.trim(),
        description: form.description.trim(),
        event_type: form.eventType,
        start_date: startDate,
        end_date: endDate,
        color: form.color,
      };
      const res = await fetch("/api/admin/master-data/institute-calendar", {
        method: form.id ? "PATCH" : "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save event");

      toast.success(form.id ? "Calendar event updated" : "Calendar event added");
      setDialogOpen(false);
      await loadEvents();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Failed to save event");
    } finally {
      setSaving(false);
    }
  }

  async function deleteEvent() {
    if (!form.id || !selectedInstitutionId) return;

    setSaving(true);
    try {
      const params = new URLSearchParams({ id: String(form.id) });
      if (defaultCalendarMode) {
        params.set("defaultCalendar", "1");
      } else {
        params.set("institutionId", selectedInstitutionId);
      }
      const res = await fetch(`/api/admin/master-data/institute-calendar?${params.toString()}`, {
        method: "DELETE",
        headers: authHeader,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete event");

      toast.success("Calendar event deleted");
      setDialogOpen(false);
      await loadEvents();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Failed to delete event");
    } finally {
      setSaving(false);
    }
  }

  async function importDefaultDates() {
    if (!selectedInstitutionId) {
      toast.error("Select an institution first");
      return;
    }

    setImportingDefaults(true);
    try {
      const res = await fetch("/api/admin/master-data/institute-calendar", {
        method: "POST",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "importDefaults",
          institution_id: Number(selectedInstitutionId),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to import default dates");
      const imported = Number(json.data?.imported ?? 0);
      toast.success(
        imported > 0
          ? `${imported} default date${imported === 1 ? "" : "s"} imported`
          : "Default dates already synced"
      );
      await loadEvents();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error) || "Failed to import default dates");
    } finally {
      setImportingDefaults(false);
    }
  }

  function updateEventType(eventType: EventType) {
    const option = EVENT_TYPES.find((type) => type.value === eventType);
    setForm((current) => ({
      ...current,
      eventType,
      color: option?.color || current.color,
      endDate: eventType === "HOLIDAY" ? toHolidayEnd(current.startDate) : current.endDate,
    }));
    if (eventType === "HOLIDAY") setSingleDayHoliday(true);
  }

  if (!isReady) return null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">
            {defaultCalendarMode ? "Default Calendar" : "Institute Calendar"}
          </h1>
          <p className="text-sm leading-snug text-muted-foreground">
            {defaultCalendarMode
              ? "Manage default holidays, notices, and events inherited by institutions."
              : "Manage institution holidays, notices, and academic events."}
          </p>
        </div>
        <div className="grid grid-cols-[40px_1fr_1fr] gap-2 sm:flex sm:items-center">
          {!defaultCalendarMode && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="sm:size-10"
                  disabled={!selectedInstitutionId || importingDefaults}
                >
                  {importingDefaults ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <MoreHorizontal className="size-4" />
                  )}
                  <span className="sr-only">Calendar actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem
                  className="whitespace-nowrap"
                  disabled={!selectedInstitutionId || importingDefaults}
                  onClick={() => void importDefaultDates()}
                >
                  <RefreshCw className="size-4" />
                  Import defaults
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <Button
            variant="outline"
            size="sm"
            className="sm:h-10"
            onClick={() => void loadEvents()}
            disabled={!selectedInstitutionId || loading}
          >
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
            Refresh
          </Button>
          <Button size="sm" className="sm:h-10" onClick={() => openCreateDialog(new Date())} disabled={!selectedInstitutionId}>
            <Plus className="mr-2 size-4" />
            Add Event
          </Button>
        </div>
      </div>

      <section className="rounded-lg border bg-card p-3 shadow-sm sm:p-4">
        <div className={cn("grid gap-3", !useSidebarInstitution && !defaultCalendarMode && "md:grid-cols-[minmax(280px,420px)_1fr] md:items-end")}>
          {!useSidebarInstitution && !defaultCalendarMode && (
            <div className="space-y-2">
              <Label>Institution</Label>
              <AsyncSearchPopover<InstitutionOption>
                value={institutionId}
                selectedLabel={institutionName}
                onChange={(value) => {
                  setInstitutionId(value);
                  if (!value) setInstitutionName("");
                }}
                onSelectItem={(item) => setInstitutionName(getInstitutionLabel(item))}
                placeholder="Select institution..."
                searchPlaceholder="Search institutions..."
                emptyText="No institutions found"
                fetcher={fetchInstitutions}
                getValue={(item) => String(item.id)}
                getLabel={getInstitutionLabel}
              />
            </div>
          )}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="rounded-lg border bg-background/60 p-2 sm:p-3">
              <p className="text-xs text-muted-foreground">Events</p>
              <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{eventStats.events}</p>
            </div>
            <div className="rounded-lg border bg-background/60 p-2 sm:p-3">
              <p className="text-xs text-muted-foreground">Holidays</p>
              <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{eventStats.holidays}</p>
            </div>
            <div className="rounded-lg border bg-background/60 p-2 sm:p-3">
              <p className="text-xs text-muted-foreground">Notices</p>
              <p className="mt-1 text-xl font-bold text-foreground sm:text-2xl">{eventStats.notices}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 flex-col items-center justify-center rounded-lg border border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-100 sm:size-12">
              <span className="text-[10px] font-bold uppercase">{month.toLocaleDateString([], { month: "short" })}</span>
              <span className="text-base font-bold sm:text-lg">{new Date().getDate()}</span>
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-base font-semibold text-foreground sm:text-lg">{monthLabel(month)}</h2>
                <Badge variant="outline" className="shrink-0">{events.length} events</Badge>
              </div>
              <p className="truncate text-sm text-muted-foreground">{selectedInstitutionName || "Select an institution to load the calendar."}</p>
            </div>
          </div>
          <div className="grid grid-cols-[36px_1fr_36px] gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Button variant="outline" size="icon" className="size-9 sm:size-10" onClick={() => setMonth((current) => startOfMonth(new Date(current.getFullYear(), current.getMonth() - 1, 1)))}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-9 sm:h-10" onClick={() => setMonth(startOfMonth(new Date()))}>Today</Button>
            <Button variant="outline" size="icon" className="size-9 sm:size-10" onClick={() => setMonth((current) => startOfMonth(new Date(current.getFullYear(), current.getMonth() + 1, 1)))}>
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b">
          {WEEK_DAYS.map((day) => (
            <div key={day} className="border-r px-1 py-2 text-center text-[11px] font-semibold text-muted-foreground last:border-r-0 sm:px-3 sm:text-right sm:text-xs">
              {day}
            </div>
          ))}
        </div>

        <div className="relative grid min-h-[336px] grid-cols-7 sm:min-h-[620px]">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          )}
          {!selectedInstitutionId && !defaultCalendarMode && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
              <div className="rounded-lg border bg-card px-5 py-4 text-center shadow-sm">
                <CalendarDays className="mx-auto mb-2 size-6 text-primary" />
                <p className="font-semibold text-foreground">Select an institution first</p>
                <p className="text-sm text-muted-foreground">Calendar events will appear here.</p>
              </div>
            </div>
          )}
          {calendarDays.map((day) => {
            const dayEvents = events.filter((event) => eventOverlapsDay(event, day));
            const rangeHoliday = dayEvents.find(isMultiDayHoliday);
            const isOutsideMonth = day.getMonth() !== month.getMonth();
            const isToday = isSameDay(day, new Date());

            return (
              <button
                type="button"
                key={day.toISOString()}
                disabled={!selectedInstitutionId}
                onClick={() => {
                  if (rangeHoliday) {
                    openEditDialog(rangeHoliday);
                    return;
                  }
                  openCreateDialog(day);
                }}
                className={cn(
                  "min-h-14 border-b border-r p-1 text-left transition hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[104px] sm:p-2",
                  isOutsideMonth && "bg-muted/30 text-muted-foreground/50",
                  calendarDays.indexOf(day) % 7 === 6 && "border-r-0"
                )}
              >
                <div className="mb-1 flex items-center justify-center sm:mb-2 sm:justify-between">
                  <span
                    className={cn(
                      "flex size-5 items-center justify-center rounded-full text-[11px] font-bold text-foreground sm:size-6 sm:text-xs",
                      isToday && "bg-primary text-primary-foreground"
                    )}
                  >
                    {day.getDate()}
                  </span>
                </div>
                {dayEvents.length > 0 && (
                  <div className="flex items-center justify-center gap-0.5 sm:hidden">
                    {dayEvents.slice(0, 2).map((event) => (
                      <span
                        key={event.id}
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: event.color || EVENT_TYPES.find((type) => type.value === event.event_type)?.color || "#38bdf8" }}
                      />
                    ))}
                    {dayEvents.length > 2 && <span className="text-[9px] font-semibold text-muted-foreground">+{dayEvents.length - 2}</span>}
                  </div>
                )}
                <div className="hidden space-y-1 sm:block">
                  {dayEvents.slice(0, 3).map((event) => (
                    <div
                      key={event.id}
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(event);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          e.stopPropagation();
                          openEditDialog(event);
                        }
                      }}
                      className={cn(
                        "flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs font-semibold",
                        eventTypeClass(event.event_type)
                      )}
                      style={event.color ? { borderColor: event.color, color: event.color } : undefined}
                    >
                      <span className="min-w-0 flex-1 truncate">{event.title}</span>
                      {event.event_type !== "HOLIDAY" && (
                        <span className="shrink-0 text-[10px] opacity-80">{getEventTime(event.start_date)}</span>
                      )}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="px-1 text-xs text-muted-foreground">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Calendar Event" : "Add Calendar Event"}</DialogTitle>
            <DialogDescription>
              {selectedInstitutionName ? `Manage event details for ${selectedInstitutionName}.` : "Select an institution before saving an event."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="calendar-title">Title</Label>
              <Input
                id="calendar-title"
                value={form.title}
                onChange={(e) => setForm((current) => ({ ...current, title: e.target.value }))}
                placeholder="Annual function, Diwali holiday..."
              />
            </div>
            <div className="grid gap-4 sm:col-span-2 sm:grid-cols-[180px_1fr]">
              <div className="space-y-2">
                <Label>Event Type</Label>
                <Select value={form.eventType} onValueChange={(value) => updateEventType(value as EventType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <div className="flex h-10 items-center gap-2">
                  {EVENT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      aria-label={`Use color ${color}`}
                      onClick={() => setForm((current) => ({ ...current, color }))}
                      className={cn(
                        "size-5 rounded-full border border-border ring-offset-4 ring-offset-background transition hover:scale-110",
                        form.color.toLowerCase() === color.toLowerCase() && "ring-4 ring-amber-400"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            {form.eventType === "HOLIDAY" ? (
              <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <HolidayDatePicker
                    value={form.startDate}
                    onChange={(holidayDate) =>
                      setForm((current) => ({
                        ...current,
                        startDate: holidayDate,
                        endDate: singleDayHoliday ? toHolidayEnd(holidayDate) : current.endDate,
                      }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <HolidayDatePicker
                    value={form.endDate}
                    disabled={singleDayHoliday}
                    onChange={(holidayDate) =>
                      setForm((current) => ({
                        ...current,
                        endDate: toHolidayEnd(holidayDate),
                      }))
                    }
                  />
                </div>
                <label className="flex items-center gap-3 rounded-lg border bg-background/60 px-3 py-2 text-sm font-medium text-foreground sm:col-span-2">
                  <Checkbox
                    checked={singleDayHoliday}
                    onCheckedChange={(checked) => {
                      const nextChecked = Boolean(checked);
                      setSingleDayHoliday(nextChecked);
                      if (nextChecked) setForm((current) => ({ ...current, endDate: toHolidayEnd(current.startDate) }));
                    }}
                  />
                  Only on start date
                </label>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Start</Label>
                  <EventDateTimePicker
                    value={form.startDate}
                    onChange={(startDate) => setForm((current) => ({ ...current, startDate }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <EventDateTimePicker
                    value={form.endDate}
                    onChange={(endDate) => setForm((current) => ({ ...current, endDate }))}
                  />
                </div>
              </>
            )}
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="calendar-description">Description</Label>
              <Textarea
                id="calendar-description"
                value={form.description}
                onChange={(e) => setForm((current) => ({ ...current, description: e.target.value }))}
                placeholder="Optional event details..."
                rows={4}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            <div>
              {form.id && (
                <Button variant="destructive" onClick={() => void deleteEvent()} disabled={saving}>
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
              <Button onClick={() => void saveEvent()} disabled={saving || !selectedInstitutionId}>
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Save Event
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function InstituteCalendarPage() {
  return <InstituteCalendarPageContent />;
}
