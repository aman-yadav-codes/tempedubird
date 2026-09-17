const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

let dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
if (!dbUrl) {
  const envPaths = [path.resolve('..', '.env'), path.resolve('..', '.env.local'), path.resolve('.env')];
  for (const ep of envPaths) {
    if (fs.existsSync(ep)) {
      const lines = fs.readFileSync(ep, 'utf8').split('\n');
      for (const line of lines) {
        if (line.startsWith('DATABASE_URL=') || line.startsWith('POSTGRES_URL=')) {
          dbUrl = line.split('=')[1].trim().replace(/^["']|["']$/g, '');
          break;
        }
      }
    }
    if (dbUrl) break;
  }
}

const pool = new Pool({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } });

async function run() {
  const cols = await pool.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'finance_approval_slabs';
  `);
  console.log('finance_approval_slabs cols:', cols.rows);
  await pool.end();
}

run().catch(console.error);
