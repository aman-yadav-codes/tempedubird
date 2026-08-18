ALTER TABLE support_ticket_messages
ADD COLUMN IF NOT EXISTS reply_to_message_id BIGINT;

ALTER TABLE support_ticket_messages
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_support_ticket_message_reply'
  ) THEN
    ALTER TABLE support_ticket_messages
    ADD CONSTRAINT fk_support_ticket_message_reply
    FOREIGN KEY (reply_to_message_id)
    REFERENCES support_ticket_messages(id)
    ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_support_ticket_messages_reply
ON support_ticket_messages(reply_to_message_id)
WHERE reply_to_message_id IS NOT NULL;
