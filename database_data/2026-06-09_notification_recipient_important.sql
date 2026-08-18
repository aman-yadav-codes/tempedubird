ALTER TABLE notification_recipients
ADD COLUMN IF NOT EXISTS is_important BOOLEAN DEFAULT FALSE NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notification_recipients_important
ON notification_recipients(user_id, is_important);
