import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureMasterDataSchema } from "@/lib/db/ensure-master-schema";

export async function GET(req: Request) {
  try {
    await ensureMasterDataSchema();
    const url = new URL(req.url);
    const verticalParam = url.searchParams.get("vertical"); // code or id

    let whereClause = "WHERE mt.is_active = TRUE";
    const params: any[] = [];

    if (verticalParam) {
      if (/^\d+$/.test(verticalParam)) {
        params.push(Number(verticalParam));
        whereClause += ` AND (v.id = $${params.length})`;
      } else {
        params.push(verticalParam.toLowerCase());
        whereClause += ` AND (LOWER(v.code) = $${params.length})`;
      }
    }

    const res = await db.query(`
      SELECT
        mt.id,
        mt.vertical_id,
        v.code AS vertical_code,
        v.name AS vertical_name,
        mt.code,
        mt.name,
        mt.description,
        mt.hierarchy_level,
        mt.parent_master_type_id,
        pmt.code AS parent_master_type_code,
        pmt.name AS parent_master_type_name,
        mt.icon,
        mt.is_hierarchical,
        mt.allow_multiple_parents,
        mt.is_active,
        mt.display_order,
        COUNT(r.id)::int AS records_count,
        COUNT(r.id) FILTER (WHERE r.status = 'active')::int AS active_records_count,
        COUNT(DISTINCT ma.id)::int AS attributes_count
      FROM master_types mt
      JOIN master_verticals v ON v.id = mt.vertical_id
      LEFT JOIN master_types pmt ON pmt.id = mt.parent_master_type_id
      LEFT JOIN master_records r ON r.master_type_id = mt.id AND r.status <> 'archived'
      LEFT JOIN master_attributes ma ON ma.master_type_id = mt.id AND ma.is_active = TRUE
      ${whereClause}
      GROUP BY mt.id, mt.vertical_id, v.code, v.name, mt.code, mt.name, mt.description, mt.hierarchy_level, mt.parent_master_type_id, pmt.code, pmt.name, mt.icon, mt.is_hierarchical, mt.allow_multiple_parents, mt.is_active, mt.display_order
      ORDER BY mt.vertical_id ASC, mt.hierarchy_level ASC, mt.display_order ASC, mt.id ASC;
    `, params);

    return NextResponse.json({
      success: true,
      data: res.rows,
    });
  } catch (err: any) {
    console.error("[Master Types GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch master types" }, { status: 500 });
  }
}
