import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getPagination, getPageCount } from "@/lib/queries/pagination";
import {
  createInstitutionNews,
  listInstitutionNews,
} from "@/lib/queries/institutions";
import {
  applyInstitutionScope,
  assertCanAccessInstitution,
  assertRowsWithinInstitutionScope,
} from "@/lib/auth/institution-scope";
import { notifyInstitutionModuleUpdated } from "@/lib/notifications/admin-events";
import { hasPermission } from "@/lib/auth/permissions";
import { validateNewsTarget } from "@/lib/news/validate-target";
import {
  getParentChildEnrollmentContexts,
  getStudentEnrollmentContexts,
} from "@/lib/auth/student-enrollment-context";
import { NotificationService } from "@/services/notificationService";

type CurrentUser = Awaited<ReturnType<typeof getAuthenticatedUser>>;

function parseAcademicYearId(value: string | null | undefined) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
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

async function resolveInstitutionAcademicYearId(academicYearId: number | null, institutionId: number) {
  if (academicYearId) {
    return assertAcademicYearBelongsToInstitution(academicYearId, institutionId);
  }
  const result = await db.query<{ default_academic_year_id: number | null }>(
    `SELECT default_academic_year_id
       FROM institution_profiles
      WHERE id = $1
      LIMIT 1`,
    [institutionId],
  );
  return assertAcademicYearBelongsToInstitution(
    result.rows[0]?.default_academic_year_id ? Number(result.rows[0].default_academic_year_id) : null,
    institutionId,
  );
}

function canTargetWholeInstitution(user: CurrentUser, institutionId: number) {
  return hasPermission(user, "institution.noticeboard.create", { institutionId });
}

async function ensureNoticeNotificationTypes() {
  await db.query(`
    INSERT INTO notification_templates (code, title_template, body_template, is_active, updated_at)
    VALUES ('noticeboard.new_notice', 'New noticeboard message', '{{actor_name}} published: {{title}}', TRUE, NOW())
    ON CONFLICT (code) DO NOTHING
  `);
}

async function noticeRecipientUserIds(
  institutionId: number,
  target: Awaited<ReturnType<typeof validateNewsTarget>>,
) {
  if (target.targetType === "WHOLE_INSTITUTION") {
    const result = await db.query<{ id: number }>(
      `
        SELECT DISTINCT id
        FROM (
          SELECT im.user_id AS id
          FROM institution_memberships im
          INNER JOIN roles r ON r.id = im.role_id
          INNER JOIN users u ON u.id = im.user_id
          WHERE im.institution_id = $1
            AND im.is_active = TRUE
            AND COALESCE(im.is_deleted, FALSE) = FALSE
            AND u.is_active = TRUE
            AND COALESCE(u.is_deleted, FALSE) = FALSE
            AND r.code IN ('institution_admin', 'teacher', 'parent', 'driver')
          UNION
          SELECT sp.user_id AS id
          FROM student_enrollments se
          INNER JOIN student_profiles sp ON sp.id = se.student_id
          INNER JOIN users u ON u.id = sp.user_id
          WHERE se.institution_id = $1
            AND se.status = 'active'
            AND COALESCE(se.is_deleted, FALSE) = FALSE
            AND u.is_active = TRUE
            AND COALESCE(u.is_deleted, FALSE) = FALSE
        ) recipients
      `,
      [institutionId],
    );
    return result.rows.map((row) => row.id);
  }

  if (target.targetType === "ROLE" && target.targetRoleCode === "teacher") {
    const result = await db.query<{ id: number }>(
      `SELECT DISTINCT u.id
         FROM institution_memberships im
         INNER JOIN roles r ON r.id = im.role_id AND r.code = 'teacher'
         INNER JOIN users u ON u.id = im.user_id
        WHERE im.institution_id = $1
          AND im.is_active = TRUE
          AND COALESCE(im.is_deleted, FALSE) = FALSE
          AND u.is_active = TRUE
          AND COALESCE(u.is_deleted, FALSE) = FALSE`,
      [institutionId],
    );
    return result.rows.map((row) => row.id);
  }

  if (
    target.targetType === "ROLE" ||
    target.targetType === "PROGRAM" ||
    target.targetType === "SECTION"
  ) {
    const params: unknown[] = [institutionId];
    const where = [
      "se.institution_id = $1",
      "se.status = 'active'",
      "COALESCE(se.is_deleted, FALSE) = FALSE",
      "u.is_active = TRUE",
      "COALESCE(u.is_deleted, FALSE) = FALSE",
    ];
    if (target.targetType === "PROGRAM") {
      params.push(target.targetId);
      where.push(`se.program_id = $${params.length}`);
    }
    if (target.targetType === "SECTION") {
      params.push(target.targetProgramId);
      where.push(`se.program_id = $${params.length}`);
      params.push(target.targetId);
      where.push(`se.section_id = $${params.length}`);
    }
    const result = await db.query<{ id: number }>(
      `SELECT DISTINCT sp.user_id AS id
         FROM student_enrollments se
         INNER JOIN student_profiles sp ON sp.id = se.student_id
         INNER JOIN users u ON u.id = sp.user_id
        WHERE ${where.join(" AND ")}`,
      params,
    );
    return result.rows.map((row) => row.id);
  }

  if (target.targetType === "USER" && target.targetRoleCode === "teacher") {
    return target.targetId ? [Number(target.targetId)] : [];
  }

  if (target.targetType === "USER" && target.targetRoleCode === "student") {
    const result = await db.query<{ id: number }>(
      `SELECT sp.user_id AS id
         FROM student_profiles sp
        WHERE sp.id = $1
        LIMIT 1`,
      [target.targetId],
    );
    return result.rows.map((row) => row.id);
  }

  return [];
}

