import { z } from "zod";

const optionalUrl = z.preprocess((value) => {
    if (value === undefined || value === null) return value;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
}, z.string().url().nullable().optional());

export const institutionProfileCreateSchema = z.object({
    name: z.string().trim().min(1),
    slug: z.string().trim().min(1).optional(),
    institutionTypeId: z.number().int().positive(),
    institutionSubtypeId: z.number().int().positive().nullable().optional(),
    isActive: z.boolean().optional(),
    addSource: z.number().int().positive().nullable().optional(),
    phone: z.string().trim().min(1).nullable().optional(),
    email: z.string().email().nullable().optional(),
    establishedYear: z.number().int().nullable().optional(),
    about: z.string().nullable().optional(),
    mission: z.string().nullable().optional(),
    vision: z.string().nullable().optional(),
    goal: z.string().nullable().optional(),
    founderName: z.string().nullable().optional(),
    founderTitle: z.string().nullable().optional(),
    founderImageUrl: z.string().nullable().optional(),
    founderAbout: z.string().nullable().optional(),
    aiContent: z.record(z.string(), z.unknown()).nullable().optional(),
    locationId: z.number().int().nullable().optional(),
    parentUniversityId: z.number().int().nullable().optional(),
    boardId: z.number().int().positive().nullable().optional(),
    categoryIds: z.array(z.number().int().positive()).nullable().optional(),
    isMarketplaceEnabled: z.boolean().nullable().optional(),
    createdBy: z.number().int().nullable().optional(),
});

export const institutionProfileUpdateSchema = institutionProfileCreateSchema.partial().extend({
    id: z.number().int().positive(),
    isActive: z.boolean().optional(),
    updatedBy: z.number().int().nullable().optional(),
});

export type InstitutionProfileCreateInput = z.infer<typeof institutionProfileCreateSchema>;
export type InstitutionProfileUpdateInput = z.infer<typeof institutionProfileUpdateSchema>;
