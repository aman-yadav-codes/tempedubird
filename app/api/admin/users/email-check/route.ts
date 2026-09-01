import { NextResponse } from "next/server";

import { db } from "@/lib/db/db";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const email = url.searchParams.get("email")?.trim().toLowerCase() ?? "";
    const excludeUserIdValue = url.searchParams.get("excludeUserId");
    const excludeUserId = excludeUserIdValue ? Number(excludeUserIdValue) : null;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { exists: false },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const params: unknown[] = [email];
    let excludeSql = "";
    if (Number.isInteger(excludeUserId) && Number(excludeUserId) > 0) {
      params.push(excludeUserId);
      excludeSql = `AND u.id <> $${params.length}::integer`;
    }

    const result = await db.query<{ id: number; full_name: string; phone: string | null; avatar_url: string | null }>(
      `
        SELECT u.id, u.full_name, u.phone, u.avatar_url
        FROM users u
        WHERE lower(u.email) = lower($1::text)
          AND COALESCE(u.is_deleted, FALSE) = FALSE
          ${excludeSql}
        LIMIT 1
      `,
      params
    );

    const existingUser = result.rows[0] || null;

    return NextResponse.json(
      {
        exists: Boolean(existingUser),
        user: existingUser,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
