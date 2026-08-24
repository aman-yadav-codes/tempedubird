import type { PickedLocation } from "@/components/shared/google-location-picker";

export type RoleOption = {
    id: number;
    name: string;
    code?: string | null;
    scope_code?: string | null;
};

export type DesignationOption = {
    id: number;
    name: string;
    slug: string;
};

export type InstitutionOption = {
    id: number;
    name: string;
    slug: string;
    board_id: number | null;
    board_name?: string | null;
};

export type QualificationOption = {
    id: number;
    name: string;
    slug: string;
};

export type MasterOrgOption = {
    id: number;
    name: string;
    slug: string;
    type: "company" | "institution";
};

export type ExperienceForm = {
    id: string;
    job_title: string;
    company_id: string;
    company_name: string;
    from_month: string;
    from_year: string;
    to_month: string;
    to_year: string;
    is_current: boolean;
};

export type EducationForm = {
    id: string;
    qualification: string;
    institution_id: string;
    institution_name?: string;
    from_year: string;
    to_year: string;
};

export type CertificationForm = {
    id: string;
    name: string;
    issued_authority: string;
    duration: string;
};

export type UserDocumentForm = {
    id: string;
    document_type: string;
    document_number: string;
    file_url: string;
    public_id: string;
    resource_type: string;
    files: {
        url: string;
        publicId: string;
        resourceType: string;
        fileType: string;
        name?: string;
        size?: number;
    }[];
    is_verified: boolean;
};

export type SalaryComponentForm = {
    id: string;
    label: string;
    amount: string;
};

export type AddUserForm = {
    full_name: string;
    email: string;
    phone: string;
    avatar_url: string;
    role_id: string;
    is_active: boolean;
    is_verified: boolean;
    is_profile_complete: boolean;
    is_marketplace_enabled?: boolean;
    about: string;
    is_teacher: boolean;
    teacher_type: string;
    under_institution_id: string;
    under_institution_name: string;
    institution_ids: string[];
    designation_id: string;
    designation_name: string;
    gender: string;
    hourly_charges: string;
    location: PickedLocation | null;
    full_address: string;
    experiences: ExperienceForm[];
    education: EducationForm[];
    certifications: CertificationForm[];
    documents: UserDocumentForm[];
    salary_components: SalaryComponentForm[];
    teaching_categories: string[];
    teaching_subjects: string[];
};

export type TeachingOption = {
    id: number;
    value: string;
    label: string;
    description?: string;
};
