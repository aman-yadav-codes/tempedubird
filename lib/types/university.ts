export type UniversityType =
  | "central"
  | "state"
  | "deemed"
  | "private"
  | "autonomous"
  | "institute_of_national_importance"
  | "international";

export interface University {
  id: number;
  name: string;
  slug: string;
  code?: string | null;
  university_type?: UniversityType | string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  website_url?: string | null;
  logo_url?: string | null;
  established_year?: number | null;
  accreditation?: string | null;
  description?: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ListUniversitiesOptions {
  type?: string | null;
  country?: string | null;
  state?: string | null;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateUniversityData {
  name: string;
  slug?: string;
  code?: string | null;
  university_type?: UniversityType | string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  website_url?: string | null;
  logo_url?: string | null;
  established_year?: number | null;
  accreditation?: string | null;
  description?: string | null;
  is_active?: boolean;
}

export interface UpdateUniversityData {
  name?: string;
  slug?: string;
  code?: string | null;
  university_type?: UniversityType | string | null;
  country?: string | null;
  state?: string | null;
  city?: string | null;
  website_url?: string | null;
  logo_url?: string | null;
  established_year?: number | null;
  accreditation?: string | null;
  description?: string | null;
  is_active?: boolean;
}
