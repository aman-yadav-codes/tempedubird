import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { canAccessInstitution } from "@/lib/auth/institution-scope";
import { hasPermission, isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";

type CurrentUser = Awaited<ReturnType<typeof requireAdmin>>;

function getErrorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

function parsePositiveId(value: unknown, label: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`Invalid ${label}`);
  return id;
}

function parseOptionalPositiveId(value: string | null) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

async function ensureStaffLettersSchema() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS staff_generated_letters (
      id BIGSERIAL PRIMARY KEY,
      institution_id INTEGER NOT NULL REFERENCES institution_profiles(id) ON DELETE CASCADE,
      staff_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      template_id INTEGER NOT NULL REFERENCES document_templates(id) ON DELETE RESTRICT,
      card_category_id INTEGER REFERENCES card_categories(id) ON DELETE RESTRICT,
      title VARCHAR(200) NOT NULL,
      letter_type VARCHAR(80) NOT NULL DEFAULT 'staff_letter',
      rendered_html TEXT NOT NULL,
      field_values JSONB NOT NULL DEFAULT '{}'::jsonb,
      image_url TEXT,
      pdf_url TEXT,
      canvas_width INTEGER,
      canvas_height INTEGER,
      generated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
      deleted_at TIMESTAMP,
      deleted_by INTEGER REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_staff_generated_letters_institution
      ON staff_generated_letters(institution_id, is_deleted, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_staff_generated_letters_staff
      ON staff_generated_letters(staff_user_id, is_deleted, created_at DESC);

    CREATE INDEX IF NOT EXISTS idx_staff_generated_letters_template
      ON staff_generated_letters(template_id);
  `);
}

async function assertStaffLetterAccess(
  currentUser: CurrentUser,
  institutionId: number | null,
  mode: "admin" | "self",
) {
  if (mode === "self") {
    // Every employee can see documents/letters generated for them
    return;
  }

  if (institutionId) {
    if (!canAccessInstitution(currentUser, institutionId)) {
      throw new Error("Forbidden: Admin access required");
    }
    if (
      !isInstitutionAdminUser(currentUser) &&
      !hasPermission(currentUser, "managestaff.allstaff.view", { institutionId }) &&
      !hasPermission(currentUser, "admin.staff.view", { institutionId })
    ) {
      throw new Error("Forbidden: Admin access required");
    }
  } else {
    // Platform admin global access
    if (!hasPermission(currentUser, "admin.staff.view") && !hasPermission(currentUser, "admin.generate")) {
      throw new Error("Forbidden: Admin access required");
    }
  }
}

async function getStaffMembership(staffUserId: number, institutionId: number | null) {
  if (institutionId) {
    const result = await db.query<{
      staff_user_id: number;
      full_name: string;
      email: string | null;
      role_code: "teacher" | "driver" | "staff";
    }>(
      `
        SELECT
          u.id AS staff_user_id,
          u.full_name,
          u.email,
          COALESCE(r.code, 'staff') AS role_code
        FROM users u
        LEFT JOIN institution_memberships im
          ON im.user_id = u.id AND im.institution_id = $2 AND im.is_active = TRUE AND COALESCE(im.is_deleted, FALSE) = FALSE
        LEFT JOIN roles r ON r.id = im.role_id
        WHERE u.id = $1
          AND u.is_active = TRUE
          AND COALESCE(u.is_deleted, FALSE) = FALSE
        LIMIT 1
      `,
      [staffUserId, institutionId]
    );
    if (!result.rows[0]) throw new Error("Staff member not found");
    return result.rows[0];
  } else {
    const result = await db.query<{
      staff_user_id: number;
      full_name: string;
      email: string | null;
      role_code: "teacher" | "driver" | "staff";
    }>(
      `
        SELECT
          u.id AS staff_user_id,
          u.full_name,
          u.email,
          'staff' AS role_code
        FROM users u
        WHERE u.id = $1
          AND u.is_active = TRUE
          AND COALESCE(u.is_deleted, FALSE) = FALSE
        LIMIT 1
      `,
      [staffUserId]
    );
    if (!result.rows[0]) throw new Error("Staff member not found");
    return result.rows[0];
  }
}

async function getStaffTemplate(templateId: number, institutionId: number | null) {
  const result = await db.query<{
    template_id: number;
    template_name: string;
    card_category_id: number;
    category_name: string;
    category_slug: string;
    category_target_audience: string;
  }>(
    `
      SELECT
        dt.id AS template_id,
        dt.name AS template_name,
        dt.card_category_id,
        COALESCE(cc.name, 'Staff Document') AS category_name,
        COALESCE(cc.slug, 'staff_letter') AS category_slug,
        COALESCE(cc.target_audience, 'staff') AS category_target_audience
      FROM document_templates dt
      LEFT JOIN card_categories cc
         ON cc.id = dt.card_category_id
      WHERE dt.id = $1
        AND dt.is_active = TRUE
        AND COALESCE(dt.is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    [templateId]
  );
  const row = result.rows[0];
  if (!row) throw new Error("Template not found");
  return row;
}

function letterTypeFromSlug(slug: string) {
  return slug.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "staff_letter";
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureStaffLettersSchema();
    const url = new URL(req.url);
    const mode = url.searchParams.get("mode") === "self" ? "self" : "admin";
    const requestedInstitutionId = parseOptionalPositiveId(url.searchParams.get("institutionId"));
    const institutionId = isPlatformAdminUser(currentUser)
      ? requestedInstitutionId
      : (requestedInstitutionId ?? (currentUser as any).institution_id ?? (currentUser as any).active_institution_id ?? currentUser.memberships?.[0]?.institution_id ?? null);
    const isPlatform = isPlatformAdminUser(currentUser);
    const isInstAdmin = isInstitutionAdminUser(currentUser);
    const canManageAll = isPlatform || isInstAdmin || (institutionId ? hasPermission(currentUser, "managestaff.allstaff.view", { institutionId }) || hasPermission(currentUser, "admin.staff.view", { institutionId }) : false);
    const effectiveMode = mode === "self" || !canManageAll ? "self" : "admin";

    await assertStaffLetterAccess(currentUser, institutionId, effectiveMode);

    const { page, limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search")?.trim() ?? "";
    const searchValue = `%${search}%`;
    const listParams: unknown[] = [institutionId, search, searchValue, limit, offset];
    const countParams: unknown[] = [institutionId, search, searchValue];
    const selfFilter = effectiveMode === "self" ? "AND sgl.staff_user_id = $6" : "";
    if (effectiveMode === "self") {
      listParams.push(currentUser.id);
      countParams.push(currentUser.id);
    }

    const institutionWhere = institutionId ? "sgl.institution_id = $1" : "(sgl.institution_id IS NULL OR $1::integer IS NULL)";

    const [rowsResult, countResult] = await Promise.all([
      db.query(
        `
          SELECT
            sgl.id,
            sgl.institution_id,
            sgl.staff_user_id,
            staff.full_name,
            staff.email,
            'staff' AS role_code,
            sgl.template_id,
            template.name AS template_name,
            sgl.card_category_id,
            category.name AS category_name,
            category.slug AS category_slug,
            sgl.title,
            sgl.letter_type,
            sgl.image_url,
            sgl.pdf_url,
            sgl.canvas_width,
            sgl.canvas_height,
            sgl.created_at,
            generator.full_name AS generated_by_name
          FROM staff_generated_letters sgl
          INNER JOIN users staff ON staff.id = sgl.staff_user_id
          INNER JOIN document_templates template ON template.id = sgl.template_id
          LEFT JOIN card_categories category ON category.id = sgl.card_category_id
          LEFT JOIN users generator ON generator.id = sgl.generated_by
          WHERE ${institutionWhere}
            AND COALESCE(sgl.is_deleted, FALSE) = FALSE
            ${selfFilter}
            AND (
              $2 = ''
              OR staff.full_name ILIKE $3
              OR staff.email ILIKE $3
              OR sgl.title ILIKE $3
              OR template.name ILIKE $3
              OR COALESCE(category.name, '') ILIKE $3
            )
          ORDER BY sgl.created_at DESC, sgl.id DESC
          LIMIT $4 OFFSET $5
        `,
        listParams
      ),
      db.query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM staff_generated_letters sgl
          INNER JOIN users staff ON staff.id = sgl.staff_user_id
          INNER JOIN document_templates template ON template.id = sgl.template_id
          LEFT JOIN card_categories category ON category.id = sgl.card_category_id
          WHERE ${institutionWhere}
            AND COALESCE(sgl.is_deleted, FALSE) = FALSE
            ${mode === "self" ? "AND sgl.staff_user_id = $4" : ""}
            AND (
              $2 = ''
              OR staff.full_name ILIKE $3
              OR staff.email ILIKE $3
              OR sgl.title ILIKE $3
              OR template.name ILIKE $3
              OR COALESCE(category.name, '') ILIKE $3
            )
        `,
        countParams
      ),
    ]);

    const total = Number(countResult.rows[0]?.count ?? 0);
    return NextResponse.json({
      data: rowsResult.rows,
      total,
      page,
      pageCount: getPageCount(total, limit),
    });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status =
      message === "Forbidden: Admin access required" ? 403 :
      message === "Unauthorized" || message === "User not found" ? 401 :
      400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureStaffLettersSchema();
    const body = await req.json();
    const institutionId = parseOptionalPositiveId(body.institutionId);
    const staffUserId = parsePositiveId(body.staffUserId, "staff member");
    const templateId = parsePositiveId(body.templateId, "template");
    const renderedHtml = String(body.renderedHtml ?? "");
    const imageUrl = String(body.imageUrl ?? "");
    const fieldValues = body.fieldValues && typeof body.fieldValues === "object" ? body.fieldValues : {};
    const canvasExport = body.canvasExport && typeof body.canvasExport === "object"
      ? body.canvasExport as { width?: unknown; height?: unknown }
      : null;

    await assertStaffLetterAccess(currentUser, institutionId, "admin");
    const staff = await getStaffMembership(staffUserId, institutionId);
    const template = await getStaffTemplate(templateId, institutionId);

    if (!renderedHtml.trim()) throw new Error("Generate the letter before saving");
    if (!imageUrl.startsWith("data:image/") && !/^https:\/\//i.test(imageUrl)) {
      throw new Error("Generate a valid letter image before saving");
    }

    const canvasWidth = Number(canvasExport?.width);
    const canvasHeight = Number(canvasExport?.height);
    const title = `${staff.full_name} ${template.category_name || template.template_name}`;
    const result = await db.query(
      `
        INSERT INTO staff_generated_letters (
          institution_id,
          staff_user_id,
          template_id,
          card_category_id,
          title,
          letter_type,
          rendered_html,
          field_values,
          image_url,
          canvas_width,
          canvas_height,
          generated_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12)
        RETURNING id, title, created_at
      `,
      [
        institutionId,
        staffUserId,
        templateId,
        template.card_category_id,
        title,
        letterTypeFromSlug(template.category_slug),
        renderedHtml,
        JSON.stringify(fieldValues),
        imageUrl,
        Number.isFinite(canvasWidth) ? canvasWidth : null,
        Number.isFinite(canvasHeight) ? canvasHeight : null,
        currentUser.id,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status =
      message === "Forbidden: Admin access required" ? 403 :
      message === "Unauthorized" || message === "User not found" ? 401 :
      400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureStaffLettersSchema();
    const body = await req.json();
    const institutionId = parsePositiveId(body.institutionId, "institution");
    const letterId = parsePositiveId(body.id, "letter");

    await assertStaffLetterAccess(currentUser, institutionId, "admin");

    const result = await db.query(
      `
        UPDATE staff_generated_letters
        SET
          is_deleted = TRUE,
          deleted_at = NOW(),
          deleted_by = $3,
          updated_at = NOW()
        WHERE id = $1
          AND institution_id = $2
          AND COALESCE(is_deleted, FALSE) = FALSE
        RETURNING id
      `,
      [letterId, institutionId, currentUser.id]
    );

    if (!result.rows[0]) throw new Error("Staff letter not found");

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    const status =
      message === "Forbidden: Admin access required" ? 403 :
      message === "Unauthorized" || message === "User not found" ? 401 :
      message === "Staff letter not found" ? 404 :
      400;
    return NextResponse.json({ error: message }, { status });
  }
}
