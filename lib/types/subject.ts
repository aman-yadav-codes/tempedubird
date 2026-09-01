export interface Subject {
  id: number;
  category_id?: number | null;
  category_name?: string | null;
  board_id?: number | null;
  board_name?: string | null;
  course_id?: number | null;
  course_name?: string | null;
  university_name?: string | null;
  certification_provider_name?: string | null;
  authority_type?: string | null;
  term_type?: string | null;
  term_number?: number | null;
  term_name?: string | null;
  name: string;
  slug: string;
  code?: string | null;
  icon_url?: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ListSubjectsOptions {
  categoryId?: number | null;
  boardId?: number | null;
  courseId?: number | null;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateSubjectData {
  categoryId?: number | null;
  boardId?: number | null;
  courseId?: number | null;
  term_type?: string | null;
  term_number?: number | null;
  term_name?: string | null;
  termType?: string | null;
  termNumber?: number | null;
  termName?: string | null;
  name: string;
  slug: string;
  code?: string | null;
  icon_url?: string | null;
  is_active?: boolean;
}

export interface UpdateSubjectData {
  name?: string;
  slug?: string;
  code?: string | null;
  icon_url?: string | null;
  categoryId?: number | null;
  boardId?: number | null;
  courseId?: number | null;
  term_type?: string | null;
  term_number?: number | null;
  term_name?: string | null;
  termType?: string | null;
  termNumber?: number | null;
  termName?: string | null;
  is_active?: boolean;
}