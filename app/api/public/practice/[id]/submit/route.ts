import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getAuthUser } from "@/lib/auth/auth";
import { getQuestionsForTest } from "@/lib/data/practice-questions-bank";

let schemaAttemptReady = false;
async function ensureAttemptsSchema() {
  if (schemaAttemptReady) return;
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS practice_test_attempts_live (
        id SERIAL PRIMARY KEY,
        practice_test_id INTEGER,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        student_name VARCHAR(255) NOT NULL,
        student_email VARCHAR(255),
        total_questions INTEGER NOT NULL,
        correct_answers INTEGER NOT NULL,
        wrong_answers INTEGER NOT NULL,
        unanswered INTEGER NOT NULL,
        obtained_marks NUMERIC(8,2) NOT NULL,
        total_marks NUMERIC(8,2) NOT NULL,
        percentage NUMERIC(5,2) NOT NULL,
        time_taken_seconds INTEGER NOT NULL DEFAULT 0,
        answers_json JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    schemaAttemptReady = true;
  } catch (err) {
    console.error("Error creating practice_test_attempts_live table:", err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureAttemptsSchema();
    const { id: rawId } = await params;
    const testIdNum = Number(String(rawId).split("-")[0]);
    const body = await req.json();

    const authUser = await getAuthUser(req);
    const studentName = String(
      body.student_name || authUser?.full_name || "Demo Learner"
    ).trim();
    const studentEmail = String(body.student_email || authUser?.email || "").trim();
    const userId = authUser ? authUser.id : (body.user_id ? Number(body.user_id) : null);
    const answers: Record<string, number> = body.answers || {};
    const timeTakenSeconds = Number(body.time_taken_seconds || 0);

    // Fetch test metadata
    let testTitle = "Practice Mock Exam";
    let subject = "General";
    if (testIdNum > 0) {
      const dbTest = await db.query(
        `SELECT id, title, subject, category FROM practice_tests WHERE id = $1 LIMIT 1`,
        [testIdNum]
      );
      if (dbTest.rows.length > 0) {
        testTitle = dbTest.rows[0].title;
        subject = dbTest.rows[0].subject || dbTest.rows[0].category || "General";
      }
    }

    const allQuestions = getQuestionsForTest(testTitle, subject);

    let correctCount = 0;
    let wrongCount = 0;
    let unansweredCount = 0;

    const MARKS_PER_CORRECT = 4;
    const NEGATIVE_MARK = 1;

    const detailedReview = allQuestions.map((q) => {
      const selectedOption = answers[q.id] !== undefined ? answers[q.id] : null;
      const isAttempted = selectedOption !== null && selectedOption >= 0;
      const isCorrect = isAttempted && selectedOption === q.correct_option;

      if (!isAttempted) {
        unansweredCount += 1;
      } else if (isCorrect) {
        correctCount += 1;
      } else {
        wrongCount += 1;
      }

      return {
        id: q.id,
        question_text: q.question_text,
        options: q.options,
        selected_option: selectedOption,
        correct_option: q.correct_option,
        is_correct: isCorrect,
        is_attempted: isAttempted,
        explanation: q.explanation,
      };
    });

    const totalQuestions = allQuestions.length;
    const totalMaxMarks = totalQuestions * MARKS_PER_CORRECT;
    const obtainedMarks = Math.max(0, correctCount * MARKS_PER_CORRECT - wrongCount * NEGATIVE_MARK);
    const percentage = totalMaxMarks > 0 ? Number(((obtainedMarks / totalMaxMarks) * 100).toFixed(1)) : 0;
    const accuracy =
      correctCount + wrongCount > 0
        ? Number(((correctCount / (correctCount + wrongCount)) * 100).toFixed(1))
        : 0;

    // Persist attempt to database
    const insertRes = await db.query(
      `
      INSERT INTO practice_test_attempts_live (
        practice_test_id,
        user_id,
        student_name,
        student_email,
        total_questions,
        correct_answers,
        wrong_answers,
        unanswered,
        obtained_marks,
        total_marks,
        percentage,
        time_taken_seconds,
        answers_json,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING id, created_at
      `,
      [
        testIdNum || 1,
        userId,
        studentName,
        studentEmail || null,
        totalQuestions,
        correctCount,
        wrongCount,
        unansweredCount,
        obtainedMarks,
        totalMaxMarks,
        percentage,
        timeTakenSeconds,
        JSON.stringify(answers),
      ]
    );

    // Update attempt counter on practice_tests
    try {
      if (testIdNum > 0) {
        await db.query(
          `UPDATE practice_tests SET attempts_count = COALESCE(attempts_count, 0) + 1 WHERE id = $1`,
          [testIdNum]
        );
      }
    } catch {}

    // Calculate ranking among all attempts for this test
    let studentRank = 1;
    let totalAttemptsCount = 1;
    try {
      const rankRes = await db.query<{ count: number }>(
        `
        SELECT COUNT(*)::int AS count 
        FROM practice_test_attempts_live 
        WHERE practice_test_id = $1 AND obtained_marks > $2
        `,
        [testIdNum || 1, obtainedMarks]
      );
      studentRank = (rankRes.rows[0]?.count || 0) + 1;

      const totalRes = await db.query<{ count: number }>(
        `SELECT COUNT(*)::int AS count FROM practice_test_attempts_live WHERE practice_test_id = $1`,
        [testIdNum || 1]
      );
      totalAttemptsCount = totalRes.rows[0]?.count || 1;
    } catch {}

    return NextResponse.json({
      success: true,
      attemptId: insertRes.rows[0]?.id,
      scorecard: {
        obtained_marks: obtainedMarks,
        total_marks: totalMaxMarks,
        percentage,
        accuracy,
        total_questions: totalQuestions,
        correct_answers: correctCount,
        wrong_answers: wrongCount,
        unanswered: unansweredCount,
        time_taken_seconds: timeTakenSeconds,
        rank: studentRank,
        total_participants: totalAttemptsCount,
      },
      detailed_review: detailedReview,
    });
  } catch (err: any) {
    console.error("POST /api/public/practice/[id]/submit error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to submit test" },
      { status: 500 }
    );
  }
}
