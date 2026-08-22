// lib/validations/user.schema.ts
// Single source of truth for the User shape.
// The TypeScript type is derived from the schema so it stays in sync automatically.

import { z } from "zod";

export const userSchema = z.object({
  id: z.number().int().positive().optional(),
  full_name: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name must be at most 100 characters"),
  email: z.string().email("Invalid email address").optional().nullable(),
  phone: z
    .string()
    .min(7, "Phone number too short")
    .max(20, "Phone number too long"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  is_active: z.boolean().optional(),
  is_verified: z.boolean().optional(),
});

/** TypeScript type derived from the schema — always in sync. */
export type UserSchema = z.infer<typeof userSchema>;
