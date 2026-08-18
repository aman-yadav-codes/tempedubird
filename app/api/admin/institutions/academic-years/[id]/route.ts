import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/auth";
import { assertCanAccessInstitution } from "@/lib/auth/institution-scope";
import { db } from "@/lib/db/db";
import { academicYearSchema } from "@/lib/validations/student-records.schema";

function toSqlDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function errorMessage(err: unknown) {
  return err instanceof Error ? err.message : "Something went wrong";
}

async function getInstitutionId(id: number) {
  const result = await db.query<{ institution_id: number }>(
    `SELECT ay.institution_id
       FROM academic_years ay
       INNER JOIN institution_profiles ip
          ON ip.id = ay.institution_id
         AND COALESCE(ip.is_deleted, FALSE) = FALSE
         AND ip.is_active = TRUE
      WHERE ay.id = $1
        AND COALESCE(ay.is_deleted, FALSE) = FALSE`,
    [id]
  );
  return result.rows[0]?.institution_id ?? null;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin(req);
    const { id } = await ctx.params;
    const academicYearId = Number(id);
    if (!Number.isInteger(academicYearId) || academicYearId <= 0) {
      return NextResponse.json({ error: "Invalid academic year id" }, { status: 400 });
    }

    const existingInstitutionId = await getInstitutionId(academicYearId);
    if (!existingInstitutionId) return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
    assertCanAccessInstitution(currentUser, existingInstitutionId);

    const parsed = academicYearSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", issues: parsed.error.flatten().fieldErrors }, { status: 422 });
    }
    assertCanAccessInstitution(currentUser, parsed.data.institutionId);

    const result = await db.query(
      `
        UPDATE academic_years
        SET institution_id = $1,
            name = $2,
            start_date = $3,
            end_date = $4,
            is_active = $5,
            updated_by = $6,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $7
        RETURNING *
      `,
      [
        parsed.data.institutionId,
        parsed.data.name,
        toSqlDate(parsed.data.startDate),
        toSqlDate(parsed.data.endDate),
        parsed.data.isActive,
        currentUser.id,
        academicYearId,
      ]
    );

    return NextResponse.json({ data: result.rows[0] });
  } catch (err: unknown) {
    const message = errorMessage(err);
    const code = typeof err === "object" && err && "code" in err ? String((err as { code?: unknown }).code) : "";
    if (code === "23505") return NextResponse.json({ error: "Academic year already exists for this institution" }, { status: 409 });
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAdmin(req);
    const { id } = await ctx.params;
    const academicYearId = Number(id);
    if (!Number.isInteger(academicYearId) || academicYearId <= 0) {
      return NextResponse.json({ error: "Invalid academic year id" }, { status: 400 });
    }

    const existingInstitutionId = await getInstitutionId(academicYearId);
    if (!existingInstitutionId) return NextResponse.json({ error: "Academic year not found" }, { status: 404 });
    assertCanAccessInstitution(currentUser, existingInstitutionId);

    await db.query(
      `UPDATE academic_years
          SET is_deleted = TRUE,
              deleted_at = NOW(),
              is_active = FALSE,
              updated_by = $2,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
          AND COALESCE(is_deleted, FALSE) = FALSE`,
      [academicYearId, currentUser.id]
    );
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = errorMessage(err);
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
