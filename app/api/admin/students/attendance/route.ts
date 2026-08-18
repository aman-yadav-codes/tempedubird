import { NextResponse } from "next/server";
import type { PoolClient } from "pg";

import { requireAdmin } from "@/lib/auth/auth";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import { isInstitutionAdminUser, isPlatformAdminUser, isPlatformFullAccess } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  assertAttendanceScope,
  assertCanMarkAttendance,
  dayOfWeekFromDate,
  getEnrolledStudents,
  normalizeStatus,
} from "@/lib/queries/attendance";

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function positive(value: string | null) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

function positiveOrNull(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function canManageAllAttendance(user: Awaited<ReturnType<typeof requireAdmin>>) {
  return (
    isPlatformFullAccess(user) ||
    isPlatformAdminUser(user) ||
    isInstitutionAdminUser(user)
  );
}

async function ensureSession(client: PoolClient, input: {
  institutionId: number;
  academicYearId: number;
  programId: number;
  sectionId: number | null;
  date: string;
  mode: "FULL_DAY" | "PERIOD_WISE";
  markedBy: number;
}) {
  const existing = await client.query<{ id: number }>(
    `
      SELECT id
      FROM attendance_sessions
      WHERE institution_id = $1
        AND academic_year_id = $2
        AND program_id = $3
        AND section_id IS NOT DISTINCT FROM $4::int
        AND attendance_date = $5
      LIMIT 1
    `,
    [input.institutionId, input.academicYearId, input.programId, input.sectionId, input.date]
  );
  if (existing.rows[0]?.id) {
    await client.query(
      `
        UPDATE attendance_sessions
        SET attendance_mode = $2,
            marked_by = $3,
            institution_id = $4,
            academic_year_id = $5
        WHERE id = $1
      `,
      [existing.rows[0].id, input.mode, input.markedBy, input.institutionId, input.academicYearId]
    );
    return Number(existing.rows[0].id);
  }

  const result = await client.query<{ id: number }>(
    `
      INSERT INTO attendance_sessions (
        institution_id,
        academic_year_id,
        program_id,
        section_id,
        attendance_date,
        attendance_mode,
        marked_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `,
    [input.institutionId, input.academicYearId, input.programId, input.sectionId, input.date, input.mode, input.markedBy]
  );

  return Number(result.rows[0].id);
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "mark";
    const institutionId = positive(url.searchParams.get("institutionId"));
    const programId = positive(url.searchParams.get("programId"));
    const sectionId = positiveOrNull(url.searchParams.get("sectionId"));
    const academicYearId = positive(url.searchParams.get("academicYearId"));
    const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);

    if (action === "mark") {
      if (![programId, academicYearId].every(Boolean)) {
        return NextResponse.json({ students: [], slots: [], fullDay: [], period: [] });
      }
      const program = await assertAttendanceScope(db, currentUser, { programId, sectionId, academicYearId });
      const dayOfWeek = dayOfWeekFromDate(date);
      const [students, slots, slotSetup, session] = await Promise.all([
        getEnrolledStudents(db, { institutionId: program.institution_id, programId, sectionId, academicYearId }),
        db.query(
          `
            SELECT
              ts.id,
              ts.slot_name,
              ts.slot_order,
              ts.start_time,
              ts.end_time,
              te.subject_id,
              s.name AS subject_name,
              COALESCE(te.teacher_id, pst.teacher_id) AS teacher_id,
              u.full_name AS teacher_name
            FROM timetable_entries te
            INNER JOIN timetable_slots ts ON ts.id = te.slot_id
            LEFT JOIN program_subject_teachers pst
              ON pst.program_id = te.program_id
             AND pst.section_id IS NOT DISTINCT FROM te.section_id
             AND pst.academic_year_id = te.academic_year_id
             AND pst.subject_id = te.subject_id
            LEFT JOIN subjects s ON s.id = te.subject_id
            LEFT JOIN users u ON u.id = COALESCE(te.teacher_id, pst.teacher_id)
            WHERE te.program_id = $1
              AND te.section_id IS NOT DISTINCT FROM $2::int
              AND te.academic_year_id = $3
              AND te.day_of_week = $4
              AND ts.institution_id = $5
              AND ts.slot_type = 'CLASS'
              AND ts.is_active = TRUE
            ORDER BY ts.slot_order ASC, ts.start_time ASC
          `,
          [programId, sectionId, academicYearId, dayOfWeek, program.institution_id]
        ),
        db.query<{ has_slots: boolean }>(
          `
            SELECT EXISTS (
              SELECT 1
              FROM timetable_slots
              WHERE institution_id = $1
                AND slot_type = 'CLASS'
                AND is_active = TRUE
            ) AS has_slots
          `,
          [program.institution_id]
        ),
        db.query<{ id: number }>(
          `
            SELECT id
            FROM attendance_sessions
            WHERE institution_id = $1
              AND academic_year_id = $2
              AND program_id = $3
              AND section_id IS NOT DISTINCT FROM $4::int
              AND attendance_date = $5
            LIMIT 1
          `,
          [program.institution_id, academicYearId, programId, sectionId, date]
        ),
      ]);
      const sessionId = session.rows[0]?.id ?? 0;
      const canManageAll = canManageAllAttendance(currentUser);
      const classTeacher = canManageAll
        ? { rows: [{ allowed: 1 }] }
        : await db.query<{ allowed: number }>(
          `
            SELECT 1 AS allowed
            FROM program_section_class_teachers
            WHERE program_id = $1
              AND section_id IS NOT DISTINCT FROM $2::int
              AND academic_year_id = $3
              AND teacher_id = $4
            LIMIT 1
          `,
          [programId, sectionId, academicYearId, currentUser.id]
        );
      const isClassTeacher = Boolean(classTeacher.rows.length);
      const teacherSlotIds = canManageAll || isClassTeacher
        ? new Set<number>()
        : new Set(
          (await db.query<{ slot_id: number }>(
            `
              SELECT DISTINCT te.slot_id
              FROM timetable_entries te
              LEFT JOIN program_subject_teachers pst
                ON pst.program_id = te.program_id
               AND pst.section_id IS NOT DISTINCT FROM te.section_id
               AND pst.academic_year_id = te.academic_year_id
               AND pst.subject_id = te.subject_id
              WHERE te.program_id = $1
                AND te.section_id IS NOT DISTINCT FROM $2::int
                AND te.academic_year_id = $3
                AND te.day_of_week = $4
                AND COALESCE(te.teacher_id, pst.teacher_id) = $5
            `,
            [programId, sectionId, academicYearId, dayOfWeek, currentUser.id]
          )).rows.map((row) => Number(row.slot_id))
        );
      const [fullDay, period] = sessionId
        ? await Promise.all([
          db.query("SELECT student_id, status, remarks FROM student_attendance WHERE attendance_session_id = $1", [sessionId]),
          db.query("SELECT student_id, slot_id, status FROM student_period_attendance WHERE attendance_session_id = $1", [sessionId]),
        ])
        : [{ rows: [] }, { rows: [] }];

      return NextResponse.json({
        students,
        slots: slots.rows.map((slot) => ({
          ...slot,
          can_mark: canManageAll || isClassTeacher || teacherSlotIds.has(Number(slot.id)),
        })),
        canMarkFullDay: canManageAll || isClassTeacher,
        hasTimetableSlots: Boolean(slotSetup.rows[0]?.has_slots),
        fullDay: fullDay.rows,
        period: period.rows,
      });
    }

    if (action === "daily") {
      if (!institutionId) return NextResponse.json({ data: [] });
      assertCanAccessInstitution(currentUser, institutionId);
      const reportMode =
        url.searchParams.get("reportMode") === "PERIOD_WISE"
          ? "PERIOD_WISE"
          : "FULL_DAY";
      const params: unknown[] = [date];
      const filters = ["asess.attendance_date = $1"];
      params.push(institutionId);
      filters.push(`asess.institution_id = $${params.length}`);
      if (programId) { params.push(programId); filters.push(`asess.program_id = $${params.length}`); }
      if (sectionId) { params.push(sectionId); filters.push(`asess.section_id = $${params.length}`); }
      if (academicYearId) {
        params.push(academicYearId);
        filters.push(`asess.academic_year_id = $${params.length}`);
      }

      if (reportMode === "PERIOD_WISE") {
        const result = await db.query(
          `
            SELECT
              CONCAT(asess.id, '-', ts.id) AS id,
              ip.title AS program_name,
              COALESCE(sec.name, 'All students') AS section_name,
              ts.id AS slot_id,
              COALESCE(ts.slot_name, 'Period ' || ts.slot_order::text) AS period_name,
              ts.slot_order,
              ts.start_time,
              ts.end_time,
              COALESCE(s.name, 'Subject not assigned') AS subject_name,
              u.full_name AS teacher_name,
              COUNT(spa.id)::int AS total,
              COUNT(*) FILTER (WHERE spa.status = 'PRESENT')::int AS present,
              COUNT(*) FILTER (WHERE spa.status = 'ABSENT')::int AS absent,
              COUNT(*) FILTER (WHERE spa.status = 'LEAVE')::int AS leave,
              COUNT(*) FILTER (WHERE spa.status = 'LATE')::int AS late
            FROM attendance_sessions asess
            INNER JOIN institution_programs ip ON ip.id = asess.program_id
            LEFT JOIN sections sec ON sec.id = asess.section_id
            INNER JOIN timetable_entries te
              ON te.program_id = asess.program_id
             AND te.section_id IS NOT DISTINCT FROM asess.section_id
             AND te.academic_year_id = asess.academic_year_id
             AND te.day_of_week = $${params.length + 1}
            INNER JOIN timetable_slots ts
              ON ts.id = te.slot_id
             AND ts.institution_id = asess.institution_id
             AND ts.slot_type = 'CLASS'
             AND ts.is_active = TRUE
            LEFT JOIN student_period_attendance spa
              ON spa.attendance_session_id = asess.id
             AND spa.slot_id = ts.id
            LEFT JOIN subjects s ON s.id = te.subject_id
            LEFT JOIN users u ON u.id = te.teacher_id
            WHERE ${filters.join(" AND ")}
            GROUP BY
              asess.id,
              ip.title,
              COALESCE(sec.name, 'All students'),
              ts.id,
              ts.slot_name,
              ts.slot_order,
              ts.start_time,
              ts.end_time,
              s.name,
              u.full_name
            ORDER BY ip.title ASC, COALESCE(sec.name, 'All students') ASC, ts.slot_order ASC, ts.start_time ASC
          `,
          [...params, dayOfWeekFromDate(date)]
        );
        return NextResponse.json({ data: result.rows, reportMode });
      }

      const result = await db.query(
        `
          SELECT
            asess.id,
            ip.title AS program_name,
            COALESCE(sec.name, 'All students') AS section_name,
            COUNT(sa.id)::int AS total,
            COUNT(*) FILTER (WHERE sa.status = 'PRESENT')::int AS present,
            COUNT(*) FILTER (WHERE sa.status = 'ABSENT')::int AS absent,
            COUNT(*) FILTER (WHERE sa.status = 'LEAVE')::int AS leave,
            COUNT(*) FILTER (WHERE sa.status = 'LATE')::int AS late
          FROM attendance_sessions asess
          INNER JOIN institution_programs ip ON ip.id = asess.program_id
          LEFT JOIN sections sec ON sec.id = asess.section_id
          LEFT JOIN student_attendance sa ON sa.attendance_session_id = asess.id
          WHERE ${filters.join(" AND ")}
          GROUP BY asess.id, ip.title, COALESCE(sec.name, 'All students')
          ORDER BY ip.title ASC, COALESCE(sec.name, 'All students') ASC
        `,
        params
      );
      return NextResponse.json({ data: result.rows, reportMode });
    }

    if (action === "periodStudents") {
      const slotId = positive(url.searchParams.get("slotId"));
      if (![institutionId, programId, academicYearId, slotId].every(Boolean)) {
        return NextResponse.json({ data: [] });
      }

      assertCanAccessInstitution(currentUser, institutionId);
      const result = await db.query(
        `
          SELECT DISTINCT
            sp.id AS student_id,
            u.id AS user_id,
            u.full_name,
            u.avatar_url,
            sp.admission_number,
            se.roll_number
          FROM attendance_sessions asess
          INNER JOIN student_period_attendance spa
            ON spa.attendance_session_id = asess.id
           AND spa.slot_id = $6
           AND spa.status = 'PRESENT'
          INNER JOIN student_profiles sp ON sp.id = spa.student_id
          INNER JOIN users u ON u.id = sp.user_id
          LEFT JOIN student_enrollments se
            ON se.student_id = sp.id
           AND se.institution_id = asess.institution_id
           AND se.program_id = asess.program_id
           AND se.section_id IS NOT DISTINCT FROM asess.section_id
           AND se.academic_year_id = asess.academic_year_id
          WHERE asess.attendance_date = $1
            AND asess.institution_id = $2
            AND asess.program_id = $3
            AND asess.section_id IS NOT DISTINCT FROM $4::int
            AND asess.academic_year_id = $5
          ORDER BY u.full_name ASC
        `,
        [date, institutionId, programId, sectionId, academicYearId, slotId]
      );

      return NextResponse.json({ data: result.rows });
    }

    if (action === "fullDayStudents") {
      const status = url.searchParams.get("status")?.toUpperCase();
      if (
        ![institutionId, programId, academicYearId].every(Boolean) ||
        !["PRESENT", "ABSENT", "LEAVE", "LATE"].includes(status ?? "")
      ) {
        return NextResponse.json({ data: [] });
      }

      assertCanAccessInstitution(currentUser, institutionId);
      const result = await db.query(
        `
          SELECT DISTINCT
            sp.id AS student_id,
            u.id AS user_id,
            u.full_name,
            u.avatar_url,
            sp.admission_number,
            se.roll_number
          FROM attendance_sessions asess
          INNER JOIN student_attendance sa
            ON sa.attendance_session_id = asess.id
           AND sa.status = $6
          INNER JOIN student_profiles sp ON sp.id = sa.student_id
          INNER JOIN users u ON u.id = sp.user_id
          LEFT JOIN student_enrollments se
            ON se.student_id = sp.id
           AND se.institution_id = asess.institution_id
           AND se.program_id = asess.program_id
           AND se.section_id IS NOT DISTINCT FROM asess.section_id
           AND se.academic_year_id = asess.academic_year_id
          WHERE asess.attendance_date = $1
            AND asess.institution_id = $2
            AND asess.program_id = $3
            AND asess.section_id IS NOT DISTINCT FROM $4::int
            AND asess.academic_year_id = $5
          ORDER BY u.full_name ASC
        `,
        [date, institutionId, programId, sectionId, academicYearId, status]
      );

      return NextResponse.json({ data: result.rows });
    }

    if (action === "monthly") {
      const month = url.searchParams.get("month") || date.slice(0, 7);
      if (![programId, academicYearId].every(Boolean)) return NextResponse.json({ data: [] });
      const program = await assertAttendanceScope(db, currentUser, { programId, sectionId, academicYearId });
      const result = await db.query(
        `
          SELECT
            sp.id AS student_id,
            u.full_name,
            se.roll_number,
            COUNT(sa.id)::int AS total,
            COUNT(*) FILTER (WHERE sa.status IN ('PRESENT', 'LATE'))::int AS present,
            COUNT(*) FILTER (WHERE sa.status = 'ABSENT')::int AS absent,
            COUNT(*) FILTER (WHERE sa.status = 'LEAVE')::int AS leave
          FROM student_enrollments se
          INNER JOIN student_profiles sp ON sp.id = se.student_id
          INNER JOIN users u ON u.id = sp.user_id
          LEFT JOIN attendance_sessions asess
            ON asess.program_id = $1
           AND asess.section_id IS NOT DISTINCT FROM $2::int
           AND asess.academic_year_id = $3
           AND to_char(asess.attendance_date, 'YYYY-MM') = $5
          LEFT JOIN student_attendance sa
            ON sa.attendance_session_id = asess.id
           AND sa.student_id = sp.id
          WHERE se.institution_id = $4
            AND se.academic_year_id = $3
            AND se.status = 'active'
            AND (
              ($2::int IS NOT NULL AND se.program_id = $1 AND se.section_id = $2)
              OR (
                $2::int IS NULL
                AND (
                  se.program_id = $1
                  OR se.class_category_id IN (SELECT category_id FROM program_categories WHERE program_id = $1)
                )
              )
            )
          GROUP BY sp.id, u.full_name, se.roll_number
          ORDER BY
            CASE WHEN se.roll_number ~ '^[0-9]+$' THEN se.roll_number::int END NULLS LAST,
            se.roll_number ASC,
            u.full_name ASC
        `,
        [programId, sectionId, academicYearId, program.institution_id, month]
      );
      return NextResponse.json({ data: result.rows });
    }

    if (action === "history") {
      const studentId = positive(url.searchParams.get("studentId"));
      const from = url.searchParams.get("from") || date;
      const to = url.searchParams.get("to") || date;
      const params: unknown[] = [from, to];
      if (programId && academicYearId) {
        await assertAttendanceScope(db, currentUser, { programId, sectionId, academicYearId });
      } else if (institutionId) {
        assertCanAccessInstitution(currentUser, institutionId);
      } else {
        return NextResponse.json({ data: [] });
      }
      const filters = ["asess.attendance_date BETWEEN $1 AND $2"];
      if (institutionId) { params.push(institutionId); filters.push(`asess.institution_id = $${params.length}`); }
      if (studentId) { params.push(studentId); filters.push(`sa.student_id = $${params.length}`); }
      if (programId) { params.push(programId); filters.push(`asess.program_id = $${params.length}`); }
      if (sectionId) { params.push(sectionId); filters.push(`asess.section_id = $${params.length}`); }
      if (academicYearId) { params.push(academicYearId); filters.push(`asess.academic_year_id = $${params.length}`); }
      const result = await db.query(
        `
          SELECT
            asess.attendance_date,
            ip.title AS program_name,
            COALESCE(sec.name, 'All students') AS section_name,
            sp.id AS student_id,
            u.full_name,
            sa.status,
            sa.remarks
          FROM student_attendance sa
          INNER JOIN attendance_sessions asess ON asess.id = sa.attendance_session_id
          INNER JOIN institution_programs ip ON ip.id = asess.program_id
          LEFT JOIN sections sec ON sec.id = asess.section_id
          INNER JOIN student_profiles sp ON sp.id = sa.student_id
          INNER JOIN users u ON u.id = sp.user_id
          WHERE ${filters.join(" AND ")}
          ORDER BY asess.attendance_date DESC, u.full_name ASC
        `,
        params
      );
      return NextResponse.json({ data: result.rows });
    }

    return NextResponse.json({ error: "Unknown attendance action" }, { status: 400 });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PUT(req: Request) {
  const client = await db.connect();
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json();
    const programId = Number(body.programId);
    const sectionId = positiveOrNull(body.sectionId);
    const academicYearId = Number(body.academicYearId);
    const date = String(body.date || new Date().toISOString().slice(0, 10));
    const mode = body.mode === "PERIOD_WISE" ? "PERIOD_WISE" : "FULL_DAY";
    const slotId = body.slotId ? Number(body.slotId) : null;
    const rowSlotIds = mode === "PERIOD_WISE" && Array.isArray(body.rows)
      ? body.rows
          .map((row: Record<string, unknown>) => Number(row.slotId ?? slotId))
          .filter((id: number) => Number.isInteger(id) && id > 0)
      : [];

    const program = await assertAttendanceScope(db, currentUser, { programId, sectionId, academicYearId });
    await assertCanMarkAttendance(db, currentUser, {
      programId,
      sectionId,
      academicYearId,
      date,
      mode,
      slotIds: mode === "PERIOD_WISE" ? (rowSlotIds.length ? rowSlotIds : (slotId ? [slotId] : [])) : [],
    });

    await client.query("BEGIN");
    const sessionId = await ensureSession(client, {
      institutionId: program.institution_id,
      academicYearId,
      programId,
      sectionId,
      date,
      mode,
      markedBy: Number(currentUser.id),
    });

    if (mode === "FULL_DAY") {
      const rows = Array.isArray(body.rows) ? body.rows : [];
      for (const row of rows) {
        const studentId = Number(row.studentId);
        if (!Number.isInteger(studentId) || studentId <= 0) continue;
        await client.query(
          `
            INSERT INTO student_attendance (attendance_session_id, student_id, status, remarks)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (attendance_session_id, student_id)
            DO UPDATE SET status = EXCLUDED.status, remarks = EXCLUDED.remarks
          `,
          [sessionId, studentId, normalizeStatus(row.status), row.remarks || null]
        );
      }
    } else {
      const rows = Array.isArray(body.rows) ? body.rows : [];
      for (const row of rows) {
        const studentId = Number(row.studentId);
        const rowSlotId = Number(row.slotId ?? slotId);
        if (!Number.isInteger(studentId) || studentId <= 0 || !Number.isInteger(rowSlotId) || rowSlotId <= 0) continue;
        await client.query(
          `
            INSERT INTO student_period_attendance (attendance_session_id, student_id, slot_id, status)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (attendance_session_id, student_id, slot_id)
            DO UPDATE SET status = EXCLUDED.status
          `,
          [sessionId, studentId, rowSlotId, normalizeStatus(row.status)]
        );
      }
    }
    await client.query("COMMIT");

    return NextResponse.json({ success: true, sessionId });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const message = getErrorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  } finally {
    client.release();
  }
}
