import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/auth/auth";
import { db } from "@/lib/db/db";
import { getAllowedInstitutionIds } from "@/lib/auth/institution-scope";
import { hasPermission, isPlatformAdminUser } from "@/lib/auth/permissions";
import { NotificationService } from "@/services/notificationService";

function getPositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function ticketNumber() {
  return `SUP-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;
}

type SupportTicketRow = {
  id: number;
  ticket_number: string;
  institution_id: number | null;
  created_by: number;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
};

async function ensureSupportTicketTemplates() {
  await db.query(
    `
      INSERT INTO notification_templates (code, title_template, body_template, is_active, updated_at)
      VALUES
        (
          'support.new_ticket',
          'New support request',
          '{{actor_name}} opened {{ticket_number}}: {{subject}}',
          TRUE,
          NOW()
        ),
        (
          'support.status_changed',
          'Support status changed',
          '{{ticket_number}} is now {{status_label}}.',
          TRUE,
          NOW()
        )
      ON CONFLICT (code) DO NOTHING
    `
  );
}

async function getPlatformAdminIds() {
  const result = await db.query<{ id: number }>(
    `
      SELECT DISTINCT u.id
      FROM users u
      LEFT JOIN user_roles ur ON ur.user_id = u.id
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
        AND r.code = 'platform_admin'
    `
  );

  return result.rows.map((row) => row.id);
}

function isInstitutionAdmin(user: Awaited<ReturnType<typeof requireAdmin>>) {
  return user.role_codes.includes("institution_admin");
}

function canUseSupport(user: Awaited<ReturnType<typeof requireAdmin>>) {
  if (isPlatformAdminUser(user) || user.role_codes.includes("institution_admin")) return true;
  return (
    user.role_codes.length > 0 ||
    [
      "support.tickets.view",
      "student.support.view",
      "teacher.support.view",
      "parents.support.view",
      "driver.support.view",
      "staff.support.view",
    ].some((permission) => hasPermission(user, permission))
  );
}

async function getInstitutionAdminIds(institutionId: number | null) {
  if (!institutionId) return [];
  const result = await db.query<{ id: number }>(
    `SELECT DISTINCT u.id
       FROM users u
       INNER JOIN institution_memberships im ON im.user_id = u.id
       INNER JOIN roles r ON r.id = im.role_id AND r.code = 'institution_admin'
      WHERE im.institution_id = $1
        AND im.is_active = TRUE
        AND u.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE`,
    [institutionId]
  );
  return result.rows.map((row) => row.id);
}

async function getInstitutionName(institutionId: number | null) {
  if (!institutionId) return "Platform";
  const result = await db.query<{ name: string }>(
    `
      SELECT name
      FROM institution_profiles
      WHERE id = $1
        AND is_active = TRUE
        AND COALESCE(is_deleted, FALSE) = FALSE
      LIMIT 1
    `,
    [institutionId]
  );

  return result.rows[0]?.name ?? "Institution";
}

async function notifySupportTicketCreated(
  user: Awaited<ReturnType<typeof requireAdmin>>,
  ticket: SupportTicketRow
) {
  const recipients = isInstitutionAdmin(user)
    ? await getPlatformAdminIds()
    : await getInstitutionAdminIds(ticket.institution_id);
  const recipientIds = recipients.filter((recipientId) => recipientId !== user.id);
  if (!recipientIds.length) return;

  await ensureSupportTicketTemplates();
  await new NotificationService(db).create({
    type: "support.new_ticket",
    recipients: recipientIds,
    institutionId: ticket.institution_id,
    entityType: "support_ticket",
    entityId: ticket.id,
    createdBy: user.id,
    priority: ticket.priority === "urgent" || ticket.priority === "high" ? "high" : "normal",
    payload: {
      actor_name: user.full_name,
      institution_name: await getInstitutionName(ticket.institution_id),
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      priority: ticket.priority,
      url: `/admin/support?ticket=${ticket.id}`,
    },
  });
}

async function notifySupportTicketStatusUpdated(
  user: Awaited<ReturnType<typeof requireAdmin>>,
  ticket: SupportTicketRow
) {
  const recipientIds = [ticket.created_by].filter((recipientId) => recipientId !== user.id);
  if (!recipientIds.length) return;

  await ensureSupportTicketTemplates();
  await new NotificationService(db).create({
    type: "support.status_changed",
    recipients: recipientIds,
    institutionId: ticket.institution_id,
    entityType: "support_ticket",
    entityId: ticket.id,
    createdBy: user.id,
    payload: {
      actor_name: user.full_name,
      ticket_number: ticket.ticket_number,
      subject: ticket.subject,
      status: ticket.status,
      status_label: ticket.status.replace(/_/g, " "),
      url: `/admin/support?ticket=${ticket.id}`,
    },
  });
}

export async function GET(req: Request) {
  try {
    const user = await requireAdmin(req);
    if (!canUseSupport(user)) throw new Error("Forbidden: Support access required");
    const url = new URL(req.url);
    const page = getPositiveInt(url.searchParams.get("page"), 1);
    const limit = Math.min(getPositiveInt(url.searchParams.get("limit"), 10), 50);
    const offset = (page - 1) * limit;
    const search = url.searchParams.get("search")?.trim() ?? "";
    const ticketId = Number(url.searchParams.get("ticket_id"));

    const where: string[] = [
      "COALESCE(t.is_deleted, FALSE) = FALSE",
      "(t.institution_id IS NULL OR (ip.is_active = TRUE AND COALESCE(ip.is_deleted, FALSE) = FALSE))",
    ];
    const params: unknown[] = [];
    const allowedInstitutionIds = getAllowedInstitutionIds(user);

    if (isPlatformAdminUser(user)) {
      params.push(user.id);
      where.push(`(
        t.created_by = $${params.length}
        OR EXISTS (
          SELECT 1
          FROM (
            SELECT ur.role_id
            FROM user_roles ur
            WHERE ur.user_id = t.created_by
            UNION
            SELECT im.role_id
            FROM institution_memberships im
            WHERE im.user_id = t.created_by
              AND im.institution_id = t.institution_id
              AND im.is_active = TRUE
              AND COALESCE(im.is_deleted, FALSE) = FALSE
          ) creator_roles
          INNER JOIN roles creator_role ON creator_role.id = creator_roles.role_id
          WHERE creator_role.code IN ('institution_admin', 'platform_admin')
        )
      )`);
    } else if (isInstitutionAdmin(user) && allowedInstitutionIds) {
      params.push(allowedInstitutionIds, user.id);
      where.push(`(t.institution_id = ANY($${params.length - 1}::int[]) OR t.created_by = $${params.length})`);
    } else {
      params.push(user.id);
      where.push(`t.created_by = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      where.push(`(t.ticket_number ILIKE $${params.length} OR t.subject ILIKE $${params.length} OR t.category ILIKE $${params.length})`);
    }

    if (Number.isInteger(ticketId) && ticketId > 0) {
      params.push(ticketId);
      where.push(`t.id = $${params.length}`);
    }

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const [dataResult, countResult] = await Promise.all([
      db.query(
        `
          SELECT
            t.id,
            t.ticket_number,
            t.institution_id,
            ip.name AS institution_name,
            t.created_by,
            creator.full_name AS created_by_name,
            creator.avatar_url AS created_by_avatar_url,
            t.assigned_to,
            assignee.full_name AS assigned_to_name,
            t.subject,
            t.description,
            t.category,
            t.priority,
            t.status,
            t.created_at,
            t.updated_at
          FROM support_tickets t
          LEFT JOIN institution_profiles ip ON ip.id = t.institution_id
          LEFT JOIN users creator ON creator.id = t.created_by
          LEFT JOIN users assignee ON assignee.id = t.assigned_to
          ${whereSql}
          ORDER BY t.updated_at DESC, t.id DESC
          LIMIT $${params.length + 1}
          OFFSET $${params.length + 2}
        `,
        [...params, limit, offset]
      ),
      db.query<{ count: number }>(
        `
          SELECT COUNT(*)::int AS count
          FROM support_tickets t
          LEFT JOIN institution_profiles ip ON ip.id = t.institution_id
          ${whereSql}
        `,
        params
      ),
    ]);

    const total = Number(countResult.rows[0]?.count ?? 0);
    return NextResponse.json({
      data: dataResult.rows,
      total,
      pageCount: Math.ceil(total / limit),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load support tickets";
    return NextResponse.json({ error: message }, { status: message.includes("Forbidden") ? 403 : 400 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAdmin(req);
    if (!canUseSupport(user)) throw new Error("Forbidden: Support access required");
    const body = await req.json();
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const category = typeof body.category === "string" ? body.category.trim() : "general";
    const priority = typeof body.priority === "string" ? body.priority.trim() : "medium";
    const allowedInstitutionIds = getAllowedInstitutionIds(user);
    const requestedInstitutionId = Number(body.institution_id);
    const institutionId =
      Number.isInteger(requestedInstitutionId) && requestedInstitutionId > 0
        ? requestedInstitutionId
        : allowedInstitutionIds?.[0] ?? null;

    if (!subject || !description) {
      return NextResponse.json({ error: "Subject and description are required" }, { status: 422 });
    }
    if (allowedInstitutionIds && (!institutionId || !allowedInstitutionIds.includes(institutionId))) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    if (institutionId) {
      const institutionResult = await db.query(
        `
          SELECT 1
          FROM institution_profiles
          WHERE id = $1
            AND is_active = TRUE
            AND COALESCE(is_deleted, FALSE) = FALSE
          LIMIT 1
        `,
        [institutionId]
      );
      if (!institutionResult.rows[0]) {
        return NextResponse.json({ error: "Institution is not active" }, { status: 422 });
      }
    }

    const result = await db.query<SupportTicketRow>(
      `
        INSERT INTO support_tickets (
          ticket_number,
          institution_id,
          created_by,
          subject,
          description,
          category,
          priority,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')
        RETURNING *
      `,
      [ticketNumber(), institutionId, user.id, subject, description, category, priority]
    );

    await db.query(
      `
        INSERT INTO support_ticket_messages (ticket_id, user_id, message)
        VALUES ($1, $2, $3)
      `,
      [result.rows[0].id, user.id, description]
    );

    await db.query(
      `
        INSERT INTO support_ticket_history (ticket_id, action, new_value, performed_by)
        VALUES ($1, 'created', $2, $3)
      `,
      [result.rows[0].id, subject, user.id]
    );
    await notifySupportTicketCreated(user, result.rows[0]);

    return NextResponse.json({ data: result.rows[0] }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create support ticket";
    return NextResponse.json({ error: message }, { status: message.includes("Forbidden") ? 403 : 400 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await requireAdmin(req);
    if (!isPlatformAdminUser(user)) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }
    const body = await req.json();
    const id = Number(body.id);
    const status = typeof body.status === "string" ? body.status.trim() : "";
    const allowedStatuses = new Set(["open", "in_progress", "resolved", "closed"]);

    if (!Number.isInteger(id) || id <= 0 || !allowedStatuses.has(status)) {
      return NextResponse.json({ error: "Valid ticket id and status are required" }, { status: 422 });
    }

    const result = await db.query<SupportTicketRow>(
      `
        UPDATE support_tickets
        SET
          status = $2::varchar,
          resolved_by = CASE WHEN $2::text = 'resolved' THEN $3::int ELSE resolved_by END,
          resolved_at = CASE WHEN $2::text = 'resolved' THEN NOW() ELSE resolved_at END,
          closed_by = CASE WHEN $2::text = 'closed' THEN $3::int ELSE closed_by END,
          closed_at = CASE WHEN $2::text = 'closed' THEN NOW() ELSE closed_at END,
          updated_at = NOW()
        WHERE id = $1
          AND COALESCE(is_deleted, FALSE) = FALSE
        RETURNING *
      `,
      [id, status, user.id]
    );

    if (!result.rows[0]) return NextResponse.json({ error: "Ticket not found" }, { status: 404 });

    await db.query(
      `
        INSERT INTO support_ticket_history (ticket_id, action, new_value, performed_by)
        VALUES ($1, 'status.updated', $2, $3)
      `,
      [id, status, user.id]
    );
    await notifySupportTicketStatusUpdated(user, result.rows[0]);

    return NextResponse.json({ data: result.rows[0] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update support ticket";
    return NextResponse.json({ error: message }, { status: message.includes("Forbidden") ? 403 : 400 });
  }
}
