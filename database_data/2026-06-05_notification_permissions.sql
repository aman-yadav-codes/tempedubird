INSERT INTO permissions (code, name, description)
VALUES
  ('notifications.all.read', 'View All Notifications', 'Can view the notification inbox page.'),
  ('notifications.all.create', 'Create All Notifications', 'Can create notification records.'),
  ('notifications.all.edit', 'Edit All Notifications', 'Can update notification records.'),
  ('notifications.all.delete', 'Delete All Notifications', 'Can delete notification records.'),
  ('notifications.all.manage', 'Manage All Notifications', 'Can create, view, edit, and delete notification records.'),
  ('notifications.muted.read', 'View Muted Notifications', 'Can view muted notification preferences.'),
  ('notifications.muted.create', 'Create Muted Notifications', 'Can create muted notification preferences.'),
  ('notifications.muted.edit', 'Edit Muted Notifications', 'Can update muted notification preferences.'),
  ('notifications.muted.delete', 'Delete Muted Notifications', 'Can delete muted notification preferences.'),
  ('notifications.muted.manage', 'Manage Muted Notifications', 'Can create, view, edit, and delete muted notification preferences.'),
  ('notifications.controls.read', 'View Notification Controls', 'Can view institution notification controls.'),
  ('notifications.controls.create', 'Create Notification Controls', 'Can create institution notification controls.'),
  ('notifications.controls.edit', 'Edit Notification Controls', 'Can update institution notification controls.'),
  ('notifications.controls.delete', 'Delete Notification Controls', 'Can delete institution notification controls.'),
  ('notifications.controls.manage', 'Manage Notification Controls', 'Can create, view, edit, and delete institution notification controls.'),
  ('settings.notifications.read', 'View Platform Notification Types', 'Can view platform notification type settings.'),
  ('settings.notifications.create', 'Create Platform Notification Types', 'Can create platform notification types.'),
  ('settings.notifications.edit', 'Edit Platform Notification Types', 'Can update platform notification types.'),
  ('settings.notifications.delete', 'Delete Platform Notification Types', 'Can delete platform notification types.'),
  ('settings.notifications.manage', 'Manage Platform Notification Types', 'Can create, view, edit, and delete platform notification types.')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description;
