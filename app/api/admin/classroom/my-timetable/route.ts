import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { resolveStudentEnrollmentContext } from "@/lib/auth/student-enrollment-context";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Unauthorized" || message === "User not found" ? 401 :
    message === "Forbidden: Timetable access required" ||
    message === "Forbidden: Invalid institution context" ||
    message === "Forbidden: Invalid child context" ? 403 :
    400;
  return NextResponse.json({ error: message }, { status });
}

function getRequestedInstitutionId(req: Request) {
  const raw = new URL(req.url).searchParams.get("institutionId");
  const institutionId = raw ? Number(raw) : null;
  return Number.isInteger(institutionId) && institutionId > 0 ? institutionId : null;
}

async function loadTeacherTimetable(req: Request, teacherId: number) {
  const requestedInstitutionId = getRequestedInstitutionId(req);
  const memberships = await db.query<{
    institution_id: number;
    institution_name: string;
  }>(
    `
      SELECT im.institution_id, institution.name AS institution_name
      FROM institution_memberships im
      INNER JOIN roles role
        ON role.id = im.role_id
       AND role.code = 'teacher'
      INNER JOIN institution_profiles institution
        ON institution.id = im.institution_id
       AND institution.is_active = TRUE
       AND COALESCE(institution.is_deleted, FALSE) = FALSE
      WHERE im.user_id = $1
        AND im.is_active = TRUE
        AND COALESCE(im.is_deleted, FALSE) = FALSE
      ORDER BY institution.name ASC
    `,
    [teacherId]
  );

  const scope = requestedInstitutionId
    ? memberships.rows.find((membership) => membership.institution_id === requestedInstitutionId)
    : memberships.rows[0];

  if (requestedInstitutionId && !scope) throw new Error("Forbidden: Invalid institution context");
  if (!scope) return { data: null, slots: [], entries: [] };

  const [slots, entries] = await Promise.all([
    db.query(
      `
        SELECT id, slot_name, slot_order, start_time, end_time, slot_type
        FROM timetable_slots
        WHERE institution_id = $1
          AND is_active = TRUE
        ORDER BY slot_order ASC, start_time ASC
      `,
      [scope.institution_id]
    ),
    db.query(
      `
        SELECT
          entry.day_of_week,
          entry.slot_id,
          entry.subject_id,
          subject.name AS subject_name,
          entry.teacher_id,
          teacher.full_name AS teacher_name,
          entry.program_id,
          program.title AS program_name,
          entry.section_id,
          section.name AS section_name,
          entry.academic_year_id,
          academic_year.name AS academic_year_name
        FROM timetable_entries entry
        INNER JOIN institution_programs program
          ON program.id = entry.program_id
         AND program.institution_id = $1
         AND COALESCE(program.is_deleted, FALSE) = FALSE
        INNER JOIN academic_years academic_year
          ON academic_year.id = entry.academic_year_id
         AND academic_year.institution_id = $1
         AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
        INNER JOIN subjects subject ON subject.id = entry.subject_id
        LEFT JOIN sections section ON section.id = entry.section_id
        LEFT JOIN users teacher ON teacher.id = entry.teacher_id
        WHERE entry.teacher_id = $2
        ORDER BY
          CASE WHEN CURRENT_DATE BETWEEN academic_year.start_date AND academic_year.end_date THEN 0 ELSE 1 END,
          entry.day_of_week ASC,
          entry.slot_id ASC,
          program.title ASC,
          section.name ASC
      `,
      [scope.institution_id, teacherId]
    ),
  ]);

  return {
    data: {
      role: "teacher",
      institution_id: scope.institution_id,
      institution_name: scope.institution_name,
      teacher_id: teacherId,
      teacher_name: entries.rows[0]?.teacher_name ?? null,
    },
    slots: slots.rows,
    entries: entries.rows,
  };
}

export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const requestedInstitutionId = getRequestedInstitutionId(req);
    const canViewStudentTimetable =
      currentUser.role_codes.includes("student") &&
      hasPermission(currentUser, "student.myclassroom.timetable.view", { institutionId: requestedInstitutionId });
    const canViewTeacherTimetable =
      currentUser.role_codes.includes("teacher") &&
      hasPermission(currentUser, "teacher.myclassroom.timetable.view", { institutionId: requestedInstitutionId });
    const canViewParentRecords =
      currentUser.role_codes.includes("parent") &&
      hasPermission(currentUser, "parent.childclassroom.timetable.view");

    if (!canViewStudentTimetable && !canViewTeacherTimetable && !canViewParentRecords) {
      throw new Error("Forbidden: Timetable access required");
    }

    if (canViewTeacherTimetable && !canViewStudentTimetable && !canViewParentRecords) {
      const teacherTimetable = await loadTeacherTimetable(req, currentUser.id);
      return NextResponse.json(teacherTimetable);
    }

    const scope = await resolveStudentEnrollmentContext(db, req, currentUser.id, currentUser.role_codes);
    if (!scope) {
      return NextResponse.json({ data: null, slots: [], entries: [] });
    }

    const [slots, entries] = await Promise.all([
      db.query(
        `
          SELECT id, slot_name, slot_order, start_time, end_time, slot_type
          FROM timetable_slots
          WHERE institution_id = $1
            AND is_active = TRUE
          ORDER BY slot_order ASC, start_time ASC
        `,
        [scope.institution_id]
      ),
      db.query(
        `
          SELECT
            entry.day_of_week,
            entry.slot_id,
            entry.subject_id,
            subject.name AS subject_name,
            entry.teacher_id,
            teacher.full_name AS teacher_name
          FROM timetable_entries entry
          INNER JOIN subjects subject ON subject.id = entry.subject_id
          LEFT JOIN users teacher ON teacher.id = entry.teacher_id
          WHERE entry.program_id = $1
            AND entry.section_id = $2
            AND entry.academic_year_id = $3
          ORDER BY entry.day_of_week ASC, entry.slot_id ASC
        `,
        [scope.program_id, scope.section_id, scope.academic_year_id]
      ),
    ]);

    return NextResponse.json({
      data: scope ? { ...scope, role: "student" } : null,
      slots: slots.rows,
      entries: entries.rows,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
