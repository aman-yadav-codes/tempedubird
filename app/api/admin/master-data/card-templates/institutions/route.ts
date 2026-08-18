import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { getPagination } from "@/lib/queries/pagination";

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const url = new URL(req.url);
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit")
    );
    const search = url.searchParams.get("search")?.trim() ?? "";
    const searchValue = `%${search}%`;
    const isPlatformAdmin = isPlatformAdminUser(currentUser);
    const allowedInstitutionIds = isPlatformAdmin
      ? []
      : currentUser.memberships
          .filter((membership) =>
            membership.permissions.includes("*") ||
            membership.permissions.includes("content.card_templates.create")
          )
          .map((membership) => membership.institution_id);

    const result = await db.query<{
      id: number;
      name: string;
      total: number;
    }>(
      `
        SELECT
          ip.id,
          COALESCE(ip.name, ip.slug, 'Institution ' || ip.id::text) AS name,
          COUNT(*) OVER()::int AS total
        FROM institution_profiles ip
        WHERE ip.is_active = TRUE
          AND COALESCE(ip.is_deleted, FALSE) = FALSE
          AND (
            $1 = ''
            OR ip.name ILIKE $2
            OR ip.slug ILIKE $2
          )
          AND ($5::boolean OR ip.id = ANY($6::int[]))
        ORDER BY COALESCE(ip.name, ip.slug), ip.id
        LIMIT $3 OFFSET $4
      `,
      [search, searchValue, limit, offset, isPlatformAdmin, allowedInstitutionIds]
    );

    const total = Number(result.rows[0]?.total ?? 0);
    return NextResponse.json({
      data: result.rows.map(({ id, name }) => ({ id, name })),
      hasMore: offset + result.rows.length < total,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch institutions";
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
