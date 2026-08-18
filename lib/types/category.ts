export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  depth: number;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  children?: Category[];
}

export type TreeNodeType =
  | 'category'
  | 'board'
  | 'subject';

export interface CategoryTreeNode {
  id: number;
  name: string;
  slug: string;

  type: TreeNodeType;

  parent_id?: number | null;
  depth?: number;

  categoryId?: number;
  boardId?: number;

  is_active: boolean;
  is_deleted: boolean;

  created_at: string;
  updated_at?: string;

  children: CategoryTreeNode[];

  hasChildren?: boolean;
  isLoading?: boolean;
  breadcrumb?: string;
  rootName?: string;
parentName?: string;
boardName?: string;
}

export interface ListCategoriesOptions {
  search?: string;
  onlyRoot?: boolean;
  showRootsFirst?: boolean;
  onlyClass?: boolean;
  onlyLeaf?: boolean;
  limit?: number;
  offset?: number;
}

export interface CreateCategoryData {
  name: string;
  slug: string;
  parentId: number | null;
}