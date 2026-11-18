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

export async function POST(req: Request) {
  try {
    await ensureMasterDataSchema();
    const user = await getAuthenticatedUser(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Unauthorized. Platform Admin access required." }, { status: 403 });
    }

    const body = await req.json();
    const { vertical_id, master_type_id, parent_id, records = [] } = body;

    if (!master_type_id || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: "master_type_id and an array of records are required" }, { status: 400 });
    }

    // Resolve vertical_id
    let finalVerticalId = vertical_id;
    if (!finalVerticalId) {
      const mtRow = await db.query(`SELECT vertical_id FROM master_types WHERE id = $1 LIMIT 1`, [master_type_id]);
      if (mtRow.rows.length === 0) {
        return NextResponse.json({ error: "Invalid master type ID" }, { status: 400 });
      }
      finalVerticalId = mtRow.rows[0].vertical_id;
    }

    await db.query(`SELECT setval(pg_get_serial_sequence('master_records', 'id'), COALESCE((SELECT MAX(id) FROM master_records), 1), true)`);

    let importedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const name = typeof row === "string" ? row.trim() : (row.name ? String(row.name).trim() : "");
      if (!name) {
        skippedCount++;
        continue;
      }

      const slug = row.slug ? slugify(String(row.slug)) : slugify(name);
      const code = row.code ? String(row.code).trim() : slug;
      const description = row.description ? String(row.description).trim() : null;
      const rowParentId = row.parent_id !== undefined ? row.parent_id : (parent_id || null);
      const displayOrder = row.display_order ? Number(row.display_order) : i + 1;

      try {
        await db.query(`
          INSERT INTO master_records (
            vertical_id,
            master_type_id,
            parent_id,
            code,
            name,
            slug,
            description,
            display_order,
            status,
            created_by,
            updated_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $9)
          ON CONFLICT (master_type_id, slug) DO UPDATE
          SET name = EXCLUDED.name,
              code = EXCLUDED.code,
              description = COALESCE(EXCLUDED.description, master_records.description),
              parent_id = COALESCE(EXCLUDED.parent_id, master_records.parent_id),
              updated_by = EXCLUDED.updated_by,
              updated_at = NOW();
        `, [
          finalVerticalId,
          master_type_id,
          rowParentId,
          code,
          name,
          slug,
          description,
          displayOrder,
          user.id,
        ]);
        importedCount++;
      } catch (rowErr: any) {
        errors.push(`Row ${i + 1} (${name}): ${rowErr.message}`);
        skippedCount++;
      }
    }

    // Audit Log
    await db.query(`
      INSERT INTO master_audit_logs (vertical_id, master_type_id, action, changed_fields, performed_by, performed_by_name)
      VALUES ($1, $2, 'bulk_import', $3, $4, $5);
    `, [
      finalVerticalId,
      master_type_id,
      JSON.stringify({ total: records.length, imported: importedCount, skipped: skippedCount }),
      user.id,
      user.full_name || user.email || `User #${user.id}`,
    ]);

    return NextResponse.json({
      success: true,
      message: `Import completed: ${importedCount} imported/updated, ${skippedCount} skipped.`,
      summary: {
        total: records.length,
        imported: importedCount,
        skipped: skippedCount,
        errors: errors.slice(0, 10),
      },
    });
  } catch (err: any) {
    console.error("[Master Bulk Import POST] Error:", err);
    return NextResponse.json({ error: err.message || "Failed to process bulk import" }, { status: 500 });
  }
}
