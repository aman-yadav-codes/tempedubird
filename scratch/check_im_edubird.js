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
  const im = await pool.query(`
    SELECT im.id, im.user_id, u.email, u.full_name, im.institution_id, r.name as role_name, r.code as role_code, im.created_at
    FROM institution_memberships im
    JOIN users u ON u.id = im.user_id
    JOIN roles r ON r.id = im.role_id
    WHERE im.institution_id = 1
    ORDER BY im.id ASC
  `);
  console.log('Members of institution 1 count:', im.rows.length);
  im.rows.forEach(r => {
    console.log(`  Mem ID ${r.id}: User ${r.user_id} (${r.full_name}, ${r.email}) - Role: ${r.role_name} (${r.role_code}) - Created: ${r.created_at}`);
  });

  await pool.end();
}
main();

