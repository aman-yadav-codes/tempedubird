BEGIN;

CREATE TABLE IF NOT EXISTS scope_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO scope_types (code, name)
VALUES
  ('platform', 'Platform'),
  ('institution', 'Institution'),
  ('franchise', 'Franchise'),
  ('district', 'District'),
  ('university_group', 'University Group')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = TRUE;

ALTER TABLE roles
  ADD COLUMN IF NOT EXISTS code VARCHAR(100),
  ADD COLUMN IF NOT EXISTS scope_id INT;

UPDATE roles
SET code = CASE
    WHEN LOWER(name) = 'admin' THEN 'platform_admin'
    WHEN LOWER(name) = 'editor' THEN 'platform_editor'
    WHEN LOWER(name) = 'viewer' THEN 'platform_viewer'
    ELSE LOWER(REGEXP_REPLACE(TRIM(name), '[^a-zA-Z0-9]+', '_', 'g'))
  END
WHERE code IS NULL;

UPDATE roles
SET scope_id = (SELECT id FROM scope_types WHERE code = 'platform')
WHERE scope_id IS NULL
  AND code IN ('platform_admin', 'platform_editor', 'platform_viewer');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'roles_code_unique'
  ) THEN
    ALTER TABLE roles ADD CONSTRAINT roles_code_unique UNIQUE (code);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'roles_scope_fk'
  ) THEN
    ALTER TABLE roles
      ADD CONSTRAINT roles_scope_fk
      FOREIGN KEY (scope_id) REFERENCES scope_types(id) ON DELETE RESTRICT;
  END IF;
END $$;

INSERT INTO roles (name, code, scope_id)
VALUES
  ('Platform Admin', 'platform_admin', (SELECT id FROM scope_types WHERE code = 'platform')),
  ('Platform Editor', 'platform_editor', (SELECT id FROM scope_types WHERE code = 'platform')),
  ('Platform Viewer', 'platform_viewer', (SELECT id FROM scope_types WHERE code = 'platform')),
  ('Institution Admin', 'institution_admin', (SELECT id FROM scope_types WHERE code = 'institution')),
  ('Teacher', 'teacher', (SELECT id FROM scope_types WHERE code = 'institution')),
  ('Student', 'student', (SELECT id FROM scope_types WHERE code = 'institution')),
  ('Parent', 'parent', (SELECT id FROM scope_types WHERE code = 'institution')),
  ('Driver', 'driver', (SELECT id FROM scope_types WHERE code = 'institution'))
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  scope_id = EXCLUDED.scope_id;

