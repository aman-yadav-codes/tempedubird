import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureInstitutionGeneratedDocumentsTable } from "@/lib/queries/institution-generated-documents";
import { isPlatformAdminUser } from "@/lib/auth/permissions";

type Context = { params: Promise<{ id: string }> };

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
    400;
  return NextResponse.json({ error: message }, { status });
}

async function ensureCardCategoryAudienceSchema() {
  await db.query(`
    ALTER TABLE card_categories
      ADD COLUMN IF NOT EXISTS target_audience VARCHAR(20) NOT NULL DEFAULT 'student';
  `);
}

async function ensureDocumentTemplatesPricingSchema() {
  await db.query(`
    ALTER TABLE document_templates
      ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'INR';

    ALTER TABLE institution_templates
      ADD COLUMN IF NOT EXISTS is_paid BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS price_paid NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS payment_id VARCHAR(255),
      ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'completed',
      ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
  `);
}

export async function GET(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureCardCategoryAudienceSchema();
    await ensureDocumentTemplatesPricingSchema();
    await ensureInstitutionGeneratedDocumentsTable();
    const { id: value } = await context.params;
    const id = parseId(value);
    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const allowedInstitutionIds = isPlatformAdmin
      ? []
      : currentUser.memberships
          .filter((membership) =>
            membership.permissions.includes("*") ||
            membership.permissions.includes("content.card_templates.view")
          )
          .map((membership) => membership.institution_id);
    const [templateResult, fieldsResult] = await Promise.all([
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
        [id, isPlatformAdmin, allowedInstitutionIds]
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
    ]);
    if (!templateResult.rowCount) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    return NextResponse.json({
      data: { ...templateResult.rows[0], fields: fieldsResult.rows },
    });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}

export async function PATCH(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    if (!isPlatformAdminUser(currentUser)) {
      return NextResponse.json({ error: "Only Platform Admin can update templates" }, { status: 403 });
    }
    await ensureDocumentTemplatesPricingSchema();
    const { id: value } = await context.params;
    const id = parseId(value);
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const cardCategoryId = Number(body.card_category_id);
    if (!name) throw new Error("Template name is required");
    if (!Number.isInteger(cardCategoryId) || cardCategoryId <= 0) throw new Error("Card category is required");

    const isPaid = typeof body.is_paid === "boolean" ? body.is_paid : undefined;
    const price = body.price !== undefined ? Math.max(0, Number(body.price) || 0) : undefined;

    const result = await db.query(
      `
        UPDATE document_templates
        SET name = $2,
            card_category_id = $3,
            is_public = $4,
            is_active = $5,
            is_paid = COALESCE($6, is_paid),
            price = COALESCE($7, price),
            updated_by = $8,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND COALESCE(is_deleted, FALSE) = FALSE
        RETURNING id
      `,
      [
        id,
        name,
        cardCategoryId,
        body.is_public !== false,
        body.is_active !== false,
        isPaid,
        price,
        currentUser.id,
      ]
    );
    if (!result.rowCount) return NextResponse.json({ error: "Template not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureInstitutionGeneratedDocumentsTable();
    if (!isPlatformAdminUser(currentUser)) {
      return NextResponse.json({ error: "Only Platform Admin can delete templates" }, { status: 403 });
    }
    const { id: value } = await context.params;
    const id = parseId(value);
    const result = await db.query(
      `
        UPDATE document_templates dt
        SET is_deleted = TRUE,
            deleted_at = NOW(),
            is_active = FALSE,
            updated_by = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE dt.id = $1
          AND COALESCE(dt.is_deleted, FALSE) = FALSE
          AND NOT EXISTS (SELECT 1 FROM institution_templates it WHERE it.template_id = dt.id)
          AND NOT EXISTS (SELECT 1 FROM institution_generated_documents gd WHERE gd.template_id = dt.id)
        RETURNING id
      `,
      [id, currentUser.id]
    );
    if (!result.rowCount) {
      return NextResponse.json(
        { error: "Assigned or generated templates cannot be deleted. Disable the template instead." },
        { status: 409 }
      );
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}
