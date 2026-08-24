import { Pool } from "pg";
import {
  Subject,
  ListSubjectsOptions,
  CreateSubjectData,
  UpdateSubjectData,
} from "@/lib/types/subject";

export async function ensureSubjectsSchemaAndDeduplicate(db: Pool) {
  try {
    // 1. Create or update subjects table structure
    await db.query(`
      CREATE TABLE IF NOT EXISTS subjects (
        id SERIAL PRIMARY KEY,
        category_id INT,
        board_id INT,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        code VARCHAR(100),
        icon_url VARCHAR(500),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        deleted_at TIMESTAMPTZ,
        deleted_by INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Ensure columns are nullable so subjects can exist independently of classes/categories
      ALTER TABLE subjects ALTER COLUMN category_id DROP NOT NULL;
      ALTER TABLE subjects ALTER COLUMN board_id DROP NOT NULL;
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS course_id INT;
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS code VARCHAR(100);
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS icon_url VARCHAR(500);
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE subjects ADD COLUMN IF NOT EXISTS deleted_by INT;

      CREATE INDEX IF NOT EXISTS idx_subjects_name ON subjects (name);
      CREATE INDEX IF NOT EXISTS idx_subjects_slug ON subjects (slug);
      CREATE INDEX IF NOT EXISTS idx_subjects_course ON subjects (course_id);
      CREATE INDEX IF NOT EXISTS idx_subjects_active ON subjects (is_active, is_deleted);
    `);

    // 2. Clean and normalize any old subject names that contain "Class X - " or "Grade X " prefixes
    await db.query(`
      UPDATE subjects
      SET name = TRIM(REGEXP_REPLACE(name, '^(Class|Grade|Course)\\s+\\d+([a-zA-Z]+)?\\s*[-–:]*\\s*', '', 'i')),
          updated_at = NOW()
      WHERE name ~* '^(Class|Grade|Course)\\s+\\d+';
    `);

    // 3. Deduplicate old subjects: keep the earliest active entry and mark duplicates deleted
    await db.query(`
      WITH ranked_subjects AS (
        SELECT id, ROW_NUMBER() OVER (
          PARTITION BY LOWER(TRIM(name)) 
          ORDER BY is_deleted ASC, id ASC
        ) AS rn
        FROM subjects
        WHERE is_deleted = FALSE
      )
      UPDATE subjects
      SET is_deleted = TRUE,
          deleted_at = NOW()
      WHERE id IN (
        SELECT id FROM ranked_subjects WHERE rn > 1
      );
    `);

    // 4. Seed standard master subjects if there are few subjects in the database
    const countRes = await db.query(`SELECT COUNT(*)::int AS count FROM subjects WHERE is_deleted = FALSE`);
    if ((countRes.rows[0]?.count ?? 0) < 5) {
      const defaultSubjects = [
        { name: "Mathematics", slug: "mathematics", code: "MATH" },
        { name: "Physics", slug: "physics", code: "PHY" },
        { name: "Chemistry", slug: "chemistry", code: "CHEM" },
        { name: "Biology", slug: "biology", code: "BIO" },
        { name: "English Language & Literature", slug: "english", code: "ENG" },
        { name: "Computer Science & IT", slug: "computer-science", code: "CS" },
        { name: "Accountancy", slug: "accountancy", code: "ACC" },
        { name: "Economics", slug: "economics", code: "ECO" },
        { name: "Business Studies", slug: "business-studies", code: "BST" },
        { name: "Social Science", slug: "social-science", code: "SST" },
        { name: "History", slug: "history", code: "HIST" },
        { name: "Geography", slug: "geography", code: "GEO" },
        { name: "Political Science", slug: "political-science", code: "POL" },
        { name: "Environmental Studies (EVS)", slug: "environmental-studies", code: "EVS" },
        { name: "Hindi", slug: "hindi", code: "HIN" },
        { name: "Sanskrit", slug: "sanskrit", code: "SAN" },
        { name: "Psychology", slug: "psychology", code: "PSY" },
        { name: "Sociology", slug: "sociology", code: "SOC" },
        { name: "Statistics", slug: "statistics", code: "STAT" },
        { name: "Data Structures & Algorithms", slug: "data-structures", code: "DSA" },
        { name: "Mechanical Engineering", slug: "mechanical-engineering", code: "MECH" },
        { name: "Electrical & Electronics", slug: "electrical-electronics", code: "EEE" },
        { name: "Civil Engineering", slug: "civil-engineering", code: "CIVIL" },
        { name: "Artificial Intelligence", slug: "artificial-intelligence", code: "AI" },
      ];

      for (const s of defaultSubjects) {
        const check = await db.query(
          `SELECT id FROM subjects WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND is_deleted = FALSE`,
          [s.name]
        );
        if (check.rows.length === 0) {
          await db.query(
            `INSERT INTO subjects (name, slug, code, is_active, is_deleted)
             VALUES ($1, $2, $3, true, false)`,
            [s.name, s.slug, s.code]
          );
        }
      }
    }
  } catch (err) {
    console.error("Error in ensureSubjectsSchemaAndDeduplicate:", err);
  }
}

