import { db } from "@/lib/db/db";

export type LiveChatSessionRow = {
  id: number;
  session_token: string;
  full_name: string;
  email: string;
  phone_number: string;
  whatsapp_number: string | null;
  status: "active" | "resolved" | "closed";
  unread_admin_count: number;
  unread_user_count: number;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  last_message_text?: string | null;
};

export type LiveChatMessageRow = {
  id: number;
  session_id: number;
  sender_type: "user" | "admin";
  sender_id: number | null;
  sender_name: string;
  message: string;
  created_at: string;
};

export async function ensureLiveChatTables(): Promise<void> {
  await db.query(`
    CREATE TABLE IF NOT EXISTS live_chat_sessions (
      id SERIAL PRIMARY KEY,
      session_token VARCHAR(64) UNIQUE NOT NULL,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      phone_number VARCHAR(50) NOT NULL,
      whatsapp_number VARCHAR(50) NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      unread_admin_count INT NOT NULL DEFAULT 0,
      unread_user_count INT NOT NULL DEFAULT 0,
      last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS live_chat_messages (
      id SERIAL PRIMARY KEY,
      session_id INT NOT NULL REFERENCES live_chat_sessions(id) ON DELETE CASCADE,
      sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'admin')),
      sender_id INT NULL REFERENCES users(id) ON DELETE SET NULL,
      sender_name VARCHAR(255) NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_live_chat_sessions_token ON live_chat_sessions(session_token);
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_live_chat_sessions_status ON live_chat_sessions(status);
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_live_chat_messages_session ON live_chat_messages(session_id);
  `);
}

export async function createOrGetLiveChatSession(input: {
  sessionToken: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  whatsappNumber?: string | null;
}): Promise<LiveChatSessionRow> {
  await ensureLiveChatTables();

  const existing = await db.query<LiveChatSessionRow>(
    `SELECT * FROM live_chat_sessions WHERE session_token = $1 LIMIT 1`,
    [input.sessionToken]
  );

  if (existing.rows.length > 0) {
    // Update contact info if provided
    const updateResult = await db.query<LiveChatSessionRow>(
      `
        UPDATE live_chat_sessions
        SET full_name = $1,
            email = $2,
            phone_number = $3,
            whatsapp_number = $4,
            updated_at = NOW()
        WHERE session_token = $5
        RETURNING *
      `,
      [
        input.fullName,
        input.email,
        input.phoneNumber,
        input.whatsappNumber || null,
        input.sessionToken,
      ]
    );
    return updateResult.rows[0];
  }

  const insertResult = await db.query<LiveChatSessionRow>(
    `
      INSERT INTO live_chat_sessions (
        session_token, full_name, email, phone_number, whatsapp_number, status
      )
      VALUES ($1, $2, $3, $4, $5, 'active')
      RETURNING *
    `,
    [
      input.sessionToken,
      input.fullName,
      input.email,
      input.phoneNumber,
      input.whatsappNumber || null,
    ]
  );

  return insertResult.rows[0];
}

export async function getLiveChatSessionByToken(sessionToken: string): Promise<LiveChatSessionRow | null> {
  await ensureLiveChatTables();
  const result = await db.query<LiveChatSessionRow>(
    `SELECT * FROM live_chat_sessions WHERE session_token = $1 LIMIT 1`,
    [sessionToken]
  );
  return result.rows[0] ?? null;
}

export async function getLiveChatSessionById(sessionId: number): Promise<LiveChatSessionRow | null> {
  await ensureLiveChatTables();
  const result = await db.query<LiveChatSessionRow>(
    `SELECT * FROM live_chat_sessions WHERE id = $1 LIMIT 1`,
    [sessionId]
  );
  return result.rows[0] ?? null;
}

export async function getLiveChatMessages(
  sessionId: number,
  afterId?: number
): Promise<LiveChatMessageRow[]> {
  await ensureLiveChatTables();

  let query = `SELECT * FROM live_chat_messages WHERE session_id = $1`;
  const params: unknown[] = [sessionId];

  if (afterId && afterId > 0) {
    params.push(afterId);
    query += ` AND id > $2`;
  }

  query += ` ORDER BY id ASC`;

  const result = await db.query<LiveChatMessageRow>(query, params);
  return result.rows;
}

