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
);

ALTER TABLE academic_years
ADD COLUMN IF NOT EXISTS session_template_id INTEGER;

ALTER TABLE institution_profiles
ADD COLUMN IF NOT EXISTS current_academic_year_id INTEGER;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_academic_year_session_template'
    ) THEN
        ALTER TABLE academic_years
        ADD CONSTRAINT fk_academic_year_session_template
        FOREIGN KEY (session_template_id)
        REFERENCES academic_session_templates(id)
        ON DELETE RESTRICT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'fk_institution_current_academic_year'
    ) THEN
        ALTER TABLE institution_profiles
        ADD CONSTRAINT fk_institution_current_academic_year
        FOREIGN KEY (current_academic_year_id)
        REFERENCES academic_years(id)
        ON DELETE SET NULL;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_academic_year_session_template
ON academic_years (institution_id, session_template_id)
WHERE session_template_id IS NOT NULL;

INSERT INTO academic_session_templates (
    name,
    start_date,
    end_date,
    is_active,
    created_by,
    updated_by
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
ON CONFLICT (name) DO NOTHING;

UPDATE academic_years ay
SET session_template_id = ast.id
FROM academic_session_templates ast
WHERE ay.session_template_id IS NULL
  AND ast.name = ay.name;

UPDATE institution_profiles ip
SET current_academic_year_id = (
    SELECT ay.id
    FROM academic_years ay
    WHERE ay.institution_id = ip.id
    ORDER BY ay.is_active DESC, ay.start_date DESC, ay.id DESC
    LIMIT 1
)
WHERE ip.current_academic_year_id IS NULL
  AND EXISTS (
      SELECT 1
      FROM academic_years ay
      WHERE ay.institution_id = ip.id
  );
