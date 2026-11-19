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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureMasterDataSchema();
    const { id } = await params;
    const recordId = Number(id);

    if (isNaN(recordId)) {
      return NextResponse.json({ error: "Invalid record ID" }, { status: 400 });
    }

    const recordRes = await db.query(`
      SELECT
        r.*,
        v.code AS vertical_code,
        v.name AS vertical_name,
        mt.code AS master_type_code,
        mt.name AS master_type_name,
        mt.hierarchy_level,
        p.name AS parent_name,
        p.code AS parent_code
      FROM master_records r
      JOIN master_verticals v ON v.id = r.vertical_id
      JOIN master_types mt ON mt.id = r.master_type_id
      LEFT JOIN master_records p ON p.id = r.parent_id
      WHERE r.id = $1;
    `, [recordId]);

    if (recordRes.rows.length === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    const record = recordRes.rows[0];

    // Fetch child records
    const childrenRes = await db.query(`
      SELECT id, name, slug, code, display_order, status
      FROM master_records
      WHERE parent_id = $1 AND status <> 'archived'
      ORDER BY display_order ASC, name ASC;
    `, [recordId]);

    // Fetch custom attribute values
    const attrValuesRes = await db.query(`
      SELECT
        a.id AS attribute_id,
        a.name,
        a.label,
        a.field_type,
        a.placeholder,
        a.options,
        a.is_required,
        av.value_text,
        av.value_number,
        av.value_boolean,
        av.value_json
      FROM master_attributes a
      LEFT JOIN master_record_attribute_values av ON av.attribute_id = a.id AND av.record_id = $1
      WHERE a.master_type_id = $2 AND a.is_active = TRUE
      ORDER BY a.display_order ASC;
    `, [recordId, record.master_type_id]);

    // Fetch M:N relationships
    const relRes = await db.query(`
      SELECT
        r.id,
        r.name,
        r.slug,
        mt.name AS master_type_name,
        rel.relationship_type
      FROM master_record_relationships rel
      JOIN master_records r ON r.id = rel.related_record_id
      JOIN master_types mt ON mt.id = r.master_type_id
      WHERE rel.record_id = $1;
    `, [recordId]);

    // Fetch audit history
    const auditRes = await db.query(`
      SELECT id, action, changed_fields, performed_by_name, created_at
      FROM master_audit_logs
      WHERE record_id = $1
      ORDER BY created_at DESC
      LIMIT 20;
    `, [recordId]);

    return NextResponse.json({
      success: true,
      data: {
        ...record,
        children: childrenRes.rows,
        attributes: attrValuesRes.rows,
        related_records: relRes.rows,
        audit_logs: auditRes.rows,
      },
    });
  } catch (err: any) {
    console.error("[Master Record Details GET] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to fetch master record" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureMasterDataSchema();
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized. Platform Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    const recordId = Number(id);
    if (isNaN(recordId)) {
      return NextResponse.json({ error: "Invalid record ID" }, { status: 400 });
    }

    const existingRes = await db.query(`SELECT * FROM master_records WHERE id = $1`, [recordId]);
    if (existingRes.rows.length === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    const currentRecord = existingRes.rows[0];

    const body = await req.json();
    const {
      name,
      code,
      slug,
      description,
      parent_id,
      image_url,
      icon,
      display_order,
      status,
      metadata,
      custom_attributes,
      related_record_ids,
    } = body;

    const finalName = name !== undefined ? String(name).trim() : currentRecord.name;
    let finalSlug = currentRecord.slug;
    if (slug) {
      finalSlug = slugify(String(slug));
      // Check slug uniqueness
      const chk = await db.query(
        `SELECT id FROM master_records WHERE master_type_id = $1 AND slug = $2 AND id <> $3 LIMIT 1`,
        [currentRecord.master_type_id, finalSlug, recordId]
      );
      if (chk.rows.length > 0) {
        finalSlug = `${finalSlug}-${recordId}`;
      }
    } else if (name && name !== currentRecord.name) {
      finalSlug = slugify(finalName);
      const chk = await db.query(
        `SELECT id FROM master_records WHERE master_type_id = $1 AND slug = $2 AND id <> $3 LIMIT 1`,
        [currentRecord.master_type_id, finalSlug, recordId]
      );
      if (chk.rows.length > 0) {
        finalSlug = `${finalSlug}-${recordId}`;
      }
    }

    const updatedRes = await db.query(`
      UPDATE master_records
      SET name = $1,
          code = COALESCE($2, code),
          slug = $3,
          description = COALESCE($4, description),
          parent_id = CASE WHEN $5::text = 'null' THEN NULL WHEN $5::integer IS NOT NULL THEN $5::integer ELSE parent_id END,
          image_url = COALESCE($6, image_url),
          icon = COALESCE($7, icon),
          display_order = COALESCE($8::integer, display_order),
          status = COALESCE($9, status),
          metadata = CASE WHEN $10::jsonb IS NOT NULL THEN $10::jsonb ELSE metadata END,
          updated_by = $11,
          updated_at = NOW()
      WHERE id = $12
      RETURNING *;
    `, [
      finalName,
      code || null,
      finalSlug,
      description !== undefined ? description : null,
      parent_id !== undefined ? (parent_id === null ? "null" : parent_id) : undefined,
      image_url !== undefined ? image_url : null,
      icon !== undefined ? icon : null,
      display_order !== undefined ? Number(display_order) : null,
      status || null,
      metadata ? JSON.stringify(metadata) : null,
      user.id,
      recordId,
    ]);

    const updatedRecord = updatedRes.rows[0];

    // Update Custom Attributes
    if (custom_attributes && typeof custom_attributes === "object") {
      for (const [attrId, val] of Object.entries(custom_attributes)) {
        if (!isNaN(Number(attrId))) {
          if (val === null || val === "") {
            await db.query(
              `DELETE FROM master_record_attribute_values WHERE record_id = $1 AND attribute_id = $2`,
              [recordId, Number(attrId)]
            );
          } else {
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
            `, [recordId, Number(attrId), textVal, numVal, boolVal, jsonVal]);
          }
        }
      }
    }

    // Update M:N Relationships if provided
    if (Array.isArray(related_record_ids)) {
      await db.query(`DELETE FROM master_record_relationships WHERE record_id = $1`, [recordId]);
      for (const relId of related_record_ids) {
        if (relId && !isNaN(Number(relId))) {
          await db.query(`
            INSERT INTO master_record_relationships (record_id, related_record_id, relationship_type)
            VALUES ($1, $2, 'belongs_to')
            ON CONFLICT DO NOTHING;
          `, [recordId, Number(relId)]);
        }
      }
    }

    // Audit Log
    await db.query(`
      INSERT INTO master_audit_logs (vertical_id, master_type_id, record_id, record_name, action, changed_fields, performed_by, performed_by_name)
      VALUES ($1, $2, $3, $4, 'update', $5, $6, $7);
    `, [
      updatedRecord.vertical_id,
      updatedRecord.master_type_id,
      recordId,
      updatedRecord.name,
      JSON.stringify(body),
      user.id,
      user.full_name || user.email || `User #${user.id}`,
    ]);

    return NextResponse.json({
      success: true,
      data: updatedRecord,
      message: "Master record updated successfully",
    });
  } catch (err: any) {
    console.error("[Master Record PUT] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to update master record" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await ensureMasterDataSchema();
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized. Platform Admin access required." }, { status: 403 });
    }

    const { id } = await params;
    const recordId = Number(id);
    if (isNaN(recordId)) {
      return NextResponse.json({ error: "Invalid record ID" }, { status: 400 });
    }

    const check = await db.query(`SELECT * FROM master_records WHERE id = $1`, [recordId]);
    if (check.rows.length === 0) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
    const record = check.rows[0];

    // Check if record has children
    const childCheck = await db.query(
      `SELECT COUNT(*)::int AS count FROM master_records WHERE parent_id = $1 AND status <> 'archived'`,
      [recordId]
    );
    const childCount = childCheck.rows[0]?.count || 0;
    if (childCount > 0) {
      return NextResponse.json({
        error: `Cannot delete record: It has ${childCount} child record(s) associated with it. Please re-assign or archive them first.`,
      }, { status: 409 });
    }

    // Safe archival / soft deletion to preserve history
    await db.query(`
      UPDATE master_records
      SET status = 'archived', updated_by = $1, updated_at = NOW()
      WHERE id = $2;
    `, [user.id, recordId]);

    // Audit Log
    await db.query(`
      INSERT INTO master_audit_logs (vertical_id, master_type_id, record_id, record_name, action, changed_fields, performed_by, performed_by_name)
      VALUES ($1, $2, $3, $4, 'delete', $5, $6, $7);
    `, [
      record.vertical_id,
      record.master_type_id,
      recordId,
      record.name,
      JSON.stringify({ archived: true }),
      user.id,
      user.full_name || user.email || `User #${user.id}`,
    ]);

    return NextResponse.json({
      success: true,
      message: `Master record "${record.name}" archived successfully`,
    });
  } catch (err: any) {
    console.error("[Master Record DELETE] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to delete master record" }, { status: 500 });
  }
}
