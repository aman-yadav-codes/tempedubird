CREATE TABLE IF NOT EXISTS app_migrations (
    key TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_migrations WHERE key = '2026-06-06_manage_students_permission_rename'
  ) THEN
    CREATE TEMP TABLE tmp_manage_student_sidebar (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO tmp_manage_student_sidebar (code, name, description)
    VALUES
      ('manage_students.sidebar', 'Show Manage Students Sidebar', 'Can show student management sidebar group.');

    CREATE TEMP TABLE tmp_manage_student_modules (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO tmp_manage_student_modules (code, name, description)
    VALUES
      ('manage_students.all_students', 'All Students', 'students'),
      ('manage_students.attendance', 'Attendance', 'student attendance'),
      ('manage_students.achievements', 'Achievements', 'student achievements'),
      ('manage_students.assignments', 'Assignments', 'student assignments'),
      ('manage_students.exams', 'Exams', 'student exams'),
      ('manage_students.result', 'Result', 'student results'),
      ('manage_students.tc', 'TC', 'student transfer certificates'),
      ('manage_students.cards', 'Cards', 'student cards'),
      ('manage_students.parents', 'Parents', 'student parents and guardians'),
      ('manage_students.time_table', 'Time Table', 'student timetable'),
      ('manage_students.notes', 'Notes', 'student notes');

    INSERT INTO permissions (code, name, description)
    SELECT code, name, description
    FROM tmp_manage_student_sidebar
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description;

    WITH actions(action_code, action_name, action_description) AS (
      VALUES
        ('view', 'View', 'view'),
        ('create', 'Create', 'create'),
        ('edit', 'Edit', 'edit'),
        ('delete', 'Delete', 'delete')
    )
    INSERT INTO permissions (code, name, description)
    SELECT
      modules.code || '.' || actions.action_code,
      actions.action_name || ' ' || modules.name,
      'Can ' || actions.action_description || ' ' || modules.description || '.'
    FROM tmp_manage_student_modules modules
    CROSS JOIN actions
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description;

    CREATE TEMP TABLE tmp_student_permission_map (
      old_code TEXT NOT NULL,
      new_code TEXT NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO tmp_student_permission_map (old_code, new_code)
    VALUES
      ('students.sidebar', 'manage_students.sidebar'),
      ('students.all.view', 'manage_students.all_students.view'),
      ('students.all.create', 'manage_students.all_students.create'),
      ('students.all.edit', 'manage_students.all_students.edit'),
      ('students.all.delete', 'manage_students.all_students.delete'),
      ('students.attendance.view', 'manage_students.attendance.view'),
      ('students.attendance.create', 'manage_students.attendance.create'),
      ('students.attendance.edit', 'manage_students.attendance.edit'),
      ('students.attendance.delete', 'manage_students.attendance.delete'),
      ('students.achievements.view', 'manage_students.achievements.view'),
      ('students.achievements.create', 'manage_students.achievements.create'),
      ('students.achievements.edit', 'manage_students.achievements.edit'),
      ('students.achievements.delete', 'manage_students.achievements.delete'),
      ('students.assignments.view', 'manage_students.assignments.view'),
      ('students.assignments.create', 'manage_students.assignments.create'),
      ('students.assignments.edit', 'manage_students.assignments.edit'),
      ('students.assignments.delete', 'manage_students.assignments.delete'),
      ('students.exams.view', 'manage_students.exams.view'),
      ('students.exams.create', 'manage_students.exams.create'),
      ('students.exams.edit', 'manage_students.exams.edit'),
      ('students.exams.delete', 'manage_students.exams.delete'),
      ('students.results_tc.view', 'manage_students.result.view'),
      ('students.results_tc.create', 'manage_students.result.create'),
      ('students.results_tc.edit', 'manage_students.result.edit'),
      ('students.results_tc.delete', 'manage_students.result.delete'),
      ('students.results_tc.view', 'manage_students.tc.view'),
      ('students.results_tc.create', 'manage_students.tc.create'),
      ('students.results_tc.edit', 'manage_students.tc.edit'),
      ('students.results_tc.delete', 'manage_students.tc.delete'),
      ('students.cards.view', 'manage_students.cards.view'),
      ('students.cards.create', 'manage_students.cards.create'),
      ('students.cards.edit', 'manage_students.cards.edit'),
      ('students.cards.delete', 'manage_students.cards.delete'),
      ('students.parents.view', 'manage_students.parents.view'),
      ('students.parents.create', 'manage_students.parents.create'),
      ('students.parents.edit', 'manage_students.parents.edit'),
      ('students.parents.delete', 'manage_students.parents.delete'),
      ('students.timetable.view', 'manage_students.time_table.view'),
      ('students.timetable.create', 'manage_students.time_table.create'),
      ('students.timetable.edit', 'manage_students.time_table.edit'),
      ('students.timetable.delete', 'manage_students.time_table.delete'),
      ('students.notes.view', 'manage_students.notes.view'),
      ('students.notes.create', 'manage_students.notes.create'),
      ('students.notes.edit', 'manage_students.notes.edit'),
      ('students.notes.delete', 'manage_students.notes.delete');

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT DISTINCT rp.role_id, new_permission.id
    FROM role_permissions rp
    INNER JOIN permissions old_permission ON old_permission.id = rp.permission_id
    INNER JOIN tmp_student_permission_map map ON map.old_code = old_permission.code
    INNER JOIN permissions new_permission ON new_permission.code = map.new_code
    ON CONFLICT DO NOTHING;

    INSERT INTO institution_role_permissions (institution_id, role_id, permission_id)
    SELECT DISTINCT irp.institution_id, irp.role_id, new_permission.id
    FROM institution_role_permissions irp
    INNER JOIN permissions old_permission ON old_permission.id = irp.permission_id
    INNER JOIN tmp_student_permission_map map ON map.old_code = old_permission.code
    INNER JOIN permissions new_permission ON new_permission.code = map.new_code
    ON CONFLICT DO NOTHING;

    DELETE FROM role_permissions
    WHERE permission_id IN (
      SELECT id FROM permissions WHERE code LIKE 'students.%'
    );

    DELETE FROM institution_role_permissions
    WHERE permission_id IN (
      SELECT id FROM permissions WHERE code LIKE 'students.%'
    );

    DELETE FROM permissions
    WHERE code LIKE 'students.%';

    INSERT INTO app_migrations (key)
    VALUES ('2026-06-06_manage_students_permission_rename');
  END IF;
END $$;
