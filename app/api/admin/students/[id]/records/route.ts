import { NextResponse } from "next/server";
import type { PoolClient } from "pg";

import { getAuthenticatedUser, requireAdmin } from "@/lib/auth/auth";
import { hashPassword } from "@/lib/auth/hash";
import { assertCanAccessInstitution, assertCanAccessUserWithinInstitutionScope } from "@/lib/auth/institution-scope";
import { withApiDebug } from "@/lib/api/debug";
import { db } from "@/lib/db/db";
import { recordEnrollmentLifecycle } from "@/lib/queries/lifecycle";
import { canPromoteEnrollment } from "@/lib/queries/student-promotion-permissions";
import { ensureStudentEnrollmentsSchema, readStudentRecords } from "@/lib/queries/student-records";
import { studentRecordsSchema } from "@/lib/validations/student-records.schema";
import type { StudentRecordsInput } from "@/lib/validations/student-records.schema";

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function toSqlDate(value: Date | null | undefined) {
  return value ? value.toISOString().slice(0, 10) : null;
}

function enrollmentRollKey(enrollment: StudentRecordsInput["enrollments"][number]) {
  return [
    enrollment.institution_id ?? "",
    enrollment.program_id ?? "",
    enrollment.academic_year_id ?? "",
    enrollment.section_id ?? "",
    enrollment.roll_number ?? "",
  ].join(":");
}

async function getStudentProfileId(client: PoolClient, userId: number, adminId: number) {
  const result = await client.query<{ id: number }>(
    `
      INSERT INTO student_profiles (user_id, created_by, updated_by)
      VALUES ($1, $2, $2)
      ON CONFLICT (user_id)
      DO UPDATE SET updated_by = EXCLUDED.updated_by, updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `,
    [userId, adminId]
  );
  return result.rows[0].id;
}

async function assertAcademicYearInInstitution(client: PoolClient, academicYearId: number, institutionId: number) {
  const result = await client.query<{ id: number }>(
    `SELECT ay.id
       FROM academic_years ay
       INNER JOIN institution_profiles ip
          ON ip.id = ay.institution_id
         AND ip.is_active = TRUE
         AND COALESCE(ip.is_deleted, FALSE) = FALSE
      WHERE ay.id = $1
        AND ay.institution_id = $2
        AND COALESCE(ay.is_deleted, FALSE) = FALSE`,
    [academicYearId, institutionId]
  );
  if (!result.rows[0]) throw new Error("Academic year does not belong to selected institution");
}

