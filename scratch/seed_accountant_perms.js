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
  const permCodes = [
    'dashboard.view',
    'finance.platform.income.view', 'finance.platform.income.create', 'finance.platform.income.edit', 'finance.platform.income.delete',
    'finance.platform.expense.view', 'finance.platform.expense.create', 'finance.platform.expense.edit', 'finance.platform.expense.delete',
    'finance.platform.invoice.view', 'finance.platform.invoice.create', 'finance.platform.invoice.edit', 'finance.platform.invoice.delete',
    'finance.platform.recurring_expenses.view', 'finance.platform.recurring_expenses.create', 'finance.platform.recurring_expenses.edit', 'finance.platform.recurring_expenses.delete',
    'finance.platform.allowance.view', 'finance.platform.allowance.create', 'finance.platform.allowance.edit', 'finance.platform.allowance.delete',
    'finance.income.view', 'finance.income.create', 'finance.income.edit', 'finance.income.delete',
    'finance.expense.view', 'finance.expense.create', 'finance.expense.edit', 'finance.expense.delete',
    'finance.invoice.view', 'finance.invoice.create', 'finance.invoice.edit', 'finance.invoice.delete',
    'finance.recurring_expenses.view', 'finance.recurring_expenses.create', 'finance.recurring_expenses.edit', 'finance.recurring_expenses.delete',
    'finance.allowance.view', 'finance.allowance.create', 'finance.allowance.edit', 'finance.allowance.delete',
    'managestaff.salary.view', 'managestaff.salary.create', 'managestaff.salary.edit', 'managestaff.salary.delete',
    'managestaff.salary_slips.view', 'managestaff.salary_slips.create', 'managestaff.salary_slips.edit', 'managestaff.salary_slips.delete',
    'analytics.sales.view', 'analytics.reports.view',
    'settings.general.view'
  ];

  const perms = await pool.query(`SELECT id, code FROM permissions WHERE code = ANY($1)`, [permCodes]);
  console.log(`Found ${perms.rows.length} permissions matching`);

  let inserted = 0;
  for (const p of perms.rows) {
    const res = await pool.query(`
      INSERT INTO role_permissions (role_id, permission_id)
      VALUES (18, $1)
      ON CONFLICT DO NOTHING
    `, [p.id]);
    if (res.rowCount > 0) inserted++;
  }
  console.log(`Inserted ${inserted} new permissions for Role 18 (Accountant)`);

  const total = await pool.query(`SELECT count(*) as c FROM role_permissions WHERE role_id = 18`);
  console.log(`Role 18 total permissions now: ${total.rows[0].c}`);

  await pool.end();
}
main();

