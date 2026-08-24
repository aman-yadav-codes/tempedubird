import { Pool } from "pg";
import {
  CertificationProvider,
  ListCertificationProvidersOptions,
  CreateCertificationProviderData,
  UpdateCertificationProviderData,
} from "@/lib/types/certification-provider";

export async function ensureCertificationProvidersTable(db: Pool) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS certification_providers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      provider_type VARCHAR(100) NOT NULL DEFAULT 'certification',
      code VARCHAR(100),
      website_url VARCHAR(500),
      logo_url VARCHAR(500),
      description TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
      deleted_at TIMESTAMPTZ,
      deleted_by INT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_cert_providers_name ON certification_providers (name);
    CREATE INDEX IF NOT EXISTS idx_cert_providers_type ON certification_providers (provider_type);
    CREATE INDEX IF NOT EXISTS idx_cert_providers_active ON certification_providers (is_active, is_deleted);
  `);

  // Seed 22 Top India-based Certification & Affiliation Providers if not exists
  const seedProviders = [
    {
      name: "University Grants Commission (UGC)",
      slug: "ugc-india",
      code: "UGC-RECOG",
      website_url: "https://www.ugc.ac.in",
      logo_url: "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/University_Grants_Commission_India_logo.png/220px-University_Grants_Commission_India_logo.png",
      provider_type: "affiliation",
      description: "Apex statutory body responsible for coordination, determination, and maintenance of higher education standards in India.",
    },
    {
      name: "All India Council for Technical Education (AICTE)",
      slug: "aicte-india",
      code: "AICTE-APPR",
      website_url: "https://www.aicte-india.org",
      logo_url: "https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/All_India_Council_for_Technical_Education_logo.png/220px-All_India_Council_for_Technical_Education_logo.png",
      provider_type: "affiliation",
      description: "National-level council for technical education under the Department of Higher Education, Ministry of Education, India.",
    },
    {
      name: "National Assessment and Accreditation Council (NAAC)",
      slug: "naac-india",
      code: "NAAC-ACCR",
      website_url: "http://www.naac.gov.in",
      logo_url: "https://upload.wikimedia.org/wikipedia/en/thumb/4/4e/NAAC_Logo.png/220px-NAAC_Logo.png",
      provider_type: "accreditation",
      description: "Autonomous institution of UGC assessing and accrediting higher educational institutions across India.",
    },
    {
      name: "National Board of Accreditation (NBA)",
      slug: "nba-india",
      code: "NBA-TIER-1",
      website_url: "https://www.nbaind.org",
      logo_url: "https://www.nbaind.org/assets/images/nba-logo.png",
      provider_type: "accreditation",
      description: "Autonomous accreditation authority for technical programs including engineering, technology, management, and pharmacy.",
    },
    {
      name: "NASSCOM FutureSkills Prime",
      slug: "nasscom-futureskills",
      code: "NASSCOM-FSP",
      website_url: "https://futureskillsprime.in",
      logo_url: "https://futureskillsprime.in/sites/all/themes/fsp/images/header-logo.svg",
      provider_type: "certification",
      description: "National digital skilling platform by MeitY and NASSCOM for deep-tech industry certifications.",
    },
    {
      name: "National Skill Development Corporation (NSDC)",
      slug: "nsdc-india",
      code: "NSDC-SKILL",
      website_url: "https://nsdcindia.org",
      logo_url: "https://nsdcindia.org/sites/default/files/nsdc-logo.png",
      provider_type: "certification",
      description: "Public-private partnership promoting skill development and vocational credentialing in India.",
    },
    {
      name: "NPTEL (IITs & IISc)",
      slug: "nptel-iit",
      code: "NPTEL-MHRD",
      website_url: "https://nptel.ac.in",
      logo_url: "https://nptel.ac.in/assets/images/nptel-logo.png",
      provider_type: "certification",
      description: "Joint initiative of the IITs and IISc offering online certification courses funded by the Ministry of Education.",
    },
    {
      name: "SWAYAM - Ministry of Education",
      slug: "swayam-moe",
      code: "SWAYAM-IND",
      website_url: "https://swayam.gov.in",
      logo_url: "https://swayam.gov.in/assets/images/swayam_logo.png",
      provider_type: "certification",
      description: "Government of India initiative offering credit transfer certifications from school to post-graduate level.",
    },
    {
      name: "Bar Council of India (BCI)",
      slug: "bar-council-of-india",
      code: "BCI-LEGAL",
      website_url: "https://www.barcouncilofindia.org",
      logo_url: "",
      provider_type: "affiliation",
      description: "Statutory body that regulates legal practice and legal education curriculum across India.",
    },
    {
      name: "Pharmacy Council of India (PCI)",
      slug: "pharmacy-council-of-india",
      code: "PCI-PHARMA",
      website_url: "https://www.pci.nic.in",
      logo_url: "",
      provider_type: "affiliation",
      description: "Statutory body governing the regulation of pharmacy education and profession in India.",
    },
    {
      name: "Dental Council of India (DCI)",
      slug: "dental-council-of-india",
      code: "DCI-DENTAL",
      website_url: "https://dciindia.gov.in",
      logo_url: "",
      provider_type: "affiliation",
      description: "Statutory regulatory body for dental education and dental profession in India.",
    },
    {
      name: "Indian Nursing Council (INC)",
      slug: "indian-nursing-council",
      code: "INC-NURSING",
      website_url: "https://www.indiannursingcouncil.org",
      logo_url: "",
      provider_type: "affiliation",
      description: "National regulatory body for nurses and nurse education throughout India.",
    },
    {
      name: "National Council for Teacher Education (NCTE)",
      slug: "ncte-india",
      code: "NCTE-EDU",
      website_url: "https://ncte.gov.in",
      logo_url: "",
      provider_type: "affiliation",
      description: "Statutory body overseeing standards, procedures, and quality of teacher education in India.",
    },
    {
      name: "Council of Architecture (COA)",
      slug: "council-of-architecture",
      code: "COA-ARCH",
      website_url: "https://www.coa.gov.in",
      logo_url: "",
      provider_type: "affiliation",
      description: "Statutory authority regulating education and practice of architecture throughout India under Architects Act.",
    },
    {
      name: "Indian Council of Agricultural Research (ICAR)",
      slug: "icar-india",
      code: "ICAR-AGRI",
      website_url: "https://icar.org.in",
      logo_url: "",
      provider_type: "accreditation",
      description: "Autonomous organization coordinating and accrediting agricultural education and research across India.",
    },
    {
      name: "Central Board of Secondary Education (CBSE)",
      slug: "cbse-india",
      code: "CBSE-AFF",
      website_url: "https://www.cbse.gov.in",
      logo_url: "https://www.cbse.gov.in/images/logo.png",
      provider_type: "affiliation",
      description: "National level board of education for public and private schools under the Union Government of India.",
    },
    {
      name: "Council for the Indian School Certificate Examinations (CISCE)",
      slug: "cisce-india",
      code: "CISCE-ICSE",
      website_url: "https://cisce.org",
      logo_url: "",
      provider_type: "affiliation",
      description: "National level private board of school education conducting ICSE and ISC examinations.",
    },
    {
      name: "National Institute of Open Schooling (NIOS)",
      slug: "nios-india",
      code: "NIOS-OBE",
      website_url: "https://www.nios.ac.in",
      logo_url: "",
      provider_type: "affiliation",
      description: "National open school board providing flexible distance education and skill certifications.",
    },
    {
      name: "Centre for Development of Advanced Computing (C-DAC)",
      slug: "cdac-india",
      code: "CDAC-ACTS",
      website_url: "https://www.cdac.in",
      logo_url: "https://www.cdac.in/index.aspx?id=img_cdac_logo",
      provider_type: "certification",
      description: "Premier R&D organization of MeitY delivering high-end IT and computing professional diplomas & certifications.",
    },
    {
      name: "National Institute of Electronics & Information Technology (NIELIT)",
      slug: "nielit-india",
      code: "NIELIT-O-A-B",
      website_url: "https://www.nielit.gov.in",
      logo_url: "",
      provider_type: "certification",
      description: "Autonomous scientific society of MeitY conducting formal & non-formal IT examination certifications.",
    },
    {
      name: "Indira Gandhi National Open University (IGNOU)",
      slug: "ignou-india",
      code: "IGNOU-DEC",
      website_url: "https://www.ignou.ac.in",
      logo_url: "",
      provider_type: "affiliation",
      description: "Central open university pioneering distance degrees, diplomas, and vocational certifications in India.",
    },
    {
      name: "IIT Bombay Spoken Tutorial Project",
      slug: "iitb-spoken-tutorial",
      code: "IITB-ST",
      website_url: "https://spoken-tutorial.org",
      logo_url: "https://spoken-tutorial.org/static/images/spoken-tutorial-logo.png",
      provider_type: "certification",
      description: "NMEICT initiative by IIT Bombay offering open-source software training and certificate tests across colleges.",
    },
  ];

  for (const p of seedProviders) {
    await db.query(
      `
      INSERT INTO certification_providers (
        name, slug, provider_type, code, website_url, logo_url, description, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      ON CONFLICT (slug) DO UPDATE
      SET
        code = EXCLUDED.code,
        website_url = COALESCE(EXCLUDED.website_url, certification_providers.website_url),
        logo_url = COALESCE(NULLIF(EXCLUDED.logo_url, ''), certification_providers.logo_url),
        description = EXCLUDED.description,
        is_deleted = FALSE;
      `,
      [p.name, p.slug, p.provider_type, p.code, p.website_url, p.logo_url, p.description]
    );
  }
}

export async function listCertificationProviders(
  db: Pool,
  opts: ListCertificationProvidersOptions = {}
) {
  await ensureCertificationProvidersTable(db);

  const search = opts.search?.trim() || "";
  const providerType = opts.provider_type?.trim() || "";
  const limit = opts.limit ?? 10;
  const offset = opts.offset ?? 0;

  const conditions: string[] = ["is_deleted = FALSE"];
  const params: any[] = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(
      `(name ILIKE $${params.length} OR slug ILIKE $${params.length} OR code ILIKE $${params.length} OR description ILIKE $${params.length})`
    );
  }

  if (providerType && providerType !== "all") {
    params.push(providerType);
    conditions.push(`provider_type = $${params.length}`);
  }

  if (typeof opts.is_active === "boolean") {
    params.push(opts.is_active);
    conditions.push(`is_active = $${params.length}`);
  }

  const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countQuery = `
    SELECT COUNT(*)::int AS count
    FROM certification_providers
    ${whereSql}
  `;

  const dataParams = [...params];
  dataParams.push(limit);
  const limitPlaceholder = `$${dataParams.length}`;
  dataParams.push(offset);
  const offsetPlaceholder = `$${dataParams.length}`;

  const dataQuery = `
    SELECT
      id,
      name,
      slug,
      provider_type,
      code,
      website_url,
      logo_url,
      description,
      is_active,
      is_deleted,
      created_at,
      updated_at
    FROM certification_providers
    ${whereSql}
    ORDER BY name ASC
    LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}
  `;

  const [countResult, dataResult] = await Promise.all([
    db.query(countQuery, params),
    db.query(dataQuery, dataParams),
  ]);

  return {
    data: dataResult.rows as CertificationProvider[],
    total: countResult.rows[0]?.count ?? 0,
  };
}

export async function getCertificationProviderById(
  db: Pool,
  id: number
): Promise<CertificationProvider | null> {
  await ensureCertificationProvidersTable(db);

  const res = await db.query(
    `
      SELECT
        id,
        name,
        slug,
        provider_type,
        code,
        website_url,
        logo_url,
        description,
        is_active,
        is_deleted,
        created_at,
        updated_at
      FROM certification_providers
      WHERE id = $1 AND is_deleted = FALSE
    `,
    [id]
  );

  return res.rows[0] || null;
}

export async function createCertificationProvider(
  db: Pool,
  data: CreateCertificationProviderData
): Promise<CertificationProvider> {
  await ensureCertificationProvidersTable(db);

  const res = await db.query(
    `
      INSERT INTO certification_providers (
        name,
        slug,
        provider_type,
        code,
        website_url,
        logo_url,
        description,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING
        id,
        name,
        slug,
        provider_type,
        code,
        website_url,
        logo_url,
        description,
        is_active,
        is_deleted,
        created_at,
        updated_at
    `,
    [
      data.name.trim(),
      data.slug.trim(),
      data.provider_type || "certification",
      data.code?.trim() || null,
      data.website_url?.trim() || null,
      data.logo_url?.trim() || null,
      data.description?.trim() || null,
      data.is_active !== undefined ? data.is_active : true,
    ]
  );

  return res.rows[0];
}

export async function updateCertificationProvider(
  db: Pool,
  id: number,
  data: UpdateCertificationProviderData
): Promise<CertificationProvider | null> {
  await ensureCertificationProvidersTable(db);

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
  if (data.provider_type !== undefined) {
    values.push(data.provider_type);
    fields.push(`provider_type = $${values.length}`);
  }
  if (data.code !== undefined) {
    values.push(data.code?.trim() || null);
    fields.push(`code = $${values.length}`);
  }
  if (data.website_url !== undefined) {
    values.push(data.website_url?.trim() || null);
    fields.push(`website_url = $${values.length}`);
  }
  if (data.logo_url !== undefined) {
    values.push(data.logo_url?.trim() || null);
    fields.push(`logo_url = $${values.length}`);
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
    UPDATE certification_providers
    SET ${fields.join(", ")}
    WHERE id = ${idPlaceholder} AND is_deleted = FALSE
    RETURNING
      id,
      name,
      slug,
      provider_type,
      code,
      website_url,
      logo_url,
      description,
      is_active,
      is_deleted,
      created_at,
      updated_at
  `;

  const res = await db.query(query, values);
  return res.rows[0] || null;
}

export async function toggleCertificationProviderActive(
  db: Pool,
  id: number,
  isActive: boolean
) {
  await ensureCertificationProvidersTable(db);
  await db.query(
    `
      UPDATE certification_providers
      SET is_active = $1, updated_at = NOW()
      WHERE id = $2 AND is_deleted = FALSE
    `,
    [isActive, id]
  );
}

export async function softDeleteCertificationProvider(
  db: Pool,
  id: number,
  deletedBy?: number | null
) {
  await ensureCertificationProvidersTable(db);
  await db.query(
    `
      UPDATE certification_providers
      SET is_deleted = TRUE,
          deleted_at = NOW(),
          deleted_by = $2,
          updated_at = NOW()
      WHERE id = $1
    `,
    [id, deletedBy ?? null]
  );
}
