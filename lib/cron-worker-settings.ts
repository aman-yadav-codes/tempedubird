import { db } from "@/lib/db/db";

const DEFAULT_TARGET_URL = "https://final-edubird.vercel.app/api/cron/run-scheduled-jobs";

export type CronWorkerSettings = {
  id: number;
  target_url: string;
  secret: string | null;
  interval_ms: number;
  request_timeout_ms: number;
  run_on_start: boolean;
  health_port: number | null;
  worker_name: string;
  enabled: boolean;
  updated_by: number | null;
  updated_at: string;
};

export type CronWorkerPublicSettings = Omit<CronWorkerSettings, "secret"> & {
  secret_configured: boolean;
};

export type CronWorkerHeartbeat = {
  id: number;
  worker_name: string;
  status: string;
  target_url: string | null;
  interval_ms: number | null;
  request_timeout_ms: number | null;
  health_port: number | null;
  last_seen_at: string;
  last_run_at: string | null;
  last_success_at: string | null;
  last_failure_at: string | null;
  tick_count: number;
  success_count: number;
  failure_count: number;
  skipped_count: number;
  last_http_status: number | null;
  last_processed: number | null;
  last_error: string | null;
  payload: Record<string, unknown> | null;
};

type UpdateCronWorkerSettingsInput = {
  target_url?: unknown;
  secret?: unknown;
  clear_secret?: unknown;
  interval_ms?: unknown;
  request_timeout_ms?: unknown;
  run_on_start?: unknown;
  health_port?: unknown;
  worker_name?: unknown;
  enabled?: unknown;
};

type HeartbeatInput = {
  worker_name?: unknown;
  status?: unknown;
  target_url?: unknown;
  interval_ms?: unknown;
  request_timeout_ms?: unknown;
  health_port?: unknown;
  last_run_at?: unknown;
  last_success_at?: unknown;
  last_failure_at?: unknown;
  tick_count?: unknown;
  success_count?: unknown;
  failure_count?: unknown;
  skipped_count?: unknown;
  last_http_status?: unknown;
  last_processed?: unknown;
  last_error?: unknown;
  payload?: unknown;
};

function asString(value: unknown, fallback: string) {
  return typeof value === "string" ? value.trim() : fallback;
}

function asNullableString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function asPositiveInteger(value: unknown, fallback: number, min: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) return fallback;
  return parsed;
}

function asNullablePositiveInteger(value: unknown, fallback: number | null, min: number) {
  if (value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min) return fallback;
  return parsed;
}

function assertValidHttpUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Target URL must start with http:// or https://.");
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "Invalid target URL.");
  }
}

export function toPublicCronWorkerSettings(settings: CronWorkerSettings): CronWorkerPublicSettings {
  return {
    id: settings.id,
    target_url: settings.target_url,
    interval_ms: settings.interval_ms,
    request_timeout_ms: settings.request_timeout_ms,
    run_on_start: settings.run_on_start,
    health_port: settings.health_port,
    worker_name: settings.worker_name,
    enabled: settings.enabled,
    updated_by: settings.updated_by,
    updated_at: settings.updated_at,
    secret_configured: Boolean(settings.secret || process.env.CRON_SECRET),
  };
}

