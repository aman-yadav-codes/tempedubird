import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  ensureCalendarDefaultImportSchema,
  importDefaultCalendarEvents,
} from "@/lib/queries/institute-calendar-defaults";

const EVENT_TYPES = new Set(["HOLIDAY", "EVENT", "NOTICE"]);
const TYPE_COLORS: Record<string, string> = {
  HOLIDAY: "#ef4444",
  EVENT: "#38bdf8",
  NOTICE: "#f59e0b",
};

type CalendarEventPayload = {
  id?: number;
  institution_id?: number;
  institutionId?: number;
  title?: string;
  description?: string | null;
  event_type?: string;
  eventType?: string;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  color?: string | null;
  default_calendar?: boolean;
  defaultCalendar?: boolean;
};

type CalendarEventRow = {
  id: string | number;
  institution_id: string | number | null;
  academic_year_id?: string | number | null;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string | Date;
  end_date: string | Date;
  color: string | null;
  created_by: number | null;
  created_at: string | Date;
  updated_at: string | Date;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

function parsePositiveId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function parseEventDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDateKey(value: unknown) {
  if (typeof value === "string") {
    const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
    if (match) return match[1];
  }
  const date = parseEventDate(value);
  if (!date) return null;
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getDateTime(value: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

function normalizePayload(payload: CalendarEventPayload, defaultCalendar = false) {
  const institutionId = defaultCalendar ? null : parsePositiveId(payload.institution_id ?? payload.institutionId);
  const title = payload.title?.trim() ?? "";
  const eventType = (payload.event_type ?? payload.eventType ?? "").trim().toUpperCase();
  const rawStartDate = payload.start_date ?? payload.startDate;
  const rawEndDate = payload.end_date ?? payload.endDate;
  const startDate = parseEventDate(rawStartDate);
  const endDate = parseEventDate(rawEndDate);
  const color = payload.color?.trim() || TYPE_COLORS[eventType] || TYPE_COLORS.EVENT;
  const startDateKey = eventType === "HOLIDAY" ? getDateKey(rawStartDate) : null;
  const endDateKey = eventType === "HOLIDAY" ? getDateKey(rawEndDate) : null;
  const normalizedStartDate = startDateKey ? `${startDateKey}T00:00:00` : startDate;
  const normalizedEndDate = endDateKey ? `${endDateKey}T23:59:59` : endDate;

  return {
    institutionId,
    title,
    description: payload.description?.trim() || null,
    eventType,
    startDate: normalizedStartDate,
    endDate: normalizedEndDate,
    color,
  };
}

function validateEvent(payload: ReturnType<typeof normalizePayload>, defaultCalendar = false) {
  if (!defaultCalendar && !payload.institutionId) return "Institution is required.";
  if (!payload.title) return "Event title is required.";
  if (!EVENT_TYPES.has(payload.eventType)) return "Event type must be Holiday, Event, or Notice.";
  if (!payload.startDate) return "Start date is required.";
  if (!payload.endDate) return "End date is required.";
  const startTime = getDateTime(payload.startDate);
  const endTime = getDateTime(payload.endDate);
  if (startTime === null || endTime === null) return "Event dates are invalid.";
  if (endTime < startTime) {
    return "End date must be after start date.";
  }
  return null;
}

function serializeEvent(row: CalendarEventRow) {
  return {
    id: Number(row.id),
    institution_id: row.institution_id === null ? null : Number(row.institution_id),
    academic_year_id: row.academic_year_id == null ? null : Number(row.academic_year_id),
    title: row.title,
    description: row.description,
    event_type: row.event_type,
    start_date: row.start_date,
    end_date: row.end_date,
    color: row.color,
    created_by: row.created_by,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

async function ensureCalendarSessionColumn() {
  await db.query(`
    ALTER TABLE institution_calendar_events
      ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL
  `);
  await db.query(`
    UPDATE institution_calendar_events event
    SET academic_year_id = academic_year.id
    FROM academic_years academic_year
    WHERE event.academic_year_id IS NULL
      AND event.institution_id = academic_year.institution_id
      AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
      AND event.start_date::date BETWEEN academic_year.start_date AND academic_year.end_date
  `);
  await db.query(`
    UPDATE institution_calendar_events event
    SET academic_year_id = institution.default_academic_year_id
    FROM institution_profiles institution
    WHERE event.academic_year_id IS NULL
      AND event.institution_id = institution.id
      AND institution.default_academic_year_id IS NOT NULL
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_institution_calendar_events_session
    ON institution_calendar_events(institution_id, academic_year_id, is_deleted, start_date)
  `);
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureCalendarSessionColumn();
    const url = new URL(req.url);
    const defaultCalendar = url.searchParams.get("defaultCalendar") === "1";
    const institutionId = parsePositiveId(url.searchParams.get("institutionId"));

    if (defaultCalendar) {
      if (!isPlatformAdminUser(currentUser)) return jsonError("Only platform admin can manage default calendar.", 403);
      await ensureCalendarDefaultImportSchema(db);
    } else if (!institutionId) {
      return jsonError("Institution is required.");
    } else if (!hasPermission(currentUser, "content.institute_calendar.view", { institutionId })) {
      return jsonError("You need content.institute_calendar.view for this institution.", 403);
    }

    const start = parseEventDate(url.searchParams.get("start"));
    const end = parseEventDate(url.searchParams.get("end"));
    const values: unknown[] = defaultCalendar ? [] : [institutionId];
    const conditions = [
      defaultCalendar ? "events.institution_id IS NULL" : "events.institution_id = $1",
      "COALESCE(events.is_deleted, FALSE) = FALSE",
    ];
    if (!defaultCalendar) {
      conditions.push("ip.is_active = TRUE", "COALESCE(ip.is_deleted, FALSE) = FALSE");
      conditions.push("events.academic_year_id = ip.default_academic_year_id");
    }

    if (start) {
      values.push(start);
      conditions.push(`events.end_date >= $${values.length}`);
    }
    if (end) {
      values.push(end);
      conditions.push(`events.start_date <= $${values.length}`);
    }

    const { rows } = await db.query(
      `
        SELECT events.id, events.institution_id, events.academic_year_id, events.title, events.description, events.event_type,
               to_char(events.start_date, 'YYYY-MM-DD"T"HH24:MI:SS') AS start_date,
               to_char(events.end_date, 'YYYY-MM-DD"T"HH24:MI:SS') AS end_date,
               events.color, events.created_by,
               events.created_at, events.updated_at
        FROM institution_calendar_events events
        ${defaultCalendar ? "" : "INNER JOIN institution_profiles ip ON ip.id = events.institution_id"}
        WHERE ${conditions.join(" AND ")}
        ORDER BY events.start_date ASC, events.id ASC
      `,
      values
    );

    return NextResponse.json({ data: rows.map(serializeEvent) });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureCalendarSessionColumn();
    const body = await req.json();
    if (body?.action === "importDefaults") {
      const institutionId = parsePositiveId(body.institution_id ?? body.institutionId);
      if (!institutionId) return jsonError("Institution is required.");
      if (!hasPermission(currentUser, "content.institute_calendar.create", { institutionId })) {
        return jsonError("You need content.institute_calendar.create for this institution.", 403);
      }
      const imported = await importDefaultCalendarEvents(db, institutionId, currentUser.id);
      await ensureCalendarSessionColumn();
      return NextResponse.json({ data: { imported } });
    }

    const defaultCalendar = Boolean(body?.default_calendar ?? body?.defaultCalendar);
    const payload = normalizePayload(body, defaultCalendar);
    const error = validateEvent(payload, defaultCalendar);

    if (error) return jsonError(error);
    if (defaultCalendar) {
      if (!isPlatformAdminUser(currentUser)) return jsonError("Only platform admin can manage default calendar.", 403);
      await ensureCalendarDefaultImportSchema(db);
    } else if (!hasPermission(currentUser, "content.institute_calendar.create", { institutionId: payload.institutionId })) {
      return jsonError("You need content.institute_calendar.create for this institution.", 403);
    }

    const { rows } = await db.query(
      `
        INSERT INTO institution_calendar_events (
          institution_id, academic_year_id, title, description, event_type, start_date, end_date, color, created_by
        )
        VALUES ($1, CASE WHEN $1::int IS NULL THEN NULL ELSE (SELECT default_academic_year_id FROM institution_profiles WHERE id = $1) END, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, institution_id, academic_year_id, title, description, event_type, start_date, end_date, color,
                  created_by, created_at, updated_at
      `,
      [
        defaultCalendar ? null : payload.institutionId,
        payload.title,
        payload.description,
        payload.eventType,
        payload.startDate,
        payload.endDate,
        payload.color,
        currentUser.id,
      ]
    );

    return NextResponse.json({ data: serializeEvent(rows[0]) }, { status: 201 });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureCalendarSessionColumn();
    const body = await req.json() as CalendarEventPayload;
    const id = parsePositiveId(body.id);
    const defaultCalendar = Boolean(body.default_calendar ?? body.defaultCalendar);
    const payload = normalizePayload(body, defaultCalendar);
    const error = validateEvent(payload, defaultCalendar);

    if (!id) return jsonError("Event id is required.");
    if (error) return jsonError(error);
    if (defaultCalendar) {
      if (!isPlatformAdminUser(currentUser)) return jsonError("Only platform admin can manage default calendar.", 403);
      await ensureCalendarDefaultImportSchema(db);
    } else if (!hasPermission(currentUser, "content.institute_calendar.edit", { institutionId: payload.institutionId })) {
      return jsonError("You need content.institute_calendar.edit for this institution.", 403);
    }

    const { rows } = await db.query(
      `
        UPDATE institution_calendar_events
        SET title = $3,
            academic_year_id = CASE WHEN $2::int IS NULL THEN NULL ELSE (SELECT default_academic_year_id FROM institution_profiles WHERE id = $2) END,
            description = $4,
            event_type = $5,
            start_date = $6,
            end_date = $7,
            color = $8,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND ${defaultCalendar ? "institution_id IS NULL AND $2::integer IS NULL" : "institution_id = $2"}
          AND COALESCE(is_deleted, FALSE) = FALSE
        RETURNING id, institution_id, academic_year_id, title, description, event_type, start_date, end_date, color,
                  created_by, created_at, updated_at
      `,
      [
        id,
        defaultCalendar ? null : payload.institutionId,
        payload.title,
        payload.description,
        payload.eventType,
        payload.startDate,
        payload.endDate,
        payload.color,
      ]
    );

    if (!rows[0]) return jsonError("Event not found.", 404);
    return NextResponse.json({ data: serializeEvent(rows[0]) });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureCalendarSessionColumn();
    const url = new URL(req.url);
    const id = parsePositiveId(url.searchParams.get("id"));
    const defaultCalendar = url.searchParams.get("defaultCalendar") === "1";
    const institutionId = parsePositiveId(url.searchParams.get("institutionId"));

    if (!id) return jsonError("Event id is required.");
    if (defaultCalendar) {
      if (!isPlatformAdminUser(currentUser)) return jsonError("Only platform admin can manage default calendar.", 403);
      await ensureCalendarDefaultImportSchema(db);
    } else if (!institutionId) {
      return jsonError("Institution is required.");
    } else if (!hasPermission(currentUser, "content.institute_calendar.delete", { institutionId })) {
      return jsonError("You need content.institute_calendar.delete for this institution.", 403);
    }

    const { rowCount } = await db.query(
      `UPDATE institution_calendar_events
          SET is_deleted = TRUE,
              deleted_at = NOW(),
              updated_at = NOW()
        WHERE id = $1
          AND ${defaultCalendar ? "institution_id IS NULL" : "institution_id = $2"}
          AND COALESCE(is_deleted, FALSE) = FALSE`,
      defaultCalendar ? [id] : [id, institutionId]
    );

    if (!rowCount) return jsonError("Event not found.", 404);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
