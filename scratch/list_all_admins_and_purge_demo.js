process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function getAdmins() {
  console.log('=== Purging user 91 (demo.platform_admin@edubird.com) ===');
  await pool.query("DELETE FROM sessions WHERE user_id = 91").catch(() => {});
  await pool.query("DELETE FROM institution_memberships WHERE user_id = 91").catch(() => {});
  await pool.query("DELETE FROM user_roles WHERE user_id = 91").catch(() => {});
  await pool.query("DELETE FROM user_profiles WHERE user_id = 91").catch(() => {});
  await pool.query("DELETE FROM users WHERE email = 'demo.platform_admin@edubird.com' OR id = 91");
  console.log('Purged demo.platform_admin@edubird.com!');

  console.log('\n=== Platform Admins & Institution Admins in Database ===');
  const adminsQuery = `
    SELECT DISTINCT
      u.id AS user_id,
      u.full_name,
      u.email,
      u.phone,
      r.code AS role_code,
      r.name AS role_name,
      COALESCE(ip.id, up.under_institution_id) AS institution_id,
      COALESCE(ip.name, 'Edubird (Platform Org)') AS institution_name,
      u.is_active,
      u.is_deleted
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN institution_memberships im ON im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
    LEFT JOIN roles r ON r.id = COALESCE(ur.role_id, im.role_id)
    LEFT JOIN institution_profiles ip ON ip.id = im.institution_id
    LEFT JOIN user_profiles up ON up.user_id = u.id
    WHERE COALESCE(u.is_deleted, FALSE) = FALSE
      AND (
        r.code IN ('platform_admin', 'super_admin', 'institution_admin', 'school_owner', 'college_owner', 'university_owner')
        OR ur.role_id = 1
        OR im.role_id IN (SELECT id FROM roles WHERE code IN ('platform_admin', 'institution_admin'))
      )
    ORDER BY r.code ASC, u.id ASC
  `;

  const res = await pool.query(adminsQuery);
  console.table(res.rows);

  console.log('\n=== All Institutions in Database ===');
  const insts = await pool.query("SELECT id, name, slug, email, phone, is_active FROM institution_profiles ORDER BY id ASC");
  console.table(insts.rows);

  await pool.end();
}

getAdmins().catch(console.error);

