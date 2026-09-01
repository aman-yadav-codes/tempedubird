import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { isInstitutionAdminUser, isPlatformAdminUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import { ensureAcademicSessionSchema, syncInstitutionAcademicYearsFromTemplates } from "@/lib/queries/academic-sessions";
import { getPageCount, getPagination } from "@/lib/queries/pagination";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function toDate(value: unknown) {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function todaySqlDate() {
  return new Date().toISOString().slice(0, 10);
}

function currentYearStartSqlDate() {
  return `${new Date().getFullYear()}-01-01`;
}

function isPastSession(endDate: string) {
  return endDate < todaySqlDate();
}

export async function GET(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    await ensureAcademicSessionSchema(db);
    const url = new URL(req.url);
    const { limit, offset } = getPagination(url.searchParams.get("page"), url.searchParams.get("limit"));
    const search = url.searchParams.get("search")?.trim() || "";
    const activeOnly = url.searchParams.get("activeOnly") === "true";
    const filters: string[] = [];
    const params: unknown[] = [];

    if (search) {
      params.push(`%${search}%`);
      filters.push(`name ILIKE $${params.length}`);
    }
    if (activeOnly) filters.push("is_active = TRUE");

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const [dataResult, countResult] = await Promise.all([
      db.query(
        `
          SELECT id, name, start_date, end_date, is_active, created_at, updated_at
          FROM academic_session_templates
          ${where}
          ORDER BY start_date DESC, id DESC
          LIMIT $${params.length + 1} OFFSET $${params.length + 2}
        `,
        [...params, limit, offset]
      ),
      db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM academic_session_templates ${where}`,
        params
      ),
    ]);

    const total = Number(countResult.rows[0]?.count || 0);
    return NextResponse.json({ data: dataResult.rows, total, pageCount: getPageCount(total, limit) });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    if (!isPlatformAdminUser(currentUser) && !isInstitutionAdminUser(currentUser)) {
      return NextResponse.json({ error: "Admin access required to create sessions" }, { status: 403 });
    }
    await ensureAcademicSessionSchema(db);
    const body = await req.json();
    const name = String(body.name || "").trim();
    const startDate = toDate(body.startDate);
    const endDate = toDate(body.endDate);
    if (!name || !startDate || !endDate) {
      return NextResponse.json({ error: "Name, start date and end date are required" }, { status: 422 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 422 });
    }
    if (startDate < currentYearStartSqlDate()) {
      return NextResponse.json({ error: "Previous years cannot be selected" }, { status: 422 });
    }
    if (isPastSession(endDate)) {
      return NextResponse.json({ error: "Past sessions cannot be created" }, { status: 422 });
    }

    const result = await db.query(
      `
        INSERT INTO academic_session_templates (
          name, start_date, end_date, is_active, created_by, updated_by
        )
        VALUES ($1, $2, $3, $4, $5, $5)
        RETURNING *
      `,
      [name, startDate, endDate, body.isActive !== false, currentUser.id]
    );
    await syncInstitutionAcademicYearsFromTemplates(db, [], currentUser.id);
    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    return NextResponse.json(
      { error: code === "23505" ? "A session with this name already exists" : errorMessage(error) },
      { status: code === "23505" ? 409 : 400 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    if (!isPlatformAdminUser(currentUser) && !isInstitutionAdminUser(currentUser)) {
      return NextResponse.json({ error: "Admin access required to update sessions" }, { status: 403 });
    }
    await ensureAcademicSessionSchema(db);
    const body = await req.json();
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
    }
    const previousResult = await db.query<{ start_date: string; end_date: string }>(
      `SELECT start_date, end_date FROM academic_session_templates WHERE id = $1`,
      [id]
    );
    const previous = previousResult.rows[0];
    if (!previous) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const fields: string[] = [];
    const params: unknown[] = [];
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Session name is required" }, { status: 422 });
      params.push(name);
      fields.push(`name = $${params.length}`);
    }
    if (body.startDate !== undefined) {
      const date = toDate(body.startDate);
      if (!date) return NextResponse.json({ error: "Invalid start date" }, { status: 422 });
      params.push(date);
      fields.push(`start_date = $${params.length}`);
    }
    if (body.endDate !== undefined) {
      const date = toDate(body.endDate);
      if (!date) return NextResponse.json({ error: "Invalid end date" }, { status: 422 });
      params.push(date);
      fields.push(`end_date = $${params.length}`);
    }
    if (typeof body.isActive === "boolean") {
      params.push(body.isActive);
      fields.push(`is_active = $${params.length}`);
    }
    const nextStartDate = body.startDate !== undefined ? toDate(body.startDate) : toDate(previous.start_date);
    const nextEndDate = body.endDate !== undefined ? toDate(body.endDate) : toDate(previous.end_date);
    if (!nextStartDate || !nextEndDate) {
      return NextResponse.json({ error: "Invalid session dates" }, { status: 422 });
    }
    if (nextEndDate < nextStartDate) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 422 });
    }
    if (nextStartDate < currentYearStartSqlDate()) {
      return NextResponse.json({ error: "Previous years cannot be selected" }, { status: 422 });
    }
    if (isPastSession(nextEndDate)) {
      return NextResponse.json({ error: "Past sessions cannot be saved" }, { status: 422 });
    }
    params.push(currentUser.id);
    fields.push(`updated_by = $${params.length}`, "updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    const result = await db.query(
      `UPDATE academic_session_templates SET ${fields.join(", ")} WHERE id = $${params.length} RETURNING *`,
      params
    );
    if (!result.rows[0]) return NextResponse.json({ error: "Session not found" }, { status: 404 });

    await db.query(
      `
        UPDATE academic_years ay
        SET name = ast.name,
            start_date = CASE
              WHEN ay.start_date = $2::date AND ay.end_date = $3::date THEN ast.start_date
              ELSE ay.start_date
            END,
            end_date = CASE
              WHEN ay.start_date = $2::date AND ay.end_date = $3::date THEN ast.end_date
              ELSE ay.end_date
            END,
            updated_at = CURRENT_TIMESTAMP
        FROM academic_session_templates ast
        WHERE ay.session_template_id = ast.id AND ast.id = $1
      `,
      [id, previous.start_date, previous.end_date]
    );
    return NextResponse.json({ data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    if (!isPlatformAdminUser(currentUser) && !isInstitutionAdminUser(currentUser)) {
      return NextResponse.json({ error: "Admin access required to delete sessions" }, { status: 403 });
    }
    await ensureAcademicSessionSchema(db);
    const id = Number(new URL(req.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
    }
    await db.query(`DELETE FROM academic_session_templates WHERE id = $1`, [id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? String(error.code) : "";
    return NextResponse.json(
      { error: code === "23503" ? "This session is already used by an institution and cannot be deleted" : errorMessage(error) },
      { status: code === "23503" ? 409 : 400 }
    );
  }
}
