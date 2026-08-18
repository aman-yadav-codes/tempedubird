import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { resolveStudentEnrollmentContext } from "@/lib/auth/student-enrollment-context";
import { db } from "@/lib/db/db";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE" | "LATE";

type FullDayRow = {
  attendance_date: string;
  status: AttendanceStatus;
  remarks: string | null;
};

type PeriodRow = {
  attendance_date: string;
  slot_id: number;
  slot_name: string | null;
  slot_order: number;
  start_time: string;
  end_time: string;
  subject_name: string | null;
  teacher_name: string | null;
  status: AttendanceStatus;
};

type OtherEnrollmentAttendance = {
  enrollment_id: number;
  institution_name: string;
  program_name: string;
  section_name: string | null;
  academic_year_name: string;
  full_day_count: number;
  period_count: number;
};

type ModeDateSummary = {
  attendance_date: string;
  record_count: number;
};

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Unauthorized" || message === "User not found" ? 401 :
      message === "Forbidden: Admin access required" ||
      message === "Forbidden: Invalid child context" ? 403 :
        400;
  return NextResponse.json({ error: message }, { status });
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function isMonth(value: string | null) {
  return Boolean(value && /^\d{4}-\d{2}$/.test(value));
}

function monthFromDate(value: string | Date | null | undefined) {
  if (!value) return currentMonth();
  if (value instanceof Date) return value.toISOString().slice(0, 7);
  return String(value).slice(0, 7);
}

function clampMonth(value: string, min: string, max: string) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function countStatuses(rows: Array<{ status: AttendanceStatus }>) {
  return rows.reduce(
    (stats, row) => {
      stats.total += 1;
      if (row.status === "PRESENT") stats.present += 1;
      if (row.status === "ABSENT") stats.absent += 1;
      if (row.status === "LEAVE") stats.leave += 1;
      if (row.status === "LATE") {
        stats.late += 1;
        stats.present += 1;
      }
      return stats;
    },
    { total: 0, present: 0, absent: 0, leave: 0, late: 0 }
  );
}

function percentage(present: number, total: number) {
  return total ? Number(((present / total) * 100).toFixed(2)) : 0;
}

