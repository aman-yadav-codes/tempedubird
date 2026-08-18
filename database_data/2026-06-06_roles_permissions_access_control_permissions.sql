BEGIN;

WITH permission_rows(code, name, description) AS (
  VALUES
    ('roles_permissions.sidebar', 'Show Roles & Permissions Sidebar', 'Can show the Roles & Permissions module in the sidebar.'),
    ('roles_permissions.scope_types.view', 'View Scope Types', 'Can view scope types.'),
    ('roles_permissions.scope_types.create', 'Create Scope Types', 'Can create scope types.'),
    ('roles_permissions.scope_types.edit', 'Edit Scope Types', 'Can edit scope types.'),
    ('roles_permissions.scope_types.delete', 'Delete Scope Types', 'Can delete scope types.'),
    ('roles_permissions.permissions.view', 'View Permissions', 'Can view permission codes.'),
    ('roles_permissions.permissions.create', 'Create Permissions', 'Can create permission codes.'),
    ('roles_permissions.permissions.edit', 'Edit Permissions', 'Can edit permission codes.'),
    ('roles_permissions.permissions.delete', 'Delete Permissions', 'Can delete permission codes.'),
    ('roles_permissions.roles.view', 'View Roles', 'Can view roles.'),
    ('roles_permissions.roles.create', 'Create Roles', 'Can create roles.'),
    ('roles_permissions.roles.edit', 'Edit Roles', 'Can edit roles.'),
    ('roles_permissions.roles.delete', 'Delete Roles', 'Can delete roles.'),
    ('roles_permissions.role_permissions.view', 'View Role Permissions', 'Can view default role permission mappings.'),
    ('roles_permissions.role_permissions.create', 'Create Role Permissions', 'Can create default role permission mappings.'),
    ('roles_permissions.role_permissions.edit', 'Edit Role Permissions', 'Can edit default role permission mappings.'),
    ('roles_permissions.role_permissions.delete', 'Delete Role Permissions', 'Can delete default role permission mappings.'),
    ('roles_permissions.institution_memberships.view', 'View Institution Memberships', 'Can view institution memberships.'),
    ('roles_permissions.institution_memberships.create', 'Create Institution Memberships', 'Can create institution memberships.'),
    ('roles_permissions.institution_memberships.edit', 'Edit Institution Memberships', 'Can edit institution memberships.'),
    ('roles_permissions.institution_memberships.delete', 'Delete Institution Memberships', 'Can delete institution memberships.'),
    ('roles_permissions.institution_role_permissions.view', 'View Institution Role Permissions', 'Can view institution role permission overrides.'),
    ('roles_permissions.institution_role_permissions.create', 'Create Institution Role Permissions', 'Can create institution role permission overrides.'),
    ('roles_permissions.institution_role_permissions.edit', 'Edit Institution Role Permissions', 'Can edit institution role permission overrides.'),
    ('roles_permissions.institution_role_permissions.delete', 'Delete Institution Role Permissions', 'Can delete institution role permission overrides.')
)
INSERT INTO permissions (code, name, description)
SELECT code, name, description
FROM permission_rows
ON CONFLICT (code)
DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'platform_admin'
  AND (
    p.code = 'roles_permissions.sidebar'
    OR p.code LIKE 'roles_permissions.%'
  )
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
INNER JOIN permissions p
  ON p.code IN (
    'roles_permissions.sidebar',
    'roles_permissions.institution_memberships.view',
    'roles_permissions.institution_memberships.create',
    'roles_permissions.institution_memberships.edit',
    'roles_permissions.institution_memberships.delete',
    'roles_permissions.institution_role_permissions.view',
    'roles_permissions.institution_role_permissions.create',
    'roles_permissions.institution_role_permissions.edit',
    'roles_permissions.institution_role_permissions.delete'
  )
WHERE r.code = 'institution_admin'
ON CONFLICT DO NOTHING;

COMMIT;
