import { NextResponse } from "next/server";

import { db } from "@/lib/db/db";
import { requireAdmin } from "@/lib/auth/auth";

export async function GET(req: Request) {
    try {
        await requireAdmin(req);

        const url = new URL(req.url);

        const type = url.searchParams.get("type") || "mixed";
        const search = url.searchParams.get("search")?.trim() || "";
        const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
        const limit = Math.max(1, Number(url.searchParams.get("limit")) || 20);
        const offset = (page - 1) * limit;
        const categoryIds = (url.searchParams.get("categoryIds") || "")
            .split(",")
            .map((value) => Number(value.trim()))
            .filter((value) => Number.isInteger(value) && value > 0);
        const boardIdParam = url.searchParams.get("boardId");
        const boardIdValue = boardIdParam ? Number(boardIdParam) : null;
        const boardId = boardIdValue && Number.isInteger(boardIdValue) && boardIdValue > 0 ? boardIdValue : null;

        const searchId =
            /^\d+$/.test(search)
                ? Number(search)
                : null;

        if (type === "subject") {
            const result = await db.query(
                `
    WITH RECURSIVE selected_categories AS (
        SELECT c.id
        FROM categories c
        WHERE c.id = ANY($3::int[])
          AND c.is_deleted = FALSE

        UNION ALL

        SELECT child.id
        FROM categories child
        INNER JOIN selected_categories parent
            ON parent.id = child.parent_id
        WHERE child.is_deleted = FALSE
    )
    SELECT
        s.id,
        s.name,
        s.slug,
        s.category_id AS parent_id,
        s.category_id AS category_id,
        s.board_id AS board_id,
        4 AS depth,
        'subject' AS type,

        (
            SELECT string_agg(c2.name, ' → ' ORDER BY cc.depth DESC)
            FROM category_closure cc
            INNER JOIN categories c2
                ON c2.id = cc.ancestor_id
            WHERE cc.descendant_id = s.category_id
        ) || ' → ' || (
            SELECT b.name
            FROM boards b
            WHERE b.id = s.board_id
        ) || ' → ' || s.name AS breadcrumb,

        ARRAY(
            SELECT id
            FROM (
                SELECT ancestor_id AS id, cc.depth
                FROM category_closure cc
                WHERE cc.descendant_id = s.category_id

                UNION ALL

                SELECT s.category_id AS id, -1
            ) x
            ORDER BY depth DESC
        ) AS category_path_ids

    FROM subjects s

    WHERE s.is_deleted = FALSE
      AND (
        $1 = ''
        OR s.name ILIKE '%' || $1 || '%'
        OR s.slug ILIKE '%' || $1 || '%'
        OR ($2::int IS NOT NULL AND s.id = $2)
      )
      AND (
        COALESCE(array_length($3::int[], 1), 0) = 0
        OR s.category_id IN (SELECT id FROM selected_categories)
      )
      AND ($6::int IS NULL OR s.board_id = $6)

    ORDER BY s.name ASC

    LIMIT $4 OFFSET $5
    `,
                [search, searchId, categoryIds, limit, offset, boardId]
            );

            if (result.rows.length === 0 && categoryIds.length > 0 && !boardId) {
                const leafCategories = await db.query(
                    `
    WITH RECURSIVE selected_categories AS (
        SELECT c.id
        FROM categories c
        WHERE c.id = ANY($3::int[])
          AND c.is_deleted = FALSE

        UNION ALL

        SELECT child.id
        FROM categories child
        INNER JOIN selected_categories parent
            ON parent.id = child.parent_id
        WHERE child.is_deleted = FALSE
    )
    SELECT
        c.id,
        c.name,
        c.slug,
        c.parent_id,
        c.id AS category_id,
        NULL::int AS board_id,
        c.depth,
        'category_subject' AS type,
        (
            SELECT string_agg(c2.name, ' -> ' ORDER BY cc.depth DESC)
            FROM category_closure cc
            INNER JOIN categories c2
                ON c2.id = cc.ancestor_id
            WHERE cc.descendant_id = c.id
        ) AS breadcrumb,
        ARRAY(
            SELECT ancestor_id
            FROM category_closure cc
            WHERE cc.descendant_id = c.id
              AND cc.depth > 0
            ORDER BY cc.depth DESC
        ) AS category_path_ids
    FROM categories c
    WHERE c.id IN (SELECT id FROM selected_categories)
      AND c.is_deleted = FALSE
      AND c.is_active = TRUE
      AND NOT EXISTS (
        SELECT 1
        FROM categories child
        WHERE child.parent_id = c.id
          AND child.is_deleted = FALSE
      )
      AND (
        $1 = ''
        OR c.name ILIKE '%' || $1 || '%'
        OR c.slug ILIKE '%' || $1 || '%'
        OR ($2::int IS NOT NULL AND c.id = $2)
      )
    ORDER BY c.name ASC
    LIMIT $4 OFFSET $5
    `,
                    [search, searchId, categoryIds, limit, offset]
                );

                return NextResponse.json({
                    data: leafCategories.rows,
                    pageCount: leafCategories.rows.length < limit ? page : page + 1,
                });
            }

            return NextResponse.json({
                data: result.rows,
                pageCount: result.rows.length < limit ? page : page + 1,
            });
        }

        if (!search) {
            return NextResponse.json({
                data: [],
            });
        }

        const result = await db.query(
            `
    SELECT * FROM (

        -- CATEGORIES
        SELECT
            c.id,
            c.name,
            c.slug,

            c.parent_id AS parent_id,
            c.id AS category_id,
            NULL::int AS board_id,

            c.depth,
          'category' AS type,

(
    SELECT string_agg(
        c2.name,
        ' → '
        ORDER BY cc.depth DESC
    )
    FROM category_closure cc
    INNER JOIN categories c2
        ON c2.id = cc.ancestor_id
    WHERE cc.descendant_id = c.id
) AS breadcrumb,

            ARRAY(
                SELECT ancestor_id
                FROM category_closure cc
                WHERE cc.descendant_id = c.id
                  AND cc.depth > 0
                ORDER BY cc.depth DESC
            ) AS category_path_ids

        FROM categories c

        WHERE c.is_deleted = FALSE
                    AND (
                        c.name ILIKE '%' || $1 || '%'
                        OR c.slug ILIKE '%' || $1 || '%'
                        OR ($2::int IS NOT NULL AND c.id = $2)
                    )


        UNION ALL


        -- BOARDS
        SELECT
            b.id,
            b.name,
            b.slug,

            cb.category_id AS parent_id,
            cb.category_id AS category_id,
            b.id AS board_id,

            3 AS depth,
           'board' AS type,

(
    SELECT string_agg(
        c2.name,
        ' → '
        ORDER BY cc.depth DESC
    )
    FROM category_closure cc
    INNER JOIN categories c2
        ON c2.id = cc.ancestor_id
    WHERE cc.descendant_id = cb.category_id
) || ' → ' || b.name AS breadcrumb,

          ARRAY(
    SELECT id
    FROM (
        SELECT ancestor_id AS id, cc.depth
        FROM category_closure cc
        WHERE cc.descendant_id = cb.category_id

        UNION ALL

        SELECT cb.category_id AS id, -1
    ) x
    ORDER BY depth DESC
) AS category_path_ids

        FROM boards b

        INNER JOIN category_boards cb
            ON cb.board_id = b.id

        WHERE b.is_deleted = FALSE
                    AND (
                        b.name ILIKE '%' || $1 || '%'
                        OR b.slug ILIKE '%' || $1 || '%'
                        OR ($2::int IS NOT NULL AND b.id = $2)
                    )


        UNION ALL


        -- SUBJECTS
        SELECT
            s.id,
            s.name,
            s.slug,

            s.category_id AS parent_id,
            s.category_id AS category_id,
            s.board_id AS board_id,

            4 AS depth,
         'subject' AS type,

(
    SELECT string_agg(
        c2.name,
        ' → '
        ORDER BY cc.depth DESC
    )
    FROM category_closure cc
    INNER JOIN categories c2
        ON c2.id = cc.ancestor_id
    WHERE cc.descendant_id = s.category_id
) || ' → ' || (
    SELECT b.name
    FROM boards b
    WHERE b.id = s.board_id
) || ' → ' || s.name AS breadcrumb,

           ARRAY(
    SELECT id
    FROM (
        SELECT ancestor_id AS id, cc.depth
        FROM category_closure cc
        WHERE cc.descendant_id = s.category_id

        UNION ALL

        SELECT s.category_id AS id, -1
    ) x
    ORDER BY depth DESC
) AS category_path_ids
        FROM subjects s

        WHERE s.is_deleted = FALSE
                    AND (
                        s.name ILIKE '%' || $1 || '%'
                        OR s.slug ILIKE '%' || $1 || '%'
                        OR ($2::int IS NOT NULL AND s.id = $2)
                    )

    ) x

    ORDER BY depth ASC, name ASC

    LIMIT $3 OFFSET $4
    `,
            [search, searchId, limit, offset]
        );

        return NextResponse.json({
            data: result.rows,
            pageCount: result.rows.length < limit ? page : page + 1,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Internal server error";
        return NextResponse.json(
            {
                error: message,
            },
            { status: 500 }
        );
    }
}