export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const canView =
      hasPermission(currentUser, "student.myclassroom.attendance.view") ||
      (
        currentUser.role_codes.includes("parent") &&
        hasPermission(currentUser, "parent.childclassroom.attendance.view")
      );
    if (!canView) {
      throw new Error("Forbidden: Admin access required");
    }

    const enrollment = await resolveStudentEnrollmentContext(db, req, currentUser.id, currentUser.role_codes);
    if (!enrollment) {
      return NextResponse.json({
        scope: null,
        fullDay: [],
        periodWise: [],
        modeDates: { fullDay: [], periodWise: [] },
        otherEnrollmentsWithAttendance: [],
        stats: {
          fullDay: { total: 0, present: 0, absent: 0, leave: 0, late: 0, percentage: 0 },
          periodWise: { total: 0, present: 0, absent: 0, leave: 0, late: 0, percentage: 0 },
        },
      });
    }

    const params = new URL(req.url).searchParams;
    const startMonth = monthFromDate(enrollment.academic_year_start_date);
    const endMonth = monthFromDate(enrollment.academic_year_end_date);
    const requestedMonth = isMonth(params.get("month")) ? String(params.get("month")) : startMonth;
    const month = clampMonth(requestedMonth, startMonth, endMonth);

    const fullDay = await db.query<FullDayRow>(
      `
        SELECT
          to_char(session.attendance_date, 'YYYY-MM-DD') AS attendance_date,
          attendance.status,
          attendance.remarks
        FROM attendance_sessions session
        INNER JOIN student_attendance attendance
          ON attendance.attendance_session_id = session.id
         AND attendance.student_id = $1
         AND COALESCE(attendance.is_deleted, FALSE) = FALSE
        WHERE session.institution_id = $2
          AND session.program_id = $3
          AND session.section_id IS NOT DISTINCT FROM $4::int
          AND session.academic_year_id = $5
          AND session.attendance_mode = 'FULL_DAY'
          AND to_char(session.attendance_date, 'YYYY-MM') = $6
        ORDER BY session.attendance_date DESC
      `,
      [
        enrollment.student_id,
        enrollment.institution_id,
        enrollment.program_id,
        enrollment.section_id,
        enrollment.academic_year_id,
        month,
      ]
    );

    const periodWise = await db.query<PeriodRow>(
      `
        SELECT
          to_char(session.attendance_date, 'YYYY-MM-DD') AS attendance_date,
          period.slot_id,
          slot.slot_name,
          slot.slot_order,
          slot.start_time,
          slot.end_time,
          subject.name AS subject_name,
          teacher.full_name AS teacher_name,
          period.status
        FROM attendance_sessions session
        INNER JOIN student_period_attendance period
          ON period.attendance_session_id = session.id
         AND period.student_id = $1
         AND COALESCE(period.is_deleted, FALSE) = FALSE
        INNER JOIN timetable_slots slot ON slot.id = period.slot_id
        LEFT JOIN timetable_entries entry
          ON entry.slot_id = period.slot_id
         AND entry.program_id = session.program_id
         AND entry.section_id IS NOT DISTINCT FROM session.section_id
         AND entry.academic_year_id = session.academic_year_id
         AND entry.day_of_week = EXTRACT(ISODOW FROM session.attendance_date)::int
        LEFT JOIN subjects subject ON subject.id = entry.subject_id
        LEFT JOIN users teacher ON teacher.id = entry.teacher_id
        WHERE session.institution_id = $2
          AND session.program_id = $3
          AND session.section_id IS NOT DISTINCT FROM $4::int
          AND session.academic_year_id = $5
          AND session.attendance_mode = 'PERIOD_WISE'
          AND to_char(session.attendance_date, 'YYYY-MM') = $6
        ORDER BY session.attendance_date DESC, slot.slot_order ASC
      `,
      [
        enrollment.student_id,
        enrollment.institution_id,
        enrollment.program_id,
        enrollment.section_id,
        enrollment.academic_year_id,
        month,
      ]
    );

    const [fullDayDates, periodWiseDates] = await Promise.all([
      db.query<ModeDateSummary>(
        `
          SELECT
            to_char(session.attendance_date, 'YYYY-MM-DD') AS attendance_date,
            COUNT(attendance.id)::int AS record_count
          FROM attendance_sessions session
          INNER JOIN student_attendance attendance
            ON attendance.attendance_session_id = session.id
           AND attendance.student_id = $1
           AND COALESCE(attendance.is_deleted, FALSE) = FALSE
          WHERE session.institution_id = $2
            AND session.program_id = $3
            AND session.section_id IS NOT DISTINCT FROM $4::int
            AND session.academic_year_id = $5
            AND session.attendance_mode = 'FULL_DAY'
            AND to_char(session.attendance_date, 'YYYY-MM') = $6
          GROUP BY session.attendance_date
          ORDER BY session.attendance_date DESC
        `,
        [
          enrollment.student_id,
          enrollment.institution_id,
          enrollment.program_id,
          enrollment.section_id,
          enrollment.academic_year_id,
          month,
        ]
      ),
      db.query<ModeDateSummary>(
        `
          SELECT
            to_char(session.attendance_date, 'YYYY-MM-DD') AS attendance_date,
            COUNT(period.id)::int AS record_count
          FROM attendance_sessions session
          INNER JOIN student_period_attendance period
            ON period.attendance_session_id = session.id
           AND period.student_id = $1
           AND COALESCE(period.is_deleted, FALSE) = FALSE
          WHERE session.institution_id = $2
            AND session.program_id = $3
            AND session.section_id IS NOT DISTINCT FROM $4::int
            AND session.academic_year_id = $5
            AND session.attendance_mode = 'PERIOD_WISE'
            AND to_char(session.attendance_date, 'YYYY-MM') = $6
          GROUP BY session.attendance_date
          ORDER BY session.attendance_date DESC
        `,
        [
          enrollment.student_id,
          enrollment.institution_id,
          enrollment.program_id,
          enrollment.section_id,
          enrollment.academic_year_id,
          month,
        ]
      ),
    ]);

    const otherEnrollmentsWithAttendance = fullDay.rows.length || periodWise.rows.length
      ? { rows: [] as OtherEnrollmentAttendance[] }
      : await db.query<OtherEnrollmentAttendance>(
        `
          SELECT
            enrollment.id AS enrollment_id,
            institution.name AS institution_name,
            program.title AS program_name,
            section.name AS section_name,
            academic_year.name AS academic_year_name,
            COUNT(DISTINCT full_attendance.attendance_session_id)::int AS full_day_count,
            COUNT(DISTINCT period_attendance.id)::int AS period_count
          FROM student_enrollments enrollment
          INNER JOIN institution_profiles institution
            ON institution.id = enrollment.institution_id
          INNER JOIN institution_programs program
            ON program.id = enrollment.program_id
          LEFT JOIN sections section
            ON section.id = enrollment.section_id
          INNER JOIN academic_years academic_year
            ON academic_year.id = enrollment.academic_year_id
          LEFT JOIN attendance_sessions full_session
            ON full_session.institution_id = enrollment.institution_id
           AND full_session.program_id = enrollment.program_id
           AND full_session.section_id IS NOT DISTINCT FROM enrollment.section_id
           AND full_session.academic_year_id = enrollment.academic_year_id
           AND full_session.attendance_mode = 'FULL_DAY'
           AND to_char(full_session.attendance_date, 'YYYY-MM') = $2
          LEFT JOIN student_attendance full_attendance
            ON full_attendance.attendance_session_id = full_session.id
           AND full_attendance.student_id = enrollment.student_id
           AND COALESCE(full_attendance.is_deleted, FALSE) = FALSE
          LEFT JOIN attendance_sessions period_session
            ON period_session.institution_id = enrollment.institution_id
           AND period_session.program_id = enrollment.program_id
           AND period_session.section_id IS NOT DISTINCT FROM enrollment.section_id
           AND period_session.academic_year_id = enrollment.academic_year_id
           AND period_session.attendance_mode = 'PERIOD_WISE'
           AND to_char(period_session.attendance_date, 'YYYY-MM') = $2
          LEFT JOIN student_period_attendance period_attendance
            ON period_attendance.attendance_session_id = period_session.id
           AND period_attendance.student_id = enrollment.student_id
           AND COALESCE(period_attendance.is_deleted, FALSE) = FALSE
          WHERE enrollment.student_id = $1
            AND enrollment.id <> $3
            AND enrollment.status = 'active'
            AND COALESCE(enrollment.is_deleted, FALSE) = FALSE
          GROUP BY
            enrollment.id,
            institution.name,
            program.title,
            section.name,
            academic_year.name
          HAVING COUNT(DISTINCT full_attendance.attendance_session_id) > 0
              OR COUNT(DISTINCT period_attendance.id) > 0
          ORDER BY institution.name ASC, program.title ASC, section.name ASC
        `,
        [enrollment.student_id, month, enrollment.id]
      );

    const fullDayStats = countStatuses(fullDay.rows);
    const periodStats = countStatuses(periodWise.rows);

    return NextResponse.json({
      scope: enrollment,
      month,
      sessionMonthRange: {
        from: startMonth,
        to: endMonth,
      },
      fullDay: fullDay.rows,
      periodWise: periodWise.rows,
      modeDates: {
        fullDay: fullDayDates.rows,
        periodWise: periodWiseDates.rows,
      },
      otherEnrollmentsWithAttendance: otherEnrollmentsWithAttendance.rows,
      stats: {
        fullDay: { ...fullDayStats, percentage: percentage(fullDayStats.present, fullDayStats.total) },
        periodWise: { ...periodStats, percentage: percentage(periodStats.present, periodStats.total) },
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
