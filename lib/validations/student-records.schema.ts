import { z } from "zod";
import { capitalize } from "@/lib/utils/capitalize";

const emptyToNull = (value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? null : trimmed;
  }
  return value ?? null;
};

const nullableText = (max: number, transform: (value: string) => string = capitalize) =>
  z.preprocess(
    emptyToNull,
    z.union([z.string().trim().max(max).transform(transform), z.null()]).optional()
  );

const nullableRollNumber = z.preprocess(
  emptyToNull,
  z.union([
    z.string().trim().max(50).regex(/^\d+$/, "Roll number must contain digits only"),
    z.null(),
  ]).optional()
);

const nullableDate = z.preprocess(
  emptyToNull,
  z.union([z.coerce.date(), z.null()]).optional()
);

const optionalPositiveInt = z.preprocess(
  emptyToNull,
  z.union([z.coerce.number().int().positive(), z.null()]).optional()
);

export const academicYearSchema = z.object({
  institutionId: z.coerce.number().int().positive(),
  name: z.string().trim().min(2).max(50).transform(capitalize),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  isActive: z.boolean().default(false),
}).superRefine((data, ctx) => {
  if (data.endDate < data.startDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["endDate"],
      message: "End date must be after start date",
    });
  }
});

const studentEnrollmentSchema = z.object({
  id: optionalPositiveInt,
  institution_id: optionalPositiveInt,
  program_id: optionalPositiveInt,
  academic_year_id: optionalPositiveInt,
  class_category_id: optionalPositiveInt,
  section_id: optionalPositiveInt,
  roll_number: nullableRollNumber,
  admission_date: nullableDate,
  status: z.enum(["active", "promoted", "demoted", "transferred", "dropout", "graduated", "completed", "suspended"]).default("active"),
  remarks: nullableText(2000),
});

export const studentRecordsSchema = z.object({
  profile: z.object({
    admission_number: nullableText(100, (value) => value.toUpperCase()),
    apar_id: nullableText(100, (value) => value.toUpperCase()),
    date_of_birth: nullableDate,
    blood_group: nullableText(10, (value) => value.toUpperCase()),
    emergency_contact_name: nullableText(150),
    emergency_contact_phone: z.preprocess(
      emptyToNull,
      z.union([z.string().trim().regex(/^\d{10}$/, "Emergency phone must be 10 digits"), z.null()]).optional()
    ),
  }).default({}),
  enrollment: studentEnrollmentSchema.default({ status: "active" }),
  enrollments: z.array(studentEnrollmentSchema).max(20).default([]),
  guardians: z.array(z.object({
    guardian_user_id: optionalPositiveInt,
    full_name: z.string().trim().min(2).max(150).transform(capitalize),
    email: z.string().trim().email().max(255).transform((value) => value.toLowerCase()),
    phone: z.string().trim().regex(/^\d{10}$/, "Phone must be 10 digits"),
    password: z.preprocess(
      emptyToNull,
      z.union([z.string().min(6, "Password must be at least 6 characters").max(100), z.null()]).optional()
    ),
    confirm_password: z.preprocess(
      emptyToNull,
      z.union([z.string().min(1), z.null()]).optional()
    ),
    relationship: z.string().trim().min(2).max(50).transform(capitalize),
    is_primary: z.boolean().default(false),
  }).superRefine((guardian, ctx) => {
    if (!guardian.guardian_user_id && !guardian.password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["password"],
        message: "Password is required for a new parent account",
      });
    }
    if (guardian.password && guardian.password !== guardian.confirm_password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirm_password"],
        message: "Passwords do not match",
      });
    }
  })).max(10).default([]),
  documents: z.array(z.object({
    document_type: z.string().trim().min(2).max(50).transform((value) => value.toUpperCase()),
    document_number: nullableText(100, (value) => value.toUpperCase()),
    file_url: z.string().url(),
    public_id: nullableText(500, (value) => value),
    resource_type: nullableText(50, (value) => value.toLowerCase()),
    is_verified: z.boolean().default(false),
  })).max(20).default([]),
});

export type AcademicYearInput = z.infer<typeof academicYearSchema>;
export type StudentRecordsInput = z.infer<typeof studentRecordsSchema>;
