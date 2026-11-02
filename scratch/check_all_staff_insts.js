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
  const users = await pool.query(`
    SELECT u.id, u.email, u.full_name, up.under_institution_id, ip.name as under_inst_name,
      im.institution_id as member_inst_id, mip.name as member_inst_name
    FROM users u
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN institution_profiles ip ON ip.id = up.under_institution_id
    LEFT JOIN institution_memberships im ON im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
    LEFT JOIN institution_profiles mip ON mip.id = im.institution_id
    WHERE u.deleted_at IS NULL
    ORDER BY u.full_name ASC
  `);

  console.log('Users and their institutions:');
  users.rows.forEach(u => {
    console.log(`  User ${u.id}: ${u.full_name} (${u.email}) -> under: ${u.under_institution_id} (${u.under_inst_name}), member: ${u.member_inst_id} (${u.member_inst_name})`);
  });

  await pool.end();
}
main();

