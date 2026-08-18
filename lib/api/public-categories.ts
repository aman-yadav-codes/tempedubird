import { NextResponse } from "next/server";

import { db } from "@/lib/db/db";
import { getInstitutionTenantByHost, getRequestHost } from "@/lib/tenancy/institution-domain";

function getPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function handlePublicCategoriesGet(req: Request) {
  const url = new URL(req.url);
  const page = getPositiveInt(url.searchParams.get("page"), 1);
  const limit = Math.min(getPositiveInt(url.searchParams.get("limit"), 50), 100);
  const offset = (page - 1) * limit;
  const search = url.searchParams.get("search")?.trim() || "";
  const tenant = await getInstitutionTenantByHost(db, getRequestHost(req));

  const where = ["c.is_deleted = FALSE", "c.is_active = TRUE", "c.depth = 1"];
  const params: unknown[] = [];

  if (tenant) {
    params.push(tenant.institution_id);
    where.push(`EXISTS (
      SELECT 1
      FROM institution_programs ip
      JOIN program_categories pc ON pc.program_id = ip.id
      JOIN categories child ON child.id = pc.category_id
      LEFT JOIN category_closure cc ON cc.descendant_id = child.id
      WHERE ip.institution_id = $${params.length}
        AND COALESCE(ip.is_deleted, FALSE) = FALSE
        AND ip.is_active = TRUE
        AND COALESCE(child.is_deleted, FALSE) = FALSE
        AND child.is_active = TRUE
        AND COALESCE(cc.ancestor_id, CASE WHEN child.depth = 1 THEN child.id END) = c.id
    )`);
  }

  if (search) {
    params.push(`%${search}%`);
    where.push(`(c.name ILIKE $${params.length} OR c.slug ILIKE $${params.length})`);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `
        SELECT id, name, slug
        FROM categories c
        ${whereSql}
        ORDER BY
          NULLIF(REGEXP_REPLACE(c.name, '[^0-9]', '', 'g'), '')::NUMERIC ASC NULLS LAST,
          c.name ASC,
          c.id ASC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `,
      [...params, limit, offset],
    ),
    db.query<{ count: number }>(
      `
        SELECT COUNT(*)::int AS count
        FROM categories c
        ${whereSql}
      `,
      params,
    ),
  ]);

  const total = Number(countResult.rows[0]?.count ?? 0);

  return NextResponse.json({
    data: dataResult.rows,
    pageCount: Math.ceil(total / limit),
    total,
  });
}
