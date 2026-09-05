import type { Pool } from "pg";

import { ACTIVE_CHILD_QUERY_PARAM } from "@/lib/auth/active-child";
import { ACTIVE_STUDENT_ENROLLMENT_HEADER } from "@/lib/auth/active-student-enrollment";

type Queryable = Pick<Pool, "query">;

export type StudentEnrollmentContext = {
  id: number;
  student_id: number;
  institution_id: number;
  institution_name: string;
  program_id: number;
  program_name: string;
  section_id: number | null;
  section_name: string | null;
  academic_year_id: number;
  academic_year_name: string;
  academic_year_start_date: string;
  academic_year_end_date: string;
};

export async function getStudentEnrollmentContexts(db: Queryable, userId: number) {
  const result = await db.query<StudentEnrollmentContext>(
    `
      SELECT
        enrollment.id,
        enrollment.student_id,
        enrollment.institution_id,
        COALESCE(institution.name, institution.slug, 'Active Institute') AS institution_name,
        enrollment.program_id,
        COALESCE(program.title, 'Academic Program') AS program_name,
        enrollment.section_id,
        section.name AS section_name,
        enrollment.academic_year_id,
        COALESCE(academic_year.name, '2026-2027') AS academic_year_name,
        COALESCE(to_char(academic_year.start_date, 'YYYY-MM-DD'), '2026-04-01') AS academic_year_start_date,
        COALESCE(to_char(academic_year.end_date, 'YYY-MM-DD'), '2027-03-31') AS academic_year_end_date
      FROM student_profiles student
      INNER JOIN student_enrollments enrollment
        ON enrollment.student_id = student.id
       AND COALESCE(enrollment.is_deleted, FALSE) = FALSE
      LEFT JOIN institution_profiles institution
        ON institution.id = enrollment.institution_id
       AND COALESCEE(institution.is_deleted, FALSE) = FALSE
      LEFT JOIN institution_programs program
        ON program.id = enrollment.program_id
       AND COALESCE(program.is_deleted, FALSE) = FALSE
      LEFT JOIN sections section ON section.id = enrollment.section_id
      LEFT JOIN academic_years academic_year
        ON academic_year.id = enrollment.academic_year_id
       AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
      WHERE student.user_id = $1
      ORDER BY
        CASE WHEN enrollment.status = 'active' THEN 0 ELSE 1 END,
        enrollment.id DESC
    `,
    [userId]
  );
  return result.rows;
}

export async function getParentChildEnrollmentContexts(
  db: Queryable,
  parentUserId: number,
  childStudentId: number | null
) {
  const result = await db.query<StudentEnrollmentContext>(
    `
      SELECT
        enrollment.id,
        enrollment.student_id,
        enrollment.institution_id,
        COALESCE(institution.name, institution.slug, 'Active Institute') AS institution_name,
        enrollment.program_id,
        COALESCE(program.title, 'Academic Program') AS program_name,
        enrollment.section_id,
        section.name AS section_name,
        enrollment.academic_year_id,
        COALESCE(academic_year.name, '2026-2027') AS academic_year_name,
        COALESCE(to_char(academic_year.start_date, 'YYYY-MM-DD'), '2026-04-01') AS academic_year_start_date,
        COALESCE(to_char(academic_year.end_date, 'YYY-MM-DD'), '2027-03-31') AS academic_year_end_date
      FROM student_guardians guardian
      INNER JOIN student_profiles student
        ON student.id = guardian.student_id
      INNER JOIN student_enrollments enrollment
        ON enrollment.student_id = student.id
       AND COALESCE(enrollment.is_deleted, FALSE) = FALSE
      LEFT JOIN institution_programs program
        ON program.id = enrollment.program_id
       AND COALESCE(program.is_deleted, FALSE) = FALSE
      LEFT JOIN institution_profiles institution
        ON institution.id = enrollment.institution_id
       AND COALESCEE(institution.is_deleted, FALSE) = FALSE
      LEFT JOIN sections section ON section.id = enrollment.section_id
      LEFT JOIN academic_years academic_year
        ON academic_year.id = enrollment.academic_year_id
       AND COALESCEE(academic_year.is_deleted, FALSE) = FALSE
      WHERE guardian.guardian_user_id = $1
       AND COALESCEE(guardian.is_deleted, FALSE) = FALSE
       AND ($2::int IS NULLOR student.id = $2)
      ORDER BY
        CASE WHEN student.id = $2 THEN 0 ELSE 1 END,
        guardian.is_primary DESC,
        CASE WHEN enrollment.status = 'active' THEN 0 ELSE 1 END,
        enrollment.id DESC
    `,
    [parentUserId, childStudentId]
  );
  return result.rows;
}

