import { NextResponse } from "next/server";

import { generateJsonWithProvider } from "@/lib/ai/qwen";
import { requireAdmin } from "@/lib/auth/auth";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { getActiveAiProviderForInstitution, updateAiProvider } from "@/lib/queries/ai";
import { ensureExamSchema } from "@/lib/queries/exams";
import type { ExamQuestion, ExamQuestionType } from "@/lib/types/exam";

type Context = { params: Promise<{ id: string }> };
type QuestionCountKey = "true_false" | "objective" | "subjective";

const QUESTION_TYPES: QuestionCountKey[] = ["true_false", "objective", "subjective"];
const AI_BATCH_SIZE = 10;

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid exam id");
  return id;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status =
    message === "Forbidden: Admin access required" ? 403 :
    message === "Unauthorized" || message === "User not found" ? 401 :
    /api key/i.test(message) ? 428 :
    400;
  return NextResponse.json(
    {
      error: message,
      ...(/api key/i.test(message)
        ? { code: "AI_PROVIDER_NOT_CONFIGURED", redirectTo: "/admin/ai-settings" }
        : {}),
    },
    { status }
  );
}

function parseCount(value: unknown, label: string) {
  const count = Number(value ?? 0);
  if (!Number.isInteger(count) || count < 0 || count > 100) {
    throw new Error(`${label} must be a whole number`);
  }
  return count;
}

function distributeMarks(totalMarks: number, types: ExamQuestionType[]) {
  const totalCents = Math.round(totalMarks * 100);
  if (totalCents < types.length * 100) {
    throw new Error("Total marks must allow at least 1 mark per AI question");
  }
  const marks = types.map(() => 100);
  let remaining = totalCents - marks.reduce((sum, value) => sum + value, 0);
  const subjectiveIndexes = types
    .map((type, index) => (type === "subjective" ? index : -1))
    .filter((index) => index >= 0);
  const objectiveIndexes = types
    .map((type, index) => (type === "objective" ? index : -1))
    .filter((index) => index >= 0);
  const targets = subjectiveIndexes.length > 0
    ? subjectiveIndexes
    : objectiveIndexes.length > 0
      ? objectiveIndexes
      : marks.map((_, index) => index);
  let cursor = 0;
  while (remaining > 0) {
    const chunk = Math.min(remaining, 100);
    marks[targets[cursor % targets.length]] += chunk;
    remaining -= chunk;
    cursor += 1;
  }
  return marks.map((value) => Number((value / 100).toFixed(2)));
}

function normalizeQuestions(
  rawQuestions: unknown[],
  requestedTypes: ExamQuestionType[],
  marks: number[]
): ExamQuestion[] {
  return rawQuestions.map((item, index) => {
    const question = asRecord(item);
    const type = requestedTypes[index];
    const options = Array.isArray(question.options) ? question.options.map(asRecord) : [];
    const normalizedOptions =
      type === "true_false"
        ? ["True", "False"].map((text) => ({
            text,
            is_correct:
              String(question.correct_answer ?? "").trim().toLowerCase() === text.toLowerCase(),
          }))
        : type === "objective"
          ? options.slice(0, 6).map((option, optionIndex) => ({
              text: String(option.text ?? "").trim(),
              is_correct:
                option.is_correct === true ||
                Number(question.correct_option_index) === optionIndex,
            }))
          : [];
    if (type === "true_false" && normalizedOptions.every((option) => !option.is_correct)) {
      normalizedOptions[0].is_correct = true;
    }
    if (type === "objective" && normalizedOptions.filter((option) => option.is_correct).length !== 1) {
      normalizedOptions.forEach((option, optionIndex) => {
        option.is_correct = optionIndex === 0;
      });
    }
    return {
      client_id: `ai-${Date.now()}-${index}`,
      question_text: String(question.question_text ?? question.text ?? "").trim(),
      question_type: type,
      marks: marks[index],
      explanation: String(question.explanation ?? "").trim() || null,
      options: normalizedOptions,
      files: [],
      display_order: index + 1,
    };
  });
}

