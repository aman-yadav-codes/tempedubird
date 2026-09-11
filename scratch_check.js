const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
let dbUrl = '';
for (const line of envContent.split('\n')) {
  if (line.startsWith('DATABASE_URL=')) {
    dbUrl = line.replace('DATABASE_URL=', '').trim().replace(/^["']|["']$/g, '');
  }
}
// remove channel_binding=require if node pg fails on it
dbUrl = dbUrl.replace('&channel_binding=require', '').replace('channel_binding=require&', '');
const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  const user = await pool.query(`SELECT * FROM users WHERE id = 5307`);
  console.log('USERS:', user.rows);

  const memberships = await pool.query(`SELECT * FROM memberships WHERE user_id = 5307`);
  console.log('MEMBERSHIPS:', memberships.rows);
  await pool.end();
}

run().catch(console.error);
