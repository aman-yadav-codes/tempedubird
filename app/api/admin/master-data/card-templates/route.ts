import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import {
  getRequestedInstitutionId,
  getScopedInstitutionIds,
} from "@/lib/auth/institution-scope";
import { hasPermission, isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { AUTO_GENERATE_FIELDS_KEY } from "@/lib/card-templates/institution-defaults";
import { db } from "@/lib/db/db";
import { ensureInstitutionGeneratedDocumentsTable } from "@/lib/queries/institution-generated-documents";
import { getPageCount, getPagination } from "@/lib/queries/pagination";
import { DOCUMENT_FIELD_TYPES, type DocumentTemplateField } from "@/lib/types/document-template";

function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Something went wrong";
  const status =
    message === "Forbidden: Admin access required" ? 403 :
    message === "Unauthorized" || message === "User not found" ? 401 :
    400;
  return NextResponse.json({ error: message }, { status });
}

async function ensureCardCategoryAudienceSchema() {
  await db.query(`
    ALTER TABLE card_categories
      ADD COLUMN IF NOT EXISTS target_audience VARCHAR(20) NOT NULL DEFAULT 'student';
  `);
}

function parseIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(value.map(Number).filter((id) => Number.isInteger(id) && id > 0))
  );
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
      sort_order: index,
    };
  });
}

function getAllowedInstitutionIds(
  currentUser: Awaited<ReturnType<typeof requireAdmin>>,
  requestedInstitutionId: number | null
) {
  if (requestedInstitutionId) {
    return getScopedInstitutionIds(currentUser, requestedInstitutionId) ?? [];
  }

  if (isPlatformAdminUser(currentUser)) return [];

  return currentUser.memberships
    .filter((membership) =>
      membership.permissions.includes("*") ||
      membership.permissions.includes("content.card_templates.view")
    )
    .map((membership) => membership.institution_id);
}

async function getTemplateDetail(
  id: number,
  currentUser: Awaited<ReturnType<typeof requireAdmin>>,
  requestedInstitutionId: number | null
) {
  const isPlatformAdmin = isPlatformAdminUser(currentUser);
  const allowedInstitutionIds = getAllowedInstitutionIds(currentUser, requestedInstitutionId);
  const scopeAllInstitutions = isPlatformAdmin && !requestedInstitutionId;

  const [templateResult, fieldsResult, mappingsResult, defaultsResult] = await Promise.all([
    db.query(
      `
        SELECT
          dt.*,
          cc.name AS category_name,
          cc.target_audience AS category_target_audience,
          creator.full_name AS created_by_name,
          updater.full_name AS updated_by_name,
          (
            SELECT COUNT(*)::int
            FROM institution_templates it
            INNER JOIN institution_profiles ip
               ON ip.id = it.institution_id
              AND ip.is_active = TRUE
              AND COALESCE(ip.is_deleted, FALSE) = FALSE
            WHERE it.template_id = dt.id
              AND it.is_active = TRUE
              AND ($2::boolean OR it.institution_id = ANY($3::int[]))
          ) AS assignment_count,
          (
            SELECT COUNT(*)::int
            FROM institution_generated_documents gd
            INNER JOIN institution_profiles ip
               ON ip.id = gd.institution_id
              AND ip.is_active = TRUE
              AND COALESCE(ip.is_deleted, FALSE) = FALSE
            WHERE gd.template_id = dt.id
              AND COALESCE(gd.is_deleted, FALSE) = FALSE
              AND ($2::boolean OR gd.institution_id = ANY($3::int[]))
          ) AS generated_count
        FROM document_templates dt
        INNER JOIN card_categories cc ON cc.id = dt.card_category_id
        LEFT JOIN users creator ON creator.id = dt.created_by
        LEFT JOIN users updater ON updater.id = dt.updated_by
        WHERE dt.id = $1
          AND COALESCE(dt.is_deleted, FALSE) = FALSE
          AND (
            $2::boolean
            OR (dt.is_public = TRUE AND dt.is_active = TRUE)
            OR EXISTS (
              SELECT 1
              FROM institution_templates scoped_it
              WHERE scoped_it.template_id = dt.id
                AND scoped_it.is_active = TRUE
                AND EXISTS (
                  SELECT 1
                  FROM institution_profiles scoped_ip
                  WHERE scoped_ip.id = scoped_it.institution_id
                    AND scoped_ip.is_active = TRUE
                    AND COALESCE(scoped_ip.is_deleted, FALSE) = FALSE
                )
                AND scoped_it.institution_id = ANY($3::int[])
            )
          )
        LIMIT 1
      `,
      [id, scopeAllInstitutions, allowedInstitutionIds]
    ),
    db.query(
      `
        SELECT id, field_name, label, field_type, is_required, sort_order
        FROM document_template_fields
        WHERE template_id = $1
        ORDER BY sort_order, id
      `,
      [id]
    ),
    db.query<{ template_field_name: string; source_field_label: string | null }>(
      `
        SELECT template_field_name, source_field_label
        FROM document_template_field_mappings
        WHERE template_id = $1
          AND institution_id IS NULL
          AND is_active = TRUE
      `,
      [id]
    ),
    requestedInstitutionId
      ? db.query<{ field_values: Record<string, unknown> }>(
          `
            SELECT field_values
            FROM institution_template_defaults
            WHERE institution_id = $1 AND template_id = $2
            LIMIT 1
          `,
          [requestedInstitutionId, id]
        )
      : Promise.resolve({ rows: [] } as { rows: Array<{ field_values: Record<string, unknown> }> }),
  ]);

  if (!templateResult.rowCount) return null;

  const mappingByFieldName = new Map(
    mappingsResult.rows.map((mapping) => [mapping.template_field_name, mapping])
  );
  const defaultValues = defaultsResult.rows[0]?.field_values ?? {};
  const autoGenerateFields = Array.isArray(defaultValues[AUTO_GENERATE_FIELDS_KEY])
    ? defaultValues[AUTO_GENERATE_FIELDS_KEY].filter((value): value is string => typeof value === "string")
    : [];
  const defaultFieldNames = new Set(
    Object.entries(defaultValues)
      .filter(([key, value]) =>
        key !== AUTO_GENERATE_FIELDS_KEY &&
        value != null &&
        String(value).trim() !== ""
      )
      .map(([key]) => key)
  );
  for (const fieldName of autoGenerateFields) defaultFieldNames.add(fieldName);

  const fields = fieldsResult.rows.map((field) => {
    const mapping = mappingByFieldName.get(field.field_name);
    const hasDefault = defaultFieldNames.has(field.field_name);
    return {
      ...field,
      preparation: {
        is_mapped: Boolean(mapping),
        has_default: hasDefault,
        needs_action: !mapping && !hasDefault,
        source_field_label: mapping?.source_field_label ?? null,
      },
    };
  });

  return { ...templateResult.rows[0], fields };
}