async function notifyNoticeRecipients(
  user: CurrentUser,
  notice: { id: number; institution_id: number; title: string; content?: string | null },
  target: Awaited<ReturnType<typeof validateNewsTarget>>,
) {
  const recipients = (await noticeRecipientUserIds(notice.institution_id, target)).filter(
    (id) => id !== user.id,
  );
  if (!recipients.length) return;
  await ensureNoticeNotificationTypes();
  await new NotificationService(db).create({
    type: "noticeboard.new_notice",
    recipients,
    institutionId: notice.institution_id,
    entityType: "noticeboard",
    entityId: notice.id,
    createdBy: user.id,
    priority: "normal",
    payload: {
      actor_name: user.role_codes.includes("institution_admin")
        ? "Institution Admin"
        : user.full_name,
      title: notice.title,
      message_preview: (notice.content ?? "").slice(0, 120),
      url: `/admin/institutions/news?notice=${notice.id}`,
    },
  });
}

export async function GET(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const canView = [
      "institution.noticeboard.view",
      "student.myinstitution.noticeboard.view",
      "teacher.myinstitution.noticeboard.view",
      "parent.myinstitution.noticeboard.view",
      "driver.myinstitution.noticeboard.view",
      "staff.myinstitution.noticeboard.view",
    ].some((permission) => hasPermission(currentUser, permission)) || (currentUser?.role_codes && currentUser.role_codes.length > 0);
    if (!canView)
      return NextResponse.json(
        { error: "Forbidden: Noticeboard access required" },
        { status: 403 },
      );
    const url = new URL(req.url);
    const { limit, offset } = getPagination(
      url.searchParams.get("page"),
      url.searchParams.get("limit"),
    );
    const search = url.searchParams.get("search")?.trim() || "";
    const view =
      url.searchParams.get("view") === "created" ? "created" : "received";
    const institutionId = url.searchParams.get("institutionId")
      ? Number(url.searchParams.get("institutionId"))
      : undefined;
    const parsedAcademicYearId = parseAcademicYearId(url.searchParams.get("academicYearId"));
    const academicYearId = institutionId
      ? await resolveInstitutionAcademicYearId(parsedAcademicYearId, institutionId)
      : parsedAcademicYearId;

    const canManageNoticeboard = [
      "institution.noticeboard.create",
      "institution.noticeboard.edit",
      "institution.noticeboard.delete",
      "teacher.myinstitution.noticeboard.create",
      "teacher.myinstitution.noticeboard.edit",
      "teacher.myinstitution.noticeboard.delete",
    ].some((permission) => hasPermission(currentUser, permission));

    const studentContexts = currentUser.role_codes.includes("student")
      ? await getStudentEnrollmentContexts(db, currentUser.id)
      : [];
    const parentContexts = currentUser.role_codes.includes("parent")
      ? await getParentChildEnrollmentContexts(db, currentUser.id, null)
      : [];
    const recipientContexts = [...studentContexts, ...parentContexts];
    const scopedRecipientContexts = academicYearId
      ? recipientContexts.filter((context) => Number(context.academic_year_id) === academicYearId)
      : recipientContexts;
    const showCreated = view === "created" && canManageNoticeboard;
    const recipient = showCreated
      ? null
      : {
          userId: currentUser.id,
          roleCodes: currentUser.role_codes.filter((role) =>
            ["institution_admin", "teacher", "student", "parent", "driver"].includes(role),
          ),
          studentIds: scopedRecipientContexts.map((context) => Number(context.student_id)),
          programIds: scopedRecipientContexts.map((context) => Number(context.program_id)),
          sectionIds: scopedRecipientContexts
            .map((context) => context.section_id)
            .filter((id): id is number => Number.isInteger(id)),
        };

    const { data, total } = await listInstitutionNews(
      db,
      applyInstitutionScope(
        {
          search,
          institutionId,
          academicYearId,
          limit,
          offset,
          recipient,
          createdBy: showCreated ? currentUser.id : null,
          excludeCreatedBy: showCreated ? null : currentUser.id,
        },
        currentUser,
      ),
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
    const currentUser = await getAuthenticatedUser(req);
    const body = await req.json();
    if (!body.institutionId || !body.title) {
      return NextResponse.json(
        { error: "institutionId and title are required" },
        { status: 400 },
      );
    }
    assertCanAccessInstitution(currentUser, Number(body.institutionId));
    if (
      !["institution.noticeboard.create", "teacher.myinstitution.noticeboard.create"].some(
        (permission) =>
          hasPermission(currentUser, permission, {
            institutionId: Number(body.institutionId),
          }),
      )
    )
      return NextResponse.json(
        { error: "Forbidden: Noticeboard creation permission required" },
        { status: 403 },
      );
    const target = await validateNewsTarget(db, {
      institutionId: Number(body.institutionId),
      targetType: body.targetType,
      targetRoleCode: body.targetRoleCode,
      targetId: body.targetId,
      targetProgramId: body.targetProgramId,
      actorUserId: currentUser.id,
      canTargetWholeInstitution: canTargetWholeInstitution(
        currentUser,
        Number(body.institutionId),
      ),
    });
    const academicYearId = await resolveInstitutionAcademicYearId(
      Number.isInteger(Number(body.academicYearId)) ? Number(body.academicYearId) : null,
      Number(body.institutionId),
    );

    const created = await createInstitutionNews(db, {
      institutionId: Number(body.institutionId),
      academicYearId,
      title: String(body.title),
      slug: body.slug ? String(body.slug) : String(body.title),
      content: body.content ?? null,
      imageUrls: Array.isArray(body.imageUrls)
        ? body.imageUrls.map(String).slice(0, 3)
        : null,
      publishedAt: body.publishedAt ?? null,
      isActive: body.isActive ?? true,
      createdBy: currentUser.id,
      ...target,
      targetLabel: body.targetLabel ?? null,
    });
    await notifyNoticeRecipients(
      currentUser,
      {
        id: Number((created as any).id),
        institution_id: Number((created as any).institution_id),
        title: String((created as any).title),
        content: (created as any).content ?? null,
      },
      target,
    );
    await notifyInstitutionModuleUpdated(db, {
      actor: currentUser,
      institutionId: Number(
        (created as any).institution_id ??
          (created as any).institutionId ??
          body.institutionId,
      ),
      moduleName: "Noticeboard",
      entityType: "noticeboard",
      entityId: Number((created as any).id) || null,
    });

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (err: any) {
    if (err.code === "23505") {
      return NextResponse.json(
        {
          error: "A record with that slug already exists for this institution",
        },
        { status: 409 },
      );
    }
    const message = err instanceof Error ? err.message : "Invalid input";
    const status = message === "Forbidden: Admin access required" ? 403 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const currentUser = await getAuthenticatedUser(req);
    const body = await req.json();
    const { ids, isActive, softDelete } = body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids must be an array" },
        { status: 400 },
      );
    }
    const numericIds = ids.map(Number);
    const allowedPermissions =
      softDelete === true
        ? ["institution.noticeboard.delete", "teacher.myinstitution.noticeboard.delete"]
        : ["institution.noticeboard.edit", "teacher.myinstitution.noticeboard.edit"];
    if (
      !allowedPermissions.some((permission) =>
        hasPermission(currentUser, permission),
      )
    ) {
      return NextResponse.json(
        { error: "Forbidden: Noticeboard update permission required" },
        { status: 403 },
      );
    }
    await assertRowsWithinInstitutionScope(
      db,
      currentUser,
      "institution_news",
      numericIds,
    );
    const institutionRows = await db.query<{ institution_id: number }>(
      `SELECT DISTINCT institution_id FROM institution_news WHERE id = ANY($1::int[])`,
      [numericIds],
    );

    if (typeof isActive === "boolean") {
      await db.query(
        `UPDATE institution_news SET is_active = $1, updated_at = NOW() WHERE id = ANY($2::int[])`,
        [isActive, numericIds],
      );
    }
    if (softDelete === true) {
      await db.query(
        `UPDATE institution_news SET is_deleted = TRUE, updated_at = NOW() WHERE id = ANY($1::int[])`,
        [numericIds],
      );
    }
    await Promise.all(
      institutionRows.rows.map((row) =>
        notifyInstitutionModuleUpdated(db, {
          actor: currentUser,
          institutionId: Number(row.institution_id),
          moduleName: "Noticeboard",
          entityType: "noticeboard",
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

