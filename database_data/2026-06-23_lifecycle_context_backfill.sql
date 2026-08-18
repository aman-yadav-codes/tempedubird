-- Backfill lifecycle/context records for existing data.
-- Safe to rerun: inserts only missing lifecycle/history rows.

BEGIN;

INSERT INTO entity_lifecycle (
  entity_type,
  entity_id,
  institution_id,
  status,
  effective_from,
  created_by,
  updated_by,
  is_current,
  notes,
  metadata
)
SELECT
  'INSTITUTION',
  ip.id,
  ip.id,
  UPPER(COALESCE(NULLIF(ip.status, ''), CASE WHEN ip.is_active THEN 'active' ELSE 'suspended' END)),
  COALESCE(ip.created_at, CURRENT_TIMESTAMP),
  ip.created_by,
  ip.updated_by,
  CASE WHEN COALESCE(ip.is_deleted, FALSE) = FALSE AND COALESCE(ip.status, 'active') NOT IN ('deleted', 'archived') THEN TRUE ELSE FALSE END,
  'Backfilled institution lifecycle',
  jsonb_build_object('is_active', ip.is_active, 'is_deleted', ip.is_deleted)
FROM institution_profiles ip
WHERE NOT EXISTS (
  SELECT 1
  FROM entity_lifecycle el
  WHERE el.entity_type = 'INSTITUTION'
    AND el.entity_id = ip.id
);

INSERT INTO entity_lifecycle (
  entity_type,
  entity_id,
  status,
  effective_from,
  created_by,
  updated_by,
  is_current,
  notes,
  metadata
)
SELECT
  'USER',
  u.id,
  CASE WHEN COALESCE(u.is_deleted, FALSE) THEN 'DELETED' WHEN COALESCE(u.is_active, TRUE) THEN 'ACTIVE' ELSE 'SUSPENDED' END,
  COALESCE(u.created_at, CURRENT_TIMESTAMP),
  u.created_by,
  u.updated_by,
  COALESCE(u.is_deleted, FALSE) = FALSE,
  'Backfilled user lifecycle',
  jsonb_build_object('email', u.email, 'is_active', u.is_active, 'is_deleted', u.is_deleted)
FROM users u
WHERE NOT EXISTS (
  SELECT 1
  FROM entity_lifecycle el
  WHERE el.entity_type = 'USER'
    AND el.entity_id = u.id
);

INSERT INTO institution_membership_history (
  membership_id,
  user_id,
  institution_id,
  role_id,
  status,
  join_date,
  leave_date,
  is_current,
  created_at,
  updated_at,
  remarks,
  metadata
)
SELECT
  im.id,
  im.user_id,
  im.institution_id,
  im.role_id,
  CASE
    WHEN COALESCE(im.is_deleted, FALSE) THEN 'LEFT'
    WHEN COALESCE(im.is_active, TRUE) THEN 'ACTIVE'
    ELSE 'SUSPENDED'
  END,
  COALESCE(im.join_date, im.created_at, CURRENT_TIMESTAMP),
  im.leave_date,
  COALESCE(im.is_current, COALESCE(im.is_active, TRUE)),
  COALESCE(im.created_at, CURRENT_TIMESTAMP),
  COALESCE(im.updated_at, CURRENT_TIMESTAMP),
  'Backfilled membership history',
  '{}'::jsonb
FROM institution_memberships im
WHERE NOT EXISTS (
  SELECT 1
  FROM institution_membership_history imh
  WHERE imh.membership_id = im.id
);

INSERT INTO entity_lifecycle (
  entity_type,
  entity_id,
  institution_id,
  parent_entity_id,
  status,
  effective_from,
  effective_to,
  created_by,
  updated_by,
  is_current,
  notes,
  metadata
)
SELECT
  'MEMBERSHIP',
  im.id,
  im.institution_id,
  im.user_id,
  CASE
    WHEN COALESCE(im.is_deleted, FALSE) THEN 'LEFT'
    WHEN COALESCE(im.is_active, TRUE) THEN 'ACTIVE'
    ELSE 'SUSPENDED'
  END,
  COALESCE(im.join_date, im.created_at, CURRENT_TIMESTAMP),
  im.leave_date,
  NULL,
  NULL,
  COALESCE(im.is_current, COALESCE(im.is_active, TRUE)),
  'Backfilled membership lifecycle',
  jsonb_build_object('user_id', im.user_id, 'role_id', im.role_id)
FROM institution_memberships im
WHERE NOT EXISTS (
  SELECT 1
  FROM entity_lifecycle el
  WHERE el.entity_type = 'MEMBERSHIP'
    AND el.entity_id = im.id
);

INSERT INTO entity_lifecycle (
  entity_type,
  entity_id,
  institution_id,
  parent_entity_id,
  status,
  effective_from,
  effective_to,
  created_by,
  updated_by,
  is_current,
  notes,
  metadata
)
SELECT
  'ENROLLMENT',
  se.id,
  se.institution_id,
  se.student_id,
  UPPER(COALESCE(NULLIF(se.status, ''), 'active')),
  COALESCE(se.effective_from, se.admission_date::timestamp, se.created_at, CURRENT_TIMESTAMP),
  se.effective_to,
  se.created_by,
  se.updated_by,
  COALESCE(se.is_current, COALESCE(se.status, 'active') = 'active'),
  'Backfilled enrollment lifecycle',
  jsonb_build_object(
    'academic_year_id', se.academic_year_id,
    'program_id', se.program_id,
    'class_category_id', se.class_category_id,
    'section_id', se.section_id
  )
FROM student_enrollments se
WHERE NOT EXISTS (
  SELECT 1
  FROM entity_lifecycle el
  WHERE el.entity_type = 'ENROLLMENT'
    AND el.entity_id = se.id
);

UPDATE student_enrollments se
SET lifecycle_id = el.id
FROM entity_lifecycle el
WHERE se.lifecycle_id IS NULL
  AND el.entity_type = 'ENROLLMENT'
  AND el.entity_id = se.id;

COMMIT;
