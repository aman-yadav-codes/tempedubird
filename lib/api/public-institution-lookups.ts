import { NextResponse } from "next/server";
import { db } from "@/lib/db/db";

function getPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

type InstitutionLookupTable =
  | "institution_types"
  | "institution_subtypes"
  | "program_types"
  | "languages";

async function handleInstitutionMasterLookup(req: Request, table: InstitutionLookupTable) {
  const url = new URL(req.url);
  const page = getPositiveInt(url.searchParams.get("page"), 1);
  const limit = Math.min(getPositiveInt(url.searchParams.get("limit"), 10), 50);
  const offset = (page - 1) * limit;
  const search = url.searchParams.get("search")?.trim() || "";

  const where = ["is_deleted = FALSE", "is_active = TRUE"];
  const params: unknown[] = [];

  if (search) {
    params.push(`%${search}%`);
    where.push(`(name ILIKE $${params.length} OR slug ILIKE $${params.length})`);
  }

  const whereSql = `WHERE ${where.join(" AND ")}`;

  const [dataResult, countResult] = await Promise.all([
    db.query(
      `
        SELECT id, name, slug
        FROM ${table}
        ${whereSql}
        ORDER BY name ASC, id ASC
        LIMIT $${params.length + 1}
        OFFSET $${params.length + 2}
      `,
      [...params, limit, offset]
    ),
    db.query<{ count: number }>(
      `
        SELECT COUNT(*)::int AS count
        FROM ${table}
        ${whereSql}
      `,
      params
    ),
  ]);

  const total = Number(countResult.rows[0]?.count ?? 0);

  return NextResponse.json({
    data: dataResult.rows,
    pageCount: Math.ceil(total / limit),
    total,
  });
}

export function handlePublicInstitutionTypesGet(req: Request) {
  return handleInstitutionMasterLookup(req, "institution_types");
}

export function handlePublicInstitutionSubtypesGet(req: Request) {
  return handleInstitutionMasterLookup(req, "institution_subtypes");
}

export function handlePublicProgramTypesGet(req: Request) {
  return handleInstitutionMasterLookup(req, "program_types");
}

export function handlePublicLanguagesGet(req: Request) {
  return handleInstitutionMasterLookup(req, "languages");
}