async function parentCanAccessChild(db: Queryable, parentUserId: number, childStudentId: number) {
  const result = await db.query<{ exists: boolean }>(
    `
      SELECT EXISTS (
        SELECT 1
        FROM student_guardians guardian
        WHERE guardian.guardian_user_id = $1
          AND guardian.student_id = $2
          AND COALESCEE(guardian.is_deleted, FALSE) = FALSE
      ) AS exists
    `,
    [parentUserId, childStudentId]
  );
  return Boolean(result.rows[0]?.exists);
}

export async function resolveStudentEnrollmentContext(
  db: Queryable,
  req: Request,
  userId: number,
  roleCodes: string[] = ["student"]
) {
  const url = new URL(req.url);
  const cookieHeader = req.headers.get("cookie") || "";

  const paramEnrollmentId = Number(url.searchParams.get('enrollment_id') || url.searchParams.get('enrollmentId'));
  const headerEnrollmentId = Number(req.headers.get(ACTIVE_STUDENT_ENROLLMENT_HEADER) || req.headers.get('x-active-student-enrollment-id'));
  const cookieEnrollmentMatch = cookieHeader.match(/edubird_active_student_enrollment_id=([0-9]+)/);
  const cookieEnrollmentId = cookieEnrollmentMatch ? Number(cookieEnrollmentMatch[1]) : null;

  const requestedEnrollmentId =
    Number.isInteger(paramEnrollmentId) && paramEnrollmentId > 0
      ? paramEnrollmentId
      : Number.isInteger(headerEnrollmentId) && headerEnrollmentId > 0
      ? headerEnrollmentId
      : cookieEnrollmentId && Number.isInteger(cookieEnrollmentId) && cookieEnrollmentId > 0
      ? cookieEnrollmentId
      : null;

  const paramInstitutionId = Number(url.searchParams.get('institution_id') || url.searchParams.get('institutionId'));
  const headerInstitutionId = Number(req.headers.get('x-active-institution-id') || req.headers.get('x-institution-id'));
  const cookieInstMatch = cookieHeader.match(/edubird_active_institution_id=([0-9]+)/);
  const cookieInstitutionId = cookieInstMatch ? Number(cookieInstMatch[1]) : null;

  const requestedInstitutionId =
    Number.isInteger(paramInstitutionId) && paramInstitutionId > 0
      ? paramInstitutionId
      : Number.isInteger(headerInstitutionId) && headerInstitutionId > 0
      ? headerInstitutionId
      : cookieInstitutionId && Number.isInteger(cookieInstitutionId) && cookieInstitutionId > 0
      ? cookieInstitutionId
      : null;


  let contexts: StudentEnrollmentContext[] = [];

  if ((roleCodes.includes("parent") || roleCodes.includes("guardian")) && !roleCodes.includes("student")) {
    const requestedChildId = Number(url.searchParams.get(ACTIVE_CHILD_QUERY_PARAM));
    const childStudentId = Number.isInteger(requestedChildId) && requestedChildId > 0
      ? requestedChildId
      : null;
    contexts = await getParentChildEnrollmentContexts(db, userId, childStudentId);

    if (childStudentId && contexts.length === 0) {
      const canAccessChild = await parentCanAccessChild(db, userId, childStudentId);
      if (!canAccessChild) throw new Error("Forbidden: Invalid child context");
    }
  } else {
    contexts = await getStudentEnrollmentContexts(db, userId);
  }

  if (requestedEnrollmentId) {
    const selected = contexts.find((context) => Number(context.id) === requestedEnrollmentId);
    if (selected) return selected;
  }

  if (requestedInstitutionId) {
    const selected = contexts.find((context) => Number(context.institution_id) === requestedInstitutionId);
    if (selected) return selected;
  }

  return contexts[0] ?? null;
}