export async function ensureCronWorkerTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS cron_worker_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      target_url TEXT NOT NULL DEFAULT '${DEFAULT_TARGET_URL}',
      secret TEXT NULL,
      interval_ms INTEGER NOT NULL DEFAULT 60000 CHECK (interval_ms >= 5000),
      request_timeout_ms INTEGER NOT NULL DEFAULT 30000 CHECK (request_timeout_ms >= 1000),
      run_on_start BOOLEAN NOT NULL DEFAULT TRUE,
      health_port INTEGER NULL CHECK (health_port IS NULL OR health_port > 0),
      worker_name TEXT NOT NULL DEFAULT 'edubird-cron-jobs',
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    INSERT INTO cron_worker_settings (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS cron_worker_heartbeats (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      worker_name TEXT NOT NULL DEFAULT 'edubird-cron-jobs',
      status TEXT NOT NULL DEFAULT 'unknown',
      target_url TEXT NULL,
      interval_ms INTEGER NULL,
      request_timeout_ms INTEGER NULL,
      health_port INTEGER NULL,
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_run_at TIMESTAMPTZ NULL,
      last_success_at TIMESTAMPTZ NULL,
      last_failure_at TIMESTAMPTZ NULL,
      tick_count INTEGER NOT NULL DEFAULT 0,
      success_count INTEGER NOT NULL DEFAULT 0,
      failure_count INTEGER NOT NULL DEFAULT 0,
      skipped_count INTEGER NOT NULL DEFAULT 0,
      last_http_status INTEGER NULL,
      last_processed INTEGER NULL,
      last_error TEXT NULL,
      payload JSONB NOT NULL DEFAULT '{}'::jsonb
    )
  `);
}

export async function getCronWorkerSettings() {
  await ensureCronWorkerTables();
  const result = await db.query<CronWorkerSettings>(
    `SELECT * FROM cron_worker_settings WHERE id = 1`,
  );
  return result.rows[0];
}

export async function updateCronWorkerSettings(input: UpdateCronWorkerSettingsInput, userId: number | null) {
  const current = await getCronWorkerSettings();
  const targetUrl = asString(input.target_url, current.target_url);
  assertValidHttpUrl(targetUrl);

  const shouldClearSecret = input.clear_secret === true;
  const nextSecret =
    shouldClearSecret
      ? null
      : input.secret === undefined
        ? current.secret
        : asNullableString(input.secret);

  const result = await db.query<CronWorkerSettings>(
    `
      UPDATE cron_worker_settings
      SET target_url = $1,
          secret = $2,
          interval_ms = $3,
          request_timeout_ms = $4,
          run_on_start = $5,
          health_port = $6,
          worker_name = $7,
          enabled = $8,
          updated_by = $9,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
      RETURNING *
    `,
    [
      targetUrl,
      nextSecret,
      asPositiveInteger(input.interval_ms, current.interval_ms, 5000),
      asPositiveInteger(input.request_timeout_ms, current.request_timeout_ms, 1000),
      asBoolean(input.run_on_start, current.run_on_start),
      asNullablePositiveInteger(input.health_port, current.health_port, 1),
      asString(input.worker_name, current.worker_name) || current.worker_name,
      asBoolean(input.enabled, current.enabled),
      userId,
    ],
  );

  return result.rows[0];
}

export async function getCronWorkerHeartbeat() {
  await ensureCronWorkerTables();
  const result = await db.query<CronWorkerHeartbeat>(
    `SELECT * FROM cron_worker_heartbeats WHERE id = 1`,
  );
  return result.rows[0] ?? null;
}

export async function upsertCronWorkerHeartbeat(input: HeartbeatInput) {
  await ensureCronWorkerTables();
  const result = await db.query<CronWorkerHeartbeat>(
    `
      INSERT INTO cron_worker_heartbeats (
        id,
        worker_name,
        status,
        target_url,
        interval_ms,
        request_timeout_ms,
        health_port,
        last_seen_at,
        last_run_at,
        last_success_at,
        last_failure_at,
        tick_count,
        success_count,
        failure_count,
        skipped_count,
        last_http_status,
        last_processed,
        last_error,
        payload
      )
      VALUES (1, $1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17::jsonb)
      ON CONFLICT (id) DO UPDATE SET
        worker_name = EXCLUDED.worker_name,
        status = EXCLUDED.status,
        target_url = EXCLUDED.target_url,
        interval_ms = EXCLUDED.interval_ms,
        request_timeout_ms = EXCLUDED.request_timeout_ms,
        health_port = EXCLUDED.health_port,
        last_seen_at = CURRENT_TIMESTAMP,
        last_run_at = EXCLUDED.last_run_at,
        last_success_at = EXCLUDED.last_success_at,
        last_failure_at = EXCLUDED.last_failure_at,
        tick_count = EXCLUDED.tick_count,
        success_count = EXCLUDED.success_count,
        failure_count = EXCLUDED.failure_count,
        skipped_count = EXCLUDED.skipped_count,
        last_http_status = EXCLUDED.last_http_status,
        last_processed = EXCLUDED.last_processed,
        last_error = EXCLUDED.last_error,
        payload = EXCLUDED.payload
      RETURNING *
    `,
    [
      asString(input.worker_name, "edubird-cron-jobs"),
      asString(input.status, "unknown"),
      asNullableString(input.target_url),
      asNullablePositiveInteger(input.interval_ms, null, 1),
      asNullablePositiveInteger(input.request_timeout_ms, null, 1),
      asNullablePositiveInteger(input.health_port, null, 1),
      asNullableString(input.last_run_at),
      asNullableString(input.last_success_at),
      asNullableString(input.last_failure_at),
      asPositiveInteger(input.tick_count, 0, 0),
      asPositiveInteger(input.success_count, 0, 0),
      asPositiveInteger(input.failure_count, 0, 0),
      asPositiveInteger(input.skipped_count, 0, 0),
      asNullablePositiveInteger(input.last_http_status, null, 1),
      asNullablePositiveInteger(input.last_processed, null, 0),
      asNullableString(input.last_error),
      JSON.stringify(input.payload && typeof input.payload === "object" ? input.payload : {}),
    ],
  );

  return result.rows[0];
}

export async function isCronWorkerRequestAuthorized(req: Request) {
  const settings = await getCronWorkerSettings();
  const secrets = [process.env.CRON_SECRET, settings.secret].filter(
    (secret): secret is string => Boolean(secret),
  );
  if (secrets.length === 0) return true;

  const authHeader = req.headers.get("authorization");
  return secrets.some((secret) => authHeader === `Bearer ${secret}`);
}
