import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { resolveStudentEnrollmentContext } from "@/lib/auth/student-enrollment-context";

type CalendarEventRow = {
  id: string | number;
  institution_id: string | number;
  institution_name: string;
  title: string;
  description: string | null;
  event_type: string;
  start_date: string | Date;
  end_date: string | Date;
  color: string | null;
};

type StudentInstitutionRow = {
  institution_id: string | number;
  institution_name: string | null;
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

function parseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function serializeEvent(row: CalendarEventRow) {
  return {
    id: Number(row.id),
    institution_id: Number(row.institution_id),
    institution_name: row.institution_name,
    title: row.title,
    description: row.description,
    event_type: row.event_type,
    start_date: row.start_date,
    end_date: row.end_date,
    color: row.color,
  };
}

function getSessionStudentInstitutions(
  currentUser: Awaited<ReturnType<typeof getAuthenticatedUser>>
) {
  const unique = new Map<number, { id: number; name: string }>();

  for (const membership of currentUser.memberships ?? []) {
    if (membership.role_code !== "student") continue;
    if (!membership.institution_id) continue;
    unique.set(membership.institution_id, {
      id: membership.institution_id,
      name: membership.institution_name ?? `Institution #${membership.institution_id}`,
    });
  }

  return unique;
}

export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const canView =
      hasPermission(currentUser, "student.myinstitution.calendar.view") ||
      (
        currentUser.role_codes.includes("parent") &&
        hasPermission(currentUser, "parent.childinstitution.calendar.view")
      );
    if (!canView) {
      throw new Error("Forbidden: Admin access required");
    }
    const activeEnrollment = await resolveStudentEnrollmentContext(db, req, currentUser.id, currentUser.role_codes);

    const candidateInstitutions = getSessionStudentInstitutions(currentUser);
    if (activeEnrollment) {
      candidateInstitutions.set(Number(activeEnrollment.institution_id), {
        id: Number(activeEnrollment.institution_id),
        name: activeEnrollment.institution_name ?? `Institution #${activeEnrollment.institution_id}`,
      });
    }

    const studentInstitutions = await db.query<StudentInstitutionRow>(
      `
        WITH student_profile AS (
          SELECT id
          FROM student_profiles
          WHERE user_id = $1
          LIMIT 1
        ),
        enrolled_institutions AS (
          SELECT DISTINCT se.institution_id
          FROM student_enrollments se
          INNER JOIN student_profile sp ON sp.id = se.student_id
          WHERE se.status = 'active'
        ),
        membership_institutions AS (
          SELECT DISTINCT im.institution_id
          FROM institution_memberships im
          INNER JOIN roles student_role ON student_role.id = im.role_id
          WHERE im.user_id = $1
            AND student_role.code = 'student'
            AND im.is_active = TRUE
        )
        SELECT DISTINCT ip.id AS institution_id, ip.name AS institution_name
        FROM (
          SELECT institution_id FROM enrolled_institutions
          UNION
          SELECT institution_id FROM membership_institutions
        ) source
        INNER JOIN institution_profiles ip
          ON ip.id = source.institution_id
         AND ip.is_active = TRUE
         AND COALESCE(ip.is_deleted, FALSE) = FALSE
        ORDER BY ip.name ASC
      `,
      [currentUser.id]
    );

    for (const row of studentInstitutions.rows) {
      const id = Number(row.institution_id);
      if (!Number.isInteger(id) || id <= 0) continue;
      candidateInstitutions.set(id, {
        id,
        name: row.institution_name ?? `Institution #${id}`,
      });
    }

    const allowedInstitutions = Array.from(candidateInstitutions.values())
      .filter((institution) => !activeEnrollment || institution.id === Number(activeEnrollment.institution_id))
      .sort((a, b) => a.name.localeCompare(b.name));

    if (allowedInstitutions.length === 0) {
      return NextResponse.json({
        data: [],
        institutions: [],
        stats: { total: 0, holidays: 0, notices: 0 },
      });
    }

    const url = new URL(req.url);
    const start = parseDate(url.searchParams.get("start"));
    const end = parseDate(url.searchParams.get("end"));
    const institutionIds = allowedInstitutions.map((institution) => institution.id);
    const values: unknown[] = [institutionIds];
    const conditions = [
      "events.institution_id = ANY($1::int[])",
      "COALESCE(events.is_deleted, FALSE) = FALSE",
    ];

    if (start) {
      values.push(start);
      conditions.push(`events.end_date >= $${values.length}`);
    }
    if (end) {
      values.push(end);
      conditions.push(`events.start_date <= $${values.length}`);
    }

    const events = await db.query<CalendarEventRow>(
      `
        SELECT events.id,
               events.institution_id,
               ip.name AS institution_name,
               events.title,
               events.description,
               events.event_type,
               to_char(events.start_date, 'YYYY-MM-DD"T"HH24:MI:SS') AS start_date,
               to_char(events.end_date, 'YYYY-MM-DD"T"HH24:MI:SS') AS end_date,
               events.color
        FROM institution_calendar_events events
        INNER JOIN institution_profiles ip
          ON ip.id = events.institution_id
         AND ip.is_active = TRUE
         AND COALESCE(ip.is_deleted, FALSE) = FALSE
        WHERE ${conditions.join(" AND ")}
        ORDER BY events.start_date ASC, events.id ASC
      `,
      values
    );

    const data = events.rows.map(serializeEvent);
    return NextResponse.json({
      data,
      institutions: allowedInstitutions,
      stats: {
        total: data.length,
        holidays: data.filter((event) => event.event_type === "HOLIDAY").length,
        notices: data.filter((event) => event.event_type === "NOTICE").length,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