export async function addLiveChatMessage(input: {
  sessionId: number;
  senderType: "user" | "admin";
  senderId?: number | null;
  senderName: string;
  message: string;
}): Promise<LiveChatMessageRow> {
  await ensureLiveChatTables();

  const msgResult = await db.query<LiveChatMessageRow>(
    `
      INSERT INTO live_chat_messages (session_id, sender_type, sender_id, sender_name, message)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [
      input.sessionId,
      input.senderType,
      input.senderId ?? null,
      input.senderName,
      input.message.trim(),
    ]
  );

  // Update session counters and status
  if (input.senderType === "user") {
    await db.query(
      `
        UPDATE live_chat_sessions
        SET last_message_at = NOW(),
            updated_at = NOW(),
            unread_admin_count = unread_admin_count + 1,
            status = CASE WHEN status = 'closed' THEN 'active' ELSE status END
        WHERE id = $1
      `,
      [input.sessionId]
    );
  } else {
    await db.query(
      `
        UPDATE live_chat_sessions
        SET last_message_at = NOW(),
            updated_at = NOW(),
            unread_user_count = unread_user_count + 1
        WHERE id = $1
      `,
      [input.sessionId]
    );
  }

  return msgResult.rows[0];
}

export async function markLiveChatReadByUser(sessionId: number): Promise<void> {
  await ensureLiveChatTables();
  await db.query(
    `UPDATE live_chat_sessions SET unread_user_count = 0 WHERE id = $1`,
    [sessionId]
  );
}

export async function markLiveChatReadByAdmin(sessionId: number): Promise<void> {
  await ensureLiveChatTables();
  await db.query(
    `UPDATE live_chat_sessions SET unread_admin_count = 0 WHERE id = $1`,
    [sessionId]
  );
}

export async function listLiveChatSessions(options: {
  search?: string;
  status?: string;
  limit?: number;
  offset?: number;
}): Promise<{ sessions: LiveChatSessionRow[]; total: number }> {
  await ensureLiveChatTables();

  const limit = Math.min(options.limit ?? 20, 50);
  const offset = options.offset ?? 0;
  const where: string[] = [];
  const params: unknown[] = [];

  if (options.status && options.status !== "all") {
    params.push(options.status);
    where.push(`s.status = $${params.length}`);
  }

  if (options.search && options.search.trim()) {
    params.push(`%${options.search.trim()}%`);
    const pIdx = params.length;
    where.push(
      `(s.full_name ILIKE $${pIdx} OR s.email ILIKE $${pIdx} OR s.phone_number ILIKE $${pIdx} OR s.whatsapp_number ILIKE $${pIdx})`
    );
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";

  const countQuery = `SELECT COUNT(*) FROM live_chat_sessions s ${whereSql}`;
  const countRes = await db.query<{ count: string }>(countQuery, params);
  const total = parseInt(countRes.rows[0]?.count ?? "0", 10);

  const dataQuery = `
    SELECT 
      s.*,
      (
        SELECT m.message 
        FROM live_chat_messages m 
        WHERE m.session_id = s.id 
        ORDER BY m.id DESC 
        LIMIT 1
      ) AS last_message_text
    FROM live_chat_sessions s
    ${whereSql}
    ORDER BY s.last_message_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;

  const dataRes = await db.query<LiveChatSessionRow>(dataQuery, params);
  return { sessions: dataRes.rows, total };
}

export async function updateLiveChatSessionStatus(
  sessionId: number,
  status: "active" | "resolved" | "closed"
): Promise<LiveChatSessionRow | null> {
  await ensureLiveChatTables();

  const res = await db.query<LiveChatSessionRow>(
    `
      UPDATE live_chat_sessions
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `,
    [status, sessionId]
  );

  return res.rows[0] ?? null;
}
