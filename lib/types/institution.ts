import type { AiScholarshipResponse } from "@/lib/types/ai";

export interface MasterType {
  id: number;
  name: string;
  slug: string;
  is_active: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ListMasterOptions {
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateMasterData {
  name: string;
  slug: string;
}

export interface UpdateMasterData {
  id: number;
  name: string;
  slug: string;
}

export interface InstitutionProfile {
  id: number;
  name: string;
  slug: string;
  institution_type_id: number;
  institution_subtype_id?: number | null;
  add_source?: number | null;
  organization_name?: string | null;
  type_name?: string | null;
  subtype_name?: string | null;
  phone?: string | null;
  email?: string | null;
  established_year?: number | null;
  website?: string | null;
  about?: string | null;
  mission?: string | null;
  vision?: string | null;
  goal?: string | null;
  founder_name?: string | null;
  founder_title?: string | null;
  founder_image_url?: string | null;
  founder_about?: string | null;
  ai_content?: Record<string, unknown> | null;
  location_id?: number | null;
  parent_university_id?: number | null;
  parent_university_name?: string | null;
  board_id?: number | null;
  board_name?: string | null;
  location_name?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  is_marketplace_enabled?: boolean | null;
  is_active: boolean;
  is_deleted: boolean;
  created_by?: number | null;
  created_by_name?: string | null;
  created_by_role?: string | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface InstitutionFacility {
  id: number;
  institution_id: number;
  facility_type_id: number;
  facility_type_name?: string | null;
  facility_type_slug?: string | null;
  title?: string | null;
  description?: string | null;
  image_url?: string | null;
  ai_description?: Record<string, unknown> | null;
  display_order: number;
  is_active: boolean;
  is_deleted: boolean;
  created_by?: number | null;
  created_by_name?: string | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
  media?: InstitutionFacilityMedia[];
}

export interface InstitutionFacilitySummary {
  institution_id: number;
  institution_name: string;
  institution_slug?: string | null;
  facility_count: number;
  media_count: number;
  is_active: boolean;
  updated_at?: string | null;
}

export interface InstitutionFacilityMedia {
  id: number;
  institution_facility_id: number;
  media_type: "image" | "video";
  url: string;
  title?: string | null;
  sort_order: number;
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface UpsertInstitutionFacilityData {
  facilityTypeId: number;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  aiDescription?: Record<string, unknown> | null;
  media?: Array<{
    mediaType?: "image" | "video";
    url: string;
    title?: string | null;
    sortOrder?: number;
  }>;
  displayOrder?: number;
  isActive?: boolean;
}

export interface ListInstitutionsOptions {
  search?: string;
  institutionId?: number;
  institutionIds?: number[];
  typeId?: number | null;
  typeSearch?: string | null;
  subtypeId?: number | null;
  locationId?: number | null;
  categoryId?: number | null;
  isActive?: boolean | null;
  limit?: number;
  offset?: number;
}

export interface CreateInstitutionData {
  name: string;
  slug?: string | null;
  institutionTypeId: number;
  institutionSubtypeId?: number | null;
  isActive?: boolean;
  addSource?: number | null;
  phone?: string | null;
  email?: string | null;
  establishedYear?: number | null;
  website?: string | null;
  about?: string | null;
  mission?: string | null;
  vision?: string | null;
  goal?: string | null;
  founderName?: string | null;
  founderTitle?: string | null;
  founderImageUrl?: string | null;
  founderAbout?: string | null;
  aiContent?: Record<string, unknown> | null;
  locationId?: number | null;
  parentUniversityId?: number | null;
  boardId?: number | null;
  categoryIds?: number[];
  isMarketplaceEnabled?: boolean | null;
  createdBy?: number | null;
}

export interface UpdateInstitutionData extends Partial<CreateInstitutionData> {
  id: number;
  updatedBy?: number | null;
}

export interface InstitutionProgram {
  id: number;
  institution_id: number;
  institution_name?: string;
  program_type_id: number;
  program_type_name?: string;
  slug: string;
  title: string;
  about?: string | null;
  duration_value?: number | null;
  duration_unit?: string | null;
  seats_available?: number | null;
  teaching_method?: string | null;
  board_id?: number | null;
  board_name?: string | null;
  university_id?: number | null;
  academic_year_id?: number | null;
  academic_year_name?: string | null;
  is_active: boolean;
  is_deleted: boolean;
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
  category_ids?: number[];
  category_names?: string[];
  language_ids?: number[];
  language_names?: string[];
  subject_ids?: number[];
  subject_names?: string[];
  subject_category_ids?: number[];
  subject_category_names?: string[];
  section_ids?: number[];
  section_names?: string[];
}

export interface ListProgramsOptions {
  search?: string;
  institutionId?: number | null;
  typeId?: number | null;
  limit?: number;
  offset?: number;
}

export interface CreateProgramData {
  institutionId: number;
  programTypeId: number;
  slug?: string | null;
  title: string;
  about?: string | null;
  durationValue?: number | null;
  durationUnit?: string | null;
  seatsAvailable?: number | null;
  teachingMethod?: string | null;
  boardId?: number | null;
  universityId?: number | null;
  academicYearId?: number | null;
  categoryIds?: number[];
  languageIds?: number[];
  subjectIds?: number[];
  subjectCategoryIds?: number[];
  sectionIds?: number[];
  feeComponents?: {
    title: string;
    amount: number;
    unit?: string | null;
    payment_mode?: string | null;
    discount_type?: string | null;
    discount_value?: number | null;
    final_amount?: number | null;
    installments_count?: number | null;
  }[];
  createdBy?: number | null;
}

export interface UpdateProgramData extends Partial<CreateProgramData> {
  id: number;
  isActive?: boolean;
  updatedBy?: number | null;
}

export interface InstitutionPlacement {
  id: number;
  institution_id: number;
  program_id?: number | null;
  institution_name?: string;
  program_name?: string | null;
  year: number;
  average_package?: number | null;
  highest_package?: number | null;
  lowest_package?: number | null;
  placement_percentage?: number | null;
  total_students?: number | null;
  placed_students?: number | null;
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ListPlacementsOptions {
  institutionId?: number | null;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreatePlacementData {
  institutionId: number;
  programId?: number | null;
  year: number;
  averagePackage?: number | null;
  highestPackage?: number | null;
  lowestPackage?: number | null;
  placementPercentage?: number | null;
  totalStudents?: number | null;
  placedStudents?: number | null;
  createdBy?: number | null;
}

export interface UpdatePlacementData extends Partial<CreatePlacementData> {
  id: number;
  updatedBy?: number | null;
}

export interface InstitutionCutoff {
  id: number;
  institution_id: number;
  program_id?: number | null;
  academic_year_id?: number | null;
  institution_name?: string;
  program_name?: string;
  academic_year_name?: string | null;
  years_to_generate: number;
  exam_name?: string | null;
  ai_response: Record<string, unknown>;
  is_active: boolean;
  is_deleted: boolean;
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ListCutoffsOptions {
  institutionId?: number | null;
  programId?: number | null;
  academicYearId?: number | null;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateCutoffData {
  institutionId: number;
  programId?: number | null;
  academicYearId?: number | null;
  yearsToGenerate: number;
  examName?: string | null;
  aiResponse: Record<string, unknown>;
  isActive?: boolean;
  createdBy?: number | null;
}

export interface UpdateCutoffData extends Partial<CreateCutoffData> {
  id: number;
  isDeleted?: boolean;
  updatedBy?: number | null;
}

export interface InstitutionScholarship {
  id: number;
  institution_id: number;
  institution_name?: string;
  ai_response: AiScholarshipResponse;
  is_ai_generated: boolean;
  is_active: boolean;
  is_deleted: boolean;
  created_by?: number | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface ListScholarshipsOptions {
  institutionId?: number | null;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateScholarshipData {
  institutionId: number;
  aiResponse: AiScholarshipResponse;
  isAiGenerated?: boolean;
  isActive?: boolean;
  createdBy?: number | null;
}

export interface UpdateScholarshipData extends Partial<CreateScholarshipData> {
  id: number;
  isDeleted?: boolean;
  updatedBy?: number | null;
}

export interface InstitutionNews {
  id: number;
  institution_id: number;
  academic_year_id?: number | null;
  institution_name?: string;
  slug: string;
  title: string;
  content?: string | null;
  image_urls?: string[] | null;
  published_at: string;
  is_active: boolean;
  is_deleted: boolean;
  created_by?: number | null;
  created_by_name?: string | null;
  created_by_role?: string | null;
  updated_by?: number | null;
  created_at: string;
  updated_at: string;
  target_type: "WHOLE_INSTITUTION" | "ROLE" | "PROGRAM" | "SECTION" | "USER";
  target_role_code?: "teacher" | "student" | null;
  target_id?: number | null;
  target_program_id?: number | null;
  target_label?: string | null;
}

export interface ListNewsOptions {
  institutionId?: number | null;
  academicYearId?: number | null;
  search?: string;
  limit?: number;
  offset?: number;
  createdBy?: number | null;
  excludeCreatedBy?: number | null;
  recipient?: {
    userId?: number | null;
    roleCodes?: string[];
    studentIds?: number[];
    programIds?: number[];
    sectionIds?: number[];
  } | null;
}

export interface CreateNewsData {
  institutionId: number;
  academicYearId?: number | null;
  slug: string;
  title: string;
  content?: string | null;
  imageUrls?: string[] | null;
  publishedAt?: string | null;
  isActive?: boolean;
  createdBy?: number | null;
  targetType?: "WHOLE_INSTITUTION" | "ROLE" | "PROGRAM" | "SECTION" | "USER";
  targetRoleCode?: "teacher" | "student" | null;
  targetId?: number | null;
  targetProgramId?: number | null;
  targetLabel?: string | null;
  sellOnMarketplace?: boolean;
  marketplacePrice?: number;
}

export interface UpdateNewsData extends Partial<CreateNewsData> {
  id: number;
  updatedBy?: number | null;
}

export interface BranchPhone {
  title: string;
  phone: string;
}

export interface BranchEmail {
  title: string;
  email: string;
}

export interface InstitutionBranch {
  id: number;
  institution_id: number;
  branch_name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  working_hours?: string | null;
  phones: BranchPhone[];
  emails: BranchEmail[];
  is_primary: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateInstitutionBranchInput {
  institutionId: number;
  branchName: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  workingHours?: string | null;
  phones?: BranchPhone[];
  emails?: BranchEmail[];
  isPrimary?: boolean;
  sortOrder?: number;
  isActive?: boolean;
}

export interface InstitutionCourse {
  id: number;
  institution_id: number;
  course_name: string;
  stream?: string | null;
  board_or_university?: string | null;
  duration?: string | null;
  price?: string | null;
  fee_amount?: number | null;
  eligibility?: string | null;
  description?: string | null;
  seats_available?: number | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateInstitutionCourseInput {
  institutionId: number;
  courseName: string;
  stream?: string | null;
  boardOrUniversity?: string | null;
  duration?: string | null;
  price?: string | null;
  feeAmount?: number | null;
  eligibility?: string | null;
  description?: string | null;
  seatsAvailable?: number | null;
  sortOrder?: number;
  isActive?: boolean;
}

