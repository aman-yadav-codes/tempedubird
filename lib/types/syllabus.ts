export type SyllabusNodeType =
  | "term"
  | "semester"
  | "module"
  | "unit"
  | "chapter"
  | "topic"
  | "subtopic"
  | "lesson"
  | "section";

export type Syllabus = {
  id: number;
  subject_id: number;
  subject_name: string;
  board_id: number | null;
  board_name: string | null;
  category_id: number | null;
  category_name: string | null;
  institution_id: number | null;
  institution_name: string | null;
  parent_syllabus_id: number | null;
  parent_syllabus_title: string | null;
  parent_syllabus_version: number | null;
  parent_is_template?: boolean | null;
  parent_is_public?: boolean | null;
  parent_institution_name?: string | null;
  inherited_by_institution_name?: string | null;
  title: string;
  description: string | null;
  version: number;
  upgrade_available?: boolean;
  is_modified_inherited?: boolean;
  is_template: boolean;
  is_public: boolean;
  is_active: boolean;
  node_count: number;
  created_at: string;
  updated_at: string;
};

export type SyllabusNode = {
  id: number;
  syllabus_id: number;
  parent_id: number | null;
  title: string;
  description: string | null;
  node_type: SyllabusNodeType | string;
  sort_order: number;
  estimated_hours: number | null;
  learning_outcomes: string | null;
  metadata: Record<string, unknown>;
  is_active: boolean;
  children?: SyllabusNode[];
};
