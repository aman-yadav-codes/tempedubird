import type {
  PracticeExamQuestionType,
  PracticeExamQuestion,
} from "@/lib/types/practice-exam";

const QUESTION_TYPES = new Set<PracticeExamQuestionType>([
  "objective",
  "true_false",
]);

function parsePositiveNumber(value: unknown, label: string) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw new Error(`${label} must be greater than zero`);
  }
  return Number(number.toFixed(2));
}

function parsePositiveInt(value: unknown, label: string) {
  const number = Number(value);
  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${label} is required`);
  }
  return number;
}

function parsePositiveIntArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map(Number)
        .filter((number) => Number.isInteger(number) && number > 0)
    )
  );
}

function parseNonNegativeInt(value: unknown, label: string) {
  const number = Number(value ?? 0);
  if (!Number.isInteger(number) || number < 0 || number > 100) {
    throw new Error(`${label} must be a whole number`);
  }
  return number;
}

function parseAiQuestionFormat(value: unknown) {
  const format =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  return {
    enabled: format.enabled === true,
    true_false: parseNonNegativeInt(format.true_false, "True / false questions"),
    objective: parseNonNegativeInt(format.objective, "MCQ questions"),
  };
}

export function parsePracticeExamPayload(body: Record<string, unknown>) {
  const metadata = parsePracticeExamMetadataPayload(body);
  const questions = parsePracticeExamQuestionsPayload(body.questions, metadata.totalMarks);
  return { ...metadata, questions };
}

export function parsePracticeExamMetadataPayload(body: Record<string, unknown>) {
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  const totalMarks = parsePositiveNumber(body.total_marks, "Total marks");
  const durationMinutes = parsePositiveInt(body.duration_minutes, "Duration minutes");
  const institutionId = Number(body.source_institution_id);
  const targetType = String(body.target_type ?? "PROGRAM").toUpperCase();
  const allowedTargetTypes = new Set(["PROGRAM", "SECTION", "STUDENT"]);

  if (!title) throw new Error("Practice Exam title is required");
  if (!Number.isInteger(institutionId) || institutionId <= 0) {
    throw new Error("Institution is required");
  }
  if (!allowedTargetTypes.has(targetType)) {
    throw new Error("Select Class / Program, Section, or Particular Student as the practice exam target");
  }

  const targetId =
    parsePositiveInt(body.target_id, "Practice Exam target");
  const targetProgramId =
    targetType === "PROGRAM"
      ? targetId
      : targetType === "SECTION" || targetType === "STUDENT"
        ? parsePositiveInt(body.target_program_id ?? body.program_id, "Class / Program")
        : null;
  return {
    title,
    description,
    totalMarks,
    durationMinutes,
    institutionId,
    targetType,
    targetId,
    targetProgramId,
    syllabusNodeIds: parsePositiveIntArray(body.syllabus_node_ids),
    aiQuestionFormat: parseAiQuestionFormat(body.ai_question_format),
    isPublic: body.is_public === true,
    isActive: body.is_active === true,
    isPaid: body.is_paid === true || (Number(body.price) > 0),
    price: (body.is_paid === true || (Number(body.price) > 0)) ? Math.max(0, Number(body.price) || 0) : 0,
  };
}

export function parsePracticeExamQuestionsPayload(
  value: unknown,
  totalMarks: number
) {
  const rawQuestions = Array.isArray(value) ? value : [];
  if (rawQuestions.length === 0) {
    throw new Error("Add at least one question");
  }

  const questions = rawQuestions.map((rawQuestion, questionIndex) => {
    const question = rawQuestion as Record<string, unknown>;
    const questionText = String(question.question_text ?? "").trim();
    const explanation = String(question.explanation ?? "").trim() || null;
    const questionType = String(question.question_type ?? "") as PracticeExamQuestionType;
    const marks = parsePositiveNumber(
      question.marks,
      `Question ${questionIndex + 1} marks`
    );
    const rawFiles = Array.isArray(question.files) ? question.files : [];

    if (!questionText) {
      throw new Error(`Question ${questionIndex + 1} text is required`);
    }
    if (!QUESTION_TYPES.has(questionType)) {
      if (questionType === "subjective") {
        throw new Error(
          `Question ${questionIndex + 1} cannot be subjective because practice exams show instant results`
        );
      }
      throw new Error(`Question ${questionIndex + 1} has an invalid type`);
    }
    if (rawFiles.length > 5) {
      throw new Error(`Question ${questionIndex + 1} supports up to 5 images`);
    }

    const files = rawFiles.map((rawFile, fileIndex) => {
      const file =
        typeof rawFile === "string"
          ? { url: rawFile }
          : (rawFile as Record<string, unknown>);
      const url = String(file.url ?? "").trim();
      if (!url) {
        throw new Error(
          `Question ${questionIndex + 1}, image ${fileIndex + 1} is invalid`
        );
      }
      return { url, sort_order: fileIndex };
    });

    let options: Array<{
      text: string;
      is_correct: boolean;
      display_order: number;
    }> = [];

    if (questionType === "true_false") {
      const selected = String(question.correct_answer ?? "").toLowerCase();
      if (selected !== "true" && selected !== "false") {
        throw new Error(`Select the correct answer for question ${questionIndex + 1}`);
      }
      options = ["True", "False"].map((text, optionIndex) => ({
        text,
        is_correct: text.toLowerCase() === selected,
        display_order: optionIndex + 1,
      }));
    }

    if (questionType === "objective") {
      const rawOptions = Array.isArray(question.options) ? question.options : [];
      if (rawOptions.length < 2) {
        throw new Error(`Question ${questionIndex + 1} needs at least two options`);
      }
      options = rawOptions.map((rawOption, optionIndex) => {
        const option =
          typeof rawOption === "string"
            ? { text: rawOption, is_correct: false }
            : (rawOption as Record<string, unknown>);
        const text = String(option.text ?? "").trim();
        if (!text) {
          throw new Error(
            `Question ${questionIndex + 1}, option ${optionIndex + 1} is required`
          );
        }
        return {
          text,
          is_correct: option.is_correct === true,
          display_order: optionIndex + 1,
        };
      });
      if (options.filter((option) => option.is_correct).length !== 1) {
        throw new Error(
          `Question ${questionIndex + 1} must have exactly one correct answer`
        );
      }
    }

    return {
      question_text: questionText,
      question_type: questionType,
      marks,
      explanation,
      display_order: questionIndex + 1,
      options,
      files,
    };
  });

  const questionMarks = Number(
    questions.reduce((sum, question) => sum + question.marks, 0).toFixed(2)
  );
  if (questionMarks !== Number(totalMarks.toFixed(2))) {
    throw new Error(
      `Total marks must equal question marks (${questionMarks.toFixed(2)})`
    );
  }

  return questions;
}

export function serializePracticeExamQuestions(
  rows: Array<{
    id: number;
    question_text: string;
    question_type: PracticeExamQuestionType;
    marks: string | number;
    explanation?: string | null;
    display_order: number;
    options: unknown;
    files: unknown;
  }>
): PracticeExamQuestion[] {
  return rows.map((row) => ({
    id: row.id,
    question_text: row.question_text,
    question_type: row.question_type,
    marks: Number(row.marks),
    explanation: row.explanation ?? null,
    display_order: row.display_order,
    options: Array.isArray(row.options)
      ? (row.options as PracticeExamQuestion["options"])
      : [],
    files: Array.isArray(row.files)
      ? (row.files as PracticeExamQuestion["files"])
      : [],
  }));
}



