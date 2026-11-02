process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function getAdminSummary() {
  // Query Platform Admins
  const platformAdmins = await pool.query(`
    SELECT DISTINCT
      u.id,
      u.full_name,
      u.email,
      u.phone,
      r.name as role_name,
      r.code as role_code,
      'Edubird (Platform Org)' as institution_name,
      1 as institution_id
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    WHERE r.code = 'platform_admin'
      AND COALESCE(u.is_deleted, false) = false
    ORDER BY u.id ASC
  `);

  console.log('--- PLATFORM ADMINS ---');
  console.table(platformAdmins.rows);

  // Query Institution Admins
  const instAdmins = await pool.query(`
    SELECT DISTINCT
      u.id,
      u.full_name,
      u.email,
      u.phone,
      r.name as role_name,
      r.code as role_code,
      ip.id as institution_id,
      ip.name as institution_name
    FROM users u
    JOIN institution_memberships im ON im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, false) = false
    JOIN roles r ON r.id = im.role_id
    JOIN institution_profiles ip ON ip.id = im.institution_id
    WHERE r.code = 'institution_admin'
      AND COALESCE(u.is_deleted, false) = false
      AND ip.is_active = TRUE
    ORDER BY ip.id ASC, u.id ASC
  `);

  console.log('--- INSTITUTION ADMINS ---');
  console.table(instAdmins.rows);

  await pool.end();
}

getAdminSummary().catch(console.error);

