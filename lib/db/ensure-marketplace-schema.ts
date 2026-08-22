import { db } from "@/lib/db/db";

let schemaInitialized = false;

export async function ensureMarketplaceColumns() {
  if (schemaInitialized) return;
  try {
    await db.query(`
      DO $$
      BEGIN
        -- 1. Programs / Courses
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'programs') THEN
          ALTER TABLE programs ADD COLUMN IF NOT EXISTS sell_on_marketplace BOOLEAN DEFAULT FALSE;
          ALTER TABLE programs ADD COLUMN IF NOT EXISTS marketplace_price NUMERIC DEFAULT 0;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'institution_programs') THEN
          ALTER TABLE institution_programs ADD COLUMN IF NOT EXISTS sell_on_marketplace BOOLEAN DEFAULT FALSE;
          ALTER TABLE institution_programs ADD COLUMN IF NOT EXISTS marketplace_price NUMERIC DEFAULT 0;
        END IF;

        -- 2. Institution profiles
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'institution_profiles') THEN
          ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS sell_on_marketplace BOOLEAN DEFAULT TRUE;
          ALTER TABLE institution_profiles ADD COLUMN IF NOT EXISTS marketplace_price NUMERIC DEFAULT 0;
        END IF;

        -- 3. Practice Tests
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'practice_tests') THEN
          ALTER TABLE practice_tests ADD COLUMN IF NOT EXISTS sell_on_marketplace BOOLEAN DEFAULT FALSE;
          ALTER TABLE practice_tests ADD COLUMN IF NOT EXISTS marketplace_price NUMERIC DEFAULT 0;
        END IF;

        -- 4. Notes / Study Notes
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'study_notes') THEN
          ALTER TABLE study_notes ADD COLUMN IF NOT EXISTS sell_on_marketplace BOOLEAN DEFAULT FALSE;
          ALTER TABLE study_notes ADD COLUMN IF NOT EXISTS marketplace_price NUMERIC DEFAULT 0;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notes') THEN
          ALTER TABLE notes ADD COLUMN IF NOT EXISTS sell_on_marketplace BOOLEAN DEFAULT FALSE;
          ALTER TABLE notes ADD COLUMN IF NOT EXISTS marketplace_price NUMERIC DEFAULT 0;
        END IF;

        -- 5. Teachers (Memberships)
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'institution_memberships') THEN
          ALTER TABLE institution_memberships ADD COLUMN IF NOT EXISTS sell_on_marketplace BOOLEAN DEFAULT FALSE;
          ALTER TABLE institution_memberships ADD COLUMN IF NOT EXISTS marketplace_price NUMERIC DEFAULT 0;
        END IF;

        -- 6. Entrance Exams
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'entrance_exams') THEN
          ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS sell_on_marketplace BOOLEAN DEFAULT FALSE;
          ALTER TABLE entrance_exams ADD COLUMN IF NOT EXISTS marketplace_price NUMERIC DEFAULT 0;
        END IF;

        -- 7. Libraries
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'institution_libraries') THEN
          ALTER TABLE institution_libraries ADD COLUMN IF NOT EXISTS sell_on_marketplace BOOLEAN DEFAULT FALSE;
          ALTER TABLE institution_libraries ADD COLUMN IF NOT EXISTS marketplace_price NUMERIC DEFAULT 0;
        END IF;

        -- 8. Hostels
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'institution_hostels') THEN
          ALTER TABLE institution_hostels ADD COLUMN IF NOT EXISTS sell_on_marketplace BOOLEAN DEFAULT FALSE;
          ALTER TABLE institution_hostels ADD COLUMN IF NOT EXISTS marketplace_price NUMERIC DEFAULT 0;
        END IF;

        -- 9. Blogs / Institution News
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'institution_news') THEN
          ALTER TABLE institution_news ADD COLUMN IF NOT EXISTS sell_on_marketplace BOOLEAN DEFAULT FALSE;
          ALTER TABLE institution_news ADD COLUMN IF NOT EXISTS marketplace_price NUMERIC DEFAULT 0;
        END IF;
      END $$;
    `);
    schemaInitialized = true;
  } catch (err) {
    console.error("Error ensuring marketplace columns:", err);
  }
}
