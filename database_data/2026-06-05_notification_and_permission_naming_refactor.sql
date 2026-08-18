BEGIN;

WITH notification_renames(old_code, new_code) AS (
  VALUES
    ('user.updated', 'users.all.updated'),
    ('user.active', 'users.all.activated'),
    ('user.inactive', 'users.all.deactivated'),
    ('institution.module.updated', 'institutions.module.updated'),
    ('institution.updated', 'institutions.profile.updated'),
    ('institution.active', 'institutions.profile.activated'),
    ('institution.inactive', 'institutions.profile.deactivated'),
    ('institution.approved', 'institutions.profile.approved')
),
old_preferences AS (
  SELECT
    np.user_id,
    nr.new_code AS notification_type,
    BOOL_AND(np.is_enabled) AS is_enabled
  FROM notification_preferences np
  INNER JOIN notification_renames nr ON nr.old_code = np.notification_type
  GROUP BY np.user_id, nr.new_code
),
deleted_old_preferences AS (
  DELETE FROM notification_preferences np
  USING notification_renames nr
  WHERE np.notification_type = nr.old_code
)
INSERT INTO notification_preferences (user_id, notification_type, is_enabled, updated_at)
SELECT user_id, notification_type, is_enabled, CURRENT_TIMESTAMP
FROM old_preferences
ON CONFLICT (user_id, notification_type)
DO UPDATE SET
  is_enabled = notification_preferences.is_enabled AND EXCLUDED.is_enabled,
  updated_at = CURRENT_TIMESTAMP;

WITH notification_renames(old_code, new_code) AS (
  VALUES
    ('user.updated', 'users.all.updated'),
    ('user.active', 'users.all.activated'),
    ('user.inactive', 'users.all.deactivated'),
    ('institution.module.updated', 'institutions.module.updated'),
    ('institution.updated', 'institutions.profile.updated'),
    ('institution.active', 'institutions.profile.activated'),
    ('institution.inactive', 'institutions.profile.deactivated'),
    ('institution.approved', 'institutions.profile.approved')
),
old_settings AS (
  SELECT
    ins.institution_id,
    nr.new_code AS notification_type,
    BOOL_AND(ins.is_enabled) AS is_enabled
  FROM institution_notification_settings ins
  INNER JOIN notification_renames nr ON nr.old_code = ins.notification_type
  GROUP BY ins.institution_id, nr.new_code
),
deleted_old_settings AS (
  DELETE FROM institution_notification_settings ins
  USING notification_renames nr
  WHERE ins.notification_type = nr.old_code
)
INSERT INTO institution_notification_settings (institution_id, notification_type, is_enabled, updated_at)
SELECT institution_id, notification_type, is_enabled, CURRENT_TIMESTAMP
FROM old_settings
ON CONFLICT (institution_id, notification_type)
DO UPDATE SET
  is_enabled = institution_notification_settings.is_enabled AND EXCLUDED.is_enabled,
  updated_at = CURRENT_TIMESTAMP;

WITH notification_renames(old_code, new_code) AS (
  VALUES
    ('user.updated', 'users.all.updated'),
    ('user.active', 'users.all.activated'),
    ('user.inactive', 'users.all.deactivated'),
    ('institution.module.updated', 'institutions.module.updated'),
    ('institution.updated', 'institutions.profile.updated'),
    ('institution.active', 'institutions.profile.activated'),
    ('institution.inactive', 'institutions.profile.deactivated'),
    ('institution.approved', 'institutions.profile.approved')
)
UPDATE notifications n
SET type = nr.new_code
FROM notification_renames nr
WHERE n.type = nr.old_code;

