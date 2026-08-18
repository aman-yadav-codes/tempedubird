-- Drop tables that are not referenced by the current app/API code.
-- Review row counts and take a backup before running this on any shared database.
-- This intentionally avoids CASCADE so hidden dependencies fail safely.

BEGIN;

DROP TABLE IF EXISTS facility_charges;
DROP TABLE IF EXISTS institution_facilities;
DROP TABLE IF EXISTS institution_people;
DROP TABLE IF EXISTS user_category_boards;
DROP TABLE IF EXISTS user_categories;

COMMIT;
