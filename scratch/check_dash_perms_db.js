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
  const dashPerms = await pool.query(`
    SELECT * FROM permissions WHERE code LIKE '%dashboard%'
  `);
  console.log('Dashboard permissions in DB:');
  dashPerms.rows.forEach(p => console.log(`  ID ${p.id}: ${p.name} (${p.code})`));

  await pool.end();
}
main();

