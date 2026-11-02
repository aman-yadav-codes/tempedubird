process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkModules() {
  console.log('=== Checking EduBird (Institution 1) Mappings ===');

  // 1. Institution 1 check
  const inst1 = await pool.query("SELECT id, name, slug FROM institution_profiles WHERE id = 1");
  console.log('Institution 1:', inst1.rows[0]);

  // 2. Manage Staff: check users and user_profiles under_institution_id
  const unmappedProfiles = await pool.query(
    "SELECT COUNT(*) as c FROM user_profiles WHERE under_institution_id IS NULL OR under_institution_id != 1"
  );
  console.log('User profiles not under institution 1:', unmappedProfiles.rows[0].c);

  // 3. Roles & Permissions: check roles and permissions
  const roles = await pool.query("SELECT COUNT(*) as c FROM roles");
  console.log('Total roles:', roles.rows[0].c);

  // 4. Finance: check income, expense, recurring_expenses, categories
  const tables = [
    'expenses', 'incomes', 'recurring_expenses', 'finance_categories',
    'clients', 'company_profiles', 'operations_tasks'
  ];

  for (const t of tables) {
    try {
      const res = await pool.query(`SELECT COUNT(*) as c FROM ${t} WHERE institution_id = 1`);
      const total = await pool.query(`SELECT COUNT(*) as c FROM ${t}`);
      const nulls = await pool.query(`SELECT COUNT(*) as c FROM ${t} WHERE institution_id IS NULL`);
      console.log(`${t}: total=${total.rows[0].c}, institution_id=1: ${res.rows[0].c}, institution_id IS NULL: ${nulls.rows[0].c}`);
    } catch (e) {
      console.log(`${t}: table query error:`, e.message);
    }
  }

  await pool.end();
}
checkModules().catch(console.error);
