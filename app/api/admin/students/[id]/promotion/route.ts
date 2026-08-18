import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/auth";
import { assertCanAccessInstitution, assertCanAccessUserWithinInstitutionScope } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import { recordEnrollmentLifecycle } from "@/lib/queries/lifecycle";
import { assertCanPromoteEnrollment } from "@/lib/queries/student-promotion-permissions";
import {
  createPromotedStudentIdCard,
  ensureStudentIdCardPromotionSchema,
} from "@/lib/queries/student-id-card-promotion";

const promotionSchema = z.object({
  sourceEnrollmentId: z.coerce.number().int().positive(),
  outcome: z.enum(["promoted", "retained", "failed", "graduated", "transferred"]),
  destinationAcademicYearId: z.coerce.number().int().positive().nullable().optional(),
  destinationProgramId: z.coerce.number().int().positive().nullable().optional(),
  destinationSectionId: z.coerce.number().int().positive().nullable().optional(),
  rollNumber: z.string().trim().regex(/^\d+$/, "Roll number must contain digits only").nullable().optional(),
  admissionDate: z.string().trim().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

type PromotionInput = z.infer<typeof promotionSchema>;

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function toSqlDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

async function ensurePromotionSchema() {
  await db.query(`
    ALTER TABLE student_enrollments
      ADD COLUMN IF NOT EXISTS promotion_type VARCHAR(50) NULL,
      ADD COLUMN IF NOT EXISTS promotion_notes TEXT NULL,
      ADD COLUMN IF NOT EXISTS promoted_by INT NULL REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS effective_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS effective_to TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS lifecycle_id BIGINT NULL,
      ADD COLUMN IF NOT EXISTS deleted_by INT NULL
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_promotion_context
    ON student_enrollments (institution_id, academic_year_id, program_id, section_id, status)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_previous
    ON student_enrollments (previous_enrollment_id)
  `);
}

async function assertDestination(input: PromotionInput, institutionId: number) {
  if (
    input.outcome === "graduated" ||
    input.outcome === "transferred"
  ) {
    return null;
  }

  if (!input.destinationAcademicYearId || !input.destinationProgramId) {
    throw new Error("Destination session and class are required");
  }

  const result = await db.query<{
    program_id: number;
    program_name: string;
    class_category_id: number | null;
    class_category_name: string | null;
    academic_year_id: number;
    academic_year_name: string;
    section_id: number | null;
    section_name: string | null;
  }>(
    `
      SELECT
        program.id AS program_id,
        program.title AS program_name,
        program_category.category_id AS class_category_id,
        category.name AS class_category_name,
        academic_year.id AS academic_year_id,
        academic_year.name AS academic_year_name,
        section.id AS section_id,
        section.name AS section_name
      FROM institution_programs program
      LEFT JOIN LATERAL (
        SELECT pc.category_id
        FROM program_categories pc
        WHERE pc.program_id = program.id
        ORDER BY pc.category_id ASC
        LIMIT 1
      ) program_category ON TRUE
      INNER JOIN academic_years academic_year
        ON academic_year.id = $2
       AND academic_year.institution_id = program.institution_id
       AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
      LEFT JOIN categories category ON category.id = program_category.category_id
      LEFT JOIN program_sections program_section
        ON program_section.program_id = program.id
       AND program_section.section_id IS NOT DISTINCT FROM $3::int
      LEFT JOIN sections section ON section.id = program_section.section_id
      WHERE program.id = $1
        AND program.institution_id = $4
        AND COALESCE(program.is_deleted, FALSE) = FALSE
        AND ($3::int IS NULL OR program_section.section_id IS NOT NULL)
      LIMIT 1
    `,
    [
      input.destinationProgramId,
      input.destinationAcademicYearId,
      input.destinationSectionId ?? null,
      institutionId,
    ],
  );

  const destination = result.rows[0];
  if (!destination) throw new Error("Destination class, section, or session is invalid");
  if (!destination.class_category_id) throw new Error("Destination class is not linked to a class category");
  return destination;
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const client = await db.connect();
  try {
    const currentUser = await requireAdmin(req);
    const { id } = await ctx.params;
    const studentUserId = Number(id);
    if (!Number.isInteger(studentUserId) || studentUserId <= 0) {
      return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
    }
    await assertCanAccessUserWithinInstitutionScope(db, currentUser, studentUserId);

    const parsed = promotionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten().fieldErrors }, { status: 422 });
    }
    const input = parsed.data;
    await ensurePromotionSchema();
    await ensureStudentIdCardPromotionSchema();

    await client.query("BEGIN");
    const sourceResult = await client.query<{
      id: number;
      student_id: number;
      user_id: number;
      institution_id: number;
      program_id: number | null;
      academic_year_id: number;
      class_category_id: number;
      section_id: number | null;
      status: string;
      roll_number: string | null;
      promoted_at: string | null;
    }>(
      `
        SELECT enrollment.*, profile.user_id
        FROM student_enrollments enrollment
        INNER JOIN student_profiles profile ON profile.id = enrollment.student_id
        WHERE enrollment.id = $1
          AND profile.user_id = $2
          AND COALESCE(enrollment.is_deleted, FALSE) = FALSE
        FOR UPDATE
      `,
      [input.sourceEnrollmentId, studentUserId],
    );
    const source = sourceResult.rows[0];
    if (!source) throw new Error("Source enrollment was not found");
    assertCanAccessInstitution(currentUser, source.institution_id);
    await assertCanPromoteEnrollment(client, currentUser, {
      institution_id: source.institution_id,
      program_id: source.program_id,
      section_id: source.section_id,
      academic_year_id: source.academic_year_id,
    });
    if (source.status !== "active") throw new Error("Only active enrollments can be promoted");
    if (source.promoted_at) throw new Error("This enrollment has already been processed");

    const destination = await assertDestination(input, source.institution_id);
    let newEnrollmentId: number | null = null;
    const outcome = input.outcome.toUpperCase();

    if (destination) {
      const duplicate = await client.query<{ id: number }>(
        `
          SELECT id
          FROM student_enrollments
          WHERE student_id = $1
            AND institution_id = $2
            AND program_id = $3
            AND academic_year_id = $4
            AND status = 'active'
            AND COALESCE(is_deleted, FALSE) = FALSE
          LIMIT 1
        `,
        [
          source.student_id,
          source.institution_id,
          destination.program_id,
          destination.academic_year_id,
        ],
      );
      if (duplicate.rows[0]) {
        throw new Error("Student is already enrolled in the destination session and class");
      }

      const inserted = await client.query<{ id: number }>(
        `
          INSERT INTO student_enrollments (
            student_id,
            institution_id,
            program_id,
            academic_year_id,
            class_category_id,
            section_id,
            roll_number,
            admission_date,
            status,
            previous_enrollment_id,
            remarks,
            promotion_type,
            created_by,
            updated_by,
            is_current,
            effective_from
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10,$11,$12,$12,TRUE,$8::date::timestamp)
          RETURNING id
        `,
        [
          source.student_id,
          source.institution_id,
          destination.program_id,
          destination.academic_year_id,
          destination.class_category_id,
          destination.section_id,
          input.rollNumber?.trim() || null,
          toSqlDate(input.admissionDate),
          source.id,
          input.notes || null,
          outcome,
          currentUser.id,
        ],
      );
      newEnrollmentId = inserted.rows[0].id;

      await recordEnrollmentLifecycle(client, {
        enrollmentId: newEnrollmentId,
        studentId: source.student_id,
        institutionId: source.institution_id,
        academicYearId: destination.academic_year_id,
        status: "ACTIVE",
        effectiveFrom: toSqlDate(input.admissionDate),
        actorId: currentUser.id,
        notes: input.notes || `Student ${input.outcome}`,
        metadata: {
          previous_enrollment_id: source.id,
          promotion_type: outcome,
          program_id: destination.program_id,
          class_category_id: destination.class_category_id,
          section_id: destination.section_id,
        },
      });

      await createPromotedStudentIdCard(client, {
        studentId: source.student_id,
        institutionId: source.institution_id,
        sourceEnrollmentId: source.id,
        destinationEnrollmentId: newEnrollmentId,
        destinationAcademicYearId: destination.academic_year_id,
        actorId: currentUser.id,
      });
    }

    const sourceStatus =
      input.outcome === "graduated"
        ? "graduated"
        : input.outcome === "transferred"
          ? "transferred"
          : "promoted";

    await client.query(
      `
        UPDATE student_enrollments
        SET status = $1,
            promotion_type = $2,
            promotion_notes = $3,
            promoted_by = $4,
            promoted_at = CURRENT_TIMESTAMP,
            is_current = FALSE,
            effective_to = CURRENT_TIMESTAMP,
            updated_by = $4,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $5
      `,
      [sourceStatus, outcome, input.notes || null, currentUser.id, source.id],
    );

    await recordEnrollmentLifecycle(client, {
      enrollmentId: source.id,
      studentId: source.student_id,
      institutionId: source.institution_id,
      academicYearId: source.academic_year_id,
      status: outcome === "FAILED" ? "REPEATED" : outcome,
      effectiveTo: new Date().toISOString(),
      actorId: currentUser.id,
      notes: input.notes || `Student ${input.outcome}`,
      metadata: {
        next_enrollment_id: newEnrollmentId,
        promotion_type: outcome,
      },
    });

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      data: {
        previousEnrollmentId: source.id,
        newEnrollmentId,
        outcome: input.outcome,
      },
    });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const message = errorMessage(err);
    const status =
      message === "Unauthorized" || message === "User not found"
        ? 401
        : message === "Forbidden: Admin access required"
          || message === "Only institution admins or the assigned class teacher can promote this class"
          ? 403
          : 400;
    return NextResponse.json({ error: message }, { status });
  } finally {
    client.release();
  }
}
