export type ExamQuestionType = "objective" | "true_false" | "subjective";

export type ExamQuestionOption = {
  id?: number;
  text: string;
  is_correct: boolean;
};

export type ExamQuestionFile = {
  id?: number;
  url: string;
  name?: string;
  publicId?: string;
  resourceType?: string;
  fileType?: string;
  size?: number;
};

export type ExamQuestion = {
  id?: number;
  client_id?: string;
  question_text: string;
  question_type: ExamQuestionType;
  marks: number;
  explanation?: string | null;
  options: ExamQuestionOption[];
  files: ExamQuestionFile[];
  display_order: number;
};

export type ExamSyllabusNode = {
  id: number;
  title: string;
  node_type: string;
  subject_id: number;
  subject_name: string | null;
  syllabus_id: number;
  syllabus_title: string | null;
};

export type ExamRow = {
  id: number;
  exam_series_id?: number | null;
  title: string;
  description: string | null;
  total_marks: number;
  exam_date: string | null;
  exam_time: string | null;
  exam_place: string | null;
  exam_mode: "offline" | "online" | "hybrid" | string;
  result_date: string | null;
  instant_result: boolean;
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
  assigned_exam_id?: number | null;
  duration_minutes?: number | null;
  ai_question_format?: {
    enabled?: boolean;
    true_false: number;
    objective: number;
    subjective: number;
  } | null;
  target_type?: "INSTITUTION" | "PROGRAM" | "SECTION" | "STUDENT" | null;
  target_id?: number | null;
  target_program_id?: number | null;
  target_label?: string | null;
  target_program_label?: string | null;
  syllabus_node_ids?: number[];
  syllabus_nodes?: ExamSyllabusNode[];
  questions?: ExamQuestion[];
  is_government_exam?: boolean;
  conducting_body?: string | null;
  exam_category?: string | null;
  application_start_date?: string | null;
  application_end_date?: string | null;
  admit_card_date?: string | null;
  apply_url?: string | null;
  official_website_url?: string | null;
  notification_pdf_url?: string | null;
  eligibility_criteria?: string | null;
  application_fee?: string | null;
};


export type ExamSeriesRow = {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  from_date: string;
  to_date: string;
  is_active: boolean;
  target_type?: "INSTITUTION" | "PROGRAM" | "SECTION" | "STUDENT" | null;
  target_id?: number | null;
  target_program_id?: number | null;
  target_label?: string | null;
  target_program_label?: string | null;
  result_date?: string | null;
  instant_result?: boolean;
  marketplace_requested?: boolean;
  marketplace_approved?: boolean;
  source_institution_id: number;
  institution_name: string | null;
  inherited_by_institution_name?: string | null;
  has_inherited_subjects?: boolean;
  created_by: number | null;
  created_by_name: string | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
  subject_count: number;
  question_count: number;
  active_count: number;
  blocked_count: number;
  subjects?: ExamRow[];
};



