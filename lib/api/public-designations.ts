import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";

function getPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function handlePublicDesignationsGet(req: Request) {
  const url = new URL(req.url);
  const page = getPositiveInt(url.searchParams.get("page"), 1);
  const limit = Math.min(getPositiveInt(url.searchParams.get("limit"), 10), 50);
  const offset = (page - 1) * limit;
  const search = url.searchParams.get("search")?.trim() || "";
  const numericSearch = /^\d+$/.test(search) ? Number(search) : null;

  const whereClause = `
    WHERE is_deleted = FALSE
      AND is_active = TRUE
      AND (
        $1 = ''
        OR ($2::int IS NOT NULL AND id = $2::int)
        OR (
          $2::int IS NULL
          AND (
            name ILIKE '%' || $1 || '%'
            OR slug ILIKE '%' || $1 || '%'
          )
        )
      )
  `;

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `
        SELECT id, name
        FROM designations
        ${whereClause}
        ORDER BY name ASC, id ASC
        LIMIT $3 OFFSET $4
      `,
      [search, numericSearch, limit, offset]
    ),
    db.query<{ count: number }>(
      `
        SELECT COUNT(*)::int AS count
        FROM designations
        ${whereClause}
      `,
      [search, numericSearch]
    ),
  ]);

  const total = Number(countResult.rows[0]?.count ?? 0);

  return NextResponse.json({
    data: dataResult.rows,
    pageCount: Math.ceil(total / limit),
    total,
  });
}
