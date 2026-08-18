import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";
import { ensurePracticeExamSchema } from "@/lib/queries/practice-exams";

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Unauthorized" || message === "User not found" ? 401 :
    message === "Forbidden: Admin access required" ? 403 :
    400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    await ensurePracticeExamSchema();

    const url = new URL(req.url);
    const institutionId = Number(url.searchParams.get("institutionId"));
    if (!Number.isInteger(institutionId) || institutionId <= 0) {
      return NextResponse.json({ data: [], total: 0, pageCount: 0 });
    }

    assertCanAccessInstitution(currentUser, institutionId);
    if (
      !hasPermission(currentUser, "managestudents.practice.view", {
        institutionId,
      })
    ) {
      throw new Error("Forbidden: Admin access required");
    }

    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit"),
    );
    const search = url.searchParams.get("search")?.trim() ?? "";
    const like = `%${search}%`;

    const where = `
      scope_enrollment.institution_id = $1
      AND COALESCE(exam.is_deleted, FALSE) = FALSE
      AND COALESCE(attempt.is_deleted, FALSE) = FALSE
      AND ($2 = ''
        OR exam.title ILIKE $3
        OR student_user.full_name ILIKE $3
        OR COALESCE(student_user.email, '') ILIKE $3
        OR COALESCE(student.admission_number, '') ILIKE $3
        OR COALESCE(scope_enrollment.roll_number, '') ILIKE $3
      )
    `;

    const [dataResult, countResult] = await Promise.all([
      db.query(
        `
          SELECT
            attempt.id,
            attempt.practice_exam_id,
            attempt.student_id,
            attempt.attempt_no,
            attempt.exam_version,
            attempt.status,
            attempt.submitted_at,
            attempt.obtained_marks::float8 AS obtained_marks,
            attempt.percentage::float8 AS percentage,
            attempt.correct_answers,
            attempt.wrong_answers,
            attempt.unanswered,
            exam.title,
            exam.total_marks::float8 AS total_marks,
            exam.duration_minutes,
            ip.name AS institution_name,
            student_user.full_name AS student_name,
            student_user.email AS student_email,
            student_user.avatar_url AS student_avatar_url,
            student.admission_number,
            scope_enrollment.roll_number,
            COUNT(answer.id)::int AS answered_count
          FROM student_practice_exam_attempts attempt
          INNER JOIN practice_exams exam ON exam.id = attempt.practice_exam_id
          INNER JOIN LATERAL (
            SELECT se.institution_id, se.roll_number
            FROM student_enrollments se
            WHERE se.student_id = attempt.student_id
              AND se.institution_id = $1
              AND se.status = 'active'
              AND COALESCE(se.is_deleted, FALSE) = FALSE
            ORDER BY se.is_current DESC NULLS LAST, se.updated_at DESC NULLS LAST, se.id DESC
            LIMIT 1
          ) scope_enrollment ON TRUE
          INNER JOIN institution_profiles ip
            ON ip.id = scope_enrollment.institution_id
           AND ip.is_active = TRUE
           AND COALESCE(ip.is_deleted, FALSE) = FALSE
          INNER JOIN student_profiles student ON student.id = attempt.student_id
          INNER JOIN users student_user ON student_user.id = student.user_id
          LEFT JOIN student_practice_exam_answers answer
            ON answer.attempt_id = attempt.id
          WHERE ${where}
          GROUP BY
            attempt.id,
            exam.id,
            ip.name,
            student_user.full_name,
            student_user.email,
            student_user.avatar_url,
            student.admission_number,
            scope_enrollment.roll_number
          ORDER BY attempt.submitted_at DESC NULLS LAST, attempt.id DESC
          LIMIT $4 OFFSET $5
        `,
        [institutionId, search, like, limit, offset],
      ),
      db.query<{ count: number }>(
        `
          SELECT COUNT(DISTINCT attempt.id)::int AS count
          FROM student_practice_exam_attempts attempt
          INNER JOIN practice_exams exam ON exam.id = attempt.practice_exam_id
          INNER JOIN student_profiles student ON student.id = attempt.student_id
          INNER JOIN LATERAL (
            SELECT se.institution_id, se.roll_number
            FROM student_enrollments se
            WHERE se.student_id = attempt.student_id
              AND se.institution_id = $1
              AND se.status = 'active'
              AND COALESCE(se.is_deleted, FALSE) = FALSE
            ORDER BY se.is_current DESC NULLS LAST, se.updated_at DESC NULLS LAST, se.id DESC
            LIMIT 1
          ) scope_enrollment ON TRUE
          INNER JOIN users student_user ON student_user.id = student.user_id
          WHERE ${where}
        `,
        [institutionId, search, like],
      ),
    ]);

    const total = Number(countResult.rows[0]?.count ?? 0);
    return NextResponse.json({
      data: dataResult.rows,
      total,
      pageCount: getPageCount(total, limit),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