function buildPrompt(input: {
  title: string;
  description: string | null;
  totalMarks: number;
  durationMinutes: number | null;
  instantResult: boolean;
  counts: Record<QuestionCountKey, number>;
  syllabus: string[];
}) {
  return [
    "Generate an exam subject paper as strict JSON only.",
    `Exam title: ${input.title}`,
    input.description ? `Description: ${input.description}` : "",
    `Total marks: ${input.totalMarks}`,
    input.durationMinutes ? `Duration: ${input.durationMinutes} minutes` : "",
    `Question counts: true_false=${input.counts.true_false}, mcq=${input.counts.objective}, subjective=${input.counts.subjective}.`,
    input.instantResult ? "Instant result is enabled, so do not create subjective questions." : "",
    "Syllabus/context:",
    input.syllabus.map((item, index) => `${index + 1}. ${item}`).join("\n"),
    "Rules:",
    "Return exactly the requested number of questions.",
    "Use only these question_type values: true_false, objective, subjective.",
    "For objective questions provide 4 options and exactly one correct option.",
    "For true_false questions provide correct_answer as True or False.",
    "For subjective questions provide a model answer in explanation.",
    "Add a short explanation for every answer.",
    "Do not include marks; marks are assigned by the system.",
    "JSON shape:",
    JSON.stringify({
      questions: [
        {
          question_type: "objective",
          question_text: "Question text",
          options: [
            { text: "A", is_correct: true },
            { text: "B", is_correct: false },
            { text: "C", is_correct: false },
            { text: "D", is_correct: false },
          ],
          explanation: "Why the answer is correct.",
        },
      ],
    }),
  ].filter(Boolean).join("\n");
}

async function generateQuestionBatch(input: {
  provider: NonNullable<Awaited<ReturnType<typeof getActiveAiProviderForInstitution>>>;
  title: string;
  description: string | null;
  totalMarks: number;
  durationMinutes: number | null;
  instantResult: boolean;
  syllabus: string[];
  type: QuestionCountKey;
  count: number;
}) {
  const counts = {
    true_false: input.type === "true_false" ? input.count : 0,
    objective: input.type === "objective" ? input.count : 0,
    subjective: input.type === "subjective" ? input.count : 0,
  };
  const result = await generateJsonWithProvider({
    provider: input.provider,
    prompt: buildPrompt({
      title: input.title,
      description: input.description,
      totalMarks: input.totalMarks,
      durationMinutes: input.durationMinutes,
      instantResult: input.instantResult,
      counts,
      syllabus: input.syllabus,
    }),
  });
  if (
    result.session?.chat_id !== input.provider.chat_id ||
    result.session?.last_response_id !== input.provider.last_response_id
  ) {
    await updateAiProvider(db, {
      id: input.provider.id,
      chat_id: result.session?.chat_id ?? null,
      last_response_id: result.session?.last_response_id ?? null,
    });
    input.provider.chat_id = result.session?.chat_id ?? null;
    input.provider.last_response_id = result.session?.last_response_id ?? null;
  }
  const data = asRecord(result.data);
  const rawQuestions = Array.isArray(data.questions) ? data.questions : [];
  return {
    questions: rawQuestions.filter((item) => {
      const question = asRecord(item);
      const returnedType = String(question.question_type ?? "").trim();
      return returnedType === input.type || returnedType === "";
    }),
    elapsed_ms: result.elapsed_ms,
  };
}

async function generateRawQuestions(input: {
  provider: NonNullable<Awaited<ReturnType<typeof getActiveAiProviderForInstitution>>>;
  title: string;
  description: string | null;
  totalMarks: number;
  durationMinutes: number | null;
  instantResult: boolean;
  counts: Record<QuestionCountKey, number>;
  syllabus: string[];
}) {
  const rawQuestions: unknown[] = [];
  let elapsedMs = 0;
  for (const type of QUESTION_TYPES) {
    let remaining = input.counts[type];
    while (remaining > 0) {
      const batchCount = Math.min(remaining, AI_BATCH_SIZE);
      const result = await generateQuestionBatch({
        ...input,
        type,
        count: batchCount,
      });
      elapsedMs += result.elapsed_ms ?? 0;
      const usableQuestions = result.questions.slice(0, remaining);
      if (usableQuestions.length === 0) {
        throw new Error(`AI could not generate enough ${type.replace("_", " ")} questions`);
      }
      rawQuestions.push(...usableQuestions);
      remaining -= usableQuestions.length;
    }
  }
  return { questions: rawQuestions, elapsed_ms: elapsedMs };
}

