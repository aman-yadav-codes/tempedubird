import { Pool } from "pg";
import {
  MasterCourse,
  ListMasterCoursesOptions,
  CreateMasterCourseData,
  UpdateMasterCourseData,
} from "@/lib/types/content-course";
import { ensureCertificationProvidersTable } from "@/lib/queries/certification-providers";
import { ensureSubjectsSchemaAndDeduplicate } from "@/lib/queries/subjects";

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function ensureMasterCoursesTable(db: Pool) {
  await ensureCertificationProvidersTable(db);
  await ensureSubjectsSchemaAndDeduplicate(db);

  await db.query(`
    CREATE TABLE IF NOT EXISTS master_courses (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      code VARCHAR(100),
      category_id INT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
      authority_type VARCHAR(50) NOT NULL DEFAULT 'board',
      board_id INT REFERENCES boards(id) ON DELETE SET NULL,
      university_id INT,
      university_name VARCHAR(255),
      certification_provider_id INT REFERENCES certification_providers(id) ON DELETE SET NULL,
      duration_value INT,
      duration_unit VARCHAR(50) DEFAULT 'months',
      seats_available INT,
      description TEXT,
      thumbnail_url TEXT,
      icon_url TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE master_courses
      ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
      ADD COLUMN IF NOT EXISTS icon_url TEXT,
      ADD COLUMN IF NOT EXISTS mediums TEXT[],
      ADD COLUMN IF NOT EXISTS medium VARCHAR(255);

    CREATE TABLE IF NOT EXISTS master_course_subjects (
      course_id INT NOT NULL REFERENCES master_courses(id) ON DELETE CASCADE,
      subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (course_id, subject_id)
    );

    CREATE INDEX IF NOT EXISTS idx_master_courses_name ON master_courses (name);
    CREATE INDEX IF NOT EXISTS idx_master_courses_cat ON master_courses (category_id);
    CREATE INDEX IF NOT EXISTS idx_master_courses_auth ON master_courses (authority_type);
    CREATE INDEX IF NOT EXISTS idx_master_courses_active ON master_courses (is_active, is_deleted);
  `);

  // Clean up legacy group range placeholder courses
  try {
    await db.query(
      `UPDATE master_courses
       SET is_deleted = TRUE, deleted_at = NOW()
       WHERE is_deleted = FALSE AND name ~* '^(CLASS\\s*\\([0-9]+\\s*TO\\s*[0-9]+\\))'`
    );
  } catch (err) {
    console.error("Error updating master_courses table:", err);
  }
}

