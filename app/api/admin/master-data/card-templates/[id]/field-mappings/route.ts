import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { DOCUMENT_SOURCE_FIELDS, getSourceField } from "@/lib/card-templates/field-mapping";
import { db } from "@/lib/db/db";

type Context = { params: Promise<{ id: string }> };

type TemplateFieldRow = {
  id: number;
  field_name: string;
  label: string;
  field_type: string;
  is_required: boolean;
  sort_order: number;
};

let schemaReady = false;

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid template id");
  return id;
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

async function ensureFieldMappingSchema() {
  if (schemaReady) return;
  await db.query(`
    CREATE TABLE IF NOT EXISTS document_template_field_mappings (
      id SERIAL PRIMARY KEY,
      template_id INTEGER NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
      institution_id INTEGER NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      template_field_id INTEGER NULL REFERENCES document_template_fields(id) ON DELETE CASCADE,
      template_field_name VARCHAR(100) NOT NULL,
      source_field_key VARCHAR(150) NOT NULL,
      source_field_label VARCHAR(200) NOT NULL,
      transform VARCHAR(50) NOT NULL DEFAULT 'text',
      fallback_value TEXT,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      updated_by INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_document_template_field_mappings_global
    ON document_template_field_mappings(template_id, template_field_name)
    WHERE institution_id IS NULL
  `);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_document_template_field_mappings_institution
    ON document_template_field_mappings(template_id, institution_id, template_field_name)
    WHERE institution_id IS NOT NULL
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_document_template_field_mappings_template
    ON document_template_field_mappings(template_id)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_document_template_field_mappings_institution
    ON document_template_field_mappings(institution_id)
  `);
  schemaReady = true;
}

async function getTemplateFields(templateId: number) {
  const [templateResult, fieldsResult] = await Promise.all([
    db.query<{ id: number }>(
      `
        SELECT dt.id
        FROM document_templates dt
        WHERE dt.id = $1
          AND COALESCE(dt.is_deleted, FALSE) = FALSE
        LIMIT 1
      `,
      [templateId]
    ),
    db.query<TemplateFieldRow>(
      `
        SELECT id, field_name, label, field_type, is_required, sort_order
        FROM document_template_fields
        WHERE template_id = $1
        ORDER BY sort_order, id
      `,
      [templateId]
    ),
  ]);

  if (!templateResult.rowCount) throw new Error("Template not found");
  return fieldsResult.rows;
}

async function readMappings(templateId: number) {
  const result = await db.query(
    `
      SELECT
        id,
        template_id,
        institution_id,
        template_field_id,
        template_field_name,
        source_field_key,
        source_field_label,
        transform,
        fallback_value,
        is_active
      FROM document_template_field_mappings
      WHERE template_id = $1
        AND institution_id IS NULL
        AND is_active = TRUE
      ORDER BY template_field_name
    `,
    [templateId]
  );
  return result.rows;
}

export async function GET(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    const { id: value } = await context.params;
    const templateId = parseId(value);
    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const allowedInstitutionIds = isPlatformAdmin
      ? []
      : currentUser.memberships
          .filter((membership) =>
            membership.permissions.includes("*") ||
            membership.permissions.includes("content.card_templates.view")
          )
          .map((membership) => membership.institution_id);
    await ensureFieldMappingSchema();
    const templateFields = await getTemplateFields(templateId);
    if (!isPlatformAdmin) {
      const access = await db.query(
        `
          SELECT 1
          FROM document_templates dt
          WHERE dt.id = $1
            AND COALESCE(dt.is_deleted, FALSE) = FALSE
            AND (
              (dt.is_public = TRUE AND dt.is_active = TRUE)
              OR EXISTS (
                SELECT 1
                FROM institution_templates it
                INNER JOIN institution_profiles ip
                   ON ip.id = it.institution_id
                  AND ip.is_active = TRUE
                  AND COALESCE(ip.is_deleted, FALSE) = FALSE
                WHERE it.template_id = dt.id
                  AND it.is_active = TRUE
                  AND it.institution_id = ANY($2::int[])
              )
            )
          LIMIT 1
        `,
        [templateId, allowedInstitutionIds]
      );
      if (!access.rowCount) {
        return NextResponse.json({ error: "Template not found" }, { status: 404 });
      }
    }
    const mappings = await readMappings(templateId);
    return NextResponse.json({
      data: {
        sourceFields: DOCUMENT_SOURCE_FIELDS,
        templateFields,
        mappings,
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: Request, context: Context) {
  const client = await db.connect();
  try {
    const currentUser = await requireAdmin(req);
    if (!isPlatformAdminUser(currentUser)) {
      return NextResponse.json({ error: "Only Platform Admin can map template fields" }, { status: 403 });
    }
    const { id: value } = await context.params;
    const templateId = parseId(value);
    await ensureFieldMappingSchema();
    const body = await req.json();

    const templateFields = await getTemplateFields(templateId);
    const fieldByName = new Map(templateFields.map((field) => [field.field_name, field]));
    const mappings = Array.isArray(body.mappings) ? body.mappings : [];
    const cleaned = mappings
      .map((item) => ({
        template_field_name: String(item?.template_field_name ?? "").trim(),
        source_field_key: String(item?.source_field_key ?? "").trim(),
        fallback_value: item?.fallback_value == null ? null : String(item.fallback_value),
        transform: String(item?.transform ?? "text").trim() || "text",
      }))
      .filter((item) => item.template_field_name && item.source_field_key);

    for (const item of cleaned) {
      if (!fieldByName.has(item.template_field_name)) {
        throw new Error(`Unknown template field: ${item.template_field_name}`);
      }
      if (!getSourceField(item.source_field_key)) {
        throw new Error(`Unknown EduBird field: ${item.source_field_key}`);
      }
    }

    await client.query("BEGIN");
    await client.query(
      `
        DELETE FROM document_template_field_mappings
        WHERE template_id = $1
          AND institution_id IS NULL
      `,
      [templateId]
    );

    for (const item of cleaned) {
      const templateField = fieldByName.get(item.template_field_name);
      const sourceField = getSourceField(item.source_field_key);
      await client.query(
        `
          INSERT INTO document_template_field_mappings
            (
              template_id,
              institution_id,
              template_field_id,
              template_field_name,
              source_field_key,
              source_field_label,
              transform,
              fallback_value,
              is_active,
              created_by,
              updated_by,
              created_at,
              updated_at
            )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, $9, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `,
        [
          templateId,
          null,
          templateField?.id ?? null,
          item.template_field_name,
          item.source_field_key,
          sourceField?.label ?? item.source_field_key,
          item.transform,
          item.fallback_value,
          currentUser.id,
        ]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ success: true, saved: cleaned.length });
  } catch (err) {
    await client.query("ROLLBACK").catch(() => undefined);
    return errorResponse(err);
  } finally {
    client.release();
  }
}
