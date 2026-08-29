// /lib/db.ts
import { Pool, type PoolClient, type QueryConfig, type QueryResult, type QueryResultRow } from "pg";

const DEBUG_ENV_VALUES = new Set(["1", "true", "yes", "on"]);
const TRANSIENT_DB_ERROR_CODES = new Set([
  "ECONNRESET",
  "ECONNREFUSED",
  "ETIMEDOUT",
  "EPIPE",
  "ENOTFOUND",
  "57P01",
  "57P02",
  "57P03",
  "08000",
  "08003",
  "08006",
  "08001",
  "08004",
  "53300",
]);

function isDebuggingEnabled() {
  return DEBUG_ENV_VALUES.has(
    String(process.env.IS_DEBUGGING ?? process.env.is_debugging ?? process.env.DB_DEBUG ?? "").toLowerCase()
  );
}

function getNumberEnv(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function getDbErrorMeta(error: unknown) {
  if (!error || typeof error !== "object") {
    return { message: String(error) };
  }

  const record = error as { code?: unknown; message?: unknown };
  return {
    code: typeof record.code === "string" ? record.code : undefined,
    message: typeof record.message === "string" ? record.message : String(error),
  };
}

function getQueryPreview(queryTextOrConfig: string | QueryConfig<unknown[]>) {
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

function normalizeDatabaseUrl(rawUrl?: string) {
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

function isTransientDbError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const record = error as { code?: unknown; message?: unknown };
  const code = typeof record.code === "string" ? record.code : "";
  const message = typeof record.message === "string" ? record.message : "";

  return (
    TRANSIENT_DB_ERROR_CODES.has(code) ||
    /Connection terminated|Connection ended unexpectedly|timeout|terminating connection|server closed the connection/i.test(message)
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class DbTimeoutError extends Error {
  code = "ETIMEDOUT";

  constructor(message: string) {
    super(message);
    this.name = "DbTimeoutError";
  }
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string) {
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

async function retryTransient<T>(operation: () => Promise<T>, attempts = 3, label = "db.operation") {
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

const connectTimeoutMs = getNumberEnv("DATABASE_CONNECT_TIMEOUT_MS", 20_000);
const queryTimeoutMs = getNumberEnv("DATABASE_QUERY_TIMEOUT_MS", 35_000);
const useDatabaseSsl = process.env.DATABASE_SSL !== "false";

const dbPool = new Pool({
  connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL),
  max: Number(process.env.DATABASE_POOL_MAX ?? 10),
  idleTimeoutMillis: Number(process.env.DATABASE_IDLE_TIMEOUT_MS ?? 30_000),
  connectionTimeoutMillis: connectTimeoutMs,
  query_timeout: queryTimeoutMs,
  keepAlive: true,
  ssl: useDatabaseSsl
    ? { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true" }
    : false,
});

const rawConnect = dbPool.connect.bind(dbPool) as () => Promise<PoolClient>;
const rawQuery = dbPool.query.bind(dbPool) as typeof dbPool.query;

async function connectWithLogging() {
  return retryTransient<PoolClient>(
    async () => {
      const startedAt = Date.now();
      debugLog("[db.connect.start]");

      try {
        const client = await withTimeout(rawConnect(), connectTimeoutMs, "connect");
        debugLog("[db.connect.ok]", { elapsed_ms: Date.now() - startedAt });
        return client;
      } catch (error) {
        debugWarn("[db.connect.error]", {
          elapsed_ms: Date.now() - startedAt,
          ...getDbErrorMeta(error),
        });
        throw error;
      }
    },
    2,
    "connect"
  );
}

dbPool.query = (<T extends QueryResultRow = QueryResultRow>(
  queryTextOrConfig: string | QueryConfig<unknown[]>,
  values?: unknown[]
) => {
  const preview = getQueryPreview(queryTextOrConfig);

  return retryTransient(
    async () => {
      const startedAt = Date.now();
      const pendingTimer = setTimeout(() => {
        debugWarn("[db.query.pending]", {
          elapsed_ms: Date.now() - startedAt,
          timeout_ms: queryTimeoutMs,
          preview,
        });
      }, Math.min(queryTimeoutMs, 5_000));
      debugLog("[db.query.start]", { preview });

      try {
        const result = (await rawQuery(queryTextOrConfig, values)) as QueryResult<T>;
        const elapsedMs = Date.now() - startedAt;
        debugLog(elapsedMs > 1_000 ? "[db.query.slow]" : "[db.query.ok]", {
          elapsed_ms: elapsedMs,
          rows: result.rowCount,
          preview,
        });
        return result;
      } catch (error) {
        debugWarn("[db.query.error]", {
          elapsed_ms: Date.now() - startedAt,
          preview,
          ...getDbErrorMeta(error),
        });
        throw error;
      } finally {
        clearTimeout(pendingTimer);
      }
    },
    2,
    preview
  );
}) as typeof dbPool.query;

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

dbPool.on("connect", () => {
  debugLog("[db.pool.client.ready]");
});

dbPool.on("error", (error) => {
  console.warn("[db.pool.error]", error instanceof Error ? error.message : error);
});

if (isDebuggingEnabled()) {
  void dbPool
    .query("SELECT 1 AS connected")
    .then(() => {
      console.log("[db.ready] Database connection verified");
    })
    .catch((error) => {
      console.warn("[db.ready.error]", getDbErrorMeta(error));
    });
}

export const db = dbPool;
export type DbQueryResult<T extends QueryResultRow = QueryResultRow> = QueryResult<T>;
