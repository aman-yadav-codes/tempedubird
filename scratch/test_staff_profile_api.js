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
  const sessionRes = await pool.query(`
    INSERT INTO sessions (id, user_id, user_agent, ip_address, expires_at)
    VALUES (gen_random_uuid(), 1, 'test', '127.0.0.1', NOW() + interval '1 day')
    RETURNING id
  `);
  const sid = sessionRes.rows[0].id;

  const res = await fetch('http://localhost:3000/api/admin/users?staffScope=all&limit=100', {
    headers: {
      'Cookie': `token=${sid}; refresh_token=${sid}`
    }
  });

  const json = await res.json();
  console.log('Status:', res.status);
  console.log('Total:', json.total, 'Count:', json.data?.length);
  json.data?.forEach((u, i) => {
    console.log(`  ${i+1}. ${u.full_name} (${u.email}) - roles: ${u.roles?.join(', ')} - desig: ${u.profile?.designation_name || 'none'}`);
  });

  await pool.end();
}
main();
