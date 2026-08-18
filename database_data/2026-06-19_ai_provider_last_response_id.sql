ALTER TABLE "ai_providers"
ADD COLUMN IF NOT EXISTS "last_response_id" text;
