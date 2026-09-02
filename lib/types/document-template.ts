export const DOCUMENT_FIELD_TYPES = [
  "text",
  "textarea",
  "image",
  "date",
  "number",
  "email",
  "phone",
] as const;

export type DocumentFieldType = (typeof DOCUMENT_FIELD_TYPES)[number];

export type DocumentTemplateField = {
  id?: number;
  field_name: string;
  label: string;
  field_type: DocumentFieldType;
  is_required: boolean;
  sort_order: number;
  preparation?: {
    is_mapped: boolean;
    has_default: boolean;
    needs_action: boolean;
    source_field_label?: string | null;
  };
};

export type DocumentTemplateRow = {
  id: number;
  card_category_id: number;
  category_name: string;
  category_target_audience?: "student" | "staff";
  name: string;
  thumbnail_url: string | null;
  html_template?: string;
  version: number;
  is_public: boolean;
  is_active: boolean;
  is_paid?: boolean;
  price?: number;
  currency?: string;
  is_purchased?: boolean;
  field_count: number;
  assignment_count: number;
  is_assigned_to_active_institution?: boolean;
  assigned_institution_names?: string[];
  assigned_institutions?: Array<{
    id: number;
    name: string;
  }>;
  generated_count: number;
  created_by_name: string | null;
  updated_by_name: string | null;
  created_at: string;
  updated_at: string;
  fields?: DocumentTemplateField[];
};

export type CardCategoryRow = {
  id: number;
  name: string;
  slug?: string;
  description?: string | null;
  target_audience?: "student" | "staff";
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  created_by_name?: string | null;
  updated_by_name?: string | null;
};

