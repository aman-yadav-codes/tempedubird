import type { Pool, PoolClient } from "pg";
import { db } from "@/lib/db/db";
import { hashPassword } from "@/lib/auth/hash";

type Queryable = Pool | PoolClient;

export type StudentGuardianRecord = {
  id: number;
  student_id: number;
  guardian_user_id: number;
  guardian_name: string;
  guardian_email: string;
  guardian_phone: string | null;
  relationship: string;
  is_primary: boolean;
  occupation?: string | null;
  created_at: string;
};

export async function ensureStudentGuardiansSchema(client: Queryable = db): Promise<void> {
  await client.query(`
    ALTER TABLE student_guardians
      ADD COLUMN IF NOT EXISTS occupation TEXT NULL,
      ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_student_guardians_student_guardian
      ON student_guardians (student_id, guardian_user_id);
  `).catch(() => undefined);
}

export async function getStudentGuardians(
  studentUserId: number,
  client: Queryable = db
): Promise<StudentGuardianRecord[]> {
  await ensureStudentGuardiansSchema(client);

  const result = await client.query<StudentGuardianRecord>(
    `
      SELECT
        sg.id,
        sg.student_id,
        sg.guardian_user_id,
        sg.relationship,
        sg.is_primary,
        sg.occupation,
        sg.created_at,
        u.full_name AS guardian_name,
        u.email AS guardian_email,
        u.phone AS guardian_phone
      FROM student_profiles sp
      INNER JOIN student_guardians sg ON sg.student_id = sp.id
      INNER JOIN users u ON u.id = sg.guardian_user_id
      WHERE sp.user_id = $1
        AND COALESCE(sg.is_deleted, FALSE) = FALSE
      ORDER BY sg.is_primary DESC, sg.id ASC
    `,
    [studentUserId]
  );

  return result.rows;
}

export async function addStudentGuardian(
  data: {
    studentUserId: number;
    guardianName: string;
    guardianEmail: string;
    guardianPhone?: string | null;
    relationship: string;
    isPrimary?: boolean;
    occupation?: string | null;
  },
  client: Queryable = db
): Promise<StudentGuardianRecord> {
  await ensureStudentGuardiansSchema(client);

  // 1. Get or create student_profile
  const spRes = await client.query<{ id: number }>(
    `SELECT id FROM student_profiles WHERE user_id = $1 LIMIT 1`,
    [data.studentUserId]
  );
  let studentProfileId = spRes.rows[0]?.id;
  if (!studentProfileId) {
    const newSp = await client.query<{ id: number }>(
      `INSERT INTO student_profiles (user_id) VALUES ($1) RETURNING id`,
      [data.studentUserId]
    );
    studentProfileId = newSp.rows[0].id;
  }

  // 2. Check if guardian user exists by email, or create
  const normalizedEmail = data.guardianEmail.trim().toLowerCase();
  const existingUserRes = await client.query<{ id: number; full_name: string; phone: string | null }>(
    `SELECT id, full_name, phone FROM users WHERE LOWER(email) = $1 LIMIT 1`,
    [normalizedEmail]
  );

  let guardianUserId: number;

  if (existingUserRes.rows[0]) {
    guardianUserId = existingUserRes.rows[0].id;
  } else {
    // Get parent role_id
    const parentRoleRes = await client.query<{ id: number }>(
      `SELECT id FROM roles WHERE code = 'parent' LIMIT 1`
    );
    const parentRoleId = parentRoleRes.rows[0]?.id;
    const dummyPassword = await hashPassword("Parent@123456");

    const newUser = await client.query<{ id: number }>(
      `
        INSERT INTO users (full_name, email, phone, password, is_active, is_verified)
        VALUES ($1, $2, $3, $4, TRUE, TRUE)
        RETURNING id
      `,
      [data.guardianName.trim(), normalizedEmail, data.guardianPhone?.trim() || null, dummyPassword]
    );
    guardianUserId = newUser.rows[0].id;

    if (parentRoleId) {
      await client.query(
        `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [guardianUserId, parentRoleId]
      );
    }
  }

  // If new guardian is primary, clear primary flag on existing guardians for this student
  if (data.isPrimary) {
    await client.query(
      `UPDATE student_guardians SET is_primary = FALSE WHERE student_id = $1`,
      [studentProfileId]
    );
  }

  // Check if link already exists in student_guardians
  const existingLinkRes = await client.query<{ id: number }>(
    `SELECT id FROM student_guardians WHERE student_id = $1 AND guardian_user_id = $2 LIMIT 1`,
    [studentProfileId, guardianUserId]
  );

  let linkRes;
  if (existingLinkRes.rows[0]) {
    linkRes = await client.query<StudentGuardianRecord>(
      `
        UPDATE student_guardians
        SET
          relationship = $1,
          is_primary = $2,
          occupation = $3,
          is_deleted = FALSE
        WHERE id = $4
        RETURNING *
      `,
      [
        data.relationship || "Guardian",
        data.isPrimary ?? false,
        data.occupation?.trim() || null,
        existingLinkRes.rows[0].id,
      ]
    );
  } else {
    linkRes = await client.query<StudentGuardianRecord>(
      `
        INSERT INTO student_guardians (student_id, guardian_user_id, relationship, is_primary, occupation)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `,
      [
        studentProfileId,
        guardianUserId,
        data.relationship || "Guardian",
        data.isPrimary ?? false,
        data.occupation?.trim() || null,
      ]
    );
  }

  return {
    id: linkRes.rows[0].id,
    student_id: studentProfileId,
    guardian_user_id: guardianUserId,
    guardian_name: data.guardianName,
    guardian_email: normalizedEmail,
    guardian_phone: data.guardianPhone || null,
    relationship: data.relationship || "Guardian",
    is_primary: data.isPrimary ?? false,
    occupation: data.occupation || null,
    created_at: new Date().toISOString(),
  };
}

export async function deleteStudentGuardian(
  studentUserId: number,
  guardianUserId: number,
  client: Queryable = db
): Promise<boolean> {
  await ensureStudentGuardiansSchema(client);

  const spRes = await client.query<{ id: number }>(
    `SELECT id FROM student_profiles WHERE user_id = $1 LIMIT 1`,
    [studentUserId]
  );
  const studentProfileId = spRes.rows[0]?.id;
  if (!studentProfileId) return false;

  const result = await client.query(
    `UPDATE student_guardians SET is_deleted = TRUE WHERE student_id = $1 AND guardian_user_id = $2`,
    [studentProfileId, guardianUserId]
  );

  return (result.rowCount ?? 0) > 0;
}
