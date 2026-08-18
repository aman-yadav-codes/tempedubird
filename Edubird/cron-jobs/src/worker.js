import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_TARGET_URL = "https://final-edubird.vercel.app/api/cron/run-scheduled-jobs";

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (!key || process.env[key] !== undefined) continue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadDotEnv(path.join(ROOT_DIR, ".env"));

function parsePositiveInteger(value, fallback, min = 1) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min ? parsed : fallback;
}

function parseBoolean(value, fallback) {
  if (value === undefined || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function parseNullablePositiveInteger(value, fallback) {
  if (value === undefined || value === null || value === "") return null;
  return parsePositiveInteger(value, fallback, 1);
}

const config = {
  workerName: process.env.WORKER_NAME || "edubird-cron-jobs",
  targetUrl: process.env.CRON_TARGET_URL || DEFAULT_TARGET_URL,
  secret: process.env.CRON_SECRET || "",
  configSecret: process.env.CRON_CONFIG_SECRET || process.env.CRON_SECRET || "",
  intervalMs: parsePositiveInteger(process.env.CRON_INTERVAL_MS, 60_000, 5000),
  requestTimeoutMs: parsePositiveInteger(process.env.CRON_REQUEST_TIMEOUT_MS, 30_000, 1000),
  runOnStart: parseBoolean(process.env.CRON_RUN_ON_START, true),
  healthPort: process.env.HEALTH_PORT ? parsePositiveInteger(process.env.HEALTH_PORT, 3030, 1) : null,
  enabled: true,
};

const state = {
  startedAt: new Date().toISOString(),
  running: false,
  stopping: false,
  tickCount: 0,
  successCount: 0,
  failureCount: 0,
  skippedCount: 0,
  lastRunAt: null,
  lastSuccessAt: null,
  lastFailureAt: null,
  lastStatus: "idle",
  lastHttpStatus: null,
  lastProcessed: null,
  lastError: null,
};

function log(level, message, details = undefined) {
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  console[level](`[${new Date().toISOString()}] [${config.workerName}] ${message}${payload}`);
}

function validateUrl(value, label) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error(`${label} must start with http:// or https://`);
    }
    return url;
  } catch (error) {
    throw new Error(`Invalid ${label}: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

function apiUrl(pathname) {
  const url = validateUrl(config.targetUrl, "CRON_TARGET_URL");
  return new URL(pathname, `${url.protocol}//${url.host}`).toString();
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text.slice(0, 500) };
    }
    return { response, body, text };
  } finally {
    clearTimeout(timeout);
  }
}

async function refreshRemoteSettings() {
  const headers = { Accept: "application/json" };
  if (config.configSecret) headers.Authorization = `Bearer ${config.configSecret}`;

  const { response, body, text } = await fetchJson(apiUrl("/api/cron/worker-config"), { headers });
  if (!response.ok) {
    throw new Error(`Worker config returned HTTP ${response.status}: ${text.slice(0, 300)}`);
  }

  const remote = body?.data;
  if (!remote || typeof remote !== "object") return;

  const previousInterval = config.intervalMs;
  config.workerName = typeof remote.worker_name === "string" && remote.worker_name.trim()
    ? remote.worker_name.trim()
    : config.workerName;
  config.targetUrl = typeof remote.target_url === "string" && remote.target_url.trim()
    ? remote.target_url.trim()
    : config.targetUrl;
  config.secret = typeof remote.secret === "string" ? remote.secret : config.secret;
  config.intervalMs = parsePositiveInteger(remote.interval_ms, config.intervalMs, 5000);
  config.requestTimeoutMs = parsePositiveInteger(remote.request_timeout_ms, config.requestTimeoutMs, 1000);
  config.runOnStart = parseBoolean(remote.run_on_start, config.runOnStart);
  config.healthPort = parseNullablePositiveInteger(remote.health_port, config.healthPort);
  config.enabled = remote.enabled !== false;

  if (previousInterval !== config.intervalMs) {
    log("log", "Cron interval updated from remote settings.", {
      previousInterval,
      intervalMs: config.intervalMs,
    });
  }
}

