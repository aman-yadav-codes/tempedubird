import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { hasPermission } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensurePracticeExamSchema } from "@/lib/queries/practice-exams";
import { ensurePracticeExamQuestionsMaterialized } from "../../utils";
import { resolveStudentEnrollmentContext } from "@/lib/auth/student-enrollment-context";

type Context = { params: Promise<{ id: string }> };
type AnswerPayload = {
  question_id?: unknown;
  selected_option_id?: unknown;
  answer_text?: unknown;
};

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Unauthorized" || message === "User not found" ? 401 :
    message === "Forbidden: Admin access required" ? 403 :
    message === "Practice Exam not found" ? 404 :
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

async function getAccessiblePracticeExam(practiceExamId: number, studentId: number, enrollmentId: number) {
  const result = await db.query<{ version: number }>(
    `
      SELECT exam.version
      FROM student_enrollments se
      INNER JOIN practice_exams exam
        ON exam.institution_id = se.institution_id
       AND exam.status = 'active'
       AND COALESCE(exam.exam_kind, 'practice') = 'practice'
       AND COALESCE(exam.is_deleted, FALSE) = FALSE
       AND exam.academic_year_id = se.academic_year_id
      INNER JOIN institution_profiles ip
         ON ip.id = exam.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      LEFT JOIN practice_exam_targets target ON target.practice_exam_id = exam.id
      WHERE se.student_id = $1
        AND se.id = $3
        AND se.status = 'active'
        AND COALESCE(se.is_deleted, FALSE) = FALSE
        AND exam.id = $2
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
    [studentId, practiceExamId, enrollmentId]
  );
  return result.rows[0] ?? null;
}

export async function POST(req: Request, context: Context) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    await ensurePracticeExamSchema();
    if (
      !currentUser.role_codes.includes("student") ||
      !hasPermission(currentUser, "student.myclassroom.practice_exams.view")
    ) {
      throw new Error("Forbidden: Admin access required");
    }

    const { id } = await context.params;
    const practiceExamId = Number(id);
    if (!Number.isInteger(practiceExamId) || practiceExamId <= 0) {
      throw new Error("Invalid practice exam id");
    }

    const studentId = await getStudentId(currentUser.id);
    const enrollment = await resolveStudentEnrollmentContext(db, req, currentUser.id, currentUser.role_codes);
    const practiceExam = studentId
      && enrollment ? await getAccessiblePracticeExam(practiceExamId, studentId, enrollment.id)
      : null;
    if (!studentId || !practiceExam) {
      throw new Error("Practice Exam not found");
    }
    const examVersion = Number(practiceExam.version ?? 1);

    await ensurePracticeExamQuestionsMaterialized(db, practiceExamId);

    const body = await req.json();
    const answers = Array.isArray(body.answers) ? (body.answers as AnswerPayload[]) : [];
    if (answers.length === 0) throw new Error("Answer at least one question");

    const questions = await db.query<{
      id: number;
      question_type: string;
      marks: number;
      correct_option_id: number | null;
    }>(
      `
        SELECT
          q.id,
          q.question_type,
          q.marks::float8 AS marks,
          correct.id AS correct_option_id
        FROM practice_exam_questions q
        LEFT JOIN LATERAL (
          SELECT id
          FROM practice_exam_question_options option
          WHERE option.question_id = q.id
            AND option.is_correct = TRUE
          ORDER BY option.display_order, option.id
          LIMIT 1
        ) correct ON TRUE
        WHERE q.practice_exam_id = $1
        ORDER BY q.display_order, q.id
      `,
      [practiceExamId]
    );
    if (questions.rows.length === 0) throw new Error("This practice exam has no questions");

    const answerByQuestion = new Map(
      answers.map((answer) => [parsePositiveInt(answer.question_id), answer] as const)
    );
    const selectedOptionIds = answers
      .map((answer) => parsePositiveInt(answer.selected_option_id))
      .filter((value): value is number => Boolean(value));
    const optionRows = selectedOptionIds.length
      ? await db.query<{ id: number; question_id: number }>(
          `
            SELECT id, question_id
            FROM practice_exam_question_options
            WHERE id = ANY($1::int[])
          `,
          [selectedOptionIds]
        )
      : { rows: [] };
    const optionQuestionMap = new Map<number, number>(
      optionRows.rows.map((row) => [row.id, row.question_id] as const)
    );

    let correctAnswers = 0;
    let wrongAnswers = 0;
    let unanswered = 0;
    let obtainedMarks = 0;

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const attemptResult = await client.query<{ id: number }>(
        `
          INSERT INTO student_practice_exam_attempts
            (practice_exam_id, student_id, enrollment_id, attempt_no, exam_version, started_at, submitted_at, status)
          VALUES (
            $1,
            $2,
            $3,
            COALESCE((SELECT MAX(attempt_no) + 1 FROM student_practice_exam_attempts WHERE practice_exam_id = $1 AND student_id = $2 AND enrollment_id = $3), 1),
            $4,
            NOW(),
            NOW(),
            'completed'
          )
          RETURNING id
        `,
        [practiceExamId, studentId, enrollment.id, examVersion]
      );
      const attemptId = attemptResult.rows[0].id;

      for (const question of questions.rows) {
        const rawAnswer = answerByQuestion.get(question.id);
        const selectedOptionId = parsePositiveInt(rawAnswer?.selected_option_id);
        const answerText = String(rawAnswer?.answer_text ?? "").trim();
        const isObjective = question.question_type === "objective" || question.question_type === "true_false";

        if (isObjective && selectedOptionId && optionQuestionMap.get(selectedOptionId) !== question.id) {
          throw new Error("One or more selected answers are invalid");
        }

        let isCorrect: boolean | null = null;
        let marksAwarded = 0;

        if (isObjective) {
          if (!selectedOptionId) {
            unanswered += 1;
          } else if (selectedOptionId === question.correct_option_id) {
            isCorrect = true;
            marksAwarded = Number(question.marks);
            obtainedMarks += marksAwarded;
            correctAnswers += 1;
          } else {
            isCorrect = false;
            wrongAnswers += 1;
          }
        } else if (!answerText) {
          unanswered += 1;
        } else {
          isCorrect = null;
          unanswered += 1;
        }

        await client.query(
          `
            INSERT INTO student_practice_exam_answers
              (attempt_id, question_id, selected_option_id, answer_text, is_correct, marks_awarded)
            VALUES ($1, $2, $3, $4, $5, $6)
          `,
          [attemptId, question.id, selectedOptionId, answerText || null, isCorrect, marksAwarded]
        );
      }

      const totalMarks = Number(
        questions.rows.reduce((sum, question) => sum + Number(question.marks), 0).toFixed(2)
      );
      const percentage = totalMarks > 0 ? Number(((obtainedMarks / totalMarks) * 100).toFixed(2)) : 0;
      await client.query(
        `
          UPDATE student_practice_exam_attempts
          SET obtained_marks = $2,
              correct_answers = $3,
              wrong_answers = $4,
              unanswered = $5,
              percentage = $6
          WHERE id = $1
        `,
        [attemptId, obtainedMarks, correctAnswers, wrongAnswers, unanswered, percentage]
      );
      await client.query(
        `
          INSERT INTO student_practice_exam_results
            (attempt_id, student_id, enrollment_id, practice_exam_id, exam_version, total_questions, correct_answers, wrong_answers, unanswered, obtained_marks, percentage, submitted_at)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,NOW())
        `,
        [
          attemptId,
          studentId,
          enrollment.id,
          practiceExamId,
          examVersion,
          questions.rows.length,
          correctAnswers,
          wrongAnswers,
          unanswered,
          obtainedMarks,
          percentage,
        ]
      );
      await client.query("COMMIT");
      return NextResponse.json({
        success: true,
        result: {
          attempt_id: attemptId,
          total_questions: questions.rows.length,
          correct_answers: correctAnswers,
          wrong_answers: wrongAnswers,
          unanswered,
          obtained_marks: obtainedMarks,
          percentage,
          exam_version: examVersion,
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return errorResponse(error);
  }
}
