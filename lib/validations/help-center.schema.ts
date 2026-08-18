import { z } from "zod";

export const helpVisibilitySchema = z.enum(["PUBLIC", "AUTHENTICATED", "PERMISSION_BASED"]);

export const helpCategorySchema = z.object({
  parent_id: z.coerce.number().int().positive().nullable().optional(),
  name: z.string().trim().min(2).max(150),
  slug: z.string().trim().min(2).max(150).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  icon: z.string().trim().max(100).nullable().optional(),
  description: z.string().trim().nullable().optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
  is_active: z.boolean().optional(),
});

export const helpAssetSchema = z.object({
  asset_type: z.string().trim().min(2).max(20),
  title: z.string().trim().max(255).nullable().optional(),
  file_url: z.string().trim().min(1),
  thumbnail_url: z.string().trim().nullable().optional(),
  sort_order: z.coerce.number().int().min(0).optional(),
});

export const helpFaqSchema = z.object({
  question: z.string().trim().min(2),
  answer: z.string().trim().min(2),
  sort_order: z.coerce.number().int().min(0).optional(),
});

export const helpArticleSchema = z.object({
  category_id: z.coerce.number().int().positive(),
  title: z.string().trim().min(2).max(255),
  slug: z.string().trim().min(2).max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  summary: z.string().trim().nullable().optional(),
  content_md: z.string().trim().min(1),
  visibility: helpVisibilitySchema.default("PUBLIC"),
  estimated_read_minutes: z.coerce.number().int().positive().nullable().optional(),
  difficulty_level: z.string().trim().max(20).nullable().optional(),
  is_featured: z.boolean().optional(),
  is_published: z.boolean().optional(),
  search_keywords: z.string().trim().nullable().optional(),
  permission_ids: z.array(z.coerce.number().int().positive()).optional(),
  assets: z.array(helpAssetSchema).optional(),
  faqs: z.array(helpFaqSchema).optional(),
  related_article_ids: z.array(z.coerce.number().int().positive()).optional(),
});

export const helpRecentUpdateSchema = z.object({
  title: z.string().trim().min(2).max(255),
  description: z.string().trim().nullable().optional(),
  href: z.string().trim().nullable().optional(),
  update_date: z.string().trim().min(1),
  sort_order: z.coerce.number().int().min(0).optional(),
  is_published: z.boolean().optional(),
});
