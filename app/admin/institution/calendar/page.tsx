"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAdminGuard } from "@/hooks/use-admin-guard";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store";

type EventType = "HOLIDAY" | "EVENT" | "NOTICE";

type CalendarEvent = {
  id: number;
  institution_id: number;
  institution_name: string;
  title: string;
  description: string | null;
  event_type: EventType;
  start_date: string;
  end_date: string;
  color: string | null;
};

type InstitutionSummary = {
  id: number;
  name: string;
};

type CalendarResponse = {
  data?: CalendarEvent[];
  institutions?: InstitutionSummary[];
  stats?: {
    total: number;
    holidays: number;
    notices: number;
  };
  error?: string;
};

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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

function toDateKey(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseApiDate(value: string) {
  return new Date(value);
}

function monthLabel(date: Date) {
  return date.toLocaleDateString([], { month: "long", year: "numeric" });
}

function eventOverlapsDay(event: CalendarEvent, day: Date) {
  if (event.event_type === "HOLIDAY") {
    const dayKey = toDateKey(day);
    const startKey = toDateKey(parseApiDate(event.start_date));
    const endKey = toDateKey(parseApiDate(event.end_date));
    return dayKey >= startKey && dayKey <= endKey;
  }

  const dayStart = startOfDay(day);
  const dayEnd = addDays(dayStart, 1);
  const start = parseApiDate(event.start_date);
  const end = parseApiDate(event.end_date);
  return start < dayEnd && end >= dayStart;
}

function getEventTime(value: string) {
  return parseApiDate(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatEventDate(event: CalendarEvent) {
  const start = parseApiDate(event.start_date);
  const end = parseApiDate(event.end_date);
  const sameDay = isSameDay(start, end);
  const datePart = start.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });

  if (event.event_type === "HOLIDAY") return datePart;
  if (sameDay) return `${datePart}, ${getEventTime(event.start_date)} - ${getEventTime(event.end_date)}`;

  return `${datePart} - ${end.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" })}`;
}

function eventTypeClass(type: EventType) {
  if (type === "HOLIDAY") return "border-red-500/70 bg-red-500/10 text-red-600 dark:text-red-200";
  if (type === "NOTICE") return "border-amber-500/70 bg-amber-500/10 text-amber-700 dark:text-amber-100";
  return "border-sky-500/70 bg-sky-500/10 text-sky-700 dark:text-sky-100";
}

function eventTypeLabel(type: EventType) {
  if (type === "HOLIDAY") return "Holiday";
  if (type === "NOTICE") return "Notice";
  return "Event";
}

async function readJson(res: Response) {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as CalendarResponse;
  } catch {
    return { error: "Server returned an invalid response" };
  }
}

