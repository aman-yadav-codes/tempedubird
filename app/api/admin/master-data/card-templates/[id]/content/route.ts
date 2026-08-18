import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { DOCUMENT_FIELD_TYPES, type DocumentTemplateField } from "@/lib/types/document-template";

type Context = { params: Promise<{ id: string }> };

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid template id");
  return id;
}

function parseFields(value: unknown): DocumentTemplateField[] {
  if (!Array.isArray(value)) throw new Error("Template fields are required");
  const names = new Set<string>();

  return value.map((entry, index) => {
    const field = entry as Record<string, unknown>;
    const fieldName = String(field.field_name ?? "").trim();
    const label = String(field.label ?? "").trim();
    const fieldType = String(field.field_type ?? "");
    if (!/^[a-z][a-zA-Z0-9]*$/.test(fieldName)) throw new Error(`Invalid field name: ${fieldName}`);
    if (names.has(fieldName)) throw new Error(`Duplicate field name: ${fieldName}`);
    if (!label) throw new Error(`Label is required for ${fieldName}`);
    if (!DOCUMENT_FIELD_TYPES.includes(fieldType as never)) {
      throw new Error(`Invalid field type for ${fieldName}`);
    }
    names.add(fieldName);
    return {
      field_name: fieldName,
      label,
      field_type: fieldType as DocumentTemplateField["field_type"],
      is_required: field.is_required !== false,
      sort_order: Number.isInteger(Number(field.sort_order)) ? Number(field.sort_order) : index,
    };
  });
}

function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Something went wrong";
  const status =
    message === "Forbidden: Admin access required" ? 403 :
    message === "Unauthorized" || message === "User not found" ? 401 :
    message.includes("not found") ? 404 :
    400;
  return NextResponse.json({ error: message }, { status });
}

export async function PUT(req: Request, context: Context) {
  const client = await db.connect();
  try {
    const currentUser = await requireAdmin(req);
    if (!isPlatformAdminUser(currentUser)) {
      return NextResponse.json({ error: "Only Platform Admin can edit template code" }, { status: 403 });
    }

    const { id: value } = await context.params;
    const id = parseId(value);
    const body = await req.json();
    const htmlTemplate = String(body.html_template ?? "").trim();
    const fields = parseFields(body.fields);
    if (!htmlTemplate) throw new Error("HTML template is required");

    await client.query("BEGIN");
    const templateResult = await client.query(
      `
        UPDATE document_templates
        SET html_template = $2,
            version = version + 1,
            updated_by = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND COALESCE(is_deleted, FALSE) = FALSE
        RETURNING *
      `,
      [id, htmlTemplate, currentUser.id]
    );
    if (!templateResult.rowCount) throw new Error("Template not found");

    for (const field of fields) {
      await client.query(
        `
          INSERT INTO document_template_fields
            (template_id, field_name, label, field_type, is_required, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (template_id, field_name)
          DO UPDATE SET
            label = EXCLUDED.label,
            field_type = EXCLUDED.field_type,
            is_required = EXCLUDED.is_required,
            sort_order = EXCLUDED.sort_order
        `,
        [id, field.field_name, field.label, field.field_type, field.is_required, field.sort_order]
      );
    }

    await client.query(
      `
        DELETE FROM document_template_fields
        WHERE template_id = $1
          AND NOT (field_name = ANY($2::text[]))
      `,
      [id, fields.map((field) => field.field_name)]
    );

    const fieldsResult = await client.query(
      `
        SELECT id, field_name, label, field_type, is_required, sort_order
        FROM document_template_fields
        WHERE template_id = $1
        ORDER BY sort_order, id
      `,
      [id]
    );

    await client.query("COMMIT");
    return NextResponse.json({
      data: {
        ...templateResult.rows[0],
        fields: fieldsResult.rows,
      },
    });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    return errorResponse(err);
  } finally {
    client.release();
  }
}
