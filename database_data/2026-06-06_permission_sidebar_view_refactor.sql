CREATE TABLE IF NOT EXISTS app_migrations (
    key TEXT PRIMARY KEY,
    applied_at TIMESTAMP DEFAULT timezone('Asia/Kolkata', NOW()) NOT NULL
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM app_migrations WHERE key = '2026-06-06_permission_sidebar_view_refactor'
  ) THEN
    CREATE TEMP TABLE tmp_sidebar_permissions (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO tmp_sidebar_permissions (code, name, description)
    VALUES
      ('dashboard.sidebar', 'Show Dashboard Sidebar', 'Can show dashboard sidebar item.'),
      ('users.sidebar', 'Show Users Sidebar', 'Can show users sidebar group.'),
      ('students.sidebar', 'Show Manage Students Sidebar', 'Can show student management sidebar group.'),
      ('analytics.sidebar', 'Show Analytics Sidebar', 'Can show analytics sidebar group.'),
      ('content.sidebar', 'Show Content Sidebar', 'Can show content sidebar group.'),
      ('content.categories.sidebar', 'Show Content Categories Sidebar', 'Can show content categories sidebar group.'),
      ('content.master_data.sidebar', 'Show Content Master Data Sidebar', 'Can show content master data sidebar group.'),
      ('institutions.sidebar', 'Show Institutions Sidebar', 'Can show institutions sidebar group.'),
      ('institutions.master.sidebar', 'Show Institution Master Sidebar', 'Can show institution master sidebar group.'),
      ('notifications.sidebar', 'Show Notifications Sidebar', 'Can show notifications sidebar group.'),
      ('tracker.sidebar', 'Show Tracker Sidebar', 'Can show tracker sidebar group.'),
      ('settings.sidebar', 'Show Settings Sidebar', 'Can show settings sidebar group.');

    CREATE TEMP TABLE tmp_page_modules (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO tmp_page_modules (code, name, description)
    VALUES
      ('dashboard', 'Dashboard', 'admin dashboard'),
      ('users.all', 'All Users', 'admin users'),
      ('users.leads', 'User Leads', 'user leads'),
      ('students.all', 'All Students', 'students'),
      ('students.attendance', 'Student Attendance', 'student attendance'),
      ('students.achievements', 'Student Achievements', 'student achievements'),
      ('students.assignments', 'Student Assignments', 'student assignments'),
      ('students.exams', 'Student Exams', 'student exams'),
      ('students.results_tc', 'Student Result / TC', 'student results and transfer certificates'),
      ('students.cards', 'Student Cards', 'student cards'),
      ('students.parents', 'Student Parents', 'student parents and guardians'),
      ('students.timetable', 'Student Time Table', 'student timetable'),
      ('students.notes', 'Student Notes', 'student notes'),
      ('analytics.overview', 'Analytics Overview', 'analytics overview'),
      ('analytics.reports', 'Analytics Reports', 'analytics reports'),
      ('content.categories.category_tree', 'Content Category Tree', 'content category tree'),
      ('content.categories.manage_categories', 'Content Manage Categories', 'content categories'),
      ('content.categories.boards', 'Content Boards', 'content boards'),
      ('content.categories.subjects', 'Content Subjects', 'content subjects'),
      ('content.master_data.skills', 'Content Master Skills', 'content skills'),
      ('content.master_data.designations', 'Content Master Designations', 'content designations'),
      ('content.master_data.locations', 'Content Master Locations', 'content locations'),
      ('content.media', 'Content Media', 'content media'),
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
      ('tracker.history', 'Tracker History', 'tracker history'),
      ('settings.general', 'Settings General', 'general settings'),
      ('settings.tracker', 'Settings Tracker', 'tracker settings'),
      ('settings.notifications', 'Notification Settings', 'notification types and templates'),
      ('settings.ai_settings', 'Settings AI', 'AI settings'),
      ('settings.security', 'Settings Security', 'security settings');

    INSERT INTO permissions (code, name, description)
    SELECT code, name, description
    FROM tmp_sidebar_permissions
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
    FROM tmp_page_modules modules
    CROSS JOIN actions
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          description = EXCLUDED.description;

    CREATE TEMP TABLE tmp_module_map (
      old_code TEXT NOT NULL,
      new_code TEXT NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO tmp_module_map (old_code, new_code)
    VALUES
      ('dashboard', 'dashboard'),
      ('users.all', 'users.all'),
      ('users.leads', 'users.leads'),
      ('students.all', 'students.all'),
      ('students.attendance', 'students.attendance'),
      ('students.achievements', 'students.achievements'),
      ('students.assignments', 'students.assignments'),
      ('students.exams', 'students.exams'),
      ('students.results_tc', 'students.results_tc'),
      ('students.cards', 'students.cards'),
      ('students.parents', 'students.parents'),
      ('students.timetable', 'students.timetable'),
      ('students.notes', 'students.notes'),
      ('analytics', 'analytics.overview'),
      ('analytics.reports', 'analytics.reports'),
      ('content.categories.tree', 'content.categories.category_tree'),
      ('content.categories.manage_categories', 'content.categories.manage_categories'),
      ('content.categories.boards', 'content.categories.boards'),
      ('content.categories.subjects', 'content.categories.subjects'),
      ('content.master.skills', 'content.master_data.skills'),
      ('content.master.designations', 'content.master_data.designations'),
      ('content.master.locations', 'content.master_data.locations'),
      ('content.media', 'content.media'),
      ('institutions.master.institution_type', 'institutions.master.institution_type'),
      ('institutions.master.institution_subtype', 'institutions.master.institution_subtype'),
      ('institutions.master.program_type', 'institutions.master.program_type'),
      ('institutions.master.facility_type', 'institutions.master.facility_type'),
      ('institutions.master.language', 'institutions.master.language'),
      ('institutions.institutions', 'institutions.institutions'),
      ('institutions.programs', 'institutions.programs'),
      ('institutions.placements', 'institutions.placements'),
      ('institutions.cutoffs', 'institutions.cutoffs'),
      ('institutions.scholarships', 'institutions.scholarships'),
      ('institutions.news', 'institutions.news'),
      ('notifications.all', 'notifications.all'),
      ('notifications.muted', 'notifications.muted'),
      ('notifications.controls', 'notifications.controls'),
      ('tracker', 'tracker.history'),
      ('settings.general', 'settings.general'),
      ('settings.tracker', 'settings.tracker'),
      ('settings.notifications', 'settings.notifications'),
      ('settings.ai', 'settings.ai_settings'),
      ('settings.security', 'settings.security');

    CREATE TEMP TABLE tmp_action_map (
      old_action TEXT NOT NULL,
      new_action TEXT NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO tmp_action_map (old_action, new_action)
    VALUES
      ('read', 'view'),
      ('create', 'create'),
      ('edit', 'edit'),
      ('delete', 'delete'),
      ('manage', 'view'),
      ('manage', 'create'),
      ('manage', 'edit'),
      ('manage', 'delete');

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT DISTINCT rp.role_id, new_permission.id
    FROM role_permissions rp
    INNER JOIN permissions old_permission ON old_permission.id = rp.permission_id
    INNER JOIN tmp_module_map module_map ON TRUE
    INNER JOIN tmp_action_map action_map ON old_permission.code = module_map.old_code || '.' || action_map.old_action
    INNER JOIN permissions new_permission ON new_permission.code = module_map.new_code || '.' || action_map.new_action
    ON CONFLICT DO NOTHING;

    INSERT INTO institution_role_permissions (institution_id, role_id, permission_id)
    SELECT DISTINCT irp.institution_id, irp.role_id, new_permission.id
    FROM institution_role_permissions irp
    INNER JOIN permissions old_permission ON old_permission.id = irp.permission_id
    INNER JOIN tmp_module_map module_map ON TRUE
    INNER JOIN tmp_action_map action_map ON old_permission.code = module_map.old_code || '.' || action_map.old_action
    INNER JOIN permissions new_permission ON new_permission.code = module_map.new_code || '.' || action_map.new_action
    ON CONFLICT DO NOTHING;

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT DISTINCT rp.role_id, new_permission.id
    FROM role_permissions rp
    INNER JOIN permissions old_permission ON old_permission.id = rp.permission_id
    INNER JOIN tmp_action_map action_map ON old_permission.code = 'institutions.master.' || action_map.old_action
    INNER JOIN tmp_page_modules child_modules ON child_modules.code LIKE 'institutions.master.%'
    INNER JOIN permissions new_permission ON new_permission.code = child_modules.code || '.' || action_map.new_action
    ON CONFLICT DO NOTHING;

    INSERT INTO institution_role_permissions (institution_id, role_id, permission_id)
    SELECT DISTINCT irp.institution_id, irp.role_id, new_permission.id
    FROM institution_role_permissions irp
    INNER JOIN permissions old_permission ON old_permission.id = irp.permission_id
    INNER JOIN tmp_action_map action_map ON old_permission.code = 'institutions.master.' || action_map.old_action
    INNER JOIN tmp_page_modules child_modules ON child_modules.code LIKE 'institutions.master.%'
    INNER JOIN permissions new_permission ON new_permission.code = child_modules.code || '.' || action_map.new_action
    ON CONFLICT DO NOTHING;

    CREATE TEMP TABLE tmp_sidebar_map (
      sidebar_code TEXT NOT NULL,
      pattern TEXT NOT NULL
    ) ON COMMIT DROP;

    INSERT INTO tmp_sidebar_map (sidebar_code, pattern)
    VALUES
      ('dashboard.sidebar', 'dashboard.%'),
      ('users.sidebar', 'users.%'),
      ('students.sidebar', 'students.%'),
      ('analytics.sidebar', 'analytics.%'),
      ('content.sidebar', 'content.%'),
      ('content.categories.sidebar', 'content.categories.%'),
      ('content.master_data.sidebar', 'content.master_data.%'),
      ('institutions.sidebar', 'institutions.%'),
      ('institutions.master.sidebar', 'institutions.master.%'),
      ('notifications.sidebar', 'notifications.%'),
      ('tracker.sidebar', 'tracker.%'),
      ('settings.sidebar', 'settings.%');

    INSERT INTO role_permissions (role_id, permission_id)
    SELECT DISTINCT rp.role_id, sidebar_permission.id
    FROM role_permissions rp
    INNER JOIN permissions existing_permission ON existing_permission.id = rp.permission_id
    INNER JOIN tmp_sidebar_map sidebar_map ON existing_permission.code LIKE sidebar_map.pattern
    INNER JOIN permissions sidebar_permission ON sidebar_permission.code = sidebar_map.sidebar_code
    ON CONFLICT DO NOTHING;

    INSERT INTO institution_role_permissions (institution_id, role_id, permission_id)
    SELECT DISTINCT irp.institution_id, irp.role_id, sidebar_permission.id
    FROM institution_role_permissions irp
    INNER JOIN permissions existing_permission ON existing_permission.id = irp.permission_id
    INNER JOIN tmp_sidebar_map sidebar_map ON existing_permission.code LIKE sidebar_map.pattern
    INNER JOIN permissions sidebar_permission ON sidebar_permission.code = sidebar_map.sidebar_code
    ON CONFLICT DO NOTHING;

    CREATE TEMP TABLE tmp_obsolete_permissions AS
    SELECT p.id
    FROM permissions p
    WHERE
      p.code IN ('institutions.master.read', 'institutions.master.create', 'institutions.master.edit', 'institutions.master.delete', 'institutions.master.manage')
      OR p.code ~ '\.read$'
      OR p.code ~ '\.manage$'
      OR p.code LIKE 'analytics.%'
         AND p.code NOT LIKE 'analytics.overview.%'
         AND p.code NOT LIKE 'analytics.reports.%'
         AND p.code <> 'analytics.sidebar'
      OR p.code LIKE 'content.categories.tree.%'
      OR p.code LIKE 'content.master.%'
      OR p.code LIKE 'settings.ai.%'
      OR p.code LIKE 'tracker.%'
         AND p.code NOT LIKE 'tracker.history.%'
         AND p.code <> 'tracker.sidebar';

    DELETE FROM role_permissions
    WHERE permission_id IN (SELECT id FROM tmp_obsolete_permissions);

    DELETE FROM institution_role_permissions
    WHERE permission_id IN (SELECT id FROM tmp_obsolete_permissions);

    DELETE FROM permissions
    WHERE id IN (SELECT id FROM tmp_obsolete_permissions);

    INSERT INTO app_migrations (key)
    VALUES ('2026-06-06_permission_sidebar_view_refactor');
  END IF;
END $$;
