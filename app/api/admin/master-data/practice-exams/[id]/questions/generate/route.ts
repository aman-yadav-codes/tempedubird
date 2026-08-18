import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import { generateJsonWithProvider } from "@/lib/ai/qwen";
import { db } from "@/lib/db/db";
import { getActiveAiProviderForInstitution, updateAiProvider } from "@/lib/queries/ai";
import { ensurePracticeExamSchema } from "@/lib/queries/practice-exams";
import type {
  PracticeExamQuestion,
  PracticeExamQuestionOption,
  PracticeExamQuestionType,
} from "@/lib/types/practice-exam";

type Context = { params: Promise<{ id: string }> };
type QuestionCountKey = "true_false" | "objective";

const QUESTION_TYPES: QuestionCountKey[] = ["true_false", "objective"];

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid practice exam id");
  return id;
}

function parseCount(value: unknown, label: string) {
  const count = Number(value ?? 0);
  if (!Number.isInteger(count) || count < 0 || count > 100) {
    throw new Error(`${label} must be a whole number`);
  }
  return count;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Forbidden: Admin access required" ? 403 :
    message === "Unauthorized" || message === "User not found" ? 401 :
    message === "Configure API key first" ? 428 :
    400;
  return NextResponse.json(
    {
      error: message,
      ...(status === 428
        ? { code: "AI_PROVIDER_NOT_CONFIGURED", redirectTo: "/admin/ai-settings" }
        : {}),
    },
    { status }
  );
}

