// lib/queries/institutions.ts
import { Pool, PoolClient } from "pg";
import { ensureAcademicSessionSchema } from "@/lib/queries/academic-sessions";
import { softDeleteInstitutionLifecycle } from "@/lib/queries/institution-lifecycle";

import {
  MasterType,
  ListMasterOptions,
  CreateMasterData,
  UpdateMasterData,
  ListInstitutionsOptions,
  CreateInstitutionData,
  UpdateInstitutionData,
  ListProgramsOptions,
  CreateProgramData,
  UpdateProgramData,
  InstitutionPlacement,
  ListPlacementsOptions,
  CreatePlacementData,
  UpdatePlacementData,
  InstitutionCutoff,
  ListCutoffsOptions,
  CreateCutoffData,
  UpdateCutoffData,
  InstitutionScholarship,
  ListScholarshipsOptions,
  CreateScholarshipData,
  UpdateScholarshipData,
  InstitutionNews,
  ListNewsOptions,
  CreateNewsData,
  UpdateNewsData,
  InstitutionFacility,
  InstitutionFacilityMedia,
  InstitutionFacilitySummary,
  UpsertInstitutionFacilityData,
} from "@/lib/types/institution";

// helper to build where clause
function buildWhere(search: string | undefined) {
  const s = (search || "").trim();
  if (!s) return { clause: "WHERE is_deleted = FALSE", params: [] as any[] };
  return {
    clause: `WHERE is_deleted = FALSE AND (name ILIKE $1 OR slug ILIKE $1)`,
    params: [`%${s}%`],
  };
}

// helper to check column existence
async function hasColumn(db: any, table: string, column: string) {
  const q = `SELECT 1 FROM information_schema.columns WHERE table_name = $1 AND column_name = $2 LIMIT 1`;
  const res = await db.query(q, [table, column]);
  return !!res.rows.length;
}

// -------------------------
// Institution Types
// -------------------------

