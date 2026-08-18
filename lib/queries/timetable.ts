import type { Pool } from "pg";

type Queryable = Pick<Pool, "query">;

export async function getProgramScope(db: Queryable, programId: number) {
  const result = await db.query<{
    id: number;
    institution_id: number;
    title: string;
    academic_year_id: number | null;
  }>(
    `
      SELECT program.id, program.institution_id, program.title, program.academic_year_id
      FROM institution_programs program
      INNER JOIN institution_profiles institution
        ON institution.id = program.institution_id
       AND institution.is_active = TRUE
       AND COALESCE(institution.is_deleted, FALSE) = FALSE
      WHERE program.id = $1
        AND COALESCE(program.is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    [programId]
  );

  return result.rows[0] ?? null;
}

export async function getProgramSubjects(db: Queryable, programId: number) {
  const result = await db.query<{
    id: number;
    name: string;
    category_name: string | null;
    board_name: string | null;
  }>(
    `
      SELECT s.id, s.name, c.name AS category_name, b.name AS board_name
      FROM program_subjects ps
      INNER JOIN institution_programs program
        ON program.id = ps.program_id
       AND COALESCE(program.is_deleted, FALSE) = FALSE
      INNER JOIN subjects s ON s.id = ps.subject_id
      LEFT JOIN categories c ON c.id = s.category_id
      LEFT JOIN boards b ON b.id = s.board_id
      WHERE ps.program_id = $1
      ORDER BY s.name ASC
    `,
    [programId]
  );

  return result.rows;
}

export async function getProgramSections(db: Queryable, programId: number) {
  const result = await db.query<{ id: number; name: string }>(
    `
      SELECT s.id, s.name
      FROM program_sections ps
      INNER JOIN institution_programs program
        ON program.id = ps.program_id
       AND COALESCE(program.is_deleted, FALSE) = FALSE
      INNER JOIN sections s ON s.id = ps.section_id
      WHERE ps.program_id = $1
      ORDER BY s.name ASC
    `,
    [programId]
  );

  return result.rows;
}

export async function assertTeacherInInstitution(
  db: Queryable,
  teacherIds: number[],
  institutionId: number
) {
  const ids = Array.from(new Set(teacherIds)).filter((id) => Number.isInteger(id) && id > 0);
  if (!ids.length) return;

  const result = await db.query<{ count: number }>(
    `
      SELECT COUNT(DISTINCT u.id)::int AS count
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN institution_memberships im ON im.user_id = u.id AND im.is_active = TRUE
      LEFT JOIN institution_profiles ip
        ON ip.id = $2
       AND ip.is_active = TRUE
       AND COALESCE(ip.is_deleted, FALSE) = FALSE
      LEFT JOIN roles membership_role ON membership_role.id = im.role_id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles platform_role ON platform_role.id = ur.role_id
      WHERE u.id = ANY($1::int[])
        AND u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
        AND ip.id IS NOT NULL
        AND (up.under_institution_id = $2 OR im.institution_id = $2)
        AND (
          COALESCE(up.is_teacher, FALSE) = TRUE
          OR platform_role.code = 'teacher'
          OR membership_role.code = 'teacher'
        )
    `,
    [ids, institutionId]
  );

  if (Number(result.rows[0]?.count ?? 0) !== ids.length) {
    throw new Error("Teachers must belong to the selected institution");
  }
}

export async function assertProgramSectionSubjectYear(
  db: Queryable,
  input: {
    programId: number;
    sectionId: number;
    academicYearId: number;
    subjectIds?: number[];
  }
) {
  const [sectionResult, yearResult] = await Promise.all([
    db.query(
      `SELECT 1 FROM program_sections WHERE program_id = $1 AND section_id = $2 LIMIT 1`,
      [input.programId, input.sectionId]
    ),
    db.query(
      `
        SELECT 1
        FROM academic_years ay
        INNER JOIN institution_programs ip
          ON ip.institution_id = ay.institution_id
         AND COALESCE(ip.is_deleted, FALSE) = FALSE
        INNER JOIN institution_profiles institution
          ON institution.id = ay.institution_id
         AND institution.is_active = TRUE
         AND COALESCE(institution.is_deleted, FALSE) = FALSE
        WHERE ip.id = $1
          AND ay.id = $2
          AND COALESCE(ay.is_deleted, FALSE) = FALSE
        LIMIT 1
      `,
      [input.programId, input.academicYearId]
    ),
  ]);

  if (!sectionResult.rows.length) {
    throw new Error("Section must belong to the selected program");
  }
  if (!yearResult.rows.length) {
    throw new Error("Academic year must belong to the selected program institution");
  }

  const subjectIds = Array.from(new Set(input.subjectIds ?? [])).filter((id) => Number.isInteger(id) && id > 0);
  if (subjectIds.length) {
    const subjectResult = await db.query<{ count: number }>(
      `
        SELECT COUNT(*)::int AS count
        FROM program_subjects
        WHERE program_id = $1
          AND subject_id = ANY($2::int[])
      `,
      [input.programId, subjectIds]
    );
    if (Number(subjectResult.rows[0]?.count ?? 0) !== subjectIds.length) {
      throw new Error("Subjects must belong to the selected program");
    }
  }
}
