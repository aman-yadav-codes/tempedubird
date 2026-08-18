export interface Subject {
  id: number;
  category_id: number;
  board_id: number;
  name: string;
  slug: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
}

export interface ListSubjectsOptions {
  categoryId: number;
  boardId: number;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateSubjectData {
  categoryId: number;
  boardId: number;
  name: string;
  slug: string;
}