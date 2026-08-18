export interface Board {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
}

export interface ListBoardsOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateBoardData {
  name: string;
  slug: string;
}