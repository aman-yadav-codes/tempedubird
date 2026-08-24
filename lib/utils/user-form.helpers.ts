import { capitalize } from "@/lib/utils/capitalize";
import type { AdminUserDetails } from "@/lib/queries/user";

import { NO_GENDER } from "@/lib/utils/user-form.constants";
import type {
    AddUserForm,
    CertificationForm,
    EducationForm,
    ExperienceForm,
    RoleOption,
    SalaryComponentForm,
    UserDocumentForm,
} from "@/app/admin/users/_components/types";

let tempId = 0;

export function nextId() {
    tempId += 1;
    return `${Date.now()}-${tempId}`;
}

export function currentYear() {
    return String(new Date().getFullYear());
}

export function currentMonth() {
    return String(new Date().getMonth() + 1);
}

export function asString(value: unknown) {
    return typeof value === "string" ? value : "";
}

export function safeTrim(value: unknown) {
    return asString(value).trim();
}

export function hasAnyValue(values: Array<string | null | undefined>) {
    return values.some((value) => safeTrim(value).length > 0);
}

export function normalizeText(value: string) {
    const trimmed = safeTrim(value);
    return trimmed ? capitalize(trimmed) : "";
}

export function normalizeNullableText(value: string) {
    const trimmed = safeTrim(value);
    return trimmed ? capitalize(trimmed) : null;
}

export function normalizeEmail(value: string) {
    return safeTrim(value).toLowerCase();
}

export function normalizeLocation(
    location: AdminUserDetails["location"]
): AddUserForm["location"] {
    if (!location) return null;

    return {
        latitude: location.latitude ?? "",
        longitude: location.longitude ?? "",
        country: location.country ?? "",
        state: location.state ?? "",
        city: location.city ?? "",
        area: location.area ?? "",
        pincode: location.pincode ?? "",
        full_address: location.full_address ?? location.formatted_address ?? "",
        formatted_address: location.formatted_address ?? "",
        place_id: location.place_id ?? "",
    };
}

export function blankExperience(): ExperienceForm {
    return {
        id: nextId(),
        job_title: "",
        company_name: "",
        company_id: "",
        from_month: currentMonth(),
        from_year: currentYear(),
        to_month: currentMonth(),
        to_year: currentYear(),
        is_current: false,
    };
}

export function blankEducation(): EducationForm {
    return {
        id: nextId(),
        qualification: "",
        institution_id: "",
        institution_name: "",
        from_year: currentYear(),
        to_year: currentYear(),
    };
}

export function blankCertification(): CertificationForm {
    return {
        id: nextId(),
        name: "",
        issued_authority: "",
        duration: "",
    };
}

export function blankUserDocument(): UserDocumentForm {
    return {
        id: nextId(),
        document_type: "",
        document_number: "",
        file_url: "",
        public_id: "",
        resource_type: "",
        files: [],
        is_verified: false,
    };
}

export function blankSalaryComponent(): SalaryComponentForm {
    return {
        id: nextId(),
        label: "",
        amount: "",
    };
}

function getUserDocumentName(url?: string | null) {
    if (!url) return "Uploaded image";
    try {
        return decodeURIComponent(new URL(url).pathname.split("/").pop() || "Uploaded image");
    } catch {
        return url.split("/").pop() || "Uploaded image";
    }
}

export function getInitialForm(
    roles: RoleOption[],
    user?: AdminUserDetails | null
): AddUserForm {
    const defaultRole =
        roles.find((role) => role.code === "guest") ??
        roles.find((role) => role.code === "platform_admin") ??
        roles[0];

    const institutions = user?.institutions ?? [];
    const experiences = user?.experiences ?? [];
    const education = user?.education ?? [];
    const certifications = user?.certifications ?? [];
    const documents = user?.documents ?? [];
    const salaryComponents = user?.salary_components ?? [];
    const teachingCategories = user?.teaching_categories ?? [];
    const teachingSubjects = user?.teaching_subjects ?? [];

    return {
        full_name: user?.full_name ?? "",
        email: user?.email ?? "",
        phone: user?.phone ?? "",
        avatar_url: user?.avatar_url ?? "",
        role_id: user
            ? user.role_id
                ? String(user.role_id)
                : ""
            : defaultRole
                ? String(defaultRole.id)
                : "",
        is_active: user?.is_active ?? true,
        is_verified: user?.is_verified ?? false,
        is_profile_complete: user?.is_profile_complete ?? false,
        is_marketplace_enabled: (user as any)?.is_marketplace_enabled ?? (user?.profile as any)?.is_marketplace_enabled ?? true,
        about: user?.profile.about ?? "",
        is_teacher: user?.profile.is_teacher ?? false,
        teacher_type: user?.profile.teacher_type ?? "",
        under_institution_id: user?.profile.under_institution_id
            ? String(user.profile.under_institution_id)
            : "",
        under_institution_name: user?.profile.under_institution_name ?? "",
        institution_ids:
            institutions.length
                ? institutions.map((institution) => String(institution.id))
                : user?.profile.under_institution_id
                    ? [String(user.profile.under_institution_id)]
                    : [],
        designation_id: user?.profile.designation_id
            ? String(user.profile.designation_id)
            : "",
        designation_name: user?.profile.designation_name ?? "",
        gender: user?.profile.gender ?? NO_GENDER,
        hourly_charges: user?.profile.hourly_charges
            ? String(user.profile.hourly_charges)
            : "",
        location: normalizeLocation(user?.location ?? null),
        full_address:
            user?.location?.full_address ?? user?.location?.formatted_address ?? "",
        experiences:
            experiences.map((experience) => ({
                id: String(experience.id),
                job_title: asString(experience.job_title),
                company_id: "",
                company_name: asString(experience.company_name),
                from_month: String(experience.from_month),
                from_year: String(experience.from_year),
                to_month: experience.to_month ? String(experience.to_month) : currentMonth(),
                to_year: experience.to_year ? String(experience.to_year) : currentYear(),
                is_current: experience.is_current,
            })),
        education:
            education.map((education) => ({
                id: String(education.id),
                qualification: asString(education.qualification),
                institution_id: education.institution_id ? String(education.institution_id) : "",
                institution_name: asString(education.institution_name),
                from_year: String(education.from_year),
                to_year: String(education.to_year),
            })),
        certifications:
            certifications.map((certification) => ({
                id: String(certification.id),
                name: asString(certification.name),
                issued_authority: certification.issued_authority ?? "",
                duration: certification.duration ?? "",
            })),
        documents:
            documents.map((document) => ({
                id: String(document.id),
                document_type: document.document_type ?? "",
                document_number: document.document_number ?? "",
                file_url: document.file_url ?? "",
                public_id: document.public_id ?? "",
                resource_type: document.resource_type ?? "",
                files: document.file_url
                    ? [{
                        url: document.file_url,
                        publicId: document.public_id ?? "",
                        resourceType: document.resource_type ?? "image",
                        fileType: "image/*",
                        name: getUserDocumentName(document.file_url),
                    }]
                    : [],
                is_verified: Boolean(document.is_verified),
            })),
        salary_components:
            salaryComponents.map((component) => ({
                id: String(component.id),
                label: component.label ?? "",
                amount: component.amount ? String(component.amount) : "",
            })),
        teaching_categories:
            teachingCategories.map((category) => String(category.id)),
        teaching_subjects:
            teachingSubjects.map((subject) => String(subject.id)),
    };
}
