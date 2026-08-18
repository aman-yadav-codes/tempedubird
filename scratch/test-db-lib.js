require('dotenv').config({ path: '.env.local' });
const { db } = require('../lib/db/db');

async function test() {
  console.log("Testing db query...");
  const start = Date.now();
  try {
    const res = await db.query('SELECT 1 as test');
    console.log("Success in", Date.now() - start, "ms:", res.rows);
  } catch (err) {
    console.error("Error in", Date.now() - start, "ms:", err);
  }
}

test();
