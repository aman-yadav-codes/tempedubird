import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth/auth";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import { recordEnrollmentLifecycle } from "@/lib/queries/lifecycle";
import { assertCanPromoteEnrollment } from "@/lib/queries/student-promotion-permissions";
import {
  createPromotedStudentIdCard,
  ensureStudentIdCardPromotionSchema,
} from "@/lib/queries/student-id-card-promotion";

const bulkPromotionSchema = z.object({
  institutionId: z.coerce.number().int().positive(),
  studentUserIds: z.array(z.coerce.number().int().positive()).min(1).max(200),
  sourceAcademicYearId: z.coerce.number().int().positive(),
  sourceProgramId: z.coerce.number().int().positive(),
  sourceSectionId: z.coerce.number().int().positive().nullable().optional(),
  outcome: z.enum(["promoted", "retained", "failed", "graduated", "transferred"]),
  destinationAcademicYearId: z.coerce.number().int().positive().nullable().optional(),
  destinationProgramId: z.coerce.number().int().positive().nullable().optional(),
  destinationSectionId: z.coerce.number().int().positive().nullable().optional(),
  admissionDate: z.string().trim().nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

type BulkPromotionInput = z.infer<typeof bulkPromotionSchema>;

type SourceEnrollmentRow = {
  id: number;
  student_id: number;
  user_id: number;
  full_name: string;
  institution_id: number;
  program_id: number;
  academic_year_id: number;
  class_category_id: number;
  section_id: number | null;
};

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function toSqlDate(value: string | null | undefined) {
  return value ? value.slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function createsEnrollment(outcome: BulkPromotionInput["outcome"]) {
  return outcome === "promoted" || outcome === "retained" || outcome === "failed";
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

async function assertDestination(input: BulkPromotionInput) {
  if (!createsEnrollment(input.outcome)) return null;
  if (!input.destinationAcademicYearId || !input.destinationProgramId) {
    throw new Error("Destination session and class are required");
  }

  const result = await db.query<{
    program_id: number;
    program_name: string;
    class_category_id: number | null;
    academic_year_id: number;
    academic_year_name: string;
    section_id: number | null;
  }>(
    `
      SELECT
        program.id AS program_id,
        program.title AS program_name,
        program_category.category_id AS class_category_id,
        academic_year.id AS academic_year_id,
        academic_year.name AS academic_year_name,
        section.id AS section_id
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
      input.institutionId,
    ],
  );

  const destination = result.rows[0];
  if (!destination) throw new Error("Destination class, section, or session is invalid");
  if (!destination.class_category_id) throw new Error("Destination class is not linked to a class category");
  return destination;
}

export async function POST(req: Request) {
  const client = await db.connect();
  try {
    const currentUser = await requireAdmin(req);
    const parsed = bulkPromotionSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten().fieldErrors }, { status: 422 });
    }

    const input = parsed.data;
    assertCanAccessInstitution(currentUser, input.institutionId);
    await assertCanPromoteEnrollment(db, currentUser, {
      institution_id: input.institutionId,
      program_id: input.sourceProgramId,
      section_id: input.sourceSectionId ?? null,
      academic_year_id: input.sourceAcademicYearId,
    });
    await ensurePromotionSchema();
    await ensureStudentIdCardPromotionSchema();
    const destination = await assertDestination(input);
    const outcome = input.outcome.toUpperCase();
    const effectiveDate = toSqlDate(input.admissionDate);

    await client.query("BEGIN");

    const sourceResult = await client.query<SourceEnrollmentRow>(
      `
        SELECT
          enrollment.id,
          enrollment.student_id,
          profile.user_id,
          users.full_name,
          enrollment.institution_id,
          enrollment.program_id,
          enrollment.academic_year_id,
          enrollment.class_category_id,
          enrollment.section_id
        FROM student_enrollments enrollment
        INNER JOIN student_profiles profile ON profile.id = enrollment.student_id
        INNER JOIN users ON users.id = profile.user_id
        WHERE profile.user_id = ANY($1::int[])
          AND enrollment.institution_id = $2
          AND enrollment.academic_year_id = $3
          AND enrollment.program_id = $4
          AND ($5::int IS NULL OR enrollment.section_id = $5::int)
          AND enrollment.status = 'active'
          AND enrollment.promoted_at IS NULL
          AND COALESCE(enrollment.is_deleted, FALSE) = FALSE
        ORDER BY lower(users.full_name), users.full_name, users.id
        FOR UPDATE OF enrollment
      `,
      [
        Array.from(new Set(input.studentUserIds)),
        input.institutionId,
        input.sourceAcademicYearId,
        input.sourceProgramId,
        input.sourceSectionId ?? null,
      ],
    );

    const sources = sourceResult.rows;
    if (sources.length !== new Set(input.studentUserIds).size) {
      throw new Error("Some selected students do not have an active enrollment in the filtered class, section, and session");
    }

    let nextRollNumber: number | null = null;
    if (destination) {
      const maxRollResult = await client.query<{ max_roll: number | null }>(
        `
          SELECT MAX(roll_number::int) AS max_roll
          FROM student_enrollments
          WHERE institution_id = $1
            AND academic_year_id = $2
            AND program_id = $3
            AND section_id IS NOT DISTINCT FROM $4::int
            AND roll_number ~ '^[0-9]+$'
            AND COALESCE(is_deleted, FALSE) = FALSE
        `,
        [
          input.institutionId,
          destination.academic_year_id,
          destination.program_id,
          destination.section_id,
        ],
      );
      nextRollNumber = Number(maxRollResult.rows[0]?.max_roll ?? 0) + 1;
    }

    const processed: Array<{
      studentUserId: number;
      studentName: string;
      previousEnrollmentId: number;
      newEnrollmentId: number | null;
      rollNumber: string | null;
    }> = [];

    for (const source of sources) {
      let newEnrollmentId: number | null = null;
      let rollNumber: string | null = null;

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
          throw new Error(`${source.full_name} is already enrolled in the destination session and class`);
        }

        rollNumber = String(nextRollNumber);
        nextRollNumber = (nextRollNumber ?? 0) + 1;

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
            rollNumber,
            effectiveDate,
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
          effectiveFrom: effectiveDate,
          actorId: currentUser.id,
          notes: input.notes || `Student ${input.outcome}`,
          metadata: {
            previous_enrollment_id: source.id,
            promotion_type: outcome,
            program_id: destination.program_id,
            class_category_id: destination.class_category_id,
            section_id: destination.section_id,
            roll_number: rollNumber,
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

      processed.push({
        studentUserId: source.user_id,
        studentName: source.full_name,
        previousEnrollmentId: source.id,
        newEnrollmentId,
        rollNumber,
      });
    }

    await client.query("COMMIT");
    return NextResponse.json({
      success: true,
      data: {
        count: processed.length,
        processed,
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
