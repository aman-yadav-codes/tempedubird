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
  const users = await pool.query(`SELECT id, email, full_name, created_by, updated_by, created_at FROM users WHERE id IN (1, 3, 33, 88, 89)`);
  console.log('Key staff accounts:', users.rows);

  // Update created_by to 1 for Aman Yadav (89) and Ram (88) if null
  await pool.query(`UPDATE users SET created_by = 1 WHERE id IN (88, 89) AND created_by IS NULL`);

  await pool.end();
}
main();

