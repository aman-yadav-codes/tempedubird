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
  const insts = await pool.query(`SELECT id, name, slug FROM institution_profiles ORDER BY id ASC`);
  console.log('Institutions:', insts.rows);

  // Check how many staff belong to each institution
  const members = await pool.query(`
    SELECT im.institution_id, ip.name as inst_name, count(distinct im.user_id) as member_count
    FROM institution_memberships im
    JOIN institution_profiles ip ON ip.id = im.institution_id
    WHERE im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
    GROUP BY im.institution_id, ip.name
  `);
  console.log('Active members by institution:', members.rows);

  // Check under_institution_id in user_profiles
  const under = await pool.query(`
    SELECT up.under_institution_id, count(distinct up.user_id) as count
    FROM user_profiles up
    GROUP BY up.under_institution_id
  `);
  console.log('User profiles under_institution_id:', under.rows);

  await pool.end();
}
main();
