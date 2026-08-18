-- Scalable lifecycle/context foundation for institutions, users, memberships, enrollments,
-- student historical records, and generated documents.
--
-- Design goals:
-- - Additive/backward-compatible changes only.
-- - No hard deletes for important business records.
-- - One generic entity lifecycle stream for audit/history.
-- - One membership history stream for people-institution relationships.
-- - Enrollment remains the student academic-history master.
-- - Historical records can pin exact enrollment/membership/lifecycle context.

BEGIN;

CREATE TABLE IF NOT EXISTS entity_lifecycle (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    institution_id INT NULL REFERENCES institution_profiles(id) ON DELETE SET NULL,
    parent_entity_id BIGINT NULL,
    status VARCHAR(50) NOT NULL,
    effective_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_to TIMESTAMP NULL,
    created_by INT NULL REFERENCES users(id) ON DELETE SET NULL,
    updated_by INT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    notes TEXT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT chk_entity_lifecycle_effective_range
        CHECK (effective_to IS NULL OR effective_to >= effective_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_entity_lifecycle_current
ON entity_lifecycle(entity_type, entity_id, COALESCE(institution_id, -1))
WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_entity_lifecycle_entity
ON entity_lifecycle(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_entity_lifecycle_institution
ON entity_lifecycle(institution_id);

CREATE INDEX IF NOT EXISTS idx_entity_lifecycle_status
ON entity_lifecycle(status);

CREATE INDEX IF NOT EXISTS idx_entity_lifecycle_current
ON entity_lifecycle(is_current);

CREATE INDEX IF NOT EXISTS idx_entity_lifecycle_metadata
ON entity_lifecycle USING GIN(metadata);

CREATE TABLE IF NOT EXISTS institution_membership_history (
    id BIGSERIAL PRIMARY KEY,
    membership_id BIGINT NULL REFERENCES institution_memberships(id) ON DELETE SET NULL,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id INT NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
    role_id INT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    join_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    leave_date TIMESTAMP NULL,
    previous_membership_history_id BIGINT NULL REFERENCES institution_membership_history(id) ON DELETE SET NULL,
    is_current BOOLEAN NOT NULL DEFAULT TRUE,
    created_by INT NULL REFERENCES users(id) ON DELETE SET NULL,
    updated_by INT NULL REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT chk_membership_history_date_range
        CHECK (leave_date IS NULL OR leave_date >= join_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_membership_history_current
ON institution_membership_history(user_id, institution_id)
WHERE is_current = TRUE;

CREATE INDEX IF NOT EXISTS idx_membership_history_membership
ON institution_membership_history(membership_id);

CREATE INDEX IF NOT EXISTS idx_membership_history_user
ON institution_membership_history(user_id);

CREATE INDEX IF NOT EXISTS idx_membership_history_institution
ON institution_membership_history(institution_id);

CREATE INDEX IF NOT EXISTS idx_membership_history_role
ON institution_membership_history(role_id);

CREATE INDEX IF NOT EXISTS idx_membership_history_status
ON institution_membership_history(status);

CREATE INDEX IF NOT EXISTS idx_membership_history_current
ON institution_membership_history(is_current);

CREATE INDEX IF NOT EXISTS idx_membership_history_metadata
ON institution_membership_history USING GIN(metadata);

ALTER TABLE institution_memberships
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    ADD COLUMN IF NOT EXISTS join_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS leave_date TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS previous_membership_id BIGINT NULL,
    ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS remarks TEXT NULL,
    ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS deleted_by INT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_institution_memberships_previous'
  ) THEN
    ALTER TABLE institution_memberships
      ADD CONSTRAINT fk_institution_memberships_previous
      FOREIGN KEY (previous_membership_id)
      REFERENCES institution_memberships(id)
      ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_institution_memberships_deleted_by'
  ) THEN
    ALTER TABLE institution_memberships
      ADD CONSTRAINT fk_institution_memberships_deleted_by
      FOREIGN KEY (deleted_by)
      REFERENCES users(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_institution_memberships_current
ON institution_memberships(is_current);

CREATE INDEX IF NOT EXISTS idx_institution_memberships_status
ON institution_memberships(status);

CREATE INDEX IF NOT EXISTS idx_institution_memberships_deleted
ON institution_memberships(is_deleted);

CREATE INDEX IF NOT EXISTS idx_institution_memberships_active_context
ON institution_memberships(institution_id, user_id, role_id)
WHERE is_current = TRUE AND is_active = TRUE AND is_deleted = FALSE;

UPDATE institution_memberships
SET
  status = CASE WHEN COALESCE(is_active, TRUE) = TRUE THEN 'ACTIVE' ELSE 'SUSPENDED' END,
  is_current = COALESCE(is_active, TRUE),
  join_date = COALESCE(created_at, CURRENT_TIMESTAMP)
WHERE status IS NULL
   OR join_date IS NULL;

ALTER TABLE student_enrollments
    ADD COLUMN IF NOT EXISTS promotion_type VARCHAR(50) NULL,
    ADD COLUMN IF NOT EXISTS promotion_notes TEXT NULL,
    ADD COLUMN IF NOT EXISTS promoted_by INT NULL REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS effective_from TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS effective_to TIMESTAMP NULL,
    ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS lifecycle_id BIGINT NULL REFERENCES entity_lifecycle(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS deleted_by INT NULL REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_student_enrollments_current
ON student_enrollments(is_current);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_lifecycle
ON student_enrollments(lifecycle_id);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_previous
ON student_enrollments(previous_enrollment_id);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_context
ON student_enrollments(student_id, institution_id, academic_year_id, is_current);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_promotion_type
ON student_enrollments(promotion_type);

DO $$
DECLARE
  lifecycle_table text;
  soft_delete_tables text[] := ARRAY[
    'institution_profiles',
    'institution_programs',
    'institution_facilities',
    'institution_news',
    'institution_cutoffs',
    'institution_scholarships',
    'academic_years',
    'institution_academic_classes',
    'institution_class_sections',
    'assignments',
    'assignment_templates',
    'student_assignment_answers',
    'student_practice_exam_answers',
    'document_generation_data',
    'support_ticket_attachments',
    'support_ticket_messages',
    'support_ticket_history',
    'support_tickets',
    'help_articles',
    'help_categories',
    'help_recent_updates',
    'institution_media',
    'institution_calendar_events',
    'institution_placements'
  ];
BEGIN
  FOREACH lifecycle_table IN ARRAY soft_delete_tables LOOP
    IF to_regclass(format('public.%I', lifecycle_table)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN NOT NULL DEFAULT FALSE', lifecycle_table);
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL', lifecycle_table);
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS deleted_by INT NULL REFERENCES users(id) ON DELETE SET NULL', lifecycle_table);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_deleted ON %I(is_deleted)', lifecycle_table, lifecycle_table);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  context_table text;
  enrollment_context_tables text[] := ARRAY[
    'student_assignments',
    'student_assignment_answers',
    'student_attendance',
    'student_period_attendance',
    'student_practice_exam_attempts',
    'student_practice_exam_answers',
    'student_practice_exam_results',
    'student_achievements',
    'student_documents',
    'generated_documents',
    'document_generation_data'
  ];
BEGIN
  FOREACH context_table IN ARRAY enrollment_context_tables LOOP
    IF to_regclass(format('public.%I', context_table)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS enrollment_id INT NULL REFERENCES student_enrollments(id) ON DELETE SET NULL', context_table);
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS lifecycle_id BIGINT NULL REFERENCES entity_lifecycle(id) ON DELETE SET NULL', context_table);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_enrollment ON %I(enrollment_id)', context_table, context_table);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_lifecycle ON %I(lifecycle_id)', context_table, context_table);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  snapshot_table text;
  snapshot_tables text[] := ARRAY[
    'student_achievements',
    'student_documents',
    'generated_documents',
    'document_generation_data',
    'student_practice_exam_attempts',
    'student_practice_exam_results',
    'student_assignments'
  ];
BEGIN
  FOREACH snapshot_table IN ARRAY snapshot_tables LOOP
    IF to_regclass(format('public.%I', snapshot_table)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS context_snapshot JSONB NOT NULL DEFAULT ''{}''::jsonb', snapshot_table);
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%s_context_snapshot ON %I USING GIN(context_snapshot)', snapshot_table, snapshot_table);
    END IF;
  END LOOP;
END $$;

UPDATE student_assignments sa
SET enrollment_id = se.id
FROM student_enrollments se
WHERE sa.enrollment_id IS NULL
  AND se.student_id = sa.student_id
  AND COALESCE(se.is_deleted, FALSE) = FALSE
  AND COALESCE(se.is_current, TRUE) = TRUE;

UPDATE student_assignment_answers saa
SET enrollment_id = sa.enrollment_id
FROM student_assignments sa
WHERE saa.enrollment_id IS NULL
  AND saa.student_assignment_id = sa.id
  AND sa.enrollment_id IS NOT NULL;

UPDATE student_attendance sta
SET enrollment_id = se.id
FROM student_enrollments se
WHERE sta.enrollment_id IS NULL
  AND sta.student_id = se.student_id
  AND COALESCE(se.is_deleted, FALSE) = FALSE
  AND COALESCE(se.is_current, TRUE) = TRUE;

UPDATE student_period_attendance spa
SET enrollment_id = se.id
FROM student_enrollments se
WHERE spa.enrollment_id IS NULL
  AND spa.student_id = se.student_id
  AND COALESCE(se.is_deleted, FALSE) = FALSE
  AND COALESCE(se.is_current, TRUE) = TRUE;

UPDATE student_practice_exam_attempts spea
SET enrollment_id = se.id
FROM student_enrollments se
WHERE spea.enrollment_id IS NULL
  AND spea.student_id = se.student_id
  AND COALESCE(se.is_deleted, FALSE) = FALSE
  AND COALESCE(se.is_current, TRUE) = TRUE;

UPDATE student_practice_exam_answers speans
SET enrollment_id = spea.enrollment_id
FROM student_practice_exam_attempts spea
WHERE speans.enrollment_id IS NULL
  AND speans.attempt_id = spea.id
  AND spea.enrollment_id IS NOT NULL;

UPDATE student_practice_exam_results sper
SET enrollment_id = spea.enrollment_id
FROM student_practice_exam_attempts spea
WHERE sper.enrollment_id IS NULL
  AND sper.attempt_id = spea.id
  AND spea.enrollment_id IS NOT NULL;

UPDATE student_achievements ach
SET enrollment_id = se.id
FROM student_enrollments se
WHERE ach.enrollment_id IS NULL
  AND ach.student_id = se.student_id
  AND COALESCE(se.is_deleted, FALSE) = FALSE
  AND COALESCE(se.is_current, TRUE) = TRUE;

UPDATE student_documents doc
SET enrollment_id = se.id
FROM student_enrollments se
WHERE doc.enrollment_id IS NULL
  AND doc.student_id = se.student_id
  AND COALESCE(se.is_deleted, FALSE) = FALSE
  AND COALESCE(se.is_current, TRUE) = TRUE;

COMMIT;
