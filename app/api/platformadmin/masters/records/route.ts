import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureMasterDataSchema } from "@/lib/db/ensure-master-schema";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/--+/g, "-")
    .trim();
}

export async function GET(req: Request) {
  try {
    await ensureMasterDataSchema();
    const url = new URL(req.url);

    const verticalParam = url.searchParams.get("vertical");
    const typeParam = url.searchParams.get("type");
    const parentIdParam = url.searchParams.get("parentId") || url.searchParams.get("parent_id");
    const search = url.searchParams.get("search")?.trim() || "";
    const status = url.searchParams.get("status") || "all";
    const page = Math.max(1, Number(url.searchParams.get("page") || 1));
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 50)));
    const offset = (page - 1) * limit;
    const sortBy = url.searchParams.get("sortBy") || "display_order";
    const sortOrder = url.searchParams.get("sortOrder")?.toUpperCase() === "DESC" ? "DESC" : "ASC";

    const conditions: string[] = ["r.status <> 'archived'"];
    const params: any[] = [];

    if (verticalParam) {
      if (/^\d+$/.test(verticalParam)) {
        params.push(Number(verticalParam));
        conditions.push(`r.vertical_id = $${params.length}`);
      } else {
        params.push(verticalParam.toLowerCase());
        conditions.push(`LOWER(v.code) = $${params.length}`);
      }
    }

    if (typeParam) {
      if (/^\d+$/.test(typeParam)) {
        params.push(Number(typeParam));
        conditions.push(`r.master_type_id = $${params.length}`);
      } else {
        params.push(typeParam.toLowerCase());
        conditions.push(`LOWER(mt.code) = $${params.length}`);
      }
    }

    if (parentIdParam !== null && parentIdParam !== undefined && parentIdParam !== "") {
      if (parentIdParam === "null" || parentIdParam === "0") {
        conditions.push(`r.parent_id IS NULL`);
      } else if (/^\d+$/.test(parentIdParam)) {
        params.push(Number(parentIdParam));
        conditions.push(`r.parent_id = $${params.length}`);
      }
    }

    if (status && status !== "all") {
      params.push(status);
      conditions.push(`r.status = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(r.name ILIKE $${params.length} OR r.code ILIKE $${params.length} OR r.description ILIKE $${params.length})`);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Count total
    const countRes = await db.query(`
      SELECT COUNT(*)::int AS total
      FROM master_records r
      JOIN master_verticals v ON v.id = r.vertical_id
      JOIN master_types mt ON mt.id = r.master_type_id
      ${whereSql}
    `, params);
    const total = countRes.rows[0]?.total || 0;

    // Allowed sort columns
    const allowedSorts = ["id", "name", "display_order", "created_at", "updated_at", "status"];
    const validSort = allowedSorts.includes(sortBy) ? `r.${sortBy}` : "r.display_order";

    params.push(limit, offset);
    const recordsRes = await db.query(`
      SELECT
        r.id,
        r.vertical_id,
        v.code AS vertical_code,
        v.name AS vertical_name,
        r.master_type_id,
        mt.code AS master_type_code,
        mt.name AS master_type_name,
        mt.hierarchy_level,
        r.parent_id,
        p.name AS parent_name,
        r.code,
        r.name,
        r.slug,
        r.description,
        r.image_url,
        r.icon,
        r.display_order,
        r.status,
        r.is_system,
        r.metadata,
        r.created_by,
        r.updated_by,
        r.created_at,
        r.updated_at,
        (SELECT COUNT(*)::int FROM master_records child WHERE child.parent_id = r.id AND child.status <> 'archived') AS children_count,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'attribute_id', a.id,
              'name', a.name,
              'label', a.label,
              'field_type', a.field_type,
              'value_text', av.value_text,
              'value_number', av.value_number,
              'value_boolean', av.value_boolean,
              'value_json', av.value_json
            ))
            FROM master_record_attribute_values av
            JOIN master_attributes a ON a.id = av.attribute_id
            WHERE av.record_id = r.id
          ),
          '[]'::json
        ) AS attribute_values,
        COALESCE(
          (
            SELECT json_agg(json_build_object(
              'id', rel_rec.id,
              'name', rel_rec.name,
              'master_type_name', rel_mt.name,
              'relationship_type', rel.relationship_type
            ))
            FROM master_record_relationships rel
            JOIN master_records rel_rec ON rel_rec.id = rel.related_record_id
            JOIN master_types rel_mt ON rel_mt.id = rel_rec.master_type_id
            WHERE rel.record_id = r.id
          ),
          '[]'::json
        ) AS related_records
      FROM master_records r
      JOIN master_verticals v ON v.id = r.vertical_id
      JOIN master_types mt ON mt.id = r.master_type_id
      LEFT JOIN master_records p ON p.id = r.parent_id
      ${whereSql}
      ORDER BY ${validSort} ${sortOrder}, r.id ASC
      LIMIT $${params.length - 1} OFFSET $${params.length};
    `, params);

    return NextResponse.json({
      success: true,
      data: recordsRes.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error("[Master Records GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch master records" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    await ensureMasterDataSchema();
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized. Platform Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const {
      vertical_id,
      master_type_id,
      parent_id,
      name,
      code,
      description,
      image_url,
      icon,
      display_order,
      status = "active",
      metadata = {},
      custom_attributes = {}, // { [attribute_id]: value }
      related_record_ids = [], // Array of related record IDs for M:N relationships
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (!master_type_id) {
      return NextResponse.json({ error: "Master type ID is required" }, { status: 400 });
    }

    // Resolve vertical_id from master_types if not provided
    let finalVerticalId = vertical_id;
    if (!finalVerticalId) {
      const mtRow = await db.query(`SELECT vertical_id FROM master_types WHERE id = $1 LIMIT 1`, [master_type_id]);
      if (mtRow.rows.length === 0) {
        return NextResponse.json({ error: "Invalid master type ID" }, { status: 400 });
      }
      finalVerticalId = mtRow.rows[0].vertical_id;
    }

    const cleanName = name.trim();
    let cleanSlug = body.slug ? slugify(String(body.slug)) : slugify(cleanName);
    if (!cleanSlug) cleanSlug = `record-${Date.now().toString().slice(-4)}`;

    // Ensure slug uniqueness within master_type_id
    const slugCheck = await db.query(
      `SELECT id FROM master_records WHERE master_type_id = $1 AND slug = $2 LIMIT 1`,
      [master_type_id, cleanSlug]
    );
    if (slugCheck.rows.length > 0) {
      cleanSlug = `${cleanSlug}-${Date.now().toString().slice(-4)}`;
    }

    // Safe sequence check
    await db.query(`SELECT setval(pg_get_serial_sequence('master_records', 'id'), COALESCE((SELECT MAX(id) FROM master_records), 1), true)`);

    const insertRes = await db.query(`
      INSERT INTO master_records (
        vertical_id,
        master_type_id,
        parent_id,
        code,
        name,
        slug,
        description,
        image_url,
        icon,
        display_order,
        status,
        metadata,
        created_by,
        updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $13)
      RETURNING *;
    `, [
      finalVerticalId,
      master_type_id,
      parent_id || null,
      code ? String(code).trim() : cleanSlug,
      cleanName,
      cleanSlug,
      description || null,
      image_url || null,
      icon || null,
      display_order !== undefined ? Number(display_order) : 0,
      status || "active",
      JSON.stringify(metadata || {}),
      user.id,
    ]);

    const newRecord = insertRes.rows[0];

    // Handle Custom Attributes
    if (custom_attributes && typeof custom_attributes === "object") {
      for (const [attrId, val] of Object.entries(custom_attributes)) {
        if (!isNaN(Number(attrId)) && val !== undefined && val !== null && val !== "") {
          const numVal = !isNaN(Number(val)) && typeof val !== "boolean" ? Number(val) : null;
          const boolVal = typeof val === "boolean" ? val : null;
          const textVal = typeof val === "string" ? val : (typeof val === "object" ? JSON.stringify(val) : String(val));
          const jsonVal = typeof val === "object" ? JSON.stringify(val) : null;

          await db.query(`
            INSERT INTO master_record_attribute_values (record_id, attribute_id, value_text, value_number, value_boolean, value_json)
            VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (record_id, attribute_id) DO UPDATE
            SET value_text = EXCLUDED.value_text,
                value_number = EXCLUDED.value_number,
                value_boolean = EXCLUDED.value_boolean,
                value_json = EXCLUDED.value_json,
                updated_at = NOW();
          `, [newRecord.id, Number(attrId), textVal, numVal, boolVal, jsonVal]);
        }
      }
    }

    // Handle Many-to-Many Relationships
    if (Array.isArray(related_record_ids) && related_record_ids.length > 0) {
      for (const relId of related_record_ids) {
        if (relId && !isNaN(Number(relId))) {
          await db.query(`
            INSERT INTO master_record_relationships (record_id, related_record_id, relationship_type)
            VALUES ($1, $2, 'belongs_to')
            ON CONFLICT DO NOTHING;
          `, [newRecord.id, Number(relId)]);
        }
      }
    }

    // Audit Log
    await db.query(`
      INSERT INTO master_audit_logs (vertical_id, master_type_id, record_id, record_name, action, changed_fields, performed_by, performed_by_name)
      VALUES ($1, $2, $3, $4, 'create', $5, $6, $7);
    `, [
      finalVerticalId,
      master_type_id,
      newRecord.id,
      newRecord.name,
      JSON.stringify(body),
      user.id,
      user.full_name || user.email || `User #${user.id}`,
    ]);

    return NextResponse.json({
      success: true,
      data: newRecord,
      message: "Master record created successfully",
    }, { status: 201 });
  } catch (err: any) {
    console.error("[Master Records POST] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to create master record" }, { status: 500 });
  }
}
