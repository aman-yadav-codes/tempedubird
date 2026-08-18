import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import { generateJsonWithProvider } from "@/lib/ai/qwen";
import { db } from "@/lib/db/db";
import { getActiveAiProviderForInstitution, updateAiProvider } from "@/lib/queries/ai";
import { ensureAssignmentTemplateSchema } from "@/lib/queries/assignment-templates";
import type {
  AssignmentQuestionOption,
  AssignmentQuestionType,
  AssignmentTemplateQuestion,
} from "@/lib/types/assignment-template";

type Context = { params: Promise<{ id: string }> };
type QuestionCountKey = "true_false" | "objective" | "subjective";

const QUESTION_TYPES: QuestionCountKey[] = ["true_false", "objective", "subjective"];

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid assignment id");
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

function distributeMarks(totalMarks: number, types: AssignmentQuestionType[]) {
  const totalCents = Math.round(totalMarks * 100);
  if (types.length === 0) throw new Error("Choose at least one question to generate");
  if (totalCents < types.length) {
    throw new Error("Total marks are too low for the selected number of questions");
  }

  const marks = types.map(() => 0);
  const trueFalseAndMcqIndexes = types
    .map((type, index) => ({ type, index }))
    .filter(({ type }) => type === "true_false" || type === "objective")
    .map(({ index }) => index);
  const subjectiveIndexes = types
    .map((type, index) => ({ type, index }))
    .filter(({ type }) => type === "subjective")
    .map(({ index }) => index);

  if (subjectiveIndexes.length > 0) {
    const fixedObjectiveMarks = trueFalseAndMcqIndexes.length * 100;
    const remainingForSubjective = totalCents - fixedObjectiveMarks;
    if (remainingForSubjective < subjectiveIndexes.length) {
      throw new Error("Total marks are too low for the selected AI question format");
    }
    for (const index of trueFalseAndMcqIndexes) {
      marks[index] = 100;
    }
    const baseSubjective = Math.floor(remainingForSubjective / subjectiveIndexes.length);
    let remainder = remainingForSubjective - baseSubjective * subjectiveIndexes.length;
    for (const index of subjectiveIndexes) {
      marks[index] = baseSubjective + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
    }
    return marks.map((mark) => Number((mark / 100).toFixed(2)));
  }

  const preferredIndexes = types
    .map((type, index) => ({ type, index }))
    .filter(({ type }) => type === "objective")
    .map(({ index }) => index);
  const fallbackIndexes = preferredIndexes.length > 0
    ? preferredIndexes
    : types.map((_type, index) => index);
  for (const index of types.map((_type, index) => index)) {
    marks[index] = 100;
  }
  let remaining = totalCents - marks.reduce((sum, mark) => sum + mark, 0);
  if (remaining < 0) {
    throw new Error("Total marks are too low for the selected AI question format");
  }
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
  type: AssignmentQuestionType,
  mark: number,
  index: number
): AssignmentTemplateQuestion {
  const question = asRecord(rawQuestion);
  const questionText = String(question.question_text ?? question.text ?? "").trim();
  if (!questionText) {
    throw new Error(`AI response question ${index + 1} is missing question text`);
  }

  let options: AssignmentQuestionOption[] = [];
  if (type === "true_false") {
    const answer = String(question.correct_answer ?? "").toLowerCase();
    const isTrue = answer === "true" || answer === "yes";
    const isFalse = answer === "false" || answer === "no";
    options = [
      { text: "True", is_correct: isTrue || !isFalse },
      { text: "False", is_correct: isFalse },
    ];
  } else if (type === "objective") {
    options = sanitizeOptions(question.options, index);
  }

  return {
    client_id: `ai-${Date.now()}-${index + 1}`,
    question_text: questionText,
    question_type: type,
    marks: mark,
    display_order: index + 1,
    options,
    files: [],
  };
}

