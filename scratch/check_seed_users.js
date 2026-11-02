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
  const users = await pool.query(`
    SELECT id, email, full_name, created_at, created_by
    FROM users
    WHERE email IN ('aditya@gmail.com', 'rahul@gmail.com', 'priya@gmail.com', 'ajay@gmail.com', 'amit@gmail.com')
  `);
  console.log('Sample users created_at:', users.rows);

  await pool.end();
}
main();

