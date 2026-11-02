process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function verifyAll() {
  // 1. Institution 1
  const inst1 = await pool.query('SELECT id, name, slug, email, phone FROM institution_profiles WHERE id = 1;');
  console.log('1. Institution 1:', inst1.rows[0]);

  // 2. Platform Admin
  const admin = await pool.query(`
    SELECT u.id, u.full_name, u.email, up.under_institution_id, r.code as role_code 
    FROM users u 
    LEFT JOIN user_profiles up ON up.user_id = u.id 
    LEFT JOIN user_roles ur ON ur.user_id = u.id 
    LEFT JOIN roles r ON r.id = ur.role_id 
    WHERE u.id = 1;
  `);
  console.log('2. Platform Admin user 1:', admin.rows[0]);

  // 3. Demo Platform Admin user 81 check
  const user81 = await pool.query("SELECT * FROM users WHERE id = 81 OR email = 'demo.platform_admin@edubird.com';");
  console.log('3. Demo Platform Admin account count:', user81.rows.length);

  // 4. Staff members mapped to Institution 1
  const staffInst1 = await pool.query(`
    SELECT COUNT(DISTINCT u.id) as staff_count
    FROM users u
    JOIN institution_memberships im ON im.user_id = u.id
    WHERE im.institution_id = 1 AND im.is_active = TRUE;
  `);
  console.log('4. Total staff members mapped with Institution 1 (Edubird):', staffInst1.rows[0].staff_count);

  // 5. User profiles with under_institution_id = 1
  const profilesInst1 = await pool.query(`
    SELECT COUNT(*) as profile_count
    FROM user_profiles
    WHERE under_institution_id = 1;
  `);
  console.log('5. Total user profiles under_institution_id = 1:', profilesInst1.rows[0].profile_count);

  // 6. Test demo login endpoint
  const demoLoginRes = await fetch('http://localhost:3000/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'platform_admin' })
  });
  const demoLoginData = await demoLoginRes.json();
  console.log('6. Demo Login status:', demoLoginRes.status, 'User ID:', demoLoginData.user?.id, 'Email:', demoLoginData.user?.email);

  await pool.end();
}

verifyAll().catch(console.error);
