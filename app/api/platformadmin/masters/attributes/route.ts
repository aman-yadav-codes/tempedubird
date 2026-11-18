import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureMasterDataSchema } from "@/lib/db/ensure-master-schema";

export async function GET(req: Request) {
  try {
    await ensureMasterDataSchema();
    const url = new URL(req.url);
    const typeId = url.searchParams.get("master_type_id") || url.searchParams.get("typeId");
    const verticalId = url.searchParams.get("vertical_id") || url.searchParams.get("verticalId");

    const conditions: string[] = ["a.is_active = TRUE"];
    const params: any[] = [];

    if (typeId && /^\d+$/.test(typeId)) {
      params.push(Number(typeId));
      conditions.push(`a.master_type_id = $${params.length}`);
    }

    if (verticalId && /^\d+$/.test(verticalId)) {
      params.push(Number(verticalId));
      conditions.push(`a.vertical_id = $${params.length}`);
    }

    const whereSql = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const res = await db.query(`
      SELECT
        a.*,
        mt.name AS master_type_name,
        mt.code AS master_type_code,
        v.name AS vertical_name
      FROM master_attributes a
      JOIN master_verticals v ON v.id = a.vertical_id
      LEFT JOIN master_types mt ON mt.id = a.master_type_id
      ${whereSql}
      ORDER BY a.display_order ASC, a.id ASC;
    `, params);

    return NextResponse.json({
      success: true,
      data: res.rows,
    });
  } catch (err: any) {
    console.error("[Master Attributes GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch attributes" }, { status: 500 });
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
      id,
      vertical_id,
      master_type_id,
      name,
      label,
      field_type,
      placeholder,
      options = [],
      is_required = false,
      validation_rules = {},
      display_order = 0,
      is_active = true,
    } = body;

    if (!label || !field_type) {
      return NextResponse.json({ error: "Label and field_type are required" }, { status: 400 });
    }

    const rawName = name ? String(name).trim() : label.toLowerCase().replace(/[^\w]/g, "_");
    const cleanName = rawName.replace(/_+/g, "_").slice(0, 80);

    // Ensure vertical_id
    let finalVerticalId = vertical_id;
    if (!finalVerticalId && master_type_id) {
      const mt = await db.query(`SELECT vertical_id FROM master_types WHERE id = $1 LIMIT 1`, [master_type_id]);
      if (mt.rows.length > 0) finalVerticalId = mt.rows[0].vertical_id;
    }
    if (!finalVerticalId) {
      return NextResponse.json({ error: "Vertical ID is required" }, { status: 400 });
    }

    let result;
    if (id && !isNaN(Number(id))) {
      result = await db.query(`
        UPDATE master_attributes
        SET label = $1,
            field_type = $2,
            placeholder = $3,
            options = $4,
            is_required = $5,
            validation_rules = $6,
            display_order = $7,
            is_active = $8,
            updated_at = NOW()
        WHERE id = $9
        RETURNING *;
      `, [
        label,
        field_type,
        placeholder || null,
        JSON.stringify(options || []),
        Boolean(is_required),
        JSON.stringify(validation_rules || {}),
        Number(display_order || 0),
        Boolean(is_active),
        Number(id),
      ]);
    } else {
      await db.query(`SELECT setval(pg_get_serial_sequence('master_attributes', 'id'), COALESCE((SELECT MAX(id) FROM master_attributes), 1), true)`);

      result = await db.query(`
        INSERT INTO master_attributes (
          vertical_id,
          master_type_id,
          name,
          label,
          field_type,
          placeholder,
          options,
          is_required,
          validation_rules,
          display_order,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (master_type_id, name) DO UPDATE
        SET label = EXCLUDED.label,
            field_type = EXCLUDED.field_type,
            placeholder = EXCLUDED.placeholder,
            options = EXCLUDED.options,
            is_required = EXCLUDED.is_required,
            validation_rules = EXCLUDED.validation_rules,
            display_order = EXCLUDED.display_order,
            is_active = EXCLUDED.is_active,
            updated_at = NOW()
        RETURNING *;
      `, [
        finalVerticalId,
        master_type_id || null,
        cleanName,
        label,
        field_type,
        placeholder || null,
        JSON.stringify(options || []),
        Boolean(is_required),
        JSON.stringify(validation_rules || {}),
        Number(display_order || 0),
        Boolean(is_active),
      ]);
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: "Custom attribute saved successfully",
    });
  } catch (err: any) {
    console.error("[Master Attributes POST] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to save attribute" }, { status: 500 });
  }
}
