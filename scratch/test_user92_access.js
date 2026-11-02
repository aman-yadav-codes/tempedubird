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
  const res = await fetch('http://localhost:3000/api/auth/switch-account', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: 92 })
  });
  const data = await res.json();
  console.log('Switch status:', res.status);
  console.log('Switch redirectTo:', data.redirectTo);
  console.log('User roles:', data.user?.roles);
  console.log('User role_codes:', data.user?.role_codes);
  console.log('Can access admin:', data.user?.can_access_admin);
  console.log('User perms count:', data.user?.permissions?.length);
  console.log('Has dashboard.view in perms?', data.user?.permissions?.includes('dashboard.view'));

  await pool.end();
}
main();

