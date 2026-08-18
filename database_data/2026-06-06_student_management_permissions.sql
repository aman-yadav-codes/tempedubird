CREATE TABLE IF NOT EXISTS app_migrations (
    key TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_migrations WHERE key = '2026-06-06_student_management_permissions'
  ) THEN
    WITH modules(code, name, description) AS (
      VALUES
        ('students.all', 'All Students', 'students'),
        ('students.attendance', 'Student Attendance', 'student attendance'),
        ('students.achievements', 'Student Achievements', 'student achievements'),
        ('students.assignments', 'Student Assignments', 'student assignments'),
        ('students.exams', 'Student Exams', 'student exams'),
        ('students.results_tc', 'Student Result / TC', 'student results and transfer certificates'),
        ('students.cards', 'Student Cards', 'student cards'),
        ('students.parents', 'Student Parents', 'student parents and guardians'),
        ('students.timetable', 'Student Time Table', 'student timetable'),
        ('students.notes', 'Student Notes', 'student notes')
    ),
    actions(action_code, action_name, action_description) AS (
      VALUES
        ('read', 'View', 'view'),
        ('create', 'Create', 'create'),
        ('edit', 'Edit', 'edit'),
        ('delete', 'Delete', 'delete'),
        ('manage', 'Manage', 'create, view, edit, and delete')
    )
    INSERT INTO permissions (code, name, description)
    SELECT
      modules.code || '.' || actions.action_code,
      actions.action_name || ' ' || modules.name,
      'Can ' || actions.action_description || ' ' || modules.description || '.'
    FROM modules
    CROSS JOIN actions
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description;

    INSERT INTO app_migrations (key)
    VALUES ('2026-06-06_student_management_permissions');
  END IF;
END $$;