export async function listMasterCourses(
  db: Pool,
  opts: ListMasterCoursesOptions = {}
) {
  await ensureMasterCoursesTable(db);

  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 20;
  const offset = opts.offset ?? 0;

  const conditions: string[] = ["mc.is_deleted = FALSE"];
  const params: any[] = [];

  if (opts.categoryId) {
    params.push(opts.categoryId);
    conditions.push(`mc.category_id = $${params.length}`);
  }

  if (opts.authorityType && opts.authorityType !== "all") {
    params.push(opts.authorityType);
    conditions.push(`mc.authority_type = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    const pIdx = `$${params.length}`;
    conditions.push(
      `(
        mc.name ILIKE ${pIdx} 
        OR mc.slug ILIKE ${pIdx} 
        OR mc.code ILIKE ${pIdx} 
        OR c.name ILIKE ${pIdx}
        OR b.name ILIKE ${pIdx}
        OR cp.name ILIKE ${pIdx}
        OR mc.university_name ILIKE ${pIdx}
        OR EXISTS (
          SELECT 1 FROM category_closure cc
          INNER JOIN categories c2 ON c2.id = cc.ancestor_id
          WHERE cc.descendant_id = mc.category_id AND c2.name ILIKE ${pIdx}
        )
      )`
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countQuery = `
    SELECT COUNT(DISTINCT mc.id)::int AS count
    FROM master_courses mc
    LEFT JOIN categories c ON c.id = mc.category_id
    LEFT JOIN boards b ON b.id = mc.board_id
    LEFT JOIN certification_providers cp ON cp.id = mc.certification_provider_id
    ${whereClause}
  `;

  const dataParams = [...params, limit, offset];
  const limitPlaceholder = `$${params.length + 1}`;
  const offsetPlaceholder = `$${params.length + 2}`;

  const dataQuery = `
    SELECT
      mc.id,
      mc.name,
      mc.slug,
      mc.code,
      mc.category_id,
      c.name AS category_name,
      (
        SELECT string_agg(c2.name, ' → ' ORDER BY cc.depth DESC)
        FROM category_closure cc
        INNER JOIN categories c2 ON c2.id = cc.ancestor_id
        WHERE cc.descendant_id = mc.category_id
      ) AS category_breadcrumb,
      mc.authority_type,
      mc.board_id,
      b.name AS board_name,
      mc.university_id,
      COALESCE(u.name, mc.university_name) AS university_name,
      mc.certification_provider_id,
      cp.name AS certification_provider_name,
      mc.duration_value,
      mc.duration_unit,
      mc.mediums,
      mc.medium,
      mc.seats_available,
      mc.description,
      mc.thumbnail_url,
      mc.icon_url,
      mc.is_active,
      mc.is_deleted,
      mc.created_at,
      mc.updated_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', s.id,
            'name', s.name,
            'code', s.code,
            'slug', s.slug,
            'term_type', COALESCE(mcs.term_type, s.term_type, 'full_course'),
            'term_number', COALESCE(mcs.term_number, s.term_number, 1),
            'term_name', COALESCE(mcs.term_name, s.term_name, '')
          )
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'
      ) AS subjects
    FROM master_courses mc
    LEFT JOIN categories c ON c.id = mc.category_id
    LEFT JOIN boards b ON b.id = mc.board_id
    LEFT JOIN institution_profiles u ON u.id = mc.university_id
    LEFT JOIN certification_providers cp ON cp.id = mc.certification_provider_id
    LEFT JOIN master_course_subjects mcs ON mcs.course_id = mc.id
    LEFT JOIN subjects s ON s.id = mcs.subject_id AND s.is_deleted = FALSE
    ${whereClause}
    GROUP BY mc.id, c.name, b.name, u.name, cp.name
    ORDER BY mc.name ASC
    LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
  `;

  const [countRes, dataRes] = await Promise.all([
    db.query(countQuery, params),
    db.query(dataQuery, dataParams),
  ]);

  return {
    data: dataRes.rows as MasterCourse[],
    total: countRes.rows[0]?.count ?? 0,
  };
}

export async function getMasterCourseById(
  db: Pool,
  id: number
): Promise<MasterCourse | null> {
  await ensureMasterCoursesTable(db);

  const res = await db.query(
    `
    SELECT
      mc.id,
      mc.name,
      mc.slug,
      mc.code,
      mc.category_id,
      c.name AS category_name,
      (
        SELECT string_agg(c2.name, ' → ' ORDER BY cc.depth DESC)
        FROM category_closure cc
        INNER JOIN categories c2 ON c2.id = cc.ancestor_id
        WHERE cc.descendant_id = mc.category_id
      ) AS category_breadcrumb,
      mc.authority_type,
      mc.board_id,
      b.name AS board_name,
      mc.university_id,
      COALESCE(u.name, mc.university_name) AS university_name,
      mc.certification_provider_id,
      cp.name AS certification_provider_name,
      mc.duration_value,
      mc.duration_unit,
      mc.seats_available,
      mc.description,
      mc.thumbnail_url,
      mc.icon_url,
      mc.is_active,
      mc.is_deleted,
      mc.created_at,
      mc.updated_at,
      COALESCE(
        json_agg(
          json_build_object(
            'id', s.id,
            'name', s.name,
            'code', s.code,
            'slug', s.slug,
            'term_type', COALESCE(mcs.term_type, s.term_type, 'full_course'),
            'term_number', COALESCE(mcs.term_number, s.term_number, 1),
            'term_name', COALESCE(mcs.term_name, s.term_name, '')
          )
        ) FILTER (WHERE s.id IS NOT NULL),
        '[]'
      ) AS subjects
    FROM master_courses mc
    LEFT JOIN categories c ON c.id = mc.category_id
    LEFT JOIN boards b ON b.id = mc.board_id
    LEFT JOIN institution_profiles u ON u.id = mc.university_id
    LEFT JOIN certification_providers cp ON cp.id = mc.certification_provider_id
    LEFT JOIN master_course_subjects mcs ON mcs.course_id = mc.id
    LEFT JOIN subjects s ON s.id = mcs.subject_id AND s.is_deleted = FALSE
    WHERE mc.id = $1 AND mc.is_deleted = FALSE
    GROUP BY mc.id, c.name, b.name, u.name, cp.name
    `,
    [id]
  );

  return res.rows[0] || null;
}

export async function createMasterCourse(
  db: Pool,
  data: CreateMasterCourseData
): Promise<MasterCourse> {
  await ensureMasterCoursesTable(db);

  const cleanName = data.name.trim();
  let effectiveSlug = (data.slug || "").trim();

  if (!effectiveSlug) {
    let authName = "";
    if (data.boardId) {
      const bRes = await db.query(`SELECT name FROM boards WHERE id = $1`, [data.boardId]);
      authName = bRes.rows[0]?.name || "";
    } else if (data.universityName) {
      authName = data.universityName;
    } else if (data.certificationProviderId) {
      const cRes = await db.query(`SELECT name FROM certification_providers WHERE id = $1`, [data.certificationProviderId]);
      authName = cRes.rows[0]?.name || "";
    }
    const combined = [cleanName, authName].filter(Boolean).join(" ");
    effectiveSlug = combined
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  } else {
    effectiveSlug = effectiveSlug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  const res = await db.query(
    `
    INSERT INTO master_courses (
      name,
      slug,
      code,
      category_id,
      authority_type,
      board_id,
      university_id,
      university_name,
      certification_provider_id,
      duration_value,
      duration_unit,
      mediums,
      medium,
      seats_available,
      description,
      thumbnail_url,
      icon_url,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    RETURNING id
    `,
    [
      cleanName,
      effectiveSlug,
      data.code?.trim() || null,
      data.categoryId,
      data.authorityType || "board",
      data.boardId ?? null,
      data.universityId ?? null,
      data.universityName?.trim() || null,
      data.certificationProviderId ?? null,
      data.durationValue ?? null,
      data.durationUnit || "months",
      data.mediums || [],
      data.medium || (Array.isArray(data.mediums) ? data.mediums.join(", ") : null),
      data.seatsAvailable ?? null,
      data.description?.trim() || null,
      data.thumbnail_url?.trim() || null,
      data.icon_url?.trim() || null,
      data.isActive !== undefined ? data.isActive : true,
    ]
  );

  const courseId = res.rows[0].id;

  if (Array.isArray(data.subjectIds) && data.subjectIds.length > 0) {
    for (const sid of data.subjectIds) {
      await db.query(
        `INSERT INTO master_course_subjects (course_id, subject_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [courseId, sid]
      );
    }
  }

  if (Array.isArray(data.customSubjects) && data.customSubjects.length > 0) {
    for (const item of data.customSubjects) {
      if (!item || !item.name || !item.name.trim()) continue;
      const cleanSubjName = item.name.trim();
      const effectiveSlug = toSlug(cleanSubjName);

      const existing = await db.query(
        `SELECT id FROM subjects WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND is_deleted = FALSE LIMIT 1`,
        [cleanSubjName]
      );

      let sid: number;
      if (existing.rows.length > 0) {
        sid = existing.rows[0].id;
      } else {
        const ins = await db.query(
          `INSERT INTO subjects (category_id, board_id, course_id, name, slug, code, term_type, term_number, term_name, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
           RETURNING id`,
          [
            data.categoryId,
            data.boardId || null,
            courseId,
            cleanSubjName,
            effectiveSlug,
            item.code?.trim() || null,
            item.term_type || "semester",
            item.term_number || 1,
            item.term_name?.trim() || null,
          ]
        );
        sid = ins.rows[0].id;
      }

      await db.query(
        `INSERT INTO master_course_subjects (course_id, subject_id, term_type, term_number, term_name)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (course_id, subject_id) DO UPDATE
         SET term_type = EXCLUDED.term_type,
             term_number = EXCLUDED.term_number,
             term_name = EXCLUDED.term_name`,
        [
          courseId,
          sid,
          item.term_type || "semester",
          item.term_number || 1,
          item.term_name?.trim() || null,
        ]
      );
    }
  }

  const created = await getMasterCourseById(db, courseId);
  return created!;
}