async function assertProgramEnrollmentScope(
  client: PoolClient,
  input: {
    programId: number;
    institutionId: number;
    academicYearId: number;
    classCategoryId: number;
    sectionId?: number | null;
  }
) {
  const program = await client.query<{ id: number }>(
    `
      SELECT id
      FROM institution_programs
      WHERE id = $1
        AND institution_id = $2
        AND (academic_year_id IS NULL OR academic_year_id = $3)
        AND COALESCE(is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    [input.programId, input.institutionId, input.academicYearId]
  );
  if (!program.rows[0]) throw new Error("Program does not belong to selected institution or academic year");

  const category = await client.query<{ category_id: number }>(
    `
      SELECT category_id
      FROM program_categories
      WHERE program_id = $1
        AND category_id = $2
      LIMIT 1
    `,
    [input.programId, input.classCategoryId]
  );
  if (!category.rows[0]) throw new Error("Selected class does not belong to selected program");

  if (input.sectionId) {
    const section = await client.query<{ section_id: number }>(
      `
        SELECT section_id
        FROM program_sections
        WHERE program_id = $1
          AND section_id = $2
        LIMIT 1
      `,
      [input.programId, input.sectionId]
    );
    if (!section.rows[0]) throw new Error("Section does not belong to selected program");
  }
}

async function assertRollNumberAvailable(
  client: PoolClient,
  enrollment: StudentRecordsInput["enrollments"][number],
  studentProfileId: number
) {
  if (
    !enrollment.institution_id ||
    !enrollment.program_id ||
    !enrollment.academic_year_id ||
    !enrollment.section_id ||
    !enrollment.roll_number
  ) {
    return;
  }

  const duplicate = await client.query<{ student_name: string }>(
    `
      SELECT student_user.full_name AS student_name
      FROM student_enrollments existing
      INNER JOIN student_profiles student_profile ON student_profile.id = existing.student_id
      INNER JOIN users student_user ON student_user.id = student_profile.user_id
      WHERE existing.institution_id = $1
        AND existing.program_id = $2
        AND existing.academic_year_id = $3
        AND existing.section_id = $4
        AND existing.roll_number = $5
        AND existing.status = 'active'
        AND COALESCE(existing.is_deleted, FALSE) = FALSE
        AND existing.student_id <> $6
      LIMIT 1
    `,
    [
      enrollment.institution_id,
      enrollment.program_id,
      enrollment.academic_year_id,
      enrollment.section_id,
      enrollment.roll_number,
      studentProfileId,
    ]
  );

  const row = duplicate.rows[0];
  if (row) {
    throw new Error(`Roll number ${enrollment.roll_number} is already assigned to ${row.student_name} in this class and section`);
  }
}

async function assertStudentIdentifiersAvailable(
  client: PoolClient,
  records: StudentRecordsInput,
  submittedEnrollments: StudentRecordsInput["enrollments"],
  studentProfileId: number
) {
  const aparId = records.profile?.apar_id ? String(records.profile.apar_id).trim().toUpperCase() : null;
  if (aparId) {
    const duplicateApar = await client.query<{ student_name: string }>(
      `
        SELECT student_user.full_name AS student_name
        FROM student_profiles profile
        INNER JOIN users student_user ON student_user.id = profile.user_id
        WHERE UPPER(profile.apar_id) = $1
          AND profile.id <> $2
        LIMIT 1
      `,
      [aparId, studentProfileId]
    );
    const row = duplicateApar.rows[0];
    if (row) {
      throw new Error(`APAR ID ${aparId} is already assigned to ${row.student_name}`);
    }
  }

  const admissionNumber = records.profile?.admission_number ? String(records.profile.admission_number).trim().toUpperCase() : null;
  if (admissionNumber) {
    const institutionIds = Array.from(
      new Set(
        submittedEnrollments
          .map((enrollment) => enrollment.institution_id)
          .filter((value): value is number => Number.isInteger(value) && value > 0)
      )
    );

    for (const institutionId of institutionIds) {
      const duplicateAdmission = await client.query<{ student_name: string }>(
        `
          SELECT student_user.full_name AS student_name
          FROM student_profiles profile
          INNER JOIN users student_user ON student_user.id = profile.user_id
          INNER JOIN student_enrollments enrollment ON enrollment.student_id = profile.id
          WHERE UPPER(profile.admission_number) = $1
            AND enrollment.institution_id = $2
            AND enrollment.status = 'active'
            AND COALESCE(enrollment.is_deleted, FALSE) = FALSE
            AND profile.id <> $3
          LIMIT 1
        `,
        [admissionNumber, institutionId, studentProfileId]
      );
      const row = duplicateAdmission.rows[0];
      if (row) {
        throw new Error(`Admission number ${admissionNumber} is already assigned to ${row.student_name} in this institution`);
      }
    }
  }
}

async function getParentRoleId(client: PoolClient) {
  const result = await client.query<{ id: number }>(
    `
      SELECT id
      FROM roles
      WHERE code = 'parent'
        AND COALESCE(is_deleted, FALSE) = FALSE
      LIMIT 1
    `
  );
  if (!result.rows[0]) throw new Error("Parent role is not configured");
  return result.rows[0].id;
}

async function readStudentRecordsForActor(studentUserId: number, actor: Awaited<ReturnType<typeof requireAdmin>>) {
  const data = await readStudentRecords(studentUserId);
  const enrollments = await Promise.all(
    data.enrollments.map(async (enrollment) => {
      const normalized = {
        institution_id: Number(enrollment.institution_id),
        program_id: enrollment.program_id == null ? null : Number(enrollment.program_id),
        section_id: enrollment.section_id == null ? null : Number(enrollment.section_id),
        academic_year_id: Number(enrollment.academic_year_id),
      };
      const canPromote =
        Number.isInteger(normalized.institution_id) &&
        normalized.institution_id > 0 &&
        Number.isInteger(normalized.academic_year_id) &&
        normalized.academic_year_id > 0
          ? await canPromoteEnrollment(db, actor, normalized)
          : false;
      return { ...enrollment, can_promote: canPromote };
    }),
  );
  return {
    ...data,
    enrollments,
    enrollment: enrollments[0] ?? data.enrollment,
  };
}

async function resolveGuardianUser(
  client: PoolClient,
  guardian: StudentRecordsInput["guardians"][number],
  institutionId: number,
  actorId: number
) {
  const parentRoleId = await getParentRoleId(client);
  const email = guardian.email.trim().toLowerCase();
  const phone = guardian.phone.replace(/\D/g, "").slice(-10);
  const passwordHash = guardian.password ? await hashPassword(guardian.password) : null;

  let userId = guardian.guardian_user_id ?? null;
  if (!userId) {
    const existing = await client.query<{ id: number }>(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1`,
      [email]
    );
    userId = existing.rows[0]?.id ?? null;
  }

  if (userId) {
    const fields = [
      "full_name = $1",
      "email = $2",
      "phone = $3",
      "is_active = TRUE",
      "is_verified = TRUE",
      "updated_by = $4",
      "updated_at = CURRENT_TIMESTAMP",
    ];
    const params: unknown[] = [guardian.full_name, email, phone, actorId];
    if (passwordHash) {
      params.push(passwordHash);
      fields.push(`password = $${params.length}`);
    }
    params.push(userId);
    await client.query(
      `UPDATE users SET ${fields.join(", ")} WHERE id = $${params.length}`,
      params
    );
  } else {
    const inserted = await client.query<{ id: number }>(
      `
        INSERT INTO users (
          full_name,
          email,
          phone,
          password,
          is_active,
          is_verified,
          is_profile_complete,
          created_by,
          updated_by,
          login_provider
        )
        VALUES ($1,$2,$3,$4,TRUE,TRUE,FALSE,$5,$5,'email')
        RETURNING id
      `,
      [guardian.full_name, email, phone, passwordHash, actorId]
    );
    userId = inserted.rows[0].id;
  }

  if (institutionId) {
    await client.query(
      `INSERT INTO user_profiles (user_id, under_institution_id)
       VALUES ($1,$2)
       ON CONFLICT (user_id)
       DO UPDATE SET
         under_institution_id = EXCLUDED.under_institution_id,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, institutionId]
    );

    await db.query(`DELETE FROM user_roles WHERE user_id = $1`, [userId]);
    await client.query(
      `
        INSERT INTO institution_memberships (
          institution_id,
          user_id,
          role_id,
          is_active,
          status,
          join_date,
          is_current
        )
        VALUES ($1,$2,$3,TRUE,'ACTIVE',CURRENT_TIMESTAMP,TRUE)
        ON CONFLICT (institution_id, user_id)
        DO UPDATE SET
          role_id = EXCLUDED.role_id,
          is_active = TRUE,
          status = 'ACTIVE',
          leave_date = NULL,
          is_current = TRUE,
          is_deleted = FALSE,
          deleted_at = NULL,
          deleted_by = NULL,
          updated_at = CURRENT_TIMESTAMP
      `,
      [institutionId, userId, parentRoleId]
    );
  } else {
    await client.query(
      `INSERT INTO user_roles (user_id, role_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, parentRoleId]
    );
  }

  return userId;
}

