export type CourseAuthorityType = "board" | "university" | "certification" | "none";

export interface MasterCourseSubject {
  id: number;
  name: string;
  code?: string | null;
  slug?: string;
  term_type?: string | null;
  term_number?: number | null;
  term_name?: string | null;
}

export interface MasterCourse {
  id: number;
  name: string;
  slug: string;
  code?: string | null;
  category_id: number;
  category_name?: string;
  category_breadcrumb?: string;
  authority_type: CourseAuthorityType;
  board_id?: number | null;
  board_name?: string | null;
  university_id?: number | null;
  university_name?: string | null;
  certification_provider_id?: number | null;
  certification_provider_name?: string | null;
  duration_value?: number | null;
  duration_unit?: "days" | "weeks" | "months" | "years" | string | null;
  mediums?: string[] | null;
  medium?: string | null;
  seats_available?: number | null;
  description?: string | null;
  thumbnail_url?: string | null;
  icon_url?: string | null;
  is_active: boolean;
  is_deleted: boolean;
  subjects?: MasterCourseSubject[];
  subject_ids?: number[];
  created_at: string;
  updated_at?: string;
}

export interface ListMasterCoursesOptions {
  search?: string;
  categoryId?: number;
  authorityType?: string;
  limit?: number;
  offset?: number;
}

export interface CreateMasterCourseData {
  name: string;
  slug?: string;
  code?: string | null;
  categoryId: number;
  authorityType?: CourseAuthorityType;
  boardId?: number | null;
  universityId?: number | null;
  universityName?: string | null;
  certificationProviderId?: number | null;
  durationValue?: number | null;
  durationUnit?: string | null;
  mediums?: string[] | null;
  medium?: string | null;
  seatsAvailable?: number | null;
  description?: string | null;
  thumbnail_url?: string | null;
  icon_url?: string | null;
  subjectIds?: number[];
  customSubjects?: {
    name: string;
    code?: string | null;
    term_type?: string | null;
    term_number?: number | null;
    term_name?: string | null;
  }[];
  isActive?: boolean;
}

export interface UpdateMasterCourseData {
  name?: string;
  slug?: string;
  code?: string | null;
  categoryId?: number;
  authorityType?: CourseAuthorityType;
  boardId?: number | null;
  universityId?: number | null;
  universityName?: string | null;
  certificationProviderId?: number | null;
  durationValue?: number | null;
  durationUnit?: string | null;
  mediums?: string[] | null;
  medium?: string | null;
  seatsAvailable?: number | null;
  description?: string | null;
  thumbnail_url?: string | null;
  icon_url?: string | null;
  subjectIds?: number[];
  customSubjects?: {
    name: string;
    code?: string | null;
    term_type?: string | null;
    term_number?: number | null;
    term_name?: string | null;
  }[];
  isActive?: boolean;
}
