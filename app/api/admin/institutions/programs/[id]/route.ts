import { NextResponse } from "next/server";
import { getAuthenticatedUser, requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  getInstitutionProgramById,
  updateInstitutionProgram,
  deleteInstitutionProgram,
} from "@/lib/queries/institutions";
import { institutionProgramUpdateSchema } from "@/lib/validations/institution-program.schema";
import {
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
] as const;

function canReadProgramLookup(
  user: PermissionUser,
  institutionId?: number | null,
) {
  return PROGRAM_LOOKUP_PERMISSIONS.some((permission) =>
    hasPermission(user, permission, { institutionId }),
  );
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const { id } = await params;
    const pid = Number(id);
    await assertRowsWithinInstitutionScope(
      db,
      currentUser,
      "institution_programs",
      [pid],
    );
    const program = await getInstitutionProgramById(db, pid);
    if (!program)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (!canReadProgramLookup(currentUser, Number(program.institution_id))) {
      throw new Error("Forbidden: Admin access required");
    }
    return NextResponse.json({ data: program });
  } catch (err: any) {
    const status =
      err.message === "Forbidden: Admin access required" ? 403 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await requireAdmin(req);
    const { id } = await params;
    const body = await req.json();
    const pid = Number(id);
    await assertRowsWithinInstitutionScope(
      db,
      currentUser,
      "institution_programs",
      [pid],
    );
    if (body.institutionId !== undefined || body.institution_id !== undefined) {
      assertCanAccessInstitution(
        currentUser,
        Number(body.institutionId ?? body.institution_id),
      );
    }

    if (body && Object.keys(body).length) {
      const parsed = institutionProgramUpdateSchema.parse({ id: pid, ...body });
      await updateInstitutionProgram(db, parsed as any);
    }

    const updated = await getInstitutionProgramById(db, pid);
    if (updated) {
      await notifyInstitutionModuleUpdated(db, {
        actor: currentUser,
        institutionId: Number(
          (updated as any).institution_id ?? (updated as any).institutionId,
        ),
        moduleName: "Programs",
        entityType: "program",
        entityId: pid,
      });
    }
    return NextResponse.json({ data: updated });
  } catch (err: any) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await requireAdmin(req);
    const { id } = await params;
    const pid = Number(id);
    await assertRowsWithinInstitutionScope(
      db,
      currentUser,
      "institution_programs",
      [pid],
    );
    const program = await getInstitutionProgramById(db, pid);
    await deleteInstitutionProgram(db, pid);
    if (program) {
      await notifyInstitutionModuleUpdated(db, {
        actor: currentUser,
        institutionId: Number(
          (program as any).institution_id ?? (program as any).institutionId,
        ),
        moduleName: "Programs",
        entityType: "program",
        entityId: pid,
      });
    }
    return NextResponse.json({ success: true });
  } catch (err: any) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

