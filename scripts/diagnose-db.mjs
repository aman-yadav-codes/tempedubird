/**
 * Database Diagnostic Script for Hostinger PostgreSQL & Local Development
 * Usage: node scripts/diagnose-db.mjs
 */
import dns from "dns/promises";
import net from "net";
import { URL } from "url";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const { Client } = pg;

function maskConnectionString(rawUrl) {
  if (!rawUrl) return "[UNDEFINED]";
  try {
    const parsed = new URL(rawUrl);
    const pass = parsed.password ? "********" : "";
    return `${parsed.protocol}//${parsed.username}:${pass}@${parsed.hostname}:${parsed.port}${parsed.pathname}`;
  } catch {
    return "[MALFORMED_URL]";
  }
}

async function runDiagnostics() {
  console.log("==========================================================");
  console.log("   Hostinger PostgreSQL Diagnostic Tool (Next.js/Windows)  ");
  console.log("==========================================================\n");

  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    console.error("❌ ERROR: DATABASE_URL is not set in environment or .env.local");
    process.exit(1);
  }

  console.log(`📌 Configured URL: ${maskConnectionString(rawUrl)}`);
  console.log(`📌 DATABASE_SSL: ${process.env.DATABASE_SSL ?? "default (true)"}`);
  console.log(`📌 DATABASE_SSL_REJECT_UNAUTHORIZED: ${process.env.DATABASE_SSL_REJECT_UNAUTHORIZED ?? "default (false)"}`);
  console.log("");

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (err) {
    console.error("❌ ERROR: Failed to parse DATABASE_URL:", err.message);
    process.exit(1);
  }

  const host = parsed.hostname;
  const port = Number(parsed.port || 5432);
  const database = parsed.pathname.replace(/^\//, "") || "postgres";
  const user = parsed.username || "postgres";
  const password = parsed.password;

  // 1. DNS Resolution
  console.log(`🔍 [1/5] Testing DNS Resolution for '${host}'...`);
  const dnsStart = Date.now();
  try {
    const addresses = await dns.lookup(host, { all: true });
    const dnsElapsed = Date.now() - dnsStart;
    console.log(`   ✅ Resolved in ${dnsElapsed}ms:`);
    addresses.forEach((a) => console.log(`      - ${a.address} (family: IPv${a.family})`));
  } catch (err) {
    console.error(`   ❌ DNS Resolution failed for ${host}: ${err.message}`);
  }
  console.log("");

  // 2. TCP Port Reachability (Raw Socket)
  console.log(`🔍 [2/5] Testing TCP Connectivity to ${host}:${port}...`);
  const tcpResult = await new Promise((resolve) => {
    const start = Date.now();
    const socket = new net.Socket();
    socket.setTimeout(4000);

    socket.connect(port, host, () => {
      const elapsed = Date.now() - start;
      socket.destroy();
      resolve({ success: true, elapsed });
    });

    socket.on("error", (err) => {
      const elapsed = Date.now() - start;
      socket.destroy();
      resolve({ success: false, elapsed, error: err.message, code: err.code });
    });

    socket.on("timeout", () => {
      const elapsed = Date.now() - start;
      socket.destroy();
      resolve({ success: false, elapsed, error: "TCP Connection Timed Out (SYN dropped)", code: "ETIMEDOUT" });
    });
  });

  if (tcpResult.success) {
    console.log(`   ✅ TCP Port ${port} is OPEN and reachable in ${tcpResult.elapsed}ms!`);
  } else {
    console.error(`   ❌ TCP Port ${port} connection FAILED after ${tcpResult.elapsed}ms: ${tcpResult.error} (${tcpResult.code})`);
    console.error(`   ⚠️  This indicates an external network block, Hostinger VPS firewall rule, or stopped container.`);
  }
  console.log("");

  // 3. PostgreSQL Handshake & Authentication
  const isSslConfigured = process.env.DATABASE_SSL !== "false";
  console.log(`🔍 [3/5] Testing PostgreSQL Connection (SSL: ${isSslConfigured ? "Enabled" : "Disabled"})...`);
  const client = new Client({
    host,
    port,
    database,
    user,
    password,
    connectionTimeoutMillis: 5000,
    ssl: isSslConfigured ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" } : false,
  });

  let pgConnected = false;
  const pgStart = Date.now();
  try {
    await client.connect();
    const pgElapsed = Date.now() - pgStart;
    console.log(`   ✅ Connected in ${pgElapsed}ms!`);
    pgConnected = true;

    // 4. Simple Query: SELECT 1
    console.log(`\n🔍 [4/5] Testing Simple Query: 'SELECT 1 AS alive, version()'...`);
    const qStart = Date.now();
    const res = await client.query("SELECT 1 AS alive, current_database() AS db, current_user AS usr, version() AS ver;");
    const qElapsed = Date.now() - qStart;
    console.log(`   ✅ Query executed successfully in ${qElapsed}ms:`);
    console.log(`      - DB: ${res.rows[0]?.db}`);
    console.log(`      - User: ${res.rows[0]?.usr}`);
    console.log(`      - Engine: ${String(res.rows[0]?.ver).split("\n")[0].slice(0, 70)}...`);

    // 5. Query Active Connections & Pool Check
    console.log(`\n🔍 [5/5] Checking Database Stats & Active Connections...`);
    try {
      const statRes = await client.query(`
        SELECT count(*) as total_connections, 
               count(*) filter (where state = 'active') as active,
               count(*) filter (where state = 'idle') as idle
        FROM pg_stat_activity 
        WHERE datname = current_database();
      `);
      console.log(`   ✅ Current Database Connections:`);
      console.log(`      - Total: ${statRes.rows[0]?.total_connections}`);
      console.log(`      - Active: ${statRes.rows[0]?.active}`);
      console.log(`      - Idle: ${statRes.rows[0]?.idle}`);
    } catch {
      console.log("   ℹ️ Unable to query pg_stat_activity (insufficient privileges, normal for restricted users).");
    }

    await client.end();
  } catch (err) {
    const pgElapsed = Date.now() - pgStart;
    console.error(`   ❌ PostgreSQL Connection failed after ${pgElapsed}ms: ${err.message} (${err.code || "NO_CODE"})`);
    await client.end().catch(() => {});

    // Try Non-SSL test if SSL failed
    if (isSslConfigured && tcpResult.success) {
      console.log(`\n   Retrying without SSL...`);
      const clientPlain = new Client({
        host,
        port,
        database,
        user,
        password,
        connectionTimeoutMillis: 5000,
        ssl: false,
      });
      try {
        await clientPlain.connect();
        console.log(`   ✅ Non-SSL connection succeeded! (Server may not have SSL configured)`);
        pgConnected = true;
        await clientPlain.end();
      } catch (plainErr) {
        console.error(`   ❌ Non-SSL connection also failed: ${plainErr.message}`);
        await clientPlain.end().catch(() => {});
      }
    }
  }

  console.log("\n==========================================================");
  console.log("                 DIAGNOSTIC SUMMARY                        ");
  console.log("==========================================================");
  if (tcpResult.success && pgConnected) {
    console.log("Status: 🟢 Database is FULLY OPERATIONAL and accessible.");
  } else if (!tcpResult.success) {
    console.log("Status: 🔴 NETWORK/FIREWALL ISSUE");
    console.log(`  - Target host '${host}' is not accepting connections on port ${port}.`);
    console.log("  - Check Hostinger VPS firewall, UFW status, or SSH tunnel.");
  } else {
    console.log("Status: 🟡 TCP REACHABLE, BUT AUTHENTICATION/SSL FAILED");
    console.log("  - Check database user credentials, database name, and pg_hba.conf.");
  }
  console.log("==========================================================\n");
}

runDiagnostics().catch(console.error);
