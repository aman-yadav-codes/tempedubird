ALTER TABLE visitor_sessions
ADD COLUMN IF NOT EXISTS lead_status VARCHAR(30) NOT NULL DEFAULT 'new';

UPDATE visitor_sessions
SET lead_status = 'new'
WHERE lead_status IS NULL
   OR lead_status NOT IN (
       'new',
       'contacted',
       'follow_up',
       'won',
       'lost',
       'not_interested',
       'no_response',
       'on_hold',
       'invalid'
   );
