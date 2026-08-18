import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
    const limit = Math.max(1, Number(url.searchParams.get("limit")) || 20);
    const offset = (page - 1) * limit;

    const result = await db.query(
      `
        SELECT
          child.id,
          child.name,
          child.slug,
          child.parent_id,
          parent.name AS parent_name,
          child.depth,
          CONCAT(parent.name, ' -> ', child.name) AS breadcrumb
        FROM categories child
        INNER JOIN categories parent ON parent.id = child.parent_id
        WHERE child.is_deleted = FALSE
          AND child.is_active = TRUE
          AND child.depth = 2
          AND (
            $1 = ''
            OR child.name ILIKE '%' || $1 || '%'
            OR parent.name ILIKE '%' || $1 || '%'
            OR child.slug ILIKE '%' || $1 || '%'
          )
        ORDER BY parent.name ASC, child.name ASC
        LIMIT $2 OFFSET $3
      `,
      [search, limit, offset]
    );

    return NextResponse.json({
      data: result.rows,
      pageCount: result.rows.length < limit ? page : page + 1,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    const status = message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}
