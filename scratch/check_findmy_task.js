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
  const task = await pool.query(`SELECT id, title, institution_id, client_id, client_name FROM operations_tasks WHERE title ILIKE '%Findmy%' OR id = 6`);
  console.log('Project "Findmy":', task.rows);

  await pool.end();
}
main();

