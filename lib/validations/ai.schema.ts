import { z } from "zod";

const aiTextArray = z.array(z.string().trim().min(1)).min(1);

export const aiScholarshipResponseSchema = z.object({
    description: z.string().trim().min(1),
    eligibility: aiTextArray,
    scholarship_amount: aiTextArray,
    financial_assistance: aiTextArray,
    application_process: aiTextArray,
    required_documents: aiTextArray,
}).catchall(z.union([z.string().trim().min(1), aiTextArray, z.record(z.string(), z.unknown())]));

export const aiGenerateRequestSchema = z.object({
    contentTypeSlug: z.string().trim().min(1),
    institutionId: z.number().int().positive().optional(),
    institutionName: z.string().trim().min(1).optional(),
    tweakMessage: z.string().trim().optional().nullable(),
    inputContext: z.string().trim().optional().nullable(),
}).refine((value) => Boolean(value.institutionId || value.institutionName), {
    message: "Institution ID or institution name is required",
});


export const aiProviderUpsertSchema = z.object({
    name: z.string().trim().min(1),
    slug: z.string().trim().min(1),
    base_url: z.string().trim().url(),
    model_name: z.string().trim().optional().nullable(),
    chat_id: z.string().trim().optional().nullable(),
    last_response_id: z.string().trim().optional().nullable(),
    token: z.string().trim().optional().nullable(),
    token_expires_at: z.string().trim().optional().nullable(),
    is_active: z.boolean().optional(),
});

export type AiScholarshipResponseInput = z.infer<typeof aiScholarshipResponseSchema>;
export type AiGenerateRequestInput = z.infer<typeof aiGenerateRequestSchema>;
export type AiProviderUpsertInput = z.infer<typeof aiProviderUpsertSchema>;
