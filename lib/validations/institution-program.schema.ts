import { z } from "zod";

export const programFeeComponentSchema = z.object({
    title: z.string().trim().min(1),
    amount: z.number().nonnegative(),
    unit: z.string().trim().nullable().optional(),
});

const institutionProgramBaseSchema = z.object({
    institutionId: z.number().int().positive(),
    programTypeId: z.number().int().positive(),
    slug: z.string().trim().min(1).optional(),
    title: z.string().trim().min(1),
    about: z.string().nullable().optional(),
    durationValue: z.number().int().nullable().optional(),
    durationUnit: z.string().nullable().optional(),
    seatsAvailable: z.number().int().nullable().optional(),
    teachingMethod: z.string().nullable().optional(),
    boardId: z.number().int().nullable().optional(),
    universityId: z.number().int().nullable().optional(),
    academicYearId: z.number().int().positive().nullable().optional(),
    categoryIds: z.array(z.number().int().positive()).nullable().optional(),
    languageIds: z.array(z.number().int().positive()).nullable().optional(),
    subjectIds: z.array(z.number().int().positive()).nullable().optional(),
    subjectCategoryIds: z.array(z.number().int().positive()).nullable().optional(),
    sectionIds: z.array(z.number().int().positive()).nullable().optional(),
    feeComponents: z.array(programFeeComponentSchema).nullable().optional(),
    createdBy: z.number().int().nullable().optional(),
});

function hasSubjectSelection(data: { subjectIds?: number[] | null; subjectCategoryIds?: number[] | null }) {
    return Boolean((data.subjectIds?.length ?? 0) || (data.subjectCategoryIds?.length ?? 0));
}

function addSubjectSelectionIssue(ctx: z.RefinementCtx) {
    ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["subjectIds"],
        message: "Choose at least one subject",
    });
}

export const institutionProgramCreateSchema = institutionProgramBaseSchema.superRefine((data, ctx) => {
    if (!hasSubjectSelection(data)) addSubjectSelectionIssue(ctx);
});

export const institutionProgramUpdateSchema = institutionProgramBaseSchema
    .partial()
    .extend({
        id: z.number().int().positive(),
        updatedBy: z.number().int().nullable().optional(),
        isActive: z.boolean().optional(),
    })
    .partial({ institutionId: true })
    .superRefine((data, ctx) => {
        if (("subjectIds" in data || "subjectCategoryIds" in data) && !hasSubjectSelection(data)) {
            addSubjectSelectionIssue(ctx);
        }
    });

export type InstitutionProgramCreateInput = z.infer<typeof institutionProgramCreateSchema>;
export type InstitutionProgramUpdateInput = z.infer<typeof institutionProgramUpdateSchema>;
