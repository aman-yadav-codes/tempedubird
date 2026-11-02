process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function check() {
  const admins = await pool.query(`
    SELECT u.id, u.full_name, u.email, r.name as role_name, r.code as role_code, up.under_institution_id
    FROM users u
    JOIN user_roles ur ON ur.user_id = u.id
    JOIN roles r ON r.id = ur.role_id
    LEFT JOIN user_profiles up ON up.user_id = u.id
    WHERE r.code IN ('platform_admin', 'super_admin');
  `);
  console.log('Platform Admins:', admins.rows);

  const memberships = await pool.query(`
    SELECT im.user_id, u.full_name, u.email, im.institution_id, i.name as institution_name, r.name as role_name, r.code as role_code
    FROM institution_memberships im
    JOIN users u ON u.id = im.user_id
    JOIN institutions i ON i.id = im.institution_id
    JOIN roles r ON r.id = im.role_id
    WHERE im.user_id IN (SELECT ur.user_id FROM user_roles ur JOIN roles r2 ON r2.id = ur.role_id WHERE r2.code = 'platform_admin')
       OR r.code = 'platform_admin';
  `);
  console.log('Platform Admin Memberships:', memberships.rows);

  const allInstitutions = await pool.query(`SELECT id, name, code FROM institutions ORDER BY id ASC LIMIT 20;`);
  console.log('All Institutions:', allInstitutions.rows);

  // Check company / platform settings
  const tables = await pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND (table_name LIKE '%company%' OR table_name LIKE '%platform%' OR table_name LIKE '%setting%')
  `);
  console.log('Settings tables:', tables.rows.map(r => r.table_name));

  for (const t of tables.rows) {
    if (['company_profiles', 'company_settings', 'platform_settings', 'company'].includes(t.table_name)) {
      const res = await pool.query(`SELECT * FROM ${t.table_name} LIMIT 5`);
      console.log(`Table ${t.table_name}:`, res.rows);
    }
  }

  await pool.end();
}

check().catch(console.error);

