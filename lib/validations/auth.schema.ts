// lib/validations/auth.schema.ts
// Zod schemas for all authentication-related inputs.

import { z } from "zod";

// --- Login --------------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().min(1, "Email or phone number is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// --- Register -----------------------------------------------------------------

export const registerSchema = z
  .object({
    full_name: z
      .string()
      .min(2, "Full name must be at least 2 characters")
      .max(100, "Full name too long"),
    email: z
      .union([z.string().email("Invalid email address"), z.literal(""), z.null()])
      .optional()
      .nullable(),
    phone: z
      .string()
      .length(10, "Phone number must be exactly 10 digits"),
    password: z
      .string()
      .min(6, "Password must be at least 6 characters")
      .max(100, "Password too long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
    role_id: z.coerce.number().int().positive().optional().nullable(),
    role_code: z.string().trim().min(1).max(80).optional().nullable(),
    referral_code: z.string().trim().optional().nullable(),
    designation_id: z.coerce.number().int().positive().optional().nullable(),
    is_teacher: z.boolean().optional(),
    teacher_type: z.enum(["individual_teacher", "institute_teacher"]).optional().nullable(),
    institution_id: z.coerce.number().int().positive().optional().nullable(),
    under_institution_id: z.coerce.number().int().positive().optional().nullable(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;
