BEGIN;

WITH notification_renames(old_code, new_code) AS (
  VALUES
    ('users.all.updated', 'users.module.update'),
    ('users.all.activated', 'users.module.activate'),
    ('users.all.deactivated', 'users.module.deactivate'),
    ('institutions.module.updated', 'institutions.module.update'),
    ('institutions.profile.updated', 'institutions.profile.update'),
    ('institutions.profile.activated', 'institutions.profile.activate'),
    ('institutions.profile.deactivated', 'institutions.profile.deactivate')
),
old_preferences AS (
  SELECT
    np.user_id,
    nr.new_code AS notification_type,
    BOOL_AND(np.is_enabled) AS is_enabled
  FROM notification_preferences np
  INNER JOIN notification_renames nr ON nr.old_code = np.notification_type
  GROUP BY np.user_id, nr.new_code
),
deleted_old_preferences AS (
  DELETE FROM notification_preferences np
  USING notification_renames nr
  WHERE np.notification_type = nr.old_code
)
INSERT INTO notification_preferences (user_id, notification_type, is_enabled, updated_at)
SELECT user_id, notification_type, is_enabled, CURRENT_TIMESTAMP
FROM old_preferences
ON CONFLICT (user_id, notification_type)
DO UPDATE SET
  is_enabled = notification_preferences.is_enabled AND EXCLUDED.is_enabled,
  updated_at = CURRENT_TIMESTAMP;

WITH notification_renames(old_code, new_code) AS (
  VALUES
    ('users.all.updated', 'users.module.update'),
    ('users.all.activated', 'users.module.activate'),
    ('users.all.deactivated', 'users.module.deactivate'),
    ('institutions.module.updated', 'institutions.module.update'),
    ('institutions.profile.updated', 'institutions.profile.update'),
    ('institutions.profile.activated', 'institutions.profile.activate'),
    ('institutions.profile.deactivated', 'institutions.profile.deactivate')
),
old_settings AS (
  SELECT
    ins.institution_id,
    nr.new_code AS notification_type,
    BOOL_AND(ins.is_enabled) AS is_enabled
  FROM institution_notification_settings ins
  INNER JOIN notification_renames nr ON nr.old_code = ins.notification_type
  GROUP BY ins.institution_id, nr.new_code
),
deleted_old_settings AS (
  DELETE FROM institution_notification_settings ins
  USING notification_renames nr
  WHERE ins.notification_type = nr.old_code
)
INSERT INTO institution_notification_settings (institution_id, notification_type, is_enabled, updated_at)
SELECT institution_id, notification_type, is_enabled, CURRENT_TIMESTAMP
FROM old_settings
ON CONFLICT (institution_id, notification_type)
DO UPDATE SET
  is_enabled = institution_notification_settings.is_enabled AND EXCLUDED.is_enabled,
  updated_at = CURRENT_TIMESTAMP;

WITH notification_renames(old_code, new_code) AS (
  VALUES
    ('users.all.updated', 'users.module.update'),
    ('users.all.activated', 'users.module.activate'),
    ('users.all.deactivated', 'users.module.deactivate'),
    ('institutions.module.updated', 'institutions.module.update'),
    ('institutions.profile.updated', 'institutions.profile.update'),
    ('institutions.profile.activated', 'institutions.profile.activate'),
    ('institutions.profile.deactivated', 'institutions.profile.deactivate')
)
UPDATE notifications n
SET type = nr.new_code
FROM notification_renames nr
WHERE n.type = nr.old_code;

WITH notification_renames(old_code, new_code) AS (
  VALUES
    ('users.all.updated', 'users.module.update'),
    ('users.all.activated', 'users.module.activate'),
    ('users.all.deactivated', 'users.module.deactivate'),
    ('institutions.module.updated', 'institutions.module.update'),
    ('institutions.profile.updated', 'institutions.profile.update'),
    ('institutions.profile.activated', 'institutions.profile.activate'),
    ('institutions.profile.deactivated', 'institutions.profile.deactivate')
),
templates_to_move AS (
  SELECT nt.*, nr.new_code
  FROM notification_templates nt
  INNER JOIN notification_renames nr ON nr.old_code = nt.code
  WHERE NOT EXISTS (
    SELECT 1 FROM notification_templates existing WHERE existing.code = nr.new_code
  )
)
UPDATE notification_templates nt
SET code = templates_to_move.new_code,
    updated_at = CURRENT_TIMESTAMP
FROM templates_to_move
WHERE nt.id = templates_to_move.id;

WITH notification_renames(old_code, new_code) AS (
  VALUES
    ('users.all.updated', 'users.module.update'),
    ('users.all.activated', 'users.module.activate'),
    ('users.all.deactivated', 'users.module.deactivate'),
    ('institutions.module.updated', 'institutions.module.update'),
    ('institutions.profile.updated', 'institutions.profile.update'),
    ('institutions.profile.activated', 'institutions.profile.activate'),
    ('institutions.profile.deactivated', 'institutions.profile.deactivate')
)
DELETE FROM notification_templates nt
USING notification_renames nr
WHERE nt.code = nr.old_code;

INSERT INTO notification_templates (code, title_template, body_template, is_active, updated_at)
VALUES
  ('users.module.update', 'User Module Updated', '{{actor_name}} updated your account.', TRUE, CURRENT_TIMESTAMP),
  ('users.module.activate', 'User Activated', '{{user_name}} has been activated.', TRUE, CURRENT_TIMESTAMP),
  ('users.module.deactivate', 'User Deactivated', '{{user_name}} has been deactivated.', TRUE, CURRENT_TIMESTAMP),
  ('institutions.module.update', 'Institution Module Updated', '{{actor_name}} made a change in {{module_name}} for {{institution_name}}.', TRUE, CURRENT_TIMESTAMP),
  ('institutions.profile.update', 'Institution Updated', '{{actor_name}} updated {{institution_name}}.', TRUE, CURRENT_TIMESTAMP),
  ('institutions.profile.activate', 'Institution Activated', '{{institution_name}} has been activated.', TRUE, CURRENT_TIMESTAMP),
  ('institutions.profile.deactivate', 'Institution Deactivated', '{{institution_name}} has been deactivated.', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (code) DO UPDATE SET
  title_template = EXCLUDED.title_template,
  body_template = EXCLUDED.body_template,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;

COMMIT;
