import { Pool } from "pg";
import {
  University,
  ListUniversitiesOptions,
  CreateUniversityData,
  UpdateUniversityData,
} from "@/lib/types/university";

function toSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function ensureUniversitiesSchemaAndSeed(db: Pool) {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS universities (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL UNIQUE,
        code VARCHAR(100),
        university_type VARCHAR(100) DEFAULT 'central',
        country VARCHAR(100) DEFAULT 'India',
        state VARCHAR(100),
        city VARCHAR(100),
        website_url VARCHAR(500),
        logo_url VARCHAR(500),
        established_year INT,
        accreditation VARCHAR(255),
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
        deleted_at TIMESTAMPTZ,
        deleted_by INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      ALTER TABLE universities ADD COLUMN IF NOT EXISTS code VARCHAR(100);
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS university_type VARCHAR(100) DEFAULT 'central';
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'India';
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS state VARCHAR(100);
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS city VARCHAR(100);
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS website_url VARCHAR(500);
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS established_year INT;
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS accreditation VARCHAR(255);
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS description TEXT;
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
      ALTER TABLE universities ADD COLUMN IF NOT EXISTS deleted_by INT;

      CREATE INDEX IF NOT EXISTS idx_universities_name ON universities (name);
      CREATE INDEX IF NOT EXISTS idx_universities_slug ON universities (slug);
      CREATE INDEX IF NOT EXISTS idx_universities_type ON universities (university_type);
      CREATE INDEX IF NOT EXISTS idx_universities_active ON universities (is_active, is_deleted);
    `);

    // Seed top universities if table is empty
    const countRes = await db.query(
      `SELECT COUNT(*)::int AS count FROM universities WHERE is_deleted = FALSE`
    );
    if ((countRes.rows[0]?.count ?? 0) < 5) {
      const defaultUniversities = [
        {
          name: "University of Delhi (DU)",
          slug: "university-of-delhi",
          code: "DU",
          university_type: "central",
          country: "India",
          state: "Delhi",
          city: "New Delhi",
          website_url: "http://www.du.ac.in",
          established_year: 1922,
          accreditation: "NAAC A++ | UGC Approved | NIRF Top 15",
          description: "Premier collegiate research university located in New Delhi, known for its distinguished academic departments, faculties, and affiliated colleges.",
        },
        {
          name: "Indian Institute of Technology Bombay (IIT Bombay)",
          slug: "iit-bombay",
          code: "IITB",
          university_type: "institute_of_national_importance",
          country: "India",
          state: "Maharashtra",
          city: "Mumbai",
          website_url: "https://www.iitb.ac.in",
          established_year: 1958,
          accreditation: "Institute of National Importance | NIRF Top 3",
          description: "Globally recognized institute for engineering education and research, pioneering cutting-edge science and technology innovation.",
        },
        {
          name: "Indian Institute of Technology Delhi (IIT Delhi)",
          slug: "iit-delhi",
          code: "IITD",
          university_type: "institute_of_national_importance",
          country: "India",
          state: "Delhi",
          city: "New Delhi",
          website_url: "https://home.iitd.ac.in",
          established_year: 1961,
          accreditation: "Institute of National Importance | NIRF Top 2",
          description: "One of the most prestigious public engineering institutes in India offering world-class bachelor's, master's, and doctoral programs.",
        },
        {
          name: "Jawaharlal Nehru University (JNU)",
          slug: "jawaharlal-nehru-university",
          code: "JNU",
          university_type: "central",
          country: "India",
          state: "Delhi",
          city: "New Delhi",
          website_url: "https://www.jnu.ac.in",
          established_year: 1969,
          accreditation: "NAAC A++ | UGC Approved | NIRF Top 2 University",
          description: "Renowned public central research university known for cutting-edge social sciences, international studies, linguistics, and sciences.",
        },
        {
          name: "Banaras Hindu University (BHU)",
          slug: "banaras-hindu-university",
          code: "BHU",
          university_type: "central",
          country: "India",
          state: "Uttar Pradesh",
          city: "Varanasi",
          website_url: "https://www.bhu.ac.in",
          established_year: 1916,
          accreditation: "NAAC A | UGC Approved | NIRF Top 10",
          description: "Historic central university founded by Pandit Madan Mohan Malaviya, offering extensive humanities, engineering, and medical faculties.",
        },
        {
          name: "Anna University",
          slug: "anna-university",
          code: "AU",
          university_type: "state",
          country: "India",
          state: "Tamil Nadu",
          city: "Chennai",
          website_url: "https://www.annauniv.edu",
          established_year: 1978,
          accreditation: "NAAC A++ | UGC Approved | State Technical University",
          description: "Public state university located in Tamil Nadu, specialized in higher engineering, technology, and applied sciences.",
        },
        {
          name: "University of Mumbai",
          slug: "university-of-mumbai",
          code: "MU",
          university_type: "state",
          country: "India",
          state: "Maharashtra",
          city: "Mumbai",
          website_url: "https://mu.ac.in",
          established_year: 1857,
          accreditation: "NAAC A++ | UGC Approved",
          description: "One of the earliest state universities in India, offering collegiate programs across arts, commerce, science, and law.",
        },
        {
          name: "Visvesvaraya Technological University (VTU)",
          slug: "vtu-belagavi",
          code: "VTU",
          university_type: "state",
          country: "India",
          state: "Karnataka",
          city: "Belagavi",
          website_url: "https://vtu.ac.in",
          established_year: 1998,
          accreditation: "NAAC A | State Technical University",
          description: "Collegiate public state university in Karnataka, affiliating over 200 technical colleges with structured engineering curricula.",
        },
        {
          name: "BITS Pilani",
          slug: "bits-pilani",
          code: "BITS",
          university_type: "deemed",
          country: "India",
          state: "Rajasthan",
          city: "Pilani",
          website_url: "https://www.bits-pilani.ac.in",
          established_year: 1964,
          accreditation: "Institute of Eminence | NAAC A | Deemed University",
          description: "Top-tier private deemed university focusing on higher education and research in engineering, sciences, and management.",
        },
        {
          name: "University of Oxford",
          slug: "university-of-oxford",
          code: "OXON",
          university_type: "international",
          country: "United Kingdom",
          state: "Oxfordshire",
          city: "Oxford",
          website_url: "https://www.ox.ac.uk",
          established_year: 1096,
          accreditation: "World University Ranking #1 | Royal Charter",
          description: "Oldest university in the English-speaking world, world-renowned for academic rigor, tutorial systems, and transformative research.",
        },
        {
          name: "Harvard University",
          slug: "harvard-university",
          code: "HARVARD",
          university_type: "international",
          country: "United States",
          state: "Massachusetts",
          city: "Cambridge",
          website_url: "https://www.harvard.edu",
          established_year: 1636,
          accreditation: "Ivy League | NECHE Accredited",
          description: "Historic private Ivy League research university with worldwide global leadership across arts, law, business, and medicine.",
        },
      ];

      for (const u of defaultUniversities) {
        const check = await db.query(
          `SELECT id FROM universities WHERE slug = $1`,
          [u.slug]
        );
        if (check.rows.length === 0) {
          await db.query(
            `
            INSERT INTO universities (
              name,
              slug,
              code,
              university_type,
              country,
              state,
              city,
              website_url,
              established_year,
              accreditation,
              description,
              is_active
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
            `,
            [
              u.name,
              u.slug,
              u.code,
              u.university_type,
              u.country,
              u.state,
              u.city,
              u.website_url,
              u.established_year,
              u.accreditation,
              u.description,
            ]
          );
        }
      }
    }
  } catch (err) {
    console.error("Error in ensureUniversitiesSchemaAndSeed:", err);
  }
}

export async function listUniversities(
  db: Pool,
  opts: ListUniversitiesOptions = {}
) {
  await ensureUniversitiesSchemaAndSeed(db);

  const search = opts.search?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;

  const conditions: string[] = ["is_deleted = FALSE"];
  const params: any[] = [];

  if (opts.type) {
    params.push(opts.type);
    conditions.push(`university_type = $${params.length}`);
  }

  if (opts.country) {
    params.push(opts.country);
    conditions.push(`country = $${params.length}`);
  }

  if (opts.state) {
    params.push(opts.state);
    conditions.push(`state = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(name ILIKE $${params.length} OR slug ILIKE $${params.length} OR code ILIKE $${params.length} OR city ILIKE $${params.length} OR state ILIKE $${params.length})`
    );
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `
        SELECT
          id,
          name,
          slug,
          code,
          university_type,
          country,
          state,
          city,
          website_url,
          logo_url,
          established_year,
          accreditation,
          description,
          is_active,
          is_deleted,
          created_at,
          updated_at
        FROM universities
        ${whereClause}
        ORDER BY name ASC
        LIMIT $${params.length + 1} OFFSET $${params.length + 2}
      `,
      [...params, limit, offset]
    ),
    db.query(
      `
        SELECT COUNT(*)::int AS count
        FROM universities
        ${whereClause}
      `,
      params
    ),
  ]);

  return {
    data: dataResult.rows as University[],
    total: countResult.rows[0]?.count ?? 0,
  };
}

export async function getUniversityById(
  db: Pool,
  id: number
): Promise<University | null> {
  await ensureUniversitiesSchemaAndSeed(db);

  const res = await db.query(
    `
      SELECT
        id,
        name,
        slug,
        code,
        university_type,
        country,
        state,
        city,
        website_url,
        logo_url,
        established_year,
        accreditation,
        description,
        is_active,
        is_deleted,
        created_at,
        updated_at
      FROM universities
      WHERE id = $1 AND is_deleted = FALSE
    `,
    [id]
  );

  return res.rows[0] || null;
}

export async function createUniversity(
  db: Pool,
  data: CreateUniversityData
): Promise<University> {
  await ensureUniversitiesSchemaAndSeed(db);

  const cleanName = data.name.trim();
  const effectiveSlug = (data.slug?.trim() || toSlug(cleanName));

  const existing = await db.query(
    `SELECT id, name FROM universities WHERE (LOWER(TRIM(name)) = LOWER(TRIM($1)) OR slug = $2) AND is_deleted = FALSE LIMIT 1`,
    [cleanName, effectiveSlug]
  );

  if (existing.rows.length > 0) {
    const error: any = new Error(`A university named "${cleanName}" or with slug "${effectiveSlug}" already exists`);
    error.code = "23505";
    throw error;
  }

  const res = await db.query(
    `
      INSERT INTO universities (
        name,
        slug,
        code,
        university_type,
        country,
        state,
        city,
        website_url,
        logo_url,
        established_year,
        accreditation,
        description,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING
        id,
        name,
        slug,
        code,
        university_type,
        country,
        state,
        city,
        website_url,
        logo_url,
        established_year,
        accreditation,
        description,
        is_active,
        is_deleted,
        created_at,
        updated_at
    `,
    [
      cleanName,
      effectiveSlug,
      data.code?.trim() || null,
      data.university_type || "central",
      data.country?.trim() || "India",
      data.state?.trim() || null,
      data.city?.trim() || null,
      data.website_url?.trim() || null,
      data.logo_url?.trim() || null,
      data.established_year ? Number(data.established_year) : null,
      data.accreditation?.trim() || null,
      data.description?.trim() || null,
      data.is_active !== undefined ? data.is_active : true,
    ]
  );

  return res.rows[0];
}

export async function updateUniversity(
  db: Pool,
  id: number,
  data: UpdateUniversityData
): Promise<University | null> {
  await ensureUniversitiesSchemaAndSeed(db);

  if (data.name) {
    const cleanName = data.name.trim();
    const existing = await db.query(
      `SELECT id FROM universities WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) AND id != $2 AND is_deleted = FALSE LIMIT 1`,
      [cleanName, id]
    );

    if (existing.rows.length > 0) {
      const error: any = new Error(`A university named "${cleanName}" already exists`);
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
  if (data.university_type !== undefined) {
    values.push(data.university_type);
    fields.push(`university_type = $${values.length}`);
  }
  if (data.country !== undefined) {
    values.push(data.country?.trim() || "India");
    fields.push(`country = $${values.length}`);
  }
  if (data.state !== undefined) {
    values.push(data.state?.trim() || null);
    fields.push(`state = $${values.length}`);
  }
  if (data.city !== undefined) {
    values.push(data.city?.trim() || null);
    fields.push(`city = $${values.length}`);
  }
  if (data.website_url !== undefined) {
    values.push(data.website_url?.trim() || null);
    fields.push(`website_url = $${values.length}`);
  }
  if (data.logo_url !== undefined) {
    values.push(data.logo_url?.trim() || null);
    fields.push(`logo_url = $${values.length}`);
  }
  if (data.established_year !== undefined) {
    values.push(data.established_year ? Number(data.established_year) : null);
    fields.push(`established_year = $${values.length}`);
  }
  if (data.accreditation !== undefined) {
    values.push(data.accreditation?.trim() || null);
    fields.push(`accreditation = $${values.length}`);
  }
  if (data.description !== undefined) {
    values.push(data.description?.trim() || null);
    fields.push(`description = $${values.length}`);
  }
  if (data.is_active !== undefined) {
    values.push(data.is_active);
    fields.push(`is_active = $${values.length}`);
  }

  values.push(id);
  const idPlaceholder = `$${values.length}`;

  const query = `
    UPDATE universities
    SET ${fields.join(", ")}
    WHERE id = ${idPlaceholder} AND is_deleted = FALSE
    RETURNING
      id,
      name,
      slug,
      code,
      university_type,
      country,
      state,
      city,
      website_url,
      logo_url,
      established_year,
      accreditation,
      description,
      is_active,
      is_deleted,
      created_at,
      updated_at
  `;

  const res = await db.query(query, values);
  return res.rows[0] || null;
}

export async function softDeleteUniversity(
  db: Pool,
  id: number,
  deletedBy?: number | null
) {
  const res = await db.query(
    `
    UPDATE universities
    SET
      is_deleted = TRUE,
      deleted_at = NOW(),
      deleted_by = $2,
      updated_at = NOW()
    WHERE id = $1
    RETURNING id
    `,
    [id, deletedBy ?? null]
  );

  return res.rows[0] || null;
}

export async function toggleUniversityActive(
  db: Pool,
  id: number,
  isActive: boolean
) {
  const res = await db.query(
    `
    UPDATE universities
    SET
      is_active = $1,
      updated_at = NOW()
    WHERE id = $2 AND is_deleted = FALSE
    RETURNING id
    `,
    [isActive, id]
  );

  return res.rows[0] || null;
}
