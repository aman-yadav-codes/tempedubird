import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { getQuestionsForTest } from "@/lib/data/practice-questions-bank";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const testIdNum = Number(String(rawId).split("-")[0]);

    // Fetch test details from database
    let testTitle = "Practice Mock Exam";
    let subject = "General";
    let durationMins = 60;
    let totalMarks = 200;

    if (testIdNum > 0) {
      const dbTest = await db.query(
        `SELECT id, title, subject, category, time_limit_mins, questions_count FROM practice_tests WHERE id = $1 LIMIT 1`,
        [testIdNum]
      );
      if (dbTest.rows.length > 0) {
        const row = dbTest.rows[0];
        testTitle = row.title;
        subject = row.subject || row.category || "General";
        durationMins = row.time_limit_mins || 60;
      }
    }

    const questions = getQuestionsForTest(testTitle, subject);

    // Exclude correct_option from initial question payload so student cannot inspect network tab
    const sanitizedQuestions = questions.map((q) => ({
      id: q.id,
      question_text: q.question_text,
      options: q.options,
    }));

    return NextResponse.json({
      success: true,
      test: {
        id: testIdNum || 1,
        title: testTitle,
        subject,
        duration_minutes: durationMins,
        total_questions: sanitizedQuestions.length,
        marks_per_question: 4,
        negative_marks: 1,
        total_marks: sanitizedQuestions.length * 4,
      },
      questions: sanitizedQuestions,
    });
  } catch (err: any) {
    console.error("GET /api/public/practice/[id]/questions error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to load practice questions" },
      { status: 500 }
    );
  }
}
