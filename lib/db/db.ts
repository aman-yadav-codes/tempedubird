import dns from "node:dns";
try { dns.setDefaultResultOrder?.("ipv4first"); } catch {}

import { Pool, types, type PoolClient, type QueryConfig, type QueryResult, type QueryResultRow } from "pg";

// OID 1114: TIMESTAMP WITHOUT TIME ZONE
// Postgres stores DEFAULT CURRENT_TIMESTAMP in UTC.
// By default, node-postgres parses TIMESTAMP WITHOUT TIME ZONE as local system time,
// which shifts times by local offset (e.g. -5h30m in IST).
// We parse it explicitly as UTC Date so that toISOString() and Asia/Kolkata conversions match actual event time.
types.setTypeParser(1114, (stringValue: string) => {
  if (!stringValue) return null;
  const normalized = stringValue.includes("T") ? stringValue : stringValue.replace(" ", "T");
  const utcString = /([+-]\d{2}(:\d{2})?|Z)$/.test(normalized) ? normalized : `${normalized}Z`;
  return new Date(utcString);
});

const DEBUG_ENV_VALUES = new Set(["1", "true", "yes", "on"]);

export const TRANSIENT_DB_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "ENOTFOUND",
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now
  "08000", // connection_exception
  "08003", // connection_does_not_exist
  "08006", // connection_failure
  "08001", // sqlclient_unable_to_establish_sqlconnection
  "08004", // sqlserver_rejected_establishment_of_sqlconnection
  "53300", // too_many_connections
]);

function isDebuggingEnabled() {
  return DEBUG_ENV_VALUES.has(
    String(process.env.IS_DEBUGGING ?? process.env.is_debugging ?? process.env.DB_DEBUG ?? "").toLowerCase()
  );
}

export function getNumberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getDbErrorMeta(error: unknown) {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }

  const record = error as { code?: unknown; message?: unknown };
  return {
    code: typeof record.code === "string" ? record.code : undefined,
    message: typeof record.message === "string" ? record.message : String(error),
  };
}

export function getQueryPreview(queryTextOrConfig: string | QueryConfig<unknown[]>) {
  const queryText = typeof queryTextOrConfig === "string" ? queryTextOrConfig : queryTextOrConfig.text;
  return (queryText || "[query config]").replace(/\s+/g, " ").trim().slice(0, 180);
}

function debugLog(label: string, payload?: Record<string, unknown>) {
  if (!isDebuggingEnabled()) return;
  if (payload) {
    console.log(label, payload);
    return;
  }
  console.log(label);
}

function debugWarn(label: string, payload: Record<string, unknown>) {
  if (!isDebuggingEnabled()) return;
  console.warn(label, payload);
}

export function normalizeDatabaseUrl(rawUrl?: string) {
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

export function isTransientDbError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: unknown; message?: unknown; name?: unknown };
  const code = typeof record.code === "string" ? record.code : "";
  const message = typeof record.message === "string" ? record.message : "";
  const name = typeof record.name === "string" ? record.name : "";

  return (
    name === "DbTimeoutError" ||
    TRANSIENT_DB_ERROR_CODES.has(code) ||
    /Connection terminated|Connection ended unexpectedly|timed? ?out|terminating connection|server closed the connection|circuit open|database connection unavailable|network/i.test(message)
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class DbTimeoutError extends Error {
  code = "ETIMEDOUT";

  constructor(message = "Database connection is temporarily unavailable. Please try again shortly.") {
    super(message);
    this.name = "DbTimeoutError";
  }
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          reject(new DbTimeoutError(`${label} timed out after ${timeoutMs}ms`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function retryTransient<T>(operation: () => Promise<T>, attempts = 2, label = "db.operation"): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isTransientDbError(error) || attempt === attempts) break;
      debugWarn("[db.retry]", {
        label,
        attempt,
        attempts,
        ...getDbErrorMeta(error),
      });
      await wait(150 * attempt);
    }
  }

  throw lastError;
}

// ============================================================================
// State Machine: 3-State Database Circuit Breaker (CLOSED / OPEN / HALF_OPEN)
// ============================================================================
export type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

class DatabaseCircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private lastFailureTimestamp = 0;
  private halfOpenProbeInFlight = false;

  private readonly failureThreshold = getNumberEnv("CIRCUIT_BREAKER_THRESHOLD", 3);
  private readonly cooldownMs = getNumberEnv("CIRCUIT_BREAKER_WINDOW_MS", 15_000);

  public getState(): CircuitState {
    if (this.state === "OPEN" && Date.now() - this.lastFailureTimestamp > this.cooldownMs) {
      return "HALF_OPEN";
    }
    return this.state;
  }

  public getMetrics() {
    return {
      state: this.getState(),
      consecutiveFailures: this.failureCount,
      lastFailureAt: this.lastFailureTimestamp ? new Date(this.lastFailureTimestamp).toISOString() : null,
      cooldownMs: this.cooldownMs,
      failureThreshold: this.failureThreshold,
    };
  }

  public check(label: string): void {
    const currentState = this.getState();

    if (currentState === "OPEN") {
      debugWarn("[db.circuit_breaker.open]", { label, state: "OPEN" });
      throw new DbTimeoutError("Database connection is temporarily unavailable. Please try again shortly.");
    }

    if (currentState === "HALF_OPEN") {
      if (this.halfOpenProbeInFlight) {
        // Another concurrent request is already probing the DB.
        // Fail-fast immediately to protect the recovering server from a thundering herd.
        debugWarn("[db.circuit_breaker.half_open_throttled]", { label });
        throw new DbTimeoutError("Database is recovering. Please try again in a moment.");
      }
      // Allow this single probe request through
      this.halfOpenProbeInFlight = true;
      this.state = "HALF_OPEN";
      debugLog("[db.circuit_breaker.probe_allowed]", { label });
    }
  }

  public recordSuccess(): void {
    this.failureCount = 0;
    this.lastFailureTimestamp = 0;
    this.halfOpenProbeInFlight = false;
    this.state = "CLOSED";
  }

  public recordFailure(error: unknown, label: string): void {
    this.halfOpenProbeInFlight = false;

    // Normal application SQL errors (syntax errors, unique constraints, missing columns)
    // MUST NOT trip the connection circuit breaker!
    if (!isTransientDbError(error)) {
      return;
    }

    this.failureCount += 1;
    this.lastFailureTimestamp = Date.now();

    if (this.state === "HALF_OPEN" || this.failureCount >= this.failureThreshold) {
      this.state = "OPEN";
      debugWarn("[db.circuit_breaker.tripped_open]", {
        label,
        consecutive_failures: this.failureCount,
        cooldown_ms: this.cooldownMs,
        ...getDbErrorMeta(error),
      });
    }
  }

  public reset(): void {
    this.recordSuccess();
  }
}

export const circuitBreaker = new DatabaseCircuitBreaker();

// ============================================================================
// Metrics Tracker
// ============================================================================
class DatabaseMetrics {
  public totalQueries = 0;
  public slowQueries = 0;
  public failedQueries = 0;
  public totalElapsedMs = 0;

  public record(elapsedMs: number, success: boolean) {
    this.totalQueries += 1;
    this.totalElapsedMs += elapsedMs;
    if (elapsedMs > 1_000) this.slowQueries += 1;
    if (!success) this.failedQueries += 1;
  }

  public getSummary() {
    return {
      totalQueries: this.totalQueries,
      slowQueries: this.slowQueries,
      failedQueries: this.failedQueries,
      avgResponseTimeMs: this.totalQueries > 0 ? Math.round(this.totalElapsedMs / this.totalQueries) : 0,
    };
  }
}

export const dbMetrics = new DatabaseMetrics();

// ============================================================================
// PostgreSQL Pool Architecture
// ============================================================================
const connectTimeoutMs = getNumberEnv("DATABASE_CONNECT_TIMEOUT_MS", 5_000);
const queryTimeoutMs = getNumberEnv("DATABASE_QUERY_TIMEOUT_MS", 20_000);
const poolMax = getNumberEnv("DATABASE_POOL_MAX", 10);
const idleTimeoutMs = getNumberEnv("DATABASE_IDLE_TIMEOUT_MS", 10_000);
const useDatabaseSsl = process.env.DATABASE_SSL !== "false";

const globalForPg = globalThis as unknown as {
  pgPool: Pool | undefined;
};

function createPgPool(): Pool {
  const pool = new Pool({
    connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL),
    max: poolMax,
    min: 0, // Do not hold idle connections open to Hostinger across WAN
    idleTimeoutMillis: idleTimeoutMs,
    connectionTimeoutMillis: connectTimeoutMs,
    query_timeout: queryTimeoutMs,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10_000,
    application_name: "crm_local_nextjs",
    ssl: useDatabaseSsl
      ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" }
      : false,
  });

  // Handle background socket errors on idle clients so they don't crash Node.js
  pool.on("error", (err) => {
    debugWarn("[db.pool.idle_error]", { message: err?.message || String(err) });
  });

  pool.on("connect", () => {
    debugLog("[db.pool.client.connected]");
  });

  return pool;
}

