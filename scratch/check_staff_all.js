process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const fs = require('fs');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

const envContent = fs.readFileSync('.env.local', 'utf8');
const dbUrlLine = envContent.split('\n').find(l => l.startsWith('DATABASE_URL='));
const dbUrl = dbUrlLine.split('=')[1].trim().replace(/^["']|["']$/g, '');

const pool = new Pool({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  const sessionRes = await pool.query('SELECT * FROM sessions WHERE user_id = 1 ORDER BY created_at DESC LIMIT 1');
  const sess = sessionRes.rows[0];
  const secret = process.env.JWT_SECRET || 'secret';
  const token = jwt.sign({ sub: '1', id: 1, sid: sess.id, email: 'admin@gmail.com', typ: 'access' }, secret, { expiresIn: '1h' });

  const res = await fetch('http://localhost:3000/api/admin/users?staffScope=all&limit=50', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('Response status:', res.status);
  console.log('Total:', data.total, 'Length:', data.data?.length);
  data.data?.forEach(u => console.log(`  User ${u.id}: ${u.full_name} (${u.email}) - roles: ${u.roles?.join(', ')}`));

  await pool.end();
}
main();
