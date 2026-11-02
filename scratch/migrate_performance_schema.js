require('dotenv').config({ path: '.env.local' });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  console.log('Running Performance schema migration...');
  await pool.query(`
    CREATE TABLE IF NOT EXISTS performance_settings (
      id SERIAL PRIMARY KEY,
      rule_key VARCHAR(100) UNIQUE NOT NULL,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      description TEXT,
      is_enabled BOOLEAN DEFAULT TRUE,
      calc_type VARCHAR(50) NOT NULL DEFAULT 'fixed',
      point_value NUMERIC(12, 2) DEFAULT 0,
      percentage_value NUMERIC(8, 4) DEFAULT 0,
      frequency VARCHAR(50) DEFAULT 'event',
      action_type VARCHAR(50) DEFAULT 'add',
      version INT DEFAULT 1,
      updated_by VARCHAR(255),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS performance_settings_history (
      id SERIAL PRIMARY KEY,
      rule_key VARCHAR(100) NOT NULL,
      rule_name VARCHAR(255),
      previous_values JSONB,
      new_values JSONB,
      changed_by VARCHAR(255),
      changed_by_id INT,
      change_reason TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS employee_performance_transactions (
      id SERIAL PRIMARY KEY,
      employee_id INT NOT NULL,
      employee_name VARCHAR(255),
      department VARCHAR(100),
      designation VARCHAR(100),
      institution_id INT,
      activity_type VARCHAR(100) NOT NULL,
      category VARCHAR(100) NOT NULL,
      description TEXT,
      points_earned NUMERIC(12, 2) DEFAULT 0,
      points_deducted NUMERIC(12, 2) DEFAULT 0,
      net_points NUMERIC(12, 2) NOT NULL,
      calc_type VARCHAR(50) NOT NULL,
      original_amount NUMERIC(14, 2),
      applied_rate NUMERIC(10, 4),
      reference_module VARCHAR(100),
      reference_record_id VARCHAR(100),
      idempotency_key VARCHAR(255) UNIQUE,
      performed_by VARCHAR(255),
      performed_by_id INT,
      rule_version INT DEFAULT 1,
      transaction_status VARCHAR(50) DEFAULT 'completed',
      transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_perf_tx_emp_id ON employee_performance_transactions(employee_id);
    CREATE INDEX IF NOT EXISTS idx_perf_tx_date ON employee_performance_transactions(transaction_date);
    CREATE INDEX IF NOT EXISTS idx_perf_tx_cat ON employee_performance_transactions(category);
  `);

  const defaultRules = [
    { rule_key: 'attendance_on_time', name: 'Daily On-Time Attendance', category: 'attendance', description: 'Employee arrives at office on time and completes attendance check-in', is_enabled: true, calc_type: 'percentage', point_value: 0, percentage_value: 0.1, frequency: 'daily', action_type: 'add' },
    { rule_key: 'attendance_violation', name: 'Late Arrival / Early Leaving', category: 'attendance', description: 'Employee arrives late or leaves before permitted shift time', is_enabled: true, calc_type: 'percentage', point_value: 0, percentage_value: 0.1, frequency: 'event', action_type: 'deduct' },
    { rule_key: 'finance_income', name: 'Add Income Record', category: 'finance', description: 'Successfully recording a new income entry in finance', is_enabled: true, calc_type: 'fixed', point_value: 5, percentage_value: 0, frequency: 'event', action_type: 'add' },
    { rule_key: 'finance_expense', name: 'Add Expense Record', category: 'finance', description: 'Successfully recording a new expense entry in finance', is_enabled: true, calc_type: 'fixed', point_value: 5, percentage_value: 0, frequency: 'event', action_type: 'add' },
    { rule_key: 'finance_salary_slip', name: 'Generate Salary Slip', category: 'finance', description: 'Successfully generating a salary slip for an employee', is_enabled: true, calc_type: 'fixed', point_value: 5, percentage_value: 0, frequency: 'event', action_type: 'add' },
    { rule_key: 'finance_invoice', name: 'Add Invoice', category: 'finance', description: 'Successfully creating a client or project invoice', is_enabled: true, calc_type: 'fixed', point_value: 5, percentage_value: 0, frequency: 'event', action_type: 'add' },
    { rule_key: 'lead_created', name: 'Lead Creation', category: 'leads_projects', description: 'Successfully creating a new prospective sales lead', is_enabled: true, calc_type: 'fixed', point_value: 5, percentage_value: 0, frequency: 'event', action_type: 'add' },
    { rule_key: 'project_created', name: 'Project Creation', category: 'leads_projects', description: 'Successfully creating a new client project (percentage of project amount)', is_enabled: true, calc_type: 'percentage', point_value: 0, percentage_value: 10.0, frequency: 'event', action_type: 'add' },
    { rule_key: 'admin_monthly', name: 'Admin Role Monthly Reward', category: 'admin', description: 'Monthly reward points awarded to staff members actively holding an Admin role', is_enabled: true, calc_type: 'fixed', point_value: 15000, percentage_value: 0, frequency: 'monthly', action_type: 'add' },
    { rule_key: 'employee_recruited', name: 'Adding a New Employee', category: 'recruitment', description: 'Adding a new team employee (percentage of new employee\'s monthly salary)', is_enabled: true, calc_type: 'percentage', point_value: 0, percentage_value: 20.0, frequency: 'event', action_type: 'add' },
    { rule_key: 'recruitment_applicant', name: 'Add a New Applicant', category: 'recruitment', description: 'Successfully adding an applicant to the recruitment pipeline', is_enabled: true, calc_type: 'fixed', point_value: 500, percentage_value: 0, frequency: 'event', action_type: 'add' },
    { rule_key: 'recruitment_interview', name: 'Conduct an Interview', category: 'recruitment', description: 'Conducting and documenting a completed candidate interview', is_enabled: true, calc_type: 'fixed', point_value: 500, percentage_value: 0, frequency: 'event', action_type: 'add' },
    { rule_key: 'recruitment_experience_letter', name: 'Generate Experience Letter', category: 'recruitment', description: 'Successfully generating an official experience letter', is_enabled: true, calc_type: 'fixed', point_value: 500, percentage_value: 0, frequency: 'event', action_type: 'add' },
    { rule_key: 'recruitment_offer_letter', name: 'Generate Offer Letter', category: 'recruitment', description: 'Successfully generating an official job offer letter', is_enabled: true, calc_type: 'fixed', point_value: 500, percentage_value: 0, frequency: 'event', action_type: 'add' }
  ];

  for (const r of defaultRules) {
    await pool.query(`
      INSERT INTO performance_settings (
        rule_key, name, category, description, is_enabled, calc_type, point_value, percentage_value, frequency, action_type
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (rule_key) DO UPDATE SET
        name = EXCLUDED.name,
        category = EXCLUDED.category,
        description = EXCLUDED.description;
    `, [r.rule_key, r.name, r.category, r.description, r.is_enabled, r.calc_type, r.point_value, r.percentage_value, r.frequency, r.action_type]);
  }

  const check = await pool.query('SELECT count(*) FROM performance_settings');
  console.log('Seeded rules count in performance_settings:', check.rows[0].count);
}

run().then(() => pool.end()).catch(e => { console.error(e); pool.end(); process.exit(1); });

