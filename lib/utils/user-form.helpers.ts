import { capitalize } from "@/lib/utils/capitalize";
import type { AdminUserDetails } from "@/lib/queries/user";

import { NO_GENDER } from "@/lib/utils/user-form.constants";
import type {
    AddUserForm,
    CertificationForm,
    CommissionForm,
    CommissionRuleItem,
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

export function blankSalaryComponent(
    label: string = "",
    amount: string = "",
    type: "EARNING" | "DEDUCTION" = "EARNING"
): SalaryComponentForm {
    return {
        id: nextId(),
        label,
        amount,
        type,
    };
}

export function blankCommissionRule(
    trigger: string = "successful_enrollment",
    label: string = "Successful Student Enrollment / Admission",
    rewardType: "PERCENTAGE" | "FIXED_AMOUNT" = "PERCENTAGE",
    rate: string = "10"
): CommissionRuleItem {
    return {
        id: nextId(),
        condition_trigger: trigger,
        condition_label: label,
        reward_type: rewardType,
        rate: rate,
        minimum_threshold: "",
        payout_frequency: "MONTHLY",
        notes: "",
    };
}

export function blankCommission(): CommissionForm {
    return {
        enabled: true,
        commission_type: "RULES_BASED",
        commission_rate: "",
        commission_trigger: "course_admission",
        minimum_threshold: "",
        payout_frequency: "MONTHLY",
        notes: "",
        rules: [
            blankCommissionRule("successful_enrollment", "Successful Student Enrollment / Admission", "PERCENTAGE", "10"),
            blankCommissionRule("lead_generated", "Lead / Inquiry Brought (Lead Generation)", "FIXED_AMOUNT", "100"),
            blankCommissionRule("fee_collected", "Student Fee Collection Recovery", "PERCENTAGE", "5"),
        ],
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

export function getInitialForm(user?: AdminUserDetails | null): AddUserForm {
    const experiences = user?.experiences ?? [];
    const education = user?.education ?? [];
    const certifications = user?.certifications ?? [];
    const documents = user?.documents ?? [];
    const salaryComponents = user?.salary_components ?? [];
    const teachingCategories = user?.teaching_categories ?? [];
    const teachingSubjects = user?.teaching_subjects ?? [];

    return {
        full_name: asString(user?.full_name),
        email: asString(user?.email),
        phone: asString(user?.phone),
        avatar_url: asString(user?.avatar_url),
        role_id: user?.roles?.[0]?.id ? String(user.roles[0].id) : "",
        is_active: user?.is_active ?? true,
        is_verified: user?.is_verified ?? false,
        is_profile_complete: user?.is_profile_complete ?? false,
        is_marketplace_enabled: user?.profile?.is_marketplace_enabled ?? false,
        about: user?.profile?.about ?? "",
        is_teacher: user?.profile?.is_teacher ?? false,
        teacher_type: user?.profile?.teacher_type ?? "",
        under_institution_id: user?.profile?.under_institution_id ? String(user.profile.under_institution_id) : "",
        under_institution_name: asString(user?.profile?.under_institution_name),
        institution_ids: (user?.profile?.institution_ids ?? []).map(String),
        designation_id: user?.profile?.designation_id ? String(user.profile.designation_id) : "",
        designation_name: asString(user?.profile?.designation_name),
        gender: user?.profile?.gender ?? NO_GENDER,
        joining_date: (user?.profile as any)?.joining_date ? String((user?.profile as any)?.joining_date).split("T")[0] : "",
        date_of_birth: (user?.profile as any)?.date_of_birth ? String((user?.profile as any)?.date_of_birth).split("T")[0] : "",
        shift_timing: (user?.profile as any)?.shift_timing ? String((user?.profile as any)?.shift_timing) : "09:00 AM - 05:00 PM (General Shift)",
        employment_status: (user?.profile as any)?.employment_status ? String((user?.profile as any)?.employment_status) : "ACTIVE",
        hourly_charges: user?.profile?.hourly_charges ? String(user.profile.hourly_charges) : "",
        location: user?.location ?? null,
        full_address: user?.location?.formatted_address ?? "",
        experiences:
            experiences.length > 0
                ? experiences.map((experience) => ({
                    id: String(experience.id),
                    company_name: asString(experience.company_name),
                    job_title: asString(experience.job_title),
                    from_month: asString(experience.from_month),
                    from_year: String(experience.from_year),
                    to_month: asString(experience.to_month),
                    to_year: String(experience.to_year),
                    is_current: Boolean(experience.is_current),
                }))
                : [blankExperience()],
        education:
            education.length > 0
                ? education.map((edu) => ({
                    id: String(edu.id),
                    qualification: asString(edu.qualification),
                    institution_id: edu.institution_id ? String(edu.institution_id) : "",
                    institution_name: asString(edu.institution_name),
                    from_year: String(edu.from_year),
                    to_year: String(edu.to_year),
                }))
                : [blankEducation()],
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
        salary_frequency: (user?.profile as any)?.salary_frequency ?? "MONTHLY",
        salary_notes: (user?.profile as any)?.salary_notes ?? "",
        salary_components:
            salaryComponents.length > 0
                ? salaryComponents.map((component) => ({
                    id: String(component.id),
                    label: component.label ?? "",
                    amount: component.amount ? String(component.amount) : "",
                    type: component.label?.toLowerCase().includes("deduction") ||
                          component.label?.toLowerCase().includes("pf") ||
                          component.label?.toLowerCase().includes("tax") ||
                          component.label?.toLowerCase().includes("esi")
                        ? "DEDUCTION"
                        : "EARNING",
                }))
                : [
                    blankSalaryComponent("Basic Pay", "", "EARNING"),
                    blankSalaryComponent("House Rent Allowance (HRA)", "", "EARNING"),
                    blankSalaryComponent("Special Allowance", "", "EARNING"),
                ],
        teaching_categories:
            teachingCategories.map((category) => String(category.id)),
        teaching_subjects:
            teachingSubjects.map((subject) => String(subject.id)),
        commission: (user as any)?.commission ?? (user?.profile as any)?.commission ?? blankCommission(),
    };
}