WITH notification_renames(old_code, new_code) AS (
  VALUES
    ('user.updated', 'users.all.updated'),
    ('user.active', 'users.all.activated'),
    ('user.inactive', 'users.all.deactivated'),
    ('institution.module.updated', 'institutions.module.updated'),
    ('institution.updated', 'institutions.profile.updated'),
    ('institution.active', 'institutions.profile.activated'),
    ('institution.inactive', 'institutions.profile.deactivated'),
    ('institution.approved', 'institutions.profile.approved')
),
templates_to_move AS (
  SELECT nt.*, nr.new_code
  FROM notification_templates nt
  INNER JOIN notification_renames nr ON nr.old_code = nt.code
  WHERE NOT EXISTS (
    SELECT 1 FROM notification_templates existing WHERE existing.code = nr.new_code
  )
)
UPDATE notification_templates nt
SET code = templates_to_move.new_code,
    updated_at = CURRENT_TIMESTAMP
FROM templates_to_move
WHERE nt.id = templates_to_move.id;

WITH notification_renames(old_code, new_code) AS (
  VALUES
    ('user.updated', 'users.all.updated'),
    ('user.active', 'users.all.activated'),
    ('user.inactive', 'users.all.deactivated'),
    ('institution.module.updated', 'institutions.module.updated'),
    ('institution.updated', 'institutions.profile.updated'),
    ('institution.active', 'institutions.profile.activated'),
    ('institution.inactive', 'institutions.profile.deactivated'),
    ('institution.approved', 'institutions.profile.approved')
)
DELETE FROM notification_templates nt
USING notification_renames nr
WHERE nt.code = nr.old_code;

