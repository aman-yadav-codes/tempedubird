import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import {
  deleteInstitutionNews,
  getInstitutionNewsById,
  updateInstitutionNews,
} from "@/lib/queries/institutions";
import {
  assertCanAccessInstitution,
  assertRowsWithinInstitutionScope,
} from "@/lib/auth/institution-scope";
import { notifyInstitutionModuleUpdated } from "@/lib/notifications/admin-events";
import { hasPermission } from "@/lib/auth/permissions";
import { validateNewsTarget } from "@/lib/news/validate-target";

type CurrentUser = Awaited<ReturnType<typeof getAuthenticatedUser>>;

function canTargetWholeInstitution(user: CurrentUser, institutionId: number) {
  return hasPermission(user, "institution.noticeboard.create", { institutionId });
}

async function assertAcademicYearBelongsToInstitution(academicYearId: number | null, institutionId: number) {
  if (!academicYearId) return null;
  const result = await db.query(
    `SELECT id FROM academic_years WHERE id = $1 AND institution_id = $2 AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1`,
    [academicYearId, institutionId],
  );
  if (!result.rows[0]) throw new Error("Selected session is not available for this institution");
  return academicYearId;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (
      ![
        "institution.noticeboard.view",
        "teacher.myinstitution.noticeboard.view",
        "student.myinstitution.noticeboard.view",
        "parent.myinstitution.noticeboard.view",
        "driver.myinstitution.noticeboard.view",
      ].some((permission) => hasPermission(currentUser, permission))
    ) {
      return NextResponse.json(
        { error: "Forbidden: Noticeboard access required" },
        { status: 403 },
      );
    }
    const { id } = await params;
    const pid = Number(id);
    await assertRowsWithinInstitutionScope(
      db,
      currentUser,
      "institution_news",
      [pid],
    );
    const item = await getInstitutionNewsById(db, pid);
    if (!item)
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ data: item });
  } catch (err: any) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    if (
      !["institution.noticeboard.edit", "teacher.myinstitution.noticeboard.edit"].some(
        (permission) => hasPermission(currentUser, permission),
      )
    ) {
      return NextResponse.json(
        { error: "Forbidden: Noticeboard edit permission required" },
        { status: 403 },
      );
    }
    const { id } = await params;
    const body = await req.json();
    const pid = Number(id);
    await assertRowsWithinInstitutionScope(
      db,
      currentUser,
      "institution_news",
      [pid],
    );
    if (body.institutionId !== undefined || body.institution_id !== undefined) {
      assertCanAccessInstitution(
        currentUser,
        Number(body.institutionId ?? body.institution_id),
      );
    }
    const existing = await getInstitutionNewsById(db, pid);
    const institutionId = Number(
      body.institutionId ?? body.institution_id ?? existing?.institution_id,
    );
    const target = await validateNewsTarget(db, {
      institutionId,
      targetType: body.targetType ?? existing?.target_type,
      targetRoleCode: body.targetRoleCode ?? existing?.target_role_code,
      targetId: body.targetId ?? existing?.target_id,
      targetProgramId: body.targetProgramId ?? existing?.target_program_id,
      actorUserId: currentUser.id,
      canTargetWholeInstitution: canTargetWholeInstitution(currentUser, institutionId),
    });
    const academicYearId = body.academicYearId !== undefined || body.academic_year_id !== undefined
      ? await assertAcademicYearBelongsToInstitution(
          Number.isInteger(Number(body.academicYearId ?? body.academic_year_id))
            ? Number(body.academicYearId ?? body.academic_year_id)
            : null,
          institutionId,
        )
      : undefined;
    const updated = await updateInstitutionNews(db, {
      id: pid,
      ...body,
      academicYearId,
      imageUrls: Array.isArray(body.imageUrls)
        ? body.imageUrls.map(String).slice(0, 3)
        : body.imageUrls,
      ...target,
    });
    if (updated) {
      await notifyInstitutionModuleUpdated(db, {
        actor: currentUser,
        institutionId: Number(
          (updated as any).institution_id ?? (updated as any).institutionId,
        ),
        moduleName: "Noticeboard",
        entityType: "noticeboard",
        entityId: pid,
      });
    }
    return NextResponse.json({ data: updated });
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json(
        {
          error: "A record with that slug already exists for this institution",
        },
        { status: 409 },
      );
    }
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
    const currentUser = await getAuthenticatedUser(req);
    if (
      !["institution.noticeboard.delete", "teacher.myinstitution.noticeboard.delete"].some(
        (permission) => hasPermission(currentUser, permission),
      )
    ) {
      return NextResponse.json(
        { error: "Forbidden: Noticeboard delete permission required" },
        { status: 403 },
      );
    }
    const { id } = await params;
    const pid = Number(id);
    await assertRowsWithinInstitutionScope(
      db,
      currentUser,
      "institution_news",
      [pid],
    );
    const item = await getInstitutionNewsById(db, pid);
    await deleteInstitutionNews(db, pid);
    if (item) {
      await notifyInstitutionModuleUpdated(db, {
        actor: currentUser,
        institutionId: Number(
          (item as any).institution_id ?? (item as any).institutionId,
        ),
        moduleName: "Noticeboard",
        entityType: "noticeboard",
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

