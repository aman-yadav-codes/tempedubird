import { db } from "@/lib/db/db";

type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<unknown>;
};

export async function ensureUserPasswordsTable(client: Queryable = db) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS user_generated_passwords (
      id SERIAL PRIMARY KEY,
      user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      email TEXT,
      plain_password TEXT NOT NULL,
      updated_by TEXT DEFAULT 'signup',
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function saveUserPlainPassword(
  client: Queryable,
  userId: number,
  plainPassword: string,
  email?: string | null,
  updatedBy: string = "signup"
) {
  if (!userId || !plainPassword) return;
  await ensureUserPasswordsTable(client);
  await client.query(
    `
      INSERT INTO user_generated_passwords (user_id, email, plain_password, updated_by, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (user_id)
      DO UPDATE SET
        plain_password = EXCLUDED.plain_password,
        email = COALESCE(EXCLUDED.email, user_generated_passwords.email),
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
    `,
    [userId, email ?? null, plainPassword, updatedBy]
  );
}

export async function getUserPlainPassword(
  client: Queryable,
  userId: number
): Promise<string | null> {
  await ensureUserPasswordsTable(client);
  const res = (await client.query(
    `SELECT plain_password FROM user_generated_passwords WHERE user_id = $1 LIMIT 1`,
    [userId]
  )) as { rows: { plain_password: string }[] };
  return res.rows[0]?.plain_password ?? null;
}
