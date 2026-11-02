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
  const members5 = await pool.query(`
    SELECT im.id, im.user_id, u.full_name, u.email, r.name as role_name, r.code as role_code, im.is_active, im.is_deleted
    FROM institution_memberships im
    JOIN users u ON u.id = im.user_id
    LEFT JOIN roles r ON r.id = im.role_id
    WHERE im.institution_id = 5
  `);
  console.log('Members of Institution 5:', members5.rows);

  await pool.end();
}
main();

