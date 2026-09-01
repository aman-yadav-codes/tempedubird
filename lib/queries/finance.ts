import type { Pool, QueryResultRow } from "pg";

import { ensureSubscriptionSchema } from "@/lib/queries/subscriptions";

type Queryable = Pick<Pool, "query">;

export type FinanceScope = "platform" | "institution";

export type FinanceIncomeCategoryRow = {
  id: number;
  scope_type: FinanceScope;
  institution_id: number | null;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type FinanceIncomeRow = {
  row_id: string;
  source_id: number;
  source_type: "manual" | "fee_payment" | "subscription";
  scope_type: FinanceScope;
  institution_id: number | null;
  institution_name: string | null;
  income_date: string;
  amount: string | number;
  payment_method: "cash" | "upi" | "net_banking";
  paid_by?: string | null;
  paid_by_label?: string | null;
  paid_to: string;
  paid_to_label: string;
  category_id: number | null;
  category_name: string;
  payer_name: string | null;
  reference: string | null;
  invoice_url: string | null;
  invoice_public_id: string | null;
  invoice_resource_type: string | null;
  invoice_file_name: string | null;
  description: string | null;
  created_at: string;
};

export type FinanceIncomeInput = {
  scope_type: FinanceScope;
  institution_id: number | null;
  category_id: number;
  payment_method: "cash" | "upi" | "net_banking";
  paid_by?: string | null;
  paid_by_label?: string | null;
  payer_name?: string | null;
  paid_to: string;
  paid_to_label: string;
  amount: number;
  income_date: string;
  invoice_url?: string | null;
  invoice_public_id?: string | null;
  invoice_resource_type?: string | null;
  invoice_file_name?: string | null;
  description?: string | null;
  user_id: number;
};

export type FinanceIncomeListOptions = {
  scope_type: FinanceScope;
  institution_id: number | null;
  search: string;
  payment_method: string;
  source_type: string;
  from_date: string | null;
  to_date: string | null;
  limit: number;
  offset: number;
};

export type FinanceExpenseCategoryRow = FinanceIncomeCategoryRow;
export type FinanceRecurringExpenseCategoryRow = FinanceIncomeCategoryRow;

export type FinanceCategoryUsage = "income" | "expense" | "recurring";

export type FinancePaymentCategoryRow = {
  id: string;
  income_id: number | null;
  expense_id: number | null;
  recurring_id: number | null;
  scope_type: FinanceScope;
  institution_id: number | null;
  name: string;
  usage_types: FinanceCategoryUsage[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type FinanceExpenseRow = {
  row_id: string;
  source_id: number;
  source_type: "manual" | "subscription" | "allowance" | "recurring";
  scope_type: FinanceScope;
  institution_id: number | null;
  institution_name: string | null;
  expense_date: string;
  amount: string | number;
  payment_method: "cash" | "upi" | "net_banking";
  payment_status: "paid" | "due";
  paid_by: string;
  paid_by_label: string;
  paid_to?: string | null;
  paid_to_label?: string | null;
  category_id: number | null;
  category_name: string;
  reference: string | null;
  invoice_url: string | null;
  invoice_public_id: string | null;
  invoice_resource_type: string | null;
  invoice_file_name: string | null;
  description: string | null;
  created_at: string;
};

export type FinanceExpenseInput = {
  scope_type: FinanceScope;
  institution_id: number | null;
  category_id: number;
  payment_method: "cash" | "upi" | "net_banking";
  payment_status: "paid" | "due";
  paid_by: string;
  paid_by_label: string;
  paid_to?: string | null;
  paid_to_label?: string | null;
  amount: number;
  expense_date: string;
  invoice_url?: string | null;
  invoice_public_id?: string | null;
  invoice_resource_type?: string | null;
  invoice_file_name?: string | null;
  description?: string | null;
  user_id: number;
};

export type FinanceExpenseListOptions = {
  scope_type: FinanceScope;
  institution_id: number | null;
  search: string;
  payment_method: string;
  payment_status: string;
  source_type: string;
  from_date: string | null;
  to_date: string | null;
  limit: number;
  offset: number;
};

export type FinanceRecurringExpenseRow = {
  id: string;
  scope_type: FinanceScope;
  institution_id: number | null;
  title: string;
  category_ids: number[];
  category_names: string[];
  payment_method: "cash" | "upi" | "net_banking";
  paid_by: string;
  paid_by_label: string;
  amount: string | number;
  frequency: "monthly" | "yearly";
  due_day: number;
  start_date: string;
  end_date: string | null;
  payment_status: "paid" | "due";
  reminder_days_before: number;
  next_due_date: string;
  is_active: boolean;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export type FinanceRecurringExpenseInput = {
  scope_type: FinanceScope;
  institution_id: number | null;
  title: string;
  category_ids: number[];
  payment_method: "cash" | "upi" | "net_banking";
  paid_by: string;
  paid_by_label: string;
  amount: number;
  frequency: "monthly" | "yearly";
  due_day: number;
  start_date: string;
  end_date?: string | null;
  payment_status: "paid" | "due";
  reminder_days_before: number;
  next_due_date: string;
  description?: string | null;
  user_id: number;
};

export type FinanceRecurringExpenseHistoryRow = {
  id: string;
  recurring_expense_id: string;
  action: "created" | "updated" | "status_changed";
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_by: number | null;
  changed_by_name: string | null;
  changed_at: string;
};

export type FinanceRecurringExpenseListOptions = {
  scope_type: FinanceScope;
  institution_id: number | null;
  search: string;
  payment_method: string;
  frequency: string;
  status: string;
  limit: number;
  offset: number;
};

export type FinanceAllowanceUserOption = {
  id: number;
  full_name: string;
  email: string | null;
  role_label: string | null;
};

export type FinanceAllowanceRow = {
  row_id: string;
  id: number;
  scope_type: FinanceScope;
  institution_id: number | null;
  institution_name: string | null;
  user_id: number;
  user_name: string;
  user_email: string | null;
  role_label: string | null;
  allowance_date: string;
  amount: string | number;
  spent_amount: string | number;
  balance_amount: string | number;
  payment_method: "cash" | "upi" | "net_banking";
  invoice_url: string | null;
  invoice_public_id: string | null;
  invoice_resource_type: string | null;
  invoice_file_name: string | null;
  description: string | null;
  created_at: string;
};

export type FinanceAllowanceInput = {
  scope_type: FinanceScope;
  institution_id: number | null;
  user_id: number;
  payment_method: "cash" | "upi" | "net_banking";
  amount: number;
  allowance_date: string;
  invoice_url?: string | null;
  invoice_public_id?: string | null;
  invoice_resource_type?: string | null;
  invoice_file_name?: string | null;
  description?: string | null;
  created_by: number;
};

export type FinanceAllowanceListOptions = {
  scope_type: FinanceScope;
  institution_id: number | null;
  search: string;
  payment_method: string;
  user_id: number | null;
  from_date: string | null;
  to_date: string | null;
  limit: number;
  offset: number;
};

export type FinanceAllowanceSpendRow = {
  row_id: string;
  id: number;
  allowance_id: number;
  scope_type: FinanceScope;
  institution_id: number | null;
  institution_name: string | null;
  user_id: number;
  user_name: string;
  spend_date: string;
  amount: string | number;
  payment_method: "cash" | "upi" | "net_banking";
  invoice_url: string | null;
  invoice_public_id: string | null;
  invoice_resource_type: string | null;
  invoice_file_name: string | null;
  description: string | null;
  created_at: string;
};

export type FinanceAllowanceSpendInput = {
  allowance_id: number;
  user_id: number;
  payment_method: "cash" | "upi" | "net_banking";
  amount: number;
  spend_date: string;
  invoice_url?: string | null;
  invoice_public_id?: string | null;
  invoice_resource_type?: string | null;
  invoice_file_name?: string | null;
  description?: string | null;
};

let schemaReady: Promise<void> | null = null;
const defaultPaymentCategoriesReady = new Map<string, Promise<void>>();

export async function ensureFinanceIncomeSchema(db: Queryable) {
  if (!schemaReady) {
    schemaReady = (async () => {
      await ensureSubscriptionSchema(db);
      await db.query(`
        CREATE TABLE IF NOT EXISTS student_fee_payments (
          id SERIAL PRIMARY KEY,
          student_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          student_profile_id INTEGER NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
          enrollment_id INTEGER NOT NULL REFERENCES student_enrollments(id) ON DELETE CASCADE,
          institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
          academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL,
          period_indexes INTEGER[] NOT NULL DEFAULT '{}',
          period_labels JSONB NOT NULL DEFAULT '[]'::jsonb,
          payment_method TEXT NOT NULL CHECK (payment_method IN ('upi', 'qr', 'cash')),
          subtotal_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
          discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
          discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
          total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
          transaction_id TEXT,
          screenshot_url TEXT,
          screenshot_public_id TEXT,
          screenshot_resource_type TEXT,
          remarks TEXT,
          status TEXT NOT NULL DEFAULT 'paid',
          submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          received_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          verified_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          rejected_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          verified_at TIMESTAMP,
          rejected_at TIMESTAMP,
          rejection_reason TEXT,
          received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS student_fee_payments_income_idx
        ON student_fee_payments(institution_id, status, received_at DESC, id DESC)
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS finance_income_categories (
          id SERIAL PRIMARY KEY,
          scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('platform','institution')),
          institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
          name VARCHAR(160) NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS finance_income_entries (
          id BIGSERIAL PRIMARY KEY,
          scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('platform','institution')),
          institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
          category_id INTEGER REFERENCES finance_income_categories(id) ON DELETE SET NULL,
          payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash','upi','net_banking')),
          paid_to VARCHAR(80) NOT NULL,
          paid_to_label VARCHAR(180) NOT NULL,
          amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
          income_date DATE NOT NULL,
          invoice_url TEXT,
          invoice_public_id TEXT,
          invoice_resource_type VARCHAR(50),
          invoice_file_name VARCHAR(240),
          description TEXT,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_income_categories_scope_name
        ON finance_income_categories(scope_type, COALESCE(institution_id, 0), LOWER(name))
        WHERE is_active = TRUE
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_finance_income_categories_lookup
        ON finance_income_categories(scope_type, institution_id, is_active, name)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_finance_income_entries_scope_date
        ON finance_income_entries(scope_type, institution_id, income_date DESC, id DESC)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_finance_income_entries_category
        ON finance_income_entries(category_id, income_date DESC)
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS finance_expense_categories (
          id SERIAL PRIMARY KEY,
          scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('platform','institution')),
          institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
          name VARCHAR(160) NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS finance_expense_entries (
          id BIGSERIAL PRIMARY KEY,
          scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('platform','institution')),
          institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
          category_id INTEGER REFERENCES finance_expense_categories(id) ON DELETE SET NULL,
          payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash','upi','net_banking')),
          payment_status VARCHAR(20) NOT NULL CHECK (payment_status IN ('paid','due')),
          paid_by VARCHAR(80) NOT NULL,
          paid_by_label VARCHAR(180) NOT NULL,
          amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
          expense_date DATE NOT NULL,
          invoice_url TEXT,
          invoice_public_id TEXT,
          invoice_resource_type VARCHAR(50),
          invoice_file_name VARCHAR(240),
          description TEXT,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_expense_categories_scope_name
        ON finance_expense_categories(scope_type, COALESCE(institution_id, 0), LOWER(name))
        WHERE is_active = TRUE
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_finance_expense_categories_lookup
        ON finance_expense_categories(scope_type, institution_id, is_active, name)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_finance_expense_entries_scope_date
        ON finance_expense_entries(scope_type, institution_id, expense_date DESC, id DESC)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_finance_expense_entries_category
        ON finance_expense_entries(category_id, expense_date DESC)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_finance_expense_entries_scope_status_date
        ON finance_expense_entries(scope_type, institution_id, payment_status, expense_date DESC)
      `);
      await db.query(`
        ALTER TABLE finance_income_entries ADD COLUMN IF NOT EXISTS payer_name VARCHAR(180);
        ALTER TABLE finance_income_entries ADD COLUMN IF NOT EXISTS payer_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE finance_income_entries ADD COLUMN IF NOT EXISTS paid_by VARCHAR(80);
        ALTER TABLE finance_income_entries ADD COLUMN IF NOT EXISTS paid_by_label VARCHAR(180);

        ALTER TABLE finance_expense_entries ADD COLUMN IF NOT EXISTS paid_to VARCHAR(80);
        ALTER TABLE finance_expense_entries ADD COLUMN IF NOT EXISTS paid_to_label VARCHAR(180);
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS finance_recurring_expense_categories (
          id SERIAL PRIMARY KEY,
          scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('platform','institution')),
          institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
          name VARCHAR(160) NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_finance_recurring_expense_categories_scope_name
        ON finance_recurring_expense_categories(scope_type, COALESCE(institution_id, 0), LOWER(name))
        WHERE is_active = TRUE
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_finance_recurring_expense_categories_lookup
        ON finance_recurring_expense_categories(scope_type, institution_id, is_active, name)
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS finance_allowance_entries (
          id BIGSERIAL PRIMARY KEY,
          scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('platform','institution')),
          institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash','upi','net_banking')),
          amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
          allowance_date DATE NOT NULL,
          invoice_url TEXT,
          invoice_public_id TEXT,
          invoice_resource_type VARCHAR(50),
          invoice_file_name VARCHAR(240),
          description TEXT,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_finance_allowance_entries_scope_date
        ON finance_allowance_entries(scope_type, institution_id, allowance_date DESC, id DESC)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_finance_allowance_entries_user_date
        ON finance_allowance_entries(user_id, allowance_date DESC)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_finance_allowance_entries_scope_method_date
        ON finance_allowance_entries(scope_type, institution_id, payment_method, allowance_date DESC)
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS finance_allowance_spend_entries (
          id BIGSERIAL PRIMARY KEY,
          allowance_id BIGINT NOT NULL REFERENCES finance_allowance_entries(id) ON DELETE CASCADE,
          scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('platform','institution')),
          institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
          user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash','upi','net_banking')),
          amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
          spend_date DATE NOT NULL,
          invoice_url TEXT,
          invoice_public_id TEXT,
          invoice_resource_type VARCHAR(50),
          invoice_file_name VARCHAR(240),
          description TEXT,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_finance_allowance_spend_allowance_date
        ON finance_allowance_spend_entries(allowance_id, spend_date DESC, id DESC)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_finance_allowance_spend_scope_user_date
        ON finance_allowance_spend_entries(scope_type, institution_id, user_id, spend_date DESC, id DESC)
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS finance_recurring_expenses (
          id BIGSERIAL PRIMARY KEY,
          scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('platform','institution')),
          institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
          title VARCHAR(180) NOT NULL,
          category_ids INTEGER[] NOT NULL DEFAULT '{}',
          payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash','upi','net_banking')),
          paid_by VARCHAR(80) NOT NULL,
          paid_by_label VARCHAR(180) NOT NULL,
          amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
          frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('monthly','yearly')),
          due_day SMALLINT NOT NULL CHECK (due_day BETWEEN 1 AND 31),
          start_date DATE NOT NULL,
          end_date DATE,
          payment_status VARCHAR(20) NOT NULL DEFAULT 'due',
          reminder_days_before SMALLINT NOT NULL DEFAULT 3,
          next_due_date DATE NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          description TEXT,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        ALTER TABLE finance_recurring_expenses
        ADD COLUMN IF NOT EXISTS end_date DATE
      `);
      await db.query(`
        ALTER TABLE finance_recurring_expenses
        ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) NOT NULL DEFAULT 'due'
      `);
      await db.query(`
        ALTER TABLE finance_recurring_expenses
        ADD COLUMN IF NOT EXISTS reminder_days_before SMALLINT NOT NULL DEFAULT 3
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS finance_recurring_expense_reminders (
          id BIGSERIAL PRIMARY KEY,
          recurring_expense_id BIGINT NOT NULL REFERENCES finance_recurring_expenses(id) ON DELETE CASCADE,
          reminder_for_date DATE NOT NULL,
          notified_on DATE NOT NULL,
          notification_id BIGINT,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(recurring_expense_id, reminder_for_date, notified_on)
        )
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_finance_recurring_expense_reminders_lookup
        ON finance_recurring_expense_reminders(recurring_expense_id, reminder_for_date, notified_on)
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS finance_recurring_expense_history (
          id BIGSERIAL PRIMARY KEY,
          recurring_expense_id BIGINT NOT NULL REFERENCES finance_recurring_expenses(id) ON DELETE CASCADE,
          action VARCHAR(40) NOT NULL,
          old_values JSONB,
          new_values JSONB,
          changed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_finance_recurring_expense_history_lookup
        ON finance_recurring_expense_history(recurring_expense_id, changed_at DESC, id DESC)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_finance_recurring_expenses_scope_due
        ON finance_recurring_expenses(scope_type, institution_id, is_active, next_due_date, id DESC)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_finance_recurring_expenses_scope_payment
        ON finance_recurring_expenses(scope_type, institution_id, is_active, payment_status, end_date, next_due_date)
      `);
      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_finance_recurring_expenses_categories
        ON finance_recurring_expenses USING GIN (category_ids)
      `);
      await db.query(`
        CREATE TABLE IF NOT EXISTS finance_payment_methods (
          id BIGSERIAL PRIMARY KEY,
          scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('platform','institution')),
          institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
          method_type VARCHAR(50) NOT NULL CHECK (method_type IN ('net_banking','phonepe','google_pay','paytm','bhim_upi','other_upi','cash','cheque','pos_card','custom')),
          title VARCHAR(180) NOT NULL,
          bank_name VARCHAR(180),
          account_holder_name VARCHAR(180),
          account_number VARCHAR(60),
          ifsc_code VARCHAR(30),
          branch_name VARCHAR(180),
          account_type VARCHAR(40),
          upi_id VARCHAR(180),
          upi_number VARCHAR(30),
          upi_provider_name VARCHAR(80),
          merchant_name VARCHAR(180),
          qr_code_url TEXT,
          qr_code_public_id TEXT,
          instructions TEXT,
          is_active BOOLEAN NOT NULL DEFAULT TRUE,
          is_default BOOLEAN NOT NULL DEFAULT FALSE,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          updated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_finance_payment_methods_scope
        ON finance_payment_methods(scope_type, institution_id, is_active, id DESC);
        CREATE TABLE IF NOT EXISTS finance_invoices (
          id BIGSERIAL PRIMARY KEY,
          invoice_number VARCHAR(60) NOT NULL UNIQUE,
          scope_type VARCHAR(20) NOT NULL CHECK (scope_type IN ('platform','institution')),
          institution_id INTEGER REFERENCES institution_profiles(id) ON DELETE CASCADE,
          income_id BIGINT REFERENCES finance_income_entries(id) ON DELETE SET NULL,
          source_type VARCHAR(40) NOT NULL DEFAULT 'income',
          payer_name VARCHAR(180) NOT NULL,
          receiver_name VARCHAR(180) NOT NULL,
          category_name VARCHAR(180) NOT NULL,
          payment_method VARCHAR(30) NOT NULL CHECK (payment_method IN ('cash','upi','net_banking')),
          amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
          tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
          total_amount NUMERIC(12,2) NOT NULL CHECK (total_amount > 0),
          invoice_date DATE NOT NULL,
          status VARCHAR(30) NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','due','cancelled')),
          notes TEXT,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_finance_invoices_scope_date
        ON finance_invoices(scope_type, institution_id, invoice_date DESC, id DESC);
        CREATE INDEX IF NOT EXISTS idx_finance_invoices_number
        ON finance_invoices(invoice_number);
        CREATE INDEX IF NOT EXISTS idx_finance_invoices_income
        ON finance_invoices(income_id);
      `);
    })().catch((error) => {
      schemaReady = null;
      throw error;
    });
  }
  return schemaReady;
}

function scopePredicate(alias: string, options: Pick<FinanceIncomeListOptions, "scope_type" | "institution_id">) {
  if (options.scope_type === "platform") return `${alias}.scope_type = 'platform'`;
  return `${alias}.scope_type = 'institution' AND ${alias}.institution_id = $1`;
}

function scopedParams(options: Pick<FinanceIncomeListOptions, "scope_type" | "institution_id">) {
  return options.scope_type === "platform" ? [] : [options.institution_id];
}

const COMMON_PAYMENT_CATEGORY_DEFAULTS: Array<{ name: string; usage_types: FinanceCategoryUsage[] }> = [
  { name: "Internet Bills", usage_types: ["income", "expense", "recurring"] },
  { name: "Water Bills", usage_types: ["income", "expense", "recurring"] },
  { name: "Others", usage_types: ["income", "expense", "recurring"] },
];

function paymentCategoryDefaults(scopeType: FinanceScope): Array<{ name: string; usage_types: FinanceCategoryUsage[] }> {
  if (scopeType === "platform") {
    return [
      { name: "Subscription", usage_types: ["income"] },
      { name: "Hosting Bills", usage_types: ["expense", "recurring"] },
      { name: "SSL", usage_types: ["expense", "recurring"] },
      { name: "Domain", usage_types: ["expense", "recurring"] },
      ...COMMON_PAYMENT_CATEGORY_DEFAULTS,
    ];
  }

  return [
    { name: "Student Fee", usage_types: ["income"] },
    { name: "Tuition Fee", usage_types: ["income"] },
    { name: "Activity", usage_types: ["income"] },
    { name: "Donation", usage_types: ["income"] },
    { name: "Exam", usage_types: ["income", "expense"] },
    { name: "Subscription", usage_types: ["expense", "recurring"] },
    { name: "Rent", usage_types: ["expense", "recurring"] },
    { name: "Tea Snacks", usage_types: ["expense", "recurring"] },
    { name: "SSL", usage_types: ["expense", "recurring"] },
    { name: "Domain", usage_types: ["expense", "recurring"] },
    ...COMMON_PAYMENT_CATEGORY_DEFAULTS,
  ];
}

async function upsertIncomeCategory(
  db: Queryable,
  scopeType: FinanceScope,
  institutionId: number | null,
  name: string,
  userId: number | null
) {
  const params = scopedParams({ scope_type: scopeType, institution_id: institutionId });
  const existing = await db.query<FinanceIncomeCategoryRow>(`
    SELECT id, scope_type, institution_id, name, is_active, created_at, updated_at
    FROM finance_income_categories fic
    WHERE ${scopePredicate("fic", { scope_type: scopeType, institution_id: institutionId })}
      AND LOWER(fic.name) = LOWER($${params.length + 1})
    LIMIT 1
  `, [...params, name]);

  if (existing.rows[0]) {
    const result = await db.query<FinanceIncomeCategoryRow>(`
      UPDATE finance_income_categories
      SET name = $2,
          is_active = TRUE,
          updated_by = COALESCE($3::int, updated_by),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, scope_type, institution_id, name, is_active, created_at, updated_at
    `, [existing.rows[0].id, name, userId]);
    return result.rows[0];
  }

  const result = await db.query<FinanceIncomeCategoryRow>(`
    INSERT INTO finance_income_categories (scope_type, institution_id, name, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $4)
    RETURNING id, scope_type, institution_id, name, is_active, created_at, updated_at
  `, [scopeType, institutionId, name, userId]);
  return result.rows[0];
}

async function upsertExpenseCategory(
  db: Queryable,
  scopeType: FinanceScope,
  institutionId: number | null,
  name: string,
  userId: number | null
) {
  const params = scopedParams({ scope_type: scopeType, institution_id: institutionId });
  const existing = await db.query<FinanceExpenseCategoryRow>(`
    SELECT id, scope_type, institution_id, name, is_active, created_at, updated_at
    FROM finance_expense_categories fec
    WHERE ${scopePredicate("fec", { scope_type: scopeType, institution_id: institutionId })}
      AND LOWER(fec.name) = LOWER($${params.length + 1})
    LIMIT 1
  `, [...params, name]);

  if (existing.rows[0]) {
    const result = await db.query<FinanceExpenseCategoryRow>(`
      UPDATE finance_expense_categories
      SET name = $2,
          is_active = TRUE,
          updated_by = COALESCE($3::int, updated_by),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, scope_type, institution_id, name, is_active, created_at, updated_at
    `, [existing.rows[0].id, name, userId]);
    return result.rows[0];
  }

  const result = await db.query<FinanceExpenseCategoryRow>(`
    INSERT INTO finance_expense_categories (scope_type, institution_id, name, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $4)
    RETURNING id, scope_type, institution_id, name, is_active, created_at, updated_at
  `, [scopeType, institutionId, name, userId]);
  return result.rows[0];
}

async function upsertRecurringExpenseCategory(
  db: Queryable,
  scopeType: FinanceScope,
  institutionId: number | null,
  name: string,
  userId: number | null
) {
  const params = scopedParams({ scope_type: scopeType, institution_id: institutionId });
  const existing = await db.query<FinanceRecurringExpenseCategoryRow>(`
    SELECT id, scope_type, institution_id, name, is_active, created_at, updated_at
    FROM finance_recurring_expense_categories frec
    WHERE ${scopePredicate("frec", { scope_type: scopeType, institution_id: institutionId })}
      AND LOWER(frec.name) = LOWER($${params.length + 1})
    LIMIT 1
  `, [...params, name]);

  if (existing.rows[0]) {
    const result = await db.query<FinanceRecurringExpenseCategoryRow>(`
      UPDATE finance_recurring_expense_categories
      SET name = $2,
          is_active = TRUE,
          updated_by = COALESCE($3::int, updated_by),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, scope_type, institution_id, name, is_active, created_at, updated_at
    `, [existing.rows[0].id, name, userId]);
    return result.rows[0];
  }

  const result = await db.query<FinanceRecurringExpenseCategoryRow>(`
    INSERT INTO finance_recurring_expense_categories (scope_type, institution_id, name, created_by, updated_by)
    VALUES ($1, $2, $3, $4, $4)
    RETURNING id, scope_type, institution_id, name, is_active, created_at, updated_at
  `, [scopeType, institutionId, name, userId]);
  return result.rows[0];
}

async function deactivateCategoryByName(
  db: Queryable,
  tableName: "finance_income_categories" | "finance_expense_categories" | "finance_recurring_expense_categories",
  alias: string,
  scopeType: FinanceScope,
  institutionId: number | null,
  name: string,
  userId: number | null
) {
  const params = scopedParams({ scope_type: scopeType, institution_id: institutionId });
  await db.query(`
    UPDATE ${tableName} ${alias}
    SET is_active = FALSE,
        updated_by = COALESCE($${params.length + 2}::int, updated_by),
        updated_at = CURRENT_TIMESTAMP
    WHERE LOWER(${alias}.name) = LOWER($${params.length + 1})
      AND ${scopePredicate(alias, { scope_type: scopeType, institution_id: institutionId })}
  `, [...params, name, userId]);
}

async function syncDefaultCategoryTable(
  db: Queryable,
  tableName: "finance_income_categories" | "finance_expense_categories" | "finance_recurring_expense_categories",
  scopeType: FinanceScope,
  institutionId: number | null,
  allNames: string[],
  activeNames: string[]
) {
  const normalizedAllNames = allNames.map((name) => name.toLowerCase());
  const normalizedActiveNames = activeNames.map((name) => name.toLowerCase());

  if (activeNames.length) {
    await db.query(`
      UPDATE ${tableName} target
      SET is_active = TRUE,
          updated_at = CURRENT_TIMESTAMP
      WHERE target.scope_type = $1::varchar
        AND COALESCE(target.institution_id, 0) = COALESCE($2::int, 0)
        AND LOWER(target.name) = ANY($3::text[])
    `, [scopeType, institutionId, normalizedActiveNames]);

    await db.query(`
      INSERT INTO ${tableName} (scope_type, institution_id, name, created_by, updated_by)
      SELECT $1::varchar, $2::int, defaults.name, NULL, NULL
      FROM UNNEST($3::text[]) AS defaults(name)
      WHERE NOT EXISTS (
        SELECT 1
        FROM ${tableName} existing
        WHERE existing.scope_type = $1::varchar
          AND COALESCE(existing.institution_id, 0) = COALESCE($2::int, 0)
          AND LOWER(existing.name) = LOWER(defaults.name)
      )
    `, [scopeType, institutionId, activeNames]);
  }

  await db.query(`
    UPDATE ${tableName} target
    SET is_active = FALSE,
        updated_at = CURRENT_TIMESTAMP
    WHERE target.scope_type = $1::varchar
      AND COALESCE(target.institution_id, 0) = COALESCE($2::int, 0)
      AND LOWER(target.name) = ANY($3::text[])
      AND NOT (LOWER(target.name) = ANY($4::text[]))
  `, [scopeType, institutionId, normalizedAllNames, normalizedActiveNames]);
}

async function ensureDefaultPaymentCategories(db: Queryable, scopeType: FinanceScope, institutionId: number | null) {
  const cacheKey = `${scopeType}:${institutionId ?? "platform"}`;
  const existing = defaultPaymentCategoriesReady.get(cacheKey);
  if (existing) return existing;

  const ready = (async () => {
    const defaults = paymentCategoryDefaults(scopeType);
    const allNames = defaults.map((category) => category.name);
    const namesFor = (usageType: FinanceCategoryUsage) =>
      defaults.filter((category) => category.usage_types.includes(usageType)).map((category) => category.name);

    await Promise.all([
      syncDefaultCategoryTable(db, "finance_income_categories", scopeType, institutionId, allNames, namesFor("income")),
      syncDefaultCategoryTable(db, "finance_expense_categories", scopeType, institutionId, allNames, namesFor("expense")),
      syncDefaultCategoryTable(db, "finance_recurring_expense_categories", scopeType, institutionId, allNames, namesFor("recurring")),
    ]);
  })().catch((error) => {
    defaultPaymentCategoriesReady.delete(cacheKey);
    throw error;
  });
  defaultPaymentCategoriesReady.set(cacheKey, ready);
  return ready;
}

export async function listFinanceIncomeCategories(
  db: Queryable,
  scopeType: FinanceScope,
  institutionId: number | null
) {
  await ensureFinanceIncomeSchema(db);
  await ensureDefaultPaymentCategories(db, scopeType, institutionId);
  const params = scopedParams({ scope_type: scopeType, institution_id: institutionId });
  const result = await db.query<FinanceIncomeCategoryRow>(`
    SELECT id, scope_type, institution_id, name, is_active, created_at, updated_at
    FROM finance_income_categories fic
    WHERE ${scopePredicate("fic", { scope_type: scopeType, institution_id: institutionId })}
      AND fic.is_active = TRUE
    ORDER BY fic.name ASC
  `, params);
  return result.rows;
}

export async function createFinanceIncomeCategory(
  db: Queryable,
  scopeType: FinanceScope,
  institutionId: number | null,
  name: string,
  userId: number
) {
  await ensureFinanceIncomeSchema(db);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required");
  return upsertIncomeCategory(db, scopeType, institutionId, trimmed, userId);
}

export async function createFinanceExpenseCategory(
  db: Queryable,
  scopeType: FinanceScope,
  institutionId: number | null,
  name: string,
  userId: number
) {
  await ensureFinanceIncomeSchema(db);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required");
  return upsertExpenseCategory(db, scopeType, institutionId, trimmed, userId);
}

export async function listFinancePaymentCategories(
  db: Queryable,
  scopeType: FinanceScope,
  institutionId: number | null
) {
  await ensureFinanceIncomeSchema(db);
  await ensureDefaultPaymentCategories(db, scopeType, institutionId);
  const params = scopedParams({ scope_type: scopeType, institution_id: institutionId });
  const scopeSql = scopePredicate("source", { scope_type: scopeType, institution_id: institutionId });
  const result = await db.query<FinancePaymentCategoryRow>(`
    WITH source AS (
      SELECT
        'income'::text AS usage_source,
        fic.id AS source_id,
        fic.scope_type,
        fic.institution_id,
        fic.name,
        fic.is_active,
        fic.created_at,
        fic.updated_at
      FROM finance_income_categories fic
      WHERE fic.is_active = TRUE
      UNION ALL
      SELECT
        'expense'::text AS usage_source,
        fec.id AS source_id,
        fec.scope_type,
        fec.institution_id,
        fec.name,
        fec.is_active,
        fec.created_at,
        fec.updated_at
      FROM finance_expense_categories fec
      WHERE fec.is_active = TRUE
      UNION ALL
      SELECT
        'recurring'::text AS usage_source,
        frec.id AS source_id,
        frec.scope_type,
        frec.institution_id,
        frec.name,
        frec.is_active,
        frec.created_at,
        frec.updated_at
      FROM finance_recurring_expense_categories frec
      WHERE frec.is_active = TRUE
    ),
    grouped AS (
      SELECT
        scope_type,
        institution_id,
        LOWER(name) AS name_key,
        MIN(name) AS name,
        MAX(CASE WHEN usage_source = 'income' THEN source_id END)::int AS income_id,
        MAX(CASE WHEN usage_source = 'expense' THEN source_id END)::int AS expense_id,
        MAX(CASE WHEN usage_source = 'recurring' THEN source_id END)::int AS recurring_id,
        MIN(created_at) AS created_at,
        MAX(updated_at) AS updated_at
      FROM source
      WHERE ${scopeSql}
      GROUP BY scope_type, institution_id, LOWER(name)
    )
    SELECT
      CONCAT(COALESCE(income_id, 0), ':', COALESCE(expense_id, 0), ':', COALESCE(recurring_id, 0), ':', name_key) AS id,
      income_id,
      expense_id,
      recurring_id,
      scope_type,
      institution_id,
      name,
      ARRAY_REMOVE(ARRAY[
        CASE WHEN income_id IS NOT NULL THEN 'income' END,
        CASE WHEN expense_id IS NOT NULL THEN 'expense' END,
        CASE WHEN recurring_id IS NOT NULL THEN 'recurring' END
      ], NULL)::text[] AS usage_types,
      TRUE AS is_active,
      created_at,
      updated_at
    FROM grouped
    ORDER BY CASE WHEN name = 'Others' THEN 1 ELSE 0 END, name ASC
  `, params);
  return result.rows;
}

export async function createFinancePaymentCategory(
  db: Queryable,
  scopeType: FinanceScope,
  institutionId: number | null,
  name: string,
  usageTypes: FinanceCategoryUsage[],
  userId: number
) {
  await ensureFinanceIncomeSchema(db);
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required");
  const allowed = new Set<FinanceCategoryUsage>(["income", "expense", "recurring"]);
  const normalizedUsageTypes = Array.from(new Set(usageTypes.filter((usage) => allowed.has(usage))));
  if (normalizedUsageTypes.length === 0) {
    throw new Error("Select a valid category type");
  }

  if (normalizedUsageTypes.includes("income")) {
    await upsertIncomeCategory(db, scopeType, institutionId, trimmed, userId);
  } else {
    await deactivateCategoryByName(db, "finance_income_categories", "fic", scopeType, institutionId, trimmed, userId);
  }
  if (normalizedUsageTypes.includes("expense")) {
    await upsertExpenseCategory(db, scopeType, institutionId, trimmed, userId);
  } else {
    await deactivateCategoryByName(db, "finance_expense_categories", "fec", scopeType, institutionId, trimmed, userId);
  }
  if (normalizedUsageTypes.includes("recurring")) {
    await upsertRecurringExpenseCategory(db, scopeType, institutionId, trimmed, userId);
  } else {
    await deactivateCategoryByName(db, "finance_recurring_expense_categories", "frec", scopeType, institutionId, trimmed, userId);
  }

  const categories = await listFinancePaymentCategories(db, scopeType, institutionId);
  return categories.find((category) => category.name.toLowerCase() === trimmed.toLowerCase()) ?? categories[0];
}

export async function deactivateFinanceIncomeCategory(
  db: Queryable,
  scopeType: FinanceScope,
  institutionId: number | null,
  categoryId: number,
  userId: number
) {
  await ensureFinanceIncomeSchema(db);
  const params = scopedParams({ scope_type: scopeType, institution_id: institutionId });
  await db.query(`
    UPDATE finance_income_categories fic
    SET is_active = FALSE, updated_by = $${params.length + 2}, updated_at = CURRENT_TIMESTAMP
    WHERE fic.id = $${params.length + 1}
      AND ${scopePredicate("fic", { scope_type: scopeType, institution_id: institutionId })}
  `, [...params, categoryId, userId]);
}

export async function deactivateFinancePaymentCategory(
  db: Queryable,
  scopeType: FinanceScope,
  institutionId: number | null,
  input: { incomeId?: number | null; expenseId?: number | null; recurringId?: number | null; name?: string | null },
  userId: number
) {
  await ensureFinanceIncomeSchema(db);
  const params = scopedParams({ scope_type: scopeType, institution_id: institutionId });
  const incomeId = Number(input.incomeId);
  const expenseId = Number(input.expenseId);
  const recurringId = Number(input.recurringId);
  const name = String(input.name ?? "").trim();

  if (Number.isInteger(incomeId) && incomeId > 0) {
    await db.query(`
      UPDATE finance_income_categories fic
      SET is_active = FALSE, updated_by = $${params.length + 2}, updated_at = CURRENT_TIMESTAMP
      WHERE fic.id = $${params.length + 1}
        AND ${scopePredicate("fic", { scope_type: scopeType, institution_id: institutionId })}
    `, [...params, incomeId, userId]);
  } else if (name) {
    await db.query(`
      UPDATE finance_income_categories fic
      SET is_active = FALSE, updated_by = $${params.length + 2}, updated_at = CURRENT_TIMESTAMP
      WHERE LOWER(fic.name) = LOWER($${params.length + 1})
        AND ${scopePredicate("fic", { scope_type: scopeType, institution_id: institutionId })}
    `, [...params, name, userId]);
  }

  if (Number.isInteger(expenseId) && expenseId > 0) {
    await db.query(`
      UPDATE finance_expense_categories fec
      SET is_active = FALSE, updated_by = $${params.length + 2}, updated_at = CURRENT_TIMESTAMP
      WHERE fec.id = $${params.length + 1}
        AND ${scopePredicate("fec", { scope_type: scopeType, institution_id: institutionId })}
    `, [...params, expenseId, userId]);
  } else if (name) {
    await db.query(`
      UPDATE finance_expense_categories fec
      SET is_active = FALSE, updated_by = $${params.length + 2}, updated_at = CURRENT_TIMESTAMP
      WHERE LOWER(fec.name) = LOWER($${params.length + 1})
        AND ${scopePredicate("fec", { scope_type: scopeType, institution_id: institutionId })}
    `, [...params, name, userId]);
  }

  if (Number.isInteger(recurringId) && recurringId > 0) {
    await db.query(`
      UPDATE finance_recurring_expense_categories frec
      SET is_active = FALSE, updated_by = $${params.length + 2}, updated_at = CURRENT_TIMESTAMP
      WHERE frec.id = $${params.length + 1}
        AND ${scopePredicate("frec", { scope_type: scopeType, institution_id: institutionId })}
    `, [...params, recurringId, userId]);
  } else if (name) {
    await db.query(`
      UPDATE finance_recurring_expense_categories frec
      SET is_active = FALSE, updated_by = $${params.length + 2}, updated_at = CURRENT_TIMESTAMP
      WHERE LOWER(frec.name) = LOWER($${params.length + 1})
        AND ${scopePredicate("frec", { scope_type: scopeType, institution_id: institutionId })}
    `, [...params, name, userId]);
  }
}

export async function createFinanceIncomeEntry(db: Queryable, input: FinanceIncomeInput) {
  await ensureFinanceIncomeSchema(db);
  const category = await db.query<{ id: number }>(`
    SELECT id
    FROM finance_income_categories fic
    WHERE fic.id = $1
      AND fic.is_active = TRUE
      AND fic.scope_type = $2
      AND COALESCE(fic.institution_id, 0) = COALESCE($3::int, 0)
    LIMIT 1
  `, [input.category_id, input.scope_type, input.institution_id]);
  if (!category.rows[0]) throw new Error("Select a valid income category");

  const result = await db.query<{ id: string }>(`
    INSERT INTO finance_income_entries (
      scope_type, institution_id, category_id, payment_method, paid_to, paid_to_label,
      paid_by, paid_by_label, payer_name,
      amount, income_date, invoice_url, invoice_public_id, invoice_resource_type,
      invoice_file_name, description, created_by, updated_by
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17)
    RETURNING id
  `, [
    input.scope_type,
    input.institution_id,
    input.category_id,
    input.payment_method,
    input.paid_to,
    input.paid_to_label,
    input.paid_by ?? null,
    input.paid_by_label ?? null,
    input.payer_name ?? input.paid_by_label ?? null,
    input.amount,
    input.income_date,
    input.invoice_url ?? null,
    input.invoice_public_id ?? null,
    input.invoice_resource_type ?? null,
    input.invoice_file_name ?? null,
    input.description ?? null,
    input.user_id,
  ]);

  // Auto-generate corresponding Invoice record
  const incomeId = result.rows[0]?.id;
  if (incomeId) {
    try {
      const now = new Date();
      const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
      const invoiceNumber = `INV-${datePart}-${String(incomeId).padStart(4, "0")}`;

      const catRes = await db.query<{ name: string }>(
        `SELECT name FROM finance_income_categories WHERE id = $1 LIMIT 1`,
        [input.category_id]
      );
      const categoryName = catRes.rows[0]?.name || "Income";

      await db.query(
        `
          INSERT INTO finance_invoices (
            invoice_number,
            scope_type,
            institution_id,
            income_id,
            source_type,
            payer_name,
            receiver_name,
            category_name,
            payment_method,
            amount,
            tax_amount,
            total_amount,
            invoice_date,
            status,
            notes,
            created_by
          )
          VALUES ($1, $2, $3, $4, 'income', $5, $6, $7, $8, $9, 0, $9, $10, 'paid', $11, $12)
          ON CONFLICT (invoice_number) DO NOTHING
        `,
        [
          invoiceNumber,
          input.scope_type,
          input.institution_id,
          incomeId,
          input.payer_name ?? input.paid_by_label ?? "Customer / Payer",
          input.paid_to_label || input.paid_to || "Receiver",
          categoryName,
          input.payment_method,
          input.amount,
          input.income_date,
          input.description || null,
          input.user_id || null,
        ]
      );
    } catch (invErr) {
      console.error("Auto-generating invoice error:", invErr);
    }
  }

  return result.rows[0];
}

type RecurringExpenseUpdateInput = FinanceRecurringExpenseInput & {
  id: number;
};

function recurringSnapshot(row: Record<string, unknown>) {
  return {
    title: row.title,
    category_ids: row.category_ids,
    payment_method: row.payment_method,
    paid_by: row.paid_by,
    paid_by_label: row.paid_by_label,
    amount: row.amount,
    frequency: row.frequency,
    due_day: row.due_day,
    start_date: row.start_date,
    end_date: row.end_date,
    payment_status: row.payment_status,
    reminder_days_before: row.reminder_days_before,
    next_due_date: row.next_due_date,
    is_active: row.is_active,
    description: row.description,
  };
}

export async function updateFinanceRecurringExpense(db: Queryable, input: RecurringExpenseUpdateInput) {
  await ensureFinanceIncomeSchema(db);
  await ensureDefaultPaymentCategories(db, input.scope_type, input.institution_id);
  const title = input.title.trim();
  if (!title) throw new Error("Expense name is required");
  if (input.category_ids.length === 0) throw new Error("Select at least one expense category");

  const validCategories = await db.query<{ count: string }>(`
    SELECT COUNT(*) AS count
    FROM finance_recurring_expense_categories frec
    WHERE frec.id = ANY($1::int[])
      AND frec.is_active = TRUE
      AND frec.scope_type = $2
      AND COALESCE(frec.institution_id, 0) = COALESCE($3::int, 0)
  `, [input.category_ids, input.scope_type, input.institution_id]);
  if (Number(validCategories.rows[0]?.count ?? 0) !== input.category_ids.length) {
    throw new Error("Select valid recurring categories");
  }

  const scopeParams = expenseScopedParams({ scope_type: input.scope_type, institution_id: input.institution_id });
  const before = await db.query<Record<string, unknown>>(`
    SELECT *
    FROM finance_recurring_expenses fre
    WHERE ${recurringScopePredicate("fre", { scope_type: input.scope_type, institution_id: input.institution_id })}
      AND fre.id = $${scopeParams.length + 1}
    LIMIT 1
  `, [...scopeParams, input.id]);
  if (!before.rows[0]) return null;

  const updated = await db.query<{ id: string }>(`
    UPDATE finance_recurring_expenses fre
    SET title = $${scopeParams.length + 2},
        category_ids = $${scopeParams.length + 3}::int[],
        payment_method = $${scopeParams.length + 4},
        paid_by = $${scopeParams.length + 5},
        paid_by_label = $${scopeParams.length + 6},
        amount = $${scopeParams.length + 7},
        frequency = $${scopeParams.length + 8},
        due_day = $${scopeParams.length + 9},
        start_date = $${scopeParams.length + 10},
        end_date = $${scopeParams.length + 11},
        payment_status = $${scopeParams.length + 12},
        reminder_days_before = $${scopeParams.length + 13},
        next_due_date = $${scopeParams.length + 14},
        description = $${scopeParams.length + 15},
        updated_by = $${scopeParams.length + 16},
        updated_at = CURRENT_TIMESTAMP
    WHERE ${recurringScopePredicate("fre", { scope_type: input.scope_type, institution_id: input.institution_id })}
      AND fre.id = $${scopeParams.length + 1}
    RETURNING fre.id::text
  `, [
    ...scopeParams,
    input.id,
    title,
    input.category_ids,
    input.payment_method,
    input.paid_by,
    input.paid_by_label,
    input.amount,
    input.frequency,
    input.due_day,
    input.start_date,
    input.end_date ?? null,
    input.payment_status,
    input.reminder_days_before,
    input.next_due_date,
    input.description ?? null,
    input.user_id,
  ]);

  await db.query(`
    INSERT INTO finance_recurring_expense_history (
      recurring_expense_id, action, old_values, new_values, changed_by
    )
    VALUES ($1::bigint, 'updated', $2::jsonb, $3::jsonb, $4)
  `, [
    input.id,
    JSON.stringify(recurringSnapshot(before.rows[0])),
    JSON.stringify({
      title,
      category_ids: input.category_ids,
      payment_method: input.payment_method,
      paid_by: input.paid_by,
      paid_by_label: input.paid_by_label,
      amount: input.amount,
      frequency: input.frequency,
      due_day: input.due_day,
      start_date: input.start_date,
      end_date: input.end_date ?? null,
      payment_status: input.payment_status,
      reminder_days_before: input.reminder_days_before,
      next_due_date: input.next_due_date,
      is_active: true,
      description: input.description ?? null,
    }),
    input.user_id,
  ]);

  return updated.rows[0] ?? null;
}

function incomeRowsSql(options: Pick<FinanceIncomeListOptions, "scope_type" | "institution_id">) {
  const isInstitutionScope = options.scope_type === "institution";
  return `
    WITH income_rows AS (
      SELECT
        ('manual:' || fie.id)::text AS row_id,
        fie.id::bigint AS source_id,
        'manual'::text AS source_type,
        fie.scope_type::text AS scope_type,
        fie.institution_id,
        ip.name AS institution_name,
        fie.income_date,
        fie.amount,
        fie.payment_method::text AS payment_method,
        fie.paid_by,
        fie.paid_by_label,
        fie.paid_to,
        fie.paid_to_label,
        fie.category_id,
        COALESCE(fic.name, 'Manual Income') AS category_name,
        COALESCE(fie.payer_name, fie.paid_by_label, creator.full_name, 'Payer') AS payer_name,
        NULL::text AS reference,
        fie.invoice_url,
        fie.invoice_public_id,
        fie.invoice_resource_type,
        fie.invoice_file_name,
        fie.description,
        fie.created_at
      FROM finance_income_entries fie
      LEFT JOIN finance_income_categories fic ON fic.id = fie.category_id
      LEFT JOIN institution_profiles ip ON ip.id = fie.institution_id
      LEFT JOIN users creator ON creator.id = fie.created_by
      WHERE ${scopePredicate("fie", options)}

      UNION ALL

      SELECT
        ('fee_payment:' || sfp.id)::text AS row_id,
        sfp.id::bigint AS source_id,
        'fee_payment'::text AS source_type,
        'institution'::text AS scope_type,
        sfp.institution_id,
        ip.name AS institution_name,
        COALESCE(sfp.received_at, sfp.verified_at, sfp.created_at)::date AS income_date,
        COALESCE(sfp.total_amount, sfp.subtotal_amount, 0) AS amount,
        CASE 
          WHEN sfp.payment_method = 'qr' THEN 'upi'
          WHEN sfp.payment_method IN ('cash', 'upi', 'net_banking') THEN sfp.payment_method
          ELSE 'cash'
        END::text AS payment_method,
        'student'::text AS paid_by,
        COALESCE(student.full_name, 'Student #' || sfp.student_user_id)::text AS paid_by_label,
        CASE WHEN sfp.received_by IS NOT NULL THEN 'admin' ELSE 'institution_account' END::text AS paid_to,
        COALESCE(receiver.full_name, 'Institution Account')::text AS paid_to_label,
        NULL::int AS category_id,
        CASE 
          WHEN prog.title IS NOT NULL THEN ('Student Fee (' || prog.title || ')')::text
          ELSE 'Student Fee'::text
        END AS category_name,
        COALESCE(student.full_name, 'Student #' || sfp.student_user_id) AS payer_name,
        COALESCE(sfp.transaction_id, 'FEE-' || sfp.id)::text AS reference,
        sfp.screenshot_url AS invoice_url,
        sfp.screenshot_public_id AS invoice_public_id,
        sfp.screenshot_resource_type AS invoice_resource_type,
        NULL::varchar AS invoice_file_name,
        COALESCE(sfp.remarks, 'Student Fee Payment') AS description,
        sfp.created_at
      FROM student_fee_payments sfp
      LEFT JOIN institution_profiles ip ON ip.id = sfp.institution_id
      LEFT JOIN users student ON student.id = sfp.student_user_id
      LEFT JOIN users receiver ON receiver.id = COALESCE(sfp.received_by, sfp.verified_by)
      LEFT JOIN student_enrollments se ON se.id = sfp.enrollment_id
      LEFT JOIN institution_programs prog ON prog.id = se.program_id
      WHERE ${isInstitutionScope || options.institution_id ? `sfp.institution_id = $1` : `1=0`}
        AND LOWER(COALESCE(sfp.status, 'paid')) IN ('paid', 'verified', 'approved')
        AND COALESCE(sfp.total_amount, sfp.subtotal_amount, 0) > 0

      ${options.scope_type === "platform" ? `
      UNION ALL
      SELECT
        ('subscription:' || sub.id)::text AS row_id,
        sub.id::bigint AS source_id,
        'subscription'::text AS source_type,
        'platform'::text AS scope_type,
        NULL::int AS institution_id,
        ip.name AS institution_name,
        COALESCE(sub.approved_at, sub.starts_at::timestamp, sub.created_at)::date AS income_date,
        sub.price AS amount,
        'net_banking'::text AS payment_method,
        sub.created_by::text AS paid_by,
        COALESCE(ip.name, 'Institution')::text AS paid_by_label,
        'platform_account'::text AS paid_to,
        'Platform Account'::text AS paid_to_label,
        NULL::int AS category_id,
        'Subscription'::text AS category_name,
        ip.name AS payer_name,
        sp.name AS reference,
        NULL::text AS invoice_url,
        NULL::text AS invoice_public_id,
        NULL::varchar AS invoice_resource_type,
        NULL::varchar AS invoice_file_name,
        sp.description AS description,
        sub.updated_at AS created_at
      FROM institution_subscriptions sub
      JOIN institution_profiles ip ON ip.id = sub.institution_id
      JOIN sales_packages sp ON sp.id = sub.package_id
      WHERE sub.status = 'active'
      ` : ``}
    )
  `;
}

function addFilters(baseIndex: number, options: FinanceIncomeListOptions) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (options.search.trim()) {
    params.push(`%${options.search.trim()}%`);
    clauses.push(`(
      category_name ILIKE $${baseIndex + params.length}
      OR COALESCE(institution_name, '') ILIKE $${baseIndex + params.length}
      OR COALESCE(payer_name, '') ILIKE $${baseIndex + params.length}
      OR COALESCE(reference, '') ILIKE $${baseIndex + params.length}
      OR COALESCE(description, '') ILIKE $${baseIndex + params.length}
    )`);
  }
  if (options.payment_method && options.payment_method !== "all") {
    params.push(options.payment_method);
    clauses.push(`payment_method = $${baseIndex + params.length}`);
  }
  if (options.source_type && options.source_type !== "all") {
    params.push(options.source_type);
    clauses.push(`source_type = $${baseIndex + params.length}`);
  }
  if (options.from_date) {
    params.push(options.from_date);
    clauses.push(`income_date >= $${baseIndex + params.length}::date`);
  }
  if (options.to_date) {
    params.push(options.to_date);
    clauses.push(`income_date <= $${baseIndex + params.length}::date`);
  }
  return {
    params,
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
  };
}

export async function listFinanceIncome(db: Queryable, options: FinanceIncomeListOptions) {
  await ensureFinanceIncomeSchema(db);
  const scopeParams = scopedParams(options);
  const filters = addFilters(scopeParams.length, options);
  const baseSql = incomeRowsSql(options);
  const params = [...scopeParams, ...filters.params];
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartText = monthStart.toISOString().slice(0, 10);

  const [data, total, filteredTotal, thisMonth] = await Promise.all([
    db.query<FinanceIncomeRow>(`
      ${baseSql}
      SELECT *
      FROM income_rows
      ${filters.where}
      ORDER BY income_date DESC, created_at DESC, row_id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, options.limit, options.offset]),
    db.query<{ count: string }>(`
      ${baseSql}
      SELECT COUNT(*) AS count FROM income_rows ${filters.where}
    `, params),
    db.query<{ total: string | null }>(`
      ${baseSql}
      SELECT COALESCE(SUM(amount), 0) AS total FROM income_rows ${filters.where}
    `, params),
    db.query<{ total: string | null }>(`
      ${baseSql}
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM income_rows
      WHERE income_date >= $${scopeParams.length + 1}::date
    `, [...scopeParams, monthStartText]),
  ]);

  return {
    data: data.rows,
    total: Number(total.rows[0]?.count ?? 0),
    filtered_total: filteredTotal.rows[0]?.total ?? "0",
    this_month_total: thisMonth.rows[0]?.total ?? "0",
  };
}

export async function getInstitutionAdminName(db: Queryable, institutionId: number) {
  const result = await db.query<{ full_name: string }>(`
    SELECT u.full_name
    FROM institution_memberships im
    JOIN roles r ON r.id = im.role_id AND r.code = 'institution_admin'
    JOIN users u ON u.id = im.user_id
    WHERE im.institution_id = $1
      AND im.is_active = TRUE
      AND COALESCE(im.is_deleted, FALSE) = FALSE
      AND u.is_active = TRUE
      AND COALESCE(u.is_deleted, FALSE) = FALSE
    ORDER BY im.id ASC
    LIMIT 1
  `, [institutionId]);
  return result.rows[0]?.full_name ?? "Institution Admin";
}

export async function getInstitutionName(db: Queryable, institutionId: number) {
  const result = await db.query<{ name: string } & QueryResultRow>(`
    SELECT name
    FROM institution_profiles
    WHERE id = $1 AND COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1
  `, [institutionId]);
  return result.rows[0]?.name ?? null;
}

function expenseScopePredicate(alias: string, options: Pick<FinanceExpenseListOptions, "scope_type" | "institution_id">) {
  if (options.scope_type === "platform") return `${alias}.scope_type = 'platform'`;
  return `${alias}.scope_type = 'institution' AND ${alias}.institution_id = $1::int`;
}

function expenseScopedParams(options: Pick<FinanceExpenseListOptions, "scope_type" | "institution_id">) {
  return options.scope_type === "platform" ? [] : [options.institution_id];
}

export async function listFinanceExpenseCategories(
  db: Queryable,
  scopeType: FinanceScope,
  institutionId: number | null
) {
  await ensureFinanceIncomeSchema(db);
  await ensureDefaultPaymentCategories(db, scopeType, institutionId);
  const params = expenseScopedParams({ scope_type: scopeType, institution_id: institutionId });
  const result = await db.query<FinanceExpenseCategoryRow>(`
    SELECT id, scope_type, institution_id, name, is_active, created_at, updated_at
    FROM finance_expense_categories fec
    WHERE ${expenseScopePredicate("fec", { scope_type: scopeType, institution_id: institutionId })}
      AND fec.is_active = TRUE
    ORDER BY CASE WHEN fec.name = 'Others' THEN 1 ELSE 0 END, fec.name ASC
  `, params);
  return result.rows;
}

export async function listFinanceRecurringExpenseCategories(
  db: Queryable,
  scopeType: FinanceScope,
  institutionId: number | null
) {
  await ensureFinanceIncomeSchema(db);
  await ensureDefaultPaymentCategories(db, scopeType, institutionId);
  const params = expenseScopedParams({ scope_type: scopeType, institution_id: institutionId });
  const result = await db.query<FinanceRecurringExpenseCategoryRow>(`
    SELECT id, scope_type, institution_id, name, is_active, created_at, updated_at
    FROM finance_recurring_expense_categories frec
    WHERE ${expenseScopePredicate("frec", { scope_type: scopeType, institution_id: institutionId })}
      AND frec.is_active = TRUE
    ORDER BY CASE WHEN frec.name = 'Others' THEN 1 ELSE 0 END, frec.name ASC
  `, params);
  return result.rows;
}

export async function createFinanceExpenseEntry(db: Queryable, input: FinanceExpenseInput) {
  await ensureFinanceIncomeSchema(db);
  const category = await db.query<{ id: number }>(`
    SELECT id
    FROM finance_expense_categories fec
    WHERE fec.id = $1
      AND fec.is_active = TRUE
      AND fec.scope_type = $2
      AND COALESCE(fec.institution_id, 0) = COALESCE($3::int, 0)
    LIMIT 1
  `, [input.category_id, input.scope_type, input.institution_id]);
  if (!category.rows[0]) throw new Error("Select a valid expense category");

  const result = await db.query<{ id: string }>(`
    INSERT INTO finance_expense_entries (
      scope_type, institution_id, category_id, payment_method, payment_status,
      paid_by, paid_by_label, paid_to, paid_to_label, amount, expense_date, invoice_url, invoice_public_id,
      invoice_resource_type, invoice_file_name, description, created_by, updated_by
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17)
    RETURNING id
  `, [
    input.scope_type,
    input.institution_id,
    input.category_id,
    input.payment_method,
    input.payment_status,
    input.paid_by,
    input.paid_by_label,
    input.paid_to ?? null,
    input.paid_to_label ?? null,
    input.amount,
    input.expense_date,
    input.invoice_url ?? null,
    input.invoice_public_id ?? null,
    input.invoice_resource_type ?? null,
    input.invoice_file_name ?? null,
    input.description ?? null,
    input.user_id,
  ]);
  return result.rows[0];
}

function expenseRowsSql(options: Pick<FinanceExpenseListOptions, "scope_type" | "institution_id">) {
  const institutionParam = options.scope_type === "institution" ? "$1::int" : "NULL";
  return `
    WITH expense_rows AS (
      SELECT
        ('manual:' || fee.id)::text AS row_id,
        fee.id::bigint AS source_id,
        'manual'::text AS source_type,
        fee.scope_type::text AS scope_type,
        fee.institution_id,
        ip.name AS institution_name,
        fee.expense_date,
        fee.amount,
        fee.payment_method::text AS payment_method,
        fee.payment_status::text AS payment_status,
        fee.paid_by,
        fee.paid_by_label,
        COALESCE(fee.paid_to, '')::text AS paid_to,
        COALESCE(fee.paid_to_label, fee.paid_to, '')::text AS paid_to_label,
        fee.category_id,
        COALESCE(fec.name, 'Manual Expense') AS category_name,
        NULL::text AS reference,
        fee.invoice_url,
        fee.invoice_public_id,
        fee.invoice_resource_type,
        fee.invoice_file_name,
        fee.description,
        fee.created_at
      FROM finance_expense_entries fee
      LEFT JOIN finance_expense_categories fec ON fec.id = fee.category_id
      LEFT JOIN institution_profiles ip ON ip.id = fee.institution_id
      WHERE ${expenseScopePredicate("fee", options)}

      ${options.scope_type === "institution" ? `
      UNION ALL
      SELECT
        ('subscription:' || sub.id)::text AS row_id,
        sub.id::bigint AS source_id,
        'subscription'::text AS source_type,
        'institution'::text AS scope_type,
        sub.institution_id,
        ip.name AS institution_name,
        COALESCE(sub.approved_at, sub.starts_at::timestamp, sub.created_at)::date AS expense_date,
        sub.price AS amount,
        'net_banking'::text AS payment_method,
        'paid'::text AS payment_status,
        'institution_account'::text AS paid_by,
        'Institution Account'::text AS paid_by_label,
        'platform'::text AS paid_to,
        'Platform Account'::text AS paid_to_label,
        NULL::int AS category_id,
        'Subscription'::text AS category_name,
        sp.name AS reference,
        NULL::text AS invoice_url,
        NULL::text AS invoice_public_id,
        NULL::varchar AS invoice_resource_type,
        NULL::varchar AS invoice_file_name,
        sp.description AS description,
        sub.updated_at AS created_at
      FROM institution_subscriptions sub
      JOIN institution_profiles ip ON ip.id = sub.institution_id
      JOIN sales_packages sp ON sp.id = sub.package_id
      WHERE sub.institution_id = ${institutionParam}
        AND sub.status = 'active'
      ` : ""}

      UNION ALL
      SELECT
        ('allowance:' || fae.id)::text AS row_id,
        fae.id::bigint AS source_id,
        'allowance'::text AS source_type,
        fae.scope_type::text AS scope_type,
        fae.institution_id,
        ip.name AS institution_name,
        fae.allowance_date AS expense_date,
        fae.amount,
        fae.payment_method::text AS payment_method,
        'paid'::text AS payment_status,
        ('user:' || fae.user_id)::text AS paid_by,
        COALESCE(NULLIF(u.full_name, ''), u.email, 'Allowance user') AS paid_by_label,
        ('user:' || fae.user_id)::text AS paid_to,
        COALESCE(NULLIF(u.full_name, ''), u.email, 'Allowance user') AS paid_to_label,
        NULL::int AS category_id,
        'Allowance'::text AS category_name,
        COALESCE(NULLIF(u.full_name, ''), u.email, 'Allowance user') AS reference,
        fae.invoice_url,
        fae.invoice_public_id,
        fae.invoice_resource_type,
        fae.invoice_file_name,
        fae.description,
        fae.created_at
      FROM finance_allowance_entries fae
      JOIN users u ON u.id = fae.user_id
      LEFT JOIN institution_profiles ip ON ip.id = fae.institution_id
      WHERE ${expenseScopePredicate("fae", options)}

      UNION ALL
      SELECT
        ('recurring:' || fre.id)::text AS row_id,
        fre.id::bigint AS source_id,
        'recurring'::text AS source_type,
        fre.scope_type::text AS scope_type,
        fre.institution_id,
        ip.name AS institution_name,
        COALESCE(fre.end_date, fre.next_due_date, fre.start_date) AS expense_date,
        fre.amount,
        fre.payment_method::text AS payment_method,
        fre.payment_status::text AS payment_status,
        fre.paid_by,
        fre.paid_by_label,
        COALESCE(fre.paid_by, '')::text AS paid_to,
        COALESCE(fre.paid_by_label, '')::text AS paid_to_label,
        NULL::int AS category_id,
        COALESCE(category_rollup.category_names_text, 'Recurring Expense') AS category_name,
        fre.title AS reference,
        NULL::text AS invoice_url,
        NULL::text AS invoice_public_id,
        NULL::varchar AS invoice_resource_type,
        NULL::varchar AS invoice_file_name,
        fre.description,
        fre.updated_at AS created_at
      FROM finance_recurring_expenses fre
      LEFT JOIN institution_profiles ip ON ip.id = fre.institution_id
      LEFT JOIN LATERAL (
        SELECT STRING_AGG(frec.name, ', ' ORDER BY frec.name) AS category_names_text
        FROM finance_recurring_expense_categories frec
        WHERE frec.id = ANY(fre.category_ids)
      ) category_rollup ON TRUE
      WHERE ${expenseScopePredicate("fre", options)}
        AND fre.is_active = TRUE
    )
  `;
}

function addExpenseFilters(baseIndex: number, options: FinanceExpenseListOptions) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (options.search.trim()) {
    params.push(`%${options.search.trim()}%`);
    clauses.push(`(
      category_name ILIKE $${baseIndex + params.length}
      OR COALESCE(institution_name, '') ILIKE $${baseIndex + params.length}
      OR COALESCE(reference, '') ILIKE $${baseIndex + params.length}
      OR COALESCE(description, '') ILIKE $${baseIndex + params.length}
    )`);
  }
  if (options.payment_method && options.payment_method !== "all") {
    params.push(options.payment_method);
    clauses.push(`payment_method = $${baseIndex + params.length}`);
  }
  if (options.payment_status && options.payment_status !== "all") {
    params.push(options.payment_status);
    clauses.push(`payment_status = $${baseIndex + params.length}`);
  }
  if (options.source_type && options.source_type !== "all") {
    params.push(options.source_type);
    clauses.push(`source_type = $${baseIndex + params.length}`);
  }
  if (options.from_date) {
    params.push(options.from_date);
    clauses.push(`expense_date >= $${baseIndex + params.length}::date`);
  }
  if (options.to_date) {
    params.push(options.to_date);
    clauses.push(`expense_date <= $${baseIndex + params.length}::date`);
  }
  return {
    params,
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
  };
}

export async function listFinanceExpense(db: Queryable, options: FinanceExpenseListOptions) {
  await ensureFinanceIncomeSchema(db);
  await ensureDefaultPaymentCategories(db, options.scope_type, options.institution_id);
  const scopeParams = expenseScopedParams(options);
  const filters = addExpenseFilters(scopeParams.length, options);
  const baseSql = expenseRowsSql(options);
  const params = [...scopeParams, ...filters.params];
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartText = monthStart.toISOString().slice(0, 10);

  const [data, stats] = await Promise.all([
    db.query<FinanceExpenseRow>(`
      ${baseSql}
      SELECT *
      FROM expense_rows
      ${filters.where}
      ORDER BY expense_date DESC, created_at DESC, row_id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, options.limit, options.offset]),
    db.query<{
      total: string;
      filtered_total: string | null;
      this_month_total: string | null;
      due_total: string | null;
      due_count: string;
    }>(`
      ${baseSql},
      filtered_rows AS (
        SELECT *
        FROM expense_rows
        ${filters.where}
      )
      SELECT
        COUNT(*)::text AS total,
        COALESCE(SUM(fr.amount), 0)::text AS filtered_total,
        COALESCE(SUM(fr.amount) FILTER (WHERE fr.expense_date >= $${params.length + 1}::date), 0)::text AS this_month_total,
        COALESCE(SUM(fr.amount) FILTER (WHERE fr.payment_status = 'due'), 0)::text AS due_total,
        COUNT(*) FILTER (WHERE fr.payment_status = 'due')::text AS due_count
      FROM filtered_rows fr
    `, [...params, monthStartText]),
  ]);
  const statRow = stats.rows[0];

  return {
    data: data.rows,
    total: Number(statRow?.total ?? 0),
    filtered_total: statRow?.filtered_total ?? "0",
    this_month_total: statRow?.this_month_total ?? "0",
    due_total: statRow?.due_total ?? "0",
    due_count: Number(statRow?.due_count ?? 0),
  };
}

function recurringScopePredicate(alias: string, options: Pick<FinanceRecurringExpenseListOptions, "scope_type" | "institution_id">) {
  if (options.scope_type === "platform") return `${alias}.scope_type = 'platform'`;
  return `${alias}.scope_type = 'institution' AND ${alias}.institution_id = $1`;
}

function addRecurringExpenseFilters(baseIndex: number, options: FinanceRecurringExpenseListOptions) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (options.search.trim()) {
    params.push(`%${options.search.trim()}%`);
    clauses.push(`(
      fre.title ILIKE $${baseIndex + params.length}
      OR COALESCE(fre.description, '') ILIKE $${baseIndex + params.length}
      OR COALESCE(category_rollup.category_names_text, '') ILIKE $${baseIndex + params.length}
    )`);
  }
  if (options.payment_method && options.payment_method !== "all") {
    params.push(options.payment_method);
    clauses.push(`fre.payment_method = $${baseIndex + params.length}`);
  }
  if (options.frequency && options.frequency !== "all") {
    params.push(options.frequency);
    clauses.push(`fre.frequency = $${baseIndex + params.length}`);
  }
  if (options.status && options.status !== "all") {
    params.push(options.status === "active");
    clauses.push(`fre.is_active = $${baseIndex + params.length}`);
  }
  return {
    params,
    where: clauses.length ? `AND ${clauses.join(" AND ")}` : "",
  };
}

export async function createFinanceRecurringExpense(db: Queryable, input: FinanceRecurringExpenseInput) {
  await ensureFinanceIncomeSchema(db);
  await ensureDefaultPaymentCategories(db, input.scope_type, input.institution_id);
  const title = input.title.trim();
  if (!title) throw new Error("Expense name is required");
  if (input.category_ids.length === 0) throw new Error("Select at least one expense category");

  const validCategories = await db.query<{ count: string }>(`
    SELECT COUNT(*) AS count
    FROM finance_recurring_expense_categories frec
    WHERE frec.id = ANY($1::int[])
      AND frec.is_active = TRUE
      AND frec.scope_type = $2
      AND COALESCE(frec.institution_id, 0) = COALESCE($3::int, 0)
  `, [input.category_ids, input.scope_type, input.institution_id]);
  if (Number(validCategories.rows[0]?.count ?? 0) !== input.category_ids.length) {
    throw new Error("Select valid recurring categories");
  }

  const result = await db.query<{ id: string }>(`
    INSERT INTO finance_recurring_expenses (
      scope_type, institution_id, title, category_ids, payment_method, paid_by,
      paid_by_label, amount, frequency, due_day, start_date, next_due_date,
      end_date, payment_status, reminder_days_before, description, created_by, updated_by
    )
    VALUES ($1,$2,$3,$4::int[],$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$17)
    RETURNING id
  `, [
    input.scope_type,
    input.institution_id,
    title,
    input.category_ids,
    input.payment_method,
    input.paid_by,
    input.paid_by_label,
    input.amount,
    input.frequency,
    input.due_day,
    input.start_date,
    input.next_due_date,
    input.end_date ?? null,
    input.payment_status,
    input.reminder_days_before,
    input.description ?? null,
    input.user_id,
  ]);
  await db.query(`
    INSERT INTO finance_recurring_expense_history (
      recurring_expense_id, action, old_values, new_values, changed_by
    )
    VALUES ($1::bigint, 'created', NULL, $2::jsonb, $3)
  `, [
    result.rows[0].id,
    JSON.stringify({
      title,
      category_ids: input.category_ids,
      payment_method: input.payment_method,
      paid_by: input.paid_by,
      paid_by_label: input.paid_by_label,
      amount: input.amount,
      frequency: input.frequency,
      due_day: input.due_day,
      start_date: input.start_date,
      end_date: input.end_date ?? null,
      payment_status: input.payment_status,
      reminder_days_before: input.reminder_days_before,
      next_due_date: input.next_due_date,
      is_active: true,
      description: input.description ?? null,
    }),
    input.user_id,
  ]);
  return result.rows[0];
}

export async function updateFinanceRecurringExpensePaymentStatus(
  db: Queryable,
  input: {
    scope_type: FinanceScope;
    institution_id: number | null;
    id: number;
    payment_status: "paid" | "due";
    user_id: number;
  }
) {
  await ensureFinanceIncomeSchema(db);
  const params = expenseScopedParams({ scope_type: input.scope_type, institution_id: input.institution_id });
  const before = await db.query<Record<string, unknown>>(`
    SELECT *
    FROM finance_recurring_expenses fre
    WHERE ${recurringScopePredicate("fre", { scope_type: input.scope_type, institution_id: input.institution_id })}
      AND fre.id = $${params.length + 1}
    LIMIT 1
  `, [...params, input.id]);
  if (!before.rows[0]) return null;
  const result = await db.query<{ id: string; payment_status: "paid" | "due" }>(`
    UPDATE finance_recurring_expenses fre
    SET payment_status = $${params.length + 2},
        updated_by = $${params.length + 3},
        updated_at = CURRENT_TIMESTAMP
    WHERE ${recurringScopePredicate("fre", { scope_type: input.scope_type, institution_id: input.institution_id })}
      AND fre.id = $${params.length + 1}
    RETURNING fre.id::text, fre.payment_status::text AS payment_status
  `, [...params, input.id, input.payment_status, input.user_id]);

  if (result.rows[0]) {
    await db.query(`
      INSERT INTO finance_recurring_expense_history (
        recurring_expense_id, action, old_values, new_values, changed_by
      )
      VALUES ($1::bigint, 'status_changed', $2::jsonb, $3::jsonb, $4)
    `, [
      input.id,
      JSON.stringify({ payment_status: before.rows[0].payment_status }),
      JSON.stringify({ payment_status: input.payment_status }),
      input.user_id,
    ]);
  }
  return result.rows[0] ?? null;
}

export async function listFinanceRecurringExpenseHistory(
  db: Queryable,
  options: {
    scope_type: FinanceScope;
    institution_id: number | null;
    recurring_expense_id: number;
    limit?: number;
  }
) {
  await ensureFinanceIncomeSchema(db);
  const params = expenseScopedParams(options);
  const result = await db.query<FinanceRecurringExpenseHistoryRow>(`
    SELECT
      freh.id::text,
      freh.recurring_expense_id::text,
      freh.action::text AS action,
      freh.old_values,
      freh.new_values,
      freh.changed_by,
      u.full_name AS changed_by_name,
      freh.changed_at
    FROM finance_recurring_expense_history freh
    JOIN finance_recurring_expenses fre ON fre.id = freh.recurring_expense_id
    LEFT JOIN users u ON u.id = freh.changed_by
    WHERE ${recurringScopePredicate("fre", options)}
      AND freh.recurring_expense_id = $${params.length + 1}
    ORDER BY freh.changed_at DESC, freh.id DESC
    LIMIT $${params.length + 2}
  `, [...params, options.recurring_expense_id, options.limit ?? 20]);
  return result.rows;
}

export async function listFinanceRecurringExpenses(db: Queryable, options: FinanceRecurringExpenseListOptions) {
  await ensureFinanceIncomeSchema(db);
  await ensureDefaultPaymentCategories(db, options.scope_type, options.institution_id);
  const scopeParams = expenseScopedParams(options);
  const filters = addRecurringExpenseFilters(scopeParams.length, options);
  const params = [...scopeParams, ...filters.params];

  const baseFrom = `
    FROM finance_recurring_expenses fre
    LEFT JOIN LATERAL (
      SELECT
        ARRAY_AGG(fec.name ORDER BY fec.name) AS category_names,
        STRING_AGG(fec.name, ', ' ORDER BY fec.name) AS category_names_text
      FROM finance_recurring_expense_categories fec
      WHERE fec.id = ANY(fre.category_ids)
    ) category_rollup ON TRUE
    WHERE ${recurringScopePredicate("fre", options)}
      ${filters.where}
  `;

  const [data, total, filteredTotal, activeTotal] = await Promise.all([
    db.query<FinanceRecurringExpenseRow>(`
      SELECT
        fre.id::text,
        fre.scope_type::text AS scope_type,
        fre.institution_id,
        fre.title,
        fre.category_ids,
        COALESCE(category_rollup.category_names, ARRAY[]::text[]) AS category_names,
        fre.payment_method::text AS payment_method,
        fre.paid_by,
        fre.paid_by_label,
        fre.amount,
        fre.frequency::text AS frequency,
        fre.due_day,
        fre.start_date,
        fre.end_date,
        fre.payment_status::text AS payment_status,
        fre.reminder_days_before,
        fre.next_due_date,
        fre.is_active,
        fre.description,
        fre.created_at,
        fre.updated_at
      ${baseFrom}
      ORDER BY fre.next_due_date ASC, fre.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, options.limit, options.offset]),
    db.query<{ count: string }>(`
      SELECT COUNT(*) AS count
      ${baseFrom}
    `, params),
    db.query<{ total: string | null }>(`
      SELECT COALESCE(SUM(fre.amount), 0) AS total
      ${baseFrom}
    `, params),
    db.query<{ total: string | null }>(`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM finance_recurring_expenses fre
      WHERE ${recurringScopePredicate("fre", options)}
        AND fre.is_active = TRUE
    `, scopeParams),
  ]);

  return {
    data: data.rows,
    total: Number(total.rows[0]?.count ?? 0),
    filtered_total: filteredTotal.rows[0]?.total ?? "0",
    active_total: activeTotal.rows[0]?.total ?? "0",
  };
}

function allowanceScopePredicate(alias: string, options: Pick<FinanceAllowanceListOptions, "scope_type" | "institution_id">) {
  if (options.scope_type === "platform") return `${alias}.scope_type = 'platform'`;
  return `${alias}.scope_type = 'institution' AND ${alias}.institution_id = $1`;
}

function allowanceScopedParams(options: Pick<FinanceAllowanceListOptions, "scope_type" | "institution_id">) {
  return options.scope_type === "platform" ? [] : [options.institution_id];
}

export async function listFinanceAllowanceUserOptions(
  db: Queryable,
  scopeType: FinanceScope,
  institutionId: number | null
) {
  await ensureFinanceIncomeSchema(db);
  if (scopeType === "platform" || !institutionId) {
    const result = await db.query<FinanceAllowanceUserOption>(`
      SELECT id, full_name, email, role_label
      FROM (
        SELECT DISTINCT ON (u.id)
          u.id,
          u.full_name,
          u.email,
          COALESCE(d.name, pr.name, r.name, pr.code, r.code, 'Platform Staff') AS role_label,
          COALESCE(pr.code, r.code, 'staff') AS role_code
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles pr ON pr.id = ur.role_id
        LEFT JOIN institution_memberships im ON im.user_id = u.id AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
        LEFT JOIN roles r ON r.id = im.role_id
        LEFT JOIN user_profiles up ON up.user_id = u.id
        LEFT JOIN designations d ON d.id = up.designation_id
        WHERE (
          COALESCE(pr.code, '') IN ('platform_admin', 'super_admin', 'platform_staff')
          OR (im.institution_id IS NULL AND COALESCE(r.code, pr.code, '') NOT IN ('student', 'guardian', 'parent'))
        )
          AND u.is_active = TRUE
          AND COALESCE(u.is_deleted, FALSE) = FALSE
        ORDER BY u.id, CASE WHEN COALESCE(pr.code, r.code) = 'platform_admin' THEN 0 WHEN COALESCE(pr.code, r.code) = 'super_admin' THEN 1 ELSE 2 END
      ) platform_user_options
      ORDER BY
        CASE WHEN role_code = 'platform_admin' THEN 0 WHEN role_code = 'super_admin' THEN 1 ELSE 2 END,
        full_name ASC
      LIMIT 500
    `);
    return result.rows;
  }

  const result = await db.query<FinanceAllowanceUserOption>(`
    SELECT id, full_name, email, role_label
    FROM (
      SELECT DISTINCT ON (u.id)
        u.id,
        COALESCE(NULLIF(TRIM(u.full_name), ''), u.email) AS full_name,
        u.email,
        COALESCE(d.name, r.name, pr.name, r.code, pr.code, 'Staff') AS role_label,
        COALESCE(r.code, pr.code, 'staff') AS role_code
      FROM users u
      LEFT JOIN institution_memberships im ON im.user_id = u.id AND im.institution_id = $1 AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
      LEFT JOIN roles r ON r.id = im.role_id
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles pr ON pr.id = ur.role_id
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN designations d ON d.id = up.designation_id
      WHERE (
        (im.institution_id = $1 AND COALESCE(r.code, pr.code, '') NOT IN ('student', 'guardian', 'parent'))
        OR (up.under_institution_id = $1 AND COALESCE(r.code, pr.code, '') NOT IN ('student', 'guardian', 'parent'))
        OR EXISTS (
          SELECT 1 FROM institution_memberships im2 
          JOIN roles r2 ON r2.id = im2.role_id
          WHERE im2.user_id = u.id AND im2.institution_id = $1 AND r2.code NOT IN ('student', 'guardian', 'parent')
            AND im2.is_active = TRUE AND COALESCE(im2.is_deleted, FALSE) = FALSE
        )
      )
        AND u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
      ORDER BY u.id, CASE WHEN COALESCE(r.code, pr.code) = 'institution_admin' THEN 0 WHEN COALESCE(r.code, pr.code) = 'teacher' THEN 1 ELSE 2 END
    ) employee_options
    ORDER BY
      CASE WHEN role_code = 'institution_admin' THEN 0 WHEN role_code = 'teacher' THEN 1 ELSE 2 END,
      full_name ASC
    LIMIT 500
  `, [institutionId]);
  return result.rows;
}

export const listFinanceEmployeeOptions = listFinanceAllowanceUserOptions;

async function assertAllowanceUserAllowed(db: Queryable, input: Pick<FinanceAllowanceInput, "scope_type" | "institution_id" | "user_id">) {
  const result = await db.query<{ id: number }>(`
    SELECT u.id
    FROM users u
    LEFT JOIN institution_memberships im ON im.user_id = u.id
    LEFT JOIN roles r ON r.id = im.role_id
    LEFT JOIN user_roles ur ON ur.user_id = u.id
    LEFT JOIN roles pr ON pr.id = ur.role_id
    WHERE u.id = $1
      AND (
        ($2::INT IS NULL AND COALESCE(r.code, pr.code, '') NOT IN ('student', 'guardian', 'parent'))
        OR (im.institution_id = $2 AND COALESCE(r.code, '') NOT IN ('student', 'guardian', 'parent'))
        OR (COALESCE(pr.code, '') IN ('platform_admin', 'super_admin'))
      )
      AND u.is_active = TRUE
      AND COALESCE(u.is_deleted, FALSE) = FALSE
    LIMIT 1
  `, [input.user_id, input.institution_id]);

  if (!result.rows[0]) {
    throw new Error("Selected employee is not an active staff member eligible for allowance");
  }
}

export async function createFinanceAllowanceEntry(db: Queryable, input: FinanceAllowanceInput) {
  await ensureFinanceIncomeSchema(db);
  await assertAllowanceUserAllowed(db, input);

  const result = await db.query<{ id: string }>(`
    INSERT INTO finance_allowance_entries (
      scope_type, institution_id, user_id, payment_method, amount, allowance_date,
      invoice_url, invoice_public_id, invoice_resource_type, invoice_file_name,
      description, created_by, updated_by
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$12)
    RETURNING id
  `, [
    input.scope_type,
    input.institution_id,
    input.user_id,
    input.payment_method,
    input.amount,
    input.allowance_date,
    input.invoice_url ?? null,
    input.invoice_public_id ?? null,
    input.invoice_resource_type ?? null,
    input.invoice_file_name ?? null,
    input.description ?? null,
    input.created_by,
  ]);
  return result.rows[0];
}

function addAllowanceFilters(baseIndex: number, options: FinanceAllowanceListOptions) {
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (options.search.trim()) {
    params.push(`%${options.search.trim()}%`);
    clauses.push(`(
      user_name ILIKE $${baseIndex + params.length}
      OR COALESCE(user_email, '') ILIKE $${baseIndex + params.length}
      OR COALESCE(role_label, '') ILIKE $${baseIndex + params.length}
      OR COALESCE(institution_name, '') ILIKE $${baseIndex + params.length}
      OR COALESCE(description, '') ILIKE $${baseIndex + params.length}
    )`);
  }
  if (options.payment_method && options.payment_method !== "all") {
    params.push(options.payment_method);
    clauses.push(`payment_method = $${baseIndex + params.length}`);
  }
  if (options.user_id) {
    params.push(options.user_id);
    clauses.push(`user_id = $${baseIndex + params.length}`);
  }
  if (options.from_date) {
    params.push(options.from_date);
    clauses.push(`allowance_date >= $${baseIndex + params.length}::date`);
  }
  if (options.to_date) {
    params.push(options.to_date);
    clauses.push(`allowance_date <= $${baseIndex + params.length}::date`);
  }
  return {
    params,
    where: clauses.length ? `WHERE ${clauses.join(" AND ")}` : "",
  };
}

function allowanceRowsSql(options: Pick<FinanceAllowanceListOptions, "scope_type" | "institution_id">) {
  return `
    WITH allowance_rows AS (
      SELECT
        ('allowance:' || fae.id)::text AS row_id,
        fae.id::bigint AS id,
        fae.scope_type::text AS scope_type,
        fae.institution_id,
        ip.name AS institution_name,
        fae.user_id,
        u.full_name AS user_name,
        u.email AS user_email,
        role_match.role_label,
        fae.allowance_date,
        fae.amount,
        COALESCE(spend_calc.spent_amount, 0) AS spent_amount,
        (fae.amount - COALESCE(spend_calc.spent_amount, 0)) AS balance_amount,
        fae.payment_method::text AS payment_method,
        fae.invoice_url,
        fae.invoice_public_id,
        fae.invoice_resource_type,
        fae.invoice_file_name,
        fae.description,
        fae.created_at
      FROM finance_allowance_entries fae
      JOIN users u ON u.id = fae.user_id
      LEFT JOIN institution_profiles ip ON ip.id = fae.institution_id
      LEFT JOIN LATERAL (
        SELECT 
          CASE 
            WHEN NOT EXISTS (
              SELECT 1 FROM finance_allowance_entries fae_next
              WHERE fae_next.user_id = fae.user_id
                AND fae_next.scope_type = fae.scope_type
                AND COALESCE(fae_next.institution_id, 0) = COALESCE(fae.institution_id, 0)
                AND (
                  fae_next.allowance_date > fae.allowance_date
                  OR (fae_next.allowance_date = fae.allowance_date AND fae_next.id > fae.id)
                )
            ) THEN 
              GREATEST(0, COALESCE(user_total_spends.total_spent, 0) - COALESCE(prior_allowances.prior_amount, 0))
            ELSE 
              GREATEST(0, LEAST(
                fae.amount, 
                COALESCE(user_total_spends.total_spent, 0) - COALESCE(prior_allowances.prior_amount, 0)
              ))
          END AS spent_amount
        FROM (
          SELECT COALESCE(SUM(combined_spend.amount), 0) AS total_spent
          FROM (
            SELECT fase.amount
            FROM finance_allowance_spend_entries fase
            WHERE fase.user_id = fae.user_id
              AND fase.scope_type = fae.scope_type
              AND COALESCE(fase.institution_id, 0) = COALESCE(fae.institution_id, 0)
            UNION ALL
            SELECT fee.amount
            FROM finance_expense_entries fee
            WHERE (
              fee.paid_by = fae.user_id::text
              OR fee.paid_by = ('user:' || fae.user_id)
              OR fee.paid_by_label = u.full_name
              OR (fee.paid_by ~ '^[0-9]+$' AND fee.paid_by::int = fae.user_id)
            )
            AND fee.scope_type = fae.scope_type
            AND COALESCE(fee.institution_id, 0) = COALESCE(fae.institution_id, 0)
          ) combined_spend
        ) user_total_spends
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(fae_prior.amount), 0) AS prior_amount
          FROM finance_allowance_entries fae_prior
          WHERE fae_prior.user_id = fae.user_id
            AND fae_prior.scope_type = fae.scope_type
            AND COALESCE(fae_prior.institution_id, 0) = COALESCE(fae.institution_id, 0)
            AND (
              fae_prior.allowance_date < fae.allowance_date 
              OR (fae_prior.allowance_date = fae.allowance_date AND fae_prior.id < fae.id)
            )
        ) prior_allowances ON TRUE
      ) spend_calc ON TRUE
      LEFT JOIN LATERAL (
        SELECT r.name AS role_label
        FROM roles r
        JOIN scope_types st ON st.id = r.scope_id
        LEFT JOIN user_roles ur ON ur.role_id = r.id AND ur.user_id = fae.user_id
        LEFT JOIN institution_memberships im ON im.role_id = r.id
          AND im.user_id = fae.user_id
          AND im.institution_id = fae.institution_id
          AND im.is_active = TRUE
          AND COALESCE(im.is_deleted, FALSE) = FALSE
        WHERE (
          (fae.scope_type = 'platform' AND st.code = 'platform' AND ur.user_id IS NOT NULL)
          OR
          (fae.scope_type = 'institution' AND r.code IN ('institution_admin', 'teacher') AND im.user_id IS NOT NULL)
        )
        ORDER BY CASE WHEN r.code IN ('platform_admin', 'institution_admin') THEN 0 ELSE 1 END
        LIMIT 1
      ) role_match ON TRUE
      WHERE ${allowanceScopePredicate("fae", options)}
    )
  `;
}

export async function listFinanceAllowance(db: Queryable, options: FinanceAllowanceListOptions) {
  await ensureFinanceIncomeSchema(db);
  const scopeParams = allowanceScopedParams(options);
  const filters = addAllowanceFilters(scopeParams.length, options);
  const baseSql = allowanceRowsSql(options);
  const params = [...scopeParams, ...filters.params];
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartText = monthStart.toISOString().slice(0, 10);

  const [data, total, filteredTotal, thisMonth, cashInHandTotal] = await Promise.all([
    db.query<FinanceAllowanceRow>(`
      ${baseSql}
      SELECT *
      FROM allowance_rows
      ${filters.where}
      ORDER BY allowance_date DESC, created_at DESC, row_id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, options.limit, options.offset]),
    db.query<{ count: string }>(`
      ${baseSql}
      SELECT COUNT(*) AS count FROM allowance_rows ${filters.where}
    `, params),
    db.query<{ total: string | null }>(`
      ${baseSql}
      SELECT COALESCE(SUM(amount), 0) AS total FROM allowance_rows ${filters.where}
    `, params),
    db.query<{ total: string | null }>(`
      ${baseSql}
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM allowance_rows
      WHERE allowance_date >= $${scopeParams.length + 1}::date
    `, [...scopeParams, monthStartText]),
    db.query<{ total: string | null }>(`
      ${baseSql}
      SELECT COALESCE(SUM(balance_amount), 0) AS total FROM allowance_rows ${filters.where}
    `, params),
  ]);

  return {
    data: data.rows,
    total: Number(total.rows[0]?.count ?? 0),
    filtered_total: filteredTotal.rows[0]?.total ?? "0",
    this_month_total: thisMonth.rows[0]?.total ?? "0",
    cash_in_hand_total: cashInHandTotal.rows[0]?.total ?? "0",
  };
}

export async function listMyFinanceAllowances(
  db: Queryable,
  input: {
    user_id: number;
    institution_id: number | null;
    scope_type?: FinanceScope | null;
  }
) {
  await ensureFinanceIncomeSchema(db);
  const scopeType = input.scope_type ?? (input.institution_id ? "institution" : "platform");
  const result = await db.query<FinanceAllowanceRow>(`
    ${allowanceRowsSql({ scope_type: scopeType, institution_id: input.institution_id })}
    SELECT *
    FROM allowance_rows
    WHERE user_id = $${scopeType === "institution" ? 2 : 1}
    ORDER BY allowance_date DESC, created_at DESC, row_id DESC
  `, scopeType === "institution" ? [input.institution_id, input.user_id] : [input.user_id]);
  return result.rows;
}

export async function listMyFinanceAllowanceSpends(
  db: Queryable,
  input: {
    user_id: number;
    institution_id: number | null;
    scope_type?: FinanceScope | null;
    search?: string;
    payment_method?: string;
    allowance_id?: number | null;
    from_date?: string | null;
    to_date?: string | null;
    limit: number;
    offset: number;
  }
) {
  await ensureFinanceIncomeSchema(db);
  const scopeType = input.scope_type ?? (input.institution_id ? "institution" : "platform");
  const params: unknown[] = scopeType === "institution"
    ? [input.institution_id, input.user_id]
    : [input.user_id];
  const userParam = params.length;
  const clauses = [`fase.user_id = $${userParam}`];
  if (scopeType === "institution") {
    clauses.push("fase.scope_type = 'institution'", "fase.institution_id = $1");
  } else {
    clauses.push("fase.scope_type = 'platform'");
  }
  if (input.search?.trim()) {
    params.push(`%${input.search.trim()}%`);
    clauses.push(`(
      COALESCE(fase.description, '') ILIKE $${params.length}
      OR COALESCE(ip.name, '') ILIKE $${params.length}
    )`);
  }
  if (input.payment_method && input.payment_method !== "all") {
    params.push(input.payment_method);
    clauses.push(`fase.payment_method = $${params.length}`);
  }
  if (input.allowance_id) {
    params.push(input.allowance_id);
    clauses.push(`fase.allowance_id = $${params.length}`);
  }
  if (input.from_date) {
    params.push(input.from_date);
    clauses.push(`fase.spend_date >= $${params.length}::date`);
  }
  if (input.to_date) {
    params.push(input.to_date);
    clauses.push(`fase.spend_date <= $${params.length}::date`);
  }
  const where = `WHERE ${clauses.join(" AND ")}`;
  const monthParams: unknown[] = scopeType === "institution"
    ? [input.institution_id, input.user_id]
    : [input.user_id];
  const monthUserParam = monthParams.length;
  monthParams.push(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10));
  const monthStartParam = monthParams.length;

  const [data, total, filteredTotal, thisMonth] = await Promise.all([
    db.query<FinanceAllowanceSpendRow>(`
      SELECT
        ('spend:' || fase.id)::text AS row_id,
        fase.id::bigint AS id,
        fase.allowance_id,
        fase.scope_type::text AS scope_type,
        fase.institution_id,
        ip.name AS institution_name,
        fase.user_id,
        u.full_name AS user_name,
        fase.spend_date,
        fase.amount,
        fase.payment_method::text AS payment_method,
        fase.invoice_url,
        fase.invoice_public_id,
        fase.invoice_resource_type,
        fase.invoice_file_name,
        fase.description,
        fase.created_at
      FROM finance_allowance_spend_entries fase
      JOIN users u ON u.id = fase.user_id
      LEFT JOIN institution_profiles ip ON ip.id = fase.institution_id
      ${where}
      ORDER BY fase.spend_date DESC, fase.created_at DESC, fase.id DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, input.limit, input.offset]),
    db.query<{ count: string }>(`
      SELECT COUNT(*) AS count
      FROM finance_allowance_spend_entries fase
      LEFT JOIN institution_profiles ip ON ip.id = fase.institution_id
      ${where}
    `, params),
    db.query<{ total: string | null }>(`
      SELECT COALESCE(SUM(fase.amount), 0) AS total
      FROM finance_allowance_spend_entries fase
      LEFT JOIN institution_profiles ip ON ip.id = fase.institution_id
      ${where}
    `, params),
    db.query<{ total: string | null }>(`
      SELECT COALESCE(SUM(fase.amount), 0) AS total
      FROM finance_allowance_spend_entries fase
      WHERE fase.user_id = $${monthUserParam}
        AND fase.spend_date >= $${monthStartParam}::date
        ${scopeType === "institution" ? "AND fase.scope_type = 'institution' AND fase.institution_id = $1" : "AND fase.scope_type = 'platform'"}
    `, monthParams),
  ]);

  return {
    data: data.rows,
    total: Number(total.rows[0]?.count ?? 0),
    filtered_total: filteredTotal.rows[0]?.total ?? "0",
    this_month_total: thisMonth.rows[0]?.total ?? "0",
  };
}

export async function createFinanceAllowanceSpendEntry(db: Queryable, input: FinanceAllowanceSpendInput) {
  await ensureFinanceIncomeSchema(db);
  const allowance = await db.query<{
    id: number;
    scope_type: FinanceScope;
    institution_id: number | null;
    user_id: number;
    amount: string;
    spent_amount: string;
  }>(`
    SELECT
      fae.id,
      fae.scope_type::text AS scope_type,
      fae.institution_id,
      fae.user_id,
      fae.amount,
      COALESCE(spend_totals.spent_amount, 0) AS spent_amount
    FROM finance_allowance_entries fae
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(fase.amount), 0) AS spent_amount
      FROM finance_allowance_spend_entries fase
      WHERE fase.allowance_id = fae.id
    ) spend_totals ON TRUE
    WHERE fae.id = $1
      AND fae.user_id = $2
    LIMIT 1
  `, [input.allowance_id, input.user_id]);

  const row = allowance.rows[0];
  if (!row) throw new Error("Select a valid allowance");

  const balance = Number(row.amount) - Number(row.spent_amount);
  if (input.amount > balance) {
    throw new Error("Spend amount cannot be greater than available allowance balance");
  }

  const result = await db.query<{ id: string }>(`
    INSERT INTO finance_allowance_spend_entries (
      allowance_id, scope_type, institution_id, user_id, payment_method, amount,
      spend_date, invoice_url, invoice_public_id, invoice_resource_type,
      invoice_file_name, description, created_by, updated_by
    )
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$4,$4)
    RETURNING id
  `, [
    row.id,
    row.scope_type,
    row.institution_id,
    row.user_id,
    input.payment_method,
    input.amount,
    input.spend_date,
    input.invoice_url ?? null,
    input.invoice_public_id ?? null,
    input.invoice_resource_type ?? null,
    input.invoice_file_name ?? null,
    input.description ?? null,
  ]);
  return result.rows[0];
}

export async function updateFinanceIncomeEntry(db: Queryable, id: number, input: {
  category_id?: number;
  payment_method?: string;
  paid_by?: string;
  paid_by_label?: string;
  payer_name?: string;
  paid_to?: string;
  paid_to_label?: string;
  amount?: number;
  income_date?: string;
  description?: string | null;
  user_id?: number;
}) {
  await ensureFinanceIncomeSchema(db);
  const fields: string[] = [];
  const params: any[] = [];

  if (input.category_id !== undefined) {
    params.push(input.category_id);
    fields.push(`category_id = $${params.length}`);
  }
  if (input.payment_method !== undefined) {
    params.push(input.payment_method);
    fields.push(`payment_method = $${params.length}`);
  }
  if (input.paid_by !== undefined) {
    params.push(input.paid_by);
    fields.push(`paid_by = $${params.length}`);
  }
  if (input.paid_by_label !== undefined) {
    params.push(input.paid_by_label);
    fields.push(`paid_by_label = $${params.length}`);
  }
  if (input.payer_name !== undefined) {
    params.push(input.payer_name);
    fields.push(`payer_name = $${params.length}`);
  }
  if (input.paid_to !== undefined) {
    params.push(input.paid_to);
    fields.push(`paid_to = $${params.length}`);
  }
  if (input.paid_to_label !== undefined) {
    params.push(input.paid_to_label);
    fields.push(`paid_to_label = $${params.length}`);
  }
  if (input.amount !== undefined) {
    params.push(input.amount);
    fields.push(`amount = $${params.length}`);
  }
  if (input.income_date !== undefined) {
    params.push(input.income_date);
    fields.push(`income_date = $${params.length}`);
  }
  if (input.description !== undefined) {
    params.push(input.description);
    fields.push(`description = $${params.length}`);
  }
  if (input.user_id !== undefined) {
    params.push(input.user_id);
    fields.push(`updated_by = $${params.length}`);
  }

  if (fields.length === 0) return;
  fields.push("updated_at = NOW()");
  params.push(id);
  await db.query(`UPDATE finance_income_entries SET ${fields.join(", ")} WHERE id = $${params.length}`, params);
}

export async function deleteFinanceIncomeEntry(db: Queryable, id: number) {
  await ensureFinanceIncomeSchema(db);
  await db.query(`DELETE FROM finance_income_entries WHERE id = $1`, [id]);
}

export async function updateFinanceExpenseEntry(db: Queryable, id: number, input: {
  category_id?: number;
  payment_method?: string;
  payment_status?: string;
  paid_by?: string;
  paid_by_label?: string;
  paid_to?: string;
  paid_to_label?: string;
  amount?: number;
  expense_date?: string;
  description?: string | null;
  user_id?: number;
}) {
  await ensureFinanceIncomeSchema(db);
  const fields: string[] = [];
  const params: any[] = [];

  if (input.category_id !== undefined) {
    params.push(input.category_id);
    fields.push(`category_id = $${params.length}`);
  }
  if (input.payment_method !== undefined) {
    params.push(input.payment_method);
    fields.push(`payment_method = $${params.length}`);
  }
  if (input.payment_status !== undefined) {
    params.push(input.payment_status);
    fields.push(`payment_status = $${params.length}`);
  }
  if (input.paid_by !== undefined) {
    params.push(input.paid_by);
    fields.push(`paid_by = $${params.length}`);
  }
  if (input.paid_by_label !== undefined) {
    params.push(input.paid_by_label);
    fields.push(`paid_by_label = $${params.length}`);
  }
  if (input.paid_to !== undefined) {
    params.push(input.paid_to);
    fields.push(`paid_to = $${params.length}`);
  }
  if (input.paid_to_label !== undefined) {
    params.push(input.paid_to_label);
    fields.push(`paid_to_label = $${params.length}`);
  }
  if (input.amount !== undefined) {
    params.push(input.amount);
    fields.push(`amount = $${params.length}`);
  }
  if (input.expense_date !== undefined) {
    params.push(input.expense_date);
    fields.push(`expense_date = $${params.length}`);
  }
  if (input.description !== undefined) {
    params.push(input.description);
    fields.push(`description = $${params.length}`);
  }
  if (input.user_id !== undefined) {
    params.push(input.user_id);
    fields.push(`updated_by = $${params.length}`);
  }

  if (fields.length === 0) return;
  fields.push("updated_at = NOW()");
  params.push(id);
  await db.query(`UPDATE finance_expense_entries SET ${fields.join(", ")} WHERE id = $${params.length}`, params);
}

export async function deleteFinanceExpenseEntry(db: Queryable, id: number) {
  await ensureFinanceIncomeSchema(db);
  await db.query(`DELETE FROM finance_expense_entries WHERE id = $1`, [id]);
}

export async function updateFinanceAllowanceEntry(db: Queryable, id: number, input: {
  user_id?: number;
  payment_method?: string;
  amount?: number;
  allowance_date?: string;
  description?: string | null;
  updated_by?: number;
}) {
  await ensureFinanceIncomeSchema(db);
  const fields: string[] = [];
  const params: any[] = [];

  if (input.user_id !== undefined) {
    params.push(input.user_id);
    fields.push(`user_id = $${params.length}`);
  }
  if (input.payment_method !== undefined) {
    params.push(input.payment_method);
    fields.push(`payment_method = $${params.length}`);
  }
  if (input.amount !== undefined) {
    params.push(input.amount);
    fields.push(`amount = $${params.length}`);
  }
  if (input.allowance_date !== undefined) {
    params.push(input.allowance_date);
    fields.push(`allowance_date = $${params.length}`);
  }
  if (input.description !== undefined) {
    params.push(input.description);
    fields.push(`description = $${params.length}`);
  }
  if (input.updated_by !== undefined) {
    params.push(input.updated_by);
    fields.push(`updated_by = $${params.length}`);
  }

  if (fields.length === 0) return;
  fields.push("updated_at = NOW()");
  params.push(id);
  await db.query(`UPDATE finance_allowance_entries SET ${fields.join(", ")} WHERE id = $${params.length}`, params);
}

export async function deleteFinanceAllowanceEntry(db: Queryable, id: number) {
  await ensureFinanceIncomeSchema(db);
  await db.query(`DELETE FROM finance_allowance_entries WHERE id = $1`, [id]);
}

export async function deleteFinanceRecurringExpense(db: Queryable, id: number) {
  await ensureFinanceIncomeSchema(db);
  await db.query(`DELETE FROM finance_recurring_expenses WHERE id = $1`, [id]);
}

export type FinancePaymentMethodType =
  | "net_banking"
  | "phonepe"
  | "google_pay"
  | "paytm"
  | "bhim_upi"
  | "other_upi"
  | "cash"
  | "cheque"
  | "pos_card"
  | "custom";

export type FinancePaymentMethodRow = {
  id: string;
  scope_type: FinanceScope;
  institution_id: number | null;
  institution_name?: string | null;
  method_type: FinancePaymentMethodType;
  title: string;
  bank_name: string | null;
  account_holder_name: string | null;
  account_number: string | null;
  ifsc_code: string | null;
  branch_name: string | null;
  account_type: string | null;
  upi_id: string | null;
  upi_number: string | null;
  upi_provider_name: string | null;
  merchant_name: string | null;
  qr_code_url: string | null;
  qr_code_public_id: string | null;
  instructions: string | null;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type FinancePaymentMethodInput = {
  scope_type: FinanceScope;
  institution_id: number | null;
  method_type: FinancePaymentMethodType;
  title: string;
  bank_name?: string | null;
  account_holder_name?: string | null;
  account_number?: string | null;
  ifsc_code?: string | null;
  branch_name?: string | null;
  account_type?: string | null;
  upi_id?: string | null;
  upi_number?: string | null;
  upi_provider_name?: string | null;
  merchant_name?: string | null;
  qr_code_url?: string | null;
  qr_code_public_id?: string | null;
  instructions?: string | null;
  is_active?: boolean;
  is_default?: boolean;
  user_id: number;
};

export async function listFinancePaymentMethods(db: Queryable, options: { scope_type: FinanceScope; institution_id: number | null }): Promise<FinancePaymentMethodRow[]> {
  await ensureFinanceIncomeSchema(db);
  const where = options.scope_type === "platform" ? "scope_type = 'platform'" : "scope_type = 'institution' AND institution_id = $1";
  const params = options.scope_type === "platform" ? [] : [options.institution_id];
  const res = await db.query<FinancePaymentMethodRow>(
    `SELECT * FROM finance_payment_methods WHERE ${where} ORDER BY is_default DESC, is_active DESC, id DESC`,
    params
  );
  return res.rows;
}

export async function createFinancePaymentMethod(db: Queryable, input: FinancePaymentMethodInput): Promise<FinancePaymentMethodRow> {
  await ensureFinanceIncomeSchema(db);
  if (input.is_default) {
    const where = input.scope_type === "platform" ? "scope_type = 'platform'" : "scope_type = 'institution' AND institution_id = $1";
    const params = input.scope_type === "platform" ? [] : [input.institution_id];
    await db.query(`UPDATE finance_payment_methods SET is_default = FALSE WHERE ${where}`, params);
  }
  const res = await db.query<FinancePaymentMethodRow>(
    `
      INSERT INTO finance_payment_methods (
        scope_type, institution_id, method_type, title,
        bank_name, account_holder_name, account_number, ifsc_code, branch_name, account_type,
        upi_id, upi_number, upi_provider_name, merchant_name,
        qr_code_url, qr_code_public_id, instructions,
        is_active, is_default, created_by, updated_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$20)
      RETURNING *
    `,
    [
      input.scope_type,
      input.institution_id,
      input.method_type,
      input.title,
      input.bank_name || null,
      input.account_holder_name || null,
      input.account_number || null,
      input.ifsc_code || null,
      input.branch_name || null,
      input.account_type || null,
      input.upi_id || null,
      input.upi_number || null,
      input.upi_provider_name || null,
      input.merchant_name || null,
      input.qr_code_url || null,
      input.qr_code_public_id || null,
      input.instructions || null,
      input.is_active ?? true,
      input.is_default ?? false,
      input.user_id,
    ]
  );
  return res.rows[0];
}

export async function updateFinancePaymentMethod(db: Queryable, id: number, input: Partial<FinancePaymentMethodInput> & { updated_by?: number }): Promise<FinancePaymentMethodRow | null> {
  await ensureFinanceIncomeSchema(db);
  const existingRes = await db.query<FinancePaymentMethodRow>(`SELECT * FROM finance_payment_methods WHERE id = $1`, [id]);
  const existing = existingRes.rows[0];
  if (!existing) return null;

  if (input.is_default) {
    const where = existing.scope_type === "platform" ? "scope_type = 'platform'" : "scope_type = 'institution' AND institution_id = $1";
    const params = existing.scope_type === "platform" ? [] : [existing.institution_id];
    await db.query(`UPDATE finance_payment_methods SET is_default = FALSE WHERE ${where}`, params);
  }

  const fields: string[] = [];
  const params: any[] = [];

  const addField = (col: string, val: any) => {
    if (val !== undefined) {
      params.push(val);
      fields.push(`${col} = $${params.length}`);
    }
  };

  addField("method_type", input.method_type);
  addField("title", input.title);
  addField("bank_name", input.bank_name);
  addField("account_holder_name", input.account_holder_name);
  addField("account_number", input.account_number);
  addField("ifsc_code", input.ifsc_code);
  addField("branch_name", input.branch_name);
  addField("account_type", input.account_type);
  addField("upi_id", input.upi_id);
  addField("upi_number", input.upi_number);
  addField("upi_provider_name", input.upi_provider_name);
  addField("merchant_name", input.merchant_name);
  addField("qr_code_url", input.qr_code_url);
  addField("qr_code_public_id", input.qr_code_public_id);
  addField("instructions", input.instructions);
  addField("is_active", input.is_active);
  addField("is_default", input.is_default);
  addField("updated_by", input.updated_by);

  if (fields.length === 0) return existing;
  fields.push("updated_at = NOW()");
  params.push(id);

  const res = await db.query<FinancePaymentMethodRow>(
    `UPDATE finance_payment_methods SET ${fields.join(", ")} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return res.rows[0] ?? null;
}

export async function deleteFinancePaymentMethod(db: Queryable, id: number): Promise<void> {
  await ensureFinanceIncomeSchema(db);
  await db.query(`DELETE FROM finance_payment_methods WHERE id = $1`, [id]);
}

export type UnifiedFinanceCategory = {
  name: string;
  targets: ("income" | "expense" | "recurring")[];
  income_id: number | null;
  expense_id: number | null;
  recurring_id: number | null;
  is_active: boolean;
  created_at: string;
};

export async function listUnifiedFinanceCategories(db: Queryable, options: { scope_type: FinanceScope; institution_id: number | null }): Promise<UnifiedFinanceCategory[]> {
  await ensureFinanceIncomeSchema(db);
  const where = options.scope_type === "platform" ? "scope_type = 'platform'" : "scope_type = 'institution' AND institution_id = $1";
  const params = options.scope_type === "platform" ? [] : [options.institution_id];

  const [incRes, expRes, recRes] = await Promise.all([
    db.query<{ id: number; name: string; is_active: boolean; created_at: string }>(`SELECT id, name, is_active, created_at FROM finance_income_categories WHERE ${where} AND is_active = TRUE ORDER BY name ASC`, params),
    db.query<{ id: number; name: string; is_active: boolean; created_at: string }>(`SELECT id, name, is_active, created_at FROM finance_expense_categories WHERE ${where} AND is_active = TRUE ORDER BY name ASC`, params),
    db.query<{ id: number; name: string; is_active: boolean; created_at: string }>(`SELECT id, name, is_active, created_at FROM finance_recurring_expense_categories WHERE ${where} AND is_active = TRUE ORDER BY name ASC`, params),
  ]);

  const map = new Map<string, UnifiedFinanceCategory>();

  for (const row of incRes.rows) {
    const key = row.name.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, {
        name: row.name,
        targets: ["income"],
        income_id: row.id,
        expense_id: null,
        recurring_id: null,
        is_active: row.is_active,
        created_at: row.created_at,
      });
    } else {
      const item = map.get(key)!;
      if (!item.targets.includes("income")) item.targets.push("income");
      item.income_id = row.id;
    }
  }

  for (const row of expRes.rows) {
    const key = row.name.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, {
        name: row.name,
        targets: ["expense"],
        income_id: null,
        expense_id: row.id,
        recurring_id: null,
        is_active: row.is_active,
        created_at: row.created_at,
      });
    } else {
      const item = map.get(key)!;
      if (!item.targets.includes("expense")) item.targets.push("expense");
      item.expense_id = row.id;
    }
  }

  for (const row of recRes.rows) {
    const key = row.name.toLowerCase().trim();
    if (!map.has(key)) {
      map.set(key, {
        name: row.name,
        targets: ["recurring"],
        income_id: null,
        expense_id: null,
        recurring_id: row.id,
        is_active: row.is_active,
        created_at: row.created_at,
      });
    } else {
      const item = map.get(key)!;
      if (!item.targets.includes("recurring")) item.targets.push("recurring");
      item.recurring_id = row.id;
    }
  }

  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
}

export async function createUnifiedFinanceCategory(db: Queryable, input: {
  scope_type: FinanceScope;
  institution_id: number | null;
  name: string;
  targets: ("income" | "expense" | "recurring")[];
  user_id: number;
}) {
  await ensureFinanceIncomeSchema(db);
  const cleanName = input.name.trim();
  if (!cleanName) throw new Error("Category name is required");
  if (!input.targets || input.targets.length === 0) throw new Error("Select at least one page for this category");

  for (const target of input.targets) {
    const table = target === "income"
      ? "finance_income_categories"
      : target === "expense"
        ? "finance_expense_categories"
        : "finance_recurring_expense_categories";

    const check = await db.query<{ id: number }>(
      `SELECT id FROM ${table} WHERE scope_type = $1 AND COALESCE(institution_id, 0) = COALESCE($2, 0) AND LOWER(name) = LOWER($3) LIMIT 1`,
      [input.scope_type, input.institution_id, cleanName]
    );

    if (check.rows[0]) {
      await db.query(`UPDATE ${table} SET is_active = TRUE, updated_by = $1, updated_at = NOW() WHERE id = $2`, [input.user_id, check.rows[0].id]);
    } else {
      await db.query(
        `INSERT INTO ${table} (scope_type, institution_id, name, is_active, created_by, updated_by) VALUES ($1, $2, $3, TRUE, $4, $4)`,
        [input.scope_type, input.institution_id, cleanName, input.user_id]
      );
    }
  }
}

export async function deleteUnifiedFinanceCategory(db: Queryable, input: {
  scope_type: FinanceScope;
  institution_id: number | null;
  name: string;
}) {
  await ensureFinanceIncomeSchema(db);
  const cleanName = input.name.trim();
  await Promise.all([
    db.query(`DELETE FROM finance_income_categories WHERE scope_type = $1 AND COALESCE(institution_id, 0) = COALESCE($2, 0) AND LOWER(name) = LOWER($3)`, [input.scope_type, input.institution_id, cleanName]),
    db.query(`DELETE FROM finance_expense_categories WHERE scope_type = $1 AND COALESCE(institution_id, 0) = COALESCE($2, 0) AND LOWER(name) = LOWER($3)`, [input.scope_type, input.institution_id, cleanName]),
    db.query(`DELETE FROM finance_recurring_expense_categories WHERE scope_type = $1 AND COALESCE(institution_id, 0) = COALESCE($2, 0) AND LOWER(name) = LOWER($3)`, [input.scope_type, input.institution_id, cleanName]),
  ]);
}

export type FinancePayerSuggestion = {
  id: string;
  name: string;
  type: "student" | "parent" | "contact" | "client" | "vendor" | "employee" | "custom";
  label: string;
  subtext?: string;
  user_id?: number | null;
};

export async function listFinancePayerSuggestions(
  dbRunner: Queryable,
  scope: FinanceScope,
  institutionId: number | null
): Promise<FinancePayerSuggestion[]> {
  await ensureFinanceIncomeSchema(dbRunner);
  const suggestions: FinancePayerSuggestion[] = [];
  const seenKeys = new Set<string>();

  const isInst = scope === "institution" && Boolean(institutionId);

  try {
    if (isInst) {
      // 1. Institution Students (with Class, Section, Roll Number)
      try {
        const studentRes = await dbRunner.query<{
          user_id: number;
          full_name: string;
          class_name: string | null;
          section_name: string | null;
          roll_number: string | null;
        }>(
          `
            SELECT DISTINCT ON (u.id)
              u.id AS user_id,
              u.full_name,
              c.name AS class_name,
              s.name AS section_name,
              COALESCE(se.roll_number, sp.admission_number) AS roll_number
            FROM users u
            LEFT JOIN student_profiles sp ON sp.user_id = u.id
            LEFT JOIN student_enrollments se ON se.student_id = sp.id AND COALESCE(se.is_deleted, FALSE) = FALSE
            LEFT JOIN categories c ON c.id = se.class_category_id
            LEFT JOIN sections s ON s.id = se.section_id
            LEFT JOIN institution_memberships im ON im.user_id = u.id AND COALESCE(im.is_deleted, FALSE) = FALSE
            LEFT JOIN roles r ON r.id = im.role_id
            WHERE (
              im.institution_id = $1
              OR se.institution_id = $1
              OR sp.user_id IN (SELECT user_id FROM institution_memberships WHERE institution_id = $1)
            )
              AND (
                LOWER(COALESCE(r.code, r.name, '')) IN ('student', 'learner')
                OR sp.id IS NOT NULL
                OR se.id IS NOT NULL
              )
              AND u.is_active = TRUE
              AND COALESCE(u.is_deleted, FALSE) = FALSE
            ORDER BY u.id, u.full_name ASC
            LIMIT 300
          `,
          [institutionId]
        );

        for (const row of studentRes.rows) {
          if (!row.full_name || seenKeys.has(`student_${row.user_id}`)) continue;
          seenKeys.add(`student_${row.user_id}`);
          const classInfo = [
            row.class_name,
            row.section_name ? `Sec ${row.section_name}` : null,
            row.roll_number ? `Roll: ${row.roll_number}` : null,
          ].filter(Boolean).join(" • ");

          suggestions.push({
            id: `student_${row.user_id}`,
            name: row.full_name,
            type: "student",
            label: `${row.full_name}${classInfo ? ` (${classInfo})` : ""}`,
            subtext: classInfo || "Student",
            user_id: row.user_id,
          });
        }
      } catch (err) {
        console.error("Error fetching student payer suggestions:", err);
      }

      // 2. Institution Staff, Faculty, Admins & Employees
      try {
        const staffRes = await dbRunner.query<{
          id: number;
          full_name: string;
          role_label: string | null;
        }>(
          `
            SELECT DISTINCT ON (u.id)
              u.id,
              u.full_name,
              COALESCE(d.name, r.name, r.code, 'Staff') AS role_label
            FROM users u
            LEFT JOIN institution_memberships im ON im.user_id = u.id AND COALESCE(im.is_deleted, FALSE) = FALSE
            LEFT JOIN roles r ON r.id = im.role_id
            LEFT JOIN user_profiles up ON up.user_id = u.id
            LEFT JOIN designations d ON d.id = up.designation_id
            WHERE (
              im.institution_id = $1
              OR up.institution_id = $1
            )
              AND LOWER(COALESCE(r.code, r.name, '')) NOT IN ('student', 'learner', 'guardian', 'parent')
              AND u.is_active = TRUE
              AND COALESCE(u.is_deleted, FALSE) = FALSE
            ORDER BY u.id, u.full_name ASC
            LIMIT 300
          `,
          [institutionId]
        );

        for (const row of staffRes.rows) {
          if (!row.full_name || seenKeys.has(`employee_${row.id}`)) continue;
          seenKeys.add(`employee_${row.id}`);
          suggestions.push({
            id: `employee_${row.id}`,
            name: row.full_name,
            type: "employee",
            label: `${row.full_name} (${row.role_label || "Staff"})`,
            subtext: row.role_label || "Staff Member",
            user_id: row.id,
          });
        }
      } catch (err) {
        console.error("Error fetching staff payer suggestions:", err);
      }

      // 3. Institution Parents & Guardians
      try {
        const parentRes = await dbRunner.query<{
          user_id: number;
          guardian_name: string;
          student_name: string | null;
          relationship: string | null;
        }>(
          `
            SELECT DISTINCT ON (u.id)
              u.id AS user_id,
              u.full_name AS guardian_name,
              student_u.full_name AS student_name,
              sg.relationship
            FROM users u
            INNER JOIN student_guardians sg ON (sg.guardian_user_id = u.id OR sg.guardian_name = u.full_name) AND COALESCE(sg.is_deleted, FALSE) = FALSE
            LEFT JOIN student_profiles sp ON sp.id = sg.student_id
            LEFT JOIN users student_u ON student_u.id = sp.user_id
            LEFT JOIN institution_memberships im ON im.user_id = student_u.id
            WHERE im.institution_id = $1
              AND u.is_active = TRUE
              AND COALESCE(u.is_deleted, FALSE) = FALSE
            ORDER BY u.id, u.full_name ASC
            LIMIT 200
          `,
          [institutionId]
        );

        for (const row of parentRes.rows) {
          if (!row.guardian_name || seenKeys.has(`parent_${row.user_id}`)) continue;
          seenKeys.add(`parent_${row.user_id}`);
          const sub = `Parent of ${row.student_name || "Student"}`;
          suggestions.push({
            id: `parent_${row.user_id}`,
            name: row.guardian_name,
            type: "parent",
            label: `${row.guardian_name} (${sub})`,
            subtext: sub,
            user_id: row.user_id,
          });
        }
      } catch (err) {
        console.error("Error fetching parent payer suggestions:", err);
      }

      // 4. Institution Clients
      try {
        const clientRes = await dbRunner.query<{
          id: number;
          name: string;
          company_name: string | null;
          client_type: string | null;
          phone: string | null;
        }>(
          `
            SELECT id, name, company_name, client_type, phone
            FROM clients 
            WHERE institution_id = $1
            ORDER BY name ASC
            LIMIT 150
          `,
          [institutionId]
        );

        for (const row of clientRes.rows) {
          if (!row.name || seenKeys.has(`client_${row.name.toLowerCase().trim()}`)) continue;
          seenKeys.add(`client_${row.name.toLowerCase().trim()}`);
          const comp = [row.company_name, row.client_type, row.phone].filter(Boolean).join(" • ");
          suggestions.push({
            id: `client_${row.id}`,
            name: row.name,
            type: "client",
            label: `${row.name}${comp ? ` (${comp})` : ""} (Client)`,
            subtext: comp || "Client",
            user_id: null,
          });
        }
      } catch (err) {
        console.error("Error fetching client payer suggestions:", err);
      }

      // 5. Institution Vendors
      try {
        const vendorRes = await dbRunner.query<{
          id: number;
          name: string;
          company_name: string | null;
          category: string | null;
          phone: string | null;
        }>(
          `
            SELECT id, name, company_name, category, phone
            FROM vendors
            WHERE institution_id = $1
            ORDER BY name ASC
            LIMIT 150
          `,
          [institutionId]
        );

        for (const row of vendorRes.rows) {
          if (!row.name || seenKeys.has(`vendor_${row.name.toLowerCase().trim()}`)) continue;
          seenKeys.add(`vendor_${row.name.toLowerCase().trim()}`);
          const comp = [row.category, row.company_name, row.phone].filter(Boolean).join(" • ");
          suggestions.push({
            id: `vendor_${row.id}`,
            name: row.name,
            type: "vendor",
            label: `${row.name}${comp ? ` (${comp})` : ""} (Vendor)`,
            subtext: comp || "Vendor / Supplier",
            user_id: null,
          });
        }
      } catch (err) {
        console.error("Error fetching vendor payer suggestions:", err);
      }

      // 6. Institution Contacts / Enquiries
      try {
        const enquiryRes = await dbRunner.query<{
          id: number;
          full_name: string;
          phone: string | null;
          source: string | null;
        }>(
          `
            SELECT id, full_name, phone, source
            FROM sales_enquiries
            WHERE institution_id = $1
              AND full_name IS NOT NULL AND full_name <> ''
            ORDER BY id DESC
            LIMIT 150
          `,
          [institutionId]
        );

        for (const row of enquiryRes.rows) {
          if (!row.full_name || seenKeys.has(`contact_${row.full_name.toLowerCase().trim()}`)) continue;
          seenKeys.add(`contact_${row.full_name.toLowerCase().trim()}`);
          const sub = row.phone ? `Contact: ${row.phone}` : (row.source ? `Lead: ${row.source}` : "Contact Lead");
          suggestions.push({
            id: `contact_${row.id}`,
            name: row.full_name,
            type: "contact",
            label: `${row.full_name} (${sub})`,
            subtext: sub,
            user_id: null,
          });
        }
      } catch (err) {
        console.error("Error fetching enquiry payer suggestions:", err);
      }
    } else {
      // Platform Scope: Platform Users, Platform Clients, Platform Vendors, Platform Leads
      try {
        const platformUsersRes = await dbRunner.query<{
          id: number;
          full_name: string;
          role_label: string | null;
        }>(
          `
            SELECT DISTINCT ON (u.id)
              u.id,
              u.full_name,
              COALESCE(pr.name, pr.code, 'Platform Staff') AS role_label
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles pr ON pr.id = ur.role_id
            WHERE u.is_active = TRUE
              AND COALESCE(u.is_deleted, FALSE) = FALSE
            ORDER BY u.id, u.full_name ASC
            LIMIT 200
          `
        );

        for (const row of platformUsersRes.rows) {
          if (!row.full_name || seenKeys.has(`employee_${row.id}`)) continue;
          seenKeys.add(`employee_${row.id}`);
          suggestions.push({
            id: `employee_${row.id}`,
            name: row.full_name,
            type: "employee",
            label: `${row.full_name} (${row.role_label || "Platform Staff"})`,
            subtext: row.role_label || "Platform Staff",
            user_id: row.id,
          });
        }
      } catch (err) {
        console.error("Error fetching platform staff suggestions:", err);
      }

      try {
        const clientRes = await dbRunner.query<{
          id: number;
          name: string;
          company_name: string | null;
          client_type: string | null;
          phone: string | null;
        }>(
          `
            SELECT id, name, company_name, client_type, phone
            FROM clients 
            WHERE institution_id IS NULL
            ORDER BY name ASC
            LIMIT 100
          `
        );
        for (const row of clientRes.rows) {
          if (!row.name || seenKeys.has(`client_${row.name.toLowerCase().trim()}`)) continue;
          seenKeys.add(`client_${row.name.toLowerCase().trim()}`);
          suggestions.push({
            id: `client_${row.id}`,
            name: row.name,
            type: "client",
            label: `${row.name} (Platform Client)`,
            subtext: row.company_name || "Platform Client",
            user_id: null,
          });
        }
      } catch (err) {
        console.error("Error fetching platform client suggestions:", err);
      }

      try {
        const vendorRes = await dbRunner.query<{
          id: number;
          name: string;
          company_name: string | null;
          category: string | null;
          phone: string | null;
        }>(
          `
            SELECT id, name, company_name, category, phone
            FROM vendors
            WHERE institution_id IS NULL
            ORDER BY name ASC
            LIMIT 100
          `
        );
        for (const row of vendorRes.rows) {
          if (!row.name || seenKeys.has(`vendor_${row.name.toLowerCase().trim()}`)) continue;
          seenKeys.add(`vendor_${row.name.toLowerCase().trim()}`);
          suggestions.push({
            id: `vendor_${row.id}`,
            name: row.name,
            type: "vendor",
            label: `${row.name} (Platform Vendor)`,
            subtext: row.category || "Vendor",
            user_id: null,
          });
        }
      } catch (err) {
        console.error("Error fetching platform vendor suggestions:", err);
      }
    }
  } catch (err) {
    console.error("Error fetching payer suggestions:", err);
  }

  return suggestions;
}

export type FinanceVendorSuggestion = {
  id: string;
  name: string;
  category?: string | null;
  company_name?: string | null;
  phone?: string | null;
  email?: string | null;
  subtext?: string | null;
};

export async function listFinanceVendorSuggestions(
  dbRunner: Queryable,
  scope: FinanceScope,
  institutionId: number | null
): Promise<FinanceVendorSuggestion[]> {
  await ensureFinanceIncomeSchema(dbRunner);
  const suggestions: FinanceVendorSuggestion[] = [];
  const seenNames = new Set<string>();

  // 1. From vendors table
  try {
    const vendorRes = await dbRunner.query<{
      id: number;
      name: string;
      company_name: string | null;
      category: string | null;
      phone: string | null;
      email: string | null;
      vendor_type: string | null;
    }>(
      `
        SELECT id, name, company_name, category, phone, email, vendor_type
        FROM vendors
        WHERE ($1::INT IS NULL OR institution_id = $1 OR institution_id IS NULL)
        ORDER BY name ASC
        LIMIT 200
      `,
      [institutionId]
    );

    for (const row of vendorRes.rows) {
      if (!row.name || seenNames.has(row.name.toLowerCase().trim())) continue;
      seenNames.add(row.name.toLowerCase().trim());
      const sub = [row.category || row.vendor_type, row.company_name, row.phone].filter(Boolean).join(" • ");
      suggestions.push({
        id: `vendor_${row.id}`,
        name: row.name,
        company_name: row.company_name,
        category: row.category,
        phone: row.phone,
        email: row.email,
        subtext: sub || "Vendor / Supplier",
      });
    }
  } catch {}

  // 2. From clients table
  try {
    const clientRes = await dbRunner.query<{
      id: number;
      name: string;
      company_name: string | null;
      client_type: string | null;
      phone: string | null;
      email: string | null;
    }>(
      `
        SELECT id, name, company_name, client_type, phone, email
        FROM clients
        WHERE ($1::INT IS NULL OR institution_id = $1 OR institution_id IS NULL)
        ORDER BY name ASC
        LIMIT 100
      `,
      [institutionId]
    );

    for (const row of clientRes.rows) {
      if (!row.name || seenNames.has(row.name.toLowerCase().trim())) continue;
      seenNames.add(row.name.toLowerCase().trim());
      const sub = [row.company_name, row.client_type, row.phone].filter(Boolean).join(" • ");
      suggestions.push({
        id: `client_${row.id}`,
        name: row.name,
        company_name: row.company_name,
        category: row.client_type,
        phone: row.phone,
        email: row.email,
        subtext: sub || "Client / Supplier",
      });
    }
  } catch {}

  // 3. From recent expense paid_to_label records
  try {
    const historyRes = await dbRunner.query<{
      paid_to_label: string;
    }>(
      `
        SELECT DISTINCT paid_to_label
        FROM finance_expense_entries
        WHERE ($1::INT IS NULL OR institution_id = $1)
          AND paid_to_label IS NOT NULL AND paid_to_label <> ''
        LIMIT 50
      `,
      [institutionId]
    );

    for (const row of historyRes.rows) {
      if (!row.paid_to_label || seenNames.has(row.paid_to_label.toLowerCase().trim())) continue;
      seenNames.add(row.paid_to_label.toLowerCase().trim());
      suggestions.push({
        id: `history_${suggestions.length + 1}`,
        name: row.paid_to_label,
        subtext: "Recent Recipient",
      });
    }
  } catch {}

  return suggestions;
}

export type FinanceInvoiceRow = {
  id: string;
  invoice_number: string;
  scope_type: FinanceScope;
  institution_id: number | null;
  institution_name: string | null;
  income_id: string | null;
  source_type: string;
  payer_name: string;
  receiver_name: string;
  category_name: string;
  payment_method: "cash" | "upi" | "net_banking";
  amount: string | number;
  tax_amount: string | number;
  total_amount: string | number;
  invoice_date: string;
  status: "paid" | "due" | "cancelled";
  notes: string | null;
  created_at: string;
};

export type FinanceInvoiceListOptions = {
  scope_type: FinanceScope;
  institution_id: number | null;
  search?: string;
  payment_method?: string;
  status?: string;
  from_date?: string | null;
  to_date?: string | null;
  limit?: number;
  offset?: number;
};

export async function listFinanceInvoices(
  dbRunner: Queryable,
  options: FinanceInvoiceListOptions
): Promise<{
  data: FinanceInvoiceRow[];
  total: number;
  total_amount: string | number;
  this_month_total: string | number;
}> {
  await ensureFinanceIncomeSchema(dbRunner);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (options.scope_type === "platform") {
    conditions.push(`fi.scope_type = 'platform'`);
  } else {
    conditions.push(`fi.scope_type = 'institution' AND fi.institution_id = $${paramIdx++}`);
    params.push(options.institution_id);
  }

  if (options.search && options.search.trim()) {
    conditions.push(`(fi.invoice_number ILIKE $${paramIdx} OR fi.payer_name ILIKE $${paramIdx} OR fi.receiver_name ILIKE $${paramIdx} OR fi.category_name ILIKE $${paramIdx})`);
    params.push(`%${options.search.trim()}%`);
    paramIdx++;
  }

  if (options.payment_method && options.payment_method !== "all") {
    conditions.push(`fi.payment_method = $${paramIdx++}`);
    params.push(options.payment_method);
  }

  if (options.status && options.status !== "all") {
    conditions.push(`fi.status = $${paramIdx++}`);
    params.push(options.status);
  }

  if (options.from_date) {
    conditions.push(`fi.invoice_date >= $${paramIdx++}`);
    params.push(options.from_date);
  }

  if (options.to_date) {
    conditions.push(`fi.invoice_date <= $${paramIdx++}`);
    params.push(options.to_date);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const countQuery = `
    SELECT 
      COUNT(*)::INT AS total,
      COALESCE(SUM(fi.total_amount), 0)::NUMERIC AS total_amount,
      COALESCE(SUM(CASE WHEN DATE_TRUNC('month', fi.invoice_date) = DATE_TRUNC('month', CURRENT_DATE) THEN fi.total_amount ELSE 0 END), 0)::NUMERIC AS this_month_total
    FROM finance_invoices fi
    ${whereClause}
  `;

  const limit = options.limit ?? 20;
  const offset = options.offset ?? 0;

  const dataQuery = `
    SELECT 
      fi.id,
      fi.invoice_number,
      fi.scope_type,
      fi.institution_id,
      ip.name AS institution_name,
      fi.income_id,
      fi.source_type,
      fi.payer_name,
      fi.receiver_name,
      fi.category_name,
      fi.payment_method,
      fi.amount,
      fi.tax_amount,
      fi.total_amount,
      fi.invoice_date,
      fi.status,
      fi.notes,
      fi.created_at
    FROM finance_invoices fi
    LEFT JOIN institution_profiles ip ON ip.id = fi.institution_id
    ${whereClause}
    ORDER BY fi.invoice_date DESC, fi.id DESC
    LIMIT $${paramIdx++} OFFSET $${paramIdx++}
  `;

  const [countRes, dataRes] = await Promise.all([
    dbRunner.query<{ total: number; total_amount: string | number; this_month_total: string | number }>(countQuery, params),
    dbRunner.query<FinanceInvoiceRow>(dataQuery, [...params, limit, offset]),
  ]);

  return {
    data: dataRes.rows,
    total: countRes.rows[0]?.total ?? 0,
    total_amount: countRes.rows[0]?.total_amount ?? 0,
    this_month_total: countRes.rows[0]?.this_month_total ?? 0,
  };
}

export async function deleteFinanceInvoice(
  dbRunner: Queryable,
  id: string,
  scope: FinanceScope,
  institutionId: number | null
) {
  await ensureFinanceIncomeSchema(dbRunner);
  const conditions = ["id = $1"];
  const params: unknown[] = [id];

  if (scope === "platform") {
    conditions.push("scope_type = 'platform'");
  } else {
    conditions.push("scope_type = 'institution' AND institution_id = $2");
    params.push(institutionId);
  }

  await dbRunner.query(
    `DELETE FROM finance_invoices WHERE ${conditions.join(" AND ")}`,
    params
  );
}

