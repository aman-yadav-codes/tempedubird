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

    const result = await db.query<{ exists: boolean }>(
      `
        SELECT EXISTS (
          SELECT 1
          FROM users u
          WHERE lower(u.email) = lower($1::text)
            AND COALESCE(u.is_deleted, FALSE) = FALSE
            ${excludeSql}
        ) AS exists
      `,
      params
    );

    return NextResponse.json(
      { exists: Boolean(result.rows[0]?.exists) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
