import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { applyInstitutionScope, assertCanAccessInstitution, assertRowsWithinInstitutionScope } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import { syncInstitutionAcademicYearsFromTemplates } from "@/lib/queries/academic-sessions";
import { getPageCount, getPagination } from "@/lib/queries/pagination";
import { academicYearSchema } from "@/lib/validations/student-records.schema";

function toSqlDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function todaySqlDate() {
  return new Date().toISOString().slice(0, 10);
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const url = new URL(req.url);
    const { limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
    const search = url.searchParams.get("search")?.trim() || "";
    const activeOnly = url.searchParams.get("activeOnly") === "true";
    const currentOnly = url.searchParams.get("currentOnly") === "true";
    const pastOrCurrentOnly = url.searchParams.get("pastOrCurrentOnly") === "true";
    const institutionId = url.searchParams.get("institutionId") ? Number(url.searchParams.get("institutionId")) : undefined;
    const scoped = applyInstitutionScope<{ institutionId?: number; institutionIds?: number[]; limit: number; offset: number }>(
      { institutionId, limit, offset },
      currentUser
    );
    const syncInstitutionIds = scoped.institutionIds ?? (scoped.institutionId ? [scoped.institutionId] : []);
    await syncInstitutionAcademicYearsFromTemplates(db, syncInstitutionIds, currentUser.id);

    const filters: string[] = [
      "COALESCE(ay.is_deleted, FALSE) = FALSE",
      "COALESCE(ip.is_deleted, FALSE) = FALSE",
      "ip.is_active = TRUE",
    ];
    const params: unknown[] = [];
    if (search) {
      params.push(`%${search}%`);
      filters.push(`(ay.name ILIKE $${params.length} OR ip.name ILIKE $${params.length})`);
    }
    if (activeOnly) {
      filters.push("ay.is_active = TRUE");
    }
    if (currentOnly) {
      params.push(todaySqlDate());
      filters.push(`ay.start_date <= $${params.length}::date AND ay.end_date >= $${params.length}::date`);
    }
    if (pastOrCurrentOnly) {
      params.push(todaySqlDate());
      filters.push(`ay.start_date <= $${params.length}::date`);
    }
    if (scoped.institutionIds?.length) {
      params.push(scoped.institutionIds);
      filters.push(`ay.institution_id = ANY($${params.length}::int[])`);
    } else if (scoped.institutionIds && scoped.institutionIds.length === 0) {
      filters.push("FALSE");
    } else if (scoped.institutionId) {
      params.push(scoped.institutionId);
      filters.push(`ay.institution_id = $${params.length}`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const dataParams = [...params, limit, offset];
    const [dataResult, countResult] = await Promise.all([
      db.query(
        `
          SELECT
            ay.id,
            ay.institution_id,
            ip.name AS institution_name,
            ay.name,
            ay.start_date,
            ay.end_date,
            ay.is_active,
            ip.default_academic_year_id AS institution_default_academic_year_id,
            ay.created_at,
            ay.updated_at
          FROM academic_years ay
          INNER JOIN institution_profiles ip ON ip.id = ay.institution_id
          ${where}
          ORDER BY ay.start_date DESC, ay.id DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
        dataParams
      ),
      db.query<{ count: string }>(
        `
          SELECT COUNT(*)::text AS count
          FROM academic_years ay
          INNER JOIN institution_profiles ip ON ip.id = ay.institution_id
          ${where}
        `,
        params
      ),
    ]);

    const total = Number(countResult.rows[0]?.count ?? 0);
    return NextResponse.json({ data: dataResult.rows, total, pageCount: getPageCount(total, limit) });
  } catch (err: unknown) {
    const message = errorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const parsed = academicYearSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten().fieldErrors }, { status: 422 });
    }

    assertCanAccessInstitution(currentUser, parsed.data.institutionId);
    const result = await db.query(
      `
        INSERT INTO academic_years (institution_id, name, start_date, end_date, is_active, created_by, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $6)
        RETURNING *
      `,
      [
        parsed.data.institutionId,
        parsed.data.name,
        toSqlDate(parsed.data.startDate),
        toSqlDate(parsed.data.endDate),
        parsed.data.isActive,
        currentUser.id,
      ]
    );

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (err: unknown) {
    const message = errorMessage(err);
    const code = typeof err === "object" && err && "code" in err ? String((err as { code?: unknown }).code) : "";
    if (code === "23505") return NextResponse.json({ error: "Academic year already exists for this institution" }, { status: 409 });
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json();
    const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter((id: number) => Number.isInteger(id) && id > 0) : [];
    if (!ids.length) return NextResponse.json({ error: "ids must be an array" }, { status: 400 });

    await assertRowsWithinInstitutionScope(db, currentUser, "academic_years", ids);

    if (typeof body.isActive === "boolean") {
      await db.query(
        `UPDATE academic_years SET is_active = $1, updated_by = $2, updated_at = CURRENT_TIMESTAMP WHERE id = ANY($3::int[])`,
        [body.isActive, currentUser.id, ids]
      );
    }
    if (body.delete === true) {
      await db.query(
        `UPDATE academic_years
            SET is_deleted = TRUE,
                deleted_at = NOW(),
                is_active = FALSE,
                updated_by = $2,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::int[])
            AND COALESCE(is_deleted, FALSE) = FALSE`,
        [ids, currentUser.id]
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = errorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
