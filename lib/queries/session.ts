// /lib/queries/session.ts
import type { QueryResultRow } from "pg";

type Queryable = {
  query: <T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: readonly unknown[]
  ) => Promise<{ rows: T[] }>;
};

type SessionRow = QueryResultRow & {
  id: string;
  user_id: number;
  user_agent: string | null;
  ip_address: string | null;
  expires_at: string | Date | null;
  created_at: string | Date | null;
};

export const insertSession = async (
  db: Queryable,
  id: string,
  userId: number,
  userAgent: string,
  ip: string
) => {
  const days = parseInt(process.env.REFRESH_TOKEN_EXPIRES_IN_DAYS || '7', 10);
  return db.query(
    `INSERT INTO sessions (id, user_id, user_agent, ip_address, expires_at)
     VALUES ($1,$2,$3,$4, NOW() + INTERVAL '1 day' * $5)`,
    [id, userId, userAgent, ip, days]
  );
};

export const getSessionById = async (db: Queryable, id: string) => {
  const res = await db.query<SessionRow>(
    `SELECT id, user_id, user_agent, ip_address, expires_at, created_at FROM sessions WHERE id = $1 LIMIT 1`,
    [id]
  );
  return res.rows[0] || null;
};

export const deleteSessionById = async (db: Queryable, id: string) => {
  return db.query(
    `DELETE FROM sessions WHERE id = $1`,
    [id]
  );
};
