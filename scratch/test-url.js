const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

function normalizeDatabaseUrl(rawUrl) {
  if (!rawUrl) return rawUrl;
  try {
    const url = new URL(rawUrl);
    const sslMode = url.searchParams.get("sslmode")?.toLowerCase();

    if (sslMode && ["prefer", "require", "verify-ca"].includes(sslMode)) {
      url.searchParams.set("uselibpqcompat", "true");
    }

    return url.toString();
  } catch {
    return rawUrl;
  }
}

const rawUrl = process.env.DATABASE_URL;
const normalizedUrl = normalizeDatabaseUrl(rawUrl);

console.log("Raw URL:", rawUrl);
console.log("Normalized URL:", normalizedUrl);

async function test(url, label) {
  console.log(`\nTesting ${label}...`);
  const pool = new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });

  const start = Date.now();
  try {
    const res = await pool.query('SELECT 1 as connected');
    console.log(`[${label}] SUCCESS in ${Date.now() - start}ms`, res.rows);
  } catch (err) {
    console.error(`[${label}] ERROR in ${Date.now() - start}ms:`, err.message);
  } finally {
    await pool.end();
  }
}

async function run() {
  await test(rawUrl, "Raw URL");
  await test(normalizedUrl, "Normalized URL");
}

run();
