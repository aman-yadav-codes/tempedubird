import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

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

function parseOrigins(value) {
  return String(value || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const config = {
  host: process.env.SOCKET_HOST || "0.0.0.0",
  port: parsePositiveInteger(process.env.SOCKET_PORT, 3040, 1),
  path: process.env.SOCKET_PATH || "/socket.io",
  corsOrigins: parseOrigins(process.env.SOCKET_CORS_ORIGINS || "http://localhost:3000"),
  jwtSecret: process.env.JWT_SECRET || "",
  internalSecret: process.env.SOCKET_INTERNAL_SECRET || "",
  redisUrl: process.env.REDIS_URL || "",
};

const state = {
  startedAt: new Date().toISOString(),
  connectedSockets: 0,
  connectedUsers: new Map(),
  publishedCount: 0,
  rejectedPublishCount: 0,
  lastPublishedAt: null,
  redisConnected: false,
};

function log(level, message, details = undefined) {
  const payload = details ? ` ${JSON.stringify(details)}` : "";
  console[level](`[${new Date().toISOString()}] [edubird-socket-server] ${message}${payload}`);
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(body));
}

function readJson(req, limitBytes = 128 * 1024) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (Buffer.byteLength(body) > limitBytes) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");
  return scheme?.toLowerCase() === "bearer" ? token : "";
}

function getUserIdFromToken(token) {
  if (!config.jwtSecret) throw new Error("JWT_SECRET is not configured");
  const decoded = jwt.verify(token, config.jwtSecret);
  const userId = Number(decoded?.id ?? decoded?.sub);
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Invalid user token");
  }
  if (decoded?.typ && decoded.typ !== "access") {
    throw new Error("Invalid token type");
  }
  return userId;
}

function normalizeRecipientIds(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map(Number)
        .filter((id) => Number.isInteger(id) && id > 0)
    )
  );
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");

    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        startedAt: state.startedAt,
        connectedSockets: state.connectedSockets,
        connectedUsers: state.connectedUsers.size,
        publishedCount: state.publishedCount,
        rejectedPublishCount: state.rejectedPublishCount,
        lastPublishedAt: state.lastPublishedAt,
        redisConnected: state.redisConnected,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/internal/notifications/publish") {
      const token = getBearerToken(req);
      if (!config.internalSecret || token !== config.internalSecret) {
        state.rejectedPublishCount += 1;
        sendJson(res, 401, { error: "Unauthorized" });
        return;
      }

      const body = await readJson(req);
      const recipientIds = normalizeRecipientIds(body?.recipientIds);
      if (!recipientIds.length || !body?.notification) {
        sendJson(res, 422, { error: "recipientIds and notification are required" });
        return;
      }

      const eventPayload = {
        notification: body.notification,
        unreadCount: Number.isInteger(Number(body.unreadCount)) ? Number(body.unreadCount) : undefined,
        publishedAt: new Date().toISOString(),
      };

      for (const userId of recipientIds) {
        io.to(`user:${userId}`).emit("notification:new", eventPayload);
      }

      state.publishedCount += 1;
      state.lastPublishedAt = eventPayload.publishedAt;
      sendJson(res, 202, { ok: true, recipientCount: recipientIds.length });
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (error) {
    sendJson(res, 500, { error: error instanceof Error ? error.message : "Server error" });
  }
});

const io = new Server(server, {
  path: config.path,
  cors: {
    origin: config.corsOrigins,
    credentials: true,
  },
});

io.use((socket, next) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      String(socket.handshake.headers.authorization || "").split(" ").pop();
    if (!token) throw new Error("Missing auth token");

    const userId = getUserIdFromToken(token);
    socket.data.userId = userId;
    next();
  } catch (error) {
    next(error instanceof Error ? error : new Error("Unauthorized"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.data.userId;
  socket.join(`user:${userId}`);

  state.connectedSockets += 1;
  state.connectedUsers.set(userId, (state.connectedUsers.get(userId) || 0) + 1);

  socket.emit("socket:ready", {
    userId,
    connectedAt: new Date().toISOString(),
  });

  socket.on("disconnect", () => {
    state.connectedSockets = Math.max(0, state.connectedSockets - 1);
    const count = state.connectedUsers.get(userId) || 0;
    if (count <= 1) {
      state.connectedUsers.delete(userId);
    } else {
      state.connectedUsers.set(userId, count - 1);
    }
  });
});

async function enableRedisAdapter() {
  if (!config.redisUrl) return;

  const pubClient = createClient({ url: config.redisUrl });
  const subClient = pubClient.duplicate();

  pubClient.on("error", (error) => log("warn", "Redis publisher error.", { error: error.message }));
  subClient.on("error", (error) => log("warn", "Redis subscriber error.", { error: error.message }));

  await Promise.all([pubClient.connect(), subClient.connect()]);
  io.adapter(createAdapter(pubClient, subClient));
  state.redisConnected = true;
  log("log", "Redis adapter enabled.");
}

if (!config.jwtSecret) {
  log("warn", "JWT_SECRET is missing. Socket auth will reject clients.");
}
if (!config.internalSecret) {
  log("warn", "SOCKET_INTERNAL_SECRET is missing. Internal publish endpoint will reject requests.");
}

await enableRedisAdapter();

server.listen(config.port, config.host, () => {
  log("log", "Socket server listening.", {
    host: config.host,
    port: config.port,
    path: config.path,
    corsOrigins: config.corsOrigins,
    redisEnabled: Boolean(config.redisUrl),
  });
});

function shutdown(signal) {
  log("log", `Received ${signal}; shutting down.`);
  io.close(() => {
    server.close(() => process.exit(0));
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
