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
  const q = await pool.query(`
    SELECT u.id, u.email, u.full_name, u.created_by,
      r.name as role_name, r.code as role_code,
      d.name as desig_name,
      up.under_institution_id, ip.name as inst_name,
      im.institution_id as member_inst_id, mip.name as member_inst_name,
      im.role_id as member_role_id, mr.code as member_role_code
    FROM users u
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles r ON r.id = ur.role_id
    LEFT JOIN user_profiles up ON up.user_id = u.id
    LEFT JOIN designations d ON d.id = up.designation_id
    LEFT JOIN institution_profiles ip ON ip.id = up.under_institution_id
    LEFT JOIN institution_memberships im ON im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
    LEFT JOIN institution_profiles mip ON mip.id = im.institution_id
    LEFT JOIN roles mr ON mr.id = im.role_id
    WHERE u.deleted_at IS NULL
    ORDER BY u.id ASC
  `);

  console.log('Total users:', q.rows.length);
  q.rows.forEach(u => {
    console.log(`User ${u.id}: ${u.full_name} (${u.email}) | role: ${u.role_name} (${u.role_code}) | desig: ${u.desig_name} | under_inst: ${u.under_institution_id} (${u.inst_name}) | member_inst: ${u.member_inst_id} (${u.member_inst_name}), member_role: ${u.member_role_code}`);
  });

  await pool.end();
}
main();

