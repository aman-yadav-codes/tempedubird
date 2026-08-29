import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function POST(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthUser(req);
    const body = await req.json();

    const query = String(body.query || body.search || "").trim();
    if (!query) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    const entityType = String(body.entity_type || body.type || "general").trim();
    const category = body.category ? String(body.category).trim() : null;
    const resultsCount = Number(body.results_count || body.count || 0);
    const metadata = body.metadata || {};

    const insertRes = await db.query(
      `
      INSERT INTO user_search_history (user_id, query, entity_type, category, results_count, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *
      `,
      [user?.id || null, query, entityType, category, resultsCount, JSON.stringify(metadata)]
    );

    return NextResponse.json({
      success: true,
      search: insertRes.rows[0],
    });
  } catch (error: any) {
    console.error("[Public Search History POST] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to record search" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthUser(req);
    const url = new URL(req.url);
    const limit = Math.min(Number(url.searchParams.get("limit") || 10), 50);

    let query = `
      SELECT id, query, entity_type, category, results_count, created_at
      FROM user_search_history
    `;
    const params: any[] = [];

    if (user?.id) {
      params.push(user.id);
      query += ` WHERE user_id = $1`;
    }

    query += ` ORDER BY id DESC LIMIT ${limit}`;

    const res = await db.query(query, params);

    return NextResponse.json({
      success: true,
      history: res.rows,
    });
  } catch (error: any) {
    console.error("[Public Search History GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch search history" }, { status: 500 });
  }
}
