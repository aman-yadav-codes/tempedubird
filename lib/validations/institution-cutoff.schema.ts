import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
    if (typeof value === "string") {
        const trimmed = value.trim();
        return trimmed === "" ? undefined : trimmed;
    }

    return value ?? undefined;
};

const optionalPositiveInt = z.preprocess(
    emptyToUndefined,
    z.union([z.coerce.number().int().positive(), z.undefined()]).optional()
);

const aiResponseSchema = z.record(z.string(), z.unknown()).refine(
    (value) => Object.keys(value).length > 0,
    "AI response is required"
);

export const institutionCutoffCreateSchema = z.object({
    institutionId: z.coerce.number().int().positive("Institution is required"),
    programId: optionalPositiveInt,
    academicYearId: optionalPositiveInt,
    yearsToGenerate: z.coerce.number().int().positive("Years to generate is required"),
    examName: z.string().trim().max(150, "Exam name is too long").optional().nullable(),
    aiResponse: aiResponseSchema,
    isActive: z.boolean().optional(),
});

export const institutionCutoffUpdateSchema = institutionCutoffCreateSchema
    .partial()
    .extend({
        id: z.coerce.number().int().positive(),
        updatedBy: z.coerce.number().int().positive().nullable().optional(),
    });

export type InstitutionCutoffCreateInput = z.infer<typeof institutionCutoffCreateSchema>;
export type InstitutionCutoffUpdateInput = z.infer<typeof institutionCutoffUpdateSchema>;
