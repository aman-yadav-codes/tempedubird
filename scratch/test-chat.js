const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  console.log("=== Testing Live Chat Tables in DB ===");
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS live_chat_sessions (
        id SERIAL PRIMARY KEY,
        session_token VARCHAR(64) UNIQUE NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone_number VARCHAR(50) NOT NULL,
        whatsapp_number VARCHAR(50) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active',
        unread_admin_count INT NOT NULL DEFAULT 0,
        unread_user_count INT NOT NULL DEFAULT 0,
        last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS live_chat_messages (
        id SERIAL PRIMARY KEY,
        session_id INT NOT NULL REFERENCES live_chat_sessions(id) ON DELETE CASCADE,
        sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'admin')),
        sender_id INT NULL REFERENCES users(id) ON DELETE SET NULL,
        sender_name VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    console.log("✓ Created live_chat_sessions and live_chat_messages tables successfully!");

    const result = await pool.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('live_chat_sessions', 'live_chat_messages')
      ORDER BY table_name, ordinal_position;
    `);

    console.log("✓ Tables Schema Verification:", result.rows);
  } catch (err) {
    console.error("DB Test Error:", err);
  } finally {
    await pool.end();
  }
}

main();