const dbPool = globalForPg.pgPool ?? createPgPool();

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = dbPool;
}

// Preserve raw methods
const rawConnect = dbPool.connect.bind(dbPool) as () => Promise<PoolClient>;
const rawQuery = dbPool.query.bind(dbPool) as typeof dbPool.query;

// Wrap dbPool.query with Circuit Breaker, Timeout, and Metrics
dbPool.query = (<T extends QueryResultRow = QueryResultRow>(
  queryTextOrConfig: string | QueryConfig<unknown[]>,
  values?: unknown[]
) => {
  const preview = getQueryPreview(queryTextOrConfig);
  circuitBreaker.check(preview);

  return retryTransient(
    async () => {
      const startedAt = Date.now();
      debugLog("[db.query.start]", { preview });

      try {
        const result = (await withTimeout(
          rawQuery(queryTextOrConfig, values),
          connectTimeoutMs,
          preview
        )) as QueryResult<T>;

        const elapsedMs = Date.now() - startedAt;
        circuitBreaker.recordSuccess();
        dbMetrics.record(elapsedMs, true);

        debugLog(elapsedMs > 1_000 ? "[db.query.slow]" : "[db.query.ok]", {
          elapsed_ms: elapsedMs,
          rows: result.rowCount,
          preview,
        });

        return result;
      } catch (error) {
        const elapsedMs = Date.now() - startedAt;
        circuitBreaker.recordFailure(error, preview);
        dbMetrics.record(elapsedMs, false);

        debugWarn("[db.query.error]", {
          elapsed_ms: elapsedMs,
          preview,
          ...getDbErrorMeta(error),
        });
        throw error;
      }
    },
    1,
    preview
  );
}) as typeof dbPool.query;

// Wrap dbPool.connect with Circuit Breaker and safe timeouts
async function connectWithLogging(): Promise<PoolClient> {
  circuitBreaker.check("connect");
  return retryTransient<PoolClient>(
    async () => {
      const startedAt = Date.now();
      debugLog("[db.connect.start]");

      try {
        const client = await withTimeout(rawConnect(), connectTimeoutMs, "connect");
        circuitBreaker.recordSuccess();
        debugLog("[db.connect.ok]", { elapsed_ms: Date.now() - startedAt });
        return client;
      } catch (error) {
        circuitBreaker.recordFailure(error, "connect");
        debugWarn("[db.connect.error]", {
          elapsed_ms: Date.now() - startedAt,
          ...getDbErrorMeta(error),
        });
        throw error;
      }
    },
    1,
    "connect"
  );
}

dbPool.connect = ((callback?: (err: Error | undefined, client?: PoolClient, release?: (release?: unknown) => void) => void) => {
  const promise = connectWithLogging();

  if (typeof callback === "function") {
    void promise
      .then((client) => {
        callback(undefined, client, client.release.bind(client));
      })
      .catch((error: Error) => {
        callback(error);
      });
    return;
  }

  return promise;
}) as typeof dbPool.connect;

/**
 * Safe transaction / client runner: ensures acquired client is unconditionally released in finally.
 */
export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await dbPool.connect();
  try {
    return await fn(client);
  } finally {
    try {
      client.release();
    } catch (relErr) {
      debugWarn("[db.client.release_error]", { message: (relErr as Error)?.message });
    }
  }
}

/**
 * Returns complete database health & diagnostics without exposing credentials.
 */
export function getDatabaseHealth() {
  const state = circuitBreaker.getState();
  let targetHost = "unknown";
  let targetPort = "5432";

  try {
    if (process.env.DATABASE_URL) {
      const u = new URL(process.env.DATABASE_URL);
      targetHost = u.hostname;
      targetPort = u.port || "5432";
    }
  } catch {}

  return {
    status: state === "CLOSED" ? "healthy" : state === "HALF_OPEN" ? "recovering" : "unreachable",
    circuit: circuitBreaker.getMetrics(),
    pool: {
      totalCount: dbPool.totalCount,
      idleCount: dbPool.idleCount,
      waitingCount: dbPool.waitingCount,
      maxConnections: poolMax,
    },
    target: {
      host: targetHost,
      port: Number(targetPort),
      ssl: useDatabaseSsl,
    },
    metrics: dbMetrics.getSummary(),
  };
}

export const db = dbPool;
export type DbQueryResult<T extends QueryResultRow = QueryResultRow> = QueryResult<T>;
