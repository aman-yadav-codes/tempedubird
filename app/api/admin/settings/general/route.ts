import { NextResponse } from "next/server";

import { getAuthenticatedUser } from "@/lib/auth/auth";
import { canAccessInstitution } from "@/lib/auth/institution-scope";
import { hasPermission, type PermissionUser } from "@/lib/auth/permissions";
import { db } from "@/lib/db/db";
import {
  ensureAcademicSessionSchema,
  syncInstitutionAcademicYearsFromTemplates,
} from "@/lib/queries/academic-sessions";

type AcademicYearRow = {
  id: number;
  institution_id: number;
  name: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

function parseDateInput(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : trimmed;
}

function parsePositiveInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function getRequestedInstitutionId(req: Request) {
  return parsePositiveInteger(new URL(req.url).searchParams.get("institutionId"));
}

function getFirstPermittedInstitutionId(user: PermissionUser, permission: string) {
  return user.memberships?.find((membership) =>
    hasPermission(user, permission, { institutionId: membership.institution_id })
  )?.institution_id ?? null;
}

function resolveInstitutionId(user: PermissionUser, permission: string, requestedInstitutionId: number | null) {
  if (requestedInstitutionId) {
    if (!canAccessInstitution(user, requestedInstitutionId)) throw new Error("Forbidden: Admin access required");
    if (!hasPermission(user, permission, { institutionId: requestedInstitutionId })) {
      throw new Error("Forbidden: Admin access required");
    }
    return requestedInstitutionId;
  }

  const institutionId = getFirstPermittedInstitutionId(user, permission);
  if (!institutionId) throw new Error("Forbidden: Admin access required");
  return institutionId;
}

async function ensureInstitutionDefaultSessionColumn() {
  await ensureAcademicSessionSchema(db);
  await db.query(`
    ALTER TABLE institution_profiles
      ADD COLUMN IF NOT EXISTS default_academic_year_id INTEGER REFERENCES academic_years(id) ON DELETE SET NULL
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_institution_profiles_default_academic_year
      ON institution_profiles(default_academic_year_id)
  `);
}

async function getAcademicYears(institutionId: number) {
  const result = await db.query<AcademicYearRow>(
    `
      SELECT id, institution_id, name, start_date, end_date, is_active
      FROM academic_years
      WHERE institution_id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE
        AND start_date <= CURRENT_DATE
      ORDER BY start_date DESC, id DESC
    `,
    [institutionId],
  );
  return result.rows;
}

async function getDefaultAcademicYearId(institutionId: number) {
  const result = await db.query<{ default_academic_year_id: number | null }>(
    `
      SELECT default_academic_year_id
      FROM institution_profiles
      WHERE id = $1
        AND COALESCE(is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    [institutionId],
  );
  return result.rows[0]?.default_academic_year_id ?? null;
}

function fallbackDefaultYear(rows: AcademicYearRow[]) {
  const today = new Date().toISOString().slice(0, 10);
  return (
    rows.find((row) => row.start_date <= today && row.end_date >= today) ??
    rows.find((row) => row.is_active) ??
    rows[0] ??
    null
  );
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  const status = message === "Unauthorized" || message === "User not found"
    ? 401
    : message === "Forbidden: Admin access required"
      ? 403
      : 400;
  return NextResponse.json({ error: message }, { status });
}

export async function GET(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    await ensureInstitutionDefaultSessionColumn();
    const institutionId = resolveInstitutionId(
      user,
      "institution.general_settings.view",
      getRequestedInstitutionId(req),
    );
    await syncInstitutionAcademicYearsFromTemplates(db, [institutionId], user.id);
    const academicYears = await getAcademicYears(institutionId);
    const configuredDefaultId = await getDefaultAcademicYearId(institutionId);
    const defaultYear =
      academicYears.find((year) => year.id === configuredDefaultId) ??
      fallbackDefaultYear(academicYears);

    return NextResponse.json({
      data: {
        institutionId,
        defaultAcademicYearId: defaultYear?.id ?? null,
        defaultAcademicYearStartDate: defaultYear?.start_date ?? null,
        defaultAcademicYearEndDate: defaultYear?.end_date ?? null,
        configuredDefaultAcademicYearId: configuredDefaultId,
        academicYears,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const requestedInstitutionId = parsePositiveInteger(body.institutionId);
    const academicYearId = parsePositiveInteger(body.academicYearId);
    const startDate = parseDateInput(body.startDate);
    const endDate = parseDateInput(body.endDate);
    if (!academicYearId) throw new Error("Select a valid academic session");
    if (!startDate || !endDate) throw new Error("Select from date and to date for the default session");
    if (endDate < startDate) throw new Error("To date cannot be before from date");

    const user = await getAuthenticatedUser(req);
    await ensureInstitutionDefaultSessionColumn();
    const institutionId = resolveInstitutionId(
      user,
      "institution.general_settings.edit",
      requestedInstitutionId,
    );

    const yearResult = await db.query<AcademicYearRow>(
      `
        SELECT id, institution_id, name, start_date, end_date, is_active
        FROM academic_years
        WHERE id = $1
          AND institution_id = $2
          AND COALESCE(is_deleted, FALSE) = FALSE
          AND COALESCE(is_active, TRUE) = TRUE
        LIMIT 1
      `,
      [academicYearId, institutionId],
    );
    if (!yearResult.rows[0]) throw new Error("Selected session is not available for this institution");

    const updatedYearResult = await db.query<AcademicYearRow>(
      `
        UPDATE academic_years
        SET start_date = $1::date,
            end_date = $2::date,
            updated_by = $3,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
          AND institution_id = $5
        RETURNING id, institution_id, name, start_date, end_date, is_active
      `,
      [startDate, endDate, user.id, academicYearId, institutionId],
    );

    await db.query(
      `
        UPDATE institution_profiles
        SET default_academic_year_id = $1,
            updated_by = $2,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
      `,
      [academicYearId, user.id, institutionId],
    );

    const updatedYear = updatedYearResult.rows[0] ?? yearResult.rows[0];

    return NextResponse.json({
      data: {
        institutionId,
        defaultAcademicYearId: academicYearId,
        defaultAcademicYearStartDate: updatedYear.start_date,
        defaultAcademicYearEndDate: updatedYear.end_date,
        academicYear: updatedYear,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
