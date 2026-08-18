ALTER TABLE public.institution_profiles
  ADD COLUMN IF NOT EXISTS default_academic_year_id INTEGER REFERENCES public.academic_years(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_institution_profiles_default_academic_year
  ON public.institution_profiles(default_academic_year_id);

UPDATE public.institution_profiles institution
SET default_academic_year_id = (
  SELECT academic_year.id
  FROM public.academic_years academic_year
  WHERE academic_year.institution_id = institution.id
    AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
    AND COALESCE(academic_year.is_active, TRUE) = TRUE
  ORDER BY
    CASE WHEN CURRENT_DATE BETWEEN academic_year.start_date AND academic_year.end_date THEN 0 ELSE 1 END,
    academic_year.start_date DESC,
    academic_year.id DESC
  LIMIT 1
)
WHERE institution.default_academic_year_id IS NULL
  AND EXISTS (
    SELECT 1
    FROM public.academic_years academic_year
    WHERE academic_year.institution_id = institution.id
      AND COALESCE(academic_year.is_deleted, FALSE) = FALSE
      AND COALESCE(academic_year.is_active, TRUE) = TRUE
  );

INSERT INTO public.permissions (code, name, description, is_deleted, deleted_at, deleted_by)
VALUES
  ('institution.general_settings.view', 'View Institution General Settings', 'Can view institution-wide general settings.', FALSE, NULL, NULL),
  ('institution.general_settings.create', 'Create Institution General Settings', 'Reserved institution general settings creation permission.', FALSE, NULL, NULL),
  ('institution.general_settings.edit', 'Edit Institution General Settings', 'Can update institution-wide default academic session.', FALSE, NULL, NULL),
  ('institution.general_settings.delete', 'Delete Institution General Settings', 'Reserved institution general settings deletion permission.', FALSE, NULL, NULL)
ON CONFLICT (code)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_deleted = FALSE,
  deleted_at = NULL,
  deleted_by = NULL;

INSERT INTO public.role_permissions (role_id, permission_id)
SELECT role.id, permission.id
FROM public.roles role
CROSS JOIN public.permissions permission
WHERE role.code = 'institution_admin'
  AND COALESCE(role.is_deleted, FALSE) = FALSE
  AND permission.code IN (
    'institution.general_settings.view',
    'institution.general_settings.edit'
  )
ON CONFLICT DO NOTHING;

INSERT INTO public.institution_role_permissions (institution_id, role_id, permission_id)
SELECT institution.id, role.id, permission.id
FROM public.institution_profiles institution
CROSS JOIN public.roles role
CROSS JOIN public.permissions permission
WHERE role.code = 'institution_admin'
  AND COALESCE(role.is_deleted, FALSE) = FALSE
  AND COALESCE(institution.is_deleted, FALSE) = FALSE
  AND permission.code IN (
    'institution.general_settings.view',
    'institution.general_settings.edit'
  )
ON CONFLICT DO NOTHING;