export async function POST(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureExamSchema();
    if (isPlatformAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Platform Admin cannot generate exam questions" },
        { status: 403 }
      );
    }
    const { id: value } = await context.params;
    const id = parseId(value);
    const templateResult = await db.query<{
      id: number;
      title: string;
      description: string | null;
      total_marks: string;
      duration_minutes: number | null;
      instant_result: boolean;
      source_institution_id: number;
      blocked_by_platform: boolean;
      ai_question_format: unknown;
    }>(
      `
        SELECT id, title, description, total_marks::text, duration_minutes,
               instant_result, source_institution_id, blocked_by_platform,
               ai_question_format
        FROM practice_exam_templates
        WHERE id = $1
          AND COALESCE(exam_kind, 'practice') = 'exam'
          AND COALESCE(is_deleted, FALSE) = FALSE
        LIMIT 1
      `,
      [id]
    );
    const exam = templateResult.rows[0];
    if (!exam) throw new Error("Exam not found");
    if (exam.blocked_by_platform) throw new Error("This exam is blocked by Platform Admin");
    if (
      !hasPermission(currentUser, "content.exams.edit", {
        institutionId: exam.source_institution_id,
      })
    ) {
      return NextResponse.json(
        { error: "You don't have permission to manage these questions" },
        { status: 403 }
      );
    }

    const savedFormat = asRecord(exam.ai_question_format);
    if (savedFormat.enabled !== true) {
      throw new Error("Enable Generate questions via AI in the exam Questions tab first");
    }
    const counts = {
      true_false: parseCount(savedFormat.true_false, "True / false count"),
      objective: parseCount(savedFormat.objective, "MCQ count"),
      subjective: parseCount(savedFormat.subjective, "Subjective count"),
    };
    if (exam.instant_result && counts.subjective > 0) {
      throw new Error("Subjective AI questions are not allowed with instant result");
    }
    const requestedTypes = QUESTION_TYPES.flatMap((type) =>
      Array.from({ length: counts[type] }, () => type as ExamQuestionType)
    );
    if (requestedTypes.length === 0) throw new Error("Choose at least one question to generate");

    const provider = await getActiveAiProviderForInstitution(db, exam.source_institution_id, false);
    if (!provider?.token?.trim()) throw new Error("Configure API key first");

    const syllabusResult = await db.query<{ label: string }>(
      `
        SELECT CONCAT_WS(' / ', s.title, sn.title) AS label
        FROM practice_exams exam
        INNER JOIN practice_exam_syllabus_nodes pesn ON pesn.practice_exam_id = exam.id
        INNER JOIN syllabus_nodes sn ON sn.id = pesn.syllabus_node_id
        LEFT JOIN syllabi s ON s.id = sn.syllabus_id
        WHERE exam.template_id = $1
          AND COALESCE(exam.exam_kind, 'practice') = 'exam'
          AND COALESCE(exam.is_deleted, FALSE) = FALSE
        ORDER BY s.title NULLS LAST, sn.sort_order, sn.title
        LIMIT 30
      `,
      [id]
    );
    const syllabus = syllabusResult.rows.map((row) => row.label).filter(Boolean);
    if (syllabus.length === 0) {
      throw new Error("Map at least one syllabus node before generating questions with AI");
    }

    const marks = distributeMarks(Number(exam.total_marks), requestedTypes);
    const result = await generateRawQuestions({
      provider,
      title: exam.title,
      description: exam.description,
      totalMarks: Number(exam.total_marks),
      durationMinutes: exam.duration_minutes,
      instantResult: exam.instant_result,
      counts,
      syllabus,
    });
    const rawQuestions = result.questions;
    if (rawQuestions.length < requestedTypes.length) {
      throw new Error("AI returned fewer questions than requested. Try generating again.");
    }
    const questions = normalizeQuestions(
      rawQuestions.slice(0, requestedTypes.length),
      requestedTypes,
      marks
    );
    if (questions.some((question) => !question.question_text)) {
      throw new Error("AI returned an invalid question format");
    }
    return NextResponse.json({
      data: questions,
      provider: provider.slug,
      elapsed_ms: result.elapsed_ms,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
