-- Remove the old institution owner model.
--
-- Why:
-- Institution ownership/admin access is now represented by institution_memberships:
--   institution + user + institution role
--
-- There is no separate institution_owners table in the current schema. The old
-- management page used institution_profiles.owner_user_id, which duplicates
-- institution_memberships and creates confusing access behavior.

BEGIN;

DO $$
DECLARE
  institution_admin_role_id INT;
  has_owner_user_id BOOLEAN;
BEGIN
  SELECT r.id
  INTO institution_admin_role_id
  FROM roles r
  INNER JOIN scope_types st ON st.id = r.scope_id
  WHERE r.code = 'institution_admin'
    AND st.code = 'institution'
  LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'institution_profiles'
      AND column_name = 'owner_user_id'
  )
  INTO has_owner_user_id;

  IF has_owner_user_id AND institution_admin_role_id IS NOT NULL THEN
    EXECUTE '
      INSERT INTO institution_memberships (institution_id, user_id, role_id, is_active)
      SELECT ip.id, ip.owner_user_id, $1, TRUE
      FROM institution_profiles ip
      WHERE ip.owner_user_id IS NOT NULL
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      ON CONFLICT (institution_id, user_id)
      DO UPDATE SET
        role_id = EXCLUDED.role_id,
        is_active = TRUE,
        updated_at = NOW()
    ' USING institution_admin_role_id;
  END IF;
END $$;

DROP INDEX IF EXISTS idx_institution_profiles_owner;

ALTER TABLE institution_profiles
  DROP CONSTRAINT IF EXISTS institution_profiles_owner_user_fk,
  DROP CONSTRAINT IF EXISTS institution_profiles_owner_user_id_fkey,
  DROP COLUMN IF EXISTS owner_user_id;

COMMIT;
