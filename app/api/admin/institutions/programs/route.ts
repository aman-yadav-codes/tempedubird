import { NextResponse } from "next/server";
import { getAuthenticatedUser, requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  listInstitutionPrograms,
  createInstitutionProgram,
} from "@/lib/queries/institutions";
import { getPagination, getPageCount } from "@/lib/queries/pagination";
import { institutionProgramCreateSchema } from "@/lib/validations/institution-program.schema";
import {
  applyInstitutionScope,
  assertCanAccessInstitution,
  assertRowsWithinInstitutionScope,
} from "@/lib/auth/institution-scope";
import { notifyInstitutionModuleUpdated } from "@/lib/notifications/admin-events";
import { hasPermission, type PermissionUser } from "@/lib/auth/permissions";

const PROGRAM_LOOKUP_PERMISSIONS = [
  "institution.programs.view",
  "managestudents.allstudents.view",
  "managestudents.allstudents.create",
  "managestudents.allstudents.edit",
  "managestudents.attendance.view",
  "managestudents.attendance.create",
  "managestudents.attendance.edit",
  "managestudents.assignments.view",
  "managestudents.assignments.create",
  "managestudents.assignments.edit",
  "managestudents.exams.view",
  "managestudents.practice.view",
  "managestudents.result.view",
  "managestudents.cards.view",
  "content.assignments.view",
  "content.assignments.create",
  "content.assignments.edit",
  "content.practice_exams.view",
  "content.practice_exams.create",
  "content.practice_exams.edit",
  "content.timetable_setup.view",
  "institution.noticeboard.view",
  "teacher.myinstitution.noticeboard.view",
  "sales.enquiries.view",
  "sales.enquiries.create",
] as const;

function canReadProgramLookup(
  user: PermissionUser,
  institutionId?: number | null,
) {
  return PROGRAM_LOOKUP_PERMISSIONS.some((permission) =>
    hasPermission(user, permission, { institutionId }),
  );
}

export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const url = new URL(req.url);
    const { page, limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit"),
    );
    const search = url.searchParams.get("search")?.trim() || "";
    const institutionId = url.searchParams.get("institutionId")
      ? Number(url.searchParams.get("institutionId"))
      : undefined;
    const typeId = url.searchParams.get("typeId")
      ? Number(url.searchParams.get("typeId"))
      : undefined;

    if (!canReadProgramLookup(currentUser, institutionId)) {
      throw new Error("Forbidden: Admin access required");
    }

    const opts: any = { search, limit, offset };
    if (institutionId) opts.institutionId = institutionId;
    if (typeId) opts.typeId = typeId;

    const { data, total } = await listInstitutionPrograms(
      db,
      applyInstitutionScope(opts, currentUser),
    );
    return NextResponse.json({
      data,
      pageCount: getPageCount(total, limit),
      total,
    });
  } catch (err: any) {
    const status =
      err.message === "Forbidden: Admin access required" ? 403 : 401;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json();
    const parsed = institutionProgramCreateSchema.parse(body);
    assertCanAccessInstitution(
      currentUser,
      Number((parsed as any).institutionId ?? (parsed as any).institution_id),
    );
    const created = await createInstitutionProgram(db, parsed as any);
    await notifyInstitutionModuleUpdated(db, {
      actor: currentUser,
      institutionId: Number(
        (created as any).institution_id ??
          (created as any).institutionId ??
          (parsed as any).institutionId ??
          (parsed as any).institution_id,
      ),
      moduleName: "Programs",
      entityType: "program",
      entityId: Number((created as any).id) || null,
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    const message = err instanceof Error ? err.message : "Invalid input";
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await requireAdmin(req);
    const body = await req.json();
    const { ids, isActive, softDelete } = body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids must be an array" },
        { status: 400 },
      );
    }
    const numericIds = ids.map(Number);
    await assertRowsWithinInstitutionScope(
      db,
      currentUser,
      "institution_programs",
      numericIds,
    );
    const institutionRows = await db.query<{ institution_id: number }>(
      `SELECT DISTINCT institution_id FROM institution_programs WHERE id = ANY($1::int[])`,
      [numericIds],
    );

    if (typeof isActive === "boolean") {
      await db.query(
        `UPDATE institution_programs SET is_active = $1, updated_at = NOW() WHERE id = ANY($2::int[])`,
        [isActive, numericIds],
      );
    }
    if (softDelete === true) {
      await db.query(
        `
                    UPDATE institution_programs
                    SET is_deleted = TRUE,
                        deleted_at = NOW(),
                        is_active = FALSE,
                        updated_at = NOW()
                    WHERE id = ANY($1::int[])
                      AND COALESCE(is_deleted, FALSE) = FALSE
                `,
        [numericIds],
      );
    }
    await Promise.all(
      institutionRows.rows.map((row) =>
        notifyInstitutionModuleUpdated(db, {
          actor: currentUser,
          institutionId: Number(row.institution_id),
          moduleName: "Programs",
          entityType: "program",
        }),
      ),
    );
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status =
      err.message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: err.message }, { status });
  }
}

