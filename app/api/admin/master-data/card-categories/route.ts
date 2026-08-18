import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPageCount, getPagination } from "@/lib/queries/pagination";
import { slugify } from "@/lib/utils/slug";

const TARGET_AUDIENCES = new Set(["student", "staff"]);

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

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'card_categories_target_audience_check'
      ) THEN
        ALTER TABLE card_categories
          ADD CONSTRAINT card_categories_target_audience_check
          CHECK (target_audience IN ('student', 'staff'));
      END IF;
    END $$;

    UPDATE card_categories
    SET
      target_audience = CASE
        WHEN slug IN ('offer-letter', 'joining-letter', 'experience-letter', 'salary-slip') THEN 'staff'
        ELSE 'student'
      END,
      name = CASE
        WHEN slug = 'offer-letter' AND name NOT ILIKE '%staff%' THEN 'Offer Letter - Staff'
        WHEN slug = 'joining-letter' AND name NOT ILIKE '%staff%' THEN 'Joining Letter - Staff'
        WHEN slug = 'experience-letter' AND name NOT ILIKE '%staff%' THEN 'Experience Letter - Staff'
        WHEN slug = 'salary-slip' AND name NOT ILIKE '%staff%' THEN 'Salary Slip - Staff'
        WHEN slug = 'achievement-certificate' AND name NOT ILIKE '%student%' THEN 'Achievement Certificate - Student'
        ELSE name
      END,
      updated_at = CURRENT_TIMESTAMP
    WHERE slug IN ('offer-letter', 'joining-letter', 'experience-letter', 'salary-slip', 'achievement-certificate');

    INSERT INTO card_categories (name, slug, description, target_audience)
    VALUES
      ('Offer Letter - Staff', 'offer-letter', 'Staff offer and appointment letters for teachers and drivers', 'staff'),
      ('Offer Letter - Student', 'offer-letter-student', 'Student offer or admission letters', 'student'),
      ('Joining Letter - Staff', 'joining-letter-staff', 'Staff joining letters for teachers and drivers', 'staff'),
      ('Achievement Certificate - Staff', 'achievement-certificate-staff', 'Staff achievement certificates', 'staff'),
      ('Achievement Certificate - Student', 'achievement-certificate', 'Student achievement certificates', 'student')
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      target_audience = EXCLUDED.target_audience,
      updated_at = CURRENT_TIMESTAMP;
  `);
}

function parseTargetAudience(value: unknown) {
  const targetAudience = String(value ?? "student").trim().toLowerCase();
  if (!TARGET_AUDIENCES.has(targetAudience)) throw new Error("Select who this category is for");
  return targetAudience;
}

async function buildUniqueSlug(name: string) {
  const baseSlug = slugify(name);
  if (!baseSlug) throw new Error("A valid category name is required");

  const result = await db.query<{ slug: string }>(
    `SELECT slug FROM card_categories WHERE slug = $1 OR slug LIKE $2`,
    [baseSlug, `${baseSlug}-%`]
  );
  const used = new Set(result.rows.map((row) => row.slug));
  if (!used.has(baseSlug)) return baseSlug;

  let suffix = 2;
  while (used.has(`${baseSlug}-${suffix}`)) suffix += 1;
  return `${baseSlug}-${suffix}`;
}

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    await ensureCardCategoryAudienceSchema();
    const url = new URL(req.url);
    const { page, limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search")?.trim() ?? "";
    const searchValue = `%${search}%`;

    const [dataResult, countResult, statsResult] = await Promise.all([
      db.query(
        `
          SELECT
            cc.id,
            cc.name,
            cc.slug,
            cc.description,
            cc.target_audience,
            cc.is_active,
            cc.created_by,
            cc.updated_by,
            cc.created_at,
            cc.updated_at,
            creator.full_name AS created_by_name,
            updater.full_name AS updated_by_name
          FROM card_categories cc
          LEFT JOIN users creator ON creator.id = cc.created_by
          LEFT JOIN users updater ON updater.id = cc.updated_by
          WHERE ($3 = '' OR cc.name ILIKE $4 OR cc.slug ILIKE $4 OR COALESCE(cc.description, '') ILIKE $4)
          ORDER BY cc.name ASC
          LIMIT $1 OFFSET $2
        `,
        [limit, offset, search, searchValue]
      ),
      db.query<{ count: string }>(
        `
          SELECT COUNT(*)
          FROM card_categories cc
          WHERE ($1 = '' OR cc.name ILIKE $2 OR cc.slug ILIKE $2 OR COALESCE(cc.description, '') ILIKE $2)
        `,
        [search, searchValue]
      ),
      db.query<{
        total: string;
        active: string;
        disabled: string;
      }>(`
        SELECT
          COUNT(*)::text AS total,
          COUNT(*) FILTER (WHERE is_active = TRUE)::text AS active,
          COUNT(*) FILTER (WHERE is_active = FALSE)::text AS disabled
        FROM card_categories
      `),
    ]);

    const total = Number(countResult.rows[0]?.count ?? 0);
    const stats = statsResult.rows[0];
    return NextResponse.json({
      data: dataResult.rows,
      total,
      pageCount: getPageCount(total, limit),
      page,
      stats: {
        total: Number(stats?.total ?? 0),
        active: Number(stats?.active ?? 0),
        disabled: Number(stats?.disabled ?? 0),
        deleted: 0,
      },
    });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureCardCategoryAudienceSchema();
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim() || null;
    const targetAudience = parseTargetAudience(body.target_audience);

    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const slug = await buildUniqueSlug(name);

    const result = await db.query(
      `
        INSERT INTO card_categories
          (name, slug, description, target_audience, is_active, created_by, updated_by)
        VALUES ($1, $2, $3, $4, TRUE, $5, $5)
        RETURNING *
      `,
      [name, slug, description, targetAudience, currentUser.id]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "23505"
    ) {
      return NextResponse.json({ error: "A card category with this slug already exists" }, { status: 409 });
    }
    return errorResponse(err);
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureCardCategoryAudienceSchema();
    const body = await req.json();
    const ids = Array.isArray(body.ids)
      ? Array.from(
          new Set(
            body.ids
              .map(Number)
              .filter((id: number) => Number.isInteger(id) && id > 0)
          )
        )
      : [];

    if (!ids.length) {
      return NextResponse.json({ error: "Select at least one card category" }, { status: 400 });
    }
    if (typeof body.is_active !== "boolean") {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const result = await db.query(
      `
        UPDATE card_categories
        SET is_active = $2,
            updated_by = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ANY($1::int[])
        RETURNING id
      `,
      [ids, body.is_active, currentUser.id]
    );

    return NextResponse.json({ updated: result.rowCount ?? 0 });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdmin(req);
    await ensureCardCategoryAudienceSchema();
    const body = await req.json().catch(() => ({}));
    const ids = Array.isArray(body.ids)
      ? Array.from(
          new Set(
            body.ids
              .map(Number)
              .filter((id: number) => Number.isInteger(id) && id > 0)
          )
        )
      : [];

    if (!ids.length) {
      return NextResponse.json({ error: "Select at least one card category" }, { status: 400 });
    }

    const inUseResult = await db.query<{ id: number; name: string }>(
      `
        SELECT DISTINCT cc.id, cc.name
        FROM card_categories cc
        INNER JOIN student_achievements sa ON sa.card_category_id = cc.id
        WHERE cc.id = ANY($1::int[])
        ORDER BY cc.name
      `,
      [ids]
    );
    if (inUseResult.rowCount) {
      return NextResponse.json(
        {
          error: `Categories already in use cannot be deleted: ${inUseResult.rows
            .map((category) => category.name)
            .join(", ")}`,
        },
        { status: 409 }
      );
    }

    const result = await db.query(
      `DELETE FROM card_categories WHERE id = ANY($1::int[]) RETURNING id`,
      [ids]
    );
    return NextResponse.json({ deleted: result.rowCount ?? 0 });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}
