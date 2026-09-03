import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { ensureSubjectsSchemaAndDeduplicate } from "@/lib/queries/subjects";

export type SubjectSuggestion = {
  id: number;
  name: string;
  code: string | null;
  slug: string;
  icon_url: string | null;
};

export async function GET(req: Request) {
  try {
    await requireAdmin(req);
    await ensureSubjectsSchemaAndDeduplicate(db);

    const url = new URL(req.url);
    const search = (url.searchParams.get("search") || "").trim();

    const params: unknown[] = [];
    let where = "WHERE is_deleted = FALSE";

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (name ILIKE $${params.length} OR code ILIKE $${params.length} OR slug ILIKE $${params.length})`;
    }

    const query = `
      SELECT DISTINCT ON (LOWER(TRIM(name)))
        id,
        name,
        code,
        slug,
        icon_url
      FROM subjects
      ${where}
      ORDER BY LOWER(TRIM(name)), id ASC
      LIMIT 50
    `;

    const result = await db.query<SubjectSuggestion>(query, params);

    return NextResponse.json({
      data: result.rows,
    });
  } catch (err: any) {
    const status = err.message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: err.message }, { status });
  }
}