export default function StudentInstitutionCalendarPage() {
  const { isReady } = useAdminGuard();
  const { accessToken } = useAuthStore();
  const authHeader = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken]);
  const [month, setMonth] = useState(() => startOfMonth(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [institutions, setInstitutions] = useState<InstitutionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const calendarDays = useMemo(() => {
    const start = startOfCalendarGrid(month);
    return Array.from({ length: 42 }, (_, index) => addDays(start, index));
  }, [month]);

  const institutionLabel = useMemo(() => {
    if (institutions.length === 0) return "Your institution calendar";
    if (institutions.length === 1) return institutions[0]?.name ?? "Your institution";
    return `${institutions.length} institutions`;
  }, [institutions]);

  const sortedEvents = useMemo(
    () => [...events].sort((a, b) => parseApiDate(a.start_date).getTime() - parseApiDate(b.start_date).getTime()),
    [events]
  );

  const loadEvents = useCallback(async () => {
    if (!accessToken) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        start: startOfCalendarGrid(month).toISOString(),
        end: endOfCalendarGrid(month).toISOString(),
      });
      const res = await fetch(`/api/admin/institution/calendar?${params.toString()}`, {
        headers: authHeader,
        cache: "no-store",
      });
      const json = await readJson(res);
      if (!res.ok) throw new Error(json.error ?? "Failed to load institution calendar");
      setEvents(json.data ?? []);
      setInstitutions(json.institutions ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load institution calendar");
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeader, month]);

  useEffect(() => {
    if (!isReady) return;
    const timeout = window.setTimeout(() => void loadEvents(), 100);
    return () => window.clearTimeout(timeout);
  }, [isReady, loadEvents]);

  if (!isReady) return null;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground sm:text-2xl">Institution Calendar</h1>
          <p className="text-sm leading-snug text-muted-foreground">
            View holidays, notices, and academic events shared by your institution.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full sm:h-10 sm:w-auto"
          onClick={() => void loadEvents()}
          disabled={loading}
        >
          {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <RefreshCw className="mr-2 size-4" />}
          Refresh
        </Button>
      </div>

      <section className="rounded-lg border bg-card p-3 shadow-sm sm:p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(240px,1fr)_repeat(3,minmax(120px,180px))]">
          <div className="rounded-lg border bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">Institution</p>
            <p className="mt-1 truncate text-base font-semibold text-foreground">{institutionLabel}</p>
          </div>
          <div className="rounded-lg border bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">Total Events</p>
            <p className="mt-1 text-xl font-bold text-foreground">{events.length}</p>
          </div>
          <div className="rounded-lg border bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">Holidays</p>
            <p className="mt-1 text-xl font-bold text-foreground">
              {events.filter((event) => event.event_type === "HOLIDAY").length}
            </p>
          </div>
          <div className="rounded-lg border bg-background/60 p-3">
            <p className="text-xs text-muted-foreground">Notices</p>
            <p className="mt-1 text-xl font-bold text-foreground">
              {events.filter((event) => event.event_type === "NOTICE").length}
            </p>
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
              <p className="truncate text-sm text-muted-foreground">{institutionLabel}</p>
            </div>
          </div>
          <div className="grid grid-cols-[36px_1fr_36px] gap-2 sm:flex sm:flex-wrap sm:items-center">
            <Button
              variant="outline"
              size="icon"
              className="size-9 sm:size-10"
              onClick={() => setMonth((current) => startOfMonth(new Date(current.getFullYear(), current.getMonth() - 1, 1)))}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-9 sm:h-10" onClick={() => setMonth(startOfMonth(new Date()))}>
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-9 sm:size-10"
              onClick={() => setMonth((current) => startOfMonth(new Date(current.getFullYear(), current.getMonth() + 1, 1)))}
            >
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

        <div className="relative grid min-h-[336px] grid-cols-7 sm:min-h-[560px]">
          {loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60 backdrop-blur-sm">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          )}
          {institutions.length === 0 && !loading && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
              <div className="rounded-lg border bg-card px-5 py-4 text-center shadow-sm">
                <CalendarDays className="mx-auto mb-2 size-6 text-primary" />
                <p className="font-semibold text-foreground">No institution calendar available</p>
                <p className="text-sm text-muted-foreground">Your institution will appear here after enrollment and permission are active.</p>
              </div>
            </div>
          )}
          {calendarDays.map((day, index) => {
            const dayEvents = events.filter((event) => eventOverlapsDay(event, day));
            const isOutsideMonth = day.getMonth() !== month.getMonth();
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={day.toISOString()}
                className={cn(
                  "min-h-14 border-b border-r p-1 text-left sm:min-h-[94px] sm:p-2",
                  isOutsideMonth && "bg-muted/30 text-muted-foreground/50",
                  index % 7 === 6 && "border-r-0"
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
                      <button
                        key={event.id}
                        type="button"
                        aria-label={`View ${event.title}`}
                        className="size-2 rounded-full"
                        style={{ backgroundColor: event.color || "#38bdf8" }}
                        onClick={() => setSelectedEvent(event)}
                      />
                    ))}
                    {dayEvents.length > 2 && <span className="text-[9px] font-semibold text-muted-foreground">+{dayEvents.length - 2}</span>}
                  </div>
                )}
                <div className="hidden space-y-1 sm:block">
                  {dayEvents.slice(0, 3).map((event) => (
                    <button
                      type="button"
                      key={event.id}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 rounded-md border px-2 py-1 text-left text-xs font-semibold transition hover:bg-background/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        eventTypeClass(event.event_type)
                      )}
                      style={event.color ? { borderColor: event.color, color: event.color } : undefined}
                      onClick={() => setSelectedEvent(event)}
                    >
                      <span className="min-w-0 flex-1 truncate">{event.title}</span>
                      <span className="shrink-0 text-[10px] opacity-80">{event.event_type === "HOLIDAY" ? "All day" : getEventTime(event.start_date)}</span>
                    </button>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="px-1 text-xs text-muted-foreground">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border bg-card shadow-sm">
        <div className="border-b p-3 sm:p-4">
          <h2 className="text-base font-semibold text-foreground">Events This Month</h2>
        </div>
        <div className="divide-y">
          {sortedEvents.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No events for this month.</div>
          ) : (
            sortedEvents.map((event) => (
              <button
                key={event.id}
                type="button"
                className="grid w-full gap-2 p-3 text-left transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[minmax(180px,1fr)_160px] sm:p-4"
                onClick={() => setSelectedEvent(event)}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-semibold text-foreground">{event.title}</p>
                    <Badge variant="outline" className={cn("shrink-0", eventTypeClass(event.event_type))}>
                      {eventTypeLabel(event.event_type)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{formatEventDate(event)}</p>
                  {event.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{event.description}</p>
                  )}
                </div>
                <p className="text-sm text-muted-foreground sm:text-right">{event.institution_name}</p>
              </button>
            ))
          )}
        </div>
      </section>

      <Dialog open={Boolean(selectedEvent)} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="max-w-xl">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={cn("shrink-0", eventTypeClass(selectedEvent.event_type))}>
                    {eventTypeLabel(selectedEvent.event_type)}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{selectedEvent.institution_name}</span>
                </div>
                <DialogTitle className="text-xl">{selectedEvent.title}</DialogTitle>
                <DialogDescription>{formatEventDate(selectedEvent)}</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Starts</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {parseApiDate(selectedEvent.start_date).toLocaleString([], {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase text-muted-foreground">Ends</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">
                      {selectedEvent.event_type === "HOLIDAY"
                        ? "All day"
                        : parseApiDate(selectedEvent.end_date).toLocaleString([], {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "numeric",
                            minute: "2-digit",
                          })}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Details</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {selectedEvent.description?.trim() || "No additional details shared."}
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
