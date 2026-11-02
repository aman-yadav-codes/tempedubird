process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const fs = require('fs');
const path = require('path');

async function searchAll() {
  console.log('=== Checking Database for demo.platform_admin@edubird.com ===');

  // Check users table
  const users = await pool.query(
    "SELECT id, email, full_name, is_active, is_deleted FROM users WHERE email ILIKE '%demo.platform_admin%' OR full_name ILIKE '%Demo Platform%'"
  );
  console.log('Users matching in DB:', users.rows);

  // Check other tables
  const userRoles = await pool.query(
    "SELECT * FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE email ILIKE '%demo.platform_admin%')"
  );
  console.log('User roles matching:', userRoles.rows);

  const memberships = await pool.query(
    "SELECT * FROM institution_memberships WHERE user_id IN (SELECT id FROM users WHERE email ILIKE '%demo.platform_admin%')"
  );
  console.log('Memberships matching:', memberships.rows);

  // Search in text/json columns of tasks
  const tasks = await pool.query(
    "SELECT id, title FROM operations_tasks WHERE sub_tasks::text ILIKE '%demo.platform_admin%' OR details ILIKE '%demo.platform_admin%'"
  );
  console.log('Tasks containing demo.platform_admin:', tasks.rows);

  await pool.end();

  console.log('=== Checking Codebase for demo.platform_admin@edubird.com ===');
  const results = [];
  function searchDir(dir) {
    for (const f of fs.readdirSync(dir)) {
      if (['node_modules', '.next', '.git', 'dist', 'build', '.gemini'].includes(f)) continue;
      const full = path.join(dir, f);
      try {
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          searchDir(full);
        } else if (stat.isFile() && (full.endsWith('.ts') || full.endsWith('.tsx') || full.endsWith('.js') || full.endsWith('.json') || full.endsWith('.sql'))) {
          const content = fs.readFileSync(full, 'utf8');
          if (content.includes('demo.platform_admin@edubird.com')) {
            results.push(full);
          }
        }
      } catch (e) {}
    }
  }
  searchDir('.');
  console.log('Codebase files containing demo.platform_admin@edubird.com:', results);
}

searchAll().catch(console.error);
