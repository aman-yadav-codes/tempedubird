BEGIN;

DELETE FROM role_permissions;
DELETE FROM institution_role_permissions;

DELETE FROM permissions
WHERE code <> '*';

DELETE FROM scope_types
WHERE code NOT IN ('platform', 'institution');

DELETE FROM user_roles
WHERE role_id IN (
  SELECT id FROM roles WHERE code IN ('platform_editor', 'platform_viewer')
);

DELETE FROM roles
WHERE code IN ('platform_editor', 'platform_viewer');

INSERT INTO permissions (code, name, description)
VALUES
  ('*', 'Full system access', 'Bypasses all scoped permission checks.'),
  ('admin.access', 'Admin area access', 'Can open the admin area when paired with module permissions.')
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

WITH modules(code, label, description) AS (
  VALUES
    ('dashboard', 'Dashboard', 'Admin dashboard'),
    ('users.all', 'All Users', 'Admin users'),
    ('users.leads', 'User Leads', 'User leads'),
    ('analytics', 'Analytics', 'Analytics overview'),
    ('analytics.reports', 'Analytics Reports', 'Analytics reports'),
    ('content.categories.tree', 'Content Category Tree', 'Content category tree'),
    ('content.categories.manage_categories', 'Content Manage Categories', 'Content categories'),
    ('content.categories.boards', 'Content Boards', 'Content boards'),
    ('content.categories.subjects', 'Content Subjects', 'Content subjects'),
    ('content.master.skills', 'Content Master Skills', 'Content skills'),
    ('content.master.designations', 'Content Master Designations', 'Content designations'),
    ('content.master.locations', 'Content Master Locations', 'Content locations'),
    ('content.media', 'Content Media', 'Content media'),
    ('institutions.master', 'Institution Master', 'Institution master data'),
    ('institutions.master.institution_type', 'Institution Types', 'Institution types'),
    ('institutions.master.institution_subtype', 'Institution Subtypes', 'Institution subtypes'),
    ('institutions.master.program_type', 'Program Types', 'Program types'),
    ('institutions.master.facility_type', 'Facility Types', 'Facility types'),
    ('institutions.master.language', 'Languages', 'Institution languages'),
    ('institutions.institutions', 'Institutions', 'Institution profiles'),
    ('institutions.programs', 'Institution Programs', 'Institution programs'),
    ('institutions.placements', 'Institution Placements', 'Institution placements'),
    ('institutions.cutoffs', 'Institution Cutoffs', 'Institution cutoffs'),
    ('institutions.scholarships', 'Institution Scholarships', 'Institution scholarships'),
    ('institutions.news', 'Institution News', 'Institution news'),
    ('notifications.all', 'All Notifications', 'Notifications'),
    ('notifications.muted', 'Muted Notifications', 'Muted notifications'),
    ('notifications.controls', 'Notification Controls', 'Notification controls'),
    ('tracker', 'Tracker', 'Tracker history'),
    ('settings.general', 'Settings General', 'General settings'),
    ('settings.tracker', 'Settings Tracker', 'Tracker settings'),
    ('settings.ai', 'Settings AI', 'AI settings'),
    ('settings.security', 'Settings Security', 'Security settings')
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
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'platform_admin'
  AND p.code = '*'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON p.code IN (
    'dashboard.read',
    'institutions.institutions.read',
    'institutions.programs.read',
    'institutions.placements.read',
    'institutions.cutoffs.read',
    'institutions.scholarships.read',
    'institutions.news.read',
    'notifications.all.read'
  )
WHERE r.code = 'teacher'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON p.code IN (
    'dashboard.read',
    'institutions.institutions.read',
    'institutions.programs.read',
    'institutions.placements.read',
    'institutions.cutoffs.read',
    'institutions.scholarships.read',
    'institutions.news.read',
    'notifications.all.read',
    'tracker.read'
  )
WHERE r.code = 'driver'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
  ON p.code LIKE 'dashboard.%'
  OR p.code LIKE 'institutions.%'
  OR p.code LIKE 'notifications.%'
  OR p.code LIKE 'tracker.%'
WHERE r.code = 'institution_admin'
ON CONFLICT DO NOTHING;

INSERT INTO institution_memberships (institution_id, user_id, role_id, is_active)
SELECT up.under_institution_id, ur.user_id, ur.role_id, TRUE
FROM user_profiles up
JOIN user_roles ur ON ur.user_id = up.user_id
JOIN roles r ON r.id = ur.role_id
JOIN scope_types st ON st.id = r.scope_id
WHERE st.code = 'institution'
  AND up.under_institution_id IS NOT NULL
ON CONFLICT (institution_id, user_id, role_id)
WHERE is_active = TRUE
DO UPDATE SET is_active = TRUE, updated_at = NOW();

DELETE FROM user_roles
WHERE role_id IN (
  SELECT r.id
  FROM roles r
  JOIN scope_types st ON st.id = r.scope_id
  WHERE st.code = 'institution'
);

COMMIT;