async function getStudentRecords(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const { id } = await ctx.params;
    const studentUserId = Number(id);
    if (!Number.isInteger(studentUserId) || studentUserId <= 0) {
      return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
    }

    await assertCanAccessUserWithinInstitutionScope(db, currentUser, studentUserId);
    return NextResponse.json({ data: await readStudentRecordsForActor(studentUserId, currentUser) });
  } catch (err: unknown) {
    const message = errorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : message === "Unauthorized" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

async function putStudentRecords(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const client = await db.connect();
  try {
    const currentUser = await getAuthenticatedUser(req);
    const { id } = await ctx.params;
    const studentUserId = Number(id);
    if (!Number.isInteger(studentUserId) || studentUserId <= 0) {
      return NextResponse.json({ error: "Invalid student id" }, { status: 400 });
    }
    await assertCanAccessUserWithinInstitutionScope(db, currentUser, studentUserId);

    const parsed = studentRecordsSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten().fieldErrors }, { status: 422 });
    }
    const records = parsed.data;
    const submittedEnrollments = records.enrollments.length ? records.enrollments : [records.enrollment];
    const isGuardianOrParent =
      currentUser.role_codes.includes("guardian") ||
      currentUser.role_codes.includes("parent") ||
      currentUser.roles?.includes("Guardian") ||
      currentUser.roles?.includes("Parent");

    for (const enrollment of submittedEnrollments) {
      if (enrollment.institution_id && !isGuardianOrParent) {
        assertCanAccessInstitution(currentUser, enrollment.institution_id);
      }
    }

    await client.query("BEGIN");
    await ensureStudentEnrollmentsSchema(client);
    const studentProfileId = await getStudentProfileId(client, studentUserId, currentUser.id);
    await assertStudentIdentifiersAvailable(client, records, submittedEnrollments, studentProfileId);
    const seenRollNumbers = new Set<string>();
    for (const enrollment of submittedEnrollments) {
      const key = enrollmentRollKey(enrollment);
      if (enrollment.roll_number && seenRollNumbers.has(key)) {
        throw new Error(`Roll number ${enrollment.roll_number} is repeated for the same class and section`);
      }
      if (enrollment.roll_number) seenRollNumbers.add(key);
      await assertRollNumberAvailable(client, enrollment, studentProfileId);
    }
    const emergencyGuardian =
      records.guardians.find((guardian) => guardian.is_primary) ??
      records.guardians[0] ??
      null;
    await client.query(
      `
        UPDATE student_profiles
        SET admission_number = $1,
            apar_id = $2,
            date_of_birth = $3,
            blood_group = $4,
            emergency_contact_name = $5,
            emergency_contact_phone = $6,
            updated_by = $7,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $8
      `,
      [
        records.profile.admission_number ?? null,
        records.profile.apar_id ?? null,
        toSqlDate(records.profile.date_of_birth),
        records.profile.blood_group ?? null,
        emergencyGuardian?.full_name ?? null,
        emergencyGuardian?.phone?.replace(/\D/g, "").slice(-10) || null,
        currentUser.id,
        studentProfileId,
      ]
    );

    if (records.profile.date_of_birth) {
      await client.query(
        `UPDATE user_profiles SET date_of_birth = $1 WHERE user_id = $2`,
        [toSqlDate(records.profile.date_of_birth), studentUserId]
      );
    }

    const savedEnrollmentIds: number[] = [];
    for (const enrollment of submittedEnrollments) {
      if (enrollment.institution_id && enrollment.academic_year_id) {
        const hasEnrollmentDetails = Boolean(
          enrollment.program_id ||
          enrollment.class_category_id ||
          enrollment.roll_number ||
          enrollment.section_id
        );
        if (!hasEnrollmentDetails && submittedEnrollments.length > 1) {
          continue;
        }

        await assertAcademicYearInInstitution(client, enrollment.academic_year_id, enrollment.institution_id);
        let classCategoryId = enrollment.class_category_id ?? null;
        if (!classCategoryId && enrollment.program_id) {
          const defaultCat = await client.query<{ category_id: number }>(
            `SELECT category_id FROM program_categories WHERE program_id = $1 ORDER BY id ASC LIMIT 1`,
            [enrollment.program_id]
          );
          classCategoryId = defaultCat.rows[0]?.category_id ?? null;
        }
        if (enrollment.program_id && classCategoryId) {
          await assertProgramEnrollmentScope(client, {
            programId: enrollment.program_id,
            institutionId: enrollment.institution_id,
            academicYearId: enrollment.academic_year_id,
            classCategoryId: classCategoryId,
            sectionId: enrollment.section_id ?? null,
          });
        }

        let savedEnrollment;
        if (enrollment.id) {
          savedEnrollment = await client.query<{
            id: number;
            student_id: number;
            institution_id: number;
            academic_year_id: number;
            status: string;
            admission_date: string | null;
          }>(
            `
              UPDATE student_enrollments
              SET
                institution_id = $2,
                program_id = $3,
                academic_year_id = $4,
                class_category_id = $5,
                section_id = $6,
                roll_number = $7,
                admission_date = $8,
                status = $9,
                remarks = $10,
                is_current = TRUE,
                effective_to = NULL,
                updated_by = $11,
                updated_at = CURRENT_TIMESTAMP
              WHERE id = $1 AND student_id = $12
              RETURNING id, student_id, institution_id, academic_year_id, status, admission_date
            `,
            [
              enrollment.id,
              enrollment.institution_id,
              enrollment.program_id ?? null,
              enrollment.academic_year_id,
              classCategoryId,
              enrollment.section_id ?? null,
              enrollment.roll_number ?? null,
              toSqlDate(enrollment.admission_date),
              enrollment.status,
              enrollment.remarks ?? null,
              currentUser.id,
              studentProfileId,
            ]
          );
        }

        if (!savedEnrollment?.rows[0]) {
          savedEnrollment = await client.query<{
            id: number;
            student_id: number;
            institution_id: number;
            academic_year_id: number;
            status: string;
            admission_date: string | null;
          }>(
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
                remarks,
                created_by,
                updated_by,
                is_current,
                effective_from
              )
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$11,TRUE,COALESCE($8::date::timestamp, CURRENT_TIMESTAMP))
              ON CONFLICT (student_id, institution_id, program_id, academic_year_id)
                WHERE status = 'active' AND COALESCE(is_deleted, FALSE) = FALSE
              DO UPDATE SET
                institution_id = EXCLUDED.institution_id,
                program_id = EXCLUDED.program_id,
                academic_year_id = EXCLUDED.academic_year_id,
                class_category_id = COALESCE(EXCLUDED.class_category_id, student_enrollments.class_category_id),
                section_id = EXCLUDED.section_id,
                roll_number = EXCLUDED.roll_number,
                admission_date = EXCLUDED.admission_date,
                status = EXCLUDED.status,
                remarks = EXCLUDED.remarks,
                is_current = TRUE,
                effective_to = NULL,
                updated_by = EXCLUDED.updated_by,
                updated_at = CURRENT_TIMESTAMP
              RETURNING id, student_id, institution_id, academic_year_id, status, admission_date
            `,
            [
              studentProfileId,
              enrollment.institution_id,
              enrollment.program_id ?? null,
              enrollment.academic_year_id,
              classCategoryId,
              enrollment.section_id ?? null,
              enrollment.roll_number ?? null,
              toSqlDate(enrollment.admission_date),
              enrollment.status,
              enrollment.remarks ?? null,
              currentUser.id,
            ]
          );
        }

        const row = savedEnrollment.rows[0];
        if (row) {
          savedEnrollmentIds.push(row.id);
          await recordEnrollmentLifecycle(client, {
            enrollmentId: row.id,
            studentId: row.student_id,
            institutionId: row.institution_id,
            academicYearId: row.academic_year_id,
            status: (row.status || "ACTIVE").toUpperCase(),
            effectiveFrom: row.admission_date ?? null,
            actorId: currentUser.id,
            notes: "Student enrollment saved",
            metadata: {
              program_id: enrollment.program_id ?? null,
              class_category_id: enrollment.class_category_id,
              section_id: enrollment.section_id ?? null,
            },
          });
        }
      }
    }

    if (records.enrollments.length) {
      await client.query(
        `
          UPDATE student_enrollments
          SET status = 'completed',
              is_current = FALSE,
              effective_to = COALESCE(effective_to, CURRENT_TIMESTAMP),
              updated_by = $2,
              updated_at = CURRENT_TIMESTAMP
          WHERE student_id = $1
            AND status = 'active'
            AND COALESCE(is_deleted, FALSE) = FALSE
            AND NOT (id = ANY($3::int[]))
        `,
        [studentProfileId, currentUser.id, savedEnrollmentIds]
      );
    }

    const primaryEnrollment = submittedEnrollments[0] ?? records.enrollment;

    if (isGuardianOrParent) {
      if (records.guardians.length > 0) {
        await client.query(
          `UPDATE student_guardians
              SET is_deleted = TRUE,
                  deleted_at = NOW(),
                  updated_at = CURRENT_TIMESTAMP
            WHERE student_id = $1
              AND guardian_user_id <> $2
              AND COALESCE(is_deleted, FALSE) = FALSE`,
          [studentProfileId, currentUser.id]
        );
      }
      const checkSelf = await client.query<{ id: number }>(
        `SELECT id FROM student_guardians WHERE student_id = $1 AND guardian_user_id = $2 LIMIT 1`,
        [studentProfileId, currentUser.id]
      );
      if (checkSelf.rows[0]) {
        await client.query(
          `UPDATE student_guardians SET is_deleted = FALSE, deleted_at = NULL, is_primary = TRUE, updated_at = NOW() WHERE id = $1`,
          [checkSelf.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO student_guardians (student_id, guardian_user_id, relationship, is_primary, is_deleted)
           VALUES ($1, $2, 'Parent', TRUE, FALSE)`,
          [studentProfileId, currentUser.id]
        );
      }
    } else {
      await client.query(
        `UPDATE student_guardians
            SET is_deleted = TRUE,
                deleted_at = NOW(),
                updated_at = CURRENT_TIMESTAMP
          WHERE student_id = $1
            AND COALESCE(is_deleted, FALSE) = FALSE`,
        [studentProfileId]
      );
    }

    for (const guardian of records.guardians) {
      const guardianInstId = primaryEnrollment?.institution_id ?? null;
      if (!guardianInstId && !isGuardianOrParent) {
        throw new Error("Institution is required before adding guardians");
      }
      const guardianUserId = await resolveGuardianUser(
        client,
        guardian,
        guardianInstId,
        currentUser.id
      );

      const checkG = await client.query<{ id: number }>(
        `SELECT id FROM student_guardians WHERE student_id = $1 AND guardian_user_id = $2 LIMIT 1`,
        [studentProfileId, guardianUserId]
      );
      if (checkG.rows[0]) {
        await client.query(
          `UPDATE student_guardians
              SET is_deleted = FALSE,
                  deleted_at = NULL,
                  relationship = $2,
                  is_primary = $3,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $1`,
          [checkG.rows[0].id, guardian.relationship, guardian.is_primary]
        );
      } else {
        await client.query(
          `
            INSERT INTO student_guardians (student_id, guardian_user_id, relationship, is_primary, is_deleted)
            VALUES ($1, $2, $3, $4, FALSE)
          `,
          [studentProfileId, guardianUserId, guardian.relationship, guardian.is_primary]
        );
      }
    }

    await client.query(
      `UPDATE student_documents
          SET is_deleted = TRUE,
              deleted_at = NOW(),
              updated_at = CURRENT_TIMESTAMP
        WHERE student_id = $1
          AND COALESCE(is_deleted, FALSE) = FALSE`,
      [studentProfileId]
    );
    for (const document of records.documents) {
      await client.query(
        `
          INSERT INTO student_documents (student_id, document_type, document_number, file_url, public_id, resource_type, is_verified, verified_by)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        `,
        [
          studentProfileId,
          document.document_type,
          document.document_number ?? null,
          document.file_url,
          document.public_id ?? null,
          document.resource_type ?? null,
          document.is_verified,
          document.is_verified ? currentUser.id : null,
        ]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ data: await readStudentRecordsForActor(studentUserId, currentUser) });
  } catch (err: unknown) {
    await client.query("ROLLBACK");
    const message = errorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  } finally {
    client.release();
  }
}

export const GET = withApiDebug(getStudentRecords, "admin.student_records.get");
export const PUT = withApiDebug(putStudentRecords, "admin.student_records.put");
