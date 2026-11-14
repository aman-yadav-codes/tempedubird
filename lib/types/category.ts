export interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  depth: number;
  category_type?: string;
  business_category_id?: number | null;
  business_subcategory_id?: number | null;
  business_category_name?: string | null;
  business_subcategory_name?: string | null;
  icon_url?: string | null;
  image_url?: string | null;
  description?: string | null;
  seo_title?: string | null;
  meta_description?: string | null;
  display_order?: number;
  countries?: string[];
  synonyms?: string[];
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
  parentId?: number | null;
  limit?: number;
  offset?: number;
  category_type?: string;
  business_category_id?: number | null;
  business_subcategory_id?: number | null;
}

export interface CreateCategoryData {
  name: string;
  slug: string;
  parentId: number | null;
  category_type?: string;
  business_category_id?: number | null;
  business_subcategory_id?: number | null;
  icon_url?: string;
  image_url?: string;
  description?: string;
  seo_title?: string;
  meta_description?: string;
  display_order?: number;
  countries?: string[];
  synonyms?: string[];
}
