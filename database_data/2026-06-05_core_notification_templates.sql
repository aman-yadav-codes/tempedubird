INSERT INTO notification_templates (code, title_template, body_template, is_active)
VALUES
  (
    'users.module.update',
    'Account Updated',
    '{{actor_name}} updated your account.',
    TRUE
  ),
  (
    'users.module.activate',
    'Account Activated',
    '{{user_name}} has been activated.',
    TRUE
  ),
  (
    'users.module.deactivate',
    'Account Deactivated',
    '{{user_name}} has been deactivated.',
    TRUE
  ),
  (
    'institutions.module.update',
    'Institution Module Updated',
    '{{actor_name}} made a change in {{module_name}} for {{institution_name}}.',
    TRUE
  ),
  (
    'institutions.profile.update',
    'Institution Updated',
    '{{actor_name}} updated {{institution_name}}.',
    TRUE
  ),
  (
    'institutions.profile.activate',
    'Institution Activated',
    '{{institution_name}} has been activated.',
    TRUE
  ),
  (
    'institutions.profile.deactivate',
    'Institution Deactivated',
    '{{institution_name}} has been deactivated.',
    TRUE
  )
ON CONFLICT (code) DO UPDATE SET
  title_template = EXCLUDED.title_template,
  body_template = EXCLUDED.body_template,
  is_active = EXCLUDED.is_active,
  updated_at = CURRENT_TIMESTAMP;
