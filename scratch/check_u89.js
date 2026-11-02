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
  const u89 = await pool.query(`SELECT * FROM users WHERE id = 89`);
  console.log('User 89:', u89.rows[0]);

  const ur89 = await pool.query(`SELECT * FROM user_roles WHERE user_id = 89`);
  console.log('User 89 user_roles:', ur89.rows);

  const im89 = await pool.query(`SELECT * FROM institution_memberships WHERE user_id = 89`);
  console.log('User 89 institution_memberships:', im89.rows);

  await pool.end();
}
main();