export async function listSubjects(
  db: Pool,
  opts: ListSubjectsOptions = {}
) {
  await ensureSubjectsSchemaAndDeduplicate(db);

  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;

  const conditions: string[] = ["s.is_deleted = FALSE"];
  const params: any[] = [];

  if (opts.categoryId) {
    params.push(opts.categoryId);
    conditions.push(`s.category_id = $${params.length}`);
  }

  if (opts.boardId) {
    params.push(opts.boardId);
    conditions.push(`s.board_id = $${params.length}`);
  }

  if (opts.courseId) {
    params.push(opts.courseId);
    conditions.push(
      `(s.course_id = $${params.length} OR EXISTS (SELECT 1 FROM master_course_subjects mcs WHERE mcs.subject_id = s.id AND mcs.course_id = $${params.length}))`
    );
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(s.name ILIKE $${params.length} OR s.slug ILIKE $${params.length} OR s.code ILIKE $${params.length} OR mc.name ILIKE $${params.length})`
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `
        SELECT
          s.id,
          s.category_id,
          c.name AS category_name,
          s.board_id,
          b.name AS board_name,
          s.course_id,
          mc.name AS course_name,
          mc.authority_type,
          COALESCE(mc.university_name, u.name) AS university_name,
          cp.name AS certification_provider_name,
          s.name,
          s.slug,
          s.code,
          s.icon_url,
          s.is_active,
          s.is_deleted,
          s.created_at,
          s.updated_at
        FROM subjects s
        LEFT JOIN master_courses mc ON mc.id = s.course_id
        LEFT JOIN categories c ON c.id = COALESCE(s.category_id, mc.category_id)
        LEFT JOIN boards b ON b.id = COALESCE(s.board_id, mc.board_id)
        LEFT JOIN institution_profiles u ON u.id = mc.university_id
        LEFT JOIN certification_providers cp ON cp.id = mc.certification_provider_id
        ${whereClause}
        ORDER BY s.name ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, limit, offset]
    ),
    db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM subjects s
        LEFT JOIN master_courses mc ON mc.id = s.course_id
        ${whereClause}
      `,
      params
    ),
  ]);

  return {
    data: dataResult.rows as Subject[],
    total: countResult.rows[0]?.count ?? 0,
  };
}

export async function createSubject(
  db: Pool,
  data: CreateSubjectData
): Promise<Subject> {
  await ensureSubjectsSchemaAndDeduplicate(db);

  const cleanName = data.name.trim();

  // Duplicate Check by normalized name
  const existing = await db.query(
    `SELECT id, name FROM subjects WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND is_deleted = FALSE LIMIT 1`,
    [cleanName]
  );

  if (existing.rows.length > 0) {
    const existingSubject = existing.rows[0];
    if (data.courseId) {
      await db.query(
        `INSERT INTO master_course_subjects (course_id, subject_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [data.courseId, existingSubject.id]
      );
      return (await getSubjectById(db, existingSubject.id)) || (existingSubject as Subject);
    }
    const error: any = new Error(`A subject named "${existingSubject.name}" already exists`);
    error.code = "23505";
    throw error;
  }

  const res = await db.query(
    `
      INSERT INTO subjects (category_id, board_id, course_id, name, slug, code, icon_url, is_active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, category_id, board_id, course_id, name, slug, code, icon_url, is_active, is_deleted, created_at, updated_at
    `,
    [
      data.categoryId ?? null,
      data.boardId ?? null,
      data.courseId ?? null,
      cleanName,
      data.slug.trim(),
      data.code?.trim() || null,
      data.icon_url?.trim() || null,
      data.is_active !== undefined ? data.is_active : true,
    ]
  );

  const createdSubject = res.rows[0];

  if (data.courseId) {
    await db.query(
      `INSERT INTO master_course_subjects (course_id, subject_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [data.courseId, createdSubject.id]
    );
  }

  return (await getSubjectById(db, createdSubject.id)) || createdSubject;
}

export async function getSubjectById(
  db: Pool,
  subjectId: number
): Promise<Subject | null> {
  await ensureSubjectsSchemaAndDeduplicate(db);

  const res = await db.query(
    `
      SELECT
        s.id,
        s.category_id,
        c.name AS category_name,
        s.board_id,
        b.name AS board_name,
        s.course_id,
        mc.name AS course_name,
        mc.authority_type,
        COALESCE(mc.university_name, u.name) AS university_name,
        cp.name AS certification_provider_name,
        s.name,
        s.slug,
        s.code,
        s.icon_url,
        s.is_active,
        s.is_deleted,
        s.created_at,
        s.updated_at
      FROM subjects s
      LEFT JOIN master_courses mc ON mc.id = s.course_id
      LEFT JOIN categories c ON c.id = COALESCE(s.category_id, mc.category_id)
      LEFT JOIN boards b ON b.id = COALESCE(s.board_id, mc.board_id)
      LEFT JOIN institution_profiles u ON u.id = mc.university_id
      LEFT JOIN certification_providers cp ON cp.id = mc.certification_provider_id
      WHERE s.id = $1 AND s.is_deleted = FALSE
    `,
    [subjectId]
  );

  return res.rows[0] || null;
}

export async function updateSubject(
  db: Pool,
  subjectId: number,
  data: UpdateSubjectData
): Promise<Subject | null> {
  await ensureSubjectsSchemaAndDeduplicate(db);

  if (data.name) {
    const cleanName = data.name.trim();
    const existing = await db.query(
      `SELECT id FROM subjects WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND id != $2 AND is_deleted = FALSE LIMIT 1`,
      [cleanName, subjectId]
    );

    if (existing.rows.length > 0) {
      const error: any = new Error(`A subject named "${cleanName}" already exists`);
      error.code = "23505";
      throw error;
    }
  }

  const fields: string[] = ["updated_at = NOW()"];
  const values: any[] = [];

  if (data.name !== undefined) {
    values.push(data.name.trim());
    fields.push(`name = $${values.length}`);
  }
  if (data.slug !== undefined) {
    values.push(data.slug.trim());
    fields.push(`slug = $${values.length}`);
  }
  if (data.code !== undefined) {
    values.push(data.code?.trim() || null);
    fields.push(`code = $${values.length}`);
  }
  if (data.icon_url !== undefined) {
    values.push(data.icon_url?.trim() || null);
    fields.push(`icon_url = $${values.length}`);
  }
  if (data.categoryId !== undefined) {
    values.push(data.categoryId);
    fields.push(`category_id = $${values.length}`);
  }
  if (data.boardId !== undefined) {
    values.push(data.boardId);
    fields.push(`board_id = $${values.length}`);
  }
  if (data.courseId !== undefined) {
    values.push(data.courseId);
    fields.push(`course_id = $${values.length}`);
  }
  if (data.is_active !== undefined) {
    values.push(data.is_active);
    fields.push(`is_active = $${values.length}`);
  }

  values.push(subjectId);
  const idPlaceholder = `$${values.length}`;

  const query = `
    UPDATE subjects
    SET ${fields.join(", ")}
    WHERE id = ${idPlaceholder} AND is_deleted = FALSE
  `;

  await db.query(query, values);

  if (data.courseId !== undefined) {
    if (data.courseId) {
      await db.query(
        `INSERT INTO master_course_subjects (course_id, subject_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [data.courseId, subjectId]
      );
    }
  }

  return await getSubjectById(db, subjectId);
}

