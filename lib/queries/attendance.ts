import type { Pool } from "pg";
import { assertProgramSectionSubjectYear, getProgramScope } from "@/lib/queries/timetable";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import { isPlatformFullAccess, type PermissionUser } from "@/lib/auth/permissions";

export type AttendanceStatus = "PRESENT" | "ABSENT" | "LEAVE" | "LATE";

type Queryable = Pick<Pool, "query">;

export function normalizeStatus(value: unknown): AttendanceStatus {
  if (value === "ABSENT" || value === "LEAVE" || value === "LATE") return value;
  return "PRESENT";
}

export function dayOfWeekFromDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Select a valid attendance date");
  }
  const value = new Date(`${date}T00:00:00`).getDay();
  if (!Number.isInteger(value)) {
    throw new Error("Select a valid attendance date");
  }
  return value === 0 ? 7 : value;
}

export async function assertAttendanceScope(
  db: Queryable,
  user: PermissionUser,
  input: { programId: number; sectionId?: number | null; academicYearId: number }
) {
  const program = await getProgramScope(db, input.programId);
  if (!program) throw new Error("Program not found");
  assertCanAccessInstitution(user, program.institution_id);
  if (input.sectionId) {
    await assertProgramSectionSubjectYear(db, {
      programId: input.programId,
      sectionId: input.sectionId,
      academicYearId: input.academicYearId,
    });
    return program;
  }

  const scope = await db.query<{ year_exists: boolean; has_sections: boolean }>(
    `
      SELECT
        EXISTS (
          SELECT 1
          FROM academic_years ay
          WHERE ay.id = $2
            AND ay.institution_id = $3
            AND COALESCE(ay.is_deleted, FALSE) = FALSE
        ) AS year_exists,
        EXISTS (
          SELECT 1
          FROM program_sections
          WHERE program_id = $1
        ) AS has_sections
    `,
    [input.programId, input.academicYearId, program.institution_id]
  );
  if (!scope.rows[0]?.year_exists) {
    throw new Error("Academic year must belong to the selected program institution");
  }
  if (scope.rows[0]?.has_sections) {
    throw new Error("Section is required for this program");
  }
  return program;
}

export async function assertCanMarkAttendance(
  db: Queryable,
  user: PermissionUser,
  input: {
    programId: number;
    sectionId?: number | null;
    academicYearId: number;
    date: string;
    mode: "FULL_DAY" | "PERIOD_WISE";
    slotIds?: number[];
  }
) {
  if (isPlatformFullAccess(user) || user.role_codes.includes("platform_admin") || user.role_codes.includes("institution_admin")) {
    return;
  }

  const classTeacher = await db.query<{ allowed: number }>(
    `
      SELECT 1 AS allowed
      FROM program_section_class_teachers
      WHERE program_id = $1
        AND section_id IS NOT DISTINCT FROM $2::int
        AND academic_year_id = $3
        AND teacher_id = $4
      LIMIT 1
    `,
    [input.programId, input.sectionId ?? null, input.academicYearId, user.id]
  );
  if (classTeacher.rows.length) return;

  if (input.mode === "FULL_DAY") {
    throw new Error("You are not the class teacher of this section");
  }

  const slotIds = Array.from(new Set((input.slotIds ?? []).filter((id) => Number.isInteger(id) && id > 0)));
  if (!slotIds.length) {
    throw new Error("Select a period assigned to you for this date");
  }

  const subjectTeacher = await db.query<{ slot_id: number }>(
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
        AND te.slot_id = ANY($5::int[])
        AND COALESCE(te.teacher_id, pst.teacher_id) = $6
    `,
    [
      input.programId,
      input.sectionId ?? null,
      input.academicYearId,
      dayOfWeekFromDate(input.date),
      slotIds,
      user.id,
    ]
  );
  const allowedSlotIds = new Set(subjectTeacher.rows.map((row) => Number(row.slot_id)));
  if (slotIds.some((slotId) => !allowedSlotIds.has(slotId))) {
    throw new Error("You can mark attendance only for periods assigned to you in this section");
  }
}

export async function getEnrolledStudents(
  db: Queryable,
  input: { institutionId: number; programId: number; sectionId?: number | null; academicYearId: number }
) {
  const result = await db.query<{
    student_id: number;
    user_id: number;
    full_name: string;
    email: string | null;
    admission_number: string | null;
    roll_number: string | null;
  }>(
    `
      SELECT
        sp.id AS student_id,
        u.id AS user_id,
        u.full_name,
        u.email,
        sp.admission_number,
        se.roll_number
      FROM student_enrollments se
      INNER JOIN institution_profiles ip
        ON ip.id = se.institution_id
       AND ip.is_active = TRUE
       AND COALESCE(ip.is_deleted, FALSE) = FALSE
      INNER JOIN student_profiles sp ON sp.id = se.student_id
      INNER JOIN users u ON u.id = sp.user_id
      WHERE se.institution_id = $1
        AND se.academic_year_id = $2
        AND se.status = 'active'
        AND COALESCE(se.is_deleted, FALSE) = FALSE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
        AND (
          ($3::int IS NOT NULL AND se.program_id = $4 AND se.section_id = $3)
          OR (
            $3::int IS NULL
            AND (
              se.program_id = $4
              OR se.class_category_id IN (
                SELECT category_id
                FROM program_categories
                WHERE program_id = $4
              )
            )
          )
        )
      ORDER BY
        CASE WHEN se.roll_number ~ '^[0-9]+$' THEN se.roll_number::int END NULLS LAST,
        se.roll_number ASC,
        u.full_name ASC
    `,
    [input.institutionId, input.academicYearId, input.sectionId, input.programId]
  );

  return result.rows;
}
