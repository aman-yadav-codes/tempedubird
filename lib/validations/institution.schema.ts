import { z } from "zod";

const slug = z.string().trim().min(1, "Slug is required").max(100);
const name = z.string().trim().min(1, "Name is required").max(150);

export const masterCreateSchema = z.object({
    name,
    slug,
});

export const masterUpdateSchema = z.object({
    id: z.number().int().positive(),
    name,
    slug,
    isActive: z.boolean().optional(),
});

export type MasterCreateInput = z.infer<typeof masterCreateSchema>;
export type MasterUpdateInput = z.infer<typeof masterUpdateSchema>;