function distributeMarks(totalMarks: number, types: PracticeExamQuestionType[]) {
  const totalCents = Math.round(totalMarks * 100);
  if (types.length === 0) throw new Error("Choose at least one question to generate");
  if (totalCents < types.length * 100) {
    throw new Error("Total marks are too low for the selected AI question format");
  }

  const marks = types.map(() => 100);
  let remaining = totalCents - marks.reduce((sum, mark) => sum + mark, 0);
  const objectiveIndexes = types
    .map((type, index) => ({ type, index }))
    .filter(({ type }) => type === "objective")
    .map(({ index }) => index);
  const fallbackIndexes = objectiveIndexes.length > 0
    ? objectiveIndexes
    : types.map((_type, index) => index);
  let cursor = 0;
  while (remaining > 0) {
    const index = fallbackIndexes[cursor % fallbackIndexes.length];
    marks[index] += 1;
    remaining -= 1;
    cursor += 1;
  }
  return marks.map((mark) => Number((mark / 100).toFixed(2)));
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function sanitizeOptions(rawOptions: unknown, questionIndex: number) {
  const options = Array.isArray(rawOptions) ? rawOptions : [];
  if (options.length < 2) {
    throw new Error(`AI response question ${questionIndex + 1} needs at least two options`);
  }

  const sanitized = options.slice(0, 6).map((rawOption) => {
    const option = asRecord(rawOption);
    return {
      text: String(option.text ?? "").trim(),
      is_correct: option.is_correct === true,
    };
  }).filter((option) => option.text);

  if (sanitized.length < 2) {
    throw new Error(`AI response question ${questionIndex + 1} has invalid options`);
  }

  const correctIndex = sanitized.findIndex((option) => option.is_correct);
  return sanitized.map((option, optionIndex) => ({
    text: option.text,
    is_correct: correctIndex >= 0 ? optionIndex === correctIndex : optionIndex === 0,
  }));
}

function normalizeQuestion(
  rawQuestion: unknown,
  type: PracticeExamQuestionType,
  mark: number,
  index: number
): PracticeExamQuestion {
  const question = asRecord(rawQuestion);
  const questionText = String(question.question_text ?? question.text ?? "").trim();
  if (!questionText) {
    throw new Error(`AI response question ${index + 1} is missing question text`);
  }

  let options: PracticeExamQuestionOption[] = [];
  if (type === "true_false") {
    const answer = String(question.correct_answer ?? "").toLowerCase();
    const isTrue = answer === "true" || answer === "yes";
    const isFalse = answer === "false" || answer === "no";
    options = [
      { text: "True", is_correct: isTrue || !isFalse },
      { text: "False", is_correct: isFalse },
    ];
  } else {
    options = sanitizeOptions(question.options, index);
  }

  return {
    client_id: `ai-${Date.now()}-${index + 1}`,
    question_text: questionText,
    question_type: type,
    marks: mark,
    explanation: String(question.explanation ?? "").trim() || null,
    display_order: index + 1,
    options,
    files: [],
  };
}

function buildPrompt(input: {
  title: string;
  description: string | null;
  totalMarks: number;
  durationMinutes: number | null;
  counts: Record<QuestionCountKey, number>;
  syllabus: string[];
}) {
  const totalQuestions = QUESTION_TYPES.reduce((sum, type) => sum + input.counts[type], 0);
  return JSON.stringify({
    task: "Generate practice exam questions as strict JSON.",
    practice_exam: {
      title: input.title,
      description: input.description,
      total_marks: input.totalMarks,
      duration_minutes: input.durationMinutes,
      syllabus: input.syllabus,
    },
    required_counts: {
      true_false: input.counts.true_false,
      mcq_objective: input.counts.objective,
      total: totalQuestions,
    },
    rules: [
      "Return JSON only. No markdown, no commentary, no code fence.",
      "Return exactly the requested number of questions for every type.",
      "Use question_type values only: true_false, objective.",
      "Do not generate subjective questions for practice exams.",
      "For objective questions, create 4 useful options and mark exactly one option with is_correct true.",
      "For true_false questions, return correct_answer as True or False.",
      "Add a short explanation for every answer.",
      "Do not include marks. The application will assign marks exactly to match the practice exam total.",
    ],
    response_shape: {
      questions: [
        {
          question_type: "objective",
          question_text: "Question text here",
          explanation: "Why the correct answer is correct.",
          options: [
            { text: "Option A", is_correct: true },
            { text: "Option B", is_correct: false },
            { text: "Option C", is_correct: false },
            { text: "Option D", is_correct: false },
          ],
        },
        {
          question_type: "true_false",
          question_text: "Question text here",
          correct_answer: "True",
          explanation: "Why the statement is true.",
        },
      ],
    },
  });
}

export async function POST(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    await ensurePracticeExamSchema();
    if (isPlatformAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Platform Admin cannot generate practice exam questions" },
        { status: 403 }
      );
    }

    const { id: value } = await context.params;
    const id = parseId(value);

    const practiceExamRes = await db.query<{
      title: string;
      description: string | null;
      total_marks: string;
      duration_minutes: number | null;
      ai_question_format: unknown;
      source_institution_id: number;
      blocked_by_platform: boolean;
    }>(
      `
        SELECT title,
               description,
               total_marks,
               duration_minutes,
               ai_question_format,
               source_institution_id,
               blocked_by_platform
        FROM practice_exam_templates
        WHERE id = $1
          AND COALESCE(exam_kind, 'practice') = 'practice'
        LIMIT 1
      `,
      [id]
    );
    const practiceExam = practiceExamRes.rows[0];
    if (!practiceExam) {
      return NextResponse.json({ error: "Practice Exam not found" }, { status: 404 });
    }
    if (practiceExam.blocked_by_platform) {
      return NextResponse.json(
        { error: "This practice exam is blocked by Platform Admin" },
        { status: 423 }
      );
    }
    if (
      !hasPermission(currentUser, "content.practice_exams.edit", {
        institutionId: practiceExam.source_institution_id,
      })
    ) {
      return NextResponse.json(
        { error: "You don't have permission to manage these questions" },
        { status: 403 }
      );
    }

    const savedFormat = asRecord(practiceExam.ai_question_format);
    if (savedFormat.enabled !== true) {
      throw new Error("Enable Generate questions via AI in the practice exam Questions tab first");
    }
    const counts = {
      true_false: parseCount(savedFormat.true_false, "True / false count"),
      objective: parseCount(savedFormat.objective, "MCQ count"),
    };
    const requestedTypes = QUESTION_TYPES.flatMap((type) =>
      Array.from({ length: counts[type] }, () => type as PracticeExamQuestionType)
    );
    if (requestedTypes.length === 0) {
      throw new Error("Choose at least one question to generate");
    }

    const provider = await getActiveAiProviderForInstitution(
      db,
      practiceExam.source_institution_id,
      false
    );
    if (!provider?.token?.trim()) throw new Error("Configure API key first");

    const syllabusRes = await db.query<{ label: string }>(
      `
        SELECT CONCAT_WS(' / ', s.title, sn.title) AS label
        FROM practice_exams exam
        INNER JOIN practice_exam_syllabus_nodes pesn ON pesn.practice_exam_id = exam.id
        INNER JOIN syllabus_nodes sn ON sn.id = pesn.syllabus_node_id
        LEFT JOIN syllabi s ON s.id = sn.syllabus_id
        WHERE exam.template_id = $1
          AND COALESCE(exam.is_deleted, FALSE) = FALSE
        ORDER BY s.title NULLS LAST, sn.sort_order, sn.title
        LIMIT 20
      `,
      [id]
    );
    const syllabusLabels = syllabusRes.rows.map((row) => row.label).filter(Boolean);
    if (syllabusLabels.length === 0) {
      throw new Error("Map at least one syllabus node before generating questions with AI");
    }

    const marks = distributeMarks(Number(practiceExam.total_marks), requestedTypes);
    const result = await generateJsonWithProvider({
      provider,
      prompt: buildPrompt({
        title: practiceExam.title,
        description: practiceExam.description,
        totalMarks: Number(practiceExam.total_marks),
        durationMinutes: practiceExam.duration_minutes,
        counts,
        syllabus: syllabusLabels,
      }),
    });

    if (
      result.session?.chat_id !== provider.chat_id ||
      result.session?.last_response_id !== provider.last_response_id
    ) {
      await updateAiProvider(db, {
        id: provider.id,
        chat_id: result.session?.chat_id ?? null,
        last_response_id: result.session?.last_response_id ?? null,
      });
    }

    const data = asRecord(result.data);
    const rawQuestions = Array.isArray(data.questions) ? data.questions : [];

    const buckets = new Map<PracticeExamQuestionType, unknown[]>();
    for (const type of QUESTION_TYPES) buckets.set(type, []);
    for (const rawQuestion of rawQuestions) {
      const question = asRecord(rawQuestion);
      const type = String(question.question_type ?? "") as PracticeExamQuestionType;
      if (!buckets.has(type)) {
        throw new Error("AI returned an invalid question type");
      }
      buckets.get(type)?.push(rawQuestion);
    }
    for (const type of QUESTION_TYPES) {
      if ((buckets.get(type)?.length ?? 0) < counts[type]) {
        throw new Error("AI returned fewer questions than requested. Try generating again.");
      }
    }

    const orderedRawQuestions = requestedTypes.map((type) => buckets.get(type)?.shift());
    const questions = orderedRawQuestions.map((question, index) =>
      normalizeQuestion(question, requestedTypes[index], marks[index], index)
    );

    return NextResponse.json({
      data: questions,
      provider: provider.slug,
      elapsed_ms: result.elapsed_ms,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
