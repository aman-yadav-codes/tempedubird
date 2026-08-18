CREATE TABLE IF NOT EXISTS app_migrations (
    key TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_migrations WHERE key = '2026-06-10_attendance_permissions'
  ) THEN
    INSERT INTO permissions (code, name, description)
    VALUES
      ('content.master_data.attendance_setup.view', 'View Attendance Setup', 'Can view attendance configuration.'),
      ('content.master_data.attendance_setup.create', 'Create Attendance Setup', 'Can create attendance configuration.'),
      ('content.master_data.attendance_setup.edit', 'Edit Attendance Setup', 'Can edit attendance configuration.'),
      ('content.master_data.attendance_setup.delete', 'Delete Attendance Setup', 'Can delete attendance configuration.')
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.code = 'platform_admin'
      AND p.code IN (
        'content.master_data.attendance_setup.view',
        'content.master_data.attendance_setup.create',
        'content.master_data.attendance_setup.edit',
        'content.master_data.attendance_setup.delete'
      )
    ON CONFLICT DO NOTHING;

    INSERT INTO institution_role_permissions (institution_id, role_id, permission_id)
    SELECT im.institution_id, r.id, p.id
    FROM institution_memberships im
    INNER JOIN roles r ON r.id = im.role_id
    CROSS JOIN permissions p
    WHERE r.code = 'institution_admin'
      AND p.code IN (
        'content.master_data.attendance_setup.view',
        'content.master_data.attendance_setup.create',
        'content.master_data.attendance_setup.edit',
        'content.master_data.attendance_setup.delete'
      )
    ON CONFLICT DO NOTHING;

    INSERT INTO app_migrations (key)
    VALUES ('2026-06-10_attendance_permissions');
  END IF;
END $$;
