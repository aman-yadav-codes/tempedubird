import type { Pool, PoolClient } from "pg";

type Queryable = Pick<Pool, "query"> | Pick<PoolClient, "query">;

export type InstitutionSessionInput = {
  templateId: number;
  startDate?: string | null;
  endDate?: string | null;
};

let academicSessionSchemaReady: Promise<void> | null = null;

export function ensureAcademicSessionSchema(db: Queryable) {
  if (!academicSessionSchemaReady) {
    academicSessionSchemaReady = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS academic_session_templates (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50) NOT NULL UNIQUE,
          start_date DATE NOT NULL,
          end_date DATE NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_by INTEGER,
          updated_by INTEGER,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT chk_academic_session_template_dates CHECK (end_date >= start_date)
        )
      `);
      await db.query(`ALTER TABLE academic_years ADD COLUMN IF NOT EXISTS session_template_id INTEGER`);
      await db.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_academic_year_session_template') THEN
            ALTER TABLE academic_years
            ADD CONSTRAINT fk_academic_year_session_template
            FOREIGN KEY (session_template_id)
            REFERENCES academic_session_templates(id)
            ON DELETE RESTRICT;
          END IF;

          IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_institution_current_academic_year') THEN
            ALTER TABLE institution_profiles
            DROP CONSTRAINT fk_institution_current_academic_year;
          END IF;
        END $$;
      `);
      await db.query(`ALTER TABLE institution_profiles DROP COLUMN IF EXISTS current_academic_year_id`);
      await db.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_year_session_template
        ON academic_years (institution_id, session_template_id)
        WHERE session_template_id IS NOT NULL
      `);
      await db.query(`
        INSERT INTO academic_session_templates (
          name, start_date, end_date, is_active, created_by, updated_by
        )
        SELECT DISTINCT ON (ay.name)
          ay.name,
          ay.start_date,
          ay.end_date,
          ay.is_active,
          ay.created_by,
          ay.updated_by
        FROM academic_years ay
        WHERE ay.name IS NOT NULL
          AND ay.start_date IS NOT NULL
          AND ay.end_date IS NOT NULL
        ORDER BY ay.name, ay.updated_at DESC NULLS LAST, ay.id DESC
        ON CONFLICT (name) DO NOTHING
      `);
      await db.query(`
        UPDATE academic_years ay
        SET session_template_id = ast.id
        FROM academic_session_templates ast
        WHERE ay.session_template_id IS NULL
          AND ast.name = ay.name
      `);
    })().catch((error) => {
      academicSessionSchemaReady = null;
      throw error;
    });
  }

  return academicSessionSchemaReady;
}

export async function assignInstitutionSession(
  client: PoolClient,
  institutionId: number,
  input: InstitutionSessionInput,
  userId?: number | null
) {
  await ensureAcademicSessionSchema(client);

  const templateResult = await client.query<{
    id: number;
    name: string;
    start_date: string;
    end_date: string;
  }>(
    `SELECT id, name, start_date, end_date FROM academic_session_templates WHERE id = $1 LIMIT 1`,
    [input.templateId]
  );
  const template = templateResult.rows[0];
  if (!template) throw new Error("Selected academic session was not found");

  const startDate = input.startDate || template.start_date;
  const endDate = input.endDate || template.end_date;
  if (new Date(endDate) < new Date(startDate)) {
    throw new Error("Session end date must be after the start date");
  }

  const academicYearResult = await client.query<{ id: number }>(
    `
      INSERT INTO academic_years (
        institution_id, session_template_id, name, start_date, end_date,
        is_active, created_by, updated_by
      )
      VALUES ($1, $2, $3, $4, $5, TRUE, $6, $6)
      ON CONFLICT (institution_id, session_template_id)
      WHERE session_template_id IS NOT NULL
      DO UPDATE SET
        name = EXCLUDED.name,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        is_active = TRUE,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING id
    `,
    [institutionId, template.id, template.name, startDate, endDate, userId || null]
  );
  const academicYearId = academicYearResult.rows[0].id;

  return academicYearId;
}

export async function syncInstitutionAcademicYearsFromTemplates(
  db: Queryable,
  institutionIds: number[],
  userId: number | null
) {
  const ids = Array.from(new Set(institutionIds.filter((id) => Number.isInteger(id) && id > 0)));
  if (!ids.length) return;

  await ensureAcademicSessionSchema(db);
  await db.query(`
    ALTER TABLE institution_profiles
      ADD COLUMN IF NOT EXISTS default_academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL
  `);
  await db.query(
    `
      INSERT INTO academic_years (
        institution_id, session_template_id, name, start_date, end_date,
        is_active, created_by, updated_by
      )
      SELECT
        institution_id,
        ast.id,
        ast.name,
        ast.start_date,
        ast.end_date,
        ast.is_active,
        $2,
        $2
      FROM unnest($1::int[]) AS institution_id
      CROSS JOIN academic_session_templates ast
      ON CONFLICT (institution_id, session_template_id)
      WHERE session_template_id IS NOT NULL
      DO UPDATE SET
        name = EXCLUDED.name,
        start_date = EXCLUDED.start_date,
        end_date = EXCLUDED.end_date,
        is_active = EXCLUDED.is_active,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `,
    [ids, userId]
  );
  await db.query(
    `
      WITH default_years AS (
        SELECT DISTINCT ON (ay.institution_id)
          ay.institution_id,
          ay.id
        FROM academic_years ay
        WHERE ay.institution_id = ANY($1::int[])
          AND COALESCE(ay.is_deleted, FALSE) = FALSE
          AND COALESCE(ay.is_active, TRUE) = TRUE
        ORDER BY
          ay.institution_id,
          CASE WHEN CURRENT_DATE BETWEEN ay.start_date AND ay.end_date THEN 0 ELSE 1 END,
          ay.start_date DESC,
          ay.id DESC
      )
      UPDATE institution_profiles institution
      SET default_academic_year_id = default_years.id,
          updated_by = COALESCE($2::int, updated_by),
          updated_at = CURRENT_TIMESTAMP
      FROM default_years
      WHERE institution.id = ANY($1::int[])
        AND default_years.institution_id = institution.id
        AND institution.default_academic_year_id IS NULL
    `,
    [ids, userId]
  );
}

export async function resolveInstitutionDefaultAcademicYearId(db: Queryable, institutionId: number) {
  const result = await db.query<{ id: number }>(
    `
      SELECT ay.id
      FROM academic_years ay
      INNER JOIN institution_profiles institution ON institution.id = ay.institution_id
      WHERE ay.institution_id = $1
        AND COALESCE(ay.is_deleted, FALSE) = FALSE
        AND COALESCE(ay.is_active, TRUE) = TRUE
        AND (
          ay.id = institution.default_academic_year_id
          OR (
            institution.default_academic_year_id IS NULL
            AND CURRENT_DATE BETWEEN ay.start_date AND ay.end_date
          )
          OR (
            institution.default_academic_year_id IS NULL
            AND ay.start_date <= CURRENT_DATE
          )
        )
      ORDER BY
        CASE WHEN ay.id = institution.default_academic_year_id THEN 0 ELSE 1 END,
        CASE WHEN CURRENT_DATE BETWEEN ay.start_date AND ay.end_date THEN 0 ELSE 1 END,
        ay.start_date DESC,
        ay.id DESC
      LIMIT 1
    `,
    [institutionId]
  );
  const academicYearId = Number(result.rows[0]?.id);
  if (!Number.isInteger(academicYearId) || academicYearId <= 0) {
    throw new Error("Set the institution default academic session first");
  }
  return academicYearId;
}
