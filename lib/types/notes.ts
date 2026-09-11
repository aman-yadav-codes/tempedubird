export type NoteQuestionType = "objective" | "true_false" | "subjective";

export type NoteQuestionOption = {
  id?: number;
  text: string;
  is_correct: boolean;
};

export type NoteQuestionFile = {
  id?: number;
  url: string;
  name?: string;
  publicId?: string;
  resourceType?: string;
  fileType?: string;
  size?: number;
};

export type NoteTemplateQuestion = {
  id?: number;
  client_id?: string;
  question_text: string;
  question_type: NoteQuestionType;
  answer_text?: string;
  correct_answer?: string;
  options: NoteQuestionOption[];
  files: NoteQuestionFile[];
  answer_files?: NoteQuestionFile[];
  display_order: number;
};

export type NoteSyllabusNode = {
  id: number;
  title: string;
  node_type: string;
  subject_id: number;
  subject_name: string | null;
  syllabus_id: number;
  syllabus_title: string | null;
};

export type NoteTemplateRow = {
  id: number;
  title: string;
  description: string | null;
  subject_id?: string | null;
  subject_name?: string | null;
  syllabus_data?: any[];
  ai_question_format?: {
    enabled?: boolean;
    true_false: number;
    objective: number;
    subjective: number;
  } | null;
  is_public: boolean;
  is_paid: boolean;
  price: number;
  marketplace_requested: boolean;
  marketplace_requested_at: string | null;
  marketplace_requested_by: number | null;
  marketplace_requested_by_name: string | null;
  marketplace_approved: boolean;
  marketplace_approved_at: string | null;
  marketplace_approved_by: number | null;
  marketplace_approved_by_name: string | null;
  source_note_id?: number | null;
  source_institution_id?: number | null;
  source_institution_name?: string | null;
  parent_template_id?: number | null;
  parent_institution_name?: string | null;
  parent_is_public?: boolean | null;
  inherited_by_institution_name?: string | null;
  is_active: boolean;
  version?: number;
  institution_id: number;
  institution_name: string | null;
  created_by: number;
  created_by_name: string | null;
  updated_by_name?: string | null;
  created_at: string;
  updated_at: string;
  item_count: number;
  question_count?: number;
  attachment_count?: number;
  blocked_by_platform?: boolean;
  blocked_by_name?: string | null;
  blocked_at?: string | null;
  block_reason?: string | null;
  target_type?: "INSTITUTION" | "PROGRAM" | "SECTION" | "STUDENT" | null;
  target_id?: number | null;
  target_program_id?: number | null;
  target_label?: string | null;
  target_program_label?: string | null;
  syllabus_node_ids?: number[];
  syllabus_nodes?: NoteSyllabusNode[];
  questions?: NoteTemplateQuestion[];
};