CREATE TABLE IF NOT EXISTS permissions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(120) NOT NULL UNIQUE,
  name VARCHAR(160) NOT NULL,
  description TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT role_permissions_role_fk
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT role_permissions_permission_fk
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS institution_memberships (
  id SERIAL PRIMARY KEY,
  institution_id INT NOT NULL,
  user_id INT NOT NULL,
  role_id INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT institution_memberships_institution_fk
    FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE,
  CONSTRAINT institution_memberships_user_fk
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT institution_memberships_role_fk
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX IF NOT EXISTS institution_memberships_unique_active
ON institution_memberships(institution_id, user_id, role_id)
WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_institution_memberships_user
ON institution_memberships(user_id);

CREATE INDEX IF NOT EXISTS idx_institution_memberships_institution
ON institution_memberships(institution_id);

CREATE TABLE IF NOT EXISTS institution_role_permissions (
  institution_id INT NOT NULL,
  role_id INT NOT NULL,
  permission_id INT NOT NULL,
  PRIMARY KEY (institution_id, role_id, permission_id),
  CONSTRAINT institution_role_permissions_institution_fk
    FOREIGN KEY (institution_id) REFERENCES institution_profiles(id) ON DELETE CASCADE,
  CONSTRAINT institution_role_permissions_role_fk
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT institution_role_permissions_permission_fk
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

ALTER TABLE institution_profiles
  ADD COLUMN IF NOT EXISTS owner_user_id INT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'institution_profiles_owner_user_fk'
  ) THEN
    ALTER TABLE institution_profiles
      ADD CONSTRAINT institution_profiles_owner_user_fk
      FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_institution_profiles_owner
ON institution_profiles(owner_user_id);

WITH permission_seed(code, name, description) AS (
  VALUES
    ('*', 'Full system access', 'Bypasses scoped permission checks.'),
    ('admin.access', 'Admin dashboard access', 'Can open the administration area.'),
    ('dashboard.view', 'View dashboard', 'Can view dashboard widgets.'),
    ('user.view', 'View users', 'Can list and inspect users.'),
    ('user.manage', 'Manage users', 'Can create, update, and deactivate users.'),
    ('role.manage', 'Manage roles', 'Can manage roles and permission mappings.'),
    ('content.view', 'View content', 'Can view content management screens.'),
    ('content.manage', 'Manage content', 'Can manage categories, boards, subjects, and media.'),
    ('institution.view', 'View institutions', 'Can view institutions.'),
    ('institution.create', 'Create institutions', 'Can create institution profiles.'),
    ('institution.update', 'Update institutions', 'Can update institution profiles.'),
    ('institution.delete', 'Delete institutions', 'Can remove institution profiles.'),
    ('program.view', 'View programs', 'Can view institution programs.'),
    ('program.create', 'Create programs', 'Can create institution programs.'),
    ('program.update', 'Update programs', 'Can update institution programs.'),
    ('program.delete', 'Delete programs', 'Can delete institution programs.'),
    ('student.view', 'View students', 'Can view students.'),
    ('student.create', 'Create students', 'Can create students.'),
    ('student.update', 'Update students', 'Can update students.'),
    ('student.delete', 'Delete students', 'Can delete students.'),
    ('teacher.create', 'Create teachers', 'Can create teachers.'),
    ('teacher.update', 'Update teachers', 'Can update teachers.'),
    ('teacher.delete', 'Delete teachers', 'Can delete teachers.'),
    ('attendance.manage', 'Manage attendance', 'Can manage attendance.'),
    ('fee.manage', 'Manage fees', 'Can manage fees.'),
    ('news.manage', 'Manage news', 'Can manage institution news.'),
    ('transport.manage', 'Manage transport', 'Can manage transport.'),
    ('settings.manage', 'Manage settings', 'Can manage system settings.'),
    ('tracker.manage', 'Manage tracker', 'Can manage lead tracker settings and sessions.'),
    ('ai.manage', 'Manage AI settings', 'Can manage AI providers and generation settings.'),
    ('media.manage', 'Manage media', 'Can upload and manage media.'),
    ('own_profile.view', 'View own profile', 'Can view own profile.'),
    ('child_progress.view', 'View child progress', 'Can view child progress.'),
    ('transport.view', 'View transport', 'Can view transport data.')
)
INSERT INTO permissions (code, name, description)
SELECT code, name, description
FROM permission_seed
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'platform_admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'admin.access',
  'dashboard.view',
  'user.view',
  'content.view',
  'content.manage',
  'institution.view',
  'institution.create',
  'institution.update',
  'program.view',
  'program.create',
  'program.update',
  'news.manage',
  'media.manage',
  'tracker.manage'
)
WHERE r.code = 'platform_editor'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'admin.access',
  'dashboard.view',
  'user.view',
  'content.view',
  'institution.view',
  'program.view'
)
WHERE r.code = 'platform_viewer'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'admin.access',
  'dashboard.view',
  'institution.view',
  'institution.update',
  'program.view',
  'program.create',
  'program.update',
  'program.delete',
  'student.view',
  'student.create',
  'student.update',
  'student.delete',
  'teacher.create',
  'teacher.update',
  'teacher.delete',
  'attendance.manage',
  'fee.manage',
  'news.manage',
  'transport.manage',
  'settings.manage',
  'media.manage'
)
WHERE r.code = 'institution_admin'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'admin.access',
  'dashboard.view',
  'program.view',
  'student.view',
  'attendance.manage',
  'own_profile.view'
)
WHERE r.code = 'teacher'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('own_profile.view')
WHERE r.code = 'student'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('child_progress.view')
WHERE r.code = 'parent'
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('transport.view')
WHERE r.code = 'driver'
ON CONFLICT DO NOTHING;

DELETE FROM user_roles ur
USING roles r
LEFT JOIN scope_types st ON st.id = r.scope_id
WHERE ur.role_id = r.id
  AND COALESCE(st.code, '') <> 'platform';

COMMIT;
