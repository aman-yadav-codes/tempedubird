import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureMasterDataSchema } from "@/lib/db/ensure-master-schema";

export async function GET(req: Request) {
  try {
    await ensureMasterDataSchema();
    const user = await getAuthenticatedUser(req).catch(() => null);

    // Platform admin check or authorized staff
    const isAdmin = user ? isPlatformAdminUser(user) : false;

    const res = await db.query(`
      SELECT
        v.id,
        v.code,
        v.name,
        v.description,
        v.icon,
        v.display_order,
        v.is_active,
        COUNT(r.id)::int AS total_records,
        COUNT(r.id) FILTER (WHERE r.status = 'active')::int AS active_records,
        COUNT(r.id) FILTER (WHERE r.status = 'inactive')::int AS inactive_records,
        COUNT(DISTINCT mt.id)::int AS total_master_types,
        COUNT(r.id) FILTER (WHERE mt.is_hierarchical = TRUE AND mt.hierarchy_level = 1)::int AS categories_count,
        COUNT(r.id) FILTER (WHERE mt.is_hierarchical = TRUE AND mt.hierarchy_level = 2)::int AS subcategories_count,
        MAX(r.updated_at) AS last_record_updated_at
      FROM master_verticals v
      LEFT JOIN master_types mt ON mt.vertical_id = v.id AND mt.is_active = TRUE
      LEFT JOIN master_records r ON r.vertical_id = v.id AND r.status <> 'archived'
      GROUP BY v.id, v.code, v.name, v.description, v.icon, v.display_order, v.is_active
      ORDER BY v.display_order ASC, v.id ASC;
    `);

    return NextResponse.json({
      success: true,
      data: res.rows,
      isAdmin,
    });
  } catch (err: any) {
    console.error("[Master Verticals GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch master verticals" }, { status: 500 });
  }
}
