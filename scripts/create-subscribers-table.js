require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: false,
});

async function run() {
  const sql = `
    CREATE TABLE IF NOT EXISTS newsletter_subscribers (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      page_name VARCHAR(255) NOT NULL DEFAULT 'General',
      page_url TEXT NOT NULL DEFAULT '/',
      referrer TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'active',
      ip_address VARCHAR(100),
      user_agent TEXT,
      subscribe_count INT NOT NULL DEFAULT 1,
      metadata JSONB DEFAULT '{}',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);
    CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_page ON newsletter_subscribers(page_name);
    CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_created ON newsletter_subscribers(created_at DESC);
  `;
  try {
    await pool.query(sql);
    console.log("Successfully created or verified newsletter_subscribers table!");
  } catch (err) {
    console.error("Error creating table:", err);
  } finally {
    await pool.end();
  }
}

run();
