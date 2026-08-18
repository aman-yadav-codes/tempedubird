CREATE TABLE IF NOT EXISTS app_migrations (
    key TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_migrations WHERE key = '2026-07-13_notes_module'
  ) THEN
    CREATE TABLE IF NOT EXISTS study_notes (
      id SERIAL PRIMARY KEY,
      institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      subject_id INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
      syllabus_id INTEGER REFERENCES syllabi(id) ON DELETE SET NULL,
      syllabus_node_id INTEGER REFERENCES syllabus_nodes(id) ON DELETE SET NULL,
      program_id INTEGER REFERENCES institution_programs(id) ON DELETE SET NULL,
      section_id INTEGER REFERENCES sections(id) ON DELETE SET NULL,
      title TEXT DEFAULT '',
      body TEXT DEFAULT '',
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_public BOOLEAN NOT NULL DEFAULT FALSE,
      marketplace_requested BOOLEAN NOT NULL DEFAULT FALSE,
      marketplace_requested_at TIMESTAMP NULL,
      marketplace_requested_by INTEGER REFERENCES users(id),
      marketplace_approved BOOLEAN NOT NULL DEFAULT FALSE,
      marketplace_approved_at TIMESTAMP NULL,
      marketplace_approved_by INTEGER REFERENCES users(id),
      source_note_id INTEGER REFERENCES study_notes(id) ON DELETE SET NULL,
      source_institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE SET NULL,
      is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
      deleted_at TIMESTAMP NULL,
      deleted_by INTEGER REFERENCES users(id),
      created_by INTEGER REFERENCES users(id),
      updated_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    ALTER TABLE study_notes ALTER COLUMN title DROP NOT NULL;
    ALTER TABLE study_notes ALTER COLUMN body DROP NOT NULL;
    ALTER TABLE study_notes ALTER COLUMN title SET DEFAULT '';
    ALTER TABLE study_notes ALTER COLUMN body SET DEFAULT '';
    ALTER TABLE study_notes
      ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS marketplace_requested BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS marketplace_requested_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS marketplace_requested_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS marketplace_approved BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS marketplace_approved_at TIMESTAMP NULL,
      ADD COLUMN IF NOT EXISTS marketplace_approved_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS source_note_id INTEGER REFERENCES study_notes(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS source_institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE SET NULL;

    CREATE TABLE IF NOT EXISTS study_note_items (
      id SERIAL PRIMARY KEY,
      note_id INTEGER NOT NULL REFERENCES study_notes(id) ON DELETE CASCADE,
      syllabus_node_id INTEGER REFERENCES syllabus_nodes(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      body TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
      deleted_at TIMESTAMP NULL,
      deleted_by INTEGER REFERENCES users(id),
      created_by INTEGER REFERENCES users(id),
      updated_by INTEGER REFERENCES users(id),
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    INSERT INTO study_note_items (note_id, syllabus_node_id, title, body, is_active, created_by, updated_by, sort_order, created_at, updated_at)
    SELECT note.id, note.syllabus_node_id, COALESCE(NULLIF(note.title, ''), 'Note'), COALESCE(note.body, ''), note.is_active, note.created_by, note.updated_by, 1, note.created_at, note.updated_at
    FROM study_notes note
    WHERE COALESCE(note.body, '') <> ''
      AND NOT EXISTS (
        SELECT 1 FROM study_note_items item WHERE item.note_id = note.id
      );

    CREATE INDEX IF NOT EXISTS idx_study_notes_institution ON study_notes(institution_id);
    CREATE INDEX IF NOT EXISTS idx_study_notes_subject ON study_notes(subject_id);
    CREATE INDEX IF NOT EXISTS idx_study_notes_syllabus ON study_notes(syllabus_id);
    CREATE INDEX IF NOT EXISTS idx_study_notes_node ON study_notes(syllabus_node_id);
    CREATE INDEX IF NOT EXISTS idx_study_notes_program_section ON study_notes(program_id, section_id);
    CREATE INDEX IF NOT EXISTS idx_study_notes_deleted ON study_notes(is_deleted);
    CREATE INDEX IF NOT EXISTS idx_study_notes_marketplace ON study_notes(marketplace_requested, marketplace_approved, is_public);
    CREATE INDEX IF NOT EXISTS idx_study_note_items_note ON study_note_items(note_id);
    CREATE INDEX IF NOT EXISTS idx_study_note_items_node ON study_note_items(syllabus_node_id);

    WITH note_modules(code, name, description) AS (
      VALUES
        ('content.notes', 'Notes', 'institution study notes'),
        ('manage_students.notes', 'Notes', 'student notes')
    ),
    actions(action_code, action_name, action_description) AS (
      VALUES
        ('view', 'View', 'view'),
        ('create', 'Create', 'create'),
        ('edit', 'Edit', 'edit'),
        ('delete', 'Delete', 'delete')
    )
    INSERT INTO permissions (code, name, description)
    SELECT
      note_modules.code || '.' || actions.action_code,
      actions.action_name || ' ' || note_modules.name,
      'Can ' || actions.action_description || ' ' || note_modules.description || '.'
    FROM note_modules
    CROSS JOIN actions
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role.id, permission.id
    FROM roles role
    INNER JOIN permissions permission
      ON permission.code IN (
        'content.notes.view',
        'content.notes.create',
        'content.notes.edit',
        'content.notes.delete',
        'manage_students.notes.view',
        'manage_students.notes.create',
        'manage_students.notes.edit',
        'manage_students.notes.delete'
      )
    WHERE role.code = 'institution_admin'
    ON CONFLICT DO NOTHING;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role.id, permission.id
    FROM roles role
    INNER JOIN permissions permission
      ON permission.code = 'manage_students.notes.view'
    WHERE role.code = 'student'
    ON CONFLICT DO NOTHING;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT role.id, permission.id
    FROM roles role
    INNER JOIN permissions permission
      ON permission.code IN (
        'manage_students.notes.view',
        'manage_students.notes.create',
        'manage_students.notes.edit',
        'manage_students.notes.delete'
      )
    WHERE role.code = 'teacher'
    ON CONFLICT DO NOTHING;

    INSERT INTO app_migrations (key)
    VALUES ('2026-07-13_notes_module');
  END IF;
END $$;
