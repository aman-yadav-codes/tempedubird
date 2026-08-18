import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { slugify } from "@/lib/utils/slug";

type Context = {
  params: Promise<{ id: string }>;
};

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
  `);
}

function parseTargetAudience(value: unknown) {
  const targetAudience = String(value ?? "student").trim().toLowerCase();
  if (!TARGET_AUDIENCES.has(targetAudience)) throw new Error("Select who this category is for");
  return targetAudience;
}

function parseId(value: string) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("Invalid card category id");
  return id;
}

async function buildUniqueSlug(name: string, id: number) {
  const baseSlug = slugify(name);
  if (!baseSlug) throw new Error("A valid category name is required");

  const result = await db.query<{ slug: string }>(
    `SELECT slug FROM card_categories WHERE id <> $1 AND (slug = $2 OR slug LIKE $3)`,
    [id, baseSlug, `${baseSlug}-%`]
  );
  const used = new Set(result.rows.map((row) => row.slug));
  if (!used.has(baseSlug)) return baseSlug;

  let suffix = 2;
  while (used.has(`${baseSlug}-${suffix}`)) suffix += 1;
  return `${baseSlug}-${suffix}`;
}

export async function PATCH(req: Request, context: Context) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureCardCategoryAudienceSchema();
    const { id: idValue } = await context.params;
    const id = parseId(idValue);
    const body = await req.json();

    if (typeof body.is_active === "boolean") {
      const result = await db.query(
        `
          UPDATE card_categories
          SET is_active = $2,
              updated_by = $3,
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING *
        `,
        [id, body.is_active, currentUser.id]
      );
      if (!result.rowCount) return NextResponse.json({ error: "Card category not found" }, { status: 404 });
      return NextResponse.json({ data: result.rows[0] });
    }

    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim() || null;
    const targetAudience = parseTargetAudience(body.target_audience);
    if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    const slug = await buildUniqueSlug(name, id);

    const result = await db.query(
      `
        UPDATE card_categories
        SET name = $2,
            slug = $3,
            description = $4,
            target_audience = $5,
            updated_by = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING *
      `,
      [id, name, slug, description, targetAudience, currentUser.id]
    );
    if (!result.rowCount) return NextResponse.json({ error: "Card category not found" }, { status: 404 });
    return NextResponse.json({ data: result.rows[0] });
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

export async function DELETE(req: Request, context: Context) {
  try {
    await requireAdmin(req);
    await ensureCardCategoryAudienceSchema();
    const { id: idValue } = await context.params;
    const id = parseId(idValue);

    const result = await db.query(
      `DELETE FROM card_categories WHERE id = $1 RETURNING id`,
      [id]
    );
    if (!result.rowCount) return NextResponse.json({ error: "Card category not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      err.code === "23503"
    ) {
      return NextResponse.json(
        { error: "This category is already in use. Disable it instead of deleting it." },
        { status: 409 }
      );
    }
    return errorResponse(err);
  }
}
