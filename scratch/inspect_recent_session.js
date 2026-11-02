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
  try {
    const roles = await pool.query('SELECT * FROM roles');
    console.log('All roles:', roles.rows.map(r => ({ id: r.id, name: r.name, code: r.code })));

    // Also check sessions or active tokens
    const sessions = await pool.query('SELECT * FROM sessions ORDER BY created_at DESC LIMIT 5');
    console.log('Recent sessions user_ids:', sessions.rows.map(s => ({ id: s.id, user_id: s.user_id, created_at: s.created_at })));

    if (sessions.rows.length > 0) {
      const uids = sessions.rows.map(s => s.user_id);
      const sessionUsers = await pool.query(`
        SELECT u.id, u.email, u.full_name, r.name as role_name, r.code as role_code, ur.role_id
        FROM users u
        LEFT JOIN user_roles ur ON ur.user_id = u.id
        LEFT JOIN roles r ON r.id = ur.role_id
        WHERE u.id = ANY($1)
      `, [uids]);
      console.log('Session users:', sessionUsers.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
main();

