import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import { generateJsonWithProvider } from "@/lib/ai/qwen";
import { db } from "@/lib/db/db";
import { getActiveAiProviderForInstitution, updateAiProvider } from "@/lib/queries/ai";
import { ensureNotesSchema } from "@/lib/queries/notes";
import type {
  NoteQuestionType,
  NoteTemplateQuestion,
} from "@/lib/types/notes";

type Context = { params: Promise<{ id: string }> };
type QuestionCountKey = "true_false" | "objective" | "subjective";

const QUESTION_TYPES: QuestionCountKey[] = ["true_false", "objective", "subjective"];

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid note id");
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

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function sanitizeOptions(rawOptions: unknown, questionIndex: number) {
  const options = Array.isArray(rawOptions) ? rawOptions : [];
  if (options.length < 2) {
    throw new Error(`AI response entry ${questionIndex + 1} needs at least two options`);
  }

  const sanitized = options.slice(0, 6).map((rawOption) => {
    const option = asRecord(rawOption);
    return {
      text: String(option.text ?? "").trim(),
      is_correct: option.is_correct === true,
    };
  }).filter((option) => option.text);

  if (sanitized.length < 2) {
    throw new Error(`AI response entry ${questionIndex + 1} has invalid options`);
  }

  const correctIndex = sanitized.findIndex((option) => option.is_correct);
  return sanitized.map((option, optionIndex) => ({
    text: option.text,
    is_correct: correctIndex >= 0 ? optionIndex === correctIndex : optionIndex === 0,
  }));
}

function normalizeQuestion(
  rawQuestion: unknown,
  type: NoteQuestionType,
  index: number
): NoteTemplateQuestion {
  const question = asRecord(rawQuestion);
  const questionText = String(question.question_text ?? question.question ?? question.text ?? "").trim();
  const answerText = String(question.answer_text ?? question.answer ?? question.solution ?? question.explanation ?? "").trim();

  if (!questionText) {
    throw new Error(`AI generated an invalid question at entry ${index + 1}`);
  }

  if (type === "true_false") {
    const correctAnswer = String(
      question.correct_answer ??
      question.answer ??
      question.options ??
      ""
    ).toLowerCase().includes("true")
      ? "True"
      : "False";

    return {
      question_text: questionText,
      question_type: type,
      answer_text: answerText || (correctAnswer === "True" ? "True statement." : "False statement."),
      correct_answer: correctAnswer,
      options: [
        { text: "True", is_correct: correctAnswer === "True" },
        { text: "False", is_correct: correctAnswer === "False" },
      ],
      files: [],
      answer_files: [],
      display_order: index + 1,
    };
  }

  if (type === "objective") {
    const options = sanitizeOptions(question.options, index);
    const correctOption = options.find((opt) => opt.is_correct)?.text;
    return {
      question_text: questionText,
      question_type: type,
      answer_text: answerText || (correctOption ? `Correct answer: ${correctOption}` : ""),
      correct_answer: correctOption,
      options,
      files: [],
      answer_files: [],
      display_order: index + 1,
    };
  }

  return {
    question_text: questionText,
    question_type: "subjective",
    answer_text: answerText,
    options: [],
    files: [],
    answer_files: [],
    display_order: index + 1,
  };
}

export async function POST(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureNotesSchema();
    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const { id: value } = await context.params;
    const id = parseId(value);

    const result = await db.query<{
      title: string;
      description: string | null;
      institution_id: number;
      subject_name: string | null;
      syllabus_data: unknown;
      ai_question_format: unknown;
    }>(
      `
        SELECT
          title,
          description,
          institution_id,
          subject_name,
          syllabus_data,
          ai_question_format
        FROM study_notes
        WHERE id = $1 AND COALESCE(is_deleted, FALSE) = FALSE
        LIMIT 1
      `,
      [id]
    );
    const note = result.rows[0];
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    if (
      !isPlatformAdmin &&
      !hasPermission(currentUser, "content.notes.edit", {
        institutionId: note.institution_id,
      })
    ) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const rawFormat = asRecord(body.format ?? note.ai_question_format);
    const counts: Record<QuestionCountKey, number> = {
      true_false: parseCount(rawFormat.true_false, "True / false"),
      objective: parseCount(rawFormat.objective ?? rawFormat.multiple_choice, "Multiple choice"),
      subjective: parseCount(rawFormat.subjective, "Subjective / Theory"),
    };

    const orderedTypes: NoteQuestionType[] = [];
    for (const key of QUESTION_TYPES) {
      const count = counts[key] ?? 0;
      for (let i = 0; i < count; i++) {
        orderedTypes.push(key);
      }
    }

    if (orderedTypes.length === 0) {
      throw new Error("Specify at least one question type count in AI format");
    }

    const activeAi = await getActiveAiProviderForInstitution(db, note.institution_id, false);
    if (!activeAi || !activeAi.token?.trim()) {
      return errorResponse(new Error("Configure API key first"));
    }

    const prompt = `
You are an expert educator. Create study and revision notes with comprehensive Q&A entries and detailed answer solutions.

Note Title: ${note.title}
Subject: ${note.subject_name || "General"}
Context: ${note.description || "Comprehensive unit study notes"}

Required Question Types:
- True/False count: ${counts.true_false}
- Multiple Choice count: ${counts.objective}
- Subjective/Theory Q&A count: ${counts.subjective}

For EACH question:
1. Provide a clear, educational "question_text".
2. Provide a thorough, step-by-step "answer_text" explaining the solution and rationale.
3. If "objective", provide 4 options with exactly one correct ("is_correct": true).
4. If "true_false", specify "correct_answer" as "True" or "False".

Return ONLY a JSON object formatted as:
{
  "questions": [
    {
      "question_text": "...",
      "question_type": "true_false" | "objective" | "subjective",
      "correct_answer": "...",
      "answer_text": "Detailed explanation and solution...",
      "options": [
        { "text": "...", "is_correct": true },
        { "text": "...", "is_correct": false }
      ]
    }
  ]
}
`;

    const generated = await generateJsonWithProvider({
      provider: activeAi,
      prompt,
    });

    if (
      generated.session?.chat_id !== activeAi.chat_id ||
      generated.session?.last_response_id !== activeAi.last_response_id
    ) {
      await updateAiProvider(db, {
        id: activeAi.id,
        chat_id: generated.session?.chat_id ?? null,
        last_response_id: generated.session?.last_response_id ?? null,
      });
    }

    const data = asRecord(generated.data);
    const rawList = Array.isArray(data.questions) ? data.questions : [];
    const questions: NoteTemplateQuestion[] = orderedTypes.map((type, idx) => {
      const matchingRaw = rawList.find(
        (q) => asRecord(q).question_type === type
      ) || rawList[idx] || {};
      return normalizeQuestion(matchingRaw, type, idx);
    });

    return NextResponse.json({ data: questions });
  } catch (error) {
    return errorResponse(error);
  }
}
