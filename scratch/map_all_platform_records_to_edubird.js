process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function mapPlatformToEdubird() {
  console.log('Mapping all unassigned platform records to Institution 1 (Edubird)...');

  // 1. Finance categories & entries
  const r1 = await pool.query("UPDATE finance_income_categories SET institution_id = 1 WHERE institution_id IS NULL");
  console.log(`Updated finance_income_categories: ${r1.rowCount}`);

  const r2 = await pool.query("UPDATE finance_expense_categories SET institution_id = 1 WHERE institution_id IS NULL");
  console.log(`Updated finance_expense_categories: ${r2.rowCount}`);

  const r3 = await pool.query("UPDATE finance_recurring_expense_categories SET institution_id = 1 WHERE institution_id IS NULL");
  console.log(`Updated finance_recurring_expense_categories: ${r3.rowCount}`);

  const r4 = await pool.query("UPDATE finance_income_entries SET institution_id = 1 WHERE institution_id IS NULL");
  console.log(`Updated finance_income_entries: ${r4.rowCount}`);

  const r5 = await pool.query("UPDATE finance_expense_entries SET institution_id = 1 WHERE institution_id IS NULL");
  console.log(`Updated finance_expense_entries: ${r5.rowCount}`);

  // 2. Clients
  const r6 = await pool.query("UPDATE clients SET institution_id = 1 WHERE institution_id IS NULL");
  console.log(`Updated clients: ${r6.rowCount}`);

  // 3. Operations tasks
  const r7 = await pool.query("UPDATE operations_tasks SET institution_id = 1 WHERE institution_id IS NULL");
  console.log(`Updated operations_tasks: ${r7.rowCount}`);

  // 4. Invoices
  try {
    const r8 = await pool.query("UPDATE finance_invoices SET institution_id = 1 WHERE institution_id IS NULL");
    console.log(`Updated finance_invoices: ${r8.rowCount}`);
  } catch (e) {}

  // 5. User profiles with under_institution_id IS NULL
  const r9 = await pool.query("UPDATE user_profiles SET under_institution_id = 1 WHERE under_institution_id IS NULL");
  console.log(`Updated user_profiles: ${r9.rowCount}`);

  // 6. Ensure Platform Admin user 1 has active membership in institution 1
  await pool.query(`
    INSERT INTO institution_memberships (user_id, institution_id, role_id, is_active, is_deleted, created_at, updated_at)
    SELECT 1, 1, r.id, TRUE, FALSE, NOW(), NOW()
    FROM roles r WHERE r.code = 'platform_admin'
    ON CONFLICT (user_id, institution_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE
  `);
  console.log('Ensured user 1 membership in institution 1');

  console.log('All platform records mapped to Edubird (Institution 1) successfully!');
  await pool.end();
}

mapPlatformToEdubird().catch(console.error);
