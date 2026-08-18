import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureAssignmentTemplateSchema } from "@/lib/queries/assignment-templates";
import { ensureAssignmentQuestionsMaterialized } from "../../utils";
import { resolveStudentEnrollmentContext } from "@/lib/auth/student-enrollment-context";

type Context = { params: Promise<{ id: string }> };

type AnswerPayload = {
  question_id?: unknown;
  selected_option_id?: unknown;
  answer_text?: unknown;
  answer_image_url?: unknown;
};

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Unauthorized" || message === "User not found" ? 401 :
    message === "Forbidden: Admin access required" ? 403 :
    message === "Assignment not found" ? 404 :
    message === "This assignment has no questions" ? 423 :
    400;
  return NextResponse.json({ error: message }, { status });
}

function parsePositiveInt(value: unknown) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

async function getStudentId(userId: number) {
  const result = await db.query<{ id: number }>(
    `SELECT id FROM student_profiles WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return result.rows[0]?.id ?? null;
}

async function canAccessAssignment(assignmentId: number, studentId: number, enrollmentId: number) {
  const result = await db.query(
    `
      SELECT 1
      FROM student_enrollments se
      INNER JOIN assignments a
        ON a.institution_id = se.institution_id
       AND a.status = 'active'
       AND COALESCE(a.is_deleted, FALSE) = FALSE
       AND a.academic_year_id = se.academic_year_id
      INNER JOIN institution_profiles ip
         ON ip.id = a.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      LEFT JOIN assignment_targets target ON target.assignment_id = a.id
      WHERE se.student_id = $1
        AND se.id = $3
        AND se.status = 'active'
        AND COALESCE(se.is_deleted, FALSE) = FALSE
        AND a.id = $2
        AND (
          target.target_type IS NULL
          OR target.target_type = 'INSTITUTION'
          OR (
            target.target_type = 'PROGRAM'
            AND (
              se.program_id = target.target_id
              OR se.class_category_id IN (
                SELECT category_id FROM program_categories WHERE program_id = target.target_id
              )
            )
          )
          OR (
            target.target_type = 'SECTION'
            AND target.program_id IS NOT NULL
            AND se.program_id = target.program_id
            AND se.section_id = target.target_id
          )
          OR (target.target_type = 'STUDENT' AND target.target_id = se.student_id)
        )
      LIMIT 1
    `,
    [studentId, assignmentId, enrollmentId]
  );
  return Boolean(result.rows[0]);
}

async function getExistingSubmissionStatus(assignmentId: number, studentId: number, enrollmentId: number) {
  const result = await db.query<{ status: string }>(
    `
      SELECT status
      FROM student_assignments
      WHERE assignment_id = $1
        AND student_id = $2
        AND enrollment_id = $3
        AND COALESCE(is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    [assignmentId, studentId, enrollmentId]
  );
  return result.rows[0]?.status?.toLowerCase() ?? null;
}

export async function POST(req: Request, context: Context) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    await ensureAssignmentTemplateSchema();
    if (
      !currentUser.role_codes.includes("student") ||
      !hasPermission(currentUser, "student.myclassroom.assignments.view")
    ) {
      throw new Error("Forbidden: Admin access required");
    }

    const { id } = await context.params;
    const assignmentId = Number(id);
    if (!Number.isInteger(assignmentId) || assignmentId <= 0) {
      throw new Error("Invalid assignment id");
    }

    const studentId = await getStudentId(currentUser.id);
    const enrollment = await resolveStudentEnrollmentContext(db, req, currentUser.id, currentUser.role_codes);
    if (!studentId || !enrollment || !(await canAccessAssignment(assignmentId, studentId, enrollment.id))) {
      throw new Error("Assignment not found");
    }
    const existingStatus = await getExistingSubmissionStatus(assignmentId, studentId, enrollment.id);
    if (existingStatus && ["submitted", "checked"].includes(existingStatus)) {
      throw new Error("This assignment has already been submitted");
    }
    await ensureAssignmentQuestionsMaterialized(db, assignmentId);

    const body = await req.json();
    const answers = Array.isArray(body.answers) ? (body.answers as AnswerPayload[]) : [];
    if (answers.length === 0) throw new Error("Answer at least one question");

    const questionIds = answers
      .map((answer) => parsePositiveInt(answer.question_id))
      .filter((value): value is number => Boolean(value));
    const questionResult = await db.query<{ id: number; question_type: string }>(
      `SELECT id, question_type FROM assignment_questions WHERE assignment_id = $1 ORDER BY display_order, id`,
      [assignmentId]
    );
    if (questionResult.rows.length === 0) {
      throw new Error("This assignment has no questions");
    }
    if (questionResult.rows.length !== new Set(questionIds).size) {
      throw new Error("One or more answers are invalid");
    }

    const questionTypes = new Map(questionResult.rows.map((row) => [row.id, row.question_type]));
    const selectedOptionIds = answers
      .map((answer) => parsePositiveInt(answer.selected_option_id))
      .filter((value): value is number => Boolean(value));
    const optionResult = selectedOptionIds.length
      ? await db.query<{ id: number; question_id: number }>(
          `
            SELECT id, question_id
            FROM assignment_question_options
            WHERE id = ANY($1::int[])
              AND question_id = ANY($2::int[])
          `,
          [selectedOptionIds, questionResult.rows.map((row) => row.id)]
        )
      : { rows: [] };
    const optionQuestionMap = new Map<number, number>(
      optionResult.rows.map((row) => [row.id, row.question_id] as const)
    );

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const studentAssignment = await client.query<{ id: number }>(
        `
          INSERT INTO student_assignments (assignment_id, student_id, enrollment_id, status, submitted_at)
          VALUES ($1, $2, $3, 'submitted', NOW())
          ON CONFLICT (assignment_id, student_id, enrollment_id)
          DO UPDATE SET status = 'submitted', submitted_at = NOW()
          WHERE student_assignments.status NOT IN ('submitted', 'checked')
          RETURNING id
        `,
        [assignmentId, studentId, enrollment.id]
      );
      if (!studentAssignment.rows[0]) {
        throw new Error("This assignment has already been submitted");
      }
      const studentAssignmentId = studentAssignment.rows[0].id;

      await client.query(`DELETE FROM student_assignment_answers WHERE student_assignment_id = $1`, [
        studentAssignmentId,
      ]);

      for (const answer of answers) {
        const questionId = parsePositiveInt(answer.question_id);
        if (!questionId || !questionTypes.has(questionId)) continue;
        const questionType = questionTypes.get(questionId);
        const selectedOptionId = parsePositiveInt(answer.selected_option_id);
        const answerText = String(answer.answer_text ?? "").trim();
        const answerImageUrl = String(answer.answer_image_url ?? "").trim();

        if ((questionType === "objective" || questionType === "true_false") && !selectedOptionId) {
          throw new Error("Select an answer for every objective question");
        }
        if (
          (questionType === "objective" || questionType === "true_false") &&
          optionQuestionMap.get(Number(selectedOptionId)) !== questionId
        ) {
          throw new Error("One or more selected answers are invalid");
        }
        if (questionType === "subjective" && !answerText && !answerImageUrl) {
          throw new Error("Write an answer or upload an image for every subjective question");
        }

        await client.query(
          `
            INSERT INTO student_assignment_answers
              (student_assignment_id, question_id, selected_option_id, answer_text, answer_image_url)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            studentAssignmentId,
            questionId,
            selectedOptionId,
            answerText || null,
            answerImageUrl || null,
          ]
        );
      }

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
