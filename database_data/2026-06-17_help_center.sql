CREATE TABLE IF NOT EXISTS help_categories (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER NULL,
    name VARCHAR(150) NOT NULL,
    slug VARCHAR(150) NOT NULL UNIQUE,
    icon VARCHAR(100),
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_help_category_parent'
    ) THEN
        ALTER TABLE help_categories
        ADD CONSTRAINT fk_help_category_parent
        FOREIGN KEY (parent_id)
        REFERENCES help_categories(id)
        ON DELETE SET NULL;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS help_articles (
    id SERIAL PRIMARY KEY,
    category_id INTEGER NOT NULL REFERENCES help_categories(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    summary TEXT,
    content_md TEXT NOT NULL,
    visibility VARCHAR(30) NOT NULL DEFAULT 'PUBLIC',
    estimated_read_minutes INTEGER,
    difficulty_level VARCHAR(20),
    is_featured BOOLEAN DEFAULT FALSE,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMP,
    search_keywords TEXT,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS help_article_permissions (
    article_id INTEGER NOT NULL REFERENCES help_articles(id) ON DELETE CASCADE,
    permission_id INTEGER NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY(article_id, permission_id)
);

CREATE TABLE IF NOT EXISTS help_article_assets (
    id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES help_articles(id) ON DELETE CASCADE,
    asset_type VARCHAR(20) NOT NULL,
    title VARCHAR(255),
    file_url TEXT NOT NULL,
    thumbnail_url TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS help_article_faqs (
    id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES help_articles(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS help_article_relations (
    article_id INTEGER NOT NULL REFERENCES help_articles(id) ON DELETE CASCADE,
    related_article_id INTEGER NOT NULL REFERENCES help_articles(id) ON DELETE CASCADE,
    PRIMARY KEY(article_id, related_article_id)
);

CREATE TABLE IF NOT EXISTS help_search_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id INTEGER NULL REFERENCES users(id),
    search_term TEXT NOT NULL,
    results_count INTEGER DEFAULT 0,
    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS help_article_views (
    id BIGSERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES help_articles(id) ON DELETE CASCADE,
    user_id INTEGER NULL REFERENCES users(id),
    viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS help_recent_updates (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    href TEXT,
    update_date DATE NOT NULL DEFAULT CURRENT_DATE,
    sort_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_help_articles_category ON help_articles(category_id);
CREATE INDEX IF NOT EXISTS idx_help_articles_visibility ON help_articles(visibility);
CREATE INDEX IF NOT EXISTS idx_help_articles_published ON help_articles(is_published);
CREATE INDEX IF NOT EXISTS idx_help_articles_slug ON help_articles(slug);
CREATE INDEX IF NOT EXISTS idx_help_assets_article ON help_article_assets(article_id);
CREATE INDEX IF NOT EXISTS idx_help_faq_article ON help_article_faqs(article_id);
CREATE INDEX IF NOT EXISTS idx_help_search_term ON help_search_logs(search_term);
CREATE INDEX IF NOT EXISTS idx_help_views_article ON help_article_views(article_id);
CREATE INDEX IF NOT EXISTS idx_help_categories_parent ON help_categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_help_categories_sort ON help_categories(sort_order);
CREATE INDEX IF NOT EXISTS idx_help_recent_updates_published ON help_recent_updates(is_published);
CREATE INDEX IF NOT EXISTS idx_help_recent_updates_date ON help_recent_updates(update_date);

INSERT INTO help_categories (name, slug, icon, description, sort_order, is_active)
VALUES
  ('Getting Started', 'getting-started', 'started', 'First login, dashboard, and setup path.', 1, TRUE),
  ('Institution Setup', 'institution-setup', 'institution', 'Create institutions, sessions, programs, and sections.', 2, TRUE),
  ('Attendance', 'attendance', 'attendance', 'Setup, mark, edit, and report attendance.', 3, TRUE),
  ('Assignments', 'assignments', 'assignments', 'Create assignments, collect submissions, and grade work.', 4, TRUE),
  ('Students', 'students', 'students', 'Admissions, profiles, enrolment, promotions, and records.', 5, TRUE),
  ('Teachers', 'teachers', 'teachers', 'Teacher profiles, subject mapping, and class responsibilities.', 6, TRUE),
  ('Timetable', 'timetable', 'timetable', 'Slots, subject teachers, class teachers, and schedules.', 7, TRUE),
  ('Exams & Results', 'exams-results', 'exams', 'Exam setup, marks entry, grading, and publishing results.', 8, TRUE),
  ('Reports', 'reports', 'reports', 'Attendance, performance, assignment, and institution reports.', 9, TRUE),
  ('Roles & Permissions', 'roles-permissions', 'roles', 'Role access, institution overrides, and permission matrix.', 10, TRUE),
  ('Mobile App', 'mobile-app', 'mobile', 'Student, parent, and staff mobile workflows.', 11, TRUE),
  ('Troubleshooting', 'troubleshooting', 'troubleshooting', 'Fix common setup, access, and data issues.', 12, TRUE)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_articles (
  category_id, title, slug, summary, content_md, visibility, estimated_read_minutes,
  difficulty_level, is_featured, is_published, published_at, search_keywords
)
SELECT c.id,
       'Attendance Setup',
       'attendance-setup',
       'Prepare classes, students, timetable slots, and attendance marking.',
       '# Attendance Setup

Attendance setup prepares classes and timetable slots before attendance can be marked.

## Prerequisites

- Institution created
- Academic session active
- Classes created
- Students added

## Steps

1. Create Academic Session
2. Create Classes
3. Assign Class Teacher
4. Create Timetable
5. Add Students
6. Start Marking Attendance',
       'PUBLIC',
       4,
       'Beginner',
       TRUE,
       TRUE,
       NOW(),
       'attendance setup classes timetable students'
FROM help_categories c
WHERE c.slug = 'attendance'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO help_recent_updates (title, description, href, update_date, sort_order, is_published)
SELECT *
FROM (
  VALUES
    ('Help Center command search with Ctrl+K', 'Open Help Center search from anywhere with the keyboard shortcut.', '/help', DATE '2026-06-17', 1, TRUE),
    ('Student classroom assignment submission flow', 'Students can open, answer, and submit classroom assignments.', '/help/assignments', DATE '2026-06-16', 2, TRUE),
    ('Institution syllabus update workflow', 'Institution admins can update inherited syllabus copies from marketplace versions.', '/help/institution-setup', DATE '2026-06-15', 3, TRUE),
    ('Assignment checking and marks visibility', 'Teachers can review submissions and students can see awarded marks.', '/help/assignments', DATE '2026-06-14', 4, TRUE)
) AS seed(title, description, href, update_date, sort_order, is_published)
WHERE NOT EXISTS (SELECT 1 FROM help_recent_updates);
