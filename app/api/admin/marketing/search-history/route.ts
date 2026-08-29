import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureFeatureSchema } from "@/lib/db/ensure-feature-schema";

export async function GET(req: Request) {
  try {
    await ensureFeatureSchema();
    const user = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const search = url.searchParams.get("search")?.trim() || "";
    const entityType = url.searchParams.get("type") || "all";
    const limit = Math.min(Number(url.searchParams.get("limit") || 50), 200);
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const offset = (page - 1) * limit;

    const whereClauses: string[] = ["1=1"];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      whereClauses.push(`(
        ush.query ILIKE $${params.length} 
        OR ush.category ILIKE $${params.length} 
        OR u.full_name ILIKE $${params.length} 
        OR u.email ILIKE $${params.length} 
        OR u.phone ILIKE $${params.length}
      )`);
    }

    if (entityType && entityType !== "all") {
      params.push(entityType);
      whereClauses.push(`ush.entity_type = $${params.length}`);
    }

    const whereSql = `WHERE ${whereClauses.join(" AND ")}`;

    const countRes = await db.query(
      `
      SELECT COUNT(*)::int AS total
      FROM user_search_history ush
      LEFT JOIN users u ON u.id = ush.user_id
      ${whereSql}
      `,
      params
    );

    const total = Number(countRes.rows[0]?.total || 0);

    const dataQuery = `
      SELECT 
        ush.id,
        ush.query,
        ush.entity_type,
        ush.category,
        ush.results_count,
        ush.metadata,
        ush.created_at,
        ush.user_id,
        COALESCE(u.full_name, 'Visitor / Guest') AS user_name,
        COALESCE(u.email, '') AS user_email,
        COALESCE(u.phone, '') AS user_phone,
        (
          SELECT r.code 
          FROM user_roles ur 
          JOIN roles r ON r.id = ur.role_id 
          WHERE ur.user_id = u.id 
          LIMIT 1
        ) AS user_role
      FROM user_search_history ush
      LEFT JOIN users u ON u.id = ush.user_id
      ${whereSql}
      ORDER BY ush.id DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const dataRes = await db.query(dataQuery, params);

    return NextResponse.json({
      success: true,
      total,
      page,
      pageCount: Math.max(1, Math.ceil(total / limit)),
      history: dataRes.rows,
    });
  } catch (error: any) {
    console.error("[Admin Search History GET] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch platform search history" }, { status: 500 });
  }
}
