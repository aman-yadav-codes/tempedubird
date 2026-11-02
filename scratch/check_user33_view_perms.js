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
  const permsRes = await pool.query(`
    SELECT p.code
    FROM role_permissions rp
    JOIN permissions p ON p.id = rp.permission_id
    WHERE rp.role_id = 334
  `);
  const perms = new Set(permsRes.rows.map(r => r.code));

  console.log('Perms has dashboard.view?', perms.has('dashboard.view'));
  console.log('Perms has users.allusers.view?', perms.has('users.allusers.view'));
  console.log('Perms has analytics.view?', perms.has('analytics.view'));
  console.log('Perms has settings.general.view?', perms.has('settings.general.view'));
  console.log('Perms has settings.ai.view?', perms.has('settings.ai.view'));

  // What view permissions does role 334 have?
  const viewPerms = [...perms].filter(p => p.endsWith('.view'));
  console.log('All view permissions for role 334:', viewPerms);

  await pool.end();
}
main();