export async function updateMasterCourse(
  db: Pool,
  id: number,
  data: UpdateMasterCourseData
): Promise<MasterCourse | null> {
  await ensureMasterCoursesTable(db);

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
  if (data.categoryId !== undefined) {
    values.push(data.categoryId);
    fields.push(`category_id = $${values.length}`);
  }
  if (data.authorityType !== undefined) {
    values.push(data.authorityType);
    fields.push(`authority_type = $${values.length}`);
  }
  if (data.boardId !== undefined) {
    values.push(data.boardId);
    fields.push(`board_id = $${values.length}`);
  }
  if (data.universityId !== undefined) {
    values.push(data.universityId);
    fields.push(`university_id = $${values.length}`);
  }
  if (data.universityName !== undefined) {
    values.push(data.universityName?.trim() || null);
    fields.push(`university_name = $${values.length}`);
  }
  if (data.certificationProviderId !== undefined) {
    values.push(data.certificationProviderId);
    fields.push(`certification_provider_id = $${values.length}`);
  }
  if (data.durationValue !== undefined) {
    values.push(data.durationValue);
    fields.push(`duration_value = $${values.length}`);
  }
  if (data.durationUnit !== undefined) {
    values.push(data.durationUnit);
    fields.push(`duration_unit = $${values.length}`);
  }
  if (data.mediums !== undefined) {
    values.push(data.mediums || []);
    fields.push(`mediums = $${values.length}`);
    values.push(data.medium || (Array.isArray(data.mediums) ? data.mediums.join(", ") : null));
    fields.push(`medium = $${values.length}`);
  }
  if (data.seatsAvailable !== undefined) {
    values.push(data.seatsAvailable);
    fields.push(`seats_available = $${values.length}`);
  }
  if (data.description !== undefined) {
    values.push(data.description?.trim() || null);
    fields.push(`description = $${values.length}`);
  }
  if (data.thumbnail_url !== undefined) {
    values.push(data.thumbnail_url?.trim() || null);
    fields.push(`thumbnail_url = $${values.length}`);
  }
  if (data.icon_url !== undefined) {
    values.push(data.icon_url?.trim() || null);
    fields.push(`icon_url = $${values.length}`);
  }
  if (data.isActive !== undefined) {
    values.push(data.isActive);
    fields.push(`is_active = $${values.length}`);
  }

  values.push(id);
  const idPlaceholder = `$${values.length}`;

  await db.query(
    `
    UPDATE master_courses
    SET ${fields.join(", ")}
    WHERE id = ${idPlaceholder} AND is_deleted = FALSE
    `,
    values
  );

  if (Array.isArray(data.subjectIds)) {
    await db.query(`DELETE FROM master_course_subjects WHERE course_id = $1`, [id]);
    for (const sid of data.subjectIds) {
      await db.query(
        `INSERT INTO master_course_subjects (course_id, subject_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING`,
        [id, sid]
      );
    }
  }

  if (Array.isArray(data.customSubjects)) {
    if (!Array.isArray(data.subjectIds)) {
      await db.query(`DELETE FROM master_course_subjects WHERE course_id = $1`, [id]);
    }
    for (const item of data.customSubjects) {
      if (!item || !item.name || !item.name.trim()) continue;
      const cleanSubjName = item.name.trim();
      const effectiveSlug = toSlug(cleanSubjName);

      const existing = await db.query(
        `SELECT id FROM subjects WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND is_deleted = FALSE LIMIT 1`,
        [cleanSubjName]
      );

      let sid: number;
      if (existing.rows.length > 0) {
        sid = existing.rows[0].id;
      } else {
        const ins = await db.query(
          `INSERT INTO subjects (category_id, board_id, course_id, name, slug, code, term_type, term_number, term_name, is_active)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
           RETURNING id`,
          [
            data.categoryId || null,
            data.boardId || null,
            id,
            cleanSubjName,
            effectiveSlug,
            item.code?.trim() || null,
            item.term_type || "semester",
            item.term_number || 1,
            item.term_name?.trim() || null,
          ]
        );
        sid = ins.rows[0].id;
      }

      await db.query(
        `INSERT INTO master_course_subjects (course_id, subject_id, term_type, term_number, term_name)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (course_id, subject_id) DO UPDATE
         SET term_type = EXCLUDED.term_type,
             term_number = EXCLUDED.term_number,
             term_name = EXCLUDED.term_name`,
        [
          id,
          sid,
          item.term_type || "semester",
          item.term_number || 1,
          item.term_name?.trim() || null,
        ]
      );
    }
  }

  return await getMasterCourseById(db, id);
}

export async function softDeleteMasterCourse(
  db: Pool,
  id: number,
  deletedBy?: number | null
) {
  await ensureMasterCoursesTable(db);
  await db.query(
    `
    UPDATE master_courses
    SET is_deleted = TRUE,
        deleted_at = NOW(),
        deleted_by = $2,
        updated_at = NOW()
    WHERE id = $1
    `,
    [id, deletedBy ?? null]
  );
}

export async function toggleMasterCourseActive(
  db: Pool,
  id: number,
  isActive: boolean
) {
  await ensureMasterCoursesTable(db);
  await db.query(
    `
    UPDATE master_courses
    SET is_active = $1, updated_at = NOW()
    WHERE id = $2 AND is_deleted = FALSE
    `,
    [isActive, id]
  );
}
