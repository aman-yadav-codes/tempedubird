process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function checkFinanceTables() {
  const tables = [
    'finance_income_categories',
    'finance_expense_categories',
    'finance_recurring_expense_categories',
    'finance_income_entries',
    'finance_expense_entries',
    'finance_recurring_expenses',
    'finance_payment_methods',
    'clients',
    'operations_tasks',
    'platform_company_info'
  ];

  for (const t of tables) {
    try {
      const res = await pool.query(`SELECT institution_id, COUNT(*) as c FROM ${t} GROUP BY institution_id`);
      console.log(`Table ${t}:`, res.rows);
    } catch (e) {
      console.log(`Table ${t} error:`, e.message);
    }
  }

  await pool.end();
}
checkFinanceTables().catch(console.error);
