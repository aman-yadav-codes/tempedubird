process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

// Let's test the queries in lib/auth/sync-permission-registry.ts step by step
// Step 0:
async function testAll() {
  console.log('Testing step 0');
  await pool.query(`
    UPDATE roles
    SET code = LOWER(code)
    WHERE code <> LOWER(code)
  `).catch(console.error);

  console.log('Testing step 1: platform roles');
  const MANAGED_PLATFORM_ROLE_CODES = ["platform_admin", "accountant", "guest"];
  await pool.query(
    `
      INSERT INTO roles (name, code, scope_id, is_system, is_deleted, deleted_at, deleted_by)
      SELECT
        CASE role_code
          WHEN 'accountant' THEN 'Accountant'
          WHEN 'guest' THEN 'Guest'
          ELSE 'Platform Admin'
        END AS name,
        role_code AS code,
        scope.id AS scope_id,
        TRUE,
        FALSE,
        NULL,
        NULL
      FROM unnest($1::text[]) AS managed_roles(role_code)
      CROSS JOIN scope_types scope
      WHERE scope.code = 'platform'
      ON CONFLICT (code)
      DO UPDATE SET
        name = EXCLUDED.name,
        scope_id = EXCLUDED.scope_id,
        is_system = TRUE,
        is_deleted = FALSE,
        deleted_at = NULL,
        deleted_by = NULL
    `,
    [MANAGED_PLATFORM_ROLE_CODES]
  );

  console.log('Testing step 2: institution roles');
  const { MANAGED_INSTITUTION_ROLE_NAMES } = require('../lib/auth/sync-permission-registry.ts');
}

