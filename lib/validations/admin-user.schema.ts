import { z } from "zod";
import { capitalize } from "@/lib/utils/capitalize";

const emptyToNull = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }

  return value ?? null;
};

const nullableString = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.string().max(max).nullable().optional()
  );

const capitalizedString = (max: number) =>
  z.string().trim().min(1).max(max).transform(capitalize);

const nullableCapitalizedString = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.union([z.string().max(max).transform(capitalize), z.null()]).optional()
  );

const nullableUrl = z.preprocess(
  emptyToNull,
  z.union([z.string().url("Enter a valid URL"), z.null()]).optional()
);

const nullableNumber = z.preprocess(
  emptyToNull,
  z.union([z.coerce.number().finite(), z.null()]).optional()
);

const optionalPositiveInt = z.preprocess(
  emptyToNull,
  z.union([z.coerce.number().int().positive(), z.null()]).optional()
);

const monthSchema = z.coerce.number().int().min(1).max(12);
const yearSchema = z.coerce.number().int().min(1900).max(2100);
const teacherTypeSchema = z.enum(["individual_teacher", "institute_teacher"]);
const userDocumentSchema = z.object({
  document_type: z.string().trim().min(2).max(50).transform((value) => value.toUpperCase()),
  document_number: z.preprocess(
    emptyToNull,
    z.union([z.string().max(100).transform((value) => value.toUpperCase()), z.null()]).optional()
  ),
  file_url: z.string().trim().url("Enter a valid document image URL"),
  public_id: nullableString(500),
  resource_type: nullableString(50),
  is_verified: z.boolean().default(false),
});

const salaryComponentSchema = z.object({
  label: z.string().trim().min(1, "Salary label is required").max(120).transform(capitalize),
  amount: z.coerce.number().finite().min(0, "Amount must be zero or more"),
});

export const adminCreateUserSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(150, "Full name is too long")
    .transform(capitalize),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .max(150, "Email is too long")
    .toLowerCase(),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "Phone number must be exactly 10 digits")
    .optional()
    .nullable(),
  avatar_url: nullableUrl,
  role_id: optionalPositiveInt,
  is_active: z.boolean().default(true),
  is_verified: z.boolean().default(false),
  is_profile_complete: z.boolean().default(false),
  profile: z
    .object({
      about: nullableCapitalizedString(2000),
      is_teacher: z.boolean().default(false),
      teacher_type: z.preprocess(
        emptyToNull,
        teacherTypeSchema.nullable().optional()
      ),
      under_institution_id: optionalPositiveInt,
      institution_ids: z.array(z.coerce.number().int().positive()).default([]),
      designation_id: optionalPositiveInt,
      gender: z.preprocess(
        emptyToNull,
        z.union([z.string().max(20).transform((val) => val.toLowerCase()), z.null()]).optional()
      ),
      hourly_charges: z.preprocess(
        (val) => {
          if (val === "" || val === null) return null;
          if (typeof val === "string") {
            const trimmed = val.trim();
            return trimmed === "" ? null : Number(trimmed);
          }
          return val;
        },
        z.union([z.number().positive("Hourly charges must be greater than 0"), z.null()]).optional()
      ),
    })
    .default({ is_teacher: false, institution_ids: [] }),
  location: z
    .object({
      country: nullableString(150),
      state: nullableString(150),
      city: nullableString(150),
      area: nullableString(150),
      full_address: nullableString(2000),
      formatted_address: nullableString(2000),
      latitude: nullableNumber,
      longitude: nullableNumber,
      pincode: nullableString(20),
      place_id: nullableString(500),
    })
    .nullable()
    .optional(),
  experiences: z
    .array(
      z.object({
        job_title: capitalizedString(150),
        company_id: z.number().int().nullable().optional(),
        company_name: capitalizedString(150),
        from_month: monthSchema,
        from_year: yearSchema,
        to_month: monthSchema.nullable().optional(),
        to_year: yearSchema.nullable().optional(),
        is_current: z.boolean().default(false),

      })
    )
    .max(20)
    .default([]),
  education: z
    .array(
      z.object({
        qualification: capitalizedString(150),
        institution_id: z.number().int().nullable().optional(),
        institution_name: capitalizedString(200).optional().nullable(),
        from_year: yearSchema,
        to_year: yearSchema,
      })
    )
    .max(20)
    .default([]),
  certifications: z
    .array(
      z.object({
        name: capitalizedString(200),
        issued_authority: nullableCapitalizedString(200),
        duration: z.preprocess(
          (val) => {
            if (val === "" || val === null) return null;
            if (typeof val === "string") {
              const trimmed = val.trim();
              return trimmed === "" ? null : Number(trimmed);
            }
            return val;
          },
          z.union([z.number().int().positive("Duration must be a valid number of months"), z.null()]).optional()
        ),
      })
    )
    .max(30)
    .default([]),
  documents: z.array(userDocumentSchema).max(50).default([]),
  salary_components: z.array(salaryComponentSchema).max(30).default([]),
  teaching_categories: z
    .array(z.coerce.number().int().positive())
    .default([]),
  teaching_subjects: z
    .array(z.coerce.number().int().positive())
    .default([]),
}).superRefine((data, ctx) => {
  if (data.profile.is_teacher && !data.profile.teacher_type) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["profile", "teacher_type"],
      message: "Select a teacher type",
    });
  }

  if (
    data.profile.is_teacher &&
    data.profile.teacher_type === "institute_teacher" &&
    !data.profile.under_institution_id
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["profile", "under_institution_id"],
      message: "Select an institution",
    });
  }
});

export type AdminCreateUserInput = z.infer<typeof adminCreateUserSchema>;