INSERT INTO notification_templates (code, title_template, body_template, is_active, updated_at)
VALUES
  ('users.all.updated', 'Account Updated', '{{actor_name}} updated your account.', TRUE, CURRENT_TIMESTAMP),
  ('users.all.activated', 'Account Activated', '{{user_name}} has been activated.', TRUE, CURRENT_TIMESTAMP),
  ('users.all.deactivated', 'Account Deactivated', '{{user_name}} has been deactivated.', TRUE, CURRENT_TIMESTAMP),
  ('institutions.module.updated', 'Institution Module Updated', '{{actor_name}} made a change in {{module_name}} for {{institution_name}}.', TRUE, CURRENT_TIMESTAMP),
  ('institutions.profile.updated', 'Institution Updated', '{{actor_name}} updated {{institution_name}}.', TRUE, CURRENT_TIMESTAMP),
  ('institutions.profile.activated', 'Institution Activated', '{{institution_name}} has been activated.', TRUE, CURRENT_TIMESTAMP),
  ('institutions.profile.deactivated', 'Institution Deactivated', '{{institution_name}} has been deactivated.', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET
  title_template = EXCLUDED.title_template,
  body_template = EXCLUDED.body_template,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

WITH module_renames(old_module, new_module) AS (
  VALUES
    ('users', 'users.all'),
    ('notifications', 'notifications.all'),
    ('notifications.settings', 'notifications.controls'),
    ('content.master.institution_type', 'institutions.master.institution_type'),
    ('content.master.institution_subtype', 'institutions.master.institution_subtype'),
    ('content.master.program_type', 'institutions.master.program_type'),
    ('content.master.facility_type', 'institutions.master.facility_type'),
    ('content.master.language', 'institutions.master.language'),
    ('institution', 'institutions.institutions'),
    ('institution.programs', 'institutions.programs'),
    ('institution.placements', 'institutions.placements'),
    ('institution.cutoffs', 'institutions.cutoffs'),
    ('institution.scholarships', 'institutions.scholarships'),
    ('institution.news', 'institutions.news')
),
actions(action) AS (
  VALUES ('read'), ('create'), ('edit'), ('delete'), ('manage')
),
permission_renames AS (
  SELECT
    module_renames.old_module || '.' || actions.action AS old_code,
    module_renames.new_module || '.' || actions.action AS new_code
  FROM module_renames
  CROSS JOIN actions
),
target_permissions AS (
  INSERT INTO permissions (code, name, description)
  SELECT
    pr.new_code,
    'Pending name',
    'Pending description.'
  FROM permission_renames pr
  ON CONFLICT (code) DO NOTHING
  RETURNING id, code
),
copied_role_permissions AS (
  INSERT INTO role_permissions (role_id, permission_id)
  SELECT DISTINCT rp.role_id, target.id
  FROM role_permissions rp
  INNER JOIN permissions source ON source.id = rp.permission_id
  INNER JOIN permission_renames pr ON pr.old_code = source.code
  INNER JOIN permissions target ON target.code = pr.new_code
  ON CONFLICT DO NOTHING
),
copied_institution_role_permissions AS (
  INSERT INTO institution_role_permissions (institution_id, role_id, permission_id)
  SELECT DISTINCT irp.institution_id, irp.role_id, target.id
  FROM institution_role_permissions irp
  INNER JOIN permissions source ON source.id = irp.permission_id
  INNER JOIN permission_renames pr ON pr.old_code = source.code
  INNER JOIN permissions target ON target.code = pr.new_code
  ON CONFLICT DO NOTHING
),
deleted_old_role_permissions AS (
  DELETE FROM role_permissions rp
  USING permissions source, permission_renames pr
  WHERE rp.permission_id = source.id
    AND source.code = pr.old_code
),
deleted_old_institution_role_permissions AS (
  DELETE FROM institution_role_permissions irp
  USING permissions source, permission_renames pr
  WHERE irp.permission_id = source.id
    AND source.code = pr.old_code
)
DELETE FROM permissions source
USING permission_renames pr
WHERE source.code = pr.old_code;

WITH modules(code, label, description) AS (
  VALUES
    ('users.all', 'All Users', 'admin users'),
    ('users.leads', 'User Leads', 'user leads'),
    ('institutions.master', 'Institution Master', 'institution master data'),
    ('institutions.master.institution_type', 'Institution Types', 'institution types'),
    ('institutions.master.institution_subtype', 'Institution Subtypes', 'institution subtypes'),
    ('institutions.master.program_type', 'Program Types', 'program types'),
    ('institutions.master.facility_type', 'Facility Types', 'facility types'),
    ('institutions.master.language', 'Languages', 'institution languages'),
    ('institutions.institutions', 'Institutions', 'institution profiles'),
    ('institutions.programs', 'Institution Programs', 'institution programs'),
    ('institutions.placements', 'Institution Placements', 'institution placements'),
    ('institutions.cutoffs', 'Institution Cutoffs', 'institution cutoffs'),
    ('institutions.scholarships', 'Institution Scholarships', 'institution scholarships'),
    ('institutions.news', 'Institution News', 'institution news'),
    ('notifications.all', 'All Notifications', 'notification inbox'),
    ('notifications.muted', 'Muted Notifications', 'muted notification preferences'),
    ('notifications.controls', 'Notification Controls', 'institution notification controls'),
    ('settings.notifications', 'Platform Notification Types', 'platform notification types')
),
actions(code, label, description_prefix) AS (
  VALUES
    ('read', 'View', 'Can view '),
    ('create', 'Create', 'Can create '),
    ('edit', 'Edit', 'Can edit '),
    ('delete', 'Delete', 'Can delete '),
    ('manage', 'Manage', 'Can create, view, edit, and delete ')
)
INSERT INTO permissions (code, name, description)
SELECT
  modules.code || '.' || actions.code,
  actions.label || ' ' || modules.label,
  actions.description_prefix || modules.description || '.'
FROM modules
CROSS JOIN actions
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

DELETE FROM institution_role_permissions irp
USING permissions p
WHERE p.id = irp.permission_id
  AND (
    p.code LIKE 'institutions.master.%'
    OR p.code LIKE 'users.leads.%'
    OR p.code LIKE 'tracker.%'
    OR p.code LIKE 'settings.tracker.%'
    OR p.code LIKE 'settings.notifications.%'
  );

COMMIT;