function getInstitutionAdminIds(currentUser: Awaited<ReturnType<typeof requireAdmin>>) {
  return currentUser.memberships
    .filter((membership) => membership.role_code === "institution_admin")
    .map((membership) => membership.institution_id);
}

function parsePositiveId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`Invalid ${label}`);
  return id;
}

async function clearTemplateDefaults(
  templateId: number,
  institutionId: number,
  currentUser: Awaited<ReturnType<typeof requireAdmin>>
) {
  if (!isInstitutionAdminUser(currentUser)) {
    return NextResponse.json(
      { error: "Only Institution Admin can clear default values" },
      { status: 403 }
    );
  }

  const editableInstitutionIds = getInstitutionAdminIds(currentUser);
  if (!editableInstitutionIds.includes(institutionId)) {
    return NextResponse.json(
      { error: "You cannot clear defaults for this institution" },
      { status: 403 }
    );
  }

  const assignment = await db.query(
    `
      SELECT 1
      FROM institution_templates it
      INNER JOIN institution_profiles ip
         ON ip.id = it.institution_id
        AND ip.is_active = TRUE
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
      WHERE it.template_id = $1
        AND it.institution_id = $2
        AND it.is_active = TRUE
      LIMIT 1
    `,
    [templateId, institutionId]
  );
  if (!assignment.rowCount) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const result = await db.query(
    `
      DELETE FROM institution_template_defaults
      WHERE institution_id = $1 AND template_id = $2
    `,
    [institutionId, templateId]
  );

  return NextResponse.json({ success: true, cleared: result.rowCount ?? 0 });
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureCardCategoryAudienceSchema();
    await ensureInstitutionGeneratedDocumentsTable();
    const url = new URL(req.url);

    if (url.searchParams.get("action") === "categories") {
      const result = await db.query(
        `SELECT id, name, target_audience FROM card_categories WHERE is_active = TRUE ORDER BY name`
      );
      return NextResponse.json({ data: result.rows });
    }

    if (url.searchParams.get("action") === "detail") {
      const id = Number(url.searchParams.get("id"));
      if (!Number.isInteger(id) || id <= 0) {
        return NextResponse.json({ error: "Invalid template id" }, { status: 400 });
      }

      const template = await getTemplateDetail(
        id,
        currentUser,
        getRequestedInstitutionId(url.searchParams)
      );
      if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
      return NextResponse.json({ data: template });
    }

    const { page, limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search")?.trim() ?? "";
    const searchValue = `%${search}%`;
    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const requestedView = url.searchParams.get("view");
    const requestedInstitutionId = getRequestedInstitutionId(url.searchParams);
    const view =
      requestedView === "marketplace"
        ? "marketplace"
        : isPlatformAdmin
          ? "all"
          : "my";
    const allowedInstitutionIds = getAllowedInstitutionIds(currentUser, requestedInstitutionId);
    const scopeAllInstitutions = isPlatformAdmin && !requestedInstitutionId;

    const result = await db.query<{
      data: unknown[];
      total: number;
      stats_total: number;
      stats_active: number;
      stats_public: number;
    }>(
      `
        WITH filtered AS MATERIALIZED (
          SELECT dt.id
          FROM document_templates dt
          INNER JOIN card_categories cc ON cc.id = dt.card_category_id
          WHERE ($3 = '' OR dt.name ILIKE $4 OR cc.name ILIKE $4)
            AND COALESCE(dt.is_deleted, FALSE) = FALSE
            AND (
              ($5 = 'all' AND $6::boolean)
              OR
              ($5 = 'marketplace' AND dt.is_public = TRUE AND dt.is_active = TRUE)
              OR
              ($5 = 'my' AND EXISTS (
                SELECT 1
                FROM institution_templates scoped_it
                WHERE scoped_it.template_id = dt.id
                  AND scoped_it.is_active = TRUE
                  AND EXISTS (
                    SELECT 1
                    FROM institution_profiles scoped_ip
                    WHERE scoped_ip.id = scoped_it.institution_id
                      AND scoped_ip.is_active = TRUE
                      AND COALESCE(scoped_ip.is_deleted, FALSE) = FALSE
                  )
                  AND ($6::boolean OR scoped_it.institution_id = ANY($7::int[]))
              ))
            )
        ),
        page_rows AS (
          SELECT
            dt.id,
            dt.card_category_id,
            cc.name AS category_name,
            cc.target_audience AS category_target_audience,
            dt.name,
            dt.thumbnail_url,
            dt.version,
            dt.is_public,
            dt.is_active,
            dt.created_at,
            dt.updated_at,
            creator.full_name AS created_by_name,
            updater.full_name AS updated_by_name,
            (SELECT COUNT(*)::int FROM document_template_fields dtf WHERE dtf.template_id = dt.id) AS field_count,
            (
              SELECT COUNT(*)::int
              FROM institution_templates it
              WHERE it.template_id = dt.id
                AND it.is_active = TRUE
                AND EXISTS (
                  SELECT 1
                  FROM institution_profiles scoped_ip
                  WHERE scoped_ip.id = it.institution_id
                    AND scoped_ip.is_active = TRUE
                    AND COALESCE(scoped_ip.is_deleted, FALSE) = FALSE
                )
                AND ($6::boolean OR it.institution_id = ANY($7::int[]))
            ) AS assignment_count,
            EXISTS (
              SELECT 1
              FROM institution_templates it
              INNER JOIN institution_profiles ip ON ip.id = it.institution_id
              WHERE it.template_id = dt.id
                AND it.is_active = TRUE
                AND ip.is_active = TRUE
                AND COALESCE(ip.is_deleted, FALSE) = FALSE
                AND NOT $6::boolean
                AND it.institution_id = ANY($7::int[])
            ) AS is_assigned_to_active_institution,
            COALESCE(
              (
                SELECT array_agg(
                  COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text)
                  ORDER BY COALESCE(ip.name, ip.slug), ip.id
                )
                FROM institution_templates it
                INNER JOIN institution_profiles ip ON ip.id = it.institution_id
                WHERE it.template_id = dt.id
                  AND it.is_active = TRUE
                  AND ip.is_active = TRUE
                  AND COALESCE(ip.is_deleted, FALSE) = FALSE
                  AND ($6::boolean OR it.institution_id = ANY($7::int[]))
              ),
              ARRAY[]::text[]
            ) AS assigned_institution_names,
            COALESCE(
              (
                SELECT jsonb_agg(
                  jsonb_build_object(
                    'id', ip.id,
                    'name', COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text)
                  )
                  ORDER BY COALESCE(ip.name, ip.slug), ip.id
                )
                FROM institution_templates it
                INNER JOIN institution_profiles ip ON ip.id = it.institution_id
                WHERE it.template_id = dt.id
                  AND it.is_active = TRUE
                  AND ip.is_active = TRUE
                  AND COALESCE(ip.is_deleted, FALSE) = FALSE
                  AND ($6::boolean OR it.institution_id = ANY($7::int[]))
              ),
              '[]'::jsonb
            ) AS assigned_institutions,
            (
              SELECT COUNT(*)::int
              FROM institution_generated_documents gd
              INNER JOIN institution_profiles ip
                 ON ip.id = gd.institution_id
                AND ip.is_active = TRUE
                AND COALESCE(ip.is_deleted, FALSE) = FALSE
              WHERE gd.template_id = dt.id
                AND COALESCE(gd.is_deleted, FALSE) = FALSE
                AND ($6::boolean OR gd.institution_id = ANY($7::int[]))
            ) AS generated_count
          FROM filtered f
          INNER JOIN document_templates dt ON dt.id = f.id
          INNER JOIN card_categories cc ON cc.id = dt.card_category_id
          LEFT JOIN users creator ON creator.id = dt.created_by
          LEFT JOIN users updater ON updater.id = dt.updated_by
          ORDER BY dt.updated_at DESC, dt.id DESC
          LIMIT $1 OFFSET $2
        )
        SELECT
          COALESCE((SELECT json_agg(page_rows) FROM page_rows), '[]'::json) AS data,
          (SELECT COUNT(*)::int FROM filtered) AS total,
          CASE
            WHEN $6::boolean THEN (SELECT COUNT(*)::int FROM document_templates WHERE COALESCE(is_deleted, FALSE) = FALSE)
            ELSE (
              SELECT COUNT(DISTINCT it.template_id)::int
              FROM institution_templates it
              INNER JOIN document_templates dt
                 ON dt.id = it.template_id
                AND COALESCE(dt.is_deleted, FALSE) = FALSE
              INNER JOIN institution_profiles ip
                 ON ip.id = it.institution_id
                AND ip.is_active = TRUE
                AND COALESCE(ip.is_deleted, FALSE) = FALSE
              WHERE it.is_active = TRUE
                AND it.institution_id = ANY($7::int[])
            )
          END AS stats_total,
          CASE
            WHEN $6::boolean THEN (
              SELECT COUNT(*)::int
              FROM document_templates
              WHERE is_active = TRUE
                AND COALESCE(is_deleted, FALSE) = FALSE
            )
            ELSE (
              SELECT COUNT(DISTINCT it.template_id)::int
              FROM institution_templates it
              INNER JOIN document_templates dt ON dt.id = it.template_id
              INNER JOIN institution_profiles ip
                 ON ip.id = it.institution_id
                AND ip.is_active = TRUE
                AND COALESCE(ip.is_deleted, FALSE) = FALSE
              WHERE it.is_active = TRUE
                AND dt.is_active = TRUE
                AND COALESCE(dt.is_deleted, FALSE) = FALSE
                AND it.institution_id = ANY($7::int[])
            )
          END AS stats_active,
          (SELECT COUNT(*)::int FROM document_templates WHERE is_public AND is_active AND COALESCE(is_deleted, FALSE) = FALSE) AS stats_public
      `,
      [limit, offset, search, searchValue, view, scopeAllInstitutions, allowedInstitutionIds]
    );

    const summary = result.rows[0];
    const total = Number(summary?.total ?? 0);
    return NextResponse.json({
      data: summary?.data ?? [],
      total,
      page,
      pageCount: getPageCount(total, limit),
      stats: {
        total: Number(summary?.stats_total ?? 0),
        active: Number(summary?.stats_active ?? 0),
        public: Number(summary?.stats_public ?? 0),
      },
      capabilities: {
        canAssign: hasPermission(currentUser, "content.card_templates.create"),
      },
    });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    if (!isPlatformAdminUser(currentUser)) {
      return NextResponse.json({ error: "Only Platform Admin can create templates" }, { status: 403 });
    }
    const body = await req.json();
    const cardCategoryId = Number(body.card_category_id);
    const name = String(body.name ?? "").trim();
    const htmlTemplate = String(body.html_template ?? "").trim();
    const thumbnailUrl = String(body.thumbnail_url ?? "").trim() || null;
    const fields = parseFields(body.fields);

    if (!Number.isInteger(cardCategoryId) || cardCategoryId <= 0) throw new Error("Card category is required");
    if (!name) throw new Error("Template name is required");
    if (!htmlTemplate) throw new Error("HTML template is required");

    const client = await db.connect();
    try {
      await client.query("BEGIN");
      const templateResult = await client.query<{ id: number }>(
        `
          INSERT INTO document_templates
            (card_category_id, name, thumbnail_url, html_template, is_public, is_active, created_by, updated_by)
          VALUES ($1, $2, $3, $4, $5, TRUE, $6, $6)
          RETURNING id
        `,
        [
          cardCategoryId,
          name,
          thumbnailUrl,
          htmlTemplate,
          body.is_public !== false,
          currentUser.id,
        ]
      );
      const templateId = templateResult.rows[0].id;

      if (fields.length) {
        await client.query(
          `
            INSERT INTO document_template_fields
              (template_id, field_name, label, field_type, is_required, sort_order)
            SELECT $1, field_name, label, field_type, is_required, sort_order
            FROM jsonb_to_recordset($2::jsonb)
              AS fields(field_name text, label text, field_type text, is_required boolean, sort_order int)
          `,
          [templateId, JSON.stringify(fields)]
        );
      }
      await client.query("COMMIT");
      return NextResponse.json({ data: { id: templateId } }, { status: 201 });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    if (!isPlatformAdminUser(currentUser)) {
      return NextResponse.json({ error: "Only Platform Admin can update templates" }, { status: 403 });
    }
    const body = await req.json();
    const ids = parseIds(body.ids);
    if (!ids.length) throw new Error("Select at least one template");

    const updates: string[] = ["updated_by = $2", "updated_at = CURRENT_TIMESTAMP"];
    const params: unknown[] = [ids, currentUser.id];
    if (typeof body.is_active === "boolean") {
      params.push(body.is_active);
      updates.push(`is_active = $${params.length}`);
    }
    if (typeof body.is_public === "boolean") {
      params.push(body.is_public);
      updates.push(`is_public = $${params.length}`);
    }
    if (updates.length === 2) throw new Error("No template changes provided");

    const result = await db.query(
      `UPDATE document_templates SET ${updates.join(", ")} WHERE id = ANY($1::int[]) AND COALESCE(is_deleted, FALSE) = FALSE RETURNING id`,
      params
    );
    return NextResponse.json({ updated: result.rowCount ?? 0 });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureInstitutionGeneratedDocumentsTable();
    const url = new URL(req.url);
    if (url.searchParams.get("action") === "clear-defaults") {
      const templateId = parsePositiveId(url.searchParams.get("id"), "template id");
      const institutionId = parsePositiveId(
        url.searchParams.get("institutionId"),
        "institution id"
      );
      return clearTemplateDefaults(templateId, institutionId, currentUser);
    }

    if (!isPlatformAdminUser(currentUser)) {
      return NextResponse.json({ error: "Only Platform Admin can delete templates" }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const ids = parseIds(body.ids);
    if (!ids.length) throw new Error("Select at least one template");

    const blocked = await db.query<{ name: string }>(
      `
        SELECT DISTINCT dt.name
        FROM document_templates dt
        WHERE dt.id = ANY($1::int[])
          AND (
            EXISTS (SELECT 1 FROM institution_templates it WHERE it.template_id = dt.id)
            OR EXISTS (SELECT 1 FROM institution_generated_documents gd WHERE gd.template_id = dt.id)
          )
        ORDER BY dt.name
      `,
      [ids]
    );
    if (blocked.rowCount) {
      return NextResponse.json(
        { error: `Assigned or generated templates cannot be deleted: ${blocked.rows.map((row) => row.name).join(", ")}` },
        { status: 409 }
      );
    }

    const result = await db.query(
      `UPDATE document_templates
          SET is_deleted = TRUE,
              deleted_at = NOW(),
              is_active = FALSE,
              updated_by = $2,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($1::int[])
          AND COALESCE(is_deleted, FALSE) = FALSE
        RETURNING id`,
      [ids, currentUser.id]
    );
    return NextResponse.json({ deleted: result.rowCount ?? 0 });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}
