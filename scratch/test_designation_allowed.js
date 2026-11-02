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
    // Let's check user 89 profile and update designation_id to 1 (Senior Developer)
    await pool.query(`
      UPDATE user_profiles
      SET designation_id = 1
      WHERE user_id = 89
    `);

    const res = await pool.query(`
      SELECT u.id, u.email, u.full_name, p.designation_id, d.name as designation_name
      FROM users u
      LEFT JOIN user_profiles p ON p.user_id = u.id
      LEFT JOIN designations d ON d.id = p.designation_id
      WHERE u.id = 89
    `);
    console.log('Updated user 89:', res.rows[0]);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();
