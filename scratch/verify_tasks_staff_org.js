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
  const secret = process.env.JWT_SECRET || 'secret';
  const token = jwt.sign({ sub: '1', id: 1, email: 'admin@gmail.com', typ: 'access' }, secret, { expiresIn: '1h' });

  const res = await fetch('http://localhost:3000/api/admin/operations/tasks?institution_id=none', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Returned staff count:', data.staff ? data.staff.length : 'none');
  if (data.staff) {
    console.log('Returned staff members:');
    data.staff.forEach((s, i) => {
      console.log(`  ${i+1}. ${s.name} (${s.email}) - ${s.role}`);
    });
  }

  await pool.end();
}
main();

