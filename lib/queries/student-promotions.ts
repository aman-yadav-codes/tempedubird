import type { Pool, PoolClient } from "pg";
import { db } from "@/lib/db/db";

type Queryable = Pool | PoolClient;

export type StudentPromotionRow = {
  id: number;
  student_id: number;
  user_id: number;
  institution_id: number;
  source_enrollment_id: number | null;
  destination_enrollment_id: number | null;
  outcome: "promoted" | "retained" | "failed" | "graduated" | "transferred";
  from_academic_year_id: number | null;
  from_academic_year_name?: string | null;
  from_program_id: number | null;
  from_program_name?: string | null;
  from_section_id: number | null;
  from_section_name?: string | null;
  to_academic_year_id: number | null;
  to_academic_year_name?: string | null;
  to_program_id: number | null;
  to_program_name?: string | null;
  to_section_id: number | null;
  to_section_name?: string | null;
  roll_number: string | null;
  notes: string | null;
  promoted_by: number | null;
  promoted_by_name?: string | null;
  promoted_at: string;
  created_at: string;
};

export async function ensureStudentPromotionsTable(client: Queryable = db): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS student_promotions (
      id SERIAL PRIMARY KEY,
      student_id INT NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      institution_id INT NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      source_enrollment_id INT NULL REFERENCES student_enrollments(id) ON DELETE SET NULL,
      destination_enrollment_id INT NULL REFERENCES student_enrollments(id) ON DELETE SET NULL,
      outcome VARCHAR(50) NOT NULL,
      from_academic_year_id INT NULL REFERENCES academic_years(id) ON DELETE SET NULL,
      from_program_id INT NULL REFERENCES institution_programs(id) ON DELETE SET NULL,
      from_section_id INT NULL REFERENCES sections(id) ON DELETE SET NULL,
      to_academic_year_id INT NULL REFERENCES academic_years(id) ON DELETE SET NULL,
      to_program_id INT NULL REFERENCES institution_programs(id) ON DELETE SET NULL,
      to_section_id INT NULL REFERENCES sections(id) ON DELETE SET NULL,
      roll_number VARCHAR(50) NULL,
      notes TEXT NULL,
      promoted_by INT NULL REFERENCES users(id) ON DELETE SET NULL,
      promoted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_student_promotions_user_inst
    ON student_promotions(user_id, institution_id, outcome);
  `);
}

export async function getStudentPromotions(
  studentUserId: number,
  client: Queryable = db
): Promise<StudentPromotionRow[]> {
  await ensureStudentPromotionsTable(client);

  const result = await client.query<StudentPromotionRow>(
    `
      SELECT
        sp.*,
        ay_from.name AS from_academic_year_name,
        prog_from.title AS from_program_name,
        sec_from.name AS from_section_name,
        ay_to.name AS to_academic_year_name,
        prog_to.title AS to_program_name,
        sec_to.name AS to_section_name,
        u_promoter.full_name AS promoted_by_name
      FROM student_promotions sp
      LEFT JOIN academic_years ay_from ON ay_from.id = sp.from_academic_year_id
      LEFT JOIN institution_programs prog_from ON prog_from.id = sp.from_program_id
      LEFT JOIN sections sec_from ON sec_from.id = sp.from_section_id
      LEFT JOIN academic_years ay_to ON ay_to.id = sp.to_academic_year_id
      LEFT JOIN institution_programs prog_to ON prog_to.id = sp.to_program_id
      LEFT JOIN sections sec_to ON sec_to.id = sp.to_section_id
      LEFT JOIN users u_promoter ON u_promoter.id = sp.promoted_by
      WHERE sp.user_id = $1
      ORDER BY sp.promoted_at DESC, sp.id DESC
    `,
    [studentUserId]
  );

  return result.rows;
}

export async function insertStudentPromotion(
  data: {
    studentProfileId: number;
    userId: number;
    institutionId: number;
    sourceEnrollmentId?: number | null;
    destinationEnrollmentId?: number | null;
    outcome: "promoted" | "retained" | "failed" | "graduated" | "transferred";
    fromAcademicYearId?: number | null;
    fromProgramId?: number | null;
    fromSectionId?: number | null;
    toAcademicYearId?: number | null;
    toProgramId?: number | null;
    toSectionId?: number | null;
    rollNumber?: string | null;
    notes?: string | null;
    promotedBy?: number | null;
  },
  client: Queryable = db
): Promise<StudentPromotionRow> {
  await ensureStudentPromotionsTable(client);

  const result = await client.query<StudentPromotionRow>(
    `
      INSERT INTO student_promotions (
        student_id,
        user_id,
        institution_id,
        source_enrollment_id,
        destination_enrollment_id,
        outcome,
        from_academic_year_id,
        from_program_id,
        from_section_id,
        to_academic_year_id,
        to_program_id,
        to_section_id,
        roll_number,
        notes,
        promoted_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `,
    [
      data.studentProfileId,
      data.userId,
      data.institutionId,
      data.sourceEnrollmentId ?? null,
      data.destinationEnrollmentId ?? null,
      data.outcome,
      data.fromAcademicYearId ?? null,
      data.fromProgramId ?? null,
      data.fromSectionId ?? null,
      data.toAcademicYearId ?? null,
      data.toProgramId ?? null,
      data.toSectionId ?? null,
      data.rollNumber ?? null,
      data.notes ?? null,
      data.promotedBy ?? null,
    ]
  );

  return result.rows[0];
}