export async function softDeleteSubject(
  db: Pool,
  subjectId: number,
  deletedBy?: number | null
) {
  const res = await db.query(
    `
    UPDATE subjects
    SET
      is_deleted = TRUE,
      deleted_at = NOW(),
      deleted_by = $2,
      updated_at = NOW()
    WHERE id = $1
    RETURNING id
    `,
    [subjectId, deletedBy ?? null]
  );

  return res.rows[0] || null;
}

export async function toggleSubjectActive(
  db: Pool,
  subjectId: number,
  isActive: boolean
) {
  const res = await db.query(
    `
    UPDATE subjects
    SET
      is_active = $1,
      updated_at = NOW()
    WHERE id = $2 AND is_deleted = FALSE
    RETURNING id
    `,
    [isActive, subjectId]
  );

  return res.rows[0] || null;
}

export async function getSubjectTreeNodes(
  db: Pool,
  categoryId: number,
  boardId: number
) {
  const res = await db.query(
    `
    SELECT
      subjects.id,
      subjects.category_id,
      subjects.board_id,
      subjects.name,
      subjects.slug,
      subjects.code,
      subjects.icon_url,
      c.name AS parent_name,
      b.name AS board_name,
      subjects.is_active,
      subjects.is_deleted,
      subjects.created_at

    FROM subjects

    LEFT JOIN categories c
      ON c.id = subjects.category_id

    LEFT JOIN boards b
      ON b.id = subjects.board_id

    WHERE (subjects.category_id = $1 OR subjects.category_id IS NULL)
      AND (subjects.board_id = $2 OR subjects.board_id IS NULL)
      AND subjects.is_deleted = FALSE

    ORDER BY subjects.name ASC
    `,
    [categoryId, boardId]
  );

  return res.rows;
}
