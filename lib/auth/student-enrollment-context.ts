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
        institution.name AS institution_name,
        enrollment.program_id,
        program.title AS program_name,
        enrollment.section_id,
        section.name AS section_name,
        enrollment.academic_year_id,
        academic_year.name AS academic_year_name,
        academic_year.start_date AS academic_year_start_date,
        academic_year.end_date AS academic_year_end_date
      FROM student_profiles student
      INNER JOIN student_enrollments enrollment
        ON enrollment.student_id = student.id
       AND COALESCE(enrollment.is_deleted, FALSE) = FALSE
      INNER JOIN institution_profiles institution
        ON institution.id = enrollment.institution_id
       AND institution.is_active = TRUE
       AND COALESCE(institution.is_deleted, FALSE) = FALSE
      INNER JOIN institution_programs program
        ON program.id = enrollment.program_id
       AND program.institution_id = enrollment.institution_id
       AND COALESCE(program.is_deleted, FALSE) = FALSE
      LEFT JOIN sections section ON section.id = enrollment.section_id
      INNER JOIN academic_years academic_year
        ON academic_year.id = enrollment.academic_year_id
       AND academic_year.institution_id = enrollment.institution_id
       AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
      WHERE student.user_id = $1
        AND (
          academic_year.id = institution.default_academic_year_id
          OR academic_year.start_date <= CURRENT_DATE
        )
        AND (
          enrollment.status = 'active'
          OR (
            academic_year.start_date <= CURRENT_DATE
            AND academic_year.id <> institution.default_academic_year_id
            AND (
              EXISTS (
                SELECT 1
                FROM student_assignments student_assignment
                INNER JOIN assignments assignment
                  ON assignment.id = student_assignment.assignment_id
                 AND assignment.academic_year_id = enrollment.academic_year_id
                 AND COALESCE(assignment.is_deleted, FALSE) = FALSE
                WHERE student_assignment.student_id = enrollment.student_id
                  AND student_assignment.enrollment_id = enrollment.id
                  AND COALESCE(student_assignment.is_deleted, FALSE) = FALSE
              )
              OR EXISTS (
                SELECT 1
                FROM student_practice_exam_attempts attempt
                INNER JOIN practice_exams exam
                  ON exam.id = attempt.practice_exam_id
                 AND exam.academic_year_id = enrollment.academic_year_id
                 AND COALESCE(exam.is_deleted, FALSE) = FALSE
                WHERE attempt.student_id = enrollment.student_id
                  AND attempt.enrollment_id = enrollment.id
                  AND COALESCE(attempt.is_deleted, FALSE) = FALSE
              )
              OR EXISTS (
                SELECT 1
                FROM student_id_cards card
                WHERE card.student_id = enrollment.student_id
                  AND card.enrollment_id = enrollment.id
                  AND card.academic_year_id = enrollment.academic_year_id
                  AND COALESCE(card.is_deleted, FALSE) = FALSE
              )
              OR EXISTS (
                SELECT 1
                FROM student_fee_payments payment
                WHERE payment.student_profile_id = enrollment.student_id
                  AND payment.enrollment_id = enrollment.id
                  AND payment.academic_year_id = enrollment.academic_year_id
                  AND payment.status IN ('paid', 'pending', 'rejected')
              )
              OR EXISTS (
                SELECT 1
                FROM institution_generated_documents document
                WHERE document.reference_id = enrollment.student_id
                  AND document.enrollment_id = enrollment.id
                  AND document.academic_year_id = enrollment.academic_year_id
                  AND COALESCE(document.is_deleted, FALSE) = FALSE
              )
            )
          )
        )
      ORDER BY
        CASE WHEN enrollment.academic_year_id = institution.default_academic_year_id THEN 0 ELSE 1 END,
        CASE WHEN enrollment.status = 'active' THEN 0 ELSE 1 END,
        CASE WHEN CURRENT_DATE BETWEEN academic_year.start_date AND academic_year.end_date THEN 0 ELSE 1 END,
        institution.name,
        program.title,
        section.name NULLS LAST,
        enrollment.id
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
        institution.name AS institution_name,
        enrollment.program_id,
        program.title AS program_name,
        enrollment.section_id,
        section.name AS section_name,
        enrollment.academic_year_id,
        academic_year.name AS academic_year_name,
        academic_year.start_date AS academic_year_start_date,
        academic_year.end_date AS academic_year_end_date
      FROM student_guardians guardian
      INNER JOIN student_profiles student
        ON student.id = guardian.student_id
      INNER JOIN student_enrollments enrollment
        ON enrollment.student_id = student.id
       AND COALESCE(enrollment.is_deleted, FALSE) = FALSE
      INNER JOIN institution_profiles institution
        ON institution.id = enrollment.institution_id
       AND institution.is_active = TRUE
       AND COALESCE(institution.is_deleted, FALSE) = FALSE
      INNER JOIN institution_programs program
        ON program.id = enrollment.program_id
       AND program.institution_id = enrollment.institution_id
       AND COALESCE(program.is_deleted, FALSE) = FALSE
      LEFT JOIN sections section ON section.id = enrollment.section_id
      INNER JOIN academic_years academic_year
        ON academic_year.id = enrollment.academic_year_id
       AND academic_year.institution_id = enrollment.institution_id
       AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
      WHERE guardian.guardian_user_id = $1
        AND COALESCE(guardian.is_deleted, FALSE) = FALSE
        AND ($2::int IS NULL OR student.id = $2)
        AND (
          academic_year.id = institution.default_academic_year_id
          OR academic_year.start_date <= CURRENT_DATE
        )
        AND (
          enrollment.status = 'active'
          OR (
            academic_year.start_date <= CURRENT_DATE
            AND academic_year.id <> institution.default_academic_year_id
            AND (
              EXISTS (
                SELECT 1
                FROM student_assignments student_assignment
                INNER JOIN assignments assignment
                  ON assignment.id = student_assignment.assignment_id
                 AND assignment.academic_year_id = enrollment.academic_year_id
                 AND COALESCE(assignment.is_deleted, FALSE) = FALSE
                WHERE student_assignment.student_id = enrollment.student_id
                  AND student_assignment.enrollment_id = enrollment.id
                  AND COALESCE(student_assignment.is_deleted, FALSE) = FALSE
              )
              OR EXISTS (
                SELECT 1
                FROM student_practice_exam_attempts attempt
                INNER JOIN practice_exams exam
                  ON exam.id = attempt.practice_exam_id
                 AND exam.academic_year_id = enrollment.academic_year_id
                 AND COALESCE(exam.is_deleted, FALSE) = FALSE
                WHERE attempt.student_id = enrollment.student_id
                  AND attempt.enrollment_id = enrollment.id
                  AND COALESCE(attempt.is_deleted, FALSE) = FALSE
              )
              OR EXISTS (
                SELECT 1
                FROM student_id_cards card
                WHERE card.student_id = enrollment.student_id
                  AND card.enrollment_id = enrollment.id
                  AND card.academic_year_id = enrollment.academic_year_id
                  AND COALESCE(card.is_deleted, FALSE) = FALSE
              )
              OR EXISTS (
                SELECT 1
                FROM student_fee_payments payment
                WHERE payment.student_profile_id = enrollment.student_id
                  AND payment.enrollment_id = enrollment.id
                  AND payment.academic_year_id = enrollment.academic_year_id
                  AND payment.status IN ('paid', 'pending', 'rejected')
              )
              OR EXISTS (
                SELECT 1
                FROM institution_generated_documents document
                WHERE document.reference_id = enrollment.student_id
                  AND document.enrollment_id = enrollment.id
                  AND document.academic_year_id = enrollment.academic_year_id
                  AND COALESCE(document.is_deleted, FALSE) = FALSE
              )
            )
          )
        )
      ORDER BY
        CASE WHEN student.id = $2 THEN 0 ELSE 1 END,
        guardian.is_primary DESC,
        CASE WHEN enrollment.academic_year_id = institution.default_academic_year_id THEN 0 ELSE 1 END,
        CASE WHEN enrollment.status = 'active' THEN 0 ELSE 1 END,
        CASE WHEN CURRENT_DATE BETWEEN academic_year.start_date AND academic_year.end_date THEN 0 ELSE 1 END,
        institution.name,
        program.title,
        section.name NULLS LAST,
        enrollment.id
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
          AND COALESCE(guardian.is_deleted, FALSE) = FALSE
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
  if ((roleCodes.includes("parent") || roleCodes.includes("guardian")) && !roleCodes.includes("student")) {
    const url = new URL(req.url);
    const requestedChildId = Number(url.searchParams.get(ACTIVE_CHILD_QUERY_PARAM));
    const childStudentId = Number.isInteger(requestedChildId) && requestedChildId > 0
      ? requestedChildId
      : null;
    const contexts = await getParentChildEnrollmentContexts(db, userId, childStudentId);

    const requestedId = Number(req.headers.get(ACTIVE_STUDENT_ENROLLMENT_HEADER));
    if (Number.isInteger(requestedId) && requestedId > 0) {
      const selected = contexts.find((context) => Number(context.id) === requestedId);
      if (selected) return selected;
    }

    if (childStudentId && contexts.length === 0) {
      const canAccessChild = await parentCanAccessChild(db, userId, childStudentId);
      if (!canAccessChild) throw new Error("Forbidden: Invalid child context");
    }
    return contexts[0] ?? null;
  }

  const contexts = await getStudentEnrollmentContexts(db, userId);
  const requestedId = Number(req.headers.get(ACTIVE_STUDENT_ENROLLMENT_HEADER));
  if (Number.isInteger(requestedId) && requestedId > 0) {
    const selected = contexts.find((context) => Number(context.id) === requestedId);
    if (selected) return selected;
  }
  return contexts[0] ?? null;
}
