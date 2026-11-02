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
  const perms = await pool.query(`
    SELECT id, name, code FROM permissions
    WHERE code LIKE 'finance%' OR code LIKE '%salary%' OR code LIKE '%invoice%' OR code LIKE '%expense%' OR code = 'dashboard.view'
    ORDER BY code ASC
  `);
  console.log('Finance & related permissions:');
  perms.rows.forEach(p => console.log(`  ${p.id}: ${p.code} (${p.name})`));

  await pool.end();
}
main();

