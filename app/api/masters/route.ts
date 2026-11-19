import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";
import { ensureMasterDataSchema } from "@/lib/db/ensure-master-schema";

/**
 * Universal Master Data API for Business Owners, Public Forms, and Dynamic Dropdowns
 *
 * Examples:
 * GET /api/masters?vertical=vehicles&type=vehicle_brands
 * GET /api/masters?vertical=vehicles&type=vehicle_models&parentId=12
 * GET /api/masters?vertical=restaurants&type=dishes&parentId=5
 * GET /api/masters?vertical=properties&type=amenities
 * GET /api/masters?vertical=healthcare&type=medical_specialties
 */
export async function GET(req: Request) {
  try {
    await ensureMasterDataSchema();
    const url = new URL(req.url);

    const vertical = url.searchParams.get("vertical")?.trim();
    const type = url.searchParams.get("type")?.trim();
    const parentId = url.searchParams.get("parentId") || url.searchParams.get("parent_id");
    const search = url.searchParams.get("search")?.trim();
    const includeInactive = url.searchParams.get("includeInactive") === "true";
    const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 100)));

    const conditions: string[] = ["r.status <> 'archived'"];
    if (!includeInactive) {
      conditions.push("r.status = 'active'");
    }
    const params: any[] = [];

    if (vertical) {
      if (/^\d+$/.test(vertical)) {
        params.push(Number(vertical));
        conditions.push(`r.vertical_id = $${params.length}`);
      } else {
        params.push(vertical.toLowerCase());
        conditions.push(`LOWER(v.code) = $${params.length}`);
      }
    }

    if (type) {
      if (/^\d+$/.test(type)) {
        params.push(Number(type));
        conditions.push(`r.master_type_id = $${params.length}`);
      } else {
        params.push(type.toLowerCase());
        conditions.push(`LOWER(mt.code) = $${params.length}`);
      }
    }

    if (parentId !== null && parentId !== undefined && parentId !== "") {
      if (parentId === "null" || parentId === "0") {
        conditions.push(`r.parent_id IS NULL`);
      } else if (/^\d+$/.test(parentId)) {
        params.push(Number(parentId));
        conditions.push(`(r.parent_id = $${params.length} OR EXISTS (SELECT 1 FROM master_record_relationships rel WHERE rel.record_id = r.id AND rel.related_record_id = $${params.length}))`);
      }
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(r.name ILIKE $${params.length} OR r.code ILIKE $${params.length})`);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    params.push(limit);
    const res = await db.query(`
      SELECT
        r.id,
        r.vertical_id,
        v.code AS vertical_code,
        r.master_type_id,
        mt.code AS master_type_code,
        mt.name AS master_type_name,
        r.parent_id,
        r.code,
        r.name,
        r.slug,
        r.description,
        r.image_url,
        r.icon,
        r.display_order,
        r.status,
        r.metadata,
        COALESCE(
          (
            SELECT json_object_agg(a.name, COALESCE(av.value_text, av.value_number::text, av.value_boolean::text, av.value_json::text))
            FROM master_record_attribute_values av
            JOIN master_attributes a ON a.id = av.attribute_id
            WHERE av.record_id = r.id
          ),
          '{}'::json
        ) AS attributes
      FROM master_records r
      JOIN master_verticals v ON v.id = r.vertical_id
      JOIN master_types mt ON mt.id = r.master_type_id
      ${whereSql}
      ORDER BY r.display_order ASC, r.name ASC
      LIMIT $${params.length};
    `, params);

    return NextResponse.json({
      success: true,
      count: res.rows.length,
      data: res.rows,
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    });
  } catch (err: any) {
    console.error("[Public Master Data GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch master data" }, { status: 500 });
  }
}
