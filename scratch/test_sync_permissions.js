process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const { syncPermissionRegistry } = require('../lib/auth/sync-permission-registry');

async function testSync() {
  try {
    await syncPermissionRegistry(pool, true);
    console.log('Sync succeeded!');
  } catch (err) {
    console.error('Sync failed with error:', err);
  } finally {
    await pool.end();
  }
}
testSync();
