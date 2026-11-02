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
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, title, sub_tasks FROM operations_tasks ORDER BY id DESC LIMIT 5;');
    for (const r of res.rows) {
      console.log('Task ID:', r.id, r.title);
      if (Array.isArray(r.sub_tasks)) {
        for (const st of r.sub_tasks) {
          console.log('  Subtask:', st.title);
          console.log('    Uploads:', JSON.stringify(st.uploads, null, 2));
          console.log('    Work Updates:', JSON.stringify(st.work_updates, null, 2));
        }
      }
    }
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(console.error);
