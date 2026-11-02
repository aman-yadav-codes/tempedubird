process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const { Pool } = require('pg');

const envContent = fs.readFileSync('.env.local', 'utf8');
const dbUrlLine = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.split('=')[1].trim().replace(/^["']|["']$/g, '');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    const role334 = await pool.query('SELECT * FROM roles WHERE id = 334');
    console.log('Role 334:', role334.rows[0]);

    const rolePerms = await pool.query(`
      SELECT rp.*, p.name as perm_name, p.code as perm_code
      FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE rp.role_id = 334
    `);
    console.log('Role 334 permissions count:', rolePerms.rows.length);
    console.log('Role 334 sample perms:', rolePerms.rows.slice(0, 10).map(p => p.perm_code));

    // Check user 33 profile and memberships
    const user33 = await pool.query('SELECT * FROM users WHERE id = 33');
    console.log('User 33:', user33.rows[0]);

    const user33Profile = await pool.query('SELECT * FROM user_profiles WHERE user_id = 33');
    console.log('User 33 profile:', user33Profile.rows[0]);

    const user33Memberships = await pool.query('SELECT * FROM institution_memberships WHERE user_id = 33');
    console.log('User 33 memberships:', user33Memberships.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();