export async function listInstitutionTypes(
  db: Pool,
  opts: ListMasterOptions = {},
) {
  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;

  const where = search
    ? "WHERE is_deleted = FALSE AND (name ILIKE $1 OR slug ILIKE $1)"
    : "WHERE is_deleted = FALSE";
  const params = search ? [`%${search}%`] : [];

  const [dataRes, countRes] = await Promise.all([
    db.query(
      `SELECT id, name, slug, is_active, is_deleted, created_at, updated_at FROM institution_types ${where} ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(
      `SELECT COUNT(*)::int AS count FROM institution_types ${where}`,
      params,
    ),
  ]);

  return {
    data: dataRes.rows as MasterType[],
    total: countRes.rows[0].count as number,
  };
}

export async function createInstitutionType(db: Pool, data: CreateMasterData) {
  const res = await db.query(
    `INSERT INTO institution_types (name, slug) VALUES ($1, $2) RETURNING id, name, slug, is_active, is_deleted, created_at, updated_at`,
    [data.name, data.slug],
  );
  return res.rows[0] as MasterType;
}

export async function getInstitutionTypeById(db: Pool, id: number) {
  const res = await db.query(
    `SELECT id, name, slug, is_active, is_deleted, created_at, updated_at FROM institution_types WHERE id = $1`,
    [id],
  );
  return res.rows[0] || null;
}

export async function updateInstitutionType(db: Pool, input: UpdateMasterData) {
  const res = await db.query(
    `UPDATE institution_types SET name = $1, slug = $2, updated_at = NOW() WHERE id = $3 RETURNING id, name, slug, is_active, is_deleted, created_at, updated_at`,
    [input.name, input.slug, input.id],
  );
  return res.rows[0];
}

export async function toggleInstitutionTypeActive(
  db: Pool,
  id: number,
  isActive: boolean,
) {
  await db.query(
    `UPDATE institution_types SET is_active = $1, updated_at = NOW() WHERE id = $2`,
    [isActive, id],
  );
}

export async function softDeleteInstitutionType(db: Pool, id: number) {
  await db.query(
    `UPDATE institution_types SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1`,
    [id],
  );
}

// -------------------------
// Institution Subtypes
// -------------------------

export async function listInstitutionSubtypes(
  db: Pool,
  opts: ListMasterOptions = {},
) {
  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;

  const where = search
    ? "WHERE is_deleted = FALSE AND (name ILIKE $1 OR slug ILIKE $1)"
    : "WHERE is_deleted = FALSE";
  const params = search ? [`%${search}%`] : [];

  const [dataRes, countRes] = await Promise.all([
    db.query(
      `SELECT id, name, slug, is_active, is_deleted, created_at, updated_at FROM institution_subtypes ${where} ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(
      `SELECT COUNT(*)::int AS count FROM institution_subtypes ${where}`,
      params,
    ),
  ]);

  return {
    data: dataRes.rows as MasterType[],
    total: countRes.rows[0].count as number,
  };
}

export async function createInstitutionSubtype(
  db: Pool,
  data: CreateMasterData,
) {
  const res = await db.query(
    `INSERT INTO institution_subtypes (name, slug) VALUES ($1, $2) RETURNING id, name, slug, is_active, is_deleted, created_at, updated_at`,
    [data.name, data.slug],
  );
  return res.rows[0] as MasterType;
}

export async function getInstitutionSubtypeById(db: Pool, id: number) {
  const res = await db.query(
    `SELECT id, name, slug, is_active, is_deleted, created_at, updated_at FROM institution_subtypes WHERE id = $1`,
    [id],
  );
  return res.rows[0] || null;
}

export async function updateInstitutionSubtype(
  db: Pool,
  input: UpdateMasterData,
) {
  const res = await db.query(
    `UPDATE institution_subtypes SET name = $1, slug = $2, updated_at = NOW() WHERE id = $3 RETURNING id, name, slug, is_active, is_deleted, created_at, updated_at`,
    [input.name, input.slug, input.id],
  );
  return res.rows[0];
}

export async function toggleInstitutionSubtypeActive(
  db: Pool,
  id: number,
  isActive: boolean,
) {
  await db.query(
    `UPDATE institution_subtypes SET is_active = $1, updated_at = NOW() WHERE id = $2`,
    [isActive, id],
  );
}

export async function softDeleteInstitutionSubtype(db: Pool, id: number) {
  await db.query(
    `UPDATE institution_subtypes SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1`,
    [id],
  );
}

// -------------------------
// Program Types
// -------------------------

export async function listProgramTypes(db: Pool, opts: ListMasterOptions = {}) {
  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;

  const where = search
    ? "WHERE is_deleted = FALSE AND (name ILIKE $1 OR slug ILIKE $1)"
    : "WHERE is_deleted = FALSE";
  const params = search ? [`%${search}%`] : [];

  const [dataRes, countRes] = await Promise.all([
    db.query(
      `SELECT id, name, slug, is_active, is_deleted, created_at, updated_at FROM program_types ${where} ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(
      `SELECT COUNT(*)::int AS count FROM program_types ${where}`,
      params,
    ),
  ]);

  return {
    data: dataRes.rows as MasterType[],
    total: countRes.rows[0].count as number,
  };
}

export async function createProgramType(db: Pool, data: CreateMasterData) {
  const res = await db.query(
    `INSERT INTO program_types (name, slug) VALUES ($1, $2) RETURNING id, name, slug, is_active, is_deleted, created_at, updated_at`,
    [data.name, data.slug],
  );
  return res.rows[0] as MasterType;
}

export async function getProgramTypeById(db: Pool, id: number) {
  const res = await db.query(
    `SELECT id, name, slug, is_active, is_deleted, created_at, updated_at FROM program_types WHERE id = $1`,
    [id],
  );
  return res.rows[0] || null;
}

export async function updateProgramType(db: Pool, input: UpdateMasterData) {
  const res = await db.query(
    `UPDATE program_types SET name = $1, slug = $2, updated_at = NOW() WHERE id = $3 RETURNING id, name, slug, is_active, is_deleted, created_at, updated_at`,
    [input.name, input.slug, input.id],
  );
  return res.rows[0];
}

export async function toggleProgramTypeActive(
  db: Pool,
  id: number,
  isActive: boolean,
) {
  await db.query(
    `UPDATE program_types SET is_active = $1, updated_at = NOW() WHERE id = $2`,
    [isActive, id],
  );
}

export async function softDeleteProgramType(db: Pool, id: number) {
  await db.query(
    `UPDATE program_types SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1`,
    [id],
  );
}

// -------------------------
// Facility Types
// -------------------------

export async function listFacilityTypes(
  db: Pool,
  opts: ListMasterOptions = {},
) {
  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;

  const where = search
    ? "WHERE is_deleted = FALSE AND (name ILIKE $1 OR slug ILIKE $1)"
    : "WHERE is_deleted = FALSE";
  const params = search ? [`%${search}%`] : [];

  const [dataRes, countRes] = await Promise.all([
    db.query(
      `SELECT id, name, slug, is_active, is_deleted, created_at, updated_at FROM facility_types ${where} ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(
      `SELECT COUNT(*)::int AS count FROM facility_types ${where}`,
      params,
    ),
  ]);

  return {
    data: dataRes.rows as MasterType[],
    total: countRes.rows[0].count as number,
  };
}

export async function createFacilityType(db: Pool, data: CreateMasterData) {
  const res = await db.query(
    `INSERT INTO facility_types (name, slug) VALUES ($1, $2) RETURNING id, name, slug, is_active, is_deleted, created_at, updated_at`,
    [data.name, data.slug],
  );
  return res.rows[0] as MasterType;
}

export async function getFacilityTypeById(db: Pool, id: number) {
  const res = await db.query(
    `SELECT id, name, slug, is_active, is_deleted, created_at, updated_at FROM facility_types WHERE id = $1`,
    [id],
  );
  return res.rows[0] || null;
}

export async function updateFacilityType(db: Pool, input: UpdateMasterData) {
  const res = await db.query(
    `UPDATE facility_types SET name = $1, slug = $2, updated_at = NOW() WHERE id = $3 RETURNING id, name, slug, is_active, is_deleted, created_at, updated_at`,
    [input.name, input.slug, input.id],
  );
  return res.rows[0];
}

export async function toggleFacilityTypeActive(
  db: Pool,
  id: number,
  isActive: boolean,
) {
  await db.query(
    `UPDATE facility_types SET is_active = $1, updated_at = NOW() WHERE id = $2`,
    [isActive, id],
  );
}

export async function softDeleteFacilityType(db: Pool, id: number) {
  await db.query(
    `UPDATE facility_types SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1`,
    [id],
  );
}

// -------------------------
// Languages
// -------------------------

export async function listLanguages(db: Pool, opts: ListMasterOptions = {}) {
  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;

  const where = search
    ? "WHERE is_deleted = FALSE AND (name ILIKE $1 OR slug ILIKE $1)"
    : "WHERE is_deleted = FALSE";
  const params = search ? [`%${search}%`] : [];

  const [dataRes, countRes] = await Promise.all([
    db.query(
      `SELECT id, name, slug, is_active, is_deleted, created_at, updated_at FROM languages ${where} ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`SELECT COUNT(*)::int AS count FROM languages ${where}`, params),
  ]);

  return {
    data: dataRes.rows as MasterType[],
    total: countRes.rows[0].count as number,
  };
}

export async function listSections(db: Pool, opts: ListMasterOptions = {}) {
  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;

  const where = search
    ? "WHERE is_deleted = FALSE AND is_active = TRUE AND (name ILIKE $1 OR slug ILIKE $1)"
    : "WHERE is_deleted = FALSE AND is_active = TRUE";
  const params = search ? [`%${search}%`] : [];

  const [dataRes, countRes] = await Promise.all([
    db.query(
      `SELECT id, name, slug, is_active, is_deleted, created_at, updated_at FROM sections ${where} ORDER BY name ASC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(`SELECT COUNT(*)::int AS count FROM sections ${where}`, params),
  ]);

  return {
    data: dataRes.rows as MasterType[],
    total: countRes.rows[0].count as number,
  };
}

export async function createLanguage(db: Pool, data: CreateMasterData) {
  const res = await db.query(
    `INSERT INTO languages (name, slug) VALUES ($1, $2) RETURNING id, name, slug, is_active, is_deleted, created_at, updated_at`,
    [data.name, data.slug],
  );
  return res.rows[0] as MasterType;
}

export async function getLanguageById(db: Pool, id: number) {
  const res = await db.query(
    `SELECT id, name, slug, is_active, is_deleted, created_at, updated_at FROM languages WHERE id = $1`,
    [id],
  );
  return res.rows[0] || null;
}

export async function updateLanguage(db: Pool, input: UpdateMasterData) {
  const res = await db.query(
    `UPDATE languages SET name = $1, slug = $2, updated_at = NOW() WHERE id = $3 RETURNING id, name, slug, is_active, is_deleted, created_at, updated_at`,
    [input.name, input.slug, input.id],
  );
  return res.rows[0];
}

export async function toggleLanguageActive(
  db: Pool,
  id: number,
  isActive: boolean,
) {
  await db.query(
    `UPDATE languages SET is_active = $1, updated_at = NOW() WHERE id = $2`,
    [isActive, id],
  );
}

export async function softDeleteLanguage(db: Pool, id: number) {
  await db.query(
    `UPDATE languages SET is_deleted = TRUE, updated_at = NOW() WHERE id = $1`,
    [id],
  );
}

// -------------------------
// Institution Profiles
// -------------------------

import { slugify } from "@/lib/utils/slug";
import { importDefaultCalendarEvents } from "@/lib/queries/institute-calendar-defaults";

type Queryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

async function ensureInstitutionProfileSchema(db: Queryable) {
  await ensureAcademicSessionSchema(db);
  await db.query(`ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS founder_name VARCHAR(255)`);
  await db.query(`ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS founder_title VARCHAR(255)`);
  await db.query(`ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS founder_image_url TEXT`);
  await db.query(`ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS founder_about TEXT`);
  await db.query(`ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS mission TEXT`);
  await db.query(`ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS vision TEXT`);
  await db.query(`ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS goal TEXT`);
  await db.query(`
        UPDATE institution_types 
        SET name = 'Institute', slug = 'institute', updated_at = CURRENT_TIMESTAMP
        WHERE LOWER(name) = 'coaching institute' OR slug = 'coaching-institute'
    `);
  await db.query(`
        UPDATE institution_profiles p
        SET board_id = NULL,
            updated_at = CURRENT_TIMESTAMP
        FROM institution_types it
        WHERE it.id = p.institution_type_id
          AND p.board_id IS NOT NULL
          AND LOWER(it.name) LIKE '%coaching%'
    `);
}

async function institutionTypeAllowsBoard(
  db: Queryable,
  typeId: number | null | undefined,
) {
  if (!typeId) return false;
  const result = await db.query<{ name: string }>(
    `SELECT name FROM institution_types WHERE id = $1 LIMIT 1`,
    [typeId],
  );
  const name = result.rows[0]?.name?.toLowerCase() ?? "";
  return name.includes("school") && !name.includes("coaching");
}

export async function listInstitutionProfiles(
  db: Pool,
  opts: ListInstitutionsOptions = {},
) {
  await ensureInstitutionProfileSchema(db);
  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;

  const baseConditions: string[] = ["p.is_deleted = FALSE"];
  const params: any[] = [];

  if (opts.typeId) {
    params.push(opts.typeId);
    baseConditions.push(`p.institution_type_id = $${params.length}`);
  }

  if (opts.typeSearch?.trim()) {
    params.push(`%${opts.typeSearch.trim()}%`);
    baseConditions.push(`EXISTS (
            SELECT 1
            FROM institution_types filter_it
            WHERE filter_it.id = p.institution_type_id
              AND (filter_it.name ILIKE $${params.length} OR filter_it.slug ILIKE $${params.length})
        )`);
  }

  if (opts.subtypeId) {
    params.push(opts.subtypeId);
    baseConditions.push(`p.institution_subtype_id = $${params.length}`);
  }

  if (opts.locationId) {
    params.push(opts.locationId);
    baseConditions.push(`p.location_id = $${params.length}`);
  }

  const scopedInstitutionIds = (opts as any).institutionIds as
    number[] | undefined;
  if (scopedInstitutionIds) {
    if (scopedInstitutionIds.length === 0) {
      baseConditions.push("FALSE");
    } else {
      params.push(scopedInstitutionIds);
      baseConditions.push(`p.id = ANY($${params.length}::int[])`);
    }
  }

  if (opts.isActive !== undefined && opts.isActive !== null) {
    params.push(opts.isActive);
    baseConditions.push(`p.is_active = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    baseConditions.push(
      `(p.slug ILIKE $${params.length} OR p.name ILIKE $${params.length})`,
    );
  }

  let where = "WHERE " + baseConditions.join(" AND ");

  // category filter
  if (opts.categoryId) {
    params.push(opts.categoryId);
    where += ` AND EXISTS (SELECT 1 FROM institution_categories ic WHERE ic.institution_id = p.id AND ic.category_id = $${params.length})`;
  }

  const [dataRes, countRes] = await Promise.all([
    db.query(
      `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.institution_type_id,
        p.institution_subtype_id,
        p.phone,
        p.email,
        p.established_year,
        p.website,
        p.about,
        p.founder_name,
        p.founder_title,
        p.founder_image_url,
        p.founder_about,
        p.ai_content,
        p.ai_content,
        p.location_id,
        p.parent_university_id,
        p.board_id,
        p.is_active,
        p.is_deleted,
        p.created_by,
        p.updated_by,
        p.created_at,
        p.updated_at,
        p.name AS organization_name,
        it.name AS type_name,
        ist.name AS subtype_name,
        l.name AS location_name,
        l.latitude,
        l.longitude,
        pu.name AS parent_university_name,
        b.name AS board_name,
        (
          SELECT string_agg(c.name, ', ' ORDER BY c.name)
          FROM institution_categories ic
          JOIN categories c ON c.id = ic.category_id
          WHERE ic.institution_id = p.id
        ) AS categories
      FROM institution_profiles p
      LEFT JOIN institution_types it ON it.id = p.institution_type_id
      LEFT JOIN institution_subtypes ist ON ist.id = p.institution_subtype_id
      LEFT JOIN locations l ON l.id = p.location_id
      LEFT JOIN institution_profiles pu ON pu.id = p.parent_university_id
      LEFT JOIN boards b ON b.id = p.board_id
      ${where}
    ORDER BY p.updated_at DESC, p.created_at DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `,
      [...params, limit, offset],
    ),

    db.query(
      `SELECT COUNT(*)::int AS count FROM institution_profiles p ${where}`,
      params,
    ),
  ]);

  return {
    data: dataRes.rows as any[],
    total: countRes.rows[0].count as number,
  };
}

export async function getInstitutionProfileById(db: Pool, id: number) {
  await ensureInstitutionProfileSchema(db);
  const res = await db.query(
    `
    SELECT
      p.*,
      p.name AS organization_name,
      it.name AS type_name,
      ist.name AS subtype_name,
      l.name AS location_name,
      l.latitude,
      l.longitude,
      pu.name AS parent_university_name
      , b.name AS board_name
    FROM institution_profiles p
    LEFT JOIN institution_types it ON it.id = p.institution_type_id
    LEFT JOIN institution_subtypes ist ON ist.id = p.institution_subtype_id
    LEFT JOIN locations l ON l.id = p.location_id
    LEFT JOIN institution_profiles pu ON pu.id = p.parent_university_id
    LEFT JOIN boards b ON b.id = p.board_id
    WHERE p.id = $1
  `,
    [id],
  );

  if (!res.rows.length) return null;

  const profile = res.rows[0];
  const categoriesRes = await db.query(
    `SELECT category_id FROM institution_categories WHERE institution_id = $1`,
    [id],
  );
  profile.category_ids = categoriesRes.rows.map((r) => r.category_id);

  return profile;
}

export async function createInstitutionProfile(
  db: Pool,
  data: CreateInstitutionData,
) {
  await ensureInstitutionProfileSchema(db);
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    // generate slug if not provided
    let baseSlug = data.slug || slugify(data.name);
    baseSlug = baseSlug || slugify(data.name);
    const slug = await (async () => {
      // ensure unique
      let candidate = baseSlug;
      let i = 1;
      while (true) {
        const r = await client.query(
          `SELECT 1 FROM institution_profiles WHERE slug = $1 LIMIT 1`,
          [candidate],
        );
        if (!r.rows.length) break;
        candidate = `${baseSlug}-${i++}`;
      }
      return candidate;
    })();

    const res = await client.query(
      `
      INSERT INTO institution_profiles (
        name, slug, institution_type_id, institution_subtype_id,
        phone, email, established_year, website, about, mission, vision, goal, founder_name, founder_title, founder_image_url, founder_about, ai_content, location_id, parent_university_id, board_id,
        is_active, is_deleted, add_source, created_by, updated_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21, FALSE, $22, $23, $23)
      RETURNING *
    `,
      [
        data.name,
        slug,
        data.institutionTypeId,
        data.institutionSubtypeId || null,
        data.phone || null,
        data.email || null,
        data.establishedYear || null,
        data.website || null,
        data.about || null,
        data.mission || null,
        data.vision || null,
        data.goal || null,
        data.founderName || null,
        data.founderTitle || null,
        data.founderImageUrl || null,
        data.founderAbout || null,
        data.aiContent ? JSON.stringify(data.aiContent) : null,
        data.locationId || null,
        data.parentUniversityId || null,
        (await institutionTypeAllowsBoard(client, data.institutionTypeId))
          ? data.boardId || null
          : null,
        data.isActive ?? true,
        data.addSource ?? null,
        data.createdBy || null,
      ],
    );

    const newProfile = res.rows[0];

    if (data.categoryIds && data.categoryIds.length) {
      for (const cid of data.categoryIds) {
        await client.query(
          `INSERT INTO institution_categories (institution_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [newProfile.id, cid],
        );
      }
    }

    await importDefaultCalendarEvents(client, Number(newProfile.id), data.createdBy || null);

    await client.query("COMMIT");
    return newProfile;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateInstitutionProfile(
  db: Pool,
  input: UpdateInstitutionData,
) {
  await ensureInstitutionProfileSchema(db);
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const fields: string[] = [];
    const params: any[] = [];

    if (input.name !== undefined) {
      params.push(input.name);
      fields.push(`name = $${params.length}`);
    }
    if (input.institutionTypeId !== undefined) {
      params.push(input.institutionTypeId);
      fields.push(`institution_type_id = $${params.length}`);
    }
    if (input.institutionSubtypeId !== undefined) {
      params.push(input.institutionSubtypeId);
      fields.push(`institution_subtype_id = $${params.length}`);
    }
    if (input.phone !== undefined) {
      params.push(input.phone);
      fields.push(`phone = $${params.length}`);
    }
    if (input.email !== undefined) {
      params.push(input.email);
      fields.push(`email = $${params.length}`);
    }
    if (input.establishedYear !== undefined) {
      params.push(input.establishedYear);
      fields.push(`established_year = $${params.length}`);
    }
    if (input.website !== undefined) {
      params.push(input.website);
      fields.push(`website = $${params.length}`);
    }
    if (input.about !== undefined) {
      params.push(input.about);
      fields.push(`about = $${params.length}`);
    }
    if (input.mission !== undefined) {
      params.push(input.mission);
      fields.push(`mission = $${params.length}`);
    }
    if (input.vision !== undefined) {
      params.push(input.vision);
      fields.push(`vision = $${params.length}`);
    }
    if (input.goal !== undefined) {
      params.push(input.goal);
      fields.push(`goal = $${params.length}`);
    }
    if (input.founderName !== undefined) {
      params.push(input.founderName);
      fields.push(`founder_name = $${params.length}`);
    }
    if (input.founderTitle !== undefined) {
      params.push(input.founderTitle);
      fields.push(`founder_title = $${params.length}`);
    }
    if (input.founderImageUrl !== undefined) {
      params.push(input.founderImageUrl);
      fields.push(`founder_image_url = $${params.length}`);
    }
    if (input.founderAbout !== undefined) {
      params.push(input.founderAbout);
      fields.push(`founder_about = $${params.length}`);
    }
    if (input.aiContent !== undefined) {
      params.push(
        input.aiContent === null ? null : JSON.stringify(input.aiContent),
      );
      fields.push(`ai_content = $${params.length}::jsonb`);
    }
    if (input.locationId !== undefined) {
      params.push(input.locationId);
      fields.push(`location_id = $${params.length}`);
    }
    if (input.parentUniversityId !== undefined) {
      params.push(input.parentUniversityId);
      fields.push(`parent_university_id = $${params.length}`);
    }
    if (input.boardId !== undefined || input.institutionTypeId !== undefined) {
      const typeId =
        input.institutionTypeId ??
        (
          await client.query<{ institution_type_id: number }>(
            `SELECT institution_type_id FROM institution_profiles WHERE id = $1 LIMIT 1`,
            [input.id],
          )
        ).rows[0]?.institution_type_id;
      const allowedBoardId = (await institutionTypeAllowsBoard(client, typeId))
        ? (input.boardId ?? null)
        : null;
      params.push(allowedBoardId);
      fields.push(`board_id = $${params.length}`);
    }
    if (input.slug !== undefined) {
      params.push(input.slug);
      fields.push(`slug = $${params.length}`);
    }
    if (input.updatedBy !== undefined) {
      params.push(input.updatedBy);
      fields.push(`updated_by = $${params.length}`);
    }

    if (fields.length) {
      params.push(input.id);
      await client.query(
        `UPDATE institution_profiles SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${params.length}`,
        params,
      );
    }

    if (input.categoryIds) {
      await client.query(
        `DELETE FROM institution_categories WHERE institution_id = $1`,
        [input.id],
      );
      for (const cid of input.categoryIds) {
        await client.query(
          `INSERT INTO institution_categories (institution_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [input.id, cid],
        );
      }
    }

    await client.query("COMMIT");
    return await getInstitutionProfileById(db, input.id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function toggleInstitutionProfileActive(
  db: Pool,
  id: number,
  isActive: boolean,
) {
  if (!(await hasColumn(db, "institution_profiles", "is_active"))) {
    throw new Error(
      "Column 'is_active' does not exist on table 'institution_profiles'",
    );
  }
  await db.query(
    `
            UPDATE institution_profiles
            SET
                is_active = $1,
                status = CASE WHEN $1 THEN 'active' ELSE 'suspended' END,
                updated_at = NOW()
            WHERE id = $2
        `,
    [isActive, id],
  );
}

export async function softDeleteInstitutionProfile(db: Pool, id: number) {
  await softDeleteInstitutionLifecycle(db, [id]);
}

// -------------------------
// Institution Facilities
// -------------------------

let institutionFacilitiesSchemaReady: Promise<void> | null = null;

async function ensureInstitutionFacilitiesSchema(db: Pool) {
  if (!institutionFacilitiesSchemaReady) {
    institutionFacilitiesSchemaReady = db
      .query(
        `
            CREATE TABLE IF NOT EXISTS institution_facilities (
                id SERIAL PRIMARY KEY,
                institution_id INTEGER NOT NULL,
                facility_type_id INTEGER NOT NULL,
                title VARCHAR(200),
                description TEXT,
                image_url TEXT,
                ai_description JSONB,
                display_order INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT TRUE,
                is_deleted BOOLEAN DEFAULT FALSE,
                created_by INTEGER,
                updated_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_institution_facilities_institution_id
                ON institution_facilities(institution_id);

            CREATE INDEX IF NOT EXISTS idx_institution_facilities_facility_type_id
                ON institution_facilities(facility_type_id);

            CREATE TABLE IF NOT EXISTS institution_facility_media (
                id SERIAL PRIMARY KEY,
                institution_facility_id INTEGER NOT NULL,
                media_type VARCHAR(20) NOT NULL DEFAULT 'image',
                url TEXT NOT NULL,
                title VARCHAR(150),
                sort_order INTEGER DEFAULT 0,
                created_by INTEGER,
                updated_by INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
            );

            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'fk_ifm_facility'
              ) THEN
                ALTER TABLE institution_facility_media
                ADD CONSTRAINT fk_ifm_facility
                FOREIGN KEY (institution_facility_id)
                REFERENCES institution_facilities(id)
                ON DELETE CASCADE;
              END IF;

              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'chk_ifm_media_type'
              ) THEN
                ALTER TABLE institution_facility_media
                ADD CONSTRAINT chk_ifm_media_type
                CHECK (media_type IN ('image', 'video'));
              END IF;
            END $$;

            CREATE INDEX IF NOT EXISTS idx_ifm_facility
                ON institution_facility_media(institution_facility_id);
            CREATE INDEX IF NOT EXISTS idx_ifm_media_type
                ON institution_facility_media(media_type);
            CREATE INDEX IF NOT EXISTS idx_ifm_sort_order
                ON institution_facility_media(institution_facility_id, sort_order);
            CREATE INDEX IF NOT EXISTS idx_ifm_created_at
                ON institution_facility_media(created_at);
        `,
      )
      .then(() => undefined)
      .catch((error) => {
        institutionFacilitiesSchemaReady = null;
        throw error;
      });
  }

  return institutionFacilitiesSchemaReady;
}

export async function listInstitutionFacilities(
  db: Pool,
  institutionId: number,
) {
  await ensureInstitutionFacilitiesSchema(db);
  const res = await db.query(
    `
            SELECT
                f.id,
                f.institution_id,
                f.facility_type_id,
                ft.name AS facility_type_name,
                ft.slug AS facility_type_slug,
                f.title,
                f.description,
                f.image_url,
                f.ai_description,
                f.display_order,
                f.is_active,
                f.is_deleted,
                f.created_by,
                f.updated_by,
                f.created_at,
                f.updated_at
            FROM institution_facilities f
            INNER JOIN facility_types ft
                ON ft.id = f.facility_type_id
               AND COALESCE(ft.is_deleted, FALSE) = FALSE
            WHERE f.institution_id = $1
              AND COALESCE(f.is_deleted, FALSE) = FALSE
              AND EXISTS (
                  SELECT 1
                  FROM institution_profiles ip
                  WHERE ip.id = f.institution_id
                    AND ip.is_active = TRUE
                    AND COALESCE(ip.is_deleted, FALSE) = FALSE
              )
            ORDER BY f.display_order ASC, ft.name ASC, f.id ASC
        `,
    [institutionId],
  );
  return res.rows as InstitutionFacility[];
}

export async function listInstitutionFacilitySummaries(
  db: Pool,
  opts: {
    search?: string;
    institutionIds?: number[];
    limit?: number;
    offset?: number;
  } = {},
) {
  await ensureInstitutionFacilitiesSchema(db);
  const params: unknown[] = [];
  const where = [
    "COALESCE(ip.is_deleted, FALSE) = FALSE",
    "ip.is_active = TRUE",
  ];

  if (opts.search?.trim()) {
    params.push(`%${opts.search.trim()}%`);
    where.push(
      `(ip.name ILIKE $${params.length} OR ip.slug ILIKE $${params.length})`,
    );
  }

  if (opts.institutionIds) {
    params.push(opts.institutionIds);
    where.push(`ip.id = ANY($${params.length}::int[])`);
  }

  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [dataRes, countRes] = await Promise.all([
    db.query(
      `
                SELECT
                    ip.id AS institution_id,
                    COALESCE(ip.name, ip.slug) AS institution_name,
                    ip.slug AS institution_slug,
                    ip.is_active,
                    COUNT(DISTINCT f.id)::int AS facility_count,
                    COUNT(m.id)::int AS media_count,
                    MAX(f.updated_at) AS updated_at
                FROM institution_profiles ip
                LEFT JOIN institution_facilities f
                    ON f.institution_id = ip.id
                   AND COALESCE(f.is_deleted, FALSE) = FALSE
                LEFT JOIN institution_facility_media m
                    ON m.institution_facility_id = f.id
                ${whereSql}
                GROUP BY ip.id
                ORDER BY COALESCE(MAX(f.updated_at), ip.updated_at) DESC NULLS LAST, ip.id DESC
                LIMIT $${params.length + 1} OFFSET $${params.length + 2}
            `,
      [...params, limit, offset],
    ),
    db.query(
      `SELECT COUNT(*)::int AS count FROM institution_profiles ip ${whereSql}`,
      params,
    ),
  ]);

  return {
    data: dataRes.rows as InstitutionFacilitySummary[],
    total: Number(countRes.rows[0]?.count ?? 0),
  };
}

export async function listInstitutionFacilityMedia(
  db: Pool,
  facilityId: number,
) {
  await ensureInstitutionFacilitiesSchema(db);
  const res = await db.query(
    `
            SELECT id, institution_facility_id, media_type, url, title, sort_order, created_by, updated_by, created_at, updated_at
            FROM institution_facility_media
            WHERE institution_facility_id = $1
            ORDER BY sort_order ASC, id ASC
        `,
    [facilityId],
  );
  return res.rows as InstitutionFacilityMedia[];
}

export async function listInstitutionFacilitiesWithMedia(
  db: Pool,
  institutionId: number,
) {
  const facilities = await listInstitutionFacilities(db, institutionId);
  if (!facilities.length) return facilities;

  const ids = facilities.map((facility) => facility.id);
  const mediaRes = await db.query(
    `
            SELECT id, institution_facility_id, media_type, url, title, sort_order, created_by, updated_by, created_at, updated_at
            FROM institution_facility_media
            WHERE institution_facility_id = ANY($1::int[])
            ORDER BY sort_order ASC, id ASC
        `,
    [ids],
  );

  const mediaByFacility = new Map<number, InstitutionFacilityMedia[]>();
  for (const media of mediaRes.rows as InstitutionFacilityMedia[]) {
    const list = mediaByFacility.get(media.institution_facility_id) ?? [];
    list.push(media);
    mediaByFacility.set(media.institution_facility_id, list);
  }

  return facilities.map((facility) => ({
    ...facility,
    media: mediaByFacility.get(facility.id) ?? [],
  }));
}

export async function replaceInstitutionFacilities(
  db: Pool,
  institutionId: number,
  facilities: UpsertInstitutionFacilityData[],
  userId?: number | null,
) {
  await ensureInstitutionFacilitiesSchema(db);
  const client = await db.connect();

  try {
    await client.query("BEGIN");
    await client.query(
      `
                UPDATE institution_facilities
                SET is_deleted = TRUE,
                    deleted_at = NOW(),
                    is_active = FALSE,
                    updated_at = NOW()
                WHERE institution_id = $1
                  AND COALESCE(is_deleted, FALSE) = FALSE
            `,
      [institutionId],
    );

    for (const [index, facility] of facilities.entries()) {
      const existingRes = await client.query<{ id: number }>(
        `
                    UPDATE institution_facilities
                    SET title = $3,
                        description = $4,
                        image_url = $5,
                        ai_description = $6,
                        display_order = $7,
                        is_active = $8,
                        is_deleted = FALSE,
                        deleted_at = NULL,
                        updated_by = $9,
                        updated_at = NOW()
                    WHERE institution_id = $1
                      AND facility_type_id = $2
                    RETURNING id
                `,
        [
          institutionId,
          facility.facilityTypeId,
          facility.title ?? null,
          facility.description ?? null,
          facility.imageUrl ?? null,
          facility.aiDescription
            ? JSON.stringify(facility.aiDescription)
            : null,
          facility.displayOrder ?? index,
          facility.isActive ?? true,
          userId ?? null,
        ],
      );

      let facilityId = Number(existingRes.rows[0]?.id);
      if (!facilityId) {
        const insertRes = await client.query<{ id: number }>(
          `
                        INSERT INTO institution_facilities (
                            institution_id,
                            facility_type_id,
                            title,
                            description,
                            image_url,
                            ai_description,
                            display_order,
                            is_active,
                            created_by,
                            updated_by
                        )
                        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
                        RETURNING id
                    `,
          [
            institutionId,
            facility.facilityTypeId,
            facility.title ?? null,
            facility.description ?? null,
            facility.imageUrl ?? null,
            facility.aiDescription
              ? JSON.stringify(facility.aiDescription)
              : null,
            facility.displayOrder ?? index,
            facility.isActive ?? true,
            userId ?? null,
          ],
        );
        facilityId = Number(insertRes.rows[0]?.id);
      }

      await client.query(
        `DELETE FROM institution_facility_media WHERE institution_facility_id = $1`,
        [facilityId],
      );

      for (const [mediaIndex, media] of (facility.media ?? []).entries()) {
        if (!media.url?.trim()) continue;
        await client.query(
          `
                        INSERT INTO institution_facility_media (
                            institution_facility_id,
                            media_type,
                            url,
                            title,
                            sort_order,
                            created_by,
                            updated_by
                        )
                        VALUES ($1,$2,$3,$4,$5,$6,$6)
                    `,
          [
            facilityId,
            media.mediaType ?? "image",
            media.url,
            media.title ?? null,
            media.sortOrder ?? mediaIndex,
            userId ?? null,
          ],
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  return listInstitutionFacilitiesWithMedia(db, institutionId);
}

// -------------------------
// Institution Programs
// -------------------------

export async function listInstitutionPrograms(
  db: Pool,
  opts: ListProgramsOptions = {},
) {
  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;

  const baseConditions: string[] = [
    "ip.is_deleted = FALSE",
    "COALESCE(inst.is_deleted, FALSE) = FALSE",
    "inst.is_active = TRUE",
  ];
  const params: any[] = [];

  if (opts.institutionId) {
    params.push(opts.institutionId);
    baseConditions.push(`ip.institution_id = $${params.length}`);
  }
  const scopedInstitutionIds = (opts as any).institutionIds as
    number[] | undefined;
  if (scopedInstitutionIds) {
    if (scopedInstitutionIds.length === 0) {
      baseConditions.push("FALSE");
    } else {
      params.push(scopedInstitutionIds);
      baseConditions.push(`ip.institution_id = ANY($${params.length}::int[])`);
    }
  }
  if (opts.typeId) {
    params.push(opts.typeId);
    baseConditions.push(`ip.program_type_id = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    baseConditions.push(
      `(ip.title ILIKE $${params.length} OR ip.slug ILIKE $${params.length})`,
    );
  }

  const where = `WHERE ${baseConditions.join(" AND ")}`;

  const [dataRes, countRes] = await Promise.all([
    db.query(
      `
      SELECT
        ip.*,
        pt.name AS program_type_name,
        COALESCE(inst.name, inst.slug) AS institution_name,
        (
          SELECT string_agg(c.name, ', ' ORDER BY c.name)
          FROM program_categories pc
          JOIN categories c ON c.id = pc.category_id
          WHERE pc.program_id = ip.id
        ) AS categories
      FROM institution_programs ip
      LEFT JOIN program_types pt ON pt.id = ip.program_type_id
      INNER JOIN institution_profiles inst ON inst.id = ip.institution_id
      ${where}
    ORDER BY ip.updated_at DESC, ip.created_at DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `,
      [...params, limit, offset],
    ),
    db.query(
      `SELECT COUNT(*)::int AS count FROM institution_programs ip INNER JOIN institution_profiles inst ON inst.id = ip.institution_id ${where}`,
      params,
    ),
  ]);

  return {
    data: dataRes.rows as any[],
    total: countRes.rows[0].count as number,
  };
}

export async function getInstitutionProgramById(db: Pool, id: number) {
  const res = await db.query(
    `SELECT ip.*,
            pt.name AS program_type_name,
            COALESCE(inst.name, inst.slug) AS institution_name,
            COALESCE(univ.name, univ.slug) AS university_name,
            ay.name AS academic_year_name,
            ay.start_date AS academic_year_start_date,
            ay.end_date AS academic_year_end_date,
            inst.board_id AS institution_board_id,
            board.name AS institution_board_name
         FROM institution_programs ip
         LEFT JOIN program_types pt ON pt.id = ip.program_type_id
         INNER JOIN institution_profiles inst
           ON inst.id = ip.institution_id
          AND COALESCE(inst.is_deleted, FALSE) = FALSE
          AND inst.is_active = TRUE
         LEFT JOIN institution_profiles univ ON univ.id = ip.university_id
         LEFT JOIN academic_years ay ON ay.id = ip.academic_year_id
         LEFT JOIN boards board ON board.id = inst.board_id
         WHERE ip.id = $1
           AND COALESCE(ip.is_deleted, FALSE) = FALSE`,
    [id],
  );
  if (!res.rows.length) return null;
  const program = res.rows[0];
  const cats = await db.query(
    `SELECT pc.category_id, c.name AS category_name, p.name AS parent_name
         FROM program_categories pc
         JOIN categories c ON c.id = pc.category_id
         LEFT JOIN categories p ON p.id = c.parent_id
         WHERE pc.program_id = $1
         ORDER BY c.depth ASC, c.name ASC`,
    [id],
  );
  const pickerCategory = cats.rows[0];
  program.category_ids = pickerCategory ? [pickerCategory.category_id] : [];
  program.category_names = pickerCategory ? [pickerCategory.category_name] : [];
  program.category_parent_names = pickerCategory
    ? [pickerCategory.parent_name]
    : [];
  program.picker_category_id = pickerCategory?.category_id ?? null;
  program.picker_category_name = pickerCategory?.category_name ?? null;
  program.picker_category_parent_name = pickerCategory?.parent_name ?? null;
  const langs = await db.query(
    `SELECT pl.language_id, l.name AS language_name
         FROM program_languages pl
         JOIN languages l ON l.id = pl.language_id
         WHERE pl.program_id = $1`,
    [id],
  );
  program.language_ids = langs.rows.map((r: any) => r.language_id);
  program.language_names = langs.rows.map((r: any) => r.language_name);
  const subjects = await db.query<{
    subject_id: number;
    subject_name: string;
    syllabus_available: boolean;
  }>(
    `SELECT
            ps.subject_id,
            s.name AS subject_name,
            EXISTS (
                SELECT 1
                FROM syllabi sy
                WHERE sy.subject_id = ps.subject_id
                  AND sy.institution_id = $2
                  AND COALESCE(sy.is_active, TRUE) = TRUE
                LIMIT 1
            ) AS syllabus_available
         FROM program_subjects ps
         JOIN subjects s ON s.id = ps.subject_id
         WHERE ps.program_id = $1
         ORDER BY s.name ASC`,
    [id, program.institution_id],
  );
  program.subject_ids = subjects.rows.map((r) => r.subject_id);
  program.subject_names = subjects.rows.map((r) => r.subject_name);
  program.subject_syllabus_available = subjects.rows.map((r) =>
    Boolean(r.syllabus_available),
  );
  const subjectCategories = await db.query(
    `SELECT pc.category_id, c.name AS category_name
         FROM program_categories pc
         JOIN categories c ON c.id = pc.category_id
         WHERE pc.program_id = $1
           AND pc.category_id <> $2
           AND NOT EXISTS (
             SELECT 1
             FROM categories child
             WHERE child.parent_id = c.id
               AND child.is_deleted = FALSE
           )
         ORDER BY c.name ASC`,
    [id, pickerCategory?.category_id ?? 0],
  );
  program.subject_category_ids = subjectCategories.rows.map(
    (r: any) => r.category_id,
  );
  program.subject_category_names = subjectCategories.rows.map(
    (r: any) => r.category_name,
  );
  const sections = await db.query(
    `SELECT ps.section_id, s.name AS section_name
         FROM program_sections ps
         JOIN sections s ON s.id = ps.section_id
         WHERE ps.program_id = $1
         ORDER BY s.name ASC`,
    [id],
  );
  program.section_ids = sections.rows.map((r: any) => r.section_id);
  program.section_names = sections.rows.map((r: any) => r.section_name);
  await ensureProgramFeeComponentUnitColumn(db);
  const fees = await db.query(
    `SELECT id, title, amount, fee_unit AS unit FROM program_fee_components WHERE program_id = $1 ORDER BY sort_order ASC`,
    [id],
  );
  program.fee_components = fees.rows;
  return program;
}

type QueryRunner = {
  query: (
    text: string,
    params?: unknown[],
  ) => Promise<{ rows: Record<string, unknown>[] }>;
};

async function ensureProgramFeeComponentUnitColumn(client: QueryRunner) {
  await client.query(`
    ALTER TABLE program_fee_components
      ADD COLUMN IF NOT EXISTS fee_unit TEXT NULL
  `);
}

async function assertProgramScopedRelations(
  client: QueryRunner,
  data: {
    institutionId: number;
    academicYearId?: number | null;
  },
) {
  if (data.academicYearId) {
    const academicYear = await client.query(
      `SELECT id FROM academic_years WHERE id = $1 AND institution_id = $2 LIMIT 1`,
      [data.academicYearId, data.institutionId],
    );
    if (!academicYear.rows.length) {
      throw new Error("Academic year must belong to the selected institution");
    }
  }
}

export async function createInstitutionProgram(
  db: Pool,
  data: CreateProgramData,
) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await ensureProgramFeeComponentUnitColumn(client);

    const baseSlug = data.slug || slugify(data.title);

    // Check active rows only; old deleted rows should not reserve a slug.
    const existing = await client.query(
      `SELECT id
             FROM institution_programs
             WHERE institution_id = $1
               AND slug = $2
               AND COALESCE(is_deleted, FALSE) = FALSE
             LIMIT 1`,
      [data.institutionId, baseSlug],
    );

    if (existing.rows.length > 0) {
      throw new Error(
        `A program with slug "${baseSlug}" already exists in this institution`,
      );
    }

    await assertProgramScopedRelations(client, data);

    const res = await client.query(
      `INSERT INTO institution_programs (
        institution_id, program_type_id, slug, title, about, duration_value, duration_unit, seats_available, teaching_method, board_id, university_id, academic_year_id, is_active, is_deleted, created_by, updated_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, TRUE, FALSE, $13, $13) RETURNING *`,
      [
        data.institutionId,
        data.programTypeId,
        baseSlug,
        data.title,
        data.about || null,
        data.durationValue || null,
        data.durationUnit || null,
        data.seatsAvailable || null,
        data.teachingMethod || null,
        data.boardId || null,
        data.universityId || null,
        data.academicYearId || null,
        data.createdBy || null,
      ],
    );

    const newProgram = res.rows[0];

    if (data.categoryIds && data.categoryIds.length) {
      for (const cid of data.categoryIds) {
        await client.query(
          `INSERT INTO program_categories (program_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [newProgram.id, cid],
        );
      }
    }

    if (data.subjectCategoryIds && data.subjectCategoryIds.length) {
      for (const cid of data.subjectCategoryIds) {
        await client.query(
          `INSERT INTO program_categories (program_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [newProgram.id, cid],
        );
      }
    }

    if (data.languageIds && data.languageIds.length) {
      for (const lid of data.languageIds) {
        await client.query(
          `INSERT INTO program_languages (program_id, language_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [newProgram.id, lid],
        );
      }
    }

    if (data.subjectIds && data.subjectIds.length) {
      for (const sid of data.subjectIds) {
        await client.query(
          `INSERT INTO program_subjects (program_id, subject_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [newProgram.id, sid],
        );
      }
    }

    if (data.sectionIds && data.sectionIds.length) {
      for (const sid of data.sectionIds) {
        await client.query(
          `INSERT INTO program_sections (program_id, section_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [newProgram.id, sid],
        );
      }
    }

    if (data.feeComponents && data.feeComponents.length) {
      let order = 0;
      for (const f of data.feeComponents) {
        await client.query(
          `INSERT INTO program_fee_components (program_id, title, amount, fee_unit, sort_order, created_by, updated_by) VALUES ($1,$2,$3,$4,$5,$6,$6)`,
          [newProgram.id, f.title, f.amount, f.unit || null, order++, data.createdBy || null],
        );
      }
    }

    await client.query("COMMIT");
    return newProgram;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateInstitutionProgram(
  db: Pool,
  input: UpdateProgramData,
) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await ensureProgramFeeComponentUnitColumn(client);
    const current = await client.query(
      `SELECT institution_id FROM institution_programs WHERE id = $1 LIMIT 1`,
      [input.id],
    );
    if (!current.rows.length) {
      throw new Error("Program not found");
    }
    const relationInstitutionId =
      input.institutionId ?? Number(current.rows[0].institution_id);
    await assertProgramScopedRelations(client, {
      institutionId: relationInstitutionId,
      academicYearId: input.academicYearId,
    });

    const fields: string[] = [];
    const params: any[] = [];
    if (input.institutionId !== undefined) {
      params.push(input.institutionId);
      fields.push(`institution_id = $${params.length}`);
    }
    if (input.isActive !== undefined) {
      params.push(input.isActive);
      fields.push(`is_active = $${params.length}`);
    }
    if (input.programTypeId !== undefined) {
      params.push(input.programTypeId);
      fields.push(`program_type_id = $${params.length}`);
    }
    if (input.title !== undefined) {
      params.push(input.title);
      fields.push(`title = $${params.length}`);
    }
    if (input.about !== undefined) {
      params.push(input.about);
      fields.push(`about = $${params.length}`);
    }
    if (input.durationValue !== undefined) {
      params.push(input.durationValue);
      fields.push(`duration_value = $${params.length}`);
    }
    if (input.durationUnit !== undefined) {
      params.push(input.durationUnit);
      fields.push(`duration_unit = $${params.length}`);
    }
    if (input.seatsAvailable !== undefined) {
      params.push(input.seatsAvailable);
      fields.push(`seats_available = $${params.length}`);
    }
    if (input.teachingMethod !== undefined) {
      params.push(input.teachingMethod);
      fields.push(`teaching_method = $${params.length}`);
    }
    if (input.boardId !== undefined) {
      params.push(input.boardId);
      fields.push(`board_id = $${params.length}`);
    }
    if (input.universityId !== undefined) {
      params.push(input.universityId);
      fields.push(`university_id = $${params.length}`);
    }
    if (input.academicYearId !== undefined) {
      params.push(input.academicYearId);
      fields.push(`academic_year_id = $${params.length}`);
    }
    if (input.slug !== undefined) {
      params.push(input.slug);
      fields.push(`slug = $${params.length}`);
    }
    if (input.updatedBy !== undefined) {
      params.push(input.updatedBy);
      fields.push(`updated_by = $${params.length}`);
    }

    if (fields.length) {
      params.push(input.id);
      await client.query(
        `UPDATE institution_programs SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${params.length}`,
        params,
      );
    }

    if (input.categoryIds) {
      await client.query(
        `DELETE FROM program_categories WHERE program_id = $1`,
        [input.id],
      );
      for (const cid of input.categoryIds) {
        await client.query(
          `INSERT INTO program_categories (program_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [input.id, cid],
        );
      }
      for (const cid of input.subjectCategoryIds || []) {
        await client.query(
          `INSERT INTO program_categories (program_id, category_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [input.id, cid],
        );
      }
    }

    if (input.languageIds) {
      await client.query(
        `DELETE FROM program_languages WHERE program_id = $1`,
        [input.id],
      );
      for (const lid of input.languageIds) {
        await client.query(
          `INSERT INTO program_languages (program_id, language_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [input.id, lid],
        );
      }
    }

    if (input.subjectIds) {
      await client.query(`DELETE FROM program_subjects WHERE program_id = $1`, [
        input.id,
      ]);
      for (const sid of input.subjectIds) {
        await client.query(
          `INSERT INTO program_subjects (program_id, subject_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [input.id, sid],
        );
      }
    }

    if (input.sectionIds) {
      await client.query(`DELETE FROM program_sections WHERE program_id = $1`, [
        input.id,
      ]);
      for (const sid of input.sectionIds) {
        await client.query(
          `INSERT INTO program_sections (program_id, section_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [input.id, sid],
        );
      }
    }

    if (input.feeComponents) {
      await client.query(
        `DELETE FROM program_fee_components WHERE program_id = $1`,
        [input.id],
      );
      let order = 0;
      for (const f of input.feeComponents) {
        await client.query(
          `INSERT INTO program_fee_components (program_id, title, amount, fee_unit, sort_order, created_by, updated_by) VALUES ($1,$2,$3,$4,$5,$6,$6)`,
          [input.id, f.title, f.amount, f.unit || null, order++, input.updatedBy || null],
        );
      }
    }

    await client.query("COMMIT");
    return await getInstitutionProgramById(db, input.id);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteInstitutionProgram(db: Pool, id: number) {
  await db.query(
    `
            UPDATE institution_programs
            SET is_deleted = TRUE,
                deleted_at = NOW(),
                is_active = FALSE,
                updated_at = NOW()
            WHERE id = $1
              AND COALESCE(is_deleted, FALSE) = FALSE
        `,
    [id],
  );
}

// -------------------------
// Institution Media
// -------------------------

export async function listInstitutionMedia(
  db: Pool,
  institutionId: number,
  limit = 20,
  offset = 0,
) {
  const res = await db.query(
    `
            SELECT media.id, media.institution_id, media.media_type, media.url, media.title,
                   media.sort_order, media.created_by, media.updated_by, media.created_at, media.updated_at
            FROM institution_media media
            INNER JOIN institution_profiles institution
              ON institution.id = media.institution_id
             AND institution.is_active = TRUE
             AND COALESCE(institution.is_deleted, FALSE) = FALSE
            WHERE media.institution_id = $1
              AND COALESCE(media.is_deleted, FALSE) = FALSE
            ORDER BY media.sort_order ASC
            LIMIT $2 OFFSET $3
        `,
    [institutionId, limit, offset],
  );
  return res.rows;
}

export async function createInstitutionMedia(
  db: Pool,
  data: {
    institutionId: number;
    mediaType: string;
    url: string;
    title?: string;
    sortOrder?: number;
    createdBy?: number | null;
  },
) {
  const res = await db.query(
    `INSERT INTO institution_media (institution_id, media_type, url, title, sort_order, created_by, updated_by) VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
    [
      data.institutionId,
      data.mediaType,
      data.url,
      data.title || null,
      data.sortOrder || 0,
      data.createdBy || null,
    ],
  );
  return res.rows[0];
}

export async function deleteInstitutionMedia(db: Pool, id: number) {
  await db.query(
    `
            UPDATE institution_media
            SET is_deleted = TRUE,
                deleted_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
              AND COALESCE(is_deleted, FALSE) = FALSE
        `,
    [id],
  );
}

// -------------------------
// Program Media
// -------------------------

export async function listProgramMedia(
  db: Pool,
  programId: number,
  limit = 20,
  offset = 0,
) {
  const res = await db.query(
    `SELECT id, program_id, media_type, url, title, sort_order, created_by, updated_by, created_at, updated_at FROM program_media WHERE program_id = $1 ORDER BY sort_order ASC LIMIT $2 OFFSET $3`,
    [programId, limit, offset],
  );
  return res.rows;
}

export async function createProgramMedia(
  db: Pool,
  data: {
    programId: number;
    mediaType: string;
    url: string;
    title?: string;
    sortOrder?: number;
    createdBy?: number | null;
  },
) {
  const res = await db.query(
    `INSERT INTO program_media (program_id, media_type, url, title, sort_order, created_by, updated_by) VALUES ($1,$2,$3,$4,$5,$6,$6) RETURNING *`,
    [
      data.programId,
      data.mediaType,
      data.url,
      data.title || null,
      data.sortOrder || 0,
      data.createdBy || null,
    ],
  );
  return res.rows[0];
}

export async function deleteProgramMedia(db: Pool, id: number) {
  await db.query(`DELETE FROM program_media WHERE id = $1`, [id]);
}

// -------------------------
// Institution Placements
// -------------------------

export async function listInstitutionPlacements(
  db: Pool,
  opts: ListPlacementsOptions = {},
) {
  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;
  const params: any[] = [];
  const where: string[] = [
    "COALESCE(p.is_deleted, FALSE) = FALSE",
    "COALESCE(prof.is_deleted, FALSE) = FALSE",
    "prof.is_active = TRUE",
  ];

  if (opts.institutionId) {
    params.push(opts.institutionId);
    where.push(`p.institution_id = $${params.length}`);
  }

  const scopedInstitutionIds = (opts as any).institutionIds as
    number[] | undefined;
  if (scopedInstitutionIds) {
    if (scopedInstitutionIds.length === 0) {
      where.push("FALSE");
    } else {
      params.push(scopedInstitutionIds);
      where.push(`p.institution_id = ANY($${params.length}::int[])`);
    }
  }

  if (search) {
    params.push(`%${search}%`);
    where.push(`(
            CAST(p.year AS TEXT) ILIKE $${params.length}
            OR COALESCE(program.title, '') ILIKE $${params.length}
        )`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [dataRes, countRes] = await Promise.all([
    db.query(
      `SELECT p.*, prof.name AS institution_name, program.title AS program_name
             FROM institution_placements p
             INNER JOIN institution_profiles prof ON prof.id = p.institution_id
             LEFT JOIN institution_programs program
               ON program.id = p.program_id
              AND COALESCE(program.is_deleted, FALSE) = FALSE
             ${whereClause}
             ORDER BY p.updated_at DESC, p.created_at DESC, p.year DESC
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(
      `SELECT COUNT(*)::int AS count
             FROM institution_placements p
             INNER JOIN institution_profiles prof ON prof.id = p.institution_id
             LEFT JOIN institution_programs program
               ON program.id = p.program_id
              AND COALESCE(program.is_deleted, FALSE) = FALSE
             ${whereClause}`,
      params,
    ),
  ]);

  return {
    data: dataRes.rows as any[],
    total: countRes.rows[0].count as number,
  };
}

export async function createInstitutionPlacement(
  db: Pool,
  data: CreatePlacementData,
) {
  const res = await db.query(
    `INSERT INTO institution_placements (
      institution_id, program_id, year, average_package, highest_package, lowest_package,
      placement_percentage, total_students, placed_students, created_by, updated_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10) RETURNING *`,
    [
      data.institutionId,
      data.programId ?? null,
      data.year,
      data.averagePackage ?? null,
      data.highestPackage ?? null,
      data.lowestPackage ?? null,
      data.placementPercentage ?? null,
      data.totalStudents ?? null,
      data.placedStudents ?? null,
      data.createdBy ?? null,
    ],
  );
  return res.rows[0] as InstitutionPlacement;
}

export async function getInstitutionPlacementById(db: Pool, id: number) {
  const res = await db.query(
    `SELECT p.*, prof.name AS institution_name, program.title AS program_name
           FROM institution_placements p
           INNER JOIN institution_profiles prof
              ON prof.id = p.institution_id
             AND COALESCE(prof.is_deleted, FALSE) = FALSE
             AND prof.is_active = TRUE
           LEFT JOIN institution_programs program
              ON program.id = p.program_id
             AND COALESCE(program.is_deleted, FALSE) = FALSE
          WHERE p.id = $1
            AND COALESCE(p.is_deleted, FALSE) = FALSE`,
    [id],
  );
  return res.rows[0] || null;
}

export async function updateInstitutionPlacement(
  db: Pool,
  input: UpdatePlacementData,
) {
  const fields: string[] = [];
  const params: any[] = [];

  if (input.institutionId !== undefined) {
    params.push(input.institutionId);
    fields.push(`institution_id = $${params.length}`);
  }
  if (input.programId !== undefined) {
    params.push(input.programId);
    fields.push(`program_id = $${params.length}`);
  }
  if (input.year !== undefined) {
    params.push(input.year);
    fields.push(`year = $${params.length}`);
  }
  if (input.averagePackage !== undefined) {
    params.push(input.averagePackage);
    fields.push(`average_package = $${params.length}`);
  }
  if (input.highestPackage !== undefined) {
    params.push(input.highestPackage);
    fields.push(`highest_package = $${params.length}`);
  }
  if (input.lowestPackage !== undefined) {
    params.push(input.lowestPackage);
    fields.push(`lowest_package = $${params.length}`);
  }
  if (input.placementPercentage !== undefined) {
    params.push(input.placementPercentage);
    fields.push(`placement_percentage = $${params.length}`);
  }
  if (input.totalStudents !== undefined) {
    params.push(input.totalStudents);
    fields.push(`total_students = $${params.length}`);
  }
  if (input.placedStudents !== undefined) {
    params.push(input.placedStudents);
    fields.push(`placed_students = $${params.length}`);
  }
  if (input.updatedBy !== undefined) {
    params.push(input.updatedBy);
    fields.push(`updated_by = $${params.length}`);
  }

  if (!fields.length) return getInstitutionPlacementById(db, input.id);

  params.push(input.id);
  const res = await db.query(
    `UPDATE institution_placements SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
    params,
  );
  return res.rows[0];
}

export async function deleteInstitutionPlacement(db: Pool, id: number) {
  await db.query(
    `UPDATE institution_placements
            SET is_deleted = TRUE,
                deleted_at = NOW(),
                updated_at = NOW()
          WHERE id = $1
            AND COALESCE(is_deleted, FALSE) = FALSE`,
    [id],
  );
}

// -------------------------
// Institution Cutoffs
// -------------------------

async function cutoffExists(
  client: any,
  institutionId: number,
  programId: number | null | undefined,
  academicYearId: number | null | undefined,
  examName: string,
  excludeId?: number,
) {
  const params: any[] = [
    institutionId,
    programId ?? null,
    academicYearId ?? null,
    examName.trim().toLowerCase() || "general",
  ];
  let query = `
        SELECT 1
        FROM institution_cutoffs
        WHERE institution_id = $1
          AND COALESCE(program_id, -1) = COALESCE($2::int, -1)
          AND COALESCE(academic_year_id, -1) = COALESCE($3::int, -1)
          AND LOWER(COALESCE(exam_name, 'general')) = $4
          AND is_deleted = FALSE
    `;

  if (excludeId !== undefined) {
    params.push(excludeId);
    query += ` AND id <> $5`;
  }

  query += ` LIMIT 1`;

  const res = await client.query(query, params);
  return res.rows.length > 0;
}

export async function listInstitutionCutoffs(
  db: Pool,
  opts: ListCutoffsOptions = {},
) {
  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;
  const params: any[] = [];
  const where: string[] = [];

  if (opts.institutionId) {
    params.push(opts.institutionId);
    where.push(`c.institution_id = $${params.length}`);
  }

  const scopedInstitutionIds = (opts as any).institutionIds as
    number[] | undefined;
  if (scopedInstitutionIds) {
    if (scopedInstitutionIds.length === 0) {
      where.push("FALSE");
    } else {
      params.push(scopedInstitutionIds);
      where.push(`c.institution_id = ANY($${params.length}::int[])`);
    }
  }

  if (opts.programId !== undefined && opts.programId !== null) {
    params.push(opts.programId);
    where.push(`c.program_id = $${params.length}`);
  }

  if (opts.academicYearId !== undefined && opts.academicYearId !== null) {
    params.push(opts.academicYearId);
    where.push(`c.academic_year_id = $${params.length}`);
  }

  where.push(`c.is_deleted = FALSE`);
  where.push(`COALESCE(prof.is_deleted, FALSE) = FALSE`);
  where.push(`prof.is_active = TRUE`);

  if (search) {
    params.push(`%${search}%`);
    const searchParam = `$${params.length}`;
    where.push(`(
            prof.name ILIKE ${searchParam}
            OR COALESCE(p.title, '') ILIKE ${searchParam}
            OR COALESCE(c.exam_name, '') ILIKE ${searchParam}
            OR COALESCE(ay.name, '') ILIKE ${searchParam}
            OR c.ai_response::text ILIKE ${searchParam}
            OR CAST(c.years_to_generate AS TEXT) ILIKE ${searchParam}
        )`);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [dataRes, countRes] = await Promise.all([
    db.query(
      `SELECT c.*, prof.name AS institution_name, p.title AS program_name, ay.name AS academic_year_name
             FROM institution_cutoffs c
             INNER JOIN institution_profiles prof ON prof.id = c.institution_id
             LEFT JOIN institution_programs p ON p.id = c.program_id AND COALESCE(p.is_deleted, FALSE) = FALSE
             LEFT JOIN academic_years ay ON ay.id = c.academic_year_id
             ${whereClause}
             ORDER BY c.updated_at DESC, c.id DESC
             LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(
      `SELECT COUNT(*)::int AS count
             FROM institution_cutoffs c
             INNER JOIN institution_profiles prof ON prof.id = c.institution_id
             LEFT JOIN institution_programs p ON p.id = c.program_id AND COALESCE(p.is_deleted, FALSE) = FALSE
             LEFT JOIN academic_years ay ON ay.id = c.academic_year_id
             ${whereClause}`,
      params,
    ),
  ]);

  return {
    data: dataRes.rows as InstitutionCutoff[],
    total: countRes.rows[0].count as number,
  };
}

async function insertInstitutionCutoff(client: any, data: CreateCutoffData) {
  const duplicateExists = await cutoffExists(
    client,
    data.institutionId,
    data.programId ?? null,
    data.academicYearId ?? null,
    data.examName ?? "general",
  );
  if (duplicateExists) {
    throw new Error(
      `A cutoff with the same exam already exists for this institution and program`,
    );
  }

  const res = await client.query(
    `INSERT INTO institution_cutoffs (
            institution_id, program_id, academic_year_id, years_to_generate, exam_name, ai_response, is_active, is_deleted, created_by, updated_by
        ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,FALSE,$8,$8) RETURNING *`,
    [
      data.institutionId,
      data.programId ?? null,
      data.academicYearId ?? null,
      data.yearsToGenerate,
      data.examName?.trim() || null,
      JSON.stringify(data.aiResponse),
      data.isActive ?? true,
      data.createdBy ?? null,
    ],
  );

  return res.rows[0] as InstitutionCutoff;
}

export async function createInstitutionCutoff(
  db: Pool,
  data: CreateCutoffData,
) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const created = await insertInstitutionCutoff(client, data);
    await client.query("COMMIT");
    return created;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getInstitutionCutoffById(db: Pool, id: number) {
  const res = await db.query(
    `SELECT c.*, prof.name AS institution_name, p.title AS program_name, ay.name AS academic_year_name
         FROM institution_cutoffs c
         INNER JOIN institution_profiles prof
            ON prof.id = c.institution_id
           AND COALESCE(prof.is_deleted, FALSE) = FALSE
           AND prof.is_active = TRUE
         LEFT JOIN institution_programs p
            ON p.id = c.program_id
           AND COALESCE(p.is_deleted, FALSE) = FALSE
         LEFT JOIN academic_years ay
            ON ay.id = c.academic_year_id
         WHERE c.id = $1
           AND COALESCE(c.is_deleted, FALSE) = FALSE`,
    [id],
  );
  return res.rows[0] || null;
}

export async function updateInstitutionCutoff(
  db: Pool,
  input: UpdateCutoffData,
) {
  const client = await db.connect();
  try {
    await client.query("BEGIN");

    const current = await getInstitutionCutoffById(db, input.id);
    if (!current) {
      await client.query("ROLLBACK");
      return null;
    }

    const nextInstitutionId = input.institutionId ?? current.institution_id;
    const nextProgramId =
      input.programId !== undefined
        ? input.programId
        : (current.program_id ?? null);
    const nextAcademicYearId =
      input.academicYearId !== undefined
        ? input.academicYearId
        : (current.academic_year_id ?? null);
    const nextExamName = input.examName ?? current.exam_name ?? "general";

    const duplicateExists = await cutoffExists(
      client,
      nextInstitutionId,
      nextProgramId,
      nextAcademicYearId,
      nextExamName,
      input.id,
    );
    if (duplicateExists) {
      throw new Error(
        `A cutoff with the same exam already exists for this institution and program`,
      );
    }

    const fields: string[] = [];
    const params: any[] = [];

    if (input.institutionId !== undefined) {
      params.push(input.institutionId);
      fields.push(`institution_id = $${params.length}`);
    }
    if (input.programId !== undefined) {
      params.push(input.programId);
      fields.push(`program_id = $${params.length}`);
    }
    if (input.academicYearId !== undefined) {
      params.push(input.academicYearId);
      fields.push(`academic_year_id = $${params.length}`);
    }
    if (input.yearsToGenerate !== undefined) {
      params.push(input.yearsToGenerate);
      fields.push(`years_to_generate = $${params.length}`);
    }
    if (input.examName !== undefined) {
      params.push(input.examName?.trim() || null);
      fields.push(`exam_name = $${params.length}`);
    }
    if (input.aiResponse !== undefined) {
      params.push(JSON.stringify(input.aiResponse));
      fields.push(`ai_response = $${params.length}::jsonb`);
    }
    if (input.isActive !== undefined) {
      params.push(input.isActive);
      fields.push(`is_active = $${params.length}`);
    }
    if (input.isDeleted !== undefined) {
      params.push(input.isDeleted);
      fields.push(`is_deleted = $${params.length}`);
    }
    if (input.updatedBy !== undefined) {
      params.push(input.updatedBy);
      fields.push(`updated_by = $${params.length}`);
    }

    if (!fields.length) {
      await client.query("COMMIT");
      return current;
    }

    params.push(input.id);
    const res = await client.query(
      `UPDATE institution_cutoffs SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
      params,
    );

    await client.query("COMMIT");
    return res.rows[0] as InstitutionCutoff;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deleteInstitutionCutoff(db: Pool, id: number) {
  await db.query(
    `UPDATE institution_cutoffs
            SET is_deleted = TRUE,
                deleted_at = NOW(),
                updated_at = NOW()
          WHERE id = $1
            AND COALESCE(is_deleted, FALSE) = FALSE`,
    [id],
  );
}

// -------------------------
// Institution Scholarships
// -------------------------

export async function listInstitutionScholarships(
  db: Pool,
  opts: ListScholarshipsOptions = {},
) {
  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;
  const params: any[] = [];
  const where: string[] = [
    "COALESCE(s.is_deleted, FALSE) = FALSE",
    "COALESCE(prof.is_deleted, FALSE) = FALSE",
    "prof.is_active = TRUE",
  ];

  if (opts.institutionId) {
    params.push(opts.institutionId);
    where.push(`s.institution_id = $${params.length}`);
  }

  const scopedInstitutionIds = (opts as any).institutionIds as
    number[] | undefined;
  if (scopedInstitutionIds) {
    if (scopedInstitutionIds.length === 0) {
      where.push("FALSE");
    } else {
      params.push(scopedInstitutionIds);
      where.push(`s.institution_id = ANY($${params.length}::int[])`);
    }
  }

  if (search) {
    params.push(`%${search}%`);
    where.push(
      `(prof.name ILIKE $${params.length} OR s.ai_response::text ILIKE $${params.length})`,
    );
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const [dataRes, countRes] = await Promise.all([
    db.query(
      `SELECT s.*, prof.name AS institution_name FROM institution_scholarships s INNER JOIN institution_profiles prof ON prof.id = s.institution_id ${whereClause} ORDER BY s.updated_at DESC, s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(
      `SELECT COUNT(*)::int AS count FROM institution_scholarships s INNER JOIN institution_profiles prof ON prof.id = s.institution_id ${whereClause}`,
      params,
    ),
  ]);

  return {
    data: dataRes.rows as any[],
    total: countRes.rows[0].count as number,
  };
}

export async function createInstitutionScholarship(
  db: Pool,
  data: CreateScholarshipData,
) {
  const createdByColumnExists = await hasColumn(
    db,
    "institution_scholarships",
    "created_by",
  );
  const updatedByColumnExists = await hasColumn(
    db,
    "institution_scholarships",
    "updated_by",
  );

  const columns = [
    "institution_id",
    "ai_response",
    "is_ai_generated",
    "is_active",
    "is_deleted",
  ];
  const values = ["$1", "$2", "$3", "$4", "FALSE"];
  const params: any[] = [
    data.institutionId,
    JSON.stringify(data.aiResponse),
    data.isAiGenerated ?? true,
    data.isActive ?? true,
  ];

  if (createdByColumnExists) {
    columns.push("created_by");
    values.push(`$${params.length + 1}`);
    params.push(data.createdBy ?? null);
  }

  if (updatedByColumnExists) {
    columns.push("updated_by");
    values.push(
      createdByColumnExists ? `$${params.length + 1}` : `$${params.length + 1}`,
    );
    params.push(data.createdBy ?? null);
  }

  const res = await db.query(
    `INSERT INTO institution_scholarships (${columns.join(", ")}) VALUES (${values.join(", ")}) RETURNING *`,
    params,
  );
  return res.rows[0] as InstitutionScholarship;
}

export async function getInstitutionScholarshipById(db: Pool, id: number) {
  const res = await db.query(
    `SELECT s.*
           FROM institution_scholarships s
           INNER JOIN institution_profiles prof
              ON prof.id = s.institution_id
             AND COALESCE(prof.is_deleted, FALSE) = FALSE
             AND prof.is_active = TRUE
          WHERE s.id = $1
            AND COALESCE(s.is_deleted, FALSE) = FALSE`,
    [id],
  );
  return res.rows[0] || null;
}

export async function updateInstitutionScholarship(
  db: Pool,
  input: UpdateScholarshipData,
) {
  const fields: string[] = [];
  const params: any[] = [];
  const updatedByColumnExists = await hasColumn(
    db,
    "institution_scholarships",
    "updated_by",
  );

  if (input.institutionId !== undefined) {
    params.push(input.institutionId);
    fields.push(`institution_id = $${params.length}`);
  }
  if (input.aiResponse !== undefined) {
    params.push(JSON.stringify(input.aiResponse));
    fields.push(`ai_response = $${params.length}::jsonb`);
  }
  if (input.isAiGenerated !== undefined) {
    params.push(input.isAiGenerated);
    fields.push(`is_ai_generated = $${params.length}`);
  }
  if (input.isActive !== undefined) {
    params.push(input.isActive);
    fields.push(`is_active = $${params.length}`);
  }
  if (input.isDeleted !== undefined) {
    params.push(input.isDeleted);
    fields.push(`is_deleted = $${params.length}`);
  }
  if (updatedByColumnExists && input.updatedBy !== undefined) {
    params.push(input.updatedBy);
    fields.push(`updated_by = $${params.length}`);
  }

  if (!fields.length) return getInstitutionScholarshipById(db, input.id);

  params.push(input.id);
  const res = await db.query(
    `UPDATE institution_scholarships SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
    params,
  );
  return res.rows[0];
}

export async function deleteInstitutionScholarship(db: Pool, id: number) {
  await db.query(
    `UPDATE institution_scholarships
            SET is_deleted = TRUE,
                deleted_at = NOW(),
                updated_at = NOW()
          WHERE id = $1
            AND COALESCE(is_deleted, FALSE) = FALSE`,
    [id],
  );
}

// -------------------------
// Institution News
// -------------------------

let institutionNewsSessionSchemaReady: Promise<void> | null = null;

export async function ensureInstitutionNewsSessionSchema(db: Pool) {
  if (!institutionNewsSessionSchemaReady) {
    institutionNewsSessionSchemaReady = (async () => {
      await db.query(`
        ALTER TABLE institution_news
          ADD COLUMN IF NOT EXISTS academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL
      `);
      await db.query(`
        UPDATE institution_news n
        SET academic_year_id = (
          SELECT ay.id
          FROM academic_years ay
          WHERE ay.institution_id = n.institution_id
            AND COALESCE(ay.is_deleted, FALSE) = FALSE
            AND COALESCE(ay.is_active, TRUE) = TRUE
          ORDER BY
            CASE WHEN CURRENT_DATE BETWEEN ay.start_date AND ay.end_date THEN 0 ELSE 1 END,
            ay.start_date DESC,
            ay.id DESC
          LIMIT 1
        )
        WHERE n.academic_year_id IS NULL
          AND EXISTS (
            SELECT 1
            FROM academic_years ay
            WHERE ay.institution_id = n.institution_id
              AND COALESCE(ay.is_deleted, FALSE) = FALSE
              AND COALESCE(ay.is_active, TRUE) = TRUE
          )
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_institution_news_session
          ON institution_news(institution_id, academic_year_id, published_at DESC)
          WHERE COALESCE(is_deleted, FALSE) = FALSE
      `);
    })().catch((error) => {
      institutionNewsSessionSchemaReady = null;
      throw error;
    });
  }
  return institutionNewsSessionSchemaReady;
}

export async function listInstitutionNews(
  db: Pool,
  opts: ListNewsOptions = {},
) {
  await ensureInstitutionNewsSessionSchema(db);
  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;
  const params: any[] = [];
  const where: string[] = [
    "n.is_deleted = FALSE",
    "COALESCE(prof.is_deleted, FALSE) = FALSE",
    "prof.is_active = TRUE",
  ];

  if (opts.institutionId) {
    params.push(opts.institutionId);
    where.push(`n.institution_id = $${params.length}`);
  }

  if (opts.academicYearId) {
    params.push(opts.academicYearId);
    where.push(`n.academic_year_id = $${params.length}`);
  }

  const scopedInstitutionIds = (opts as any).institutionIds as
    number[] | undefined;
  if (scopedInstitutionIds) {
    if (scopedInstitutionIds.length === 0) {
      where.push("FALSE");
    } else {
      params.push(scopedInstitutionIds);
      where.push(`n.institution_id = ANY($${params.length}::int[])`);
    }
  }

  if (search) {
    params.push(`%${search}%`);
    where.push(
      `(n.title ILIKE $${params.length} OR n.slug ILIKE $${params.length})`,
    );
  }

  if (opts.createdBy) {
    params.push(opts.createdBy);
    where.push(`n.created_by = $${params.length}`);
  }

  if (opts.excludeCreatedBy) {
    params.push(opts.excludeCreatedBy);
    where.push(`COALESCE(n.created_by, 0) <> $${params.length}`);
  }

  if (opts.recipient) {
    const roleCodes = opts.recipient.roleCodes ?? [];
    const studentIds = opts.recipient.studentIds ?? [];
    const programIds = opts.recipient.programIds ?? [];
    const sectionIds = opts.recipient.sectionIds ?? [];
    const userId = opts.recipient.userId ?? null;
    params.push(roleCodes);
    const roleParam = params.length;
    params.push(studentIds);
    const studentParam = params.length;
    params.push(programIds);
    const programParam = params.length;
    params.push(sectionIds);
    const sectionParam = params.length;
    params.push(userId);
    const userParam = params.length;

    where.push(`(
      n.target_type = 'WHOLE_INSTITUTION'
      OR (
        n.target_type = 'ROLE'
        AND n.target_role_code = ANY($${roleParam}::text[])
      )
      OR (
        n.target_type = 'PROGRAM'
        AND n.target_id = ANY($${programParam}::int[])
      )
      OR (
        n.target_type = 'SECTION'
        AND n.target_program_id = ANY($${programParam}::int[])
        AND n.target_id = ANY($${sectionParam}::int[])
      )
      OR (
        n.target_type = 'USER'
        AND (
          (
            n.target_role_code = 'teacher'
            AND $${userParam}::int IS NOT NULL
            AND n.target_id = $${userParam}::int
          )
          OR (
            n.target_role_code = 'student'
            AND n.target_id = ANY($${studentParam}::int[])
          )
        )
      )
    )`);
  }

  const whereClause = `WHERE ${where.join(" AND ")}`;

  const [dataRes, countRes] = await Promise.all([
    db.query(
      `SELECT n.*, prof.name AS institution_name, creator.full_name AS created_by_name, creator_role.code AS created_by_role
         FROM institution_news n
         INNER JOIN institution_profiles prof ON prof.id = n.institution_id
         LEFT JOIN users creator ON creator.id = n.created_by
         LEFT JOIN LATERAL (
           SELECT role.code
           FROM institution_memberships membership
           INNER JOIN roles role ON role.id = membership.role_id
           WHERE membership.user_id = n.created_by
             AND membership.institution_id = n.institution_id
             AND membership.is_active = TRUE
             AND COALESCE(membership.is_deleted, FALSE) = FALSE
           ORDER BY CASE WHEN role.code = 'institution_admin' THEN 0 WHEN role.code = 'teacher' THEN 1 ELSE 2 END, membership.id DESC
           LIMIT 1
         ) creator_role ON TRUE
         ${whereClause}
         ORDER BY n.published_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    ),
    db.query(
      `SELECT COUNT(*)::int AS count FROM institution_news n INNER JOIN institution_profiles prof ON prof.id = n.institution_id ${whereClause}`,
      params,
    ),
  ]);

  return {
    data: dataRes.rows as any[],
    total: countRes.rows[0].count as number,
  };
}

export async function createInstitutionNews(db: Pool, data: CreateNewsData) {
  await ensureInstitutionNewsSessionSchema(db);
  const baseSlug = slugify(data.slug || data.title) || `alert-${Date.now()}`;
  let uniqueSlug = baseSlug;
  let suffix = 2;
  while (
    (
      await db.query(
        `SELECT 1 FROM institution_news WHERE institution_id = $1 AND slug = $2 LIMIT 1`,
        [data.institutionId, uniqueSlug],
      )
    ).rowCount
  ) {
    uniqueSlug = `${baseSlug}-${suffix++}`;
  }

  const res = await db.query(
    `INSERT INTO institution_news (
      institution_id, academic_year_id, slug, title, content, image_urls, published_at, is_active, is_deleted, created_by, updated_by,
      target_type, target_role_code, target_id, target_program_id, target_label
    ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,COALESCE($7::timestamp, NOW()),$8,FALSE,$9,$9,$10,$11,$12,$13,$14) RETURNING *`,
    [
      data.institutionId,
      data.academicYearId ?? null,
      uniqueSlug,
      data.title,
      data.content ?? null,
      JSON.stringify(data.imageUrls ?? []),
      data.publishedAt ?? null,
      data.isActive ?? true,
      data.createdBy ?? null,
      data.targetType ?? "WHOLE_INSTITUTION",
      data.targetRoleCode ?? null,
      data.targetId ?? null,
      data.targetProgramId ?? null,
      data.targetLabel ?? null,
    ],
  );
  return res.rows[0] as InstitutionNews;
}

export async function getInstitutionNewsById(db: Pool, id: number) {
  await ensureInstitutionNewsSessionSchema(db);
  const res = await db.query(
    `SELECT n.*, prof.name AS institution_name, creator.full_name AS created_by_name, creator_role.code AS created_by_role
           FROM institution_news n
           INNER JOIN institution_profiles prof
              ON prof.id = n.institution_id
             AND COALESCE(prof.is_deleted, FALSE) = FALSE
             AND prof.is_active = TRUE
           LEFT JOIN users creator ON creator.id = n.created_by
           LEFT JOIN LATERAL (
             SELECT role.code
             FROM institution_memberships membership
             INNER JOIN roles role ON role.id = membership.role_id
             WHERE membership.user_id = n.created_by
               AND membership.institution_id = n.institution_id
               AND membership.is_active = TRUE
               AND COALESCE(membership.is_deleted, FALSE) = FALSE
             ORDER BY CASE WHEN role.code = 'institution_admin' THEN 0 WHEN role.code = 'teacher' THEN 1 ELSE 2 END, membership.id DESC
             LIMIT 1
           ) creator_role ON TRUE
          WHERE n.id = $1
            AND COALESCE(n.is_deleted, FALSE) = FALSE`,
    [id],
  );
  return res.rows[0] || null;
}

export async function updateInstitutionNews(db: Pool, input: UpdateNewsData) {
  await ensureInstitutionNewsSessionSchema(db);
  const fields: string[] = [];
  const params: any[] = [];

  if (input.institutionId !== undefined) {
    params.push(input.institutionId);
    fields.push(`institution_id = $${params.length}`);
  }
  if (input.academicYearId !== undefined) {
    params.push(input.academicYearId);
    fields.push(`academic_year_id = $${params.length}`);
  }
  if (input.slug !== undefined) {
    params.push(input.slug);
    fields.push(`slug = $${params.length}`);
  }
  if (input.title !== undefined) {
    params.push(input.title);
    fields.push(`title = $${params.length}`);
  }
  if (input.content !== undefined) {
    params.push(input.content);
    fields.push(`content = $${params.length}`);
  }
  if (input.imageUrls !== undefined) {
    params.push(JSON.stringify(input.imageUrls ?? []));
    fields.push(`image_urls = $${params.length}::jsonb`);
  }
  if (input.publishedAt !== undefined) {
    params.push(input.publishedAt);
    fields.push(`published_at = $${params.length}`);
  }
  if (input.isActive !== undefined) {
    params.push(input.isActive);
    fields.push(`is_active = $${params.length}`);
  }
  if (input.updatedBy !== undefined) {
    params.push(input.updatedBy);
    fields.push(`updated_by = $${params.length}`);
  }
  if (input.targetType !== undefined) {
    params.push(input.targetType);
    fields.push(`target_type = $${params.length}`);
  }
  if (input.targetRoleCode !== undefined) {
    params.push(input.targetRoleCode);
    fields.push(`target_role_code = $${params.length}`);
  }
  if (input.targetId !== undefined) {
    params.push(input.targetId);
    fields.push(`target_id = $${params.length}`);
  }
  if (input.targetProgramId !== undefined) {
    params.push(input.targetProgramId);
    fields.push(`target_program_id = $${params.length}`);
  }
  if (input.targetLabel !== undefined) {
    params.push(input.targetLabel);
    fields.push(`target_label = $${params.length}`);
  }

  if (!fields.length) return getInstitutionNewsById(db, input.id);

  params.push(input.id);
  const res = await db.query(
    `UPDATE institution_news SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
    params,
  );
  return res.rows[0];
}

export async function deleteInstitutionNews(db: Pool, id: number) {
  await db.query(
    `UPDATE institution_news SET is_deleted = TRUE, deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND COALESCE(is_deleted, FALSE) = FALSE`,
    [id],
  );
}
