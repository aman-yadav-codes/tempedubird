const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Read database URL from env files in ..
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

console.log('Database URL found:', !!dbUrl);
const pool = new Pool({ 
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' AND (
      table_name LIKE '%transport%' OR 
      table_name LIKE '%slab%' OR 
      table_name LIKE '%fee%'
    )
    ORDER BY table_name;
  `);
  console.log('Matching tables:', tables.rows.map(r => r.table_name));
  await pool.end();
}

run().catch(console.error);
