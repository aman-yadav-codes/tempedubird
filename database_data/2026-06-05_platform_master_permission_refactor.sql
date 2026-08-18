WITH permission_renames(old_code, new_code) AS (
  VALUES
    ('institution.master.institution_type', 'content.master.institution_type'),
    ('institution.master.institution_subtype', 'content.master.institution_subtype'),
    ('institution.master.program_type', 'content.master.program_type'),
    ('institution.master.facility_type', 'content.master.facility_type'),
    ('institution.master.language', 'content.master.language')
),
expanded_renames AS (
  SELECT
    old_code || '.' || action AS old_code,
    new_code || '.' || action AS new_code
  FROM permission_renames
  CROSS JOIN (VALUES ('read'), ('create'), ('edit'), ('delete'), ('manage')) AS actions(action)
),
merged AS (
  UPDATE role_permissions rp
  SET permission_id = target.id
  FROM permissions source
  INNER JOIN expanded_renames rename_map ON rename_map.old_code = source.code
  INNER JOIN permissions target ON target.code = rename_map.new_code
  WHERE rp.permission_id = source.id
  RETURNING source.id
),
deleted_duplicates AS (
  DELETE FROM permissions source
  USING expanded_renames rename_map, permissions target
  WHERE source.code = rename_map.old_code
    AND target.code = rename_map.new_code
  RETURNING source.id
)
UPDATE permissions p
SET code = expanded_renames.new_code,
    name = REPLACE(p.name, 'Institution Master', 'Content Master Institution'),
    description = REPLACE(COALESCE(p.description, ''), 'Institution', 'Content master institution')
FROM expanded_renames
WHERE p.code = expanded_renames.old_code;

INSERT INTO permissions (code, name, description)
SELECT
  module_key || '.' || action,
  action_label || ' ' || module_label,
  'Can ' || action_text || ' ' || lower(module_label) || '.'
FROM (
  VALUES
    ('content.master.institution_type', 'Institution Types'),
    ('content.master.institution_subtype', 'Institution Subtypes'),
    ('content.master.program_type', 'Program Types'),
    ('content.master.facility_type', 'Facility Types'),
    ('content.master.language', 'Languages')
) AS modules(module_key, module_label)
CROSS JOIN (
  VALUES
    ('read', 'View', 'view'),
    ('create', 'Create', 'create'),
    ('edit', 'Edit', 'edit'),
    ('delete', 'Delete', 'delete'),
    ('manage', 'Manage', 'manage')
) AS actions(action, action_label, action_text)
ON CONFLICT (code) DO NOTHING;

DELETE FROM institution_role_permissions irp
USING permissions p
WHERE p.id = irp.permission_id
  AND (
    p.code LIKE 'content.master.%'
    OR p.code LIKE 'users.leads.%'
    OR p.code LIKE 'tracker.%'
    OR p.code LIKE 'settings.tracker.%'
  );
