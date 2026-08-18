import type { BuiltInAiContentField, BuiltInAiContentTemplate } from "@/lib/types/ai";

type BuiltInAiContentConfig = {
    name: string;
    slug: string;
    promptTemplate: string;
    fields: Array<Pick<BuiltInAiContentField, "field_key" | "label">>;
};

const builtInAiContentConfigs: BuiltInAiContentConfig[] = [
    {
        name: "Institution Details",
        slug: "institution-details",
        promptTemplate: [
            "Generate verified institution profile content.",
            "Use real public information when available and return only clean JSON.",
            "Keep the profile useful for students and parents.",
        ].join(" "),
        fields: [
            { field_key: "about", label: "Two clear paragraphs about the institution" },
            { field_key: "history", label: "A concise history or background paragraph" },
            { field_key: "key_highlights", label: "Four to six important highlights as strings" },
            { field_key: "email", label: "Official contact email when verified" },
            { field_key: "phone", label: "Official 10 digit phone number when verified" },
            { field_key: "website_url", label: "Official website URL when verified" },
            { field_key: "established_year", label: "Four digit established year when verified" },
        ],
    },
    {
        name: "Scholarship",
        slug: "scholarship",
        promptTemplate: [
            "Generate structured scholarship content for the selected institution using a default student-facing scholarship template.",
            "Prefer verified government scholarship schemes, institutional aid, merit support, direct benefit transfer details, and common application requirements when relevant.",
            "Return useful predefined-style data even when the institution has limited details, but do not invent exact scheme amounts unless the context or verified public information supports them.",
            "The output must resemble a complete scholarship preview with description, eligibility, required documents, scholarship amount, application process, and financial assistance.",
            "If the tweak message asks for an extra heading or title, add it as an extra top-level snake_case JSON field with a clear string or array of strings.",
        ].join(" "),
        fields: [
            { field_key: "description", label: "A complete scholarship overview paragraph" },
            { field_key: "eligibility", label: "Six clear eligibility points as strings" },
            { field_key: "required_documents", label: "Six to eight required document points as strings" },
            { field_key: "scholarship_amount", label: "Four to five scholarship amount or benefit points as strings" },
            { field_key: "application_process", label: "Six to eight application process steps as strings" },
            { field_key: "financial_assistance", label: "Four to six financial assistance points as strings" },
        ],
    },
    {
        name: "Institution Cutoffs",
        slug: "institute-cutoffs",
        promptTemplate: [
            "Generate verified admission cutoff data for the selected institution and program.",
            "Automatically identify the relevant entrance exam or admission basis when reliable public data is available.",
            "Do not force a fixed number of years. Return only the cutoff years and rounds that are actually available or strongly supported by the provided context.",
            "Do not hallucinate missing years, categories, ranks, marks, exams, or rounds. If no verified cutoff data is available, return a clear notes array explaining that data was not found.",
            "Return grouped year-wise JSON that can be shown in tables.",
            "If the tweak message asks for a specific exam, category, round, year, heading, or title, use it only when verified data is available.",
        ].join(" "),
        fields: [
            { field_key: "institution_name", label: "Institution name" },
            { field_key: "program_name", label: "Program name when selected" },
            { field_key: "exam_name", label: "Detected exam name or admission basis when available" },
            { field_key: "year_wise_cutoffs", label: "Array of only verified year-wise cutoff sections with rows" },
            { field_key: "notes", label: "Short notes about data limitations or assumptions" },
        ],
    },
    {
        name: "Institution Facilities",
        slug: "institution-facilities",
        promptTemplate: [
            "Generate concise, student-facing facility descriptions for the selected institution.",
            "Use the provided selected facility types and rough notes as the source of truth.",
            "Return one item for every selected facility type. Do not add unselected facilities.",
            "Keep each description practical, clear, and suitable for an institution profile page.",
            "If the rough notes are limited, write generic but honest descriptions without inventing exact counts, sizes, brands, or certifications.",
        ].join(" "),
        fields: [
            { field_key: "facilities", label: "Array of facility objects with facility_type_id, facility_type, title, description, and highlights" },
        ],
    },
];

export function listBuiltInAiContentConfigs() {
    return builtInAiContentConfigs;
}

export function getBuiltInAiGenerationConfig(contentTypeSlug: string, providerId: number) {
    const normalizedSlug = contentTypeSlug === "institution-cutoffs" ? "institute-cutoffs" : contentTypeSlug;
    const config = builtInAiContentConfigs.find((item) => item.slug === normalizedSlug);
    if (!config) return null;

    const now = new Date(0).toISOString();
    const contentType: BuiltInAiContentTemplate = {
        id: 0,
        name: config.name,
        slug: config.slug,
        provider_id: providerId,
        prompt_template: config.promptTemplate,
        is_active: true,
        created_at: now,
        updated_at: now,
    };

    const fields: BuiltInAiContentField[] = config.fields.map((field, index) => ({
        id: index + 1,
        content_type_id: 0,
        field_key: field.field_key,
        label: field.label,
        is_enabled: true,
        sort_order: index + 1,
        created_at: now,
    }));

    return { contentType, fields };
}
