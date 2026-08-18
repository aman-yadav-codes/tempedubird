BEGIN;

UPDATE institution_profiles p
SET board_id = NULL,
    updated_at = CURRENT_TIMESTAMP
FROM institution_types it
WHERE it.id = p.institution_type_id
  AND p.board_id IS NOT NULL
  AND LOWER(it.name) LIKE '%coaching%';

ALTER TABLE institution_profiles
DROP CONSTRAINT IF EXISTS fk_institution_current_academic_year;

ALTER TABLE institution_profiles
DROP COLUMN IF EXISTS current_academic_year_id;

COMMIT;