function buildPrompt(input: {
  title: string;
  description: string | null;
  totalMarks: number;
  counts: Record<QuestionCountKey, number>;
  instructions: string;
  syllabus: string[];
}) {
  const totalQuestions = QUESTION_TYPES.reduce((sum, type) => sum + input.counts[type], 0);
  return JSON.stringify({
    task: "Generate assignment questions as strict JSON.",
    assignment: {
      title: input.title,
      description: input.description,
      total_marks: input.totalMarks,
      syllabus: input.syllabus,
      teacher_instructions: input.instructions || null,
    },
    required_counts: {
      true_false: input.counts.true_false,
      mcq_objective: input.counts.objective,
      subjective: input.counts.subjective,
      total: totalQuestions,
    },
    rules: [
      "Return JSON only. No markdown, no commentary, no code fence.",
      "Return exactly the requested number of questions for every type.",
      "Use question_type values only: true_false, objective, subjective.",
      "For objective questions, create 4 useful options and mark exactly one option with is_correct true.",
      "For true_false questions, return correct_answer as True or False.",
      "For subjective questions, return only the question_text. The current assignment schema has no separate answer field for subjective answers.",
      "Do not include marks. The application will assign marks exactly to match the assignment total.",
    ],
    response_shape: {
      questions: [
        {
          question_type: "objective",
          question_text: "Question text here",
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
        },
        {
          question_type: "subjective",
          question_text: "Question text here",
        },
      ],
    },
  });
}

export async function POST(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureAssignmentTemplateSchema();
    if (isPlatformAdminUser(currentUser)) {
      return NextResponse.json(
        { error: "Platform Admin cannot generate assignment questions" },
        { status: 403 }
      );
    }

    const { id: value } = await context.params;
    const id = parseId(value);
    const body = await req.json().catch(() => ({}));

    const assignmentRes = await db.query<{
      title: string;
      description: string | null;
      total_marks: string;
      ai_question_format: unknown;
      source_institution_id: number;
      institution_name: string | null;
      blocked_by_platform: boolean;
    }>(
      `
        SELECT at.title,
               at.description,
               at.total_marks,
               at.ai_question_format,
               at.source_institution_id,
               ip.name AS institution_name,
               at.blocked_by_platform
        FROM assignment_templates at
        LEFT JOIN institution_profiles ip ON ip.id = at.source_institution_id
        WHERE at.id = $1
        LIMIT 1
      `,
      [id]
    );
    const assignment = assignmentRes.rows[0];
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }
    if (assignment.blocked_by_platform) {
      return NextResponse.json(
        { error: "This assignment is blocked by Platform Admin" },
        { status: 423 }
      );
    }
    if (
      !hasPermission(currentUser, "content.assignments.edit", {
        institutionId: assignment.source_institution_id,
      })
    ) {
      return NextResponse.json(
        { error: "You don't have permission to manage these questions" },
        { status: 403 }
      );
    }

    const savedFormat = asRecord(assignment.ai_question_format);
    if (savedFormat.enabled !== true) {
      throw new Error("Enable Generate questions via AI in the assignment Questions tab first");
    }
    const counts = {
      true_false: parseCount(savedFormat.true_false, "True / false count"),
      objective: parseCount(savedFormat.objective, "MCQ count"),
      subjective: parseCount(savedFormat.subjective, "Subjective count"),
    };
    const requestedTypes = QUESTION_TYPES.flatMap((type) =>
      Array.from({ length: counts[type] }, () => type as AssignmentQuestionType)
    );
    if (requestedTypes.length === 0) {
      throw new Error("Choose at least one question to generate");
    }

    const provider = await getActiveAiProviderForInstitution(
      db,
      assignment.source_institution_id,
      false
    );
    if (!provider?.token?.trim()) throw new Error("Configure API key first");

    const syllabusRes = await db.query<{ label: string }>(
      `
        SELECT CONCAT_WS(' / ', s.title, sn.title) AS label
        FROM assignments assn
        INNER JOIN assignment_syllabus_nodes atsn ON atsn.assignment_id = assn.id
        INNER JOIN syllabus_nodes sn ON sn.id = atsn.syllabus_node_id
        LEFT JOIN syllabi s ON s.id = sn.syllabus_id
        WHERE assn.template_id = $1
          AND COALESCE(assn.is_deleted, FALSE) = FALSE
        ORDER BY s.title NULLS LAST, sn.sort_order, sn.title
        LIMIT 20
      `,
      [id]
    );

    const marks = distributeMarks(Number(assignment.total_marks), requestedTypes);
    const result = await generateJsonWithProvider({
      provider,
      prompt: buildPrompt({
        title: assignment.title,
        description: assignment.description,
        totalMarks: Number(assignment.total_marks),
        counts,
        instructions: String(body.instructions ?? "").trim(),
        syllabus: syllabusRes.rows.map((row) => row.label).filter(Boolean),
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

    const buckets = new Map<AssignmentQuestionType, unknown[]>();
    for (const type of QUESTION_TYPES) buckets.set(type, []);
    for (const rawQuestion of rawQuestions) {
      const question = asRecord(rawQuestion);
      const type = String(question.question_type ?? "") as AssignmentQuestionType;
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
