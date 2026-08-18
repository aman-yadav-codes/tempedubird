CREATE TABLE IF NOT EXISTS app_migrations (
    key TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_migrations WHERE key = '2026-06-08_syllabus_management'
  ) THEN
    CREATE TABLE IF NOT EXISTS syllabi (
        id SERIAL PRIMARY KEY,
        subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
        institution_id INTEGER NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
        parent_syllabus_id INTEGER NULL REFERENCES syllabi(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        version INTEGER DEFAULT 1 NOT NULL,
        is_template BOOLEAN DEFAULT FALSE NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_syllabi_subject ON syllabi(subject_id);
    CREATE INDEX IF NOT EXISTS idx_syllabi_institution ON syllabi(institution_id);
    CREATE INDEX IF NOT EXISTS idx_syllabi_template ON syllabi(is_template);

    CREATE TABLE IF NOT EXISTS syllabus_nodes (
        id SERIAL PRIMARY KEY,
        syllabus_id INTEGER NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
        parent_id INTEGER NULL REFERENCES syllabus_nodes(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        node_type VARCHAR(50) NOT NULL,
        sort_order INTEGER DEFAULT 0 NOT NULL,
        estimated_hours INTEGER,
        learning_outcomes TEXT,
        metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
        is_active BOOLEAN DEFAULT TRUE NOT NULL,
        created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_syllabus_nodes_syllabus ON syllabus_nodes(syllabus_id);
    CREATE INDEX IF NOT EXISTS idx_syllabus_nodes_parent ON syllabus_nodes(parent_id);
    CREATE INDEX IF NOT EXISTS idx_syllabus_nodes_type ON syllabus_nodes(node_type);
    CREATE INDEX IF NOT EXISTS idx_syllabus_nodes_sort ON syllabus_nodes(syllabus_id, sort_order);
    CREATE INDEX IF NOT EXISTS idx_syllabus_nodes_metadata ON syllabus_nodes USING GIN(metadata);

    CREATE TABLE IF NOT EXISTS syllabus_node_closure (
        ancestor_id INTEGER NOT NULL REFERENCES syllabus_nodes(id) ON DELETE CASCADE,
        descendant_id INTEGER NOT NULL REFERENCES syllabus_nodes(id) ON DELETE CASCADE,
        depth INTEGER NOT NULL,
        PRIMARY KEY (ancestor_id, descendant_id)
    );

    CREATE INDEX IF NOT EXISTS idx_syllabus_closure_ancestor ON syllabus_node_closure(ancestor_id);
    CREATE INDEX IF NOT EXISTS idx_syllabus_closure_descendant ON syllabus_node_closure(descendant_id);
    CREATE INDEX IF NOT EXISTS idx_syllabus_closure_depth ON syllabus_node_closure(depth);

    CREATE TABLE IF NOT EXISTS syllabus_inheritance_logs (
        id SERIAL PRIMARY KEY,
        template_syllabus_id INTEGER NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
        institution_syllabus_id INTEGER NOT NULL REFERENCES syllabi(id) ON DELETE CASCADE,
        inherited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        inherited_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    );

    INSERT INTO permissions (code, name, description)
    VALUES
      ('content.master_data.syllabus.view', 'View Content Master Syllabus', 'Can view universal and institution syllabi.'),
      ('content.master_data.syllabus.create', 'Create Content Master Syllabus', 'Can create universal and institution syllabi.'),
      ('content.master_data.syllabus.edit', 'Edit Content Master Syllabus', 'Can edit universal and institution syllabi.'),
      ('content.master_data.syllabus.delete', 'Delete Content Master Syllabus', 'Can delete universal and institution syllabi.')
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT r.id, p.id
    FROM roles r
    CROSS JOIN permissions p
    WHERE r.code = 'platform_admin'
      AND p.code IN (
        'content.master_data.syllabus.view',
        'content.master_data.syllabus.create',
        'content.master_data.syllabus.edit',
        'content.master_data.syllabus.delete'
      )
    ON CONFLICT DO NOTHING;

    INSERT INTO app_migrations (key) VALUES ('2026-06-08_syllabus_management');
  END IF;
END $$;
