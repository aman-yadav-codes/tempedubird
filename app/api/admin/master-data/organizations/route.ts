import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

function getInt(value: string | null, fallback: number) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);

    const url = new URL(req.url);
    const page = getInt(url.searchParams.get("page"), 1);
    const limit = getInt(url.searchParams.get("limit"), 10);
    const offset = (page - 1) * limit;

    const search = url.searchParams.get("search")?.trim() || "";
    const type = url.searchParams.get("type")?.trim() || "";

    // If they strictly want companies, we don't have them anymore. Return empty.
    if (type === "company") {
      return NextResponse.json({
        data: [],
        pageCount: 0,
        total: 0,
      });
    }

    // Otherwise search active institution profiles only
    const where: string[] = ["is_deleted = false", "is_active = true"];
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      where.push(`(name ILIKE $${params.length} OR slug ILIKE $${params.length})`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const countResult = await db.query<{ total: string }>(
      `SELECT COUNT(*)::int AS total FROM institution_profiles ${whereSql}`,
      params
    );

    const total = Number(countResult.rows[0]?.total ?? 0);

    const dataResult = await db.query(
      `
      SELECT
        id,
        name,
        slug,
        'institution' AS type,
        'approved' AS status,
        is_active,
        created_at,
        created_at AS reviewed_at,
        null AS rejection_reason
      FROM institution_profiles
      ${whereSql}
      ORDER BY name ASC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
      `,
      [...params, limit, offset]
    );

    return NextResponse.json({
      data: dataResult.rows,
      pageCount: Math.ceil(total / limit),
      total,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  return NextResponse.json(
    { error: "Creation of organizations is deprecated. Please manage institutions directly." },
    { status: 405 }
  );
}