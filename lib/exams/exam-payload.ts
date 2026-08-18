import type {
  ExamQuestionType,
  ExamQuestion,
} from "@/lib/types/exam";

const QUESTION_TYPES = new Set<ExamQuestionType>([
  "objective",
  "true_false",
  "subjective",
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
    subjective: parseNonNegativeInt(format.subjective, "Subjective questions"),
  };
}

export function parseExamPayload(body: Record<string, unknown>) {
  const metadata = parseExamMetadataPayload(body);
  const questions = parseExamQuestionsPayload(
    body.questions,
    metadata.totalMarks,
    metadata.instantResult
  );
  return { ...metadata, questions };
}

export function parseExamMetadataPayload(body: Record<string, unknown>) {
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  const examSeriesId = Number(body.exam_series_id);
  const totalMarks = parsePositiveNumber(body.total_marks, "Total marks");
  const durationMinutes = parsePositiveInt(body.duration_minutes, "Duration minutes");
  const examDate = String(body.exam_date ?? "").trim();
  const examTime = String(body.exam_time ?? "").trim();
  const examPlace = String(body.exam_place ?? "").trim();
  const examMode = String(body.exam_mode ?? "offline").trim().toLowerCase();
  const resultDate = String(body.result_date ?? "").trim();
  const instantResult = body.instant_result === true;
  const institutionId = Number(body.source_institution_id);
  const targetType = String(body.target_type ?? "INSTITUTION").toUpperCase();
  const allowedTargetTypes = new Set(["INSTITUTION", "PROGRAM", "SECTION", "STUDENT"]);

  if (!title && (!Number.isInteger(examSeriesId) || examSeriesId <= 0)) {
    throw new Error("Exam title is required");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(examDate)) throw new Error("Exam date is required");
  if (!/^\d{2}:\d{2}/.test(examTime)) throw new Error("Exam time is required");
  if (!examPlace) throw new Error("Exam place is required");
  if (!["offline", "online", "hybrid"].includes(examMode)) {
    throw new Error("Exam mode is invalid");
  }
  if (!instantResult && !/^\d{4}-\d{2}-\d{2}$/.test(resultDate)) {
    throw new Error("Result date is required");
  }
  if (!instantResult && resultDate < examDate) {
    throw new Error("Result date cannot be before the exam date");
  }
  if (!Number.isInteger(institutionId) || institutionId <= 0) {
    throw new Error("Institution is required");
  }
  if (!allowedTargetTypes.has(targetType)) {
    throw new Error("Exam target is required");
  }

  const targetId =
    targetType === "INSTITUTION"
      ? institutionId
      : parsePositiveInt(body.target_id, "Exam target");
  const targetProgramId =
    targetType === "PROGRAM"
      ? targetId
      : targetType === "SECTION" || targetType === "STUDENT"
        ? parsePositiveInt(body.target_program_id ?? body.program_id, "Class / Program")
        : null;
  return {
    title,
    description,
    examSeriesId: Number.isInteger(examSeriesId) && examSeriesId > 0 ? examSeriesId : null,
    totalMarks,
    durationMinutes,
    examDate,
    examTime,
    examPlace,
    examMode,
    resultDate: instantResult ? null : resultDate,
    instantResult,
    institutionId,
    targetType,
    targetId,
    targetProgramId,
    syllabusNodeIds: parsePositiveIntArray(body.syllabus_node_ids),
    aiQuestionFormat: parseAiQuestionFormat(body.ai_question_format),
    isPublic: body.is_public === true,
    isActive: body.is_active === true,
  };
}

export function parseExamQuestionsPayload(
  value: unknown,
  totalMarks: number,
  instantResult = true
) {
  const rawQuestions = Array.isArray(value) ? value : [];
  if (rawQuestions.length === 0) {
    throw new Error("Add at least one question");
  }

  const questions = rawQuestions.map((rawQuestion, questionIndex) => {
    const question = rawQuestion as Record<string, unknown>;
    const questionText = String(question.question_text ?? "").trim();
    const explanation = String(question.explanation ?? "").trim() || null;
    const questionType = String(question.question_type ?? "") as ExamQuestionType;
    const marks = parsePositiveNumber(
      question.marks,
      `Question ${questionIndex + 1} marks`
    );
    const rawFiles = Array.isArray(question.files) ? question.files : [];

    if (!questionText) {
      throw new Error(`Question ${questionIndex + 1} text is required`);
    }
    if (!QUESTION_TYPES.has(questionType)) {
      throw new Error(`Question ${questionIndex + 1} has an invalid type`);
    }
    if (instantResult && questionType === "subjective") {
      throw new Error(
        `Question ${questionIndex + 1} cannot be subjective because instant result is enabled`
      );
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

export function serializeExamQuestions(
  rows: Array<{
    id: number;
    question_text: string;
    question_type: ExamQuestionType;
    marks: string | number;
    explanation?: string | null;
    display_order: number;
    options: unknown;
    files: unknown;
  }>
): ExamQuestion[] {
  return rows.map((row) => ({
    id: row.id,
    question_text: row.question_text,
    question_type: row.question_type,
    marks: Number(row.marks),
    explanation: row.explanation ?? null,
    display_order: row.display_order,
    options: Array.isArray(row.options)
      ? (row.options as ExamQuestion["options"])
      : [],
    files: Array.isArray(row.files)
      ? (row.files as ExamQuestion["files"])
      : [],
  }));
}



