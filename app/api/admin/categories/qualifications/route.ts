import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";

export async function GET(req: Request) {
    try {
        await requireAdmin(req);

        const url = new URL(req.url);

        const page =
            Number(url.searchParams.get("page")) || 1;

        const limit =
            Number(url.searchParams.get("limit")) || 10;

        const offset = (page - 1) * limit;

        const search =
            url.searchParams.get("search")?.trim() || "";

        const params: unknown[] = [];
        const where: string[] = [
            `c.is_active = true`,
            `NOT EXISTS (
        SELECT 1
        FROM categories child
        WHERE child.parent_id = c.id
      )`,
        ];

        if (search) {
            params.push(search);

            where.push(`
                LOWER(
                    REGEXP_REPLACE(
                    c.name,
                    '[^a-zA-Z0-9]',
                    '',
                    'g'
                    )
                )
                ILIKE
                CONCAT(
                    '%',
                    LOWER(
                    REGEXP_REPLACE(
                        $${params.length},
                        '[^a-zA-Z0-9]',
                        '',
                        'g'
                    )
                    ),
                    '%'
                )
                `);
        }

        const whereSql = `
      WHERE ${where.join(" AND ")}
    `;

        const countResult = await db.query<{
            total: string;
        }>(
            `
      SELECT COUNT(*)::int AS total
      FROM categories c
      ${whereSql}
      `,
            params
        );

        const total = Number(
            countResult.rows[0]?.total ?? 0
        );

        const result = await db.query(
            `
      SELECT
        c.id,
        c.name,
        c.slug
      FROM categories c
      ${whereSql}
      ORDER BY c.name ASC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
      `,
            [...params, limit, offset]
        );

        return NextResponse.json({
            data: result.rows,
            total,
            pageCount: Math.ceil(total / limit),
        });
    } catch (err: any) {
        return NextResponse.json(
            {
                error:
                    err.message ||
                    "Something went wrong",
            },
            {
                status:
                    err.message ===
                        "Forbidden: Admin access required"
                        ? 403
                        : 400,
            }
        );
    }
}