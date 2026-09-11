import type {
  NoteQuestionType,
  NoteTemplateQuestion,
} from "@/lib/types/notes";

const QUESTION_TYPES = new Set<NoteQuestionType>([
  "objective",
  "true_false",
  "subjective",
]);

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

export function parseNoteMetadataPayload(body: Record<string, unknown>) {
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim() || null;
  const institutionId = Number(body.institution_id ?? body.source_institution_id);
  const targetType = String(body.target_type ?? "INSTITUTION").toUpperCase();
  const allowedTargetTypes = new Set(["INSTITUTION", "PROGRAM", "SECTION", "STUDENT"]);

  if (!title) throw new Error("Note title is required");
  if (!Number.isInteger(institutionId) || institutionId <= 0) {
    throw new Error("Institution is required");
  }
  if (!allowedTargetTypes.has(targetType)) {
    throw new Error("Note target is required");
  }

  const targetId =
    targetType === "INSTITUTION"
      ? institutionId
      : parsePositiveInt(body.target_id, "Note target");
  const targetProgramId =
    targetType === "PROGRAM"
      ? targetId
      : targetType === "SECTION" || targetType === "STUDENT"
        ? parsePositiveInt(body.target_program_id ?? body.program_id, "Class / Program")
        : null;

  const subjectId = body.subject_id ? String(body.subject_id).trim() : null;
  const subjectName = body.subject_name ? String(body.subject_name).trim() : null;
  const syllabusData = Array.isArray(body.syllabus_data)
    ? body.syllabus_data
    : Array.isArray(body.syllabus_nodes)
      ? body.syllabus_nodes
      : [];

  return {
    title,
    description,
    subjectId,
    subjectName,
    syllabusData,
    institutionId,
    targetType,
    targetId,
    targetProgramId,
    syllabusNodeIds: parsePositiveIntArray(body.syllabus_node_ids),
    aiQuestionFormat: parseAiQuestionFormat(body.ai_question_format),
    isPublic: body.is_public === true,
    isActive: body.is_active === true,
    isPaid: body.is_paid === true || Number(body.price) > 0,
    price: body.is_paid === true || Number(body.price) > 0 ? Math.max(0, Number(body.price) || 0) : 0,
  };
}

export function parseNoteQuestionsPayload(value: unknown) {
  const rawQuestions = Array.isArray(value) ? value : [];
  if (rawQuestions.length === 0) {
    throw new Error("Add at least one Q&A note entry");
  }

  const questions = rawQuestions.map((rawQuestion, questionIndex) => {
    const question = rawQuestion as Record<string, unknown>;
    const questionText = String(question.question_text ?? "").trim();
    const questionType = String(question.question_type ?? "") as NoteQuestionType;
    const answerText = String(question.answer_text ?? "").trim();
    const rawFiles = Array.isArray(question.files) ? question.files : [];
    const rawAnswerFiles = Array.isArray(question.answer_files) ? question.answer_files : [];

    if (!questionText) {
      throw new Error(`Question ${questionIndex + 1} text is required`);
    }
    if (!QUESTION_TYPES.has(questionType)) {
      throw new Error(`Question ${questionIndex + 1} has an invalid type`);
    }
    if (rawFiles.length > 5) {
      throw new Error(`Question ${questionIndex + 1} supports up to 5 images`);
    }
    if (rawAnswerFiles.length > 5) {
      throw new Error(`Question ${questionIndex + 1} supports up to 5 answer attachments`);
    }

    const files = rawFiles.map((rawFile, fileIndex) => {
      const file =
        typeof rawFile === "string"
          ? { url: rawFile }
          : (rawFile as Record<string, unknown>);
      const url = String(file.url ?? "").trim();
      if (!url) {
        throw new Error(`Question ${questionIndex + 1}, image ${fileIndex + 1} is invalid`);
      }
      return { url, sort_order: fileIndex, name: String(file.name ?? "") };
    });

    const answerFiles = rawAnswerFiles.map((rawFile, fileIndex) => {
      const file =
        typeof rawFile === "string"
          ? { url: rawFile }
          : (rawFile as Record<string, unknown>);
      const url = String(file.url ?? "").trim();
      if (!url) {
        throw new Error(`Question ${questionIndex + 1}, answer file ${fileIndex + 1} is invalid`);
      }
      return { url, sort_order: fileIndex, name: String(file.name ?? "") };
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
          throw new Error(`Question ${questionIndex + 1}, option ${optionIndex + 1} is required`);
        }
        return {
          text,
          is_correct: option.is_correct === true,
          display_order: optionIndex + 1,
        };
      });
      if (options.filter((option) => option.is_correct).length !== 1) {
        throw new Error(`Question ${questionIndex + 1} must have exactly one correct answer`);
      }
    }

    return {
      question_text: questionText,
      question_type: questionType,
      answer_text: answerText,
      correct_answer:
        questionType === "true_false"
          ? options.find((opt) => opt.is_correct)?.text
          : undefined,
      display_order: questionIndex + 1,
      options,
      files,
      answer_files: answerFiles,
    };
  });

  return questions;
}

export function serializeNoteQuestions(
  rows: Array<{
    id: number;
    question_text: string;
    question_type: NoteQuestionType;
    answer_text?: string | null;
    display_order: number;
    options: unknown;
    files: unknown;
    answer_files?: unknown;
  }>
): NoteTemplateQuestion[] {
  return rows.map((row) => ({
    id: row.id,
    question_text: row.question_text,
    question_type: row.question_type,
    answer_text: row.answer_text ?? "",
    display_order: row.display_order,
    options: Array.isArray(row.options)
      ? (row.options as NoteTemplateQuestion["options"])
      : [],
    files: Array.isArray(row.files)
      ? (row.files as NoteTemplateQuestion["files"])
      : [],
    answer_files: Array.isArray(row.answer_files)
      ? (row.answer_files as NoteTemplateQuestion["files"])
      : [],
  }));
}