async function sendHeartbeat() {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (config.secret || config.configSecret) {
    headers.Authorization = `Bearer ${config.secret || config.configSecret}`;
  }

  const payload = {
    worker_name: config.workerName,
    status: state.lastStatus,
    target_url: config.targetUrl,
    interval_ms: config.intervalMs,
    request_timeout_ms: config.requestTimeoutMs,
    health_port: config.healthPort,
    last_run_at: state.lastRunAt,
    last_success_at: state.lastSuccessAt,
    last_failure_at: state.lastFailureAt,
    tick_count: state.tickCount,
    success_count: state.successCount,
    failure_count: state.failureCount,
    skipped_count: state.skippedCount,
    last_http_status: state.lastHttpStatus,
    last_processed: state.lastProcessed,
    last_error: state.lastError,
    payload: {
      startedAt: state.startedAt,
      enabled: config.enabled,
      hasSecret: Boolean(config.secret),
    },
  };

  try {
    const { response, text } = await fetchJson(apiUrl("/api/cron/worker-heartbeat"), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      log("warn", "Heartbeat was not accepted.", {
        httpStatus: response.status,
        body: text.slice(0, 300),
      });
    }
  } catch (error) {
    log("warn", "Heartbeat failed.", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function callCronEndpoint() {
  if (state.running) {
    state.skippedCount += 1;
    log("warn", "Previous cron request is still running; skipping this tick.");
    return;
  }

  state.running = true;
  state.tickCount += 1;
  state.lastRunAt = new Date().toISOString();
  state.lastStatus = "running";
  state.lastError = null;

  try {
    try {
      await refreshRemoteSettings();
    } catch (error) {
      log("warn", "Could not refresh remote settings; using last known config.", {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    if (!config.enabled) {
      state.skippedCount += 1;
      state.lastStatus = "disabled";
      log("log", "Worker is disabled from remote settings; skipping endpoint call.");
      return;
    }

    const headers = { Accept: "application/json" };
    if (config.secret) headers.Authorization = `Bearer ${config.secret}`;

    const { response, body, text } = await fetchJson(config.targetUrl, {
      method: "GET",
      headers,
    });

    state.lastHttpStatus = response.status;
    state.lastProcessed = typeof body?.processed === "number" ? body.processed : null;

    if (!response.ok) {
      throw new Error(`Cron endpoint returned HTTP ${response.status}: ${text.slice(0, 500)}`);
    }

    state.successCount += 1;
    state.lastSuccessAt = new Date().toISOString();
    state.lastStatus = body?.disabled ? "disabled" : "success";
    log("log", "Cron endpoint processed.", {
      httpStatus: response.status,
      processed: state.lastProcessed,
      disabled: Boolean(body?.disabled),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown cron error";
    state.failureCount += 1;
    state.lastFailureAt = new Date().toISOString();
    state.lastStatus = "failed";
    state.lastError = message;
    log("error", "Cron endpoint failed.", { error: message });
  } finally {
    state.running = false;
    await sendHeartbeat();
  }
}

function startHealthServer() {
  if (!config.healthPort) return null;

  const server = http.createServer((req, res) => {
    if (req.url !== "/health") {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Not found" }));
      return;
    }

    const healthy = state.lastStatus !== "failed" || state.successCount > 0;
    res.writeHead(healthy ? 200 : 503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: healthy, config: { ...config, secret: config.secret ? "***" : "" }, state }));
  });

  server.listen(config.healthPort, "0.0.0.0", () => {
    log("log", "Health server listening.", { port: config.healthPort });
  });

  return server;
}

function shutdown(server) {
  if (state.stopping) return;
  state.stopping = true;
  log("log", "Stopping worker.");

  if (server) {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
    return;
  }

  process.exit(0);
}

async function runLoop() {
  if (state.stopping) return;
  await callCronEndpoint();
  if (!state.stopping) {
    setTimeout(runLoop, config.intervalMs).unref?.();
  }
}

validateUrl(config.targetUrl, "CRON_TARGET_URL");

log("log", "Starting cron worker.", {
  targetUrl: config.targetUrl,
  intervalMs: config.intervalMs,
  requestTimeoutMs: config.requestTimeoutMs,
  runOnStart: config.runOnStart,
  healthPort: config.healthPort,
  hasSecret: Boolean(config.secret),
});

const healthServer = startHealthServer();

if (config.runOnStart) {
  void runLoop();
} else {
  setTimeout(runLoop, config.intervalMs).unref?.();
}

process.on("SIGINT", () => shutdown(healthServer));
process.on("SIGTERM", () => shutdown(healthServer));
process.on("uncaughtException", (error) => {
  log("error", "Uncaught exception.", { error: error.message });
  shutdown(healthServer);
});
process.on("unhandledRejection", (reason) => {
  log("error", "Unhandled rejection.", { error: reason instanceof Error ? reason.message : String(reason) });
});
