BEGIN;

CREATE TABLE IF NOT EXISTS app_migrations (
  key TEXT PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT timezone('Asia/Kolkata', NOW())
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM app_migrations
    WHERE key = '2026-06-05_notification_timestamps_ist'
  ) THEN
    ALTER TABLE notifications
      ALTER COLUMN created_at SET DEFAULT timezone('Asia/Kolkata', NOW());

    ALTER TABLE notification_recipients
      ALTER COLUMN created_at SET DEFAULT timezone('Asia/Kolkata', NOW());

    ALTER TABLE notification_templates
      ALTER COLUMN created_at SET DEFAULT timezone('Asia/Kolkata', NOW()),
      ALTER COLUMN updated_at SET DEFAULT timezone('Asia/Kolkata', NOW());

    ALTER TABLE notification_preferences
      ALTER COLUMN created_at SET DEFAULT timezone('Asia/Kolkata', NOW()),
      ALTER COLUMN updated_at SET DEFAULT timezone('Asia/Kolkata', NOW());

    ALTER TABLE institution_notification_settings
      ALTER COLUMN created_at SET DEFAULT timezone('Asia/Kolkata', NOW()),
      ALTER COLUMN updated_at SET DEFAULT timezone('Asia/Kolkata', NOW());

    UPDATE notifications
    SET created_at = created_at + INTERVAL '5 hours 30 minutes';

    UPDATE notification_recipients
    SET
      created_at = created_at + INTERVAL '5 hours 30 minutes',
      delivered_at = CASE
        WHEN delivered_at IS NULL THEN NULL
        ELSE delivered_at + INTERVAL '5 hours 30 minutes'
      END,
      read_at = CASE
        WHEN read_at IS NULL THEN NULL
        ELSE read_at + INTERVAL '5 hours 30 minutes'
      END;

    INSERT INTO app_migrations (key)
    VALUES ('2026-06-05_notification_timestamps_ist');
  END IF;
END $$;

COMMIT;
