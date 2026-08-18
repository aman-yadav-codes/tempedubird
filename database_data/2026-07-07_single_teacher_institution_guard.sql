CREATE OR REPLACE FUNCTION enforce_single_teacher_institution()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.is_active = TRUE
     AND NEW.is_current = TRUE
     AND COALESCE(NEW.is_deleted, FALSE) = FALSE
     AND EXISTS (SELECT 1 FROM roles WHERE id = NEW.role_id AND code = 'teacher')
     AND EXISTS (
       SELECT 1
       FROM institution_memberships existing
       INNER JOIN roles existing_role
         ON existing_role.id = existing.role_id
        AND existing_role.code = 'teacher'
       WHERE existing.user_id = NEW.user_id
         AND existing.institution_id <> NEW.institution_id
         AND existing.is_active = TRUE
         AND existing.is_current = TRUE
         AND COALESCE(existing.is_deleted, FALSE) = FALSE
         AND existing.id <> COALESCE(NEW.id, 0)
     )
  THEN
    RAISE EXCEPTION 'A teacher can belong to only one institution.'
      USING ERRCODE = '23505';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_single_teacher_institution ON institution_memberships;
CREATE TRIGGER trg_single_teacher_institution
BEFORE INSERT OR UPDATE OF institution_id, user_id, role_id, is_active, is_current, is_deleted
ON institution_memberships
FOR EACH ROW
EXECUTE FUNCTION enforce_single_teacher_institution();
