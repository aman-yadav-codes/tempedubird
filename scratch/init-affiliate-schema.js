const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS affiliates (
      id SERIAL PRIMARY KEY,
      user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      affiliate_code VARCHAR(50) UNIQUE NOT NULL,
      total_referrals INTEGER DEFAULT 0,
      total_earnings NUMERIC(12,2) DEFAULT 0.00,
      pending_earnings NUMERIC(12,2) DEFAULT 0.00,
      withdrawn_earnings NUMERIC(12,2) DEFAULT 0.00,
      commission_rate NUMERIC(5,2) DEFAULT 10.00,
      status VARCHAR(50) DEFAULT 'active',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON affiliates(user_id);
    CREATE INDEX IF NOT EXISTS idx_affiliates_code ON affiliates(affiliate_code);

    CREATE TABLE IF NOT EXISTS affiliate_referrals (
      id SERIAL PRIMARY KEY,
      affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE CASCADE,
      referrer_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      referred_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      referral_code VARCHAR(50) NOT NULL,
      status VARCHAR(50) DEFAULT 'active',
      reward_amount NUMERIC(10,2) DEFAULT 50.00,
      joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_id ON affiliate_referrals(affiliate_id);
    CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred_user ON affiliate_referrals(referred_user_id);
    CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referrer_user ON affiliate_referrals(referrer_user_id);

    CREATE TABLE IF NOT EXISTS affiliate_earnings (
      id SERIAL PRIMARY KEY,
      affiliate_id INTEGER REFERENCES affiliates(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      referred_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      source_type VARCHAR(50) DEFAULT 'referral_signup',
      source_id INTEGER,
      amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
      status VARCHAR(50) DEFAULT 'completed',
      description TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_affiliate_id ON affiliate_earnings(affiliate_id);
    CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_user_id ON affiliate_earnings(user_id);

    INSERT INTO roles (name, code, scope_id, is_system)
    SELECT 'Affiliate', 'affiliate', 1, TRUE
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE code = 'affiliate');
  `);
  console.log('Affiliate schema initialized successfully');
}

run().catch(console.error).finally(() => pool.end());
