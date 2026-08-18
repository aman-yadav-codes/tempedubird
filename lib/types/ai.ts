export interface AiProvider {
    id: number;
    name: string;
    slug: string;
    base_url: string;
    institution_id?: number | null;
    provider_scope?: "platform" | "institution";
    model_name?: string | null;
    chat_id?: string | null;
    last_response_id?: string | null;
    token?: string | null;
    token_expires_at?: string | null;
    is_active: boolean;
    created_by?: number | null;
    updated_by?: number | null;
    created_at: string;
    updated_at: string;
}

export interface BuiltInAiContentTemplate {
    id: number;
    name: string;
    slug: string;
    provider_id: number;
    provider_name?: string;
    sort_order?: number;
    prompt_template: string;
    is_active: boolean;
    created_by?: number | null;
    updated_by?: number | null;
    created_at: string;
    updated_at: string;
}

export interface BuiltInAiContentField {
    id: number;
    content_type_id: number;
    field_key: string;
    label: string;
    is_enabled: boolean;
    sort_order: number;
    created_by?: number | null;
    updated_by?: number | null;
    created_at: string;
}

export interface AiScholarshipResponse {
    description: string;
    eligibility: string[];
    scholarship_amount: string[];
    financial_assistance: string[];
    application_process: string[];
    required_documents: string[];
    [key: string]: unknown;
}

export interface AiGenerateRequest {
    contentTypeSlug: string;
    institutionId: number;
    tweakMessage?: string | null;
    inputContext?: string | null;
}

export interface AiGenerateResponse<T = unknown> {
    content_type: string;
    provider: string;
    elapsed_ms: number;
    data: T;
}
