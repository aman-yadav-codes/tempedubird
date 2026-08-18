import { db } from "@/lib/db/db";

const DEFAULT_SOCKET_PUBLIC_URL = "http://localhost:3040";
const DEFAULT_SOCKET_INTERNAL_URL = "http://localhost:3040";

export type SocketServerSettings = {
  id: number;
  public_url: string;
  internal_url: string;
  socket_path: string;
  internal_secret: string | null;
  request_timeout_ms: number;
  enabled: boolean;
  updated_by: number | null;
  updated_at: string;
};

export type SocketServerPublicSettings = Omit<SocketServerSettings, "internal_secret"> & {
  internal_secret_configured: boolean;
};

export type SocketServerHealth = {
  ok: boolean;
  startedAt?: string;
  connectedSockets?: number;
  connectedUsers?: number;
  publishedCount?: number;
  rejectedPublishCount?: number;
  lastPublishedAt?: string | null;
  redisConnected?: boolean;
  checkedAt: string;
  responseMs: number;
  error?: string;
};

type UpdateSocketServerSettingsInput = {
  public_url?: unknown;
  internal_url?: unknown;
  socket_path?: unknown;
  internal_secret?: unknown;
  clear_internal_secret?: unknown;
  request_timeout_ms?: unknown;
  enabled?: unknown;
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

function assertValidHttpUrl(value: string, label: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error(`${label} must start with http:// or https://.`);
    }
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : `Invalid ${label}.`);
  }
}

function assertValidSocketPath(value: string) {
  if (!value.startsWith("/")) {
    throw new Error("Socket path must start with /.");
  }
}

export function toPublicSocketServerSettings(settings: SocketServerSettings): SocketServerPublicSettings {
  return {
    id: settings.id,
    public_url: settings.public_url,
    internal_url: settings.internal_url,
    socket_path: settings.socket_path,
    request_timeout_ms: settings.request_timeout_ms,
    enabled: settings.enabled,
    updated_by: settings.updated_by,
    updated_at: settings.updated_at,
    internal_secret_configured: Boolean(settings.internal_secret || process.env.SOCKET_INTERNAL_SECRET),
  };
}

export async function ensureSocketServerTables() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS socket_server_settings (
      id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
      public_url TEXT NOT NULL DEFAULT '${DEFAULT_SOCKET_PUBLIC_URL}',
      internal_url TEXT NOT NULL DEFAULT '${DEFAULT_SOCKET_INTERNAL_URL}',
      socket_path TEXT NOT NULL DEFAULT '/socket.io',
      internal_secret TEXT NULL,
      request_timeout_ms INTEGER NOT NULL DEFAULT 1500 CHECK (request_timeout_ms >= 500),
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      updated_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    INSERT INTO socket_server_settings (id)
    VALUES (1)
    ON CONFLICT (id) DO NOTHING
  `);
}

export async function getSocketServerSettings() {
  await ensureSocketServerTables();
  const result = await db.query<SocketServerSettings>(
    `SELECT * FROM socket_server_settings WHERE id = 1`,
  );
  return result.rows[0];
}

export async function updateSocketServerSettings(input: UpdateSocketServerSettingsInput, userId: number | null) {
  const current = await getSocketServerSettings();
  const publicUrl = asString(input.public_url, current.public_url);
  const internalUrl = asString(input.internal_url, current.internal_url);
  const socketPath = asString(input.socket_path, current.socket_path) || current.socket_path;
  assertValidHttpUrl(publicUrl, "Public URL");
  assertValidHttpUrl(internalUrl, "Internal URL");
  assertValidSocketPath(socketPath);

  const nextSecret =
    input.clear_internal_secret === true
      ? null
      : input.internal_secret === undefined
        ? current.internal_secret
        : asNullableString(input.internal_secret);

  const result = await db.query<SocketServerSettings>(
    `
      UPDATE socket_server_settings
      SET public_url = $1,
          internal_url = $2,
          socket_path = $3,
          internal_secret = $4,
          request_timeout_ms = $5,
          enabled = $6,
          updated_by = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
      RETURNING *
    `,
    [
      publicUrl,
      internalUrl,
      socketPath,
      nextSecret,
      asPositiveInteger(input.request_timeout_ms, current.request_timeout_ms, 500),
      asBoolean(input.enabled, current.enabled),
      userId,
    ],
  );

  return result.rows[0];
}

export async function checkSocketServerHealth(settings?: SocketServerSettings): Promise<SocketServerHealth> {
  const current = settings ?? await getSocketServerSettings();
  const started = Date.now();
  const checkedAt = new Date().toISOString();

  if (!current.enabled) {
    return {
      ok: false,
      checkedAt,
      responseMs: 0,
      error: "Socket service is disabled from settings.",
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), current.request_timeout_ms);

  try {
    const url = new URL("/health", current.internal_url);
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    return {
      ok: response.ok && body?.ok === true,
      startedAt: typeof body?.startedAt === "string" ? body.startedAt : undefined,
      connectedSockets: Number.isInteger(Number(body?.connectedSockets)) ? Number(body.connectedSockets) : undefined,
      connectedUsers: Number.isInteger(Number(body?.connectedUsers)) ? Number(body.connectedUsers) : undefined,
      publishedCount: Number.isInteger(Number(body?.publishedCount)) ? Number(body.publishedCount) : undefined,
      rejectedPublishCount: Number.isInteger(Number(body?.rejectedPublishCount)) ? Number(body.rejectedPublishCount) : undefined,
      lastPublishedAt: typeof body?.lastPublishedAt === "string" ? body.lastPublishedAt : null,
      redisConnected: typeof body?.redisConnected === "boolean" ? body.redisConnected : undefined,
      checkedAt,
      responseMs: Date.now() - started,
      error: response.ok ? undefined : `Health endpoint returned HTTP ${response.status}.`,
    };
  } catch (error) {
    return {
      ok: false,
      checkedAt,
      responseMs: Date.now() - started,
      error: error instanceof Error ? error.message : "Failed to reach socket health endpoint.",
    };
  } finally {
    clearTimeout(timeout);
  }
}
