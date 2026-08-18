export type PracticeExamQuestionType = "objective" | "true_false" | "subjective";

export type PracticeExamQuestionOption = {
  id?: number;
  text: string;
  is_correct: boolean;
};

export type PracticeExamQuestionFile = {
  id?: number;
  url: string;
  name?: string;
  publicId?: string;
  resourceType?: string;
  fileType?: string;
  size?: number;
};

export type PracticeExamQuestion = {
  id?: number;
  client_id?: string;
  question_text: string;
  question_type: PracticeExamQuestionType;
  marks: number;
  explanation?: string | null;
  options: PracticeExamQuestionOption[];
  files: PracticeExamQuestionFile[];
  display_order: number;
};

export type PracticeExamSyllabusNode = {
  id: number;
  title: string;
  node_type: string;
  subject_id: number;
  subject_name: string | null;
  syllabus_id: number;
  syllabus_title: string | null;
};

export type PracticeExamRow = {
  id: number;
  title: string;
  description: string | null;
  total_marks: number;
  ai_question_format?: {
    enabled?: boolean;
    true_false: number;
    objective: number;
  } | null;
  is_public: boolean;
  marketplace_requested: boolean;
  marketplace_requested_at: string | null;
  marketplace_requested_by: number | null;
  marketplace_requested_by_name: string | null;
  marketplace_approved: boolean;
  marketplace_approved_at: string | null;
  marketplace_approved_by: number | null;
  marketplace_approved_by_name: string | null;
  parent_template_id: number | null;
  parent_institution_name?: string | null;
  parent_is_public?: boolean | null;
  inherited_by_institution_name?: string | null;
  is_active: boolean;
  version: number;
  source_institution_id: number | null;
  institution_name: string | null;
  created_by: number;
  created_by_name: string | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
  question_count: number;
  attachment_count: number;
  blocked_by_platform: boolean;
  blocked_by_name: string | null;
  blocked_at: string | null;
  block_reason: string | null;
  assigned_practice_exam_id?: number | null;
  duration_minutes?: number | null;
  target_type?: "INSTITUTION" | "PROGRAM" | "SECTION" | "STUDENT" | null;
  target_id?: number | null;
  target_program_id?: number | null;
  target_label?: string | null;
  target_program_label?: string | null;
  syllabus_node_ids?: number[];
  syllabus_nodes?: PracticeExamSyllabusNode[];
  questions?: PracticeExamQuestion[];
};



